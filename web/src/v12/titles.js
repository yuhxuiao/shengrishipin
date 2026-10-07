// titles.js — V12 片头片尾动画大标题系统
//
// ==================== 接口规范与参数说明 ====================
// 挂载至 globalThis.V12Titles = { draw(ctx, titleDef, t) }
// 契约:
//   ctx: CanvasRenderingContext2D (处于 1920x1080 屏幕像素坐标系)
//   titleDef: shots.js 中定义的镜头 title 字段对象:
//     {
//       text: '主标题文本',
//       sub: '副标题文本 (可选)',
//       at: 0.5,           // 起始绝对秒
//       dur: 4.2,          // 持续时长 (秒)
//       style: 'opening' | 'ending' | 'card', // 样式类型 (可选, 默认自动识别)
//     }
//   t: 当前绝对秒 (Float)
//
// -------------------- 动画与视觉特色 --------------------
// 1. opening (片头标题, S01):
//    - 标题文字逐字错落弹跳入场 (backOut + 细微旋转, 字间错开 0.06s)
//    - 蓝天白云卡通 logo 感: 粗立体深蓝描边 (#0B2F6E) + 温暖阳光金白渐变 + 3D 阴影
//    - 副标题飘带徽章带弹性弹出
//    - 周围 10 颗四角卡通星芒欢快闪耀脉动
//    - 结束前 0.55s 整体欢腾缩放弹出退出
// 2. ending (片尾标题, S34):
//    - "开开 2 岁生日快乐！" 盛大节日大字卡
//    - 左右两侧五彩庆生气球串冉冉升起摇曳
//    - 漫天闪光小星芒与彩纸雨点缀
//    - 镜头收尾 (最后 1.2s) 经典卡通爱心遮罩 (Heart Iris) 缓缓收拢至中心, 深蓝底色与金边环绕落幕
// 3. card (通用字卡):
//    - 适用于中插章节名, 萌系圆角彩带字卡
//
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const NAVY = '#0B2F6E';

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
  const easeInCubic = u => u * u * u;
  const easeInOutCubic = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const backOut = (u, s = 1.70158) => {
    const p = u - 1;
    return p * p * ((s + 1) * p + s) + 1;
  };

  // 风格自动识别
  function resolveStyle(titleDef, t) {
    if (titleDef && titleDef.style) return titleDef.style;
    const txt = (titleDef && titleDef.text) || '';
    if (txt.includes('冒险') || t < 30) return 'opening';
    if (txt.includes('生日快乐') || txt.includes('再见') || t > 200) return 'ending';
    return 'card';
  }

  // 绘制四角卡通星芒
  function drawSparkleStar(ctx, x, y, size, rot, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = col || '#FFE082';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(0, 0, size, 0);
    ctx.quadraticCurveTo(0, 0, 0, size);
    ctx.quadraticCurveTo(0, 0, -size, 0);
    ctx.quadraticCurveTo(0, 0, 0, -size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.22, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // 绘制经典爱心路径 (以 cx, cy 为中心, r 为大小基准, 不调用 beginPath 以便作为复合路径切孔)
  function pathHeart(ctx, cx, cy, r) {
    const s = r / 100;
    const y0 = cy + 25 * s;
    ctx.moveTo(cx, y0);
    ctx.bezierCurveTo(cx, cy, cx - 60 * s, cy - 30 * s, cx - 60 * s, cy - 65 * s);
    ctx.bezierCurveTo(cx - 60 * s, cy - 105 * s, cx - 20 * s, cy - 120 * s, cx, cy - 90 * s);
    ctx.bezierCurveTo(cx + 20 * s, cy - 120 * s, cx + 60 * s, cy - 105 * s, cx + 60 * s, cy - 65 * s);
    ctx.bezierCurveTo(cx + 60 * s, cy - 30 * s, cx, cy, cx, y0);
    ctx.closePath();
  }

  // ==================== 1. 片头大标题 (opening) ====================
  function drawOpeningTitle(ctx, titleDef, lt, dur, t) {
    const text = titleDef.text || '开开的生日大冒险';
    const sub = titleDef.sub || '';
    const chars = text.split('');
    const N = chars.length;

    // 退出动画: 结束前 0.55s 整体缩放淡出
    let globalScale = 1.0;
    let globalAlpha = 1.0;
    if (lt > dur - 0.55) {
      const uOut = (lt - (dur - 0.55)) / 0.55;
      globalScale = 1.0 + Math.sin(uOut * Math.PI) * 0.12 - uOut * 1.05;
      globalAlpha = clamp(1 - uOut * 1.5, 0, 1);
    }
    if (globalAlpha <= 0 || globalScale <= 0) return;

    ctx.save();
    ctx.globalAlpha = globalAlpha;
    ctx.translate(960, 240);
    ctx.scale(globalScale, globalScale);

    // 1. 周围环绕闪耀卡通小星星
    const starCount = 10;
    for (let i = 0; i < starCount; i++) {
      const ang = (i / starCount) * TAU + t * 0.8;
      const dist = 480 + (i % 2 === 0 ? 60 : -40);
      const sx = Math.cos(ang) * dist;
      const sy = Math.sin(ang) * dist * 0.42 - 10;
      const pulse = 0.6 + Math.sin(t * 7 + i * 1.8) * 0.4;
      const starSize = (14 + (i % 3) * 6) * pulse;
      drawSparkleStar(ctx, sx, sy, starSize, t * 2 + i, i % 2 === 0 ? '#FFE082' : '#FFF9C4');
    }

    // 2. 逐字弹跳标题
    ctx.font = 'bold 88px "ZCOOL KuaiLe", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 预估文字间距排版
    const totalW = N * 96;
    const startX = -totalW / 2 + 48;

    for (let i = 0; i < N; i++) {
      const charDelay = i * 0.06;
      if (lt < charDelay) continue;

      const charProg = clamp((lt - charDelay) / 0.45, 0, 1);
      const cScale = backOut(charProg);
      const cRot = (1 - charProg) * ((i % 2 === 0 ? 1 : -1) * 0.24);
      const cDy = (1 - charProg) * -75;

      // 落地后持续轻微呼吸小波浪
      const wave = Math.sin(t * 3.8 + i * 0.55) * 5.5;

      const cx = startX + i * 96;
      const cy = cDy + wave;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(cScale, cScale);
      ctx.rotate(cRot);

      // (A) 3D 立体深蓝投影层
      ctx.lineWidth = 20;
      ctx.strokeStyle = '#071E4A';
      ctx.lineJoin = 'round';
      ctx.strokeText(chars[i], 5, 14);

      // (B) 主外轮廓深蓝描边
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 18;
      ctx.strokeText(chars[i], 0, 0);

      // (C) 温暖阳光渐变文字填充
      const grad = ctx.createLinearGradient(0, -44, 0, 44);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.35, '#FFF9C4');
      grad.addColorStop(1, '#FFCA28');
      ctx.fillStyle = grad;
      ctx.fillText(chars[i], 0, 0);

      // (D) 字母顶部微亮高光圈点
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-14, -28, 5, 0, TAU);
      ctx.fill();

      ctx.restore();
    }

    // 3. 副标题徽章横幅 (在主标题下方优雅入场)
    if (sub && lt >= 0.55) {
      const subProg = clamp((lt - 0.55) / 0.45, 0, 1);
      const subScale = backOut(subProg);
      const subAlpha = subProg;

      ctx.save();
      ctx.translate(0, 145);
      ctx.scale(subScale, subScale);
      ctx.globalAlpha = subAlpha;

      // 缎带背景底板
      const bannerW = 680;
      const bannerH = 64;

      // 缎带两端燕尾阴影
      ctx.fillStyle = '#071E4A';
      ctx.beginPath();
      ctx.moveTo(-bannerW / 2 - 25, bannerH / 2 + 10);
      ctx.lineTo(bannerW / 2 + 25, bannerH / 2 + 10);
      ctx.lineTo(bannerW / 2 + 15, -bannerH / 2 + 14);
      ctx.lineTo(-bannerW / 2 - 15, -bannerH / 2 + 14);
      ctx.closePath();
      ctx.fill();

      // 缎带主体 (暖黄底板 + 深蓝粗描边)
      ctx.fillStyle = '#FFE082';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.roundRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 32);
      ctx.fill();
      ctx.stroke();

      // 缎带内边框装饰
      ctx.strokeStyle = '#FFF8E1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-bannerW / 2 + 6, -bannerH / 2 + 6, bannerW - 12, bannerH - 12, 26);
      ctx.stroke();

      // 副标题文字
      ctx.font = 'bold 36px "ZCOOL KuaiLe", sans-serif';
      ctx.fillStyle = NAVY;
      ctx.fillText(sub, 0, 2);

      ctx.restore();
    }

    ctx.restore();
  }

  // ==================== 2. 片尾庆生字卡 (ending) ====================
  function drawEndingTitle(ctx, titleDef, lt, dur, t) {
    const text = titleDef.text || '开开 2 岁生日快乐！';
    const sub = titleDef.sub || '愿你每天都像挖土机一样充满活力！';

    // 1. 入场动画 (0.0 ~ 0.8s: 缓动上浮升起)
    const inProg = clamp(lt / 0.85, 0, 1);
    const cardScale = backOut(inProg);
    const cardDy = (1 - easeOutCubic(inProg)) * 60;

    // 2. 升起的气球串 (左右两侧)
    const balloonColors = ['#FF4081', '#7CCBFB', '#FFD600', '#00E676', '#FF9100', '#AB47BC'];
    ctx.save();
    // 左侧气球串
    for (let i = 0; i < 4; i++) {
      const riseU = clamp((lt + i * 0.3) / 4.0, 0, 1);
      const bx = 220 + (i - 1.5) * 55 + Math.sin(t * 1.5 + i) * 12;
      const by = 1150 - easeOutCubic(riseU) * 440 + Math.sin(t * 2.2 + i * 1.5) * 10;
      const bw = 38, bh = 48;

      ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(bx, by + bh * 0.5); ctx.lineTo(bx - 15, by + 120); ctx.stroke();

      ctx.fillStyle = balloonColors[i % balloonColors.length];
      ctx.strokeStyle = NAVY; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.ellipse(bx, by, bw, bh, 0, 0, TAU); ctx.fill(); ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(bx - 12, by - 14, 10, 6, -0.4, 0, TAU); ctx.fill();
    }

    // 右侧气球串
    for (let i = 0; i < 4; i++) {
      const riseU = clamp((lt + i * 0.28) / 4.0, 0, 1);
      const bx = 1700 + (i - 1.5) * 55 + Math.sin(t * 1.6 + i) * 12;
      const by = 1150 - easeOutCubic(riseU) * 430 + Math.sin(t * 2.0 + i * 1.4) * 10;
      const bw = 38, bh = 48;

      ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(bx, by + bh * 0.5); ctx.lineTo(bx + 15, by + 120); ctx.stroke();

      ctx.fillStyle = balloonColors[(i + 3) % balloonColors.length];
      ctx.strokeStyle = NAVY; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.ellipse(bx, by, bw, bh, 0, 0, TAU); ctx.fill(); ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(bx - 12, by - 14, 10, 6, -0.4, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // 3. 漫天轻柔飞舞的彩纸屑与小星星
    ctx.save();
    const confettiCount = 36;
    for (let i = 0; i < confettiCount; i++) {
      const seed = i * 19.3;
      const cx = (i * 54.3) % 1920;
      const cy = ((-50 + lt * (70 + (seed % 90))) % 1150);
      const rot = t * 3 + i;
      const col = balloonColors[i % balloonColors.length];

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = col;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 1.5;

      if (i % 2 === 0) {
        ctx.fillRect(-10, -5, 20, 10);
        ctx.strokeRect(-10, -5, 20, 10);
      } else {
        drawSparkleStar(ctx, 0, 0, 10, 0, col);
      }
      ctx.restore();
    }
    ctx.restore();

    // 4. 核心大字卡
    ctx.save();
    ctx.translate(960, 260 + cardDy);
    ctx.scale(cardScale, cardScale);

    // 主标题大字: 开开 2 岁生日快乐！
    ctx.font = 'bold 84px "ZCOOL KuaiLe", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 3D 阴影
    ctx.lineWidth = 22;
    ctx.strokeStyle = '#071E4A';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 0, 14);

    // 深蓝加粗轮廓
    ctx.lineWidth = 18;
    ctx.strokeStyle = NAVY;
    ctx.strokeText(text, 0, 0);

    // 温暖金黄文字主体渐变
    const grad = ctx.createLinearGradient(0, -42, 0, 42);
    grad.addColorStop(0, '#FFFDE7');
    grad.addColorStop(0.4, '#FFE082');
    grad.addColorStop(1, '#FFA000');
    ctx.fillStyle = grad;
    ctx.fillText(text, 0, 0);

    // 两侧点缀大四角金星
    drawSparkleStar(ctx, -520, -10, 32, t * 1.5, '#FFE082');
    drawSparkleStar(ctx, 520, -10, 32, -t * 1.5, '#FFE082');

    // 副标题长缎带
    if (sub) {
      const subProg = clamp((lt - 0.4) / 0.5, 0, 1);
      ctx.save();
      ctx.translate(0, 120);
      ctx.scale(backOut(subProg), backOut(subProg));

      const subW = 880;
      const subH = 60;

      ctx.fillStyle = '#071E4A';
      ctx.beginPath();
      ctx.roundRect(-subW / 2 + 5, -subH / 2 + 10, subW, subH, 30);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-subW / 2, -subH / 2, subW, subH, 30);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 36px "ZCOOL KuaiLe", sans-serif';
      ctx.fillStyle = NAVY;
      ctx.fillText(sub, 0, 2);
      ctx.restore();
    }
    ctx.restore();

    // 5. 结尾心形收拢遮罩 (Heart Iris Close)
    // 在最后 1.2s (lt > dur - 1.2s), 经典爱心或圆形遮罩向中心收拢落幕
    const irisDur = 1.2;
    if (lt > dur - irisDur) {
      const uIris = clamp((lt - (dur - irisDur)) / irisDur, 0, 1);
      const prog = easeInOutCubic(uIris);
      const maxR = 1500;
      const curR = maxR * (1 - prog);

      ctx.save();
      // 外层深蓝夜色遮罩
      ctx.fillStyle = '#071E4A';

      // 采用即使多平台也兼容的剪裁遮罩或外框反切
      // 绘制带孔的遮罩: 外部大矩形 + 内部心形反切
      ctx.beginPath();
      ctx.rect(0, 0, 1920, 1080);
      if (curR > 5) {
        pathHeart(ctx, 960, 580, curR);
      }
      ctx.fill('evenodd');

      // 爱心边缘金色描边环
      if (curR > 8) {
        ctx.beginPath();
        pathHeart(ctx, 960, 580, curR);
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 16;
        ctx.stroke();

        ctx.beginPath();
        pathHeart(ctx, 960, 580, curR);
        ctx.strokeStyle = '#FFD54F';
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ==================== 3. 通用字卡 (card) ====================
  function drawCardTitle(ctx, titleDef, lt, dur, t) {
    const text = titleDef.text || '';
    const sub = titleDef.sub || '';

    let alpha = 1.0, scale = 1.0;
    if (lt < 0.5) {
      const u = lt / 0.5;
      alpha = u;
      scale = 0.85 + backOut(u) * 0.15;
    } else if (lt > dur - 0.5) {
      const u = (dur - lt) / 0.5;
      alpha = u;
      scale = 0.95 + u * 0.05;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(960, 240);
    ctx.scale(scale, scale);

    ctx.font = 'bold 76px "ZCOOL KuaiLe", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 16;
    ctx.strokeStyle = NAVY;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = '#FFE14A';
    ctx.fillText(text, 0, 0);

    if (sub) {
      ctx.font = 'bold 36px "ZCOOL KuaiLe", sans-serif';
      ctx.lineWidth = 8;
      ctx.strokeStyle = NAVY;
      ctx.strokeText(sub, 0, 70);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(sub, 0, 70);
    }
    ctx.restore();
  }

  // ==================== 主入口: V12Titles.draw ====================
  function draw(ctx, titleDef, t) {
    if (!titleDef || !titleDef.text) return;
    const at = titleDef.at !== undefined ? titleDef.at : 0;
    const dur = titleDef.dur !== undefined ? titleDef.dur : 4.0;
    if (t < at || t > at + dur) return;

    const lt = t - at;
    const style = resolveStyle(titleDef, t);

    if (style === 'opening') {
      drawOpeningTitle(ctx, titleDef, lt, dur, t);
    } else if (style === 'ending') {
      drawEndingTitle(ctx, titleDef, lt, dur, t);
    } else {
      drawCardTitle(ctx, titleDef, lt, dur, t);
    }
  }

  const V12Titles = {
    draw,
    drawOpeningTitle,
    drawEndingTitle,
    drawCardTitle,
    resolveStyle,
  };

  root.V12Titles = V12Titles;
  if (typeof module !== 'undefined' && module.exports) module.exports = V12Titles;
})(typeof globalThis !== 'undefined' ? globalThis : this);
