# Rapport de Synthèse — Portail Clients « Service du Sang »

**Date :** livraison du prototype v1  
**Périmètre :** brief complet — portail B2B multi-tenant, multilingue (FR/NL/EN), documentation contrôlée, réclamations réglementées, back-office SFS, intégration Qualios, documentation réglementaire.

---

## 1. Ce Qui Est Fait (Fonctionnel, Testé, Exécutable)

| Composant | État | Preuve |
|---|---|---|
| Stack complète `docker compose up` | ✅ | Postgres + MinIO + Mock Qualios + Backend + Frontend ; migrations & seed automatiques |
| Espace client (docs, déclaration, suivi) | ✅ | 7 parcours E2E passants (`apps/backend/tests/e2e/parcours.test.ts`) |
| Back-office SFS (workflow complet) | ✅ | Machine à états formelle, recevabilité, investigation, conclusion, clôture |
| Intégration Qualios (3 adaptateurs) | ✅ | Port stable + `rest`/`file`/`manual`, Outbox transactionnel, idempotence, DLQ, réconciliation |
| Mock Qualios avec modes de défaillance | ✅ | Latence, 500, 429, 404, réponse partielle (`apps/mock-qualios`) |
| Multi-tenant strict + RBAC | ✅ | 403 explicites testés, matrice 7 rôles × 21 actions |
| Sécurité (ASVS 2) | ✅ (prototype) | Invitation, bcrypt, JWT, MFA TOTP, anti-NISS bloquant, antivirus (EICAR), audit append-only signé SHA-256 |
| i18n FR/NL/EN | ✅ | Tests de complétude des clés ; aucune chaîne en dur |
| Accessibilité WCAG 2.1 AA | ✅ | Tests axe-core sur les écrans principaux |
| Jeu de données de démonstration | ✅ | 12 organisations, 23 utilisateurs, 39 documents (1 retiré), 60 réclamations sur 14 mois |
| Couverture | ✅ | Domaine 97,9 % global ; machine à états réclamation 96,2 % (cible ≥ 90 %) |
| Documentation | ✅ | 11 livrables à la racine et dans `docs/` |

## 2. Ce Qui Est Simulé (à remplacer en production)

1. **Antivirus** : détection de la signature EICAR et blocage d'extensions — remplaçable par ClamAV (interface `AntivirusService`).
2. **E-mails** : journalisés en base (`notification_logs`) et affichés dans les logs — SMTP réel à brancher (mode `EMAIL_SIMULATION_MODE`).
3. **Qualios** : adaptateur `rest` branché sur le mock local — la vraie API Qualnet reste à connecter (contrat fourni).
4. **Stockage** : MinIO local — S3 UE en production (même SDK).
5. **SSO** : abstraction OIDC/SAML prête avec fournisseur mock — fédérations hospitalières à intégrer.

## 3. Hypothèses les Plus Risquées

| # | Hypothèse | Risque | Mitigation |
|---|---|---|---|
| 1 | L'API Qualios (Qualnet) existera sous forme REST | **Élevé** | Mode `manual` 100 % fonctionnel ; contrat envoyé à l'éditeur |
| 2 | Format ISBT 128 belge (DIN, codes produit) conforme aux données réelles | Moyen | Validations paramétrables ; avertissements plutôt que blocage des codes inconnus |
| 3 | SLA : 2 jours ouvrés (recevabilité) et 30 jours calendrier (réponse) | Moyen | Jours fériés belges calculés (Pâques, Ascension) ; suspension de SLA tracée |
| 4 | Volumétrie ~300 réclamations/an, ~600 utilisateurs | Faible | Dimensionnement prévu (voir `EXPLOITATION.md`) |
| 5 | Pas de donnée patient transitant par le portail | Faible (mesuré) | Détection heuristique bloquante testée ; aucune champ nominatif possible |

## 4. Les 5 Décisions que le Métier Doit Trancher en Priorité

1. **Mode d'hébergement du portail** : sous-domaine `portail.*` (recommandé, ADR-001) et choix de l'hébergeur UE.
2. **Scénario d'intégration Qualios** : REST (recommandé) vs fichiers batch vs manuel — impact délai/coût (§4 de `qualios-integration-contract.md`).
3. **Coût et modalités de la licence d'interfaçage Qualnet** (à négocier avec l'éditeur).
4. **Durées de conservation** des réclamations (10 ans proposé) et politique de purge des comptes inactifs (24 mois proposé) — à valider par le référent qualité et le DPO.
5. **Liste des établissements pilotes** (2 banques de sang + 1 université) pour la recette métier des 7 parcours.

## 5. Ce Qui Manque Avant une Mise en Production Réelle

1. **Sécurité** : rate limiting, verrouillage progressif, révocation de session, antivirus réel, test d'intrusion (détail : `docs/SECURITE.md` §3).
2. **Intégration Qualios réelle** (selon décision §4) + réconciliation nocturne automatisée.
3. **Emails SMTP réels** et templates validés par la communication.
4. **DTA** avec l'hébergeur UE et avec Qualnet ; AIPD complétée et validée par le DPO.
5. **Recette métier** avec le pharmacien biologiste référent et les établissements pilotes (7 parcours).
6. **Gouvernance des données** : politique de purge, exercice de restauration, revue trimestrielle des journaux de sécurité.

## 6. Chiffres Clés du Prototype

- 48 tests automatisés (21 domaine + 22 backend dont 9 E2E + 5 frontend) — tous verts.
- Couverture : **97,9 %** (domaine), **96,2 %** (machine à états réclamation), 100 % (anti-NISS, SLA).
- 60 réclamations démo, 12 organisations, 3 langues, 2 thèmes (clair/sombre WCAG AA).
