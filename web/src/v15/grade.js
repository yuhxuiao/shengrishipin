// grade.js — V15 电影级分场景全屏调色与澳洲昆士兰暖阳系统 (Canvas2D)
// 契约: globalThis.V12Grade = { apply(ctx, loc, t, cam) }; globalThis.V15Grade = globalThis.V12Grade;
// 运行于主世界绘制完成后、大标题与字幕绘制之前 (屏幕 1920×1080 坐标系)
// 特性: 6 个地点独立调色风格、高透光清爽温暖澳洲阳光感、超柔和电影级暗角 Vignette、顶部天光微晕、纯函数确定性重放
(function (root) {
  'use strict';

  const W = 1920, H = 1080;
  const TAU = Math.PI * 2;

  // 各场景调色配置参数表 (强度克制，对齐原片清爽温润、高透光的澳洲昆士兰暖阳感，彻底消除暗沉与发灰)
  const GRADE_PRESETS = {
    // 1. yard (院子): 清爽温润澳洲晨曦日光，草地明亮透光、天空澄澈、天光轻透
    yard: {
      washColorTop: 'rgba(215, 242, 255, 0.035)',
      washColorBottom: 'rgba(255, 250, 225, 0.040)',
      sunGlow: { x: 420, y: 130, r1: 90, r2: 780, color: 'rgba(255, 252, 238, 0.055)' },
      vignetteColor: 'rgba(11, 28, 58, 0.065)',
      vignetteInnerR: 750,
      vignetteOuterR: 1260,
    },
    // 2. garden (花园): 温暖午后明媚阳光，金暖花木芬芳，透亮生机
    garden: {
      washColorTop: 'rgba(255, 246, 215, 0.045)',
      washColorBottom: 'rgba(245, 255, 225, 0.035)',
      sunGlow: { x: 1480, y: 150, r1: 110, r2: 820, color: 'rgba(255, 245, 210, 0.060)' },
      vignetteColor: 'rgba(16, 36, 20, 0.065)',
      vignetteInnerR: 750,
      vignetteOuterR: 1260,
    },
    // 3. sandbox (沙坑): 明朗开阔热烈夏日艳阳，沙粒金黄灿烂，澄澈通透
    sandbox: {
      washColorTop: 'rgba(255, 250, 230, 0.040)',
      washColorBottom: 'rgba(255, 242, 195, 0.035)',
      sunGlow: { x: 960, y: 90, r1: 120, r2: 860, color: 'rgba(255, 253, 238, 0.055)' },
      vignetteColor: 'rgba(32, 22, 10, 0.065)',
      vignetteInnerR: 760,
      vignetteOuterR: 1270,
    },
    // 4. tree (大树下): 树荫间隙斑驳金色透光，林荫温润清凉而不暗沉
    tree: {
      washColorTop: 'rgba(220, 248, 230, 0.035)',
      washColorBottom: 'rgba(242, 255, 215, 0.035)',
      sunGlow: { x: 880, y: 180, r1: 80, r2: 720, color: 'rgba(255, 255, 225, 0.055)' },
      vignetteColor: 'rgba(12, 30, 18, 0.075)',
      vignetteInnerR: 730,
      vignetteOuterR: 1250,
      dappledLight: true,
    },
    // 5. golden (金色时刻): 醉人澳洲夕阳暖金神圣光芒，丁达尔暖雾与温润蜜桃金
    golden: {
      washColorTop: 'rgba(255, 178, 60, 0.110)',
      washColorBottom: 'rgba(255, 222, 115, 0.060)',
      sunGlow: { x: 960, y: 120, r1: 180, r2: 980, color: 'rgba(255, 212, 85, 0.115)' },
      vignetteColor: 'rgba(52, 20, 6, 0.100)',
      vignetteInnerR: 710,
      vignetteOuterR: 1250,
    },
    // 6. party (派对现场): 欢快庆典活力高彩，甜美柔和马卡龙暖粉金光
    party: {
      washColorTop: 'rgba(255, 236, 246, 0.040)',
      washColorBottom: 'rgba(255, 248, 215, 0.038)',
      sunGlow: { x: 960, y: 200, r1: 140, r2: 880, color: 'rgba(255, 246, 225, 0.055)' },
      vignetteColor: 'rgba(18, 12, 42, 0.065)',
      vignetteInnerR: 750,
      vignetteOuterR: 1260,
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
      ctx.fillStyle = 'rgba(255, 255, 220, 0.040)';
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
    // 画面中央 (710-760px 半径内) 绝对透明无任何压暗，保证角色主体与互动明丽清爽
    const vCenterY = H * 0.48; // 微抬中心，贴合人眼视觉重心
    const vigGrad = ctx.createRadialGradient(
      W / 2, vCenterY, preset.vignetteInnerR,
      W / 2, vCenterY, preset.vignetteOuterR
    );
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(0.68, 'rgba(0, 0, 0, 0.010)');
    vigGrad.addColorStop(1, preset.vignetteColor);

    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  const V12Grade = {
    apply,
    PRESETS: GRADE_PRESETS,
  };

  root.V15Grade = V12Grade;
  root.V12Grade = V12Grade;
  if (typeof module !== 'undefined' && module.exports) module.exports = V12Grade;
})(typeof globalThis !== 'undefined' ? globalThis : this);
