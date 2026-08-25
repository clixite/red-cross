import {
  OrganizationType,
  OrganizationStatus,
  UserRole,
  UserStatus,
  SupportedLanguage,
  DocumentType,
  DocumentStatus,
  ComplaintCategory,
  ComplaintCriticality,
  ComplaintStatus,
  PatientImpact,
  PatientImpactTypology,
  BloodGroupAboRhD,
  EventVisibility,
  OutboxStatus,
} from './enums.js';

export interface MultilingualText {
  fr: string;
  nl?: string;
  en?: string;
}

export interface OrganizationEntity {
  id: string;
  type: OrganizationType;
  name: string;
  businessNumber?: string;
  siteName?: string;
  address: string;
  defaultLanguage: SupportedLanguage;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserEntity {
  id: string;
  organizationId?: string | null; // null for SFS internal staff
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  language: SupportedLanguage;
  roles: UserRole[];
  mfaEnabled: boolean;
  mfaSecret?: string | null;
  status: UserStatus;
  invitationToken?: string | null;
  invitationExpiresAt?: Date | null;
  lastLoginAt?: Date | null;
  consentQualityCharter: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentEntity {
  id: string;
  qualiosReference: string;
  title: MultilingualText;
  description: MultilingualText;
  type: DocumentType;
  version: string;
  applicationDate: Date;
  status: DocumentStatus;
  checksum: string;
  storageKey: string;
  fileSizeBytes: number;
  mimeType: string;
  lastSyncAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentAudienceEntity {
  id: string;
  documentId: string;
  allowedOrgTypes: OrganizationType[];
  allowedOrgIds?: string[];
  allowedRoles?: UserRole[];
}

export interface ConcernedProductEntity {
  id: string;
  complaintId: string;
  productCode: string;
  donationNumber: string;
  bloodGroup?: BloodGroupAboRhD;
  expirationDate?: Date;
  quantity: number;
  measuredTemperature?: number;
}

export interface ComplaintEntity {
  id: string;
  portalNumber: string; // SFS-YYYY-NNNNN
  organizationId: string;
  declarantId: string;
  entryChannel: 'portal' | 'phone_relay' | 'email_relay';
  incidentDate: Date;
  declarationDate: Date;
  category: ComplaintCategory;
  subCategory?: string;
  declaredCriticality: ComplaintCriticality;
  validatedCriticality?: ComplaintCriticality;
  description: string;
  patientImpact: PatientImpact;
  patientImpactTypology: PatientImpactTypology;
  status: ComplaintStatus;
  qualiosNonConformityRef?: string;
  slaTargetReceivabilityAt?: Date;
  slaTargetFinalResponseAt?: Date;
  slaSuspendedAt?: Date;
  slaTotalSuspensionHours: number;
  conclusion?: string;
  correctiveActionsSummary?: string;
  closedAt?: Date;
  rejectionReason?: string;
  products?: ConcernedProductEntity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplaintEventEntity {
  id: string;
  complaintId: string;
  transitionType: string;
  fromStatus?: ComplaintStatus;
  toStatus: ComplaintStatus;
  authorId: string;
  authorName: string;
  authorOrganization: string;
  comment?: string;
  visibility: EventVisibility;
  createdAt: Date;
}

export interface MessageEntity {
  id: string;
  complaintId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorOrganization: string;
  visibility: EventVisibility;
  content: string;
  readByDeclarant: boolean;
  readBySFS: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface SatisfactionSurveyEntity {
  id: string;
  complaintId: string;
  organizationId: string;
  scoreCsat: number; // 1 to 5
  verbatim?: string;
  reminderSent: boolean;
  respondedAt?: Date;
  createdAt: Date;
}

export interface AuditLogEntity {
  id: string;
  timestamp: Date;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  actorOrgId?: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
}

export interface SyncLogEntity {
  id: string;
  timestamp: Date;
  direction: 'OUTBOUND' | 'INBOUND';
  adapter: string;
  entityType: string;
  entityId: string;
  qualiosRef?: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING';
  latencyMs: number;
  attemptNumber: number;
  payloadTruncated?: string;
  errorMessage?: string;
}

export interface OutboxTaskEntity {
  id: string;
  idempotencyKey: string;
  taskType: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retries: number;
  maxRetries: number;
  nextRetryAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}
