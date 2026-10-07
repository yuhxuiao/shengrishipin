// overlay.js — V9 2D 引导 UI:按 timeline.ui 排程 卡片 / 动画小引导 / 徽标 / 日期浮层
// 5+ 单元视觉资产(挥手/举高/抓握/挖土/抬举 mini 动画),果冻字强调。
import * as THREE from 'three';
import { win, ease } from './util.js';

const FONT = '"Baloo 2","Nunito","PingFang SC","Microsoft YaHei",system-ui,sans-serif';

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// ---------- mini 动画引导(自绘 5 单元,按 at 循环播放) ----------
const hand = (c, x, y, s, waveK, grabK) => {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.rotate(waveK * -0.45);
  c.fillStyle = '#ffd9a8';
  // 手掌
  roundRect(c, -16, -14, 32, 30, 12); c.fill();
  // 手指(抓握时蜷缩)
  const fL = lerpN(26, 10, grabK), fW = 7;
  for (let i = 0; i < 4; i++) {
    roundRect(c, -15 + i * 8, -14 - fL + waveK * Math.sin(i * 1.3) * 3, fW, fL, 3.5);
    c.fill();
  }
  roundRect(c, -22, -2, 10, 16, 5); c.fill(); // 拇指
  c.restore();
};
const lerpN = (a, b, k) => a + (b - a) * k;

const unitWave = (c, x, y, s, at) => hand(c, x, y, s, Math.sin(at * 5), 0);
const unitRaise = (c, x, y, s, at) => {
  const k = (Math.sin(at * 2.4 - Math.PI / 2) + 1) / 2;
  c.save();
  c.translate(x, y);
  // 地面小车
  c.fillStyle = '#5aa9f0';
  roundRect(c, -20 * s, 6 * s, 40 * s, 16 * s, 6 * s); c.fill();
  // 机械臂举高
  const ang = lerpN(-0.5, -2.2, ease.outCubic(k));
  c.save();
  c.translate(0, 6 * s);
  c.rotate(lerpN(0, -0.35, k));
  c.rotate(ang + 0.5);
  c.fillStyle = '#4a9de8';
  roundRect(c, -5 * s, -34 * s, 10 * s, 34 * s, 5 * s); c.fill();
  c.fillStyle = '#8fb9de';
  roundRect(c, -9 * s, -44 * s, 18 * s, 12 * s, 4 * s); c.fill();
  c.restore();
  c.restore();
};
const unitGrab = (c, x, y, s, at) => {
  const k = (Math.sin(at * 3.2 - Math.PI / 2) + 1) / 2;
  hand(c, x, y, s, 0, k);
};
const unitDig = (c, x, y, s, at) => {
  const k = (Math.sin(at * 2.8 - Math.PI / 2) + 1) / 2;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.rotate(lerpN(-0.3, 0.55, ease.inOutCubic(k)));
  c.fillStyle = '#4a9de8';
  roundRect(c, -4, -30, 8, 32, 4); c.fill();
  c.fillStyle = '#8fb9de';
  c.beginPath(); c.moveTo(-12, 8); c.quadraticCurveTo(0, -2, 14, 8); c.lineTo(14, 20); c.quadraticCurveTo(0, 26, -12, 20); c.closePath(); c.fill();
  c.restore();
  // 土堆
  c.save(); c.translate(x, y);
  c.fillStyle = '#6b4a2c';
  c.beginPath(); c.ellipse(16 * s, 22 * s, 14 * s, 6 * s, 0, 0, Math.PI * 2); c.fill();
  c.restore();
};
const unitLift = (c, x, y, s, at) => {
  const k = (Math.sin(at * 2.2 - Math.PI / 2) + 1) / 2;
  c.save();
  c.translate(x, y + lerpN(10, -12, ease.outCubic(k)) * s);
  c.scale(s, s);
  c.fillStyle = '#8fb9de';
  c.beginPath(); c.moveTo(-16, 0); c.quadraticCurveTo(0, -10, 16, 0); c.lineTo(16, 14); c.quadraticCurveTo(0, 20, -16, 14); c.closePath(); c.fill();
  c.fillStyle = '#6b4a2c';
  c.beginPath(); c.ellipse(0, 2, 12, 5, 0, 0, Math.PI * 2); c.fill();
  c.restore();
};
const UNITS = { wave: unitWave, raise: unitRaise, grab: unitGrab, dig: unitDig, lift: unitLift };

// ---------- 图标(卡片角标) ----------
const icon = (c, name, x, y, s) => UNITS[name] ? UNITS[name](c, x, y, s, 0.35) : null;

function textWithEm(c, text, x, y, size, at) {
  // 关键词加色:挖/挖斗/挥挥/举高高/太棒 用品牌橘 #ff8a3d,其余奶白
  c.font = `800 ${size}px ${FONT}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  // r3: 随新文案(拍拍手/举举小手/咔嚓/挖呀挖/好高/鼓掌/挖挖/挥挥/太棒)
  const EMs = ['拍拍手', '举举小手', '咔嚓', '挖呀挖', '好高', '鼓掌', '挖挖', '挥挥', '太棒'];
  let start = 0;
  const parts = [];
  let rest = text, idx = 0;
  for (const em of EMs) {
    const i = rest.indexOf(em);
    if (i >= 0) {
      if (i > 0) parts.push({ t: rest.slice(0, i), em: false });
      parts.push({ t: em, em: true });
      rest = rest.slice(i + em.length);
    }
  }
  if (rest) parts.push({ t: rest, em: false });
  const widths = parts.map(p => c.measureText(p.t).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let px = x - total / 2;
  c.textAlign = 'left';
  parts.forEach((p, i) => {
    const pop = p.em ? 1 + Math.sin(Math.min(1, at * 2.5) * Math.PI) * 0.14 : 1;
    c.save();
    c.translate(px + widths[i] / 2, y);
    c.scale(pop, pop);
    if (p.em) {
      c.fillStyle = '#ff9d45';
      c.shadowColor = 'rgba(255,138,61,0.65)'; c.shadowBlur = 18;
    } else {
      c.fillStyle = '#fff7ea';
      c.shadowColor = 'rgba(20,40,80,0.5)'; c.shadowBlur = 6;
    }
    c.fillText(p.t, -widths[i] / 2, 0);
    c.restore();
    px += widths[i];
  });
}

function drawCard(c, u, t, W, H) {
  const kIn = ease.outCubic(Math.min(1, (t - u.from) / 0.45));
  // 必须 max(0):t 远早于 to-0.4 时 (t-(to-0.4))/0.4 为大负数,inCubic 保号 → kOut 巨额负值
  // → y = 124 + kOut*-160 飞出屏幕上万像素(整片卡片在其窗口内不可见的根因,r1 修复)
  const kOut = ease.inCubic(Math.max(0, Math.min(1, (t - (u.to - 0.4)) / 0.4)));
  const y = lerpN(-120, H * 0.115, kIn) + kOut * -160;
  const alpha = Math.min(1, kIn * 1.5) * (1 - kOut);
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.font = `800 40px ${FONT}`;
  const tw = c.measureText(u.text).width;
  const w = tw + 150, h = 96;
  const x = W / 2 - w / 2;
  c.shadowColor = 'rgba(15,35,70,0.35)'; c.shadowBlur = 26; c.shadowOffsetY = 8;
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(28,52,96,0.86)');
  g.addColorStop(1, 'rgba(16,34,68,0.82)');
  roundRect(c, x, y, w, h, 48);
  c.fillStyle = g; c.fill();
  c.shadowColor = 'transparent';
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(255,214,120,0.55)';
  roundRect(c, x + 2, y + 2, w - 4, h - 4, 46); c.stroke();
  icon(c, u.icon, x + 52, y + h / 2 + 4, 1.05);
  textWithEm(c, u.text, W / 2 + 24, y + h / 2, 40, t - u.from);
  c.restore();
}

function drawGuide(c, u, t, W, H) {
  const kIn = ease.outCubic(Math.min(1, (t - u.from) / 0.5));
  const kOut = ease.inCubic(Math.max(0, Math.min(1, (t - (u.to - 0.35)) / 0.35)));
  const alpha = kIn * (1 - kOut);
  if (alpha <= 0.01) return;
  const x = W - 130, y = H - 120;
  c.save();
  c.globalAlpha = alpha;
  const g = c.createRadialGradient(x, y, 8, x, y, 62);
  g.addColorStop(0, 'rgba(20,40,80,0.72)');
  g.addColorStop(1, 'rgba(20,40,80,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, 62, 0, Math.PI * 2); c.fill();
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(255,214,120,0.8)';
  c.beginPath(); c.arc(x, y, 50, 0, Math.PI * 2); c.stroke();
  // 旋转高光弧
  c.save();
  c.translate(x, y);
  c.rotate((t - u.from) * 2.4);
  c.strokeStyle = 'rgba(255,214,120,0.4)';
  c.beginPath(); c.arc(0, 0, 56, 0, 1.1); c.stroke();
  c.restore();
  UNITS[u.action](c, x, y, 0.85, t - u.from);
  c.restore();
}

function drawBadge(c, u, t, W, H) {
  const age = t - u.from;
  const pop = (age < 0.42 ? ease.outBack(age / 0.42) : 1) * 1.35; // r1: 幼儿激励放大 1.35×
  const kOut = ease.inCubic(Math.max(0, Math.min(1, (t - (u.to - 0.35)) / 0.35)));
  const alpha = Math.min(1, age * 3) * (1 - kOut);
  if (alpha <= 0.01) return;
  const x = W * 0.78, y = H * 0.24; // r2: 正中→右上安全区,避开斗臂挖掘/卸土运动包络(39.45 穿模修复)
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale(pop, pop);
  // 星形绶带
  c.save();
  c.rotate(Math.sin(age * 1.2) * 0.05);
  for (let i = 0; i < 12; i++) {
    c.rotate(Math.PI / 6);
    const g = c.createLinearGradient(0, -52, 0, -78);
    g.addColorStop(0, '#ffd76b'); g.addColorStop(1, '#ff9d45');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -50); c.lineTo(9, -74); c.lineTo(-9, -74); c.closePath(); c.fill();
  }
  const g = c.createRadialGradient(-14, -14, 8, 0, 0, 58);
  g.addColorStop(0, '#ffe9b0'); g.addColorStop(0.75, '#ffcf5e'); g.addColorStop(1, '#f5a623');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, 52, 0, Math.PI * 2); c.fill();
  c.lineWidth = 4; c.strokeStyle = '#fff3d0';
  c.beginPath(); c.arc(0, 0, 46, 0, Math.PI * 2); c.stroke();
  c.restore();
  c.font = `900 40px ${FONT}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#7a3c00';
  c.fillText(u.text, 0, 1);
  // 扫光
  const sw = ((age * 90) % 240) - 120;
  const lg = c.createLinearGradient(sw - 30, -52, sw + 30, 52);
  lg.addColorStop(0, 'rgba(255,255,255,0)');
  lg.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  lg.addColorStop(1, 'rgba(255,255,255,0)');
  c.save();
  c.beginPath(); c.arc(0, 0, 50, 0, Math.PI * 2); c.clip();
  c.fillStyle = lg; c.fillRect(sw - 40, -52, 80, 104);
  c.restore();
  c.restore();
}

function drawDate(c, u, t, W, H) {
  const kIn = ease.outCubic(Math.min(1, (t - u.from) / 0.8));
  const kOut = ease.inCubic(Math.max(0, Math.min(1, (t - (u.to - 0.7)) / 0.7)));
  const alpha = kIn * (1 - kOut);
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  const x = W * 0.26, y = H * 0.82; // r2: 0.34→0.26 再左移,r1 后右翼装饰仍压履带 // r1: 左移避开机身/履带,落在开阔草地上
  c.font = `900 54px ${FONT}`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const tw = c.measureText(u.text).width;
  c.fillStyle = '#ffd76b';
  c.shadowColor = 'rgba(120,60,0,0.8)'; c.shadowBlur = 4; c.shadowOffsetY = 4;
  c.fillText(u.text, x, y);
  c.shadowColor = 'transparent';
  c.font = `700 30px ${FONT}`;
  c.fillStyle = '#fff7ea';
  c.fillText(u.sub, x, y + 44);
  // 两侧彩带
  c.strokeStyle = '#ff9d45'; c.lineWidth = 5; c.lineCap = 'round';
  for (const sd of [-1, 1]) {
    c.beginPath();
    c.moveTo(x + sd * (tw / 2 + 24), y);
    c.lineTo(x + sd * (tw / 2 + 92), y);
    c.stroke();
    c.beginPath(); c.arc(x + sd * (tw / 2 + 100), y, 6, 0, Math.PI * 2);
    c.fillStyle = '#ff9d45'; c.fill();
  }
  c.restore();
}

const DRAWERS = { card: drawCard, guide: drawGuide, badge: drawBadge, date: drawDate };

export class Overlay {
  constructor(timeline, W, H) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.c = this.canvas.getContext('2d');
    this.timeline = timeline;
    this.W = W; this.H = H;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
  }
  async ready() {
    await document.fonts.load(`900 54px ${FONT}`);
    await document.fonts.load(`800 40px ${FONT}`);
    await document.fonts.load(`700 30px ${FONT}`);
  }
  update(t) {
    const { c, W, H } = this;
    c.clearRect(0, 0, W, H);
    for (const u of this.timeline.ui) {
      if (t < u.from || t > u.to) continue;
      (DRAWERS[u.type] || (() => {}))(c, u, t, W, H);
    }
    this.tex.needsUpdate = true;
  }
}
