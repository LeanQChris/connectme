# ConnectMe

> **Unified Multi-Channel Team Inbox** for **WhatsApp Business Cloud API**, **Facebook Messenger**, **Telegram**, and **Instagram Direct**.

ConnectMe is a lightweight, secure internal communications hub designed for teams to manage customer conversations across Meta platforms and Telegram from a single, unified interface.

Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and the **Vercel Geist Design System**, ConnectMe requires zero database setup locally and deploys seamlessly to serverless environments (Vercel + Vercel KV / Upstash Redis).

---

## ✨ Features

- 💬 **Unified Multi-Channel Inbox**: Centralize messages from WhatsApp, Facebook Messenger, Telegram, and Instagram in real time.
- ⏱️ **24-Hour Reply Window Tracking**: Built-in countdown timer and visual indicators conforming to Meta's 24-hour customer care messaging policies.
- 📎 **Rich Media Support**: Send and receive images, voice notes/audio, videos, and document attachments (up to 8 MB).
- 📝 **Internal Notes & Collaboration**: Add private internal notes directly into conversation threads for team collaboration.
- 🏷️ **Conversation Management**: Tagging, agent assignment, conversation status toggles (Open / Closed), and unread count badges.
- ⌨️ **Keyboard-First Triage**: `j`/`k` walk the list, `Enter`/`Esc` open and close a thread, `a` archives — the composer stays focused while you type.
- 🔍 **Instant Full-Text Search**: Search conversations by customer name, handle/phone number, or message content snippets.
- ⚡ **Serverless-Ready Polling Architecture**: 3-second smart polling via TanStack Query — no fragile, stateful WebSocket connections required on serverless hosts.
- 🔒 **Enterprise-Grade Security**:
  - Webhook payload validation via `X-Hub-Signature-256` (HMAC-SHA256) with timing-safe comparisons.
  - Password-protected access with signed HTTP-only session cookies (`jose`).
  - Next.js 16 route protection via `proxy.ts`.
  - Zero client-side token exposure (no `NEXT_PUBLIC_` credential leaks).
- 💾 **Dual-Mode Data Store**:
  - **Local Development**: Zero-config file storage at `data/inbox.json`.
  - **Production**: High-speed, atomic key-value storage via Vercel KV / Upstash Redis.
- 🌓 **Geist Design System**: Native Dark and Light theme toggle with typography and tokens from Vercel Geist.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + Geist Design Tokens |
| **State & Polling** | [@tanstack/react-query](https://tanstack.com/query) |
| **Authentication** | Shared Admin Password + HMAC Signed JWT Session (`jose`) |
| **Channels** | WhatsApp Cloud API, Facebook Messenger Graph API, Telegram Bot API, Instagram Graph API |
| **Storage Engine** | Local JSON File (`data/inbox.json`) or Vercel KV / Upstash Redis |
| **Language** | TypeScript 5 (Strict Mode) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `v20.9.0` or later (tested on Node 22)
- **npm** or **pnpm** / **yarn**

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-org/connectme.git
cd connectme
npm install
```

### 2. Configure Environment Variables

Copy the example environment configuration:

```bash
cp .env.example .env
```

Open `.env` and fill in the required variables:

```ini
# Meta App Credentials (App Dashboard -> Settings -> Basic)
APP_SECRET=your_meta_app_secret
WEBHOOK_VERIFY_TOKEN=your_custom_verification_token
GRAPH_VERSION=v21.0

# WhatsApp Cloud API (App Dashboard -> WhatsApp -> API Setup)
WA_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WA_ACCESS_TOKEN=your_whatsapp_system_user_token

# Facebook Messenger (Page -> Settings -> Developer -> Access Token)
FB_PAGE_ACCESS_TOKEN=your_facebook_page_access_token

# Telegram Bot API (From @BotFather)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Security & Dashboard Access
ADMIN_PASSWORD=your_secure_dashboard_password
SESSION_SECRET=generate_with_openssl_rand_hex_32

# Production Storage (Leave blank for local JSON file storage)
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

> 💡 **Tip:** Generate a secure `SESSION_SECRET` with:
> ```bash
> openssl rand -hex 32
> ```

### 3. Start Local Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and log in using your `ADMIN_PASSWORD`.

---

## 🌐 Webhook Configuration

Meta and Telegram require a public HTTPS endpoint to deliver webhooks. During local development, expose your local port `3000` using a tunnel:

### Option A: Cloudflare Tunnel (Recommended)

```bash
cloudflared tunnel --url http://localhost:3000
```

### Option B: ngrok

```bash
ngrok http 3000
```

---

### Setting Up Meta Webhooks (WhatsApp & Messenger)

1. **Configure Callback URL**:
   - In the **Meta App Dashboard**, go to **Webhooks** (or **WhatsApp > Configuration**).
   - **Callback URL**: `https://<your-tunnel-or-domain>/api/webhook`
   - **Verify Token**: Enter the exact string set in `WEBHOOK_VERIFY_TOKEN`.
2. **Subscribe to Webhook Fields**:
   - **WhatsApp**: Subscribe to the `messages` field (receives inbound messages and delivery status receipts: `sent`, `delivered`, `read`, `failed`).
   - **Facebook Page / Messenger**: Subscribe to `messages`, `messaging_postbacks`, and `messaging_optin`.

---

### Setting Up Telegram Webhook

Once your app is accessible over HTTPS with `TELEGRAM_BOT_TOKEN` set in `.env`:

1. **Automatic Setup via ConnectMe Endpoint**:
   Open in your browser or trigger via `curl`:
   ```bash
   curl "http://localhost:3000/api/telegram/setup?url=https://<your-tunnel-or-domain>/api/webhook/telegram"
   ```
2. **Verify Setup Status**:
   ```bash
   curl "http://localhost:3000/api/telegram/setup"
   ```

---

## 🚢 Deployment to Vercel

Because Vercel serverless functions have an ephemeral, read-only filesystem (outside `/tmp`), ConnectMe utilizes **Vercel KV (Upstash Redis)** in production.

### 1. Create and Link a Vercel KV Store

```bash
# Create KV store
npx vercel kv create connectme

# Link environment variables to your Vercel project
npx vercel env add KV_REST_API_URL production
npx vercel env add KV_REST_API_TOKEN production
```

### 2. Configure Production Secrets on Vercel

Ensure all other required environment variables (`APP_SECRET`, `WEBHOOK_VERIFY_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET`, etc.) are configured in your Vercel Project Settings under **Environment Variables**.

### 3. Deploy

```bash
npx vercel --prod
```

Once deployed, update your Meta Webhook URL to point to `https://<your-vercel-domain>/api/webhook` and register your Telegram webhook with `https://<your-vercel-domain>/api/webhook/telegram`.

---

## 📁 Project Structure

```
connectme/
├── app/
│   ├── api/
│   │   ├── conversations/        # Conversation listing, thread fetch, replies, status
│   │   ├── login / logout/       # Session authentication & cookie issuance
│   │   ├── media/                # File and attachment upload & serving
│   │   ├── search/               # Conversation & message search endpoint
│   │   ├── telegram/setup/       # Telegram webhook registration helper
│   │   └── webhook/              # Meta & Telegram webhook receivers
│   ├── conversations/            # Conversation route views
│   ├── inbox/                    # Inbox dashboard view
│   ├── login/                    # Login page
│   ├── globals.css               # Tailwind CSS v4 & Geist theme variables
│   ├── layout.tsx                # Root HTML shell & ThemeProvider
│   └── page.tsx                  # Landing / Dashboard redirection
├── components/
│   ├── inbox/
│   │   ├── avatar.tsx            # Contact avatar with channel indicator
│   │   ├── channel-badge.tsx     # Channel badge pills
│   │   ├── channel-rail.tsx      # Vertical channel switch rail
│   │   ├── conversation-list.tsx # Conversation items with search & filters
│   │   ├── reply-box.tsx         # Message composer with attachments & note mode
│   │   ├── reply-window.tsx      # Meta 24-hour window countdown widget
│   │   ├── theme-toggle.tsx      # Light/Dark mode switcher
│   │   └── thread.tsx            # Conversation timeline & message bubbles
│   └── providers/                # React Query & Theme providers
├── data/                         # Local JSON file store (gitignored)
│   └── inbox.json
├── lib/
│   ├── auth.ts                   # Password verification & session helpers
│   ├── channels/                 # Channel adapters (WhatsApp, Messenger, Telegram, Instagram)
│   ├── config.ts                 # Validated environment configuration
│   ├── meta/                     # Meta Graph API client, HMAC verification & event handlers
│   ├── session.ts                # Signed JWT cookie session management (`jose`)
│   ├── store.ts                  # Unified data store abstraction (JSON file <-> Vercel KV)
│   ├── telegram/                 # Telegram message parsing & sending utilities
│   ├── types.ts                  # Shared TypeScript models and domain types
│   ├── uploads.ts                # File attachment validation & persistence
│   └── window.ts                 # 24-hour reply window calculation logic
├── proxy.ts                      # Next.js 16 edge authentication gateway
└── package.json
```

---

## 🗄️ Database Migration Path (Prisma + Postgres)

While the default JSON / Vercel KV store is optimized for lightweight operations, ConnectMe is structured so you can transition to a relational database like PostgreSQL (Neon, Supabase, or Vercel Postgres) using Prisma.

```prisma
model Contact {
  id         String         @id @default(cuid())
  channel    String
  externalId String
  name       String?
  avatarUrl  String?
  createdAt  DateTime       @default(now())
  conversations Conversation[]

  @@unique([channel, externalId])
}

model Conversation {
  id            String    @id @default(cuid())
  contactId     String
  lastMessageAt DateTime
  lastInboundAt DateTime?
  unreadCount   Int       @default(0)
  status        String    @default("open")
  assignee      String?
  tags          String[]
  createdAt     DateTime  @default(now())
  contact       Contact   @relation(fields: [contactId], references: [id])
  messages      Message[]

  @@index([lastMessageAt])
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  direction      String       // "in" | "out" | "note"
  type           String       @default("text")
  text           String?
  mediaUrl       String?
  externalId     String?
  channel        String
  status         String       @default("received")
  error          String?
  author         String?
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id])

  @@index([conversationId, createdAt])
}
```

To migrate, implement the functions in `lib/store.ts` using Prisma queries while retaining the existing function signatures.

---

## 🛠️ Troubleshooting & FAQ

| Problem | Cause | Solution |
| --- | --- | --- |
| **Webhook returns `401 Unauthorized`** | `APP_SECRET` does not match the app sending the webhook. | Verify your App Secret in Meta App Dashboard under Settings > Basic. |
| **Verification fails with `403 Forbidden`** | `WEBHOOK_VERIFY_TOKEN` mismatch or wrong path. | Check token match and verify endpoint path is `/api/webhook`. |
| **Messages stop arriving during local dev** | Your ngrok/cloudflared tunnel URL expired or restarted. | Copy new tunnel URL and update Callback URL in Meta / Telegram. |
| **Reply fails with `409 Conflict`** | Customer's 24-hour messaging window has closed. | WhatsApp and Messenger require customer-initiated contact or approved templates outside 24 hours. |
| **Reply fails with `502 Bad Gateway`** | Meta or Telegram Graph API rejected the request. | Check the error description displayed directly on the failed message bubble. |
| **Messenger reply says "Not configured"** | `FB_PAGE_ACCESS_TOKEN` is missing or empty. | Provide a valid Facebook Page Access Token in `.env`. |
| **Data resets after Vercel redeploy** | `KV_REST_API_URL` and `KV_REST_API_TOKEN` are not set. | Link a Vercel KV store in your Vercel project settings to persist state. |

---

## 🛡️ License

This project is private and proprietary. Unauthorized copying, distribution, or modification is prohibited.