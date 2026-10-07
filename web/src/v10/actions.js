// actions.js — 动作循环: 全部为 t 的纯函数, 返回 pose {boom, stick, bucket, bob, squash}
// 角度为绝对世界角(度, 视觉逆时针正), 与 fk.js / rig.json 同约定.
// dig 关键帧经 probe.mjs 60Hz 扫描校准: 齿尖触地不穿透, 油缸行程不越 0.72L0.
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const SQUASH_MAX = 0.12;   // v9 契约硬上限

  // Fritsch-Carlson 单调三次插值 (C1 连续无停启抽搐; 单调段保单调绝不超调, 物理约束在关键帧成立即全程成立)
  // 用户门禁 v6: smoothstep 逐段停启致动作抽搐 → 换样条. 循环边界 (末帧=首帧, 切线周期延拓).
  function keyframed(kfs, period) {
    const n = kfs.length - 1;                       // 末帧为首帧副本
    const names = ['boom', 'stick', 'bucket', 'bob', 'squash'];
    const times = kfs.map(k => k[0]);
    const ch = [1, 2, 3, 4, 5].map(ci => kfs.map(k => k[ci]));
    const segH = i => (i === n - 1 ? period : times[i + 1]) - times[i];
    // 每通道预计算节点切线 (F-C: 局部极值切线归零, 否则加权调和平均)
    const tangents = ch.map(vals => {
      const d = i => (vals[i + 1] - vals[i]) / segH(i);        // 段斜率 (i<n, 段 n-1 的终点是末帧=首帧)
      const m = new Array(n + 1);
      for (let i = 0; i <= n; i++) {
        const d0 = d((i - 1 + n) % n), d1 = d(i % n);          // 循环: 节点 i 左右段斜率
        if (d0 * d1 <= 0) { m[i] = 0; continue; }
        const h0 = segH((i - 1 + n) % n), h1 = segH(i % n);
        const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
        m[i] = (w1 + w2) / (w1 / d0 + w2 / d1);
      }
      return m;
    });
    return t => {
      let tt = t % period; if (tt < 0) tt += period;
      let i = 0;
      while (i < n - 1 && times[i + 1] <= tt) i++;
      const t0 = times[i], hseg = segH(i);
      const u = clamp((tt - t0) / hseg, 0, 1);
      const u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      const out = {};
      for (let c = 0; c < 5; c++) {
        const p0 = ch[c][i], p1 = ch[c][i + 1];
        const m0 = tangents[c][i] * hseg, m1 = tangents[c][i + 1] * hseg;
        out[names[c]] = h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
      }
      out.squash = clamp(out.squash, -SQUASH_MAX, SQUASH_MAX);
      return out;
    };
  }

  // ---- idle-breath: 4s 待机浮动 (v5 中性: 臂左扬斗平放贴地+避让履带) ----
  const idle = t => ({
    boom: 47.5 + 1.5 * Math.sin(TAU * t / 4),
    stick: -26 + 1.5 * Math.sin(TAU * t / 4 + 1.1),
    bucket: -5 + 2 * Math.sin(TAU * t / 4 + 2.2),
    bob: 5 * Math.sin(TAU * t / 4 + 0.4),
    squash: 0.015 * Math.sin(TAU * t / 4 + 1.6),
  });

  // ---- wave: 2s 挥斗(臂前伸+斗杆高抬, 斗在左前空中 1Hz 摆动, 全程腾空) ----
  // v3 中心构型逆解: teeth(299,799) 离 350, belly 离 229, hinge(-121,507)
  const wave = t => ({
    boom: 28 + 2 * Math.sin(TAU * t / 2),
    stick: -65 + 7 * Math.sin(TAU * t / 1 + 0.9),
    bucket: 14 + 8 * Math.sin(TAU * t / 1 + 1.7),
    bob: 5 * Math.sin(TAU * t / 1),
    squash: 0.02 * Math.sin(TAU * t / 1 + Math.PI / 3),
  });

  // ---- dig-cycle: 2.4s 挖土 v2 (物理节奏: 下压0.30/蓄力0.15/刮卷0.50/卷拔0.50/举升0.25/翻回单弧0.45/回位0.25, 砍卸土 V 形急转, 单调速度弧) ----
  // v5 逆解: 全程铲斗三点(齿/底/背)避让履带禁区(x>485&&y>745, 左缘 505 留 20px 间隙)
  // A(48,-14.5,-8) B(47.5,-21.5,-0.5) C(60.5,-33.5,48.5) D(35,-3.5,-45 斗口朝下); 全路径中点逐点验证
  const dig = keyframed([
    [0.00,  47.5, -26,   -5,   0, 0],      // 休息(同中性)
    [0.28,  51.5, -30,   -0.5, 0, 0.02],   // A 远点扎土 (teeth 265 土堆远缘, boom+0.5 减穿透)
    [0.42,  51.5, -30,   -0.5, 0, 0.04],   // 扎土蓄力 0.14s (squash 峰值)
    [0.65,  49.8, -25.5, -4,   0, 0.035],  // 刮程中点 (抬浅 F-C 下弯弧, 齿贴地刮行)
    [0.90,  48,   -21,   -7,   0, 0.03],   // B 拉刮近点 (teeth 340 土堆近缘, 刮程 75px 向车身, 斗背距轮 227 避让逆解)
    [1.10,  51,   -36,   12,   1, 0.02],   // 刮尾卷斗锁土
    [1.35,  56,   -41,   22,   2, 0.02],   // 卷拔中
    [1.55,  63,   -40.5, 38,   3, 0.02],   // 拔起
    [1.75,  62.5, -38,   49,   0, 0.02],   // C 举升缓出
    [1.86,  60,   -40,   44,   0, 0],      // 翻 a (避让引导, 禁跳帧)
    [1.96,  57.5, -41.5, 36,   0, 0],      // 翻 b
    [2.06,  56,   -42,   31,   0, 0],      // 翻 1
    [2.16,  51,   -42,   19,   0, 0],      // 翻 2
    [2.27,  45,   -34.5,  0,   0, 0],      // 翻 3
    [2.40,  47.5, -26,   -5,   0, 0],      // 回中性
  ], 2.4);

  // ---- lift: 1.2s 挖完举斗 (中性→C 提升, 复用 dig 已验证的"补→卷拔中→拔→C"路径, 消除 dig→pose 跳变) ----
  const lift = keyframed([
    [0.00,  47.5, -26,  -5,   0, 0],      // 中性 (dig 整循环结束位)
    [0.30,  50,   -33,   6,   0, 0.02],   // 抬斗开卷 (dig 0.66 姿态)
    [0.55,  56,   -41,   22,  2, 0.02],   // 卷拔中 (dig 0.78)
    [0.80,  63,   -40.5, 38,  3, 0.02],   // 拔起 (dig 0.86)
    [1.00,  62.5, -38,   49,  0, 0.02],   // C 提升到位
    [1.20,  62.5, -38,   49,  0, 0.01],   // 保持 (接 pose 段起点, 零跳变)
  ], 1.2);

  // ---- lower: 1.2s 放斗落地 (C→翻转链→收段→落地, 全程复用 dig 已验证姿态链, 防轮圆投影侵入) ----
  const lower = keyframed([
    [0.00,  62.5, -38,   49,   0, 0.01],  // C 展示位 (=pose 段起点, 零跳变)
    [0.12,  60,   -40,   44,   0, 0],     // dig 1.16 翻转引导 a
    [0.24,  57.5, -41.5, 36,   0, 0],     // dig 1.22 翻转引导 b
    [0.36,  56,   -42,   31,   0, 0],     // dig 1.30 翻 1
    [0.48,  51,   -42,   19,   0, 0],     // dig 1.38 翻 2
    [0.60,  45,   -34.5,  0,   0, 0],     // dig 1.44 翻 3
    [0.72,  41.5, -27,  -19.5, 0, 0],     // dig 1.50 翻 4
    [0.86,  44,   -27.5, -14,  0, 0],     // dig 1.86 收 3
    [1.05,  44,   -27.5, -14,  0, 0.045], // 落地压实 (=收 3 + squash 顿感, 破死停)
    [1.20,  44,   -27.5, -14,  0, 0.01],  // 回弹保持 (接 pose 段)
  ], 1.2);

  // ---- cheer: 2s 庆祝跳 (斗保持落地姿态看护礼物, 车身 0.5s 一跳+落地 squash; 避免 wave 挥斗甩掉礼物的叙事bug) ----
  const cheer = keyframed([
    [0.00,  44, -27.5, -14, 0, 0.01],
    [0.25,  45, -28,   -12, 8, 0],      // 跳起
    [0.50,  44, -27.5, -14, 0, 0.06],   // 落地 squash
    [0.75,  43, -27,   -16, 8, 0],
    [1.00,  44, -27.5, -14, 0, 0.06],
    [1.25,  45, -28,   -12, 8, 0],
    [1.50,  44, -27.5, -14, 0, 0.06],
    [1.75,  43, -27,   -16, 8, 0],
    [2.00,  44, -27.5, -14, 0, 0.01],
  ], 2.0);

  // ---- 全局眨眼表: 每 4s 一次, 持续 0.22s (所有动作叠加) ----
  function blinkAmt(t) {
    let ph = t % 4; if (ph < 0) ph += 4;
    if (ph >= 0.22) return 0;
    return Math.sin(Math.PI * ph / 0.22);
  }

  const actions = {
    idle, wave, dig, lift, lower, cheer,
    blink: idle,           // #blink = 待机姿势 + 眨眼展示
    blinkAmt,
    periods: { idle: 4, wave: 2, dig: 2.4, blink: 4, lift: 1.2, lower: 1.2, cheer: 2 },
  };
  root.V10Actions = actions;
  if (typeof module !== 'undefined' && module.exports) module.exports = actions;
})(typeof globalThis !== 'undefined' ? globalThis : this);
