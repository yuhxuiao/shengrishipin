// scenery.js — V12 电影级布鲁伊风多场景分层系统 (高精扁平矢量程序化渲染)
// 包含 6 大精细地点:
// 1. yard: 院子 (布鲁伊木屋一角、白色木栅栏、系绳气球束、迎风彩旗、空中飞鸟)
// 2. garden: 花园 (立体花架围墙、多样化有机花丛、优雅双飞彩蝶、飘浮蒲公英、摇曳花茎)
// 3. sandbox: 沙坑 (全立体木质沙箱、多层透视厚度木框、金黄起伏沙丘、沙粒纹理、小桶小铲、转角木坐板、彩虹风车)
// 4. tree: 大树下 (参天橡树挺拔主干与生动木纹、繁茂层叠呼吸树冠、随风飘落橡树叶、地面斑驳晃动树荫光斑)
// 5. golden: 金色时刻 (夕阳丁达尔神圣金光柱、漂浮金色光尘微粒、金草波浪起伏、晚霞缓移)
// 6. party: 派对桌 (彩球拱门微颤、立体双层彩旗、波浪贝壳边垂褶桌布、桌上礼盘礼花)
//
// 纯函数规范: 严禁跨帧全局状态，所有动画与粒子纯粹由时间 t 解析重放
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const NAVY = '#0B2F6E';

  // 确定性伪随机数生成器 (纯函数，基于位置/种子产生恒定属性)
  function pseudoRnd(i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // ==========================================
  // 1. 天空视差层 (Sky, depth = 0.05)
  // ==========================================
  function drawSky(ctx, loc, t) {
    ctx.save();
    const isGolden = loc === 'golden';
    const isParty = loc === 'party';

    // 天空渐变底色
    const grad = ctx.createLinearGradient(0, -250, 0, 860);
    if (isGolden) {
      grad.addColorStop(0, '#FFA726');
      grad.addColorStop(0.25, '#FFCC80');
      grad.addColorStop(0.55, '#FFE082');
      grad.addColorStop(0.85, '#FFF3E0');
      grad.addColorStop(1, '#B3E5FC');
    } else if (isParty) {
      grad.addColorStop(0, '#3FA2F6');
      grad.addColorStop(0.50, '#90CAF9');
      grad.addColorStop(0.80, '#E1F5FE');
      grad.addColorStop(1, '#FFF9C4');
    } else {
      // 标准布鲁伊晴朗蔚蓝天空
      grad.addColorStop(0, '#29B6F6');
      grad.addColorStop(0.45, '#4FC3F7');
      grad.addColorStop(0.75, '#B3E5FC');
      grad.addColorStop(1, '#E1F5FE');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(-2200, -500, 8400, 1600);

    // 第一层：高空慢速半透明薄云 (高空空气透视)
    const highClouds = [
      { x: 100, y: 70, s: 0.85, spd: 4.5 },
      { x: 1400, y: 55, s: 0.75, spd: 5.2 },
      { x: 2700, y: 80, s: 0.90, spd: 4.8 },
      { x: 4000, y: 65, s: 0.80, spd: 5.0 },
    ];
    for (const hc of highClouds) {
      const cx = ((hc.x + t * hc.spd) % 5400) - 600;
      drawCloud(ctx, cx, hc.y, hc.s, isGolden, 0.55);
    }

    // 第二层：中空经典布鲁伊双色圆润朵云
    const midClouds = [
      { x: 350, y: 150, s: 1.25, spd: 9.5 },
      { x: 1250, y: 120, s: 1.45, spd: 12.0 },
      { x: 2250, y: 175, s: 1.10, spd: 10.0 },
      { x: 3350, y: 135, s: 1.35, spd: 11.5 },
      { x: 4450, y: 160, s: 1.20, spd: 10.5 },
    ];
    for (const c of midClouds) {
      const cx = ((c.x + t * c.spd) % 5400) - 600;
      drawCloud(ctx, cx, c.y, c.s, isGolden, 0.95);
    }

    // 环境活物：白天偶发飞鸟 (yard, garden, sandbox, tree)
    if (loc === 'yard' || loc === 'garden' || loc === 'sandbox' || loc === 'tree') {
      drawSkyBirds(ctx, t);
    }

    ctx.restore();
  }

  // 绘制单朵布鲁伊风格立体厚白云
  function drawCloud(ctx, x, y, s, isGolden, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha !== undefined ? alpha : 1.0;

    // 云朵底影 (微带天空互补色或晚霞暖色)
    ctx.fillStyle = isGolden ? 'rgba(255, 224, 178, 0.85)' : 'rgba(195, 225, 255, 0.80)';
    ctx.beginPath();
    ctx.arc(0, 10, 48, 0, TAU);
    ctx.arc(42, -8, 38, 0, TAU);
    ctx.arc(88, 10, 44, 0, TAU);
    ctx.arc(46, 22, 42, 0, TAU);
    ctx.fill();

    // 云朵亮面 (纯净厚白)
    ctx.fillStyle = isGolden ? 'rgba(255, 253, 240, 0.98)' : 'rgba(255, 255, 255, 0.98)';
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, TAU);
    ctx.arc(42, -18, 38, 0, TAU);
    ctx.arc(88, 0, 44, 0, TAU);
    ctx.arc(46, 12, 42, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  // 天空偶发悠然飞鸟 (纯函数，每 24s 一个飞行周期)
  function drawSkyBirds(ctx, t) {
    const cycle = 24.0;
    const lt = t % cycle;
    if (lt > 16.0) return; // 剩余 8s 静谧留白

    const u = lt / 16.0;
    const bx = -200 + u * 2400; // 从左至右掠过天际
    const by = 130 + Math.sin(u * Math.PI * 3) * 45;

    ctx.save();
    ctx.translate(bx, by);

    // 拍翅角度 (7Hz 扑翼振荡)
    const flap = Math.sin(t * 14.0);
    const wingY = -flap * 12;

    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 左翼
    ctx.beginPath();
    ctx.moveTo(-16, wingY);
    ctx.quadraticCurveTo(-8, -4, 0, 2);
    // 右翼
    ctx.quadraticCurveTo(8, -4, 16, wingY);
    ctx.stroke();

    // 鸟身微弧
    ctx.beginPath();
    ctx.arc(0, 3, 2.5, 0, TAU);
    ctx.fillStyle = NAVY;
    ctx.fill();

    ctx.restore();
  }

  // ==========================================
  // 2. 远景视差层 (Far, depth = 0.20)
  // ==========================================
  function drawFar(ctx, loc, t) {
    ctx.save();
    const isGolden = loc === 'golden';
    const isTree = loc === 'tree';

    // 1. 第一层远山 (柔和浅青绿 / 沐浴夕阳金色空气透视)
    ctx.fillStyle = isGolden ? '#CDE5A3' : (isTree ? '#98CA82' : '#A9DCAB');
    ctx.beginPath();
    ctx.moveTo(-1200, 800);
    for (let x = -1200; x < 5400; x += 400) {
      const my = 675 + Math.sin(x * 0.0028) * 55;
      ctx.quadraticCurveTo(x + 200, my, x + 400, 715);
    }
    ctx.lineTo(5400, 1100);
    ctx.lineTo(-1200, 1100);
    ctx.fill();

    // 2. 第二层起伏丘陵 (中明度饱满草丘)
    ctx.fillStyle = isGolden ? '#B5DC85' : (isTree ? '#82BD6D' : '#88CD8B');
    ctx.beginPath();
    ctx.moveTo(-1200, 820);
    for (let x = -1200; x < 5400; x += 500) {
      const cy = 730 + Math.cos(x * 0.0022) * 45;
      ctx.quadraticCurveTo(x + 250, cy, x + 500, 760);
    }
    ctx.lineTo(5400, 1100);
    ctx.lineTo(-1200, 1100);
    ctx.fill();

    // 3. 远方大片饱满圆弧重叠的卡通卷云树冠 (对齐布鲁伊原片 frame_01, frame_35 核心标志)
    const canBackCol = isGolden ? '#94BD42' : (isTree ? '#468435' : '#68B84B');
    const canFrontCol = isGolden ? '#B2D858' : (isTree ? '#5CA048' : '#88D466');
    const canHighCol = isGolden ? '#CEE878' : (isTree ? '#76BA60' : '#A8E888');
    const canOutline = isGolden ? 'rgba(75, 105, 20, 0.70)' : (isTree ? 'rgba(30, 75, 25, 0.75)' : 'rgba(11, 47, 110, 0.65)');
    const canTickCol = isGolden ? 'rgba(65, 95, 15, 0.55)' : (isTree ? 'rgba(25, 65, 20, 0.55)' : 'rgba(35, 95, 30, 0.50)');

    // 3.1 远景后层大卷云树冠 (高耸饱满，探入天空高处 y: 440~580)
    ctx.fillStyle = canBackCol;
    ctx.strokeStyle = canOutline;
    ctx.lineWidth = 4;
    for (let x = -400; x < 5200; x += 190) {
      const seed = Math.sin(x * 0.013) * 1000;
      const rnd1 = (seed - Math.floor(seed));
      const cy = 620 + Math.sin(x * 0.0035) * 35;
      const rCenter = 120 + rnd1 * 40;
      const rLeft = 95 + rnd1 * 30;
      const rRight = 100 + (1 - rnd1) * 35;

      ctx.beginPath();
      ctx.arc(x - 55, cy + 15, rLeft, Math.PI * 0.85, 0);
      ctx.arc(x, cy - 25, rCenter, Math.PI * 0.9, TAU * 0.05);
      ctx.arc(x + 65, cy + 10, rRight, Math.PI, TAU * 0.12);
      ctx.fill();
      ctx.stroke();
    }

    // 3.2 远景前层明亮卷云树冠 (中高层饱满圆弧重叠)
    for (let x = -320; x < 5100; x += 150) {
      const seed = Math.cos(x * 0.017) * 1000;
      const rnd2 = (seed - Math.floor(seed));
      const cy = 675 + Math.cos(x * 0.004) * 25;
      const rMain = 105 + rnd2 * 35;
      const rSubL = 80 + rnd2 * 25;
      const rSubR = 85 + (1 - rnd2) * 25;

      // 前层主树冠
      ctx.fillStyle = canFrontCol;
      ctx.strokeStyle = canOutline;
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.arc(x - 45, cy + 10, rSubL, Math.PI * 0.85, 0);
      ctx.arc(x, cy - 18, rMain, Math.PI * 0.9, TAU * 0.05);
      ctx.arc(x + 50, cy + 8, rSubR, Math.PI, TAU * 0.12);
      ctx.fill();
      ctx.stroke();

      // 树冠向阳顶面高光团 (明快阳光感)
      ctx.fillStyle = canHighCol;
      ctx.beginPath();
      ctx.arc(x - 6, cy - 35, rMain * 0.58, Math.PI * 0.85, TAU * 0.08);
      ctx.fill();

      // 表面精细卡通弧线微纹理 (参考帧 01 与 35 标志性叶簇双弧与微卷)
      ctx.strokeStyle = canTickCol;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';

      // 左侧弧线簇
      ctx.beginPath();
      ctx.arc(x - 22, cy - 10, 16, Math.PI * 0.8, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 12, cy - 4, 11, Math.PI * 0.75, Math.PI * 1.7);
      ctx.stroke();

      // 右侧弧线簇
      ctx.beginPath();
      ctx.arc(x + 28, cy - 18, 18, Math.PI * 0.85, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 36, cy - 12, 12, Math.PI * 0.8, Math.PI * 1.75);
      ctx.stroke();

      // 澳大利亚蓝花楹与九重葛散落微小 4 瓣点花 (布鲁伊原片经典微细节)
      if (rnd2 > 0.45) {
        const flowerCol = isGolden ? '#FFF8E1' : (rnd2 > 0.72 ? '#AEA8DB' : '#FF6B8B');
        ctx.fillStyle = flowerCol;
        const fx = x + (rnd2 - 0.5) * 50;
        const fy = cy - 25 - rnd2 * 20;
        for (let p = 0; p < 4; p++) {
          const pa = (p / 4) * TAU + Math.PI / 4;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(pa) * 4, fy + Math.sin(pa) * 4, 2.6, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.5, 0, TAU);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ==========================================
  // 3. 中景视差层 (Mid, depth = 0.55)
  // ==========================================
  function drawMid(ctx, loc, t) {
    ctx.save();

    // 彩旗串 (yard, garden, party, golden)
    if (loc === 'yard' || loc === 'party' || loc === 'golden') {
      drawBunting(ctx, loc, t);
    }

    if (loc === 'yard') {
      // 左侧布鲁伊风格温暖木屋一角
      drawHouseCorner(ctx, -150, 740, t);
      // 白色精致小木栅栏
      drawFence(ctx, 220, 3800, 760);
      // 系绳气球束 (两处栅栏桩)
      drawTiedBalloons(ctx, 420, 680, t, ['#FF7096', '#FFD54F', '#4DD0E1']);
      drawTiedBalloons(ctx, 1680, 660, t, ['#81C784', '#FFB74D', '#BA68C8']);
      // 偶尔落在栅栏上的好奇小鸟
      drawFenceBird(ctx, 890, 640, t);
    } else if (loc === 'garden') {
      // 花园木格栅围墙
      drawGardenFence(ctx, -200, 4200, 760);
      // 有机多样化花丛 (大小/颜色/间距错落，彻底杜绝重复感)
      drawFlowerBushes(ctx, -120, 4000, 775, t);
      // 翩跹飞舞的彩色双蝶 (活物 1)
      drawButterfly(ctx, 520 + Math.sin(t * 1.5) * 125, 580 + Math.cos(t * 2.0) * 55, t, '#FF9800');
      drawButterfly(ctx, 1380 + Math.cos(t * 1.8 + 1.5) * 135, 560 + Math.sin(t * 2.3) * 60, t, '#EC407A');
      // 随风飘拂的蒲公英绒毛种子微粒 (活物 2)
      drawDandelionFluff(ctx, t);
    } else if (loc === 'sandbox') {
      // 沙坑中景：后方公园绿篱与温暖木质篱笆
      drawParkHedge(ctx, -200, 4200, 760);
      // 活物 1: 彩虹旋转风车 (放置于左侧开阔处 x=240，微风驱动快速转动，清晰可见)
      drawPinwheel(ctx, 240, 670, t);
      // 活物 2: 落在右侧木篱顶端的小山雀 (x=1660，清晰不被车身遮挡)
      drawFenceBird(ctx, 1660, 650, t + 4.0);
      // 活物 3: 随风轻拂的空中草籽花絮
      drawDandelionFluff(ctx, t + 10.0);
    } else if (loc === 'tree') {
      // 参天大橡树主干与树冠
      drawBigTree(ctx, 880, 780, t);
      // 活物 1: 随风飘落翻滚的橡树叶 (4-6片落叶)
      drawFallingLeaves(ctx, t);
      // 活物 2: 停在树干枝头张望的小山雀
      drawTreeBird(ctx, 1060, 450, t);
    } else if (loc === 'golden') {
      // 梦幻丁达尔金光柱
      drawSunbeams(ctx, t);
      // 活物: 空中漂浮的金色光尘微粒
      drawGoldenDust(ctx, t);
    } else if (loc === 'party') {
      // 派对现场：多彩马卡龙气球大拱门
      drawPartyArch(ctx, 960, 660, t);
      // 活物: 悬挂轻晃的派对小纸灯笼/气球
      drawPartyHangingBalloons(ctx, t);
    }

    ctx.restore();
  }

  // ==========================================
  // 4. 主世界地面层 (Ground, depth = 1.00)
  // ==========================================
  function drawGround(ctx, loc, t) {
    ctx.save();
    const groundY = 850;
    const isGolden = loc === 'golden';
    const isSandbox = loc === 'sandbox';

    // 1. 地面草坪基底渐变 (明亮暖黄绿渐变，对齐布鲁伊官方原片色彩)
    const lawnGrad = ctx.createLinearGradient(0, groundY - 10, 0, 1100);
    if (isGolden) {
      lawnGrad.addColorStop(0, '#DCE862'); // 沐浴夕阳的金青色
      lawnGrad.addColorStop(0.35, '#C4D43D');
      lawnGrad.addColorStop(1, '#9DAE25');
    } else {
      lawnGrad.addColorStop(0, '#B8E076'); // 官方明亮暖黄绿
      lawnGrad.addColorStop(0.35, '#A8D56A');
      lawnGrad.addColorStop(1, '#7EBA45'); // 柔和饱满嫩草绿
    }
    ctx.fillStyle = lawnGrad;
    ctx.fillRect(-2200, groundY, 8400, 650);

    // 2. 地面起伏草坪轮廓 (柔和微波弧线，替代死板锯齿)
    ctx.fillStyle = isGolden ? 'rgba(175, 180, 43, 0.35)' : 'rgba(110, 175, 50, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-1000, groundY);
    for (let x = -1000; x < 5200; x += 120) {
      const dy = Math.sin(x * 0.015) * 4;
      ctx.quadraticCurveTo(x + 60, groundY + 6 + dy, x + 120, groundY);
    }
    ctx.lineTo(5200, groundY + 14);
    ctx.lineTo(-1000, groundY + 14);
    ctx.closePath();
    ctx.fill();

    // 3. 柔和深浅草地光斑块 (大块柔和椭圆，避免高频碎斑干扰接地影)
    ctx.save();
    const patchCols = isGolden
      ? ['rgba(255, 238, 88, 0.16)', 'rgba(158, 157, 36, 0.14)']
      : ['rgba(225, 248, 150, 0.18)', 'rgba(80, 140, 40, 0.10)'];

    for (let i = 0; i < 14; i++) {
      const px = -400 + i * 360 + (i % 3) * 60;
      const py = groundY + 50 + (i % 4) * 40;
      const rx = 140 + (i % 3) * 40;
      const ry = 28 + (i % 2) * 12;
      ctx.fillStyle = patchCols[i % 2];
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // 4. 地表散落圆润多边形浅棕与深褐色斑点 (落叶与小泥土斑，参考原片最核心生活感质感标志)
    drawGroundSpots(ctx, loc, groundY);

    // 5. 地表草叶微弧刻线与紫花四叶星光点缀
    drawGroundGrassTicks(ctx, loc, groundY);

    // 6. 地面平缓草线分隔 (深蓝描边)
    ctx.strokeStyle = 'rgba(11, 47, 110, 0.30)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-1000, groundY);
    ctx.lineTo(5200, groundY);
    ctx.stroke();

    // ========================================================
    // 沙坑场景专属：3D 立体木质沙坑 (全结构位于 depth=1.00，杜绝视差撕裂)
    // ========================================================
    if (isSandbox) {
      draw3DSandbox(ctx, t);
    }

    // 大树场景专属：地面斑驳晃动的树荫光斑 (活物)
    if (loc === 'tree') {
      drawTreeGroundShadow(ctx, groundY, t);
    }

    ctx.restore();
  }

  // 地表散落圆润多边形浅棕与深褐色斑点 (落叶与小泥土斑，确定性伪随机排布)
  function drawGroundSpots(ctx, loc, groundY) {
    ctx.save();
    const isSandbox = loc === 'sandbox';
    const isGolden = loc === 'golden';

    const darkColors = isGolden
      ? ['#68421A', '#7A4D1E', '#563512']
      : ['#52311E', '#5C3621', '#482A18'];
    const tanColors = isGolden
      ? ['#B27B2E', '#C48D3A', '#9B6822']
      : ['#9E633B', '#B27246', '#8D5632'];
    const oliveColor = isGolden ? '#8E9C28' : '#7A8C3E';

    // 56 个确定性地表落叶/泥斑
    for (let i = 0; i < 56; i++) {
      const seed = i * 17.31 + 4.9;
      const r1 = pseudoRnd(seed);
      const r2 = pseudoRnd(seed + 3.7);
      const r3 = pseudoRnd(seed + 7.1);
      const r4 = pseudoRnd(seed + 11.8);

      const px = -600 + i * 95 + (r1 - 0.5) * 80;
      const py = groundY + 16 + r2 * 170;

      // 沙坑场景避免落入沙坑中心内部
      if (isSandbox && px > 320 && px < 1680 && py < groundY + 110) {
        continue;
      }

      const w = 32 + r3 * 38; // 宽度 32 ~ 70px
      const h = 10 + r4 * 12; // 高度 10 ~ 22px
      const rot = (r1 - 0.5) * 0.35; // 倾角 -10° ~ +10°

      // 颜色分配：40% 深褐，45% 浅棕，15% 橄榄干叶
      let col;
      if (r4 < 0.40) {
        col = darkColors[Math.floor(r2 * darkColors.length) % darkColors.length];
      } else if (r4 < 0.85) {
        col = tanColors[Math.floor(r3 * tanColors.length) % tanColors.length];
      } else {
        col = oliveColor;
      }

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.fillStyle = col;

      // 绘制圆润平滑多边形/椭圆胶囊落叶轮廓
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, TAU);
      ctx.fill();

      // 部分斑点带有不对称微尖 (模拟桉树落叶尖端)
      if (r1 > 0.55) {
        ctx.beginPath();
        const tipX = (r2 > 0.5 ? 1 : -1) * (w * 0.5);
        ctx.moveTo(tipX * 0.7, -h * 0.35);
        ctx.quadraticCurveTo(tipX * 1.15, 0, tipX * 0.7, h * 0.35);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // 地表草叶微弧刻线与紫花四叶星光点缀 (对齐原片 frame_01, frame_35)
  function drawGroundGrassTicks(ctx, loc, groundY) {
    ctx.save();
    const isSandbox = loc === 'sandbox';
    const isGolden = loc === 'golden';

    // 1. 微小深绿草叶刻线 (小 "3" 弧或双弧)
    ctx.strokeStyle = isGolden ? 'rgba(110, 130, 25, 0.42)' : 'rgba(60, 115, 25, 0.42)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';

    for (let i = 0; i < 42; i++) {
      const seed = i * 29.13 + 8.2;
      const r1 = pseudoRnd(seed);
      const r2 = pseudoRnd(seed + 5.3);
      const tx = -550 + i * 130 + (r1 - 0.5) * 60;
      const ty = groundY + 18 + r2 * 160;

      if (isSandbox && tx > 320 && tx < 1680 && ty < groundY + 110) continue;

      ctx.save();
      ctx.translate(tx, ty);
      // 双圆弧小草丛
      ctx.beginPath();
      ctx.arc(-5, 0, 7, Math.PI * 0.8, TAU * 0.08, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(5, -1, 8, Math.PI * 0.9, TAU * 0.12, false);
      ctx.stroke();
      ctx.restore();
    }

    // 2. 原片标志性散落 4 瓣淡紫色小花/三叶星光 (参考帧 01 经典细节)
    for (let i = 0; i < 28; i++) {
      const seed = i * 41.7 + 13.5;
      const r1 = pseudoRnd(seed);
      const r2 = pseudoRnd(seed + 9.1);
      const fx = -500 + i * 190 + (r1 - 0.5) * 110;
      const fy = groundY + 22 + r2 * 150;

      if (isSandbox && fx > 320 && fx < 1680 && fy < groundY + 110) continue;

      ctx.save();
      ctx.translate(fx, fy);
      const fCol = isGolden ? '#FFF8E1' : '#AEA8DB';
      ctx.fillStyle = fCol;

      // 4 片十字花瓣
      for (let p = 0; p < 4; p++) {
        const pa = (p / 4) * TAU + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(Math.cos(pa) * 4.5, Math.sin(pa) * 4.5, 3.2, 0, TAU);
        ctx.fill();
      }
      // 花心白点
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 1.8, 0, TAU);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  // ==========================================
  // 5. 前景视差层 (Foreground, depth = 1.45)
  // ==========================================
  function drawForeground(ctx, loc, t) {
    ctx.save();
    // 彻底告别三角形锯齿草！重绘为布鲁伊经典高品质有机圆润草丛与花朵
    // 约束: 严格控制在画面底部 ≤12% (screenY ≥ 950)，中央字幕区 (x 650-1270) 下潜保持干净留白
    drawOrganicForeground(ctx, loc, t);
    ctx.restore();
  }

  // =========================================================================
  // 重绘有机前景草丛与花朵 (Organic Foreground, 彻底消除廉价锯齿)
  // =========================================================================
  function drawOrganicForeground(ctx, loc, t) {
    const isGarden = loc === 'garden';
    const isParty = loc === 'party';
    const isGolden = loc === 'golden';

    const fgY = 1080;
    // 低频自然风动频率 (0.42Hz)
    const windPhase = t * (TAU * 0.42);

    // 1. 底层：深浓茂密草基剪影 (Deep Silhouette Base)
    ctx.fillStyle = isGolden ? '#4E6818' : '#2D5916';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-800, fgY);

    for (let x = -800; x <= 4200; x += 120) {
      // 中央字幕区域 (x: 600~1320) 高度控制在 35-50px (y ~1030-1045)
      // 边缘构图区域 (x < 500 或 x > 1400) 适度抬高至 80-105px (y ~975-1000) 自然框景
      const distFromCenter = Math.abs(x - 960);
      const centerFactor = Math.min(1.0, distFromCenter / 520);
      const baseH = 40 + centerFactor * 48;
      const sway = Math.sin(windPhase + x * 0.012) * 5;

      ctx.quadraticCurveTo(x + 50, fgY - baseH - 12 + sway, x + 120, fgY);
    }
    ctx.lineTo(4200, fgY);
    ctx.lineTo(-800, fgY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. 中层与表层：有机圆润叶片与错落草丛团 (Organic Tufts)
    // 使用确定性伪随机 PRNG 驱动非等距分布
    const bladeCols = isGolden
      ? ['#688F1E', '#8CA825', '#A4C428']
      : ['#3E7B1D', '#558B2F', '#7CB342'];

    const step = 85;
    for (let x = -750; x < 4150; x += step) {
      const seed = Math.floor(x / step) * 7.13;
      const rndVal = pseudoRnd(seed);
      const rndVal2 = pseudoRnd(seed + 11.3);

      const distFromCenter = Math.abs(x - 960);
      const centerFactor = Math.min(1.0, distFromCenter / 500);

      // 叶片高度：中央 ≤55px，边缘可达 100px
      const h = (35 + rndVal * 25) + centerFactor * (35 + rndVal2 * 20);
      const bladeW = 20 + rndVal * 16;
      const sway = Math.sin(windPhase + x * 0.015 + rndVal * 2.0) * (5 + rndVal * 4);

      // 绘制一丛 (3 片相互掩映的圆润叶片)
      const col = bladeCols[Math.floor(rndVal * 3) % 3];
      ctx.fillStyle = col;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.5;

      // 左偏叶
      ctx.beginPath();
      ctx.moveTo(x - bladeW * 0.5, fgY);
      ctx.quadraticCurveTo(x - bladeW * 0.7 + sway * 0.8, fgY - h * 0.6, x - bladeW * 0.4 + sway, fgY - h * 0.85);
      ctx.quadraticCurveTo(x - bladeW * 0.1 + sway * 0.7, fgY - h * 0.4, x, fgY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 主叶 (主峰，高而圆挺)
      ctx.beginPath();
      ctx.moveTo(x - bladeW * 0.3, fgY);
      ctx.quadraticCurveTo(x + sway * 0.5, fgY - h * 0.65, x + bladeW * 0.1 + sway, fgY - h);
      ctx.quadraticCurveTo(x + bladeW * 0.4 + sway * 0.6, fgY - h * 0.5, x + bladeW * 0.4, fgY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 右偏叶
      ctx.beginPath();
      ctx.moveTo(x, fgY);
      ctx.quadraticCurveTo(x + bladeW * 0.5 + sway * 0.7, fgY - h * 0.5, x + bladeW * 0.7 + sway, fgY - h * 0.75);
      ctx.quadraticCurveTo(x + bladeW * 0.6 + sway * 0.4, fgY - h * 0.3, x + bladeW * 0.6, fgY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. 点缀生动的非等距花朵 (只在非中央区偶发绽放，避开字幕正下方)
      const isCenter = distFromCenter < 380;
      if (!isCenter && rndVal > 0.52) {
        const flowerX = x + bladeW * 0.2 + sway;
        const flowerY = fgY - h * 0.95;
        const fType = Math.floor(rndVal2 * 4);
        drawOrganicFlower(ctx, flowerX, flowerY, fType, isGarden, isParty, isGolden);
      }
    }
  }

  // 绘制单朵生动绘本小野花 (雏菊/蒲公英/洋桔梗/小花苞)
  function drawOrganicFlower(ctx, fx, fy, type, isGarden, isParty, isGolden) {
    ctx.save();
    ctx.translate(fx, fy);

    let petalCol = '#FFFFFF';
    let centerCol = '#FFB300';

    if (isParty) {
      const cols = ['#FF4081', '#7C4DFF', '#00E676', '#FFD600'];
      petalCol = cols[type % cols.length];
      centerCol = '#FFFFFF';
    } else if (isGarden) {
      const cols = ['#FF80AB', '#FFEB3B', '#B388FF', '#FFFFFF'];
      petalCol = cols[type % cols.length];
      centerCol = '#FF6F00';
    } else if (isGolden) {
      petalCol = type % 2 === 0 ? '#FFF9C4' : '#FFE082';
      centerCol = '#E65100';
    }

    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3;

    if (type === 0 || type === 1) {
      // 5 瓣圆润小雏菊
      ctx.fillStyle = petalCol;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(pa) * 11, Math.sin(pa) * 11, 7.5, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      // 花心
      ctx.fillStyle = centerCol;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else if (type === 2) {
      // 4 瓣十字花
      ctx.fillStyle = petalCol;
      for (let p = 0; p < 4; p++) {
        const pa = (p / 4) * TAU + Math.PI / 4;
        ctx.beginPath();
        ctx.ellipse(Math.cos(pa) * 9, Math.sin(pa) * 9, 8, 5, pa, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = centerCol;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else {
      // 圆润三叶草球花 / 浆果
      ctx.fillStyle = petalCol;
      ctx.beginPath();
      ctx.arc(-6, -4, 6.5, 0, TAU);
      ctx.arc(6, -4, 6.5, 0, TAU);
      ctx.arc(0, 5, 6.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // =========================================================================
  // 3D 立体木质沙坑系统 (重绘核心：全透视木框、立体沙丘、沙粒质感与散落沙具)
  // =========================================================================
  function draw3DSandbox(ctx, t) {
    ctx.save();
    // 沙坑区域: x 280 ~ 1720, 角色站立线脚底 y=880
    const x0 = 280, x1 = 1720;
    const backY = 840;      // 远端木框顶面
    const sandTopY = 852;   // 沙面远端边缘
    const frontRimTopY = 906; // 近端木框顶面 (厚度透视)
    const frontRimBotY = 930; // 近端木框正面顶线
    const frontFaceBotY = 968;// 近端木框正面底线

    // ----------------------------------------------------
    // 1. 远端木框 (后侧木围边，带顶面高光与内壁侧影)
    // ----------------------------------------------------
    // 远端木框顶面 (受光亮面)
    ctx.fillStyle = '#FB8C00';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(x0, backY, x1 - x0, 16, 6);
    ctx.fill();
    ctx.stroke();

    // 远端木框内壁投影 (投在沙面起始处的阴影)
    ctx.fillStyle = 'rgba(191, 54, 12, 0.45)';
    ctx.fillRect(x0 + 8, sandTopY, x1 - x0 - 16, 12);

    // 远端木板拼缝线与木栓
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3;
    for (let x = x0 + 260; x < x1 - 100; x += 280) {
      ctx.beginPath();
      ctx.moveTo(x, backY);
      ctx.lineTo(x, backY + 16);
      ctx.stroke();
      ctx.fillStyle = '#E65100';
      ctx.beginPath();
      ctx.arc(x - 14, backY + 8, 3.5, 0, TAU);
      ctx.arc(x + 14, backY + 8, 3.5, 0, TAU);
      ctx.fill();
    }

    // ----------------------------------------------------
    // 2. 转角木质三角形坐板 (Corner Seats, 布鲁伊标志性游乐场沙坑设施)
    // ----------------------------------------------------
    // 左后转角坐板
    ctx.fillStyle = '#FFA726';
    ctx.beginPath();
    ctx.moveTo(x0 - 12, backY - 2);
    ctx.lineTo(x0 + 130, backY - 2);
    ctx.lineTo(x0 - 12, backY + 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 右后转角坐板
    ctx.beginPath();
    ctx.moveTo(x1 + 12, backY - 2);
    ctx.lineTo(x1 - 130, backY - 2);
    ctx.lineTo(x1 + 12, backY + 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ----------------------------------------------------
    // 3. 沙坑金黄立体沙面 (Sand Bed, 深度 y: 852 ~ 915)
    // ----------------------------------------------------
    // 主沙面渐变 (上暗下亮，呈现斜度与深度)
    const sandGrad = ctx.createLinearGradient(0, sandTopY, 0, frontRimTopY);
    sandGrad.addColorStop(0, '#E5B853');   // 远端纵深背阴暖棕金
    sandGrad.addColorStop(0.35, '#F9D874'); // 角色站立线 (y=880) 金黄饱满
    sandGrad.addColorStop(1, '#FFE79A');   // 近端明亮高光
    ctx.fillStyle = sandGrad;
    ctx.beginPath();
    ctx.moveTo(x0 + 6, sandTopY);
    ctx.lineTo(x1 - 6, sandTopY);
    ctx.lineTo(x1 - 2, frontRimTopY);
    ctx.lineTo(x0 + 2, frontRimTopY);
    ctx.closePath();
    ctx.fill();

    // 立体起伏小沙丘 (Undulating Sand Mounds, 避免平铺)
    // 沙丘 1: 左侧挖掘区旁 (x: 580 ~ 780)
    ctx.fillStyle = '#ECC25D';
    ctx.beginPath();
    ctx.ellipse(680, 876, 95, 26, 0.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#FFF2A8';
    ctx.beginPath();
    ctx.ellipse(675, 870, 70, 16, 0.05, 0, TAU);
    ctx.fill();

    // 沙丘 2: 右侧小沙堆 (x: 1350 ~ 1520)
    ctx.fillStyle = '#ECC25D';
    ctx.beginPath();
    ctx.ellipse(1430, 882, 85, 22, -0.04, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#FFF2A8';
    ctx.beginPath();
    ctx.ellipse(1425, 878, 60, 13, -0.04, 0, TAU);
    ctx.fill();

    // 沙粒与微质感点 (确定性微粒子，增加逼真细腻质感，无随机抖动)
    ctx.fillStyle = 'rgba(196, 142, 38, 0.40)';
    for (let i = 0; i < 48; i++) {
      const sx = x0 + 40 + ((i * 31.7) % (x1 - x0 - 80));
      const sy = sandTopY + 10 + ((i * 19.3) % (frontRimTopY - sandTopY - 20));
      ctx.fillRect(sx, sy, 3, 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    for (let i = 0; i < 36; i++) {
      const sx = x0 + 60 + ((i * 47.1) % (x1 - x0 - 120));
      const sy = sandTopY + 15 + ((i * 23.5) % (frontRimTopY - sandTopY - 30));
      ctx.fillRect(sx, sy, 2.5, 2);
    }

    // ----------------------------------------------------
    // 4. 散落立体儿童沙具 (小红水桶、小黄铲、小海星沙模)
    // ----------------------------------------------------
    // 左侧：红色塑料小沙桶 (放置于左角坐板与沙交界处 x=325，完全避开布鲁伊 x=440 走动与脚部)
    drawBucketToy(ctx, 325, 874);

    // 插在沙堆里的小塑料铲 (x=560，位于布鲁伊与挖坑点之间的起伏沙丘上)
    drawShovelToy(ctx, 560, 868);

    // 右侧：青绿色小海星沙模 (放置于 x=1590)
    drawStarfishMold(ctx, 1590, 888);

    // ----------------------------------------------------
    // 5. 近端木框 (前侧木立边，透视顶面 + 正面垂直立板，质感厚重)
    // ----------------------------------------------------
    // 近端木框顶面 (宽平透视台面，微亮暖木色)
    ctx.fillStyle = '#FFA726';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.roundRect(x0 - 8, frontRimTopY, (x1 - x0) + 16, frontRimBotY - frontRimTopY, 6);
    ctx.fill();
    ctx.stroke();

    // 顶面木纹高光条与拼缝
    ctx.fillStyle = 'rgba(255, 243, 224, 0.45)';
    ctx.fillRect(x0 + 10, frontRimTopY + 3, (x1 - x0) - 20, 5);

    ctx.strokeStyle = 'rgba(11, 47, 110, 0.55)';
    ctx.lineWidth = 3.5;
    for (let x = x0 + 240; x < x1 - 80; x += 280) {
      ctx.beginPath();
      ctx.moveTo(x, frontRimTopY);
      ctx.lineTo(x, frontRimBotY);
      ctx.stroke();
    }

    // 近端木框正面立板 (垂直受光面，饱满深暖橘棕色)
    ctx.fillStyle = '#E65100';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(x0 - 8, frontRimBotY, (x1 - x0) + 16, frontFaceBotY - frontRimBotY, [0, 0, 8, 8]);
    ctx.fill();
    ctx.stroke();

    // 正面立板加固木桩与螺栓销钉
    for (let x = x0; x <= x1; x += 280) {
      ctx.fillStyle = '#BF360C';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 4;
      ctx.fillRect(x - 14, frontRimBotY, 28, frontFaceBotY - frontRimBotY);
      ctx.strokeRect(x - 14, frontRimBotY, 28, frontFaceBotY - frontRimBotY);

      // 金属加固圆钉帽
      ctx.fillStyle = '#FFE082';
      ctx.beginPath();
      ctx.arc(x, frontRimBotY + 12, 4.5, 0, TAU);
      ctx.arc(x, frontFaceBotY - 12, 4.5, 0, TAU);
      ctx.fill();
    }

    // 前框在下方草坪上的厚重阴影
    ctx.fillStyle = 'rgba(46, 80, 20, 0.35)';
    ctx.beginPath();
    ctx.roundRect(x0 - 12, frontFaceBotY, (x1 - x0) + 24, 14, 7);
    ctx.fill();

    ctx.restore();
  }

  // 绘制立体儿童小水桶
  function drawBucketToy(ctx, bx, by) {
    ctx.save();
    ctx.translate(bx, by);

    // 桶身外轮廓
    ctx.fillStyle = '#E53935';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(-16, -42);
    ctx.lineTo(16, -42);
    ctx.lineTo(22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 桶口翻边
    ctx.fillStyle = '#EF5350';
    ctx.beginPath();
    ctx.ellipse(0, -42, 17, 6, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // 桶内溢出的金黄沙丘
    ctx.fillStyle = '#FFE082';
    ctx.beginPath();
    ctx.ellipse(0, -43, 13, 4.5, 0, 0, TAU);
    ctx.fill();

    // 亮黄金属手柄
    ctx.strokeStyle = '#FDD835';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -42, 16, Math.PI * 0.9, TAU * 0.55, true);
    ctx.stroke();

    ctx.restore();
  }

  // 绘制插在沙里的黄色玩具铲
  function drawShovelToy(ctx, sx, sy) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-0.35);

    // 手柄握把
    ctx.fillStyle = '#FDD835';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, -42, 9, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -42, 4, 0, TAU);
    ctx.fillStyle = '#E65100';
    ctx.fill();

    // 铲柄
    ctx.fillStyle = '#FDD835';
    ctx.fillRect(-4, -34, 8, 36);
    ctx.strokeRect(-4, -34, 8, 36);

    // 铲斗主体 (斜插在沙中)
    ctx.beginPath();
    ctx.roundRect(-14, 2, 28, 22, 4);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // 绘制小海星塑料模具
  function drawStarfishMold(ctx, mx, my) {
    ctx.save();
    ctx.translate(mx, my);
    ctx.fillStyle = '#26C6DA';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * TAU - Math.PI / 2;
      const a2 = a1 + (Math.PI / 5);
      const rOuter = 16;
      const rInner = 8;
      if (i === 0) ctx.moveTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
      else ctx.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
      ctx.lineTo(Math.cos(a2) * rInner, Math.sin(a2) * rInner);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#80DEEA';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // 具体构件细节与动态环境活物
  // =========================================================================

  // 经典彩旗串 (自适应微风波浪翻滚)
  function drawBunting(ctx, loc, t) {
    ctx.save();
    const wireY = 160;
    const colors = ['#FF5252', '#FFD740', '#448AFF', '#69F0AE', '#FF6E40', '#E040FB', '#40C4FF'];

    ctx.strokeStyle = 'rgba(11, 47, 110, 0.45)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-600, wireY);
    for (let x = -600; x < 4400; x += 320) {
      const dy = Math.sin(x * 0.008 + t * 2.2) * 6;
      ctx.quadraticCurveTo(x + 160, wireY + 44 + dy, x + 320, wireY);
    }
    ctx.stroke();

    let cIdx = 0;
    for (let x = -520; x < 4200; x += 115) {
      const sag = Math.sin((x + 600) * (Math.PI / 320)) * 44;
      const fy = wireY + sag;
      const sway = Math.sin(t * 3.4 + x * 0.035) * 8.5;

      ctx.fillStyle = colors[cIdx % colors.length];
      ctx.beginPath();
      ctx.moveTo(x, fy);
      ctx.lineTo(x + 72, fy);
      ctx.lineTo(x + 36 + sway, fy + 78);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3;
      ctx.stroke();
      cIdx++;
    }
    ctx.restore();
  }

  // 院子木屋一角 (带有风动阳台小花)
  function drawHouseCorner(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);

    // 房屋外墙米黄色护墙板
    ctx.fillStyle = '#FFE0B2';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.fillRect(0, -380, 280, 380);
    ctx.strokeRect(0, -380, 280, 380);

    // 木板横条纹
    ctx.strokeStyle = 'rgba(11, 47, 110, 0.25)';
    ctx.lineWidth = 3;
    for (let py = -340; py < 0; py += 40) {
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(280, py);
      ctx.stroke();
    }

    // 橘色坡屋顶挑檐
    ctx.fillStyle = '#FF7043';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-20, -380);
    ctx.lineTo(310, -380);
    ctx.lineTo(280, -420);
    ctx.lineTo(-50, -420);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 可爱的小窗户与窗台花盒
    ctx.fillStyle = '#E1F5FE';
    ctx.fillRect(80, -280, 120, 130);
    ctx.strokeRect(80, -280, 120, 130);
    ctx.beginPath();
    ctx.moveTo(140, -280); ctx.lineTo(140, -150);
    ctx.moveTo(80, -215); ctx.lineTo(200, -215);
    ctx.stroke();

    // 窗台红色花盒
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(65, -150, 150, 28);
    ctx.strokeRect(65, -150, 150, 28);

    // 花盒里轻微摇曳的粉色花朵
    const flowerSway = Math.sin(t * 2.8) * 3;
    ctx.fillStyle = '#FF4081';
    for (let fx = 80; fx <= 190; fx += 30) {
      ctx.beginPath();
      ctx.arc(fx + flowerSway, -158, 12, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // 浅米白/浅奶油色的圆柱形木质庭院白栏杆与走廊台阶 (Queenslander 走廊与庭院栏杆，对齐原片 frame_01, frame_35)
  function drawVerandahBalustrade(ctx, x0, x1, y, withDeck) {
    ctx.save();

    // 1. 栏杆后方：翠绿卷云灌木丛 (透出栏杆上方与缝隙)
    ctx.fillStyle = '#6DA838';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    for (let x = x0 - 30; x < x1 + 60; x += 110) {
      ctx.beginPath();
      ctx.arc(x + 45, y - 95, 48, Math.PI, 0);
      ctx.arc(x + 85, y - 110, 56, Math.PI, 0);
      ctx.arc(x + 125, y - 95, 46, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 卷云微纹理与偶发紫花
      ctx.strokeStyle = '#4A7A22';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x + 85, y - 130, 14, 0.2, Math.PI * 0.9);
      ctx.stroke();
    }

    // 2. 走廊台阶与木质地台 (Timber Verandah Deck & Steps)
    if (withDeck) {
      // 台阶踏面 (Deck Planks, 温暖红褐色澳大利亚木地板)
      ctx.fillStyle = '#CF865B';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 4.5;
      ctx.fillRect(x0 - 40, y - 16, x1 - x0 + 80, 22);
      ctx.strokeRect(x0 - 40, y - 16, x1 - x0 + 80, 22);

      // 台阶立板 (Step Riser, 背阴面深暖木色)
      ctx.fillStyle = '#B46C42';
      ctx.fillRect(x0 - 40, y + 6, x1 - x0 + 80, 24);
      ctx.strokeRect(x0 - 40, y + 6, x1 - x0 + 80, 24);

      // 台阶边缘高光线条
      ctx.strokeStyle = '#EAA882';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0 - 38, y - 14);
      ctx.lineTo(x1 + 38, y - 14);
      ctx.stroke();

      // 木板拼缝线
      ctx.strokeStyle = 'rgba(11, 47, 110, 0.35)';
      ctx.lineWidth = 2.5;
      for (let px = x0 + 40; px < x1; px += 180) {
        ctx.beginPath();
        ctx.moveTo(px, y - 16); ctx.lineTo(px, y + 30);
        ctx.stroke();
      }
    }

    // 3. 栏杆下横梁 (Bottom Rail, 浅米白色)
    const bRailY = y - (withDeck ? 28 : 22);
    ctx.fillStyle = '#F5F2E6';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    ctx.fillRect(x0 - 30, bRailY - 14, x1 - x0 + 60, 16);
    ctx.strokeRect(x0 - 30, bRailY - 14, x1 - x0 + 60, 16);

    // 4. 栏杆立柱群 (Balusters, 圆柱形木质白栏杆，具有立体高光与柔和阴影)
    const tRailY = y - 118;
    const postSpacing = 52;

    for (let x = x0 + 10; x < x1 - 10; x += postSpacing) {
      const pw = 20;
      const ph = bRailY - 14 - tRailY;

      // 立柱主体 (浅米白/浅奶油色 #FAF8F0)
      ctx.fillStyle = '#FAF8F0';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(x - pw * 0.5, tRailY, pw, ph, 4);
      ctx.fill();
      ctx.stroke();

      // 立柱右侧柔和圆柱立体明暗阴影 (#E5E0D0)
      ctx.fillStyle = '#E5E0D0';
      ctx.beginPath();
      ctx.roundRect(x + 1, tRailY + 2, pw * 0.5 - 2, ph - 4, [0, 3, 3, 0]);
      ctx.fill();

      // 立柱左侧纯白阳光反光条 (#FFFFFF)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - pw * 0.5 + 2, tRailY + 3, 3.5, ph - 6);
    }

    // 5. 栏杆主立柱 (Newel Posts, 每隔一段一座粗壮主立柱与圆润木帽)
    for (let x = x0 - 15; x <= x1 + 20; x += 360) {
      const nw = 34;
      const ny0 = tRailY - 18;
      const nh = bRailY - ny0;

      ctx.fillStyle = '#FAF7EE';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.roundRect(x - nw * 0.5, ny0, nw, nh, 6);
      ctx.fill();
      ctx.stroke();

      // 主柱立体阴影
      ctx.fillStyle = '#E2DDD0';
      ctx.fillRect(x, ny0 + 4, nw * 0.5 - 2, nh - 8);

      // 主柱顶部装饰圆帽 / 截顶方帽 (Finial Cap)
      ctx.fillStyle = '#FAF7EE';
      ctx.beginPath();
      ctx.roundRect(x - nw * 0.6, ny0 - 12, nw * 1.2, 12, 4);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, ny0 - 14, 7, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    // 6. 栏杆上横梁 (Top Handrail, 宽厚圆润木扶手)
    ctx.fillStyle = '#FAF8F0';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(x0 - 45, tRailY - 20, x1 - x0 + 90, 22, 6);
    ctx.fill();
    ctx.stroke();

    // 扶手下边缘深色立体投影线
    ctx.fillStyle = '#D6D0BE';
    ctx.fillRect(x0 - 43, tRailY - 3, x1 - x0 + 86, 5);

    ctx.restore();
  }

  // 院子木栅栏 (向后兼容，指向新圆柱形木质庭院白栏杆)
  function drawFence(ctx, x0, x1, y) {
    drawVerandahBalustrade(ctx, x0, x1, y, true);
  }

  // 落在栅栏上的机灵小鸟 (活物，偶发眨眼翘尾)
  function drawFenceBird(ctx, bx, by, t) {
    ctx.save();
    ctx.translate(bx, by);

    // 小鸟低频呼吸与微晃
    const tailWiggle = Math.sin(t * 3.5) * 0.18;
    const bodyBob = Math.sin(t * 1.8) * 2;

    // 尾羽
    ctx.save();
    ctx.translate(-14, bodyBob);
    ctx.rotate(tailWiggle);
    ctx.fillStyle = '#1E88E5';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-20, -6);
    ctx.lineTo(-18, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 身体 (鲜亮蓝山雀)
    ctx.fillStyle = '#42A5F5';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, bodyBob, 16, 12, -0.15, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // 暖黄腹部
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.ellipse(4, bodyBob + 4, 10, 7, -0.1, 0, TAU);
    ctx.fill();

    // 头部
    ctx.fillStyle = '#1E88E5';
    ctx.beginPath();
    ctx.arc(10, bodyBob - 9, 9, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // 眼睛
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.arc(13, bodyBob - 10, 2.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(14, bodyBob - 11, 1, 0, TAU);
    ctx.fill();

    // 嫩黄小尖喙
    ctx.fillStyle = '#FFA000';
    ctx.beginPath();
    ctx.moveTo(18, bodyBob - 10);
    ctx.lineTo(26, bodyBob - 8);
    ctx.lineTo(18, bodyBob - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // 花园木格栅围墙 (指向新走廊白栏杆与台阶)
  function drawGardenFence(ctx, x0, x1, y) {
    drawVerandahBalustrade(ctx, x0, x1, y, true);
  }

  // 多样化有机花园花丛 (彻底消除相同圆弧与重复感)
  function drawFlowerBushes(ctx, x0, x1, y, t) {
    ctx.save();
    const bushColors = ['#8BC34A', '#7CB342', '#689F38', '#9CCC65'];
    const flowerColors = ['#FF5252', '#FF4081', '#FFEB3B', '#7C4DFF', '#FF7043', '#00E676', '#FFFFFF'];

    let currX = x0;
    let bIdx = 0;

    while (currX < x1) {
      const seed = bIdx * 13.7;
      const rnd = pseudoRnd(seed);
      const rnd2 = pseudoRnd(seed + 5.1);

      // 非固定间距与多样化尺寸
      const bw = 170 + rnd * 80;
      const bh = 75 + rnd2 * 45;
      const bCol = bushColors[bIdx % bushColors.length];

      // 灌木绿丛本体 (有机三叶拱)
      ctx.fillStyle = bCol;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(currX + bw * 0.25, y, bh * 0.75, Math.PI, 0);
      ctx.arc(currX + bw * 0.55, y - bh * 0.25, bh * 0.95, Math.PI, 0);
      ctx.arc(currX + bw * 0.85, y, bh * 0.70, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 各色生动花朵 (大小、数量、颜色随 seed 变化)
      const flowerCount = 3 + Math.floor(rnd * 4);
      for (let f = 0; f < flowerCount; f++) {
        const fSeed = seed + f * 3.3;
        const frnd = pseudoRnd(fSeed);
        const fx = currX + 25 + f * ((bw - 50) / flowerCount) + frnd * 10;
        const fy = y - 40 - (f % 2) * (bh * 0.45) + Math.sin(t * 1.5 + f) * 3;
        const fSize = 11 + pseudoRnd(fSeed + 1.2) * 6;
        const fCol = flowerColors[(bIdx + f) % flowerColors.length];

        // 花瓣
        ctx.fillStyle = fCol;
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx, fy, fSize, 0, TAU);
        ctx.fill();
        ctx.stroke();

        // 花心
        ctx.fillStyle = '#FFFDE7';
        ctx.beginPath();
        ctx.arc(fx, fy, fSize * 0.38, 0, TAU);
        ctx.fill();
      }

      currX += bw - 25; // 自然紧密叠合
      bIdx++;
    }

    ctx.restore();
  }

  // 飞舞的彩蝶 (优雅振翅与 3D 侧飞角度)
  function drawButterfly(ctx, x, y, t, color) {
    ctx.save();
    ctx.translate(x, y);

    // 拍翅频率 16Hz
    const flap = Math.sin(t * 16.0) * 0.82;
    ctx.scale(flap, 1);

    ctx.fillStyle = color;
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3;

    // 上翅
    ctx.beginPath();
    ctx.ellipse(14, -10, 16, 12, 0.4, 0, TAU);
    ctx.ellipse(-14, -10, 16, 12, -0.4, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // 翅斑高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(14, -10, 5, 0, TAU);
    ctx.arc(-14, -10, 5, 0, TAU);
    ctx.fill();

    // 下翅
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(10, 7, 11, 8, -0.3, 0, TAU);
    ctx.ellipse(-10, 7, 11, 8, 0.3, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // 细长蝶身与触角
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 13, 0, 0, TAU);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(6, -20);
    ctx.moveTo(0, -12); ctx.lineTo(-6, -20);
    ctx.stroke();

    ctx.restore();
  }

  // 随风飘扬的蒲公英花絮 (纯函数粒子)
  function drawDandelionFluff(ctx, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.strokeStyle = 'rgba(11, 47, 110, 0.30)';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 8; i++) {
      const speed = 40 + (i % 3) * 15;
      const x = ((i * 260 + t * speed) % 2400) - 200;
      const y = 520 + Math.sin(t * 1.8 + i * 2.1) * 35 + (i % 4) * 45;

      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // 小绒毛放射丝
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * 9, Math.sin(ang) * 9);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // 公园绿篱与木栏杆背景 (沙坑中景，升级为圆润卷云式绿篱与奶油白护栏)
  function drawParkHedge(ctx, x0, x1, y) {
    ctx.save();

    // 1. 底层深绿卷云绿篱
    ctx.fillStyle = '#5B982E';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4.5;
    for (let x = x0; x < x1; x += 150) {
      ctx.beginPath();
      ctx.arc(x + 50, y - 55, 68, Math.PI, 0);
      ctx.arc(x + 110, y - 75, 82, Math.PI, 0);
      ctx.arc(x + 165, y - 55, 62, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 2. 表层亮绿卷云团与卡通弧线微纹理
    ctx.fillStyle = '#7EBE44';
    for (let x = x0 + 20; x < x1; x += 150) {
      ctx.beginPath();
      ctx.arc(x + 55, y - 50, 52, Math.PI, 0);
      ctx.arc(x + 105, y - 68, 65, Math.PI, 0);
      ctx.arc(x + 150, y - 50, 48, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 叶片双弧线微纹理
      ctx.strokeStyle = '#43761E';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(x + 105, y - 82, 13, 0.2, Math.PI * 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 60, y - 62, 11, 0.3, Math.PI * 0.90);
      ctx.stroke();
    }

    // 3. 奶油白木栅栏横梁与立柱 (Clean Queenslander Park Fence)
    ctx.fillStyle = '#FAF7EE';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    ctx.fillRect(x0, y - 48, x1 - x0, 16);
    ctx.strokeRect(x0, y - 48, x1 - x0, 16);

    for (let x = x0 + 40; x < x1; x += 140) {
      ctx.fillStyle = '#FAF7EE';
      ctx.fillRect(x - 8, y - 64, 16, 64);
      ctx.strokeRect(x - 8, y - 64, 16, 64);
      // 柱头圆角木帽
      ctx.beginPath();
      ctx.arc(x, y - 64, 7, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // 彩虹旋转风车 (微风驱动，充满童趣与动感)
  function drawPinwheel(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);

    // 白色固定支杆
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    ctx.fillStyle = '#ECEFF1';
    ctx.fillRect(-5, 0, 10, 120);
    ctx.strokeRect(-5, 0, 10, 120);

    // 风车叶片旋转中心
    const spin = (t * 4.5) % TAU;
    ctx.save();
    ctx.rotate(spin);

    const bladeCols = ['#FF5252', '#FFD740', '#448AFF', '#69F0AE', '#FF6E40', '#E040FB'];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = bladeCols[i];
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(18, -12, 38, -6);
      ctx.quadraticCurveTo(24, 14, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 中心销钉
    ctx.fillStyle = '#FFE082';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // 参天大树 (重构为大片饱满圆弧重叠的卡通卷云树冠，表面带有精细的卡通弧线微纹理)
  function drawBigTree(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);

    // 1. 粗壮主干与有机根部 (澳大利亚桉树/橡树造型)
    ctx.fillStyle = '#7A543E';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-160, 0); // 左侧根系展开
    ctx.quadraticCurveTo(-110, -180, -90, -320);
    ctx.quadraticCurveTo(-140, -440, -220, -560); // 左侧粗枝
    ctx.lineTo(-130, -565);
    ctx.quadraticCurveTo(-60, -460, 0, -420);
    ctx.quadraticCurveTo(60, -470, 190, -560); // 右侧粗枝
    ctx.lineTo(250, -545);
    ctx.quadraticCurveTo(120, -420, 95, -310);
    ctx.quadraticCurveTo(110, -170, 160, 0); // 右侧根系展开
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 树干木纹深色纵线与温暖高光面
    ctx.fillStyle = '#8E644B'; // 受光面浅暖木色
    ctx.beginPath();
    ctx.moveTo(-20, -50); ctx.quadraticCurveTo(20, -240, 25, -420);
    ctx.lineTo(60, -420); ctx.quadraticCurveTo(65, -230, 45, -50);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#5A3824';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-60, -40); ctx.quadraticCurveTo(-40, -250, -85, -460);
    ctx.moveTo(30, -35); ctx.quadraticCurveTo(25, -230, 45, -440);
    ctx.stroke();

    // 树洞/树瘤 (双色立体卡通造型)
    ctx.fillStyle = '#5A3824';
    ctx.beginPath();
    ctx.ellipse(-15, -230, 16, 26, 0.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = '#3E2414';
    ctx.beginPath();
    ctx.ellipse(-13, -228, 10, 18, 0.15, 0, TAU);
    ctx.fill();

    // 2. 繁茂层叠的卷云式大树冠 (3 层深浅递进，饱满圆弧重叠)
    const swayBack = Math.sin(t * 1.1) * 7;
    const swayMid = Math.sin(t * 1.3 + 0.6) * 9;
    const swayTop = Math.sin(t * 1.5 + 1.2) * 11;

    // A. 底层背阴树冠 (Deep Canopy Shade, #3D7320)
    ctx.save();
    ctx.translate(swayBack, 0);
    ctx.fillStyle = '#3D7320';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 7.5;
    const backPuffs = [
      { x: -280, y: -620, r: 180 },
      { x: 260, y: -640, r: 190 },
      { x: -140, y: -740, r: 200 },
      { x: 130, y: -750, r: 210 },
      { x: 0, y: -820, r: 220 },
    ];
    for (const p of backPuffs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // B. 中层繁茂主树冠 (Rich Mid Foliage, #5CA02E)
    ctx.save();
    ctx.translate(swayMid, 0);
    ctx.fillStyle = '#5CA02E';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 7;
    const midPuffs = [
      { x: -220, y: -580, r: 165 },
      { x: 210, y: -590, r: 175 },
      { x: -110, y: -680, r: 185 },
      { x: 110, y: -690, r: 190 },
      { x: 0, y: -740, r: 205 },
    ];
    for (const p of midPuffs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // C. 表层高光卷云树冠 (Sunlit Cloud Canopy, #82C443 与顶层 #9FE054)
    ctx.save();
    ctx.translate(swayTop, 0);
    ctx.fillStyle = '#82C443';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6.5;
    const topPuffs = [
      { x: -140, y: -550, r: 140 },
      { x: 140, y: -560, r: 150 },
      { x: -70, y: -640, r: 160 },
      { x: 70, y: -645, r: 165 },
      { x: 0, y: -695, r: 175 },
    ];
    for (const p of topPuffs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // 向阳顶面高光弧团 (#9FE054)
      ctx.fillStyle = '#9FE054';
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.r * 0.35, p.r * 0.65, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#82C443';
    }

    // 3. 树冠表面精细卡通弧线微纹理 (参考帧 01 经典双弧叶纹与花果点缀)
    ctx.strokeStyle = '#386A1A';
    ctx.lineWidth = 3.0;
    ctx.lineCap = 'round';

    const leafArcs = [
      { x: -160, y: -580, r: 16 },
      { x: -90, y: -630, r: 18 },
      { x: 60, y: -640, r: 17 },
      { x: 140, y: -590, r: 19 },
      { x: -20, y: -720, r: 18 },
      { x: 30, y: -700, r: 16 },
      { x: -190, y: -520, r: 15 },
      { x: 180, y: -530, r: 16 },
    ];
    for (const a of leafArcs) {
      ctx.beginPath();
      ctx.arc(a.x - 6, a.y, a.r, 0.2, Math.PI * 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(a.x + 8, a.y - 4, a.r * 0.85, 0.3, Math.PI * 0.90);
      ctx.stroke();
    }

    // 树冠点缀淡紫与金黄小星花
    const treeStars = [
      { x: -110, y: -590, col: '#AEA8DB' },
      { x: 80, y: -600, col: '#FFF59D' },
      { x: -30, y: -670, col: '#AEA8DB' },
      { x: 120, y: -540, col: '#AEA8DB' },
    ];
    for (const s of treeStars) {
      ctx.fillStyle = s.col;
      for (let p = 0; p < 4; p++) {
        const pa = (p / 4) * TAU;
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(pa) * 5, s.y + Math.sin(pa) * 5, 3.5, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  // 大树枝头小鸟
  function drawTreeBird(ctx, bx, by, t) {
    drawFenceBird(ctx, bx, by, t + 2.5);
  }

  // 随风飘落翻滚的橡树叶 (纯函数活物)
  function drawFallingLeaves(ctx, t) {
    ctx.save();
    const leafCols = ['#81C784', '#C5E1A5', '#FFD54F', '#FFA726'];

    for (let i = 0; i < 6; i++) {
      // 循环飘落周期 6.5s
      const cycle = 6.5;
      const lt = (t + i * 1.1) % cycle;
      const u = lt / cycle;

      // 树冠落至地面
      const startX = 720 + (i * 70);
      const startY = 320;
      const endY = 880;

      const ly = startY + u * (endY - startY);
      const lx = startX + Math.sin(u * Math.PI * 4 + i) * 55;
      const rot = u * Math.PI * 6 + Math.sin(t * 3.0 + i);

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);

      ctx.fillStyle = leafCols[i % leafCols.length];
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 2.5;

      // 椭圆小橡树叶
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 7, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  // 地面斑驳晃动的树荫光斑 (随风起伏)
  function drawTreeGroundShadow(ctx, groundY, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(46, 80, 20, 0.24)';
    const sway = Math.sin(t * 1.4) * 22;

    ctx.beginPath();
    ctx.ellipse(880 + sway, groundY + 50, 500, 95, 0, 0, TAU);
    ctx.ellipse(620 + sway * 0.8, groundY + 62, 250, 75, 0, 0, TAU);
    ctx.ellipse(1180 + sway * 1.2, groundY + 58, 270, 80, 0, 0, TAU);
    ctx.fill();

    // 树荫中间透射的温暖碎光斑
    ctx.fillStyle = 'rgba(235, 255, 170, 0.22)';
    for (let i = 0; i < 6; i++) {
      const gx = 700 + i * 85 + Math.sin(t * 1.5 + i) * 12;
      const gy = groundY + 45 + (i % 2) * 20;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 35, 16, 0.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // 丁达尔神圣金光柱 (God Rays)
  function drawSunbeams(ctx, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 235, 140, 0.16)';
    for (let i = 0; i < 7; i++) {
      const angle = -0.6 + i * 0.2 + Math.sin(t * 0.5 + i * 1.2) * 0.04;
      ctx.beginPath();
      ctx.moveTo(960, -320);
      ctx.lineTo(960 + Math.tan(angle - 0.08) * 1450, 1100);
      ctx.lineTo(960 + Math.tan(angle + 0.08) * 1450, 1100);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 漂浮的金色光尘微粒 (纯函数活物)
  function drawGoldenDust(ctx, t) {
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const cycle = 7.0;
      const lt = (t + i * 0.45) % cycle;
      const u = lt / cycle;

      const px = 200 + ((i * 123) % 1520) + Math.sin(t * 1.6 + i) * 28;
      const py = 920 - u * 580;
      const alpha = Math.sin(u * Math.PI) * 0.75;
      const r = 4.0 + (i % 3) * 2.5;

      ctx.fillStyle = `rgba(255, 240, 160, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // 派对气球大拱门
  function drawPartyArch(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);

    // 拱门钢管骨架
    ctx.strokeStyle = 'rgba(11, 47, 110, 0.35)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 520, Math.PI, 0);
    ctx.stroke();

    // 拱门马卡龙多彩气球
    const archCols = ['#FF5252', '#FFD740', '#448AFF', '#69F0AE', '#FF6E40', '#E040FB', '#40C4FF'];
    for (let a = Math.PI; a <= TAU; a += 0.10) {
      const sway = Math.sin(t * 2.0 + a * 4) * 3;
      const bx = Math.cos(a) * (520 + sway);
      const by = Math.sin(a) * (520 + sway);
      const col = archCols[Math.floor((a - Math.PI) * 12) % archCols.length];

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(bx, by, 42, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 4;
      ctx.stroke();

      // 气球高光月牙
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(bx - 10, by - 12, 10, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // 派对悬挂轻晃气球束
  function drawPartyHangingBalloons(ctx, t) {
    drawTiedBalloons(ctx, 350, 680, t, ['#FF4081', '#FFD740', '#7C4DFF']);
    drawTiedBalloons(ctx, 1570, 680, t, ['#00E676', '#FF6E40', '#40C4FF']);
  }

  // 系在木桩上的气球束 (风动摆动)
  function drawTiedBalloons(ctx, x, y, t, colors) {
    ctx.save();
    ctx.translate(x, y);

    colors.forEach((col, i) => {
      const angle = (i - 1) * 0.30 + Math.sin(t * 2.2 + i * 1.5) * 0.09;
      const len = 150 + i * 22;
      const bx = Math.sin(angle) * len;
      const by = -Math.cos(angle) * len;

      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(bx * 0.4, by * 0.6, bx, by);
      ctx.stroke();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(bx, by, 32, 40, 0, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.beginPath();
      ctx.arc(bx - 8, by - 10, 8, 0, TAU);
      ctx.fill();
    });

    ctx.restore();
  }

  // 派对现场：精美长桌与垂褶波浪条纹桌布
  function drawPartyTable(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);

    // 1. 桌腿 (厚重深木色)
    ctx.fillStyle = '#6D4C41';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    ctx.fillRect(-w / 2 + 60, 0, 32, 110);
    ctx.strokeRect(-w / 2 + 60, 0, 32, 110);
    ctx.fillRect(w / 2 - 92, 0, 32, 110);
    ctx.strokeRect(w / 2 - 92, 0, 32, 110);

    // 2. 长桌台面 (厚实木质)
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(-w / 2, -18, w, 24);
    ctx.strokeRect(-w / 2, -18, w, 24);

    // 3. 华丽派对桌布主体 (天蓝底色 + 纯白竖条纹)
    ctx.fillStyle = '#64B5F6';
    ctx.fillRect(-w / 2 + 10, 6, w - 20, 80);

    ctx.fillStyle = '#E3F2FD';
    for (let tx = -w / 2 + 20; tx < w / 2 - 20; tx += 60) {
      ctx.fillRect(tx, 6, 30, 80);
    }
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    ctx.strokeRect(-w / 2 + 10, 6, w - 20, 80);

    // 4. 桌布底边垂褶波浪扇形边 (经典圆润贝壳花边)
    ctx.fillStyle = '#E3F2FD';
    for (let bx = -w / 2 + 10; bx < w / 2 - 10; bx += 40) {
      ctx.beginPath();
      ctx.arc(bx + 20, 86, 20, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // 5. 桌上的派对点缀彩盘
    ctx.fillStyle = '#FF8A80';
    ctx.beginPath();
    ctx.ellipse(-380, -20, 45, 12, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.ellipse(380, -20, 45, 12, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  const Scenery = {
    drawSky,
    drawFar,
    drawMid,
    drawGround,
    drawForeground,
    drawPartyTable,
    drawBunting,
  };

  root.V12Scenery = Scenery;
  root.V11Scenery = Scenery;
  if (typeof module !== 'undefined' && module.exports) module.exports = Scenery;
})(typeof globalThis !== 'undefined' ? globalThis : this);
