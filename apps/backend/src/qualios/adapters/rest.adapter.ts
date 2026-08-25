import {
  IQualiosPort,
  QualiosDocumentMetadata,
  ComplaintSyncPayload,
  QualiosNonConformityState,
  QualiosChangeEvent,
} from '../qualios.port.js';
import { config } from '../../config.js';

export class QualiosRestAdapter implements IQualiosPort {
  readonly adapterName = 'rest' as const;
  private baseUrl: string;
  private apiKey: string;

  // Circuit Breaker State
  private failureCount = 0;
  private circuitOpenUntil = 0;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_COOLDOWN_MS = 30000;

  constructor() {
    this.baseUrl = config.qualios.baseUrl;
    this.apiKey = config.qualios.apiKey;
  }

  private checkCircuit(): void {
    if (Date.now() < this.circuitOpenUntil) {
      throw new Error(`[QUALIOS_CIRCUIT_OPEN] Disjoncteur actif jusqu'à ${new Date(this.circuitOpenUntil).toISOString()}`);
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    this.circuitOpenUntil = 0;
  }

  private recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + this.CIRCUIT_COOLDOWN_MS;
      console.error(`[QUALIOS_CIRCUIT_BREAKER] Seuil d'erreurs atteint (${this.failureCount}). Disjoncteur ouvert pour ${this.CIRCUIT_COOLDOWN_MS}ms.`);
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    this.checkCircuit();
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        const result = await fn();
        this.recordSuccess();
        return result;
      } catch (err: any) {
        // Si 4xx (hors 429), ne pas réessayer
        if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
          throw err;
        }

        if (attempt >= maxRetries) {
          this.recordFailure();
          throw err;
        }

        // Backoff exponentiel avec jitter
        const baseDelay = Math.pow(2, attempt) * 200;
        const jitter = Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
      }
    }
    throw new Error('Retries exceeded');
  }

  async listDocuments(): Promise<QualiosDocumentMetadata[]> {
    return this.executeWithRetry(async () => {
      const res = await fetch(`${this.baseUrl}/documents`, {
        headers: { 'x-api-key': this.apiKey },
      });
      if (!res.ok) throw new Error(`Qualios HTTP ${res.status}`);
      const data = (await res.json()) as any;
      return (data.items || []).map((item: any) => ({
        ...item,
        applicationDate: new Date(item.applicationDate),
      }));
    });
  }

  async getDocument(reference: string): Promise<QualiosDocumentMetadata | null> {
    return this.executeWithRetry(async () => {
      const res = await fetch(`${this.baseUrl}/documents/${encodeURIComponent(reference)}`, {
        headers: { 'x-api-key': this.apiKey },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Qualios HTTP ${res.status}`);
      const item = (await res.json()) as any;
      return {
        ...item,
        applicationDate: new Date(item.applicationDate),
      };
    });
  }

  async createNonConformity(payload: ComplaintSyncPayload, idempotencyKey: string): Promise<{ qualiosRef: string }> {
    return this.executeWithRetry(async () => {
      const res = await fetch(`${this.baseUrl}/non-conformities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Qualios NC creation failed: HTTP ${res.status} - ${errorBody}`);
      }

      const data = (await res.json()) as any;
      return { qualiosRef: data.qualiosRef };
    });
  }

  async getNonConformity(qualiosRef: string): Promise<QualiosNonConformityState | null> {
    return this.executeWithRetry(async () => {
      const res = await fetch(`${this.baseUrl}/non-conformities/${encodeURIComponent(qualiosRef)}`, {
        headers: { 'x-api-key': this.apiKey },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Qualios HTTP ${res.status}`);
      const data = (await res.json()) as any;
      return {
        qualiosRef: data.qualiosRef,
        status: data.status,
        idempotencyKey: data.idempotencyKey,
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
      };
    });
  }

  async updateNonConformityStatus(qualiosRef: string, status: string, notes?: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const res = await fetch(`${this.baseUrl}/non-conformities/${encodeURIComponent(qualiosRef)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error(`Qualios status update failed: HTTP ${res.status}`);
    });
  }

  async appendComment(qualiosRef: string, author: string, comment: string): Promise<void> {
    console.log(`[QUALIOS_REST] Ajout commentaire sur ${qualiosRef} par ${author}: ${comment.slice(0, 50)}...`);
  }

  async listChangesSince(timestamp: Date): Promise<QualiosChangeEvent[]> {
    return this.executeWithRetry(async () => {
      const res = await fetch(`${this.baseUrl}/changes?since=${encodeURIComponent(timestamp.toISOString())}`, {
        headers: { 'x-api-key': this.apiKey },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as any;
      return data.changes || [];
    });
  }

  async healthcheck(): Promise<{ isHealthy: boolean; adapter: string; latencyMs: number; details?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/api\/v1$/, '')}/health`, { signal: AbortSignal.timeout(3000) });
      const latencyMs = Date.now() - start;
      return { isHealthy: res.ok, adapter: 'rest', latencyMs, details: `HTTP ${res.status}` };
    } catch (err: any) {
      return { isHealthy: false, adapter: 'rest', latencyMs: Date.now() - start, details: err.message };
    }
  }
}
