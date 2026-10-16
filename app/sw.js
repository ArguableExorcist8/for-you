// For Us service worker — offline app shell + photo cache + push notifications
const VERSION = 'v32';
const SHELL = 'forus-shell-' + VERSION, RUNTIME = 'forus-runtime-' + VERSION, MEDIA = 'forus-media-v1';
const V = '?v=32';
const PRECACHE = ['./', 'index.html', 'style.css' + V, 'ui.css' + V, 'config.js' + V, 'data.js' + V, 'trivia.js' + V, 'anim.js' + V, 'app.js' + V, 'cute.js' + V, 'themes.js' + V, 'skins.css' + V, 'chat.css' + V, 'traits.css' + V, 'couple.css' + V, 'couple.js' + V, 'polish.css' + V, 'polish.js' + V, 'persona.css' + V, 'persona-data.js' + V, 'persona.js' + V, 'alive.css' + V, 'alive.js' + V, 'feel.css' + V, 'moments.js' + V, 'feel.js' + V, 'sig.css' + V, 'themes/sig/castle.svg', 'themes/sig/filigree.svg', 'themes/sig/frost.svg', 'themes/sig/opsea.svg', 'themes/sig/pines.svg', 'themes/sig/rail.svg', 'themes/sig/seaweed.svg', 'themes/sig/skyline.svg', 'themes/sig/swag.svg', 'themes/sig/vines.svg', 'themes/sig/wall.svg',
  'themes/attack-on-titan.png', 'themes/beauty-and-the-beast.png', 'themes/coco.png', 'themes/demon-slayer.png', 'themes/frozen.png', 'themes/gilmore-girls.svg', 'themes/harry-potter.svg', 'themes/howls-moving-castle.png', 'themes/naruto.png', 'themes/one-piece.png', 'themes/sailor-moon.png', 'themes/spirited-away.png', 'themes/stranger-things.svg', 'themes/tangled.svg', 'themes/the-originals.png', 'themes/titanic.svg', 'themes/twilight.svg', 'themes/up.png', 'themes/vampire-diaries.png',
  'themes/fonts/creepster.woff2', 'themes/halloween/web.svg', 'themes/halloween/graveyard.svg', 'themes/fonts/amatic.woff2', 'themes/fonts/caveat.woff2', 'themes/fonts/cinzel.woff2', 'themes/fonts/cinzeldec-700.woff2', 'themes/fonts/cormorant-500i.woff2', 'themes/fonts/cormorant-600.woff2', 'themes/fonts/fredoka.woff2', 'themes/fonts/gochi.woff2', 'themes/fonts/greatvibes-400.woff2', 'themes/fonts/imfell-400.woff2', 'themes/fonts/pacifico.woff2', 'themes/fonts/specialelite-400.woff2',
  'themes/balloons/1.webp', 'themes/beauty/1.webp', 'themes/frozen/1.webp', 'themes/howl/1.webp', 'themes/coco/1.webp', 'themes/yourname/1.webp', // anime stills are cached on first view (runtime)
  'manifest.json', 'icon.png', 'apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.min.js'];
const API = /\/(rest|auth|functions|realtime|graphql)\/v1\//;
const MEDIA_RE = /\/storage\/v1\/object\//;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch((err) => console.warn('precache', u, err))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('forus-') && ![SHELL, RUNTIME, MEDIA].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trimMedia(max = 250) { const c = await caches.open(MEDIA); const ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return; // never touch POST/PATCH/DELETE
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (API.test(url.pathname) || url.pathname.includes('/storage/v1/bucket')) return;
  // photos / voice notes: signed URLs change every time, so key them without the token
  if (MEDIA_RE.test(url.pathname)) {
    // audio/video use Range requests (iOS needs 206 responses) — let the network handle them
    if (req.headers.has('range') || req.destination === 'video' || req.destination === 'audio') return;
    if (url.pathname.includes('/object/sign/') || url.pathname.includes('/object/public/') || url.pathname.includes('/object/authenticated/')) {
      e.respondWith((async () => {
        const c = await caches.open(MEDIA); const key = url.origin + url.pathname;
        const hit = await c.match(key); if (hit) return hit;
        const res = await fetch(req); if (res && (res.ok || res.type === 'opaque')) { c.put(key, res.clone()); trimMedia(); } return res;
      })());
    }
    return;
  }
  if (req.mode === 'navigate') { // app shell, cache-first (works offline from the Home Screen too)
    e.respondWith((async () => {
      const c = await caches.open(SHELL);
      const hit = await c.match('index.html', { ignoreSearch: true }) || await c.match('./', { ignoreSearch: true });
      if (hit) return hit;
      try { return await fetch(req); } catch { return new Response('<h1 style="font-family:sans-serif;text-align:center;margin-top:40vh">Offline 📴 — open once with internet first 💕</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }); }
    })());
    return;
  }
  e.respondWith((async () => {
    const shellHit = await caches.match(req, { cacheName: SHELL }); if (shellHit) return shellHit; // cache-first shell
    const rc = await caches.open(RUNTIME); const hit = await rc.match(req);
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) rc.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; } // stale-while-revalidate
    const res = await net; return res || new Response('', { status: 504, statusText: 'offline' });
  })());
});
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'For Us 💕', {
    body: d.body || 'Someone sent you love 💗', icon: 'icon.png', badge: 'icon.png', tag: d.tag || 'forus', renotify: true,
    data: { url: new URL(d.url || './', self.registration.scope).href }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
