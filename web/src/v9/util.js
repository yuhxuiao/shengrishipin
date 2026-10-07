// util.js — V9 纯函数时间工具:缓动、闭式弹簧、关键帧、种子随机、噪声
// 约定:所有动画量都是时间 t 的纯函数,渲染期不得使用 Math.random / Date.now

export const TAU = Math.PI * 2;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const clamp01 = x => clamp(x, 0, 1);
export const lerp = (a, b, p) => a + (b - a) * p;
export const invLerp = (a, b, x) => clamp01((x - a) / (b - a));
export const remap = (x, a, b, c, d) => lerp(c, d, invLerp(a, b, x));
export const smoothstep = (a, b, x) => { const p = invLerp(a, b, x); return p * p * (3 - 2 * p); };
export const smootherstep = (a, b, x) => { const p = invLerp(a, b, x); return p * p * p * (p * (p * 6 - 15) + 10); };
export const deg = d => d * Math.PI / 180;

export const ease = {
  linear: p => p,
  inQuad: p => p * p,
  outQuad: p => 1 - (1 - p) * (1 - p),
  inOutQuad: p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2,
  inCubic: p => p * p * p,
  outCubic: p => 1 - Math.pow(1 - p, 3),
  inOutCubic: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  inOutSine: p => -(Math.cos(Math.PI * p) - 1) / 2,
  outSine: p => Math.sin(p * Math.PI / 2),
  outBack: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
  inOutQuint: p => p < .5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2,
};

// 阻尼弹簧单位阶跃响应(闭式解):tau<0 时为 0,之后趋于 1;zeta<1 有过冲
export function springStep(tau, freq = 2.2, zeta = 0.45) {
  if (tau <= 0) return 0;
  const w = TAU * freq;
  if (zeta >= 1) { // 临界阻尼
    return 1 - Math.exp(-w * tau) * (1 + w * tau);
  }
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * tau) * (Math.cos(wd * tau) + (zeta * w / wd) * Math.sin(wd * tau));
}

// 弹簧轨道:keys = [[t0, v0], [t1, v1], ...];值 = v0 + Σ(vi − vi−1)·springStep(t − ti)
// 每个关键帧像给弹簧换了一个目标,任意 t 可独立求值
export function spring(t, keys, freq = 2.2, zeta = 0.45) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [ti, vi] = keys[i];
    if (t <= ti) break;
    v += (vi - keys[i - 1][1]) * springStep(t - ti, keys[i][2] ?? freq, keys[i][3] ?? zeta);
  }
  return v;
}

// 分段关键帧:keys = [[t, v, easeFn?], ...];段内用终点关键帧给的缓动(默认 inOutCubic)
export function kf(t, keys, defEase = ease.inOutCubic) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const p = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
      return lerp(v0, v1, (e || defEase)(p));
    }
  }
  return keys[keys.length - 1][1];
}

// 向量关键帧(数组值)
export function kfv(t, keys, defEase = ease.inOutCubic) {
  const n = keys[0][1].length, out = new Array(n);
  for (let j = 0; j < n; j++) out[j] = kf(t, keys.map(k => [k[0], k[1][j], k[2]]), defEase);
  return out;
}

// 窗口:t 在 [a,b] 内为 1,两端各用 fi/fo 秒淡入淡出
export function win(t, a, b, fi = 0.25, fo = 0.25) {
  if (t < a || t > b) return 0;
  return Math.min(fi > 0 ? smoothstep(a, a + fi, t) : 1, fo > 0 ? 1 - smoothstep(b - fo, b, t) : 1);
}

// 一次性脉冲:t0 起 dur 秒内 0→1→0(sin 包络)
export function pulse(t, t0, dur) {
  const p = (t - t0) / dur;
  return p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function halton(i, b) {
  let f = 1, r = 0;
  while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); }
  return r;
}

// 整数哈希 → [0,1)
function hash1(n) {
  n = Math.imul(n ^ 61, 0x27d4eb2d) ^ (n >>> 15);
  n = Math.imul(n ^ (n >>> 13), 0x85ebca6b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function hash2(x, y, s = 0) { return hash1(x * 374761393 + y * 668265263 + s * 2147483647); }

// 1D 值噪声(平滑),返回 [-1,1]
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash2(i, seed) * 2 - 1, hash2(i + 1, seed) * 2 - 1, u);
}
// 2D 值噪声,返回 [0,1]
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
export function fbm2(x, y, oct = 4, seed = 0) {
  let v = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { v += a * noise2(x * f, y * f, seed + i * 17); n += a; a *= 0.5; f *= 2.03; }
  return v / n;
}

// 平滑手持感漂移:返回 [-1,1] 的低频信号
export function drift(t, seed, speed = 0.35) {
  return noise1(t * speed, seed) * 0.65 + noise1(t * speed * 2.3, seed + 7) * 0.35;
}
