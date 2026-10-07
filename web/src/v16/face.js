// face.js — 挖挖程序化灵动表情系统 (V11)
// 契约: V11Face.draw(ctx, expr, t)
// 在 body 局部坐标系中绘制 (body 原点 [0,0], 尺寸 819x961)
(function (root) {
  'use strict';

  const NAVY = '#0B2F6E';
  const WHITE = '#FFFFFF';
  const BODY_BLUE = '#3CB8FC';
  const MUZZLE_BEIGE = '#FEE7C4';
  const BLUSH = 'rgba(255, 110, 150, 0.45)';
  const TONGUE = '#FF6080';
  const MOUTH_INSIDE = '#081B3E';

  // 基础几何参数 (与 body.png 实测精确对齐)
  const EYE_L = { cx: 185, cy: 572, rx: 76, ry: 126, browY: 432 };
  const EYE_R = { cx: 389, cy: 573, rx: 85, ry: 120, browY: 432 };
  const MOUTH_ANCHOR = { cx: 265, cy: 775 };

  // 表情预设 (Presets)
  const PRESETS = {
    neutral: {
      look: [0, 0],
      lidTop: 0.0, lidBot: 0.0,
      browL: { lift: 0, tilt: 0 }, browR: { lift: 0, tilt: 0 },
      mouth: { open: 0.0, curve: 0.35, width: 80 },
      blush: 0.0, sparkle: 0.0,
    },
    happy: {
      look: [0, 0],
      lidTop: 0.15, lidBot: 0.22,
      browL: { lift: 10, tilt: -0.06 }, browR: { lift: 10, tilt: 0.06 },
      mouth: { open: 0.2, curve: 0.75, width: 95 },
      blush: 0.6, sparkle: 0.4,
    },
    laugh: {
      look: [0, 0],
      squint: true, // 彻底闭合为月牙弯眼
      lidTop: 0.5, lidBot: 0.5,
      browL: { lift: 22, tilt: -0.1 }, browR: { lift: 22, tilt: 0.1 },
      mouth: { open: 0.85, curve: 0.95, width: 110 },
      blush: 0.9, sparkle: 0.8,
    },
    surprise: {
      look: [0, -0.15],
      lidTop: -0.1, lidBot: -0.1, // 瞪得滚圆
      browL: { lift: 32, tilt: 0.14 }, browR: { lift: 32, tilt: -0.14 },
      mouth: { open: 0.75, curve: 0.1, width: 60 }, // 圆形 O 嘴
      blush: 0.25, sparkle: 0.95,
    },
    anticipate: {
      look: [0.15, -0.22],
      lidTop: 0.0, lidBot: 0.15,
      browL: { lift: 18, tilt: -0.1 }, browR: { lift: 18, tilt: 0.1 },
      mouth: { open: 0.25, curve: 0.65, width: 88 },
      blush: 0.5, sparkle: 0.9,
    },
    focus: {
      look: [0.15, 0.3], // 专注盯泥土
      lidTop: 0.25, lidBot: 0.05,
      browL: { lift: -12, tilt: 0.22 }, browR: { lift: -12, tilt: -0.22 }, // 认真眉
      mouth: { open: 0.0, curve: 0.1, width: 70 },
      blush: 0.0, sparkle: 0.0,
    },
    proud: {
      look: [0, -0.32], // 向上看自己的帽子
      lidTop: 0.22, lidBot: 0.22,
      browL: { lift: 14, tilt: -0.15 }, browR: { lift: 14, tilt: 0.15 },
      mouth: { open: 0.3, curve: 0.8, width: 95 },
      blush: 0.65, sparkle: 0.6,
    },
    shy: {
      look: [-0.25, 0.2],
      lidTop: 0.3, lidBot: 0.2,
      browL: { lift: 8, tilt: 0.18 }, browR: { lift: 8, tilt: -0.18 }, // 困惑/害羞眉
      mouth: { open: 0.15, curve: -0.25, width: 68 }, // 调皮歪嘴
      blush: 0.8, sparkle: 0.0,
    },
    talk: {
      look: [0, 0], // 直视开开 (打破第四面墙)
      lidTop: 0.08, lidBot: 0.12,
      browL: { lift: 16, tilt: -0.06 }, browR: { lift: 16, tilt: 0.06 },
      mouth: { open: 0.6, curve: 0.65, width: 92 },
      blush: 0.55, sparkle: 0.7,
    },
    strain: {
      look: [0.15, 0.35],
      lidTop: 0.35, lidBot: 0.20,
      browL: { lift: -18, tilt: 0.28 }, browR: { lift: -18, tilt: -0.28 },
      mouth: { open: 0.12, curve: -0.25, width: 88, isGrimace: true },
      blush: 0.3, sparkle: 0.0,
    },
    blow: {
      look: [0, 0.30], // 专注向下吹蜡烛
      lidTop: 0.22, lidBot: 0.18,
      browL: { lift: 14, tilt: -0.08 }, browR: { lift: 14, tilt: 0.08 },
      mouth: { open: 0.45, curve: 0.0, width: 36, isBlowO: true },
      puff: 1.0,
      blush: 0.8, sparkle: 0.6,
    },
  };

  function blend(p1, p2, u) {
    u = Math.max(0, Math.min(1, u));
    const b = (v1, v2) => v1 + (v2 - v1) * u;
    return {
      look: [b(p1.look[0], p2.look[0]), b(p1.look[1], p2.look[1])],
      lidTop: b(p1.lidTop, p2.lidTop),
      lidBot: b(p1.lidBot, p2.lidBot),
      squint: u > 0.5 ? p2.squint : p1.squint,
      browL: { lift: b(p1.browL.lift, p2.browL.lift), tilt: b(p1.browL.tilt, p2.browL.tilt) },
      browR: { lift: b(p1.browR.lift, p2.browR.tilt), tilt: b(p1.browR.tilt, p2.browR.tilt) },
      mouth: {
        open: b(p1.mouth.open, p2.mouth.open),
        curve: b(p1.mouth.curve, p2.mouth.curve),
        width: b(p1.mouth.width, p2.mouth.width),
        isBlowO: u > 0.5 ? p2.mouth.isBlowO : p1.mouth.isBlowO,
        isGrimace: u > 0.5 ? p2.mouth.isGrimace : p1.mouth.isGrimace,
      },
      puff: b(p1.puff || 0, p2.puff || 0),
      blush: b(p1.blush, p2.blush),
      sparkle: b(p1.sparkle, p2.sparkle),
    };
  }

  // 1. 盖住原图眉毛 (消除重影)
  function cleanOriginalBrows(ctx) {
    ctx.save();
    ctx.fillStyle = BODY_BLUE;
    ctx.beginPath();
    ctx.ellipse(195, 426, 95, 26, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(395, 426, 95, 26, 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. 盖住原图真实嘴巴 (在 y=775, x=265 区域，确保完全消隐)
  function cleanOriginalMouth(ctx) {
    ctx.save();
    ctx.fillStyle = MUZZLE_BEIGE;
    ctx.beginPath();
    ctx.ellipse(MOUTH_ANCHOR.cx, MOUTH_ANCHOR.cy + 12, 108, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 单只眼睛绘制
  function drawEye(ctx, eye, lookX, lookY, lidTop, lidBot, sparkle, isSquint) {
    const { cx, cy, rx, ry } = eye;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 3, ry - 3, 0, 0, Math.PI * 2);
    ctx.clip();

    if (isSquint) {
      // 眯眼大笑模式: 眼眶内全填蓝色，画一条快乐的 ∩ 弯眼弧
      ctx.fillStyle = BODY_BLUE;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      const arcY = cy + 15;
      ctx.moveTo(cx - rx * 0.68, arcY + 6);
      ctx.quadraticCurveTo(cx, arcY - 38, cx + rx * 0.68, arcY + 6);
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 普通模式: 白眼球底色
    ctx.fillStyle = WHITE;
    ctx.fill();

    // 瞳孔 (navy 椭圆)
    const pupilRx = rx * 0.44;
    const pupilRy = ry * 0.46;
    const maxShiftX = rx * 0.38;
    const maxShiftY = ry * 0.35;
    const px = cx + lookX * maxShiftX;
    const py = cy + lookY * maxShiftY;

    ctx.beginPath();
    ctx.ellipse(px, py, pupilRx, pupilRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = NAVY;
    ctx.fill();

    // 瞳孔高光 (双白点)
    const h1x = px - pupilRx * 0.32;
    const h1y = py - pupilRy * 0.38;
    const h1r = pupilRx * 0.36;
    ctx.beginPath();
    ctx.arc(h1x, h1y, h1r, 0, Math.PI * 2);
    ctx.fillStyle = WHITE;
    ctx.fill();

    const h2x = px + pupilRx * 0.35;
    const h2y = py + pupilRy * 0.32;
    const h2r = pupilRx * 0.18;
    ctx.beginPath();
    ctx.arc(h2x, h2y, h2r, 0, Math.PI * 2);
    ctx.fillStyle = WHITE;
    ctx.fill();

    // 星光闪烁
    if (sparkle > 0.05) {
      ctx.save();
      ctx.translate(h1x, h1y);
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 3.8 * sparkle;
      ctx.beginPath();
      const sLen = 16 * sparkle;
      ctx.moveTo(-sLen, 0); ctx.lineTo(sLen, 0);
      ctx.moveTo(0, -sLen); ctx.lineTo(0, sLen);
      ctx.stroke();
      ctx.restore();
    }

    // 上眼睑盖片 (向下包)
    if (lidTop > 0.02) {
      ctx.fillStyle = BODY_BLUE;
      const lidY = (cy - ry) + lidTop * (ry * 2);
      ctx.beginPath();
      ctx.moveTo(cx - rx - 8, cy - ry - 8);
      ctx.lineTo(cx + rx + 8, cy - ry - 8);
      ctx.lineTo(cx + rx + 8, lidY);
      ctx.quadraticCurveTo(cx, lidY + ry * 0.32 * (1 - lidTop), cx - rx - 8, lidY);
      ctx.closePath();
      ctx.fill();
    }

    // 下眼睑盖片 (向上推，笑眼)
    if (lidBot > 0.02) {
      ctx.fillStyle = BODY_BLUE;
      const botY = (cy + ry) - lidBot * (ry * 1.8);
      ctx.beginPath();
      ctx.moveTo(cx - rx - 8, cy + ry + 8);
      ctx.lineTo(cx + rx + 8, cy + ry + 8);
      ctx.lineTo(cx + rx + 8, botY);
      ctx.quadraticCurveTo(cx, botY - ry * 0.32 * (1 - lidBot), cx - rx - 8, botY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // 眉毛绘制
  function drawBrow(ctx, eye, lift, tilt, isLeft) {
    const bx = eye.cx;
    const by = eye.browY - lift;
    const len = eye.rx * 0.85;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(tilt);

    ctx.beginPath();
    const x1 = -len, x2 = len;
    const sign = isLeft ? 1 : -1;
    ctx.moveTo(x1, 6 * sign);
    ctx.quadraticCurveTo(0, -15, x2, -6 * sign);
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.strokeStyle = NAVY;
    ctx.stroke();

    ctx.restore();
  }

  // 嘴巴绘制
  function drawMouth(ctx, mCfg) {
    const { cx, cy } = MOUTH_ANCHOR;
    const open = Math.max(0, Math.min(1, mCfg.open || 0));
    const curve = mCfg.curve !== undefined ? mCfg.curve : 0.4;
    const w = (mCfg.width || 80) * 0.5;

    ctx.save();

    if (mCfg.isBlowO) {
      // 吹气小圆嘴 (O型收拢)
      const r = Math.max(16, w * 0.55);
      ctx.beginPath();
      ctx.arc(cx, cy + 6, r, 0, Math.PI * 2);
      ctx.fillStyle = MOUTH_INSIDE;
      ctx.fill();
      ctx.lineWidth = 12;
      ctx.strokeStyle = NAVY;
      ctx.stroke();

      // 小气流线条 (向下吹气)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        const ox = cx + i * 14;
        const oy = cy + 22;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + i * 8, oy + 26);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (mCfg.isGrimace) {
      // 咬牙发力嘴 (圆润紧抿白牙，蓝海描边与细腻牙线)
      const gw = w * 0.9;
      const leftX = cx - gw, rightX = cx + gw;
      ctx.beginPath();
      ctx.roundRect(leftX, cy - 9, gw * 2, 22, 11);
      ctx.fillStyle = WHITE;
      ctx.fill();
      ctx.lineWidth = 9;
      ctx.strokeStyle = NAVY;
      ctx.stroke();
      // 牙缝咬合横中线与牙齿竖线
      ctx.beginPath();
      ctx.moveTo(leftX + 4, cy + 2); ctx.lineTo(rightX - 4, cy + 2);
      for (let tx = leftX + 14; tx < rightX - 6; tx += 15) {
        ctx.moveTo(tx, cy - 7); ctx.lineTo(tx, cy + 11);
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(11, 47, 110, 0.4)';
      ctx.stroke();
      ctx.restore();
      return;
    }

    const leftX = cx - w, rightX = cx + w;
    const cornerY = cy - 4;
    const topCtrlY = cy - 4 - 4 * curve;
    const bottomY = cy + 4 + open * 48;
    const botCtrlY = cy + (bottomY - cy) * 1.25 + 16 * curve;

    if (open > 0.12) {
      // 张嘴模式 (D 形/豆形)
      ctx.beginPath();
      ctx.moveTo(leftX, cornerY);
      ctx.quadraticCurveTo(cx, topCtrlY, rightX, cornerY);
      ctx.quadraticCurveTo(cx, botCtrlY, leftX, cornerY);
      ctx.closePath();

      // 口腔内部
      ctx.fillStyle = MOUTH_INSIDE;
      ctx.fill();

      // 小舌头
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(cx, bottomY + 2, w * 0.58, 22 * open, 0, 0, Math.PI * 2);
      ctx.fillStyle = TONGUE;
      ctx.fill();
      ctx.restore();

      // 嘴唇外描边
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();
    } else {
      // 微笑单线弧
      ctx.beginPath();
      ctx.moveTo(leftX, cornerY);
      const sagY = cy + 12 + 18 * curve;
      ctx.quadraticCurveTo(cx, sagY, rightX, cornerY);
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();

      // 嘴角小翘弧
      if (curve > 0.3) {
        ctx.beginPath();
        ctx.moveTo(rightX - 2, cornerY - 6);
        ctx.lineTo(rightX + 5, cornerY + 3);
        ctx.lineWidth = 8;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // 鼓起的双腮 (吹蜡烛专用)
  function drawPuffedCheeks(ctx, puff) {
    if (puff <= 0.05) return;
    ctx.save();
    const r = 46 * puff;
    ctx.fillStyle = BODY_BLUE;
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 10;

    // 左鼓腮
    ctx.beginPath();
    ctx.arc(102, 742, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 右鼓腮
    ctx.beginPath();
    ctx.arc(426, 742, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 腮红高光
    ctx.fillStyle = BLUSH;
    ctx.beginPath();
    ctx.arc(102, 742, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(426, 742, r * 0.72, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 腮红
  function drawBlush(ctx, amt) {
    if (amt <= 0.05) return;
    ctx.save();
    ctx.fillStyle = BLUSH;
    // 左腮红
    ctx.beginPath();
    ctx.ellipse(EYE_L.cx - 55, EYE_L.cy + 75, 42 * amt, 24 * amt, -0.12, 0, Math.PI * 2);
    ctx.fill();
    // 右腮红
    ctx.beginPath();
    ctx.ellipse(EYE_R.cx + 62, EYE_R.cy + 75, 44 * amt, 25 * amt, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 呼吸自然眨眼计算 (每 3.8s 一次，持续 0.20s)
  function naturalBlink(t) {
    let ph = t % 3.8;
    if (ph < 0) ph += 3.8;
    if (ph >= 0.20) return 0;
    return Math.sin(Math.PI * ph / 0.20);
  }

  // 主绘制入口
  function draw(ctx, exprCfg, lookAt, mouthOpen, t) {
    let base = typeof exprCfg === 'string' ? (PRESETS[exprCfg] || PRESETS.neutral) : (exprCfg || PRESETS.neutral);
    let expr = Object.assign({}, base);

    // 覆盖视线
    if (lookAt && Array.isArray(lookAt) && (lookAt[0] !== 0 || lookAt[1] !== 0 || !expr.look)) {
      expr.look = lookAt;
    }

    // 口型同步 (仅在非 blow / 非 grimace 时生效)
    if (mouthOpen !== undefined && mouthOpen !== null && !expr.mouth?.isBlowO && !expr.mouth?.isGrimace) {
      expr.mouth = Object.assign({}, base.mouth || {});
      expr.mouth.open = Math.max(expr.mouth.open || 0, mouthOpen);
    }

    const effectiveT = typeof t === 'number' ? t : (typeof lookAt === 'number' ? lookAt : 0);
    const blink = naturalBlink(effectiveT);

    // 1. 盖住原图旧眉毛与旧嘴巴
    cleanOriginalBrows(ctx);
    cleanOriginalMouth(ctx);

    // 2. 鼓腮帮 (如果是吹蜡烛)
    drawPuffedCheeks(ctx, expr.puff || (exprCfg === 'blow' ? 1.0 : 0));

    // 3. 融合眨眼
    const effectiveLidTop = Math.max(expr.lidTop || 0, blink * 0.95);
    const lookX = expr.look ? expr.look[0] : 0;
    const lookY = expr.look ? expr.look[1] : 0;
    const sparkle = expr.sparkle || 0;
    const isSquint = !!expr.squint;

    // 4. 腮红
    drawBlush(ctx, expr.blush || 0);

    // 5. 双眼
    drawEye(ctx, EYE_L, lookX, lookY, effectiveLidTop, expr.lidBot || 0, sparkle, isSquint);
    drawEye(ctx, EYE_R, lookX, lookY, effectiveLidTop, expr.lidBot || 0, sparkle, isSquint);

    // 6. 眉毛
    const bL = expr.browL || { lift: 0, tilt: 0 };
    const bR = expr.browR || { lift: 0, tilt: 0 };
    drawBrow(ctx, EYE_L, bL.lift, bL.tilt, true);
    drawBrow(ctx, EYE_R, bR.lift, bR.tilt, false);

    // 7. 嘴巴
    drawMouth(ctx, expr.mouth || { open: 0, curve: 0.4, width: 80 });
  }

  const Face = {
    PRESETS,
    blend,
    draw,
    naturalBlink,
    EYE_L, EYE_R, MOUTH_ANCHOR,
  };

  root.V12Face = Face;
  root.V11Face = Face;
  if (typeof module !== 'undefined' && module.exports) module.exports = Face;
})(typeof globalThis !== 'undefined' ? globalThis : this);
