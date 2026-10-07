// grade.js — V12 电影级分场景全屏调色与暗角系统 (Canvas2D)
// 契约: globalThis.V12Grade = { apply(ctx, loc, t, cam) }
// 运行于主世界绘制完成后、大标题与字幕绘制之前 (屏幕 1920×1080 坐标系)
// 特性: 6 个地点独立调色风格、柔和电影级暗角 Vignette、顶部天光微晕、纯函数确定性重放
(function (root) {
  'use strict';

  const W = 1920, H = 1080;
  const TAU = Math.PI * 2;

  // 各场景调色配置参数表 (强度克制，保证画面明亮通透、不发灰不暗沉)
  const GRADE_PRESETS = {
    // 1. yard (院子): 清晨清新，微风晨光，透亮微凉天光与嫩草微暖
    yard: {
      washColorTop: 'rgba(215, 240, 255, 0.045)',
      washColorBottom: 'rgba(245, 255, 230, 0.025)',
      sunGlow: { x: 300, y: 150, r1: 80, r2: 650, color: 'rgba(255, 250, 225, 0.045)' },
      vignetteColor: 'rgba(12, 32, 70, 0.10)',
      vignetteInnerR: 660,
      vignetteOuterR: 1200,
    },
    // 2. garden (花园): 温暖午后阳光，花草芬芳，金暖氛围
    garden: {
      washColorTop: 'rgba(255, 238, 195, 0.065)',
      washColorBottom: 'rgba(240, 255, 215, 0.035)',
      sunGlow: { x: 1500, y: 180, r1: 120, r2: 750, color: 'rgba(255, 232, 170, 0.065)' },
      vignetteColor: 'rgba(18, 42, 26, 0.09)',
      vignetteInnerR: 670,
      vignetteOuterR: 1190,
    },
    // 3. sandbox (沙坑): 明朗开阔，高调阳光，沙粒与玩具明艳
    sandbox: {
      washColorTop: 'rgba(255, 248, 215, 0.055)',
      washColorBottom: 'rgba(255, 235, 175, 0.030)',
      sunGlow: { x: 960, y: 100, r1: 100, r2: 800, color: 'rgba(255, 252, 225, 0.050)' },
      vignetteColor: 'rgba(40, 28, 12, 0.085)',
      vignetteInnerR: 690,
      vignetteOuterR: 1210,
    },
    // 4. tree (大树下): 树荫斑驳光影，林间清凉微光，林下遮阴感
    tree: {
      washColorTop: 'rgba(200, 240, 210, 0.045)',
      washColorBottom: 'rgba(80, 130, 60, 0.035)',
      sunGlow: { x: 880, y: 220, r1: 60, r2: 600, color: 'rgba(255, 255, 210, 0.055)' },
      vignetteColor: 'rgba(14, 38, 20, 0.13)',
      vignetteInnerR: 630,
      vignetteOuterR: 1160,
      dappledLight: true,
    },
    // 5. golden (金色时刻): 浓郁夕阳暖橙，梦幻金色光雾与温暖侧逆光
    golden: {
      washColorTop: 'rgba(255, 168, 50, 0.125)',
      washColorBottom: 'rgba(255, 215, 95, 0.065)',
      sunGlow: { x: 960, y: 120, r1: 160, r2: 950, color: 'rgba(255, 200, 70, 0.120)' },
      vignetteColor: 'rgba(65, 26, 6, 0.15)',
      vignetteInnerR: 620,
      vignetteOuterR: 1180,
    },
    // 6. party (派对现场): 欢快高饱和度，甜美轻柔暖粉金，节日庆典气氛
    party: {
      washColorTop: 'rgba(255, 225, 240, 0.055)',
      washColorBottom: 'rgba(255, 245, 200, 0.040)',
      sunGlow: { x: 960, y: 240, r1: 140, r2: 850, color: 'rgba(255, 240, 210, 0.060)' },
      vignetteColor: 'rgba(24, 16, 52, 0.095)',
      vignetteInnerR: 680,
      vignetteOuterR: 1200,
    },
  };

  /**
   * 应用全屏调色与暗角
   * @param {CanvasRenderingContext2D} ctx - 绘图上下文 (已置于屏幕空间 1920x1080)
   * @param {string} loc - 场景标识 ('yard' | 'garden' | 'sandbox' | 'tree' | 'golden' | 'party')
   * @param {number} t - 绝对秒数
   * @param {object} cam - 摄像机状态对象
   */
  function apply(ctx, loc, t, cam) {
    const preset = GRADE_PRESETS[loc] || GRADE_PRESETS.yard;

    ctx.save();
    // 确保在屏幕物理坐标系
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 1. 全局色调渐变滤镜 (Top-to-Bottom Wash)
    const washGrad = ctx.createLinearGradient(0, 0, 0, H);
    washGrad.addColorStop(0, preset.washColorTop);
    washGrad.addColorStop(1, preset.washColorBottom);
    ctx.fillStyle = washGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. 柔和顶光/阳光晕染 (Sun / Ambient Glow)
    if (preset.sunGlow) {
      const g = preset.sunGlow;
      const glowGrad = ctx.createRadialGradient(g.x, g.y, g.r1, g.x, g.y, g.r2);
      glowGrad.addColorStop(0, g.color);
      glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, W, H);
    }

    // 3. 大树场景专属：林冠斑驳透光 (纯函数微动光斑)
    if (preset.dappledLight) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 215, 0.035)';
      for (let i = 0; i < 9; i++) {
        const px = 450 + (i % 3) * 360 + Math.sin(t * 1.2 + i * 1.7) * 25;
        const py = 120 + Math.floor(i / 3) * 160 + Math.cos(t * 1.4 + i * 1.3) * 18;
        const pr = 75 + ((i * 19) % 45);
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. 柔和电影级暗角 (Soft Vignette)
    // 画面中心 (620-690px 半径内) 绝对透明无任何压暗，保证角色主体明丽清爽
    const vCenterY = H * 0.48; // 微抬中心，贴合人眼视觉重心
    const vigGrad = ctx.createRadialGradient(
      W / 2, vCenterY, preset.vignetteInnerR,
      W / 2, vCenterY, preset.vignetteOuterR
    );
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.015)');
    vigGrad.addColorStop(1, preset.vignetteColor);

    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  const V12Grade = {
    apply,
    PRESETS: GRADE_PRESETS,
  };

  root.V12Grade = V12Grade;
  if (typeof module !== 'undefined' && module.exports) module.exports = V12Grade;
})(typeof globalThis !== 'undefined' ? globalThis : this);
