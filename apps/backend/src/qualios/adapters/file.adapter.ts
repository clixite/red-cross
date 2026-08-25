import fs from 'fs';
import path from 'path';
import {
  IQualiosPort,
  QualiosDocumentMetadata,
  ComplaintSyncPayload,
  QualiosNonConformityState,
  QualiosChangeEvent,
} from '../qualios.port.js';
import { config } from '../../config.js';

export class QualiosFileAdapter implements IQualiosPort {
  readonly adapterName = 'file' as const;
  private basePath: string;

  constructor() {
    this.basePath = path.resolve(config.qualios.fileExchangePath);
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = ['outbound', 'inbound', 'archive', 'errors'];
    for (const d of dirs) {
      const fullPath = path.join(this.basePath, d);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  async listDocuments(): Promise<QualiosDocumentMetadata[]> {
    return [];
  }

  async getDocument(_reference: string): Promise<QualiosDocumentMetadata | null> {
    return null;
  }

  async createNonConformity(payload: ComplaintSyncPayload, idempotencyKey: string): Promise<{ qualiosRef: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `NC_EXPORT_${payload.portalNumber}_${timestamp}`;
    const targetDir = path.join(this.basePath, 'outbound');

    const csvRow = [
      payload.portalNumber,
      `"${payload.organizationName.replace(/"/g, '""')}"`,
      payload.category,
      payload.criticality,
      `"${payload.description.replace(/"/g, '""')}"`,
      idempotencyKey,
      new Date().toISOString(),
    ].join(';') + '\n';

    const tempFilePath = path.join(targetDir, `${baseFilename}.tmp`);
    const finalFilePath = path.join(targetDir, `${baseFilename}.csv`);
    const doneFilePath = path.join(targetDir, `${baseFilename}.done`);

    // Écriture atomique
    await fs.promises.writeFile(tempFilePath, csvRow, 'utf-8');
    await fs.promises.rename(tempFilePath, finalFilePath);
    // Fichier de contrôle .done
    await fs.promises.writeFile(doneFilePath, `FILES=1\nSIZE=${csvRow.length}\nIDEMPOTENCY_KEY=${idempotencyKey}\n`, 'utf-8');

    const generatedQualiosRef = `NC-BATCH-${payload.portalNumber.replace('SFS-', '')}`;
    return { qualiosRef: generatedQualiosRef };
  }

  async getNonConformity(_qualiosRef: string): Promise<QualiosNonConformityState | null> {
    return null;
  }

  async updateNonConformityStatus(qualiosRef: string, status: string, notes?: string): Promise<void> {
    const baseFilename = `STATUS_UPDATE_${qualiosRef}_${Date.now()}`;
    const targetDir = path.join(this.basePath, 'outbound');
    const content = `${qualiosRef};${status};"${(notes || '').replace(/"/g, '""')}";${new Date().toISOString()}\n`;

    await fs.promises.writeFile(path.join(targetDir, `${baseFilename}.csv`), content, 'utf-8');
    await fs.promises.writeFile(path.join(targetDir, `${baseFilename}.done`), 'OK', 'utf-8');
  }

  async appendComment(_qualiosRef: string, _author: string, _comment: string): Promise<void> {}

  async listChangesSince(_timestamp: Date): Promise<QualiosChangeEvent[]> {
    return [];
  }

  async healthcheck(): Promise<{ isHealthy: boolean; adapter: string; latencyMs: number; details?: string }> {
    try {
      this.ensureDirectories();
      return { isHealthy: true, adapter: 'file', latencyMs: 1, details: `Dépôt local: ${this.basePath}` };
    } catch (err: any) {
      return { isHealthy: false, adapter: 'file', latencyMs: 0, details: err.message };
    }
  }
}
