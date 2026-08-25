FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/domain/package.json ./packages/domain/
COPY apps/backend/package.json ./apps/backend/
RUN npm ci
COPY packages/domain ./packages/domain
COPY apps/backend ./apps/backend
RUN npm run build --workspace=@sfs/backend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/server.js"]
