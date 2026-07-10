const CACHE_NAME = "xtreme-gym-pwa-v2";
const APP_SHELL = ["/", "/app", "/ingreso", "/xtreme/logo.jpg", "/pwa-icon-192.png", "/pwa-icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) || (await caches.match("/app")) || caches.match("/");
        }),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa-") || url.pathname.startsWith("/xtreme/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);

        return cached || network;
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "Xtreme Gym", {
      body: data.body || "Nuevo aviso de Xtreme Gym.",
      icon: data.icon || "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      data: {
        url: data.url || "/app",
        deliveryKey: data.deliveryKey || "",
        memberKey: data.memberKey || "",
        clickToken: data.clickToken || "",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  const data = event.notification.data || {};
  const tasks = [self.clients.openWindow(url)];
  if (data.deliveryKey && data.memberKey && data.clickToken) {
    tasks.push(
      fetch("/api/xtreme/events/notification-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryKey: data.deliveryKey,
          memberKey: data.memberKey,
          token: data.clickToken,
        }),
      }).catch(() => undefined),
    );
  }
  event.waitUntil(Promise.all(tasks));
});
