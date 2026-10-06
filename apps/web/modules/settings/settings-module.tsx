"use client";

import { Suspense } from "react";

import SiteHeader from "@/components/layout/site-header";
import SettingsForm from "./components/settings-form";
import type { SettingsPayload } from "@/core/types";

export interface SettingsModuleProps {
  initial: SettingsPayload;
}

export default function SettingsModule({ initial }: SettingsModuleProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <SiteHeader variant="app" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center text-center text-[13px] text-mute font-mono">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent mr-2" />
              Loading workspace settings…
            </div>
          }
        >
          <SettingsForm initial={initial} />
        </Suspense>
      </main>
    </div>
  );
}
