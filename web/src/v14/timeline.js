// timeline.js — V14 角色 Track 与 Beat 时间轴求值系统 (抗抽搐平滑引擎升级版)
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

  // 平滑三次 Hermite 曲线 (smoothstep: 3*u^2 - 2*u^3)
  // 一阶导数在两端点均为 0, 彻底杜绝加速度突变与抽搐
  const smoothstep = u => {
    u = clamp(u, 0, 1);
    return u * u * (3 - 2 * u);
  };

  function getEaseFn(name) {
    if (name === 'outCubic') return easeOutCubic;
    if (name === 'inCubic') return easeInCubic;
    if (name === 'inOutCubic' || name === 'easeInOut') return easeInOutCubic;
    if (name === 'backOut') return easeBackOut;
    return easeLinear;
  }

  // 预备 (anticipation) 与过冲回弹 (overshoot) 曲线 (保留向后兼容导出, 姿态切换改用 smoothstep)
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

  // 递归混合两个姿势对象 (对关节角度/坐标/变形值做平滑数值插值)
  function blendPose(poseA, poseB, k) {
    if (!poseA) return poseB || {};
    if (!poseB) return poseA || {};
    const res = {};
    const allKeys = new Set([...Object.keys(poseA), ...Object.keys(poseB)]);
    for (const key of allKeys) {
      const va = poseA[key];
      const vb = poseB[key];
      if (typeof va === 'number' || typeof vb === 'number') {
        const na = typeof va === 'number' ? va : 0;
        const nb = typeof vb === 'number' ? vb : 0;
        res[key] = lerp(na, nb, k);
      } else if ((typeof va === 'object' && va !== null) || (typeof vb === 'object' && vb !== null)) {
        res[key] = blendPose(va || {}, vb || {}, k);
      } else {
        res[key] = k < 0.5 ? va : vb;
      }
    }
    return res;
  }

  // FK 挖挖六通道姿势混合 (支持 pitch 与 soilFill, 平滑零突变)
  function blendFkPose(poseA, poseB, k) {
    poseA = poseA || {};
    poseB = poseB || {};
    return {
      boom: lerp(poseA.boom !== undefined ? poseA.boom : 47.5, poseB.boom !== undefined ? poseB.boom : 47.5, k),
      stick: lerp(poseA.stick !== undefined ? poseA.stick : -26, poseB.stick !== undefined ? poseB.stick : -26, k),
      bucket: lerp(poseA.bucket !== undefined ? poseA.bucket : -5, poseB.bucket !== undefined ? poseB.bucket : -5, k),
      bob: lerp(poseA.bob !== undefined ? poseA.bob : 0, poseB.bob !== undefined ? poseB.bob : 0, k),
      squash: clamp(lerp(poseA.squash !== undefined ? poseA.squash : 0, poseB.squash !== undefined ? poseB.squash : 0, k), -0.12, 0.12),
      pitch: lerp(poseA.pitch !== undefined ? poseA.pitch : 0, poseB.pitch !== undefined ? poseB.pitch : 0, k),
      soilFill: lerp(poseA.soilFill !== undefined ? poseA.soilFill : 0, poseB.soilFill !== undefined ? poseB.soilFill : 0, k),
      digCycle: poseA.digCycle !== undefined ? poseA.digCycle : (poseB.digCycle !== undefined ? poseB.digCycle : 0),
      actionName: k < 0.5 ? (poseA.actionName || '') : (poseB.actionName || ''),
    };
  }

  // 在有序 beats 数组中查找当前时刻所在的段 [b0, b1]
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

  // 平滑朝向翻转 (Facing Flip): 在 beat 翻转点前后 [-0.08s, +0.08s] 窗口内余弦平滑收缩展开 (2D 卡通纸片转身)
  function evalFacing(track, t, defaultFacing = 1) {
    if (!Array.isArray(track) || track.length === 0) return defaultFacing;
    const n = track.length;
    for (let i = 1; i < n; i++) {
      const prevB = track[i - 1];
      const curB = track[i];
      const fPrev = prevB.facing !== undefined ? prevB.facing : defaultFacing;
      const fCur = curB.facing !== undefined ? curB.facing : fPrev;
      if (fPrev !== fCur) {
        const flipT = curB.t;
        const segDur = Math.max(0.001, flipT - prevB.t);
        const halfWin = Math.min(0.08, segDur * 0.4);
        if (t >= flipT - halfWin && t <= flipT + halfWin) {
          const u = clamp((t - (flipT - halfWin)) / (2 * halfWin), 0, 1);
          const uSmooth = (1 - Math.cos(u * Math.PI)) * 0.5;
          return lerp(fPrev, fCur, uSmooth);
        }
      }
    }
    // 非翻转窗口: 取当前时刻所在 beat 的朝向
    if (t < track[0].t) return track[0].facing !== undefined ? track[0].facing : defaultFacing;
    if (t >= track[n - 1].t) return track[n - 1].facing !== undefined ? track[n - 1].facing : defaultFacing;
    for (let i = 0; i < n - 1; i++) {
      if (t >= track[i].t && t < track[i + 1].t) {
        return track[i].facing !== undefined ? track[i].facing : defaultFacing;
      }
    }
    return track[n - 1].facing !== undefined ? track[n - 1].facing : defaultFacing;
  }

  // 步态计算: 根据 move 类型与时间计算竖直起伏与腿/臂摆动
  function evalGait(move, t, b0, uSeg) {
    if (!move || move === 'none') return { dy: 0, legSwing: 0, armSwing: 0, headBob: 0, squash: 0 };

    if (move === 'run') {
      const freq = 2.5;
      const ph = Math.sin(t * TAU * freq);
      return {
        dy: -Math.abs(ph) * 14,
        legSwing: ph * 30,
        armSwing: -ph * 22,
        headBob: Math.sin(t * TAU * freq) * 3.5,
        squash: 0,
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
        squash: 0,
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
      return { dy, legSwing: -10, armSwing: -20, headBob: 0, squash };
    }

    if (move === 'tiptoe') {
      const freq = 2.0;
      const ph = Math.sin(t * TAU * freq);
      return {
        dy: -Math.abs(ph) * 4 - 6,
        legSwing: ph * 14,
        armSwing: -ph * 10,
        headBob: ph * 1.5,
        squash: 0,
      };
    }

    if (move === 'drive') {
      // 重构为重型履带底盘物理: 频率降低至 1.2Hz, 垂直起伏控制在平稳沉重的 1.2px
      return {
        dy: Math.sin(t * TAU * 1.2) * 1.2,
        legSwing: 0,
        armSwing: 0,
        headBob: 0,
        squash: 0,
      };
    }

    return { dy: 0, legSwing: 0, armSwing: 0, headBob: 0, squash: 0 };
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

      // (2) 混合时长与插值系数 (Hermite smoothstep 平滑过渡)
      // 设相邻两 beat 为 b0 与 b1, 混合时长 blendDur = Math.min(b1.blend || 0.35, (b1.t - b0.t) * 0.6)
      // 混合窗口设在到达 b1 之前的 [b1.t - blendDur, b1.t]
      const segDur = Math.max(0.001, b1.t - b0.t);
      const blendDur = Math.min(b1.blend !== undefined ? b1.blend : 0.35, segDur * 0.6);
      const inBlendWindow = (seg.b0 !== seg.b1) && (t >= b1.t - blendDur);
      const uBlend = inBlendWindow ? clamp((t - (b1.t - blendDur)) / blendDur, 0, 1) : 0;
      const kBlend = smoothstep(uBlend);

      // (3) 步态与弹跳 (带跨 beat 平滑渐变)
      const moveA = b0.move || 'none';
      const moveB = b1.move || moveA;
      let gait;
      if (seg.b0 === seg.b1 || moveA === moveB || !inBlendWindow) {
        gait = evalGait(moveA, t, b0, seg.u);
      } else {
        const gaitA = evalGait(moveA, t, b0, seg.u);
        const gaitB = evalGait(moveB, t, b1, 0);
        gait = {
          dy: lerp(gaitA.dy, gaitB.dy, kBlend),
          legSwing: lerp(gaitA.legSwing, gaitB.legSwing, kBlend),
          armSwing: lerp(gaitA.armSwing, gaitB.armSwing, kBlend),
          headBob: lerp(gaitA.headBob || 0, gaitB.headBob || 0, kBlend),
          squash: lerp(gaitA.squash || 0, gaitB.squash || 0, kBlend),
        };
      }
      const dyBase = inBlendWindow ? lerp(b0.dy || 0, b1.dy || 0, kBlend) : (b0.dy || 0);
      const dy = dyBase + gait.dy;

      // (4) 朝向 (facing) 翻转: 在 beat 翻转点前后 [-0.08s, +0.08s] 窗口内余弦平滑过渡
      const defaultFacing = charCfg.facing !== undefined ? charCfg.facing : 1;
      const facingScale = evalFacing(track, t, defaultFacing);

      // (5) 姿势 (pose) 交叉混合与平滑过渡
      const Pup = root.V12Pup || root.V11Pup;
      const poseNameA = b0.pose || 'stand';
      const poseNameB = b1.pose || poseNameA;

      const getPupPose = (pName) => {
        const baseDef = (Pup && Pup.POSES && Pup.POSES[pName]) ? Pup.POSES[pName] : (Pup && Pup.POSES ? Pup.POSES.stand : {});
        return JSON.parse(JSON.stringify(baseDef));
      };

      let blendedPose;
      if (seg.b0 === seg.b1 || poseNameA === poseNameB || !inBlendWindow) {
        blendedPose = getPupPose(poseNameA);
        blendedPose.poseName = poseNameA;
      } else {
        const defA = getPupPose(poseNameA);
        const defB = getPupPose(poseNameB);
        blendedPose = blendPose(defA, defB, kBlend);
        blendedPose.poseName = kBlend < 0.5 ? poseNameA : poseNameB;
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

      // (6) 表情与视线 (expr & look / face: {expr, look})
      const b0Expr = (b0.face && b0.face.expr) || b0.expr;
      const b1Expr = (b1.face && b1.face.expr) || b1.expr;
      const expr = (t >= b1.t && b1Expr) ? b1Expr : (b0Expr || charCfg.expr || 'happy');
      const lookA = (b0.face && b0.face.look) || b0.look || charCfg.look || [0, 0];
      const lookB = (b1.face && b1.face.look) || b1.look || lookA;
      let look = lookA;
      if (inBlendWindow && (lookA[0] !== lookB[0] || lookA[1] !== lookB[1])) {
        look = [lerp(lookA[0], lookB[0], kBlend), lerp(lookA[1], lookB[1], kBlend)];
      }

      const item = (t >= b1.t && b1.item !== undefined) ? b1.item : (b0.item || charCfg.item || null);
      const hasHat = (t >= b1.t ? b1.hasHat : b0.hasHat) !== false && charCfg.hasHat !== false;
      const squashBase = inBlendWindow ? lerp(b0.squash || 0, b1.squash || 0, kBlend) : (b0.squash || 0);

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
        hat: { visible: hasHat },
        squash: squashBase + (gait.squash || 0),
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

      // (1) 位移 dx 与履带滚动 trackScroll (绝对同步)
      const dx0 = b0.dx !== undefined ? b0.dx : 0;
      const dx1 = b1.dx !== undefined ? b1.dx : dx0;
      const dx = lerp(dx0, dx1, uPos);

      // 纯函数计算累计滚动里程 (无跨帧状态, 与位移绝对同步)
      let cumulativeDist = 0;
      for (let j = 0; j < seg.idx; j++) {
        cumulativeDist += Math.abs((track[j + 1].dx !== undefined ? track[j + 1].dx : 0) - (track[j].dx !== undefined ? track[j].dx : 0));
      }
      cumulativeDist += Math.abs(dx - dx0);
      const trackScroll = cumulativeDist * 1.6;

      // (2) 动作与 FK 姿势混合 (Hermite cubic 平滑过渡, 彻底废弃 overshoot 曲线)
      const Actions = root.V12Actions || root.V11Actions;
      const actA = b0.action || 'idle';
      const actB = b1.action || actA;
      const lt = t - shot.t0;

      const getActPose = (actName, beatT) => {
        const timeLt = (beatT !== undefined && actName !== 'idle') ? Math.max(0, t - beatT) : lt;
        let p;
        if (Actions && Actions[actName]) p = Object.assign({}, Actions[actName](timeLt));
        else if (Actions && Actions.idle) p = Object.assign({}, Actions.idle(timeLt));
        else p = { boom: 47.5, stick: -26, bucket: -5, bob: 0, squash: 0, pitch: 0 };
        p.actionName = actName;
        p.actionTime = timeLt;
        return p;
      };

      const segDur = Math.max(0.001, b1.t - b0.t);
      const blendDur = Math.min(b1.blend !== undefined ? b1.blend : 0.35, segDur * 0.6);
      const inBlendWindow = (seg.b0 !== seg.b1) && (t >= b1.t - blendDur);
      const uBlend = inBlendWindow ? clamp((t - (b1.t - blendDur)) / blendDur, 0, 1) : 0;
      const kBlend = smoothstep(uBlend);

      let pose;
      if (seg.b0 === seg.b1 || actA === actB || !inBlendWindow) {
        pose = getActPose(actA, b0.t);
      } else {
        const poseA = getActPose(actA, b0.t);
        const poseB = getActPose(actB, b1.t);
        pose = blendFkPose(poseA, poseB, kBlend);
      }

      // (3) 重构行驶与悬挂物理: 重型履带底盘物理 (1.2Hz, 1.2px 平稳沉重垂直起伏)
      const moveA = b0.move || 'none';
      const moveB = b1.move || moveA;
      let driveBob = 0;
      const isDriveA = (moveA === 'drive');
      const isDriveB = (moveB === 'drive');
      if (isDriveA && isDriveB) {
        driveBob = Math.sin(t * TAU * 1.2) * 1.2;
      } else if (isDriveA && !isDriveB) {
        driveBob = lerp(Math.sin(t * TAU * 1.2) * 1.2, 0, kBlend);
      } else if (!isDriveA && isDriveB) {
        driveBob = lerp(0, Math.sin(t * TAU * 1.2) * 1.2, kBlend);
      }
      pose.bob = (pose.bob || 0) + driveBob;

      if (moveA === 'walk') {
        const walkBob = 4 * Math.abs(Math.sin(Math.PI * 2 * lt / 0.5));
        pose.bob = (pose.bob || 0) + (inBlendWindow && moveB !== 'walk' ? lerp(walkBob, 0, kBlend) : walkBob);
      }

      // 蛋糕修正 (平滑处理)
      if (b0.hasCake || b1.hasCake || wawaCfg.hasCake) {
        if (b0.hasCake && b1.hasCake) {
          pose.bucket = -12;
        } else if (!b0.hasCake && b1.hasCake) {
          pose.bucket = inBlendWindow ? lerp(pose.bucket, -12, kBlend) : pose.bucket;
        } else if (b0.hasCake && !b1.hasCake) {
          pose.bucket = inBlendWindow ? lerp(-12, pose.bucket, kBlend) : -12;
        } else {
          pose.bucket = -12;
        }
      }

      // (4) 表情与视线
      const b0Expr = (b0.face && b0.face.expr) || b0.expr;
      const b1Expr = (b1.face && b1.face.expr) || b1.expr;
      const expr = (t >= b1.t && b1Expr) ? b1Expr : (b0Expr || wawaCfg.expr || 'happy');
      const lookA = (b0.face && b0.face.look) || b0.look || wawaCfg.look || [0, 0];
      const lookB = (b1.face && b1.face.look) || b1.look || lookA;
      let look = lookA;
      if (inBlendWindow && (lookA[0] !== lookB[0] || lookA[1] !== lookB[1])) {
        look = [lerp(lookA[0], lookB[0], kBlend), lerp(lookA[1], lookB[1], kBlend)];
      }

      // 移除说话时车身整体 4.8rad/s 剧烈抽动，仅保留大臂微幅呼吸感
      const frameIdx = Math.min(6839, Math.max(0, Math.floor(t * 30)));
      const Lipsync = root.V13Lipsync || root.V12Lipsync || root.V11Lipsync;
      const mouthOpen = (Lipsync && Lipsync[frameIdx]) || 0;
      if (mouthOpen > 0.08 || expr === 'talk') {
        const talkAmp = mouthOpen > 0.08 ? mouthOpen : 0.6;
        // main.js 中对说话时叠加 Math.sin(t * 4.8) * 2.2 * talkAmp, 此处预先对冲消除车身抖动
        pose.bob = (pose.bob || 0) - Math.sin(t * 4.8) * 2.2 * talkAmp;

        // 对大臂微幅呼吸感进行起止平滑包络, 避免开启/关闭瞬间角度突变
        const prevBeatExpr = (seg.idx > 0 && ((track[seg.idx - 1].face && track[seg.idx - 1].face.expr) || track[seg.idx - 1].expr));
        const isCurTalk = (b0Expr === 'talk');
        if (isCurTalk && prevBeatExpr !== 'talk') {
          const uRamp = clamp((t - b0.t) / 0.18, 0, 1);
          const kRamp = smoothstep(uRamp);
          pose.boom = (pose.boom || 0) - (1 - kRamp) * Math.sin(t * 3.6) * 1.5 * talkAmp;
        } else if (isCurTalk && inBlendWindow && b1Expr !== 'talk') {
          pose.boom = (pose.boom || 0) - kBlend * Math.sin(t * 3.6) * 1.5 * talkAmp;
        }
      }

      const s0 = b0.scale !== undefined ? b0.scale : (wawaCfg.scale !== undefined ? wawaCfg.scale : 0.52);
      const s1 = b1.scale !== undefined ? b1.scale : s0;
      const scale = lerp(s0, s1, uPos);

      const xBase0 = b0.x !== undefined ? b0.x : (wawaCfg.x !== undefined ? wawaCfg.x : 1040);
      const xBase1 = b1.x !== undefined ? b1.x : xBase0;
      const x = lerp(xBase0, xBase1, uPos);

      return {
        visible: true,
        isTrack: true,
        dx,
        trackScroll,
        pose,
        expr,
        look,
        scale,
        x,
        mirror: b0.mirror !== undefined ? b0.mirror : !!wawaCfg.mirror,
        hasCake: b0.hasCake !== undefined ? b0.hasCake : !!wawaCfg.hasCake,
        hasHat: b0.hasHat !== undefined ? b0.hasHat : !!wawaCfg.hasHat,
        action: kBlend < 0.5 ? actA : actB,
      };
    }

    // 2. 向后兼容: 旧版单一 action 写法
    return Object.assign({ visible: true, isTrack: false }, wawaCfg);
  }

  const Timeline = {
    smoothstep,
    easeAnticipateOvershoot,
    blendPose,
    blendFkPose,
    evalFacing,
    evalGait,
    evalPup,
    evalWawa,
  };

  root.V14Timeline = Timeline;
  root.V12Timeline = Timeline;
  if (typeof module !== 'undefined' && module.exports) module.exports = Timeline;
})(typeof globalThis !== 'undefined' ? globalThis : this);
