"use client";

import { useNotifications } from "@/core/notifications/use-notifications";
import { usePwa } from "@/core/pwa/use-pwa";
import { Button } from "@/components/ui/button";

export function NotificationsSettings() {
  const {
    isSupported,
    isGranted,
    isDenied,
    soundEnabled,
    requestPermission,
    toggleSound,
    triggerTestNotification,
  } = useNotifications();

  const { isInstallable, isStandalone, isOnline, promptInstall } = usePwa();

  return (
    <div className="space-y-6">
      {/* 1. Web Push & Notifications Card */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Desktop Push Notifications</h2>
              <p className="text-[12.5px] text-mute mt-0.5">
                Receive notifications when new customer messages arrive.
              </p>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isGranted
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : isDenied
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                    : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isGranted ? "bg-emerald-500" : isDenied ? "bg-red-500" : "bg-neutral-400"}`} />
              {isGranted ? "Enabled" : isDenied ? "Blocked" : "Disabled"}
            </span>
          </div>
        </div>

        <div className="p-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[12.5px] text-mute max-w-lg">
            {isGranted
              ? "Browser push notifications are active for this device."
              : isDenied
                ? "Notifications are blocked by your browser permissions. Enable them in your address bar."
                : "Grant browser permission to receive alerts when incoming customer messages arrive."}
          </p>

          <div className="flex items-center gap-2">
            {!isGranted && !isDenied && isSupported && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={requestPermission}
                className="h-8 px-3.5 text-[12.5px] font-medium"
              >
                Enable Notifications
              </Button>
            )}

            {isGranted && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={triggerTestNotification}
                className="h-8 px-3 text-[12px]"
              >
                Send Test Notification
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Audio Chime Alert Card */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated p-6 shadow-xs flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Inbound Message Audio Chime</h3>
          <p className="text-[12.5px] text-mute mt-0.5">
            Play a subtle sound when a customer message is received.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleSound}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
            soundEnabled ? "bg-emerald-500" : "bg-surface-well border border-hairline"
          }`}
          role="switch"
          aria-checked={soundEnabled}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              soundEnabled ? "translate-x-4" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* 3. Progressive Web App (PWA) Installation Card */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-ink">Progressive Web App (PWA)</h3>
            <span className="rounded bg-surface-well px-1.5 py-0.2 font-mono text-[9.5px] text-mute border border-hairline">
              {isStandalone ? "Installed" : isOnline ? "Available" : "Offline"}
            </span>
          </div>
          <p className="text-[12.5px] text-mute mt-0.5">
            Install ConnectMe on your device dock or taskbar for standalone window access.
          </p>
        </div>

        {!isStandalone && isInstallable && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={promptInstall}
            className="h-8 px-3 text-[12.5px] shrink-0"
          >
            Install App
          </Button>
        )}
      </div>
    </div>
  );
}
