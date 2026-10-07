// director.js — V9 导演:timeline.json 驱动 开开表演/运镜/挖土形变/特效/口型
// 全部状态为 t 的纯函数(粒子特效在初始化时一次性预模拟,之后按 t 采样)
import * as THREE from 'three';
import { kf, kfv, win, pulse, ease, clamp01, lerp, smoothstep } from './util.js';
import { buildFx } from './fx.js';
import { MOUND, WIND } from './world.js';

// r2: 避让倾听窗/跳舞峰/切点(±0.3s);r3: 按新时间轴重排(倾听 19.7-20.9/舞 22.3-24.6/举高 24.9-28.5 专注不眨/wink 47.6 前留白)
const BLINKS = [3.1, 5.6, 6.35, 11.2, 15.6, 21.2, 29.5, 33.5, 37.5, 42.9, 46.9];
const blinkIdle = t => BLINKS.reduce((b, t0) => Math.max(b, pulse(t, t0, 0.24)), 0);

export async function makeDirector({ world, kk, camera, timeline, lipsync }) {
  const fx = buildFx(world.scene);
  const B = timeline.beats;
  const groundFn = (x, z) => world.mound.surfaceY(x, z);
  const moundTop = new THREE.Vector3(MOUND.x, MOUND.H * 0.85, MOUND.z);

  // ---------------- 特效预调度(确定性;音效已在 timeline 对齐) ----------------
  // r1: 卸土泥块 FK 铲斗唇口生成(文件尾部 dumpClods)
  // r2: 挖掘泥块/尘雾也改 FK 采样接触瞬间斗齿实际世界位(文件尾部 digBurst);
  //     此前硬编码锚定 moundTop,33.3/42.2 铲斗在堆右缘而特效在山顶爆开,0.45m 空间脱节
  fx.addPuff(B.dump_thud, moundTop, { n: 10, spread: 0.35, up: 0.15, size: 0.28 });
  // r3: 驶入急刹草屑扬尘(物理审查建议 3;r3a 探针过淡不可见 → n/size/spread 加强);后缘 = 到位点退来路方向 0.3m
  fx.addPuff(4.35, new THREE.Vector3(1.05, 0.06, 0.15), { n: 10, spread: 0.16, up: 0.09, size: 0.14, color: '#b8cf8e' });
  fx.addPuff(4.62, new THREE.Vector3(0.95, 0.06, 0.28), { n: 8, spread: 0.14, up: 0.08, size: 0.12, color: '#b8cf8e' });
  // r3: hop "落地"(悬挂回弹)草屑(物理审查 seg1 建议 4;party_hop 14.2)
  fx.addPuff(14.5, new THREE.Vector3(0.32, 0.03, 0.22), { n: 6, spread: 0.2, up: 0.06, size: 0.1, color: '#cfe0a8' });
  fx.addPuff(14.72, new THREE.Vector3(0.32, 0.03, 0.22), { n: 5, spread: 0.18, up: 0.05, size: 0.09, color: '#cfe0a8' });
  // r3: 闪光全部 FK/解析重锚(原全链硬编码在开开在原点时代的坐标,偏差达 0.38-0.92m,物理审查 seg2 建议 4);
  //     停驻点 (0.32,0.22);door_glint 按 yaw -0.20 旋转门局部坐标;raise_peak 尾部 FK 斗尖(见 confettiFromBucket)
  const doorW = (() => { const yw = -0.20, c = Math.cos(yw), s = Math.sin(yw);
    return new THREE.Vector3(0.32 + 0.45 * c + 0.35 * s, 0.55, 0.22 - 0.45 * s + 0.35 * c); })();
  fx.addSparkles(B.door_glint, doorW, { n: 10, radius: 0.3 });
  fx.addSparkles(B.balloon_sparkle, new THREE.Vector3(-1.77, 1.8, -0.45), { n: 12, radius: 0.5 }); // r3: 随气球风偏后位置
  fx.addSparkles(B.praise_badge, new THREE.Vector3(0.32, 1.0, 0.72), { n: 16, radius: 0.5 });
  // r4: 星芒外移缩小(B 通道:耀斑糊死眨眼)——锚点移到眼侧外上方,半径 0.2→0.13
  fx.addSparkles(B.wink, new THREE.Vector3(0.26, 0.78, 0.77), { n: 7, radius: 0.13, size: 0.045 });

  // ---------------- 口型 ----------------
  const lip = t => {
    let m = 0;
    for (const ph of (lipsync?.phrases || [])) {
      const i = (t - ph.at) * (lipsync.fps || 30);
      if (i >= 0 && i < ph.env.length) m = Math.max(m, ph.env[Math.floor(i)]);
    }
    return m;
  };

  // ---------------- 机身表演 ----------------
  // r3: 保留 arrive→turn_end 微调车位键 — travelT 积分表已把这段平移+自转计入履带行程,
  //     物理自洽(初版"锁死漂移"根因是 spin 只到 arrive;现全片位移驱动)。
  //     停驻点 (0.32,0.22) 是挖掘落点/坑位/各镜头 look 的全链标定基准,不可挪(物理审查 seg2 阻断 4 教训)
  const posX = t => kf(t, [[0, 3.1], [B.drive_start, 3.1], [B.arrive, 0.75, ease.outCubic], [B.turn_end, 0.32]]);
  const posZ = t => kf(t, [[0, -2.1], [B.drive_start, -2.1], [B.arrive, 0.5, ease.outCubic], [B.turn_end, 0.22]]);
  // r2: 7.35-9.7 yaw -0.20 斜侧 3/4 构图,车门"挖挖"字样迎向镜头(8.95 door_glint 原 90° 切线死角)
  const yaw = t => kf(t, [[0, -1.05], [B.drive_start, -1.05], [4.2, -0.5], [B.arrive, -0.12], [B.turn_end, 0.05],
    [6.9, 0.05], [7.35, -0.20], [9.7, -0.20], [10.15, 0.0]]);
  const moving = t => win(t, B.drive_start, B.arrive, 0.3, 0.35);

  // r3: 履带行程由底盘位移+转向数值积分驱动(纯滚动约束,物理审查阻断 2;
  //     原 spin 线性积分与位移 outCubic 导数不匹配 = 前段溜冰/后段烧胎)。
  //     差速模型:travelL = s - W/2·yaw, travelR = s + W/2·yaw(轮距 W=0.58,同 kaikai.js TRACK.x×2)。
  //     init 一次性积分成表,apply(t) 查表 — renderAt 保持纯函数。
  const travelT = (() => {
    const N = 1200, dt = timeline.total / N, W = 0.58;
    const L = new Float32Array(N + 1), R = new Float32Array(N + 1);
    let px = posX(0), pz = posZ(0), py = yaw(0);
    for (let i = 1; i <= N; i++) {
      const t = i * dt;
      const x = posX(t), z = posZ(t), y = yaw(t);
      const ds = Math.hypot(x - px, z - pz);
      let dy = y - py;
      if (dy > Math.PI) dy -= 2 * Math.PI; else if (dy < -Math.PI) dy += 2 * Math.PI;
      L[i] = L[i - 1] + ds - 0.5 * W * dy;
      R[i] = R[i - 1] + ds + 0.5 * W * dy;
      px = x; pz = z; py = y;
    }
    return { L, R, dt };
  })();
  const travelL = t => travelT.L[Math.min(travelT.L.length - 1, Math.max(0, Math.round(t / travelT.dt)))];
  const travelR = t => travelT.R[Math.min(travelT.R.length - 1, Math.max(0, Math.round(t / travelT.dt)))];

  // r3: bob 语义=上车体悬挂浮沉(履带永不离地,kaikai.js 已改 upperPivot);
  //     全链降幅:腾空跳 0.17→0.05/跳舞 0.09→0.045 等(物理审查 seg1 阻断 1/2)
  const bob = t => moving(t) * Math.sin(t * 12.5) * 0.006
    + kf(t, [[14.15, 0], [14.3, 0.05, ease.outCubic], [14.5, 0], [14.65, 0.035, ease.outCubic], [14.8, 0]]) // r3: hop 改悬挂弹性(party_hop 14.2)
    + win(t, B.dance_start, B.dance_end, 0.3, 0.3) * Math.abs(Math.sin((t - B.dance_start) * Math.PI * 2.2)) * 0.045
    + pulse(t, B.praise_badge + 0.15, 0.5) * 0.04 + pulse(t, B.praise_badge + 0.65, 0.45) * 0.03
    + pulse(t, B.confetti, 0.55) * 0.05 // r2: 彩带爆发欢呼(r3 降幅)
    + win(t, 21.0, 22.15, 0.3, 0.3) * Math.sin(t * 6.0) * 0.01 // r3: 舞前待机呼吸(n1 21.92 止 → dance 22.3)
    + win(t, B.raise_peak + 0.35, B.raise_hold_end - 0.25, 0.35, 0.35) * Math.abs(Math.sin((t - B.raise_peak) * 3.1)) * 0.015; // r2: 举高悬停微弹
  const pitch = t => kf(t, [[4.35, 0], [4.6, -0.035, ease.outCubic], [5.05, 0.02], [5.45, 0]])
    + kf(t, [[B.dig1_contact - 0.2, 0], [B.dig1_contact + 0.12, -0.045], [B.lift1_up, 0.03], [B.lift1_top, 0.025], [B.praise_badge + 0.2, 0]]) // r3: 满载顶点保持后坐(seg3 建议 2)
    + kf(t, [[B.dig2_contact - 0.2, 0], [B.dig2_contact + 0.12, -0.045], [B.lift2_up, 0.03], [B.lift2_top, 0.028], [B.swing_back, 0]])
    + kf(t, [[14.15, 0], [14.29, -0.028, ease.outCubic], [14.52, 0.012], [14.72, -0.02, ease.outCubic], [14.85, 0]]) // r3: hop 冲击改俯仰(party_hop 14.2)
    + 0.0045 * clampA(boomAcc(t)); // r3: 臂上挑后坐俯仰(物理审查 seg1 阻断 4;r3a 探针后减半,同 roll)
  // r3: 挥臂/举臂反作用 — 与 boom 角加速度耦合的机身侧倾(物理审查阻断 4:偏心重臂加速而底盘零反作用);
  //     boom 数值二阶导,clamp 防爆,全程启用(挖/卸段同样有效)
  const clampA = v => Math.max(-4, Math.min(4, v));
  const boomAcc = t => { const h = 0.02; return (boom(t + h) - 2 * boom(t) + boom(t - h)) / (h * h); };
  const swingAcc = t => { const h = 0.02; return (swing(t + h) - 2 * swing(t) + swing(t - h)) / (h * h); }; // r3: 回转惯性差动用
  const roll = t => moving(t) * Math.sin(t * 9.1 + 1.3) * 0.006
    + win(t, B.dance_start, B.dance_end, 0.3, 0.3) * Math.sin((t - B.dance_start) * Math.PI * 2.2) * 0.05
    + win(t, 16.2, 17.2, 0.3, 0.35) * Math.sin((t - 16.2) * 8.0) * 0.06 // r3: "超级热闹"(k5 15.3 起)机身欢快晃动
    + -0.004 * clampA(boomAcc(t)); // r3: 达朗贝尔反作用侧倾(r3a 探针:0.007 叠加后仰致 7.55 斗尖再削顶,减半)
  // r3: squash 全链降幅 ~75%(0.5 = scale.y 0.5 果冻瘫软,物理审查阻断 3;Q 弹感保留,动能转移到 pitch/bob)
  const squash = t => kf(t, [[B.settle, 0], [B.settle + 0.1, 0.12, ease.outCubic], [B.settle + 0.32, -0.045], [B.settle + 0.55, 0.02], [7.0, 0]])
    + pulse(t, B.engine_on - 0.15, 0.4) * 0.07
    + pulse(t, 14.15, 0.5) * 0.12 // party_hop 14.2
    + kf(t, [[B.raise_squat, 0], [B.raise_squat + 0.22, 0.14], [B.raise_up + 0.25, -0.09, ease.outCubic], [B.raise_peak, -0.03], [B.raise_hold_end, 0]])
    + pulse(t, B.dump, 0.45) * 0.1
    + pulse(t, B.dig1_contact, 0.4) * 0.14 + pulse(t, B.dig2_contact, 0.4) * 0.14 // r2: 入土向下蹲挫,泥土重量感(r3 降幅)
    + pulse(t, B.lift1_up, 0.5) * 0.05 + pulse(t, B.lift2_up, 0.5) * 0.05;
  const swing = t => kf(t, [
    [0, 0], [7.2, 0], [7.6, -0.18], [8.4, -0.28], [9.2, -0.15], [10.2, 0],
    [13.25, 0], [13.5, 0.15], [14.65, 0.15], [15.15, 0], // r3: 气球窗(balloon_rise 13.3)上身右收,让开左上视线
    // r3: 倾听/拍手段(19.2-24.9)swing **-0.3** 臂带右后舷 + 臂低位 — shot4 相机在 -x(臂舷同侧),
    //     swing 正值会把臂推到 +z 脸前(r3e 复审仍遮左眼);负值收向右后,脸部投影区彻底干净
    [18.8, 0], [19.5, -0.3], [24.7, -0.3], [25.0, 0],
    // r2: FK 标定正对堆心 swing≈-0.85(fk_check.mjs):dig1/dump -0.76→-0.85,dig2 -0.68→-0.80,配合 MOUND 迎 0.12m
    [B.swing_in, 0], [32.05, -0.85], [B.dump + 0.5, -0.85], [B.dig2_start - 0.3, -0.80], [B.lift2_top, -0.80], [B.swing_back + 0.4, 0.0], [45.6, -0.1], [46.2, 0.0],
  ]);
  const lean = t => lip(t) * Math.sin(t * 7.3) * 0.02 + win(t, B.dance_start, B.dance_end, 0.3, 0.3) * Math.sin((t - B.dance_start) * Math.PI * 4.4) * 0.04;
  const tilt = t => win(t, 7.2, 10.0, 0.4, 0.4) * 0.06 + win(t, B.praise_badge, B.dump - 0.1, 0.3, 0.3) * Math.sin(t * 8) * 0.05
    + win(t, 19.7, 21.0, 0.4, 0.5) * 0.07 + win(t, 38.3, 39.2, 0.3, 0.4) * 0.06 // r3: 倾听歪头(n1 19.6/n7 38.2)
    + win(t, 41.0, 41.85, 0.25, 0.3) * Math.sin(t * 9.5) * 0.05; // r3: 卸土(dump 40.6)后自豪抖擞

  // ---------------- 机械臂 ----------------
  const boomBase = t => kf(t, [
    [0, 0.1], [B.drive_start, 0.1], [B.arrive, 0.28], [B.settle, 0.22],
    // r2: 挥手峰值 0.88-0.92→0.80-0.84(近景削顶修复,配合 shot1 后拉)
    [B.wave_start, 0.25], [7.55, 0.80, ease.outBack], [7.95, 0.66], [8.3, 0.84, ease.outCubic], [8.65, 0.68], [9.0, 0.82], [B.wave_end, 0.2],
    // r3: 气球窗 13.05-14.45(balloon_rise 13.3)臂压低
    [13.05, 0.2], [13.75, 0.22], [14.45, 0.3],
    [16.0, 0.3], [16.6, 0.45], [17.5, 0.4],
    [17.75, 0.45], [17.95, 0.78, ease.outBack], [18.75, 0.55], [19.4, 0.35], // r3: 彩带(confetti 17.8)欢呼抬臂
    // r3: 跳舞(n2"拍拍手")臂低位小幅律动(左斜侧机位下不遮脸),表现力交给 bucket 开合+roll
    [B.dance_start, 0.26], [22.6, 0.30], [23.4, 0.28], [24.0, 0.30], [B.dance_end, 0.26],
    [B.raise_squat, 0.15], [B.raise_up, 0.92, ease.outBack], [B.raise_peak + 0.4, 0.9], [B.raise_hold_end, 0.55],
    [29.5, 0.5], [B.grab1, 0.42], [B.grab2, 0.46], [B.grab3, 0.42], [B.lower_arm, 0.3],
    [B.dig1_start, 0.15], [B.dig1_contact - 0.2, -0.28], [B.dig1_contact, -0.38, ease.inCubic], [B.dig1_end, -0.3],
    [B.lift1_curl, -0.1], [B.lift1_up, 0.55, ease.outCubic], [B.lift1_top, 0.72], [B.praise_badge, 0.7],
    [B.dump - 0.15, 0.62], [B.dump + 0.25, 0.5], [42.3, 0.35],
    [B.dig2_start, 0.1], [B.dig2_contact - 0.2, -0.28], [B.dig2_contact, -0.38, ease.inCubic], [B.lift2_curl - 0.1, -0.3],
    // r2: lift2 顶点 0.72→0.64(削头修复)
    [B.lift2_up, 0.5, ease.outCubic], [B.lift2_top, 0.64], [B.swing_back, 0.5],
    [B.final_wave, 0.75, ease.outBack], [46.9, 0.62], [47.2, 0.78], [B.wink, 0.72], [B.fade_start, 0.55], [timeline.total, 0.5],
  ]);
  // r2: 举高悬停期得意微晃 ±0.03(原 25.8-27.5 全身定格 1.7s)
  const boom = t => boomBase(t) + win(t, B.raise_peak + 0.3, B.raise_hold_end - 0.2, 0.35, 0.35) * Math.sin((t - B.raise_peak) * 3.0) * 0.03;
  const stick = t => kf(t, [
    [0, 0.3], [B.arrive, 0.45], [B.settle, 0.4],
    [B.wave_start, 0.5], [7.55, 1.05, ease.outBack], [B.wave_end, 0.45], // r2: 1.25→1.05
    [13.05, 0.5], [13.75, 0.5], [14.45, 0.55], // r3: 气球窗小臂压低
    [16.0, 0.55], [16.6, 0.6], [17.5, 0.55],
    [17.75, 0.62], [18.0, 0.85, ease.outBack], [19.05, 0.6], // r3: 彩带欢呼
    [B.dance_start, 0.46], [22.6, 0.5], [23.4, 0.48], [24.0, 0.5], [B.dance_end, 0.46], // r3: 拍手段小臂低位(不遮脸)
    [B.raise_squat, 0.4], [B.raise_up, 1.22, ease.outBack], [B.raise_hold_end, 0.8],
    [B.grab1, 0.75], [B.lower_arm, 0.6],
    [B.dig1_start, 0.45], [B.dig1_contact, 0.3, ease.inCubic], [B.dig1_end, 0.42],
    [B.lift1_curl, 0.6], [B.lift1_up, 1.05, ease.outCubic], [B.lift1_top, 1.15], [B.praise_badge, 1.1],
    [B.dump - 0.15, 1.0], [B.dump + 0.3, 0.85], [42.3, 0.6],
    [B.dig2_start, 0.45], [B.dig2_contact, 0.3, ease.inCubic], [B.lift2_curl - 0.1, 0.42],
    [B.lift2_up, 1.0, ease.outCubic], [B.lift2_top, 1.05], [B.swing_back, 0.7], // r2: 顶点 1.15→1.05
    [B.final_wave, 1.05, ease.outBack], [B.wink, 0.95], [B.fade_start, 0.8], [timeline.total, 0.7],
  ]);
  const bucket = t => kf(t, [
    [0, -0.3], [B.arrive, -0.4],
    [B.wave_start, -0.4], [7.55, -0.62, ease.outBack], [7.95, -0.45], [8.3, -0.62], [8.65, -0.48], [9.0, -0.6], [B.wave_end, -0.35],
    [13.65, -0.55], [14.35, -0.4],
    // r3: dance 改"拍手"(n2 新文案):铲斗开合 ×4 卡 boing 22.35/22.95/23.55/24.15,宝宝拍手挖挖"拍手"
    [B.dance_start, -0.4], [22.35, -0.72, ease.outCubic], [22.5, -0.42], [22.95, -0.72, ease.outCubic], [23.1, -0.42],
    [23.55, -0.72, ease.outCubic], [23.7, -0.42], [24.15, -0.72, ease.outCubic], [24.3, -0.42], [B.dance_end, -0.4],
    [B.raise_squat, -0.35], [B.raise_up, -0.5, ease.outBack], [B.raise_hold_end, -0.45],
    [B.grab1, -1.0, ease.outCubic], [B.grab1 + 0.25, -0.55], [B.grab2, -1.0, ease.outCubic], [B.grab2 + 0.25, -0.55], [B.grab3, -1.0, ease.outCubic], [B.grab3 + 0.3, -0.6], [B.lower_arm, -0.55],
    [B.dig1_start, -0.6], [B.dig1_contact, -1.15, ease.inCubic], [B.dig1_end, -1.25],
    [B.lift1_curl, -1.3], [B.lift1_up, -1.1], [B.lift1_top, -1.05], [B.praise_badge, -1.05],
    // r3: 翻斗 40.05→40.4 快翻(dump 40.6),与泥块流/payload/patter 同窗;峰值 1.05 rad(1.3 穿斗杆)
    [40.05, -1.05], [40.4, 1.05, ease.outCubic], [B.dump + 0.35, 0.9], [B.dump + 0.8, -0.3], [42.3, -0.5],
    [B.dig2_start, -0.6], [B.dig2_contact, -1.15, ease.inCubic], [B.lift2_curl - 0.05, -1.25],
    [B.lift2_up, -1.1], [B.lift2_top, -1.05], [B.swing_back + 0.2, 0.9, ease.outCubic], [B.swing_back + 0.7, -0.35],
    [B.final_wave, -0.55], [B.wink, -0.5], [B.fade_start, -0.4], [timeline.total, -0.35],
  ]);

  // ---------------- 表情 ----------------
  const face = t => {
    const happy = Math.max(win(t, 7.0, 10.2, 0.5, 0.5), win(t, 13.45, 15.05, 0.4, 0.4), win(t, B.dance_start - 0.5, B.raise_hold_end, 0.5, 0.5),
      win(t, 37.0, 38.4, 0.3, 0.4), win(t, B.praise_badge, B.dump + 0.5, 0.4, 0.4), win(t, B.final_wave - 0.3, timeline.total, 0.5, 0.8));
    const focused = Math.max(win(t, B.dig1_start, B.lift1_top, 0.4, 0.4), win(t, B.dig2_start, B.lift2_top, 0.4, 0.4));
    const mouthTalk = lip(t);
    const winkK = win(t, B.wink, B.wink + 0.75, 0.12, 0.3);
    return {
      smile: clamp01(0.7 + 0.3 * happy - 0.15 * focused),
      // r1: 高潮张嘴欢呼(举高顶点/徽章/入土用力/告别 wink 保持开口笑)
      mouthOpen: clamp01(Math.max(mouthTalk,
        // r2: 7.85-8.35 台词间隙不再恒张 0.45(原"下巴脱臼式发呆"),拆两段留呼吸
        win(t, 7.2, 7.9, 0.3, 0.25) * 0.45, win(t, 8.3, 9.9, 0.3, 0.5) * 0.45,
        win(t, B.dance_start, B.dance_end, 0.3, 0.3) * 0.3,
        win(t, B.raise_up - 0.1, B.raise_peak + 0.7, 0.25, 0.35) * 0.6,
        pulse(t, B.confetti, 0.8) * 0.65, // r2: 彩带大高潮欢呼(原仅 0.3 不到)
        pulse(t, B.praise_badge, 0.75) * 0.7,
        pulse(t, B.dig1_contact, 0.5) * 0.65, pulse(t, B.dig2_contact, 0.5) * 0.65, // r2: 0.5→0.65 用力感
        win(t, B.final_wave - 0.2, B.wink + 0.8, 0.3, 0.35) * 0.5,
        win(t, 19.8, 20.7, 0.3, 0.35) * 0.18, win(t, 38.3, 39.0, 0.2, 0.3) * 0.2)), // r3: 倾听微张嘴(n1 19.6/n7 38.2)
      // r2: 入土/彩带瞬间加宽嘴型,侧视也能读出用力/欢呼(3D 嘴腔侧轮廓弱的补偿)
      mouthWide: 0.3 + pulse(t, B.dig1_contact, 0.5) * 0.35 + pulse(t, B.dig2_contact, 0.5) * 0.35 + pulse(t, B.confetti, 0.7) * 0.2,
      // r1: blink 通道只放空闪;wink 只走 blinkR(此前 blink 混入 winkK,左眼经 ?? 回退 → 双眼全闭像睡着)
      blink: blinkIdle(t), blinkR: Math.max(blinkIdle(t), winkK),
      squintL: clamp01(0.40 * happy), squintR: clamp01(0.40 * happy), // r4: 0.55→0.40(r5a:眯眼过重显疲惫,保笑容睁大眼)
      brow: 0.35 + 0.35 * happy - 0.25 * focused
        + win(t, 19.7, 20.9, 0.3, 0.4) * 0.2 + win(t, 38.3, 39.1, 0.25, 0.35) * 0.25, // r3: 倾听挑眉(n1/n7)
      lookX: kf(t, [[13.15, 0], [13.4, -0.35], [14.25, 0], [B.dig1_start, 0], [B.dig1_contact - 0.1, -0.3], [B.lift1_top, -0.2], [B.dig1_end + 0.5, 0],
        [B.dig2_start, 0], [B.dig2_contact - 0.1, -0.3], [B.lift2_top, -0.2], [46.2, 0], [B.wink - 0.2, 0], [B.wink + 0.3, 0.25], [B.fade_start, 0]]),
      lookY: kf(t, [[4.9, 0], [5.25, 0.32], [6.55, 0.18], [7.0, 0], // r2: 停稳抬眸对视镜头
        [13.15, 0], [13.4, 0.55], [14.25, 0], // r3: 看气球(balloon_rise 13.3)
        [17.75, 0], [18.0, 0.5], [18.95, 0.3], [19.55, 0], // r3: 彩带(confetti 17.8)昂首望天
        [B.raise_up, 0], [B.raise_peak, 0.45], [B.raise_hold_end, 0],
        [B.dig1_start, 0], [B.dig1_contact - 0.1, -0.5], [B.lift1_curl, -0.3], [B.lift1_top, 0.35], [37.2, 0.28], [37.7, 0.05], // r3: 抬斗成功自豪看镜头(lift1_top 36.9)
        [B.dig2_start, 0], [B.dig2_contact - 0.1, -0.5], [B.lift2_top, 0.35], [46.2, 0]]),
      pupil: 0.15 * happy + pulse(t, B.raise_peak, 0.6) * 0.2 + pulse(t, B.praise_badge, 0.7) * 0.25,
      lamp: Math.max(pulse(t, B.confetti, 0.8), pulse(t, B.praise_badge, 0.7), pulse(t, B.raise_peak, 0.6),
        // r2: 双闪峰对齐 1.7s 点火与起步前(原峰 2.08/2.60 已在行驶中途,喜剧顿挫瓦解)
        pulse(t, B.engine_on - 0.2, 0.4), pulse(t, B.engine_on + 0.25, 0.35) * 0.8),
      // r3: hop/彩带冲击帽球惯性摆动(物理审查 seg1 建议 7:原大跳时帽子完全定格)
      hatX: moving(t) * Math.sin(t * 9) * 0.05 + pulse(t, B.dump, 0.5) * 0.3
        - pulse(t, 14.3, 0.4) * 0.18 + pulse(t, 14.55, 0.3) * 0.12 - pulse(t, B.confetti + 0.1, 0.4) * 0.15,
      hatZ: win(t, B.dance_start, B.dance_end, 0.3, 0.3) * Math.sin((t - B.dance_start) * Math.PI * 4.4) * 0.25,
    };
  };

  // ---------------- 挖土形变 ----------------
  // r3: 坑深 0.09→0.18/0.08→0.15(斗体入土 20cm 而坑仅 9cm,体积失衡,物理审查 seg2 建议 3)
  const craterD1 = t => kf(t, [[B.dig1_contact, 0], [B.dig1_end, 0.18, ease.outCubic], [timeline.total, 0.18]], ease.linear);
  const craterD2 = t => kf(t, [[B.dig2_contact, 0], [B.lift2_curl, 0.15, ease.outCubic], [timeline.total, 0.15]], ease.linear);
  // r3: payload 提前到入土卷斗阶段渐满(seg2 阻断 5);卸载随翻斗 90° 即倾泻(seg3 阻断 3:原倒扣 0.13s 反重力悬挂)
  const payload = t => kf(t, [
    [0, 0], [B.dig1_contact + 0.25, 0], [B.dig1_contact + 0.5, 0.55, ease.outCubic], [B.dig1_end, 1, ease.outCubic],
    [40.2, 1], [B.dump, 0.2, ease.inCubic], [B.dump + 0.12, 0],
    [B.dig2_contact + 0.25, 0], [B.dig2_contact + 0.5, 0.55, ease.outCubic], [B.lift2_curl, 1, ease.outCubic], [B.swing_back + 0.18, 1], [B.swing_back + 0.5, 0, ease.inCubic],
  ]);

  // ---------------- 卸土泥块(r1:FK 采样铲斗齿尖实际世界位,向下落;不再从堆顶向上喷发) ----------------
  const dumpClods = (td, t0, n) => {
    kk.setPose({
      x: posX(td), z: posZ(td), yaw: yaw(td), bob: bob(td), pitch: pitch(td), roll: roll(td),
      squash: squash(td), swing: swing(td), lean: lean(td), tilt: tilt(td),
      trackL: 0, trackR: 0, boom: boom(td), stick: stick(td), bucket: bucket(td), payload: 0,
    });
    const lip = kk.bucketTip(new THREE.Vector3());
    dumpLips.push({ t: t0, x: lip.x, z: lip.z }); // r3: 记录落点供堆积丘
    const sp = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + i * 0.9;
      sp.push({
        t: t0 + i * 0.016,
        p: lip.clone().add(new THREE.Vector3(Math.cos(a) * 0.07, 0.03, Math.sin(a) * 0.07)),
        v: new THREE.Vector3(Math.cos(a) * 0.45 * (0.4 + (i % 5) * 0.2), -0.7 - (i % 4) * 0.35, Math.sin(a) * 0.45 * (0.4 + (i % 5) * 0.2)),
        r: 0.016 + (i % 4) * 0.008,
      });
    }
    fx.addClods(sp, groundFn);
  };
  // ---------------- 卸土堆积丘(seg3 阻断 3/4:落土必须成堆,质量守恒;负 depth crater = 隆起) ----------------
  const dumpLips = [];
  // ---------------- 挖掘泥块/尘雾(r2:FK 采样入土瞬间斗齿实际世界位,向上向外抛;不再锚定堆顶) ----------------
  const digBurst = (td, t0, n) => {
    kk.setPose({
      x: posX(td), z: posZ(td), yaw: yaw(td), bob: bob(td), pitch: pitch(td), roll: roll(td),
      squash: squash(td), swing: swing(td), lean: lean(td), tilt: tilt(td),
      trackL: 0, trackR: 0, boom: boom(td), stick: stick(td), bucket: bucket(td), payload: 0,
    });
    const tip = kk.bucketTip(new THREE.Vector3());
    // r3: 粒子从斗齿两侧土面挤出(物理审查 seg2 阻断 6:原 +0.22 虚空生成+朝天喷射 3.55m/s);
    //     spawn 贴地形面,v 切向为主(0.7-1.3 m/s)、vy 0.25-0.7,受压坡面贴地飞溅
    const sp = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + i * 0.7;
      const px = tip.x + Math.cos(a) * 0.15, pz = tip.z + Math.sin(a) * 0.15;
      sp.push({
        t: t0 + i * 0.012,
        p: new THREE.Vector3(px, groundFn(px, pz) + 0.02, pz),
        v: new THREE.Vector3(Math.cos(a) * (0.7 + (i % 5) * 0.15), 0.25 + (i % 4) * 0.15, Math.sin(a) * (0.7 + (i % 5) * 0.15)),
        r: 0.018 + (i % 4) * 0.008,
      });
    }
    fx.addClods(sp, groundFn);
    fx.addPuff(t0, new THREE.Vector3(tip.x, groundFn(tip.x, tip.z) + 0.10, tip.z), { n: 14, spread: 0.35, up: 0.2, size: 0.3 });
  };
  digBurst(B.dig1_contact, B.dig1_contact, 14);
  digBurst(B.dig2_contact, B.dig2_contact, 14);
  dumpClods(B.dump - 0.02, B.dump - 0.08, 18); // r2: 随快翻提前,39.37 起落土流
  dumpClods(B.swing_back + 0.3, B.swing_back + 0.2, 10);

  // r3: 彩纸/举高闪光 FK 铲斗锚定(seg1 阻断 5/seg2 建议 4:原固定坐标凭空喷发/偏 0.92m)
  const fkPose = td => ({ x: posX(td), z: posZ(td), yaw: yaw(td), bob: bob(td), pitch: pitch(td), roll: roll(td),
    squash: squash(td), swing: swing(td), lean: lean(td), tilt: tilt(td),
    trackL: 0, trackR: 0, boom: boom(td), stick: stick(td), bucket: bucket(td), payload: 0 });
  kk.setPose(fkPose(B.confetti + 0.05));
  const confettiSrc = kk.bucketCenter(new THREE.Vector3());
  fx.addConfetti(B.confetti, confettiSrc, new THREE.Vector3(0.3, 1, 0.35), 260, { speed: 6.5, cone: 0.85, ground: groundFn, wind: WIND });
  kk.setPose(fkPose(B.raise_peak));
  fx.addSparkles(B.raise_peak, kk.bucketTip(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0)), { n: 14, radius: 0.4 });
  kk.setPose({}); // 复位,首帧 renderFrame 会重新 apply

  // ---------------- 运镜 ----------------
  const SHOTS = [
    // r3: 开场机位压低至儿童视平线(布鲁伊贴地原则:cam y 2.3→1.5 缓降 0.85,不再高空俯瞰)
    { t0: 0, t1: 7.0, fov: 36, ap: 3.2, cam: [[0, [4.9, 1.5, 5.4]], [2.8, [3.6, 1.0, 4.6]], [7.0, [2.5, 0.85, 4.05]]], look: [[0, [1.2, 0.62, 0]], [2.8, [0.5, 0.58, 0.15]], [7.0, [0.1, 0.58, 0.15]]] },
    // r3: cam y 0.75→0.68 贴视平线
    { t0: 7.0, t1: 10.2, fov: 33, ap: 4.5, cam: [[7.0, [0.6, 0.68, 3.15]]], look: [[7.0, [0, 0.70, 0.15]]] },
    // r3: 10.2 切镜夹角 18.6°→~39°(物理审查建议 9);look 左摇目标对齐气球束(balloon_rise 13.3)
    { t0: 10.2, t1: 15.0, fov: 38, ap: 4.5, cam: [[10.2, [2.4, 0.85, 2.1]], [15.0, [2.1, 0.75, 1.85]]], look: [[10.2, [0, 0.6, 0.1]], [13.15, [0, 0.62, 0.1]], [13.5, [-1.35, 0.95, -0.5]], [14.3, [-1.35, 0.95, -0.5]], [15.0, [0, 0.62, 0.1]]] },
    // r3: 中全景(cut_d 15.0)
    { t0: 15.0, t1: 19.2, fov: 35, ap: 3.8, cam: [[15.0, [0.3, 0.9, 3.5]]], look: [[15.0, [0, 0.7, 0]]] },
    // r3: 19.2 切镜 → 左斜侧机位 ~35°;cam y 0.75→0.68 贴视平线
    { t0: 19.2, t1: 24.9, fov: 33, ap: 5.0, sway: 0.02, cam: [[19.2, [-0.95, 0.68, 2.85]]], look: [[19.2, [0, 0.70, 0.15]]] },
    // r3: 24.9 切镜 25.6°→~57°;举高顶点削顶标定沿用(距 look 3.97m≈原 4.03m)
    { t0: 24.9, t1: 32.1, fov: 37, ap: 4.5, cam: [[24.9, [2.6, 0.85, 3.2]], [26.1, [2.45, 0.88, 3.1]], [32.1, [2.5, 0.9, 3.2]]], look: [[24.9, [0, 1.1, 0.2]], [32.1, [0, 1.0, 0.2]]] },
    // r4: 镜像到 -x 脸侧(B 通道:+x 侧时 swing -0.85 挖掘脸背对镜头);脸+铲斗+土堆同框,与 shot7 夹角 ~45°
    { t0: 32.1, t1: 42.3, fov: 36, ap: 4.5, cam: [[32.1, [-3.1, 0.8, 1.5]], [37.2, [-2.95, 0.85, 1.35]], [42.3, [-3.0, 0.9, 1.45]]], look: [[32.1, [-0.5, 0.5, 0.35]], [42.3, [-0.5, 0.55, 0.35]]] },
    // r3: 机身前左低角度近景(cut_g 42.3,与 shot6 夹角 ~90°);dig2 迎面;look y 0.60 衔接 shot6
    { t0: 42.3, t1: 45.9, fov: 36, ap: 5.0, cam: [[42.3, [-1.7, 0.7, 3.2]]], look: [[42.3, [-0.55, 0.60, 0.3]]] },
    // r3: 告别长镜(cut_h 45.9 → 49.1);cam y 0.9→0.8 贴视平线
    { t0: 45.9, t1: 49.1, fov: 37, ap: 6.0, cam: [[45.9, [0.45, 0.8, 3.0]], [49.1, [0.4, 0.78, 2.9]]], look: [[45.9, [0, 0.82, 0.3]]] },
  ];
  const shotAt = t => SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const _faceW = new THREE.Vector3();

  function apply(t, { sunJitter } = {}) {
    // 世界/特效
    world.update(t, { sunJitter });
    fx.update(t);
    world.mound.setCraters([
      // r2: 坑口对齐 FK 实测斗齿落点(-0.42,0.42)/(-0.41,0.45)
      { x: MOUND.x + 0.28, z: MOUND.z - 0.08, r: 0.2, depth: craterD1(t) },
      { x: MOUND.x + 0.29, z: MOUND.z - 0.05, r: 0.18, depth: craterD2(t) },
      // r3: 两次卸土的堆积丘(FK 落唇点,负 depth=隆起;落土 0.35s 后渐起,质量守恒)
      ...dumpLips.map(p => ({ x: p.x, z: p.z, r: 0.22, depth: -0.09 * clamp01((t - (p.t + 0.35)) / 0.9) })),
    ]);
    // 开开(r3: 履带行程查积分表+swing 回转差动/dance 交替蠕动/21.6 点踏,物理审查 seg2 建议 1/seg1 建议 1)
    const swA = 0.02 * clampA(swingAcc(t));
    const creep = win(t, B.dance_start, B.dance_end, 0.3, 0.3) * Math.sin((t - B.dance_start) * Math.PI * 2.2) * 0.03;
    kk.setPose({
      x: posX(t), z: posZ(t), yaw: yaw(t),
      bob: bob(t), pitch: pitch(t), roll: roll(t), squash: squash(t), swing: swing(t), lean: lean(t), tilt: tilt(t),
      trackL: travelL(t) + swA + creep + pulse(t, 21.95, 0.2) * 0.05, // r3: 舞前点踏 21.95/22.1
      trackR: travelR(t) - swA - creep + pulse(t, 22.1, 0.2) * 0.05,
      boom: boom(t), stick: stick(t), bucket: bucket(t), payload: payload(t),
      ...face(t),
    });
    // 相机
    const s = shotAt(t);
    const cp = kfv(t, s.cam), lp = kfv(t, s.look);
    if (s.sway) {
      cp[0] += Math.sin(t * 1.7) * s.sway; cp[1] += Math.sin(t * 2.3 + 2) * s.sway * 0.6;
    }
    camera.fov = s.fov;
    camera.position.set(cp[0], cp[1], cp[2]);
    camera.lookAt(lp[0], lp[1], lp[2]);
    camera.updateProjectionMatrix();
    // 动态对焦:锁脸部;r3: 入场前(t<1.6)焦点锁视线中心 5.5m,1.6-2.4 平滑过渡到脸
    //     (原 0-1.9s 焦点盲目锁画外 8m 外脸部 → 开场前景礼物/气球非自然虚化,物理审查建议 8)
    kk.faceAnchor(_faceW);
    const focusK = clamp01((t - 1.6) / 0.8);
    const focus = 5.5 * (1 - focusK) + camera.position.distanceTo(_faceW) * focusK;
    return {
      post: {
        focus, aperture: s.ap, maxR: 28, exposure: 1.6, bloom: 0.3, // r4: 1.85→1.6(B 通道:大面积死白过曝)
        // r1: 0-0.8s 从暖白淡入(开场不再死黑呆立),结尾淡出不变
        fade: kf(t, [[0, 1], [0.8, 0, ease.outCubic], [B.fade_start, 0, ease.linear], [timeline.total, 1, ease.linear]], ease.linear),
      },
      shot: s, t,
    };
  }
  return { apply };
}
