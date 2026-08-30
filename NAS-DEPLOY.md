# Déploiement sur NAS — Portail Clients « Service du Sang »

Guide de déploiement de la stack complète sur un **NAS domestique / de petite structure** (Synology DSM, TrueNAS SCALE, QNAP). Le portail est conçu pour tourner en Docker : il s'installe sur n'importe quel NAS supportant Docker + Docker Compose.

---

## 1. Prérequis

| NAS | Solution Docker | Remarques |
|---|---|---|
| **Synology DSM 7.x** | *Container Manager* (ex-Docker) | Compose v2 supporté ; dossier partagé `docker` recommandé |
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

- [ ] Secrets modifiés dans `.env` (JWT, S3, PostgreSQL) — aucun secret de démo conservé
- [ ] Accès HTTPS uniquement (reverse proxy) ; console MinIO en réseau local
- [ ] MFA TOTP activé sur les comptes internes SFS et référents qualité
- [ ] Sauvegardes testées (exercice de restauration)
- [ ] Les données de démo sont **fictives** — vérifier qu'aucune donnée réelle ne circule avant usage en conditions réelles
- [ ] Revue des journaux de sécurité (`SECURITY_*` dans la piste d'audit) hebdomadaire
