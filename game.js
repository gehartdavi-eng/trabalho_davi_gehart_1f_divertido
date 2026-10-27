// Hotline Miami (jogo de fã) - feito por Davi Gehart, 1F
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 960, H = 600, T = 12;           // T = espessura das paredes
const XL = 396, XR = 552;                 // paredes do corredor central
const $ = id => document.getElementById(id);
const menu = $('menu'), masc = $('mascaras'), fim = $('fim'), resumo = $('resumo'), grade = $('grade'), info = $('info');

// ---------- MÁSCARAS (cada uma com um benefício) ----------
const BASE = { speed: 1, fire: 1, ammo: 0, meleeR: 1, meleeCd: 1, shield: 0, sight: 520, comboT: 0, score: 1, dash: false, pierce: 0, refund: 0, revive: false, foe: 1 };
const MASKS = [
  { id: 'galo',      nome: 'Galo',      desc: 'Velocista: anda 25% mais rápido.', fx: { speed: 1.25 } },
  { id: 'coruja',    nome: 'Coruja',    desc: 'Furtiva: os inimigos só te notam bem de perto.', fx: { sight: 330 } },
  { id: 'tigre',     nome: 'Tigre',     desc: 'Fúria: golpe corpo a corpo com mais alcance e quase sem espera.', fx: { meleeR: 1.5, meleeCd: .5 } },
  { id: 'porco',     nome: 'Porco',     desc: 'Colete: aguenta 1 tiro por sala.', fx: { shield: 1 } },
  { id: 'cavalo',    nome: 'Cavalo',    desc: 'Fôlego: +10 de munição no começo de cada sala.', fx: { ammo: 10 } },
  { id: 'coelho',    nome: 'Coelho',    desc: 'Reflexo: aperte Shift para dar um pulo veloz e invulnerável.', fx: { dash: true } },
  { id: 'lobo',      nome: 'Lobo',      desc: 'Caçador: atira 50% mais rápido.', fx: { fire: 1.5 } },
  { id: 'leao',      nome: 'Leão',      desc: 'Rei: o combo dura mais e vale 50% mais pontos.', fx: { comboT: 2, score: 1.5 } },
  { id: 'elefante',  nome: 'Elefante',  desc: 'Presas: suas balas atravessam 1 inimigo.', fx: { pierce: 1 } },
  { id: 'macaco',    nome: 'Macaco',    desc: 'Saqueador: cada morte devolve 1 de munição.', fx: { refund: 1 } },
  { id: 'unicornio', nome: 'Unicórnio', desc: 'Milagre: ressuscita 1 vez por partida.', fx: { revive: true } },
  { id: 'sapo',      nome: 'Sapo',      desc: 'Pântano: inimigos 25% mais lentos.', fx: { foe: .75 } },
];
let sel = 0, S = Object.assign({}, BASE, MASKS[0].fx);

// ---------- ESTADO ----------
let st = 'menu', lvl = 1, score = 0, combo = 0, comboT = 0, ammo = 0, kills = 0, cleared = false, revived = false;
let P, enemies = [], bullets = [], blood = [], corpses = [], pickups = [], popups = [], fx = [];
let shake = 0, last = 0, cd = 0, mcd = 0, dashCd = 0, fade = 0, banner = { txt: '', t: 0 };
let walls = [], furn = [], decor = [], posts = [], rooms = [], keep = [], sol = [], exitR = [0, 0, 0, 0];
const fl = document.createElement('canvas'), tp = document.createElement('canvas'), vig = document.createElement('canvas');
fl.width = tp.width = vig.width = W; fl.height = tp.height = vig.height = H;
const keys = {}, mouse = { x: W / 2, y: H / 2, down: false };

// ---------- UTIL ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ov = (a, b, m = 0) => a[0] < b[0] + b[2] + m && a[0] + a[2] + m > b[0] && a[1] < b[1] + b[3] + m && a[1] + a[3] + m > b[1];
function hitWall(x, y, r) {
  return sol.some(([wx, wy, ww, wh]) => {
    const cx = Math.max(wx, Math.min(x, wx + ww)), cy = Math.max(wy, Math.min(y, wy + wh));
    return (x - cx) ** 2 + (y - cy) ** 2 < r * r;
  });
}
function move(e, dx, dy) {
  if (!hitWall(e.x + dx, e.y, e.r)) e.x += dx;
  if (!hitWall(e.x, e.y + dy, e.r)) e.y += dy;
}
function los(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 12);
  for (let i = 1; i < n; i++) if (hitWall(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, 2)) return false;
  return true;
}
const popup = (x, y, txt, c = '#19f0e6') => popups.push({ x, y, txt, c, t: 1 });

// ---------- GERAÇÃO DO MAPA (muda a cada sala) ----------
function seg(x, y, w, h) { if (w > 0 && h > 0) walls.push([x, y, w, h]); }
function wallV(x, y0, y1, gaps) { let y = y0; for (const [a, b] of gaps) { seg(x, y, T, a - y); posts.push([x + T / 2, a], [x + T / 2, b]); y = b; } seg(x, y, T, y1 - y); }
function wallH(y, x0, x1, gaps) { let x = x0; for (const [a, b] of gaps) { seg(x, y, a - x, T); posts.push([a, y + T / 2], [b, y + T / 2]); x = b; } seg(x, y, x1 - x, T); }

function place(r, w, h, kind, R) {
  for (let i = 0; i < 40; i++) {
    const side = Math.floor(R() * 4), lg = Math.max(w, h), sh = Math.min(w, h);
    const ww = side < 2 ? lg : sh, hh = side < 2 ? sh : lg;
    if (ww > r.w || hh > r.h) continue;
    let x, y;
    if (side < 2) { x = r.x + R() * (r.w - ww); y = side ? r.y + r.h - hh : r.y; }
    else { y = r.y + R() * (r.h - hh); x = side === 2 ? r.x : r.x + r.w - ww; }
    const b = [Math.round(x), Math.round(y), ww, hh];
    if (keep.some(k => ov(b, k)) || furn.some(f => ov(b, [f.x, f.y, f.w, f.h], 8))) continue;
    furn.push({ x: b[0], y: b[1], w: ww, h: hh, kind, c: Math.floor(R() * 3) }); return;
  }
}
function furnish(r, R) {
  const add = (w, h, k) => place(r, w, h, k, R);
  if (r.t === 'red') { add(74, 44, 'bed'); if (R() < .6) add(74, 44, 'bed'); add(26, 26, 'planta'); }
  else if (r.t === 'orange') { add(92, 30, 'banco'); add(52, 32, 'mesa'); if (R() < .5) add(74, 44, 'bed'); }
  else if (r.t === 'kitchen') { add(40, 110 + Math.floor(R() * 3) * 20, 'balcao'); if (R() < .5) add(40, 80, 'balcao'); }
  else if (r.t === 'navy') { add(24, 28, 'vaso'); add(28, 24, 'pia'); if (R() < .4) add(24, 28, 'vaso'); }
  else { add(122, 46, 'banheira'); add(24, 28, 'vaso'); add(28, 24, 'pia'); }
  if (r.t === 'red' || r.t === 'orange') decor.push({ x: r.x + 14 + R() * (r.w - 110), y: r.y + 14 + R() * (r.h - 80), w: 84, h: 52, kind: 'tapete' });
  const n = 2 + Math.floor(R() * 4), cols = ['#f5e6a8', '#ffffff', '#ffd23f', '#d9d9e6'];
  for (let i = 0; i < n; i++) decor.push({ x: r.x + 16 + R() * (r.w - 32), y: r.y + 16 + R() * (r.h - 32), w: 8 + R() * 8, h: 7 + R() * 6, kind: 'lixo', c: cols[Math.floor(R() * 4)] });
}

function buildMap(n) {
  const R = rng(n * 9973 + 4242), D = 78;
  walls = []; furn = []; decor = []; posts = []; rooms = []; keep = [];
  seg(0, 0, W, T); seg(0, H - T, W, T); seg(0, 0, T, H); seg(W - T, 0, T, H);
  const pSplit = Math.min(.18 + n * .07, .6), TIPOS = ['red', 'orange', 'kitchen', 'navy', 'purple'];
  for (const side of [0, 1]) {
    const x0 = side ? XR + T : T, x1 = side ? W - T : XL, hx = side ? XR : XL;
    const dy = T + 170 + Math.floor(R() * 170);
    const ga = T + 24 + R() * (dy - T - D - 48), gb = dy + T + 24 + R() * (H - T - dy - T - D - 48);
    wallV(hx, T, H - T, [[ga, ga + D], [gb, gb + D]]);
    keep.push([hx - 40, ga, T + 80, D], [hx - 40, gb, T + 80, D]);
    const dgap = R() < .55 ? x0 + 30 + R() * (x1 - x0 - D - 60) : -1;
    wallH(dy, x0, x1, dgap > 0 ? [[dgap, dgap + D]] : []);
    if (dgap > 0) keep.push([dgap, dy - 40, D, T + 80]);
    posts.push([x0, dy + T / 2], [x1, dy + T / 2]);
    for (const r of [{ x: x0, y: T, w: x1 - x0, h: dy - T }, { x: x0, y: dy + T, w: x1 - x0, h: H - T - dy - T }]) {
      if (n >= 2 && R() < pSplit) {
        const sx = Math.round(x0 + 150 + R() * (r.w - 300 - T)), a = r.y + 24 + R() * (r.h - D - 48);
        wallV(sx, r.y, r.y + r.h, [[a, a + D]]); keep.push([sx - 40, a, T + 80, D]);
        rooms.push(Object.assign({}, r, { w: sx - r.x }), Object.assign({}, r, { x: sx + T, w: r.x + r.w - sx - T }));
      } else rooms.push(r);
    }
  }
  posts.push([XL + T / 2, T], [XL + T / 2, H - T], [XR + T / 2, T], [XR + T / 2, H - T]);
  for (const r of rooms) { r.t = TIPOS[Math.floor(R() * 5)]; furnish(r, R); }
  // caixas no corredor (a partir da sala 3)
  const hall = { x: XL + T, y: T, w: XR - XL - T, h: H - 2 * T };
  for (let i = 0, c = Math.min(4, Math.floor((n - 1) / 2)); i < c * 12 && furn.filter(f => f.kind === 'caixa').length < c; i++) {
    const b = [Math.round(424 + R() * 96), Math.round(130 + R() * 340), 30, 30];
    if (keep.some(k => ov(b, k)) || furn.some(f => ov(b, [f.x, f.y, f.w, f.h], 44))) continue;
    furn.push({ x: b[0], y: b[1], w: 30, h: 30, kind: 'caixa', c: 0 });
  }
  exitR = n % 2 ? [XL + T, T, hall.w, 56] : [XL + T, H - T - 56, hall.w, 56];
  sol = walls.concat(furn.map(f => [f.x, f.y, f.w, f.h]));
  rooms.hall = hall; paintMap(n);
}

// ---------- TEXTURAS (inspiradas no apartamento da imagem) ----------
function carpet(g, x, y, w, h, c0, c1, c2, R) {
  g.fillStyle = c0; g.fillRect(x, y, w, h);
  for (let i = 0, n = w * h / 12; i < n; i++) { g.fillStyle = R() < .5 ? c1 : c2; g.fillRect(x + Math.floor(R() * w / 2) * 2, y + Math.floor(R() * h / 2) * 2, 2, 2); }
}
function tile(g, x, y, w, h, c0, c1, line, s) {
  g.fillStyle = line; g.fillRect(x, y, w, h);
  for (let j = 0; j * s < h; j++) for (let i = 0; i * s < w; i++) { g.fillStyle = (i + j) % 2 ? c0 : c1; g.fillRect(x + i * s + 1, y + j * s + 1, Math.min(s - 1, w - i * s - 1), Math.min(s - 1, h - j * s - 1)); }
}
function brick(g, x, y, w, h, R) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#4a2a1a'; g.fillRect(x, y, w, h);
  const sh = ['#8f5d3b', '#9a6642', '#84553a', '#a2704a'];
  for (let j = 0, yy = y; yy < y + h; j++, yy += 10) for (let xx = x - (j % 2) * 14; xx < x + w; xx += 28) { g.fillStyle = sh[Math.floor(R() * 4)]; g.fillRect(xx + 1, yy + 1, 26, 8); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(xx + 1, yy + 1, 26, 1); }
  g.restore();
}
function drawF(g, f) {
  const { x, y, w, h } = f, hz = w >= h; g.lineWidth = 2;
  const box = (fill, line) => { g.fillStyle = fill; g.fillRect(x, y, w, h); g.strokeStyle = line; g.strokeRect(x + 1, y + 1, w - 2, h - 2); };
  if (f.kind === 'bed') {
    box('#25b5ba', '#0e6a70');
    g.fillStyle = '#f4f4fa'; hz ? g.fillRect(x + 4, y + 5, 14, h - 10) : g.fillRect(x + 5, y + 4, w - 10, 14);
    g.fillStyle = ['#2f9f5c', '#a59b3a', '#3a4aa8'][f.c]; hz ? g.fillRect(x + 24, y + 4, w - 28, h - 8) : g.fillRect(x + 4, y + 24, w - 8, h - 28);
  } else if (f.kind === 'banco') { box('#2b1a24', '#000'); g.fillStyle = '#6a6a78'; g.fillRect(x + 6, y + 6, w - 12, h - 12); g.fillStyle = '#111'; hz ? g.fillRect(x + 4, y + h / 2 - 3, w - 8, 6) : g.fillRect(x + w / 2 - 3, y + 4, 6, h - 8); }
  else if (f.kind === 'mesa') { box('#7a4a26', '#3d2410'); g.fillStyle = '#9a6234'; g.fillRect(x + 5, y + 5, w - 10, h - 10); }
  else if (f.kind === 'balcao') {
    box('#ececf2', '#7d7d90');
    const L = hz ? w : h;
    for (let i = 4, k = 0; i + 30 <= L; i += 38, k++) {
      const px = hz ? x + i : x + 5, py = hz ? y + 5 : y + i, s = hz ? Math.min(30, h - 10) : Math.min(30, w - 10);
      if (k % 2 === 0) { g.fillStyle = '#2b2b33'; g.fillRect(px, py, s, s); g.fillStyle = '#9a9aaa'; for (const [a, b] of [[.28, .28], [.72, .28], [.28, .72], [.72, .72]]) { g.beginPath(); g.arc(px + s * a, py + s * b, 3, 0, 6.28); g.fill(); } }
      else { g.fillStyle = '#b6bacb'; g.fillRect(px, py, s, s); g.fillStyle = '#7e8398'; g.fillRect(px + 4, py + 4, s - 8, s - 8); }
    }
  } else if (f.kind === 'vaso') { g.fillStyle = '#f2f2f8'; g.fillRect(x, y, w, h); g.strokeStyle = '#7d7d90'; g.strokeRect(x + 1, y + 1, w - 2, h - 2); g.fillStyle = '#cfd3e6'; g.beginPath(); g.ellipse(x + w / 2, y + h / 2 + 2, w / 2 - 4, h / 2 - 5, 0, 0, 6.28); g.fill(); }
  else if (f.kind === 'pia') { box('#f2f2f8', '#7d7d90'); g.fillStyle = '#8fd4e8'; g.beginPath(); g.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 - 4, 0, 6.28); g.fill(); }
  else if (f.kind === 'banheira') { box('#f6f6fb', '#7d7d90'); g.fillStyle = '#c9cde4'; g.fillRect(x + 6, y + 6, w - 12, h - 12); g.fillStyle = '#7e8398'; g.beginPath(); hz ? g.arc(x + 12, y + h / 2, 3, 0, 6.28) : g.arc(x + w / 2, y + 12, 3, 0, 6.28); g.fill(); }
  else if (f.kind === 'planta') { g.fillStyle = '#1f7a2c'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x + w / 2 + Math.cos(i) * 7, y + h / 2 + Math.sin(i) * 7, 8, 0, 6.28); g.fill(); } g.fillStyle = '#35c24a'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 7, 0, 6.28); g.fill(); }
  else if (f.kind === 'caixa') { box('#a8742f', '#5a3a10'); g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + w - 3, y + h - 3); g.moveTo(x + w - 3, y + 3); g.lineTo(x + 3, y + h - 3); g.strokeStyle = '#6b4511'; g.stroke(); }
}
function paintMap(n) {
  const R = rng(n * 31 + 7), g = fl.getContext('2d'), t = tp.getContext('2d');
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H);
  brick(g, 0, 0, W, H, R);                       // corredor de tijolo e soleiras
  for (const r of rooms) {
    if (r.t === 'red') carpet(g, r.x, r.y, r.w, r.h, '#c01339', '#e3305c', '#850f2a', R);
    else if (r.t === 'orange') carpet(g, r.x, r.y, r.w, r.h, '#c8651b', '#e98a30', '#97470f', R);
    else if (r.t === 'kitchen') tile(g, r.x, r.y, r.w, r.h, '#5b1d26', '#66222c', '#2c0b12', 28);
    else if (r.t === 'navy') tile(g, r.x, r.y, r.w, r.h, '#101c58', '#162470', '#0a1038', 16);
    else tile(g, r.x, r.y, r.w, r.h, '#3b1b63', '#47257c', '#1e0c38', 20);
  }
  for (const d of decor) {
    if (d.kind === 'tapete') { g.fillStyle = '#20a9b0'; g.fillRect(d.x, d.y, d.w, d.h); g.strokeStyle = '#0e6a70'; g.lineWidth = 2; g.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2); g.strokeStyle = 'rgba(255,255,255,.35)'; g.strokeRect(d.x + 8, d.y + 8, d.w - 16, d.h - 16); }
    else { g.fillStyle = d.c; g.fillRect(d.x, d.y, d.w, d.h); }
  }
  g.fillStyle = 'rgba(255,240,230,.12)'; g.fillRect(0, 0, W, H);   // clareia o chão
  // sombras + móveis + paredes na camada de cima
  t.clearRect(0, 0, W, H); t.fillStyle = 'rgba(0,0,0,.3)';
  for (const [x, y, w, h] of walls) t.fillRect(x + 4, y + 5, w, h);
  for (const f of furn) t.fillRect(f.x + 4, f.y + 5, f.w, f.h);
  for (const f of furn) drawF(t, f);
  for (const [x, y, w, h] of walls) { t.fillStyle = '#ececf2'; t.fillRect(x, y, w, h); t.strokeStyle = '#6f6f84'; t.lineWidth = 1; t.strokeRect(x + .5, y + .5, w - 1, h - 1); }
  for (const [x, y] of posts) { t.fillStyle = '#fff'; t.fillRect(x - 8, y - 8, 16, 16); t.strokeStyle = '#33333f'; t.lineWidth = 2; t.strokeRect(x - 7, y - 7, 14, 14); }
  const v = vig.getContext('2d'), gr = v.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 720);
  gr.addColorStop(0, 'rgba(10,0,25,0)'); gr.addColorStop(1, 'rgba(10,0,25,.16)'); v.fillStyle = gr; v.fillRect(0, 0, W, H);
}

// ---------- FASES ----------
function reachMap(sx, sy) {   // áreas onde o jogador consegue chegar (inundação em grade)
  const cs = 8, gw = W / cs, gh = H / cs, seen = new Uint8Array(gw * gh), q = [[Math.floor(sx / cs), Math.floor(sy / cs)]];
  seen[q[0][1] * gw + q[0][0]] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + a, ny = y + b;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || seen[ny * gw + nx] || hitWall(nx * cs + cs / 2, ny * cs + cs / 2, 14)) continue;
      seen[ny * gw + nx] = 1; q.push([nx, ny]);
    }
  }
  return (x, y) => seen[Math.floor(y / cs) * gw + Math.floor(x / cs)] === 1;
}
function startLevel() {
  buildMap(lvl);
  const bottom = lvl % 2 === 1;
  P = { x: 480, y: bottom ? H - T - 40 : T + 40, r: 13, a: bottom ? -1.57 : 1.57, shield: S.shield, inv: 0, dash: 0, dx: 0, dy: 0 };
  enemies = []; bullets = []; blood = []; corpses = []; pickups = []; popups = []; fx = []; cleared = false;
  ammo = Math.min(10 + lvl * 2, 30) + S.ammo; dashCd = 0; fade = 1; banner = { txt: 'SALA ' + lvl, t: 1.5 };
  const n = Math.min(2 + lvl + Math.floor(lvl / 3), 15), spots = rooms.slice(), reach = reachMap(P.x, P.y);
  if (lvl >= 2) spots.push(rooms.hall);
  for (let tries = 0; enemies.length < n && tries < 3000; tries++) {
    const r = spots[Math.floor(Math.random() * spots.length)];
    const x = r.x + 20 + Math.random() * (r.w - 40), y = r.y + 20 + Math.random() * (r.h - 40);
    const far = tries < 1500 ? 300 : 180;
    if (hitWall(x, y, 20) || !reach(x, y) || Math.hypot(x - P.x, y - P.y) < far || enemies.some(o => Math.hypot(o.x - x, o.y - y) < 36)) continue;
    const q = Math.random(), type = lvl >= 4 && q < .2 ? 'shot' : q < .6 ? 'gun' : 'bat';
    enemies.push({ x, y, r: 13, a: Math.random() * 6.28, type, cd: 1 + Math.random(), alert: false });
  }
}
function newGame() {
  S = Object.assign({}, BASE, MASKS[sel].fx); lvl = 1; score = 0; combo = 0; kills = 0; revived = false;
  startLevel(); st = 'play';
  [menu, masc, fim].forEach(e => e.classList.add('oculto')); if (document.activeElement) document.activeElement.blur();
}
function showMasks() { st = 'pick'; menu.classList.add('oculto'); fim.classList.add('oculto'); masc.classList.remove('oculto'); mark(); }
function die() {
  st = 'dead'; shake = 12;
  for (let i = 0; i < 18; i++) blood.push({ x: P.x + (Math.random() - .5) * 46, y: P.y + (Math.random() - .5) * 46, r: 2 + Math.random() * 7 });
  resumo.textContent = 'Máscara ' + MASKS[sel].nome + ' · Sala ' + lvl + ' · ' + kills + ' mortes · ' + score + ' pontos';
  fim.classList.remove('oculto');
}
function hit() {
  if (P.inv > 0) return false;
  if (P.shield > 0) { P.shield--; P.inv = 1.3; shake = 10; popup(P.x, P.y - 24, 'COLETE!', '#ff2e93'); return false; }
  if (S.revive && !revived) { revived = true; startLevel(); banner = { txt: 'MILAGRE!', t: 1.8 }; return true; }
  die(); return true;
}
function kill(e) {
  enemies.splice(enemies.indexOf(e), 1); kills++; combo++; comboT = 2.5 + S.comboT; shake = 6;
  const pts = Math.round(100 * combo * S.score); score += pts; popup(e.x, e.y - 14, '+' + pts + ' PTS');
  if (S.refund) ammo += S.refund;
  if (e.type !== 'bat') pickups.push({ x: e.x, y: e.y, n: 4 });
  corpses.push({ x: e.x, y: e.y, a: e.a, type: e.type });
  for (let i = 0; i < 14; i++) blood.push({ x: e.x + (Math.random() - .5) * 40, y: e.y + (Math.random() - .5) * 40, r: 2 + Math.random() * 7 });
}
function shoot(from, ang, spd, mine) {
  bullets.push({ x: from.x + Math.cos(ang) * 18, y: from.y + Math.sin(ang) * 18, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, mine, p: mine ? S.pierce : 0 });
}
function melee() {
  if (mcd > 0) return; mcd = 0.4 * S.meleeCd; fx.push({ x: P.x, y: P.y, a: P.a, t: 0.15, R: 36 * S.meleeR });
  for (const e of enemies.slice()) {
    const d = Math.hypot(e.x - P.x, e.y - P.y), ang = Math.atan2(e.y - P.y, e.x - P.x);
    if (d < 48 * S.meleeR && Math.abs(Math.atan2(Math.sin(ang - P.a), Math.cos(ang - P.a))) < 1.3) kill(e);
  }
}
function tryDash() {
  if (!S.dash || dashCd > 0 || st !== 'play') return;
  let dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (!dx && !dy) { dx = Math.cos(P.a); dy = Math.sin(P.a); }
  const l = Math.hypot(dx, dy); P.dx = dx / l; P.dy = dy / l; P.dash = 0.16; P.inv = Math.max(P.inv, 0.22); dashCd = 1.6;
}

// ---------- ATUALIZAÇÃO ----------
function update(dt) {
  if (st !== 'play') return;
  cd -= dt; mcd -= dt; comboT -= dt; dashCd -= dt; P.inv -= dt; banner.t -= dt; fade = Math.max(0, fade - dt * 2.2);
  if (comboT <= 0) combo = 0;
  const dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (P.dash > 0) { P.dash -= dt; move(P, P.dx * 640 * dt, P.dy * 640 * dt); }
  else { const l = Math.hypot(dx, dy) || 1, v = 200 * S.speed; move(P, dx / l * v * dt, dy / l * v * dt); }
  P.a = Math.atan2(mouse.y - P.y, mouse.x - P.x);
  if (mouse.down && cd <= 0 && ammo > 0) {
    shoot(P, P.a, 720, true); ammo--; cd = 0.22 / S.fire; shake = 3;
    for (const e of enemies) if (!e.alert && Math.hypot(e.x - P.x, e.y - P.y) < 280) e.alert = true;   // barulho do tiro
  }
  for (const p of pickups.slice()) if (Math.hypot(p.x - P.x, p.y - P.y) < 22) { ammo += p.n; popup(p.x, p.y - 10, '+' + p.n + ' MUNIÇÃO', '#ffd23f'); pickups.splice(pickups.indexOf(p), 1); }

  const lv = 1 + Math.min(lvl, 15) * 0.02;
  for (const e of enemies) {
    const d = Math.hypot(P.x - e.x, P.y - e.y);
    if (!e.alert) { if (d < S.sight && los(e, P)) e.alert = true; else { e.a += dt * 0.5; continue; } }
    e.a = Math.atan2(P.y - e.y, P.x - e.x); e.cd -= dt;
    const k = S.foe * lv;
    if (e.type === 'bat') { move(e, Math.cos(e.a) * 115 * k * dt, Math.sin(e.a) * 115 * k * dt); if (d < e.r + P.r + 6 && hit()) return; }
    else {
      if (d > 230) move(e, Math.cos(e.a) * (e.type === 'shot' ? 55 : 65) * k * dt, Math.sin(e.a) * (e.type === 'shot' ? 55 : 65) * k * dt);
      if (e.cd <= 0 && los(e, P)) {
        if (e.type === 'shot') for (const o of [-.25, 0, .25]) shoot(e, e.a + o + (Math.random() - .5) * .08, 330, false);
        else shoot(e, e.a + (Math.random() - .5) * .18, 360, false);
        e.cd = (e.type === 'shot' ? 1.7 : Math.max(.6, 1 - lvl * .02)) + Math.random() * .6;
      }
    }
  }
  for (const b of bullets.slice()) {
    const steps = Math.ceil(Math.hypot(b.vx, b.vy) * dt / 6); let gone = false;
    for (let s = 0; s < steps && !gone; s++) {
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
      if (hitWall(b.x, b.y, 2)) { gone = true; break; }
      if (b.mine) { for (const e of enemies.slice()) if (!gone && Math.hypot(e.x - b.x, e.y - b.y) < e.r) { kill(e); if (b.p > 0) b.p--; else gone = true; } }
      else if (Math.hypot(P.x - b.x, P.y - b.y) < P.r) { gone = true; bullets.splice(bullets.indexOf(b), 1); if (hit()) return; }
    }
    if (gone && bullets.includes(b)) bullets.splice(bullets.indexOf(b), 1);
  }
  fx = fx.filter(f => (f.t -= dt) > 0);
  for (const p of popups) { p.t -= dt; p.y -= 34 * dt; } popups = popups.filter(p => p.t > 0);
  if (!enemies.length && !cleared) { cleared = true; score += 200 + 50 * lvl; popup(P.x, P.y - 30, 'BÔNUS +' + (200 + 50 * lvl), '#ffd23f'); }
  if (cleared && P.x > exitR[0] && P.x < exitR[0] + exitR[2] && P.y > exitR[1] && P.y < exitR[1] + exitR[3]) { lvl++; startLevel(); }
}

// ---------- DESENHO ----------
function tx(s, x, y, c, font, al = 'left') { ctx.font = font; ctx.textAlign = al; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b0218'; ctx.strokeText(s, x, y); ctx.fillStyle = c; ctx.fillText(s, x, y); }
function body(e, c, mask) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a);
  ctx.fillStyle = '#111'; ctx.fillRect(4, -3, 22, 6);
  ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 14, 0, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#16101f'; ctx.fillRect(1, -14, 5, 3); ctx.fillRect(1, 11, 5, 3);
  if (mask && mask.img.complete && mask.img.naturalWidth) {
    ctx.save(); ctx.rotate(1.57); ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.28); ctx.clip(); ctx.drawImage(mask.img, -15, -15, 30, 30); ctx.restore();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.28); ctx.stroke();
  } else { ctx.fillStyle = '#e7b98f'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 6.28); ctx.fill(); ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(-2, 0, 7, 1.6, 4.7); ctx.fill(); }
  ctx.restore();
}
const COR = { gun: '#19f0e6', bat: '#ffd23f', shot: '#ff7a1a' };
function draw() {
  ctx.save();
  if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= 0.85; if (shake < .2) shake = 0; }
  ctx.fillStyle = '#0d0320'; ctx.fillRect(-20, -20, W + 40, H + 40);
  if (P) {
    ctx.drawImage(fl, 0, 0);
    // saída
    const [ex, ey, ew, eh] = exitR, pulse = .5 + .5 * Math.sin(performance.now() / 180);
    ctx.save(); ctx.beginPath(); ctx.rect(ex, ey, ew, eh); ctx.clip();
    ctx.fillStyle = cleared ? 'rgba(25,240,230,' + (.25 + .25 * pulse) + ')' : 'rgba(255,46,147,.22)'; ctx.fillRect(ex, ey, ew, eh);
    ctx.strokeStyle = cleared ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.35)'; ctx.lineWidth = 8;
    for (let i = -eh; i < ew + eh; i += 24) { ctx.beginPath(); ctx.moveTo(ex + i, ey + eh); ctx.lineTo(ex + i + eh, ey); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = cleared ? '#19f0e6' : '#ff2e93'; ctx.lineWidth = 3; ctx.strokeRect(ex + 1, ey + 1, ew - 2, eh - 2);
    tx(cleared ? (exitR[1] < 100 ? '▲ PRÓXIMA SALA ▲' : '▼ PRÓXIMA SALA ▼') : 'TRANCADA', ex + ew / 2, ey + eh / 2 + 7, cleared ? '#fff' : '#ff9ac8', '19px Impact, sans-serif', 'center');
    ctx.fillStyle = 'rgba(255,46,147,.55)';
    for (const b of blood) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.28); ctx.fill(); }
    for (const c of corpses) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = COR[c.type]; ctx.globalAlpha = .55; ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, 6.28); ctx.fill(); ctx.restore(); }
    for (const p of pickups) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(p.x - 7, p.y - 5, 14, 10); ctx.fillStyle = '#111'; ctx.fillRect(p.x - 4, p.y - 2, 8, 4); }
    for (const e of enemies) body(e, COR[e.type], null);
    for (const b of bullets) { ctx.fillStyle = b.mine ? '#fff' : '#ff5a36'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 6.28); ctx.fill(); }
    for (const f of fx) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.R, f.a - 1.2, f.a + 1.2); ctx.stroke(); }
    if (st !== 'dead' && !(P.inv > 0 && Math.floor(P.inv * 20) % 2)) body(P, '#ff2e93', MASKS[sel]);
    ctx.drawImage(tp, 0, 0);
    ctx.drawImage(vig, 0, 0);
    for (const p of popups) { ctx.globalAlpha = Math.min(1, p.t * 2); tx(p.txt, p.x, p.y, p.c, 'bold 20px Impact, sans-serif', 'center'); ctx.globalAlpha = 1; }
  }
  ctx.restore();
  // HUD
  tx('PONTOS ' + score, 34, 52, '#ffd23f', 'bold 22px Impact, sans-serif');
  tx('SALA ' + lvl + '   MUNIÇÃO ' + ammo, 34, 80, '#19f0e6', 'bold 22px Impact, sans-serif');
  if (combo > 1) tx('COMBO x' + combo, 34, 118, '#ff2e93', 'bold 34px Impact, sans-serif');
  if (P) {
    const m = MASKS[sel];
    if (m.img && m.img.complete) { ctx.drawImage(m.img, W - 82, 26, 56, 56); ctx.strokeStyle = '#19f0e6'; ctx.lineWidth = 3; ctx.strokeRect(W - 82, 26, 56, 56); }
    tx(m.nome.toUpperCase(), W - 54, 102, '#fff', '16px Impact, sans-serif', 'center');
    if (S.shield) tx(P.shield > 0 ? 'COLETE ●' : 'COLETE ○', W - 54, 124, P.shield > 0 ? '#ff2e93' : '#777', '16px Impact, sans-serif', 'center');
    if (S.dash) tx(dashCd > 0 ? 'PULO ' + dashCd.toFixed(1) : 'PULO [SHIFT]', W - 54, 124, dashCd > 0 ? '#777' : '#19f0e6', '16px Impact, sans-serif', 'center');
    if (S.revive) tx(revived ? 'MILAGRE ○' : 'MILAGRE ●', W - 54, 124, revived ? '#777' : '#ffd23f', '16px Impact, sans-serif', 'center');
  }
  if (cleared && st === 'play') tx('SALA LIMPA!  VÁ ATÉ A SAÍDA ' + (exitR[1] < 100 ? '▲' : '▼'), W / 2, exitR[1] < 100 ? 112 : H - 100, '#ffd23f', '38px Impact, sans-serif', 'center');
  if (banner.t > 0 && st === 'play') { ctx.globalAlpha = Math.min(1, banner.t * 1.5); tx(banner.txt, W / 2, H / 2 + 20, '#ff2e93', '72px Impact, sans-serif', 'center'); ctx.globalAlpha = 1; }
  if (fade > 0) { ctx.fillStyle = 'rgba(8,0,20,' + fade + ')'; ctx.fillRect(0, 0, W, H); }
}

function loop(t) { const dt = Math.min((t - last) / 1000, .05); last = t; update(dt); draw(); requestAnimationFrame(loop); }

// ---------- MENU DE MÁSCARAS ----------
function mark() { [...grade.children].forEach((b, i) => b.classList.toggle('sel', i === sel)); preview(sel); }
function preview(i) { info.innerHTML = '<b>' + MASKS[i].nome + '</b><span>' + MASKS[i].desc + '</span>'; }
MASKS.forEach((m, i) => {
  m.img = new Image(); m.img.src = 'assets/' + m.id + '.png';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'm';
  b.innerHTML = '<img src="assets/' + m.id + '.png" alt="" width="128" height="128"><span>' + m.nome + '</span>';
  b.onclick = () => { sel = i; mark(); }; b.onmouseenter = b.onfocus = () => preview(i);
  grade.appendChild(b);
});
grade.onmouseleave = () => preview(sel);

// ---------- ENTRADAS ----------
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === 'enter') { if (st === 'menu') { showMasks(); e.preventDefault(); } else if (st === 'pick') { newGame(); e.preventDefault(); } }
  if (k === 'r' && (st === 'dead' || st === 'play')) newGame();
  if (st === 'pick' && k.startsWith('arrow')) { sel = (sel + { arrowleft: -1, arrowright: 1, arrowup: -6, arrowdown: 6 }[k] + MASKS.length) % MASKS.length; mark(); }
  if (k === ' ' && st === 'play') { melee(); e.preventDefault(); }
  if (k === 'shift') tryDash();
  if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; });
cv.addEventListener('mousedown', e => { if (e.button === 2) melee(); else mouse.down = true; });
addEventListener('mouseup', () => mouse.down = false);
cv.addEventListener('contextmenu', e => e.preventDefault());
$('jogar').onclick = showMasks;
$('comecar').onclick = newGame;
$('again').onclick = newGame;
$('trocar').onclick = showMasks;

startLevel(); fade = 0; banner.t = 0;   // mapa de fundo atrás do menu
requestAnimationFrame(loop);
