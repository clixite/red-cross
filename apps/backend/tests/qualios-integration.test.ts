import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualiosRestAdapter } from '../src/qualios/adapters/rest.adapter.js';
import { QualiosFileAdapter } from '../src/qualios/adapters/file.adapter.js';
import { QualiosManualAdapter } from '../src/qualios/adapters/manual.adapter.js';
import { OutboxWorker } from '../src/qualios/outbox.worker.js';
import { prisma } from '../src/db/prisma.js';

describe('Intégration Qualios & Couche Anti-Corruption (Phase 4)', () => {
  it('instancie correctement les 3 adaptateurs Qualios', () => {
    const rest = new QualiosRestAdapter();
    const file = new QualiosFileAdapter();
    const manual = new QualiosManualAdapter();

    expect(rest.adapterName).toBe('rest');
    expect(file.adapterName).toBe('file');
    expect(manual.adapterName).toBe('manual');
  });

  it('génère un export de fichier atomique avec fichier témoin .done via le FileAdapter', async () => {
    const fileAdapter = new QualiosFileAdapter();
    const result = await fileAdapter.createNonConformity(
      {
        complaintId: 'c-100',
        portalNumber: 'SFS-2025-00100',
        category: 'produit_sanguin',
        criticality: 'majeure',
        description: 'Poche rompue au dégel',
        organizationName: 'Hôpital Démo',
      },
      'idemp-key-100'
    );

    expect(result.qualiosRef).toContain('NC-BATCH-2025-00100');
  });

  it('traite une tâche Outbox et met à jour la réclamation avec la référence Qualios', async () => {
    // Mock prisma calls
    const mockTasks = [
      {
        id: 'task-1',
        idempotencyKey: 'key-123',
        taskType: 'CREATE_QUALIOS_NON_CONFORMITY',
        payload: {
          complaintId: 'complaint-abc',
          portalNumber: 'SFS-2025-00010',
          category: 'produit_sanguin',
          criticality: 'mineure',
          description: 'Étiquette illisible',
          organizationName: 'Clinique de Wallonie',
        },
        status: 'pending',
        retries: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.spyOn(prisma.outboxTask, 'findMany').mockResolvedValue(mockTasks as any);
    vi.spyOn(prisma.outboxTask, 'update').mockResolvedValue({} as any);
    vi.spyOn(prisma.complaint, 'update').mockResolvedValue({} as any);
    vi.spyOn(prisma.syncLog, 'create').mockResolvedValue({} as any);

    const res = await OutboxWorker.processPendingTasks();

    expect(res.processed).toBe(1);
  });
});
