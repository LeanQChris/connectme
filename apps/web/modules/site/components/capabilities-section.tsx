"use client";

import { ChannelIcon } from "@/components/ui/channel-badge";
import type { Channel } from "@/core/types";

const SOURCES: { name: string; channel: Channel }[] = [
  { name: "Priya", channel: "whatsapp" },
  { name: "Priya", channel: "instagram" },
  { name: "Priya", channel: "messenger" },
  { name: "Priya", channel: "telegram" },
  { name: "Priya", channel: "discord" },
];

export function CapabilitiesSection() {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
        <div data-reveal className="max-w-2xl">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[38px]">
            The details that usually slip.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-body">
            Merged history, per-page routing and internal notes, handled in the
            inbox rather than in someone&apos;s memory.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-12">
          <article
            data-reveal
            className="flex flex-col rounded-xl border border-hairline bg-canvas-elevated p-6 md:col-span-7"
          >
            <h3 className="text-[19px] font-semibold leading-snug tracking-[-0.03em] text-ink">
              One customer, one thread.
            </h3>
            <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-body">
              Five inboxes become one history. Priya does not become five
              tickets because she wrote on five apps.
            </p>

            <div className="mt-6 rounded-[10px] border border-hairline bg-canvas p-4">
              <div className="flex items-center gap-1.5">
                {SOURCES.map((source) => (
                  <span
                    key={source.channel}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white ring-2 ring-canvas"
                    style={{ background: `var(--spectrum-${source.channel})` }}
                  >
                    <ChannelIcon channel={source.channel} className="h-[11px] w-[11px]" />
                  </span>
                ))}
                <span className="ml-2 font-mono text-[11px] text-mute">
                  merged into one thread
                </span>
              </div>

              <div className="mt-4 border-t border-hairline pt-3.5">
                <p className="text-[13px] font-medium text-ink">Priya Nadkarni</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-body">
                  Where is my order? Asked on WhatsApp, Instagram and Messenger
                  this morning.
                </p>
              </div>
            </div>
          </article>

          <div className="grid gap-4 md:col-span-5">
            <article
              data-reveal
              style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
              className="rounded-xl border border-hairline bg-canvas-elevated p-6"
            >
              <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.025em] text-ink">
                Replies leave on the right page.
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-body">
                Run several pages at once. Each thread carries its badge and
                goes back out on the token that owns it.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-surface-well px-2.5 py-1 font-mono text-[10.5px] text-body">
                  Northwind Store
                </span>
                <span className="rounded-full bg-surface-well px-2.5 py-1 font-mono text-[10.5px] text-body">
                  Northwind EU
                </span>
                <span className="rounded-full bg-surface-well px-2.5 py-1 font-mono text-[10.5px] text-body">
                  @northwind
                </span>
              </div>
            </article>

            <article
              data-reveal
              style={{ "--reveal-delay": "140ms" } as React.CSSProperties}
              className="rounded-xl border border-hairline bg-canvas-elevated p-6"
            >
              <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.025em] text-ink">
                Notes stay internal.
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-body">
                Internal notes sit beside the conversation, never in the reply
                box.
              </p>

              <div className="mt-4 rounded-[10px] border border-hairline bg-canvas p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                  Internal note
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-body">
                  She asked twice about delivery. The parcel is out today.
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
