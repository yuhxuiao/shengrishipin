// transitions.js — V15 全时动态转场合成系统 (Bluey 官方审美对齐版)
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
// 3. iris: 经典卡通圆环收放 (Bluey 风格深藏青 #13284C 16px 粗边框 + 奶油金黄闪烁内边框 #FFE082 + 环周 12 颗微光旋转金星)
// 4. star_wipe: 黄金比例五角星展开 (五角星旋转放射张开, 18px 深藏青描边 + 金黄内边框 + 16 颗伴随喷发的彩色小星)
// 5. balloon_wipe: 派对气球群飞过擦除 (64 只三层五彩气球团簇严密遮盖折线呼啸掠过, 配合 8 条飘舞彩带自然带出新镜头)
// 6. push: 新镜推走旧镜 (支持 left/right/up/down, 接触面带 52px 柔和渐变分界阴影与深藏青+奶油黄双色描边, 彻底消除生硬折线)
// 7. whip: 动态甩镜横摇 (8 重多重曝光运动模糊 + 24 条高动态速度线拖影)
// 8. zoom_blur: 惊喜放射推进 (放射放大旧镜头 + 极速砸入新镜头 + 放射冲击线与屏幕微闪)
// 9. wipe: 经典方向擦除 (支持 right/left/down/up, 带柔和拖尾阴影与双色描边线)
//
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const NAVY = '#13284C'; // Bluey 官方标准深藏青
  const NAVY_BG = '#0D1C36'; // 转场深藏青底色

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

  // ==================== 3. iris: 经典卡通圆环收放 (Bluey 官方深藏青 + 奶油金黄双边框) ====================
  // 经典卡通收放 + 粗深藏青描边 (#13284C, 16px) + 奶油金黄闪烁内边框 (#FFE082, 5px) + 环周 12 颗微光旋转金星
  register('iris', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const cx = p.cx !== undefined ? p.cx : W / 2;
    const cy = p.cy !== undefined ? p.cy : H / 2;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 60;
    const minR = p.minR !== undefined ? p.minR : 16;
    const borderW = p.borderWidth || 16;
    const borderCol = p.borderColor || NAVY;
    const mode = p.mode || 'classic'; // 'classic' (收+放), 'open' (只放), 'close' (只收)

    // 绘制圆环轮廓与环周闪烁微粒辅助函数
    function drawIrisAccents(c, currentR, progress) {
      if (currentR <= 4 || currentR >= maxR * 0.98) return;

      // 1. 深藏青厚重外边框
      c.beginPath();
      c.arc(cx, cy, currentR, 0, TAU);
      c.lineWidth = borderW;
      c.strokeStyle = borderCol;
      c.stroke();

      // 2. 奶油金黄色闪烁内边框
      c.beginPath();
      c.arc(cx, cy, Math.max(0, currentR - borderW * 0.38), 0, TAU);
      c.lineWidth = 5.0;
      c.strokeStyle = '#FFE082';
      c.stroke();

      // 3. 奶油浅白极细高光内弧
      c.beginPath();
      c.arc(cx, cy, Math.max(0, currentR - borderW * 0.68), 0, TAU);
      c.lineWidth = 2.0;
      c.strokeStyle = 'rgba(255, 253, 231, 0.92)';
      c.stroke();

      // 4. 圆环外周散发的卡通微光颗粒 (12 颗 4 角金星伴随旋转闪烁)
      const starCount = 12;
      const rot = progress * 4.6;
      for (let i = 0; i < starCount; i++) {
        const ang = (i / starCount) * TAU + rot;
        const wobble = Math.sin(progress * 18 + i * 2.3) * 8;
        const starDist = currentR + borderW * 0.5 + 16 + wobble;
        const sx = cx + Math.cos(ang) * starDist;
        const sy = cy + Math.sin(ang) * starDist;

        // 边界外不画
        if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;

        const pulse = Math.sin(progress * 15 + i * 1.8) * 0.35 + 0.65;
        const rOut = (8.5 + (i % 3) * 3) * pulse;
        const rIn = rOut * 0.35;
        const fillCol = (i % 2 === 0) ? '#FFE082' : '#FFFDE7';

        drawMiniStar(c, sx, sy, rOut, rIn, 4, ang + rot * 0.5, fillCol, NAVY, 2.0);
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
      // 单向收缩模式: A 收缩为小圆陷入深藏青底
      const prog = easeInOutCubic(clamp(u, 0, 1));
      const r = (1 - prog) * maxR;

      ctx.fillStyle = NAVY_BG;
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

        // 深藏青卡通底色
        ctx.fillStyle = NAVY_BG;
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

        // 深藏青卡通底色
        ctx.fillStyle = NAVY_BG;
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

    // 描边五角星 (18px 深藏青外轮廓 + 6.5px 金黄内轮廓 + 2.5px 亮高光)
    ctx.save();
    pathStar(ctx, rOuter, rInner, rot);
    ctx.lineWidth = 18;
    ctx.strokeStyle = NAVY;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.lineWidth = 6.5;
    ctx.strokeStyle = '#FFD600';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FFFDE7';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 伴随喷发的彩色小星星群 (16 颗在星尖与内凹处放射喷发)
    if (rOuter > 20 && rOuter < maxR * 0.94) {
      const STAR_COLORS = ['#FF4081', '#00E676', '#FFD600', '#00B0FF', '#FF9100', '#EA80FC', '#FFF3D0', '#FF1744'];
      for (let i = 0; i < 16; i++) {
        const baseAng = (i / 16) * TAU - Math.PI / 2 + rot;
        const radRatio = (i % 2 === 0) ? 1.0 : (rInner / rOuter);
        const flyOffset = 18 + Math.sin(prog * 10 + i * 2.1) * 18;
        const starDist = rOuter * radRatio + flyOffset;
        const tipX = cx + Math.cos(baseAng) * starDist;
        const tipY = cy + Math.sin(baseAng) * starDist;

        if (tipX < -50 || tipX > W + 50 || tipY < -50 || tipY > H + 50) continue;

        const starR = (9.5 + (i % 4) * 3) * (0.8 + Math.sin(prog * 12 + i) * 0.2);
        const starRot = rot * 2.5 + i * 0.8;
        const col = STAR_COLORS[i % STAR_COLORS.length];

        drawMiniStar(ctx, tipX, tipY, starR, starR * 0.38, (i % 3 === 0 ? 5 : 4), starRot, col, NAVY, 2.2);
      }
    }
    ctx.restore();
  });

  // ==================== 5. balloon_wipe: 派对气球群飞过擦除 (64 只三层五彩气球团簇严密遮蔽) ====================
  // 密集团簇五彩气球三层错落从右呼啸飞过屏幕, 气球群严密遮蔽接缝折线并自然拉出新镜头画面, 带 8 条彩带飘舞
  register('balloon_wipe', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const dir = p.dir || 'left'; // 'left': 从右向左掠过 (默认)
    const prog = easeInOutCubic(clamp(u, 0, 1));

    // 分割前沿 x 坐标 (带气球群宽 480px 的遮挡带)
    const sweepRange = W + 720;
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

    // 先画飘扬彩带 (8 条彩带穿插在气球群中，带动态正弦摆动)
    const ribbonColors = ['#FF4081', '#00E676', '#FFD600', '#00B0FF', '#FF9100', '#E040FB', '#00E5FF', '#FF5252'];
    for (let r = 0; r < 8; r++) {
      const rx = seamX + (r - 3.5) * 48;
      const ry0 = -60 + (r * 150) % (H + 120);
      ctx.save();
      ctx.strokeStyle = ribbonColors[r];
      ctx.lineWidth = 5.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let step = 0; step < 7; step++) {
        const segY = ry0 + step * 48;
        const waveX = rx + Math.sin(prog * 10 + step * 0.9 + r) * 30;
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
      const bw = 52 + (Math.sin(i * 3.1) * 0.5 + 0.5) * 16;
      balloonList.push({ bx: seamX + offX, by, bw, layer: 1 + (i % 2), seed: i * 31.7 });
    }

    // 左侧翼簇
    for (let i = 0; i < 18; i++) {
      const by = (i / 18) * (H + 220) - 110 + Math.sin(i * 2.3) * 25;
      const offX = -55 - (Math.sin(i * 2.1) * 0.5 + 0.5) * 135;
      const bw = 40 + (Math.cos(i * 1.9) * 0.5 + 0.5) * 18;
      balloonList.push({ bx: seamX + offX, by, bw, layer: (i % 3), seed: (i + 50) * 29.3 });
    }

    // 右侧翼簇
    for (let i = 0; i < 18; i++) {
      const by = (i / 18) * (H + 220) - 110 + Math.cos(i * 2.5) * 25;
      const offX = 55 + (Math.sin(i * 2.7) * 0.5 + 0.5) * 135;
      const bw = 40 + (Math.cos(i * 2.3) * 0.5 + 0.5) * 18;
      balloonList.push({ bx: seamX + offX, by, bw, layer: (i % 3), seed: (i + 100) * 33.1 });
    }

    // 绘制所有气球
    for (let idx = 0; idx < balloonList.length; idx++) {
      const bItem = balloonList[idx];
      const layer = bItem.layer;
      const layerScale = layer === 0 ? 0.88 : (layer === 1 ? 1.08 : 1.28);
      const seed = bItem.seed;

      const bw = bItem.bw * layerScale;
      const bh = bw * 1.28;
      const bob = Math.sin(prog * 11 + idx * 1.6) * 9;
      const windTilt = (dir === 'left' ? -0.16 : 0.16) + Math.sin(seed + prog * 6) * 0.08;
      const sway = Math.sin(prog * 7 + idx * 1.9) * 10;

      const posX = bItem.bx + sway;
      const posY = bItem.by + bob;

      // 气球牵绳 (深藏青流畅弯曲曲线)
      ctx.save();
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.0 * layerScale;
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
      ctx.lineWidth = 5.0 * (layerScale > 1 ? 1.1 : 0.95);

      ctx.beginPath();
      ctx.ellipse(0, 0, bw, bh, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // 气球球体主要高光弧 (左上方柔光月牙)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.74)';
      ctx.beginPath();
      ctx.ellipse(-bw * 0.36, -bh * 0.36, bw * 0.26, bh * 0.16, -0.42, 0, TAU);
      ctx.fill();

      // 气球球体次要反光弧 (右下方微光弧)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
      ctx.beginPath();
      ctx.ellipse(bw * 0.34, bh * 0.34, bw * 0.16, bh * 0.10, 0.45, 0, TAU);
      ctx.fill();

      // 气球下端充气打结小三角
      ctx.fillStyle = NAVY;
      ctx.beginPath();
      ctx.moveTo(-5.5 * layerScale, bh * 0.48);
      ctx.lineTo(5.5 * layerScale, bh * 0.48);
      ctx.lineTo(0, bh * 0.60);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  });

  // ==================== 6. push: 新镜推走旧镜 (深化升级) ====================
  // 新镜头推走旧镜头, 接触面带 52px 柔和渐变分界阴影与双色描边线, 消除生硬折线
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
      shadowX0 = dxB - 52; shadowY0 = 0;
      shadowX1 = dxB; shadowY1 = 0;
    } else if (dir === 'right') {
      dxA = W * prog;
      dxB = -W * (1 - prog);
      lineX0 = lineX1 = dxB + W;
      lineY0 = 0; lineY1 = H;
      shadowX0 = lineX0; shadowY0 = 0;
      shadowX1 = lineX0 + 52; shadowY1 = 0;
    } else if (dir === 'up') {
      dyA = -H * prog;
      dyB = H * (1 - prog);
      lineX0 = 0; lineX1 = W;
      lineY0 = lineY1 = dyB;
      shadowX0 = 0; shadowY0 = dyB - 52;
      shadowX1 = 0; shadowY1 = dyB;
    } else { // 'down'
      dyA = H * prog;
      dyB = -H * (1 - prog);
      lineX0 = 0; lineX1 = W;
      lineY0 = lineY1 = dyB + H;
      shadowX0 = 0; shadowY0 = lineY0;
      shadowX1 = 0; shadowY1 = lineY0 + 52;
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
        grad.addColorStop(0, 'rgba(13, 28, 54, 0)');
        grad.addColorStop(1, 'rgba(13, 28, 54, 0.58)');
      } else {
        grad.addColorStop(0, 'rgba(13, 28, 54, 0.58)');
        grad.addColorStop(1, 'rgba(13, 28, 54, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(Math.min(shadowX0, shadowX1), 0, 52, H);
    } else {
      grad = ctx.createLinearGradient(0, shadowY0, 0, shadowY1);
      if (dir === 'up') {
        grad.addColorStop(0, 'rgba(13, 28, 54, 0)');
        grad.addColorStop(1, 'rgba(13, 28, 54, 0.58)');
      } else {
        grad.addColorStop(0, 'rgba(13, 28, 54, 0.58)');
        grad.addColorStop(1, 'rgba(13, 28, 54, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, Math.min(shadowY0, shadowY1), W, 52);
    }
    ctx.restore();

    // 绘制新镜头 B
    ctx.drawImage(canvasB, dxB, dyB);

    // 分界线描边 (深藏青加粗 14px + 奶油金黄高光 4.0px)
    ctx.save();
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lineX0, lineY0);
    ctx.lineTo(lineX1, lineY1);
    ctx.stroke();

    ctx.strokeStyle = '#FFE082';
    ctx.lineWidth = 4.0;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  });

  // ==================== 7. whip: 动态甩镜横摇 (8 重多重曝光模糊 + 24 条高动态速度线) ====================
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
    if (speed > 0.22) {
      ctx.save();

      // 1. 多重曝光重影 (8 层平滑位移)
      ctx.globalAlpha = 0.15 * speed;
      const blurOffsets = [-100, -75, -50, -25, 25, 50, 75, 100];
      for (const bo of blurOffsets) {
        ctx.drawImage(canvasA, offsetA + bo * speed * dirSign, 0);
        ctx.drawImage(canvasB, offsetB + bo * speed * dirSign, 0);
      }

      // 2. 水平动态运动模糊拖影速度线 (24 条)
      ctx.globalAlpha = 0.38 * speed;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.80)';
      const streakCount = 24;
      for (let s = 0; s < streakCount; s++) {
        const seed = s * 37.19;
        const lineY = (s / streakCount) * H + pseudoRand(seed) * 35;
        const lineLen = 340 + pseudoRand(seed + 1) * 620;
        const startX = pseudoRand(seed + 2) * (W - lineLen);

        ctx.lineWidth = 2.5 + pseudoRand(seed + 3) * 4.0;
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

  // ==================== 9. wipe: 经典方向擦除 (深藏青 + 奶油金黄双色描边线) ====================
  // 带柔和分界阴影与深藏青+奶油金黄双色描边线
  register('wipe', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const dir = p.dir || 'right';
    const prog = easeInOutCubic(clamp(u, 0, 1));
    const borderW = p.borderWidth || 14;
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
      grad = ctx.createLinearGradient(W * prog - 42, 0, W * prog, 0);
      grad.addColorStop(0, 'rgba(13, 28, 54, 0)');
      grad.addColorStop(1, 'rgba(13, 28, 54, 0.50)');
      ctx.fillStyle = grad;
      ctx.fillRect(W * prog - 42, 0, 42, H);
    } else if (dir === 'left') {
      grad = ctx.createLinearGradient(W * (1 - prog), 0, W * (1 - prog) + 42, 0);
      grad.addColorStop(0, 'rgba(13, 28, 54, 0.50)');
      grad.addColorStop(1, 'rgba(13, 28, 54, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(W * (1 - prog), 0, 42, H);
    } else if (dir === 'down') {
      grad = ctx.createLinearGradient(0, H * prog - 42, 0, H * prog);
      grad.addColorStop(0, 'rgba(13, 28, 54, 0)');
      grad.addColorStop(1, 'rgba(13, 28, 54, 0.50)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H * prog - 42, W, 42);
    } else if (dir === 'up') {
      grad = ctx.createLinearGradient(0, H * (1 - prog), 0, H * (1 - prog) + 42);
      grad.addColorStop(0, 'rgba(13, 28, 54, 0.50)');
      grad.addColorStop(1, 'rgba(13, 28, 54, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H * (1 - prog), W, 42);
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
    ctx.lineWidth = 4.0;
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

  root.V15Transitions = Transitions;
  root.V14Transitions = Transitions;
  root.V12Transitions = Transitions;
  if (typeof module !== 'undefined' && module.exports) module.exports = Transitions;
})(typeof globalThis !== 'undefined' ? globalThis : this);
