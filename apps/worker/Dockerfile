FROM node:24-alpine AS base
WORKDIR /app

# Production-only dependency tree, cached independently of the source.
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
COPY packages/channels/package.json ./packages/channels/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN npm ci --omit=dev

# The build needs the full tree (TypeScript, Turbo, Nest CLI).
FROM base AS build-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
COPY packages/channels/package.json ./packages/channels/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN npm ci

FROM base AS builder
COPY --from=build-deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo run build --filter=@connectme/worker --ui=stream

FROM base AS runner
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# App workspace manifests + nested node_modules; see apps/api/Dockerfile.
COPY --from=prod-deps /app/apps ./apps
# Workspace packages: manifests + nested node_modules from prod-deps, compiled
# output overlaid from the builder. See the note in apps/api/Dockerfile.
COPY --from=prod-deps /app/packages ./packages
COPY --from=builder /app/packages/channels/dist ./packages/channels/dist
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/crypto/dist ./packages/crypto/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

USER node

# The worker is a headless application context with no HTTP server, so there is
# nothing to probe. Docker's own process supervision is the only liveness
# signal it has — do not add a HEALTHCHECK here that assumes a port.

CMD ["node", "apps/worker/dist/main.js"]
