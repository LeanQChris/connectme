<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# ConnectMe

Multi-tenant omnichannel inbox (WhatsApp, Messenger, Instagram, Telegram, Discord). Turborepo monorepo, NestJS API + worker, Next.js web, Postgres (TypeORM), Redis (BullMQ).

`README.md` documents the architecture and setup; `docs/SAAS_ARCHITECTURE_PLAN.md` is the target architecture blueprint; `docs/SCHEDULING_PLAN.md` documents post/message scheduling (status in §9). Trust scripts/config over the README prose.

## Layout

- `apps/api` — NestJS (Clean Architecture: `domain` / `application` / `infrastructure` / `presentation`). HTTP + Socket.IO + webhooks. `synchronize: true` unless `NODE_ENV=production`.
- `apps/worker` — NestJS application context (no HTTP). BullMQ processors. **`synchronize: false`** — the API owns schema sync.
- `apps/web` — Next.js 16 App Router. Feature code lives under `apps/web/modules/<feature>/{api,components,data,hooks}`; `/api/*` is proxied to the API via `next.config.ts` rewrites.
- `packages/database` — TypeORM entities + `AppDataSource` + migrations (no `prisma`, despite older docs).
- `packages/contracts` — shared zod schemas/DTOs. `packages/crypto` — AES-256-GCM + HMAC. `packages/channels` — channel clients + `AesVaultService`.
- `packages/eslint-config`, `packages/typescript-config` — shared configs.

## Shared packages: build before running apps

`packages/{database,channels,contracts,crypto}` publish compiled `dist/` (via `tsconfig.build.json`) and their `package.json` `main`/`exports` point at `dist/`. `dist/` is gitignored.

- Packages must be built before `node apps/api/dist/main.js` or the worker will run. `turbo run build` orders this via `dependsOn: ["^build"]`.
- **`turbo dev` does not build deps** — run `npm run build` once (or build the packages) before `npm run dev`.
- If Node reports `ERR_MODULE_NOT_FOUND`/`ERR_UNSUPPORTED_DIR_IMPORT` for a `@connectme/*` package, its `dist/` is stale → rebuild it.

## Commands (run from repo root)

- `npm run dev` — all apps; or `dev:api`, `dev:worker`, `dev:web`.
- `npm run build` — builds shared packages first, then apps.
- `npm run lint` / `npm run check-types` / `npm test` — turbo fan-out.
- Single workspace: `npx turbo run <task> --filter=@connectme/api`.
- API tests only: `npx turbo run test --filter=@connectme/api` (node:test via `tsx`; add a file to run one).
- DB: `npm run db:sync` (schema sync) / `npm run db:migrate` (run migrations).

## Infra & env

- Postgres + Redis for local dev: `docker-compose.yml` (`docker compose up -d`).
- Each app loads `.env.local` then `.env` from its own directory. Per-app templates: `apps/api/.env.example`, `apps/worker/.env.example`, `apps/web/.env.example`; root `.env.example` is an index only.
- `ENCRYPTION_KEY` (AES master key) must be **identical** in api and worker — they decrypt the same tenant tokens.
- `REDIS_URL` is required for scheduling; it is NOT the old in-memory store. If Redis is down, `POST /api/scheduled-*` returns 503 by design.
- Web→API base URL is `NEXT_PUBLIC_API_URL` (falls back to `http://localhost:4000`).

## Conventions & gotchas

- Multi-tenancy is enforced by `tenantId` scoping in every repository call; resolve it from the `x-tenant-id` header (fallback: default tenant). Never add an unscoped query.
- Facebook Pages are modeled as `ChannelType.MESSENGER` (the Page's token). Post scheduling for a Page uses the MESSENGER channel + `FacebookPostClient`.
- Migrations live in `packages/database/src/migrations/`; add one per schema change (dev may rely on `synchronize`, but production uses migrations).
- Meta 24h reply window is re-checked at send time; Messenger/Instagram can fall back to the `HUMAN_AGENT` message tag, WhatsApp cannot (template required).
- Instagram has no native scheduling (media containers expire ~24h) — posts are published system-side by the worker at fire time and require a public media URL (S3/R2 presign).
- CI (`.github/workflows/ci.yml`, Node 24) runs `check-types` → `test` → `build`. `next dev`/`turbo` re-add the managed blocks above; keep them committed.

## Verify

`npx turbo run lint check-types test` plus `npm run build` are the pre-commit bar. Prefer `--force` on `check-types`/`lint` when a turbo cache hit hides new errors.
