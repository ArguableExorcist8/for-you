// For Us service worker — offline app shell + photo cache + push notifications
const VERSION = 'v16';
const SHELL = 'forus-shell-' + VERSION, RUNTIME = 'forus-runtime-' + VERSION, MEDIA = 'forus-media-v1';
const V = '?v=16';
const PRECACHE = ['./', 'index.html', 'style.css' + V, 'config.js' + V, 'data.js' + V, 'trivia.js' + V, 'anim.js' + V, 'app.js' + V, 'cute.js' + V,
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
