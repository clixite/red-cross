import { Router } from 'express';
import multer from 'multer';
import { AuthController } from '../controllers/auth.controller.js';
import { OrgController } from '../controllers/org.controller.js';
import { UserController } from '../controllers/user.controller.js';
import { DocumentController } from '../controllers/document.controller.js';
import { ComplaintController } from '../controllers/complaint.controller.js';
import { MessageController } from '../controllers/message.controller.js';
import { AttachmentController } from '../controllers/attachment.controller.js';
import { AuditController } from '../controllers/audit.controller.js';
import { SurveyController } from '../controllers/survey.controller.js';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { openApiSpec } from '../openapi/openapi.js';
import { prisma } from '../db/prisma.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 Mo max
});

export const apiRouter = Router();

// -----------------------------------------------------------------------------
// Documentation OpenAPI
// -----------------------------------------------------------------------------
apiRouter.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

// -----------------------------------------------------------------------------
// Authentification & Compte
// -----------------------------------------------------------------------------
apiRouter.post('/auth/login', AuthController.login);
apiRouter.post('/auth/activate-invitation', AuthController.activateInvitation);
apiRouter.get('/auth/me', requireAuth, AuthController.getMe);
apiRouter.post('/auth/mfa/setup', requireAuth, AuthController.setupMfa);
apiRouter.post('/auth/mfa/confirm', requireAuth, AuthController.confirmMfa);

// -----------------------------------------------------------------------------
// Organisations
// -----------------------------------------------------------------------------
apiRouter.get('/organizations', requireAuth, OrgController.list);
apiRouter.get('/organizations/:id', requireAuth, OrgController.getById);
apiRouter.post('/organizations', requireAuth, requirePermission('organizations:manage_all'), OrgController.create);

// -----------------------------------------------------------------------------
// Utilisateurs & Invitations
// -----------------------------------------------------------------------------
apiRouter.get('/users', requireAuth, UserController.list);
apiRouter.post('/users/invite', requireAuth, UserController.invite);

// -----------------------------------------------------------------------------
// Documents Contrôlés (Synchronisés depuis Qualios)
// -----------------------------------------------------------------------------
apiRouter.get('/documents', requireAuth, DocumentController.list);
apiRouter.get('/documents/:id', requireAuth, DocumentController.getById);
apiRouter.get('/documents/:id/download-url', requireAuth, DocumentController.getDownloadUrl);

// -----------------------------------------------------------------------------
// Réclamations (Enregistrements Qualité Réglementés)
// -----------------------------------------------------------------------------
apiRouter.get('/complaints', requireAuth, ComplaintController.list);
apiRouter.get('/complaints/:id', requireAuth, ComplaintController.getById);
apiRouter.post('/complaints', requireAuth, ComplaintController.create);
apiRouter.post('/complaints/:id/transition', requireAuth, ComplaintController.transitionStatus);

// -----------------------------------------------------------------------------
// Fil de Discussion & Messages
// -----------------------------------------------------------------------------
apiRouter.get('/complaints/:complaintId/messages', requireAuth, MessageController.listByComplaint);
apiRouter.post('/complaints/:complaintId/messages', requireAuth, MessageController.create);

// -----------------------------------------------------------------------------
// Pièces Jointes & Antivirus
// -----------------------------------------------------------------------------
apiRouter.post('/attachments/upload', requireAuth, upload.single('file'), AttachmentController.upload);
apiRouter.get('/attachments/:id/download-url', requireAuth, AttachmentController.getSignedUrl);

// -----------------------------------------------------------------------------
// Piste d'Audit Inaltérable (Append-Only)
// -----------------------------------------------------------------------------
apiRouter.get('/audit', requireAuth, requirePermission('audit:read'), AuditController.list);
apiRouter.get('/audit/export-signed-csv', requireAuth, requirePermission('audit:export'), AuditController.exportSignedCsv);

// -----------------------------------------------------------------------------
// Enquêtes de Satisfaction
// -----------------------------------------------------------------------------
apiRouter.get('/surveys/complaint/:complaintId', SurveyController.getByComplaintId);
apiRouter.post('/surveys/complaint/:complaintId', SurveyController.submit);
apiRouter.get('/surveys', requireAuth, requirePermission('surveys:manage_export'), SurveyController.listAll);

// -----------------------------------------------------------------------------
// Tableaux de Bord & Indicateurs Qualité
// -----------------------------------------------------------------------------
apiRouter.get('/dashboard/metrics', requireAuth, DashboardController.getMetrics);

// -----------------------------------------------------------------------------
// Intégration & Synchronisation Qualios
// -----------------------------------------------------------------------------
apiRouter.get('/qualios/sync-logs', requireAuth, requirePermission('qualios:manage_sync'), async (req, res) => {
  const logs = await prisma.syncLog.findMany({ orderBy: { timestamp: 'desc' }, take: 100 });
  res.json(logs);
});

apiRouter.get('/qualios/outbox/tasks', requireAuth, requirePermission('qualios:manage_sync'), async (req, res) => {
  const tasks = await prisma.outboxTask.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(tasks);
});

apiRouter.post('/qualios/outbox/retry/:id', requireAuth, requirePermission('qualios:manage_sync'), async (req, res) => {
  const { id } = req.params;
  const updated = await prisma.outboxTask.update({
    where: { id },
    data: { status: 'pending', retries: 0, nextRetryAt: null },
  });
  res.json({ success: true, updated });
});

apiRouter.post('/qualios/reconcile', requireAuth, requirePermission('qualios:manage_sync'), async (req, res) => {
  const { OutboxWorker } = await import('../qualios/outbox.worker.js');
  const result = await OutboxWorker.runNightlyReconciliation();
  res.json(result);
});

