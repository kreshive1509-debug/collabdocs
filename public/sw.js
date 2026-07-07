const CACHE_NAME = "collabdocs-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/frontend/src/main.tsx",
  "/frontend/src/index.css"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell and critical assets");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing stale cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First with Cache Fallback for dynamic app assets
self.addEventListener("fetch", (event) => {
  // Only intercept HTTP/HTTPS requests
  if (!event.request.url.startsWith("http")) return;

  // Skip API requests and WebSockets to avoid interfering with backend logic
  if (event.request.url.includes("/api/") || event.request.url.includes("/socket.io/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful GET requests
        if (event.request.method === "GET" && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network fails
        console.log("[Service Worker] Network failed, serving from cache:", event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a page/document request failed and is not cached, return index.html for SPA route fallback
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/index.html");
          }
        });
      })
  );
});

// Push notification listener hook
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "CollabDocs Notification", body: "New activity in your shared workspace." };
  const options = {
    body: data.body,
    icon: "https://api.dicebear.com/7.x/initials/svg?seed=CD&backgroundColor=6366f1",
    badge: "https://api.dicebear.com/7.x/initials/svg?seed=CD&backgroundColor=6366f1",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      const urlToOpen = event.notification.data.url || "/dashboard";
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
