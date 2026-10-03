"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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
