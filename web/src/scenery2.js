// scenery2.js — v7 分层视差派对场景(远山中景前景五层 + 氛围光)
'use strict';

// ---- 天空(含太阳+光芒+高层云) f≈0.1 ----
function skyLayer2(ctx, t) {
  const g = ctx.createLinearGradient(0, -H * 0.2, 0, H * 1.2);
  g.addColorStop(0, '#3d9be9'); g.addColorStop(0.45, '#7ec8f5');
  g.addColorStop(0.8, '#c8ecff'); g.addColorStop(1, '#eaf9ff');
  ctx.fillStyle = g; ctx.fillRect(-W * 0.2, -H * 0.2, W * 1.4, H * 1.4);
  // 太阳 + 慢转光芒
  const sx = W * 0.85, sy = H * 0.15;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 200);
  sg.addColorStop(0, 'rgba(255,243,176,.95)'); sg.addColorStop(0.35, 'rgba(255,243,176,.45)');
  sg.addColorStop(1, 'rgba(255,243,176,0)');
  ctx.fillStyle = sg; ctx.fillRect(sx - 200, sy - 200, 400, 400);
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.03);
  ctx.fillStyle = 'rgba(255,238,160,.5)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath(); ctx.moveTo(-7, -72); ctx.lineTo(7, -72); ctx.lineTo(0, -108); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(sx, sy, 52, 0, 6.29); ctx.fill();
}

// 软云:底层淡蓝影 + 上层白(比单层圆更有体积)
function cloud2(ctx, x, y, s, a = 0.92) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const blobs = [[0, 0, 40], [36, 6, 31], [-38, 8, 30], [8, -17, 27], [-8, -10, 30]];
  ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#bfe0f5';
  for (const [cx, cy, r] of blobs) { ctx.beginPath(); ctx.arc(cx, cy + 7, r, 0, 6.29); ctx.fill(); }
  ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
  for (const [cx, cy, r] of blobs) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill(); }
  ctx.restore();
}
function cloudLayer2(ctx, t) {
  cloud2(ctx, W * 0.16 + Math.sin(t * 0.07) * 26 + t * 2.2 % (W * 1.3) - W * 0.15, H * 0.13, 1.25, 0.95);
  cloud2(ctx, W * 0.55 - (t * 1.5 % (W * 1.2)), H * 0.08, 0.85, 0.9);
  cloud2(ctx, W * 0.38 + Math.sin(t * 0.09 + 2) * 30, H * 0.24, 0.6, 0.8);
}

// ---- 远山(f≈0.35):两重山脊 + 远处小树小树屋 ----
function farHills2(ctx) {
  ctx.fillStyle = '#b9dcb0';
  ctx.beginPath(); ctx.moveTo(-W * 0.2, H * 0.62);
  ctx.quadraticCurveTo(W * 0.12, H * 0.47, W * 0.34, H * 0.58);
  ctx.quadraticCurveTo(W * 0.5, H * 0.66, W * 0.66, H * 0.56);
  ctx.quadraticCurveTo(W * 0.86, H * 0.45, W * 1.2, H * 0.6);
  ctx.lineTo(W * 1.2, H); ctx.lineTo(-W * 0.2, H); ctx.closePath(); ctx.fill();
  // 远处小树(剪影感)
  ctx.fillStyle = '#93c98b';
  const rnd = mulberry32(77);
  for (let i = 0; i < 14; i++) {
    const x = -W * 0.1 + rnd() * W * 1.2, y = H * (0.565 + rnd() * 0.035), s = 0.5 + rnd() * 0.5;
    ctx.beginPath(); ctx.arc(x, y - 26 * s, 16 * s, 0, 6.29); ctx.fill();
    ctx.fillRect(x - 2.5 * s, y - 26 * s, 5 * s, 26 * s);
  }
  ctx.fillStyle = '#a5d977';
  ctx.beginPath(); ctx.moveTo(-W * 0.2, H * 0.66);
  ctx.quadraticCurveTo(W * 0.3, H * 0.57, W * 0.62, H * 0.645);
  ctx.quadraticCurveTo(W * 0.85, H * 0.7, W * 1.2, H * 0.63);
  ctx.lineTo(W * 1.2, H); ctx.lineTo(-W * 0.2, H); ctx.closePath(); ctx.fill();
}

// ---- 中景(f≈0.7):树/灌木丛 ----
function tree2(ctx, x, y, s, t, ph = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(t * 0.7 + ph) * 0.012);
  // 树干(微锥形)
  ctx.fillStyle = '#8a6d4b';
  ctx.beginPath(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(-8, -34, -6, -58);
  ctx.lineTo(6, -58); ctx.quadraticCurveTo(8, -34, 11, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,35,.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(-3, -30, -2, -50); ctx.stroke();
  // 树冠三层:暗底/主色/高光
  const canopy = [[0, -102, 54], [-40, -76, 38], [40, -76, 38], [0, -68, 46]];
  ctx.fillStyle = '#57a34f';
  for (const [cx, cy, r] of canopy) { ctx.beginPath(); ctx.arc(cx + 3, cy + 7, r, 0, 6.29); ctx.fill(); }
  ctx.fillStyle = '#6fbf5e';
  for (const [cx, cy, r] of canopy) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill(); }
  ctx.fillStyle = '#8fd47c';
  for (const [cx, cy, r] of [[-16, -116, 22], [22, -94, 16], [-38, -86, 13]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill(); }
  ctx.restore();
}
function bush2(ctx, x, y, s, c = '#6fbf5e') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#57a34f';
  for (const [cx, cy, r] of [[0, -18, 24], [-22, -10, 17], [22, -10, 17]]) { ctx.beginPath(); ctx.arc(cx + 2, cy + 3, r, 0, 6.29); ctx.fill(); }
  ctx.fillStyle = c;
  for (const [cx, cy, r] of [[0, -18, 24], [-22, -10, 17], [22, -10, 17]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill(); }
  ctx.fillStyle = '#8fd47c';
  for (const [cx, cy, r] of [[-8, -26, 8], [12, -20, 6]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill(); }
  ctx.restore();
}
function midLayer2(ctx, t) {
  tree2(ctx, W * 0.055, H * 0.68, 1.7, t, 0);
  tree2(ctx, W * 0.955, H * 0.66, 1.45, t, 2.1);
  tree2(ctx, W * 0.82, H * 0.62, 0.9, t, 4.2);
  bush2(ctx, W * 0.14, H * 0.68, 1.1);
  bush2(ctx, W * 0.9, H * 0.69, 0.9, '#79c86a');
}

// ---- 地面层(f=1):草地+土场+花草 ----
function flower2(ctx, x, y, s, c, t, ph) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.3 + ph) * 0.08);
  ctx.strokeStyle = '#4e9147'; ctx.lineWidth = 2.4 * s;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(2 * s, -10 * s, 0, -20 * s); ctx.stroke();
  ctx.translate(0, -22 * s);
  ctx.fillStyle = c;
  for (let i = 0; i < 5; i++) {
    ctx.save(); ctx.rotate(i * Math.PI * 2 / 5);
    ctx.beginPath(); ctx.ellipse(0, -5.5 * s, 3.4 * s, 5.5 * s, 0, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.arc(0, 0, 3.2 * s, 0, 6.29); ctx.fill();
  ctx.restore();
}
function grassTuft2(ctx, x, y, s, t, ph, c = '#5da854') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.5 + ph) * 0.06);
  ctx.strokeStyle = c; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
  for (const [dx, bend] of [[-6, -0.3], [0, 0], [6, 0.3]]) {
    ctx.beginPath(); ctx.moveTo(dx * s, 0);
    ctx.quadraticCurveTo((dx + bend * 10) * s, -12 * s, (dx + bend * 18) * s, -22 * s);
    ctx.stroke();
  }
  ctx.restore();
}
function groundLayer2(ctx, t, o = {}) {
  const g = ctx.createLinearGradient(0, H * 0.6, 0, H * 1.15);
  g.addColorStop(0, '#9fd86f'); g.addColorStop(0.55, '#7abb57'); g.addColorStop(1, '#5f9c46');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-W * 0.2, H * 0.66);
  ctx.quadraticCurveTo(W * 0.25, H * 0.615, W * 0.5, H * 0.65);
  ctx.quadraticCurveTo(W * 0.75, H * 0.69, W * 1.2, H * 0.645);
  ctx.lineTo(W * 1.2, H * 1.2); ctx.lineTo(-W * 0.2, H * 1.2); ctx.closePath(); ctx.fill();
  // 草地高光带(受光感)
  ctx.fillStyle = 'rgba(255,255,220,.12)';
  ctx.beginPath(); ctx.ellipse(W * 0.68, H * 0.75, W * 0.34, H * 0.075, -0.05, 0, 6.29); ctx.fill();
  // 土场(带描边和颗粒)
  ctx.fillStyle = '#d9b28c';
  ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.88, W * 0.34, H * 0.1, 0, 0, 6.29); ctx.fill();
  ctx.strokeStyle = 'rgba(160,120,80,.55)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.88, W * 0.34, H * 0.1, 0, 0, 6.29); ctx.stroke();
  ctx.fillStyle = 'rgba(160,120,80,.4)';
  const rnd = mulberry32(53);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * 6.28, rr = Math.sqrt(rnd());
    ctx.beginPath(); ctx.arc(W * 0.5 + Math.cos(a) * rr * W * 0.31, H * 0.88 + Math.sin(a) * rr * H * 0.085, 2 + rnd() * 2.4, 0, 6.29); ctx.fill();
  }
  // 中景花草
  const rnd2 = mulberry32(42);
  for (let i = 0; i < 30; i++) {
    const fx = rnd2() * W, fy = H * (0.7 + rnd2() * 0.26);
    if (Math.abs(fx - W * 0.5) < W * 0.36 && fy > H * 0.76) continue;
    if (rnd2() < 0.5) grassTuft2(ctx, fx, fy, 0.35 + rnd2() * 0.4, t, i * 1.7);
    else flower2(ctx, fx, fy, 0.6 + rnd2() * 0.5, ['#fff', '#ffd93d', '#ff9ff3', '#ffa94d'][(rnd2() * 4) | 0], t, i);
  }
  if (o.dirt !== false) dirtPile(ctx, W * 0.18, H * 0.9, 220);
  coneAt(ctx, W * 0.06, H * 0.93, 1); coneAt(ctx, W * 0.94, H * 0.91, 0.9);
}

// ---- 前景(f≈1.35):角落长草+大花,故意遮挡画面下缘制造纵深 ----
function fgBlade(ctx, x, y, len, bend, w, c, t, ph) {
  const sway = Math.sin(t * 1.1 + ph) * 0.08 + 0.04;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.quadraticCurveTo(-w * 0.6 + (bend + sway) * len * 0.5, -len * 0.55, (bend + sway) * len, -len);
  ctx.quadraticCurveTo(w * 0.6 + (bend + sway) * len * 0.5, -len * 0.55, w, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
function foreground2(ctx, t) {
  // 左下草丛
  const L = [['#4e9147', 0.02, 300], ['#5da854', 0.05, 360], ['#57a34f', 0.09, 280], ['#4e9147', 0.13, 330], ['#67b65e', 0.17, 250]];
  L.forEach(([c, fx, len], i) => fgBlade(ctx, W * fx, H * 1.02, len, -0.12 + i * 0.06, 26, c, t, i * 1.3));
  const R = [['#4e9147', 0.86, 320], ['#5da854', 0.9, 380], ['#57a34f', 0.94, 290], ['#67b65e', 0.98, 340]];
  R.forEach(([c, fx, len], i) => fgBlade(ctx, W * fx, H * 1.02, len, 0.1 - i * 0.05, 26, c, t, i * 1.1 + 3));
  // 前景大花(左下/右下)
  flower2(ctx, W * 0.045, H * 1.0, 2.6, '#ff9ff3', t, 0.5);
  flower2(ctx, W * 0.12, H * 1.02, 2.1, '#fff', t, 1.7);
  flower2(ctx, W * 0.93, H * 1.01, 2.4, '#ffd93d', t, 2.9);
}

// ---- 蝴蝶(气氛点缀,贝塞尔漂移) ----
function butterfly2(ctx, t, seed = 5, color = '#ff9ff3') {
  const rnd = mulberry32(seed);
  const cx = W * (0.2 + rnd() * 0.6), cy = H * (0.35 + rnd() * 0.3);
  const x = cx + Math.sin(t * 0.31 + seed) * W * 0.13 + Math.sin(t * 1.7) * 8;
  const y = cy + Math.sin(t * 0.53 + seed * 2) * H * 0.07 + Math.cos(t * 2.3) * 5;
  const flap = Math.abs(Math.sin(t * 9 + seed));
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.9) * 0.25); ctx.scale(0.55, 0.55);
  ctx.fillStyle = color;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.scale(s * (0.25 + flap * 0.75), 1);
    ctx.beginPath(); ctx.ellipse(7, -3, 8, 6, -0.4, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, 4, 6, 4.5, 0.4, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#5a4a33'; ctx.beginPath(); ctx.ellipse(0, 0, 1.6, 5, 0, 0, 6.29); ctx.fill();
  ctx.restore();
}

// ---- 灰尘光尘(空气感) ----
function dustMotes2(ctx, t, seed = 31) {
  const rnd = mulberry32(seed);
  ctx.save(); ctx.fillStyle = '#fff8e0';
  for (let i = 0; i < 18; i++) {
    const bx = rnd() * W, by = rnd() * H;
    const x = bx + Math.sin(t * 0.2 + i * 1.3) * 30, y = by - (t * (4 + rnd() * 5)) % (H * 0.9);
    ctx.globalAlpha = 0.1 + 0.1 * Math.sin(t * 0.8 + i * 2.2);
    ctx.beginPath(); ctx.arc(x, y < 0 ? y + H * 0.9 : y, 1.5 + rnd() * 2, 0, 6.29); ctx.fill();
  }
  ctx.restore();
}

// ---- 总装:五层视差派对场景 ----
function partySceneV7(ctx, t, cam, o = {}) {
  ctx.save(); camApply(ctx, cam, 0.1); skyLayer2(ctx, t); ctx.restore();
  ctx.save(); camApply(ctx, cam, 0.25); cloudLayer2(ctx, t); ctx.restore();
  ctx.save(); camApply(ctx, cam, 0.4); farHills2(ctx); ctx.restore();
  ctx.save(); camApply(ctx, cam, 0.7); midLayer2(ctx, t); ctx.restore();
  ctx.save(); camApply(ctx, cam, 1); // 主世界层
  groundLayer2(ctx, t, o);
  bunting(ctx, W * 0.04, H * 0.07, W * 0.5, H * 0.045, t);
  bunting(ctx, W * 0.5, H * 0.045, W * 0.96, H * 0.07, t + 1.3);
  balloon(ctx, W * 0.075, H * 0.3, '#ff6b6b', t, 0);
  balloon(ctx, W * 0.11, H * 0.26, '#ffd93d', t, 1.4);
  balloon(ctx, W * 0.93, H * 0.28, '#4d96ff', t, 2.2);
  balloon(ctx, W * 0.895, H * 0.24, '#ff9ff3', t, 3.1);
  if (o.sign) woodSign(ctx, W * 0.5, H * 0.1, 560, o.sign, t);
  if (o.world) o.world(ctx, t); // 角色/道具回调
  ctx.restore();
  dustMotes2(ctx, t);
  butterfly2(ctx, t, 5);
  ctx.save(); camApply(ctx, cam, 1.35); foreground2(ctx, t); ctx.restore();
  warmWash(ctx); vignette(ctx);
}
