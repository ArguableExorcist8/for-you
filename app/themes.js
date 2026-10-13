// For Us — themes (shared couple setting). Loaded in <head> so the cached theme paints before first render (no pink flash).
(() => {
  'use strict';
  const rgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };
  // palette helper: light defaults derive from accent/text; dark themes pass dark:true
  const pal = (o) => {
    const d = !!o.dark, v = {
      bg: o.bg, cd: o.cd || '#fff', tx: o.tx, mu: o.mu, ac: o.ac, act: o.act || o.ac, ac2: o.ac2, ac3: o.ac3,
      sf: o.sf, sf2: o.sf2 || o.sf, sf3: o.sf3, on: o.on || '#fff', dg: o.dg || (d ? '#ff7a8a' : '#c0264f'),
      deep: o.deep || (d ? o.cd : o.tx), shR: o.shR || (d ? '0,0,0' : rgb(o.ac)), fxbg: o.fxbg || 'none',
    };
    v.cdR = rgb(v.cd); v.txR = rgb(v.tx); v.acR = rgb(v.ac); v.tbg = v.tx; v.tfg = v.cd; v.bubA = o.bubA || v.ac; v.bubOT = o.bubOT || v.tx;
    return v;
  };
  const H = ['💗', '💕', '💖', '❤️'];
  const T = [
    // ---------- colours ----------
    { id: 'blush', cat: 'Colours', name: 'Blush pink', em: '🌸', v: pal({ bg: 'linear-gradient(135deg,#ffd1dc,#ffe9f0,#e0c3fc)', tx: '#8b2252', mu: '#a34a74', ac: '#e75480', act: '#b8305e', ac2: '#ff8fab', ac3: '#ffb3c6', sf: '#ffe4ec', sf2: '#ffd6e5', sf3: '#fff7fa', deep: '#8b2252', bubA: '#ff8fab', bubOT: '#4a1430' }),
      parts: ['💗', '💕', '✨', '💖', '⭐', '🌸', '♡', '✦'], stick: ['🧸', '🐰', '🐱', '🌷', '🌈', '🌸', '🐻', '🦋', '🍓', '🐥'], hearts: H, conf: ['#e75480', '#ff8fab', '#ffd166', '#a0e7e5', '#c77dff', '#fff'], mascot: '🧸' },
    { id: 'lavender', cat: 'Colours', name: 'Lavender dream', em: '💜', v: pal({ bg: 'linear-gradient(135deg,#e6dcfb,#f7f2ff,#d6e4ff)', tx: '#4b2a7a', mu: '#6d4f99', ac: '#8a5cd0', act: '#7446bd', ac2: '#b79af0', ac3: '#d4c2f7', sf: '#efe6fb', sf2: '#e3d4f8', sf3: '#faf6ff' }),
      parts: ['💜', '🪻', '✨', '🤍', '⭐', '♡'], stick: ['🦄', '🪻', '🌙', '🦋', '🫐'], hearts: ['💜', '🤍', '💗'], conf: ['#8a5cd0', '#b79af0', '#e6dcfb', '#ffd166', '#fff'], mascot: '🧸' },
    { id: 'ocean', cat: 'Colours', name: 'Ocean blue', em: '🌊', v: pal({ bg: 'linear-gradient(135deg,#cfe8ff,#f0f8ff,#c5f0f0)', tx: '#123d66', mu: '#3b6690', ac: '#2b78c6', act: '#1f65ad', ac2: '#6fb2f0', ac3: '#a9d2f7', sf: '#e2f0fc', sf2: '#cfe5f9', sf3: '#f4faff' }),
      parts: ['💙', '🌊', '✨', '🐚', '🫧', '♡'], stick: ['🐳', '🐬', '⛵', '🐚', '🌊'], hearts: ['💙', '🩵', '🤍'], conf: ['#2b78c6', '#6fb2f0', '#a0e7e5', '#fff', '#ffd166'], mascot: '🧸' },
    { id: 'mint', cat: 'Colours', name: 'Mint', em: '🌿', v: pal({ bg: 'linear-gradient(135deg,#c9f2e1,#f2fcf7,#e2f5d3)', tx: '#1d5644', mu: '#3d725f', ac: '#1f7d61', act: '#1b7559', ac2: '#6fd0ad', ac3: '#a8e6cf', sf: '#e1f6ee', sf2: '#cdeee2', sf3: '#f4fcf8' }),
      parts: ['💚', '🌿', '✨', '🍃', '🤍', '♡'], stick: ['🐢', '🌿', '🍵', '🐸', '🌱'], hearts: ['💚', '🤍', '🩵'], conf: ['#22886a', '#6fd0ad', '#e2f5d3', '#ffd166', '#fff'], mascot: '🧸' },
    { id: 'sunset', cat: 'Colours', name: 'Sunset peach', em: '🌅', v: pal({ bg: 'linear-gradient(135deg,#ffd3b5,#fff0e3,#ffc3cf)', tx: '#7a3418', mu: '#9a5434', ac: '#bd4b25', act: '#a8401c', ac2: '#ffa27a', ac3: '#ffc9a8', sf: '#ffeadd', sf2: '#ffdcc6', sf3: '#fff7f0' }),
      parts: ['🧡', '🌅', '✨', '🍑', '☀️', '♡'], stick: ['🍑', '🌻', '🦩', '🍊', '🌅'], hearts: ['🧡', '💛', '💗'], conf: ['#e0633a', '#ffa27a', '#ffd166', '#ff8fab', '#fff'], mascot: '🧸' },
    { id: 'midnight', cat: 'Colours', name: 'Midnight', em: '🌙', dark: true, v: pal({ dark: true, bg: 'linear-gradient(160deg,#0f1226,#1b1f3b 55%,#2a1f45)', cd: '#1e2240', tx: '#eef0ff', mu: '#b4bbe2', ac: '#6c5ce7', act: '#b3a8ff', ac2: '#8f81ff', ac3: '#4b4f86', sf: '#2b3058', sf2: '#353a6a', sf3: '#252a4d', deep: '#1b1f3b' }),
      parts: ['✨', '⭐', '🌙', '💜', '✦', '·'], stick: ['🌙', '🦉', '⭐', '🪐', '🌌'], hearts: ['💜', '💙', '🤍'], conf: ['#6c5ce7', '#b3a8ff', '#ffd166', '#a0e7e5', '#fff'], mascot: '🧸', nav: { home: '🌙' } },
    // ---------- animals ----------
    { id: 'bears', cat: 'Animals', name: 'Bears', em: '🐻', v: pal({ bg: 'linear-gradient(135deg,#f6dcc2,#fdf3e7,#f3d0c8)', tx: '#5a3418', mu: '#7d5536', ac: '#a8643c', act: '#8f5230', ac2: '#d9a066', ac3: '#ecc9a3', sf: '#f7e6d6', sf2: '#f0d6bd', sf3: '#fdf7f0' }),
      parts: ['🐻', '🧸', '🍯', '🐾', '💛', '🤎'], stick: ['🐻', '🧸', '🍯', '🐻‍❄️', '🐼'], hearts: ['🤎', '💛', '🧡'], conf: ['#a8643c', '#d9a066', '#ffd166', '#f3d0c8', '#fff'], mascot: '🧸', game: { bear: '🐻' }, nav: { us: '🐻' } },
    { id: 'bunnies', cat: 'Animals', name: 'Bunnies', em: '🐰', v: pal({ bg: 'linear-gradient(135deg,#fde2ee,#fff8fb,#e3f4d7)', tx: '#6b2d4f', mu: '#8a4a6e', ac: '#bb4579', act: '#b33f74', ac2: '#f3a5c6', ac3: '#f8cde0', sf: '#fde8f1', sf2: '#f9d7e7', sf3: '#fff7fb' }),
      parts: ['🐰', '🐇', '🥕', '🌸', '🌷', '🤍'], stick: ['🐰', '🐇', '🥕', '🌷', '🍀'], hearts: ['💗', '🤍', '🩷'], conf: ['#d0558c', '#f3a5c6', '#bde0a8', '#ffd166', '#fff'], mascot: '🐰', game: { bear: '🐰' }, nav: { us: '🐰' } },
    { id: 'cats', cat: 'Animals', name: 'Cats', em: '🐱', v: pal({ bg: 'linear-gradient(135deg,#f3e7da,#fffaf4,#e3e3ef)', tx: '#4a3a33', mu: '#6e5b52', ac: '#ad5a2f', act: '#a3542b', ac2: '#e8a37a', ac3: '#f0cdb4', sf: '#f6ece2', sf2: '#eddccd', sf3: '#fffaf6' }),
      parts: ['🐱', '🐈', '🐾', '🧶', '🐟', '🤍'], stick: ['🐱', '🐈', '😺', '🧶', '🐟'], hearts: ['🧡', '🤍', '🖤'], conf: ['#c0683a', '#e8a37a', '#4a3a33', '#ffd166', '#fff'], mascot: '🐱', game: { bear: '🐱' }, nav: { us: '🐱' } },
    { id: 'penguins', cat: 'Animals', name: 'Penguins', em: '🐧', v: pal({ bg: 'linear-gradient(160deg,#dceaf6,#f8fbff,#e5eef8)', tx: '#1c2f45', mu: '#43597a', ac: '#2f64a0', act: '#285890', ac2: '#79a6d8', ac3: '#b5cfee', sf: '#e5eef8', sf2: '#d5e3f3', sf3: '#f7faff' }),
      parts: ['🐧', '❄️', '🐟', '💙', '🤍', '✦'], stick: ['🐧', '🧊', '🐟', '⛄', '🐋'], hearts: ['💙', '🤍', '🩵'], conf: ['#2f64a0', '#79a6d8', '#1c2f45', '#ffd166', '#fff'], mascot: '🐧', game: { bear: '🐧' }, nav: { us: '🐧' } },
    { id: 'foxes', cat: 'Animals', name: 'Foxes', em: '🦊', v: pal({ bg: 'linear-gradient(135deg,#ffe0c4,#fff6ec,#e8f0d6)', tx: '#5a2a12', mu: '#7d4a2c', ac: '#b84d17', act: '#ad4814', ac2: '#f4a261', ac3: '#f8cba6', sf: '#fdeadb', sf2: '#f9dbc3', sf3: '#fff8f1' }),
      parts: ['🦊', '🍂', '🍁', '🧡', '🌰', '🐾'], stick: ['🦊', '🍄', '🍂', '🌲', '🌰'], hearts: ['🧡', '❤️', '🤎'], conf: ['#cf5a1f', '#f4a261', '#8a9a5b', '#ffd166', '#fff'], mascot: '🦊', game: { bear: '🦊' }, nav: { us: '🦊' } },
    // ---------- stories ----------
    { id: 'balloons', cat: 'Stories', name: 'Balloon adventure', em: '🎈', v: pal({ bg: 'linear-gradient(180deg,#bfe3ff,#eaf6ff 60%,#fff4d6)', tx: '#2d3a4a', mu: '#4f5f73', ac: '#c63d29', act: '#bb3622', ac2: '#f7b32b', ac3: '#ffd98a', sf: '#e8f3fd', sf2: '#fdeccd', sf3: '#fbfdff' }),
      parts: ['🎈', '🎈', '☁️', '🎈', '🏠', '✨'], stick: ['🎈', '🏠', '📖', '🗺️', '🧭'], hearts: ['🎈', '❤️', '💛'], conf: ['#d6452f', '#f7b32b', '#2b78c6', '#22886a', '#8a5cd0'], mascot: '🎈', nav: { home: '🏠', notes: '📖' } },
    { id: 'starry', cat: 'Stories', name: 'Starry night', em: '🌌', dark: true, v: pal({ dark: true, bg: 'linear-gradient(180deg,#0b1d3a,#1d3563 60%,#3b4f86)', cd: '#172a4f', tx: '#f3f1ff', mu: '#bcc7ea', ac: '#e2b94f', act: '#f2d27a', on: '#1b1b33', ac2: '#f2d27a', ac3: '#4a5f93', sf: '#22386a', sf2: '#2b4479', sf3: '#1b3059', deep: '#0b1d3a', fxbg: 'radial-gradient(circle at 80% 8%,rgba(255,244,200,.35) 0 22px,transparent 23px),radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 60% 15%,#fff,transparent),radial-gradient(1.5px 1.5px at 35% 60%,#fff,transparent),radial-gradient(1px 1px at 85% 45%,#fff,transparent)' }),
      parts: ['⭐', '✨', '🌙', '☁️', '💫', '✦'], stick: ['🌙', '⭐', '☁️', '🐈‍⬛', '🌠'], hearts: ['💛', '🤍', '💙'], conf: ['#e2b94f', '#f2d27a', '#bcc7ea', '#fff'], mascot: '🌙', nav: { home: '🌙' } },
    { id: 'fairytale', cat: 'Stories', name: 'Fairytale', em: '🏰', v: pal({ bg: 'linear-gradient(135deg,#f6e1ff,#fff7fc,#ffe9c7)', tx: '#4d2257', mu: '#6f4a78', ac: '#a24fb2', act: '#8c3c9b', ac2: '#d39be0', ac3: '#e8c6ef', sf: '#f6e8f9', sf2: '#efd8f4', sf3: '#fffaff' }),
      parts: ['✨', '👑', '🏰', '💫', '🦄', '✦'], stick: ['🏰', '🦄', '👑', '🐸', '🪄'], hearts: ['💜', '💖', '💛'], conf: ['#a24fb2', '#d39be0', '#ffd166', '#ffb3c6', '#fff'], mascot: '🦄', nav: { home: '🏰' } },
    { id: 'sea', cat: 'Stories', name: 'Under the sea', em: '🐚', v: pal({ bg: 'linear-gradient(180deg,#c9f3f7,#9fdcea 55%,#6cc1d9)', tx: '#0e3d4a', mu: '#2f5f6c', ac: '#13808c', act: '#0f6f7a', ac2: '#5fd0d6', ac3: '#a6e6ea', sf: '#def5f7', sf2: '#c9eef2', sf3: '#f3fcfd' }),
      parts: ['🫧', '🫧', '🐚', '🐠', '🐟', '🌊'], stick: ['🐙', '🐠', '🦀', '🐚', '🐢'], hearts: ['🩵', '💙', '🐚'], conf: ['#13808c', '#5fd0d6', '#ffb3c6', '#ffd166', '#fff'], mascot: '🐳', game: { bear: '🐙' }, nav: { home: '🐚' } },
    { id: 'garden', cat: 'Stories', name: 'Garden', em: '🌷', v: pal({ bg: 'linear-gradient(135deg,#e7f7d9,#fffbea,#ffe1ec)', tx: '#2f4a22', mu: '#4f6b40', ac: '#437a2a', act: '#41752a', ac2: '#f28fb4', ac3: '#c9e6b4', sf: '#ecf6e2', sf2: '#fde3ec', sf3: '#fbfef8' }),
      parts: ['🌸', '🌼', '🦋', '🌷', '🌿', '🐝'], stick: ['🦋', '🐝', '🌻', '🐞', '🌷'], hearts: ['💚', '🌸', '💗'], conf: ['#4f8a32', '#f28fb4', '#ffd166', '#c9e6b4', '#fff'], mascot: '🐝', nav: { home: '🌷' } },
    // ---------- series ----------
    { id: 'tvd', cat: 'Series', name: 'The Vampire Diaries', em: '🩸', dark: true, logo: 'themes/vampire-diaries.png', v: pal({ dark: true, bg: 'linear-gradient(180deg,#0e1512,#18201c 50%,#2a0c10)', cd: '#1a211e', tx: '#ece6e0', mu: '#afb8b0', ac: '#a01c2c', act: '#ef6a74', ac2: '#c8303f', ac3: '#4a2a2e', sf: '#2a1d20', sf2: '#34242a', sf3: '#202826', deep: '#2a0c10', fxbg: 'radial-gradient(ellipse at 20% 100%,rgba(200,210,205,.10),transparent 60%),radial-gradient(ellipse at 90% 70%,rgba(200,210,205,.08),transparent 55%),radial-gradient(circle at 85% 10%,rgba(230,230,220,.18) 0 18px,transparent 19px)' }),
      parts: ['🌙', '🥀', '🪶', '🌲', '🩸', '💍'], stick: ['🐺', '🥀', '🌲', '🕯️', '💍'], hearts: ['❤️', '🖤', '🥀'], conf: ['#a01c2c', '#5a0e16', '#c0c6c2', '#2a2f2c'], mascot: '🐺', game: { bear: '🐺' }, nav: { us: '🖤' } },
    { id: 'originals', cat: 'Series', name: 'The Originals', em: '⚜️', dark: true, logo: 'themes/the-originals.png', v: pal({ dark: true, bg: 'linear-gradient(160deg,#0b0b0b,#1a1712 60%,#2b2213)', cd: '#17150f', tx: '#f4ead2', mu: '#cdbd93', ac: '#c9a227', act: '#e3c35a', on: '#17130a', ac2: '#e3c35a', ac3: '#4d4122', sf: '#2a2416', sf2: '#352d1b', sf3: '#1f1b12', dg: '#e2665e', deep: '#0b0b0b', fxbg: 'radial-gradient(circle at 12% 88%,rgba(255,190,90,.12),transparent 30%),radial-gradient(circle at 92% 30%,rgba(255,190,90,.08),transparent 25%)' }),
      parts: ['⚜️', '🕯️', '✨', '🎷', '🌹', '🖤'], stick: ['🎷', '🎺', '🕯️', '🌹', '⚜️'], hearts: ['🖤', '💛', '🌹'], conf: ['#c9a227', '#e3c35a', '#8b1a1a', '#f4ead2'], mascot: '🎷', game: { bear: '⚜️' }, nav: { us: '⚜️' } },
    { id: 'bridgerton', cat: 'Series', name: 'Bridgerton', em: '🦢', logo: 'themes/bridgerton.svg', v: pal({ bg: 'linear-gradient(135deg,#f7e9f2,#fdf8f3,#e6effa)', tx: '#4b3550', mu: '#6d5572', ac: '#9a6189', act: '#865177', ac2: '#d9a6c4', ac3: '#ecd3e2', sf: '#f6eef6', sf2: '#ecdde9', sf3: '#fffbfd' }),
      parts: ['🌸', '💌', '🦢', '🎀', '🤍', '🪷'], stick: ['🦢', '🌸', '💌', '🫖', '🐝'], hearts: ['🤍', '💗', '🌸'], conf: ['#9a6189', '#d9a6c4', '#e6effa', '#f5f0e6', '#fff'], mascot: '🦢', nav: { notes: '💌' } },
    { id: 'hp', cat: 'Series', name: 'Harry Potter', em: '🦉', dark: true, logo: 'themes/harry-potter.svg', v: pal({ dark: true, bg: 'linear-gradient(180deg,#1a1430,#2a1f3d 55%,#3b2a1c)', cd: '#231b38', tx: '#f6ecd8', mu: '#cdbd9f', ac: '#d4a64a', act: '#e6c06a', on: '#1c1428', ac2: '#e6c06a', ac3: '#4d3e5e', sf: '#30264a', sf2: '#3a2f57', sf3: '#2a2142', dg: '#ff8a7a', deep: '#1a1430', fxbg: 'radial-gradient(circle at 15% 20%,rgba(255,200,110,.10),transparent 20%),radial-gradient(circle at 80% 60%,rgba(255,200,110,.08),transparent 22%)' }),
      parts: ['🕯️', '✨', '🦉', '⭐', '📜', '🪄'], stick: ['🦉', '🪄', '🧹', '📜', '🕯️'], hearts: ['💛', '❤️', '✨'], conf: ['#d4a64a', '#e6c06a', '#7f0909', '#1a472a', '#f6ecd8'], mascot: '🦉', game: { bear: '🦉' }, nav: { play: '🪄' } },
    { id: 'gilmore', cat: 'Series', name: 'Gilmore Girls', em: '☕', logo: 'themes/gilmore-girls.svg', v: pal({ bg: 'linear-gradient(135deg,#f6e3cc,#fff9f0,#f1d9c4)', tx: '#4a2c1a', mu: '#6e4c36', ac: '#a8502a', act: '#8f4322', ac2: '#d98f5c', ac3: '#ecc6a6', sf: '#f8eadc', sf2: '#f1dcc7', sf3: '#fffaf4' }),
      parts: ['☕', '📚', '🍂', '🍁', '❄️', '💛'], stick: ['☕', '📚', '🍩', '🍂', '🎵'], hearts: ['🤎', '🧡', '💛'], conf: ['#a8502a', '#d98f5c', '#ffd166', '#6e4c36', '#fff'], mascot: '☕', nav: { notes: '📚' } },
  ];
  const BY = Object.fromEntries(T.map((t) => [t.id, t]));
  // ---------- seasonal overlay ----------
  const D = (y, m, d) => new Date(y, m - 1, d);
  const SEASONS = [ // approx. dates (moon sighting may shift ±1 day)
    { id: 'eid', name: 'Eid Mubarak 🌙', parts: ['🌙', '✨', '🎉', '🏮', '🍬'], r: [[D(2026, 3, 19), D(2026, 3, 22)], [D(2026, 5, 26), D(2026, 5, 29)], [D(2027, 3, 9), D(2027, 3, 12)], [D(2027, 5, 15), D(2027, 5, 18)]] },
    { id: 'valentine', name: "Valentine's week 💝", parts: ['💝', '🌹', '💌', '💘', '🍫'], md: [[2, 7], [2, 14]] },
    { id: 'ramadan', name: 'Ramadan Kareem 🌙', parts: ['🌙', '🏮', '⭐', '✨'], r: [[D(2026, 2, 18), D(2026, 3, 18)], [D(2027, 2, 8), D(2027, 3, 8)]] },
    { id: 'winter', name: 'Cozy winter ❄️', parts: ['❄️', '❄️', '⛄', '✨', '☃️'], md: [[12, 1], [1, 31]], wrap: true },
  ];
  const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  function seasonFor(now, anniv) {
    const t = day0(now);
    if (anniv) { // anniversary week: 3 days either side
      const a = new Date(anniv + 'T00:00:00'); if (!isNaN(a)) for (const y of [t.getFullYear() - 1, t.getFullYear(), t.getFullYear() + 1]) {
        const d = new Date(y, a.getMonth(), a.getDate()), diff = (t - d) / 864e5; const yrs = y - a.getFullYear();
        if (diff >= -3 && diff <= 3 && yrs >= 0) return { id: 'anniversary', name: yrs ? `Anniversary week — ${yrs} year${yrs > 1 ? 's' : ''} 🥂` : 'Our special week 🥂', parts: ['🥂', '💍', '💞', '🎉', '✨'] };
      }
    }
    for (const s of SEASONS) {
      if (s.r && s.r.some(([a, b]) => t >= a && t <= b)) return s;
      if (s.md) { const [[m1, d1], [m2, d2]] = s.md, k = (t.getMonth() + 1) * 100 + t.getDate(), a = m1 * 100 + d1, b = m2 * 100 + d2; if (s.wrap ? (k >= a || k <= b) : (k >= a && k <= b)) return s; }
    }
    return null;
  }
  // ---------- state ----------
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } };
  let cur = BY[LS('cc_theme')] || BY.blush, season = null, seasonOn = LS('cc_seasonal') !== '0', anniv = LS('cc_anniv') || null;
  const root = document.documentElement;
  function paintVars(t) {
    Object.entries(t.v).forEach(([k, v]) => root.style.setProperty('--' + k, v));
    root.dataset.theme = t.id; root.dataset.dark = t.dark ? '1' : '0'; root.style.colorScheme = t.dark ? 'dark' : 'light';
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t.dark ? t.v.cd : t.v.ac;
  }
  function paintDom() {
    if (!document.body) return;
    const t = cur;
    document.querySelectorAll('[data-mascot]').forEach((e) => { e.textContent = (t.game && t.game[e.dataset.mascot]) || t.mascot || e.dataset.def || e.textContent; });
    document.querySelectorAll('[data-ni]').forEach((e) => { if (!e.dataset.def) e.dataset.def = e.textContent; e.textContent = (t.nav && t.nav[e.dataset.ni]) || e.dataset.def; });
    let mk = document.getElementById('thMark');
    if (t.logo) { if (!mk) { mk = document.createElement('img'); mk.id = 'thMark'; mk.alt = ''; mk.setAttribute('aria-hidden', 'true'); document.body.prepend(mk); } if (!mk.src.endsWith(t.logo)) mk.src = t.logo; }
    else if (mk) mk.remove();
    let sb = document.getElementById('seasonPill'); const s = seasonOn ? season : null;
    if (s) { if (!sb) { sb = document.createElement('div'); sb.id = 'seasonPill'; sb.className = 'seasonPill'; const host = document.getElementById('tab-home'); if (host) host.prepend(sb); else return; } sb.textContent = s.name; sb.dataset.s = s.id; }
    else if (sb) sb.remove();
    root.dataset.season = s ? s.id : '';
  }
  function refreshSeason() { season = seasonFor(new Date(), anniv); }
  function apply(id, opt = {}) {
    const t = BY[id] || BY.blush; const changed = t !== cur; cur = t;
    if (!opt.preview) LS('cc_theme', t.id);
    paintVars(t); paintDom();
    if (changed || opt.force) document.dispatchEvent(new CustomEvent('cc:theme', { detail: t.id }));
    return t;
  }
  refreshSeason(); paintVars(cur);
  document.addEventListener('DOMContentLoaded', paintDom);
  window.CC_THEMES = T;
  window.CC_theme = () => cur;
  window.CC_applyTheme = apply;
  window.CC_season = () => (seasonOn ? season : null);
  window.CC_seasonInfo = () => ({ on: seasonOn, current: season });
  window.CC_setSeason = (on, annivDate) => { const a = annivDate || null, ch = on !== seasonOn || a !== anniv; seasonOn = on !== false; anniv = a; LS('cc_seasonal', seasonOn ? '1' : '0'); LS('cc_anniv', a); refreshSeason(); paintDom(); if (ch) document.dispatchEvent(new CustomEvent('cc:theme', { detail: cur.id })); };
  window.CC_seasonFor = seasonFor; // tests
  // emoji/colour sets for effects (theme + active season)
  window.CC_fx = () => { const s = seasonOn ? season : null; return { parts: s ? cur.parts.concat(s.parts, s.parts) : cur.parts, stick: cur.stick, hearts: cur.hearts, conf: cur.conf, mascot: cur.mascot, season: s }; };
})();
