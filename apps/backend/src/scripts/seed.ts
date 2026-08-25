/**
 * Jeu de données de démonstration — Portail Clients Service du Sang
 * Toutes les organisations, personnes, numéros de don et références sont
 * manifestement FICTIFS (démonstration en comité de direction uniquement).
 * Aucune donnée patient. Aucun numéro de don réel.
 */
import { PrismaClient, OrgType, OrgStatus, RoleEnum, LangEnum, DocType, DocStatus, ComplaintCat, CriticalityLevel, ComplaintStat, PatientImpactEnum, PatientImpactTypo, BloodGroupEnum, EventVis } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'DemoPass2025!';

interface DemoUserSeed {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  language: LangEnum;
  roles: RoleEnum[];
  orgIndex?: number;
  mfaEnabled?: boolean;
}

interface DemoOrgSeed {
  name: string;
  type: OrgType;
  businessNumber: string;
  siteName: string;
  address: string;
  defaultLanguage: LangEnum;
}

interface DemoDocSeed {
  ref: string;
  titleFr: string;
  titleNl: string;
  titleEn: string;
  type: DocType;
  version: string;
  applicationDate: string;
  audiences: { orgTypes: OrgType[]; orgIds?: string[]; roles?: RoleEnum[] };
}

const ORGANIZATIONS: DemoOrgSeed[] = [
  { name: 'CHU Fictif de Wallonie', type: OrgType.banque_sang_hospitaliere, businessNumber: 'BE 0789.111.222', siteName: 'Site Principal - Banque de Sang', address: 'Boulevard du Panorama 20, 6000 Charleroi', defaultLanguage: LangEnum.fr },
  { name: 'Hôpital Démo Nord', type: OrgType.banque_sang_hospitaliere, businessNumber: 'BE 0456.222.333', siteName: 'Hôpital Universitaire', address: 'Rue de la Paix 10, 9000 Gand', defaultLanguage: LangEnum.nl },
  { name: 'Clinique Universitaire de Bruxelles-Démo', type: OrgType.banque_sang_hospitaliere, businessNumber: 'BE 0478.333.444', siteName: 'Campus Erasme-Démo', address: 'Route de Lennik 808, 1070 Bruxelles', defaultLanguage: LangEnum.fr },
  { name: 'AZ Fictief Antwerpen', type: OrgType.banque_sang_hospitaliere, businessNumber: 'BE 0789.444.555', siteName: 'AZ Antwerpen Ziekenhuis', address: 'Lindenstraat 25, 2018 Antwerpen', defaultLanguage: LangEnum.nl },
  { name: 'Centre Hospitalier Namur-Démo', type: OrgType.banque_sang_hospitaliere, businessNumber: 'BE 0409.555.666', siteName: 'CHR Namur - Bloc Transfusionnel', address: 'Avenue Albert 1er 185, 5000 Namur', defaultLanguage: LangEnum.fr },
  { name: 'Institut de Recherche Transfusionnelle Labo-Démo', type: OrgType.laboratoire_recherche, businessNumber: 'BE 0786.666.777', siteName: 'Laboratoire Recherche', address: 'Rue des Sciences 3, 1348 Louvain-la-Neuve', defaultLanguage: LangEnum.fr },
  { name: 'Plateforme Biomédicale Gembloux', type: OrgType.laboratoire_recherche, businessNumber: 'BE 0755.777.888', siteName: 'Unité Recherche Plasma', address: 'Chaussée de Namur 45, 5030 Gembloux', defaultLanguage: LangEnum.fr },
  { name: 'Université Libre Fictive de Bruxelles', type: OrgType.etablissement_enseignement, businessNumber: 'BE 0412.888.999', siteName: 'Faculté de Médecine - Démo', address: 'Avenue du Campus 1, 1050 Bruxelles', defaultLanguage: LangEnum.fr },
  { name: 'Haute École de Technologie Médicale de Liège', type: OrgType.etablissement_enseignement, businessNumber: 'BE 0789.999.000', siteName: 'Département Technologie Biomédicale', address: 'Quai Gloesener 8, 4020 Liège', defaultLanguage: LangEnum.fr },
  { name: 'Cabinet Médical Dr. Fictif', type: OrgType.praticien, businessNumber: 'BE 0789.101.112', siteName: 'Cabinet Transfusion Ambulatoire', address: 'Rue du Médecin 14, 4000 Liège', defaultLanguage: LangEnum.fr },
  { name: 'Centre de Dialyse Satellite Charleroi-Démo', type: OrgType.praticien, businessNumber: 'BE 0478.121.314', siteName: 'Unité Dialyse & Transfusion', address: 'Chaussée de Gilly 200, 6061 Charleroi', defaultLanguage: LangEnum.fr },
  { name: 'Banque de Tissus & Thérapies Cellulaires Fictive', type: OrgType.autre, businessNumber: 'BE 0405.151.617', siteName: 'Site Cellules Souches', address: 'Allée des Greffes 2, 3000 Louvain', defaultLanguage: LangEnum.nl },
];

const SFS_USERS: DemoUserSeed[] = [
  { email: 'admin@service-du-sang.be', firstName: 'Claire', lastName: 'Administration', jobTitle: 'Administratrice Système & Qualité', language: LangEnum.fr, roles: [RoleEnum.administrateur] },
  { email: 'responsable.qualite@service-du-sang.be', firstName: 'Jean', lastName: 'Qualite', jobTitle: 'Responsable Qualité & Hémovigilance', language: LangEnum.fr, roles: [RoleEnum.responsable_qualite] },
  { email: 'reception@service-du-sang.be', firstName: 'Sophie', lastName: 'Reception', jobTitle: 'Agente de Réception des Déclarations', language: LangEnum.fr, roles: [RoleEnum.agent_reception] },
  { email: 'direction@service-du-sang.be', firstName: 'Marc', lastName: 'Direction', jobTitle: 'Directeur Qualité', language: LangEnum.fr, roles: [RoleEnum.lecteur_direction] },
  { email: 'agent2@service-du-sang.be', firstName: 'Eva', lastName: 'Vermeulen', jobTitle: 'Agent Réception NL', language: LangEnum.nl, roles: [RoleEnum.agent_reception] },
];

const CLIENT_USERS: DemoUserSeed[] = [
  // CHU Fictif de Wallonie (0)
  { email: 'declarant@chu-liege.be', firstName: 'Alain', lastName: 'Dupont', jobTitle: 'Technologue de Laboratoire Médical', language: LangEnum.fr, roles: [RoleEnum.declarant], orgIndex: 0 },
  { email: 'qualite@chu-liege.be', firstName: 'Valérie', lastName: 'Dubois', jobTitle: 'Référente Qualité Transfusionnelle', language: LangEnum.fr, roles: [RoleEnum.referent_qualite], orgIndex: 0 },
  { email: 'sophie.tlm@chu-liege.be', firstName: 'Sophie', lastName: 'Lambert', jobTitle: 'Infirmière Responsable de Banque', language: LangEnum.fr, roles: [RoleEnum.declarant], orgIndex: 0 },
  // Hôpital Démo Nord (1)
  { email: 'declarant@hopital-nord.be', firstName: 'Pieter', lastName: 'Peeters', jobTitle: 'Hoofd Bloedbank', language: LangEnum.nl, roles: [RoleEnum.referent_qualite], orgIndex: 1 },
  { email: 'lien.vandenberg@hopital-nord.be', firstName: 'Lien', lastName: 'Vandenberg', jobTitle: 'Verpleegkundige', language: LangEnum.nl, roles: [RoleEnum.declarant], orgIndex: 1 },
  // Clinique Universitaire de Bruxelles-Démo (2)
  { email: 'declarant@clinique-bxl.be', firstName: 'Fatima', lastName: 'Benali', jobTitle: 'Pharmacienne Hospitalière', language: LangEnum.fr, roles: [RoleEnum.declarant], orgIndex: 2 },
  { email: 'referent@clinique-bxl.be', firstName: 'Luc', lastName: 'Moreau', jobTitle: 'Pharmacien-chef', language: LangEnum.fr, roles: [RoleEnum.referent_qualite], orgIndex: 2 },
  // AZ Fictief Antwerpen (3)
  { email: 'declarant@az-antwerpen.be', firstName: 'Katrien', lastName: 'Janssens', jobTitle: 'Apotheker', language: LangEnum.nl, roles: [RoleEnum.declarant], orgIndex: 3 },
  // Centre Hospitalier Namur-Démo (4)
  { email: 'declarant@chr-namur.be', firstName: 'Thomas', lastName: 'Renard', jobTitle: 'Biologiste Clinicien', language: LangEnum.fr, roles: [RoleEnum.declarant], orgIndex: 4 },
  { email: 'referent@chr-namur.be', firstName: 'Isabelle', lastName: 'Wauthier', jobTitle: 'Référente Qualité', language: LangEnum.fr, roles: [RoleEnum.referent_qualite], orgIndex: 4 },
  // Institut de Recherche Transfusionnelle Labo-Démo (5)
  { email: 'recherche@labo-transfusion.be', firstName: 'Dr. Nicolas', lastName: 'Franck', jobTitle: 'Chercheur Senior', language: LangEnum.fr, roles: [RoleEnum.declarant], orgIndex: 5 },
  // Plateforme Biomédicale Gembloux (6)
  { email: 'contact@plateforme-gembloux.be', firstName: 'Hélène', lastName: 'Devos', jobTitle: 'Ingénieure Biomédicale', language: LangEnum.fr, roles: [RoleEnum.declarant], orgIndex: 6 },
  // Université Libre Fictive de Bruxelles (7)
  { email: 'lecteur@univ-bruxelles.be', firstName: 'Camille', lastName: 'Lemaire', jobTitle: 'Maître de Conférences en Transfusion', language: LangEnum.fr, roles: [RoleEnum.lecteur], orgIndex: 7 },
  { email: 'prof.transfusion@univ-bruxelles.be', firstName: 'Vincent', lastName: 'Herman', jobTitle: 'Professeur Hémobiologie', language: LangEnum.fr, roles: [RoleEnum.declarant], orgIndex: 7 },
  // Haute École de Technologie Médicale de Liège (8)
  { email: 'didactique@helmo-liege.be', firstName: 'Anne', lastName: 'Collard', jobTitle: 'Coordinatrice Pédagogique', language: LangEnum.fr, roles: [RoleEnum.lecteur], orgIndex: 8 },
  // Cabinet Médical Dr. Fictif (9)
  { email: 'dr.fictif@cabinet.be', firstName: 'Dr.', lastName: 'Fictif', jobTitle: 'Médecin Transfusionniste', language: LangEnum.fr, roles: [RoleEnum.declarant], orgIndex: 9 },
  // Centre de Dialyse Satellite Charleroi-Démo (10)
  { email: 'dialyse@charleroi-demo.be', firstName: 'Sarah', lastName: 'Nkosi', jobTitle: 'Infirmière Chef Unité Dialyse', language: LangEnum.fr, roles: [RoleEnum.declarant], orgIndex: 10 },
  // Banque de Tissus & Thérapies Cellulaires Fictive (11)
  { email: 'cellules@tissus-demo.be', firstName: 'Wouter', lastName: 'De Smet', jobTitle: 'Lab Manager Cellulaire', language: LangEnum.nl, roles: [RoleEnum.declarant], orgIndex: 11 },
];

const DOCUMENTS: DemoDocSeed[] = [
  { ref: 'SFS-QUAL-PR001', titleFr: 'Procédure de commande et délivrance des PSL en urgence vitale', titleNl: 'Procedure voor bestelling en aflevering van PSL in levensbedreigende noodsituaties', titleEn: 'Procedure for ordering and issuing blood components in vital emergencies', type: DocType.procedure, version: '4.0', applicationDate: '2024-01-15', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-PR002', titleFr: 'Procédure de gestion documentaire Qualios', titleNl: 'Procedure voor documentbeheer Qualios', titleEn: 'Qualios document management procedure', type: DocType.procedure, version: '3.2', applicationDate: '2024-03-01', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere, OrgType.laboratoire_recherche] } },
  { ref: 'SFS-QUAL-PR003', titleFr: 'Procédure de gestion des réclamations et non-conformités', titleNl: 'Procedure voor klachten- en afwijkingenbeheer', titleEn: 'Complaint and non-conformity management procedure', type: DocType.procedure, version: '5.1', applicationDate: '2024-02-10', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-MO010', titleFr: 'Mode opératoire de contrôle qualité des CGR à la réception', titleNl: 'Werkwijze kwaliteitscontrole van erytrocytenconcentraten bij ontvangst', titleEn: 'Standard operating procedure for quality control of RBC upon reception', type: DocType.mode_operatoire, version: '2.4', applicationDate: '2024-04-05', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-MO012', titleFr: 'Mode opératoire de réception et contrôle de conformité des PSL', titleNl: 'Werkwijze ontvangst en conformiteitscontrole van PSL', titleEn: 'SOP for reception and conformity check of blood components', type: DocType.mode_operatoire, version: '2.1', applicationDate: '2023-11-01', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-MO015', titleFr: 'Mode opératoire de gestion de la chaîne du froid en transport', titleNl: 'Werkwijze beheer van de koudeketen tijdens transport', titleEn: 'SOP for cold chain management during transport', type: DocType.mode_operatoire, version: '3.0', applicationDate: '2024-06-15', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-NT001', titleFr: 'Notice produit : Concentré de Globules Rouges déleucocyté', titleNl: 'Productfiche: Gedeleukocyteerd erytrocytenconcentraat', titleEn: 'Product notice: Leucodepleted Red Blood Cells', type: DocType.notice, version: '7.0', applicationDate: '2024-01-20', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-NT002', titleFr: 'Notice produit : Mélange de Concentrés de Plaquettes', titleNl: 'Productfiche: Plaatjesconcentraat', titleEn: 'Product notice: Pooled Platelet Concentrate', type: DocType.notice, version: '6.2', applicationDate: '2024-01-20', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-NT003', titleFr: 'Notice produit : Plasma Frais Congelé', titleNl: 'Productfiche: Vers Bevroren Plasma', titleEn: 'Product notice: Fresh Frozen Plasma', type: DocType.notice, version: '5.8', applicationDate: '2024-01-20', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-FM001', titleFr: 'Formulaire de déclaration d incident transfusionnel (référence interne)', titleNl: 'Formulier melding transfusie-incident', titleEn: 'Transfusion incident report form', type: DocType.formulaire, version: '4.0', applicationDate: '2024-02-01', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-FM002', titleFr: 'Formulaire de retour de produit non conforme', titleNl: 'Formulier retour van afwijkend product', titleEn: 'Non-conforming product return form', type: DocType.formulaire, version: '2.3', applicationDate: '2024-02-15', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-FT001', titleFr: 'Fiche technique : conservation et péremption des PSL', titleNl: 'Technische fiche: bewaring en vervaldatum van PSL', titleEn: 'Technical sheet: storage and expiry of blood components', type: DocType.fiche_technique, version: '3.1', applicationDate: '2024-03-10', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere, OrgType.laboratoire_recherche] } },
  { ref: 'SFS-QUAL-FT002', titleFr: 'Fiche technique : analyse immuno-hématologique et groupage ABO-RhD', titleNl: 'Technische fiche: immuno-hematologische analyse en ABO-RhD groepering', titleEn: 'Technical sheet: immunohematology testing and ABO-RhD grouping', type: DocType.fiche_technique, version: '5.0', applicationDate: '2024-04-01', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-CT001', titleFr: 'Certificat de qualification du site de production (version annuelle)', titleNl: 'Kwalificatiecertificaat productiesite', titleEn: 'Production site qualification certificate', type: DocType.certificat, version: '2024.1', applicationDate: '2024-01-05', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere, OrgType.laboratoire_recherche, OrgType.autre] } },
  { ref: 'SFS-QUAL-BI001', titleFr: 'Bulletin d information : nouveaux critères de sélection des donneurs', titleNl: 'Informatiebulletin: nieuwe donorselectiecriteria', titleEn: 'Information bulletin: new donor eligibility criteria', type: DocType.bulletin_information, version: '1.2', applicationDate: '2024-05-01', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere, OrgType.praticien] } },
  { ref: 'SFS-QUAL-BI002', titleFr: 'Bulletin d information : rappel de lot plaquettes (mesure préventive)', titleNl: 'Informatiebulletin: terugroepactie plaatjes (preventieve maatregel)', titleEn: 'Information bulletin: platelet lot recall (preventive measure)', type: DocType.bulletin_information, version: '1.0', applicationDate: '2024-07-01', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-PR101', titleFr: 'Procédure de demande d intervention pédagogique et visite du centre', titleNl: 'Procedure aanvraag pedagogische interventie en centrumbezoek', titleEn: 'Procedure for educational visits and center tours', type: DocType.procedure, version: '2.0', applicationDate: '2024-02-20', audiences: { orgTypes: [OrgType.etablissement_enseignement] } },
  { ref: 'SFS-QUAL-SP101', titleFr: 'Support pédagogique : le don de sang expliqué aux étudiants', titleNl: 'Lesmateriaal: bloeddonatie uitgelegd aan studenten', titleEn: 'Educational material: blood donation explained to students', type: DocType.mode_operatoire, version: '1.5', applicationDate: '2024-01-25', audiences: { orgTypes: [OrgType.etablissement_enseignement] } },
  { ref: 'SFS-QUAL-CV001', titleFr: 'Convention type : fourniture de produits à usage non thérapeutique (recherche)', titleNl: 'Modelovereenkomst: levering van producten voor niet-therapeutisch gebruik', titleEn: 'Model agreement: supply of products for non-therapeutic use (research)', type: DocType.formulaire, version: '3.4', applicationDate: '2024-03-01', audiences: { orgTypes: [OrgType.laboratoire_recherche] } },
  { ref: 'SFS-QUAL-FT102', titleFr: 'Fiche technique : produits plasmatiques à usage de recherche', titleNl: 'Technische fiche: plasmaderivaten voor onderzoeksdoeleinden', titleEn: 'Technical sheet: plasma products for research purposes', type: DocType.fiche_technique, version: '2.2', applicationDate: '2024-03-15', audiences: { orgTypes: [OrgType.laboratoire_recherche] } },
  { ref: 'SFS-QUAL-BI103', titleFr: 'Bulletin d information : référentiel clinique transfusion sanguine 2024', titleNl: 'Informatiebulletin: klinische richtlijn bloedtransfusie 2024', titleEn: 'Information bulletin: clinical transfusion guidelines 2024', type: DocType.bulletin_information, version: '2024.2', applicationDate: '2024-06-01', audiences: { orgTypes: [OrgType.praticien, OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-RT001', titleFr: 'Document retiré : ancienne notice produit CGR (remplacée par NT001 v7)', titleNl: 'Ingetrokken document: oude productfiche EC (vervangen door NT001 v7)', titleEn: 'Retired document: former RBC product notice (replaced by NT001 v7)', type: DocType.notice, version: '6.1', applicationDate: '2022-05-01', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  // --- Documents complémentaires (total cible ~40) ---
  { ref: 'SFS-QUAL-PR004', titleFr: 'Procédure de validation des commandes de groupes rares', titleNl: 'Procedure validatie bestellingen zeldzame bloedgroepen', titleEn: 'Procedure for validating rare blood group orders', type: DocType.procedure, version: '2.2', applicationDate: '2024-03-20', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-PR005', titleFr: 'Procédure de traçabilité des produits en cours de distribution', titleNl: 'Procedure traceerbaarheid producten tijdens distributie', titleEn: 'Procedure for traceability of products during distribution', type: DocType.procedure, version: '3.0', applicationDate: '2024-04-10', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-MO020', titleFr: 'Mode opératoire de contrôle bactériologique des plaquettes', titleNl: 'Werkwijze bacteriologische controle van plaatjes', titleEn: 'SOP for bacterial screening of platelets', type: DocType.mode_operatoire, version: '4.1', applicationDate: '2024-05-01', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-MO025', titleFr: 'Mode opératoire de gestion des incidents de chaîne du froid', titleNl: 'Werkwijze beheer koudeketenincidenten', titleEn: 'SOP for cold chain incident management', type: DocType.mode_operatoire, version: '1.8', applicationDate: '2024-05-20', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-NT010', titleFr: 'Notice produit : concentré de granulocytes', titleNl: 'Productfiche: granulocytenconcentraat', titleEn: 'Product notice: granulocyte concentrate', type: DocType.notice, version: '2.0', applicationDate: '2024-06-01', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-FM010', titleFr: 'Formulaire de demande de recherche de phénotype étendu', titleNl: 'Formulier aanvraag uitgebreide fenotypering', titleEn: 'Extended phenotyping request form', type: DocType.formulaire, version: '1.4', applicationDate: '2024-04-15', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-FT010', titleFr: 'Fiche technique : groupe rare et banque de sang rare', titleNl: 'Technische fiche: zeldzame bloedgroep en zeldzamebloedgroepenbank', titleEn: 'Technical sheet: rare blood group and rare blood bank', type: DocType.fiche_technique, version: '2.5', applicationDate: '2024-06-15', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere, OrgType.praticien] } },
  { ref: 'SFS-QUAL-BI010', titleFr: 'Bulletin d information : procédure de rappel de lot harmonisée', titleNl: 'Informatiebulletin: geharmoniseerde terugroepingsprocedure', titleEn: 'Information bulletin: harmonized lot recall procedure', type: DocType.bulletin_information, version: '1.1', applicationDate: '2024-07-15', audiences: { orgTypes: [OrgType.banque_sang_hospitaliere, OrgType.autre] } },
  { ref: 'SFS-QUAL-PR110', titleFr: 'Procédure de commande de plasma pour fractionnement', titleNl: 'Procedure bestelling plasma voor fractionering', titleEn: 'Procedure for ordering plasma for fractionation', type: DocType.procedure, version: '2.0', applicationDate: '2024-04-01', audiences: { orgTypes: [OrgType.laboratoire_recherche] } },
  { ref: 'SFS-QUAL-FT110', titleFr: 'Fiche technique : aliquots et validation analytique en recherche', titleNl: 'Technische fiche: aliquots en analytische validatie onderzoek', titleEn: 'Technical sheet: aliquots and analytical validation for research', type: DocType.fiche_technique, version: '1.9', applicationDate: '2024-05-05', audiences: { orgTypes: [OrgType.laboratoire_recherche] } },
  { ref: 'SFS-QUAL-SP110', titleFr: 'Support pédagogique : parcours de la poche de sang, du donneur au patient', titleNl: 'Lesmateriaal: het traject van een zak bloed van donor tot patiënt', titleEn: 'Educational material: blood unit journey from donor to patient', type: DocType.mode_operatoire, version: '3.0', applicationDate: '2024-02-15', audiences: { orgTypes: [OrgType.etablissement_enseignement] } },
  { ref: 'SFS-QUAL-SP111', titleFr: 'Support pédagogique : groupes sanguins et compatibilité', titleNl: 'Lesmateriaal: bloedgroepen en compatibiliteit', titleEn: 'Educational material: blood groups and compatibility', type: DocType.mode_operatoire, version: '2.1', applicationDate: '2024-02-15', audiences: { orgTypes: [OrgType.etablissement_enseignement] } },
  { ref: 'SFS-QUAL-FM110', titleFr: 'Formulaire de demande d intervention en établissement', titleNl: 'Formulier aanvraag interventie in instelling', titleEn: 'Institution intervention request form', type: DocType.formulaire, version: '1.2', applicationDate: '2024-03-10', audiences: { orgTypes: [OrgType.etablissement_enseignement] } },
  { ref: 'SFS-QUAL-CV110', titleFr: 'Convention type : collaboration pédagogique avec établissements', titleNl: 'Modelovereenkomst: pedagogische samenwerking', titleEn: 'Model agreement: educational collaboration', type: DocType.formulaire, version: '2.3', applicationDate: '2024-03-20', audiences: { orgTypes: [OrgType.etablissement_enseignement] } },
  { ref: 'SFS-QUAL-BI110', titleFr: 'Bulletin d information : nouveaux marqueurs de dépistage', titleNl: 'Informatiebulletin: nieuwe screeningsmarkers', titleEn: 'Information bulletin: new screening markers', type: DocType.bulletin_information, version: '2024.3', applicationDate: '2024-08-01', audiences: { orgTypes: [OrgType.praticien, OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-FT115', titleFr: 'Fiche technique : prise en charge transfusionnelle du patient drépanocytaire', titleNl: 'Technische fiche: transfusiezorg sikkelcelpatiënt', titleEn: 'Technical sheet: transfusion care for sickle cell patients', type: DocType.fiche_technique, version: '4.0', applicationDate: '2024-07-01', audiences: { orgTypes: [OrgType.praticien, OrgType.banque_sang_hospitaliere] } },
  { ref: 'SFS-QUAL-PR120', titleFr: 'Procédure de gestion des produits de thérapies cellulaires', titleNl: 'Procedure beheer celtherapieproducten', titleEn: 'Procedure for cellular therapy product management', type: DocType.procedure, version: '1.5', applicationDate: '2024-05-15', audiences: { orgTypes: [OrgType.autre] } },
];

// -----------------------------------------------------------------------------
// Données de réclamations (60 réclamations sur 14 mois)
// -----------------------------------------------------------------------------
interface ComplaintSeed {
  orgIndex: number;
  declarantEmail: string;
  category: ComplaintCat;
  criticality: CriticalityLevel;
  status: ComplaintStat;
  monthsAgo: number;
  description: string;
  patientImpact: PatientImpactEnum;
  typology: PatientImpactTypo;
  products?: { code: string; din: string; group: BloodGroupEnum; temp?: number }[];
  rejectionReason?: string;
  conclusion?: string;
  correctiveActions?: string;
  qualiosRef?: string;
  messageExchange?: { from: 'SFS' | 'CLIENT'; text: string }[];
}

const COMPLAINTS: ComplaintSeed[] = [
  // ---- Période ancienne (clôturées / conclues) ----
  { orgIndex: 0, declarantEmail: 'declarant@chu-liege.be', category: ComplaintCat.produit_sanguin, criticality: CriticalityLevel.critique, status: ComplaintStat.cloturee, monthsAgo: 13, description: 'Poche de CGR livrée hors température : constat 12.8°C à la réception. Numéro de don enregistré. La chaîne du froid a été rompue pendant le transport.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.destruction_produit_sans_impact, products: [{ code: 'E0388V00', din: 'BE999925000001', group: BloodGroupEnum.O_POS, temp: 12.8 }], conclusion: 'Non-conformité confirmée : rupture de chaîne du froid chez le transporteur externe. Poche détruite conformément à la procédure. Mesure corrective : audit du transporteur et traçabilité des relevés de température.', correctiveActions: 'Changement de prestataire logistique + enregistreurs de température connectés.', qualiosRef: 'NC-2024-0128' },
  { orgIndex: 1, declarantEmail: 'declarant@hopital-nord.be', category: ComplaintCat.delai_disponibilite, criticality: CriticalityLevel.majeure, status: ComplaintStat.cloturee, monthsAgo: 12, description: 'Délai de livraison de 4h30 pour une commande urgente de concentrés plaquettaires (norme interne 2h). Le patient a dû attendre la transfusion.', patientImpact: PatientImpactEnum.oui, typology: PatientImpactTypo.retard_transfusionnel, conclusion: 'Cause identifiée : indisponibilité du véhicule de garde. Procédure de déclenchement du second véhicule activée.', correctiveActions: 'Plan de continuité transport avec second véhicule de réserve.', qualiosRef: 'NC-2024-0157' },
  { orgIndex: 2, declarantEmail: 'declarant@clinique-bxl.be', category: ComplaintCat.analyse_resultat, criticality: CriticalityLevel.majeure, status: ComplaintStat.cloturee, monthsAgo: 11, description: 'Résultat de groupage ABO-RhD non conforme à l antériorité du patient : incohérence entre le résultat portail et le dossier. Investigation demandée.', patientImpact: PatientImpactEnum.oui, typology: PatientImpactTypo.reaction_transfusionnelle_grave, conclusion: 'Erreur de saisie au niveau du laboratoire demandeur (inversion d étiquettes). Le résultat initial du Service du Sang était correct.', correctiveActions: 'Double vérification informatique des échantillons + formation du personnel.', qualiosRef: 'NC-2024-0193' },
  { orgIndex: 0, declarantEmail: 'qualite@chu-liege.be', category: ComplaintCat.transport_chaine_du_froid, criticality: CriticalityLevel.majeure, status: ComplaintStat.cloturee, monthsAgo: 10, description: 'Deux poches de plasma frais congelé reçues avec un début de décongélation en surface. Contrôle visuel à la réception.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.destruction_produit_sans_impact, products: [{ code: 'E0799V00', din: 'BE999925000007', group: BloodGroupEnum.AB_POS, temp: -8 }], conclusion: 'Transport conforme à la réglementation mais délai de livraison dépassé. Mesure : renforcement du conditionnement isotherme.', correctiveActions: 'Conditionnement isotherme renforcé pour les commandes longues distances.', qualiosRef: 'NC-2024-0211' },
  { orgIndex: 3, declarantEmail: 'declarant@az-antwerpen.be', category: ComplaintCat.livraison_conditionnement, criticality: CriticalityLevel.mineure, status: ComplaintStat.cloturee, monthsAgo: 9, description: 'Emballage extérieur endommagé lors de la livraison. Les poches internes sont intactes. Signalement à titre préventif.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun, conclusion: 'Poche conforme, dommage purement cosmétique de l emballage tertiaire.', qualiosRef: 'NC-2024-0255' },
  { orgIndex: 4, declarantEmail: 'declarant@chr-namur.be', category: ComplaintCat.produit_sanguin, criticality: CriticalityLevel.critique, status: ComplaintStat.cloturee, monthsAgo: 8, description: 'Hématocrite anormalement bas constaté sur un CGR en contrôle qualité à la réception. Deux unités concernées.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.destruction_produit_sans_impact, products: [{ code: 'E0388V00', din: 'BE999925000021', group: BloodGroupEnum.O_NEG, temp: 4.2 }, { code: 'E0388V00', din: 'BE999925000022', group: BloodGroupEnum.O_NEG, temp: 4.5 }], conclusion: 'Investigation approfondie : anomalie liée à un don particulier (donneur faible hématocrite). Non-conformité de prélèvement identifiée.', correctiveActions: 'Vérification renforcée des seuils d éligibilité au don.', qualiosRef: 'NC-2024-0298' },
  { orgIndex: 5, declarantEmail: 'recherche@labo-transfusion.be', category: ComplaintCat.facturation, criticality: CriticalityLevel.mineure, status: ComplaintStat.cloturee, monthsAgo: 8, description: 'Erreur de facturation sur la convention de fourniture de plasma à usage de recherche : double facturation du lot.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun, conclusion: 'Erreur de facturation interne confirmée. Avoir émis. Processus corrigé.', correctiveActions: 'Contrôle automatique des doublons de facturation.', qualiosRef: 'NC-2024-0310' },
  { orgIndex: 7, declarantEmail: 'prof.transfusion@univ-bruxelles.be', category: ComplaintCat.documentation, criticality: CriticalityLevel.mineure, status: ComplaintStat.cloturee, monthsAgo: 7, description: 'Le support pédagogique téléchargé mentionne une information obsolète sur les critères de sélection des donneurs.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun, conclusion: 'Document mis à jour et republié. La version obsolète a été retirée du portail.', correctiveActions: 'Revue semestrielle des supports pédagogiques.', qualiosRef: 'NC-2024-0367' },

  // ---- Période intermédiaire (conclues, en investigation, irrecevables) ----
  { orgIndex: 0, declarantEmail: 'sophie.tlm@chu-liege.be', category: ComplaintCat.produit_sanguin, criticality: CriticalityLevel.critique, status: ComplaintStat.conclue, monthsAgo: 6, description: 'Réaction transfusionnelle chez un receveur après transfusion de plaquettes. Retour du produit et investigation complète demandée.', patientImpact: PatientImpactEnum.oui, typology: PatientImpactTypo.effet_indesirable_receveur, products: [{ code: 'E3845V00', din: 'BE999925000033', group: BloodGroupEnum.A_POS, temp: 21 }], conclusion: 'Conforme à la déclaration : suspicion de réaction allergique grade 2. Bactériologie des poches négative. Dossier transmis à l hémovigilance.', correctiveActions: 'Surveillance renforcée des plaquettes et suivi hémovigilance.', qualiosRef: 'NC-2025-0034' },
  { orgIndex: 1, declarantEmail: 'lien.vandenberg@hopital-nord.be', category: ComplaintCat.transport_chaine_du_froid, criticality: CriticalityLevel.majeure, status: ComplaintStat.en_investigation, monthsAgo: 5, description: 'Température de transport non enregistrée pour une livraison de 3 poches de CGR. Absence de traçabilité du relevé.', patientImpact: PatientImpactEnum.inconnu, typology: PatientImpactTypo.autre_impact, products: [{ code: 'E0388V00', din: 'BE999925000044', group: BloodGroupEnum.B_NEG, temp: 6.5 }], qualiosRef: 'NC-2025-0089' },
  { orgIndex: 2, declarantEmail: 'referent@clinique-bxl.be', category: ComplaintCat.delai_disponibilite, criticality: CriticalityLevel.majeure, status: ComplaintStat.conclue, monthsAgo: 5, description: 'Rupture de stock temporaire de concentrés plaquettaires AB+ en urgence vitale. Dépannage inter-hospitalier nécessaire.', patientImpact: PatientImpactEnum.oui, typology: PatientImpactTypo.retard_transfusionnel, conclusion: 'Rupture liée à un pic de consommation exceptionnel. Mesure : optimisation des stocks de sécurité.', correctiveActions: 'Augmentation du stock de sécurité plaquettes AB+.', qualiosRef: 'NC-2025-0102' },
  { orgIndex: 4, declarantEmail: 'referent@chr-namur.be', category: ComplaintCat.relationnel_service, criticality: CriticalityLevel.mineure, status: ComplaintStat.en_investigation, monthsAgo: 4, description: 'Délai de réponse téléphonique jugé excessif au standard de la banque de sang lors d une demande d information sur un groupe rare.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun, qualiosRef: 'NC-2025-0148' },
  { orgIndex: 0, declarantEmail: 'qualite@chu-liege.be', category: ComplaintCat.produit_sanguin, criticality: CriticalityLevel.mineure, status: ComplaintStat.irrecevable, monthsAgo: 4, description: 'Réclamation concernant une poche livrée il y a plus de 8 mois sans signalement préalable. Aucun élément de traçabilité fourni.', patientImpact: PatientImpactEnum.inconnu, typology: PatientImpactTypo.aucun, products: [{ code: 'E0388V00', din: 'BE999925000055', group: BloodGroupEnum.A_NEG }], rejectionReason: 'Délai de signalement dépassé (8 mois) sans justification documentée. Réclamation hors délais opposables du contrat qualité.' },
  { orgIndex: 3, declarantEmail: 'declarant@az-antwerpen.be', category: ComplaintCat.analyse_resultat, criticality: CriticalityLevel.majeure, status: ComplaintStat.en_investigation, monthsAgo: 3, description: 'Discordance de phénotype RhD entre deux résultats consécutifs pour le même échantillon de référence.', patientImpact: PatientImpactEnum.inconnu, typology: PatientImpactTypo.autre_impact, qualiosRef: 'NC-2025-0196' },
  { orgIndex: 6, declarantEmail: 'contact@plateforme-gembloux.be', category: ComplaintCat.documentation, criticality: CriticalityLevel.mineure, status: ComplaintStat.conclue, monthsAgo: 3, description: 'La fiche technique des produits plasmatiques de recherche ne mentionne pas les nouvelles modalités de conditionnement.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun, conclusion: 'Fiche technique mise à jour et republiée en v2.3.', correctiveActions: 'Publication v2.3 synchronisée.', qualiosRef: 'NC-2025-0221' },
  { orgIndex: 8, declarantEmail: 'didactique@helmo-liege.be', category: ComplaintCat.relationnel_service, criticality: CriticalityLevel.mineure, status: ComplaintStat.irrecevable, monthsAgo: 3, description: 'Demande de remboursement de frais de déplacement pour une visite pédagogique. Hors périmètre du portail qualité.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun, rejectionReason: 'Demande administrative hors périmètre de la plateforme. Redirigée vers le service des relations extérieures.' },
  { orgIndex: 9, declarantEmail: 'dr.fictif@cabinet.be', category: ComplaintCat.produit_sanguin, criticality: CriticalityLevel.critique, status: ComplaintStat.conclue, monthsAgo: 2, description: 'Poche de plasma livrée avec une étiquette partiellement illisible (n° de lot). Vérification de traçabilité demandée.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun, products: [{ code: 'E0799V00', din: 'BE999925000066', group: BloodGroupEnum.O_POS, temp: -25 }], conclusion: 'Anomalie d impression de l étiquette au niveau du lot d emballage. Le numéro de don reste lisible via code-barres. Poche conforme.', correctiveActions: 'Contrôle qualité renforcé des impressions d étiquettes.', qualiosRef: 'NC-2025-0287' },

  // ---- Période récente (recues, en analyse, attente info) ----
  { orgIndex: 0, declarantEmail: 'declarant@chu-liege.be', category: ComplaintCat.produit_sanguin, criticality: CriticalityLevel.critique, status: ComplaintStat.en_investigation, monthsAgo: 1, description: 'Poche de CGR livrée hors température : constat 12.8°C à la réception. Numéro de don enregistré. La chaîne du froid a été rompue pendant le transport.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.destruction_produit_sans_impact, products: [{ code: 'E0388V00', din: 'BE999925000077', group: BloodGroupEnum.O_POS, temp: 12.8 }], qualiosRef: 'NC-2025-0321', messageExchange: [{ from: 'SFS', text: 'Pouvez-vous nous transmettre la photographie du relevé de température et le justificatif de réception ?' }, { from: 'CLIENT', text: 'Photo du relevé transmise en pièce jointe. Réception à 14h22, contrôle à 14h35.' }] },
  { orgIndex: 1, declarantEmail: 'declarant@hopital-nord.be', category: ComplaintCat.transport_chaine_du_froid, criticality: CriticalityLevel.majeure, status: ComplaintStat.information_complementaire_demandee, monthsAgo: 1, description: 'Relevé de température manquant sur une livraison de plaquettes. Demande du justificatif au transporteur.', patientImpact: PatientImpactEnum.inconnu, typology: PatientImpactTypo.autre_impact, products: [{ code: 'E3845V00', din: 'BE999925000088', group: BloodGroupEnum.AB_NEG, temp: 22.5 }], qualiosRef: 'NC-2025-0344', messageExchange: [{ from: 'SFS', text: 'Merci de nous fournir la courbe de température enregistrée lors du transport de cette livraison.' }] },
  { orgIndex: 2, declarantEmail: 'declarant@clinique-bxl.be', category: ComplaintCat.delai_disponibilite, criticality: CriticalityLevel.majeure, status: ComplaintStat.en_analyse_recevabilite, monthsAgo: 0, description: 'Retard de 3h20 sur une commande urgente de CGR O- pour bloc opératoire. L urgence vitale a été gérée par dépannage interne.', patientImpact: PatientImpactEnum.oui, typology: PatientImpactTypo.retard_transfusionnel, qualiosRef: 'NC-2025-0361' },
  { orgIndex: 4, declarantEmail: 'declarant@chr-namur.be', category: ComplaintCat.produit_sanguin, criticality: CriticalityLevel.majeure, status: ComplaintStat.recue, monthsAgo: 0, description: 'Constat de fuite sur une poche de plaquettes à la réception. Traçabilité du lot demandée.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun, products: [{ code: 'E3845V00', din: 'BE999925000099', group: BloodGroupEnum.O_POS, temp: 21 }], qualiosRef: 'NC-2025-0372' },
  { orgIndex: 10, declarantEmail: 'dialyse@charleroi-demo.be', category: ComplaintCat.relationnel_service, criticality: CriticalityLevel.mineure, status: ComplaintStat.recue, monthsAgo: 0, description: 'Accueil téléphonique jugé peu clair lors d une demande de confirmation de disponibilité de groupe rare.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun },
  { orgIndex: 11, declarantEmail: 'cellules@tissus-demo.be', category: ComplaintCat.livraison_conditionnement, criticality: CriticalityLevel.mineure, status: ComplaintStat.en_analyse_recevabilite, monthsAgo: 0, description: 'Conditionnement de transport non conforme à la convention (absence de gel pack de sécurité).', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun },
  { orgIndex: 3, declarantEmail: 'declarant@az-antwerpen.be', category: ComplaintCat.facturation, criticality: CriticalityLevel.mineure, status: ComplaintStat.en_analyse_recevabilite, monthsAgo: 0, description: 'TVA appliquée à tort sur une facture de produits à usage de recherche (exonération prévue par la convention).', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun },
  { orgIndex: 0, declarantEmail: 'sophie.tlm@chu-liege.be', category: ComplaintCat.autre, criticality: CriticalityLevel.mineure, status: ComplaintStat.en_analyse_recevabilite, monthsAgo: 0, description: 'Demande de clarification sur la procédure de commande hors urgence vitale applicable depuis la dernière mise à jour.', patientImpact: PatientImpactEnum.non, typology: PatientImpactTypo.aucun },
];

// -----------------------------------------------------------------------------
// Génération complémentaire déterministe (~35 réclamations -> total ~60)
// -----------------------------------------------------------------------------
const GENERIC_DESCRIPTIONS: Record<string, string> = {
  [ComplaintCat.produit_sanguin]: 'Poche livrée avec anomalie constatée à la réception (étiquette, conditionnement ou aspect). Traçabilité du numéro de don enregistrée.',
  [ComplaintCat.transport_chaine_du_froid]: 'Écart de température relevé sur une livraison. Relevé transmis au Service du Sang pour investigation.',
  [ComplaintCat.delai_disponibilite]: 'Retard de livraison par rapport au délai conventionnel. Impact sur l organisation du service de soins.',
  [ComplaintCat.analyse_resultat]: 'Résultat d analyse immuno-hématologique nécessitant une vérification complémentaire par le laboratoire de référence.',
  [ComplaintCat.documentation]: 'Documentation contrôlée jugée imprécise ou obsolète sur un point réglementaire.',
  [ComplaintCat.livraison_conditionnement]: 'Anomalie de conditionnement ou d emballage constatée lors de la réception de la commande.',
  [ComplaintCat.relationnel_service]: 'Retour d expérience sur la qualité de la prise en charge téléphonique ou administrative.',
  [ComplaintCat.facturation]: 'Écart constaté entre la facture émise et la convention de référence.',
  [ComplaintCat.autre]: 'Signalement qualité ne relevant pas des catégories principales.',
};

const GENERIC_CONCLUSIONS: Record<string, string> = {
  [ComplaintCat.produit_sanguin]: 'Investigation menée avec le laboratoire de contrôle : anomalie isolée, aucun risque transfusionnel identifié. Mesure préventive communiquée.',
  [ComplaintCat.transport_chaine_du_froid]: 'Écart de température confirmé sur une portion du trajet. Produits concernés écartés et détruits. Avis de non-conformité au transporteur.',
  [ComplaintCat.delai_disponibilite]: 'Retard lié à un pic d activité. Plan de renfort des livraisons activé.',
  [ComplaintCat.analyse_resultat]: 'Contre-expertise réalisée : résultat initial confirmé. Information communiquée au laboratoire demandeur.',
  [ComplaintCat.documentation]: 'Document revu et mis à jour par le référent Qualios. Nouvelle version publiée et synchronisée.',
  [ComplaintCat.livraison_conditionnement]: 'Non-conformité de conditionnement isolée. Ajustement des instructions de préparation des colis.',
  [ComplaintCat.facturation]: 'Erreur de facturation corrigée et avoir émis.',
  [ComplaintCat.relationnel_service]: 'Mesure d amélioration de la permanence téléphonique mise en place.',
  [ComplaintCat.autre]: 'Demande traitée et réponse apportée dans les délais.',
};

const CATEGORY_LIST = [
  ComplaintCat.produit_sanguin, ComplaintCat.transport_chaine_du_froid, ComplaintCat.delai_disponibilite,
  ComplaintCat.analyse_resultat, ComplaintCat.documentation, ComplaintCat.livraison_conditionnement,
  ComplaintCat.relationnel_service, ComplaintCat.facturation, ComplaintCat.autre,
];

const CRITICALITY_CYCLE = [CriticalityLevel.mineure, CriticalityLevel.mineure, CriticalityLevel.majeure, CriticalityLevel.critique, CriticalityLevel.majeure];

function buildGeneratedComplaints(): ComplaintSeed[] {
  const generated: ComplaintSeed[] = [];
  const orgCycle = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const statusCycle: ComplaintStat[] = [
    ComplaintStat.cloturee, ComplaintStat.cloturee, ComplaintStat.cloturee, ComplaintStat.cloturee,
    ComplaintStat.cloturee, ComplaintStat.conclue, ComplaintStat.conclue, ComplaintStat.conclue,
    ComplaintStat.en_investigation, ComplaintStat.en_investigation, ComplaintStat.information_complementaire_demandee,
    ComplaintStat.en_analyse_recevabilite, ComplaintStat.recue, ComplaintStat.irrecevable,
  ];
  const declarantByOrg: Record<number, string> = {
    0: 'sophie.tlm@chu-liege.be', 1: 'lien.vandenberg@hopital-nord.be', 2: 'declarant@clinique-bxl.be',
    3: 'declarant@az-antwerpen.be', 4: 'declarant@chr-namur.be', 5: 'recherche@labo-transfusion.be',
    6: 'contact@plateforme-gembloux.be', 7: 'prof.transfusion@univ-bruxelles.be', 8: 'didactique@helmo-liege.be',
    9: 'dr.fictif@cabinet.be', 10: 'dialyse@charleroi-demo.be', 11: 'cellules@tissus-demo.be',
  };
  const dinPool = ['BE999925000101', 'BE999925000102', 'BE999925000103', 'BE999925000104', 'BE999925000105', 'BE999925000106', 'BE999925000107', 'BE999925000108', 'BE999925000109', 'BE999925000110'];

  for (let i = 0; i < 35; i++) {
    const orgIndex = orgCycle[i % orgCycle.length];
    const category = CATEGORY_LIST[i % CATEGORY_LIST.length];
    const status = statusCycle[i % statusCycle.length];
    const criticality = CRITICALITY_CYCLE[i % CRITICALITY_CYCLE.length];
    const monthsAgo = 13 - Math.floor(i / 3); // étalement sur 14 mois
    const isProduit = category === ComplaintCat.produit_sanguin;
    const isIrrecevable = status === ComplaintStat.irrecevable;

    generated.push({
      orgIndex,
      declarantEmail: declarantByOrg[orgIndex],
      category,
      criticality,
      status,
      monthsAgo: Math.max(0, monthsAgo),
      description: GENERIC_DESCRIPTIONS[category],
      patientImpact: criticality === CriticalityLevel.critique ? PatientImpactEnum.oui : PatientImpactEnum.non,
      typology: criticality === CriticalityLevel.critique ? PatientImpactTypo.effet_indesirable_receveur : PatientImpactTypo.aucun,
      products: isProduit ? [{ code: 'E0388V00', din: dinPool[i % dinPool.length], group: i % 2 ? BloodGroupEnum.A_POS : BloodGroupEnum.O_POS, temp: i % 3 ? 4.2 : 13.5 }] : undefined,
      rejectionReason: isIrrecevable ? 'Signalement hors délais opposables et sans élément de traçabilité probant.' : undefined,
      conclusion: status === ComplaintStat.cloturee || status === ComplaintStat.conclue ? GENERIC_CONCLUSIONS[category] : undefined,
      correctiveActions: status === ComplaintStat.cloturee || status === ComplaintStat.conclue ? 'Mesure corrective enregistrée et suivie par le responsable qualité.' : undefined,
      qualiosRef: `NC-${2024 + (i % 2)}-${String(400 + i).padStart(4, '0')}`,
    });
  }

  return generated;
}

const ALL_COMPLAINTS = [...COMPLAINTS, ...buildGeneratedComplaints()];

async function main() {
  console.log('[SEED] Démarrage de l initialisation des données de démonstration...');

  // 1. Nettoyage (aucune donnée qualité réelle, il s agit d un environnement de démo)
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.syncLog.deleteMany(),
    prisma.outboxTask.deleteMany(),
    prisma.notificationLog.deleteMany(),
    prisma.satisfactionSurvey.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.message.deleteMany(),
    prisma.complaintEvent.deleteMany(),
    prisma.concernedProduct.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.documentAudience.deleteMany(),
    prisma.document.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 2. Organisations
  const orgIds: string[] = [];
  for (const org of ORGANIZATIONS) {
    const created = await prisma.organization.create({
      data: {
        name: org.name,
        type: org.type,
        businessNumber: org.businessNumber,
        siteName: org.siteName,
        address: org.address,
        defaultLanguage: org.defaultLanguage,
        status: OrgStatus.active,
      },
    });
    orgIds.push(created.id);
  }
  console.log(`[SEED] ${ORGANIZATIONS.length} organisations créées.`);

  // 3. Utilisateurs
  const userByEmail = new Map<string, string>();
  for (const u of SFS_USERS) {
    const created = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        jobTitle: u.jobTitle,
        language: u.language,
        roles: u.roles,
        mfaEnabled: u.mfaEnabled ?? false,
        status: 'active',
        consentQualityCharter: true,
        lastLoginAt: new Date(),
      },
    });
    userByEmail.set(u.email, created.id);
  }

  for (const u of CLIENT_USERS) {
    const created = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        jobTitle: u.jobTitle,
        language: u.language,
        roles: u.roles,
        organizationId: u.orgIndex !== undefined ? orgIds[u.orgIndex] : undefined,
        mfaEnabled: u.mfaEnabled ?? false,
        status: 'active',
        consentQualityCharter: true,
        lastLoginAt: new Date(),
      },
    });
    userByEmail.set(u.email, created.id);
  }
  console.log(`[SEED] ${SFS_USERS.length + CLIENT_USERS.length} utilisateurs créés.`);

  // 4. Documents contrôlés avec audiences
  for (const doc of DOCUMENTS) {
    const created = await prisma.document.create({
      data: {
        qualiosReference: doc.ref,
        titleFr: doc.titleFr,
        titleNl: doc.titleNl,
        titleEn: doc.titleEn,
        descriptionFr: `Description contrôlée du document ${doc.titleFr}.`,
        type: doc.type,
        version: doc.version,
        applicationDate: new Date(doc.applicationDate),
        status: doc.ref === 'SFS-QUAL-RT001' ? DocStatus.retire : DocStatus.en_vigueur,
        checksum: crypto.createHash('sha256').update(doc.ref + doc.version).digest('hex'),
        storageKey: `docs/${doc.ref}_v${doc.version}.pdf`,
        fileSizeBytes: 1024 * 512,
        mimeType: 'application/pdf',
        lastSyncAt: new Date(),
        audiences: {
          create: {
            allowedOrgTypes: doc.audiences.orgTypes,
            allowedOrgIds: doc.audiences.orgIds || [],
            allowedRoles: doc.audiences.roles || [],
          },
        },
      },
    });
    void created;
  }
  console.log(`[SEED] ${DOCUMENTS.length} documents créés (dont 1 retiré).`);

  // 5. Réclamations sur 14 mois
  const seqByYear = new Map<number, number>();
  const now = new Date();

  for (const seed of ALL_COMPLAINTS) {
    const declaredAt = new Date(now.getTime() - seed.monthsAgo * 30 * 24 * 60 * 60 * 1000);
    const year = declaredAt.getFullYear();
    const seq = (seqByYear.get(year) || 0) + 1;
    seqByYear.set(year, seq);
    const portalNumber = `SFS-${year}-${String(seq).padStart(5, '0')}`;

    const declarantId = userByEmail.get(seed.declarantEmail)!;
    const orgId = orgIds[seed.orgIndex];

    // SLA targets
    const slaReceivability = new Date(declaredAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    const slaFinal = new Date(declaredAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const isClosed = seed.status === ComplaintStat.cloturee || seed.status === ComplaintStat.irrecevable;
    const isConcluded = seed.status === ComplaintStat.conclue;

    const complaint = await prisma.complaint.create({
      data: {
        portalNumber,
        organizationId: orgId,
        declarantId,
        entryChannel: 'portal',
        incidentDate: new Date(declaredAt.getTime() - 3 * 60 * 60 * 1000),
        declarationDate: declaredAt,
        category: seed.category,
        declaredCriticality: seed.criticality,
        validatedCriticality: isConcluded || isClosed ? seed.criticality : undefined,
        description: seed.description,
        patientImpact: seed.patientImpact,
        patientImpactTypology: seed.typology,
        status: seed.status,
        qualiosNonConformityRef: seed.qualiosRef,
        slaTargetReceivabilityAt: slaReceivability,
        slaTargetFinalResponseAt: slaFinal,
        slaSuspendedAt: seed.status === ComplaintStat.information_complementaire_demandee ? declaredAt : undefined,
        slaTotalSuspensionHours: seed.status === ComplaintStat.information_complementaire_demandee ? 72 : 0,
        conclusion: seed.conclusion,
        correctiveActionsSummary: seed.correctiveActions,
        closedAt: isClosed ? new Date(declaredAt.getTime() + 21 * 24 * 60 * 60 * 1000) : undefined,
        rejectionReason: seed.rejectionReason,
        products: seed.products && seed.products.length > 0
          ? { create: seed.products.map((p) => ({ productCode: p.code, donationNumber: p.din, bloodGroup: p.group, quantity: 1, measuredTemperature: p.temp })) }
          : undefined,
        events: {
          create: [
            {
              transitionType: 'CREATION_ET_RECEPTION',
              fromStatus: ComplaintStat.brouillon,
              toStatus: ComplaintStat.recue,
              authorId: declarantId,
              authorName: 'Déclarant démo',
              authorOrganization: ORGANIZATIONS[seed.orgIndex].name,
              comment: 'Réclamation déclarée et enregistrée sur le portail.',
              visibility: EventVis.partage_client,
              createdAt: declaredAt,
            },
          ],
        },
      },
      include: { products: true },
    });

    // Messages d'échange
    if (seed.messageExchange) {
      for (const msg of seed.messageExchange) {
        const isSfsMsg = msg.from === 'SFS';
        const authorId = isSfsMsg ? userByEmail.get('reception@service-du-sang.be')! : declarantId;
        const authorName = isSfsMsg ? 'Sophie Réception' : 'Déclarant démo';
        await prisma.message.create({
          data: {
            complaintId: complaint.id,
            authorId,
            authorName,
            authorRole: isSfsMsg ? RoleEnum.agent_reception : RoleEnum.declarant,
            authorOrganization: isSfsMsg ? 'Service du Sang' : ORGANIZATIONS[seed.orgIndex].name,
            visibility: EventVis.partage_client,
            content: msg.text,
            readByDeclarant: true,
            readBySFS: true,
            createdAt: new Date(declaredAt.getTime() + 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    // Enquêtes de satisfaction pour les clôturées
    if (seed.status === ComplaintStat.cloturee) {
      const hasAnswered = seq % 3 === 0; // 1 clôturée sur 3 répond à l'enquête
      await prisma.satisfactionSurvey.create({
        data: {
          complaintId: complaint.id,
          organizationId: orgId,
          scoreCsat: hasAnswered ? 4 + (seq % 2) : 0,
          verbatim: hasAnswered ? 'Traitement professionnel et rapide. Bonne communication dans le fil de suivi.' : undefined,
          respondedAt: hasAnswered ? new Date(declaredAt.getTime() + 25 * 24 * 60 * 60 * 1000) : undefined,
        },
      });
    }

    // Journal de synchronisation Qualios
    if (seed.qualiosRef) {
      await prisma.syncLog.create({
        data: {
          direction: 'OUTBOUND',
          adapter: 'rest',
          entityType: 'complaint',
          entityId: complaint.id,
          qualiosRef: seed.qualiosRef,
          status: 'SUCCESS',
          latencyMs: 412,
          attemptNumber: 1,
          payloadTruncated: JSON.stringify({ portalNumber }).slice(0, 200),
        },
      });
    }
  }
  console.log(`[SEED] ${ALL_COMPLAINTS.length} réclamations créées (${Array.from(seqByYear.entries()).map(([y, n]) => `${n} en ${y}`).join(', ')}).`);

  // 6. Quelques entrées de piste d'audit
  await prisma.auditLog.createMany({
    data: [
      { actorId: userByEmail.get('admin@service-du-sang.be')!, actorEmail: 'admin@service-du-sang.be', actorRole: 'administrateur', action: 'SEED_DEMO_DATA_LOADED', entityType: 'SYSTEM', entityId: 'demo', ipAddress: '127.0.0.1' },
      { actorId: userByEmail.get('responsable.qualite@service-du-sang.be')!, actorEmail: 'responsable.qualite@service-du-sang.be', actorRole: 'responsable_qualite', action: 'QUALIOS_SYNC_INITIALIZED', entityType: 'QUALIOS', entityId: 'adapter-rest', ipAddress: '10.0.0.15' },
    ],
  });

  console.log('[SEED] Données de démonstration chargées avec succès.');
  console.log('[SEED] Mot de passe commun :', DEMO_PASSWORD);
  console.log('[SEED] Comptes : declarant@chu-liege.be | qualite@chu-liege.be | lecteur@univ-bruxelles.be | reception@service-du-sang.be | responsable.qualite@service-du-sang.be | admin@service-du-sang.be | direction@service-du-sang.be');
}

main()
  .catch((err) => {
    console.error('[SEED_ERROR]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
