"use client";

import { ChannelIcon } from "@/components/ui/channel-badge";

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

export function SignInPreview() {
  return (
    <div className="hidden lg:flex flex-col lg:col-span-7 pl-2">
      <div className="relative rounded-2xl border border-hairline bg-canvas-elevated/70 p-5 backdrop-blur-xl shadow-[0px_20px_50px_rgba(0,0,0,0.09)] dark:shadow-[0px_20px_50px_rgba(0,0,0,0.5)]">
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

        <div className="mt-4 space-y-2.5">
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

        <div className="mt-4 pt-3 border-t border-hairline grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-surface-well/60 p-2">
            <span className="block font-mono text-[14px] font-semibold text-ink">&lt; 90s</span>
            <span className="text-[10px] text-mute uppercase tracking-wider">Avg First Reply</span>
          </div>
          <div className="rounded-lg bg-surface-well/60 p-2">
            <span className="block font-mono text-[14px] font-semibold text-ink">5 Platforms</span>
            <span className="text-[10px] text-mute uppercase tracking-wider">1 Clean Queue</span>
          </div>
          <div className="rounded-lg bg-surface-well/60 p-2">
            <span className="block font-mono text-[14px] font-semibold text-ink">100%</span>
            <span className="text-[10px] text-mute uppercase tracking-wider">SLA Compliance</span>
          </div>
        </div>
      </div>

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

      <div className="mt-4 grid grid-cols-3 gap-3">
        {HIGHLIGHTS.map((h, i) => (
          <div key={i} className="rounded-xl border border-hairline/80 bg-canvas/40 p-3">
            <p className="text-[11px] font-medium text-ink leading-snug">{h.title}</p>
            <p className="mt-1 text-[10px] text-mute leading-relaxed">{h.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
