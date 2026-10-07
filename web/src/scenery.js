// scenery.js — 纯手绘派对场景(白天/黄昏/夜晚),彩旗/气球/木牌/土堆/树
'use strict';

function skyGrad(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function cloud(ctx, x, y, s, a = .9) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = a; ctx.fillStyle = '#fff';
  for (const [cx, cy, r] of [[0, 0, 38], [34, 6, 30], [-36, 8, 28], [8, -16, 26]])
    { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill(); }
  ctx.restore();
}
function sun(ctx, x, y, r, c = '#fff3b0') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  g.addColorStop(0, c); g.addColorStop(.45, c + 'cc'); g.addColorStop(1, c + '00');
  ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
}
function tree(ctx, x, y, s, leaf = '#6fbf5e') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#8a6d4b'; ctx.beginPath(); ctx.roundRect(-9, -60, 18, 60, 8); ctx.fill();
  ctx.fillStyle = leaf;
  for (const [cx, cy, r] of [[0, -95, 52], [-38, -70, 36], [38, -70, 36]])
    { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill(); }
  ctx.restore();
}
function coneAt(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ff7f50';
  ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(24, 0); ctx.lineTo(10, -52); ctx.lineTo(-10, -52); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(-15.5, -34, 31, 10);
  ctx.fillStyle = '#ff7f50'; ctx.beginPath(); ctx.roundRect(-30, -4, 60, 8, 4); ctx.fill();
  ctx.restore();
}
function dirtPile(ctx, x, y, w) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#b9855a';
  ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.quadraticCurveTo(0, -w * 0.42, w / 2, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a06b42';
  for (const [px, py, r] of [[-w * .2, -w * .1, 6], [w * .15, -w * .18, 5], [0, -w * .06, 4]])
    { ctx.beginPath(); ctx.arc(px, py, r, 0, 6.29); ctx.fill(); }
  ctx.restore();
}

// 彩旗串(随风摇摆)
function bunting(ctx, x0, y0, x1, y1, t, sag = 60) {
  const cols = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9ff3', '#ffa94d'];
  ctx.strokeStyle = 'rgba(90,70,60,.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); ctx.stroke();
  const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 90);
  for (let i = 1; i < n; i++) {
    const p = i / n, cx = lerp(x0, x1, p);
    const cy = (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (Math.max(y0, y1) + sag) + p * p * y1;
    const sway = Math.sin(t * 1.8 + i * 1.1) * 0.16;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(sway);
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.lineTo(0, 34); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// 气球束(浮动)
function balloon(ctx, x, y, color, t, ph = 0) {
  const fx = x + Math.sin(t * 1.1 + ph) * 10, fy = y + Math.sin(t * 1.6 + ph * 2) * 12;
  ctx.strokeStyle = 'rgba(90,70,60,.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(fx, fy + 46); ctx.quadraticCurveTo(fx + 8, fy + 90, x, y + 130); ctx.stroke();
  const g = ctx.createRadialGradient(fx - 12, fy - 14, 4, fx, fy, 50);
  g.addColorStop(0, '#ffffffdd'); g.addColorStop(.3, color); g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(fx, fy, 42, 50, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(fx - 6, fy + 48); ctx.lineTo(fx + 6, fy + 48); ctx.lineTo(fx, fy + 58); ctx.closePath(); ctx.fill();
}

// 木牌(黄山遥生日招牌)
function woodSign(ctx, x, y, w, lines, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#8a6d4b';
  for (const px of [-w / 2 + 16, w / 2 - 16]) ctx.fillRect(px - 8, 0, 16, 130);
  const g = ctx.createLinearGradient(0, -10, 0, 150);
  g.addColorStop(0, '#c89b6a'); g.addColorStop(1, '#a87f52');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-w / 2, -12, w, 150, 14); ctx.fill();
  ctx.strokeStyle = '#8a6d4b'; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = '#fff8ec'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const size = lines.length > 1 ? 44 : 56;
  ctx.font = `bold ${size}px "Noto Sans CJK SC"`;
  lines.forEach((ln, i) => {
    const yy = 63 + (i - (lines.length - 1) / 2) * 54;
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(120,80,40,.9)'; ctx.strokeText(ln, 0, yy);
    ctx.fillText(ln, 0, yy);
  });
  ctx.restore();
}

// 串灯(黄昏/夜晚)
function stringLights(ctx, x0, y0, x1, y1, t, sag = 46) {
  ctx.strokeStyle = 'rgba(90,70,60,.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); ctx.stroke();
  const cols = ['#ffd93d', '#ff9ff3', '#7ec8ff', '#ff8fab'];
  const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 70);
  for (let i = 1; i < n; i++) {
    const p = i / n, cx = lerp(x0, x1, p);
    const cy = (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (Math.max(y0, y1) + sag) + p * p * y1 + 12;
    const tw = .55 + .45 * Math.sin(t * 3 + i * 1.7);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
    const c = cols[i % 4];
    g.addColorStop(0, c); g.addColorStop(1, c + '00');
    ctx.globalAlpha = tw; ctx.fillStyle = g; ctx.fillRect(cx - 16, cy - 16, 32, 32);
    ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 6.29); ctx.fill();
  }
}

// 地面:草地 + 土场
function ground(ctx, kind = 'day') {
  const gg = ctx.createLinearGradient(0, H * .62, 0, H);
  if (kind === 'night') { gg.addColorStop(0, '#4a7c59'); gg.addColorStop(1, '#2c5240'); }
  else if (kind === 'dusk') { gg.addColorStop(0, '#9cc46a'); gg.addColorStop(1, '#6d9c4e'); }
  else { gg.addColorStop(0, '#a5d977'); gg.addColorStop(1, '#79b653'); }
  ctx.fillStyle = gg;
  ctx.beginPath(); ctx.moveTo(0, H * .66);
  ctx.quadraticCurveTo(W * .25, H * .62, W * .5, H * .655);
  ctx.quadraticCurveTo(W * .75, H * .69, W, H * .65);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  // 土场
  ctx.fillStyle = kind === 'night' ? '#7a5f48' : '#d9b28c';
  ctx.beginPath(); ctx.ellipse(W * .5, H * .88, W * .34, H * .1, 0, 0, 6.29); ctx.fill();
  // 小花
  const rnd = mulberry32(42);
  for (let i = 0; i < 26; i++) {
    const fx = rnd() * W, fy = H * (.7 + rnd() * .26);
    if (Math.abs(fx - W * .5) < W * .3 && fy > H * .8) continue;
    ctx.fillStyle = ['#fff', '#ffd93d', '#ff9ff3'][(rnd() * 3) | 0];
    ctx.beginPath(); ctx.arc(fx, fy, 3.4, 0, 6.29); ctx.fill();
  }
}

// 全景场景
function partyScene(ctx, t, o = {}) {
  const kind = o.kind || 'day';
  if (kind === 'day') {
    skyGrad(ctx, [[0, '#5eb8ff'], [.55, '#bfe8ff'], [1, '#eaf9ff']]);
    sun(ctx, W * .84, H * .16, 56);
  } else if (kind === 'dusk') {
    skyGrad(ctx, [[0, '#7a5a9e'], [.45, '#ff9a7a'], [.75, '#ffc98a'], [1, '#ffe8c0']]);
    sun(ctx, W * .5, H * .6, 84, '#ffdf9e');
  } else {
    skyGrad(ctx, [[0, '#2c3a6e'], [.6, '#5a4a8e'], [1, '#8e5a7a']]);
    sun(ctx, W * .82, H * .14, 46, '#fdf6d8');
    const rnd = mulberry32(7);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) {
      ctx.globalAlpha = .3 + .7 * Math.abs(Math.sin(t * 1.5 + i * 2.2));
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H * .5, 1.6 + rnd() * 2, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  cloud(ctx, W * .2 + Math.sin(t * .1) * 30, H * .14, 1.1, kind === 'day' ? .95 : .75);
  cloud(ctx, W * .62 + Math.sin(t * .13 + 2) * 34, H * .09, .8, kind === 'day' ? .9 : .7);
  tree(ctx, W * .06, H * .66, 1.5, kind === 'night' ? '#3e6b4a' : '#6fbf5e');
  tree(ctx, W * .95, H * .64, 1.3, kind === 'night' ? '#3e6b4a' : '#79c86a');
  ground(ctx, kind);
  if (o.dirt !== false) dirtPile(ctx, W * .18, H * .9, 220);
  coneAt(ctx, W * .06, H * .93, 1); coneAt(ctx, W * .94, H * .91, .9);
  bunting(ctx, W * .04, H * .07, W * .5, H * .045, t);
  bunting(ctx, W * .5, H * .045, W * .96, H * .07, t + 1.3);
  balloon(ctx, W * .075, H * .3, '#ff6b6b', t, 0);
  balloon(ctx, W * .11, H * .26, '#ffd93d', t, 1.4);
  balloon(ctx, W * .93, H * .28, '#4d96ff', t, 2.2);
  balloon(ctx, W * .895, H * .24, '#ff9ff3', t, 3.1);
  if (o.sign) woodSign(ctx, W * .5, H * .1, 560, o.sign, t);
  if (kind !== 'day') { stringLights(ctx, W * .04, H * .12, W * .5, H * .09, t); stringLights(ctx, W * .5, H * .09, W * .96, H * .12, t + .8); }
}
