// transitions.js — V14 全时动态转场合成系统
//
// ==================== 转场库接口规范与使用指南 ====================
// 契约: 纯函数合成, 输入两张在当前时间窗随绝对时间 t 真实动态渲染好的离屏画布:
//   ctx: 主画布渲染上下文
//   canvasA: 上一镜头全时动态离屏画布 (prevShot)
//   canvasB: 本镜头全时动态离屏画布 (currShot)
//   u: 跨镜过渡进度 (0.0 ~ 1.0, 0.5 为精准镜头切点 cutT)
//   params: shots.js 中镜头 transitionIn 对象 (如 { type: 'iris', dur: 0.6, cx: 960, cy: 540 })
//
// -------------------- 完整转场清单与视觉特性 --------------------
// 1. cut: 经典硬切 (中间点瞬切, 适用于惊喜/快速反应)
// 2. dissolve: 电影级柔和叠化 (适用于时间流逝、回忆、抒情情绪)
// 3. iris: 经典卡通圆环收放 (加粗深蓝描边 #0B2F6E 14px + 金黄闪烁内边框 #FFE082 + 周围旋转微光闪烁星点; 支持 cx/cy 聚焦角色)
// 4. star_wipe: 黄金比例五角星展开 (五角星旋转放射张开, 16px 深蓝描边 + 金黄内边框 + 12~16 颗伴随散开的彩色旋转小星星)
// 5. balloon_wipe: 派对气球群飞过擦除 (密集团簇 50+ 五彩气球三层错落呼啸掠过屏幕, 气球群遮挡后方自然拉出新画面, 带彩带飘扬)
// 6. push: 新镜推走旧镜 (支持 left/right/up/down, 接触面带 48px 柔和渐变分界阴影与双色卡片描边, 消除生硬折线)
// 7. whip: 动态甩镜横摇 (极速位移 + 8层动态运动模糊重影 + 高速方向速度线拖影)
// 8. zoom_blur: 惊喜放射推进 (放射放大旧镜头 + 极速砸入新镜头 + 放射冲击线与屏幕微闪)
// 9. wipe: 经典方向擦除 (支持 right/left/down/up, 带柔和拖尾阴影与双色描边线)
//
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const NAVY = '#0B2F6E';

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const easeInOutCubic = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
  const easeInCubic = u => u * u * u;
  const backOut = (u, s = 1.70158) => {
    const p = u - 1;
    return p * p * ((s + 1) * p + s) + 1;
  };

  // 确定性随机数 (无跨帧状态)
  function pseudoRand(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  // 绘制 4 角卡通闪烁微星
  function drawMiniStar(ctx, cx, cy, rOuter, rInner, points = 4, rot = 0, fill = '#FFE082', stroke = NAVY, strokeW = 2.0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.beginPath();
    const total = points * 2;
    for (let i = 0; i < total; i++) {
      const ang = (i / total) * TAU - Math.PI / 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke && strokeW > 0) ctx.stroke();
    ctx.restore();
  }

  const registry = {};

  function register(type, fn) {
    registry[type] = fn;
  }

  // ==================== 1. cut: 经典瞬切 ====================
  register('cut', (ctx, canvasA, canvasB, u, params) => {
    if (u < 0.5) {
      ctx.drawImage(canvasA, 0, 0);
    } else {
      ctx.drawImage(canvasB, 0, 0);
    }
  });

  // ==================== 2. dissolve: 柔和全屏交叉叠化 ====================
  register('dissolve', (ctx, canvasA, canvasB, u, params) => {
    ctx.drawImage(canvasA, 0, 0);
    ctx.save();
    ctx.globalAlpha = clamp(u, 0, 1);
    ctx.drawImage(canvasB, 0, 0);
    ctx.restore();
  });

  // ==================== 3. iris: 经典卡通圆环收放 (深化升级) ====================
  // 经典卡通收放 + 粗深蓝描边 (#0B2F6E, 14px) + 金黄色闪烁内边框 (#FFE082) + 四周卡通微光颗粒
  register('iris', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const cx = p.cx !== undefined ? p.cx : W / 2;
    const cy = p.cy !== undefined ? p.cy : H / 2;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 60;
    const minR = p.minR !== undefined ? p.minR : 16;
    const borderW = p.borderWidth || 14;
    const borderCol = p.borderColor || NAVY;
    const mode = p.mode || 'classic'; // 'classic' (收+放), 'open' (只放), 'close' (只收)

    // 绘制圆环轮廓与环周闪烁微粒小辅助函数
    function drawIrisAccents(c, currentR, progress) {
      if (currentR <= 4 || currentR >= maxR * 0.98) return;

      // 1. 深蓝厚重外边框
      c.beginPath();
      c.arc(cx, cy, currentR, 0, TAU);
      c.lineWidth = borderW;
      c.strokeStyle = borderCol;
      c.stroke();

      // 2. 金黄色闪烁内边框
      c.beginPath();
      c.arc(cx, cy, Math.max(0, currentR - borderW * 0.36), 0, TAU);
      c.lineWidth = 4.2;
      c.strokeStyle = '#FFE082';
      c.stroke();

      // 3. 奶油白极细高光内弧
      c.beginPath();
      c.arc(cx, cy, Math.max(0, currentR - borderW * 0.65), 0, TAU);
      c.lineWidth = 1.8;
      c.strokeStyle = 'rgba(255, 253, 231, 0.85)';
      c.stroke();

      // 4. 圆环外周散发的卡通微光颗粒 (10 颗 4 角金星伴随旋转闪烁)
      const starCount = 10;
      const rot = progress * 4.2;
      for (let i = 0; i < starCount; i++) {
        const ang = (i / starCount) * TAU + rot;
        const wobble = Math.sin(progress * 18 + i * 2.3) * 8;
        const starDist = currentR + borderW * 0.5 + 14 + wobble;
        const sx = cx + Math.cos(ang) * starDist;
        const sy = cy + Math.sin(ang) * starDist;

        // 边界外不画
        if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;

        const pulse = Math.sin(progress * 15 + i * 1.8) * 0.35 + 0.65;
        const rOut = (8 + (i % 3) * 3) * pulse;
        const rIn = rOut * 0.35;
        const fillCol = (i % 2 === 0) ? '#FFE082' : '#FFFDE7';

        drawMiniStar(c, sx, sy, rOut, rIn, 4, ang + rot * 0.5, fillCol, NAVY, 1.8);
      }
    }

    ctx.save();

    if (mode === 'open') {
      // 单向张开模式: A 为底, B 从中心向四周盛大绽开
      const prog = easeInOutCubic(clamp(u, 0, 1));
      const r = prog * maxR;

      ctx.drawImage(canvasA, 0, 0);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, r), 0, TAU);
      ctx.clip();
      ctx.drawImage(canvasB, 0, 0);
      ctx.restore();

      drawIrisAccents(ctx, r, prog);
    } else if (mode === 'close') {
      // 单向收缩模式: A 收缩为小圆陷入深蓝底
      const prog = easeInOutCubic(clamp(u, 0, 1));
      const r = (1 - prog) * maxR;

      ctx.fillStyle = '#071E4A';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, r), 0, TAU);
      ctx.clip();
      ctx.drawImage(canvasA, 0, 0);
      ctx.restore();

      drawIrisAccents(ctx, r, prog);
    } else {
      // 默认经典模式: 0.0 ~ 0.5 镜头 A 聚焦收缩至小圆, 0.5 ~ 1.0 镜头 B 从该点盛大张开
      if (u < 0.5) {
        const prog = easeInCubic(u / 0.5);
        const r = maxR - prog * (maxR - minR);

        // 深蓝卡通底色
        ctx.fillStyle = '#071E4A';
        ctx.fillRect(0, 0, W, H);

        // 剪裁绘制上一镜头 A
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0, r), 0, TAU);
        ctx.clip();
        ctx.drawImage(canvasA, 0, 0);
        ctx.restore();

        drawIrisAccents(ctx, r, u / 0.5);
      } else {
        const prog = easeOutCubic((u - 0.5) / 0.5);
        const r = minR + prog * (maxR - minR);

        // 深蓝卡通底色
        ctx.fillStyle = '#071E4A';
        ctx.fillRect(0, 0, W, H);

        // 剪裁绘制本镜头 B
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0, r), 0, TAU);
        ctx.clip();
        ctx.drawImage(canvasB, 0, 0);
        ctx.restore();

        drawIrisAccents(ctx, r, (u - 0.5) / 0.5);
      }
    }

    ctx.restore();
  });

  // ==================== 4. star_wipe: 黄金比例五角星展开 (深化升级) ====================
  // 黄金比例五角星自中心向四周放射旋转张开, 16px 深蓝描边 + 金黄内边框 + 14颗彩色小星星伴随散开
  register('star_wipe', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const cx = p.cx !== undefined ? p.cx : W / 2;
    const cy = p.cy !== undefined ? p.cy : H / 2;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.38;
    const prog = easeInOutCubic(clamp(u, 0, 1));
    const rOuter = prog * maxR;
    // 经典正五角星黄金比例: rInner = rOuter * ((3 - sqrt(5)) / 2) ≈ 0.381966
    const rInner = rOuter * 0.381966;
    const rot = prog * 0.45; // 伴随平滑旋转带来强烈动感

    ctx.drawImage(canvasA, 0, 0);

    if (rOuter <= 2) return;

    // 绘制五角星路径
    function pathStar(c, ro, ri, roff) {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * TAU - Math.PI / 2 + roff;
        const rad = (i % 2 === 0 ? ro : ri);
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
    }

    // 剪裁绘制下一镜头 B
    ctx.save();
    pathStar(ctx, rOuter, rInner, rot);
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0);
    ctx.restore();

    // 描边五角星 (16px 深蓝外轮廓 + 6px 金黄内轮廓 + 2px 亮高光)
    ctx.save();
    pathStar(ctx, rOuter, rInner, rot);
    ctx.lineWidth = 16;
    ctx.strokeStyle = NAVY;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FFD600';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#FFFDE7';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 伴随散开的彩色小星星群 (14 颗在星尖与内凹处放射喷发)
    if (rOuter > 20 && rOuter < maxR * 0.92) {
      const STAR_COLORS = ['#FF4081', '#00E676', '#FFD600', '#00B0FF', '#FF9100', '#EA80FC', '#FFFFFF'];
      for (let i = 0; i < 14; i++) {
        const baseAng = (i / 14) * TAU - Math.PI / 2 + rot;
        const radRatio = (i % 2 === 0) ? 1.0 : (rInner / rOuter);
        const flyOffset = 18 + Math.sin(prog * 10 + i * 2.1) * 16;
        const starDist = rOuter * radRatio + flyOffset;
        const tipX = cx + Math.cos(baseAng) * starDist;
        const tipY = cy + Math.sin(baseAng) * starDist;

        if (tipX < -50 || tipX > W + 50 || tipY < -50 || tipY > H + 50) continue;

        const starR = (9 + (i % 4) * 3) * (0.8 + Math.sin(prog * 12 + i) * 0.2);
        const starRot = rot * 2.5 + i * 0.8;
        const col = STAR_COLORS[i % STAR_COLORS.length];

        drawMiniStar(ctx, tipX, tipY, starR, starR * 0.4, (i % 3 === 0 ? 5 : 4), starRot, col, NAVY, 2.0);
      }
    }
    ctx.restore();
  });

  // ==================== 5. balloon_wipe: 派对气球群飞过擦除 (深化升级: 连续严密遮蔽) ====================
  // 密集团簇五彩气球三层错落从右呼啸飞过屏幕, 气球群严密遮蔽接缝折线并自然拉出新镜头画面, 带彩带飘舞
  register('balloon_wipe', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const dir = p.dir || 'left'; // 'left': 从右向左掠过 (默认)
    const prog = easeInOutCubic(clamp(u, 0, 1));

    // 分割前沿 x 坐标 (带气球群宽 480px 的遮挡带)
    const sweepRange = W + 700;
    const seamX = dir === 'left' ? (W + 280 - prog * sweepRange) : (-280 + prog * sweepRange);

    // 1. 绘制底层 A 与顶层 B (顶层 B 以接缝矩形剪裁)
    ctx.drawImage(canvasA, 0, 0);

    ctx.save();
    ctx.beginPath();
    if (dir === 'left') {
      ctx.rect(seamX, 0, W - seamX + 40, H);
    } else {
      ctx.rect(0, 0, seamX, H);
    }
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0);
    ctx.restore();

    // 2. 覆盖在分割接缝处的密集五彩气球群 (分 3 组: 接缝核心垂直遮蔽列 + 左侧散布簇 + 右侧散布簇)
    const BALLOON_PALETTES = [
      // 背景层 (饱和柔和)
      ['#F5D134', '#F08A28', '#7CCBFB', '#A7E9AF', '#FF7096', '#AB47BC', '#00E676'],
      // 中景层 (鲜明高饱和)
      ['#FFD54F', '#FF7043', '#40C4FF', '#69F0AE', '#FF4081', '#BA68C8', '#00E5FF'],
      // 前景层 (高光醒目)
      ['#FFE57F', '#FFAB91', '#80D8FF', '#B9F6CA', '#FF80AB', '#E1BEE7', '#FFFFFF']
    ];

    ctx.save();

    // 先画飘扬彩带 (6 条彩带穿插在气球群中)
    const ribbonColors = ['#FF4081', '#00E676', '#FFD600', '#00B0FF', '#FF9100', '#E040FB'];
    for (let r = 0; r < 6; r++) {
      const rx = seamX + (r - 2.5) * 55;
      const ry0 = -60 + (r * 180) % (H + 120);
      ctx.save();
      ctx.strokeStyle = ribbonColors[r];
      ctx.lineWidth = 5.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let step = 0; step < 7; step++) {
        const segY = ry0 + step * 45;
        const waveX = rx + Math.sin(prog * 10 + step * 0.9 + r) * 28;
        if (step === 0) ctx.moveTo(waveX, segY);
        else ctx.lineTo(waveX, segY);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 构建气球列表: 核心列 (28 只连续重叠) + 左翼 (18 只) + 右翼 (18 只) = 64 只气球
    const balloonList = [];

    // 核心列: 确保每一段高度都在 seamX 处严密重叠，零缝隙遮蔽接缝折线
    const coreCount = 28;
    for (let i = 0; i < coreCount; i++) {
      const yNorm = (i + 0.5) / coreCount;
      const by = yNorm * (H + 240) - 120;
      const offX = Math.sin(i * 1.7) * 24; // 紧贴 seamX 轴线
      const bw = 50 + (Math.sin(i * 3.1) * 0.5 + 0.5) * 16;
      balloonList.push({ bx: seamX + offX, by, bw, layer: 1 + (i % 2), seed: i * 31.7 });
    }

    // 左侧翼簇
    for (let i = 0; i < 18; i++) {
      const by = (i / 18) * (H + 220) - 110 + Math.sin(i * 2.3) * 25;
      const offX = -55 - (Math.sin(i * 2.1) * 0.5 + 0.5) * 135;
      const bw = 38 + (Math.cos(i * 1.9) * 0.5 + 0.5) * 18;
      balloonList.push({ bx: seamX + offX, by, bw, layer: (i % 3), seed: (i + 50) * 29.3 });
    }

    // 右侧翼簇
    for (let i = 0; i < 18; i++) {
      const by = (i / 18) * (H + 220) - 110 + Math.cos(i * 2.5) * 25;
      const offX = 55 + (Math.sin(i * 2.7) * 0.5 + 0.5) * 135;
      const bw = 38 + (Math.cos(i * 2.3) * 0.5 + 0.5) * 18;
      balloonList.push({ bx: seamX + offX, by, bw, layer: (i % 3), seed: (i + 100) * 33.1 });
    }

    // 绘制所有气球
    for (let idx = 0; idx < balloonList.length; idx++) {
      const bItem = balloonList[idx];
      const layer = bItem.layer;
      const layerScale = layer === 0 ? 0.85 : (layer === 1 ? 1.05 : 1.25);
      const seed = bItem.seed;

      const bw = bItem.bw * layerScale;
      const bh = bw * 1.28;
      const bob = Math.sin(prog * 11 + idx * 1.6) * 9;
      const windTilt = (dir === 'left' ? -0.16 : 0.16) + Math.sin(seed + prog * 6) * 0.08;
      const sway = Math.sin(prog * 7 + idx * 1.9) * 10;

      const posX = bItem.bx + sway;
      const posY = bItem.by + bob;

      // 气球牵绳 (深蓝流畅弯曲曲线)
      ctx.save();
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 2.8 * layerScale;
      ctx.beginPath();
      ctx.moveTo(posX, posY + bh * 0.5);
      const stringEndX = posX + (dir === 'left' ? 38 : -38) + Math.sin(seed * 2) * 18;
      const stringEndY = posY + bh * 1.45;
      ctx.quadraticCurveTo(posX + (dir === 'left' ? 16 : -16), posY + bh * 0.95, stringEndX, stringEndY);
      ctx.stroke();
      ctx.restore();

      // 气球球体 (倾斜椭圆)
      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate(windTilt);

      const colors = BALLOON_PALETTES[layer];
      ctx.fillStyle = colors[idx % colors.length];
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 4.8 * (layerScale > 1 ? 1.1 : 0.95);

      ctx.beginPath();
      ctx.ellipse(0, 0, bw, bh, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // 气球球体主要高光弧 (左上方柔光月牙)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.ellipse(-bw * 0.36, -bh * 0.36, bw * 0.26, bh * 0.16, -0.42, 0, TAU);
      ctx.fill();

      // 气球球体次要反光弧 (右下方微光弧)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.ellipse(bw * 0.34, bh * 0.34, bw * 0.16, bh * 0.10, 0.45, 0, TAU);
      ctx.fill();

      // 气球下端充气打结小三角
      ctx.fillStyle = NAVY;
      ctx.beginPath();
      ctx.moveTo(-5 * layerScale, bh * 0.48);
      ctx.lineTo(5 * layerScale, bh * 0.48);
      ctx.lineTo(0, bh * 0.60);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  });

  // ==================== 6. push: 新镜推走旧镜 (深化升级) ====================
  // 新镜头推走旧镜头, 接触面带 48px 柔和渐变分界阴影与双色描边线, 消除生硬折线
  register('push', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const dir = p.dir || 'left'; // 'left' (向左推: A 向左移出, B 从右推入)
    const prog = easeInOutCubic(clamp(u, 0, 1));

    let dxA = 0, dyA = 0, dxB = 0, dyB = 0;
    let lineX0 = 0, lineY0 = 0, lineX1 = 0, lineY1 = 0;
    let shadowX0 = 0, shadowY0 = 0, shadowX1 = 0, shadowY1 = 0;

    if (dir === 'left') {
      dxA = -W * prog;
      dxB = W * (1 - prog);
      lineX0 = lineX1 = dxB;
      lineY0 = 0; lineY1 = H;
      shadowX0 = dxB - 48; shadowY0 = 0;
      shadowX1 = dxB; shadowY1 = 0;
    } else if (dir === 'right') {
      dxA = W * prog;
      dxB = -W * (1 - prog);
      lineX0 = lineX1 = dxB + W;
      lineY0 = 0; lineY1 = H;
      shadowX0 = lineX0; shadowY0 = 0;
      shadowX1 = lineX0 + 48; shadowY1 = 0;
    } else if (dir === 'up') {
      dyA = -H * prog;
      dyB = H * (1 - prog);
      lineX0 = 0; lineX1 = W;
      lineY0 = lineY1 = dyB;
      shadowX0 = 0; shadowY0 = dyB - 48;
      shadowX1 = 0; shadowY1 = dyB;
    } else { // 'down'
      dyA = H * prog;
      dyB = -H * (1 - prog);
      lineX0 = 0; lineX1 = W;
      lineY0 = lineY1 = dyB + H;
      shadowX0 = 0; shadowY0 = lineY0;
      shadowX1 = 0; shadowY1 = lineY0 + 48;
    }

    ctx.save();
    // 绘制旧镜头 A
    ctx.drawImage(canvasA, dxA, dyA);

    // 绘制新镜头 B 在接触面处投射到 A 的平滑分界阴影
    ctx.save();
    let grad;
    if (dir === 'left' || dir === 'right') {
      grad = ctx.createLinearGradient(shadowX0, 0, shadowX1, 0);
      if (dir === 'left') {
        grad.addColorStop(0, 'rgba(7, 30, 74, 0)');
        grad.addColorStop(1, 'rgba(7, 30, 74, 0.55)');
      } else {
        grad.addColorStop(0, 'rgba(7, 30, 74, 0.55)');
        grad.addColorStop(1, 'rgba(7, 30, 74, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(Math.min(shadowX0, shadowX1), 0, 48, H);
    } else {
      grad = ctx.createLinearGradient(0, shadowY0, 0, shadowY1);
      if (dir === 'up') {
        grad.addColorStop(0, 'rgba(7, 30, 74, 0)');
        grad.addColorStop(1, 'rgba(7, 30, 74, 0.55)');
      } else {
        grad.addColorStop(0, 'rgba(7, 30, 74, 0.55)');
        grad.addColorStop(1, 'rgba(7, 30, 74, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, Math.min(shadowY0, shadowY1), W, 48);
    }
    ctx.restore();

    // 绘制新镜头 B
    ctx.drawImage(canvasB, dxB, dyB);

    // 分界线描边 (深蓝加粗 12px + 金黄高光 3.5px)
    ctx.save();
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lineX0, lineY0);
    ctx.lineTo(lineX1, lineY1);
    ctx.stroke();

    ctx.strokeStyle = '#FFE082';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  });

  // ==================== 7. whip: 动态甩镜横摇 (深化升级) ====================
  // 高速甩镜横摇 + 8层动态运动模糊重影 + 高速方向速度线拖影
  register('whip', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const dirSign = p.dir === 'left' ? 1 : -1;
    const prog = easeInOutCubic(clamp(u, 0, 1));
    const offsetA = dirSign * W * prog;
    const offsetB = offsetA - dirSign * W;

    ctx.drawImage(canvasA, offsetA, 0);
    ctx.drawImage(canvasB, offsetB, 0);

    // 高速中段极速运动模糊与拖影
    const speed = Math.sin(prog * Math.PI);
    if (speed > 0.25) {
      ctx.save();

      // 1. 多重曝光重影 (8 层平滑位移)
      ctx.globalAlpha = 0.14 * speed;
      const blurOffsets = [-95, -70, -45, -20, 20, 45, 70, 95];
      for (const bo of blurOffsets) {
        ctx.drawImage(canvasA, offsetA + bo * speed * dirSign, 0);
        ctx.drawImage(canvasB, offsetB + bo * speed * dirSign, 0);
      }

      // 2. 水平动态运动模糊拖影速度线
      ctx.globalAlpha = 0.35 * speed;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      const streakCount = 20;
      for (let s = 0; s < streakCount; s++) {
        const seed = s * 37.19;
        const lineY = (s / streakCount) * H + pseudoRand(seed) * 35;
        const lineLen = 320 + pseudoRand(seed + 1) * 580;
        const startX = pseudoRand(seed + 2) * (W - lineLen);

        ctx.lineWidth = 2.5 + pseudoRand(seed + 3) * 3.5;
        ctx.beginPath();
        ctx.moveTo(startX, lineY);
        ctx.lineTo(startX + lineLen, lineY);
        ctx.stroke();
      }

      ctx.restore();
    }
  });

  // ==================== 8. zoom_blur: 惊喜放射推进 ====================
  // 旧镜头极速向中心放大推进, 中间点伴随冲击闪光, 新镜头以弹性下落砸入
  register('zoom_blur', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const cx = p.cx !== undefined ? p.cx : W / 2;
    const cy = p.cy !== undefined ? p.cy : H / 2;

    ctx.save();
    if (u < 0.55) {
      // 阶段 1: 镜头 A 极速放射推近 (1.0 -> 2.5) + 多层重影模拟径向模糊
      const pu = u / 0.55;
      const zoom = 1.0 + easeInCubic(pu) * 1.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.drawImage(canvasA, -cx, -cy);

      // 运动重影
      if (pu > 0.3) {
        ctx.globalAlpha = 0.25 * pu;
        const scales = [1.08, 1.16, 1.24];
        for (const s of scales) {
          ctx.scale(s, s);
          ctx.drawImage(canvasA, -cx, -cy);
        }
      }
      ctx.restore();

      // 放射速度线
      if (pu > 0.4) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 4;
        for (let i = 0; i < 18; i++) {
          const ang = (i / 18) * TAU;
          const r1 = 200 + pu * 100;
          const r2 = 600 + pu * 300;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
          ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else {
      // 阶段 2: 镜头 B 以强力 smash 姿态落定 (1.4 -> 1.0)
      const pu = (u - 0.55) / 0.45;
      const zoom = 1.0 + (1 - easeOutCubic(pu)) * 0.45;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.drawImage(canvasB, -cx, -cy);
      ctx.restore();

      // 命中瞬间屏幕微闪
      if (pu < 0.35) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(1 - pu / 0.35) * 0.55})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.restore();
  });

  // ==================== 9. wipe: 经典方向擦除 (深化升级) ====================
  // 带柔和分界阴影与深蓝+金黄双色描边线
  register('wipe', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const dir = p.dir || 'right';
    const prog = easeInOutCubic(clamp(u, 0, 1));
    const borderW = p.borderWidth || 12;
    const borderCol = p.borderColor || NAVY;

    ctx.drawImage(canvasA, 0, 0);
    ctx.save();
    ctx.beginPath();
    if (dir === 'right') {
      ctx.rect(0, 0, W * prog, H);
    } else if (dir === 'left') {
      ctx.rect(W * (1 - prog), 0, W * prog, H);
    } else if (dir === 'down') {
      ctx.rect(0, 0, W, H * prog);
    } else if (dir === 'up') {
      ctx.rect(0, H * (1 - prog), W, H * prog);
    }
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0);

    // 擦除分界处柔和渐变阴影
    ctx.save();
    let grad;
    if (dir === 'right') {
      grad = ctx.createLinearGradient(W * prog - 36, 0, W * prog, 0);
      grad.addColorStop(0, 'rgba(7, 30, 74, 0)');
      grad.addColorStop(1, 'rgba(7, 30, 74, 0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(W * prog - 36, 0, 36, H);
    } else if (dir === 'left') {
      grad = ctx.createLinearGradient(W * (1 - prog), 0, W * (1 - prog) + 36, 0);
      grad.addColorStop(0, 'rgba(7, 30, 74, 0.45)');
      grad.addColorStop(1, 'rgba(7, 30, 74, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(W * (1 - prog), 0, 36, H);
    } else if (dir === 'down') {
      grad = ctx.createLinearGradient(0, H * prog - 36, 0, H * prog);
      grad.addColorStop(0, 'rgba(7, 30, 74, 0)');
      grad.addColorStop(1, 'rgba(7, 30, 74, 0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H * prog - 36, W, 36);
    } else if (dir === 'up') {
      grad = ctx.createLinearGradient(0, H * (1 - prog), 0, H * (1 - prog) + 36);
      grad.addColorStop(0, 'rgba(7, 30, 74, 0.45)');
      grad.addColorStop(1, 'rgba(7, 30, 74, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H * (1 - prog), W, 36);
    }
    ctx.restore();

    // 擦除分界线双层描边
    ctx.beginPath();
    if (dir === 'right') { ctx.moveTo(W * prog, 0); ctx.lineTo(W * prog, H); }
    else if (dir === 'left') { ctx.moveTo(W * (1 - prog), 0); ctx.lineTo(W * (1 - prog), H); }
    else if (dir === 'down') { ctx.moveTo(0, H * prog); ctx.lineTo(W, H * prog); }
    else if (dir === 'up') { ctx.moveTo(0, H * (1 - prog)); ctx.lineTo(W, H * (1 - prog)); }
    ctx.lineWidth = borderW;
    ctx.strokeStyle = borderCol;
    ctx.stroke();

    ctx.strokeStyle = '#FFE082';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.restore();
  });

  // 主调度执行纯函数
  function apply(type, ctx, canvasA, canvasB, u, params) {
    const fn = registry[type] || registry.cut;
    fn(ctx, canvasA, canvasB, u, params || {});
  }

  const Transitions = {
    registry,
    register,
    apply,
  };

  root.V14Transitions = Transitions;
  root.V12Transitions = Transitions;
  if (typeof module !== 'undefined' && module.exports) module.exports = Transitions;
})(typeof globalThis !== 'undefined' ? globalThis : this);
