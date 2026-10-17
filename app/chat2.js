// For Us v54 — chat, upgraded
// keyboard-synced composer · paper-plane send · land where you left off + "new" divider · bubbles nudge up
// themed older-messages loader · bigger emoji · link previews · drag left for times · tapbacks above the bubble
// "seen" avatar · word effects · send with effect · invisible ink · typing that feels alive · tilt shimmer
(() => {
'use strict';
const F = () => window.__FU;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = () => F() && F().S;
const CH = () => (F() && F().CH) || { list: [], byId: {} };
const me = () => S()?.user?.id;
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } };
const root = document.documentElement;
const lively = () => { try { return (F().motionOn ? F().motionOn() : true) && !root.classList.contains('fuLow'); } catch { return true; } };
const themeEm = () => { try { return (window.FU_P && window.FU_P.em && window.FU_P.em()) || '💗'; } catch { return '💗'; } };
const inChat = () => document.body.classList.contains('inChat');
const tap = (p = [8]) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* */ } };

// ======================= 1. composer rides up with the keyboard =======================
// iPhone tells us the keyboard size only when it's finished opening; we remember it and glide there straight away
function kbSync() {
  const t = $('#chTxt'); if (!t || t.dataset.fuKb) return; t.dataset.fuKb = '1';
  const vv = window.visualViewport;
  const remember = () => { if (!vv) return; const h = innerHeight - vv.height; if (h > 160 && h < innerHeight * .6) LS('fu_kbH', String(Math.round(h))); };
  vv && vv.addEventListener('resize', remember);
  const glide = (on) => {
    const app = $('#chatApp'); if (!app || !lively()) return;
    app.classList.add('fuKbGlide'); clearTimeout(glide.t); glide.t = setTimeout(() => app.classList.remove('fuKbGlide'), 520);
    const kb = +LS('fu_kbH') || 0;
    if (on && kb) { const top = parseFloat(app.style.top) || 0; app.style.height = Math.max(160, innerHeight - kb - top) + 'px'; const l = $('#chatList'); if (l && l.scrollHeight - l.scrollTop - l.clientHeight < 160) requestAnimationFrame(() => { l.scrollTop = l.scrollHeight; }); }
  };
  t.addEventListener('focus', () => glide(true)); t.addEventListener('blur', () => glide(false));
}

// ======================= 2. send: a paper plane takes off =======================
function sendMorph() {
  const b = $('#chSend'); if (!b || b.dataset.fuSm) return; b.dataset.fuSm = '1';
  const fly = () => {
    if (!lively()) return; const r = b.getBoundingClientRect();
    const p = document.createElement('div'); p.className = 'fuPlane'; p.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4.2 19.6 20.4 12 4.2 4.4l1.9 6.4 7.4 1.2-7.4 1.2z"/></svg>';
    p.style.left = r.left + r.width / 2 + 'px'; p.style.top = r.top + r.height / 2 + 'px'; document.body.appendChild(p);
    b.classList.remove('fuLaunch'); void b.offsetWidth; b.classList.add('fuLaunch'); setTimeout(() => { p.remove(); b.classList.remove('fuLaunch'); }, 760);
  };
  b.addEventListener('pointerdown', () => { b.__had = !!$('#chTxt').value.trim(); }, true);
  b.addEventListener('click', () => { if (b.__had && !b.__fx) fly(); }, true);
  $('#chTxt').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window) && $('#chTxt').value.trim()) fly(); }, true);
}

// ======================= 3. land where you left off, with a "new messages" line =======================
let leftAt = null;
function smartScroll() {
  let was = inChat();
  new MutationObserver(() => {
    const now = inChat(); if (now === was) return; was = now; const list = $('#chatList'); if (!list) return;
    if (!now) { const fromBottom = list.scrollHeight - list.scrollTop - list.clientHeight; leftAt = fromBottom > 240 ? { id: firstVisibleId(list), t: Date.now() } : null; $$('.chU.fuNewHere').forEach((n) => n.classList.remove('fuNewHere')); return; }
    const first = CH().list.find((m) => m.sender !== me() && !m.read_at && !m.deleted);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (first) {
        const u = $(`.chU[data-u="${first.id}"]`); if (!u) return;
        const n = CH().list.filter((m) => m.sender !== me() && !m.read_at && !m.deleted).length; u.dataset.newN = n === 1 ? '1 new message' : `${n} new messages`; u.classList.add('fuNewHere');
        if (u.offsetTop < list.scrollHeight - list.clientHeight) list.scrollTop = Math.max(0, u.offsetTop - 70);
        setTimeout(() => u.classList.remove('fuNewHere'), 90 * 1000);
      } else if (leftAt && Date.now() - leftAt.t < 15 * 60e3) {
        const r = $(`.chRow[data-id="${leftAt.id}"]`); if (r) list.scrollTop = Math.max(0, r.closest('.chU').offsetTop - 60);
      }
    }));
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
const firstVisibleId = (list) => { const top = list.getBoundingClientRect().top; const r = $$('.chRow[data-id]', list).find((x) => x.getBoundingClientRect().bottom > top + 10); return r && r.dataset.id; };

// ======================= 4. bubbles nudge up · 5. older messages fade in =======================
const seen = new Set(); let seeded = false;
function watchRows() {
  const box = $('#chMsgs'); if (!box || box.dataset.fuRows) return; box.dataset.fuRows = '1';
  const scan = () => {
    const rows = $$(':scope > .chU', box); const fresh = rows.filter((u) => !seen.has(u.dataset.u)); fresh.forEach((u) => seen.add(u.dataset.u));
    if (!seeded) { seeded = rows.length > 0; afterRender(); return; }
    if (fresh.length && lively()) {
      const idx = rows.indexOf(fresh[0]);
      if (fresh.length > 3 && idx === 0) fresh.forEach((u, i) => { u.style.setProperty('--d', Math.min(i, 12) * 22 + 'ms'); u.classList.remove('fuOlder'); void u.offsetWidth; u.classList.add('fuOlder'); setTimeout(() => u.classList.remove('fuOlder'), 900); });
      else if (fresh.length <= 3 && idx === rows.length - fresh.length) rows.slice(Math.max(0, idx - 6), idx).forEach((u, i, a) => { u.style.setProperty('--d', (a.length - i) * 18 + 'ms'); u.classList.remove('fuNudge'); void u.offsetWidth; u.classList.add('fuNudge'); setTimeout(() => u.classList.remove('fuNudge'), 700); });
      fresh.forEach((u) => playFx(u));
    }
    afterRender();
  };
  new MutationObserver(scan).observe(box, { childList: true }); scan();
  new MutationObserver(() => afterRender()).observe(box, { childList: true, subtree: true, characterData: false });
}
const loaderTop = () => { const t = $('#chTop .chLoadMore'); if (t && !t.dataset.fuL) { t.dataset.fuL = '1'; const e = themeEm(); t.innerHTML = `<span class="ldDots"><i>${e}</i><i>${e}</i><i>${e}</i></span><small>older memories…</small>`; } };

// ======================= after every render: previews · seen avatar · times · ink =======================
let arT = 0;
function afterRender() { clearTimeout(arT); arT = setTimeout(() => { try { loaderTop(); linkPreviews(); seenAvatar(); stampTimes(); inkWire(); } catch (e) { console.warn(e); } }, 40); }

// ---------- 7. link previews ----------
const LP = (() => { try { return JSON.parse(LS('fu_lp') || '{}'); } catch { return {}; } })(); const lpBusy = new Set();
const lpSave = () => { const k = Object.keys(LP); if (k.length > 120) k.slice(0, k.length - 120).forEach((x) => delete LP[x]); LS('fu_lp', JSON.stringify(LP)); };
function linkPreviews() {
  $$('#chMsgs .chRow .chB:not(.ink) .chTxt a[href]').forEach((a) => {
    const b = a.closest('.chB'); if (!b || $('.chLink', b)) return; const url = a.href; if (!/^https?:/.test(url)) return;
    const d = LP[url]; if (d && !(d.error && Date.now() - (d.t || 0) > 6 * 3600e3)) { if (!d.error && (d.title || d.image)) card(b, d); return; } // failures retry after a while
    if (lpBusy.has(url) || !navigator.onLine) return; lpBusy.add(url);
    F().sb.functions.invoke('linkprev', { body: { url } }).then(({ data, error }) => {
      LP[url] = error || !data ? { error: true, t: Date.now() } : data; lpSave(); lpBusy.delete(url); afterRender();
    }).catch(() => lpBusy.delete(url));
  });
}
function card(b, d) {
  const c = document.createElement('a'); c.className = 'chLink'; c.href = d.url; c.target = '_blank'; c.rel = 'noopener noreferrer';
  c.innerHTML = `${d.image ? `<span class="clImg"><img src="${esc(d.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>` : ''}<span class="clTx"><b>${esc(d.title || d.site)}</b>${d.desc ? `<small>${esc(d.desc)}</small>` : ''}<i>${esc(d.site || '')}</i></span>`;
  const meta = $('.chMeta', b); meta ? b.insertBefore(c, meta) : b.appendChild(c);
}

// ---------- 10. a tiny "seen" avatar under the last message they've read ----------
let seenAt = null;
function seenAvatar() {
  const reads = $$('#chMsgs .chRow.me .tk.read'); const last = reads[reads.length - 1]; const row = last && last.closest('.chRow');
  const cur = $('#chMsgs .fuSeen');
  if (!row) { cur && cur.remove(); seenAt = null; return; }
  if (cur && cur.parentElement === row) return;
  const moved = !!seenAt && seenAt !== row.dataset.id; cur && cur.remove();
  const s = document.createElement('span'); s.className = 'fuSeen' + (moved && lively() ? ' slide' : ''); s.textContent = F().partnerEmoji ? F().partnerEmoji() : '💗'; s.title = 'Seen';
  row.appendChild(s); seenAt = row.dataset.id;
}

// ---------- 8. drag the chat left to see exact times ----------
function stampTimes() {
  $$('#chMsgs .chRow[data-id]:not([data-t])').forEach((r) => {
    const m = CH().byId[r.dataset.id]; if (!m) return; const d = new Date(m.created_at);
    r.dataset.t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); r.dataset.d = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  });
}
let tl = null;
function timesDrag() {
  const box = $('#chMsgs'); if (!box || box.dataset.fuTd) return; box.dataset.fuTd = '1';
  box.addEventListener('pointerdown', (e) => { if (e.button > 0 || e.clientX < 22) return; tl = { x: e.clientX, y: e.clientY, on: false, id: e.pointerId }; }, true);
  box.addEventListener('pointermove', (e) => {
    if (!tl || e.pointerId !== tl.id) return; const dx = e.clientX - tl.x, dy = e.clientY - tl.y;
    if (!tl.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { tl = null; return; }
      if (dx < -12 && -dx > Math.abs(dy) * 1.4) { tl.on = true; box.classList.add('fuTimes'); box.dispatchEvent(new PointerEvent('pointercancel', { pointerId: e.pointerId, bubbles: true })); }
      else return;
    }
    const x = Math.max(-72, dx + 12); box.style.setProperty('--tdx', x + 'px'); box.style.setProperty('--tp', String(Math.min(1, -x / 60)));
  }, true);
  const end = () => { if (!tl) return; const on = tl.on; tl = null; if (!on) return; box.classList.add('fuTimesBack'); box.style.setProperty('--tdx', '0px'); box.style.setProperty('--tp', '0'); setTimeout(() => box.classList.remove('fuTimes', 'fuTimesBack'), 320); };
  box.addEventListener('pointerup', end, true); box.addEventListener('pointercancel', (e) => { if (tl && tl.on && e.isTrusted) end(); }, true);
}

// ======================= 9. tapbacks: reactions float right above the bubble =======================
function tapbacks() {
  const menu = $('#chMenu'); if (!menu || menu.dataset.fuTb) return; menu.dataset.fuTb = '1';
  new MutationObserver(() => {
    const box = $('.chMenuBox', menu); if (!box) return;
    $$('.chMenuPeek', box).forEach((p) => p.remove()); box.classList.remove('fuAnch'); box.style.cssText = '';
    if (menu.classList.contains('hidden')) return;
    const row = $('.chRow.lp'); const b = row && $('.chB', row); if (!b) return;
    const r = b.getBoundingClientRect(); const mine = row.classList.contains('me');
    const peek = b.cloneNode(true); peek.classList.add('chMenuPeek'); peek.classList.remove('ink'); peek.style.width = r.width + 'px';
    // the menu lives outside the chat, so carry the bubble's own look across
    const copy = (src, dst, keys) => { if (!src || !dst) return; const cs = getComputedStyle(src); keys.forEach((k) => { dst.style[k] = cs[k]; }); };
    copy(b, peek, ['backgroundColor', 'backgroundImage', 'color', 'borderRadius', 'padding', 'border', 'fontFamily']); peek.style.textAlign = 'left';
    $$('.chLink,.inkDust,.fuSeen', peek).forEach((x) => x.remove());
    [['.chTxt', ['fontSize', 'lineHeight', 'color', 'whiteSpace']], ['.chMeta', ['fontSize', 'color', 'textAlign', 'opacity']], ['.chQuote', ['backgroundColor', 'borderLeft', 'borderRadius', 'padding', 'fontSize', 'color']]].forEach(([sel, keys]) => copy($(sel, b), $(sel, peek), keys));
    const pm = $('.chMeta', peek); if (pm) { pm.style.display = 'block'; pm.style.marginTop = '2px'; }
    const acts = $('#chActs', box); box.insertBefore(peek, acts);
    box.classList.add('fuAnch', mine ? 'me' : 'them'); box.classList.toggle('me', mine); box.classList.toggle('them', !mine);
    const rx = $('#chReacts', box), H = innerHeight, pad = 12;
    const rxH = rx.offsetHeight + 8, actH = acts.offsetHeight + 8, pkH = peek.offsetHeight;
    let top = r.top - rxH; top = Math.min(top, H - pad - (rxH + pkH + actH) - 10); top = Math.max(pad + 40, top);
    box.style.top = top + 'px';
    if (mine) box.style.right = Math.max(8, innerWidth - r.right) + 'px'; else box.style.left = Math.max(8, r.left) + 'px';
  }).observe(menu, { attributes: true, attributeFilter: ['class'] });
}

// ======================= 11. word effects · 12. send with effect =======================
const WORDS = [
  [/\b(i\s*)?love (you|u)\b|\bily\b|\bluv u\b|بحبك|احبك/i, 'love'],
  [/\bmiss(ing)? (you|u)\b|وحشتني|وحشتيني/i, 'miss'],
  [/happy (birthday|bday)|\bhbd\b|عيد ميلاد سعيد/i, 'bday'],
  [/\bgood ?night\b|\bgn\b|sweet dreams|تصبح على خير|تصبحي على خير/i, 'night'],
  [/\bcongrat(s|ulations)\b|\bmabrouk\b|مبروك/i, 'yay'],
];
const played = new Set((() => { try { return JSON.parse(sessionStorage.getItem('fu_fxp') || '[]'); } catch { return []; } })());
const markPlayed = (id) => { played.add(id); try { sessionStorage.setItem('fu_fxp', JSON.stringify([...played].slice(-80))); } catch { /* */ } };
function playFx(u) {
  const row = $('.chRow', u); if (!row || !inChat() || document.hidden) return; const id = row.dataset.id; if (played.has(id)) return;
  const m = CH().byId[id]; if (!m || m.deleted || Date.now() - new Date(m.created_at) > 120e3) return;
  const b = $('.chB', row);
  if (m.meta && m.meta.fx) { markPlayed(id); sendFxPlay(m.meta.fx, b); return; }
  if (m.kind !== 'text') return; const txt = (m._pt != null ? m._pt : m.body) || '';
  const hit = WORDS.find(([re]) => re.test(txt)); if (!hit) return; markPlayed(id); wordFx(hit[1]);
}
function rain(set, n = 26, dur = 2600) {
  if (!lively()) return; const box = document.createElement('div'); box.className = 'fuRain'; document.body.appendChild(box);
  for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.textContent = set[i % set.length]; s.style.left = Math.random() * 100 + 'vw'; s.style.fontSize = 18 + Math.random() * 20 + 'px'; s.style.animationDelay = Math.random() * 900 + 'ms'; s.style.animationDuration = dur * (0.75 + Math.random() * 0.5) + 'ms'; box.appendChild(s); }
  setTimeout(() => box.remove(), dur + 1600);
}
function wordFx(k) {
  if (!lively()) return;
  if (k === 'love') { rain(['💗', '💕', '💖', '❤️', '💘'], 30); tap([12, 60, 12]); }
  else if (k === 'miss') { rain(['🥺', '💭', '🫂', '💗'], 18, 3200); }
  else if (k === 'bday') { try { F().confetti(90); } catch { /* */ } rain(['🎂', '🎈', '🎉', '🎁'], 22); }
  else if (k === 'night') { const o = document.createElement('div'); o.className = 'fuNightFx'; o.innerHTML = '<b>🌙</b>' + Array.from({ length: 16 }, () => `<s style="left:${Math.random() * 100}%;top:${Math.random() * 70}%;animation-delay:${Math.random() * 1.2}s">✦</s>`).join(''); document.body.appendChild(o); setTimeout(() => o.remove(), 3400); }
  else if (k === 'yay') { try { F().confetti(70); } catch { /* */ } }
}
const FXES = [['slam', '💥', 'Slam'], ['gentle', '🪶', 'Gentle'], ['loud', '📣', 'Loud'], ['hearts', '💗', 'Hearts'], ['fireworks', '🎆', 'Fireworks'], ['ink', '✨', 'Invisible ink']];
function sendFxPlay(fx, b) {
  if (!lively() || !b) return;
  b.classList.remove('fxGo'); void b.offsetWidth; b.classList.add('fxGo');
  if (fx === 'slam') { const l = $('#chatList'); l && (l.classList.remove('fuShake'), void l.offsetWidth, l.classList.add('fuShake')); setTimeout(() => tap([30]), 380); }
  else if (fx === 'hearts') { const r = b.getBoundingClientRect(); window.FX && FX.burst(r.left + r.width / 2, r.top + r.height / 2, ['💗', '💕', '💖', '💘'], 22, 130); }
  else if (fx === 'fireworks') { const o = document.createElement('div'); o.className = 'fuDim'; document.body.appendChild(o); setTimeout(() => o.remove(), 2600); window.FX && FX.fireworks(6); }
}
function sendFxPicker() {
  const b = $('#chSend'); if (!b || b.dataset.fuFx) return; b.dataset.fuFx = '1';
  let t = 0;
  b.addEventListener('pointerdown', () => { clearTimeout(t); if (!$('#chTxt').value.trim()) return; t = setTimeout(() => { b.__fx = true; openPicker(); }, 420); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((k) => b.addEventListener(k, () => clearTimeout(t)));
  b.addEventListener('click', (e) => { if (b.__fx) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
function openPicker() {
  tap([10]);
  const o = document.createElement('div'); o.className = 'fuFxPick';
  const txt = $('#chTxt').value.trim();
  o.innerHTML = `<div class="fxpBox"><p>Send with effect</p><div class="fxpPrev"><span>${esc(txt.slice(0, 120))}</span></div>${FXES.map(([k, e, l]) => `<button type="button" data-fx="${k}"><i>${e}</i>${l}</button>`).join('')}<button type="button" class="fxpX">Cancel</button></div>`;
  document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('on'));
  const close = () => { o.classList.remove('on'); setTimeout(() => o.remove(), 250); setTimeout(() => { $('#chSend').__fx = false; }, 300); };
  o.addEventListener('click', (e) => {
    const k = e.target.closest('[data-fx]'); if (!k) { if (e.target === o || e.target.closest('.fxpX')) close(); return; }
    const fx = k.dataset.fx; const text = $('#chTxt').value.trim(); if (!text) return close();
    $('#chTxt').value = ''; $('#chTxt').dispatchEvent(new Event('input', { bubbles: true }));
    const meta = fx === 'ink' ? { ink: true } : { fx };
    F().chSendTextFx(text, meta); close();
  });
}

// ======================= 13. invisible ink: rub to read =======================
const inkSeen = new Set((() => { try { return JSON.parse(sessionStorage.getItem('fu_ink') || '[]'); } catch { return []; } })());
window.FU_inkSeen = inkSeen;
function inkWire() {
  $$('#chMsgs .chB.ink:not([data-ink])').forEach((b) => {
    b.dataset.ink = '1'; if (!$('.inkDust', b)) b.insertAdjacentHTML('beforeend', `<span class="inkDust" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--y:${(i * 53) % 100}%;--d:${(i % 7) * .25}s"></i>`).join('')}</span>`);
    let rub = 0, lx = null, ly = null;
    const mv = (e) => { const p = e.touches ? e.touches[0] : e; if (lx != null) rub += Math.hypot(p.clientX - lx, p.clientY - ly); lx = p.clientX; ly = p.clientY; b.style.setProperty('--rub', String(Math.min(1, rub / 260))); if (rub > 260) reveal(); };
    const reveal = () => { const row = b.closest('.chRow'); if (!row) return; inkSeen.add(row.dataset.id); try { sessionStorage.setItem('fu_ink', JSON.stringify([...inkSeen].slice(-80))); } catch { /* */ } b.classList.add('inkOff'); tap([8]); setTimeout(() => F().chRender(), 650); };
    b.addEventListener('touchmove', mv, { passive: true }); b.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && e.buttons) mv(e); });
    b.addEventListener('touchend', () => { lx = ly = null; }); b.addEventListener('dblclick', reveal);
  });
}

// ======================= 14. typing that feels alive =======================
function typingAlive() {
  const ty = $('#chTyping'); if (!ty || ty.dataset.fuA) return; ty.dataset.fuA = '1'; let t0 = 0, iv = 0;
  let was = null;
  new MutationObserver(() => {
    const on = !ty.classList.contains('hidden'); if (on === was) return; was = on; // only react to show/hide, never to our own class changes
    clearInterval(iv); if (ty.classList.contains('t2') || ty.classList.contains('t3')) ty.classList.remove('t2', 't3');
    if (!on) return; t0 = Date.now();
    iv = setInterval(() => { const s = (Date.now() - t0) / 1000, a = s > 4 && s <= 10, c = s > 10; if (ty.classList.contains('t2') !== a) ty.classList.toggle('t2', a); if (ty.classList.contains('t3') !== c) ty.classList.toggle('t3', c); }, 500);
  }).observe(ty, { attributes: true, attributeFilter: ['class'] });
}

// ======================= boot =======================
function hook() {
  if (!F() || !$('#chatApp')) return;
  kbSync(); sendMorph(); sendFxPicker(); watchRows(); timesDrag(); tapbacks(); typingAlive(); afterRender();
}
smartScroll();
const prevEnter = window.FU_enter;
window.FU_enter = async (...a) => { const p = prevEnter ? prevEnter(...a) : undefined; try { return await p; } finally { hook(); setTimeout(hook, 1500); } };
if (document.readyState !== 'loading') setTimeout(hook, 0); else document.addEventListener('DOMContentLoaded', hook);
window.FU_chat2 = { wordFx, sendFxPlay, openPicker, afterRender };
})();
