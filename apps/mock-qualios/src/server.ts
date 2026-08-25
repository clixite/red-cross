import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env.PORT || '4010', 10);
const API_KEY = process.env.API_KEY || 'qualios_live_secret_key_sfs_demo';

app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------------------
// État Interne Mock Qualios
// -----------------------------------------------------------------------------
interface FaultConfig {
  latencyMs: number;
  trigger500: boolean;
  trigger429: boolean;
  triggerPartial: boolean;
  triggerNotFound: boolean;
}

let faultConfig: FaultConfig = {
  latencyMs: 0,
  trigger500: false,
  trigger429: false,
  triggerPartial: false,
  triggerNotFound: false,
};

let ncCounter = 1000;
const nonConformitiesDb = new Map<string, any>();
const documentsDb = new Map<string, any>([
  [
    'SFS-QUAL-PR001',
    {
      reference: 'SFS-QUAL-PR001',
      version: '4.0',
      title: 'Procédure de commande et délivrance des PSL en urgence vitale',
      type: 'procedure',
      status: 'en_vigueur',
      applicationDate: '2024-01-15T00:00:00Z',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      downloadUrl: 'http://localhost:9000/sfs-portal-attachments/docs/SFS-QUAL-PR001_v4.0.pdf',
    },
  ],
  [
    'SFS-QUAL-MO012',
    {
      reference: 'SFS-QUAL-MO012',
      version: '2.1',
      title: 'Mode opératoire de réception et contrôle de conformité des Concentrés Érythrocytaires',
      type: 'mode_operatoire',
      status: 'en_vigueur',
      applicationDate: '2023-11-01T00:00:00Z',
      checksum: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      downloadUrl: 'http://localhost:9000/sfs-portal-attachments/docs/SFS-QUAL-MO012_v2.1.pdf',
    },
  ],
]);

// -----------------------------------------------------------------------------
// Middleware de Simulation de Faute & Authentification
// -----------------------------------------------------------------------------
app.use(async (req, res, next) => {
  // Injection de latence
  if (faultConfig.latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, faultConfig.latencyMs));
  }

  // Endpoints publics / sans simulation
  if (req.path.startsWith('/api/v1/faults') || req.path === '/health' || req.path === '/api/v1/openapi.json') {
    return next();
  }

  // Contrôle de clé d'API Qualios
  const authHeader = req.headers.authorization || req.headers['x-api-key'];
  if (!authHeader || (!authHeader.includes(API_KEY) && authHeader !== API_KEY)) {
    return res.status(401).json({ error: 'UNAUTHORIZED_QUALIOS_API_KEY', message: 'Clé d API Qualios invalide.' });
  }

  // Injection d'erreur 500
  if (faultConfig.trigger500) {
    return res.status(500).json({ error: 'QUALIOS_INTERNAL_ERROR', message: 'Erreur interne simulée sur le serveur Qualios.' });
  }

  // Injection de quota 429
  if (faultConfig.trigger429) {
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED', message: 'Quota d appels API Qualios dépassé.' });
  }

  // Injection de 404
  if (faultConfig.triggerNotFound) {
    return res.status(404).json({ error: 'QUALIOS_RESOURCE_NOT_FOUND', message: 'Ressource Qualios introuvable (faute simulée).' });
  }

  next();
});

// -----------------------------------------------------------------------------
// Endpoints Gestion des Fautes (Test & Chaos)
// -----------------------------------------------------------------------------
app.get('/api/v1/faults/config', (req, res) => {
  res.json(faultConfig);
});

app.post('/api/v1/faults/config', (req, res) => {
  faultConfig = { ...faultConfig, ...req.body };
  console.log('[MOCK_QUALIOS] Nouvelle configuration de fautes:', faultConfig);
  res.json({ success: true, faultConfig });
});

app.post('/api/v1/faults/reset', (req, res) => {
  faultConfig = {
    latencyMs: 0,
    trigger500: false,
    trigger429: false,
    triggerPartial: false,
    triggerNotFound: false,
  };
  res.json({ success: true, message: 'Fautes réinitialisées.' });
});

// -----------------------------------------------------------------------------
// Endpoints Métier Qualios
// -----------------------------------------------------------------------------

// Santé
app.get('/health', (req, res) => {
  res.json({ status: 'HEALTHY', provider: 'Qualios mock server v1.0', qmsOnline: true });
});

// Documents
app.get('/api/v1/documents', (req, res) => {
  const docs = Array.from(documentsDb.values());
  res.json({ items: docs, total: docs.length });
});

app.get('/api/v1/documents/:reference', (req, res) => {
  const doc = documentsDb.get(req.params.reference);
  if (!doc) return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
  res.json(doc);
});

// Non-Conformités
app.post('/api/v1/non-conformities', (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  const payload = req.body;

  // Si clé d'idempotence déjà connue
  for (const [, nc] of nonConformitiesDb.entries()) {
    if (nc.idempotencyKey && nc.idempotencyKey === idempotencyKey) {
      console.log(`[MOCK_QUALIOS] Réponse idempotente pour clé ${idempotencyKey} -> ${nc.qualiosRef}`);
      return res.status(200).json(nc);
    }
  }

  ncCounter++;
  const qualiosRef = `NC-2025-${ncCounter}`;
  const record = {
    qualiosRef,
    idempotencyKey,
    portalNumber: payload.portalNumber,
    category: payload.category,
    status: 'ENREGISTREE',
    createdAt: new Date().toISOString(),
    payload: faultConfig.triggerPartial ? { portalNumber: payload.portalNumber } : payload,
  };

  nonConformitiesDb.set(qualiosRef, record);
  console.log(`[MOCK_QUALIOS] Non-conformité créée : ${qualiosRef} (Portail: ${payload.portalNumber})`);

  return res.status(201).json(record);
});

app.get('/api/v1/non-conformities/:ref', (req, res) => {
  const nc = nonConformitiesDb.get(req.params.ref);
  if (!nc) return res.status(404).json({ error: 'NC_NOT_FOUND' });
  res.json(nc);
});

app.patch('/api/v1/non-conformities/:ref/status', (req, res) => {
  const nc = nonConformitiesDb.get(req.params.ref);
  if (!nc) return res.status(404).json({ error: 'NC_NOT_FOUND' });

  nc.status = req.body.status;
  nc.updatedAt = new Date().toISOString();
  nonConformitiesDb.set(req.params.ref, nc);

  console.log(`[MOCK_QUALIOS] Statut NC ${req.params.ref} mis à jour -> ${req.body.status}`);
  res.json(nc);
});

app.get('/api/v1/changes', (req, res) => {
  res.json({
    since: req.query.since || new Date().toISOString(),
    changes: [],
  });
});

app.get('/api/v1/openapi.json', (req, res) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Qualios QMS Mock API', version: '1.0.0' },
  });
});

app.listen(PORT, () => {
  console.log(`[MOCK_QUALIOS] Serveur Mock Qualios démarré sur http://localhost:${PORT}`);
});
