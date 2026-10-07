// demo3.js — v7 融合+绑定路线:AI 毛绒精灵的关节级动画(挥臂打招呼 + 挖土)
'use strict';

const DEMO3_TOTAL = 8.0;
const A3 = { bg: null, rig: null };

// T-pose 精灵 3640×2048 的绑定数据。原则:外轮廓交给绿幕 alpha(多边形全部走绿区,
// 只圈属权不描边);关节处大小臂用"同圆心同半径圆弧切口",旋转时切口始终重合
// 并藏在独立的肘关节盖(knob)下面。
const E = [1495, 565], S = [1450, 1085]; // 肘/肩轴心(经原图裁切核对)
const BOOM_POLY = [
  [1260, 710], [1340, 600], ...arcPts(E[0], E[1], 55, 159, 27.3, 12), [1630, 640],
  [1630, 1000], ...arcPts(S[0], S[1], 80, -24, 209.5, 16), [1300, 1000],
];
const STICK_STRIP = [ // 小臂直段(垂直于臂向收边,底部以圆弧闭合在肘轴心)
  [1426, 623], [1078, 214], [1246, 78], [1601, 491],
  ...arcPts(E[0], E[1], 50, -35, 140, 12),
];
const STICK_BLOB = [ // 铲斗+连杆组(粗圈,全在绿区内)
  [860, 20], [1300, 20], [1370, 120], [1320, 240], [1260, 420], [1150, 580],
  [1000, 650], [760, 670], [590, 620], [520, 450], [520, 150], [640, 40],
];
const KNOB_POLY = arcPts(E[0], E[1], 62, 0, 360, 24);   // 肘关节盖(最后画,盖住切口)
const KK_DEF = {
  order: ['boom', 'stick', 'knob'],
  parts: {
    body: { erase: [BOOM_POLY, STICK_STRIP, STICK_BLOB, KNOB_POLY] },
    boom: { poly: BOOM_POLY, pivot: S, tip: E },
    stick: { polys: [STICK_STRIP, STICK_BLOB], pivot: E, tip: [640, 560] },
    knob: { poly: KNOB_POLY, pivot: E, tip: E, attach: 'boom' },
  },
};
const KK_BOX = [1240, 280, 2690, 1987]; // 身体包围盒(不含举起的臂):锚定脚底中点

const CUES3 = [
  { t0: 0.5, t1: 2.75, text: '大家好!我是开开挖掘机!' },
  { t0: 1.2, t1: 8.0, text: '小开开,挥挥小手,和挖掘机打个招呼吧!', kind: 'banner' },
  { t0: 2.75, t1: 5.7, text: '今天是2026年10月18日,' },
  { t0: 5.7, t1: 7.9, text: '是小开开的两岁生日!' },
];

const _cf3 = makeConfetti(77, 50, { spread: 1.6 });

function drawFrameDemo3(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const cam = camFrom(t, [
    [0, W * 0.56, H * 0.52, 1.02],
    [8, W * 0.49, H * 0.54, 1.13],
  ]);
  drawCover(ctx, A3.bg, cam.z, -(cam.x - W / 2) * cam.z * 0.9, -(cam.y - H / 2) * cam.z * 0.9);

  // 驶入 → 落地 → 挥手(2.6-4.4) → 挖土两下(4.8-7.6)
  const d = _driveKf(t, 0.3, 2.0, -820, W * 0.44);
  const landT = 2.3;
  let sq = 0, dy = 0, rot = 0, aBoom = 0, aStick = 0;
  if (d.moving) { rot = Math.sin(t * 9) * 0.018; dy = -Math.abs(Math.sin(t * 7)) * 10; aBoom = 0.15; aStick = 0.2; }
  if (d.landed) {
    sq = 1 - landSquash(t, landT);
    dy = Math.sin(t * 1.25) * 3;
    rot = Math.sin(t * 2.2) * 0.012;
    if (t < 4.4) {           // 挥手
      const w2 = Math.sin((t - 2.6) * 5.2);
      aBoom = w2 * 0.13; aStick = Math.sin((t - 2.6) * 5.2 + 0.9) * 0.17;
    } else {                 // 挖土循环(1.4s 一次)
      const cyc = (t - 4.4) % 1.5;
      const dig = kf(cyc, [[0, 0], [0.45, 1], [1.0, 0.12], [1.5, 0]], easeOut);
      aBoom = -1.0 * dig; aStick = 1.3 * dig;
      rot = -0.03 * dig; dy += dig * 12;
      if (dig > 0.9) drawDirtPuffs(ctx, 0.06, d.x - 330, H * 0.87, 9, Math.floor(t * 2) + 5);
    }
  }
  const h = H * 0.64;
  contactShadow(ctx, d.x, H * 0.852, h * 0.5 * (1 + sq * 0.4), 0.3);
  drawRig(ctx, A3.rig, KK_BOX, d.x, H * 0.85 + dy, h, {
    rot, sq, angles: { boom: aBoom, stick: aStick },
    filter: 'saturate(1.07) sepia(0.10)',
  });

  drawConfetti(ctx, _cf3, Math.max(0, t - 2.35), 0.9);
  sfxText(ctx, '轰隆隆~', W * 0.3, H * 0.26, t, 0.8, { size: 78, color: '#ffa94d' });
  if (d.landed && t < 4.4) emote(ctx, '♥', d.x + 300, H * 0.38, t, landT + 1.2, { color: '#ff6b8a', size: 96 });
  warmWash(ctx, 0.04); vignette(ctx, 0.18);
  drawCaptions(ctx, t, CUES3);
}
