"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { hasBackgroundPush, PUSH_CHANGED, enableBackgroundPush, disableBackgroundPush, testBackgroundPush } from "./browser-push";
import { NotificationService } from "./notification-service";
import { playNotificationSound } from "./notification-sound";

const SOUND_STORAGE_KEY = "connectme_sound_enabled";

export function useNotifications() {
  const { user } = useUser();
  const userId = user?.id;
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
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

  useEffect(() => {
    const refresh = () => setBackgroundEnabled(hasBackgroundPush());
    queueMicrotask(refresh);
    window.addEventListener(PUSH_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(PUSH_CHANGED, refresh); window.removeEventListener("storage", refresh); };
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return "unsupported";
    const result = await NotificationService.requestPermission();
    setPermission(result);
    if (result === "granted" && userId) {
      setPushBusy(true); setPushError(null);
      try { await enableBackgroundPush(userId); }
      catch (err) { setPushError(err instanceof Error ? err.message : "Could not enable background alerts"); }
      finally { setPushBusy(false); }
    }
    return result;
  }, [isSupported, userId]);

  const disablePush = useCallback(async () => {
    setPushBusy(true); setPushError(null);
    try { await disableBackgroundPush(); }
    catch { setPushError("This browser unsubscribed. Server cleanup will finish when the expired endpoint is detected."); }
    finally { setPushBusy(false); }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      if (next) playNotificationSound();
      return next;
    });
  }, []);

  const triggerTestNotification = useCallback(async () => {
    if (hasBackgroundPush()) {
      setPushBusy(true); setPushError(null);
      try { await testBackgroundPush(); }
      catch (err) { setPushError(err instanceof Error ? err.message : "Could not queue test alert"); }
      finally { setPushBusy(false); }
      return;
    }
    const perm = await NotificationService.sendTestNotification();
    setPermission(perm);
  }, []);

  return {
    backgroundEnabled,
    pushError,
    pushBusy,
    disablePush,
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
