import { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { AuditService } from '../audit/audit.service.js';

export class AuditController {
  public static async list(req: AuthenticatedRequest, res: Response) {
    const { entityType, entityId, limit } = req.query;

    const whereClause: any = {};
    if (entityType) whereClause.entityType = String(entityType);
    if (entityId) whereClause.entityId = String(entityId);

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: limit ? parseInt(String(limit), 10) : 100,
    });

    return res.json(logs);
  }

  public static async exportSignedCsv(req: AuthenticatedRequest, res: Response) {
    const { entityType, entityId, startDate, endDate } = req.query;

    const exportResult = await AuditService.generateSignedCsvExport({
      entityType: entityType ? String(entityType) : undefined,
      entityId: entityId ? String(entityId) : undefined,
      startDate: startDate ? new Date(String(startDate)) : undefined,
      endDate: endDate ? new Date(String(endDate)) : undefined,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sfs_audit_trail_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.setHeader('X-Audit-SHA256-Checksum', exportResult.sha256Checksum);

    return res.send(exportResult.csvContent);
  }
}
