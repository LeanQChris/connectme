# connectme

Private unified inbox for WhatsApp + Facebook Messenger, built on Meta's official APIs.
Internal tool: one shared password, no public sign-up, no customer-facing surface.

Polling every 3s (no WebSockets), so it runs on a serverless host later unchanged.

---

## Current state

| Piece | Status |
| --- | --- |
| Webhook (verify + signature + WhatsApp/Messenger inbound) | done |
| Channel adapters + 24h reply window | done |
| Auth, session cookie, `proxy.ts` gate | done |
| Inbox UI (list, thread, polling, mobile) | done |
| Instagram DMs | placeholder only, ignored on purpose |
| Templates, media sending, multi-agent assignment | out of scope |
| **Storage** | **JSON file (`data/inbox.json`), not a database yet** |

Data currently lives in `data/inbox.json` (gitignored) so the Meta integration can be
exercised without any setup. Every read and write goes through `lib/store.ts`, so
adding a real database later is a single-file change — see [Adding Prisma](#adding-prisma-later).

---

## Install

```bash
npm install
```

Node.js 20.9+ required (developed on Node 22).

## Environment setup

```bash
cp .env.example .env
```

Then fill in:

| Variable | Where to get it |
| --- | --- |
| `APP_SECRET` | App Dashboard → Settings → Basic → App secret → Show |
| `WEBHOOK_VERIFY_TOKEN` | Invent it. Any string. You type the same value into Meta |
| `GRAPH_VERSION` | Keep `v21.0` unless you need a different version |
| `WA_PHONE_NUMBER_ID` | App Dashboard → WhatsApp → API Setup → Phone number ID |
| `WA_ACCESS_TOKEN` | App Dashboard → WhatsApp → API Setup → Temporary access token |
| `FB_PAGE_ACCESS_TOKEN` | Your Page → Settings → Developer → Access Token. May stay empty |
| `ADMIN_PASSWORD` | Anything you can remember. Change the placeholder before sharing the app |
| `SESSION_SECRET` | `openssl rand -hex 32` |

Nothing here uses a `NEXT_PUBLIC_` prefix, so none of it is sent to the browser.
Server logs never print tokens.

`FB_PAGE_ACCESS_TOKEN` may be empty: Messenger replies then return a clear
"Messenger is not configured" error, and WhatsApp keeps working.

**Restart the dev server after editing `.env`** — env vars are read once at startup.

## Run locally

```bash
npm run dev
```

Open http://localhost:3000, sign in with `ADMIN_PASSWORD`.

To wipe the local inbox: `rm -rf data`.

## Exposing the webhook with a tunnel

Meta must reach the server over HTTPS, so a tunnel is required during development.

**ngrok**

```bash
ngrok http 3000
```

**cloudflared**

```bash
cloudflared tunnel --url http://localhost:3000
```

Both print a public HTTPS URL. It **changes every time you restart the tunnel**, so
you must re-save the callback URL in Meta afterwards.

## Meta webhook settings

**Callback URL**

```
https://<your-tunnel-url>/api/webhook
```

The path must be exactly `/api/webhook`.

**Verify token**

```
WEBHOOK_VERIFY_TOKEN   (the same string from your .env)
```

Meta sends a GET with `hub.mode=subscribe`, `hub.verify_token` and `hub.challenge`.
The route answers with `hub.challenge` as plain text, or `403` on mismatch.

**Subscribe to fields**

- WhatsApp: App Dashboard → WhatsApp → Configuration → Webhooks → Edit → paste callback
  URL + verify token → Save → *Subscribe to my app* → select the **`messages`** field.
  Delivery statuses (`sent`/`delivered`/`read`/`failed`) arrive under the same field.
- Messenger: Page → Settings → Webhooks → Edit → paste callback URL + verify token →
  *Subscribe* → select **`messages`**, `messaging_postbacks`, `messaging_optin`.
  `messaging_postbacks` and `messaging_optin` are not read yet, but subscribing now
  means you do not have to come back later.

Requests are authenticated with `X-Hub-Signature-256`
(`HMAC-SHA256(rawBody, APP_SECRET)`), so the webhook is safe to expose publicly.
`proxy.ts` deliberately leaves `/api/webhook` unauthenticated for that reason.

## Tests

There is no test runner in this repo yet. The flows were verified manually against a
local dev server with signed payloads: handshake, bad signature → 401, duplicate
delivery → ignored, echo ignored, status updates, window closed → 409, failed send →
stored as `failed` with Meta's error.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Webhook POSTs return `401` | `APP_SECRET` does not match the app the webhook is subscribed to |
| Verification fails, `403` | `WEBHOOK_VERIFY_TOKEN` differs from the token typed into Meta, or the URL is missing the `/api/webhook` path |
| Verification worked, then stopped | Tunnel restarted and the URL changed. Re-save the callback URL in Meta |
| Env change seems ignored | Restart `npm run dev` |
| Messages not appearing | Watch the server log: every accepted event logs `[webhook] ... inbound`. No line means Meta never delivered |
| Reply fails with `409` | 24-hour window closed. WhatsApp needs an approved template message outside it |
| Reply fails with `502` | Meta rejected the send. The exact error is shown on the failed bubble |
| Messenger reply says "not configured" | `FB_PAGE_ACCESS_TOKEN` is empty |
| `Missing required environment variable X` | `.env` is missing or truncated. See `lib/config.ts` |

## Layout

```
app/globals.css                     Geist design tokens (Vercel's palette, dark mode)
app/api/webhook/route.ts            Meta handshake + signature check + dispatch
app/api/login|logout/route.ts       session cookie
app/api/conversations/**            list / thread / reply
app/login/page.tsx                  password form
components/inbox/*                  client UI (list, thread, reply box, window bar)
lib/config.ts                       all env access, throws with a clear message
lib/store.ts                        ALL data access. Swap this for Prisma later
lib/auth.ts lib/session.ts          token signing, cookie reading, guards
lib/meta/types.ts                   strict webhook payload types
lib/meta/verify.ts                  HMAC signature check, timing-safe compares
lib/meta/handlers.ts                inbound WhatsApp + Messenger (Instagram stub)
lib/meta/client.ts                  Graph API POST helper
lib/channels/*                      one file per channel + registry
lib/window.ts                       24-hour reply window
proxy.ts                            Next 16 auth gate (was middleware.ts)
```

UI follows the Vercel / Geist design system: self-hosted Geist Sans + Mono from the
`geist` package, the real Geist grey scale as CSS variables in `app/globals.css`, and
light/dark driven by `prefers-color-scheme`.

## Adding Instagram later

1. Create `lib/channels/instagram.ts`: copy `messenger.ts`, POST to
   `/{ig-user-id}/messages`, and register it in `lib/channels/index.ts`.
2. Replace `handleInstagram` in `lib/meta/handlers.ts` — Instagram messaging events
   use the same `sender.id` / `message.mid` / `message.text` shape and the same
   `is_echo` rule.
3. Add `IG_PAGE_ACCESS_TOKEN` to `lib/config.ts` and `.env.example`.

## Adding Prisma later

```bash
npm install @prisma/client && npm install -D prisma
```

Schema (SQLite now, Postgres later by changing `provider` and `DATABASE_URL`):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"        // switch to "postgresql" for Postgres
  url      = env("DATABASE_URL")
}

model Contact {
  id         String   @id @default(cuid())
  channel    String
  externalId String
  name       String?
  createdAt  DateTime @default(now())

  @@unique([channel, externalId])
}

model Conversation {
  id           String   @id @default(cuid())
  contactId    String   @unique
  lastMessageAt DateTime
  lastInboundAt DateTime?
  unreadCount  Int      @default(0)
  status       String   @default("open")
  createdAt    DateTime @default(now())
  contact      Contact  @relation(fields: [contactId], references: [id])

  @@index([lastMessageAt])
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  direction      String
  type           String   @default("text")
  text           String?
  externalId     String?
  status         String   @default("received")
  error          String?
  createdAt      DateTime
  conversation   Conversation @relation(fields: [conversationId], references: [id])

  @@index([conversationId, createdAt])
}
```

Then:

```bash
npx prisma migrate dev --name init
```

Reimplement the functions in `lib/store.ts` as Prisma queries, keeping the same
signatures, and add a unique index on `(channel, externalId)` for `Message` so
deduplication is enforced by the database instead of in application code.