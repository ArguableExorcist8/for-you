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
    { id: 'balloons', cat: 'Animations', name: 'Up', em: '🎈', logo: 'themes/up.png', v: pal({ bg: 'linear-gradient(180deg,#bfe3ff,#eaf6ff 60%,#fff4d6)', tx: '#2d3a4a', mu: '#4f5f73', ac: '#c63d29', act: '#bb3622', ac2: '#f7b32b', ac3: '#ffd98a', sf: '#e8f3fd', sf2: '#fdeccd', sf3: '#fbfdff' }),
      parts: ['🎈', '🎈', '☁️', '🎈', '🏠', '✨'], stick: ['🎈', '🏠', '📖', '🗺️', '🧭'], hearts: ['🎈', '❤️', '💛'], conf: ['#d6452f', '#f7b32b', '#2b78c6', '#22886a', '#8a5cd0'], mascot: '🎈', nav: { home: '🏠', notes: '📖' } },
    { id: 'starry', cat: 'Stories', name: 'Starry night', em: '🌌', dark: true, v: pal({ dark: true, bg: 'linear-gradient(180deg,#0b1d3a,#1d3563 60%,#3b4f86)', cd: '#172a4f', tx: '#f3f1ff', mu: '#bcc7ea', ac: '#e2b94f', act: '#f2d27a', on: '#1b1b33', ac2: '#f2d27a', ac3: '#4a5f93', sf: '#22386a', sf2: '#2b4479', sf3: '#1b3059', deep: '#0b1d3a', fxbg: 'radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 60% 15%,#fff,transparent),radial-gradient(1.5px 1.5px at 35% 60%,#fff,transparent),radial-gradient(1px 1px at 85% 45%,#fff,transparent)' }),
      parts: ['⭐', '✨', '🌙', '☁️', '💫', '✦'], stick: ['🌙', '⭐', '☁️', '🐈‍⬛', '🌠'], hearts: ['💛', '🤍', '💙'], conf: ['#e2b94f', '#f2d27a', '#bcc7ea', '#fff'], mascot: '🌙', nav: { home: '🌙' } },
    { id: 'fairytale', cat: 'Stories', name: 'Fairytale', em: '🏰', v: pal({ bg: 'linear-gradient(135deg,#f6e1ff,#fff7fc,#ffe9c7)', tx: '#4d2257', mu: '#6f4a78', ac: '#a24fb2', act: '#8c3c9b', ac2: '#d39be0', ac3: '#e8c6ef', sf: '#f6e8f9', sf2: '#efd8f4', sf3: '#fffaff' }),
      parts: ['✨', '👑', '🏰', '💫', '🦄', '✦'], stick: ['🏰', '🦄', '👑', '🐸', '🪄'], hearts: ['💜', '💖', '💛'], conf: ['#a24fb2', '#d39be0', '#ffd166', '#ffb3c6', '#fff'], mascot: '🦄', nav: { home: '🏰' } },
    { id: 'sea', cat: 'Stories', name: 'Under the sea', em: '🐚', v: pal({ bg: 'linear-gradient(180deg,#c9f3f7,#9fdcea 55%,#6cc1d9)', tx: '#0e3d4a', mu: '#2f5f6c', ac: '#13808c', act: '#0f6f7a', ac2: '#5fd0d6', ac3: '#a6e6ea', sf: '#def5f7', sf2: '#c9eef2', sf3: '#f3fcfd' }),
      parts: ['🫧', '🫧', '🐚', '🐠', '🐟', '🌊'], stick: ['🐙', '🐠', '🦀', '🐚', '🐢'], hearts: ['🩵', '💙', '🐚'], conf: ['#13808c', '#5fd0d6', '#ffb3c6', '#ffd166', '#fff'], mascot: '🐳', game: { bear: '🐙' }, nav: { home: '🐚' } },
    { id: 'garden', cat: 'Stories', name: 'Garden', em: '🌷', v: pal({ bg: 'linear-gradient(135deg,#e7f7d9,#fffbea,#ffe1ec)', tx: '#2f4a22', mu: '#4f6b40', ac: '#437a2a', act: '#41752a', ac2: '#f28fb4', ac3: '#c9e6b4', sf: '#ecf6e2', sf2: '#fde3ec', sf3: '#fbfef8' }),
      parts: ['🌸', '🌼', '🦋', '🌷', '🌿', '🐝'], stick: ['🦋', '🐝', '🌻', '🐞', '🌷'], hearts: ['💚', '🌸', '💗'], conf: ['#4f8a32', '#f28fb4', '#ffd166', '#c9e6b4', '#fff'], mascot: '🐝', nav: { home: '🌷' } },
    // ---------- series ----------
    { id: 'tvd', cat: 'Series', name: 'The Vampire Diaries', em: '🩸', dark: true, logo: 'themes/vampire-diaries.png', v: pal({ dark: true, bg: 'linear-gradient(180deg,#0e1512,#18201c 50%,#2a0c10)', cd: '#1a211e', tx: '#ece6e0', mu: '#afb8b0', ac: '#a01c2c', act: '#ef6a74', ac2: '#c8303f', ac3: '#4a2a2e', sf: '#2a1d20', sf2: '#34242a', sf3: '#202826', deep: '#2a0c10', fxbg: 'radial-gradient(ellipse at 20% 100%,rgba(200,210,205,.10),transparent 60%),radial-gradient(ellipse at 90% 70%,rgba(200,210,205,.08),transparent 55%)' }),
      parts: ['🌙', '🥀', '🪶', '🌲', '🩸', '💍'], stick: ['🐺', '🥀', '🌲', '🕯️', '💍'], hearts: ['❤️', '🖤', '🥀'], conf: ['#a01c2c', '#5a0e16', '#c0c6c2', '#2a2f2c'], mascot: '🐺', game: { bear: '🐺' }, nav: { us: '🖤' } },
    { id: 'originals', cat: 'Series', name: 'The Originals', em: '⚜️', dark: true, logo: 'themes/the-originals.png', v: pal({ dark: true, bg: 'linear-gradient(160deg,#0b0b0b,#1a1712 60%,#2b2213)', cd: '#17150f', tx: '#f4ead2', mu: '#cdbd93', ac: '#c9a227', act: '#e3c35a', on: '#17130a', ac2: '#e3c35a', ac3: '#4d4122', sf: '#2a2416', sf2: '#352d1b', sf3: '#1f1b12', dg: '#e2665e', deep: '#0b0b0b', fxbg: 'radial-gradient(circle at 12% 88%,rgba(255,190,90,.12),transparent 30%),radial-gradient(circle at 92% 30%,rgba(255,190,90,.08),transparent 25%)' }),
      parts: ['⚜️', '🕯️', '✨', '🎷', '🌹', '🖤'], stick: ['🎷', '🎺', '🕯️', '🌹', '⚜️'], hearts: ['🖤', '💛', '🌹'], conf: ['#c9a227', '#e3c35a', '#8b1a1a', '#f4ead2'], mascot: '🎷', game: { bear: '⚜️' }, nav: { us: '⚜️' } },
    { id: 'bridgerton', cat: 'Series', name: 'Bridgerton', em: '🦢', v: pal({ bg: 'linear-gradient(135deg,#f7e9f2,#fdf8f3,#e6effa)', tx: '#4b3550', mu: '#6d5572', ac: '#9a6189', act: '#865177', ac2: '#d9a6c4', ac3: '#ecd3e2', sf: '#f6eef6', sf2: '#ecdde9', sf3: '#fffbfd' }),
      parts: ['🌸', '💌', '🦢', '🎀', '🤍', '🪷'], stick: ['🦢', '🌸', '💌', '🫖', '🐝'], hearts: ['🤍', '💗', '🌸'], conf: ['#9a6189', '#d9a6c4', '#e6effa', '#f5f0e6', '#fff'], mascot: '🦢', nav: { notes: '💌' } },
    { id: 'hp', cat: 'Series', name: 'Harry Potter', em: '🦉', dark: true, logo: 'themes/harry-potter.svg', v: pal({ dark: true, bg: 'linear-gradient(180deg,#1a1430,#2a1f3d 55%,#3b2a1c)', cd: '#231b38', tx: '#f6ecd8', mu: '#cdbd9f', ac: '#d4a64a', act: '#e6c06a', on: '#1c1428', ac2: '#e6c06a', ac3: '#4d3e5e', sf: '#30264a', sf2: '#3a2f57', sf3: '#2a2142', dg: '#ff8a7a', deep: '#1a1430', fxbg: 'radial-gradient(circle at 15% 20%,rgba(255,200,110,.10),transparent 20%),radial-gradient(circle at 80% 60%,rgba(255,200,110,.08),transparent 22%)' }),
      parts: ['🕯️', '✨', '🦉', '⭐', '📜', '🪄'], stick: ['🦉', '🪄', '🧹', '📜', '🕯️'], hearts: ['💛', '❤️', '✨'], conf: ['#d4a64a', '#e6c06a', '#7f0909', '#1a472a', '#f6ecd8'], mascot: '🦉', game: { bear: '🦉' }, nav: { play: '🪄' } },
    { id: 'gilmore', cat: 'Series', name: 'Gilmore Girls', em: '☕', logo: 'themes/gilmore-girls.svg', v: pal({ bg: 'linear-gradient(135deg,#f6e3cc,#fff9f0,#f1d9c4)', tx: '#4a2c1a', mu: '#6e4c36', ac: '#a8502a', act: '#8f4322', ac2: '#d98f5c', ac3: '#ecc6a6', sf: '#f8eadc', sf2: '#f1dcc7', sf3: '#fffaf4' }),
      parts: ['☕', '📚', '🍂', '🍁', '❄️', '💛'], stick: ['☕', '📚', '🍩', '🍂', '🎵'], hearts: ['🤎', '🧡', '💛'], conf: ['#a8502a', '#d98f5c', '#ffd166', '#6e4c36', '#fff'], mascot: '☕', nav: { notes: '📚' } },

    // ---------- added v20 ----------
    { id: 'pandas', cat: 'Animals', name: 'Pandas', em: '🐼', v: pal({ bg: 'linear-gradient(135deg,#eef3ea,#ffffff,#e3efe0)', tx: '#222a24', mu: '#4d5a50', ac: '#3f7d3a', act: '#346b30', ac2: '#8cc084', ac3: '#c9e3c4', sf: '#edf3ea', sf2: '#dde9d9', sf3: '#fafcf9' }),
      parts: ['🐼', '🎋', '🍃', '🤍', '🖤', '🌿'], stick: ['🐼', '🎋', '🍃', '🥟', '🍵'], hearts: ['🖤', '🤍', '💚'], conf: ['#3f7d3a', '#8cc084', '#222a24', '#fff'], mascot: '🐼', game: { bear: '🐼' } },
    { id: 'forest', cat: 'Stories', name: 'Enchanted forest', em: '🍄', dark: true, v: pal({ dark: true, bg: 'linear-gradient(180deg,#0d1f17,#173326 55%,#24402c)', cd: '#1a2e23', tx: '#eaf5e6', mu: '#b5cdb5', ac: '#d9b84a', act: '#ecd27a', on: '#1a1a0e', ac2: '#ecd27a', ac3: '#3e5a45', sf: '#22392c', sf2: '#2c4637', sf3: '#1e3427', deep: '#0d1f17' }),
      parts: ['✨', '🍄', '🌿', '🧚', '🌙', '🍃'], stick: ['🍄', '🧚', '🦉', '🐌', '🌿'], hearts: ['💚', '💛', '✨'], conf: ['#d9b84a', '#ecd27a', '#5f8f5a', '#eaf5e6'], mascot: '🍄', game: { bear: '🦔' } },
    { id: 'stranger', cat: 'Series', name: 'Stranger Things', em: '🎄', dark: true, logo: 'themes/stranger-things.svg', v: pal({ dark: true, bg: 'linear-gradient(180deg,#07070a,#120a12 60%,#1d0a0e)', cd: '#121016', tx: '#f1ecef', mu: '#bfb3bb', ac: '#c4161c', act: '#ff6a6f', ac2: '#e3343a', ac3: '#3d1f26', sf: '#1e1820', sf2: '#2a2029', sf3: '#18141b', deep: '#07070a' }),
      parts: ['💡', '🚲', '🧇', '🔦', '🎄', '✨'], stick: ['🧇', '🚲', '📻', '🔦', '🎄'], hearts: ['❤️', '💡', '🖤'], conf: ['#c4161c', '#ff6a6f', '#f6c94c', '#3db3e0', '#5fd38b'], mascot: '🧇', game: { bear: '🧇' } },
    { id: 'twilight', cat: 'Movies', name: 'Twilight', em: '🍎', dark: true, logo: 'themes/twilight.svg', v: pal({ dark: true, bg: 'linear-gradient(180deg,#0b1612,#14261f 55%,#22352c)', cd: '#14211c', tx: '#e9f1e6', mu: '#b2c4b4', ac: '#a3162a', act: '#ff7b86', ac2: '#c8303f', ac3: '#2f4a3e', sf: '#1c2f27', sf2: '#253b31', sf3: '#182a22', deep: '#0b1612' }),
      parts: ['🍎', '🌲', '🖤', '🌙', '🍂', '✦'], stick: ['🍎', '🌲', '🐺', '🌙', '🖤'], hearts: ['❤️', '🖤', '🍎'], conf: ['#a3162a', '#e9f1e6', '#2f4a3e', '#6f8f7a'], mascot: '🍎', game: { bear: '🍎' } },
    { id: 'notebook', cat: 'Movies', name: 'The Notebook', em: '🛶', word: { t: 'The Notebook', f: "'FU Caveat'", c: '#2f3a3f' }, v: pal({ bg: 'linear-gradient(180deg,#dfe9ec,#f5f1e6 55%,#e7dcc6)', tx: '#2f3a3f', mu: '#56656b', ac: '#3c6e83', act: '#2f5c70', ac2: '#8fb3c2', ac3: '#c9dbe2', sf: '#eef2ef', sf2: '#e2e9e7', sf3: '#fbfaf5' }),
      parts: ['🦢', '✉️', '🛶', '🌾', '💙', '🍃'], stick: ['🦢', '🛶', '✉️', '🏡', '🌧️'], hearts: ['💙', '🤍', '💌'], conf: ['#3c6e83', '#8fb3c2', '#e7dcc6', '#fff'], mascot: '🛶', game: { bear: '🦢' } },
    { id: 'titanic', cat: 'Movies', name: 'Titanic', em: '💎', dark: true, logo: 'themes/titanic.svg', v: pal({ dark: true, bg: 'linear-gradient(180deg,#0a1726,#10243a 55%,#1b3550)', cd: '#0f2134', tx: '#f1ead8', mu: '#c4b998', ac: '#c9a227', act: '#e6c86a', on: '#10131a', ac2: '#e6c86a', ac3: '#2c4560', sf: '#183049', sf2: '#203a57', sf3: '#14283e', deep: '#0a1726' }),
      parts: ['💙', '🌊', '⚓', '✨', '💎', '❄️'], stick: ['🚢', '⚓', '💎', '🌊', '🎻'], hearts: ['💙', '💎', '🤍'], conf: ['#c9a227', '#e6c86a', '#2c6fb0', '#f1ead8'], mascot: '💎', game: { bear: '⚓' } },
    { id: 'lalaland', cat: 'Movies', name: 'La La Land', em: '🎹', dark: true, word: { t: 'La La Land', f: "'FU Pacifico'", c: '#ffe6a8' }, v: pal({ dark: true, bg: 'linear-gradient(180deg,#1b1240,#3a2167 55%,#6a2f6e)', cd: '#241a4a', tx: '#f6eefe', mu: '#c9bde6', ac: '#f2c94c', act: '#ffd86b', on: '#1f1440', ac2: '#ffd86b', ac3: '#4a3a7a', sf: '#2e2358', sf2: '#3a2d6a', sf3: '#281f50', deep: '#1b1240', fxbg: 'radial-gradient(1px 1px at 20% 20%,#fff,transparent),radial-gradient(1px 1px at 70% 12%,#fff,transparent),radial-gradient(1.5px 1.5px at 45% 35%,#fff,transparent),radial-gradient(1px 1px at 88% 30%,#fff,transparent)' }),
      parts: ['⭐', '🎹', '🎷', '✨', '💛', '🌆'], stick: ['🎹', '🎷', '⭐', '🌆', '💃'], hearts: ['💛', '💜', '⭐'], conf: ['#f2c94c', '#ffd86b', '#9b6bd6', '#ff8fab', '#3db3e0'], mascot: '🎹', game: { bear: '🎷' } },
    { id: 'pp', cat: 'Movies', name: 'Pride & Prejudice', em: '🪶', word: { t: 'Pride & Prejudice', f: "'FU Vibes'", c: '#3b3226' }, v: pal({ bg: 'linear-gradient(180deg,#e7efe0,#f8f4ea 55%,#e9e0cc)', tx: '#3b3226', mu: '#625646', ac: '#5f6e3f', act: '#4f5c33', ac2: '#b3c08f', ac3: '#dbe3c8', sf: '#f0f0e4', sf2: '#e6e6d4', sf3: '#fdfbf4' }),
      parts: ['✉️', '🌾', '🍃', '🪶', '🤍', '🌼'], stick: ['🪶', '✉️', '🌾', '🏛️', '🐎'], hearts: ['🤍', '💚', '💌'], conf: ['#5f6e3f', '#b3c08f', '#e9e0cc', '#fff'], mascot: '🪶', game: { bear: '🐎' } },
    { id: 'tangled', cat: 'Movies', name: 'Tangled', em: '🏮', dark: true, logo: 'themes/tangled.svg', v: pal({ dark: true, bg: 'linear-gradient(180deg,#22123f,#3b2266 55%,#5a3a7c)', cd: '#2a1850', tx: '#fbf3e0', mu: '#d6c6a4', ac: '#f2b632', act: '#ffcf5a', on: '#26113d', ac2: '#ffcf5a', ac3: '#4f3678', sf: '#34205e', sf2: '#40296e', sf3: '#2f1b55', deep: '#22123f' }),
      parts: ['🏮', '✨', '☀️', '💜', '🌸', '🏮'], stick: ['🏮', '☀️', '🦎', '🌸', '👑'], hearts: ['💜', '💛', '🏮'], conf: ['#f2b632', '#ffcf5a', '#9b6bd6', '#ff8fab'], mascot: '☀️', game: { bear: '🦎' } },

    // ---------- Animations ----------
    { id: 'beauty', cat: 'Animations', name: 'Beauty and the Beast', em: '🌹', dark: true, logo: 'themes/beauty-and-the-beast.png', v: pal({ dark: true, bg: 'linear-gradient(180deg,#0f1630,#1c2550 55%,#3a2a3e)', cd: '#18203f', tx: '#f7efd9', mu: '#cdbf98', ac: '#d4a937', act: '#efcd6a', on: '#1a1530', ac2: '#efcd6a', ac3: '#3a3f66', sf: '#222b52', sf2: '#2c3560', sf3: '#1d2547', deep: '#0f1630' }),
      parts: ['🌹', '✨', '🕯️', '💛', '📚'], stick: ['🌹', '🕯️', '🫖', '📚', '🏰'], hearts: ['🌹', '💛', '❤️'], conf: ['#d4a937', '#efcd6a', '#b3123a', '#f7efd9'], mascot: '🌹', game: { bear: '🫖' } },
    { id: 'frozen', cat: 'Animations', name: 'Frozen', em: '❄️', logo: 'themes/frozen.png', v: pal({ bg: 'linear-gradient(180deg,#dff1ff,#f5fbff 55%,#cfe6fa)', tx: '#173e5c', mu: '#3e6584', ac: '#2a72b0', act: '#1f5f96', ac2: '#8cc7f0', ac3: '#c3e2f8', sf: '#e6f3fd', sf2: '#d5ebfb', sf3: '#f7fcff' }),
      parts: ['❄️', '❅', '❆', '💙', '✨'], stick: ['⛄', '❄️', '🏔️', '🦌', '🧊'], hearts: ['💙', '🤍', '❄️'], conf: ['#2a72b0', '#8cc7f0', '#fff', '#c9a0e8'], mascot: '⛄', game: { bear: '⛄' } },
    { id: 'howl', cat: 'Animations', name: "Howl's Moving Castle", em: '🔥', logo: 'themes/howls-moving-castle.png', v: pal({ bg: 'linear-gradient(180deg,#cfe7f7,#eef6ea 55%,#f7e7c9)', tx: '#2e3550', mu: '#545d7a', ac: '#3a4fa0', act: '#2f418a', ac2: '#9fb0e6', ac3: '#d0d9f4', sf: '#eef1fa', sf2: '#e1e7f6', sf3: '#fbfcff' }),
      parts: ['⭐', '🔥', '🌼', '☁️', '✨'], stick: ['🔥', '🏰', '🌼', '⭐', '🚪'], hearts: ['💙', '💛', '🔥'], conf: ['#3a4fa0', '#9fb0e6', '#f7c948', '#ff8a5b'], mascot: '🔥', game: { bear: '🔥' } },
    { id: 'coco', cat: 'Animations', name: 'Coco', em: '🌼', dark: true, logo: 'themes/coco.png', v: pal({ dark: true, bg: 'linear-gradient(180deg,#1d1030,#36184a 55%,#5a1f4a)', cd: '#24143a', tx: '#fff2e3', mu: '#e0c3b4', ac: '#f39c1e', act: '#ffb84d', on: '#24122e', ac2: '#ffb84d', ac3: '#4e2a5e', sf: '#2e1a46', sf2: '#3a2254', sf3: '#28163e', deep: '#1d1030' }),
      parts: ['🌼', '🕯️', '🎸', '🎶', '🧡'], stick: ['🎸', '🌼', '🕯️', '🎶', '🐕'], hearts: ['🧡', '💜', '🌼'], conf: ['#f39c1e', '#e8336f', '#3db3e0', '#9b6bd6', '#5fd38b'], mascot: '🎸', game: { bear: '🐕' } },
    { id: 'yourname', cat: 'Animations', name: 'Your Name', em: '☄️', dark: true, word: { t: 'your name.', f: "'FU Corm'", c: '#fff1e8' }, v: pal({ dark: true, bg: 'linear-gradient(180deg,#1a2a5e,#4b3f86 50%,#7a4f8f)', cd: '#1f2b5a', tx: '#f5f0ff', mu: '#c6c3e6', ac: '#ff9a6b', act: '#ffb48f', on: '#1b1f3f', ac2: '#ffb48f', ac3: '#3b4680', sf: '#283466', sf2: '#323f74', sf3: '#222e5e', deep: '#1a2a5e', fxbg: 'radial-gradient(1px 1px at 15% 15%,#fff,transparent),radial-gradient(1px 1px at 65% 8%,#fff,transparent),radial-gradient(1.5px 1.5px at 85% 22%,#fff,transparent)' }),
      parts: ['☄️', '✨', '⭐', '🎀', '🌆'], stick: ['☄️', '🎀', '🌆', '📓', '⛩️'], hearts: ['💗', '🧡', '☄️'], conf: ['#ff9a6b', '#ffb48f', '#9b8cff', '#f5f0ff'], mascot: '☄️', game: { bear: '🎀' } },
    // ---------- Anime ----------
    { id: 'naruto', cat: 'Anime', name: 'Naruto', em: '🍥', logo: 'themes/naruto.png', v: pal({ bg: 'linear-gradient(135deg,#ffe2c2,#fff6ea 55%,#ffd9a8)', tx: '#3a2412', mu: '#6a4a30', ac: '#c94e0c', act: '#a94108', ac2: '#ff9f4d', ac3: '#ffd1a3', sf: '#ffeedd', sf2: '#ffe1c4', sf3: '#fffaf4' }),
      parts: ['🍥', '🍜', '🌀', '🍃', '🔥'], stick: ['🍥', '🍜', '🐸', '🦊', '📜'], hearts: ['🧡', '❤️', '🍥'], conf: ['#c94e0c', '#ff9f4d', '#2f5ea8', '#222'], mascot: '🍥', game: { bear: '🐸' } },
    { id: 'aot', cat: 'Anime', name: 'Attack on Titan', em: '🪽', dark: true, logo: 'themes/attack-on-titan.png', v: pal({ dark: true, bg: 'linear-gradient(180deg,#1b1f17,#2a3024 55%,#3b3528)', cd: '#232820', tx: '#eee8d8', mu: '#c3bca6', ac: '#5c7638', act: '#a9c47a', ac2: '#7f9a55', ac3: '#3e4635', sf: '#2c3228', sf2: '#363d31', sf3: '#262b22', deep: '#1b1f17', fxbg: 'linear-gradient(0deg,rgba(120,110,90,.22) 0 70px,transparent 70px)' }),
      parts: ['🪽', '⚔️', '🧱', '🍃', '✦'], stick: ['🪽', '🐎', '🧱', '⚔️', '🗺️'], hearts: ['🤍', '💚', '🪽'], conf: ['#5c7638', '#a9c47a', '#eee8d8', '#6a4a30'], mascot: '🪽', game: { bear: '🐎' } },
    { id: 'demonslayer', cat: 'Anime', name: 'Demon Slayer', em: '🪻', dark: true, logo: 'themes/demon-slayer.png', v: pal({ dark: true, bg: 'linear-gradient(180deg,#101a1a,#1a2a2a 55%,#2a2140)', cd: '#16211f', tx: '#f2ecf6', mu: '#c7bccf', ac: '#257a5a', act: '#7fd6b0', ac2: '#b48bd8', ac3: '#2f3f3d', sf: '#1f2c2a', sf2: '#283634', sf3: '#1b2725', deep: '#101a1a' }),
      parts: ['🌸', '💜', '🌊', '🔥', '🪻'], stick: ['🪻', '🌊', '🔥', '🦋', '🗡️'], hearts: ['💜', '💚', '🌸'], conf: ['#257a5a', '#b48bd8', '#e05a5a', '#f2ecf6'], mascot: '🪻', game: { bear: '🦋' } },
    { id: 'onepiece', cat: 'Anime', name: 'One Piece', em: '👒', logo: 'themes/one-piece.png', v: pal({ bg: 'linear-gradient(180deg,#cdeeff,#f4fbff 55%,#f7e6c4)', tx: '#1c3550', mu: '#405b77', ac: '#c62f2f', act: '#a92424', ac2: '#ff8a6b', ac3: '#f9d58a', sf: '#e6f4fb', sf2: '#fbefd4', sf3: '#fbfdff' }),
      parts: ['👒', '🌊', '🍖', '⚓', '🏴‍☠️'], stick: ['👒', '🏴‍☠️', '🗺️', '🍖', '🐌'], hearts: ['❤️', '💛', '👒'], conf: ['#c62f2f', '#f9d58a', '#2b78c6', '#fff'], mascot: '👒', game: { bear: '🍖' } },
    { id: 'sailormoon', cat: 'Anime', name: 'Sailor Moon', em: '🌙', logo: 'themes/sailor-moon.png', v: pal({ bg: 'linear-gradient(135deg,#ffe0f0,#fff7fc 55%,#dfe6ff)', tx: '#4a2a5e', mu: '#71528a', ac: '#c8387f', act: '#ad2d6e', ac2: '#ff9ccf', ac3: '#ffcfe7', sf: '#ffe9f4', sf2: '#fbdcef', sf3: '#fffafd' }),
      parts: ['🌙', '⭐', '💖', '✨', '🎀'], stick: ['🌙', '⭐', '🎀', '💖', '🪐'], hearts: ['💖', '💗', '🌙'], conf: ['#c8387f', '#ff9ccf', '#f7d15a', '#9fb0e6', '#fff'], mascot: '🌙', game: { bear: '🎀' } },
    { id: 'spirited', cat: 'Anime', name: 'Spirited Away', em: '🏮', dark: true, logo: 'themes/spirited-away.png', v: pal({ dark: true, bg: 'linear-gradient(180deg,#16244a,#2f3366 55%,#5a3550)', cd: '#1d2a50', tx: '#fff3e2', mu: '#d8c8b8', ac: '#c23a24', act: '#ff8a6a', ac2: '#ff8a6a', ac3: '#3d4a7a', sf: '#26345e', sf2: '#30406c', sf3: '#222f58', deep: '#16244a' }),
      parts: ['🏮', '☁️', '🌸', '✨', '🐉'], stick: ['🏮', '🐉', '🐸', '🍙', '🚂'], hearts: ['❤️', '🏮', '🤍'], conf: ['#c23a24', '#ff8a6a', '#f6c94c', '#fff3e2'], mascot: '🏮', game: { bear: '🐉' } },

    // ---------- spooky ----------
    { id: 'halloween', cat: 'Spooky', name: 'Halloween', em: '🎃', dark: true, word: { t: 'Halloween', f: "'FU Creep'", c: '#ff8a1f' }, v: pal({ dark: true, bg: 'radial-gradient(circle at 78% 9%,rgba(255,214,140,.30),rgba(255,140,40,.10) 9%,transparent 22%),linear-gradient(180deg,#0d0716,#1c0d26 50%,#2a1020 85%,#3a160c)', cd: '#1a1022', tx: '#fbefe3', mu: '#cdb6a4', ac: '#ff7a1a', act: '#ffa04d', ac2: '#9b5cff', ac3: '#3f2340', sf: '#251830', sf2: '#33213f', sf3: '#1d1327', deep: '#0b0610', bubA: '#ff9a3c', on: '#1a0c05', dg: '#ff5a6a' }),
      parts: ['🎃', '🦇', '👻', '🕸️', '🍬', '✦'], stick: ['🎃', '👻', '🦇', '🕷️', '🍬', '💀', '🧙‍♀️'], hearts: ['🧡', '🖤', '💜'], conf: ['#ff7a1a', '#9b5cff', '#5fd35f', '#ffd36b', '#2a1a33'], mascot: '🎃', game: { bear: '👻' } },
  ];
  // v20 immersive extras: hero art, fonts, nav icons, ambient effects
  const X = {
    // hero: logo img | word (styled wordmark) | art (emoji composition); amb: [type, emojis, count]
    blush: { font: "'FU Fredoka'" }, lavender: { font: "'FU Fredoka'" }, ocean: { font: "'FU Fredoka'" }, mint: { font: "'FU Fredoka'" }, sunset: { font: "'FU Fredoka'" },
    midnight: { font: "'FU Corm'", amb: [['twinkle', ['✦', '·', '✧'], 14]] },
    bears: { font: "'FU Fredoka'", art: ['🍯', '🐻', '🧸'], nav: { home: '🏡', notes: '🍯', us: '🐻', memories: '📷', chat: '🐾', play: '🧸' }, amb: [['fall', ['🍯', '🐾', '🤎'], 6]] },
    bunnies: { font: "'FU Pacifico'", art: ['🥕', '🐰', '🌷'], nav: { home: '🏡', notes: '🥕', us: '🐰', memories: '📷', chat: '🐾', play: '🐇' }, amb: [['fall', ['🌸', '🌷', '🥕'], 6], ['bob', ['🐇'], 1]] },
    cats: { font: "'FU Gochi'", art: ['🧶', '🐱', '🐟'], nav: { home: '🏡', notes: '🐟', us: '🐱', memories: '📷', chat: '🐾', play: '🧶' }, amb: [['fall', ['🐾', '🧶', '🐟'], 6]] },
    penguins: { font: "'FU Fredoka'", art: ['❄️', '🐧', '🧊'], nav: { home: '🧊', notes: '🐟', us: '🐧', memories: '📷', chat: '❄️', play: '⛸️' }, amb: [['fall', ['❄️', '❅', '❆'], 12]] },
    foxes: { font: "'FU Amatic'", art: ['🍂', '🦊', '🍁'], nav: { home: '🌲', notes: '🍂', us: '🦊', memories: '📷', chat: '🐾', play: '🍄' }, amb: [['fall', ['🍂', '🍁', '🍂'], 9]] },
    pandas: { font: "'FU Fredoka'", art: ['🎋', '🐼', '🍃'], nav: { home: '🎋', notes: '🍃', us: '🐼', memories: '📷', chat: '🐾', play: '🥟' }, amb: [['fall', ['🍃', '🍃', '🎋'], 8]] },
    balloons: { pics: 1, font: "'FU Fredoka'", nav: { home: '🏠', notes: '📖', us: '🎈', memories: '🗺️', chat: '✉️', play: '🧭' }, amb: [['rise', ['🎈', '🎈', '🎈', '☁️'], 7]] },
    starry: { font: "'FU Corm'", art: ['⭐', '🌙', '✨'], nav: { home: '🌙', notes: '📜', us: '💫', memories: '🌌', chat: '☁️', play: '🌠' }, amb: [['twinkle', ['✦', '✧', '⋆', '·'], 18], ['drift', ['☁️'], 2]] },
    fairytale: { font: "'FU Vibes'", art: ['✨', '🏰', '✨'], nav: { home: '🏰', notes: '📜', us: '👑', memories: '🪞', chat: '🕊️', play: '🦄' }, amb: [['twinkle', ['✨', '💫', '✦'], 12]] },
    sea: { font: "'FU Fredoka'", art: ['🐠', '🐚', '🐙'], nav: { home: '🐚', notes: '🫙', us: '🐙', memories: '🐠', chat: '🫧', play: '🐳' }, amb: [['rise', ['🫧', '🫧', '◦'], 12], ['drift', ['🐟', '🐠'], 2]] },
    garden: { font: "'FU Caveat'", art: ['🌷', '🦋', '🌼'], nav: { home: '🏡', notes: '🌼', us: '🌷', memories: '🌻', chat: '🐝', play: '🦋' }, amb: [['fall', ['🌸', '🌼', '🍃'], 6], ['drift', ['🦋', '🐝'], 2]] },
    forest: { font: "'FU Amatic'", art: ['🍄', '🌳', '🧚'], nav: { home: '🌳', notes: '🍃', us: '🧚', memories: '🍄', chat: '🦉', play: '🐌' }, amb: [['lights', ['#ffd86b', '#fff2b3'], 14], ['fireflies', null, 14], ['mist', null, 2]] },
    tvd: { font: "'FU Fell'", nav: { home: '🌙', notes: '📜', us: '🖤', memories: '🕯️', chat: '🪶', play: '🐺' }, amb: [['mist', null, 3], ['drift', ['🦇', '🐦‍⬛', '🦇'], 3]] },
    originals: { font: "'FU Cinzel'", nav: { home: '⚜️', notes: '📜', us: '🖤', memories: '🖼️', chat: '🎷', play: '🃏' }, amb: [['glow', null, 3], ['rise', ['·', '✦', '·'], 14]] },
    hp: { font: "'FU CinzelDec'", nav: { home: '🏰', notes: '📜', us: '💛', memories: '🖼️', chat: '🦉', play: '🪄' }, amb: [['bob', ['🕯️'], 5], ['twinkle', ['✨', '✦'], 10]] },
    bridgerton: { font: "'FU Vibes'", word: { t: 'Bridgerton', f: "'FU Corm'", c: '#5a3f63', ls: '.18em', up: 1 }, nav: { home: '🏛️', notes: '💌', us: '🦢', memories: '🖼️', chat: '🪶', play: '🎻' }, amb: [['fall', ['🌸', '🌸', '🤍'], 8]] },
    gilmore: { font: "'FU Elite'", nav: { home: '🏡', notes: '📚', us: '☕', memories: '📷', chat: '💬', play: '🎲' }, amb: [['steam', null, 3], ['fall', ['🍂', '🍁'], 6]] },
    halloween: { font: "'FU Creep'", nav: { home: '🏚️', notes: '📜', us: '🖤', memories: '🕯️', chat: '👻', play: '🎃' }, amb: [['drift', ['🦇', '🦇', '🦇'], 5], ['fall', ['🍂', '🍁', '🍂'], 7], ['mist', null, 2], ['fireflies', null, 9], ['glow', null, 2]] },
    stranger: { font: "'FU Cinzel'", nav: { home: '🏠', notes: '📻', us: '❤️', memories: '📷', chat: '💡', play: '🚲' }, amb: [['lights', ['#ff3b3b', '#3db3e0', '#f6c94c', '#5fd38b', '#ff8fd0'], 16], ['mist', null, 2], ['rise', ['·', '•'], 10]] },
    twilight: { font: "'FU Fell'", nav: { home: '🌲', notes: '📖', us: '🍎', memories: '📷', chat: '🌙', play: '🐺' }, amb: [['mist', null, 3], ['fall', ['🍂', '🌧️'], 4]] },
    notebook: { font: "'FU Caveat'", nav: { home: '🏡', notes: '✉️', us: '🦢', memories: '📷', chat: '💌', play: '🛶' }, amb: [['drift', ['🦢', '🦢'], 2], ['fall', ['🌧️', '🍃'], 5]] },
    titanic: { font: "'FU Cinzel'", nav: { home: '🚢', notes: '✉️', us: '💎', memories: '🖼️', chat: '🎻', play: '⚓' }, amb: [['twinkle', ['✦', '·', '✧'], 12], ['rise', ['·', '◦'], 6]] },
    lalaland: { font: "'FU Pacifico'", nav: { home: '🌆', notes: '🎼', us: '💛', memories: '🎞️', chat: '🎷', play: '🎹' }, amb: [['twinkle', ['✦', '⭐', '·'], 16]] },
    pp: { font: "'FU Vibes'", nav: { home: '🏛️', notes: '✉️', us: '🤍', memories: '🖼️', chat: '🪶', play: '🐎' }, amb: [['fall', ['🍃', '🌼'], 6], ['mist', null, 1]] },
    tangled: { font: "'FU CinzelDec'", nav: { home: '🗼', notes: '📜', us: '☀️', memories: '🎨', chat: '🦎', play: '👑' }, amb: [['rise', ['🏮', '🏮', '🏮'], 10], ['twinkle', ['✨'], 8]] },
    beauty: { pics: 1, font: "'FU CinzelDec'", nav: { home: '🏰', notes: '📚', us: '🌹', memories: '🪞', chat: '🕯️', play: '🫖' }, amb: [['fall', ['🌹', '🥀'], 4], ['twinkle', ['✨', '✦'], 12], ['glow', null, 2]] },
    frozen: { pics: 1, font: "'FU Fredoka'", nav: { home: '🏔️', notes: '❄️', us: '⛄', memories: '🧊', chat: '💙', play: '⛸️' }, amb: [['fall', ['❄️', '❅', '❆', '•'], 18], ['twinkle', ['✦', '✧'], 8]] },
    howl: { pics: 1, font: "'FU Corm'", nav: { home: '🏰', notes: '📜', us: '🔥', memories: '🌼', chat: '⭐', play: '🚪' }, amb: [['drift', ['☁️', '☁️'], 3], ['fall', ['🌼', '🌸'], 5], ['twinkle', ['⭐'], 5]] },
    coco: { pics: 1, font: "'FU Amatic'", nav: { home: '🏛️', notes: '📜', us: '🧡', memories: '🖼️', chat: '🎶', play: '🎸' }, amb: [['fall', ['🌼', '🧡', '🌼'], 10], ['glow', null, 3], ['twinkle', ['✦'], 8]] },
    yourname: { pics: 1, font: "'FU Corm'", nav: { home: '🌆', notes: '📓', us: '🎀', memories: '📷', chat: '📱', play: '☄️' }, amb: [['drift', ['☄️'], 2], ['twinkle', ['✦', '·', '✧'], 14]] },
    naruto: { pics: 6, font: "'FU Fredoka'", nav: { home: '🍃', notes: '📜', us: '🍥', memories: '📷', chat: '🐸', play: '🍜' }, amb: [['fall', ['🍃', '🍃', '🍥'], 9]] },
    aot: { pics: 5, font: "'FU Cinzel'", nav: { home: '🧱', notes: '📜', us: '🪽', memories: '🗺️', chat: '🐎', play: '⚔️' }, amb: [['mist', null, 2], ['fall', ['🍃', '·'], 6]] },
    demonslayer: { pics: 7, font: "'FU Corm'", nav: { home: '🏯', notes: '📜', us: '🪻', memories: '🌸', chat: '🌊', play: '🗡️' }, amb: [['fall', ['🌸', '💜', '🌸'], 12]] },
    onepiece: { pics: 6, font: "'FU Pacifico'", nav: { home: '🏝️', notes: '🗺️', us: '👒', memories: '📷', chat: '🐌', play: '⚓' }, amb: [['drift', ['☁️', '🕊️'], 3], ['rise', ['🫧'], 5]] },
    sailormoon: { pics: 8, font: "'FU Vibes'", nav: { home: '🌙', notes: '💌', us: '💖', memories: '🪞', chat: '⭐', play: '🎀' }, amb: [['twinkle', ['✨', '⭐', '💖', '✦'], 18]] },
    spirited: { pics: 6, font: "'FU Corm'", nav: { home: '🏮', notes: '📜', us: '🐉', memories: '🌸', chat: '🐸', play: '🍙' }, amb: [['rise', ['🏮'], 6], ['glow', null, 2], ['drift', ['🐉', '☁️'], 2]] },
  };
  T.forEach((t) => Object.assign(t, X[t.id] || {}));
  // v22: chat attach sheet — per-theme icons [gallery, camera, video, file]; Colours themes keep line icons
  const ATT = {
    bears: ['🧸', '🐻', '🍯', '🧺'], bunnies: ['🌷', '🐰', '🥕', '🧺'], cats: ['🐟', '🐱', '🧶', '📦'], penguins: ['🧊', '🐧', '⛸️', '✉️'],
    foxes: ['🍂', '🦊', '🍄', '🌰'], pandas: ['🎋', '🐼', '🍃', '📜'], balloons: ['🎈', '📷', '🏠', '📖'], starry: ['🌌', '🔭', '🌠', '📜'],
    fairytale: ['🏰', '🪞', '🦄', '📜'], sea: ['🐚', '🐠', '🐙', '🍾'], garden: ['🌷', '🦋', '🐝', '🌿'], forest: ['🍄', '🦉', '🧚', '🌿'],
    tvd: ['🥀', '🪞', '🦇', '📓'], originals: ['⚜️', '🕯️', '🎷', '📜'], bridgerton: ['🌸', '🦢', '💃', '💌'], hp: ['🖼️', '🦉', '🪄', '📜'],
    gilmore: ['📚', '☕', '🎬', '📝'], stranger: ['🎄', '📸', '📼', '📻'], twilight: ['🍎', '🐺', '🌲', '📖'], notebook: ['🛶', '📷', '🦢', '📓'],
    titanic: ['💎', '🎨', '🚢', '✉️'], lalaland: ['🎹', '🌃', '🎬', '🎼'], pp: ['🖼️', '🌹', '🕯️', '🪶'], tangled: ['🎨', '🦎', '🏮', '📜'],
    beauty: ['🌹', '🪞', '🕰️', '📚'], frozen: ['❄️', '⛄', '🦌', '📜'], coco: ['🖼️', '💀', '🎸', '🌼'], yourname: ['☄️', '📱', '🌆', '📝'],
    naruto: ['🍥', '🦊', '🌀', '📜'], aot: ['🪽', '🗝️', '🧱', '📜'], demonslayer: ['🪻', '🦋', '🗡️', '📜'], onepiece: ['👒', '🍖', '🏴‍☠️', '🗺️'],
    sailormoon: ['🌙', '🐈‍⬛', '💫', '💌'], spirited: ['🏮', '🐉', '🐸', '🎫'], halloween: ['🎃', '💀', '🦇', '📜'], howl: ['🏰', '🔥', '⭐', '🗝️'],
  };
  T.forEach((t) => { if (ATT[t.id]) t.att = ATT[t.id]; });
  // v23: per-theme personality — [button, shape, nav, dialog, motion, send effect, glyphs (send,mic,plus) | icon weight]
  const TR = {
    blush: ['soft', 'scallop', 'pill', 'bubble', 'springy', 'burst:💗💕✨', 'w:bold'],
    lavender: ['tonal', 'squircle', 'float', 'frost', 'floaty', 'rise:💜✨🫧', 'w:thin'],
    ocean: ['glass', 'wave', 'dock', 'frost', 'sway', 'ripple', 'w:line'],
    mint: ['outline', 'cut', 'topline', 'note', 'snappy', 'burst:🌿🍃', 'w:duo'],
    sunset: ['gradient', 'round', 'tabs', 'card', 'elegant', 'streak:#ffb36b', 'w:bold'],
    midnight: ['crystal', 'glass', 'float', 'neon', 'drowsy', 'streak:#b3a8ff', 'w:thin'],
    bears: ['jelly', 'stitched', 'bubble', 'note', 'bouncy', 'burst:🍯🐾🤎', '🐾,🐻,🍯'],
    bunnies: ['cloud', 'blob', 'dock', 'bubble', 'bouncy', 'hop:🐰', '🥕,🐰,🌷'],
    cats: ['stitch', 'squircle', 'pill', 'bubble', 'snappy', 'trail:🐾', '🐟,🐱,🧶'],
    penguins: ['frost', 'ice', 'flat', 'frost', 'wobbly', 'burst:❄️🐟', '🐟,🐧,❄️'],
    foxes: ['wood', 'torn', 'tabs', 'note', 'springy', 'burst:🍂🍁', '🍂,🦊,🍄'],
    pandas: ['bamboo', 'paper', 'topline', 'scroll', 'drowsy', 'burst:🍃🎋', '🎋,🐼,🍃'],
    balloons: ['balloon', 'scrapbook', 'shelf', 'note', 'floaty', 'rise:🎈', '🎈,📖,🏠'],
    starry: ['brush', 'frame', 'float', 'letter', 'magic', 'sparkle:✨⭐', '🌠,🌙,⭐'],
    fairytale: ['ribbon', 'arch', 'ribbon', 'scroll', 'magic', 'sparkle:✨🪄', '🪄,👑,🏰'],
    sea: ['balloon', 'scallop', 'bubble', 'bubble', 'floaty', 'rise:🫧', '🐚,🐠,🫧'],
    garden: ['leaf', 'leaf', 'topline', 'note', 'sway', 'burst:🌸🦋🌼', '🦋,🐝,🌷'],
    tvd: ['stone', 'parchment', 'tabs', 'scroll', 'swift', 'fly:🦇', '🥀,🦇,🩸'],
    originals: ['brass', 'frame', 'ribbon', 'tablet', 'elegant', 'burst:⚜️✨', '⚜️,🎷,🕯️'],
    bridgerton: ['seal', 'scallop', 'pill', 'letter', 'elegant', 'fly:💌', '💌,🦢,🌸'],
    hp: ['tag', 'parchment', 'scroll', 'scroll', 'magic', 'fly:🦉', '🪄,🦉,📜'],
    gilmore: ['typewriter', 'paper', 'shelf', 'telegram', 'snappy', 'burst:☕📚', '☕,📚,🍂'],
    stranger: ['neon', 'neon', 'neon', 'neon', 'glitch', 'streak:#ff3b3b', '💡,📻,🔦'],
    twilight: ['stone', 'bevel', 'flat', 'tablet', 'drowsy', 'burst:🍎🌲', '🍎,🐺,🌲'],
    notebook: ['sketch', 'paper', 'topline', 'letter', 'sway', 'fly:🕊️', '🛶,🦢,📓'],
    titanic: ['foil', 'frame', 'deck', 'letter', 'elegant', 'sparkle:💎✨', '💎,🚢,⚓'],
    lalaland: ['gradient', 'ticket', 'dock', 'neon', 'springy', 'burst:🎶✨⭐', '🎹,🎷,🌟'],
    pp: ['ink', 'letter', 'flat', 'letter', 'elegant', 'fly:🪶', '🪶,🌹,📜'],
    tangled: ['lantern', 'lantern', 'bubble', 'lantern', 'floaty', 'rise:🏮', '🏮,🦎,🌸'],
    beauty: ['foil', 'arch', 'dock', 'frame', 'elegant', 'burst:🌹🥀', '🌹,🪞,🕰️'],
    frozen: ['crystal', 'ice', 'float', 'frost', 'magic', 'sparkle:❄️✨', '❄️,⛄,🦌'],
    coco: ['candy', 'zigzag', 'tabs', 'note', 'bouncy', 'burst:🌼💀🎸', '🌼,💀,🎸'],
    yourname: ['outline', 'round', 'dock', 'bubble', 'floaty', 'streak:#7fd3ff', '☄️,📱,🌆'],
    naruto: ['comic', 'comic', 'scroll', 'comic', 'snappy', 'slash:#ff8a1f', '🌀,🍥,📜'],
    aot: ['metal', 'sharp', 'flat', 'tablet', 'slam', 'slash:#c3bca6', '🪽,🗝️,🧱'],
    demonslayer: ['brush', 'panel', 'float', 'card', 'swift', 'burst:🪻🌸', '🗡️,🦋,🪻'],
    onepiece: ['wood', 'comic', 'deck', 'comic', 'bouncy', 'fly:👒', '⚓,👒,🗺️'],
    sailormoon: ['crystal', 'squircle', 'ribbon', 'frame', 'magic', 'sparkle:🌙⭐💫', '🌙,⭐,💫'],
    spirited: ['tag', 'ticket', 'tabs', 'lantern', 'drowsy', 'fly:🐉', '🏮,🐉,🐸'],
    halloween: ['drip', 'torn', 'float', 'tablet', 'sway', 'fly:🦇', '🎃,💀,🕸️'],
    forest: ['moss', 'blob', 'topline', 'scroll', 'magic', 'rise:✨🍄', '🍄,🦉,🧚'],
    howl: ['brass', 'squircle', 'deck', 'lantern', 'floaty', 'fly:⭐', '🔥,🏰,⭐'],
  };
  T.forEach((t) => { const r = TR[t.id]; if (!r) return; t.tr = { b: r[0], s: r[1], n: r[2], d: r[3], m: r[4], fx: r[5], g: r[6] }; });
  const BY = Object.fromEntries(T.map((t) => [t.id, t]));
  // ---------- seasonal overlay ----------
  const D = (y, m, d) => new Date(y, m - 1, d);
  const SEASONS = [ // approx. dates (moon sighting may shift ±1 day)
    { id: 'eid', name: 'Eid Mubarak 🌙', art: ['🎉', '🌙', '🎁'], frame: 'bunting', amb: [['fall', ['🎉', '✨', '🍬', '🎊'], 10]], parts: ['🌙', '✨', '🎉', '🏮', '🍬'], r: [[D(2026, 3, 19), D(2026, 3, 22)], [D(2026, 5, 26), D(2026, 5, 29)], [D(2027, 3, 9), D(2027, 3, 12)], [D(2027, 5, 15), D(2027, 5, 18)]] },
    { id: 'valentine', name: "Valentine's week 💝", art: ['🌹', '💝', '💌'], frame: 'garland', fe: ['💗', '🌹', '💗', '🤍'], amb: [['rise', ['💗', '💕', '🌹'], 8]], parts: ['💝', '🌹', '💌', '💘', '🍫'], md: [[2, 7], [2, 14]] },
    { id: 'ramadan', name: 'Ramadan Kareem 🌙', art: ['🏮', '🌙', '🏮'], frame: 'lanterns', amb: [['twinkle', ['✦', '⭐', '✧'], 12], ['glow', null, 2]], parts: ['🌙', '🏮', '⭐', '✨'], r: [[D(2026, 2, 18), D(2026, 3, 18)], [D(2027, 2, 8), D(2027, 3, 8)]] },
    { id: 'spooky', name: 'Spooky season 🎃', art: ['🎃', '👻', '🦇'], frame: 'garland', fe: ['🎃', '🕸️', '🦇', '🍬'], amb: [['drift', ['🦇', '🦇'], 3], ['fall', ['🍂', '🍁', '🍬'], 6]], parts: ['🎃', '👻', '🦇', '🍬', '🕸️'], md: [[10, 24], [11, 1]] },
    { id: 'newyear', name: 'Happy New Year 🎆', art: ['🎆', '🥂', '🎇'], frame: 'garland', fe: ['✨', '🎉', '⭐', '🎊'], amb: [['fall', ['🎊', '✨', '🎉'], 10], ['twinkle', ['✦', '✧'], 10]], parts: ['🎆', '🥂', '🎉', '✨', '🎇'], md: [[12, 30], [1, 2]], wrap: true },
    { id: 'winter', name: 'Cozy winter ❄️', art: ['❄️', '⛄', '❄️'], frame: 'snowcap', amb: [['fall', ['❄️', '❅', '❆', '•'], 16]], parts: ['❄️', '❄️', '⛄', '✨', '☃️'], md: [[12, 1], [1, 31]], wrap: true },
  ];
  const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  function seasonFor(now, anniv) {
    const t = day0(now);
    if (anniv) { // anniversary week: 3 days either side
      const a = new Date(anniv + 'T00:00:00'); if (!isNaN(a)) for (const y of [t.getFullYear() - 1, t.getFullYear(), t.getFullYear() + 1]) {
        const d = new Date(y, a.getMonth(), a.getDate()), diff = (t - d) / 864e5; const yrs = y - a.getFullYear();
        if (diff >= -3 && diff <= 3 && yrs >= 0) return { id: 'anniversary', art: ['🥂', '💍', '🥂'], frame: 'ribbon', amb: [['twinkle', ['✨', '💫'], 10], ['rise', ['💞', '✨'], 6]], name: yrs ? `Anniversary week — ${yrs} year${yrs > 1 ? 's' : ''} 🥂` : 'Our special week 🥂', parts: ['🥂', '💍', '💞', '🎉', '✨'] };
      }
    }
    for (const s of SEASONS) {
      if (s.r && s.r.some(([a, b]) => t >= a && t <= b)) return s;
      if (s.md) { const [[m1, d1], [m2, d2]] = s.md, k = (t.getMonth() + 1) * 100 + t.getDate(), a = m1 * 100 + d1, b = m2 * 100 + d2; if (s.wrap ? (k >= a || k <= b) : (k >= a && k <= b)) return s; }
    }
    return null;
  }
  // v29: first-time / never-picked default follows the calendar
  function defaultTheme(now) {
    const t = day0(now || new Date()), k = (t.getMonth() + 1) * 100 + t.getDate();
    const on = (id) => { const x = SEASONS.find((z) => z.id === id); return x && x.r && x.r.some(([a, b]) => t >= a && t <= b); };
    if (on('ramadan')) return 'midnight';
    if (on('eid')) return 'balloons';
    if (k >= 1001 && k <= 1102) return 'halloween';
    if (k >= 1201 || k <= 106) return 'frozen';
    if (k >= 207 && k <= 214) return 'blush';
    if (k <= 206) return 'penguins';
    if (k <= 319) return 'lavender';
    if (k <= 531) return 'garden';
    if (k <= 831) return 'sea';
    if (k <= 930) return 'sunset';
    return 'foxes';
  }
  window.CC_defaultTheme = () => defaultTheme(new Date());
  // ---------- state ----------
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } };
  let cur = BY[LS('cc_theme')] || BY[defaultTheme()] || BY.blush, season = null, seasonOn = LS('cc_seasonal') !== '0', anniv = LS('cc_anniv') || null;
  const root = document.documentElement;
  function paintVars(t) {
    Object.entries(t.v).forEach(([k, v]) => root.style.setProperty('--' + k, v));
    root.dataset.theme = t.id; root.dataset.dark = t.dark ? '1' : '0'; root.style.colorScheme = t.dark ? 'dark' : 'light';
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t.dark ? t.v.cd : t.v.ac;
  }

  // v20: app icon / theme-color / manifest / splash follow the theme
  function paintIcon(t) {
    const set = (sel, make, attr, val) => { let e = document.head && document.head.querySelector(sel); if (!e && document.head) { e = make(); document.head.appendChild(e); } if (e && e.getAttribute(attr) !== val) e.setAttribute(attr, val); };
    const mk = (tag, a) => () => { const e = document.createElement(tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const solid = (x) => (String(x).match(/#[0-9a-fA-F]{6}/) || ['#e75480'])[0];
    set('link[rel=icon]', mk('link', { rel: 'icon' }), 'href', `themes/icons/${t.id}-192.png`);
    set('link[rel=apple-touch-icon]', mk('link', { rel: 'apple-touch-icon' }), 'href', `themes/icons/${t.id}-180.png`);
    set('link[rel=manifest]', mk('link', { rel: 'manifest' }), 'href', `themes/manifests/${t.id}.json`);
    set('meta[name=theme-color]', mk('meta', { name: 'theme-color' }), 'content', t.dark ? solid(t.v.deep || t.v.bg) : solid(t.v.bg));
    const lb = document.querySelector('#loadingView .big'); if (lb) lb.textContent = t.mascot || '💗';
  }
  // tiles take the theme's own palette (its confetti colours, minus near-whites) and its icon set
  // v22: fixed scenery for themes that want it (spider webs, dangling spiders, skyline…)
  const DECO = {
    halloween: '<img class="dw tl" src="themes/halloween/web.svg" alt=""><img class="dw tr" src="themes/halloween/web.svg" alt=""><img class="dw bl" src="themes/halloween/web.svg" alt="">'
      + '<i class="ds s1"><b>🕷️</b></i><i class="ds s2"><b>🕷️</b></i>',
  };
  const DECO_BACK = { halloween: '<span class="dmoon"></span><img class="dgy" src="themes/halloween/graveyard.svg" alt="">' };
  // <sig> generated signature scenery
  Object.assign(DECO, {"blush": "<i class=\"sg tp bl-bow\">🎀</i>", "lavender": "<i class=\"sg lv-s s0\">🪻</i><i class=\"sg lv-s s1\">🪻</i><i class=\"sg lv-s s2\">🪻</i><i class=\"sg lv-s s3\">🪻</i>", "mint": "<div class=\"sg tp mn-vine\"><i>🌿</i><i>🍃</i><i>🌿</i><i>🍃</i><i>🌿</i><i>🍃</i><i>🌿</i><i>🍃</i><i>🌿</i><i>🍃</i><i>🌿</i><i>🍃</i></div>", "bears": "<i class=\"sg tp br-honey\"></i>", "bunnies": "<div class=\"sg bn-pk\"><i>🐰</i></div><div class=\"sg bn-pk p2\"><i>🐇</i></div>", "cats": "<div class=\"sg ct-w\"><i>🐈</i></div><i class=\"sg ct-sit\">🐈‍⬛</i>", "penguins": "<div class=\"sg pg-sl\"><i>🐧</i></div>", "foxes": "<div class=\"sg tp fx-br\"><i class=\"l1\">🍂</i><i class=\"l2\">🍁</i><i class=\"l3\">🍂</i><i class=\"l4\">🍁</i></div>", "balloons": "<div class=\"sg tp up-b\"><i class=\"c0\"></i><i class=\"c1\"></i><i class=\"c2\"></i><i class=\"c3\"></i><i class=\"c4\"></i><i class=\"c5\"></i><i class=\"c6\"></i><i class=\"c7\"></i><i class=\"c8\"></i></div>", "sea": "<img class=\"sg se-w l\" src=\"themes/sig/seaweed.svg\" alt=\"\"><img class=\"sg se-w r\" src=\"themes/sig/seaweed.svg\" alt=\"\">", "garden": "<i class=\"sg gd-bf\">🦋</i>", "tvd": "<i class=\"sg tp tv-crow\">🐦‍⬛</i>", "originals": "<img class=\"sg tp or-f l\" src=\"themes/sig/filigree.svg\" alt=\"\"><img class=\"sg tp or-f r\" src=\"themes/sig/filigree.svg\" alt=\"\"><img class=\"sg or-f bl\" src=\"themes/sig/filigree.svg\" alt=\"\"><img class=\"sg or-f br\" src=\"themes/sig/filigree.svg\" alt=\"\">", "gilmore": "<div class=\"sg gm-m\"><i>☕</i><b></b><b></b><b></b></div>", "stranger": "<img class=\"sg sx-v tl\" src=\"themes/sig/vines.svg\" alt=\"\"><img class=\"sg sx-v br\" src=\"themes/sig/vines.svg\" alt=\"\">", "pp": "<i class=\"sg pp-ink\"></i><i class=\"sg tp pp-fl\">🌼</i>", "beauty": "<div class=\"sg bt-d\"><i>🌹</i><b></b></div>", "frozen": "<img class=\"sg fz tl\" src=\"themes/sig/frost.svg\" alt=\"\"><img class=\"sg fz tr\" src=\"themes/sig/frost.svg\" alt=\"\"><img class=\"sg fz bl\" src=\"themes/sig/frost.svg\" alt=\"\"><img class=\"sg fz br\" src=\"themes/sig/frost.svg\" alt=\"\">", "naruto": "<div class=\"sg nr-s\"><i>🍃</i><i>🍃</i><i>🍃</i></div>", "demonslayer": "<div class=\"sg tp ds-w\"><i class=\"h0\"></i><i class=\"h1\"></i><i class=\"h2\"></i><i class=\"h3\"></i><i class=\"h4\"></i><i class=\"h5\"></i><i class=\"h6\"></i><i class=\"h7\"></i><i class=\"h8\"></i></div>", "onepiece": "<i class=\"sg tp op-h\">👒</i>", "spirited": "<div class=\"sg tp sp-l\"><i class=\"l0\"></i><i class=\"l1\"></i><i class=\"l2\"></i><i class=\"l3\"></i><i class=\"l4\"></i><i class=\"l5\"></i></div>"});
  Object.assign(DECO_BACK, {"blush": "<i class=\"sg bl-bk b0\"></i><i class=\"sg bl-bk b1\"></i><i class=\"sg bl-bk b2\"></i><i class=\"sg bl-bk b3\"></i><i class=\"sg bl-bk b4\"></i>", "ocean": "<div class=\"sg oc-w\"><i></i><i></i></div>", "sunset": "<i class=\"sg ss-sun\"></i><i class=\"sg ss-hz\"></i>", "midnight": "<i class=\"sg md-moon\"></i><i class=\"sg md-star\"></i><i class=\"sg md-star s2\"></i>", "penguins": "<i class=\"sg pg-snow\"></i>", "pandas": "<i class=\"sg pd-b l\"></i><i class=\"sg pd-b l2\"></i><i class=\"sg pd-b r\"></i><i class=\"sg pd-lf a\">🍃</i><i class=\"sg pd-lf b\">🍃</i><i class=\"sg pd-lf c\">🍃</i>", "forest": "<i class=\"sg fo-m l\">🍄</i><i class=\"sg fo-m r\">🍄</i><i class=\"sg fo-m s\">🍄</i>", "starry": "<i class=\"sg sr-moon\"></i><i class=\"sg sr-sw w0\"></i><i class=\"sg sr-sw w1\"></i><i class=\"sg sr-sw w2\"></i><i class=\"sg sr-sw w3\"></i>", "fairytale": "<img class=\"sg ft-c\" src=\"themes/sig/castle.svg\" alt=\"\">", "garden": "<div class=\"sg gd-bed\"><i>🌷</i><i>🌼</i><i>🌸</i><i>🌻</i><i>🌷</i><i>🌼</i><i>🌸</i><i>🌻</i><i>🌷</i><i>🌼</i><i>🌸</i><i>🌻</i><i>🌷</i><i>🌼</i></div>", "bridgerton": "<img class=\"sg bg-sw\" src=\"themes/sig/swag.svg\" alt=\"\">", "hp": "<div class=\"sg hp-c\"><i class=\"k0\">🕯️</i><i class=\"k1\">🕯️</i><i class=\"k2\">🕯️</i><i class=\"k3\">🕯️</i><i class=\"k4\">🕯️</i><i class=\"k5\">🕯️</i><i class=\"k6\">🕯️</i><i class=\"k7\">🕯️</i></div>", "twilight": "<img class=\"sg tw-p\" src=\"themes/sig/pines.svg\" alt=\"\">", "notebook": "<div class=\"sg nb-l\"><i class=\"bt\">🛶</i><i class=\"sw\">🦢</i><i class=\"sw s2\">🦢</i></div>", "titanic": "<img class=\"sg ti-r\" src=\"themes/sig/rail.svg\" alt=\"\">", "lalaland": "<img class=\"sg ll-c\" src=\"themes/sig/skyline.svg\" alt=\"\"><i class=\"sg ll-lamp\"><b></b></i>", "tangled": "<div class=\"sg tg-l\"><i class=\"n0\"></i><i class=\"n1\"></i><i class=\"n2\"></i><i class=\"n3\"></i><i class=\"n4\"></i><i class=\"n5\"></i><i class=\"n6\"></i><i class=\"n7\"></i><i class=\"n8\"></i><i class=\"n9\"></i><i class=\"n10\"></i></div>", "howl": "<i class=\"sg hw-cl c0\"></i><i class=\"sg hw-cl c1\"></i><i class=\"sg hw-cl c2\"></i><i class=\"sg hw-cl c3\"></i><i class=\"sg hw-st\">✦</i><i class=\"sg hw-st s2\">✦</i>", "coco": "<div class=\"sg cc-p\"><i class=\"q0\">🌼</i><i class=\"q1\">🌼</i><i class=\"q2\">🌼</i><i class=\"q3\">🌼</i><i class=\"q4\">🌼</i><i class=\"q5\">🌼</i><i class=\"q6\">🌼</i><i class=\"q7\">🌼</i><i class=\"q8\">🌼</i><i class=\"q9\">🌼</i><i class=\"q10\">🌼</i><i class=\"q11\">🌼</i><i class=\"q12\">🌼</i><i class=\"q13\">🌼</i><i class=\"q14\">🌼</i><i class=\"q15\">🌼</i></div>", "yourname": "<i class=\"sg yn-c\"></i><i class=\"sg yn-c c2\"></i>", "aot": "<img class=\"sg ao-w\" src=\"themes/sig/wall.svg\" alt=\"\">", "onepiece": "<img class=\"sg op-s\" src=\"themes/sig/opsea.svg\" alt=\"\">", "sailormoon": "<i class=\"sg sm-m\"></i><i class=\"sg sm-t t0\">✦</i><i class=\"sg sm-t t1\">✦</i><i class=\"sg sm-t t2\">✦</i><i class=\"sg sm-t t3\">✦</i><i class=\"sg sm-t t4\">✦</i><i class=\"sg sm-t t5\">✦</i>"});
  // </sig>
  function paintDeco(t) {
    [['thDeco', DECO], ['thDecoB', DECO_BACK]].forEach(([id, map]) => {
      let el = document.getElementById(id); const h = map[t.id] || '';
      if (!h) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = id; el.setAttribute('aria-hidden', 'true'); document.body.prepend(el); }
      if (el.dataset.k !== t.id) { el.dataset.k = t.id; el.innerHTML = h; }
    });
  }
  function paintTraits(t) {
    const r = t.tr || { b: 'soft', s: 'round', n: 'pill', d: 'card', m: 'springy', fx: 'burst:💗', g: 'w:bold' };
    Object.assign(root.dataset, { btn: r.b, shape: r.s, navs: r.n, dlg: r.d, mo: r.m });
    const w = /^w:/.test(r.g) ? r.g.slice(2) : 'line'; root.dataset.ico = w;
    const gl = /^w:/.test(r.g) ? null : r.g.split(',');
    root.dataset.gly = gl ? '1' : '0';
    [['chSend', 0], ['chMic', 1], ['chPlus', 2]].forEach(([id, i]) => {
      const b = document.getElementById(id); if (!b) return;
      let g = b.querySelector('.gly'); if (!g) { g = document.createElement('b'); g.className = 'gly'; g.setAttribute('aria-hidden', 'true'); b.appendChild(g); }
      g.textContent = gl ? gl[i] : '';
    });
  }
  // v23: the "message sent" moment, one per theme
  window.CC_sendFx = (from) => {
    if (!(motionOK() && cuteOn())) return;
    const r = (cur.tr && cur.tr.fx) || 'burst:💗'; const [type, arg = ''] = r.split(':');
    const seg = (x) => (window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(x)].map((g) => g.segment) : Array.from(x));
    const em = arg && arg[0] !== '#' ? seg(arg) : ['💗'];
    const b = (from && from.getBoundingClientRect) ? from.getBoundingClientRect() : { left: innerWidth - 50, top: innerHeight - 120, width: 40, height: 40 };
    const x0 = b.left + b.width / 2, y0 = b.top + b.height / 2, R = Math.random;
    const L = document.createElement('div'); L.className = 'sfx'; L.setAttribute('aria-hidden', 'true'); document.body.appendChild(L);
    const put = (html, css) => { const e = document.createElement('i'); e.innerHTML = html; Object.assign(e.style, { left: x0 + 'px', top: y0 + 'px' }, css || {}); L.appendChild(e); return e; };
    const anim = (e, kf, o) => e.animate(kf, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.22,1,.36,1)' }, o));
    const pick = () => em[Math.floor(R() * em.length)];
    let life = 1400;
    if (type === 'burst') for (let i = 0; i < 12; i++) { const a = R() * Math.PI * 2, d = 50 + R() * 90; const e = put(pick(), { fontSize: 14 + R() * 12 + 'px' }); anim(e, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d - 30}px)) scale(1) rotate(${R() * 120 - 60}deg)`, opacity: 1, offset: .6 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px),calc(-50% + ${Math.sin(a) * d + 40}px)) scale(.8)`, opacity: 0 }], { duration: 900 + R() * 400 }); }
    else if (type === 'rise') for (let i = 0; i < 7; i++) { const e = put(pick(), { fontSize: 16 + R() * 14 + 'px' }); const dx = R() * 120 - 80; anim(e, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { opacity: 1, offset: .15 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% - ${200 + R() * 160}px)) scale(1.1)`, opacity: 0 }], { duration: 1600 + R() * 700, delay: i * 70, easing: 'ease-out' }); life = 2600; }
    else if (type === 'fly') { const e = put(pick(), { fontSize: '30px' }); anim(e, [{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 }, { transform: 'translate(-90px,-120px) scale(1.2) rotate(-12deg)', opacity: 1, offset: .35 }, { transform: `translate(-${innerWidth * .7}px,-${innerHeight * .75}px) scale(.6) rotate(-20deg)`, opacity: 0 }], { duration: 1500, easing: 'cubic-bezier(.45,.05,.55,.95)' }); life = 1600; }
    else if (type === 'hop') { const e = put(pick(), { fontSize: '28px' }); const k = []; for (let i = 0; i <= 4; i++) { k.push({ transform: `translate(calc(-50% - ${i * 60}px),-50%)`, offset: i / 4.2 }); if (i < 4) k.push({ transform: `translate(calc(-50% - ${i * 60 + 30}px),calc(-50% - 50px))`, offset: (i + .5) / 4.2 }); } k.push({ transform: 'translate(calc(-50% - 260px),-50%)', opacity: 0, offset: 1 }); anim(e, k, { duration: 1500, easing: 'ease-in-out' }); life = 1600; }
    else if (type === 'trail') { for (let i = 0; i < 6; i++) { const e = put(pick(), { fontSize: '16px', left: x0 - 30 - i * 34 + 'px', top: y0 - 20 - i * 26 + (i % 2) * 14 + 'px' }); anim(e, [{ transform: `translate(-50%,-50%) rotate(-40deg) scale(.4)`, opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(-40deg) scale(1)', opacity: .9, offset: .2 }, { opacity: 0 }], { duration: 1200, delay: i * 120 }); } life = 2000; }
    else if (type === 'sparkle') { for (let i = 0; i < 14; i++) { const e = put(i % 3 ? '✦' : pick(), { fontSize: 10 + R() * 14 + 'px', color: '#fff6c0', textShadow: '0 0 8px rgba(255,240,160,.9)' }); const t = i / 14; anim(e, [{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { transform: `translate(calc(-50% - ${t * 220}px),calc(-50% - ${Math.sin(t * Math.PI) * 120 + t * 80}px)) scale(1.2)`, opacity: 1, offset: .5 }, { transform: `translate(calc(-50% - ${t * 220}px),calc(-50% - ${Math.sin(t * Math.PI) * 120 + t * 80 - 20}px)) scale(0)`, opacity: 0 }], { duration: 900, delay: i * 45 }); } life = 1700; }
    else if (type === 'ripple') { for (let i = 0; i < 3; i++) { const e = put('', { width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.85)', boxShadow: '0 0 12px rgba(120,200,255,.6)' }); anim(e, [{ transform: 'translate(-50%,-50%) scale(.5)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(5)', opacity: 0 }], { duration: 1100, delay: i * 180, easing: 'ease-out' }); } }
    else if (type === 'streak' || type === 'slash') { const c = arg || '#fff'; const sl = type === 'slash'; const e = put('', { left: sl ? '-10vw' : innerWidth + 'px', top: (sl ? y0 - 60 : 90 + R() * 120) + 'px', width: sl ? '130vw' : '160px', height: sl ? '4px' : '3px', borderRadius: '3px', background: `linear-gradient(90deg,transparent,${c},#fff)`, boxShadow: `0 0 14px 3px ${c}` }); if (sl) anim(e, [{ transform: 'rotate(-14deg) scaleX(0)', transformOrigin: 'right', opacity: 1 }, { transform: 'rotate(-14deg) scaleX(1)', opacity: 1, offset: .35 }, { transform: 'rotate(-14deg) scaleX(1)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.7,0,.3,1)' }); else anim(e, [{ transform: 'rotate(-25deg) translateX(0)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: `rotate(-25deg) translateX(-${innerWidth + 300}px)`, opacity: 0 }], { duration: 1100, easing: 'ease-in' }); life = 1200; }
    setTimeout(() => L.remove(), life + 400);
  };
  function paintAttach(t) {
    const lum = (h) => { const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(h).trim()); if (!m) return 1; let x = m[1]; if (x.length === 3) x = x.replace(/./g, '$&$&'); const n = parseInt(x, 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };
    let cs = (t.conf || []).filter((c) => lum(c) < 0.86);
    const ac = (t.v && (t.v.ac || t.v.act)) || '#e75480';
    if (!cs.length) cs = [ac];
    for (let i = 0; i < 4; i++) root.style.setProperty('--at' + (i + 1), cs[i % cs.length]);
    const box = document.getElementById('chAttach'); if (!box) return;
    box.classList.toggle('emo', !!t.att);
    box.querySelectorAll('.chAtE').forEach((e, i) => { e.textContent = t.att ? t.att[i] : ''; });
  }
  function paintDom() {
    if (!document.body) return;
    const t = cur;
    document.querySelectorAll('[data-mascot]').forEach((e) => { e.textContent = (t.game && t.game[e.dataset.mascot]) || t.mascot || e.dataset.def || e.textContent; });
    document.querySelectorAll('[data-ni]').forEach((e) => { if (!e.dataset.def) e.dataset.def = e.textContent; e.textContent = (t.nav && t.nav[e.dataset.ni]) || e.dataset.def; });
    paintAttach(t); paintDeco(t); paintTraits(t);
    document.getElementById('thMark')?.remove();
    paintHero(); paintSeason(); paintAmb(); paintPics();
    paintIcon(BY[LS('cc_theme')] || t);
    const s = seasonOn ? season : null; root.dataset.season = s ? s.id : '';
  }

  // ---------- v20 immersive layers ----------
  const motionOK = () => !(matchMedia('(prefers-reduced-motion: reduce)').matches || LS('cc_reduce_motion') === '1');
  const cuteOn = () => LS('cc_cute_fx') !== '0';
  const escH = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function heroInner(t) {
    if (t.logo) return `<img src="${t.logo}" alt="${escH(t.name)}">`;
    if (t.word) return `<span class="hw" style="font-family:${t.word.f};color:${t.word.c}${t.word.ls ? ';letter-spacing:' + t.word.ls : ''}${t.word.up ? ';text-transform:uppercase' : ''}">${escH(t.word.t)}</span>`;
    if (t.art) return `<span class="ha">${t.art.map((e, i) => `<i style="--i:${i}">${e}</i>`).join('')}</span><span class="hw">For Us</span>`;
    return '';
  }
  window.CC_heroInner = heroInner;
  function paintHero() {
    const top = document.querySelector('#mainView header.top'); if (!top) return;
    let h = document.getElementById('thHero'); const t = cur, inner = heroInner(t);
    if (!inner) { if (h) h.remove(); root.dataset.hero = ''; return; }
    if (!h) { h = document.createElement('div'); h.id = 'thHero'; h.setAttribute('aria-hidden', 'true'); top.prepend(h); }
    if (h.dataset.k !== t.id) { h.dataset.k = t.id; h.innerHTML = inner; }
    root.dataset.hero = t.logo ? 'logo' : t.word ? 'word' : 'art';
  }
  function paintSeason() {
    const s = seasonOn ? season : null;
    let fr = document.getElementById('seasonFrame'), bn = document.getElementById('seasonBanner');
    document.getElementById('seasonPill')?.remove();
    if (!s) { fr?.remove(); bn?.remove(); return; }
    if (!fr) { fr = document.createElement('div'); fr.id = 'seasonFrame'; fr.setAttribute('aria-hidden', 'true'); document.body.prepend(fr); }
    if (fr.dataset.k !== s.id) {
      fr.dataset.k = s.id; fr.className = 'sf-' + s.frame; let h = '';
      if (s.frame === 'garland') for (let i = 0; i < 16; i++) h += `<i style="left:${(i + .5) * 6.25}%;top:${(Math.sin((i / 15) * Math.PI) * 10).toFixed(1)}px">${s.fe[i % s.fe.length]}</i>`;
      if (s.frame === 'lanterns') { [8, 24, 42, 62, 80].forEach((x, i) => { h += `<i class="ln" style="left:${x}%;--h:${[18, 34, 12, 28, 20][i]}px;animation-delay:${-i * .7}s">🏮</i>`; }); h += '<i class="cres">🌙</i>'; }
      if (s.frame === 'bunting') { const c = ['#e9b949', '#2f9e6b', '#e75480', '#4a8fe7', '#9b6bd6']; for (let i = 0; i < 18; i++) h += `<b style="left:${i * 5.6}%;--c:${c[i % c.length]};top:${(Math.sin((i / 17) * Math.PI) * 9).toFixed(1)}px"></b>`; }
      if (s.frame === 'snowcap') { h = '<div class="cap"></div>'; for (let i = 0; i < 14; i++) h += `<b style="left:${(i * 7.3 + 2).toFixed(1)}%;height:${6 + (i * 37 % 13)}px"></b>`; }
      if (s.frame === 'ribbon') h = '<div class="rb"></div><i class="bow">🎀</i><i class="gl l">🥂</i><i class="gl r">🥂</i>';
      fr.innerHTML = h;
    }
    const home = document.getElementById('tab-home');
    if (home) {
      if (!bn) { bn = document.createElement('div'); bn.id = 'seasonBanner'; home.prepend(bn); }
      if (bn.dataset.k !== s.id + s.name) { bn.dataset.k = s.id + s.name; bn.dataset.s = s.id; bn.innerHTML = `<span class="sa">${s.art.map((e, i) => `<i style="--i:${i}">${e}</i>`).join('')}</span><b>${escH(s.name)}</b>`; }
    }
  }

  // v20: picture backdrops (Animations = one hero still; Anime = random still per tab, crossfaded)
  let picLast = -1;
  function paintPics(next) {
    if (!document.body) return;
    let L = document.getElementById('thPic'); const t = cur, n = t.pics || 0;
    if (!n) { if (L) L.remove(); root.dataset.pic = ''; return; }
    if (!L) { L = document.createElement('div'); L.id = 'thPic'; L.setAttribute('aria-hidden', 'true'); L.innerHTML = '<i class="pa"></i><i class="pb"></i><b class="pv"></b>'; document.body.prepend(L); }
    root.dataset.pic = t.cat === 'Anime' ? 'bg' : 'hero';
    if (L.dataset.k === t.id && !next) return;
    let i = 0; if (n > 1) { do { i = Math.floor(Math.random() * n); } while (i === picLast && L.dataset.k === t.id); }
    picLast = i; L.dataset.k = t.id;
    const url = `themes/${t.id}/${i + 1}.webp`, a = L.querySelector('.pa'), b = L.querySelector('.pb');
    const on = a.classList.contains('on') ? a : b, off = on === a ? b : a;
    const img = new Image(); img.onload = img.onerror = () => { off.style.backgroundImage = `url("${url}")`; off.classList.add('on'); on.classList.remove('on'); };
    img.src = url;
  }
  window.CC_picNext = () => { if (cur.cat === 'Anime') paintPics(true); };
  function paintAmb() {
    if (!document.body) return;
    let L = document.getElementById('thAmb');
    if (!L) { L = document.createElement('div'); L.id = 'thAmb'; L.setAttribute('aria-hidden', 'true'); document.body.prepend(L); }
    const anim = motionOK() && cuteOn(), s = seasonOn ? season : null;
    const list = (cur.amb || []).concat((s && s.amb) || []);
    const key = cur.id + '|' + (s ? s.id : '') + '|' + anim; if (L.dataset.k === key) return; L.dataset.k = key;
    let h = ''; const R = Math.random, f = (v) => v.toFixed(1);
    for (const [type, em, n] of list) {
      if (!anim && !['mist', 'lights', 'glow'].includes(type)) continue;
      if (type === 'lights') { h += '<div class="am lights">'; for (let i = 0; i < n; i++) h += `<b style="left:${f((i + .5) * 100 / n)}%;top:${f(Math.sin((i / (n - 1)) * Math.PI) * 12 + 4)}px;--c:${em[i % em.length]};animation-delay:${f(-R() * 3)}s"></b>`; h += '</div>'; continue; }
      for (let i = 0; i < n; i++) {
        const e = em ? em[i % em.length] : '', x = f(R() * 100), dl = f(-R() * 25);
        if (type === 'fall') h += `<i class="am fall" style="left:${x}%;font-size:${f(12 + R() * 12)}px;animation-duration:${f(12 + R() * 12)}s;animation-delay:${dl}s">${e}</i>`;
        else if (type === 'rise') h += `<i class="am rise" style="left:${x}%;font-size:${f(10 + R() * 14)}px;animation-duration:${f(14 + R() * 14)}s;animation-delay:${dl}s">${e}</i>`;
        else if (type === 'drift') h += `<i class="am drift" style="top:${f(6 + R() * 40)}%;font-size:${f(16 + R() * 10)}px;animation-duration:${f(26 + R() * 18)}s;animation-delay:${f(-R() * 40)}s">${e}</i>`;
        else if (type === 'bob') h += `<i class="am bob" style="left:${f(8 + i * (84 / Math.max(1, n - 1)))}%;top:${f(9 + R() * 9)}%;animation-delay:${f(-R() * 4)}s">${e}</i>`;
        else if (type === 'twinkle') h += `<i class="am tw" style="left:${x}%;top:${f(R() * 75)}%;font-size:${f(8 + R() * 8)}px;animation-duration:${f(2.5 + R() * 3)}s;animation-delay:${f(-R() * 5)}s">${e}</i>`;
        else if (type === 'fireflies') h += `<i class="am fly" style="left:${x}%;top:${f(25 + R() * 65)}%;animation-duration:${f(6 + R() * 6)}s;animation-delay:${dl}s"></i>`;
        else if (type === 'mist') h += `<i class="am mist m${i}"></i>`;
        else if (type === 'glow') h += `<i class="am glow g${i}"></i>`;
        else if (type === 'steam') h += `<i class="am steam" style="left:${f(15 + i * 30)}%;animation-delay:${f(-i * 1.3)}s"></i>`;
      }
    }
    L.innerHTML = h; L.classList.toggle('still', !anim);
  }
  window.CC_ambRefresh = () => { const L = document.getElementById('thAmb'); if (L) L.dataset.k = ''; setTimeout(paintAmb, 0); };
  document.addEventListener('cc:cute', window.CC_ambRefresh);
  let seasonPrev = null; // picker preview of a season overlay
  const ANNIV_S = { id: 'anniversary', art: ['🥂', '💍', '🥂'], frame: 'ribbon', amb: [['twinkle', ['✨', '💫'], 10], ['rise', ['💞', '✨'], 6]], name: 'Anniversary week 💍', parts: ['💍', '🥂', '💞', '✨'] };
  function refreshSeason() { season = seasonPrev ? (SEASONS.find((x) => x.id === seasonPrev) || ANNIV_S) : seasonFor(new Date(), anniv); }
  window.CC_seasonList = () => SEASONS.map((x) => ({ id: x.id, name: x.name, art: x.art })).concat([{ id: 'anniversary', name: ANNIV_S.name, art: ANNIV_S.art }]);
  window.CC_previewSeason = (id) => { seasonPrev = id || null; const was = seasonOn; if (id) seasonOn = true; else seasonOn = LS('cc_seasonal') !== '0'; refreshSeason(); const L = document.getElementById('thAmb'); if (L) L.dataset.k = ''; paintDom(); if (id || was !== seasonOn) document.dispatchEvent(new CustomEvent('cc:theme', { detail: cur.id })); };
  window.CC_seasonPreviewing = () => seasonPrev;
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
