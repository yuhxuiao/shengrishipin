// vector_pup.js — 布鲁伊与宾果 100% 纯 Canvas2D 过程式矢量角色系统 (V13)
// 彻底废弃 PNG 抠图切片，解决关节断层、白边与脸部残缺问题
// 包含: 1:1 官方造型重绘、高精五官与灵动表情、连续数学胶囊四肢、次级弹簧派对帽、28 套姿势无损驱动
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG2RAD = Math.PI / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // 1. 官方调色板标准
  const PALETTES = {
    bluey: {
      body: '#6998D5',        // 主天蓝
      dark: '#273C66',        // 右眼深蓝斑、外耳、尾尖、背部斑块
      belly: '#E8CE8B',       // 吻部、肚皮、内耳奶油色
      accent: '#C4E0FA',      // 眉毛、手爪、脚掌浅蓝提亮
      nose: '#182238',        // 墨蓝黑鼻头
      noseShine: 'rgba(255, 255, 255, 0.45)',
      stroke: '#0B2F6E',      // 深蓝轮廓线
      eyeWhite: '#FFFFFF',
      pupil: '#182238',
      pupilShine: '#FFFFFF',
      tongue: '#FF6B8B',
      mouthInside: '#1E2540',
      blush: 'rgba(255, 110, 150, 0.35)',
      defaultH: 420,
      scaleW: 1.0,
      seed: 41.73,
    },
    bingo: {
      body: '#E88E4B',        // 亮橙主色
      dark: '#9C4325',        // 左眼红褐暗斑、背部斑、外耳暗部
      belly: '#F5DDA2',       // 吻部、肚皮、内耳、尾尖亮浅桃色
      accent: '#F5DDA2',      // 眉毛、手爪、脚掌浅桃色提亮
      nose: '#182238',        // 墨黑鼻头
      noseShine: 'rgba(255, 255, 255, 0.45)',
      stroke: '#4A1E0E',      // 深褐轮廓线
      eyeWhite: '#FFFFFF',
      pupil: '#182238',
      pupilShine: '#FFFFFF',
      tongue: '#FF6B8B',
      mouthInside: '#2A1208',
      blush: 'rgba(255, 110, 150, 0.35)',
      defaultH: 360,
      scaleW: 1.04,           // Bingo 身形略圆润可爱
      seed: 73.19,
    }
  };

  // 2. 28 套动作库定义 (与 pup.js 保持一致)
  const POSES = {
    stand: { torso: { y: 0, rot: 0, squash: 0 }, head: { rot: 0 }, armL: { rot: 0 }, armR: { rot: 0 }, legL: { rot: 0 }, legR: { rot: 0 }, tail: { rot: 0 } },
    point: { torso: { y: -2, rot: 2, squash: 0 }, head: { rot: 4 }, armL: { rot: -15 }, armR: { rot: -42 }, legL: { rot: -3 }, legR: { rot: 4 }, tail: { rot: 18 } },
    clap: { torso: { y: 4, rot: 0, squash: 0.04 }, head: { rot: -3 }, armL: { rot: -68 }, armR: { rot: -65 }, legL: { rot: 0 }, legR: { rot: 0 }, tail: { rot: 25 } },
    hop: { torso: { y: -20, rot: 0, squash: -0.08 }, head: { rot: -6 }, armL: { rot: -45 }, armR: { rot: -40 }, legL: { rot: -18 }, legR: { rot: -16 }, tail: { rot: 32 } },
    land: { torso: { y: 16, rot: 0, squash: 0.14 }, head: { rot: 6 }, armL: { rot: 22 }, armR: { rot: 18 }, legL: { rot: 10 }, legR: { rot: 10 }, tail: { rot: -10 } },
    laugh: { torso: { y: 2, rot: -3, squash: 0.05 }, head: { rot: -12 }, armL: { rot: -55 }, armR: { rot: -50 }, legL: { rot: -2 }, legR: { rot: 2 }, tail: { rot: 35 } },
    cover_mouth: { torso: { y: 3, rot: -2, squash: 0.03 }, head: { rot: -6 }, armL: { rot: -82 }, armR: { rot: -78 }, legL: { rot: 0 }, legR: { rot: 0 }, tail: { rot: 22 } },
    run: { torso: { y: -4, rot: 8, squash: 0 }, head: { rot: -4 }, armL: { rot: -30 }, armR: { rot: 30 }, legL: { rot: 35 }, legR: { rot: -35 }, tail: { rot: 25 } },
    lunge: { torso: { y: 10, rot: 16, squash: 0.06 }, head: { rot: 14 }, armL: { rot: -65 }, armR: { rot: -60 }, legL: { rot: -20 }, legR: { rot: 25 }, tail: { rot: 40 } },
    hug_bone: { torso: { y: 6, rot: 4, squash: 0.05 }, head: { rot: 8 }, armL: { rot: -80 }, armR: { rot: -75 }, legL: { rot: -4 }, legR: { rot: 4 }, tail: { rot: 38 } },
    cheer: { torso: { y: -12, rot: 0, squash: -0.05 }, head: { rot: -10 }, armL: { rot: -125 }, armR: { rot: -120 }, legL: { rot: 0 }, legR: { rot: 0 }, tail: { rot: 38 } },
    whisper: { torso: { y: 2, rot: 6, squash: 0 }, head: { rot: 8 }, armL: { rot: -85 }, armR: { rot: 10 }, legL: { rot: -2 }, legR: { rot: 4 }, tail: { rot: 18 } },
    blow: { torso: { y: 6, rot: 18, squash: 0.04 }, head: { rot: 16 }, armL: { rot: 25 }, armR: { rot: 20 }, legL: { rot: -6 }, legR: { rot: 6 }, tail: { rot: 12 } },
    dance: { torso: { y: -4, rot: 0, squash: -0.02 }, head: { rot: 0 }, armL: { rot: -75 }, armR: { rot: -75 }, legL: { rot: -6 }, legR: { rot: 6 }, tail: { rot: 28 } },
    wave: { torso: { y: -2, rot: -3, squash: 0 }, head: { rot: -4 }, armL: { rot: -115 }, armR: { rot: 8 }, legL: { rot: 0 }, legR: { rot: 0 }, tail: { rot: 30 } },
    jump_cheer: { torso: { y: -24, rot: 0, squash: -0.09 }, head: { rot: -8 }, armL: { rot: -135 }, armR: { rot: -130 }, legL: { rot: -22 }, legR: { rot: -20 }, tail: { rot: 42 } },
    spin: { torso: { y: -4, rot: 0, squash: -0.02 }, head: { rot: 0 }, armL: { rot: -50 }, armR: { rot: 50 }, legL: { rot: -8 }, legR: { rot: 8 }, tail: { rot: 20 } },
    peek: { torso: { y: 8, rot: 15, squash: 0.05 }, head: { rot: 22 }, armL: { rot: -45 }, armR: { rot: 12 }, legL: { rot: -10 }, legR: { rot: 12 }, tail: { rot: 15 } },
    tiptoe: { torso: { y: -8, rot: 4, squash: -0.04 }, head: { rot: 6 }, armL: { rot: -35 }, armR: { rot: 20 }, legL: { rot: 16 }, legR: { rot: -14 }, tail: { rot: 22 } },
    sit: { torso: { y: 22, rot: -4, squash: 0.10 }, head: { rot: -4 }, armL: { rot: 10 }, armR: { rot: 14 }, legL: { rot: -40 }, legR: { rot: -38 }, tail: { rot: 35 } },
    shy: { torso: { y: 4, rot: 5, squash: 0.03 }, head: { rot: 12 }, armL: { rot: -95 }, armR: { rot: -12 }, legL: { rot: -2 }, legR: { rot: 4 }, tail: { rot: 12 } },
    think: { torso: { y: 2, rot: -4, squash: 0.02 }, head: { rot: -14 }, armL: { rot: -76 }, armR: { rot: -15 }, legL: { rot: 0 }, legR: { rot: 0 }, tail: { rot: 16 } },
    bow: { torso: { y: 14, rot: 26, squash: 0.07 }, head: { rot: 20 }, armL: { rot: 15 }, armR: { rot: 18 }, legL: { rot: -6 }, legR: { rot: 6 }, tail: { rot: 10 } },
    hug: { torso: { y: 0, rot: 3, squash: 0.02 }, head: { rot: 5 }, armL: { rot: -62 }, armR: { rot: -58 }, legL: { rot: -4 }, legR: { rot: 4 }, tail: { rot: 34 } },
    clap_overhead: { torso: { y: -8, rot: 0, squash: -0.04 }, head: { rot: -8 }, armL: { rot: -140 }, armR: { rot: -138 }, legL: { rot: 0 }, legR: { rot: 0 }, tail: { rot: 32 } },
    look_up: { torso: { y: -2, rot: -8, squash: 0 }, head: { rot: -24 }, armL: { rot: -25 }, armR: { rot: -18 }, legL: { rot: 0 }, legR: { rot: 0 }, tail: { rot: 22 } },
    crouch_anticipate: { torso: { y: 18, rot: 6, squash: 0.15 }, head: { rot: 10 }, armL: { rot: 20 }, armR: { rot: 16 }, legL: { rot: 12 }, legR: { rot: 12 }, tail: { rot: 8 } },
    dance2: { torso: { y: -2, rot: 0, squash: -0.02 }, head: { rot: 0 }, armL: { rot: -90 }, armR: { rot: -30 }, legL: { rot: -10 }, legR: { rot: 10 }, tail: { rot: 35 } },
  };

  // 评估姿态与次级摆动动力学
  function evaluatePose(poseName, t, opts) {
    opts = opts || {};
    let base;
    let nameStr = 'stand';
    if (typeof poseName === 'string') {
      nameStr = poseName;
      base = POSES[poseName] || POSES.stand;
    } else if (typeof poseName === 'object' && poseName !== null) {
      base = poseName;
      nameStr = poseName.poseName || 'stand';
    } else {
      base = POSES.stand;
    }

    let p = {
      torso: { ...(base.torso || POSES.stand.torso) },
      head: { ...(base.head || POSES.stand.head) },
      armL: { ...(base.armL || POSES.stand.armL) },
      armR: { ...(base.armR || POSES.stand.armR) },
      legL: { ...(base.legL || POSES.stand.legL) },
      legR: { ...(base.legR || POSES.stand.legR) },
      tail: { ...(base.tail || POSES.stand.tail) },
    };

    // 尾巴自然摆动
    const wagFreq = (nameStr === 'laugh' || nameStr === 'cheer' || nameStr === 'jump_cheer' || nameStr === 'hug_bone' || nameStr === 'dance' || nameStr === 'dance2' || nameStr === 'sit') ? 1.8 : 1.3;
    p.tail.rot += Math.sin(t * TAU * wagFreq) * 16 + Math.sin(t * TAU * wagFreq * 0.5) * 5;

    // 拍手
    if (nameStr === 'clap') {
      const beat = (t * 1.8) % 1.0;
      let snap = 0, squash = 0;
      if (beat < 0.28) {
        snap = Math.sin((beat / 0.28) * Math.PI * 0.5);
      } else if (beat < 0.48) {
        snap = 1.0;
        squash = 0.05 * Math.sin(((beat - 0.28) / 0.2) * Math.PI);
      } else {
        snap = 1.0 - Math.sin(((beat - 0.48) / 0.52) * Math.PI * 0.5);
      }
      p.armL.rot += snap * 16 - 8;
      p.armR.rot += snap * 16 - 8;
      p.torso.y += squash * 28;
      p.torso.squash += squash;
      p.head.rot += snap * 3 - 1.5;
    }

    // 欢呼
    if (nameStr === 'cheer') {
      const ph = Math.sin(t * TAU * 1.4);
      p.armL.rot += ph * 12;
      p.armR.rot += ph * 12;
      p.torso.y += Math.abs(ph) * 4.5;
      p.torso.rot += ph * 2.5;
      p.head.rot += ph * 3.5;
    }

    // 奔跑
    if (nameStr === 'run') {
      const stepFreq = 2.4;
      const ph = Math.sin(t * TAU * stepFreq);
      p.legL.rot += ph * 28;
      p.legR.rot -= ph * 28;
      p.armL.rot -= ph * 22;
      p.armR.rot += ph * 22;
      p.torso.y += Math.abs(ph) * 5.5;
      p.head.rot += Math.sin(t * TAU * stepFreq) * 3.5;
    }

    // 摇摆舞
    if (nameStr === 'dance') {
      const dph = Math.sin(t * TAU * 1.2);
      p.torso.rot += dph * 5;
      p.torso.y += Math.abs(dph) * 4;
      p.head.rot -= dph * 3.5;
      p.armL.rot += dph * 14;
      p.armR.rot -= dph * 14;
    }

    // 大笑
    if (nameStr === 'laugh') {
      const lph = Math.sin(t * TAU * 2.0);
      p.torso.y += Math.abs(lph) * 3.5;
      p.head.rot += lph * 3.5;
      p.armL.rot += lph * 4;
    }

    // 挥手
    if (nameStr === 'wave') {
      const wph = Math.sin(t * TAU * 1.8);
      p.armL.rot += wph * 22;
      p.head.rot += wph * 3.5;
      p.torso.rot += wph * 1.5;
    }

    // 大跳欢呼
    if (nameStr === 'jump_cheer') {
      const cyc = (t * 1.4) % 1.0;
      let hopY = 0, hopSq = 0;
      if (cyc < 0.65) {
        const u = cyc / 0.65;
        hopY = -4 * 35 * u * (1 - u);
        hopSq = -0.06;
      } else {
        const u = (cyc - 0.65) / 0.35;
        hopSq = 0.12 * Math.sin(u * Math.PI);
        hopY = hopSq * 25;
      }
      p.torso.y += hopY;
      p.torso.squash += hopSq;
      p.armL.rot += Math.sin(cyc * TAU) * 14;
      p.armR.rot += Math.sin(cyc * TAU) * 14;
    }

    // 站立微呼吸
    if (nameStr === 'stand') {
      const bph = Math.sin(t * TAU * 0.6);
      p.torso.y += bph * 2.2;
      p.head.rot += bph * 1.5;
      p.armL.rot += bph * 1.8;
      p.armR.rot -= bph * 1.8;
    }

    return p;
  }

  // 纯函数确定性眨眼计算
  function calcBlinkAmt(t, seed) {
    const cycle = 3.6;
    const cycleIdx = Math.floor((t + seed) / cycle);
    const phase = (t + seed) - cycleIdx * cycle;
    const h = Math.sin(cycleIdx * 93.17 + seed * 15.3) * 43758.5453;
    const rnd = h - Math.floor(h);
    const blinkStart = 0.8 + rnd * 1.8;
    const dur = 0.16;
    const dt = phase - blinkStart;
    if (dt >= 0 && dt < dur) {
      return Math.sin((Math.PI * dt) / dur);
    }
    if (rnd > 0.68) {
      const dt2 = phase - (blinkStart + 0.22);
      if (dt2 >= 0 && dt2 < dur) {
        return Math.sin((Math.PI * dt2) / dur);
      }
    }
    return 0;
  }

  // 通用圆角矩形辅助 (跨环境 100% 稳定)
  function roundRect(ctx, x, y, w, h, rtl, rtr, rbr, rbl) {
    if (rtr === undefined) rtr = rtl;
    if (rbr === undefined) rbr = rtl;
    if (rbl === undefined) rbl = rtl;
    ctx.beginPath();
    ctx.moveTo(x + rtl, y);
    ctx.lineTo(x + w - rtr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rtr);
    ctx.lineTo(x + w, y + h - rbr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rbr, y + h);
    ctx.lineTo(x + rbl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rbl);
    ctx.lineTo(x, y + rtl);
    ctx.quadraticCurveTo(x, y, x + rtl, y);
    ctx.closePath();
  }

  // ======================== 核心矢量部件绘制 ========================

  // 1. 绘制尾巴 (随身体与行走摆动, 两段色彩蓬松质感, 无裁剪框缺陷)
  function drawTail(ctx, rotDeg, pal, isBingo) {
    ctx.save();
    ctx.translate(-130, -230);
    ctx.rotate(rotDeg * DEG2RAD);

    const buildTailPath = () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-45, -15, -110, -55, -160, -115);
      ctx.bezierCurveTo(-175, -125, -195, -110, -190, -85);
      ctx.bezierCurveTo(-200, -70, -190, -45, -170, -35);
      ctx.bezierCurveTo(-175, -20, -155, -5, -135, -5);
      ctx.bezierCurveTo(-95, -5, -45, 10, 0, 20);
      ctx.closePath();
    };

    // 填充尾根底色 (主色)
    buildTailPath();
    ctx.fillStyle = pal.body;
    ctx.fill();

    // 剪裁绘制尾尖第二段色彩
    ctx.save();
    buildTailPath();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(-95, -140);
    ctx.bezierCurveTo(-115, -90, -90, -40, -110, 20);
    ctx.lineTo(-240, 20);
    ctx.lineTo(-240, -160);
    ctx.closePath();
    ctx.fillStyle = isBingo ? pal.belly : pal.dark;
    ctx.fill();
    ctx.restore();

    // 严谨重置路径后执行纯外轮廓描边
    buildTailPath();
    ctx.lineWidth = 7.5;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  // 2. 绘制腿部与脚掌 (圆柱状连续腿 + 3 趾圆垫脚掌)
  function drawLeg(ctx, hipPos, rotDeg, pal, isBingo) {
    ctx.save();
    ctx.translate(hipPos[0], hipPos[1]);
    ctx.rotate(rotDeg * DEG2RAD);

    // 腿部根部同色铰点填充圆 (完全遮盖转动缝隙)
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, TAU);
    ctx.fillStyle = pal.body;
    ctx.fill();

    const buildLegPath = () => {
      ctx.beginPath();
      ctx.moveTo(-33, 0);
      ctx.lineTo(-33, 140);
      ctx.quadraticCurveTo(-46, 175, -45, 212);
      ctx.quadraticCurveTo(0, 222, 45, 212);
      ctx.quadraticCurveTo(46, 175, 33, 140);
      ctx.lineTo(33, 0);
      ctx.closePath();
    };

    buildLegPath();
    ctx.fillStyle = pal.body;
    ctx.fill();

    // 下半截浅色爪子
    ctx.save();
    buildLegPath();
    ctx.clip();
    ctx.beginPath();
    ctx.rect(-60, 135, 120, 95);
    ctx.fillStyle = pal.accent;
    ctx.fill();
    ctx.restore();

    // 趾甲/脚趾分隔线 (3 个圆润脚趾, 2 条缝线)
    ctx.lineWidth = 6;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-16, 182);
    ctx.lineTo(-16, 218);
    ctx.moveTo(16, 182);
    ctx.lineTo(16, 218);
    ctx.stroke();

    // 腿部外轮廓描边
    buildLegPath();
    ctx.lineWidth = 7.5;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  // 3. 绘制躯干 (圆角长方体 + 大椭圆肚皮斑 + 背部斑纹，顶端无缝隐入头部下方)
  function drawTorso(ctx, pal, isBingo) {
    ctx.save();
    const w = 370 * pal.scaleW;
    const h = 320;
    const x = -w / 2;
    const y = -520;

    // 躯干填充体 (向上伸入颈部 y=-520)
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - 50);
    ctx.quadraticCurveTo(x + w, y + h, x + w - 50, y + h);
    ctx.lineTo(x + 50, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - 50);
    ctx.closePath();
    ctx.fillStyle = pal.body;
    ctx.fill();

    // 背部特征斑块 (位于角色背部左侧)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - 50);
    ctx.quadraticCurveTo(x + w, y + h, x + w - 50, y + h);
    ctx.lineTo(x + 50, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - 50);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 235, 45, 38, -0.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 135, 38, 32, -0.15, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 腹部大椭圆奶油色肚皮斑 (下沉居中)
    ctx.beginPath();
    ctx.ellipse(0, y + 185, 128 * pal.scaleW, 110, 0, 0, TAU);
    ctx.fillStyle = pal.belly;
    ctx.fill();

    // 躯干外轮廓只描左、底、右三面，顶端开放无横切断层黑线！
    ctx.beginPath();
    ctx.moveTo(x, y + 30);
    ctx.lineTo(x, y + h - 50);
    ctx.quadraticCurveTo(x, y + h, x + 50, y + h);
    ctx.lineTo(x + w - 50, y + h);
    ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - 50);
    ctx.lineTo(x + w, y + 30);
    ctx.lineWidth = 7.5;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  // 4. 绘制手臂与手掌 (连续数学胶囊 + 4 指小爪 + 无缝同色肩铰盖)
  function drawArm(ctx, shoulderPos, rotDeg, pal, isBingo) {
    ctx.save();
    ctx.translate(shoulderPos[0], shoulderPos[1]);
    ctx.rotate(rotDeg * DEG2RAD);

    // 肩关节同色平滑重叠圆盖
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, TAU);
    ctx.fillStyle = pal.body;
    ctx.fill();

    const buildArmPath = () => {
      ctx.beginPath();
      ctx.moveTo(-31, 0);
      ctx.lineTo(-27, 145);
      ctx.quadraticCurveTo(-38, 168, -32, 188);
      ctx.quadraticCurveTo(-26, 216, -15, 218); // 指 1
      ctx.quadraticCurveTo(-5, 224, 6, 222);    // 指 2
      ctx.quadraticCurveTo(18, 224, 27, 212);   // 指 3
      ctx.quadraticCurveTo(38, 198, 30, 178);   // 指 4
      ctx.quadraticCurveTo(27, 160, 27, 145);
      ctx.lineTo(31, 0);
      ctx.arc(0, 0, 31, 0, Math.PI, true);
      ctx.closePath();
    };

    buildArmPath();
    ctx.fillStyle = pal.body;
    ctx.fill();

    // 手掌浅色部分
    ctx.save();
    buildArmPath();
    ctx.clip();
    ctx.beginPath();
    ctx.rect(-50, 140, 100, 95);
    ctx.fillStyle = pal.accent;
    ctx.fill();
    ctx.restore();

    // 4 指分隔缝线
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-16, 192);
    ctx.lineTo(-16, 216);
    ctx.moveTo(-2, 194);
    ctx.lineTo(-2, 221);
    ctx.moveTo(14, 192);
    ctx.lineTo(14, 216);
    ctx.stroke();

    // 手臂整体轮廓描边
    buildArmPath();
    ctx.lineWidth = 7.5;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  // 5. 绘制头部与面部 (1:1 原版超高精度造型, 大胶囊双眼正中接触, 吻部与鼻头交错叠合)
  function drawHead(ctx, headRotDeg, pal, isBingo, expr, look, t, mouthOpen) {
    ctx.save();
    ctx.translate(0, -500); // 颈部枢轴
    ctx.rotate(headRotDeg * DEG2RAD);

    const hw = 390 * pal.scaleW;
    const hh = 345;
    const hx = -hw / 2;
    const hy = -335;

    // ----- A. 双耳 (外耳 + 亮色内耳，底端自然融合在头顶两角) -----
    // 1) 左耳 (位于观众视角左侧)
    const drawLeftEar = () => {
      ctx.beginPath();
      ctx.moveTo(hx + 15, hy + 45);
      ctx.lineTo(-142 * pal.scaleW, hy - 165); // 耳尖
      ctx.quadraticCurveTo(-135 * pal.scaleW, hy - 175, -125 * pal.scaleW, hy - 165);
      ctx.lineTo(-55 * pal.scaleW, hy);
      ctx.closePath();
      ctx.fillStyle = isBingo ? pal.body : pal.dark; // Bluey 深蓝，Bingo 橙色
      ctx.fill();
      ctx.lineWidth = 7.5;
      ctx.strokeStyle = pal.stroke;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 内耳
      ctx.beginPath();
      ctx.moveTo(hx + 38, hy + 35);
      ctx.lineTo(-135 * pal.scaleW, hy - 145);
      ctx.lineTo(-75 * pal.scaleW, hy);
      ctx.closePath();
      ctx.fillStyle = pal.belly;
      ctx.fill();
    };

    // 2) 右耳 (位于观众视角右侧)
    const drawRightEar = () => {
      ctx.beginPath();
      ctx.moveTo(hw / 2 - 15, hy + 45);
      ctx.lineTo(142 * pal.scaleW, hy - 165);
      ctx.quadraticCurveTo(135 * pal.scaleW, hy - 175, 125 * pal.scaleW, hy - 165);
      ctx.lineTo(55 * pal.scaleW, hy);
      ctx.closePath();
      ctx.fillStyle = pal.dark; // Bluey 深蓝，Bingo 右侧带斑侧红褐暗色
      ctx.fill();
      ctx.lineWidth = 7.5;
      ctx.strokeStyle = pal.stroke;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 内耳
      ctx.beginPath();
      ctx.moveTo(hw / 2 - 38, hy + 35);
      ctx.lineTo(135 * pal.scaleW, hy - 145);
      ctx.lineTo(75 * pal.scaleW, hy);
      ctx.closePath();
      ctx.fillStyle = pal.belly;
      ctx.fill();
    };

    drawLeftEar();
    drawRightEar();

    // ----- B. 头部主体 Squircle -----
    roundRect(ctx, hx, hy, hw, hh, 65, 65, 50, 50);
    ctx.fillStyle = pal.body;
    ctx.fill();

    // ----- C. 标志性眼斑与头部花纹 (严格剪裁在头部 Squircle 内) -----
    ctx.save();
    roundRect(ctx, hx, hy, hw, hh, 65, 65, 50, 50);
    ctx.clip();

    if (!isBingo) {
      // Bluey: 右眼(观众视角左侧)深蓝大斑块 + 额顶深蓝区
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(10, hy);
      ctx.bezierCurveTo(5, hy + 140, 5, hy + 230, -20, hy + 265);
      ctx.bezierCurveTo(-50, hy + 295, -135, hy + 295, hx, hy + 265);
      ctx.closePath();
      ctx.fillStyle = pal.dark; // #273C66
      ctx.fill();

      // 头顶深蓝连接
      ctx.beginPath();
      ctx.moveTo(-45, hy);
      ctx.quadraticCurveTo(25, hy + 40, 95, hy);
      ctx.closePath();
      ctx.fillStyle = pal.dark;
      ctx.fill();
    } else {
      // Bingo: 左眼(观众视角右侧)红褐色大斑块
      ctx.beginPath();
      ctx.moveTo(-5, hy);
      ctx.lineTo(hw / 2, hy);
      ctx.lineTo(hw / 2, hy + 265);
      ctx.bezierCurveTo(hw / 2 - 40, hy + 295, 45, hy + 295, 20, hy + 265);
      ctx.bezierCurveTo(-5, hy + 230, -5, hy + 140, -5, hy);
      ctx.closePath();
      ctx.fillStyle = pal.dark; // #9C4325
      ctx.fill();

      // 额头中间淡桃色条纹
      ctx.beginPath();
      ctx.moveTo(-40, hy);
      ctx.lineTo(10, hy);
      ctx.bezierCurveTo(5, hy + 140, -5, hy + 200, -15, hy + 230);
      ctx.bezierCurveTo(-28, hy + 200, -35, hy + 140, -40, hy);
      ctx.closePath();
      ctx.fillStyle = pal.belly; // #F5DDA2
      ctx.fill();
    }
    ctx.restore();

    // 头部主体外轮廓描边
    roundRect(ctx, hx, hy, hw, hh, 65, 65, 50, 50);
    ctx.lineWidth = 7.5;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ----- D. 双眼与视线跟踪、确定性自然眨眼 -----
    // 官方 1:1 特征: 两只眼睛高大、紧靠正中，左右眼在中轴 x=0 处紧紧相贴！
    const blinkAmt = calcBlinkAmt(t, pal.seed);
    const isSquint = expr === 'laugh' || expr === 'dance';
    const isSurprise = expr === 'surprise';
    const isSad = expr === 'sad';

    const eyeW = 104 * pal.scaleW;
    const eyeH = 148;
    const eyeRadius = 50;
    const eyeCenterY = hy + 172;

    const lookX = clamp((look && look[0]) || 0, -1, 1);
    const lookY = clamp((look && look[1]) || 0, -1, 1);
    const pupilOffX = lookX * 22;
    const pupilOffY = lookY * 18;

    // 单只眼睛渲染 (cx, cy 是中心, rx 是左上角)
    const drawEye = (rx, cx, lidColor, isLeftEye) => {
      const ry = eyeCenterY - eyeH / 2;

      ctx.save();
      roundRect(ctx, rx, ry, eyeW, eyeH, eyeRadius);
      ctx.fillStyle = pal.eyeWhite;
      ctx.fill();

      if (isSquint) {
        // 眯眼笑弧线
        roundRect(ctx, rx, ry, eyeW, eyeH, eyeRadius);
        ctx.clip();
        ctx.fillStyle = lidColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, eyeCenterY + 14, 38, Math.PI * 1.15, Math.PI * 1.85);
        ctx.lineWidth = 8;
        ctx.strokeStyle = pal.stroke;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else {
        roundRect(ctx, rx, ry, eyeW, eyeH, eyeRadius);
        ctx.clip();

        // 黑色大眼珠 (微靠内注视显得呆萌可爱)
        const inwardBias = isLeftEye ? 4 : -4;
        const px = cx + pupilOffX + inwardBias;
        const py = eyeCenterY + pupilOffY;
        const prx = isSurprise ? 16 : 21;
        const pry = isSurprise ? 26 : 36;
        ctx.beginPath();
        ctx.ellipse(px, py, prx, pry, 0, 0, TAU);
        ctx.fillStyle = pal.pupil;
        ctx.fill();

        // 高光点
        ctx.beginPath();
        ctx.arc(px + 7, py - 13, 7, 0, TAU);
        ctx.fillStyle = pal.pupilShine;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px - 7, py + 12, 3.2, 0, TAU);
        ctx.fillStyle = pal.pupilShine;
        ctx.fill();

        // 眨眼眼睑闭合
        if (blinkAmt > 0) {
          const closeY = ry + eyeH * blinkAmt;
          ctx.beginPath();
          ctx.rect(rx - 5, ry - 5, eyeW + 10, eyeH * blinkAmt + 5);
          ctx.fillStyle = lidColor;
          ctx.fill();

          ctx.lineWidth = 7;
          ctx.strokeStyle = pal.stroke;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(rx, closeY);
          ctx.lineTo(rx + eyeW, closeY);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 眼眶粗描边
      roundRect(ctx, rx, ry, eyeW, eyeH, eyeRadius);
      ctx.lineWidth = 7.5;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();
    };

    // 左眼: rx = -eyeW, cx = -eyeW / 2
    // 右眼: rx = 0, cx = eyeW / 2
    // 两眼在 x=0 处精准中缝贴合！
    drawEye(-eyeW, -eyeW / 2, !isBingo ? pal.dark : pal.body, true);
    drawEye(0, eyeW / 2, !isBingo ? pal.body : pal.dark, false);

    // ----- E. 眉毛 (粗圆角胶囊, 浮动在双眼上方) -----
    const browW = 84 * pal.scaleW;
    const browH = 28;
    let browOffY = isSurprise ? -28 : (expr === 'laugh' ? -14 : 0);
    let browRotL = 0, browRotR = 0;
    if (isSad) {
      browRotL = 16; browRotR = -16; browOffY += 6;
    } else if (expr === 'think') {
      browRotL = -14; browRotR = 10;
    } else if (expr === 'shy') {
      browRotL = 8; browRotR = -8;
    }

    const drawBrow = (cx, cy, rot, browColor) => {
      ctx.save();
      ctx.translate(cx, cy + browOffY);
      ctx.rotate(rot * DEG2RAD);
      roundRect(ctx, -browW / 2, -browH / 2, browW, browH, browH / 2);
      ctx.fillStyle = browColor;
      ctx.fill();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();
      ctx.restore();
    };

    drawBrow(-eyeW / 2, hy + 82, browRotL, pal.accent);
    drawBrow(eyeW / 2, hy + 82, browRotR, pal.accent);

    // ----- F. 吻部 (Snout / Muzzle) 与鼻头 (Nose) -----
    // 官方 1:1 特征: 吻部上方压入双眼底部约 25px，鼻头稳坐正中并部分遮住双眼底部中缝
    const snoutW = 236 * pal.scaleW;
    const snoutH = 126;
    const snoutX = -snoutW / 2;
    const snoutY = hy + 212;

    roundRect(ctx, snoutX, snoutY, snoutW, snoutH, 50, 50, 45, 45);
    ctx.fillStyle = pal.belly;
    ctx.fill();
    ctx.lineWidth = 7.5;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 鼻头 (圆润大倒三角形黑鼻头)
    ctx.save();
    const noseY = snoutY + 6;
    ctx.beginPath();
    ctx.moveTo(-36, noseY - 8);
    ctx.quadraticCurveTo(0, noseY - 15, 36, noseY - 8);
    ctx.quadraticCurveTo(40, noseY + 24, 16, noseY + 38);
    ctx.quadraticCurveTo(0, noseY + 46, -16, noseY + 38);
    ctx.quadraticCurveTo(-40, noseY + 24, -36, noseY - 8);
    ctx.closePath();
    ctx.fillStyle = pal.nose;
    ctx.fill();

    // 鼻头软高光
    ctx.beginPath();
    ctx.ellipse(0, noseY - 2, 16, 6, 0, 0, TAU);
    ctx.fillStyle = pal.noseShine;
    ctx.fill();
    ctx.restore();

    // ----- G. 嘴巴 (Mouth) -----
    const mouthCenterY = snoutY + 75;
    const openVal = mouthOpen !== undefined ? mouthOpen : (expr === 'talk' ? 0.5 + 0.4 * Math.sin(t * 18) : 0);

    if (openVal > 0.08 || expr === 'talk') {
      const openH = Math.max(14, openVal * 42);
      ctx.beginPath();
      ctx.moveTo(-48, mouthCenterY - 12);
      ctx.quadraticCurveTo(0, mouthCenterY - 8, 48, mouthCenterY - 12);
      ctx.quadraticCurveTo(52, mouthCenterY - 12 + openH, 0, mouthCenterY - 12 + openH);
      ctx.quadraticCurveTo(-52, mouthCenterY - 12 + openH, -48, mouthCenterY - 12);
      ctx.closePath();
      ctx.fillStyle = pal.mouthInside;
      ctx.fill();

      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY - 12 + openH, 30, 16, 0, 0, TAU);
      ctx.fillStyle = pal.tongue;
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = 6;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();

    } else if (expr === 'laugh' || expr === 'cheer') {
      ctx.beginPath();
      ctx.moveTo(-56, mouthCenterY - 14);
      ctx.quadraticCurveTo(0, mouthCenterY - 8, 56, mouthCenterY - 14);
      ctx.quadraticCurveTo(62, mouthCenterY + 30, 0, mouthCenterY + 36);
      ctx.quadraticCurveTo(-62, mouthCenterY + 30, -56, mouthCenterY - 14);
      ctx.closePath();
      ctx.fillStyle = pal.mouthInside;
      ctx.fill();

      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY + 24, 40, 20, 0, 0, TAU);
      ctx.fillStyle = pal.tongue;
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = 6.5;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();

    } else if (isSurprise) {
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY + 4, 18, 22, 0, 0, TAU);
      ctx.fillStyle = pal.mouthInside;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();

    } else if (expr === 'blow') {
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY + 6, 12, 16, 0, 0, TAU);
      ctx.fillStyle = pal.mouthInside;
      ctx.fill();
      ctx.lineWidth = 5.5;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();

    } else if (isSad) {
      ctx.beginPath();
      ctx.moveTo(-44, mouthCenterY + 12);
      ctx.quadraticCurveTo(0, mouthCenterY - 4, 44, mouthCenterY + 12);
      ctx.lineWidth = 6.5;
      ctx.strokeStyle = pal.stroke;
      ctx.lineCap = 'round';
      ctx.stroke();

    } else {
      ctx.beginPath();
      ctx.moveTo(-52, mouthCenterY - 4);
      ctx.quadraticCurveTo(-15, mouthCenterY + 22, 40, mouthCenterY + 2);
      ctx.quadraticCurveTo(50, mouthCenterY - 4, 50, mouthCenterY - 14); // 俏皮嘴角勾
      ctx.lineWidth = 6.5;
      ctx.strokeStyle = pal.stroke;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // ----- H. 腮红 -----
    if (expr === 'shy' || expr === 'laugh' || expr === 'hug') {
      ctx.beginPath();
      ctx.ellipse(hx + 55, hy + 265, 26, 16, 0, 0, TAU);
      ctx.ellipse(hw / 2 - 55, hy + 265, 26, 16, 0, 0, TAU);
      ctx.fillStyle = pal.blush;
      ctx.fill();
    }

    ctx.restore(); // 结束头部变换
  }

  // 6. 绘制派对帽 (完美佩戴在两耳之间, 带弹簧动力学微摆)
  function drawPartyHat(ctx, headRotDeg, torsoRotDeg, t, pal, imgs) {
    ctx.save();
    ctx.translate(0, -500);
    ctx.rotate(headRotDeg * DEG2RAD);
    ctx.translate(0, -330); // 头顶两耳间中心

    // 物理闭式解弹簧阻尼摆动
    const inertiaAngle = -headRotDeg * 0.32 - torsoRotDeg * 0.15;
    const fSpring = 1.9;
    const phaseLag = 0.48;
    const springOsc = Math.sin(t * TAU * fSpring - phaseLag) * 4.2 + Math.sin(t * TAU * 1.3 - 0.3) * 2.5;
    const hatWobble = inertiaAngle + springOsc;
    ctx.rotate(hatWobble * DEG2RAD);

    if (imgs && imgs.hat) {
      const hw = 170, hh = 250;
      ctx.drawImage(imgs.hat, -hw / 2, -hh, hw, hh);
    } else {
      const hw = 140, hh = 230;

      // 纯锥形主体
      const conePath = () => {
        ctx.beginPath();
        ctx.moveTo(-hw / 2, 0);
        ctx.lineTo(0, -hh);
        ctx.lineTo(hw / 2, 0);
        ctx.quadraticCurveTo(0, 18, -hw / 2, 0);
        ctx.closePath();
      };

      conePath();
      ctx.fillStyle = '#FFD93D';
      ctx.fill();

      // 彩色波点 (剪裁在锥体内，避免污染顶部球)
      ctx.save();
      conePath();
      ctx.clip();
      ctx.fillStyle = '#4FB4F7';
      const dots = [[-25, -60, 18], [28, -80, 16], [0, -135, 14], [-18, -185, 11], [22, -180, 10]];
      dots.forEach(([dx, dy, dr]) => {
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, TAU);
        ctx.fill();
      });
      ctx.restore();

      conePath();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#0B2F6E';
      ctx.stroke();

      // 顶部 Pom-pom 毛球 (干净绘制在最顶端)
      ctx.beginPath();
      ctx.arc(0, -hh - 4, 24, 0, TAU);
      ctx.fillStyle = '#FF7A00';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#0B2F6E';
      ctx.stroke();
    }

    ctx.restore();
  }

  // 7. 绘制道具骨头
  function drawBoneProp(ctx, shoulderPos, armRotDeg, imgs) {
    ctx.save();
    ctx.translate(shoulderPos[0], shoulderPos[1]);
    ctx.rotate(armRotDeg * DEG2RAD);
    ctx.translate(0, 175);

    if (imgs && imgs.bone) {
      const bw = 180, bh = bw * (imgs.bone.height / imgs.bone.width);
      ctx.drawImage(imgs.bone, -bw / 2, -bh / 2, bw, bh);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0B2F6E';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(-55, -16, 18, 0, TAU);
      ctx.arc(-55, 16, 18, 0, TAU);
      ctx.arc(55, -16, 18, 0, TAU);
      ctx.arc(55, 16, 18, 0, TAU);
      ctx.rect(-50, -12, 100, 24);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // ======================== 主入口: VectorPup.draw ========================
  function draw(ctx, charKey, state, t, pupData) {
    if (!ctx) return;
    state = state || {};
    t = t || 0;

    const isBingo = (charKey === 'bingo') || (pupData && pupData.rig && pupData.rig.scale_base > 2000) || (pupData && pupData.name === 'bingo');
    const key = isBingo ? 'bingo' : 'bluey';
    const pal = PALETTES[key];

    const x = state.x || 0;
    const footY = state.footY || 880;
    const targetH = state.h || pal.defaultH;
    const scale = targetH / 1000;
    const facing = state.facing !== undefined ? state.facing : 1;
    const dy = state.dy || 0;

    const poseName = state.pose || 'stand';
    const p = evaluatePose(poseName, t, state);

    const expr = state.expr || 'happy';
    const look = state.look || [0, 0];
    const mouthOpen = state.mouthOpen;

    ctx.save();
    ctx.translate(x, footY);

    // 动态接地阴影
    const jumpH = Math.max(0, -dy);
    const shadowScale = clamp(1.0 - jumpH / 260, 0.38, 1.0);
    const shadowAlpha = clamp(0.32 - jumpH / 450, 0.05, 0.32);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 140 * scale * shadowScale, 30 * scale * shadowScale, 0, 0, TAU);
    ctx.fillStyle = `rgba(18, 42, 28, ${shadowAlpha})`;
    ctx.fill();
    ctx.restore();

    // 角色缩放、朝向与垂直位移
    ctx.translate(0, dy + p.torso.y * scale * 0.7);
    ctx.scale(facing * scale, scale);

    const sq = (state.squash || 0) + (p.torso.squash || 0);
    if (sq !== 0) {
      ctx.scale(1 + 0.42 * sq, 1 - sq);
    }

    if (p.torso.rot) {
      ctx.translate(0, -220);
      ctx.rotate(p.torso.rot * DEG2RAD);
      ctx.translate(0, 220);
    }

    // 手臂高举后置判断
    const isArmBehindHead = (p.armL.rot < -65) && (poseName !== 'cover_mouth') && (poseName !== 'whisper');

    const shoulderL = [-145 * pal.scaleW, -500];
    const shoulderR = [145 * pal.scaleW, -490];
    const hipL = [-75 * pal.scaleW, -220];
    const hipR = [75 * pal.scaleW, -220];

    const imgs = (pupData && pupData.imgs) || (state && state.imgs) || null;

    // ----- 绘制层序 -----
    // 1) 尾巴
    drawTail(ctx, p.tail.rot, pal, isBingo);

    // 2) 右臂 (后爪)
    drawArm(ctx, shoulderR, p.armR.rot, pal, isBingo);

    // 3) 腿部 (后腿与前腿)
    drawLeg(ctx, hipR, p.legR.rot, pal, isBingo);
    drawLeg(ctx, hipL, p.legL.rot, pal, isBingo);

    // 4) 躯干
    drawTorso(ctx, pal, isBingo);

    // 若手臂高举，在头部前先画左臂
    if (isArmBehindHead) {
      drawArm(ctx, shoulderL, p.armL.rot, pal, isBingo);
    }

    // 5) 头部与完整五官
    drawHead(ctx, p.head.rot, pal, isBingo, expr, look, t, mouthOpen);

    // 6) 派对帽
    const hasHat = state.hat && state.hat.visible !== false;
    if (hasHat) {
      drawPartyHat(ctx, p.head.rot, p.torso.rot, t, pal, imgs);
    }

    // 若手臂未高举，在头部之后画左臂
    if (!isArmBehindHead) {
      drawArm(ctx, shoulderL, p.armL.rot, pal, isBingo);
    }

    // 7) 道具骨头
    if (state.item === 'bone') {
      drawBoneProp(ctx, shoulderL, p.armL.rot, imgs);
    }

    ctx.restore();
  }

  const VectorPup = {
    PALETTES,
    POSES,
    evaluatePose,
    draw,
    drawTail,
    drawLeg,
    drawTorso,
    drawArm,
    drawHead,
    drawPartyHat,
    drawBoneProp,
  };

  root.VectorPup = VectorPup;
  if (typeof module !== 'undefined' && module.exports) module.exports = VectorPup;
})(typeof globalThis !== 'undefined' ? globalThis : this);
