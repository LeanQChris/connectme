FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

RUN npm ci
RUN npm run build --workspace=@connectme/worker

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY packages/ ./packages/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY apps/worker/package.json ./apps/worker/package.json

CMD ["node", "apps/worker/dist/main.js"]
