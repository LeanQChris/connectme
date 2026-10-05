"use client";

import { useState } from "react";
import { isNotificationSoundEnabled, setNotificationSoundEnabled, playNotificationSound } from "@/core/notifications/notification-sound";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(() => isNotificationSoundEnabled());

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setNotificationSoundEnabled(next);
    if (next) {
      playNotificationSound();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? "Notification sound enabled (click to mute)" : "Notification sound muted (click to unmute)"}
      className="flex h-8 w-8 items-center justify-center rounded-[6px] text-body transition-colors hover:bg-surface-well hover:text-ink cursor-pointer"
    >
      {enabled ? (
        <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"
          />
        </svg>
      ) : (
        <svg className="h-4 w-4 stroke-current text-mute opacity-60" fill="none" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      )}
    </button>
  );
}
