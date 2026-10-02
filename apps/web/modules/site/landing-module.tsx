"use client";

import Link from "next/link";
import SiteHeader from "@/components/layout/site-header";
import { ConsolePreview } from "./components/console-preview";
import { ChannelsGrid } from "./components/channels-grid";
import { CapabilitiesSection } from "./components/capabilities-section";
import { SetupSteps } from "./components/setup-steps";
import { SiteFooter } from "./components/site-footer";

export interface LandingModuleProps {
  userId?: string | null;
}

export default function LandingModule({ userId }: LandingModuleProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-hairline">
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
                ConnectMe pulls messages from every channel you already use into a single agent inbox. One thread
                per customer, automatic page matching, and a live reply-window clock so you never drop an SLA.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={userId ? "/inbox" : "/sign-in"}
                  className="flex h-10 items-center justify-center rounded-full bg-primary px-5 text-[13px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90"
                >
                  {userId ? "Go to your inbox" : "Sign in with Google"}
                </Link>

                <a
                  href="#channels"
                  className="flex h-10 items-center justify-center rounded-full border border-hairline bg-canvas-elevated px-4 text-[13px] font-medium text-ink transition-colors hover:bg-surface-well"
                >
                  See supported channels
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

        {/* Supported Channels Section */}
        <ChannelsGrid />

        {/* Capabilities Section */}
        <CapabilitiesSection />

        {/* 3-Step Setup Section */}
        <SetupSteps />

        {/* Call to Action Banner */}
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

      <SiteFooter userId={userId} />
    </div>
  );
}
