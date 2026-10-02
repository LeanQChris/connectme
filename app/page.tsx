import Link from "next/link";
import ThemeToggle from "@/components/inbox/theme-toggle";
import Logo from "@/components/logo";

export default function HomePage() {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-canvas text-ink selection:bg-ink selection:text-on-primary">
      {/* 48px Geist Navbar (per DESIGN.md nav-bar) */}
      <header className="sticky top-0 z-50 flex h-12 w-full items-center justify-between border-b border-hairline bg-canvas/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5 select-none">
            <div className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-hairline bg-primary text-on-primary shadow-2xs">
              <Logo className="h-3.5 w-3.5" />
            </div>
            <span className="text-[13px] font-semibold tracking-[-0.02em] text-ink">
              ConnectMe
            </span>
          </Link>

          <span className="hidden h-3.5 w-px bg-hairline sm:block" />

          <nav className="hidden items-center gap-4 text-[12px] font-medium text-body sm:flex">
            <a href="#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <a href="#architecture" className="transition-colors hover:text-ink">
              Architecture
            </a>
            <a href="#channels" className="transition-colors hover:text-ink">
              Supported Channels
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Link
            href="/sign-in"
            className="flex h-8 items-center rounded-[6px] bg-primary px-3 text-[12px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 active:opacity-95"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero Section with Mesh Gradient Backdrop */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-16 pb-14 text-center md:pt-28 md:pb-24">
        {/* Soft Multi-stop Mesh Gradient (per DESIGN.md hero) */}
        <div className="mesh-gradient pointer-events-none absolute inset-0 opacity-70 dark:opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--canvas)_50%,_transparent_100%)]" />

        <div className="relative z-10 mx-auto max-w-4xl w-full">
          {/* Eyebrow badge */}
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-hairline bg-canvas-elevated px-3 py-1 text-[11px] font-medium text-body shadow-2xs">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="truncate font-mono text-[10px] sm:text-[10.5px] uppercase tracking-wider text-mute">
              CONNECTME // META UNIFIED GATEWAY
            </span>
          </div>

          {/* Display Headline with tight tracking */}
          <h1 className="mt-5 sm:mt-6 text-[32px] font-semibold leading-[1.1] tracking-[-0.04em] text-ink xs:text-[40px] sm:text-[56px] md:text-[64px] sm:leading-[1.08] sm:tracking-[-0.05em] text-balance">
            One inbox for WhatsApp, <br className="hidden sm:inline" />
            Telegram, Messenger & Instagram.
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-4 sm:mt-5 max-w-2xl px-2 text-[14.5px] leading-relaxed text-body sm:text-[17px]">
            ConnectMe aggregates your customer conversations into a single, high-speed
            workspace with real-time webhooks, policy compliance, and 0ms cached UI.
          </p>

          {/* Action CTA (pill per DESIGN.md marketing buttons) */}
          <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-none mx-auto">
            <Link
              href="/sign-in"
              className="w-full sm:w-auto flex h-11 items-center justify-center rounded-full bg-primary px-6 text-[14px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 active:opacity-95"
            >
              Continue with Google ↗
            </Link>

            <a
              href="#features"
              className="w-full sm:w-auto flex h-11 items-center justify-center rounded-full border border-hairline bg-canvas-elevated px-6 text-[14px] font-medium text-ink shadow-2xs transition-colors hover:bg-surface-well"
            >
              See features
            </a>
          </div>

          {/* Live Channels Health Indicator */}
          <div className="mt-8 sm:mt-10 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-6 font-mono text-[10.5px] sm:text-[11px] text-mute max-w-md sm:max-w-none mx-auto text-left sm:text-center">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-whatsapp shrink-0" />
              <span className="truncate">WhatsApp Cloud</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-messenger shrink-0" />
              <span className="truncate">Messenger</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
              <span className="truncate">Telegram Bot</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-pink-500 shrink-0" />
              <span className="truncate">Instagram Direct</span>
            </div>
          </div>
        </div>

        {/* Interactive App Preview Showcase Card */}
        <div className="relative z-10 mx-auto mt-10 sm:mt-14 w-full max-w-5xl px-0 sm:px-6">
          <div className="overflow-hidden rounded-xl border border-hairline bg-canvas-elevated p-1 shadow-[0px_1px_1px_rgba(0,0,0,0.05),0px_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0px_1px_1px_rgba(255,255,255,0.05),0px_20px_50px_rgba(0,0,0,0.5)]">
            {/* Window header */}
            <div className="flex h-9 items-center justify-between border-b border-hairline bg-canvas px-3 text-[11px] font-mono text-mute">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80 dark:bg-red-500/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 dark:bg-amber-500/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 dark:bg-emerald-500/40" />
              </div>
              <span className="text-[10px] tracking-wider uppercase truncate px-2">
                connectme.app // live console preview
              </span>
              <span className="text-[10px] text-emerald-500 font-medium shrink-0">● 3/3 active</span>
            </div>

            {/* App UI Snapshot Mock */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[360px] sm:min-h-[380px] bg-canvas text-left">
              {/* Sidebar Preview (Hidden on small mobile to avoid vertical bloating, visible on md+) */}
              <div className="hidden md:flex md:col-span-4 border-r border-hairline bg-canvas flex-col">
                <div className="p-2.5 border-b border-hairline flex items-center justify-between">
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-mute">
                    Inbox (3)
                  </span>
                  <span className="rounded-full bg-primary px-1.5 font-mono text-[9px] font-bold text-on-primary">
                    Live
                  </span>
                </div>
                <div className="divide-y divide-hairline">
                  {/* WhatsApp Item */}
                  <div className="p-3 bg-canvas-elevated shadow-[inset_2px_0_0_var(--ink)] flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-800 text-white flex items-center justify-center font-mono text-[11px] font-bold relative shrink-0">
                      AL
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-whatsapp ring-2 ring-canvas" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-ink">Alex Rivera</span>
                        <span className="font-mono text-[9.5px] text-mute">2m ago</span>
                      </div>
                      <p className="text-[11px] text-body truncate">Hello, I have a quick question about delivery...</p>
                    </div>
                  </div>

                  {/* Messenger Item */}
                  <div className="p-3 hover:bg-surface-well flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-neutral-700 text-white flex items-center justify-center font-mono text-[11px] font-bold relative shrink-0">
                      SK
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-messenger ring-2 ring-canvas" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-ink">Sophia Kim</span>
                        <span className="font-mono text-[9.5px] text-mute">18m ago</span>
                      </div>
                      <p className="text-[11px] text-mute truncate">📷 Photo attachment received</p>
                    </div>
                  </div>

                  {/* Instagram Item */}
                  <div className="p-3 hover:bg-surface-well flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-stone-800 text-white flex items-center justify-center font-mono text-[11px] font-bold relative shrink-0">
                      MJ
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-pink-500 ring-2 ring-canvas" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-ink">@marcus_j</span>
                        <span className="font-mono text-[9.5px] text-mute">1h ago</span>
                      </div>
                      <p className="text-[11px] text-mute truncate">Are you available for consulting?</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thread Preview */}
              <div className="col-span-1 md:col-span-8 flex flex-col justify-between bg-canvas">
                {/* Header */}
                <div className="h-12 border-b border-hairline bg-canvas-elevated px-3 sm:px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-zinc-800 text-white flex items-center justify-center font-mono text-[10px] font-bold">
                      AL
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[12.5px] font-semibold text-ink truncate">Alex Rivera</span>
                        <span className="rounded-full bg-whatsapp/10 px-1.5 py-0.2 font-mono text-[9px] font-medium uppercase text-whatsapp">
                          WhatsApp
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-mute shrink-0">+1 (555) 019-2834</span>
                </div>

                {/* 24h Window bar */}
                <div className="border-b border-hairline bg-canvas px-3 sm:px-4 py-1.5 text-[10.5px] flex items-center justify-between gap-2">
                  <span className="text-body font-medium flex items-center gap-1.5 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">24h Standard Messaging Window Active</span>
                  </span>
                  <span className="font-mono text-mute shrink-0">23h 58m</span>
                </div>

                {/* Messages stream */}
                <div className="p-3 sm:p-4 space-y-3 flex-1 flex flex-col justify-end">
                  <div className="flex justify-start">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-[12px] rounded-tl-[2px] border border-hairline bg-canvas-elevated p-3 text-[12.5px] text-ink">
                      Hello! I saw your service on Instagram and wanted to follow up via WhatsApp.
                      <div className="mt-1 font-mono text-[9.5px] text-mute text-right">10:42 AM</div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-[12px] rounded-tr-[2px] bg-primary p-3 text-[12.5px] text-on-primary">
                      Hi Alex! Thanks for reaching out. We can definitely help you with that.
                      <div className="mt-1 font-mono text-[9.5px] opacity-75 text-right">10:43 AM · ✓✓</div>
                    </div>
                  </div>
                </div>

                {/* Reply bar mock */}
                <div className="p-2.5 sm:p-3 border-t border-hairline bg-canvas">
                  <div className="flex items-center gap-2 rounded-[6px] border border-hairline bg-canvas-elevated px-3 py-2 text-[12px] text-mute">
                    <span className="flex-1 truncate">Write a reply…</span>
                    <span className="rounded-[4px] bg-primary px-2.5 py-1 text-[11px] font-medium text-on-primary shrink-0">
                      Send ↵
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section (`feature-card` per DESIGN.md) */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:py-20 border-t border-hairline">
        <div className="mb-12 text-center">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-mute">
            CORE CAPABILITIES
          </span>
          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-ink sm:text-[36px]">
            Engineered for speed, compliance, and clarity.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] text-body">
            Everything you need to handle high-volume inbound customer messaging with zero clutter.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-2xs transition-colors hover:border-hairline-strong">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[6px] border border-hairline bg-canvas text-ink">
              ⚡
            </div>
            <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-ink">
              Sub-Millisecond React Query
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              TanStack React Query handles optimistic updates and memory caching for instantaneous
              channel switching and seamless offline tolerance.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-2xs transition-colors hover:border-hairline-strong">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[6px] border border-hairline bg-canvas text-ink">
              ⏱️
            </div>
            <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-ink">
              24-Hour Policy Intelligence
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              Automated countdown timer prevents account flags and delivery failures by calculating
              exact reply window expiration down to the second.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-2xs transition-colors hover:border-hairline-strong">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[6px] border border-hairline bg-canvas text-ink">
              🖼️
            </div>
            <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-ink">
              Graph API Profile Backfill
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              Customer profile pictures, verified names, voice notes, video, and PDF document
              attachments resolve automatically in high resolution.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-2xs transition-colors hover:border-hairline-strong">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[6px] border border-hairline bg-canvas text-ink">
              🔒
            </div>
            <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-ink">
              HMAC-SHA256 Webhook Security
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              Cryptographically verifies every incoming Meta webhook signature with zero risk of
              tampering or spoofed payloads.
            </p>
          </div>

          {/* Card 5 */}
          <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-2xs transition-colors hover:border-hairline-strong">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[6px] border border-hairline bg-canvas text-ink">
              🔗
            </div>
            <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-ink">
              Dedicated Thread URLs
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              Direct deep linking (`/conversations/[id]`) with full browser history support, allowing
              instant bookmarking and team sharing.
            </p>
          </div>

          {/* Card 6 */}
          <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-2xs transition-colors hover:border-hairline-strong">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[6px] border border-hairline bg-canvas text-ink">
              ☁️
            </div>
            <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-ink">
              Serverless KV / Redis Store
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-body">
              Deployable on Vercel with zero database management overhead. Seamless local JSON
              fallback for local development.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture & Code Section (`code-block` per DESIGN.md) */}
      <section id="architecture" className="mx-auto max-w-5xl px-4 py-14 sm:py-16 border-t border-hairline">
        <div className="mb-8">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-mute">
            UNDER THE HOOD
          </span>
          <h2 className="mt-1 text-[22px] sm:text-[24px] font-semibold tracking-[-0.03em] text-ink">
            Unified Inbound Event Normalization
          </h2>
          <p className="mt-1.5 text-[13px] text-body">
            Incoming webhooks from disparate Meta endpoints are normalized into a unified, clean
            data model.
          </p>
        </div>

        <div className="overflow-hidden rounded-[8px] border border-hairline bg-canvas-elevated shadow-2xs">
          <div className="flex h-9 items-center justify-between border-b border-hairline bg-canvas px-4 font-mono text-[11px] text-mute">
            <span>types/inbound-message.ts</span>
            <span className="text-[10.5px]">TypeScript</span>
          </div>
          <pre className="overflow-x-auto p-3.5 sm:p-4 font-mono text-[11px] sm:text-[12px] leading-relaxed text-ink selection:bg-ink selection:text-on-primary">
            <code>{`interface Message {
  id: string;                    // UUID
  externalId: string;            // Meta message ID (mid or wamid)
  conversationId: string;        // Channel + Contact ID
  channel: "whatsapp" | "messenger" | "instagram";
  direction: "in" | "out";
  senderName: string | null;     // Real name resolved from Graph API
  text: string | null;           // Clean message text
  mediaUrl: string | null;       // High-res media or audio attachment
  type: "text" | "image" | "video" | "audio" | "document";
  status: "sent" | "delivered" | "read" | "failed";
  createdAt: string;             // ISO timestamp
}`}</code>
          </pre>
        </div>
      </section>

      {/* CTA Band (`cta-band` per DESIGN.md) */}
      <section className="relative overflow-hidden border-t border-hairline bg-canvas-elevated py-16 sm:py-20 text-center">
        <div className="mesh-gradient pointer-events-none absolute inset-0 opacity-40 dark:opacity-25" />
        <div className="relative z-10 mx-auto max-w-2xl px-4">
          <h2 className="text-[28px] sm:text-[32px] md:text-[40px] font-semibold tracking-[-0.04em] text-ink">
            Ready to streamline your customer messaging?
          </h2>
          <p className="mt-3 text-[14px] text-body">
            Access your unified Meta inbox now and start replying to your customers in real time.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/inbox"
              className="flex h-11 items-center justify-center rounded-full bg-primary px-8 text-[14px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 active:opacity-95"
            >
              Open workspace →
            </Link>
          </div>
        </div>
      </section>

      {/* Minimal Geist Footer */}
      <footer className="border-t border-hairline bg-canvas py-8 px-4 text-center">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row text-[12px] text-mute">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-hairline bg-primary text-on-primary text-[10px]">
              <Logo className="h-3 w-3" />
            </div>
            <span className="font-medium text-ink">ConnectMe</span>
            <span>— Meta Unified Gateway</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[11px]">
            <Link href="/sign-in" className="hover:text-ink transition-colors">
              Sign in
            </Link>
            <span>·</span>
            <Link href="/settings" className="hover:text-ink transition-colors">
              Settings
            </Link>
            <span>·</span>
            <Link href="/about" className="hover:text-ink transition-colors">
              About
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-ink transition-colors">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/inbox" className="hover:text-ink transition-colors">
              Workspace
            </Link>
            <span>·</span>
            <span className="text-body">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}