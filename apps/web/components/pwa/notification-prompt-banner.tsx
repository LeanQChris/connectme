"use client";

import { useState } from "react";
import { useNotifications } from "@/core/notifications/use-notifications";

export function NotificationPromptBanner() {
  const { isSupported, isPromptable, isGranted, requestPermission } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (!isSupported || !isPromptable || isGranted || dismissed) {
    return null;
  }

  return (
    <div className="bg-emerald-950/40 border-b border-emerald-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-200">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>
          <strong>Enable Web Notifications:</strong> Get real-time alerts when customers message you even if the tab is backgrounded.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={requestPermission}
          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded text-xs transition-colors"
        >
          Enable Alerts
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-emerald-400/60 hover:text-emerald-300 p-1"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
