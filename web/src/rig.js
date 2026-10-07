// rig.js — 分层木偶绑定:整张 AI 精灵图 → 多边形切件 → 关节旋转动画
'use strict';

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

// 绿幕键控:绿色度消透明 + 去绿溢色;trim=false 保留原图尺寸(绑定件需要原坐标)
function keyGreen(img, trim = true) {
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i], g = a[i + 1], b = a[i + 2];
    const gn = g - Math.max(r, b);
    if (gn > 40) a[i + 3] = 0;
    else if (gn > 12) a[i + 3] = Math.round(255 * (1 - (gn - 12) / 28));
    if (a[i + 3] > 0 && g > Math.max(r, b) + 8) a[i + 1] = Math.max(r, b) + 8; // 去绿边
  }
  x.putImageData(d, 0, 0);
  if (!trim) return c;
  let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
  const a2 = x.getImageData(0, 0, c.width, c.height).data;
  for (let py = 0; py < c.height; py += 2) for (let px = 0; px < c.width; px += 2) {
    if (a2[(py * c.width + px) * 4 + 3] > 12) {
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
  }
  const t = document.createElement('canvas');
  t.width = maxX - minX + 4; t.height = maxY - minY + 4;
  t.getContext('2d').drawImage(c, minX - 2, minY - 2, t.width, t.height, 0, 0, t.width, t.height);
  return t;
}

// 圆弧点列(度):生成以 (cx,cy) 为圆心的弧——切口随关节旋转而不暴露的关键
function arcPts(cx, cy, r, a0, a1, n = 14) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

// 多边形裁件(支持多个多边形取并集;边缘 2px 羽化)
function cutPoly(img, polyOrPolys) {
  const polys = Array.isArray(polyOrPolys[0][0]) ? polyOrPolys : [polyOrPolys];
  const m = document.createElement('canvas'); m.width = img.width; m.height = img.height;
  const mx = m.getContext('2d');
  mx.fillStyle = '#000'; mx.shadowColor = '#000'; mx.shadowBlur = 2;
  for (const poly of polys) {
    mx.beginPath();
    poly.forEach(([px, py], i) => i ? mx.lineTo(px, py) : mx.moveTo(px, py));
    mx.closePath(); mx.fill(); mx.fill();
  }
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(m, 0, 0);
  return c;
}
// 从整张底图挖掉多边形(用于身体件挖掉手臂区;掩码外扩 ~14px 防止碎屑残留,边缘羽化)
function erasePoly(img, polys) {
  const m = document.createElement('canvas'); m.width = img.width; m.height = img.height;
  const mx = m.getContext('2d');
  mx.fillStyle = '#000'; mx.shadowColor = '#000'; mx.shadowBlur = 2;
  mx.strokeStyle = '#000'; mx.lineWidth = 28; mx.lineJoin = 'round';
  for (const poly of polys) {
    mx.beginPath();
    poly.forEach(([px, py], i) => i ? mx.lineTo(px, py) : mx.moveTo(px, py));
    mx.closePath(); mx.fill(); mx.fill(); mx.stroke();
  }
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'destination-out';
  x.drawImage(m, 0, 0);
  return c;
}

// 绑定定义:
// { parts: { body:{erase:[poly...]}, boom:{poly, pivot:[x,y], tip:[x,y]}, stick:{poly, pivot:[x,y], tip:[x,y]} } }
// pivot=关节点(原图坐标), tip=下一关节点(用于求基准角)。body 最先画,其余按 order 数组顺序。
function buildRig(keyedCanvas, def) {
  const parts = {};
  for (const [name, p] of Object.entries(def.parts)) {
    if (name === 'body') parts.body = { canvas: erasePoly(keyedCanvas, p.erase || []) };
    else {
      const polys = p.polys || [p.poly];
      parts[name] = {
        canvas: cutPoly(keyedCanvas, polys),
        pivot: p.pivot, tip: p.tip, attach: p.attach,
        baseAngle: Math.atan2(p.tip[1] - p.pivot[1], p.tip[0] - p.pivot[0]),
      };
    }
  }
  return { def, parts, iw: keyedCanvas.width, ih: keyedCanvas.height };
}

// 世界变换:角色锚点 (x,y)=脚底中点, h=角色像素高(对应原图 bbox 高)
// defBox: 原图中角色的包围盒 [x0,y0,x1,y1](用于锚定)
// angles: { boom: 相对基准角的增量弧度, stick: 相对基准角增量(随 boom 联动) }
function drawRig(ctx, rig, box, x, y, h, o = {}) {
  const iw = rig.iw, ih = rig.ih;
  const bw = box[2] - box[0], bh = box[3] - box[1];
  const s = h / bh;
  // 图像坐标 → 世界坐标的映射: 先减掉 box 左上,锚到脚底中点
  const toWorld = (px, py) => [
    x + (px - (box[0] + bw / 2)) * s,
    y + (py - box[3]) * s,
  ];
  ctx.save();
  if (o.filter) ctx.filter = o.filter;
  // 整车主变换(压扁/弹跳/倾斜)
  const mainT = (px, py) => {
    let [wx, wy] = toWorld(px, py);
    // 绕脚底中点缩放(squash)
    wx = x + (wx - x) * (1 + (o.sq || 0) * 0.3);
    wy = y + (wy - y) * (1 - (o.sq || 0) * 0.28);
    return [wx, wy];
  };
  // 身体
  {
    const [ax, ay] = mainT(0, 0); // 仅用于推 transform,直接对 ctx 做等价变换
    ctx.save();
    ctx.translate(x, y + (o.dy || 0));
    ctx.rotate(o.rot || 0);
    ctx.scale((1 + (o.sq || 0) * 0.3) * s * (o.flip ? -1 : 1), (1 - (o.sq || 0) * 0.28) * s);
    ctx.translate(-(box[0] + bw / 2), -box[3]);
    ctx.drawImage(rig.parts.body.canvas, 0, 0);
    ctx.restore();
  }
  // 关节件(正运动学:角度与位置都沿链传递;attach 指定跟随哪个已处理件的 tip)
  let parentDelta = 0, prevTipW = null;
  const joints = {};
  const dir = o.flip ? -1 : 1;
  for (const name of rig.def.order) {
    const p = rig.parts[name];
    parentDelta += ((o.angles && o.angles[name]) || 0);
    let wx, wy;
    const at = p.attach ? joints[p.attach] && joints[p.attach].tip : null;
    if (at) [wx, wy] = at;
    else if (prevTipW) [wx, wy] = prevTipW;
    else {
      const [wpx, wpy] = toWorld(p.pivot[0], p.pivot[1]);
      wx = x + (wpx - x) * (1 + (o.sq || 0) * 0.3);
      wy = y + (wpy - y) * (1 - (o.sq || 0) * 0.28) + (o.dy || 0);
    }
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate((o.rot || 0) + parentDelta * dir);
    ctx.scale(dir * s, s);
    ctx.translate(-p.pivot[0], -p.pivot[1]);
    ctx.drawImage(p.canvas, 0, 0);
    ctx.restore();
    // tip 世界位置 = pivot + R(rot+parentDelta)·(tip-pivot)·s
    const a = (o.rot || 0) + parentDelta * dir;
    const vx = (p.tip[0] - p.pivot[0]) * s, vy = (p.tip[1] - p.pivot[1]) * s;
    const tip = [wx + Math.cos(a) * vx - Math.sin(a) * vy, wy + Math.sin(a) * vx + Math.cos(a) * vy];
    joints[name] = { pivot: [wx, wy], tip };
    prevTipW = tip;
  }
  ctx.restore();
  return joints;
}

// 载入并键控 + 建绑定
async function loadRig(url, def) {
  const img = await loadImg(url);
  const keyed = keyGreen(img, false); // 保留原尺寸,绑定坐标 = 原图像素坐标
  return buildRig(keyed, def);
}
