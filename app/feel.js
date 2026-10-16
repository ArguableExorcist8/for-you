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
