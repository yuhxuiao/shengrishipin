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

  // 2. 28 套动作库定义 (与 pup.js 保持一致, 全面升级为二段铰链运动学)
  const POSES = {
    // 1. 经典站立中性 (自然微曲, 杜绝火柴人僵直)
    stand: {
      torso: { y: 0, rot: 0, squash: 0 },
      head: { rot: 0 },
      armL: { rot: 0, elbow: 12 },
      armR: { rot: 0, elbow: 12 },
      legL: { rot: 0, knee: 0 },
      legR: { rot: 0, knee: 0 },
      tail: { rot: 0 },
    },
    // 2. 指向目标 (前臂平伸食爪指向前方)
    point: {
      torso: { y: -2, rot: 2, squash: 0 },
      head: { rot: 4 },
      armL: { rot: 12, elbow: 15 },
      armR: { rot: -88, elbow: 10 },
      legL: { rot: -4, knee: 6 },
      legR: { rot: 6, knee: 4 },
      tail: { rot: 18 },
    },
    // 3. 胸前拍手 (双臂前伸, 双肘向内屈曲 75°, 双爪在胸前紧合)
    clap: {
      torso: { y: 4, rot: 0, squash: 0.04 },
      head: { rot: -3 },
      armL: { rot: -45, elbow: 75 },
      armR: { rot: 47, elbow: 78 },
      legL: { rot: 0, knee: 0 },
      legR: { rot: 0, knee: 0 },
      tail: { rot: 25 },
    },
    // 4. 起跳腾空 (双膝后折收拢, 双臂自然展翅)
    hop: {
      torso: { y: -20, rot: 0, squash: -0.08 },
      head: { rot: -6 },
      armL: { rot: 52, elbow: 38 },
      armR: { rot: -46, elbow: 36 },
      legL: { rot: -22, knee: 48 },
      legR: { rot: -18, knee: 44 },
      tail: { rot: 32 },
    },
    // 5. 落地缓冲 (双膝前屈深蹲缓冲, 身体 squash)
    land: {
      torso: { y: 16, rot: 0, squash: 0.14 },
      head: { rot: 6 },
      armL: { rot: 24, elbow: 42 },
      armR: { rot: 18, elbow: 38 },
      legL: { rot: -14, knee: 38 },
      legR: { rot: -14, knee: 38 },
      tail: { rot: -10 },
    },
    // 6. 仰天大笑 (手肘弯曲捧腹乐开怀)
    laugh: {
      torso: { y: 2, rot: -3, squash: 0.05 },
      head: { rot: -12 },
      armL: { rot: -58, elbow: 65 },
      armR: { rot: -52, elbow: 62 },
      legL: { rot: -3, knee: 8 },
      legR: { rot: 3, knee: 6 },
      tail: { rot: 35 },
    },
    // 7. 捂嘴偷笑 (手肘深屈 88°, 爪子遮住嘴巴)
    cover_mouth: {
      torso: { y: 3, rot: -2, squash: 0.03 },
      head: { rot: -6 },
      armL: { rot: -78, elbow: 88 },
      armR: { rot: -72, elbow: 85 },
      legL: { rot: 0, knee: 4 },
      legR: { rot: 0, knee: 4 },
      tail: { rot: 22 },
    },
    // 8. 奔跑快步 (前臂屈曲 85° 前摆, 前腿提膝 55°, 后腿蹬伸)
    run: {
      torso: { y: -4, rot: 8, squash: 0 },
      head: { rot: -4 },
      armL: { rot: -50, elbow: 85 },
      armR: { rot: 35, elbow: 45 },
      legL: { rot: -30, knee: 45 },
      legR: { rot: 32, knee: 12 },
      tail: { rot: 25 },
    },
    // 9. 躬身前倾探步 (前膝深曲探步, 动感张力)
    lunge: {
      torso: { y: 10, rot: 16, squash: 0.06 },
      head: { rot: 14 },
      armL: { rot: -65, elbow: 45 },
      armR: { rot: -55, elbow: 40 },
      legL: { rot: -35, knee: 50 },
      legR: { rot: 30, knee: 20 },
      tail: { rot: 40 },
    },
    // 10. 紧抱骨头 (双臂呈弧形环抱, 肘部包裹两端)
    hug_bone: {
      torso: { y: 6, rot: 4, squash: 0.05 },
      head: { rot: 8 },
      armL: { rot: -60, elbow: 78 },
      armR: { rot: 53, elbow: 85 },
      legL: { rot: -4, knee: 10 },
      legR: { rot: 4, knee: 8 },
      tail: { rot: 38 },
    },
    // 11. 举手欢呼 (双臂高举 V 形, 手肘微屈自然松弛)
    cheer: {
      torso: { y: -12, rot: 0, squash: -0.05 },
      head: { rot: -10 },
      armL: { rot: 125, elbow: 20 },
      armR: { rot: -125, elbow: 20 },
      legL: { rot: 0, knee: 6 },
      legR: { rot: 0, knee: 6 },
      tail: { rot: 38 },
    },
    // 12. 侧头耳语 (爪子靠拢耳旁)
    whisper: {
      torso: { y: 2, rot: 6, squash: 0 },
      head: { rot: 8 },
      armL: { rot: -82, elbow: 85 },
      armR: { rot: 10, elbow: 20 },
      legL: { rot: -2, knee: 6 },
      legR: { rot: 4, knee: 6 },
      tail: { rot: 18 },
    },
    // 13. 吹蜡烛 (躬身前倾, 肢体舒展)
    blow: {
      torso: { y: 6, rot: 18, squash: 0.04 },
      head: { rot: 16 },
      armL: { rot: 25, elbow: 30 },
      armR: { rot: 20, elbow: 28 },
      legL: { rot: -6, knee: 14 },
      legR: { rot: 6, knee: 10 },
      tail: { rot: 12 },
    },
    // 14. 摇摆舞蹈1 (左右手曲臂节拍摆动)
    dance: {
      torso: { y: -4, rot: 0, squash: -0.02 },
      head: { rot: 0 },
      armL: { rot: -65, elbow: 55 },
      armR: { rot: -65, elbow: 55 },
      legL: { rot: -8, knee: 18 },
      legR: { rot: 8, knee: 18 },
      tail: { rot: 28 },
    },
    // 15. 欢快挥手打招呼 (上臂抬高, 小臂竖起并绕肘部摇摆)
    wave: {
      torso: { y: -2, rot: -3, squash: 0 },
      head: { rot: -4 },
      armL: { rot: 12, elbow: 15 },
      armR: { rot: -135, elbow: 18 },
      legL: { rot: 0, knee: 4 },
      legR: { rot: 0, knee: 4 },
      tail: { rot: 30 },
    },
    // 16. 大跳欢呼 (大幅跃起双臂展翅, 小腿后折收拢)
    jump_cheer: {
      torso: { y: -24, rot: 0, squash: -0.09 },
      head: { rot: -8 },
      armL: { rot: 130, elbow: 22 },
      armR: { rot: -130, elbow: 22 },
      legL: { rot: -24, knee: 60 },
      legR: { rot: -20, knee: 55 },
      tail: { rot: 42 },
    },
    // 17. 转圈旋转 (离心力舒展微屈双臂)
    spin: {
      torso: { y: -4, rot: 0, squash: -0.02 },
      head: { rot: 0 },
      armL: { rot: -52, elbow: 25 },
      armR: { rot: 48, elbow: 25 },
      legL: { rot: -8, knee: 14 },
      legR: { rot: 8, knee: 14 },
      tail: { rot: 20 },
    },
    // 18. 探头窥视 (低伏探出, 膝盖微弯)
    peek: {
      torso: { y: 8, rot: 15, squash: 0.05 },
      head: { rot: 22 },
      armL: { rot: -45, elbow: 55 },
      armR: { rot: 12, elbow: 28 },
      legL: { rot: -14, knee: 32 },
      legR: { rot: 14, knee: 24 },
      tail: { rot: 15 },
    },
    // 19. 蹑手蹑脚踮脚走 (脚跟抬起, 膝盖微屈探步)
    tiptoe: {
      torso: { y: -8, rot: 4, squash: -0.04 },
      head: { rot: 6 },
      armL: { rot: -32, elbow: 42 },
      armR: { rot: 22, elbow: 38 },
      legL: { rot: 18, knee: 20 },
      legR: { rot: -16, knee: 18 },
      tail: { rot: 22 },
    },
    // 20. 乖巧坐下 (大腿前伸, 膝盖后折坐实, 双爪扶膝)
    sit: {
      torso: { y: 22, rot: -4, squash: 0.10 },
      head: { rot: -4 },
      armL: { rot: -5, elbow: 25 },
      armR: { rot: 0, elbow: 22 },
      legL: { rot: -65, knee: 75 },
      legR: { rot: -62, knee: 72 },
      tail: { rot: 35 },
    },
    // 21. 扭捏害羞 (单爪摸头, 手肘弯折 90°)
    shy: {
      torso: { y: 4, rot: 5, squash: 0.03 },
      head: { rot: 12 },
      armL: { rot: -95, elbow: 90 },
      armR: { rot: -12, elbow: 20 },
      legL: { rot: -3, knee: 10 },
      legR: { rot: 4, knee: 8 },
      tail: { rot: 12 },
    },
    // 22. 托腮思考 (手肘支撑托腮, 歪头沉思)
    think: {
      torso: { y: 2, rot: -4, squash: 0.02 },
      head: { rot: -14 },
      armL: { rot: -76, elbow: 85 },
      armR: { rot: -15, elbow: 22 },
      legL: { rot: 0, knee: 4 },
      legR: { rot: 0, knee: 4 },
      tail: { rot: 16 },
    },
    // 23. 礼貌深鞠躬 (身体前俯致谢)
    bow: {
      torso: { y: 14, rot: 26, squash: 0.07 },
      head: { rot: 20 },
      armL: { rot: 18, elbow: 20 },
      armR: { rot: 22, elbow: 20 },
      legL: { rot: -8, knee: 18 },
      legR: { rot: 8, knee: 14 },
      tail: { rot: 10 },
    },
    // 24. 张臂求拥抱 (双臂曲弧前迎)
    hug: {
      torso: { y: 0, rot: 3, squash: 0.02 },
      head: { rot: 5 },
      armL: { rot: -55, elbow: 50 },
      armR: { rot: -50, elbow: 52 },
      legL: { rot: -4, knee: 8 },
      legR: { rot: 4, knee: 8 },
      tail: { rot: 34 },
    },
    // 25. 头顶高举拍手 (双爪合掌欢腾)
    clap_overhead: {
      torso: { y: -8, rot: 0, squash: -0.04 },
      head: { rot: -8 },
      armL: { rot: -135, elbow: 45 },
      armR: { rot: -132, elbow: 48 },
      legL: { rot: 0, knee: 4 },
      legR: { rot: 0, knee: 4 },
      tail: { rot: 32 },
    },
    // 26. 仰头望天 (舒缓看天空)
    look_up: {
      torso: { y: -2, rot: -8, squash: 0 },
      head: { rot: -24 },
      armL: { rot: -22, elbow: 25 },
      armR: { rot: -16, elbow: 22 },
      legL: { rot: 0, knee: 4 },
      legR: { rot: 0, knee: 4 },
      tail: { rot: 22 },
    },
    // 27. 蓄力深蹲预备跳 (双膝向前微屈下蹲缓冲，身体下沉 squash)
    crouch_anticipate: {
      torso: { y: 18, rot: 6, squash: 0.15 },
      head: { rot: 10 },
      armL: { rot: 24, elbow: 45 },
      armR: { rot: 20, elbow: 42 },
      legL: { rot: -16, knee: 42 },
      legR: { rot: -16, knee: 42 },
      tail: { rot: 8 },
    },
    // 28. 活力摇摆舞2 (左右交替大幅浪涌)
    dance2: {
      torso: { y: -2, rot: 0, squash: -0.02 },
      head: { rot: 0 },
      armL: { rot: -85, elbow: 65 },
      armR: { rot: -25, elbow: 45 },
      legL: { rot: -12, knee: 22 },
      legR: { rot: 12, knee: 20 },
      tail: { rot: 35 },
    },
  };

  // 评估姿态与次级摆动动力学 (舒缓纯粹确定性驱动, 彻底消除内部步态差频抽搐)
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

    // 1. 活泼小狗尾巴摇曳 (自然 1.3~1.8 Hz 舒适弧形摇摆)
    const wagFreq = (nameStr === 'laugh' || nameStr === 'cheer' || nameStr === 'jump_cheer' || nameStr === 'hug_bone' || nameStr === 'dance' || nameStr === 'dance2' || nameStr === 'sit') ? 1.8 : 1.3;
    p.tail.rot += Math.sin(t * TAU * wagFreq) * 16 + Math.sin(t * TAU * wagFreq * 0.5) * 5;

    // 2. 拍手动态循环 (clap: 上臂与双肘双节协同合掌)
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
      p.armL.elbow += snap * 10;
      p.armR.elbow += snap * 10;
      p.armL.rot -= snap * 4;
      p.armR.rot -= snap * 4;
      p.torso.y += squash * 20;
      p.torso.squash = (p.torso.squash || 0) + squash;
      p.head.rot += snap * 2 - 1;
    }

    // 3. 欢呼动态双手摇曳 (cheer: 1.4 Hz 双手肘微屈摇摆)
    if (nameStr === 'cheer') {
      const ph = Math.sin(t * TAU * 1.4);
      p.armL.rot -= ph * 8;
      p.armR.rot += ph * 8;
      p.armL.elbow += ph * 6;
      p.armR.elbow += ph * 6;
      p.torso.y += Math.abs(ph) * 4.0;
      p.torso.rot += ph * 2.0;
      p.head.rot += ph * 3.0;
    }

    // 4. 奔跑动态: 彻底移除内部私自添加的 2.4Hz 震颤代码！步态完全由 timeline.js 的 2.5Hz 步态角度驱动！
    // 杜绝 2.4Hz 与 2.5Hz 叠加产生 0.1Hz 剧烈抽搐差频。

    // 5. 快乐扭扭舞 (dance: 1.2 Hz 左右扭动与起伏)
    if (nameStr === 'dance') {
      const dph = Math.sin(t * TAU * 1.2);
      p.torso.rot += dph * 5;
      p.torso.y += Math.abs(dph) * 4;
      p.head.rot -= dph * 3.5;
      p.armL.rot += dph * 12;
      p.armR.rot -= dph * 12;
      p.armL.elbow += Math.abs(dph) * 10;
      p.armR.elbow += Math.abs(dph) * 10;
    }

    // 6. 惊喜大笑 (laugh: 2.0 Hz 肚子笑颤与微晃)
    if (nameStr === 'laugh') {
      const lph = Math.sin(t * TAU * 2.0);
      p.torso.y += Math.abs(lph) * 3.5;
      p.head.rot += lph * 3.5;
      p.armL.elbow += lph * 6;
    }

    // 7. 指向 (point: 呼吸微起伏与肯定性小点头)
    if (nameStr === 'point') {
      const pph = Math.sin(t * TAU * 0.9);
      p.head.rot += pph * 2.5;
      p.armR.rot += pph * 2.0;
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
      p.torso.y += bph * 2.0;
      p.head.rot += bph * 1.2;
    }

    // 10. 挥手 (wave: 1.8 Hz 上臂稳定, 小臂围绕肘部扇动)
    if (nameStr === 'wave') {
      const wph = Math.sin(t * TAU * 1.8);
      p.armR.rot += wph * 8;
      p.armR.elbow += wph * 15;
      p.head.rot += wph * 3.0;
      p.torso.rot += wph * 1.2;
    }

    // 11. 大跳欢呼 (jump_cheer: 1.4 Hz 腾空与落地深压, 小腿后折)
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
      p.torso.squash = (p.torso.squash || 0) + hopSq;
      p.armL.rot -= Math.sin(cyc * TAU) * 10;
      p.armR.rot += Math.sin(cyc * TAU) * 10;
      p.armL.elbow += Math.sin(cyc * TAU) * 8;
      p.armR.elbow += Math.sin(cyc * TAU) * 8;
    }

    // 12. 转圈 (spin: 1.6 Hz 离心力展臂微波)
    if (nameStr === 'spin') {
      const sph = Math.sin(t * TAU * 1.6);
      p.armL.rot += sph * 12;
      p.armR.rot -= sph * 12;
      p.torso.y += Math.abs(sph) * 3;
    }

    // 13. 探头 (peek: 1.2 Hz 好奇前后探视)
    if (nameStr === 'peek') {
      const pph = Math.sin(t * TAU * 1.2);
      p.head.rot += pph * 5;
      p.torso.rot += pph * 2.5;
      p.armL.elbow += pph * 6;
    }

    // 14. 蹑手蹑脚踮脚 (tiptoe: 2.0 Hz 细密脚步起伏)
    if (nameStr === 'tiptoe') {
      const tph = Math.sin(t * TAU * 2.0);
      p.legL.rot += tph * 14;
      p.legR.rot -= tph * 14;
      p.legL.knee += Math.abs(tph) * 8;
      p.legR.knee += Math.abs(tph) * 8;
      p.torso.y += Math.abs(tph) * 3.5;
      p.head.rot += tph * 1.8;
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
      p.armL.elbow += sph * 8.0;
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
      p.torso.rot += Math.abs(bph) * 3.5;
    }

    // 19. 拥抱 (hug: 1.4 Hz 敞开双臂期待)
    if (nameStr === 'hug') {
      const hph = Math.sin(t * TAU * 1.4);
      p.armL.rot += hph * 8;
      p.armR.rot += hph * 8;
      p.armL.elbow += hph * 10;
      p.armR.elbow += hph * 10;
      p.torso.y += Math.abs(hph) * 2.5;
    }

    // 20. 头顶拍手跳 (clap_overhead: 1.8 Hz 双爪合掌跳跃)
    if (nameStr === 'clap_overhead') {
      const cyc = (t * 1.8) % 1.0;
      const clapSnap = cyc < 0.4 ? Math.sin((cyc / 0.4) * Math.PI) : 0;
      p.armL.rot += clapSnap * 10;
      p.armR.rot += clapSnap * 10;
      p.armL.elbow += clapSnap * 12;
      p.armR.elbow += clapSnap * 12;
      p.torso.y += Math.sin(cyc * TAU) * 3;
    }

    // 21. 仰头望天 (look_up: 0.6 Hz 舒缓看天空)
    if (nameStr === 'look_up') {
      const lph = Math.sin(t * TAU * 0.6);
      p.head.rot += lph * 3;
    }

    // 22. 蓄力深蹲 (crouch_anticipate: 1.2 Hz 弹性蓄压, 双膝微屈)
    if (nameStr === 'crouch_anticipate') {
      const aph = Math.sin(t * TAU * 1.2);
      p.torso.y += Math.abs(aph) * 4;
      p.torso.squash = (p.torso.squash || 0) + Math.abs(aph) * 0.05;
      p.legL.knee += Math.abs(aph) * 8;
      p.legR.knee += Math.abs(aph) * 8;
    }

    // 23. 摇摆舞2 (dance2: 1.6 Hz 欢快左右大幅浪涌与双臂交替)
    if (nameStr === 'dance2') {
      const dph = Math.sin(t * TAU * 1.6);
      p.torso.rot += dph * 5;
      p.torso.y += Math.abs(dph) * 4;
      p.head.rot -= dph * 4;
      p.armL.rot += dph * 18;
      p.armR.rot -= dph * 18;
      p.armL.elbow += Math.abs(dph) * 12;
      p.armR.elbow += Math.abs(dph) * 12;
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

  // 2. 绘制腿部与脚掌 (二段式铰链运动学: 大腿 ~70px + 小腿 ~70px + 3 趾圆垫脚掌)
  function drawLeg(ctx, hipPos, legState, pal, isBingo, isRightLeg) {
    let rot = 0, knee = 0;
    if (typeof legState === 'number') {
      rot = legState;
    } else if (legState && typeof legState === 'object') {
      rot = legState.rot || 0;
      knee = legState.knee || 0;
    }

    ctx.save();
    ctx.translate(hipPos[0], hipPos[1]);
    ctx.rotate(rot * DEG2RAD);

    // 髋关节同色遮盖圆 (直径 ~72px, 彻底遮盖髋部转动缝隙)
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, TAU);
    ctx.fillStyle = pal.body;
    ctx.fill();

    const L1 = 70;      // 大腿长度 (thigh)
    const L2 = 70;      // 小腿长度 (shin)
    const Lfoot = 72;   // 脚掌高度
    const r1 = 33;      // 大腿半径
    const r2 = 33;      // 膝盖半径
    const r3 = 33;      // 踝关节半径

    // 膝盖向后弯曲角度 (正值膝盖向后屈膝弯折)
    const kneeRad = knee * DEG2RAD;
    const sinK = Math.sin(kneeRad);
    const cosK = Math.cos(kneeRad);

    const Kx = 0, Ky = L1;
    // 小腿切向量 T = (-sinK, cosK) (向后 -X, 向下 +Y)
    // 小腿向右(前)法向量 N = (cosK, sinK)
    const Ax = Kx - L2 * sinK; // 踝关节中心
    const Ay = Ky + L2 * cosK;

    const buildLegPath = () => {
      ctx.beginPath();
      // 1. 大腿根部
      ctx.moveTo(-r1, 0);
      ctx.lineTo(r1, 0);

      // 2. 大腿前侧 (+X) 直线至膝盖前侧
      ctx.lineTo(r2, L1);

      // 3. 膝盖前侧圆角平滑过渡到小腿前侧 (前侧伸展膝盖骨)
      if (knee > 4) {
        ctx.arc(Kx, Ky, r2, 0, kneeRad, false);
      }
      // 踝关节前侧
      const A_front_x = Ax + r3 * cosK;
      const A_front_y = Ay + r3 * sinK;
      ctx.lineTo(A_front_x, A_front_y);

      // 4. 脚掌底与 3 趾圆垫轮廓
      const footBottomY = Ay + Lfoot * cosK;
      const footBottomX = Ax - Lfoot * sinK;
      const footFrontX = A_front_x + 12 * cosK;
      const footFrontY = A_front_y + 12 * sinK;
      const footBackX = Ax - (r3 + 12) * cosK;

      ctx.quadraticCurveTo(footFrontX, footFrontY + 25, footBottomX + 42 * cosK, footBottomY);
      ctx.lineTo(footBottomX - 42 * cosK, footBottomY);
      ctx.quadraticCurveTo(footBackX, footBottomY - 10, footBackX, Ay);

      // 5. 小腿后侧回到膝盖后侧内折线
      const K_back_x = Kx - r2 * cosK;
      const K_back_y = Ky - r2 * sinK;
      ctx.lineTo(K_back_x, K_back_y);
      ctx.lineTo(-r2, L1);

      // 6. 大腿后侧回到髋部
      ctx.lineTo(-r1, 0);
      ctx.closePath();
    };

    buildLegPath();
    ctx.fillStyle = pal.body;
    ctx.fill();

    // 下半截脚爪浅色区域
    ctx.save();
    buildLegPath();
    ctx.clip();
    ctx.beginPath();
    ctx.arc(Ax, Ay + 30, 68, 0, TAU);
    ctx.fillStyle = pal.accent;
    ctx.fill();

    // 3 趾圆垫脚趾分隔线 (2 条整洁缝线)
    ctx.lineWidth = 6;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    for (const f of [-16, 16]) {
      const tx1 = Ax + f * cosK + 15 * (-sinK);
      const ty1 = Ay + f * sinK + 15 * cosK;
      const tx2 = Ax + f * cosK + (Lfoot - 4) * (-sinK);
      const ty2 = Ay + f * sinK + (Lfoot - 4) * cosK;
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
    }
    ctx.restore();

    // 整体腿部外轮廓纯净描边
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

  // 4. 绘制手臂与手掌 (二段式铰链运动学: 上臂 ~75px + 小臂 ~72px + 4 指小爪)
  function drawArm(ctx, shoulderPos, armState, pal, isBingo, isRightArm) {
    let rot = 0, elbow = 0;
    if (typeof armState === 'number') {
      rot = armState;
    } else if (armState && typeof armState === 'object') {
      rot = armState.rot || 0;
      elbow = armState.elbow || 0;
    }

    ctx.save();
    ctx.translate(shoulderPos[0], shoulderPos[1]);
    ctx.rotate(rot * DEG2RAD);

    // 肩关节同色平滑重叠圆盖
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, TAU);
    ctx.fillStyle = pal.body;
    ctx.fill();

    const L1 = 75;    // upperArm 长度
    const L2 = 72;    // forearm 长度
    const Lpaw = 36;  // 4 指爪长
    const r1 = 28;    // 肩部半径
    const r2 = 25;    // 肘部半径
    const r3 = 23;    // 腕部半径

    // 肘关节弯折: isRightArm 为 -1 (向内/左弯), isLeftArm 为 +1 (向内/右弯)
    const dir = isRightArm ? -1 : 1;
    const elbowRad = dir * elbow * DEG2RAD;
    const sinE = Math.sin(elbowRad);
    const cosE = Math.cos(elbowRad);

    const Ex = 0, Ey = L1;
    const Wx = Ex + L2 * sinE;
    const Wy = Ey + L2 * cosE;

    const WRx = Wx + r3 * cosE;
    const WRy = Wy - r3 * sinE;
    const WLx = Wx - r3 * cosE;
    const WLy = Wy + r3 * sinE;

    const Px = Wx + Lpaw * sinE;
    const Py = Wy + Lpaw * cosE;

    const buildArmPath = () => {
      ctx.beginPath();
      if (dir === 1) {
        // 近侧手臂 (左臂): 外肘在左侧 (-X), 内肘在右侧 (+X)
        ctx.arc(0, 0, r1, Math.PI, 0, false);
        ctx.lineTo(r2, L1);
        ctx.lineTo(Ex + r2 * cosE, Ey - r2 * sinE);
        ctx.lineTo(WRx, WRy);
        ctx.quadraticCurveTo(WRx + Lpaw * 0.7 * sinE, WRy + Lpaw * 0.7 * cosE, Px + 12 * cosE, Py - 12 * sinE);
        ctx.quadraticCurveTo(Px, Py, Px - 12 * cosE, Py + 12 * sinE);
        ctx.quadraticCurveTo(WLx + Lpaw * 0.7 * sinE, WLy + Lpaw * 0.7 * cosE, WLx, WLy);
        ctx.lineTo(Ex - r2 * cosE, Ey + r2 * sinE);
        if (elbow > 4) {
          ctx.arc(Ex, Ey, r2, Math.PI, Math.PI + elbowRad, false);
        } else {
          ctx.lineTo(-r2, L1);
        }
        ctx.lineTo(-r1, 0);
      } else {
        // 远侧手臂 (右臂): 外肘在右侧 (+X), 内肘在左侧 (-X)
        ctx.arc(0, 0, r1, 0, Math.PI, false);
        ctx.lineTo(-r2, L1);
        ctx.lineTo(Ex - r2 * cosE, Ey + r2 * sinE);
        ctx.lineTo(WLx, WLy);
        ctx.quadraticCurveTo(WLx + Lpaw * 0.7 * sinE, WLy + Lpaw * 0.7 * cosE, Px - 12 * cosE, Py + 12 * sinE);
        ctx.quadraticCurveTo(Px, Py, Px + 12 * cosE, Py - 12 * sinE);
        ctx.quadraticCurveTo(WRx + Lpaw * 0.7 * sinE, WRy + Lpaw * 0.7 * cosE, WRx, WRy);
        ctx.lineTo(Ex + r2 * cosE, Ey - r2 * sinE);
        if (elbow > 4) {
          ctx.arc(Ex, Ey, r2, 0, elbowRad, true);
        } else {
          ctx.lineTo(r2, L1);
        }
        ctx.lineTo(r1, 0);
      }
      ctx.closePath();
    };

    buildArmPath();
    ctx.fillStyle = pal.body;
    ctx.fill();

    // 手掌浅色剪裁与绘制
    ctx.save();
    buildArmPath();
    ctx.clip();
    ctx.beginPath();
    ctx.arc(Wx, Wy, 42, 0, TAU);
    ctx.fillStyle = pal.accent;
    ctx.fill();

    // 4 指爪缝线条 (3 条平行细线)
    ctx.lineWidth = 5.0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    for (let f = -1; f <= 1; f++) {
      const off = f * 9;
      const x1 = Wx - off * cosE + 8 * sinE;
      const y1 = Wy + off * sinE + 8 * cosE;
      const x2 = Wx - off * cosE + (Lpaw - 4) * sinE;
      const y2 = Wy + off * sinE + (Lpaw - 4) * cosE;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

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

    // 鼻头 (圆润大倒三角形墨蓝黑鼻头，微压眼缝正中)
    ctx.save();
    const noseY = snoutY + 4;
    ctx.beginPath();
    ctx.moveTo(-36, noseY - 8);
    ctx.quadraticCurveTo(0, noseY - 14, 36, noseY - 8);
    ctx.quadraticCurveTo(40, noseY + 22, 16, noseY + 38);
    ctx.quadraticCurveTo(0, noseY + 46, -16, noseY + 38);
    ctx.quadraticCurveTo(-40, noseY + 22, -36, noseY - 8);
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

  // 6. 绘制派对帽 (端正佩戴于两耳正中, 随身体与头部转动平滑)
  function drawPartyHat(ctx, headRotDeg, torsoRotDeg, t, pal, imgs) {
    ctx.save();
    ctx.translate(0, -500);
    ctx.rotate(headRotDeg * DEG2RAD);
    ctx.translate(0, -332); // 头顶两耳间正中，严丝合缝贴合

    // 弹簧动力学微摆 (纯确定性平滑阻尼，端正佩戴无静态倾斜失真)
    const hatWobble = Math.sin(t * TAU * 1.5) * 1.5;
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

  // 7. 绘制道具骨头 (沿二段手臂手爪抱握)
  function drawBoneProp(ctx, shoulderPos, armState, imgs) {
    let rot = 0, elbow = 0;
    if (typeof armState === 'number') {
      rot = armState;
    } else if (armState && typeof armState === 'object') {
      rot = armState.rot || 0;
      elbow = armState.elbow || 0;
    }
    ctx.save();
    ctx.translate(shoulderPos[0], shoulderPos[1]);
    ctx.rotate(rot * DEG2RAD);
    const L1 = 75, L2 = 72;
    const elbowRad = -elbow * DEG2RAD;
    ctx.translate(0, L1);
    ctx.rotate(elbowRad);
    ctx.translate(0, L2 + 10);

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

    // 手臂高举后置判断 (大幅高举且非捂嘴/耳语时，置于头部后方)
    const armLRot = (typeof p.armL === 'object' ? p.armL.rot : p.armL) || 0;
    const isArmBehindHead = (Math.abs(armLRot) > 65) && (poseName !== 'cover_mouth') && (poseName !== 'whisper');

    // 双手胸前合抱姿势或前向动作 (拍手、抱骨头、求拥抱、捂嘴、头顶拍手、指向、挥手) 时，右臂置于胸前层级
    const isArmRInFront = (poseName === 'clap') || (poseName === 'hug_bone') || (poseName === 'cover_mouth') || (poseName === 'hug') || (poseName === 'clap_overhead') || (poseName === 'point') || (poseName === 'wave');

    const shoulderL = [-145 * pal.scaleW, -500];
    const shoulderR = [145 * pal.scaleW, -490];
    const hipL = [-75 * pal.scaleW, -220];
    const hipR = [75 * pal.scaleW, -220];

    const imgs = (pupData && pupData.imgs) || (state && state.imgs) || null;

    // ----- 绘制层序 -----
    // 1) 尾巴
    drawTail(ctx, p.tail.rot, pal, isBingo);

    // 2) 右臂 (后爪) - 若非胸前合抱，在躯干后绘制
    if (!isArmRInFront) {
      drawArm(ctx, shoulderR, p.armR, pal, isBingo, true);
    }

    // 3) 腿部 (后腿与前腿) - 二段关节铰链绘制
    drawLeg(ctx, hipR, p.legR, pal, isBingo, true);
    drawLeg(ctx, hipL, p.legL, pal, isBingo, false);

    // 4) 躯干
    drawTorso(ctx, pal, isBingo);

    // 若手臂高举且非胸前合抱，在头部前先画左臂
    if (isArmBehindHead && !isArmRInFront) {
      drawArm(ctx, shoulderL, p.armL, pal, isBingo, false);
    }

    // 5) 头部与完整五官
    drawHead(ctx, p.head.rot, pal, isBingo, expr, look, t, mouthOpen);

    // 6) 派对帽 (端正佩戴于两耳正中)
    const hasHat = state.hat && state.hat.visible !== false;
    if (hasHat) {
      drawPartyHat(ctx, p.head.rot, p.torso.rot, t, pal, imgs);
    }

    // 若双手在胸前合抱，在躯干和头部之后绘制右臂与左臂
    if (isArmRInFront) {
      drawArm(ctx, shoulderR, p.armR, pal, isBingo, true);
      drawArm(ctx, shoulderL, p.armL, pal, isBingo, false);
    } else if (!isArmBehindHead) {
      // 若手臂未高举，在头部之后画左臂
      drawArm(ctx, shoulderL, p.armL, pal, isBingo, false);
    }

    // 7) 道具骨头
    if (state.item === 'bone') {
      drawBoneProp(ctx, shoulderL, p.armL, imgs);
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
