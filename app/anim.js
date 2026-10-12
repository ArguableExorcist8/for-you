// For Us — shared animation helpers + app-wide micro-interactions (transform/opacity only)
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cute = () => localStorage.getItem('cc_cute_fx') !== '0';
  const heavy = () => cute() && !reduce;      // particles, shakes, confetti
  const light = () => !reduce;                // tiny UI motion
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  let live = 0;

  function burst(x, y, emoji = ['💖', '✨', '💕'], n = 10, spread = 70) {
    if (!heavy() || live > 120) return;
    const set = Array.isArray(emoji) ? emoji : [emoji];
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div'); b.className = 'fxP'; b.textContent = pick(set);
      const a = Math.PI * 2 * i / n + Math.random() * .5, r = spread * (.6 + Math.random() * .6);
      b.style.left = x + 'px'; b.style.top = y + 'px';
      b.style.setProperty('--x', Math.cos(a) * r + 'px'); b.style.setProperty('--y', Math.sin(a) * r - 20 + 'px');
      b.style.animationDuration = (.6 + Math.random() * .4) + 's';
      document.body.appendChild(b); live++; setTimeout(() => { b.remove(); live--; }, 1100);
    }
  }
  function burstAt(el, emoji, n, spread) { if (!el) return; const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, emoji, n, spread); }
  function floatText(x, y, text, color = '#e75480') {
    if (!light()) return; const t = document.createElement('div'); t.className = 'fxT'; t.textContent = text; t.style.color = color;
    t.style.left = x + 'px'; t.style.top = y + 'px'; document.body.appendChild(t); setTimeout(() => t.remove(), 1000);
  }
  function floatAt(el, text, color) { if (!el) return; const r = el.getBoundingClientRect(); floatText(r.left + r.width / 2, r.top, text, color); }
  function cls(el, c, ms = 600) { if (!el || !light()) return; el.classList.remove(c); void el.offsetWidth; el.classList.add(c); clearTimeout(el['_t' + c]); el['_t' + c] = setTimeout(() => el.classList.remove(c), ms); }
  const shake = (el, ms = 450) => heavy() && cls(el, 'fxShake', ms);
  const pop = (el) => cls(el, 'fxPop', 500);
  function countUp(el, to, ms = 700, fmt = (v) => v) {
    if (!el) return; const from = +el.dataset.cv || 0; el.dataset.cv = to;
    if (!light() || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
  }
  function confetti(n = 60) {
    if (!heavy()) return; const c = ['#e75480', '#ff8fab', '#ffd166', '#a0e7e5', '#c77dff', '#fff'];
    for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'conf'; d.style.left = Math.random() * 100 + 'vw'; d.style.background = pick(c); d.style.animationDuration = (2 + Math.random() * 2) + 's'; d.style.animationDelay = Math.random() * .5 + 's'; document.body.appendChild(d); setTimeout(() => d.remove(), 5000); }
  }
  function fireworks(times = 5) { if (!heavy()) return; for (let i = 0; i < times; i++) setTimeout(() => burst(innerWidth * (.2 + Math.random() * .6), innerHeight * (.2 + Math.random() * .4), ['💖', '✨', '💥', '🌟', '💕'], 16, 110), i * 280); }
  function stagger(root) {
    if (!root || !light()) return;
    root.querySelectorAll('.gtile').forEach((t, i) => { t.style.setProperty('--i', i); t.classList.remove('fxIn'); void t.offsetWidth; t.classList.add('fxIn'); });
  }
  window.FX = { burst, burstAt, floatText, floatAt, shake, pop, cls, countUp, confetti, fireworks, stagger, heavy, light };

  // ---------- global micro-interactions ----------
  // press ripple on buttons
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button,.btn'); if (!b || !light() || b.closest('.nav') || b.classList.contains('fall')) return;
    const r = b.getBoundingClientRect(); const s = document.createElement('span'); s.className = 'fxRip';
    const d = Math.max(r.width, r.height); s.style.width = s.style.height = d + 'px'; s.style.left = e.clientX - r.left - d / 2 + 'px'; s.style.top = e.clientY - r.top - d / 2 + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative'; b.style.overflow = 'hidden'; b.appendChild(s); setTimeout(() => s.remove(), 600);
  }, { passive: true });
  // nav bounce + tile stagger on tab switch / back
  document.addEventListener('click', (e) => {
    const nb = e.target.closest('.nav button'); if (nb) { cls(nb, 'fxBounce', 600); setTimeout(() => stagger(document.getElementById('tab-' + nb.dataset.tab)), 0); }
    if (e.target.id === 'gameBack' || e.target.id === 'featBack') setTimeout(() => stagger(document.querySelector('.tab:not(.hidden)')), 0);
    const tile = e.target.closest('.gtile'); if (tile) burstAt(tile.querySelector('b'), ['✨', '💗'], 6, 40);
    const emo = e.target.closest('.emojis span'); if (emo) { cls(emo, 'fxBounce', 600); burstAt(emo, [emo.textContent, '✨'], 6, 45); }
    const chip = e.target.closest('.chips span'); if (chip) pop(chip);
    // quiz / trivia answers: read the colour the game logic sets, then animate
    const opt = e.target.closest('.opt'); if (opt) setTimeout(() => {
      opt.parentElement && opt.parentElement.querySelectorAll('.opt').forEach((o) => {
        const bg = o.style.background || ''; if (/143, 214, 148|8fd694/i.test(bg)) { cls(o, 'fxOk', 900); if (o === opt) { burstAt(o, ['✅', '✨', '💚'], 8, 50); floatAt(o, '+1', '#2e9e57'); } }
        else if (/255, 154, 154|ff9a9a/i.test(bg)) { shake(o); cls(o, 'fxBad', 700); }
      });
    }, 20);
  });
  // success toasts get a little burst
  const toastEl = () => document.getElementById('toast');
  new MutationObserver(() => { const t = toastEl(); if (t && t.classList.contains('show') && /[💗💕💖🥰🎉✨💌🫙🤝✅]/u.test(t.textContent)) { const r = t.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, ['💖', '✨', '💕'], 8, 50); } })
    .observe(document.getElementById('toast') || document.body, { attributes: true, attributeFilter: ['class'] });
  // first paint: stagger home grids
  addEventListener('load', () => setTimeout(() => stagger(document.querySelector('.tab:not(.hidden)')), 300));
})();
