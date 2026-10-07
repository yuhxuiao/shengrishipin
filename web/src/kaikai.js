// kaikai.js — v6 像素级复刻 banana 设计的开开(正面视角,毛绒 3D 感,三段关节挖臂)
'use strict';
// kaikai(ctx, x, y, u, o): x,y = 履带接地点中心;整体高约 8.6u、宽约 9u(臂展开更宽)
// o.aBoom/aStick/aBucket 挖臂角(度,臂朝画面左,0=水平,正=抬) o.rot o.dy o.sq o.flip o.wheel o.drive
// o.eyes: normal|happy|closed|wink|spark  o.mouth: smile|open|o|grin  o.lookX/lookY  o.hat 默认开

const KK = {
  body: ['#6db4f2', '#4a96e0', '#3577c2'],  // 车身蓝渐变
  dark: '#2e3a6e',                            // 脸罩/鼻/描线 深藏青
  window: '#d9ecff', muzzle: '#f2c98c', muzzleDk: '#dfa95e',
  track: '#2b3342', trackDk: '#1d2330', rim: '#c9d2e2', rimDk: '#8f9bb3',
  bucket: '#a8bdd4', bucketDk: '#7e93b0',
  amber: '#ffb020', hat: '#ffd93d', hatDot: '#ff8fab', hatPom: '#ff6b6b',
};

function _lg(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
function _rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function kkFace(ctx, o) {
  // 驾驶室脸(局部坐标:脸中心 0,0,脸宽约 4.6u 高约 4.2u)
  const eyes = o.eyes || 'normal';
  // 藏青脸罩(布鲁伊式面具:盖住眼区并向两侧延展)
  ctx.fillStyle = KK.dark;
  ctx.beginPath();
  ctx.moveTo(-2.3, -1.9); ctx.quadraticCurveTo(0, -2.5, 2.3, -1.9);
  ctx.quadraticCurveTo(2.75, -0.4, 2.3, 0.55); ctx.quadraticCurveTo(1.2, 0.1, 0.75, 0.35);
  ctx.quadraticCurveTo(0, 0.6, -0.75, 0.35); ctx.quadraticCurveTo(-1.2, 0.1, -2.3, 0.55);
  ctx.quadraticCurveTo(-2.75, -0.4, -2.3, -1.9); ctx.closePath(); ctx.fill();
  // 眉毛(浅色小椭圆)
  ctx.fillStyle = '#cfe6ff';
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 1.05, -1.62); ctx.rotate(s * -0.12); ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.17, 0, 0, 6.29); ctx.fill(); ctx.restore(); }
  // 眼睛
  const lx = (o.lookX || 0) * 0.14, ly = (o.lookY || 0) * 0.1;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 1.05, -0.55);
    if (eyes === 'closed' || eyes === 'happy' || (eyes === 'wink' && s === 1)) {
      ctx.strokeStyle = '#101528'; ctx.lineWidth = 0.17; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0.18, 0.52, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 0.58, 0.72, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#26160e';
      ctx.beginPath(); ctx.arc(lx + 0, ly + 0.08, 0.36, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx - 0.13, ly - 0.12, 0.13, 0, 6.29); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(lx + 0.14, ly + 0.18, 0.06, 0, 6.29); ctx.fill();
      if (eyes === 'spark') { ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.arc(0.22, -0.3, 0.1, 0, 6.29); ctx.fill(); }
    }
    ctx.restore();
  }
  // 吻部(奶油色)
  ctx.fillStyle = KK.muzzle;
  ctx.beginPath(); ctx.ellipse(0, 1.05, 1.5, 0.95, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = KK.muzzleDk; ctx.beginPath(); ctx.ellipse(0.5, 1.35, 0.5, 0.28, -0.2, 0, 6.29); ctx.fill(); // 吻部阴影
  // 鼻子
  ctx.fillStyle = KK.dark;
  ctx.beginPath(); ctx.moveTo(0, 0.62); ctx.quadraticCurveTo(0.52, 0.66, 0.5, 1.02); ctx.quadraticCurveTo(0.3, 1.3, 0, 1.3); ctx.quadraticCurveTo(-0.3, 1.3, -0.5, 1.02); ctx.quadraticCurveTo(-0.52, 0.66, 0, 0.62); ctx.fill();
  // 嘴
  ctx.strokeStyle = '#101528'; ctx.lineWidth = 0.13; ctx.lineCap = 'round';
  const m = o.mouth || 'smile';
  ctx.beginPath();
  if (m === 'smile') ctx.arc(0.12, 1.28, 0.52, 0.25 * Math.PI, 0.85 * Math.PI);
  else if (m === 'grin') ctx.arc(0.12, 1.2, 0.62, 0.15 * Math.PI, 0.9 * Math.PI);
  else { // open / o
    ctx.fillStyle = '#7a3548';
    if (m === 'open') ctx.ellipse(0.15, 1.5, 0.42, 0.34, 0, 0, 6.29);
    else ctx.ellipse(0.15, 1.45, 0.24, 0.24, 0, 0, 6.29);
    ctx.fill();
  }
  ctx.stroke();
  // 腮红
  ctx.fillStyle = 'rgba(255,140,160,.5)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 1.95, 1.0, 0.3, 0.2, 0, 0, 6.29); ctx.fill(); }
}

function kaikai(ctx, x, y, u, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (o.flip) ctx.scale(-1, 1);
  const sq = o.sq || 0;
  ctx.scale(1 + sq * 0.35, 1 - sq * 0.3);
  if (o.rot) ctx.rotate(o.rot);
  ctx.translate(0, (o.dy || 0) * u + (o.drive ? Math.abs(Math.sin((o.wheel || 0) * 2)) * 0.12 * u * o.drive : 0));
  ctx.scale(u, u);

  // ---- 履带(宽 9u,双侧轮) ----
  ctx.fillStyle = KK.trackDk;
  _rr(ctx, -4.6, -2.5, 9.2, 2.5, 1.1); ctx.fill();
  ctx.fillStyle = KK.track;
  _rr(ctx, -4.6, -2.5, 9.2, 2.1, 1.0); ctx.fill();
  // 履带齿
  ctx.strokeStyle = KK.trackDk; ctx.lineWidth = 0.18;
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 1.0, -2.45); ctx.lineTo(i * 1.0, -2.0); ctx.stroke(); }
  const wr = o.wheel || 0;
  for (const wx of [-3.2, 0, 3.2]) {
    ctx.save(); ctx.translate(wx, -1.25);
    ctx.fillStyle = KK.rimDk; ctx.beginPath(); ctx.arc(0, 0, 1.0, 0, 6.29); ctx.fill();
    ctx.fillStyle = KK.rim; ctx.beginPath(); ctx.arc(0, 0, 0.72, 0, 6.29); ctx.fill();
    ctx.rotate(wr);
    ctx.strokeStyle = KK.track; ctx.lineWidth = 0.16;
    for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.68); ctx.stroke(); }
    ctx.fillStyle = KK.rimDk; ctx.beginPath(); ctx.arc(0, 0, 0.2, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  // 履带间金属挡板
  ctx.fillStyle = _lg(ctx, 0, -2.2, 0, -0.7, ['#8f9bb3', '#5a6a85']);
  _rr(ctx, -2.4, -2.15, 4.8, 1.5, 0.5); ctx.fill();

  // ---- 车身裙边 ----
  ctx.fillStyle = _lg(ctx, 0, -4.6, 0, -2.4, ['#5fa8ea', '#3a82cc']);
  _rr(ctx, -3.9, -4.5, 7.8, 2.1, 0.7); ctx.fill();
  ctx.fillStyle = '#2e6ab0'; _rr(ctx, -3.9, -2.75, 7.8, 0.45, 0.22); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 0.95px "Noto Sans CJK SC"'; ctx.textAlign = 'center';
  ctx.fillText('开开', 2.2, -3.2);

  // ---- 挖臂(画面左侧,肩在 cab 左上) ----
  const aB = (o.aBoom ?? 25) * Math.PI / 180, aS = (o.aStick ?? -55) * Math.PI / 180, aK = (o.aBucket ?? 30) * Math.PI / 180;
  ctx.save();
  ctx.translate(-3.6, -5.4);
  ctx.rotate(-aB);
  // 大臂(两片式夹心:后片深、前片蓝、液压杆)
  ctx.strokeStyle = KK.body[2]; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5.2, 0); ctx.stroke();
  ctx.strokeStyle = KK.body[0]; ctx.lineWidth = 0.95;
  ctx.beginPath(); ctx.moveTo(0, -0.12); ctx.lineTo(-5.2, -0.12); ctx.stroke();
  // 液压杆(银色小杆,随车臂视觉细节)
  ctx.strokeStyle = '#d8e2ee'; ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(-0.5, 0.55); ctx.lineTo(-3.4, 0.35); ctx.stroke();
  // 肩/肘关节铆钉
  for (const [jx, jy] of [[0, 0], [-5.2, 0]]) {
    ctx.fillStyle = '#e8eef7'; ctx.beginPath(); ctx.arc(jx, jy, 0.34, 0, 6.29); ctx.fill();
    ctx.fillStyle = KK.body[2]; ctx.beginPath(); ctx.arc(jx, jy, 0.16, 0, 6.29); ctx.fill();
  }
  ctx.translate(-5.2, 0);
  ctx.rotate(-aS);
  ctx.strokeStyle = KK.body[1]; ctx.lineWidth = 1.25;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4.3, 0); ctx.stroke();
  ctx.strokeStyle = KK.body[0]; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(0, -0.12); ctx.lineTo(-4.3, -0.12); ctx.stroke();
  ctx.translate(-4.3, 0);
  ctx.rotate(-aK);
  // 铲斗(银灰带爪)
  ctx.fillStyle = KK.bucket;
  ctx.beginPath();
  ctx.moveTo(0.25, -0.85); ctx.quadraticCurveTo(-1.6, -0.75, -2.05, 0.35); ctx.lineTo(-2.05, 0.5);
  ctx.lineTo(-1.6, 0.42); ctx.lineTo(-1.7, 0.95); ctx.lineTo(-1.25, 0.5); ctx.lineTo(-1.2, 1.05);
  ctx.lineTo(-0.75, 0.55); ctx.lineTo(-0.65, 1.05); ctx.lineTo(-0.25, 0.6);
  ctx.quadraticCurveTo(0.5, 0.45, 0.5, -0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = KK.bucketDk; _rr(ctx, -0.3, -0.7, 0.8, 1.1, 0.25); ctx.fill();
  ctx.restore();

  // ---- 驾驶室(带脸) ----
  ctx.save();
  ctx.translate(1.2, -4.5);
  // 驾驶室体(渐变 + 顶部暖光)
  ctx.fillStyle = _lg(ctx, 0, -5.2, 0, 0.4, ['#8fc6f7', '#4a96e0', '#3a82cc']);
  _rr(ctx, -2.7, -5.5, 5.4, 5.5, 1.15); ctx.fill();
  // 边缘柔光
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.12;
  _rr(ctx, -2.58, -5.38, 5.16, 5.26, 1.05); ctx.stroke();
  // 脸
  ctx.save(); ctx.translate(0, -2.5); kkFace(ctx, o); ctx.restore();
  // 车门把手 + 开开 字样

  // 车顶双警示灯(琥珀,微微发光)
  for (const s of [-0.75, 0.75]) {
    const g = ctx.createRadialGradient(s, -5.5, 0.05, s, -5.5, 0.6);
    g.addColorStop(0, 'rgba(255,190,80,.9)'); g.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s, -5.5, 0.6, 0, 6.29); ctx.fill();
    ctx.fillStyle = KK.amber; ctx.beginPath(); ctx.arc(s, -5.45, 0.32, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff8'; ctx.beginPath(); ctx.arc(s - 0.08, -5.55, 0.1, 0, 6.29); ctx.fill();
  }
  // 生日帽
  if (o.hat !== false) {
    ctx.save(); ctx.translate(-0.4, -5.25); ctx.rotate(-0.1);
    ctx.fillStyle = KK.hat;
    ctx.beginPath(); ctx.moveTo(-0.95, 0); ctx.lineTo(0.95, 0); ctx.lineTo(0, -2.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = KK.hatDot;
    for (const [px, py] of [[-0.42, -0.6], [0.32, -1.0], [-0.12, -1.6]]) { ctx.beginPath(); ctx.arc(px, py, 0.19, 0, 6.29); ctx.fill(); }
    ctx.fillStyle = KK.hatPom; ctx.beginPath(); ctx.arc(0, -2.3, 0.32, 0, 6.29); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}
