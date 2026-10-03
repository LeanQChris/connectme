// ConnectMe Service Worker (PWA & Web Push / Notifications)
const CACHE_NAME = "connectme-v2";
// Public, unauthenticated page used as the offline fallback. Authenticated
// shells (/, /inbox) must never be cached on a shared device.
const OFFLINE_URL = "/about";

// Static assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/favicon.svg",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/badge-72.png",
];

// 1. Install Event: Pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[SW] Pre-cache error:", err);
      })
  );
});

// 2. Activate Event: Clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Network-first for dynamic routes, cache-first for static icons/fonts
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API/websocket traffic
  if (request.method !== "GET" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/")) {
    return;
  }

  // Cache static assets (fonts, icons, public images)
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-first for navigation and pages
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (request.mode === "navigate") {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// 4. Push Notification Event (Web Push API)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "New Message", body: event.data ? event.data.text() : "You have a new message" };
  }

  const title = data.title || "ConnectMe — New Message";
  const options = {
    body: data.body || "New incoming customer message received.",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag || data.conversationId || "connectme-message",
    data: {
      url: data.url || (data.conversationId ? `/inbox?id=${data.conversationId}` : "/inbox"),
      conversationId: data.conversationId,
      timestamp: Date.now(),
    },
    vibrate: [100, 50, 100],
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: "open", title: "View Message" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/inbox";
  const conversationId = event.notification.data?.conversationId;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Look for an existing open ConnectMe tab
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            // Post message to client to switch thread without page reload
            if (conversationId) {
              client.postMessage({
                type: "NAVIGATE_CONVERSATION",
                conversationId,
                url: targetUrl,
              });
            }
            if ("focus" in client) {
              return client.focus();
            }
          }
        }
        // If no tab is currently open, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// 6. Message handler (communication between React components and Service Worker)
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      vibrate: [100, 50, 100],
      ...options,
    });
  }
});
