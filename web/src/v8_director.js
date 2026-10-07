// v8_director.js — 顶级分镜级儿童动画导演引擎 (Master Synced Edition)
// 1. 严格音画同步: 旁白、音效与视觉动作毫秒级对齐
// 2. 真实机械物理与前向运动学: 大臂前方作业，挖掘时底盘承重下沉、扬斗时重力土石散落
// 3. 互动虚影引导: 放弃生硬符号，采用半透明发光小手虚影+金光光晕动作引导
// 4. 真实挖土动力学与材质统一: 草坪暖调土沙堆、铲斗挖入形变凹坑、满载泥土与自然重力泥粒飞溅

'use strict';

const V8_DIRECTOR_TOTAL = 38.0;
const D8 = {
  bg_party: null,
  body: null,
  boom: null,
  stick: null,
  mound_full: null,
  mound_dug: null,
  dirt_payload: null,
  guide_hands: null,
};

// 粒子系统
const _d8Confetti = makeConfetti(108, 70, { spread: 2.2 });
const _d8Sparkles = makeSparkles(2026, 40, '#ffea79');
const _d8DirtSparkles = makeSparkles(1018, 30, '#ffd166');

// 真实土壤泥沙重力掉落微粒系统 (自然泥土与金沙色系，彻底告别紫色)
function makeDirectorEarthDrops(seed, n = 80) {
  const rnd = mulberry32(seed);
  const ps = [];
  const COLS = ['#4a2e18', '#633f21', '#85562e', '#ad733e', '#d49b57', '#e8be78', '#5c442c', '#b88144'];
  for (let i = 0; i < n; i++) {
    ps.push({
      x0: -25 + rnd() * 60,
      y0: -15 + rnd() * 30,
      vx: -22 + rnd() * 48,
      vy: 15 + rnd() * 50,
      g: 720 + rnd() * 320,
      r: 2.8 + rnd() * 5.2,
      color: COLS[(rnd() * COLS.length) | 0],
      delay: rnd() * 1.5,
    });
  }
  return ps;
}
const _earthDropA = makeDirectorEarthDrops(42, 75);
const _earthDropB = makeDirectorEarthDrops(99, 85);

function drawGravitySoil(ctx, ps, originX, originY, t) {
  if (t < 0 || t > 2.8) return;
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

// 核心前向运动学绘制（右前正向视角）
// Body (559x603), Socket A=(290, 447)
// Boom (440x304), Base B1=(69, 230), Elbow=(408, 31)
// Stick (506x207), Elbow C=(55, 74)
function drawKaikaiCorrectFK(ctx, x, y, h, opts = {}) {
  const { rot = 0, sq = 0, aBoom = 0, aStick = 0, hasPayload = false, filter = null } = opts;
  const bw = 559, bh = 603;
  const s = h / bh; // 基准高度按车身 603px 缩放

  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale((1 + sq * 0.4) * s, (1 - sq) * s);

  if (filter) ctx.filter = filter;

  // 1. 绘制车身：脚底中心对齐 (0, 0)
  ctx.drawImage(D8.body, -bw / 2, -bh);

  // 2. 车身轴承插槽坐标 A (290, 447)
  const Ax = -bw / 2 + 290;
  const Ay = -bh + 447;

  // 3. 绘制大臂（绕肩轴 A 旋转）
  ctx.save();
  ctx.translate(Ax, Ay);
  ctx.rotate(aBoom);
  // 大臂公轴在 (69, 230) 对准 A
  ctx.drawImage(D8.boom, -69, -230);

  // 4. 绘制小臂+铲斗（大臂肘端在 (408, 31)，从 B1 出发偏移 (339, -199)）
  ctx.translate(339, -199);
  ctx.rotate(aStick);
  // 小臂母槽在 (55, 74) 对准大臂肘销
  ctx.drawImage(D8.stick, -55, -74);

  // 5. 铲斗满载新鲜泥沙 (在铲斗内腔 (310, -25))
  if (hasPayload && D8.dirt_payload) {
    ctx.save();
    ctx.drawImage(D8.dirt_payload, 310, -25, 122, 86);
    ctx.restore();
  }

  ctx.restore(); // 还原大臂坐标系
  ctx.restore(); // 还原车身坐标系
}

// 幼儿互动 UI 元素: 顶部提示卡片
function drawDirectorCard(ctx, text, icon, t, t0, t1) {
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

  ctx.shadowColor = 'rgba(160, 90, 40, 0.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fffcf2';
  ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 36); ctx.fill();

  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.lineWidth = 6; ctx.strokeStyle = '#f9bc60'; ctx.stroke();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c05621';
  ctx.fillText(text, 15, 2);
  if (icon) {
    ctx.font = '46px sans-serif';
    ctx.fillText(icon, -bw / 2 + 55, 0);
  }
  ctx.restore();
}

// 逐句台词字幕 (清晰描边可读)
function drawDirectorSubtitle(ctx, text, t, t0, t1) {
  if (t < t0 || t > t1) return;
  const age = t - t0, left = t1 - t;
  const enter = clamp01(age / 0.15);
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

// 互动成功奖励徽章
function drawDirectorBadge(ctx, text, t, t0) {
  const age = t - t0;
  if (age < 0 || age > 3.2) return;
  const pop = easeOutBack(clamp01(age / 0.35));
  const alpha = clamp01((3.2 - age) / 0.35);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W * 0.83, H * 0.35 + Math.sin(t * 4.5) * 8);
  ctx.rotate(0.10);
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

// 动作互动小手虚影引导系统 (替换生硬符号)
function drawGuideHandsUp(ctx, t, t0, t1) {
  if (t < t0 || t > t1 || !D8.guide_hands) return;
  const age = t - t0, left = t1 - t;
  const enter = clamp01(age / 0.4);
  const exit = clamp01(left / 0.4);
  const alpha = Math.min(enter, exit) * 0.88;

  const floatY = Math.sin(t * 4.2) * 16;
  const x = W * 0.74;
  const y = H * 0.44 + floatY;

  ctx.save();
  ctx.translate(x, y);

  // 1. 金色向外扩散的光晕与引导环
  const ringPhase = ((t - t0) * 1.5) % 1.0;
  const ringR = 120 + ringPhase * 160;
  const ringAlpha = (1 - ringPhase) * 0.5 * alpha;
  ctx.strokeStyle = `rgba(255, 215, 64, ${ringAlpha})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, 6.283);
  ctx.stroke();

  // 2. 核心温暖发光背底
  const grad = ctx.createRadialGradient(0, 0, 30, 0, 0, 220);
  grad.addColorStop(0, `rgba(255, 240, 160, ${alpha * 0.75})`);
  grad.addColorStop(0.6, `rgba(255, 200, 60, ${alpha * 0.35})`);
  grad.addColorStop(1, 'rgba(255, 200, 60, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 220, 0, 6.283);
  ctx.fill();

  // 3. 绘制胖乎乎的卡通小手举高虚影 (半透明温润)
  ctx.globalAlpha = alpha;
  const hw = 340, hh = 286;
  ctx.drawImage(D8.guide_hands, -hw / 2, -hh / 2, hw, hh);

  // 4. 向上伸展动效提示药丸卡片 (自适应文字宽度)
  const labelText = '跟开开一起举高高！🙌';
  ctx.font = 'bold 32px "Noto Sans CJK SC", sans-serif';
  const tw = ctx.measureText(labelText).width;
  const pw = tw + 52, ph = 52;
  const labelY = hh / 2 + 38;

  ctx.shadowColor = 'rgba(180, 83, 9, 0.25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(-pw / 2, labelY - ph / 2, pw, ph, 26);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b45309';
  ctx.fillText(labelText, 0, labelY);

  ctx.restore();
}

// =================================================================
// 核心导演总渲染逻辑 (时间 t 从 0.0s 到 38.0s)
// =================================================================
function drawFrameDirector(ctx, t) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  if (t < 13.8) {
    // =============================================================
    // 分镜 1 (s02): 开开登场 & 热情打招呼 (0.0s - 13.8s)
    // 音频对齐: s02_0.mp3 从 t = 2.4s 开始播放
    // 0.0s - 2.2s: 开开从左驶入草坪中景，引擎轰鸣
    // 2.2s - 2.4s: 刹车停稳微弹
    // 2.4s - 5.0s: "大家好！我是开开挖掘机！" -> 欢快举臂挥手3次
    // 5.0s - 7.5s: "今天是2026年10月18日" -> 萌态点点头
    // 7.5s - 9.3s: "是小开开的两岁生日！" -> 自豪招牌姿势
    // 9.4s - 12.2s: "我要举办一场超级热闹的生日派对！" -> 彩带漫天
    // =============================================================
    const camZ = kf(t, [[0, 1.02], [2.2, 1.08], [8.0, 1.10], [13.8, 1.12]], easeOutCubic);
    const camX = kf(t, [[0, W * 0.53], [2.2, W * 0.48], [13.8, W * 0.47]], easeOutCubic);
    const camY = H * 0.52;

    drawCover(ctx, D8.bg_party, camZ, -(camX - W / 2) * camZ * 0.9, -(camY - H / 2) * camZ * 0.9);

    let x = W * 0.38, y = H * 0.84, sq = 0, dy = 0, rot = 0;
    let aBoom = -0.32, aStick = -0.15;
    const landT = 2.2;

    if (t < landT) {
      // 驶入阶段 (0.0s - 2.2s)
      const p = easeOutCubic(t / landT);
      x = lerp(-600, W * 0.38, p);
      rot = Math.sin(t * 9) * 0.018;
      dy = -Math.abs(Math.sin(t * 8)) * 10;
      aBoom = -0.22; aStick = 0.18;
      drawDirtPuffs(ctx, 0.08, x - 160, H * 0.86, 8, Math.floor(t * 3));
      sfxText(ctx, '轰隆隆~', W * 0.28, H * 0.28, t, 0.6, { size: 74, color: '#ffa94d' });
    } else {
      // 落地回弹
      sq = 1 - landSquash(t, landT);
      dy = Math.sin(t * 1.5) * 3;
      rot = Math.sin(t * 2.2) * 0.010;

      // 真正有节奏的幼儿卡通表演（挥手与台词严丝合缝）:
      // 2.4s开始台词 "大家好！我是开开挖掘机！"
      if (t < 2.5) {
        const pReady = easeOutCubic((t - landT) / 0.3);
        aBoom = lerp(-0.22, -0.30, pReady);
        aStick = lerp(0.18, 0.10, pReady);
      } else if (t < 5.2) {
        // 配合 "大家好！我是开开挖掘机！" 连续挥手 3 次
        const waveT = (t - 2.5);
        const waveSin = Math.sin(waveT * (Math.PI * 2 / 0.9));
        aBoom = -0.30 + waveSin * 0.05;
        aStick = 0.18 + waveSin * 0.30; // 前臂向前招手
        rot = waveSin * 0.012;
      } else if (t < 7.8) {
        // "今天是2026年10月18日" -> 手臂自然前伸，开心点头
        const pRest = easeOutCubic(clamp01((t - 5.2) / 0.8));
        aBoom = lerp(-0.30, -0.26, pRest) + Math.sin(t * 3.0) * 0.02;
        aStick = lerp(0.18, 0.08, pRest);
      } else {
        // "超级热闹的生日派对！" -> 自豪举臂
        const pPride = easeOutCubic(clamp01((t - 7.8) / 0.8));
        aBoom = lerp(-0.26, -0.34, pPride) + Math.sin(t * 2.0) * 0.03;
        aStick = lerp(0.08, 0.14, pPride);
      }

      if (t > 2.6 && t < 5.8) {
        emote(ctx, '♥', x + 320, H * 0.36, t, 3.0, { color: '#ff6b8a', size: 96 });
      }
    }

    const h = H * 0.62;
    contactShadow(ctx, x, H * 0.845, h * 0.45 * (1 + sq * 0.4), 0.32);

    drawKaikaiCorrectFK(ctx, x, H * 0.84 + dy, h, {
      rot, sq, aBoom, aStick,
      filter: 'saturate(1.05) sepia(0.05)',
    });

    drawConfetti(ctx, _d8Confetti, Math.max(0, t - 7.5), 0.85);

    // 交互卡片
    drawDirectorCard(ctx, '小开开，挥挥小手，和挖掘机打个招呼吧！', '👋', t, 0.8, 13.5);

    // 严丝合缝的台词 (与 s02_0.mp3 实际发音吻合)
    drawDirectorSubtitle(ctx, '大家好！', t, 2.4, 3.4);
    drawDirectorSubtitle(ctx, '我是开开挖掘机！', t, 3.5, 4.9);
    drawDirectorSubtitle(ctx, '今天是2026年10月18日，', t, 5.0, 7.4);
    drawDirectorSubtitle(ctx, '是小开开的两岁生日！', t, 7.5, 9.3);
    drawDirectorSubtitle(ctx, '我要举办一场超级热闹的生日派对！', t, 9.4, 12.2);

  } else if (t < 24.8) {
    // =============================================================
    // 分镜 2 (s03): 互动·小手举高高 体操大伸展 (13.8s - 24.8s)
    // 音频对齐: s03_0.mp3 从 t = 14.5s 开始播放
    // 14.5s - 17.2s: "请我们的小寿星开开" -> 蓄力与聆听
    // 17.2s - 19.2s: "跟着挖掘机一起动一动" -> 屈膝下蹲蓄力
    // 19.3s - 20.5s: "小手举高高！" -> 大臂冲天举起，小手虚影同步显现！
    // 20.6s - 23.0s: "变成大挖斗！" -> 铲斗手腕开合 flex，金色光芒四射
    // =============================================================
    const st = t - 13.8; // 0.0 - 11.0s
    const camZ = kf(st, [[0, 1.06], [2.5, 1.03], [11.0, 1.03]], easeOutCubic);
    const camY = kf(st, [[0, H * 0.54], [2.5, H * 0.62], [11.0, H * 0.62]], easeOutCubic);
    const camX = W * 0.48;

    drawCover(ctx, D8.bg_party, camZ, -(camX - W / 2) * camZ * 0.9, -(camY - H / 2) * camZ * 0.9);

    // 镜间光晕转场
    if (st < 0.6) {
      const p = st / 0.6;
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.fillStyle = '#fff7ea'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    let x = W * 0.35, y = H * 0.86, sq = 0, dy = 0, rot = 0;
    let aBoom = -0.32, aStick = -0.15;

    // 动作表演节奏:
    // 0~3.4s (t: 13.8~17.2s): 听旁白，轻轻点头
    // 3.4~5.0s (t: 17.2~18.8s): 屈膝下蹲蓄力
    // 5.0~7.2s (t: 18.8~21.0s): "小手举高高" 冲天举臂！
    // 7.2~11.0s (t: 21.0~24.8s): "变成大挖斗" 铲斗灵动屈伸！
    if (st < 3.4) {
      const pListen = easeOutCubic(st / 3.4);
      dy = Math.sin(st * 4.0) * 3;
      aBoom = lerp(-0.30, -0.24, pListen);
      aStick = lerp(0.10, 0.05, pListen);
    } else if (st < 5.0) {
      // 蓄力下蹲
      const pSquat = easeOutCubic((st - 3.4) / 1.6);
      dy = pSquat * 12; sq = pSquat * 0.05;
      aBoom = lerp(-0.24, -0.18, pSquat);
      aStick = lerp(0.05, 0.02, pSquat);
    } else if (st < 7.2) {
      // "小手举高高！" 冲天伸展
      const pLift = easeOutCubic(clamp01((st - 5.0) / 1.5));
      aBoom = lerp(-0.18, -0.50, pLift); // 强劲举臂冲天
      aStick = lerp(0.02, 0.16, pLift) + Math.sin(st * 5.0) * 0.04 * pLift;
      dy = -pLift * 18 + Math.sin(st * 5.0) * 4 * pLift;
      sq = -pLift * 0.03;
    } else {
      // "变成大挖斗！" 铲斗灵动开合
      aBoom = -0.50 + Math.sin(st * 2.5) * 0.03;
      const flexWave = Math.sin((st - 7.2) * 5.0);
      aStick = 0.16 + flexWave * 0.22;
      dy = -16 + flexWave * 4;
    }

    const h = H * 0.60;
    contactShadow(ctx, x, H * 0.865, h * 0.45 * (1 + sq * 0.4), 0.30);

    drawKaikaiCorrectFK(ctx, x, y + dy, h, {
      rot, sq, aBoom, aStick,
      filter: 'saturate(1.05) sepia(0.05)',
    });

    // 互动小手虚影引导系统 (与 "小手举高高" 严密对齐)
    drawGuideHandsUp(ctx, t, 18.2, 24.2);

    drawSparkles(ctx, _d8Sparkles, t, '#ffea79');

    // 交互卡片
    drawDirectorCard(ctx, '小手举高高，变成大挖斗！', '✨', t, 14.2, 24.5);

    // 旁白对齐
    drawDirectorSubtitle(ctx, '现在，请我们的小寿星开开，', t, 14.6, 17.1);
    drawDirectorSubtitle(ctx, '跟着挖掘机一起动一动！', t, 17.2, 19.2);
    drawDirectorSubtitle(ctx, '小手举高高！', t, 19.3, 20.5);
    drawDirectorSubtitle(ctx, '变成大挖斗！', t, 20.6, 23.0);

  } else {
    // =============================================================
    // 分镜 3 (s04): 互动·挖土！往下挖一挖，往上抬一抬！ (24.8s - 38.0s)
    // 音频对齐: s04_0.mp3 从 t = 25.5s 开始播放
    // 25.6s - 26.8s: "往下挖一挖！" -> 铲斗切入真实泥沙堆，底盘受力形变，尘土四溅
    // 26.9s - 28.1s: "往上抬一抬！" -> 满载提升，重力泥粒飞溅掉落，沙堆显出挖过凹坑
    // 28.2s - 30.5s: "哇——做得太棒啦！" -> 奖励印章弹跳，彩带庆祝
    // 30.6s - 34.0s: "再来一次：挖一挖，抬一抬！" -> 第二轮动力学挖掘与扬土
    // 34.0s - 38.0s: 胜利谢幕，音乐淡出
    // =============================================================
    const st = t - 24.8; // 0.0 - 13.2s
    const camZ = kf(st, [[0, 1.08], [2.5, 1.12], [13.2, 1.10]], easeOutCubic);
    const camX = kf(st, [[0, W * 0.47], [3.0, W * 0.50], [13.2, W * 0.49]], easeOutCubic);
    const camY = H * 0.54;

    drawCover(ctx, D8.bg_party, camZ, -(camX - W / 2) * camZ * 0.9, -(camY - H / 2) * camZ * 0.9);

    // 镜间切镜头平滑转场
    if (st < 0.6) {
      const p = st / 0.6;
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.fillStyle = '#fff7ea'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    let x = W * 0.35, y = H * 0.84, sq = 0, dy = 0, rot = 0;
    let aBoom = -0.32, aStick = -0.15;
    let hasPayload = false;

    // 两轮真正的机械动力学挖掘 (完全锚定台词时刻):
    // 轮次 1:
    // 0.8s ~ 2.0s (t: 25.6 ~ 26.8s) 往下挖一挖: 深入下探、底盘承重压缩
    // 2.0s ~ 3.6s (t: 26.8 ~ 28.4s) 往上抬一抬: 翻斗舀起满载，重力沙土倾泻
    // 3.6s ~ 5.6s (t: 28.4 ~ 30.4s) "太棒啦！" 庆祝欢呼姿态
    // 轮次 2:
    // 5.8s ~ 7.0s (t: 30.6 ~ 31.8s) "挖一挖": 再次深入凹坑
    // 7.0s ~ 8.8s (t: 31.8 ~ 33.6s) "抬一抬": 再次举起扬土
    // 8.8s ~ 13.2s (t: 33.6 ~ 38.0s) 招牌致敬，谢幕
    if (st < 0.8) {
      // 准备就绪姿态
      aBoom = -0.32; aStick = -0.10;
    } else if (st < 2.0) {
      // 第 1 次往下挖 (25.6s - 26.8s)
      const pDig = easeOutCubic((st - 0.8) / 1.2);
      aBoom = lerp(-0.32, 0.22, pDig);
      aStick = lerp(-0.10, 0.36, pDig);
      dy = pDig * 14;     // 底盘受力压缩
      sq = pDig * 0.05;   // 轮胎/履带弹性挤压
      if (pDig > 0.6) {
        drawDirtPuffs(ctx, 0.08, x + 380, H * 0.84, 14, Math.floor(st * 5));
      }
    } else if (st < 3.6) {
      // 第 1 次往上抬 (26.8s - 28.4s)
      const pLift = easeOutCubic((st - 2.0) / 1.6);
      hasPayload = true;
      aBoom = lerp(0.22, -0.42, pLift);
      // 小臂强力内卷舀土 (从 0.36 内卷到 0.88 rad，彻底兜住泥土)
      aStick = lerp(0.36, 0.88, clamp01((st - 2.0) / 0.9));
      dy = (1 - pLift) * 14;
      sq = -Math.sin(pLift * Math.PI) * 0.04;

      // 泥土与重力颗粒散落飞溅
      if (st >= 2.2 && st <= 3.6) {
        const bucketX = x + 335;
        const bucketY = H * 0.56 - pLift * 80;
        drawGravitySoil(ctx, _earthDropA, bucketX, bucketY, st - 2.2);
      }
    } else if (st < 5.8) {
      // "太棒啦！" 庆祝，铲斗高举招展
      const pJoy = clamp01((st - 3.6) / 0.8);
      aBoom = lerp(-0.42, -0.34, pJoy) + Math.sin(st * 4.0) * 0.03;
      aStick = lerp(0.88, 0.22, pJoy) + Math.sin(st * 4.0) * 0.05;
      dy = Math.sin(st * 5.0) * 6;
      hasPayload = false;
    } else if (st < 7.0) {
      // 第 2 次往下挖 (30.6s - 31.8s)
      const pDig2 = easeOutCubic((st - 5.8) / 1.2);
      aBoom = lerp(-0.34, 0.24, pDig2);
      aStick = lerp(0.22, 0.38, pDig2);
      dy = pDig2 * 14;
      sq = pDig2 * 0.05;
      if (pDig2 > 0.6) {
        drawDirtPuffs(ctx, 0.08, x + 380, H * 0.84, 14, Math.floor(st * 5));
      }
    } else if (st < 8.8) {
      // 第 2 次往上抬 (31.8s - 33.6s)
      const pLift2 = easeOutCubic((st - 7.0) / 1.8);
      hasPayload = true;
      aBoom = lerp(0.24, -0.44, pLift2);
      aStick = lerp(0.38, 0.88, clamp01((st - 7.0) / 0.9));
      dy = (1 - pLift2) * 14;

      if (st >= 7.2 && st <= 8.8) {
        const bucketX = x + 335;
        const bucketY = H * 0.56 - pLift2 * 80;
        drawGravitySoil(ctx, _earthDropB, bucketX, bucketY, st - 7.2);
      }
    } else {
      // 最终胜利致意
      const pEnd = easeOutCubic(clamp01((st - 8.8) / 1.2));
      aBoom = lerp(-0.44, -0.30, pEnd) + Math.sin(st * 2.0) * 0.02;
      aStick = lerp(0.88, 0.12, pEnd);
      hasPayload = false;
      dy = Math.sin(st * 2.5) * 4;
    }

    // 1. 绘制真实沙堆与形变挖坑 (位置在开开正前方草坪)
    const sandW = 860, sandH = 452;
    const sandX = W * 0.48, sandY = H * 0.61;

    // 沙堆地面阴影
    contactShadow(ctx, sandX + sandW * 0.5, sandY + sandH * 0.94, sandW * 0.44, 0.35);

    // 挖土形变过渡: 26.4s (st: 1.6s) 之后平滑切换出挖过的沙坑
    const isDug = st >= 1.6;
    const dugTransition = clamp01((st - 1.6) / 0.4);

    if (D8.mound_full && (!isDug || dugTransition < 1.0)) {
      ctx.save();
      ctx.globalAlpha = 1 - dugTransition;
      ctx.drawImage(D8.mound_full, sandX, sandY, sandW, sandH);
      ctx.restore();
    }
    if (D8.mound_dug && isDug) {
      ctx.save();
      ctx.globalAlpha = dugTransition;
      ctx.drawImage(D8.mound_dug, sandX, sandY, sandW, sandH);
      ctx.restore();
    }

    const h = H * 0.62;
    contactShadow(ctx, x, H * 0.845, h * 0.45 * (1 + sq * 0.4), 0.32);

    // 2. 绘制开开挖掘机正向动力学与铲斗负载
    drawKaikaiCorrectFK(ctx, x, y + dy, h, {
      rot, sq, aBoom, aStick, hasPayload,
      filter: 'saturate(1.05) sepia(0.05)',
    });

    // 奖励印章 (在第一轮挖完 28.3s 爆发)
    if (t >= 28.3) {
      drawDirectorBadge(ctx, '太棒啦！', t, 28.3);
    }
    drawSparkles(ctx, _d8DirtSparkles, t, '#ffd166');
    drawConfetti(ctx, _d8Confetti, Math.max(0, t - 28.3), 0.75);

    // 交互卡片
    drawDirectorCard(ctx, '挖一挖，抬一抬！', '🚜', t, 25.0, 37.5);

    // 严格对齐旁白
    drawDirectorSubtitle(ctx, '往下挖一挖！', t, 25.6, 26.8);
    drawDirectorSubtitle(ctx, '往上抬一抬！', t, 26.9, 28.1);
    drawDirectorSubtitle(ctx, '哇——做得太棒啦！', t, 28.2, 30.5);
    drawDirectorSubtitle(ctx, '再来一次：挖一挖，抬一抬！', t, 30.6, 34.5);
  }

  // 柔和暗角与暖光
  vignette(ctx, 0.12);
  warmWash(ctx, 0.04);
}
