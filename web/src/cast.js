// cast.js — 纯手绘配角与道具:工程车小队(翻斗车/吊车/搅拌车/推土机)、布鲁伊风小狗、蛋糕、礼物、心愿星
'use strict';

// 车窗脸(大眼+笑)
function _shade(hex, f) { // f>0 亮 f<0 暗
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.max(0, r + f)); g = Math.min(255, Math.max(0, g + f)); b = Math.min(255, Math.max(0, b + f));
  return `rgb(${r},${g},${b})`;
}
function carFace(ctx, w, h, o = {}) {
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.35); ctx.fill();
  const lx = (o.lookX || 0) * w * 0.08;
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(side * w * 0.22 + lx, -h * 0.05, w * 0.14, h * 0.3, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#2a3550';
    ctx.beginPath(); ctx.arc(side * w * 0.22 + lx * 1.4, h * 0.02, w * 0.075, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(side * w * 0.22 + lx * 1.4 - w * 0.02, -h * 0.08, w * 0.025, 0, 6.29); ctx.fill();
  }
  ctx.strokeStyle = '#2a3550'; ctx.lineWidth = w * 0.035; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(lx * 1.2, h * 0.18, w * 0.16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.fillStyle = 'rgba(255,140,160,.5)';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * w * 0.38 + lx, h * 0.22, w * 0.07, h * 0.09, 0, 0, 6.29); ctx.fill(); }
}

// 车轮(会转)
function wheel(ctx, x, y, r, rot) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#2b303e'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#8f9bb3'; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#e8eef7'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 6.29); ctx.fill();
  ctx.rotate(rot);
  ctx.strokeStyle = '#2b303e'; ctx.lineWidth = r * 0.14;
  for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 1.5); ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5); ctx.stroke(); }
  ctx.restore();
}

// 卡车基座(驾驶室+底盘+轮),返回驾驶室中心供画脸;feature 由子类画
function truckBase(ctx, x, y, u, o, cabColor) {
  ctx.save(); ctx.translate(x, y);
  if (o.flip) ctx.scale(-1, 1);
  const sq = o.sq || 0;
  ctx.scale(1 + sq * 0.3, 1 - sq * 0.25);
  if (o.rot) ctx.rotate(o.rot);
  ctx.translate(0, (o.dy || 0) * u);
  ctx.scale(u, u);
  const wr = o.wheel || 0;
  wheel(ctx, -2.6, -1.05, 1.05, wr);
  wheel(ctx, 2.6, -1.05, 1.05, wr);
  const g1 = ctx.createLinearGradient(0, -5, 0, 0);
  g1.addColorStop(0, _shade(cabColor, 42)); g1.addColorStop(.6, cabColor); g1.addColorStop(1, _shade(cabColor, -30));
  ctx.fillStyle = _shade(cabColor, -18);
  ctx.beginPath(); ctx.roundRect(-4.4, -2.0, 8.8, 1.15, 0.5); ctx.fill();   // 底盘
  ctx.fillStyle = g1;
  ctx.beginPath(); ctx.roundRect(-4.3, -5.0, 4.6, 3.4, 0.7); ctx.fill();     // 驾驶室
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 0.1;
  ctx.beginPath(); ctx.roundRect(-4.18, -4.88, 4.36, 3.16, 0.6); ctx.stroke();
  ctx.save(); ctx.translate(-2.0, -3.3); carFace(ctx, 3.4, 2.2, o); ctx.restore();
  if (o.hat) { // 小派对帽
    ctx.save(); ctx.translate(-2.0, -5.0); ctx.rotate(-0.1);
    ctx.fillStyle = o.hatColor || '#ffd93d';
    ctx.beginPath(); ctx.moveTo(-0.55, 0); ctx.lineTo(0.55, 0); ctx.lineTo(0, -1.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(0, -1.38, 0.18, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  return ctx;
}

// 翻斗车(嘟嘟,红)
function dumpTruck(ctx, x, y, u, o = {}) {
  truckBase(ctx, x, y, u, o, '#ff6b5e');
  ctx.fillStyle = (()=>{const g=ctx.createLinearGradient(0,-4.85,0,-1.7);g.addColorStop(0,'#ff8a7e');g.addColorStop(1,'#e5554a');return g})();
  ctx.beginPath(); ctx.roundRect(0.3, -4.6, 4.6, 2.9, 0.5); ctx.fill();
  ctx.strokeStyle = '#c9403a'; ctx.lineWidth = 0.18;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0.3 + i * 1.15, -4.6); ctx.lineTo(0.3 + i * 1.15, -1.7); ctx.stroke(); }
  ctx.fillStyle = '#ffb3ad'; ctx.beginPath(); ctx.roundRect(0.3, -4.85, 4.6, 0.5, 0.25); ctx.fill();
  ctx.restore();
}

// 吊车(高高,黄)—— 吊臂可转,钩子会荡
function craneTruck(ctx, x, y, u, o = {}) {
  truckBase(ctx, x, y, u, o, '#ffc94d');
  const aB = (o.boom ?? 55) * Math.PI / 180;
  ctx.save(); ctx.translate(2.2, -2.2);
  ctx.rotate(-aB);
  ctx.fillStyle = '#f0a830';
  ctx.beginPath(); ctx.roundRect(-0.5, -6.6, 1.0, 6.6, 0.4); ctx.fill();
  ctx.translate(0, -6.6);
  const swing = Math.sin((o.t || 0) * 2.2) * 0.12 + (o.hookSwing || 0);
  ctx.rotate(swing);
  ctx.strokeStyle = '#8a6d3b'; ctx.lineWidth = 0.14;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 2.2 + (o.hookDrop || 0)); ctx.stroke();
  ctx.fillStyle = '#5a4a33';
  ctx.beginPath(); ctx.arc(0, 2.5 + (o.hookDrop || 0), 0.4, 0.6, Math.PI * 1.6); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// 搅拌车(转转,绿)—— 滚筒会转
function mixerTruck(ctx, x, y, u, o = {}) {
  truckBase(ctx, x, y, u, o, '#6bcb77');
  ctx.save(); ctx.translate(2.2, -3.1);
  ctx.fillStyle = '#4da85c';
  ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 2.0, -0.15, 0, 6.29); ctx.fill();
  ctx.save(); ctx.rotate(-0.15); ctx.clip();
  ctx.strokeStyle = '#8fe39a'; ctx.lineWidth = 0.5;
  const dr = (o.drum || 0);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(-2.6, i * 0.9 + (dr % 1.8)); ctx.lineTo(2.6, i * 0.9 + (dr % 1.8) - 1.2); ctx.stroke();
  }
  ctx.restore();
  ctx.restore(); ctx.restore();
}

// 推土机(壮壮,橙,履带)
function bulldozer(ctx, x, y, u, o = {}) {
  ctx.save(); ctx.translate(x, y);
  if (o.flip) ctx.scale(-1, 1);
  const sq = o.sq || 0;
  ctx.scale(1 + sq * 0.3, 1 - sq * 0.25);
  ctx.translate(0, (o.dy || 0) * u); ctx.scale(u, u);
  ctx.fillStyle = '#3b4256';
  ctx.beginPath(); ctx.roundRect(-4.4, -2.4, 8.8, 2.4, 1.1); ctx.fill();
  ctx.fillStyle = '#232838'; ctx.beginPath(); ctx.roundRect(-4.0, -2.1, 8.0, 1.7, 0.85); ctx.fill();
  const wr = o.wheel || 0;
  for (const wx of [-2.6, 0, 2.6]) wheel(ctx, wx, -1.2, 0.85, wr);
  ctx.fillStyle = (()=>{const g=ctx.createLinearGradient(0,-6.2,0,-1.9);g.addColorStop(0,'#ffc27d');g.addColorStop(1,'#ffa94d');return g})();
  ctx.beginPath(); ctx.roundRect(-3.6, -3.3, 7.2, 1.4, 0.5); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-3.3, -6.2, 4.2, 3.3, 0.7); ctx.fill();
  ctx.save(); ctx.translate(-1.2, -4.5); carFace(ctx, 3.2, 2.1, o); ctx.restore();
  if (o.hat) {
    ctx.save(); ctx.translate(-1.2, -6.2);
    ctx.fillStyle = '#6bcb77';
    ctx.beginPath(); ctx.moveTo(-0.55, 0); ctx.lineTo(0.55, 0); ctx.lineTo(0, -1.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.arc(0, -1.38, 0.18, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  // 铲刀
  ctx.strokeStyle = '#e8893c'; ctx.lineWidth = 0.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-3.8, -2.4); ctx.lineTo(-6.2, -2.2); ctx.stroke();
  ctx.fillStyle = '#f0c060';
  ctx.beginPath(); ctx.roundRect(-7.6, -3.6, 1.7, 2.9, 0.4); ctx.fill();
  ctx.restore();
}

// 布鲁伊风小狗(蓝,可挥手/摇尾/换装色)
function puppy(ctx, x, y, u, o = {}) {
  const col = o.col || '#5b9bd5', colDk = o.colDk || '#3556a0', belly = o.belly || '#dff2ff';
  ctx.save(); ctx.translate(x, y);
  if (o.flip) ctx.scale(-1, 1);
  const sq = o.sq || 0;
  ctx.scale(1 + sq * 0.3, 1 - sq * 0.28);
  if (o.rot) ctx.rotate(o.rot);
  ctx.translate(0, (o.dy || 0) * u); ctx.scale(u, u);
  // 尾巴(摇)
  ctx.save(); ctx.translate(1.3, -2.2); ctx.rotate(Math.sin((o.t || 0) * 6) * 0.35 + 0.5);
  ctx.fillStyle = colDk;
  ctx.beginPath(); ctx.ellipse(0.7, -0.2, 0.9, 0.42, 0.5, 0, 6.29); ctx.fill();
  ctx.restore();
  // 腿
  ctx.fillStyle = col;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(side * 0.85 - 0.4, -1.7, 0.8, 1.7, 0.35); ctx.fill(); }
  const bg = ctx.createLinearGradient(0, -4.6, 0, -1.2);
  bg.addColorStop(0, _shade(col, 30)); bg.addColorStop(1, col);
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(-1.75, -4.6, 3.5, 3.4, 1.3); ctx.fill();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(0, -2.9, 1.15, 1.35, 0, 0, 6.29); ctx.fill();
  // 手臂(可摆角)
  for (const side of [-1, 1]) {
    const a = (side < 0 ? (o.aL ?? 0.3) : (o.aR ?? 0.3));
    ctx.save(); ctx.translate(side * 1.65, -4.0); ctx.rotate(side * (0.5 + a));
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-0.32, -0.2, 0.64, 1.9, 0.3); ctx.fill();
    ctx.fillStyle = belly; ctx.beginPath(); ctx.arc(0, 1.75, 0.42, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  // 头
  ctx.save(); ctx.translate(0, -5.7);
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 1.75, 1.7, 0, 0, 6.29); ctx.fill();
  // 耳朵
  ctx.fillStyle = colDk;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * 1.05, -1.35); ctx.rotate(side * -0.18);
    ctx.beginPath(); ctx.moveTo(-0.55, 0.6); ctx.lineTo(0.55, 0.6); ctx.lineTo(0, -1.35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = belly; ctx.beginPath(); ctx.moveTo(-0.28, 0.3); ctx.lineTo(0.28, 0.3); ctx.lineTo(0, -0.8); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = colDk;
  }
  // 吻部+鼻
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(0, 0.65, 1.0, 0.8, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#2a3550'; ctx.beginPath(); ctx.ellipse(0, 0.25, 0.4, 0.3, 0, 0, 6.29); ctx.fill();
  // 眼
  const eyes = o.eyes || 'normal';
  for (const side of [-1, 1]) {
    if (eyes === 'closed' || (eyes === 'wink' && side === 1)) {
      ctx.strokeStyle = '#2a3550'; ctx.lineWidth = 0.14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(side * 0.72, -0.35, 0.4, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(side * 0.72, -0.4, 0.52, 0.62, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#2a3550'; ctx.beginPath(); ctx.arc(side * 0.72, -0.32, 0.3, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(side * 0.72 - 0.1, -0.45, 0.1, 0, 6.29); ctx.fill();
  }
  // 嘴
  ctx.strokeStyle = '#2a3550'; ctx.lineWidth = 0.12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0.75, 0.4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  // 生日帽
  if (o.hat !== false) {
    ctx.save(); ctx.translate(0.3, -1.55); ctx.rotate(0.15);
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath(); ctx.moveTo(-0.6, 0); ctx.lineTo(0.6, 0); ctx.lineTo(0, -1.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.arc(-0.2, -0.5, 0.13, 0, 6.29); ctx.fill(); ctx.beginPath(); ctx.arc(0.18, -0.9, 0.13, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(0, -1.6, 0.22, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

// 生日蛋糕(两根蜡烛,火苗摇曳;blown 时冒烟)
function cake(ctx, x, y, u, o = {}) {
  const t = o.t || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
  ctx.fillStyle = '#e8e0f0'; ctx.beginPath(); ctx.ellipse(0, 0, 4.6, 0.8, 0, 0, 6.29); ctx.fill(); // 盘
  ctx.fillStyle = '#ffe3ef'; ctx.beginPath(); ctx.roundRect(-4, -2.2, 8, 2.2, 0.5); ctx.fill();   // 下层
  ctx.fillStyle = '#fff'; // 奶油边
  ctx.beginPath(); ctx.roundRect(-4, -2.4, 8, 0.7, 0.35); ctx.fill();
  ctx.fillStyle = '#ffd6e6'; ctx.beginPath(); ctx.roundRect(-2.9, -4.0, 5.8, 1.8, 0.5); ctx.fill(); // 上层
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-2.9, -4.2, 5.8, 0.6, 0.3); ctx.fill();
  // 彩糖
  const cols = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = cols[i % 4];
    ctx.beginPath(); ctx.arc(-3.4 + i * 0.75, -1.6 + (i % 2) * 0.5, 0.16, 0, 6.29); ctx.fill();
  }
  for (const cx of [-0.8, 0.8]) { // 蜡烛
    ctx.fillStyle = '#7ec8ff'; ctx.beginPath(); ctx.roundRect(cx - 0.14, -5.3, 0.28, 1.2, 0.1); ctx.fill();
    if (!o.blown) {
      const f = 1 + Math.sin(t * 9 + cx) * 0.18;
      ctx.save(); ctx.translate(cx, -5.5); ctx.scale(f, f);
      ctx.fillStyle = '#ffb020';
      ctx.beginPath(); ctx.ellipse(0, -0.3, 0.22, 0.42, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(0, -0.22, 0.1, 0.2, 0, 0, 6.29); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

// 礼物堆
function gifts(ctx, x, y, u, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
  const boxes = [[-2.2, 0, 2.2, 1.9, '#ff8fab'], [0.3, 0, 1.9, 1.6, '#7ec8ff'], [-0.9, -1.9, 1.6, 1.4, '#ffd93d']];
  for (const [bx, by, bw, bh, c] of boxes) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(bx - bw / 2, by - bh, bw, bh, 0.2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.16;
    ctx.beginPath(); ctx.moveTo(bx, by - bh); ctx.lineTo(bx, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx - bw / 2, by - bh + 0.35); ctx.lineTo(bx + bw / 2, by - bh + 0.35); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bx - 0.2, by - bh - 0.15, 0.2, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 0.2, by - bh - 0.15, 0.2, 0, 6.29); ctx.fill();
  }
  ctx.restore();
}

// 心愿星(发光五角星)
function wishStar(ctx, x, y, r, t) {
  const pulse = 1 + Math.sin(t * 2.4) * 0.1;
  ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse); ctx.rotate(Math.sin(t * 1.2) * 0.1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.6);
  g.addColorStop(0, 'rgba(255,220,120,.55)'); g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g; ctx.fillRect(-r * 2.6, -r * 2.6, r * 5.2, r * 5.2);
  ctx.fillStyle = '#ffd93d';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = -Math.PI / 2 + i * (Math.PI * 2 / 5), a2 = a1 + Math.PI / 5;
    ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// 宝宝小手(提示跟做):圆掌+四指+拇指,微微张合
function babyHand(ctx, x, y, u, o = {}) {
  const t = o.t || 0, open = o.open ?? (0.5 + 0.5 * Math.sin(t * 2.2));
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(u, u);
  if (o.flip) ctx.scale(-1, 1);
  ctx.fillStyle = '#ffd9c0'; ctx.strokeStyle = '#e8b090'; ctx.lineWidth = 0.12;
  ctx.beginPath(); ctx.ellipse(0, 0, 1.15, 1.3, 0, 0, 6.29); ctx.fill(); ctx.stroke(); // 掌
  for (let i = 0; i < 4; i++) { // 指
    const fx = -0.78 + i * 0.52, spread = (i - 1.5) * (0.12 + open * 0.18);
    ctx.save(); ctx.translate(fx, -1.1); ctx.rotate(spread);
    ctx.beginPath(); ctx.roundRect(-0.22, -1.05 - open * 0.25, 0.44, 1.15 + open * 0.25, 0.22); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.save(); ctx.translate(1.05, 0.25); ctx.rotate(0.6 + open * 0.25); // 拇指
  ctx.beginPath(); ctx.roundRect(-0.2, -0.75, 0.42, 0.95, 0.21); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
}
