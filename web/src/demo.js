// demo.js — v7 质感 Demo:s01 开场 + s02 开开登场(对应原片 0-30s)
'use strict';

const DEMO_TOTAL = 30.4;
const _cfA = makeConfetti(101, 30, { spread: 13 });
const _cfB = makeConfetti(202, 34, { spread: 15 });
const CUES = [
  { t0: 0.5,  t1: 2.55, text: '哈喽,各位小朋友!' },
  { t0: 2.55, t1: 6.0,  text: '今天有一件超级开心的大事要发生!' },
  { t0: 6.0,  t1: 8.45, text: '我们最可爱的小宝贝——' },
  { t0: 8.45, t1: 11.95, text: '黄山遥,小名叫开开,今天两岁啦!' },
  { t0: 14.5, t1: 16.75, text: '大家好!我是开开挖掘机!' },
  { t0: 15.2, t1: 29.6, text: '小开开,挥挥小手,和挖掘机打个招呼吧!', kind: 'banner' },
  { t0: 16.75, t1: 19.7, text: '今天是2026年10月18日,' },
  { t0: 19.7, t1: 21.6, text: '是小开开的两岁生日!' },
  { t0: 21.6, t1: 24.95, text: '我要举办一场超级热闹的生日派对!' },
];

// ---------- 场景A:开场全景(0-14s) ----------
function drawSceneA(ctx, t) {
  const cam = camFrom(t, [
    [0, W * 0.53, H * 0.53, 0.99],
    [14, W * 0.50, H * 0.50, 1.08],
  ]);
  const signPop = t < 0.8 ? 0 : backOut(clamp01((t - 0.8) / 0.6));
  partySceneV7(ctx, t, cam, {
    sign: null,
    world: (c2, tt) => {
      // 招牌弹入 + 余摆
      c2.save();
      c2.translate(W * 0.5, H * 0.1 + 75);
      c2.scale(Math.max(0.001, signPop), Math.max(0.001, signPop));
      c2.rotate(Math.sin((tt - 0.8) * 3.2) * 0.06 * Math.exp(-Math.max(0, tt - 0.8) * 1.6));
      c2.translate(-W * 0.5, -(H * 0.1 + 75));
      woodSign(c2, W * 0.5, H * 0.1, 560, ['黄山遥,2 岁啦!'], tt);
      c2.restore();
    },
  });
  drawConfetti(ctx, _cfA, t, 0.75);
}

// ---------- 场景B:开开登场(14-30s) ----------
function drawSceneB(ctx, t) {
  const cam = camFrom(t, [
    [14, W * 0.52, H * 0.52, 1.04],
    [21, W * 0.47, H * 0.55, 1.11],
    [30.4, W * 0.45, H * 0.56, 1.17],
  ]);
  const d = _driveKf(t, 14.5, 2.3, -680, W * 0.42);
  const u = 58, rPx = 1.05 * u;
  const wheel = (d.x + 680) / rPx;
  const landT = 14.5 + 2.3;
  const landed = d.landed ? landSquash(t, landT) : 1;
  const idle = d.landed ? Math.sin(t * 1.25) * 0.05 : 0; // 待机呼吸(永不静止)

  partySceneV7(ctx, t, cam, {
    world: (c2, tt) => {
      // 接触阴影(宽度随车,落地时随压扁变宽)
      contactShadow(c2, d.x + 10, H * 0.868, 9 * u * 0.62, 0.24, 1 - landed);
      kaikai(c2, d.x, H * 0.86, u, {
        wheel, drive: d.moving ? 1 : 0,
        sq: 1 - landed,
        dy: idle,
        eyes: d.landed && !_blink(tt) ? 'happy' : (_blink(tt) ? 'closed' : 'normal'),
        mouth: 'open',
        aBoom: d.landed ? 48 + wave(tt, 1.6) * 14 : 20,
        aStick: d.landed ? -60 + wave(tt, 1.6) * 10 : -40,
        aBucket: 20,
      });
      if (d.moving) drawDirtPuffs(c2, tt, d.x - 210, H * 0.87, 0.32, 21);
    },
  });
  drawConfetti(ctx, _cfB, Math.max(0, t - 14), 0.85);
  sfxText(ctx, '轰隆隆~', W * 0.3, H * 0.26, t, 14.9, { size: 78, color: '#ffa94d' });
  if (d.landed) emote(ctx, '♥', d.x + 260, H * 0.42, t, landT + 1.2, { color: '#ff6b8a', size: 96 });
}

// ---------- 总调度(含转场与字幕) ----------
const WIPE_T0 = 14, WIPE_DUR = 0.8;
function drawFrameDemo(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (t < WIPE_T0) {
    drawSceneA(ctx, t);
    if (t < 0.5) { ctx.fillStyle = `rgba(0,0,0,${1 - t / 0.5})`; ctx.fillRect(0, 0, W, H); }
  } else if (t < WIPE_T0 + WIPE_DUR) {
    drawSceneA(ctx, t); // 转场期间 A 保持(冻结在推进终点)
    irisWipe(ctx, (t - WIPE_T0) / WIPE_DUR, () => drawSceneB(ctx, t), W * 0.42, H * 0.5);
  } else {
    drawSceneB(ctx, t);
  }
  drawCaptions(ctx, t, CUES);
}
