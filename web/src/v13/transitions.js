// transitions.js — V12 镜头间离屏转场合成系统
//
// ==================== 转场库接口规范与使用指南 ====================
// 契约: 纯函数合成, 输入两张已在当前时间窗离屏渲染好的画布:
//   ctx: 主画布渲染上下文
//   canvasA: 上一镜头离屏画布 (prevShot)
//   canvasB: 本镜头离屏画布 (currShot)
//   u: 跨镜过渡进度 (0.0 ~ 1.0, 0.5 为精准镜头切点 cutT)
//   params: shots.js 中镜头 transitionIn 对象 (如 { type: 'iris', dur: 0.6, cx: 960, cy: 540 })
//
// -------------------- 完整转场清单与推荐场景 --------------------
// 1. cut: 经典硬切 (中间点瞬切, 适用于惊喜/快速反应)
// 2. dissolve: 电影级柔和叠化 (适用于时间流逝、回忆、抒情情绪)
// 3. iris: 经典 2D 卡通圆形遮罩收放 (先收缩至小圆聚焦角色, 再从该点张开新镜; 粗深蓝描边环 #0B2F6E + 金色高光环; 适用于换幕与章节切换)
// 4. star_wipe: 经典卡通五角星展开 (五角星向外膨胀, 带粗描边与金星芒; 适用于寻宝惊喜、发现宝藏)
// 5. balloon_wipe: 一串五彩气球飞过擦除 (密集团簇气球从右向左呼啸飞过, 气球后方无缝露出新画面; 适用于派对、户外轻快换景)
// 6. push: 新镜推走旧镜 (支持 left/right/up/down, 接触面带粗深蓝分界线与阴影; 适用于地点横移推进)
// 7. whip: 动态甩镜横摇 (高速位移 + 动态运动模糊拖影重影; 适用于视线快速跟随、转头寻找)
// 8. zoom_blur: 惊喜放射推进 (放射放大旧镜头 + 极速砸入新镜头 + 冲击光效; 适用于巨大发现、打破第四面墙震撼时刻)
// 9. wipe: 经典线性方向擦除 (支持 right/left/down/up, 带清晰深蓝描边线)
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

  // ==================== 3. iris: 经典 2D 卡通圆形遮罩收放 ====================
  // 经典卡通逻辑:
  // u 在 0.0 ~ 0.5: 镜头 A 先收缩至深蓝底色小圆 (聚焦于 params.cx/cy 角色面部)
  // u 在 0.5 ~ 1.0: 镜头 B 从深蓝小圆向四周重新盛大张开
  // 圆周边缘带有深蓝加粗轮廓 (#0B2F6E) 与金黄色高光内环，彻底杜绝"画面裁切出错"的歧义
  register('iris', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const cx = p.cx !== undefined ? p.cx : W / 2;
    const cy = p.cy !== undefined ? p.cy : H / 2;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 40;
    const minR = p.minR !== undefined ? p.minR : 0;
    const borderW = p.borderWidth || 14;
    const borderCol = p.borderColor || NAVY;
    const mode = p.mode || 'classic'; // 'classic' (收+放), 'open' (只放), 'close' (只收)

    ctx.save();

    if (mode === 'open') {
      // 单向展开模式: A 为底, B 从中心向四周扩大
      const prog = easeInOutCubic(clamp(u, 0, 1));
      const r = prog * maxR;

      ctx.drawImage(canvasA, 0, 0);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, r), 0, TAU);
      ctx.clip();
      ctx.drawImage(canvasB, 0, 0);
      ctx.restore();

      // 圆环描边与高光
      if (r > 2 && r < maxR) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.lineWidth = borderW;
        ctx.strokeStyle = borderCol;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0, r - borderW * 0.35), 0, TAU);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#FFE082';
        ctx.stroke();
      }
    } else if (mode === 'close') {
      // 单向收缩模式: A 收缩为小圆并陷入深蓝底
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

      if (r > 2) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.lineWidth = borderW;
        ctx.strokeStyle = borderCol;
        ctx.stroke();
      }
    } else {
      // 默认经典模式: 0.0 ~ 0.5 收缩上一镜 A, 0.5 ~ 1.0 张开新镜 B
      if (u < 0.5) {
        const prog = easeInCubic(u / 0.5);
        const r = maxR - prog * (maxR - minR);

        // 深蓝遮罩底
        ctx.fillStyle = '#071E4A';
        ctx.fillRect(0, 0, W, H);

        // 剪裁绘制 A
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0, r), 0, TAU);
        ctx.clip();
        ctx.drawImage(canvasA, 0, 0);
        ctx.restore();

        // 描边圆环
        if (r > 2) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, TAU);
          ctx.lineWidth = borderW;
          ctx.strokeStyle = borderCol;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(0, r - borderW * 0.35), 0, TAU);
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = '#FFE082';
          ctx.stroke();
        }
      } else {
        const prog = easeOutCubic((u - 0.5) / 0.5);
        const r = minR + prog * (maxR - minR);

        // 深蓝遮罩底
        ctx.fillStyle = '#071E4A';
        ctx.fillRect(0, 0, W, H);

        // 剪裁绘制 B
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0, r), 0, TAU);
        ctx.clip();
        ctx.drawImage(canvasB, 0, 0);
        ctx.restore();

        // 描边圆环
        if (r > 2 && r < maxR) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, TAU);
          ctx.lineWidth = borderW;
          ctx.strokeStyle = borderCol;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(0, r - borderW * 0.35), 0, TAU);
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = '#FFE082';
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  });

  // ==================== 4. star_wipe: 经典卡通五角星展开 ====================
  // 从中心或指定点膨胀出五角星, 并在星尖带金色装饰与描边
  register('star_wipe', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const cx = p.cx !== undefined ? p.cx : W / 2;
    const cy = p.cy !== undefined ? p.cy : H / 2;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.35;
    const prog = easeInOutCubic(clamp(u, 0, 1));
    const rOuter = prog * maxR;
    const rInner = rOuter * 0.45;
    const rot = prog * 0.35; // 伴随轻微旋转增加动感

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

    // 剪裁绘制 B
    ctx.save();
    pathStar(ctx, rOuter, rInner, rot);
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0);
    ctx.restore();

    // 描边五角星 (深蓝外轮廓 + 金黄内轮廓)
    ctx.save();
    pathStar(ctx, rOuter, rInner, rot);
    ctx.lineWidth = 16;
    ctx.strokeStyle = NAVY;
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FFD600';
    ctx.stroke();

    // 5 个星尖的小星芒微粒
    if (rOuter < maxR * 0.85) {
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * TAU - Math.PI / 2 + rot;
        const tipX = cx + Math.cos(ang) * rOuter;
        const tipY = cy + Math.sin(ang) * rOuter;

        ctx.fillStyle = '#FFFDE7';
        ctx.beginPath();
        ctx.arc(tipX, tipY, 7, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = NAVY;
        ctx.stroke();
      }
    }
    ctx.restore();
  });

  // ==================== 5. balloon_wipe: 一串气球从右飞过擦除 ====================
  // 密集团簇五彩气球从右呼啸飞过屏幕, 气球群后方无缝露出新镜头 B
  register('balloon_wipe', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const dir = p.dir || 'left'; // 'left': 从右向左掠过 (默认)
    const prog = easeInOutCubic(clamp(u, 0, 1));

    // 分割前沿 x 坐标 (带气球群宽 420px 的缓冲带)
    const sweepRange = W + 600;
    const seamX = dir === 'left' ? (W + 200 - prog * sweepRange) : (-200 + prog * sweepRange);

    // 1. 绘制底层 A 与顶层 B
    ctx.drawImage(canvasA, 0, 0);

    ctx.save();
    ctx.beginPath();
    if (dir === 'left') {
      ctx.rect(seamX, 0, W - seamX + 20, H);
    } else {
      ctx.rect(0, 0, seamX, H);
    }
    ctx.clip();
    ctx.drawImage(canvasB, 0, 0);
    ctx.restore();

    // 2. 覆盖在分割线上的竖向五彩气球簇墙 (彻底遮挡分割接缝)
    const BALLOON_COLORS = ['#F5D134', '#F08A28', '#7CCBFB', '#B0E0C0', '#FF7096', '#AB47BC', '#00E676'];
    const balloonCount = 34;

    ctx.save();
    for (let i = 0; i < balloonCount; i++) {
      // 确定性散布
      const seed = i * 29.3;
      const offX = ((Math.sin(seed) * 160));
      const bx = seamX + offX;
      const by = (i / balloonCount) * (H + 200) - 100 + Math.sin(prog * 8 + i) * 22;
      const bw = 38 + (Math.sin(seed + 1) * 0.5 + 0.5) * 20;
      const bh = bw * 1.25;
      const bob = Math.sin(prog * 10 + i * 1.7) * 8;
      const sway = Math.sin(prog * 6 + i * 2.3) * 10;

      // 气球牵绳
      ctx.strokeStyle = '#0B2F6E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx + sway, by + bh * 0.48 + bob);
      ctx.quadraticCurveTo(bx + sway - 15, by + bh * 0.8 + bob, bx + sway - 30, by + bh * 1.2 + bob);
      ctx.stroke();

      // 气球本体
      ctx.fillStyle = BALLOON_COLORS[i % BALLOON_COLORS.length];
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 4.5;

      ctx.beginPath();
      ctx.ellipse(bx + sway, by + bob, bw, bh, Math.sin(seed) * 0.2, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // 气球高光
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bx + sway - bw * 0.35, by + bob - bh * 0.35, bw * 0.28, bh * 0.18, -0.4, 0, TAU);
      ctx.fill();

      // 气球下端小打结
      ctx.fillStyle = NAVY;
      ctx.beginPath();
      ctx.moveTo(bx + sway - 5, by + bh * 0.48 + bob);
      ctx.lineTo(bx + sway + 5, by + bh * 0.48 + bob);
      ctx.lineTo(bx + sway, by + bh * 0.56 + bob);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });

  // ==================== 6. push: 新镜推走旧镜 ====================
  // 新镜头以实体卡片质感将旧镜头挤出屏幕, 分割线带深蓝描边与阴影
  register('push', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const dir = p.dir || 'left'; // 'left' (向左推: A 向左移出, B 从右推入)
    const prog = easeInOutCubic(clamp(u, 0, 1));

    let dxA = 0, dyA = 0, dxB = 0, dyB = 0;
    let lineX0 = 0, lineY0 = 0, lineX1 = 0, lineY1 = 0;

    if (dir === 'left') {
      dxA = -W * prog;
      dxB = W * (1 - prog);
      lineX0 = lineX1 = dxB;
      lineY0 = 0; lineY1 = H;
    } else if (dir === 'right') {
      dxA = W * prog;
      dxB = -W * (1 - prog);
      lineX0 = lineX1 = dxB + W;
      lineY0 = 0; lineY1 = H;
    } else if (dir === 'up') {
      dyA = -H * prog;
      dyB = H * (1 - prog);
      lineX0 = 0; lineX1 = W;
      lineY0 = lineY1 = dyB;
    } else { // 'down'
      dyA = H * prog;
      dyB = -H * (1 - prog);
      lineX0 = 0; lineX1 = W;
      lineY0 = lineY1 = dyB + H;
    }

    ctx.save();
    ctx.drawImage(canvasA, dxA, dyA);

    // 阴影与新镜
    ctx.save();
    ctx.shadowColor = 'rgba(7, 30, 74, 0.45)';
    ctx.shadowBlur = 32;
    ctx.drawImage(canvasB, dxB, dyB);
    ctx.restore();

    // 分界线描边
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(lineX0, lineY0);
    ctx.lineTo(lineX1, lineY1);
    ctx.stroke();

    ctx.strokeStyle = '#FFE082';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  });

  // ==================== 7. zoom_blur: 惊喜放射推进 ====================
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

  // ==================== 8. wipe: 经典方向擦除 ====================
  register('wipe', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const H = canvasA.height || 1080;
    const p = params || {};
    const dir = p.dir || 'right';
    const prog = easeInOutCubic(clamp(u, 0, 1));
    const borderW = p.borderWidth || 10;
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

    // 擦除分界线
    ctx.beginPath();
    if (dir === 'right') { ctx.moveTo(W * prog, 0); ctx.lineTo(W * prog, H); }
    else if (dir === 'left') { ctx.moveTo(W * (1 - prog), 0); ctx.lineTo(W * (1 - prog), H); }
    else if (dir === 'down') { ctx.moveTo(0, H * prog); ctx.lineTo(W, H * prog); }
    else if (dir === 'up') { ctx.moveTo(0, H * (1 - prog)); ctx.lineTo(W, H * (1 - prog)); }
    ctx.lineWidth = borderW;
    ctx.strokeStyle = borderCol;
    ctx.stroke();

    ctx.strokeStyle = '#FFE082';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  });

  // ==================== 9. whip: 动态甩镜横摇 ====================
  register('whip', (ctx, canvasA, canvasB, u, params) => {
    const W = canvasA.width || 1920;
    const p = params || {};
    const dirSign = p.dir === 'left' ? 1 : -1;
    const prog = easeInOutCubic(clamp(u, 0, 1));
    const offsetA = dirSign * W * prog;
    const offsetB = offsetA - dirSign * W;

    ctx.drawImage(canvasA, offsetA, 0);
    ctx.drawImage(canvasB, offsetB, 0);

    // 高速中段动态多重曝光运动模糊
    const speed = Math.sin(prog * Math.PI);
    if (speed > 0.35) {
      ctx.save();
      ctx.globalAlpha = 0.22 * speed;
      const blurOffsets = [-36, -18, 18, 36];
      for (const bo of blurOffsets) {
        ctx.drawImage(canvasA, offsetA + bo, 0);
        ctx.drawImage(canvasB, offsetB + bo, 0);
      }
      ctx.restore();
    }
  });

  // 主调度执行
  function apply(type, ctx, canvasA, canvasB, u, params) {
    const fn = registry[type] || registry.cut;
    fn(ctx, canvasA, canvasB, u, params || {});
  }

  const Transitions = {
    registry,
    register,
    apply,
  };

  root.V12Transitions = Transitions;
  if (typeof module !== 'undefined' && module.exports) module.exports = Transitions;
})(typeof globalThis !== 'undefined' ? globalThis : this);
