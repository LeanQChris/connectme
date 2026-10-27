import Link from "next/link";
import { PageFrame } from "@/components/layout/page-frame";
import { ChannelIcon } from "@/components/ui/channel-badge";
import type { Channel } from "@/core/types";

const CHANNELS: Channel[] = ["whatsapp", "messenger", "instagram", "telegram", "discord"];

export default function NotFound() {
  return (
    <PageFrame>
      <div className="relative overflow-hidden">
        <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-4xl flex-col items-center justify-center px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas-elevated px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-mute shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            404 &middot; Channel Not Found
          </div>

          <h1 className="mt-6 text-balance text-[36px] font-semibold leading-[1.06] tracking-[-0.04em] text-ink sm:text-[48px]">
            This thread or page could not be found.
          </h1>

          <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-body">
            The link you followed may have expired, been archived, or does not exist on this
            gateway.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="flex h-11 items-center justify-center rounded-full bg-primary px-7 text-[14px] font-medium text-on-primary transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Back to Homepage
            </Link>
            <Link
              href="/inbox"
              className="flex h-11 items-center justify-center rounded-full border border-hairline bg-canvas-elevated px-6 text-[14px] font-medium text-ink transition-colors hover:bg-surface-well"
            >
              Open Inbox
            </Link>
          </div>

          {/* Quick links grid */}
          <div className="mt-14 grid w-full max-w-lg gap-3 sm:grid-cols-2 text-left">
            <Link
              href="/about"
              className="rounded-[12px] border border-hairline bg-canvas-elevated p-4 shadow-2xs transition-colors hover:border-hairline-strong"
            >
              <h2 className="text-[13.5px] font-semibold text-ink">Architecture &amp; Mission</h2>
              <p className="mt-1 text-[12px] text-body">
                How ConnectMe normalizes multi-channel events.
              </p>
            </Link>

            <Link
              href="/privacy"
              className="rounded-[12px] border border-hairline bg-canvas-elevated p-4 shadow-2xs transition-colors hover:border-hairline-strong"
            >
              <h2 className="text-[13.5px] font-semibold text-ink">Privacy &amp; Security</h2>
              <p className="mt-1 text-[12px] text-body">
                Zero tracking, AES-256 encryption, and tenant isolation.
              </p>
            </Link>
          </div>

          {/* Channel Icons */}
          <div className="mt-12 flex items-center gap-2">
            <div className="flex items-center -space-x-1.5">
              {CHANNELS.map((ch) => (
                <span
                  key={ch}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white ring-2 ring-canvas shadow-2xs"
                  style={{ background: `var(--spectrum-${ch})` }}
                >
                  <ChannelIcon channel={ch} className="h-[10px] w-[10px]" />
                </span>
              ))}
            </div>
            <span className="font-mono text-[11px] text-mute">
              Omnichannel Team Inbox
            </span>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
