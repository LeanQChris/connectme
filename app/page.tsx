import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import UserMenu from "@/components/auth/user-menu";
import { ChannelIcon, channelMeta } from "@/components/inbox/channel-badge";
import ThemeToggle from "@/components/inbox/theme-toggle";
import Logo from "@/components/logo";
import type { Channel } from "@/lib/types";

export const metadata = {
  title: "ConnectMe · One inbox for every customer channel",
  description:
    "ConnectMe puts WhatsApp, Messenger, Instagram, Telegram and Discord into a single agent inbox, with reply-window countdowns and per-page routing.",
};

const INBOX_ROUTES = [
  { label: "Inbox", href: "/inbox" },
  { label: "Channels", href: "#channels" },
  { label: "How it works", href: "#setup" },
];

/** What actually lands in the queue from each connected account. */
const CHANNELS: {
  name: string;
  channel: Channel;
  account: string;
  arrives: string;
  rule: string;
}[] = [
  {
    name: "WhatsApp",
    channel: "whatsapp",
    account: "Business number",
    arrives: "Text, images, voice notes, files",
    rule: "Free-form replies inside 24h",
  },
  {
    name: "Messenger",
    channel: "messenger",
    account: "Facebook page",
    arrives: "Page inbox messages and comments-to-DMs",
    rule: "Labeled, template-aware, per-page routing",
  },
  {
    name: "Instagram",
    channel: "instagram",
    account: "Professional account",
    arrives: "Direct messages from your profile",
    rule: "Same 24h messaging window",
  },
  {
    name: "Telegram",
    channel: "telegram",
    account: "Bot",
    arrives: "Direct and group messages",
    rule: "No window, reply anytime",
  },
  {
    name: "Discord",
    channel: "discord",
    account: "Bot",
    arrives: "Channel and DM messages",
    rule: "No window, reply anytime",
  },
];

const CAPABILITIES = [
  {
    title: "The reply window is a countdown, not a footnote",
    body: "Every inbound message opens a timed window on the thread, so you can see how long you have before the channel forces a template.",
    render: (
      <div className="flex items-center gap-2.5 rounded-[6px] border border-hairline bg-canvas px-3 py-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="truncate text-[12px] text-body">24h window open</span>
        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-ink">
          23h 58m
        </span>
      </div>
    ),
  },
  {
    title: "Notes stay inside the thread",
    body: "Internal notes sit in the conversation as annotations, never in the reply box, so nothing leaks out to a customer by accident.",
    render: (
      <div className="flex items-stretch gap-2.5">
        <span className="w-0.5 shrink-0 rounded-full bg-warning/45" />
        <p className="text-[12px] leading-relaxed text-body">
          Customer is asking about delivery — check the courier first.
        </p>
      </div>
    ),
  },
  {
    title: "Know which page each message came from",
    body: "Connect several Facebook pages or Instagram accounts and the agent picks one. Every thread carries its page badge, and replies go out on the right token.",
    render: (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-[4px] bg-messenger/10 px-1.5 py-px font-mono text-[10px] text-messenger">
          Northwind Store
        </span>
        <span className="rounded-[4px] bg-messenger/10 px-1.5 py-px font-mono text-[10px] text-messenger">
          Northwind EU
        </span>
        <span className="rounded-[4px] bg-pink-500/10 px-1.5 py-px font-mono text-[10px] text-pink-500">
          @northwind
        </span>
      </div>
    ),
  },
];

const SETUP = [
  {
    step: "01",
    title: "Sign in with Google",
    body: "Your workspace is created on first sign-in. Nothing to install.",
  },
  {
    step: "02",
    title: "Authorize your pages",
    body: "Meta hands over the pages and professional accounts you manage, with their own tokens.",
  },
  {
    step: "03",
    title: "Start answering",
    body: "ConnectMe subscribes each page to the webhook itself. Messages arrive in the inbox as they land.",
  },
];

/** Decorative replica of the real inbox, used as the hero's thesis. */
function ConsolePreview() {
  const threads = [
    {
      page: "Northwind Store",
      pageClass: "bg-messenger/10 text-messenger",
      name: "Alex Rivera",
      preview: "Does the Tuesday order ship before Friday?",
      time: "2m",
      unread: true,
    },
    {
      page: "@northwind",
      pageClass: "bg-pink-500/10 text-pink-500",
      name: "Marcus J",
      preview: "Is the consulting slot still open?",
      time: "18m",
      unread: true,
    },
    {
      page: "Support line",
      pageClass: "bg-whatsapp/10 text-whatsapp",
      name: "Priya N",
      preview: "Thanks, that worked.",
      time: "1h",
      unread: false,
    },
  ];

  return (
    <div className="overflow-hidden rounded-[12px] border border-hairline bg-canvas-elevated shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.09)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
      {/* Window chrome: doubles as the honest version of a browser frame. */}
      <div className="flex h-9 items-center justify-between border-b border-hairline bg-canvas px-3">
        <div className="flex items-center gap-2 font-mono text-[10.5px] text-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-hairline-strong" />
          <span className="truncate">connectme.app/inbox</span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          5 channels live
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[52px_minmax(0,1fr)]">
        {/* Channel dock: every provider, one glance. */}
        <div className="hidden flex-col items-center gap-1.5 border-r border-hairline bg-canvas py-3 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-ink text-on-primary">
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
                d="M4 5h16v11H8l-4 4V5z"
              />
            </svg>
          </span>
          <span className="my-0.5 h-px w-5 bg-hairline" />
          {CHANNELS.map((channel, index) => (
            <span
              key={channel.name}
              title={channel.name}
              className={`relative flex h-8 w-8 items-center justify-center rounded-[8px] ${channelMeta(channel.channel).tile} text-white`}
            >
              <ChannelIcon channel={channel.channel} className="h-[17px] w-[17px]" />
              {index < 2 && (
                <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-ink px-1 font-mono text-[8.5px] font-bold text-on-primary">
                  {index + 1}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Thread stream: the answer to "what is this". */}
        <div className="min-w-0">
          <div className="flex h-8 items-center justify-between border-b border-hairline px-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mute">
              All conversations
            </span>
            <span className="rounded-full bg-surface-well px-1.5 py-px font-mono text-[9.5px] tabular-nums text-mute">
              3
            </span>
          </div>

          <ul className="divide-y divide-hairline">
            {threads.map((thread) => (
              <li
                key={thread.name}
                className={`flex items-center gap-2.5 px-3 py-2.5 ${
                  thread.unread ? "bg-canvas" : "bg-canvas-elevated"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-well font-mono text-[10px] font-medium text-body">
                  {thread.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[11.5px] font-medium text-ink">
                      {thread.name}
                    </span>
                    <span className="shrink-0 font-mono text-[9.5px] tabular-nums text-mute">
                      {thread.time}
                    </span>
                  </div>
                  {/* The page badge: two Messenger pages, no guessing. */}
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`shrink-0 rounded-[3px] px-1.5 py-px font-mono text-[9px] ${thread.pageClass}`}
                    >
                      {thread.page}
                    </span>
                    <span className="truncate text-[10.5px] text-mute">
                      {thread.preview}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Routing line: proves the reply goes out on the right page. */}
          <div className="border-t border-hairline bg-canvas px-3 py-2">
            <p className="truncate font-mono text-[9.5px] text-mute">
              Reply sent via Northwind Store · Messenger
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  // The landing page is public, but a signed-in visitor should never be asked
  // to sign in again.
  const { userId } = await auth();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-canvas/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-hairline bg-primary text-on-primary">
              <Logo className="h-3.5 w-3.5" />
            </span>
            <span className="text-[13px] font-semibold tracking-[-0.02em]">ConnectMe</span>
          </Link>
          <span className="hidden rounded-[4px] border border-hairline bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mute sm:inline">
            Unified inbox
          </span>
        </div>

        <nav className="hidden items-center gap-5 text-[12px] font-medium text-body md:flex">
          {INBOX_ROUTES.slice(1).map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-ink">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {userId ? (
            <>
              <Link
                href="/inbox"
                className="flex h-8 items-center rounded-[6px] bg-primary px-3 text-[12px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90"
              >
                Open inbox
              </Link>
              <UserMenu />
            </>
          ) : (
            <Link
              href="/sign-in"
              className="flex h-8 items-center rounded-[6px] bg-primary px-3 text-[12px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: the thesis is the console, not a promise about it. */}
        <section className="relative overflow-hidden border-b border-hairline">
          {/* One directional wash. Restrained on purpose. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-20%,rgba(0,112,243,0.10),transparent_65%)]"
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-14 md:py-20">
            <div className="motion-safe:animate-[fade-up_0.5s_ease-out_both]">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                WhatsApp · Messenger · Instagram · Telegram · Discord
              </p>

              <h1 className="mt-4 text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink sm:text-[46px] md:text-[54px]">
                Every customer message, in one queue.
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-body">
                ConnectMe pulls messages from every channel you already use into a single agent
                inbox. One thread list, one reply box, and a live countdown of how long you have to
                answer before the channel insists on a template.
              </p>

              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href={userId ? "/inbox" : "/sign-in"}
                  className="flex h-11 items-center justify-center rounded-full bg-primary px-6 text-[14px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90"
                >
                  {userId ? "Open your inbox" : "Start with Google"}
                </Link>
                <a
                  href="#channels"
                  className="flex h-11 items-center justify-center rounded-full border border-hairline bg-canvas-elevated px-6 text-[14px] font-medium text-ink transition-colors hover:bg-surface-well"
                >
                  See what arrives
                </a>
              </div>

              <dl className="mt-9 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-[8px] border border-hairline bg-hairline">
                {[
                  { label: "Channels", value: "5" },
                  { label: "Setup", value: "3 steps" },
                  { label: "Install", value: "None" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-canvas px-3 py-2.5">
                    <dd className="font-mono text-[15px] font-medium tracking-[-0.02em] text-ink">
                      {stat.value}
                    </dd>
                    <dt className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mute">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>

            <div className="motion-safe:animate-[fade-up_0.5s_0.1s_ease-out_both]">
              <ConsolePreview />
            </div>
          </div>
        </section>

        {/* Channels: rows, not cards. Each says what it actually does. */}
        <section id="channels" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
              Channels
            </p>
            <h2 className="mt-2.5 text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[32px]">
              Connect the accounts you already run.
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-body">
              Each one lands in the same thread list with its own reply rules attached, so nothing
              about the policy of a channel is something you have to remember.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[10px] border border-hairline">
            <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)] gap-4 border-b border-hairline bg-canvas px-4 py-2.5 font-mono text-[9.5px] uppercase tracking-wider text-mute md:grid">
              <span>Channel</span>
              <span>What arrives</span>
              <span>Reply rule</span>
            </div>
            <ul className="divide-y divide-hairline">
              {CHANNELS.map((channel) => (
                <li
                  key={channel.name}
                  className="grid gap-1.5 px-4 py-3.5 transition-colors hover:bg-surface-well md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)] md:items-baseline md:gap-4"
                >
                  <div className="flex items-center gap-2.5">
                    {/* Real brand tile, same chrome as the inbox rail. */}
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] ${channelMeta(channel.channel).tile} text-white`}
                    >
                      <ChannelIcon channel={channel.channel} className="h-[15px] w-[15px]" />
                    </span>
                    <span className="text-[13.5px] font-medium text-ink">{channel.name}</span>
                    <span className="font-mono text-[10.5px] text-mute">{channel.account}</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-body md:text-[12.5px]">
                    {channel.arrives}
                  </p>
                  <p className="font-mono text-[11px] leading-relaxed text-mute">
                    {channel.rule}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Capabilities: each claims one thing, then shows it. */}
        <section className="border-t border-hairline">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
              In the inbox
            </p>
            <div className="mt-2.5 grid gap-px overflow-hidden rounded-[10px] border border-hairline bg-hairline md:grid-cols-3">
              {CAPABILITIES.map((capability) => (
                <article key={capability.title} className="flex flex-col bg-canvas p-5">
                  <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.02em] text-ink">
                    {capability.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-body">
                    {capability.body}
                  </p>
                  <div className="mt-4">{capability.render}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Setup: genuinely a sequence, so numbering carries information. */}
        <section id="setup" className="border-t border-hairline">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                  Setup
                </p>
                <h2 className="mt-2.5 text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[32px]">
                  Three steps, then it runs itself.
                </h2>
                <p className="mt-3 text-[14.5px] leading-relaxed text-body">
                  No webhook to paste into Meta, no token to copy. ConnectMe subscribes every page
                  you authorize.
                </p>
              </div>

              <ol className="space-y-px overflow-hidden rounded-[10px] border border-hairline bg-hairline">
                {SETUP.map((item) => (
                  <li key={item.step} className="flex gap-4 bg-canvas px-4 py-4">
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-mute">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="text-[14px] font-medium text-ink">{item.title}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-body">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="border-t border-hairline bg-canvas-elevated">
          <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-14 text-center md:py-18">
            <h2 className="text-balance text-[24px] font-semibold tracking-[-0.03em] text-ink sm:text-[30px]">
              Stop checking five apps for the same customer.
            </h2>
            <Link
              href={userId ? "/inbox" : "/sign-in"}
              className="mt-6 flex h-11 items-center justify-center rounded-full bg-primary px-7 text-[14px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90"
            >
              {userId ? "Open your inbox" : "Start with Google"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline px-4 py-7">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-[12px] text-mute">
            <span className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-hairline bg-primary text-on-primary">
              <Logo className="h-3 w-3" />
            </span>
            <span className="font-medium text-ink">ConnectMe</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-mute">
            {userId ? (
              <Link href="/inbox" className="transition-colors hover:text-ink">
                Inbox
              </Link>
            ) : (
              <Link href="/sign-in" className="transition-colors hover:text-ink">
                Sign in
              </Link>
            )}
            <Link href="/settings" className="transition-colors hover:text-ink">
              Settings
            </Link>
            <Link href="/about" className="transition-colors hover:text-ink">
              About
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
