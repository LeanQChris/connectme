import { playNotificationSound } from "./notification-sound";

export interface SendNotificationOptions {
  title: string;
  body: string;
  conversationId?: string;
  channel?: string;
  icon?: string;
  tag?: string;
  playSound?: boolean;
}

export const NotificationService = {
  isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  },

  getPermission(): NotificationPermission {
    if (!this.isSupported()) return "denied";
    return Notification.permission;
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return "denied";
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return Notification.permission;
    }
  },

  async showNotification(options: SendNotificationOptions) {
    if (!this.isSupported()) return;

    if (options.playSound !== false) {
      playNotificationSound();
    }

    if (Notification.permission !== "granted") {
      return;
    }

    const title = options.title;
    const notificationPayload: NotificationOptions & Record<string, unknown> = {
      body: options.body,
      icon: options.icon || "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: options.tag || options.conversationId || "connectme-message",
      data: {
        conversationId: options.conversationId,
        url: options.conversationId ? `/inbox?id=${options.conversationId}` : "/inbox",
        timestamp: Date.now(),
      },
      vibrate: [100, 50, 100],
      renotify: true,
      requireInteraction: false,
    };

    // 1. Try Service Worker showNotification first (robust for background and click handling)
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && "showNotification" in registration) {
          await registration.showNotification(title, notificationPayload);
          return;
        }
      } catch (err) {
        console.debug("[NotificationService] SW notification fallback:", err);
      }
    }

    // 2. Fallback to standard Window Notification
    try {
      const notif = new Notification(title, notificationPayload);
      notif.onclick = () => {
        window.focus();
        if (options.conversationId) {
          // The click fires outside React's render tree, so next/navigation's
          // router is unavailable; a document-level navigation is the only option.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign(`/inbox?id=${options.conversationId}`);
        }
        notif.close();
      };
    } catch (err) {
      console.warn("[NotificationService] Direct notification failed:", err);
    }
  },

  async sendTestNotification() {
    const permission = await this.requestPermission();
    if (permission === "granted") {
      await this.showNotification({
        title: "ConnectMe — Test Notification",
        body: "Web notifications are working! You'll be alerted when new customer messages arrive.",
        playSound: true,
      });
    }
    return permission;
  },
};
