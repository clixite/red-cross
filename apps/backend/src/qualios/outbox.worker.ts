import { prisma } from '../db/prisma.js';
import { QualiosService } from './qualios.service.js';
import { config } from '../config.js';

export class OutboxWorker {
  private static isRunning = false;
  private static intervalTimer: NodeJS.Timeout | null = null;

  public static start(): void {
    if (this.intervalTimer) return;
    const intervalMs = config.qualios.syncIntervalSec * 1000;

    this.intervalTimer = setInterval(async () => {
      await this.processPendingTasks();
    }, intervalMs);

    console.log(`[OUTBOX_WORKER] Démarré. Intervalle de traitement : ${config.qualios.syncIntervalSec}s`);
  }

  public static stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      console.log('[OUTBOX_WORKER] Arrêté.');
    }
  }

  public static async processPendingTasks(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isRunning) return { processed: 0, succeeded: 0, failed: 0 };
    this.isRunning = true;

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const now = new Date();
      const tasks = await prisma.outboxTask.findMany({
        where: {
          status: { in: ['pending', 'failed'] },
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
        },
        take: 20,
        orderBy: { createdAt: 'asc' },
      });

      const adapter = QualiosService.getAdapter();

      for (const task of tasks) {
        processed++;
        const startTime = Date.now();
        await prisma.outboxTask.update({
          where: { id: task.id },
          data: { status: 'processing' },
        });

        try {
          const payload = task.payload as any;

          if (task.taskType === 'CREATE_QUALIOS_NON_CONFORMITY') {
            const result = await adapter.createNonConformity(payload, task.idempotencyKey);

            // Mettre à jour la réclamation avec la référence Qualios obtenue
            await prisma.complaint.update({
              where: { id: payload.complaintId },
              data: { qualiosNonConformityRef: result.qualiosRef },
            });

            // Logger dans le journal de synchronisation
            await prisma.syncLog.create({
              data: {
                direction: 'OUTBOUND',
                adapter: adapter.adapterName,
                entityType: 'complaint',
                entityId: payload.complaintId,
                qualiosRef: result.qualiosRef,
                status: 'SUCCESS',
                latencyMs: Date.now() - startTime,
                attemptNumber: task.retries + 1,
                payloadTruncated: JSON.stringify(payload).slice(0, 500),
              },
            });
          } else if (task.taskType === 'UPDATE_QUALIOS_NON_CONFORMITY_STATUS') {
            if (payload.qualiosRef && !payload.qualiosRef.startsWith('ATTENTE-MANUELLE')) {
              await adapter.updateNonConformityStatus(payload.qualiosRef, payload.status, payload.conclusion || payload.rejectionReason);
            }
          }

          // Succès
          await prisma.outboxTask.update({
            where: { id: task.id },
            data: { status: 'completed' },
          });
          succeeded++;
        } catch (err: any) {
          failed++;
          const nextRetries = task.retries + 1;
          const isDeadLetter = nextRetries >= task.maxRetries;

          const backoffDelaySeconds = Math.pow(2, nextRetries) * 5;
          const nextRetryAt = new Date(Date.now() + backoffDelaySeconds * 1000);

          await prisma.outboxTask.update({
            where: { id: task.id },
            data: {
              status: isDeadLetter ? 'dead_letter' : 'failed',
              retries: nextRetries,
              nextRetryAt: isDeadLetter ? null : nextRetryAt,
              lastError: err.message || String(err),
            },
          });

          await prisma.syncLog.create({
            data: {
              direction: 'OUTBOUND',
              adapter: adapter.adapterName,
              entityType: 'complaint',
              entityId: (task.payload as any).complaintId || task.id,
              status: isDeadLetter ? 'FAILED' : 'RETRYING',
              latencyMs: Date.now() - startTime,
              attemptNumber: nextRetries,
              errorMessage: err.message || String(err),
            },
          });

          console.error(`[OUTBOX_TASK_ERROR] Tâche ${task.id} (${task.taskType}) en échec (Tentative ${nextRetries}/${task.maxRetries}):`, err.message);
        }
      }
    } catch (globalErr) {
      console.error('[OUTBOX_WORKER_ERROR]', globalErr);
    } finally {
      this.isRunning = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Réconciliation programmée (Nocturne)
   */
  public static async runNightlyReconciliation(): Promise<{ totalChecked: number; discrepanciesFound: number }> {
    console.log('[RECONCILIATION] Démarrage du contrôle de cohérence nocturne Portail ↔ Qualios...');
    const adapter = QualiosService.getAdapter();

    const complaints = await prisma.complaint.findMany({
      where: { qualiosNonConformityRef: { not: null } },
      take: 200,
    });

    let discrepanciesFound = 0;

    for (const c of complaints) {
      if (c.qualiosNonConformityRef && !c.qualiosNonConformityRef.startsWith('ATTENTE-MANUELLE')) {
        try {
          const qualiosState = await adapter.getNonConformity(c.qualiosNonConformityRef);
          if (qualiosState && qualiosState.status !== c.status) {
            console.warn(
              `[RECONCILIATION_GAP] Écart détecté pour ${c.portalNumber} (Qualios: ${qualiosState.status} vs Portail: ${c.status})`
            );
            discrepanciesFound++;
          }
        } catch {
          // Ignorer en mode fichier ou hors ligne
        }
      }
    }

    console.log(`[RECONCILIATION] Terminé. Vérifiés : ${complaints.length}, Écarts : ${discrepanciesFound}`);
    return { totalChecked: complaints.length, discrepanciesFound };
  }
}
