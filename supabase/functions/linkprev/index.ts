// For Us — link previews for chat (title, image, site) — fetched server-side so the browser isn't blocked by CORS
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } });
const PRIVATE = /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[|::1|fc|fd|metadata)/i;
const unesc = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();
function meta(html: string, keys: string[]) {
  for (const k of keys) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']+)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${k}["']`, 'i');
    const m = html.match(re1) || html.match(re2); if (m) return unesc(m[1]);
  }
  return '';
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { url } = await req.json();
    const u = new URL(String(url).slice(0, 2000));
    if (!/^https?:$/.test(u.protocol) || PRIVATE.test(u.hostname) || !u.hostname.includes('.') || /\.(local|internal|lan)$/i.test(u.hostname)) return json({ error: 'blocked' }, 400);
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(u, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; ForUsLinkPreview/1.0; +https://for-us.xyz)', accept: 'text/html,application/xhtml+xml', 'accept-language': 'en' } });
    const final = new URL(r.url || u.href);
    if (PRIVATE.test(final.hostname)) return json({ error: 'blocked' }, 400);
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('html')) { clearTimeout(t); return json({ url: final.href, site: final.hostname.replace(/^www\./, ''), title: decodeURIComponent(final.pathname.split('/').pop() || final.hostname), kind: ct.split(';')[0] }); }
    const reader = r.body!.getReader(); const dec = new TextDecoder(); let html = '';
    while (html.length < 350_000) { const { value, done } = await reader.read(); if (done) break; html += dec.decode(value, { stream: true }); if (/<\/head>/i.test(html)) break; }
    try { reader.cancel(); } catch { /* */ } clearTimeout(t);
    const title = meta(html, ['og:title', 'twitter:title']) || unesc((html.match(/<title[^>]*>([^<]{1,300})/i) || [])[1] || '');
    const desc = meta(html, ['og:description', 'twitter:description', 'description']);
    let image = meta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']);
    if (image) { try { image = new URL(image, final).href; if (!/^https:/.test(image)) image = ''; } catch { image = ''; } }
    const site = meta(html, ['og:site_name', 'application-name']) || final.hostname.replace(/^www\./, '');
    return json({ url: final.href, title: title.slice(0, 160), desc: desc.slice(0, 220), image, site: site.slice(0, 60) });
  } catch (_e) { return json({ error: 'fetch' }, 400); }
});
