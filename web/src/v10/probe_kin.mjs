// probe_kin.mjs — 运动学校验: 速度/加速度曲线顿挫检测 (位置合规之外的动态质量关卡)
//   node src/v10/probe_kin.mjs dig     扫描 dig 动作 60Hz, 输出顿挫点/停顿段
// 判定标准 (2D 卡通动作物理):
//   1. 顿挫: 角速度通道 (boom/stick/bucket) 出现 |Δv| > JERK_TH 的加速度尖峰 (非关键帧意图的急动)
//   2. 停顿: |v| 全通道 < 1.5°/s 且持续 > 0.15s (非动作循环端点的死停)
//   3. bob 通道: |Δv| > 40 px/s²
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ACT = require('./actions.js');

const mode = process.argv[2] || 'dig';
const act = ACT[mode];
if (!act) { console.error('unknown action', mode); process.exit(1); }
const T = ACT.periods[mode];
const HZ = 30;                        // 30Hz 重采样 (= 渲染帧率, 对齐人眼感知; 高频抖动观众看不到)
const N = Math.round(T * HZ);
const CH = ['boom', 'stick', 'bucket', 'bob'];
const JERK_TH = 2500;                 // °/s² 报告线: 30fps 下单帧 ~2.8° 阶跃
const JERK_HARD = 4500;               // °/s² 硬失败线: 单帧 5° 阶跃 = 明显顿挫
const STALL_V = 1.5, STALL_T = 0.15;

const P = [];
for (let i = 0; i <= N + 2; i++) P.push(act(T * i / N));

let jerks = [];
for (const ch of CH) {
  const th = ch === 'bob' ? 800 : JERK_TH;    // bob px 通道: ±8px 正弦起伏 j≈700 属正常, 只报真异常
  for (let i = 1; i <= N; i++) {
    if (i > N - 2) continue;                  // 循环回绕边界 = 测量伪影 (样片单播无回绕), 跳过
    const v0 = (P[i][ch] - P[i - 1][ch]) * HZ;
    const v1 = (P[i + 1][ch] - P[i][ch]) * HZ;
    const j = Math.abs(v1 - v0) * HZ;
    if (j > th) jerks.push({ t: (T * i / N).toFixed(3), ch, j: j.toFixed(0), v0: v0.toFixed(1), v1: v1.toFixed(1) });
  }
}
// 合并同帧多通道
const jerkMap = {};
for (const j of jerks) (jerkMap[j.t] ||= []).push(`${j.ch}(j=${j.j}, v ${j.v0}→${j.v1})`);
const hard = Object.values(jerks).filter(j => +j.j > JERK_HARD);
console.log(`== ${mode} T=${T}s 运动学扫描 (${HZ}Hz, 人眼感知对齐) ==`);
console.log(`硬顿挫 (>${JERK_HARD}°/s²): ${hard.length}  急动点 (>${JERK_TH}°/s²): ${Object.keys(jerkMap).length}`);
for (const [t, v] of Object.entries(jerkMap)) console.log(`  t=${t}  ${v.join('  ')}`);

// 停顿段
let stalls = [], cur = null;
for (let i = 0; i <= N; i++) {
  const vAng = Math.max(...CH.map(ch => Math.abs((P[Math.min(i + 1, N + 2)][ch] - P[i][ch]) * HZ)));
  const vSq = Math.abs(((P[Math.min(i + 1, N + 2)].squash || 0) - (P[i].squash || 0)) * HZ);
  const v = Math.max(vAng, vSq * 20);         // squash 速度 ×20 折算入停顿判定 (0.075/s 压实 ≈ 1.5°/s 级运动)
  const t = T * i / N;
  if (v < STALL_V) {
    if (!cur) cur = { t0: t };
    cur.t1 = t;
  } else {
    if (cur && cur.t1 - cur.t0 >= STALL_T && cur.t0 > 0.01 && cur.t1 < T - 0.01) stalls.push(cur);
    if (cur && cur.t1 - cur.t0 >= STALL_T && (cur.t0 <= 0.01 || cur.t1 >= T - 0.01)) { /* 端点停顿=循环边界, 正常 */ }
    cur = null;
  }
}
console.log(`停顿段 (v<${STALL_V}°/s 持续>${STALL_T}s, 非端点): ${stalls.length}`);
for (const s of stalls) console.log(`  t=${s.t0.toFixed(2)}-${s.t1.toFixed(2)} (${(s.t1 - s.t0).toFixed(2)}s)`);

// 速度包络 (每 1/8 段平均 |v|, 看节奏是否切碎)
console.log('节奏包络 (8 段平均角速度°/s):');
for (let k = 0; k < 8; k++) {
  let sum = 0, n = 0;
  for (let i = Math.floor(N * k / 8); i < Math.floor(N * (k + 1) / 8); i++) {
    sum += Math.max(...['boom', 'stick', 'bucket'].map(ch => Math.abs((P[i + 1][ch] - P[i][ch]) * HZ)));
    n++;
  }
  console.log(`  ${(T * k / 8).toFixed(2)}-${(T * (k + 1) / 8).toFixed(2)}s: ${(sum / n).toFixed(0)}°/s`);
}
