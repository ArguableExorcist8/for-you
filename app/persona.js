// For Us v28 — theme personalities engine (data in persona-data.js)
(() => {
'use strict';
const DATA = window.FU_PERSONAS || {};
const $ = (s, r = document) => r.querySelector(s);
const F = () => window.__FU;
const root = document.documentElement;
const tid = () => root.dataset.theme || 'blush';
const P = () => DATA[tid()] || DATA.blush;
const LSg = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const LSs = (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } };
const motion = () => !(matchMedia('(prefers-reduced-motion: reduce)').matches || LSg('cc_reduce_motion') === '1');
const seg = (x) => (window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(x)].map((g) => g.segment) : Array.from(x));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const pname = () => (window.CC_partnerName && window.CC_partnerName()) || 'Your love';

// ---------- sounds (off by default) ----------
const SOUNDS = {
  chime: { w: 'sine', send: [[880, .07], [1175, .1]], recv: [[1175, .08], [880, .14]], ping: [[784, .09], [988, .09], [1319, .2]] },
  bubble: { w: 'sine', glide: 1.6, send: [[420, .09]], recv: [[520, .07], [380, .09]], ping: [[360, .08], [480, .08], [640, .12]] },
  music: { w: 'sine', send: [[1568, .12], [2093, .18]], recv: [[2093, .1], [1760, .1], [1568, .2]], ping: [[1319, .12], [1568, .12], [1976, .12], [2637, .25]] },
  harp: { w: 'triangle', send: [[659, .06], [880, .06], [1047, .12]], recv: [[1047, .06], [880, .06], [659, .14]], ping: [[523, .05], [659, .05], [784, .05], [1047, .05], [1319, .2]] },
  pluck: { w: 'triangle', send: [[660, .06]], recv: [[880, .05], [660, .08]], ping: [[523, .07], [784, .07], [1047, .14]] },
  soft: { w: 'sine', send: [[440, .1]], recv: [[523, .1], [440, .14]], ping: [[392, .12], [523, .12], [659, .2]] },
  magic: { w: 'sine', send: [[1319, .05], [1760, .05], [2349, .1]], recv: [[2349, .05], [1760, .05], [1319, .12]], ping: [[1047, .05], [1319, .05], [1568, .05], [2093, .05], [2637, .05], [3136, .2]] },
  eerie: { w: 'triangle', vib: 7, send: [[311, .16]], recv: [[370, .14], [311, .22]], ping: [[294, .18], [349, .18], [415, .34]] },
  synth: { w: 'square', vol: .045, send: [[523, .06], [784, .08]], recv: [[784, .06], [523, .1]], ping: [[392, .08], [523, .08], [659, .08], [784, .16]] },
};
let AC = null;
function sound(kind) {
  if (LSg('fu_tsnd') !== '1') return false;
  try {
    const s = SOUNDS[P().sp] || SOUNDS.chime;
    const seq = kind === 'done' ? s.ping.slice(-2).map(([f, d]) => [f, d * .8]) : kind === 'del' ? s.recv.map(([f, d]) => [f * .55, d * 1.1]) : kind === 'tap' ? [[s.send[0][0] * 1.5, .03]] : s[kind] || s.send; // v50: done / delete / tap
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    let t = AC.currentTime + .01;
    seq.forEach(([f, d]) => {
      const o = AC.createOscillator(), g = AC.createGain(); o.type = s.w; o.frequency.setValueAtTime(f, t);
      if (s.glide) o.frequency.exponentialRampToValueAtTime(f * s.glide, t + d);
      if (s.vib) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = s.vib; lg.gain.value = f * .02; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d * 2); }
      const v = s.vol || .09; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + d * 1.8);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d * 1.9); t += d;
    });
    return true;
  } catch { return false; }
}

// ---------- haptics (Android; iPhones ignore vibration) ----------
const BUZZ = { soft: [12, 60, 12], wave: [10, 30, 20, 30, 30], hug: [30, 40, 70], hop: [10, 50, 10, 50, 10], purr: [5, 15, 5, 15, 5, 15, 5, 15, 5], heart: [20, 90, 35], tap: [8, 40, 8, 40, 8], spell: [8, 30, 8, 30, 30], flicker: [5, 20, 5, 70, 5, 20, 5] };
function buzz(kind) { const b = BUZZ[P().bz] || BUZZ.soft; return kind === 'send' ? [b[0]] : b; }

// ---------- celebrate ----------
function confettiEm(n = 60) {
  if (!motion()) return; const em = seg(P().cf); const k = Math.max(4, Math.round(n / 5));
  for (let i = 0; i < k; i++) { const d = document.createElement('div'); d.className = 'conf fuConfE'; d.textContent = pick(em); d.style.left = Math.random() * 100 + 'vw'; d.style.fontSize = 14 + Math.random() * 12 + 'px'; d.style.animationDuration = (2.4 + Math.random() * 2) + 's'; d.style.animationDelay = Math.random() * .6 + 's'; document.body.appendChild(d); setTimeout(() => d.remove(), 5500); }
}
function wrapFX() {
  const FX = window.FX; if (!FX || FX.__fu) return; FX.__fu = 1;
  const c0 = FX.confetti; FX.confetti = (n) => { c0(n); confettiEm(n); };
  FX.fireworks = (times = 5) => { if (!motion()) return; const em = seg(P().cf).concat('✨'); for (let i = 0; i < times; i++) setTimeout(() => FX.burst(innerWidth * (.2 + Math.random() * .6), innerHeight * (.2 + Math.random() * .4), em, 16, 110), i * 280); };
}

// ---------- words in place ----------
function paintStreak() {
  const [ic, lb] = P().sk;
  document.querySelectorAll('.streak .flame:first-child').forEach((f) => { const n = (f.firstChild && f.firstChild.textContent.match(/\d+/) || ['0'])[0]; if (f.firstChild && f.firstChild.nodeType === 3) f.firstChild.textContent = `${ic} ${n}`; const s = f.querySelector('small'); if (s) s.textContent = lb; });
}
function paintEmpty() {
  const pl = $('#pingList'); if (pl && !pl.querySelector('.row')) { const m = pl.querySelector('p.muted'); if (m) m.textContent = P().e; }
  const g = $('#gallery'); if (g && !g.querySelector('.polaroid')) { const m = g.querySelector('p.muted'); if (m) m.textContent = P().e + ' — photos & videos you send in Chat land here too 💬'; }
}
function applyWords() {
  const p = P();
  const s = $('#pingBtn small'); if (s) s.textContent = p.p;
  const t = $('#chTxt'); if (t) t.placeholder = p.m;
  const r = document.querySelector('.ptr span'); if (r) r.textContent = p.ld;
  paintStreak(); paintEmpty();
}

// ---------- day & night ----------
let skyKey = '';
function setTod() {
  const h = new Date().getHours(); const tod = h >= 20 || h < 6 ? 'night' : h >= 17 ? 'golden' : 'day';
  root.dataset.tod = tod;
  if (!document.getElementById('fuTint')) { const t = document.createElement('div'); t.id = 'fuTint'; t.setAttribute('aria-hidden', 'true'); document.body.appendChild(t); }
  let L = document.getElementById('fuSky');
  const key = tod + tid();
  if (tod !== 'night' || !motion()) { if (L) L.remove(); skyKey = ''; return; }
  if (L && skyKey === key) return; skyKey = key;
  if (!L) { L = document.createElement('div'); L.id = 'fuSky'; L.setAttribute('aria-hidden', 'true'); document.body.appendChild(L); }
  const spots = [[8, 16], [88, 24], [22, 38], [72, 52], [12, 68], [80, 80]];
  L.innerHTML = spots.map(([x, y], i) => `<i style="left:${x}%;top:${y}%;animation-delay:${i * 1.3}s">${i % 2 ? '✦' : P().nt}</i>`).join('');
}

// ---------- hidden surprise ----------
let eggBusy = false;
function playEgg(auto) {
  if (eggBusy) return; eggBusy = true; const [em, line] = P().eg;
  const o = document.createElement('div'); o.className = 'fuEgg'; o.innerHTML = `<div class="fuEggIn"><b>${em}</b><p></p><small>${auto ? 'A little surprise for today' : 'You found the secret ✨'}</small></div>`;
  o.querySelector('p').textContent = line; document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('on')); sound('ping'); try { navigator.vibrate && navigator.vibrate(buzz('ping')); } catch { /* */ }
  if (window.FX && motion()) { setTimeout(() => FX.fireworks(3), 250); confettiEm(90); }
  const close = () => { o.classList.remove('on'); setTimeout(() => { o.remove(); eggBusy = false; }, 400); };
  o.onclick = close; setTimeout(close, 4200);
}
function eggTaps() {
  let n = 0, t0 = 0;
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#homeHi b')) return; const t = Date.now(); if (t - t0 > 2500) n = 0; t0 = t;
    if (++n >= 5) { n = 0; playEgg(false); }
  });
}
function eggDates() {
  const d = today(), md = d.slice(5); if (LSg('fu_egg_day') === d + tid()) return;
  const a = LSg('cc_anniv'); const anniv = a && a.slice(5, 10) === md;
  if (md === P().eg[2] || md === '02-14' || anniv) { LSs('fu_egg_day', d + tid()); setTimeout(() => playEgg(true), 1600); }
}

// ---------- "just for us" card: themed question + idea ----------
let off = 0;
function paintCorner() {
  const home = $('#tab-home'); const F_ = F(); if (!home || !F_ || !F_.S.couple) return;
  let c = $('#fuThemeQ');
  if (!c) { c = document.createElement('div'); c.id = 'fuThemeQ'; c.className = 'card fuThemeQ'; const r = $('#fuRitual'); if (r && r.parentNode === home) r.after(c); else home.appendChild(c); }
  const p = P(), h = hash(today() + tid()), q = p.q[(h + off) % p.q.length], idea = p.i[(h + off) % p.i.length];
  c.innerHTML = `<h2>${p.cf ? seg(p.cf)[0] : '💞'} Just for us</h2><p class="fuTQ"></p><div class="fuTQb"><button type="button" class="soft mini" data-ask>Ask in chat</button><button type="button" class="soft mini" data-next>Another</button></div><p class="muted fuTI"></p>`;
  c.querySelector('.fuTQ').textContent = q; c.querySelector('.fuTI').textContent = '💡 ' + idea;
  c.querySelector('[data-next]').onclick = () => { off++; paintCorner(); };
  c.querySelector('[data-ask]').onclick = () => {
    if (window.FU_used) window.FU_used('themeq');
    F_.goTab('chat'); setTimeout(() => { const t = $('#chTxt'); if (!t) return; t.value = q; t.dispatchEvent(new Event('input', { bubbles: true })); t.focus(); }, 250);
  };
}

// ---------- the "we're both here" moment ----------
let was = false;
function moment(on) {
  const prev = was; was = on; if (!on || prev) return;
  try { if (sessionStorage.getItem('fu_moment')) return; sessionStorage.setItem('fu_moment', '1'); } catch { /* */ }
  const S = F() && F().S; if (!S || !S.partner || document.hidden) return;
  const out = String(S.user.id) < String(S.partner.id); const em = P().sh;
  F().toast(`${em} ${pname()} is here too`, 3000); sound('recv');
  if (!motion()) return;
  const e = document.createElement('div'); e.className = 'fuMoment'; e.textContent = em; document.body.appendChild(e);
  const W = innerWidth, H = innerHeight;
  const kf = out
    ? [{ transform: `translate(${W / 2}px,${H * .62}px) scale(.4)`, opacity: 0 }, { transform: `translate(${W / 2}px,${H * .5}px) scale(1.3)`, opacity: 1, offset: .25 }, { transform: `translate(${W * .7}px,${H * .25}px) scale(1) rotate(12deg)`, opacity: 1, offset: .6 }, { transform: `translate(${W + 60}px,-80px) scale(.6) rotate(24deg)`, opacity: 0 }]
    : [{ transform: `translate(-60px,-80px) scale(.6) rotate(-24deg)`, opacity: 0 }, { transform: `translate(${W * .3}px,${H * .25}px) scale(1) rotate(-12deg)`, opacity: 1, offset: .4 }, { transform: `translate(${W / 2}px,${H * .5}px) scale(1.4)`, opacity: 1, offset: .75 }, { transform: `translate(${W / 2}px,${H * .5}px) scale(.2)`, opacity: 0 }];
  e.animate(kf, { duration: 2200, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'forwards' });
  if (!out && window.FX) setTimeout(() => FX.burst(W / 2, H * .5, seg(P().cf), 14, 90), 1650);
  setTimeout(() => e.remove(), 2400);
}
document.addEventListener('fu:together', (e) => moment(!!e.detail));

// ---------- settings toggle ----------
function soundToggle() {
  if ($('#setTsnd')) return; const ty = $('#setTyping'); const lab = ty && ty.closest('label'); if (!lab) return;
  lab.insertAdjacentHTML('afterend', '<label class="tgl"><input type="checkbox" id="setTsnd"> <span>Theme sounds 🔔</span></label>');
  const c = $('#setTsnd'); c.checked = LSg('fu_tsnd') === '1';
  c.onchange = () => { LSs('fu_tsnd', c.checked ? '1' : '0'); if (c.checked) sound('ping'); };
}

// ---------- public hooks for app.js ----------
const GREET = {"halloween": ["Rise and haunt 🎃☀️", "Sweet nightmares 🦇🌙"], "hp": ["Good morning, wizard 🦉☀️", "Nox — goodnight 🪄🌙"], "naruto": ["Good morning, believe it 🍥☀️", "Goodnight, rest that chakra 🍥🌙"], "onepiece": ["Morning, crewmate 👒☀️", "Goodnight, captain 👒🌙"], "frozen": ["Good morning, snowflake ❄️☀️", "Goodnight, stay warm ⛄🌙"], "tangled": ["Good morning, sunshine 🏮☀️", "Goodnight — dream of lanterns 🏮🌙"], "stranger": ["Morning from the right side up 💡☀️", "Goodnight — lights on 💡🌙"], "tvd": ["Good morning 🩸☀️", "Goodnight, always 🖤🌙"], "originals": ["Good morning, always ⚜️☀️", "Goodnight, always and forever ⚜️🌙"], "bridgerton": ["Good morning, dearest 🦢☀️", "Goodnight, dearest 🦢🌙"], "pp": ["Good morning, dearest 🪶☀️", "Goodnight, most ardently 🪶🌙"], "gilmore": ["Coffee? Good morning ☕☀️", "Goodnight, talk fast tomorrow ☕🌙"], "bears": ["Good morning, bear 🐻☀️", "Goodnight, cuddle bear 🧸🌙"], "bunnies": ["Good morning, bunny 🐰☀️", "Goodnight, little bunny 🐰🌙"], "cats": ["Good meowning 🐱☀️", "Goodnight, curl up 🐱🌙"], "penguins": ["Good morning, my pebble 🐧☀️", "Goodnight, waddle to bed 🐧🌙"], "foxes": ["Good morning, foxy 🦊☀️", "Goodnight from the den 🦊🌙"], "pandas": ["Good morning, sleepy panda 🐼☀️", "Goodnight, lazy panda 🐼🌙"], "sea": ["Good morning from the sea 🐚☀️", "Goodnight, sweet dreams under the waves 🐚🌙"], "ocean": ["Good morning 🌊☀️", "Goodnight, drift off 🌊🌙"], "midnight": ["Good morning, star ⭐☀️", "Goodnight, under the same moon 🌙"], "starry": ["Good morning, star ⭐☀️", "Goodnight — make a wish 🌠"], "sailormoon": ["Good morning, moon power 🌙☀️", "Goodnight, in the name of the moon 🌙"], "yourname": ["Good morning ☄️☀️", "Goodnight — same sky ☄️🌙"], "spirited": ["Good morning 🏮☀️", "Goodnight — I won't forget your name 🏮🌙"], "howl": ["Good morning, star ⭐☀️", "Goodnight — Calcifer says hi 🔥🌙"], "coco": ["Buenos días 🌼☀️", "Goodnight, remember me 🌼🌙"], "beauty": ["Good morning 🌹☀️", "Goodnight 🌹🌙"], "lalaland": ["Good morning, dreamer 🎹☀️", "Goodnight, city of stars 🌃🌙"], "titanic": ["Good morning 💎☀️", "Goodnight — never let go 💎🌙"], "notebook": ["Good morning, it's me again 🛶☀️", "Goodnight — another letter tomorrow 🛶🌙"], "twilight": ["Good morning from Forks 🍎☀️", "Goodnight 🍎🌙"], "aot": ["Good morning, soldier 🪽☀️", "Goodnight — rest your wings 🪽🌙"], "demonslayer": ["Good morning 🪻☀️", "Goodnight — total concentration on sleep 🪻🌙"], "balloons": ["Good morning, adventurer 🎈☀️", "Goodnight — adventure tomorrow 🎈🌙"], "fairytale": ["Good morning, my royal 👑☀️", "Goodnight — happily ever after 🏰🌙"], "garden": ["Good morning, flower 🌷☀️", "Goodnight, sleep in bloom 🌷🌙"], "forest": ["Good morning from the woods 🍄☀️", "Goodnight, sleep like a fawn 🦌🌙"]};
window.FU_P = {
  w: (k) => ({ streakIcon: P().sk[0], streak: P().sk[1], empty: P().e, gm: (GREET[tid()] || [])[0], gn: (GREET[tid()] || [])[1] }[k]),
  pingLine: () => pick(P().pl),
  pingSent: (name) => `${P().ok} ${name}! ${P().sh}`,
  rx: () => ['❤️', '😂', ...P().rx],
  hiEm: (h) => (h >= 20 || h < 5 ? P().nt : null),
  sound, buzz, confettiEm, playEgg,
  em: () => P().sh, // the theme's own little emoji (pull-to-refresh, sleepy pet…)
};

function apply() { try { F() && F().paintHi && F().paintHi(); } catch { /* */ } applyWords(); setTod(); paintCorner(); }
document.addEventListener('cc:theme', () => { off = 0; setTimeout(apply, 60); });
const prevEnter = window.FU_enter;
window.FU_enter = async (...a) => { const r = prevEnter ? prevEnter(...a) : undefined; try { return await r; } finally { apply(); eggDates(); } };
setInterval(setTod, 5 * 60 * 1000);
const boot = () => { wrapFX(); soundToggle(); apply(); eggTaps(); };
if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
