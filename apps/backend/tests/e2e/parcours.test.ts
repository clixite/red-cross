/**
 * Tests bout-en-bout couvrant les 7 parcours métier du cahier des charges.
 * Nécessite une base PostgreSQL accessible (DATABASE_URL) et des données seedées.
 * Ces tests utilisent l'application Express complète (createApp) avec le vrai Prisma.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { OutboxWorker } from '../../src/qualios/outbox.worker.js';

const app = createApp();
const API = '/api/v1';

const DEMO_PASSWORD = 'DemoPass2025!';

interface Session {
  token: string;
  userId: string;
  email: string;
  roles: string[];
  organizationId?: string | null;
}

async function login(email: string): Promise<Session> {
  const res = await request(app).post(`${API}/auth/login`).send({ email, password: DEMO_PASSWORD });
  expect(res.status).toBe(200);
  return {
    token: res.body.token,
    userId: res.body.user.id,
    email: res.body.user.email,
    roles: res.body.user.roles,
    organizationId: res.body.user.organization?.id,
  };
}

async function createDemoOrgAndUser(adminSession: Session, suffix: string) {
  const orgRes = await request(app)
    .post(`${API}/organizations`)
    .set('Authorization', `Bearer ${adminSession.token}`)
    .send({
      name: `Hôpital E2E ${suffix}`,
      type: 'banque_sang_hospitaliere',
      businessNumber: `BE 0789.000.${String(100 + Math.floor(Math.random() * 800)).padStart(3, '0')}`,
      siteName: 'Site E2E',
      address: 'Rue E2E 1, 5000 Namur',
      defaultLanguage: 'fr',
    });
  expect(orgRes.status).toBe(201);

  const inviteRes = await request(app)
    .post(`${API}/users/invite`)
    .set('Authorization', `Bearer ${adminSession.token}`)
    .send({
      email: `e2e.${suffix}@hopital-e2e.be`,
      firstName: 'E2E',
      lastName: suffix,
      roles: ['referent_qualite'],
      organizationId: orgRes.body.id,
    });
  expect(inviteRes.status).toBe(201);

  // Activer le compte invité directement en base (simule la validation du lien d invitation)
  const invited = await prisma.user.findUnique({ where: { email: `e2e.${suffix}@hopital-e2e.be` } });
  expect(invited).not.toBeNull();
  await prisma.user.update({
    where: { id: invited!.id },
    data: {
      passwordHash: (await import('bcryptjs')).default.hashSync(DEMO_PASSWORD, 10),
      status: 'active',
      invitationToken: null,
      invitationExpiresAt: null,
      consentQualityCharter: true,
    },
  });

  return { orgId: orgRes.body.id, email: `e2e.${suffix}@hopital-e2e.be` };
}

describe('Parcours 1 — Déclarer une réclamation produit (bout-en-bout)', () => {
  it('déclare une poche hors température, reçoit un accusé et une référence Qualios', async () => {
    const declarant = await login('declarant@chu-liege.be');

    const res = await request(app)
      .post(`${API}/complaints`)
      .set('Authorization', `Bearer ${declarant.token}`)
      .send({
        category: 'produit_sanguin',
        declaredCriticality: 'majeure',
        incidentDate: new Date().toISOString(),
        description: 'Poche de CGR livrée à 12.8°C au lieu de 4°C. Constat immédiat à la réception du bloc.',
        patientImpact: 'non',
        patientImpactTypology: 'aucun',
        products: [
          {
            productCode: 'E0388V00',
            donationNumber: 'BE999925000777',
            bloodGroup: 'O+',
            quantity: 1,
            measuredTemperature: 12.8,
          },
        ],
      });

    expect(res.status).toBe(201);
    const complaint = res.body;

    // Numéro portail au bon format
    expect(complaint.portalNumber).toMatch(/^SFS-\d{4}-\d{5}$/);
    // Statut immédiat "reçue" + accusé automatique
    expect(complaint.status).toBe('recue');
    expect(complaint.events.length).toBeGreaterThan(0);

    // Accusé de réception e-mail journalisé
    const notif = await prisma.notificationLog.findFirst({
      where: { recipientEmail: declarant.email, subject: { contains: complaint.portalNumber } },
    });
    expect(notif).not.toBeNull();

    // Tâche Outbox créée pour Qualios
    const outbox = await prisma.outboxTask.findFirst({
      where: { payload: { path: ['complaintId'], equals: complaint.id } },
    });
    expect(outbox).not.toBeNull();

    // Trace dans la piste d'audit
    const audit = await prisma.auditLog.findFirst({ where: { entityId: complaint.id, action: 'COMPLAINT_CREATED' } });
    expect(audit).not.toBeNull();
  });
});

describe('Parcours 2 — Suivre une réclamation (historique, visibilité, SLA)', () => {
  it('affiche l historique partagé et les dates cibles SLA', async () => {
    const declarant = await login('declarant@chu-liege.be');

    // Créer une réclamation
    const created = await request(app)
      .post(`${API}/complaints`)
      .set('Authorization', `Bearer ${declarant.token}`)
      .send({
        category: 'transport_chaine_du_froid',
        declaredCriticality: 'mineure',
        description: 'Suivi de traçabilité de température demandé pour une livraison récente.',
        patientImpact: 'non',
        patientImpactTypology: 'aucun',
      });
    expect(created.status).toBe(201);

    const detail = await request(app)
      .get(`${API}/complaints/${created.body.id}`)
      .set('Authorization', `Bearer ${declarant.token}`);

    expect(detail.status).toBe(200);
    expect(detail.body.slaTargetReceivabilityAt).toBeDefined();
    expect(detail.body.slaTargetFinalResponseAt).toBeDefined();
    expect(Array.isArray(detail.body.events)).toBe(true);
    expect(detail.body.events.every((e: any) => e.visibility === 'partage_client')).toBe(true);
  });
});

describe('Parcours 3 — Répondre à une demande d information (suspension/reprise SLA)', () => {
  it('gèle le SLA lors de la demande puis le relance à la réponse client', async () => {
    const declarant = await login('declarant@chu-liege.be');
    const respQualite = await login('responsable.qualite@service-du-sang.be');

    const created = await request(app)
      .post(`${API}/complaints`)
      .set('Authorization', `Bearer ${declarant.token}`)
      .send({
        category: 'produit_sanguin',
        declaredCriticality: 'majeure',
        description: 'Poche plaquettes suspecte, demande d investigation.',
        patientImpact: 'inconnu',
        patientImpactTypology: 'autre_impact',
        products: [
          { productCode: 'E3845V00', donationNumber: 'BE999925000888', bloodGroup: 'A+', quantity: 1, measuredTemperature: 21 },
        ],
      });
    const complaintId = created.body.id;

    // SFS: reçoit puis analyse recevabilité puis investigation
    await request(app).post(`${API}/complaints/${complaintId}/transition`).set('Authorization', `Bearer ${respQualite.token}`).send({ toStatus: 'en_analyse_recevabilite' });
    await request(app).post(`${API}/complaints/${complaintId}/transition`).set('Authorization', `Bearer ${respQualite.token}`).send({ toStatus: 'en_investigation' });

    // Demande d'information complémentaire -> SLA suspendu
    const suspend = await request(app)
      .post(`${API}/complaints/${complaintId}/transition`)
      .set('Authorization', `Bearer ${respQualite.token}`)
      .send({ toStatus: 'information_complementaire_demandee', comment: 'Merci de transmettre la photographie du relevé.' });
    expect(suspend.status).toBe(200);
    expect(suspend.body.slaSuspendedAt).toBeDefined();

    // Le client répond dans le fil -> SLA relancé + retour en investigation
    const reply = await request(app)
      .post(`${API}/complaints/${complaintId}/messages`)
      .set('Authorization', `Bearer ${declarant.token}`)
      .send({ content: 'Photographie du relevé transmise en pièce jointe.', visibility: 'partage_client' });
    expect(reply.status).toBe(201);

    const detail = await request(app)
      .get(`${API}/complaints/${complaintId}`)
      .set('Authorization', `Bearer ${respQualite.token}`);
    expect(detail.body.status).toBe('en_investigation');
    expect(detail.body.slaSuspendedAt).toBeNull();
  });
});

describe('Parcours 4 — Traiter côté SFS jusqu à la clôture (reflet Qualios)', () => {
  it('qualifie, juge la recevabilité, conclut, clôture et alimente le journal de synchronisation', async () => {
    const declarant = await login('declarant@chu-liege.be');
    const respQualite = await login('responsable.qualite@service-du-sang.be');

    const created = await request(app)
      .post(`${API}/complaints`)
      .set('Authorization', `Bearer ${declarant.token}`)
      .send({
        category: 'delai_disponibilite',
        declaredCriticality: 'majeure',
        description: 'Retard de livraison urgent de 3h constaté au bloc opératoire.',
        patientImpact: 'oui',
        patientImpactTypology: 'retard_transfusionnel',
      });
    const complaintId = created.body.id;

    // Le worker Outbox dépile et synchronise vers Qualios (mode manual en test)
    await OutboxWorker.processPendingTasks();

    const transitions = ['en_analyse_recevabilite', 'en_investigation', 'conclue', 'cloturee'];
    const payloads: Record<string, any> = {
      conclue: { conclusion: 'Cause racine identifiée : indisponibilité temporaire du véhicule de garde. Plan de continuité activé.' },
      cloturee: {},
    };

    for (const st of transitions) {
      const res = await request(app)
        .post(`${API}/complaints/${complaintId}/transition`)
        .set('Authorization', `Bearer ${respQualite.token}`)
        .send({ toStatus: st, ...payloads[st] });
      expect(res.status).toBe(200);
    }

    // Enquête de satisfaction auto-créée
    const survey = await prisma.satisfactionSurvey.findUnique({ where: { complaintId } });
    expect(survey).not.toBeNull();

    // Journal de synchronisation Qualios alimenté
    const syncLog = await prisma.syncLog.findFirst({
      where: { entityId: complaintId, direction: 'OUTBOUND' },
    });
    expect(syncLog).not.toBeNull();
  });
});

describe('Parcours 5 — Consulter la documentation (audiences et retrait)', () => {
  it('limite les documents selon l audience du profil', async () => {
    const lecturer = await login('lecteur@univ-bruxelles.be'); // Établissement d enseignement
    const bankUser = await login('declarant@chu-liege.be');   // Banque de sang hospitalière

    const lecturerDocs = await request(app).get(`${API}/documents`).set('Authorization', `Bearer ${lecturer.token}`);
    const bankDocs = await request(app).get(`${API}/documents`).set('Authorization', `Bearer ${bankUser.token}`);

    expect(lecturerDocs.status).toBe(200);
    expect(bankDocs.status).toBe(200);

    // L enseignant ne voit pas les notices produit hospitalières
    const lecturerRefs = lecturerDocs.body.map((d: any) => d.qualiosReference);
    expect(lecturerRefs).not.toContain('SFS-QUAL-NT001');
    // La banque voit les procédures et notices
    const bankRefs = bankDocs.body.map((d: any) => d.qualiosReference);
    expect(bankRefs).toContain('SFS-QUAL-PR001');
    expect(bankRefs).toContain('SFS-QUAL-NT001');

    // Aucun document retiré n est listé
    expect(bankRefs).not.toContain('SFS-QUAL-RT001');
  });

  it('renvoie une page explicite (410) pour un document retiré', async () => {
    const bankUser = await login('declarant@chu-liege.be');
    const retired = await prisma.document.findFirst({ where: { status: 'retire' } });
    expect(retired).not.toBeNull();

    const res = await request(app)
      .get(`${API}/documents/${retired!.id}`)
      .set('Authorization', `Bearer ${bankUser.token}`);
    expect(res.status).toBe(410);
    expect(res.body.error).toBe('DOCUMENT_RETIRED');
  });
});

describe('Parcours 6 — Mesurer (CSAT, tableau de bord, exports)', () => {
  it('expose les indicateurs de tableau de bord et l export d audit signé', async () => {
    const direction = await login('direction@service-du-sang.be');
    const respQualite = await login('responsable.qualite@service-du-sang.be');

    const metrics = await request(app).get(`${API}/dashboard/metrics`).set('Authorization', `Bearer ${direction.token}`);
    expect(metrics.status).toBe(200);
    expect(metrics.body.summary.totalComplaints).toBeGreaterThan(0);
    expect(metrics.body.byCategory).toBeDefined();
    expect(metrics.body.bySegment).toBeDefined();

    const auditExport = await request(app)
      .get(`${API}/audit/export-signed-csv`)
      .set('Authorization', `Bearer ${respQualite.token}`);
    expect(auditExport.status).toBe(200);
    expect(auditExport.headers['x-audit-sha256-checksum']).toMatch(/^[a-f0-9]{64}$/);
  });

  it('enregistre une réponse d enquête de satisfaction (CSAT 1-5)', async () => {
    const declarant = await login('declarant@chu-liege.be');
    const closed = await prisma.complaint.findFirst({
      where: { status: 'cloturee', satisfactionSurvey: { respondedAt: null } },
    });
    expect(closed).not.toBeNull();

    const res = await request(app)
      .post(`${API}/surveys/complaint/${closed!.id}`)
      .send({ scoreCsat: 5, verbatim: 'Excellent suivi, merci.' });
    expect(res.status).toBe(200);

    const survey = await prisma.satisfactionSurvey.findUnique({ where: { complaintId: closed!.id } });
    expect(survey?.scoreCsat).toBe(5);
  });
});

describe('Parcours 7 — Administrer (organisation, invitation, délégation)', () => {
  it('crée une organisation et invite un référent qualité', async () => {
    const admin = await login('admin@service-du-sang.be');
    const suffix = Date.now().toString(36);
    const { orgId, email } = await createDemoOrgAndUser(admin, suffix);

    // Le référent invité peut se connecter et gère l organisation
    const referent = await login(email);
    expect(referent.organizationId).toBe(orgId);
    expect(referent.roles).toContain('referent_qualite');

    // Il peut lister les utilisateurs de sa seule organisation
    const users = await request(app).get(`${API}/users`).set('Authorization', `Bearer ${referent.token}`);
    expect(users.status).toBe(200);
    expect(users.body.every((u: any) => u.organizationId === orgId)).toBe(true);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
