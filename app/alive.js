// For Us v29 — living scenes: Colour themes get moving skies, Animal themes get a little pet that wanders by,
// and every season gets its own moments.
(() => {
'use strict';
const root = document.documentElement;
const LSg = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const LSs = (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } };
const ok = () => !(matchMedia('(prefers-reduced-motion: reduce)').matches || LSg('cc_reduce_motion') === '1' || LSg('cc_cute_fx') === '0');
const R = Math.random, f = (v) => v.toFixed(1);
const tid = () => root.dataset.theme || '';
const season = () => (window.CC_season && window.CC_season()) || null;

// ---------- building blocks ----------
const bokeh = (n, hue) => Array.from({ length: n }, () => `<i class="al bk" style="left:${f(R() * 100)}%;--s:${f(30 + R() * 70)}px;--c:${hue || 'var(--ac2)'};animation-duration:${f(22 + R() * 18)}s;animation-delay:${f(-R() * 40)}s"></i>`).join('');
const petals = (n, em) => Array.from({ length: n }, (_, i) => `<i class="al pt" style="left:${f(R() * 100)}%;font-size:${f(12 + R() * 9)}px;animation-duration:${f(11 + R() * 9)}s;animation-delay:${f(-R() * 20)}s"><b style="animation-duration:${f(2.5 + R() * 2)}s">${em[i % em.length]}</b></i>`).join('');
const flutter = (n, em) => Array.from({ length: n }, (_, i) => `<i class="al bf${i % 2 ? ' r' : ''}" style="top:${f(14 + R() * 55)}%;animation-duration:${f(18 + R() * 10)}s;animation-delay:${f(-R() * 26)}s"><b>${em}</b></i>`).join('');
const swirl = (n, em) => Array.from({ length: n }, (_, i) => `<i class="al sw" style="top:${f(10 + R() * 70)}%;font-size:${f(13 + R() * 8)}px;animation-duration:${f(14 + R() * 10)}s;animation-delay:${f(-R() * 24)}s">${em[i % em.length]}</i>`).join('');
const sparkle = (n) => Array.from({ length: n }, () => `<i class="al sp" style="left:${f(R() * 100)}%;top:${f(R() * 90)}%;animation-duration:${f(2.6 + R() * 3)}s;animation-delay:${f(-R() * 6)}s">✦</i>`).join('');
const birds = () => `<div class="al flock" style="top:${f(10 + R() * 18)}%"><svg viewBox="0 0 20 8"><path d="M0 5 Q5 0 10 5 Q15 0 20 5"/></svg><svg viewBox="0 0 20 8"><path d="M0 5 Q5 0 10 5 Q15 0 20 5"/></svg><svg viewBox="0 0 20 8"><path d="M0 5 Q5 0 10 5 Q15 0 20 5"/></svg><svg viewBox="0 0 20 8"><path d="M0 5 Q5 0 10 5 Q15 0 20 5"/></svg></div>`;
const rays = (cls) => `<i class="al rays ${cls || ''}"></i>`;
const balloons = (n, em) => Array.from({ length: n }, (_, i) => `<i class="al bl" style="left:${f(8 + R() * 84)}%;animation-duration:${f(18 + R() * 12)}s;animation-delay:${f(-R() * 30)}s"><b>${em[i % em.length]}</b></i>`).join('');

// one scene per Colour / Animal theme
const SCENE = {
  blush: () => bokeh(9, '#ff9fbf') + petals(9, ['🌸', '🌸', '💮']) + balloons(2, ['💗', '💞']),
  lavender: () => bokeh(8, '#c3a4f2') + flutter(3, '🦋') + petals(6, ['🪻', '💜']) + sparkle(8),
  ocean: () => rays('cau') + bokeh(6, '#8cc8ff') + '<i class="al boat">⛵</i>' + birds(),
  mint: () => bokeh(8, '#8fe0c0') + swirl(7, ['🍃', '🌿', '🍃']) + sparkle(10),
  sunset: () => rays('sun') + bokeh(7, '#ffb07a') + birds() + birds(),
  midnight: () => '<i class="al aur a1"></i><i class="al aur a2"></i>' + sparkle(10),
  bears: () => bokeh(6, '#e0b07a') + flutter(2, '🐝'),
  bunnies: () => bokeh(6, '#ffc2d8') + flutter(2, '🦋') + petals(5, ['🌼', '🌸']),
  cats: () => bokeh(6, '#ffcf99') + flutter(1, '🦋'),
  penguins: () => bokeh(6, '#bfe3ff') + sparkle(10),
  foxes: () => bokeh(6, '#ffb070') + swirl(8, ['🍂', '🍁', '🍂']),
  pandas: () => bokeh(6, '#b7e3a1') + swirl(6, ['🍃', '🎋']),
};
// the little pet that wanders along the bottom
const PETS = {
  bears: { em: '🐻', g: 'waddle', idle: ['🍯', '💛'] },
  bunnies: { em: '🐇', g: 'hop', flip: 1, idle: ['🥕', '💗'] },
  cats: { em: '🐈', g: 'trot', flip: 1, idle: ['🧶', '💤'], lead: '🧶' },
  penguins: { em: '🐧', g: 'waddle', slide: 1, idle: ['❄️', '💙'] },
  foxes: { em: '🦊', g: 'trot', idle: ['🍂', '🧡'] },
  pandas: { em: '🐼', g: 'roll', idle: ['🎋', '💚'] },
};
// seasons add their own moment on top of any theme
const SEASON_SCENE = {
  valentine: () => balloons(4, ['💗', '❤️', '💝', '💕']),
  winter: () => '<i class="al gust"></i>' + sparkle(6),
  ramadan: () => sparkle(12) + '<i class="al moonglow"></i>',
  eid: () => sparkle(8),
  newyear: () => sparkle(10),
  spooky: () => flutter(2, '🦇'),
  anniversary: () => balloons(3, ['🎈', '💞', '🥂']) + sparkle(8),
};

// ---------- scene layer ----------
let key = '';
function paint() {
  let L = document.getElementById('fuAlive');
  const s = season(), k = tid() + '|' + (s ? s.id : '') + '|' + ok();
  if (k === key && L) return; key = k;
  const html = ok() ? ((SCENE[tid()] || (() => ''))() + (s && SEASON_SCENE[s.id] ? SEASON_SCENE[s.id]() : '')) : '';
  if (!html) { if (L) L.remove(); return; }
  if (!L) { L = document.createElement('div'); L.id = 'fuAlive'; L.setAttribute('aria-hidden', 'true'); const amb = document.getElementById('thAmb'); if (amb) amb.after(L); else document.body.prepend(L); }
  L.innerHTML = html;
}

// ---------- shooting stars & fireworks (timed) ----------
let tTimer = 0;
function timed() {
  clearTimeout(tTimer); if (!ok()) return;
  const s = season(), th = tid();
  const star = th === 'midnight' || th === 'starry' || (s && s.id === 'ramadan');
  const fw = s && (s.id === 'newyear' || s.id === 'eid' || s.id === 'anniversary');
  if (!star && !fw) return;
  const go = () => {
    if (!document.hidden && !document.body.classList.contains('inChat')) {
      if (star) shootingStar();
      if (fw) firework(innerWidth * (.15 + R() * .7), innerHeight * (.12 + R() * .3));
    }
    tTimer = setTimeout(go, (star && !fw ? 7000 : 4500) + R() * 7000);
  };
  tTimer = setTimeout(go, 2500);
}
function shootingStar() {
  const e = document.createElement('i'); e.className = 'fuShoot'; e.setAttribute('aria-hidden', 'true');
  const x = innerWidth * (.3 + R() * .7), y = innerHeight * (R() * .3);
  e.style.left = x + 'px'; e.style.top = y + 'px'; document.body.appendChild(e);
  e.animate([{ transform: 'translate(0,0) rotate(-35deg) scaleX(.2)', opacity: 0 }, { opacity: 1, offset: .15 }, { transform: 'translate(-260px,180px) rotate(-35deg) scaleX(1)', opacity: 0 }], { duration: 1300, easing: 'ease-out', fill: 'forwards' });
  setTimeout(() => e.remove(), 1400);
}
function firework(x, y) {
  const s = season(); const cols = ['#ffd36b', '#ff6fa8', '#7fd3ff', '#b28dff', '#7dffb0', '#fff'];
  const w = document.createElement('div'); w.className = 'fuFw'; w.style.left = x + 'px'; w.style.top = y + 'px'; w.setAttribute('aria-hidden', 'true');
  const c = cols[Math.floor(R() * cols.length)], n = 16;
  w.innerHTML = Array.from({ length: n }, (_, i) => `<i style="--a:${(360 / n) * i}deg;--c:${i % 3 ? c : '#fff'}"></i>`).join('') + (s && s.id === 'eid' && R() < .4 ? '<b>🌙</b>' : '');
  document.body.appendChild(w); setTimeout(() => w.remove(), 1800);
}

// ---------- the pet ----------
let petT = 0, petBusy = false, gen = 0;
const petAllowed = () => ok() && PETS[tid()] && !document.hidden && !document.body.classList.contains('inChat') && !document.body.classList.contains('kbOpen') && !document.querySelector('.modal:not(.hidden),.uiDlg,.fuEgg');
function schedulePet(first) { clearTimeout(petT); if (!PETS[tid()]) return; petT = setTimeout(walk, first ? 5000 + R() * 4000 : 22000 + R() * 26000); }
function navTop() { const n = document.querySelector('.nav'); if (!n || document.body.classList.contains('navAway') || getComputedStyle(n).display === 'none') return innerHeight; return n.getBoundingClientRect().top; }
async function walk() {
  if (petBusy) return; if (!petAllowed()) { schedulePet(); return; }
  petBusy = true; const my = gen; const p = PETS[tid()]; const right = R() < .5, W = innerWidth;
  const el = document.createElement('div'); el.className = 'fuPet g-' + p.g; el.setAttribute('aria-label', 'a little friend');
  el.innerHTML = `${p.lead ? `<span class="lead">${p.lead}</span>` : ''}<span class="body"><b>${p.em}</b></span>`;
  if (right === !!p.flip) el.classList.add('flip');
  el.style.top = (navTop() - 50) + 'px'; document.body.appendChild(el);
  const from = right ? -70 : W + 20, to = right ? W + 70 : -90, mid = from + (to - from) * (.4 + R() * .2);
  const sp = p.g === 'hop' ? 75 : p.g === 'roll' ? 70 : 55; // px per second
  const leg = (a, b) => el.animate([{ transform: `translateX(${a}px)` }, { transform: `translateX(${b}px)` }], { duration: Math.abs(b - a) / sp * 1000, easing: 'linear', fill: 'forwards' }).finished;
  let tapped = false;
  el.addEventListener('click', () => {
    if (tapped) return; tapped = true; el.classList.add('happy');
    if (window.FX) window.FX.burstAt(el, ['💗', '💕', ...p.idle], 10, 70);
    if (window.FU_P) window.FU_P.sound('recv'); try { navigator.vibrate && navigator.vibrate(12); } catch { /* */ }
    setTimeout(() => el.classList.remove('happy'), 900);
  });
  try {
    await leg(from, mid);
    if (!el.isConnected) throw 0;
    el.classList.add('idle'); const bub = document.createElement('i'); bub.className = 'say'; bub.textContent = p.idle[Math.floor(R() * p.idle.length)]; el.appendChild(bub);
    await new Promise((r) => setTimeout(r, 2600)); el.classList.remove('idle'); bub.remove();
    if (p.slide && R() < .7) el.classList.add('sliding');
    await leg(mid, to);
  } catch { /* removed */ }
  el.remove(); if (my === gen) { petBusy = false; schedulePet(); }
}

// ---------- season moments: tap the banner, and a hello once a day ----------
function seasonBits() {
  const s = season(); if (!s) return;
  const bn = document.getElementById('seasonBanner');
  if (bn && !bn.dataset.fuTap) {
    bn.dataset.fuTap = '1';
    bn.addEventListener('click', () => { const c = season(); if (!c || !window.FX) return; FX.burstAt(bn, c.parts || ['✨'], 18, 120); if (window.FU_P) window.FU_P.sound('ping'); bn.classList.remove('pop'); void bn.offsetWidth; bn.classList.add('pop'); });
  }
  const d = new Date().toDateString() + s.id;
  if (LSg('fu_sgreet') !== d && ok()) {
    LSs('fu_sgreet', d);
    setTimeout(() => { const b = document.getElementById('seasonBanner'); if (window.FX && b && b.offsetParent) { FX.burstAt(b, s.parts || ['✨'], 22, 140); b.classList.add('pop'); } if (s.id === 'newyear' || s.id === 'eid') for (let i = 0; i < 4; i++) setTimeout(() => firework(innerWidth * (.2 + R() * .6), innerHeight * (.15 + R() * .25)), i * 350); }, 1200);
  }
}

function refresh() { gen++; petBusy = false; document.querySelectorAll('.fuPet').forEach((e) => e.remove()); paint(); timed(); schedulePet(true); setTimeout(seasonBits, 300); }
document.addEventListener('cc:theme', () => setTimeout(refresh, 80));
document.addEventListener('visibilitychange', () => { if (!document.hidden) { key = ''; paint(); } });
const prevEnter = window.FU_enter;
window.FU_enter = async (...a) => { const r = prevEnter ? prevEnter(...a) : undefined; try { return await r; } finally { setTimeout(seasonBits, 400); } };
window.FU_alive = { walk: () => { clearTimeout(petT); walk(); }, firework, shootingStar, refresh };
if (document.readyState !== 'loading') refresh(); else document.addEventListener('DOMContentLoaded', refresh);
})();
