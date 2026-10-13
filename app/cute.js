// For Us — ambient cute effects (decorative only, pointer-events:none, behind content)
(() => {
  'use strict';
  const KEY = 'cc_cute_fx';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('cc_reduce_motion') === '1';
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const pname = () => { try { return (window.CC_partnerName && window.CC_partnerName()) || 'your love'; } catch { return 'your love'; } };
  let on = localStorage.getItem(KEY) !== '0';
  let layer = null, timers = [], popupT = null;

  const PARTS = ['💗', '💕', '✨', '💖', '⭐', '🌸', '♡', '✦'];
  const STICKERS = ['🧸', '🐰', '🐱', '🌷', '🌈', '🌸', '🐻', '🦋', '🍓', '🐥'];
  const LINES = [
    () => `Psst… ${pname()} is lucky to have you 💕`, () => 'Drink some water, cutie 💧', () => 'You look great today. Just saying 😌',
    () => `${pname()} probably smiled thinking of you just now 🥰`, () => 'Love fact: holding hands can lower stress 🤝', () => 'Love fact: couples\' heartbeats can sync when they gaze at each other 💓',
    () => 'Love fact: a 20-second hug releases oxytocin 🫂', () => 'Reminder: you\'re doing amazing ✨', () => 'Stretch break! Shoulders down, smile up 🙆',
    () => `Send ${pname()} a ping? 💗`, () => 'Compliment: your laugh is contagious 😄', () => 'Love fact: otters hold hands while sleeping 🦦',
    () => 'You + me = 💯', () => 'Breathe in… breathe out… you\'re loved 🌸'
  ];

  const css = document.createElement('style');
  css.textContent = `
  #cuteFx{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;contain:strict}
  #app{position:relative;z-index:1}
  .cfp{position:absolute;bottom:-30px;opacity:.5;will-change:transform;animation:cfUp linear forwards}
  @keyframes cfUp{to{transform:translate3d(var(--dx,20px),-110vh,0) rotate(var(--r,30deg))}}
  .cfs{position:absolute;font-size:10px;opacity:.6;animation:cfTw 3s ease-in-out infinite alternate}
  @keyframes cfTw{from{opacity:.1;transform:scale(.6)}to{opacity:.8;transform:scale(1.15)}}
  .cfk{position:absolute;font-size:46px;transition:transform 1.2s cubic-bezier(.2,1.4,.4,1);filter:drop-shadow(0 4px 8px rgba(200,50,100,.25))}
  .cfk.l{left:0;transform:translateX(-110%) rotate(20deg)}.cfk.r{right:0;transform:translateX(110%) rotate(-20deg)}
  .cfk.in{transform:translateX(-25%) rotate(12deg)}.cfk.r.in{transform:translateX(25%) rotate(-12deg)}
  .cfBub{position:fixed;bottom:calc(env(safe-area-inset-bottom) + 96px);z-index:85;max-width:min(78vw,300px);background:#fff;color:#8b2252;border-radius:20px;padding:10px 14px;box-shadow:0 8px 24px rgba(200,50,100,.3);font-size:14px;cursor:pointer;transition:transform .5s cubic-bezier(.2,1.3,.4,1),opacity .4s;pointer-events:auto;border:2px solid #ffd1dc}
  .cfBub.l{left:10px;transform:translateX(-130%)}.cfBub.r{right:10px;transform:translateX(130%)}.cfBub.in{transform:none}
  .cfBub small{display:block;color:#b45a82;font-size:11px;margin-top:2px}
  .cfBurst{position:fixed;pointer-events:none;z-index:96;font-size:18px;animation:cfB .8s ease-out forwards}
  @keyframes cfB{to{transform:translate(var(--bx),var(--by)) scale(.4);opacity:0}}

  @media (prefers-reduced-motion: reduce){.cfp,.cfs{animation:none}.cfk,.cfBub{transition:none}}`;
  document.head.appendChild(css);

  const every = (fn, ms) => { const t = setInterval(() => { if (!document.hidden) fn(); }, ms); timers.push(t); };
  const wide = () => innerWidth >= 760;

  function particle() {
    if (!layer || layer.childElementCount > 40) return;
    const p = document.createElement('div'); p.className = 'cfp'; p.textContent = pick(PARTS);
    // prefer side gutters on wide screens
    const gutter = wide() ? (Math.random() < .5 ? Math.random() * ((innerWidth - 520) / 2) : innerWidth - Math.random() * ((innerWidth - 520) / 2)) : Math.random() * innerWidth;
    p.style.left = gutter + 'px'; p.style.fontSize = (10 + Math.random() * 16) + 'px';
    const d = 14 + Math.random() * 14; p.style.animationDuration = d + 's';
    p.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px'); p.style.setProperty('--r', (Math.random() * 90 - 45) + 'deg');
    layer.appendChild(p); setTimeout(() => p.remove(), d * 1000 + 200);
  }
  function stars() {
    const n = wide() ? 26 : 10;
    for (let i = 0; i < n; i++) { const s = document.createElement('div'); s.className = 'cfs'; s.textContent = pick(['✦', '✧', '⋆', '·']);
      const x = wide() ? (i % 2 ? Math.random() * ((innerWidth - 520) / 2) : innerWidth - Math.random() * ((innerWidth - 520) / 2)) : Math.random() * innerWidth;
      s.style.left = x + 'px'; s.style.top = Math.random() * 100 + 'vh'; s.style.color = pick(['#e75480', '#ff8fab', '#c77dff', '#ffd166']);
      s.style.animationDelay = (Math.random() * 3) + 's'; s.style.animationDuration = (2 + Math.random() * 3) + 's'; layer.appendChild(s); }
  }
  function sticker() {
    if (!wide() || !layer) return;
    const k = document.createElement('div'); const side = Math.random() < .5 ? 'l' : 'r';
    k.className = 'cfk ' + side; k.textContent = pick(STICKERS); k.style.top = (15 + Math.random() * 65) + 'vh'; layer.appendChild(k);
    requestAnimationFrame(() => requestAnimationFrame(() => k.classList.add('in')));
    setTimeout(() => k.classList.remove('in'), 4000); setTimeout(() => k.remove(), 5500);
  }
  function burst(x, y, n = 8, set = ['💗', '💕', '💖', '✨']) {
    for (let i = 0; i < n; i++) { const b = document.createElement('div'); b.className = 'cfBurst'; b.textContent = pick(set);
      const a = Math.PI * 2 * i / n, r = 40 + Math.random() * 30; b.style.left = x - 9 + 'px'; b.style.top = y - 9 + 'px';
      b.style.setProperty('--bx', Math.cos(a) * r + 'px'); b.style.setProperty('--by', Math.sin(a) * r + 'px'); document.body.appendChild(b); setTimeout(() => b.remove(), 850); }
  }
  function popup() {
    if (!on || document.hidden || !document.querySelector('#mainView:not(.hidden)') || document.querySelector('.uiDlg,#modal:not(.hidden),#story:not(.hidden)')) return schedulePopup();
    const surprise = Math.random() < .25; const side = Math.random() < .5 ? 'l' : 'r';
    const b = document.createElement('div'); b.className = 'cfBub ' + side;
    b.innerHTML = surprise ? '🎁 <b>Tap me!</b><small>a tiny surprise</small>' : '';
    if (!surprise) { b.textContent = pick(LINES)(); const s = document.createElement('small'); s.textContent = 'tap to dismiss'; b.appendChild(s); }
    document.body.appendChild(b); requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('in')));
    const close = () => { b.classList.remove('in'); b.style.opacity = 0; setTimeout(() => b.remove(), 500); };
    b.onclick = (e) => { e.stopPropagation(); if (surprise) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 14, ['💖', '🎉', '✨', '🌸', '💕']); b.textContent = pick(['You are loved 💗', 'Kiss delivered 😘', 'Hug incoming 🤗', 'Extra cute today ✨']); setTimeout(close, 1600); } else close(); };
    setTimeout(close, 9000); schedulePopup();
  }
  function schedulePopup() { clearTimeout(popupT); if (on) popupT = setTimeout(popup, 60000 + Math.random() * 120000); }

  function onTap(e) {
    if (!on) return; const t = e.target;
    if (t.closest('button,a,input,textarea,select,label,summary,.card,.nav,.gtile,.modal,.uiDlg,.overlay,#story,#finale,.cfBub,canvas,audio,.playfield')) return;
    burst(e.clientX, e.clientY, reduce ? 4 : 8);
  }

  function start() {
    stop(); if (!on) return;
    document.body.classList.add('cute');
    layer = document.createElement('div'); layer.id = 'cuteFx'; layer.setAttribute('aria-hidden', 'true'); document.body.prepend(layer);
    stars();
    if (!reduce) { every(particle, wide() ? 1400 : 3200); every(sticker, 16000); for (let i = 0; i < 4; i++) setTimeout(particle, i * 400); }
    schedulePopup();
  }
  function stop() { timers.forEach(clearInterval); timers = []; clearTimeout(popupT); if (layer) layer.remove(); layer = null; document.body.classList.remove('cute'); }
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => on && start(), 400); });
  document.addEventListener('click', onTap);

  // settings toggle
  function syncBtn() { const b = document.getElementById('cuteToggle'); if (b) { b.textContent = on ? '✨ Cute effects: ON' : '💤 Cute effects: OFF'; b.classList.toggle('soft', !on); } }
  document.addEventListener('click', (e) => { if (e.target.id !== 'cuteToggle') return; on = !on; localStorage.setItem(KEY, on ? '1' : '0'); on ? start() : stop(); syncBtn();
    document.dispatchEvent(new CustomEvent('cc:cute', { detail: on })); }); // app.js saves it to the shared couple settings
  // shared setting applied from the server (partner changed it, or first load)
  window.CC_setCute = (v) => { v = !!v; localStorage.setItem(KEY, v ? '1' : '0'); if (v === on) return syncBtn(); on = v; on ? start() : stop(); syncBtn(); };
  syncBtn(); start();
})();
