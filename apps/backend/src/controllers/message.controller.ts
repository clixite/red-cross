import { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { PatientDataDetector, PermissionGuard, UserRole, ComplaintStatus } from '@sfs/domain';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notifications/notification.service.js';

export class MessageController {
  public static async listByComplaint(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { complaintId } = req.params;

    const isInternal = PermissionGuard.isInternalStaff(req.user.roles);

    const messages = await prisma.message.findMany({
      where: {
        complaintId,
        ...(isInternal ? {} : { visibility: 'partage_client' }),
      },
      include: { attachments: true },
      orderBy: { createdAt: 'asc' },
    });

    return res.json(messages);
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { complaintId } = req.params;
    const { content, visibility } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'CONTENT_REQUIRED' });
    }

    // 1. Contrôle Heuristique Anti-Données Patient
    const scan = PatientDataDetector.scan(content);
    if (scan.hasPatientData) {
      await AuditService.log({
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.roles.join(','),
        actorOrgId: req.user.organizationId,
        action: 'SECURITY_PATIENT_DATA_MESSAGE_BLOCKED',
        entityType: 'MESSAGE',
        entityId: 'PRE_CREATION',
        newValues: { detectedPatterns: scan.detectedPatterns },
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(422).json({
        error: 'PATIENT_DATA_FORBIDDEN',
        message: scan.blockReason,
        detectedPatterns: scan.detectedPatterns,
      });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { declarant: true, organization: true },
    });

    if (!complaint) return res.status(404).json({ error: 'COMPLAINT_NOT_FOUND' });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const isInternal = PermissionGuard.isInternalStaff(req.user.roles);

    // Les notes internes ne peuvent être postées que par le personnel SFS
    const messageVisibility = isInternal && visibility === 'interne_sfs' ? 'interne_sfs' : 'partage_client';

    const message = await prisma.message.create({
      data: {
        complaintId,
        authorId: req.user.userId,
        authorName: `${user?.firstName} ${user?.lastName}`,
        authorRole: req.user.roles[0] as any,
        authorOrganization: user?.organizationId ? complaint.organization.name : 'Service du Sang',
        visibility: messageVisibility as any,
        content,
        readByDeclarant: !isInternal,
        readBySFS: isInternal,
      },
    });

    // Si le dossier était en attente d'information complémentaire et que le client répond, relancer l'investigation
    if (!isInternal && complaint.status === ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE) {
      await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status: ComplaintStatus.EN_INVESTIGATION as any,
          slaSuspendedAt: null,
        },
      });

      await prisma.complaintEvent.create({
        data: {
          complaintId,
          transitionType: 'REPRISE_INVESTIGATION_APRES_REPONSE',
          fromStatus: ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE as any,
          toStatus: ComplaintStatus.EN_INVESTIGATION as any,
          authorId: req.user.userId,
          authorName: `${user?.firstName} ${user?.lastName}`,
          authorOrganization: complaint.organization.name,
          comment: 'Réponse client reçue via le fil de discussion. Reprise automatique du SLA.',
          visibility: 'partage_client',
        },
      });
    }

    return res.status(201).json(message);
  }
}
