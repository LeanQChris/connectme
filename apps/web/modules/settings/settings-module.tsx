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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <Suspense
          fallback={
            <div className="py-12 text-center text-[12.5px] text-mute">
              Loading settings…
            </div>
          }
        >
          <SettingsForm initial={initial} />
        </Suspense>
      </main>
    </div>
  );
}
