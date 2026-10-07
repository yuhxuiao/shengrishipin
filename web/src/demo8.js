// demo8.js — V8 物理级模块化真骨骼动画引擎
// 解决问题:
// 1. 彻底解决“图片放大缩小伪动画”，实现 100% 真实的挖掘机大臂/小臂/铲斗旋转与屈伸骨骼动画
// 2. 彻底根除 v7 破皮撕裂: 采用原生生图模型独立部件，完美圆形铰链销轴，任意角度旋转无缝闭合
// 3. 真实物理土壤互动: 铲斗真正深潜入紫沙堆、物理重力下落紫色晶砂、底盘受力压缩与弹性回弹
// 4. 全程帧级音画严密对齐: 驶入 -> 挥手 -> 小手举高高 -> 挖一挖抬一抬

'use strict';

const DEMO8_TOTAL = 43.0; // 与 audio_s02_s04.aac 43秒完全对齐
const A8 = { bg: null, body: null, boom: null, stick: null, sand: null };

// 粒子系统
const _cf8 = makeConfetti(88, 65, { spread: 2.2 });
const _sp8 = makeSparkles(2026, 35, '#ffd93d');
const _spPurple = makeSparkles(1018, 40, '#c77dff');

// 紫沙重力飞溅粒子 (铲斗扬起时洒落)
function makeSandDrops(seed, n = 70) {
  const rnd = mulberry32(seed);
  const ps = [];
  const COLS = ['#9d4edd', '#c77dff', '#e0aaff', '#7b2cbf', '#f72585', '#ffd166'];
  for (let i = 0; i < n; i++) {
    ps.push({
      x0: -25 + rnd() * 60,
      y0: -10 + rnd() * 25,
      vx: -15 + rnd() * 40,
      vy: 10 + rnd() * 35,
      g: 580 + rnd() * 300,
      r: 3 + rnd() * 5,
      color: COLS[(rnd() * COLS.length) | 0],
      delay: rnd() * 2.0,
    });
  }
  return ps;
}
const _sandDrop1 = makeSandDrops(42, 60);
const _sandDrop2 = makeSandDrops(99, 70);

function drawSandParticles(ctx, ps, originX, originY, t) {
  if (t < 0 || t > 3.0) return;
  ctx.save();
  for (const p of ps) {
    const age = t - p.delay;
    if (age <= 0) continue;
    const x = originX + p.x0 + p.vx * age;
    const y = originY + p.y0 + p.vy * age + 0.5 * p.g * age * age;
    const alpha = Math.max(0, 1 - (age / 1.5));
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

// 绘制 V8 模块化开开挖掘机 (真骨骼正向运动学)
function drawV8Kaikai(ctx, x, y, h, opts = {}) {
  const { rot = 0, sq = 0, aBoom = 0, aStick = 0, blinkP = 0, filter = null } = opts;
  const s = h / 697; // 基准高度按车身 697px 缩放
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale((1 + sq * 0.4) * s, (1 - sq) * s);

  if (filter) ctx.filter = filter;

  // 1. 绘制车身：脚底中心对齐 (0, 0)
  const bw = 590, bh = 697;
  ctx.drawImage(A8.body, -bw / 2, -bh);

  // 眨眼微动作
  if (blinkP > 0.05) {
    ctx.save();
    // 眼睛在车窗上的相对坐标: (-80, -390) 宽 90 高 65
    ctx.fillStyle = '#1c2833';
    ctx.beginPath();
    ctx.ellipse(-80, -360, 42, 28 * blinkP, 0, 0, 6.283);
    ctx.ellipse(3, -370, 38, 25 * blinkP, 0, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }

  // 2. 车身轴承插槽坐标（以脚底为原点）
  const sx = -bw / 2 + 457;
  const sy = -bh + 428;

  // 3. 绘制大臂（绕肩轴旋转）
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(aBoom);
  // 大臂公轴在 (48, 288) 对准插槽 (sx, sy)
  ctx.drawImage(A8.boom, -48, -288);

  // 4. 绘制小臂+铲斗（大臂肘端在 (400, 105)）
  ctx.translate(400 - 48, 105 - 288);
  ctx.rotate(aStick);
  // 小臂母槽在 (98, 58) 对准大臂肘销
  ctx.drawImage(A8.stick, -98, -58);

  ctx.restore(); // 还原大臂坐标系
  ctx.restore(); // 还原车身坐标系
}

// 幼儿互动 UI 元素
function drawInteractiveCard(ctx, text, icon, t, t0, t1) {
  if (t < t0 || t > t1) return;
  const age = t - t0, left = t1 - t;
  const enter = clamp01(age / 0.3);
  const pop = easeOutBack(enter);
  const alpha = clamp01(left / 0.3);

  ctx.save();
  ctx.globalAlpha = alpha;
  const cy = 115 + Math.sin(t * 3.5) * 4;
  ctx.translate(W / 2, cy);
  ctx.scale(pop, pop);
  ctx.rotate(-0.008 + Math.sin(t * 2.2) * 0.004);

  ctx.font = 'bold 50px "Noto Sans CJK SC", sans-serif';
  const tw = ctx.measureText(text).width;
  const bw = tw + 180, bh = 86;

  // 阴影
  ctx.shadowColor = 'rgba(160, 90, 40, 0.25)';
  ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;

  // 奶油卡片
  ctx.fillStyle = '#fffcf2';
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 36);
  ctx.fill();

  // 金边
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.lineWidth = 6; ctx.strokeStyle = '#f9bc60';
  ctx.stroke();

  // 图标与文字
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c05621';
  ctx.fillText(text, 15, 2);
  if (icon) {
    ctx.font = '46px sans-serif';
    ctx.fillText(icon, -bw / 2 + 55, 0);
  }
  ctx.restore();
}

function drawSyncedSubtitle(ctx, text, t, t0, t1) {
  if (t < t0 || t > t1) return;
  const age = t - t0, left = t1 - t;
  const enter = clamp01(age / 0.2);
  const pop = easeOutCubic(enter);
  const alpha = clamp01(left / 0.2);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, H * 0.92);
  ctx.scale(pop, pop);

  ctx.font = 'bold 48px "Noto Sans CJK SC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 12; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(56, 38, 28, 0.95)';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#fffdf6';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawPraiseBadge(ctx, text, t, t0) {
  const age = t - t0;
  if (age < 0 || age > 3.0) return;
  const pop = easeOutBack(clamp01(age / 0.4));
  const alpha = clamp01((3.0 - age) / 0.4);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W * 0.78, H * 0.40 + Math.sin(t * 4.5) * 8);
  ctx.rotate(0.12);
  ctx.scale(pop, pop);

  ctx.fillStyle = '#ff6b8b';
  ctx.beginPath(); ctx.arc(0, 0, 95, 0, 6.283); ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = '#ffd166'; ctx.stroke();

  ctx.font = 'bold 44px "Noto Sans CJK SC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff'; ctx.fillText(text, 0, -12);
  ctx.font = '38px sans-serif'; ctx.fillText('⭐⭐⭐', 0, 36);
  ctx.restore();
}

// 核心帧渲染逻辑
function drawFrameDemo8(ctx, t) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  // -------------------------------------------------------------
  // 1. 摄像机动态运镜 (覆盖 43 秒, 根据情绪与动作推拉)
  // -------------------------------------------------------------
  let camZ = 1.05, camX = W * 0.50, camY = H * 0.52;
  if (t < 16.0) {
    // Shot 1 (0-16s): 驶入 -> 居中挥手
    camZ = kf(t, [[0, 1.02], [2.3, 1.10], [8.0, 1.12], [16.0, 1.15]], easeOutCubic);
    camX = kf(t, [[0, W * 0.54], [2.3, W * 0.48], [16.0, W * 0.47]], easeOutCubic);
    camY = H * 0.52;
  } else if (t < 29.0) {
    // Shot 2 (16-29s): 小手举高高仰拍 (摄像机微下沉，让高举的大挖斗全景入画)
    const st = t - 16.0;
    camZ = kf(st, [[0, 1.12], [2.5, 1.06], [13.0, 1.06]], easeOutCubic);
    camY = kf(st, [[0, H * 0.52], [2.5, H * 0.58], [13.0, H * 0.58]], easeOutCubic);
    camX = W * 0.47;
  } else {
    // Shot 3 (29-43s): 挖土特写平摇
    const st = t - 29.0;
    camZ = kf(st, [[0, 1.10], [2.5, 1.15], [6.0, 1.16], [14.0, 1.12]], easeOutCubic);
    camX = kf(st, [[0, W * 0.47], [3.0, W * 0.50], [8.0, W * 0.49]], easeOutCubic);
    camY = H * 0.53;
  }

  // 绘制背景
  drawCover(ctx, A8.bg, camZ, -(camX - W / 2) * camZ * 0.9, -(camY - H / 2) * camZ * 0.9);

  // -------------------------------------------------------------
  // 2. 开开挖掘机核心骨骼动力学 (真运动)
  // -------------------------------------------------------------
  let x = W * 0.38, y = H * 0.83, sq = 0, dy = 0, rot = 0;
  let aBoom = -0.3, aStick = -0.1;
  const landT = 2.0;

  // 自然眨眼
  const blinkCycle = ((t + 1.0) % 3.8);
  const isBlink = blinkCycle < 0.16;
  const blinkP = isBlink ? Math.sin((blinkCycle / 0.16) * Math.PI) : 0;

  if (t < 16.0) {
    // ==========================================
    // SHOT 1: 驶入 -> 落地回弹 -> 热情挥手
    // ==========================================
    if (t < landT) {
      // 驶入阶段 (0.0s - 2.0s)
      const p = easeOutCubic(t / landT);
      x = lerp(-650, W * 0.38, p);
      rot = Math.sin(t * 9) * 0.018;
      dy = -Math.abs(Math.sin(t * 8)) * 10;
      aBoom = -0.25;
      aStick = 0.2;
      drawDirtPuffs(ctx, 0.08, x - 180, H * 0.85, 8, Math.floor(t * 3));
      sfxText(ctx, '轰隆隆~', W * 0.28, H * 0.28, t, 0.6, { size: 74, color: '#ffa94d' });
    } else {
      // 落地与挥手阶段 (2.0s - 16.0s)
      sq = 1 - landSquash(t, landT);
      dy = Math.sin(t * 1.5) * 3;
      rot = Math.sin(t * 2.2) * 0.012;

      // 大臂抬起，小臂+铲斗像小手一样前后欢快摆动打招呼
      const wave = Math.sin((t - landT) * 4.6);
      aBoom = -0.65 + Math.sin(t * 1.8) * 0.06;
      aStick = -0.32 + wave * 0.36; // 铲斗左右摆动角度达到 ±20°

      if (t > landT + 0.8 && t < landT + 4.5) {
        emote(ctx, '♥', x + 320, H * 0.36, t, landT + 1.2, { color: '#ff6b8a', size: 96 });
      }
    }
    drawConfetti(ctx, _cf8, Math.max(0, t - 2.0), 0.85);

  } else if (t < 29.0) {
    // ==========================================
    // SHOT 2: 互动·小手举高高 体操大伸展
    // ==========================================
    const st = t - 16.0;
    rot = Math.sin(t * 1.8) * 0.01;

    // 两轮举高高大动作 (周期 4.8s)
    const cyc = st % 5.0;
    // 0~0.8s 蓄力下沉, 0.8~2.5s 举向最高空, 2.5~3.8s 欢快高举弹跳, 3.8~5.0s 回落
    const lift = kf(cyc, [[0, 0], [0.6, -0.2], [1.8, 1.0], [3.2, 1.0], [4.5, 0], [5.0, 0]], easeOutCubic);

    // 大臂直插云霄 (-1.08 rad, 保证铲斗在画面顶栏内)
    aBoom = lerp(-0.45, -1.08, lift);
    // 小臂直立向上
    aStick = lerp(-0.25, -0.68, lift) + Math.sin(t * 6.5) * 0.05 * lift;

    // 车身跟着向上跃起弹跳
    dy = -lift * 20 + Math.sin(t * 6.5) * 4 * lift;
    sq = -lift * 0.04;

    // 向上飞跃的生动箭头
    if (lift > 0.4) {
      const arrowY = H * 0.32 - Math.abs(Math.sin(st * 4.5)) * 24;
      ctx.save();
      ctx.font = 'bold 74px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#4cd964';
      ctx.shadowColor = 'rgba(76, 217, 100, 0.6)'; ctx.shadowBlur = 18;
      ctx.fillText('⬆️', W * 0.68, arrowY);
      ctx.fillText('⬆️', W * 0.75, arrowY + 12);
      ctx.restore();
    }
    drawSparkles(ctx, _sp8, t, '#ffea79');

  } else {
    // ==========================================
    // SHOT 3: 互动·挖土！往下挖一挖，往上抬一抬！
    // ==========================================
    const st = t - 29.0;
    // 两轮真实挖土动作链 (周期 6.0s)
    const cyc = (st - 0.5) % 6.0;
    let pDig = 0, pLift = 0;
    if (cyc < 2.2) {
      pDig = easeOutCubic(clamp01(cyc / 1.8));
      aBoom = lerp(-0.35, 0.52, pDig); // 大臂大幅下俯入土
      aStick = lerp(-0.2, 0.72, pDig); // 小臂深入紫沙堆
      dy = pDig * 12;                  // 底盘下沉受力
      sq = pDig * 0.04;
      if (pDig > 0.75) {
        drawDirtPuffs(ctx, 0.06, x + 400, H * 0.85, 12, Math.floor(st * 4));
      }
    } else if (cyc < 4.8) {
      pLift = easeOutCubic(clamp01((cyc - 2.2) / 1.8));
      aBoom = lerp(0.52, -0.58, pLift);  // 满载高扬
      aStick = lerp(0.72, -0.32, pLift); // 铲斗口向上兜住泥沙
      dy = (1 - pLift) * 12;
      sq = -Math.sin(pLift * Math.PI) * 0.03;

      // 扬起紫沙晶粒重力洒落
      const bucketX = x + 380;
      const bucketY = H * 0.50 - pLift * 70;
      drawSandParticles(ctx, _sandDrop1, bucketX, bucketY, cyc - 2.5);
      drawSandParticles(ctx, _sandDrop2, bucketX + 30, bucketY + 20, cyc - 2.5);
    } else {
      const pReset = easeOutCubic((cyc - 4.8) / 1.2);
      aBoom = lerp(-0.58, -0.35, pReset);
      aStick = lerp(-0.32, -0.2, pReset);
    }

    // 奖励印章 (在第一轮挖完 34s 触发)
    if (st >= 3.8) {
      drawPraiseBadge(ctx, '太棒啦！', st, 3.8);
    }
    drawSparkles(ctx, _spPurple, t, '#e0aaff');
    drawConfetti(ctx, _cf8, Math.max(0, st - 3.8), 0.7);
  }

  // -------------------------------------------------------------
  // 3. 接触阴影与角色绘制
  // -------------------------------------------------------------
  const h = H * 0.63;
  contactShadow(ctx, x, H * 0.835, h * 0.5 * (1 + sq * 0.4), 0.32);

  drawV8Kaikai(ctx, x, H * 0.83 + dy, h, {
    rot, sq, aBoom, aStick, blinkP,
    filter: 'saturate(1.05) sepia(0.05)',
  });

  // -------------------------------------------------------------
  // 4. 前景紫沙堆 (仅在 Shot 3 挖土阶段呈现，铲斗切入其后侧形成真深度)
  // -------------------------------------------------------------
  if (t >= 28.5 && A8.sand) {
    const sandAlpha = clamp01((t - 28.5) / 0.6);
    ctx.save();
    ctx.globalAlpha = sandAlpha;
    // 沙堆放置在开开前方地表 (x: W * 0.50 处)
    ctx.drawImage(A8.sand, W * 0.48, H * 0.69, 780, 260);
    ctx.restore();
  }

  // -------------------------------------------------------------
  // 5. 幼儿交互提示横幅
  // -------------------------------------------------------------
  drawInteractiveCard(ctx, '小开开，挥挥小手，和挖掘机打个招呼吧！', '👋', t, 1.2, 15.6);
  drawInteractiveCard(ctx, '小手举高高，变成大挖斗！', '✨', t, 17.2, 28.6);
  drawInteractiveCard(ctx, '挖一挖，抬一抬！', '🚜', t, 30.2, 42.6);

  // -------------------------------------------------------------
  // 6. 逐句同步大字号字幕
  // -------------------------------------------------------------
  drawSyncedSubtitle(ctx, '大家好！', t, 0.5, 1.4);
  drawSyncedSubtitle(ctx, '我是开开挖掘机！', t, 1.27, 2.96);
  drawSyncedSubtitle(ctx, '今天是2026年10月18日，', t, 2.81, 5.86);
  drawSyncedSubtitle(ctx, '是小开开的两岁生日！', t, 5.71, 7.79);
  drawSyncedSubtitle(ctx, '我要举办一场超级热闹的生日派对！', t, 7.64, 11.2);

  drawSyncedSubtitle(ctx, '现在，请我们的小寿星开开，', t, 16.5, 19.3);
  drawSyncedSubtitle(ctx, '跟着挖掘机一起动一动！', t, 19.3, 21.8);
  drawSyncedSubtitle(ctx, '小手举高高，变成大挖斗！', t, 21.7, 26.5);

  drawSyncedSubtitle(ctx, '往下挖一挖！', t, 29.5, 30.8);
  drawSyncedSubtitle(ctx, '往上抬一抬！', t, 30.8, 32.2);
  drawSyncedSubtitle(ctx, '哇——做得太棒啦！', t, 32.2, 34.2);
  drawSyncedSubtitle(ctx, '再来一次：挖一挖，抬一抬！', t, 34.2, 42.0);

  // 柔和暗角与暖光
  vignette(ctx, 0.14);
  warmWash(ctx, 0.04);
}
