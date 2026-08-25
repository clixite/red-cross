# Sécurité — Portail Clients « Service du Sang »

Mesures de sécurité implémentées, écarts restants avant production, et correspondance avec le référentiel **OWASP ASVS 4.0 — Niveau 2**.

---

## 1. Mesures Implémentées (Prototype Exécutable)

### 1.1 Authentification & Session (ASVS V2, V3)
- Comptes **sur invitation exclusive** (jeton 32 octets aléatoire, expiration 72 h, usage unique).
- Mots de passe hachés **bcrypt** (facteur 10) — aucun stockage en clair.
- Jetons d'accès **JWT signés HS256** (secret ≥ 32 caractères, expiration 8 h) ; jeton temporaire MFA 10 min.
- **MFA TOTP** (otplib, secret 20 octets, QR code) : endpoints `/auth/mfa/setup` et `/auth/mfa/confirm` ; middleware bloquant les rôles sensibles sans `mfaVerified`.
- **Abstraction SSO** (`ISsoAuthProvider`) prête pour OIDC / SAML 2.0 (fournisseur mock fourni).

### 1.2 Autorisation & Multi-Tenant (ASVS V4)
- **RBAC matriciel** : 7 rôles × 21 actions, vérifié par `PermissionGuard` et testé cellule par cellule.
- **Cloisonnement strict** : le middleware `requireTenantMatch` et `ComplaintController.getById` refusent tout accès transversal par **HTTP 403** explicite (`TENANT_ACCESS_DENIED`) et journalisent `SECURITY_TENANT_VIOLATION_BLOCKED` avec IP.
- Les notes internes SFS (`interne_sfs`) sont filtrées côté serveur pour les clients.

### 1.3 Protection des Données de Santé (ASVS V8 + RGPD)
- **Aucun champ de saisie de donnée patient** ; impact clinique structuré (`oui/non/inconnu` + typologie).
- **Détection heuristique serveur** (NISS belge avec vérification modulo 97, dates de naissance, IPP/NIP/DPI, mentions nominatives) → **blocage HTTP 422** `PATIENT_DATA_FORBIDDEN`, jamais contournable silencieusement, journalisé.
- Avertissement RGPD affiché au-dessus de chaque zone de texte libre.

### 1.4 Piste d'Audit Inaltérable (ASVS V7)
- Tables `ComplaintEvent`, `Message`, `AuditLog` en **append-only** (aucune opération UPDATE/DELETE dans le code applicatif).
- Enregistrement : horodatage serveur UTC, acteur, rôle, organisation, IP, valeurs avant/après.
- **Export CSV signé** : sceau SHA-256 dans le corps + en-tête HTTP `X-Audit-SHA256-Checksum`.

### 1.5 Sécurité des Uploads (ASVS V12)
- Liste blanche d'extensions (les exécutables/scripts sont bloqués), taille max 25 Mo.
- **Analyse antivirus avant mise à disposition** : détection de la signature de test EICAR et des extensions interdites ; statut `antivirusStatus` stocké.
- Stockage **hors racine web** sur S3/MinIO, accès par **URL pré-signée à durée de vie courte** (15 min).

### 1.6 Transport & En-Têtes (ASVS V9, V14)
- `helmet` : CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy.
- Nginx front : CSP stricte `default-src 'self'`, `frame-ancestors 'none'`.
- Chiffrement en transit TLS (production) et au repos (PostgreSQL/MinIO).

### 1.7 Documents Contrôlés
- Seuls les documents `en_vigueur` sont listés ; un document `retire` renvoie une page explicite (HTTP 410).
- Téléchargement via URL signée TTL 15 min avec version, date d'application et checksum SHA-256.

### 1.8 Divers
- `rate limiting` non activé dans le prototype (voir §3).
- Logs JSON corrélés par `x-correlation-id` ; aucune donnée personnelle dans les logs.

---

## 2. Correspondance OWASP ASVS 4.0 Niveau 2

| Chapitre ASVS | Statut | Détails |
|---|---|---|
| V1 Architecture & threat model | ✅ Partiel | Couche anticorruption, append-only, multi-tenant ; pas de DREAD formel |
| V2 Authentification | ✅ Implémenté | Invitation, bcrypt, MFA TOTP, verrouillage de session à finaliser |
| V3 Gestion de session | ✅ Implémenté | JWT + expiration ; rotation/revocation côté serveur à finaliser |
| V4 Accès / autorisations | ✅ Implémenté | RBAC matriciel testé, 403 explicites |
| V5 Validation d'entrée | ✅ Implémenté | Zod/validations métier, ISBT 128, anti-NISS |
| V6 Chiffrement | ✅ Implémenté | bcrypt, TLS, au repos |
| V7 Journalisation & audit | ✅ Implémenté | Append-only + export signé |
| V8 Protection données | ✅ Implémenté | Minimisation, détection heuristique bloquante |
| V9 Communication | ✅ Implémenté | Helmet/CSP, TLS |
| V10 Malware | ✅ Implémenté | Pipeline antivirus mock (EICAR) |
| V11 Logique métier | ✅ Implémenté | Machine à états testée, idempotence Outbox |
| V12 Fichiers & uploads | ✅ Implémenté | Whitelist, taille, antivirus, S3 hors webroot |
| V13 API & web services | ✅ Partiel | OpenAPI 3.1, RBAC par endpoint ; rate limiting à finaliser |
| V14 Configuration | ✅ Implémenté | Env vars, `.env.example`, aucun secret dans le dépôt |

---

## 3. Mesures Restantes Avant Production

1. **Rate limiting** par IP et par utilisateur (ex : `express-rate-limit`, 10 req/min sur `/auth/login`, 100 req/min global).
2. **Rotation et révocation de session** (liste de révocation / jti), verrouillage progressif du compte (5 essais → 15 min).
3. **Antivirus réel** (ClamAV/Defender for Endpoint) en remplacement du pipeline mock ; quarantine inspectable.
4. **Signature temporelle qualifiée** (eIDAS / timestamp RFC 3161) sur l'export d'audit pour la valeur probante.
5. **Hachage argon2id** en production (bcrypt acceptable pour ce prototype).
6. **CSRF** : le prototype utilise uniquement `Bearer` tokens (pas de cookies de session) ; en cas de cookie `SameSite=Lax` requis.
7. **Test d'intrusion** (OWASP Top 10) et revue de code indépendante avant mise en service.
8. **Gestion des secrets** : coffre-fort (Vault/Key Vault) en production, rotation automatique.

---

## 4. Journalisation des Événements de Sécurité

| Événement | Action audit | HTTP |
|---|---|---|
| Tentative d'accès transversal | `SECURITY_TENANT_VIOLATION_BLOCKED` | 403 |
| Soumission de donnée patient bloquée | `SECURITY_PATIENT_DATA_SUBMISSION_BLOCKED` | 422 |
| Connexion réussie | `USER_LOGIN_SUCCESS` | 200 |
| Code TOTP invalide | (log applicatif) | 401 |
