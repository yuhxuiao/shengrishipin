// Shared 2D geometry. Camera transforms never enter contact calculations.
(function (root) {
  'use strict';
  const FK = root.V10FK || (typeof require === 'function' ? require('../v10/fk.js') : null);
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, u) => a + (b - a) * u;
  const ease = u => { u = clamp(u); return u * u * u * (10 + u * (-15 + 6 * u)); };
  const phase = (t, a, b) => ease((t - a) / (b - a));
  function curve(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], phase(t, keys[i - 1][0], keys[i][0]));
    }
    return keys[keys.length - 1][1];
  }
  const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  function joint(a, b, l1, l2, bend = 1) {
    const raw = distance(a, b), d = Math.max(0.001, Math.min(raw, l1 + l2 - 0.001));
    const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    const ux = (b[0] - a[0]) / Math.max(raw, 0.001), uy = (b[1] - a[1]) / Math.max(raw, 0.001);
    return [a[0] + along * ux - bend * h * uy, a[1] + along * uy + bend * h * ux];
  }
  function transform(p, x, y, angle = 0) {
    return FK.mApply(FK.mMul(FK.mTrans(x, y), FK.mRotCCW(-angle * 180 / Math.PI)), p);
  }
  function inside(p, poly) {
    let yes = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if (((a[1] > p[1]) !== (b[1] > p[1])) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes;
    }
    return yes;
  }
  function contour(points, steps = 8) {
    const result = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      for (let k = 0; k < steps; k++) result.push([mix(a[0], b[0], k / steps), mix(a[1], b[1], k / steps)]);
    }
    return result;
  }
  const api = { clamp, mix, ease, phase, curve, distance, joint, transform, inside, contour };
  root.B20Math = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
