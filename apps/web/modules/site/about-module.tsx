import Link from "next/link";

import { PageFrame } from "@/components/layout/page-frame";
import { ChannelProtocolInspector } from "./components/channel-protocol-inspector";
import { AboutFaq } from "./components/about-faq";

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Inbound Webhook Edge",
    desc: "Provider HTTP POST requests from Meta Cloud API, Telegram, and Discord are received at public edge endpoints.",
    badge: "Edge Router"
  },
  {
    step: "02",
    title: "Timing-Safe Verification",
    desc: "Inbound payload signatures are validated using constant-time HMAC-SHA256 comparisons to prevent replay attacks.",
    badge: "HMAC-SHA256"
  },
  {
    step: "03",
    title: "Canonical Event Normalization",
    desc: "Vendor payloads are transformed into a single unified CanonicalMessageEvent with resolved tenant and conversation IDs.",
    badge: "Type-Safe Schema"
  },
  {
    step: "04",
    title: "BullMQ & Redis Queue",
    desc: "Inbound events enter a distributed BullMQ queue with automatic exponential backoff retry to buffer high-concurrency traffic spikes.",
    badge: "Redis Pub/Sub"
  },
  {
    step: "05",
    title: "Multi-Tenant Persistence",
    desc: "Messages and contact records are committed to PostgreSQL with row-level tenant scoping enforced on every database query.",
    badge: "PostgreSQL"
  },
  {
    step: "06",
    title: "Sub-50ms Real-Time Push",
    desc: "Socket.io cluster dispatches new message updates to all connected agents in real time, triggering instant client cache mutations.",
    badge: "Socket.io"
  }
];

const GUARANTEES = [
  {
    title: "Zero-Trust BYO Credentials",
    tagline: "Your keys, your control",
    desc: "Paste your own Meta App Secret, Phone Number ID, and Telegram Bot Token. Secrets are encrypted at rest using AES-256-GCM. We never hold platform credentials on your behalf or transmit them to browser clients.",
    icon: "🔒"
  },
  {
    title: "Meta 24-Hour Policy Guardian",
    tagline: "Never drop an allowed reply",
    desc: "Meta imposes a strict 24-hour customer care messaging window. ConnectMe tracks the remaining time down to the second with a live countdown and warns before upstream APIs reject an out-of-window response.",
    icon: "⏱️"
  },
  {
    title: "Multi-Tenant Data Partitioning",
    tagline: "Strict workspace isolation",
    desc: "Workspace isolation is enforced on every database read and write. No tenant can ever access, search, or query another tenant's customer conversations or credentials.",
    icon: "🛡️"
  },
  {
    title: "Sub-50ms Real-Time Engine",
    tagline: "Instant multi-agent collaboration",
    desc: "Real-time bidirectional event streaming with Socket.io and TanStack Query. Private internal notes, read receipts, and keyboard navigation with j and k.",
    icon: "⚡"
  }
];

const STACK_GROUPS = [
  {
    category: "Client & UI Framework",
    items: [
      { name: "Next.js 16", detail: "App Router & Server Components" },
      { name: "React 19", detail: "Concurrent rendering & Actions" },
      { name: "Tailwind CSS v4", detail: "OKLab spectrum tokens & Geist" },
      { name: "TanStack Query v5", detail: "Optimistic updates & cache sync" }
    ]
  },
  {
    category: "API & Event Broker",
    items: [
      { name: "NestJS Microservices", detail: "Modular domain-driven API" },
      { name: "Socket.io 4.8", detail: "WebSocket event broadcast" },
      { name: "BullMQ", detail: "Distributed worker queues" },
      { name: "Redis 7.x", detail: "In-memory pub/sub & rate limiter" }
    ]
  },
  {
    category: "Data & Cryptography",
    items: [
      { name: "PostgreSQL", detail: "Relational thread & message store" },
      { name: "TypeORM", detail: "Multi-tenant scoped migrations" },
      { name: "AES-256-GCM", detail: "Hardware-accelerated token vault" },
      { name: "Timing-Safe HMAC", detail: "Constant-time signature check" }
    ]
  },
  {
    category: "Auth & Gateways",
    items: [
      { name: "Clerk Auth", detail: "Multi-tenant Google OAuth 2.0" },
      { name: "WhatsApp Cloud API", detail: "Meta Graph API v21.0" },
      { name: "Telegram Bot API", detail: "Webhook & Gateway integration" },
      { name: "Discord Gateway", detail: "Guild channels & bot intents" }
    ]
  }
];

export default function AboutModule() {
  return (
    <PageFrame>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-14 md:pt-24 md:pb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas-elevated px-3 py-1 text-[12px] font-medium text-mute shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Architecture &amp; Mission · ConnectMe
          </div>

          <h1 className="mt-6 max-w-3xl text-balance text-[36px] font-semibold leading-[1.04] tracking-[-0.045em] text-ink sm:text-[48px] md:text-[56px]">
            Engineered for high-volume customer conversations.
          </h1>

          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-body sm:text-[16.5px]">
            ConnectMe unifies customer direct messages across WhatsApp, Messenger, Instagram,
            Telegram, and Discord into a single, low-latency team queue. Built on zero-trust key
            storage, real-time event streaming, and strict Meta policy window enforcement.
          </p>

          {/* Metric Highlights Strip */}
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 border-t border-hairline pt-8">
            <div className="rounded-[12px] border border-hairline bg-canvas-elevated p-4">
              <span className="font-mono text-[26px] font-bold tracking-tight text-ink sm:text-[32px]">
                5
              </span>
              <p className="text-[12px] text-mute mt-1 font-medium">Channel Gateways</p>
            </div>
            <div className="rounded-[12px] border border-hairline bg-canvas-elevated p-4">
              <span className="font-mono text-[26px] font-bold tracking-tight text-ink sm:text-[32px]">
                24h
              </span>
              <p className="text-[12px] text-mute mt-1 font-medium">Policy Window Engine</p>
            </div>
            <div className="rounded-[12px] border border-hairline bg-canvas-elevated p-4">
              <span className="font-mono text-[24px] font-bold tracking-tight text-ink sm:text-[28px]">
                AES-256
              </span>
              <p className="text-[12px] text-mute mt-1 font-medium">Encrypted Vault</p>
            </div>
            <div className="rounded-[12px] border border-hairline bg-canvas-elevated p-4">
              <span className="font-mono text-[26px] font-bold tracking-tight text-ink sm:text-[32px]">
                &lt;50ms
              </span>
              <p className="text-[12px] text-mute mt-1 font-medium">Webhook-to-Inbox</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Channel Protocol Inspector Section */}
      <section className="border-b border-hairline bg-canvas-elevated/40">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-2xl mb-8">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
              Channel Protocol Explorer
            </span>
            <h2 className="mt-2 text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[32px]">
              Inspect supported channels and normalized events
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-body">
              Explore how incoming vendor webhooks are verified, parsed, and converted into our
              uniform canonical message schema in real time.
            </p>
          </div>

          <ChannelProtocolInspector />
        </div>
      </section>

      {/* Visual Ingestion Pipeline Architecture */}
      <section className="border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
              Event Pipeline
            </span>
            <h2 className="mt-2 text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[32px]">
              How an inbound message travels to your inbox
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-body">
              Every message passes through cryptographic verification, schema normalization,
              distributed queue buffering, and real-time WebSocket dispatch in under 50 milliseconds.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PIPELINE_STEPS.map((step) => (
              <div
                key={step.step}
                className="group relative rounded-[14px] border border-hairline bg-canvas-elevated p-5 shadow-2xs transition-all hover:border-hairline-strong"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-bold text-mute">
                    {step.step}
                  </span>
                  <span className="rounded-full bg-surface-well px-2 py-0.5 font-mono text-[10px] font-medium text-ink">
                    {step.badge}
                  </span>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-ink tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-body">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Four Core Technical Guarantees Bento */}
      <section className="border-b border-hairline bg-canvas-elevated">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
              Technical Principles
            </span>
            <h2 className="mt-2 text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[32px]">
              Built with zero-trust security and policy safety
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-body">
              Engineered from day one for compliance with Meta Developer Policies, strict tenant
              isolation, and immediate real-time response.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {GUARANTEES.map((item) => (
              <div
                key={item.title}
                className="rounded-[16px] border border-hairline bg-canvas p-6 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-hairline bg-surface-well text-[18px]">
                    {item.icon}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-semibold text-ink tracking-tight">
                      {item.title}
                    </h3>
                    <p className="font-mono text-[11px] text-mute">{item.tagline}</p>
                  </div>
                </div>
                <p className="mt-4 text-[13.5px] leading-relaxed text-body">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full System Tech Stack Specification */}
      <section className="border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
              Technical Stack
            </span>
            <h2 className="mt-2 text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[32px]">
              Modern full-stack architecture
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-body">
              Every layer of ConnectMe is typed end-to-end, tested in isolation, and packaged in a
              high-performance Turborepo monorepo.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STACK_GROUPS.map((group) => (
              <div
                key={group.category}
                className="rounded-[14px] border border-hairline bg-canvas-elevated p-5 shadow-2xs"
              >
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-mute border-b border-hairline pb-2.5">
                  {group.category}
                </h3>
                <ul className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <li key={item.name} className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-ink">{item.name}</span>
                      <span className="text-[11.5px] text-body">{item.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering FAQ */}
      <section className="border-b border-hairline bg-canvas-elevated/40">
        <div className="mx-auto max-w-4xl px-4 py-16 md:py-24">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
              FAQ
            </span>
            <h2 className="mt-2 text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[32px]">
              Frequently asked technical questions
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-body">
              Details on messaging policies, cryptographic guarantees, and multi-user queues.
            </p>
          </div>

          <AboutFaq />
        </div>
      </section>

      {/* Bottom CTA Band */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center md:py-24">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[38px]">
            Ready to unify your customer conversations?
          </h2>
          <p className="mt-4 max-w-md mx-auto text-[14.5px] leading-relaxed text-body">
            Connect your WhatsApp, Messenger, Instagram, Telegram, and Discord in minutes with your
            own credentials.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-in"
              className="flex h-11 items-center justify-center rounded-full bg-primary px-7 text-[14px] font-medium text-on-primary transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Sign in with Google
            </Link>
            <Link
              href="/privacy"
              className="flex h-11 items-center justify-center rounded-full border border-hairline bg-canvas-elevated px-6 text-[14px] font-medium text-ink transition-colors hover:bg-surface-well"
            >
              Read Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
