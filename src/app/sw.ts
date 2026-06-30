/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Listen for push notifications from FCM
self.addEventListener("push", (event) => {
  if (event.data) {
    try {
      // The FCM payload structure for webpush is typically wrapped in a standard JSON
      // If sent from Firebase Admin SDK with `webpush.notification`, FCM automatically 
      // shows it if we let it, but catching it manually gives us more control.
      // Firebase actually sends a specific format. Let's parse it safely.
      const payload = event.data.json();
      
      const title = payload.notification?.title || "Nueva Notificación";
      const options = {
        body: payload.notification?.body || "",
        icon: payload.notification?.icon || "/icon-192.png",
        data: {
          url: payload.data?.url || payload.fcm_options?.link || "/",
        },
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      console.error("Error parsing push event data:", err);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window tab is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
