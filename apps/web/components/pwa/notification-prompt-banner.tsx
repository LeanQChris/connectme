"use client";

import { useState } from "react";
import { useNotifications } from "@/core/notifications/use-notifications";

export function NotificationPromptBanner() {
  const { isSupported, isPromptable, isGranted, requestPermission, pushError, pushBusy } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (!isSupported || !isPromptable || isGranted || dismissed) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-y border-hairline border-l-4 border-l-emerald-500 bg-white px-4 py-3 text-sm text-black sm:flex-row sm:items-center sm:justify-between dark:border-hairline dark:border-l-emerald-500 dark:bg-neutral-950/90 dark:text-white">
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0 sm:mt-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-40"></span>
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
        </span>
        <span className="min-w-0 leading-5">
          <strong className="font-semibold">Enable web notifications</strong>
          <span className="text-neutral-700 dark:text-neutral-300"> — Get real-time alerts when customers message you, even when this tab is in the background.</span>
        </span>
      </div>
      {pushError && <p role="alert" className="text-xs">{pushError}</p>}
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          disabled={pushBusy}
          onClick={requestPermission}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
        >
          Enable Alerts
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-black dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
