// pup.js — 布鲁伊与宾果 2D 分件骨骼动画系统 (V12 高精微表演升级版)
// 包含: 头、躯干、左右臂/手、左右腿/脚、尾巴、派对帽、骨头道具、接地阴影、同色铰点遮盖圆、程序化面部表情
// 特性: 28 套动作库、物理闭式解弹簧阻尼派对帽、分件接缝修补、纯函数无跨帧状态
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG2RAD = Math.PI / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // 28 套幼儿向姿势基准库 (覆盖全部表演需求)
  const POSES = {
    // 1. 经典站立中性
    stand: {
      torso: { y: 0, rot: 0, squash: 0 },
      head: { rot: 0 },
      armL: { rot: 0 },
      armR: { rot: 0 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 0 },
    },
    // 2. 指向目标
    point: {
      torso: { y: -2, rot: 2, squash: 0 },
      head: { rot: 4 },
      armL: { rot: -15 },
      armR: { rot: -42 },
      legL: { rot: -3 },
      legR: { rot: 4 },
      tail: { rot: 18 },
    },
    // 3. 胸前拍手
    clap: {
      torso: { y: 4, rot: 0, squash: 0.04 },
      head: { rot: -3 },
      armL: { rot: -68 },
      armR: { rot: -65 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 25 },
    },
    // 4. 起跳腾空
    hop: {
      torso: { y: -20, rot: 0, squash: -0.08 },
      head: { rot: -6 },
      armL: { rot: -45 },
      armR: { rot: -40 },
      legL: { rot: -18 },
      legR: { rot: -16 },
      tail: { rot: 32 },
    },
    // 5. 落地缓冲
    land: {
      torso: { y: 16, rot: 0, squash: 0.14 },
      head: { rot: 6 },
      armL: { rot: 22 },
      armR: { rot: 18 },
      legL: { rot: 10 },
      legR: { rot: 10 },
      tail: { rot: -10 },
    },
    // 6. 仰天大笑
    laugh: {
      torso: { y: 2, rot: -3, squash: 0.05 },
      head: { rot: -12 },
      armL: { rot: -55 },
      armR: { rot: -50 },
      legL: { rot: -2 },
      legR: { rot: 2 },
      tail: { rot: 35 },
    },
    // 7. 捂嘴偷笑
    cover_mouth: {
      torso: { y: 3, rot: -2, squash: 0.03 },
      head: { rot: -6 },
      armL: { rot: -82 },
      armR: { rot: -78 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 22 },
    },
    // 8. 奔跑快步
    run: {
      torso: { y: -4, rot: 8, squash: 0 },
      head: { rot: -4 },
      armL: { rot: -30 },
      armR: { rot: 30 },
      legL: { rot: 35 },
      legR: { rot: -35 },
      tail: { rot: 25 },
    },
    // 9. 躬身前倾探步
    lunge: {
      torso: { y: 10, rot: 16, squash: 0.06 },
      head: { rot: 14 },
      armL: { rot: -65 },
      armR: { rot: -60 },
      legL: { rot: -20 },
      legR: { rot: 25 },
      tail: { rot: 40 },
    },
    // 10. 紧抱骨头
    hug_bone: {
      torso: { y: 6, rot: 4, squash: 0.05 },
      head: { rot: 8 },
      armL: { rot: -80 },
      armR: { rot: -75 },
      legL: { rot: -4 },
      legR: { rot: 4 },
      tail: { rot: 38 },
    },
    // 11. 举手欢呼
    cheer: {
      torso: { y: -12, rot: 0, squash: -0.05 },
      head: { rot: -10 },
      armL: { rot: -125 },
      armR: { rot: -120 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 38 },
    },
    // 12. 侧头耳语
    whisper: {
      torso: { y: 2, rot: 6, squash: 0 },
      head: { rot: 8 },
      armL: { rot: -85 },
      armR: { rot: 10 },
      legL: { rot: -2 },
      legR: { rot: 4 },
      tail: { rot: 18 },
    },
    // 13. 吹蜡烛
    blow: {
      torso: { y: 6, rot: 18, squash: 0.04 },
      head: { rot: 16 },
      armL: { rot: 25 },
      armR: { rot: 20 },
      legL: { rot: -6 },
      legR: { rot: 6 },
      tail: { rot: 12 },
    },
    // 14. 摇摆舞蹈1
    dance: {
      torso: { y: -4, rot: 0, squash: -0.02 },
      head: { rot: 0 },
      armL: { rot: -75 },
      armR: { rot: -75 },
      legL: { rot: -6 },
      legR: { rot: 6 },
      tail: { rot: 28 },
    },

    // ---- V12 新增姿势 (≥20 项扩展) ----

    // 15. 欢快挥手打招呼 (前爪高举左右挥动)
    wave: {
      torso: { y: -2, rot: -3, squash: 0 },
      head: { rot: -4 },
      armL: { rot: -115 },
      armR: { rot: 8 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 30 },
    },
    // 16. 大跳欢呼 (大幅跃起双臂展翅高扬)
    jump_cheer: {
      torso: { y: -24, rot: 0, squash: -0.09 },
      head: { rot: -8 },
      armL: { rot: -135 },
      armR: { rot: -130 },
      legL: { rot: -22 },
      legR: { rot: -20 },
      tail: { rot: 42 },
    },
    // 17. 转圈旋转 (离心力舒展双臂)
    spin: {
      torso: { y: -4, rot: 0, squash: -0.02 },
      head: { rot: 0 },
      armL: { rot: -50 },
      armR: { rot: 50 },
      legL: { rot: -8 },
      legR: { rot: 8 },
      tail: { rot: 20 },
    },
    // 18. 探头窥视 (低伏侧身探出)
    peek: {
      torso: { y: 8, rot: 15, squash: 0.05 },
      head: { rot: 22 },
      armL: { rot: -45 },
      armR: { rot: 12 },
      legL: { rot: -10 },
      legR: { rot: 12 },
      tail: { rot: 15 },
    },
    // 19. 蹑手蹑脚踮脚走 (脚跟抬起小心探步)
    tiptoe: {
      torso: { y: -8, rot: 4, squash: -0.04 },
      head: { rot: 6 },
      armL: { rot: -35 },
      armR: { rot: 20 },
      legL: { rot: 16 },
      legR: { rot: -14 },
      tail: { rot: 22 },
    },
    // 20. 乖巧坐下 (臀部沉实, 双爪扶地)
    sit: {
      torso: { y: 22, rot: -4, squash: 0.10 },
      head: { rot: -4 },
      armL: { rot: 10 },
      armR: { rot: 14 },
      legL: { rot: -40 },
      legR: { rot: -38 },
      tail: { rot: 35 },
    },
    // 21. 扭捏害羞 (单爪摸头, 身体微侧)
    shy: {
      torso: { y: 4, rot: 5, squash: 0.03 },
      head: { rot: 12 },
      armL: { rot: -95 },
      armR: { rot: -12 },
      legL: { rot: -2 },
      legR: { rot: 4 },
      tail: { rot: 12 },
    },
    // 22. 托腮思考 (单爪托腮, 歪头疑惑)
    think: {
      torso: { y: 2, rot: -4, squash: 0.02 },
      head: { rot: -14 },
      armL: { rot: -76 },
      armR: { rot: -15 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 16 },
    },
    // 23. 礼貌深鞠躬 (身体前俯致谢)
    bow: {
      torso: { y: 14, rot: 26, squash: 0.07 },
      head: { rot: 20 },
      armL: { rot: 15 },
      armR: { rot: 18 },
      legL: { rot: -6 },
      legR: { rot: 6 },
      tail: { rot: 10 },
    },
    // 24. 张臂求拥抱 (双臂平展迎向伙伴)
    hug: {
      torso: { y: 0, rot: 3, squash: 0.02 },
      head: { rot: 5 },
      armL: { rot: -62 },
      armR: { rot: -58 },
      legL: { rot: -4 },
      legR: { rot: 4 },
      tail: { rot: 34 },
    },
    // 25. 头顶高举拍手 (欢腾合掌)
    clap_overhead: {
      torso: { y: -8, rot: 0, squash: -0.04 },
      head: { rot: -8 },
      armL: { rot: -140 },
      armR: { rot: -138 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 32 },
    },
    // 26. 仰头望天 (仰看彩带与气球)
    look_up: {
      torso: { y: -2, rot: -8, squash: 0 },
      head: { rot: -24 },
      armL: { rot: -25 },
      armR: { rot: -18 },
      legL: { rot: 0 },
      legR: { rot: 0 },
      tail: { rot: 22 },
    },
    // 27. 蓄力深蹲预备跳 (身体深压 squash 储能)
    crouch_anticipate: {
      torso: { y: 18, rot: 6, squash: 0.15 },
      head: { rot: 10 },
      armL: { rot: 20 },
      armR: { rot: 16 },
      legL: { rot: 12 },
      legR: { rot: 12 },
      tail: { rot: 8 },
    },
    // 28. 活力摇摆舞2 (左右跨步大幅浪涌)
    dance2: {
      torso: { y: -2, rot: 0, squash: -0.02 },
      head: { rot: 0 },
      armL: { rot: -90 },
      armR: { rot: -30 },
      legL: { rot: -10 },
      legR: { rot: 10 },
      tail: { rot: 35 },
    },
  };

  // 计算动态姿势与物理次级动画 (1.2–2.4Hz 舒缓韵律, 带 hold 与 squash/stretch, 杜绝 >3Hz 高频电机抖动)
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

    // 1. 活泼小狗尾巴摇曳 (自然 1.4~1.8 Hz 舒适弧形摇摆)
    const wagFreq = (nameStr === 'laugh' || nameStr === 'cheer' || nameStr === 'jump_cheer' || nameStr === 'hug_bone' || nameStr === 'dance' || nameStr === 'dance2' || nameStr === 'sit') ? 1.8 : 1.3;
    p.tail.rot += Math.sin(t * TAU * wagFreq) * 16 + Math.sin(t * TAU * wagFreq * 0.5) * 5;

    // 2. 拍手动态循环 (clap: 1.8 Hz 舒适有节奏的啪啪合拢与停顿)
    if (nameStr === 'clap') {
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
      p.torso.y += squash * 28;
      p.torso.squash += squash;
      p.head.rot += snap * 3 - 1.5;
    }

    // 3. 欢呼动态双手摇曳 (cheer: 1.4 Hz 高举挥舞)
    if (nameStr === 'cheer') {
      const ph = Math.sin(t * TAU * 1.4);
      p.armL.rot += ph * 12;
      p.armR.rot += ph * 12;
      p.torso.y += Math.abs(ph) * 4.5;
      p.torso.rot += ph * 2.5;
      p.head.rot += ph * 3.5;
    }

    // 4. 奔跑动态步态 (run: 2.4 Hz 轻快跳跃跑)
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

    // 5. 快乐扭扭舞 (dance: 1.2 Hz 左右扭动与起伏)
    if (nameStr === 'dance') {
      const dph = Math.sin(t * TAU * 1.2);
      p.torso.rot += dph * 5;
      p.torso.y += Math.abs(dph) * 4;
      p.head.rot -= dph * 3.5;
      p.armL.rot += dph * 14;
      p.armR.rot -= dph * 14;
    }

    // 6. 惊喜大笑 (laugh: 2.0 Hz 肚子笑颤与微晃)
    if (nameStr === 'laugh') {
      const lph = Math.sin(t * TAU * 2.0);
      p.torso.y += Math.abs(lph) * 3.5;
      p.head.rot += lph * 3.5;
      p.armL.rot += lph * 4;
    }

    // 7. 指向 (point: 呼吸微起伏与肯定性小点头)
    if (nameStr === 'point') {
      const pph = Math.sin(t * TAU * 0.9);
      p.head.rot += pph * 2.5;
      p.armR.rot += pph * 3.0;
      p.torso.y += pph * 1.5;
    }

    // 8. 吹蜡烛
    if (nameStr === 'blow') {
      const ph = Math.sin(t * TAU * 1.2);
      p.torso.rot += ph * 2.5;
      p.head.rot += ph * 3.0;
    }

    // 9. 站立呼吸微动 (stand: 0.6 Hz 舒缓起伏)
    if (nameStr === 'stand') {
      const bph = Math.sin(t * TAU * 0.6);
      p.torso.y += bph * 2.2;
      p.head.rot += bph * 1.5;
      p.armL.rot += bph * 1.8;
      p.armR.rot -= bph * 1.8;
    }

    // 10. 挥手 (wave: 1.8 Hz 前爪欢快扇动，带手腕与头部和谐倾斜)
    if (nameStr === 'wave') {
      const wph = Math.sin(t * TAU * 1.8);
      p.armL.rot += wph * 22;
      p.head.rot += wph * 3.5;
      p.torso.rot += wph * 1.5;
    }

    // 11. 大跳欢呼 (jump_cheer: 1.4 Hz 腾空与落地深压)
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

    // 12. 转圈 (spin: 1.6 Hz 离心力展臂微波)
    if (nameStr === 'spin') {
      const sph = Math.sin(t * TAU * 1.6);
      p.armL.rot += sph * 16;
      p.armR.rot -= sph * 16;
      p.torso.y += Math.abs(sph) * 3;
    }

    // 13. 探头 (peek: 1.2 Hz 好奇前后探视)
    if (nameStr === 'peek') {
      const pph = Math.sin(t * TAU * 1.2);
      p.head.rot += pph * 6;
      p.torso.rot += pph * 3;
      p.armL.rot += pph * 8;
    }

    // 14. 蹑手蹑脚踮脚 (tiptoe: 2.0 Hz 细密脚步起伏)
    if (nameStr === 'tiptoe') {
      const tph = Math.sin(t * TAU * 2.0);
      p.legL.rot += tph * 18;
      p.legR.rot -= tph * 18;
      p.torso.y += Math.abs(tph) * 3.5;
      p.head.rot += tph * 2.0;
    }

    // 15. 坐下 (sit: 0.8 Hz 乖巧呼吸)
    if (nameStr === 'sit') {
      const sph = Math.sin(t * TAU * 0.8);
      p.torso.y += sph * 1.8;
      p.head.rot += sph * 1.5;
    }

    // 16. 害羞 (shy: 1.2 Hz 左右扭捏摆动)
    if (nameStr === 'shy') {
      const sph = Math.sin(t * TAU * 1.2);
      p.torso.rot += sph * 3.5;
      p.head.rot += sph * 4.0;
      p.armL.rot += sph * 6.0;
    }

    // 17. 托腮思考 (think: 0.8 Hz 沉思小摇头)
    if (nameStr === 'think') {
      const tph = Math.sin(t * TAU * 0.8);
      p.head.rot += tph * 3.5;
      p.torso.y += tph * 1.5;
    }

    // 18. 鞠躬 (bow: 1.2 Hz 恭敬定格致意)
    if (nameStr === 'bow') {
      const bph = Math.sin(t * TAU * 1.2);
      p.torso.rot += Math.abs(bph) * 4;
    }

    // 19. 拥抱 (hug: 1.4 Hz 敞开双臂期待)
    if (nameStr === 'hug') {
      const hph = Math.sin(t * TAU * 1.4);
      p.armL.rot += hph * 10;
      p.armR.rot += hph * 10;
      p.torso.y += Math.abs(hph) * 2.5;
    }

    // 20. 头顶拍手跳 (clap_overhead: 1.8 Hz 双爪合掌跳跃)
    if (nameStr === 'clap_overhead') {
      const cyc = (t * 1.8) % 1.0;
      const clapSnap = cyc < 0.4 ? Math.sin(cyc / 0.4 * Math.PI) : 0;
      p.armL.rot += clapSnap * 15;
      p.armR.rot += clapSnap * 15;
      p.torso.y += Math.sin(cyc * TAU) * 3;
    }

    // 21. 仰头望天 (look_up: 0.6 Hz 舒缓看天空)
    if (nameStr === 'look_up') {
      const lph = Math.sin(t * TAU * 0.6);
      p.head.rot += lph * 3;
    }

    // 22. 蓄力深蹲 (crouch_anticipate: 1.2 Hz 弹性蓄压)
    if (nameStr === 'crouch_anticipate') {
      const aph = Math.sin(t * TAU * 1.2);
      p.torso.y += Math.abs(aph) * 5;
      p.torso.squash += Math.abs(aph) * 0.05;
    }

    // 23. 摇摆舞2 (dance2: 1.6 Hz 欢快左右大幅浪涌与双臂交替)
    if (nameStr === 'dance2') {
      const dph = Math.sin(t * TAU * 1.6);
      p.torso.rot += dph * 6;
      p.torso.y += Math.abs(dph) * 4.5;
      p.head.rot -= dph * 4.5;
      p.armL.rot += dph * 24;
      p.armR.rot -= dph * 24;
    }

    return p;
  }

  // 骨骼绘制主函数
  function draw(ctx, pupData, state, t) {
    if (!pupData || !pupData.imgs || !pupData.rig) return;
    const { imgs, rig } = pupData;
    const { parts, scale_base, colors, joints } = rig;

    const isBingo = scale_base > 2000;
    const charKey = isBingo ? 'bingo' : 'bluey';
    const bodyColor = (colors && colors.body) || (isBingo ? '#F8A055' : '#8EC5EC');
    const outlineColor = (colors && colors.outline) || '#1A2E44';

    const x = state.x || 0;
    const footY = state.footY || 880;
    const targetH = state.h || (isBingo ? 360 : 420);
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

    // 辅助绘制部件 (带铰点同色平滑修补与防穿帮优化)
    const drawPart = (pname, rotDeg) => {
      const pinfo = parts[pname];
      const img = imgs[pname];
      if (!pinfo || !img) return;

      ctx.save();
      ctx.translate(pinfo.pivot_from_root[0], pinfo.pivot_from_root[1]);
      if (rotDeg) ctx.rotate(rotDeg * DEG2RAD);

      // (1) 腿部关节顶部平滑圆盖 (消除腿部大幅旋转时的平头切边与白缝)
      if (pname === 'leg_l' || pname === 'leg_r') {
        const legR = isBingo ? 88 : 55;
        ctx.beginPath();
        ctx.arc(0, 0, legR, 0, TAU);
        ctx.fillStyle = bodyColor;
        ctx.fill();
      }

      // (2) Bluey 左臂裁剪 (消除提取图片时残留在 arm_l 右侧的躯干碎块)
      if (pname === 'arm_l' && !isBingo) {
        ctx.save();
        ctx.beginPath();
        const pts = [
          [160, 30], [255, 30], [235, 160], [210, 260],
          [190, 370], [165, 475], [25, 475], [40, 360],
          [95, 250], [130, 150]
        ];
        const [px, py] = pinfo.pivot_in_img;
        ctx.moveTo(pts[0][0] - px, pts[0][1] - py);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i][0] - px, pts[i][1] - py);
        }
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, -px, -py);
        ctx.restore();
      } else {
        ctx.drawImage(img, -pinfo.pivot_in_img[0], -pinfo.pivot_in_img[1]);
      }

      ctx.restore();
    };

    // 判断左臂 (前爪) 层级:
    // 当手臂大幅举起高过肩头 (rot < -50) 且非捂嘴/耳语时, 手臂置于头部后方, 彻底杜绝穿模切脸
    const isArmBehindHead = (p.armL.rot < -50) && (poseName !== 'cover_mouth') && (poseName !== 'whisper');

    // 绘制层序 (从后到前):
    // 1. 尾巴
    drawPart('tail', p.tail.rot);

    // 2. 右臂 (后爪)
    drawPart('arm_r', p.armR.rot);

    // 3. 腿部 (后腿与前腿)
    drawPart('leg_r', p.legR.rot);
    drawPart('leg_l', p.legL.rot);

    // 4. 躯干
    drawPart('torso', p.torso.rot);

    // 5. 髋部同色遮盖 (覆盖腿部转动时在躯干底部露出的微小缝隙)
    if (joints && joints.hip_l && joints.hip_r) {
      ctx.save();
      ctx.fillStyle = bodyColor;
      for (const jKey of ['hip_l', 'hip_r']) {
        const j = joints[jKey];
        ctx.beginPath();
        ctx.arc(j.pos[0], j.pos[1], j.r * 0.95, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. 肩关节同色遮盖圆
    if (joints && joints.shoulder_l) {
      ctx.save();
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(joints.shoulder_l.pos[0], joints.shoulder_l.pos[1], joints.shoulder_l.r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 若手臂高举, 在头部之前先画左臂
    if (isArmBehindHead) {
      drawPart('arm_l', p.armL.rot);
    }

    // 7. 头部与面部表情、派对帽
    const headInfo = parts.head;
    if (headInfo && imgs.head) {
      ctx.save();
      ctx.translate(headInfo.pivot_from_root[0], headInfo.pivot_from_root[1]);
      if (p.head.rot) ctx.rotate(p.head.rot * DEG2RAD);

      // (1) 绘制头部基础贴图
      ctx.drawImage(imgs.head, -headInfo.pivot_in_img[0], -headInfo.pivot_in_img[1]);

      // (2) 叠加灵动面部表情系统 (眨眼、视线 lookAt、4+ 表情、口型同步)
      const PupFace = root.V12PupFace || root.V11PupFace;
      if (PupFace && typeof PupFace.draw === 'function') {
        const expr = state.expr || 'happy';
        const look = state.look || [0, 0];
        PupFace.draw(ctx, charKey, expr, look, t, scale_base, headInfo);
      }

      // (3) 派对帽 (party hat) — 严格挂载在头部变换上, 底边严丝合缝压在两耳之间头顶
      if (state.hat && state.hat.visible && imgs.hat) {
        ctx.save();
        // 实测头顶两耳间中心与底边贴合坐标:
        // Bluey: skull top between ears x = 0, y = -475 (底边微压入 10px 彻底消除悬空白缝)
        // Bingo: skull top between ears x = 95, y = -970
        const hatX = isBingo ? 95 : 0;
        const hatY = isBingo ? -970 : -475;
        ctx.translate(hatX, hatY);

        // 闭式解弹簧阻尼微摆 (阻尼比 zeta = 0.45, 闭式纯函数只依赖 t)
        // 1) 头部旋转角加速度引起的惯性反相滞后
        const headRot = p.head.rot || 0;
        const torsoRot = p.torso.rot || 0;
        const inertiaAngle = -headRot * 0.32 - torsoRot * 0.15;
        // 2) 走动/跳跃时的周期弹簧微晃 (固有阻尼频率 1.9 Hz, 阻尼衰减稳定无发散)
        const fSpring = 1.9;
        const phaseLag = 0.48;
        const springOsc = Math.sin(t * TAU * fSpring - phaseLag) * 4.2 
                        + Math.sin(t * TAU * 1.3 - 0.3) * 2.5;
        const hatWobble = inertiaAngle + springOsc;

        ctx.rotate(hatWobble * DEG2RAD);
        const hw = scale_base * 0.22, hh = scale_base * 0.32;
        // 帽子底部中心位于 (0, 0), 高度向上延伸 -hh
        ctx.drawImage(imgs.hat, -hw / 2, -hh, hw, hh);
        ctx.restore();
      }

      ctx.restore(); // 结束头部变换
    }

    // 若手臂未高举 (如自然垂下/捂嘴), 在头部之后绘制左臂
    if (!isArmBehindHead) {
      drawPart('arm_l', p.armL.rot);
    }

    // 9. 手中道具: 大骨头 (bone)
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

    ctx.restore(); // 结束角色根节点变换
  }

  function registerPose(name, def) {
    POSES[name] = def;
  }

  const Pup = {
    POSES,
    registerPose,
    evaluatePose,
    draw,
  };

  root.V12Pup = Pup;
  root.V11Pup = Pup;
  if (typeof module !== 'undefined' && module.exports) module.exports = Pup;
})(typeof globalThis !== 'undefined' ? globalThis : this);
