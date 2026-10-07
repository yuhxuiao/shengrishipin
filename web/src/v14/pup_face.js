// pup_face.js — 布鲁伊与宾果配角程序化灵动面部与表情系统 (V12)
// 契约: V12PupFace.draw(ctx, charKey, exprName, lookAt, t, scale_base, headInfo)
// 在 head.png 局部图像空间 (0..w, 0..h) 绘制覆盖, 保证与原图五官精确重合
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // 官方调色板 (与 Bluey & Bingo 官方原片矢量风格严格一致)
  const NAVY = '#0B2F6E';
  const WHITE = '#FFFFFF';
  const BLUEY_BLUE = '#8EC5EC';
  const BLUEY_DARK = '#2B3B6D';
  const BLUEY_MUZZLE = '#E8BE72';
  const BINGO_ORANGE = '#F8A055';
  const BINGO_DARK = '#BA5924';
  const BINGO_MUZZLE = '#FCEAD2';
  const BLUSH_COLOR = 'rgba(255, 105, 145, 0.45)';
  const TONGUE_COLOR = '#FF6584';
  const MOUTH_INSIDE = '#081B3E';

  // 角色五官几何配置 (基于 head.png 真实像素测绘)
  const CHAR_FEAT = {
    bluey: {
      seed: 41.73,
      w: 630,
      h: 770,
      // 左眼 (观众视角偏左, 位于深蓝毛发区)
      eyeL: { cx: 277, cy: 459, rx: 88, ry: 124, lidColor: BLUEY_DARK, pupilCx: 277, pupilCy: 459, prx: 28, pry: 52 },
      // 右眼 (观众视角偏右, 位于浅蓝毛发区)
      eyeR: { cx: 472, cy: 440, rx: 74, ry: 95, lidColor: BLUEY_BLUE, pupilCx: 466, pupilCy: 454, prx: 26, pry: 48 },
      // 眉毛
      browL: { cx: 277, cy: 300, rx: 45, ry: 20 },
      browR: { cx: 466, cy: 290, rx: 42, ry: 19 },
      browColor: '#C8E6F8',
      browBorder: BLUEY_DARK,
      // 嘴部吻部遮盖与锚点
      muzzleColor: BLUEY_MUZZLE,
      mouthErase: { cx: 380, cy: 660, rx: 95, ry: 35 },
      mouth: { cx: 380, cy: 660, w: 105 },
      // 脸颊腮红
      blushL: { cx: 165, cy: 590, r: 35 },
      blushR: { cx: 540, cy: 540, r: 32 },
    },
    bingo: {
      seed: 73.19,
      w: 1030,
      h: 1405,
      // 左眼 (观众视角偏左, 实测 pupilCx=489, pupilCy=593)
      eyeL: { cx: 490, cy: 580, rx: 140, ry: 190, lidColor: BINGO_DARK, pupilCx: 489, pupilCy: 593, prx: 38, pry: 75 },
      // 右眼 (观众视角偏右, 实测 pupilCx=940, pupilCy=540)
      eyeR: { cx: 890, cy: 540, rx: 110, ry: 160, lidColor: BINGO_ORANGE, pupilCx: 940, pupilCy: 540, prx: 34, pry: 68 },
      // 眉毛
      browL: { cx: 489, cy: 310, rx: 75, ry: 35 },
      browR: { cx: 940, cy: 285, rx: 70, ry: 32 },
      browColor: BINGO_MUZZLE,
      browBorder: BINGO_DARK,
      // 嘴部吻部遮盖与锚点
      muzzleColor: BINGO_MUZZLE,
      mouthErase: { cx: 680, cy: 1020, rx: 145, ry: 55 },
      mouth: { cx: 680, cy: 1020, w: 175 },
      // 脸颊腮红
      blushL: { cx: 320, cy: 780, r: 55 },
      blushR: { cx: 960, cy: 720, r: 50 },
    },
  };

  // 纯函数确定性眨眼计算 (每 2.5~5s 随机但确定性, 持续 0.16s, 偶尔双眨)
  function calcBlinkAmt(t, seed) {
    const cycle = 3.6;
    const cycleIdx = Math.floor((t + seed) / cycle);
    const phase = (t + seed) - cycleIdx * cycle;
    // 确定性伪随机哈希
    const h = Math.sin(cycleIdx * 93.17 + seed * 15.3) * 43758.5453;
    const rnd = h - Math.floor(h);
    const blinkStart = 0.8 + rnd * 1.8;
    const dur = 0.16;
    const dt = phase - blinkStart;
    if (dt >= 0 && dt < dur) {
      return Math.sin(Math.PI * dt / dur);
    }
    // 概率性双眨眼
    if (rnd > 0.68) {
      const dt2 = phase - (blinkStart + 0.22);
      if (dt2 >= 0 && dt2 < dur) {
        return Math.sin(Math.PI * dt2 / dur);
      }
    }
    return 0;
  }

  // 绘制单只眼睛
  function drawPupEye(ctx, eye, lookX, lookY, blinkAmt, isSquint, isSurprise, hasGaze) {
    const { cx, cy, rx, ry, lidColor, pupilCx, pupilCy, prx, pry } = eye;

    // 1. 眯眼笑 (完全闭合为快乐的月牙笑弧)
    if (isSquint) {
      ctx.save();
      // 用眼眶剪裁, 填眼睑底色
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      ctx.clip();
      ctx.fillStyle = lidColor;
      ctx.fillRect(cx - rx - 10, cy - ry - 10, (rx + 10) * 2, (ry + 10) * 2);

      // 快乐弯眼线
      ctx.beginPath();
      const arcY = cy + ry * 0.15;
      ctx.moveTo(cx - rx * 0.72, arcY + 6);
      ctx.quadraticCurveTo(cx, arcY - ry * 0.35, cx + rx * 0.72, arcY + 6);
      ctx.lineWidth = Math.max(7, rx * 0.14);
      ctx.lineCap = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();

      ctx.restore();

      // 眼眶外边框描边
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      ctx.lineWidth = Math.max(7, rx * 0.08);
      ctx.strokeStyle = NAVY;
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 2. 视线偏移 / 惊讶眼瞳
    if (hasGaze || isSurprise) {
      ctx.save();
      // 在原瞳孔位置用白眼球底色精准擦除旧瞳孔 (不伤及眼眶外边缘)
      ctx.beginPath();
      ctx.ellipse(pupilCx, pupilCy, prx * 1.25, pry * 1.25, 0, 0, TAU);
      ctx.fillStyle = WHITE;
      ctx.fill();

      // 绘制带偏移的新瞳孔 (纯正黑色/深蓝 navy 椭圆)
      const maxShiftX = rx * 0.32;
      const maxShiftY = ry * 0.28;
      const px = pupilCx + clamp(lookX, -1, 1) * maxShiftX;
      const py = pupilCy + clamp(lookY, -1, 1) * maxShiftY;
      const curPrx = isSurprise ? prx * 0.82 : prx;
      const curPry = isSurprise ? pry * 0.82 : pry;

      ctx.beginPath();
      ctx.ellipse(px, py, curPrx, curPry, 0, 0, TAU);
      ctx.fillStyle = NAVY;
      ctx.fill();
      ctx.restore();
    }

    // 3. 自然眨眼 (上眼睑下阖至中央, 带弧线闭合)
    if (blinkAmt > 0.02) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      ctx.clip();

      // 上眼睑向下覆盖
      const closeY = (cy - ry) + blinkAmt * (ry * 2.0);
      ctx.fillStyle = lidColor;
      ctx.beginPath();
      ctx.moveTo(cx - rx - 10, cy - ry - 10);
      ctx.lineTo(cx + rx + 10, cy - ry - 10);
      ctx.lineTo(cx + rx + 10, closeY);
      ctx.quadraticCurveTo(cx, closeY + ry * 0.20 * (1 - blinkAmt), cx - rx - 10, closeY);
      ctx.closePath();
      ctx.fill();

      // 闭眼睫毛/褶皱线
      if (blinkAmt > 0.4) {
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = Math.max(6, rx * 0.12);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.75, closeY);
        ctx.quadraticCurveTo(cx, closeY + ry * 0.15, cx + rx * 0.75, closeY);
        ctx.stroke();
      }

      ctx.restore();

      // 眼眶外边框重描
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      ctx.lineWidth = Math.max(7, rx * 0.08);
      ctx.strokeStyle = NAVY;
      ctx.stroke();
      ctx.restore();
    }
  }

  // 绘制嘴部覆盖 (覆盖原图静态嘴线, 呈现动态表情)
  function drawPupMouth(ctx, feat, expr, t) {
    const { muzzleColor, mouthErase, mouth } = feat;
    const { cx, cy, w } = mouth;

    ctx.save();

    // 1. 消除原图嘴线 (用吻部底色精准遮盖旧嘴弧线)
    ctx.fillStyle = muzzleColor;
    ctx.beginPath();
    ctx.ellipse(mouthErase.cx, mouthErase.cy, mouthErase.rx, mouthErase.ry, 0, 0, TAU);
    ctx.fill();

    // 2. 根据表情绘制新嘴型
    if (expr === 'laugh') {
      // 开口大笑 (月牙大张嘴 + 露粉红小舌头)
      const mw = w * 0.55;
      const topY = cy - 6;
      const botY = cy + 30;
      ctx.beginPath();
      ctx.moveTo(cx - mw, topY);
      ctx.quadraticCurveTo(cx, topY - 5, cx + mw, topY);
      ctx.quadraticCurveTo(cx, botY + 14, cx - mw, topY);
      ctx.closePath();
      ctx.fillStyle = MOUTH_INSIDE;
      ctx.fill();

      // 小舌头
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(cx, botY + 4, mw * 0.65, 18, 0, 0, TAU);
      ctx.fillStyle = TONGUE_COLOR;
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = Math.max(6, w * 0.08);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();

    } else if (expr === 'surprise') {
      // 惊讶 O 嘴
      const r = Math.max(16, w * 0.20);
      ctx.beginPath();
      ctx.arc(cx, cy + 6, r, 0, TAU);
      ctx.fillStyle = MOUTH_INSIDE;
      ctx.fill();
      ctx.lineWidth = Math.max(6, w * 0.08);
      ctx.strokeStyle = NAVY;
      ctx.stroke();

    } else if (expr === 'talk') {
      // 说话嘴型 (随时间连续开合 3.6 Hz 幼儿自然语速)
      const open = Math.abs(Math.sin(t * Math.PI * 3.6)) * 0.85;
      const mw = w * 0.48;
      const topY = cy - 4;
      const botY = cy + open * 26;

      ctx.beginPath();
      ctx.moveTo(cx - mw, topY);
      ctx.quadraticCurveTo(cx, topY - 3, cx + mw, topY);
      ctx.quadraticCurveTo(cx, botY + 10, cx - mw, topY);
      ctx.closePath();
      ctx.fillStyle = MOUTH_INSIDE;
      ctx.fill();

      if (open > 0.25) {
        ctx.save();
        ctx.clip();
        ctx.beginPath();
        ctx.ellipse(cx, botY + 3, mw * 0.6, 14 * open, 0, 0, TAU);
        ctx.fillStyle = TONGUE_COLOR;
        ctx.fill();
        ctx.restore();
      }

      ctx.lineWidth = Math.max(6, w * 0.08);
      ctx.lineCap = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();

    } else if (expr === 'shy') {
      // 害羞歪嘴小微笑
      const leftX = cx - w * 0.35;
      const rightX = cx + w * 0.45;
      ctx.beginPath();
      ctx.moveTo(leftX, cy + 4);
      ctx.quadraticCurveTo(cx + 8, cy + 22, rightX, cy - 2);
      ctx.lineWidth = Math.max(6, w * 0.08);
      ctx.lineCap = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();
      // 嘴角小翘
      ctx.beginPath();
      ctx.moveTo(rightX - 2, cy - 5);
      ctx.lineTo(rightX + 4, cy + 2);
      ctx.lineWidth = Math.max(4, w * 0.06);
      ctx.stroke();

    } else if (expr === 'sad') {
      // 委屈扁嘴 (向下撇)
      const mw = w * 0.42;
      ctx.beginPath();
      ctx.moveTo(cx - mw, cy + 18);
      ctx.quadraticCurveTo(cx, cy - 2, cx + mw, cy + 18);
      ctx.lineWidth = Math.max(6, w * 0.08);
      ctx.lineCap = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();

    } else {
      // 默认 happy
      const mw = w * 0.45;
      ctx.beginPath();
      ctx.moveTo(cx - mw, cy + 2);
      ctx.quadraticCurveTo(cx, cy + 24, cx + mw, cy + 2);
      ctx.lineWidth = Math.max(6, w * 0.08);
      ctx.lineCap = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();
      // 嘴角小上翘
      ctx.beginPath();
      ctx.moveTo(cx + mw - 2, cy - 4);
      ctx.lineTo(cx + mw + 4, cy + 4);
      ctx.lineWidth = Math.max(4, w * 0.06);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 绘制脸颊腮红
  function drawPupBlush(ctx, feat, amt) {
    if (amt <= 0.02) return;
    const { blushL, blushR } = feat;
    ctx.save();
    ctx.fillStyle = BLUSH_COLOR;
    ctx.beginPath();
    ctx.ellipse(blushL.cx, blushL.cy, blushL.r * amt, blushL.r * 0.65 * amt, -0.1, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(blushR.cx, blushR.cy, blushR.r * amt, blushR.r * 0.65 * amt, 0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // 绘制眉毛 (随表情抬高/倾斜)
  function drawPupBrows(ctx, feat, expr) {
    const { browL, browR, browColor, browBorder } = feat;
    let lift = 0, tilt = 0;
    if (expr === 'surprise') { lift = 22; tilt = 0.08; }
    else if (expr === 'laugh') { lift = 10; tilt = -0.06; }
    else if (expr === 'sad') { lift = 4; tilt = -0.16; } // 八字眉
    else if (expr === 'shy') { lift = -3; tilt = 0.12; }

    const drawOne = (b, sign) => {
      ctx.save();
      ctx.translate(b.cx, b.cy - lift);
      ctx.rotate(tilt * sign);
      ctx.beginPath();
      ctx.ellipse(0, 0, b.rx, b.ry, 0, 0, TAU);
      ctx.fillStyle = browColor;
      ctx.fill();
      ctx.lineWidth = Math.max(5, b.rx * 0.12);
      ctx.strokeStyle = browBorder;
      ctx.stroke();
      ctx.restore();
    };

    drawOne(browL, -1);
    drawOne(browR, 1);
  }

  // 主入口: 在 head.png 局部空间中绘制
  function draw(ctx, charKey, exprName, lookAt, t, scale_base, headInfo) {
    const key = charKey === 'bingo' ? 'bingo' : 'bluey';
    const feat = CHAR_FEAT[key];
    if (!feat || !headInfo) return;

    const expr = exprName || 'happy';
    const lookX = (lookAt && Array.isArray(lookAt)) ? lookAt[0] : 0;
    const lookY = (lookAt && Array.isArray(lookAt)) ? lookAt[1] : 0;
    const effectiveT = typeof t === 'number' ? t : 0;

    const blinkAmt = calcBlinkAmt(effectiveT, feat.seed);
    const isSquint = expr === 'laugh';
    const isSurprise = expr === 'surprise';

    // 判断是否有有效视线偏移或非默认表情
    const hasGaze = Math.abs(lookX) > 0.05 || Math.abs(lookY) > 0.05;
    const isNonDefaultExpr = expr !== 'happy';
    const needsEyeRedraw = blinkAmt > 0.01 || hasGaze || isSquint || isSurprise;

    // 默认 happy 且无眨眼、无视线偏移时: 原画最为完美, 完全不打扰原图
    if (!needsEyeRedraw && !isNonDefaultExpr) {
      return;
    }

    ctx.save();
    // 移入 head.png 原始图像绝对像素空间
    ctx.translate(-headInfo.pivot_in_img[0], -headInfo.pivot_in_img[1]);

    // 1. 双眼覆盖重绘 (仅在眨眼、视线改变或特定眼部表情时)
    if (needsEyeRedraw) {
      drawPupEye(ctx, feat.eyeL, lookX, lookY, blinkAmt, isSquint, isSurprise, hasGaze);
      drawPupEye(ctx, feat.eyeR, lookX, lookY, blinkAmt, isSquint, isSurprise, hasGaze);
    }

    // 2. 眉毛动态微调
    if (isNonDefaultExpr && (isSurprise || expr === 'sad' || expr === 'shy')) {
      drawPupBrows(ctx, feat, expr);
    }

    // 3. 动态嘴部覆盖 (覆盖原图旧嘴线)
    if (isNonDefaultExpr) {
      drawPupMouth(ctx, feat, expr, effectiveT);
    }

    // 4. 脸颊腮红
    const blushAmt = expr === 'laugh' ? 0.9 : (expr === 'shy' ? 0.8 : 0);
    drawPupBlush(ctx, feat, blushAmt);

    ctx.restore();
  }

  const PupFace = {
    CHAR_FEAT,
    calcBlinkAmt,
    draw,
  };

  root.V12PupFace = PupFace;
  root.V11PupFace = PupFace;
  if (typeof module !== 'undefined' && module.exports) module.exports = PupFace;
})(typeof globalThis !== 'undefined' ? globalThis : this);
