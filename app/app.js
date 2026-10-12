(() => {
'use strict';
const { url, key } = window.CC_CONFIG;
const D = window.CC_DATA;
const sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
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
  letters: { order: 'updated_at', asc: false }
};
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
  await Promise.all(Object.keys(TABLES).map(loadTable));
  subscribeCouple();
  runPendingAction();
}
function subscribeCouple() {
  const ch = sb.channel('couple-' + S.couple.id);
  Object.keys(TABLES).forEach((t) => {
    ch.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: `couple_id=eq.${S.couple.id}` }, (payload) => {
      if (t === 'pings' && payload.eventType === 'INSERT' && payload.new.to_user === S.user.id) showPingFrom(payload.new);
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
  if (!confirm('Delete this?')) return;
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
      const caption = files.length === 1 ? (prompt('Add a caption? 💕') || '').slice(0, 300) : '';
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
  if (!confirm('Redeem this coupon now? 🎉')) return;
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
  if (!confirm(`Disconnect from ${S.partner.display_name}? Your shared space will be hidden.`)) return;
  const { error } = await sb.rpc('disconnect');
  if (error) return toast(errMsg(error));
  boot();
};

// ================= GAMES =================
// love-o-meter
let meter = 0, meterTimer = null;
const meterLines = [[20, 'Warming up… 😊'], [50, 'Getting toasty 🔥'], [80, 'Dangerously in love 😍'], [100, 'OFF THE CHARTS 💯💗']];
$('#meterBtn').onclick = () => {
  meter = Math.min(100, meter + 7); $('#bar').style.width = meter + '%';
  $('#meterTxt').textContent = (meterLines.find(([v]) => meter <= v) || meterLines[3])[1];
  if (meter >= 100) floatHearts(document.body, 8);
  clearInterval(meterTimer);
  meterTimer = setInterval(() => { meter = Math.max(0, meter - 2); $('#bar').style.width = meter + '%'; if (!meter) clearInterval(meterTimer); }, 200);
};
// memory match (opacity-based reveal, no 3D transforms — iOS Safari safe)
let memOpen = [], memLock = false, memMoves = 0;
function memReset() {
  const icons = [...D.memoryIcons, ...D.memoryIcons].sort(() => Math.random() - 0.5);
  memOpen = []; memLock = false; memMoves = 0; $('#memTxt').textContent = '';
  $('#mem').innerHTML = icons.map((ic) => `<div class="mc" data-ic="${ic}"><span class="back">?</span><span class="face">${ic}</span></div>`).join('');
}
$('#mem').onclick = (e) => {
  const c = e.target.closest('.mc');
  if (!c || memLock || c.classList.contains('open') || c.classList.contains('done')) return;
  c.classList.add('open'); memOpen.push(c);
  if (memOpen.length < 2) return;
  memMoves++; const [a, b] = memOpen; memOpen = [];
  if (a.dataset.ic === b.dataset.ic) {
    a.classList.replace('open', 'done'); b.classList.replace('open', 'done');
    if (!$$('#mem .mc:not(.done)').length) { $('#memTxt').textContent = `You won in ${memMoves} moves! Prize: one kiss 💋`; floatHearts(document.body, 12); }
  } else { memLock = true; setTimeout(() => { a.classList.remove('open'); b.classList.remove('open'); memLock = false; }, 800); }
};
$('#memReset').onclick = memReset; memReset();
// reasons
let lastReason = -1;
$('#reasonBtn').onclick = () => {
  let i; do { i = Math.floor(Math.random() * D.reasons.length); } while (i === lastReason && D.reasons.length > 1);
  lastReason = i; $('#reason').textContent = D.reasons[i] + ' 💖';
};
// hug
$('#hugBtn').onclick = () => { $('#hugOverlay').classList.remove('hidden'); if (navigator.vibrate) navigator.vibrate(300); };
$('#hugOverlay').onclick = () => $('#hugOverlay').classList.add('hidden');

// initial session (onAuthStateChange also fires INITIAL_SESSION)
sb.auth.getSession().then(({ data }) => { if (!S.user && !data.session && !booting) { show('#authView'); if (localStorage.getItem(ACTION_KEY)) $('#authMsg').textContent = 'Sign in to send your ping 💗'; } });
})();

