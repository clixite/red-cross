-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('banque_sang_hospitaliere', 'laboratoire_recherche', 'etablissement_enseignement', 'praticien', 'autre');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('active', 'suspendue', 'archivee');

-- CreateEnum
CREATE TYPE "RoleEnum" AS ENUM ('declarant', 'referent_qualite', 'lecteur', 'agent_reception', 'responsable_qualite', 'administrateur', 'lecteur_direction');

-- CreateEnum
CREATE TYPE "UserStatusEnum" AS ENUM ('invited', 'active', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "LangEnum" AS ENUM ('fr', 'nl', 'en');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('procedure', 'mode_operatoire', 'notice', 'formulaire', 'fiche_technique', 'certificat', 'bulletin_information');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('en_vigueur', 'retire');

-- CreateEnum
CREATE TYPE "ComplaintCat" AS ENUM ('produit_sanguin', 'transport_chaine_du_froid', 'delai_disponibilite', 'analyse_resultat', 'documentation', 'livraison_conditionnement', 'relationnel_service', 'facturation', 'autre');

-- CreateEnum
CREATE TYPE "CriticalityLevel" AS ENUM ('mineure', 'majeure', 'critique');

-- CreateEnum
CREATE TYPE "ComplaintStat" AS ENUM ('brouillon', 'soumise', 'recue', 'en_analyse_recevabilite', 'irrecevable', 'en_investigation', 'information_complementaire_demandee', 'conclue', 'cloturee');

-- CreateEnum
CREATE TYPE "PatientImpactEnum" AS ENUM ('oui', 'non', 'inconnu');

-- CreateEnum
CREATE TYPE "PatientImpactTypo" AS ENUM ('aucun', 'retard_transfusionnel', 'effet_indesirable_receveur', 'reaction_transfusionnelle_grave', 'destruction_produit_sans_impact', 'autre_impact');

-- CreateEnum
CREATE TYPE "BloodGroupEnum" AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- CreateEnum
CREATE TYPE "EventVis" AS ENUM ('interne_sfs', 'partage_client');

-- CreateEnum
CREATE TYPE "OutboxStat" AS ENUM ('pending', 'processing', 'completed', 'failed', 'dead_letter');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "name" TEXT NOT NULL,
    "businessNumber" TEXT,
    "siteName" TEXT,
    "address" TEXT NOT NULL,
    "defaultLanguage" "LangEnum" NOT NULL DEFAULT 'fr',
    "status" "OrgStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "language" "LangEnum" NOT NULL DEFAULT 'fr',
    "roles" "RoleEnum"[] DEFAULT ARRAY['declarant']::"RoleEnum"[],
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "status" "UserStatusEnum" NOT NULL DEFAULT 'invited',
    "invitationToken" TEXT,
    "invitationExpiresAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "consentQualityCharter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "qualiosReference" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleNl" TEXT,
    "titleEn" TEXT,
    "descriptionFr" TEXT,
    "descriptionNl" TEXT,
    "descriptionEn" TEXT,
    "type" "DocType" NOT NULL,
    "version" TEXT NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'en_vigueur',
    "checksum" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_audiences" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "allowedOrgTypes" "OrgType"[],
    "allowedOrgIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedRoles" "RoleEnum"[] DEFAULT ARRAY[]::"RoleEnum"[],

    CONSTRAINT "document_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "portalNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "declarantId" TEXT NOT NULL,
    "entryChannel" TEXT NOT NULL DEFAULT 'portal',
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "declarationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "ComplaintCat" NOT NULL,
    "subCategory" TEXT,
    "declaredCriticality" "CriticalityLevel" NOT NULL,
    "validatedCriticality" "CriticalityLevel",
    "description" TEXT NOT NULL,
    "patientImpact" "PatientImpactEnum" NOT NULL,
    "patientImpactTypology" "PatientImpactTypo" NOT NULL DEFAULT 'aucun',
    "status" "ComplaintStat" NOT NULL DEFAULT 'brouillon',
    "qualiosNonConformityRef" TEXT,
    "slaTargetReceivabilityAt" TIMESTAMP(3),
    "slaTargetFinalResponseAt" TIMESTAMP(3),
    "slaSuspendedAt" TIMESTAMP(3),
    "slaTotalSuspensionHours" INTEGER NOT NULL DEFAULT 0,
    "conclusion" TEXT,
    "correctiveActionsSummary" TEXT,
    "closedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concerned_products" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "donationNumber" TEXT NOT NULL,
    "bloodGroup" "BloodGroupEnum",
    "expirationDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "measuredTemperature" DOUBLE PRECISION,

    CONSTRAINT "concerned_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_events" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "transitionType" TEXT NOT NULL,
    "fromStatus" "ComplaintStat",
    "toStatus" "ComplaintStat" NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorOrganization" TEXT NOT NULL,
    "comment" TEXT,
    "visibility" "EventVis" NOT NULL DEFAULT 'partage_client',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" "RoleEnum" NOT NULL,
    "authorOrganization" TEXT NOT NULL,
    "visibility" "EventVis" NOT NULL DEFAULT 'partage_client',
    "content" TEXT NOT NULL,
    "readByDeclarant" BOOLEAN NOT NULL DEFAULT false,
    "readBySFS" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT,
    "messageId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "antivirusStatus" TEXT NOT NULL DEFAULT 'clean',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satisfaction_surveys" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scoreCsat" INTEGER NOT NULL,
    "verbatim" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "satisfaction_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actorOrgId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "qualiosRef" TEXT,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "payloadTruncated" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_tasks" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStat" NOT NULL DEFAULT 'pending',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "language" "LangEnum" NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_invitationToken_key" ON "users"("invitationToken");

-- CreateIndex
CREATE UNIQUE INDEX "documents_qualiosReference_key" ON "documents"("qualiosReference");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_portalNumber_key" ON "complaints"("portalNumber");

-- CreateIndex
CREATE INDEX "complaints_organizationId_idx" ON "complaints"("organizationId");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_category_idx" ON "complaints"("category");

-- CreateIndex
CREATE INDEX "complaint_events_complaintId_idx" ON "complaint_events"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "satisfaction_surveys_complaintId_key" ON "satisfaction_surveys"("complaintId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "sync_logs_timestamp_idx" ON "sync_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_tasks_idempotencyKey_key" ON "outbox_tasks"("idempotencyKey");

-- CreateIndex
CREATE INDEX "outbox_tasks_status_nextRetryAt_idx" ON "outbox_tasks"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audiences" ADD CONSTRAINT "document_audiences_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_declarantId_fkey" FOREIGN KEY ("declarantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerned_products" ADD CONSTRAINT "concerned_products_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_events" ADD CONSTRAINT "complaint_events_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
