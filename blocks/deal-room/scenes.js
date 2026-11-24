/*
 * Deal Room scenes: one SVG setting per room type. They are settings, not a game world:
 * there is no movement, only the people in the meeting and who is speaking.
 * Built with DOM APIs because the site's CSP requires Trusted Types (no innerHTML).
 */

const NS = 'http://www.w3.org/2000/svg';
const W = 1200;
const H = 420;

function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== null && v !== undefined) el.setAttribute(k, String(v));
  });
  el.append(...children.flat().filter(Boolean));
  return el;
}

const rect = (x, y, w, h, fill, extra = {}) => s('rect', {
  x, y, width: w, height: h, fill, ...extra,
});

/* ---------- people ---------- */

const SKIN = ['#e9b99a', '#b9825d', '#f1cfb4', '#7a4f36', '#d39c7a'];
const SUIT = ['#2d3a4f', '#6b3e3e', '#3f5a4a', '#4b4466', '#5b4b3a'];
const HAIR = ['#2b2018', '#5a3b22', '#1c1c1c', '#8a6a46', '#3a2a22'];

function person(x, y, i, scale = 1) {
  const k = i % SKIN.length;
  const g = s('g', {
    class: 'dr-person', transform: `translate(${x} ${y}) scale(${scale})`, 'data-index': i,
  });
  g.append(
    s('path', { d: 'M-70 120 Q-70 20 -32 6 L32 6 Q70 20 70 120 Z', fill: SUIT[k] }),
    s('path', { d: 'M-14 6 L0 34 L14 6 Z', fill: '#f4efe6' }),
    rect(-11, -16, 22, 24, SKIN[k]),
    s('circle', {
      cx: 0, cy: -46, r: 34, fill: SKIN[k],
    }),
    s('path', { d: i % 2 ? 'M-35 -50 Q-30 -88 4 -84 Q36 -82 35 -50 Q20 -70 -35 -50 Z' : 'M-34 -42 Q-40 -86 0 -84 Q40 -86 34 -42 Q30 -64 0 -66 Q-30 -64 -34 -42 Z', fill: HAIR[k] }),
  );
  const bubble = s('g', { class: 'dr-bubble', transform: 'translate(46 -110)' });
  bubble.append(
    s('path', {
      d: 'M0 0 h64 a12 12 0 0 1 12 12 v18 a12 12 0 0 1 -12 12 h-44 l-14 12 v-12 h-6 a12 12 0 0 1 -12 -12 v-18 a12 12 0 0 1 12 -12 Z', fill: '#fffdf7', stroke: '#1d1d1d', 'stroke-width': 2,
    }),
    ...[22, 38, 54].map((cx) => s('circle', {
      cx: cx - 6, cy: 21, r: 4, fill: '#1d1d1d',
    })),
  );
  g.append(bubble);
  return g;
}

function seats(n) {
  if (n <= 1) return [600];
  if (n === 2) return [470, 730];
  return [360, 600, 840];
}

/* ---------- rooms ---------- */

function boardroom() {
  const back = [rect(0, 0, W, H, '#1f2a3a')];
  back.push(s('defs', {}, s(
    'linearGradient',
    {
      id: 'dr-sky', x1: 0, y1: 0, x2: 0, y2: 1,
    },
    s('stop', { offset: 0, 'stop-color': '#bfd0e2' }),
    s('stop', { offset: 1, 'stop-color': '#eef2f6' }),
  )));
  back.push(rect(70, 30, 1060, 290, 'url(#dr-sky)'));
  const heights = [120, 180, 90, 210, 150, 240, 110, 170, 200, 130, 220, 160, 100, 190];
  heights.forEach((bh, i) => {
    back.push(rect(70 + i * 76, 320 - bh, 64, bh, i % 2 ? '#9fb0c2' : '#8a9db2'));
    for (let wy = 330 - bh; wy < 310; wy += 22) {
      back.push(rect(80 + i * 76, wy, 44, 6, '#c8d4e0', { opacity: 0.6 }));
    }
  });
  for (let mx = 70; mx <= 1130; mx += 132) back.push(rect(mx - 4, 30, 8, 290, '#1f2a3a'));
  back.push(rect(70, 30, 1060, 8, '#1f2a3a'));
  [300, 600, 900].forEach((lx) => back.push(
    rect(lx - 1, 0, 2, 40, '#0e141d'),
    rect(lx - 70, 40, 140, 8, '#0e141d'),
    rect(lx - 66, 48, 132, 3, '#f7e8b5', { opacity: 0.8 }),
  ));
  const front = [
    s('path', { d: 'M80 330 L1120 330 L1200 420 L0 420 Z', fill: '#6b4f3a' }),
    s('path', { d: 'M80 330 L1120 330 L1128 340 L72 340 Z', fill: '#8a6a50' }),
    rect(420, 352, 120, 4, '#d9d2c3', { transform: 'rotate(-3 480 354)' }),
    rect(720, 360, 90, 60, '#f4efe6', { transform: 'rotate(4 765 390)' }),
  ];
  return { back, front };
}

function factory() {
  const back = [rect(0, 0, W, H, '#cfc9bb'), rect(60, 36, 1080, 236, '#56636a')];
  for (let gx = 60; gx < 1140; gx += 120) {
    back.push(s('path', {
      d: `M${gx} 60 L${gx + 60} 110 L${gx + 120} 60`, stroke: '#3a454b', 'stroke-width': 6, fill: 'none',
    }));
  }
  back.push(rect(60, 56, 1080, 6, '#3a454b'), rect(60, 108, 1080, 6, '#3a454b'));
  [[120, 170, 180, 102, '#7c8a90'], [360, 150, 140, 122, '#e0a030'], [560, 190, 220, 82, '#7c8a90'],
    [840, 160, 120, 112, '#e0a030'], [1000, 200, 120, 72, '#6d7a80']].forEach(([x, y, w, h, c]) => {
    back.push(rect(x, y, w, h, c), rect(x + 10, y + 12, w - 20, 8, '#2f383d', { opacity: 0.4 }));
  });
  [250, 700, 950].forEach((lx) => back.push(
    rect(lx - 1, 114, 2, 30, '#2f383d'),
    s('path', { d: `M${lx - 22} 158 L${lx + 22} 158 L${lx + 12} 144 L${lx - 12} 144 Z`, fill: '#2f383d' }),
    s('ellipse', {
      cx: lx, cy: 166, rx: 40, ry: 10, fill: '#f8e39a', opacity: 0.35,
    }),
  ));
  back.push(s('defs', {}, s(
    'pattern',
    {
      id: 'dr-stripe', width: 28, height: 28, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)',
    },
    rect(0, 0, 14, 28, '#e0a030'),
    rect(14, 0, 14, 28, '#262626'),
  )));
  back.push(rect(60, 272, 1080, 14, 'url(#dr-stripe)'), rect(40, 30, 1120, 6, '#8d969b'));
  const front = [
    rect(60, 330, 1080, 18, '#9aa3a8'),
    rect(60, 348, 1080, 72, '#7d868b'),
    rect(160, 300, 150, 32, '#3b3f42', { rx: 4 }),
    rect(830, 312, 70, 20, '#f4efe6'),
    s('circle', {
      cx: 980, cy: 318, r: 14, fill: '#fffdf7', stroke: '#3b3f42', 'stroke-width': 4,
    }),
  ];
  return { back, front };
}

function cafe() {
  const back = [rect(0, 0, W, H, '#efe3cf'), rect(0, 250, W, 170, '#d8c4a4')];
  back.push(rect(120, 50, 300, 190, '#2e3b33', { rx: 6 }), rect(120, 50, 300, 190, 'none', {
    stroke: '#8a6a46', 'stroke-width': 10, rx: 6,
  }));
  [[150, 80, 140], [150, 110, 220], [150, 140, 180], [150, 170, 120], [150, 200, 200]].forEach(
    ([x, y, w]) => back.push(rect(x, y, w, 5, '#f4efe6', { opacity: 0.75, rx: 2 })),
  );
  [700, 860, 1020].forEach((lx, i) => back.push(
    rect(lx - 1, 0, 2, 90 + i * 20, '#3a2a22'),
    s('circle', {
      cx: lx, cy: 104 + i * 20, r: 16, fill: '#f6c76b',
    }),
    s('circle', {
      cx: lx, cy: 104 + i * 20, r: 40, fill: '#f6c76b', opacity: 0.18,
    }),
  ));
  back.push(rect(640, 200, 460, 10, '#8a6a46'));
  [670, 720, 770, 960, 1010].forEach((cx) => back.push(
    rect(cx, 172, 34, 28, '#fffdf7', { rx: 4 }),
  ));
  back.push(rect(850, 150, 40, 50, '#b0673f', { rx: 4 }));
  back.push(
    rect(1110, 250, 50, 70, '#b0673f'),
    ...[[1120, 230, 34], [1150, 220, 30], [1135, 196, 26]].map(([cx, cy, r]) => s('circle', {
      cx, cy, r, fill: '#5f7d4e',
    })),
  );
  const front = [
    s('ellipse', {
      cx: 600, cy: 380, rx: 430, ry: 70, fill: '#a5714a',
    }),
    s('ellipse', {
      cx: 600, cy: 372, rx: 430, ry: 62, fill: '#b8845a',
    }),
    ...[[470, 352], [700, 360]].flatMap(([x, y]) => [
      s('ellipse', {
        cx: x, cy: y + 20, rx: 40, ry: 10, fill: '#fffdf7',
      }),
      rect(x - 22, y - 10, 44, 30, '#fffdf7', { rx: 6 }),
      s('path', {
        d: `M${x - 8} ${y - 18} q8 -12 0 -24 M${x + 8} ${y - 18} q8 -12 0 -24`, stroke: '#8a7a6a', 'stroke-width': 3, fill: 'none', class: 'dr-steam',
      }),
    ]),
  ];
  return { back, front };
}

function shop() {
  const back = [rect(0, 0, W, H, '#ead9cf'), rect(0, 260, W, 160, '#cdb8a8')];
  [70, 150, 230].forEach((y) => back.push(rect(60, y + 52, 380, 8, '#8a6a46')));
  [[70, 4], [150, 3], [230, 5]].forEach(([y, n]) => {
    for (let i = 0; i < n; i += 1) {
      back.push(rect(76 + i * 72, y, 60, 52, i % 2 ? '#c49a6c' : '#b88b5c'));
      back.push(rect(96 + i * 72, y + 20, 20, 8, '#fffdf7', { opacity: 0.7 }));
    }
  });
  back.push(rect(700, 70, 420, 6, '#3a3a3a'), rect(706, 70, 6, 210, '#3a3a3a'), rect(1108, 70, 6, 210, '#3a3a3a'));
  ['#c75b4a', '#3f5a7a', '#e0b04a', '#6b8a5a', '#d9d2c3', '#2d3a4f'].forEach((c, i) => {
    const x = 740 + i * 62;
    back.push(
      s('path', { d: `M${x + 20} 76 v12`, stroke: '#3a3a3a', 'stroke-width': 3 }),
      s('path', { d: `M${x} 112 L${x + 20} 88 L${x + 40} 112 L${x + 46} 230 L${x - 6} 230 Z`, fill: c }),
    );
  });
  const front = [
    rect(80, 330, 1040, 14, '#e7dccb'),
    rect(80, 344, 1040, 76, '#d7cbb8'),
    rect(300, 304, 110, 28, '#f4efe6', { transform: 'rotate(-4 355 318)' }),
    ...[0, 1, 2].map((i) => rect(820 + i * 14, 310 - i * 6, 80, 22, ['#c75b4a', '#3f5a7a', '#e0b04a'][i])),
  ];
  return { back, front };
}

function clinic() {
  const back = [rect(0, 0, W, H, '#dfeee8'), rect(0, 270, W, 150, '#c6dcd3')];
  back.push(rect(760, 40, 340, 220, '#bcd9ef'), rect(760, 40, 340, 220, 'none', {
    stroke: '#fbfdfc', 'stroke-width': 10,
  }));
  for (let y = 48; y < 200; y += 14) back.push(rect(764, y, 332, 9, '#f2f6f4'));
  back.push(rect(150, 70, 170, 120, '#fbfdfc'), rect(170, 90, 130, 60, '#8fbfae'));
  back.push(rect(214, 102, 42, 36, '#fbfdfc'), rect(229, 108, 12, 24, '#d95b5b'), rect(223, 114, 24, 12, '#d95b5b'));
  back.push(
    rect(60, 220, 60, 80, '#e9e4da'),
    ...[[90, 200, 30], [70, 180, 22], [108, 172, 24]].map(([cx, cy, r]) => s('circle', {
      cx, cy, r, fill: '#6f9c7f',
    })),
  );
  const front = [
    rect(80, 332, 1040, 12, '#ffffff'),
    rect(80, 344, 1040, 76, '#eef2f0'),
    rect(760, 300, 70, 34, '#cbb48a', { rx: 3 }),
    rect(768, 290, 54, 40, '#fffdf7'),
    rect(430, 318, 60, 14, '#4b4466', { rx: 3 }),
  ];
  return { back, front };
}

function lobby() {
  const back = [rect(0, 0, W, H, '#e9e1d3'), rect(0, 280, W, 140, '#d6cbb6')];
  [150, 450, 750, 1050].forEach((x) => {
    back.push(s('path', { d: `M${x - 110} 280 V120 A110 110 0 0 1 ${x + 110} 120 V280 Z`, fill: '#d6cbb6' }));
    back.push(s('path', { d: `M${x - 90} 280 V128 A90 90 0 0 1 ${x + 90} 128 V280 Z`, fill: '#c4b79d' }));
  });
  back.push(
    rect(1120, 80, 6, 220, '#b08d4a'),
    s('path', { d: 'M1090 80 L1156 80 L1140 40 L1106 40 Z', fill: '#e6c98a' }),
    rect(40, 230, 70, 70, '#8a6a46'),
    ...[[75, 210, 40], [50, 180, 28], [100, 170, 30], [76, 150, 26]].map(([cx, cy, r]) => s('circle', {
      cx, cy, r, fill: '#56704a',
    })),
  );
  const front = [
    s('path', { d: 'M180 336 L1020 336 L1060 420 L140 420 Z', fill: '#3c3a38' }),
    s('path', { d: 'M180 336 L1020 336 L1024 346 L176 346 Z', fill: '#5a5753' }),
    s('path', {
      d: 'M300 380 q120 -20 240 10 M700 400 q100 -30 220 0', stroke: '#6b6862', 'stroke-width': 2, fill: 'none',
    }),
    rect(560, 316, 80, 24, '#b08d4a', { rx: 3 }),
  ];
  return { back, front };
}

function bank() {
  const back = [rect(0, 0, W, H, '#23413a'), rect(0, 290, W, 130, '#1a312b')];
  [110, 1090].forEach((x) => back.push(
    rect(x - 40, 40, 80, 250, '#d9d2c3'),
    rect(x - 52, 30, 104, 18, '#e8e2d5'),
    ...[x - 26, x - 8, x + 10, x + 26].map((lx) => rect(lx - 2, 54, 4, 230, '#c4bcaa')),
  ));
  back.push(rect(420, 50, 360, 200, '#b08d4a'), rect(434, 64, 332, 172, '#2f4f5f'));
  back.push(s('path', { d: 'M434 236 L540 150 L610 200 L690 120 L766 190 L766 236 Z', fill: '#4f6f5f' }));
  back.push(s('circle', {
    cx: 700, cy: 100, r: 18, fill: '#e8d9a0',
  }));
  const front = [
    s('path', { d: 'M90 334 L1110 334 L1180 420 L20 420 Z', fill: '#e7e2d8' }),
    s('path', { d: 'M90 334 L1110 334 L1116 344 L84 344 Z', fill: '#f4f1ea' }),
    s('path', {
      d: 'M200 380 q160 -30 300 10 q100 20 200 -10 M600 410 q160 -20 380 -6', stroke: '#c9c1b0', 'stroke-width': 2, fill: 'none',
    }),
    rect(520, 312, 160, 26, '#2d3a4f', { rx: 3 }),
    rect(530, 316, 140, 4, '#9fb0c2'),
  ];
  return { back, front };
}

const ROOMS = {
  boardroom, factory, cafe, shop, clinic, lobby, bank,
};

/** Video call: each person sits in a tile instead of around a table. */
function videoCall(count) {
  const svg = [rect(0, 0, W, H, '#1b1d22')];
  const people = [];
  const n = Math.max(count, 1);
  const tiles = n + 1; // plus the player's own tile
  const cols = Math.min(tiles, 3);
  const rows = Math.ceil(tiles / cols);
  const tw = (W - 80 - (cols - 1) * 16) / cols;
  const th = (H - 60 - (rows - 1) * 16) / rows;
  const bgs = ['#3f5a7a', '#6b4f3a', '#3f5a4a', '#5b4b6a'];
  for (let t = 0; t < tiles; t += 1) {
    const x = 40 + (t % cols) * (tw + 16);
    const y = 30 + Math.floor(t / cols) * (th + 16);
    const tile = s('g', { class: t < n ? 'dr-tile' : 'dr-tile is-you', 'data-index': t });
    tile.append(rect(x, y, tw, th, bgs[t % bgs.length], { rx: 10 }));
    tile.append(rect(x + 18, y + 18, tw * 0.3, th * 0.45, '#ffffff', { opacity: 0.08 }));
    if (t < n) {
      const p = person(x + tw / 2, y + th * 0.62, t, Math.min(th / 300, 1));
      tile.append(p);
      people.push(tile);
    } else {
      tile.append(s('text', {
        x: x + tw / 2, y: y + th / 2 + 8, 'text-anchor': 'middle', fill: '#ffffff', opacity: 0.7, 'font-size': 26, 'font-family': 'Georgia, serif',
      }, 'You'));
    }
    tile.append(rect(x, y, tw, th, 'none', {
      rx: 10, class: 'dr-tile-ring', stroke: '#7fd1a8', 'stroke-width': 5,
    }));
    svg.push(tile);
  }
  return { nodes: svg, people };
}

/**
 * Builds the SVG for a room.
 * @param {string} room room type, e.g. "boardroom"
 * @param {number} count number of people in the meeting (1–3)
 * @returns {{ svg: SVGElement, speak: (i: number) => void }}
 */
export default function buildScene(room, count = 1) {
  const n = Math.min(Math.max(count, 1), 3);
  const svg = s('svg', {
    viewBox: `0 0 ${W} ${H}`, class: `dr-scene dr-scene-${room}`, 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid slice',
  });
  let people;
  if (room === 'video') {
    const v = videoCall(n);
    svg.append(...v.nodes);
    people = v.people;
  } else {
    const draw = ROOMS[room] || ROOMS.boardroom;
    const { back, front } = draw();
    people = seats(n).map((x, i) => person(x, 250, i));
    svg.append(...back, ...people, ...front);
  }
  const speak = (i) => people.forEach((p, k) => p.classList.toggle('is-speaking', k === i));
  return { svg, speak };
}
