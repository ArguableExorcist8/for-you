// For Us v50 — our list · voice open-when letters · memory jar · text size · compact Home · big-screen layout
// card art · follow the phone's dark mode · sounds that match the buzz · typing on the chat tab · unread peek · pressed states
(() => {
'use strict';
const F = () => window.__FU;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = () => F() && F().S;
const me = () => S()?.user?.id;
const pn = () => (F() && F().partnerName && F().partnerName()) || 'your love';
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } };
const root = document.documentElement;
const motion = () => { try { return F().motionOn ? F().motionOn() : true; } catch { return true; } };
const lively = () => motion() && !root.classList.contains('fuLow');
const hap = (k) => window.FU_haptic && window.FU_haptic(k);
const theme = () => (window.CC_THEMES || []).find((t) => t.id === root.dataset.theme) || null;
const ago = (d) => {
  const days = Math.round((Date.now() - new Date(d)) / 864e5);
  if (days < 1) return 'today'; if (days < 2) return 'yesterday'; if (days < 14) return `${days} days ago`; if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`; const y = Math.floor(days / 365); return `${y} year${y > 1 ? 's' : ''} ago`;
};

// ======================= 1. our list (shared, live) =======================
function listCard() {
  const home = $('#tab-home'); if (!home || $('#fuList')) return;
  const c = document.createElement('div'); c.className = 'card fuList'; c.id = 'fuList';
  c.innerHTML = `<h2>🛒 Our list</h2>
    <form class="flAdd" autocomplete="off"><input id="flIn" maxlength="120" placeholder="Add something… milk, book dinner" enterkeyhint="done"><button type="submit" aria-label="Add">＋</button></form>
    <div class="flItems" id="flItems"></div><div class="flFoot"></div>`;
  const anchor = $('#fuCheck', home) || $('.ping-card', home); anchor ? anchor.after(c) : home.appendChild(c);
  $('form', c).onsubmit = async (e) => {
    e.preventDefault(); const inp = $('#flIn'); const title = inp.value.trim().slice(0, 120); if (!title) return;
    inp.value = ''; const tmp = { id: 'tmp' + Date.now(), title, created_by: me(), created_at: new Date().toISOString(), _new: true };
    const D = S().data; D.todos = [...(D.todos || []), tmp]; paintList();
    const { error } = await F().sb.from('todos').insert({ title });
    if (error) { D.todos = D.todos.filter((x) => x !== tmp); paintList(); return F().toast('Couldn\'t add — try again'); }
    hap('sent'); F().notify('todo', `added “${title.slice(0, 60)}” to our list 🛒`); F().loadTable('todos');
  };
  c.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-tick]'); if (b) {
      const row = (S().data.todos || []).find((x) => x.id === b.dataset.tick); if (!row || String(row.id).startsWith('tmp')) return;
      const done = !row.done_at; row.done_at = done ? new Date().toISOString() : null; row.done_by = done ? me() : null; row._tick = done; paintList();
      if (done) { hap('done'); window.FU_P && window.FU_P.sound && window.FU_P.sound('done'); }
      const { error } = await F().sb.from('todos').update({ done_at: row.done_at, done_by: row.done_by }).eq('id', row.id);
      if (error) { F().toast('Couldn\'t update — try again'); F().loadTable('todos'); }
      const open = (S().data.todos || []).filter((x) => !x.done_at).length;
      if (done && !open && lively() && window.FX) FX.burstAt(c, ['🎉', '✨', '🛒', '💗'], 16, 110);
      return;
    }
    if (e.target.closest('.flClear')) {
      const ids = (S().data.todos || []).filter((x) => x.done_at).map((x) => x.id); if (!ids.length) return;
      $$('.flItem.done', c).forEach((el, i) => { el.style.transitionDelay = i * 40 + 'ms'; el.classList.add('bye'); });
      setTimeout(async () => { S().data.todos = (S().data.todos || []).filter((x) => !x.done_at); paintList(); await F().sb.from('todos').delete().in('id', ids); F().loadTable('todos'); }, 380);
    }
  });
}
function paintList() {
  const box = $('#flItems'); if (!box) return;
  const l = (S()?.data?.todos || []).slice(); const open = l.filter((x) => !x.done_at), done = l.filter((x) => x.done_at).sort((a, b) => new Date(b.done_at) - new Date(a.done_at));
  const who = (u) => (u === me() ? 'you' : esc(pn()));
  const item = (x) => `<div class="flItem${x.done_at ? ' done' : ''}${x._new ? ' new' : ''}${x._tick ? ' ticked' : ''}" data-oid="${x.id}">
      <button type="button" class="flChk" data-tick="${x.id}" aria-label="${x.done_at ? 'Untick' : 'Tick'} ${esc(x.title)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg></button>
      <span><b>${esc(x.title)}</b><small>${x.done_at ? `✓ ${who(x.done_by)}` : `added by ${who(x.created_by)}`}</small></span>
      <button type="button" class="flDel" data-del="todos:${x.id}" aria-label="Delete">✕</button></div>`;
  box.innerHTML = open.map(item).join('') + done.slice(0, 12).map(item).join('') || '<p class="muted flEmpty">Nothing yet — add the first thing ✍️</p>';
  l.forEach((x) => { delete x._new; delete x._tick; });
  const foot = $('#fuList .flFoot'); if (foot) foot.innerHTML = done.length ? `<button type="button" class="soft mini flClear">Clear ticked (${done.length})</button>` : (open.length ? `<small class="muted">${open.length} to go</small>` : '');
}
F() && (F().RENDER.todos = paintList);

// ======================= 2. "open when" voice letters =======================
const OW = { rec: null, stream: null, chunks: [], t0: 0, blob: null, dur: 0, timer: 0, url: '' };
function owVoice() {
  const out = $('#owOut'); if (!out || $('#owVoice')) return;
  const w = document.createElement('div'); w.className = 'owVoice'; w.id = 'owVoice';
  w.innerHTML = `<button type="button" class="soft" id="owRec">🎙️ Record a voice letter instead</button><div class="owPrev hidden" id="owPrev"><audio controls playsinline></audio><button type="button" class="mini soft" id="owRedo">↺ Redo</button></div>`;
  $('#owBody').after(w);
  $('#owRec').onclick = async () => {
    if (OW.rec) return owStop();
    if (!window.MediaRecorder || !navigator.mediaDevices) return F().toast('Recording isn\'t supported here 😿');
    try { OW.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { return F().toast('Microphone permission needed 🎙️'); }
    const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
    OW.chunks = []; OW.rec = new MediaRecorder(OW.stream, mime ? { mimeType: mime } : undefined);
    OW.rec.ondataavailable = (e) => e.data && e.data.size && OW.chunks.push(e.data);
    OW.rec.start(250); OW.t0 = Date.now(); hap('tap');
    $('#owRec').classList.add('rec');
    const tick = () => { const s = Math.floor((Date.now() - OW.t0) / 1000); $('#owRec').textContent = `⏺ Recording ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · tap to stop`; if (s >= 120) owStop(); };
    tick(); OW.timer = setInterval(tick, 500);
  };
  $('#owRedo').onclick = () => { OW.blob = null; $('#owPrev').classList.add('hidden'); $('#owRec').classList.remove('hidden'); $('#owRec').textContent = '🎙️ Record a voice letter instead'; $('#owBody').classList.remove('owOff'); };
  // sealing: a recording rides along instead of (or with) the written letter
  $('#owAdd').addEventListener('click', async (e) => {
    if (!OW.blob) return; e.stopImmediatePropagation(); e.preventDefault();
    let title = $('#owTitle').value.trim(); if (!title) return F().toast('Give it an “Open when…” title 💌');
    if (!/^open when/i.test(title)) title = 'Open when ' + title;
    const btn = $('#owAdd'); btn.disabled = true; btn.textContent = 'Sealing… ✉️';
    try {
      const type = (OW.blob.type || 'audio/mp4').split(';')[0]; const ext = /webm/.test(type) ? 'webm' : 'm4a';
      const path = `${S().couple.id}/ow-${crypto.randomUUID()}.${ext}`;
      const { error } = await F().sb.storage.from('photos').upload(path, OW.blob, { contentType: type === 'audio/mp4' ? 'audio/mp4' : type });
      if (error) throw error;
      const body = $('#owBody').value.trim() || '🎙️ A voice letter';
      const { error: e2 } = await F().sb.from('open_when').insert({ emoji: $('#owEmoji').value.trim() || '✉️', title: title.slice(0, 80), body, audio_path: path, audio_dur: Math.round(OW.dur * 10) / 10 });
      if (e2) { F().sb.storage.from('photos').remove([path]); throw e2; }
      $('#owTitle').value = $('#owBody').value = ''; $('#owRedo').click();
      F().toast('Voice letter sealed ✉️🎙️'); F().notify('openwhen', `recorded you an ${title.slice(0, 80)} voice letter 🎙️`); F().loadTable('open_when');
    } catch (err) { F().toast('Couldn\'t seal it — try again'); console.warn(err); }
    btn.disabled = false; btn.textContent = 'Seal envelope ✉️';
  }, true);
}
function owStop() {
  if (!OW.rec) return; clearInterval(OW.timer); const rec = OW.rec; OW.rec = null; OW.dur = (Date.now() - OW.t0) / 1000;
  rec.onstop = () => {
    OW.stream.getTracks().forEach((t) => t.stop());
    if (OW.dur < 1) { F().toast('A little longer 🎙️'); $('#owRec').textContent = '🎙️ Record a voice letter instead'; $('#owRec').classList.remove('rec'); return; }
    OW.blob = new Blob(OW.chunks, { type: (rec.mimeType || 'audio/mp4').split(';')[0] });
    if (OW.url) URL.revokeObjectURL(OW.url); OW.url = URL.createObjectURL(OW.blob);
    $('#owPrev audio').src = OW.url; $('#owPrev').classList.remove('hidden'); $('#owRec').classList.add('hidden'); $('#owRec').classList.remove('rec');
    $('#owBody').classList.add('owOff'); $('#owBody').placeholder = 'A little note with it (optional)…'; hap('done');
  };
  try { rec.stop(); } catch { /* */ }
}
// envelopes with a voice inside get a 🎙️, and opening one plays it
function owMarks() {
  const l = S()?.data?.open_when || [];
  $$('#owIn [data-ow]').forEach((el) => { const x = l.find((r) => r.id === el.dataset.ow); if (x && x.audio_path && !$('.owMic', el)) el.insertAdjacentHTML('beforeend', '<i class="owMic">🎙️</i>'); });
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('#owIn [data-ow]'); if (!el) return;
  const x = (S()?.data?.open_when || []).find((r) => r.id === el.dataset.ow); if (!x || !x.audio_path) return;
  setTimeout(async () => {
    const box = $('#modalBox'); if (!box || $('.owPlay', box)) return;
    const letter = $('.letter', box); const pl = document.createElement('div'); pl.className = 'owPlay';
    pl.innerHTML = `<div class="owWave">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><audio controls playsinline preload="auto"></audio>`;
    (letter || box.firstElementChild).before(pl); if (letter && /^🎙️ A voice letter$/.test(letter.textContent.trim())) letter.remove();
    try {
      await F().signPaths([x.audio_path]); const a = $('audio', pl); a.src = F().sUrl(x.audio_path);
      a.onplay = () => pl.classList.add('on'); a.onpause = a.onended = () => pl.classList.remove('on');
      a.play().catch(() => {});
    } catch { pl.insertAdjacentHTML('beforeend', '<p class="muted">Couldn\'t load the recording 📶</p>'); }
  }, 60);
});

// ======================= 4. memory jar =======================
function jarCard() {
  const home = $('#tab-home'); if (!home || $('#fuJar')) return;
  const c = document.createElement('div'); c.className = 'card fuJar'; c.id = 'fuJar';
  c.innerHTML = `<h2>🫙 Memory jar</h2><button type="button" class="jarBtn" id="jarBtn" aria-label="Pull a memory"><span class="jarGlass">🫙</span><i class="jb b1">💗</i><i class="jb b2">✨</i><i class="jb b3">📸</i></button>
    <p class="muted jarHint">Tap the jar for a little piece of us</p><div class="jarOut" id="jarOut"></div>`;
  const anchor = $('#fuOTD', home) || $('#daily', home)?.closest('.card'); anchor ? anchor.after(c) : home.appendChild(c);
  $('#jarBtn').onclick = pullMemory;
}
let lastPick = '';
function memories() {
  const D = S()?.data || {}, out = [];
  (D.photos || []).filter((p) => !/video/.test(p.media_type || '')).forEach((p) => out.push({ k: 'p' + p.id, kind: 'photo', p, at: p.created_at, by: p.created_by, cap: p.caption }));
  (D.timeline || []).forEach((m) => out.push({ k: 't' + m.id, kind: 'moment', title: m.title, body: m.body, at: m.event_date + 'T12:00:00' }));
  (D.notes || []).forEach((n) => out.push({ k: 'n' + n.id, kind: 'note', body: n.body, at: n.created_at, by: n.created_by }));
  (D.gratitude || []).forEach((g) => out.push({ k: 'g' + g.id, kind: 'grat', body: g.body, at: g.created_at || g.day, by: g.created_by }));
  ((F().CH && F().CH.list) || []).filter((m) => m.kind === 'text' && (m.body || '').length > 14 && Date.now() - new Date(m.created_at) > 2 * 864e5).forEach((m) => out.push({ k: 'm' + m.id, kind: 'msg', body: m.body, at: m.created_at, by: m.sender }));
  (D.bucket_items || []).filter((b) => b.done_at).forEach((b) => out.push({ k: 'b' + b.id, kind: 'dream', title: b.title, em: b.emoji, at: b.done_at }));
  return out.filter((x) => x.at);
}
function pullMemory() {
  const btn = $('#jarBtn'), box = $('#jarOut'); if (!btn || !box) return;
  const all = memories().filter((m) => m.k !== lastPick);
  btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); hap('tap');
  if (!all.length) { box.innerHTML = '<p class="muted">The jar is empty for now — photos, notes and moments will fill it 💗</p>'; return; }
  const m = all[Math.floor(Math.random() * all.length)]; lastPick = m.k;
  const who = (u) => (u === me() ? 'you' : esc(pn()));
  let inner = '';
  if (m.kind === 'photo') { let u = ''; try { u = F().phUrl(m.p); } catch { /* */ } inner = `<div class="jmPic"><img src="${esc(u)}" alt=""></div>${m.cap ? `<p class="jmTxt">${esc(m.cap)}</p>` : ''}`; }
  else if (m.kind === 'moment') inner = `<p class="jmTitle">📖 ${esc(m.title)}</p>${m.body ? `<p class="jmTxt">${esc(m.body.slice(0, 220))}</p>` : ''}`;
  else if (m.kind === 'dream') inner = `<p class="jmTitle">${esc(m.em || '✨')} We did it: ${esc(m.title)}</p>`;
  else inner = `<p class="jmQuote">“${esc(String(m.body).slice(0, 220))}”</p>`;
  const label = { photo: '📸 a photo', moment: '📖 a moment', note: '💌 a love note', grat: '🫙 a thank-you', msg: '💬 something said', dream: '🪣 a dream come true' }[m.kind];
  box.classList.remove('in'); void box.offsetWidth;
  box.innerHTML = `<div class="jmCard">${inner}<small>${label}${m.by ? ` · from ${who(m.by)}` : ''} · ${ago(m.at)}</small></div>`;
  box.classList.add('in');
  setTimeout(() => { if (lively() && window.FX) FX.burstAt(btn, ['✨', '💗'], 6, 50); }, 380);
}

// ======================= 6. text size =======================
const SIZES = [['s', 'Small', 0.92], ['m', 'Normal', 1], ['l', 'Large', 1.1], ['xl', 'XL', 1.2]];
const isIOS = /iP(hone|ad|od)/.test(navigator.platform) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
function applySize() {
  const k = LS('fu_size') || 'm'; const z = (SIZES.find((x) => x[0] === k) || SIZES[1])[2];
  root.dataset.size = k;
  if (isIOS) { root.style.webkitTextSizeAdjust = Math.round(z * 100) + '%'; root.style.removeProperty('--fuZoom'); }
  else root.style.setProperty('--fuZoom', String(z));
}
applySize();

// ======================= 7. compact Home =======================
const compactOn = () => LS('fu_compact') === '1';
function applyCompact() { root.classList.toggle('fuCompact', compactOn()); $$('#tab-home > .fuOpen').forEach((el) => el.classList.remove('fuOpen')); paintCompactBtn(); }
function paintCompactBtn() {
  const hi = $('#homeHi'); if (!hi) return; let b = $('#fuCompactBtn');
  if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'fuCompactBtn'; b.className = 'fuCompactBtn'; hi.after(b); b.onclick = () => { LS('fu_compact', compactOn() ? null : '1'); applyCompact(); hap('tap'); syncSetting(); }; }
  b.innerHTML = compactOn() ? '<i>▤</i> Full view' : '<i>☰</i> Compact';
  b.setAttribute('aria-pressed', String(compactOn()));
}
document.addEventListener('click', (e) => {
  if (!compactOn() || document.body.classList.contains('fuDragging')) return;
  const card = e.target.closest('#tab-home > .card, #tab-home > [id^="fu"]'); if (!card || card.id === 'homeHi' || card.id === 'fuCompactBtn') return;
  if (!card.classList.contains('fuOpen')) { e.preventDefault(); e.stopPropagation(); openFold(card); return; }
  if (e.target.closest('h2')) { e.preventDefault(); e.stopPropagation(); card.style.maxHeight = card.scrollHeight + 'px'; requestAnimationFrame(() => { card.classList.remove('fuOpen'); card.style.maxHeight = ''; }); }
}, true);
function openFold(card) {
  const h0 = card.offsetHeight; card.classList.add('fuOpen'); const h1 = card.scrollHeight;
  if (!lively()) return; card.style.maxHeight = h0 + 'px'; void card.offsetHeight;
  card.style.transition = 'max-height .38s cubic-bezier(.2,.9,.25,1)'; card.style.maxHeight = h1 + 'px';
  setTimeout(() => { card.style.maxHeight = ''; card.style.transition = ''; }, 420); hap('tap');
}

// ======================= 9. card art: a little strip of the theme above each title =======================
function cardArt() {
  const t = theme(); const parts = ((t && (t.parts || t.stick)) || ['💗', '✨', '💕']).filter((x) => /\p{Extended_Pictographic}/u.test(x)).slice(0, 4);
  const set = parts.length ? parts : ['💗', '✨'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="18"><g font-size="12" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${set.map((e, i) => `<text x="${4 + i * 32}" y="${i % 2 ? 13 : 15}" opacity="${i % 2 ? .55 : .8}">${e}</text>`).join('')}</g></svg>`;
  root.style.setProperty('--fuArt', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}

// ======================= 10. follow the phone's dark mode (light themes get a night version) =======================
const DM = matchMedia('(prefers-color-scheme: dark)');
const hexRgb = (h) => { const m = String(h).match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i); if (!m) return null; let x = m[1]; if (x.length === 3) x = x.replace(/./g, '$&$&'); const n = parseInt(x, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, p) => a.map((x, i) => x * (1 - p) + b[i] * p);
const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
function darkFollow() {
  const t = theme(); if (!t) return;
  const want = LS('fu_dark') === '1' && DM.matches && !t.dark;
  if (!want) {
    if (root.dataset.fuDarkened) { Object.entries(t.v).forEach(([k, v]) => root.style.setProperty('--' + k, v)); root.dataset.dark = t.dark ? '1' : '0'; root.style.colorScheme = t.dark ? 'dark' : 'light'; delete root.dataset.fuDarkened; }
    return;
  }
  const ac = hexRgb(t.v.ac) || [231, 84, 128], w = [255, 255, 255];
  const cd = mix([24, 21, 31], ac, .13), bg1 = mix([13, 12, 19], ac, .1), bg2 = mix([22, 18, 30], ac, .2);
  const tx = mix([246, 242, 248], ac, .05), mu = mix([196, 188, 206], ac, .14);
  let act = ac; for (let i = 0; i < 6 && cr(act, cd) < 4.2; i++) act = mix(act, w, .2);
  const V = {
    bg: `linear-gradient(160deg,${toHex(bg1)},${toHex(bg2)} 60%,${toHex(mix(bg2, ac, .08))})`, cd: toHex(cd), tx: toHex(tx), mu: toHex(mu), act: toHex(act),
    sf: toHex(mix(cd, w, .07)), sf2: toHex(mix(cd, w, .11)), sf3: toHex(mix(cd, [0, 0, 0], .18)), deep: toHex(cd), on: '#fff', dg: '#ff7a8a',
    shR: '0,0,0', cdR: cd.map(Math.round).join(','), txR: tx.map(Math.round).join(','), tbg: toHex(tx), tfg: toHex(cd), bubOT: toHex(tx),
    ac2: toHex(mix(ac, w, .25)), ac3: toHex(mix(cd, ac, .45)),
  };
  Object.entries(V).forEach(([k, v]) => root.style.setProperty('--' + k, v));
  root.dataset.dark = '1'; root.dataset.fuDarkened = '1'; root.style.colorScheme = 'dark';
  // some themes paint their cards themselves (paper, parchment…) — those keep their day look rather than mixing
  const host = $('#app') || document.body; const probe = document.createElement('div'); probe.className = 'card'; probe.style.cssText = 'position:absolute;visibility:hidden;left:-999px;top:0;width:10px;height:10px';
  host.appendChild(probe); const bgc = (getComputedStyle(probe).backgroundColor.match(/[\d.]+/g) || []).map(Number); probe.remove();
  if (bgc.length >= 3 && (bgc[3] === undefined || bgc[3] > .5) && lum(bgc) > .4) {
    Object.entries(t.v).forEach(([k, v]) => root.style.setProperty('--' + k, v)); root.dataset.dark = '0'; root.style.colorScheme = 'light'; delete root.dataset.fuDarkened;
  }
}
DM.addEventListener && DM.addEventListener('change', () => { darkFollow(); cardArt(); });

// ======================= settings: text size, compact, dark mode =======================
function settings() {
  const anchor = $('#setReduce') && $('#setReduce').closest('.card'); if (!anchor || $('#fuViewCard')) return;
  const c = document.createElement('div'); c.className = 'card'; c.id = 'fuViewCard';
  c.innerHTML = `<h2>🔠 Text &amp; view</h2>
    <p class="muted">Text size on this phone</p><div class="seg fuSizeSeg" id="fuSizeSeg">${SIZES.map(([k, l]) => `<button type="button" data-sz="${k}">${l}</button>`).join('')}</div>
    <label class="tgl"><input type="checkbox" id="fuCompactSet"> <span>Compact Home <small>cards as slim rows — tap one to open it</small></span></label>
    <label class="tgl"><input type="checkbox" id="fuDarkSet"> <span>Follow phone dark mode <small>light themes get a night version when your phone is dark</small></span></label>`;
  anchor.before(c);
  $('#fuSizeSeg').onclick = (e) => { const b = e.target.closest('[data-sz]'); if (!b) return; LS('fu_size', b.dataset.sz === 'm' ? null : b.dataset.sz); applySize(); syncSetting(); hap('tap'); };
  $('#fuCompactSet').onchange = (e) => { LS('fu_compact', e.target.checked ? '1' : null); applyCompact(); };
  $('#fuDarkSet').onchange = (e) => { LS('fu_dark', e.target.checked ? '1' : null); darkFollow(); cardArt(); if (e.target.checked && !DM.matches) F().toast('It\'ll switch when your phone goes dark 🌙'); };
  syncSetting();
}
function syncSetting() {
  const k = LS('fu_size') || 'm'; $$('#fuSizeSeg [data-sz]').forEach((b) => b.classList.toggle('on', b.dataset.sz === k));
  const cc = $('#fuCompactSet'); if (cc) cc.checked = compactOn(); const dk = $('#fuDarkSet'); if (dk) dk.checked = LS('fu_dark') === '1';
}

// ======================= 11. sounds that match the buzz =======================
// (only when Theme sounds is on; FU_haptic is the single place every "it happened" goes through)
function soundPair() {
  if (!window.FU_haptic || window.FU_haptic._s) return; const h = window.FU_haptic;
  const map = { done: 'done', error: 'del', hug: 'ping' };
  window.FU_haptic = Object.assign((k) => { h(k); if (map[k] && window.FU_P && window.FU_P.sound) window.FU_P.sound(map[k]); }, { _s: 1 });
}

// ======================= 12. they're typing → the chat tab shows it =======================
function typingTab() {
  const ty = $('#chTyping'), btn = $('.nav button[data-tab="chat"]'); if (!ty || !btn || ty.dataset.fuT) return; ty.dataset.fuT = '1';
  if (!$('.fuTyDots', btn)) btn.insertAdjacentHTML('beforeend', '<em class="fuTyDots" aria-hidden="true"><i></i><i></i><i></i></em>');
  const sync = () => btn.classList.toggle('fuTyping', !ty.classList.contains('hidden') && !document.body.classList.contains('inChat'));
  new MutationObserver(sync).observe(ty, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

// ======================= 13. unread peek: her first words while you're scrolled up =======================
function unreadPeek() {
  const down = $('#chDown'), n = $('#chDownN'); if (!down || !n || down.dataset.fuP) return; down.dataset.fuP = '1';
  const pill = document.createElement('button'); pill.type = 'button'; pill.className = 'chPeek hidden'; pill.id = 'chPeek'; down.before(pill);
  let lastN = 0;
  const sync = () => {
    const cnt = parseInt(n.textContent, 10) || 0, vis = !down.classList.contains('hidden');
    if (!vis || !cnt) { pill.classList.add('hidden'); lastN = 0; return; }
    if (cnt > lastN) {
      const m = ((F().CH && F().CH.list) || []).filter((x) => x.sender !== me()).slice(-1)[0];
      if (m) {
        const txt = m.kind === 'text' ? m.body : { voice: '🎙️ Voice note', image: '📷 Photo', video: '🎬 Video', videonote: '⭕ Video note', file: '📎 File' }[m.kind] || 'New message';
        pill.innerHTML = `<b>${esc(F().partnerEmoji ? F().partnerEmoji() : '💗')}</b><span>${esc(String(txt).slice(0, 60))}</span>${cnt > 1 ? `<i>+${cnt - 1}</i>` : ''}`;
        pill.classList.remove('hidden', 'pop'); void pill.offsetWidth; pill.classList.add('pop');
      }
    }
    lastN = cnt;
  };
  pill.onclick = () => { down.click(); pill.classList.add('hidden'); };
  new MutationObserver(sync).observe(down, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sync).observe(n, { childList: true, characterData: true, subtree: true });
}

// ======================= boot =======================
let wrapped = false;
function wrapRenders() {
  const f = F(); if (wrapped || !f || !f.RENDER) return; wrapped = true;
  const R = f.RENDER; const o = R.open_when; R.open_when = (...a) => { const r = o ? o(...a) : undefined; try { owMarks(); } catch { /* */ } return r; };
  R.todos = paintList;
}
function hook() {
  if (!F()) return;
  wrapRenders(); listCard(); jarCard(); paintList(); owVoice(); owMarks(); settings(); paintCompactBtn(); applyCompact(); soundPair(); typingTab(); unreadPeek();
}
document.addEventListener('cc:theme', () => { setTimeout(() => { darkFollow(); cardArt(); }, 30); });
const prevEnter = window.FU_enter;
window.FU_enter = async (...a) => { const p = prevEnter ? prevEnter(...a) : undefined; try { return await p; } finally { hook(); setTimeout(hook, 1200); } };
const boot = () => { darkFollow(); cardArt(); hook(); };
if (document.readyState !== 'loading') setTimeout(boot, 0); else document.addEventListener('DOMContentLoaded', boot);
window.FU_x2 = { paintList, pullMemory, darkFollow, applySize, applyCompact };
})();
