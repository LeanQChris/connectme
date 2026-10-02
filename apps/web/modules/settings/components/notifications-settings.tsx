"use client";

import { useNotifications } from "@/core/notifications/use-notifications";
import { usePwa } from "@/core/pwa/use-pwa";

export function NotificationsSettings() {
  const {
    isSupported,
    permission,
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
      <div className="rounded-xl border border-hairline bg-surface p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Browser & Background Notifications</span>
            </h3>
            <p className="text-xs text-mute">
              Receive desktop and mobile notifications when new customer messages arrive, even if the ConnectMe tab is backgrounded.
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isGranted
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isDenied
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}
          >
            {isGranted ? "Enabled" : isDenied ? "Blocked by Browser" : "Not Configured"}
          </span>
        </div>

        <div className="pt-2 border-t border-hairline flex flex-wrap gap-3 items-center justify-between">
          <div className="text-xs text-mute">
            {isGranted ? (
              <span>Notifications are active and configured for this device.</span>
            ) : isDenied ? (
              <span>Notifications are blocked in your browser settings. Please allow notifications in site permissions.</span>
            ) : (
              <span>Click enable to grant browser notification permission.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isGranted && !isDenied && isSupported && (
              <button
                type="button"
                onClick={requestPermission}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
              >
                Enable Notifications
              </button>
            )}

            {isGranted && (
              <button
                type="button"
                onClick={triggerTestNotification}
                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                Send Test Notification
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Audio Chime Alert */}
      <div className="rounded-xl border border-hairline bg-surface p-5 sm:p-6 flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
            <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span>Message Audio Chime</span>
          </h4>
          <p className="text-xs text-mute">
            Play a subtle audio alert when an inbound customer message arrives.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleSound}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
            soundEnabled ? "bg-emerald-500" : "bg-neutral-700"
          }`}
          role="switch"
          aria-checked={soundEnabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              soundEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* 3. Progressive Web App (PWA) Installation */}
      <div className="rounded-xl border border-hairline bg-surface p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Progressive Web App (PWA)</span>
            </h3>
            <p className="text-xs text-mute">
              Install ConnectMe directly on your macOS, Windows, iOS, or Android device as a standalone application.
            </p>
          </div>

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isStandalone
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : "bg-neutral-800 text-neutral-400 border border-neutral-700"
            }`}
          >
            {isStandalone ? "Installed (Standalone App)" : isOnline ? "Ready to Install" : "Offline"}
          </span>
        </div>

        <div className="pt-2 border-t border-hairline flex flex-wrap gap-3 items-center justify-between">
          <div className="text-xs text-mute">
            {isStandalone ? (
              <span>You are currently using ConnectMe in standalone app mode.</span>
            ) : (
              <span>Install to launch ConnectMe from your Dock / Taskbar with offline caching and native window frames.</span>
            )}
          </div>

          {!isStandalone && isInstallable && (
            <button
              type="button"
              onClick={promptInstall}
              className="px-3.5 py-1.5 bg-accent text-accent-ink font-semibold rounded-lg text-xs transition-opacity hover:opacity-90 shadow-sm cursor-pointer"
            >
              Install ConnectMe
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
