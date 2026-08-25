# Parcours Utilisateurs & Critères d'Acceptation — Portail « Service du Sang »

Ce document définit les 7 parcours métier implémentés et leur couverture par tests bout-en-bout (`apps/backend/tests/e2e/parcours.test.ts`).

---

## Parcours 1 — Déclarer une réclamation produit (poche hors température)

**Acteurs :** Déclarant d'une banque de sang hospitalière.

**Déroulé :**
1. Le déclarant choisit la catégorie `Produit Sanguin Labile`.
2. Il saisit la traçabilité ISBT 128 : numéro de don (`BE999925000001`), code produit (`E0388V00`), groupe ABO-RhD, température relevée (`12.8°C` → avertissement « hors plage » côté formulaire).
3. Il décrit l'incident (zone libre précédée de l'avertissement RGPD bloquant).
4. Il soumet la déclaration.

**Critères d'acceptation :**
- [x] Un numéro portail est attribué au format `SFS-AAAA-NNNNN`.
- [x] Statut immédiat `reçue` avec événement d'audit `COMPLAINT_CREATED`.
- [x] Accusé de réception immédiat à l'écran **et** par e-mail dans la langue de l'utilisateur.
- [x] Une tâche Outbox `CREATE_QUALIOS_NON_CONFORMITY` est créée ; la référence Qualios s'affiche dès retour.
- [x] Aucun numéro de don ou code produit mal formé ne peut être soumis (validation serveur).
- [x] Une description contenant un NISS belge ou une mention patient est **bloquée** (HTTP 422) avec journalisation de sécurité.

**Test :** `Parcours 1 — Déclarer une réclamation produit (bout-en-bout)`.

---

## Parcours 2 — Suivre une réclamation

**Acteurs :** Déclarant / Référent qualité.

**Critères d'acceptation :**
- [x] Historique complet avec les **seuls événements de visibilité partagée** (`partage_client`).
- [x] Date cible de recevabilité (J+2 ouvrés) et date cible de réponse finale (J+30 calendrier) affichées.
- [x] Les notes internes SFS (`interne_sfs`) ne sont jamais exposées au client.

**Test :** `Parcours 2 — Suivre une réclamation (historique, visibilité, SLA)`.

---

## Parcours 3 — Répondre à une demande d'information complémentaire

**Acteurs :** Responsable qualité SFS puis Déclarant.

**Déroulé :**
1. Le SFS passe la réclamation en `information_complementaire_demandee` (motif communiqué).
2. Le chronomètre SLA est **gelé** (`slaSuspendedAt` posé, notifications envoyées).
3. Le déclarant répond dans le fil d'échanges.
4. Le statut repasse automatiquement en `en_investigation`, le SLA **reprend** avec report de la date cible finale (heures de suspension non imputées au SFS).

**Critères d'acceptation :**
- [x] Suspension effective du SLA lors de la demande.
- [x] Reprise automatique à la réponse client, avec cumul `slaTotalSuspensionHours`.
- [x] Notification e-mail multilingue à chaque étape.

**Test :** `Parcours 3 — Répondre à une demande d'information (suspension/reprise SLA)`.

---

## Parcours 4 — Traiter côté SFS jusqu'à la clôture (reflet Qualios)

**Acteurs :** Responsable qualité SFS.

**Déroulé :** qualification de criticité → recevabilité → investigation → conclusion (obligatoire) → clôture.

**Critères d'acceptation :**
- [x] Chaque transition est validée par la **machine à états formelle** (aucune affectation de champ brute).
- [x] Chaque étape génère un événement append-only et une entrée d'audit.
- [x] Chaque étape est reflétée dans Qualios via le worker Outbox (journal `sync_logs`).
- [x] À la clôture : enquête de satisfaction auto-initialisée.

**Test :** `Parcours 4 — Traiter côté SFS jusqu'à la clôture (reflet Qualios)`.

---

## Parcours 5 — Consulter la documentation contrôlée

**Acteurs :** Enseignant (établissement d'enseignement) et banque de sang hospitalière.

**Critères d'acceptation :**
- [x] L'enseignant ne voit que les supports pédagogiques (audience `etablissement_enseignement`).
- [x] La banque de sang voit en plus les procédures et notices produit.
- [x] Un document retiré dans Qualios **disparaît du catalogue** à la synchronisation.
- [x] L'accès direct à un document retiré renvoie une **page explicite** (HTTP 410 `DOCUMENT_RETIRED`), pas une erreur brute.
- [x] Téléchargement via URL signée à durée de vie courte (15 min), avec version, date d'application et checksum affichés.

**Tests :** `Parcours 5 — Consulter la documentation (audiences et retrait)`.

---

## Parcours 6 — Mesurer (enquête CSAT, indicateurs, exports)

**Acteurs :** Direction SFS (lecture seule), Responsable qualité.

**Critères d'acceptation :**
- [x] Enquête CSAT envoyée à la clôture (note 1-5 + verbatim) ; réponse enregistrée.
- [x] Tableau de bord : volume par catégorie et par segment, délai moyen, taux de respect des SLA, CSAT moyen.
- [x] Export CSV de la piste d'audit **signé** (en-tête `X-Audit-SHA256-Checksum`).
- [x] Le lecteur direction accède aux KPI mais **pas** aux détails d'audit nominatifs (403).

**Tests :** `Parcours 6 — Mesurer (CSAT, tableau de bord, exports)`.

---

## Parcours 7 — Administrer (organisation, invitation, délégation)

**Acteurs :** Administrateur SFS, Référent qualité client.

**Critères d'acceptation :**
- [x] Création d'une organisation cliente (n° BCE, type, langue par défaut).
- [x] Invitation d'un référent qualité (jeton d'activation 72h, aucun compte auto-inscrit).
- [x] Le référent activé se connecte, voit exclusivement **son** organisation (isolation multi-tenant vérifiée).
- [x] Le référent peut inviter/gérer les utilisateurs de sa propre organisation.

**Test :** `Parcours 7 — Administrer (organisation, invitation, délégation)`.

---

## Couverture Automatisée

| Suite | Fichier | Couverture |
|---|---|---|
| Machine à états réclamation | `packages/domain/tests/state-machine.test.ts` | 96 % stmts |
| Validations produit ISBT 128 | `packages/domain/tests/isbt-validation.test.ts` | 93 % |
| Détection données patient / NISS | `packages/domain/tests/patient-data-detector.test.ts` | 100 % |
| SLA belges (fériés, suspension) | `packages/domain/tests/sla-calculator.test.ts` | 100 % |
| Matrice de droits & multi-tenant | `packages/domain/tests/permissions.test.ts` | 96 % |
| Antivirus, notifications, audit | `apps/backend/tests/*.test.ts` | — |
| Intégration Qualios (Outbox) | `apps/backend/tests/qualios-integration.test.ts` | — |
| **7 parcours bout-en-bout** | `apps/backend/tests/e2e/parcours.test.ts` | — |
| Accessibilité WCAG 2.1 AA (axe) | `apps/frontend/src/__tests__/accessibility.test.ts` | — |
| Complétude i18n FR/NL/EN | `apps/frontend/src/__tests__/i18n.test.ts` | — |
