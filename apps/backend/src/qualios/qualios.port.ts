export interface QualiosDocumentMetadata {
  reference: string;
  version: string;
  title: string;
  type: string;
  status: 'en_vigueur' | 'retire';
  applicationDate: Date;
  checksum: string;
  downloadUrl?: string;
}

export interface ComplaintSyncPayload {
  complaintId: string;
  portalNumber: string;
  category: string;
  criticality: string;
  description: string;
  organizationName: string;
  products?: Array<{
    productCode: string;
    donationNumber: string;
    bloodGroup?: string;
    quantity: number;
    measuredTemperature?: number;
  }>;
}

export interface QualiosNonConformityState {
  qualiosRef: string;
  status: string;
  idempotencyKey?: string;
  updatedAt?: Date;
  conclusion?: string;
}

export interface QualiosChangeEvent {
  qualiosRef: string;
  eventType: 'CREATED' | 'STATUS_CHANGED' | 'DOCUMENT_UPDATED' | 'DOCUMENT_RETIRED';
  timestamp: Date;
  details?: Record<string, any>;
}

export interface IQualiosPort {
  readonly adapterName: 'rest' | 'file' | 'manual';

  // Documents
  listDocuments(sinceRevision?: string, filters?: Record<string, any>): Promise<QualiosDocumentMetadata[]>;
  getDocument(reference: string, version?: string): Promise<QualiosDocumentMetadata | null>;

  // Non-Conformités
  createNonConformity(payload: ComplaintSyncPayload, idempotencyKey: string): Promise<{ qualiosRef: string; isManualPending?: boolean }>;
  getNonConformity(qualiosRef: string): Promise<QualiosNonConformityState | null>;
  updateNonConformityStatus(qualiosRef: string, status: string, notes?: string): Promise<void>;
  appendComment(qualiosRef: string, author: string, comment: string): Promise<void>;
  listChangesSince(timestamp: Date): Promise<QualiosChangeEvent[]>;

  // Santé
  healthcheck(): Promise<{ isHealthy: boolean; adapter: string; latencyMs: number; details?: string }>;
}
