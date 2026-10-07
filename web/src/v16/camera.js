// camera.js — 虚拟摄像机系统 (V11)
// 支持: 平移 (pan/track)、推拉缩放 (pushIn/pullOut/zoom)、震颤 (shake)、多层视差 (parallax)
(function (root) {
  'use strict';

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;

  // 缓动函数
  const easeInOutCubic = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
  const linear = u => u;

  // 计算摄像机在 t 时刻的插值状态
  function evalCamera(camDef, t, shotT0, shotDur) {
    if (!camDef) return { x: 960, y: 540, zoom: 1.0, shake: [0, 0] };
    const uRaw = clamp((t - shotT0) / (shotDur || 1), 0, 1);
    const easeFn = camDef.ease === 'linear' ? linear : (camDef.ease === 'outCubic' ? easeOutCubic : easeInOutCubic);
    const u = easeFn(uRaw);

    const from = camDef.from || { x: 960, y: 540, zoom: 1.0 };
    const to = camDef.to || from;

    let x = lerp(from.x, to.x, u);
    let y = lerp(from.y, to.y, u);
    let zoom = lerp(from.zoom || 1.0, to.zoom || 1.0, u);

    // 彻底根除全屏镜头晃动: 相机运动 100% 平稳平滑大气, 绝不触发全屏颤抖
    return { x, y, zoom, shake: [0, 0] };
  }

  // 计算指定视差层对应的 Canvas 2D 变换矩阵 [a, b, c, d, e, f]
  function getMatrix(camSt, parallax) {
    if (!camSt) return [1, 0, 0, 1, 0, 0];
    parallax = parallax !== undefined ? parallax : 1.0;
    const zoom = camSt.zoom || 1.0;
    const dx = (camSt.x - 960) * parallax;
    const dy = (camSt.y - 540) * (parallax > 0.5 ? 0.75 : parallax * 0.4);
    const e = 960 - zoom * (960 + dx);
    const f = 540 - zoom * (540 + dy);
    return [zoom, 0, 0, zoom, e, f];
  }

  // 为特定视差层应用摄像机矩阵
  // canvas 尺寸为 1920x1080, 画面中心在 (960, 540)
  // parallax: 0.0 (天顶) ~ 0.2 (远景) ~ 0.55 (中景) ~ 1.0 (主场景) ~ 1.45 (前景)
  function apply(ctx, camSt, parallax) {
    const m = getMatrix(camSt, parallax);
    ctx.save();
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  }

  function restore(ctx) {
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  const Cam = {
    evalCamera,
    getMatrix,
    apply,
    restore,
  };

  root.V12Cam = Cam;
  root.V11Cam = Cam;
  if (typeof module !== 'undefined' && module.exports) module.exports = Cam;
})(typeof globalThis !== 'undefined' ? globalThis : this);
