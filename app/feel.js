// For Us v32 — feel: cards arrive a little differently every time, buttons ripple where you touch,
// the background drifts with your scroll, tabs slide in with a bit of variety, hellos change.
(() => {
'use strict';
const root = document.documentElement;
const LSg = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const motion = () => !(matchMedia('(prefers-reduced-motion: reduce)').matches || LSg('cc_reduce_motion') === '1');
const R = Math.random, between = (a, b) => a + R() * (b - a), pick = (a) => a[Math.floor(R() * a.length)];

// ---------- hellos ----------
const HI = {
  late: ['Up late', 'Still awake', 'Night owl', 'Hey, sleepyhead'],
  morning: ['Good morning', 'Morning', 'Rise and shine', 'Hey, sunshine', 'Morning, you'],
  afternoon: ['Good afternoon', 'Hey you', 'Afternoon', 'There you are', 'Hi again'],
  evening: ['Good evening', 'Evening', 'Hey you', 'There you are', 'Welcome back'],
  night: ['Good night', 'Cosy night', 'Sweet dreams soon', 'Hey, night owl'],
};
const hiPick = {}; // one pick per period per app open, so it doesn't flicker
window.FU_hiWord = (h) => { const k = h < 5 ? 'late' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night'; return hiPick[k] || (hiPick[k] = R() < .45 ? HI[k][0] : pick(HI[k])); };

// ---------- cards arrive: a little different each time ----------
const VARIANTS = [
  () => [{ opacity: 0, translate: `0 ${between(18, 30)}px` }, { opacity: 1, translate: '0 0' }],
  () => [{ opacity: 0, translate: `${between(-26, -14)}px ${between(6, 14)}px`, rotate: `${between(-1.4, -.4)}deg` }, { opacity: 1, translate: '0 0', rotate: '0deg' }],
  () => [{ opacity: 0, translate: `${between(14, 26)}px ${between(6, 14)}px`, rotate: `${between(.4, 1.4)}deg` }, { opacity: 1, translate: '0 0', rotate: '0deg' }],
  () => [{ opacity: 0, scale: `${between(.92, .96)}` }, { opacity: 1, scale: '1' }],
  () => [{ opacity: 0, translate: `0 ${between(26, 40)}px`, scale: '.97' }, { opacity: 1, translate: '0 0', scale: '1' }],
];
const EASES = ['cubic-bezier(.22,1,.36,1)', 'cubic-bezier(.34,1.32,.64,1)', 'cubic-bezier(.16,1,.3,1)', 'cubic-bezier(.25,1.15,.5,1)'];
const seen = new WeakSet();
let io = null;
function reveal(el, i) {
  if (!motion() || seen.has(el)) return; seen.add(el);
  try { el.animate(pick(VARIANTS)(), { duration: between(480, 720), delay: Math.min(i, 6) * between(40, 75) + between(0, 50), easing: pick(EASES), fill: 'backwards' }); } catch { /* old browser */ }
}
function watchTab(tab) {
  if (!tab || !('IntersectionObserver' in window)) return;
  if (!io) io = new IntersectionObserver((ents) => { let i = 0; ents.forEach((e) => { if (e.isIntersecting) { reveal(e.target, i++); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px', threshold: .06 });
  [...tab.children].forEach((c) => { if (c.offsetParent !== null && !seen.has(c)) io.observe(c); });
}
// every tab visit gets a fresh arrival for what's on screen
function onTab(tab) {
  if (!tab) return; [...tab.children].forEach((c) => seen.delete(c));
  requestAnimationFrame(() => watchTab(tab));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.nav button'); if (!b) return;
  // a slightly different slide each time
  document.querySelectorAll('.tab').forEach((t) => { t.style.setProperty('--fx', between(10, 26).toFixed(0) + 'px'); t.style.setProperty('--fy', between(-4, 8).toFixed(0) + 'px'); t.style.setProperty('--fs', between(.985, 1).toFixed(3)); });
  setTimeout(() => onTab(document.getElementById('tab-' + b.dataset.tab)), 0);
}, true);

// ---------- touch ripple ----------
const RIP_SEL = 'button, .gtile, .chips span, .emojis span, .seg button, .fuChip, [role=button]';
document.addEventListener('pointerdown', (e) => {
  if (!motion() || e.button > 0) return;
  const b = e.target.closest(RIP_SEL); if (!b || b.closest('.nav, #chatApp .chComposer, .fuPet') || b.disabled) return;
  const cs = getComputedStyle(b); if (cs.position === 'static') b.style.position = 'relative';
  const r = b.getBoundingClientRect(); const w = document.createElement('span'); w.className = 'fuRip'; w.setAttribute('aria-hidden', 'true');
  const d = Math.max(r.width, r.height) * 2.2; const c = document.createElement('i');
  Object.assign(c.style, { width: d + 'px', height: d + 'px', left: (e.clientX - r.left - d / 2) + 'px', top: (e.clientY - r.top - d / 2) + 'px' });
  w.appendChild(c); b.appendChild(w);
  c.animate([{ transform: 'scale(0)', opacity: .32 }, { transform: 'scale(1)', opacity: 0 }], { duration: between(520, 680), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).onfinish = () => w.remove();
}, { passive: true });

// ---------- depth: the background drifts a little slower than the page ----------
let raf = 0;
addEventListener('scroll', () => {
  if (raf || !motion()) return;
  raf = requestAnimationFrame(() => { raf = 0; const y = Math.min(scrollY, 2400); root.style.setProperty('--par', (-y * .06).toFixed(1) + 'px'); root.style.setProperty('--par2', (-y * .12).toFixed(1) + 'px'); });
}, { passive: true });

// ---------- boot: first screen arrives too ----------
const prevEnter = window.FU_enter;
window.FU_enter = async (...a) => { const r = prevEnter ? prevEnter(...a) : undefined; try { return await r; } finally { const t = document.querySelector('.tab:not(.hidden)'); if (t) onTab(t); } };
})();

// ---------- contrast guard: no theme may leave text unreadable ----------
// Some screens put a fixed light "paper" or a themed surface behind text that inherits the theme's ink.
// After any repaint we look for text that's nearly invisible on its own background and give it readable ink.
(() => {
  const parse = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function bgOf(el) {
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const s = getComputedStyle(a); const c = parse(s.backgroundColor); const img = s.backgroundImage;
      if (img && img !== 'none') {
        if (c && c.a > 0.85) return c;
        if (/gradient/.test(img) && !/url\(/.test(img)) { const cs = [...img.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter(Boolean); if (cs.length) { const n = cs.length, avg = cs.reduce((o, k) => ({ r: o.r + k.r / n, g: o.g + k.g / n, b: o.b + k.b / n, a: o.a + k.a / n }), { r: 0, g: 0, b: 0, a: 0 }); if (avg.a > 0.6) return avg; } }
        return null; // a picture: can't judge
      }
      if (c && c.a > 0.5) return c;
    }
    return null;
  }
  const DARK = { r: 34, g: 24, b: 30 }, LIGHT = { r: 255, g: 255, b: 255 };
  function guard(root) {
    root = root || document.body;
    root.querySelectorAll('[data-fucg]').forEach((e) => { e.style.removeProperty('color'); e.style.removeProperty('-webkit-text-fill-color'); delete e.dataset.fucg; });
    const els = root.querySelectorAll('h1,h2,h3,h4,p,span,b,small,label,button,a,li,div,td,blockquote,em,strong,i');
    for (const el of els) {
      if (el.closest('#fuMom,#fuAlive,#thAmb,#thDeco,#thDecoB,.chList .chB,#fuRecap')) continue;
      let has = false; for (const n of el.childNodes) if (n.nodeType === 3 && /[A-Za-z0-9]/.test(n.textContent)) { has = true; break; }
      if (!has) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') continue;
      const fg = parse(cs.webkitTextFillColor && !/currentcolor/i.test(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color); if (!fg || fg.a < 0.2) continue;
      const bg = bgOf(el); if (!bg) continue;
      if (ratio(fg, bg) >= 2.3) continue;
      const ink = ratio(DARK, bg) >= ratio(LIGHT, bg) ? 'rgb(34,24,30)' : '#fff';
      el.style.setProperty('color', ink, 'important'); el.style.setProperty('-webkit-text-fill-color', ink, 'important'); el.dataset.fucg = '1';
    }
  }
  const roots = () => ['.tab:not(.hidden)', '#modal:not(.hidden)', '#mainView > header.top', '#authView:not(.hidden)'].map((q) => document.querySelector(q)).filter(Boolean);
  let t = 0;
  const soon = (ms = 300) => { clearTimeout(t); t = setTimeout(() => { const go = () => { try { roots().forEach((r) => guard(r)); } catch (e) { /* never break the app */ } }; (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(go, { timeout: 600 }); }, ms); };
  document.addEventListener('cc:theme', () => soon(250));
  document.addEventListener('click', (e) => { if (e.target.closest('.nav button,[data-game],[data-feat],[data-fu],.gtile,.acc .accHead,.accToggle,#cookie,#cookieNew,#reason')) soon(450); }, true);
  const m = document.getElementById('modal'); if (m) new MutationObserver(() => soon(250)).observe(m, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
  const prev = window.FU_enter; window.FU_enter = async (...a) => { const r = prev ? prev(...a) : undefined; try { return await r; } finally { soon(600); } };
  window.FU_contrast = guard;
  soon(1200);
})();

// ---------- video previews: every video shows a real frame, not a blank tile ----------
// iPhones often don't paint a video's first frame until it plays, so we grab one ourselves and use it as the poster.
(() => {
  const cache = new Map(); const busy = new Set();
  const key = (src) => String(src).split('#')[0].split('?')[0];
  function grab(src) {
    return new Promise((res) => {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
      let done = false; const end = (u) => { if (done) return; done = true; v.removeAttribute('src'); v.load(); res(u); };
      v.onloadeddata = () => { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 3); } catch { end(null); } };
      v.onseeked = () => {
        try { const w = 360, h = Math.round(w * (v.videoHeight / v.videoWidth || 1)); const c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(v, 0, 0, w, h); end(c.toDataURL('image/jpeg', 0.72)); } catch { end(null); } // a cross-origin frame can't be read: leave it
      };
      v.onerror = () => end(null); setTimeout(() => end(null), 8000);
      v.src = String(src).split('#')[0];
    });
  }
  async function poster(el) {
    const src = el.currentSrc || el.getAttribute('src'); if (!src || el.poster || el.dataset.fuPost) return; el.dataset.fuPost = '1';
    const k = key(src); if (cache.has(k)) { if (cache.get(k)) el.poster = cache.get(k); return; }
    if (busy.has(k)) return; busy.add(k);
    const u = await grab(src); cache.set(k, u); busy.delete(k);
    document.querySelectorAll('video').forEach((x) => { const s = x.currentSrc || x.getAttribute('src'); if (s && key(s) === k && !x.poster && u) x.poster = u; });
  }
  let t = 0;
  const scan = () => { clearTimeout(t); t = setTimeout(() => document.querySelectorAll('.chMedia video, .chRound video, .phVid video, #chViewBox video').forEach((v) => { if (!v.poster) { delete v.dataset.fuPost; poster(v); } }), 250); };
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();

// ---------- glass chat bubbles: the theme's colour stays rich, the scene behind shows through ----------
(() => {
  const A = 0.8;
  const fix = (s) => s.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, `rgba($1, $2, $3, ${A})`).replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/g, (m, r, g, b, al) => `rgba(${r}, ${g}, ${b}, ${Math.min(+al, A)})`);
  let done = '';
  function build() {
    const theme = document.documentElement.dataset.theme || ''; if (done === theme) return;
    const st = document.getElementById('fuGlass'); if (st) st.disabled = true; // read the theme's own colours
    const rules = [];
    for (const side of ['me', 'them']) {
      const b = document.querySelector(`#chatApp .chRow.${side} .chB:not(.bare):not(.greet):not(.del)`); if (!b) { if (st) st.disabled = false; return; }
      const cs = getComputedStyle(b); const solid = /rgba?\(/.test(cs.backgroundColor) && !/,\s*0\)$/.test(cs.backgroundColor) ? `linear-gradient(${fix(cs.backgroundColor)}, ${fix(cs.backgroundColor)})` : ''; const tex = cs.backgroundImage && cs.backgroundImage !== 'none' && !/repeating-|url\(/.test(cs.backgroundImage) ? fix(cs.backgroundImage) : ''; // paper/metal textures don't survive see-through — keep the colour
      const img = [tex, solid].filter(Boolean).join(', ') || 'none';
      rules.push(`html[data-theme] #chatApp .chRow.${side} .chB:not(.bare):not(.greet):not(.del){background-color:transparent!important;background-image:linear-gradient(180deg,rgba(255,255,255,.26),rgba(255,255,255,.06) 45%,rgba(255,255,255,0) 60%),${img}!important}`);
    }
    rules.push(`html[data-theme] #chatApp .chRow .chB:not(.bare):not(.del){-webkit-backdrop-filter:blur(14px) saturate(1.9) brightness(1.05);backdrop-filter:blur(14px) saturate(1.9) brightness(1.05);border:1px solid rgba(255,255,255,.32)!important;box-shadow:0 6px 18px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.42)!important}`);
    let s = st; if (!s) { s = document.createElement('style'); s.id = 'fuGlass'; document.head.appendChild(s); }
    s.textContent = rules.join('\n'); s.disabled = false; done = theme;
  }
  document.addEventListener('cc:theme', () => { done = ''; setTimeout(build, 200); });
  const watch = () => { const box = document.getElementById('chMsgs'); if (!box) return setTimeout(watch, 1000); new MutationObserver(() => { if (done !== (document.documentElement.dataset.theme || '')) build(); }).observe(box, { childList: true }); build(); };
  if (document.readyState !== 'loading') watch(); else document.addEventListener('DOMContentLoaded', watch);
})();

