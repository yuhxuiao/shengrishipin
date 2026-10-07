// pup.js — 布鲁伊与宾果 2D 分件骨骼动画系统 (高精微表演升级版)
// 包含: 头、躯干、左右臂/手、左右腿/脚、尾巴、派对帽、骨头道具、接地阴影
// 特性: 真正的跑步踏步步态循环、动态胸前拍手循环、身体 squash & stretch、帽子惯性弹簧微摆
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG2RAD = Math.PI / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // 12 套丰富幼儿向姿势基准
  const POSES = {
    stand: {
      torso: { y: 0, rot: 0, squash: 0 },
      head: { rot: 0 },
      armL: { rot: 0 },
      armR: { rot: 0 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 0 },
    },
    point: {
      torso: { y: -2, rot: 2, squash: 0 },
      head: { rot: 4 },
      armL: { rot: -15 },
      armR: { rot: -42 }, // 后臂高高指向目标
      legL: { rot: -3 },
      legR: { rot: 4 },
      tail: { rot: 18 },
    },
    clap: {
      torso: { y: 4, rot: 0, squash: 0.04 },
      head: { rot: -3 },
      armL: { rot: -68 }, // 双爪在胸前合拢拍手
      armR: { rot: -65 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 25 },
    },
    hop: {
      torso: { y: -20, rot: 0, squash: -0.08 },
      head: { rot: -6 },
      armL: { rot: -45 },
      armR: { rot: -40 },
      legL: { rot: -18 },
      legR: { rot: -16 },
      tail: { rot: 32 },
    },
    land: {
      torso: { y: 16, rot: 0, squash: 0.14 },
      head: { rot: 6 },
      armL: { rot: 22 },
      armR: { rot: 18 },
      legL: { rot: 10 },
      legR: { rot: 10 },
      tail: { rot: -10 },
    },
    laugh: {
      torso: { y: 2, rot: -3, squash: 0.05 },
      head: { rot: -12 },
      armL: { rot: -55 },
      armR: { rot: -50 },
      legL: { rot: -2 },
      legR: { rot: 2 },
      tail: { rot: 35 },
    },
    cover_mouth: {
      torso: { y: 3, rot: -2, squash: 0.03 },
      head: { rot: -6 },
      armL: { rot: -82 }, // 爪子捂嘴偷笑
      armR: { rot: -78 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 22 },
    },
    run: {
      torso: { y: -4, rot: 8, squash: 0 },
      head: { rot: -4 },
      armL: { rot: -30 },
      armR: { rot: 30 },
      legL: { rot: 35 },
      legR: { rot: -35 },
      tail: { rot: 25 },
    },
    lunge: {
      torso: { y: 10, rot: 16, squash: 0.06 },
      head: { rot: 14 },
      armL: { rot: -65 },
      armR: { rot: -60 },
      legL: { rot: -20 },
      legR: { rot: 25 },
      tail: { rot: 40 },
    },
    hug_bone: {
      torso: { y: 6, rot: 4, squash: 0.05 },
      head: { rot: 8 },
      armL: { rot: -80 },
      armR: { rot: -75 },
      legL: { rot: -4 },
      legR: { rot: 4 },
      tail: { rot: 38 },
    },
    cheer: {
      torso: { y: -12, rot: 0, squash: -0.05 },
      head: { rot: -10 },
      armL: { rot: -125 },
      armR: { rot: -120 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 38 },
    },
    whisper: {
      torso: { y: 2, rot: 6, squash: 0 },
      head: { rot: 8 },
      armL: { rot: -85 },
      armR: { rot: 10 },
      legL: { rot: -2 },
      legR: { rot: 4 },
      tail: { rot: 18 },
    },
    blow: {
      torso: { y: 6, rot: 18, squash: 0.04 }, // 前倾探头用力吹
      head: { rot: 16 },
      armL: { rot: 25 },
      armR: { rot: 20 },
      legL: { rot: -6 },
      legR: { rot: 6 },
      tail: { rot: 12 },
    },
    dance: {
      torso: { y: -4, rot: 0, squash: -0.02 },
      head: { rot: 0 },
      armL: { rot: -75 },
      armR: { rot: -75 },
      legL: { rot: -6 },
      legR: { rot: 6 },
      tail: { rot: 28 },
    },
  };

  // 计算动态姿势与物理次级动画 (彻底消灭高频鬼畜电机振动，注入布鲁伊风格舒适韵律)
  function evaluatePose(poseName, t, opts) {
    opts = opts || {};
    let base = POSES[poseName] || POSES.stand;
    let p = {
      torso: { ...base.torso },
      head: { ...base.head },
      armL: { ...base.armL },
      armR: { ...base.armR },
      legL: { ...base.legL },
      legR: { ...base.legR },
      tail: { ...base.tail },
    };

    // 1. 活泼小狗尾巴摆动 (自然 1.4~1.8 Hz 舒适弧形摇曳)
    const wagFreq = (poseName === 'laugh' || poseName === 'cheer' || poseName === 'hug_bone' || poseName === 'dance') ? 1.8 : 1.2;
    p.tail.rot += Math.sin(t * TAU * wagFreq) * 15 + Math.sin(t * TAU * wagFreq * 0.5) * 4;

    // 2. 拍手动态循环 (有节拍的啪啪合拢与停顿, 1.8 Hz 舒适幼儿韵律)
    if (poseName === 'clap') {
      const beat = (t * 1.8) % 1.0;
      let snap = 0, squash = 0;
      if (beat < 0.28) {
        const u = beat / 0.28;
        snap = Math.sin(u * Math.PI * 0.5);
      } else if (beat < 0.48) {
        snap = 1.0;
        squash = 0.05 * Math.sin((beat - 0.28) / 0.2 * Math.PI);
      } else {
        const u = (beat - 0.48) / 0.52;
        snap = 1.0 - Math.sin(u * Math.PI * 0.5);
      }
      p.armL.rot += snap * 16 - 8;
      p.armR.rot += snap * 16 - 8;
      p.torso.y += squash * 30;
      p.torso.squash += squash;
      p.head.rot += snap * 3 - 1.5;
    }

    // 3. 欢呼动态双手挥舞 (1.4 Hz 欢快高举摇曳，双手同向和谐摇摆)
    if (poseName === 'cheer') {
      const ph = Math.sin(t * TAU * 1.4);
      p.armL.rot += ph * 12;
      p.armR.rot += ph * 12;
      p.torso.y += Math.abs(ph) * 4.5;
      p.torso.rot += ph * 2.5;
      p.head.rot += ph * 3.5;
    }

    // 4. 奔跑动态步态 (2.4 Hz 轻快跳跃跑)
    if (poseName === 'run') {
      const stepFreq = 2.4;
      const ph = Math.sin(t * TAU * stepFreq);
      p.legL.rot += ph * 28;
      p.legR.rot -= ph * 28;
      p.armL.rot -= ph * 22;
      p.armR.rot += ph * 22;
      p.torso.y += Math.abs(ph) * 5.5;
      p.head.rot += Math.sin(t * TAU * stepFreq) * 3.5;
    }

    // 5. 快乐扭扭舞 (dance: 1.2 Hz 左右扭动与起伏)
    if (poseName === 'dance') {
      const dph = Math.sin(t * TAU * 1.2);
      p.torso.rot += dph * 5;
      p.torso.y += Math.abs(dph) * 4;
      p.head.rot -= dph * 3.5;
      p.armL.rot += dph * 14;
      p.armR.rot -= dph * 14;
    }

    // 6. 惊喜大笑 (laugh: 2.0 Hz 肚子笑颤)
    if (poseName === 'laugh') {
      const lph = Math.sin(t * TAU * 2.0);
      p.torso.y += Math.abs(lph) * 3.5;
      p.head.rot += lph * 3.5;
      p.armL.rot += lph * 4;
    }

    // 7. 指向 (point: 呼吸与确认性小点头)
    if (poseName === 'point') {
      const pph = Math.sin(t * TAU * 0.9);
      p.head.rot += pph * 2.5;
      p.armR.rot += pph * 3.0;
      p.torso.y += pph * 1.5;
    }

    // 8. 吹蜡烛身体向前用力呼吸
    if (poseName === 'blow') {
      const ph = Math.sin(t * TAU * 1.2);
      p.torso.rot += ph * 2.5;
      p.head.rot += ph * 3.0;
    }

    // 9. 站立呼吸微动 (0.6 Hz 舒缓起伏)
    if (poseName === 'stand') {
      const bph = Math.sin(t * TAU * 0.6);
      p.torso.y += bph * 2.2;
      p.head.rot += bph * 1.5;
      p.armL.rot += bph * 1.8;
      p.armR.rot -= bph * 1.8;
    }

    return p;
  }

  // 骨骼绘制主函数
  function draw(ctx, pupData, state, t) {
    if (!pupData || !pupData.imgs || !pupData.rig) return;
    const { imgs, rig } = pupData;
    const { parts, scale_base } = rig;

    const x = state.x || 0;
    const footY = state.footY || 880;
    const targetH = state.h || 420;
    const scale = targetH / scale_base;
    const facing = state.facing !== undefined ? state.facing : 1;
    const dy = state.dy || 0;
    const poseName = state.pose || 'stand';
    const p = evaluatePose(poseName, t, state);

    ctx.save();
    // 1. 移动到脚底中心
    ctx.translate(x, footY);

    // 2. 接地动态阴影 (随起跳高度自然变淡、变小)
    const jumpH = Math.max(0, -dy);
    const shadowScale = clamp(1.0 - jumpH / 260, 0.40, 1.0);
    const shadowAlpha = clamp(0.30 - jumpH / 450, 0.06, 0.30);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, (targetH * 0.34) * shadowScale, (targetH * 0.075) * shadowScale, 0, 0, TAU);
    ctx.fillStyle = `rgba(20, 50, 30, ${shadowAlpha})`;
    ctx.fill();
    ctx.restore();

    // 3. 角色缩放与朝向
    ctx.translate(0, dy + p.torso.y * scale);
    ctx.scale(facing * scale, scale);

    // Squash & Stretch
    const sq = (state.squash || 0) + (p.torso.squash || 0);
    if (sq !== 0) {
      ctx.scale(1 + 0.45 * sq, 1 - sq);
    }

    // 辅助绘制部件
    const drawPart = (pname, rotDeg) => {
      const pinfo = parts[pname];
      const img = imgs[pname];
      if (!pinfo || !img) return;
      ctx.save();
      ctx.translate(pinfo.pivot_from_root[0], pinfo.pivot_from_root[1]);
      if (rotDeg) ctx.rotate(rotDeg * DEG2RAD);
      ctx.drawImage(img, -pinfo.pivot_in_img[0], -pinfo.pivot_in_img[1]);
      ctx.restore();
    };

    // 绘制层序 (从后到前):
    // tail -> arm_r -> leg_r -> leg_l -> torso -> head -> arm_l -> [hat/item]
    drawPart('tail', p.tail.rot);
    drawPart('arm_r', p.armR.rot);
    drawPart('leg_r', p.legR.rot);
    drawPart('leg_l', p.legL.rot);
    drawPart('torso', p.torso.rot);

    // Head
    const headInfo = parts.head;
    if (headInfo && imgs.head) {
      ctx.save();
      ctx.translate(headInfo.pivot_from_root[0], headInfo.pivot_from_root[1]);
      if (p.head.rot) ctx.rotate(p.head.rot * DEG2RAD);
      ctx.drawImage(imgs.head, -headInfo.pivot_in_img[0], -headInfo.pivot_in_img[1]);

      // 派对帽 (party hat)
      if (state.hat && state.hat.visible && imgs.hat) {
        ctx.save();
        const isBingo = scale_base > 2000;
        const hatX = isBingo ? -20 : 0;
        const hatY = -headInfo.pivot_in_img[1] + (isBingo ? 110 : 45);
        ctx.translate(hatX, hatY);

        // 帽子惯性弹性微晃
        const hatWobble = Math.sin(t * TAU * 3.5) * 7 + (p.head.rot || 0) * 0.4;
        ctx.rotate(hatWobble * DEG2RAD);
        const hw = scale_base * 0.22, hh = scale_base * 0.32;
        ctx.drawImage(imgs.hat, -hw / 2, -hh, hw, hh);
        ctx.restore();
      }
      ctx.restore();
    }

    // Arm L
    drawPart('arm_l', p.armL.rot);

    // 手中道具: 大骨头 (bone)
    if (state.item && state.item === 'bone' && imgs.bone) {
      ctx.save();
      const armInfo = parts.arm_l;
      if (armInfo) {
        ctx.translate(armInfo.pivot_from_root[0], armInfo.pivot_from_root[1]);
        ctx.rotate(p.armL.rot * DEG2RAD);
        const bw = scale_base * 0.26, bh = bw * (imgs.bone.height / imgs.bone.width);
        ctx.drawImage(imgs.bone, -10, 30, bw, bh);
      }
      ctx.restore();
    }

    ctx.restore(); // end root
  }

  root.V11Pup = {
    POSES,
    evaluatePose,
    draw,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.V11Pup;
})(typeof globalThis !== 'undefined' ? globalThis : this);
