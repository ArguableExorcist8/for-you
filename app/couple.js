// For Us v25 — "two bodies, one mind"
// Daily ritual · needs · guess their answer · repair mode · touch · together · goodnight
// on this day · love their way · try this today · state of us · future map
// private chat lock · year book · usage-ordered menus
(() => {
'use strict';
const F = () => window.__FU;
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } };
const S = () => F().S;
const me = () => S().user?.id, them = () => S().partner?.id;
const pname = () => F().partnerName() || 'your love';
const ago = (t) => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
const svg = (d, cls = '') => `<svg class="fi ${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const DOVE = '<path d="M21 4c-3 0-5 1.5-6 4-1-1-3-1.5-5-1 1 1 1.6 2 1.8 3.2C9 10 6 10.6 3 13c2.5.4 4.5 1.4 6 3l-2 4 4-2.4c3.6 1.2 8-1 9-5.6.3-1.4.2-2.6 1-4l-2-.4c.5-1.3 1.2-2.6 2-3.6z"/>';

// ======================= data =======================
const T = {}; const HAS = new Set(); let triedLoad = false;
const TBL = {
  needs: ['created_at', false, 80], dq_guesses: ['day', false, 160], dq_verdicts: ['created_at', false, 300],
  repairs: ['created_at', false, 30], repair_notes: ['created_at', false, 60], touches: ['created_at', false, 20],
  goodnights: ['day', false, 30], weekly_extra: ['week', false, 60], future_map: ['topic', true, 200],
  feature_usage: ['n', false, 200], couple_vault: ['created_at', false, 1],
};
const RENDERERS = {};
const missing = (e) => e && (/PGRST20[0-9]|42P01/.test(e.code || '') || /does not exist|schema cache|Could not find the table/i.test(e.message || ''));
async function load(t) {
  const [o, asc, lim] = TBL[t]; const c = S().couple; if (!c) return;
  const { data, error } = await F().sb.from(t).select('*').eq('couple_id', c.id).order(o, { ascending: asc }).limit(lim);
  if (error) {
    if (missing(error)) { HAS.delete(t); return; }
    const cached = await F().cacheGet(`v25:${c.id}:${t}`); if (cached) { T[t] = cached; HAS.add(t); }
    return;
  }
  HAS.add(t); T[t] = data || []; F().cacheSet(`v25:${c.id}:${t}`, T[t]);
}
const has = (t) => HAS.has(t);
async function reload(t) { await load(t); paint(); }
let chan = null;
function subscribe() {
  if (chan) { F().sb.removeChannel(chan); chan = null; }
  const c = S().couple; if (!c) return;
  chan = F().sb.channel('v25-' + c.id, { config: { presence: { key: me() }, broadcast: { self: false } } });
  [...HAS].forEach((t) => chan.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: `couple_id=eq.${c.id}` }, (p) => onChange(t, p)));
  chan.on('presence', { event: 'sync' }, () => { together = Object.keys(chan.presenceState()).includes(them()); paintStatus(); chatStatus(); });
  chan.on('broadcast', { event: 'touch' }, (p) => { if (p.payload?.from !== me()) playTouch(p.payload.pattern, p.payload.id); });
  chan.subscribe((st) => { if (st === 'SUBSCRIBED' && !document.hidden) chan.track({ at: Date.now() }); });
}
function onChange(t, p) {
  const row = p.new || {};
  if (t === 'touches' && p.eventType === 'INSERT' && row.created_by !== me()) setTimeout(() => replayUnplayed(), 600);
  if (t === 'repairs' && p.eventType === 'INSERT' && row.created_by !== me()) F().toast(`🕊️ ${pname()} asked for a pause. Breathe — you'll talk soon.`, 5000);
  if (t === 'goodnights' && p.eventType === 'INSERT' && row.created_by !== me()) F().toast(`🌙 ${pname()} said goodnight`, 3500);
  if (t === 'needs' && p.eventType === 'INSERT' && row.created_by !== me()) F().toast(`${pname()} needs ${needLabel(row.need)}`, 4000);
  reload(t);
}
document.addEventListener('visibilitychange', () => { if (!chan) return; if (document.hidden) chan.untrack(); else chan.track({ at: Date.now() }); });

window.FU_enter = async () => {
  ensureDom(); try { paint(); } catch { /* data not here yet */ }
  await Promise.all(Object.keys(TBL).map((t) => load(t).then(() => { triedLoad = true; try { paint(); } catch { /* */ } }))); triedLoad = true;
  subscribe(); paint(); orderMenus();
  try { await F().sb.rpc('fu_set_tz', { z: Intl.DateTimeFormat().resolvedOptions().timeZone }); } catch { /* not installed yet */ }
  await vaultInit();
  replayUnplayed();
  pickSpotlight(); paintSpot();
  const k = F().params.get('k');
  if (k === 'repair') { F().goTab('home'); setTimeout(() => repairSheet(), 400); history.replaceState(null, '', location.pathname); }
  if (k === 'otd') { F().goTab('home'); setTimeout(() => $('#fuOTD')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 600); history.replaceState(null, '', location.pathname); }
  clearInterval(tick); tick = setInterval(() => { paintStatus(); paintNight(); }, 30000);
};
window.FU_resume = () => { Object.keys(TBL).forEach((t) => load(t)); setTimeout(() => { paint(); replayUnplayed(); }, 900); };
window.FU_leave = () => { if (chan) { F().sb.removeChannel(chan); chan = null; } clearInterval(tick); };
let tick = null, together = false;

// ===================== DOM scaffolding =====================
function ensureDom() {
  if ($('#fuRitual')) return;
  const home = $('#tab-home'), hi = $('#homeHi'), today = home.querySelector('.card.today');
  hi.insertAdjacentHTML('afterend', `
    <div id="fuStatus" class="fuStatus"></div>
    <div class="card fuRitual" id="fuRitual"></div>
    <div class="card fuCard hidden" id="fuNight"></div>
    <div class="card fuCard hidden" id="fuOTD"></div>
    <div class="card fuCard hidden" id="fuLove"></div>
    <div class="card fuCard hidden fuSpot" id="fuSpot"></div>`);
  today.classList.add('fuOld');                    // the old "Today" card is folded into the ritual
  const streak = $('#homeStreak'); if (streak) { streak.classList.add('fuStreak'); }
  // touch button in the "Thinking of you" card
  const pc = home.querySelector('.ping-card');
  if (pc && !$('#fuTouchBtn')) pc.insertAdjacentHTML('beforeend', `<button class="soft fuTouchBtn" id="fuTouchBtn">🫶 Send a touch</button>`);
  $('#fuTouchBtn').onclick = touchSheet;
  // chat header: pause button + lock pill
  const head = $('.chatHead');
  if (head && !$('#chPause')) head.querySelector('.chGear').insertAdjacentHTML('beforebegin', `<button class="chIco chPause" id="chPause" aria-label="Ask for a pause">${svg(DOVE)}</button>`);
  $('#chPause').onclick = repairSheet;
  // Us tab: a section for hard moments & the long run
  const usHome = $('#usHome');
  if (usHome && !$('#fuUsSec')) {
    usHome.querySelector('.card').insertAdjacentHTML('afterend', `
      <h3 class="gsec" id="fuUsSec">🕊️ Hard moments &amp; the long run</h3>
      <div class="ggrid">
        <button class="gtile" data-fu="repair"><b>🕊️</b>Pause &amp; repair<small id="fb-repair"></small></button>
        <button class="gtile" data-fu="future"><b>🧭</b>Future map<small id="fb-future"></small></button>
        <button class="gtile" data-fu="sync"><b>🔮</b>In sync<small id="fb-sync"></small></button>
      </div>`);
    usHome.querySelectorAll('[data-fu]').forEach((b) => b.onclick = () => { FU_used('fu:' + b.dataset.fu); ({ repair: repairHistory, future: futureMap, sync: syncSheet })[b.dataset.fu](); });
  }
  // weekly check-in becomes "State of us"
  const wkTile = $('[data-feat="weekly"]'); if (wkTile) wkTile.innerHTML = wkTile.innerHTML.replace('Weekly check-in', 'State of us');
  const wkPanel = $('[data-panel="weekly"]');
  if (wkPanel && !$('#fuSou')) {
    wkPanel.querySelector('h2').textContent = '🤝 State of us';
    wkPanel.querySelector('h2').insertAdjacentHTML('afterend', `<div id="fuSou" class="fuSou"></div>`);
    wkPanel.insertAdjacentHTML('beforeend', `<div id="fuSouEnd"></div>`);
  }
  // settings: private lock + year book
  const meTab = $('#tab-me');
  if (meTab && !$('#fuLockCard')) {
    const anchor = [...meTab.querySelectorAll('.card')].find((c) => /Chat/.test(c.querySelector('h2')?.textContent || '')) || meTab.querySelector('.card');
    anchor.insertAdjacentHTML('afterend', `
      <div class="card" id="fuLockCard"><h2>🔐 Private lock</h2><div id="fuLock"></div></div>
      <div class="card" id="fuBookCard"><h2>📖 Our year book</h2>
        <p class="muted">Every photo, moment, appreciation and answer from a year — as a book you can save as PDF or keep as a file.</p>
        <div class="seg" id="fuBookYear"></div>
        <button id="fuBookPrint">Make the book 📖</button> <button class="soft" id="fuBookFile">Save as file</button></div>`);
    $('#fuBookPrint').onclick = () => yearBook(true); $('#fuBookFile').onclick = () => yearBook(false);
  }
}

function paint() {
  if (!S().couple || !$('#fuRitual')) return;
  paintStatus(); paintRitual(); paintNight(); paintOTD(); paintLove(); paintSou(); paintBadges(); paintLock(); chatStatus(); paintBookYears();
}
// existing renderers re-paint us when their data changes
const wrap = (t, fn) => { const R = F().RENDER; const old = R[t]; R[t] = (...a) => { const r = old && old(...a); try { fn(); } catch (e) { console.warn('fu', t, e); } return r; }; };
let wrapped = false;
function wrapOnce() {
  if (wrapped || !F()) return; wrapped = true;
  ['moods', 'daily_answers', 'gratitude', 'love_languages', 'photos', 'timeline', 'milestones'].forEach((t) => wrap(t, () => { if (triedLoad) { paintRitual(); paintStatus(); paintOTD(); paintLove(); } }));
  wrap('weekly_checkins', () => paintSou());
}
const boot = setInterval(() => { if (window.__FU) { clearInterval(boot); wrapOnce(); } }, 50);

// ======================= needs =======================
const NEEDS = [['hug', '🤗', 'a hug'], ['talk', '💬', 'to talk'], ['reassure', '🫶', 'reassurance'], ['space', '🌙', 'some space'],
  ['quiet', '🤫', 'quiet company'], ['fun', '🎈', 'something fun'], ['food', '🍜', 'food'], ['help', '🧽', 'a hand with things'], ['ok', '😌', 'nothing — I\'m good']];
const needOf = (k) => NEEDS.find((n) => n[0] === k) || ['?', '💭', k];
const needLabel = (k) => { const n = needOf(k); return `${n[1]} ${n[2]}`; };
const latestNeed = (uid) => (T.needs || []).find((n) => n.created_by === uid && Date.now() - new Date(n.created_at) < 14 * 3600e3);
async function setNeed(k, note) {
  const { error } = await F().sb.from('needs').insert({ need: k, note: note || null });
  if (error) return F().toast(F().isNetErr(error) ? 'Offline — try again in a moment 📶' : error.message);
  F().snd('pop'); if (k !== 'ok') F().notify(['hug', 'reassure', 'space', 'talk'].includes(k) ? 'mood' : 'mood', `needs ${needLabel(k)} right now`);
  await reload('needs');
}

// ===================== status strip =====================
const LOW = ['😢', '😤', '😰', '😔', '🤒'];
const activeRepair = () => (T.repairs || []).find((r) => !r.closed_at && Date.now() - new Date(r.created_at) < 36 * 3600e3);
function paintStatus() {
  const box = $('#fuStatus'); if (!box || !S().partner) return;
  const p = pname(), pe = F().partnerEmoji(); let h = '';
  const r = activeRepair();
  if (r) {
    const left = new Date(r.ends_at) - Date.now();
    h += left > 0
      ? `<button class="fuBanner calm" data-act="breathe"><span class="dove">${svg(DOVE)}</span><span><b>Pause · back together at ${F().hhmm(r.ends_at)}</b><small>${Math.ceil(left / 60000)} min · tap to breathe</small></span></button>`
      : `<button class="fuBanner warm" data-act="repair"><span class="dove">${svg(DOVE)}</span><span><b>Ready to talk? 🕊️</b><small>Write what you felt and needed — you'll both see them together</small></span></button>`;
  }
  const pn = latestNeed(them());
  const chips = [];
  if (together) chips.push(`<span class="fuChip here"><i></i>${esc(p)} is here now</span>`);
  if (pn && pn.need !== 'ok') chips.push(`<button class="fuChip need" data-act="answer:${pn.need}">${esc(pe)} ${esc(p)} needs <b>${esc(needLabel(pn.need))}</b><small>${ago(pn.created_at)}</small></button>`);
  const mine = latestNeed(me());
  if (has('needs')) chips.push(`<button class="fuChip mine" data-act="need">${mine ? `You: ${esc(needLabel(mine.need))}` : 'What do you need? ✏️'}</button>`);
  if (chips.length) h += `<div class="fuChips">${chips.join('')}</div>`;
  // gentle suggestion when today looks heavy
  const lm = F().latestMood(me()), today = F().dayStr();
  const heavy = (lm && lm.day === today && LOW.includes(lm.mood)) || (mine && mine.need === 'space');
  if (heavy && !r && has('repairs') && LS('fu_pause_hint') !== today) h += `<div class="fuHint"><span>Rough day? If things got heated, a pause can help 🕊️</span><button class="soft mini" data-act="repair">Need a pause?</button><button class="fuX" data-act="hidehint" aria-label="Hide">✕</button></div>`;
  box.innerHTML = h;
}
$('body').addEventListener('click', (e) => {
  const a = e.target.closest('#fuStatus [data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'breathe') breathe(); else if (act === 'repair') repairSheet(); else if (act === 'need') needSheet();
  else if (act === 'hidehint') { LS('fu_pause_hint', F().dayStr()); paintStatus(); }
  else if (act.startsWith('answer:')) answerNeed(act.split(':')[1]);
});
function needSheet() {
  $('#modalBox').onclick = null;
  F().openModal(`<h2>What do you need right now?</h2><p class="muted">${esc(pname())} sees it on their Home screen. Change it anytime.</p>
    <div class="fuNeedGrid">${NEEDS.map(([k, e, l]) => `<button class="fuNeed" data-need="${k}"><b>${e}</b>${esc(l)}</button>`).join('')}</div>
    <input id="fuNeedNote" maxlength="200" placeholder="Add a few words (optional)">`);
  $('#modalBox').onclick = async (e) => { const b = e.target.closest('[data-need]'); if (!b) return; await setNeed(b.dataset.need, $('#fuNeedNote').value.trim()); F().closeModal(); };
}
function answerNeed(k) {
  const p = pname();
  if (k === 'hug' || k === 'reassure') return touchSheet(true);
  if (k === 'talk' || k === 'quiet') return F().goTab('chat');
  if (k === 'space') return sendLine(`Take the space you need — I'm right here when you're ready 🌙`);
  if (k === 'fun') return F().goTab('play');
  sendLine(`I saw you need ${needLabel(k).replace(/^\S+ /, '')} — on it 💗`);
  void p;
}
async function sendLine(t) { const ok = await F().uiConfirm(`Send to ${pname()}?\n\n“${t}”`); if (!ok) return; await F().chSendText(t); F().toast('Sent 💗'); }

// ===================== daily ritual =====================
const day = () => F().dayStr();
const skip = (k) => LS(`fu_skip_${day()}_${k}`) === '1';
function ritualState() {
  const d = S().data, t = day(), u = me();
  const mood = (d.moods || []).find((m) => m.created_by === u && m.day === t);
  const need = (T.needs || []).find((n) => n.created_by === u && F().dayStr(new Date(n.created_at)) === t);
  const ans = (d.daily_answers || []).find((a) => a.created_by === u && a.day === t);
  const guess = (T.dq_guesses || []).find((g) => g.created_by === u && String(g.day) === t);
  const grat = (d.gratitude || []).find((g) => g.created_by === u && g.day === t);
  const steps = [
    { k: 'mood', done: !!mood },
    { k: 'need', done: !!need || skip('need') || !has('needs') },
    { k: 'q', done: !!ans },
    { k: 'appr', done: !!grat || skip('appr') },
  ];
  return { mood, need, ans, guess, grat, steps, cur: steps.find((s) => !s.done) };
}
function paintRitual() {
  const box = $('#fuRitual'); if (!box || !S().partner) return;
  const st = ritualState(), p = esc(pname()), D = F().D;
  const dots = st.steps.map((s) => `<i class="${s.done ? 'on' : ''}${st.cur && st.cur.k === s.k ? ' cur' : ''}"></i>`).join('');
  const head = (title, sub) => `<div class="fuRHead"><div><small>Today's ritual · 3 minutes</small><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}</div><div class="fuDots">${dots}</div></div>`;
  let h = '';
  if (!st.cur) { h = ritualSummary(st); }
  else if (st.cur.k === 'mood') h = head('How are you feeling?', `${p} sees it too`) + `<div class="emojis fuMoods">${D.moods.map((m) => `<span data-mood="${m}">${m}</span>`).join('')}</div>`;
  else if (st.cur.k === 'need') h = head('What do you need today?', 'One tap — it helps them read you right') + `<div class="fuNeedGrid">${NEEDS.map(([k, e, l]) => `<button class="fuNeed" data-rneed="${k}"><b>${e}</b>${esc(l)}</button>`).join('')}</div><button class="fuSkip" data-skip="need">Skip</button>`;
  else if (st.cur.k === 'q') {
    const q = D.dailyQs[F().dqIndex(day())];
    const canGuess = has('dq_guesses') && !st.guess && !skip('guess');
    h = head(canGuess ? `Guess first 🔮` : 'Today\'s question', canGuess ? `What will ${p} say? You'll see how close you were.` : `${p} sees your answer once they answer too`)
      + `<p class="fuQ">${esc(q)}</p>`
      + (canGuess
        ? `<textarea id="fuGuess" maxlength="1000" placeholder="I think ${p} will say…"></textarea><div class="fuRow"><button id="fuGuessSave">Lock in my guess 🔮</button><button class="fuSkip" data-skip="guess">Skip guessing</button></div>`
        : `${st.guess ? `<div class="fuGuessMine">🔮 Your guess: <i>${esc(st.guess.guess)}</i></div>` : ''}<textarea id="fuAns" maxlength="1000" placeholder="Your answer…"></textarea><button id="fuAnsSave">Answer 💬</button>`);
  } else if (st.cur.k === 'appr') h = head(`One thing you appreciated about ${p}`, 'Be specific — "the way you…" lands better than "you\'re great"') + `<textarea id="fuAppr" maxlength="500" placeholder="Today I appreciated how you…"></textarea><div class="fuRow"><button id="fuApprSave">Drop it in the jar 🫙</button><button class="fuSkip" data-skip="appr">Skip</button></div>`;
  const streak = $('#homeStreak');
  box.innerHTML = h; if (streak) box.appendChild(streak);
  box.classList.toggle('done', !st.cur);
}
function ritualSummary(st) {
  const d = S().data, t = day(), p = esc(pname()), D = F().D, u = me(), v = them();
  const pm = (d.moods || []).find((m) => m.created_by === v && m.day === t), pnd = latestNeed(v);
  const pans = (d.daily_answers || []).find((a) => a.created_by === v && a.day === t);
  const theirGuess = (T.dq_guesses || []).find((g) => g.created_by === v && String(g.day) === t);
  const myVerdict = theirGuess && (T.dq_verdicts || []).find((x) => x.guess_id === theirGuess.id);
  const theirVerdict = st.guess && (T.dq_verdicts || []).find((x) => x.guess_id === st.guess.id);
  const V = { spot: '🎯 Spot on', close: '🤏 Close', nope: '🙈 Not quite' };
  const col = (who, mood, need) => `<div class="fuCol"><small>${who}</small><b class="fuBig">${mood ? esc(mood.mood) : '·'}</b><span>${need ? esc(needLabel(need.need)) : '<i>—</i>'}</span></div>`;
  const sync = syncScore();
  return `<div class="fuRHead"><div><small>Today's ritual · done ✨</small><h2>You're in tune today</h2></div><div class="fuDots"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></div></div>
    <div class="fuCols">${col('You', st.mood, st.need)}${col(p, pm, pnd)}</div>
    <p class="fuQ sm">${esc(D.dailyQs[F().dqIndex(t)])}</p>
    <div class="fuCols fuAnsRow"><div class="fuCol"><small>You</small><span>${esc(st.ans.answer)}</span></div><div class="fuCol ${pans ? '' : 'wait'}"><small>${p}</small><span>${pans ? esc(pans.answer) : `⏳ ${p} hasn't answered yet`}</span></div></div>
    ${st.guess && pans ? `<div class="fuGuessRes"><small>🔮 You guessed</small><i>${esc(st.guess.guess)}</i><b>${theirVerdict ? V[theirVerdict.verdict] : `${p} hasn't judged it yet`}</b></div>` : ''}
    ${theirGuess ? `<div class="fuGuessRes them"><small>🔮 ${p} guessed you'd say</small><i>${esc(theirGuess.guess)}</i>${myVerdict ? `<b>${V[myVerdict.verdict]}</b>` : `<div class="fuVerdict">${Object.entries(V).map(([k, l]) => `<button class="soft mini" data-verdict="${k}" data-g="${theirGuess.id}">${l}</button>`).join('')}</div>`}</div>` : ''}
    ${sync.n >= 3 ? `<div class="fuSync"><span>In sync</span><div class="fuMeter"><i style="width:${sync.pct}%"></i></div><b>${sync.pct}%</b></div>` : ''}`;
}
$('body').addEventListener('click', async (e) => {
  const box = e.target.closest('#fuRitual'); if (!box) return;
  const t = e.target, sb = F().sb;
  if (t.dataset.mood) { t.classList.add('on'); FU_used('mood'); await F().saveMood(t.dataset.mood); return paintRitual(); }
  if (t.closest('[data-rneed]')) { await setNeed(t.closest('[data-rneed]').dataset.rneed); return paintRitual(); }
  if (t.dataset.skip) { LS(`fu_skip_${day()}_${t.dataset.skip}`, '1'); return paintRitual(); }
  if (t.id === 'fuGuessSave') {
    const g = $('#fuGuess').value.trim(); if (!g) return F().toast('Write your guess first 🔮');
    const { error } = await sb.from('dq_guesses').insert({ day: day(), guess: g });
    if (error) return F().toast(error.message); F().snd('tick'); await reload('dq_guesses'); return;
  }
  if (t.id === 'fuAnsSave') {
    FU_used('dq');
    const answer = $('#fuAns').value.trim(); if (!answer) return;
    const { error } = await sb.from('daily_answers').insert({ day: day(), qidx: F().dqIndex(day()), answer });
    if (error) return F().toast(error.message);
    F().hearts(8); F().snd('ding'); F().notify('daily', 'answered today\'s question 💬');
    await F().loadTable('daily_answers'); F().refreshProgress(); await reload('dq_guesses'); return;
  }
  if (t.id === 'fuApprSave') {
    FU_used('grat');
    const body = $('#fuAppr').value.trim(); if (!body) return;
    const { error } = await sb.from('gratitude').insert({ body, day: day() });
    if (error) return F().toast(error.message);
    F().hearts(10); F().snd('win'); F().notify('gratitude', 'dropped an appreciation in the jar 🫙');
    await F().loadTable('gratitude'); F().refreshProgress(); if (F().motionOn()) F().confetti(30); return;
  }
  if (t.dataset.verdict) {
    const { error } = await sb.from('dq_verdicts').insert({ guess_id: t.dataset.g, verdict: t.dataset.verdict });
    if (error) return F().toast(error.message); if (t.dataset.verdict === 'spot') F().hearts(12); await reload('dq_verdicts');
  }
});
function syncScore(days = 60) {
  const W = { spot: 1, close: 0.5, nope: 0 }; const cut = F().addDays(day(), -days);
  const g = (T.dq_guesses || []).filter((x) => String(x.day) >= cut);
  const v = g.map((x) => (T.dq_verdicts || []).find((y) => y.guess_id === x.id)).filter(Boolean);
  const pct = v.length ? Math.round(100 * v.reduce((a, x) => a + W[x.verdict], 0) / v.length) : 0;
  const by = (uid) => { const vv = g.filter((x) => x.created_by === uid).map((x) => (T.dq_verdicts || []).find((y) => y.guess_id === x.id)).filter(Boolean); return { n: vv.length, pct: vv.length ? Math.round(100 * vv.reduce((a, x) => a + W[x.verdict], 0) / vv.length) : 0 }; };
  return { n: v.length, pct, me: by(me()), them: by(them()) };
}
function syncSheet() {
  if (!has('dq_guesses')) return notReady();
  const s = syncScore(3650), p = esc(pname());
  const recent = (T.dq_guesses || []).slice(0, 12).map((g) => { const v = (T.dq_verdicts || []).find((x) => x.guess_id === g.id); const who = g.created_by === me() ? 'You' : p; return `<div class="ans"><small>${F().fmtDay(String(g.day))} · ${who} guessed</small>${esc(g.guess)}<br><b>${v ? { spot: '🎯 Spot on', close: '🤏 Close', nope: '🙈 Not quite' }[v.verdict] : '⏳ not judged yet'}</b></div>`; }).join('');
  F().openModal(`<h2>🔮 How in sync are you?</h2><p class="muted">Each day you can guess ${p}'s answer before seeing it. They judge how close you got.</p>
    <div class="fuSyncBig"><div><b>${s.me.n ? s.me.pct + '%' : '—'}</b><small>You know ${p}</small></div><div><b>${s.them.n ? s.them.pct + '%' : '—'}</b><small>${p} knows you</small></div></div>
    ${recent || '<p class="muted">No guesses yet — start with today\'s ritual on Home.</p>'}<button class="soft" data-close>Close</button>`);
}

// ===================== repair mode =====================
const FELT = ['hurt', 'unheard', 'blamed', 'lonely', 'overwhelmed', 'scared', 'frustrated', 'disrespected', 'misunderstood', 'exhausted', 'ashamed', 'angry'];
const NEEDED = ['to be heard', 'reassurance', 'an apology', 'patience', 'space', 'help', 'to be understood', 'a hug', 'honesty'];
const LINES = ['I\'m sorry 💗', 'Can we start over?', 'I still love you', 'You\'re right about some of this', 'Let\'s figure this out together', 'I need a hug 🫂', 'Thank you for telling me', 'We\'re on the same team'];
function notReady() { F().openModal(`<h2>Almost there ✨</h2><p>This part needs a one-time database update. It's ready — it just has to be switched on in Supabase.</p><button class="soft" data-close>OK</button>`); }
function repairSheet() {
  if (!has('repairs')) return notReady();
  const r = activeRepair();
  if (r && new Date(r.ends_at) > Date.now()) return breathe();
  if (r) return reflectSheet(r);
  let mins = 20, line = '';
  F().openModal(`<div class="fuDoveHead">${svg(DOVE)}</div><h2>Take a pause</h2>
    <p class="muted">When a fight gets heated, your body needs about 20 minutes to calm down before you can really listen. ${esc(pname())} gets a gentle note that you're coming back.</p>
    <div class="seg" id="fuMins">${[10, 20, 30, 60].map((m) => `<button data-m="${m}" class="${m === 20 ? 'on' : ''}">${m} min</button>`).join('')}</div>
    <p class="fuLbl">Say something with it (optional)</p>
    <div class="chips" id="fuPLines">${['I\'m not leaving — I just need to calm down 🕊️', 'I love you. I need a moment.', 'Let\'s talk when we\'re calmer'].map((l) => `<span>${esc(l)}</span>`).join('')}</div>
    <button id="fuPauseGo" class="fuWide">Start the pause 🕊️</button><button class="soft fuWide" data-close>Not now</button>`);
  $('#fuMins').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; mins = +b.dataset.m; $$('#fuMins button').forEach((x) => x.classList.toggle('on', x === b)); };
  $('#fuPLines').onclick = (e) => { const s = e.target.closest('span'); if (!s) return; line = line === s.textContent ? '' : s.textContent; $$('#fuPLines span').forEach((x) => x.classList.toggle('on', x.textContent === line)); };
  $('#fuPauseGo').onclick = async () => {
    const ends = new Date(Date.now() + mins * 60000);
    const { error } = await F().sb.from('repairs').insert({ minutes: mins, ends_at: ends.toISOString() });
    if (error) return F().toast(error.message);
    F().notify('ping', `asked for a pause 🕊️ Back together at ${F().hhmm(ends)}.${line ? ' “' + line + '”' : ''}`);
    F().closeModal(); await reload('repairs'); setTimeout(breathe, 300);
  };
}
let breathT = null;
function breathe() {
  const r = activeRepair(); if (!r) return;
  const TIPS = ['Breathe in slowly… and out a little longer.', 'Your body is calming down — that\'s the whole job right now.', 'Try not to replay the argument. Think of something soothing.', 'A glass of water or a short walk helps.', `You and ${pname()} are on the same team.`, 'When you talk: "I felt… when…" works better than "You always…"'];
  const o = document.createElement('div'); o.className = 'fuBreath'; o.innerHTML = `<button class="fuBX" aria-label="Close">✕</button><div class="fuOrb"><i></i><span id="fuBWord">Breathe in</span></div><b id="fuBTime"></b><p id="fuBTip"></p><button class="soft" id="fuBEnd">We're ready to talk now</button>`;
  document.body.appendChild(o); let k = 0;
  const upd = () => {
    const left = new Date(r.ends_at) - Date.now();
    if (left <= 0) { close(); return reflectSheet(r); }
    $('#fuBTime').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
    const ph = Math.floor(Date.now() / 1000) % 14; $('#fuBWord').textContent = ph < 4 ? 'Breathe in' : ph < 8 ? 'Hold' : 'Breathe out';
    if (Date.now() % 12000 < 1000 || !$('#fuBTip').textContent) $('#fuBTip').textContent = TIPS[k++ % TIPS.length];
  };
  const close = () => { clearInterval(breathT); o.classList.add('out'); setTimeout(() => o.remove(), 300); };
  o.querySelector('.fuBX').onclick = close;
  $('#fuBEnd').onclick = async () => { close(); await F().sb.from('repairs').update({ ends_at: new Date().toISOString() }).eq('id', r.id); await reload('repairs'); reflectSheet(activeRepair() || r); };
  clearInterval(breathT); breathT = setInterval(upd, 1000); upd();
}
function reflectSheet(r) {
  const p = esc(pname()), notes = (T.repair_notes || []).filter((n) => n.repair_id === r.id);
  const mine = notes.find((n) => n.created_by === me()), theirs = notes.find((n) => n.created_by === them());
  if (!mine || !mine.felt) {
    let felt = new Set(), needed = new Set();
    F().openModal(`<h2>What happened inside you?</h2><p class="muted">${p} writes theirs too. You'll both see each other's at the same moment — not before.</p>
      <p class="fuLbl">I felt…</p><div class="chips" id="fuFelt">${FELT.map((f) => `<span>${f}</span>`).join('')}</div>
      <textarea id="fuFeltT" maxlength="1500" placeholder="I felt … when …"></textarea>
      <p class="fuLbl">What I needed was…</p><div class="chips" id="fuNeeded">${NEEDED.map((f) => `<span>${f}</span>`).join('')}</div>
      <textarea id="fuNeedT" maxlength="1500" placeholder="What I needed was …"></textarea>
      <p class="fuLbl">My part in it (optional)</p><textarea id="fuOwnT" maxlength="1500" placeholder="I could have …"></textarea>
      <button id="fuReflSave" class="fuWide">Share when we're both ready 🔒</button>`);
    const tg = (id, set) => { $(id).onclick = (e) => { const s = e.target.closest('span'); if (!s) return; set.has(s.textContent) ? set.delete(s.textContent) : set.add(s.textContent); s.classList.toggle('on'); }; };
    tg('#fuFelt', felt); tg('#fuNeeded', needed);
    $('#fuReflSave').onclick = async () => {
      const ft = [[...felt].join(', '), $('#fuFeltT').value.trim()].filter(Boolean).join(' — '), nt = [[...needed].join(', '), $('#fuNeedT').value.trim()].filter(Boolean).join(' — ');
      if (!ft) return F().toast('Say a little about what you felt first');
      const row = { repair_id: r.id, felt: ft, needed: nt || null, own: $('#fuOwnT').value.trim() || null };
      const { error } = mine ? await F().sb.from('repair_notes').update(row).eq('id', mine.id) : await F().sb.from('repair_notes').insert(row);
      if (error) return F().toast(error.message);
      F().notify('ping', 'shared how they felt 🕊️ Write yours to see it');
      await reload('repair_notes'); reflectSheet(r);
    };
    return;
  }
  if (!theirs) {
    F().openModal(`<div class="fuDoveHead">${svg(DOVE)}</div><h2>Thank you for writing it 💗</h2><p class="muted">🔒 Waiting for ${p}. The moment they share theirs, you'll both see both.</p><button class="soft" data-close>OK</button>`);
    return;
  }
  const card = (who, n) => `<div class="fuRCard"><small>${who}</small><p><b>Felt:</b> ${esc(n.felt)}</p>${n.needed ? `<p><b>Needed:</b> ${esc(n.needed)}</p>` : ''}${n.own ? `<p><b>My part:</b> ${esc(n.own)}</p>` : ''}${n.line ? `<p class="fuLine">“${esc(n.line)}”</p>` : ''}</div>`;
  F().openModal(`<h2>Here's what was going on 🕊️</h2><p class="muted">Read theirs slowly. You don't have to agree to understand.</p>
    <div class="fuRCards">${card('You', mine)}${card(p, theirs)}</div>
    <p class="fuLbl">Send a repair line</p><div class="chips" id="fuLines">${LINES.map((l) => `<span class="${mine.line === l ? 'on' : ''}">${esc(l)}</span>`).join('')}</div>
    <button id="fuOk" class="fuWide">${mine.ok ? `✓ You're good · waiting for ${p}` : 'We\'re good 💞'}</button><button class="soft fuWide" data-close>Keep talking in chat</button>`);
  $('#fuLines').onclick = async (e) => {
    const s = e.target.closest('span'); if (!s) return;
    await F().sb.from('repair_notes').update({ line: s.textContent }).eq('id', mine.id);
    await F().chSendText(s.textContent); F().toast('Sent 💗'); await reload('repair_notes'); reflectSheet(r);
  };
  $('#fuOk').onclick = async () => {
    await F().sb.from('repair_notes').update({ ok: true }).eq('id', mine.id);
    if (theirs.ok) { await F().sb.from('repairs').update({ closed_at: new Date().toISOString() }).eq('id', r.id); F().closeModal(); F().confetti(60); F().hearts(20); F().toast('You repaired. That\'s what lasts 💞', 4000); F().notify('ping', 'is good again 💞'); }
    else { F().notify('ping', 'is ready to be good again 💞'); F().toast(`Waiting for ${pname()} 💗`); }
    await reload('repair_notes'); await reload('repairs');
  };
}
// settle a pause once both said "we're good"
setInterval(async () => {
  const r = activeRepair(); if (!r || !has('repair_notes')) return;
  const n = (T.repair_notes || []).filter((x) => x.repair_id === r.id);
  if (n.length === 2 && n.every((x) => x.ok)) { await F().sb.from('repairs').update({ closed_at: new Date().toISOString() }).eq('id', r.id); reload('repairs'); }
}, 20000);
function repairHistory() {
  if (!has('repairs')) return notReady();
  const l = (T.repairs || []).filter((r) => r.closed_at);
  F().openModal(`<div class="fuDoveHead">${svg(DOVE)}</div><h2>Pause &amp; repair</h2>
    <p class="muted">Couples who last aren't the ones who never fight — they're the ones who repair. Tap 🕊️ in Chat or here when it gets heated.</p>
    <button id="fuStartP" class="fuWide">Ask for a pause 🕊️</button>
    <h3 class="gsec">Your repairs · ${l.length}</h3>${l.length ? l.map((r) => `<div class="ans"><small>${F().fmtDate(r.created_at)}</small>${r.minutes} min pause · repaired ${F().fmtDate(r.closed_at)} 💞</div>`).join('') : '<p class="muted">None yet. Hopefully a quiet list 🕊️</p>'}
    <button class="soft" data-close>Close</button>`);
  $('#fuStartP').onclick = () => { F().closeModal(); setTimeout(repairSheet, 260); };
}

// ===================== touch =====================
const HEART = [90, 140, 90, 650, 90, 140, 90, 650, 90, 140, 90];
const canBuzz = () => 'vibrate' in navigator;
function touchSheet(hug) {
  if (!has('touches')) return notReady();
  let rec = [], t0 = 0, last = 0, pressing = false, timer = null;
  F().openModal(`<h2>🫶 Send a touch</h2><p class="muted">Tap or hold the heart — ${esc(pname())} feels the same rhythm${canBuzz() ? '' : ' (their phone buzzes if it can)'}.</p>
    <div class="fuPad" id="fuPad"><span>💗</span><i></i></div><p class="fuPadHint" id="fuPadHint">Tap a rhythm · up to 6 seconds</p>
    <div class="fuRow"><button class="soft" id="fuHeartbeat">💓 Heartbeat</button><button class="soft" id="fuHug">🫂 Long hug</button><button class="soft" id="fuClear">Clear</button></div>
    <button id="fuTouchSend" class="fuWide" disabled>Send 🫶</button>`);
  const pad = $('#fuPad'), hint = $('#fuPadHint'), send = $('#fuTouchSend');
  const setRec = (p, label) => { rec = p; send.disabled = !rec.length; hint.textContent = label || `${Math.ceil(rec.filter((_, i) => i % 2 === 0).length)} touches recorded`; };
  const down = (e) => { e.preventDefault(); const n = performance.now(); if (!t0) { t0 = n; clearTimeout(timer); timer = setTimeout(stop, 6000); } else rec.push(Math.round(n - last)); last = n; pressing = true; pad.classList.add('press'); if (canBuzz()) navigator.vibrate(400); };
  const up = () => { if (!pressing) return; const n = performance.now(); rec.push(Math.round(n - last)); last = n; pressing = false; pad.classList.remove('press'); if (canBuzz()) navigator.vibrate(0); setRec(rec); };
  const stop = () => { if (pressing) up(); t0 = 0; hint.textContent = rec.length ? 'Got it — send it 🫶' : hint.textContent; };
  pad.addEventListener('pointerdown', down); pad.addEventListener('pointerup', up); pad.addEventListener('pointerleave', up); pad.addEventListener('pointercancel', up);
  $('#fuHeartbeat').onclick = () => { setRec(HEART.slice(), 'Heartbeat ready 💓'); playPattern(HEART, pad); };
  $('#fuHug').onclick = () => { setRec([2400], 'Long hug ready 🫂'); playPattern([2400], pad); };
  $('#fuClear').onclick = () => { rec = []; t0 = 0; send.disabled = true; hint.textContent = 'Tap a rhythm · up to 6 seconds'; };
  if (hug === true) $('#fuHug').onclick();
  send.onclick = async () => {
    const pattern = rec.slice(0, 60).map((x) => Math.max(30, Math.min(3000, x)));
    const id = crypto.randomUUID();
    const { error } = await F().sb.from('touches').insert({ id, pattern });
    if (error) return F().toast(error.message);
    chan && chan.send({ type: 'broadcast', event: 'touch', payload: { from: me(), pattern, id } });
    if (!together) F().notify('ping', 'sent you a touch 🫶 Open to feel it');
    F().closeModal(); F().toast(`Touch sent to ${pname()} 🫶`); F().hearts(6);
  };
}
function playPattern(p, el) {
  if (canBuzz()) navigator.vibrate(p);
  if (!el) return; let t = 0;
  p.forEach((ms, i) => { if (i % 2 === 0) { setTimeout(() => el.classList.add('press'), t); setTimeout(() => el.classList.remove('press'), t + ms); } t += ms; });
}
let playing = false;
function playTouch(pattern, id) {
  if (playing || !Array.isArray(pattern)) return; playing = true;
  const o = document.createElement('div'); o.className = 'fuTouchIn';
  o.innerHTML = `<div class="fuPad big"><span>💗</span><i></i></div><b>A touch from ${esc(pname())}</b><small>${canBuzz() ? 'Feel it 🫶' : 'Hold your phone close 🫶'}</small>`;
  document.body.appendChild(o); playPattern(pattern, o.querySelector('.fuPad'));
  const dur = pattern.reduce((a, b) => a + b, 0) + 1200;
  setTimeout(() => { o.classList.add('out'); setTimeout(() => { o.remove(); playing = false; }, 400); }, Math.min(9000, dur));
  o.onclick = () => { o.remove(); playing = false; };
  if (id) F().sb.from('touches').update({ played_at: new Date().toISOString() }).eq('id', id).then(() => reload('touches'));
}
function replayUnplayed() {
  if (document.hidden) return;
  const t = (T.touches || []).find((x) => x.created_by === them() && !x.played_at && Date.now() - new Date(x.created_at) < 3 * 86400e3);
  if (t) playTouch(t.pattern, t.id);
}

// ===================== together: presence + goodnight =====================
function chatStatus() {
  const el = $('#chtStatus'); if (!el || el.classList.contains('typing')) return;
  el.textContent = window.FU_chatStatus();
}
window.FU_chatStatus = () => {
  const r = activeRepair(); if (r && new Date(r.ends_at) > Date.now()) return `🕊️ pausing until ${F().hhmm(r.ends_at)}`;
  return together ? 'here now 🟢' : lockOn() ? '🔒 private · our little corner' : 'our little corner 💞';
};
const nightDay = () => { const d = new Date(); if (d.getHours() < 5) d.setDate(d.getDate() - 1); return F().dayStr(d); };
function paintNight() {
  const box = $('#fuNight'); if (!box) return;
  const h = new Date().getHours(), show = has('goodnights') && (h >= 20 || h < 5);
  box.classList.toggle('hidden', !show); if (!show) return;
  const d = nightDay(), l = T.goodnights || [];
  const mineN = l.find((g) => g.created_by === me() && String(g.day) === d), theirN = l.find((g) => g.created_by === them() && String(g.day) === d);
  const p = esc(pname());
  box.classList.toggle('both', !!(mineN && theirN));
  box.innerHTML = mineN && theirN ? `<div class="fuNightIn"><span class="moon">🌙</span><div><h2>Goodnight, you two</h2><p class="muted">Sleep close, even if you're apart ✨</p></div></div>`
    : mineN ? `<div class="fuNightIn"><span class="moon">🌙</span><div><h2>You said goodnight</h2><p class="muted">Waiting for ${p} to say it back…</p></div></div>`
    : `<div class="fuNightIn"><span class="moon">🌙</span><div><h2>${theirN ? `${p} said goodnight` : 'Bedtime?'}</h2><p class="muted">${theirN ? 'Say it back 💤' : `Say goodnight to ${p}`}</p></div><button id="fuGN">Goodnight 🌙</button></div>`;
  const b = $('#fuGN'); if (b) b.onclick = async () => {
    const { error } = await F().sb.from('goodnights').insert({ day: d }); if (error) return F().toast(error.message);
    F().notify('ping', theirN ? 'said goodnight back 🌙💤' : 'said goodnight 🌙 Say it back'); F().hearts(6); reload('goodnights');
  };
}

// ===================== on this day =====================
function paintOTD() {
  const box = $('#fuOTD'); if (!box) return;
  const d = S().data, t = day(), md = t.slice(5), y = +t.slice(0, 4), p = esc(pname());
  const yr = (s) => +String(s).slice(0, 4);
  const sameDay = (s) => s && String(s).slice(5, 10) === md && yr(s) < y;
  const photos = (d.photos || []).filter((x) => sameDay(F().dayStr(new Date(x.created_at))) && !(x.media_type || '').startsWith('video'));
  const moments = (d.timeline || []).filter((x) => sameDay(x.event_date));
  const notes = (d.gratitude || []).filter((x) => sameDay(x.day));
  let h = '';
  if (photos.length || moments.length || notes.length) {
    const yrs = y - Math.min(...[...photos.map((x) => yr(F().dayStr(new Date(x.created_at)))), ...moments.map((x) => yr(x.event_date)), ...notes.map((x) => yr(x.day))]);
    h = `<h2>📸 On this day</h2><p class="muted">${yrs} year${yrs > 1 ? 's' : ''} ago today</p>`
      + (photos.length ? `<div class="fuThumbs">${photos.slice(0, 3).map((x) => `<img src="${esc(F().phUrl(x))}" alt="" loading="lazy">`).join('')}</div>` : '')
      + moments.slice(0, 2).map((m) => `<div class="ans"><small>✨ ${esc(m.title)}</small>${esc(m.body || '')}</div>`).join('')
      + notes.slice(0, 2).map((g) => `<div class="ans"><small>🫙 ${esc(F().nameOf(g.created_by))} appreciated</small>${esc(g.body)}</div>`).join('');
  } else {
    // on a heavy day, bring back something they once appreciated about you
    const lm = F().latestMood(me());
    if (lm && lm.day === t && LOW.includes(lm.mood)) {
      const theirs = (d.gratitude || []).filter((g) => g.created_by === them());
      if (theirs.length) { const g = theirs[F().hashS(t) % theirs.length]; h = `<h2>💌 For a heavy day</h2><p class="muted">Something ${p} once appreciated about you · ${F().fmtDay(g.day)}</p><p class="fuQuote">“${esc(g.body)}”</p>`; }
    }
  }
  box.classList.toggle('hidden', !h); if (h) box.innerHTML = h;
  box.onclick = (e) => { if (e.target.tagName === 'IMG') F().goTab('memories'); };
}

// ===================== love their way =====================
function paintLove() {
  const box = $('#fuLove'); if (!box) return;
  const L = F().D.loveLangs, l = S().data.love_languages || [], p = esc(pname());
  const theirs = l.find((x) => x.created_by === them()), mineL = l.find((x) => x.created_by === me());
  let h = '';
  if (theirs && L[theirs.top]) {
    const lang = L[theirs.top], tips = lang.tips, tip = tips[F().hashS(day() + me()) % tips.length];
    h = `<div class="fuLoveIn"><span class="fuLoveE">${lang.emoji}</span><div><small>Love ${p} their way today</small><b>${esc(tip)}</b><p class="muted">${p}'s love language: ${esc(lang.name)}</p></div></div>`;
  } else if (!mineL || !theirs) {
    h = `<div class="fuLoveIn"><span class="fuLoveE">💬</span><div><small>Love them their way</small><b>${mineL ? `Waiting for ${p} to take the love-language quiz` : 'Take the love-language quiz to get a daily idea for each other'}</b></div>${mineL ? '' : '<button class="soft mini" id="fuLL">Take it</button>'}</div>`;
  }
  box.classList.toggle('hidden', !h); box.innerHTML = h;
  const b = $('#fuLL'); if (b) b.onclick = () => { F().goTab('us'); F().openFeat('ll'); };
}

// ===================== usage + menus =====================
const used = () => { try { return JSON.parse(LS('fu_usage') || '{}'); } catch { return {}; } };
window.FU_used = (f) => {
  const u = used(); u[f] = { n: (u[f]?.n || 0) + 1, at: Date.now() }; LS('fu_usage', JSON.stringify(u));
  if (!LS('fu_first')) LS('fu_first', String(Date.now()));
  if (has('feature_usage')) F().sb.rpc('fu_bump', { f }).then(() => {}, () => {});
};
function scoreOf(f) {
  const local = used()[f]; let s = 0, last = 0;
  if (local) { s += local.n; last = local.at; }
  (T.feature_usage || []).filter((x) => x.feat === f && x.created_by === them()).forEach((x) => { s += x.n; last = Math.max(last, +new Date(x.last_at)); });
  const days = last ? (Date.now() - last) / 86400e3 : 999;
  return { s: s * Math.pow(0.5, days / 30), days, raw: s };
}
const keyOf = (b) => b.dataset.feat || (b.dataset.game ? 'g:' + b.dataset.game : b.dataset.fu ? 'fu:' + b.dataset.fu : null);
function orderMenus() {
  const first = +(LS('fu_first') || Date.now()), settled = Date.now() - first > 14 * 86400e3;
  [['#usHome', 'us'], ['#gameHome', 'play']].forEach(([root, id]) => {
    const r = $(root); if (!r) return;
    let more = r.querySelector('.fuMore');
    $$(`${root} .ggrid`).forEach((g) => {
      if (g.closest('.fuMore')) return;
      const tiles = [...g.querySelectorAll('.gtile')];
      tiles.sort((a, b) => scoreOf(keyOf(b)).s - scoreOf(keyOf(a)).s).forEach((t) => g.appendChild(t));
    });
    if (!settled) return;
    // only tuck things away once there's real signal: you've used a fair spread of features
    const distinct = Object.keys(used()).length + new Set((T.feature_usage || []).map((x) => x.feat)).size;
    if (distinct < 6) return;
    const CORE = ['dq', 'mood', 'grat', 'weekly', 'journal', 'year'];
    const all = $$(`${root} .ggrid:not(.fuMoreGrid) .gtile`);
    let quiet = all.filter((t) => { const k = keyOf(t); return k && !k.startsWith('fu:') && !CORE.includes(k) && scoreOf(k).days > 45; });
    quiet = quiet.sort((x, y) => scoreOf(keyOf(x)).s - scoreOf(keyOf(y)).s).slice(0, Math.floor(all.length / 2)); // never more than half
    if (!quiet.length) return;
    if (!more) { r.insertAdjacentHTML('beforeend', `<details class="fuMore"><summary>More <small>· things you haven't opened lately</small></summary><div class="ggrid fuMoreGrid"></div></details>`); more = r.querySelector('.fuMore'); }
    const mg = more.querySelector('.fuMoreGrid'); quiet.forEach((t) => mg.appendChild(t));
    $$(`${root} .ggrid:not(.fuMoreGrid)`).forEach((g) => { const h = g.previousElementSibling; const empty = !g.querySelector('.gtile'); g.classList.toggle('hidden', empty); if (h && h.classList.contains('gsec')) h.classList.toggle('hidden', empty); });
    void id;
  });
}
let spot = null;
const PITCH = { q36: 'The famous questions that make two people fall closer. One at a time.', capsule: 'Write something now, open it together months from now.', lovemap: 'How well do you know their world? Fill in your map.', jokes: 'Save your inside jokes before you forget how they started.', bucket: 'Dream list for the two of you — big and tiny.', playlist: 'Build your soundtrack, one song each.', voice: 'Leave a voice note they can replay anytime.', wish: 'Wishlists so gifts are never a guess.', goals: 'Save toward something together.', miles: 'Mark the dates that made you, you.', trivia: 'A quick trivia night — loser picks dinner.', 'g:openwhen': 'Letters for the moments they\'ll need them.', 'g:scratch': 'Hide a little prize under a scratch card.', 'g:draw': 'Draw something for them — no talent required.', 'fu:future': 'Where you two are heading — answer apart, compare together.', 'fu:sync': 'Guess their answers and see how in sync you are.' };
function pickSpotlight() {
  const tiles = $$('#usHome .gtile, #gameHome .gtile').filter((t) => keyOf(t) && !['dq', 'mood', 'grat', 'year'].includes(keyOf(t)));
  if (!tiles.length) return;
  const w = tiles.map((t) => { const sc = scoreOf(keyOf(t)); return { t, w: sc.raw === 0 ? 4 : Math.min(4, 0.5 + sc.days / 10) }; }).filter((x) => scoreOf(keyOf(x.t)).days > 2);
  const sum = w.reduce((a, x) => a + x.w, 0); let r = Math.random() * sum;
  spot = (w.find((x) => (r -= x.w) < 0) || w[0])?.t || null;
}
function paintSpot() {
  const box = $('#fuSpot'); if (!box) return;
  if (!spot) { box.classList.add('hidden'); return; }
  const k = keyOf(spot), icon = spot.querySelector('b')?.textContent || '✨', name = spot.childNodes[1]?.textContent?.trim() || spot.textContent.trim();
  box.classList.remove('hidden');
  box.innerHTML = `<div class="fuSpotIn"><span class="fuSpotI">${esc(icon)}</span><div><small>Try this today</small><b>${esc(name)}</b><p class="muted">${esc(PITCH[k] || 'You two haven\'t opened this in a while.')}</p></div><button class="soft mini" id="fuSpotGo">Open</button></div>`;
  $('#fuSpotGo').onclick = () => { if (spot.dataset.feat) { F().goTab('us'); F().openFeat(spot.dataset.feat); } else if (spot.dataset.game) { F().goTab('play'); spot.click(); } else { F().goTab('us'); spot.click(); } };
}
function paintBadges() {
  const s = syncScore(); const f = (id, t) => { const el = document.getElementById('fb-' + id); if (el) el.textContent = t; };
  f('sync', s.n >= 3 ? `${s.pct}% in sync` : has('dq_guesses') ? 'Guess daily' : '');
  const fm = T.future_map || [], both = new Set(fm.filter((x) => x.created_by === them()).map((x) => x.topic).filter((t) => fm.some((y) => y.created_by === me() && y.topic === t)));
  f('future', has('future_map') ? `${both.size}/${FUT.length} together` : '');
  const r = activeRepair(); f('repair', r ? '🕊️ pausing' : '');
}

// ===================== state of us (weekly) =====================
function paintSou() {
  const box = $('#fuSou'); if (!box || !S().partner) return;
  const wk = F().isoWeek(), p = esc(pname()), l = T.weekly_extra || [];
  const mineW = l.find((x) => x.created_by === me() && x.week === wk);
  const prevWk = [...new Set(l.map((x) => x.week))].filter((w) => w < wk).sort().pop();
  const prevPlan = prevWk && l.filter((x) => x.week === prevWk && x.plan).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
  const weeks = [...new Set(l.map((x) => x.week))].sort().slice(-8);
  const bar = (uid) => weeks.map((w) => { const r = l.find((x) => x.week === w && x.created_by === uid)?.rating; return `<i style="height:${r ? r * 10 : 4}%" class="${r ? '' : 'empty'}" title="${w}: ${r || '—'}"></i>`; }).join('');
  if (!has('weekly_extra')) { box.innerHTML = '<p class="muted">Sit together for 15 minutes once a week: what went well, what was hard, what you need, one plan.</p>'; return; }
  box.innerHTML = `
    ${prevPlan ? `<div class="fuPlan"><small>Last week you agreed to</small><b>“${esc(prevPlan.plan)}”</b></div>` : ''}
    <p class="fuLbl">How connected did you feel this week?</p>
    <div class="fuRate" id="fuRate">${Array.from({ length: 10 }, (_, i) => `<button data-r="${i + 1}" class="${mineW?.rating === i + 1 ? 'on' : ''}">${i + 1}</button>`).join('')}</div>
    ${weeks.length > 1 ? `<div class="fuTrend"><div><small>You</small><span>${bar(me())}</span></div><div><small>${p}</small><span>${bar(them())}</span></div></div>` : ''}`;
  $('#fuRate').onclick = async (e) => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const row = { week: wk, rating: +b.dataset.r, updated_at: new Date().toISOString() };
    const { error } = mineW ? await F().sb.from('weekly_extra').update(row).eq('id', mineW.id) : await F().sb.from('weekly_extra').insert(row);
    if (error) return F().toast(error.message); F().snd('tick'); reload('weekly_extra');
  };
  const end = $('#fuSouEnd'); if (!end) return;
  const wl = S().data.weekly_checkins || [], a = wl.find((x) => x.created_by === me() && x.week === wk), b2 = wl.find((x) => x.created_by === them() && x.week === wk);
  end.innerHTML = a && b2 ? `<button id="fuTalk" class="fuWide">🛋️ Talk it through together</button>` : `<p class="muted fuCenter">When you've both checked in, sit together and tap “Talk it through”.</p>`;
  const t = $('#fuTalk'); if (t) t.onclick = () => talkThrough(a, b2, mineW);
}
function talkThrough(a, b, mineW) {
  const P = F().D.weeklyPrompts, p = esc(pname());
  const TIP = { went_well: 'Start here. Say thank you for something specific.', hard: 'Talk about the situation, not the person. "I felt…" not "you always…".', need: 'Listen first. Repeat back what you heard before you answer.', try_next: 'Pick small and doable. You\'ll choose one plan together at the end.', appreciation: 'Read these out loud to each other. Let it land.' };
  let i = 0;
  const step = () => {
    if (i < P.length) {
      const [k, lab] = P[i];
      F().openModal(`<div class="fuStepTop"><small>${i + 1} / ${P.length + 1}</small><div class="fuDots">${P.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}<i></i></div></div>
        <h2>${esc(lab)}</h2><p class="fuTip">💡 ${esc(TIP[k] || '')}</p>
        <div class="fuRCards"><div class="fuRCard"><small>You</small><p>${esc(a[k] || '—')}</p></div><div class="fuRCard"><small>${p}</small><p>${esc(b[k] || '—')}</p></div></div>
        <button id="fuNext" class="fuWide">Next →</button>`);
      $('#fuNext').onclick = () => { i++; step(); };
    } else {
      F().openModal(`<h2>One plan for next week</h2><p class="muted">Agree on one small thing together. It shows up at the top next week.</p>
        <textarea id="fuPlanT" maxlength="300" placeholder="Phones away at dinner on Tuesday & Thursday">${esc(mineW?.plan || '')}</textarea><button id="fuPlanS" class="fuWide">That's our plan 🤝</button>`);
      $('#fuPlanS').onclick = async () => {
        const plan = $('#fuPlanT').value.trim(); if (!plan) return;
        const wk = F().isoWeek(); const ex = (T.weekly_extra || []).find((x) => x.created_by === me() && x.week === wk);
        const row = { week: wk, plan, updated_at: new Date().toISOString() };
        const { error } = ex ? await F().sb.from('weekly_extra').update(row).eq('id', ex.id) : await F().sb.from('weekly_extra').insert(row);
        if (error) return F().toast(error.message); F().closeModal(); F().confetti(50); F().toast('Saved. Proud of you two 🤝', 3500); F().notify('weekly', `set your plan for next week: “${plan}”`); reload('weekly_extra');
      };
    }
  };
  step();
}

// ===================== future map =====================
const FUT = [['live', '🏡', 'Where do we live in 5 years?'], ['kids', '👶', 'Kids — if, how many, when?'], ['money', '💰', 'How do we handle money — joint, separate, both?'],
  ['career', '💼', 'Whose career moves come first, and when?'], ['family', '👨‍👩‍👧', 'How involved are our families in our life?'], ['faith', '🕯️', 'Faith & traditions we\'ll keep'],
  ['home', '🛋️', 'Our home feels like…'], ['weekend', '☕', 'A perfect ordinary weekend, 10 years from now'], ['travel', '✈️', 'Places we have to see together'],
  ['commit', '💍', 'Commitment & marriage — what matters to us?'], ['pets', '🐾', 'Pets?'], ['health', '🧘', 'How we take care of ourselves'],
  ['fights', '🕊️', 'How we want to handle fights'], ['old', '👵', 'When we\'re old, we…']];
const W = { 1: 'Nice to have', 2: 'Matters to me', 3: 'Really important' };
function futureMap() {
  if (!has('future_map')) return notReady();
  const l = T.future_map || [], p = esc(pname());
  const rows = FUT.map(([k, e, q]) => {
    const m = l.find((x) => x.topic === k && x.created_by === me()), t = l.find((x) => x.topic === k && x.created_by === them());
    const st = m && t ? '<b class="ok">💞 Compare</b>' : m ? `<b>🔒 Waiting for ${p}</b>` : '<b class="go">✏️ Answer</b>';
    return `<button class="fuTopic" data-topic="${k}"><span>${e}</span><div>${esc(q)}${st}</div></button>`;
  }).join('');
  F().openModal(`<h2>🧭 Our future map</h2><p class="muted">Answer on your own. Each topic opens once you've both answered — then you see where you match and where to talk.</p><div class="fuTopics">${rows}</div><button class="soft" data-close>Close</button>`);
  $('#modalBox').querySelector('.fuTopics').onclick = (e) => { const b = e.target.closest('[data-topic]'); if (b) futureTopic(b.dataset.topic); };
}
function futureTopic(k) {
  const [, e, q] = FUT.find((x) => x[0] === k), l = T.future_map || [], p = esc(pname());
  const m = l.find((x) => x.topic === k && x.created_by === me()), t = l.find((x) => x.topic === k && x.created_by === them());
  if (m && t) {
    const gap = Math.max(m.weight, t.weight) === 3;
    F().openModal(`<h2>${e} ${esc(q)}</h2><div class="fuRCards"><div class="fuRCard"><small>You · ${W[m.weight]}</small><p>${esc(m.answer)}</p></div><div class="fuRCard"><small>${p} · ${W[t.weight]}</small><p>${esc(t.answer)}</p></div></div>
      <p class="fuTip">${gap ? '💡 This one really matters to at least one of you — worth a proper talk, not a quick yes.' : '💡 Notice what you agree on first, then the differences.'}</p>
      <div class="fuRow"><button class="soft" id="fuFBack">← All topics</button><button class="soft" id="fuFEdit">Edit mine</button><button id="fuFChat">Talk about it 💬</button></div>`);
    $('#fuFBack').onclick = futureMap; $('#fuFEdit').onclick = () => futureEdit(k, m);
    $('#fuFChat').onclick = () => { F().closeModal(); F().goTab('chat'); const ta = $('#chTxt'); ta.value = `About our future map — ${q} `; ta.dispatchEvent(new Event('input')); ta.focus(); };
    return;
  }
  futureEdit(k, m);
}
function futureEdit(k, m) {
  const [, e, q] = FUT.find((x) => x[0] === k); let w = m?.weight || 2;
  F().openModal(`<h2>${e} ${esc(q)}</h2><p class="muted">Be honest — ${esc(pname())} only sees it once they've answered too.</p>
    <textarea id="fuFA" maxlength="1000" placeholder="What I really hope for…">${esc(m?.answer || '')}</textarea>
    <p class="fuLbl">How much does this matter to you?</p><div class="seg" id="fuFW">${[1, 2, 3].map((n) => `<button data-w="${n}" class="${n === w ? 'on' : ''}">${W[n]}</button>`).join('')}</div>
    <button id="fuFS" class="fuWide">Save 🧭</button><button class="soft fuWide" id="fuFB">← All topics</button>`);
  $('#fuFW').onclick = (ev) => { const b = ev.target.closest('[data-w]'); if (!b) return; w = +b.dataset.w; $$('#fuFW button').forEach((x) => x.classList.toggle('on', x === b)); };
  $('#fuFB').onclick = futureMap;
  $('#fuFS').onclick = async () => {
    const answer = $('#fuFA').value.trim(); if (!answer) return;
    const row = { topic: k, answer, weight: w, updated_at: new Date().toISOString() };
    const { error } = m ? await F().sb.from('future_map').update(row).eq('id', m.id) : await F().sb.from('future_map').insert(row);
    if (error) return F().toast(error.message);
    if (!m) F().notify('weekly', `answered “${q}” on your future map 🧭`);
    await reload('future_map'); futureTopic(k);
  };
}

// ===================== private lock (end-to-end) =====================
const enc8 = new TextEncoder(), dec8 = new TextDecoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))), unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
let KEY = null;
const vault = () => (T.couple_vault || [])[0];
const lockOn = () => has('couple_vault') && !!vault();
window.FU_lockOn = lockOn;
window.FU_hasKey = () => !!KEY;
window.FU_isEnc = (s) => typeof s === 'string' && s.startsWith('e1:');
async function derive(pass, salt) {
  const base = await crypto.subtle.importKey('raw', enc8.encode(pass.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(salt), iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}
async function encWith(k, text) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc8.encode(text)); return 'e1:' + b64(iv) + ':' + b64(ct); }
async function decWith(k, s) { const [, iv, ct] = s.split(':'); return dec8.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, k, unb64(ct))); }
window.FU_enc = async (text) => { if (!KEY) throw new Error('locked'); const out = await encWith(KEY, text); if (out.length > 3990) { F().toast('That\'s too long for a locked message — split it in two 💬'); throw new Error('too long'); } return out; };
const keyName = () => 'fu_key_' + S().couple.id;
async function vaultInit() {
  KEY = null; const v = vault(); if (!v) return paintLock();
  const raw = LS(keyName());
  if (raw) { try { const k = await crypto.subtle.importKey('raw', unb64(raw), 'AES-GCM', true, ['encrypt', 'decrypt']); if (await decWith(k, `e1:${v.check_iv}:${v.check_ct}`) === 'for-us-ok') KEY = k; } catch { LS(keyName(), null); } }
  paintLock(); F().chRender(); F().RENDER.journal && F().RENDER.journal();
  if (!KEY) setTimeout(() => { if (!KEY && lockOn()) F().toast('🔒 Your chat is locked — enter your passphrase in Settings', 4500); }, 2500);
}
// decrypt lazily, then re-render once
let decBusy = false;
window.FU_decChat = (list) => {
  if (!KEY || decBusy) return; const todo = list.filter((m) => m._pt == null && FU_isEnc(m.body) && !m._dec); if (!todo.length) return;
  decBusy = true; todo.forEach((m) => { m._dec = 1; });
  Promise.all(todo.map(async (m) => { try { m._pt = await decWith(KEY, m.body); } catch { m._pt = '🔒 Can\'t unlock this message (different passphrase?)'; } }))
    .then(() => { decBusy = false; F().chRender(); });
};
window.FU_decList = (l, done) => {
  if (!KEY) return; const todo = l.filter((j) => j._pt == null && FU_isEnc(j.body) && !j._dec); if (!todo.length) return;
  todo.forEach((j) => { j._dec = 1; });
  Promise.all(todo.map(async (j) => { try { j._pt = await decWith(KEY, j.body); } catch { j._pt = '🔒 Can\'t unlock this entry'; } })).then(done);
};
window.FU_unlock = () => unlockSheet();
function unlockSheet() {
  const v = vault(); if (!v) return lockSetup();
  F().openModal(`<h2>🔒 Unlock our chat</h2><p class="muted">Type the passphrase you two chose. It stays on this device — the server never sees it.</p>
    <input id="fuPass" type="password" autocomplete="current-password" placeholder="Our passphrase"><button id="fuPassGo" class="fuWide">Unlock</button><button class="soft fuWide" data-close>Later</button>`);
  $('#fuPassGo').onclick = async () => {
    const k = await derive($('#fuPass').value, v.salt);
    try { if (await decWith(k, `e1:${v.check_iv}:${v.check_ct}`) !== 'for-us-ok') throw 0; } catch { return F().toast('That passphrase doesn\'t match 💭'); }
    KEY = k; LS(keyName(), b64(await crypto.subtle.exportKey('raw', k))); F().closeModal(); F().toast('Unlocked on this device 🔓');
    (F().CH.list || []).forEach((m) => { delete m._dec; }); F().chRender(); (S().data.journal || []).forEach((j) => { delete j._dec; }); F().RENDER.journal && F().RENDER.journal(); paintLock(); chatStatus();
  };
}
function lockSetup() {
  F().openModal(`<h2>🔐 Lock our chat</h2><p class="muted">Choose a passphrase together. From now on, your text messages and journal entries are encrypted on your phones — the server only stores scrambled text.</p>
    <ul class="fuList"><li>${esc(pname())} enters the same passphrase on their phone.</li><li>New phone? Enter it again there.</li><li><b>If you both forget it, locked messages can't be recovered.</b></li><li>Photos, videos and voice notes stay private to you two, but aren't scrambled.</li></ul>
    <input id="fuP1" type="password" autocomplete="new-password" placeholder="Passphrase (8+ characters)"><input id="fuP2" type="password" autocomplete="new-password" placeholder="Type it again">
    <button id="fuLockGo" class="fuWide">Lock it 🔐</button><button class="soft fuWide" data-close>Cancel</button>`);
  $('#fuLockGo').onclick = async () => {
    const a = $('#fuP1').value, b = $('#fuP2').value; if (a.length < 8) return F().toast('At least 8 characters 🙏'); if (a !== b) return F().toast('They don\'t match');
    const salt = b64(crypto.getRandomValues(new Uint8Array(16))), k = await derive(a, salt), chk = (await encWith(k, 'for-us-ok')).split(':');
    const { error } = await F().sb.from('couple_vault').insert({ salt, check_iv: chk[1], check_ct: chk[2] });
    if (error) return F().toast(error.message);
    KEY = k; LS(keyName(), b64(await crypto.subtle.exportKey('raw', k)));
    F().notify('ping', 'locked your chat 🔐 Ask them for the passphrase'); F().closeModal(); F().toast('Locked 🔐 Tell your love the passphrase in person'); await reload('couple_vault'); paintLock();
  };
}
function paintLock() {
  const box = $('#fuLock'); if (!box) return;
  if (!has('couple_vault')) { box.innerHTML = '<p class="muted">Encrypt your messages and journal so only your two phones can read them. Needs the one-time database update.</p>'; return; }
  const v = vault();
  box.innerHTML = !v ? `<p class="muted">Encrypt text messages and journal entries so only your two phones can read them — not even the server.</p><button id="fuLockOn">Set up the lock 🔐</button>`
    : KEY ? `<p>🔐 <b>On</b> · unlocked on this device</p><p class="muted">New text messages and journal entries are encrypted.</p><button class="soft" id="fuLockForget">Lock this device</button> <button class="soft danger" id="fuLockOff">Turn lock off</button>`
    : `<p>🔐 <b>On</b> · this device is locked</p><button id="fuLockEnter">Enter passphrase</button>`;
  const on = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
  on('fuLockOn', lockSetup); on('fuLockEnter', unlockSheet);
  on('fuLockForget', () => { LS(keyName(), null); KEY = null; paintLock(); F().toast('This device is locked again 🔒'); });
  on('fuLockOff', async () => {
    if (!(await F().uiConfirm('Turn the lock off for both of you? New messages won\'t be encrypted. Old locked ones stay readable on phones that have the key.'))) return;
    await F().sb.from('couple_vault').delete().eq('id', v.id); reload('couple_vault'); F().toast('Lock turned off');
  });
}

// ===================== year book =====================
let bookYear = new Date().getFullYear();
function paintBookYears() {
  const box = $('#fuBookYear'); if (!box) return;
  const d = S().data, ys = new Set([new Date().getFullYear()]);
  (d.photos || []).forEach((p) => ys.add(+String(p.created_at).slice(0, 4))); (d.timeline || []).forEach((t) => ys.add(+String(t.event_date).slice(0, 4)));
  const arr = [...ys].filter(Boolean).sort().slice(-4);
  box.innerHTML = arr.map((y) => `<button data-y="${y}" class="${y === bookYear ? 'on' : ''}">${y}</button>`).join('');
  box.onclick = (e) => { const b = e.target.closest('[data-y]'); if (!b) return; bookYear = +b.dataset.y; paintBookYears(); };
}
async function yearBook(print) {
  const d = S().data, y = String(bookYear), inY = (s) => String(s || '').startsWith(y), p = pname(), meName = S().me?.display_name || 'Me';
  F().toast('Making your book… 📖', 2500);
  const photos = (d.photos || []).filter((x) => inY(x.created_at) && !(x.media_type || '').startsWith('video')).reverse();
  if (photos.length) await F().RENDER.photos();
  const src = async (x) => { const u = F().phUrl(x); if (print || !u) return u; try { const b = await (await fetch(u)).blob(); return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } catch { return ''; } };
  const imgs = []; for (const ph of photos.slice(0, 150)) imgs.push({ s: await src(ph), c: ph.caption || '', t: ph.created_at });
  const moments = (d.timeline || []).filter((x) => inY(x.event_date));
  const grat = (d.gratitude || []).filter((x) => inY(x.day)).reverse();
  const ans = (d.daily_answers || []).filter((x) => inY(x.day));
  const qdays = [...new Set(ans.map((a) => a.day))].filter((dd) => ans.filter((a) => a.day === dd).length === 2).sort().slice(-24);
  const miles = (d.milestones || []).filter((x) => inY(x.day));
  const by = (uid) => uid === me() ? meName : p;
  const months = {}; imgs.forEach((i) => { const m = new Date(i.t).toLocaleDateString(undefined, { month: 'long' }); (months[m] = months[m] || []).push(i); });
  const css = `@page{margin:14mm}body{font-family:Georgia,'Times New Roman',serif;color:#2a2230;max-width:760px;margin:0 auto;padding:24px}h1{font-size:44px;margin:0}h2{font-size:24px;border-bottom:1px solid #ddd;padding-bottom:6px;margin-top:34px;page-break-after:avoid}
    .cover{text-align:center;padding:90px 0 60px;page-break-after:always}.cover p{font-size:18px;color:#776}.stats{display:flex;justify-content:center;gap:28px;margin-top:30px}.stats b{display:block;font-size:30px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.grid figure{margin:0;break-inside:avoid}.grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px}figcaption{font-size:11px;color:#666;margin-top:3px}
    .q{break-inside:avoid;margin:14px 0}.q b{display:block}.q div{display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px}.q small{color:#999;display:block}
    blockquote{margin:10px 0;padding:8px 14px;border-left:3px solid #e75480;background:#fdf3f6;break-inside:avoid}.m{margin:10px 0}.m small{color:#999}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(meName)} & ${esc(p)} — ${y}</title><style>${css}</style></head><body>
    <div class="cover"><p>Our year</p><h1>${esc(meName)} 💕 ${esc(p)}</h1><p>${y}</p><div class="stats"><div><b>${imgs.length}</b>photos</div><div><b>${moments.length}</b>moments</div><div><b>${grat.length}</b>appreciations</div><div><b>${qdays.length}</b>questions</div></div></div>
    ${moments.length || miles.length ? `<h2>Moments</h2>${[...miles.map((m) => ({ d: m.day, t: '🎂 ' + m.title, b: '' })), ...moments.map((m) => ({ d: m.event_date, t: m.title, b: m.body }))].sort((a, b) => String(a.d).localeCompare(String(b.d))).map((m) => `<div class="m"><small>${F().fmtDate(m.d + 'T12:00:00')}</small><br><b>${esc(m.t)}</b> ${esc(m.b || '')}</div>`).join('')}` : ''}
    ${Object.entries(months).map(([m, l]) => `<h2>${m}</h2><div class="grid">${l.map((i) => `<figure>${i.s ? `<img src="${esc(i.s)}">` : ''}<figcaption>${esc(i.c)}</figcaption></figure>`).join('')}</div>`).join('')}
    ${grat.length ? `<h2>What we appreciated</h2>${grat.slice(0, 80).map((g) => `<blockquote>${esc(g.body)}<br><small>— ${esc(by(g.created_by))}, ${F().fmtDate(g.day + 'T12:00:00')}</small></blockquote>`).join('')}` : ''}
    ${qdays.length ? `<h2>Questions we answered</h2>${qdays.map((dd) => { const a = ans.filter((x) => x.day === dd); const q = F().D.dailyQs[a[0].qidx] || ''; return `<div class="q"><b>${esc(q)}</b><div>${a.map((x) => `<span><small>${esc(by(x.created_by))}</small>${esc(x.answer)}</span>`).join('')}</div></div>`; }).join('')}` : ''}
    <p style="text-align:center;color:#aaa;margin-top:50px">Made with For Us 💕</p></body></html>`;
  if (print) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
    f.srcdoc = html; f.onload = () => setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { F().toast('Use “Save as file” on this device'); } setTimeout(() => f.remove(), 60000); }, 800);
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = `for-us-${y}.html`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
}
// test hook for local previews (no data access beyond what this page already has)
window.FU_dev = { T, HAS, paint, orderMenus, pickSpotlight, paintSpot, set together(v) { together = v; }, derive, encWith, decWith, setKey: (k) => { KEY = k; }, repairSheet, reflectSheet, breathe, touchSheet, playTouch, futureMap, futureTopic, talkThrough, syncSheet, repairHistory, lockSetup };
})();
