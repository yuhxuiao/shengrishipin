// engine.js — 确定性 2D 动画引擎(所有画面只是时间 t 的纯函数)
'use strict';
const W = 1920, H = 1080;

// ---------- 工具 ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp01 = x => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const bounce = (t, freq) => Math.abs(Math.sin(t * Math.PI * freq));          // 0..1 弹跳
const wave = (t, freq) => Math.sin(t * 2 * Math.PI * freq);                  // -1..1 摆动

// ---------- 绘制 ----------
function drawCover(ctx, img, zoom, panX = 0, panY = 0, rot = 0) {
  const s = Math.max(W / img.width, H / img.height) * zoom;
  ctx.save();
  ctx.translate(W / 2 + panX, H / 2 + panY);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
  ctx.restore();
}

// 以高度 h(像素)画精灵;anchor 默认底部中心
function drawSprite(ctx, img, x, y, h, o = {}) {
  const s = h / img.height;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.sx ?? 1, o.sy ?? 1);
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.drawImage(img, -img.width * (o.ax ?? .5) * s, -img.height * (o.ay ?? 1) * s, img.width * s, img.height * s);
  ctx.restore();
}

// ---------- 粒子(初始化时固定,逐帧只算位置) ----------
const PARTY = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9ff3', '#ffa94d'];

function makeConfetti(seed, n = 60, opts = {}) {
  const rnd = mulberry32(seed);
  const ps = [];
  for (let i = 0; i < n; i++) ps.push({
    x: rnd() * W, y0: -rnd() * H, vy: 60 + rnd() * 90, sway: 20 + rnd() * 40,
    f: 0.2 + rnd() * 0.5, size: 8 + rnd() * 10, rot: rnd() * 6.28, vr: (rnd() - .5) * 4,
    color: PARTY[(rnd() * PARTY.length) | 0], circle: rnd() < .4, delay: rnd() * (opts.spread ?? 0),
  });
  return ps;
}
function drawConfetti(ctx, ps, t, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  for (const p of ps) {
    const tt = t - p.delay; if (tt < 0) continue;
    const y = (p.y0 + p.vy * tt) % (H + 80), x = p.x + Math.sin(tt * p.f * 6.28) * p.sway;
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + p.vr * tt); ctx.fillStyle = p.color;
    if (p.circle) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.29); ctx.fill(); }
    else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }
  ctx.restore();
}

function makeSparkles(seed, n = 22, color = '#ffd93d') {
  const rnd = mulberry32(seed);
  const ps = [];
  for (let i = 0; i < n; i++) ps.push({
    x: W * 0.2 + rnd() * W * 0.6, y0: H * 0.75 + rnd() * H * 0.2, vy: 30 + rnd() * 50,
    r: 2 + rnd() * 5, f: 0.3 + rnd() * 0.7, phase: rnd() * 6.28,
  });
  return ps;
}
function drawSparkles(ctx, ps, t, color = '#ffd93d') {
  ctx.save();
  for (const p of ps) {
    const y = p.y0 - (p.vy * t) % (H * 0.7), a = 0.35 + 0.35 * Math.sin(t * p.f * 6.28 + p.phase);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, 6.29); ctx.fill();
  }
  ctx.restore();
}

function makeHearts(seed, n = 14) {
  const rnd = mulberry32(seed);
  const ps = [];
  for (let i = 0; i < n; i++) ps.push({
    x: rnd() * W, y0: H + rnd() * 300, vy: 40 + rnd() * 60, s: 18 + rnd() * 22,
    sway: 30 + rnd() * 40, f: 0.2 + rnd() * 0.4, c: ['#ff8fab', '#ff6b6b', '#ffc2d1'][(rnd() * 3) | 0],
  });
  return ps;
}
function drawHeartShape(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * .35);
  ctx.bezierCurveTo(-s, -s * .35, -s * .45, -s, 0, -s * .45);
  ctx.bezierCurveTo(s * .45, -s, s, -s * .35, 0, s * .35);
  ctx.fill();
}
function drawHearts(ctx, ps, t) {
  ctx.save();
  for (const p of ps) {
    const y = p.y0 - (p.vy * t) % (H + 500), x = p.x + Math.sin(t * p.f * 6.28) * p.sway;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = .8; ctx.fillStyle = p.c;
    drawHeartShape(ctx, p.s); ctx.restore();
  }
  ctx.restore();
}

// 挖掘尘土:按节拍从 (x,y) 喷出
function drawDirtPuffs(ctx, t, x, y, beat = 0.85, seed = 5) {
  const rnd = mulberry32(seed);
  const cycle = Math.floor(t / beat), ct = t % beat;
  for (let k = Math.max(0, cycle - 2); k <= cycle; k++) {
    const age = ct + (cycle - k) * beat; if (age > 1.2) continue;
    for (let i = 0; i < 6; i++) {
      const a = rnd() * Math.PI - Math.PI, sp = 60 + rnd() * 120;
      const px = x + Math.cos(a) * sp * age, py = y - 30 - Math.abs(Math.sin(a)) * sp * age + 160 * age * age;
      ctx.save(); ctx.globalAlpha = Math.max(0, .55 - age * .45); ctx.fillStyle = '#8d5a3a';
      ctx.beginPath(); ctx.arc(px, py, 6 + 10 * age, 0, 6.29); ctx.fill(); ctx.restore();
    }
  }
}

// 吹蜡烛的烟
function drawSmoke(ctx, t, x, y, seed = 9) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < 8; i++) {
    const age = (t * .5 + i * .25) % 2.2;
    const px = x + Math.sin(age * 3 + i) * 22 + (rnd() - .5) * 8;
    const py = y - age * 120;
    ctx.save(); ctx.globalAlpha = Math.max(0, .4 * (1 - age / 2.2)); ctx.fillStyle = '#cfd4dc';
    ctx.beginPath(); ctx.arc(px, py, 8 + age * 16, 0, 6.29); ctx.fill(); ctx.restore();
  }
}

// 中央脉冲光晕(烛光/魔法)
function drawGlow(ctx, x, y, r, color, t, f = 1) {
  const a = .22 + .12 * wave(t, f);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', a.toFixed(3)));
  g.addColorStop(1, color.replace('A', '0'));
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}

// Ken Burns:mode 与 v1 对齐
function kenburns(ctx, img, p, mode) {
  const Z = 0.09;
  if (mode === 'zoom_in') drawCover(ctx, img, 1 + Z * p);
  else if (mode === 'zoom_out') drawCover(ctx, img, 1 + Z * (1 - p));
  else if (mode === 'pan_right') drawCover(ctx, img, 1.07, lerp(-40, 40, p));
  else drawCover(ctx, img, 1.07, lerp(40, -40, p));
}

// ---------- v4 动画词汇(PDoomVideo 手法) ----------
const ease = t => t * t * (3 - 2 * t);
const easeIn = t => t * t * t;
const easeOut = easeOutCubic;
const backOut = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const elasticOut = t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1;

// 关键帧插值:kf(t, [[0,v0],[1.2,v1],...], easeFn)
function kf(t, keys, fn) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      return lerp(v0, v1, (fn || ease)((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

// 循环关键帧(周期 per)
function kfLoop(t, per, keys, fn) { return kf(t % per, keys, fn); }

// 以"底边中点"为锚点放置精灵(框 = 抠图时的归一化原图框,保证 1:1 归位)
function placeSprite(ctx, img, box, o = {}) {
  const sc = o.scale ?? 1;
  const dw = (box[2] - box[0]) * W * sc, dh = (box[3] - box[1]) * H * sc;
  const ax = (box[0] + box[2]) / 2 * W + (o.dx || 0), ay = box[3] * H + (o.dy || 0);
  ctx.save(); ctx.translate(ax, ay);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.sx ?? 1, o.sy ?? 1);
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.drawImage(img, -dw / 2, -dh, dw, dh);
  ctx.restore();
}

// 情绪符号:! ♥ ✦ ♪ 从头顶弹出(backOut 弹入 + 上浮 + 淡出)
function emote(ctx, ch, x, y, t, t0, o = {}) {
  const life = o.life || 1.5, age = t - t0;
  if (age < 0 || age > life) return;
  const pop = backOut(clamp01(age / .22));
  const fade = age > life - .4 ? 1 - (age - (life - .4)) / .4 : 1;
  ctx.save();
  ctx.translate(x, y - age * 34); ctx.rotate(Math.sin(age * 7) * .09); ctx.scale(pop, pop);
  ctx.globalAlpha = fade;
  ctx.font = `bold ${o.size || 72}px "Noto Sans CJK SC"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(58,42,68,.9)';
  ctx.strokeText(ch, 0, 0);
  ctx.fillStyle = o.color || '#ffd93d'; ctx.fillText(ch, 0, 0);
  ctx.restore();
}

// 卡通音效字(轰隆隆/哒哒/哇):大幅弹入 + 抖动 + 淡出
function sfxText(ctx, txt, x, y, t, t0, o = {}) {
  const life = o.life || 1.3, age = t - t0;
  if (age < 0 || age > life) return;
  const pop = elasticOut(clamp01(age / .35));
  const fade = age > life - .35 ? 1 - (age - (life - .35)) / .35 : 1;
  ctx.save();
  ctx.translate(x, y); ctx.rotate((o.rot || -0.06) + Math.sin(age * 10) * .04);
  ctx.scale(pop, pop); ctx.globalAlpha = fade;
  ctx.font = `bold ${o.size || 96}px "Noto Sans CJK SC"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 14; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff';
  ctx.strokeText(txt, 0, 0);
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(58,42,68,.9)'; ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = o.color || '#ff6b6b'; ctx.fillText(txt, 0, 0);
  ctx.restore();
}

// 音符上飘(生日歌用)
function makeNotes(seed, n = 14) {
  const rnd = mulberry32(seed);
  const ps = [];
  for (let i = 0; i < n; i++) ps.push({
    x: W * .15 + rnd() * W * .7, y0: H * .72 + rnd() * H * .2, vy: 26 + rnd() * 40,
    f: .3 + rnd() * .5, ph: rnd() * 6.28, ch: rnd() < .5 ? '♪' : '♫', s: 40 + rnd() * 36,
    c: ['#ffd93d', '#fff3b0', '#ffcf6b'][(rnd() * 3) | 0],
  });
  return ps;
}
function drawNotes(ctx, ps, t) {
  ctx.save();
  for (const p of ps) {
    const y = p.y0 - (p.vy * t) % (H * .62), x = p.x + Math.sin(t * p.f * 6.28 + p.ph) * 34;
    const a = Math.min(1, (p.y0 - y) / 60) * .9;
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = `bold ${p.s}px "Noto Sans CJK SC"`; ctx.textAlign = 'center';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(58,42,68,.75)'; ctx.strokeText(p.ch, x, y);
    ctx.fillStyle = p.c; ctx.fillText(p.ch, x, y);
  }
  ctx.restore();
}

// 落地压扁回弹:sy 从压扁弹回 1(用于角色落地)
const landSquash = (t, t0) => t < t0 ? 1 : 1 - 0.18 * Math.exp(-(t - t0) * 6) * Math.cos((t - t0) * 18);

// ---------- 区域微变形(Live2D 式:同一帧取区域羽化后原位变形,无抠图痕迹) ----------
// 从 img 的 box(归一化)取出区域,边缘径向羽化,缓存为离屏 canvas
function makeWarp(img, box) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const px = box[0] * iw, py = box[1] * ih, pw = (box[2] - box[0]) * iw, ph = (box[3] - box[1]) * ih;
  const c = document.createElement('canvas'); c.width = Math.max(2, pw | 0); c.height = Math.max(2, ph | 0);
  const x = c.getContext('2d');
  x.drawImage(img, px, py, pw, ph, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in';
  const g = x.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * .3,
    c.width / 2, c.height / 2, Math.max(c.width, c.height) * .66);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  return c;
}
// 把羽化区域放回原位并绕 pivot(box 内归一化点)变形:rot 弧度/sx/sy/dx/dy(画布像素)
function drawWarp(ctx, warped, box, o = {}) {
  const x0 = box[0] * W, y0 = box[1] * H, w = (box[2] - box[0]) * W, h = (box[3] - box[1]) * H;
  const px = x0 + w * (o.px ?? .5), py = y0 + h * (o.py ?? 1);
  ctx.save();
  ctx.translate(px + (o.dx || 0), py + (o.dy || 0));
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.sx ?? 1, o.sy ?? 1);
  ctx.drawImage(warped, -w * (o.px ?? .5), -h * (o.py ?? 1), w, h);
  ctx.restore();
}
