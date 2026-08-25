FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/domain/package.json ./packages/domain/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm ci
COPY packages/domain ./packages/domain
COPY apps/frontend ./apps/frontend
RUN npm run build --workspace=@sfs/frontend

FROM nginx:1.25-alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
