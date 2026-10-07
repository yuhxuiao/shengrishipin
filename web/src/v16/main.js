// main.js — V15 导演与时间轴驱动 2D 骨骼与全片渲染管线 (Canvas2D)
// 契约: window.renderAt(t, type, q) 纯函数 -> dataURL; window.ready = true
(function (root) {
  'use strict';

  const W = 1920, H = 1080;
  const TAU = Math.PI * 2;
  const DEG2RAD = Math.PI / 180;

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
  const easeInOutCubic = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const backOut = u => { const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const NAVY = '#13284C'; // Bluey 官方标准深藏青

  // 依赖模块
  const PhysDig = root.V15PhysicsDig || root.V14PhysicsDig || root.V13PhysicsDig;
  const Cam = root.V15Cam || root.V14Cam || root.V12Cam || root.V11Cam;
  const Scenery = root.V15Scenery || root.V14Scenery || root.V12Scenery || root.V11Scenery;
  const Fx = root.V15Fx || root.V14Fx || root.V12Fx || root.V11Fx;
  const Shots = root.V15Shots || root.V14Shots || root.V12Shots || root.V11Shots;
  const Face = root.V15Face || root.V14Face || root.V12Face || root.V11Face;
  const Actions = root.V15Actions || root.V14Actions || root.V12Actions || root.V11Actions;
  const Pup = root.V15Pup || root.V14Pup || root.V12Pup || root.V11Pup;
  const FK = root.V10FK;
  const Timeline = root.V15Timeline || root.V14Timeline || root.V12Timeline;
  const Transitions = root.V15Transitions || root.V14Transitions || root.V12Transitions;

  let canvas, ctx;
  let offCanvasA = null, offCtxA = null;
  let offCanvasB = null, offCtxB = null;
  const IMG = {};
  const PUP_DATA = { bluey: null, bingo: null };
  let L0 = null;
  let GIFT_ROT0 = 0;

  function loadImg(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('img load failed: ' + src));
      im.src = src;
    });
  }

  // ---------- 油缸与铰钉 (程序化结构) ----------
  function strokeCapsule(ctx, a, b, wPx, color) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.lineCap = 'round'; ctx.lineWidth = wPx; ctx.strokeStyle = color; ctx.stroke();
  }

  function pinCap(ctx, p) {
    ctx.beginPath(); ctx.arc(p[0], p[1], 19, 0, TAU); ctx.fillStyle = NAVY; ctx.fill();
    ctx.beginPath(); ctx.arc(p[0], p[1], 8.5, 0, TAU); ctx.fillStyle = '#7CCBFB'; ctx.fill();
  }

  function drawCylinder(ctx, a, b, L0_c2) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const barrelLen = Math.min(0.55 * L0_c2, d * 0.62);
    const be = [a[0] + ux * barrelLen, a[1] + uy * barrelLen];
    const rodStart = [a[0] + ux * (barrelLen - 16), a[1] + uy * (barrelLen - 16)];
    const nx = -uy, ny = ux;

    ctx.beginPath();
    ctx.moveTo(a[0] - ux * 26 + nx * 21, a[1] - uy * 26 + ny * 21);
    ctx.lineTo(a[0] + ux * 26 + nx * 21, a[1] + uy * 26 + ny * 21);
    ctx.lineTo(a[0] + ux * 26 - nx * 21, a[1] - uy * 26 - ny * 21);
    ctx.lineTo(a[0] - ux * 26 - nx * 21, a[1] - uy * 26 - ny * 21);
    ctx.closePath(); ctx.fillStyle = NAVY; ctx.fill();

    strokeCapsule(ctx, a, be, 30, NAVY);
    strokeCapsule(ctx, a, be, 23, '#2E9BE8');
    strokeCapsule(ctx, rodStart, b, 22, NAVY);
    strokeCapsule(ctx, rodStart, b, 15, '#9BD8FC');

    ctx.beginPath(); ctx.arc(be[0], be[1], 17, 0, TAU); ctx.fillStyle = NAVY; ctx.fill();
    ctx.beginPath(); ctx.arc(be[0], be[1], 11, 0, TAU); ctx.fillStyle = '#1E6FAE'; ctx.fill();
    pinCap(ctx, a); pinCap(ctx, b);
  }

  // 履带滚动
  function drawTrackScroll(ctx, sc) {
    const th = 401; // track.h
    ctx.save();
    ctx.beginPath(); ctx.rect(330, 58, 323, th - 116); ctx.clip();
    ctx.fillStyle = 'rgba(20,40,80,.30)';
    const step = 38, off = sc % step;
    for (let x = 330 - step + off; x < 653 + step; x += step) ctx.fillRect(x, 58, 14, th - 116);
    ctx.restore();
    for (const wx of [195, 788]) {
      const a = sc / 130;
      ctx.beginPath(); ctx.arc(wx + 78 * Math.cos(a), 205 + 78 * Math.sin(a), 24, 0, TAU);
      ctx.fillStyle = NAVY; ctx.fill();
      ctx.beginPath(); ctx.arc(wx + 78 * Math.cos(a), 205 + 78 * Math.sin(a), 11, 0, TAU);
      ctx.fillStyle = '#E8F4FF'; ctx.fill();
    }
  }

  // 挖挖铲斗卸土重力下坠 (Phase 5: Dump & Impact)
  function drawBucketDumpStream(ctx, t, shot, wawaRet, camM) {
    if (!wawaRet || !shot.wawa) return;
    const isDigAction = shot.wawa.action === 'dig' ||
      (shot.wawa.track && (wawaRet.action === 'dig' || (wawaRet.pose && wawaRet.pose.actionName === 'dig')));
    if (!isDigAction) return;
    const pose = wawaRet.pose;
    const cyc = (pose && pose.digCycle !== undefined) ? pose.digCycle : (((t - shot.t0) % 2.4 + 2.4) % 2.4);
    // Phase 5 卸土窗口: 1.90s ~ 2.38s
    if (cyc < 1.90 || cyc > 2.38) return;
    const dumpProg = clamp((cyc - 1.90) / 0.45, 0, 1.0);

    const mFull = FK.mMul(wawaRet.rootM, wawaRet.fk.mBucket);
    // 铲齿尖世界坐标 (出土口)
    const startPt = FK.mApply(mFull, [350, 560]);
    // 侧旁土丘落土点 (精准对准侧旁土丘中心 pitX - 170)
    const bitePt = FK.mApply(wawaRet.rootM, [310, 1150]);
    const pitX = bitePt[0];
    const moundX = pitX - 170;
    const landPt = [moundX, 865];

    ctx.save();
    if (camM) ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
    if (PhysDig && typeof PhysDig.drawDumpStream === 'function') {
      PhysDig.drawDumpStream(ctx, startPt[0], startPt[1], landPt[0], landPt[1], dumpProg, t, shot.loc);
    }
    ctx.restore();
  }

  // 绘制挖挖 (支持 Timeline track 求值与向后兼容)
  function drawWawa(ctx, t, shot, lt, dur, camM) {
    const cfg = shot.wawa;
    if (!cfg || cfg.visible === false) return null;

    let evalW = null;
    if (Timeline && typeof Timeline.evalWawa === 'function') {
      evalW = Timeline.evalWawa(cfg, t, shot);
    }
    if (evalW && evalW.visible === false) return null;

    const isTrack = !!(evalW && evalW.isTrack);
    const S = isTrack ? evalW.scale : (cfg.scale !== undefined ? cfg.scale : 0.52);
    const groundY = 880;
    const baseX = isTrack ? evalW.x : (cfg.x !== undefined ? cfg.x : 1040);
    const CHAR_X = baseX - 991 * S;
    const CHAR_Y = groundY - 1156 * S;

    let dx = 0;
    let trackScroll = 0;
    let pose = null;
    let expr = cfg.expr || 'happy';
    let lookAt = cfg.look || [0, 0];
    let mirror = !!cfg.mirror;
    let hasCake = !!cfg.hasCake;

    if (isTrack) {
      dx = evalW.dx || 0;
      trackScroll = evalW.trackScroll || 0;
      pose = Object.assign({}, evalW.pose);
      expr = evalW.expr || 'happy';
      lookAt = evalW.look || [0, 0];
      mirror = !!evalW.mirror;
      hasCake = !!evalW.hasCake;
    } else {
      dx = cfg.dx || 0;
      if (cfg.action === 'walk') {
        const u = easeOutCubic(clamp(lt / dur, 0, 1));
        dx = lerp(cfg.dxFrom !== undefined ? cfg.dxFrom : -180, cfg.dxTo !== undefined ? cfg.dxTo : 180, u);
        trackScroll = Math.abs(dx - (cfg.dxFrom !== undefined ? cfg.dxFrom : -180)) * 1.6;
      }

      const actName = cfg.action || 'idle';
      if (cfg.action === 'walk') {
        const bob = 4 * Math.abs(Math.sin(Math.PI * 2 * lt / 0.5));
        pose = { boom: 47.5, stick: -26, bucket: cfg.hasCake ? -12 : -5, bob, squash: 0 };
      } else if (Actions && Actions[actName]) {
        pose = Object.assign({}, Actions[actName](lt));
        if (cfg.hasCake) pose.bucket = -12;
      } else if (Actions && Actions.idle) {
        pose = Object.assign({}, Actions.idle(lt));
      } else {
        pose = { boom: 47.5, stick: -26, bucket: -5, bob: 0, squash: 0 };
      }
    }

    // 口型同步与说话震动
    const frameIdx = Math.min(6839, Math.max(0, Math.floor(t * 30)));
    const mouthOpen = (root.V13Lipsync && root.V13Lipsync[frameIdx]) || (root.V12Lipsync && root.V12Lipsync[frameIdx]) || (root.V11Lipsync && root.V11Lipsync[frameIdx]) || 0;
    if (mouthOpen > 0.08 || expr === 'talk') {
      const talkAmp = mouthOpen > 0.08 ? mouthOpen : 0.6;
      pose.bob = (pose.bob || 0) + Math.sin(t * 4.8) * 2.2 * talkAmp;
      pose.boom = (pose.boom || 0) + Math.sin(t * 3.6) * 1.5 * talkAmp;
    }

    // 吹蜡烛姿态
    if (expr === 'blow') {
      pose.boom = (pose.boom || 0) - 8;
      pose.stick = (pose.stick || 0) + 12;
      pose.bob = (pose.bob || 0) + 6;
    }

    const fk = FK.assemble(pose);
    let placeM = FK.mMul(FK.mTrans(CHAR_X + dx, CHAR_Y), FK.mScale(S, S));
    const rootM = mirror ? FK.mMul([-1, 0, 0, 1, W, 0], placeM) : placeM;
    const setM = m => {
      const full = camM ? FK.mMul(camM, m) : m;
      ctx.setTransform(full[0], full[1], full[2], full[3], full[4], full[5]);
    };

    // 1. 接地影
    setM(rootM);
    ctx.beginPath(); ctx.ellipse(991, 1156, 545, 42, 0, 0, TAU);
    ctx.fillStyle = '#A9CC6B'; ctx.fill();

    // 2. 履带
    setM(FK.mMul(rootM, FK.mTrans(FK.LAYOUT.track_tl[0], FK.LAYOUT.track_tl[1])));
    ctx.drawImage(IMG.track, 0, 0);
    if (trackScroll > 0) drawTrackScroll(ctx, trackScroll);

    // 3. 大臂
    setM(FK.mMul(rootM, fk.mBoom));
    ctx.drawImage(IMG.boom, 0, 0);

    // 4. 车身
    setM(FK.mMul(rootM, fk.mBody));
    ctx.drawImage(IMG.body, 0, 0);

    // 5. 程序化灵动脸层
    Face.draw(ctx, expr, lookAt, mouthOpen, t);

    // 6. 铰销垫片
    setM(rootM);
    pinCap(ctx, fk.hingeW);

    // 7. 斗杆
    setM(FK.mMul(rootM, fk.mStick));
    ctx.drawImage(IMG.stick, 0, 0);

    // 8. 斗杆油缸
    setM(rootM);
    drawCylinder(ctx, fk.c2a, fk.c2b, L0.c2);

    // 9. 铲斗
    setM(FK.mMul(rootM, fk.mBucket));
    ctx.drawImage(IMG.bucket, 0, 0);

    // 10. 铲斗内饱满土壤 (V13: 饱满厚重棕色土壤严密包裹在斗内)
    const soilFill = (pose && pose.soilFill !== undefined) ? pose.soilFill : 0;
    if (PhysDig && soilFill > 0.01 && !hasCake) {
      PhysDig.drawBucketSoil(ctx, fk, rootM, soilFill, t, camM, shot.loc);
    }

    // 11. 铲斗内蛋糕
    if (hasCake && IMG.cake) {
      const bucketM = FK.mMul(rootM, fk.mBucket);
      const sp = FK.mApply(bucketM, [350, 420]);
      const rotB = Math.atan2(bucketM[1], bucketM[0]) - GIFT_ROT0;
      ctx.save();
      if (camM) ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
      ctx.translate(sp[0], sp[1]);
      ctx.rotate(rotB * 0.55);
      ctx.scale(S * 0.65, S * 0.65);
      const kw = 520, kh = kw * (IMG.cake.height / IMG.cake.width);
      ctx.drawImage(IMG.cake, -kw / 2, -kh * 0.88, kw, kh);
      ctx.restore();
    }

    // 12. 铲斗卸土重力下坠 (Phase 5: Dump & Impact)
    drawBucketDumpStream(ctx, t, shot, { rootM, fk, action: (evalW && evalW.action) || cfg.action, pose }, camM);

    if (camM) ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
    else ctx.setTransform(1, 0, 0, 1, 0, 0);
    return { fk, rootM, placeM, dx };
  }

  // 绘制配角 (布鲁伊与宾果)
  function drawPup(ctx, charKey, cfg, t, shot) {
    if (!cfg || cfg.visible === false) return;
    const pupData = PUP_DATA[charKey];
    if (!pupData) return;

    let state = null;
    if (Timeline && typeof Timeline.evalPup === 'function') {
      state = Timeline.evalPup(charKey, cfg, t, shot);
    } else {
      let x = cfg.x !== undefined ? cfg.x : 600;
      let dy = 0;
      let pose = cfg.pose || 'stand';
      if (cfg.enterAt !== undefined && t >= cfg.enterAt) {
        const et = t - cfg.enterAt;
        if (et < 0.9) {
          const u = et / 0.9;
          x = lerp(cfg.x0 !== undefined ? cfg.x0 : 1850, cfg.x1 !== undefined ? cfg.x1 : cfg.x, u * u * (3 - 2 * u));
          dy = -4 * 140 * u * (1 - u);
          pose = 'hop';
        } else {
          x = cfg.x1 !== undefined ? cfg.x1 : cfg.x;
          pose = cfg.pose || 'stand';
        }
      } else if (cfg.enterAt !== undefined && t < cfg.enterAt) {
        return;
      }
      state = {
        visible: true,
        x,
        footY: cfg.footY || 880,
        h: cfg.h || (charKey === 'bluey' ? 420 : 360),
        dy,
        pose,
        facing: cfg.facing !== undefined ? cfg.facing : 1,
        hat: { visible: true },
        item: cfg.item || null,
      };
    }

    if (!state || state.visible === false) return;
    Pup.draw(ctx, pupData, state, t);
  }

  // 气球束纯矢量绘制
  function drawBalloonBunch(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const colors = ['#F5D134', '#F08A28', '#7CCBFB', '#B0E0C0', '#FF7096'];
    for (let i = 0; i < 4; i++) {
      const ox = (i - 1.5) * 50;
      const oy = (i % 2) * -35;
      const bob = Math.sin(t * 2.5 + i * 1.7) * 8;
      const sway = Math.sin(t * 1.8 + i * 2.3) * 6;

      ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.quadraticCurveTo(ox * 0.4, 0, ox + sway, oy - 40 + bob);
      ctx.stroke();

      ctx.fillStyle = colors[i % colors.length];
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(ox + sway, oy - 85 + bob, 36, 44, 0, 0, TAU);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#0B2F6E';
      ctx.beginPath();
      ctx.moveTo(ox + sway - 6, oy - 42 + bob);
      ctx.lineTo(ox + sway + 6, oy - 42 + bob);
      ctx.lineTo(ox + sway, oy - 32 + bob);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // 场景道具交互渲染 (向后兼容)
  function drawProps(ctx, shot, t, lt, dur, wawaRet) {
    const P = shot.props;
    if (!P) return;

    if (P.xmark) {
      Fx.drawXmark(ctx, P.xmark.x, P.xmark.y, !!P.xmark.isGolden, t);
    }
    if (P.golden_x) {
      let gx = P.golden_x.x;
      let gy = P.golden_x.y;
      if (shot.props && shot.props.hole && wawaRet && wawaRet.rootM) {
        const bitePt = FK.mApply(wawaRet.rootM, [310, 1150]);
        if (Math.abs(bitePt[0] - gx) < 180) gx = bitePt[0];
      }
      Fx.drawXmark(ctx, gx, gy, true, t);
    }
    if (P.xmark_flash) {
      const p = P.xmark_flash;
      if (t >= p.at) {
        Fx.drawXmark(ctx, p.x, p.y, true, t);
      }
    }
    if (P.dust) {
      const p = P.dust;
      if (t >= p.at && t < p.at + p.dur) {
        const u = (t - p.at) / p.dur;
        Fx.drawDust(ctx, p.x, p.y, u);
      }
    }
    if (P.stars) {
      const p = P.stars;
      if (t >= p.at && t < p.at + p.dur) {
        const u = (t - p.at) / p.dur;
        Fx.drawStars(ctx, p.x, p.y, u);
      }
    }
    if (P.balloons_pop) {
      const p = P.balloons_pop;
      if (t >= p.at) {
        const u = clamp((t - p.at) / p.dur, 0, 1);
        const y = lerp(p.y0, p.y1, easeOutCubic(u));
        const s = backOut(clamp(u * 2, 0, 1));
        drawBalloonBunch(ctx, p.x, y, s, t);
      }
    }
    if (P.balloons_tied) {
      drawBalloonBunch(ctx, P.balloons_tied.x, P.balloons_tied.y, 1.0, t);
    }
    if (P.duck_pop) {
      const p = P.duck_pop;
      if (t >= p.at) {
        const u = clamp((t - p.at) / p.dur, 0, 1);
        let duckX = p.x;
        let duckY = p.y;
        if (shot.props && shot.props.hole && wawaRet && wawaRet.rootM) {
          const bitePt = FK.mApply(wawaRet.rootM, [310, 1150]);
          if (Math.abs(bitePt[0] - p.x) < 180) {
            duckX = bitePt[0];
            duckY = (p.y || 860) - 10;
          }
        }
        Fx.drawDuckPhysics(ctx, duckX, duckY, u, t);
      }
    }
    if (P.bone_pop && IMG.bone) {
      const p = P.bone_pop;
      if (t >= p.at) {
        const u = clamp((t - p.at) / p.dur, 0, 1);
        const s = backOut(clamp(u * 2, 0, 1));
        const dy = -4 * 180 * u * (1 - u);
        ctx.save();
        ctx.translate(p.x, p.y + dy);
        ctx.rotate(u * 4);
        ctx.scale(s * 0.28, s * 0.28);
        const bw = 320, bh = bw * (IMG.bone.height / IMG.bone.width);
        ctx.drawImage(IMG.bone, -bw / 2, -bh / 2, bw, bh);
        ctx.restore();
      }
    }
    if (P.gift_corner && IMG.gift) {
      let gx = P.gift_corner.x;
      let gy = P.gift_corner.y;
      if (shot.props && shot.props.hole && wawaRet && wawaRet.rootM) {
        const bitePt = FK.mApply(wawaRet.rootM, [310, 1150]);
        if (Math.abs(bitePt[0] - gx) < 180) gx = bitePt[0];
      }
      ctx.save();
      ctx.translate(gx, gy);
      const gw = 180, gh = gw * (IMG.gift.height / IMG.gift.width);
      ctx.drawImage(IMG.gift, -gw / 2, -gh * 0.4, gw, gh);
      Fx.drawGlow(ctx, 0, -gh * 0.2, 120, '#FFE57F', 0.5);
      ctx.restore();
    }
    if (P.gift_pop && IMG.gift) {
      const p = P.gift_pop;
      if (t >= p.at) {
        const u = clamp((t - p.at) / p.dur, 0, 1);
        let origX0 = p.x0;
        if (shot.props && shot.props.hole && wawaRet && wawaRet.rootM) {
          const bitePt = FK.mApply(wawaRet.rootM, [310, 1150]);
          if (Math.abs(bitePt[0] - p.x0) < 180) origX0 = bitePt[0];
        }
        const gx = lerp(origX0, p.x1, easeOutCubic(u));
        const gy = lerp(p.y0, p.y1, easeOutCubic(u));
        const s = backOut(clamp(u * 1.5, 0, 1));
        ctx.save();
        ctx.translate(gx, gy);
        ctx.scale(s * 0.72, s * 0.72);
        const gw = 420, gh = gw * (IMG.gift.height / IMG.gift.width);
        ctx.drawImage(IMG.gift, -gw / 2, -gh * 0.9, gw, gh);
        Fx.drawGlow(ctx, 0, -gh * 0.5, 200, '#FFE57F', 0.6);
        ctx.restore();
      }
    }
    if (P.gift_landed && IMG.gift) {
      ctx.save();
      ctx.translate(P.gift_landed.x, P.gift_landed.y);
      ctx.scale(0.72, 0.72);
      const gw = 420, gh = gw * (IMG.gift.height / IMG.gift.width);
      ctx.drawImage(IMG.gift, -gw / 2, -gh * 0.9, gw, gh);
      ctx.restore();
    }
    if (P.glow) {
      Fx.drawGlow(ctx, P.glow.x, P.glow.y, P.glow.r, P.glow.col, 0.4);
    }
    if (P.cake_landed && IMG.cake) {
      ctx.save();
      ctx.translate(P.cake_landed.x, P.cake_landed.y);
      ctx.scale(0.72, 0.72);
      const kw = 520, kh = kw * (IMG.cake.height / IMG.cake.width);
      ctx.drawImage(IMG.cake, -kw / 2, -kh * 0.88, kw, kh);

      const flameX = -2, flameY = -kh * 0.88 + 48;
      if (P.candle_lit) {
        Fx.drawCandle(ctx, flameX, flameY, t, true, false, 0);
      } else if (P.candle_blow) {
        const cp = P.candle_blow;
        const blown = t >= cp.at;
        const blownProg = blown ? clamp((t - cp.at) / cp.dur, 0, 1) : 0;
        if (blown) {
          ctx.save();
          ctx.fillStyle = '#64B5F6';
          ctx.beginPath();
          ctx.ellipse(flameX, flameY, 26, 38, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#263238';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(flameX, flameY + 28);
          ctx.lineTo(flameX, flameY + 6);
          ctx.stroke();
          ctx.restore();
        }
        Fx.drawCandle(ctx, flameX, flameY, t, !blown, blown, blownProg);
      } else if (P.candle_blown) {
        ctx.save();
        ctx.fillStyle = '#64B5F6';
        ctx.beginPath();
        ctx.ellipse(flameX, flameY, 26, 38, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(flameX, flameY + 28);
        ctx.lineTo(flameX, flameY + 6);
        ctx.stroke();
        ctx.restore();
        Fx.drawCandle(ctx, flameX, flameY, t, false, true, 1.0);
      }
      ctx.restore();
    }
  }

  // 通用特效分发 (world 层与 screen 层)
  function drawFxList(targetCtx, fxList, t, targetLayer, camM) {
    if (!Array.isArray(fxList) || fxList.length === 0) return;
    for (const item of fxList) {
      if (!item || !item.type) continue;
      const isScreen = item.layer === 'screen';
      if (targetLayer === 'screen' && !isScreen) continue;
      if (targetLayer === 'world' && isScreen) continue;

      const at = item.at !== undefined ? item.at : 0;
      const dur = item.dur !== undefined ? item.dur : 1.0;
      if (t < at || t > at + dur) continue;

      const u = dur > 0 ? clamp((t - at) / dur, 0, 1) : 1;
      const fn = Fx && Fx.registry && Fx.registry[item.type];
      if (typeof fn === 'function') {
        fn(targetCtx, u, item, t);
      }
    }
  }

  // 大字幕标题层
  function drawTitle(ctx, title, t) {
    if (!title || t < title.at || t >= title.at + title.dur) return;
    const lt = t - title.at;
    const dur = title.dur;
    let alpha = 1, scale = 1;
    if (lt < 0.6) {
      const u = lt / 0.6;
      alpha = u;
      scale = 0.85 + backOut(u) * 0.15;
    } else if (lt > dur - 0.6) {
      const u = (dur - lt) / 0.6;
      alpha = u;
      scale = 1.0;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(960, 240);
    ctx.scale(scale, scale);

    ctx.font = 'bold 72px "ZCOOL KuaiLe", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 14;
    ctx.strokeStyle = NAVY;
    ctx.strokeText(title.text, 0, 0);
    ctx.fillStyle = '#FFE14A';
    ctx.fillText(title.text, 0, 0);

    if (title.sub) {
      ctx.font = 'bold 36px "ZCOOL KuaiLe", sans-serif';
      ctx.lineWidth = 8;
      ctx.strokeStyle = NAVY;
      ctx.strokeText(title.sub, 0, 68);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(title.sub, 0, 68);
    }
    ctx.restore();
  }

  // 配音台词字幕层
  function drawSubtitles(ctx, t) {
    const subs = root.V13Subtitles || root.V12Subtitles || root.V11Subtitles;
    if (!subs) return;
    for (const key in subs) {
      const item = subs[key];
      if (t >= item.start && t <= item.end) {
        ctx.save();
        ctx.font = 'bold 38px "ZCOOL KuaiLe", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const txt = item.text;
        const textW = ctx.measureText(txt).width;
        const boxW = Math.max(340, textW + 80);
        const boxH = 68;
        const boxX = 960 - boxW / 2;
        const boxY = 970 - boxH / 2;

        ctx.fillStyle = 'rgba(19, 40, 76, 0.82)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 20);
        ctx.fill();
        ctx.strokeStyle = item.speaker === 'wawa' ? '#FFE14A' : '#7CCBFB';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.fillStyle = item.speaker === 'wawa' ? '#FFE873' : '#FFFFFF';
        ctx.fillText(txt, 960, 970);
        ctx.restore();
        break;
      }
    }
  }

  // ==================== 单镜头场景渲染 (可渲染至主画布或离屏画布) ====================
  function renderScene(targetCtx, shot, t) {
    const lt = t - shot.t0;
    const dur = shot.t1 - shot.t0;

    // 1. 虚拟摄像机状态
    const cam = Cam.evalCamera(shot.cam, t, shot.t0, dur);

    // 清屏
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.clearRect(0, 0, W, H);

    // 2. 视差层 1: Sky (depth = 0.05)
    Cam.apply(targetCtx, cam, 0.05);
    Scenery.drawSky(targetCtx, shot.loc, t);
    Cam.restore(targetCtx);

    // 3. 视差层 2: Far (depth = 0.20)
    Cam.apply(targetCtx, cam, 0.20);
    Scenery.drawFar(targetCtx, shot.loc, t);
    Cam.restore(targetCtx);

    // 4. 视差层 3: Mid (depth = 0.55)
    Cam.apply(targetCtx, cam, 0.55);
    Scenery.drawMid(targetCtx, shot.loc, t);
    Cam.restore(targetCtx);

    // 5. 主世界层: Ground, Excavation Hole, Wawa, Party Table, Props, Puppies (depth = 1.00)
    const camM = Cam.getMatrix(cam, 1.00);
    Cam.apply(targetCtx, cam, 1.00);
    Scenery.drawGround(targetCtx, shot.loc, t);

    // 地面挖掘动态凹坑与侧旁隆起土丘 (V13 物理动力学)
    if (shot.props && shot.props.hole) {
      const p = shot.props.hole;
      let pitProg = 1.0;
      let moundVol = 1.0;
      if (t >= p.at) {
        const elapsed = t - p.at;
        // 凹坑在 0.3s~1.5s 随斗齿深入迅速凹陷成深坑
        pitProg = clamp(elapsed / 1.5, 0, 1.0);
        // 土丘在 1.8s 卸土落地后从 0 实时堆高
        moundVol = clamp((elapsed - 1.8) / 1.0, 0, 1.0);
      } else {
        pitProg = 0;
        moundVol = 0;
      }

      // 精准对齐: 确保凹坑与挖掘机铲斗入土接触点完美咬合
      let pitX = p.x;
      let pitY = p.y || 865;
      if (shot.wawa && shot.wawa.visible !== false) {
        let curDx = 0;
        if (shot.wawa.track && Array.isArray(shot.wawa.track)) {
          curDx = shot.wawa.track[0].dx !== undefined ? shot.wawa.track[0].dx : 0;
          for (const item of shot.wawa.track) {
            if (t >= item.t && item.dx !== undefined) curDx = item.dx;
          }
        } else if (shot.wawa.dx !== undefined) {
          curDx = shot.wawa.dx;
        }
        const s = shot.wawa.scale !== undefined ? shot.wawa.scale : 0.52;
        const bX = shot.wawa.x !== undefined ? shot.wawa.x : 1040;
        const cX = bX - 991 * s + curDx;
        const biteWorldX = cX + 310 * s;
        if (Math.abs(biteWorldX - p.x) < 180) {
          pitX = biteWorldX;
        }
      }

      const moundX = pitX - 170;
      const moundY = pitY + 12;

      if (PhysDig && typeof PhysDig.drawDynamicPit === 'function') {
        PhysDig.drawDynamicPit(targetCtx, pitX, pitY, pitProg, t, shot.loc);
        PhysDig.drawExcavatedMound(targetCtx, moundX, moundY, moundVol, t, shot.loc);
      } else {
        Fx.drawExcavationHole(targetCtx, pitX, pitY, pitProg);
      }
    }

    // 挖挖
    const wawaRet = drawWawa(targetCtx, t, shot, lt, dur, camM);

    // 派对长桌
    if (shot.loc === 'party' && Scenery.drawPartyTable) {
      Scenery.drawPartyTable(targetCtx, 960, 830, 1200, 140);
    }

    // 场景道具交互
    drawProps(targetCtx, shot, t, lt, dur, wawaRet);

    // 主世界通用特效 (world 层)
    drawFxList(targetCtx, shot.fx, t, 'world', camM);

    // 配角小狗
    drawPup(targetCtx, 'bluey', shot.bluey, t, shot);
    drawPup(targetCtx, 'bingo', shot.bingo, t, shot);

    Cam.restore(targetCtx);

    // 6. 视差层 4: Foreground (depth = 1.45)
    Cam.apply(targetCtx, cam, 1.45);
    Scenery.drawForeground(targetCtx, shot.loc, t);
    Cam.restore(targetCtx);

    return cam;
  }

  // ==================== 主渲染纯函数 ====================
  function renderFrame(t) {
    t = Math.max(0, Math.min(Shots.TOTAL, t));

    // 检查是否处于跨镜离屏转场过渡窗内
    let activeTrans = null;
    const shotsList = Shots.SHOTS;
    for (let i = 1; i < shotsList.length; i++) {
      const s = shotsList[i];
      if (s.transitionIn) {
        const dur = s.transitionIn.dur !== undefined ? s.transitionIn.dur : 0.6;
        const cutT = s.t0;
        const half = dur / 2;
        if (t >= cutT - half && t <= cutT + half) {
          activeTrans = {
            prevShot: shotsList[i - 1],
            currShot: s,
            cutT,
            dur,
            u: (t - (cutT - half)) / dur,
            params: s.transitionIn,
          };
          break;
        }
      }
    }

    let currentShot = Shots.getShotAt(t);
    let cam = null;

    if (activeTrans && Transitions && offCanvasA && offCanvasB) {
      // 离屏双画布分别渲染
      offCtxA.setTransform(1, 0, 0, 1, 0, 0);
      offCtxA.clearRect(0, 0, W, H);
      offCtxB.setTransform(1, 0, 0, 1, 0, 0);
      offCtxB.clearRect(0, 0, W, H);

      // 全时动态双离屏推进: 两镜在过渡窗内均随绝对时间 t 真实推进，彻底消除冻结停滞
      renderScene(offCtxA, activeTrans.prevShot, t);
      renderScene(offCtxB, activeTrans.currShot, t);

      // 合成到主画布
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      Transitions.apply(activeTrans.params.type, ctx, offCanvasA, offCanvasB, activeTrans.u, activeTrans.params);

      const durCur = currentShot.t1 - currentShot.t0;
      cam = Cam.evalCamera(currentShot.cam, t, currentShot.t0, durCur);
    } else {
      cam = renderScene(ctx, currentShot, t);
    }

    // 7. 全屏特效层与后期处理 (彩带雨、全屏特效、调色暗角、大标题、字幕)
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 屏幕层通用特效
    drawFxList(ctx, currentShot.fx, t, 'screen', null);

    // 彩带雨 (旧 props 兼容)
    if (currentShot.props && currentShot.props.confetti) {
      const c = currentShot.props.confetti;
      const clt = t - (c.at !== undefined ? c.at : currentShot.t0);
      Fx.drawConfetti(ctx, clt, c.dur || (currentShot.t1 - currentShot.t0));
    }

    // 调色与暗角钩子 (在字幕之前)
    if (root.V12Grade && typeof root.V12Grade.apply === 'function') {
      root.V12Grade.apply(ctx, currentShot.loc, t, cam);
    }

    // 大字幕标题钩子
    if (root.V12Titles && typeof root.V12Titles.draw === 'function') {
      root.V12Titles.draw(ctx, currentShot.title, t);
    } else if (currentShot.title) {
      drawTitle(ctx, currentShot.title, t);
    }

    // 台词字幕
    drawSubtitles(ctx, t);
  }

  // ==================== 资源加载与启动 ====================
  async function boot() {
    canvas = document.getElementById('out');
    ctx = canvas.getContext('2d');

    // 初始化离屏转场画布
    offCanvasA = document.createElement('canvas');
    offCanvasA.width = W;
    offCanvasA.height = H;
    offCtxA = offCanvasA.getContext('2d');

    offCanvasB = document.createElement('canvas');
    offCanvasB.width = W;
    offCanvasB.height = H;
    offCtxB = offCanvasB.getContext('2d');

    // 1. 加载挖挖部件与通用道具图片
    const imgList = {
      body: '../assets/images/v10/parts/body.png',
      boom: '../assets/images/v10/parts/boom.png',
      stick: '../assets/images/v10/parts/stick.png',
      bucket: '../assets/images/v10/parts/bucket.png',
      track: '../assets/images/v10/parts/track.png',
      cake: '../assets/images/v10/parts/cake.png',
      gift: '../assets/images/v10/parts/gift.png',
      party_hat: '../assets/images/v10/parts/party_hat.png',
      bone: '../assets/images/v10/parts/bone.png',
    };

    const loadedImgs = await Promise.all(
      Object.entries(imgList).map(async ([key, src]) => {
        const img = await loadImg(src);
        return [key, img];
      })
    );
    loadedImgs.forEach(([k, im]) => { IMG[k] = im; });

    // 2. 配角数据初始化 (V13: 彻底废弃旧 PNG 切片，使用 100% 纯矢量路径重绘)
    for (const name of ['bluey', 'bingo']) {
      const rig = (root.V12PupRigs && root.V12PupRigs[name]) || (root.V11PupRigs && root.V11PupRigs[name]) || null;
      PUP_DATA[name] = { name, imgs: { hat: IMG.party_hat, bone: IMG.bone }, rig };
    }

    // 3. 计算物理中性姿态油缸尺寸
    const n0 = FK.assemble(FK.NEUTRAL);
    L0 = {
      c1: Math.hypot(n0.c1b[0] - n0.c1a[0], n0.c1b[1] - n0.c1a[1]),
      c2: Math.hypot(n0.c2b[0] - n0.c2a[0], n0.c2b[1] - n0.c2a[1]),
    };
    GIFT_ROT0 = Math.atan2(n0.mBucket[1], n0.mBucket[0]);

    // 4. 导出接口契约
    window.renderAt = (t, type, q) => {
      renderFrame(t);
      return canvas.toDataURL(type || 'image/jpeg', q ?? 0.94);
    };

    // 首次预渲染
    renderFrame(0);
    console.log('[v15] engine ready. 34 shots loaded, total length: 228.0s.');
    window.ready = true;
  }

  boot().catch(err => {
    console.error('[v15] boot error:', err);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
