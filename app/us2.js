// For Us v35 — app lock (Face ID / passcode), best time to talk, and "Our month" recap
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const F = () => window.__FU;
const S = () => F() && F().S;
const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LSg = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const LSs = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* */ } };
const motion = () => !(matchMedia('(prefers-reduced-motion: reduce)').matches || LSg('cc_reduce_motion') === '1');
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* */ } };
const pname = () => (window.CC_partnerName && window.CC_partnerName()) || 'Your love';
const themeEm = () => { const t = window.CC_theme && window.CC_theme(); return (t && t.em) || '💞'; };
const used = (k) => { try { window.FU_used && window.FU_used(k); } catch { /* */ } };

// =====================================================================
// 1. APP LOCK — a privacy screen on this phone (Face ID via passkey, PIN fallback)
// =====================================================================
const LOCK_KEY = 'fu_applock';
const lockCfg = () => { try { const c = JSON.parse(LSg(LOCK_KEY) || 'null'); if (c && !c.v2) { LSs(LOCK_KEY, null); return null; } return c; } catch { return null; } }; // v36 test locks used an older hash
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
async function pinHash(pin, salt) { // slow on purpose: a 4-digit code needs it
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode('for-us-lock:' + salt), iterations: 150000, hash: 'SHA-256' }, k, 256));
}
// the passcode is shared by the couple (couple_settings); turning the lock on is per phone
const couplePass = () => { try { const r = F() && F().shRow && F().shRow(); if (r && r.lock_hash && r.lock_salt) return { salt: r.lock_salt, hash: r.lock_hash }; } catch { /* */ } const c = lockCfg(); return c && c.hash ? { salt: c.salt, hash: c.hash } : null; };
async function pinOk(pin) { const p = couplePass(); return !!p && (await pinHash(pin, p.salt)) === p.hash; }
async function faceIdAvailable() { try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; } }
async function faceIdCreate() {
  const cred = await navigator.credentials.create({ publicKey: {
    rp: { name: 'For Us', id: location.hostname }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'for-us-lock', displayName: 'For Us' },
    challenge: crypto.getRandomValues(new Uint8Array(32)), pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000, attestation: 'none',
  } });
  return cred ? b64(cred.rawId) : null;
}
async function faceIdCheck(id) {
  const r = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rpId: location.hostname, allowCredentials: [{ type: 'public-key', id: unb64(id), transports: ['internal'] }], userVerification: 'required', timeout: 60000 } });
  return !!r;
}

let lockEl = null, locked = false, hiddenAt = 0, fails = 0, waitUntil = 0;
function showLock(auto) {
  const c = lockCfg(); if (!c || !c.on || locked) { root.classList.remove('fuLocked'); return; }
  locked = true; root.classList.add('fuLocked');
  lockEl = document.createElement('div'); lockEl.id = 'fuLockScr'; lockEl.setAttribute('role', 'dialog'); lockEl.setAttribute('aria-label', 'For Us is locked');
  lockEl.innerHTML = `<div class="lkIn">
    <div class="lkEm">${esc(themeEm())}</div><h2>For Us</h2><p class="lkSub">Locked on this phone</p>
    <div class="lkDots"><i></i><i></i><i></i><i></i></div><p class="lkMsg"></p>
    <div class="lkPad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-k="${n}">${n}</button>`).join('')}
      <button type="button" class="lkFace${c.cred ? '' : ' off'}" data-k="face" aria-label="Unlock with Face ID">${FACE}</button><button type="button" data-k="0">0</button><button type="button" class="lkDel" data-k="del" aria-label="Delete">⌫</button></div>
  </div>`;
  document.body.appendChild(lockEl);
  requestAnimationFrame(() => lockEl.classList.add('on'));
  let pin = '';
  const dots = () => $$('.lkDots i', lockEl).forEach((d, i) => d.classList.toggle('on', i < pin.length));
  const msg = (t) => { $('.lkMsg', lockEl).textContent = t || ''; };
  const tryPin = async () => {
    if (Date.now() < waitUntil) { msg(`Try again in ${Math.ceil((waitUntil - Date.now()) / 1000)}s`); pin = ''; dots(); return; }
    if (await pinOk(pin)) { unlock(); return; }
    fails++; pin = ''; dots(); buzz([30, 40, 30]); const d = $('.lkDots', lockEl); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake');
    if (fails >= 5) { waitUntil = Date.now() + 30000; fails = 0; msg('Too many tries — wait 30s'); } else msg('Wrong passcode');
  };
  lockEl.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k;
    if (k === 'face') { face(); return; }
    if (k === 'del') { pin = pin.slice(0, -1); dots(); return; }
    if (pin.length >= 4) return; pin += k; buzz(6); dots(); msg('');
    if (pin.length === 4) setTimeout(tryPin, 120);
  });
  const face = async () => { if (!c.cred) return; try { if (await faceIdCheck(c.cred)) unlock(); } catch { msg('Use your passcode'); } };
  if (c.cred && auto !== false) setTimeout(face, 350); // iOS may want a tap first — the Face ID button is there for that
}
function unlock() {
  if (!lockEl) return; locked = false; fails = 0; buzz(10);
  const el = lockEl; lockEl = null; el.classList.add('out'); root.classList.remove('fuLocked');
  setTimeout(() => el.remove(), motion() ? 420 : 0);
}
const root = document.documentElement;
document.addEventListener('visibilitychange', () => {
  const c = lockCfg(); if (!c || !c.on) return;
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (!locked && hiddenAt && Date.now() - hiddenAt >= (c.after || 0)) showLock();
});
const FACE = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9.5 15.5c1.4 1 3.6 1 5 0"/></svg>';

// PIN entry sheet used for setup
function pinSheet(title, sub) {
  return new Promise((res) => {
    F().openModal(`<div class="lkSheet"><h2>${esc(title)}</h2><p class="muted">${esc(sub)}</p><div class="lkDots"><i></i><i></i><i></i><i></i></div>
      <div class="lkPad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-k="${n}">${n}</button>`).join('')}<button type="button" data-k="x" class="lkDel">Cancel</button><button type="button" data-k="0">0</button><button type="button" class="lkDel" data-k="del">⌫</button></div></div>`);
    let pin = ''; const box = $('#modalBox');
    const dots = () => $$('.lkDots i', box).forEach((d, i) => d.classList.toggle('on', i < pin.length));
    box.onclick = (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k;
      if (k === 'x') { F().closeModal(); res(null); return; }
      if (k === 'del') { pin = pin.slice(0, -1); dots(); return; }
      if (pin.length >= 4) return; pin += k; buzz(6); dots();
      if (pin.length === 4) setTimeout(() => res(pin), 160);
    };
  });
}
async function newPasscode(title) {
  const a = await pinSheet(title || 'Choose a passcode', `4 digits — the same on both phones, so ${pname()} can use it too`); if (!a) return null;
  const b = await pinSheet('Once more', 'Type the same 4 digits'); if (!b) return null;
  if (a !== b) { F().closeModal(); F().toast('Those didn\'t match — try again'); return null; }
  F().closeModal(); const salt = b64(crypto.getRandomValues(new Uint8Array(12))); const hash = await pinHash(a, salt);
  await F().saveShared({ lock_salt: salt, lock_hash: hash }, true);
  return { salt, hash };
}
async function setupLock() {
  let pass = couplePass();
  if (!pass) { pass = await newPasscode(); if (!pass) return false; F().notify('generic', 'set an app-lock passcode for For Us 🔒 — ask them for it to lock your phone too'); }
  else {
    let ok = false;
    for (let tries = 0; tries < 3 && !ok; tries++) {
      const pin = await pinSheet(tries ? 'Not quite — try again' : 'Enter your passcode', `It's the same one as ${pname()}'s — ask them if you don't know it`);
      if (!pin) return false; ok = await pinOk(pin); if (!ok) buzz([30, 40, 30]);
    }
    F().closeModal(); if (!ok) { F().toast(`Ask ${pname()} for the passcode 💬`); return false; }
  }
  const cfg = { v2: 1, on: 1, after: 60000, cred: null, salt: pass.salt, hash: pass.hash };
  if (await faceIdAvailable()) { try { cfg.cred = await faceIdCreate(); } catch { /* declined — passcode only */ } }
  LSs(LOCK_KEY, JSON.stringify(cfg));
  F().toast(cfg.cred ? '🔒 App lock on — Face ID + passcode' : '🔒 App lock on — passcode', 3200);
  return true;
}
async function changePasscode() {
  const pin = await pinSheet('Current passcode', 'Enter the passcode you both use now'); if (!pin) return;
  if (!(await pinOk(pin))) { F().closeModal(); F().toast('That\'s not the current passcode'); return; }
  const pass = await newPasscode('New passcode'); if (!pass) return;
  const c = lockCfg(); if (c) LSs(LOCK_KEY, JSON.stringify({ ...c, ...pass }));
  F().notify('generic', 'changed the app-lock passcode 🔒 — ask them for the new one');
  F().toast('Passcode changed on both phones 🔒');
}
function lockSettings() {
  const meTab = $('#tab-me'); if (!meTab || $('#fuAppLock')) return;
  const anchor = $('#fuLockCard') || [...meTab.querySelectorAll(':scope > .card')][1] || meTab.querySelector('.card'); if (!anchor) return;
  anchor.insertAdjacentHTML('beforebegin', `<div class="card" id="fuAppLock"><h2>🔒 App lock</h2><div id="fuAppLockIn"></div></div>`);
  paintLockSettings();
}
function paintLockSettings() {
  const box = $('#fuAppLockIn'); if (!box) return; const c = lockCfg(); const has = !!couplePass(); const on = !!(c && c.on);
  // keep this phone's copy of the shared passcode fresh (works offline too)
  if (on) { const p = couplePass(); if (p && (p.hash !== c.hash)) LSs(LOCK_KEY, JSON.stringify({ ...c, ...p })); }
  box.innerHTML = `<p class="muted">${has ? `You two share one passcode. ${on ? '' : `Turn it on here with the same code ${esc(pname())} uses.`}` : `Set a passcode for both of you — ${esc(pname())} turns it on with the same code.`} Face ID works too.</p>
    <label class="tgl"><input type="checkbox" id="lkOn" ${on ? 'checked' : ''}> <span>Lock this phone with Face ID / passcode</span></label>
    ${on ? `<div class="lkRow"><span>Lock after</span><div class="seg" id="lkAfter">${[[0, 'Right away'], [60000, '1 min'], [300000, '5 min']].map(([v, l]) => `<button type="button" data-v="${v}" class="${(c.after || 0) === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>` : ''}
    <div class="lkBtns">${on ? '<button type="button" class="soft mini" id="lkTest">Try it</button>' : ''}${has ? '<button type="button" class="soft mini" id="lkPin">Change passcode</button>' : ''}</div>`;
  $('#lkOn').onchange = async (e) => {
    if (e.target.checked) { const ok = await setupLock(); if (!ok) e.target.checked = false; }
    else { const c2 = lockCfg(); if (c2) LSs(LOCK_KEY, JSON.stringify({ ...c2, on: 0 })); F().toast('App lock off on this phone'); }
    paintLockSettings();
  };
  $$('#lkAfter button').forEach((b) => b.onclick = () => { const c2 = lockCfg(); c2.after = Number(b.dataset.v); LSs(LOCK_KEY, JSON.stringify(c2)); paintLockSettings(); });
  const t = $('#lkTest'); if (t) t.onclick = () => showLock();
  const p = $('#lkPin'); if (p) p.onclick = async () => { await changePasscode(); paintLockSettings(); };
}

// =====================================================================
// 2. BEST TIME TO TALK — each sets free hours; the app finds the overlap (time zones included)
// =====================================================================
const PREFS = { rows: [], loaded: false };
const myTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const DEF_OFF = (tz) => (/Cairo|Riyadh|Kuwait|Qatar|Bahrain|Muscat|Baghdad|Amman|Damascus|Algiers|Khartoum|Tripoli/.test(tz || '') ? [5, 6] : [6, 0]);
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
async function loadPrefs() {
  try { const { data, error } = await F().sb.from('member_prefs').select('created_by,tz,free'); if (!error) { PREFS.rows = data || []; PREFS.loaded = true; try { F().cacheSet && F().cacheSet('fu_prefs', PREFS.rows); } catch { /* */ } } } catch { /* offline */ }
  if (!PREFS.loaded) { try { const c = F().cacheGet && F().cacheGet('fu_prefs'); const v = Array.isArray(c) ? c : c && Array.isArray(c.data) ? c.data : null; if (v) PREFS.rows = v; } catch { /* */ } }
}
const prefOf = (uid) => (Array.isArray(PREFS.rows) ? PREFS.rows : []).find((r) => r.created_by === uid);
const mine = () => { const s = S(); const r = s && prefOf(s.user.id); return r && r.free ? r.free : null; };
const theirs = () => { const s = S(); const r = s && s.partner && prefOf(s.partner.id); return r && r.free ? { ...r.free, tz: r.tz } : null; };
function partsAt(tz, t) { // weekday + hour for an instant, in a time zone
  try { const p = new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(t);
    return { dow: WD.indexOf(p.find((x) => x.type === 'weekday').value), h: Number(p.find((x) => x.type === 'hour').value) % 24 }; } catch { return { dow: t.getDay(), h: t.getHours() }; }
}
const freeAt = (pref, tz, t) => { if (!pref) return false; const { dow, h } = partsAt(tz, t); const off = (pref.off || DEF_OFF(tz)).includes(dow); return ((off ? pref.o : pref.w) || []).includes(h); };
function dayRows(dayStart) { // 24 hours of my local day: [me, them, both]
  const me = mine(), th = theirs(), out = [];
  for (let h = 0; h < 24; h++) { const t = new Date(dayStart.getTime()); t.setHours(h, 30, 0, 0); const a = freeAt(me, myTz(), t), b = freeAt(th, th && th.tz, t); out.push([a, b, a && b]); }
  return out;
}
const hLabel = (h) => (h % 12 || 12) + (h < 12 ? ' AM' : ' PM');
function nextOverlap(fromDays = 7) {
  const now = new Date(); const start = new Date(now); start.setMinutes(0, 0, 0);
  for (let i = 0; i < fromDays * 24; i++) {
    const t = new Date(start.getTime() + i * 3600e3); const mid = new Date(t.getTime() + 1800e3);
    if (freeAt(mine(), myTz(), mid) && freeAt(theirs(), theirs() && theirs().tz, mid)) {
      let j = i; while (j < i + 24 && freeAt(mine(), myTz(), new Date(start.getTime() + (j + 1) * 3600e3 + 1800e3)) && freeAt(theirs(), theirs().tz, new Date(start.getTime() + (j + 1) * 3600e3 + 1800e3))) j++;
      return { from: t, to: new Date(start.getTime() + (j + 1) * 3600e3), now: i === 0 };
    }
  }
  return null;
}
function relDay(d) { const a = new Date(); a.setHours(0, 0, 0, 0); const b = new Date(d); b.setHours(0, 0, 0, 0); const n = Math.round((b - a) / 864e5); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long' }); }
function overlapText() {
  if (!mine()) return { t: 'Set your free hours to find your best time to talk', k: 'set' };
  if (!theirs()) return { t: `Waiting for ${pname()} to add theirs`, k: 'wait' };
  const o = nextOverlap(); if (!o) return { t: 'No overlap this week — maybe adjust your hours?', k: 'none' };
  if (o.now) return { t: `You're both free now, until ${hLabel(o.to.getHours())} 💬`, k: 'now' };
  const mins = Math.round((o.from - Date.now()) / 60000); const inTxt = mins < 60 ? `in ${mins} min` : mins < 24 * 60 ? `in ${Math.round(mins / 60)}h` : relDay(o.from);
  return { t: `Next free together: ${hLabel(o.from.getHours())}–${hLabel(o.to.getHours())} · ${inTxt}`, k: 'next' };
}
function paintTalkHint() {
  const home = $('#tab-home'); if (!home || !S() || !S().couple) return;
  let el = $('#fuTalkHint'); const o = overlapText();
  if (!mine() || !theirs()) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('button'); el.type = 'button'; el.id = 'fuTalkHint'; el.className = 'fuTalkHint'; const hi = $('#homeHi'); if (hi && hi.parentNode === home) hi.after(el); else home.prepend(el); el.onclick = talkSheet; }
  el.classList.toggle('now', o.k === 'now'); el.innerHTML = `<i>${o.k === 'now' ? '💬' : '🕰️'}</i><span>${esc(o.t)}</span>`;
}
function bars(rows, nowH) {
  const lane = (k, cls) => `<div class="tkLane ${cls}">${rows.map((r, h) => `<i class="${r[k] ? 'on' : ''}${h === nowH ? ' nowH' : ''}" style="--h:${h}"></i>`).join('')}</div>`;
  return `<div class="tkBars"><div class="tkRow"><b>You</b>${lane(0, 'me')}</div><div class="tkRow"><b>${esc(pname())}</b>${lane(1, 'th')}</div><div class="tkRow both"><b>Both</b>${lane(2, 'bo')}</div>
    <div class="tkAxis"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span></div></div>`;
}
let talkDay = 0;
async function talkSheet() {
  used('fu:talk'); if (!PREFS.loaded) await loadPrefs();
  const d0 = new Date(); d0.setHours(0, 0, 0, 0); const day = new Date(d0.getTime() + talkDay * 864e5);
  const rows = dayRows(day); const o = overlapText(); const nowH = talkDay === 0 ? new Date().getHours() : -1;
  const chips = Array.from({ length: 7 }, (_, i) => { const d = new Date(d0.getTime() + i * 864e5); return `<button type="button" data-d="${i}" class="${i === talkDay ? 'on' : ''}">${i === 0 ? 'Today' : i === 1 ? 'Tmrw' : WD[d.getDay()]}</button>`; }).join('');
  const html = `<div class="tkSheet"><h2>🕰️ Best time to talk</h2>
    <p class="tkSum ${o.k}">${esc(o.t)}</p>
    <div class="chips tkDays">${chips}</div>
    ${bars(rows, nowH)}
    ${theirs() && theirs().tz && theirs().tz !== myTz() ? `<p class="muted tkTz">Shown in your time. ${esc(pname())} is on ${esc(theirs().tz.split('/').pop().replace(/_/g, ' '))} time.</p>` : ''}
    <div class="tkBtns"><button type="button" id="tkEdit">${mine() ? 'Edit my free hours' : 'Set my free hours'}</button>
    ${mine() && !theirs() ? `<button type="button" class="soft" id="tkAsk">Ask ${esc(pname())} to add theirs</button>` : ''}
    ${o.k === 'now' ? '<button type="button" class="soft" id="tkChat">Open chat 💬</button>' : ''}<button type="button" class="soft" data-close>Close</button></div></div>`;
  const box = $('#modalBox'); const open = !$('#modal').classList.contains('hidden') && box.querySelector('.tkSheet');
  if (open) { box.innerHTML = html; } else F().openModal(html);
  bindTalk();
}
function bindTalk() {
  const box = $('#modalBox');
  $$('.tkDays button', box).forEach((b) => b.onclick = () => { talkDay = Number(b.dataset.d); talkSheet(); });
  const e = $('#tkEdit', box); if (e) e.onclick = editHours;
  const a = $('#tkAsk', box); if (a) a.onclick = () => { F().notify('talk', 'added their free hours — add yours to see your best time to talk 🕰️'); F().toast(`Asked ${pname()} 💌`); a.disabled = true; };
  const c = $('#tkChat', box); if (c) c.onclick = () => { F().closeModal(); F().goTab('chat'); };
  $$('[data-close]', box).forEach((b) => b.onclick = () => F().closeModal());
}
function editHours() {
  const cur = mine() || { off: DEF_OFF(myTz()), w: [19, 20, 21, 22], o: [11, 12, 13, 17, 18, 19, 20, 21, 22] };
  const st = { off: [...(cur.off || DEF_OFF(myTz()))], w: [...(cur.w || [])], o: [...(cur.o || [])], tab: 'w' };
  const paint = () => {
    $('#modalBox').innerHTML = `<div class="tkSheet tkEditS"><h2>My free hours</h2>
      <p class="muted">Tap or drag across the hours you're usually free to talk.</p>
      <div class="seg tkTabs"><button type="button" data-t="w" class="${st.tab === 'w' ? 'on' : ''}">Work days</button><button type="button" data-t="o" class="${st.tab === 'o' ? 'on' : ''}">Days off</button></div>
      <div class="tkOffRow"><span>My days off</span><div class="chips">${WD.map((d, i) => `<span data-off="${i}" class="${st.off.includes(i) ? 'on' : ''}">${d}</span>`).join('')}</div></div>
      <div class="tkGrid" id="tkGrid">${Array.from({ length: 24 }, (_, h) => `<button type="button" data-h="${h}" class="${st[st.tab].includes(h) ? 'on' : ''}">${hLabel(h).replace(' ', '')}</button>`).join('')}</div>
      <div class="chips tkPre"><span data-p="eve">🌙 Evenings</span><span data-p="morn">☀️ Mornings</span><span data-p="lunch">🥪 Lunch</span><span data-p="clear">Clear</span></div>
      <div class="tkBtns"><button type="button" id="tkSave">Save</button><button type="button" class="soft" id="tkBack">Back</button></div></div>`;
    bindEdit();
  };
  const bindEdit = () => {
    const box = $('#modalBox');
    $$('.tkTabs button', box).forEach((b) => b.onclick = () => { st.tab = b.dataset.t; paint(); });
    $$('[data-off]', box).forEach((b) => b.onclick = () => { const i = Number(b.dataset.off); st.off = st.off.includes(i) ? st.off.filter((x) => x !== i) : [...st.off, i]; b.classList.toggle('on'); });
    $$('[data-p]', box).forEach((b) => b.onclick = () => { const P = { eve: [19, 20, 21, 22, 23], morn: [7, 8, 9], lunch: [12, 13], clear: [] }[b.dataset.p]; st[st.tab] = b.dataset.p === 'clear' ? [] : [...new Set([...st[st.tab], ...P])]; paint(); });
    // drag-paint the hours
    const grid = $('#tkGrid', box); let mode = null;
    const set = (btn) => { if (!btn || !btn.dataset.h) return; const h = Number(btn.dataset.h); const has = st[st.tab].includes(h); if (mode && !has) st[st.tab].push(h); if (!mode && has) st[st.tab] = st[st.tab].filter((x) => x !== h); btn.classList.toggle('on', mode); };
    grid.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-h]'); if (!b) return; e.preventDefault(); mode = !b.classList.contains('on'); set(b); buzz(5); grid.setPointerCapture(e.pointerId); });
    grid.addEventListener('pointermove', (e) => { if (mode === null) return; const b = document.elementFromPoint(e.clientX, e.clientY); const h = b && b.closest && b.closest('[data-h]'); if (h && h.classList.contains('on') !== mode) { set(h); buzz(4); } });
    const end = () => { mode = null; }; grid.addEventListener('pointerup', end); grid.addEventListener('pointercancel', end);
    grid.addEventListener('click', (e) => e.preventDefault());
    $('#tkBack', box).onclick = talkSheet;
    $('#tkSave', box).onclick = async () => {
      const s = S(); const free = { off: st.off.sort(), w: st.w.sort((a, b) => a - b), o: st.o.sort((a, b) => a - b) };
      const row = { couple_id: s.couple.id, created_by: s.user.id, tz: myTz(), free, updated_at: new Date().toISOString() };
      const { error } = await F().sb.from('member_prefs').upsert(row, { onConflict: 'created_by' });
      if (error) { F().toast('Couldn\'t save — try again'); return; }
      const i = PREFS.rows.findIndex((r) => r.created_by === s.user.id); if (i >= 0) PREFS.rows[i] = { ...PREFS.rows[i], ...row }; else PREFS.rows.push(row);
      F().toast('Saved 🕰️'); paintTalkHint(); talkSheet();
      if (!theirs()) F().notify('talk', 'added their free hours — add yours to see your best time to talk 🕰️');
    };
  };
  paint();
}

// =====================================================================
// 3. OUR MONTH — a story-style recap of a month together
// =====================================================================
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EMOJI_RE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/gu;
const top = (arr, n = 1) => { const m = new Map(); arr.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n); };
const inMonth = (d, y, m) => { if (!d) return false; const x = new Date(String(d).length <= 10 ? d + 'T12:00:00' : d); return x.getFullYear() === y && x.getMonth() === m; };
async function gather(y, m) {
  const s = S(), me = s.user.id, them = s.partner && s.partner.id, sb = F().sb;
  const a = new Date(y, m, 1).toISOString(), b = new Date(y, m + 1, 1).toISOString();
  const safe = (p) => Promise.race([p, new Promise((r) => setTimeout(() => r({ data: null }), 8000))]).catch(() => ({ data: null }));
  const [msgs, pings, touches, nights] = await Promise.all([
    safe(sb.from('messages').select('sender,created_at,kind,body').gte('created_at', a).lt('created_at', b).eq('deleted', false).limit(6000)),
    safe(sb.from('pings').select('created_by').gte('created_at', a).lt('created_at', b).limit(5000)),
    safe(sb.from('touches').select('created_by').gte('created_at', a).lt('created_at', b).limit(3000)),
    safe(sb.from('goodnights').select('created_by').eq('kind', 'night').gte('created_at', a).lt('created_at', b).limit(200)),
  ]);
  const M = msgs.data || []; const D = s.data || {};
  const byDay = top(M.map((x) => new Date(x.created_at).toDateString()))[0];
  const byHour = top(M.map((x) => new Date(x.created_at).getHours()))[0];
  const emo = []; M.forEach((x) => { if (x.kind === 'text' && x.body && !String(x.body).startsWith('e1:')) (String(x.body).match(EMOJI_RE) || []).forEach((e) => emo.push(e)); });
  const moods = (D.moods || []).filter((x) => inMonth(x.day, y, m));
  const ans = (D.daily_answers || []).filter((x) => inMonth(x.day, y, m));
  const ansDays = new Map(); ans.forEach((x) => { const k = String(x.day); ansDays.set(k, (ansDays.get(k) || new Set()).add(x.created_by)); });
  const bothDays = [...ansDays.values()].filter((v) => v.size >= 2).length;
  const grat = (D.gratitude || []).filter((x) => inMonth(x.day || x.created_at, y, m));
  const toMe = grat.filter((x) => x.created_by === them && x.body && !String(x.body).startsWith('e1:'));
  const photos = (D.photos || []).filter((p) => inMonth(p.created_at, y, m));
  const pics = photos.filter((p) => p.media_type !== 'video' && !/video/.test(p.media_type || '')).map((p) => { try { return F().phUrl(p); } catch { return ''; } }).filter(Boolean).slice(0, 6);
  const moments = [...(D.timeline || []).filter((x) => inMonth(x.event_date, y, m)).map((x) => x.title), ...(D.milestones || []).filter((x) => inMonth(x.day, y, m)).map((x) => `${x.emoji || '✨'} ${x.title}`)].filter(Boolean).slice(0, 4);
  return {
    y, m, msgs: M.length, mineN: M.filter((x) => x.sender === me).length, theirN: M.filter((x) => x.sender === them).length,
    voice: M.filter((x) => /voice|videonote/.test(x.kind || '')).length, busiest: byDay && byDay[1] > 1 ? byDay[0] : null, hour: byHour ? byHour[0] : null,
    emoji: top(emo, 3).map((e) => e[0]), pings: (pings.data || []).length, touches: (touches.data || []).length, nights: (nights.data || []).length,
    myMood: (top(moods.filter((x) => x.created_by === me).map((x) => x.mood))[0] || [])[0], theirMood: (top(moods.filter((x) => x.created_by === them).map((x) => x.mood))[0] || [])[0],
    bothDays, ansN: ans.length, gratN: grat.length, quote: toMe.length ? toMe[Math.floor(Math.random() * toMe.length)].body : null,
    photosN: photos.length, pics, moments, streak: (s.streak && s.streak.best) || 0,
  };
}
function slidesFor(r) {
  const mon = MONTHS[r.m], next = MONTHS[(r.m + 1) % 12], p = esc(pname()), em = esc(themeEm()), out = [];
  out.push(`<div class="rcBig">${em}</div><h1>Our ${mon}</h1><p>A little look back at your month together</p><small class="rcHint">Tap to continue</small>`);
  if (r.msgs) out.push(`<p class="rcK">You talked</p><div class="rcNum" data-n="${r.msgs}">0</div><p>messages</p>
    <div class="rcSplit"><div><b data-n="${r.mineN}">0</b><small>from you</small></div><div><b data-n="${r.theirN}">0</b><small>from ${p}</small></div></div>
    ${r.busiest ? `<p class="rcFoot">Chattiest day: <b>${esc(new Date(r.busiest).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }))}</b></p>` : ''}
    ${r.hour != null ? `<p class="rcFoot">Favourite time to talk: <b>${esc(((r.hour % 12) || 12) + (r.hour < 12 ? ' AM' : ' PM'))}</b></p>` : ''}`);
  if (r.emoji.length) out.push(`<p class="rcK">Your month in emoji</p><div class="rcEmo">${r.emoji.map((e, i) => `<span style="--i:${i}">${esc(e)}</span>`).join('')}</div>${r.voice ? `<p class="rcFoot">plus <b>${r.voice}</b> voice notes 🎙️</p>` : ''}`);
  if (r.pings + r.touches + r.nights) out.push(`<p class="rcK">Little love taps</p><div class="rcTrio">
    <div><i>💗</i><b data-n="${r.pings}">0</b><small>pings</small></div><div><i>🫶</i><b data-n="${r.touches}">0</b><small>touches</small></div><div><i>🌙</i><b data-n="${r.nights}">0</b><small>goodnights</small></div></div>`);
  if (r.myMood || r.theirMood) out.push(`<p class="rcK">How you felt</p><div class="rcMoods"><div><span>${esc(r.myMood || '—')}</span><small>You, mostly</small></div><div><span>${esc(r.theirMood || '—')}</span><small>${p}, mostly</small></div></div>`);
  if (r.bothDays || r.ansN) out.push(`<p class="rcK">You showed up</p><div class="rcNum" data-n="${r.bothDays}">0</div><p>days you both did the ritual</p>${r.streak ? `<p class="rcFoot">Best streak so far: <b>${r.streak} 🔥</b></p>` : ''}`);
  if (r.pics.length) out.push(`<p class="rcK">${r.photosN} photo${r.photosN === 1 ? '' : 's'} & videos</p><div class="rcPics n${r.pics.length}">${r.pics.map((u, i) => `<img src="${esc(u)}" alt="" style="--i:${i}">`).join('')}</div>`);
  if (r.quote) out.push(`<p class="rcK">${p} was grateful for</p><blockquote class="rcQuote">“${esc(r.quote)}”</blockquote>`);
  if (r.moments.length) out.push(`<p class="rcK">Moments to remember</p><ul class="rcList">${r.moments.map((t, i) => `<li style="--i:${i}">${esc(t)}</li>`).join('')}</ul>`);
  if (out.length === 1) out.push(`<div class="rcBig">🌱</div><h1>A quiet month</h1><p>Every story starts somewhere — next month is yours to fill.</p>`);
  out.push(`<div class="rcBig">💞</div><h1>Here's to ${next}</h1><p>Same two of you. Even closer.</p><div class="rcEnd"><button type="button" data-rc="again">Watch again</button><button type="button" class="soft" data-rc="close">Close</button></div>`);
  return out;
}
let rc = null;
async function openRecap(y, m) {
  used('fu:month'); closeRecap(true);
  const o = document.createElement('div'); o.id = 'fuRecap'; o.innerHTML = `<div class="rcBars"></div><button type="button" class="rcX" aria-label="Close">✕</button><div class="rcStage"><div class="rcSlide rcLoad"><div class="rcBig">${esc(themeEm())}</div><p>Gathering your month…</p></div></div>`;
  document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('on'));
  const data = await gather(y, m).catch(() => null); if (!o.isConnected) return;
  const slides = slidesFor(data || { y, m, msgs: 0, emoji: [], pings: 0, touches: 0, nights: 0, pics: [], moments: [] });
  rc = { o, slides, i: 0, t: 0, paused: false, y, m };
  LSs('fu_recap_seen_' + y + '-' + m, '1'); const card = $('#fuRecapCard'); if (card && y === lastMonth().y && m === lastMonth().m) card.remove();
  o.querySelector('.rcBars').innerHTML = slides.map(() => '<i><b></b></i>').join('');
  show(0);
  // tap left / right, hold to pause, swipe down to close
  let x0 = 0, y0 = 0, t0 = 0, held = 0;
  o.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); held = setTimeout(() => pause(true), 220); });
  o.addEventListener('pointerup', (e) => {
    clearTimeout(held); if (e.target.closest('button')) return; const dy = e.clientY - y0, dt = Date.now() - t0;
    if (rc && rc.paused) { pause(false); if (dt > 220) return; }
    if (dy > 90) { closeRecap(); return; }
    if (dt < 400) show(e.clientX < innerWidth / 3 ? rc.i - 1 : rc.i + 1);
  });
  o.querySelector('.rcX').onclick = () => closeRecap();
}
function show(i) {
  if (!rc) return; if (i >= rc.slides.length) { closeRecap(); return; } i = Math.max(0, i); rc.i = i; clearTimeout(rc.t);
  const st = rc.o.querySelector('.rcStage'); const old = st.querySelector('.rcSlide');
  const el = document.createElement('div'); el.className = 'rcSlide'; el.innerHTML = rc.slides[i]; st.appendChild(el);
  if (old) { old.classList.add('gone'); setTimeout(() => old.remove(), 450); }
  requestAnimationFrame(() => el.classList.add('in'));
  $$('[data-n]', el).forEach((n, k) => { const v = Number(n.dataset.n); if (window.FX && FX.countUp && motion()) setTimeout(() => FX.countUp(n, v, 900), 250 + k * 120); else n.textContent = v; });
  $$('[data-rc]', el).forEach((b) => b.onclick = (e) => { e.stopPropagation(); if (b.dataset.rc === 'again') show(0); else closeRecap(); });
  const bars = $$('.rcBars i', rc.o); bars.forEach((b, k) => { b.classList.toggle('done', k < i); b.classList.remove('run'); });
  const last = i === rc.slides.length - 1; const dur = last ? 0 : i === 0 ? 4200 : 5600;
  if (!last) { void bars[i].offsetWidth; bars[i].style.setProperty('--d', dur + 'ms'); bars[i].classList.add('run'); rc.t = setTimeout(() => show(i + 1), dur); rc.left = dur; rc.at = Date.now(); }
  else { bars[i].classList.add('done'); if (window.FX && motion()) { FX.confetti(70); } }
  buzz(4);
}
function pause(on) {
  if (!rc) return; rc.paused = on; const bar = $$('.rcBars i', rc.o)[rc.i]; rc.o.classList.toggle('paused', on);
  if (on) { clearTimeout(rc.t); rc.left = Math.max(300, rc.left - (Date.now() - rc.at)); }
  else if (rc.i < rc.slides.length - 1) { rc.at = Date.now(); rc.t = setTimeout(() => show(rc.i + 1), rc.left); }
  if (bar) bar.style.animationPlayState = on ? 'paused' : 'running';
}
function closeRecap(now) {
  if (!rc && !$('#fuRecap')) return; const o = (rc && rc.o) || $('#fuRecap'); if (rc) clearTimeout(rc.t); rc = null;
  if (now || !motion()) { o.remove(); return; } o.classList.remove('on'); o.classList.add('out'); setTimeout(() => o.remove(), 380);
}
const lastMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return { y: d.getFullYear(), m: d.getMonth() }; };
function monthPicker() {
  const now = new Date(); const opts = [];
  for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); opts.push({ y: d.getFullYear(), m: d.getMonth(), label: i === 0 ? `${MONTHS[d.getMonth()]} so far` : `${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}` }); }
  F().openModal(`<div class="rcPick"><h2>📖 Our month</h2><p class="muted">A story of your month together — messages, moods, photos and little moments.</p>
    <div class="rcPickL">${opts.map((o, i) => `<button type="button" data-i="${i}" class="${i ? 'soft' : ''}">${esc(o.label)}</button>`).join('')}</div><button type="button" class="soft" data-close>Close</button></div>`);
  $$('#modalBox [data-i]').forEach((b) => b.onclick = () => { const o = opts[Number(b.dataset.i)]; F().closeModal(); setTimeout(() => openRecap(o.y, o.m), 250); });
  $$('#modalBox [data-close]').forEach((b) => b.onclick = () => F().closeModal());
}
function recapCard() {
  const home = $('#tab-home'); if (!home || !S() || !S().couple) return;
  const d = new Date(); const lm = lastMonth(); const seen = LSg('fu_recap_seen_' + lm.y + '-' + lm.m);
  let c = $('#fuRecapCard');
  if (d.getDate() > 7 || seen) { if (c) c.remove(); return; }
  if (c) return;
  c = document.createElement('div'); c.id = 'fuRecapCard'; c.className = 'card fuRecapCard';
  c.innerHTML = `<div class="rcCardIn"><span class="rcCardEm">📖</span><div><b>Your ${MONTHS[lm.m]}, together</b><small>A little story of last month is ready</small></div><button type="button">Watch</button></div>`;
  c.querySelector('button').onclick = () => openRecap(lm.y, lm.m);
  const hi = $('#homeHi'); if (hi && hi.parentNode === home) hi.after(c); else home.prepend(c);
}

// =====================================================================
// tiles + boot
// =====================================================================
function tiles() {
  const sec = $('#fuUsSec'); const grid = sec && sec.nextElementSibling; if (!grid || $('[data-fu="talk"]')) return;
  grid.insertAdjacentHTML('beforeend', `<button class="gtile" data-fu="talk"><b>🕰️</b>Best time to talk<small id="fb-talk"></small></button><button class="gtile" data-fu="month"><b>📖</b>Our month<small id="fb-month"></small></button>`);
  $('[data-fu="talk"]').onclick = () => { talkDay = 0; talkSheet(); };
  $('[data-fu="month"]').onclick = monthPicker;
}
async function run() {
  tiles(); lockSettings(); paintLockSettings(); recapCard();
  if (S() && S().couple) { await loadPrefs(); paintTalkHint(); }
}
setInterval(() => { if (!document.hidden) paintTalkHint(); }, 5 * 60 * 1000);
const prevEnter = window.FU_enter;
window.FU_enter = async (...a) => { const r = prevEnter ? prevEnter(...a) : undefined; try { return await r; } finally { run(); } };
window.FU_us2 = { openRecap, talkSheet, showLock, gather, slidesFor, PREFS };
// lock as early as possible on open
if (lockCfg() && lockCfg().on) { const go = () => showLock(); if (document.body) go(); else document.addEventListener('DOMContentLoaded', go); }
else root.classList.remove('fuLocked');
if (document.readyState !== 'loading') setTimeout(() => { tiles(); lockSettings(); }, 400); else document.addEventListener('DOMContentLoaded', () => setTimeout(() => { tiles(); lockSettings(); }, 400));
})();
