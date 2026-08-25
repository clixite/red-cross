# Contrat d'Intégration et Spécifications Techniques — Système Qualios (Qualnet)

**Destinataire :** Direction des Systèmes d'Information & Éditeur Qualios (Qualnet)  
**Émetteur :** Équipe Projet « Portail Clients B2B » — Service du Sang (Croix-Rouge de Belgique)  
**Version :** 1.0.0 — Document officiel de cadrage d'interfaçage

---

## 1. Objectif du Document

Ce document formalise les exigences d'interfaçage bidirectionnel entre le **Portail Clients B2B** du Service du Sang et le Système de Management de la Qualité **Qualios**.

Le portail permet aux clients hospitaliers et partenaires de déclarer des réclamations et de consulter la documentation qualité en vigueur. Qualios demeure **la seule et unique source de vérité** pour la gestion documentaire et les fiches de non-conformité réglementaires.

---

## 2. Tableau de Correspondance Champ à Champ (Mapping)

### 2.1 Déclaration de Réclamation ➔ Fiche de Non-Conformité Qualios

| Champ Portail B2B | Type & Format | Champ Cible Qualios (Module NC) | Règle de transformation / Description |
|---|---|---|---|
| `portalNumber` | String (`SFS-AAAA-NNNNN`) | `ChampPersonnalise_RefPortail` | Clé fonctionnelle de réconciliation |
| `declarationDate` | DateTime (ISO 8601 UTC) | `DateDeclaration` | Horodatage certifié de la déclaration |
| `incidentDate` | DateTime (ISO 8601 UTC) | `DateSurvenue` | Date de survenue de l'incident |
| `organization.name` | String (Max 255) | `Client_RaisonSociale` | Nom de l'établissement client |
| `organization.businessNumber`| String (`BE 0XXX.XXX.XXX`) | `Client_NumeroBCE` | N° d'entreprise belge |
| `category` | Enum (`produit_sanguin`, etc.) | `TypeNonConformite` | Table de correspondance des typologies |
| `declaredCriticality` | Enum (`mineure`, `majeure`, `critique`)| `GraviteInitiale` | Criticité estimée par le déclarant |
| `validatedCriticality` | Enum (`mineure`, `majeure`, `critique`)| `GraviteValideeQualite` | Criticité arbitrée par le SFS |
| `description` | Text (Sans données patient nominatives) | `DescriptionIncident` | Corps descriptif de l'événement |
| `patientImpact` | Enum (`oui`, `non`, `inconnu`) | `ImpactPatient` | Indicateur booléen/inconnu |
| `patientImpactTypology` | Enum (`retard_transfusionnel`, etc.) | `TypologieImpact` | Nature de l'impact clinique anonymisé |
| `products[].donationNumber` | String (ISBT 128 / Eurocode) | `LigneProduit_NumDon` | N° d'identification unitaire du don |
| `products[].productCode` | String (`E0388V00`, etc.) | `LigneProduit_CodePSL` | Code catalogue du produit labile |
| `products[].bloodGroup` | String (`A+`, `O-`, etc.) | `LigneProduit_Groupe` | Groupe ABO-RhD |
| `products[].measuredTemperature` | Float (°C) | `LigneProduit_TempRelevee` | Température relevée lors du constat |
| `slaTargetReceivabilityAt` | DateTime (Jours ouvrés) | `DateCibleRecevabilite` | Échéance opposable recevabilité (J+2) |
| `slaTargetFinalResponseAt` | DateTime (30j calendrier) | `DateCibleReponseFinale` | Échéance réglementaire de réponse |
| `idempotencyKey` | String (UUID) | `X_Idempotency_Key` | Prévention des doublons lors du rejeu |

### 2.2 Retour d'État Qualios ➔ Portail B2B

| Champ Qualios | Champ Portail B2B | Règle / Impact Métier |
|---|---|---|
| `NumeroFicheNC` | `qualiosNonConformityRef` | Ex: `NC-2025-0142` (affiché au client dès génération) |
| `StatutFiche` (`En cours`, `Clôturée`) | `status` | Synchronisation de l'état d'investigation |
| `ConclusionTechnique` | `conclusion` | Synthèse communiquée au client |
| `PlanActionsCorrectives` | `correctiveActionsSummary` | Actions préventives/correctives (CAPA) |

### 2.3 Documentation Contrôlée Qualios ➔ Catalogue Portail

| Champ Qualios (GED) | Champ Portail B2B | Règle de Filtrage |
|---|---|---|
| `ReferenceDocument` | `qualiosReference` | Référence unique de gestion documentaire |
| `NumeroVersion` | `version` | Ex: `4.2` |
| `Titre` | `titleFr` / `titleNl` / `titleEn` | Libellé multilingue |
| `DateMiseEnApplication` | `applicationDate` | Date d'entrée en vigueur |
| `StatutGED` | `status` | **Seul le statut `en_vigueur` est exposé** |
| `FichierBinaire` / `Empreinte` | `checksum` (SHA-256) | Contrôle d'intégrité du fichier servi |

---

## 3. Liste Précise des Questions à Poser à l'Éditeur (Qualnet)

1. **Disponibilité des Interfaces :**
   - Disposez-vous d'une API REST / JSON native pour la création et la mise à jour des fiches du module Non-Conformités ?
   - Disposez-vous d'un endpoint pour l'interrogation différentielle des documents en vigueur (`/documents?sinceRevision=...`) ?
2. **Authentification & Sécurité :**
   - Quels protocoles sont supportés (OAuth2 `client_credentials`, mTLS, API Key par header) ?
   - Les clés d'idempotence (`Idempotency-Key`) sont-elles supportées nativement ?
3. **Gestion des Pièces Jointes :**
   - Comment les pièces jointes associées aux réclamations sont-elles ingérées (multipart/form-data, upload binaire en flux, URLs pré-signées S3) ?
4. **Webhooks vs Polling :**
   - Qualios peut-il émettre des webhooks sortants lors du changement de statut d'une fiche NC ou de la mise en vigueur d'un document ? Si non, quelle est la fréquence maximale de polling recommandée ?
5. **Champs Personnalisés & Données Produits :**
   - Le module NC peut-il accueillir des tables filles répétables (1 à N poches de sang avec numéro de don et code ISBT 128) ?
6. **Environnements & Licence :**
   - Un environnement de recette / sandbox est-il fourni pour les tests d'intégration ?
   - Quel est le coût de la licence pour l'activation des API d'interfaçage ?

---

## 4. Analyse Comparative des 3 Scénarios d'Intégration

```
+-------------------------------------------------------------------------------------------------+
| Scénario 1 : API REST Directe (Recommandé)                                                     |
| - Délai de mise en œuvre : 3 à 5 semaines                                                       |
| - Coût estimé : 15k€ à 25k€ (selon coût connecteur éditeur)                                      |
| - Charge interne : Faible (synchronisation temps réel, zéro saisie manuelle)                    |
| - Robustesse : Maximale (Outbox, circuit breaker, retry automatique avec jitter)                |
+-------------------------------------------------------------------------------------------------+
| Scénario 2 : Échange de Fichiers Batch (SFTP / Partage Réseau CSV-XML)                         |
| - Délai de mise en œuvre : 5 à 7 semaines                                                       |
| - Coût estimé : 10k€ à 18k€                                                                      |
| - Charge interne : Moyenne (surveillance des répertoires de rejet et alertes de syntaxe)        |
| - Robustesse : Bonne (écriture atomique .tmp -> .csv + fichier témoin .done)                    |
+-------------------------------------------------------------------------------------------------+
| Scénario 3 : Mode Manuel Assisté (Défaut Démo / Fallback)                                       |
| - Délai de mise en œuvre : Immédiat (0 semaine supplémentaire)                                  |
| - Coût estimé : 0€ technique (inclus dans le socle portail)                                     |
| - Charge interne : Élevée (l'opérateur qualité recopie la référence NC manuellement)           |
| - Robustesse : Parfaite résilience opérationnelle (le portail fonctionne à 100% sans Qualios)   |
+-------------------------------------------------------------------------------------------------+
```

---

## 5. Ce qui Casse si l'API n'Existe Pas

Si Qualios ne propose aucune interface logicielle automatisable :
- **Impact sur le client externe :** ZÉRO impact visible. Le client déclare sa réclamation, reçoit son accusé de réception immédiat avec son numéro de dossier `SFS-AAAA-NNNNN`, échange dans le fil et télécharge ses documents contrôlés.
- **Impact côté interne SFS :** Le mode `manual` prend automatiquement le relais. Les agents qualité consultent la file d'attente back-office, créent la fiche dans leur client lourd Qualios, puis saisissent la référence obtenue (`NC-XXXX`) dans le portail en un clic.
- **Garantie :** Aucune réclamation n'est perdue, la traçabilité et les SLA restent rigoureusement mesurés.
