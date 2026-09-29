// Hotline Miami (jogo de fã) - feito por Davi Gehart, 1F
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 960, H = 600;
const menu = document.getElementById('menu'), fim = document.getElementById('fim'), resumo = document.getElementById('resumo');

// paredes: [x, y, largura, altura]
const walls = [[0,0,W,20],[0,H-20,W,20],[0,0,20,H],[W-20,0,20,H],
  [280,20,20,200],[280,320,20,260],[620,20,20,180],[620,300,20,280],[300,300,140,20],[760,200,120,20]];

let st = 'menu', lvl = 1, score = 0, combo = 0, comboT = 0, ammo = 0, kills = 0, msgT = 0;
let P, enemies = [], bullets = [], blood = [], fx = [], shake = 0, last = 0, cd = 0, mcd = 0;
const keys = {}, mouse = { x: W / 2, y: H / 2, down: false };

function hitWall(x, y, r) {
  return walls.some(([wx, wy, ww, wh]) => {
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

function startLevel() {
  P = { x: 90, y: 300, r: 13, a: 0 };
  enemies = []; bullets = []; blood = []; fx = []; ammo = 12 + lvl * 2; msgT = 0;
  const n = 2 + lvl;
  while (enemies.length < n) {
    const x = 340 + Math.random() * 580, y = 40 + Math.random() * 520;
    if (!hitWall(x, y, 20) && Math.hypot(x - P.x, y - P.y) > 300)
      enemies.push({ x, y, r: 13, a: Math.random() * 6.28, type: Math.random() < 0.55 ? 'gun' : 'bat', cd: 1 + Math.random(), alert: false });
  }
}
function newGame() { lvl = 1; score = 0; combo = 0; kills = 0; startLevel(); st = 'play'; menu.classList.add('oculto'); fim.classList.add('oculto'); }
function die() {
  st = 'dead'; shake = 12;
  resumo.textContent = 'Sala ' + lvl + ' · ' + kills + ' mortes · ' + score + ' pontos';
  fim.classList.remove('oculto');
}
function kill(e) {
  enemies.splice(enemies.indexOf(e), 1); kills++; combo++; comboT = 2.5; score += 100 * combo; shake = 6;
  for (let i = 0; i < 14; i++) blood.push({ x: e.x + (Math.random() - .5) * 40, y: e.y + (Math.random() - .5) * 40, r: 2 + Math.random() * 7 });
}
function shoot(from, ang, spd, mine) {
  bullets.push({ x: from.x + Math.cos(ang) * 18, y: from.y + Math.sin(ang) * 18, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, mine });
}
function melee() {
  if (mcd > 0) return; mcd = 0.4; fx.push({ x: P.x, y: P.y, a: P.a, t: 0.15 });
  for (const e of enemies.slice()) {
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (d < 48 && Math.abs(Math.atan2(Math.sin(Math.atan2(e.y - P.y, e.x - P.x) - P.a), Math.cos(Math.atan2(e.y - P.y, e.x - P.x) - P.a))) < 1.3) kill(e);
  }
}

function update(dt) {
  if (st !== 'play') return;
  cd -= dt; mcd -= dt; comboT -= dt; if (comboT <= 0) combo = 0;
  const dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const l = Math.hypot(dx, dy) || 1; move(P, dx / l * 200 * dt, dy / l * 200 * dt);
  P.a = Math.atan2(mouse.y - P.y, mouse.x - P.x);
  if (mouse.down && cd <= 0 && ammo > 0) { shoot(P, P.a, 720, true); ammo--; cd = 0.22; shake = 3; }

  for (const e of enemies) {
    const d = Math.hypot(P.x - e.x, P.y - e.y);
    if (d < 520 && los(e, P)) e.alert = true;
    if (!e.alert) { e.a += dt * 0.5; continue; }
    e.a = Math.atan2(P.y - e.y, P.x - e.x); e.cd -= dt;
    if (e.type === 'bat') { move(e, Math.cos(e.a) * 115 * dt, Math.sin(e.a) * 115 * dt); if (d < e.r + P.r + 6) return die(); }
    else {
      if (d > 230) move(e, Math.cos(e.a) * 65 * dt, Math.sin(e.a) * 65 * dt);
      if (e.cd <= 0 && los(e, P)) { shoot(e, e.a + (Math.random() - .5) * .18, 360, false); e.cd = 1 + Math.random() * .6; }
    }
  }
  for (const b of bullets.slice()) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    let gone = hitWall(b.x, b.y, 2);
    if (b.mine) { for (const e of enemies) if (!gone && Math.hypot(e.x - b.x, e.y - b.y) < e.r) { kill(e); gone = true; } }
    else if (Math.hypot(P.x - b.x, P.y - b.y) < P.r) return die();
    if (gone) bullets.splice(bullets.indexOf(b), 1);
  }
  fx = fx.filter(f => (f.t -= dt) > 0);
  if (!enemies.length && !msgT) msgT = 1.6;
  if (msgT && (msgT -= dt) <= 0) { lvl++; startLevel(); }
}

function draw() {
  ctx.save();
  if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= 0.85; }
  ctx.fillStyle = '#0d0320'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(25,240,230,.12)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,46,147,.55)';
  for (const b of blood) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.28); ctx.fill(); }
  for (const [x, y, w, h] of walls) { ctx.fillStyle = '#2d0f5c'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#ff2e93'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); }
  if (P) {
    for (const e of enemies) body(e, e.type === 'gun' ? '#19f0e6' : '#ffd23f');
    for (const b of bullets) { ctx.fillStyle = b.mine ? '#fff' : '#ff5a36'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 6.28); ctx.fill(); }
    for (const f of fx) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, 36, f.a - 1.2, f.a + 1.2); ctx.stroke(); }
    if (st !== 'dead') body(P, '#ff2e93');
  }
  ctx.restore();
  // HUD
  ctx.font = 'bold 22px Impact, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffd23f';
  ctx.fillText('PONTOS ' + score, 34, 52);
  ctx.fillStyle = '#19f0e6'; ctx.fillText('SALA ' + lvl + '   MUNIÇÃO ' + ammo, 34, 80);
  if (combo > 1) { ctx.fillStyle = '#ff2e93'; ctx.font = 'bold 34px Impact, sans-serif'; ctx.fillText('COMBO x' + combo, 34, 118); }
  if (msgT > 0) { ctx.textAlign = 'center'; ctx.fillStyle = '#ffd23f'; ctx.font = '56px Impact, sans-serif'; ctx.fillText('SALA LIMPA', W / 2, H / 2); }
}
function body(e, c) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a);
  ctx.fillStyle = '#111'; ctx.fillRect(4, -3, 22, 6);
  ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 6.28); ctx.fill(); ctx.restore();
}

function loop(t) { const dt = Math.min((t - last) / 1000, .05); last = t; update(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === 'enter' && st === 'menu') newGame();
  if (k === 'r' && (st === 'dead' || st === 'play')) newGame();
  if (k === ' ' && st === 'play') { melee(); e.preventDefault(); }
  if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; });
cv.addEventListener('mousedown', e => { if (e.button === 2) melee(); else mouse.down = true; });
addEventListener('mouseup', () => mouse.down = false);
cv.addEventListener('contextmenu', e => e.preventDefault());
document.getElementById('jogar').onclick = newGame;
document.getElementById('again').onclick = newGame;
