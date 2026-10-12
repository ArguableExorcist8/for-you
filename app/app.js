(() => {
'use strict';
const { url, key } = window.CC_CONFIG;
const D = window.CC_DATA;
const sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

// pretty dialogs
function uiDialog(msg, withInput) {
  return new Promise(res => {
    const o = document.createElement('div'); o.className = 'uiDlg';
    o.innerHTML = `<div class="uiBox"><div class="uiHeart">💕</div><p></p>${withInput ? '<input class="uiIn" maxlength="300" placeholder="Type here…">' : ''}<div class="uiBtns"><button class="uiNo">Cancel</button><button class="uiYes">OK</button></div></div>`;
    o.querySelector('p').textContent = msg;
    document.body.appendChild(o);
    const inp = o.querySelector('.uiIn'); setTimeout(() => (inp || o.querySelector('.uiYes')).focus(), 50);
    const done = v => { o.remove(); res(v); };
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
const toast = (m, ms = 2600) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms); };
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const show = (id) => { $$('.view').forEach((v) => v.classList.add('hidden')); $(id).classList.remove('hidden'); };
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
  if (e.target.closest('[data-action="signout"]')) { await sb.auth.signOut(); }
});

sb.auth.onAuthStateChange((event, session) => {
  const uid = session?.user?.id || null;
  if (uid === (S.user?.id || null) && event !== 'USER_UPDATED') return;
  S.user = session?.user || null;
  setTimeout(boot, 0); // avoid calling supabase inside the callback
});

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
    await loadMe();
    await loadCouple();
    if (!S.couple) { renderPair(); show('#pairView'); subscribePairing(); }
    else { await enterCouple(); }
  } catch (e) { console.error(e); toast('Something went wrong: ' + errMsg(e)); }
  finally { booting = false; }
}
function teardown() {
  if (S.channel) { sb.removeChannel(S.channel); S.channel = null; }
  if (S.pairChannel) { sb.removeChannel(S.pairChannel); S.pairChannel = null; }
  S.couple = null; S.partner = null; S.data = {};
}
async function loadMe() {
  for (let i = 0; i < 3; i++) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle();
    if (error) throw error;
    if (data) { S.me = data; return; }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error('Profile not found');
}
async function loadCouple() {
  const { data, error } = await sb.from('couples').select('*').eq('active', true).maybeSingle();
  if (error) throw error;
  S.couple = data;
  if (data) {
    const pid = data.user_a === S.user.id ? data.user_b : data.user_a;
    const { data: p } = await sb.from('profiles').select('id,username,display_name,emoji').eq('id', pid).maybeSingle();
    S.partner = p || { id: pid, display_name: 'Your love', emoji: '💗', username: '' };
  }
}

// ================= PAIRING =================
function renderPair() {
  $('#pairEmoji').textContent = S.me.emoji; $('#pairName').textContent = S.me.display_name;
  $('#myCode').textContent = S.me.invite_code; $('#myUser').textContent = '@' + S.me.username;
  $('#findResult').innerHTML = '';
  loadRequests();
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
  trivia_results: { order: 'day', asc: false, limit: 200 }
};
const PROGRESS_TABLES = ['daily_answers', 'moods', 'gratitude', 'weekly_checkins', 'q36_answers'];
const GIFT_TOASTS = { open_when: 'wrote you an Open-when letter ✉️', drawings: 'sent you a drawing 🎨', scratch_cards: 'hid a scratch-card prize for you 🎟️', big_questions: 'asked you an important question 💍', quiz_questions: 'added a quiz question about themselves 📝' };
const RENDER = {};
async function loadTable(t) {
  const c = TABLES[t];
  let q = sb.from(t).select('*').eq('couple_id', S.couple.id).order(c.order, { ascending: c.asc });
  if (c.limit) q = q.limit(c.limit);
  const { data, error } = await q;
  if (error) { console.error(t, error); return; }
  S.data[t] = data;
  RENDER[t] && RENDER[t]();
}
const nameOf = (uid) => uid === S.user.id ? 'You' : (S.partner?.display_name || 'Your love');
const emojiOf = (uid) => uid === S.user.id ? S.me.emoji : (S.partner?.emoji || '💗');

async function enterCouple() {
  $('#coupleTitle').textContent = `${S.me.emoji} ${S.me.display_name} 💕 ${S.partner.display_name} ${S.partner.emoji}`;
  $$('.pname').forEach((el) => (el.textContent = S.partner.display_name));
  renderMe();
  show('#mainView');
  initGames();
  await Promise.all(Object.keys(TABLES).map(loadTable));
  initConnect();
  subscribeCouple();
  runPendingAction();
}
function subscribeCouple() {
  const ch = sb.channel('couple-' + S.couple.id);
  Object.keys(TABLES).forEach((t) => {
    ch.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: `couple_id=eq.${S.couple.id}` }, (payload) => {
      if (t === 'pings' && payload.eventType === 'INSERT' && payload.new.to_user === S.user.id) showPingFrom(payload.new);
      if (GIFT_TOASTS[t] && payload.eventType === 'INSERT' && payload.new.created_by && payload.new.created_by !== S.user.id) toast(`${S.partner.display_name} ${GIFT_TOASTS[t]}`, 4000);
      loadTable(t);
      if (PROGRESS_TABLES.includes(t)) refreshProgress();
      if (t === 'time_capsules') loadLocked();
      if (t === 'lovemap_answers') loadLMProgress();
    });
  });
  ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${S.couple.id}` }, (p) => {
    if (!p.new.active) { toast('You are no longer connected 💔'); boot(); }
  });
  ch.subscribe();
  S.channel = ch;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.couple) { Object.keys(TABLES).forEach(loadTable); refreshProgress(); loadLocked(); } });

// ---- tabs ----
$$('.nav button').forEach((b) => b.onclick = () => {
  $$('.nav button').forEach((x) => x.classList.toggle('on', x === b));
  $$('.tab').forEach((t) => t.classList.add('hidden'));
  $('#tab-' + b.dataset.tab).classList.remove('hidden');
  window.scrollTo(0, 0);
});

// ---- pings ----
async function sendPing() {
  if (!S.couple) { toast('Connect with your partner first 💞'); return false; }
  const { error } = await sb.from('pings').insert({});
  if (error) { toast('Ping failed: ' + errMsg(error)); return false; }
  floatHearts(document.body, 14);
  notify('ping', D.pingLines[Math.floor(Math.random() * D.pingLines.length)]);
  toast(`Ping sent to ${S.partner.display_name}! 💗`);
  return true;
}
$('#pingBtn').onclick = () => sendPing();
function showPingFrom(p) {
  const line = D.pingLines[Math.floor(Math.random() * D.pingLines.length)];
  $('#heartTxt').textContent = `${S.partner.display_name} ${line}`;
  const o = $('#heartOverlay'); o.classList.remove('hidden'); floatHearts(o, 24);
  if (navigator.vibrate) navigator.vibrate([100, 60, 100]);
}
$('#heartOverlay').onclick = () => $('#heartOverlay').classList.add('hidden');
function floatHearts(el, n) {
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div'); h.className = 'floaty';
    h.textContent = ['💗', '💕', '💖', '❤️', '💘'][i % 5];
    h.style.left = Math.random() * 100 + 'vw'; h.style.animationDelay = Math.random() * 1.2 + 's';
    h.style.position = 'fixed'; h.style.zIndex = 95;
    document.body.appendChild(h); setTimeout(() => h.remove(), 4500);
  }
}
RENDER.pings = () => {
  const l = S.data.pings || [];
  const today = l.filter((p) => new Date(p.created_at).toDateString() === new Date().toDateString());
  $('#pingHint').textContent = `Today: you sent ${today.filter((p) => p.created_by === S.user.id).length}, got ${today.filter((p) => p.created_by !== S.user.id).length} 💞`;
  $('#pingList').innerHTML = l.length ? l.map((p) => `<div class="row"><span>${esc(emojiOf(p.created_by))} ${p.created_by === S.user.id ? 'You pinged ' + esc(S.partner.display_name) : esc(S.partner.display_name) + ' pinged you'}</span><small>${fmtTime(p.created_at)}</small></div>`).join('') : '<p class="muted">No pings yet. Tap the big heart!</p>';
};
async function runPendingAction() {
  const a = localStorage.getItem(ACTION_KEY);
  if (!a) return;
  localStorage.removeItem(ACTION_KEY);
  if (a === 'ping') {
    if (await sendPing()) {
      $('#heartTxt').textContent = `Ping sent to ${S.partner.display_name}! 💌`;
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
  $('#cdList').innerHTML = l.length ? l.map((c) => `<div data-cd="${esc(c.target_at)}"><b>${esc(c.label)}</b> <button class="mini soft" data-del="countdowns:${c.id}">✕</button><div class="cd"></div><small class="muted">${fmtTime(c.target_at)}</small></div>`).join('<hr style="border:0;border-top:1px dashed #ffd1dc">') : '<p class="muted">Add something to look forward to!</p>';
  tickCountdowns();
};
function tickCountdowns() {
  $$('[data-cd]').forEach((el) => {
    let s = Math.max(0, Math.floor((new Date(el.dataset.cd) - Date.now()) / 1000));
    const box = el.querySelector('.cd');
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
function compress(file, max = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob((b) => b ? resolve(b) : reject(new Error('Could not compress')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('Could not read image (try JPEG/PNG)')); };
    img.src = u;
  });
}
$('#photoIn').onchange = async (e) => {
  const files = [...e.target.files]; e.target.value = '';
  for (const [i, f] of files.entries()) {
    $('#photoStatus').textContent = `Uploading ${i + 1}/${files.length}… 📤`;
    try {
      const blob = await compress(f);
      const path = `${S.couple.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      const caption = files.length === 1 ? ((await uiPrompt('Add a caption? 💕')) || '').slice(0, 300) : '';
      const { error: e2 } = await sb.from('photos').insert({ path, caption });
      if (e2) throw e2;
    } catch (err) { toast('Upload failed: ' + errMsg(err)); }
  }
  $('#photoStatus').textContent = '';
};
RENDER.photos = async () => {
  const l = S.data.photos || [];
  const need = l.map((p) => p.path).filter((p) => !S.signedUrls[p] || S.signedUrls[p].exp < Date.now());
  if (need.length) {
    const { data } = await sb.storage.from('photos').createSignedUrls(need, 3600 * 6);
    (data || []).forEach((d) => { if (d.signedUrl) S.signedUrls[d.path] = { url: d.signedUrl, exp: Date.now() + 3600 * 5 * 1000 }; });
  }
  $('#gallery').innerHTML = l.length ? l.map((p) => `<div class="polaroid" data-photo="${p.id}"><img loading="lazy" src="${esc(S.signedUrls[p.path]?.url || '')}" alt=""><p>${esc(p.caption || '')}</p></div>`).join('') : '<p class="muted" style="grid-column:1/-1">No photos yet 📷</p>';
};
$('#gallery').onclick = (e) => {
  const el = e.target.closest('[data-photo]'); if (!el) return;
  const p = S.data.photos.find((x) => x.id === el.dataset.photo); if (!p) return;
  openModal(`<img src="${esc(S.signedUrls[p.path]?.url || '')}"><input id="capEdit" value="${esc(p.caption || '')}" maxlength="300" placeholder="Caption">
    <small class="muted">Added by ${esc(nameOf(p.created_by))} · ${fmtDate(p.created_at)}</small><br>
    <button id="capSave">Save caption</button><button class="danger" data-del="photos:${p.id}">Delete</button><button class="soft" data-close>Close</button>`);
  $('#capSave').onclick = async () => {
    const { error } = await sb.from('photos').update({ caption: $('#capEdit').value.trim() }).eq('id', p.id);
    if (error) toast(errMsg(error)); else closeModal();
  };
};
function openModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
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
  $('#cpMine').innerHTML = mine.length ? mine.map((c) => couponHtml(c, true)).join('') : `<p class="muted">No coupons yet… hint hint, ${esc(S.partner.display_name)} 😏</p>`;
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
  if (!theirs) { box.innerHTML = `<p class="muted">${esc(S.partner.display_name)} hasn't written one yet 👀</p>`; return; }
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
function renderMe() {
  $('#pfName').value = S.me.display_name; $('#pfUser').value = S.me.username; $('#pfEmoji').value = S.me.emoji; $('#pfCode').textContent = S.me.invite_code;
  $('#partnerBox').innerHTML = S.partner ? `<div class="person"><span class="em">${esc(S.partner.emoji)}</span><div class="info"><b>${esc(S.partner.display_name)}</b><br><small>@${esc(S.partner.username)} · together since ${fmtDate(S.couple.created_at)}</small></div></div>` : '';
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
  if (!await uiConfirm(`Disconnect from ${S.partner.display_name}? Your shared space will be hidden.`)) return;
  const { error } = await sb.rpc('disconnect');
  if (error) return toast(errMsg(error));
  boot();
};

// ================= GAMES =================
// ---- fx helpers ----
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
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
    const h = document.createElement('div'); h.className = 'heart'; h.textContent = ['❤️', '💖', '💕', '💗', '😘'][k % 5];
    h.style.left = (x ?? Math.random() * innerWidth) + (Math.random() * 60 - 30) + 'px'; h.style.top = (y ?? innerHeight) + 'px';
    h.style.animationDuration = (2 + Math.random() * 2) + 's'; document.body.appendChild(h); setTimeout(() => h.remove(), 4500);
  }
}
function confetti(n = 80) {
  const c = ['#e75480', '#ff8fab', '#ffd166', '#a0e7e5', '#c77dff', '#fff'];
  for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'conf'; d.style.left = Math.random() * 100 + 'vw'; d.style.background = rnd(c); d.style.animationDuration = (2 + Math.random() * 2) + 's'; d.style.animationDelay = Math.random() * .5 + 's'; document.body.appendChild(d); setTimeout(() => d.remove(), 5000); }
}
const mine = (r) => r.created_by === S.user.id;
const pn = () => esc(S.partner?.display_name || 'Your love');
const vsHtml = (a, b, la = 'You', lb = null, fmt = (v) => v) => {
  lb = lb || pn();
  return `<div class="vs"><div class="${a > b ? 'lead' : ''}"><small>${esc(S.me.emoji)} ${la}</small><b>${fmt(a)}</b></div><div class="${b > a ? 'lead' : ''}"><small>${esc(S.partner?.emoji || '💗')} ${lb}</small><b>${fmt(b)}</b></div></div>`;
};
function setBadge(id, txt, isNew) { const el = document.getElementById('tb-' + id); if (!el) return; el.textContent = txt || ''; el.classList.toggle('new', !!isNew); }

// ---- game navigation ----
let curGame = null;
function openGame(g) {
  curGame = g;
  $('#gameHome').classList.add('hidden'); $('#gamePanel').classList.remove('hidden');
  $$('.game').forEach((p) => p.classList.toggle('on', p.dataset.panel === g));
  window.scrollTo(0, 0);
  if (g === 'scratch') requestAnimationFrame(scrReset);
  if (g === 'draw') requestAnimationFrame(drawSize);
  if (g === 'quiz') renderQuiz();
}
function closeGame() { curGame = null; stopCatch(); stopBalloons(); $('#gamePanel').classList.add('hidden'); $('#gameHome').classList.remove('hidden'); window.scrollTo(0, 0); }
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
    `<div class="vs"><div class="${cmp(a) > cmp(b) ? 'lead' : ''}"><small>${esc(S.me.emoji)} You</small><b>${a ?? '—'}</b></div><div class="${cmp(b) > cmp(a) ? 'lead' : ''}"><small>${esc(S.partner.emoji)} ${pn()}</small><b>${b ?? '—'}</b></div></div>` +
    (recent.length ? recent.map((s) => `<div class="row"><span>${esc(emojiOf(s.created_by))} ${esc(nameOf(s.created_by))}: <b>${s.score}</b></span><small>${fmtTime(s.created_at)}</small></div>`).join('') : '<p class="muted">No games yet — set the first record!</p>');
  const leader = a == null && b == null ? '' : cmp(a) >= cmp(b) ? 'You lead 👑' : `${S.partner.display_name} leads`;
  setBadge(game, leader);
}
RENDER.game_scores = () => { renderBoard('catch'); renderBoard('balloons'); renderBoard('memory', true); };

// ---- catch my heart ----
let catchRun = false, catchTimers = [];
function stopCatch() { catchTimers.forEach(clearInterval); catchTimers = []; catchRun = false; const g = $('#gArea'); if (g) g.innerHTML = ''; }
$('#gStart').onclick = () => {
  if (catchRun) return; catchRun = true; let score = 0, t = 0; const g = $('#gArea'); g.innerHTML = ''; $('#gScore').innerHTML = '<b>Score: 0</b>';
  const iv = setInterval(() => {
    const it = document.createElement('div'); const bad = Math.random() < .25;
    it.className = 'fall'; it.textContent = bad ? '🧅' : ['❤️', '💖', '💘'][t % 3];
    it.style.left = Math.random() * (g.clientWidth - 36) + 'px'; it.style.top = '-36px'; g.appendChild(it);
    let y = -36; const speed = 3 + t / 12;
    const mv = setInterval(() => { y += speed; it.style.top = y + 'px'; if (y > g.clientHeight) { clearInterval(mv); it.remove(); } }, 16); catchTimers.push(mv);
    it.addEventListener('pointerdown', (ev) => { ev.preventDefault(); clearInterval(mv); it.remove(); score += bad ? -3 : 1; $('#gScore').innerHTML = '<b>Score: ' + score + '</b>'; if (bad) { toast('Ew onion breath 🤢 −3'); snd('bad'); } else snd('pop'); });
    if (++t > 30) {
      clearInterval(iv);
      setTimeout(() => {
        if (!catchRun) return; catchRun = false;
        const best = S.partner ? bestOf('catch', S.partner.id) : null;
        $('#gScore').innerHTML = `<b>Final: ${score}</b> ${best != null ? (score > best ? `— you beat ${pn()}'s ${best}! 😎` : `— ${pn()}'s best is ${best}`) : ''}`;
        hearts(15); snd('win'); saveScore('catch', score);
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
    b.textContent = gold ? '💗' : '🎈'; b.style.left = (3 + Math.random() * 82) + '%'; b.style.top = (5 + Math.random() * 70) + '%';
    b.onpointerdown = (e) => {
      e.preventDefault(); if (!balRun) return; score += gold ? 3 : 1; upd();
      const m = document.createElement('div'); m.className = 'balmsg'; m.style.left = b.style.left; m.style.top = b.style.top; m.textContent = gold ? '+3 ' + rnd(D.balMsgs) : rnd(D.balMsgs);
      b.remove(); s.appendChild(m); setTimeout(() => m.remove(), 1700); snd('pop');
    };
    s.appendChild(b); setTimeout(() => b.remove(), 2600);
  };
  spawn(); balTimers.push(setInterval(spawn, 450));
  balTimers.push(setInterval(() => {
    left--; upd();
    if (left <= 0) {
      const sc = score; stopBalloons();
      $('#balScore').innerHTML = `<b>Time! ${sc} popped 🎉</b>`; confetti(40); snd('win'); saveScore('balloons', sc);
    }
  }, 1000));
};

// ---- love-o-meter ----
let meter = 0, meterTimer = null;
const meterLines = [[20, 'Warming up… 😊'], [50, 'Getting toasty 🔥'], [80, 'Dangerously in love 😍'], [100, 'OFF THE CHARTS 💯💗']];
$('#meterBtn').onclick = (e) => {
  meter = Math.min(100, meter + 7); $('#bar').style.width = meter + '%'; snd('tick'); hearts(1, e.clientX, e.clientY);
  $('#meterTxt').textContent = (meterLines.find(([v]) => meter <= v) || meterLines[3])[1];
  if (meter >= 100) { hearts(12); snd('win'); }
  clearInterval(meterTimer);
  meterTimer = setInterval(() => { meter = Math.max(0, meter - 2); $('#bar').style.width = meter + '%'; if (!meter) clearInterval(meterTimer); }, 200);
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
    if (!$$('#mem .mc:not(.done)').length) { $('#memTxt').textContent = `You won in ${memMoves} moves! Prize: one kiss 💋`; hearts(12); confetti(50); snd('win'); saveScore('memory', memMoves); }
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
  $('#pokeVs').innerHTML = vsHtml(a, b) + `<p class="muted">Together: <b>${a + b}</b> pokes 🐻</p>`;
  setBadge('bear', (a + b) + ' pokes');
}
RENDER.poke_counts = renderPokes;
async function flushPokes() {
  pokeTimer = null; const n = Math.min(50, pokePending); if (!n) return;
  const { data, error } = await sb.rpc('poke_bear', { n });
  pokePending -= n;
  if (error) { toast(errMsg(error)); renderPokes(); return; }
  const row = (S.data.poke_counts ||= []).find((p) => p.created_by === S.user.id);
  if (row) row.count = data; else S.data.poke_counts.push({ created_by: S.user.id, count: data });
  renderPokes(); if (pokePending) pokeTimer = setTimeout(flushPokes, 300);
}
$('#bearEl').onclick = (e) => {
  $('#bearTxt').textContent = D.bearLines[bearI++ % D.bearLines.length]; hearts(4, e.clientX, e.clientY); snd('boing');
  pokePending++; renderPokes(); if (!pokeTimer) pokeTimer = setTimeout(flushPokes, 700);
};

// ---- fortune cookie (partner-written fortunes first) ----
$('#cookie').onclick = (e) => {
  const fromP = (S.data.fortunes || []).filter((f) => !mine(f));
  let txt;
  if (fromP.length && Math.random() < .75) { const f = rnd(fromP); txt = `${f.message}  — ${S.partner.display_name} 💌`; }
  else txt = rnd(D.fortunes);
  $('#fortune').textContent = txt; hearts(4, e.clientX, e.clientY); snd('pop');
};
$('#ftAdd').onclick = async () => {
  const message = $('#ftTxt').value.trim(); if (!message) return;
  const { error } = await sb.from('fortunes').insert({ message });
  if (error) return toast(errMsg(error)); $('#ftTxt').value = ''; toast('Fortune baked 🥠');
};
RENDER.fortunes = () => {
  const l = S.data.fortunes || [], m = l.filter(mine), p = l.filter((f) => !mine(f));
  $('#ftList').innerHTML = m.length ? m.map((f) => `<div class="row"><span>${esc(f.message)}</span><button class="mini soft" data-del="fortunes:${f.id}">✕</button></div>`).join('') : '<p class="muted">No fortunes baked yet.</p>';
  setBadge('fortune', p.length ? p.length + ' from ' + S.partner.display_name : '');
};

// ---- date wheel (shared ideas + spin log) ----
const ideas = () => { const l = (S.data.date_ideas || []).map((i) => i.idea); return l.length ? l : D.dates; };
let spinning = false;
$('#spinBtn').onclick = () => {
  if (spinning) return; spinning = true; const pool = ideas(); let n = 0;
  const iv = setInterval(async () => {
    $('#wheelOut').textContent = rnd(pool); snd('tick');
    if (++n > 18) {
      clearInterval(iv); spinning = false; hearts(8); snd('ding');
      const { error } = await sb.from('date_spins').insert({ idea: $('#wheelOut').textContent.slice(0, 150) });
      if (error) toast(errMsg(error)); else toast(`Saved! ${S.partner.display_name} will see it too 🎡`);
    }
  }, 80 + n * 4);
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
  $('#bqFrom').textContent = bqCur ? `${S.partner.display_name} asks…` : 'No pending questions — here is a classic:';
  $('#bqText').textContent = bqCur ? bqCur.question : 'Will you love me even when I steal your fries?';
  const sent = l.filter(mine);
  $('#bqSent').innerHTML = sent.map((q) => `<div class="row"><span>${esc(q.question)}<br><small class="muted">${q.answered_at ? `💖 YES! (${q.no_attempts} "no" attempts) ${fmtTime(q.answered_at)}` : 'Waiting for an answer…'}</small></span><button class="mini soft" data-del="big_questions:${q.id}">✕</button></div>`).join('');
  setBadge('question', bqCur ? 'New question!' : '', !!bqCur);
}
RENDER.big_questions = renderBQ;
function bqRun(e) {
  e.preventDefault(); const no = $('#bqNo'), qa = $('#qa'); bqNo++;
  no.style.left = Math.random() * (qa.clientWidth - 90) + 'px'; no.style.top = Math.random() * 85 + 'px';
  no.textContent = noTxt[bqNo % noTxt.length]; $('#bqYes').style.transform = 'scale(' + Math.min(1 + bqNo * .12, 2.2) + ')'; snd('boing');
}
$('#bqNo').addEventListener('pointerdown', bqRun); $('#bqNo').addEventListener('mouseenter', bqRun);
$('#bqYes').onclick = async () => {
  $('#bqNo').style.display = 'none'; hearts(40); confetti(60); snd('win');
  if (bqCur) {
    const { error } = await sb.from('big_questions').update({ answered_at: new Date().toISOString(), no_attempts: bqNo }).eq('id', bqCur.id);
    $('#bqRes').textContent = error ? errMsg(error) : `Correct answer! ${S.partner.display_name} will see your YES 💖`;
    bqCur = null; setTimeout(() => loadTable('big_questions'), 2500);
  } else $('#bqRes').textContent = 'Correct answer! Your fries are officially half mine 🍟❤️';
};
$('#bqAdd').onclick = async () => {
  const question = $('#bqAsk').value.trim(); if (!question) return;
  const { error } = await sb.from('big_questions').insert({ question });
  if (error) return toast(errMsg(error)); $('#bqAsk').value = ''; toast('Question sent 💍 (the No button runs away 😏)'); notify('generic', 'has an important question for you 💍');
};

// ---- scratch card (partner hides prizes) ----
const scr = $('#scr'), sx = scr.getContext('2d'); let scrDown = false, scrDone = false, scrCard = null;
function scrReset() {
  const r = scr.getBoundingClientRect(); scr.width = r.width || 300; scr.height = r.height || 140; scrDone = false; scr.style.transition = ''; scr.style.opacity = 1;
  const gr = sx.createLinearGradient(0, 0, scr.width, scr.height); gr.addColorStop(0, '#c0c0c0'); gr.addColorStop(.5, '#eee'); gr.addColorStop(1, '#b0b0b0');
  sx.globalCompositeOperation = 'source-over'; sx.fillStyle = gr; sx.fillRect(0, 0, scr.width, scr.height);
  sx.fillStyle = '#8b2252'; sx.font = 'bold 20px Trebuchet MS'; sx.textAlign = 'center'; sx.fillText('✨ Scratch here ✨', scr.width / 2, scr.height / 2 + 7);
  const pending = (S.data.scratch_cards || []).filter((c) => c.to_user === S.user.id && !c.scratched_at).sort((a, b) => a.created_at.localeCompare(b.created_at));
  scrCard = pending[0] || null;
  $('#scrTxt').textContent = scrCard ? scrCard.prize : rnd(D.prizes);
  $('#scrFrom').textContent = scrCard ? `🎁 ${S.partner.display_name} hid a prize for you! (${pending.length} waiting)` : 'Scratch to reveal your prize';
}
function scrAt(e) { const r = scr.getBoundingClientRect(); sx.globalCompositeOperation = 'destination-out'; sx.beginPath(); sx.arc((e.clientX - r.left) * scr.width / r.width, (e.clientY - r.top) * scr.height / r.height, 20, 0, 7); sx.fill(); }
async function scrCheck() {
  if (scrDone) return; const d = sx.getImageData(0, 0, scr.width, scr.height).data; let c = 0, tot = 0;
  for (let i = 3; i < d.length; i += 64) { tot++; if (d[i] === 0) c++; }
  if (c / tot > .5) {
    scrDone = true; scr.style.transition = 'opacity .6s'; scr.style.opacity = 0; hearts(12); snd('win');
    if (scrCard) { const id = scrCard.id; scrCard = null; const { error } = await sb.from('scratch_cards').update({ scratched_at: new Date().toISOString() }).eq('id', id); if (error) toast(errMsg(error)); else toast(`${S.partner.display_name} will know you scratched it 😘`); }
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
  if (error) return toast(errMsg(error)); $('#qzQ').value = ''; qzCorrect = 0; qzOptsRender(); toast(`Question added — ${S.partner.display_name} can answer it now 🧠`); notify('quiz', 'added a love-quiz question about themselves 📝');
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
dc.addEventListener('pointermove', (e) => { if (!dDown) return; const p = dPos(e); dx.strokeStyle = dColor === 'rainbow' ? 'hsl(' + (330 + Math.sin(dCount / 20) * 30) + ',80%,55%)' : dColor; dx.lineWidth = 6; dx.lineCap = 'round'; dx.beginPath(); dx.moveTo(dLast[0], dLast[1]); dx.lineTo(p[0], p[1]); dx.stroke(); dLast = p; dCount++; });
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
  $('#drawCap').value = ''; $('#drawClear').onclick(); hearts(10); snd('win'); toast(`Sent to ${S.partner.display_name}'s gallery 🖼️`); notify('drawing', 'drew something for you 🎨');
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
  const us = S.me && S.partner && [S.me.display_name.toLowerCase(), S.partner.display_name.toLowerCase()].sort().join('|') === [a, b].sort().join('|');
  const target = us ? 100 + hashStr(S.couple.id) % 900 : 50 + hashStr([a, b].sort().join('|')) % 51;
  let p = 0; const iv = setInterval(() => {
    p += Math.ceil((target - p) / 8) || 1; t.textContent = 'Calculating… ' + p + '%'; snd('tick');
    if (p >= target) { clearInterval(iv); t.textContent = target + '% compatible! ' + (us ? rnd(['The machine is crying 🥹', 'Soulmates confirmed 💞', 'Off the charts. Literally.']) : 'Not bad… but not you two 😏'); hearts(15); snd('win'); }
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
  const msg = $('#fMsg'); msg.style.opacity = 0; const p = S.partner?.display_name || 'my love';
  const lines = ['You made it to the end… 💫', "But this isn't the end.", `It's just the beginning of ${S.me?.display_name || 'you'} & ${p}.`, 'Today, tomorrow, and every fry-stealing day after. ❤️', '(tap anywhere to go back)'];
  fwTimers.forEach(clearTimeout); fwTimers = [];
  for (let i = 0; i < 12; i++) fwTimers.push(setTimeout(() => { fwBurst(Math.random() * fc.width, Math.random() * fc.height * .6); snd('pop'); }, i * 450));
  fwTimers.push(setTimeout(() => { fwHeart(); snd('win'); }, 5600));
  lines.forEach((l, i) => fwTimers.push(setTimeout(() => { msg.style.opacity = 0; fwTimers.push(setTimeout(() => { msg.textContent = l; msg.style.opacity = 1; if (i === lines.length - 1) fwDone = true; }, 500)); }, i * 2600)));
  fwTimers.push(setTimeout(() => { confetti(120); hearts(40); }, 9000));
};
$('#finale').onclick = () => { if (!fwDone) return; fwRun = false; fwTimers.forEach(clearTimeout); fwTimers = []; $('#finale').classList.add('hidden'); };

// compat default names once couple loads
function initGames() {
  $('#cpN1').value = S.me.display_name; $('#cpN2').value = S.partner.display_name; $('#calcTxt').textContent = '';
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
function openFeat(f) {
  curFeat = f; $('#usHome').classList.add('hidden'); $('#featPanel').classList.remove('hidden');
  $$('.feat').forEach((p) => p.classList.toggle('on', p.dataset.panel === f)); window.scrollTo(0, 0);
  (FEAT_RENDER[f] || (() => {}))();
}
function goTab(tab) { $$('.nav button').forEach((x) => x.classList.toggle('on', x.dataset.tab === tab)); $$('.tab').forEach((t) => t.classList.add('hidden')); $('#tab-' + tab).classList.remove('hidden'); window.scrollTo(0, 0); }
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
  const html = `<div class="streak"><div class="flame">🔥 ${st.current}<small>day streak</small></div><div class="flame">🏆 ${st.best}<small>best</small></div></div>
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
    if (error) return toast(errMsg(error)); hearts(8); snd('ding'); notify('daily', 'answered today\'s question ❓');
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
  toast('Checked in 💗'); snd('ding');
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
  $('#moodWeek').innerHTML = `<div class="mweek"><span></span>${days.map((d) => `<small>${parseDay(d).toLocaleDateString(undefined, { weekday: 'narrow' })}</small>`).join('')}${row(S.user.id, 'You')}${row(S.partner.id, esc(S.partner.emoji))}</div>`;
  setFB('mood', lp ? `${S.partner.display_name}: ${lp.mood}` : '', lp && lp.signal && Date.now() - new Date(lp.created_at) < 86400000);
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
  $('#jar').innerHTML = l.slice(0, 60).map((g) => mine(g) ? '💗' : '💜').join('');
  $('#gratList').innerHTML = (gratView === 'week' ? `<p class="muted">This week: ${sel.filter(mine).length} from you, ${sel.filter((g) => !mine(g)).length} from ${pn()}</p>` : '') +
    (sel.length ? sel.map((g) => `<div class="row"><span>${mine(g) ? '💗 You → ' + pn() : '💜 ' + pn() + ' → you'}: ${esc(g.body)}</span>${mine(g) ? `<button class="mini soft" data-del="gratitude:${g.id}">✕</button>` : `<small>${fmtDate(g.created_at)}</small>`}</div>`).join('') : '<p class="muted">The jar is waiting for some love 🫙</p>');
  setFB('grat', l.length + ' in jar'); renderStreak();
};

// ---- 10. journal ----
$('#jDate').value = dayStr();
$('#jDate').onchange = () => { const e = (S.data.journal || []).find((j) => mine(j) && j.day === $('#jDate').value); $('#jBody').value = e ? e.body : ''; };
$('#jSave').onclick = async () => {
  const day = $('#jDate').value || dayStr(), body = $('#jBody').value.trim(); if (!body) return;
  const ex = (S.data.journal || []).find((j) => mine(j) && j.day === day);
  const { error } = ex ? await sb.from('journal').update({ body, updated_at: new Date().toISOString() }).eq('id', ex.id) : await sb.from('journal').insert({ day, body });
  if (error) return toast(errMsg(error)); toast('Saved 📔'); loadTable('journal');
};
RENDER.journal = () => {
  const l = S.data.journal || []; const days = [...new Set(l.map((j) => j.day))].sort().reverse();
  if (!$('#jBody').value) $('#jDate').onchange();
  $('#jList').innerHTML = days.length ? days.map((d) => { const m = l.find((j) => mine(j) && j.day === d), p = l.find((j) => !mine(j) && j.day === d);
    return `<h3 class="gsec">${fmtDay(d)}</h3><div class="side"><div class="ans"><small>You ${m ? `<a href="#" data-jedit="${d}">✏️</a>` : ''}</small>${m ? esc(m.body) : '<i>—</i>'}</div><div class="ans"><small>${pn()}</small>${p ? esc(p.body) : '<i>—</i>'}</div></div>`; }).join('') : '<p class="muted">Start your shared diary ✨</p>';
  const t = l.find((j) => !mine(j) && j.day === dayStr()); setFB('journal', t ? `${S.partner.display_name} wrote today` : '', !!t);
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
  $('#q36Bar').style.width = (both / 36 * 100) + '%'; $('#q36Prog').textContent = `Together: ${both}/36 · You ${mineSet.size} · ${S.partner.display_name} ${pSet.size}`;
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
  $('#bkTodo').innerHTML = todo.length ? todo.map((b) => `<div class="bk"><span class="em">${esc(b.emoji || '✨')}</span><span>${esc(b.title)}<br><small class="muted">added by ${esc(nameOf(b.created_by))}</small></span><button class="mini" data-bk="done:${b.id}">✓</button><button class="mini soft" data-bk="edit:${b.id}">✏️</button><button class="mini soft" data-del="bucket_items:${b.id}">✕</button></div>`).join('') : '<p class="muted">Dream big together ✨</p>';
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
  if (error) toast(errMsg(error)); else { if (act === 'done') { confetti(60); snd('win'); } loadTable('bucket_items'); }
});
function pickFile(accept = 'image/*') {
  return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); window.addEventListener('focus', () => setTimeout(() => res(i.files[0] || null), 800), { once: true }); i.click(); });
}

const FEAT_RENDER = { dq: renderDQ, mood: () => RENDER.moods(), grat: () => RENDER.gratitude(), journal: () => RENDER.journal(), weekly: renderWeekly, chal: () => RENDER.challenge_done(), q36: renderQ36, ll: renderLL, bucket: () => RENDER.bucket_items() };

// ================= BATCH 2–4 =================
const linkHtml = (u) => u && /^https:\/\//.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${/spotify/.test(u) ? '🟢 Spotify' : /youtu/.test(u) ? '▶️ YouTube' : /apple/.test(u) ? '🍎 Apple' : '🔗 Link'}</a>` : '';
const cleanUrl = (u) => { u = (u || '').trim(); if (!u) return null; if (!/^https:\/\//i.test(u)) u = 'https://' + u.replace(/^http:\/\//i, ''); return u.slice(0, 500); };

// ---- push notifications ----
async function notify(kind, text) {
  try { if (!S.couple) return; await sb.functions.invoke('notify', { body: { kind, text } }); } catch (e) { /* best effort */ }
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
    return `<div class="bk"><span class="em">🎁</span><span><b>${esc(w.title)}</b>${w.price ? ` · ${esc(w.price)}` : ''} ${linkHtml(w.url)}${w.note ? `<br><small class="muted">${esc(w.note)}</small>` : ''}${!own && c ? `<br><small>🤫 ${c.created_by === S.user.id ? 'You got this' : 'claimed'}</small>` : ''}</span>${own ? `<button class="mini soft" data-del="wishlist:${w.id}">✕</button>` : c ? (mine(c) ? `<button class="mini soft" data-unclaim="${c.id}">Undo</button>` : '') : `<button class="mini" data-claim="${w.id}">I got this 🤫</button>`}</div>`; };
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
  $('#swTurn').textContent = `Week ${wk.split('-W')[1]} · ${myTurn ? "It's your turn to pick 🎶" : `${S.partner.display_name}'s turn to pick`}`;
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
    return `<div class="bk"><span class="em">🎵</span><span><b>${esc(s.title)}</b>${s.artist ? ' — ' + esc(s.artist) : ''} ${linkHtml(s.url)}${s.note ? `<br><i class="muted">${esc(s.note)}</i>` : ''}<br><small class="muted">added by ${esc(nameOf(s.created_by))}</small></span><button class="mini ${myLike ? '' : 'soft'}" data-like="${s.id}" data-lid="${myLike?.id || ''}">${myLike ? '💖' : '🤍'} ${lk.length}</button>${mine(s) ? `<button class="mini soft" data-del="playlist:${s.id}">✕</button>` : ''}</div>`; }).join('') : '<p class="muted">Add the songs that are “us” 🎧</p>';
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
  if (!evEditing && await uiConfirm(`Notify ${S.partner.display_name} about this plan? 🔔`)) notify('generic', `added a plan: ${row.emoji} ${title} (${fmtTime(row.starts_at)})`);
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
RENDER.milestones = renderMiles; RENDER.couple_settings = renderMiles;
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
    return `<div class="goal"><b>${esc(g.emoji)} ${esc(g.title)}</b>${pct >= 100 ? ' 🎉' : ''}<div class="meter"><div class="barfill" style="width:${pct}%"></div></div><small>${+sum.toFixed(2)}${unit} / ${+Number(g.target)}${unit} (${Math.round(pct)}%) · You ${+by(S.user.id).toFixed(2)} · ${pn()} ${+by(S.partner.id).toFixed(2)}</small><br>
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
const TQ = window.CC_TRIVIA || [];
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
      const { error } = await sb.from('trivia_results').insert({ day: dayStr(), score, picks }); if (error) toast(errMsg(error)); else { confetti(50); snd('win'); notify('generic', `scored ${score}/10 in tonight's trivia 🧠 your turn!`); }
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

// initial session (onAuthStateChange also fires INITIAL_SESSION)
sb.auth.getSession().then(({ data }) => { if (!S.user && !data.session && !booting) { show('#authView'); if (localStorage.getItem(ACTION_KEY)) $('#authMsg').textContent = 'Sign in to send your ping 💗'; } });
})();

