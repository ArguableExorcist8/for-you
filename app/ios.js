// For Us v52 — iPhone touches + motion
// real taps you can feel · app icon badge · screen stays awake · share sheet · Dynamic Island glow · morphing opens
// springier sheets · tilt parallax · hold to your heart · face-down goodnight · shake for a memory
(() => {
'use strict';
const F = () => window.__FU;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = () => F() && F().S;
const pn = () => (F() && F().partnerName && F().partnerName()) || 'your love';
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } };
const root = document.documentElement;
const isIOS = /iP(hone|ad|od)/.test(navigator.platform) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const lively = () => { try { return (F().motionOn ? F().motionOn() : true) && !root.classList.contains('fuLow'); } catch { return true; } };

// ======================= 1. real taps on iPhone =======================
// iPhone ignores vibrate(); since iOS 18 flipping a native switch gives a real haptic tick. One hidden switch, flipped on cue.
if (isIOS) {
  let lab = null, last = 0;
  const tick = () => {
    const now = Date.now(); if (now - last < 45) return; last = now;
    try {
      if (!lab || !lab.isConnected) {
        lab = document.createElement('label'); lab.setAttribute('aria-hidden', 'true'); lab.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
        const inp = document.createElement('input'); inp.type = 'checkbox'; inp.setAttribute('switch', ''); inp.tabIndex = -1; lab.appendChild(inp); document.body.appendChild(lab);
      }
      lab.click();
    } catch { /* */ }
  };
  // every buzz in the app (pings, drags, sends, ticks…) now lands as a tap. Longer patterns get a second tap when allowed.
  const vib = (p) => { if (LS('cc_reduce_motion') === '1' && (!Array.isArray(p) || p.length < 2)) return true; tick(); if (Array.isArray(p) && p.length > 2) setTimeout(tick, Math.min(160, (p[0] || 10) + (p[1] || 40))); return true; };
  try { Object.defineProperty(navigator, 'vibrate', { value: vib, configurable: true, writable: true }); } catch { try { navigator.vibrate = vib; } catch { /* */ } }
  window.FU_tick = tick;
}

// ======================= 2. app icon badge =======================
function badgeSync() {
  const b = $('#chatBadge'); if (!b || b.dataset.fuB) return; b.dataset.fuB = '1';
  const set = () => {
    const n = b.classList.contains('hidden') ? 0 : parseInt(b.textContent, 10) || 0;
    try { if (navigator.setAppBadge) { n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } } catch { /* */ }
    try { navigator.serviceWorker && navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage({ badge: n }); } catch { /* */ }
  };
  new MutationObserver(set).observe(b, { attributes: true, childList: true, characterData: true, subtree: true }); set();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) set(); });
}

// ======================= 3. the screen stays awake while it matters =======================
let wl = null; const why = new Set();
async function awake(key, on) {
  on ? why.add(key) : why.delete(key);
  try {
    if (why.size && !wl && navigator.wakeLock) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
    else if (!why.size && wl) { await wl.release(); wl = null; }
  } catch { /* not allowed right now */ }
}
document.addEventListener('play', (e) => { if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') awake('media', true); }, true);
['pause', 'ended'].forEach((k) => document.addEventListener(k, () => { if (!$$('video,audio').some((m) => !m.paused && !m.ended)) awake('media', false); }, true));
function watchRecording() {
  const check = () => awake('rec', !!($('#chatApp.recording') || $('#pingBtn.vpRec') || $('#owRec.rec') || $('.chVN.rec')));
  // v55: watch just the few things that can record, not every class change on the page
  const mo = new MutationObserver(check); const seen = new WeakSet();
  const attach = () => ['#chatApp', '#pingBtn', '#owRec', '#chVN', '.chVN'].forEach((s) => { const el = $(s); if (el && !seen.has(el)) { seen.add(el); mo.observe(el, { attributes: true, attributeFilter: ['class'] }); } });
  attach(); setInterval(attach, 4000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && why.size && !wl) awake([...why][0], true); });

// ======================= 4. iPhone's own share sheet =======================
const canShare = () => !!navigator.share;
async function shareFile(url, name, text) {
  try {
    const r = await fetch(url); const blob = await r.blob(); const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], text });
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.share({ text }); } catch { /* cancelled */ }
}
async function shareText(text, title) { try { await navigator.share({ title, text }); } catch { /* cancelled */ } }
function shareButtons() {
  const box = $('#modalBox'); if (!box || !canShare()) return;
  if ($('.fuShare', box)) return;
  const img = $('img', box), vid = $('video', box), letter = $('.letter', box);
  let btn = null;
  if ((img || vid) && $('#phDelBtn', box)) {
    btn = mk('📤 Share'); btn.onclick = () => shareFile((img || vid).src, vid ? 'us.mp4' : 'us.jpg', $('#capEdit')?.value || 'From us 💕');
    $('#phDelBtn', box).before(btn);
  } else if (letter) {
    btn = mk('📤 Share'); const h = $('h2', box)?.textContent || ''; btn.onclick = () => shareText(`${h}\n\n${letter.textContent}`, h);
    const close = $('[data-close]', box); close ? close.before(btn) : box.appendChild(btn);
  }
}
const mk = (t) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'soft fuShare'; b.textContent = t; return b; };
function shareWeek() {
  const wk = $('#fuWeek'); if (!wk || !canShare() || $('.fuShareWk', wk)) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'soft mini fuShareWk'; b.textContent = '📤 Share our week';
  b.onclick = () => { const g = $$('.wkGrid > div', wk).map((d) => `${d.querySelector('b')?.textContent} ${d.querySelector('small')?.textContent}`).join(' · '); shareText(`Our week 💞 ${g}`, 'Our week'); };
  wk.appendChild(b);
}

// ======================= 5. Dynamic Island glow =======================
let island = null;
function islandInit() {
  if (!isIOS || island) return;
  const p = document.createElement('div'); p.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none'; document.body.appendChild(p);
  const top = p.getBoundingClientRect().height; p.remove();
  root.dataset.island = top >= 51 ? 'di' : top >= 40 ? 'notch' : 'none';
  if (top < 40) return;
  island = document.createElement('div'); island.className = 'fuIsland'; island.setAttribute('aria-hidden', 'true'); document.body.appendChild(island);
}
function islandPulse(kind) {
  if (!island || !lively()) return;
  island.className = 'fuIsland'; void island.offsetWidth; island.classList.add('go', kind || 'love');
  clearTimeout(islandPulse.t); islandPulse.t = setTimeout(() => island.classList.remove('go'), 1700);
}
window.FU_island = islandPulse;
function islandHooks() {
  const o = $('#heartOverlay'); if (o && !o.dataset.fuI) { o.dataset.fuI = '1'; new MutationObserver(() => { if (!o.classList.contains('hidden')) islandPulse('love'); }).observe(o, { attributes: true, attributeFilter: ['class'] }); }
  const t = $('#toast'); if (t && !t.dataset.fuI) { t.dataset.fuI = '1'; new MutationObserver(() => { const s = t.textContent || ''; if (/sent|🤗|💗/.test(s) && t.classList.contains('show')) islandPulse('sent'); }).observe(t, { childList: true, attributes: true, attributeFilter: ['class'] }); }
}

// ======================= 6. morphing opens (photo → full view, tile → page) =======================
const vt = !!document.startViewTransition;
let morphing = false;
function morph(el, name, run, after) {
  if (!vt || !lively() || morphing) return run();
  morphing = true; el.style.viewTransitionName = name; root.classList.add('fuMorphing');
  const t = document.startViewTransition(() => { el.style.viewTransitionName = ''; run(); const dst = after && after(); if (dst) dst.style.viewTransitionName = name; });
  t.finished.finally(() => { morphing = false; root.classList.remove('fuMorphing'); const dst = after && after(); if (dst) dst.style.viewTransitionName = ''; });
}
document.addEventListener('click', (e) => {
  if (!vt || !lively() || morphing || e.__fuMorph) return;
  const ph = e.target.closest('#gallery > [data-photo]');
  if (ph && !e.target.closest('[data-pdel]')) {
    const img = $('img, video', ph); if (!img) return;
    e.stopImmediatePropagation(); e.preventDefault();
    morph(img, 'fu-pic', () => { const ev = new MouseEvent('click', { bubbles: true }); ev.__fuMorph = true; ph.dispatchEvent(ev); }, () => $('#modalBox img, #modalBox video'));
    return;
  }
  const tile = e.target.closest('.gtile[data-feat], .gtile[data-game]');
  if (tile) {
    e.stopImmediatePropagation(); e.preventDefault();
    const sel = tile.dataset.feat ? `.feat[data-panel="${tile.dataset.feat}"]` : `.game[data-panel="${tile.dataset.game}"]`;
    morph(tile, 'fu-tile', () => { const ev = new MouseEvent('click', { bubbles: true }); ev.__fuMorph = true; tile.dispatchEvent(ev); }, () => $(sel));
  }
}, true);

// ======================= 7. springier sheets =======================
// the sheet already drags down to close; now it stretches like rubber when you pull past the top, and resists a little going down
function rubber() {
  const box = $('#modalBox'); if (!box || box.dataset.fuR) return; box.dataset.fuR = '1';
  let y0 = null;
  box.addEventListener('touchstart', (e) => { y0 = box.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
  box.addEventListener('touchmove', (e) => {
    if (y0 === null) return; const dy = e.touches[0].clientY - y0;
    if (dy < 0 && box.scrollHeight <= box.clientHeight + 2) { box.style.transform = `translateY(${-Math.pow(-dy, .6)}px)`; box.classList.add('fuStretch'); }
    else if (dy > 0 && box.classList.contains('drag')) box.style.transform = `translateY(${Math.pow(dy, .92)}px)`;
  }, { passive: true });
  box.addEventListener('touchend', () => {
    if (box.classList.contains('fuStretch')) { box.classList.remove('fuStretch'); box.style.transition = 'transform .45s cubic-bezier(.34,1.56,.64,1)'; box.style.transform = ''; setTimeout(() => { box.style.transition = ''; }, 460); }
    y0 = null;
  });
}

// ======================= motion: permission once, then tilt · heart · face-down · shake =======================
let motionOn = LS('fu_motionfx') === '1', armed = false;
async function askMotion() {
  try {
    const A = window.DeviceMotionEvent, B = window.DeviceOrientationEvent;
    if (A && typeof A.requestPermission === 'function' && (await A.requestPermission()) !== 'granted') return false;
    if (B && typeof B.requestPermission === 'function') await B.requestPermission().catch(() => {});
    return true;
  } catch { return false; }
}
function arm() {
  if (motionOn && !armed) { addEventListener('deviceorientation', onTilt); addEventListener('devicemotion', onMove); armed = true; root.classList.add('fuTilt'); }
  else if (!motionOn && armed) { removeEventListener('deviceorientation', onTilt); removeEventListener('devicemotion', onMove); armed = false; root.classList.remove('fuTilt'); root.style.removeProperty('--tiltX'); root.style.removeProperty('--tiltY'); }
}

// ---------- 8. tilt parallax ----------
let base = null, tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
function onTilt(e) {
  if (e.beta == null || document.hidden) return;
  if (!base) base = { b: e.beta, g: e.gamma };
  base.b += (e.beta - base.b) * .01; base.g += (e.gamma - base.g) * .01; // slowly re-centres on how you're holding it
  tx = Math.max(-1, Math.min(1, (e.gamma - base.g) / 20)); ty = Math.max(-1, Math.min(1, (e.beta - base.b) / 20));
  if (!raf) raf = requestAnimationFrame(tiltFrame);
}
function tiltFrame() {
  raf = 0; if (!lively()) return; cx += (tx - cx) * .12; cy += (ty - cy) * .12;
  const X = cx.toFixed(3), Y = cy.toFixed(3); // set only where it's used, never on the whole page
  for (const el of [document.getElementById('thDeco'), document.getElementById('thDecoB'), document.getElementById('chatApp'), document.querySelector('.ping-card')]) if (el) { el.style.setProperty('--tiltX', X); el.style.setProperty('--tiltY', Y); }
  if (Math.abs(tx - cx) > .002 || Math.abs(ty - cy) > .002) raf = requestAnimationFrame(tiltFrame);
}

// ---------- 9/10/11. heart · face-down · shake ----------
let still = 0, last = 0, peaks = [], down = 0, hb = null;
function onMove(e) {
  const g = e.accelerationIncludingGravity, a = e.acceleration; if (!g) return;
  const now = Date.now(), dt = Math.min(100, last ? now - last : 16); last = now;
  const mag = Math.sqrt((g.x || 0) ** 2 + (g.y || 0) ** 2 + (g.z || 0) ** 2);
  // shake → a memory, when the jar is on screen
  if (mag > 24) { peaks = peaks.filter((t) => now - t < 900); peaks.push(now); }
  if (peaks.length >= 3 && jarOnScreen() && now - (onMove.lastShake || 0) > 1500) { onMove.lastShake = now; peaks = []; window.FU_x2 && window.FU_x2.pullMemory(); }
  // face down (screen to the table) at night → offer goodnight next time you pick it up
  const faceDown = (g.z || 0) > 8.6 && Math.abs(g.x || 0) < 2.5 && Math.abs(g.y || 0) < 2.5;
  down = faceDown ? down + dt : 0;
  const h = new Date().getHours();
  if (down > 2000 && (h >= 20 || h < 4) && !LS('fu_gn_offer') && $('#fuGN') && !$('#fuNight.hidden')) LS('fu_gn_offer', String(now));
  // hold to your heart
  if (hb) {
    const jitter = a ? Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2) : Math.abs(mag - 9.81);
    still = jitter < 0.9 ? still + dt : Math.max(0, still - dt * 2);
    hb.prog(Math.min(1, still / 3000));
    if (still >= 3000) hb.done();
  }
}
const jarOnScreen = () => { const j = $('#fuJar'); if (!j || document.body.dataset.tab !== 'home') return false; const r = j.getBoundingClientRect(); return r.top < innerHeight * .8 && r.bottom > innerHeight * .2; };
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return; const t = +LS('fu_gn_offer') || 0; if (!t) return; LS('fu_gn_offer', null);
  if (Date.now() - t > 10 * 3600e3 || !$('#fuGN') || $('#fuNight.hidden')) return;
  F().openModal(`<div class="fuGnOffer"><b>🌙</b><h2>Going to sleep?</h2><p class="muted">Send ${esc(pn())} your goodnight before you go 💤</p><button type="button" id="fuGnYes">${esc($('#fuGN').textContent)}</button><button type="button" class="soft" data-close>Not now</button></div>`);
  $('#fuGnYes').onclick = () => { F().closeModal(); $('#fuGN') && $('#fuGN').click(); };
});

// heartbeat: a button on the ping card starts it; the phone held still to your chest for 3 s sends it
function heartBtn() {
  const card = $('.ping-card'); if (!card || $('#fuHeartBtn')) return;
  const b = document.createElement('button'); b.type = 'button'; b.id = 'fuHeartBtn'; b.className = 'soft mini fuHeartBtn'; b.innerHTML = '💓 Send my heartbeat';
  const after = $('.vpHint', card) || $('#pingHint', card); (after || card.lastElementChild).after(b);
  b.onclick = startHeart;
}
async function startHeart() {
  if (!motionOn) { const ok = await askMotion(); if (ok) { motionOn = true; LS('fu_motionfx', '1'); arm(); syncSet(); } }
  const o = document.createElement('div'); o.className = 'fuHeartHold';
  o.innerHTML = `<div class="hhRing"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54"/><circle class="p" cx="60" cy="60" r="54"/></svg><b>💓</b></div><h3>Hold your phone to your heart</h3><p>${motionOn ? 'Keep it still for 3 seconds…' : 'Press and hold the heart for 3 seconds…'}</p><button type="button" class="soft">Cancel</button>`;
  document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('on'));
  const ring = $('.p', o); const prog = (p) => { ring.style.strokeDashoffset = String(340 * (1 - p)); o.style.setProperty('--hp', p.toFixed(2)); };
  let gone = false;
  const end = () => { if (gone) return; gone = true; hb = null; o.classList.remove('on'); setTimeout(() => o.remove(), 300); };
  const done = async () => {
    if (gone) return; hb = null; o.classList.add('sent'); $('h3', o).textContent = 'Heartbeat sent 💓'; $('p', o).textContent = `${pn()} will feel it`;
    try { navigator.vibrate && navigator.vibrate([20, 90, 35]); } catch { /* */ }
    window.FU_island && window.FU_island('love'); F().sendPing('💓'); setTimeout(end, 1300);
  };
  $('button', o).onclick = end; still = 0; prog(0);
  if (motionOn) hb = { prog, done };
  else { // no motion sensor: press and hold the big heart instead
    let t0 = 0, rf = 0; const hr = $('.hhRing', o);
    const step = () => { const p = Math.min(1, (Date.now() - t0) / 3000); prog(p); if (p >= 1) return done(); rf = requestAnimationFrame(step); };
    hr.addEventListener('pointerdown', () => { t0 = Date.now(); step(); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach((k) => hr.addEventListener(k, () => { cancelAnimationFrame(rf); if (!gone && !o.classList.contains('sent')) prog(0); }));
  }
}
// receiving one: the whole screen beats
function heartbeatIn() {
  const o = $('#heartOverlay'); if (!o || o.dataset.fuHb) return; o.dataset.fuHb = '1';
  new MutationObserver(() => {
    if (o.classList.contains('hidden') || !/💓/.test($('#heartTxt')?.textContent || '')) return;
    document.body.classList.remove('fuBeat'); void document.body.offsetWidth; document.body.classList.add('fuBeat');
    setTimeout(() => document.body.classList.remove('fuBeat'), 4200);
    let n = 0; const beat = () => { try { navigator.vibrate && navigator.vibrate([20, 120, 30]); } catch { /* */ } if (++n < 4) setTimeout(beat, 1000); }; beat();
  }).observe(o, { attributes: true, attributeFilter: ['class'] });
}

// ======================= settings =======================
function settings() {
  const anchor = $('#fuShakeCard') || ($('#setReduce') && $('#setReduce').closest('.card')); if (!anchor || $('#fuMotionCard')) return;
  const c = document.createElement('div'); c.className = 'card'; c.id = 'fuMotionCard';
  c.innerHTML = `<h2>📱 Motion effects</h2><label class="tgl"><input type="checkbox" id="fuMotionSet"> <span>Use the phone's movement <small>tilt the scenery · hold to your heart · face-down goodnight · shake the jar for a memory</small></span></label>`;
  anchor.after(c);
  $('#fuMotionSet').onchange = async (e) => {
    if (e.target.checked) { const ok = await askMotion(); if (!ok) { e.target.checked = false; return F().toast('Motion permission needed 📳'); } }
    motionOn = e.target.checked; LS('fu_motionfx', motionOn ? '1' : null); arm(); F().toast(motionOn ? 'Tilt your phone ✨' : 'Motion effects off');
  };
  syncSet();
}
const syncSet = () => { const c = $('#fuMotionSet'); if (c) c.checked = motionOn; };

// ======================= v53 chat as its own screen: back chevron + swipe in from the left edge =======================
let lastTab = 'home';
new MutationObserver(() => { const t = document.body.dataset.tab; if (t && t !== 'chat') lastTab = t; }).observe(document.body, { attributes: true, attributeFilter: ['data-tab'] });
const goBack = () => { if (history.state && history.state.fu === 'chat') { history.back(); return; } try { F().goTab(lastTab || 'home'); } catch { /* */ } };
// v56: in Safari the left-edge swipe is the browser's own "back". Give it a step inside the app so it goes chat → Home,
// and never back out to the sign-in pages you came through.
if (!standalone) {
  try { if (!history.state || !history.state.fu) { history.replaceState({ fu: 'root' }, ''); history.pushState({ fu: 'app' }, ''); } } catch { /* */ }
  new MutationObserver(() => {
    const inC = document.body.classList.contains('inChat');
    try { if (inC && (!history.state || history.state.fu !== 'chat')) history.pushState({ fu: 'chat' }, ''); else if (!inC && history.state && history.state.fu === 'chat') history.back(); } catch { /* */ }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('popstate', (e) => {
    const st = e.state && e.state.fu;
    if (document.body.classList.contains('inChat') && st !== 'chat') { try { F().goTab(lastTab || 'home'); } catch { /* */ } return; }
    if (st === 'root') { try { history.pushState({ fu: 'app' }, ''); } catch { /* */ } } // back from Home stays in the app
  });
}
function chatBack() {
  const head = $('#chatApp .chatHead'); if (!head || $('.chBack', head)) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chBack'; b.setAttribute('aria-label', 'Back');
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'; b.onclick = goBack; head.prepend(b);
}
let edge = null;
document.addEventListener('touchstart', (e) => {
  if (!standalone || !document.body.classList.contains('inChat') || document.body.classList.contains('kbOpen') || e.touches.length !== 1) return; // in Safari the browser's own swipe does this
  const t = e.touches[0]; if (t.clientX > 22 || $('#modal:not(.hidden)') || $('.chViewer:not(.hidden)')) return;
  edge = { x: t.clientX, y: t.clientY, dx: 0, on: false }; e.stopPropagation();
}, { capture: true, passive: true });
document.addEventListener('touchmove', (e) => {
  if (!edge) return; const t = e.touches[0], dx = t.clientX - edge.x, dy = t.clientY - edge.y;
  if (!edge.on) {
    if (Math.abs(dy) > 14 && Math.abs(dy) > dx) { edge = null; return; } if (dx < 10) return; edge.on = true; $('#chatApp').classList.add('fuEdge');
    const lab = ($(`.nav button[data-tab="${lastTab}"] span`) || {}).textContent || 'Home';
    edge.hint = document.createElement('div'); edge.hint.className = 'fuEdgeHint'; edge.hint.innerHTML = `<b>‹</b> ${esc(lab)}`; document.body.appendChild(edge.hint);
  }
  e.preventDefault(); e.stopPropagation(); edge.dx = Math.max(0, dx);
  $('#chatApp').style.transform = `translate3d(${edge.dx}px,0,0)`;
  const k = Math.min(1, edge.dx / 110); edge.hint.style.opacity = String(k); edge.hint.style.transform = `translateX(${-30 + k * 46}px) scale(${.8 + k * .2})`;
}, { capture: true, passive: false });
const edgeEnd = (cancel) => {
  if (!edge) return; const g = edge; edge = null; if (!g.on) return;
  const app = $('#chatApp'); app.classList.remove('fuEdge'); app.classList.add('fuEdgeBack');
  if (g.hint) { const h = g.hint; h.style.transition = 'opacity .25s,transform .25s'; h.style.opacity = '0'; setTimeout(() => h.remove(), 280); }
  const go = !cancel && g.dx > Math.min(110, innerWidth * .28);
  app.style.transform = go ? `translate3d(${innerWidth}px,0,0)` : '';
  if (go) { try { navigator.vibrate && navigator.vibrate(8); } catch { /* */ } }
  setTimeout(() => { app.classList.remove('fuEdgeBack'); if (go) { goBack(); requestAnimationFrame(() => { app.style.transform = ''; }); } }, 260);
};
document.addEventListener('touchend', () => edgeEnd(false), true); document.addEventListener('touchcancel', () => edgeEnd(true), true);

// ======================= boot =======================
function hook() {
  if (!F()) return;
  chatBack(); badgeSync(); watchRecording.done || (watchRecording(), watchRecording.done = 1); islandInit(); islandHooks(); rubber(); heartBtn(); heartbeatIn(); settings(); shareWeek(); arm();
  const box = $('#modalBox'); if (box && !box.dataset.fuSh) { box.dataset.fuSh = '1'; new MutationObserver(() => setTimeout(shareButtons, 30)).observe(box, { childList: true }); }
}
const prevEnter = window.FU_enter;
window.FU_enter = async (...a) => { const p = prevEnter ? prevEnter(...a) : undefined; try { return await p; } finally { hook(); setTimeout(hook, 1600); } };
const boot = () => { root.classList.toggle('fuIOS', isIOS); root.classList.toggle('fuApp', standalone); hook(); };
if (document.readyState !== 'loading') setTimeout(boot, 0); else document.addEventListener('DOMContentLoaded', boot);
window.FU_ios = { islandPulse, startHeart, shareButtons, askMotion };
})();
