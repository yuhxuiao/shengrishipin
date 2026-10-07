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

  const NAVY = '#13284C';
  const WHITE = '#FFFFFF';
  const BODY_BLUE = '#3CB8FC';
  const MUZZLE_BEIGE = '#FEE7C4';
  const BROW_BLUE = '#A9C6E8';
  const PUPIL_DARK = '#182238';

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

  // 严格力学校准的真实 6 阶段机械作业动力学闭环 (2.4s 循环):
  //   Phase 1: 伸展入土 (Reach & Penetrate, 0.00 ~ 0.38s) — 大臂前探、小臂微展，斗齿以锐角 (~58°) 精准对齐前方深坑 (pitX)
  //   Phase 2: 深入咬土与悬挂承重 (Bite & Reaction, 0.38 ~ 0.70s) — 斗齿切入土层，前避震轻微压缩 squash=0.045，车身底盘向前微倾 pitch=+1.5°，发动机低频沉稳
  //   Phase 3: 向内卷斗挖土 (Crowd & Curl, 0.70 ~ 1.35s) — 小臂向内拉近、铲斗向内旋转回卷 (Scoop)，把土块完整兜进斗内，深度严格受控，斗内饱满土壤迅速蓄满 (soilFill: 0 -> 1)
  //   Phase 4: 举斗提升 (Heavy Lift, 1.35 ~ 1.80s) — 大臂拔起举升，铲斗保持口朝上 (土绝不撒出，soilFill=1.0)，重心后移平稳仰起 pitch=-1.5°，悬挂回弹
  //   Phase 5: 侧方倾倒卸土 (Swing & Dump to Mound, 1.80 ~ 2.18s) — 大臂与斗杆向侧方土堆 (moundX) 翻转开敞，到达土堆正上方倾倒，泥土倾泻砸落在侧旁土堆上，土堆高度实时增加；绝不倒回刚挖的深坑里！(soilFill: 1 -> 0)
  //   Phase 6: 回程归位 (Return & Settle, 2.18 ~ 2.40s) — 铲斗复位对准深坑，车身阻尼回正，准备下一铲
  const DIG_KEYFRAMES = [
    // [t,   boom,  stick,  bucket, bob, squash, pitch]
    [0.00,  47.5, -26.0,  -5.0,  0.0, 0.00,  0.0],  // Phase 1: 伸展准备，对准深坑
    [0.28,  50.5, -29.5,  -0.5,  0.0, 0.02,  0.3],  // Phase 1: 远点咬土点，锐角入土 (~58°)
    [0.42,  50.2, -29.8,  -0.5,  0.0, 0.045, 1.5],  // Phase 2: 反作用力下压 (pitch=+1.5° 前倾, squash=0.045)
    [0.65,  48.8, -25.5,  -4.0,  0.0, 0.04,  1.2],  // Phase 2->3: 深入刮程，地底切入
    [0.90,  47.2, -21.0,  -7.0,  0.0, 0.03,  0.4],  // Phase 3: 收杆近点，铲斗深卷
    [1.10,  51.0, -36.0,  12.0,  1.0, 0.02, -0.2],  // Phase 3: 卷斗锁土，泥土完整兜进斗内
    [1.35,  56.0, -41.0,  22.0,  2.0, 0.02, -0.8],  // Phase 3->4: 拔出深坑
    [1.55,  63.0, -40.5,  38.0,  3.0, 0.02, -1.5],  // Phase 4: 重载举升 (pitch=-1.5° 后仰, 悬挂回弹)
    [1.75,  62.5, -38.0,  48.0,  0.0, 0.02, -1.4],  // Phase 4: 举升定格展示，口朝上土不撒 (soilFill=1.0)
    [1.88,  58.0, -42.0,  32.0,  0.0, 0.01, -1.0],  // Phase 5: 转向侧旁土堆 (moundX)
    [1.98,  49.0, -50.0,   2.0,  0.0, 0.00, -0.5],  // Phase 5: 翻转开敞，对准土堆中心
    [2.08,  44.5, -54.0, -12.0,  0.0, 0.00,  0.0],  // Phase 5: 倾倒卸土，泥土倾泻落入土堆 (soilFill -> 0)
    [2.18,  43.5, -53.0, -10.0,  0.0, 0.00,  0.0],  // Phase 5: 卸毕定格，土堆隆起
    [2.28,  45.5, -38.0,  -6.0,  0.0, 0.00,  0.1],  // Phase 6: 回程归位，收回对齐深坑
    [2.40,  47.5, -26.0,  -5.0,  0.0, 0.00,  0.0],  // Phase 6: 复位平稳，准备下一铲
  ];

  const evalDigSpline = keyframed6(DIG_KEYFRAMES, 2.4);

  // 综合动力学求值函数 (带引擎沉稳微震颤与土壤物理参数)
  function getDigPose(t) {
    const p = Object.assign({}, evalDigSpline(t));
    const cyc = ((t % 2.4) + 2.4) % 2.4;

    // Phase 2 (0.38 ~ 0.70s): 引擎高扭矩咬土低频沉稳微震颤 (仅车身悬挂受力微振，绝不影响全屏相机！)
    if (cyc >= 0.38 && cyc <= 0.70) {
      const env = Math.sin((cyc - 0.38) / 0.32 * Math.PI);
      const tremor = Math.sin(t * 55) * 0.75 * env;
      p.bob = (p.bob || 0) + tremor;
      p.pitch = (p.pitch || 0) + Math.sin(t * 60) * 0.12 * env;
    }

    // 斗内土壤填充度 soilFill (0.0 ~ 1.0)
    let soilFill = 0;
    if (cyc < 0.65) {
      soilFill = 0;
    } else if (cyc < 1.30) {
      // Phase 3: 卷斗收杆过程中迅速堆起饱满厚重土壤 (0.0 -> 1.0)
      const u = (cyc - 0.65) / 0.65;
      soilFill = u * u * (3 - 2 * u);
    } else if (cyc < 1.95) {
      // Phase 4: 重载举升与侧向运土全程满载耸立，转向土堆前紧密包裹不撒出 (1.0)
      soilFill = 1.0;
    } else if (cyc < 2.18) {
      // Phase 5: 在土堆上方翻斗开敞，泥土倾泻倒出落在侧旁土堆上 (1.0 -> 0.0)
      const u = (cyc - 1.95) / 0.23;
      soilFill = Math.max(0, 1.0 - u * u * (3 - 2 * u));
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
    ctx.lineWidth = 6;
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

      // 垂直向上的神圣金色丁达尔微光束 (金芒光柱)
      ctx.save();
      for (let k = -3; k <= 3; k++) {
        const bx = k * 26 * u;
        const bAlpha = (0.28 + 0.14 * Math.sin(t * 3.6 + k * 1.2)) * u;
        const gradBeam = ctx.createLinearGradient(0, holeH * 0.35, 0, -holeH * 1.8);
        gradBeam.addColorStop(0, `rgba(255, 238, 88, ${bAlpha * 1.2})`);
        gradBeam.addColorStop(0.5, `rgba(255, 245, 157, ${bAlpha})`);
        gradBeam.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradBeam;
        ctx.beginPath();
        ctx.moveTo(bx - 14, holeH * 0.35);
        ctx.lineTo(bx - 28, -holeH * 1.8);
        ctx.lineTo(bx + 28, -holeH * 1.8);
        ctx.lineTo(bx + 14, holeH * 0.35);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 飘逸向上闪烁的金色星芒微粒
      for (let j = 0; j < 10; j++) {
        const spSeed = j * 37 + 11;
        const spX = (rnd(spSeed) - 0.5) * holeW * 1.25;
        const spPhase = (t * 1.6 + rnd(spSeed + 1) * 10) % 1.0;
        const spY = lerp(holeH * 0.4, -holeH * 1.6, spPhase);
        const spR = 2.5 + rnd(spSeed + 2) * 2.8;
        const spAlpha = Math.sin(spPhase * Math.PI) * u;
        ctx.fillStyle = `rgba(255, 249, 196, ${spAlpha})`;
        ctx.beginPath();
        ctx.arc(spX, spY, spR, 0, TAU);
        ctx.fill();
      }

      // (4) 表层金色草皮撕裂层 (#AFB42B, #C0CA33, #FBC02D)
      ctx.fillStyle = '#C0CA33';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 5;
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
      ctx.lineWidth = 5;
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
    ctx.lineWidth = 6;
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
        ctx.lineWidth = 4.5;
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

  // ==================== 7. Bluey 官方世界观深度融入: 挖挖角色脸部纯白双胶囊大眼与独立悬浮眉毛系统 ====================
  const BLUSH_PINK = 'rgba(255, 110, 150, 0.40)';
  const TONGUE_PINK = '#FF6B8B';
  const MOUTH_DARK = '#182238';

  function safeRoundRect(c, x, y, w, h, r) {
    if (typeof c.roundRect === 'function') {
      c.roundRect(x, y, w, h, r);
    } else {
      const rad = Math.min(r, w / 2, h / 2);
      c.moveTo(x + rad, y);
      c.lineTo(x + w - rad, y);
      c.arcTo(x + w, y, x + w, y + rad, rad);
      c.lineTo(x + w, y + h - rad);
      c.arcTo(x + w, y + h, x + w - rad, y + h, rad);
      c.lineTo(x + rad, y + h);
      c.arcTo(x, y + h, x, y + h - rad, rad);
      c.lineTo(x, y + rad);
      c.arcTo(x, y, x + rad, y, rad);
    }
  }

  function drawBlueyFace(ctx, exprCfg, lookAt, mouthOpen, t, origFace) {
    const basePresets = (origFace && origFace.PRESETS) || {};
    let base = typeof exprCfg === 'string' ? (basePresets[exprCfg] || basePresets.neutral || {}) : (exprCfg || {});
    let expr = Object.assign({}, base);

    if (lookAt && Array.isArray(lookAt) && (lookAt[0] !== 0 || lookAt[1] !== 0 || !expr.look)) {
      expr.look = lookAt;
    }
    if (mouthOpen !== undefined && mouthOpen !== null && !expr.mouth?.isBlowO && !expr.mouth?.isGrimace) {
      expr.mouth = Object.assign({}, base.mouth || {});
      expr.mouth.open = Math.max(expr.mouth.open || 0, mouthOpen);
    }

    const effectiveT = typeof t === 'number' ? t : 0;
    let blink = 0;
    let bPhase = effectiveT % 3.6;
    if (bPhase < 0) bPhase += 3.6;
    if (bPhase < 0.22) {
      blink = Math.sin(Math.PI * bPhase / 0.22);
    }

    // 1. 底层清洁: 彻底消隐 body.png 原画中的旧眼睛、旧眉毛与旧嘴巴 (严格锁定在车身轮廓内，绝不出界)
    ctx.save();
    ctx.fillStyle = BODY_BLUE;
    // 旧眉毛精确定位消隐
    ctx.beginPath();
    ctx.ellipse(190, 380, 85, 50, -0.05, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(445, 395, 95, 55, 0.05, 0, TAU);
    ctx.fill();

    // 旧眼眶与眼白精确定位消隐
    ctx.beginPath();
    ctx.ellipse(215, 580, 130, 160, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(415, 580, 125, 160, 0, 0, TAU);
    ctx.fill();

    // 双眼中缝与吻部衔接处消隐
    ctx.beginPath();
    ctx.ellipse(281, 670, 50, 40, 0, 0, TAU);
    ctx.fill();

    // 整个奶油色吻部整洁覆盖 (覆盖 y: 695..950)
    ctx.fillStyle = MUZZLE_BEIGE;
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    safeRoundRect(ctx, 62, 695, 420, 252, 46);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. 鼓腮帮 (如果是吹蜡烛)
    const puff = expr.puff || (exprCfg === 'blow' ? 1.0 : 0);
    if (puff > 0.05) {
      ctx.save();
      const pr = 48 * puff;
      ctx.fillStyle = BODY_BLUE;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(95, 735, pr, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(435, 735, pr, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = BLUSH_PINK;
      ctx.beginPath(); ctx.arc(95, 735, pr * 0.75, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(435, 735, pr * 0.75, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // 3. 纯白双胶囊大眼 (Bluey 官方标志性双眼: 共用中线紧密相贴，纯白背景，深藏青蓝 #13284C 6px 有色描边)
    const isSquint = !!expr.squint;
    const lookX = expr.look ? expr.look[0] : 0;
    const lookY = expr.look ? expr.look[1] : 0;
    const sparkle = expr.sparkle || 0;

    // 两眼中心在 x=282 紧密相贴，高度从 438 到 692
    if (isSquint) {
      // 眯眼大笑模式: 眼眶内填满车身天蓝，绘制两条快乐的大号 ∩ 弯眼弧
      ctx.save();
      ctx.fillStyle = BODY_BLUE;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.beginPath(); safeRoundRect(ctx, 106, 438, 175, 264, 87.5); ctx.fill(); ctx.stroke();
      ctx.beginPath(); safeRoundRect(ctx, 281, 438, 175, 264, 87.5); ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(140, 575);
      ctx.quadraticCurveTo(195, 510, 250, 575);
      ctx.moveTo(314, 575);
      ctx.quadraticCurveTo(369, 510, 424, 575);
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    } else {
      // 普通模式: 纯白底色双胶囊
      ctx.save();
      ctx.fillStyle = WHITE;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.beginPath(); safeRoundRect(ctx, 106, 438, 175, 264, 87.5); ctx.fill(); ctx.stroke();
      ctx.beginPath(); safeRoundRect(ctx, 281, 438, 175, 264, 87.5); ctx.fill(); ctx.stroke();

      // 中线分隔缝
      ctx.beginPath();
      ctx.moveTo(281, 442);
      ctx.lineTo(281, 700);
      ctx.stroke();
      ctx.restore();

      // 绘制双眼内部瞳孔、高光与眼睑
      const eyes = [
        { cx: 194, cy: 565, clipX: 106, clipY: 438, clipW: 175, clipH: 264 },
        { cx: 368, cy: 565, clipX: 281, clipY: 438, clipW: 175, clipH: 264 },
      ];

      for (const eye of eyes) {
        ctx.save();
        ctx.beginPath();
        safeRoundRect(ctx, eye.clipX + 3, eye.clipY + 3, eye.clipW - 6, eye.clipH - 6, 84);
        ctx.clip();

        // 黑色大瞳孔 (大而明亮)
        const px = eye.cx + lookX * 34;
        const py = eye.cy + lookY * 28;
        ctx.fillStyle = PUPIL_DARK;
        ctx.beginPath();
        ctx.ellipse(px, py, 38, 48, 0, 0, TAU);
        ctx.fill();

        // 纯白高光 (主大高光 + 副小高光)
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.arc(px - 11, py - 15, 12.5, 0, TAU);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px + 12, py + 14, 6.5, 0, TAU);
        ctx.fill();

        // 星光闪耀
        if (sparkle > 0.08) {
          ctx.strokeStyle = WHITE;
          ctx.lineWidth = 3.6 * sparkle;
          const sLen = 15 * sparkle;
          ctx.beginPath();
          ctx.moveTo(px - 11 - sLen, py - 15); ctx.lineTo(px - 11 + sLen, py - 15);
          ctx.moveTo(px - 11, py - 15 - sLen); ctx.lineTo(px - 11, py - 15 + sLen);
          ctx.stroke();
        }

        // 上眼睑盖片 (仅在眨眼或闭眼特写时平滑闭合，常态保持纯真大眼)
        const effLidTop = Math.max(blink > 0.02 ? blink * 0.98 : 0, (expr.lidTop > 0.28 ? expr.lidTop : 0));
        if (effLidTop > 0.04) {
          const lidY = eye.clipY + effLidTop * eye.clipH;
          ctx.fillStyle = BODY_BLUE;
          ctx.beginPath();
          ctx.moveTo(eye.clipX - 5, eye.clipY - 5);
          ctx.lineTo(eye.clipX + eye.clipW + 5, eye.clipY - 5);
          ctx.lineTo(eye.clipX + eye.clipW + 5, lidY);
          ctx.quadraticCurveTo(eye.cx, lidY + 16 * (1 - effLidTop), eye.clipX - 5, lidY);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = NAVY;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(eye.clipX - 5, lidY);
          ctx.quadraticCurveTo(eye.cx, lidY + 16 * (1 - effLidTop), eye.clipX + eye.clipW + 5, lidY);
          ctx.stroke();
        }

        // 下眼睑 (向上推, 笑眼微笑卧蚕)
        const lidBot = expr.lidBot || 0;
        if (lidBot > 0.08) {
          const botY = (eye.clipY + eye.clipH) - lidBot * (eye.clipH * 0.55);
          ctx.fillStyle = BODY_BLUE;
          ctx.beginPath();
          ctx.moveTo(eye.clipX - 5, eye.clipY + eye.clipH + 5);
          ctx.lineTo(eye.clipX + eye.clipW + 5, eye.clipY + eye.clipH + 5);
          ctx.lineTo(eye.clipX + eye.clipW + 5, botY);
          ctx.quadraticCurveTo(eye.cx, botY - 16 * (1 - lidBot), eye.clipX - 5, botY);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = NAVY;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(eye.clipX - 5, botY);
          ctx.quadraticCurveTo(eye.cx, botY - 16 * (1 - lidBot), eye.clipX + eye.clipW + 5, botY);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // 4. 独立悬浮眉毛 (两根独立大号扁椭圆浅蓝胶囊 #C4E0FA, 纯悬浮在眼眶上方 48px, #13284C 5.5px 描边)
    const bL = expr.browL || { lift: 0, tilt: 0 };
    const bR = expr.browR || { lift: 0, tilt: 0 };
    const brows = [
      { cx: 195, cy: 390 - (bL.lift || 0) * 1.3, tilt: (bL.tilt || 0) },
      { cx: 369, cy: 390 - (bR.lift || 0) * 1.3, tilt: (bR.tilt || 0) },
    ];

    for (const brow of brows) {
      ctx.save();
      ctx.translate(brow.cx, brow.cy);
      ctx.rotate(brow.tilt);
      ctx.fillStyle = BROW_BLUE;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 5.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      safeRoundRect(ctx, -52, -16, 104, 32, 16);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 5. 腮红 (温暖可爱的珊瑚粉)
    const blush = expr.blush || 0;
    if (blush > 0.05) {
      ctx.save();
      ctx.fillStyle = BLUSH_PINK;
      ctx.beginPath();
      ctx.ellipse(135, 650, 36 * blush, 22 * blush, -0.12, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(435, 650, 36 * blush, 22 * blush, 0.12, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 6. 吻部与鼻头 (Bluey 标志性高光鼻头与精致人中)
    ctx.save();
    ctx.translate(265, 735);
    ctx.fillStyle = PUPIL_DARK;
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    safeRoundRect(ctx, -26, -15, 52, 30, 15);
    ctx.fill();
    ctx.stroke();

    // 鼻头月牙形柔和高光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -4, 15, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // 人中垂直短线
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(0, 32);
    ctx.stroke();
    ctx.restore();

    // 7. 嘴巴表情
    const mCfg = expr.mouth || { open: 0, curve: 0.4, width: 80 };
    const mOpen = Math.max(0, Math.min(1, mCfg.open || 0));
    const mCurve = mCfg.curve !== undefined ? mCfg.curve : 0.4;
    const mw = (mCfg.width || 80) * 0.5;

    ctx.save();
    if (mCfg.isBlowO) {
      // 吹气小圆嘴
      ctx.beginPath();
      ctx.arc(265, 778, 22, 0, TAU);
      ctx.fillStyle = MOUTH_DARK;
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = NAVY;
      ctx.stroke();

      // 吹气下向气流
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(265 + i * 14, 804);
        ctx.lineTo(265 + i * 8, 828);
        ctx.stroke();
      }
    } else if (mCfg.isGrimace) {
      // 紧抿咬牙
      const gw = mw * 0.9;
      ctx.beginPath();
      safeRoundRect(ctx, 265 - gw, 765, gw * 2, 24, 12);
      ctx.fillStyle = WHITE;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = NAVY;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(265 - gw + 4, 777); ctx.lineTo(265 + gw - 4, 777);
      for (let tx = 265 - gw + 14; tx < 265 + gw - 6; tx += 15) {
        ctx.moveTo(tx, 767); ctx.lineTo(tx, 787);
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(19, 40, 76, 0.4)';
      ctx.stroke();
    } else if (mOpen > 0.15) {
      // 开口快乐 D 形嘴 (Bluey 经典欢笑开嘴)
      const mouthW = Math.max(120, mw * 2.2);
      const halfW = mouthW * 0.5;
      const lx = 265 - halfW, rx = 265 + halfW;
      const cornerY = 775;
      const topCtrlY = cornerY - 6 * mCurve;
      const bottomY = cornerY + 18 + mOpen * 42;
      const botCtrlY = cornerY + (bottomY - cornerY) * 1.25 + 16 * mCurve;

      ctx.beginPath();
      ctx.moveTo(lx, cornerY);
      ctx.quadraticCurveTo(265, topCtrlY, rx, cornerY);
      ctx.quadraticCurveTo(265, botCtrlY, lx, cornerY);
      ctx.closePath();

      ctx.fillStyle = MOUTH_DARK;
      ctx.fill();

      // 小粉舌
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(265, bottomY + 2, halfW * 0.65, 20 * mOpen, 0, 0, TAU);
      ctx.fillStyle = TONGUE_PINK;
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();

      // 嘴角小翘弧
      ctx.beginPath();
      ctx.moveTo(lx - 2, cornerY - 5); ctx.lineTo(lx + 4, cornerY + 3);
      ctx.moveTo(rx + 2, cornerY - 5); ctx.lineTo(rx - 4, cornerY + 3);
      ctx.lineWidth = 6.5;
      ctx.stroke();
    } else {
      // 温润大微笑弧线 (Bluey 经典宽厚微笑)
      const mouthWidth = Math.max(120, mw * 2.2);
      const halfW = mouthWidth * 0.5;
      const lx = 265 - halfW, rx = 265 + halfW;
      const cornerY = 778;
      const sagY = cornerY + 14 + 20 * mCurve;
      ctx.beginPath();
      ctx.moveTo(lx, cornerY);
      ctx.quadraticCurveTo(265, sagY, rx, cornerY);
      ctx.lineWidth = 9.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = NAVY;
      ctx.stroke();

      // 嘴角两端微笑小翘弧
      ctx.beginPath();
      ctx.moveTo(lx - 2, cornerY - 6); ctx.lineTo(lx + 4, cornerY + 4);
      ctx.moveTo(rx + 2, cornerY - 6); ctx.lineTo(rx - 4, cornerY + 4);
      ctx.lineWidth = 7;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ==================== 8. 挖掘机机械部件圆润化与 #13284C 6px 有色描边升级 ====================
  const upgradedPartCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  const origDrawImage = (typeof CanvasRenderingContext2D !== 'undefined') ? CanvasRenderingContext2D.prototype.drawImage : null;

  function upgradeExcavatorPart(img, type) {
    if (!upgradedPartCache || typeof document === 'undefined') return img;
    if (upgradedPartCache.has(img)) return upgradedPartCache.get(img);

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return img;

    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');

    // 1. 扩边算法: 16 方向 3.5px 径向扩张生成纯深藏青蓝 #13284C 6px 有色外轮廓底膜
    const sCv = document.createElement('canvas');
    sCv.width = w;
    sCv.height = h;
    const sCtx = sCv.getContext('2d');

    const rad = 3.5;
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const ang = (i / steps) * TAU;
      origDrawImage.call(sCtx, img, Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = NAVY;
    sCtx.fillRect(0, 0, w, h);

    // 将有色外膜绘制到底层
    origDrawImage.call(ctx, sCv, 0, 0);

    // 2. 原图画在中央
    origDrawImage.call(ctx, img, 0, 0);

    // 3. 部件针对性 Bluey 官方风格圆润化消除生硬工业棱角
    if (type === 'body') {
      // 驾驶室转角圆润可爱化: 将右下转角台阶 (x: 712..795, y: 725..955) 的生硬 90° 拐角重构为圆润流线保险杠
      ctx.save();
      ctx.fillStyle = BODY_BLUE;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(712, 725);
      ctx.quadraticCurveTo(775, 730, 786, 785);
      ctx.quadraticCurveTo(795, 860, 792, 955);
      ctx.lineTo(712, 955);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 侧窗圆角强化
      ctx.beginPath();
      safeRoundRect(ctx, 605, 415, 155, 305, 28);
      ctx.stroke();

      // 门把手圆角强化
      ctx.beginPath();
      safeRoundRect(ctx, 692, 755, 60, 22, 11);
      ctx.fillStyle = NAVY;
      ctx.fill();

      ctx.restore();
    } else if (type === 'bucket') {
      // 铲斗边缘更加圆润可爱: 消除工业方角斗齿，升级为 3 颗萌系圆头胶囊斗齿
      ctx.save();
      ctx.fillStyle = '#1B5299'; // 铲斗主色
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const teeth = [
        { x: 335, y: 535, w: 42, h: 50, r: 16, ang: 0.35 },
        { x: 395, y: 520, w: 42, h: 50, r: 16, ang: 0.38 },
        { x: 455, y: 505, w: 42, h: 50, r: 16, ang: 0.42 },
      ];
      for (const th of teeth) {
        ctx.save();
        ctx.translate(th.x, th.y);
        ctx.rotate(th.ang);
        ctx.beginPath();
        safeRoundRect(ctx, -th.w / 2, -th.h / 2, th.w, th.h, th.r);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 铲斗内腔弧线圆润加固
      ctx.beginPath();
      ctx.moveTo(180, 575);
      ctx.quadraticCurveTo(270, 595, 480, 520);
      ctx.stroke();

      ctx.restore();
    } else if (type === 'track') {
      // 履带圆润跑道轮廓描边加固
      ctx.save();
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      safeRoundRect(ctx, 16, 16, 951, 369, 184);
      ctx.stroke();

      // 负重轮有色圆轮加固
      ctx.beginPath();
      ctx.arc(280, 235, 102, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(700, 235, 102, 0, TAU);
      ctx.stroke();
      ctx.restore();
    } else if (type === 'boom' || type === 'stick') {
      // 大臂与斗杆铰孔强化
      ctx.save();
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 6;
      if (type === 'boom') {
        ctx.beginPath(); ctx.arc(281, 95, 78, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(95, 790, 80, 0, TAU); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(83, 86, 76, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(300, 698, 74, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }

    upgradedPartCache.set(img, cv);
    return cv;
  }

  // 浏览器环境动态挂钩与拦截
  if (typeof window !== 'undefined' && typeof CanvasRenderingContext2D !== 'undefined' && origDrawImage) {
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (image && typeof image === 'object' && image.src && typeof image.src === 'string') {
        const src = image.src;
        if (src.includes('body.png')) {
          const up = upgradeExcavatorPart(image, 'body');
          return origDrawImage.apply(this, [up, ...args]);
        }
        if (src.includes('boom.png')) {
          const up = upgradeExcavatorPart(image, 'boom');
          return origDrawImage.apply(this, [up, ...args]);
        }
        if (src.includes('stick.png')) {
          const up = upgradeExcavatorPart(image, 'stick');
          return origDrawImage.apply(this, [up, ...args]);
        }
        if (src.includes('bucket.png')) {
          const up = upgradeExcavatorPart(image, 'bucket');
          return origDrawImage.apply(this, [up, ...args]);
        }
        if (src.includes('track.png')) {
          const up = upgradeExcavatorPart(image, 'track');
          return origDrawImage.apply(this, [up, ...args]);
        }
      }
      return origDrawImage.apply(this, [image, ...args]);
    };
  }

  // 拦截并无缝升级 Face 系统 (注入纯白双胶囊大眼与独立悬浮眉毛)
  let _upgradedFace = null;
  function makeUpgradedFace(baseFace) {
    const f = Object.assign({}, baseFace || {});
    f.draw = function (ctx, exprCfg, lookAt, mouthOpen, t) {
      drawBlueyFace(ctx, exprCfg, lookAt, mouthOpen, t, baseFace);
    };
    return f;
  }

  if (root.V12Face) _upgradedFace = makeUpgradedFace(root.V12Face);
  try {
    Object.defineProperty(root, 'V12Face', {
      configurable: true,
      enumerable: true,
      get() { return _upgradedFace; },
      set(v) { _upgradedFace = makeUpgradedFace(v); }
    });
    Object.defineProperty(root, 'V11Face', {
      configurable: true,
      enumerable: true,
      get() { return _upgradedFace; },
      set(v) { _upgradedFace = makeUpgradedFace(v); }
    });
  } catch (e) {
    if (root.V12Face) root.V12Face = makeUpgradedFace(root.V12Face);
    if (root.V11Face) root.V11Face = makeUpgradedFace(root.V11Face);
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

  root.V16PhysicsDig = PhysicsDig;
  root.V15PhysicsDig = PhysicsDig;
  root.V14PhysicsDig = PhysicsDig;
  root.V13PhysicsDig = PhysicsDig;
  root.PhysicsDig = PhysicsDig;
  if (typeof module !== 'undefined' && module.exports) module.exports = PhysicsDig;
})(typeof globalThis !== 'undefined' ? globalThis : this);
