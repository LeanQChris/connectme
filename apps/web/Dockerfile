FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN npm ci
RUN npm run build --workspace=@connectme/web

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY packages/ ./packages/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY apps/web/package.json ./apps/web/package.json

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=@connectme/web"]
