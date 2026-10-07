// demo2.js — v7 融合路线 Demo:banana 风 AI 背景板 + AI 毛绒精灵(绿幕键控) + 引擎动效
'use strict';

const DEMO2_TOTAL = 8.0;
const A2 = {};

const CUES2 = [
  { t0: 0.5, t1: 2.75, text: '大家好!我是开开挖掘机!' },
  { t0: 1.2, t1: 8.0, text: '小开开,挥挥小手,和挖掘机打个招呼吧!', kind: 'banner' },
  { t0: 2.75, t1: 5.7, text: '今天是2026年10月18日,' },
  { t0: 5.7, t1: 7.9, text: '是小开开的两岁生日!' },
];

const _cf2 = makeConfetti(77, 50, { spread: 1.6 });

function drawFrameDemo2(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const cam = camFrom(t, [
    [0, W * 0.54, H * 0.52, 1.03],
    [3, W * 0.50, H * 0.52, 1.08],
    [8, W * 0.47, H * 0.54, 1.14],
  ]);
  // AI 背景板(摄像机跟随,轻微视差)
  drawCover(ctx, A2.bg, cam.z, -(cam.x - W / 2) * cam.z * 0.9, -(cam.y - H / 2) * cam.z * 0.9);

  // 开开精灵:驶入 → 落地回弹 → 呼吸待机 → 开心跳
  const d = _driveKf(t, 0.3, 2.0, -760, W * 0.44);
  const landT = 2.3;
  let sq = 0, dy = 0, rot = 0;
  if (d.moving) { rot = Math.sin(t * 9) * 0.018; dy = -Math.abs(Math.sin(t * 7)) * 10; }
  if (d.landed) {
    const l = landSquash(t, landT); sq = 1 - l;
    dy = Math.sin(t * 1.25) * 3.5; // 呼吸
    const hop = kf(t, [[4.4, 0], [4.7, 1], [5.15, 0]], easeOut); // 开心跳一下
    dy -= hop * 46;
    if (t > 5.15 && t < 5.6) sq = 1 - landSquash(t, 5.15);
    rot = Math.sin(t * 2.2) * 0.012;
  }
  const h = H * 0.62;
  // 接触阴影(跟随压扁/跳跃)
  const airK = clamp01(-dy / 60);
  contactShadow(ctx, d.x, H * 0.845, h * 0.52 * (1 + sq * 0.4) * (1 - airK * 0.25), 0.3 * (1 - airK * 0.5));
  ctx.save();
  if (d.moving || true) ctx.filter = 'saturate(1.07) sepia(0.10)'; // 与黄昏底色调和
  drawSprite(ctx, A2.kaikai, d.x, H * 0.84 + dy, h, { rot, sx: 1 + sq * 0.3, sy: 1 - sq * 0.28 });
  ctx.restore();

  drawConfetti(ctx, _cf2, Math.max(0, t - 2.35), 0.9);
  sfxText(ctx, '轰隆隆~', W * 0.3, H * 0.26, t, 0.8, { size: 78, color: '#ffa94d' });
  if (d.landed) emote(ctx, '♥', d.x + 300, H * 0.4, t, landT + 1.2, { color: '#ff6b8a', size: 96 });
  warmWash(ctx, 0.04); vignette(ctx, 0.18);
  drawCaptions(ctx, t, CUES2);
}
