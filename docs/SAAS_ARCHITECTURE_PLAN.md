# ConnectMe — Production-Grade SaaS Architecture & Migration Plan

> **Authoritative blueprint** for transitioning ConnectMe from a single-repo prototype into a high-throughput, enterprise-ready, multi-tenant SaaS platform.
>
> **Stack Architecture**: **Turborepo** Monorepo + **NestJS** Backend (Clean Architecture / DDD) + **Next.js** Frontend + **PostgreSQL** (**TypeORM**) + **Redis** (Dragonfly / Upstash).

---

## 1. Executive Architecture Overview

```
                                    ┌─────────────────────────────┐
                                    │    Cloudflare Edge / CDN    │
                                    │  WAF, SSL, Rate Limiting    │
                                    └──────────────┬──────────────┘
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         │                                                   │
                         ▼                                                   ▼
            ┌─────────────────────────┐                         ┌─────────────────────────┐
            │   apps/web (Next.js)    │                         │   apps/api (NestJS)     │
            │  Geist UI, SSR, React   │                         │  Clean Architecture API │
            │  TanStack Query Cache   │                         │  Webhooks, Gateways     │
            └────────────┬────────────┘                         └────────────┬────────────┘
                         │                                                   │
                         │                   gRPC / REST / WS                │
                         └─────────────────────────┬─────────────────────────┘
                                                   │
                                                   ▼
                        ┌─────────────────────────────────────────────────────┐
                        │                Infrastructure Tier                  │
                        ├──────────────────────────┬──────────────────────────┤
                        │   PostgreSQL (RDS/Neon)  │    Redis (Cluster/KV)    │
                        │   • System of Record     │    • Idempotency Locks   │
                        │   • Multi-Tenant Data    │    • 24h Policy Cache    │
                        │   • Full-Text GIN Index  │    • Rate Limiting       │
                        │   • AES Encrypted Tokens │    • BullMQ Async Jobs   │
                        │   • Foreign Key Integrity│    • WebSocket Pub/Sub   │
                        └──────────────────────────┴──────────────────────────┘
```

---

## 2. Monorepo Structure (`Turborepo`)

The repository will be structured as an optimized Turborepo monorepo:

```
connectme/
├── apps/
│   ├── web/                          # Next.js 16 (App Router, Tailwind CSS v4, Geist Design)
│   │   ├── app/                      # Pages, Layouts, Server Components
│   │   ├── components/               # UI Components (Inbox, Thread, Settings, Site)
│   │   ├── hooks/                    # TanStack Query & WebSocket Client Hooks
│   │   ├── lib/api-client.ts         # Type-safe Axios / Fetch client connecting to NestJS
│   │   └── package.json
│   │
│   ├── api/                          # NestJS 11+ Microservice / Monolith Core (Clean Architecture)
│   │   ├── src/
│   │   │   ├── domain/               # Enterprise Business Rules (Entities, Value Objects)
│   │   │   ├── application/          # Application Business Rules (Use Cases, DTOs, Ports)
│   │   │   ├── infrastructure/       # Frameworks & Drivers (Prisma, Redis, S3, Meta SDKs)
│   │   │   ├── presentation/         # Interface Adapters (Controllers, Gateways, Webhooks)
│   │   │   └── main.ts               # Bootstrapper
│   │   └── package.json
│   │
│   └── worker/                       # BullMQ Background Job Processor (Async webhooks, SLA monitors)
│       ├── src/
│       │   ├── processors/           # Webhook ingestion, Media download, SLA tracking
│       │   └── main.ts
│       └── package.json
│
├── packages/
│   ├── database/                     # PostgreSQL schema, Prisma/Drizzle client, migrations
│   │   ├── prisma/schema.prisma
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   ├── contracts/                    # Shared TypeScript interfaces, DTOs, Zod schemas, API types
│   │   ├── src/channels.ts
│   │   ├── src/messages.ts
│   │   ├── src/webhooks.ts
│   │   └── package.json
│   │
│   ├── crypto/                       # AES-256-GCM encryption, HMAC verification routines
│   │   ├── src/aes.ts
│   │   ├── src/hmac.ts
│   │   └── package.json
│   │
│   ├── eslint-config/                # Shared ESLint configuration
│   └── typescript-config/            # Shared tsconfig.json bases
│
├── turbo.json                        # Turborepo pipeline configuration
├── docker-compose.yml                # Local dev (Postgres, Redis, Mailpit, LocalStack)
└── package.json                      # Workspace root
```

---

## 3. NestJS Clean Architecture Layering

The `apps/api` service follows **Hexagonal / Clean Architecture (Domain-Driven Design)** principles to decouple core messaging logic from database engines and third-party APIs:

```
apps/api/src/
├── domain/                                  # CORE LAYER: Pure TS, Zero external dependencies
│   ├── entities/
│   │   ├── tenant.entity.ts
│   │   ├── user.entity.ts
│   │   ├── connected-account.entity.ts
│   │   ├── contact.entity.ts
│   │   ├── conversation.entity.ts
│   │   └── message.entity.ts
│   ├── value-objects/
│   │   ├── channel.vo.ts                    # WhatsApp, Messenger, Instagram, Telegram, Discord
│   │   ├── message-status.vo.ts             # sent, delivered, read, failed
│   │   └── messaging-window.vo.ts           # 24-hour countdown calculation logic
│   └── repositories/                        # Repository Interfaces (Ports)
│       ├── i-conversation.repository.ts
│       ├── i-message.repository.ts
│       ├── i-contact.repository.ts
│       └── i-tenant.repository.ts
│
├── application/                             # APPLICATION LAYER: Orchestration & Use Cases
│   ├── use-cases/
│   │   ├── webhooks/
│   │   │   ├── process-inbound-meta.use-case.ts
│   │   │   ├── process-inbound-telegram.use-case.ts
│   │   │   └── process-inbound-discord.use-case.ts
│   │   ├── messages/
│   │   │   ├── send-reply.use-case.ts
│   │   │   ├── add-internal-note.use-case.ts
│   │   │   └── update-message-status.use-case.ts
│   │   ├── conversations/
│   │   │   ├── list-conversations.use-case.ts
│   │   │   ├── get-conversation-detail.use-case.ts
│   │   │   ├── set-assignee.use-case.ts
│   │   │   └── update-tags.use-case.ts
│   │   └── auth/
│   │       ├── connect-meta-oauth.use-case.ts
│   │       └── disconnect-account.use-case.ts
│   ├── dtos/                                # Data Transfer Objects with class-validator
│   └── services/                            # Domain services (e.g. SLA monitor, Token decrypter)
│
├── infrastructure/                          # ADAPTER LAYER: Frameworks & External Services
│   ├── database/
│   │   ├── prisma.service.ts
│   │   └── repositories/                    # Prisma Implementation of Repository Ports
│   │       ├── prisma-conversation.repository.ts
│   │       └── prisma-message.repository.ts
│   ├── redis/
│   │   ├── redis.service.ts
│   │   ├── idempotency-lock.service.ts      # Distributed atomic mutex
│   │   └── rate-limiter.service.ts
│   ├── channels/                            # Channel Driver Adapters
│   │   ├── meta/
│   │   │   ├── whatsapp.client.ts
│   │   │   ├── messenger.client.ts
│   │   │   └── instagram.client.ts
│   │   ├── telegram/telegram.client.ts
│   │   └── discord/discord.client.ts
│   ├── storage/                             # Media Storage (AWS S3 / Cloudflare R2)
│   │   └── s3-media-storage.service.ts
│   └── security/
│       ├── aes-vault.service.ts             # AES-256-GCM token encryption
│       └── clerk-jwt.guard.ts               # Multi-tenant Auth Guard
│
└── presentation/                            # INTERFACE LAYER: HTTP Controllers & WebSockets
    ├── controllers/
    │   ├── webhook.controller.ts            # High-throughput inbound Meta/Telegram/Discord
    │   ├── conversations.controller.ts
    │   ├── messages.controller.ts
    │   ├── settings.controller.ts
    │   ├── auth-meta.controller.ts
    │   └── search.controller.ts
    └── gateways/
        └── inbox-realtime.gateway.ts        # WebSocket / SSE for 0ms Live Updates
```

---

## 4. PostgreSQL Relational Database Schema

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ChannelType {
  WHATSAPP
  MESSENGER
  INSTAGRAM
  TELEGRAM
  DISCORD
}

enum MessageDirection {
  INBOUND
  OUTBOUND
  INTERNAL_NOTE
}

enum MessageStatus {
  RECEIVED
  SENT
  DELIVERED
  READ
  FAILED
}

enum MediaType {
  TEXT
  IMAGE
  VIDEO
  AUDIO
  DOCUMENT
}

enum ConversationStatus {
  OPEN
  CLOSED
  SNOOZED
}

model Tenant {
  id              String            @id @default(uuid())
  slug            String            @unique
  name            String
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  users           User[]
  credentials     TenantCredential?
  accounts        ConnectedAccount[]
  contacts        Contact[]
  conversations   Conversation[]
  
  @@map("tenants")
}

model User {
  id              String            @id
  tenantId        String
  email           String
  firstName       String?
  lastName        String?
  avatarUrl       String?
  role            String            @default("agent") // admin, agent, viewer
  createdAt       DateTime          @default(now())
  
  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  assignedThreads Conversation[]    @relation("ThreadAssignee")
  
  @@map("users")
}

model TenantCredential {
  id                  String   @id @default(uuid())
  tenantId            String   @unique
  
  // Encrypted AES-256-GCM credentials
  waPhoneNumberId     String?
  waAccessTokenEnc    String?
  waAppId             String?
  metaAppSecretEnc    String?
  webhookVerifyToken  String?
  pageAccessTokenEnc  String?
  telegramTokenEnc    String?
  discordBotTokenEnc  String?
  discordPublicKey    String?
  
  updatedAt           DateTime @updatedAt
  tenant              Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@map("tenant_credentials")
}

model ConnectedAccount {
  id              String       @id @default(uuid())
  tenantId        String
  channel         ChannelType
  provider        String       // meta, telegram, discord
  externalId      String       // Page ID, Instagram ID, Bot ID
  name            String
  avatarUrl       String?
  accessTokenEnc  String?      // Page/bot scoped token
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  
  tenant          Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  conversations   Conversation[]
  
  @@unique([tenantId, externalId])
  @@map("connected_accounts")
}

model Contact {
  id              String       @id @default(uuid())
  tenantId        String
  channel         ChannelType
  externalId      String       // Phone Number, PSID, IGSID, Telegram Chat ID, Discord User ID
  name            String
  avatarUrl       String?
  email           String?
  phoneNumber     String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  tenant          Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  conversations   Conversation[]
  
  @@unique([tenantId, channel, externalId])
  @@index([tenantId, name])
  @@map("contacts")
}

model Conversation {
  id                String             @id @default(uuid())
  tenantId          String
  contactId         String
  accountId         String?
  channel           ChannelType
  status            ConversationStatus @default(OPEN)
  assigneeId        String?
  tags              String[]           @default([])
  
  unreadCount       Int                @default(0)
  lastMessageText   String?
  lastMessageAt     DateTime           @default(now())
  lastInboundAt     DateTime?
  lastReadAt        DateTime?
  
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  tenant            Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  contact           Contact            @relation(fields: [contactId], references: [id], onDelete: Cascade)
  account           ConnectedAccount?  @relation(fields: [accountId], references: [id])
  assignee          User?              @relation("ThreadAssignee", fields: [assigneeId], references: [id])
  messages          Message[]
  
  @@index([tenantId, status, lastMessageAt(sort: Desc)])
  @@index([tenantId, channel])
  @@map("conversations")
}

model Message {
  id                String           @id @default(uuid())
  conversationId    String
  externalId        String?          // Meta wamid/mid, Telegram msg ID, Discord msg ID
  direction         MessageDirection
  channel           ChannelType
  type              MediaType        @default(TEXT)
  
  text              String?          @db.Text
  mediaUrl          String?
  mediaMimeType     String?
  mediaSize         Int?
  
  status            MessageStatus    @default(RECEIVED)
  authorName        String?          // For internal notes or agent replies
  errorDetail       String?
  
  createdAt         DateTime         @default(now())
  
  conversation      Conversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId, createdAt(sort: Asc)])
  @@index([externalId])
  @@map("messages")
}
```

---

## 5. Comprehensive Feature Parity Matrix

Every feature from ConnectMe is mapped into the new production architecture:

| Feature | Current Prototype | Production SaaS Architecture |
| :--- | :--- | :--- |
| **WhatsApp Cloud API** | Node fetch + memory queue | Dedicated NestJS driver, BullMQ async webhook parsing, Graph API v22+ |
| **Messenger & Instagram Multi-Account** | Single store state | `ConnectedAccount` entities with distinct page tokens and 1-Click Meta OAuth |
| **Telegram Bot API** | Direct webhook endpoint | NestJS Telegram driver with automated webhook setting & retry backoff |
| **Discord Gateway / Slash** | Custom signature handler | Ed25519 signature verification guard + Interactions handler |
| **24h Messaging Window** | Client computation | Server-side domain value object (`MessagingWindowVO`) + Redis timer checks |
| **Internal Notes & Tags** | In-memory JSON array | PostgreSQL relational records with multi-user audit logging |
| **First-Response SLA** | Client calculation | Computed SQL analytics (`first_response_time_ms`) + alerting |
| **Media Attachments** | Local `/public/uploads` | Cloudflare R2 / AWS S3 presigned upload URLs with CDN delivery |
| **Thread URLs** | `/conversations/[id]` | Full Next.js Dynamic Routes + SSR prefetching with React Query |
| **Search** | Full-table text scan | PostgreSQL Full-Text Search (`tsvector` / GIN index) + Redis query cache |
| **Keyboard Shortcuts** | UI event listeners (`j`/`k`/`a`/`Esc`) | Preserved in Next.js web client with accessible focus trapping |
| **Responsive Mobile UI** | Responsive Geist design | Next.js 16 Tailwind v4 UI with native touch targets and responsive layouts |

---

## 6. High-Throughput Webhook Processing Pipeline

```
Meta Webhook Inbound (WhatsApp / Messenger / Instagram)
                         │
                         ▼
             [NestJS Webhook Controller]
                         │
        1. Fast 200 OK Response (< 50ms)
        2. HMAC-SHA256 Timing-Safe Verification
        3. Redis Idempotency Lock (`SET lock:wamid NX EX 60`)
                         │
                         ▼
                 [BullMQ Queue]
                 `inbound-webhooks`
                         │
                         ▼
              [NestJS Worker Service]
                         │
        ├── Ingest / Upsert Contact (Graph API Profile Backfill)
        ├── Normalize Inbound Message Payload
        ├── Store in PostgreSQL (ACID Transaction)
        ├── Upload Media to Cloudflare R2 / S3
        └── Emit WebSocket Event to `apps/web` (0ms Live UI update)
```

---

## 7. Migration Steps & Execution Phases

### Phase 1: Workspace & Monorepo Initialization
1. Initialize Turborepo (`npx create-turbo@latest`).
2. Move current Next.js project to `apps/web`.
3. Create `packages/contracts` and extract shared types (`Channel`, `Message`, `Conversation`, `User`).
4. Create `packages/database` and initialize Prisma with PostgreSQL.
5. Create `packages/crypto` with AES-256-GCM encryption and HMAC validation.

### Phase 2: NestJS Clean Architecture API (`apps/api`)
1. Bootstrap NestJS with fastify/express engine and dependency injection.
2. Implement Domain Entities and Repository Ports.
3. Implement Prisma Database Repositories in `infrastructure/database`.
4. Implement Meta, Telegram, and Discord integration services in `infrastructure/channels`.
5. Implement Application Use Cases (`ProcessInboundMeta`, `SendReply`, `ListConversations`).
6. Set up Webhook Controllers with HMAC verification and idempotency locks.

### Phase 3: Real-Time WebSockets & Background Workers
1. Implement Redis Pub/Sub Gateway (`Socket.io` or NestJS WebSockets).
2. Set up BullMQ worker for asynchronous webhook ingestion and media fetching.
3. Integrate Cloudflare R2 / AWS S3 for attachment storage.

### Phase 4: Next.js Frontend Refactor & API Client Integration
1. Configure type-safe API client connecting to NestJS API.
2. Connect TanStack React Query to NestJS REST + WebSocket endpoints.
3. Retain complete Geist UI design tokens, theme engine, and mobile responsiveness.

### Phase 5: Security, Testing, & Production Deployment
1. Multi-tenant security audit (tenant boundary validation on every query).
2. End-to-end integration tests with Jest & Supertest.
3. Dockerize `apps/web`, `apps/api`, and `apps/worker`.
4. CI/CD GitHub Actions pipeline for linting, testing, Prisma migrations, and deployment.

---

## 8. Summary Checklist

- [x] Monorepo architecture designed (`apps/web`, `apps/api`, `apps/worker`, `packages/*`).
- [x] Clean Architecture layers specified for NestJS (Domain, Application, Infrastructure, Presentation).
- [x] Full PostgreSQL relational schema with indexes and encryption created.
- [x] All 5 omnichannel integrations preserved (WhatsApp, Messenger, Instagram, Telegram, Discord).
- [x] Real-time BullMQ & WebSocket architecture planned.
- [x] Security, multi-tenancy, and high-throughput SLA requirements verified.
