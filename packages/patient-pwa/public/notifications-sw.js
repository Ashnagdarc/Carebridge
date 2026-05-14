// CareBridge: CareBridge application source file.
/* global self */

function buildNotificationOptions(payload) {
  const data = payload && payload.data ? payload.data : {};
  const hospitalName = data.hospital && data.hospital.name ? data.hospital.name : "A hospital";
  const scopes = Array.isArray(data.scopes) ? data.scopes.filter(Boolean) : [];
  const scopeText = scopes.length ? `Scopes: ${scopes.slice(0, 4).join(", ")}` : "";
  const reason = data.clinicalReason ? `Reason: ${data.clinicalReason}` : "";

  return {
    body: [scopeText, reason].filter(Boolean).join("\n"),
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: {
      url: data.consentRequestId ? `/consents/approve/${data.consentRequestId}` : "/consents",
      hospitalName,
    },
  };
}

self.addEventListener("push", (event) => {
  let payload = null;
  try {
    payload = event.data ? event.data.json() : null;
  } catch (e) {
    payload = null;
  }

  if (!payload || payload.type !== "consent_request_created") return;

  const hospitalName =
    payload.data && payload.data.hospital && payload.data.hospital.name
      ? payload.data.hospital.name
      : "Hospital";

  const title = `New consent request from ${hospitalName}`;
  const options = buildNotificationOptions(payload);

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const url = event.notification && event.notification.data && event.notification.data.url;
  event.notification.close();

  if (!url) return;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});

