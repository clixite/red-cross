FROM node:22-slim AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build --workspace=@sfs/domain && npm run build --workspace=@sfs/backend

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
EXPOSE 4000
# Démarrage : migrations Prisma, jeu de données de démo (idempotent), puis serveur
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/scripts/seed.js && node dist/server.js"]
