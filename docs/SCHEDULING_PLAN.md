# ConnectMe — Scheduling Plan

> Scope: **post scheduling** (publish to a connected Page/profile) and **message scheduling** (deliver a DM later in an existing conversation).
>
> Delivery shape: **Phase 1 = API + infrastructure**, **Phase 2 = web integration**.
>
> Out of scope for now (deferred): WhatsApp, Telegram, Discord, X, LinkedIn, TikTok. See [Deferred platforms](#deferred-platforms).

---

## 1. Goal & non-goals

### Goals

- Let a tenant schedule a **Facebook Page post** (native platform scheduling).
- Let a tenant schedule an **Instagram post** (system-side delivery).
- Let a tenant schedule a **Messenger / Instagram DM** (system-side delivery, respects Meta's 24-hour window).
- Central queue + history for all scheduled items, with cancel and edit.
- Multi-tenant safe: every read/write scoped by `tenantId`.

### Non-goals (this plan)

- WhatsApp status/broadcast (not exposed by Cloud API).
- X, LinkedIn, TikTok, Threads, YouTube, Pinterest (see deferral section).
- Recurring / recurring-campaign scheduling (single one-off sends only).
- A/B testing or approval workflows.

---

## 2. Capability summary

| Platform | Post scheduling | How | Message scheduling | How |
| :--- | :--- | :--- | :--- | :--- |
| **Facebook Page** | ✅ Native | `POST /{page-id}/feed`, `published=false`, `scheduled_publish_time` (10 min–75 d) | ✅ System-side | Worker fires at time; 24 h window + `MESSAGE_TAG` fallback |
| **Instagram** | ✅ System-side | Create container + publish at fire time (container expires ~24 h) | ✅ System-side | Worker fires at time; 24 h window + `MESSAGE_TAG` fallback |
| **Messenger** | — (no feed) | — | ✅ System-side | Worker fires at time; 24 h window + `MESSAGE_TAG` fallback |

**Achievability:** Facebook is low risk and native. Instagram and DMs need a media host (public URL) and Meta App Review permissions. The biggest external risk is App Review, not code.

**Required Meta permissions:** `pages_manage_posts`, `instagram_content_publish`, `instagram_manage_messages`, `pages_messaging`.

**Required infrastructure:** publicly reachable media storage (Cloudflare R2 or S3). Local `apps/api/uploads` will not work for Instagram/Page media posts.

---

## 3. Target architecture

```
┌────────────────────────── apps/api (producer) ──────────────────────────┐
│  POST /api/scheduled-posts      POST /api/scheduled-messages            │
│            │                              │                             │
│            ▼                              ▼                             │
│   SchedulePostUseCase / ScheduleMessageUseCase                          │
│            │                                                             │
│            ├── NATIVE (Facebook) ─▶ platform API now, store post id     │
│            │                                                             │
│            └── LOCAL (Instagram/DM) ─▶ persist row + enqueue BullMQ     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ BullMQ queue: outbound-scheduler
                                    │ jobId = scheduledItem.id, delay = fireAt - now
                                    ▼
┌────────────────────────── apps/worker (consumer) ───────────────────────┐
│  OutboundSchedulerProcessor                                              │
│    1. reload row → must be PENDING                                       │
│    2. idempotency lock (IdempotencyLockService)                          │
│    3. refresh token if expiring                                          │
│    4. publish via packages/channels adapter                              │
│    5. update status + broadcast to tenant socket room (InboxRealtime)    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key decisions

1. **Create `packages/channels`.** Move `apps/api/src/infrastructure/channels/*` and `AesVaultService` there so both `apps/api` and `apps/worker` share one implementation. The worker cannot import from `apps/api`.
2. **Add BullMQ producer to `apps/api`.** `apps/api/package.json` currently has no `bullmq`/`@nestjs/bullmq`; the worker does.
3. **Strategy per channel:** `ScheduleStrategy { nativeSupported, submit(), cancel(), publishAtFireTime() }`. Facebook = native; Instagram/DM = local.
4. **Exactly-once:** BullMQ `jobId = scheduledItem.id` plus the existing `IdempotencyLockService` (`apps/api/src/infrastructure/redis/idempotency-lock.service.ts`).
5. **Redis is mandatory for scheduling.** `RedisService` has an in-memory fallback (`apps/api/src/infrastructure/redis/redis.service.ts:8`). Delayed jobs must never run against the fallback — fail fast if Redis is unavailable.

---

## 4. Phase 1 — API + infrastructure

### 4.1 Shared channels package

- Create `packages/channels`.
- Move `apps/api/src/infrastructure/channels/{channel-adapter.interface.ts,meta/*,telegram/*,discord/*}` into it, plus `AesVaultService`.
- Add new publishers:
  - `facebook-post.client.ts` — feed post, native scheduled submit, cancel, `getPostStatus`.
  - `instagram-post.client.ts` — two-step container + publish; validates container not older than 24 h.
- Update `apps/api` and `apps/worker` dependencies to `"@connectme/channels": "*"`.

### 4.2 Database entities (`packages/database/src/entities/`)

No enum changes needed for this phase (only MESSENGER + INSTAGRAM + `ChannelType` already exists).

Add `scheduled-post.entity.ts`:

```ts
id, tenantId, accountId, channel,
kind (TEXT | IMAGE | VIDEO | REEL | CAROUSEL),
text/caption, mediaUrls jsonb,
scheduledFor timestamptz,
status (PENDING | SCHEDULED | PUBLISHED | FAILED | CANCELED),
mode (NATIVE | LOCAL),
platformContainerId?, platformPostId?,
attempts int default 0, lastError text?,
createdBy, createdAt, updatedAt
```

Add `scheduled-message.entity.ts`:

```ts
id, tenantId, conversationId, channel,
text, mediaUrl,
scheduledFor timestamptz,
status (PENDING | SENT | FAILED | CANCELED),
attempts int default 0, lastError text?,
createdBy, createdAt, updatedAt
```

Indexes:

- `ScheduledPost`: `[status, scheduledFor]`, `[tenantId, status]`, `[accountId]`.
- `ScheduledMessage`: `[status, scheduledFor]`, `[tenantId, status]`, `[conversationId]`.

Extend `ConnectedAccount` only if needed later for other platforms; not required for Phase 1.

Register both entities in `packages/database/src/entities/index.ts` and in the TypeORM entity lists in `apps/api/src/app.module.ts` and `apps/worker`.

### 4.3 Repository ports + adapters

- Add `i-scheduled-post.repository.ts` and `i-scheduled-message.repository.ts` in `apps/api/src/domain/repositories/`.
- Implement `typeorm-scheduled-post.repository.ts` and `typeorm-scheduled-message.repository.ts` in `apps/api/src/infrastructure/database/repositories/`.
- Bind in `apps/api/src/app.module.ts`.

### 4.4 API — contracts

In `packages/contracts/src/`, add:

- `scheduled-posts.ts`: `ScheduledPostDto`, `CreateScheduledPostDto`, `UpdateScheduledPostDto` (zod + interfaces).
- `scheduled-messages.ts`: `ScheduledMessageDto`, `CreateScheduledMessageDto`.
- Export from `packages/contracts/src/index.ts`.

### 4.5 API — use cases

`apps/api/src/application/use-cases/scheduling/`:

- `create-scheduled-post.use-case.ts` — resolve account + token; if Facebook → submit natively, store `SCHEDULED` + `platformPostId`; if Instagram → persist `PENDING` and enqueue.
- `create-scheduled-message.use-case.ts` — validate conversation ownership; **do not** reject on closed window at creation (window is re-checked at fire time); persist + enqueue.
- `update-scheduled-item.use-case.ts` — edit pending item; native → cancel + resubmit; local → remove job + re-enqueue.
- `cancel-scheduled-item.use-case.ts` — native → call platform cancel; local → `job.remove()`; set `CANCELED`.
- `list-scheduled-items.use-case.ts` — tenant-scoped list with filters (status, account, date range).

Refactor `apps/api/src/application/use-cases/messages/send-reply.use-case.ts`: extract the channel-dispatch + status-update + broadcast core into a reusable `DispatchOutboundMessageService`, so the worker can send a scheduled DM without calling the HTTP controller.

### 4.6 API — BullMQ producer

- Add a `SchedulingQueue` provider in `apps/api` using `@nestjs/bullmq` (`BullModule.registerQueue({ name: "outbound-scheduler" })`).
- Enqueue helper: `enqueue(item, fireAt)` with `delay = fireAt - Date.now()`, `jobId = item.id`, `attempts: 5`, exponential backoff.
- Enforce `fireAt` at least ~60 s in the future.

### 4.7 API — controllers

`apps/api/src/presentation/controllers/scheduled-posts.controller.ts`:

```
POST   /api/scheduled-posts
GET    /api/scheduled-posts
PATCH  /api/scheduled-posts/:id
DELETE /api/scheduled-posts/:id
```

`apps/api/src/presentation/controllers/scheduled-messages.controller.ts`:

```
POST   /api/scheduled-messages
GET    /api/scheduled-messages
DELETE /api/scheduled-messages/:id
```

All handlers resolve `tenantId` via `x-tenant-id` (same pattern as `apps/api/src/presentation/controllers/messages.controller.ts:16`) and scope every query by tenant.

### 4.8 Worker

- New `apps/worker/src/processors/outbound-scheduler.processor.ts`, `@Processor("outbound-scheduler")`.
- Wire `TypeOrmModule`, repositories, `packages/channels`, and `AesVaultService` into `apps/worker/src/worker.module.ts` (currently only registers the `inbound-webhooks` queue).
- Fire-time logic:
  1. Load row; abort if not `PENDING`.
  2. Ack idempotency lock.
  3. Refresh platform token if near expiry.
  4. **Re-check Meta 24 h window** for DMs; if closed, attempt `MESSAGE_TAG` (`HUMAN_AGENT`), else mark `FAILED` with a clear reason.
  5. Dispatch via channel client.
  6. Persist `PUBLISHED`/`SENT` or `FAILED`; broadcast to tenant room.
- Error classification: transient (network/5xx/rate limit) → rethrow for BullMQ retry; policy (permission/window/invalid media) → mark `FAILED`, do not retry.
- Reconciliation cron (every 5 min): native posts past `scheduledFor` → poll platform status; stuck local `PENDING` → re-enqueue.
- Add a scheduler-specific Redis guard: refuse to start if Redis unreachable (do not silently fall back).

### 4.9 Infrastructure prerequisites

- Provision Cloudflare R2 (or S3) and a public media URL base. Needed before Instagram posts and any image/video Page post.
- Ensure Redis is provisioned and reachable by both `apps/api` and `apps/worker`.
- Start Meta App Review submissions immediately (long lead time, runs in parallel with coding).

### 4.10 Phase 1 testing

- Unit: window re-check at fire time, error classification, cancel/reschedule, tenant scoping.
- Integration: create → enqueue → fire → status transition, using a fake channel client and a real Redis container (`docker-compose.yml`).
- Existing suite: `apps/api/test/domain-and-security.spec.ts` (run `npm test`).

### 4.11 Phase 1 checklist

- [x] `packages/channels` extracted; `apps/api` + `apps/worker` consume it.
- [x] `ScheduledPost` + `ScheduledMessage` entities + migration.
- [x] Repository ports + TypeORM adapters.
- [x] Contract schemas exported.
- [x] Scheduling use cases implemented.
- [x] BullMQ producer live in `apps/api`.
- [x] `outbound-scheduler` processor live in `apps/worker`.
- [x] Facebook native post submit/cancel.
- [x] Instagram local post publish.
- [x] Messenger/Instagram DM local send with window re-check.
- [x] Reconciliation cron.
- [x] Presign service + endpoint (SigV4, no SDK).
- [ ] R2/S3 bucket provisioned + CORS (external; set `S3_*` env).
- [ ] Meta App Review submitted (external).

---

## 5. Phase 2 — Web integration

### 5.1 API client

- `apps/web/modules/scheduling/api/scheduling.api.ts` — typed calls to the new endpoints using the existing HTTP client (`apps/web/core/api/http-client.ts`).
- Add types mirroring the contract DTOs under `apps/web/modules/scheduling/data/scheduling.types.ts`.

### 5.2 Scheduling module

- `apps/web/modules/scheduling/` with:
  - `scheduling-module.tsx`
  - `components/schedule-picker.tsx` — date/time + timezone, min lead time, 75-day max for Facebook native.
  - `components/scheduled-list.tsx` — cards/rows with status badge, channel, scheduled time, error detail.
  - `components/scheduled-calendar.tsx` — month/week view of upcoming items.
  - `hooks/use-scheduling.ts` — TanStack Query mutations + cache invalidation.

### 5.3 Composer integration (DMs)

- Update `apps/web/modules/inbox/components/reply-box.tsx`: add a "Schedule" action next to Send.
- Open `schedule-picker`; on confirm, call `POST /api/scheduled-messages`.
- Show a subtle "Scheduled" confirmation and (optionally) an inline chip on the thread.

### 5.4 Posts UI

- New route `apps/web/app/scheduled/page.tsx` (uses `scheduling-module`).
- Entry point from the app shell / settings (e.g., `apps/web/components/layout/site-header.tsx`).
- Create-post flow: pick connected account → caption + media (S3 presigned upload) → `schedule-picker` → submit.
- Per-item actions: edit (pending only), cancel, retry (failed local), copy error.

### 5.5 Settings integration

- Update `apps/web/modules/settings/components/settings-form.tsx` to show:
  - Connected accounts eligible for scheduling.
  - Health/status of the media host connection.
  - A note when a required Meta permission is missing.
- Update `apps/web/modules/settings/api/settings.api.ts` / `data/settings.types.ts` if the settings payload gains scheduling capability flags (e.g., `canSchedulePosts`, `canScheduleMessages` per account).

### 5.6 UX details

- Timezone: display local, send UTC ISO strings.
- Optimistic UI for create/cancel; reconcile from server response.
- Realtime: reuse `apps/web/modules/inbox/hooks/use-realtime.ts` so a fired scheduled DM/published post updates without refresh.
- Empty states, failed-item banner, and a "why outside window?" tooltip explaining Meta's 24 h rule.
- Keyboard-friendly: reuse inbox patterns (`j`/`k`, `Enter`/`Esc`) where relevant.

### 5.7 Phase 2 testing

- Component tests for `schedule-picker` (time ranges, timezone) and `scheduled-list` state rendering.
- Manual E2E: schedule a FB post, an IG post, and a DM; verify live status transitions and cancel.
- Run `npm run lint` and `npm run check-types` at the repo root.

### 5.8 Phase 2 checklist

- [x] `scheduling.api.ts` + types.
- [x] `scheduling-module` with picker, list, calendar.
- [x] Reply box "Schedule" action wired to scheduled DMs.
- [x] `/scheduled` page + navigation entry.
- [x] Create-post flow with presigned media upload.
- [x] Edit / cancel / retry actions.
- [ ] Settings capability flags + permission hints (surfaced in the scheduling module instead).
- [x] Realtime updates for fired items.
- [x] Lint + type-check + build pass.

---

## 6. Deferred platforms

| Platform | Why deferred |
| :--- | :--- |
| **X** | Full integration from zero (OAuth PKCE, refresh, media upload) + paid API tier + DM access friction. Revisit only on paying-customer demand. |
| **LinkedIn** | Requires partner/Marketing-tier approval. |
| **TikTok** | Content Posting audit, no native scheduling. |
| **Threads / YouTube / Pinterest** | Lower demand; add after core Meta + DM scheduling ships. |
| **WhatsApp** | No feed/status publishing in Cloud API. |
| **Telegram / Discord** | Implemented as system-side post scheduling to a registered channel target (bots + `telegram-channel` / `discord-channel` accounts); no messaging windows. |

---

## 7. Risks & mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Meta App Review delayed/rejected | Blocks live posting | Submit day one; support dev-mode testing meanwhile |
| Media not publicly reachable | Instagram/Page media posts fail | R2/S3 with public/CDN URLs before IG work |
| Redis unavailable at runtime | Delayed jobs lost | Fail fast; disable scheduling rather than fall back to memory |
| Token expiry on far-future schedules | Fire-time send fails | Refresh tokens in worker; notify tenant to re-auth on failure |
| 24 h window closed at fire time | DM send rejected | Re-check at fire time; use `MESSAGE_TAG` fallback; surface clear error |
| Duplicate sends | Double delivery | BullMQ `jobId` + `IdempotencyLockService` |
| Instagram container expiry (24 h) | Pre-created container invalid | Never pre-create early; create + publish at fire time |

---

## 8. Suggested sequencing

1. **Week 1** — `packages/channels` extraction, scheduler entities, BullMQ producer + worker, contracts. Submit Meta App Review.
2. **Week 2–3** — Facebook native post scheduling end-to-end (Phase 1 API + minimal Phase 2 form).
3. **Week 3–4** — R2/S3 media host, Instagram local post scheduling.
4. **Week 4–6** — Messenger/Instagram DM scheduling with window handling, reconciliation cron.
5. **Week 6** — Full Phase 2 polish: calendar, edit/cancel/retry, settings flags, realtime.

---

## 9. Implementation status

### Phase 1 — API + infrastructure (complete)

- `packages/channels` extracted (channel clients + `AesVaultService` + `FacebookPostClient` / `InstagramPostClient`); `apps/api` and `apps/worker` consume it.
- `ScheduledPost` + `ScheduledMessage` entities, enums, registered in `data-source.ts` / both app modules; hand-written migration `1790985600000-CreateSchedulingTables.ts` (idempotent, `IF NOT EXISTS`).
- Repository ports + TypeORM adapters.
- Contract schemas: `scheduled-posts.ts`, `scheduled-messages.ts`; API responses normalized to contract casing via `presentation/serializers/scheduling.serializer.ts`.
- Use cases: create / list / cancel for posts + messages, plus `UpdateScheduledPost` (PATCH; resubmits native, re-enqueues local).
- `SchedulingQueueService` (BullMQ producer) with readiness guard: enqueue returns **503** when Redis is down instead of silently falling back to memory.
- `OutboundSchedulerProcessor` (worker): delayed jobs, attempts/backoff, idempotent `jobId`, 24h Meta window re-check, `HUMAN_AGENT` `MESSAGE_TAG` fallback for Messenger/Instagram outside the window, outbound `Message` persistence, native verify vs local publish, failure classification.
- Worker → web realtime via Redis pub/sub (`RealtimePublisher`) bridged to the socket gateway (`RealtimeBridgeService`, `scheduled:update` event).
- Reconciliation repeatable job (every 5 min) re-enqueues stuck pending items.
- Media: `S3PresignService` (SigV4, no SDK) + `POST /api/media/presign` for direct-to-R2/S3 uploads; env-gated.
- Controllers: `POST/GET/PATCH/DELETE /api/scheduled-posts`, `POST/GET/DELETE /api/scheduled-messages`.
- Tests pass (`npm test` → 7/7), full workspace `lint`, `check-types`, `build` green.

### Phase 2 — web integration (complete)

- `apps/web/modules/scheduling`: types, API client, React Query hooks, realtime hook.
- Components: `schedule-picker`, `scheduled-list` (posts + messages), `scheduled-calendar`, `create-post-form` (account picker, caption, presigned media upload).
- Route `apps/web/app/scheduled/page.tsx` + navigation entry in `inbox-header.tsx`.
- Composer scheduling: clock action in `reply-box.tsx` → `schedule-picker` → `POST /api/scheduled-messages`; wired through `use-reply-box` → `use-inbox-controller` → `thread` → `inbox-module`.
- Realtime invalidation on `scheduled:update`; create/edit/cancel/retry-with-edit flows.

### Phase 3 — extensions (complete)

- **Carousel / multi-media**: `CreateScheduledPostDtoSchema` rejects `<2` or `>10` carousel items and media-less image/video/reel posts. Instagram builds child containers (`is_carousel_item`) + a parent `CAROUSEL` container; Facebook uploads each photo unpublished then attaches them via `attached_media` on one feed post. The composer accepts multiple files and derives `kind` (`carousel` when >1).
- **Telegram / Discord post scheduling** (system-side, no native scheduling): `TelegramPostClient` (bot token + target chat id) and `DiscordPostClient` (bot token + target channel id), selected by channel in create/update/cancel use cases and the worker. Post targets are registered as `ConnectedAccount`s with providers `telegram-channel` / `discord-channel` via the Telegram/Discord settings forms (`telegramChannelId`, `discordChannelId`). Webhook routing lookups are provider-scoped so a post target can never shadow the inbound bot account.

### Remaining external prerequisites (not code)

- **Meta App Review**: `pages_manage_posts`, `instagram_content_publish`, `instagram_manage_messages`, `pages_messaging`.
- **Media host provisioning**: set `S3_*` env vars (Cloudflare R2 recommended) and configure bucket CORS for browser PUTs.
- **Schema**: api runs `synchronize: true` in non-production; run the migration (`npm run db:migrate`) for production/worker.
- **Worker startup**: `apps/worker` uses `synchronize: false`; ensure migrations run before the worker starts.

### Notes

- Facebook Pages are modeled as `ChannelType.MESSENGER`; Page post scheduling uses the MESSENGER channel + `FacebookPostClient`.
- Instagram has no native scheduling (containers expire ~24h), so posts are published system-side at fire time.
- Post scheduling supports text, single image/video, and carousels/multi-media (Facebook + Instagram), plus Telegram/Discord channel targets.
