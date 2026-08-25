import { describe, it, expect, vi } from 'vitest';
import { AuditService } from '../src/audit/audit.service.js';
import { prisma } from '../src/db/prisma.js';

describe('AuditService (Piste d Audit Inaltérable & Sceau Cryptographique)', () => {
  it('génère un export CSV scellé avec condensat SHA-256', async () => {
    // Mock données audit
    vi.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([
      {
        id: 'audit-1',
        timestamp: new Date('2025-05-10T10:00:00Z'),
        actorId: 'user-1',
        actorEmail: 'admin@service-du-sang.be',
        actorRole: 'administrateur',
        actorOrgId: null,
        action: 'COMPLAINT_STATUS_CHANGED_TO_CONCLUE',
        entityType: 'COMPLAINT',
        entityId: 'complaint-1',
        previousValues: { status: 'en_investigation' },
        newValues: { status: 'conclue' },
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      },
    ] as any);

    const exportResult = await AuditService.generateSignedCsvExport();

    expect(exportResult.recordCount).toBe(1);
    expect(exportResult.sha256Checksum.length).toBe(64); // SHA-256 hex length
    expect(exportResult.csvContent).toContain('SCEAU CRYPTOGRAPHIQUE SHA-256');
    expect(exportResult.csvContent).toContain('COMPLAINT_STATUS_CHANGED_TO_CONCLUE');
  });
});
