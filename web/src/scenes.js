// scenes.js — v5:全手绘角色级动画(无任何位图;角色/场景全代码绘制)
'use strict';

const A = {};  // v5 无位图依赖
function loadAll() { return Promise.resolve(); }

function fadeEdges(ctx, p, dur, f = 0.45) {
  const a = Math.min(p * dur / f, (1 - p) * dur / f, 1);
  if (a < 1) { ctx.save(); ctx.globalAlpha = 1 - a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
const blink = (t, ph = 0) => ((t + ph) % 3.6) < 0.12;
// 驶入:x 从 off 到 home,wheel 按路程转
function driveKf(t, t0, dur, off, home) {
  const x = kf(t, [[0, off], [t0, off], [t0 + dur, home]], easeOut);
  return { x, moving: t > t0 && t < t0 + dur, landed: t >= t0 + dur, lt: t - t0 - dur };
}

const SCENES = {
  // 开场:梦幻乐园 + 招牌
  s01: { init() { this.cf = makeConfetti(101, 26, { spread: 12 }); },
    draw(ctx, p, t) {
      ctx.save();
      const z = 1 + .06 * p;
      ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      partyScene(ctx, t, { sign: ['黄山遥,2 岁啦!'], dirt: false });
      ctx.restore();
      drawConfetti(ctx, this.cf, t, .8);
    } },

  // 开开登场:驶入 + 挥手
  s02: { init() { this.cf = makeConfetti(202, 40, { spread: 13 }); },
    draw(ctx, p, t) {
      partyScene(ctx, t, {});
      const d = driveKf(t, 0.4, 2.2, -620, W * .42);
      const u = 56, rPx = 1.05 * u;
      const wheel = (d.x + 620) / rPx;
      const landed = d.landed ? landSquash(t, 0.4 + 2.2) : 1;
      kaikai(ctx, d.x, H * .86, u, {
        wheel, drive: d.moving ? 1 : 0, sq: 1 - landed,
        eyes: blink(t) ? 'closed' : 'normal', mouth: 'open',
        aBoom: d.landed ? 48 + wave(t, 1.6) * 14 : 20,
        aStick: d.landed ? -60 + wave(t, 1.6) * 10 : -40,
        aBucket: 20,
      });
      if (d.moving) drawDirtPuffs(ctx, t, d.x - 200, H * .87, .32, 21);
      sfxText(ctx, '轰隆隆~', W * .3, H * .24, t, .7, { size: 74, color: '#ffa94d' });
      if (d.landed) emote(ctx, '♥', d.x + 250, H * .42, t, 3.4, { color: '#ff6b8a', size: 96 });
      drawConfetti(ctx, this.cf, t, .9);
    } },

  // 举挖斗教学(带动作虚影)
  s03: { init() {},
    draw(ctx, p, t) {
      partyScene(ctx, t, {});
      const x = W * .44, y = H * .86, u = 58;
      // 虚影:目标姿态(举高高)半透明
      ctx.save(); ctx.globalAlpha = .2;
      kaikai(ctx, x, y - 120, u, { aBoom: 78, aStick: -30, aBucket: 10, eyes: 'happy' });
      ctx.restore();
      // 1.9s 一循环
      const cyc = t % 1.9;
      const lift = kf(cyc, [[0, 0], [0.55, -1], [1.1, -1], [1.65, 0], [1.9, 0]], easeOut); // -1=举起
      const dy = lift * 60;
      kaikai(ctx, x, y + dy, u, {
        aBoom: 25 + (-lift) * 55, aStick: -60 + lift * 35, aBucket: 30 - lift * 15,
        eyes: lift < -0.9 ? 'happy' : (blink(t) ? 'closed' : 'normal'), mouth: lift < -0.5 ? 'open' : 'smile',
        sq: cyc > 1.62 ? 1 - landSquash(cyc, 1.62) : 0,
      });
      if (cyc > 1.62 && cyc < 1.75) drawDirtPuffs(ctx, .05, x, y + 4, 9, 7);
      emote(ctx, '↑', x + 300, H * .3, t, .4, { color: '#6bcb77', size: 110, life: 1.0 });
      emote(ctx, '↑', x + 300, H * .3, t, 2.3, { color: '#6bcb77', size: 110, life: 1.0 });
    } },

  // 挖土互动 + 宝宝小手
  s04: { init() {},
    draw(ctx, p, t) {
      partyScene(ctx, t, {});
      const x = W * .34, y = H * .87, u = 60;
      const cyc = t % 1.7;
      const dig = kf(cyc, [[0, 0], [0.32, 1], [0.95, .15], [1.7, 0]], easeOut); // 1=挖下
      kaikai(ctx, x, y + dig * 8, u, {
        aBoom: 52 - dig * 34, aStick: -48 - dig * 38, aBucket: 18 + dig * 42,
        rot: -dig * .03, eyes: dig > .8 ? 'happy' : (blink(t, 1.1) ? 'closed' : 'normal'), mouth: 'smile',
      });
      if (dig > .92) drawDirtPuffs(ctx, .05, x - 430, y - 60, 9, Math.floor(t / 1.7) + 5);
      // 宝宝小手(右侧,跟着开合)
      babyHand(ctx, W * .78, H * .55 + wave(t, .7) * 14, 66, { t, open: .3 + .7 * Math.abs(wave(t, .55)) });
      babyHand(ctx, W * .9, H * .62 + wave(t, .7 + 1) * 12, 56, { t: t + .5, flip: true, open: .3 + .7 * Math.abs(wave(t, .55 + .4)) });
      sfxText(ctx, '哒哒', W * .3, H * .26, t, 1.1, { size: 80, color: '#4d96ff', life: .9 });
      sfxText(ctx, '哒哒', W * .3, H * .26, t, 2.8, { size: 80, color: '#4d96ff', life: .9 });
    } },

  // 小队登场一:翻斗车+吊车驶入
  s05: { init() { this.cf = makeConfetti(505, 44, { spread: 11 }); },
    draw(ctx, p, t) {
      partyScene(ctx, t, {});
      const d1 = driveKf(t, 0.2, 1.8, -560, W * .3);
      const d2 = driveKf(t, 1.2, 1.8, W + 560, W * .68);
      kaikai(ctx, W * .5, H * .87, 40, { dy: -bounce(t, 1.4) * 14 / 40, eyes: 'happy', mouth: 'open', aBoom: 58, aStick: -40, aBucket: 14 });
      dumpTruck(ctx, d1.x, H * .88, 46, { wheel: (d1.x + 560) / (1.05 * 46), drive: d1.moving ? 1 : 0, hat: true, sq: d1.landed ? 1 - landSquash(t, 2.0) : 0 });
      craneTruck(ctx, d2.x, H * .88, 46, { flip: true, wheel: (d2.x - W - 560) / (1.05 * 46), drive: d2.moving ? 1 : 0, hat: true, t, boom: 62, sq: d2.landed ? 1 - landSquash(t, 3.0) : 0 });
      sfxText(ctx, '咚!', W * .28, H * .3, t, 2.2, { size: 88, color: '#ff6b5e', life: .9 });
      sfxText(ctx, '咚!', W * .7, H * .3, t, 3.2, { size: 88, color: '#ffc94d', life: .9 });
      drawConfetti(ctx, this.cf, t);
    } },

  // 小队登场二:搅拌车+推土机 + 布鲁伊举气球蹦跳
  s06: { init() { this.cf = makeConfetti(606, 44, { spread: 11 }); },
    draw(ctx, p, t) {
      partyScene(ctx, t, {});
      const d1 = driveKf(t, 0.2, 1.8, -620, W * .3);
      const d2 = driveKf(t, 1.2, 1.8, W + 620, W * .62);
      mixerTruck(ctx, d1.x, H * .88, 46, { wheel: (d1.x + 620) / (1.05 * 46), drive: d1.moving ? 1 : 0, hat: true, drum: t * 2.4, sq: d1.landed ? 1 - landSquash(t, 2.0) : 0 });
      bulldozer(ctx, d2.x, H * .89, 44, { flip: true, wheel: (d2.x - W - 620) / (.85 * 44), hat: true, sq: d2.landed ? 1 - landSquash(t, 3.0) : 0 });
      const hop = bounce(t, 1.3);
      puppy(ctx, W * .82, H * .82 - hop * 20, 40, { t, aL: .9, aR: .9, sy: 1 - .06 * hop, eyes: blink(t, .7) ? 'closed' : 'normal' });
      emote(ctx, '♪', W * .82 + 120, H * .5, t, 2.6, { color: '#ffd93d', size: 84 });
      drawConfetti(ctx, this.cf, t);
    } },

  // 布置派对:吊车挂彩旗,翻斗车运气球
  s07: { init() { this.cf = makeConfetti(707, 40, { spread: 11 }); },
    draw(ctx, p, t) {
      partyScene(ctx, t, { sign: null });
      // 吊车举臂(钩子在顶上"挂"彩旗)
      craneTruck(ctx, W * .24, H * .88, 48, { t, boom: 78 + wave(t, .8) * 4, hookDrop: 30 + wave(t, .5) * 16, hat: true, eyes: blink(t, .3) ? 'closed' : 'normal' });
      // 翻斗车车斗里一簇气球
      dumpTruck(ctx, W * .68, H * .88, 48, { flip: true, hat: true, eyes: blink(t, 1.6) ? 'closed' : 'normal' });
      for (let i = 0; i < 4; i++) balloon(ctx, W * .68 - 40 + i * 28, H * .58 - (i % 2) * 26, ['#ff6b6b', '#ffd93d', '#4d96ff', '#6bcb77'][i], t, i);
      emote(ctx, '✦', W * .24 + 60, H * .3, t, 3.0, { size: 84 });
      drawConfetti(ctx, this.cf, t);
    } },

  // 蛋糕登场(黄昏):蛋糕弹出 + 全员兴奋
  s08: { init() { this.sp = makeSparkles(808, 20); },
    draw(ctx, p, t) {
      partyScene(ctx, t, { kind: 'dusk', sign: ['黄山遥', '2 岁生日快乐'] });
      // 桌子
      ctx.fillStyle = '#fff0f5'; ctx.beginPath(); ctx.roundRect(W * .5 - 300, H * .68, 600, 26, 12); ctx.fill();
      ctx.fillStyle = '#ffd6e6'; ctx.beginPath(); ctx.roundRect(W * .5 - 320, H * .68 + 24, 640, 90, 14); ctx.fill();
      const pop = backOut(clamp01((t - .6) / .8));
      ctx.save(); ctx.translate(W * .5, H * .68); ctx.scale(pop, pop); ctx.translate(-W * .5, -H * .68);
      cake(ctx, W * .5, H * .68, 52, { t });
      ctx.restore();
      kaikai(ctx, W * .22, H * .86, 46, { eyes: 'spark', mouth: 'open', aBoom: 60, aStick: -40, dy: -bounce(t, 1.5) * 10 / 46 });
      puppy(ctx, W * .82, H * .84, 40, { t, eyes: 'happy', aL: .9, aR: .9, dy: -bounce(t, 1.5) * 16 / 40 });
      emote(ctx, '哇', W * .5, H * .3, t, .9, { size: 100, color: '#ff9ff3' });
      drawSparkles(ctx, this.sp, t);
    } },

  // 许愿坑(黄昏):挖开 + 心愿星升起
  s09: { init() { this.sp = makeSparkles(909, 26, '#ffe9a8'); },
    draw(ctx, p, t) {
      partyScene(ctx, t, { kind: 'dusk', dirt: false });
      const hx = W * .55, hy = H * .84;
      // 心形坑
      ctx.fillStyle = '#8a6844';
      ctx.save(); ctx.translate(hx, hy); ctx.scale(2.2, 1.5); drawHeartShape(ctx, 60); ctx.restore();
      const cyc = Math.min(t, 4.2) % 1.7;
      const dig = kf(cyc, [[0, 0], [0.32, 1], [0.95, .15], [1.7, 0]], easeOut);
      if (t < 4.5) kaikai(ctx, W * .3, H * .86, 52, { aBoom: 52 - dig * 34, aStick: -48 - dig * 38, aBucket: 18 + dig * 42, rot: -dig * .03, eyes: blink(t) ? 'closed' : 'normal' });
      else kaikai(ctx, W * .3, H * .86, 52, { aBoom: 30, aStick: -50, eyes: 'spark', mouth: 'open', lookX: .6 });
      // 心愿星 4.5s 后升起
      const rise = kf(t, [[4.5, 0], [8.5, 1]], easeOut);
      if (rise > 0) wishStar(ctx, hx, hy - 30 - rise * 300, 56, t);
      drawSparkles(ctx, this.sp, t, '#ffe9a8');
      emote(ctx, '✦', hx, hy - 420, t, 8.6, { size: 90 });
    } },

  // 生日歌(夜晚):全员围蛋糕,节拍一起跳
  s10: { init() { this.cf = makeConfetti(1001, 60, { spread: 32 }); this.notes = makeNotes(1010, 16); },
    draw(ctx, p, t) {
      partyScene(ctx, t, { kind: 'night', sign: ['生日快乐!'] });
      ctx.fillStyle = '#fff0f5'; ctx.beginPath(); ctx.roundRect(W * .5 - 300, H * .66, 600, 26, 12); ctx.fill();
      ctx.fillStyle = '#ffd6e6'; ctx.beginPath(); ctx.roundRect(W * .5 - 320, H * .66 + 24, 640, 90, 14); ctx.fill();
      const B = 1.24; // 节拍
      const bb = (ph) => Math.pow(Math.max(0, Math.sin((t + ph) * Math.PI / B)), 4);
      cake(ctx, W * .5, H * .66 + bb(0) * 4, 60, { t });
      drawGlow(ctx, W * .5, H * .42, 380, 'rgba(255,190,90,A)', t, 1.6);
      kaikai(ctx, W * .2, H * .88, 44, { dy: -bb(0) * 16 / 44, eyes: 'happy', mouth: 'open', aBoom: 62, aStick: -30 });
      dumpTruck(ctx, W * .35, H * .9, 40, { hat: true, dy: -bb(.3) * 12 / 40 });
      craneTruck(ctx, W * .68, H * .9, 40, { flip: true, hat: true, t, boom: 70, dy: -bb(.6) * 12 / 40 });
      mixerTruck(ctx, W * .84, H * .9, 38, { hat: true, drum: t * 2, dy: -bb(.9) * 12 / 38 });
      bulldozer(ctx, W * .08, H * .9, 38, { hat: true, dy: -bb(.45) * 12 / 38 });
      puppy(ctx, W * .55 + 280, H * .88, 36, { t, eyes: 'happy', aL: 1, aR: 1, dy: -bb(.75) * 18 / 36 });
      drawNotes(ctx, this.notes, t);
      drawConfetti(ctx, this.cf, t, .8);
    } },

  // 吹蜡烛(夜晚近景)
  s11: { init() { this.cf = makeConfetti(1101, 90, { spread: 2.2 }); },
    draw(ctx, p, t) {
      partyScene(ctx, t, { kind: 'night' });
      const blowT = 4.2;
      ctx.fillStyle = '#fff0f5'; ctx.beginPath(); ctx.roundRect(W * .5 - 260, H * .7, 520, 24, 12); ctx.fill();
      cake(ctx, W * .5, H * .7, 64, { t, blown: t > blowT });
      if (t < blowT) {
        drawGlow(ctx, W * .5, H * .42, 320, 'rgba(255,190,90,A)', t, 2);
        kaikai(ctx, W * .18, H * .88, 46, { eyes: 'normal', mouth: 'o', aBoom: 40, lookX: .5 });
        puppy(ctx, W * .82, H * .86, 38, { t, eyes: 'normal', lookX: -.5, mouth: 'o' });
        emote(ctx, '!', W * .5, H * .24, t, 1.2, { size: 100, color: '#ffd93d' });
      } else {
        drawSmoke(ctx, t - blowT, W * .5 - 60, H * .42, 17);
        drawSmoke(ctx, t - blowT, W * .5 + 60, H * .42, 29);
        drawConfetti(ctx, this.cf, t - blowT, 1);
        kaikai(ctx, W * .18, H * .88, 46, { eyes: 'happy', mouth: 'open', aBoom: 68, aStick: -25, dy: -bounce(t, 1.6) * 12 / 46 });
        puppy(ctx, W * .82, H * .86, 38, { t, eyes: 'happy', aL: 1, aR: 1, dy: -bounce(t, 1.6) * 16 / 38 });
        sfxText(ctx, '呼——!', W * .5, H * .26, t, blowT + .1, { size: 104, color: '#7ec8ff', life: 1.6 });
      }
    } },

  // 切蛋糕(黄昏):开开用挖斗轻轻切
  s12: { init() { this.sp = makeSparkles(1201, 14); },
    draw(ctx, p, t) {
      partyScene(ctx, t, { kind: 'dusk' });
      ctx.fillStyle = '#fff0f5'; ctx.beginPath(); ctx.roundRect(W * .6 - 260, H * .72, 520, 24, 12); ctx.fill();
      ctx.fillStyle = '#ffd6e6'; ctx.beginPath(); ctx.roundRect(W * .6 - 280, H * .72 + 22, 560, 80, 14); ctx.fill();
      const cutW = Math.sin(Math.min(t / 4, 1) * Math.PI);  // 蛋糕被切开晃动
      ctx.save(); ctx.translate(W * .6, H * .72); ctx.rotate(wave(t, 1.2) * .01 * cutW); ctx.translate(-W * .6, -H * .72);
      cake(ctx, W * .6, H * .72, 58, { t, blown: true });
      ctx.restore();
      const cut = kf(t % 2.6, [[0, 0], [.9, 1], [1.6, 1], [2.3, 0]], ease);
      kaikai(ctx, W * .28, H * .87, 52, { aBoom: 40 - cut * 26, aStick: -50 - cut * 20, aBucket: 24 + cut * 30, eyes: 'normal', lookX: .6, mouth: 'smile' });
      puppy(ctx, W * .86, H * .86, 36, { t, eyes: 'happy' });
      drawSparkles(ctx, this.sp, t);
    } },

  // 送礼物(白天)
  s13: { init() { this.sp = makeSparkles(1301, 20); },
    draw(ctx, p, t) {
      partyScene(ctx, t, {});
      const pop = backOut(clamp01((t - .4) / .9));
      ctx.save(); ctx.translate(W * .5, H * .9); ctx.scale(pop, pop); ctx.translate(-W * .5, -H * .9);
      gifts(ctx, W * .5, H * .9, 90, t);
      ctx.restore();
      dumpTruck(ctx, W * .2, H * .9, 44, { hat: true, eyes: blink(t, .4) ? 'closed' : 'normal' });
      puppy(ctx, W * .8, H * .86, 40, { t, eyes: 'happy', aL: .8, aR: .8, dy: -bounce(t, 1.4) * 14 / 40 });
      emote(ctx, '?', W * .78, H * .34, t, 8.5, { size: 96, color: '#ff9ff3' });
      drawSparkles(ctx, this.sp, t);
    } },

  // 心形合照(黄昏)
  s14: { init() { this.hearts = makeHearts(1401, 16); },
    draw(ctx, p, t) {
      ctx.save();
      const z = 1.06 - .06 * p;
      ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      partyScene(ctx, t, { kind: 'dusk', sign: ['黄山遥', '2 岁生日快乐'], dirt: false });
      const idle = (ph) => -Math.abs(Math.sin(t * 1.1 + ph)) * 8;
      bulldozer(ctx, W * .18, H * .9, 40, { hat: true, dy: idle(0) / 40 });
      dumpTruck(ctx, W * .33, H * .88, 40, { hat: true, dy: idle(.5) / 40 });
      kaikai(ctx, W * .5, H * .86, 52, { eyes: 'happy', mouth: 'open', aBoom: 66, aStick: -30, dy: idle(.25) / 52 });
      craneTruck(ctx, W * .67, H * .88, 40, { flip: true, hat: true, t, boom: 66, dy: idle(.7) / 40 });
      mixerTruck(ctx, W * .82, H * .9, 38, { hat: true, drum: t * 1.5, dy: idle(.95) / 38 });
      puppy(ctx, W * .61, H * .9, 34, { t, eyes: 'happy', aL: .8, aR: .8, dy: idle(.35) / 34 });
      ctx.restore();
      drawHearts(ctx, this.hearts, t);
    } },

  // 结尾:挥手告别 → 手绘祝福卡
  s15: { init() { this.sp = makeSparkles(1501, 22, '#ffe9a8'); this.cf = makeConfetti(1502, 50, { spread: 6 }); },
    draw(ctx, p, t) {
      const cardA = kf(t, [[17.4, 0], [18.9, 1]], ease);
      if (cardA < 1) {
        ctx.save(); ctx.globalAlpha = 1 - cardA;
        partyScene(ctx, t, { kind: 'dusk' });
        kaikai(ctx, W * .42, H * .87, 60, {
          eyes: blink(t) ? 'closed' : 'normal', mouth: 'open',
          aBoom: 58 + wave(t, 1.7) * 16, aStick: -40 + wave(t, 1.7) * 12, aBucket: 16,
          dy: -Math.abs(Math.sin(t * 1.7 * Math.PI)) * 10 / 60, rot: wave(t, .85) * .03,
        });
        puppy(ctx, W * .7, H * .88, 42, { t, aL: .9, aR: .9, dy: -bounce(t, 1.4) * 14 / 42, eyes: 'happy' });
        emote(ctx, '♥', W * .42 + 260, H * .4, t, 3.0, { color: '#ff6b8a', size: 92 });
        drawSparkles(ctx, this.sp, t, '#ffe9a8');
        ctx.restore();
      }
      if (cardA > 0) {  // 祝福卡
        ctx.save(); ctx.globalAlpha = cardA;
        skyGrad(ctx, [[0, '#7a5a9e'], [.5, '#ff9a7a'], [1, '#ffd9a0']]);
        ctx.fillStyle = '#fffaf2';
        ctx.beginPath(); ctx.roundRect(W * .14, H * .14, W * .72, H * .66, 26); ctx.fill();
        ctx.strokeStyle = '#f0d8b8'; ctx.lineWidth = 8; ctx.stroke();
        const pop1 = backOut(clamp01((t - 19.0) / .7)), pop2 = backOut(clamp01((t - 19.6) / .7));
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.save(); ctx.translate(W * .5, H * .36); ctx.scale(pop1, pop1);
        ctx.font = 'bold 108px "Noto Sans CJK SC"'; ctx.fillStyle = '#e0574f';
        ctx.fillText('黄山遥 两周岁生日快乐!', 0, 0); ctx.restore();
        ctx.save(); ctx.translate(W * .5, H * .52); ctx.scale(pop2, pop2);
        ctx.font = 'bold 64px "Noto Sans CJK SC"'; ctx.fillStyle = '#8a6d4b';
        ctx.fillText('2 0 2 6 . 1 0 . 1 8', 0, 0); ctx.restore();
        kaikai(ctx, W * .3, H * .76, 34, { aBoom: 62 + wave(t, 1.7) * 14, eyes: 'happy', mouth: 'open' });
        puppy(ctx, W * .7, H * .78, 30, { t, eyes: 'happy', aL: 1, aR: 1 });
        drawConfetti(ctx, this.cf, t - 18.9, .9);
        ctx.restore();
      }
    } },
};

const inited = {};
function drawFrame(ctx, t) {
  const shots = window.TIMELINE.shots;
  let s = shots[shots.length - 1];
  for (const sh of shots) if (t >= sh.start && t < sh.start + sh.dur) { s = sh; break; }
  const sc = SCENES[s.id];
  if (!inited[s.id]) { sc.init && sc.init(); inited[s.id] = 1; }
  const p = clamp01((t - s.start) / s.dur);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  sc.draw(ctx, p, t - s.start);
  fadeEdges(ctx, p, s.dur);
}
