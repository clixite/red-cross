# Portail Clients B2B — Service du Sang (Croix-Rouge de Belgique)

Portail multilingue (FR/NL/EN) destiné aux clients professionnels d'un établissement de transfusion sanguine : banques de sang hospitalières, laboratoires de recherche, établissements d'enseignement et praticiens.

- 📄 Bibliothèque documentaire qualité contrôlée (synchronisée depuis Qualios)
- ⚠️ Déclaration de réclamations réglementées avec traçabilité produit ISBT 128
- 🔄 Suivi de dossier avec machine à états, SLA opposables et fil d'échanges
- 📊 Back-office SFS complet : recevabilité, investigation, conclusion, clôture, tableaux de bord
- 🔗 Couche d'intégration Qualios (3 adaptateurs) avec synchronisation Outbox
- 🛡️ Piste d'audit inaltérable, cloisonnement multi-tenant strict, protection RGPD

---

## 1. Démarrage Rapide (une seule commande)

```bash
docker compose up --build
```

Cette commande démarre l'ensemble de la plateforme :
| Service | URL | Rôle |
|---|---|---|
| **Frontend (SPA)** | http://localhost:3000 | Portail clients & back-office SFS |
| **API REST v1** | http://localhost:4000/api/v1 | Backend Express |
| **OpenAPI 3.1** | http://localhost:4000/api/v1/openapi.json | Spécification générée |
| **Mock Qualios** | http://localhost:4010 | Simulateur QMS Qualnet |
| **MinIO Console** | http://localhost:9001 | Stockage objets (minioadmin / minioadmin123) |
| **PostgreSQL** | localhost:5432 | Base relationnelle |

> Les migrations Prisma et le jeu de données de démonstration sont appliqués automatiquement au premier démarrage (idempotent : réinitialisation avec `FORCE_SEED=1`).

---

## 2. Comptes de Démonstration (un par rôle)

**Mot de passe commun : `DemoPass2025!`**

| Rôle | Email | Périmètre |
|---|---|---|
| **Déclarant** (Banque de Sang) | `declarant@chu-liege.be` | Déclare & suit ses réclamations |
| **Référent Qualité** client | `qualite@chu-liege.be` | Vue complète de l'organisation + invitations |
| **Lecteur Documentaire** | `lecteur@univ-bruxelles.be` | Documentation seulement |
| **Agent Réception SFS** | `reception@service-du-sang.be` | Réception, qualification, compléments |
| **Responsable Qualité SFS** | `responsable.qualite@service-du-sang.be` | Instruction complète jusqu'à clôture |
| **Administrateur SFS** | `admin@service-du-sang.be` | Référentiels, organisations, DLQ |
| **Direction SFS (KPI)** | `direction@service-du-sang.be` | Tableaux de bord & exports |

L'écran de connexion propose des boutons « Tester » qui pré-remplissent chaque compte.

---

## 3. Parcours de Démonstration (10 minutes)

1. Connectez-vous avec `declarant@chu-liege.be`.
2. Déclarez une réclamation « Produit Sanguin » : saisissez un numéro de don (`BE999925000001`), un code produit (`E0388V00`), une température hors plage (`12.8°C`), puis soumettez.
3. Notez le numéro `SFS-AAAA-NNNNN`, l'accusé de réception et les dates cibles SLA.
4. Déconnectez-vous, connectez-vous en `responsable.qualite@service-du-sang.be`, traitez le dossier jusqu'à la clôture (recevabilité → investigation → complément → conclusion → clôture).
5. Consultez l'onglet **Synchronisation Qualios** (journal Outbox), le **Tableau de bord** et la **Piste d'audit**.

Le script complet se trouve dans [`docs/DEMO.md`](docs/DEMO.md).

---

## 4. Commandes Utiles (développement local)

```bash
# Installation des dépendances (workspaces npm)
npm install

# Tests unitaires & intégration (tous les workspaces)
npm test

# Tests avec couverture
npm run test:coverage --workspace=packages/domain
npm run test:coverage --workspace=apps/backend

# Typecheck & Lint
npm run typecheck
npm run build

# Base de données locale (sans Docker complet)
npm run seed --workspace=@sfs/backend   # nécessite DATABASE_URL

# Serveurs de dev
npm run start:mock    # Mock Qualios (port 4010)
npm run start:backend # API (port 4000)
npm run start:frontend# SPA (port 3000)
```

---

## 5. Structure du Dépôt

```
├── apps/
│   ├── backend/          # API REST v1, domaine applicatif, intégration Qualios
│   ├── frontend/         # SPA React + Vite + Tailwind (FR/NL/EN, WCAG AA)
│   └── mock-qualios/     # Simulateur QMS Qualios (modes de défaillance)
├── packages/
│   └── domain/           # Machine à états, validations ISBT 128/NISS, SLA, RBAC
├── docs/                 # Documentation réglementaire et d'exploitation
└── docker-compose.yml    # Stack complète en une commande
```

## 6. Documents de Référence

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — vue d'ensemble et choix de stack
- [`DECISIONS.md`](DECISIONS.md) — registre ADR (décisions à valider par le métier)
- [`docs/MODELE-DONNEES.md`](docs/MODELE-DONNEES.md) — entités et contraintes
- [`docs/MATRICE-DROITS.md`](docs/MATRICE-DROITS.md) — RBAC & isolation multi-tenant
- [`docs/qualios-integration-contract.md`](docs/qualios-integration-contract.md) — contrat d'interfaçage Qualnet
- [`docs/SECURITE.md`](docs/SECURITE.md) — mesures OWASP ASVS
- [`docs/RGPD.md`](docs/RGPD.md) — conformité données de santé
- [`docs/EXPLOITATION.md`](docs/EXPLOITATION.md) — hébergement & supervision
- [`docs/DEMO.md`](docs/DEMO.md) — script de démonstration
- [`docs/ESTIMATION.md`](docs/ESTIMATION.md) — estimation production

---

## 7. Avertissement Légal

Ce projet est une **démonstration technique**. Toutes les organisations, personnes, numéros de don et données sont **fictifs**. L'emblème de la croix rouge, juridiquement protégé par les Conventions de Genève, n'est **pas** reproduit : l'identité visuelle est un placeholder textuel neutralisé et paramétrable via les jetons CSS.
