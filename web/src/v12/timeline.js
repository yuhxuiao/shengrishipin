// timeline.js — V12 角色 Track 与 Beat 时间轴求值系统
// 契约: 纯函数, 无跨帧状态 (满足并行 Worker 乱序渲染)
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;

  // 基础缓动库
  const easeLinear = u => u;
  const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
  const easeInCubic = u => u * u * u;
  const easeInOutCubic = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const easeBackOut = (u, s = 1.70158) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);

  function getEaseFn(name) {
    if (name === 'outCubic') return easeOutCubic;
    if (name === 'inCubic') return easeInCubic;
    if (name === 'inOutCubic' || name === 'easeInOut') return easeInOutCubic;
    if (name === 'backOut') return easeBackOut;
    return easeLinear;
  }

  // 预备 (anticipation) 与过冲回弹 (overshoot) 交叉混合曲线 (基于 Penner backInOut)
  // 在 0..1 过程中: 前段轻微反向预备 (-2%~-5%), 中段平滑加速, 后段轻微过冲回弹 (+2%~+5%), 最终归位 1.0
  function easeAnticipateOvershoot(u, s = 1.0) {
    u = clamp(u, 0, 1);
    const c = s * 1.525;
    if (u < 0.5) {
      const t = u * 2;
      return 0.5 * (t * t * ((c + 1) * t - c));
    } else {
      const t = u * 2 - 2;
      return 0.5 * (t * t * ((c + 1) * t + c) + 2);
    }
  }

  // 递归混合两个姿势对象 (对关节角度/坐标/变形值做数值插值)
  function blendPose(poseA, poseB, k) {
    if (!poseA) return poseB || {};
    if (!poseB) return poseA || {};
    const res = {};
    const allKeys = new Set([...Object.keys(poseA), ...Object.keys(poseB)]);
    for (const key of allKeys) {
      const va = poseA[key];
      const vb = poseB[key];
      if (typeof va === 'number' || typeof vb === 'number') {
        res[key] = lerp(va || 0, vb || 0, k);
      } else if (typeof va === 'object' && va !== null && typeof vb === 'object' && vb !== null) {
        res[key] = blendPose(va, vb, k);
      } else {
        res[key] = k < 0.5 ? va : vb;
      }
    }
    return res;
  }

  // FK 挖挖五通道姿势混合
  function blendFkPose(poseA, poseB, k) {
    poseA = poseA || {};
    poseB = poseB || {};
    return {
      boom: lerp(poseA.boom !== undefined ? poseA.boom : 47.5, poseB.boom !== undefined ? poseB.boom : 47.5, k),
      stick: lerp(poseA.stick !== undefined ? poseA.stick : -26, poseB.stick !== undefined ? poseB.stick : -26, k),
      bucket: lerp(poseA.bucket !== undefined ? poseA.bucket : -5, poseB.bucket !== undefined ? poseB.bucket : -5, k),
      bob: lerp(poseA.bob || 0, poseB.bob || 0, k),
      squash: clamp(lerp(poseA.squash || 0, poseB.squash || 0, k), -0.12, 0.12),
    };
  }

  // 在有序 beats 数组中二分或线性查找当前时刻所在的段 [b0, b1]
  function findSegment(track, t) {
    const n = track.length;
    if (n === 0) return null;
    if (t <= track[0].t) return { b0: track[0], b1: track[0], u: 0, idx: 0, done: false };
    if (t >= track[n - 1].t) return { b0: track[n - 1], b1: track[n - 1], u: 1, idx: n - 1, done: true };
    for (let i = 0; i < n - 1; i++) {
      if (t >= track[i].t && t < track[i + 1].t) {
        const segDur = track[i + 1].t - track[i].t;
        const u = segDur > 0 ? (t - track[i].t) / segDur : 0;
        return { b0: track[i], b1: track[i + 1], u, idx: i, done: false };
      }
    }
    return { b0: track[n - 1], b1: track[n - 1], u: 1, idx: n - 1, done: true };
  }

  // 步态计算: 根据 move 类型与时间计算竖直起伏与腿/臂摆动
  function evalGait(move, t, b0, uSeg) {
    if (!move || move === 'none') return { dy: 0, legSwing: 0, armSwing: 0 };

    if (move === 'run') {
      const freq = 2.5;
      const ph = Math.sin(t * TAU * freq);
      return {
        dy: -Math.abs(ph) * 14,
        legSwing: ph * 30,
        armSwing: -ph * 22,
        headBob: Math.sin(t * TAU * freq) * 3.5,
      };
    }

    if (move === 'walk') {
      const freq = 1.8;
      const ph = Math.sin(t * TAU * freq);
      return {
        dy: -Math.abs(ph) * 6,
        legSwing: ph * 20,
        armSwing: -ph * 15,
        headBob: Math.sin(t * TAU * freq) * 2.0,
      };
    }

    if (move === 'hop') {
      const freq = 1.4;
      const cyc = ((t - (b0.t || 0)) * freq) % 1.0;
      let dy = 0, squash = 0;
      if (cyc < 0.65) {
        const uHop = cyc / 0.65;
        dy = -4 * 45 * uHop * (1 - uHop);
      } else {
        const uLand = (cyc - 0.65) / 0.35;
        squash = 0.08 * Math.sin(uLand * Math.PI);
      }
      return { dy, legSwing: -10, armSwing: -20, squash };
    }

    if (move === 'tiptoe') {
      const freq = 2.0;
      const ph = Math.sin(t * TAU * freq);
      return {
        dy: -Math.abs(ph) * 4 - 6,
        legSwing: ph * 14,
        armSwing: -ph * 10,
        headBob: ph * 1.5,
      };
    }

    if (move === 'drive') {
      return {
        dy: Math.sin(t * TAU * 3.5) * 2.5,
        legSwing: 0,
        armSwing: 0,
      };
    }

    return { dy: 0, legSwing: 0, armSwing: 0 };
  }

  // ==================== 配角 (Pup: Bluey & Bingo) 求值 ====================
  function evalPup(charKey, charCfg, t, shot) {
    if (!charCfg || charCfg.visible === false) return { visible: false };

    // 1. 新规范: track / beats 驱动
    if (Array.isArray(charCfg.track) && charCfg.track.length > 0) {
      const track = charCfg.track;
      const firstBeat = track[0];
      const lastBeat = track[track.length - 1];

      // 时间范围检查: 不在 track 范围内且在画外时不可见 (入场前与出场后)
      const isOffscreen = x => (x !== undefined && (x < -150 || x > 2100));
      if (t < firstBeat.t) {
        if (isOffscreen(firstBeat.x)) return { visible: false };
      }
      if (t > lastBeat.t) {
        if (isOffscreen(lastBeat.x)) return { visible: false };
      }

      const seg = findSegment(track, t);
      const b0 = seg.b0;
      const b1 = seg.b1;
      const easeFn = getEaseFn(b0.ease || 'linear');
      const uPos = easeFn(seg.u);

      // (1) 位置与尺寸插值
      const x0 = b0.x !== undefined ? b0.x : 600;
      const x1 = b1.x !== undefined ? b1.x : x0;
      const x = lerp(x0, x1, uPos);

      const footY0 = b0.footY || charCfg.footY || 880;
      const footY1 = b1.footY || footY0;
      const footY = lerp(footY0, footY1, uPos);

      const defaultH = charKey === 'bluey' ? 420 : 360;
      const h0 = b0.h || charCfg.h || defaultH;
      const h1 = b1.h || h0;
      const h = lerp(h0, h1, uPos);

      // (2) 步态与弹跳
      const activeMove = b0.move || 'none';
      const gait = evalGait(activeMove, t, b0, seg.u);
      let dy = (b0.dy || 0) + gait.dy;

      // (3) 朝向 (facing) 翻转: 0.15s 横向 scale 旋转过渡
      const f0 = b0.facing !== undefined ? b0.facing : 1;
      const f1 = b1.facing !== undefined ? b1.facing : f0;
      let facingScale = f0;
      if (f0 !== f1 && seg.idx > 0 && t >= b1.t - 0.001) {
        // 如果在 b1 处切换朝向
        const flipProg = clamp((t - b1.t) / 0.15, 0, 1);
        facingScale = f0 * Math.cos(flipProg * Math.PI);
      } else if (f0 !== f1) {
        facingScale = f0;
      }

      // (4) 姿势 (pose) 交叉混合与预备/过冲
      const Pup = root.V12Pup || root.V11Pup;
      const poseNameA = b0.pose || 'stand';
      const poseNameB = b1.pose || poseNameA;

      let blendedPose;
      if (seg.b0 === seg.b1 || poseNameA === poseNameB || seg.idx === track.length - 1) {
        // 同一姿势无需混合
        const baseDef = (Pup && Pup.POSES && Pup.POSES[poseNameA]) ? Pup.POSES[poseNameA] : (Pup && Pup.POSES ? Pup.POSES.stand : {});
        blendedPose = JSON.parse(JSON.stringify(baseDef));
        blendedPose.poseName = poseNameA;
      } else {
        // 跨 beat 切换姿势: 在 b1.t 开始的 blend 窗口内混合 (默认 0.25s)
        const blendDur = b1.blend !== undefined ? b1.blend : 0.25;
        const blendT = t - b1.t;
        if (blendT < 0) {
          const baseDef = (Pup && Pup.POSES && Pup.POSES[poseNameA]) ? Pup.POSES[poseNameA] : (Pup && Pup.POSES ? Pup.POSES.stand : {});
          blendedPose = JSON.parse(JSON.stringify(baseDef));
          blendedPose.poseName = poseNameA;
        } else if (blendT >= blendDur) {
          const baseDef = (Pup && Pup.POSES && Pup.POSES[poseNameB]) ? Pup.POSES[poseNameB] : (Pup && Pup.POSES ? Pup.POSES.stand : {});
          blendedPose = JSON.parse(JSON.stringify(baseDef));
          blendedPose.poseName = poseNameB;
        } else {
          const uBlend = blendT / blendDur;
          const k = easeAnticipateOvershoot(uBlend, 0.9);
          const defA = (Pup && Pup.POSES && Pup.POSES[poseNameA]) ? Pup.POSES[poseNameA] : (Pup && Pup.POSES ? Pup.POSES.stand : {});
          const defB = (Pup && Pup.POSES && Pup.POSES[poseNameB]) ? Pup.POSES[poseNameB] : (Pup && Pup.POSES ? Pup.POSES.stand : {});
          blendedPose = blendPose(defA, defB, k);
          blendedPose.poseName = k < 0.5 ? poseNameA : poseNameB;
        }
      }

      // 叠加步态摆动到姿势
      if (gait.legSwing) {
        if (!blendedPose.legL) blendedPose.legL = { rot: 0 };
        if (!blendedPose.legR) blendedPose.legR = { rot: 0 };
        blendedPose.legL.rot = (blendedPose.legL.rot || 0) + gait.legSwing;
        blendedPose.legR.rot = (blendedPose.legR.rot || 0) - gait.legSwing;
      }
      if (gait.armSwing) {
        if (!blendedPose.armL) blendedPose.armL = { rot: 0 };
        if (!blendedPose.armR) blendedPose.armR = { rot: 0 };
        blendedPose.armL.rot = (blendedPose.armL.rot || 0) + gait.armSwing;
        blendedPose.armR.rot = (blendedPose.armR.rot || 0) - gait.armSwing;
      }
      if (gait.headBob) {
        if (!blendedPose.head) blendedPose.head = { rot: 0 };
        blendedPose.head.rot = (blendedPose.head.rot || 0) + gait.headBob;
      }

      // (5) 表情与视线 (expr & look / face: {expr, look})
      const b0Expr = (b0.face && b0.face.expr) || b0.expr;
      const b1Expr = (b1.face && b1.face.expr) || b1.expr;
      const expr = (b1Expr && t >= b1.t) ? b1Expr : (b0Expr || charCfg.expr || 'happy');
      const lookA = (b0.face && b0.face.look) || b0.look || charCfg.look || [0, 0];
      const lookB = (b1.face && b1.face.look) || b1.look || lookA;
      let look = lookA;
      if (b1.face?.look || b1.look && t >= b1.t) {
        const uLook = clamp((t - b1.t) / 0.12, 0, 1);
        look = [lerp(lookA[0], lookB[0], uLook), lerp(lookA[1], lookB[1], uLook)];
      }

      const item = (b1.item && t >= b1.t) ? b1.item : (b0.item || charCfg.item || null);

      return {
        visible: true,
        x,
        footY,
        h,
        dy,
        facing: facingScale,
        pose: blendedPose,
        expr,
        look,
        item,
        hat: { visible: b0.hasHat !== false && charCfg.hasHat !== false },
        squash: (b0.squash || 0) + (gait.squash || 0),
      };
    }

    // 2. 向后兼容: 旧版静态/enterAt 写法
    let x = charCfg.x !== undefined ? charCfg.x : 600;
    let dy = 0;
    let pose = charCfg.pose || 'stand';

    if (charCfg.enterAt !== undefined) {
      if (t < charCfg.enterAt) return { visible: false };
      const et = t - charCfg.enterAt;
      if (et < 0.9) {
        const u = et / 0.9;
        x = lerp(charCfg.x0 !== undefined ? charCfg.x0 : 1850, charCfg.x1 !== undefined ? charCfg.x1 : charCfg.x, u * u * (3 - 2 * u));
        dy = -4 * 140 * u * (1 - u);
        pose = 'hop';
      } else {
        x = charCfg.x1 !== undefined ? charCfg.x1 : charCfg.x;
        pose = charCfg.pose || 'stand';
      }
    }

    return {
      visible: true,
      x,
      footY: charCfg.footY || 880,
      h: charCfg.h || (charKey === 'bluey' ? 420 : 360),
      dy,
      facing: charCfg.facing !== undefined ? charCfg.facing : 1,
      pose,
      expr: charCfg.expr || 'happy',
      look: charCfg.look || [0, 0],
      item: charCfg.item || null,
      hat: { visible: true },
    };
  }

  // ==================== 挖挖 (Wawa) 求值 ====================
  function evalWawa(wawaCfg, t, shot) {
    if (!wawaCfg || wawaCfg.visible === false) return { visible: false };

    // 1. 新规范: track / beats 驱动
    if (Array.isArray(wawaCfg.track) && wawaCfg.track.length > 0) {
      const track = wawaCfg.track;
      const firstBeat = track[0];
      const lastBeat = track[track.length - 1];

      const isWawaOffscreen = dx => (dx !== undefined && (dx < -1500 || dx > 1500));
      if (t < firstBeat.t) {
        if (isWawaOffscreen(firstBeat.dx)) return { visible: false };
      }
      if (t > lastBeat.t) {
        if (isWawaOffscreen(lastBeat.dx)) return { visible: false };
      }

      const seg = findSegment(track, t);
      const b0 = seg.b0;
      const b1 = seg.b1;
      const easeFn = getEaseFn(b0.ease || 'linear');
      const uPos = easeFn(seg.u);

      // (1) 位移 dx 与履带滚动 trackScroll
      const dx0 = b0.dx !== undefined ? b0.dx : 0;
      const dx1 = b1.dx !== undefined ? b1.dx : dx0;
      const dx = lerp(dx0, dx1, uPos);

      // 纯函数计算累计滚动里程 (无跨帧状态)
      let cumulativeDist = 0;
      for (let j = 0; j < seg.idx; j++) {
        cumulativeDist += Math.abs((track[j + 1].dx !== undefined ? track[j + 1].dx : 0) - (track[j].dx !== undefined ? track[j].dx : 0));
      }
      cumulativeDist += Math.abs(dx - dx0);
      const trackScroll = cumulativeDist * 1.6;

      // (2) 动作与 FK 姿势混合 (0.3s 混合时长, 预备+过冲)
      const Actions = root.V12Actions || root.V11Actions;
      const actA = b0.action || 'idle';
      const actB = b1.action || actA;
      const lt = t - shot.t0;

      const getActPose = (actName, timeLt) => {
        if (Actions && Actions[actName]) return Actions[actName](timeLt);
        if (Actions && Actions.idle) return Actions.idle(timeLt);
        return { boom: 47.5, stick: -26, bucket: -5, bob: 0, squash: 0 };
      };

      let pose;
      if (seg.b0 === seg.b1 || actA === actB || seg.idx === track.length - 1) {
        pose = getActPose(actA, lt);
      } else {
        const blendDur = b1.blend !== undefined ? b1.blend : 0.30;
        const blendT = t - b1.t;
        if (blendT < 0) {
          pose = getActPose(actA, lt);
        } else if (blendT >= blendDur) {
          pose = getActPose(actB, lt);
        } else {
          const uBlend = blendT / blendDur;
          const k = easeAnticipateOvershoot(uBlend, 0.85);
          const poseA = getActPose(actA, lt);
          const poseB = getActPose(actB, lt);
          pose = blendFkPose(poseA, poseB, k);
        }
      }

      // 步态次级震动
      const activeMove = b0.move || 'none';
      if (activeMove === 'drive') {
        pose.bob = (pose.bob || 0) + Math.sin(t * TAU * 3.6) * 2.8;
      } else if (activeMove === 'walk') {
        pose.bob = (pose.bob || 0) + 4 * Math.abs(Math.sin(Math.PI * 2 * lt / 0.5));
      }

      // 蛋糕修正
      if (b0.hasCake || wawaCfg.hasCake) {
        pose.bucket = -12;
      }

      // (3) 表情与视线
      const b0Expr = (b0.face && b0.face.expr) || b0.expr;
      const b1Expr = (b1.face && b1.face.expr) || b1.expr;
      const expr = (b1Expr && t >= b1.t) ? b1Expr : (b0Expr || wawaCfg.expr || 'happy');
      const lookA = (b0.face && b0.face.look) || b0.look || wawaCfg.look || [0, 0];
      const lookB = (b1.face && b1.face.look) || b1.look || lookA;
      let look = lookA;
      if (b1.face?.look || b1.look && t >= b1.t) {
        const uLook = clamp((t - b1.t) / 0.12, 0, 1);
        look = [lerp(lookA[0], lookB[0], uLook), lerp(lookA[1], lookB[1], uLook)];
      }

      return {
        visible: true,
        isTrack: true,
        dx,
        trackScroll,
        pose,
        expr,
        look,
        scale: b0.scale !== undefined ? b0.scale : (wawaCfg.scale !== undefined ? wawaCfg.scale : 0.52),
        x: b0.x !== undefined ? b0.x : (wawaCfg.x !== undefined ? wawaCfg.x : 1040),
        mirror: b0.mirror !== undefined ? b0.mirror : !!wawaCfg.mirror,
        hasCake: b0.hasCake !== undefined ? b0.hasCake : !!wawaCfg.hasCake,
        hasHat: b0.hasHat !== undefined ? b0.hasHat : !!wawaCfg.hasHat,
      };
    }

    // 2. 向后兼容: 旧版单一 action 写法
    return Object.assign({ visible: true, isTrack: false }, wawaCfg);
  }

  const Timeline = {
    easeAnticipateOvershoot,
    blendPose,
    blendFkPose,
    evalGait,
    evalPup,
    evalWawa,
  };

  root.V12Timeline = Timeline;
  if (typeof module !== 'undefined' && module.exports) module.exports = Timeline;
})(typeof globalThis !== 'undefined' ? globalThis : this);
