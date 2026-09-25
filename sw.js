/* ВЕРТИКАЛЬ — service worker.
   Тримає копію гри на телефоні, щоб вона відкривалась без інтернету.
   Свої файли: спершу мережа (нова версія приїжджає одразу), кеш — якщо мережі немає.
   Чужі файли (шрифти Google): спершу кеш, бо вони не змінюються. */

const CACHE = "vertikal-v17";
const CORE = ["./", "index.html", "engine.js", "app.js", "manifest.json",
              "img/home.jpg", "img/faces/f01.jpg", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      /* cache.addAll() довіряє звичайному fetch(), а той може віддати файл
         зі старого HTTP-кешу браузера навіть при встановленні нової версії
         воркера — саме так у прод-теку одного разу приїхав застарілий
         index.html. {cache:"reload"} примусово йде в мережу, обходячи HTTP-кеш. */
      .then(c => Promise.all(CORE.map(u => fetch(u, { cache: "reload" }).then(r => c.put(u, r)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin === location.origin) e.respondWith(networkFirst(req));
  else e.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    if (req.mode === "navigate") {
      const idx = await caches.match("index.html");
      if (idx) return idx;
    }
    throw err;
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}
