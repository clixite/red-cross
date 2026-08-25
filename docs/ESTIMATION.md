# Estimation de Charge — Prototype → Production (Portail « Service du Sang »)

Estimation en **jours-homme (JH)** et en fourchettes de coût pour faire passer le prototype livré à une mise en production conforme (hébergement, sécurité, intégration Qualios, recette, maintenance). Hypothèses : équipe mixte interne (référent qualité, DSI) + prestataire belge ; tarif journalier moyen prestataire **650–850 €/JH** (2025).

---

## 1. Synthèse

| Poste | JH (min) | JH (max) | Coût (min) | Coût (max) |
|---|---|---|---|---|
| Durcissement sécurité & conformité | 20 | 30 | 13 000 € | 25 500 € |
| Intégration Qualios (selon scénario) | 10 | 35 | 6 500 € | 29 750 € |
| Développement complémentaire & finitions | 15 | 25 | 9 750 € | 21 250 € |
| Recette métier & validation (AFMPS/BPF) | 10 | 15 | 6 500 € | 12 750 € |
| Hébergement & mise en exploitation | 8 | 12 | 5 200 € | 10 200 € |
| Pilotage, documentation, formation | 7 | 10 | 4 550 € | 8 500 € |
| **TOTAL PROJET (one-shot)** | **70** | **127** | **45 500 €** | **107 950 €** |
| **Maintenance annuelle** | 25 | 40 | 16 250 € | 34 000 € |

> Fourchette réaliste : **55 000 € – 110 000 €** de projet, **20 000 € – 35 000 €** de maintenance annuelle.

---

## 2. Détail des Postes

### 2.1 Durcissement Sécurité & Conformité (20–30 JH)
- Rate limiting, verrouillage progressif, révocation de sessions : 5–8 JH.
- Antivirus réel (ClamAV / Defender) + pipeline async : 4–6 JH.
- Signature temporelle qualifiée (RFC 3161) sur exports d'audit : 3–5 JH.
- Test d'intrusion (OWASP Top 10) + corrections : 5–8 JH.
- DTA, AIPD complétée, revue des durées de conservation : 3–3 JH.

### 2.2 Intégration Qualios (selon scénario — voir `qualios-integration-contract.md`)

| Scénario | JH | Coût prestataire | Coût licence éditeur (estimé) | Charge interne |
|---|---|---|---|---|
| **1. API REST** | 15–20 | 9 750 – 17 000 € | 3 000 – 8 000 €/an | Faible |
| **2. Fichiers batch SFTP/CSV** | 15–25 | 9 750 – 21 250 € | 1 500 – 4 000 €/an | Moyenne |
| **3. Mode manuel assisté** | 10–15 | 6 500 – 12 750 € | 0 € | Élevée (saisie) |

> L'écart de coût dépend de la réponse de Qualnet (existence API, webhooks, coût licence d'interfaçage).

### 2.3 Développement Complémentaire (15–25 JH)
- Dashboard temps réel & exports XLSX : 4–6 JH.
- SSO OIDC/SAML branché sur l'abstraction : 5–8 JH.
- Emails SMTP réels + templates validés : 3–4 JH.
- Tests E2E navigateur (Playwright) sur les 7 parcours : 3–7 JH.

### 2.4 Recette Métier (10–15 JH)
- Parcours des 7 scénarios avec le pharmacien biologiste référent : 5–8 JH.
- Jeu d'essai avec les banques de sang pilotes (2 établissements) : 3–4 JH.
- Revue AFMPS / conformité BPF & hémovigilance : 2–3 JH.

### 2.5 Hébergement & Exploitation (8–12 JH)
- Provisionnement VM UE (ou cloud souverain), TLS, WAF : 3–4 JH.
- Sauvegardes PITR, supervision, alerting, runbooks : 3–5 JH.
- Exercice de restauration : 2–3 JH.

### 2.6 Maintenance Annuelle (25–40 JH)
- Correctifs & mises à jour de sécurité (mensuelles) : 12–18 JH.
- Évolution mineure (référentiels, rapports) : 8–12 JH.
- Supervision & revue des journaux de sécurité : 5–10 JH.

---

## 3. Hypothèses

1. Le prototype livré couvre déjà : multi-tenant, MFA TOTP, machine à états testée, Outbox/idempotence, 3 adaptateurs Qualios, jeu de données 60 réclamations, tests E2E des 7 parcours, a11y axe-core.
2. Tarif prestataire belge moyen : 650–850 €/JH ; coût interne non chiffré (temps du référent qualité et de la DSI).
3. Coût licence Qualios d'interfaçage à confirmer par Qualnet (fourchette indicative).
4. Hébergement : VM UE standard (2+2 vCPU/RAM) — ~300–600 €/mois + stockage objet.
5. Aucun coût SaaS payant ni CDN externe (contrainte du brief).

## 4. Recommandation

1. **Décision rapide attendue :** scénario d'intégration Qualios (REST recommandé) et existence de l'API.
2. **Prérequis production non négociables :** rate limiting, antivirus réel, test d'intrusion.
3. **Budget conseillé :** provisionner **85 000 €** (projet) + **28 000 €/an** (maintenance), ajustable selon la réponse Qualnet.
