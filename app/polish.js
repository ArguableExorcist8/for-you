// For Us v26 — layout polish & feel: home order, tidy settings, quieter empty states,
// collapsible creators, shorter ping history, pull-to-refresh.
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const F = () => window.__FU;
const motion = () => !(matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('cc_reduce_motion') === '1');

// ---------- left ornaments: give titles room on themes that draw one ----------
function markOrnament() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--skOL').trim();
  document.documentElement.dataset.orl = v && v !== 'none' && v !== "''" && v !== '""' ? '1' : '0';
}
document.addEventListener('cc:theme', () => setTimeout(markOrnament, 50));

// ---------- collapsible block helper ----------
function collapsible(card, head, body, open) {
  const wrap = document.createElement('div'); wrap.className = 'accBody'; const inner = document.createElement('div'); inner.className = 'accIn';
  body.forEach((n) => inner.appendChild(n)); wrap.appendChild(inner); head.after(wrap);
  card.classList.add('acc'); card.classList.toggle('open', !!open);
  return wrap;
}

// ---------- settings: a tidy list of tap-to-open rows ----------
function tidySettings() {
  const tab = $('#tab-me'); if (!tab) return;
  $$(':scope > .card', tab).forEach((card, i) => {
    if (i === 0 || card.dataset.tidy) return; card.dataset.tidy = '1'; // profile stays open
    const h = $(':scope > h2', card); if (!h) return;
    const rest = [...card.childNodes].filter((n) => n !== h);
    if (!rest.some((n) => n.nodeType === 1)) return;
    h.classList.add('accHead'); h.setAttribute('role', 'button'); h.tabIndex = 0;
    h.insertAdjacentHTML('beforeend', '<i class="accChev" aria-hidden="true"></i>');
    collapsible(card, h, rest, false);
    const toggle = () => { card.classList.toggle('open'); if (card.classList.contains('open') && motion()) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 260); };
    h.addEventListener('click', toggle); h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

// ---------- notes: forms open behind a button ----------
function tidyNotes() {
  const tab = $('#tab-notes'); if (!tab || tab.dataset.tidy) return; tab.dataset.tidy = '1';
  const make = (anchorId, label) => {
    const a = document.getElementById(anchorId); const card = a && a.closest('.card'); if (!card) return;
    const h = $(':scope > h2', card); const rest = [...card.childNodes].filter((n) => n !== h && !(n.nodeType === 1 && n.id === 'letterStatus'));
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'soft accToggle'; btn.textContent = label;
    h.after(btn); collapsible(card, btn, rest, false);
    btn.onclick = () => { card.classList.toggle('open'); btn.textContent = card.classList.contains('open') ? 'Close' : label; if (card.classList.contains('open')) setTimeout(() => card.querySelector('input,textarea')?.focus({ preventScroll: true }), 280); };
  };
  make('cpTitle', '＋ Give a coupon'); make('letterTxt', '✍️ Write a secret letter');
}

// ---------- quiet empty states ----------
const EMPTY_SEL = 'button, .coupon, .row, img, video, .moment, input, textarea, .cd, .countdown, .ans';
function watchQuiet(id) {
  const el = document.getElementById(id); if (!el || el.dataset.quietWatch) return; const card = el.closest('.card'); if (!card) return; el.dataset.quietWatch = '1';
  const upd = () => { const empty = !el.querySelector(EMPTY_SEL) && el.textContent.trim().length < 90; card.classList.toggle('quiet', empty); };
  new MutationObserver(upd).observe(el, { childList: true, subtree: true, characterData: true }); upd();
}

// ---------- ping history: last 3, then "show all" ----------
function tidyPings() {
  const list = $('#pingList'); if (!list || list.dataset.tidy) return; list.dataset.tidy = '1';
  const more = document.createElement('button'); more.type = 'button'; more.className = 'soft mini pingMore'; list.after(more);
  const upd = () => { const n = list.children.length; more.classList.toggle('hidden', n <= 3); more.textContent = list.classList.contains('all') ? 'Show less' : `Show all ${n}`; };
  more.onclick = () => { list.classList.toggle('all'); upd(); };
  new MutationObserver(upd).observe(list, { childList: true }); upd();
}

// ---------- home: what matters first ----------
function orderHome() {
  const home = $('#tab-home'); if (!home) return;
  const card = (sel) => { const el = $(sel, home); return el && (el.classList.contains('card') ? el : el.closest('.card')) || el; };
  const order = ['#seasonBanner', '#homeHi', '#fuStatus', '#fuRitual', '#fuNight', '.ping-card', '#fuLove', '#fuOTD', '#cdList', '#homeUpcoming', '#fuSpot', '#homeDist', '#homeBanner', '#daily', '#pingList', '.card.today'];
  order.map(card).filter(Boolean).forEach((el) => home.appendChild(el));
}

// ---------- pull to refresh ----------
function pullToRefresh() {
  const ind = document.createElement('div'); ind.className = 'ptr'; ind.innerHTML = '<span>💗</span>'; document.body.appendChild(ind);
  let y0 = null, dy = 0, busy = false;
  const blocked = (t) => document.body.classList.contains('inChat') || !$('#mainView') || $('#mainView').classList.contains('hidden') || t.closest('.modal,.uiDlg,.fuBreath,.fuTouchIn,input,textarea,select,.fuPad,#game,#sky,#draw,.scratch');
  addEventListener('touchstart', (e) => { if (busy || window.scrollY > 0 || e.touches.length > 1 || blocked(e.target)) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (y0 === null) return; dy = e.touches[0].clientY - y0;
    if (dy <= 0 || window.scrollY > 0) { ind.style.transform = ''; ind.classList.remove('on', 'ready'); return; }
    const p = Math.min(1, dy / 140); ind.classList.add('on'); ind.classList.toggle('ready', p >= 1);
    ind.style.transform = `translate(-50%, ${Math.min(90, dy * 0.55)}px) rotate(${p * 200}deg) scale(${0.6 + p * 0.4})`; ind.style.opacity = String(Math.min(1, p * 1.4));
  }, { passive: true });
  addEventListener('touchend', async () => {
    if (y0 === null) return; y0 = null;
    if (dy < 140) { ind.style.transform = ''; ind.style.opacity = ''; ind.classList.remove('on', 'ready'); return; }
    busy = true; ind.classList.add('spin'); ind.style.transform = 'translate(-50%, 60px)'; if (navigator.vibrate) navigator.vibrate(10);
    const t0 = Date.now();
    try {
      const f = F();
      if (f && f.S.couple) {
        const work = Promise.all(Object.keys(f.TABLES).map((t) => f.loadTable(t))).then(() => { f.refreshProgress(); window.FU_resume && window.FU_resume(); });
        await Promise.race([work, new Promise((r) => setTimeout(r, 8000))]); // never spin forever on a dead connection
      }
    } catch (e) { /* offline: the cache stays */ }
    await new Promise((r) => setTimeout(r, Math.max(0, 700 - (Date.now() - t0))));
    ind.classList.remove('spin', 'on', 'ready'); ind.style.transform = ''; ind.style.opacity = ''; busy = false;
  });
}

// ---------- boot ----------
function run() {
  markOrnament(); tidySettings(); tidyNotes(); tidyPings(); orderHome();
  ['cpMine', 'cpGiven', 'letterIn', 'homeUpcoming'].forEach(watchQuiet);
}
const prevEnter = window.FU_enter;
window.FU_enter = async (...a) => { const p = prevEnter ? prevEnter(...a) : undefined; run(); try { return await p; } finally { run(); } }; // tidy at once, again when data lands
if (document.readyState !== 'loading') { markOrnament(); tidySettings(); tidyNotes(); tidyPings(); } else document.addEventListener('DOMContentLoaded', run);
pullToRefresh();
})();
