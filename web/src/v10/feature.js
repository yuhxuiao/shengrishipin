// feature.js — V10 正片驱动 (237s 分镜: 寻宝三幕剧)
// 契约: 依赖 V10Core (main.js boot 导出) + V10FTL; window.renderAt(t,type,q) 纯函数; window.ready
// 从 sample.js 平移泛化: drawPup (布鲁伊/宾果共用) / drawProps (气球/帽子/骨头/礼物/蛋糕) / 多土堆多 X / 蜡烛
(function () {
  'use strict';

  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
  const easeInOutCubic = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const backOut = u => { const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const CONFETTI_COLORS = ['#F5D134', '#F08A28', '#B0E0C0', '#7CCBFB', '#0B2F6E', '#FFFFFF'];
  const FLAG_COLORS = ['#F5D134', '#7CCBFB', '#F08A28', '#B0E0C0', '#0B2F6E'];

  let C = null, TL = null, ctx = null, canvas = null;
  let IMG_BLUEY = null, IMG_BINGO = null, IMG_GIFT = null, IMG_CAKE = null, IMG_HAT = null, IMG_BONE = null;

  function loadImg(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('img load failed: ' + src));
      im.src = src;
    });
  }

  // ---------- 挖挖动作时间轴 ----------
  function wawaSeg(t) {
    for (const [t0, t1, action, opts] of TL.wawa)
      if (t >= t0 && t < t1) return { t0, t1, action, opts };
    return null;
  }

  function drawWawa(t) {
    const seg = wawaSeg(t);
    if (!seg) return null;
    const { t0, t1, action, opts } = seg;
    const lt = t - t0;
    const o = Object.assign({}, opts);
    if (action === 'walk') {
      const u = easeOutCubic(clamp(lt / (t1 - t0), 0, 1));
      o.dx = lerp(opts.dxFrom, opts.dxTo, u);
      o.trackScroll = Math.abs(opts.dxFrom - opts.dxTo) - Math.abs(o.dx - opts.dxTo);
      const bob = 3 * Math.abs(Math.sin(Math.PI * 2 * lt / 0.5));
      if (opts.pose) o.pose = Object.assign({}, opts.pose, { bob });   // 托蛋糕走: 斗守姿态+颠步
      else o.pose = { bob };
      return C.renderFrame(lt, 'idle', false, o);
    }
    if (action === 'pose') {
      o.pose = Object.assign({}, opts.pose);
      o.pose.bob = 2.5 * Math.sin(Math.PI * 2 * lt / 4);
      return C.renderFrame(lt, 'idle', false, o);
    }
    return C.renderFrame(lt, action, false, o);
  }

  // ---------- 小狗 (布鲁伊/宾果共用: 入场单跳 + hops 跳移 + lunge 扑 + bounces) ----------
  function pupState(cfg, t) {
    if (t < cfg.enterAt) return null;
    let x = cfg.x1, dy = 0, sx = 1, sy = 1;
    const JUMP = 0.9;
    // 入场单跳
    const et = t - cfg.enterAt;
    if (et < cfg.enterDur) {
      if (et < JUMP) {
        const hu = et / JUMP;
        x = lerp(cfg.x0, cfg.x1, hu * hu * (3 - 2 * hu));
        dy = -4 * 150 * hu * (1 - hu);
        if (hu < 0.13) { const q = 1 - hu / 0.13; sy = 1 - 0.17 * q * q; sx = 1 + 0.10 * q * q; }
      } else {
        x = cfg.x1;
        const lt = et - JUMP;
        if (lt < 0.3) { const q = backOut(clamp(lt / 0.3, 0, 1)); sy = 0.80 + 0.20 * q; sx = 1.12 - 0.12 * q; }
      }
      return { x, dy, sx, sy };
    }
    // 移动事件链: hops + lunge 统一排序, x 轨道由事件链顺序推进 (lunge 终点=后续 hop 起点, 不瞬移)
    const moves = (cfg.hops || []).map(([ht, hx]) => ({ t: ht, x: hx, dur: JUMP, type: 'hop' }));
    if (cfg.lunge) moves.push({ t: cfg.lunge.at, x: cfg.lunge.to, dur: cfg.lunge.dur, type: 'lunge' });
    moves.sort((a, b) => a.t - b.t);
    x = cfg.x1;
    for (const m of moves) {
      if (t >= m.t + m.dur) { x = m.x; continue; }       // 已完成: 轨道推进
      if (t >= m.t) {                                    // 进行中
        const u = clamp((t - m.t) / m.dur, 0, 1);
        if (m.type === 'hop') {
          x = lerp(x, m.x, u * u * (3 - 2 * u));
          dy = -4 * 120 * u * (1 - u);
          if (u > 0.87) { const q = (u - 0.87) / 0.13; sy = 1 - 0.08 * Math.sin(q * Math.PI); }
        } else {
          x = lerp(x, m.x, easeInOutCubic(u));
          sy = 1 - 0.15 * Math.sin(u * Math.PI); sx = 1 + 0.18 * Math.sin(u * Math.PI);
        }
        return { x, dy, sx, sy, moving: true };
      }
      break;
    }
    // lunge 到位保持低头叼住 0.6s 再回松 (仅当不在后续移动中)
    if (cfg.lunge) {
      const L = cfg.lunge, done = L.at + L.dur;
      if (t >= done && t < done + 0.6) { sy = 0.88; sx = 1.12; }
      else if (t >= done + 0.6 && t < done + 0.9) { const q = (t - done - 0.6) / 0.3; sy = lerp(0.88, 1, q); sx = lerp(1.12, 1, q); }
    }
    // bounces: 庆祝跳 (原位)
    for (const [bt, n] of cfg.bounces || []) {
      if (t >= bt && t < bt + n * 0.55) {
        const bt2 = t - bt;
        dy = -Math.abs(Math.sin(Math.PI * bt2 / 0.55)) * 46 * Math.exp(-bt2 * 1.2);
      }
    }
    return { x, dy, sx, sy };
  }

  function drawPup(img, cfg, t) {
    const st = pupState(cfg, t);
    if (!st) return;
    const w = img.width * (cfg.h / img.height);
    ctx.save();
    ctx.translate(st.x + w / 2, cfg.footY + st.dy);
    ctx.scale(st.sx, st.sy);
    ctx.drawImage(img, -w / 2, -cfg.h, w, cfg.h);
    ctx.restore();
  }

  // ---------- 斗内泥土 (dig 段复用样片窗口逻辑) ----------
  function drawBucketDirt(t, wawaRet) {
    if (!wawaRet) return;
    const seg = wawaSeg(t);
    if (!seg || seg.action !== 'dig') return;
    const lt = t - seg.t0;
    const cycle = Math.floor(lt / 2.4), cyc = lt % 2.4;
    if (cyc < 1.06 || cyc > 2.30) return;
    if (cycle > 0 && cyc > 1.80) return;                  // 第二铲不倒土
    const FK = C.FK;
    const mFull = FK.mMul(wawaRet.rootM, wawaRet.fk.mBucket);
    const sp = FK.mApply(mFull, [350, 420]);
    const rot2 = (Math.atan2(mFull[1], mFull[0]) - C.giftRot0()) * 0.9;
    let s, alpha = 1, fly = 0;
    if (cyc < 1.55) s = lerp(0.45, 1, (cyc - 1.06) / 0.49);
    else if (cyc < 1.86) s = 1;
    else { const u = (cyc - 1.86) / 0.41; s = 1 - 0.75 * u; alpha = 1 - 0.7 * u; fly = u; }
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 3; i++) {
      const ox = (rnd(i * 7 + 3) - 0.5) * 70, oy = 10 - rnd(i * 5 + 11) * 30;
      const fx = fly * (rnd(i * 13 + 1) - 0.3) * 420;
      const fy = -fly * (160 + rnd(i * 17 + 5) * 160) + fly * fly * 700;
      ctx.save();
      ctx.translate(sp[0] + (ox + fx) * C.S, sp[1] + (oy + fy) * C.S);
      ctx.rotate(rot2 + fly * (rnd(i * 19 + 2) - 0.5) * 4);
      ctx.scale(s * C.S, s * C.S);
      ctx.fillStyle = '#A0653F'; ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.roundRect(-34 - rnd(i * 3) * 14, -26 - rnd(i * 4) * 10, 68 + rnd(i * 3) * 28, 52 + rnd(i * 4) * 20, 16);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7A4A2C';
      ctx.beginPath(); ctx.arc(-12, -4, 7, 0, Math.PI * 2); ctx.arc(14, 8, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ---------- X 标记 (多实例, 金 X 变体) ----------
  function drawXmarks(t) {
    for (const X of TL.xmarks) {
      if (t < X.at || t >= X.till) continue;
      const u = clamp((t - X.at) / 0.35, 0, 1);
      const sc = (X.scale || 1) * backOut(u) * (1 + 0.06 * Math.sin(Math.PI * 2 * (t - X.at) / 0.6));
      ctx.save();
      ctx.translate(X.x, X.y); ctx.scale(sc, sc); ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = X.gold ? '#F5D134' : '#0B2F6E';
      ctx.lineWidth = X.gold ? 24 : 20; ctx.lineCap = 'round';
      for (const [x0, y0, x1, y1] of [[-46, 0, 46, 0], [0, -46, 0, 46]]) {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.restore();
      if (X.gold) {                                     // 金 X 星光闪烁
        for (let k = 0; k < 4; k++) {
          const tw = 0.5 + 0.5 * Math.sin(t * 5 + k * 1.7);
          const a = 60 + k * 40;
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.45 * tw;
          ctx.translate(X.x + Math.cos(k * 1.9) * a * 1.6, X.y - 30 - Math.sin(k * 1.9) * a);
          ctx.rotate(Math.PI / 4); ctx.scale(0.35 * tw + 0.15, 0.35 * tw + 0.15);
          ctx.strokeStyle = '#FFE98A'; ctx.lineWidth = 14; ctx.lineCap = 'round';
          for (const [x0, y0, x1, y1] of [[-30, 0, 30, 0], [0, -30, 0, 30]]) {
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
  }

  // ---------- 土堆 (多实例) ----------
  function drawDirtPiles(t) {
    for (const D of TL.dirtpiles) {
      if (t >= D.goneAt) {
        ctx.fillStyle = '#B9D47E';
        ctx.beginPath(); ctx.ellipse(D.x, D.y + 6, D.w * 0.32, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8A5A34';
        ctx.beginPath(); ctx.ellipse(D.x, D.y + 4, D.w * 0.26, 9, 0, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      const u = clamp((t - D.digAt) / (D.goneAt - D.digAt), 0, 1);
      const sc = 1 - 0.85 * u;
      const shake = (t > D.digAt && u < 1) ? Math.sin(Math.PI * 2 * t / 0.25) * 2.5 * (1 - u) : 0;
      ctx.save();
      ctx.translate(D.x + shake, D.y);
      ctx.scale(sc, sc);
      ctx.fillStyle = '#A0653F'; ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 9; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-D.w / 2, 0);
      ctx.quadraticCurveTo(-D.w * 0.28, -D.h, 0, -D.h * 0.82);
      ctx.quadraticCurveTo(D.w * 0.30, -D.h * 0.72, D.w / 2, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7A4A2C';
      for (const [ox, oy, r] of [[-52, -18, 9], [8, -38, 11], [58, -12, 8], [-12, -8, 7]]) {
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------- 道具绘制小件 ----------
  function drawBalloonBunch(x, y, s, t) {               // 一束 3 气球 (程序绘制, 同 decor 画风)
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * 60, oy = (i % 2) * -40;
      const bob2 = Math.sin(Math.PI * 2 * t / 3.5 + i * 1.7) * 10;
      const sway2 = Math.sin(Math.PI * 2 * t / 4.7 + i * 2.3) * 7;
      ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 40); ctx.quadraticCurveTo(ox * 0.5, 0, ox + sway2, oy - 50 + bob2); ctx.stroke();
      ctx.fillStyle = ['#F5D134', '#F08A28', '#7CCBFB'][i];
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(ox + sway2, oy - 96 + bob2, 40, 48, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0B2F6E';
      ctx.beginPath(); ctx.moveTo(ox + sway2 - 7, oy - 52 + bob2); ctx.lineTo(ox + sway2 + 7, oy - 52 + bob2); ctx.lineTo(ox + sway2, oy - 40 + bob2); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 道具系统 (气球浮/帽子飞顶/骨头/礼物/蛋糕) ----------
  function bucketAnchor(wawaRet) {                       // 斗腔锚点 (屏幕)
    const FK = C.FK;
    return { sp: FK.mApply(FK.mMul(wawaRet.rootM, wawaRet.fk.mBucket), [350, 420]),
             rot: (Math.atan2(FK.mMul(wawaRet.rootM, wawaRet.fk.mBucket)[1], FK.mMul(wawaRet.rootM, wawaRet.fk.mBucket)[0]) - C.giftRot0()) };
  }
  function roofAnchor(wawaRet) {                         // 驾驶室顶锚点 (屏幕)
    const FK = C.FK;
    return FK.mApply(FK.mMul(wawaRet.rootM, wawaRet.fk.mBody), [430, 20]);
  }

  function drawProps(t, wawaRet, bingoX, blueySt) {
    const P = TL.props, FK = C.FK;

    // -- 气球束: 破土 backOut → 飘到木桩 --
    const B = P.balloons;
    if (t >= B.at - 0.5) {
      let bx = B.from[0], by = B.from[1], s = 0.01;
      if (t < B.at) {                                    // 伏笔露尖
        s = lerp(0.15, 0.3, (t - (B.at - 0.5)) / 0.5);
        by = B.from[1] + 30;
      } else {
        const u = clamp((t - B.at) / B.popDur, 0, 1);
        s = 0.3 + backOut(u) * 0.5;
        by = B.from[1] - 60 * easeOutCubic(u);
        if (t > B.at + B.popDur) {                       // 飘移段
          const fu = clamp((t - B.at - B.popDur) / B.floatDur, 0, 1);
          const e = easeInOutCubic(fu);
          bx = lerp(B.from[0], B.floatTo[0], e) + Math.sin(t * 2.1) * 8 * (1 - fu);
          by = lerp(B.from[1] - 60, B.floatTo[1], e) + Math.sin(t * 1.7) * 10 * (1 - fu);
        }
      }
      drawBalloonBunch(bx, by, s, t);
    }

    // -- 派对帽: 破土 → 高弧抛物线 → 头顶上方悬停 → 落下戴稳 (挖挖自带帽子, 这顶给布鲁伊) --
    const H = P.hat;
    if (IMG_HAT && t >= H.at && blueySt) {
      const bw2 = IMG_BLUEY.width * (TL.bluey.h / IMG_BLUEY.height);
      const headX = blueySt.x + bw2 * 0.44, headY = TL.bluey.footY + blueySt.dy - TL.bluey.h + 62;
      const arcT = H.at + H.popDur + H.arcDur;           // 弧段终点 (头顶上方 90px)
      const dropT = arcT + 0.35;                         // 悬停后落下戴稳
      let hx, hy, rot = 0, s = 1;
      if (t < arcT) {
        const u = clamp((t - H.at - H.popDur * 0.4) / (H.arcDur + H.popDur * 0.6), 0, 1);
        hx = lerp(H.from[0], headX, u);
        hy = lerp(H.from[1], headY - 90, u) - 4 * 340 * u * (1 - u);   // 重力抛物线 340px 顶 (不扫脸)
        rot = u * 2.2;
        s = backOut(clamp((t - H.at) / H.popDur, 0, 1));
      } else if (t < dropT) {                            // 垂直落下
        const u = easeInOutCubic((t - arcT) / 0.35);
        hx = headX; hy = lerp(headY - 90, headY, u);
        rot = 0.06 * (1 - u);
      } else {                                           // 戴稳: 随布鲁伊 (含弹跳 dy)
        const b = Math.abs(Math.sin((t - dropT) * 6)) * 2.5;
        hx = headX; hy = headY - b;
        rot = 0.06 * Math.sin(t * 1.3);
      }
      const hw = H.w * s, hh = hw * (IMG_HAT.height / IMG_HAT.width);
      ctx.save();
      ctx.translate(hx, hy); ctx.rotate(rot);
      ctx.drawImage(IMG_HAT, -hw / 2, -hh * 0.9, hw, hh);
      ctx.restore();
    }

    // -- 骨头: 破土 → 抛物线落地 → 宾果叼走 --
    const BO = P.bone;
    if (IMG_BONE && t >= BO.at) {
      let bx, by, rot = 0, s = 1;
      const landT = BO.at + BO.popDur + BO.arcDur;
      if (t < landT) {
        const u = clamp((t - BO.at - BO.popDur * 0.4) / (BO.arcDur + BO.popDur * 0.6), 0, 1);
        bx = lerp(BO.from[0], BO.arcTo[0], u);
        by = lerp(BO.from[1], BO.arcTo[1], u) - 4 * 200 * u * (1 - u);
        rot = u * 3.1;
        s = backOut(clamp((t - BO.at) / BO.popDur, 0, 1));
      } else if (t < BO.bingoTakeAt) {
        bx = BO.arcTo[0]; by = BO.arcTo[1]; rot = 0.05 * Math.sin(t * 2);
      } else if (bingoX != null) {                       // 宾果叼着 (随宾果, 低头位)
        bx = bingoX + 150; by = TL.bingo.footY - TL.bingo.h * 0.45; rot = 0.1 * Math.sin(t * 2.2);
      } else {
        bx = BO.arcTo[0]; by = BO.arcTo[1];
      }
      const bw = BO.w * s, bh = bw * (IMG_BONE.height / IMG_BONE.width);
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(rot);
      ctx.drawImage(IMG_BONE, -bw / 2, -bh / 2, bw, bh);
      ctx.restore();
    }

    // -- 礼物: 样片链路 (伏笔露角→破土→挂斗) + 落地安家 --
    const G = P.gift;
    if (wawaRet && t >= G.at - 0.8) {
      let s, rot;
      if (t < G.at) {
        s = lerp(0.35, 0.5, clamp((t - (G.at - 0.8)) / 0.8, 0, 1));
        rot = 0;
      } else {
        const u = clamp((t - G.at) / G.popDur, 0, 1);
        s = 0.5 + backOut(u) * 0.5;
        rot = (1 - easeOutCubic(u)) * -0.21;
      }
      const h = G.w * (IMG_GIFT.height / IMG_GIFT.width);
      const { sp, rot: rotB } = bucketAnchor(wawaRet);
      let gx = sp[0], gy = sp[1], grot = rotB * 0.55 + rot;
      if (t >= G.landAt) {                               // 落地过渡 0.8s
        const u = easeInOutCubic(clamp((t - G.landAt) / 0.8, 0, 1));
        gx = lerp(sp[0], G.landPos[0], u);
        gy = lerp(sp[1], G.landPos[1], u);
        grot = grot * (1 - u);
      }
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(grot); ctx.scale(s * C.S, s * C.S);
      ctx.drawImage(IMG_GIFT, -G.w / 2, -h * 0.92, G.w, h);
      ctx.restore();
      // 守礼物段辉光 (145.2-158)
      if (t >= 145.2 && t < 158) {
        const pulse = 0.20 + 0.10 * Math.sin(Math.PI * 2 * (t - 145.2) / 1.6);
        const gr = ctx.createRadialGradient(gx, gy - h * 0.4, 10, gx, gy - h * 0.4, 260);
        gr.addColorStop(0, `rgba(255,233,138,${pulse})`);
        gr.addColorStop(1, 'rgba(255,233,138,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(gx, gy - h * 0.4, 260, 0, Math.PI * 2); ctx.fill();
      }
    }

    // -- 蛋糕: 挂斗取回 → 落地 (蜡烛火光在 drawCandles) --
    const K = P.cake;
    if (IMG_CAKE && wawaRet && t >= K.at) {
      const kh = K.w * (IMG_CAKE.height / IMG_CAKE.width);
      const { sp, rot: rotB } = bucketAnchor(wawaRet);
      let kx = sp[0], ky = sp[1], krot = rotB * 0.55;
      if (t >= K.landAt) {
        const u = easeInOutCubic(clamp((t - K.landAt) / 0.8, 0, 1));
        kx = lerp(sp[0], K.landPos[0], u);
        ky = lerp(sp[1], K.landPos[1], u);
        krot = krot * (1 - u);
      }
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(krot); ctx.scale(C.S, C.S);
      ctx.drawImage(IMG_CAKE, -K.w / 2, -kh * 0.92, K.w, kh);
      ctx.restore();
    }
  }

  // ---------- 蜡烛火光 + 吹灭 + 烟 ----------
  function drawCandles(t) {
    const CD = TL.candles;
    if (t < CD.at || t > CD.outAt + 2.2) return;
    for (const [cx, cy] of CD.xy) {
      if (t < CD.outAt) {                                // 火光: 淡入 0.8s + 摇曳
        const aIn = clamp((t - CD.at) / 0.8, 0, 1);
        const fl = 1 + 0.13 * Math.sin(t * 11 + cx) + 0.07 * Math.sin(t * 23 + cy);
        const sway = Math.sin(t * 7 + cx) * 3;
        ctx.save();
        ctx.globalAlpha = aIn;
        const gr = ctx.createRadialGradient(cx + sway, cy - 26 * fl, 2, cx + sway, cy - 26 * fl, 46 * fl);
        gr.addColorStop(0, 'rgba(255,240,170,0.95)');
        gr.addColorStop(0.45, 'rgba(245,180,60,0.55)');
        gr.addColorStop(1, 'rgba(245,160,40,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(cx + sway, cy - 26 * fl, 46 * fl, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFE98A';                       // 焰芯
        ctx.beginPath(); ctx.ellipse(cx + sway, cy - 20 * fl, 6, 12 * fl, sway * 0.03, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {                                           // 烟: 0.4s 灭 + 2s 上升淡出
        const u = clamp((t - CD.outAt) / 2.0, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.45 * (1 - u);
        ctx.strokeStyle = '#C9CFD8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18);
        ctx.bezierCurveTo(cx + 14 * u, cy - 40 - 30 * u, cx - 16 * u, cy - 60 - 60 * u, cx + 10 * u, cy - 90 - 90 * u);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ---------- 纸屑 ----------
  function drawConfetti(t) {
    for (let bi = 0; bi < TL.confetti.length; bi++) {
      const { at, n } = TL.confetti[bi];
      const dt = t - at;
      if (dt < 0 || dt > 2.4) continue;
      for (let i = 0; i < n; i++) {
        const seed = bi * 100 + i;
        const vx = (rnd(seed) - 0.5) * 900;
        const vy = -380 - rnd(seed + 7) * 520;
        const x0 = 960 + (rnd(seed + 3) - 0.5) * 160;
        const y0 = 620;
        const drift = Math.sin(dt * 4.2 + seed) * (14 + rnd(seed + 15) * 22) * clamp(dt / 0.9, 0, 1);
        const x = x0 + vx * dt * (1 - 0.35 * clamp(dt / 2.4, 0, 1)) + drift;
        const y = y0 + vy * dt + 620 * dt * dt;
        if (y > 1080) continue;
        const rot = rnd(seed + 5) * 6.28 + dt * (rnd(seed + 9) - 0.5) * 10 + Math.sin(dt * 5 + seed * 2) * 0.5;
        const alpha = clamp(1.6 - dt / 1.5, 0, 1);
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
        ctx.fillStyle = CONFETTI_COLORS[(seed * 7 | 0) % CONFETTI_COLORS.length];
        const w2 = 14 + rnd(seed + 11) * 10, h2 = 8 + rnd(seed + 13) * 6;
        ctx.fillRect(-w2 / 2, -h2 / 2, w2, h2);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- 彩旗气球装饰 (复用样片) ----------
  function drawDecor(t) {
    for (const [y0, sag] of [[18, 40], [58, 22]]) {
      ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-20, y0);
      ctx.quadraticCurveTo(960, y0 + sag * 2, 1940, y0); ctx.stroke();
      for (let i = 0; i < 15; i++) {
        const u = (i + 0.5) / 15;
        const fx = lerp(-20, 1940, u);
        const fy = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * (y0 + sag * 2) + u * u * y0;
        const sway = Math.sin(Math.PI * 2 * t / 2.6 + i * 0.9) * 15;
        ctx.fillStyle = FLAG_COLORS[i % FLAG_COLORS.length];
        ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(fx - 22, fy); ctx.lineTo(fx + 22, fy); ctx.lineTo(fx + sway, fy + 52); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }
    // 右上漂浮气球束 (左下木桩让给道具备胎: 道具气球 42.4s 后才来, 此前画空木桩)
    const balloonPropArrived = t >= TL.props.balloons.at + TL.props.balloons.popDur + TL.props.balloons.floatDur;
    for (const [bx, by, anchored] of [[1760, 330, 0], [120, 690, 1]]) {
      if (anchored && balloonPropArrived) {              // 道具到位后木桩由道具气球接管, 只画桩
        ctx.fillStyle = '#7A4A2C'; ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(bx - 9, 996, 18, 26, 5); ctx.fill(); ctx.stroke();
        continue;
      }
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 84, oy = (i % 2) * -56;
        const bob2 = Math.sin(Math.PI * 2 * t / 3.5 + i * 1.7) * 18;
        const sway2 = Math.sin(Math.PI * 2 * t / 4.7 + i * 2.3) * 10;
        const ropeY = anchored ? 1004 : by + 190;
        ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(bx, ropeY); ctx.quadraticCurveTo(bx + ox * 0.5 + sway2 * 0.4, (ropeY + by) / 2, bx + ox + sway2, by + oy + 66 + bob2); ctx.stroke();
        ctx.fillStyle = ['#F5D134', '#F08A28', '#7CCBFB'][i];
        ctx.lineWidth = 9;
        ctx.beginPath(); ctx.ellipse(bx + ox + sway2, by + oy + bob2, 46, 56, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0B2F6E';
        ctx.beginPath(); ctx.moveTo(bx + ox + sway2 - 8, by + oy + 54 + bob2); ctx.lineTo(bx + ox + sway2 + 8, by + oy + 54 + bob2); ctx.lineTo(bx + ox + sway2, by + oy + 68 + bob2); ctx.closePath(); ctx.fill();
      }
      if (anchored) {
        ctx.fillStyle = '#7A4A2C'; ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(bx - 9, 996, 18, 26, 5); ctx.fill(); ctx.stroke();
      }
    }
  }

  // ---------- 标题 ----------
  function drawTitles(t) {
    for (const T of TL.titles) {
      if (t < T.at || t >= T.till) continue;
      const aIn = clamp((t - T.at) / 0.4, 0, 1);
      const aOut = clamp((T.till - t) / 0.4, 0, 1);
      const alpha = Math.min(aIn, aOut);
      const pop = backOut(aIn);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(T.x || 960, T.y); ctx.scale(pop, pop);
      ctx.font = `${T.size}px "ZCOOL KuaiLe", "PingFang SC", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 22; ctx.strokeStyle = '#0B2F6E'; ctx.lineJoin = 'round';
      ctx.strokeText(T.text, 0, 0);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(T.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- 主渲染 ----------
  function frame(t) {
    const ret = drawWawa(t);
    drawBucketDirt(t, ret);
    drawDirtPiles(t);
    drawDecor(t);
    drawXmarks(t);
    // 宾果 x (供骨头跟随)
    const bs = pupState(TL.bingo, t);
    const bingoX = bs ? bs.x : null;
    const bls = pupState(TL.bluey, t);
    drawPup(IMG_BLUEY, TL.bluey, t);
    if (IMG_BINGO) drawPup(IMG_BINGO, TL.bingo, t);
    drawProps(t, ret, bingoX, bls);
    drawCandles(t);
    drawConfetti(t);
    drawTitles(t);
  }

  async function boot() {
    if (!globalThis.V10Core) {
      await new Promise(r => { const i = setInterval(() => { if (globalThis.V10Core) { clearInterval(i); r(); } }, 60); });
    }
    C = globalThis.V10Core; TL = window.V10FTL;
    canvas = document.getElementById('out');
    ctx = canvas.getContext('2d');
    const opt = p => loadImg(p).catch(e => { console.warn('[v10-feature] 缺素材 ' + p + ' (占位跳过)'); return null; });
    [IMG_BLUEY, IMG_BINGO, IMG_GIFT, IMG_CAKE, IMG_HAT, IMG_BONE] = await Promise.all([
      loadImg('../assets/images/v10/parts/bluey.png'),
      opt('../assets/images/v10/parts/bingo.png'),
      loadImg('../assets/images/v10/parts/gift.png'),
      opt('../assets/images/v10/parts/cake.png'),
      opt('../assets/images/v10/parts/party_hat.png'),
      opt('../assets/images/v10/parts/bone.png'),
      document.fonts.load('100px "ZCOOL KuaiLe"').catch(() => {}),
    ]);
    window.renderAt = (t, type, q) => { frame(t); return canvas.toDataURL(type || 'image/jpeg', q ?? 0.94); };
    frame(0);
    console.log('[v10-feature] ready total=' + TL.total);
    window.ready = true;
  }
  boot().catch(e => console.error('[v10-feature] boot failed ' + (e && e.stack || e)));
})();
