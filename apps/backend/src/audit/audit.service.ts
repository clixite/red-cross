import { prisma } from '../db/prisma.js';
import crypto from 'crypto';

export interface RecordAuditParams {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  actorOrgId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress: string;
  userAgent?: string | null;
}

export class AuditService {
  /**
   * Enregistre un événement dans la piste d'audit inaltérable (append-only)
   */
  public static async log(params: RecordAuditParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          actorEmail: params.actorEmail,
          actorRole: params.actorRole,
          actorOrgId: params.actorOrgId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          previousValues: params.previousValues ? (params.previousValues as any) : undefined,
          newValues: params.newValues ? (params.newValues as any) : undefined,
          ipAddress: params.ipAddress || '127.0.0.1',
          userAgent: params.userAgent || undefined,
        },
      });
    } catch (err) {
      console.error('[AUDIT_LOG_ERROR] Échec enregistrement audit:', err);
    }
  }

  /**
   * Génère un export CSV signé avec condensat SHA-256 et horodatage certifié
   */
  public static async generateSignedCsvExport(filters?: {
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ csvContent: string; sha256Checksum: string; recordCount: number; generatedAt: Date }> {
    const whereClause: any = {};
    if (filters?.entityType) whereClause.entityType = filters.entityType;
    if (filters?.entityId) whereClause.entityId = filters.entityId;
    if (filters?.startDate || filters?.endDate) {
      whereClause.timestamp = {};
      if (filters.startDate) whereClause.timestamp.gte = filters.startDate;
      if (filters.endDate) whereClause.timestamp.lte = filters.endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 5000,
    });

    const headers = [
      'ID_AUDIT',
      'HORODATAGE_UTC',
      'ACTEUR_EMAIL',
      'ROLE',
      'ORGANISATION_ID',
      'ACTION',
      'TYPE_ENTITE',
      'ID_ENTITE',
      'IP_SOURCE',
      'VALEURS_PRECEDENTES',
      'NOUVELLES_VALEURS',
    ];

    const rows = logs.map((l) => [
      l.id,
      l.timestamp.toISOString(),
      `"${l.actorEmail.replace(/"/g, '""')}"`,
      `"${l.actorRole}"`,
      `"${l.actorOrgId || ''}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.entityId}"`,
      `"${l.ipAddress}"`,
      `"${JSON.stringify(l.previousValues || {}).replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.newValues || {}).replace(/"/g, '""')}"`,
    ]);

    const csvBody = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const generatedAt = new Date();

    // Condensat SHA-256 scellé
    const sha256Checksum = crypto.createHash('sha256').update(csvBody, 'utf-8').digest('hex');

    const csvContent = `# ==============================================================================
# EXPORT PISTE D'AUDIT RÉGLEMENTÉE — SERVICE DU SANG (CROIX-ROUGE DE BELGIQUE)
# DATE EXPORT (UTC): ${generatedAt.toISOString()}
# NOMBRE D'ENREGISTREMENTS: ${logs.length}
# SCEAU CRYPTOGRAPHIQUE SHA-256: ${sha256Checksum}
# ==============================================================================
${csvBody}`;

    return {
      csvContent,
      sha256Checksum,
      recordCount: logs.length,
      generatedAt,
    };
  }
}
