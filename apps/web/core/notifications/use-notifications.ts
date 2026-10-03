"use client";

import { useState, useEffect, useCallback } from "react";
import { NotificationService } from "./notification-service";
import { playNotificationSound } from "./notification-sound";

const SOUND_STORAGE_KEY = "connectme_sound_enabled";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reading browser-only APIs on mount is intentional; the lint rule targets
    // render-cascades, which do not apply to this one-time hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    const supported = NotificationService.isSupported();
    setIsSupported(supported);
    setPermission(supported ? NotificationService.getPermission() : "unsupported");

    const savedSound = localStorage.getItem(SOUND_STORAGE_KEY);
    if (savedSound !== null) {
      setSoundEnabled(savedSound === "true");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return "unsupported";
    const result = await NotificationService.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      if (next) playNotificationSound();
      return next;
    });
  }, []);

  const triggerTestNotification = useCallback(async () => {
    const perm = await NotificationService.sendTestNotification();
    setPermission(perm);
  }, []);

  return {
    isSupported,
    permission,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
    isPromptable: permission === "default",
    soundEnabled,
    requestPermission,
    toggleSound,
    triggerTestNotification,
  };
}
