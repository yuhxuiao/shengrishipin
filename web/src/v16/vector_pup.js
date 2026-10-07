// vector_pup.js — 布鲁伊与宾果 100% 纯 Canvas2D 官方 1:1 矢量角色系统 (V15 架构师旗舰版)
// 包含:
// 1. 一体式方圆柱躯干 (Squircle Pillar) 重构 (头身 1:1 等宽, 彻底告别火柴人细脖子)
// 2. 真实 1:1 幼儿身型比例: 躯干占约 68%, 短粗直柱双腿占约 22%, 大号横向奶油色肚皮
// 3. 官方五官: 双大号垂直白胶囊紧贴眼框、独立悬浮浅色眉毛、立体奶油嘴吻、高光黑鼻头 (月牙形浅黄/浅灰柔和高光 + 人中短竖线 + 微笑唇线)
// 4. 有色描边系统: Bluey 深藏青蓝描边 (#13284C, ~6px), Bingo 深栗红棕色描边 (#512211), 肚皮与内耳柔和有色细线
// 5. 官方 1:1 派对帽 (frame_18 对齐): 深蓝紫圆锥帽 (#4B3B8A) + 明黄五角星 + 浅紫粉圆点 + 浅蓝蓬松折皱花球 + 白色细弹力下巴带
// 6. 二段式铰链运动学: upperArm(75px) + forearm(72px) (0°~90°) 与 thigh(70px) + shin(70px), 3 趾前爪刻线, 完整驱动 28 套动作库
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG2RAD = Math.PI / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // 1. 官方 1:1 调色板与有色描边规范 (严禁死板纯黑描边)
  const PALETTES = {
    bluey: {
      body: '#6998D5',        // 主天蓝
      dark: '#22365A',        // 右眼深蓝斑、背部斑块、外耳暗部、尾尖
      belly: '#E8CE8B',       // 吻部、肚皮奶油色 (经典原片 1:1 奶油黄色)
      bellyStroke: '#C4A868', // 肚皮柔和有色细线
      accent: '#A9C6E8',      // 独立悬浮眉毛、手爪、脚掌浅蓝提亮
      innerEar: '#F5BE42',    // 内耳鲜明金黄色大三角形
      innerEarStroke: '#D89E28',// 内耳柔和金橙细线
      nose: '#131D2E',        // 墨蓝黑鼻头
      noseShine: 'rgba(235, 225, 210, 0.72)', // 鼻头正上方月牙形柔和浅灰黄高光
      stroke: '#13284C',      // 统一深藏青蓝描边 (~6px)
      eyeWhite: '#FFFFFF',
      pupil: '#131D2E',
      pupilShine: '#FFFFFF',
      tongue: '#FF6B8B',
      mouthInside: '#1C233C',
      teeth: '#FFFFFF',
      blush: 'rgba(255, 110, 150, 0.35)',
      hatCone: '#4B3B8A',     // 1:1 官方深蓝紫圆锥帽 (frame_18)
      hatStar: '#F5CE4D',     // 明黄小五角星
      hatDot: '#C284BD',      // 浅紫粉圆点
      hatPom: '#93C0E5',      // 帽尖浅蓝蓬松折皱花球
      hatStrap: '#FFFFFF',    // 下巴白色细弹力带
      defaultH: 420,
      scaleW: 1.0,
      seed: 41.73,
    },
    bingo: {
      body: '#E88E4B',        // 亮橙主色
      dark: '#9E4222',        // 左眼红褐暗斑、背部暗斑、外耳暗部
      belly: '#FFF3D0',       // 吻部、额中条纹、肚皮亮浅奶油色
      bellyStroke: '#D8C59A', // 肚皮柔和有色细线
      accent: '#FFF3D0',      // 独立悬浮眉毛、手爪、脚掌浅奶油色
      innerEar: '#F5BE42',    // 内耳鲜明金黄色大三角形
      innerEarStroke: '#D89E28',// 内耳柔和金橙细线
      nose: '#1E1815',        // 墨黑鼻头
      noseShine: 'rgba(245, 235, 220, 0.78)', // 鼻头正上方月牙形柔和浅黄高光
      stroke: '#512211',      // 统一深栗红棕色描边 (~6px)
      eyeWhite: '#FFFFFF',
      pupil: '#1E1815',
      pupilShine: '#FFFFFF',
      tongue: '#FF6B8B',
      mouthInside: '#2B140B',
      teeth: '#FFFFFF',
      blush: 'rgba(255, 110, 150, 0.35)',
      hatCone: '#4B3B8A',     // 1:1 官方深蓝紫圆锥帽 (frame_18)
      hatStar: '#F5CE4D',
      hatDot: '#C284BD',
      hatPom: '#93C0E5',
      hatStrap: '#FFFFFF',
      defaultH: 360,
      scaleW: 1.05,           // Bingo 身形更圆润可爱
      seed: 73.19,
    }
  };

  // 2. 28 套动作库定义 (二段铰链运动学: upperArm(75) + forearm(72), thigh(70) + shin(70))
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

  // 评估姿态与次级摆动动力学 (舒缓确定性驱动, 彻底杜绝步态差频抽搐)
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

    // 2. 拍手动态循环 (clap: 上臂与双肘协同合掌)
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

    // 4. 快乐扭扭舞 (dance: 1.2 Hz 左右扭动与起伏)
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

    // 5. 惊喜大笑 (laugh: 2.0 Hz 肚子笑颤与微晃)
    if (nameStr === 'laugh') {
      const lph = Math.sin(t * TAU * 2.0);
      p.torso.y += Math.abs(lph) * 3.5;
      p.head.rot += lph * 3.5;
      p.armL.elbow += lph * 6;
    }

    // 6. 指向 (point: 呼吸微起伏与肯定性小点头)
    if (nameStr === 'point') {
      const pph = Math.sin(t * TAU * 0.9);
      p.head.rot += pph * 2.5;
      p.armR.rot += pph * 2.0;
      p.torso.y += pph * 1.5;
    }

    // 7. 吹蜡烛 (blow)
    if (nameStr === 'blow') {
      const ph = Math.sin(t * TAU * 1.2);
      p.torso.rot += ph * 2.5;
      p.head.rot += ph * 3.0;
    }

    // 8. 站立呼吸微动 (stand: 0.6 Hz 舒缓起伏)
    if (nameStr === 'stand') {
      const bph = Math.sin(t * TAU * 0.6);
      p.torso.y += bph * 2.0;
      p.head.rot += bph * 1.2;
    }

    // 9. 挥手 (wave: 1.8 Hz 上臂稳定, 小臂围绕肘部扇动)
    if (nameStr === 'wave') {
      const wph = Math.sin(t * TAU * 1.8);
      p.armR.rot += wph * 8;
      p.armR.elbow += wph * 15;
      p.head.rot += wph * 3.0;
      p.torso.rot += wph * 1.2;
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

  // 纯函数确定性自然眨眼计算
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

  // 绘制五角星辅助
  function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx, y = cy;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  // ======================== 核心矢量部件绘制 ========================

  // 1. 绘制尾巴 (随身体与行走摆动, 两段色彩蓬松质感)
  function drawTail(ctx, rotDeg, pal, isBingo) {
    ctx.save();
    ctx.translate(-140, -210); // 挂载在方圆柱躯干后侧偏下
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

    // 填充底色 (主天蓝 / 亮橙)
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

    // 外轮廓有色描边
    buildTailPath();
    ctx.lineWidth = 6.0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  // 2. 绘制腿部与脚掌 (短粗直柱双腿占全身高约 22%, 脚掌平稳贴地并带有清晰的 3 趾前爪刻线)
  // 二段铰链运动学: thigh(70px) + shin(70px) + foot(30px)
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

    // 髋关节同色平滑重叠遮盖圆
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, TAU);
    ctx.fillStyle = pal.body;
    ctx.fill();

    const L1 = 70;      // thigh 大腿长度
    const L2 = 70;      // shin 小腿长度
    const rLeg = 31;    // 短粗直柱腿半径 (直径 62px，扎实短萌)
    const Lfoot = 30;   // 脚掌贴地厚度

    // 膝盖向后弯折角度
    const kneeRad = knee * DEG2RAD;
    const sinK = Math.sin(kneeRad);
    const cosK = Math.cos(kneeRad);

    const Kx = 0, Ky = L1;
    const Ax = Kx - L2 * sinK; // 踝关节中心
    const Ay = Ky + L2 * cosK;

    const buildLegPath = () => {
      ctx.beginPath();
      // 1. 大腿根部
      ctx.moveTo(-rLeg, 0);
      ctx.lineTo(rLeg, 0);

      // 2. 大腿前侧直达膝盖
      ctx.lineTo(rLeg, L1);

      // 3. 膝盖平滑过渡
      if (knee > 4) {
        ctx.arc(Kx, Ky, rLeg, 0, kneeRad, false);
      }

      // 4. 小腿前侧到脚掌前沿
      const A_front_x = Ax + rLeg * cosK;
      const A_front_y = Ay + rLeg * sinK;
      ctx.lineTo(A_front_x, A_front_y);

      // 5. 脚掌前爪伸出平直贴地 (flat on ground, Y=0 when neutral)
      // 前趾外凸平底轮廓
      const toeFrontX = Ax + (rLeg + 14) * cosK;
      const toeFrontY = Ay + (rLeg + 14) * sinK;
      const footBottomX = Ax - Lfoot * sinK;
      const footBottomY = Ay + Lfoot * cosK;
      const heelX = Ax - (rLeg + 6) * cosK;
      const heelY = Ay - (rLeg + 6) * sinK;

      ctx.quadraticCurveTo(toeFrontX, toeFrontY + 8, footBottomX + (rLeg + 12) * cosK, footBottomY);
      ctx.lineTo(footBottomX - (rLeg + 6) * cosK, footBottomY);
      ctx.quadraticCurveTo(heelX - 4, footBottomY - 6, heelX, Ay);

      // 6. 小腿后侧回到膝盖
      const K_back_x = Kx - rLeg * cosK;
      const K_back_y = Ky - rLeg * sinK;
      ctx.lineTo(K_back_x, K_back_y);
      ctx.lineTo(-rLeg, L1);

      // 7. 回到大腿后根
      ctx.lineTo(-rLeg, 0);
      ctx.closePath();
    };

    buildLegPath();
    ctx.fillStyle = pal.body;
    ctx.fill();

    // 脚掌前端浅色提亮垫 (Bluey: #A9C6E8, Bingo: #FFF3D0)
    ctx.save();
    buildLegPath();
    ctx.clip();
    ctx.beginPath();
    ctx.arc(Ax + 6 * cosK, Ay + 16 * cosK, 42, 0, TAU);
    ctx.fillStyle = pal.accent;
    ctx.fill();

    // 官方 1:1 特征: 脚掌前爪清晰的 3 趾前爪刻线 (2 条笔直垂直缝线划分 3 趾)
    ctx.lineWidth = 5.0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    for (const offset of [-8, 14]) {
      const p1x = Ax + offset * cosK + 10 * (-sinK);
      const p1y = Ay + offset * sinK + 10 * cosK;
      const p2x = Ax + offset * cosK + (Lfoot - 1) * (-sinK);
      const p2y = Ay + offset * sinK + (Lfoot - 1) * cosK;
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();
    }
    ctx.restore();

    // 整体腿部外轮廓有色描边
    buildLegPath();
    ctx.lineWidth = 6.0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  // 3. 绘制躯干 (一体式方圆柱下半段 + 横向大号奶油色大椭圆肚皮 + 背部斑块)
  // 头宽与身宽 1:1 完全等宽 (W = 380 * scaleW)，顶部开放衔接头部，绝无细脖子收窄与断层横线！
  function drawTorso(ctx, pal, isBingo) {
    ctx.save();
    const w = 380 * pal.scaleW;
    const x = -w / 2;
    const yTop = -490;    // 向上深入胸口枢轴
    const yBottom = -170; // 躯干底部 (髋部挂接区)
    const h = yBottom - yTop; // 320px
    const rBottom = 65;   // 躯干底部方圆圆角

    // 躯干填充体 (平直侧边，底角圆润)
    ctx.beginPath();
    ctx.moveTo(x, yTop - 30); // 向上延伸 30px 无缝浸入上胸
    ctx.lineTo(x + w, yTop - 30);
    ctx.lineTo(x + w, yBottom - rBottom);
    ctx.quadraticCurveTo(x + w, yBottom, x + w - rBottom, yBottom);
    ctx.lineTo(x + rBottom, yBottom);
    ctx.quadraticCurveTo(x, yBottom, x, yBottom - rBottom);
    ctx.closePath();
    ctx.fillStyle = pal.body;
    ctx.fill();

    // 背部特征斑块 (位于角色背部左侧，严格裁剪在躯干内)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, yTop - 30);
    ctx.lineTo(x + w, yTop - 30);
    ctx.lineTo(x + w, yBottom - rBottom);
    ctx.quadraticCurveTo(x + w, yBottom, x + w - rBottom, yBottom);
    ctx.lineTo(x + rBottom, yBottom);
    ctx.quadraticCurveTo(x, yBottom, x, yBottom - rBottom);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.ellipse(x + 22, -260, 48, 38, -0.15, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 18, -370, 42, 34, -0.1, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 官方 1:1 特征: 大号横向奶油色大椭圆肚皮 (占躯干中下部大半面积，圆润饱满)
    ctx.beginPath();
    ctx.ellipse(0, -315, 136 * pal.scaleW, 106, 0, 0, TAU);
    ctx.fillStyle = pal.belly;
    ctx.fill();

    // 肚皮边缘柔和有色细线 (符合规范 3)
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = pal.bellyStroke;
    ctx.stroke();

    // 躯干外轮廓: 只描左侧直边、底部圆角边、右侧直边，顶端彻底开放！绝无横断黑线！
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, yBottom - rBottom);
    ctx.quadraticCurveTo(x, yBottom, x + rBottom, yBottom);
    ctx.lineTo(x + w - rBottom, yBottom);
    ctx.quadraticCurveTo(x + w, yBottom, x + w, yBottom - rBottom);
    ctx.lineTo(x + w, yTop);
    ctx.lineWidth = 6.0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  // 4. 绘制手臂与手掌 (二段式铰链运动学: upperArm(75px) + forearm(72px) + 4 指小爪)
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

    // 肩关节同色平滑圆盖 (消除肩部转动缝隙)
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, TAU);
    ctx.fillStyle = pal.body;
    ctx.fill();

    const L1 = 75;    // upperArm 长度
    const L2 = 72;    // forearm 长度
    const Lpaw = 36;  // 手爪长度
    const r1 = 28;    // 肩部半径
    const r2 = 25;    // 肘部半径
    const r3 = 23;    // 腕部半径

    // 肘关节屈曲方向: isRightArm 为 -1 (向内弯), isLeftArm 为 +1 (向内弯)
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
        // 左臂 (近侧)
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
        // 右臂 (远侧)
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

    // 手爪浅色提亮垫
    ctx.save();
    buildArmPath();
    ctx.clip();
    ctx.beginPath();
    ctx.arc(Wx, Wy, 42, 0, TAU);
    ctx.fillStyle = pal.accent;
    ctx.fill();

    // 4 指爪缝线条 (3 条平行微线)
    ctx.lineWidth = 4.5;
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

    // 手臂轮廓描边
    buildArmPath();
    ctx.lineWidth = 6.0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  // 5. 绘制一体式方圆柱头颈与完整五官 (1:1 官方造型重构)
  // 特性:
  // - 头宽与身宽 1:1 (hw = 380 * scaleW), 直柱侧边无缝对齐下躯干
  // - 双耳直接从方圆柱头顶两角长出, 外耳圆润, 内耳鲜明金黄色大三角形 (#F5BE42)
  // - 双胶囊贴合眼框 (正中完全贴合共用中线), 独立悬浮浅色眉毛
  // - 立体奶油黄嘴吻, 圆润倒三角黑鼻头带月牙形柔和浅灰黄高光 + 人中短竖线 + 微笑唇线
  function drawHead(ctx, headRotDeg, pal, isBingo, expr, look, t, mouthOpen) {
    ctx.save();
    ctx.translate(0, -490); // 颈部胸骨枢轴
    ctx.rotate(headRotDeg * DEG2RAD);

    const hw = 380 * pal.scaleW;
    const hx = -hw / 2;
    const yTop = -290;     // 在头局部坐标系下: yTop=-290 (全局 -780)
    const yBottom = 20;    // 向下延伸无缝覆盖躯干顶端
    const rTop = 75;       // 头顶两角方圆柱圆角

    // ----- A. 双耳 (直接从方圆柱头顶左右两角长出, 内耳鲜明金黄大三角形) -----
    // 1) 左耳 (观众视角左侧角)
    const drawLeftEar = () => {
      ctx.beginPath();
      ctx.moveTo(hx + 8, yTop + 45); // 外耳基底紧贴头顶左角
      ctx.quadraticCurveTo(hx - 12, yTop - 70, -145 * pal.scaleW, yTop - 165); // 圆润外侧外凸弧线
      ctx.quadraticCurveTo(-140 * pal.scaleW, yTop - 175, -130 * pal.scaleW, yTop - 165); // 圆润尖端
      ctx.lineTo(-55 * pal.scaleW, yTop); // 耳根内侧降落于头顶
      ctx.closePath();
      ctx.fillStyle = isBingo ? pal.body : pal.dark; // Bluey 深藏青蓝，Bingo 亮橙
      ctx.fill();
      ctx.lineWidth = 6.0;
      ctx.strokeStyle = pal.stroke;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 内耳鲜明金黄色大三角形 (#F5BE42)
      ctx.beginPath();
      ctx.moveTo(hx + 30, yTop + 35);
      ctx.lineTo(-138 * pal.scaleW, yTop - 145);
      ctx.lineTo(-72 * pal.scaleW, yTop);
      ctx.closePath();
      ctx.fillStyle = pal.innerEar;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = pal.innerEarStroke;
      ctx.stroke();
    };

    // 2) 右耳 (观众视角右侧角)
    const drawRightEar = () => {
      ctx.beginPath();
      ctx.moveTo(hw / 2 - 8, yTop + 45); // 外耳基底紧贴头顶右角
      ctx.quadraticCurveTo(hw / 2 + 12, yTop - 70, 145 * pal.scaleW, yTop - 165); // 圆润外侧外凸弧线
      ctx.quadraticCurveTo(140 * pal.scaleW, yTop - 175, 130 * pal.scaleW, yTop - 165); // 圆润尖端
      ctx.lineTo(55 * pal.scaleW, yTop); // 耳根内侧降落于头顶
      ctx.closePath();
      ctx.fillStyle = pal.dark; // Bluey 深藏青蓝，Bingo 暗斑侧红褐色
      ctx.fill();
      ctx.lineWidth = 6.0;
      ctx.strokeStyle = pal.stroke;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 内耳鲜明金黄色大三角形 (#F5BE42)
      ctx.beginPath();
      ctx.moveTo(hw / 2 - 30, yTop + 35);
      ctx.lineTo(138 * pal.scaleW, yTop - 145);
      ctx.lineTo(72 * pal.scaleW, yTop);
      ctx.closePath();
      ctx.fillStyle = pal.innerEar;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = pal.innerEarStroke;
      ctx.stroke();
    };

    drawLeftEar();
    drawRightEar();

    // ----- B. 一体式方圆柱头颈主体 (直柱下探, 与躯干 1:1 等宽) -----
    const buildHeadBodyPath = () => {
      ctx.beginPath();
      ctx.moveTo(hx, yBottom);
      ctx.lineTo(hx, yTop + rTop);
      ctx.quadraticCurveTo(hx, yTop, hx + rTop, yTop);
      ctx.lineTo(hw / 2 - rTop, yTop);
      ctx.quadraticCurveTo(hw / 2, yTop, hw / 2, yTop + rTop);
      ctx.lineTo(hw / 2, yBottom);
      ctx.closePath();
    };

    buildHeadBodyPath();
    ctx.fillStyle = pal.body;
    ctx.fill();

    // ----- C. 标志性眼斑与头部花纹 (剪裁在头颈方圆柱内) -----
    ctx.save();
    buildHeadBodyPath();
    ctx.clip();

    if (!isBingo) {
      // Bluey: 右眼(观众视角左侧)深蓝大斑块 + 额顶深蓝区
      ctx.beginPath();
      ctx.moveTo(hx - 5, yTop - 5);
      ctx.lineTo(10, yTop - 5);
      ctx.bezierCurveTo(8, yTop + 140, 6, yTop + 220, -18, yTop + 250);
      ctx.bezierCurveTo(-50, yTop + 280, -135, yTop + 280, hx - 5, yTop + 250);
      ctx.closePath();
      ctx.fillStyle = pal.dark;
      ctx.fill();

      // 头顶深蓝连接带
      ctx.beginPath();
      ctx.moveTo(-45, yTop);
      ctx.quadraticCurveTo(25, yTop + 36, 95, yTop);
      ctx.closePath();
      ctx.fillStyle = pal.dark;
      ctx.fill();
    } else {
      // Bingo: 左眼(观众视角右侧)红褐色大斑块
      ctx.beginPath();
      ctx.moveTo(-8, yTop - 5);
      ctx.lineTo(hw / 2 + 5, yTop - 5);
      ctx.lineTo(hw / 2 + 5, yTop + 250);
      ctx.bezierCurveTo(hw / 2 - 40, yTop + 280, 45, yTop + 280, 18, yTop + 250);
      ctx.bezierCurveTo(-8, yTop + 220, -8, yTop + 140, -8, yTop - 5);
      ctx.closePath();
      ctx.fillStyle = pal.dark;
      ctx.fill();

      // 官方 1:1 特征: Bingo 额头正中淡桃色条纹连通嘴吻至头顶两耳间
      ctx.beginPath();
      ctx.moveTo(-36, yTop);
      ctx.lineTo(12, yTop);
      ctx.bezierCurveTo(8, yTop + 130, -2, yTop + 190, -12, yTop + 220);
      ctx.bezierCurveTo(-26, yTop + 190, -32, yTop + 130, -36, yTop);
      ctx.closePath();
      ctx.fillStyle = pal.belly;
      ctx.fill();
    }
    ctx.restore();

    // 头顶两侧与顶面有色描边 (底端开放与躯干无缝融为一体)
    ctx.beginPath();
    ctx.moveTo(hx, yBottom);
    ctx.lineTo(hx, yTop + rTop);
    ctx.quadraticCurveTo(hx, yTop, hx + rTop, yTop);
    ctx.lineTo(hw / 2 - rTop, yTop);
    ctx.quadraticCurveTo(hw / 2, yTop, hw / 2, yTop + rTop);
    ctx.lineTo(hw / 2, yBottom);
    ctx.lineWidth = 6.0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ----- D. 双眼与视线跟踪、确定性自然眨眼 (双胶囊贴合眼框) -----
    // 官方 1:1 特征: 双眼为大号圆角垂直白色胶囊，在面部正中完全贴合（共用中线细线）
    const blinkAmt = calcBlinkAmt(t, pal.seed);
    const isSquint = expr === 'laugh' || expr === 'dance';
    const isSurprise = expr === 'surprise';
    const isSad = expr === 'sad';

    const eyeW = 98 * pal.scaleW;
    const eyeH = 152;
    const eyeRadius = 46;
    const eyeCenterY = yTop + 158;

    const lookX = clamp((look && look[0]) || 0, -1, 1);
    const lookY = clamp((look && look[1]) || 0, -1, 1);
    const pupilOffX = lookX * 20;
    const pupilOffY = lookY * 16;

    const drawEye = (rx, cx, lidColor, isLeftEye) => {
      const ry = eyeCenterY - eyeH / 2;

      ctx.save();
      roundRect(ctx, rx, ry, eyeW, eyeH, eyeRadius);
      ctx.fillStyle = pal.eyeWhite;
      ctx.fill();

      if (isSquint) {
        // 眯眼弯月笑
        roundRect(ctx, rx, ry, eyeW, eyeH, eyeRadius);
        ctx.clip();
        ctx.fillStyle = lidColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, eyeCenterY + 12, 36, Math.PI * 1.15, Math.PI * 1.85);
        ctx.lineWidth = 7.0;
        ctx.strokeStyle = pal.stroke;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else {
        roundRect(ctx, rx, ry, eyeW, eyeH, eyeRadius);
        ctx.clip();

        // 黑色大瞳孔 (微靠内中缝注视显得呆萌灵动)
        const inwardBias = isLeftEye ? 4 : -4;
        const px = cx + pupilOffX + inwardBias;
        const py = eyeCenterY + pupilOffY;
        const prx = isSurprise ? 16 : 21;
        const pry = isSurprise ? 25 : 35;

        ctx.beginPath();
        ctx.ellipse(px, py, prx, pry, 0, 0, TAU);
        ctx.fillStyle = pal.pupil;
        ctx.fill();

        // 官方双高光点 (右上大高光 + 左下小高光)
        ctx.beginPath();
        ctx.arc(px + 7, py - 13, 6.5, 0, TAU);
        ctx.fillStyle = pal.pupilShine;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px - 7, py + 12, 3.2, 0, TAU);
        ctx.fillStyle = pal.pupilShine;
        ctx.fill();

        // 眨眼眼睑平滑闭合
        if (blinkAmt > 0) {
          const closeY = ry + eyeH * blinkAmt;
          ctx.beginPath();
          ctx.rect(rx - 5, ry - 5, eyeW + 10, eyeH * blinkAmt + 5);
          ctx.fillStyle = lidColor;
          ctx.fill();

          ctx.lineWidth = 6.0;
          ctx.strokeStyle = pal.stroke;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(rx, closeY);
          ctx.lineTo(rx + eyeW, closeY);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    // 左眼与右眼内容填充 (在 x=0 正中完全贴合)
    drawEye(-eyeW, -eyeW / 2, !isBingo ? pal.dark : pal.body, true);
    drawEye(0, eyeW / 2, !isBingo ? pal.body : pal.dark, false);

    // 双眼结合外围轮廓描边 (双垂直胶囊共用中线，消除中缝双倍粗线)
    const ry = eyeCenterY - eyeH / 2;
    ctx.beginPath();
    ctx.moveTo(-eyeW + eyeRadius, ry);
    ctx.quadraticCurveTo(-eyeW * 0.45, ry, 0, ry + 7);
    ctx.quadraticCurveTo(eyeW * 0.45, ry, eyeW - eyeRadius, ry);
    ctx.quadraticCurveTo(eyeW, ry, eyeW, ry + eyeRadius);
    ctx.lineTo(eyeW, ry + eyeH - eyeRadius);
    ctx.quadraticCurveTo(eyeW, ry + eyeH, eyeW - eyeRadius, ry + eyeH);
    ctx.quadraticCurveTo(eyeW * 0.45, ry + eyeH, 0, ry + eyeH - 7);
    ctx.quadraticCurveTo(-eyeW * 0.45, ry + eyeH, -eyeW + eyeRadius, ry + eyeH);
    ctx.quadraticCurveTo(-eyeW, ry + eyeH, -eyeW, ry + eyeH - eyeRadius);
    ctx.lineTo(-eyeW, ry + eyeRadius);
    ctx.quadraticCurveTo(-eyeW, ry, -eyeW + eyeRadius, ry);
    ctx.closePath();
    ctx.lineWidth = 6.0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 正中贴合共用中线细线 (从顶角微凹处直达吻部上沿)
    ctx.beginPath();
    ctx.moveTo(0, ry + 7);
    ctx.lineTo(0, ry + eyeH - 22);
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.stroke();

    // ----- E. 独立悬浮眉毛 (两根独立的大号浅色扁椭圆胶囊悬浮于眼睛上方) -----
    // Bluey: #A9C6E8, Bingo: #FFF3D0
    const browW = 86 * pal.scaleW;
    const browH = 26;
    let browOffY = isSurprise ? -26 : (expr === 'laugh' ? -12 : 0);
    let browRotL = -2, browRotR = 2; // 默认自然微扬
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
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();
      ctx.restore();
    };

    drawBrow(-eyeW / 2, eyeCenterY - eyeH / 2 - 26, browRotL, pal.accent);
    drawBrow(eyeW / 2, eyeCenterY - eyeH / 2 - 26, browRotR, pal.accent);

    // ----- F. 立体嘴吻与高光黑鼻头 -----
    // 嘴吻为正中凸出的奶油黄长方圆角块，鼻头正上方必须有一块月牙形柔和浅灰黄高光！
    // 鼻头下方有人中短竖线与微笑唇线
    const snoutW = 236 * pal.scaleW;
    const snoutH = 124;
    const snoutX = -snoutW / 2;
    const snoutY = eyeCenterY + eyeH / 2 - 28; // 上沿自然压入双眼底部约 28px

    roundRect(ctx, snoutX, snoutY, snoutW, snoutH, 48, 48, 44, 44);
    ctx.fillStyle = pal.belly;
    ctx.fill();
    ctx.lineWidth = 6.0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 圆润倒三角墨黑鼻头 (正中坐镇，压在眼缝正下方)
    const noseY = snoutY + 6;
    const drawNose = () => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-38, noseY - 6);
      ctx.quadraticCurveTo(0, noseY - 14, 38, noseY - 6);
      ctx.quadraticCurveTo(42, noseY + 22, 16, noseY + 38);
      ctx.quadraticCurveTo(0, noseY + 46, -16, noseY + 38);
      ctx.quadraticCurveTo(-42, noseY + 22, -38, noseY - 6);
      ctx.closePath();
      ctx.fillStyle = pal.nose;
      ctx.fill();

      // 官方 1:1 核心特征: 鼻头正上方月牙形柔和浅灰黄高光
      ctx.beginPath();
      ctx.moveTo(-24, noseY - 5);
      ctx.quadraticCurveTo(0, noseY - 11, 24, noseY - 5);
      ctx.quadraticCurveTo(26, noseY + 4, 16, noseY + 7);
      ctx.quadraticCurveTo(0, noseY + 3, -16, noseY + 7);
      ctx.quadraticCurveTo(-26, noseY + 4, -24, noseY - 5);
      ctx.closePath();
      ctx.fillStyle = pal.noseShine;
      ctx.fill();

      ctx.restore();
    };

    drawNose();

    // 官方 1:1 特征: 鼻头下方人中短竖线 (连接黑鼻头与微笑唇线)
    const mouthCenterY = snoutY + 76;
    ctx.beginPath();
    ctx.moveTo(0, noseY + 42);
    ctx.lineTo(0, mouthCenterY - 4);
    ctx.lineWidth = 5.0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineCap = 'round';
    ctx.stroke();

    // ----- G. 嘴型系统 (支持微笑、露齿大笑带小红舌、说话开合与 O 型嘟嘴) -----
    const openVal = mouthOpen !== undefined ? mouthOpen : (expr === 'talk' ? 0.5 + 0.4 * Math.sin(t * 18) : 0);

    if (openVal > 0.08 || expr === 'talk') {
      // 说话开合
      const openH = Math.max(14, openVal * 40);
      ctx.beginPath();
      ctx.moveTo(-48, mouthCenterY - 10);
      ctx.quadraticCurveTo(0, mouthCenterY - 6, 48, mouthCenterY - 10);
      ctx.quadraticCurveTo(52, mouthCenterY - 10 + openH, 0, mouthCenterY - 10 + openH);
      ctx.quadraticCurveTo(-52, mouthCenterY - 10 + openH, -48, mouthCenterY - 10);
      ctx.closePath();
      ctx.fillStyle = pal.mouthInside;
      ctx.fill();

      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY - 10 + openH, 30, 16, 0, 0, TAU);
      ctx.fillStyle = pal.tongue;
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = 5.5;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();

    } else if (expr === 'laugh' || expr === 'cheer') {
      // 官方 1:1 露齿大笑 (带白牙带与小粉舌)
      ctx.beginPath();
      ctx.moveTo(-54, mouthCenterY - 10);
      ctx.quadraticCurveTo(0, mouthCenterY - 6, 54, mouthCenterY - 10);
      ctx.quadraticCurveTo(60, mouthCenterY + 34, 0, mouthCenterY + 40);
      ctx.quadraticCurveTo(-60, mouthCenterY + 34, -54, mouthCenterY - 10);
      ctx.closePath();
      ctx.fillStyle = pal.mouthInside;
      ctx.fill();

      ctx.save();
      ctx.clip();
      // 上排整洁白牙带 (露齿)
      ctx.beginPath();
      ctx.moveTo(-44, mouthCenterY - 10);
      ctx.lineTo(44, mouthCenterY - 10);
      ctx.lineTo(42, mouthCenterY + 4);
      ctx.quadraticCurveTo(0, mouthCenterY + 7, -42, mouthCenterY + 4);
      ctx.closePath();
      ctx.fillStyle = pal.teeth;
      ctx.fill();

      // 小粉舌
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY + 28, 38, 18, 0, 0, TAU);
      ctx.fillStyle = pal.tongue;
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = 6.0;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();

    } else if (isSurprise || expr === 'blow') {
      // O 型嘟嘴 / 吹蜡烛
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY + 4, 16, 20, 0, 0, TAU);
      ctx.fillStyle = pal.mouthInside;
      ctx.fill();

      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY + 16, 12, 10, 0, 0, TAU);
      ctx.fillStyle = pal.tongue;
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = 5.5;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();

    } else if (isSad) {
      // 难过瘪嘴
      ctx.beginPath();
      ctx.moveTo(-44, mouthCenterY + 12);
      ctx.quadraticCurveTo(0, mouthCenterY - 4, 44, mouthCenterY + 12);
      ctx.lineWidth = 6.0;
      ctx.strokeStyle = pal.stroke;
      ctx.lineCap = 'round';
      ctx.stroke();

    } else {
      // 官方经典温暖微笑唇线 (带右侧俏皮嘴角勾)
      ctx.beginPath();
      ctx.moveTo(-50, mouthCenterY - 4);
      ctx.quadraticCurveTo(-15, mouthCenterY + 20, 40, mouthCenterY + 2);
      ctx.quadraticCurveTo(50, mouthCenterY - 4, 52, mouthCenterY - 12);
      ctx.lineWidth = 6.0;
      ctx.strokeStyle = pal.stroke;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // ----- H. 腮红 -----
    if (expr === 'shy' || expr === 'laugh' || expr === 'hug') {
      ctx.beginPath();
      ctx.ellipse(hx + 55, yTop + 240, 26, 16, 0, 0, TAU);
      ctx.ellipse(hw / 2 - 55, yTop + 240, 26, 16, 0, 0, TAU);
      ctx.fillStyle = pal.blush;
      ctx.fill();
    }

    ctx.restore(); // 结束头颈变换
  }

  // 6. 绘制派对帽 (1:1 官方还原: 对齐 frame_18)
  // 深蓝紫圆锥帽 (#4B3B8A) + 散落明黄小五角星 (#F5CE4D) + 浅紫粉圆点 (#C284BD) + 帽尖浅蓝蓬松折皱花球 (#93C0E5) + 下巴白色细弹力带！
  function drawPartyHat(ctx, headRotDeg, torsoRotDeg, t, pal, imgs) {
    ctx.save();
    ctx.translate(0, -490);
    ctx.rotate(headRotDeg * DEG2RAD);
    ctx.translate(0, -290); // 精准坐落于头顶两耳间正中 (局部 yTop=-290)

    // 闭式解弹簧阻尼微摆 (固有频率 1.5 Hz)
    const hatWobble = Math.sin(t * TAU * 1.5) * 1.6;
    ctx.rotate(hatWobble * DEG2RAD);

    const hw = 148;
    const hh = 236;

    // 1) 锥形帽主体路径
    const conePath = () => {
      ctx.beginPath();
      ctx.moveTo(-hw / 2, 0);
      ctx.lineTo(0, -hh);
      ctx.lineTo(hw / 2, 0);
      ctx.quadraticCurveTo(0, 16, -hw / 2, 0);
      ctx.closePath();
    };

    conePath();
    ctx.fillStyle = pal.hatCone; // #4B3B8A 深蓝紫
    ctx.fill();

    // 2) 官方图案: 明黄小五角星与浅紫粉圆点 (严格裁剪在圆锥内)
    ctx.save();
    conePath();
    ctx.clip();

    // 明黄小五角星 (#F5CE4D)
    ctx.fillStyle = pal.hatStar;
    drawStar(ctx, -22, -80, 5, 15, 6.5);
    ctx.fill();
    drawStar(ctx, 26, -125, 5, 17, 7.5);
    ctx.fill();
    drawStar(ctx, -15, -172, 5, 12, 5.0);
    ctx.fill();
    drawStar(ctx, 20, -50, 5, 13, 5.8);
    ctx.fill();

    // 浅紫粉圆点 (#C284BD)
    ctx.fillStyle = pal.hatDot;
    const dots = [
      [25, -88, 11],
      [-26, -135, 10],
      [0, -58, 8.5],
      [12, -180, 8]
    ];
    dots.forEach(([dx, dy, dr]) => {
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, TAU);
      ctx.fill();
    });
    ctx.restore();

    // 锥体轮廓有色描边
    conePath();
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = pal.stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 3) 帽尖浅蓝蓬松折皱花球 (pom-pom: 8 瓣圆润簇拥折皱花球 #93C0E5)
    ctx.save();
    ctx.translate(0, -hh);
    ctx.fillStyle = pal.hatPom;
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 3.5;

    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * TAU;
      const bx = Math.cos(ang) * 11;
      const by = Math.sin(ang) * 11;
      ctx.beginPath();
      ctx.arc(bx, by, 10.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 13.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4) 下巴白色细弹力带 (frame_18 官方对齐: 从帽基两侧自然滑入耳侧，并在下颌正下方显露贴合弧线)
    ctx.beginPath();
    ctx.moveTo(-hw / 2 + 8, 4);
    ctx.lineTo(-hw / 2 - 12, 65);
    ctx.moveTo(hw / 2 - 8, 4);
    ctx.lineTo(hw / 2 + 12, 65);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = pal.hatStrap;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 下颌正下方贴合细弹力带弧线 (紧托嘴吻底沿，绝不遮挡面部五官)
    ctx.beginPath();
    ctx.moveTo(-62, 332);
    ctx.quadraticCurveTo(0, 344, 62, 332);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = pal.hatStrap;
    ctx.lineCap = 'round';
    ctx.stroke();

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
      ctx.strokeStyle = '#13284C';
      ctx.lineWidth = 4.5;
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

    // 动态接地阴影 (平稳贴地)
    const jumpH = Math.max(0, -dy);
    const shadowScale = clamp(1.0 - jumpH / 260, 0.38, 1.0);
    const shadowAlpha = clamp(0.32 - jumpH / 450, 0.05, 0.32);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 150 * scale * shadowScale, 32 * scale * shadowScale, 0, 0, TAU);
    ctx.fillStyle = `rgba(18, 40, 60, ${shadowAlpha})`;
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
    const armLRot = (typeof p.armL === 'object' ? p.armL.rot : p.armL) || 0;
    const isArmBehindHead = (Math.abs(armLRot) > 65) && (poseName !== 'cover_mouth') && (poseName !== 'whisper');

    // 双手胸前合抱姿势置于胸前层级 (拍手、抱骨头、求拥抱、捂嘴、头顶拍手、指向、挥手)
    const isArmRInFront = (poseName === 'clap') || (poseName === 'hug_bone') || (poseName === 'cover_mouth') || (poseName === 'hug') || (poseName === 'clap_overhead') || (poseName === 'point') || (poseName === 'wave');

    // 关节点定位 (与 380px 方圆柱身宽 1:1 精准锚定)
    const shoulderL = [-170 * pal.scaleW, -490];
    const shoulderR = [170 * pal.scaleW, -485];
    const hipL = [-75 * pal.scaleW, -170];
    const hipR = [75 * pal.scaleW, -170];

    const imgs = (pupData && pupData.imgs) || (state && state.imgs) || null;

    // ----- 绘制层序 -----
    // 1) 尾巴
    drawTail(ctx, p.tail.rot, pal, isBingo);

    // 2) 右臂 (后爪) - 若非胸前合抱，在躯干后绘制
    if (!isArmRInFront) {
      drawArm(ctx, shoulderR, p.armR, pal, isBingo, true);
    }

    // 3) 腿部 (后腿与前腿) - 短粗直柱腿二段铰链绘制
    drawLeg(ctx, hipR, p.legR, pal, isBingo, true);
    drawLeg(ctx, hipL, p.legL, pal, isBingo, false);

    // 4) 躯干 (下半方圆柱体 + 横向大号奶油肚皮)
    drawTorso(ctx, pal, isBingo);

    // 若手臂高举且非胸前合抱，在头部前先画左臂
    if (isArmBehindHead && !isArmRInFront) {
      drawArm(ctx, shoulderL, p.armL, pal, isBingo, false);
    }

    // 5) 头颈与完整五官 (一体式方圆柱头颈，1:1 等宽直柱)
    drawHead(ctx, p.head.rot, pal, isBingo, expr, look, t, mouthOpen);

    // 6) 派对帽 (1:1 官方深蓝紫圆锥帽 + 花球 + 弹力带)
    const hasHat = state.hat && state.hat.visible !== false;
    if (hasHat) {
      drawPartyHat(ctx, p.head.rot, p.torso.rot, t, pal, imgs);
    }

    // 若双手在胸前合抱，在躯干和头部之后绘制右臂与左臂
    if (isArmRInFront) {
      drawArm(ctx, shoulderR, p.armR, pal, isBingo, true);
      drawArm(ctx, shoulderL, p.armL, pal, isBingo, false);
    } else if (!isArmBehindHead) {
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
