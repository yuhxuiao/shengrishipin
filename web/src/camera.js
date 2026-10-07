// camera.js — v7 升级:摄像机系统 / 视差 / 接触阴影 / 字幕气泡 / 转场
'use strict';

// ---------- 摄像机 ----------
// cam = {x, y, z}: 世界坐标下的取景中心 + 缩放。默认 {W/2, H/2, 1}
// keys: [[t, x, y, z], ...] 平滑插值
function camFrom(t, keys) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [t0, x0, y0, z0] = keys[i - 1], [t1, x1, y1, z1] = keys[i];
      const p = ease((t - t0) / (t1 - t0));
      return { x: lerp(x0, x1, p), y: lerp(y0, y1, p), z: lerp(z0, z1, p) };
    }
  }
  const k = keys[keys.length - 1];
  return { x: k[1], y: k[2], z: k[3] };
}

// 应用摄像机;f = 视差系数(远景 0.3~0.6,主体层 1,前景 1.2~1.5)
function camApply(ctx, cam, f = 1) {
  const z = 1 + (cam.z - 1) * f;
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-(W / 2 + (cam.x - W / 2) * f), -(H / 2 + (cam.y - H / 2) * f));
}

// ---------- 接触阴影(角色落地感的关键) ----------
function contactShadow(ctx, x, y, rx, alpha = 0.22, squash = 0) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(60,40,30,${alpha})`);
  g.addColorStop(0.7, `rgba(60,40,30,${alpha * 0.5})`);
  g.addColorStop(1, 'rgba(60,40,30,0)');
  ctx.translate(x, y);
  ctx.scale(1 + squash * 0.3, (rx * 0.32) / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, rx, 0, 6.29); ctx.fill();
  ctx.restore();
}

// ---------- 字幕气泡(布鲁伊式:奶油底+描边+微旋转+弹入) ----------
// cues: [{t0, t1, text, kind}] kind: sub(默认)|banner(顶部互动大字)
function drawCaptions(ctx, t, cues) {
  for (const c of cues) {
    if (t < c.t0 || t > c.t1) continue;
    const age = t - c.t0, out = c.t1 - t;
    const pop = backOut(clamp01(age / 0.28));
    const a = Math.min(1, out / 0.25);
    const isBanner = c.kind === 'banner';
    ctx.save();
    ctx.globalAlpha = a;
    const fs = isBanner ? 64 : 46;
    ctx.font = `bold ${fs}px "Noto Sans CJK SC"`;
    const tw = ctx.measureText(c.text).width;
    const cx = W / 2, cy = isBanner ? H * 0.14 : H * 0.92;
    ctx.translate(cx, cy);
    ctx.rotate(isBanner ? -0.008 : -0.006);
    ctx.scale(pop, pop);
    if (isBanner) {
      // 顶部互动条:奶油底圆角牌
      ctx.fillStyle = 'rgba(255,248,236,.94)';
      ctx.beginPath(); ctx.roundRect(-tw / 2 - 36, -fs * 0.85, tw + 72, fs * 1.7, 22); ctx.fill();
      ctx.strokeStyle = '#e8b058'; ctx.lineWidth = 5; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#c05a2e';
      ctx.fillText(c.text, 0, 2);
    } else {
      // 底部旁白:白字 + 暖棕粗描边 + 柔光
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,248,236,.8)'; ctx.shadowBlur = 12;
      ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(74,52,40,.92)';
      ctx.strokeText(c.text, 0, 0);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fffdf6';
      ctx.fillText(c.text, 0, 0);
    }
    ctx.restore();
  }
}

// ---------- 转场 ----------
// 圆形光圈擦除:先画完旧场景,再在圆内画新场景(0→1)
function irisWipe(ctx, p, drawNew, cx = W / 2, cy = H / 2) {
  const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  const r = ease(p) * maxR * 1.05;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.clip();
  drawNew();
  ctx.restore();
  if (p > 0.02 && p < 0.98) { // 暖色光圈边
    ctx.save();
    ctx.strokeStyle = 'rgba(255,244,214,.85)'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r - 7), 0, 6.29); ctx.stroke();
    ctx.restore();
  }
}

// ---------- 氛围收尾 ----------
function vignette(ctx, strength = 0.16) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(40,24,40,0)');
  g.addColorStop(1, `rgba(40,24,40,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
// 整体暖光洗(生日氛围)
function warmWash(ctx, alpha = 0.05) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgba(255,236,190,${alpha})`);
  g.addColorStop(1, 'rgba(255,236,190,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---------- 弹性入场(纸片动画三档,源自 paper-cutout 参数) ----------
const _blink = (t, ph = 0) => ((t + ph) % 3.6) < 0.12;
function _driveKf(t, t0, dur, off, home) {
  const x = kf(t, [[0, off], [t0, off], [t0 + dur, home]], easeOut);
  return { x, moving: t > t0 && t < t0 + dur, landed: t >= t0 + dur };
}
const ROLE_MOTION = {
  primary:   { dist: 78, rise: 55, startScale: 0.86, bobAmp: 2.4, dur: 0.73 },
  secondary: { dist: 58, rise: 38, startScale: 0.90, bobAmp: 1.8, dur: 0.6 },
  tertiary:  { dist: 38, rise: 22, startScale: 0.95, bobAmp: 1.2, dur: 0.47 },
};
// 入场进度:返回 {p(0-1 缓动后), bob(入场后永不停止的呼吸相位)}
function enterMotion(t, t0, role = 'primary', seed = 1) {
  const m = ROLE_MOTION[role];
  const raw = clamp01((t - t0) / m.dur);
  return {
    p: easeOutBack(raw),
    raw,
    m,
    bob: raw >= 1 ? Math.sin(t * 1.1 + seed * 2.1) * m.bobAmp : 0,
  };
}
