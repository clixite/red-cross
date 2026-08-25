FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/domain/package.json ./packages/domain/
COPY apps/mock-qualios/package.json ./apps/mock-qualios/
RUN npm ci
COPY packages/domain ./packages/domain
COPY apps/mock-qualios ./apps/mock-qualios
RUN npm run build --workspace=@sfs/mock-qualios

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/mock-qualios/dist ./dist
EXPOSE 4010
CMD ["node", "dist/server.js"]
