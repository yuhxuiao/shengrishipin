// probe.mjs — FK 离线校准: 验证齿尖触地/油缸行程/关节位置, 不开浏览器
//   node src/v10/probe.mjs                     中性姿态 + 油缸 L0
//   node src/v10/probe.mjs dig                 挖土循环 60Hz 扫描: 齿尖最低点/穿透/油缸行程范围
//   node src/v10/probe.mjs pose 40 -25 25      单姿势关键点
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const FK = require('./fk.js');
const ACT = require('./actions.js');
import { readFileSync } from 'node:fs';

const { LAYOUT, assemble, NEUTRAL } = FK;
const G = LAYOUT.ground_y;
// 铲斗全轮廓点集 (右缘+下缘每 8px, 140 点; 避让校验不采样代表点, 用全轮廓 — agy BLOCKER 教训)
const BUCKET_EDGE = JSON.parse(readFileSync(new URL('../../../scratch/v10/bucket_edge_pts.json', import.meta.url)));

function fmt(p) { return `(${p[0].toFixed(0)}, ${p[1].toFixed(0)})`; }

function report(tag, p) {
  const fk = assemble(p);
  const c1 = Math.hypot(fk.c1b[0] - fk.c1a[0], fk.c1b[1] - fk.c1a[1]);
  const c2 = Math.hypot(fk.c2b[0] - fk.c2a[0], fk.c2b[1] - fk.c2a[1]);
  console.log(`${tag}  boom=${p.boom.toFixed(1)} stick=${p.stick.toFixed(1)} bucket=${p.bucket.toFixed(1)} bob=${(p.bob||0).toFixed(1)}`);
  console.log(`  root=${fmt(fk.rootW)} elbow=${fmt(fk.elbowW)} hinge=${fmt(fk.hingeW)}`);
  console.log(`  teeth=${fmt(fk.teethW)} (离地 ${(G - fk.teethW[1]).toFixed(0)}) belly=${fmt(fk.bellyW)} (离地 ${(G - fk.bellyW[1]).toFixed(0)})`);
  console.log(`  cyl1=${c1.toFixed(0)} cyl2=${c2.toFixed(0)}`);
  return { fk, c1, c2 };
}

const mode = process.argv[2] || 'neutral';

if (mode === 'pose') {
  report('pose', { boom: +process.argv[3], stick: +process.argv[4], bucket: +process.argv[5], bob: 0, squash: 0 });
} else if (mode === 'neutral') {
  const r = report('neutral', NEUTRAL);
  console.log(`L0: cyl1=${r.c1.toFixed(1)} cyl2=${r.c2.toFixed(1)}  (杆程下限 0.72L0: ${(r.c1 * 0.72).toFixed(0)} / ${(r.c2 * 0.72).toFixed(0)})`);
} else {
  // 动作扫描
  const act = ACT[mode];
  if (!act) { console.error('unknown action', mode); process.exit(1); }
  const T = ACT.periods[mode];
  const n = Math.round(T * 60);
  let minClear = 1e9, maxPen = -1e9, minBelly = 1e9, c1min = 1e9, c1max = 0, c2min = 1e9, c2max = 0;
  let elbowXmax = -1e9, hingeXmax = -1e9, teethXmax = -1e9, faceBlock = 0, trackHit = 0, trackXmax = -1e9, trackWorst = [0, 0];
  let bbox = [1e9, 1e9, -1e9, -1e9];
  for (let i = 0; i <= n; i++) {
    const t = T * i / n;
    const p = act(t);
    const fk = assemble(p);
    const clear = G - fk.teethW[1];
    if (clear < minClear) minClear = clear;
    if (fk.teethW[1] - G > maxPen) maxPen = fk.teethW[1] - G;
    minBelly = Math.min(minBelly, G - fk.bellyW[1]);
    const c1 = Math.hypot(fk.c1b[0] - fk.c1a[0], fk.c1b[1] - fk.c1a[1]);
    const c2 = Math.hypot(fk.c2b[0] - fk.c2a[0], fk.c2b[1] - fk.c2a[1]);
    c1min = Math.min(c1min, c1); c1max = Math.max(c1max, c1);
    c2min = Math.min(c2min, c2); c2max = Math.max(c2max, c2);
    elbowXmax = Math.max(elbowXmax, fk.elbowW[0]);
    hingeXmax = Math.max(hingeXmax, fk.hingeW[0]);
    teethXmax = Math.max(teethXmax, fk.teethW[0]);
    // 履带禁区 v2 (真实圆轮几何): 引导轮心 (700,969) r195+20 间隙=215, y>745; 铲斗全轮廓 140 点
    let frameHit = 0;
    for (const pt of BUCKET_EDGE) {
      const w = FK.mApply(fk.mBucket, pt);
      if (w[1] > 745 && Math.hypot(w[0] - 700, w[1] - 969) < 215) { trackHit++; frameHit++; trackXmax = Math.max(trackXmax, w[0]); }
    }
    if (frameHit > trackWorst[1]) trackWorst = [t, frameHit];
    // 脸区: 装配 x>638(车体左缘) 且 y<860(吻部下缘上方); 铲斗入此区=遮脸
    if (fk.teethW[0] > 638 && fk.teethW[1] < 860) faceBlock++;
    if (fk.bellyW[0] > 660 && fk.bellyW[1] < 860) faceBlock++;
    for (const pt of [fk.rootW, fk.elbowW, fk.hingeW, fk.teethW, fk.bellyW]) {
      bbox[0] = Math.min(bbox[0], pt[0]); bbox[1] = Math.min(bbox[1], pt[1]);
      bbox[2] = Math.max(bbox[2], pt[0]); bbox[3] = Math.max(bbox[3], pt[1]);
    }
  }
  const L01 = Math.hypot(...(x => x)([0, 0])) || 0;
  const n0 = assemble(NEUTRAL);
  const L0c1 = Math.hypot(n0.c1b[0] - n0.c1a[0], n0.c1b[1] - n0.c1a[1]);
  const L0c2 = Math.hypot(n0.c2b[0] - n0.c2a[0], n0.c2b[1] - n0.c2a[1]);
  console.log(`${mode}: T=${T}s  齿尖最小离地=${minClear.toFixed(0)}  最大穿透=${maxPen.toFixed(0)}  斗底最小离地=${minBelly.toFixed(0)}`);
  console.log(`  铰位 xmax: elbow=${elbowXmax.toFixed(0)} hinge=${hingeXmax.toFixed(0)} (限 640)  teeth xmax=${teethXmax.toFixed(0)}  遮脸帧数=${faceBlock}  履带侵入点数=${trackHit} (max x=${trackXmax > -1e8 ? trackXmax.toFixed(0) : "-"}, 限 485; 峰值帧 t=${trackWorst[0].toFixed(2)} +${trackWorst[1]}点)`);
  console.log(`  cyl1 行程 ${c1min.toFixed(0)}..${c1max.toFixed(0)}  (L0=${L0c1.toFixed(0)}, 0.72L0=${(L0c1 * 0.72).toFixed(0)})`);
  console.log(`  cyl2 行程 ${c2min.toFixed(0)}..${c2max.toFixed(0)}  (L0=${L0c2.toFixed(0)}, 0.72L0=${(L0c2 * 0.72).toFixed(0)})`);
  console.log(`  末端 bbox x[${bbox[0].toFixed(0)},${bbox[2].toFixed(0)}] y[${bbox[1].toFixed(0)},${bbox[3].toFixed(0)}]`);
}
