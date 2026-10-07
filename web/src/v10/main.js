// main.js — V10 挖挖 · 布鲁伊风 2D 骨骼引擎入口 (Canvas2D, FK 变换树)
// 契约: window.renderAt(t, type, q) 纯函数 -> dataURL; window.renderSheet(ts, cols, w); window.ready
// hash: #idle(默认) #dig #wave #blink, 附加 #mirror(水平镜像, 反向镜头) #debug(FK 标记)
(function () {
  'use strict';
  const FK = globalThis.V10FK, ACT = globalThis.V10Actions;
  const { PARTS, LAYOUT, FACE, mMul, mTrans, mScale } = FK;

  const W = 1920, H = 1080;
  // 角色落位: 装配空间 -> 屏幕 (内容带 x[-210,1483] y[-148,1170], 居中留边)
  const S = 0.72, CHAR_X = 502, CHAR_Y = 172;
  const GROUND_SCR = CHAR_Y + LAYOUT.ground_y * S;   // 屏幕地面线 ≈ 1000

  const tokens = location.hash.slice(1).split(/[&#]/).filter(Boolean);
  const ACTION = tokens.find(t => ['idle', 'dig', 'wave', 'blink'].includes(t)) || 'idle';
  const MIRROR = tokens.includes('mirror');
  const DEBUG = tokens.includes('debug');

  const NAVY = FACE.navy, BLUE = FACE.blue;
  const out = document.getElementById('out');
  const ctx = out.getContext('2d');

  const IMG = {};
  function loadImg(name) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('img load failed: ' + name));
      im.src = '../assets/images/v10/parts/' + PARTS[name].file;
    });
  }

  // ---------- 背景 (布鲁伊风极简大色块, 镜像不翻转) ----------
  function drawBackground() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#B0E0F0'; ctx.fillRect(0, 0, W, H);              // 天
    ctx.fillStyle = '#B0E0C0';                                        // 灌木剪影
    for (const [bx, br] of [[150, 120], [330, 80], [1620, 100], [1800, 130], [1200, 70]]) {
      ctx.beginPath(); ctx.arc(bx, GROUND_SCR + 4, br, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = '#D0E090'; ctx.fillRect(0, GROUND_SCR, W, H - GROUND_SCR);  // 草坪
  }

  // ---------- 油缸 (程序化胶囊: 缸筒定长比 + 活塞杆随动, 两端铰钉) ----------
  function strokeCapsule(a, b, wPx, color) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.lineCap = 'round'; ctx.lineWidth = wPx; ctx.strokeStyle = color; ctx.stroke();
  }
  function pinCap(p) {
    ctx.beginPath(); ctx.arc(p[0], p[1], 19, 0, Math.PI * 2); ctx.fillStyle = NAVY; ctx.fill();
    ctx.beginPath(); ctx.arc(p[0], p[1], 8.5, 0, Math.PI * 2); ctx.fillStyle = '#7CCBFB'; ctx.fill();
  }
  function drawCylinder(a, b, L0) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const barrelLen = Math.min(0.55 * L0, d * 0.62);        // 缸筒定长比, 杆程下限由动作关键帧保证(≥0.72L0)
    const be = [a[0] + ux * barrelLen, a[1] + uy * barrelLen];
    const rodStart = [a[0] + ux * (barrelLen - 16), a[1] + uy * (barrelLen - 16)];
    // 缸筒铰座先画 (耳板焊在大臂上, 缸筒从座中穿出, 读作"铰接在此")
    const nx = -uy, ny = ux;
    ctx.beginPath();
    ctx.moveTo(a[0] - ux * 26 + nx * 21, a[1] - uy * 26 + ny * 21);
    ctx.lineTo(a[0] + ux * 26 + nx * 21, a[1] + uy * 26 + ny * 21);
    ctx.lineTo(a[0] + ux * 26 - nx * 21, a[1] + uy * 26 - ny * 21);
    ctx.lineTo(a[0] - ux * 26 - nx * 21, a[1] - uy * 26 - ny * 21);
    ctx.closePath(); ctx.fillStyle = NAVY; ctx.fill();
    strokeCapsule(a, be, 30, NAVY);                          // 缸筒描边
    strokeCapsule(a, be, 23, '#2E9BE8');                     // 缸筒(深蓝于车身, 区分层次)
    strokeCapsule(rodStart, b, 22, NAVY);                    // 活塞杆描边
    strokeCapsule(rodStart, b, 15, '#9BD8FC');               // 活塞杆
    ctx.beginPath(); ctx.arc(be[0], be[1], 17, 0, Math.PI * 2);   // 缸口环 (杆出自缸筒, 结构感)
    ctx.fillStyle = NAVY; ctx.fill();
    ctx.beginPath(); ctx.arc(be[0], be[1], 11, 0, Math.PI * 2);
    ctx.fillStyle = '#1E6FAE'; ctx.fill();
    pinCap(a); pinCap(b);
  }

  // ---------- 眨眼盖片 (body 局部坐标, 蒙在车身上, 保留眼眶描边; v3 弧形睑缘+∩ 闭眼弧, 对齐 wink 定稿) ----------
  function drawBlink(amt) {
    if (amt <= 0.02) return;
    for (const e of [FACE.eye_l, FACE.eye_r]) {
      const [cx, cy] = e.c, rx = e.rx - 5, ry = e.ry - 5;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
      const lidY = (cy - ry) + amt * 2 * ry;
      ctx.fillStyle = BLUE;
      ctx.beginPath();                                    // 盖片下缘 = 向下微凸睑缘弧(中间低, 包眼球)
      ctx.moveTo(cx - rx - 2, cy - ry - 2);
      ctx.lineTo(cx + rx + 2, cy - ry - 2);
      ctx.lineTo(cx + rx + 2, lidY - ry * 0.12);
      ctx.quadraticCurveTo(cx, lidY + ry * 0.28, cx - rx - 2, lidY - ry * 0.12);
      ctx.closePath(); ctx.fill();
      if (amt > 0.55) {                                   // 近全闭: ∩ 闭眼拱弧 (两端下弯, 同 wink 定稿)
        const ay = Math.min(lidY, cy + 14);
        ctx.beginPath(); ctx.moveTo(cx - rx * 0.58, ay - 2);
        ctx.quadraticCurveTo(cx, ay - 30, cx + rx * 0.58, ay - 2);
        ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.strokeStyle = NAVY; ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---------- 主渲染 (纯函数; action/mirror 可覆盖, 供样片时间轴复用) ----------
  let L0 = null;   // 中性姿态油缸自然长 (boot 时实测)
  let GIFT_ROT0 = 0;   // 中性斗姿态旋转基准
  function renderFrame(t, actionOverride, mirrorOverride, opts) {
    drawBackground();
    const action = actionOverride || ACTION, mirror = mirrorOverride !== undefined ? mirrorOverride : MIRROR;
    const pose = ACT[action](t);
    // 样片走位/姿态覆盖: opts.dx 装配平移, opts.pose 直接指定姿态角 (冻结帧)
    if (opts && opts.pose) Object.assign(pose, opts.pose);
    const fk = FK.assemble(pose);
    let placeM = mMul(mTrans(CHAR_X, CHAR_Y), mScale(S, S));
    if (opts && opts.dx) placeM = mMul(placeM, mTrans(opts.dx, opts.dy || 0));
    const rootM = mirror ? mMul([-1, 0, 0, 1, W, 0], placeM) : placeM;
    const setM = m => ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

    // 接地影 (平涂椭圆, 贴在履带下)
    setM(rootM);
    ctx.beginPath(); ctx.ellipse(991, 1156, 545, 42, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#A9CC6B'; ctx.fill();

    setM(mMul(rootM, mTrans(LAYOUT.track_tl[0], LAYOUT.track_tl[1])));   // 履带(贴地静态)
    ctx.drawImage(IMG.track, 0, 0);
    if (opts && opts.trackScroll) {                                       // 走位时履带滚动 (scroll px = 已走距离, 与 dx 同步)
      const sc = opts.trackScroll, th = PARTS.track.h;
      ctx.save();
      ctx.beginPath(); ctx.rect(330, 58, 323, th - 116); ctx.clip();     // 只画两轮间中段 (轮子结构保留)
      ctx.fillStyle = 'rgba(20,40,80,.30)';
      const step = 38, off = sc % step;
      for (let x = 330 - step + off; x < 653 + step; x += step) ctx.fillRect(x, 58, 14, th - 116);
      ctx.restore();
      for (const wx of [195, 788]) {                                      // 双轮偏心点旋转 (轮 r≈130, 醒目白芯钉)
        const a = sc / 130;
        ctx.beginPath(); ctx.arc(wx + 78 * Math.cos(a), 205 + 78 * Math.sin(a), 24, 0, Math.PI * 2);
        ctx.fillStyle = NAVY; ctx.fill();
        ctx.beginPath(); ctx.arc(wx + 78 * Math.cos(a), 205 + 78 * Math.sin(a), 11, 0, Math.PI * 2);
        ctx.fillStyle = '#E8F4FF'; ctx.fill();
      }
    }

    setM(mMul(rootM, fk.mBoom));                                         // 大臂 (v4: 在车身之下, 车身盖住根铰盖内半=铰嵌转台)
    ctx.drawImage(IMG.boom, 0, 0);
    // v3.1: 动臂油缸 c1 不绘制 — 定稿正面构图本无此件 (3/4 视角藏于臂后)

    setM(mMul(rootM, fk.mBody));                                         // 车身(悬挂 bob + squash)
    ctx.drawImage(IMG.body, 0, 0);
    drawBlink(ACT.blinkAmt(t));                                          // 眼部盖片在车身变换内

    // 铲斗铰销钉垫片 (stick 铲斗孔 r23 与 bucket 铰孔下层无盖, 防透底穿帮)
    setM(rootM);                                                         // ← 必须在装配空间画 (c1 删除后一度遗留 mBoom 变换致垫片飞天)
    ctx.beginPath(); ctx.arc(fk.hingeW[0], fk.hingeW[1], 26, 0, Math.PI * 2); ctx.fillStyle = NAVY; ctx.fill();
    ctx.beginPath(); ctx.arc(fk.hingeW[0], fk.hingeW[1], 10, 0, Math.PI * 2); ctx.fillStyle = '#2E9BE8'; ctx.fill();

    setM(mMul(rootM, fk.mStick));                                        // 斗杆
    ctx.drawImage(IMG.stick, 0, 0);
    setM(rootM); drawCylinder(fk.c2a, fk.c2b, L0.c2);                    // 斗杆油缸(蒙在斗杆上)

    setM(mMul(rootM, fk.mBucket));                                       // 铲斗
    ctx.drawImage(IMG.bucket, 0, 0);

    if (DEBUG) {                                                         // FK 标记: 地面线/铰点/齿尖/斗底
      setM(rootM);
      ctx.strokeStyle = 'rgba(255,0,0,.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-600, LAYOUT.ground_y); ctx.lineTo(2000, LAYOUT.ground_y); ctx.stroke();
      for (const [p, c] of [[fk.rootW, '#f0f'], [fk.elbowW, '#f0f'], [fk.hingeW, '#f0f'],
                            [fk.teethW, '#0f0'], [fk.bellyW, '#ff0'], [fk.c1a, '#0ff'], [fk.c1b, '#0ff'],
                            [fk.c2a, '#f80'], [fk.c2b, '#f80']]) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 12, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return { fk, rootM, pose };   // 样片取铲斗世界坐标挂礼物等
  }

  async function boot() {
    const names = Object.keys(PARTS);
    const imgs = await Promise.all(names.map(loadImg));
    names.forEach((n, i) => { IMG[n] = imgs[i]; });
    const n0 = FK.assemble(FK.NEUTRAL);
    L0 = {
      c1: Math.hypot(n0.c1b[0] - n0.c1a[0], n0.c1b[1] - n0.c1a[1]),
      c2: Math.hypot(n0.c2b[0] - n0.c2a[0], n0.c2b[1] - n0.c2a[1]),
    };
    GIFT_ROT0 = Math.atan2(n0.mBucket[1], n0.mBucket[0]);   // 中性斗姿态旋转基准 (礼物相对它随斗转)
    window.renderAt = (t, type, q) => { renderFrame(t); return out.toDataURL(type || 'image/jpeg', q ?? 0.94); };
    window.renderSheet = (ts, cols, w) => {
      const rows = Math.ceil(ts.length / cols), h = Math.round(w * 9 / 16);
      const sheet = document.createElement('canvas');
      sheet.width = cols * w; sheet.height = rows * h;
      const c2 = sheet.getContext('2d');
      const ms = [];
      ts.forEach((t, i) => {
        const s0 = performance.now();
        renderFrame(t);
        c2.drawImage(out, (i % cols) * w, ((i / cols) | 0) * h, w, h);
        c2.fillStyle = 'rgba(0,0,0,.55)'; c2.fillRect((i % cols) * w, ((i / cols) | 0) * h, 92, 26);
        c2.fillStyle = '#fff'; c2.font = '18px sans-serif';
        c2.fillText(`t=${t}`, (i % cols) * w + 6, ((i / cols) | 0) * h + 19);
        ms.push(Math.round(performance.now() - s0));
      });
      return { url: sheet.toDataURL('image/jpeg', 0.9), ms };
    };
    renderFrame(0);
    console.log('[v10] ready action=' + ACTION + ' mirror=' + MIRROR + ' L0 c1=' + L0.c1.toFixed(0) + ' c2=' + L0.c2.toFixed(0));
    if (!window.V10_SAMPLE) window.ready = true;   // 样片模式: ready 由 sample.js 接管后置位 (防 render.mjs 抢跑)
    // 导出可复用核心 (样片时间轴驱动用; 行为契约与 renderAt 一致)
    globalThis.V10Core = {
      IMG, L0: () => L0, FK, ACT,
      renderFrame, drawBackground, drawCylinder, drawBlink,
      CHAR_X, CHAR_Y, S, W, H, GROUND_SCR,
      giftRot0: () => GIFT_ROT0,
    };
  }
  boot().catch(e => console.error('[v10] boot failed ' + (e && e.stack || e)));
})();
