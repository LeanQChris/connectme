"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { reconcileBackgroundPush } from "@/core/notifications/browser-push";
import { useRouter } from "next/navigation";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  useEffect(() => {
    if (!isLoaded) return;
    const reconcile = () => { void reconcileBackgroundPush(user?.id ?? null).catch(() => {
      // Keep the device preference on a transient API outage; retry on focus/online.
    }); };
    reconcile();
    window.addEventListener("focus", reconcile);
    window.addEventListener("online", reconcile);
    return () => { window.removeEventListener("focus", reconcile); window.removeEventListener("online", reconcile); };
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Register Service Worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates periodically
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                installingWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn("[PWA] Service Worker registration failed:", error);
      });

    // Listen for messages from Service Worker (e.g. notification click navigation)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === "NAVIGATE_CONVERSATION" && event.data.conversationId) {
        router.push(`/inbox?id=${event.data.conversationId}`);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [router]);

  return <>{children}</>;
}
