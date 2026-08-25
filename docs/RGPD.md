# Conformité RGPD & Données de Santé — Portail « Service du Sang »

Ce document décrit les catégories de données traitées, leurs finalités, les durées de conservation, les mesures de minimisation et les éléments d'entrée pour une analyse d'impact (AIPD).

---

## 1. Catégories de Données Traitées

| Catégorie | Données | Base légale | Justification |
|---|---|---|---|
| **Identité professionnelle** | Nom, prénom, email professionnel, fonction | Contrat (art. 6.1.b RGPD) | Gestion des comptes B2B sur invitation |
| **Organisation cliente** | Raison sociale, N° BCE, adresse, langue | Contrat | Facturation, convention, support |
| **Réclamations qualité** | Description d'incident, produits (n° don ISBT), dates, statuts | Obligation légale (art. 6.1.c) | BPF/GMP, hémovigilance, traçabilité produits sanguins |
| **Données de santé** | **Aucune** par conception | — | Le portail est conçu pour ne **jamais** recevoir de donnée identifiante de patient |
| **Journalisation** | IP, user-agent, horodatages | Intérêt légitime (art. 6.1.f) | Sécurité, piste d'audit |

---

## 2. Minimisation & Conception « Privacy by Design »

1. **Interdiction de champ patient** : aucun champ « nom du patient », « date de naissance », « n° de dossier ». L'impact clinique est **structuré** (impact patient `oui/non/inconnu` + typologie) sans texte libre nominatif.
2. **Avertissement explicite** au-dessus de toute zone de texte libre : « *N'inscrivez aucune donnée permettant d'identifier un patient.* »
3. **Détection heuristique serveur** : le NISS belge (vérifié modulo 97), les dates de naissance et les identifiants hospitaliers (IPP/NIP/DPI) sont détectés et **bloquent la soumission** (HTTP 422) avec journalisation de l'événement de sécurité.
4. **Auditabilité** : chaque blocage est tracé (`SECURITY_PATIENT_DATA_SUBMISSION_BLOCKED`) pour démontrer la conformité lors d'une inspection.
5. **Aucun tracker tiers, aucune police web externe, aucun CDN** : l'interface est auto-hébergée (hébergement UE).

---

## 3. Durées de Conservation Configurables

| Type d'enregistrement | Durée proposée | Justification |
|---|---|---|
| Réclamations + événements + pièces jointes | **10 ans** (conservation réglementaire BPF/hémovigilance) | Obligation légale, rappels de lot possibles |
| Piste d'audit | 10 ans | Preuve de conformité |
| Comptes utilisateurs inactifs | 24 mois après dernière connexion | Purge avec notification préalable |
| Journaux techniques (IP) | 12 mois | Sécurité |
| Enquêtes de satisfaction | 3 ans (agrégées indéfiniment) | Amélioration continue |

> Les durées sont configurables par type via le référentiel de paramétrage (à brancher sur un job de purge en production).

## 4. Droits des Personnes (Utilisateurs du Portail)

- **Export** : endpoint d'export des données personnelles d'un utilisateur (identité, consentements, journal de connexions) au format JSON/CSV.
- **Effacement** : suppression des données personnelles de l'utilisateur **hors enregistrements qualité** (réclamations, événements, audits) qui sont soumis à l'obligation légale de conservation et donc **anonymisés** (le lien déclarant est remplacé par un identifiant technique neutralisé).
- **Rectification** : via l'administration (organisation, fonction, langue).
- **Information** : notice d'information affichée à l'activation du compte (consentement à la charte qualité).

## 5. Éléments d'Entrée pour l'AIPD

1. **Description du traitement** : portail B2B de gestion documentaire qualité et de réclamations réglementées entre un établissement de transfusion sanguine et ses clients professionnels (pas de données patient).
2. **Catégories de personnes** : professionnels de santé (pharmaciens, biologistes, infirmiers, enseignants, chercheurs).
3. **Données sensibles** : données de santé **exclues par conception** (mesures de minimisation démontrées par les tests anti-NISS).
4. **Transferts hors UE** : aucun (hébergement UE).
5. **Mesures techniques** : chiffrement au repos/transit, MFA, cloisonnement multi-tenant, piste d'audit inaltérable, détection heuristique des données de santé, revue trimestrielle des journaux de blocage.
6. **Sous-traitants** : hébergeur UE (DTA à signer), éditeur Qualios pour l'interfaçage QMS (DTA à signer).

## 6. Registre des Traitements (Extrait)

| Traitement | Finalité | Durée | Base |
|---|---|---|---|
| Gestion des comptes professionnels | Accès au portail | Durée du contrat | Contrat |
| Gestion des réclamations qualité | Non-conformité, hémovigilance | 10 ans | Obligation légale |
| Enquêtes de satisfaction | Amélioration continue | 3 ans | Intérêt légitime |
| Journalisation de sécurité | Protection | 12 mois | Intérêt légitime |
