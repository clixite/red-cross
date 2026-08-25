# Modèle de Données Réglementé — Portail « Service du Sang »

Ce document présente le modèle de données relationnel, les entités, leurs relations et les contraintes réglementaires applicables.

---

## 1. Diagramme Entités-Relations

```
   ┌──────────────────┐               ┌──────────────────┐
   │   Organization   │ 1           * │       User       │
   │──────────────────│───────────────│──────────────────│
   │ id (UUID)        │               │ id (UUID)        │
   │ type             │               │ email            │
   │ name             │               │ roles (Enum[])   │
   │ businessNumber   │               │ mfaEnabled       │
   │ defaultLanguage  │               │ status           │
   └────────┬─────────┘               └────────┬─────────┘
            │ 1                                │ 1
            │                                  │
            │ *                                │ * (declarant)
   ┌────────┴─────────┐               ┌────────┴─────────┐
   │    Complaint     │               │   Satisfaction   │
   │──────────────────│ 1           1 │      Survey      │
   │ id (UUID)        │───────────────│──────────────────│
   │ portalNumber     │               │ id (UUID)        │
   │ category         │               │ scoreCsat (1-5)  │
   │ status           │               │ verbatim         │
   │ patientImpact    │               └──────────────────┘
   │ qualiosRef       │
   │ targetSlaDates   │
   └────────┬─────────┘
            │
            ├───────────────┬────────────────┬─────────────────┐
            │ 1             │ 1              │ 1               │ 1
            │ *             │ *              │ *               │ *
   ┌────────┴─────────┐ ┌───┴──────────┐ ┌───┴────────────┐ ┌───┴──────────┐
   │ ConcernedProduct │ │ComplaintEvent│ │    Message     │ │  Attachment  │
   │──────────────────│ │──────────────│ │────────────────│ │──────────────│
   │ productCode      │ │transitionType│ │ authorRole     │ │ fileName     │
   │ donationNumber   │ │visibility    │ │ visibility     │ │ storageKey   │
   │ bloodGroup       │ │authorName    │ │ content        │ │ antivirusStat│
   │ temperature      │ │createdAt     │ │ readByDeclarant│ └──────────────┘
   └──────────────────┘ └──────────────┘ └────────────────┘
```

---

## 2. Dictionnaire des Entités Principales

### 2.1 `organizations`
Représente l'entité cliente ou partenaire de l'établissement de transfusion.
- **`type`** : `banque_sang_hospitaliere`, `laboratoire_recherche`, `etablissement_enseignement`, `praticien`, `autre`.
- **`businessNumber`** : Numéro BCE belge (Banque-Carrefour des Entreprises).
- **`defaultLanguage`** : Langue par défaut pour les notifications (`fr`, `nl`, `en`).

### 2.2 `users`
Utilisateurs du portail, avec rattachement obligatoire à une organisation (sauf personnel interne SFS).
- **Sécurité** : Aucun compte ouvert ; invitation exclusive via jeton temporaire.
- **Rôles** : `declarant`, `referent_qualite`, `lecteur`, `agent_reception`, `responsable_qualite`, `administrateur`, `lecteur_direction`.
- **MFA** : Secret TOTP pour double facteur obligatoire.

### 2.3 `complaints`
Enregistrement qualité réglementé. **Aucune suppression physique autorisée.**
- **`portalNumber`** : Numéro communicable unique `SFS-AAAA-NNNNN`.
- **`category`** : Catégories normalisées de non-conformité transfusionnelle.
- **`patientImpact` & `patientImpactTypology`** : Impact clinique structuré sans aucune donnée nominative patient.
- **`status`** : Suivi rigoureux du cycle de vie piloté par machine à états.
- **`slaTargetReceivabilityAt` & `slaTargetFinalResponseAt`** : Dates cibles calculées en jours ouvrés et jours calendrier, avec suspension tracée (`slaTotalSuspensionHours`).

### 2.4 `concerned_products`
Produits sanguins labiles concernés par la réclamation (obligatoire si catégorie = `produit_sanguin`).
- **`donationNumber`** : Numéro de don ISBT 128 / Eurocode.
- **`productCode`** : Code produit normalisé (ex: `E0388V00`).
- **`bloodGroup`** : Groupe ABO-RhD.
- **`measuredTemperature`** : Relevé de température lors de l'incident.

### 2.5 `complaint_events` & `audit_logs` (Append-Only)
- Traçabilité inaltérable : qui, quoi, quand, rôle, organisation, adresse IP, valeurs avant/après.
- Ségrégation de visibilité : `interne_sfs` vs `partage_client`.

### 2.6 `documents` & `document_audiences`
Documents qualité contrôlés synchronisés depuis Qualios.
- Règle absolue : Seuls les documents au statut `en_vigueur` sont exposés.
- Filtrage dynamique par matrice d'audience (types d'organisations, organisations spécifiques, rôles).

### 2.7 `outbox_tasks` & `sync_logs`
Gestion de la synchronisation asynchrone bidirectionnelle Qualios avec clés d'idempotence et Dead-Letter Queue.
