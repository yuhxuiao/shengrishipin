// test_fx.js — V12 特效与转场自动化测试与展示面板
(function () {
  'use strict';

  const W = 1920;
  const H = 1080;
  const NAVY = '#0B2F6E';

  let canvas = null;
  let ctx = null;

  // 离屏转场对比画布 A 与 B (高对比度图案)
  let canvasA = null, ctxA = null;
  let canvasB = null, ctxB = null;

  function initTestCanvases() {
    canvasA = document.createElement('canvas');
    canvasA.width = W; canvasA.height = H;
    ctxA = canvasA.getContext('2d');

    // 画布 A: 明媚阳光草地与花园栅栏 (暖绿 + 天蓝)
    ctxA.fillStyle = '#81D4FA';
    ctxA.fillRect(0, 0, W, H);
    // 太阳
    ctxA.fillStyle = '#FFD54F';
    ctxA.beginPath(); ctxA.arc(280, 220, 110, 0, Math.PI * 2); ctxA.fill();
    ctxA.lineWidth = 10; ctxA.strokeStyle = NAVY; ctxA.stroke();
    // 草地
    ctxA.fillStyle = '#8BC34A';
    ctxA.fillRect(0, 600, W, 480);
    // 栅栏
    ctxA.fillStyle = '#FFFFFF';
    ctxA.strokeStyle = NAVY;
    ctxA.lineWidth = 6;
    for (let x = 60; x < W; x += 120) {
      ctxA.beginPath();
      ctxA.rect(x, 480, 80, 400);
      ctxA.fill(); ctxA.stroke();
    }
    // 醒目标识
    ctxA.font = 'bold 96px "ZCOOL KuaiLe", sans-serif';
    ctxA.fillStyle = NAVY;
    ctxA.textAlign = 'center';
    ctxA.fillText('镜头 A · 阳光花园', W / 2, 380);

    canvasB = document.createElement('canvas');
    canvasB.width = W; canvasB.height = H;
    ctxB = canvasB.getContext('2d');

    // 画布 B: 室内欢庆派对场景 (艳粉 + 亮紫斜条纹)
    ctxB.fillStyle = '#7E57C2';
    ctxB.fillRect(0, 0, W, H);
    // 派对斜纹
    ctxB.fillStyle = '#FF4081';
    for (let i = -W; i < W * 2; i += 180) {
      ctxB.beginPath();
      ctxB.moveTo(i, 0); ctxB.lineTo(i + 90, 0);
      ctxB.lineTo(i + 90 - 400, H); ctxB.lineTo(i - 400, H);
      ctxB.closePath(); ctxB.fill();
    }
    // 气球束装饰
    ctxB.fillStyle = '#FFEB3B';
    ctxB.beginPath(); ctxB.arc(1500, 320, 140, 0, Math.PI * 2); ctxB.fill();
    ctxB.lineWidth = 10; ctxB.strokeStyle = NAVY; ctxB.stroke();
    // 醒目标识
    ctxB.font = 'bold 96px "ZCOOL KuaiLe", sans-serif';
    ctxB.fillStyle = '#FFFDE7';
    ctxB.textAlign = 'center';
    ctxB.lineWidth = 14;
    ctxB.strokeStyle = NAVY;
    ctxB.strokeText('镜头 B · 欢庆派对', W / 2, 540);
    ctxB.fillText('镜头 B · 欢庆派对', W / 2, 540);
  }

  // ==================== 1. 特效全矩阵 (t = 0) ====================
  function renderFxGrid(targetCtx) {
    targetCtx.fillStyle = '#0F172A';
    targetCtx.fillRect(0, 0, W, H);

    // 标题条
    targetCtx.fillStyle = '#1E293B';
    targetCtx.fillRect(0, 0, W, 70);
    targetCtx.font = 'bold 32px "ZCOOL KuaiLe", sans-serif';
    targetCtx.fillStyle = '#F8FAFC';
    targetCtx.textAlign = 'left';
    targetCtx.fillText('V12 特效库全矩阵验证 (每种特效包含 u=0.2 / u=0.5 / u=0.8 三阶段纯函数渲染)', 40, 46);

    const fxItems = [
      { name: 'land_dust (落地尘团)', type: 'land_dust', params: { scale: 0.8, dir: 0 } },
      { name: 'drive_dust (行驶拖尾)', type: 'drive_dust', params: { scale: 0.8, dir: 1, count: 4 } },
      { name: 'speed_lines (速度线)', type: 'speed_lines', params: { w: 220, h: 100, len: 120, count: 10 } },
      { name: 'smear (动作拖影弧)', type: 'smear', params: { r: 42, width: 22, startAngle: -0.7, endAngle: 1.1 } },
      { name: 'impact_burst (冲击爆发)', type: 'impact_burst', params: { r: 52, flash: false, spikeCount: 8 } },
      { name: 'emote: ! (情绪叹号)', type: 'emote', params: { kind: '!', scale: 0.9 } },
      { name: 'emote: ♥ (情绪爱心)', type: 'emote', params: { kind: '♥', scale: 0.9 } },
      { name: 'sparkle_trail (闪光拖尾)', type: 'sparkle_trail', params: { radius: 40, count: 10 } },
      { name: 'music_notes (音符飘散)', type: 'music_notes', params: { count: 4, spreadX: 70, spreadY: 60 } },
      { name: 'heart_pop (爱心泡泡)', type: 'heart_pop', params: { scale: 0.85 } },
      { name: 'dirt_chunks (土块飞溅)', type: 'dirt_chunks', params: { count: 5, dir: -1, power: 0.6 } },
      { name: 'ground_crack (地面裂纹)', type: 'ground_crack', params: { length: 65, branchCount: 4, glow: true } },
      { name: 'shine_ring (圆环光波)', type: 'shine_ring', params: { maxR: 50, lineWidth: 6 } },
      { name: 'confetti_burst (定点彩纸)', type: 'confetti_burst', params: { count: 20, radius: 55 } },
    ];

    const uSteps = [0.2, 0.5, 0.8];
    // 布局: 7 行 x 2 组 (每组 3 列 u)
    const rows = 7;
    const cols = 6;
    const startX = 40;
    const startY = 85;
    const cellW = (W - 80) / cols;
    const cellH = (H - 100) / rows;

    for (let idx = 0; idx < fxItems.length; idx++) {
      const item = fxItems[idx];
      const colGroup = Math.floor(idx / rows); // 0 或 1
      const row = idx % rows;

      for (let sIdx = 0; sIdx < uSteps.length; sIdx++) {
        const u = uSteps[sIdx];
        const col = colGroup * 3 + sIdx;
        const x = startX + col * cellW;
        const y = startY + row * cellH;

        // 格子底色
        targetCtx.save();
        targetCtx.fillStyle = '#1E293B';
        targetCtx.strokeStyle = '#334155';
        targetCtx.lineWidth = 2;
        targetCtx.beginPath();
        targetCtx.roundRect(x + 4, y + 4, cellW - 8, cellH - 8, 8);
        targetCtx.fill();
        targetCtx.stroke();

        // 网格标尺
        targetCtx.font = '14px sans-serif';
        targetCtx.fillStyle = '#94A3B8';
        targetCtx.textAlign = 'left';
        targetCtx.fillText(`${item.name}`, x + 12, y + 24);
        targetCtx.fillStyle = '#38BDF8';
        targetCtx.textAlign = 'right';
        targetCtx.fillText(`u=${u.toFixed(1)}`, x + cellW - 14, y + 24);

        // 剪裁并在中心绘制特效
        targetCtx.beginPath();
        targetCtx.roundRect(x + 6, y + 30, cellW - 12, cellH - 36, 6);
        targetCtx.clip();

        // 柔和暗色展示底图
        targetCtx.fillStyle = '#0F172A';
        targetCtx.fillRect(x + 6, y + 30, cellW - 12, cellH - 36);

        // 特效绘制中心
        const fxCx = x + cellW / 2;
        const fxCy = y + cellH / 2 + 10;

        const fn = globalThis.V12Fx && globalThis.V12Fx.registry && globalThis.V12Fx.registry[item.type];
        if (typeof fn === 'function') {
          const p = Object.assign({}, item.params, { x: fxCx, y: fxCy });
          fn(targetCtx, u, p, 10.0 + u);
        }

        targetCtx.restore();
      }
    }
  }

  // ==================== 2. 转场全矩阵 (t = 1) ====================
  function renderTransitionsGrid(targetCtx) {
    targetCtx.fillStyle = '#0F172A';
    targetCtx.fillRect(0, 0, W, H);

    targetCtx.fillStyle = '#1E293B';
    targetCtx.fillRect(0, 0, W, 70);
    targetCtx.font = 'bold 32px "ZCOOL KuaiLe", sans-serif';
    targetCtx.fillStyle = '#F8FAFC';
    targetCtx.textAlign = 'left';
    targetCtx.fillText('V12 镜头离屏转场合成矩阵 (A: 阳光花园 vs B: 欢庆派对 · u=0.25 / 0.50 / 0.75)', 40, 46);

    const transList = [
      { name: 'iris (经典卡通收放)', type: 'iris', params: { cx: 960, cy: 540 } },
      { name: 'star_wipe (五角星展开)', type: 'star_wipe', params: { cx: 960, cy: 540 } },
      { name: 'balloon_wipe (气球群擦除)', type: 'balloon_wipe', params: { dir: 'left' } },
      { name: 'push (新镜实体推入)', type: 'push', params: { dir: 'left' } },
      { name: 'zoom_blur (放射推进)', type: 'zoom_blur', params: { cx: 960, cy: 540 } },
      { name: 'dissolve (交叉叠化)', type: 'dissolve', params: {} },
      { name: 'whip (高速甩镜)', type: 'whip', params: { dir: 'left' } },
      { name: 'wipe (线性方向擦除)', type: 'wipe', params: { dir: 'right' } },
    ];

    const uSteps = [0.25, 0.50, 0.75];
    const rows = 4;
    const cols = 6;
    const startX = 40;
    const startY = 85;
    const cellW = (W - 80) / cols;
    const cellH = (H - 100) / rows;

    // 单个面板专用缩放离屏画布
    const offPanel = document.createElement('canvas');
    offPanel.width = W; offPanel.height = H;
    const offCtx = offPanel.getContext('2d');

    for (let idx = 0; idx < transList.length; idx++) {
      const item = transList[idx];
      const colGroup = Math.floor(idx / rows);
      const row = idx % rows;

      for (let sIdx = 0; sIdx < uSteps.length; sIdx++) {
        const u = uSteps[sIdx];
        const col = colGroup * 3 + sIdx;
        const x = startX + col * cellW;
        const y = startY + row * cellH;

        // 在 1920x1080 离屏画布中执行合成
        offCtx.setTransform(1, 0, 0, 1, 0, 0);
        offCtx.clearRect(0, 0, W, H);
        globalThis.V12Transitions.apply(item.type, offCtx, canvasA, canvasB, u, item.params);

        // 缩放绘制到目标单元格
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.roundRect(x + 4, y + 4, cellW - 8, cellH - 8, 8);
        targetCtx.clip();

        targetCtx.drawImage(offPanel, x + 4, y + 4, cellW - 8, cellH - 8);

        // 边框
        targetCtx.strokeStyle = '#38BDF8';
        targetCtx.lineWidth = 2.5;
        targetCtx.stroke();

        // 标签底条
        targetCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        targetCtx.fillRect(x + 4, y + cellH - 34, cellW - 8, 30);
        targetCtx.font = 'bold 15px "ZCOOL KuaiLe", sans-serif';
        targetCtx.fillStyle = '#FFFFFF';
        targetCtx.textAlign = 'left';
        targetCtx.fillText(item.name, x + 12, y + cellH - 14);
        targetCtx.fillStyle = '#FFE082';
        targetCtx.textAlign = 'right';
        targetCtx.fillText(`u=${u.toFixed(2)}`, x + cellW - 14, y + cellH - 14);

        targetCtx.restore();
      }
    }
  }

  // ==================== 3. 片头片尾动画大标题展示 (t = 2) ====================
  function renderTitlesShowcase(targetCtx) {
    targetCtx.fillStyle = '#0B2F6E';
    targetCtx.fillRect(0, 0, W, H);

    // 标题条
    targetCtx.fillStyle = '#071E4A';
    targetCtx.fillRect(0, 0, W, 70);
    targetCtx.font = 'bold 32px "ZCOOL KuaiLe", sans-serif';
    targetCtx.fillStyle = '#F8FAFC';
    targetCtx.textAlign = 'left';
    targetCtx.fillText('V12 片头片尾大标题系统演示 (S01 蓝天卡通 Logo 弹跳 + S34 庆生大字卡与 Heart Iris)', 40, 46);

    // 上半区: 片头标题在 lt = 1.8s (完整展开、小星星闪烁、呼吸微波)
    const upperW = W - 80, upperH = 460;
    targetCtx.save();
    targetCtx.translate(40, 85);
    targetCtx.beginPath();
    targetCtx.roundRect(0, 0, upperW, upperH, 16);
    targetCtx.clip();

    // 绘制蓝天与草地底图
    targetCtx.fillStyle = '#7CCBFB';
    targetCtx.fillRect(0, 0, upperW, upperH);
    targetCtx.fillStyle = '#A9CC6B';
    targetCtx.fillRect(0, upperH - 110, upperW, 110);

    // 绘制 S01 片头
    const opDef = { text: '开开的生日大冒险', sub: '蓝天下的两周岁特别企划', at: 0.0, dur: 4.2, style: 'opening' };
    targetCtx.save();
    targetCtx.scale(0.85, 0.85);
    targetCtx.translate(160, 40);
    globalThis.V12Titles.drawOpeningTitle(targetCtx, opDef, 1.8, 4.2, 1.8);
    targetCtx.restore();

    targetCtx.strokeStyle = '#38BDF8';
    targetCtx.lineWidth = 4;
    targetCtx.stroke();
    targetCtx.restore();

    // 下半区: 片尾字卡在 lt = 4.8s (Heart Iris 爱心遮罩缓缓收拢至中心)
    const lowerW = W - 80, lowerH = 480;
    targetCtx.save();
    targetCtx.translate(40, 565);
    targetCtx.beginPath();
    targetCtx.roundRect(0, 0, lowerW, lowerH, 16);
    targetCtx.clip();

    // 绘制派对底图
    targetCtx.fillStyle = '#4FC3F7';
    targetCtx.fillRect(0, 0, lowerW, lowerH);
    targetCtx.fillStyle = '#81C784';
    targetCtx.fillRect(0, lowerH - 120, lowerW, 120);

    // 绘制 S34 片尾大字卡
    const endDef = { text: '开开 2 岁生日快乐！', sub: '愿你每天都像挖土机一样充满活力！', at: 0.0, dur: 5.5, style: 'ending' };
    targetCtx.save();
    targetCtx.scale(0.85, 0.85);
    targetCtx.translate(160, 20);
    globalThis.V12Titles.drawEndingTitle(targetCtx, endDef, 2.5, 5.5, 2.5);
    targetCtx.restore();

    targetCtx.strokeStyle = '#FFD54F';
    targetCtx.lineWidth = 4;
    targetCtx.stroke();
    targetCtx.restore();
  }

  // ==================== 统一渲染入口 ====================
  function renderAt(t, mime = 'image/jpeg', q = 0.95) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const intT = Math.round(t);
    if (intT === 0) {
      renderFxGrid(ctx);
    } else if (intT === 1) {
      renderTransitionsGrid(ctx);
    } else {
      renderTitlesShowcase(ctx);
    }

    return canvas.toDataURL(mime, q);
  }

  async function boot() {
    canvas = document.getElementById('out');
    ctx = canvas.getContext('2d');
    initTestCanvases();

    if (document.fonts) {
      await document.fonts.ready;
    }

    window.renderAt = renderAt;
    window.ready = true;
    console.log('[test_fx] ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
