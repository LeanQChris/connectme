FROM node:24-alpine AS base
WORKDIR /app

# ---------------------------------------------------------------------------
# Production dependency tree, installed before the source is copied so that a
# source edit does not invalidate the npm layer. --omit=dev keeps TypeScript,
# ESLint and Turbo out of the runtime image.
#
# Only the manifests are copied here — npm links workspace packages by path, so
# packages/<name>/ must exist even though its contents arrive later.
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# The build needs the full tree (TypeScript, Turbo, Next). It is a separate
# stage from prod-deps so the runtime image can stay pruned.
# ---------------------------------------------------------------------------
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
# npm nests workspace dependencies it cannot hoist. zod is the live example:
# the lockfile puts zod@4 at the root and zod@3.25.76 at
# packages/contracts/node_modules/zod (and apps/api/node_modules/zod). Copying
# only the root tree discards those, contracts then compiles against the
# hoisted zod@4 — whose z.record() takes two arguments — and the build dies on
# z.record(z.unknown()).
#
# The runner stage below already copies /app/apps and /app/packages for
# runtime; this is the build-time half of the same problem. `COPY . .` layers
# the source over these manifests afterwards, and node_modules is dockerignored
# so the nested trees survive it.
COPY --from=build-deps /app/apps ./apps
COPY --from=build-deps /app/packages ./packages
COPY . .
RUN npx turbo run build --filter=@connectme/api --ui=stream

FROM base AS runner
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# The app workspace carries its own nested node_modules for the same reason:
# npm places this app's zod@3.25.76 at apps/api/node_modules/zod, while the
# root zod@4 is a dev-only dependency that --omit=dev prunes. Manifests and
# nested trees come from prod-deps; compiled output is overlaid from builder.
COPY --from=prod-deps /app/apps ./apps
# Workspace packages arrive from prod-deps (manifests + any nested
# node_modules) and get their compiled output overlaid from the builder.
#
# The nested trees matter: npm does not hoist every dependency, so e.g. zod
# that @connectme/contracts resolves lives in packages/contracts/node_modules,
# not the root. Copying only the root node_modules yields an image that builds
# cleanly and then dies at runtime with MODULE_NOT_FOUND.
COPY --from=prod-deps /app/packages ./packages
COPY --from=builder /app/packages/channels/dist ./packages/channels/dist
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/crypto/dist ./packages/crypto/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

USER node
EXPOSE 8081

# Liveness only. Deliberately NOT the readiness route: a restart policy pointed
# at a dependency check turns a database blip into a restart loop.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/api/health/live >/dev/null || exit 1

CMD ["node", "apps/api/dist/main.js"]
