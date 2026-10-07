// sample.js — V10 样片驱动 (24s 分镜: 布鲁伊引导挖挖挖出礼物)
// 契约: 依赖 V10Core (main.js boot 导出) + V10TL; window.renderAt(t,type,q) 纯函数; window.ready
(function () {
  'use strict';

  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
  const backOut = u => { const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
  // 确定性伪随机 (粒子用, 渲染纯函数要求)
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const CONFETTI_COLORS = ['#F5D134', '#F08A28', '#B0E0C0', '#7CCBFB', '#0B2F6E', '#FFFFFF'];
  const FLAG_COLORS = ['#F5D134', '#7CCBFB', '#F08A28', '#B0E0C0', '#0B2F6E'];

  let C = null, TL = null, ctx = null, canvas = null;
  let IMG_BLUEY = null, IMG_GIFT = null;

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
    const lt = t - t0;                                   // 动作局部时间 (循环从 0 播)
    const o = Object.assign({}, opts);
    if (action === 'walk') {
      const u = easeOutCubic(clamp(lt / (t1 - t0), 0, 1));
      o.dx = lerp(opts.dxFrom, opts.dxTo, u);
      o.trackScroll = Math.abs(opts.dxFrom - opts.dxTo) - Math.abs(o.dx - opts.dxTo);  // 已走距离 → 履带滚动量
      o.pose = { bob: 3 * Math.abs(Math.sin(Math.PI * 2 * lt / 0.5)) };  // 走路颠步 (0.5s 一步, 3px 防车身-履带分离感)
      const r = C.renderFrame(lt, 'idle', false, o);
      return r;
    }
    if (action === 'pose') {
      o.pose = Object.assign({}, opts.pose);
      o.pose.bob = 2.5 * Math.sin(Math.PI * 2 * lt / 4);                  // 静态呼吸
      const r = C.renderFrame(lt, 'idle', false, o);
      return r;
    }
    return C.renderFrame(lt, action, false, o);
  }

  // ---------- 布鲁伊 (滑入 + bounce) ----------
  function drawBluey(t) {
    const B = TL.bluey;
    if (t < B.enterAt) return;
    const w = IMG_BLUEY.width * (B.h / IMG_BLUEY.height);
    const et = t - B.enterAt;
    let x, dy = 0, sx = 1, sy = 1;
    if (et < B.enterDur) {
      // 入场: 单跳 (重力抛物线 y∝u(1-u): 上升减速下降加速; 空中刚体不拉伸, squash 只在起跳/落地瞬间)
      const JUMP = 0.9;
      if (et < JUMP) {
        const hu = et / JUMP;
        x = lerp(B.x0, B.x1, hu * hu * (3 - 2 * hu));
        dy = -4 * 150 * hu * (1 - hu);                       // 顶点 150px @hu=0.5
        if (hu < 0.13) { const q = 1 - hu / 0.13; sy = 1 - 0.17 * q * q; sx = 1 + 0.10 * q * q; }  // 起跳蓄力压
      } else {
        x = B.x1;
        const lt = et - JUMP;                                // 落地 squash 回弹 0.3s
        if (lt < 0.3) { const q = backOut(clamp(lt / 0.3, 0, 1)); sy = 0.80 + 0.20 * q; sx = 1.12 - 0.12 * q; }
      }
    } else {
      x = B.x1;
      // 庆祝 bounce: 每段 [t0, n跳]
      for (const [bt, n] of B.bounces) {
        if (t >= bt && t < bt + n * 0.55) {
          const bt2 = t - bt;
          dy = -Math.abs(Math.sin(Math.PI * bt2 / 0.55)) * 46 * Math.exp(-bt2 * 1.2);
        }
      }
    }
    ctx.save();
    ctx.translate(x + w / 2, B.footY + dy);     // 锚脚底中心, squash 不陷地
    ctx.scale(sx, sy);
    ctx.drawImage(IMG_BLUEY, -w / 2, -B.h, w, B.h);
    ctx.restore();
  }

  // ---------- 斗内泥土 (dig 段: 卷斗渐满 → 满斗 → 翻斗倒出抛物线土块) ----------
  function drawBucketDirt(t, wawaRet) {
    if (!wawaRet) return;
    const seg = wawaSeg(t);
    if (!seg || seg.action !== 'dig') return;
    const lt = t - seg.t0;
    const cycle = Math.floor(lt / 2.4), cyc = lt % 2.4;
    if (cyc < 1.06 || cyc > 2.30) return;                 // dig v3: 卷斗 1.10 出现 → 翻回 2.27 倒完
    if (cycle > 0 && cyc > 1.80) return;                  // 第二铲起不再倒土块 (土已挖完, 礼物将出)
    const FK = C.FK;
    const mFull = FK.mMul(wawaRet.rootM, wawaRet.fk.mBucket);
    const sp = FK.mApply(mFull, [350, 420]);
    const rot2 = (Math.atan2(mFull[1], mFull[0]) - C.giftRot0()) * 0.9;   // 土随斗转
    let s, alpha = 1, fly = 0;
    if (cyc < 1.55) s = lerp(0.45, 1, (cyc - 1.06) / 0.49);               // 卷拔渐满
    else if (cyc < 1.86) s = 1;                                            // 满斗保持 (拔起/举升)
    else { const u = (cyc - 1.86) / 0.41; s = 1 - 0.75 * u; alpha = 1 - 0.7 * u; fly = u; }  // 翻斗倒出
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 3; i++) {
      const ox = (rnd(i * 7 + 3) - 0.5) * 70, oy = 10 - rnd(i * 5 + 11) * 30;   // 斗腔深部
      const fx = fly * (rnd(i * 13 + 1) - 0.3) * 420;                      // 倒出抛物线
      const fy = -fly * (160 + rnd(i * 17 + 5) * 160) + fly * fly * 700;
      ctx.save();
      ctx.translate(sp[0] + (ox + fx) * C.S, sp[1] + (oy + fy) * C.S);
      ctx.rotate(rot2 + fly * (rnd(i * 19 + 2) - 0.5) * 4);
      ctx.scale(s * C.S, s * C.S);
      ctx.fillStyle = '#A0653F'; ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.roundRect(-34 - rnd(i * 3) * 14, -26 - rnd(i * 4) * 10, 68 + rnd(i * 3) * 28, 52 + rnd(i * 4) * 20, 16);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7A4A2C';                                          // 土块深斑
      ctx.beginPath(); ctx.arc(-12, -4, 7, 0, Math.PI * 2); ctx.arc(14, 8, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ---------- X 标记 ----------
  function drawXmark(t) {
    const X = TL.xmark;
    if (t < X.at || t >= X.till) return;
    const u = clamp((t - X.at) / 0.35, 0, 1);
    const s = backOut(u) * (1 + 0.06 * Math.sin(Math.PI * 2 * (t - X.at) / 0.6));  // 弹入+脉动
    ctx.save();
    ctx.translate(X.x, X.y); ctx.scale(s, s); ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 20; ctx.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[-46, 0, 46, 0], [0, -46, 0, 46]]) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 礼物 (挂斗内, 弹出) ----------
  function drawGift(t, wawaRet) {
    const G = TL.gift;
    if (!wawaRet || t < G.at - 0.8) return;
    let s, rot;
    if (t < G.at) {                              // 伏笔: 回位段土里露角 (13.9, 斗口近平) → lift 半埋升起
      s = lerp(0.35, 0.5, clamp((t - (G.at - 0.8)) / 0.8, 0, 1));
      rot = 0;
    } else {                                     // 破土弹出: 0.5 → 1.15 → 1.0
      const u = clamp((t - G.at) / G.popDur, 0, 1);
      s = 0.5 + (backOut(u)) * 0.5;
      rot = (1 - easeOutCubic(u)) * -0.21;
    }
    const h = G.w * (IMG_GIFT.height / IMG_GIFT.width);
    const m = wawaRet.fk.mBucket;                        // 斗变换 (装配空间)
    const FK = C.FK;
    const rootM = wawaRet.rootM;
    const mFull = FK.mMul(rootM, m);                     // 斗全变换 (含斗旋转)
    const sp = FK.mApply(mFull, [350, 420]);             // 斗内锚点 → 屏幕
    ctx.save();
    ctx.translate(sp[0], sp[1]);
    // 礼物随斗转 (相对中性斗姿的旋转差 × 0.55 = 像靠在斗底, 不贴斗背)
    const rot2 = (Math.atan2(mFull[1], mFull[0]) - C.giftRot0()) * 0.55;
    ctx.rotate(rot2 + rot); ctx.scale(s * C.S, s * C.S);
    ctx.drawImage(IMG_GIFT, -G.w / 2, -h * 0.92, G.w, h);
    ctx.restore();
  }

  // ---------- 纸屑 (两批, 解析式纯函数) ----------
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
        const drift = Math.sin(dt * 4.2 + seed) * (14 + rnd(seed + 15) * 22) * clamp(dt / 0.9, 0, 1);  // 空气阻力横漂
        const x = x0 + vx * dt * (1 - 0.35 * clamp(dt / 2.4, 0, 1)) + drift;
        const y = y0 + vy * dt + 620 * dt * dt;
        if (y > 1080) continue;
        const rot = rnd(seed + 5) * 6.28 + dt * (rnd(seed + 9) - 0.5) * 10 + Math.sin(dt * 5 + seed * 2) * 0.5;  // 翻飘逸动
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

  // ---------- 彩旗气球 (布鲁伊风平涂+粗描边, 摆动) ----------
  function drawDecor(t) {
    // 彩旗两串 (顶部高位, 避开大臂举起空间)
    for (const [y0, sag] of [[18, 40], [58, 22]]) {
      ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-20, y0);
      ctx.quadraticCurveTo(960, y0 + sag * 2, 1940, y0); ctx.stroke();
      for (let i = 0; i < 15; i++) {
        const u = (i + 0.5) / 15;
        const fx = lerp(-20, 1940, u);
        const fy = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * (y0 + sag * 2) + u * u * y0;
        const sway = Math.sin(Math.PI * 2 * t / 2.6 + i * 0.9) * 15;   // 旗尖大摆 (根部固定尖部甩)
        ctx.fillStyle = FLAG_COLORS[i % FLAG_COLORS.length];
        ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(fx - 22, fy); ctx.lineTo(fx + 22, fy); ctx.lineTo(fx + sway, fy + 52); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }
    // 气球束 (右上漂浮 + 左下拴草地木桩)
    for (const [bx, by, anchored] of [[1760, 330, 0], [120, 690, 1]]) {
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 84, oy = (i % 2) * -56;
        const bob2 = Math.sin(Math.PI * 2 * t / 3.5 + i * 1.7) * 18;
        const sway2 = Math.sin(Math.PI * 2 * t / 4.7 + i * 2.3) * 10;   // 气球横向漂摆
        const ropeY = anchored ? 1004 : by + 190;                       // 拴桩束绳到草地, 漂浮束短绳
        ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(bx, ropeY); ctx.quadraticCurveTo(bx + ox * 0.5 + sway2 * 0.4, (ropeY + by) / 2, bx + ox + sway2, by + oy + 66 + bob2); ctx.stroke();
        ctx.fillStyle = ['#F5D134', '#F08A28', '#7CCBFB'][i];
        ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.ellipse(bx + ox + sway2, by + oy + bob2, 46, 56, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0B2F6E';
        ctx.beginPath(); ctx.moveTo(bx + ox + sway2 - 8, by + oy + 54 + bob2); ctx.lineTo(bx + ox + sway2 + 8, by + oy + 54 + bob2); ctx.lineTo(bx + ox + sway2, by + oy + 68 + bob2); ctx.closePath(); ctx.fill();
      }
      if (anchored) {                                                  // 草地小木桩
        ctx.fillStyle = '#7A4A2C'; ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(bx - 9, 996, 18, 26, 5); ctx.fill(); ctx.stroke();
      }
    }
  }

  // ---------- 土堆 (礼物藏点: 完整 → 两铲挖走 → 浅坑) ----------
  function drawDirtPile(t) {
    const D = TL.dirtpile;
    if (t >= D.goneAt) {                                   // 挖完后留浅坑
      ctx.fillStyle = '#B9D47E';
      ctx.beginPath(); ctx.ellipse(D.x, D.y + 6, D.w * 0.32, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8A5A34';
      ctx.beginPath(); ctx.ellipse(D.x, D.y + 4, D.w * 0.26, 9, 0, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const u = clamp((t - D.digAt) / (D.goneAt - D.digAt), 0, 1);   // 两铲进度
    const sc = 1 - 0.85 * u;                               // 逐渐挖小
    const shake = (t > D.digAt && u < 1) ? Math.sin(Math.PI * 2 * t / 0.25) * 2.5 * (1 - u) : 0;  // 挖掘期抖动
    ctx.save();
    ctx.translate(D.x + shake, D.y);
    ctx.scale(sc, sc);
    // 丘体 (平涂+描边)
    ctx.fillStyle = '#A0653F'; ctx.strokeStyle = '#0B2F6E'; ctx.lineWidth = 9; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-D.w / 2, 0);
    ctx.quadraticCurveTo(-D.w * 0.28, -D.h, 0, -D.h * 0.82);
    ctx.quadraticCurveTo(D.w * 0.30, -D.h * 0.72, D.w / 2, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 土块点
    ctx.fillStyle = '#7A4A2C';
    for (const [ox, oy, r] of [[-52, -18, 9], [8, -38, 11], [58, -12, 8], [-12, -8, 7]]) {
      ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 标题字幕 ----------
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
    const ret = drawWawa(t);          // 背景+挖挖 (renderFrame 内含背景/影/挖挖)
    drawBucketDirt(t, ret);           // 斗内泥土 (dig 段挖起/倒出)
    drawDirtPile(t);                  // 土堆在挖挖之后: 斗齿插入时被堆体遮挡
    drawDecor(t);                     // 彩旗气球 (顶部/角落, 无重叠)
    drawXmark(t);
    drawBluey(t);
    drawGift(t, ret);
    drawConfetti(t);
    drawTitles(t);
  }

  async function boot() {
    if (!globalThis.V10Core) {   // 样片模式下 main.js 不置 ready, 只等 V10Core 导出
      await new Promise(r => { const i = setInterval(() => { if (globalThis.V10Core) { clearInterval(i); r(); } }, 60); });
    }
    C = globalThis.V10Core; TL = window.V10TL;
    canvas = document.getElementById('out');
    ctx = canvas.getContext('2d');
    [IMG_BLUEY, IMG_GIFT] = await Promise.all([
      loadImg('../assets/images/v10/parts/bluey.png'),
      loadImg('../assets/images/v10/parts/gift.png'),
      document.fonts.load('100px "ZCOOL KuaiLe"').catch(() => {}),
    ]);
    window.renderAt = (t, type, q) => { frame(t); return canvas.toDataURL(type || 'image/jpeg', q ?? 0.94); };
    frame(0);
    console.log('[v10-sample] ready total=' + TL.total);
    window.ready = true;
  }
  boot().catch(e => console.error('[v10-sample] boot failed ' + (e && e.stack || e)));
})();
