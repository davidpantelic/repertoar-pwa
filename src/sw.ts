/// <reference lib="webworker" />

import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string;
    revision: string | null;
  }>;
};

const BADGE_DB = "webdak-pwa-badge";
const BADGE_STORE = "meta";
const BADGE_KEY = "count";

let badgeDbPromise: Promise<IDBDatabase> | null = null;

const openBadgeDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(BADGE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BADGE_STORE)) {
        db.createObjectStore(BADGE_STORE);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        badgeDbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });

const getBadgeDb = () => {
  if (!badgeDbPromise) {
    badgeDbPromise = openBadgeDb();
  }
  return badgeDbPromise;
};

const getBadgeCount = async () => {
  const db = await getBadgeDb();
  return new Promise<number>((resolve) => {
    const tx = db.transaction(BADGE_STORE, "readonly");
    const store = tx.objectStore(BADGE_STORE);
    const req = store.get(BADGE_KEY);
    req.onsuccess = () => resolve(Number(req.result ?? 0));
    req.onerror = () => resolve(0);
  });
};

const setBadgeCount = async (count: number) => {
  const db = await getBadgeDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(BADGE_STORE, "readwrite");
    const store = tx.objectStore(BADGE_STORE);
    store.put(count, BADGE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  const reg = self.registration as ServiceWorkerRegistration & {
    setAppBadge?: (count: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  if (reg.setAppBadge) {
    try {
      await reg.setAppBadge(count);
    } catch (err) {
      console.warn("Failed to set app badge", err);
    }
  }
};

const clearBadge = async () => {
  await setBadgeCount(0);
  const reg = self.registration as ServiceWorkerRegistration & {
    clearAppBadge?: () => Promise<void>;
  };
  if (reg.clearAppBadge) {
    try {
      await reg.clearAppBadge();
    } catch (err) {
      console.warn("Failed to clear app badge", err);
    }
  }
};

const supabaseOrigin = import.meta.env.VITE_SUPABASE_URL
  ? new URL(import.meta.env.VITE_SUPABASE_URL).origin
  : null;

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CLEAR_BADGE") {
    event.waitUntil(clearBadge());
  }
});

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

if (supabaseOrigin) {
  registerRoute(
    ({ request, url }) =>
      request.method === "GET" &&
      url.origin === supabaseOrigin &&
      // Cache only publicly cache-safe Supabase storage objects.
      // url.pathname.startsWith("/storage/v1/object/public/"),
      url.pathname.startsWith("/rest/v1/"),
    new NetworkFirst({
      cacheName: "supabase",
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24,
        }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    }),
  );
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data: Record<string, any> = {};
      if (event.data) {
        try {
          data = event.data.json() as Record<string, any>;
        } catch {
          // Some push payloads are plain text; keep notification flow alive.
          const text = event.data.text?.() ?? "";
          data = text ? { body: text } : {};
        }
      }
      const title = data.title ?? "Notification";
      const options: NotificationOptions = {
        body: data.body ?? "",
        icon: data.icon ?? "/webdak_transparent_192.png",
        badge: data.badge ?? "/webdak_badge.png",
        data: {
          url: data.url ?? "/",
        },
      };

      try {
        const nextCount = (await getBadgeCount()) + 1;
        await setBadgeCount(nextCount);
      } catch (err) {
        // Badge errors should never block notification delivery.
        console.warn("Badge update failed", err);
      }
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  const targetUrl = new URL(url, self.location.origin).href;
  const targetRouteKey = (() => {
    const parsed = new URL(targetUrl);
    return `${parsed.origin}${parsed.pathname}`;
  })();

  event.waitUntil(
    (async () => {
      await clearBadge();
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsArr) {
        const clientRouteKey = (() => {
          try {
            const parsed = new URL(client.url);
            return `${parsed.origin}${parsed.pathname}`;
          } catch {
            return client.url;
          }
        })();

        if ("focus" in client && clientRouteKey === targetRouteKey) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })(),
  );
});
