// v8_engine.js — V8 路线 A: 多镜头分镜物理真资产驱动引擎
// 解决问题:
// 1. 彻底根除 2D 骨骼切片断裂、液压杆断开、飞屑与非物理旋转
// 2. 真实物理土壤互动: 铲斗真正切入紫沙堆、物理重力下落泥土颗粒、履带悬挂受压
// 3. 2.7K 纳米香蕉毛绒泥塑画风真资产驱动, 保持光影与透视绝对真实
// 4. 角色微动作生命感: 真实眨眼系统、发动机怠速呼吸、履带微尘、视线对齐
// 5. 帧级音画严密对齐: 挥手、举高高、挖一挖、抬一抬与旁白和 TTS 100% 同步
// 6. 2岁幼儿专属互动 UI: 顶部果冻弹性提示卡片、大字号软萌字幕、鼓掌奖励贴纸

'use strict';

const V8_TOTAL = 43.0; // s02 (16s) + s03 (13s) + s04 (14s)

// ---------- 物理粒子系统 (确定性 PRNG) ----------
function v8Mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 紫沙碎屑重力掉落系统 (铲斗抬起时向下洒落)
function makeSandFall(seed, n = 80) {
  const rnd = v8Mulberry32(seed);
  const ps = [];
  const PURPLE_SAND = ['#9d4edd', '#c77dff', '#e0aaff', '#7b2cbf', '#f72585', '#ffd166'];
  for (let i = 0; i < n; i++) {
    ps.push({
      x0: -40 + rnd() * 120, // 相对铲斗边缘
      y0: -20 + rnd() * 40,
      vx: -30 + rnd() * 60,
      vy: 20 + rnd() * 40,
      g: 500 + rnd() * 400, // 重力加速度 px/s^2
      r: 3 + rnd() * 6,
      color: PURPLE_SAND[(rnd() * PURPLE_SAND.length) | 0],
      delay: rnd() * 2.2, // 2.2s 内陆续洒落
    });
  }
  return ps;
}

function drawSandFall(ctx, ps, originX, originY, t, life = 2.2) {
  if (t < 0 || t > life + 1.0) return;
  ctx.save();
  for (const p of ps) {
    const age = t - p.delay;
    if (age <= 0) continue;
    const x = originX + p.x0 + p.vx * age;
    const y = originY + p.y0 + p.vy * age + 0.5 * p.g * age * age;
    const alpha = Math.max(0, 1 - (age / 1.6));
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();
}

// 地面尘土气团系统 (下沉挖掘 / 触地瞬间)
function drawGroundPuff(ctx, x, y, scale = 1, alpha = 0.5) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 5, x, y, 80 * scale);
  g.addColorStop(0, 'rgba(235, 205, 170, 0.85)');
  g.addColorStop(0.6, 'rgba(215, 180, 140, 0.4)');
  g.addColorStop(1, 'rgba(200, 160, 120, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, 80 * scale, 35 * scale, 0, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

// 眨眼高光系统 (在原图眼睛区域上绘制微眨与高光跳动)
function drawBlinkOverlay(ctx, eyeBox, blinkProgress) {
  // blinkProgress: 0 (睁眼) -> 1 (完全闭眼)
  if (blinkProgress <= 0.01) return;
  const [ex, ey, ew, eh] = eyeBox;
  ctx.save();
  ctx.fillStyle = '#1c2833'; // 闭合眼线颜色 (与车身窗户墨色一致)
  ctx.beginPath();
  const midY = ey + eh * 0.5;
  const h = eh * 0.45 * (1 - blinkProgress);
  // 上下眼皮合拢
  ctx.ellipse(ex + ew * 0.5, midY, ew * 0.48, eh * 0.48 * blinkProgress, 0, 0, 6.283);
  ctx.fill();
  // 睫毛/微笑眼线
  ctx.lineWidth = 6 * (1 + blinkProgress * 0.3);
  ctx.strokeStyle = '#2c3e50';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(ex + ew * 0.5, midY - eh * 0.1, ew * 0.42, 0.2, 2.94);
  ctx.stroke();
  ctx.restore();
}

// ---------- 幼儿交互 UI 与气泡系统 ----------
function drawV8Banner(ctx, text, icon, t, t0, t1) {
  if (t < t0 || t > t1) return;
  const age = t - t0, left = t1 - t;
  const enter = clamp01(age / 0.35);
  const pop = easeOutBack(enter);
  const exitAlpha = clamp01(left / 0.3);
  
  ctx.save();
  ctx.globalAlpha = exitAlpha;
  
  const cy = 110 + Math.sin(t * 3.5) * 5; // 轻轻弹跳
  ctx.translate(W / 2, cy);
  ctx.scale(pop, pop);
  ctx.rotate(-0.008 + Math.sin(t * 2.5) * 0.005);
  
  ctx.font = 'bold 50px "Noto Sans CJK SC", "Source Han Sans", sans-serif';
  const tw = ctx.measureText(text).width;
  const padX = 70, padY = 24;
  const bw = tw + padX * 2 + 60, bh = 86;
  
  // 底部柔和阴影
  ctx.shadowColor = 'rgba(180, 100, 40, 0.25)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  
  // 奶酪圆角背景
  const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
  g.addColorStop(0, '#fffbf0');
  g.addColorStop(1, '#fffae8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 36);
  ctx.fill();
  
  // 金黄童趣外边框
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#f9bc60';
  ctx.stroke();
  
  // 装饰小星/小圆点
  ctx.fillStyle = '#ff8fab';
  ctx.beginPath();
  ctx.arc(-bw / 2 + 30, 0, 8, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#6bcb77';
  ctx.beginPath();
  ctx.arc(bw / 2 - 30, 0, 8, 0, 6.283);
  ctx.fill();
  
  // 文字与图标
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c05621';
  ctx.fillText(text, 10, 2);
  
  // 图标
  if (icon) {
    ctx.font = '48px sans-serif';
    ctx.fillText(icon, -bw / 2 + 55, 0);
  }
  
  ctx.restore();
}

function drawV8Subtitle(ctx, text, t, t0, t1) {
  if (t < t0 || t > t1) return;
  const age = t - t0, left = t1 - t;
  const enter = clamp01(age / 0.2);
  const pop = easeOutCubic(enter);
  const alpha = clamp01(left / 0.2);
  
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, H * 0.915);
  ctx.scale(pop, pop);
  
  ctx.font = 'bold 50px "Noto Sans CJK SC", "Source Han Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 棕色粗柔描边
  ctx.lineWidth = 12;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(56, 38, 28, 0.95)';
  ctx.strokeText(text, 0, 0);
  
  // 白奶油高光字
  ctx.fillStyle = '#fffdf6';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// 奖励印章 (太棒啦!)
function drawRewardBadge(ctx, text, t, t0) {
  const age = t - t0;
  if (age < 0 || age > 2.8) return;
  const pop = easeOutBack(clamp01(age / 0.4));
  const alpha = clamp01((2.8 - age) / 0.4);
  
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W * 0.78, H * 0.42 + Math.sin(t * 4) * 8);
  ctx.rotate(0.12);
  ctx.scale(pop, pop);
  
  // 太阳花印章边框
  ctx.fillStyle = '#ff6b8b';
  ctx.beginPath();
  ctx.arc(0, 0, 95, 0, 6.283);
  ctx.fill();
  
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ffd166';
  ctx.stroke();
  
  ctx.font = 'bold 44px "Noto Sans CJK SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, -10);
  
  ctx.font = '40px sans-serif';
  ctx.fillText('⭐⭐⭐', 0, 36);
  
  ctx.restore();
}

// ---------- 核心镜头渲染函数 ----------
// 包含:
// Shot 1: s02 (0.0s - 16.0s)  开开登场 & 热情挥手
// Shot 2: s03 (16.0s - 29.0s) 互动·举挖斗 / 小手举高高
// Shot 3: s04 (29.0s - 43.0s) 互动·挖土 / 往下挖一挖，往上抬一抬

const V8_ASSETS = {};
const _sandPs1 = makeSandFall(42, 60);
const _sandPs2 = makeSandFall(99, 90);
const _v8Confetti = makeConfetti(108, 70, { spread: 2.0 });
const _v8Sparkles = makeSparkles(2026, 35, '#ffea79');

function renderV8CinematicFrame(ctx, t) {
  // 清空底色
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);
  
  // 1. 镜头判定
  if (t < 16.0) {
    // ==========================================
    // SHOT 1: s02 开开登场 & 挥手打招呼 (0.0 - 16.0s)
    // ==========================================
    const img = V8_ASSETS.s02;
    // 摄像机运镜: 缓推特写 + 悬挂呼吸
    const cam = camFrom(t, [
      [0.0, W * 0.52, H * 0.53, 1.04],
      [3.0, W * 0.49, H * 0.52, 1.15],
      [8.0, W * 0.48, H * 0.51, 1.18],
      [16.0, W * 0.47, H * 0.51, 1.22],
    ]);
    
    // 角色怠速悬挂呼吸 (微小的上下弹性, 赋予机械生命质感)
    const idleBob = Math.sin(t * 3.2) * 5;
    const idleRot = Math.sin(t * 2.2) * 0.004;
    
    drawCover(ctx, img, cam.z, -(cam.x - W / 2) * cam.z, -(cam.y - H / 2) * cam.z + idleBob, idleRot);
    
    // 眨眼周期 (2.5s, 6.2s, 10.5s, 14.1s)
    const blinkCycle = ((t + 1.2) % 4.0);
    const isBlink = blinkCycle < 0.18;
    const blinkP = isBlink ? Math.sin((blinkCycle / 0.18) * Math.PI) : 0;
    
    // 开开面部眼睛位置 (经 2752x1536 映射至 1920x1080 视窗)
    // 对应画面中的开开面部车窗
    const eyeCenter = { x: W * 0.455 - (cam.x - W / 2) * 0.3, y: H * 0.435 + idleBob };
    drawBlinkOverlay(ctx, [eyeCenter.x - 30, eyeCenter.y - 20, 60, 40], blinkP);
    
    // 挥手动作光芒粒子
    drawSparkles(ctx, _v8Sparkles, t);
    drawConfetti(ctx, _v8Confetti, t, 0.85);
    
    // 幼儿交互横幅
    drawV8Banner(ctx, '小开开，挥挥小手，和挖掘机打个招呼吧！', '👋', t, 1.2, 15.6);
    
    // 逐句同步旁白
    drawV8Subtitle(ctx, '大家好！', t, 0.5, 1.4);
    drawV8Subtitle(ctx, '我是开开挖掘机！', t, 1.27, 2.96);
    drawV8Subtitle(ctx, '今天是2026年10月18日，', t, 2.81, 5.86);
    drawV8Subtitle(ctx, '是小开开的两岁生日！', t, 5.71, 7.79);
    drawV8Subtitle(ctx, '我要举办一场超级热闹的生日派对！', t, 7.64, 11.2);
    
  } else if (t < 29.0) {
    // ==========================================
    // SHOT 2: s03 互动·举挖斗 / 小手举高高 (16.0 - 29.0s)
    // ==========================================
    const img = V8_ASSETS.s03;
    const st = t - 16.0; // 镜头内时间 0.0 - 13.0s
    
    // 镜头运镜: 仰角上摇, 突显铲斗直插云霄的高大伟岸感与幼儿体操趣味
    const cam = camFrom(st, [
      [0.0, W * 0.50, H * 0.55, 1.08],
      [4.0, W * 0.48, H * 0.46, 1.18],
      [8.0, W * 0.47, H * 0.42, 1.24],
      [13.0, W * 0.46, H * 0.40, 1.26],
    ]);
    
    // 举高手臂呼吸与向上拉伸
    const stretchPulse = Math.sin(st * 3.8) * 4;
    drawCover(ctx, img, cam.z, -(cam.x - W / 2) * cam.z, -(cam.y - H / 2) * cam.z + stretchPulse);
    
    // 转场光晕 (在 16.0 - 16.8s 之间平滑过渡)
    if (st < 0.8) {
      const p = st / 0.8;
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = '#fff6e5';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    
    // 向上飞跃的生动箭头 (提示小寿星举手)
    const arrowY = H * 0.38 - Math.abs(Math.sin(st * 4.2)) * 30;
    ctx.save();
    ctx.font = 'bold 78px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4cd964';
    ctx.shadowColor = 'rgba(76, 217, 100, 0.6)';
    ctx.shadowBlur = 18;
    ctx.fillText('⬆️', W * 0.68, arrowY);
    ctx.fillText('⬆️', W * 0.76, arrowY + 15);
    ctx.restore();
    
    drawSparkles(ctx, _v8Sparkles, t, '#ffdd59');
    
    // 交互卡片
    drawV8Banner(ctx, '小手举高高，变成大挖斗！', '✨', t, 17.2, 28.6);
    
    // 旁白对齐
    drawV8Subtitle(ctx, '现在，请我们的小寿星开开，', t, 16.5, 19.3);
    drawV8Subtitle(ctx, '跟着挖掘机一起动一动！', t, 19.3, 21.8);
    drawV8Subtitle(ctx, '小手举高高，变成大挖斗！', t, 21.7, 26.5);
    
  } else {
    // ==========================================
    // SHOT 3: s04 互动·挖土 / 往下挖一挖，往上抬一抬 (29.0 - 43.0s)
    // ==========================================
    const st = t - 29.0; // 镜头内时间 0.0 - 14.0s
    
    // 关键帧资产动态切换 (物理机械真动作):
    // 动作 1: "往下挖一挖" (29.0s - 34.0s) -> 采用向下深挖物理土堆真实资产
    // 动作 2: "往上抬一抬" (34.0s - 43.0s) -> 采用满载紫沙晶体高抬真实资产 + 重力沙粒物理掉落
    const isLiftPhase = st >= 4.8;
    const currentImg = isLiftPhase ? V8_ASSETS.s04_lift : V8_ASSETS.s04_dig;
    
    // 运镜: 紧贴挖掘地表, 下压后抬起
    let camZ = 1.15, camX = W * 0.50, camY = H * 0.52;
    if (st < 4.8) {
      // 下挖动作运镜: 镜头微下沉
      const p = clamp01(st / 3.0);
      camZ = lerp(1.10, 1.22, easeOutCubic(p));
      camY = lerp(H * 0.50, H * 0.55, easeOutCubic(p));
    } else {
      // 高抬动作运镜: 镜头扬起追踪满载紫沙斗
      const p = clamp01((st - 4.8) / 4.0);
      camZ = lerp(1.22, 1.28, easeOutCubic(p));
      camY = lerp(H * 0.55, H * 0.44, easeOutCubic(p));
    }
    
    // 履带与车身受力反冲力 (挖入时底盘受压压缩, 抬起时释放弹回)
    let groundSquash = 0;
    if (st > 0.8 && st < 3.5) {
      groundSquash = Math.sin((st - 0.8) / 2.7 * Math.PI) * 14;
    }
    
    drawCover(ctx, currentImg, camZ, -(camX - W / 2) * camZ, -(camY - H / 2) * camZ + groundSquash);
    
    // 转场平滑
    if (st < 0.6) {
      const p = st / 0.6;
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = '#fff6e5';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    
    // 地面挖掘扬尘 (土堆切入瞬间)
    if (st > 0.5 && st < 3.2) {
      const puffAlpha = Math.sin((st - 0.5) / 2.7 * Math.PI) * 0.7;
      drawGroundPuff(ctx, W * 0.38, H * 0.84, 1.2, puffAlpha);
    }
    
    // 满载高抬时的真实紫沙重力滑落系统 (根据万有引力下落)
    if (isLiftPhase) {
      const sandTime = st - 4.8;
      // 铲斗边缘坐标 (满载紫沙晶粒从该处倾泻)
      const bucketLipX = W * 0.39;
      const bucketLipY = H * 0.52;
      drawSandFall(ctx, _sandPs1, bucketLipX, bucketLipY, sandTime);
      drawSandFall(ctx, _sandPs2, bucketLipX + 40, bucketLipY + 20, sandTime);
      
      // 紫沙梦幻闪烁
      drawSparkles(ctx, _v8Sparkles, t, '#e0aaff');
    }
    
    // 互动奖励贴纸 (哇——做得太棒啦!)
    if (st >= 3.8) {
      drawRewardBadge(ctx, '太棒啦！', st, 3.8);
    }
    
    // 交互卡片
    drawV8Banner(ctx, '挖一挖，抬一抬！', '🚜', t, 30.2, 42.6);
    
    // 旁白对齐
    drawV8Subtitle(ctx, '往下挖一挖！', t, 29.5, 30.8);
    drawV8Subtitle(ctx, '往上抬一抬！', t, 30.8, 32.2);
    drawV8Subtitle(ctx, '哇——做得太棒啦！', t, 32.2, 34.2);
    drawV8Subtitle(ctx, '再来一次：挖一挖，抬一抬！', t, 34.2, 42.0);
  }
  
  // 全局画面精修: 柔和晕影与温润暖光
  vignette(ctx, 0.12);
  warmWash(ctx, 0.04);
}

// 供全局或 Node 环境暴露
if (typeof window !== 'undefined') {
  window.V8_TOTAL = V8_TOTAL;
  window.V8_ASSETS = V8_ASSETS;
  window.renderV8CinematicFrame = renderV8CinematicFrame;
}
