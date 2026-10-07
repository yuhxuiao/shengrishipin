// fx.js — V12 特效、地面挖掘凹痕与物理交互系统
//
// ==================== 特效库参数与使用规范 (FX Library API) ====================
// 所有特效通过 Fx.register 注册, 经由 main.js 的 drawFxList(ctx, fxList, t, targetLayer, camM) 纯函数调用。
// 契约: fn(ctx, u, params, t), 其中:
//   ctx: CanvasRenderingContext2D
//   u: 当前特效进度 (0.0 ~ 1.0)
//   params: shots.js 中传入的特效参数对象
//   t: 绝对秒 (Float)
// 特效纯函数、无跨帧状态、多 Worker 并行确定性 (采用基于参数与种子的确定性伪随机数)。
// 单个特效绘制开销 < 3ms, 符合 Bluey 扁平卡通风 (深蓝描边 #0B2F6E, 饱和明快)。
//
// -------------------- 完整特效清单与参数说明 --------------------
// 1. land_dust (落地/刹车尘团)
//    - 推荐场景: 角色跳落着陆 (S05/S16)、挖挖急刹车定格时
//    - 参数: { x, y, scale=1.0, dir=0 (-1左/1右/0两侧), color='#FFFFFF', layer='world' }
//
// 2. drive_dust (行驶拖尾尘土)
//    - 推荐场景: 挖挖行驶时履带后方、小狗疾跑脚步拖尾 (S02/S07/S19)
//    - 参数: { x, y, scale=1.0, dir=1 (行驶方向), color='#FFFFFF', count=4, layer='world' }
//
// 3. speed_lines (速度线 / 极速动感线束)
//    - 推荐场景: 猛冲、高空飞跃、极速甩镜 (S16/S19/S23)
//    - 参数: { x=960, y=540, w=1920, h=1080, angle=0, len=280, count=14, color='rgba(255,255,255,0.85)', layer='world'|'screen' }
//
// 4. smear (快速动作拖影弧 / 残影涂抹)
//    - 推荐场景: 大臂快速甩落、铲斗高速挥动、小狗甩头转身 (S09/S18/S23)
//    - 参数: { x, y, r=160, startAngle=-0.8, endAngle=1.2, width=42, color='#7CCBFB', layer='world' }
//
// 5. impact_burst (冲击星形爆发 + 屏幕闪白)
//    - 推荐场景: 铲斗扎地暴击、大礼物破土炸裂、意外惊喜 (S14/S23/S25)
//    - 参数: { x, y, r=260, spikeCount=10, color='#FFE082', flash=true, layer='world'|'screen' }
//
// 6. emote (情绪符号卡通气泡)
//    - 推荐场景: ! 发现标记 (S08/S17), ? 挖出鸭子困惑 (S13), ♪ 唱歌欢笑 (S30),
//              ♥ 温暖爱意 (S33/S34), 💡 灵光一闪 (S06/S14), 汗滴 (S13), ✨ 星光眼 (S24)
//    - 参数: { x, y, kind='exclamation'|'question'|'music'|'heart'|'bulb'|'sweat'|'sparkle', scale=1.0, layer='world' }
//
// 7. sparkle_trail (闪光拖尾粒子流)
//    - 推荐场景: 宝藏金色 X 脉动、派对帽在空中划过抛物线、礼物盒光环 (S06/S15/S21/S26)
//    - 参数: { x, y, radius=130, count=16, color='#FFF59D', layer='world' }
//
// 8. music_notes (音符飘散)
//    - 推荐场景: 生日歌八音盒伴奏、小狗欢呼跳舞 (S30/S32)
//    - 参数: { x, y, count=6, spreadX=160, spreadY=200, layer='world' }
//
// 9. heart_pop (爱心泡泡破裂)
//    - 推荐场景: 终极祝福、温情打破第四面墙 (S27/S33)
//    - 参数: { x, y, scale=1.0, color='#FF4081', layer='world' }
//
// 10. dirt_chunks (挖土飞溅抛物线土块与弹跳)
//     - 推荐场景: 铲斗入土挖起、宾果小爪刨土 (S09/S17/S23)
//     - 参数: { x, y, count=8, dir=-1, power=1.0, color='#6D4C41', layer='world' }
//
// 11. ground_crack (地面裂纹与金色破土光束)
//     - 推荐场景: 终极大宝藏破土前夕预兆、金 X 地裂 (S21/S22/S23)
//     - 参数: { x, y, length=180, branchCount=5, color='#3E2723', glow=true, layer='world' }
//
// 12. shine_ring (圆环光波扩散)
//     - 推荐场景: 魔法点亮蜡烛、骨头掉落弹震、冲击波 (S18/S29)
//     - 参数: { x, y, maxR=220, lineWidth=10, color='#FFE082', layer='world' }
//
// 13. confetti_burst / balloon_pop (定点爆裂彩纸花雨)
//     - 推荐场景: 气球破开、礼物飞天点火花、局部庆生 (S10/S14/S25)
//     - 参数: { x, y, count=32, radius=220, layer='world'|'screen' }
//
// 14. dust / stars / hole / duck_pop / confetti / xmark / glow / candle (V11 原生保留)
//
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const NAVY = '#0B2F6E';

  // 确定性伪随机数生成器 (基于种子，不产生跨帧状态)
  function pseudoRand(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  // 缓动算法工具集
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
  const easeInCubic = u => u * u * u;
  const easeInOutCubic = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const backOut = (u, s = 1.70158) => {
    const p = u - 1;
    return p * p * ((s + 1) * p + s) + 1;
  };

  // ==================== 1. 落地 / 刹车尘团 (land_dust: 双层冲击波气团与地表震颤) ====================
  function drawLandDust(ctx, cx, cy, u, params) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const scale = (p.scale || 1.0);
    const dir = p.dir !== undefined ? p.dir : 0; // -1: 左, 1: 右, 0: 两侧
    const col = p.color || '#FFFFFF';

    ctx.save();
    ctx.translate(cx, cy);

    // 双层扩散与淡出曲线
    // 第 1 层: 次级冲击波气团 (膨胀极快, 范围广, 柔和淡蓝半透明, 提前消散)
    const expandOuter = easeOutCubic(clamp(u * 1.25, 0, 1));
    const fadeOuter = Math.max(0, 1 - u * 1.35);

    // 第 2 层: 核心紧凑卡通云朵 (主白色, 饱满浑圆, 粗深蓝描边)
    const expandInner = easeOutCubic(u);
    const fadeInner = Math.max(0, 1 - u * u);

    const sides = [];
    if (dir <= 0) sides.push(-1); // 左侧尘团
    if (dir >= 0) sides.push(1);  // 右侧尘团

    // 0. 地表扁平扩散震波涟漪环 (紧贴地面水平铺展)
    if (fadeOuter > 0.05) {
      ctx.save();
      ctx.globalAlpha = fadeOuter * 0.45;
      ctx.strokeStyle = '#0B2F6E';
      ctx.lineWidth = 3.0 * scale;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      for (const side of sides) {
        const ringRx = (25 + expandOuter * 90) * scale;
        const ringRy = ringRx * 0.22;
        const ringX = side * ringRx * 0.55;
        ctx.beginPath();
        ctx.ellipse(ringX, 0, ringRx, ringRy, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const side of sides) {
      // ===== 第 1 层: 冲击波外层次级气团 (扩散快、范围大、半透明) =====
      if (fadeOuter > 0.02) {
        const outDistX = side * (32 + expandOuter * 135) * scale;
        const outDistY = -Math.sin(u * Math.PI) * 36 * scale;
        const outRad = (14 + expandOuter * 28) * scale;

        const outerBubbles = [
          { dx: 0, dy: 0, r: outRad * 1.1 },
          { dx: -side * outRad * 0.5, dy: outRad * 0.1, r: outRad * 0.8 },
          { dx: side * outRad * 0.55, dy: -outRad * 0.2, r: outRad * 0.85 },
        ];

        ctx.save();
        ctx.globalAlpha = fadeOuter * 0.52;
        ctx.fillStyle = '#E1F5FE'; // 柔和淡蓝白
        ctx.strokeStyle = 'rgba(11, 47, 110, 0.65)';
        ctx.lineWidth = 2.5 * scale;
        ctx.lineJoin = 'round';

        for (const b of outerBubbles) {
          ctx.beginPath();
          ctx.arc(outDistX + b.dx, outDistY + b.dy, b.r, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // ===== 第 2 层: 核心主卡通云团 (纯白、饱满 4 联球、粗深蓝描边) =====
      const offsetX = side * (20 + expandInner * 95) * scale;
      const offsetY = -Math.sin(u * Math.PI) * 26 * scale;
      const puffRad = (18 + expandInner * 24) * scale;

      const subCircles = [
        { dx: 0, dy: 0, r: puffRad },
        { dx: -side * puffRad * 0.45, dy: puffRad * 0.15, r: puffRad * 0.75 },
        { dx: side * puffRad * 0.45, dy: puffRad * 0.15, r: puffRad * 0.80 },
        { dx: side * puffRad * 0.15, dy: -puffRad * 0.35, r: puffRad * 0.70 }
      ];

      ctx.save();
      ctx.globalAlpha = fadeInner;
      ctx.fillStyle = col;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.6 * scale;
      ctx.lineJoin = 'round';

      // 绘制云团球体与描边
      for (const c of subCircles) {
        ctx.beginPath();
        ctx.arc(offsetX + c.dx, offsetY + c.dy, c.r, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }

      // 云团核心高光点
      ctx.fillStyle = '#FFFFFF';
      for (const c of subCircles) {
        ctx.beginPath();
        ctx.arc(offsetX + c.dx - c.r * 0.28, offsetY + c.dy - c.r * 0.28, c.r * 0.25, 0, TAU);
        ctx.fill();
      }

      // 抛射小尘粒 (带重力抛物线下坠)
      for (let i = 0; i < 5; i++) {
        const seed = Math.abs(side) * 10 + i;
        const ang = -0.15 - pseudoRand(seed) * 0.85;
        const dist = (35 + pseudoRand(seed + 1) * 75) * expandInner * scale;
        const px = offsetX + side * Math.cos(ang) * dist;
        const py = offsetY + Math.sin(ang) * dist + 42 * u * u * scale;
        const pr = (6.5 - i * 1.1) * (1 - u) * scale;
        if (pr > 0.6) {
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, TAU);
          ctx.fillStyle = (i % 2 === 0 ? col : '#E0F7FA');
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ==================== 2. 行驶拖尾尘土 (drive_dust) ====================
  function drawDriveDust(ctx, cx, cy, u, params) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const scale = (p.scale || 1.0);
    const dir = p.dir !== undefined ? p.dir : 1; // 1: 车向右开(尘向左), -1: 车向左开(尘向右)
    const count = p.count || 4;
    const col = p.color || '#FFFFFF';

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < count; i++) {
      const stagger = i * 0.18;
      const pu = clamp((u - stagger) / (1 - stagger * 0.7), 0, 1);
      if (pu <= 0 || pu >= 1) continue;

      const seed = i * 7.71;
      const puffFade = Math.sin(pu * Math.PI);
      const jetDist = (pu * 90 + i * 28 + pseudoRand(seed) * 20) * scale;
      const px = -dir * jetDist;
      const py = -(Math.sin(pu * Math.PI) * 26 + pu * 22) * scale;
      const pr = (12 + pu * 26 + pseudoRand(seed + 1) * 8) * scale;

      ctx.save();
      ctx.globalAlpha = puffFade * 0.85;
      ctx.fillStyle = col;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.0 * scale;

      ctx.beginPath();
      ctx.arc(px, py, pr, 0, TAU);
      ctx.arc(px - dir * pr * 0.4, py + pr * 0.2, pr * 0.65, 0, TAU);
      ctx.arc(px + dir * pr * 0.2, py - pr * 0.25, pr * 0.6, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ==================== 3. 速度线 (speed_lines) ====================
  function drawSpeedLines(ctx, u, params, t) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const count = p.count || 14;
    const angle = p.angle || 0; // 0 为水平向右
    const col = p.color || 'rgba(255, 255, 255, 0.85)';
    const len = p.len || 320;
    const isScreen = p.layer === 'screen';
    const cx = p.x !== undefined ? p.x : (isScreen ? 960 : 0);
    const cy = p.y !== undefined ? p.y : (isScreen ? 540 : 0);
    const w = p.w || (isScreen ? 1920 : 1200);
    const h = p.h || (isScreen ? 1080 : 800);

    const fade = Math.sin(u * Math.PI);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    for (let i = 0; i < count; i++) {
      const seed = i * 13.37;
      const laneY = ((pseudoRand(seed) - 0.5) * h);
      const startX = -w / 2 + pseudoRand(seed + 1) * w;
      const speed = 600 + pseudoRand(seed + 2) * 800;
      const curX = startX + u * speed;

      const lineLen = len * (0.6 + pseudoRand(seed + 3) * 0.8);
      const lineThick = 3.5 + pseudoRand(seed + 4) * 4.5;

      ctx.save();
      ctx.globalAlpha = fade * (0.5 + pseudoRand(seed + 5) * 0.5);
      ctx.strokeStyle = col;
      ctx.lineWidth = lineThick;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(curX - lineLen, laneY);
      ctx.lineTo(curX, laneY);
      ctx.stroke();

      // 深蓝边缘衬托 (增强卡通质感)
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ==================== 4. 动作拖影弧 (smear) ====================
  function drawSmear(ctx, cx, cy, u, params) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const r = p.r || 180;
    const startAngle = p.startAngle !== undefined ? p.startAngle : -Math.PI * 0.35;
    const endAngle = p.endAngle !== undefined ? p.endAngle : Math.PI * 0.45;
    const width = p.width || 44;
    const col = p.color || '#7CCBFB';

    // 拖影生命周期: 前 30% 迅速拉出, 后 70% 渐渐淡出消散
    const stretch = clamp(u / 0.35, 0, 1);
    const fade = clamp(1 - (u - 0.2) / 0.8, 0, 1);
    const curEnd = startAngle + (endAngle - startAngle) * easeOutCubic(stretch);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = fade * 0.75;

    // 弯月形半透明拖影扇弧
    ctx.beginPath();
    ctx.arc(0, 0, r + width / 2, startAngle, curEnd, false);
    ctx.arc(0, 0, Math.max(10, r - width / 2), curEnd, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = col;
    ctx.fill();

    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 内部高光速度条纹
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(0, 0, r, startAngle + 0.1, curEnd - 0.1, false);
    ctx.stroke();

    ctx.restore();
  }

  // ==================== 5. 冲击星形爆发 + 短暂屏幕 flash (impact_burst) ====================
  function drawImpactBurst(ctx, cx, cy, u, params) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const maxR = p.r || 260;
    const spikeCount = p.spikeCount || 10;
    const col = p.color || '#FFE082';
    const flash = p.flash !== undefined ? p.flash : true;

    // 1. 瞬时全屏浅白/金光闪光 (在 screen 坐标系或当前原点)
    if (flash && u < 0.25) {
      const flashAlpha = (1 - u / 0.25) * 0.65;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, cy);

    // 2. 星形爆炸主体 (回弹放大后收缩淡出)
    const pop = backOut(clamp(u * 1.6, 0, 1));
    const fade = clamp(1 - u * 1.1, 0, 1);
    const rOuter = maxR * pop * (1 - u * 0.3);
    const rInner = rOuter * 0.42;

    ctx.globalAlpha = fade;
    ctx.fillStyle = col;
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let i = 0; i < spikeCount * 2; i++) {
      const ang = (i / (spikeCount * 2)) * TAU + u * 0.8;
      const isTip = i % 2 === 0;
      const radius = isTip ? rOuter : rInner;
      const x = Math.cos(ang) * radius;
      const y = Math.sin(ang) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 内层高光亮星
    ctx.fillStyle = '#FFFDE7';
    ctx.beginPath();
    for (let i = 0; i < spikeCount * 2; i++) {
      const ang = (i / (spikeCount * 2)) * TAU + u * 0.8;
      const radius = (i % 2 === 0 ? rOuter * 0.65 : rInner * 0.6);
      const x = Math.cos(ang) * radius;
      const y = Math.sin(ang) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // 3. 散落放射冲击飞沫与小菱形
    const sparkCount = 8;
    for (let i = 0; i < sparkCount; i++) {
      const ang = (i / sparkCount) * TAU + 0.3;
      const dist = (maxR * 0.7 + u * 180);
      const px = Math.cos(ang) * dist;
      const py = Math.sin(ang) * dist;
      const s = Math.max(0, 16 * (1 - u));

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.fillStyle = '#FF7043';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.6, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ==================== 6. 情绪符号卡通气泡 (emote: 弹性回弹 backOut 与生动微动效) ====================
  function drawEmote(ctx, cx, cy, u, params, t) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const kind = p.kind || 'exclamation';
    const scale = p.scale || 1.0;

    // 动画阶段:
    // 0.0 - 0.26: 强力弹性回弹 (backOut s=2.2) 向上冲出
    // 0.26 - 0.72: 悬浮呼吸律动 (带专属情绪微动作)
    // 0.72 - 1.00: 向上飘散淡出
    let s = 1.0;
    let dy = 0;
    let rot = 0;
    let alpha = 1.0;

    if (u < 0.26) {
      const pu = u / 0.26;
      s = backOut(pu, 2.2) * scale;
      dy = (1 - pu) * 24;
    } else if (u < 0.72) {
      s = scale * (1 + Math.sin(t * 8) * 0.06);
      dy = Math.sin(t * 6) * 6;
      rot = Math.sin(t * 7) * 0.08;
    } else {
      const pu = (u - 0.72) / 0.28;
      s = (1 - pu * 0.25) * scale;
      dy = -pu * 50;
      alpha = 1 - pu;
    }

    ctx.save();
    ctx.translate(cx, cy + dy);
    ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    switch (kind) {
      case 'exclamation':
      case '!': {
        // 感叹号: 亮橙黄棒状 + 圆点, 弹出时带放射冲击刺线
        ctx.save();
        ctx.rotate(0.06);

        // 弹出初期 (0.05 ~ 0.45) 顶部爆发 3 道醒目卡通冲击线
        if (u > 0.05 && u < 0.50) {
          const burstProg = (u - 0.05) / 0.45;
          const burstAlpha = Math.max(0, 1 - burstProg * 1.5);
          ctx.save();
          ctx.globalAlpha = burstAlpha * alpha;
          ctx.strokeStyle = '#FFA726';
          ctx.lineWidth = 3.6;
          const rayAngles = [-0.45, 0, 0.45];
          for (const ra of rayAngles) {
            const r1 = 38 + burstProg * 14;
            const r2 = 56 + burstProg * 26;
            ctx.beginPath();
            ctx.moveTo(Math.sin(ra) * r1, -60 - Math.cos(ra) * r1);
            ctx.lineTo(Math.sin(ra) * r2, -60 - Math.cos(ra) * r2);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.fillStyle = '#FFA726';
        ctx.beginPath();
        ctx.moveTo(-11, -58);
        ctx.lineTo(11, -58);
        ctx.lineTo(6.5, -18);
        ctx.lineTo(-6.5, -18);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // 内部金黄高光核心
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath();
        ctx.moveTo(-5.5, -53); ctx.lineTo(5.5, -53); ctx.lineTo(3, -22); ctx.lineTo(-3, -22);
        ctx.closePath(); ctx.fill();

        // 底部圆点
        ctx.fillStyle = '#FFA726';
        ctx.beginPath(); ctx.arc(0, -2, 9, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath(); ctx.arc(-2.5, -4.5, 3, 0, TAU); ctx.fill();
        ctx.restore();
        break;
      }

      case 'question':
      case '?': {
        // 问号: 蓝绿色弯曲弧 + 圆点, 带好奇微偏头摆动
        const qWobble = Math.sin(t * 9) * 0.12;
        ctx.save();
        ctx.rotate(qWobble);
        ctx.fillStyle = '#29B6F6';
        ctx.beginPath();
        ctx.arc(0, -42, 19, Math.PI * 0.8, Math.PI * 2.2, false);
        ctx.lineTo(0, -18);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -3, 8.0, 0, TAU);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        break;
      }

      case 'music':
      case '♪':
      case '♫': {
        // 音符: 鲜艳双音符 + 随着节拍左右横向欢快摇摆跳跃
        const danceX = Math.sin(t * 8) * 12;
        const danceRot = Math.sin(t * 7) * 0.18;
        ctx.save();
        ctx.translate(danceX, 0);
        ctx.rotate(danceRot);

        ctx.fillStyle = '#E91E63';
        ctx.beginPath();
        ctx.ellipse(-14, -8, 12, 8.5, -0.3, 0, TAU);
        ctx.ellipse(15, -15, 12, 8.5, -0.3, 0, TAU);
        ctx.fill(); ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-4, -10); ctx.lineTo(-4, -50);
        ctx.lineTo(25, -56); ctx.lineTo(25, -17);
        ctx.stroke();

        // 符梁加粗
        ctx.lineWidth = 8.5;
        ctx.beginPath();
        ctx.moveTo(-5, -48); ctx.lineTo(26, -54);
        ctx.stroke();

        // 伴随音符飘舞的彩色小光斑
        ctx.fillStyle = '#00E676';
        ctx.beginPath(); ctx.arc(-24, -36 + Math.sin(t * 10) * 8, 4.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFD600';
        ctx.beginPath(); ctx.arc(36, -30 + Math.cos(t * 10) * 8, 4.0, 0, TAU); ctx.fill();

        ctx.restore();
        break;
      }

      case 'heart':
      case '♥': {
        // 爱心: 弹性自下向上弹起 + 双音节心跳脉动 + 伴随 2 颗微型上升漂浮小爱心
        const heartBeat = (u >= 0.26 && u < 0.72)
          ? (1.0 + 0.14 * Math.max(0, Math.sin(t * 9)) + 0.08 * Math.max(0, Math.sin(t * 9 - 0.45)))
          : 1.0;

        ctx.save();
        ctx.scale(heartBeat, heartBeat);

        // 主爱心
        ctx.fillStyle = '#FF4081';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.bezierCurveTo(0, -24, -30, -38, -30, -52);
        ctx.bezierCurveTo(-30, -68, -12, -74, 0, -56);
        ctx.bezierCurveTo(12, -74, 30, -68, 30, -52);
        ctx.bezierCurveTo(30, -38, 0, -24, 0, -6);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // 白色高光月牙
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(-14, -58, 6.5, 3.2, -0.5, 0, TAU);
        ctx.fill();

        // 伴随 2 颗轻盈浮起的小微爱心
        for (let h = 0; h < 2; h++) {
          const hSign = h === 0 ? -1 : 1;
          const hOffset = (t * 2.5 + h * 1.5) % 3.0;
          const hAlpha = Math.max(0, 1 - hOffset / 3.0);
          const hx = hSign * (28 + hOffset * 10);
          const hy = -40 - hOffset * 28;
          ctx.save();
          ctx.globalAlpha = hAlpha * alpha;
          ctx.translate(hx, hy);
          ctx.scale(0.35, 0.35);
          ctx.fillStyle = '#FF80AB';
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.bezierCurveTo(0, -20, -24, -32, -24, -44);
          ctx.bezierCurveTo(-24, -58, -10, -62, 0, -48);
          ctx.bezierCurveTo(10, -62, 24, -58, 24, -44);
          ctx.bezierCurveTo(24, -32, 0, -20, 0, -6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
        break;
      }

      case 'bulb':
      case '💡': {
        // 灯泡: 金黄灯泡 + 发散金黄光芒
        ctx.strokeStyle = '#FBC02D';
        ctx.lineWidth = 4;
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI * 0.9 + (i / 4) * Math.PI * 0.8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * 36, -34 + Math.sin(ang) * 36);
          ctx.lineTo(Math.cos(ang) * 52, -34 + Math.sin(ang) * 52);
          ctx.stroke();
        }

        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 4.8;
        ctx.fillStyle = '#FFEE58';
        ctx.beginPath();
        ctx.arc(0, -34, 21, 0, TAU);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#B0BEC5';
        ctx.beginPath();
        ctx.rect(-8, -13, 16, 12);
        ctx.fill(); ctx.stroke();
        break;
      }

      case 'sweat':
      case '💧': {
        // 汗滴: 浅蓝水珠飞溅
        ctx.fillStyle = '#81D4FA';
        ctx.beginPath();
        ctx.moveTo(0, -50);
        ctx.bezierCurveTo(-18, -30, -18, -10, 0, -4);
        ctx.bezierCurveTo(18, -10, 18, -30, 0, -50);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-4, -26, 4.5, 0, TAU);
        ctx.fill();
        break;
      }

      case 'sparkle':
      case '✨':
      default: {
        // 四角金星闪烁
        ctx.fillStyle = '#FFD54F';
        ctx.beginPath();
        ctx.moveTo(0, -56);
        ctx.quadraticCurveTo(0, -30, 26, -30);
        ctx.quadraticCurveTo(0, -30, 0, -4);
        ctx.quadraticCurveTo(0, -30, -26, -30);
        ctx.quadraticCurveTo(0, -30, 0, -56);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#FFFDE7';
        ctx.beginPath();
        ctx.arc(0, -30, 6.5, 0, TAU);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  // ==================== 7. 闪光拖尾粒子流 (sparkle_trail: 弹性展开与旋转微星) ====================
  function drawSparkleTrail(ctx, cx, cy, u, params, t) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const radius = p.radius || 130;
    const count = p.count || 16;
    const col = p.color || '#FFF59D';

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < count; i++) {
      const seed = i * 23.11;
      const ang = (i / count) * TAU + t * 2.2 + pseudoRand(seed) * 0.5;
      const rDist = radius * (0.3 + 0.7 * pseudoRand(seed + 1)) * (0.8 + Math.sin(t * 4 + i) * 0.2);
      const px = Math.cos(ang) * rDist;
      const py = Math.sin(ang) * rDist * 0.75; // 椭圆轨迹

      const pulse = Math.sin(t * 8 + i * 1.5) * 0.5 + 0.5;
      // 粒子弹性生成与淡出
      const partProg = clamp((u - (i * 0.04) % 0.6) / 0.4, 0, 1);
      const s = (10 + pulse * 14) * backOut(partProg) * (1 - u * 0.45);

      if (s <= 1) continue;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(t * 3.2 + i);
      ctx.fillStyle = col;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 2.4;

      // 4-角卡通小十字星
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 内部高光小核心
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, TAU);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  // ==================== 8. 音符上飘 (music_notes) ====================
  function drawMusicNotes(ctx, cx, cy, u, params, t) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const count = p.count || 6;
    const spreadX = p.spreadX || 160;
    const spreadY = p.spreadY || 200;
    const colors = ['#FF4081', '#7C4DFF', '#00E676', '#FFD600', '#00B0FF', '#FF9100'];

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < count; i++) {
      const stagger = i * 0.15;
      const nu = clamp((u - stagger) / (1 - stagger * 0.6), 0, 1);
      if (nu <= 0 || nu >= 1) continue;

      const seed = i * 31.41;
      const sway = Math.sin(nu * Math.PI * 3 + i) * 36;
      const px = ((pseudoRand(seed) - 0.5) * spreadX) + sway;
      const py = -nu * spreadY;
      const fade = Math.sin(nu * Math.PI);
      const rot = Math.sin(nu * Math.PI * 2 + i) * 0.35;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.globalAlpha = fade;

      ctx.fillStyle = colors[i % colors.length];
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.5;

      if (i % 2 === 0) {
        // 单音符 ♪
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 7, -0.3, 0, TAU);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(7, -2); ctx.lineTo(7, -32);
        ctx.quadraticCurveTo(18, -28, 16, -14);
        ctx.stroke();
      } else {
        // 双音符 ♫
        ctx.beginPath();
        ctx.ellipse(-10, 0, 8, 6, -0.3, 0, TAU);
        ctx.ellipse(10, -4, 8, 6, -0.3, 0, TAU);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-3, -2); ctx.lineTo(-3, -28);
        ctx.lineTo(17, -32); ctx.lineTo(17, -6);
        ctx.stroke();
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-4, -26); ctx.lineTo(18, -30);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ==================== 9. 爱心泡泡 (heart_pop) ====================
  function drawHeartPop(ctx, cx, cy, u, params, t) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const scale = (p.scale || 1.0);
    const col = p.color || '#FF4081';

    ctx.save();
    ctx.translate(cx, cy);

    if (u < 0.8) {
      // 阶段 1: 泡泡包裹爱心上浮并轻晃
      const pu = u / 0.8;
      const s = backOut(clamp(pu * 1.5, 0, 1)) * scale;
      const dy = -pu * 90;
      const dx = Math.sin(pu * Math.PI * 3) * 16;

      ctx.translate(dx, dy);
      ctx.scale(s, s);

      // 外层半透明肥皂泡
      const bubbleR = 38;
      ctx.fillStyle = 'rgba(225, 245, 254, 0.45)';
      ctx.strokeStyle = '#4FC3F7';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, bubbleR, 0, TAU);
      ctx.fill(); ctx.stroke();

      // 泡泡高光
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(0, 0, bubbleR - 6, -Math.PI * 0.7, -Math.PI * 0.3);
      ctx.stroke();

      // 内部爱心
      ctx.fillStyle = col;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.bezierCurveTo(0, 2, -16, -6, -16, -16);
      ctx.bezierCurveTo(-16, -26, -5, -28, 0, -18);
      ctx.bezierCurveTo(5, -28, 16, -26, 16, -16);
      ctx.bezierCurveTo(16, -6, 0, 2, 0, 10);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else {
      // 阶段 2: 泡泡爆开！化作 6 颗小飞水珠与小星星
      const pu = (u - 0.8) / 0.2;
      const fade = 1 - pu;
      ctx.translate(0, -90);

      // 冲击破裂圈
      ctx.strokeStyle = `rgba(79, 195, 247, ${fade})`;
      ctx.lineWidth = 4 * fade;
      ctx.beginPath();
      ctx.arc(0, 0, 38 + pu * 40, 0, TAU);
      ctx.stroke();

      // 四散水珠
      ctx.fillStyle = '#4FC3F7';
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * TAU;
        const dist = 38 + pu * 55;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist, Math.max(0, 5 * fade), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ==================== 10. 泥土飞溅抛物线土块 (dirt_chunks: 自然旋转与触地弹跳衰减) ====================
  function drawDirtChunks(ctx, cx, cy, u, params) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const count = p.count || 9;
    const dir = p.dir !== undefined ? p.dir : -1; // -1: 飞向左侧, 1: 飞向右侧
    const power = p.power || 1.0;
    const CHUNK_COLORS = ['#4E342E', '#5D4037', '#6D4C41', '#795548', '#8D6E63'];

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < count; i++) {
      const seed = i * 47.19;
      const v0x = dir * (170 + pseudoRand(seed + 1) * 220) * power;
      const v0y = -(250 + pseudoRand(seed + 2) * 190) * power;
      const g = 960;
      const groundY = 220 + pseudoRand(seed + 3) * 45; // 相对 cy 的地平线高度

      // 计算初次触地时间 t1: 0.5 * g * t1^2 + v0y * t1 - groundY = 0
      const disc = v0y * v0y + 2 * g * groundY;
      const t1 = (-v0y + Math.sqrt(Math.max(0, disc))) / g;

      // 弹跳系数 (restitution)
      const e1 = 0.42;
      const vyImp1 = v0y + g * t1; // 撞地向下瞬时速度
      const vyBounce1 = -e1 * vyImp1; // 向上反弹初速
      const vx1 = v0x * 0.65; // 水平衰减摩擦
      const tb1 = Math.max(0.01, 2 * (-vyBounce1) / g); // 第 1 次弹跳滞空时长

      // 第 2 次微弹跳
      const e2 = 0.22;
      const vyBounce2 = -e2 * (-vyBounce1);
      const vx2 = vx1 * 0.50;
      const tb2 = Math.max(0.01, 2 * (-vyBounce2) / g);

      // 将归一化进度 u 映射为物理时间轴: 满时长覆盖完整的起跳、两段反弹及落地滚停
      const totalPhysTime = t1 + tb1 + tb2 + 0.35;
      const simT = u * totalPhysTime;

      let px = 0, py = 0;
      let rot = 0;
      const omega0 = (6.0 + pseudoRand(seed + 4) * 8.0) * dir;

      if (simT < t1) {
        // 阶段 1: 初始腾空抛物线飞行
        px = v0x * simT;
        py = v0y * simT + 0.5 * g * simT * simT;
        rot = omega0 * simT;
      } else if (simT < t1 + tb1) {
        // 阶段 2: 第 1 次触地反弹
        const dt = simT - t1;
        px = v0x * t1 + vx1 * dt;
        py = groundY + vyBounce1 * dt + 0.5 * g * dt * dt;
        rot = omega0 * t1 + (omega0 * 0.55) * dt;

        // 触地瞬间 (dt < 0.12) 地面微尘团绽开
        if (dt < 0.12) {
          const puffProg = dt / 0.12;
          ctx.save();
          ctx.globalAlpha = (1 - puffProg) * 0.6;
          ctx.fillStyle = '#D7CCC8';
          ctx.strokeStyle = NAVY;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(v0x * t1, groundY, (4 + puffProg * 8), 0, TAU);
          ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      } else if (simT < t1 + tb1 + tb2) {
        // 阶段 3: 第 2 次微弱弹跳
        const dt = simT - (t1 + tb1);
        px = v0x * t1 + vx1 * tb1 + vx2 * dt;
        py = groundY + vyBounce2 * dt + 0.5 * g * dt * dt;
        if (py > groundY) py = groundY;
        rot = omega0 * t1 + (omega0 * 0.55) * tb1 + (omega0 * 0.25) * dt;
      } else {
        // 阶段 4: 静止/贴地轻微滚停
        const dt = simT - (t1 + tb1 + tb2);
        const frictionDecay = Math.max(0, 1 - dt * 2.5);
        px = v0x * t1 + vx1 * tb1 + vx2 * tb2 + vx2 * 0.3 * (1 - frictionDecay);
        py = groundY;
        rot = omega0 * t1 + (omega0 * 0.55) * tb1 + (omega0 * 0.25) * tb2 + (omega0 * 0.08) * (1 - frictionDecay);
      }

      // 土块自身尺寸与缩放
      const s = (13 + pseudoRand(seed + 5) * 15) * (1 - u * 0.28);
      if (s <= 1) continue;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);

      // 有机 5~6 边形多边形泥块
      const vertCount = (i % 2 === 0 ? 5 : 6);
      const col = p.color || CHUNK_COLORS[i % CHUNK_COLORS.length];

      ctx.fillStyle = col;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.2;
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let j = 0; j < vertCount; j++) {
        const jang = (j / vertCount) * TAU;
        const jr = s * (0.75 + pseudoRand(seed + j) * 0.45);
        const jx = Math.cos(jang) * jr;
        const jy = Math.sin(jang) * jr;
        if (j === 0) ctx.moveTo(jx, jy);
        else ctx.lineTo(jx, jy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 泥块表面亮暗分界切面
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(-s * 0.24, -s * 0.24, s * 0.38, 0, TAU);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  // ==================== 11. 地面裂纹与金色破土光束 (ground_crack) ====================
  function drawGroundCrack(ctx, cx, cy, u, params, t) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const length = p.length || 180;
    const branchCount = p.branchCount || 5;
    const col = p.color || '#3E2723';
    const hasGlow = p.glow !== undefined ? p.glow : true;

    ctx.save();
    ctx.translate(cx, cy);

    // 裂纹延伸进度
    const prog = easeOutCubic(u);

    // 1. 金色向上破土射出的体积光束
    if (hasGlow) {
      const glowPulse = 0.5 + Math.sin(t * 8) * 0.25;
      const rayAlpha = Math.min(1.0, u * 1.5) * (1 - u * 0.3) * glowPulse;

      ctx.save();
      for (let i = 0; i < 4; i++) {
        const rayW = (30 + i * 20) * prog;
        const rayH = (160 + i * 60) * prog;
        const rayGrad = ctx.createLinearGradient(0, 0, 0, -rayH);
        rayGrad.addColorStop(0, `rgba(255, 235, 59, ${0.7 * rayAlpha})`);
        rayGrad.addColorStop(0.5, `rgba(255, 193, 7, ${0.35 * rayAlpha})`);
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(-rayW * 0.3, 0);
        ctx.lineTo(-rayW, -rayH);
        ctx.lineTo(rayW, -rayH);
        ctx.lineTo(rayW * 0.3, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. 锯齿裂纹
    ctx.strokeStyle = col;
    ctx.lineWidth = 5.0 * (1 - u * 0.2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    for (let i = 0; i < branchCount; i++) {
      const seed = i * 19.87;
      const mainAngle = (i / branchCount) * Math.PI + 0.15; // 地面裂纹主要在水平两侧辐射
      const sign = i % 2 === 0 ? 1 : -1;

      ctx.beginPath();
      ctx.moveTo(0, 0);

      const segments = 4;
      let curX = 0, curY = 0;
      for (let s = 1; s <= segments; s++) {
        if (s / segments > prog) break;
        const segLen = (length / segments) * prog;
        const jag = (pseudoRand(seed + s) - 0.5) * 32;
        curX += Math.cos(mainAngle) * segLen * sign + jag * 0.4;
        curY += (Math.sin(mainAngle) * segLen * 0.3) + jag * 0.2; // 沿地平微扁
        ctx.lineTo(curX, curY);
      }
      ctx.stroke();

      // 深蓝边缘
      ctx.save();
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ==================== 12. 圆环光波扩散 (shine_ring) ====================
  function drawShineRing(ctx, cx, cy, u, params) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const maxR = p.maxR || 220;
    const lineW = p.lineWidth || 10;
    const col = p.color || '#FFE082';

    const prog = easeOutCubic(u);
    const r = prog * maxR;
    const fade = Math.max(0, 1 - u);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = fade;

    // 外层深蓝描边圈
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = (lineW + 6) * (1 - u * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();

    // 内层亮金/亮白发光圈
    ctx.strokeStyle = col;
    ctx.lineWidth = lineW * (1 - u * 0.4);
    ctx.stroke();

    // 边缘 8 颗环绕小高光珠
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU + u * 1.5;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r, Math.max(0, 4.5 * fade), 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  // ==================== 13. 定点爆裂彩纸花雨 (confetti_burst) ====================
  function drawConfettiBurst(ctx, cx, cy, u, params, t) {
    if (u <= 0 || u >= 1) return;
    const p = params || {};
    const count = p.count || 32;
    const maxRadius = p.radius || 220;
    const CONFETTI_COLORS = p.colors || ['#FF1744', '#FFD600', '#00E676', '#2979FF', '#FF6D00', '#D500F9', '#FFFFFF'];

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < count; i++) {
      const seed = i * 17.43;
      const ang = (i / count) * TAU + pseudoRand(seed) * 0.3;
      const speed = (maxRadius * (0.4 + pseudoRand(seed + 1) * 0.9));

      // 爆炸飞散 + 重力自然下坠
      const rDist = speed * easeOutCubic(u);
      const px = Math.cos(ang) * rDist;
      const py = Math.sin(ang) * rDist + 160 * u * u;
      const rot = u * 8 + i * 1.7;

      // 纸片三维翻转模拟 (cos(rot) 做水平缩放)
      const flipScale = Math.cos(rot * 2);
      const fade = clamp(1 - (u - 0.4) / 0.6, 0, 1);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.scale(flipScale, 1.0);
      ctx.globalAlpha = fade;

      ctx.fillStyle = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 1.8;

      const kind = i % 3;
      if (kind === 0) {
        // 长方形彩纸条
        ctx.fillRect(-10, -5, 20, 10);
        ctx.strokeRect(-10, -5, 20, 10);
      } else if (kind === 1) {
        // 小四角星
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.quadraticCurveTo(0, 0, 9, 0);
        ctx.quadraticCurveTo(0, 0, 0, 9);
        ctx.quadraticCurveTo(0, 0, -9, 0);
        ctx.quadraticCurveTo(0, 0, 0, -9);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else {
        // 扭转小波浪彩带
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.quadraticCurveTo(0, 0, 8, 8);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ==================== V11 原生保留实现 ====================
  // 1. 挖掘地坑与隆起土堆
  function drawExcavationHole(ctx, cx, cy, progress) {
    if (progress <= 0) return;
    const Phys = root.V13PhysicsDig;
    if (Phys && typeof Phys.drawDynamicPit === 'function') {
      Phys.drawDynamicPit(ctx, cx, cy, progress, 0);
      Phys.drawExcavatedMound(ctx, cx - 120, cy + 12, progress, 0);
      return;
    }
    ctx.save();
    ctx.translate(cx, cy);
    const u = Math.min(1.0, progress);

    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.ellipse(0, 0, 110 * u, 42 * u, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.ellipse(0, 8 * u, 85 * u, 26 * u, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#8D6E63';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.arc(-80 * u, -5 * u, 35 * u, Math.PI * 0.8, Math.PI * 0.1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.arc(80 * u, -8 * u, 42 * u, Math.PI * 0.9, Math.PI * 0.2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.restore();
  }

  // 2. 挖掘泥土尘粒
  function drawDust(ctx, cx, cy, u) {
    if (u <= 0 || u >= 1) return;
    ctx.save();
    const DUST_COLORS = ['#6D4C41', '#8D6E63', '#A1887F', '#D7CCC8'];
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.90 + (i / count) * Math.PI * 0.80;
      const speed = 140 + ((i * 43) % 110);
      const px = cx + Math.cos(angle) * speed * u;
      const py = cy + Math.sin(angle) * speed * u + 260 * u * u;
      const r = Math.max(0, 12 * (1 - u) * (((i % 3) + 2) / 3));

      ctx.fillStyle = DUST_COLORS[i % DUST_COLORS.length];
      ctx.beginPath();
      ctx.arc(px, py, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. 星光迸发
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

  // 4. 沙坑小黄鸭飞出
  function drawDuckPhysics(ctx, cx, cy, u, t) {
    if (u <= 0 || u >= 1) return;
    ctx.save();
    let dx = 0, dy = 0, rot = 0;
    if (u < 0.65) {
      const ju = u / 0.65;
      dx = ju * 180;
      dy = -4 * 220 * ju * (1 - ju);
      rot = ju * TAU * 1.5;
    } else {
      const lu = (u - 0.65) / 0.35;
      dx = 180 + lu * 40;
      dy = -Math.abs(Math.sin(lu * Math.PI * 2)) * 30 * (1 - lu);
      rot = Math.sin(lu * TAU) * 0.15;
    }

    ctx.translate(cx + dx, cy + dy);
    ctx.rotate(rot);
    const s = 1.2;
    ctx.scale(s, s);

    ctx.fillStyle = '#FFEB3B';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 26, 0, 0, TAU);
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.arc(20, -18, 18, 0, TAU);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#FF7043';
    ctx.beginPath();
    ctx.moveTo(34, -22); ctx.lineTo(50, -16); ctx.lineTo(32, -10);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.arc(26, -20, 3.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(27.5, -21.5, 1.5, 0, TAU); ctx.fill();

    ctx.fillStyle = '#FDD835';
    ctx.beginPath(); ctx.ellipse(-8, 0, 16, 10, -0.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // 5. 蜡烛火苗与吹熄青烟
  function drawCandle(ctx, cx, cy, t, isLit, isBlown, blownProgress) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -16);
    ctx.stroke();

    if (isLit) {
      const flick = Math.sin(t * 16) * 3;
      const hScale = 1 + Math.sin(t * 22) * 0.12;

      const glow = ctx.createRadialGradient(0, -28, 4, 0, -28, 65);
      glow.addColorStop(0, 'rgba(255, 235, 59, 0.7)');
      glow.addColorStop(0.5, 'rgba(255, 152, 0, 0.3)');
      glow.addColorStop(1, 'rgba(255, 152, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, -28, 65, 0, TAU); ctx.fill();

      ctx.fillStyle = '#FF9800';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(-14 + flick, -32 * hScale, 0 + flick, -48 * hScale);
      ctx.quadraticCurveTo(14 + flick, -32 * hScale, 0, -16);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#FFFDE7';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(-7 + flick * 0.6, -28 * hScale, 0 + flick * 0.6, -38 * hScale);
      ctx.quadraticCurveTo(7 + flick * 0.6, -28 * hScale, 0, -18);
      ctx.closePath();
      ctx.fill();
    } else if (isBlown) {
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

    ctx.strokeStyle = isGolden ? '#FFF9C4' : '#FFCDD2';
    ctx.lineWidth = isGolden ? 7 : 4;
    ctx.stroke();

    if (isGolden) {
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

  // ==================== 8. 全屏彩带纸屑雨 (confetti / confetti_rain: 正弦摇曳与 3D 翻转) ====================
  function drawConfetti(ctx, lt, dur) {
    if (lt <= 0 || lt >= dur) return;
    ctx.save();

    const count = 110;
    // 双面色盘: [正面高饱和色, 背面浅淡马卡龙色]
    const CONFETTI_PAIRS = [
      ['#FF1744', '#FF8A80'], // 艳红 / 浅粉红
      ['#FFD600', '#FFF59D'], // 金黄 / 柔淡黄
      ['#00E676', '#B9F6CA'], // 鲜绿 / 浅薄荷
      ['#2979FF', '#82B1FF'], // 宝蓝 / 天空浅蓝
      ['#FF6D00', '#FFD180'], // 暖橙 / 浅杏色
      ['#D500F9', '#EA80FC'], // 亮紫 / 薰衣草浅紫
      ['#00E5FF', '#84FFFF'], // 青蓝 / 柔青
      ['#FFFFFF', '#E0E0E0'], // 纯白 / 柔灰
    ];

    for (let i = 0; i < count; i++) {
      const speed = 125 + ((i * 39) % 185);
      const startX = ((i * 137.5) % 2040) - 60;
      const startY = -100 - ((i * 53) % 360);

      // 双正弦横向飘荡摇曳 (Sine Flutter)
      const swayFreq1 = 2.2 + (i % 5) * 0.35;
      const swayAmp1 = 34 + (i % 7) * 7;
      const swayFreq2 = 1.4 + (i % 3) * 0.4;
      const swayAmp2 = 16 + (i % 4) * 5;
      const sway = Math.sin(lt * swayFreq1 + i * 1.3) * swayAmp1 + Math.cos(lt * swayFreq2 + i * 2.1) * swayAmp2;

      const px = startX + sway;
      const py = startY + lt * speed;

      // 屏幕边界剔除
      if (py < -30 || py > 1160 || px < -80 || px > 2000) continue;

      // 3D 翻转与滚动 (Pitch 3D 翻转 + Yaw/Roll 旋转)
      const flipFreq = 4.2 + (i % 6) * 0.9;
      const flipAngle = lt * flipFreq + i * 1.7;
      // 3D 翻折缩放因子: sy 在 -1.0 到 1.0 之间来回变化
      const sy = Math.cos(flipAngle);
      const rollAngle = lt * (2.4 + (i % 4) * 0.6) + i * 0.8;

      // 正反面判定: sy >= 0 展现正面色, sy < 0 展现背面色
      const isFront = sy >= 0;
      const colorPair = CONFETTI_PAIRS[i % CONFETTI_PAIRS.length];
      const paperColor = isFront ? colorPair[0] : colorPair[1];

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rollAngle);
      // 3D 投影压缩变换: 水平微压缩, 垂直根据 cos(flipAngle) 翻转
      ctx.scale(1.0, Math.abs(sy) < 0.05 ? 0.05 : sy);

      ctx.fillStyle = paperColor;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 1.8;

      const kind = i % 4;
      if (kind === 0) {
        // 长方形彩纸条 (18x9px, 经典 3D 翻纸)
        ctx.beginPath();
        ctx.rect(-9, -5, 18, 10);
        ctx.fill();
        if (Math.abs(sy) > 0.3) ctx.stroke();
      } else if (kind === 1) {
        // 四角卡通闪亮星屑纸片
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.quadraticCurveTo(0, 0, 9, 0);
        ctx.quadraticCurveTo(0, 0, 0, 9);
        ctx.quadraticCurveTo(0, 0, -9, 0);
        ctx.quadraticCurveTo(0, 0, 0, -9);
        ctx.closePath();
        ctx.fill();
        if (Math.abs(sy) > 0.3) ctx.stroke();
      } else if (kind === 2) {
        // 扭曲螺旋飘带 (S 型彩带段)
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = paperColor;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-12, -12);
        ctx.bezierCurveTo(-4, 0, 4, -4, 12, 12);
        ctx.stroke();
      } else {
        // 派对小圆点彩纸片
        ctx.beginPath();
        ctx.arc(0, 0, 6.5, 0, TAU);
        ctx.fill();
        if (Math.abs(sy) > 0.3) ctx.stroke();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  // ==================== 特效注册表 ====================
  const registry = {};

  function register(type, fn) {
    registry[type] = fn;
  }

  // 注册原生内置特效
  register('dust', (ctx, u, p) => drawDust(ctx, p.x, p.y, u));
  register('stars', (ctx, u, p) => drawStars(ctx, p.x, p.y, u));
  register('hole', (ctx, u, p) => drawExcavationHole(ctx, p.x, p.y, u));
  register('duck_pop', (ctx, u, p, t) => drawDuckPhysics(ctx, p.x, p.y, u, t));
  register('confetti', (ctx, u, p, t) => drawConfetti(ctx, t - (p.at !== undefined ? p.at : 0), p.dur || 3));
  register('confetti_rain', (ctx, u, p, t) => drawConfetti(ctx, t - (p.at !== undefined ? p.at : 0), p.dur || 3));
  register('xmark', (ctx, u, p, t) => drawXmark(ctx, p.x, p.y, !!p.isGolden, t));
  register('glow', (ctx, u, p) => drawGlow(ctx, p.x, p.y, p.r, p.col, p.alpha || 0.4));
  register('candle', (ctx, u, p, t) => drawCandle(ctx, p.x, p.y, t, p.lit, p.blown, u));

  // 注册 V12/V14 特效
  register('land_dust', (ctx, u, p) => drawLandDust(ctx, p.x, p.y, u, p));
  register('drive_dust', (ctx, u, p) => drawDriveDust(ctx, p.x, p.y, u, p));
  register('speed_lines', (ctx, u, p, t) => drawSpeedLines(ctx, u, p, t));
  register('smear', (ctx, u, p) => drawSmear(ctx, p.x, p.y, u, p));
  register('impact_burst', (ctx, u, p) => drawImpactBurst(ctx, p.x, p.y, u, p));
  register('emote', (ctx, u, p, t) => drawEmote(ctx, p.x, p.y, u, p, t));
  register('sparkle_trail', (ctx, u, p, t) => drawSparkleTrail(ctx, p.x, p.y, u, p, t));
  register('music_notes', (ctx, u, p, t) => drawMusicNotes(ctx, p.x, p.y, u, p, t));
  register('heart_pop', (ctx, u, p, t) => drawHeartPop(ctx, p.x, p.y, u, p, t));
  register('dirt_chunks', (ctx, u, p) => drawDirtChunks(ctx, p.x, p.y, u, p));
  register('ground_crack', (ctx, u, p, t) => drawGroundCrack(ctx, p.x, p.y, u, p, t));
  register('shine_ring', (ctx, u, p) => drawShineRing(ctx, p.x, p.y, u, p));
  register('confetti_burst', (ctx, u, p, t) => drawConfettiBurst(ctx, p.x, p.y, u, p, t));
  register('balloon_pop', (ctx, u, p, t) => drawConfettiBurst(ctx, p.x, p.y, u, p, t));

  const Fx = {
    registry,
    register,
    // V11 保留方法
    drawExcavationHole,
    drawDust,
    drawStars,
    drawDuckPhysics,
    drawCandle,
    drawXmark,
    drawGlow,
    drawConfetti,
    drawConfettiRain: drawConfetti,
    // V12/V14 方法
    drawLandDust,
    drawDriveDust,
    drawSpeedLines,
    drawSmear,
    drawImpactBurst,
    drawEmote,
    drawSparkleTrail,
    drawMusicNotes,
    drawHeartPop,
    drawDirtChunks,
    drawGroundCrack,
    drawShineRing,
    drawConfettiBurst,
  };

  root.V14Fx = Fx;
  root.V12Fx = Fx;
  root.V11Fx = Fx;
  if (typeof module !== 'undefined' && module.exports) module.exports = Fx;
})(typeof globalThis !== 'undefined' ? globalThis : this);
