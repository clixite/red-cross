# Matrice des Droits et Cloisonnement Multi-Tenant — Portail « Service du Sang »

Ce document définit la matrice d'habilitation d'accès (Ressource × Action × Rôle) et les règles d'isolation multi-tenant applicables sur le portail B2B.

---

## 1. Rôles Définis

### Côté Client (Professionnels de santé & partenaires)
1. **`lecteur`** : Consultation des documents qualité contrôlés autorisés pour son organisation.
2. **`declarant`** : Déclare des réclamations, suit ses propres dossiers, échange dans le fil de discussion, consulte les documents.
3. **`referent_qualite`** : Visibilité et action sur l'ensemble des réclamations de son organisation, gestion des invitations d'utilisateurs de son organisation.

### Côté Établissement de Transfusion (Interne Service du Sang)
4. **`agent_reception`** : Réception des déclarations, qualification initiale de criticité, demandes d'informations complémentaires au client.
5. **`responsable_qualite`** : Instruction complète, prononcé de recevabilité, ouverture d'investigation, conclusion, clôture, actions correctives et synchronisation Qualios.
6. **`administrateur`** : Gestion globale (référentiels, organisations, utilisateurs, politique de SLA, file Dead-Letter Queue et journal d'audit).
7. **`lecteur_direction`** : Tableaux de bord de pilotage qualité, indicateurs de respect des SLA, exports statistiques agrégés (sans données nominatives).

---

## 2. Matrice Ressources × Actions × Rôles

| Ressource / Action | Lecteur | Déclarant | Réf. Qualité | Agent Récept. | Resp. Qualité | Administrateur | Lecteur Dir. |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Documents : Lecture catalogue** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Documents : Téléchargement (URL signée)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Documents : Gestion & Sync Qualios** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Réclamations : Déclaration (Création)** | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Réclamations : Lecture propres dossiers** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Réclamations : Lecture tous dossiers Org** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Réclamations : Lecture transverse globale** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Réclamations : Qualification criticité** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Réclamations : Recevabilité / Rejet** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Réclamations : Demande de compléments** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Réclamations : Répondre aux compléments** | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Réclamations : Conclusion & Clôture** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Messages : Échange dans le fil partagé** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Messages : Note interne (invisible client)**| ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Utilisateurs : Gérer utilisateurs propre Org**| ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Utilisateurs : Gérer toutes les organisations**| ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Qualios : Forcer synchronisation / DLQ** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Audit : Consultation & Export signé** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Tableaux de bord & KPI** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Enquêtes de satisfaction : Export CSAT**| ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## 3. Règles d'Isolation Multi-Tenant

1. **Vérification Côté Serveur Obligatoire** : Le `TenantContextMiddleware` extrait l'organisation de l'utilisateur authentifié. Toute requête portant sur une réclamation, un utilisateur ou un document est vérifiée contre l'organisation du contexte.
2. **Refus Explicite HTTP 403** : Si un utilisateur de l'Organisation A tente d'accéder à une ressource appartenant à l'Organisation B, le serveur répond par une erreur HTTP `403 Forbidden` (et non un 404 masqué) avec le message :
   `"Accès interdit : Cette ressource appartient à une autre organisation."`
3. **Journalisation de Sécurité** : La tentative est immédiatement consignée dans `AuditLog` avec l'adresse IP, l'identifiant de l'utilisateur, l'organisation cible et l'organisation d'origine sous l'action `SECURITY_TENANT_VIOLATION_BLOCKED`.
4. **Exigence MFA (Double Facteur)** :
   - Rôles pour lesquels le MFA TOTP est obligatoire : `agent_reception`, `responsable_qualite`, `administrateur`, `referent_qualite`.
   - Si le MFA n'est pas configuré, l'accès aux routes protégées est suspendu jusqu'à l'enregistrement du secret TOTP.
