import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import GoogleSignInButton from "@/components/auth/google-sign-in-button";
import { ChannelIcon } from "@/components/inbox/channel-badge";
import SiteHeader from "@/components/site/site-header";
import type { Channel } from "@/lib/types";

export const metadata = {
  title: "Sign in · ConnectMe",
  description: "Sign in to ConnectMe to access your unified omnichannel customer inbox.",
};

const CHANNELS: {
  id: Channel;
  name: string;
  badge: string;
  textColor: string;
  borderColor: string;
}[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    textColor: "text-whatsapp",
    borderColor: "border-emerald-500/30",
  },
  {
    id: "messenger",
    name: "Messenger",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    textColor: "text-messenger",
    borderColor: "border-blue-500/30",
  },
  {
    id: "instagram",
    name: "Instagram",
    badge: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    textColor: "text-pink-500",
    borderColor: "border-pink-500/30",
  },
  {
    id: "telegram",
    name: "Telegram",
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    textColor: "text-sky-500",
    borderColor: "border-sky-500/30",
  },
  {
    id: "discord",
    name: "Discord",
    badge: "bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20",
    textColor: "text-[#5865F2]",
    borderColor: "border-[#5865F2]/30",
  },
];

const HIGHLIGHTS = [
  {
    title: "Real-time 24h Meta SLA countdown",
    desc: "Never miss the customer messaging window before paid templates lock you out.",
  },
  {
    title: "Multi-page token-aware routing",
    desc: "Seamlessly reply from the exact Facebook page or Instagram handle that received the message.",
  },
  {
    title: "Private in-thread agent notes",
    desc: "Collaborate directly on customer issues without ever leaking internal chat.",
  },
];

/**
 * Google is the primary strategy; Clerk creates the account on first successful OAuth handshake.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect_url?: string }>;
}) {
  const { error, redirect_url: requested } = await searchParams;

  // Same-origin paths only, so the query string can never bounce off-site.
  const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/inbox";

  const { userId } = await auth();
  if (userId) redirect(next);

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-canvas text-ink overflow-x-hidden selection:bg-neutral-900 selection:text-white dark:selection:bg-neutral-100 dark:selection:text-black">
      {/* Background ambient lighting */}
      <div className="mesh-gradient pointer-events-none absolute inset-0 opacity-60 dark:opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#0000000a_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* Top Header */}
      <SiteHeader variant="auth" />

      {/* Main Split Layout */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 lg:py-12">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
            
            {/* Left Column: Sign-in Card & Trust info (5 cols on lg) */}
            <div className="flex flex-col lg:col-span-5">
              <div className="w-full rounded-2xl border border-hairline bg-canvas-elevated/90 p-6 sm:p-8 backdrop-blur-xl shadow-[0px_4px_24px_rgba(0,0,0,0.06),0px_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0px_4px_32px_rgba(0,0,0,0.4)]">
                
                {/* Status indicator eyebrow */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      Omnichannel Hub
                    </span>
                  </div>
                  <span className="text-[12px] text-mute">Clerk SSO Ready</span>
                </div>

                <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">
                  Sign in to ConnectMe
                </h1>
                <p className="mt-2 text-[14px] leading-relaxed text-body">
                  One click connects your Google account directly to your unified workspace. No passwords, no credit card required.
                </p>

                {error && (
                  <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-[12px] text-error flex items-start gap-2.5">
                    <span className="font-bold">Error:</span>
                    <span>Sign-in failed ({error}). Please verify your Google account and try again.</span>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="mt-6">
                  <GoogleSignInButton redirectUrl={next} />
                </div>

                {/* Micro reassurance message */}
                <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-mute">
                  <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>New accounts are created automatically on first login.</span>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-hairline" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-canvas-elevated px-2 font-mono text-[11px] uppercase tracking-wider text-mute">
                      Unified Channels Included
                    </span>
                  </div>
                </div>

                {/* Supported Channels Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {CHANNELS.map((c) => (
                    <div
                      key={c.id}
                      className="group flex flex-1 min-w-[54px] flex-col items-center justify-center gap-1 rounded-lg border border-hairline bg-surface-well/50 py-2 px-1 transition-all duration-200 hover:border-hairline-strong hover:bg-surface-well"
                      title={c.name}
                    >
                      <ChannelIcon channel={c.id} className={`h-4 w-4 ${c.textColor}`} />
                      <span className="text-[10px] font-medium text-body tracking-tight">
                        {c.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Security and compliance badges */}
                <div className="mt-6 pt-5 border-t border-hairline/80 flex items-center justify-between text-[11px] text-mute">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-mute" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    256-bit TLS Encrypted
                  </span>
                  <span className="font-mono text-[11px] text-mute">Meta Verified</span>
                </div>
              </div>

              {/* Bottom links */}
              <div className="mt-4 flex items-center justify-between px-2 text-[12px] text-mute">
                <Link href="/" className="hover:text-ink transition-colors">
                  ← Back to Home
                </Link>
                <div className="flex items-center gap-3">
                  <Link href="/privacy" className="hover:text-ink transition-colors">
                    Privacy Policy
                  </Link>
                  <span>•</span>
                  <Link href="/terms" className="hover:text-ink transition-colors">
                    Terms
                  </Link>
                  <span>•</span>
                  <Link href="/about" className="hover:text-ink transition-colors">
                    About
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Live Product Preview & Social Proof (7 cols on lg) */}
            <div className="hidden lg:flex flex-col lg:col-span-7 pl-2">
              {/* Product Showcase Window Mockup */}
              <div className="relative rounded-2xl border border-hairline bg-canvas-elevated/70 p-5 backdrop-blur-xl shadow-[0px_20px_50px_rgba(0,0,0,0.09)] dark:shadow-[0px_20px_50px_rgba(0,0,0,0.5)]">
                
                {/* Mock Window Titlebar */}
                <div className="flex items-center justify-between pb-4 border-b border-hairline">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-400/80 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/80 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/80 inline-block" />
                    <span className="ml-2 font-mono text-[11px] text-mute">
                      connectme.app/inbox • Real-Time Stream
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface-well px-2.5 py-0.5 font-mono text-[11px] text-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>3 Unread Messages</span>
                  </div>
                </div>

                {/* Filter and Search Bar Mock */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md border border-hairline bg-primary px-2.5 py-1 text-[11px] font-medium text-on-primary">
                      All Channels (5)
                    </span>
                    <span className="rounded-md border border-hairline bg-surface-well px-2 py-1 text-[11px] text-body flex items-center gap-1">
                      <ChannelIcon channel="whatsapp" className="h-3 w-3 text-whatsapp" />
                      <span>WhatsApp</span>
                    </span>
                    <span className="rounded-md border border-hairline bg-surface-well px-2 py-1 text-[11px] text-body flex items-center gap-1">
                      <ChannelIcon channel="instagram" className="h-3 w-3 text-pink-500" />
                      <span>Instagram</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 rounded border border-hairline bg-surface-well/50 px-2 py-1 font-mono text-[10px] text-mute">
                    <span>⌘K Quick Switch</span>
                  </div>
                </div>

                {/* Mock Conversation Cards */}
                <div className="mt-4 space-y-2.5">
                  {/* Thread 1: WhatsApp with SLA Countdown */}
                  <div className="group rounded-xl border border-hairline bg-canvas p-3.5 transition-all duration-200 hover:border-hairline-strong shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 font-semibold text-white text-[12px] shadow-xs">
                            LW
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-canvas p-0.5">
                            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-whatsapp text-white">
                              <ChannelIcon channel="whatsapp" className="h-2.5 w-2.5" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-ink">Liam Walker</span>
                            <span className="text-[11px] text-mute font-mono">+1 415-555-0192</span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-body line-clamp-1">
                            &ldquo;Hey! We want to confirm our enterprise subscription for our 12-person support team.&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono text-mute">Just now</span>
                        <div className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            23h 58m left
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thread 2: Instagram Direct Message */}
                  <div className="rounded-xl border border-hairline bg-canvas p-3.5 transition-all duration-200 hover:border-hairline-strong shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 font-semibold text-white text-[12px] shadow-xs">
                            AS
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-canvas p-0.5">
                            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-pink-500 text-white">
                              <ChannelIcon channel="instagram" className="h-2.5 w-2.5" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-ink">@aurora.studios</span>
                            <span className="rounded bg-pink-500/10 px-1.5 py-0.2 font-mono text-[10px] text-pink-500">
                              Story reply
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-body line-clamp-1">
                            &ldquo;Loved your launch demo! Does ConnectMe support voice note playback and file attachments?&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono text-mute">4m ago</span>
                        <span className="rounded bg-surface-well px-1.5 py-0.5 font-mono text-[10px] text-mute">
                          Priority Lead
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thread 3: Messenger with Multi-Page Tag */}
                  <div className="rounded-xl border border-hairline bg-canvas p-3.5 transition-all duration-200 hover:border-hairline-strong shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-semibold text-white text-[12px] shadow-xs">
                            ER
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-canvas p-0.5">
                            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-messenger text-white">
                              <ChannelIcon channel="messenger" className="h-2.5 w-2.5" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-ink">Elena Rostova</span>
                            <span className="rounded bg-blue-500/10 px-1.5 py-0.2 font-mono text-[10px] text-messenger">
                              Northwind Global Page
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-body line-clamp-1">
                            &ldquo;Tracking says delivered today! Thanks for the lightning fast reply over the weekend.&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono text-mute">18m ago</span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                          ✓ Resolved
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Highlights Bar */}
                <div className="mt-4 pt-3 border-t border-hairline grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-surface-well/60 p-2">
                    <span className="block font-mono text-[14px] font-semibold text-ink">
                      &lt; 90s
                    </span>
                    <span className="text-[10px] text-mute uppercase tracking-wider">Avg First Reply</span>
                  </div>
                  <div className="rounded-lg bg-surface-well/60 p-2">
                    <span className="block font-mono text-[14px] font-semibold text-ink">
                      5 Platforms
                    </span>
                    <span className="text-[10px] text-mute uppercase tracking-wider">1 Clean Queue</span>
                  </div>
                  <div className="rounded-lg bg-surface-well/60 p-2">
                    <span className="block font-mono text-[14px] font-semibold text-ink">
                      100%
                    </span>
                    <span className="text-[10px] text-mute uppercase tracking-wider">SLA Compliance</span>
                  </div>
                </div>
              </div>

              {/* Social Proof / Testimonial Card */}
              <div className="mt-4 rounded-xl border border-hairline bg-canvas-elevated/50 p-4 backdrop-blur-md flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-well border border-hairline text-ink font-semibold text-[13px]">
                  AR
                </div>
                <div className="flex-1">
                  <p className="text-[12px] italic text-body leading-relaxed">
                    “ConnectMe replaced 4 open browser tabs with one instant keyboard-first inbox. It saves our support team 3 hours every day.”
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-ink">
                    Alex Rivera <span className="text-mute font-normal">· Head of Operations at Vesper Brands</span>
                  </p>
                </div>
              </div>

              {/* Feature Highlights Grid */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {HIGHLIGHTS.map((h, i) => (
                  <div key={i} className="rounded-xl border border-hairline/80 bg-canvas/40 p-3">
                    <p className="text-[11px] font-medium text-ink leading-snug">{h.title}</p>
                    <p className="mt-1 text-[10px] text-mute leading-relaxed">{h.desc}</p>
                  </div>
                ))}
              </div>

            </div>

          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="relative z-10 border-t border-hairline py-4 px-6 text-center text-[12px] text-mute">
        <p>© {new Date().getFullYear()} ConnectMe. All customer messages stay private, encrypted, and isolated to your workspace.</p>
      </footer>
    </div>
  );
}
