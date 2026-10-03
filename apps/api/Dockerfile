FROM node:24-alpine AS builder

WORKDIR /app

COPY . .

RUN npm ci
RUN npx turbo run build --filter=@connectme/api --ui=stream

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 8081

CMD ["node", "apps/api/dist/main.js"]
