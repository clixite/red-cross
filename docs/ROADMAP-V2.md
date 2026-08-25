# Roadmap V2 & Dette Assumée — Portail « Service du Sang »

Hors périmètre v1, dette technique assumée et évolutions planifiées.

---

## 1. Hors Périmètre v1 (Décisions du Brief)

| Sujet | Pourquoi hors v1 | Évolution V2 |
|---|---|---|
| **Commandes de produits sanguins** | Les commandes passent par les canaux existants (fax, tél, application dédiée) | Module commande intégré au portail avec validation pharmacien |
| **Facturation** | Le SFS facture via l'ERP ; seul le suivi des litiges facturation est dans le portail | Connecteur ERP (EDI/UBL) avec affichage des factures |
| **Résultats d'analyses patients** | Données de santé nominatives hors périmètre RGPD du portail | Portail patient séparé, cloisonné |
| **E-learning** | Contenu pédagogique statique suffisant | Modules SCORM avec attestations |
| **Application mobile native** | SPA responsive couvre l'usage tablette/postes | PWA puis apps natives (React Native) |
| **Chat temps réel** | Fil de discussion asynchrone conforme aux exigences d'audit | WebSocket/SignalR avec horodatage scellé |
| **Signature électronique qualifiée** | Non requis pour les réclamations v1 | eIDAS/QES sur les conclusions CAPA |

## 2. Évolutions Fonctionnelles V2 (Priorisées)

1. **P2 — Rate limiting & verrouillage progressif** (prérequis production).
2. **P2 — Rotations/révocation de sessions JWT** (jti + liste de révocation).
3. **P2 — Antivirus réel (ClamAV)** et analyse asynchrone des pièces jointes.
4. **P2 — SSO fédéré (OIDC/SAML)** branché sur l'abstraction fournie (fédérations hospitalières : AAF, HELMO, éducation).
5. **P3 — Webhooks Qualios sortants** (si l'éditeur les expose) pour remplacer le pull incrémental.
6. **P3 — Rapport de réconciliation nocturne automatisé** envoyé par email au responsable qualité.
7. **P3 — Tableau de bord temps réel** (métriques push, graphiques).
8. **P3 — Export XLSX multi-feuilles** pour les indicateurs direction.
9. **P4 — Notifications e-mail réelles (SMTP)** : le prototype journalise les e-mails (`notification_logs`) ; brancher un MTA (Mailhog en démo, SMTP relais en production).

## 3. Dette Technique Assumée (Documentée)

| Dette | Impact | Plan de remboursement |
|---|---|---|
| Antivirus mock (EICAR uniquement) | Risque résiduel malware en production | Intégration ClamAV (V2-P2) |
| Rate limiting absent | Risque de brute-force sur `/auth/login` | V2-P1 immédiat avant tout déploiement |
| JWT stateless sans révocation | Un compte compromis reste valide 8h | V2-P2 |
| Couverture `apps/backend` sans seuil CI strict | Régression possible | Seuils de couverture dans la CI (V2-P3) |
| Pas de tests E2E navigateur (Playwright) | L'UX n'est pas pilotée par tests | V2-P3 |
| URL pré-signées S3 = backend unique | Pas de CDN privé | CloudFront/equinix UE (V2-P3) |
| Modèle d'audit « append-only applicatif » | Pas de scellement cryptographique chaîné | Chaîne de hachage (hash-chain) V2-P4 |
| Seeder non purgé des données E2E | Les tests E2E laissent des données de test | Nettoyage par transactions rollback (V2-P3) |

## 4. Évolutions Qualios

- Activer la **réconciliation automatique** (job nocturne) avec rapport d'écarts.
- Mapper les **champs personnalisés Qualios** (`ChampPersonnalise_RefPortail`) pour la réconciliation bidirectionnelle.
- Négocier l'accès **webhook** ou le **polling incrémental** avec l'éditeur Qualnet (voir `docs/qualios-integration-contract.md`).

## 5. Critères de Sortie de V1 → Production

1. Rate limiting + verrouillage progressif actifs.
2. Antivirus réel opérationnel.
3. Tests d'intrusion (OWASP Top 10) sans vulnérabilité critique.
4. DTA signé avec hébergeur UE et éditeur Qualios.
5. Exercice de restauration validé.
6. Validation du pharmacien biologiste (recette métier sur les 7 parcours).
