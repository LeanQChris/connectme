"use client";

import Link from "next/link";

import SiteHeader from "@/components/layout/site-header";
import { CapabilitiesSection } from "./components/capabilities-section";
import { ChannelsRail } from "./components/channels-rail";
import { CtaBand } from "./components/cta-band";
import { InboxPreview } from "./components/inbox-preview";
import { LogoStrip } from "./components/logo-strip";
import { PricingSection } from "./components/pricing-section";
import { ReplyWindow } from "./components/reply-window";
import { RevealObserver } from "./components/reveal-observer";
import { SetupSteps } from "./components/setup-steps";
import { SiteFooter } from "./components/site-footer";

export interface LandingModuleProps {
  userId?: string | null;
}

export default function LandingModule({ userId }: LandingModuleProps) {
  const primaryLabel = userId ? "Open your inbox" : "Sign in with Google";
  const primaryHref = userId ? "/inbox" : "/sign-in";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <RevealObserver />
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-hairline">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-12 md:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] md:gap-16 md:pt-20 md:pb-20">
            <div className="motion-safe:animate-[fade-up_0.5s_ease-out_both]">
              <h1 className="text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.045em] text-ink sm:text-[42px] md:text-[50px]">
                Every customer message, in one queue.
              </h1>

              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-body sm:text-[15px]">
                WhatsApp, Messenger, Instagram, Telegram and Discord in one
                inbox. Each thread carries its own channel and reply window.
              </p>

              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                <Link
                  href={primaryHref}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-primary px-7 sm:w-auto text-[14px] font-medium text-on-primary transition-opacity duration-150 hover:opacity-90 active:scale-[0.98]"
                >
                  {primaryLabel}
                </Link>

                <Link
                  href="#channels"
                  className="flex h-11 w-full items-center justify-center rounded-full border border-hairline bg-canvas-elevated px-5 sm:w-auto text-[14px] font-medium text-ink transition-colors hover:bg-surface-well active:scale-[0.98]"
                >
                  See supported channels
                </Link>
              </div>
            </div>

            <div className="motion-safe:animate-[fade-up_0.5s_0.08s_ease-out_both]">
              <div className="space-y-3">
                <InboxPreview />
                <div className="hidden lg:block">
                  <ReplyWindow />
                </div>
              </div>
            </div>
          </div>

        </section>

        <LogoStrip />
        <ChannelsRail />
        <CapabilitiesSection />
        <SetupSteps />
        <PricingSection />
        <CtaBand userId={userId} />
      </main>

      <SiteFooter userId={userId} />
    </div>
  );
}
