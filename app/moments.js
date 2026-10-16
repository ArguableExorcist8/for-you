// For Us v32 — little theme moments: every few seconds something from the theme's world passes by.
// Types: swoop (flies across in an arc), zip (darts around), peek (peeks from an edge), drop (hangs down on a thread),
// float (rises and fades), pop (blooms in place), rain (a short shower), trail (a sparkle streak), roll (rolls along the bottom),
// pulse (a soft glow in the background), orbit (a little ring that spins away)
(() => {
'use strict';
const M = {
  blush: [['pop', '🌸'], ['rain', '🌸💮🌸'], ['float', '💗'], ['orbit', '💕'], ['swoop', '🦋'], ['pulse', '💗']],
  lavender: [['swoop', '🦋'], ['rain', '🪻💜'], ['pop', '🪻'], ['trail', '✨'], ['float', '☁️'], ['orbit', '💜']],
  ocean: [['float', '🫧'], ['swoop', '🐬'], ['peek', '🐳'], ['zip', '🐠'], ['rain', '💧'], ['pulse', '🌊']],
  mint: [['rain', '🍃🌿'], ['pop', '🌱'], ['swoop', '🦋'], ['zip', '🐞'], ['trail', '✨'], ['orbit', '🍃']],
  sunset: [['swoop', '🕊️'], ['pulse', '☀️'], ['float', '🎈'], ['trail', '✨'], ['rain', '🧡'], ['pop', '🌅']],
  midnight: [['trail', '🌠'], ['pop', '⭐'], ['pulse', '🌙'], ['swoop', '🦉'], ['orbit', '✨'], ['zip', '✨']],
  bears: [['peek', '🐻'], ['zip', '🐝'], ['roll', '🍯'], ['float', '🎈'], ['pop', '🧸'], ['rain', '🤎🍯']],
  bunnies: [['peek', '🐰'], ['roll', '🥕'], ['swoop', '🦋'], ['pop', '🌷'], ['rain', '🌸🌼'], ['orbit', '🥕']],
  cats: [['peek', '🐱'], ['roll', '🧶'], ['zip', '🦋'], ['pop', '🐾'], ['swoop', '🐟'], ['peek', '😼']],
  penguins: [['peek', '🐧'], ['rain', '❄️❅'], ['roll', '🐧'], ['pop', '🧊'], ['swoop', '🐟'], ['orbit', '❄️']],
  foxes: [['peek', '🦊'], ['rain', '🍂🍁'], ['zip', '🍂'], ['pop', '🍄'], ['swoop', '🐦'], ['roll', '🌰']],
  pandas: [['peek', '🐼'], ['rain', '🍃🎋'], ['roll', '🐼'], ['pop', '🥟'], ['zip', '🦋'], ['orbit', '🍃']],
  balloons: [['float', '🎈'], ['float', '🎈'], ['swoop', '🏠'], ['pop', '☁️'], ['trail', '✨'], ['swoop', '🐦']],
  starry: [['trail', '🌠'], ['pop', '⭐'], ['orbit', '✨'], ['pulse', '🌙'], ['zip', '💫'], ['swoop', '🪐']],
  fairytale: [['trail', '✨'], ['swoop', '🧚'], ['pop', '👑'], ['swoop', '🕊️'], ['orbit', '💫'], ['peek', '🦄']],
  sea: [['float', '🫧'], ['zip', '🐠'], ['peek', '🐙'], ['swoop', '🐢'], ['pop', '🐚'], ['peek', '🦀']],
  garden: [['swoop', '🦋'], ['zip', '🐝'], ['pop', '🌷'], ['rain', '🌸🌼'], ['peek', '🐌'], ['pop', '🌻']],
  forest: [['zip', '✨'], ['peek', '🦉'], ['pop', '🍄'], ['swoop', '🧚'], ['peek', '🦌'], ['rain', '🍃']],
  tvd: [['swoop', '🦇'], ['swoop', '🐦‍⬛'], ['pulse', '🌙'], ['rain', '🌹'], ['drop', '🩸'], ['peek', '🐺']],
  originals: [['pulse', '⚜️'], ['swoop', '🦇'], ['float', '✦'], ['pop', '🍷'], ['peek', '🐺'], ['trail', '✨']],
  hp: [['swoop', '🦉'], ['zip', '🟡'], ['float', '🕯️'], ['trail', '✨'], ['pop', '⚡'], ['swoop', '🧹']],
  bridgerton: [['swoop', '🦢'], ['rain', '🌸🤍'], ['pop', '💌'], ['swoop', '🐝'], ['float', '🎀'], ['orbit', '✨']],
  gilmore: [['pulse', '☕'], ['rain', '🍂🍁'], ['pop', '📚'], ['float', '♨️'], ['roll', '🥧'], ['swoop', '🍂']],
  stranger: [['pulse', '💡'], ['zip', '💡'], ['peek', '🧇'], ['swoop', '🚲'], ['rain', '·•'], ['drop', '🎄']],
  twilight: [['swoop', '🦇'], ['rain', '🌧️'], ['roll', '🍎'], ['peek', '🐺'], ['pulse', '🌙'], ['swoop', '🐦‍⬛']],
  notebook: [['swoop', '🦢'], ['rain', '🌧️'], ['float', '✉️'], ['pop', '🌼'], ['swoop', '🕊️'], ['peek', '🛶']],
  titanic: [['trail', '✨'], ['pop', '💎'], ['peek', '🚢'], ['swoop', '🕊️'], ['float', '🫧'], ['orbit', '💎']],
  lalaland: [['float', '🎶'], ['pop', '⭐'], ['trail', '✨'], ['swoop', '🎷'], ['orbit', '🎵'], ['pulse', '💛']],
  pp: [['rain', '🍃🌼'], ['swoop', '🪶'], ['pop', '💌'], ['swoop', '🐦'], ['float', '🌫️'], ['peek', '🐎']],
  tangled: [['float', '🏮'], ['float', '🏮'], ['peek', '🦎'], ['pop', '☀️'], ['trail', '✨'], ['rain', '🌸']],
  beauty: [['rain', '🌹'], ['pop', '🌹'], ['float', '🕯️'], ['peek', '🫖'], ['trail', '✨'], ['pulse', '💛']],
  frozen: [['rain', '❄️❅❆'], ['peek', '⛄'], ['orbit', '❄️'], ['trail', '✨'], ['pop', '❄️'], ['peek', '🦌']],
  howl: [['trail', '⭐'], ['pulse', '🔥'], ['swoop', '🌟'], ['float', '☁️'], ['pop', '🌼'], ['peek', '🏰']],
  coco: [['rain', '🌼🧡'], ['float', '🎶'], ['peek', '💀'], ['pop', '🎸'], ['swoop', '🦋'], ['float', '🕯️']],
  yourname: [['trail', '☄️'], ['pop', '✨'], ['swoop', '☄️'], ['orbit', '🎀'], ['pulse', '🌅'], ['zip', '✨']],
  naruto: [['rain', '🍃'], ['orbit', '🍥'], ['peek', '🐸'], ['swoop', '🌀'], ['pop', '🍜'], ['zip', '🍃']],
  aot: [['swoop', '🪽'], ['rain', '🍃'], ['pulse', '🧱'], ['trail', '✨'], ['swoop', '🐦'], ['peek', '🐎']],
  demonslayer: [['rain', '🌸🪻'], ['swoop', '🦋'], ['trail', '🌊'], ['pop', '🔥'], ['orbit', '🪻'], ['zip', '🦋']],
  onepiece: [['swoop', '👒'], ['peek', '🐌'], ['pop', '🍖'], ['roll', '🍊'], ['swoop', '🕊️'], ['float', '🫧']],
  sailormoon: [['trail', '💫'], ['pop', '🌙'], ['orbit', '⭐'], ['rain', '💖✨'], ['pulse', '🌙'], ['peek', '🐈‍⬛']],
  spirited: [['float', '🏮'], ['swoop', '🐉'], ['peek', '🐸'], ['float', '👻'], ['zip', '✨'], ['pop', '🍙']],
  halloween: [['swoop', '🦇'], ['drop', '🕷️'], ['peek', '👻'], ['swoop', '🧙‍♀️'], ['roll', '🎃'], ['pulse', '🌕'], ['float', '👻'], ['rain', '🍬🍂']],
};
const SEASON = {
  valentine: [['float', '💝'], ['rain', '💗🌹']], winter: [['rain', '❄️❅']], ramadan: [['float', '🏮'], ['trail', '🌠']],
  eid: [['pop', '🎉'], ['float', '🎈']], spooky: [['swoop', '🦇'], ['peek', '👻']], newyear: [['pop', '🎆'], ['rain', '🎊✨']],
  anniversary: [['float', '🎈'], ['pop', '🥂']],
};

const root = document.documentElement;
const LSg = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const ok = () => !(matchMedia('(prefers-reduced-motion: reduce)').matches || LSg('cc_reduce_motion') === '1' || LSg('cc_cute_fx') === '0' || LSg('fu_moments') === '0');
const R = Math.random, W = () => innerWidth, H = () => innerHeight;
const seg = (x) => (window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(x)].map((g) => g.segment) : Array.from(x));
const pick = (a) => a[Math.floor(R() * a.length)];
const between = (a, b) => a + R() * (b - a);

let layer = null;
function L() { if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.id = 'fuMom'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); } return layer; }
function put(em, size, cls) { const e = document.createElement('i'); e.className = 'mo' + (cls ? ' ' + cls : ''); if (cls === 'flip') { const b = document.createElement('b'); b.textContent = em; e.appendChild(b); } else e.textContent = em; e.style.fontSize = size + 'px'; L().appendChild(e); return e; }
const go = (e, kf, o) => { const a = e.animate(kf, Object.assign({ fill: 'forwards' }, o)); a.onfinish = () => e.remove(); return a; };
const bottomY = () => { const n = document.querySelector('.nav'); const t = n && !document.body.classList.contains('navAway') ? n.getBoundingClientRect().top : H(); return t; };

const RUN = {
  swoop(em) {
    const ltr = R() < .5, y0 = between(.1, .45) * H(), dy = between(-.12, .2) * H(), s = between(36, 52);
    const e = put(em, s, ltr ? 'flip' : ''); const x0 = ltr ? -60 : W() + 60, x1 = ltr ? W() + 60 : -60;
    const k = []; for (let i = 0; i <= 8; i++) { const t = i / 8; k.push({ transform: `translate(${x0 + (x1 - x0) * t}px,${y0 + dy * t - Math.sin(t * Math.PI) * between(40, 90)}px) rotate(${(ltr ? 1 : -1) * Math.sin(t * Math.PI * 2) * 10}deg)`, offset: t }); }
    go(e, k, { duration: between(3200, 5200), easing: 'cubic-bezier(.45,.05,.55,.95)' });
  },
  zip(em) {
    const e = put(em, between(20, 30)); let x = between(.15, .85) * W(), y = between(.15, .7) * H(); const k = [{ transform: `translate(${x}px,${y}px) scale(0)`, opacity: 0 }];
    for (let i = 1; i < 7; i++) { x = Math.max(20, Math.min(W() - 20, x + between(-110, 110))); y = Math.max(60, Math.min(H() - 140, y + between(-90, 90))); k.push({ transform: `translate(${x}px,${y}px) scale(1)`, opacity: 1 }); }
    k.push({ transform: `translate(${x + between(-200, 200)}px,${y - 160}px) scale(.4)`, opacity: 0 });
    go(e, k, { duration: between(2600, 3600), easing: 'ease-in-out' });
  },
  peek(em) {
    const side = pick(['l', 'r', 'b']); const s = between(54, 70); const e = put(em, s, 'peek');
    let a, b, rot = 0;
    if (side === 'b') { const x = between(.1, .8) * W(), y = bottomY(); a = `translate(${x}px,${y + 10}px)`; b = `translate(${x}px,${y - s * .62}px)`; }
    else { const y = between(.3, .7) * H(), l = side === 'l'; rot = l ? 25 : -25; a = `translate(${l ? -s : W() + 4}px,${y}px) rotate(${rot}deg)`; b = `translate(${l ? -s * .35 : W() - s * .65}px,${y}px) rotate(${rot}deg)`; }
    go(e, [{ transform: a }, { transform: b, offset: .22 }, { transform: b + ' scale(1.06)', offset: .35 }, { transform: b, offset: .5 }, { transform: b + ' rotate(-6deg)', offset: .62 }, { transform: b, offset: .78 }, { transform: a }], { duration: between(2600, 3400), easing: 'cubic-bezier(.34,1.3,.64,1)' });
  },
  drop(em) {
    const x = between(.12, .88) * W(), len = between(.16, .32) * H(); const e = put(em, between(30, 40), 'drop'); e.style.setProperty('--len', len + 'px');
    go(e, [{ transform: `translate(${x}px,-40px)` }, { transform: `translate(${x}px,${len}px)`, offset: .3 }, { transform: `translate(${x + 6}px,${len - 8}px) rotate(6deg)`, offset: .45 }, { transform: `translate(${x - 6}px,${len}px) rotate(-6deg)`, offset: .6 }, { transform: `translate(${x}px,${len - 4}px)`, offset: .72 }, { transform: `translate(${x}px,-40px)` }], { duration: between(3600, 4600), easing: 'ease-in-out' });
  },
  float(em) {
    const x = between(.08, .9) * W(), y = bottomY(); const e = put(em, between(30, 44)); const drift = between(-60, 60);
    go(e, [{ transform: `translate(${x}px,${y}px) scale(.5)`, opacity: 0 }, { opacity: .95, offset: .12 }, { transform: `translate(${x + drift * .5}px,${y - H() * .35}px) rotate(${between(-10, 10)}deg) scale(1)`, offset: .55 }, { transform: `translate(${x + drift}px,${y - H() * .7}px) scale(.9)`, opacity: 0 }], { duration: between(4800, 6800), easing: 'ease-out' });
  },
  pop(em) {
    const x = between(.12, .88) * W(), y = between(.18, .7) * H(); const e = put(em, between(38, 54));
    go(e, [{ transform: `translate(${x}px,${y}px) scale(0) rotate(-30deg)`, opacity: 0 }, { transform: `translate(${x}px,${y}px) scale(1.25) rotate(8deg)`, opacity: 1, offset: .2 }, { transform: `translate(${x}px,${y}px) scale(1) rotate(0)`, opacity: 1, offset: .35 }, { transform: `translate(${x}px,${y - 30}px) scale(.9)`, opacity: 0 }], { duration: between(2000, 2600), easing: 'cubic-bezier(.34,1.56,.64,1)' });
    for (let i = 0; i < 6; i++) { const s = put('✦', 10, 'spk'); const a = (i / 6) * Math.PI * 2; go(s, [{ transform: `translate(${x + 12}px,${y + 12}px) scale(.3)`, opacity: 1 }, { transform: `translate(${x + 12 + Math.cos(a) * 42}px,${y + 12 + Math.sin(a) * 42}px) scale(1)`, opacity: 0 }], { duration: 800, delay: 260, easing: 'ease-out' }); }
  },
  rain(em) {
    const list = seg(em).filter((c) => c.trim()); const n = Math.round(between(7, 12)); const x0 = between(0, .5) * W(), span = between(.4, .8) * W();
    for (let i = 0; i < n; i++) { const e = put(pick(list), between(16, 28)); const x = x0 + R() * span, sw = between(-40, 40);
      go(e, [{ transform: `translate(${x}px,-30px) rotate(0)`, opacity: 0 }, { opacity: .9, offset: .1 }, { transform: `translate(${x + sw}px,${H() * .5}px) rotate(${between(-120, 120)}deg)`, offset: .55 }, { transform: `translate(${x - sw * .5}px,${H() + 30}px) rotate(${between(-220, 220)}deg)`, opacity: .6 }], { duration: between(3400, 5200), delay: i * between(80, 180), easing: 'linear' }); }
  },
  trail(em) {
    const ltr = R() < .5, y0 = between(.08, .35) * H(), x0 = ltr ? between(-.1, .2) * W() : between(.8, 1.1) * W(), dx = (ltr ? 1 : -1) * between(.6, 1) * W(), dy = between(.1, .3) * H();
    const head = put(em, 28); go(head, [{ transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 }, { opacity: 1, offset: .1 }, { transform: `translate(${x0 + dx}px,${y0 + dy}px) scale(1)`, opacity: 0 }], { duration: 1500, easing: 'ease-in' });
    for (let i = 1; i < 10; i++) { const t = i / 10; const s = put(i % 2 ? '✦' : '·', between(8, 13), 'spk');
      go(s, [{ transform: `translate(${x0 + dx * t}px,${y0 + dy * t}px) scale(1)`, opacity: 0 }, { opacity: .9, offset: .1 }, { transform: `translate(${x0 + dx * t}px,${y0 + dy * t + 14}px) scale(.2)`, opacity: 0 }], { duration: 900, delay: 1500 * t * .9, easing: 'ease-out' }); }
  },
  roll(em) {
    const ltr = R() < .5, y = bottomY() - 38, s = 34; const e = put(em, s); const x0 = ltr ? -40 : W() + 40, x1 = ltr ? W() + 40 : -40, turns = (x1 - x0) / (Math.PI * s);
    go(e, [{ transform: `translate(${x0}px,${y}px) rotate(0)` }, { transform: `translate(${x1}px,${y}px) rotate(${turns * 360}deg)` }], { duration: between(3600, 5000), easing: 'linear' });
  },
  pulse(em) {
    const x = between(.15, .85) * W(), y = between(.12, .5) * H(); const e = put(em, between(90, 130), 'pulse');
    go(e, [{ transform: `translate(${x}px,${y}px) scale(.6)`, opacity: 0 }, { transform: `translate(${x}px,${y}px) scale(1)`, opacity: .3, offset: .4 }, { transform: `translate(${x}px,${y}px) scale(1.08)`, opacity: .16, offset: .6 }, { transform: `translate(${x}px,${y}px) scale(1.2)`, opacity: 0 }], { duration: between(3000, 4200), easing: 'ease-in-out' });
  },
  orbit(em) {
    const cx = between(.2, .8) * W(), cy = between(.2, .6) * H(), r = between(26, 40), n = 6;
    for (let i = 0; i < n; i++) { const e = put(em, between(18, 26)); const k = []; for (let j = 0; j <= 10; j++) { const t = j / 10, a = (i / n) * Math.PI * 2 + t * Math.PI * 1.6, rr = r * (0.3 + t * 1.6); k.push({ transform: `translate(${cx + Math.cos(a) * rr}px,${cy + Math.sin(a) * rr}px) scale(${t < .2 ? t * 5 : 1 - (t - .2) * .9})`, opacity: t < .15 ? t * 6 : 1 - t, offset: t }); }
      go(e, k, { duration: 2200, easing: 'ease-out' }); }
  },
};

let timer = 0, last = '';
function allowed() { return ok() && !document.hidden && !document.body.classList.contains('kbOpen') && !document.querySelector('.modal:not(.hidden),.uiDlg,.fuEgg,#heartOverlay:not(.hidden),#hugOverlay:not(.hidden)'); }
function pool() { const t = root.dataset.theme || 'blush'; let p = (M[t] || M.blush).slice(); const s = window.CC_season && window.CC_season(); if (s && SEASON[s.id]) p = p.concat(SEASON[s.id]); return p; }
function tick() {
  if (allowed()) {
    const p = pool(); let m, tries = 0; do { m = pick(p); tries++; } while (m[0] + m[1] === last && tries < 5); last = m[0] + m[1];
    try { RUN[m[0]](m[1]); } catch { /* */ }
  }
  timer = setTimeout(tick, between(4200, 9400)); // always under 10s, never on a beat
}
function start() { clearTimeout(timer); timer = setTimeout(tick, between(2500, 5000)); }
document.addEventListener('cc:theme', start);
window.FU_moment = (type, em) => { const p = pool(); const m = type ? [type, em || pick(p)[1]] : pick(p); RUN[m[0]] && RUN[m[0]](m[1]); };
function toggle() {
  if (document.getElementById('setMom')) return; const after = document.getElementById('setTsnd') || document.getElementById('setTyping'); const lab = after && after.closest('label'); if (!lab) return;
  lab.insertAdjacentHTML('afterend', '<label class="tgl"><input type="checkbox" id="setMom"> <span>Theme moments ✨</span></label>');
  const c = document.getElementById('setMom'); c.checked = LSg('fu_moments') !== '0';
  c.onchange = () => { try { localStorage.setItem('fu_moments', c.checked ? '1' : '0'); } catch { /* */ } if (c.checked) window.FU_moment(); };
}
const boot = () => { start(); setTimeout(toggle, 500); };
if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
