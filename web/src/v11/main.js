// main.js — V11 导演版 2D 骨骼与全片渲染管线 (Canvas2D, 34 镜全剧本时间轴)
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

  const NAVY = '#0B2F6E';

  // 依赖模块
  const Cam = root.V11Cam;
  const Scenery = root.V11Scenery;
  const Fx = root.V11Fx;
  const Shots = root.V11Shots;
  const Face = root.V11Face;
  const Actions = root.V11Actions;
  const Pup = root.V11Pup;
  const FK = root.V10FK;

  let canvas, ctx;
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
    ctx.lineTo(a[0] + ux * 26 - nx * 21, a[1] + uy * 26 - ny * 21);
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

  // 挖挖铲斗倒土
  function drawBucketDirt(ctx, t, shot, wawaRet, camM) {
    if (!wawaRet || !shot.wawa || shot.wawa.action !== 'dig') return;
    const lt = t - shot.t0;
    const cyc = lt % 2.4;
    if (cyc < 1.06 || cyc > 2.30) return;
    const mFull = FK.mMul(wawaRet.rootM, wawaRet.fk.mBucket);
    const sp = FK.mApply(mFull, [350, 420]);
    let s = 1, alpha = 1, fly = 0;
    if (cyc < 1.55) s = lerp(0.45, 1, (cyc - 1.06) / 0.49);
    else if (cyc < 1.86) s = 1;
    else { const u = (cyc - 1.86) / 0.41; s = 1 - 0.75 * u; alpha = 1 - 0.7 * u; fly = u; }

    ctx.save();
    if (camM) ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 3; i++) {
      const fx = fly * (rnd(i * 13 + 1) - 0.3) * 380;
      const fy = -fly * (140 + rnd(i * 17 + 5) * 140) + fly * fly * 600;
      ctx.save();
      ctx.translate(sp[0] + fx, sp[1] + fy);
      ctx.scale(s * 0.72, s * 0.72);
      ctx.fillStyle = '#9C6233';
      ctx.beginPath(); ctx.ellipse(0, 0, 40, 26, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 绘制挖挖
  function drawWawa(ctx, t, shot, lt, dur, camM) {
    const cfg = shot.wawa;
    if (!cfg || cfg.visible === false) return null;

    const S = cfg.scale !== undefined ? cfg.scale : 0.52;
    const groundY = 880;
    const baseX = cfg.x !== undefined ? cfg.x : 1040;
    const CHAR_X = baseX - 991 * S;
    const CHAR_Y = groundY - 1156 * S;
    let dx = cfg.dx || 0;
    let trackScroll = 0;

    if (cfg.action === 'walk') {
      const u = easeOutCubic(clamp(lt / dur, 0, 1));
      dx = lerp(cfg.dxFrom !== undefined ? cfg.dxFrom : -180, cfg.dxTo !== undefined ? cfg.dxTo : 180, u);
      trackScroll = Math.abs(dx - (cfg.dxFrom !== undefined ? cfg.dxFrom : -180)) * 1.6;
    }

    // 计算姿势
    let pose;
    const actName = cfg.action || 'idle';
    if (cfg.action === 'walk') {
      const bob = 4 * Math.abs(Math.sin(Math.PI * 2 * lt / 0.5));
      pose = { boom: 47.5, stick: -26, bucket: cfg.hasCake ? -12 : -5, bob, squash: 0 };
    } else if (Actions[actName]) {
      pose = Object.assign({}, Actions[actName](lt));
      if (cfg.hasCake) pose.bucket = -12;
    } else {
      pose = Object.assign({}, Actions.idle(lt));
    }

    // 说话时的身体微晃与呼吸微表演 (低频自然韵律，彻底消灭高频电机抖动)
    const frameIdx = Math.min(6839, Math.max(0, Math.floor(t * 30)));
    const mouthOpen = (root.V11Lipsync && root.V11Lipsync[frameIdx]) || 0;
    if (mouthOpen > 0.08 || cfg.expr === 'talk') {
      const talkAmp = mouthOpen > 0.08 ? mouthOpen : 0.6;
      pose.bob = (pose.bob || 0) + Math.sin(t * 4.8) * 2.2 * talkAmp;
      pose.boom = (pose.boom || 0) + Math.sin(t * 3.6) * 1.5 * talkAmp;
    }

    // 吹蜡烛姿态 (车身与大臂微前倾)
    if (cfg.expr === 'blow') {
      pose.boom = (pose.boom || 0) - 8;
      pose.stick = (pose.stick || 0) + 12;
      pose.bob = (pose.bob || 0) + 6;
    }

    const fk = FK.assemble(pose);
    let placeM = FK.mMul(FK.mTrans(CHAR_X + dx, CHAR_Y), FK.mScale(S, S));
    const rootM = cfg.mirror ? FK.mMul([-1, 0, 0, 1, W, 0], placeM) : placeM;
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

    // 5. 程序化灵动脸层 (眼睛、眉毛、张合口型与舌头、腮红)
    const expr = cfg.expr || 'happy';
    const lookAt = cfg.look || [0, 0];
    Face.draw(ctx, expr, lookAt, mouthOpen, t);

    // 6. 车顶派对帽: body.png 原图已自带彩虹波点派对帽，无需重复绘制

    // 7. 铰销垫片
    setM(rootM);
    pinCap(ctx, fk.hingeW);

    // 8. 斗杆
    setM(FK.mMul(rootM, fk.mStick));
    ctx.drawImage(IMG.stick, 0, 0);

    // 9. 斗杆油缸
    setM(rootM);
    drawCylinder(ctx, fk.c2a, fk.c2b, L0.c2);

    // 10. 铲斗
    setM(FK.mMul(rootM, fk.mBucket));
    ctx.drawImage(IMG.bucket, 0, 0);

    // 11. 铲斗内蛋糕 (如果有且未落地)
    if (cfg.hasCake && IMG.cake) {
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

    // 12. 铲斗倒土
    drawBucketDirt(ctx, t, shot, { rootM, fk }, camM);

    if (camM) ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
    else ctx.setTransform(1, 0, 0, 1, 0, 0);
    return { fk, rootM, placeM, dx };
  }

  // 绘制配角 (布鲁伊与宾果)
  function drawPup(ctx, charKey, cfg, t) {
    if (!cfg || cfg.visible === false) return;
    const pupData = PUP_DATA[charKey];
    if (!pupData) return;

    let x = cfg.x !== undefined ? cfg.x : 600;
    let dy = 0;
    let pose = cfg.pose || 'stand';

    // 入场跳跃计算
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
      return; // 尚未入场
    }

    const state = {
      x,
      footY: cfg.footY || 880,
      h: cfg.h || (charKey === 'bluey' ? 420 : 360),
      dy,
      pose,
      facing: cfg.facing !== undefined ? cfg.facing : 1,
      hat: { visible: true },
      item: cfg.item || null,
    };

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

      // 小气球打结处
      ctx.fillStyle = '#0B2F6E';
      ctx.beginPath();
      ctx.moveTo(ox + sway - 6, oy - 42 + bob);
      ctx.lineTo(ox + sway + 6, oy - 42 + bob);
      ctx.lineTo(ox + sway, oy - 32 + bob);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // 幽默小黄鸭纯矢量绘制
  function drawDuck(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const wobble = Math.sin(t * 8) * 0.12;
    ctx.rotate(wobble);

    // 鸭身
    ctx.fillStyle = '#FFDD33';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 32, 0, 0, TAU);
    ctx.fill(); ctx.stroke();

    // 鸭头
    ctx.beginPath();
    ctx.arc(24, -22, 22, 0, TAU);
    ctx.fill(); ctx.stroke();

    // 扁扁鸭嘴
    ctx.fillStyle = '#FF7A28';
    ctx.beginPath();
    ctx.moveTo(42, -26);
    ctx.lineTo(60, -20);
    ctx.lineTo(40, -14);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 豆豆眼
    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.arc(32, -26, 4.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(34, -28, 1.8, 0, TAU); ctx.fill();

    // 小翅膀
    ctx.fillStyle = '#F5C622';
    ctx.beginPath();
    ctx.ellipse(-10, -2, 18, 12, -0.3, 0, TAU);
    ctx.fill(); ctx.stroke();

    ctx.restore();
  }

  // 场景道具交互渲染
  function drawProps(ctx, shot, t, lt, dur, wawaRet) {
    const P = shot.props;
    if (!P) return;

    // 1. X 宝藏标记
    if (P.xmark) {
      Fx.drawXmark(ctx, P.xmark.x, P.xmark.y, !!P.xmark.isGolden, t);
    }
    if (P.golden_x) {
      Fx.drawXmark(ctx, P.golden_x.x, P.golden_x.y, true, t);
    }
    if (P.xmark_flash) {
      const p = P.xmark_flash;
      if (t >= p.at) {
        Fx.drawXmark(ctx, p.x, p.y, true, t);
      }
    }

    // 2. 挖掘泥土尘粒
    if (P.dust) {
      const p = P.dust;
      if (t >= p.at && t < p.at + p.dur) {
        const u = (t - p.at) / p.dur;
        Fx.drawDust(ctx, p.x, p.y, u);
      }
    }

    // 3. 星光迸发
    if (P.stars) {
      const p = P.stars;
      if (t >= p.at && t < p.at + p.dur) {
        const u = (t - p.at) / p.dur;
        Fx.drawStars(ctx, p.x, p.y, u);
      }
    }

    // 4. 气球束
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

    // 5. 搞笑小黄鸭破沙飞出与落地弹跳 (幽默意外物理特效)
    if (P.duck_pop) {
      const p = P.duck_pop;
      if (t >= p.at) {
        const u = clamp((t - p.at) / p.dur, 0, 1);
        Fx.drawDuckPhysics(ctx, p.x, p.y, u, t);
      }
    }

    // 6. 骨头破土
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

    // 7. 礼物盒子 (出土与着陆)
    if (P.gift_corner && IMG.gift) {
      ctx.save();
      ctx.translate(P.gift_corner.x, P.gift_corner.y);
      const gw = 180, gh = gw * (IMG.gift.height / IMG.gift.width);
      ctx.drawImage(IMG.gift, -gw / 2, -gh * 0.4, gw, gh);
      Fx.drawGlow(ctx, 0, -gh * 0.2, 120, '#FFE57F', 0.5);
      ctx.restore();
    }

    if (P.gift_pop && IMG.gift) {
      const p = P.gift_pop;
      if (t >= p.at) {
        const u = clamp((t - p.at) / p.dur, 0, 1);
        const gx = lerp(p.x0, p.x1, easeOutCubic(u));
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

    // 8. 柔和辉光
    if (P.glow) {
      Fx.drawGlow(ctx, P.glow.x, P.glow.y, P.glow.r, P.glow.col, 0.4);
    }

    // 9. 生日蛋糕 (着陆与蜡烛)
    if (P.cake_landed && IMG.cake) {
      ctx.save();
      ctx.translate(P.cake_landed.x, P.cake_landed.y);
      ctx.scale(0.72, 0.72);
      const kw = 520, kh = kw * (IMG.cake.height / IMG.cake.width);
      ctx.drawImage(IMG.cake, -kw / 2, -kh * 0.88, kw, kh);

      // 蜡烛火光与吹熄青烟
      const flameX = -2, flameY = -kh * 0.88 + 48;
      if (P.candle_lit) {
        Fx.drawCandle(ctx, flameX, flameY, t, true, false, 0);
      } else if (P.candle_blow) {
        const cp = P.candle_blow;
        const blown = t >= cp.at;
        const blownProg = blown ? clamp((t - cp.at) / cp.dur, 0, 1) : 0;
        if (blown) {
          ctx.save();
          // 盖住原图烘焙明火
          ctx.fillStyle = '#64B5F6';
          ctx.beginPath();
          ctx.ellipse(flameX, flameY, 26, 38, 0, 0, TAU);
          ctx.fill();
          // 熄灭后的小黑烛芯
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

    // 主标题
    ctx.font = 'bold 72px "ZCOOL KuaiLe", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 14;
    ctx.strokeStyle = NAVY;
    ctx.strokeText(title.text, 0, 0);
    ctx.fillStyle = '#FFE14A';
    ctx.fillText(title.text, 0, 0);

    // 副标题
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
    const subs = root.V11Subtitles;
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

        // 半透明圆角深蓝底框
        ctx.fillStyle = 'rgba(11, 47, 110, 0.78)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 20);
        ctx.fill();
        ctx.strokeStyle = item.speaker === 'wawa' ? '#FFE14A' : '#7CCBFB';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 字幕文本 (挖挖台词用亮黄，旁白用纯白)
        ctx.fillStyle = item.speaker === 'wawa' ? '#FFE873' : '#FFFFFF';
        ctx.fillText(txt, 960, 970);
        ctx.restore();
        break;
      }
    }
  }

  // ==================== 主渲染纯函数 ====================
  function renderFrame(t) {
    t = Math.max(0, Math.min(Shots.TOTAL, t));
    const shot = Shots.getShotAt(t);
    const lt = t - shot.t0;
    const dur = shot.t1 - shot.t0;

    // 1. 虚拟摄像机状态
    const cam = Cam.evalCamera(shot.cam, t, shot.t0, dur);

    // 清屏
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 2. 视差层 1: Sky (depth = 0.05)
    Cam.apply(ctx, cam, 0.05);
    Scenery.drawSky(ctx, shot.loc, t);
    Cam.restore(ctx);

    // 3. 视差层 2: Far (depth = 0.20)
    Cam.apply(ctx, cam, 0.20);
    Scenery.drawFar(ctx, shot.loc, t);
    Cam.restore(ctx);

    // 4. 视差层 3: Mid (depth = 0.55)
    Cam.apply(ctx, cam, 0.55);
    Scenery.drawMid(ctx, shot.loc, t);
    Cam.restore(ctx);

    // 5. 主世界层: Ground, Excavation Hole, Wawa, Party Table, Props, Puppies (depth = 1.00)
    const camM = Cam.getMatrix(cam, 1.00);
    Cam.apply(ctx, cam, 1.00);
    Scenery.drawGround(ctx, shot.loc, t);

    // 地面挖掘凹坑与隆起土堆 (解决"地面永远是平的"粗糙感)
    if (shot.props && shot.props.hole) {
      const p = shot.props.hole;
      const prog = clamp((t - p.at) / 1.5, 0, 1);
      Fx.drawExcavationHole(ctx, p.x, p.y, prog);
    }

    // 挖挖 (精确绑定主世界摄像机变换矩阵)
    const wawaRet = drawWawa(ctx, t, shot, lt, dur, camM);

    // 派对长桌 (位于挖挖前方、蛋糕与配角下方，彻底消除悬空感)
    if (shot.loc === 'party' && Scenery.drawPartyTable) {
      Scenery.drawPartyTable(ctx, 960, 830, 1200, 140);
    }

    // 场景道具交互 (蛋糕端正摆在长桌上、气球、礼物盒等)
    drawProps(ctx, shot, t, lt, dur, wawaRet);

    // 配角小狗 (分件骨骼驱动，舞台三分线站位)
    drawPup(ctx, 'bluey', shot.bluey, t);
    drawPup(ctx, 'bingo', shot.bingo, t);

    Cam.restore(ctx);

    // 6. 视差层 4: Foreground (depth = 1.45)
    Cam.apply(ctx, cam, 1.45);
    Scenery.drawForeground(ctx, shot.loc, t);
    Cam.restore(ctx);

    // 7. 全屏特效层 (彩带雨、大标题、字幕)
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 彩带雨
    if (shot.props && shot.props.confetti) {
      const c = shot.props.confetti;
      const clt = t - (c.at !== undefined ? c.at : shot.t0);
      Fx.drawConfetti(ctx, clt, c.dur || dur);
    }

    // 大字幕标题
    if (shot.title) {
      drawTitle(ctx, shot.title, t);
    }

    // 台词字幕
    drawSubtitles(ctx, t);
  }

  // ==================== 资源加载与启动 ====================
  async function boot() {
    canvas = document.getElementById('out');
    ctx = canvas.getContext('2d');

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

    // 2. 加载小狗分件图片 (Bluey & Bingo)
    const pupParts = ['head', 'torso', 'arm_l', 'arm_r', 'leg_l', 'leg_r', 'tail'];
    for (const name of ['bluey', 'bingo']) {
      const pImgs = {};
      await Promise.all(
        pupParts.map(async p => {
          pImgs[p] = await loadImg(`../assets/images/v11/pups/${name}/${p}.png`);
        })
      );
      pImgs.hat = IMG.party_hat;
      pImgs.bone = IMG.bone;
      const rig = (root.V11PupRigs && root.V11PupRigs[name]) || null;
      PUP_DATA[name] = { imgs: pImgs, rig };
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
    console.log('[v11] engine ready. 34 shots loaded, total length: 228.0s.');
    window.ready = true;
  }

  boot().catch(err => {
    console.error('[v11] boot error:', err);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
