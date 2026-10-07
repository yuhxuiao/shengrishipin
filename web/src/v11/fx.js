// fx.js — V11 特效、地面挖掘凹痕与物理交互系统
// 包含:
// 1. 挖掘地坑 (dirt pit) 与隆起土堆 (dirt mound)
// 2. 挖掘泥土尘粒飞溅 (dust)
// 3. 星光与宝藏辉光 (stars, glow)
// 4. 沙坑小黄鸭破沙飞出 (duck_pop)
// 5. 生日蜡烛物理火苗倾倒与吹熄青烟 (candle)
// 6. X 宝藏标记 (xmarks) 与金色脉动 (golden pulse)
// 7. 多形态彩带礼花雨 (confetti)
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const NAVY = '#0B2F6E';

  // 1. 挖掘地坑与隆起土堆 (解决"地面永远是平的"粗糙感)
  function drawExcavationHole(ctx, cx, cy, progress) {
    if (progress <= 0) return;
    ctx.save();
    ctx.translate(cx, cy);
    const u = Math.min(1.0, progress);

    // 翻开的深棕色泥土凹坑
    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.ellipse(0, 0, 110 * u, 42 * u, 0, 0, TAU);
    ctx.fill();

    // 坑内更深阴影
    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.ellipse(0, 8 * u, 85 * u, 26 * u, 0, 0, TAU);
    ctx.fill();

    // 两侧翻隆起来的松软泥土块堆
    ctx.fillStyle = '#8D6E63';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3.5;

    // 左土堆
    ctx.beginPath();
    ctx.arc(-80 * u, -5 * u, 35 * u, Math.PI * 0.8, Math.PI * 0.1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 右土堆
    ctx.beginPath();
    ctx.arc(80 * u, -8 * u, 42 * u, Math.PI * 0.9, Math.PI * 0.2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.restore();
  }

  // 2. 挖掘泥土尘粒 (飞溅与下落)
  function drawDust(ctx, cx, cy, u) {
    if (u <= 0 || u >= 1) return;
    ctx.save();
    const DUST_COLORS = ['#6D4C41', '#8D6E63', '#A1887F', '#D7CCC8'];
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.90 + (i / count) * Math.PI * 0.80;
      const speed = 140 + ((i * 43) % 110);
      const px = cx + Math.cos(angle) * speed * u;
      const py = cy + Math.sin(angle) * speed * u + 260 * u * u; // 真实重力加速度
      const r = Math.max(0, 12 * (1 - u) * (((i % 3) + 2) / 3));

      ctx.fillStyle = DUST_COLORS[i % DUST_COLORS.length];
      ctx.beginPath();
      ctx.arc(px, py, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. 星光迸发 (宝藏破土瞬间)
  function drawStars(ctx, cx, cy, u) {
    if (u <= 0 || u >= 1) return;
    ctx.save();
    const count = 16;
    const fade = Math.sin(u * Math.PI);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * TAU + u * 2;
      const dist = 40 + u * 220;
      const px = cx + Math.cos(ang) * dist;
      const py = cy + Math.sin(ang) * dist;
      const s = Math.max(0, 22 * fade * (((i % 3) + 1) / 2));

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(u * 5 + i);
      ctx.fillStyle = i % 2 === 0 ? '#FFE082' : '#FFF9C4';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 4. 沙坑小黄鸭飞出与落地弹跳 (幽默意外)
  function drawDuckPhysics(ctx, cx, cy, u, t) {
    if (u <= 0 || u >= 1) return;
    ctx.save();
    // 抛物线跳跃并掉落在沙滩上
    let dx = 0, dy = 0, rot = 0;
    if (u < 0.65) {
      const ju = u / 0.65;
      dx = ju * 180;
      dy = -4 * 220 * ju * (1 - ju);
      rot = ju * TAU * 1.5;
    } else {
      // 落地弹跳
      const lu = (u - 0.65) / 0.35;
      dx = 180 + lu * 40;
      dy = -Math.abs(Math.sin(lu * Math.PI * 2)) * 30 * (1 - lu);
      rot = Math.sin(lu * TAU) * 0.15;
    }

    ctx.translate(cx + dx, cy + dy);
    ctx.rotate(rot);
    const s = 1.2;
    ctx.scale(s, s);

    // 鸭身
    ctx.fillStyle = '#FFEB3B';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 26, 0, 0, TAU);
    ctx.fill(); ctx.stroke();

    // 鸭头
    ctx.beginPath();
    ctx.arc(20, -18, 18, 0, TAU);
    ctx.fill(); ctx.stroke();

    // 鸭嘴
    ctx.fillStyle = '#FF7043';
    ctx.beginPath();
    ctx.moveTo(34, -22); ctx.lineTo(50, -16); ctx.lineTo(32, -10);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 豆豆眼
    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.arc(26, -20, 3.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(27.5, -21.5, 1.5, 0, TAU); ctx.fill();

    // 鸭翅
    ctx.fillStyle = '#FDD835';
    ctx.beginPath(); ctx.ellipse(-8, 0, 16, 10, -0.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // 5. 蜡烛火苗物理倾斜与吹熄青烟 (S31 核心)
  function drawCandle(ctx, cx, cy, t, isLit, isBlown, blownProgress) {
    ctx.save();
    ctx.translate(cx, cy);

    // 蜡烛芯
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -16);
    ctx.stroke();

    if (isLit) {
      // 火苗随风轻晃
      const flick = Math.sin(t * 16) * 3;
      const hScale = 1 + Math.sin(t * 22) * 0.12;

      // 柔和火光光晕
      const glow = ctx.createRadialGradient(0, -28, 4, 0, -28, 65);
      glow.addColorStop(0, 'rgba(255, 235, 59, 0.7)');
      glow.addColorStop(0.5, 'rgba(255, 152, 0, 0.3)');
      glow.addColorStop(1, 'rgba(255, 152, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, -28, 65, 0, TAU); ctx.fill();

      // 外火苗 (明亮金黄)
      ctx.fillStyle = '#FF9800';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(-14 + flick, -32 * hScale, 0 + flick, -48 * hScale);
      ctx.quadraticCurveTo(14 + flick, -32 * hScale, 0, -16);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // 内火芯 (纯净明亮浅黄)
      ctx.fillStyle = '#FFFDE7';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(-7 + flick * 0.6, -28 * hScale, 0 + flick * 0.6, -38 * hScale);
      ctx.quadraticCurveTo(7 + flick * 0.6, -28 * hScale, 0, -18);
      ctx.closePath();
      ctx.fill();
    } else if (isBlown) {
      // 吹灭瞬间：袅袅白蓝色卷曲青烟消散
      const pu = Math.min(1.0, blownProgress || 0);
      ctx.save();
      const smokeAlpha = Math.max(0, 1 - pu);
      ctx.strokeStyle = `rgba(179, 229, 252, ${0.85 * smokeAlpha})`;
      ctx.lineWidth = 5 * (1 + pu * 2);
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(0, -16);
      const c1x = 18 * Math.sin(pu * 8);
      const c1y = -16 - 50 * pu;
      const c2x = 35 * Math.cos(pu * 6) + pu * 35;
      const c2y = -16 - 120 * pu;
      const endX = c2x + 20 * Math.sin(pu * 10);
      const endY = -16 - 180 * pu;
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, endX, endY);
      ctx.stroke();

      // 飘动的小烟圈
      if (pu > 0.15 && pu < 0.85) {
        ctx.fillStyle = `rgba(225, 245, 254, ${0.7 * smokeAlpha})`;
        ctx.beginPath();
        ctx.ellipse(c2x, c2y, 14 * pu, 8 * pu, 0.3, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // 6. X 宝藏标记
  function drawXmark(ctx, cx, cy, isGolden, t) {
    ctx.save();
    ctx.translate(cx, cy);
    const pulse = 1 + Math.sin(t * 6) * 0.12;
    ctx.scale(pulse, pulse);

    const r = isGolden ? 60 : 42;
    ctx.strokeStyle = isGolden ? '#FBC02D' : '#E53935';
    ctx.lineWidth = isGolden ? 18 : 12;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-r, -r); ctx.lineTo(r, r);
    ctx.moveTo(r, -r); ctx.lineTo(-r, r);
    ctx.stroke();

    // 内部高光线
    ctx.strokeStyle = isGolden ? '#FFF9C4' : '#FFCDD2';
    ctx.lineWidth = isGolden ? 7 : 4;
    ctx.stroke();

    if (isGolden) {
      // 金色脉动辉光
      drawGlow(ctx, 0, 0, 110, '#FFE082', 0.55);
    }
    ctx.restore();
  }

  // 7. 柔和辉光
  function drawGlow(ctx, cx, cy, r, colorHex, alpha) {
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, colorHex);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = alpha || 0.45;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // 8. 丰富形态彩带纸屑雨 (方形、星形、长条飘带)
  function drawConfetti(ctx, lt, dur) {
    if (lt <= 0 || lt >= dur) return;
    ctx.save();
    const count = 90;
    const CONFETTI_COLORS = ['#FF1744', '#FFD600', '#00E676', '#2979FF', '#FF6D00', '#D500F9', '#FFFFFF'];

    for (let i = 0; i < count; i++) {
      const speed = 120 + ((i * 37) % 180);
      const startX = ((i * 137.5) % 2000) - 40;
      const startY = -80 - ((i * 47) % 300);
      const sway = Math.sin(lt * 2.8 + i * 1.7) * (30 + ((i * 13) % 40));
      const px = startX + sway;
      const py = startY + lt * speed;
      if (py < -20 || py > 1150) continue;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(lt * 4 + i);
      ctx.fillStyle = CONFETTI_COLORS[i % CONFETTI_COLORS.length];

      const kind = i % 3;
      if (kind === 0) {
        // 小长条纸片
        ctx.fillRect(-12, -6, 24, 12);
      } else if (kind === 1) {
        // 小四角星
        ctx.beginPath();
        ctx.moveTo(0, -9); ctx.quadraticCurveTo(0, 0, 9, 0); ctx.quadraticCurveTo(0, 0, 0, 9); ctx.quadraticCurveTo(0, 0, -9, 0); ctx.closePath();
        ctx.fill();
      } else {
        // 扭转飘带
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.quadraticCurveTo(0, 0, 10, 10);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  root.V11Fx = {
    drawExcavationHole,
    drawDust,
    drawStars,
    drawDuckPhysics,
    drawCandle,
    drawXmark,
    drawGlow,
    drawConfetti,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.V11Fx;
})(typeof globalThis !== 'undefined' ? globalThis : this);
