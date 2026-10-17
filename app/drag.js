// For Us v48 — drag & drop: hold to pick up (little buzz + lift), drag, let go.
// Home cards (your own order) · check-ins · shared lists · countdown pin · emoji onto your love · photo favourites · files into chat
(() => {
'use strict';
const F = () => window.__FU;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = () => F() && F().S;
const me = () => S()?.user?.id, them = () => S()?.partner?.id;
const calm = () => document.documentElement.classList.contains('reduce') || matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('cc_reduce_motion') === '1';
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* */ } };

// ======================= engine =======================
// cfg: { root, item, mode:'move'|'ghost', delay, grid, key(el), onDrop(keys, container), targets(), onTarget(el, target), ok(el) }
const CFG = [];
let pend = null, st = null, suppressUntil = 0;
const NOGRAB = 'input,textarea,select,[contenteditable],a[href],.phDel,.flHint,#pingBtn';

function findCfg(t) {
  let best = null;
  for (const c of CFG) {
    const it = t.closest(c.item); if (!it || !it.closest(c.root)) continue;
    if (c.ok && !c.ok(it)) continue;
    if (!best || best.it.contains(it)) best = { c, it };
  }
  return best;
}
document.addEventListener('pointerdown', (e) => {
  if (st || pend || e.button > 0 || !e.isPrimary || !S()?.couple) return;
  if (e.target.closest(NOGRAB) || e.target.closest('#modalBox') && !e.target.closest('.ckSlots')) return;
  const f = findCfg(e.target); if (!f) return;
  pend = { ...f, x: e.clientX, y: e.clientY, id: e.pointerId, top: f.it.getBoundingClientRect().top };
  pend.t = setTimeout(() => { if (pend) begin(pend); }, f.c.delay ?? 380);
  f.it.classList.add('fuPress');
  if (f.c.mode !== 'ghost' || (f.c.delay ?? 380) > 200) { // a ring fills around your finger while you hold
    const ring = document.createElement('i'); ring.className = 'fuRing'; ring.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--d:${f.c.delay ?? 380}ms`;
    document.body.appendChild(ring); pend.ring = ring;
  }
}, true);
const unpend = () => { if (!pend) return; clearTimeout(pend.t); pend.it.classList.remove('fuPress'); if (pend.ring) pend.ring.remove(); pend = null; };
addEventListener('pointermove', (e) => {
  if (pend && e.pointerId === pend.id && Math.hypot(e.clientX - pend.x, e.clientY - pend.y) > 9) unpend();
  if (st && e.pointerId === st.id) { e.preventDefault(); move(e.clientX, e.clientY); }
}, { passive: false });
addEventListener('pointerup', (e) => { unpend(); if (st && e.pointerId === st.id) drop(); }, true);
addEventListener('pointercancel', (e) => { unpend(); if (st && e.pointerId === st.id) drop(true); }, true);
addEventListener('touchmove', (e) => { if (st) e.preventDefault(); }, { passive: false }); // the page holds still while you carry something
addEventListener('contextmenu', (e) => { if (pend || st) e.preventDefault(); }, true);
addEventListener('click', (e) => { if (Date.now() < suppressUntil) { e.preventDefault(); e.stopPropagation(); } }, true);
addEventListener('scroll', () => { if (pend && Math.abs(pend.it.getBoundingClientRect().top - pend.top) > 10) unpend(); }, { passive: true }); // the page moved under the finger → it was a scroll

function begin(p) {
  const { c, it } = p; pend = null; it.classList.remove('fuPress');
  if (p.ring) { const rg = p.ring; rg.classList.add('pop'); setTimeout(() => rg.remove(), 320); }
  if (!it.isConnected) return;
  if (c.onBegin) c.onBegin(it);
  let r = it.getBoundingClientRect();
  st = { c, it, id: p.id, x0: p.x, y0: p.y, x: p.x, y: p.y, r, container: it.parentElement, target: null };
  buzz(12);
  document.body.classList.add('fuDragging'); document.documentElement.style.overflowAnchor = 'none'; // no scroll jumps while things shuffle
  try { getSelection().removeAllRanges(); } catch { /* */ }
  const fly = c.mode === 'ghost' ? it.cloneNode(true) : it;
  if (c.mode === 'ghost') { fly.removeAttribute('id'); $$('[id]', fly).forEach((x) => x.removeAttribute('id')); document.body.appendChild(fly); it.classList.add('fuSrc'); }
  else {
    const ph = document.createElement(it.tagName === 'BUTTON' ? 'span' : 'div'); ph.className = 'fuPh';
    const cs = getComputedStyle(it);
    ph.style.cssText = `width:${r.width}px;height:${r.height}px;margin:${cs.margin};border-radius:${cs.borderRadius}`;
    if (c.grid === true) ph.style.display = 'inline-block';
    it.before(ph); st.ph = ph;
    st.before = order(st).join();
    if (c.onBegin) { // the list just folded up: bring the gap under the finger
      const pr = ph.getBoundingClientRect(); scrollBy(0, pr.top + pr.height / 2 - p.y); r = ph.getBoundingClientRect(); st.r = r;
    }
  }
  st.fly = fly;
  Object.assign(fly.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', zIndex: '9990', pointerEvents: 'none', boxSizing: 'border-box' });
  fly.classList.add('fuLift');
  requestAnimationFrame(() => fly.classList.add('up'));
  scrollLoop();
}
function move(x, y) {
  st.x = x; st.y = y;
  st.fly.style.transform = `translate3d(${x - st.x0}px,${y - st.y0}px,0)`;
  if (st.c.mode === 'ghost') {
    const t = (st.c.targets ? st.c.targets() : []).find((el) => { const b = el.getBoundingClientRect(); return x > b.left - 12 && x < b.right + 12 && y > b.top - 12 && y < b.bottom + 12; }) || null;
    if (t !== st.target) { st.target && st.target.classList.remove('fuDropOn'); t && t.classList.add('fuDropOn'); if (t) buzz(6); st.target = t; }
    return;
  }
  const sibs = [...st.container.children].filter((el) => el !== st.it && el !== st.ph && el.matches(st.c.item) && (!st.c.ok || st.c.ok(el)));
  if (!sibs.length) return;
  let ref = null, after = false;
  if (typeof st.c.grid === 'function' ? st.c.grid() : st.c.grid) {
    let bd = 1e9;
    sibs.forEach((el) => { const b = el.getBoundingClientRect(); const d = Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2)); if (d < bd) { bd = d; ref = el; after = x > b.left + b.width / 2; } });
  } else {
    ref = sibs.find((el) => { const b = el.getBoundingClientRect(); return y < b.top + b.height / 2; });
    if (!ref) { ref = sibs[sibs.length - 1]; after = true; }
  }
  if (after ? ref.nextElementSibling === st.ph : ref.previousElementSibling === st.ph) return;
  flip(sibs, () => { after ? ref.after(st.ph) : ref.before(st.ph); });
  buzz(4);
}
// siblings glide into their new places instead of jumping
function flip(els, fn) {
  const before = new Map(els.map((el) => [el, el.getBoundingClientRect()]));
  fn();
  if (calm()) return;
  els.forEach((el) => {
    const a = before.get(el), b = el.getBoundingClientRect(); const dx = a.left - b.left, dy = a.top - b.top;
    if (!dx && !dy) return;
    el.style.transition = 'none'; el.style.transform = `translate(${dx}px,${dy}px)`;
    requestAnimationFrame(() => { el.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)'; el.style.transform = ''; setTimeout(() => { el.style.transition = ''; }, 260); });
  });
}
function scrollLoop() {
  if (!st) return;
  const y = st.y, H = innerHeight, edge = 80;
  const v = y < edge + 40 ? -Math.ceil((edge + 40 - y) / 7) : y > H - edge - 30 ? Math.ceil((y - (H - edge - 30)) / 7) : 0;
  if (v && st.c.mode !== 'ghost' || v && st.c.scrolls) { scrollBy(0, v); move(st.x, st.y); }
  requestAnimationFrame(scrollLoop);
}
function drop(cancel) {
  const s = st; st = null; suppressUntil = Date.now() + 450;
  document.body.classList.remove('fuDragging'); setTimeout(() => { if (!st) document.documentElement.style.overflowAnchor = ''; }, 400);
  const { fly, it, c } = s;
  const done = () => {
    fly.classList.remove('fuLift', 'up'); ['position', 'left', 'top', 'width', 'height', 'margin', 'zIndex', 'pointerEvents', 'transform', 'transition', 'boxSizing'].forEach((k) => (fly.style[k] = ''));
  };
  if (c.mode === 'ghost') {
    const t = !cancel && s.target; s.target && s.target.classList.remove('fuDropOn'); it.classList.remove('fuSrc');
    if (t) {
      fly.style.transition = 'transform .28s cubic-bezier(.5,0,.75,0),opacity .28s'; const b = t.getBoundingClientRect(), r = s.r;
      fly.style.transform = `translate3d(${b.left + b.width / 2 - r.left - r.width / 2}px,${b.top + b.height / 2 - r.top - r.height / 2}px,0) scale(.2)`; fly.style.opacity = '0';
      setTimeout(() => fly.remove(), 300); buzz([10, 40, 18]);
      try { c.onTarget(it, t); } catch (e) { console.warn(e); }
    } else {
      fly.style.transition = 'transform .26s cubic-bezier(.2,.8,.2,1),opacity .26s'; fly.style.transform = 'translate3d(0,0,0)'; fly.style.opacity = '.4';
      setTimeout(() => fly.remove(), 280);
    }
    return;
  }
  const ph = s.ph;
  if (!ph.isConnected || !it.isConnected) { ph.remove(); done(); c.onEnd && c.onEnd(it); return; } // the list re-rendered under us — let it be
  const b = ph.getBoundingClientRect();
  fly.classList.remove('up');
  if (calm()) { ph.replaceWith(it); done(); }
  else {
    fly.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)';
    fly.style.transform = `translate3d(${b.left - s.r.left}px,${b.top - s.r.top}px,0)`;
    setTimeout(() => { ph.replaceWith(it); done(); c.onEnd && c.onEnd(it); }, 200);
  }
  if (calm() && c.onEnd) c.onEnd(it);
  const moved = !cancel; if (!moved) return;
  setTimeout(() => {
    const keys = order(s);
    if (keys.join() !== s.before) { buzz(8); try { c.onDrop(keys, s.container); } catch (e) { console.warn(e); } }
  }, calm() ? 0 : 210);
}
// the order as it stands (the placeholder counts as the carried item) — a drop in the same place saves nothing
function order(s) { return [...s.container.children].map((el) => (el === s.ph ? s.it : el)).filter((el) => el.matches(s.c.item) && (!s.c.ok || s.c.ok(el))).map(s.c.key); }
const drag = (cfg) => CFG.push(cfg);
window.FU_drag = drag;

// ======================= saved orders =======================
const shOrders = () => ((F()?.shRow && F().shRow()) || {}).orders || {};
async function saveOrder(k, ids) {
  const cur = shOrders(); const o = { ...cur, [k]: ids.slice(0, 400) };
  try { await F().saveShared({ orders: o }, true); } catch { /* offline queue handles it */ }
}
// put saved keys in order; anything new goes to the end of a list (tail) or stays next to whatever it sat after (Home)
function arrange(container, itemSel, keyOf, order, tail) {
  if (!container || !order || !order.length || st) return;
  const items = [...container.children].filter((el) => el.matches(itemSel)); if (items.length < 2) return;
  const pos = new Map(order.map((k, i) => [k, i]));
  const known = items.filter((el) => pos.has(keyOf(el))).sort((a, b) => pos.get(keyOf(a)) - pos.get(keyOf(b)));
  const out = known.slice();
  items.forEach((el, i) => { if (pos.has(keyOf(el))) return; if (tail) { out.push(el); return; } let j = i - 1; while (j >= 0 && !out.includes(items[j])) j--; const k = j >= 0 ? out.indexOf(items[j]) : -1; out.splice(k + 1, 0, el); });
  if (out.every((el, i) => el === items[i])) return;
  const anchor = items[items.length - 1].nextSibling;
  out.forEach((el) => container.insertBefore(el, anchor));
}
const watched = new Map();
function watch(sel, fn) {
  const el = $(sel); if (!el || watched.has(sel)) return; watched.set(sel, fn);
  new MutationObserver(() => { if (!st) fn(el); }).observe(el, { childList: true });
  fn(el);
}
const reapplyAll = () => watched.forEach((fn, sel) => { const el = $(sel); if (el) fn(el); });

// ======================= 1. Home cards — your own order =======================
const HOME_KEYS = ['#seasonBanner', '#fuTalkHint', '#fuRecapCard', '#fuStatus', '#fuRitual', '#fuThemeQ', '#fuNight', '#fuCheck', '.ping-card', '#fuLove', '#fuOTD', '#cdList', '#homeUpcoming', '#fuSpot', '#homeDist', '#homeBanner', '#daily', '#pingList', '.card.today'];
const homeKey = (el) => { for (const k of HOME_KEYS) if (el.matches(k) || $(k, el)) return k; return el.id ? '#' + el.id : ''; };
const HOME_ITEM = '#tab-home > :not(#homeHi):not(#fuCompactBtn):not(.hidden):not(:empty)';
// v56: one Home order for both of you (shared); an older personal order is only a fallback
const homeOrder = () => { const sh = shOrders().home; if (Array.isArray(sh)) return sh.length ? sh : null; const r = window.FU_myPref && window.FU_myPref(); return r && Array.isArray(r.home_order) ? r.home_order : null; };
drag({
  root: '#tab-home', item: HOME_ITEM, mode: 'move', key: homeKey, delay: 420, grid: () => innerWidth >= 760,
  onBegin: () => $('#tab-home').classList.add('fuSorting'), // every card folds to its title, so a long Home fits under one thumb
  onEnd: (it) => { const t0 = it.getBoundingClientRect().top; $('#tab-home').classList.remove('fuSorting'); scrollBy(0, it.getBoundingClientRect().top - t0); },
  ok: (el) => el.parentElement && el.parentElement.id === 'tab-home' && !!homeKey(el),
  onDrop: async (keys) => {
    const all = [...$('#tab-home').children].map(homeKey).filter(Boolean); // hidden cards keep their place too
    const vis = keys.slice(), set = new Set(keys); const ord = all.map((k) => (set.has(k) ? vis.shift() : k));
    await saveOrder('home', ord); // they see it live (and a little note) — no push for this
    tip('home-done2', 'Saved for both of you ✨ (Settings → Reset Home order)');
  },
});

// ======================= 2. check-ins =======================
drag({ root: '#fuCheck', item: '.ckChips > button[data-ck]', mode: 'move', grid: true, delay: 300, key: (el) => el.dataset.ck, onDrop: (keys) => window.FU_ck && window.FU_ck.reorder(keys) });
drag({ root: '#modalBox', item: '.ckSlots > .ckSlot.on', mode: 'move', grid: true, delay: 220, key: (el) => el.dataset.rm, onDrop: (keys) => window.FU_ck && window.FU_ck.edReorder && window.FU_ck.edReorder(keys) });

// ======================= 3. & 5. shared lists + countdown pin =======================
const LISTS = [
  ['#bkTodo', 'bucket', '.bk[data-oid]'],
  ['#plList', 'playlist', '.bk[data-oid]'],
  ['#goalList', 'goals', '.goal[data-oid]'],
  ['#cdList', 'cd', '.cdItem[data-oid]'],
  ['#wishMineList', () => 'wish:' + me(), '.bk[data-oid]'],
];
const oid = (el) => el.dataset.oid;
LISTS.forEach(([sel, k, item]) => drag({
  root: sel, item: `${sel} > ${item}`, mode: 'move', key: oid,
  onDrop: (keys) => { saveOrder(typeof k === 'function' ? k() : k, keys); if (sel === '#cdList') pinNote(); },
}));
function hookLists() {
  LISTS.forEach(([sel, k, item]) => watch(sel, (el) => arrange(el, item, oid, shOrders()[typeof k === 'function' ? k() : k], true)));
  watch('#wishTheirs', (el) => arrange(el, '.bk[data-oid]', oid, shOrders()['wish:' + them()], true));
}
let pinShown = '';
function pinNote() {
  const first = $('#cdList > .cdItem'); if (!first) return;
  const k = first.dataset.oid; if (pinShown && pinShown !== k) F().toast('📌 Pinned to the top'); pinShown = k;
}

// ======================= 4. drag an emoji onto your love =======================
const FLING = ['💗', '😘', '🤗', '🥺', '🔥', '🌹', '🫶'];
function paintFling() {
  const card = $('.ping-card'); if (!card || !S()?.partner) return;
  let box = $('#fuFling', card);
  const pe = F().partnerEmoji(), pn = F().partnerName();
  if (!box) {
    box = document.createElement('div'); box.id = 'fuFling'; box.className = 'fuFling';
    const hint = $('#pingHint', card); (hint || card.lastElementChild).after(box);
  }
  const sig = pe + pn; if (box.dataset.sig === sig) return; box.dataset.sig = sig;
  box.innerHTML = `<div class="flAv" id="flAv" aria-label="${esc(pn)}"><span>${esc(pe)}</span><small>${esc(pn)}</small></div>
    <div class="flTray">${FLING.map((e) => `<button type="button" class="flEm" data-fl="${e}" aria-label="Send ${e}">${e}</button>`).join('')}</div>
    <p class="muted flHintTx">Hold an emoji and drop it on ${esc(pn)}</p>`;
}
drag({
  root: '#fuFling', item: '.flEm', mode: 'ghost', delay: 140, key: (el) => el.dataset.fl,
  targets: () => [$('#flAv')].filter(Boolean),
  onTarget: async (el, av) => {
    av.classList.remove('got'); void av.offsetWidth; av.classList.add('got');
    setTimeout(() => window.FU_flyPing && window.FU_flyPing(av, el.dataset.fl), 250); // …and off it goes to them
    await F().sendPing(el.dataset.fl);
  },
});
document.addEventListener('click', (e) => { // a tap shows where it goes
  const b = e.target.closest('.flEm'); if (!b) return;
  const av = $('#flAv'); if (!av) return;
  b.classList.remove('nudge'); av.classList.remove('wave'); void b.offsetWidth; b.classList.add('nudge'); av.classList.add('wave');
});

// ======================= 6. photo favourites =======================
const favIds = () => (shOrders().fav_photos || []).filter((id) => (S()?.data?.photos || []).some((p) => p.id === id));
function paintFavs() {
  const g = $('#gallery'); if (!g || !S()?.data) return;
  let strip = $('#phFavs');
  if (!strip) { strip = document.createElement('div'); strip.id = 'phFavs'; strip.className = 'phFavs'; g.before(strip); }
  const ids = favIds(), P = S().data.photos || [];
  const thumb = (id) => { const p = P.find((x) => x.id === id); if (!p) return ''; const vid = /video/.test(p.media_type || '');
    let u = ''; try { u = F().phUrl(p); } catch { /* */ }
    return `<div class="phFav" data-fav="${id}">${vid ? `<video src="${esc(u)}#t=0.1" preload="metadata" muted playsinline></video>` : `<img src="${esc(u)}" alt="" loading="lazy">`}<button type="button" class="phFavX" data-unfav="${id}" aria-label="Remove from favourites">✕</button></div>`; };
  strip.innerHTML = `<p class="phFavH">⭐ Favourites <small>${ids.length ? 'hold to reorder' : `hold a photo and drop it here`}</small></p><div class="phFavRow">${ids.map(thumb).join('') || '<div class="phFavEmpty">⭐</div>'}</div>`;
  $$('#gallery > [data-photo]').forEach((el) => el.classList.toggle('isFav', ids.includes(el.dataset.photo)));
  $$('#gallery > [data-photo] img, #phFavs img').forEach((i) => i.setAttribute('draggable', 'false'));
}
drag({
  root: '#gallery', item: '#gallery > [data-photo]', mode: 'ghost', delay: 380, scrolls: true, key: (el) => el.dataset.photo,
  targets: () => [$('#phFavs')].filter(Boolean),
  onTarget: (el) => {
    const id = el.dataset.photo, ids = favIds(); if (ids.includes(id)) return F().toast('Already a favourite ⭐');
    saveOrder('fav_photos', [id, ...ids]).then(paintFavs); paintFavsOptimistic([id, ...ids]); F().toast('⭐ Added to favourites');
  },
});
drag({ root: '#phFavs', item: '.phFavRow > .phFav', mode: 'move', grid: true, delay: 300, key: (el) => el.dataset.fav, onDrop: (keys) => saveOrder('fav_photos', keys) });
function paintFavsOptimistic(ids) { const r = F().shRow && F().shRow(); if (r) r.orders = { ...(r.orders || {}), fav_photos: ids }; paintFavs(); }
document.addEventListener('click', (e) => {
  const x = e.target.closest('[data-unfav]');
  if (x) { e.stopPropagation(); const ids = favIds().filter((i) => i !== x.dataset.unfav); paintFavsOptimistic(ids); saveOrder('fav_photos', ids); return; }
  const f = e.target.closest('#phFavs [data-fav]'); if (f) { const g = $(`#gallery [data-photo="${f.dataset.fav}"]`); g && g.click(); }
});

// ======================= 7. drop files into chat (computers) =======================
let dz = 0;
const filesIn = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
addEventListener('dragenter', (e) => { if (!filesIn(e) || !document.body.classList.contains('inChat')) return; dz++; document.body.classList.add('chDropOn'); });
addEventListener('dragleave', (e) => { if (!filesIn(e)) return; dz = Math.max(0, dz - 1); if (!dz) document.body.classList.remove('chDropOn'); });
addEventListener('dragover', (e) => { if (filesIn(e)) e.preventDefault(); }); // never let the browser open the file instead
addEventListener('drop', (e) => {
  if (!filesIn(e)) return; e.preventDefault(); dz = 0; document.body.classList.remove('chDropOn');
  if (!document.body.classList.contains('inChat')) return F().toast('Open the chat and drop it there 💬');
  const files = [...e.dataTransfer.files]; if (files.length) F().chHandleFiles(files);
});

// ======================= tips + settings =======================
function tip(k, msg, ms = 4200) { try { if (localStorage.getItem('fu_tip_' + k)) return; localStorage.setItem('fu_tip_' + k, '1'); } catch { return; } F().toast(msg, ms); }
function resetHomeBtn() {
  const anchor = $('#setReduce'); const card = anchor && anchor.closest('.card'); if (!card || $('#fuHomeReset')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'soft'; b.id = 'fuHomeReset'; b.textContent = '↺ Reset Home order';
  b.onclick = async () => { await saveOrder('home', []); if (window.FU_savePref) window.FU_savePref({ home_order: null }); try { window.FU_orderHome && window.FU_orderHome(); pinTop(); } catch { /* */ } F().toast('Home is back to the usual order — for both of you'); };
  card.appendChild(b);
}
function applyHome() { const h = $('#tab-home'); if (!h) return; arrange(h, '*', homeKey, homeOrder()); pinTop(); }
// the greeting, the view toggle and "your week" always lead, whatever order the cards are in
function pinTop() {
  const h = $('#tab-home'); if (!h || st) return;
  const want = ['#homeHi', '#fuCompactBtn', '#fuWeek'].map((s) => $(s, h)).filter((el) => el && el.parentElement === h);
  want.forEach((el, i) => { if (h.children[i] !== el) h.insertBefore(el, h.children[i] || null); });
}
window.FU_pinTop = pinTop;
// when your love rearranges, you hear about it once
let homeSig = null;
function partnerMoved() {
  const r = (F().shRow && F().shRow()) || {}; const sig = JSON.stringify((r.orders || {}).home || null);
  if (homeSig !== null && sig !== homeSig && r.created_by && S() && r.created_by !== me()) F().toast(`${F().partnerName()} rearranged our Home ✨`);
  homeSig = sig;
}

// ======================= boot =======================
let hooked = false;
function hook() {
  const f = F(); if (!f || !f.RENDER) return;
  if (!hooked) {
    hooked = true;
    const R = f.RENDER;
    const wrap = (t, fn) => { const o = R[t]; R[t] = async (...a) => { const r = o ? await o(...a) : undefined; try { fn(); } catch (e) { console.warn(e); } return r; }; };
    wrap('couple_settings', () => { reapplyAll(); paintFavs(); partnerMoved(); });
    wrap('photos', paintFavs);
    wrap('pings', paintFling);
    watch('#tab-home', applyHome);
  }
  hookLists(); paintFling(); paintFavs(); resetHomeBtn(); applyHome();
}
const prevEnter = window.FU_enter;
window.FU_enter = async (...a) => { const p = prevEnter ? prevEnter(...a) : undefined; try { return await p; } finally { hook(); setTimeout(() => { hook(); if (!$('#tab-home').classList.contains('hidden')) tip('home', 'Tip: hold any card to move it ✋', 4200); }, 1200); } };
document.addEventListener('cc:theme', () => { const b = $('#fuFling'); if (b) b.dataset.sig = ''; paintFling(); });
if (document.readyState !== 'loading') setTimeout(hook, 0); else document.addEventListener('DOMContentLoaded', hook);
})();
