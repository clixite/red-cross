import {
  IQualiosPort,
  QualiosDocumentMetadata,
  ComplaintSyncPayload,
  QualiosNonConformityState,
  QualiosChangeEvent,
} from '../qualios.port.js';

export class QualiosManualAdapter implements IQualiosPort {
  readonly adapterName = 'manual' as const;

  async listDocuments(): Promise<QualiosDocumentMetadata[]> {
    return [];
  }

  async getDocument(_reference: string): Promise<QualiosDocumentMetadata | null> {
    return null;
  }

  async createNonConformity(payload: ComplaintSyncPayload, _idempotencyKey: string): Promise<{ qualiosRef: string; isManualPending: boolean }> {
    console.log(`[QUALIOS_MANUAL] Réclamation ${payload.portalNumber} placée dans la file d attente manuelle Qualios.`);
    return {
      qualiosRef: `ATTENTE-MANUELLE-${payload.portalNumber}`,
      isManualPending: true,
    };
  }

  async getNonConformity(_qualiosRef: string): Promise<QualiosNonConformityState | null> {
    return null;
  }

  async updateNonConformityStatus(_qualiosRef: string, _status: string, _notes?: string): Promise<void> {}

  async appendComment(_qualiosRef: string, _author: string, _comment: string): Promise<void> {}

  async listChangesSince(_timestamp: Date): Promise<QualiosChangeEvent[]> {
    return [];
  }

  async healthcheck(): Promise<{ isHealthy: boolean; adapter: string; latencyMs: number; details?: string }> {
    return {
      isHealthy: true,
      adapter: 'manual',
      latencyMs: 0,
      details: 'Mode manuel actif : saisie assistée en back-office.',
    };
  }
}
