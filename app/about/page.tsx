import Link from "next/link";

import { DocList, DocSection, PageFrame } from "@/components/site/page-frame";

export const metadata = {
  title: "About · ConnectMe",
  description: "What ConnectMe is, how it works, and how your data is handled.",
};

const CHANNELS = [
  { name: "WhatsApp", detail: "WhatsApp Business Cloud API", dot: "bg-whatsapp" },
  { name: "Messenger", detail: "Meta Graph API", dot: "bg-messenger" },
  { name: "Instagram", detail: "Instagram Direct via Graph API", dot: "bg-pink-500" },
  { name: "Telegram", detail: "Telegram Bot API", dot: "bg-sky-500" },
  { name: "Discord", detail: "Discord bot gateway", dot: "bg-[#5865F2]" },
];

const STACK = [
  ["Framework", "Next.js 16 App Router + React 19"],
  ["Styling", "Tailwind CSS v4 with Geist design tokens"],
  ["Client state", "TanStack Query, 3-second polling"],
  ["Auth", "Clerk sessions, Google OAuth only"],
  ["Secrets at rest", "AES-256-GCM in lib/secrets.ts"],
  ["Store", "Local JSON file, or Vercel KV / Upstash Redis"],
];

export default function AboutPage() {
  return (
    <PageFrame>
      <div className="relative overflow-hidden border-b border-hairline">
        <div className="mesh-gradient pointer-events-none absolute inset-0 opacity-70 dark:opacity-40" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-14">
          <span className="font-mono text-[11px] uppercase tracking-wider text-mute">
            About // ConnectMe
          </span>
          <h1 className="mt-2 text-[30px] font-semibold leading-[1.15] tracking-[-0.04em] text-ink sm:text-[40px]">
            One inbox for every channel your customers already use.
          </h1>
          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-body">
            ConnectMe is a multi-tenant team inbox for small teams who answer customers on WhatsApp,
            Messenger, Instagram, Telegram, and Discord. Instead of five tabs and five logins, you
            get one threaded view, one search box, and one composer — with the 24-hour messaging
            window that Meta enforces shown as a live countdown.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {CHANNELS.map((channel) => (
              <span
                key={channel.name}
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas-elevated px-3 py-1 text-[12px] text-body shadow-2xs"
              >
                <span className={`h-2 w-2 rounded-full ${channel.dot}`} />
                {channel.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <div className="space-y-6">
          <DocSection title="How it works">
            <DocList
              items={[
                <>
                  <strong className="font-medium text-ink">Bring your own credentials.</strong> In
                  Settings you paste your own Meta app secret, phone number id, page token, and
                  Telegram bot token. ConnectMe never holds platform credentials on your behalf, and
                  encrypts them before they touch the store.
                </>,
                <>
                  <strong className="font-medium text-ink">Webhooks normalize everything.</strong>{" "}
                  Inbound events from each provider are verified by signature, normalized into one
                  message shape, and filed under the right account — so a Discord webhook and a
                  WhatsApp payload land in the same list without collisions.
                </>,
                <>
                  <strong className="font-medium text-ink">Threads, notes, and triage.</strong>{" "}
                  Each conversation gets a permanent URL. Add private internal notes, tag, assign,
                  archive, or close conversations, and walk the list from the keyboard with
                  <span className="font-mono text-[12px] text-ink"> j</span>/
                  <span className="font-mono text-[12px] text-ink"> k</span>.
                </>,
                <>
                  <strong className="font-medium text-ink">Replies respect the rules.</strong> The
                  window countdown tracks Meta&rsquo;s 24-hour customer-care policy and the send
                  button tells you when a reply would fall outside it, instead of letting the API
                  reject it silently.
                </>,
              ]}
            />
          </DocSection>

          <DocSection title="Who it is for">
            <p>
              Sole traders, agencies, and support leads who live in their DMs and need one
              searchable, replyable history across channels — without migrating a customer&apos;s
              conversation into yet another vendor&rsquo;s platform. Every account is isolated:
              workspace scoping is enforced on every read and write, so tenants never see each
              other&rsquo;s conversations.
            </p>
          </DocSection>

          <DocSection title="Built with">
            <dl className="divide-y divide-hairline overflow-hidden rounded-[10px] border border-hairline">
              {STACK.map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 sm:gap-6 bg-canvas-elevated px-4 py-2.5"
                >
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-mute shrink-0">
                    {label}
                  </dt>
                  <dd className="text-left sm:text-right text-[13px] text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </DocSection>

          <DocSection title="Your data, plainly">
            <p>
              One Google sign-in, and nothing else — no advertising trackers, no third-party
              analytics, no session replay. Provider tokens are encrypted at rest, conversations are
              scoped to your account, and outbound messages go only to the customer you write to.{" "}
              <Link href="/privacy" className="text-link underline decoration-hairline underline-offset-2 hover:decoration-link">
                Read the full Privacy Policy
              </Link>
              .
            </p>
          </DocSection>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/sign-in"
              className="flex h-11 items-center rounded-full bg-primary px-6 text-[14px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90"
            >
              Continue with Google ↗
            </Link>
            <Link
              href="/"
              className="flex h-11 items-center rounded-full border border-hairline bg-canvas-elevated px-6 text-[14px] font-medium text-ink shadow-2xs transition-colors hover:bg-surface-well"
            >
              Read more about the build
            </Link>
          </div>
        </div>
      </article>
    </PageFrame>
  );
}
