export enum OrganizationType {
  BANQUE_SANG_HOSPITALIERE = 'banque_sang_hospitaliere',
  LABORATOIRE_RECHERCHE = 'laboratoire_recherche',
  ETABLISSEMENT_ENSEIGNEMENT = 'etablissement_enseignement',
  PRATICIEN = 'praticien',
  AUTRE = 'autre',
}

export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDUE = 'suspendue',
  ARCHIVEE = 'archivee',
}

export enum UserRole {
  // Client roles
  DECLARANT = 'declarant',
  REFERENT_QUALITE = 'referent_qualite',
  LECTEUR = 'lecteur',
  // SFS internal roles
  AGENT_RECEPTION = 'agent_reception',
  RESPONSABLE_QUALITE = 'responsable_qualite',
  ADMINISTRATEUR = 'administrateur',
  LECTEUR_DIRECTION = 'lecteur_direction',
}

export enum UserStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum SupportedLanguage {
  FR = 'fr',
  NL = 'nl',
  EN = 'en',
}

export enum DocumentType {
  PROCEDURE = 'procedure',
  MODE_OPERATOIRE = 'mode_operatoire',
  NOTICE = 'notice',
  FORMULAIRE = 'formulaire',
  FICHE_TECHNIQUE = 'fiche_technique',
  CERTIFICAT = 'certificat',
  BULLETIN_INFORMATION = 'bulletin_information',
}

export enum DocumentStatus {
  EN_VIGUEUR = 'en_vigueur',
  RETIRE = 'retire',
}

export enum ComplaintCategory {
  PRODUIT_SANGUIN = 'produit_sanguin',
  TRANSPORT_CHAINE_DU_FROID = 'transport_chaine_du_froid',
  DELAI_DISPONIBILITE = 'delai_disponibilite',
  ANALYSE_RESULTAT = 'analyse_resultat',
  DOCUMENTATION = 'documentation',
  LIVRAISON_CONDITIONNEMENT = 'livraison_conditionnement',
  RELATIONNEL_SERVICE = 'relationnel_service',
  FACTURATION = 'facturation',
  AUTRE = 'autre',
}

export enum ComplaintCriticality {
  MINEURE = 'mineure',
  MAJEURE = 'majeure',
  CRITIQUE = 'critique',
}

export enum ComplaintStatus {
  BROUILLON = 'brouillon',
  SOUMISE = 'soumise',
  RECUE = 'recue',
  EN_ANALYSE_RECEVABILITE = 'en_analyse_recevabilite',
  IRRECEVABLE = 'irrecevable',
  EN_INVESTIGATION = 'en_investigation',
  INFORMATION_COMPLEMENTAIRE_DEMANDEE = 'information_complementaire_demandee',
  CONCLUE = 'conclue',
  CLOTUREE = 'cloturee',
}

export enum PatientImpact {
  OUI = 'oui',
  NON = 'non',
  INCONNU = 'inconnu',
}

export enum PatientImpactTypology {
  AUCUN = 'aucun',
  RETARD_TRANSFUSIONNEL = 'retard_transfusionnel',
  EFFET_INDESIRABLE_RECEVEUR = 'effet_indesirable_receveur',
  REACTION_TRANSFUSIONNELLE_GRAVE = 'reaction_transfusionnelle_grave',
  DESTRUCTION_PRODUIT_SANS_IMPACT = 'destruction_produit_sans_impact',
  AUTRE_IMPACT = 'autre_impact',
}

export enum BloodGroupAboRhD {
  A_POS = 'A+',
  A_NEG = 'A-',
  B_POS = 'B+',
  B_NEG = 'B-',
  AB_POS = 'AB+',
  AB_NEG = 'AB-',
  O_POS = 'O+',
  O_NEG = 'O-',
}

export enum EventVisibility {
  INTERNE_SFS = 'interne_sfs',
  PARTAGE_CLIENT = 'partage_client',
}

export enum QualiosAdapterType {
  REST = 'rest',
  FILE = 'file',
  MANUAL = 'manual',
}

export enum OutboxStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
}
