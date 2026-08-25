FROM node:22-slim AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build --workspace=@sfs/domain && npm run build --workspace=@sfs/backend

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
# OpenSSL requis par le moteur Prisma (query engine)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
# Package partagé @sfs/domain (workspace symlink dans node_modules)
COPY --from=builder /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist
EXPOSE 4000
# Démarrage : migrations Prisma, jeu de données de démo (idempotent), puis serveur
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/scripts/seed.js && node dist/server.js"]
