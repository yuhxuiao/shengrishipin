// test_poses.js — V12 角色动画师自测页面渲染驱动
// 渲染网格: 28 个姿态库、灵动表情系统、物理次级弹簧派对帽、分件无缝修补、挖挖 9 套新动作
(function (root) {
  'use strict';

  const W = 1920, H = 1080;
  const TAU = Math.PI * 2;
  const DEG2RAD = Math.PI / 180;

  const Pup = root.V12Pup;
  const PupFace = root.V12PupFace;
  const Actions = root.V12Actions;
  const FK = root.V10FK;
  const Face = root.V12Face;

  let canvas, ctx;
  const IMG = {};
  const PUP_DATA = { bluey: null, bingo: null };

  const ALL_POSES = [
    'stand', 'point', 'clap', 'hop', 'land', 'laugh', 'cover_mouth',
    'run', 'lunge', 'hug_bone', 'cheer', 'whisper', 'blow', 'dance',
    'wave', 'jump_cheer', 'spin', 'peek', 'tiptoe', 'sit', 'shy',
    'think', 'bow', 'hug', 'clap_overhead', 'look_up', 'crouch_anticipate', 'dance2'
  ];

  const WAWA_NEW_ACTIONS = [
    'drive_in', 'drive_out', 'turn_look', 'bounce_happy',
    'peek', 'proud', 'shy', 'sneeze_or_shake', 'present'
  ];

  const EXPRS = ['happy', 'laugh', 'surprise', 'talk', 'shy', 'sad'];

  function loadImg(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('img load failed: ' + src));
      im.src = src;
    });
  }

  // 绘制挖挖单体
  function drawWawaSolo(ctx, actName, t, cx, cy, scale = 0.30) {
    const fn = Actions[actName] || Actions.idle;
    const pose = fn(t);
    const fk = FK.assemble(pose);

    ctx.save();
    ctx.translate(cx, cy);

    // 绘制标签
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(actName, 0, 36);

    // 阴影
    ctx.save();
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.ellipse(0, 0, 480, 38, 0, 0, TAU);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();

    // 变换原点至车底中心
    ctx.translate(-991, -1156);

    const setM = m => {
      ctx.setTransform(scale, 0, 0, scale, cx - 991 * scale, cy - 1156 * scale);
      ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    };

    // 履带
    ctx.save();
    ctx.translate(FK.LAYOUT.track_tl[0], FK.LAYOUT.track_tl[1]);
    ctx.drawImage(IMG.track, 0, 0);
    ctx.restore();

    // 大臂
    setM(fk.mBoom);
    ctx.drawImage(IMG.boom, 0, 0);

    // 车身
    setM(fk.mBody);
    ctx.drawImage(IMG.body, 0, 0);
    // 表情
    Face.draw(ctx, 'happy', [0, 0], 0, t);

    // 斗杆
    setM(fk.mStick);
    ctx.drawImage(IMG.stick, 0, 0);

    // 铲斗
    setM(fk.mBucket);
    ctx.drawImage(IMG.bucket, 0, 0);

    ctx.restore();
    ctx.restore();
  }

  // 模式 1: 全景综合总览 (Bluey 核心姿势 + Bingo 表情 + 挖挖 9 套新动作)
  function renderOverview(t) {
    ctx.fillStyle = '#141E2E';
    ctx.fillRect(0, 0, W, H);

    // 标题
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`V12 角色动画全景检视面板 (t = ${t.toFixed(2)}s) — 帽子贴头 / 无缝衔接 / 灵动表情 / 挖挖新动作`, 40, 48);

    // 区域 A: 布鲁伊新姿势精选 (上排 7 个, 带贴头派对帽)
    const featuredBluey = ['wave', 'jump_cheer', 'spin', 'peek', 'tiptoe', 'sit', 'dance2'];
    for (let i = 0; i < featuredBluey.length; i++) {
      const pName = featuredBluey[i];
      const px = 140 + i * 260;
      const py = 330;
      Pup.draw(ctx, PUP_DATA.bluey, {
        x: px, footY: py, h: 250, pose: pName, facing: 1, hat: { visible: true }, expr: 'happy'
      }, t);

      ctx.fillStyle = '#9BD8FC';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Bluey: ${pName}`, px, py + 30);
    }

    // 区域 B: 宾果表情系列 (中排 6 个不同表情与视线)
    for (let i = 0; i < EXPRS.length; i++) {
      const exprName = EXPRS[i];
      const px = 150 + i * 300;
      const py = 660;
      const gazeX = (i % 2 === 0) ? 0.8 : -0.8;
      const gazeY = (i % 3 === 0) ? -0.5 : 0.3;
      Pup.draw(ctx, PUP_DATA.bingo, {
        x: px, footY: py, h: 230, pose: 'stand', facing: 1, hat: { visible: true },
        expr: exprName, look: [gazeX, gazeY]
      }, t);

      ctx.fillStyle = '#FCE2AE';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Bingo: [${exprName}] look:[${gazeX},${gazeY}]`, px, py + 30);
    }

    // 区域 C: 挖挖 9 大新动作 (下排 9 个)
    for (let i = 0; i < WAWA_NEW_ACTIONS.length; i++) {
      const act = WAWA_NEW_ACTIONS[i];
      const wx = 120 + i * 210;
      const wy = 980;
      drawWawaSolo(ctx, act, t, wx, wy, 0.17);
    }
  }

  // 模式 2: 布鲁伊 28 个姿势全量网格 (7列 x 4行)
  function renderAllBlueyPoses(t) {
    ctx.fillStyle = '#0F1724';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`布鲁伊 28 套动作库全量网格 (t = ${t.toFixed(2)}s) — 贴头派对帽 + 弹簧阻尼微摆`, 40, 45);

    const cols = 7;
    for (let i = 0; i < ALL_POSES.length; i++) {
      const pName = ALL_POSES[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = 135 + col * 270;
      const py = 260 + row * 250;

      Pup.draw(ctx, PUP_DATA.bluey, {
        x: px, footY: py, h: 190, pose: pName, facing: 1, hat: { visible: true }, expr: 'happy'
      }, t);

      ctx.fillStyle = '#A0D2F4';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}. ${pName}`, px, py + 24);
    }
  }

  // 模式 3: 挖挖 9 套新动作与五官特写
  function renderWawaNewActionsDetail(t) {
    ctx.fillStyle = '#161D2B';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`挖挖 9 套新动作物理可信高精检视 (t = ${t.toFixed(2)}s) — 铲斗不穿地 / 悬挂弹性 / 预备与过冲`, 40, 50);

    const cols = 5;
    for (let i = 0; i < WAWA_NEW_ACTIONS.length; i++) {
      const act = WAWA_NEW_ACTIONS[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const wx = 200 + col * 380;
      const wy = 420 + row * 450;
      drawWawaSolo(ctx, act, t, wx, wy, 0.32);
    }
  }

  // 主渲染路由
  function renderFrame(t) {
    // 按 t 智能切换呈现视图:
    // t == 0: 综合全景检视 (Bluey + Bingo + Wawa 9 actions)
    // t == 0.5: 布鲁伊 28 姿势完整矩阵
    // t == 1.0: 挖挖 9 新动作大尺寸细节
    // 其他 t: 综合全景动态演示
    if (Math.abs(t - 0.5) < 0.001) {
      renderAllBlueyPoses(t);
    } else if (Math.abs(t - 1.0) < 0.001) {
      renderWawaNewActionsDetail(t);
    } else {
      renderOverview(t);
    }
  }

  async function boot() {
    canvas = document.getElementById('out');
    ctx = canvas.getContext('2d');

    // 1. 加载挖挖板件图片
    const wawaParts = ['body', 'boom', 'stick', 'bucket', 'track'];
    await Promise.all(
      wawaParts.map(async p => {
        IMG[p] = await loadImg(`../assets/images/v10/parts/${p}.png`);
      })
    );
    IMG.party_hat = await loadImg('../assets/images/v10/parts/party_hat.png');
    IMG.bone = await loadImg('../assets/images/v10/parts/bone.png');

    // 2. 配角数据初始化 (V13: 彻底废弃旧 PNG 切片，使用 100% 纯矢量路径重绘)
    for (const name of ['bluey', 'bingo']) {
      const rig = (root.V12PupRigs && root.V12PupRigs[name]) || null;
      PUP_DATA[name] = { name, imgs: { hat: IMG.party_hat, bone: IMG.bone }, rig };
    }

    window.renderAt = (t, type, q) => {
      renderFrame(t);
      return canvas.toDataURL(type || 'image/jpeg', q ?? 0.94);
    };

    renderFrame(0);
    console.log('[v12_pose_test] ready. 28 poses, 9 wawa actions.');
    window.ready = true;
  }

  boot().catch(err => {
    console.error('[v12_pose_test] boot error:', err);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
