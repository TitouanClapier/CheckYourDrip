/* Service Worker — CheckYourDrip Push Notifications */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json();

  event.waitUntil(
    self.registration.showNotification(payload.title || "CheckYourDrip", {
      body: payload.body || "Infraction vestimentaire détectée",
      icon: payload.icon || "/icon-192.png",
      badge: "/badge-72.png",
      image: payload.image || undefined,
      tag: "drip-alert",
      renotify: true,
      requireInteraction: true,
      data: {
        url: payload.url || "/",
        detectionId: payload.detectionId,
      },
      actions: [
        { action: "view", title: "Voir le dashboard" },
        { action: "dismiss", title: "Ignorer" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
