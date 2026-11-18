// Shows the panel's push notifications (sent by server/utils/push.ts as { title, body, url })
// and opens the panel page they point to when tapped.
self.addEventListener("push", (event) => {
  const { title, body, url } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, { body, icon: "/icon/192.png", data: { url } }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
