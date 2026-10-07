// physics_dig.js — V14 挖掘机真实机械力学与土壤动力学系统
// 契约: 纯函数/无状态 (满足并行 Worker 乱序渲染与离线校验)
// 架构:
//   1. 真实 5 阶段机械动力学动作 (Reach & Penetrate -> Bite & Reaction -> Crowd & Curl -> Heavy Lift -> Dump & Impact)
//   2. FK 矩阵底层增强 (Chassis pitch 悬挂俯仰受力微调, 前避震压缩 +1.5°, 后仰 -1.5°, 油缸 0 偏差)
//   3. 场景自适应物理挖掘与地质剖面渲染:
//      - 沙坑 (sandbox): 细腻金黄沙质纹理 (#E0B858, #D29E3A), 同心圆沙痕, 边沿沙粒崩塌滑落
//      - 花园草坪 (garden/yard): 表层嫩绿草皮撕裂层、中层深黑褐壤土与小碎石粒、齿印沟壑
//      - 金色草甸 (golden): 金色草地剖面、丁达尔夕阳泥质与坑底神秘金色光芒
//   4. 实时隆起土丘渲染 (侧旁堆叠, 随卸土进程从 0 实时堆高, 材质与场景地质自适应)
//   5. 斗内土壤饱满包裹渲染 (紧密贴合铲斗内壁, 从拉刮蓄满到举升耸立, 卸土前严密包裹)
//   6. 重力落土与冲击尘土粒子 (g=9.8 加速度下坠, 落地碰撞 dust_poof 激起)
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const NAVY = '#0B2F6E';

  // 依赖 FK 模块
  const FK = root.V10FK || (typeof require !== 'undefined' ? require('../v10/fk.js') : null);

  // ==================== 1. FK 矩阵底层增强 (带底盘俯仰角 pitch) ====================
  // pose: {boom, stick, bucket, bob, squash, pitch}
  // pitch: 度, 视觉逆时针约定 (正=车头下压前倾, 负=车头抬起后仰)
  function assembleWithPitch(p) {
    if (!FK) return null;
    const q = Math.max(-0.12, Math.min(0.12, p.squash || 0));
    const pitch = p.pitch || 0;
    const bodyTL = [FK.LAYOUT.body_tl[0], FK.LAYOUT.body_tl[1] - (p.bob || 0)];
    const bc = [bodyTL[0] + FK.PARTS.body.w / 2, bodyTL[1] + FK.PARTS.body.h];

    // 车身底盘在悬挂回转中心 bc 处受力俯仰微倾
    const mRotPitch = pitch ? FK.mRotCCW(pitch) : [1, 0, 0, 1, 0, 0];
    const mBody = FK.mMul(
      FK.mMul(
        FK.mMul(
          FK.mMul(FK.mTrans(bc[0], bc[1]), mRotPitch),
          FK.mScale(1 + 0.6 * q, 1 - q)
        ),
        FK.mTrans(-bc[0], -bc[1])
      ),
      FK.mTrans(bodyTL[0], bodyTL[1])
    );

    // 大臂根铰随车身实体同步移动 (真机 3/4 转台物理结构)
    const rootW = FK.mApply(mBody, FK.PIV.body_root);
    const mBoom = FK.mMul(FK.mMul(FK.mTrans(rootW[0], rootW[1]), FK.mRotCCW(p.boom)), FK.mTrans(-FK.PIV.boom_root[0], -FK.PIV.boom_root[1]));
    const elbowW = FK.mApply(mBoom, FK.PIV.boom_elbow);
    const mStick = FK.mMul(FK.mMul(FK.mTrans(elbowW[0], elbowW[1]), FK.mRotCCW(p.stick)), FK.mTrans(-FK.PIV.stick_elbow[0], -FK.PIV.stick_elbow[1]));
    const hingeW = FK.mApply(mStick, FK.PIV.stick_bucket);
    const mBucket = FK.mMul(FK.mMul(FK.mTrans(hingeW[0], hingeW[1]), FK.mRotCCW(p.bucket)), FK.mTrans(-FK.PIV.bucket_pin[0], -FK.PIV.bucket_pin[1]));

    return {
      mBody, mBoom, mStick, mBucket,
      rootW, elbowW, hingeW,
      teethW: FK.mApply(mBucket, FK.BUCKET_TEETH),
      bellyW: FK.mApply(mBucket, FK.BUCKET_BELLY),
      backW: FK.mApply(mBucket, FK.BUCKET_BACK),
      c1a: FK.mApply(mBody, FK.CYL.c1.a), c1b: FK.mApply(mBoom, FK.CYL.c1.b),
      c2a: FK.mApply(mBoom, FK.CYL.c2.a), c2b: FK.mApply(mStick, FK.CYL.c2.b),
      pitch,
    };
  }

  // 如果加载了 FK, 无缝升级 assemble 方法
  if (FK && typeof FK.assemble === 'function') {
    const origAssemble = FK.assemble;
    FK.assemble = function (p) {
      if (p && p.pitch !== undefined && p.pitch !== 0) {
        return assembleWithPitch(p);
      }
      return origAssemble(p);
    };
  }

  // ==================== 2. 真实 5 阶段动作动力学 (2.4s 循环) ====================
  // Fritsch-Carlson 单调样条插值 (6 通道: boom, stick, bucket, bob, squash, pitch)
  function keyframed6(kfs, period) {
    const n = kfs.length - 1;
    const names = ['boom', 'stick', 'bucket', 'bob', 'squash', 'pitch'];
    const times = kfs.map(k => k[0]);
    const ch = [1, 2, 3, 4, 5, 6].map(ci => kfs.map(k => k[ci]));
    const segH = i => (i === n - 1 ? period : times[i + 1]) - times[i];
    const tangents = ch.map(vals => {
      const d = i => (vals[i + 1] - vals[i]) / segH(i);
      const m = new Array(n + 1);
      for (let i = 0; i <= n; i++) {
        const d0 = d((i - 1 + n) % n), d1 = d(i % n);
        if (d0 * d1 <= 0) { m[i] = 0; continue; }
        const h0 = segH((i - 1 + n) % n), h1 = segH(i % n);
        const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
        m[i] = (w1 + w2) / (w1 / d0 + w2 / d1);
      }
      return m;
    });
    return t => {
      let tt = t % period; if (tt < 0) tt += period;
      let i = 0;
      while (i < n - 1 && times[i + 1] <= tt) i++;
      const t0 = times[i], hseg = segH(i);
      const u = clamp((tt - t0) / hseg, 0, 1);
      const u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      const out = {};
      for (let c = 0; c < 6; c++) {
        const p0 = ch[c][i], p1 = ch[c][i + 1];
        const m0 = tangents[c][i] * hseg, m1 = tangents[c][i + 1] * hseg;
        out[names[c]] = h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
      }
      out.squash = clamp(out.squash, -0.12, 0.12);
      return out;
    };
  }

  // 严格力学校准的关键帧序列 (2.4s 循环):
  //   Phase 1: 伸展入土 (0.00 ~ 0.40s) — 大臂伸展、小臂外展，铲斗以 ~58° 咬准地面
  //   Phase 2: 地面反作用力与悬挂下压 (0.40 ~ 0.75s) — 齿尖扎土瞬间垂直反作用力，前避震压缩 squash=0.045，车身底盘向前微倾 pitch=+1.5°，发动机低频微震颤
  //   Phase 3: 卷斗与收杆拉刮 (0.75 ~ 1.45s) — 小臂向内拉近、铲斗向内回卷，齿划地底弧线，深度严格受控，斗内迅速堆满饱满土壤
  //   Phase 4: 重载举升 (1.45 ~ 1.95s) — 满载大臂拔起，车身重心后移，底盘向后微仰 pitch=-1.5°，悬挂回弹，斗内土壤耸立
  //   Phase 5: 卸土回倾与重力下坠 (1.95 ~ 2.40s) — 铲斗外翻开敞，土壤 g=9.8 倾泻落地，侧旁隆起新土堆，落地激起 dust_poof，车身阻尼回正
  const DIG_KEYFRAMES = [
    // [t,   boom,  stick,  bucket, bob, squash, pitch]
    [0.00,  47.5, -26.0,  -5.0,  0.0, 0.00,  0.0],  // 中性呼吸点
    [0.28,  50.5, -29.5,  -0.5,  0.0, 0.02,  0.3],  // Phase 1: 远点咬土点 (入土角 ~58°)
    [0.42,  50.2, -29.8,  -0.5,  0.0, 0.045, 1.5],  // Phase 2: 反作用力下压 (pitch=+1.5° 前倾, squash=0.045)
    [0.65,  48.8, -25.5,  -4.0,  0.0, 0.04,  1.2],  // Phase 3: 刮程推进，地底划弧
    [0.90,  47.2, -21.0,  -7.0,  0.0, 0.03,  0.4],  // Phase 3: 收杆近点，铲斗深卷
    [1.10,  51.0, -36.0,  12.0,  1.0, 0.02, -0.2],  // Phase 3: 卷斗锁土，饱满泥块包裹在斗内
    [1.35,  56.0, -41.0,  22.0,  2.0, 0.02, -0.8],  // Phase 3->4: 拔出地表
    [1.55,  63.0, -40.5,  38.0,  3.0, 0.02, -1.5],  // Phase 4: 重载举升 (pitch=-1.5° 后仰, 悬挂回弹)
    [1.75,  62.5, -38.0,  49.0,  0.0, 0.02, -1.4],  // Phase 4: 举升定格展示饱满土堆
    [1.86,  60.0, -40.0,  44.0,  0.0, 0.00, -0.8],  // Phase 5: 卸土准备，外翻开敞
    [1.96,  57.5, -41.5,  36.0,  0.0, 0.00, -0.3],  // Phase 5: 泥土倾泻加速
    [2.06,  56.0, -42.0,  31.0,  0.0, 0.00,  0.0],  // Phase 5: 落土砸地，激起 dust_poof
    [2.16,  51.0, -42.0,  19.0,  0.0, 0.00,  0.2],  // Phase 5: 卸毕回转阻尼
    [2.27,  45.0, -34.5,   0.0,  0.0, 0.00,  0.1],  // 阻尼回程
    [2.40,  47.5, -26.0,  -5.0,  0.0, 0.00,  0.0],  // 平稳复位
  ];

  const evalDigSpline = keyframed6(DIG_KEYFRAMES, 2.4);

  // 综合动力学求值函数 (带引擎微震颤与土壤物理参数)
  function getDigPose(t) {
    const p = Object.assign({}, evalDigSpline(t));
    const cyc = ((t % 2.4) + 2.4) % 2.4;

    // Phase 2 (0.40 ~ 0.75s): 引擎高扭矩咬土低频微震颤
    if (cyc >= 0.38 && cyc <= 0.72) {
      const env = Math.sin((cyc - 0.38) / 0.34 * Math.PI);
      const tremor = Math.sin(t * 55) * 0.75 * env;
      p.bob = (p.bob || 0) + tremor;
      p.pitch = (p.pitch || 0) + Math.sin(t * 60) * 0.12 * env;
    }

    // 斗内土壤填充度 soilFill (0.0 ~ 1.0)
    let soilFill = 0;
    if (cyc < 0.68) {
      soilFill = 0;
    } else if (cyc < 1.30) {
      // Phase 3: 卷斗收杆过程中迅速堆起饱满厚重土壤 (0.0 -> 1.0)
      const u = (cyc - 0.68) / 0.62;
      soilFill = u * u * (3 - 2 * u);
    } else if (cyc < 1.90) {
      // Phase 4: 重载举升全程满载耸立 (1.0)
      soilFill = 1.0;
    } else if (cyc < 2.22) {
      // Phase 5: 翻斗开敞，泥土倾泻倒出 (1.0 -> 0.0)
      const u = (cyc - 1.90) / 0.32;
      soilFill = Math.max(0, 1.0 - u * 1.25);
    } else {
      soilFill = 0;
    }

    p.soilFill = soilFill;
    p.digCycle = cyc;
    return p;
  }

  // ==================== 3. 斗内土壤饱满包裹渲染 (材质自适应) ====================
  // 严密包裹在铲斗 scoop 内腔 (坐标系: bucket 件内局部或装配变换)
  function drawBucketSoil(ctx, fk, rootM, fillFactor, t, camM, loc) {
    if (!fk || fillFactor <= 0.01) return;
    const bucketM = FK.mMul(rootM, fk.mBucket);
    const fullM = camM ? FK.mMul(camM, bucketM) : bucketM;

    ctx.save();
    ctx.setTransform(fullM[0], fullM[1], fullM[2], fullM[3], fullM[4], fullM[5]);

    const s = clamp(fillFactor, 0, 1);
    const topY = lerp(520, 325, s);
    const midX = lerp(265, 280, s);

    const isSandbox = loc === 'sandbox';
    const isGolden = loc === 'golden';

    // 材质色彩体系
    // 沙坑: 金黄细腻沙质 (#E0B858, #D29E3A)
    // 金色草甸: 夕阳琥珀土质与金黄闪烁
    // 花园草坪: 肥沃深黑褐壤土与湿润光泽
    const cBase = isSandbox ? '#B87B22' : (isGolden ? '#3E2723' : '#261712');
    const cMid = isSandbox ? '#D29E3A' : (isGolden ? '#5D4037' : '#4E342E');
    const cHi = isSandbox ? '#E0B858' : (isGolden ? '#D4AF37' : '#795548');
    const cTop = isSandbox ? '#FFE082' : (isGolden ? '#FFD54F' : '#8D6E63');

    // 1. 底层紧实土壤底垫
    ctx.beginPath();
    ctx.moveTo(192, 520);
    ctx.quadraticCurveTo(176, 430, 190, topY + 45);
    ctx.bezierCurveTo(205, topY - 18, midX - 5, topY - 32, midX + 35, topY - 16);
    ctx.bezierCurveTo(midX + 75, topY + 8, 336, topY + 60, 350, 538);
    ctx.quadraticCurveTo(270, 570, 192, 520);
    ctx.closePath();

    ctx.fillStyle = cBase;
    ctx.fill();
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 2. 表层富饶土壤/沙质层次
    ctx.beginPath();
    ctx.moveTo(202, 510);
    ctx.quadraticCurveTo(188, 440, 202, topY + 48);
    ctx.bezierCurveTo(218, topY - 8, midX, topY - 22, midX + 30, topY - 8);
    ctx.bezierCurveTo(midX + 68, topY + 16, 328, topY + 68, 342, 528);
    ctx.quadraticCurveTo(268, 555, 202, 510);
    ctx.closePath();
    ctx.fillStyle = cMid;
    ctx.fill();

    // 3. 土堆/沙堆阳面高光脊线
    ctx.beginPath();
    ctx.moveTo(220, topY + 12);
    ctx.bezierCurveTo(250, topY - 4, 285, topY - 2, 325, topY + 34);
    ctx.strokeStyle = cHi;
    ctx.lineWidth = 10 * s;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 4. 颗粒物: 沙坑为细腻金黄沙粒, 草坪为碎石与黑土块, 金色草甸为金芒微粒
    const pebbleCount = Math.floor(9 * s);
    for (let i = 0; i < pebbleCount; i++) {
      const px = 210 + (i * 26) % 115;
      const py = topY + 20 + ((i * 37) % 115);
      const pr = isSandbox ? (2.5 + (i % 3) * 1.5) : (4 + (i % 3) * 2);
      ctx.fillStyle = isSandbox
        ? (i % 2 === 0 ? '#FFE082' : '#F5D172')
        : (isGolden
          ? (i % 2 === 0 ? '#FFD54F' : '#8D6E63')
          : (i % 2 === 0 ? '#8D6E63' : '#78909C'));
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * 0.75, (i * 0.5), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = isSandbox ? 1.2 : 2.0;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==================== 4. 动态土壤蒙版与场景自适应地质剖面 ====================
  // 遵循核心规范:
  // - 沙坑 (S13, sandbox): 细腻金黄沙质纹理 (#E0B858, #D29E3A), 边沿沙粒崩塌滑落
  // - 花园草坪 (S09, garden/yard): 表层嫩绿草皮撕裂层、中层深黑褐壤土与小碎石粒
  // - 金色草甸 (S23, golden): 金色草地剖面与神秘金色光芒
  function drawDynamicPit(ctx, cx, cy, progress, t, loc) {
    if (progress <= 0) return;
    ctx.save();
    ctx.translate(cx, cy);
    const u = clamp(progress, 0, 1);

    const holeW = 140 * u + 70 * easeOut(u); // 宽度 0 -> 210px
    const holeH = 45 * u + 35 * u * u;       // 深度 0 -> 80px

    const isSandbox = loc === 'sandbox';
    const isGolden = loc === 'golden';

    // -----------------------------------------------------------------
    // A. 基础阴影深洞腔 (全场景通用, 纵深投影)
    // -----------------------------------------------------------------
    ctx.beginPath();
    ctx.ellipse(0, holeH * 0.45, holeW * 0.95, holeH * 0.65, 0, 0, TAU);
    ctx.fillStyle = isSandbox ? 'rgba(120, 72, 16, 0.38)' : 'rgba(15, 23, 42, 0.48)';
    ctx.fill();

    // -----------------------------------------------------------------
    // B. 最深处地质基底
    // -----------------------------------------------------------------
    ctx.beginPath();
    ctx.ellipse(0, holeH * 0.35, holeW * 0.90, holeH * 0.55, 0, 0, TAU);
    // 沙坑为湿润深黄沙基底; 金色草甸为夕阳焦褐壤土; 草坪为深黑褐壤基底
    ctx.fillStyle = isSandbox ? '#9A6318' : (isGolden ? '#2D1810' : '#1D110D');
    ctx.fill();

    // -----------------------------------------------------------------
    // C. 中层紧致泥土 / 压实细沙剖面
    // -----------------------------------------------------------------
    ctx.beginPath();
    ctx.ellipse(-5 * u, holeH * 0.16, holeW * 0.85, holeH * 0.44, 0, 0, TAU);
    ctx.fillStyle = isSandbox ? '#B87B22' : (isGolden ? '#4E342E' : '#2D1A13');
    ctx.fill();

    // 次中层细滑过渡
    ctx.beginPath();
    ctx.ellipse(2 * u, holeH * 0.04, holeW * 0.86, holeH * 0.36, 0, 0, TAU);
    ctx.fillStyle = isSandbox ? '#D29E3A' : (isGolden ? '#6D4C41' : '#3E2723');
    ctx.fill();

    // -----------------------------------------------------------------
    // D. 地质特异性纹理剖面
    // -----------------------------------------------------------------
    if (isSandbox) {
      // ===== 1. 沙坑 (SANDBOX) 细腻金黄沙质纹理与崩塌 =====
      // (1) 同心圆环形沙痕 (铲斗挖刮造成的同心沙垄波纹)
      ctx.strokeStyle = '#B87B22';
      ctx.lineWidth = 2.2 * u;
      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        const rw = holeW * (0.35 + r * 0.22);
        const rh = holeH * (0.20 + r * 0.18);
        ctx.ellipse(0, holeH * 0.18, rw, rh, 0, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
      }

      // (2) 细腻金黄色沙质亮坡 (#E0B858, #D29E3A)
      ctx.beginPath();
      ctx.ellipse(0, -holeH * 0.04, holeW * 0.88, holeH * 0.26, 0, 0, TAU);
      ctx.fillStyle = '#E0B858';
      ctx.fill();

      // (3) 边沿沙粒崩塌滑落 (Cascading Sand Avalanche Tongues)
      // 细腻的流沙舌沿坑边向下坍塌滑落
      ctx.fillStyle = '#D29E3A';
      for (let a = 0; a < 6; a++) {
        const ax = -holeW * 0.72 + a * (holeW * 1.44 / 5);
        const slen = 14 + (a % 3) * 8 * u;
        ctx.beginPath();
        ctx.moveTo(ax - 9, -holeH * 0.05);
        ctx.quadraticCurveTo(ax, holeH * 0.15, ax + (a % 2 ? 4 : -4), -holeH * 0.05 + slen);
        ctx.quadraticCurveTo(ax + 5, holeH * 0.12, ax + 9, -holeH * 0.05);
        ctx.closePath();
        ctx.fill();
      }

      // (4) 正在滚落滚动的独立细小金黄沙粒 (动画物理下坠滚落)
      const sandParticleCount = Math.floor(18 * u);
      for (let i = 0; i < sandParticleCount; i++) {
        const seed = i * 29 + 17;
        const startX = (rnd(seed) - 0.5) * holeW * 1.5;
        // 随时间微滑滚落
        const rollT = (t * 2.0 + rnd(seed + 1) * 10) % 1.0;
        const px = startX + (rnd(seed + 2) - 0.5) * 8;
        const py = lerp(-holeH * 0.05, holeH * 0.55, rollT);
        const pr = 2.0 + rnd(seed + 3) * 2.2;
        ctx.fillStyle = (i % 3 === 0) ? '#FFE082' : ((i % 3 === 1) ? '#F5D172' : '#D29E3A');
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // (5) 沙坑起伏沙脊外沿 (平滑温暖沙波，无锯齿草皮)
      ctx.fillStyle = '#F5D172';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-holeW, -holeH * 0.06);
      const sandSteps = 16;
      for (let i = 0; i <= sandSteps; i++) {
        const px = -holeW + (i / sandSteps) * holeW * 2;
        const duneWave = Math.sin(i * 1.2 + t * 0.5) * 3.5 * u;
        ctx.lineTo(px, -holeH * 0.06 + duneWave);
      }
      ctx.lineTo(holeW, -holeH * 0.20);
      ctx.lineTo(-holeW, -holeH * 0.20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else if (isGolden) {
      // ===== 2. 金色草甸 (GOLDEN) 金色草皮剖面与神秘金色光芒 =====
      // (1) 铲齿撕裂沟壑
      ctx.strokeStyle = '#261712';
      ctx.lineWidth = 4.0 * u;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        const gx = i * 36 * u;
        ctx.moveTo(gx - 18 * u, -holeH * 0.15 + Math.abs(i) * 5);
        ctx.quadraticCurveTo(gx, holeH * 0.5, gx + 22 * u, holeH * 0.7);
        ctx.stroke();
      }

      // (2) 湿润金色泥土中层亮部
      ctx.beginPath();
      ctx.ellipse(0, -holeH * 0.05, holeW * 0.88, holeH * 0.28, 0, 0, TAU);
      ctx.fillStyle = '#5D4037';
      ctx.fill();

      // (3) 神秘金色光芒！(Mystic Golden Treasure Radiance)
      // 从凹坑深处向上溢出的梦幻温暖宝藏金芒，预示大礼物宝藏就在地底
      const pulse = 0.75 + 0.25 * Math.sin(t * 3.6);
      const radGrad = ctx.createRadialGradient(0, holeH * 0.35, 10, 0, holeH * 0.25, holeW * 0.75);
      radGrad.addColorStop(0, `rgba(255, 238, 88, ${0.70 * pulse * u})`);
      radGrad.addColorStop(0.35, `rgba(255, 193, 7, ${0.45 * pulse * u})`);
      radGrad.addColorStop(0.7, `rgba(255, 160, 0, ${0.20 * pulse * u})`);
      radGrad.addColorStop(1, 'rgba(255, 160, 0, 0)');

      ctx.beginPath();
      ctx.ellipse(0, holeH * 0.28, holeW * 0.82, holeH * 0.50, 0, 0, TAU);
      ctx.fillStyle = radGrad;
      ctx.fill();

      // 垂直向上的神圣金色丁达尔微光束
      ctx.save();
      for (let k = -2; k <= 2; k++) {
        const bx = k * 28 * u;
        const bAlpha = (0.22 + 0.10 * Math.sin(t * 4.0 + k)) * u;
        ctx.fillStyle = `rgba(255, 245, 157, ${bAlpha})`;
        ctx.beginPath();
        ctx.moveTo(bx - 12, holeH * 0.35);
        ctx.lineTo(bx - 20, -holeH * 0.65);
        ctx.lineTo(bx + 20, -holeH * 0.65);
        ctx.lineTo(bx + 12, holeH * 0.35);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 飘逸向上闪烁的金色星芒微粒
      for (let j = 0; j < 6; j++) {
        const spSeed = j * 37 + 11;
        const spX = (rnd(spSeed) - 0.5) * holeW * 1.1;
        const spPhase = (t * 1.8 + rnd(spSeed + 1) * 10) % 1.0;
        const spY = lerp(holeH * 0.4, -holeH * 0.5, spPhase);
        const spR = 2.5 + rnd(spSeed + 2) * 2.5;
        const spAlpha = Math.sin(spPhase * Math.PI);
        ctx.fillStyle = `rgba(255, 249, 196, ${spAlpha})`;
        ctx.beginPath();
        ctx.arc(spX, spY, spR, 0, TAU);
        ctx.fill();
      }

      // (4) 表层金色草皮撕裂层 (#AFB42B, #C0CA33, #FBC02D)
      ctx.fillStyle = '#C0CA33';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-holeW, -holeH * 0.08);
      const gSteps = 14;
      for (let i = 0; i <= gSteps; i++) {
        const px = -holeW + (i / gSteps) * holeW * 2;
        const jiggle = (i % 2 === 0 ? 6 : -4) * u;
        ctx.lineTo(px, -holeH * 0.08 + jiggle);
      }
      ctx.lineTo(holeW, -holeH * 0.25);
      ctx.lineTo(-holeW, -holeH * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 金色悬挂根须
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2.0;
      for (let i = 0; i < 7; i++) {
        const rootX = -holeW * 0.72 + i * (holeW * 1.44 / 6);
        const rootLen = 8 + (i % 3) * 6;
        ctx.beginPath();
        ctx.moveTo(rootX, -holeH * 0.05);
        ctx.lineTo(rootX + (i % 2 ? 3 : -3), -holeH * 0.05 + rootLen);
        ctx.stroke();
      }

    } else {
      // ===== 3. 花园草坪 (GARDEN / YARD) 嫩绿草皮撕裂层与黑褐深土碎石 =====
      // (1) 铲齿撕裂地底深深沟壑
      ctx.strokeStyle = '#1D110D';
      ctx.lineWidth = 4.5 * u;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        const gx = i * 36 * u;
        ctx.moveTo(gx - 18 * u, -holeH * 0.15 + Math.abs(i) * 5);
        ctx.quadraticCurveTo(gx, holeH * 0.5, gx + 22 * u, holeH * 0.7);
        ctx.stroke();
      }

      // (2) 中层深黑褐湿润壤土亮部边缘 (#5D4037)
      ctx.beginPath();
      ctx.ellipse(0, -holeH * 0.05, holeW * 0.88, holeH * 0.28, 0, 0, TAU);
      ctx.fillStyle = '#5D4037';
      ctx.fill();

      // (3) 地质剖面中嵌露的小碎石与小石块 (灰色板岩、卵石、红褐色泥石)
      const numRocks = Math.floor(10 * u);
      for (let i = 0; i < numRocks; i++) {
        const rx = (rnd(i * 19 + 3) - 0.5) * holeW * 1.35;
        const ry = (rnd(i * 23 + 7) * 0.65 + 0.15) * holeH;
        const size = 3.5 + rnd(i * 31) * 4.5;
        ctx.fillStyle = (i % 3 === 0) ? '#78909C' : ((i % 3 === 1) ? '#8D6E63' : '#607D8B');
        ctx.beginPath();
        ctx.ellipse(rx, ry, size, size * 0.7, rnd(i * 11) * Math.PI, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      // (4) 表层嫩绿草皮撕裂层 (撕裂草皮边缘层次, #689F38 与 #7CB342)
      // 底层暗绿草皮基底
      ctx.fillStyle = '#558B2F';
      ctx.beginPath();
      ctx.moveTo(-holeW, -holeH * 0.06);
      const turfSteps = 16;
      for (let i = 0; i <= turfSteps; i++) {
        const px = -holeW + (i / turfSteps) * holeW * 2;
        const jiggle = (i % 2 === 0 ? 8 : -5) * u;
        ctx.lineTo(px, -holeH * 0.06 + jiggle);
      }
      ctx.lineTo(holeW, -holeH * 0.24);
      ctx.lineTo(-holeW, -holeH * 0.24);
      ctx.closePath();
      ctx.fill();

      // 表层鲜嫩翠绿草皮撕裂层 (#7CB342)
      ctx.fillStyle = '#7CB342';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-holeW, -holeH * 0.08);
      for (let i = 0; i <= turfSteps; i++) {
        const px = -holeW + (i / turfSteps) * holeW * 2;
        const jiggle = (i % 2 === 0 ? 6 : -4) * u;
        ctx.lineTo(px, -holeH * 0.08 + jiggle);
      }
      ctx.lineTo(holeW, -holeH * 0.25);
      ctx.lineTo(-holeW, -holeH * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // (5) 下垂的细长有机草根丝与泥屑纤维
      ctx.strokeStyle = '#3E2723';
      ctx.lineWidth = 2.0;
      for (let i = 0; i < 9; i++) {
        const rootX = -holeW * 0.75 + i * (holeW * 1.5 / 8);
        const rootLen = 7 + (i % 3) * 6;
        ctx.beginPath();
        ctx.moveTo(rootX, -holeH * 0.05);
        ctx.lineTo(rootX + (i % 2 ? 3 : -3), -holeH * 0.05 + rootLen);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function easeOut(u) { return 1 - Math.pow(1 - u, 3); }

  // ==================== 5. 侧旁实时堆叠隆起新土丘 (材质自适应) ====================
  // 在挖掘点侧旁，随每一次卸土落地从 0 实时变高变大
  function drawExcavatedMound(ctx, mx, my, volume, t, loc) {
    if (volume <= 0.01) return;
    ctx.save();
    ctx.translate(mx, my);
    const v = clamp(volume, 0, 1);

    const mw = 48 + 118 * v;  // 宽度 48 -> 166px
    const mh = 16 + 76 * v;   // 高度 16 -> 92px

    const isSandbox = loc === 'sandbox';
    const isGolden = loc === 'golden';

    const mBase = isSandbox ? '#B87B22' : (isGolden ? '#4E342E' : '#3E2723');
    const mMid = isSandbox ? '#D29E3A' : (isGolden ? '#6D4C41' : '#5D4037');
    const mHi = isSandbox ? '#FFE082' : (isGolden ? '#D4AF37' : '#8D6E63');

    // 1. 土丘着地柔和阴影
    ctx.beginPath();
    ctx.ellipse(0, 10, mw * 0.95, 14, 0, 0, TAU);
    ctx.fillStyle = isSandbox ? 'rgba(120, 72, 16, 0.25)' : 'rgba(11, 47, 110, 0.28)';
    ctx.fill();

    // 2. 土丘主体堆隆轮廓
    ctx.beginPath();
    ctx.moveTo(-mw, 8);
    ctx.bezierCurveTo(-mw * 0.65, -mh * 0.5, -mw * 0.35, -mh * 0.95, -5, -mh);
    ctx.bezierCurveTo(mw * 0.30, -mh * 0.95, mw * 0.65, -mh * 0.45, mw, 8);
    ctx.closePath();
    ctx.fillStyle = mBase;
    ctx.fill();
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 3. 土丘中层阳面堆壤
    ctx.beginPath();
    ctx.moveTo(-mw * 0.85, 5);
    ctx.bezierCurveTo(-mw * 0.55, -mh * 0.45, -mw * 0.30, -mh * 0.85, -2, -mh * 0.92);
    ctx.bezierCurveTo(mw * 0.25, -mh * 0.85, mw * 0.55, -mh * 0.40, mw * 0.85, 5);
    ctx.closePath();
    ctx.fillStyle = mMid;
    ctx.fill();

    // 4. 丘顶高光堆层
    ctx.beginPath();
    ctx.moveTo(-mw * 0.45, -mh * 0.4);
    ctx.bezierCurveTo(-mw * 0.20, -mh * 0.75, 0, -mh * 0.85, mw * 0.25, -mh * 0.6);
    ctx.strokeStyle = mHi;
    ctx.lineWidth = 9 * v;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 5. 土丘坡面滚落的零星小颗粒
    const numChunks = Math.floor(8 * v);
    for (let i = 0; i < numChunks; i++) {
      const cx = (rnd(i * 17 + 5) - 0.5) * mw * 1.5;
      const cy = lerp(5, -mh * 0.6, rnd(i * 29 + 11));
      const cr = isSandbox ? (2.5 + rnd(i * 13) * 3) : (3.5 + rnd(i * 13) * 4);
      ctx.fillStyle = isSandbox
        ? (i % 2 === 0 ? '#FFE082' : '#F5D172')
        : (isGolden
          ? (i % 2 === 0 ? '#FFD54F' : '#6D4C41')
          : (i % 2 === 0 ? '#5D4037' : '#78909C'));
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr, cr * 0.8, rnd(i * 7), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = isSandbox ? 1.2 : 1.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==================== 6. 重力落土与冲击尘土粒子 (Dump & Impact) ====================
  // g=9.8 重力加速度下坠, 落地碰撞点爆发扩散 dust_poof
  function drawDumpStream(ctx, startX, startY, landX, landY, dumpProgress, t, loc) {
    if (dumpProgress <= 0 || dumpProgress >= 1.0) return;
    const u = dumpProgress;

    ctx.save();
    const isSandbox = loc === 'sandbox';
    const isGolden = loc === 'golden';

    // 1. 模拟 g=9.8 下倾泻砸落的 12 颗饱满泥块/沙块 (弹道抛物线)
    const count = 12;
    for (let i = 0; i < count; i++) {
      const stagger = i / count * 0.35;
      if (u < stagger) continue;
      const pTime = (u - stagger) / (1.0 - stagger);
      if (pTime > 1.0) continue;

      const flightU = clamp(pTime * 1.35, 0, 1);
      const curX = lerp(startX, landX, flightU) + (rnd(i * 13) - 0.5) * 35;
      const curY = lerp(startY, landY, flightU * flightU);

      if (flightU < 0.98) {
        ctx.save();
        ctx.translate(curX, curY);
        ctx.rotate(flightU * 6.0 + i);
        const sz = isSandbox ? (9 + (i % 4) * 4) : (12 + (i % 4) * 5);
        ctx.fillStyle = isSandbox
          ? (i % 2 === 0 ? '#B87B22' : '#D29E3A')
          : (isGolden
            ? (i % 2 === 0 ? '#FFD54F' : '#5D4037')
            : (i % 2 === 0 ? '#5D4037' : '#6D4C41'));
        ctx.beginPath();
        ctx.ellipse(0, 0, sz, sz * 0.7, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 2. 泥土砸落地表瞬间激起的向外扩散尘土粒子圈 (dust_poof)
    if (u > 0.35) {
      const impactU = (u - 0.35) / 0.65;
      const alpha = Math.max(0, 1 - impactU * impactU);
      const puffR = 25 + impactU * 90;

      ctx.save();
      ctx.translate(landX, landY);
      ctx.globalAlpha = alpha;

      const PUFF_COLS = isSandbox
        ? ['#FFE082', '#FFD54F', '#F5D172', '#E0B858']
        : (isGolden
          ? ['#FFF9C4', '#FFE082', '#FFD54F', '#D7CCC8']
          : ['#D7CCC8', '#A1887F', '#8D6E63', '#BCAAA4']);

      for (let j = 0; j < 9; j++) {
        const ang = -Math.PI * 0.95 + (j / 8) * Math.PI * 0.90;
        const dist = puffR * (0.6 + rnd(j * 17) * 0.5);
        const px = Math.cos(ang) * dist;
        const py = Math.sin(ang) * dist * 0.45 - impactU * 25;
        const r = (16 + (j % 3) * 6) * (1 - impactU * 0.5);

        ctx.fillStyle = PUFF_COLS[j % PUFF_COLS.length];
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.fill();
      }

      // 冲击飞溅的微小碎石/沙粒粒子
      ctx.fillStyle = isSandbox ? '#B87B22' : (isGolden ? '#D4AF37' : '#5D4037');
      for (let k = 0; k < 6; k++) {
        const spAng = -Math.PI * 0.85 + (k / 5) * Math.PI * 0.70;
        const spDist = puffR * 1.25;
        const spX = Math.cos(spAng) * spDist;
        const spY = Math.sin(spAng) * spDist * 0.5;
        ctx.beginPath();
        ctx.arc(spX, spY, 3.5, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // ==================== 导出模块 API ====================
  const PhysicsDig = {
    assemble: assembleWithPitch,
    assembleWithPitch,
    getDigPose,
    drawBucketSoil,
    drawDynamicPit,
    drawExcavatedMound,
    drawDumpStream,
    DIG_KEYFRAMES,
    PERIOD: 2.4,
  };

  root.V13PhysicsDig = PhysicsDig;
  root.V14PhysicsDig = PhysicsDig;
  root.PhysicsDig = PhysicsDig;
  if (typeof module !== 'undefined' && module.exports) module.exports = PhysicsDig;
})(typeof globalThis !== 'undefined' ? globalThis : this);
