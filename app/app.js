(() => {
'use strict';
const { url, key } = window.CC_CONFIG;
const D = window.CC_DATA;
// offline: fail fast (as an abort, so supabase-js doesn't spend ~15s on retry backoff) and let the cache/queue take over
const offFetch = (u, o) => (navigator.onLine ? fetch(u, o) : Promise.reject(Object.assign(new Error('Failed to fetch (offline)'), { name: 'AbortError' })));
const sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }, global: { fetch: offFetch } });

// pretty dialogs
function uiDialog(msg, withInput) {
  return new Promise(res => {
    const o = document.createElement('div'); o.className = 'uiDlg';
    o.innerHTML = `<div class="uiBox"><div class="uiHeart">💕</div><p></p>${withInput ? '<input class="uiIn" maxlength="300" placeholder="Type here…">' : ''}<div class="uiBtns"><button class="uiNo">Cancel</button><button class="uiYes">OK</button></div></div>`;
    o.querySelector('p').textContent = msg;
    document.body.appendChild(o);
    const inp = o.querySelector('.uiIn'); setTimeout(() => (inp || o.querySelector('.uiYes')).focus(), 50);
    const done = v => { o.classList.add('out'); setTimeout(() => o.remove(), 190); res(v); };
    o.querySelector('.uiYes').onclick = () => done(withInput ? inp.value : true);
    o.querySelector('.uiNo').onclick = () => done(withInput ? null : false);
    o.onclick = e => { if (e.target === o) done(withInput ? null : false); };
    if (inp) inp.onkeydown = e => { if (e.key === 'Enter') done(inp.value); };
  });
}
const uiConfirm = m => uiDialog(m, false);
const uiPrompt = m => uiDialog(m, true);
window.googleSignIn = async () => {
  const m = document.getElementById('authMsg'); if (m) m.textContent = 'Opening Google…';
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname + location.search } });
  if (error && m) m.textContent = 'Google sign-in failed: ' + error.message;
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (m, ms = 2600) => { const t = $('#toast'); if (window.__ccQueuedAt && Date.now() - window.__ccQueuedAt < 1500 && !/offline|online|internet/i.test(m)) m += ' · saved offline, will sync 📴'; t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms); };
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const show = (id) => { $$('.view').forEach((v) => v.classList.add('hidden')); $(id).classList.remove('hidden'); if (id === '#mainView' || id === '#pairView') setTimeout(() => window.CC_maybeInstall && CC_maybeInstall(), 2500); };
// ---- v24 smoothness helpers ----
(() => {
  let tick = 0; // header tightens once you scroll
  addEventListener('scroll', () => { if (tick) return; tick = requestAnimationFrame(() => { tick = 0; document.body.classList.toggle('scrolled', window.scrollY > 12); }); }, { passive: true });
  // images fade in when they arrive
  document.addEventListener('load', (e) => { const t = e.target; if (t && t.tagName === 'IMG') t.classList.add('ld'); }, true);
  document.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG') t.classList.add('ld'); }, true);
  // keyboard awareness: tuck the nav away while typing (outside chat)
  // iOS home-screen apps shrink innerHeight with the keyboard, so compare against the tallest viewport we've seen instead
  let vvBase = 0; addEventListener('orientationchange', () => { vvBase = 0; });
  window.FU_kb = () => {
    const vv = window.visualViewport; if (!vv) return false;
    const a = document.activeElement, ed = !!a && a.matches('textarea,[contenteditable=true],input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=file]):not([type=color])');
    if (!ed) vvBase = Math.max(vvBase, vv.height, innerHeight);
    return innerHeight - vv.height > 120 || (ed && vvBase - vv.height > 120);
  };
  if (window.visualViewport) visualViewport.addEventListener('resize', () => { document.body.classList.toggle('kbOpen', window.FU_kb()); });
  document.addEventListener('focusout', () => setTimeout(() => document.body.classList.toggle('kbOpen', window.FU_kb()), 120));
  // tiny haptic ticks where touch feels physical
  const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* */ } };
  document.addEventListener('click', (e) => { if (e.target.closest('.nav button,.seg button,.gtile,.chips span,.emojis span')) buzz(6); }, true);
  document.addEventListener('change', (e) => { if (e.target.matches('.tgl input[type=checkbox]')) buzz(10); }, true);
})();
const loadScript = (src) => new Promise((res) => { const el = document.createElement('script'); el.src = src; el.onload = el.onerror = () => res(); document.head.appendChild(el); });
const errMsg = (e) => (e && (e.message || e.error_description)) || String(e);

// ---- state ----
const S = { user: null, me: null, couple: null, partner: null, data: {}, channel: null, pairChannel: null, signedUrls: {} };
const params = new URLSearchParams(location.search);
const ACTION_KEY = 'cc_pending_action';
if (params.get('action')) {
  localStorage.setItem(ACTION_KEY, params.get('action'));
  history.replaceState(null, '', location.pathname + location.hash.replace(/^#$/, ''));
}

// ================= AUTH =================
let mode = 'in';
function setMode(m) {
  mode = m;
  $('#tabSignIn').classList.toggle('on', m === 'in');
  $('#tabSignUp').classList.toggle('on', m === 'up');
  $('#signUpFields').classList.toggle('hidden', m === 'in');
  $('#authBtn').textContent = m === 'in' ? 'Sign in 💌' : 'Create account 💕';
  $('#password').autocomplete = m === 'in' ? 'current-password' : 'new-password';
  $('#authMsg').textContent = '';
}
$('#tabSignIn').onclick = () => setMode('in');
$('#tabSignUp').onclick = () => setMode('up');
$('#authForm').onsubmit = async (e) => {
  e.preventDefault();
  const email = $('#email').value.trim(), password = $('#password').value;
  const btn = $('#authBtn'); btn.disabled = true; $('#authMsg').textContent = '';
  try {
    if (mode === 'in') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const username = $('#suUser').value.trim().toLowerCase();
      if (username && !/^[a-z0-9_]{3,24}$/.test(username)) throw new Error('Username: 3–24 letters, numbers or _');
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: location.origin + location.pathname,
          data: { username, display_name: $('#suName').value.trim(), emoji: $('#suEmoji').value.trim() || '🐻' }
        }
      });
      if (error) throw error;
      localStorage.setItem('cc_new_signup', '1'); // first-timers get the Home Screen guide
      if (!data.session) {
        $('#authMsg').innerHTML = '📬 Almost there! We sent a confirmation link to <b>' + esc(email) + '</b>. Open it, then come back and sign in.';
        setMode('in'); $('#authMsg').innerHTML = '📬 Almost there! We sent a confirmation link to <b>' + esc(email) + '</b>. Open it, then come back and sign in.';
      }
    }
  } catch (err) {
    const m = errMsg(err);
    $('#authMsg').textContent = /not confirmed/i.test(m) ? '📬 Please confirm your email first (check your inbox/spam).' : '😿 ' + m;
  } finally { btn.disabled = false; }
};
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-action="signout"]')) { await sb.auth.signOut(); INST.shownThisOpen = false; }
});

function storedUser() {
  try { const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x)); const v = k && JSON.parse(localStorage.getItem(k)); return (v && (v.user || v.currentSession?.user)) || null; } catch { return null; }
}
sb.auth.onAuthStateChange((event, session) => {
  if (!session && event !== 'SIGNED_OUT' && (!navigator.onLine || OFF.on)) { const u = storedUser(); if (u) session = { user: u }; } // offline: keep the stored session
  const uid = session?.user?.id || null;
  if (uid === (S.user?.id || null) && event !== 'USER_UPDATED') return;
  S.user = session?.user || null;
  setTimeout(boot, 0); // avoid calling supabase inside the callback
});

// ================= OFFLINE (v15): data cache, write queue, status =================
const OFF = { on: !navigator.onLine, flushing: false };
const isNetErr = (e) => !navigator.onLine || /fetch|network|load failed|internet|timed? ?out|ERR_/i.test(String((e && (e.message || e.details)) || e || ''));
// tiny IndexedDB key-value store (falls back to localStorage)
const kv = (() => {
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => { try { const r = indexedDB.open('forus-cache', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }));
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('kv', mode); const r = fn(t.objectStore('kv')); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
  return {
    get: async (k) => { try { return await tx('readonly', (s) => s.get(k)); } catch { try { return JSON.parse(localStorage.getItem('cc_kv_' + k)); } catch { return undefined; } } },
    clear: async () => { try { await tx('readwrite', (s) => s.clear()); } catch { Object.keys(localStorage).filter((k) => k.startsWith('cc_kv_')).forEach((k) => localStorage.removeItem(k)); } },
    set: async (k, v) => { try { await tx('readwrite', (s) => s.put(v, k)); } catch { try { localStorage.setItem('cc_kv_' + k, JSON.stringify(v)); } catch { /* full */ } } },
  };
})();
const ck = (k) => `${S.user?.id || 'anon'}:${k}`;
const cacheSet = (k, v) => kv.set(ck(k), v);
const cacheGet = (k) => kv.get(ck(k));
const saveTableCache = (t) => S.couple && cacheSet(`t:${S.couple.id}:${t}`, S.data[t] || []);
try { S.signedUrls = JSON.parse(localStorage.getItem('cc_signed') || '{}'); } catch { S.signedUrls = {}; }
const saveSigned = () => { try { localStorage.setItem('cc_signed', JSON.stringify(S.signedUrls)); } catch { /* */ } };
addEventListener('pagehide', saveSigned); document.addEventListener('visibilitychange', () => document.hidden && saveSigned());

// offline status pill + toast
function setOffline(off, silent) {
  const was = OFF.on; OFF.on = off;
  let p = document.getElementById('offPill');
  if (!p) { p = document.createElement('div'); p.id = 'offPill'; p.innerHTML = 'Offline 📴'; document.body.appendChild(p); }
  p.classList.toggle('show', off);
  document.body.classList.toggle('isOffline', off);
  if (typeof refreshCoopNotice === 'function') refreshCoopNotice();
  if (was && !off && !silent) flushQueue(true);
}
addEventListener('offline', () => setOffline(true));
if (!navigator.onLine) setTimeout(() => setOffline(true, true), 0);
addEventListener('online', () => setOffline(false));

// write queue
const QKEY = 'cc_queue';
const qLoad = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch { return []; } };
const qSave = (q) => localStorage.setItem(QKEY, JSON.stringify(q));
function enqueue(item) {
  const q = qLoad(); item.qid = item.qid || crypto.randomUUID(); item.uid = S.user?.id; item.ts = Date.now();
  // de-dupe: identical non-insert ops replace the older copy; same-id inserts are never queued twice
  const sig = JSON.stringify([item.kind, item.t, item.op, item.args, item.chain, item.name, item.body]);
  const i = q.findIndex((x) => JSON.stringify([x.kind, x.t, x.op, x.args, x.chain, x.name, x.body]) === sig);
  if (i >= 0) q.splice(i, 1);
  // v34: offline taps don't pile up — at most 3 queued pings, one queued notification per kind
  if (item.kind === 'db' && item.t === 'pings' && item.op === 'insert' && q.filter((x) => x.t === 'pings' && x.op === 'insert').length >= 3) return;
  if (item.kind === 'fn' && item.name === 'notify' && item.body) { const k = q.findIndex((x) => x.kind === 'fn' && x.name === 'notify' && x.body && x.body.kind === item.body.kind); if (k >= 0) q.splice(k, 1); }
  q.push(item); qSave(q); updateQueueBadge();
}
function updateQueueBadge() { const p = document.getElementById('offPill'); const n = qLoad().length; if (p) p.dataset.q = ''; }
const QUEUE_RPC = ['poke_bear'];
const realFrom = sb.from.bind(sb), realRpc = sb.rpc.bind(sb);
const filtersOf = (chain) => chain.filter((c) => c.m === 'eq' || c.m === 'match');
function rowMatches(row, chain) { return filtersOf(chain).every((c) => c.m === 'eq' ? String(row[c.a[0]]) === String(c.a[1]) : Object.entries(c.a[0]).every(([k, v]) => String(row[k]) === String(v))); }
function applyOptimistic(t, op, args, chain) {
  if (!S.couple || !TABLES[t]) return null;
  const list = (S.data[t] = S.data[t] || []); const now = new Date().toISOString(); let out = null;
  if (op === 'insert' || op === 'upsert') {
    const rows = (Array.isArray(args[0]) ? args[0] : [args[0]]).map((r) => ({ created_at: now, updated_at: now, couple_id: S.couple.id, created_by: S.user.id, ...r, _pending: true }));
    const conflict = (args[1] && args[1].onConflict ? args[1].onConflict.split(',').map((s) => s.trim()) : ['id']);
    rows.forEach((r) => {
      const j = list.findIndex((x) => conflict.every((k) => r[k] !== undefined && String(x[k]) === String(r[k])));
      if (j >= 0) list[j] = { ...list[j], ...r }; else if (TABLES[t].asc) list.push(r); else list.unshift(r);
    });
    out = Array.isArray(args[0]) ? rows : rows[0];
  } else if (op === 'update') { list.forEach((r, i) => { if (rowMatches(r, chain)) list[i] = { ...r, ...args[0], _pending: true }; }); }
  else if (op === 'delete') { S.data[t] = list.filter((r) => !rowMatches(r, chain)); }
  try { RENDER[t] && RENDER[t](); } catch (e) { console.warn('optimistic render', t, e); }
  saveTableCache(t);
  return out;
}
async function runOp(t, op, args, chain) {
  let q = realFrom(t)[op](...args);
  for (const c of chain) q = q[c.m](...c.a);
  return q;
}
function queuedBuilder(t, op, args) {
  if (op === 'insert' && TABLES[t] && t !== 'couple_settings') { // client ids make retries idempotent
    const add = (r) => (r && typeof r === 'object' && !r.id ? { id: crypto.randomUUID(), ...r } : r);
    args = [Array.isArray(args[0]) ? args[0].map(add) : add(args[0]), ...args.slice(1)];
  }
  const chain = []; let p = null;
  const exec0 = async () => {
    const wantSingle = chain.some((c) => c.m === 'single' || c.m === 'maybeSingle');
    const queueIt = () => {
      enqueue({ kind: 'db', t, op, args, chain }); setOffline(true, true); window.__ccQueuedAt = Date.now();
      const data = applyOptimistic(t, op, args, chain);
      return { data: wantSingle && Array.isArray(data) ? data[0] : data, error: null, status: 202, queued: true };
    };
    if (OFF.on && !navigator.onLine) return queueIt();
    try { const r = await runOp(t, op, args, chain); if (r.error && isNetErr(r.error)) return queueIt(); return r; }
    catch (e) { if (isNetErr(e)) return queueIt(); throw e; }
  };
  const exec = async () => { const r = await exec0(); if (r && !r.error && (op === 'insert' || op === 'upsert')) autoNotify(t, args[0]); return r; };
  const proxy = new Proxy({}, { get(_, m) {
    if (m === 'then') return (a, b) => (p = p || exec()).then(a, b);
    if (m === 'catch') return (b) => (p = p || exec()).catch(b);
    if (m === 'finally') return (f) => (p = p || exec()).finally(f);
    return (...a) => { chain.push({ m, a }); return proxy; };
  } });
  return proxy;
}
sb.from = (t) => { const b = realFrom(t); ['insert', 'upsert', 'update', 'delete'].forEach((op) => { b[op] = (...a) => queuedBuilder(t, op, a); }); return b; };
sb.rpc = (name, params, opts) => {
  if (!QUEUE_RPC.includes(name)) return realRpc(name, params, opts);
  return (async () => {
    const q = () => { enqueue({ kind: 'rpc', name, args: params || {} }); setOffline(true, true); return { data: null, error: null, queued: true }; };
    if (!navigator.onLine) return q();
    try { const r = await realRpc(name, params, opts); return r.error && isNetErr(r.error) ? q() : r; } catch (e) { if (isNetErr(e)) return q(); throw e; }
  })();
};
async function flushQueue(announce) {
  if (OFF.flushing || !navigator.onLine || !S.user) return; const start = qLoad().filter((x) => x.uid === S.user.id); if (!start.length) return;
  OFF.flushing = true; let done = 0, dropped = 0;
  try {
    try { await sb.auth.getSession(); } catch { /* refresh happens on next call */ }
    for (const it of start) {
      let r;
      try {
        if (it.kind === 'db') r = await runOp(it.t, it.op, it.args, it.chain || []);
        else if (it.kind === 'rpc') r = await realRpc(it.name, it.args);
        else if (it.kind === 'fn') r = await sb.functions.invoke(it.name, { body: it.body });
      } catch (e) { r = { error: e }; }
      const err = r && r.error;
      if (err && (isNetErr(err) || /jwt|401|token/i.test(String(err.message || err.code || '')))) break; // try again later
      if (err && err.code !== '23505') { dropped++; console.warn('queued write dropped', it, err); }
      else done++;
      qSave(qLoad().filter((x) => x.qid !== it.qid));
    }
  } finally { OFF.flushing = false; updateQueueBadge(); }
  if (done || dropped) {
    if (S.couple) await Promise.all([...new Set(start.filter((x) => x.t).map((x) => x.t))].filter((t) => TABLES[t]).map(loadTable));
    if (announce !== false) toast(dropped ? `Back online ✨ synced ${done}, ${dropped} couldn't be saved` : `Back online ✨ synced${done ? ` (${done})` : ''}`);
  } else if (announce === true) toast('Back online ✨');
}
setInterval(() => { if (navigator.onLine && qLoad().length) flushQueue(); }, 30000);
// co-op games need the partner live
const COOP_GAMES = { quiz: 'the partner quiz', scratch: 'scratch cards', openwhen: 'Open-when letters', question: 'the big question', draw: 'sending drawings' };
function refreshCoopNotice() {
  document.querySelectorAll('.coopOff').forEach((n) => n.remove());
  if (!OFF.on || typeof curGame === 'undefined' || !COOP_GAMES[curGame]) return;
  const panel = document.querySelector(`.game[data-panel="${curGame}"]`); if (!panel) return;
  const n = document.createElement('div'); n.className = 'coopOff';
  n.innerHTML = `<div class="coopEm">📡💞</div><b>${COOP_GAMES[curGame]} needs internet to play together</b><p>You're offline, so here's what we saved. Try a solo game meanwhile!</p><div class="chips"><span data-g="catch">🧺 Catch</span><span data-g="memory">🃏 Memory</span><span data-g="bear">🧸 Bear</span><span data-g="wheel">🎡 Wheel</span><span data-g="fortune">🥠 Fortune</span></div>`;
  n.querySelectorAll('[data-g]').forEach((s) => s.onclick = () => openGame(s.dataset.g));
  panel.insertBefore(n, panel.children[1] || null);
}

// ================= BOOT / ROUTING =================
let booting = false;
async function boot() {
  if (booting) return; booting = true;
  try {
    teardown();
    if (!S.user) {
      show('#authView');
      if (localStorage.getItem(ACTION_KEY)) $('#authMsg').textContent = 'Sign in to send your ping 💗';
      return;
    }
    if (await quickStart()) return;
    await loadMe();
    await loadCouple();
    if (!S.couple) { renderPair(); show('#pairView'); subscribePairing(); }
    else { await enterCouple(); }
  } catch (e) { console.error(e); toast('Something went wrong: ' + errMsg(e)); }
  finally { booting = false; }
}
// v50 instant open: go straight to the last-seen Home from this phone's cache, then check who/what in the background
async function quickStart() {
  let me = null, c = null; try { me = await cacheGet('me'); c = await cacheGet('couple'); } catch { return false; }
  if (!me || me.id !== S.user.id || !c || !c.couple || !c.partner || ![c.couple.user_a, c.couple.user_b].includes(S.user.id)) return false;
  S.me = me; S.couple = c.couple; S.partner = c.partner;
  await enterCouple();
  setTimeout(async () => {
    try {
      const was = S.couple && S.couple.id;
      await loadMe(); await loadCouple();
      if (!S.couple || S.couple.id !== was) { location.reload(); return; }
      applyNames(); renderMe();
    } catch { /* offline: the cached view stays */ }
  }, 0);
  return true;
}
function teardown() {
  if (S.channel) { sb.removeChannel(S.channel); S.channel = null; }
  if (S.pairChannel) { sb.removeChannel(S.pairChannel); S.pairChannel = null; }
  if (typeof CH !== 'undefined' && CH.ch) { sb.removeChannel(CH.ch); CH.ch = null; }
  S.couple = null; S.partner = null; S.data = {};
  if (window.FU_leave) window.FU_leave();
}
async function loadMe() {
  for (let i = 0; i < 3; i++) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle();
    if (error) { const c = await cacheGet('me'); if (c && isNetErr(error)) { S.me = c; setOffline(true, true); return; } throw error; }
    if (data) { S.me = data; cacheSet('me', data); return; }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error('Profile not found');
}
async function loadCouple() {
  const { data, error } = await sb.from('couples').select('*').eq('active', true).maybeSingle();
  if (error) {
    const c = await cacheGet('couple'); if (!(c && isNetErr(error))) throw error;
    S.couple = c.couple; S.partner = c.partner; setOffline(true, true); return;
  }
  S.couple = data;
  if (data) {
    const pid = data.user_a === S.user.id ? data.user_b : data.user_a;
    const { data: p } = await sb.from('profiles').select('id,username,display_name,emoji').eq('id', pid).maybeSingle();
    const old = await cacheGet('couple');
    S.partner = p || (old && old.partner && old.partner.id === pid ? old.partner : { id: pid, display_name: 'Your love', emoji: '💗', username: '' });
  }
  cacheSet('couple', { couple: data, partner: S.partner });
}

// ================= PAIRING =================
async function checkSpots() {
  if (!navigator.onLine) return;
  const [{ data: sp }, { data: wl }] = await Promise.all([sb.rpc('app_spots'), sb.from('waitlist').select('user_id,created_at').eq('user_id', S.user.id).maybeSingle()]);
  const full = sp && sp.open === false;
  $('#fullCard').classList.toggle('hidden', !full); $('#findCard').classList.toggle('hidden', !!full); $('#codeCard').classList.toggle('hidden', !!full);
  $('#waitBtn').classList.toggle('hidden', !!wl); $('#waitTxt').textContent = wl ? `You're on the list since ${fmtDate(wl.created_at)} 🔔 we'll tell you the moment a spot opens.` : '';
  if (!full && wl) { // a spot opened up for a waitlisted user
    openModal(`<div class="big">🎉💞</div><h2>A spot just opened up!</h2><p>For Us has room again — find your person now 💕</p><button data-close>Let's go 💌</button>`); hearts(14);
    await sb.from('waitlist').delete().eq('user_id', S.user.id);
  }
}
$('#waitBtn').onclick = async () => {
  const { error } = await sb.from('waitlist').insert({});
  if (error && error.code !== '23505') return toast(errMsg(error));
  toast("You're on the list 🔔 we'll let you know!"); hearts(6); checkSpots();
};
function renderPair() {
  $('#pairEmoji').textContent = S.me.emoji; $('#pairName').textContent = S.me.display_name;
  $('#myCode').textContent = S.me.invite_code; $('#myUser').textContent = '@' + S.me.username;
  $('#findResult').innerHTML = '';
  loadRequests(); checkSpots();
}
$('#copyCode').onclick = async () => { try { await navigator.clipboard.writeText(S.me.invite_code); toast('Copied! 💌'); } catch { toast(S.me.invite_code); } };
$('#findBtn').onclick = async () => {
  const q = $('#findQ').value.trim().replace(/^@/, '');
  if (!q) return;
  const { data, error } = await sb.rpc('find_profile', { q });
  const box = $('#findResult');
  if (error) return toast(errMsg(error));
  if (!data || !data.length) { box.innerHTML = '<p class="muted">No one found with that code or username 🥺</p>'; return; }
  const p = data[0];
  box.innerHTML = `<div class="person"><span class="em">${esc(p.emoji)}</span><div class="info"><b>${esc(p.display_name)}</b><br><small>@${esc(p.username)}</small></div><button class="mini" id="sendReq">Connect 💞</button></div>`;
  $('#sendReq').onclick = async () => {
    const { error: e2 } = await sb.rpc('send_request', { target: p.id });
    if (e2) return toast(errMsg(e2));
    toast('Request sent! 💌'); box.innerHTML = ''; loadRequests();
  };
};
async function loadRequests() {
  const { data, error } = await sb.rpc('list_requests');
  const box = $('#reqList');
  if (error) { box.textContent = errMsg(error); return; }
  if (!data.length) { box.innerHTML = '<span class="muted">No requests yet</span>'; return; }
  box.innerHTML = data.map((r) => `<div class="person"><span class="em">${esc(r.emoji)}</span><div class="info"><b>${esc(r.display_name)}</b><br><small>@${esc(r.username)} · ${r.direction === 'incoming' ? 'wants to connect!' : 'waiting for them…'}</small></div>
    ${r.direction === 'incoming' ? `<button class="mini" data-acc="${r.id}">Accept</button><button class="mini soft" data-dec="${r.id}">Decline</button>` : `<button class="mini soft" data-dec="${r.id}">Cancel</button>`}</div>`).join('');
}
$('#reqList').onclick = async (e) => {
  const acc = e.target.dataset.acc, dec = e.target.dataset.dec;
  if (!acc && !dec) return;
  const { error } = await sb.rpc('respond_request', { req: acc || dec, accept: !!acc });
  if (error && /APP_FULL|full right now/i.test(errMsg(error))) return openModal('<div class="big">🏡💕</div><h2>For Us is full right now 💕</h2><p>We can only fit a few couples at the moment. Please try again later — your request is still waiting 💌</p><button data-close>Okay 🥹</button>');
  if (error) return toast(errMsg(error));
  if (acc) { toast('Connected! 💕'); boot(); } else loadRequests();
};
function subscribePairing() {
  S.pairChannel = sb.channel('pair-' + S.user.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'connect_requests' }, () => loadRequests())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'couples' }, () => boot())
    .subscribe();
}

// ================= COUPLE SPACE =================
const TABLES = {
  notes: { order: 'created_at', asc: false },
  todos: { order: 'created_at', asc: true },
  surprises: { order: 'created_at', asc: true },
  countdowns: { order: 'target_at', asc: true },
  timeline: { order: 'event_date', asc: true },
  photos: { order: 'created_at', asc: false },
  coupons: { order: 'created_at', asc: false },
  pings: { order: 'created_at', asc: false, limit: 30 },
  letters: { order: 'updated_at', asc: false },
  game_scores: { order: 'created_at', asc: false, limit: 300 },
  poke_counts: { order: 'updated_at', asc: false },
  fortunes: { order: 'created_at', asc: false },
  date_ideas: { order: 'created_at', asc: true },
  date_spins: { order: 'created_at', asc: false, limit: 30 },
  quiz_questions: { order: 'created_at', asc: true },
  quiz_answers: { order: 'created_at', asc: true },
  open_when: { order: 'created_at', asc: true },
  drawings: { order: 'created_at', asc: false, limit: 40 },
  scratch_cards: { order: 'created_at', asc: true },
  big_questions: { order: 'created_at', asc: false },
  daily_answers: { order: 'day', asc: false, limit: 400 },
  moods: { order: 'created_at', asc: false, limit: 300 },
  gratitude: { order: 'created_at', asc: false, limit: 300 },
  love_languages: { order: 'updated_at', asc: false },
  bucket_items: { order: 'created_at', asc: true },
  weekly_checkins: { order: 'week', asc: false, limit: 60 },
  q36_answers: { order: 'qnum', asc: true },
  challenge_done: { order: 'week', asc: false, limit: 60 },
  journal: { order: 'day', asc: false, limit: 120 },
  couple_settings: { order: 'updated_at', asc: false },
  milestones: { order: 'day', asc: true },
  voice_notes: { order: 'created_at', asc: false, limit: 50 },
  wishlist: { order: 'created_at', asc: false },
  wish_claims: { order: 'created_at', asc: false },
  lovemap_answers: { order: 'pidx', asc: true },
  lovemap_guesses: { order: 'pidx', asc: true },
  playlist: { order: 'created_at', asc: false },
  playlist_likes: { order: 'created_at', asc: false },
  locations: { order: 'updated_at', asc: false },
  time_capsules: { order: 'unlock_at', asc: true },
  goals: { order: 'created_at', asc: true },
  goal_contribs: { order: 'created_at', asc: true, limit: 1000 },
  jokes: { order: 'term', asc: true },
  song_week: { order: 'week', asc: false, limit: 60 },
  events: { order: 'starts_at', asc: true, limit: 500 },
  trivia_results: { order: 'day', asc: false, limit: 200 },
  couple_nicknames: { order: 'updated_at', asc: false }
};
const PROGRESS_TABLES = ['daily_answers', 'moods', 'gratitude', 'weekly_checkins', 'q36_answers'];
const GIFT_TOASTS = { todos: 'added something to our list 🛒', open_when: 'wrote you an Open-when letter ✉️', drawings: 'sent you a drawing 🎨', scratch_cards: 'hid a scratch-card prize for you 🎟️', big_questions: 'asked you an important question 💍', quiz_questions: 'added a quiz question about themselves 📝' };
const RENDER = {};
async function loadTable(t) {
  const c = TABLES[t];
  let q = sb.from(t).select('*').eq('couple_id', S.couple.id).order(c.order, { ascending: c.asc });
  if (c.limit) q = q.limit(c.limit);
  let { data, error } = await q;
  if (error) {
    const c = await cacheGet(`t:${S.couple.id}:${t}`);
    if (!c) { if (!isNetErr(error)) console.error(t, error); return; }
    if (isNetErr(error)) setOffline(true, true); data = c;
  } else {
    // keep still-queued rows visible until they sync
    const pend = (S.data[t] || []).filter((r) => r._pending && !data.some((d) => d.id === r.id));
    data = TABLES[t].asc ? data.concat(pend) : pend.concat(data);
    S.data[t] = data; saveTableCache(t);
  }
  S.data[t] = data;
  try { RENDER[t] && RENDER[t](); } catch (e) { console.warn('render', t, e); }
}
const nickFor = (uid) => (S.data.couple_nicknames || []).find((n) => n.target_user === uid);
const partnerName = () => nickFor(S.partner?.id)?.nickname || S.partner?.display_name || 'Your love';
const partnerEmoji = () => nickFor(S.partner?.id)?.emoji || S.partner?.emoji || '💗';
function applyNames() {
  if (!S.partner) return;
  $('#coupleTitle').textContent = `${S.me.emoji} ${S.me.display_name} 💕 ${partnerName()} ${partnerEmoji()}`; paintHi();
  $$('.pname').forEach((el) => (el.textContent = partnerName()));
}
// v24: a warm, time-aware hello at the top of Home
function paintHi() {
  const el = $('#homeHi'); if (!el || !S.me) return;
  const d = new Date(), h = d.getHours();
  const [g, e] = h < 5 ? ['Up late', '🌙'] : h < 12 ? ['Good morning', '☀️'] : h < 17 ? ['Good afternoon', '🌤️'] : h < 22 ? ['Good evening', '🌆'] : ['Good night', '🌙'];
  const day = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const g2 = (window.FU_hiWord && window.FU_hiWord(h)) || g; // v32: a different hello now and then
  el.innerHTML = `<small>${esc(day)}</small><b>${g2}, ${esc(S.me.display_name || 'love')} ${TP('hiEm', h) || e}</b>`;
}
setInterval(paintHi, 10 * 60 * 1000);
window.CC_partnerName = () => (S.partner ? partnerName() : null);
const nameOf = (uid) => uid === S.user.id ? 'You' : (partnerName() || 'Your love');
const emojiOf = (uid) => uid === S.user.id ? S.me.emoji : (partnerEmoji() || '💗');

async function paintCached() {
  await Promise.all(Object.keys(TABLES).map(async (t) => {
    if (S.data[t]) return; let c = null; try { c = await cacheGet(`t:${S.couple.id}:${t}`); } catch { /* */ }
    if (c && !S.data[t]) { S.data[t] = c; try { RENDER[t] && RENDER[t](); } catch { /* */ } }
  }));
}
async function enterCouple() {
  applyNames();
  renderMe();
  show('#mainView');
  initGames();
  await paintCached(); // v50: last-seen data on screen at once, fresh data replaces it as it lands
  await Promise.all(Object.keys(TABLES).map(loadTable));
  initConnect();
  subscribeCouple();
  welcomeBack();
  runPendingAction();
  if (navigator.onLine) flushQueue(); updateQueueBadge();
  chatInit(); refreshStorage();
  if (window.FU_enter) window.FU_enter();
  if (params.get('k') === 'chat') { goTab('chat'); history.replaceState(null, '', location.pathname); }
}
function subscribeCouple() {
  const ch = sb.channel('couple-' + S.couple.id);
  Object.keys(TABLES).forEach((t) => {
    ch.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: `couple_id=eq.${S.couple.id}` }, (payload) => {
      if (t === 'pings' && payload.eventType === 'INSERT' && payload.new.to_user === S.user.id) showPingFrom(payload.new);
      if (GIFT_TOASTS[t] && payload.eventType === 'INSERT' && payload.new.created_by && payload.new.created_by !== S.user.id) toast(`${partnerName()} ${GIFT_TOASTS[t]}`, 4000);
      loadTable(t);
      if (PROGRESS_TABLES.includes(t)) refreshProgress();
      if (t === 'couple_nicknames' && payload.new?.target_user === S.user.id && payload.new?.set_by !== S.user.id) {
        toast(`${partnerName()} renamed you to “${payload.new.nickname}” ${payload.new.emoji || ''} 🥰`, 5000); hearts(12);
      }
      if (t === 'time_capsules') loadLocked();
      if (t === 'lovemap_answers') loadLMProgress();
    });
  });
  ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${S.couple.id}` }, (p) => {
    if (!p.new.active) { toast('You broke up 💔 Your shared space is saved in case you get back together.', 4000); boot(); }
  });
  ch.subscribe();
  S.channel = ch;
}
document.addEventListener('visibilitychange', async () => { if (!document.hidden && S.couple) {
  const { data: still } = await sb.from('couples').select('id').eq('id', S.couple.id).eq('active', true).maybeSingle(); if (!still) { boot(); return; } Object.keys(TABLES).forEach(loadTable); refreshProgress(); loadLocked(); if (window.FU_resume) window.FU_resume(); } });

// ---- tabs ----
$$('.nav button').forEach((b) => b.onclick = () => goTab(b.dataset.tab));

// ---- pings ----
let pingLast = 0, pingNotified = 0;
async function sendPing(emoji) {
  if (!S.couple) { toast('Connect with your partner first 💞'); return false; }
  // v34: rapid taps don't become a flood of pings + notifications
  if (Date.now() - pingLast < 1200) { floatHearts(document.body, 4); return true; }
  pingLast = Date.now();
  const { error } = await sb.from('pings').insert(emoji ? { emoji } : {});
  if (error) { toast('Ping failed: ' + errMsg(error)); return false; }
  floatHearts(document.body, 14, emoji);
  if (Date.now() - pingNotified > 20000) { pingNotified = Date.now(); notify('ping', emoji ? `sent you ${emoji}` : TP('pingLine') || D.pingLines[Math.floor(Math.random() * D.pingLines.length)]); }
  TP('sound', 'ping'); toast(emoji ? `${emoji} sent to ${partnerName()}` : TP('pingSent', partnerName()) || `Ping sent to ${partnerName()}! 💗`);
  return true;
}
$('#pingBtn').onclick = () => sendPing();
function showPingFrom(p) {
  if (p.kind === 'hug') { showHugOverlay(`${partnerName()} is hugging you 🤗`); return; }
  const line = TP('pingLine') || D.pingLines[Math.floor(Math.random() * D.pingLines.length)];
  TP('sound', 'ping');
  $('#heartTxt').textContent = p.emoji ? `${partnerName()} sent you ${p.emoji}` : `${partnerName()} ${line}`;
  const o = $('#heartOverlay'); o.classList.remove('hidden'); floatHearts(o, 24, p.emoji);
  if (navigator.vibrate) navigator.vibrate(TP('buzz', 'ping') || [100, 60, 100]);
}
$('#heartOverlay').onclick = () => $('#heartOverlay').classList.add('hidden');
function floatHearts(el, n, em) {
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div'); h.className = 'floaty';
    h.textContent = em && i % 3 !== 2 ? em : ['💗', '💕', '💖', '❤️', '💘'][i % 5];
    h.style.left = Math.random() * 100 + 'vw'; h.style.animationDelay = Math.random() * 1.2 + 's';
    h.style.position = 'fixed'; h.style.zIndex = 95;
    document.body.appendChild(h); setTimeout(() => h.remove(), 4500);
  }
}
RENDER.pings = () => {
  const l = S.data.pings || [];
  const today = l.filter((p) => new Date(p.created_at).toDateString() === new Date().toDateString());
  $('#pingHint').textContent = `Today: you sent ${today.filter((p) => p.created_by === S.user.id).length}, got ${today.filter((p) => p.created_by !== S.user.id).length} 💞`;
  $('#pingList').innerHTML = l.length ? l.map((p) => `<div class="row"><span>${esc(emojiOf(p.created_by))} ${p.created_by === S.user.id ? (p.emoji ? 'You sent ' + esc(partnerName()) + ' ' + esc(p.emoji) : 'You pinged ' + esc(partnerName())) : esc(partnerName()) + (p.emoji ? ' sent you ' + esc(p.emoji) : ' pinged you')}</span><small>${fmtTime(p.created_at)}</small></div>`).join('') : `<p class="muted">${esc(TP('w', 'empty') || 'No pings yet. Tap the big heart!')}</p>`;
};
async function runPendingAction() {
  const a = localStorage.getItem(ACTION_KEY);
  if (!a) return;
  localStorage.removeItem(ACTION_KEY);
  if (a === 'ping') {
    if (await sendPing()) {
      $('#heartTxt').textContent = `Ping sent to ${partnerName()}! 💌`;
      const o = $('#heartOverlay'); o.classList.remove('hidden');
      setTimeout(() => o.classList.add('hidden'), 2500);
    }
  } else if (a === 'hug') { $('#hugOverlay').classList.remove('hidden'); }
}

// ---- daily surprise ----
let dailyOffset = 0;
const allSurprises = () => [...D.surprises, ...(S.data.surprises || []).map((s) => s.message)];
function renderDaily() {
  const all = allSurprises();
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  $('#daily').textContent = all[(day * 7 + dailyOffset) % all.length];
}
$('#dailyMore').onclick = () => { dailyOffset++; renderDaily(); };
RENDER.surprises = () => {
  renderDaily();
  const l = S.data.surprises || [];
  $('#surpriseList').innerHTML = l.map((s) => `<div class="row"><span>${esc(s.message)} <small class="muted">— ${esc(nameOf(s.created_by))}</small></span><button class="mini soft" data-del="surprises:${s.id}">✕</button></div>`).join('');
};
$('#surpriseAdd').onclick = async () => {
  const message = $('#surpriseTxt').value.trim(); if (!message) return;
  const { error } = await sb.from('surprises').insert({ message });
  if (error) return toast(errMsg(error));
  $('#surpriseTxt').value = ''; toast('Added to the surprise pool 💝');
};
document.addEventListener('click', async (e) => {
  const d = e.target.dataset?.del; if (!d) return;
  if (!await uiConfirm('Delete this?')) return;
  const [t, id] = d.split(':');
  if (t === 'photos') {
    const ph = (S.data.photos || []).find((p) => p.id === id);
    if (ph) await sb.storage.from('photos').remove([ph.path]);
  }
  const { error } = await sb.from(t).delete().eq('id', id);
  if (error) toast(errMsg(error)); else { $('#modal').classList.add('hidden'); loadTable(t); }
});

// ---- countdowns ----
RENDER.countdowns = () => {
  const l = S.data.countdowns || [];
  $('#cdList').innerHTML = l.length ? l.map((c) => `<div class="cdItem" data-oid="${c.id}" data-cd="${esc(c.target_at)}"><b>${esc(c.label)}</b> <button class="mini soft" data-del="countdowns:${c.id}">✕</button><div class="cd"></div><small class="muted">${fmtTime(c.target_at)}</small></div>`).join('') : '<p class="muted">Add something to look forward to!</p>';
  tickCountdowns();
};
function tickCountdowns() {
  $$('[data-cd]').forEach((el) => {
    let s = Math.max(0, Math.floor((new Date(el.dataset.cd) - Date.now()) / 1000));
    const box = el.querySelector('.cd'); if (!box) return;
    if (s === 0) { box.innerHTML = '<div style="padding:8px 14px">🎉 It\'s here! 🎉</div>'; return; }
    const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); s %= 60;
    box.innerHTML = [[d, 'days'], [h, 'hrs'], [m, 'min'], [s, 'sec']].map(([v, l]) => `<div><b>${v}</b>${l}</div>`).join('');
  });
}
setInterval(tickCountdowns, 1000);
$('#cdAdd').onclick = async () => {
  const label = $('#cdLabel').value.trim(), dt = $('#cdDate').value;
  if (!label || !dt) return toast('Add a label and a date');
  const { error } = await sb.from('countdowns').insert({ label, target_at: new Date(dt).toISOString() });
  if (error) return toast(errMsg(error));
  $('#cdLabel').value = ''; $('#cdDate').value = '';
};

// ---- notes ----
const COLORS = ['pink', 'peach', 'lilac', 'mint', 'yellow'];
let noteColor = 'pink';
$('#noteColors').innerHTML = COLORS.map((c) => `<span class="c-${c}${c === noteColor ? ' on' : ''}" data-c="${c}"></span>`).join('');
$('#noteColors').onclick = (e) => { const c = e.target.dataset.c; if (!c) return; noteColor = c; $$('#noteColors span').forEach((s) => s.classList.toggle('on', s.dataset.c === c)); };
$('#noteAdd').onclick = async () => {
  const body = $('#noteTxt').value.trim(); if (!body) return;
  const { error } = await sb.from('notes').insert({ body, color: noteColor });
  if (error) return toast(errMsg(error));
  $('#noteTxt').value = ''; toast('Note posted 💌');
};
RENDER.notes = () => {
  const l = S.data.notes || [];
  $('#noteWall').innerHTML = l.length ? l.map((n) => `<div class="note c-${COLORS.includes(n.color) ? n.color : 'pink'}"><button class="x" data-del="notes:${n.id}">✕</button>${esc(n.body)}<span class="by">— ${esc(emojiOf(n.created_by))} ${esc(nameOf(n.created_by))} · ${fmtTime(n.created_at)}</span></div>`).join('') : '<p class="muted" style="grid-column:1/-1">No notes yet — be the first! 💕</p>';
};

// ---- photos ----
async function compress(file, max = 1200, quality = 0.82) {
  // v50: decode off the main thread (keeps the app smooth), respect phone rotation, resample in high quality
  try {
    if (window.createImageBitmap) {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const r = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * r), h = Math.round(bmp.height * r);
      const off = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
      const cx = off.getContext('2d'); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(bmp, 0, 0, w, h); bmp.close && bmp.close();
      const b = off.convertToBlob ? await off.convertToBlob({ type: 'image/jpeg', quality }) : await new Promise((res) => off.toBlob(res, 'image/jpeg', quality));
      if (b && b.size) return b;
    }
  } catch { /* fall back to the classic way */ }
  return new Promise((resolve, reject) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob((b) => b ? resolve(b) : reject(new Error('Could not compress')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('Could not read image (try JPEG/PNG)')); };
    img.src = u;
  });
}
$('#photoIn').onchange = async (e) => {
  const files = [...e.target.files]; e.target.value = '';
  if (!navigator.onLine) return toast('Uploading photos & videos needs internet 📶');
  if (!(await mediaGuard(0))) return;
  for (const [i, f] of files.entries()) {
    $('#photoStatus').textContent = `Uploading ${i + 1}/${files.length}… 📤`;
    try {
      const isVid = (f.type || '').startsWith('video/');
      let blob = f, duration = null;
      if (isVid) { const v = await prepVideo(f, (p) => { $('#photoStatus').textContent = `Shrinking video ${i + 1}/${files.length}… ${Math.round(p * 100)}% 🪄`; }); if (!v) continue; blob = v.blob; duration = v.duration; }
      else blob = await smartImage(f);
      if (!(await mediaGuard(blob.size))) break;
      const type = isVid ? (blob.type || f.type || 'video/mp4').split(';')[0] : (blob.type || 'image/jpeg');
      const ext = isVid ? (blob === f ? ((f.name.match(/\.([a-z0-9]{2,5})$/i) || [, 'mp4'])[1].toLowerCase()) : extOf(type)) : (type === 'image/gif' ? 'gif' : 'jpg');
      const path = `${S.couple.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: type });
      if (error) throw error;
      const caption = files.length === 1 ? ((await uiPrompt('Add a caption? 💕')) || '').slice(0, 300) : '';
      const row = { path, caption, media_type: type }; if (duration) row.duration = duration;
      const { error: e2 } = await sb.from('photos').insert(row);
      if (e2) { sb.storage.from('photos').remove([path]); throw e2; }
      hearts(6); loadTable('photos'); STORE.at = 0;
    } catch (err) { toast('Upload failed: ' + errMsg(err)); }
  }
  $('#photoStatus').textContent = '';
};
const phIsVid = (p) => (p.media_type || '').startsWith('video/');
const phUrl = (p) => (p.bucket === 'chat' ? chUrl(p.path) : S.signedUrls[p.path]?.url) || '';
RENDER.photos = async () => {
  const l = S.data.photos || [];
  const need = l.filter((p) => p.bucket !== 'chat').map((p) => p.path).filter((p) => !S.signedUrls[p] || S.signedUrls[p].exp < Date.now());
  if (need.length && navigator.onLine) {
    const { data } = await sb.storage.from('photos').createSignedUrls(need, 3600 * 6);
    (data || []).forEach((d) => { if (d.signedUrl) S.signedUrls[d.path] = { url: d.signedUrl, exp: Date.now() + 3600 * 5 * 1000 }; });
  }
  await chSign(l.filter((p) => p.bucket === 'chat').map((p) => p.path));
  $('#gallery').innerHTML = l.length ? l.map((p) => `<div class="polaroid${phIsVid(p) ? ' isVid' : ''}" data-photo="${p.id}"><button class="phDel" data-pdel="${p.id}" aria-label="Delete">✕</button>${p.message_id ? '<span class="phSrc" title="From our chat">💬</span>' : ''}${phIsVid(p) ? `<div class="phVid"><video src="${esc(phUrl(p))}#t=0.1" preload="metadata" muted playsinline></video><span class="chPlay">▶</span>${p.duration ? `<span class="chDur">${fmtDur(p.duration)}</span>` : ''}</div>` : `<img loading="lazy" src="${esc(phUrl(p))}" alt="">`}<p>${esc(p.caption || '')}</p></div>`).join('') : `<p class="muted" style="grid-column:1/-1">${esc(TP('w', 'empty') || 'No photos yet 📷')} — photos & videos you send in Chat land here too 💬</p>`;
};
async function photoDelete(p) {
  const fromChat = !!p.message_id || p.bucket === 'chat';
  const ok = await uiConfirm(fromChat ? 'Remove this from Photos? 💬 It will stay in your chat.' : `Delete this ${phIsVid(p) ? 'video' : 'photo'} forever? 🥺 It disappears for both of you.`);
  if (!ok) return false;
  if (!navigator.onLine) { toast('Deleting needs internet 📶'); return false; }
  const { error } = await sb.from('photos').delete().eq('id', p.id);
  if (error) { toast(errMsg(error)); return false; }
  if (!fromChat) await sb.storage.from('photos').remove([p.path]);
  S.data.photos = (S.data.photos || []).filter((x) => x.id !== p.id); RENDER.photos(); saveTableCache('photos');
  toast(fromChat ? 'Removed from Photos (still in chat 💬)' : 'Deleted 🗑️'); refreshStorage(true); return true;
}
$('#gallery').onclick = (e) => {
  const del = e.target.closest('[data-pdel]');
  if (del) { e.stopPropagation(); const p = (S.data.photos || []).find((x) => x.id === del.dataset.pdel); if (p) photoDelete(p); return; }
  const el = e.target.closest('[data-photo]'); if (!el) return;
  const p = S.data.photos.find((x) => x.id === el.dataset.photo); if (!p) return;
  const media = phIsVid(p) ? `<video src="${esc(phUrl(p))}" controls autoplay playsinline style="width:100%;border-radius:12px;max-height:60vh;background:#000"></video>` : `<img src="${esc(phUrl(p))}">`;
  openModal(`${media}<input id="capEdit" value="${esc(p.caption || '')}" maxlength="300" placeholder="Caption" ${p.message_id ? 'disabled' : ''}>
    <small class="muted">${p.message_id ? '💬 From our chat · ' : ''}Added by ${esc(nameOf(p.created_by))} · ${fmtDate(p.created_at)}</small><br>
    ${p.message_id ? '' : '<button id="capSave">Save caption</button>'}<button class="danger" id="phDelBtn">${p.message_id ? 'Remove from Photos' : 'Delete'}</button><button class="soft" data-close>Close</button>`);
  $('#phDelBtn').onclick = async () => { if (await photoDelete(p)) closeModal(); };
  if ($('#capSave')) $('#capSave').onclick = async () => {
    const { error } = await sb.from('photos').update({ caption: $('#capEdit').value.trim() }).eq('id', p.id);
    if (error) toast(errMsg(error)); else closeModal();
  };
};
function openModal(html) { clearTimeout(closeModal.t); $('#modalBox').onclick = null; $('#modalBox').innerHTML = html; $('#modalBox').scrollTop = 0; $('#modalBox').style.transform = ''; $('#modal').classList.remove('hidden', 'out'); }
function closeModal() {
  const m = $('#modal'); if (m.classList.contains('hidden')) return;
  if (!motionOn()) { m.classList.add('hidden'); return; }
  m.classList.add('out'); clearTimeout(closeModal.t); closeModal.t = setTimeout(() => { m.classList.add('hidden'); m.classList.remove('out'); $('#modalBox').style.transform = ''; }, 240);
}
(() => { // drag the sheet down to dismiss it
  const box = $('#modalBox'); let y0 = null, dy = 0, t0 = 0;
  box.addEventListener('touchstart', (e) => { if (box.scrollTop > 0 || e.touches.length > 1) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); }, { passive: true });
  box.addEventListener('touchmove', (e) => { if (y0 === null) return; dy = e.touches[0].clientY - y0; if (dy <= 0) { box.classList.remove('drag'); box.style.transform = ''; return; } if (box.scrollTop > 0) { y0 = null; return; } box.classList.add('drag'); box.style.transform = `translateY(${dy}px)`; }, { passive: true });
  box.addEventListener('touchend', () => {
    if (y0 === null) return; y0 = null; box.classList.remove('drag');
    const fast = dy > 60 && Date.now() - t0 < 250;
    if (dy > 130 || fast) { box.style.transition = 'transform .22s ease-in'; box.style.transform = 'translateY(100%)'; setTimeout(() => { box.style.transition = ''; $('#modal').classList.add('hidden'); box.style.transform = ''; }, 220); }
    else if (dy > 0) { box.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1)'; box.style.transform = ''; setTimeout(() => { box.style.transition = ''; }, 360); }
  });
})();
$('#modal').onclick = (e) => { if (e.target.id === 'modal' || e.target.hasAttribute('data-close')) closeModal(); };

// ---- timeline ----
$('#tlAdd').onclick = async () => {
  const event_date = $('#tlDate').value, title = $('#tlTitle').value.trim(), body = $('#tlBody').value.trim();
  if (!event_date || !title) return toast('Add a date and a title');
  const { error } = await sb.from('timeline').insert({ event_date, title, body });
  if (error) return toast(errMsg(error));
  $('#tlDate').value = $('#tlTitle').value = $('#tlBody').value = '';
};
RENDER.timeline = () => {
  const l = S.data.timeline || [];
  $('#timeline').innerHTML = l.length ? l.map((m) => `<div class="moment"><small>${fmtDate(m.event_date + 'T12:00:00')}</small> <button class="mini soft" style="float:right" data-del="timeline:${m.id}">✕</button><br><b>${esc(m.title)}</b>${m.body ? `<p>${esc(m.body)}</p>` : ''}</div>`).join('') : '<p class="muted">Write the first chapter of your story 📖</p>';
};

// ---- coupons ----
$('#cpAdd').onclick = async () => {
  const title = $('#cpTitle').value.trim(); if (!title) return toast('Give the coupon a title');
  const { error } = await sb.from('coupons').insert({ title, description: $('#cpDesc').value.trim(), emoji: $('#cpEmoji').value.trim() || '🎟️' });
  if (error) return toast(errMsg(error));
  $('#cpTitle').value = $('#cpDesc').value = $('#cpEmoji').value = ''; toast('Coupon gifted! 🎁');
};
const couponHtml = (c, mine) => `<div class="coupon${c.redeemed_at ? ' used' : ''}"><span class="em">${esc(c.emoji || '🎟️')}</span><div class="info"><b>${esc(c.title)}</b>${c.description ? `<br><small>${esc(c.description)}</small>` : ''}<br><small class="muted">${c.redeemed_at ? 'Redeemed ' + fmtTime(c.redeemed_at) : 'Valid forever 💕'}</small></div>
  ${mine && !c.redeemed_at ? `<button class="mini" data-redeem="${c.id}">Redeem</button>` : ''}${!mine && !c.redeemed_at ? `<button class="mini soft" data-del="coupons:${c.id}">✕</button>` : ''}</div>`;
RENDER.coupons = () => {
  const l = S.data.coupons || [];
  const mine = l.filter((c) => c.to_user === S.user.id), given = l.filter((c) => c.created_by === S.user.id);
  $('#cpMine').innerHTML = mine.length ? mine.map((c) => couponHtml(c, true)).join('') : `<p class="muted">No coupons yet… hint hint, ${esc(partnerName())} 😏</p>`;
  $('#cpGiven').innerHTML = given.length ? given.map((c) => couponHtml(c, false)).join('') : '<p class="muted">Make one above!</p>';
};
$('#cpMine').onclick = async (e) => {
  const id = e.target.dataset.redeem; if (!id) return;
  if (!await uiConfirm('Redeem this coupon now? 🎉')) return;
  const { error } = await sb.from('coupons').update({ redeemed_at: new Date().toISOString() }).eq('id', id);
  if (error) toast(errMsg(error)); else { toast('Redeemed! Go collect 😘'); floatHearts(document.body, 10); }
};

// ---- secret letters (AES-GCM, key from PBKDF2(password)) ----
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function deriveKey(pw, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptLetter(text, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await deriveKey(pw, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(text));
  return { ciphertext: b64(ct), iv: b64(iv), salt: b64(salt) };
}
async function decryptLetter(l, pw) {
  const k = await deriveKey(pw, unb64(l.salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(l.iv) }, k, unb64(l.ciphertext));
  return new TextDecoder().decode(pt);
}
$('#letterSave').onclick = async () => {
  const text = $('#letterTxt').value.trim(), pw = $('#letterPw').value;
  if (!text) return toast('Write your letter first 💌');
  if (pw.length < 3) return toast('Pick a password (3+ characters)');
  const enc = await encryptLetter(text, pw);
  const row = { ...enc, hint: $('#letterHint').value.trim() || null, updated_at: new Date().toISOString() };
  const existing = (S.data.letters || []).find((l) => l.created_by === S.user.id);
  const { error } = existing ? await sb.from('letters').update(row).eq('id', existing.id) : await sb.from('letters').insert(row);
  if (error) return toast(errMsg(error));
  $('#letterTxt').value = ''; $('#letterPw').value = '';
  toast('Letter sealed with a kiss 💋'); if (!existing) notify('letter', 'sealed a secret letter for you 💌');
};
RENDER.letters = () => {
  const l = S.data.letters || [];
  const mine = l.find((x) => x.created_by === S.user.id), theirs = l.find((x) => x.created_by !== S.user.id);
  $('#letterStatus').textContent = mine ? `Sealed ${fmtTime(mine.updated_at)}. Writing again replaces it (you'll need to retype it).` : 'Encrypted on your phone. Only someone with the password can read it.';
  if (mine && mine.hint && !$('#letterHint').value) $('#letterHint').value = mine.hint;
  const box = $('#letterIn');
  if (!theirs) { box.innerHTML = `<p class="muted">${esc(partnerName())} hasn't written one yet 👀</p>`; return; }
  box.innerHTML = `<div class="big">💌</div>${theirs.hint ? `<p class="muted">Hint: ${esc(theirs.hint)}</p>` : ''}<input id="unlockPw" type="password" placeholder="Password"><button id="unlockBtn">Unlock 🔓</button>`;
  $('#unlockBtn').onclick = async () => {
    try {
      const text = await decryptLetter(theirs, $('#unlockPw').value);
      box.innerHTML = `<div class="letter">${esc(text)}</div><button class="soft mini" id="relock">Lock again</button>`;
      $('#relock').onclick = RENDER.letters; floatHearts(document.body, 12);
    } catch { toast('Wrong password 🙈 Try again!'); }
  };
};

// ---- profile / partner ----
const NICK_SUGG = ['Honey', 'Baby', 'My Love', 'Sunshine', 'Habibi', 'Habibti', 'Bae', 'Cutie', 'My Heart'];
function renderNick() {
  if (!S.partner) return; const theirs = nickFor(S.partner.id), mineN = nickFor(S.user.id);
  $('#nickBox').innerHTML = `<details><summary>✏️ Give them a name</summary><p class="muted">Only you see this name for ${esc(S.partner.display_name)} — everywhere in the app.</p>
    <div class="chips" id="nickChips">${NICK_SUGG.map((n) => `<span data-nick="${esc(n)}" class="${theirs?.nickname === n ? 'on' : ''}">${esc(n)}</span>`).join('')}</div>
    <div class="row2"><input id="nickEmoji" class="short" maxlength="4" placeholder="💗" value="${esc(theirs?.emoji || '')}"><input id="nickIn" maxlength="40" placeholder="Custom name…" value="${esc(theirs?.nickname || '')}"></div>
    <button id="nickSave">Save name 🥰</button>${theirs ? '<button class="soft" id="nickClear">Use their real name</button>' : ''}</details>`;
  $('#myNick').innerHTML = mineN ? `💕 Your partner calls you: <b>${esc(mineN.nickname)}</b> ${esc(mineN.emoji || '')}` : `<span class="muted">${esc(partnerName())} hasn't given you a pet name yet 👀</span>`;
}
document.addEventListener('click', async (e) => {
  const chip = e.target.closest('#nickChips [data-nick]'); if (chip) { $('#nickIn').value = chip.dataset.nick; $$('#nickChips span').forEach((x) => x.classList.toggle('on', x === chip)); return; }
  if (e.target.id === 'nickSave') {
    const nickname = $('#nickIn').value.trim().slice(0, 40), emoji = $('#nickEmoji').value.trim().slice(0, 16) || null; if (!nickname) return toast('Pick or type a name 💕');
    const ex = nickFor(S.partner.id);
    const { error } = ex ? await sb.from('couple_nicknames').update({ nickname, emoji, updated_at: new Date().toISOString() }).eq('couple_id', S.couple.id).eq('target_user', S.partner.id)
      : await sb.from('couple_nicknames').insert({ nickname, emoji });
    if (error) return toast(errMsg(error)); toast(`They're “${nickname}” now 🥰`); hearts(10); notify('nickname', `renamed you to “${nickname}” 🥰`); loadTable('couple_nicknames');
  }
  if (e.target.id === 'nickClear') {
    if (!await uiConfirm(`Go back to calling them ${S.partner.display_name}?`)) return;
    const { error } = await sb.from('couple_nicknames').delete().eq('couple_id', S.couple.id).eq('target_user', S.partner.id);
    if (error) toast(errMsg(error)); else loadTable('couple_nicknames');
  }
});
RENDER.couple_nicknames = () => {
  applyNames(); renderMe();
  Object.entries(RENDER).forEach(([k, f]) => { if (k !== 'couple_nicknames' && S.data[k]) try { f(); } catch (e) { /* */ } });
  if (S.partner) { $('#cpN2').value = partnerName(); }
};
function renderMe() {
  renderSettingsUI();
  $('#pfName').value = S.me.display_name; $('#pfUser').value = S.me.username; $('#pfEmoji').value = S.me.emoji; $('#pfCode').textContent = S.me.invite_code;
  $('#partnerBox').innerHTML = S.partner ? `<div class="person"><span class="em">${esc(partnerEmoji())}</span><div class="info"><b>${esc(partnerName())}</b>${nickFor(S.partner.id) ? ` <small class="muted">(${esc(S.partner.display_name)})</small>` : ''}<br><small>@${esc(S.partner.username)} · together since ${fmtDate(S.couple.created_at)}${S.couple.reunited_at ? `<br>got back together on ${fmtDate(S.couple.reunited_at)} 💞${S.couple.reunions > 1 ? ` (reunion #${S.couple.reunions})` : ''}` : ''}</small></div></div>` : '';
  renderNick();
  $('#shortcutUrl').textContent = location.origin + location.pathname + '?action=ping';
}
$('#pfSave').onclick = async () => {
  const username = $('#pfUser').value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return toast('Username: 3–24 letters, numbers or _');
  const { data, error } = await sb.from('profiles').update({ display_name: $('#pfName').value.trim() || 'Lovebird', username, emoji: $('#pfEmoji').value.trim() || '🐻' }).eq('id', S.user.id).select().single();
  if (error) return toast(/duplicate|unique/i.test(errMsg(error)) ? 'That username is taken 😿' : errMsg(error));
  S.me = data; renderMe(); toast('Saved ✨');
};
$('#disconnectBtn').onclick = async () => {
  if (!await uiConfirm(`Break up with ${partnerName()}? 💔 Your shared space will be saved in case you get back together.`)) return;
  const { error } = await sb.rpc('disconnect');
  if (error) return toast(errMsg(error));
  toast('You broke up 💔 Everything is saved in case you get back together.', 4000);
  boot();
};

function welcomeBack() {
  const r = S.couple?.reunited_at; if (!r || Date.now() - new Date(r) > 3 * 86400000) return;
  const key = 'cc_welcome_' + S.couple.id; if (localStorage.getItem(key) === r) return; localStorage.setItem(key, r);
  openModal(`<div class="big">💞</div><h2>Welcome back together 💞</h2><p>Everything is right where you left it — your photos, notes, games and memories.</p><p class="muted">Together since ${fmtDate(S.couple.created_at)}</p><button data-close>Yay 🥹</button>`);
  setTimeout(() => { confetti(120); hearts(30); }, 200);
}
// ================= GAMES =================
// ---- fx helpers ----
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
// v28: the theme's personality (persona.js) — every call falls back to the default when it's missing
const TP = (k, ...a) => { try { const p = window.FU_P; const f = p && p[k]; return f ? f(...a) : undefined; } catch { return undefined; } };
let AC = null;
function snd(type) {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const seq = { pop: [[600, .06], [900, .06]], ding: [[880, .1], [1320, .15]], bad: [[200, .15], [150, .2]], win: [[523, .1], [659, .1], [784, .1], [1047, .25]], tick: [[1200, .03]], boing: [[300, .08], [500, .08], [350, .1]] }[type] || [[700, .08]];
    let t = AC.currentTime;
    seq.forEach(([f, d]) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type === 'bad' ? 'sawtooth' : 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.1, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02); t += d; });
  } catch (e) { /* no audio */ }
}
function hearts(n, x, y) {
  for (let k = 0; k < n; k++) {
    const h = document.createElement('div'); h.className = 'heart'; const hs = window.CC_fx ? CC_fx().hearts.concat('😘') : ['❤️', '💖', '💕', '💗', '😘']; h.textContent = hs[k % hs.length];
    h.style.left = (x ?? Math.random() * innerWidth) + (Math.random() * 60 - 30) + 'px'; h.style.top = (y ?? innerHeight) + 'px';
    h.style.animationDuration = (2 + Math.random() * 2) + 's'; document.body.appendChild(h); setTimeout(() => h.remove(), 4500);
  }
}
function confetti(n = 80) {
  TP('confettiEm', n);
  const c = ['#e75480', '#ff8fab', '#ffd166', '#a0e7e5', '#c77dff', '#fff'];
  for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'conf'; d.style.left = Math.random() * 100 + 'vw'; d.style.background = rnd(c); d.style.animationDuration = (2 + Math.random() * 2) + 's'; d.style.animationDelay = Math.random() * .5 + 's'; document.body.appendChild(d); setTimeout(() => d.remove(), 5000); }
}
const mine = (r) => r.created_by === S.user.id;
const pn = () => esc(partnerName() || 'Your love');
const vsHtml = (a, b, la = 'You', lb = null, fmt = (v) => v) => {
  lb = lb || pn();
  return `<div class="vs"><div class="${a > b ? 'lead' : ''}"><small>${esc(S.me.emoji)} ${la}</small><b>${fmt(a)}</b></div><div class="${b > a ? 'lead' : ''}"><small>${esc(partnerEmoji() || '💗')} ${lb}</small><b>${fmt(b)}</b></div></div>`;
};
function setBadge(id, txt, isNew) { const el = document.getElementById('tb-' + id); if (!el) return; el.textContent = txt || ''; el.classList.toggle('new', !!isNew); }

// ---- game navigation ----
let curGame = null;
function openGame(g) {
  if (window.FU_used) window.FU_used('g:' + g);
  curGame = g;
  $('#gameHome').classList.add('hidden'); $('#gamePanel').classList.remove('hidden');
  $$('.game').forEach((p) => p.classList.toggle('on', p.dataset.panel === g));
  window.scrollTo(0, 0);
  if (g === 'scratch') requestAnimationFrame(scrReset);
  if (g === 'draw') requestAnimationFrame(drawSize);
  if (g === 'quiz') renderQuiz();
  refreshCoopNotice();
}
function closeGame() { curGame = null; refreshCoopNotice(); stopCatch(); stopBalloons(); $('#gamePanel').classList.add('hidden'); $('#gameHome').classList.remove('hidden'); window.scrollTo(0, 0); }
$$('.gtile').forEach((b) => b.onclick = () => openGame(b.dataset.game));
$('#gameBack').onclick = closeGame;

// ---- scores / leaderboards ----
async function saveScore(game, score) {
  if (!S.couple) return;
  const { error } = await sb.from('game_scores').insert({ game, score });
  if (error) toast('Score not saved: ' + errMsg(error));
}
function bestOf(game, uid, low = false) {
  const l = (S.data.game_scores || []).filter((s) => s.game === game && s.created_by === uid).map((s) => s.score);
  if (!l.length) return null; return low ? Math.min(...l) : Math.max(...l);
}
function renderBoard(game, low = false) {
  const el = document.getElementById('board-' + game); if (!el || !S.partner) return;
  const a = bestOf(game, S.user.id, low), b = bestOf(game, S.partner.id, low);
  const cmp = (x) => x == null ? (low ? Infinity : -Infinity) : (low ? -x : x);
  const recent = (S.data.game_scores || []).filter((s) => s.game === game).slice(0, 5);
  el.innerHTML = `<b>🏆 ${low ? 'Fewest moves' : 'High scores'}</b>` +
    `<div class="vs"><div class="${cmp(a) > cmp(b) ? 'lead' : ''}"><small>${esc(S.me.emoji)} You</small><b>${a ?? '—'}</b></div><div class="${cmp(b) > cmp(a) ? 'lead' : ''}"><small>${esc(partnerEmoji())} ${pn()}</small><b>${b ?? '—'}</b></div></div>` +
    (recent.length ? recent.map((s) => `<div class="row"><span>${esc(emojiOf(s.created_by))} ${esc(nameOf(s.created_by))}: <b>${s.score}</b></span><small>${fmtTime(s.created_at)}</small></div>`).join('') : '<p class="muted">No games yet — set the first record!</p>');
  const leader = a == null && b == null ? '' : cmp(a) >= cmp(b) ? 'You lead 👑' : `${partnerName()} leads`;
  setBadge(game, leader);
}
RENDER.game_scores = () => { renderBoard('catch'); renderBoard('balloons'); renderBoard('memory', true); };

// ---- catch my heart ----
let catchRun = false, catchTimers = [];
function stopCatch() { catchTimers.forEach(clearInterval); catchTimers = []; catchRun = false; const g = $('#gArea'); if (g) g.innerHTML = ''; }
$('#gStart').onclick = () => {
  if (catchRun) return; catchRun = true; let score = 0, t = 0, combo = 0; const g = $('#gArea'); const prevBest = S.partner ? Math.max(bestOf('catch', S.user.id) ?? -Infinity, bestOf('catch', S.partner.id) ?? -Infinity) : -Infinity; g.innerHTML = ''; $('#gScore').innerHTML = '<b>Score: 0</b>';
  const iv = setInterval(() => {
    const it = document.createElement('div'); const bad = Math.random() < .25;
    it.className = 'fall'; it.textContent = bad ? '🧅' : ['❤️', '💖', '💘'][t % 3];
    it.style.left = Math.random() * (g.clientWidth - 36) + 'px'; it.style.top = '-36px'; g.appendChild(it);
    let y = -36; const speed = 3 + t / 12;
    let tr = 0;
    const mv = setInterval(() => { y += speed; it.style.top = y + 'px';
      if (!bad && ++tr % 6 === 0 && window.FX && FX.heavy() && g.childElementCount < 60) { const s2 = document.createElement('div'); s2.className = 'trail'; s2.textContent = '✨'; s2.style.left = (parseFloat(it.style.left) + 10) + 'px'; s2.style.top = (y - 6) + 'px'; g.appendChild(s2); setTimeout(() => s2.remove(), 520); }
      if (y > g.clientHeight) { clearInterval(mv); it.remove(); if (!bad && catchRun) { combo = 0; g.classList.remove('combo', 'combo2'); window.FX && FX.shake(g, 300); } } }, 16); catchTimers.push(mv);
    it.addEventListener('pointerdown', (ev) => { ev.preventDefault(); clearInterval(mv); it.remove(); score += bad ? -3 : 1; $('#gScore').innerHTML = '<b>Score: ' + score + '</b>'; if (window.FX) FX.pop($('#gScore b'));
      if (bad) { combo = 0; g.classList.remove('combo', 'combo2'); toast('Ew onion breath 🤢 −3'); snd('bad'); if (window.FX) { FX.floatText(ev.clientX, ev.clientY, '−3', '#c0264f'); FX.shake(g); FX.burst(ev.clientX, ev.clientY, ['💨', '🤢'], 6, 40); } }
      else { combo++; snd('pop'); g.classList.toggle('combo', combo >= 5 && combo < 10); g.classList.toggle('combo2', combo >= 10);
        if (window.FX) { FX.floatText(ev.clientX, ev.clientY, combo >= 5 ? `+1 ×${combo} 🔥` : '+1'); FX.burst(ev.clientX, ev.clientY, ['✨', '💖', '💗'], combo >= 5 ? 10 : 6, 45); } } });
    if (++t > 30) {
      clearInterval(iv);
      setTimeout(() => {
        if (!catchRun) return; catchRun = false;
        const best = S.partner ? bestOf('catch', S.partner.id) : null;
        $('#gScore').innerHTML = `<b>Final: ${score}</b> ${best != null ? (score > best ? `— you beat ${pn()}'s ${best}! 😎` : `— ${pn()}'s best is ${best}`) : ''}`;
        hearts(15); snd('win'); saveScore('catch', score); g.classList.remove('combo', 'combo2');
        if (score > prevBest && score > 0 && window.FX) { FX.confetti(100); FX.fireworks(4); toast('🏆 New couple record! ' + score); }
      }, 2200);
    }
  }, 500);
  catchTimers.push(iv);
};

// ---- pop the balloons (timed) ----
let balRun = false, balTimers = [];
function stopBalloons() { balTimers.forEach(clearInterval); balTimers = []; balRun = false; const s = $('#sky'); if (s) s.innerHTML = ''; }
$('#balStart').onclick = () => {
  if (balRun) return; balRun = true; let score = 0, left = 20; const s = $('#sky'); s.innerHTML = '';
  const upd = () => $('#balScore').innerHTML = `<b>Popped: ${score}</b> · ⏱️ ${left}s`; upd();
  const spawn = () => {
    if (s.querySelectorAll('.bal').length > 8) s.querySelector('.bal').remove();
    const b = document.createElement('div'); b.className = 'bal'; const gold = Math.random() < .12;
    b.classList.add('spawn'); b.textContent = gold ? '💗' : '🎈'; b.style.left = (3 + Math.random() * 82) + '%'; b.style.top = (5 + Math.random() * 70) + '%';
    b.onpointerdown = (e) => {
      e.preventDefault(); if (!balRun) return; score += gold ? 3 : 1; upd();
      const m = document.createElement('div'); m.className = 'balmsg'; m.style.left = b.style.left; m.style.top = b.style.top; m.textContent = gold ? '+3 ' + rnd(D.balMsgs) : rnd(D.balMsgs);
      b.remove(); s.appendChild(m); setTimeout(() => m.remove(), 1700); snd('pop');
      if (window.FX) { const rp = document.createElement('div'); rp.className = 'ripple'; const rr = s.getBoundingClientRect(); rp.style.left = (e.clientX - rr.left) + 'px'; rp.style.top = (e.clientY - rr.top) + 'px'; s.appendChild(rp); setTimeout(() => rp.remove(), 520);
        FX.burst(e.clientX, e.clientY, gold ? ['💗', '✨', '💖', '🌟'] : ['🎈', '✨', '💥', '🟥'], gold ? 12 : 8, 55); FX.floatText(e.clientX, e.clientY, gold ? '+3 💗' : '+1'); }
    };
    s.appendChild(b); setTimeout(() => b.remove(), 2600);
  };
  spawn(); balTimers.push(setInterval(spawn, 450));
  balTimers.push(setInterval(() => {
    left--; upd();
    if (left <= 0) {
      const sc = score; stopBalloons();
      const pb = S.partner ? Math.max(bestOf('balloons', S.user.id) ?? -Infinity, bestOf('balloons', S.partner.id) ?? -Infinity) : -Infinity;
      $('#balScore').innerHTML = `<b>Time! <span id="balFinal">0</span> popped 🎉</b>`; window.FX ? FX.countUp($('#balFinal'), sc, 900) : ($('#balFinal').textContent = sc); confetti(40); snd('win'); saveScore('balloons', sc);
      if (sc > pb && sc > 0 && window.FX) { FX.fireworks(5); toast('🏆 New couple record! ' + sc); }
    }
  }, 1000));
};

// ---- love-o-meter ----
let meter = 0, meterTimer = null;
const meterLines = [[20, 'Warming up… 😊'], [50, 'Getting toasty 🔥'], [80, 'Dangerously in love 😍'], [100, 'OFF THE CHARTS 💯💗']];
$('#meterBtn').onclick = (e) => {
  meter = Math.min(100, meter + 7); $('#bar').style.width = meter + '%'; snd('tick'); hearts(1, e.clientX, e.clientY); $('#bar').classList.add('beat');
  if (window.FX) { FX.floatText(e.clientX, e.clientY - 10, '+' + 7 + '%'); if (meter >= 100) FX.fireworks(3); }
  $('#meterTxt').textContent = (meterLines.find(([v]) => meter <= v) || meterLines[3])[1];
  if (meter >= 100) { hearts(12); snd('win'); }
  clearInterval(meterTimer);
  meterTimer = setInterval(() => { meter = Math.max(0, meter - 2); $('#bar').style.width = meter + '%'; if (!meter) { clearInterval(meterTimer); $('#bar').classList.remove('beat'); } }, 200);
};

// ---- memory match (scores = fewest moves) ----
let memOpen = [], memLock = false, memMoves = 0;
function memReset() {
  const icons = [...D.memoryIcons, ...D.memoryIcons].sort(() => Math.random() - 0.5);
  memOpen = []; memLock = false; memMoves = 0; $('#memTxt').textContent = '';
  $('#mem').innerHTML = icons.map((ic) => `<div class="mc" data-ic="${ic}"><span class="back">?</span><span class="face">${ic}</span></div>`).join('');
}
$('#mem').onclick = (e) => {
  const c = e.target.closest('.mc');
  if (!c || memLock || c.classList.contains('open') || c.classList.contains('done')) return;
  c.classList.add('open'); memOpen.push(c); snd('tick');
  if (memOpen.length < 2) return;
  memMoves++; const [a, b] = memOpen; memOpen = [];
  if (a.dataset.ic === b.dataset.ic) {
    a.classList.replace('open', 'done'); b.classList.replace('open', 'done'); snd('ding');
    setTimeout(() => { a.classList.add('matched'); b.classList.add('matched'); if (window.FX) { FX.burstAt(a, ['✨', '💖'], 8, 40); FX.burstAt(b, ['✨', '💖'], 8, 40); } }, 320);
    if (!$$('#mem .mc:not(.done)').length) { $('#memTxt').textContent = `You won in ${memMoves} moves! Prize: one kiss 💋`; hearts(12); confetti(50); snd('win'); saveScore('memory', memMoves); window.FX && FX.fireworks(6); }
  } else { memLock = true; setTimeout(() => { a.classList.remove('open'); b.classList.remove('open'); memLock = false; }, 800); }
};
$('#memReset').onclick = memReset; memReset();

// ---- reasons / hug ----
let lastReason = -1;
$('#reasonBtn').onclick = (e) => {
  let i; do { i = Math.floor(Math.random() * D.reasons.length); } while (i === lastReason && D.reasons.length > 1);
  lastReason = i; $('#reason').textContent = D.reasons[i] + ' 💖'; hearts(3, e.clientX, e.clientY); snd('pop');
};
$('#hugBtn').onclick = () => { $('#hugOverlay').classList.remove('hidden'); snd('win'); if (navigator.vibrate) navigator.vibrate(300); };
$('#hugOverlay').onclick = () => $('#hugOverlay').classList.add('hidden');
$('#hugSend').onclick = () => sendPing();

// ---- poke the bear (shared live counter) ----
let pokePending = 0, pokeTimer = null, bearI = 0;
const pokeOf = (uid) => Number((S.data.poke_counts || []).find((p) => p.created_by === uid)?.count || 0);
function renderPokes() {
  if (!S.partner) return;
  const a = pokeOf(S.user.id) + pokePending, b = pokeOf(S.partner.id);
  $('#pokeVs').innerHTML = vsHtml(a, b) + `<p class="muted">Together: <b id="pokeTot">${renderPokes.last ?? a + b}</b> pokes 🐻</p>`;
  if (window.FX) { FX.countUp($('#pokeTot'), a + b, 500); if (renderPokes.lastB != null && b > renderPokes.lastB) FX.pop($$('#pokeVs .vs b')[1]); if (renderPokes.lastA != null && a > renderPokes.lastA) FX.pop($$('#pokeVs .vs b')[0]); }
  renderPokes.last = a + b; renderPokes.lastA = a; renderPokes.lastB = b;
  setBadge('bear', (a + b) + ' pokes');
}
RENDER.poke_counts = renderPokes;
async function flushPokes() {
  pokeTimer = null; const n = Math.min(50, pokePending); if (!n) return;
  const { data, error } = await sb.rpc('poke_bear', { n });
  pokePending -= n;
  if (error) { toast(errMsg(error)); renderPokes(); return; }
  if (Date.now() - (flushPokes.lastPush || 0) > 120000) { flushPokes.lastPush = Date.now(); notify('poke', 'poked the bear 🧸 poke back!'); }
  const row = (S.data.poke_counts ||= []).find((p) => p.created_by === S.user.id);
  if (row) row.count = data; else S.data.poke_counts.push({ created_by: S.user.id, count: data });
  renderPokes(); if (pokePending) pokeTimer = setTimeout(flushPokes, 300);
}
$('#bearEl').onclick = (e) => {
  $('#bearTxt').textContent = D.bearLines[bearI++ % D.bearLines.length]; hearts(4, e.clientX, e.clientY); snd('boing');
  if (window.FX) { FX.cls($('#bearEl'), 'squish', 450); FX.burst(e.clientX, e.clientY, ['💗', '💕', '🐻'], 7, 60); FX.floatText(e.clientX, e.clientY - 20, '+1 poke'); }
  pokePending++; renderPokes(); if (!pokeTimer) pokeTimer = setTimeout(flushPokes, 700);
};

// ---- fortune cookie (partner-written fortunes first) ----
$('#cookie').onclick = (e) => {
  const fromP = (S.data.fortunes || []).filter((f) => !mine(f));
  let txt;
  if (fromP.length && Math.random() < .75) { const f = rnd(fromP); txt = `${f.message}  — ${partnerName()} 💌`; }
  else txt = rnd(D.fortunes);
  $('#fortune').textContent = txt; hearts(4, e.clientX, e.clientY); snd('pop');
  if (window.FX) { FX.cls($('#cookie'), 'crack', 600); FX.cls($('#fortune'), 'paper', 600); FX.burstAt($('#cookie'), ['🥠', '✨', '⭐'], 8, 50); }
};
$('#ftAdd').onclick = async () => {
  const message = $('#ftTxt').value.trim(); if (!message) return;
  const { error } = await sb.from('fortunes').insert({ message });
  if (error) return toast(errMsg(error)); $('#ftTxt').value = ''; toast('Fortune baked 🥠');
};
RENDER.fortunes = () => {
  const l = S.data.fortunes || [], m = l.filter(mine), p = l.filter((f) => !mine(f));
  $('#ftList').innerHTML = m.length ? m.map((f) => `<div class="row"><span>${esc(f.message)}</span><button class="mini soft" data-del="fortunes:${f.id}">✕</button></div>`).join('') : '<p class="muted">No fortunes baked yet.</p>';
  setBadge('fortune', p.length ? p.length + ' from ' + partnerName() : '');
};

// ---- date wheel (shared ideas + spin log) ----
const ideas = () => { const l = (S.data.date_ideas || []).map((i) => i.idea); return l.length ? l : D.dates; };
let spinning = false;
$('#spinBtn').onclick = () => {
  if (spinning) return; spinning = true; const pool = ideas(); let n = 0; const total = 22 + Math.floor(Math.random() * 6); const out = $('#wheelOut'); out.classList.remove('win');
  const tick = async () => {
    out.textContent = rnd(pool); snd('tick'); window.FX && FX.cls(out, 'spin', 100);
    if (++n <= total) { setTimeout(tick, 50 + Math.pow(n / total, 3) * 380); return; }
    {
      spinning = false; hearts(8); snd('ding'); if (window.FX) { FX.cls(out, 'win', 1300); FX.burstAt(out, ['🎉', '💖', '✨', '🎡'], 14, 90); }
      const { error } = await sb.from('date_spins').insert({ idea: $('#wheelOut').textContent.slice(0, 150) });
      if (error) toast(errMsg(error)); else toast(`Saved! ${partnerName()} will see it too 🎡`);
    }
  };
  tick();
};
$('#ideaAdd').onclick = async () => {
  const idea = $('#ideaTxt').value.trim(); if (!idea) return;
  if (!(S.data.date_ideas || []).length && await uiConfirm('Also add the built-in starter ideas to your shared list?')) {
    await sb.from('date_ideas').insert(D.dates.map((d) => ({ idea: d })));
  }
  const { error } = await sb.from('date_ideas').insert({ idea });
  if (error) return toast(errMsg(error)); $('#ideaTxt').value = ''; loadTable('date_ideas');
};
$('#ideaList').onclick = async (e) => {
  const id = e.target.dataset.edit; if (!id) return;
  const cur = (S.data.date_ideas || []).find((i) => i.id === id); if (!cur) return;
  const v = await uiPrompt('Edit idea: ' + cur.idea); if (v == null || !v.trim()) return;
  const { error } = await sb.from('date_ideas').update({ idea: v.trim().slice(0, 150) }).eq('id', id);
  if (error) toast(errMsg(error)); else loadTable('date_ideas');
};
RENDER.date_ideas = () => {
  const l = S.data.date_ideas || [];
  $('#ideaList').innerHTML = l.length ? l.map((i) => `<div class="row"><span>${esc(i.idea)} <small class="muted">— ${esc(nameOf(i.created_by))}</small></span><span><button class="mini soft" data-edit="${i.id}">✏️</button><button class="mini soft" data-del="date_ideas:${i.id}">✕</button></span></div>`).join('') : '<p class="muted">Using starter ideas. Add your own and the wheel will use your shared list!</p>';
};
RENDER.date_spins = () => {
  const l = S.data.date_spins || [];
  $('#spinLog').innerHTML = l.length ? l.map((s) => `<div class="row"><span>${esc(emojiOf(s.created_by))} ${esc(s.idea)}</span><small>${fmtTime(s.created_at)}</small></div>`).join('') : '<p class="muted">No spins yet.</p>';
  if (l[0]) { setBadge('wheel', 'Last: ' + l[0].idea.slice(0, 18)); if (!spinning) $('#wheelOut').textContent = l[0].idea; }
};

// ---- important question (partner asks, runaway "No") ----
let bqCur = null, bqNo = 0;
const noTxt = ['Are you sure?', 'Think again 😤', 'Wrong button', "Nope, can't catch me", 'Just press yes 🥺'];
function renderBQ() {
  const l = S.data.big_questions || [];
  bqCur = l.filter((q) => q.to_user === S.user.id && !q.answered_at).sort((a, b) => a.created_at.localeCompare(b.created_at))[0] || null;
  bqNo = 0; $('#bqNo').style.display = ''; $('#bqNo').style.left = ''; $('#bqNo').style.top = ''; $('#bqNo').textContent = 'No'; $('#bqYes').style.transform = ''; $('#bqRes').textContent = '';
  $('#bqFrom').textContent = bqCur ? `${partnerName()} asks…` : 'No pending questions — here is a classic:';
  $('#bqText').textContent = bqCur ? bqCur.question : 'Will you love me even when I steal your fries?';
  const sent = l.filter(mine);
  $('#bqSent').innerHTML = sent.map((q) => `<div class="row"><span>${esc(q.question)}<br><small class="muted">${q.answered_at ? `💖 YES! (${q.no_attempts} "no" attempts) ${fmtTime(q.answered_at)}` : 'Waiting for an answer…'}</small></span><button class="mini soft" data-del="big_questions:${q.id}">✕</button></div>`).join('');
  setBadge('question', bqCur ? 'New question!' : '', !!bqCur);
}
RENDER.big_questions = renderBQ;
function bqRun(e) {
  e.preventDefault(); const no = $('#bqNo'), qa = $('#qa'); bqNo++;
  no.style.left = Math.random() * (qa.clientWidth - 90) + 'px'; no.style.top = Math.random() * 85 + 'px';
  no.textContent = noTxt[bqNo % noTxt.length]; window.FX && FX.cls(no, 'squash', 350); $('#bqYes').style.transform = 'scale(' + Math.min(1 + bqNo * .12, 2.2) + ')'; snd('boing');
}
$('#bqNo').addEventListener('pointerdown', bqRun); $('#bqNo').addEventListener('mouseenter', bqRun);
$('#bqYes').onclick = async () => {
  $('#bqNo').style.display = 'none'; hearts(40); confetti(60); snd('win'); if (window.FX) { FX.burstAt($('#bqYes'), ['💖', '💍', '💕', '✨', '😍'], 24, 140); FX.fireworks(4); }
  if (bqCur) {
    const { error } = await sb.from('big_questions').update({ answered_at: new Date().toISOString(), no_attempts: bqNo }).eq('id', bqCur.id);
    $('#bqRes').textContent = error ? errMsg(error) : `Correct answer! ${partnerName()} will see your YES 💖`;
    bqCur = null; setTimeout(() => loadTable('big_questions'), 2500);
  } else $('#bqRes').textContent = 'Correct answer! Your fries are officially half mine 🍟❤️';
};
$('#bqAdd').onclick = async () => {
  const question = $('#bqAsk').value.trim(); if (!question) return;
  const { error } = await sb.from('big_questions').insert({ question });
  if (error) return toast(errMsg(error)); $('#bqAsk').value = ''; toast('Question sent 💍 (the No button runs away 😏)'); notify('question', 'has an important question for you 💍');
};

// ---- scratch card (partner hides prizes) ----
const scr = $('#scr'), sx = scr.getContext('2d'); let scrDown = false, scrDone = false, scrCard = null;
function scrReset() {
  const r = scr.getBoundingClientRect(); scr.width = r.width || 300; scr.height = r.height || 140; scrDone = false; scr.style.transition = ''; scr.style.opacity = 1;
  const gr = sx.createLinearGradient(0, 0, scr.width, scr.height); gr.addColorStop(0, '#c0c0c0'); gr.addColorStop(.5, '#eee'); gr.addColorStop(1, '#b0b0b0');
  sx.globalCompositeOperation = 'source-over'; sx.fillStyle = gr; sx.fillRect(0, 0, scr.width, scr.height);
  scr.parentElement.classList.remove('revealed'); sx.fillStyle = '#8b2252'; sx.font = 'bold 20px Trebuchet MS'; sx.textAlign = 'center'; sx.fillText('✨ Scratch here ✨', scr.width / 2, scr.height / 2 + 7);
  const pending = (S.data.scratch_cards || []).filter((c) => c.to_user === S.user.id && !c.scratched_at).sort((a, b) => a.created_at.localeCompare(b.created_at));
  scrCard = pending[0] || null;
  $('#scrTxt').textContent = scrCard ? scrCard.prize : rnd(D.prizes);
  $('#scrFrom').textContent = scrCard ? `🎁 ${partnerName()} hid a prize for you! (${pending.length} waiting)` : 'Scratch to reveal your prize';
}
function scrAt(e) { const r = scr.getBoundingClientRect(); sx.globalCompositeOperation = 'destination-out'; sx.beginPath(); sx.arc((e.clientX - r.left) * scr.width / r.width, (e.clientY - r.top) * scr.height / r.height, 20, 0, 7); sx.fill(); }
async function scrCheck() {
  if (scrDone) return; const d = sx.getImageData(0, 0, scr.width, scr.height).data; let c = 0, tot = 0;
  for (let i = 3; i < d.length; i += 64) { tot++; if (d[i] === 0) c++; }
  if (c / tot > .5) {
    scrDone = true; scr.style.transition = 'opacity .6s'; scr.style.opacity = 0; hearts(12); snd('win');
    scr.parentElement.classList.add('revealed'); if (window.FX) { FX.burstAt(scr, ['✨', '🌟', '💖', '🎁'], 16, 100); FX.confetti(30); }
    if (scrCard) { const id = scrCard.id; scrCard = null; const { error } = await sb.from('scratch_cards').update({ scratched_at: new Date().toISOString() }).eq('id', id); if (error) toast(errMsg(error)); else toast(`${partnerName()} will know you scratched it 😘`); }
  }
}
scr.addEventListener('pointerdown', (e) => { scrDown = true; scr.setPointerCapture && scr.setPointerCapture(e.pointerId); scrAt(e); });
scr.addEventListener('pointermove', (e) => { if (scrDown) scrAt(e); });
['pointerup', 'pointercancel'].forEach((t) => scr.addEventListener(t, () => { scrDown = false; scrCheck(); }));
$('#scrNew').onclick = () => { scrReset(); snd('pop'); };
$('#scrAdd').onclick = async () => {
  const prize = $('#scrPrize').value.trim(); if (!prize) return;
  const { error } = await sb.from('scratch_cards').insert({ prize });
  if (error) return toast(errMsg(error)); $('#scrPrize').value = ''; toast('Prize hidden 🤫'); notify('scratch', 'hid a scratch-card prize for you 🎟️');
};
RENDER.scratch_cards = () => {
  const l = S.data.scratch_cards || [];
  $('#scrSent').innerHTML = l.filter(mine).map((c) => `<div class="row"><span>${esc(c.prize)}<br><small class="muted">${c.scratched_at ? '✨ Scratched ' + fmtTime(c.scratched_at) : 'Not scratched yet'}</small></span>${c.scratched_at ? '' : `<button class="mini soft" data-del="scratch_cards:${c.id}">✕</button>`}</div>`).join('');
  const n = l.filter((c) => c.to_user === S.user.id && !c.scratched_at).length;
  setBadge('scratch', n ? n + ' prize' + (n > 1 ? 's' : '') + '!' : '', !!n);
  if (curGame === 'scratch' && !scrDown && (!scrCard || !l.some((c) => c.id === scrCard.id))) scrReset();
};

// ---- open when letters ----
$('#owSeg').onclick = (e) => { const o = e.target.dataset.o; if (!o) return; $$('#owSeg button').forEach((b) => b.classList.toggle('on', b.dataset.o === o)); $('#owIn').classList.toggle('hidden', o !== 'in'); $('#owOut').classList.toggle('hidden', o !== 'out'); };
RENDER.open_when = () => {
  const l = S.data.open_when || [], inbox = l.filter((x) => x.to_user === S.user.id), sent = l.filter(mine);
  const envs = inbox.length ? inbox.map((x) => `<div class="env${x.opened_at ? '' : ' unread'}" data-ow="${x.id}"><b>${x.opened_at ? esc(x.emoji) : '✉️'}</b>${esc(x.title)}</div>`).join('')
    : `<p class="muted">${pn()} hasn't written any yet — here are some from us 💕</p>` + D.envs.map((x, i) => `<div class="env" data-owd="${i}"><b>✉️</b>Open when ${esc(x[1])}</div>`).join('');
  $('#owIn').innerHTML = envs;
  $('#owSent').innerHTML = sent.length ? '<h3 class="gsec">Sent</h3>' + sent.map((x) => `<div class="row"><span>${esc(x.emoji)} ${esc(x.title)}<br><small class="muted">${x.opened_at ? '💌 Opened ' + fmtTime(x.opened_at) : 'Still sealed'}</small></span><button class="mini soft" data-del="open_when:${x.id}">✕</button></div>`).join('') : '';
  const n = inbox.filter((x) => !x.opened_at).length;
  setBadge('openwhen', n ? n + ' sealed' : '', !!n);
};
$('#owIn').onclick = async (e) => {
  const el = e.target.closest('[data-ow],[data-owd]'); if (!el) return; snd('ding');
  if (el.dataset.owd != null) { const [em, t, m] = D.envs[+el.dataset.owd]; openModal(`<h2>${em} Open when ${esc(t)}</h2><div class="letter">${esc(m)}</div><button class="soft" data-close>Close 💕</button>`); return; }
  const x = (S.data.open_when || []).find((r) => r.id === el.dataset.ow); if (!x) return;
  openModal(`<h2>${esc(x.emoji)} ${esc(x.title)}</h2><div class="letter">${esc(x.body)}</div><p class="muted">— ${pn()}</p><button class="soft" data-close>Close 💕</button>`); hearts(10);
  if (!x.opened_at) { await sb.from('open_when').update({ opened_at: new Date().toISOString() }).eq('id', x.id); }
};
$('#owAdd').onclick = async () => {
  let title = $('#owTitle').value.trim(); const body = $('#owBody').value.trim();
  if (!title || !body) return toast('Add a title and a letter 💌');
  if (!/^open when/i.test(title)) title = 'Open when ' + title;
  const { error } = await sb.from('open_when').insert({ emoji: $('#owEmoji').value.trim() || '✉️', title: title.slice(0, 80), body });
  if (error) return toast(errMsg(error)); $('#owTitle').value = $('#owBody').value = ''; toast('Envelope sealed ✉️'); notify('openwhen', 'wrote you an ' + title.slice(0, 80) + ' letter ✉️');
};

// ---- love quiz (write about yourself, partner guesses) ----
let qzCorrect = 0;
function qzOptsRender(vals = ['', '', '', '']) {
  $('#qzOpts').innerHTML = vals.map((v, i) => `<div class="optrow"><input data-qo="${i}" maxlength="80" placeholder="Option ${i + 1}${i > 1 ? ' (optional)' : ''}" value="${esc(v)}"><button data-qc="${i}" class="${i === qzCorrect ? 'on' : ''}">✓</button></div>`).join('');
}
$('#qzOpts').onclick = (e) => { const i = e.target.dataset.qc; if (i == null) return; qzCorrect = +i; $$('#qzOpts [data-qc]').forEach((b) => b.classList.toggle('on', +b.dataset.qc === qzCorrect)); };
qzOptsRender();
$('#quizSeg').onclick = (e) => { const q = e.target.dataset.q; if (!q) return; $$('#quizSeg button').forEach((b) => b.classList.toggle('on', b.dataset.q === q)); ['play', 'write', 'score'].forEach((k) => $('#quiz' + k[0].toUpperCase() + k.slice(1)).classList.toggle('hidden', k !== q)); renderQuiz(); };
$('#qzAdd').onclick = async () => {
  const question = $('#qzQ').value.trim(); const raw = $$('#qzOpts [data-qo]').map((i) => i.value.trim());
  if (!question) return toast('Write a question');
  if (!raw[qzCorrect]) return toast('The ✓ correct option is empty');
  const options = [], map = {}; raw.forEach((v, i) => { if (v) { map[i] = options.length; options.push(v); } });
  if (options.length < 2) return toast('Add at least 2 options');
  const { error } = await sb.from('quiz_questions').insert({ question, options, correct: map[qzCorrect] });
  if (error) return toast(errMsg(error)); $('#qzQ').value = ''; qzCorrect = 0; qzOptsRender(); toast(`Question added — ${partnerName()} can answer it now 🧠`); notify('quiz', 'added a love-quiz question about themselves 📝');
};
let classicI = 0, classicS = 0;
function renderQuiz() {
  if (!S.partner) return;
  const qs = S.data.quiz_questions || [], ans = S.data.quiz_answers || [];
  const answered = new Set(ans.filter(mine).map((a) => a.question_id));
  const todo = qs.filter((q) => !mine(q) && !answered.has(q.id));
  const myQs = qs.filter(mine);
  const scoreOf = (uid) => { const a = ans.filter((x) => x.created_by === uid); return [a.filter((x) => x.is_correct).length, a.length]; };
  const [mc, mt] = scoreOf(S.user.id), [pc, pt] = scoreOf(S.partner.id);
  setBadge('quiz', todo.length ? todo.length + ' to answer' : (mt || pt ? `${mc}/${mt} vs ${pc}/${pt}` : ''), !!todo.length);
  // play
  const box = $('#quizPlay');
  if (todo.length) {
    const q = todo[0];
    box.innerHTML = `<p class="muted">About ${pn()} · ${todo.length} left</p><p class="bq">${esc(q.question)}</p>` + q.options.map((o, i) => `<button class="opt" data-qa="${i}">${esc(o)}</button>`).join('') + '<p id="qzRes"></p>';
    box.onclick = async (e) => {
      const i = e.target.dataset.qa; if (i == null || box.dataset.busy) return; box.dataset.busy = 1;
      const { data, error } = await sb.from('quiz_answers').insert({ question_id: q.id, choice: +i }).select().single();
      if (error) { delete box.dataset.busy; return toast(errMsg(error)); }
      e.target.style.background = data.is_correct ? '#8fd694' : '#ff9a9a';
      if (!data.is_correct) box.querySelector(`[data-qa="${q.correct}"]`).style.background = '#8fd694';
      $('#qzRes').textContent = data.is_correct ? 'Correct! You know them so well 🥰' : 'Nope! 😅'; snd(data.is_correct ? 'ding' : 'bad');
      (S.data.quiz_answers ||= []).push(data);
      setTimeout(() => { delete box.dataset.busy; renderQuiz(); }, 1300);
    };
  } else if (qs.some((q) => !mine(q))) {
    box.innerHTML = `<p>You've answered all of ${pn()}'s questions! 🎉</p><p class="muted">Score: <b>${mc}/${mt}</b>. Nudge them to write more 😏</p>`; box.onclick = null;
  } else {
    // classic fallback
    if (classicI >= D.quiz.length) {
      box.innerHTML = `<p>Classic quiz: ${classicS}/${D.quiz.length} — you always pass 💯</p><p class="muted">${pn()} hasn't written questions yet. Write yours in “Write”!</p><button class="soft" id="qzRetake">Retake</button>`;
      box.onclick = (e) => { if (e.target.id === 'qzRetake') { classicI = classicS = 0; renderQuiz(); } };
    } else {
      const Q = D.quiz[classicI];
      box.innerHTML = `<p class="muted">Classic quiz (until ${pn()} writes their own)</p><p class="bq">${esc(Q.q)}</p>` + Q.o.map((o, i) => `<button class="opt" data-qa="${i}">${esc(o)}</button>`).join('');
      box.onclick = (e) => { const i = e.target.dataset.qa; if (i == null || box.dataset.busy) return; box.dataset.busy = 1; const ok = Q.a.includes(+i); if (ok) classicS++; e.target.style.background = ok ? '#8fd694' : '#ff9a9a'; snd(ok ? 'ding' : 'bad'); setTimeout(() => { delete box.dataset.busy; classicI++; renderQuiz(); }, 1000); };
    }
  }
  // write list
  $('#qzMine').innerHTML = myQs.length ? '<h3 class="gsec">Your questions</h3>' + myQs.map((q) => { const a = ans.find((x) => x.question_id === q.id); return `<div class="row"><span>${esc(q.question)}<br><small class="muted">✓ ${esc(q.options[q.correct])} · ${a ? (a.is_correct ? `${pn()} got it 🎯` : `${pn()} said “${esc(q.options[a.choice] || '?')}” ❌`) : 'not answered yet'}</small></span><button class="mini soft" data-del="quiz_questions:${q.id}">✕</button></div>`; }).join('') : '';
  // scores
  $('#quizScore').innerHTML = `<p class="muted">Who knows who better?</p>` + vsHtml(mc, pc, 'You', null, (v) => v) +
    `<p class="muted">You: ${mc}/${mt} correct about ${pn()} · ${pn()}: ${pc}/${pt} correct about you</p>` +
    (mt && pt ? `<p class="bq">${mc / mt > pc / pt ? 'You know them better 😎' : mc / mt < pc / pt ? `${pn()} knows you better 🥹` : "It's a tie! Soulmates 💞"}</p>` : '');
}
RENDER.quiz_questions = renderQuiz; RENDER.quiz_answers = renderQuiz;

// ---- draw me a heart (gallery for partner) ----
const dc = $('#draw'), dx = dc.getContext('2d'); let dDown = false, dLast = null, dCount = 0, dColor = 'rainbow';
const DCOL = ['rainbow', '#e75480', '#8b2252', '#ff9f1c', '#2ec4b6', '#6a4c93', '#222'];
$('#drawColors').innerHTML = DCOL.map((c) => `<span data-dc="${c}" class="${c === dColor ? 'on' : ''}" style="background:${c === 'rainbow' ? 'linear-gradient(45deg,#ff8fab,#ffd166,#a0e7e5,#c77dff)' : c}"></span>`).join('');
$('#drawColors').onclick = (e) => { const c = e.target.dataset.dc; if (!c) return; dColor = c; $$('#drawColors span').forEach((s) => s.classList.toggle('on', s.dataset.dc === c)); };
function drawSize() { const r = dc.getBoundingClientRect(); if (!r.width) return; let img = null; try { if (dc.width && dc.height) img = dx.getImageData(0, 0, dc.width, dc.height); } catch (e) { /* */ } dc.width = r.width; dc.height = r.height; if (img) dx.putImageData(img, 0, 0); }
function dPos(e) { const r = dc.getBoundingClientRect(); return [(e.clientX - r.left) * dc.width / r.width, (e.clientY - r.top) * dc.height / r.height]; }
dc.addEventListener('pointerdown', (e) => { dDown = true; dc.setPointerCapture && dc.setPointerCapture(e.pointerId); dLast = dPos(e); });
dc.addEventListener('pointermove', (e) => { if (!dDown) return; const p = dPos(e); dx.strokeStyle = dColor === 'rainbow' ? 'hsl(' + (330 + Math.sin(dCount / 20) * 30) + ',80%,55%)' : dColor; dx.lineWidth = 6; dx.lineCap = 'round'; dx.beginPath(); dx.moveTo(dLast[0], dLast[1]); dx.lineTo(p[0], p[1]); dx.stroke(); dLast = p; dCount++; if (dCount % 9 === 0 && window.FX) FX.burst(e.clientX, e.clientY, ['✨', '💫'], 2, 18); });
['pointerup', 'pointercancel'].forEach((t) => dc.addEventListener(t, () => dDown = false));
let rzT; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(drawSize, 200); });
$('#drawClear').onclick = () => { dx.clearRect(0, 0, dc.width, dc.height); dCount = 0; $('#drawTxt').textContent = ''; };
$('#drawRate').onclick = () => { $('#drawTxt').textContent = dCount < 5 ? 'A blank canvas. Minimalist. 10/10 🖼️' : rnd(['11/10, putting this in a museum 🏛️', 'Picasso is shaking 🎨', "I'm framing this. No arguments.", 'Most beautiful heart ever 💖', 'Is that me? I look great 😍']); hearts(8); snd('win'); };
$('#drawSend').onclick = async () => {
  if (dCount < 5) return toast('Draw something first 🎨');
  const max = 600, s = Math.min(1, max / Math.max(dc.width, dc.height));
  const c = document.createElement('canvas'); c.width = Math.round(dc.width * s); c.height = Math.round(dc.height * s);
  const x = c.getContext('2d'); x.fillStyle = '#fff0f5'; x.fillRect(0, 0, c.width, c.height); x.drawImage(dc, 0, 0, c.width, c.height);
  const image = c.toDataURL('image/jpeg', .8);
  if (image.length > 400000) return toast('Drawing too big 😅');
  $('#drawSend').disabled = true;
  const { error } = await sb.from('drawings').insert({ image, caption: $('#drawCap').value.trim() || null });
  $('#drawSend').disabled = false;
  if (error) return toast(errMsg(error));
  $('#drawCap').value = ''; $('#drawClear').onclick(); hearts(10); snd('win'); toast(`Sent to ${partnerName()}'s gallery 🖼️`); notify('drawing', 'drew something for you 🎨');
};
RENDER.drawings = () => {
  const l = S.data.drawings || [];
  $('#drawGal').innerHTML = l.length ? l.map((d) => `<div class="polaroid dr" data-draw="${d.id}"><img src="${esc(d.image)}" alt=""><p>${esc(d.caption || '')}<br><small class="muted">${mine(d) ? 'You → ' + pn() : 'From ' + pn()}</small></p></div>`).join('') : '<p class="muted" style="grid-column:1/-1">No drawings yet. Send the first masterpiece!</p>';
  const n = l.filter((d) => !mine(d) && Date.now() - new Date(d.created_at) < 86400000 * 2).length;
  setBadge('draw', n ? n + ' new' : (l.length ? l.length + ' in gallery' : ''), !!n);
};
$('#drawGal').onclick = (e) => {
  const el = e.target.closest('[data-draw]'); if (!el) return; const d = (S.data.drawings || []).find((x) => x.id === el.dataset.draw); if (!d) return;
  openModal(`<img src="${esc(d.image)}"><p>${esc(d.caption || '')}</p><small class="muted">${esc(nameOf(d.created_by))} · ${fmtTime(d.created_at)}</small><br><button class="danger" data-del="drawings:${d.id}">Delete</button><button class="soft" data-close>Close</button>`);
};

// ---- compatibility (deterministic per couple, so you both see the same) ----
function hashStr(s) { let h = 5381; for (const c of s) h = (Math.imul(h, 33) ^ c.codePointAt(0)) >>> 0; return h; }
$('#calcBtn').onclick = () => {
  const a = $('#cpN1').value.trim().toLowerCase(), b = $('#cpN2').value.trim().toLowerCase(); const t = $('#calcTxt');
  const us = S.me && S.partner && [S.me.display_name.toLowerCase(), partnerName().toLowerCase()].sort().join('|') === [a, b].sort().join('|');
  const target = us ? 100 + hashStr(S.couple.id) % 900 : 50 + hashStr([a, b].sort().join('|')) % 51;
  let p = 0; const iv = setInterval(() => {
    p += Math.ceil((target - p) / 8) || 1; t.textContent = 'Calculating… ' + p + '%'; snd('tick');
    if (p >= target) { clearInterval(iv); t.textContent = target + '% compatible! ' + (us ? rnd(['The machine is crying 🥹', 'Soulmates confirmed 💞', 'Off the charts. Literally.']) : 'Not bad… but not you two 😏'); hearts(15); snd('win'); if (window.FX) { FX.cls(t, 'calcglow', 1300); FX.burstAt(t, ['💞', '💖', '✨', '🔮'], 14, 90); } }
  }, 60);
};

// ---- easter egg + finale ----
let eggN = 0, eggT;
$('#coupleTitle').onclick = () => {
  clearTimeout(eggT); eggT = setTimeout(() => eggN = 0, 1500);
  if (++eggN < 5) { snd('tick'); return; }
  eggN = 0; document.body.classList.toggle('secret'); snd('win'); hearts(30); confetti(60);
  openModal(`<h2>🥚 You found the secret!</h2><p>Secret fact: ${pn()} checks their phone way too often hoping it's you.</p><p>Party mode ${document.body.classList.contains('secret') ? 'ON 🌈' : 'off'} — tap the title 5 times to toggle.</p><button class="soft" data-close>Close 💕</button>`);
};
const fc = $('#fw'), fx = fc.getContext('2d'); let parts = [], fwRun = false, fwTimers = [];
function fwBurst(x, y) { const hue = Math.random() * 60 + 300; for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 60 + Math.random() * 30, h: hue }); } }
function fwHeart() { const cx = fc.width / 2, cy = fc.height / 2.4, s = Math.min(fc.width, fc.height) / 40; for (let t = 0; t < Math.PI * 2; t += .08) { const hx = 16 * Math.pow(Math.sin(t), 3), hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); parts.push({ x: cx, y: cy, vx: hx * s / 40, vy: hy * s / 40, l: 90, h: 340 }); } }
function fwLoop() { if (!fwRun) return; fx.fillStyle = 'rgba(43,10,30,.2)'; fx.fillRect(0, 0, fc.width, fc.height); parts = parts.filter((p) => p.l > 0); parts.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += .03; p.vx *= .985; p.vy *= .985; p.l--; fx.fillStyle = 'hsla(' + p.h + ',90%,65%,' + Math.min(1, p.l / 40) + ')'; fx.fillRect(p.x, p.y, 3, 3); }); requestAnimationFrame(fwLoop); }
let fwDone = false;
$('#finaleBtn').onclick = () => {
  const f = $('#finale'); f.classList.remove('hidden'); fc.width = innerWidth; fc.height = innerHeight; parts = []; fwRun = true; fwDone = false; fwLoop();
  const msg = $('#fMsg'); msg.style.opacity = 0; const p = partnerName() || 'my love';
  const lines = ['You made it to the end… 💫', "But this isn't the end.", `It's just the beginning of ${S.me?.display_name || 'you'} & ${p}.`, 'Today, tomorrow, and every fry-stealing day after. ❤️', '(tap anywhere to go back)'];
  fwTimers.forEach(clearTimeout); fwTimers = [];
  for (let i = 0; i < 12; i++) fwTimers.push(setTimeout(() => { fwBurst(Math.random() * fc.width, Math.random() * fc.height * .6); snd('pop'); }, i * 450));
  fwTimers.push(setTimeout(() => { fwHeart(); snd('win'); }, 5600));
  lines.forEach((l, i) => fwTimers.push(setTimeout(() => { msg.style.opacity = 0; fwTimers.push(setTimeout(() => { msg.textContent = l; msg.style.opacity = 1; if (i === lines.length - 1) fwDone = true; }, 500)); }, i * 2600)));
  fwTimers.push(setTimeout(() => { confetti(120); hearts(40); }, 9000));
};
$('#finale').onclick = () => { if (!fwDone) return; fwRun = false; fwTimers.forEach(clearTimeout); fwTimers = []; $('#finale').classList.add('hidden'); };

// compat default names once couple loads
let initGames = function () {
  $('#cpN1').value = S.me.display_name; $('#cpN2').value = partnerName(); $('#calcTxt').textContent = '';
  renderPokes(); renderBQ(); renderQuiz();
}

// ================= US / CONNECTION (v8) =================
const pad2 = (n) => String(n).padStart(2, '0');
const dayStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDay = (s) => new Date(s + 'T12:00:00');
const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dayStr(d); };
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn);
  const y = t.getUTCFullYear(); const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7); return `${y}-W${pad2(w)}`;
}
const hashS = (s) => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const dqIndex = (day) => hashS(S.couple.id + '|' + day) % D.dailyQs.length;
const chIndex = (wk) => hashS(S.couple.id + '#' + wk) % D.challenges.length;
const fmtDay = (s) => parseDay(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
S.prog = { daily: false, weekly: false, q36: [], daily_days: [] }; S.streak = { current: 0, best: 0, today_both: false, days: [] };

async function uploadToBucket(file) {
  const blob = await compress(file);
  const path = `${S.couple.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error; return path;
}
async function signPaths(paths) {
  const need = [...new Set(paths.filter(Boolean))].filter((p) => !S.signedUrls[p] || S.signedUrls[p].exp < Date.now());
  if (!need.length) return;
  const { data } = await sb.storage.from('photos').createSignedUrls(need, 3600 * 6);
  (data || []).forEach((d) => { if (d.signedUrl) S.signedUrls[d.path] = { url: d.signedUrl, exp: Date.now() + 3600 * 5 * 1000 }; });
}
const sUrl = (p) => S.signedUrls[p]?.url || '';

// ---- navigation inside Us ----
let curFeat = null;
async function openFeat(f) {
  if (window.FU_used) window.FU_used(f);
  if (f === 'trivia' && !window.CC_TRIVIA) { await loadScript('trivia.js?v=50'); TQ = window.CC_TRIVIA || []; }
  curFeat = f; $('#usHome').classList.add('hidden'); $('#featPanel').classList.remove('hidden');
  $$('.feat').forEach((p) => p.classList.toggle('on', p.dataset.panel === f)); window.scrollTo(0, 0);
  (FEAT_RENDER[f] || (() => {}))();
}
const TAB_ORDER = ['home', 'notes', 'us', 'memories', 'chat', 'play', 'me'];
const tabScroll = {};
function goTab(tab) {
  const prev = document.body.dataset.tab;
  if (prev === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; } // re-tap the current tab = back to top
  if (prev) tabScroll[prev] = window.scrollY;
  document.body.dataset.tab = tab; window.CC_picNext && window.CC_picNext();
  $$('.nav button').forEach((x) => x.classList.toggle('on', x.dataset.tab === tab));
  $$('.tab').forEach((t) => t.classList.add('hidden'));
  const el = $('#tab-' + tab); el.classList.remove('hidden', 'tabIn', 'fromL');
  if (prev && motionOn()) {
    void el.offsetWidth; el.classList.add('tabIn'); if (TAB_ORDER.indexOf(tab) < TAB_ORDER.indexOf(prev)) el.classList.add('fromL');
    el.addEventListener('animationend', function done(ev) { if (ev.target === el) { el.classList.remove('tabIn', 'fromL'); el.removeEventListener('animationend', done); } });
  }
  window.scrollTo({ top: tabScroll[tab] || 0, behavior: 'instant' });
  document.body.classList.toggle('scrolled', window.scrollY > 12);
}
function motionOn() { return !(matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('cc_reduce_motion') === '1'); }
$$('[data-feat]').forEach((b) => b.onclick = () => openFeat(b.dataset.feat));
$('#featBack').onclick = () => { curFeat = null; $('#featPanel').classList.add('hidden'); $('#usHome').classList.remove('hidden'); };
$('#gearBtn').onclick = () => goTab('me');
const setFB = (id, txt, isNew) => { const el = document.getElementById('fb-' + id); if (el) { el.textContent = txt || ''; el.classList.toggle('new', !!isNew); } };

// ---- server progress + streak ----
async function refreshProgress() {
  if (!S.couple) return;
  const [p, s] = await Promise.all([sb.rpc('partner_progress', { today: dayStr(), wk: isoWeek() }), sb.rpc('couple_streak', { today: dayStr() })]);
  if (p.data) S.prog = p.data; if (s.data) S.streak = s.data;
  renderStreak(); renderDQ(); renderWeekly(); renderQ36();
}
setInterval(() => { if (!document.hidden && S.couple) refreshProgress(); }, 60000);
function renderStreak() {
  const st = S.streak; const myToday = didToday(S.user.id);
  const html = `<div class="streak"><div class="flame">${TP('w', 'streakIcon') || '🔥'} ${st.current}<small>${TP('w', 'streak') || 'day streak'}</small></div><div class="flame">🏆 ${st.best}<small>best</small></div></div>
    <p class="muted">${st.today_both ? 'You both showed up today 💞' : myToday ? `Waiting for ${pn()} to check in today…` : 'Answer, check in or drop a gratitude to keep the flame alive!'}</p>`;
  $('#homeStreak').innerHTML = html; $('#usStreak').innerHTML = html;
}
const didToday = (uid) => { const t = dayStr(); return (S.data.daily_answers || []).some((a) => a.created_by === uid && a.day === t) || (S.data.moods || []).some((m) => m.created_by === uid && m.day === t) || (S.data.gratitude || []).some((g) => g.created_by === uid && g.day === t); };

// ---- 1. daily question ----
function renderDQ() {
  if (!S.couple) return; const t = dayStr(), q = D.dailyQs[dqIndex(t)];
  const l = S.data.daily_answers || [], me = l.find((a) => mine(a) && a.day === t), them = l.find((a) => !mine(a) && a.day === t);
  $('#dqDate').textContent = fmtDay(t); $('#dqText').textContent = q;
  const pDone = S.prog.daily || !!them;
  $('#dqBox').innerHTML = (me ? `<div class="ans"><small>You</small>${esc(me.answer)}</div><button class="soft mini" id="dqEdit">Edit</button>` : `<textarea id="dqAns" maxlength="1000" placeholder="Your answer… (${pn()} sees it after answering too)"></textarea><button id="dqSave">Answer 💬</button>`) +
    (them ? `<div class="ans"><small>${pn()}</small>${esc(them.answer)}</div>` : `<div class="ans locked"><small>${pn()}</small>${pDone ? '🔒 Answered! Answer to unlock' : 'Hasn\'t answered yet…'}</div>`);
  $('#homeDQ').innerHTML = `<small class="muted">❓ Today's question</small><br><b>${esc(q)}</b><br><small class="muted">${me ? '✅ You answered' : '✏️ Tap to answer'} · ${them ? `💬 ${pn()} answered` : pDone ? `🔒 ${pn()} answered` : `⏳ ${pn()}`}</small>`;
  setFB('dq', me ? (them ? 'Both answered 💞' : 'Waiting…') : 'Answer!', !me);
  const days = [...new Set(l.filter((a) => a.day !== t).map((a) => a.day))].sort().reverse();
  $('#dqHist').innerHTML = days.length ? days.map((d) => { const a = l.filter((x) => x.day === d); const q2 = D.dailyQs[a[0].qidx] || D.dailyQs[dqIndex(d)]; return `<div class="ans"><small>${fmtDay(d)}</small><b>${esc(q2)}</b>${a.map((x) => `<div><small>${esc(nameOf(x.created_by))}</small>${esc(x.answer)}</div>`).join('')}${a.length < 2 ? '<small>(only one of you answered)</small>' : ''}</div>`; }).join('') : '<p class="muted">No history yet.</p>';
}
$('#homeDQ').onclick = () => { goTab('us'); openFeat('dq'); };
$('#dqBox').onclick = async (e) => {
  const t = dayStr();
  if (e.target.id === 'dqSave') {
    const answer = $('#dqAns').value.trim(); if (!answer) return;
    const { error } = await sb.from('daily_answers').insert({ day: t, qidx: dqIndex(t), answer });
    if (error) return toast(errMsg(error)); hearts(8); snd('ding'); window.FX && FX.burstAt($('#dqText'), ['💬', '💖', '✨'], 12, 90); notify('daily', 'answered today\'s question 💬');
    await loadTable('daily_answers'); refreshProgress();
  } else if (e.target.id === 'dqEdit') {
    const me = (S.data.daily_answers || []).find((a) => mine(a) && a.day === t);
    const v = await uiPrompt('Edit your answer'); if (v == null || !v.trim()) return;
    const { error } = await sb.from('daily_answers').update({ answer: v.trim().slice(0, 1000) }).eq('id', me.id);
    if (error) toast(errMsg(error)); else loadTable('daily_answers');
  }
};
RENDER.daily_answers = () => { renderDQ(); renderStreak(); };

// ---- 2. mood ----
let moodSel = null, sigSel = null;
const moodPickHtml = () => D.moods.map((m) => `<span data-m="${m}">${m}</span>`).join('');
$('#moodPick').innerHTML = moodPickHtml(); $('#homeMoodPick').innerHTML = moodPickHtml();
$('#sigPick').innerHTML = Object.entries(D.signals).map(([k, v]) => `<span data-s="${k}">${v}</span>`).join('');
$('#moodPick').onclick = (e) => { const m = e.target.dataset.m; if (!m) return; moodSel = m; $$('#moodPick span').forEach((s) => s.classList.toggle('on', s.dataset.m === m)); };
$('#sigPick').onclick = (e) => { const s = e.target.dataset.s; if (!s) return; sigSel = sigSel === s ? null : s; $$('#sigPick span').forEach((x) => x.classList.toggle('on', x.dataset.s === sigSel)); };
async function saveMood(mood, note, signal) {
  const { error } = await sb.from('moods').insert({ mood, note: note || null, signal: signal || null, day: dayStr() });
  if (error) { toast(errMsg(error)); return false; }
  toast('Checked in 💗'); snd('ding'); window.FX && FX.burstAt($('#homeMood') && !$('#tab-home').classList.contains('hidden') ? $('#homeMood') : $('#moodSave'), [mood, '💗', '✨'], 12, 80);
  if (signal) notify('mood', D.signals[signal]); else notify('mood', `is feeling ${mood}`);
  await loadTable('moods'); refreshProgress(); return true;
}
$('#homeMoodPick').onclick = async (e) => { const m = e.target.dataset.m; if (m) await saveMood(m); };
$('#moodSave').onclick = async () => {
  if (!moodSel) return toast('Pick an emoji first');
  if (await saveMood(moodSel, $('#moodNote').value.trim(), sigSel)) { $('#moodNote').value = ''; sigSel = null; $$('#sigPick span').forEach((x) => x.classList.remove('on')); }
};
function latestMood(uid) { return (S.data.moods || []).filter((m) => m.created_by === uid)[0]; }
RENDER.moods = () => {
  if (!S.partner) return;
  const lp = latestMood(S.partner.id), lm = latestMood(S.user.id);
  const card = (m, who) => m ? `<div class="ans"><small>${who} · ${fmtTime(m.created_at)}</small><span style="font-size:28px">${esc(m.mood)}</span> ${m.signal ? `<b>${esc(D.signals[m.signal] || '')}</b>` : ''}${m.note ? `<br>${esc(m.note)}` : ''}</div>` : `<div class="ans locked"><small>${who}</small>No check-in yet</div>`;
  $('#moodPartner').innerHTML = `<div class="side">${card(lm, 'You')}${card(lp, pn())}</div>`;
  $('#homeMood').innerHTML = `<div class="side">${card(lm, 'You')}${card(lp, pn())}</div><p class="muted" style="margin:4px 0 0">Quick mood check-in:</p>`;
  const days = Array.from({ length: 7 }, (_, i) => addDays(dayStr(), i - 6));
  const row = (uid, label) => `<small>${label}</small>` + days.map((d) => { const m = (S.data.moods || []).find((x) => x.created_by === uid && x.day === d); return `<span title="${d}">${m ? esc(m.mood) : '·'}</span>`; }).join('');
  $('#moodWeek').innerHTML = `<div class="mweek"><span></span>${days.map((d) => `<small>${parseDay(d).toLocaleDateString(undefined, { weekday: 'narrow' })}</small>`).join('')}${row(S.user.id, 'You')}${row(S.partner.id, esc(partnerEmoji()))}</div>`;
  setFB('mood', lp ? `${partnerName()}: ${lp.mood}` : '', lp && lp.signal && Date.now() - new Date(lp.created_at) < 86400000);
  renderStreak();
};

// ---- 3. gratitude ----
let gratView = 'week';
$('#gratSeg').onclick = (e) => { const g = e.target.dataset.g; if (!g) return; gratView = g; $$('#gratSeg button').forEach((b) => b.classList.toggle('on', b.dataset.g === g)); RENDER.gratitude(); };
$('#gratAdd').onclick = async () => {
  const body = $('#gratTxt').value.trim(); if (!body) return;
  const { error } = await sb.from('gratitude').insert({ body, day: dayStr() });
  if (error) return toast(errMsg(error)); $('#gratTxt').value = ''; hearts(6); snd('pop'); notify('gratitude', 'dropped an appreciation in the jar 🫙'); await loadTable('gratitude'); refreshProgress();
};
RENDER.gratitude = () => {
  const l = S.data.gratitude || [], wk = isoWeek();
  const sel = gratView === 'week' ? l.filter((g) => isoWeek(new Date(g.created_at)) === wk) : l;
  $('#jar').innerHTML = l.slice(0, 60).reverse().map((g, i) => `<span style="--i:${i}">${mine(g) ? '💗' : '💜'}</span>`).join('');
  $('#gratList').innerHTML = (gratView === 'week' ? `<p class="muted">This week: ${sel.filter(mine).length} from you, ${sel.filter((g) => !mine(g)).length} from ${pn()}</p>` : '') +
    (sel.length ? sel.map((g) => `<div class="row"><span>${mine(g) ? '💗 You → ' + pn() : '💜 ' + pn() + ' → you'}: ${esc(g.body)}</span>${mine(g) ? `<button class="mini soft" data-del="gratitude:${g.id}">✕</button>` : `<small>${fmtDate(g.created_at)}</small>`}</div>`).join('') : '<p class="muted">The jar is waiting for some love 🫙</p>');
  setFB('grat', l.length + ' in jar'); renderStreak();
};

// ---- 10. journal ----
$('#jDate').value = dayStr();
const jText = (j) => (j._pt != null ? j._pt : (window.FU_isEnc && FU_isEnc(j.body) ? '🔒 Locked entry' : j.body));
$('#jDate').onchange = () => { const e = (S.data.journal || []).find((j) => mine(j) && j.day === $('#jDate').value); $('#jBody').value = e ? jText(e) : ''; };
$('#jSave').onclick = async () => {
  const day = $('#jDate').value || dayStr(); let body = $('#jBody').value.trim(); if (!body) return;
  if (window.FU_lockOn && FU_lockOn()) { if (!FU_hasKey()) return FU_unlock(); body = await FU_enc(body); }
  const ex = (S.data.journal || []).find((j) => mine(j) && j.day === day);
  const { error } = ex ? await sb.from('journal').update({ body, updated_at: new Date().toISOString() }).eq('id', ex.id) : await sb.from('journal').insert({ day, body });
  if (error) return toast(errMsg(error)); toast('Saved 📔'); loadTable('journal');
};
RENDER.journal = () => {
  const l = S.data.journal || []; if (window.FU_decList) FU_decList(l, () => RENDER.journal()); const days = [...new Set(l.map((j) => j.day))].sort().reverse();
  if (!$('#jBody').value) $('#jDate').onchange();
  $('#jList').innerHTML = days.length ? days.map((d) => { const m = l.find((j) => mine(j) && j.day === d), p = l.find((j) => !mine(j) && j.day === d);
    return `<h3 class="gsec">${fmtDay(d)}</h3><div class="side"><div class="ans"><small>You ${m ? `<a href="#" data-jedit="${d}">✏️</a>` : ''}</small>${m ? esc(jText(m)) : '<i>—</i>'}</div><div class="ans"><small>${pn()}</small>${p ? esc(jText(p)) : '<i>—</i>'}</div></div>`; }).join('') : '<p class="muted">Start your shared diary ✨</p>';
  const t = l.find((j) => !mine(j) && j.day === dayStr()); setFB('journal', t ? `${partnerName()} wrote today` : '', !!t);
};
$('#jList').onclick = (e) => { const d = e.target.dataset.jedit; if (!d) return; e.preventDefault(); $('#jDate').value = d; $('#jDate').onchange(); $('#jBody').focus(); window.scrollTo(0, 0); };

// ---- 6. weekly check-in ----
function renderWeekly() {
  if (!S.couple) return; const wk = isoWeek(); const l = S.data.weekly_checkins || [];
  const me = l.find((w) => mine(w) && w.week === wk), them = l.find((w) => !mine(w) && w.week === wk);
  $('#wkLabel').textContent = `Week ${wk.split('-W')[1]} of ${wk.split('-')[0]}`;
  if (!$('#wkForm').dataset.wk || $('#wkForm').dataset.wk !== wk + (me ? me.updated_at : '')) {
    $('#wkForm').dataset.wk = wk + (me ? me.updated_at : '');
    $('#wkForm').innerHTML = D.weeklyPrompts.map(([k, lab]) => `<p class="muted" style="text-align:left;margin:8px 0 0">${lab}</p><textarea data-wk="${k}" maxlength="1000" style="min-height:60px">${esc(me?.[k] || '')}</textarea>`).join('');
  }
  const pDone = S.prog.weekly || !!them;
  const reveal = (w) => D.weeklyPrompts.map(([k, lab]) => w[k] ? `<div class="ans"><small>${lab}</small>${esc(w[k])}</div>` : '').join('');
  $('#wkReveal').innerHTML = them ? `<h3 class="gsec">💌 ${pn()}'s check-in</h3>${reveal(them)}` : `<p class="muted">${pDone ? `🔒 ${pn()} is done — save yours to reveal!` : `⏳ ${pn()} hasn't checked in yet`}</p>`;
  const past = [...new Set(l.filter((w) => w.week !== wk).map((w) => w.week))].sort().reverse();
  $('#wkPast').innerHTML = past.length ? past.map((w) => { const a = l.filter((x) => x.week === w); return `<details><summary>${w}</summary>${a.map((x) => `<h3 class="gsec">${esc(nameOf(x.created_by))}</h3>${reveal(x)}`).join('')}</details>`; }).join('') : '<p class="muted">No past weeks yet.</p>';
  setFB('weekly', me ? (them ? 'Revealed 💞' : 'Waiting…') : 'This week', !me);
}
RENDER.weekly_checkins = renderWeekly;
$('#wkSave').onclick = async () => {
  const row = { week: isoWeek(), updated_at: new Date().toISOString() }; let any = false;
  $$('#wkForm [data-wk]').forEach((t) => { row[t.dataset.wk] = t.value.trim() || null; if (row[t.dataset.wk]) any = true; });
  if (!any) return toast('Fill at least one prompt');
  const me = (S.data.weekly_checkins || []).find((w) => mine(w) && w.week === row.week);
  const { error } = me ? await sb.from('weekly_checkins').update(row).eq('id', me.id) : await sb.from('weekly_checkins').insert(row);
  if (error) return toast(errMsg(error)); toast('Check-in saved 🤝'); if (!me) notify('weekly', 'finished this week\'s check-in 🤝'); await loadTable('weekly_checkins'); refreshProgress();
};

// ---- 9. date challenge ----
let chFile = null;
$('#chPhoto').onchange = (e) => { chFile = e.target.files[0] || null; $('#chPhotoName').textContent = chFile ? ' ' + chFile.name : ''; };
RENDER.challenge_done = async () => {
  if (!S.couple) return; const wk = isoWeek(), idx = chIndex(wk); const l = S.data.challenge_done || [];
  $('#chWeek').textContent = `Week ${wk.split('-W')[1]}`; $('#chText').textContent = D.challenges[idx];
  const me = l.find((c) => mine(c) && c.week === wk), them = l.find((c) => !mine(c) && c.week === wk);
  $('#chStatus').innerHTML = `<div class="side"><div class="ans"><small>You</small>${me ? '✅ Done' : '⏳ Not yet'}</div><div class="ans"><small>${pn()}</small>${them ? '✅ Done' : '⏳ Not yet'}</div></div>${me && them ? '<p class="bq">🎉 Challenge complete together!</p>' : ''}`;
  $('#chDone').textContent = me ? 'Update note/photo' : 'We did it! ✅';
  await signPaths(l.map((c) => c.photo_path));
  const weeks = [...new Set(l.map((c) => c.week))].sort().reverse();
  $('#chHist').innerHTML = weeks.length ? weeks.map((w) => { const a = l.filter((c) => c.week === w); return `<div class="ans"><small>${w} · ${a.length === 2 ? '💞 both' : 'one of you'}</small><b>${esc(D.challenges[a[0].cidx] || '')}</b>${a.map((c) => `${c.note ? `<div><small>${esc(nameOf(c.created_by))}</small>${esc(c.note)}</div>` : ''}${c.photo_path ? `<img src="${esc(sUrl(c.photo_path))}" style="width:100%;border-radius:10px;margin-top:6px">` : ''}`).join('')}</div>`; }).join('') : '<p class="muted">No challenges done yet.</p>';
  setFB('chal', me && them ? 'Done 💞' : me || them ? '1/2 done' : 'New!', !me);
};
$('#chDone').onclick = async () => {
  const wk = isoWeek(); const me = (S.data.challenge_done || []).find((c) => mine(c) && c.week === wk);
  $('#chDone').disabled = true;
  try {
    const row = { note: $('#chNote').value.trim() || me?.note || null };
    if (chFile) row.photo_path = await uploadToBucket(chFile);
    const { error } = me ? await sb.from('challenge_done').update(row).eq('id', me.id) : await sb.from('challenge_done').insert({ ...row, week: wk, cidx: chIndex(wk) });
    if (error) throw error;
    chFile = null; $('#chPhoto').value = ''; $('#chPhotoName').textContent = ''; $('#chNote').value = '';
    confetti(50); snd('win'); if (!me) notify('challenge', 'marked this week\'s date challenge done 🌹');
    loadTable('challenge_done');
  } catch (err) { toast(errMsg(err)); } finally { $('#chDone').disabled = false; }
};

// ---- 7. 36 questions ----
let q36i = 1;
function renderQ36() {
  if (!S.couple) return; const l = S.data.q36_answers || [];
  const mineSet = new Set(l.filter(mine).map((a) => a.qnum)), pSet = new Set([...(S.prog.q36 || []), ...l.filter((a) => !mine(a)).map((a) => a.qnum)]);
  const both = [...mineSet].filter((n) => pSet.has(n)).length;
  $('#q36Bar').style.width = (both / 36 * 100) + '%'; $('#q36Prog').textContent = `Together: ${both}/36 · You ${mineSet.size} · ${partnerName()} ${pSet.size}`;
  const set = q36i <= 12 ? 'Set I' : q36i <= 24 ? 'Set II' : 'Set III';
  $('#q36Num').textContent = `${set} · #${q36i}`; $('#q36Text').textContent = D.q36[q36i - 1];
  const me = l.find((a) => mine(a) && a.qnum === q36i), them = l.find((a) => !mine(a) && a.qnum === q36i);
  $('#q36Box').innerHTML = (me ? `<div class="ans"><small>You</small>${esc(me.answer)}</div>` : `<textarea id="q36Ans" maxlength="2000" placeholder="Your answer…"></textarea><button id="q36Save">Answer</button>`) +
    (them ? `<div class="ans"><small>${pn()}</small>${esc(them.answer)}</div>` : `<div class="ans locked"><small>${pn()}</small>${pSet.has(q36i) ? '🔒 Answered — answer to unlock' : '⏳ Not yet'}</div>`);
  $('#q36Grid').innerHTML = D.q36.map((_, i) => { const n = i + 1; return `<button data-qn="${n}" class="${mineSet.has(n) && pSet.has(n) ? 'both' : mineSet.has(n) ? 'me' : ''}">${n}</button>`; }).join('');
  const next = D.q36.findIndex((_, i) => !mineSet.has(i + 1));
  setFB('q36', `${both}/36`, pSet.size > mineSet.size);
  if (!renderQ36.init && next >= 0) { renderQ36.init = true; q36i = next + 1; renderQ36(); }
}
RENDER.q36_answers = renderQ36;
$('#q36Prev').onclick = () => { q36i = Math.max(1, q36i - 1); renderQ36(); };
$('#q36Next').onclick = () => { q36i = Math.min(36, q36i + 1); renderQ36(); };
$('#q36Grid').onclick = (e) => { const n = e.target.dataset.qn; if (!n) return; q36i = +n; renderQ36(); window.scrollTo(0, 0); };
$('#q36Box').onclick = async (e) => {
  if (e.target.id !== 'q36Save') return; const answer = $('#q36Ans').value.trim(); if (!answer) return;
  const { error } = await sb.from('q36_answers').insert({ qnum: q36i, answer });
  if (error) return toast(errMsg(error)); hearts(6); snd('ding'); await loadTable('q36_answers'); refreshProgress();
};

// ---- 4. love languages ----
const LL = ['words', 'time', 'gifts', 'acts', 'touch'];
const LL_PAIRS = (() => { const p = []; let k = 0; for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { p.push([[LL[i], (r * 2 + j) % 6], [LL[j], (r * 2 + i + 1) % 6]]); k++; } return p.map((x, i) => i % 2 ? [x[1], x[0]] : x); })();
let llStep = -1, llScores = null;
function llResultHtml(r, who) {
  if (!r) return `<div class="ans locked"><small>${who}</small>Not taken yet</div>`;
  const tot = LL.reduce((s, k) => s + (r.scores[k] || 0), 0) || 1;
  return `<div class="ans"><small>${who}</small><b>${D.loveLangs[r.top].emoji} ${D.loveLangs[r.top].name}</b>${LL.slice().sort((a, b) => (r.scores[b] || 0) - (r.scores[a] || 0)).map((k) => `<div class="llbar"><span style="width:22px">${D.loveLangs[k].emoji}</span><i style="width:${Math.round((r.scores[k] || 0) / tot * 100)}%"></i><small>${r.scores[k] || 0}</small></div>`).join('')}</div>`;
}
function renderLL() {
  const box = $('#llBox'); if (!S.partner) return;
  if (llStep >= 0) {
    const [[la, ia], [lb, ib]] = LL_PAIRS[llStep];
    box.innerHTML = `<p class="muted">${llStep + 1} / ${LL_PAIRS.length} — which means more to you?</p><div class="meter"><div class="barfill" style="width:${llStep / LL_PAIRS.length * 100}%"></div></div><div class="llq"><button data-ll="${la}">${esc(D.llStatements[la][ia])}</button><button data-ll="${lb}">${esc(D.llStatements[lb][ib])}</button></div><button class="soft mini" id="llCancel">Cancel</button>`;
    return;
  }
  const l = S.data.love_languages || [], me = l.find(mine), them = l.find((r) => !mine(r));
  box.innerHTML = `<div class="side">${llResultHtml(me, 'You')}${llResultHtml(them, pn())}</div>` +
    (them ? `<h3 class="gsec">💡 How to love ${pn()} in ${D.loveLangs[them.top].name}</h3>${D.loveLangs[them.top].tips.map((t) => `<div class="row"><span>${esc(t)}</span></div>`).join('')}` : '') +
    `<button id="llStart">${me ? 'Retake quiz' : 'Take the quiz (30 quick choices)'}</button>`;
  setFB('ll', me && them ? `${D.loveLangs[me.top].emoji} + ${D.loveLangs[them.top].emoji}` : me ? 'Waiting…' : 'Take quiz');
}
RENDER.love_languages = renderLL;
$('#llBox').onclick = async (e) => {
  if (e.target.id === 'llStart') { llStep = 0; llScores = Object.fromEntries(LL.map((k) => [k, 0])); return renderLL(); }
  if (e.target.id === 'llCancel') { llStep = -1; return renderLL(); }
  const k = e.target.dataset.ll; if (!k || llStep < 0) return;
  llScores[k]++; snd('tick'); llStep++;
  if (llStep < LL_PAIRS.length) return renderLL();
  llStep = -1; const top = LL.slice().sort((a, b) => llScores[b] - llScores[a])[0];
  const me = (S.data.love_languages || []).find(mine);
  const row = { scores: llScores, top, updated_at: new Date().toISOString() };
  const { error } = me ? await sb.from('love_languages').update(row).eq('id', me.id) : await sb.from('love_languages').insert(row);
  if (error) toast(errMsg(error)); else { confetti(40); snd('win'); }
  loadTable('love_languages');
};

// ---- 5. bucket list ----
$('#bkAdd').onclick = async () => {
  const title = $('#bkTitle').value.trim(); if (!title) return;
  const { error } = await sb.from('bucket_items').insert({ title, emoji: $('#bkEmoji').value.trim() || '✨' });
  if (error) return toast(errMsg(error)); $('#bkTitle').value = ''; loadTable('bucket_items');
};
RENDER.bucket_items = async () => {
  const l = S.data.bucket_items || [], todo = l.filter((b) => !b.done_at), done = l.filter((b) => b.done_at);
  $('#bkTodo').innerHTML = todo.length ? todo.map((b) => `<div class="bk" data-oid="${b.id}"><span class="em">${esc(b.emoji || '✨')}</span><span>${esc(b.title)}<br><small class="muted">added by ${esc(nameOf(b.created_by))}</small></span><button class="mini" data-bk="done:${b.id}">✓</button><button class="mini soft" data-bk="edit:${b.id}">✏️</button><button class="mini soft" data-del="bucket_items:${b.id}">✕</button></div>`).join('') : '<p class="muted">Dream big together ✨</p>';
  await signPaths(done.map((b) => b.photo_path));
  $('#bkDone').innerHTML = done.length ? done.map((b) => `<div class="polaroid">${b.photo_path ? `<img src="${esc(sUrl(b.photo_path))}" alt="">` : `<div style="font-size:48px;padding:20px 0">${esc(b.emoji || '✨')}</div>`}<p>${esc(b.title)}<br><small class="muted">${fmtDate(b.done_at)}${b.note ? ' · ' + esc(b.note) : ''}</small><br><button class="mini soft" data-bk="undo:${b.id}">↩︎ undo</button></p></div>`).join('') : '<p class="muted" style="grid-column:1/-1">Nothing ticked off yet.</p>';
  setFB('bucket', `${done.length}/${l.length} done`);
};
document.addEventListener('click', async (e) => {
  const v = e.target.dataset?.bk; if (!v) return; const [act, id] = v.split(':');
  const b = (S.data.bucket_items || []).find((x) => x.id === id); if (!b) return;
  let upd = null;
  if (act === 'edit') { const t = await uiPrompt('Edit: ' + b.title); if (t == null || !t.trim()) return; upd = { title: t.trim().slice(0, 150) }; }
  if (act === 'undo') { if (!await uiConfirm('Move back to to-do?')) return; upd = { done_at: null, done_by: null }; }
  if (act === 'done') {
    const note = await uiPrompt('🎉 Done! Add a little note? (optional)'); if (note === null) return;
    upd = { done_at: new Date().toISOString(), done_by: S.user.id, note: note.trim().slice(0, 500) || null };
    if (await uiConfirm('Add a photo of this moment? 📷')) {
      const f = await pickFile(); if (f) { try { upd.photo_path = await uploadToBucket(f); } catch (err) { toast(errMsg(err)); } }
    }
  }
  const { error } = await sb.from('bucket_items').update(upd).eq('id', id);
  if (error) toast(errMsg(error)); else { if (act === 'done') { confetti(60); snd('win'); window.FU_celebrate && window.FU_celebrate('🪣', 'Dream come true', b.title); } loadTable('bucket_items'); }
});
function pickFile(accept = 'image/*') {
  return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); window.addEventListener('focus', () => setTimeout(() => res(i.files[0] || null), 800), { once: true }); i.click(); });
}

const FEAT_RENDER = { dq: renderDQ, mood: () => RENDER.moods(), grat: () => RENDER.gratitude(), journal: () => RENDER.journal(), weekly: renderWeekly, chal: () => RENDER.challenge_done(), q36: renderQ36, ll: renderLL, bucket: () => RENDER.bucket_items() };

// ================= BATCH 2–4 =================
const linkHtml = (u) => u && /^https:\/\//.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${/spotify/.test(u) ? '🟢 Spotify' : /youtu/.test(u) ? '▶️ YouTube' : /apple/.test(u) ? '🍎 Apple' : '🔗 Link'}</a>` : '';
const cleanUrl = (u) => { u = (u || '').trim(); if (!u) return null; if (!/^https:\/\//i.test(u)) u = 'https://' + u.replace(/^http:\/\//i, ''); return u.slice(0, 500); };

// ---- push notifications ----
const IMPORTANT_KINDS = ['chat', 'ping', 'hug', 'poke'];
const notifyLevel = () => (S.data.couple_settings?.[0]?.notify_level === 'everything' ? 'everything' : 'important');
// tables with no hand-written notify(): push on insert (server drops these unless the couple chose "Everything 🔔")
const nq = (v, n = 50) => { v = String(v || '').trim(); return v ? ': ' + (v.length > n ? v.slice(0, n) + '…' : v) : ''; };
const AUTO_N = {
  notes: ['note', () => 'left you a love note 💌'],
  bucket_items: ['bucket', (r) => 'added to our bucket list 🪣' + nq(r.title || r.item)],
  photos: ['photo', () => 'added a new memory to Photos 📸'],
  coupons: ['coupon', (r) => 'gave you a love coupon 🎟️' + nq(r.title)],
  game_scores: ['game', (r) => `just played ${r.game || 'a game'} 🎮${r.score != null ? ' — score ' + r.score : ''} · your turn!`],
  milestones: ['milestone', (r) => 'added a milestone 🏆' + nq(r.title)],
  journal: ['journal', () => 'wrote in our journal 📔'],
  wishlist: ['wishlist', (r) => 'added to their wishlist 🎁' + nq(r.title || r.item)],
  goals: ['goal', (r) => 'started a couple goal 🎯' + nq(r.title)],
  goal_contribs: ['goal', () => 'added progress to our goal 🎯'],
  jokes: ['joke', (r) => 'saved an inside joke 😂' + nq(r.term)],
  playlist: ['playlist', (r) => 'added a song to our playlist 🎵' + nq(r.title)],
  date_ideas: ['date', (r) => 'added a date idea 💡' + nq(r.idea)],
  date_spins: ['date', (r) => 'spun the date wheel 🎡' + nq(r.idea)],
  timeline: ['milestone', (r) => 'added a moment to our story 📖' + nq(r.title)],
  countdowns: ['countdown', (r) => 'started a countdown ⏳' + nq(r.title)],
  surprises: ['surprise', () => 'hid a new surprise for you 🎁'],
  fortunes: ['fortune', () => 'wrote you a fortune cookie 🥠'],
  q36_answers: ['q36', () => 'answered one of the 36 questions 💞'],
  lovemap_answers: ['lovemap', () => 'answered a Love Map question 🗺️'],
  love_languages: ['lovelang', () => 'took the love-language quiz 💗'],
  quiz_answers: ['quiz', () => 'answered your love-quiz 📝'],
};
const autoLast = {};
function autoNotify(t, rows) {
  const a = AUTO_N[t]; if (!a || !S.couple || notifyLevel() !== 'everything') return;
  if (Date.now() - (autoLast[t] || 0) < 90000) return; autoLast[t] = Date.now(); // no push storms (games, quick multi-adds)
  const r = (Array.isArray(rows) ? rows[0] : rows) || {};
  try { const txt = a[1](r); if (txt) notify(a[0], txt.slice(0, 140)); } catch { /* */ }
}
async function notify(kind, text) {
  if (!S.couple) return;
  if (notifyLevel() === 'important' && !IMPORTANT_KINDS.includes(kind)) return; // saves a call; the function enforces this too
  if (!navigator.onLine) return enqueue({ kind: 'fn', name: 'notify', body: { kind, text } });
  try { const r = await sb.functions.invoke('notify', { body: { kind, text } }); if (r && r.error && isNetErr(r.error)) enqueue({ kind: 'fn', name: 'notify', body: { kind, text } }); } catch (e) { if (isNetErr(e)) enqueue({ kind: 'fn', name: 'notify', body: { kind, text } }); }
}
const urlB64 = (s) => { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
async function swReg() { if (!('serviceWorker' in navigator)) return null; return navigator.serviceWorker.register('sw.js', { scope: './' }); }
async function pushState() {
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (!ok) { $('#pushInfo').textContent = /iP(hone|ad)/.test(navigator.userAgent) && !standalone ? '📱 Add this app to your Home Screen first, then open it from the icon to enable notifications.' : 'This browser does not support push notifications 😿'; $('#pushBtn').disabled = true; return; }
  const reg = await navigator.serviceWorker.getRegistration('./'); const sub = reg && await reg.pushManager.getSubscription();
  $('#pushBtn').classList.toggle('hidden', !!sub && Notification.permission === 'granted'); $('#pushOff').classList.toggle('hidden', !sub);
  $('#pushInfo').textContent = sub ? '🔔 Notifications are on for this device.' : Notification.permission === 'denied' ? 'Notifications are blocked — enable them in your browser/phone settings.' : 'Get notified when your partner pings, writes, answers or sends something.';
}
$('#pushBtn').onclick = async () => {
  try {
    const perm = await Notification.requestPermission(); if (perm !== 'granted') return toast('Permission not granted 😿');
    const reg = await swReg(); await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(window.CC_CONFIG.vapidPublicKey) });
    const j = sub.toJSON();
    await sb.from('push_subscriptions').delete().eq('endpoint', j.endpoint);
    const { error } = await sb.from('push_subscriptions').insert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 300) });
    if (error) throw error; toast('Notifications on 🔔'); pushState();
  } catch (e) { toast('Could not enable: ' + errMsg(e)); }
};
$('#pushOff').onclick = async () => {
  const reg = await navigator.serviceWorker.getRegistration('./'); const sub = reg && await reg.pushManager.getSubscription();
  if (sub) { await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  toast('Notifications off on this device'); pushState();
};
if ('serviceWorker' in navigator) swReg().catch(() => {});
// v34: when a new version lands, switch to it right away instead of on the next open (unless you're mid-typing)
if ('serviceWorker' in navigator) {
  const hadCtrl = !!navigator.serviceWorker.controller; let reloading = false, pending = false;
  const busy = () => { const t = document.getElementById('chTxt'); const a = document.activeElement; return (t && t.value.trim()) || document.querySelector('.modal:not(.hidden),.uiDlg') || (a && /INPUT|TEXTAREA/.test(a.tagName)); };
  const swap = () => { if (reloading) return; if (busy()) { pending = true; return; } reloading = true; location.reload(); };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadCtrl) swap(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (pending) { swap(); return; }
    navigator.serviceWorker.getRegistration('./').then((r) => r && r.update()).catch(() => {});
  });
}

// ---- distance & time ----
const myTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
function kmBetween(a, b) { const R = 6371, r = (x) => x * Math.PI / 180; const dLa = r(b.lat - a.lat), dLo = r(b.lon - a.lon); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
const timeIn = (tz) => { try { return new Date().toLocaleTimeString(undefined, { timeZone: tz, hour: 'numeric', minute: '2-digit' }); } catch { return '?'; } };
RENDER.locations = () => {
  if (!S.partner) return; const l = S.data.locations || [], me = l.find(mine), p = l.find((x) => !mine(x));
  $('#locStop').classList.toggle('hidden', !me); $('#locShare').textContent = me ? 'Update my location' : 'Share my location';
  $('#locInfo').textContent = me ? `Sharing ~${me.lat}, ${me.lon} · ${me.tz} · updated ${fmtTime(me.updated_at)}` : 'Not sharing.';
  let h = `<div class="side"><div class="ans"><small>You</small><b>${timeIn(myTz())}</b><br><small>${esc(myTz())}</small></div><div class="ans"><small>${pn()}</small>${p ? `<b>${timeIn(p.tz)}</b><br><small>${esc(p.tz)}</small>` : '<i>not shared yet</i>'}</div></div>`;
  if (me && p && me.lat != null && p.lat != null) { const km = Math.round(kmBetween({ lat: +me.lat, lon: +me.lon }, { lat: +p.lat, lon: +p.lon })); h += `<p class="bq">${km < 15 ? '🏡 Together (or very close)!' : `💞 ~${km.toLocaleString()} km apart`}</p>`; }
  else h += `<p class="muted">Share your location in ⚙️ to see the distance.</p>`;
  $('#homeDist').innerHTML = h;
};
setInterval(() => { if (S.couple && !document.hidden) RENDER.locations(); }, 60000);
$('#locShare').onclick = () => {
  if (!navigator.geolocation) return toast('Geolocation not available');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const row = { lat: Math.round(pos.coords.latitude * 10) / 10, lon: Math.round(pos.coords.longitude * 10) / 10, tz: myTz(), updated_at: new Date().toISOString() };
    const me = (S.data.locations || []).find(mine);
    const { error } = me ? await sb.from('locations').update(row).eq('id', me.id) : await sb.from('locations').insert(row);
    if (error) toast(errMsg(error)); else { toast('Location shared 📍'); loadTable('locations'); }
  }, (e) => toast('Location error: ' + e.message), { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
};
$('#locStop').onclick = async () => { const me = (S.data.locations || []).find(mine); if (!me || !await uiConfirm('Stop sharing your location?')) return; await sb.from('locations').delete().eq('id', me.id); loadTable('locations'); };

// ---- voice notes ----
let vnTag = 'any', rec = null, recChunks = [], recStart = 0, recTimer = null;
$('#vnTags').onclick = (e) => { const t = e.target.dataset.t; if (!t) return; vnTag = t; $$('#vnTags span').forEach((s) => s.classList.toggle('on', s.dataset.t === t)); };
function pickMime() { const c = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']; return window.MediaRecorder ? c.find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '' : ''; }
$('#vnRec').onclick = async () => {
  if (rec && rec.state === 'recording') { rec.stop(); return; }
  if (!window.MediaRecorder || !navigator.mediaDevices) return toast('Recording not supported on this browser 😿');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mime = pickMime();
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); recChunks = []; recStart = Date.now();
    rec.ondataavailable = (e) => e.data.size && recChunks.push(e.data);
    rec.onstop = async () => {
      clearInterval(recTimer); stream.getTracks().forEach((t) => t.stop()); $('#vnRec').textContent = '🎙️';
      const type = (rec.mimeType || mime || 'audio/webm').split(';')[0]; const blob = new Blob(recChunks, { type }); const secs = Math.round((Date.now() - recStart) / 1000);
      if (secs < 1) { $('#vnStatus').textContent = 'Too short!'; return; }
      $('#vnStatus').textContent = 'Uploading… 📤';
      const ext = type.includes('mp4') || type.includes('aac') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      const path = `${S.couple.id}/voice/${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from('photos').upload(path, blob, { contentType: type === 'audio/aac' ? 'audio/aac' : type });
      if (up.error) { $('#vnStatus').textContent = 'Upload failed: ' + errMsg(up.error); return; }
      const caption = ((await uiPrompt('Add a caption? (optional)')) || '').slice(0, 200) || null;
      const { error } = await sb.from('voice_notes').insert({ path, mime: type, seconds: Math.min(secs, 600), tag: vnTag, caption });
      $('#vnStatus').textContent = error ? errMsg(error) : 'Sent 💌'; if (!error) { notify('voice', vnTag === 'morning' ? 'sent you a good-morning voice note ☀️' : vnTag === 'night' ? 'sent you a goodnight voice note 🌙' : 'sent you a voice note 🎙️'); loadTable('voice_notes'); }
    };
    rec.start(); $('#vnRec').textContent = '⏹️';
    recTimer = setInterval(() => { const s = Math.round((Date.now() - recStart) / 1000); $('#vnStatus').textContent = `Recording… ${s}s (tap to stop)`; if (s >= 120) rec.stop(); }, 500);
  } catch (e) { toast('Mic error: ' + errMsg(e)); }
};
RENDER.voice_notes = async () => {
  const l = S.data.voice_notes || []; await signPaths(l.map((v) => v.path));
  const tagE = { morning: '☀️', night: '🌙', any: '💗' };
  $('#vnList').innerHTML = l.length ? l.map((v) => `<div class="vn"><span style="font-size:24px">${tagE[v.tag]}</span><div style="flex:1"><small class="muted">${esc(nameOf(v.created_by))} · ${fmtTime(v.created_at)} · ${v.seconds || 0}s</small>${v.caption ? `<br>${esc(v.caption)}` : ''}<audio controls preload="none" src="${esc(sUrl(v.path))}"></audio></div>${mine(v) ? `<button class="mini soft" data-del="voice_notes:${v.id}">✕</button>` : ''}</div>`).join('') : '<p class="muted">No voice notes yet. Say good morning! ☀️</p>';
  const n = l.filter((v) => !mine(v) && Date.now() - new Date(v.created_at) < 86400000).length; setFB('voice', n ? n + ' new' : '', !!n);
};

// ---- wishlist ----
$('#wishSeg').onclick = (e) => { const w = e.target.closest('[data-w]')?.dataset.w; if (!w) return; $$('#wishSeg button').forEach((b) => b.classList.toggle('on', b.dataset.w === w)); $('#wishTheirs').classList.toggle('hidden', w !== 'theirs'); $('#wishMine').classList.toggle('hidden', w !== 'mine'); };
$('#wAdd').onclick = async () => {
  const title = $('#wTitle').value.trim(); if (!title) return;
  const { error } = await sb.from('wishlist').insert({ title, url: cleanUrl($('#wUrl').value), price: $('#wPrice').value.trim() || null, note: $('#wNote').value.trim() || null });
  if (error) return toast(errMsg(error)); ['#wTitle', '#wUrl', '#wPrice', '#wNote'].forEach((s) => $(s).value = ''); loadTable('wishlist');
};
function renderWish() {
  const l = S.data.wishlist || [], claims = S.data.wish_claims || [];
  const item = (w, own) => { const c = claims.find((x) => x.item_id === w.id);
    return `<div class="bk" data-oid="${w.id}"><span class="em">🎁</span><span><b>${esc(w.title)}</b>${w.price ? ` · ${esc(w.price)}` : ''} ${linkHtml(w.url)}${w.note ? `<br><small class="muted">${esc(w.note)}</small>` : ''}${!own && c ? `<br><small>🤫 ${c.created_by === S.user.id ? 'You got this' : 'claimed'}</small>` : ''}</span>${own ? `<button class="mini soft" data-del="wishlist:${w.id}">✕</button>` : c ? (mine(c) ? `<button class="mini soft" data-unclaim="${c.id}">Undo</button>` : '') : `<button class="mini" data-claim="${w.id}">I got this 🤫</button>`}</div>`; };
  $('#wishTheirs').innerHTML = l.filter((w) => !mine(w)).map((w) => item(w, false)).join('') || `<p class="muted">${pn()} hasn't added wishes yet.</p>`;
  $('#wishMineList').innerHTML = l.filter(mine).map((w) => item(w, true)).join('');
  const open = l.filter((w) => !mine(w) && !claims.some((c) => c.item_id === w.id)).length; setFB('wish', open ? open + ' ideas' : '');
}
RENDER.wishlist = renderWish; RENDER.wish_claims = renderWish;
document.addEventListener('click', async (e) => {
  const c = e.target.dataset?.claim, u = e.target.dataset?.unclaim; if (!c && !u) return;
  const { error } = c ? await sb.from('wish_claims').insert({ item_id: c }) : await sb.from('wish_claims').delete().eq('id', u);
  if (error) toast(errMsg(error)); else { if (c) toast('Secret saved 🤫'); loadTable('wish_claims'); }
});

// ---- time capsule ----
let capFile = null, capLocked = [];
$('#capPhoto').onchange = (e) => { capFile = e.target.files[0] || null; $('#capPhotoName').textContent = capFile ? ' ' + capFile.name : ''; };
function untilTxt(t) { let s = Math.max(0, Math.floor((new Date(t) - Date.now()) / 1000)); const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; return d ? `${d}d ${h}h` : `${h}h ${Math.floor(s / 60)}m ${s % 60}s`; }
async function loadLocked() { const { data } = await sb.rpc('locked_capsules'); capLocked = data || []; RENDER.time_capsules(); }
RENDER.time_capsules = async () => {
  if (!S.partner) return; const l = S.data.time_capsules || [], open = l.filter((c) => c.to_user === S.user.id), sent = l.filter(mine);
  await signPaths(l.map((c) => c.photo_path));
  $('#capIn').innerHTML = (capLocked.length ? capLocked.map((c) => `<div class="cap locked">🔒 <b>A capsule from ${pn()}</b><br><small>Unlocks ${fmtTime(c.unlock_at)} · <span data-until="${esc(c.unlock_at)}">${untilTxt(c.unlock_at)}</span></small></div>`).join('') : '') +
    (open.length ? open.map((c) => `<div class="cap">🔓 <b>${esc(c.title)}</b><br><small class="muted">from ${pn()} · buried ${fmtDate(c.created_at)}</small>${c.body ? `<div class="letter" style="min-height:0">${esc(c.body)}</div>` : ''}${c.photo_path ? `<img src="${esc(sUrl(c.photo_path))}" style="width:100%;border-radius:10px">` : ''}</div>`).join('') : '') ||
    `<p class="muted">No capsules for you yet ⏳</p>`;
  $('#capSent').innerHTML = sent.map((c) => `<div class="row"><span>${esc(c.title)}<br><small class="muted">${new Date(c.unlock_at) > Date.now() ? '🔒 unlocks ' + fmtTime(c.unlock_at) : '🔓 opened to ' + pn()}</small></span><button class="mini soft" data-del="time_capsules:${c.id}">✕</button></div>`).join('');
  setFB('capsule', capLocked.length ? capLocked.length + ' locked' : open.length ? open.length + ' opened' : '');
};
setInterval(() => { $$('[data-until]').forEach((el) => { el.textContent = untilTxt(el.dataset.until); if (new Date(el.dataset.until) <= Date.now() && !el.dataset.done) { el.dataset.done = 1; loadTable('time_capsules'); loadLocked(); } }); }, 1000);
$('#capAdd').onclick = async () => {
  const title = $('#capTitle').value.trim(), when = $('#capDate').value; if (!title || !when) return toast('Add a title and unlock date');
  if (new Date(when) <= Date.now()) return toast('Pick a future date ⏳');
  $('#capAdd').disabled = true;
  try {
    const row = { title, body: $('#capBody').value.trim() || null, unlock_at: new Date(when).toISOString() };
    if (capFile) row.photo_path = await uploadToBucket(capFile);
    const { error } = await sb.from('time_capsules').insert(row); if (error) throw error;
    ['#capTitle', '#capBody', '#capDate'].forEach((s) => $(s).value = ''); capFile = null; $('#capPhotoName').textContent = '';
    toast('Capsule buried 🔒'); notify('capsule', 'buried a time capsule for you ⏳'); loadTable('time_capsules');
  } catch (e) { toast(errMsg(e)); } finally { $('#capAdd').disabled = false; }
};

// ---- song of the week (alternating) ----
let swTurnId = null;
async function renderSongWeek() {
  if (!S.partner) return; const wk = isoWeek();
  if (!swTurnId || renderSongWeek.wk !== wk) { const { data } = await sb.rpc('song_turn', { wk }); swTurnId = data; renderSongWeek.wk = wk; }
  const l = S.data.song_week || [], cur = l.find((s) => s.week === wk), myTurn = swTurnId === S.user.id;
  $('#swTurn').textContent = `Week ${wk.split('-W')[1]} · ${myTurn ? "It's your turn to pick 🎶" : `${partnerName()}'s turn to pick`}`;
  const songHtml = (s) => `<div class="ans"><small>${esc(nameOf(s.created_by))} · ${s.week}</small><b>🎵 ${esc(s.title)}</b>${s.artist ? ' — ' + esc(s.artist) : ''} ${linkHtml(s.url)}${s.note ? `<br><i>${esc(s.note)}</i>` : ''}</div>`;
  $('#swCur').innerHTML = cur ? songHtml(cur) : `<p class="muted">No song yet this week.</p>`;
  $('#swForm').classList.toggle('hidden', !myTurn || (!!cur && !mine(cur)));
  if (cur && mine(cur) && !$('#swTitle').value) { $('#swTitle').value = cur.title; $('#swArtist').value = cur.artist || ''; $('#swUrl').value = cur.url || ''; $('#swNote').value = cur.note || ''; }
  $('#swHist').innerHTML = l.filter((s) => s.week !== wk).map(songHtml).join('') || '<p class="muted">No history yet.</p>';
  setFB('songwk', cur ? '🎵 ' + cur.title.slice(0, 16) : myTurn ? 'Your pick!' : '', !cur && myTurn);
}
RENDER.song_week = renderSongWeek;
$('#swSave').onclick = async () => {
  const title = $('#swTitle').value.trim(); if (!title) return; const wk = isoWeek();
  const row = { title, artist: $('#swArtist').value.trim() || null, url: cleanUrl($('#swUrl').value), note: $('#swNote').value.trim() || null };
  const cur = (S.data.song_week || []).find((s) => s.week === wk && mine(s));
  const { error } = cur ? await sb.from('song_week').update(row).eq('id', cur.id) : await sb.from('song_week').insert({ ...row, week: wk });
  if (error) return toast(errMsg(error)); toast('Song of the week set 🎵'); if (!cur) notify('song', `picked our song of the week: ${title}`); loadTable('song_week');
};

// ---- playlist ----
$('#plAdd').onclick = async () => {
  const title = $('#plTitle').value.trim(); if (!title) return;
  const { error } = await sb.from('playlist').insert({ title, artist: $('#plArtist').value.trim() || null, url: cleanUrl($('#plUrl').value), note: $('#plNote').value.trim() || null });
  if (error) return toast(errMsg(error)); ['#plTitle', '#plArtist', '#plUrl', '#plNote'].forEach((s) => $(s).value = ''); loadTable('playlist');
};
function renderPlaylist() {
  const l = S.data.playlist || [], likes = S.data.playlist_likes || [];
  $('#plList').innerHTML = l.length ? l.map((s) => { const lk = likes.filter((x) => x.song_id === s.id), myLike = lk.find(mine);
    return `<div class="bk" data-oid="${s.id}"><span class="em">🎵</span><span><b>${esc(s.title)}</b>${s.artist ? ' — ' + esc(s.artist) : ''} ${linkHtml(s.url)}${s.note ? `<br><i class="muted">${esc(s.note)}</i>` : ''}<br><small class="muted">added by ${esc(nameOf(s.created_by))}</small></span><button class="mini ${myLike ? '' : 'soft'}" data-like="${s.id}" data-lid="${myLike?.id || ''}">${myLike ? '💖' : '🤍'} ${lk.length}</button>${mine(s) ? `<button class="mini soft" data-del="playlist:${s.id}">✕</button>` : ''}</div>`; }).join('') : '<p class="muted">Add the songs that are “us” 🎧</p>';
  setFB('playlist', l.length + ' songs');
}
RENDER.playlist = renderPlaylist; RENDER.playlist_likes = renderPlaylist;
$('#plList').onclick = async (e) => {
  const b = e.target.closest('[data-like]'); if (!b) return;
  const { error } = b.dataset.lid ? await sb.from('playlist_likes').delete().eq('id', b.dataset.lid) : await sb.from('playlist_likes').insert({ song_id: b.dataset.like });
  if (error) toast(errMsg(error)); else loadTable('playlist_likes');
};

// ---- love map ----
let lmView = 'guess', lmPartner = [];
$('#lmSeg').onclick = (e) => { const v = e.target.dataset.l; if (!v) return; lmView = v; $$('#lmSeg button').forEach((b) => b.classList.toggle('on', b.dataset.l === v)); ['guess', 'me', 'score'].forEach((k) => $('#lm' + k[0].toUpperCase() + k.slice(1)).classList.toggle('hidden', k !== v)); renderLoveMap(); };
async function loadLMProgress() { const { data } = await sb.rpc('lovemap_progress'); lmPartner = data?.partner_answered || []; renderLoveMap(); }
function renderLoveMap() {
  if (!S.partner) return; const A = S.data.lovemap_answers || [], G = S.data.lovemap_guesses || [];
  const myA = A.filter(mine), theirA = A.filter((a) => !mine(a)), myG = G.filter(mine), theirG = G.filter((g) => !mine(g));
  // guess
  const todo = D.loveMap.map((p, i) => i).filter((i) => lmPartner.includes(i) && !myG.some((g) => g.pidx === i));
  const reveal = myG.filter((g) => g.correct == null && theirA.some((a) => a.pidx === g.pidx));
  let h = '';
  reveal.forEach((g) => { const a = theirA.find((x) => x.pidx === g.pidx); h += `<div class="ans"><small>${esc(D.loveMap[g.pidx])}</small>You guessed: <b>${esc(g.guess)}</b><br>${pn()} said: <b>${esc(a.answer)}</b><br><button class="mini" data-lmok="${g.id}:1">Got it ✅</button><button class="mini soft" data-lmok="${g.id}:0">Nope ❌</button></div>`; });
  if (todo.length) { const i = todo[0]; h += `<p class="muted">${todo.length} to guess</p><p class="bq">${pn()}'s ${esc(D.loveMap[i].replace(/^My /, '').replace(/^A /, 'a ').replace(/ I /, ' they '))}</p><p class="muted">“${esc(D.loveMap[i])}”</p><input id="lmGuessIn" maxlength="300" placeholder="Your guess…"><button id="lmGuessBtn" data-p="${i}">Guess</button>`; }
  else if (!reveal.length) h += `<p class="muted">${lmPartner.length ? 'All guessed! 🎉' : `${pn()} hasn't filled in their love map yet.`}</p>`;
  $('#lmGuess').innerHTML = h;
  $('#lmMe').innerHTML = `<p class="muted">Answer about yourself — ${pn()} will guess.</p>` + D.loveMap.map((p, i) => { const a = myA.find((x) => x.pidx === i); return `<div class="ans"><small>${esc(p)}</small>${a ? esc(a.answer) + ` <a href="#" data-lmedit="${i}">✏️</a>` : `<a href="#" data-lmedit="${i}">✏️ answer</a>`}</div>`; }).join('');
  const sc = (gs) => [gs.filter((g) => g.correct).length, gs.filter((g) => g.correct != null).length];
  const [a1, a2] = sc(myG), [b1, b2] = sc(theirG);
  $('#lmScore').innerHTML = vsHtml(a1, b1) + `<p class="muted">You know ${a1}/${a2} of ${pn()}'s world · ${pn()} knows ${b1}/${b2} of yours</p>`;
  setFB('lovemap', todo.length ? todo.length + ' to guess' : `${a1} vs ${b1}`, !!todo.length || !!reveal.length);
}
RENDER.lovemap_answers = renderLoveMap; RENDER.lovemap_guesses = renderLoveMap;
$('#featPanel').addEventListener('click', async (e) => {
  if (e.target.id === 'lmGuessBtn') { const guess = $('#lmGuessIn').value.trim(); if (!guess) return; const { error } = await sb.from('lovemap_guesses').insert({ pidx: +e.target.dataset.p, guess }); if (error) return toast(errMsg(error)); await Promise.all([loadTable('lovemap_guesses'), loadTable('lovemap_answers')]); }
  const ok = e.target.dataset.lmok; if (ok) { const [id, v] = ok.split(':'); await sb.from('lovemap_guesses').update({ correct: v === '1' }).eq('id', id); if (v === '1') hearts(6); loadTable('lovemap_guesses'); }
  const ed = e.target.dataset.lmedit; if (ed != null) { e.preventDefault(); const i = +ed; const a = (S.data.lovemap_answers || []).find((x) => mine(x) && x.pidx === i);
    const v = await uiPrompt(D.loveMap[i]); if (v == null || !v.trim()) return;
    const { error } = a ? await sb.from('lovemap_answers').update({ answer: v.trim().slice(0, 300) }).eq('id', a.id) : await sb.from('lovemap_answers').insert({ pidx: i, answer: v.trim().slice(0, 300) });
    if (error) toast(errMsg(error)); else loadTable('lovemap_answers'); }
});

// ---- calendar ----
let calCursor = new Date(); calCursor.setDate(1); let calSel = dayStr(), evEditing = null;
const evDay = (ev) => dayStr(new Date(ev.starts_at));
function renderCal() {
  const l = S.data.events || []; const y = calCursor.getFullYear(), m = calCursor.getMonth();
  $('#calMonth').textContent = calCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const first = new Date(y, m, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  let g = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<div class="hd">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const ds = dayStr(d); const evs = l.filter((e) => evDay(e) === ds);
    g += `<div data-cd="${ds}" class="${d.getMonth() !== m ? 'out' : ''} ${ds === dayStr() ? 'tdy' : ''} ${ds === calSel ? 'sel' : ''}">${d.getDate()}${evs.slice(0, 2).map((e) => `<i>${esc(e.emoji || '📅')}</i>`).join('')}</div>`; }
  $('#calGrid').innerHTML = g;
  const sel = l.filter((e) => evDay(e) === calSel);
  const evHtml = (e) => `<div class="bk"><span class="em">${esc(e.emoji || '📅')}</span><span><b>${esc(e.title)}</b><br><small class="muted">${fmtTime(e.starts_at)}${e.location ? ' · 📍 ' + esc(e.location) : ''} · by ${esc(nameOf(e.created_by))}</small>${e.note ? `<br><small>${esc(e.note)}</small>` : ''}</span><button class="mini soft" data-evedit="${e.id}">✏️</button><button class="mini soft" data-del="events:${e.id}">✕</button></div>`;
  $('#calDay').innerHTML = `<h3 class="gsec">${fmtDay(calSel)}</h3>` + (sel.map(evHtml).join('') || '<p class="muted">Nothing planned. Tap ➕ to add.</p>');
  const up = l.filter((e) => new Date(e.starts_at) >= new Date(Date.now() - 3600000)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  $('#calUpcoming').innerHTML = up.slice(0, 10).map(evHtml).join('') || '<p class="muted">No upcoming plans.</p>';
  $('#homeUpcoming').innerHTML = up.slice(0, 3).map((e) => `<div class="row"><span>${esc(e.emoji || '📅')} ${esc(e.title)}</span><small>${fmtTime(e.starts_at)}</small></div>`).join('') + upcomingMilestones().slice(0, 2).map((x) => `<div class="row"><span>${esc(x.emoji)} ${esc(x.title)}</span><small>${x.days === 0 ? 'Today!' : 'in ' + x.days + 'd'}</small></div>`).join('') || '<p class="muted">Plan something cute 💕</p>';
  setFB('cal', up.length ? up.length + ' upcoming' : '');
}
RENDER.events = renderCal;
$('#calPrev').onclick = () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCal(); };
$('#calNext').onclick = () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCal(); };
$('#calGrid').onclick = (e) => { const d = e.target.closest('[data-cd]')?.dataset.cd; if (!d) return; calSel = d; if (!evEditing) $('#evWhen').value = d + 'T19:00'; renderCal(); };
$('#calDay').parentElement.addEventListener('click', (e) => {
  const id = e.target.dataset.evedit; if (!id) return; const ev = (S.data.events || []).find((x) => x.id === id); if (!ev) return;
  evEditing = id; const d = new Date(ev.starts_at); $('#evTitle').value = ev.title; $('#evEmoji').value = ev.emoji || '📅'; $('#evLoc').value = ev.location || ''; $('#evNote').value = ev.note || '';
  $('#evWhen').value = `${dayStr(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; $('#calFormBox').open = true; $('#evCancel').classList.remove('hidden'); $('#evSave').textContent = 'Update plan';
});
function evReset() { evEditing = null; ['#evTitle', '#evLoc', '#evNote', '#evWhen'].forEach((s) => $(s).value = ''); $('#evEmoji').value = '📅'; $('#evCancel').classList.add('hidden'); $('#evSave').textContent = 'Save plan'; }
$('#evCancel').onclick = evReset;
$('#evSave').onclick = async () => {
  const title = $('#evTitle').value.trim(), w = $('#evWhen').value; if (!title || !w) return toast('Add a title and date/time');
  const row = { title, starts_at: new Date(w).toISOString(), emoji: $('#evEmoji').value.trim() || '📅', location: $('#evLoc').value.trim() || null, note: $('#evNote').value.trim() || null };
  const { error } = evEditing ? await sb.from('events').update(row).eq('id', evEditing) : await sb.from('events').insert(row);
  if (error) return toast(errMsg(error));
  if (!evEditing) notify('event', `added a plan: ${row.emoji} ${title} (${fmtTime(row.starts_at)})`);
  evReset(); toast('Saved 📅'); loadTable('events');
};

// ---- milestones / anniversaries ----
function upcomingMilestones() {
  const out = []; const today = parseDay(dayStr());
  const since = S.data.couple_settings?.[0]?.together_since;
  const push = (title, emoji, d) => { const days = Math.round((d - today) / 86400000); if (days >= 0) out.push({ title, emoji, day: dayStr(d), days }); };
  if (since) {
    const s = parseDay(since);
    D.autoMilestones.forEach(([n, u]) => { const d = new Date(s); if (u === 'days') d.setDate(d.getDate() + n); else d.setMonth(d.getMonth() + n); push(`${n} ${u} together`, u === 'days' ? '💯' : '🗓️', d); });
    for (let yr = 1; yr <= 60; yr++) { const d = new Date(s); d.setFullYear(s.getFullYear() + yr); if (d >= today) { push(`${yr} year${yr > 1 ? 's' : ''} anniversary`, '💍', d); break; } }
  }
  (S.data.milestones || []).forEach((m) => { const base = parseDay(m.day); let d = new Date(base); if (m.yearly) { d.setFullYear(today.getFullYear()); if (d < today) d.setFullYear(today.getFullYear() + 1); } push(m.title, m.emoji || '🎉', d); });
  return out.sort((a, b) => a.days - b.days);
}
let celebrated = '';
function renderMiles() {
  const since = S.data.couple_settings?.[0]?.together_since; if (since && !$('#msSince').value) $('#msSince').value = since;
  const up = upcomingMilestones(), today = up.filter((x) => x.days === 0);
  const daysTog = since ? Math.round((parseDay(dayStr()) - parseDay(since)) / 86400000) : null;
  $('#msToday').innerHTML = (daysTog != null ? `<p class="bq">💞 ${daysTog.toLocaleString()} days together</p>` : '<p class="muted">Set your together-since date for automatic milestones.</p>') + today.map((x) => `<div class="banner">${esc(x.emoji)} Today: ${esc(x.title)}! 🎉</div>`).join('');
  $('#msUpcoming').innerHTML = up.slice(0, 8).map((x) => `<div class="row"><span>${esc(x.emoji)} ${esc(x.title)}</span><small>${fmtDay(x.day)} · ${x.days ? 'in ' + x.days + 'd' : 'today'}</small></div>`).join('') || '<p class="muted">Nothing upcoming.</p>';
  $('#msList').innerHTML = (S.data.milestones || []).map((m) => `<div class="row"><span>${esc(m.emoji)} ${esc(m.title)} <small class="muted">${fmtDay(m.day)}${m.yearly ? ' · yearly' : ''}</small></span><button class="mini soft" data-del="milestones:${m.id}">✕</button></div>`).join('');
  $('#homeBanner').innerHTML = today.map((x) => `<div class="banner">${esc(x.emoji)} Happy ${esc(x.title)}! 🎉💞</div>`).join('');
  if (today.length && celebrated !== dayStr()) { celebrated = dayStr(); confetti(120); hearts(30); }
  setFB('miles', up[0] ? `${up[0].title.slice(0, 14)} · ${up[0].days}d` : '', !!today.length);
  if (S.data.events) renderCal();
}
RENDER.milestones = () => { renderMiles(); if (window.CC_setSeason) CC_setSeason(shared('seasonal', true), annivDate()); }; RENDER.couple_settings = () => { renderMiles(); applyShared(); };
$('#msSinceSave').onclick = async () => {
  const v = $('#msSince').value; if (!v) return; const ex = S.data.couple_settings?.[0];
  const { error } = ex ? await sb.from('couple_settings').update({ together_since: v, created_by: S.user.id, updated_at: new Date().toISOString() }).eq('couple_id', S.couple.id) : await sb.from('couple_settings').insert({ together_since: v });
  if (error) toast(errMsg(error)); else { toast('Saved 💞'); loadTable('couple_settings'); }
};
$('#msAdd').onclick = async () => {
  const title = $('#msTitle').value.trim(), day = $('#msDate').value; if (!title || !day) return toast('Title and date please');
  const { error } = await sb.from('milestones').insert({ title, day, emoji: $('#msEmoji').value.trim() || '🎉' });
  if (error) return toast(errMsg(error)); $('#msTitle').value = $('#msDate').value = ''; loadTable('milestones');
};

// ---- couple goals ----
let gKind = 'savings';
$('#goalKind').onclick = (e) => { const k = e.target.dataset.k; if (!k) return; gKind = k; $$('#goalKind button').forEach((b) => b.classList.toggle('on', b.dataset.k === k)); $('#gCur').classList.toggle('hidden', k === 'habit'); };
$('#gAdd').onclick = async () => {
  const title = $('#gTitle').value.trim(), target = parseFloat($('#gTarget').value); if (!title || !(target > 0)) return toast('Title and a positive target please');
  const { error } = await sb.from('goals').insert({ title, kind: gKind, target, currency: gKind === 'savings' ? ($('#gCur').value.trim() || null) : null, emoji: $('#gEmoji').value.trim() || '🎯' });
  if (error) return toast(errMsg(error)); $('#gTitle').value = $('#gTarget').value = ''; loadTable('goals');
};
function renderGoals() {
  const G = S.data.goals || [], C = S.data.goal_contribs || [];
  $('#goalList').innerHTML = G.length ? G.map((g) => { const cs = C.filter((c) => c.goal_id === g.id); const sum = cs.reduce((s, c) => s + Number(c.amount), 0); const pct = Math.min(100, sum / Number(g.target) * 100);
    const by = (uid) => cs.filter((c) => c.created_by === uid).reduce((s, c) => s + Number(c.amount), 0); const unit = g.kind === 'savings' ? ' ' + esc(g.currency || '') : '×';
    return `<div class="goal" data-oid="${g.id}"><b>${esc(g.emoji)} ${esc(g.title)}</b>${pct >= 100 ? ' 🎉' : ''}<div class="meter"><div class="barfill" style="width:${pct}%"></div></div><small>${+sum.toFixed(2)}${unit} / ${+Number(g.target)}${unit} (${Math.round(pct)}%) · You ${+by(S.user.id).toFixed(2)} · ${pn()} ${+by(S.partner.id).toFixed(2)}</small><br>
      <button class="mini" data-gadd="${g.id}">${g.kind === 'savings' ? '+ Add money' : '+1 Done'}</button><button class="mini soft" data-del="goals:${g.id}">✕</button>
      <details><summary>Log (${cs.length})</summary>${cs.slice().reverse().slice(0, 20).map((c) => `<div class="row"><span>${esc(emojiOf(c.created_by))} ${+Number(c.amount)}${unit}${c.note ? ' · ' + esc(c.note) : ''}</span><small>${fmtDate(c.created_at)}${mine(c) ? ` <a href="#" data-del="goal_contribs:${c.id}">✕</a>` : ''}</small></div>`).join('')}</details></div>`; }).join('') : '<p class="muted">Save for a trip, build a habit — together 💪</p>';
  setFB('goals', G.length ? G.length + ' goals' : '');
}
RENDER.goals = renderGoals; RENDER.goal_contribs = renderGoals;
$('#goalList').addEventListener('click', async (e) => {
  const id = e.target.dataset.gadd; if (!id) return; const g = (S.data.goals || []).find((x) => x.id === id);
  let amount = 1, note = null;
  if (g.kind === 'savings') { const v = await uiPrompt(`How much are you adding to “${g.title}”? (negative to withdraw)`); if (v == null) return; amount = parseFloat(v.replace(',', '.')); if (!amount) return toast('Enter a number'); }
  const { error } = await sb.from('goal_contribs').insert({ goal_id: id, amount, note }); if (error) return toast(errMsg(error)); hearts(5); snd('ding'); loadTable('goal_contribs');
});

// ---- inside jokes ----
$('#jkAdd').onclick = async () => {
  const term = $('#jkTerm').value.trim(); if (!term) return;
  const { error } = await sb.from('jokes').insert({ term, meaning: $('#jkMeaning').value.trim() || null, origin: $('#jkOrigin').value.trim() || null, emoji: $('#jkEmoji').value.trim() || '😂' });
  if (error) return toast(errMsg(error)); ['#jkTerm', '#jkMeaning', '#jkOrigin'].forEach((s) => $(s).value = ''); loadTable('jokes');
};
function renderJokes() {
  const q = $('#jkSearch').value.trim().toLowerCase(); const l = (S.data.jokes || []).filter((j) => !q || [j.term, j.meaning, j.origin].join(' ').toLowerCase().includes(q));
  $('#jkList').innerHTML = l.length ? l.map((j) => `<div class="ans"><b>${esc(j.emoji)} ${esc(j.term)}</b> <a href="#" data-jkedit="${j.id}">✏️</a> <a href="#" data-del="jokes:${j.id}">✕</a>${j.meaning ? `<br>${esc(j.meaning)}` : ''}${j.origin ? `<br><small>📜 ${esc(j.origin)}</small>` : ''}<small>added by ${esc(nameOf(j.created_by))}</small></div>`).join('') : '<p class="muted">Nothing here yet 😂</p>';
  setFB('jokes', (S.data.jokes || []).length + ' entries');
}
RENDER.jokes = renderJokes; $('#jkSearch').oninput = renderJokes;
$('#jkList').addEventListener('click', async (e) => {
  const id = e.target.dataset.jkedit; if (!id) return; e.preventDefault(); const j = (S.data.jokes || []).find((x) => x.id === id);
  const m = await uiPrompt(`What does “${j.term}” mean? (current: ${j.meaning || '—'})`); if (m == null) return;
  const o = await uiPrompt('Origin story? (leave empty to keep)'); if (o == null) return;
  const { error } = await sb.from('jokes').update({ meaning: m.trim() || j.meaning, origin: o.trim() || j.origin }).eq('id', id); if (error) toast(errMsg(error)); else loadTable('jokes');
});

// ---- trivia night ----
let TQ = window.CC_TRIVIA || [];
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function triviaRound(day) {
  const r = seeded(hashS(S.couple.id + '~' + day)); const idx = []; while (idx.length < 10 && idx.length < TQ.length) { const i = Math.floor(r() * TQ.length); if (!idx.includes(i)) idx.push(i); }
  return idx.map((i) => { const q = TQ[i]; const order = [0, 1, 2, 3].sort(() => r() - .5); return { cat: q[0], q: q[1], opts: order.map((o) => q[2 + o]), order }; });
}
let trState = null;
function renderTrivia() {
  if (!S.partner) return; const day = dayStr(); const R = S.data.trivia_results || [];
  const me = R.find((x) => mine(x) && x.day === day), them = R.find((x) => !mine(x) && x.day === day);
  $('#trDate').textContent = `Tonight's round · ${fmtDay(day)} · same 10 questions for both of you`;
  const box = $('#trBox'); const round = triviaRound(day);
  if (me) {
    box.innerHTML = vsHtml(me.score, them ? them.score : -1, 'You', null, (v) => v < 0 ? '⏳' : v + '/10') + (them ? `<p class="bq">${me.score > them.score ? 'You win tonight! 🏆' : me.score < them.score ? `${pn()} wins tonight 👑` : "It's a tie! 💞"}</p>` : `<p class="muted">Waiting for ${pn()} to play…</p>`) +
      `<details><summary>Review answers</summary>${round.map((q, i) => { const p = me.picks[i], tp = them?.picks[i]; return `<div class="ans"><small>${esc(q.cat)}</small>${esc(q.q)}<br>✅ ${esc(TQ.length && q.opts[q.order.indexOf(0)])}<br><small>You: ${p === 0 ? '✅' : '❌'}${them ? ` · ${pn()}: ${tp === 0 ? '✅' : '❌'}` : ''}</small></div>`; }).join('')}</details>`;
  } else if (trState) {
    const i = trState.i, q = round[i];
    box.innerHTML = `<p class="muted">Q${i + 1}/10 · ${esc(q.cat)} · score ${trState.picks.filter((p) => p === 0).length}</p><p class="bq">${esc(q.q)}</p>` + q.opts.map((o, k) => `<button class="opt" data-tr="${k}">${esc(o)}</button>`).join('');
  } else box.innerHTML = `<p>${them ? `${pn()} already played tonight — can you beat them? 😏` : 'Ready for tonight\'s 10 questions?'}</p><button id="trStart">Start round 🧠</button>`;
  const days = [...new Set(R.map((x) => x.day))].sort().reverse(); let w = 0, l = 0, t = 0;
  const hist = days.map((d) => { const a = R.find((x) => mine(x) && x.day === d), b = R.find((x) => !mine(x) && x.day === d); if (a && b) { if (a.score > b.score) w++; else if (a.score < b.score) l++; else t++; } return `<div class="row"><span>${fmtDay(d)}</span><small>You ${a ? a.score : '—'} · ${pn()} ${b ? b.score : '—'}</small></div>`; });
  $('#trH2H').innerHTML = vsHtml(w, l, 'You', null, (v) => v + ' 🏆') + (t ? `<p class="muted">${t} tie${t > 1 ? 's' : ''}</p>` : '');
  $('#trHist').innerHTML = hist.join('') || '<p class="muted">No rounds yet.</p>';
  setFB('trivia', me ? (them ? 'Done 🏆' : 'Waiting…') : 'Play tonight', !me && !!them);
}
RENDER.trivia_results = renderTrivia;
$('#trBox').onclick = async (e) => {
  if (e.target.id === 'trStart') { trState = { i: 0, picks: [] }; return renderTrivia(); }
  const k = e.target.dataset.tr; if (k == null || !trState || trState.busy) return; trState.busy = true;
  const round = triviaRound(dayStr()), q = round[trState.i], pick = q.order[+k];
  e.target.style.background = pick === 0 ? '#8fd694' : '#ff9a9a'; if (pick !== 0) $$('#trBox [data-tr]')[q.order.indexOf(0)].style.background = '#8fd694';
  snd(pick === 0 ? 'ding' : 'bad'); trState.picks.push(pick);
  setTimeout(async () => {
    trState.busy = false; trState.i++;
    if (trState.i >= 10) { const picks = trState.picks; trState = null; const score = picks.filter((p) => p === 0).length;
      const { error } = await sb.from('trivia_results').insert({ day: dayStr(), score, picks }); if (error) toast(errMsg(error)); else { confetti(50); snd('win'); window.FX && FX.fireworks(score >= 7 ? 5 : 2); notify('trivia', `scored ${score}/10 in tonight's trivia 🧠 your turn!`); }
      await loadTable('trivia_results'); } else renderTrivia();
  }, 900);
};

// ---- year in review ----
function yearData(y) {
  const inY = (r, f = 'created_at') => r[f] && String(r[f]).slice(0, 4) === String(y); const d = S.data;
  const moods = (d.moods || []).filter((m) => inY(m)); const mc = {}; moods.forEach((m) => mc[m.mood] = (mc[m.mood] || 0) + 1);
  const topMoods = Object.entries(mc).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]).join(' ');
  const best = (g, uid, low) => { const l = (d.game_scores || []).filter((s) => s.game === g && s.created_by === uid && inY(s)).map((s) => s.score); return l.length ? (low ? Math.min(...l) : Math.max(...l)) : '—'; };
  return {
    photos: (d.photos || []).filter((p) => inY(p)), notes: (d.notes || []).filter((n) => inY(n)).length, pings: (d.pings || []).filter((p) => inY(p)).length,
    letters: (d.open_when || []).filter((x) => inY(x)).length + (d.letters || []).filter((x) => inY(x, 'updated_at')).length,
    pokes: (d.poke_counts || []).reduce((s, p) => s + Number(p.count), 0), gratitude: (d.gratitude || []).filter((g) => inY(g)).length,
    answers: (d.daily_answers || []).filter((a) => inY(a)).length, moodsN: moods.length, topMoods, moments: (d.timeline || []).filter((t) => String(t.event_date).startsWith(y)),
    bucketDone: (d.bucket_items || []).filter((b) => inY(b, 'done_at')), songs: (d.song_week || []).filter((s) => s.week.startsWith(y)),
    catchMe: best('catch', S.user.id), catchP: best('catch', S.partner.id), balMe: best('balloons', S.user.id), balP: best('balloons', S.partner.id),
    streak: S.streak.best, drawings: (d.drawings || []).filter((x) => inY(x)).length, trivia: (d.trivia_results || []).filter((x) => inY(x)).length
  };
}
function initYearSel() {
  const ys = new Set([new Date().getFullYear()]); Object.values(S.data).forEach((l) => Array.isArray(l) && l.forEach((r) => r.created_at && ys.add(+String(r.created_at).slice(0, 4))));
  $('#yrSel').innerHTML = [...ys].sort((a, b) => b - a).map((y) => `<option>${y}</option>`).join('');
}
$('#yrGo').onclick = async () => {
  const y = $('#yrSel').value, x = yearData(y); await signPaths(x.photos.slice(0, 4).map((p) => p.path));
  const slides = [
    `<div class="big">💞</div><h2>${esc(S.me.display_name)} & ${pn()}</h2><p>Our ${y}, in little moments.</p>`,
    `<div class="big">📸</div><h2>${x.photos.length} photos</h2>${x.photos.slice(0, 4).map((p) => `<img src="${esc(sUrl(p.path))}" style="width:45%;margin:2%;border-radius:10px;border:4px solid #fff">`).join('')}`,
    `<div class="big">💌</div><h2>${x.notes} notes · ${x.letters} letters</h2><p>${x.pings} pings · ${x.gratitude} gratitudes in the jar</p>`,
    `<div class="big">🔥</div><h2>Best streak: ${x.streak} days</h2><p>${x.answers} daily answers · ${x.moodsN} mood check-ins</p>${x.topMoods ? `<p>Top moods: <span style="font-size:32px">${x.topMoods}</span></p>` : ''}`,
    `<div class="big">🎮</div><h2>Game on</h2><p>Catch my heart: you ${x.catchMe} · ${pn()} ${x.catchP}</p><p>Balloons: you ${x.balMe} · ${pn()} ${x.balP}</p><p>🧸 ${x.pokes.toLocaleString()} bear pokes · 🧠 ${x.trivia} trivia rounds · 🎨 ${x.drawings} drawings</p>`,
    `<div class="big">📖</div><h2>Highlights</h2>${x.moments.slice(0, 4).map((m) => `<p>💗 ${esc(m.title)}</p>`).join('') || '<p>So many little moments…</p>'}${x.bucketDone.length ? `<p>🪣 ${x.bucketDone.length} bucket list items done!</p>` : ''}${x.songs.length ? `<p>🎵 ${x.songs.length} songs of the week</p>` : ''}`,
    `<div class="big">✨</div><h2>Here's to more</h2><p>Thank you for this year. Same again, but even better? 💕</p>`
  ];
  $('#yrSummary').innerHTML = `<p class="muted">${x.photos.length} photos · ${x.notes} notes · ${x.letters} letters · best streak ${x.streak}</p>`;
  let i = 0; const st = $('#story'); st.classList.remove('hidden');
  const show = () => { $('#storyBar').innerHTML = slides.map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join(''); $('#storySlide').innerHTML = slides[i]; $('#storySlide').style.animation = 'none'; void $('#storySlide').offsetWidth; $('#storySlide').style.animation = ''; if (i === slides.length - 1) { confetti(80); hearts(20); } };
  show(); st.onclick = (e) => { if (e.target.id === 'storyClose') { st.classList.add('hidden'); return; } i++; if (i >= slides.length) st.classList.add('hidden'); else show(); };
};

Object.assign(FEAT_RENDER, { voice: () => RENDER.voice_notes(), wish: renderWish, capsule: () => { loadLocked(); }, songwk: renderSongWeek, playlist: renderPlaylist, lovemap: loadLMProgress, cal: renderCal, miles: renderMiles, goals: renderGoals, jokes: renderJokes, trivia: renderTrivia, year: initYearSel });
async function initConnect() {
  refreshProgress(); loadLocked(); loadLMProgress(); pushState().catch(() => {}); RENDER.locations();
}

// ================= LIVING GAMES (v13) =================
const H = () => window.FX && FX.heavy();
const Lm = () => window.FX && FX.light();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function bubble(el, text, ms = 1400) { if (!el) return; el.textContent = text; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), ms); }
function emojiRain(set, n = 30) { if (!H()) return; for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'rain'; d.textContent = rnd(set); d.style.left = Math.random() * 100 + 'vw'; d.style.animationDuration = (2 + Math.random() * 2) + 's'; d.style.animationDelay = Math.random() * .8 + 's'; document.body.appendChild(d); setTimeout(() => d.remove(), 5000); } }
// header emoji bounce
$$('.game h2, .feat h2').forEach((h) => { const n = h.firstChild; if (!n || n.nodeType !== 3) return; const m = n.textContent.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*/u); if (!m) return; n.textContent = n.textContent.slice(m[0].length); const s = document.createElement('span'); s.className = 'hemo'; s.textContent = m[1]; h.insertBefore(document.createTextNode(' '), n); h.insertBefore(s, h.firstChild); });

// ---- poke bear ----
const BEAR_SAY = ['hehe 🙈', 'more pokes!', 'I love you 💗', 'that tickles!', 'again again!', 'boop!', 'hug me?', `${'I'} miss you 🥺`];
let pokeTimes = [], pokeComboN = 0, pokeComboT = null;
$('#bearEl').onclick = (e) => {
  const now = Date.now(); pokeTimes = pokeTimes.filter((t) => now - t < 1500); pokeTimes.push(now);
  pokeComboN++; clearTimeout(pokeComboT); pokeComboT = setTimeout(() => { pokeComboN = 0; $('#pokeCombo').classList.remove('show'); $('#bearStage').classList.remove('blushing'); }, 1600);
  const rapid = pokeTimes.length; const wrap = $('.bearWrap');
  $('#bearTxt').textContent = D.bearLines[bearI++ % D.bearLines.length]; snd('boing'); if (navigator.vibrate) navigator.vibrate(15);
  if (window.FX) {
    FX.cls(wrap, rapid >= 8 ? 'spin' : 'big', rapid >= 8 ? 800 : 500);
    FX.burst(e.clientX, e.clientY, ['💗', '💕', '💖', '✨'], 8 + Math.min(rapid, 8), 70);
    FX.floatText(e.clientX, e.clientY - 20, '+1');
  }
  hearts(rapid >= 5 ? 6 : 3, e.clientX, e.clientY);
  if (Math.random() < .55 || rapid >= 4) bubble($('#bearSpeech'), rnd(BEAR_SAY));
  if (pokeComboN >= 3) { $('#pokeCombo').textContent = `combo ×${pokeComboN} 🔥`; $('#pokeCombo').classList.add('show'); window.FX && FX.pop($('#pokeCombo')); }
  if (rapid >= 5) $('#bearStage').classList.add('blushing');
  if (rapid === 12 && H()) { const g = document.createElement('div'); g.className = 'giantHeart'; g.textContent = '💖'; document.body.appendChild(g); setTimeout(() => g.remove(), 1400); FX.confetti(60); bubble($('#bearSpeech'), 'I LOVE YOU SO MUCH 💖', 2000); }
  pokePending++; renderPokes(); if (!pokeTimer) pokeTimer = setTimeout(flushPokes, 700);
};
setInterval(() => {
  if (document.hidden || curGame !== 'bear' || !Lm()) return;
  if (Math.random() < .5) bubble($('#bearThought'), rnd(['💭💗', '💭🍯', `💭 ${partnerName()}…`, '💭🤗', '💭✨']), 2200);
  else window.FX && FX.cls($('.bearWrap'), 'wave', 1000);
}, 5000);

// ---- fortune cookie ----
let cookieOpen = false, typeT = null;
function typeText(el, txt) { clearInterval(typeT); if (!Lm()) { el.textContent = txt; return; } el.textContent = ''; let i = 0; const chars = [...txt]; typeT = setInterval(() => { el.textContent += chars[i++] || ''; if (i >= chars.length) clearInterval(typeT); }, 28); }
function crumbs(x, y) { if (!H()) return; for (let i = 0; i < 14; i++) { const c = document.createElement('div'); c.className = 'crumb'; c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.setProperty('--x', (Math.random() * 160 - 80) + 'px'); c.style.setProperty('--y', (Math.random() * 90 + 10) + 'px'); document.body.appendChild(c); setTimeout(() => c.remove(), 900); } }
$('#cookie').onclick = async (e) => {
  if (cookieOpen) return; cookieOpen = true; const st = $('#cookieStage');
  const fromP = (S.data.fortunes || []).filter((f) => !mine(f));
  const txt = fromP.length && Math.random() < .75 ? (() => { const f = rnd(fromP); return `${f.message}  — ${partnerName()} 💌`; })() : rnd(D.fortunes);
  if (Lm()) { st.classList.add('shake'); snd('tick'); await wait(400); st.classList.remove('shake'); }
  st.classList.add('cracked'); snd('pop'); const r = st.getBoundingClientRect(); crumbs(r.left + r.width / 2, r.top + r.height / 2);
  window.FX && FX.burst(r.left + r.width / 2, r.top + r.height / 2, ['✨', '⭐', '🌟'], 10, 70);
  const pp = $('#fortunePaper'); pp.classList.remove('unroll'); void pp.offsetWidth; pp.classList.add('unroll'); typeText($('#fortune'), txt);
};
$('#cookieNew').onclick = () => { const st = $('#cookieStage'); st.classList.remove('cracked'); cookieOpen = false; st.classList.remove('roll'); void st.offsetWidth; st.classList.add('roll'); setTimeout(() => st.classList.remove('roll'), 850); $('#fortune').textContent = 'Tap the cookie to crack it open'; snd('boing'); };

// ---- real date wheel ----
const WCOL = ['#ff8fab', '#ffc2d1', '#e75480', '#ffd6e5', '#c77dff', '#ffb3c6', '#ff6f91', '#f9c6ff', '#ffa8b6', '#e0c3fc', '#ff85a1', '#fbb1bd'];
// theme-aware wheel colours (Blush keeps the original candy palette)
const thV = () => (window.CC_theme ? CC_theme() : null);
const wCol = (i) => { const t = thV(); if (!t || t.id === 'blush') return WCOL[i % WCOL.length]; const v = t.v, c = t.dark ? [v.ac3, v.sf2, v.sf, v.sf3] : [v.ac2, v.ac3, v.sf2, v.sf]; return c[i % c.length]; };
const wTxt = () => { const t = thV(); return !t || t.id === 'blush' ? '#5a1236' : t.v.tx; };
const wStroke = () => { const t = thV(); return t && t.dark ? t.v.cd : '#fff'; };
document.addEventListener('cc:theme', () => { try { if (!wheelSpinning && wheelItems.length) buildWheel(wheelItems); } catch { /* */ } });
let wheelItems = [], wheelAngle = 0, wheelSpinning = false, wheelIdleRAF = null, lastIdle = 0;
const wTrunc = (s, n) => { const a = [...s]; return a.length > n ? a.slice(0, n - 1).join('') + '…' : s; };
function buildWheel(items) {
  wheelItems = items; const n = items.length, a = 360 / n, R = 100;
  const pt = (deg, r) => [r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180)];
  const fs = n <= 6 ? 9 : n <= 9 ? 7.5 : 6.2, maxc = n <= 6 ? 16 : n <= 9 ? 14 : 12;
  $('#wheelG').innerHTML = items.map((it, i) => {
    const c = i * a, [x1, y1] = pt(c - a / 2, R), [x2, y2] = pt(c + a / 2, R);
    return `<g class="wslice" data-i="${i}"><path d="M0 0 L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${a > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${wCol(i)}" stroke="${wStroke()}" stroke-width="1.5"/>
      <text transform="rotate(${c - 90}) translate(${R - 8} 0)" text-anchor="end" dominant-baseline="middle" font-size="${fs}" font-weight="bold" fill="${wTxt()}">${esc(wTrunc(it, maxc))}</text></g>`;
  }).join('') + `<circle r="${R}" fill="none" stroke="${wStroke()}" stroke-width="4"/>`;
  setWheel(wheelAngle);
}
function setWheel(deg) { wheelAngle = deg; $('#wheelG').setAttribute('transform', `rotate(${deg})`); }
function wheelPool() { if (!wheelItems.length) drawWheel(false); return wheelItems; }
function sampleWheel(winner) {
  const pool = wheelPool(); if (pool.length <= 12) return pool;
  const others = pool.filter((x) => x !== winner).sort(() => Math.random() - .5).slice(0, 11); others.splice(Math.floor(Math.random() * 12), 0, winner); return others;
}
function refreshWheel(force) { if (wheelSpinning) return; if (force || !wheelItems.length) drawWheel(false); }
const origRenderIdeas = RENDER.date_ideas; RENDER.date_ideas = () => { origRenderIdeas(); refreshWheel(wheelCat === 'ours'); };
function wheelIdle(t) {
  wheelIdleRAF = requestAnimationFrame(wheelIdle);
  if (wheelSpinning || curGame !== 'wheel' || document.hidden || !H()) { lastIdle = t; return; }
  const dt = Math.min(50, t - (lastIdle || t)); lastIdle = t; setWheel((wheelAngle + dt * 0.006) % 360);
}
wheelIdleRAF = requestAnimationFrame(wheelIdle);
$('#spinBtn').onclick = () => {
  if (wheelSpinning) return; const pool = wheelPool(); const winner = rnd(pool);
  if (pool.length > 12 || !wheelItems.includes(winner)) buildWheel(sampleWheel(winner));
  const n = wheelItems.length, a = 360 / n, wi = wheelItems.indexOf(winner);
  $$('#wheelG .wslice').forEach((s) => s.classList.remove('win')); $('#wheelOut').classList.remove('result');
  const start = wheelAngle, cur = ((start % 360) + 360) % 360;
  const want = ((-(wi * a) % 360) + 360) % 360; const jitter = (Math.random() - .5) * a * .6;
  const target = start + (360 * (4 + Math.floor(Math.random() * 2))) + ((want - cur + 360) % 360) + jitter;
  const dur = Lm() ? 4200 + Math.random() * 1500 : 10; const t0 = performance.now(); wheelSpinning = true;
  let lastIdx = -1, lastSnd = 0; $('#wheelOut').textContent = 'Spinning… 🎡';
  const ease = (k) => 1 - Math.pow(1 - k, 4);
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur); const ang = start + (target - start) * ease(k); setWheel(ang);
    const idx = Math.floor((((-ang % 360) + 360 + a / 2) % 360) / a) % n;
    if (idx !== lastIdx) { lastIdx = idx; if (window.FX) FX.cls($('#wheelPointer'), 'tick', 120); if (t - lastSnd > 45) { snd('tick'); lastSnd = t; } }
    if (k < 1) return requestAnimationFrame(step);
    wheelSpinning = false; setWheel(target % 360); finishSpin(winner, wi);
  };
  requestAnimationFrame(step);
};
async function finishSpin(winner, wi) {
  const sl = $(`#wheelG .wslice[data-i="${wi}"]`); sl && sl.classList.add('win');
  const out = $('#wheelOut'); out.textContent = '🎉 ' + winner; out.classList.remove('result'); void out.offsetWidth; out.classList.add('result');
  snd('win'); hearts(10); if (window.FX) { FX.confetti(70); FX.burstAt(out, ['🎉', '💖', '✨'], 14, 90); }
  const { error } = await sb.from('date_spins').insert({ idea: winner.slice(0, 150) });
  if (error) toast(errMsg(error)); else toast(`Saved! ${partnerName()} will see it too 🎡`);
}

// ---- compatibility machine ----
const CALC_MSGS = ['Consulting the stars… ✨', 'Measuring cuddles… 🤗', 'Counting shared snacks… 🍟', 'Analyzing heartbeats… 💓', 'Checking the moon… 🌙', 'Weighing butterflies… 🦋', 'Asking Cupid… 💘'];
const syncBubbles = () => { $('#cbA').textContent = $('#cpN1').value || 'You'; $('#cbB').textContent = $('#cpN2').value || 'Me'; };
$('#cpN1').oninput = syncBubbles; $('#cpN2').oninput = syncBubbles;
let calcBusy = false;
$('#calcBtn').onclick = async () => {
  if (calcBusy) return; calcBusy = true; syncBubbles();
  const a = $('#cpN1').value.trim().toLowerCase(), b = $('#cpN2').value.trim().toLowerCase(); const t = $('#calcTxt'); t.textContent = '';
  const us = S.me && S.partner && [S.me.display_name.toLowerCase(), partnerName().toLowerCase()].sort().join('|') === [a, b].sort().join('|')
    || (S.me && S.partner && [S.me.display_name.toLowerCase(), S.partner.display_name.toLowerCase()].sort().join('|') === [a, b].sort().join('|'));
  const target = us ? 100 + hashStr(S.couple.id) % 900 : 50 + hashStr([a, b].sort().join('|')) % 51;
  const st = $('#compatStage'), digits = $$('#slot span'); st.classList.add('fly');
  let mi = 0; const msgT = setInterval(() => { $('#calcMsg').textContent = CALC_MSGS[mi++ % CALC_MSGS.length]; }, 550); $('#calcMsg').textContent = CALC_MSGS[0];
  digits.forEach((d) => d.classList.add('roll'));
  const rollT = setInterval(() => { digits.forEach((d) => { if (d.classList.contains('roll')) d.textContent = Math.floor(Math.random() * 10); }); snd('tick'); }, 70);
  await wait(Lm() ? 2400 : 50);
  const str = String(target).padStart(3, '0');
  for (let i = 0; i < 3; i++) { digits[i].classList.remove('roll'); digits[i].textContent = str[i]; window.FX && FX.cls(digits[i], 'land', 400); snd('ding'); await wait(Lm() ? 380 : 0); }
  clearInterval(rollT); clearInterval(msgT); st.classList.remove('fly');
  const tier = target >= 500 ? ['Cosmic soulmates 🌌', ['💞', '🌌', '✨', '💖', '🪐']] : target >= 100 ? ['Off the charts! The machine is crying 🥹', ['💖', '💕', '🥹', '✨']] : target >= 85 ? ['Great match 💕', ['💕', '💗']] : ['Cute together 🙂', ['🙂', '💗']];
  $('#calcMsg').textContent = ''; t.textContent = `${target}% — ${tier[0]}${us ? '' : ' (but not you two 😏)'}`;
  hearts(15); snd('win'); emojiRain(tier[1], target >= 100 ? 40 : 15); window.FX && FX.burstAt($('.crystal'), tier[1], 14, 90); calcBusy = false;
};
const origInitGames = initGames;
initGames = function () { origInitGames(); syncBubbles(); refreshWheel(); };

// ---- reasons card deck ----
let reasonN = 0, reasonBusy = false;
async function nextReason(e) {
  if (reasonBusy) return; reasonBusy = true; const c = $('#reason');
  let i; do { i = Math.floor(Math.random() * D.reasons.length); } while (i === lastReason && D.reasons.length > 1); lastReason = i;
  if (Lm()) { c.classList.remove('in'); c.classList.add('out'); await wait(330); }
  c.classList.remove('out'); c.textContent = D.reasons[i] + ' 💖'; void c.offsetWidth; c.classList.add('in'); reasonN++;
  $('#reasonNum').textContent = `Reason #${reasonN} of ∞`; snd('pop');
  window.FX && FX.burstAt(c, ['💖', '💕', '✨'], 10, 80); if (e && e.clientX) hearts(3, e.clientX, e.clientY);
  setTimeout(() => { reasonBusy = false; }, 200);
}
$('#reasonBtn').onclick = nextReason; $('#reason').onclick = nextReason;

// ---- hugs ----
function playHug(stage, ms = 3600) {
  stage.classList.remove('go'); void stage.offsetWidth; stage.classList.add('go'); setTimeout(() => stage.classList.remove('go'), ms);
  if (navigator.vibrate) navigator.vibrate([200, 100, 300]);
  if (!H()) return;
  const g = document.createElement('div'); g.className = 'hugGlow'; document.body.appendChild(g); setTimeout(() => g.remove(), 2500);
  for (let i = 0; i < 16; i++) { const s = document.createElement('div'); s.className = 'swirl'; s.textContent = rnd(['💗', '💕', '💖', '✨']); s.style.setProperty('--a', (i * 22.5) + 'deg'); s.style.animationDelay = (i * 40) + 'ms'; document.body.appendChild(s); setTimeout(() => s.remove(), 2700); }
}
function showHugOverlay(title) {
  $('#hugTitle').textContent = title; const o = $('#hugOverlay'); o.classList.remove('hidden'); playHug(o.querySelector('.hugBig'), 5000); snd('win');
  clearTimeout(showHugOverlay.t); showHugOverlay.t = setTimeout(() => o.classList.add('hidden'), 6000);
}
$('#hugBtn').onclick = () => showHugOverlay(rnd(['Squeeeeeze', 'Biggest hug ever 🫂', 'Not letting go', 'Hug level: bear 🐻']));
$('#hugSend').onclick = async () => {
  if (!S.couple) return toast('Connect with your partner first 💞');
  playHug($('#hugStage')); snd('win');
  const { error } = await sb.from('pings').insert({ kind: 'hug' });
  if (error) return toast(errMsg(error)); notify('hug', 'sent you a big warm hug 🤗'); toast(`Hug sent to ${partnerName()} 🤗`);
};

// ---- v14: big date pool, shuffle, surprise, categories ----
const WCATS = [['all', 'All ✨'], ['ours', 'Ours 💗'], ['cozy', 'Cozy 🕯️'], ['adventure', 'Adventure 🧗'], ['cheap', 'Cheap 💸'], ['ldr', 'Long-distance 📱'], ['home', 'At home 🏠']];
const CAT_LBL = Object.fromEntries(WCATS);
let wheelCat = S.data.couple_settings?.[0]?.wheel_cat || localStorage.getItem('cc_wheel_cat') || 'all';
function catPool() {
  const ours = (S.data.date_ideas || []).map((i) => ({ t: i.idea, c: 'ours' }));
  const all = ours.concat(D.datePool || D.dates.map((t) => ({ t, c: 'cozy' })));
  const seen = new Set(); const f = all.filter((x) => (wheelCat === 'all' || x.c === wheelCat) && !seen.has(x.t) && seen.add(x.t));
  return f.length ? f : all;
}
function drawWheel(anim) {
  if (wheelSpinning) return;
  const items = catPool().map((x) => x.t).sort(() => Math.random() - .5).slice(0, 8);
  $$('#wheelG .wslice').forEach((s) => s.classList.remove('win'));
  if (!anim || !Lm()) return buildWheel(items);
  const st = $('.wheelStage'); st.classList.remove('shuf'); void st.offsetWidth; st.classList.add('shuf'); snd('boing');
  setTimeout(() => buildWheel(items), 300); setTimeout(() => st.classList.remove('shuf'), 750);
  window.FX && FX.burstAt(st, ['🔀', '✨', '💗'], 10, 90);
}
function renderWheelCats() {
  $('#wheelCats').innerHTML = WCATS.map(([k, l]) => `<span data-c="${k}" class="${k === wheelCat ? 'on' : ''}">${l}</span>`).join('');
  $$('#wheelCats span').forEach((s) => s.onclick = () => { wheelCat = s.dataset.c; localStorage.setItem('cc_wheel_cat', wheelCat); renderWheelCats(); drawWheel(true); saveShared({ wheel_cat: wheelCat }, true); });
}
renderWheelCats();
$('#wheelShuffle').onclick = () => drawWheel(true);
let surpriseIdea = null;
async function surprise() {
  const cand = catPool().filter((x) => !wheelItems.includes(x.t)); const pick = rnd(cand.length ? cand : catPool());
  surpriseIdea = pick.t; const o = $('#surpriseOverlay'), g = $('#sGift'), c = $('#sCard');
  o.classList.remove('hidden'); c.classList.remove('show'); g.classList.remove('open', 'wig');
  $('#sCat').textContent = CAT_LBL[pick.c] || ''; $('#sIdea').textContent = pick.t;
  if (Lm()) { void g.offsetWidth; g.classList.add('wig'); snd('tick'); await wait(900); }
  g.classList.add('open'); c.classList.add('show'); snd('win');
  if (window.FX) { FX.confetti(50); FX.burstAt(c, ['🎁', '💖', '✨', '🎉'], 16, 110); }
}
$('#wheelSurprise').onclick = surprise; $('#sAgain').onclick = (e) => { e.stopPropagation(); surprise(); };
$('#surpriseOverlay').onclick = (e) => { if (e.target.id === 'surpriseOverlay') $('#surpriseOverlay').classList.add('hidden'); };
$('#sAdd').onclick = async (e) => {
  e.stopPropagation(); if (!S.couple) return toast('Connect with your partner first 💞');
  const { error } = await sb.from('date_ideas').insert({ idea: surpriseIdea.slice(0, 150) });
  if (error) return toast(errMsg(error)); toast('Added to our ideas 💗'); $('#surpriseOverlay').classList.add('hidden');
};

// ================= STORAGE LIMITER (v17) =================
const STORE = { info: null, at: 0, warned: sessionStorage.getItem('cc_store_warned') === '1' };
const MB = 1048576;
function storeLevel(i = STORE.info) {
  if (!i) return { warn: false, block: false, pct: 0, reason: '' };
  const cp = i.quota ? i.used / i.quota : 0; const pp = i.project_limit ? i.project_used / i.project_limit : 0; const pblock = (i.project_block_pct || 95) / 100;
  const block = i.ok === false || cp >= 1 || pp >= pblock;
  const warn = cp >= 0.8 || pp >= 0.8;
  const reason = (cp >= 1 || (cp >= 0.8 && cp / 1 >= pp / pblock)) ? 'couple' : (pp >= 0.8 ? 'project' : 'couple');
  return { warn, block, pct: cp, ppct: pp, reason };
}
async function refreshStorage(force) {
  if (!S.couple || !navigator.onLine) return STORE.info;
  if (!force && STORE.info && Date.now() - STORE.at < 60000) return STORE.info;
  const { data, error } = await sb.rpc('couple_storage'); if (error || !data) return STORE.info;
  STORE.info = data; STORE.at = Date.now(); renderStorage(); storeWarnOnce(); return data;
}
function renderStorage() {
  const i = STORE.info; if (!i || !$('#stFill')) return; const L = storeLevel(i);
  const pct = Math.min(100, Math.round(L.pct * 1000) / 10);
  $('#stFill').style.width = Math.max(2, pct) + '%'; $('#stCard').classList.toggle('warn', L.warn && !L.block); $('#stCard').classList.toggle('full', L.block);
  $('#stTxt').innerHTML = `<b>${(i.used / MB).toFixed(1)} MB</b> of <b>${Math.round(i.quota / MB)} MB</b> used · ${pct}% ${L.block ? '🙈 full' : L.warn ? '⚠️' : '💕'}`;
  $('#stSub').innerHTML = `📸 Photos ${(i.photos / MB).toFixed(1)} MB · 💬 Chat ${(i.chat / MB).toFixed(1)} MB<br>${L.block ? (L.reason === 'project' ? 'The app’s shared space is almost full, so new media is paused for now 🥺 texts still work.' : 'Storage full — delete some old photos/videos to make room 🧹 texts still work.') : 'Images & videos are shrunk on your phone before upload 🪄'}`;
}
function storeWarnOnce() {
  const L = storeLevel(); if (!L.warn || STORE.warned) return; STORE.warned = true; sessionStorage.setItem('cc_store_warned', '1');
  toast(L.block ? '💾 Storage is full — delete some old photos/videos to send new ones 🧹 (texts still work)' : `💾 Heads-up: ${L.reason === 'project' ? 'the app’s shared space' : 'your storage'} is ${Math.round((L.reason === 'project' ? L.ppct : L.pct) * 100)}% full — maybe tidy up some old videos? 🧹`, 6000);
}
async function mediaGuard(bytes) {
  const i = await refreshStorage(true); if (!i) return true; // offline/unknown: the server still enforces
  const L = storeLevel(i);
  if (L.block || (i.quota && i.used + (bytes || 0) > i.quota)) { toast(L.reason === 'project' && L.block ? '🙈 The app’s shared storage is full right now — new media is paused, texts still work 💌' : '🙈 Storage full! Delete some old photos or videos to make room 🧹 (texts still work 💌)', 6000); renderStorage(); return false; }
  return true;
}
// images: ≤1600px long edge, JPEG ~0.8, aim for ~300 KB
async function smartImage(file) {
  if (file.type === 'image/gif' && file.size < 3 * MB) return file;
  if (/jpe?g/i.test(file.type) && file.size < 280 * 1024) return file; // already light — no need to touch it
  let b = await compress(file, 1600, 0.82);
  if (b.size > 300 * 1024) b = await compress(file, 1600, 0.68);
  if (b.size > 300 * 1024) b = await compress(file, 1280, 0.65);
  return b;
}
// videos: ≤60 s; shrink to ~720p with canvas+MediaRecorder when possible, else hard cap 25 MB
const canShrinkVideo = () => !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream && (window.AudioContext || window.webkitAudioContext));
async function prepVideo(file, onProg) {
  const dur = await mediaDuration(file);
  if (dur && dur > 60.5) { toast(`That video is ${fmtDur(dur)} long 🎬 — max is 1 minute. Trim it a little and try again 💕`, 5000); return null; }
  let out = file;
  if (canShrinkVideo() && file.size > 6 * MB) { try { const s = await shrinkVideo(file, onProg); if (s && s.size < file.size) out = s; } catch (e) { console.warn('shrink failed', e); } }
  if (out.size > 25 * MB) { toast(`That video is still ${(out.size / MB).toFixed(0)} MB 🥺 — max 25 MB. Try a shorter clip 🎬`, 5000); return null; }
  return { blob: out, duration: dur };
}
function shrinkVideo(file, onProg) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video'); const url = URL.createObjectURL(file); v.src = url; v.playsInline = true; v.preload = 'auto';
    const fail = (e) => { try { URL.revokeObjectURL(url); } catch { /* */ } reject(e); };
    v.onerror = () => fail(new Error('cannot decode'));
    v.onloadedmetadata = async () => {
      const W = v.videoWidth, H = v.videoHeight; if (!W || !H) return fail(new Error('no video track'));
      const sc = Math.min(1, 720 / Math.min(W, H)); const w = Math.round(W * sc / 2) * 2, h = Math.round(H * sc / 2) * 2;
      const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d');
      const stream = c.captureStream(30);
      let ac = null; try { ac = new (window.AudioContext || window.webkitAudioContext)(); const src = ac.createMediaElementSource(v); const dst = ac.createMediaStreamDestination(); src.connect(dst); dst.stream.getAudioTracks().forEach((t) => stream.addTrack(t)); } catch { v.muted = true; }
      const mime = pickVMime(); const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 1500000, audioBitsPerSecond: 96000 }); const chunks = [];
      rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
      rec.onstop = () => { try { ac && ac.close(); } catch { /* */ } URL.revokeObjectURL(url); resolve(new Blob(chunks, { type: (rec.mimeType || 'video/webm').split(';')[0] })); };
      let raf; const draw = () => { cx.drawImage(v, 0, 0, w, h); if (onProg && v.duration) onProg(v.currentTime / v.duration); raf = requestAnimationFrame(draw); };
      v.onended = () => { cancelAnimationFrame(raf); setTimeout(() => rec.state !== 'inactive' && rec.stop(), 150); };
      try { if (ac && ac.state === 'suspended') await ac.resume(); rec.start(1000); await v.play(); draw(); } catch (e) { fail(e); }
      setTimeout(() => { if (rec.state !== 'inactive') { v.pause(); rec.stop(); } }, ((v.duration || 60) + 8) * 1000);
    };
  });
}
$$('.nav button, #gearBtn').forEach((b) => b.addEventListener('click', () => { if (!$('#tab-me').classList.contains('hidden')) refreshStorage(true); }));


// ================= SHARED COUPLE SETTINGS (v18) =================
// One couple_settings row per couple, read/updated by either partner (couple-member RLS). created_by = who changed it last.
const SH_FIELDS = ['notify_level', 'cute_fx', 'wheel_cat', 'chat_receipts', 'chat_typing', 'chat_enter_send', 'theme', 'seasonal', 'lock_hash'];
const shRow = () => S.data.couple_settings?.[0] || null;
function shared(k, def) { const r = shRow(); return r && r[k] != null ? r[k] : def; }
const onOff = (v) => (v ? 'on ✅' : 'off 💤');
const SH_TOAST = {
  notify_level: (v) => `changed notifications to ${v === 'everything' ? 'Everything 🔔' : 'Just the important stuff 💌'}`,
  cute_fx: (v) => `turned cute effects ${v ? 'on ✨' : 'off 💤'}`,
  wheel_cat: (v) => `set the date wheel to ${(WCATS.find(([k]) => k === v) || [, v])[1]}`,
  chat_receipts: (v) => `turned read receipts ${onOff(v)}`,
  chat_typing: (v) => `turned “typing…” ${onOff(v)}`,
  chat_enter_send: (v) => `turned Enter-to-send ${onOff(v)}`,
  theme: (v) => { const t = (window.CC_THEMES || []).find((x) => x.id === v); return t ? `switched our theme to ${t.name} ${t.em}` : 'changed our theme 🎨'; },
  seasonal: (v) => `turned seasonal sprinkles ${onOff(v)}`,
  lock_hash: (v) => (v ? 'set the app-lock passcode 🔒 — ask them for it to lock your phone too' : 'removed the app-lock passcode'),
  lock_salt: () => '',
};
let shPrev = (() => { try { return JSON.parse(localStorage.getItem('cc_sh_seen')); } catch { return null; } })(), shMigrated = false; // last seen → "while you were away" toasts
function applyShared() {
  const r = shRow();
  if (r && shPrev && shPrev.couple_id === r.couple_id && r.created_by && r.created_by !== S.user?.id) {
    const ch = SH_FIELDS.filter((k) => shPrev[k] != null && r[k] != null && shPrev[k] !== r[k]);
    if (ch.length) { toast(`${partnerName()} ${ch.map((k) => SH_TOAST[k](r[k])).filter(Boolean).join(' · ')}`, 4500); if (ch.includes('notify_level') || ch.includes('cute_fx')) hearts(6); }
  }
  shPrev = r ? { ...r } : null; if (r) localStorage.setItem('cc_sh_seen', JSON.stringify(r));
  if (r && r.cute_fx != null && window.CC_setCute) CC_setCute(r.cute_fx);
  syncTheme(r);
  if (r && r.wheel_cat && r.wheel_cat !== wheelCat) { wheelCat = r.wheel_cat; localStorage.setItem('cc_wheel_cat', wheelCat); renderWheelCats(); try { drawWheel(false); } catch { /* */ } }
  if (r && r.chat_receipts === false && typeof chRender === 'function') { try { chRender(); } catch { /* */ } }
  renderSettingsUI();
  migrateShared();
}
// first load: carry this phone's old local choices into the shared row (only fills blanks — never overwrites the partner)
async function migrateShared() {
  if (shMigrated || !S.couple || !S.user || !navigator.onLine) return; shMigrated = true;
  const { data, error } = await sb.from('couple_settings').select('*').eq('couple_id', S.couple.id).maybeSingle();
  if (error) { shMigrated = false; return; }
  const lc = localStorage.getItem('cc_cute_fx'), lw = localStorage.getItem('cc_wheel_cat');
  const local = { cute_fx: lc == null ? null : lc !== '0', wheel_cat: lw && WCATS.some(([k]) => k === lw) ? lw : null };
  const patch = {}; Object.entries(local).forEach(([k, v]) => { if (v != null && (!data || data[k] == null)) patch[k] = v; });
  if (data && !Object.keys(patch).length) return;
  const meta = { created_by: S.user.id, updated_at: new Date().toISOString() };
  let res = data ? await sb.from('couple_settings').update({ ...patch, ...meta }).eq('couple_id', S.couple.id).is(Object.keys(patch)[0], null)
    : await sb.from('couple_settings').insert({ ...patch, ...meta });
  if (res.error && /duplicate|23505/i.test(res.error.message + res.error.code)) { shMigrated = false; return migrateShared(); } // partner created it at the same moment
  if (!res.error && !res.queued) loadTable('couple_settings');
}
async function saveShared(patch, quiet) {
  if (!S.couple || !S.user) return;
  const meta = { created_by: S.user.id, updated_at: new Date().toISOString() };
  const cur = shRow();
  if (cur) Object.assign(cur, patch, meta); else (S.data.couple_settings = [{ couple_id: S.couple.id, ...patch, ...meta }]);
  shPrev = { ...shRow() }; localStorage.setItem('cc_sh_seen', JSON.stringify(shPrev)); renderSettingsUI();
  const res = cur ? await sb.from('couple_settings').update({ ...patch, ...meta }).eq('couple_id', S.couple.id)
    : await sb.from('couple_settings').insert({ ...patch, ...meta });
  if (res.error && /duplicate|23505/i.test(res.error.message + res.error.code)) { await sb.from('couple_settings').update({ ...patch, ...meta }).eq('couple_id', S.couple.id); }
  else if (res.error) { toast(errMsg(res.error)); loadTable('couple_settings'); return; }
  if (!quiet) toast(res.queued ? 'Saved 💕' : `Saved for both of you 💕`);
}
function renderSettingsUI() { try { renderSettingsUI0(); } catch { /* early boot: consts not ready yet */ } }
function renderSettingsUI0() {
  renderThemePicker();
  if (isStandalone()) $('#instState').textContent = "✅ You're using the installed app — notifications and offline are all set.";
  if (!$('#setNotify')) return;
  $('#shHead').textContent = S.partner ? `Shared with ${partnerName()} 💕` : 'Shared with your love 💕';
  const lvl = notifyLevel();
  $$('#setNotify button').forEach((b) => b.classList.toggle('on', b.dataset.v === lvl));
  const r = shRow();
  $('#setNotifyBy').textContent = r && r.updated_at ? `Last changed by ${r.created_by === S.user?.id ? 'you' : partnerName()} · ${new Date(r.updated_at).toLocaleDateString()}` : 'Default: just the important stuff 💌';
  $('#setReceipts').checked = shared('chat_receipts', true); $('#setTyping').checked = shared('chat_typing', true); $('#setEnter').checked = shared('chat_enter_send', true);
  const ws = $('#setWheel'); if (!ws.options.length) ws.innerHTML = WCATS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  ws.value = wheelCat;
  $('#setReduce').checked = localStorage.getItem('cc_reduce_motion') === '1';
  const rate = String(Number(localStorage.getItem('cc_chat_rate')) || 1); $$('#setRate button').forEach((b) => b.classList.toggle('on', b.dataset.v === rate));
}
$$('#setNotify button').forEach((b) => b.onclick = () => { if (notifyLevel() === b.dataset.v) return; saveShared({ notify_level: b.dataset.v }, true); toast(b.dataset.v === 'everything' ? `Everything 🔔 — you'll both hear about all the little things` : 'Just the important stuff 💌 — chat, hugs & pokes', 3500); });
$('#setReceipts').onchange = (e) => saveShared({ chat_receipts: e.target.checked });
$('#setTyping').onchange = (e) => saveShared({ chat_typing: e.target.checked });
$('#setEnter').onchange = (e) => saveShared({ chat_enter_send: e.target.checked });
$('#setWheel').onchange = (e) => { wheelCat = e.target.value; localStorage.setItem('cc_wheel_cat', wheelCat); renderWheelCats(); try { drawWheel(false); } catch { /* */ } saveShared({ wheel_cat: wheelCat }); };
document.addEventListener('cc:cute', (e) => saveShared({ cute_fx: !!e.detail }, true));
// ---- this device only ----
if (localStorage.getItem('cc_reduce_motion') === '1') document.body.classList.add('rm');
$('#setReduce').onchange = (e) => { localStorage.setItem('cc_reduce_motion', e.target.checked ? '1' : '0'); document.body.classList.toggle('rm', e.target.checked); window.CC_ambRefresh && CC_ambRefresh(); toast(e.target.checked ? 'Calmer animations on this device 🐢 (fully applies next time you open the app)' : 'Animations back on this device ✨', 3500); };
$$('#setRate button').forEach((b) => b.onclick = () => { localStorage.setItem('cc_chat_rate', b.dataset.v); if (typeof CH !== 'undefined') { CH.rate = Number(b.dataset.v); if (CH.audio) CH.audio.playbackRate = CH.rate; } renderSettingsUI(); });
async function offInfo() {
  let q = []; try { q = JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch { /* */ }
  let est = ''; try { const e = await navigator.storage?.estimate?.(); if (e && e.usage != null) est = ` · ~${fmtSize(e.usage)} stored`; } catch { /* */ }
  $('#offInfo').textContent = `Works offline: your recent stuff is kept on this device${est}.${q.length ? ` ${q.length} change${q.length > 1 ? 's' : ''} waiting to sync 🕓` : ' Everything is synced ✅'}`;
}
$$('#gearBtn').forEach((b) => b.addEventListener('click', () => setTimeout(offInfo, 50)));
offInfo();
$('#offClear').onclick = async () => {
  if (!await uiConfirm('Clear the offline copy on this device? Nothing shared is deleted — it just re-downloads. Unsynced changes are kept 🕓')) return;
  await kv.clear(); try { for (const k of await caches.keys()) if (/runtime|media/.test(k)) await caches.delete(k); } catch { /* */ }
  localStorage.removeItem('cc_signed'); S.signedUrls = {}; toast('Offline copy cleared 🧹'); offInfo();
};


// ================= THEMES (v19) =================
// theme + seasonal are shared couple settings; themes.js paints the cached one before first paint.
let thPreview = null;
function annivDate() {
  const ts = S.data.couple_settings?.[0]?.together_since; if (ts) return ts;
  const m = (S.data.milestones || []).find((x) => /anniv|together|first date|engag|wedding/i.test(x.title || '') && x.day); return m ? m.day : null;
}
function syncTheme(r) {
  if (!window.CC_applyTheme) return;
  CC_setSeason(r ? r.seasonal !== false : true, annivDate());
  const want = (r && r.theme) || (window.CC_defaultTheme ? CC_defaultTheme() : 'blush');
  if (thPreview) return; // don't yank a preview away; it resolves on apply/cancel
  if (CC_theme().id !== want) themeGo(want, r && r.created_by && r.created_by !== S.user?.id ? { x: innerWidth / 2, y: innerHeight / 3 } : null);
}
// cute transition: an accent bubble grows from the tap with the theme's mascot, colours cross-fade
function themeGo(id, at) {
  const t = (CC_THEMES.find((x) => x.id === id)) || CC_THEMES[0];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('cc_reduce_motion') === '1';
  const cute = localStorage.getItem('cc_cute_fx') !== '0';
  if (!reduce) { document.documentElement.classList.add('thFade'); setTimeout(() => document.documentElement.classList.remove('thFade'), 600); }
  if (at && !reduce && cute) {
    const f = document.createElement('div'); f.className = 'thFlash'; f.style.left = at.x + 'px'; f.style.top = at.y + 'px'; f.style.background = t.v.ac; f.innerHTML = `<b>${t.mascot}</b>`;
    document.body.appendChild(f); setTimeout(() => f.remove(), 800);
    setTimeout(() => window.FX && FX.burst(at.x, at.y, t.parts.slice(0, 4), 12, 90), 120);
  }
  CC_applyTheme(id, { preview: !!thPreview });
  renderThemePicker();
}
const TH_CATS = [['Colours', '🎨 Colours'], ['Animals', '🐾 Animals'], ['Stories', '📖 Stories'], ['Series', '📺 Series'], ['Movies', '🎬 Movies'], ['Animations', '🎨 Animations'], ['Anime', '🌸 Anime'], ['Spooky', '🎃 Spooky'], ['Seasonal', '🗓️ Seasonal']];
const thUI = { open: false, sec: {} };
function thMock(t, big) {
  const v = t.v, vars = `--bg:${v.bg};--cd:${v.cd};--tx:${v.tx};--mu:${v.mu};--ac:${v.ac};--on:${v.on};--ac2:${v.ac2};--ac3:${v.ac3};--sf:${v.sf};--bubA:${v.bubA || v.ac2}`;
  const hero = t.logo ? `<img src="${t.logo}" alt="" loading="lazy">` : t.word ? `<b style="font-family:${t.word.f};color:${t.word.c}">${esc(t.word.t)}</b>` : `<b>${t.em}</b>`;
  const pic = t.pics ? `<span class="mkPic" style="background-image:url('themes/${t.id}/1.webp')"></span>` : '';
  return `<span class="mk${big ? ' big' : ''}" style="${vars}"><span class="mkBg"></span>${pic}<span class="mkHero">${hero}</span>
    <span class="mkCard"><i></i><i></i></span><span class="mkThem">${t.parts[0]}</span><span class="mkMe">💕</span><span class="mkBtn"></span></span>`;
}
function renderThemePicker() {
  const g = $('#thGrid'); if (!g || !window.CC_THEMES) return;
  const saved = (shRow() && shRow().theme) || (window.CC_defaultTheme ? CC_defaultTheme() : 'blush'), cur = CC_theme().id, sp = window.CC_seasonPreviewing ? CC_seasonPreviewing() : null;
  const T = CC_THEMES.find((x) => x.id === saved) || CC_THEMES[0];
  const card = (t) => `<button class="thP${t.id === saved ? ' on' : ''}${thPreview && t.id === cur ? ' prev' : ''}" data-th="${t.id}" aria-label="${esc(t.name)} theme">${thMock(t)}<span class="pn">${esc(t.name)}</span>${t.id === saved ? '<span class="ck">✓</span>' : ''}</button>`;
  const sCard = (s) => `<button class="thP thS${sp === s.id ? ' prev' : ''}" data-season="${s.id}" aria-label="${esc(s.name)} overlay"><span class="sv sv-${s.id}"><b>${s.art.join('')}</b></span><span class="pn">${esc(s.name)}</span></button>`;
  const key = [saved, cur, !!thPreview, sp, CC_THEMES.length].join('|');
  if (g.dataset.k !== key) {
    const secs = TH_CATS.map(([c, lab]) => {
      const list = c === 'Seasonal' ? (window.CC_seasonList ? CC_seasonList() : []) : CC_THEMES.filter((t) => t.cat === c);
      const n = list.length, has = c !== 'Seasonal' && list.some((t) => t.id === saved);
      return `<div class="thSec${thUI.sec[c] ? ' open' : ''}" data-sec="${c}"><button class="thSecH" aria-expanded="${!!thUI.sec[c]}"><span>${lab}</span><small>${has ? '✓ ' : ''}${n}</small><i>▾</i></button>
        <div class="thSecB"><div class="thSecI">${c === 'Seasonal' ? '<div class="thSeasonTgl"></div>' : ''}<div class="thRow">${(c === 'Seasonal' ? list.map(sCard) : list.map(card)).join('')}</div></div></div></div>`;
    }).join('');
    const keep = $('#setSeason')?.closest('label'); if (keep && g.contains(keep)) $('#thCard').appendChild(keep);
    g.innerHTML = `<div class="thNow">${card(T)}<div class="thNowTx"><b>${esc(T.name)} ${T.em}</b><small>${esc(T.cat)}</small>
      <button class="thTog" id="thToggle" aria-expanded="${thUI.open}">Change theme <i>▾</i></button></div></div>
      <div class="thAcc${thUI.open ? ' open' : ''}"><div class="thAccI">${secs}</div></div>`;
    g.dataset.k = key;
    const tg = $('#setSeason')?.closest('label'); const slot = g.querySelector('.thSeasonTgl'); if (tg && slot) slot.appendChild(tg);
  }
  const si = window.CC_seasonInfo ? CC_seasonInfo() : { on: true }; $('#setSeason').checked = shared('seasonal', true);
  $('#seasonNow').textContent = si.current && !sp ? `Right now: ${si.current.name}` : "Valentine's, Ramadan & Eid, winter snow and our anniversary week — on top of any theme";
  const r = shRow(), tn = T.name;
  $('#thBy').textContent = r && r.theme ? `${tn} · picked by ${r.created_by === S.user?.id ? 'you' : partnerName()}` : 'Blush pink is our default 🌸';
}
let thSeasonPrev = null;
$('#thGrid').addEventListener('click', (e) => {
  const g = $('#thGrid');
  if (e.target.closest('#thToggle')) { thUI.open = !thUI.open; g.querySelector('.thAcc').classList.toggle('open', thUI.open); e.target.closest('#thToggle').setAttribute('aria-expanded', thUI.open); return; }
  const h = e.target.closest('.thSecH');
  if (h) { const sec = h.parentElement, c = sec.dataset.sec; thUI.sec[c] = !thUI.sec[c]; sec.classList.toggle('open', thUI.sec[c]); h.setAttribute('aria-expanded', thUI.sec[c]); return; }
  const sb = e.target.closest('.thS[data-season]');
  if (sb) {
    const id = sb.dataset.season; if (thPreview) themeEndPreview();
    thSeasonPrev = id; CC_previewSeason(id); g.dataset.k = ''; renderThemePicker();
    const s = CC_seasonList().find((x) => x.id === id); $('#thBarTxt').textContent = `Previewing ${s.name} — it appears by itself on its dates`; $('#thApply').textContent = 'Keep sprinkles on ✨'; $('#thBar').classList.remove('hidden'); return;
  }
  const b = e.target.closest('[data-th]'); if (!b) return; const id = b.dataset.th, saved = (shRow() && shRow().theme) || (window.CC_defaultTheme ? CC_defaultTheme() : 'blush');
  if (b.closest('.thNow')) { thUI.open = true; g.querySelector('.thAcc').classList.add('open'); return; }
  if (thSeasonPrev) seasonEndPreview();
  const rc = b.getBoundingClientRect(), at = { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 };
  if (id === saved) { thPreview = null; $('#thBar').classList.add('hidden'); return themeGo(id, null); }
  thPreview = id; themeGo(id, at); $('#thApply').textContent = 'Apply for both 💕';
  const t = CC_THEMES.find((x) => x.id === id); $('#thBarTxt').textContent = `Previewing ${t.name} ${t.em}`; $('#thBar').classList.remove('hidden');
});
function seasonEndPreview() { if (!thSeasonPrev) return; thSeasonPrev = null; CC_previewSeason(null); $('#thBar').classList.add('hidden'); $('#thGrid').dataset.k = ''; renderThemePicker(); }
function themeEndPreview() { if (thSeasonPrev) return seasonEndPreview(); if (!thPreview) return; thPreview = null; $('#thBar').classList.add('hidden'); themeGo((shRow() && shRow().theme) || (window.CC_defaultTheme ? CC_defaultTheme() : 'blush'), null); }
$('#thCancel').onclick = themeEndPreview;
$('#thApply').onclick = () => {
  if (thSeasonPrev) { seasonEndPreview(); CC_setSeason(true, annivDate()); saveShared({ seasonal: true }); toast('Seasonal sprinkles on ✨', 2500); return renderThemePicker(); }
  const id = thPreview; if (!id) return; thPreview = null; $('#thBar').classList.add('hidden');
  const t = CC_THEMES.find((x) => x.id === id); CC_applyTheme(id); saveShared({ theme: id }, true);
  toast(`${t.name} ${t.em} — on both phones now 💕`, 3000); hearts(8); window.FX && FX.confetti(40); renderThemePicker();
};
// the preview survives tab switches so you can look around; the bar stays until Apply/Cancel
$('#setSeason').onchange = (e) => { CC_setSeason(e.target.checked, annivDate()); saveShared({ seasonal: e.target.checked }); renderThemePicker(); };


// ================= ADD TO HOME SCREEN GUIDE (v19) =================
const INST = { prompt: null, snoozeKey: 'cc_inst_snooze', doneKey: 'cc_installed', shownThisOpen: false };
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); INST.prompt = e; if (!$('#instGuide').classList.contains('hidden')) instRender(); });
addEventListener('appinstalled', () => { instClose(); toast('Installed 📲 now open For Us from your Home Screen 💕', 4000); }); // stops for good once opened from the icon (standalone)
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
function instPlatform() {
  const ua = navigator.userAgent, ios = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|Instagram|FBAN|FBAV|Line\//.test(ua) ? 'ios-other' : (/iPad/.test(ua) || !/iPhone|iPod/.test(ua) ? 'ipad' : 'ios');
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}
const SHARE_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
function instRender() {
  const p = instPlatform(), pn = S.partner ? partnerName() : 'your love';
  const steps = {
    ios: `<div class="igPhone"><div class="igScreen">💕 For Us</div><div class="igBar"><span>‹</span><span>›</span><span class="igShare">${SHARE_SVG}</span><span>📖</span><span>⧉</span></div><div class="igArrow down">⬇</div></div>
      <ol class="igSteps"><li>Tap the <b>Share</b> button <span class="igIc">${SHARE_SVG}</span> at the bottom of Safari</li><li>Scroll down and tap <b>Add to Home Screen</b> <span class="igIc">➕</span></li><li>Tap <b>Add</b> — then open For Us from the new icon 💕</li></ol>`,
    ipad: `<div class="igPhone wide"><div class="igBar top"><span>‹ ›</span><span class="igUrl">for-us</span><span class="igShare">${SHARE_SVG}</span></div><div class="igArrow up right">⬆</div><div class="igScreen">💕 For Us</div></div>
      <ol class="igSteps"><li>Tap <b>Share</b> <span class="igIc">${SHARE_SVG}</span> at the top-right of Safari</li><li>Tap <b>Add to Home Screen</b> <span class="igIc">➕</span></li><li>Tap <b>Add</b> and open For Us from the icon 💕</li></ol>`,
    'ios-other': `<div class="igBig">🧭</div><ol class="igSteps"><li>On iPhone, only <b>Safari</b> can add apps to the Home Screen</li><li>Tap <b>Copy link</b> below, open <b>Safari</b> and paste it</li><li>Then: Share <span class="igIc">${SHARE_SVG}</span> → <b>Add to Home Screen</b></li></ol>
      <button class="soft" id="igCopy">🔗 Copy link</button>`,
    android: (INST.prompt ? `<button id="igInstall" class="igInstall">📲 Install For Us</button><p class="muted">One tap, no app store needed ✨</p>` : '') +
      `<div class="igPhone"><div class="igBar top"><span class="igUrl">for-us</span><span class="igDots">⋮</span></div><div class="igArrow up right">⬆</div><div class="igScreen">💕 For Us</div></div>
      ${INST.prompt ? '<p class="muted small">…or do it by hand:</p>' : ''}<ol class="igSteps"><li>Tap the menu <b>⋮</b> at the top-right of Chrome</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b>)</li><li>Tap <b>Install</b> — For Us appears with your apps 💕</li></ol>`,
    desktop: (INST.prompt ? `<button id="igInstall" class="igInstall">💻 Install For Us</button>` : '') +
      `<div class="igPhone wide"><div class="igBar top"><span class="igUrl">for-us</span><span class="igShare">⊕</span><span>⋮</span></div><div class="igArrow up right">⬆</div><div class="igScreen">💕 For Us</div></div>
      <ol class="igSteps"><li>Click the <b>install icon</b> <span class="igIc">⊕</span> at the right end of the address bar</li><li>No icon? Open the browser menu <b>⋮</b> → <b>Install For Us</b> / <b>Apps → Install</b></li><li>It opens in its own window, like a real app 💕</li></ol>`,
  }[p];
  $('#igBody').innerHTML = `<div class="igMascot">${window.CC_theme ? CC_theme().mascot : '🧸'}📲</div><h2>Add For Us to your Home Screen</h2>
    <p class="muted">Keep ${esc(pn)} one tap away 💕</p>
    <div class="igPerks"><span>🔔<b>Notifications</b><small>${p.startsWith('ios') || p === 'ipad' ? 'iPhone needs this for push' : 'hugs & messages pop up'}</small></span><span>📶<b>Offline</b><small>opens with no signal</small></span><span>📱<b>Full screen</b><small>no browser bars</small></span></div>
    <div class="igHow" data-p="${p}">${steps}</div>`;
  const ib = $('#igInstall'); if (ib) ib.onclick = async () => { const e = INST.prompt; if (!e) return; INST.prompt = null; e.prompt(); try { const r = await e.userChoice; if (r.outcome === 'accepted') instClose(); else instRender(); } catch { instRender(); } };
  const cp = $('#igCopy'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(location.origin + location.pathname); toast('Link copied 🔗 now paste it in Safari'); } catch { uiPrompt('Copy this link and open it in Safari 🧭', location.origin + location.pathname); } };
}
function instOpen() { instRender(); $('#instGuide').classList.remove('hidden'); requestAnimationFrame(() => $('#instGuide').classList.add('in')); }
function instClose() { $('#instGuide').classList.remove('in'); $('#instGuide').classList.add('hidden'); }
window.CC_maybeInstall = () => {
  if (isStandalone() || localStorage.getItem(INST.doneKey) === '1') return;
  if (Date.now() < Number(localStorage.getItem(INST.snoozeKey) || 0)) return;
  if (document.querySelector('.uiDlg,#modal:not(.hidden),#story:not(.hidden),#heartOverlay:not(.hidden)')) return void setTimeout(window.CC_maybeInstall, 8000);
  if (!$('#instGuide').classList.contains('hidden') || INST.shownThisOpen) return;
  INST.shownThisOpen = true; // once per app open/login (show() can fire several times)
  localStorage.removeItem('cc_new_signup'); instOpen();
};
// shown on every login/app open outside the installed app; "Later" = 1 day. Only opening from the Home Screen stops it for good.
$('#igLater').onclick = () => { localStorage.setItem(INST.snoozeKey, String(Date.now() + 864e5)); instClose(); toast("Okay! I'll remind you tomorrow 💤"); };
$('#instGuide').addEventListener('click', (e) => { if (e.target.id === 'instGuide') $('#igLater').click(); });
$('#howInstall').onclick = instOpen;
if (isStandalone()) localStorage.setItem(INST.doneKey, '1');

// ================= CHAT (v17) =================
const CH = { list: [], byId: {}, more: true, loading: false, ch: null, replyTo: null, urls: {}, lastTyping: 0, typingT: null, fresh: new Set(), audio: null, playing: null, rate: +(localStorage.getItem('cc_chat_rate') || 1), ready: false, newBelow: 0, unreadServer: 0, saveT: null, markT: null };
const CH_REACTS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];
const CH_PAGE = 40, CH_MAX = 50 * 1024 * 1024;
try { CH.urls = JSON.parse(localStorage.getItem('cc_chat_signed') || '{}'); } catch { CH.urls = {}; }
const chOpen = () => !$('#tab-chat').classList.contains('hidden') && !document.hidden;
const chMine = (m) => m.sender === S.user.id;
const chUrl = (p) => (p && CH.urls[p] ? CH.urls[p].url : '');
const fmtDur = (s) => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const hhmm = (d) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
function dayLabel(d) { const x = new Date(d), t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1); if (x.toDateString() === t.toDateString()) return 'Today'; if (x.toDateString() === y.toDateString()) return 'Yesterday'; return x.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: x.getFullYear() === t.getFullYear() ? undefined : 'numeric' }); }
const chText = (m) => (m && m._pt != null ? m._pt : (window.FU_isEnc && FU_isEnc(m && m.body) ? '🔒 Locked message' : (m && m.body) || ''));
function chPreview(m) {
  if (!m) return ''; if (m.deleted) return '🚫 Deleted message';
  return { text: chText(m), image: '📷 Photo', video: '🎬 Video', voice: `🎤 Voice message (${fmtDur(m.duration)})`, videonote: '⭕ Video message', file: `📎 ${m.media_name || 'File'}` }[m.kind] + (m.kind !== 'text' && m.body ? ' · ' + m.body : '');
}
async function chSign(paths) {
  const need = [...new Set(paths.filter(Boolean))].filter((p) => !CH.urls[p] || CH.urls[p].exp < Date.now());
  if (!need.length || !navigator.onLine) return;
  const { data } = await sb.storage.from('chat').createSignedUrls(need, 3600 * 12);
  (data || []).forEach((d) => { if (d.signedUrl) CH.urls[d.path] = { url: d.signedUrl, exp: Date.now() + 3600 * 11 * 1000 }; });
  const keep = Object.entries(CH.urls).sort((a, b) => b[1].exp - a[1].exp).slice(0, 400);
  CH.urls = Object.fromEntries(keep); try { localStorage.setItem('cc_chat_signed', JSON.stringify(CH.urls)); } catch { /* full */ }
}
function chIdx() { CH.byId = {}; CH.list.forEach((m) => { CH.byId[m.id] = m; }); }
function chSort() { CH.list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); chIdx(); }
function chSaveCache() { clearTimeout(CH.saveT); CH.saveT = setTimeout(() => { if (!S.couple) return; cacheSet('chat:' + S.couple.id, CH.list.slice(-120).map((m) => { const { _local, _pt, _dec, ...r } = m; return r; })); }, 400); }
function chMerge(rows) { rows.forEach((r) => { const old = CH.byId[r.id]; if (old) Object.assign(old, r, { _pending: false, _queued: false, _failed: false }); else CH.list.push(r); }); chSort(); }

// ---- rendering ----
const linkify = (h) => h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
const emojiOnly = (s) => s && s.length <= 24 && /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u200D|\s)+$/u.test(s);
function waveBars(m) { const w = (m.meta && Array.isArray(m.meta.wave) && m.meta.wave.length) ? m.meta.wave : Array.from({ length: 36 }, (_, i) => .3 + .25 * Math.abs(Math.sin(i * 1.7 + (m.id || '').length))); return w.map((v) => `<i style="height:${Math.round(12 + Math.min(1, v) * 88)}%"></i>`).join(''); }
const chKind = (m) => (m.kind === 'file' && /^image\//.test(m.media_type || '') && !/heic|heif/.test(m.media_type || '') ? 'image' : m.kind === 'file' && /^video\//.test(m.media_type || '') ? 'video' : m.kind);
function chBody(m) {
  if (m.deleted) return `<div class="chDel">🚫 This message was deleted</div>`;
  const url = m._local || chUrl(m.media_path); const cap = m.body ? `<div class="chCap">${linkify(esc(m.body))}</div>` : '';
  const up = m._uploading ? '<div class="chUp"><span></span>sending…</div>' : '';
  switch (chKind(m)) {
    case 'image': return `<div class="chMedia" data-view="${m.id}">${url ? `<img src="${esc(url)}" alt="photo" loading="lazy">` : '<div class="chPh">📷</div>'}${up}</div>${cap}`;
    case 'video': return `<div class="chMedia" data-view="${m.id}">${url ? `<video src="${esc(url)}#t=0.1" preload="metadata" playsinline muted></video>` : '<div class="chPh">🎬</div>'}<span class="chPlay">▶</span><span class="chDur">${fmtDur(m.duration)}</span>${up}</div>${cap}`;
    case 'voice': return `<div class="chVoice" data-voice="${m.id}"><button class="vp" aria-label="Play">▶</button><div class="vw">${waveBars(m)}</div><span class="vt">${fmtDur(m.duration)}</span><button class="vs">${CH.rate}×</button>${up}</div>`;
    case 'videonote': return `<div class="chRound" data-round="${m.id}">${url ? `<video src="${esc(url)}#t=0.1" preload="metadata" playsinline></video>` : '<div class="chPh">⭕</div>'}<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48"/></svg><span class="chDur">${fmtDur(m.duration)}</span><span class="chPlay">▶</span>${up}</div>`;
    case 'file': return `<a class="chFileC" data-file="${m.id}"><span class="fi">📄</span><div><b>${esc(m.media_name || 'File')}</b><small>${m.media_size ? fmtSize(m.media_size) : ''}</small></div><span>⬇️</span>${up}</a>${cap}`;
    default: return `<div class="chTxt${emojiOnly(chText(m)) ? ' big' : ''}${m._pt == null && window.FU_isEnc && FU_isEnc(m.body) ? ' locked' : ''}">${linkify(esc(chText(m)))}</div>`;
  }
}
function chTicks(m) {
  if (!chMine(m)) return '';
  if (m._failed) return '<span class="tk fail">⚠️ tap to retry</span>';
  if (m._queued || m._pending) return '<span class="tk">🕓</span>';
  if (m.read_at && shared('chat_receipts', true)) return '<span class="tk read">✓✓</span>'; if (m.delivered_at) return '<span class="tk">✓✓</span>'; return '<span class="tk">✓</span>';
}
function chMsgHtml(m, prev, next) {
  const mine = chMine(m); let h = '';
  if (!prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()) h += `<div class="chDay"><span>${dayLabel(m.created_at)}</span></div>`;
  const grpPrev = prev && prev.sender === m.sender && new Date(m.created_at) - new Date(prev.created_at) < 300000 && !h;
  const grpNext = next && next.sender === m.sender && new Date(next.created_at) - new Date(m.created_at) < 300000 && new Date(next.created_at).toDateString() === new Date(m.created_at).toDateString();
  const q = m.reply_to ? CH.byId[m.reply_to] : null;
  const cx = !m.reply_to && m.meta && m.meta.ctx; const quote = cx ? `<div class="chQuote ctx"><b>${esc(cx.who)}</b><span>${esc(cx.text)}</span></div>` : m.reply_to ? `<div class="chQuote" data-jump="${m.reply_to}"><b>${q ? (chMine(q) ? 'You' : esc(partnerName())) : '↩︎'}</b><span>${esc(q ? chPreview(q) : 'Earlier message')}</span></div>` : '';
  const rx = Object.values(m.reactions || {}); const rc = {}; rx.forEach((e) => { rc[e] = (rc[e] || 0) + 1; });
  const rxH = rx.length ? `<div class="chRx">${Object.entries(rc).map(([e, n]) => `<span class="${(m.reactions || {})[S.user.id] === e ? 'me' : ''}">${e}${n > 1 ? n : ''}</span>`).join('')}</div>` : '';
  const bare = !m.deleted && (m.kind === 'videonote' || (m.kind === 'text' && emojiOnly(chText(m))));
  h += `<div class="chRow ${mine ? 'me' : 'them'}${grpPrev ? ' gp' : ''}${grpNext ? ' gn' : ''}${CH.fresh.has(m.id) ? ' fresh' : ''}" data-id="${m.id}">
    <div class="chB${bare ? ' bare' : ''} k-${m.kind}${m.deleted ? ' del' : ''}${m.meta && m.meta.greet && !m.deleted ? ' greet g-' + (m.meta.greet === 'morning' ? 'am' : 'pm') : ''}">${quote}${chBody(m)}<div class="chMeta">${hhmm(m.created_at)} ${chTicks(m)}</div></div>${rxH}</div>`;
  return h;
}
function chPatch(box) {
  if (!box.querySelector(':scope > .chU')) box.innerHTML = '';
  const old = {}; box.querySelectorAll(':scope > .chU').forEach((n) => { old[n.dataset.u] = n; });
  let at = box.firstChild;
  CH.list.forEach((m, i) => {
    const html = chMsgHtml(m, CH.list[i - 1], CH.list[i + 1]); const key = html.replace(' fresh', '');
    let n = old[m.id];
    if (n) { delete old[m.id]; if (n.__k !== key) { n.innerHTML = html; n.__k = key; } } // update in place, never detach the anchor
    else { n = document.createElement('div'); n.className = 'chU'; n.dataset.u = m.id; n.innerHTML = html; n.__k = key; }
    if (n !== at) box.insertBefore(n, at); else at = at.nextSibling;
  });
  Object.values(old).forEach((n) => n.remove());
}
function chRender(keep) {
  if (window.FU_decChat) window.FU_decChat(CH.list);
  const box = $('#chMsgs'), list = $('#chatList'); if (!box) return;
  const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 140;
  const prevH = list.scrollHeight, prevTop = list.scrollTop;
  if (!CH.ready && !CH.list.length) box.innerHTML = `<div class="chSkel">${[60, 40, 70, 35, 55].map((w, i) => `<div class="${i % 2 ? 'me' : ''}" style="width:${w}%"></div>`).join('')}</div>`;
  else if (!CH.list.length) box.innerHTML = `<div class="chEmpty"><div class="chEmHearts"><span>💗</span><span>💌</span><span>💕</span></div><h3>No messages yet</h3><p>Say hi to <b class="pname">${esc(partnerName())}</b> — your own little corner 💞</p><div class="chips">${['Hi love 💗', 'Miss you 🥺', 'Good morning ☀️', 'Thinking of you 💭'].map((t) => `<span data-quick="${esc(t)}">${t}</span>`).join('')}</div></div>`;
  else chPatch(box);
  $('#chTop').innerHTML = CH.list.length && CH.ready ? (CH.loading ? '<div class="chLoadMore">💗 loading older…</div>' : CH.more ? '' : '<div class="chBegin">✨ the beginning of our chat ✨</div>') : '';
  CH.fresh.clear();
  if (keep === 'top') list.scrollTop = prevTop + (list.scrollHeight - prevH);
  else if (keep === 'bottom' || nearBottom) list.scrollTop = list.scrollHeight;
  if (CH.playing) chVoiceUI(CH.playing);
}
function chBadge() {
  const n = CH.list.filter((m) => !chMine(m) && !m.read_at && !m.deleted).length || 0;
  const tot = Math.max(n, CH.unreadServer);
  const b = $('#chatBadge'); if (!b) return; const show = tot > 0 && !chOpen();
  b.textContent = tot > 99 ? '99+' : tot; b.classList.toggle('hidden', !show);
  if (show && window.FX) FX.pop(b);
}

// ---- loading ----
async function chatInit() {
  if (!S.couple) return; CH.list = []; CH.byId = {}; CH.more = true; CH.ready = false; chRender();
  const cached = await cacheGet('chat:' + S.couple.id);
  if (cached && cached.length) { CH.list = cached; chSort(); CH.ready = true; chRender('bottom'); }
  chSubscribe();
  await chSync(true); chUnreadCount();
}
// v21: reconcile with the server — always the latest page, merged by id; the offline cache never hides server rows
async function chSync(initial) {
  if (!S.couple) return;
  if (!navigator.onLine) { CH.ready = true; chRender(); chBadge(); return; }
  if (CH.syncing) { CH.syncAgain = initial ? 'i' : (CH.syncAgain || true); return; } CH.syncing = true;
  try {
    const { data, error } = await sb.from('messages').select('*').eq('couple_id', S.couple.id).order('created_at', { ascending: false }).limit(CH_PAGE);
    if (error || !Array.isArray(data)) throw error || new Error('no data');
    clearTimeout(CH.retryT); CH.retryN = 0; CH.lastSync = Date.now();
    const ids = new Set(data.map((d) => d.id)), oldest = data.length ? data[data.length - 1].created_at : null;
    // drop cached server rows inside the fetched window that the server no longer has (deleted elsewhere); keep pending/queued/failed
    CH.list = CH.list.filter((m) => m._pending || m._queued || m._failed || ids.has(m.id) || (oldest && data.length === CH_PAGE && m.created_at < oldest));
    chIdx(); const before = new Set(CH.list.map((m) => m.id));
    if (initial) CH.more = data.length === CH_PAGE;
    chMerge(data); await chSign(CH.list.map((m) => m.media_path)); CH.ready = true;
    const fresh = data.filter((d) => !before.has(d.id) && !chMine(d));
    const l = $('#chatList'), near = l && l.scrollHeight - l.scrollTop - l.clientHeight < 140;
    chRender(initial || near ? 'bottom' : undefined); chSaveCache(); chBadge(); chMarkSoon();
    if (!initial && fresh.length && !chOpen()) chUnreadCount();
  } catch (e) {
    CH.ready = true; chRender(); chBadge();
    CH.retryN = (CH.retryN || 0) + 1; clearTimeout(CH.retryT);
    CH.retryT = setTimeout(() => chSync(initial), Math.min(30000, 1500 * 2 ** Math.min(CH.retryN, 5)));
  } finally {
    CH.syncing = false; if (CH.syncAgain) { const i = CH.syncAgain === 'i'; CH.syncAgain = false; setTimeout(() => chSync(i), 50); }
  }
}
async function chLoadOlder() {
  if (!CH.more || CH.loading || !navigator.onLine || !CH.ready) return;
  const oldest = CH.list.find((m) => !m._pending && !m._queued); if (!oldest) return;
  CH.loading = true; chRender('top');
  const { data, error } = await sb.from('messages').select('*').eq('couple_id', S.couple.id).lt('created_at', oldest.created_at).order('created_at', { ascending: false }).limit(CH_PAGE);
  CH.loading = false; if (error) return chRender('top');
  CH.more = data.length === CH_PAGE; chMerge(data); await chSign(data.map((m) => m.media_path)); chRender('top');
}
async function chUnreadCount() {
  if (!navigator.onLine || !S.couple) return;
  const { count } = await sb.from('messages').select('id', { count: 'exact', head: true }).eq('couple_id', S.couple.id).neq('sender', S.user.id).is('read_at', null).eq('deleted', false);
  CH.unreadServer = count || 0; chBadge();
}
function chMarkSoon() {
  clearTimeout(CH.markT); CH.markT = setTimeout(async () => {
    if (!S.couple || !navigator.onLine) return; const read = chOpen() && shared('chat_receipts', true);
    const need = CH.list.some((m) => !chMine(m) && (!m.delivered_at || (read && !m.read_at)));
    if (!need && !(read && CH.unreadServer)) return;
    const { error } = await sb.rpc('chat_mark', { read });
    if (!error) { const now = new Date().toISOString(); CH.list.forEach((m) => { if (!chMine(m)) { m.delivered_at = m.delivered_at || now; if (read) m.read_at = m.read_at || now; } }); if (read) CH.unreadServer = 0; chBadge(); chSaveCache(); }
  }, 350);
}
function chSubscribe() {
  if (CH.ch) { sb.removeChannel(CH.ch); CH.ch = null; }
  CH.ch = sb.channel('chat-' + S.couple.id, { config: { broadcast: { self: false } } })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `couple_id=eq.${S.couple.id}` }, async (p) => {
      if (p.eventType === 'DELETE') { CH.list = CH.list.filter((m) => m.id !== p.old.id); chIdx(); chRender(); return; }
      const r = p.new; const isNew = !CH.byId[r.id];
      if (isNew) CH.fresh.add(r.id);
      chMerge([r]); if (r.media_path) await chSign([r.media_path]);
      const list = $('#chatList'); const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 140;
      chRender(isNew && chMine(r) ? 'bottom' : undefined); chSaveCache();
      if (isNew && !chMine(r)) {
        hideTyping(); if (!TP('sound', 'recv')) snd('pop'); if (navigator.vibrate && chOpen()) navigator.vibrate(TP('buzz', 'recv') || 20);
        if (!chOpen()) { CH.unreadServer++; toast(`${partnerEmoji()} ${partnerName()}: ${chPreview(r).slice(0, 60)}`, 3500); }
        else if (!nearBottom) { CH.newBelow++; chDownBtn(); }
        chMarkSoon();
      }
      chBadge();
    })
    .on('broadcast', { event: 'typing' }, (p) => { if (p.payload && p.payload.uid !== S.user.id && shared('chat_typing', true)) showTyping(); });
  const me = CH.ch;
  me.subscribe((status) => {
    if (CH.ch !== me) return; CH.rtStatus = status;
    if (status === 'SUBSCRIBED') { CH.rtFails = 0; chSync(); } // catch anything missed while the socket was down
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      CH.rtFails = (CH.rtFails || 0) + 1; clearTimeout(CH.rtT);
      CH.rtT = setTimeout(() => { if (CH.ch === me && S.couple) chSubscribe(); }, Math.min(30000, 1000 * 2 ** Math.min(CH.rtFails, 5)));
      chSync();
    }
  });
}
// fallback poll: every 12s while Chat is open & visible, every 60s otherwise (cheap: one indexed query)
setInterval(() => {
  if (!S.couple || !CH.ready || document.hidden) return; const age = Date.now() - (CH.lastSync || 0);
  if (chOpen() ? age > 11000 : age > 59000) chSync();
}, 4000);
function showTyping() {
  $('#chTyping').classList.remove('hidden'); $('#chtStatus').textContent = 'typing…'; $('#chtStatus').classList.add('typing');
  const l = $('#chatList'); if (l.scrollHeight - l.scrollTop - l.clientHeight < 160) l.scrollTop = l.scrollHeight;
  clearTimeout(CH.typingT); CH.typingT = setTimeout(hideTyping, 3500);
}
function hideTyping() { $('#chTyping').classList.add('hidden'); $('#chtStatus').textContent = (window.FU_chatStatus && FU_chatStatus()) || 'our little corner 💞'; $('#chtStatus').classList.remove('typing'); }
function chDownBtn() { const n = CH.newBelow; $('#chDownN').textContent = n ? n : ''; }

// ---- sending ----
async function chInsert(m) {
  const row = {}; ['id', 'kind', 'body', 'media_path', 'media_type', 'media_name', 'media_size', 'duration', 'meta', 'reply_to'].forEach((k) => { if (m[k] !== undefined && m[k] !== null) row[k] = m[k]; });
  const locked = m.kind === 'text' && row.body && window.FU_lockOn && FU_lockOn();
  if (locked) {
    if (m._pt == null) m._pt = row.body;
    try { row.body = await FU_enc(m._pt); } catch (e) { m._failed = true; m._pending = false; chRender(); toast('🔒 Unlock our chat to send (Settings → Private lock)'); return; }
    m.body = row.body;
  }
  const r = await sb.from('messages').insert(row);
  if (r.queued) { m._queued = true; m._pending = false; }
  else if (r.error) { m._failed = true; m._pending = false; toast('Message failed: ' + errMsg(r.error)); }
  else { m._pending = false; }
  chRender(); chSaveCache();
  if (!r.error) notify('chat', locked ? '🔒 sent you a message' : chPreview(m).slice(0, 100));
  if (!r.error && !r.queued && (m.kind === 'image' || m.kind === 'video')) setTimeout(() => loadTable('photos'), 400); // DB trigger mirrors it into Photos
}
function chAddLocal(fields) {
  const m = { id: crypto.randomUUID(), couple_id: S.couple.id, sender: S.user.id, created_at: new Date().toISOString(), reactions: {}, meta: {}, deleted: false, reply_to: CH.replyTo || null, _pending: true, ...fields };
  CH.list.push(m); CH.byId[m.id] = m; CH.fresh.add(m.id); chSetReply(null); chRender('bottom'); return m;
}
async function chSendText(text) {
  const body = (text ?? $('#chTxt').value).trim(); if (!body || !S.couple) return;
  if (window.FU_lockOn && FU_lockOn() && !FU_hasKey()) { FU_unlock(); return; }
  if (text === undefined) { $('#chTxt').value = ''; chAutosize(); chComposeState(); }
  snd('pop'); const ctx = CH.ctx; const m = chAddLocal({ kind: 'text', body: body.slice(0, 4000), ...(ctx ? { meta: { ctx: { who: ctx.who, text: ctx.text.slice(0, 140) } } } : {}) }); CH.ctx = null; await chInsert(m);
}
const extOf = (type, name) => { const n = (name || '').match(/\.([a-z0-9]{1,8})$/i); if (n) return n[1].toLowerCase(); return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/webm': 'webm', 'audio/ogg': 'ogg' })[(type || '').split(';')[0]] || 'bin'; };
async function chSendMedia(blob, kind, extra = {}) {
  if (!S.couple) return;
  if (!navigator.onLine) return toast('Photos, videos & voice need internet 📶 — texts still work offline');
  if (blob.size > CH_MAX) return toast(`That's too big (${fmtSize(blob.size)}) — max 50 MB 🥺`);
  if (kind === 'file' && blob.size > 25 * MB) return toast(`Files can be up to 25 MB 🥺 (this one is ${fmtSize(blob.size)})`);
  if (!(await mediaGuard(blob.size))) return;
  const type = (blob.type || 'application/octet-stream').split(';')[0];
  const local = URL.createObjectURL(blob);
  const m = chAddLocal({ kind, media_type: type, media_size: blob.size, _local: local, _uploading: true, ...extra });
  const path = `${S.couple.id}/${S.user.id}/${m.id}.${extOf(type, extra.media_name)}`;
  const { error } = await sb.storage.from('chat').upload(path, blob, { contentType: type, upsert: false, cacheControl: '31536000' });
  m._uploading = false;
  if (error) { m._failed = true; m._blob = blob; chRender(); return toast('Upload failed: ' + errMsg(error)); }
  m.media_path = path; CH.urls[path] = { url: local, exp: Date.now() + 3600 * 1000 }; // show local copy until re-signed
  await chInsert(m); delete CH.urls[path]; chSign([path]); STORE.at = 0;
}
async function chRetry(m) {
  m._failed = false; m._pending = true; chRender();
  if (m.media_path || m.kind === 'text') return chInsert(m);
  if (m._blob) { CH.list = CH.list.filter((x) => x !== m); chIdx(); return chSendMedia(m._blob, m.kind, { duration: m.duration, meta: m.meta, media_name: m.media_name, body: m.body }); }
}
async function chHandleFiles(files, asFile) {
  for (const f of [...files]) {
    const media = /^(image|video)\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif|gif|mp4|mov|m4v)$/i.test(f.name || '');
    if (media) asFile = false;
    if (!asFile && (f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name || '')) && f.type !== 'image/gif') { try { const b = await smartImage(f); await chSendMedia(b, 'image'); } catch { await chSendMedia(f, 'image'); } }
    else if (!asFile && (f.type.startsWith('video/') || /\.(mp4|mov|m4v)$/i.test(f.name || ''))) {
      if (!navigator.onLine) { toast('Videos need internet 📶'); continue; }
      if (!(await mediaGuard(Math.min(f.size, 25 * MB)))) return;
      const v = await prepVideo(f, (p) => toast(`Shrinking video for you… ${Math.round(p * 100)}% 🪄`, 1500)); if (!v) continue;
      await chSendMedia(v.blob, 'video', { duration: v.duration });
    }
    else if (!asFile && f.type === 'image/gif') await chSendMedia(f, 'image');
    else await chSendMedia(f, 'file', { media_name: f.name.slice(0, 200) });
  }
}
function mediaDuration(blob) { return new Promise((res) => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { res(isFinite(v.duration) ? Math.round(v.duration * 10) / 10 : null); URL.revokeObjectURL(v.src); }; v.onerror = () => res(null); v.src = URL.createObjectURL(blob); setTimeout(() => res(null), 4000); }); }

// ---- composer ----
function chAutosize() { const t = $('#chTxt'); t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; }
function chComposeState() { const has = !!$('#chTxt').value.trim(); $('#chCompose').classList.toggle('has', has); $('#chSend').tabIndex = has ? 0 : -1; }
$('#chTxt').addEventListener('input', () => {
  chAutosize(); chComposeState();
  if (CH.ch && shared('chat_typing', true) && Date.now() - CH.lastTyping > 2000) { CH.lastTyping = Date.now(); CH.ch.send({ type: 'broadcast', event: 'typing', payload: { uid: S.user.id } }); }
});
$('#chTxt').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window) && shared('chat_enter_send', true)) { e.preventDefault(); if ($('#chTxt').value.trim() && window.CC_sendFx) CC_sendFx($('#chSend')); chSendText(); } });
$('#chSend').onclick = () => { if (navigator.vibrate) navigator.vibrate(TP('buzz', 'send') || 8); TP('sound', 'send'); if (window.CC_sendFx) CC_sendFx($('#chSend')); chSendText(); $('#chTxt').focus(); };
$('#chSend').addEventListener('pointerdown', (e) => e.preventDefault()); // keep the keyboard open on tap
$('#chPlus').onclick = () => { $('#chAttach').classList.toggle('hidden'); $('#chPlus').classList.toggle('on'); };
['chGal', 'chCam', 'chCamV'].forEach((id) => { $('#' + id).onchange = (e) => { const f = e.target.files; $('#chAttach').classList.add('hidden'); $('#chPlus').classList.remove('on'); if (f && f.length) chHandleFiles(f); e.target.value = ''; }; });
$('#chFile').onchange = (e) => { const f = e.target.files; $('#chAttach').classList.add('hidden'); $('#chPlus').classList.remove('on'); if (f && f.length) chHandleFiles(f, true); e.target.value = ''; };
function chSetCtx(ctx) {
  CH.ctx = ctx || null; CH.replyTo = null; $('#chReply').classList.toggle('hidden', !ctx);
  if (ctx) { $('#chReplyWho').textContent = ctx.who; $('#chReplyTxt').textContent = ctx.text.slice(0, 90); }
}
function chSetReply(id) {
  if (id || CH.ctx) CH.ctx = null;
  CH.replyTo = id; const m = id && CH.byId[id]; $('#chReply').classList.toggle('hidden', !m);
  if (m) { $('#chReplyWho').textContent = chMine(m) ? 'Replying to yourself' : `Replying to ${partnerName()}`; $('#chReplyTxt').textContent = chPreview(m).slice(0, 90); $('#chTxt').focus(); }
}
$('#chReplyX').onclick = () => chSetReply(null);
$('#chatList').addEventListener('scroll', () => {
  const l = $('#chatList'); if (l.scrollTop < 120) chLoadOlder();
  const far = l.scrollHeight - l.scrollTop - l.clientHeight > 300; $('#chDown').classList.toggle('hidden', !far);
  if (!far && CH.newBelow) { CH.newBelow = 0; chDownBtn(); }
}, { passive: true });
$('#chDown').onclick = () => { const l = $('#chatList'); l.scrollTo({ top: l.scrollHeight, behavior: 'smooth' }); CH.newBelow = 0; chDownBtn(); };

// ---- message interactions ----
let lpT = null, lpStart = null, lastTap = { id: null, t: 0 };
const SW = { row: null, dx: 0, on: false, hit: false, pid: null, ic: null };
const SW_MAX = 88, SW_HIT = 56;
const swIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 7 4.5 12l5 5"/><path d="M5 12h9a5.5 5.5 0 0 1 5.5 5.5V19"/></svg>';
function swReset(fire) {
  const r = SW.row; if (!r) return; const id = r.dataset.id;
  r.classList.remove('swiping', 'swiped'); r.classList.add('snap'); r.style.transform = '';
  if (SW.ic) { SW.ic.style.opacity = '0'; SW.ic.style.transform = 'scale(.4)'; const ic = SW.ic; setTimeout(() => ic.remove(), 380); }
  setTimeout(() => r.classList.remove('snap'), 400);
  Object.assign(SW, { row: null, dx: 0, on: false, hit: false, pid: null, ic: null });
  if (fire) { const m = CH.byId[id]; if (m && !m.deleted && !m._pending) chSetReply(id); }
}
$('#chMsgs').addEventListener('pointerdown', (e) => {
  const row = e.target.closest('.chRow'); if (!row || e.button > 0) return; lpStart = [e.clientX, e.clientY];
  SW.row = row; SW.pid = e.pointerId; SW.on = false; SW.dx = 0;
  clearTimeout(lpT); lpT = setTimeout(() => { lpT = null; if (!SW.on) { SW.row = null; chMenu(row.dataset.id); } }, 450);
});
$('#chMsgs').addEventListener('pointermove', (e) => {
  if (!lpStart || !SW.row || e.pointerId !== SW.pid) return;
  const dx = e.clientX - lpStart[0], dy = e.clientY - lpStart[1];
  if (!SW.on) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { clearTimeout(lpT); lpT = null; SW.row = null; return; }
    if (dx > 10 && dx > Math.abs(dy) * 1.4) {
      clearTimeout(lpT); lpT = null; SW.on = true; SW.row.classList.add('swiping');
      try { SW.row.setPointerCapture(e.pointerId); } catch { /* */ }
      SW.ic = document.createElement('span'); SW.ic.className = 'chSwIc'; SW.ic.innerHTML = swIcon; SW.row.appendChild(SW.ic);
    } else return;
  }
  // rubber-band past the max, like iOS
  const x = Math.max(0, dx - 10); const t = x < SW_MAX ? x : SW_MAX + (x - SW_MAX) * 0.2;
  SW.dx = t; SW.row.style.transform = `translate3d(${t}px,0,0)`;
  const p = Math.min(1, t / SW_HIT); SW.ic.style.opacity = String(p); SW.ic.style.transform = `scale(${0.4 + 0.6 * p})`;
  const hit = t >= SW_HIT; if (hit !== SW.hit) { SW.hit = hit; SW.row.classList.toggle('swiped', hit); if (hit && navigator.vibrate) navigator.vibrate(10); }
});
['pointerup', 'pointercancel'].forEach((ev) => $('#chMsgs').addEventListener(ev, (e) => { clearTimeout(lpT); lpT = null; if (SW.on) { e.preventDefault(); swReset(ev === 'pointerup' && SW.hit); } else SW.row = null; lpStart = null; }));
$('#chMsgs').addEventListener('click', (e) => { if (SW.on || (e.target.closest('.chRow') && e.target.closest('.chRow').classList.contains('snap'))) { e.stopImmediatePropagation(); } }, true);
$('#chMsgs').addEventListener('contextmenu', (e) => { const row = e.target.closest('.chRow'); if (row) { e.preventDefault(); chMenu(row.dataset.id); } });
$('#chMsgs').addEventListener('click', (e) => {
  const q = e.target.closest('[data-quick]'); if (q) return chSendText(q.dataset.quick);
  if (e.target.closest('a[href]')) return;
  const row = e.target.closest('.chRow'); if (!row) return; const m = CH.byId[row.dataset.id]; if (!m) return;
  if (m._failed && chMine(m)) return chRetry(m);
  const j = e.target.closest('[data-jump]'); if (j) return chJump(j.dataset.jump);
  if (e.target.closest('.vs')) { CH.rate = CH.rate === 1 ? 1.5 : CH.rate === 1.5 ? 2 : 1; localStorage.setItem('cc_chat_rate', CH.rate); if (CH.audio) CH.audio.playbackRate = CH.rate; $$('.chVoice .vs').forEach((b) => (b.textContent = CH.rate + '×')); return; }
  if (e.target.closest('.chVoice')) return chPlayVoice(m, e);
  if (e.target.closest('.chRound')) return chPlayRound(m, e.target.closest('.chRound'));
  if (e.target.closest('[data-view]')) return chView(m);
  if (e.target.closest('[data-file]')) { const u = chUrl(m.media_path); if (u) window.open(u, '_blank', 'noopener'); else toast('Needs internet to download 📶'); return; }
  const now = Date.now(); if (lastTap.id === m.id && now - lastTap.t < 320 && !m.deleted) { chReact(m, '❤️', e); lastTap = { id: null, t: 0 }; } else lastTap = { id: m.id, t: now };
});
function chJump(id) { const el = document.querySelector(`.chRow[data-id="${id}"]`); if (!el) return toast('That message is further up 💭'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
function chMenu(id) {
  const m = CH.byId[id]; if (!m || m.deleted || m._pending) return; if (navigator.vibrate) navigator.vibrate(15);
  $('#chReacts').innerHTML = (TP('rx') || CH_REACTS).map((e) => `<button data-r="${e}" class="${(m.reactions || {})[S.user.id] === e ? 'on' : ''}">${e}</button>`).join('');
  const acts = [['reply', 'Reply', '↩️']]; if (m.kind === 'text') acts.push(['copy', 'Copy', '📋']); if (m.media_path) acts.push(['open', m.kind === 'file' ? 'Download' : 'Open', m.kind === 'file' ? '⬇️' : '🔍']);
  if (chMine(m)) acts.push(['del', 'Delete for both', '🗑️']);
  $('#chActs').innerHTML = acts.map(([k, l, i]) => `<button data-a="${k}" class="${k === 'del' ? 'danger' : ''}"><span>${l}</span><span class="ai">${i}</span></button>`).join('');
  const box = $('#chMenu'); box.classList.remove('hidden'); box.dataset.id = id;
  document.querySelector(`.chRow[data-id="${id}"]`)?.classList.add('lp');
}
function chMenuClose() { $('#chMenu').classList.add('hidden'); $$('.chRow.lp').forEach((r) => r.classList.remove('lp')); }
$('#chMenu').onclick = async (e) => {
  const m = CH.byId[$('#chMenu').dataset.id]; const r = e.target.closest('[data-r]'), a = e.target.closest('[data-a]');
  if (!r && !a) return chMenuClose(); chMenuClose(); if (!m) return;
  if (r) return chReact(m, r.dataset.r, e);
  const k = a.dataset.a;
  if (k === 'reply') chSetReply(m.id);
  else if (k === 'copy') { try { await navigator.clipboard.writeText(chText(m)); toast('Copied 📋'); } catch { toast('Could not copy'); } }
  else if (k === 'open') { if (chKind(m) === 'file') { const u = chUrl(m.media_path); if (u) window.open(u, '_blank', 'noopener'); } else chView(m); }
  else if (k === 'del') {
    if (!navigator.onLine) return toast('Deleting needs internet 📶');
    if (!(await uiConfirm('Delete this message for both of you?'))) return;
    const { data: path, error } = await sb.rpc('chat_delete', { mid: m.id }); if (error) return toast(errMsg(error));
    Object.assign(m, { deleted: true, body: null, media_path: null, reactions: {} }); chRender(); chSaveCache();
    if (path) sb.storage.from('chat').remove([path]); toast('Deleted for both 🗑️');
  }
};
async function chReact(m, emoji, e) {
  if (!navigator.onLine) return toast('Reactions need internet 📶');
  const cur = (m.reactions || {})[S.user.id]; const next = cur === emoji ? null : emoji;
  m.reactions = { ...(m.reactions || {}) }; if (next) m.reactions[S.user.id] = next; else delete m.reactions[S.user.id];
  chRender(); if (next && e && window.FX) FX.burst(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2, [next], 6, 50);
  const { data, error } = await sb.rpc('chat_react', { mid: m.id, emoji: next }); if (error) return toast(errMsg(error));
  if (data) { m.reactions = data; chRender(); chSaveCache(); }
}

// ---- viewer ----
function chView(m) {
  const u = m._local || chUrl(m.media_path); if (!u) return toast('Needs internet to load 📶');
  $('#chViewBox').innerHTML = chKind(m) === 'image' ? `<img src="${esc(u)}" alt="">` : `<video src="${esc(u)}" controls autoplay playsinline></video>`;
  if (m.body) $('#chViewBox').insertAdjacentHTML('beforeend', `<p>${esc(chText(m))}</p>`);
  $('#chViewer').classList.remove('hidden');
}
$('#chViewer').onclick = (e) => { if (e.target.closest('video') && !e.target.closest('.chVX')) return; $('#chViewer').classList.add('hidden'); $('#chViewBox').innerHTML = ''; };

// ---- voice playback ----
function chVoiceUI(m) {
  const el = document.querySelector(`.chVoice[data-voice="${m.id}"]`); if (!el || !CH.audio) return;
  const a = CH.audio, d = a.duration && isFinite(a.duration) ? a.duration : (m.duration || 1); const p = Math.min(1, a.currentTime / d);
  const bars = el.querySelectorAll('.vw i'); const n = Math.round(p * bars.length); bars.forEach((b, i) => b.classList.toggle('on', i < n));
  el.querySelector('.vp').textContent = a.paused ? '▶' : '❚❚'; el.querySelector('.vt').textContent = fmtDur(a.paused && !a.currentTime ? m.duration : a.currentTime);
  el.classList.toggle('playing', !a.paused);
}
function chPlayVoice(m, e) {
  const u = m._local || chUrl(m.media_path); if (!u) return toast('Needs internet to play 📶');
  if (CH.playing && CH.playing.id === m.id && CH.audio) {
    const vw = e.target.closest('.vw');
    if (vw && CH.audio.duration) { const r = vw.getBoundingClientRect(); CH.audio.currentTime = ((e.clientX - r.left) / r.width) * CH.audio.duration; return; }
    if (CH.audio.paused) CH.audio.play(); else CH.audio.pause(); return;
  }
  if (CH.audio) { CH.audio.pause(); const old = CH.playing; CH.audio = null; CH.playing = null; if (old) chRender(); }
  const a = new Audio(u); a.playbackRate = CH.rate; CH.audio = a; CH.playing = m;
  a.ontimeupdate = a.onplay = a.onpause = () => chVoiceUI(m);
  a.onended = () => { a.currentTime = 0; chVoiceUI(m); CH.audio = null; CH.playing = null; const el = document.querySelector(`.chVoice[data-voice="${m.id}"]`); el && el.classList.remove('playing'); };
  a.play().catch(() => toast('Could not play this voice note on this device 😿'));
}
function chPlayRound(m, el) {
  const v = el.querySelector('video'); if (!v) return toast('Needs internet to play 📶');
  if (!v.paused) { v.pause(); el.classList.remove('playing'); return; }
  $$('.chRound video').forEach((x) => { if (x !== v) { x.pause(); x.closest('.chRound').classList.remove('playing'); } });
  v.muted = false; v.currentTime = v.currentTime > 0.2 ? v.currentTime : 0; el.classList.add('playing');
  const c = el.querySelector('circle'); v.ontimeupdate = () => { const d = isFinite(v.duration) ? v.duration : (m.duration || 1); c.style.strokeDashoffset = String(302 * (1 - v.currentTime / d)); };
  v.onended = () => { el.classList.remove('playing'); c.style.strokeDashoffset = '302'; };
  v.play().catch(() => toast('Could not play this video on this device 😿'));
}

// ---- hold-to-record voice ----
const REC = { on: false, rec: null, stream: null, chunks: [], t0: 0, wave: [], an: null, raf: null, cancel: false, startX: 0, pending: false, ac: null };
async function chRecStart(e) {
  if (!S.couple) return; if (!navigator.onLine) return toast('Voice notes need internet 📶');
  if (!window.MediaRecorder || !navigator.mediaDevices) return toast('Recording not supported on this browser 😿');
  REC.pending = true; REC.cancel = false; REC.startX = e.clientX;
  try { REC.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { REC.pending = false; return toast('Microphone permission needed 🎙️'); }
  if (!REC.pending) { REC.stream.getTracks().forEach((t) => t.stop()); return; } // released while asking
  const mime = pickMime(); REC.rec = new MediaRecorder(REC.stream, mime ? { mimeType: mime } : undefined); REC.chunks = []; REC.wave = [];
  REC.rec.ondataavailable = (ev) => ev.data && ev.data.size && REC.chunks.push(ev.data);
  REC.rec.start(250); REC.t0 = Date.now(); REC.on = true; $('#chRec').classList.remove('hidden'); $('#chApp, #chatApp').classList.add('recording'); $('#chMic').classList.add('rec'); if (navigator.vibrate) navigator.vibrate(30);
  try {
    REC.ac = new (window.AudioContext || window.webkitAudioContext)(); const src = REC.ac.createMediaStreamSource(REC.stream); REC.an = REC.ac.createAnalyser(); REC.an.fftSize = 256; src.connect(REC.an);
  } catch { REC.an = null; }
  const cv = $('#chRecWave'), cx = cv.getContext('2d'); const buf = new Uint8Array(128); let lastS = 0;
  const loop = (t) => {
    if (!REC.on) return; REC.raf = requestAnimationFrame(loop);
    const s = (Date.now() - REC.t0) / 1000; $('#chRecT').textContent = fmtDur(s); if (s >= 300) chRecStop(true);
    let lvl = .2; if (REC.an) { REC.an.getByteTimeDomainData(buf); let sum = 0; for (const v of buf) sum += ((v - 128) / 128) ** 2; lvl = Math.min(1, Math.sqrt(sum / buf.length) * 3.2); }
    if (t - lastS > 90) { REC.wave.push(lvl); lastS = t; }
    cx.clearRect(0, 0, cv.width, cv.height); const bars = REC.wave.slice(-60); cx.fillStyle = '#e75480';
    bars.forEach((v, i) => { const h = 4 + v * 30; cx.fillRect(cv.width - (bars.length - i) * 5, (cv.height - h) / 2, 3, h); });
  };
  REC.raf = requestAnimationFrame(loop);
}
function chRecStop(send) {
  REC.pending = false; if (!REC.on) return; REC.on = false; cancelAnimationFrame(REC.raf);
  $('#chRec').classList.add('hidden'); $('#chRec').classList.remove('cancel'); $('#chatApp').classList.remove('recording'); $('#chMic').classList.remove('rec');
  const dur = (Date.now() - REC.t0) / 1000; const rec = REC.rec, stream = REC.stream;
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop()); try { REC.ac && REC.ac.close(); } catch { /* */ }
    if (!send || REC.cancel || dur < 0.7) { if (send && dur < 0.7 && !REC.cancel) toast('Hold to record 🎙️'); return; }
    const type = (rec.mimeType || 'audio/webm').split(';')[0]; const blob = new Blob(REC.chunks, { type });
    const w = REC.wave; const n = 40; const wave = Array.from({ length: n }, (_, i) => { const s = w.slice(Math.floor(i * w.length / n), Math.floor((i + 1) * w.length / n) || undefined); return Math.round((s.length ? Math.max(...s) : .1) * 100) / 100; });
    chSendMedia(blob, 'voice', { duration: Math.round(dur * 10) / 10, meta: { wave } });
  };
  try { rec.stop(); } catch { /* */ }
}
const mic = $('#chMic');
mic.addEventListener('pointerdown', (e) => { e.preventDefault(); try { mic.setPointerCapture(e.pointerId); } catch { /* */ } chRecStart(e); });
mic.addEventListener('pointermove', (e) => { if (!REC.on) return; const c = e.clientX - REC.startX < -80; REC.cancel = c; $('#chRec').classList.toggle('cancel', c); });
mic.addEventListener('pointerup', () => chRecStop(true));
mic.addEventListener('pointercancel', () => { REC.cancel = true; chRecStop(false); });
mic.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- round video notes ----
const VN = { stream: null, rec: null, chunks: [], t0: 0, raf: null, on: false };
function pickVMime() { const c = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']; return window.MediaRecorder ? c.find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '' : ''; }
$('#chVid').onclick = async () => {
  if (!S.couple) return; if (!navigator.onLine) return toast('Video notes need internet 📶');
  if (!window.MediaRecorder || !navigator.mediaDevices) return toast('Video recording not supported here 😿');
  try { VN.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }, audio: true }); }
  catch { return toast('Camera permission needed 📷'); }
  $('#chVNprev').srcObject = VN.stream; $('#chVN').classList.remove('hidden'); $('#chVNgo').textContent = '⏺ Record'; $('#chVNt').textContent = 'Tap ⏺ to record (max 60s)'; $('#chVNpr').style.strokeDashoffset = '352';
};
function vnClose() { VN.on = false; cancelAnimationFrame(VN.raf); if (VN.stream) VN.stream.getTracks().forEach((t) => t.stop()); VN.stream = null; $('#chVNprev').srcObject = null; $('#chVN').classList.add('hidden'); $('#chVN').classList.remove('rec'); }
$('#chVNx').onclick = () => { if (VN.rec && VN.on) { VN.rec.onstop = null; try { VN.rec.stop(); } catch { /* */ } } vnClose(); };
$('#chVNgo').onclick = () => {
  if (!VN.on) {
    const mime = pickVMime(); VN.rec = new MediaRecorder(VN.stream, mime ? { mimeType: mime, videoBitsPerSecond: 900000 } : undefined); VN.chunks = [];
    VN.rec.ondataavailable = (e) => e.data && e.data.size && VN.chunks.push(e.data);
    VN.rec.onstop = () => { const dur = (Date.now() - VN.t0) / 1000; const type = (VN.rec.mimeType || 'video/webm').split(';')[0]; const blob = new Blob(VN.chunks, { type }); vnClose(); if (dur >= 0.8) chSendMedia(blob, 'videonote', { duration: Math.round(dur * 10) / 10 }); };
    VN.rec.start(500); VN.t0 = Date.now(); VN.on = true; $('#chVN').classList.add('rec'); $('#chVNgo').textContent = '⏹ Send';
    const loop = () => { if (!VN.on) return; const s = (Date.now() - VN.t0) / 1000; $('#chVNt').textContent = `${fmtDur(s)} / 1:00`; $('#chVNpr').style.strokeDashoffset = String(352 * (1 - Math.min(1, s / 60))); if (s >= 60) { VN.on = false; VN.rec.stop(); return; } VN.raf = requestAnimationFrame(loop); };
    VN.raf = requestAnimationFrame(loop);
  } else { VN.on = false; VN.rec.stop(); }
};

// ---- layout & lifecycle ----
let chKb = false;
function chLayout() {
  const app = $('#chatApp'); if (!app || $('#tab-chat').classList.contains('hidden')) return;
  const vv = window.visualViewport;
  const vh = vv ? vv.height : innerHeight, off = vv ? Math.max(0, vv.offsetTop) : 0; // iOS shifts the page up under the keyboard: follow what's visible
  const kb = window.FU_kb ? window.FU_kb() : (!!vv && innerHeight - vv.height > 120);
  document.body.classList.toggle('kbOpen', kb);
  const head = document.querySelector('#mainView header.top'); const top = head && head.offsetParent ? Math.max(0, head.getBoundingClientRect().bottom) : 0;
  const nav = document.querySelector('.nav'); const navH = kb ? 0 : (nav ? Math.max(0, vh - nav.offsetTop) : 0); // offsetTop ignores the slide-in animation; floating docks sit above the edge
  const list = $('#chatList'); const nearBottom = list && list.scrollHeight - list.scrollTop - list.clientHeight < 160;
  app.style.top = (off + top) + 'px'; app.style.height = Math.max(160, vh - top - navH) + 'px';
  if (kb !== chKb) { chKb = kb; if (list && nearBottom) requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; }); }
}
if (window.visualViewport) { visualViewport.addEventListener('resize', chLayout); visualViewport.addEventListener('scroll', chLayout); }
addEventListener('resize', chLayout);
// iOS: focusing the composer scrolls the page; settle the layout once the keyboard is up
$('#chTxt').addEventListener('focus', () => { [60, 250, 500].forEach((ms) => setTimeout(chLayout, ms)); });
$('#chTxt').addEventListener('blur', () => { setTimeout(() => { if (document.body.classList.contains('inChat')) window.scrollTo(0, 0); chLayout(); }, 120); });
function chOnTab(tab) {
  document.body.classList.toggle('inChat', tab === 'chat');
  if (tab !== 'chat') { if (CH.audio) CH.audio.pause(); return; }
  requestAnimationFrame(() => { chLayout(); const l = $('#chatList'); l.scrollTop = l.scrollHeight; });
  if (CH.ready) chSync(); chMarkSoon(); chBadge(); CH.unreadServer = 0; chBadge(); applyNames();
  $('#chAv').textContent = partnerEmoji();
}
$$('.nav button').forEach((b) => b.addEventListener('click', () => chOnTab(b.dataset.tab)));
$('#chGear').onclick = () => $('#gearBtn').click();
const origGoTab = goTab; goTab = function (tab) { origGoTab(tab); chOnTab(tab); };
const chWake = () => { if (!S.couple || !CH.ready) return; chSync(); chUnreadCount(); if (chOpen()) chMarkSoon(); if (CH.ch && CH.rtStatus && CH.rtStatus !== 'SUBSCRIBED') chSubscribe(); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) chWake(); });
addEventListener('focus', chWake); addEventListener('pageshow', chWake);
addEventListener('online', () => setTimeout(chWake, 1200));

// initial session (onAuthStateChange also fires INITIAL_SESSION)
sb.auth.getSession().then(({ data }) => { if (!S.user && !data.session && !booting) { show('#authView'); if (localStorage.getItem(ACTION_KEY)) $('#authMsg').textContent = 'Sign in to send your ping 💗'; } });

// ---- v25 bridge: lets couple.js use the app's internals ----
window.__FU = {
  get S() { return S; }, sb, $, $$, esc, toast, uiConfirm, uiPrompt, uiDialog, notify, loadTable, RENDER, TABLES,
  openFeat, FEAT_RENDER, goTab, openGame, partnerName, partnerEmoji, pn, mine, dayStr, addDays, parseDay, fmtDay, fmtTime, fmtDate, hhmm, isoWeek,
  D, hearts, confetti, snd, paintHi, saveMood, latestMood, dqIndex, renderDQ, refreshProgress, renderStreak, setFB, cacheGet, cacheSet, saveShared, shRow, chAddLocal, chInsert,
  chReplyCtx: (ctx) => { goTab('chat'); setTimeout(() => { chSetCtx(ctx); $('#chTxt').focus(); }, 320); },
  get CH() { return CH; }, signPaths, sUrl, sendPing, chHandleFiles: (...a) => chHandleFiles(...a), chSendMedia: (...a) => chSendMedia(...a), chLoadOlder: () => chLoadOlder(), chJump: (id) => chJump(id), chRender, chSendText, chSign, phUrl, isNetErr, openModal, closeModal, motionOn, hashS, params, nameOf
};
})();

