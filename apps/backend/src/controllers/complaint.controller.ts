import { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import {
  ComplaintStateMachine,
  ComplaintStatus,
  ComplaintCategory,
  PatientDataDetector,
  BloodProductValidator,
  SlaCalculator,
  PermissionGuard,
  UserRole,
} from '@sfs/domain';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import crypto from 'crypto';

export class ComplaintController {
  private static BLOOD_GROUP_TO_ENUM: Record<string, string> = {
    'A+': 'A_POS', 'A-': 'A_NEG', 'B+': 'B_POS', 'B-': 'B_NEG',
    'AB+': 'AB_POS', 'AB-': 'AB_NEG', 'O+': 'O_POS', 'O-': 'O_NEG',
  };

  /**
   * Génère le numéro séquentiel unique de réclamation: SFS-AAAA-NNNNN
   */
  private static async generatePortalNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `SFS-${currentYear}-`;

    const count = await prisma.complaint.count({
      where: {
        portalNumber: { startsWith: prefix },
      },
    });

    const nextSeq = (count + 1).toString().padStart(5, '0');
    return `${prefix}${nextSeq}`;
  }

  public static async list(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    let whereClause: any = {};

    if (!PermissionGuard.isInternalStaff(req.user.roles)) {
      if (!req.user.organizationId) return res.json([]);
      whereClause.organizationId = req.user.organizationId;

      // Si simple déclarant (non référent qualité), ne voit que ses réclamations
      if (!req.user.roles.includes(UserRole.REFERENT_QUALITE)) {
        whereClause.declarantId = req.user.userId;
      }
    }

    const complaints = await prisma.complaint.findMany({
      where: whereClause,
      include: {
        organization: { select: { id: true, name: true, type: true } },
        declarant: { select: { id: true, firstName: true, lastName: true, email: true } },
        products: true,
        events: { orderBy: { createdAt: 'desc' } },
        _count: { select: { messages: true, attachments: true } },
      },
      orderBy: { declarationDate: 'desc' },
    });

    return res.json(complaints);
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        organization: true,
        declarant: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true } },
        products: true,
        events: { orderBy: { createdAt: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
        attachments: true,
        satisfactionSurvey: true,
      },
    });

    if (!complaint) return res.status(404).json({ error: 'COMPLAINT_NOT_FOUND' });

    // Contrôle d'accès multi-tenant
    const canAccess = PermissionGuard.canAccessComplaint(
      { id: req.user.userId, organizationId: req.user.organizationId, roles: req.user.roles },
      { organizationId: complaint.organizationId, declarantId: complaint.declarantId }
    );

    if (!canAccess) {
      await AuditService.log({
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.roles.join(','),
        actorOrgId: req.user.organizationId,
        action: 'SECURITY_TENANT_VIOLATION_BLOCKED',
        entityType: 'COMPLAINT',
        entityId: complaint.id,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(403).json({
        error: 'TENANT_ACCESS_DENIED',
        message: 'Accès interdit : Cette réclamation appartient à une autre organisation.',
      });
    }

    // Filtrer les événements et messages selon la visibilité (si client)
    const isInternal = PermissionGuard.isInternalStaff(req.user.roles);
    const visibleEvents = isInternal
      ? complaint.events
      : complaint.events.filter((e) => e.visibility === 'partage_client');
    const visibleMessages = isInternal
      ? complaint.messages
      : complaint.messages.filter((m) => m.visibility === 'partage_client');

    return res.json({
      ...complaint,
      events: visibleEvents,
      messages: visibleMessages,
    });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const {
      organizationId,
      incidentDate,
      category,
      subCategory,
      declaredCriticality,
      description,
      patientImpact,
      patientImpactTypology,
      products,
      entryChannel,
    } = req.body;

    const targetOrgId = req.user.organizationId || organizationId;
    if (!targetOrgId) {
      return res.status(400).json({ error: 'ORGANIZATION_REQUIRED' });
    }

    // 1. Contrôle Heuristique Anti-Données de Santé (RGPD / NISS)
    const scanDesc = PatientDataDetector.scan(description);
    if (scanDesc.hasPatientData) {
      await AuditService.log({
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.roles.join(','),
        actorOrgId: req.user.organizationId,
        action: 'SECURITY_PATIENT_DATA_SUBMISSION_BLOCKED',
        entityType: 'COMPLAINT',
        entityId: 'PRE_CREATION',
        newValues: { detectedPatterns: scanDesc.detectedPatterns },
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(422).json({
        error: 'PATIENT_DATA_FORBIDDEN',
        message: scanDesc.blockReason,
        detectedPatterns: scanDesc.detectedPatterns,
      });
    }

    // 2. Validation produit si catégorie = produit_sanguin
    if (category === ComplaintCategory.PRODUIT_SANGUIN) {
      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          error: 'PRODUCT_TRACEABILITY_REQUIRED',
          message: 'Au moins un produit sanguin labile (numéro de don et code produit) doit être renseigné pour cette catégorie.',
        });
      }

      for (const prod of products) {
        const prodVal = BloodProductValidator.validate(prod);
        if (!prodVal.isValid) {
          return res.status(400).json({
            error: 'INVALID_PRODUCT_DATA',
            message: prodVal.errors.join(' '),
            errors: prodVal.errors,
          });
        }
      }
    }

    // 3. Calcul des dates cibles SLA
    const now = new Date();
    const slaTargets = SlaCalculator.calculateInitialTargets(now, 2, 30);
    const portalNumber = await ComplaintController.generatePortalNumber();

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });

    // 4. Création atomique en base
    const complaint = await prisma.complaint.create({
      data: {
        portalNumber,
        organizationId: targetOrgId,
        declarantId: req.user.userId,
        entryChannel: entryChannel || 'portal',
        incidentDate: incidentDate ? new Date(incidentDate) : now,
        declarationDate: now,
        category: category as any,
        subCategory,
        declaredCriticality: declaredCriticality || 'mineure',
        description,
        patientImpact: patientImpact || 'inconnu',
        patientImpactTypology: patientImpactTypology || 'aucun',
        status: ComplaintStatus.RECUE as any,
        slaTargetReceivabilityAt: slaTargets.targetReceivabilityDate,
        slaTargetFinalResponseAt: slaTargets.targetFinalResponseDate,
        products: products && products.length > 0
          ? {
              create: products.map((p: any) => ({
                productCode: p.productCode.trim().toUpperCase(),
                donationNumber: p.donationNumber.trim().toUpperCase(),
                bloodGroup: p.bloodGroup ? (ComplaintController.BLOOD_GROUP_TO_ENUM[p.bloodGroup] as any) : undefined,
                quantity: p.quantity ? parseInt(p.quantity, 10) : 1,
                measuredTemperature: p.measuredTemperature ? parseFloat(p.measuredTemperature) : null,
              })),
            }
          : undefined,
        events: {
          create: {
            transitionType: 'CREATION_ET_RECEPTION',
            fromStatus: ComplaintStatus.BROUILLON as any,
            toStatus: ComplaintStatus.RECUE as any,
            authorId: req.user.userId,
            authorName: `${user?.firstName} ${user?.lastName}`,
            authorOrganization: user?.organization?.name || 'Service du Sang',
            comment: 'Réclamation déclarée et enregistrée sur le portail.',
            visibility: 'partage_client',
          },
        },
      },
      include: { products: true, events: true, organization: true },
    });

    // 5. Création de la tâche Outbox pour synchronisation Qualios
    await prisma.outboxTask.create({
      data: {
        idempotencyKey: `complaint_sync_${complaint.id}`,
        taskType: 'CREATE_QUALIOS_NON_CONFORMITY',
        payload: {
          complaintId: complaint.id,
          portalNumber: complaint.portalNumber,
          category: complaint.category,
          criticality: complaint.declaredCriticality,
          description: complaint.description,
          organizationName: complaint.organization.name,
          products: complaint.products,
        },
        status: 'pending',
      },
    });

    // 6. Envoi de l'accusé de réception par email
    await NotificationService.send({
      recipientEmail: req.user.email,
      recipientName: `${user?.firstName} ${user?.lastName}`,
      language: user?.language as any,
      type: 'COMPLAINT_RECEIVED_ACK',
      data: {
        portalNumber: complaint.portalNumber,
        recipientName: `${user?.firstName} ${user?.lastName}`,
        slaReceivabilityDate: slaTargets.targetReceivabilityDate.toLocaleDateString(),
      },
    });

    // 7. Audit Log
    await AuditService.log({
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.roles.join(','),
      actorOrgId: targetOrgId,
      action: 'COMPLAINT_CREATED',
      entityType: 'COMPLAINT',
      entityId: complaint.id,
      newValues: { portalNumber: complaint.portalNumber, category: complaint.category },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json(complaint);
  }

  public static async transitionStatus(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { id } = req.params;
    const { toStatus, comment, rejectionReason, validatedCriticality, conclusion, correctiveActionsSummary } = req.body;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { organization: true, declarant: true },
    });

    if (!complaint) return res.status(404).json({ error: 'COMPLAINT_NOT_FOUND' });

    // Machine à états formelle
    const validation = ComplaintStateMachine.validateTransition(complaint.status as any, {
      toStatus: toStatus as any,
      userRole: req.user.roles[0], // Rôle principal
      rejectionReason,
      conclusion,
      validatedCriticality,
      correctiveActionsSummary,
    });

    if (!validation.valid) {
      return res.status(400).json({
        error: 'INVALID_STATUS_TRANSITION',
        message: validation.error,
      });
    }

    const now = new Date();
    const updateData: any = {
      status: toStatus,
      updatedAt: now,
    };

    if (validatedCriticality) updateData.validatedCriticality = validatedCriticality;
    if (rejectionReason) updateData.rejectionReason = rejectionReason;
    if (conclusion) updateData.conclusion = conclusion;
    if (correctiveActionsSummary) updateData.correctiveActionsSummary = correctiveActionsSummary;
    if (toStatus === ComplaintStatus.CLOTUREE || toStatus === ComplaintStatus.IRRECEVABLE) {
      updateData.closedAt = now;
    }

    // Gestion de la suspension du chronomètre de SLA
    if (toStatus === ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE) {
      updateData.slaSuspendedAt = now;
    } else if (complaint.status === ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE && complaint.slaSuspendedAt) {
      // Reprise de SLA
      const adjust = SlaCalculator.adjustFinalResponseDate(
        complaint.slaTargetFinalResponseAt || now,
        complaint.slaSuspendedAt,
        now
      );
      updateData.slaTargetFinalResponseAt = adjust.updatedTarget;
      updateData.slaTotalSuspensionHours = complaint.slaTotalSuspensionHours + adjust.addedSuspensionHours;
      updateData.slaSuspendedAt = null;
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: { organization: true, declarant: true },
    });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    // Événement append-only
    await prisma.complaintEvent.create({
      data: {
        complaintId: id,
        transitionType: `TRANSITION_${toStatus.toUpperCase()}`,
        fromStatus: complaint.status as any,
        toStatus: toStatus as any,
        authorId: req.user.userId,
        authorName: `${user?.firstName} ${user?.lastName}`,
        authorOrganization: user?.organizationId ? 'Client' : 'Service du Sang',
        comment: comment || rejectionReason || conclusion || `Passage au statut ${toStatus}`,
        visibility: 'partage_client',
      },
    });

    // Notification par email
    await NotificationService.send({
      recipientEmail: complaint.declarant.email,
      recipientName: `${complaint.declarant.firstName} ${complaint.declarant.lastName}`,
      language: complaint.declarant.language as any,
      type: toStatus === ComplaintStatus.INFORMATION_COMPLEMENTAIRE_DEMANDEE
        ? 'ADDITIONAL_INFO_REQUESTED'
        : toStatus === ComplaintStatus.CLOTUREE
        ? 'SURVEY_INVITATION'
        : 'STATUS_CHANGED',
      data: {
        portalNumber: complaint.portalNumber,
        newStatus: toStatus,
        comment: comment || rejectionReason || conclusion || '',
        message: comment || '',
        surveyUrl: `http://localhost:3000/surveys/${complaint.id}`,
      },
    });

    // Si clôture, initialisation de l'enquête de satisfaction
    if (toStatus === ComplaintStatus.CLOTUREE) {
      await prisma.satisfactionSurvey.upsert({
        where: { complaintId: id },
        create: {
          complaintId: id,
          organizationId: complaint.organizationId,
          scoreCsat: 0, // En attente
        },
        update: {},
      });
    }

    // Tâche Outbox pour notifier Qualios du changement de statut
    await prisma.outboxTask.create({
      data: {
        idempotencyKey: `status_update_${complaint.id}_${toStatus}_${Date.now()}`,
        taskType: 'UPDATE_QUALIOS_NON_CONFORMITY_STATUS',
        payload: {
          complaintId: complaint.id,
          qualiosRef: complaint.qualiosNonConformityRef,
          status: toStatus,
          conclusion: updatedComplaint.conclusion,
          rejectionReason: updatedComplaint.rejectionReason,
        },
        status: 'pending',
      },
    });

    await AuditService.log({
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.roles.join(','),
      actorOrgId: req.user.organizationId,
      action: `COMPLAINT_STATUS_CHANGED_TO_${toStatus.toUpperCase()}`,
      entityType: 'COMPLAINT',
      entityId: complaint.id,
      previousValues: { status: complaint.status },
      newValues: { status: toStatus },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json(updatedComplaint);
  }
}
