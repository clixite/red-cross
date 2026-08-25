# Architecture du Portail Clients « Service du Sang »

Ce document décrit l'architecture logicielle, les flux de données et la stratégie d'intégration pour le portail B2B du Service du Sang (Croix-Rouge de Belgique).

---

## 1. Vue d'Ensemble et Objectifs d'Architecture

Le système est un portail B2B multi-tenant destiné aux clients professionnels d'un établissement de transfusion sanguine (Banques de sang hospitalières, laboratoires de recherche, universités/écoles et prescripteurs médicaux).

```
 +-------------------------------------------------------------------------+
 |                               Navigateurs Web                           |
 |               (Espace Client B2B / Back-office SFS / Tableaux de bord)   |
 +-------------------------------------------------------------------------+
                                      │  HTTPS (REST JSON / SPA)
                                      ▼
 +-------------------------------------------------------------------------+
 |                        Front-end (Vite + React 18 + TS)                 |
 |          i18n (FR/NL/EN) | WCAG AA Accessible | Tokens Neutres         |
 +-------------------------------------------------------------------------+
                                      │  /api/v1 (JWT + Session)
                                      ▼
 +-------------------------------------------------------------------------+
 |                      Back-end API (Node.js / Express / TS)              |
 |  ┌──────────────────────────────────────────────────────────────────┐   |
 |  │ Core Métier / Machine à États / Validation ISBT 128 / Anti-NISS  │   |
 |  ├──────────────────────────────────────────────────────────────────┤   |
 |  │ Multi-Tenant Context Guard │ RBAC Matrice Droits │ MFA TOTP      │   |
 |  ├──────────────────────────────────────────────────────────────────┤   |
 |  │ Journal d'Audit Append-Only │ Antivirus Pipeline │ Notifications │   |
 |  └──────────────────────────────────────────────────────────────────┘   |
 |         │                              │                     │          |
 |         ▼                              ▼                     ▼          |
 |  ┌──────────────┐             ┌─────────────────┐   ┌────────────────┐  |
 |  │  PostgreSQL  │             │ Stockage Objets │   │ Outbox Worker  │  |
 |  │  (Migrations │             │ S3 / MinIO      │   │ Transactionnel │  |
 |  │   Prisma)    │             │ (URLs signées)  │   │ Retry, DLQ     │  |
 |  └──────────────┘             └─────────────────┘   └───────┬────────┘  |
 +-------------------------------------------------------------│-----------+
                                                               │
                                  ┌────────────────────────────┘
                                  ▼
                +------------------------------------+
                |   Couche Anti-Corruption Qualios   |
                |          (QualiosPort)             |
                +-----------------+------------------+
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
 ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 │ REST Adapter    │     │ File Adapter    │     │ Manual Adapter  │
 │ (Circuit breaker│     │ (SFTP/CSV/XML   │     │ (Back-office UI │
 │  Retry & Jitter)│     │  Fichiers .done)│     │  Reconciliation)│
 └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
          │                       │                       │
          ▼                       ▼                       ▼
 ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 │ Qualios REST    │     │ SFTP / Partage  │     │ Opérateur SFS   │
 │ API Externe     │     │ Réseau Fichiers │     │ Saisie Manuelle │
 └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 2. Choix Technologiques Justifiés

| Composant | Technologie | Justification |
|---|---|---|
| **Langage & Typage** | TypeScript (Strict) | Assure la cohérence de bout en bout (types partagés dans `@sfs/domain`), élimine les erreurs de typage et garantit la maintenabilité par une équipe locale. |
| **Back-end** | Node.js + Express | Écosystème ultra-mature, grande disponibilité de compétences en Belgique, support natif de flux asynchrones pour l'outbox worker et streaming S3. |
| **ORM & Base** | PostgreSQL 16 + Prisma | PostgreSQL offre la robustesse relationnelle, les transactions ACID indispensables à l'Outbox Pattern et l'audit inaltérable. Prisma fournit des migrations versionnées typées et reproductibles. |
| **Stockage Objets** | MinIO (Dev/Docker) / S3 standard | Compatible AWS S3, URLs pré-signées éphémères (TTL court de 15 minutes) empêchant l'accès direct aux documents sans vérification de session et d'audience. |
| **Front-end** | React 18 + Vite + Tailwind CSS | Performance optimale, construction rapide, architecture de composants claire, système de design par variables CSS interchangeables (aucune marque sous licence). |
| **Internationalisation** | i18next | Solution de référence supportant FR (défaut), NL et EN sans chaînes en dur, y compris pour les formats de date et statuts métier. |
| **Qualité & Tests** | Vitest | Vitesse d'exécution unitaire et d'intégration, support natif TypeScript/ESM, rapports de couverture détaillés. |

---

## 3. Découpage Modulaire (Monorepo)

- `packages/domain` :
  - Définition des types et interfaces de domaine.
  - Machine à états formelle pour le cycle de vie des réclamations.
  - Règles de validation ISBT 128 (numéro de don belge, codes produits, groupes ABO/RhD, températures).
  - Détection heuristique anti-données de santé (RGPD, numéros nationaux belges NISS).
  - Calculateurs de délais et gestion des suspensions de SLA.
  - Matrice des permissions et rôles.

- `apps/backend` :
  - Serveur REST Express avec middleware de contexte multi-tenant strict.
  - Moteur d'authentification (JWT, invitation sécurisée, TOTP MFA, abstraction OIDC prête).
  - Pipeline de validation et d'analyse antivirus des pièces jointes.
  - Service d'audit append-only avec export CSV horodaté et signé (checksum SHA-256).
  - Couche d'intégration Qualios avec les 3 adaptateurs (`rest`, `file`, `manual`), worker Outbox, Dead-Letter Queue (DLQ) et job de réconciliation nocturne.
  - Moteur de génération automatique de spécification OpenAPI 3.1.

- `apps/mock-qualios` :
  - Service mock autonome simulant le système Qualios avec OpenAPI dédiée et injection de fautes (latences, erreurs 500, quotas 429, payload partiel).

- `apps/frontend` :
  - SPA React responsive, accessible WCAG AA.
  - Espace Client (catalogue documentaire avec contrôle d'audience, déclaration guidée avec traçabilité produit, suivi en temps réel et fil de discussion).
  - Back-office SFS (qualification, recevabilité, compléments, clôture, dashboard indicateurs, gestion DLQ et administration multi-organisations).

---

## 4. Sécurité & Conformité Réglementaire

1. **Isolation Multi-Tenant** : Chaque requête authentifiée résout le contexte d'organisation. Toute tentative de lecture ou d'écriture transversale déclenche un code HTTP 403 (jamais un 404 masqué) et génère une entrée au journal d'audit de sécurité.
2. **Piste d'Audit Inaltérable (Append-Only)** : Les réclamations, événements et entrées d'audit ne sont jamais supprimés ni modifiés.
3. **Protection RGPD / Données de Santé** : Le système empêche activement la saisie d'identifiants patients (numéro de registre national belge NISS `YY.MM.DD-XXX.CC`, dates de naissance, identifiants dossiers hospitaliers) grâce à une validation heuristique bloquante côté serveur.
4. **Gestion Documentaire Contrôlée** : Le portail ne sert jamais de document périmé ou retiré. L'accès aux fichiers binaires passe par des jetons éphémères signés et une vérification de l'état `en_vigueur` dans Qualios.
