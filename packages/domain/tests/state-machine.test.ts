import { describe, it, expect } from 'vitest';
import {
  ComplaintStateMachine,
  ComplaintStatus,
  UserRole,
} from '../src/index.js';

describe('ComplaintStateMachine', () => {
  it('autorise le cycle standard nominal brouillon -> soumise -> recue -> en_analyse -> en_investigation -> conclue -> cloturee', () => {
    // 1. brouillon -> soumise
    let res = ComplaintStateMachine.validateTransition(ComplaintStatus.BROUILLON, {
      toStatus: ComplaintStatus.SOUMISE,
      userRole: UserRole.DECLARANT,
    });
    expect(res.valid).toBe(true);

    // 2. soumise -> recue
    res = ComplaintStateMachine.validateTransition(ComplaintStatus.SOUMISE, {
      toStatus: ComplaintStatus.RECUE,
      userRole: UserRole.AGENT_RECEPTION,
    });
    expect(res.valid).toBe(true);

    // 3. recue -> en_analyse_recevabilite
    res = ComplaintStateMachine.validateTransition(ComplaintStatus.RECUE, {
      toStatus: ComplaintStatus.EN_ANALYSE_RECEVABILITE,
      userRole: UserRole.AGENT_RECEPTION,
    });
    expect(res.valid).toBe(true);

    // 4. en_analyse_recevabilite -> en_investigation (par responsable qualité)
    res = ComplaintStateMachine.validateTransition(ComplaintStatus.EN_ANALYSE_RECEVABILITE, {
      toStatus: ComplaintStatus.EN_INVESTIGATION,
      userRole: UserRole.RESPONSABLE_QUALITE,
    });
    expect(res.valid).toBe(true);

    // 5. en_investigation -> conclue (avec conclusion obligatoire)
    res = ComplaintStateMachine.validateTransition(ComplaintStatus.EN_INVESTIGATION, {
      toStatus: ComplaintStatus.CONCLUE,
      userRole: UserRole.RESPONSABLE_QUALITE,
      conclusion: 'Cause racine identifiée : rupture de la chaîne du froid chez le transporteur externe.',
    });
    expect(res.valid).toBe(true);

    // 6. conclue -> cloturee
    res = ComplaintStateMachine.validateTransition(ComplaintStatus.CONCLUE, {
      toStatus: ComplaintStatus.CLOTUREE,
      userRole: UserRole.RESPONSABLE_QUALITE,
    });
    expect(res.valid).toBe(true);
    expect(res.isTerminal).toBe(true);
  });

  it('refuse la clôture ou la conclusion sans motif ou par un rôle non autorisé', () => {
    // Tentative de conclusion par un déclarant
    let res = ComplaintStateMachine.validateTransition(ComplaintStatus.EN_INVESTIGATION, {
      toStatus: ComplaintStatus.CONCLUE,
      userRole: UserRole.DECLARANT,
      conclusion: 'Je conclus ma propre réclamation',
    });
    expect(res.valid).toBe(false);

    // Tentative de conclusion par responsable qualité sans texte de conclusion
    res = ComplaintStateMachine.validateTransition(ComplaintStatus.EN_INVESTIGATION, {
      toStatus: ComplaintStatus.CONCLUE,
      userRole: UserRole.RESPONSABLE_QUALITE,
      conclusion: '',
    });
    expect(res.valid).toBe(false);
    expect(res.requiresConclusion).toBe(true);
  });

  it('gère l irrecevabilité avec obligation de motif', () => {
    // Sans motif
    let res = ComplaintStateMachine.validateTransition(ComplaintStatus.EN_ANALYSE_RECEVABILITE, {
      toStatus: ComplaintStatus.IRRECEVABLE,
      userRole: UserRole.RESPONSABLE_QUALITE,
      rejectionReason: '',
    });
    expect(res.valid).toBe(false);
    expect(res.requiresRejectionReason).toBe(true);

    // Avec motif valide
    res = ComplaintStateMachine.validateTransition(ComplaintStatus.EN_ANALYSE_RECEVABILITE, {
      toStatus: ComplaintStatus.IRRECEVABLE,
      userRole: UserRole.RESPONSABLE_QUALITE,
      rejectionReason: 'Le produit a été livré conforme il y a plus de 6 mois sans signalement préalable.',
    });
    expect(res.valid).toBe(true);
    expect(res.isTerminal).toBe(true);
  });

  it('gère la boucle de demande d information complémentaire', () => {
    // 1. Demande d'information
    let res = ComplaintStateMachine.validateTransition(ComplaintStatus.EN_INVESTIGATION, {
      toStatus: ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE,
      userRole: UserRole.AGENT_RECEPTION,
    });
    expect(res.valid).toBe(true);

    // 2. Réponse client et reprise d'investigation
    res = ComplaintStateMachine.validateTransition(ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE, {
      toStatus: ComplaintStatus.EN_INVESTIGATION,
      userRole: UserRole.DECLARANT,
    });
    expect(res.valid).toBe(true);
  });

  it('interdit les sauts d états illégaux (ex: brouillon -> clôturée)', () => {
    const res = ComplaintStateMachine.validateTransition(ComplaintStatus.BROUILLON, {
      toStatus: ComplaintStatus.CLOTUREE,
      userRole: UserRole.ADMINISTRATEUR,
    });
    expect(res.valid).toBe(false);
  });

  it('déclare irrecevable un motif trop court (moins de 5 caractères)', () => {
    const res = ComplaintStateMachine.validateTransition(ComplaintStatus.EN_ANALYSE_RECEVABILITE, {
      toStatus: ComplaintStatus.IRRECEVABLE,
      userRole: UserRole.RESPONSABLE_QUALITE,
      rejectionReason: 'Nul.',
    });
    expect(res.valid).toBe(false);
    expect(res.requiresRejectionReason).toBe(true);
  });

  it('autorise la soumission par un référent qualité et la refuse pour un agent SFS', () => {
    const ok = ComplaintStateMachine.validateTransition(ComplaintStatus.BROUILLON, {
      toStatus: ComplaintStatus.SOUMISE,
      userRole: UserRole.REFERENT_QUALITE,
    });
    expect(ok.valid).toBe(true);

    const denied = ComplaintStateMachine.validateTransition(ComplaintStatus.BROUILLON, {
      toStatus: ComplaintStatus.SOUMISE,
      userRole: UserRole.AGENT_RECEPTION,
    });
    expect(denied.valid).toBe(false);
  });

  it('refuse une demande de complément émise par un déclarant client', () => {
    const res = ComplaintStateMachine.validateTransition(ComplaintStatus.EN_INVESTIGATION, {
      toStatus: ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE,
      userRole: UserRole.DECLARANT,
    });
    expect(res.valid).toBe(false);
  });

  it('autorise la reprise d investigation après réponse par un agent ou un déclarant', () => {
    const byAgent = ComplaintStateMachine.validateTransition(ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE, {
      toStatus: ComplaintStatus.EN_INVESTIGATION,
      userRole: UserRole.AGENT_RECEPTION,
    });
    expect(byAgent.valid).toBe(true);

    const byLecteur = ComplaintStateMachine.validateTransition(ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE, {
      toStatus: ComplaintStatus.EN_INVESTIGATION,
      userRole: UserRole.LECTEUR,
    });
    expect(byLecteur.valid).toBe(false);
  });

  it('les statuts terminaux ne permettent aucune transition supplémentaire', () => {
    expect(ComplaintStateMachine.canTransition(ComplaintStatus.CLOTUREE, ComplaintStatus.EN_INVESTIGATION)).toBe(false);
    expect(ComplaintStateMachine.canTransition(ComplaintStatus.IRRECEVABLE, ComplaintStatus.RECUE)).toBe(false);
  });

  it('calcule correctement les statuts suivants autorisés par rôle', () => {
    // Déclarant : ne peut pas conclure ni clôturer
    const declarantNext = ComplaintStateMachine.getAllowedNextStatuses(ComplaintStatus.EN_INVESTIGATION, UserRole.DECLARANT);
    expect(declarantNext).not.toContain(ComplaintStatus.CONCLUE);
    expect(declarantNext).toContain(ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE);

    // Responsable qualité : peut conclure
    const respNext = ComplaintStateMachine.getAllowedNextStatuses(ComplaintStatus.EN_INVESTIGATION, UserRole.RESPONSABLE_QUALITE);
    expect(respNext).toContain(ComplaintStatus.CONCLUE);

    // Depuis brouillon, seul SOUMISE est possible
    expect(ComplaintStateMachine.getAllowedNextStatuses(ComplaintStatus.BROUILLON, UserRole.DECLARANT)).toEqual([
      ComplaintStatus.SOUMISE,
    ]);
  });
});
