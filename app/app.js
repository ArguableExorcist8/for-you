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
  big_questions: { order: 'created_at', asc: false }
};
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
    });
  });
  ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${S.couple.id}` }, (p) => {
    if (!p.new.active) { toast('You are no longer connected 💔'); boot(); }
  });
  ch.subscribe();
  S.channel = ch;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.couple) Object.keys(TABLES).forEach(loadTable); });

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
  toast('Letter sealed with a kiss 💋');
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
  if (error) return toast(errMsg(error)); $('#bqAsk').value = ''; toast('Question sent 💍 (the No button runs away 😏)');
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
  if (error) return toast(errMsg(error)); $('#scrPrize').value = ''; toast('Prize hidden 🤫');
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
  if (error) return toast(errMsg(error)); $('#owTitle').value = $('#owBody').value = ''; toast('Envelope sealed ✉️');
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
  if (error) return toast(errMsg(error)); $('#qzQ').value = ''; qzCorrect = 0; qzOptsRender(); toast(`Question added — ${S.partner.display_name} can answer it now 🧠`);
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
  $('#drawCap').value = ''; $('#drawClear').onclick(); hearts(10); snd('win'); toast(`Sent to ${S.partner.display_name}'s gallery 🖼️`);
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

// initial session (onAuthStateChange also fires INITIAL_SESSION)
sb.auth.getSession().then(({ data }) => { if (!S.user && !data.session && !booting) { show('#authView'); if (localStorage.getItem(ACTION_KEY)) $('#authMsg').textContent = 'Sign in to send your ping 💗'; } });
})();

