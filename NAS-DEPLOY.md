# Déploiement sur NAS — Portail Clients « Service du Sang »

Guide de déploiement de la stack complète sur un **NAS domestique / de petite structure** (Synology DSM, TrueNAS SCALE, QNAP).

> ⚠️ **DS218 (et modèles ARM Synology) : Docker/Container Manager n'est PAS supporté** (processeur Realtek RTD1296 ARM64). Utilisez la **§12 — Variante native sans Docker**, déployée et validée sur ce NAS.

---

## 1. Prérequis

| NAS | Solution | Remarques |
|---|---|---|
| **Synology DSM 7.x x86** | *Container Manager* (ex-Docker) | Compose v2 supporté ; dossier partagé `docker` recommandé |
| **Synology ARM (DS218…)** | **Natif (Node + PostgreSQL + MinIO)** — voir §12 | Aucun Docker disponible |
| **TrueNAS SCALE** | Apps → Docker Compose (custom app) | Stockage via datasets ZFS |
| **QNAP** | *Container Station* | Compose supporté sur les modèles récents |

Configuration minimale conseillée :
- **8 Go de RAM** (6 utilisables par les conteneurs)
- **4 vCPU** (ou 4 cœurs)
- **40 Go libres** sur le volume (images ~3 Go + données démo + pièces jointes)
- **Docker Engine ≥ 24** et **Docker Compose v2** (`docker compose` en une commande)

> Vérification : `docker compose version` doit afficher `v2.x`.

---

## 2. Récupération du code

```bash
# Via SSH sur le NAS (ou interface web selon le modèle)
cd /volume1/docker          # Synology
# ou : cd /mnt/data/apps     # TrueNAS
# ou : cd /share/Container   # QNAP

git clone git@github.com:clixite/red-cross.git sfs-portal
cd sfs-portal
```

Si le NAS n'a pas de clé SSH GitHub : `git clone https://github.com/clixite/red-cross.git` puis configurez la clé plus tard pour les mises à jour (voir §9).

---

## 3. Configuration avant premier démarrage

### 3.1 Fichier `.env` (secrets de production)

Copiez `.env.example` vers `.env` **et modifiez impérativement les secrets** :

```bash
cp .env.example .env
nano .env
```

| Variable | Valeur recommandée | Pourquoi |
|---|---|---|
| `JWT_SECRET` | 64 caractères aléatoires (`openssl rand -hex 32`) | Signature des jetons |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Identifiants MinIO forts | Accès au stockage objet |
| `DATABASE_URL` | `postgresql://sfs_user:<mot_de_passe_fort>@postgres:5432/sfs_portail?schema=public` | Accès base |
| `QUALIOS_ADAPTER` | `manual` (défaut) ou `rest` si l'API Qualios est accessible depuis le NAS | Voir §6 |
| `EMAIL_SIMULATION_MODE` | `true` tant qu'aucun SMTP n'est configuré | Les e-mails sont journalisés |
| `ANTIVIRUS_ENABLED` | `true` | Pipeline de sécurité des pièces jointes |

> Le `docker-compose.yml` livré contient des valeurs de **démonstration** : ne les laissez pas en production. Privilégiez la passe par `.env` avec un `docker-compose.override.yml` (voir §3.2) ou remplacez les valeurs directement.

### 3.2 Volumes persistants sur le NAS (important)

Par défaut la stack utilise des volumes nommés Docker (perdus lors d'un `docker compose down -v`). Sur un NAS, préférez des **montages liés** vers des dossiers partagés, pour bénéficier des **snapshots** et des sauvegardes du NAS :

Créez `docker-compose.override.yml` (fusionné automatiquement par Compose) :

```yaml
services:
  postgres:
    volumes:
      - /volume1/docker/sfs-portal/data/postgres:/var/lib/postgresql/data
  minio:
    volumes:
      - /volume1/docker/sfs-portal/data/minio:/data
  backend:
    volumes:
      - /volume1/docker/sfs-portal/data/qualios_exchange:/data/qualios_exchange
    environment:
      QUALIOS_FILE_EXCHANGE_PATH: /data/qualios_exchange
```

> Ajustez les chemins selon votre NAS (`/volume1/docker` Synology, `/mnt/data` TrueNAS, `/share/Container` QNAP). Les données (base, pièces jointes, file Qualios) survivent alors aux redémarrages et sont incluses dans les snapshots.

---

## 4. Démarrage

```bash
docker compose up -d --build
docker compose ps
```

Attendez que **tous les conteneurs soient `healthy`** (~30–60 s au premier lancement : téléchargement des images, migrations Prisma, seed des données de démo) :

```
sfs-frontend      Up x seconds (healthy)
sfs-backend       Up x seconds (healthy)
sfs-mock-qualios  Up x seconds (healthy)
sfs-postgres      Up x seconds (healthy)
sfs-minio         Up x seconds (healthy)
```

Accès :
- **Portail** : `http://<IP-DU-NAS>:3005`
- **API** : `http://<IP-DU-NAS>:4000/api/v1`
- **OpenAPI** : `http://<IP-DU-NAS>:4000/api/v1/openapi.json`
- **MinIO console** : `http://<IP-DU-NAS>:9001` (identifiants du `.env`)

> ⚠️ **Ports occupés ?** Le frontend est publié sur **3005** pour éviter le conflit classique du 3000 (autre app). Changez le mapping dans `docker-compose.yml` si nécessaire : `"3005:80"` → `"8080:80"`.

---

## 5. Accès sécurisé depuis l'extérieur (recommandé)

Ne **jamais** exposer les ports 4000/9001 directement sur Internet :

1. **Reverse proxy avec TLS** sur le NAS (Caddy, Nginx Proxy Manager, ou le proxy intégré Synology) :
   - Sous-domaine `portail.mondomaine.be` → `http://127.0.0.1:3005` (frontend)
   - Sous-domaine `api.mondomaine.be` → `http://127.0.0.1:4000` (API, optionnel si le frontend suffit)
2. **Restreindre la console MinIO (9001)** au réseau local uniquement.
3. **Firewall NAS** : n'ouvrir que le port HTTPS du proxy.
4. **MFA TOTP** : activé pour les rôles internes SFS et les référents qualité (endpoints `/auth/mfa/setup` + `/auth/mfa/confirm`).

---

## 6. Intégration Qualios depuis le NAS

| Mode | Configuration | Usage NAS |
|---|---|---|
| `manual` (défaut) | rien à faire | Le portail fonctionne à 100 % ; les agents saisissent les références NC dans la file back-office |
| `rest` | `.env` : `QUALIOS_ADAPTER=rest`, `QUALIOS_BASE_URL`, `QUALIOS_API_KEY` | Nécessite que le NAS **joigne l'API Qualios** (VPN/zone DMZ si l'API est interne au SI) |
| `file` | `.env` : `QUALIOS_ADAPTER=file`, `QUALIOS_FILE_EXCHANGE_PATH` (monté sur le NAS, voir §3.2) | Échange de fichiers CSV/XML sur un partage visible par l'équipe qualité |

> Détails et questions à poser à Qualnet : `docs/qualios-integration-contract.md`.

---

## 7. Sauvegardes & restauration

| Donnée | Emplacement NAS | Méthode |
|---|---|---|
| PostgreSQL | `/volume1/docker/sfs-portal/data/postgres` | Snapshot NAS + dump quotidien : |
| MinIO (pièces jointes) | `/volume1/docker/sfs-portal/data/minio` | Snapshot NAS + sync vers second disque |
| File Qualios | `/volume1/docker/sfs-portal/data/qualios_exchange` | Snapshot NAS |

Dump PostgreSQL (à planifier en tâche planifiée du NAS) :

```bash
docker exec sfs-postgres pg_dump -U sfs_user -d sfs_portail \
  | gzip > /volume1/docker/sfs-portal/backups/sfs_$(date +%F).sql.gz
```

**Restauration :**

```bash
gunzip -c /volume1/docker/sfs-portal/backups/sfs_AAAA-MM-JJ.sql.gz \
  | docker exec -i sfs-postgres psql -U sfs_user -d sfs_portail
```

> Les snapshots ZFS/Btrfs du NAS constituent la première ligne de défense (restauration quasi instantanée) ; le dump quotidien la seconde (restauration granulaire).

---

## 8. Supervision

- **Healthchecks** intégrés : les 5 conteneurs exposent un état `healthy` (visible dans Container Manager / Portainer).
- **API** : `GET http://localhost:4000/health` (liveness) et `/ready` (dépendances).
- **Alertes utiles** : DLQ Outbox > 10 tâches (écran *Synchronisation Qualios*), taux de respect SLA < 90 % (tableau de bord).
- **Notifications NAS** : configurez les notifications de défaillance de conteneur dans Container Manager (Synology) ou un notificateur externe.

---

## 9. Mise à jour de l'application

```bash
cd /volume1/docker/sfs-portal
git pull origin main                # ou : git fetch && git reset --hard origin/main
docker compose up -d --build        # rebuild des images modifiées
docker compose ps                   # vérification healthy
```

Les migrations Prisma s'appliquent **automatiquement au démarrage** du backend (commandes `prisma migrate deploy` dans le `Dockerfile`). Le seed est **idempotent** : les données existantes ne sont pas réinitialisées (réinitialisation volontaire : `FORCE_SEED=1` dans l'environnement du backend, puis redémarrage).

---

## 10. Dépannage fréquent

| Symptôme | Cause probable | Solution |
|---|---|---|
| `sfs-backend` unhealthy | Prisma n'a pas trouvé OpenSSL (ancienne image) | `docker compose build --no-cache backend` (l'image `node:22-slim` inclut OpenSSL) |
| `Repository not found` au `git pull` | Clé SSH du NAS absente de GitHub | `cat ~/.ssh/id_ed25519.pub` → ajouter dans GitHub → Settings → SSH keys |
| Port 3000 occupé | Autre application sur le NAS | Utiliser le port 3005 par défaut ou modifier le mapping |
| Temps d'horodatage décalé (audit) | Horloge NAS non synchronisée | Activer NTP sur le NAS (temps UTC stocké, affichage local) |
| E-mails non reçus | Mode simulation actif | `EMAIL_SIMULATION_MODE=false` + config SMTP dans `.env` ; les e-mails sont consultables dans `notification_logs` |
| Lenteur au premier démarrage | Téléchargement des images + seed | Patienter ; les démarrages suivants sont rapides |
| Données perdues après `docker compose down -v` | Volumes nommés supprimés | Utiliser les montages liés du §3.2 |

---

## 11. Sécurité — Vérifications avant mise en service

Pour les modèles ARM (DS218, DS220j…) où Docker/Container Manager est indisponible, la stack tourne nativement : **Node.js + PostgreSQL du DSM + binaire MinIO ARM64**. **Déployé et validé de bout en bout** sur le DS218 de ce projet (DSM 7.3.2, aarch64), servi sur `https://dev.kryssbee.com/croix-rouge/`.

### 12.1 Composants installés

| Composant | Emplacement NAS | Version |
|---|---|---|
| Node.js (avec npm) | `/volume1/apps/sfs-portal/node-dist` | v22.19.0 (tarball officiel linux-arm64) |
| PostgreSQL | intégré DSM (data `/var/services/pgsql`) | 11.11 |
| MinIO | `/volume1/apps/sfs-portal/minio/minio` | RELEASE.2025-09-07 (binaire ARM64) |
| Backend + seed | `/volume1/apps/sfs-portal/apps/backend` | dist compilé + prisma (moteur ARM64) |
| Scripts de démarrage | `/usr/local/etc/rc.d/sfs-portal.sh` | start/stop/restart au boot |
| Logs | `/volume1/apps/sfs-portal/logs/` | backend.log, minio.log |

### 12.2 Préparation PostgreSQL (une fois)

```sh
# Le DSM fournit postgres 11.11 (user postgres, socket trust). Créer rôle + base :
echo 'host sfs_portail sfs_user 127.0.0.1/32 trust' >> /etc/postgresql/pg_hba.conf
psql -U postgres -c 'SELECT pg_reload_conf();'
psql -U postgres -c 'CREATE ROLE sfs_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;'
psql -U postgres -c 'CREATE DATABASE sfs_portail OWNER sfs_user;'
# Vérif : psql -h 127.0.0.1 -U sfs_user -d sfs_portail -c 'SELECT 1'
```

### 12.3 Installation du code et des dépendances

```sh
mkdir -p /volume1/apps/sfs-portal
# transférer l'archive du projet (sources + apps/backend/dist + packages/domain/dist),
# puis :
export PATH=/volume1/apps/sfs-portal/node-dist/bin:$PATH
cd /volume1/apps/sfs-portal
npm ci --no-audit --no-fund
cd apps/backend
node ../../node_modules/prisma/build/index.js generate --schema=prisma/schema.prisma
DATABASE_URL='postgresql://sfs_user@127.0.0.1:5432/sfs_portail?schema=public' \
  node ../../node_modules/prisma/build/index.js migrate deploy --schema=prisma/schema.prisma
DATABASE_URL='postgresql://sfs_user@127.0.0.1:5432/sfs_portail?schema=public' node dist/scripts/seed.js
```

### 12.4 Environnement du backend (`apps/backend/.env`)

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://sfs_user@127.0.0.1:5432/sfs_portail?schema=public
JWT_SECRET=<généré : head -c 48 /dev/urandom | base64>
S3_ENDPOINT=https://dev.kryssbee.com          # → proxy nginx (voir 12.5)
S3_REGION=eu-west-1
S3_BUCKET=sfs-portal-attachments
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin123
S3_FORCE_PATH_STYLE=true
QUALIOS_ADAPTER=manual
EMAIL_SIMULATION_MODE=true
ANTIVIRUS_ENABLED=true
ANTIVIRUS_MOCK_MODE=true
```

> ⚠️ **S3_ENDPOINT doit être l'hôte PUBLIC sans préfixe de chemin** : le SDK AWS signe le chemin complet ; le proxy nginx ne doit **pas** réécrire le chemin, sinon la signature échoue (403 SignatureDoesNotMatch).

### 12.5 Reverse proxy nginx (vhost `dev.kryssbee.com`)

Dans le fichier DSM `/usr/local/etc/nginx/sites-available/<id>.w3conf` (reverse proxy), ajouter :

```nginx
location /api/ {
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://localhost:4000;
}

location ^~ /sfs-portal-attachments {
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://localhost:9000;   # MinIO — chemin préservé (signature AWS)
}
```

Puis `nginx -t && nginx -s reload`. ⚠️ DSM régénère ces fichiers lors d'une modification du reverse proxy dans le GUI : re-appliquer si besoin.

### 12.6 Démarrage automatique (boot)

`/usr/local/etc/rc.d/sfs-portal.sh` (voir §12.1) : lance MinIO puis le backend au démarrage du NAS ; `stop` / `restart` manuels possibles. Pensez à `chown kryss:users` les dossiers de l'app.

### 12.7 Vérification (parcours complet validé)

```sh
curl -s http://127.0.0.1:4000/health                      # {"status":"HEALTHY",...}
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9000/minio/health/live   # 200
# Depuis un navigateur :
#   https://dev.kryssbee.com/croix-rouge/   → SPA
#   login declarant@chu-liege.be / DemoPass2025!
#   déclaration produit → SFS-AAAA-NNNNN → suivi → doc téléchargeable (URL signée)
```

### 12.8 Limites connues (variante native)

- **Pièces jointes** : téléchargement via URL pré-signée `https://dev.kryssbee.com/sfs-portal-attachments/...` (fonctionne LAN + Internet via le proxy). L'upload pièces jointes passe par `/api/v1/attachments/upload` (backend → MinIO local) — OK.
- **Documents seedés** : les PDF sont des **placeholders générés** (aucune donnée réelle), uploadés via script (voir `scripts/nas-minio-seed-docs.js`).
- **Performance** : ARM 4 cœurs — npm ci et Prisma sont lents au premier déploiement ; le runtime est fluide pour la volumétrie cible (~600 utilisateurs / 300 réclamations/an).
- **Qualios** : adaptateur `manual` (file back-office) — le portail est 100 % fonctionnel sans l'API Qualios.

---

## 12. Variante NATIVE sans Docker (Synology ARM — DS218 validé)

- [ ] Secrets modifiés dans `.env` (JWT, S3, PostgreSQL) — aucun secret de démo conservé
- [ ] Accès HTTPS uniquement (reverse proxy) ; console MinIO en réseau local
- [ ] MFA TOTP activé sur les comptes internes SFS et référents qualité
- [ ] Sauvegardes testées (exercice de restauration)
- [ ] Les données de démo sont **fictives** — vérifier qu'aucune donnée réelle ne circule avant usage en conditions réelles
- [ ] Revue des journaux de sécurité (`SECURITY_*` dans la piste d'audit) hebdomadaire
