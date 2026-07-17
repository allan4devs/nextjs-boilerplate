const CACHE_NAME = "xtreme-gym-pwa-v6";
const OFFLINE_PAGE = "/offline.html";
const APP_SHELL = ["/", "/app", "/recepcion", OFFLINE_PAGE, "/xtreme/logo.webp", "/pwa-icon-192.png", "/pwa-icon-512.png"];

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
          return (await caches.match(OFFLINE_PAGE)) || (await caches.match(request)) || caches.match("/");
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

function parsePushData(event) {
  if (!event.data) {
    return {
      title: "Xtreme Gym",
      body: "Nuevo aviso de Xtreme Gym.",
      icon: "/pwa-icon-192.png",
      url: "/app",
    };
  }
  try {
    return event.data.json();
  } catch {
    const text = event.data.text();
    return {
      title: "Xtreme Gym",
      body: text || "Nuevo aviso de Xtreme Gym.",
      icon: "/pwa-icon-192.png",
      url: "/app",
    };
  }
}

self.addEventListener("push", (event) => {
  const data = parsePushData(event);
  const title = data.title || "Xtreme Gym";
  const options = {
    body: data.body || "Nuevo aviso de Xtreme Gym.",
    icon: data.icon || "/pwa-icon-192.png",
    badge: data.badge || "/pwa-icon-192.png",
    tag: data.tag || data.deliveryKey || "xtreme-push",
    renotify: Boolean(data.renotify),
    vibrate: data.vibrate || [120, 60, 120],
    requireInteraction: Boolean(data.requireInteraction),
    data: {
      url: data.url || "/app",
      deliveryKey: data.deliveryKey || "",
      memberKey: data.memberKey || "",
      clickToken: data.clickToken || "",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "/app";
  const targetUrl = new URL(rawUrl, self.location.origin).href;
  const data = event.notification.data || {};

  const openOrFocus = async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      try {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client && typeof client.navigate === "function") {
            try {
              await client.navigate(targetUrl);
            } catch {
              // Algunos browsers no permiten navigate; el focus basta.
            }
          }
          return;
        }
      } catch {
        // client.url inválido — seguir con el siguiente.
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  };

  const tasks = [openOrFocus()];
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

// Permite al cliente pedir una notificación local (mensaje al SW).
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data?.type === "SHOW_LOCAL_NOTIFICATION") {
    event.waitUntil(
      self.registration.showNotification(data.title || "Xtreme Gym", {
        body: data.body || "Aviso de Xtreme Gym.",
        icon: data.icon || "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
        tag: data.tag || "xtreme-local",
        data: { url: data.url || "/app" },
      }),
    );
  }
});
