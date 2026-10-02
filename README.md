# ConnectMe 💬

> **Enterprise Multi-Channel Team Inbox & Omnichannel SaaS Platform**  
> Unify **WhatsApp Business Cloud API**, **Facebook Messenger**, **Instagram Direct**, and **Telegram** into a single, high-throughput, real-time customer communication workspace.

[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-000000?logo=turborepo)](https://turbo.build/repo)
[![Next.js 16](https://img.shields.io/badge/Next.js%2016-App%20Router-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React%2019-UI-61DAFB?logo=react)](https://react.dev/)
[![NestJS 11](https://img.shields.io/badge/NestJS%2011-Backend%20Core-E0234E?logo=nestjs)](https://nestjs.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20CSS%20v4-Geist%20Tokens-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![TypeORM](https://img.shields.io/badge/TypeORM-PostgreSQL%2016-FE0803?logo=typeorm)](https://typeorm.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Redis%20Queues-DC382D?logo=redis)](https://bullmq.io/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk%20OAuth-6C47FF?logo=clerk)](https://clerk.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript%205-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Monorepo Topology](#-architecture--monorepo-topology)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone and Install Dependencies](#1-clone-and-install-dependencies)
  - [2. Start Infrastructure (Postgres & Redis)](#2-start-infrastructure-postgres--redis)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Synchronize Database Schema](#4-synchronize-database-schema)
  - [5. Run Development Servers](#5-run-development-servers)
- [Channel Integrations & Webhooks](#-channel-integrations--webhooks)
  - [1-Click Meta OAuth Setup](#1-click-meta-oauth-setup)
  - [Meta Webhook Verification](#meta-webhook-verification)
  - [Telegram Bot & Webhook Registration](#telegram-bot--webhook-registration)
  - [Local Development Tunneling](#local-development-tunneling)
- [Repository Structure & Workspace Packages](#-repository-structure--workspace-packages)
- [Available Scripts](#-available-scripts)
- [Security & Data Isolation](#-security--data-isolation)
- [Deployment Guide](#-deployment-guide)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [Contributing & License](#-contributing--license)

---

## 🌟 Overview

**ConnectMe** is a multi-tenant, enterprise-grade omnichannel customer engagement platform designed for modern sales, support, and operations teams. Built from the ground up on a **Turborepo** monorepo architecture, ConnectMe combines a sleek **Next.js 16** frontend powered by the **Geist Design System** with a modular **NestJS 11** backend engine and **BullMQ** asynchronous background workers.

Each tenant connects their own messaging accounts (via 1-Click Meta OAuth or direct token entry). Credentials are encrypted at rest with **AES-256-GCM** before persistence, guaranteeing complete tenant isolation and strict zero-trust credential security.

---

## ✨ Key Features

### 💬 Unified Omnichannel Inbox
- **Multi-Channel Aggregation**: Stream WhatsApp Business, Facebook Messenger, Instagram Direct, and Telegram into one continuous inbox.
- **Bi-Directional Messaging**: Real-time incoming webhook ingestion and instant outgoing dispatch across all connected providers.
- **Rich Media Support**: Send and view images, audio/voice notes, videos, and document attachments (PDF, DOCX, etc.) with automatic S3/R2-compatible storage uploads.

### ⏱️ Meta 24-Hour Policy & SLA Tracking
- **Live Policy Countdown Clock**: Active countdown timer conforming to Meta's strict 24-hour customer care messaging policies.
- **Visual Warning Badges**: Real-time status badges indicating when a conversation window is open, nearing expiration, or closed.
- **Template Messaging Gate**: Enforces policy compliance when attempting to message customers outside the 24-hour window.

### 🔐 Multi-Tenant SaaS & Data Isolation
- **Tenant-Scoped Architecture**: All contacts, conversations, messages, channels, and logs are strictly isolated by `tenantId`.
- **Clerk Authentication**: Seamless Google OAuth login flow with signed HTTP-only session cookies and custom application authentication routing.
- **Granular RBAC**: Role-based access control for team members, managers, and tenant administrators.

### 🛡️ Zero-Trust Security & Bring-Your-Own-Credentials (BYOC)
- **Zero Token Exposure**: Provider tokens and app secrets are encrypted via AES-256-GCM before saving to PostgreSQL and decrypted only in ephemeral memory.
- **Webhook Integrity Verification**: Validates Meta payloads using `X-Hub-Signature-256` (HMAC-SHA256) with timing-safe comparisons.
- **CSRF & Edge Protection**: Next.js edge gateway validation and NestJS CORS/helmet protections.

### ⚡ Real-Time & High-Throughput Engine
- **Socket.IO Real-Time Gateway**: Instant message synchronization across browser tabs and active team members.
- **BullMQ Asynchronous Job Queues**: Redis-backed distributed task queues for webhook processing, scheduled broadcasts, retry policies, and media uploads.
- **Intelligent Fallback Polling**: Integrated TanStack Query caching for resilient state revalidation during network reconnects.

### 👥 Collaboration & Workflow Automation
- **Internal Private Notes**: Drop team-only internal notes inside conversation threads without notifying external customers.
- **Conversation Management**: Quick status triage (**Open**, **Snoozed**, **Closed**), agent assignment, and custom label tagging.
- **Keyboard-First Navigation**: Rapid triage with keyboard shortcuts (`j`/`k` to traverse list, `Enter`/`Esc` to open/close threads, `a` to archive).
- **Instant Full-Text Search**: Filter conversations and messages by customer name, phone number, social handle, or text snippet.

---

## 🏗️ Architecture & Monorepo Topology

```mermaid
flowchart TD
    subgraph Clients ["Client Layer"]
        Web["apps/web\nNext.js 16 (App Router)\nReact 19 + Tailwind v4 + Geist"]
    end

    subgraph Edge ["Edge & Gateway"]
        Auth["Clerk OAuth\n(Google Sign-In)"]
        Tunnel["Cloudflare Tunnel / ngrok\n(Local Webhook Ingress)"]
    end

    subgraph Backend ["Backend & Processing"]
        API["apps/api\nNestJS 11 Core API\nREST + WebSockets (Socket.IO)"]
        Worker["apps/worker\nBullMQ Distributed Worker\n(Scheduled Jobs, Webhook Retries)"]
    end

    subgraph SharedPackages ["Shared Monorepo Packages"]
        Contracts["packages/contracts\n(DTOs, Schemas, Domain Types)"]
        Database["packages/database\n(TypeORM Entities, Migrations)"]
        Channels["packages/channels\n(WhatsApp, Messenger, IG, Telegram)"]
        Crypto["packages/crypto\n(AES-256-GCM Vault, HMAC-SHA256)"]
    end

    subgraph Infrastructure ["Persistence & Storage"]
        PG[("PostgreSQL 16\n(Multi-Tenant Store)")]
        Redis[("Redis 7\n(BullMQ Queues & Pub/Sub)")]
        S3[("S3 / Cloudflare R2\n(Public Media Assets)")]
    end

    subgraph ExternalProviders ["External Channels"]
        WA["WhatsApp Cloud API"]
        FB["Facebook Graph API"]
        IG["Instagram Graph API"]
        TG["Telegram Bot API"]
    end

    Web -->|Auth Flow| Auth
    Web -->|REST / WS| API
    Tunnel -->|Forward Inbound Webhooks| API
    API -->|Queue Jobs| Redis
    Redis -->|Consume Tasks| Worker
    API & Worker --> SharedPackages
    SharedPackages --> PG
    SharedPackages --> Redis
    SharedPackages --> S3
    API & Worker --> WA & FB & IG & TG
```

---

## 💻 Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Monorepo Engine** | [Turborepo](https://turbo.build/) + [npm Workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) |
| **Web Frontend** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Geist Design System](https://vercel.com/font) |
| **Frontend State & Cache** | [@tanstack/react-query v5](https://tanstack.com/query), [Zustand](https://github.com/pmndrs/zustand), [Socket.IO Client](https://socket.io/) |
| **Backend Core** | [NestJS 11](https://nestjs.com/), [Express](https://expressjs.com/), [Socket.IO](https://socket.io/) |
| **Async Queues & Workers** | [BullMQ](https://bullmq.io/), [ioredis](https://github.com/redis/ioredis), [NestJS BullMQ](https://docs.nestjs.com/techniques/queues) |
| **Database & ORM** | [PostgreSQL 16](https://www.postgresql.org/), [TypeORM 0.3](https://typeorm.io/) |
| **Authentication** | [Clerk](https://clerk.com/) (Google OAuth, Session Cookies, JWT Validation) |
| **Cryptography & Vault** | Node.js `crypto` (AES-256-GCM Encryption, SHA-256 HMAC Signature Verification) |
| **Media & Storage** | AWS S3 / Cloudflare R2 / MinIO compatible object storage |
| **Type System & Tooling** | TypeScript 5 (Strict Mode), ESLint 9, Prettier |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.9.0` or higher (Node 22 LTS recommended)
- **npm**: `v10+` (or `pnpm` / `yarn`)
- **Docker & Docker Compose**: For running local PostgreSQL and Redis instances

---

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone https://github.com/your-org/connectme.git
cd connectme

# Install all workspace dependencies
npm install
```

---

### 2. Start Infrastructure (Postgres & Redis)

Launch the containerized PostgreSQL and Redis services defined in [`docker-compose.yml`](file:///Users/apple/Desktop/projects/connectme/docker-compose.yml):

```bash
docker compose up -d
```

Verify containers are healthy:
```bash
docker compose ps
```

---

### 3. Configure Environment Variables

Create your local `.env` configuration file from the template:

```bash
cp .env.example .env
```

Open `.env` and fill in the required configuration variables:

```ini
# ==============================================================================
# 1. Clerk Authentication
# ==============================================================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# ==============================================================================
# 2. Master Token Encryption Key (AES-256-GCM)
# Generate with: openssl rand -hex 32
# ==============================================================================
ENCRYPTION_KEY=your_64_character_hex_encryption_key_here

# ==============================================================================
# 3. Meta Developer App (1-Click OAuth & Webhooks)
# ==============================================================================
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_WEBHOOK_VERIFY_TOKEN=your_custom_webhook_verify_token
NEXT_PUBLIC_APP_URL=http://localhost:3000
GRAPH_VERSION=v21.0

# ==============================================================================
# 4. Database & Cache Infrastructure
# ==============================================================================
DATABASE_URL=postgres://postgres:postgres@localhost:5432/connectme
REDIS_URL=redis://localhost:6379

# ==============================================================================
# 5. Media Storage (S3 / Cloudflare R2)
# ==============================================================================
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_BUCKET=connectme-media
S3_REGION=auto
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_PUBLIC_BASE_URL=https://media.yourdomain.com

# Contact Info
CONTACT_EMAIL=support@yourdomain.com
```

> 🔑 **Generate a secure `ENCRYPTION_KEY`**:
> ```bash
> openssl rand -hex 32
> ```
> *Keep this key safe. Rotating it will invalidate all previously encrypted tenant tokens.*

---

### 4. Synchronize Database Schema

Synchronize TypeORM entities with your PostgreSQL database:

```bash
npm run db:sync
```

*(For production migrations, use `npm run db:migrate`)*.

---

### 5. Run Development Servers

Run the entire application ecosystem with Turborepo:

```bash
npm run dev
```

This starts all three applications concurrently with hot module reloading:
- 🌐 **Web Frontend**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Backend API**: [http://localhost:4000](http://localhost:4000)
- 👷 **Background Worker**: BullMQ Consumer running in background

You can also run applications individually:
```bash
npm run dev:web     # Start Next.js frontend only
npm run dev:api     # Start NestJS API only
npm run dev:worker  # Start BullMQ worker only
```

---

## 🌐 Channel Integrations & Webhooks

### 1-Click Meta OAuth Setup

ConnectMe supports 1-click authorization for Facebook Pages, Instagram Direct, and WhatsApp Business Accounts:

1. Create an app on [Meta for Developers](https://developers.facebook.com/).
2. Add **Facebook Login for Business**, **WhatsApp**, and **Instagram Graph API** products.
3. Configure the OAuth Redirect URI in Meta App Settings:
   ```
   http://localhost:3000/api/auth/callback/meta
   # or https://your-domain.com/api/auth/callback/meta
   ```
4. Add your `META_APP_ID` and `META_APP_SECRET` to `.env`.
5. In ConnectMe, navigate to **Settings → Channels** and click **Connect with Meta**.

---

### Meta Webhook Verification

Meta delivers incoming messages, message delivery status receipts (`sent`, `delivered`, `read`), and customer changes to a single callback URL:

1. In the **Meta App Dashboard**, navigate to **Webhooks** (or **WhatsApp > Configuration**).
2. Set **Callback URL**:
   ```
   https://<your-public-domain>/api/webhook
   ```
3. Set **Verify Token**: Enter the exact value matching `META_WEBHOOK_VERIFY_TOKEN` in `.env`.
4. Subscribe to the following webhook fields:
   - **WhatsApp**: `messages`
   - **Facebook Page / Messenger**: `messages`, `messaging_postbacks`, `messaging_optins`
   - **Instagram**: `messages`, `messaging_postbacks`

---

### Telegram Bot & Webhook Registration

1. Create a bot using [@BotFather](https://t.me/BotFather) on Telegram and obtain your **Bot Token**.
2. In ConnectMe, go to **Settings → Channels → Telegram**, paste your bot token, and save.
3. ConnectMe automatically registers the webhook endpoint:
   ```
   https://<your-public-domain>/api/webhook/telegram/<bot-id>
   ```

---

### Local Development Tunneling

External webhook providers (Meta and Telegram) require a public HTTPS endpoint. Expose your local port `3000` (or `4000`) using either **Cloudflare Tunnel** or **ngrok**:

#### Option A: Cloudflare Tunnel (Recommended - No expiry)
```bash
cloudflared tunnel --url http://localhost:3000
```

#### Option B: ngrok
```bash
ngrok http 3000
```

Copy the generated HTTPS URL (e.g., `https://random-id.trycloudflare.com`) and use it in your Meta Webhook settings.

---

## 📁 Repository Structure & Workspace Packages

```
connectme/
├── apps/
│   ├── web/                          # Next.js 16 frontend application
│   │   ├── app/                      # App router pages (inbox, conversations, settings, auth)
│   │   ├── components/               # React components (thread, reply box, timers, badges)
│   │   ├── hooks/                    # React Query & WebSocket hooks
│   │   └── lib/                      # Client utilities, API wrappers, auth proxies
│   │
│   ├── api/                          # NestJS 11 REST & WebSocket backend
│   │   ├── src/
│   │   │   ├── modules/              # Channel, conversation, message, webhook modules
│   │   │   ├── gateways/             # Socket.IO real-time event gateways
│   │   │   ├── guards/               # Clerk auth & tenant isolation guards
│   │   │   └── main.ts               # API bootstrap entrypoint
│   │
│   └── worker/                       # BullMQ async job processor
│       ├── src/
│       │   ├── processors/           # Webhook ingestion, broadcast scheduler, retries
│       │   └── main.ts               # Worker bootstrap entrypoint
│
├── packages/
│   ├── contracts/                    # Shared TypeScript DTOs, API payloads & domain models
│   ├── database/                     # PostgreSQL TypeORM entities, repositories, migrations
│   ├── channels/                     # WhatsApp, Messenger, IG, and Telegram adapters
│   ├── crypto/                       # AES-256-GCM vault & HMAC signature verification
│   ├── eslint-config/                # Workspace shared ESLint rules
│   └── typescript-config/            # Workspace shared TypeScript compiler options
│
├── docker-compose.yml                # Local infrastructure (PostgreSQL 16, Redis 7)
├── turbo.json                        # Turborepo task pipeline configuration
└── package.json                      # Workspace root configuration
```

---

## 📜 Available Scripts

Run commands from the root directory using Turborepo:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts all applications (`web`, `api`, `worker`) in watch mode |
| `npm run dev:web` | Starts only the Next.js frontend (`@connectme/web`) |
| `npm run dev:api` | Starts only the NestJS API backend (`@connectme/api`) |
| `npm run dev:worker` | Starts only the BullMQ worker (`@connectme/worker`) |
| `npm run build` | Builds all packages and production bundles across the monorepo |
| `npm run lint` | Runs ESLint across all apps and packages |
| `npm run check-types` | Performs TypeScript type checking without emitting files |
| `npm run test` | Executes unit and integration test suites |
| `npm run db:sync` | Synchronizes TypeORM entity schemas directly with PostgreSQL |
| `npm run db:migrate` | Runs pending database migrations |
| `npm run clean` | Deletes build artifacts (`dist`, `.next`, `tsconfig.tsbuildinfo`) |

---

## 🔒 Security & Data Isolation

1. **Multi-Tenant Scoping**:
   - Every database query strictly filters by `tenantId`.
   - Webhook ingress maps incoming external channel identifiers (e.g. `phone_number_id`, `page_id`) to the owning tenant before any data is written.
2. **Encrypted Token Vault**:
   - Provider tokens (`access_token`, `bot_token`, `app_secret`) are encrypted via **AES-256-GCM** using an initialization vector (IV) and authentication tag before storage.
   - Raw tokens are never returned in client API responses.
3. **Webhook HMAC Validation**:
   - All inbound Meta requests verify the `X-Hub-Signature-256` header against the tenant's app secret using `crypto.timingSafeEqual` to eliminate timing attack vectors.
4. **Session Authentication**:
   - Protected API routes and page views are gated by Clerk JWT session validation and verified at both edge proxy and backend guard layers.

---

## 🚢 Deployment Guide

### Recommended Cloud Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge / WAF                           │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌─────────────────────────────────────┐   ┌──────────────────────────────┐
│       Frontend (Vercel)             │   │   Backend API (Railway/ECS)  │
│       @connectme/web                │   │   @connectme/api             │
└─────────────────────────────────────┘   └──────────────┬───────────────┘
                                                         │
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │   Worker (Railway/ECS)       │
                                          │   @connectme/worker          │
                                          └──────────────┬───────────────┘
                                                         │
                   ┌─────────────────────────────────────┴───────────────┐
                   ▼                                                     ▼
┌─────────────────────────────────────┐   ┌──────────────────────────────┐
│  Managed Postgres (Neon / Supabase) │   │  Managed Redis (Upstash)     │
└─────────────────────────────────────┘   └──────────────────────────────┘
```

1. **Frontend (`apps/web`)**: Deploy to **Vercel** or **Cloudflare Pages**. Set `NEXT_PUBLIC_APP_URL`, Clerk keys, and API backend URL.
2. **Backend API (`apps/api`)**: Deploy as a containerized Node.js service on **Railway**, **Render**, **Fly.io**, or **AWS ECS**.
3. **Background Worker (`apps/worker`)**: Deploy alongside the API with access to the same Redis instance and PostgreSQL database.
4. **Database & Cache**: Use managed **PostgreSQL** (Neon, Supabase, AWS RDS) and **Redis** (Upstash, AWS ElastiCache).
5. **Media Storage**: Create an S3 or Cloudflare R2 bucket with public read access for media attachments.

---

## 🛠️ Troubleshooting & FAQ

### Why do Meta Webhooks return `401 Unauthorized`?
- Verify that the Meta App Secret saved in **Settings → Channels** matches your Facebook Developer app.
- Check that `META_WEBHOOK_VERIFY_TOKEN` matches the token entered in Meta's Webhook configuration screen.

### Messages fail with `409 Conflict: 24-hour window closed`
- Under Meta's Business Messaging policy, you cannot send freeform text messages to customers if more than 24 hours have elapsed since their last inbound message.
- To re-engage, send a pre-approved **Meta Message Template**.

### Messages are not updating in real time
- Ensure `apps/api` is running and the WebSocket gateway on port `4000` is accessible.
- Verify that Redis is running and reachable by both `apps/api` and `apps/worker`.

### Local webhook events are not arriving
- Verify that your Cloudflare Tunnel or ngrok instance is active.
- Ensure the tunnel URL in Meta Developer Portal points to `/api/webhook`.

---

## 📄 License

This repository is proprietary software. All rights reserved. Unauthorized copying, distribution, modification, or commercial use is strictly prohibited.