// actions.js — V11 挖挖全套动作库与动态微表演系统
// 全部为 t 的纯函数, 返回 pose {boom, stick, bucket, bob, squash}
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const SQUASH_MAX = 0.12;

  // Fritsch-Carlson 单调三次样条插值
  function keyframed(kfs, period) {
    const n = kfs.length - 1;
    const names = ['boom', 'stick', 'bucket', 'bob', 'squash'];
    const times = kfs.map(k => k[0]);
    const ch = [1, 2, 3, 4, 5].map(ci => kfs.map(k => k[ci]));
    const segH = i => (i === n - 1 ? period : times[i + 1]) - times[i];
    const tangents = ch.map(vals => {
      const d = i => (vals[i + 1] - vals[i]) / segH(i);
      const m = new Array(n + 1);
      for (let i = 0; i <= n; i++) {
        const d0 = d((i - 1 + n) % n), d1 = d(i % n);
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

  // 1. idle: 呼吸浮动 (4s)
  const idle = t => ({
    boom: 47.5 + 1.5 * Math.sin(TAU * t / 4),
    stick: -26 + 1.5 * Math.sin(TAU * t / 4 + 1.1),
    bucket: -5 + 2 * Math.sin(TAU * t / 4 + 2.2),
    bob: 5 * Math.sin(TAU * t / 4 + 0.4),
    squash: 0.015 * Math.sin(TAU * t / 4 + 1.6),
  });

  // 2. wave: 挥手打招呼 (2s)
  const wave = keyframed([
    [0.0, 52, -18,  5, 0, 0],
    [0.5, 60, -10, 42, 6, 0],
    [1.0, 50, -22, -8, 2, 0],
    [1.5, 60, -10, 42, 6, 0],
    [2.0, 52, -18,  5, 0, 0],
  ], 2.0);

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

  // ---- cheer: 2s 庆祝跳 (富有弹性的欢呼跳跃: 蓄力→腾空→落地压实→回正，消灭机械连续弹跳) ----
  const cheer = keyframed([
    [0.00, 44.0, -27.5, -14.0,  0.0, 0.01],
    [0.20, 43.5, -27.0, -15.0, -2.5, 0.04], // 蓄力下沉
    [0.45, 47.0, -25.0,  -8.0,  8.0,-0.02], // 腾空大跳
    [0.70, 44.0, -27.5, -14.0,  0.0, 0.06], // 落地压实
    [0.95, 44.5, -27.0, -13.0,  1.5, 0.00], // 弹跳回位缓冲
    [1.20, 43.5, -27.0, -15.0, -2.5, 0.04], // 第二跳蓄力
    [1.45, 47.0, -25.0,  -8.0,  8.0,-0.02], // 第二跳腾空
    [1.70, 44.0, -27.5, -14.0,  0.0, 0.06], // 落地压实
    [2.00, 44.0, -27.5, -14.0,  0.0, 0.01], // 稳稳落地
  ], 2.0);

  // ---- 全局眨眼表: 每 4s 一次, 持续 0.22s (所有动作叠加) ----
  function blinkAmt(t) {
    let ph = t % 4; if (ph < 0) ph += 4;
    if (ph >= 0.22) return 0;
    return Math.sin(Math.PI * ph / 0.22);
  }

  
  // ---- V11 新增动作 ----

  // 7. anticipate_dig: 挖前蓄力预备 (0.8s, 车身下蹲压缩 + 动臂微后撤)
  const anticipate_dig = keyframed([
    [0.0, 47.5, -26, -5,  0, 0.0],
    [0.3, 44.0, -28, -8, -6, 0.07], // 下压蓄力
    [0.6, 43.0, -29, -10,-8, 0.09], // 最大压缩
    [0.8, 44.0, -27.5,-14, 0, 0.01], // 瞬间回弹咬入
  ], 0.8);

  // 8. settle: 动作后阻尼缓冲 (0.8s)
  const settle = keyframed([
    [0.0, 44,   -27.5, -14,  0, 0.05],
    [0.2, 48.5, -25.5, -4,   6, 0.0],  // 过冲微抬
    [0.4, 46.5, -26.5, -7,  -2, 0.02], // 回落
    [0.6, 47.8, -25.8, -5,   1, 0.0],
    [0.8, 47.5, -26.0, -5,   0, 0.0],
  ], 0.8);

  // 9. look_around: 左右张望寻找 (2.4s)
  const look_around = keyframed([
    [0.0, 47.5, -26, -5,  0, 0],
    [0.6, 52.0, -25, -12, 4, 0], // 探头看左
    [1.2, 47.5, -26, -5,  0, 0], // 回中
    [1.8, 43.0, -27, -8,  3, 0], // 探头看右
    [2.4, 47.5, -26, -5,  0, 0],
  ], 2.4);

  // 10. nod: 点头确认 (1.2s)
  const nod = keyframed([
    [0.0, 47.5, -26, -5, 0, 0],
    [0.3, 44.0, -30, -8, -4, 0.04],
    [0.6, 49.0, -24, -3,  2, 0],
    [0.9, 45.0, -28, -6, -3, 0.03],
    [1.2, 47.5, -26, -5, 0, 0],
  ], 1.2);

  // 11. hop_joy: 雀跃双连跳 (1.2s)
  const hop_joy = keyframed([
    [0.0, 47.5, -26, -5,  0, 0],
    [0.25, 49.0, -24, -2, 10, 0],      // 弹起 (悬挂顶起)
    [0.50, 47.0, -27, -6,  0, 0.07],   // 落地压实
    [0.75, 49.0, -24, -2, 10, 0],      // 二连跳
    [1.00, 47.0, -27, -6,  0, 0.07],
    [1.20, 47.5, -26, -5,  0, 0],
  ], 1.2);

  // 12. reach_up: 昂首向上够 (1.6s)
  const reach_up = keyframed([
    [0.0, 47.5, -26, -5, 0, 0],
    [0.8, 62.0, -28,  8, 6, 0], // 向上够 (斗向外展)
    [1.6, 47.5, -26, -5, 0, 0],
  ], 1.6);

  // 13. wiggle: 期待小扭身 (1.4s 舒缓可爱的左右欢喜摇摆)
  const wiggle = t => {
    const ph = Math.sin(TAU * t / 1.4);
    return {
      boom: 47.5 + 1.6 * ph,
      stick: -26 + 1.2 * Math.sin(TAU * t / 1.4 + 0.6),
      bucket: -5 + 2.0 * Math.sin(TAU * t / 1.4 + 1.2),
      bob: 2.2 * Math.abs(ph),
      squash: 0.015 * ph,
    };
  };

  // 14. bow: 礼貌鞠躬 (1.6s)
  const bow = keyframed([
    [0.0, 47.5, -26,  -5,  0, 0],
    [0.6, 38.0, -32, -18, -6, 0.06], // 铲斗贴地鞠躬
    [1.0, 38.0, -32, -18, -6, 0.06], // 保持致敬
    [1.6, 47.5, -26,  -5,  0, 0],
  ], 1.6);

  // 15. talk_bob: 说话时随音律自然点头 (1.4s 呼吸感重音微动)
  const talk_bob = t => {
    const ph = Math.sin(TAU * t / 1.4);
    return {
      boom: 47.5 + 1.5 * ph,
      stick: -26 + 1.0 * Math.sin(TAU * t / 1.4 + 0.5),
      bucket: -5 + 1.5 * Math.sin(TAU * t / 1.4 + 1.0),
      bob: 2.0 * ph,
      squash: 0.01 * ph,
    };
  };

  // micro: 微动作确定性轮换 (彻底消除 >2.5s 的死板 idle)
  // 当剧本处于 idle 区间时，按种子和时间自然触发各种微表情/动作
  function micro(t, seed) {
    const s = seed || 0;
    const ph = (t * 0.4 + s * 1.37) % 3;
    if (ph < 1) return look_around(t);
    if (ph < 2) return wiggle(t);
    return idle(t);
  }

  const actions = {
    idle, wave, dig, lift, lower, cheer,
    anticipate_dig, settle, look_around, nod, hop_joy, reach_up, wiggle, bow, talk_bob, micro,
    periods: {
      idle: 4, wave: 2, dig: 2.4, lift: 1.2, lower: 1.2, cheer: 2,
      anticipate_dig: 0.8, settle: 0.8, look_around: 2.4, nod: 1.2,
      hop_joy: 1.2, reach_up: 1.6, wiggle: 1.6, bow: 1.6, talk_bob: 1.2,
    },
  };

  root.V11Actions = actions;
  if (typeof module !== 'undefined' && module.exports) module.exports = actions;
})(typeof globalThis !== 'undefined' ? globalThis : this);
