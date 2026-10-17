// For Us v49 — features + animation pack
// streak · voice ping · plan a date · your week · chat search · Home that follows the day · friendly empty lists · swipe actions
// grouped Settings · matched haptics · together glow · offline chip · low battery mode
// ping flight · send bounce · online breath · check-in flip · count-ups · wave bars · themed pull-to-refresh · tab icons
// milestone burst · shake to hug · sleepy pet
(() => {
'use strict';
const F = () => window.__FU;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = () => F() && F().S;
const me = () => S()?.user?.id, them = () => S()?.partner?.id;
const pn = () => (F() && F().partnerName && F().partnerName()) || 'your love';
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } };
const motion = () => { try { return F().motionOn ? F().motionOn() : true; } catch { return true; } } ;
const low = () => document.documentElement.classList.contains('fuLow');
const lively = () => motion() && !low();
const themeEm = () => { try { return (window.FU_P && window.FU_P.em && window.FU_P.em()) || '💗'; } catch { return '💗'; } };
const confEm = () => { try { const c = window.FU_P && window.FU_P.confettiEm && window.FU_P.confettiEm(); return Array.isArray(c) && c.length ? c : ['💖', '✨', '💕']; } catch { return ['💖', '✨', '💕']; } };
const dayStr = (d = new Date()) => { try { return F().dayStr(d); } catch { return d.toISOString().slice(0, 10); } };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ======================= F11 matched haptics =======================
const HAP = { tap: [6], sent: [12], got: [18, 60, 18], done: [8, 40, 8, 40, 22], error: [45, 35, 45], hug: [30, 50, 30, 50, 60] };
const haptic = (k) => { try { if (LS('cc_reduce_motion') === '1' && k === 'tap') return; navigator.vibrate && navigator.vibrate(HAP[k] || HAP.tap); } catch { /* */ } };
window.FU_haptic = haptic;
function watchToast() { // every toast already says what happened — let the phone say it too
  const t = $('#toast'); if (!t || t.dataset.fuHap) return; t.dataset.fuHap = '1';
  let last = '';
  new MutationObserver(() => {
    const s = t.textContent || ''; if (!s || s === last) return; last = s; setTimeout(() => { last = ''; }, 1500);
    if (/couldn|failed|error|⚠️|needs internet|not supported|too big|permission|try again/i.test(s)) haptic('error');
    else if (/sent|ping/i.test(s)) haptic('sent');
    else if (/saved|added|done|✓|🎉|pinned|deleted|removed/i.test(s)) haptic('done');
  }).observe(t, { childList: true, characterData: true, subtree: true });
}

// ======================= F2 ping streak =======================
let pingDays = null;
async function loadPingStreak() {
  if (!S()?.couple) return;
  const since = new Date(Date.now() - 120 * 864e5).toISOString();
  try {
    const { data, error } = await F().sb.from('pings').select('created_at,created_by').eq('couple_id', S().couple.id).gte('created_at', since).limit(3000);
    if (error) return;
    const byDay = new Map(); (data || []).forEach((p) => { const d = dayStr(new Date(p.created_at)); if (!byDay.has(d)) byDay.set(d, new Set()); byDay.get(d).add(p.created_by); });
    pingDays = byDay; paintPingStreak();
  } catch { /* offline */ }
}
function pingStreakN() {
  if (!pingDays) return null;
  const both = (d) => { const s = pingDays.get(d); return s && s.has(me()) && s.has(them()); };
  const d = new Date(); let n = 0; const today = dayStr(d);
  if (!both(today)) d.setDate(d.getDate() - 1); // today isn't over yet
  for (let i = 0; i < 120; i++) { if (!both(dayStr(d))) break; n++; d.setDate(d.getDate() - 1); }
  return { n, today: both(today), mine: !!pingDays.get(today)?.has(me()), theirs: !!pingDays.get(today)?.has(them()) };
}
function paintPingStreak() {
  const card = $('.ping-card'); const r = pingStreakN(); if (!card || !r) return;
  let el = $('#fuPStreak', card); if (!el) { el = document.createElement('div'); el.id = 'fuPStreak'; el.className = 'fuPStreak'; const h = $('#pingHint', card); (h || card.firstElementChild).after(el); }
  const hot = r.n >= 3;
  const sub = r.today ? 'you both thought of each other today 💞' : r.mine ? `waiting for ${esc(pn())} today…` : r.theirs ? `${esc(pn())} pinged — your turn to keep it going` : 'ping each other today to keep it alive';
  el.innerHTML = `<b class="${hot ? 'hot' : ''}"><i>🔥</i><span class="fuNum" data-k="pstreak">${r.n}</span> day${r.n === 1 ? '' : 's'}</b><small>${sub}</small>`;
  el.classList.toggle('cold', !r.n); countUps(el);
}

// ======================= F3 voice ping (hold the heart) =======================
const VP = { t: null, rec: null, stream: null, chunks: [], on: false, used: false, t0: 0, wave: [], raf: 0, an: null, ac: null };
function voicePing() {
  const btn = $('#pingBtn'); if (!btn || btn.dataset.fuVp) return; btn.dataset.fuVp = '1';
  btn.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return; VP.used = false;
    VP.t = setTimeout(() => vpStart(btn), 450);
  });
  const end = (send) => { clearTimeout(VP.t); if (VP.on) vpStop(btn, send); };
  btn.addEventListener('pointerup', () => end(true)); btn.addEventListener('pointerleave', () => end(true)); btn.addEventListener('pointercancel', () => end(false));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('click', (e) => { if (VP.used) { e.stopImmediatePropagation(); e.preventDefault(); VP.used = false; } }, true);
  if (!$('.vpHint', btn.parentElement)) { const h = document.createElement('p'); h.className = 'muted vpHint'; h.textContent = 'Tap to ping · hold to say it 🎙️'; btn.after(h); }
}
async function vpStart(btn) {
  if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.onLine || !S()?.couple) return;
  VP.used = true; haptic('tap');
  if (!$('.vpRing', btn)) btn.insertAdjacentHTML('beforeend', '<i class="vpRing" aria-hidden="true"></i><em class="vpLbl">🎙️ listening…</em>');
  btn.classList.add('vpRec'); btn.style.setProperty('--vp', '0');
  try { VP.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { btn.classList.remove('vpRec'); F().toast('Microphone permission needed 🎙️'); return; }
  if (!btn.classList.contains('vpRec')) { VP.stream.getTracks().forEach((t) => t.stop()); return; } // let go while asking
  VP.chunks = []; VP.wave = [];
  const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
  VP.rec = new MediaRecorder(VP.stream, mime ? { mimeType: mime } : undefined);
  VP.rec.ondataavailable = (ev) => ev.data && ev.data.size && VP.chunks.push(ev.data);
  VP.rec.start(200); VP.on = true; VP.t0 = Date.now(); haptic('sent');
  try { VP.ac = new (window.AudioContext || window.webkitAudioContext)(); const src = VP.ac.createMediaStreamSource(VP.stream); VP.an = VP.ac.createAnalyser(); VP.an.fftSize = 256; src.connect(VP.an); } catch { VP.an = null; }
  const buf = new Uint8Array(128);
  const loop = () => {
    if (!VP.on) return; VP.raf = requestAnimationFrame(loop);
    const s = (Date.now() - VP.t0) / 1000; btn.style.setProperty('--vp', String(Math.min(1, s / 3)));
    let lvl = .2; if (VP.an) { VP.an.getByteTimeDomainData(buf); let sum = 0; for (const v of buf) sum += ((v - 128) / 128) ** 2; lvl = Math.min(1, Math.sqrt(sum / buf.length) * 3.2); }
    VP.wave.push(lvl); btn.style.setProperty('--lv', lvl.toFixed(2));
    if (s >= 3) vpStop(btn, true);
  };
  loop();
}
function vpStop(btn, send) {
  if (!VP.on) { btn.classList.remove('vpRec'); return; }
  VP.on = false; cancelAnimationFrame(VP.raf); btn.classList.remove('vpRec');
  const dur = Math.min(3, (Date.now() - VP.t0) / 1000), rec = VP.rec, stream = VP.stream;
  rec.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop()); try { VP.ac && VP.ac.close(); } catch { /* */ }
    if (!send || dur < 0.6) { F().toast('Hold a little longer to say something 🎙️'); return; }
    const type = (rec.mimeType || 'audio/webm').split(';')[0]; const blob = new Blob(VP.chunks, { type });
    const n = 24, w = VP.wave; const wave = Array.from({ length: n }, (_, i) => { const s = w.slice(Math.floor(i * w.length / n), Math.floor((i + 1) * w.length / n) || undefined); return Math.round((s.length ? Math.max(...s) : .1) * 100) / 100; });
    flyPing(btn, '🎙️');
    F().chSendMedia(blob, 'voice', { duration: Math.round(dur * 10) / 10, meta: { wave, vping: true } });
    F().sendPing('🎙️');
  };
  try { rec.stop(); } catch { /* */ }
}

// ======================= F4 plan the date the wheel picked =======================
function wheelPlan() {
  const out = $('#wheelOut'); if (!out || out.dataset.fuPlan) return; out.dataset.fuPlan = '1';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'soft fuPlanBtn hidden'; b.innerHTML = '📅 Plan it';
  out.after(b);
  const sync = () => { const t = out.textContent.trim(); b.classList.toggle('hidden', !out.classList.contains('result') || !t || /spinning/i.test(t)); };
  new MutationObserver(sync).observe(out, { attributes: true, attributeFilter: ['class'], childList: true, characterData: true, subtree: true });
  b.onclick = () => {
    const idea = out.textContent.replace(/^🎉\s*/, '').trim(); if (!idea) return;
    const m = idea.match(/(\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*)\s*$/u);
    const em = m ? m[1] : '💗', title = (m ? idea.slice(0, m.index) : idea).trim().slice(0, 120);
    const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(19, 0, 0, 0); // next Saturday, 7pm
    const local = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    F().goTab('us'); try { F().openFeat('cal'); } catch { /* */ }
    setTimeout(() => {
      const box = $('#calFormBox'); if (box) box.open = true;
      if ($('#evTitle')) $('#evTitle').value = title; if ($('#evEmoji')) $('#evEmoji').value = em; if ($('#evWhen')) $('#evWhen').value = local;
      if (box && !$('#fuPlanCd', box)) { const l = document.createElement('label'); l.className = 'tgl fuPlanCd'; l.innerHTML = '<input type="checkbox" id="fuPlanCd" checked> <span>Add a countdown too ⏳</span>'; $('#evSave').before(l); }
      const cd = $('#fuPlanCd'); if (cd) cd.checked = true;
      box && box.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#evWhen') && $('#evWhen').focus();
      F().toast('Pick a time and save 📅');
    }, 380);
  };
  document.addEventListener('click', (e) => { // saving the plan can drop a countdown on Home too
    if (!e.target.closest('#evSave')) return; const cd = $('#fuPlanCd'); if (!cd || !cd.checked) return;
    const label = (($('#evEmoji')?.value || '') + ' ' + ($('#evTitle')?.value || '')).trim(), when = $('#evWhen')?.value;
    if (!label || !when) return; cd.checked = false; cd.closest('label').remove();
    setTimeout(async () => { const { error } = await F().sb.from('countdowns').insert({ label: label.slice(0, 120), target_at: new Date(when).toISOString() }); if (!error) F().loadTable('countdowns'); }, 900);
  }, true);
}

// ======================= F5 your week (Sundays) =======================
const wkKey = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return dayStr(d); };
async function weekCard(force) {
  const home = $('#tab-home'); if (!home || !S()?.couple) return;
  let card = $('#fuWeek');
  const show = force || (new Date().getDay() === 0 && LS('fu_week_x') !== wkKey());
  if (!show) { if (card) card.remove(); return; }
  if (card && card.dataset.k === wkKey() && !force) return;
  const since = new Date(Date.now() - 7 * 864e5);
  let msgs = [];
  try { const { data } = await F().sb.from('messages').select('sender,body,kind,created_at').eq('couple_id', S().couple.id).eq('deleted', false).gte('created_at', since.toISOString()).limit(4000); msgs = data || []; } catch { /* */ }
  if (!msgs.length) msgs = ((F().CH && F().CH.list) || []).filter((m) => new Date(m.created_at) > since);
  const em = new Map(); msgs.forEach((m) => (String(m.body || '').match(/\p{Extended_Pictographic}/gu) || []).forEach((e) => em.set(e, (em.get(e) || 0) + 1)));
  const topEm = [...em.entries()].sort((a, b) => b[1] - a[1])[0];
  const byDay = new Map(); msgs.forEach((m) => { const k = new Date(m.created_at).toLocaleDateString(undefined, { weekday: 'long' }); byDay.set(k, (byDay.get(k) || 0) + 1); });
  const busy = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const D = S().data || {};
  const photos = (D.photos || []).filter((p) => new Date(p.created_at) > since && !/video/.test(p.media_type || ''));
  const favs = ((F().shRow && F().shRow()) || {}).orders?.fav_photos || [];
  const best = photos.find((p) => favs.includes(p.id)) || photos[0];
  const pings = (D.pings || []).filter((p) => new Date(p.created_at) > since).length;
  let pic = ''; if (best) { try { pic = F().phUrl(best); } catch { /* */ } }
  if (!card) { card = document.createElement('div'); card.id = 'fuWeek'; card.className = 'card fuWeek'; const hi = $('#fuCompactBtn') || $('#homeHi'); (hi || home.firstElementChild).after(card); }
  card.dataset.k = wkKey();
  card.innerHTML = `<button type="button" class="fuWeekX" aria-label="Hide until next week">✕</button><h2>🗓️ Your week</h2>
    <div class="wkGrid">
      <div><b class="fuNum" data-k="wk-m">${msgs.length}</b><small>messages</small></div>
      <div><b>${busy ? esc(busy[0].slice(0, 3)) : '—'}</b><small>busiest day</small></div>
      <div><b>${topEm ? esc(topEm[0]) : '💬'}</b><small>${topEm ? `top emoji ×<span class="fuNum" data-k="wk-e">${topEm[1]}</span>` : 'top emoji'}</small></div>
      <div><b class="fuNum" data-k="wk-p">${pings}</b><small>pings</small></div>
    </div>
    ${pic ? `<div class="wkPic"><img src="${esc(pic)}" alt=""><span>${favs.includes(best.id) ? '⭐ ' : ''}photo of the week</span></div>` : `<p class="muted">${photos.length ? '' : 'No photos this week — snap one together 📸'}</p>`}`;
  $('.fuWeekX', card).onclick = () => { LS('fu_week_x', wkKey()); card.classList.add('fuGone'); setTimeout(() => card.remove(), 400); };
  countUps(card);
}

// ======================= F6 search in chat =======================
function chatSearch() {
  const head = $('#chatApp .chatHead'); if (!head || $('#chSearchBtn')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chIco chSearchBtn'; b.id = 'chSearchBtn'; b.setAttribute('aria-label', 'Search messages');
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';
  const gear = $('#chGear', head); gear ? gear.before(b) : head.appendChild(b);
  const panel = document.createElement('div'); panel.className = 'chSearch hidden'; panel.id = 'chSearch';
  panel.innerHTML = `<div class="chsBar"><input id="chsQ" type="search" placeholder="Search our messages…" enterkeyhint="search" autocomplete="off"><input id="chsD" type="date" aria-label="Jump to a day"><button type="button" class="chsX" aria-label="Close search">Done</button></div><div class="chsList" id="chsList"><p class="muted">Type a word, or pick a day 📅</p></div>`;
  $('#chatApp').appendChild(panel);
  const open = () => { panel.classList.remove('hidden'); requestAnimationFrame(() => panel.classList.add('on')); setTimeout(() => $('#chsQ').focus(), 60); };
  const close = () => { panel.classList.remove('on'); setTimeout(() => panel.classList.add('hidden'), 220); $('#chsQ').blur(); };
  b.onclick = open; $('.chsX', panel).onclick = close;
  const list = $('#chsList');
  const hl = (t, q) => { const s = esc(t.length > 160 ? t.slice(0, 160) + '…' : t); if (!q) return s; const i = s.toLowerCase().indexOf(esc(q).toLowerCase()); return i < 0 ? s : s.slice(0, i) + '<mark>' + s.slice(i, i + esc(q).length) + '</mark>' + s.slice(i + esc(q).length); };
  const paint = (rows, q) => {
    list.innerHTML = rows.length ? rows.map((m) => `<button type="button" class="chsRow" data-id="${m.id}"><small>${m.sender === me() ? 'You' : esc(pn())} · ${new Date(m.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: new Date(m.created_at).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })} ${F().hhmm ? F().hhmm(m.created_at) : ''}</small><span>${m.kind === 'text' || !m.kind ? hl(m.body || '', q) : { voice: '🎙️ Voice note', image: '📷 Photo', video: '🎬 Video', videonote: '⭕ Video note', file: '📎 ' + esc(m.body || 'File') }[m.kind] || esc(m.body || '…')}</span></button>`).join('') : '<p class="muted">Nothing found 🔍</p>';
  };
  const run = debounce(async () => {
    const q = $('#chsQ').value.trim(); if (q.length < 2) { list.innerHTML = '<p class="muted">Type a word, or pick a day 📅</p>'; return; }
    list.innerHTML = '<p class="muted">Searching…</p>';
    const like = '%' + q.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
    try {
      const { data, error } = await F().sb.from('messages').select('id,sender,body,kind,created_at').eq('couple_id', S().couple.id).eq('deleted', false).ilike('body', like).order('created_at', { ascending: false }).limit(50);
      if (error) throw error; paint(data || [], q);
    } catch { const loc = ((F().CH && F().CH.list) || []).filter((m) => String(m.body || '').toLowerCase().includes(q.toLowerCase())).reverse(); paint(loc, q); }
  }, 280);
  $('#chsQ').addEventListener('input', run);
  $('#chsD').addEventListener('change', async () => {
    const v = $('#chsD').value; if (!v) return; const a = new Date(v + 'T00:00'), z = new Date(a.getTime() + 864e5);
    list.innerHTML = '<p class="muted">Looking…</p>';
    try { const { data } = await F().sb.from('messages').select('id,sender,body,kind,created_at').eq('couple_id', S().couple.id).eq('deleted', false).gte('created_at', a.toISOString()).lt('created_at', z.toISOString()).order('created_at', { ascending: true }).limit(80); paint(data || [], ''); } catch { list.innerHTML = '<p class="muted">Needs internet 📶</p>'; }
  });
  list.addEventListener('click', async (e) => {
    const r = e.target.closest('.chsRow'); if (!r) return; const id = r.dataset.id; close();
    const has = () => document.querySelector(`.chRow[data-id="${id}"]`);
    for (let i = 0; i < 25 && !has(); i++) { const n = (F().CH.list || []).length; await F().chLoadOlder(); await new Promise((res) => setTimeout(res, 120)); if (!F().CH.more || (F().CH.list || []).length === n) break; }
    setTimeout(() => F().chJump(id), 80);
  });
}

// ======================= F7 a Home that follows the day =======================
const daypart = (h = new Date().getHours()) => (h >= 5 && h < 11 ? 'morning' : h < 17 ? 'day' : h < 22 ? 'evening' : 'night');
const DAY_FIRST = { morning: ['#fuNight', '#fuCheck', '.card.today'], day: ['#fuCheck', '.ping-card'], evening: ['.ping-card', '.card.today', '#fuCheck'], night: ['#fuNight', '.card.today', '#fuRecapCard'] };
const DAY_QUIET = { night: ['#daily', '#homeDist', '#pingList'], morning: ['#pingList'] };
function homeByDay() {
  const home = $('#tab-home'); if (!home) return;
  const part = daypart(); document.body.dataset.daypart = part;
  const pref = window.FU_myPref && window.FU_myPref();
  const custom = pref && Array.isArray(pref.home_order) && pref.home_order.length;
  const card = (sel) => { const el = $(sel, home); return el && (el.parentElement === home ? el : el.closest('#tab-home > *')); };
  $$('#tab-home > .fuQuiet').forEach((el) => el.classList.remove('fuQuiet'));
  (DAY_QUIET[part] || []).map(card).filter(Boolean).forEach((el) => el.classList.add('fuQuiet'));
  if (custom || document.body.classList.contains('fuDragging')) return; // your own order always wins
  let after = $('#fuCompactBtn', home) || $('#homeHi', home); const wk = $('#fuWeek', home); if (wk) after = wk;
  if (!after) return;
  DAY_FIRST[part].map(card).filter((el) => el && !el.classList.contains('hidden')).forEach((el) => { if (after.nextElementSibling !== el) after.after(el); after = el; });
}

// ======================= F8 friendly empty lists =======================
const EMPTY = {
  '#bkTodo': ['🪣', 'Add your first dream', () => focusIn('#bkTitle')],
  '#plList': ['🎧', 'Add the first song', () => focusIn('#plTitle')],
  '#goalList': ['🎯', 'Start a goal', () => openIn('#gTitle')],
  '#cdList': ['⏳', 'Add a countdown', () => openIn('#cdLabel')],
  '#gallery': ['📸', 'Add a photo', () => $('#photoIn') && $('#photoIn').click()],
  '#timeline': ['📖', 'Add our first moment', () => openIn('#tlTitle')],
  '#pingList': ['💓', 'Send the first ping', () => $('#pingBtn') && $('#pingBtn').click()],
  '#jkList': ['😂', 'Add an inside joke', () => openIn('#jkTerm')],
  '#vnList': ['🎙️', 'Record one', () => $('#vnRec') && $('#vnRec').scrollIntoView({ behavior: 'smooth', block: 'center' })],
};
const focusIn = (s) => { const el = $(s); if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 250); };
const openIn = (s) => { const el = $(s); if (!el) return; const d = el.closest('details'); if (d) d.open = true; focusIn(s); };
function emptyStates() {
  Object.entries(EMPTY).forEach(([sel, [em, cta, act]]) => {
    const box = $(sel); if (!box || box.dataset.fuEmpty) return; box.dataset.fuEmpty = '1';
    const fix = () => {
      const kids = [...box.children]; if (kids.length !== 1 || !kids[0].matches('p.muted') || kids[0].dataset.fuE) return;
      const p = kids[0]; p.dataset.fuE = '1'; p.classList.add('fuEmpty');
      const txt = p.innerHTML; p.innerHTML = `<span class="feArt"><b>${em}</b><i>${esc(themeEm())}</i></span><span class="feTxt">${txt}</span><button type="button" class="soft mini feGo">${esc(cta)}</button>`;
      $('.feGo', p).onclick = (e) => { e.stopPropagation(); act(); };
    };
    new MutationObserver(fix).observe(box, { childList: true }); fix();
  });
}

// ======================= F9 swipe actions =======================
const SWIPE = [
  ['#bkTodo > .bk', { r: ['[data-bk^="done:"]', '✓ Done', 'ok'], l: ['[data-del]', '🗑 Delete', 'del'] }],
  ['#plList > .bk', { l: ['[data-del]', '🗑 Remove', 'del'] }],
  ['#wishMineList > .bk', { l: ['[data-del]', '🗑 Remove', 'del'] }],
  ['#cdList > .cdItem', { l: ['[data-del]', '🗑 Delete', 'del'] }],
  ['#goalList > .goal', { l: ['[data-del^="goals:"]', '🗑 Delete', 'del'] }],
];
let sw = null;
addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1 || document.body.classList.contains('fuDragging')) return;
  const t = e.target; if (t.closest('input,textarea,button,a,details,summary,.cd')) { if (!t.closest('.cd')) return; }
  for (const [sel, acts] of SWIPE) { const it = t.closest(sel); if (it) { sw = { it, acts, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, on: false }; return; } }
}, { passive: true });
addEventListener('touchmove', (e) => {
  if (!sw) return; const x = e.touches[0].clientX, y = e.touches[0].clientY, dx = x - sw.x, dy = y - sw.y;
  if (!sw.on) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
    if (Math.abs(dx) < 12) return;
    const side = dx > 0 ? sw.acts.r : sw.acts.l; if (!side || !$(side[0], sw.it)) { sw = null; return; }
    sw.on = true; sw.it.classList.add('fuSw');
    const bg = document.createElement('div'); bg.className = 'fuSwBg'; sw.it.prepend(bg); sw.bg = bg;
  }
  if (document.body.classList.contains('fuDragging')) { swEnd(true); return; }
  e.preventDefault();
  const side = dx > 0 ? sw.acts.r : sw.acts.l; const okSide = side && $(side[0], sw.it);
  sw.dx = okSide ? dx : dx * .15; const p = Math.min(1, Math.abs(sw.dx) / 90);
  sw.it.style.setProperty('--sx', sw.dx + 'px'); sw.bg.style.opacity = String(p);
  if (okSide) { sw.bg.className = 'fuSwBg ' + side[2] + (dx > 0 ? ' r' : ' l') + (p >= 1 ? ' go' : ''); sw.bg.textContent = side[1]; }
  if (p >= 1 && !sw.buzzed) { sw.buzzed = true; haptic('tap'); } if (p < 1) sw.buzzed = false;
}, { passive: false });
addEventListener('touchend', () => swEnd(false)); addEventListener('touchcancel', () => swEnd(true));
function swEnd(cancel) {
  if (!sw) return; const s = sw; sw = null; if (!s.on) return;
  const side = s.dx > 0 ? s.acts.r : s.acts.l; const go = !cancel && side && Math.abs(s.dx) >= 90;
  s.it.classList.add('fuSwBack'); s.it.style.setProperty('--sx', go && side[2] === 'ok' ? (s.dx > 0 ? '110%' : '-110%') : '0px');
  setTimeout(() => { s.it.classList.remove('fuSw', 'fuSwBack'); s.it.style.removeProperty('--sx'); s.bg && s.bg.remove(); }, go && side[2] === 'ok' ? 420 : 260);
  if (go) { const btn = $(side[0], s.it); if (btn) setTimeout(() => btn.click(), side[2] === 'ok' ? 200 : 60); }
}

// ======================= F10 Settings: grouped, searchable =======================
const SET_GROUPS = [
  ['you', '👤 You', /profile|pet names/i],
  ['us', '💞 Shared with your love', /^\W*notifications|our theme|cute effects|^\W*chat$|date wheel|storage|encrypt/i],
  ['phone', '📱 This phone', /push on this phone|home screen|motion|lock|sound|moments|shake|install/i],
];
function settingsGroups() {
  const tab = $('#tab-me'); if (!tab) return;
  const cards = [...tab.children].filter((el) => el.classList.contains('card'));
  if (!cards.length) return;
  if (!$('#fuSetSearch', tab)) {
    const w = document.createElement('div'); w.className = 'fuSetSearch'; w.id = 'fuSetSearch';
    w.innerHTML = '<input type="search" id="fuSetQ" placeholder="🔎 Search settings…" autocomplete="off">'; tab.prepend(w);
    $('#fuSetQ').addEventListener('input', () => filterSettings($('#fuSetQ').value));
  }
  const groups = { you: [], us: [], phone: [], more: [] };
  cards.forEach((c) => { const h = (c.querySelector('h2')?.textContent || '').trim(); const g = SET_GROUPS.find(([, , re]) => re.test(h)); groups[g ? g[0] : 'more'].push(c); });
  let after = $('#fuSetSearch', tab);
  [...SET_GROUPS, ['more', '✨ More']].forEach(([k, label]) => {
    const list = groups[k]; let hd = $(`.fuSetH[data-g="${k}"]`, tab);
    if (!list.length) { if (hd) hd.remove(); return; }
    if (!hd) { hd = document.createElement('h3'); hd.className = 'fuSetH'; hd.dataset.g = k; hd.textContent = label; }
    if (after.nextElementSibling !== hd) after.after(hd); after = hd;
    list.forEach((c) => { if (after.nextElementSibling !== c) after.after(c); after = c; });
  });
  const q = $('#fuSetQ'); if (q && q.value) filterSettings(q.value);
}
function filterSettings(q) {
  const tab = $('#tab-me'); q = q.trim().toLowerCase(); let any = false;
  $$('#tab-me > .card').forEach((c) => { const hit = !q || c.textContent.toLowerCase().includes(q); c.classList.toggle('fuSetHide', !hit); any = any || hit; });
  $$('#tab-me > .fuSetH').forEach((h) => { let n = h.nextElementSibling, vis = false; while (n && !n.classList.contains('fuSetH')) { if (n.classList.contains('card') && !n.classList.contains('fuSetHide')) vis = true; n = n.nextElementSibling; } h.classList.toggle('fuSetHide', !vis); });
  let none = $('#fuSetNone'); if (!none) { none = document.createElement('p'); none.id = 'fuSetNone'; none.className = 'muted fuSetNone'; none.textContent = 'No settings match 🔍'; $('#fuSetSearch').after(none); }
  none.classList.toggle('hidden', any);
}

// ======================= F12 together glow =======================
document.addEventListener('fu:together', (e) => {
  if (!e.detail || !lively()) return;
  try { if (sessionStorage.getItem('fu_glow')) return; sessionStorage.setItem('fu_glow', '1'); } catch { return; }
  const g = document.createElement('div'); g.className = 'fuTogether'; document.body.appendChild(g); setTimeout(() => g.remove(), 2600);
  haptic('got');
});

// ======================= F14 offline chip =======================
function offlineChip() {
  const q = () => { try { return JSON.parse(LS('cc_queue') || '[]').length; } catch { return 0; } };
  let wasOff = document.body.classList.contains('isOffline'), timer = 0;
  const paint = () => {
    const p = $('#offPill'); if (!p) return; const off = document.body.classList.contains('isOffline'), n = q();
    if (off) { p.classList.remove('back'); p.innerHTML = `<i></i>Offline${n ? ` · ${n} waiting to send` : ' · it\'ll send when you\'re back'}`; }
    if (wasOff && !off) { p.innerHTML = `<i></i>Back online${n ? ` · sending ${n}…` : ' ✓'}`; p.classList.add('show', 'back'); clearTimeout(timer); timer = setTimeout(() => p.classList.remove('show', 'back'), 2600); }
    wasOff = off;
  };
  new MutationObserver(paint).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  setInterval(() => { if (document.body.classList.contains('isOffline')) paint(); }, 2000);
}

// ======================= F15 low battery → calmer, lighter =======================
async function lowPower() {
  try {
    if (!navigator.getBattery) return; const b = await navigator.getBattery();
    const set = () => { const on = !b.charging && b.level <= 0.2; document.documentElement.classList.toggle('fuLow', on); window.FU_lowPower = on; };
    set(); b.addEventListener('levelchange', set); b.addEventListener('chargingchange', set);
  } catch { /* */ }
}

// ======================= A1 the ping travels =======================
function flyPing(from, em) {
  if (!lively() || !from) return; const r = from.getBoundingClientRect();
  const h = document.createElement('div'); h.className = 'fuFly'; h.textContent = em || '💗'; document.body.appendChild(h);
  const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2, x1 = innerWidth * (0.55 + Math.random() * 0.3);
  h.animate([
    { transform: `translate(${x0}px,${y0}px) translate(-50%,-50%) scale(.6)`, opacity: 0 },
    { transform: `translate(${x0}px,${y0 - 40}px) translate(-50%,-50%) scale(1.5)`, opacity: 1, offset: .2 },
    { transform: `translate(${(x0 + x1) / 2 - 40}px,${y0 * .45}px) translate(-50%,-50%) scale(1.1) rotate(-14deg)`, opacity: 1, offset: .6 },
    { transform: `translate(${x1}px,-60px) translate(-50%,-50%) scale(.5) rotate(10deg)`, opacity: 0 },
  ], { duration: 1100, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
  setTimeout(() => h.remove(), 1150);
}
function flyIn(em) {
  if (!lively()) return; const h = document.createElement('div'); h.className = 'fuFly in'; h.textContent = em || '💗'; document.body.appendChild(h);
  const x = innerWidth / 2, y = innerHeight * .42;
  h.animate([
    { transform: `translate(${innerWidth * .25}px,-70px) translate(-50%,-50%) scale(.5) rotate(-20deg)`, opacity: 0 },
    { transform: `translate(${innerWidth * .6}px,${y * .45}px) translate(-50%,-50%) scale(1.2) rotate(12deg)`, opacity: 1, offset: .45 },
    { transform: `translate(${x}px,${y}px) translate(-50%,-50%) scale(2.4)`, opacity: 1, offset: .8 },
    { transform: `translate(${x}px,${y}px) translate(-50%,-50%) scale(1.6)`, opacity: 0 },
  ], { duration: 1300, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
  setTimeout(() => h.remove(), 1350);
}
document.addEventListener('click', (e) => { const b = e.target.closest('#pingBtn'); if (b && !VP.used) flyPing(b, '💗'); });
function watchIncoming() {
  const o = $('#heartOverlay'); if (!o || o.dataset.fuIn) return; o.dataset.fuIn = '1';
  new MutationObserver(() => { if (!o.classList.contains('hidden')) { const m = ($('#heartTxt')?.textContent || '').match(/sent you (\S+)$/u); flyIn(m ? m[1] : '💗'); haptic('got'); } }).observe(o, { attributes: true, attributeFilter: ['class'] });
}
window.FU_flyPing = flyPing;

// ======================= A2 messages lift off + A3 they're here =======================
const seen = new Set(); let seeded = false;
function watchChat() {
  const box = $('#chMsgs'); if (!box || box.dataset.fuW) return; box.dataset.fuW = '1';
  const scan = () => {
    const rows = $$('.chRow[data-id]', box); const fresh = rows.filter((r) => !seen.has(r.dataset.id));
    fresh.forEach((r) => seen.add(r.dataset.id));
    if (!seeded) { seeded = rows.length > 0; return; }
    if (fresh.length > 3) return; // a page of history, not a new message
    fresh.forEach((r) => {
      if (!lively()) return;
      const mine = r.classList.contains('me') || r.classList.contains('mine') || !!r.querySelector('.tk');
      r.classList.remove('fuSendIn', 'fuGetIn'); void r.offsetWidth; r.classList.add(mine ? 'fuSendIn' : 'fuGetIn');
      if (!mine && document.body.classList.contains('inChat') && !document.hidden) haptic('got');
    });
  };
  new MutationObserver(scan).observe(box, { childList: true, subtree: true }); scan();
  const st = $('#chtStatus'), av = $('#chAv'); if (!st || !av) return;
  let here = false;
  const sync = () => { const h = /here now/.test(st.textContent); av.classList.toggle('fuHere', h); if (h && !here && lively()) { av.classList.remove('fuArrive'); void av.offsetWidth; av.classList.add('fuArrive'); } here = h; };
  new MutationObserver(sync).observe(st, { childList: true, characterData: true, subtree: true }); sync();
}

// ======================= A4 check-in flips =======================
document.addEventListener('click', (e) => {
  const b = e.target.closest('#fuCheck [data-ck]'); if (!b || !lively()) return;
  const r = b.getBoundingClientRect(); const em = b.querySelector('i')?.textContent || '✓';
  const f = document.createElement('div'); f.className = 'fuCkFlip'; f.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
  f.innerHTML = `<b class="front">${b.innerHTML}</b><b class="back">✓ Sent</b>`; document.body.appendChild(f);
  const fl = document.createElement('div'); fl.className = 'fuCkFloat'; fl.textContent = em; fl.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top}px`; document.body.appendChild(fl);
  setTimeout(() => f.remove(), 1100); setTimeout(() => fl.remove(), 1300);
}, true);

// ======================= A6 numbers count up =======================
const lastNum = new Map();
function countUps(root) {
  $$('.fuNum', root).forEach((el) => {
    const to = parseInt(String(el.textContent).replace(/[^\d]/g, ''), 10); if (isNaN(to)) return;
    const k = el.dataset.k || ''; const from = k && lastNum.has(k) ? lastNum.get(k) : 0; if (k) lastNum.set(k, to);
    if (!lively() || from === to) { el.textContent = to.toLocaleString(); return; }
    const t0 = performance.now(), ms = Math.min(1200, 500 + Math.abs(to - from) * 12);
    const step = (t) => { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(from + (to - from) * e).toLocaleString(); if (p < 1) requestAnimationFrame(step); };
    el.textContent = from.toLocaleString(); requestAnimationFrame(step);
  });
}
// streak flames + "days together": wrap their numbers once, then count up whenever they change
function numberise(sel, key) {
  const box = $(sel); if (!box || box.dataset.fuN) return; box.dataset.fuN = '1';
  const go = () => {
    let i = 0;
    $$('.flame, .bq', box).forEach((el) => {
      if (el.querySelector('.fuNum')) return;
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
      while ((n = tw.nextNode())) { const m = n.nodeValue.match(/\d[\d,]*/); if (!m || n.parentElement.closest('small')) continue;
        const sp = document.createElement('span'); sp.className = 'fuNum'; sp.dataset.k = key + (i++); sp.textContent = m[0];
        const rest = n.splitText(m.index); rest.nodeValue = rest.nodeValue.slice(m[0].length); rest.before(sp); break; }
    });
    countUps(box);
  };
  new MutationObserver(() => { if (!box.querySelector('.fuNum')) go(); }).observe(box, { childList: true }); go();
}

// ======================= A7 progress bars fill with a wave =======================
const lastPct = new Map();
function waveBars() {
  const box = $('#goalList'); if (!box || box.dataset.fuB) return; box.dataset.fuB = '1';
  const go = () => $$('.goal[data-oid] .barfill', box).forEach((b) => {
    if (b.dataset.fuW) return; b.dataset.fuW = '1';
    const id = b.closest('.goal').dataset.oid, to = b.style.width, from = lastPct.has(id) ? lastPct.get(id) : '0%'; lastPct.set(id, to);
    if (!lively() || from === to) return;
    b.style.transition = 'none'; b.style.width = from; void b.offsetWidth; b.style.transition = ''; requestAnimationFrame(() => { b.style.width = to; });
  });
  new MutationObserver(go).observe(box, { childList: true, subtree: true }); go();
}

// ======================= A8 pull-to-refresh wears the theme =======================
const ptrTheme = () => { const s = $('.ptr span'); if (s) s.textContent = themeEm(); };

// ======================= A9 tab icons react =======================
document.addEventListener('click', (e) => {
  const b = e.target.closest('.nav button'); if (!b || !lively()) return; const i = b.querySelector('.ni'); if (!i) return;
  const k = 'fuNi-' + (b.dataset.tab || 'home'); i.classList.remove(k); void i.offsetWidth; i.classList.add(k);
  i.addEventListener('animationend', () => i.classList.remove(k), { once: true }); haptic('tap');
});

// ======================= A11 milestone celebrations =======================
function celebrate(em, title, sub) {
  const o = document.createElement('div'); o.className = 'fuCeleb'; o.setAttribute('role', 'status');
  o.innerHTML = `<div class="fcCard"><b>${esc(em)}</b><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ''}<small>tap to close</small></div>`;
  document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('on')); haptic('done');
  const close = () => { o.classList.remove('on'); setTimeout(() => o.remove(), 350); };
  o.onclick = close; setTimeout(close, 4200);
  if (!lively() || !window.FX) return; const set = [em, ...confEm()];
  [0, 350, 700].forEach((d, i) => setTimeout(() => FX.burst(innerWidth * (0.25 + i * 0.25), innerHeight * (0.35 + (i % 2) * 0.15), set, 18, 140), d));
  try { F().confetti(80); } catch { /* */ }
}
window.FU_celebrate = celebrate;
function milestoneToday() {
  const r = (F().shRow && F().shRow()) || {}; const since = r.together_since; if (!since) return;
  const t = new Date(), s = new Date(since + 'T00:00'); const days = Math.floor((new Date(dayStr(t) + 'T00:00') - s) / 864e5);
  const k = 'fu_celeb_' + dayStr(t); if (LS(k)) return;
  let hit = null;
  if (t.getMonth() === s.getMonth() && t.getDate() === s.getDate() && t.getFullYear() > s.getFullYear()) hit = ['💍', `${t.getFullYear() - s.getFullYear()} year${t.getFullYear() - s.getFullYear() === 1 ? '' : 's'} together`, 'Happy anniversary 💞'];
  else if (days > 0 && days % 100 === 0) hit = ['💯', `${days.toLocaleString()} days together`, 'Every one of them counts 💗'];
  else if (t.getDate() === s.getDate() && days > 20) { const mo = (t.getFullYear() - s.getFullYear()) * 12 + t.getMonth() - s.getMonth(); if (mo > 0 && mo < 12) hit = ['🌙', `${mo} month${mo === 1 ? '' : 's'} together`, 'Happy monthiversary 💕']; }
  if (!hit) return; LS(k, '1'); setTimeout(() => celebrate(...hit), 1600);
}

// ======================= A12 shake to send a hug =======================
let shakeOn = LS('fu_shake') === '1', lastShake = 0, peaks = [];
function onMotion(e) {
  const a = e.accelerationIncludingGravity || e.acceleration; if (!a) return;
  const m = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
  const now = Date.now(); if (m > 24) { peaks = peaks.filter((t) => now - t < 900); peaks.push(now); }
  if (peaks.length >= 3 && now - lastShake > 20000 && !document.hidden && S()?.couple) { lastShake = now; peaks = []; shakeHug(); }
}
async function shakeHug() {
  document.body.classList.remove('fuWobble'); void document.body.offsetWidth; document.body.classList.add('fuWobble'); setTimeout(() => document.body.classList.remove('fuWobble'), 700);
  haptic('hug');
  const { error } = await F().sb.from('pings').insert({ kind: 'hug' });
  if (error) return F().toast('Hug didn\'t go through 🥺'); F().notify('hug', 'shook their phone to hug you 🤗'); F().toast(`🤗 Hug sent to ${pn()}`);
  if (window.FX) FX.burst(innerWidth / 2, innerHeight / 2, ['🤗', '💗', '🫂'], 16, 120);
}
function shakeSetting() {
  const motionCard = $('#setReduce') && $('#setReduce').closest('.card'); if (!motionCard || $('#fuShakeCard')) return;
  const c = document.createElement('div'); c.className = 'card'; c.id = 'fuShakeCard';
  c.innerHTML = `<h2>🤗 Shake to hug</h2><label class="tgl"><input type="checkbox" id="fuShake"> <span>Shake your phone to send ${esc(pn())} a hug <small>works while the app is open</small></span></label>`;
  motionCard.after(c);
  const cb = $('#fuShake'); cb.checked = shakeOn;
  cb.onchange = async () => {
    if (cb.checked && window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
      try { if ((await DeviceMotionEvent.requestPermission()) !== 'granted') { cb.checked = false; return F().toast('Motion permission needed 📳'); } } catch { cb.checked = false; return; }
    }
    shakeOn = cb.checked; LS('fu_shake', shakeOn ? '1' : null); armShake(); F().toast(shakeOn ? 'Shake to hug is on 🤗' : 'Shake to hug is off');
  };
}
let armed = false;
function armShake() { if (shakeOn && !armed) { addEventListener('devicemotion', onMotion); armed = true; } else if (!shakeOn && armed) { removeEventListener('devicemotion', onMotion); armed = false; } }

// ======================= A13 a sleepy pet when Home is quiet =======================
let idleT = 0, pet = null;
const wake = () => {
  clearTimeout(idleT); idleT = setTimeout(sleepy, 30000);
  if (!pet) return; const p = pet; pet = null; p.classList.add('wake'); setTimeout(() => p.remove(), 650);
};
['pointerdown', 'scroll', 'keydown'].forEach((k) => addEventListener(k, wake, { passive: true, capture: true }));
function sleepy() {
  if (pet || document.hidden || !lively() || document.body.dataset.tab !== 'home' && document.body.dataset.tab) return;
  if (Date.now() - (+LS('fu_nap') || 0) < 5 * 60e3) return;
  const cards = $$('#tab-home > .card:not(.hidden)').filter((c) => { const r = c.getBoundingClientRect(); return r.top > 90 && r.top < innerHeight - 200 && r.width > 200; });
  const c = cards[Math.floor(Math.random() * cards.length)]; if (!c) return;
  LS('fu_nap', String(Date.now()));
  pet = document.createElement('div'); pet.className = 'fuNap'; pet.innerHTML = `<b>${esc(themeEm())}</b><i>z</i><i>z</i><i>Z</i>`;
  pet.style.left = (20 + Math.random() * 55) + '%'; c.appendChild(pet);
}

// ======================= boot =======================
let wrapped = false;
function wrapRenders() {
  const f = F(); if (wrapped || !f || !f.RENDER) return; wrapped = true;
  const R = f.RENDER;
  const wrap = (t, fn) => { const o = R[t]; R[t] = async (...a) => { const r = o ? await o(...a) : undefined; try { fn(); } catch (e) { console.warn(e); } return r; }; };
  const ps = debounce(loadPingStreak, 1500);
  wrap('pings', ps);
  wrap('couple_settings', () => setTimeout(milestoneToday, 300));
}
function hook() {
  if (!F()) return;
  wrapRenders(); watchToast(); voicePing(); wheelPlan(); chatSearch(); emptyStates(); settingsGroups(); offlineChip.done || (offlineChip(), offlineChip.done = 1);
  watchIncoming(); watchChat(); numberise('#homeStreak', 'hs'); numberise('#usStreak', 'us'); numberise('#msToday', 'ms'); waveBars(); ptrTheme(); shakeSetting(); armShake();
  homeByDay(); const h = $('#tab-home'); if (h && !h.dataset.fuDay) { h.dataset.fuDay = '1'; new MutationObserver(debounce(homeByDay, 60)).observe(h, { childList: true }); }
  const me2 = $('#tab-me'); if (me2 && !me2.dataset.fuSet) { me2.dataset.fuSet = '1'; new MutationObserver(debounce(settingsGroups, 80)).observe(me2, { childList: true }); }
}
const prevEnter = window.FU_enter;
window.FU_enter = async (...a) => {
  const p = prevEnter ? prevEnter(...a) : undefined;
  try { return await p; } finally { hook(); setTimeout(() => { hook(); loadPingStreak(); weekCard(); milestoneToday(); }, 1400); }
};
document.addEventListener('cc:theme', () => { ptrTheme(); setTimeout(() => $$('.fuEmpty .feArt i').forEach((i) => (i.textContent = themeEm())), 80); });
setInterval(() => { homeByDay(); }, 10 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { homeByDay(); weekCard(); } });
const boot = () => { lowPower(); hook(); wake(); };
if (document.readyState !== 'loading') setTimeout(boot, 0); else document.addEventListener('DOMContentLoaded', boot);
window.FU_x = { weekCard, celebrate, homeByDay, loadPingStreak, sleepy, settingsGroups };
})();
