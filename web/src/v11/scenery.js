// scenery.js — V11 高精布鲁伊风多场景分层系统 (彻底消除扁平与空旷)
// 包含 6 大精细地点:
// 1. yard: 院子 (布鲁伊家双层木屋一角、白色木栅栏、彩旗飘带、迎风气球)
// 2. garden: 花园 (立体花坛木架、郁金香花丛、向日葵、飘动绿叶、飞舞彩蝶)
// 3. sandbox: 沙坑 (粗实木质沙箱围栏、立体金黄沙丘、小红水桶、塑料铲、小贝壳)
// 4. tree: 大树下 (参天橡树主干延伸至顶、层叠树冠剪影、地面斑驳树荫晃动)
// 5. golden: 金色草地 (梦幻金草、温润丁达尔光柱 God rays、脉动金斑)
// 6. party: 派对桌 (精美派对长桌、垂褶波浪桌布、彩球拱门、满桌礼品盒与礼花筒)
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const NAVY = '#0B2F6E';

  // 1. 天空层 (Sky, depth = 0.05)
  function drawSky(ctx, loc, t) {
    const isGolden = loc === 'golden';
    const isParty = loc === 'party';

    const grad = ctx.createLinearGradient(0, -200, 0, 850);
    if (isGolden) {
      grad.addColorStop(0, '#FFE082');
      grad.addColorStop(0.45, '#FFF3E0');
      grad.addColorStop(1, '#B3E5FC');
    } else if (isParty) {
      grad.addColorStop(0, '#64B5F6');
      grad.addColorStop(0.6, '#BBDEFB');
      grad.addColorStop(1, '#FFF9C4');
    } else {
      grad.addColorStop(0, '#42A5F5');
      grad.addColorStop(0.65, '#90CAF9');
      grad.addColorStop(1, '#E1F5FE');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(-2000, -500, 8000, 1600);

    // 飘动的立体双色白云
    const clouds = [
      { x: 200, y: 140, s: 1.2, spd: 8 },
      { x: 1100, y: 110, s: 1.4, spd: 12 },
      { x: 2100, y: 160, s: 1.0, spd: 9 },
      { x: 3100, y: 120, s: 1.3, spd: 11 },
      { x: 4100, y: 150, s: 1.1, spd: 10 },
    ];
    for (const c of clouds) {
      const cx = ((c.x + t * c.spd) % 5200) - 600;
      drawCloud(ctx, cx, c.y, c.s, isGolden);
    }
  }

  function drawCloud(ctx, x, y, s, isGolden) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    // 云朵柔和底影
    ctx.fillStyle = isGolden ? 'rgba(255, 235, 200, 0.7)' : 'rgba(220, 235, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(0, 8, 48, 0, TAU);
    ctx.arc(42, -10, 38, 0, TAU);
    ctx.arc(88, 8, 44, 0, TAU);
    ctx.arc(46, 20, 42, 0, TAU);
    ctx.fill();

    // 云朵亮面
    ctx.fillStyle = isGolden ? 'rgba(255, 253, 245, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, TAU);
    ctx.arc(42, -18, 38, 0, TAU);
    ctx.arc(88, 0, 44, 0, TAU);
    ctx.arc(46, 12, 42, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // 2. 远景区 (Far, depth = 0.20)
  function drawFar(ctx, loc, t) {
    ctx.save();
    // 第一层远山 (柔和浅蓝绿)
    ctx.fillStyle = loc === 'golden' ? '#C5E1A5' : '#A5D6A7';
    ctx.beginPath();
    ctx.moveTo(-1000, 800);
    for (let x = -1000; x < 5000; x += 400) {
      ctx.quadraticCurveTo(x + 200, 680 + Math.sin(x * 0.003) * 55, x + 400, 720);
    }
    ctx.lineTo(5000, 1100);
    ctx.lineTo(-1000, 1100);
    ctx.fill();

    // 第二层起伏丘陵 (中明度绿草丘)
    ctx.fillStyle = loc === 'golden' ? '#AED581' : '#81C784';
    ctx.beginPath();
    ctx.moveTo(-1000, 820);
    for (let x = -1000; x < 5000; x += 500) {
      ctx.quadraticCurveTo(x + 250, 740 + Math.cos(x * 0.002) * 45, x + 500, 770);
    }
    ctx.lineTo(5000, 1100);
    ctx.lineTo(-1000, 1100);
    ctx.fill();

    // 远方小树丛与小木屋轮廓
    if (loc === 'yard' || loc === 'party') {
      ctx.fillStyle = '#66BB6A';
      for (let x = -200; x < 4000; x += 380) {
        ctx.beginPath();
        ctx.arc(x, 750, 40, Math.PI, 0);
        ctx.arc(x + 35, 740, 50, Math.PI, 0);
        ctx.arc(x + 75, 750, 38, Math.PI, 0);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 3. 中景区 (Mid, depth = 0.55)
  function drawMid(ctx, loc, t) {
    ctx.save();

    // 彩旗串 (yard, garden, party)
    if (loc === 'yard' || loc === 'garden' || loc === 'party' || loc === 'golden') {
      drawBunting(ctx, loc, t);
    }

    if (loc === 'yard') {
      // 左侧布鲁伊风格温暖木屋一角
      drawHouseCorner(ctx, -150, 740);
      // 精致白色小木栅栏
      drawFence(ctx, 220, 3600, 760);
      // 木栅栏旁的系绳气球束
      drawTiedBalloons(ctx, 420, 680, t, ['#FF7096', '#FFD54F', '#4DD0E1']);
      drawTiedBalloons(ctx, 1680, 660, t, ['#81C784', '#FFB74D', '#BA68C8']);
    } else if (loc === 'garden') {
      // 立体花园木栅花坛与向日葵郁金香
      drawGardenFence(ctx, -200, 3800, 760);
      drawFlowerBushes(ctx, -100, 3600, 775, t);
      // 翩跹飞舞的彩色蝴蝶
      drawButterfly(ctx, 520 + Math.sin(t * 1.6) * 110, 600 + Math.cos(t * 2.2) * 50, t, '#FF9800');
      drawButterfly(ctx, 1380 + Math.sin(t * 1.9 + 2) * 120, 580 + Math.sin(t * 2.4) * 60, t, '#E91E63');
    } else if (loc === 'sandbox') {
      // 真正的沙坑木质大围栏 (带立体木纹与厚度)
      drawSandboxStructure(ctx, 300, 1650, 780);
      // 散落在沙滩旁的小玩具与小沙丘
      drawSandboxToys(ctx, 460, 810, t);
    } else if (loc === 'tree') {
      // 巨大橡树主干与树冠
      drawBigTree(ctx, 880, 780, t);
    } else if (loc === 'golden') {
      // 圣洁温柔的丁达尔金光柱
      drawSunbeams(ctx, t);
    } else if (loc === 'party') {
      // 派对现场：气球拱门 (在远景中景)
      drawPartyArch(ctx, 960, 660, t);
    }

    ctx.restore();
  }

  // 4. 主世界地面层 (Ground, depth = 1.00)
  function drawGround(ctx, loc, t) {
    ctx.save();
    const groundY = 860;

    // 地面主色块 (温暖嫩绿草坪，带双色分界条纹)
    if (loc === 'golden') {
      ctx.fillStyle = '#C0CA33'; // 阳光沐浴金草
    } else if (loc === 'sandbox') {
      ctx.fillStyle = '#AED581';
    } else {
      ctx.fillStyle = '#9CCC65';
    }
    ctx.fillRect(-2000, groundY, 8000, 600);

    // 地面草坪顶端锯齿描边装饰带 (布鲁伊经典绘本草齿)
    ctx.fillStyle = loc === 'golden' ? '#AFB42B' : '#8BC34A';
    ctx.beginPath();
    ctx.moveTo(-1000, groundY);
    for (let x = -1000; x < 5000; x += 40) {
      ctx.lineTo(x + 20, groundY + 14);
      ctx.lineTo(x + 40, groundY);
    }
    ctx.lineTo(5000, groundY + 16);
    ctx.lineTo(-1000, groundY + 16);
    ctx.closePath();
    ctx.fill();

    // 草地上的深色阴影分割线
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-1000, groundY);
    ctx.lineTo(5000, groundY);
    ctx.stroke();

    // 沙坑场景专属：中央金黄沙池
    if (loc === 'sandbox') {
      ctx.save();
      ctx.fillStyle = '#FFE082';
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(320, groundY - 30, 1340, 180, 24);
      ctx.fill();
      ctx.stroke();
      // 沙堆起伏纹理
      ctx.fillStyle = '#FFD54F';
      for (let sx = 400; sx < 1600; sx += 220) {
        ctx.beginPath();
        ctx.arc(sx, groundY + 40, 65, Math.PI, 0);
        ctx.fill();
      }
      ctx.restore();
    }

    // 大树场景专属：地面斑驳晃动的树荫光斑
    if (loc === 'tree') {
      ctx.save();
      ctx.fillStyle = 'rgba(46, 80, 20, 0.22)';
      const sway = Math.sin(t * 1.5) * 20;
      ctx.beginPath();
      ctx.ellipse(880 + sway, groundY + 50, 480, 90, 0, 0, TAU);
      ctx.ellipse(620 + sway * 0.8, groundY + 60, 240, 70, 0, 0, TAU);
      ctx.ellipse(1180 + sway * 1.2, groundY + 55, 260, 75, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // 5. 前景视差层 (Foreground, depth = 1.45)
  function drawForeground(ctx, loc, t) {
    ctx.save();
    const fgY = 1080;
    const isGarden = loc === 'garden';
    const isParty = loc === 'party';

    // 底部快速滑过的大片柔焦草叶与小雏菊
    ctx.fillStyle = '#558B2F';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;

    for (let x = -800; x < 4000; x += 160) {
      const sw = Math.sin(t * 3.5 + x * 0.02) * 16;
      ctx.beginPath();
      ctx.moveTo(x, fgY);
      ctx.quadraticCurveTo(x + 20 + sw, fgY - 90, x + 35 + sw, fgY - 140);
      ctx.quadraticCurveTo(x + 50 + sw, fgY - 70, x + 70, fgY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 前景小野花
      if ((x % 320) === 0) {
        ctx.save();
        ctx.translate(x + 35 + sw, fgY - 140);
        const petalCol = isParty ? '#FF4081' : (isGarden ? '#FFCA28' : '#FFFFFF');
        ctx.fillStyle = petalCol;
        for (let p = 0; p < 5; p++) {
          const pa = (p / 5) * TAU;
          ctx.beginPath();
          ctx.arc(Math.cos(pa) * 12, Math.sin(pa) * 12, 9, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ==================== 具体构件细节 ====================

  // 彩旗串 (带自然重力弧度与微风翻滚)
  function drawBunting(ctx, loc, t) {
    ctx.save();
    const wireY = 160;
    const colors = ['#FF5252', '#FFD740', '#448AFF', '#69F0AE', '#FF6E40', '#E040FB'];

    ctx.strokeStyle = 'rgba(11, 47, 110, 0.45)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-600, wireY);
    for (let x = -600; x < 4200; x += 320) {
      ctx.quadraticCurveTo(x + 160, wireY + 42 + Math.sin(x * 0.01 + t * 2) * 5, x + 320, wireY);
    }
    ctx.stroke();

    let cIdx = 0;
    for (let x = -520; x < 4000; x += 110) {
      const sag = Math.sin((x + 600) * (Math.PI / 320)) * 42;
      const fy = wireY + sag;
      const sway = Math.sin(t * 3.5 + x * 0.04) * 9;
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

  // 院子木屋一角
  function drawHouseCorner(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    // 房屋外墙米黄色木护墙板
    ctx.fillStyle = '#FFE0B2';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.fillRect(0, -380, 280, 380);
    ctx.strokeRect(0, -380, 280, 380);

    // 木板横条纹
    ctx.strokeStyle = 'rgba(11, 47, 110, 0.25)';
    ctx.lineWidth = 3;
    for (let py = -340; py < 0; py += 40) {
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(280, py); ctx.stroke();
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
    // 花朵
    ctx.fillStyle = '#FF4081';
    for (let fx = 80; fx <= 190; fx += 30) {
      ctx.beginPath(); ctx.arc(fx, -158, 12, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // 白色小木栅栏
  function drawFence(ctx, x0, x1, y) {
    ctx.save();
    ctx.fillStyle = '#E0F2F1';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    // 双横梁
    ctx.fillRect(x0 - 40, y - 85, x1 - x0 + 80, 22);
    ctx.strokeRect(x0 - 40, y - 85, x1 - x0 + 80, 22);
    ctx.fillRect(x0 - 40, y - 35, x1 - x0 + 80, 22);
    ctx.strokeRect(x0 - 40, y - 35, x1 - x0 + 80, 22);

    // 竖桩
    for (let x = x0; x < x1; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 120);
      ctx.lineTo(x + 22, y - 145);
      ctx.lineTo(x + 44, y - 120);
      ctx.lineTo(x + 44, y);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 花园立体木栅与花丛
  function drawGardenFence(ctx, x0, x1, y) {
    ctx.save();
    ctx.fillStyle = '#D7CCC8';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    for (let x = x0; x < x1; x += 140) {
      ctx.fillRect(x, y - 100, 24, 100);
      ctx.strokeRect(x, y - 100, 24, 100);
      ctx.fillRect(x - 30, y - 70, 160, 18);
      ctx.strokeRect(x - 30, y - 70, 160, 18);
    }
    ctx.restore();
  }

  function drawFlowerBushes(ctx, x0, x1, y, t) {
    ctx.save();
    // 郁郁葱葱的灌木丛
    ctx.fillStyle = '#7CB342';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    for (let x = x0; x < x1; x += 180) {
      ctx.beginPath();
      ctx.arc(x, y, 75, Math.PI, 0);
      ctx.arc(x + 60, y - 20, 85, Math.PI, 0);
      ctx.arc(x + 130, y, 70, Math.PI, 0);
      ctx.fill();
      ctx.stroke();

      // 各色绽放的花朵
      const flowerCols = ['#FF5252', '#FF4081', '#FFEB3B', '#7C4DFF', '#FF6E40'];
      for (let i = 0; i < 4; i++) {
        const fx = x + 25 + i * 32;
        const fy = y - 45 - (i % 2) * 35;
        ctx.fillStyle = flowerCols[(i + x) % flowerCols.length];
        ctx.beginPath(); ctx.arc(fx, fy, 14, 0, TAU); ctx.fill();
        ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(fx, fy, 5, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  // 飞舞的彩蝶
  function drawButterfly(ctx, x, y, t, color) {
    ctx.save();
    ctx.translate(x, y);
    const flap = Math.sin(t * 18) * 0.8;
    ctx.scale(flap, 1);

    ctx.fillStyle = color;
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3;

    // 上翅
    ctx.beginPath();
    ctx.ellipse(14, -10, 16, 12, 0.4, 0, TAU);
    ctx.ellipse(-14, -10, 16, 12, -0.4, 0, TAU);
    ctx.fill(); ctx.stroke();

    // 下翅
    ctx.beginPath();
    ctx.ellipse(10, 6, 11, 8, -0.3, 0, TAU);
    ctx.ellipse(-10, 6, 11, 8, 0.3, 0, TAU);
    ctx.fill(); ctx.stroke();

    // 蝶身
    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.ellipse(0, 0, 3, 12, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // 沙坑立体结构与沙箱玩具
  function drawSandboxStructure(ctx, x0, x1, y) {
    ctx.save();
    // 粗实木质围边 (厚重圆角木质质感)
    ctx.fillStyle = '#FB8C00';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.fillRect(x0, y - 50, x1 - x0, 55);
    ctx.strokeRect(x0, y - 50, x1 - x0, 55);

    // 木头接榫钉与横木纹理
    ctx.fillStyle = '#E65100';
    for (let x = x0 + 40; x < x1; x += 180) {
      ctx.beginPath(); ctx.arc(x, y - 22, 6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawSandboxToys(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);

    // 红色塑料小沙桶
    ctx.fillStyle = '#E53935';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-28, 0); ctx.lineTo(-20, -50); ctx.lineTo(20, -50); ctx.lineTo(28, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 桶柄
    ctx.strokeStyle = '#FFD54F'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -50, 16, Math.PI, 0); ctx.stroke();

    // 插在沙堆里的小黄色铲子
    ctx.save();
    ctx.translate(65, -15);
    ctx.rotate(-0.4);
    ctx.fillStyle = '#FDD835';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3.5;
    ctx.fillRect(-6, -45, 12, 45); ctx.strokeRect(-6, -45, 12, 45);
    ctx.beginPath();
    ctx.roundRect(-16, 0, 32, 28, 6); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  // 参天大橡树
  function drawBigTree(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);

    // 粗壮树干
    ctx.fillStyle = '#795548';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-110, 0);
    ctx.quadraticCurveTo(-80, -280, -180, -580);
    ctx.lineTo(180, -580);
    ctx.quadraticCurveTo(80, -280, 110, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 树干木纹深色纵线
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-45, -50); ctx.quadraticCurveTo(-20, -280, -60, -520);
    ctx.moveTo(35, -40); ctx.quadraticCurveTo(20, -260, 50, -510);
    ctx.stroke();

    // 繁茂层叠的树冠
    const leafCols = ['#43A047', '#388E3C', '#2E7D32', '#66BB6A'];
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 7;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU;
      const lx = Math.cos(ang) * 220;
      const ly = -620 + Math.sin(ang) * 140;
      ctx.fillStyle = leafCols[i % leafCols.length];
      ctx.beginPath();
      ctx.arc(lx, ly, 180, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // 中央主树冠
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(0, -620, 240, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 圣洁金光柱 (God Rays)
  function drawSunbeams(ctx, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 235, 140, 0.14)';
    for (let i = 0; i < 7; i++) {
      const angle = -0.6 + i * 0.2 + Math.sin(t * 0.6 + i * 1.3) * 0.04;
      ctx.beginPath();
      ctx.moveTo(960, -300);
      ctx.lineTo(960 + Math.tan(angle - 0.07) * 1400, 1080);
      ctx.lineTo(960 + Math.tan(angle + 0.07) * 1400, 1080);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 派对现场：真正的派对长桌与垂褶波浪条纹桌布！
  function drawPartyTable(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);

    // 1. 桌腿 (深木色)
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

    // 3. 华丽派对桌布主体 (天蓝色，带有深海蓝与纯白双色竖条纹)
    ctx.fillStyle = '#64B5F6';
    ctx.fillRect(-w / 2 + 10, 6, w - 20, 80);

    // 桌布条纹
    ctx.fillStyle = '#E3F2FD';
    for (let tx = -w / 2 + 20; tx < w / 2 - 20; tx += 60) {
      ctx.fillRect(tx, 6, 30, 80);
    }
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    ctx.strokeRect(-w / 2 + 10, 6, w - 20, 80);

    // 4. 桌布底边垂褶波浪扇形边 (布鲁伊经典圆润贝壳边)
    ctx.fillStyle = '#E3F2FD';
    for (let bx = -w / 2 + 10; bx < w / 2 - 10; bx += 40) {
      ctx.beginPath();
      ctx.arc(bx + 20, 86, 20, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // 5. 桌上的派对点缀 (彩色礼花纸筒、小彩盘)
    // 左侧小彩盘
    ctx.fillStyle = '#FF8A80';
    ctx.beginPath(); ctx.ellipse(-380, -20, 45, 12, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath(); ctx.ellipse(380, -20, 45, 12, 0, 0, TAU); ctx.fill(); ctx.stroke();

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

    // 拱门上排列紧致的多彩马卡龙气球
    const archCols = ['#FF5252', '#FFD740', '#448AFF', '#69F0AE', '#FF6E40', '#E040FB', '#40C4FF'];
    for (let a = Math.PI; a <= TAU; a += 0.10) {
      const bx = Math.cos(a) * 520;
      const by = Math.sin(a) * 520;
      const col = archCols[Math.floor((a - Math.PI) * 12) % archCols.length];

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(bx, by, 42, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 4;
      ctx.stroke();

      // 气球高光小月牙
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(bx - 10, by - 12, 10, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // 系在木桩上的气球束
  function drawTiedBalloons(ctx, x, y, t, colors) {
    ctx.save();
    ctx.translate(x, y);
    colors.forEach((col, i) => {
      const angle = (i - 1) * 0.32 + Math.sin(t * 2.2 + i * 1.5) * 0.08;
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

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(bx - 8, by - 10, 8, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  root.V11Scenery = {
    drawSky,
    drawFar,
    drawMid,
    drawGround,
    drawForeground,
    drawPartyTable,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.V11Scenery;
})(typeof globalThis !== 'undefined' ? globalThis : this);
