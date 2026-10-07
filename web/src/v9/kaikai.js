// kaikai.js — V9 开开挖掘机:程序化 3D 模型 + 骨骼/表情接口
// 单位:车身高 1.0(地面 → 驾驶室顶)。开开面朝 +Z,+Y 向上;+X 为开开的左侧(门上"开开"字),
// 动臂装在开开右侧(−X,正面看位于画面左侧,不遮脸)。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, clamp01, lerp, mulberry32, smoothstep } from './util.js';

export const KK_COLORS = {
  paint: '#4fa6f5', paintDeep: '#2f78c4', mask: '#2c3d57', muzzle: '#ffd57e', nose: '#23262e',
  sclera: '#fbfcfe', brow: '#e1efff', metal: '#aeb8c4', chrome: '#eef2f7', barrel: '#2d3748',
  rubber: '#2e333c', lamp: '#ffb52e', hat: '#ff5e7e', hatDot1: '#ffd54f', hatDot2: '#ffffff', pom: '#fff6d8',
  dirt: '#7b5431', blush: '#ff8a80', mouthIn: '#5a1d2b', tongue: '#f07888',
};

// 上车体(圆角盒)尺寸
const BODY = { hw: 0.313, hh: 0.302, hd: 0.325, r: 0.15, cy: 0.632, cz: -0.02, inflate: 0.045 }; // 矮胖手办比例:Y×0.9 X×1.08
const ARM_X = -0.372;                    // 动臂所在侧平面(车身鼓面外侧留间隙)
const HINGE_A = new THREE.Vector3(ARM_X, 0.45, 0.17);

function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { tex: t, canvas: c, ctx: g };
}

// 圆角盒正面(+Z)表面:给定 (x,y) 求表面点与法线(盒心为原点)
function rbFront(x, y, b = BODY) {
  const dx = Math.max(0, Math.abs(x) - (b.hw - b.r));
  const dy = Math.max(0, Math.abs(y) - (b.hh - b.r));
  const d = Math.min(Math.hypot(dx, dy), b.r * 0.999);
  const s = d > 1e-6 ? Math.min(1, d / Math.hypot(dx, dy)) : 1;
  const ex = dx * s, ey = dy * s;
  const z = (b.hd - b.r) + Math.sqrt(b.r * b.r - ex * ex - ey * ey);
  const n = new THREE.Vector3(Math.sign(x) * ex, Math.sign(y) * ey, z - (b.hd - b.r)).normalize();
  return { p: new THREE.Vector3(x, y, z), n };
}

// 圆角盒 +X 侧面表面:给定 (z,y) 求表面点与法线
function rbSideX(z, y, b = BODY) {
  const dz = Math.max(0, Math.abs(z) - (b.hd - b.r));
  const dy = Math.max(0, Math.abs(y) - (b.hh - b.r));
  const d = Math.hypot(dz, dy), s = d > b.r * 0.999 ? b.r * 0.999 / d : 1;
  const ez = dz * s, ey = dy * s;
  const x = (b.hw - b.r) + Math.sqrt(b.r * b.r - ez * ez - ey * ey);
  const n = new THREE.Vector3(x - (b.hw - b.r), Math.sign(y) * ey, Math.sign(z) * ez).normalize();
  return { p: new THREE.Vector3(x, y, z), n };
}
function sidePoint(z, y, lift = 0) {
  const { p, n } = rbSideX(z, y);
  bodyDeform(p, n);
  return p.addScaledVector(n, lift);
}

// 车身形变:上收(顶部窄)+ 各面中部鼓起(毛绒玩具感)。车壳与脸部贴花共用,保证贴合
function bodyDeform(p, n) {
  const sx = Math.max(0, 1 - (p.x / BODY.hw) ** 2), sy = Math.max(0, 1 - (p.y / BODY.hh) ** 2), sz = Math.max(0, 1 - (p.z / BODY.hd) ** 2);
  const g = n.x * n.x * sy * sz + n.y * n.y * sx * sz + n.z * n.z * sx * sy;
  p.addScaledVector(n, BODY.inflate * g);
  const ty = (p.y + BODY.hh) / (2 * BODY.hh);
  const k = lerp(1.03, 0.86, ty * ty);
  p.x *= k; p.z = (p.z + 0.02) * lerp(1.0, 0.94, ty * ty) - 0.02;
  return p;
}
function deformShell(geo) {
  // RoundedBoxGeometry 段边界存在重合但独立的顶点 → computeVertexNormals 后法线在段界断裂,
  // 锐利清漆反射下呈网格暗纹。先合并重合顶点(删 uv/normal 避免属性差异阻挡合并)再算平滑法线。
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-5);
  geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
    bodyDeform(p, n);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
// 正面表面点(已形变)+ 沿法线抬升
function frontPoint(x, y, lift = 0) {
  const { p, n } = rbFront(x, y);
  bodyDeform(p, n);
  return p.addScaledVector(n, lift);
}

// 把几何体(局部 z = 离表面高度)贴合到车身正面;几何体 x,y 为车身盒局部坐标
function conformToFront(geo, lift = 0.0015) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const { p, n } = rbFront(v.x, v.y);
    bodyDeform(p, n);
    const q = p.addScaledVector(n, v.z + lift);
    pos.setXYZ(i, q.x, q.y, q.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

const PEAR = 0.16; // 吻部上窄下宽
// 椭球表面贴合(吻部上的嘴)
function conformToEllipsoid(geo, c, r, lift = 0.0015) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ux = (v.x - c.x) / r.x, uy = (v.y - c.y) / r.y;
    const k = Math.max(0.02, 1 - ux * ux - uy * uy);
    const z = c.z + r.z * Math.sqrt(k);
    const n = new THREE.Vector3((v.x - c.x) / (r.x * r.x), (v.y - c.y) / (r.y * r.y), (z - c.z) / (r.z * r.z)).normalize();
    const pear = 1 - PEAR * uy;
    pos.setXYZ(i, c.x + (v.x - c.x) * pear + n.x * lift, v.y + n.y * lift, z + n.z * lift);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// 二维带状轮廓:中心线 pts + 半宽 hw → 闭合 Shape(两端半圆)
function bandShape(pts, hw) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    L.push([pts[i][0] - ty * hw[i], pts[i][1] + tx * hw[i]]);
    R.push([pts[i][0] + ty * hw[i], pts[i][1] - tx * hw[i]]);
  }
  const s = new THREE.Shape();
  s.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) s.lineTo(L[i][0], L[i][1]);
  const e = pts[n - 1], a0 = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
  s.absarc(e[0], e[1], hw[n - 1], a0, a0 - Math.PI, true);
  for (let i = n - 2; i >= 0; i--) s.lineTo(R[i][0], R[i][1]);
  const b0 = pts[0], a1 = Math.atan2(R[0][1] - b0[1], R[0][0] - b0[0]);
  s.absarc(b0[0], b0[1], hw[0], a1, a1 - Math.PI, true);
  return s;
}

// 二次贝塞尔拐角的折线采样(鹅颈大臂)
function filletPolyline(A, K, B, rIn = 0.07, n = 14) {
  const d1 = [K[0] - A[0], K[1] - A[1]], l1 = Math.hypot(...d1);
  const d2 = [B[0] - K[0], B[1] - K[1]], l2 = Math.hypot(...d2);
  const k1 = [K[0] - d1[0] / l1 * rIn, K[1] - d1[1] / l1 * rIn];
  const k2 = [K[0] + d2[0] / l2 * rIn, K[1] + d2[1] / l2 * rIn];
  const pts = [A];
  for (let i = 1; i <= 4; i++) pts.push([lerp(A[0], k1[0], i / 4), lerp(A[1], k1[1], i / 4)]);
  for (let i = 1; i < n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * k1[0] + 2 * u * t * K[0] + t * t * k2[0], u * u * k1[1] + 2 * u * t * K[1] + t * t * k2[1]]);
  }
  for (let i = 0; i <= 4; i++) pts.push([lerp(k2[0], B[0], i / 4), lerp(k2[1], B[1], i / 4)]);
  return pts;
}

// 侧面轮廓(u=前 z, v=上 y)挤出为沿 x 的厚板,x 居中于 0
function extrudeSide(shape, thick, bevel = 0.014, segs = 4) {
  const depth = Math.max(0.001, thick - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: segs, curveSegments: 18 });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2); // shape x → +z(前),挤出 z → −x
  g.computeVertexNormals();
  return g;
}

// 蜂窝菲涅尔棱镜纹理(车灯透镜刻线)
function honeycombTex() {
  const t = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#ffc233'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(150,80,8,0.8)'; c.lineWidth = 3;
    const r = 10;
    for (let row = -1; row < 8; row++) {
      for (let col = -1; col < 8; col++) {
        const cx = col * r * 1.74 + (row % 2 ? r * 0.87 : 0), cy = row * r * 1.5;
        c.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = k / 6 * Math.PI * 2 + Math.PI / 6;
          const px = cx + Math.cos(a) * r * 0.86, py = cy + Math.sin(a) * r * 0.86;
          k ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath(); c.stroke();
      }
    }
  });
  t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping;
  t.tex.repeat.set(4, 2);
  return t.tex;
}

function mats() {
  const C = KK_COLORS;
  const honey = honeycombTex();
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: C.paint, roughness: 0.40, clearcoat: 0.7, clearcoatRoughness: 0.45, sheen: 0.45, sheenColor: new THREE.Color('#85c7ff'), sheenRoughness: 0.35 }), // r4: 车顶镜面死白收敛(r5a)
    paintDeep: new THREE.MeshPhysicalMaterial({ color: C.paintDeep, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
    mask: new THREE.MeshPhysicalMaterial({ color: C.mask, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.35 }),
    muzzle: new THREE.MeshPhysicalMaterial({ color: C.muzzle, roughness: 0.42, sheen: 0.85, sheenColor: new THREE.Color('#ffe8a8'), sheenRoughness: 0.4, clearcoat: 0.12 }),
    nose: new THREE.MeshPhysicalMaterial({ color: C.nose, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
    sclera: new THREE.MeshPhysicalMaterial({ color: C.sclera, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.5 }), // r4: 眼白高光收敛
    brow: new THREE.MeshPhysicalMaterial({ color: C.brow, roughness: 0.40, clearcoat: 0.3, clearcoatRoughness: 0.35 }), // r4: 白眉哑光化(防过曝吞眉,r5a)
    metal: new THREE.MeshStandardMaterial({ color: C.metal, metalness: 0.72, roughness: 0.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: C.chrome, metalness: 1.0, roughness: 0.18, envMapIntensity: 1.2 }), // r4: 镀铬边缘高光收敛(铲斗边缘生硬,r5a)
    barrel: new THREE.MeshStandardMaterial({ color: '#202d3d', metalness: 0.6, roughness: 0.35, envMapIntensity: 0.6 }),
    rubber: new THREE.MeshStandardMaterial({ color: C.rubber, metalness: 0.02, roughness: 0.82 }),
    rubberDk: new THREE.MeshStandardMaterial({ color: '#23272e', metalness: 0.05, roughness: 0.7 }),
    lamp: new THREE.MeshPhysicalMaterial({ color: '#ffb326', emissive: new THREE.Color('#ff9200'), emissiveIntensity: 2.2, emissiveMap: honey, map: honey, bumpMap: honey, bumpScale: 0.003, roughness: 0.3, clearcoat: 1 }), // r4: 警灯 3.2→2.2(死白过曝)
    pom: new THREE.MeshPhysicalMaterial({ color: C.pom, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.9 }),
    dirt: new THREE.MeshStandardMaterial({ color: C.dirt, roughness: 0.96 }),
    highlight: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    rimDark: new THREE.MeshPhysicalMaterial({ color: '#22314d', roughness: 0.5, clearcoat: 0.3 }),
    mouthIn: new THREE.MeshPhysicalMaterial({ color: '#6e2233', roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide }),
    tongue: new THREE.MeshPhysicalMaterial({ color: C.tongue, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    lipRim: new THREE.MeshPhysicalMaterial({ color: '#f0c86e', roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#fff1cc') }),
    rodSteel: new THREE.MeshStandardMaterial({ color: '#eef3f9', metalness: 0.98, roughness: 0.06, envMapIntensity: 0.8 }),
    lashDark: new THREE.MeshPhysicalMaterial({ color: '#111317', roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    bronze: new THREE.MeshStandardMaterial({ color: '#c89b48', metalness: 0.82, roughness: 0.36 }),
  };
  return M;
}

function shadowAll(obj) {
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}

// ------------------------------------------------------------------ 履带
const TRACK = { zs: 0.30, cy: 0.10, r: 0.085, w: 0.14, x: 0.29, blocks: 32 };
const TRACK_P = 4 * TRACK.zs + 2 * Math.PI * TRACK.r;
function trackAt(s) {
  // 顺序:上直段(向前 +z)→ 前弧(向下)→ 下直段(向后)→ 后弧(向上);返回 {z,y,ang}(ang 为切向角)
  s = ((s % TRACK_P) + TRACK_P) % TRACK_P;
  const L = 2 * TRACK.zs, A = Math.PI * TRACK.r;
  const top = TRACK.cy + TRACK.r, bot = TRACK.cy - TRACK.r;
  if (s < L) return { z: -TRACK.zs + s, y: top, ang: 0 };
  s -= L;
  if (s < A) { const a = Math.PI / 2 - s / TRACK.r; return { z: TRACK.zs + Math.cos(a) * TRACK.r, y: TRACK.cy + Math.sin(a) * TRACK.r, ang: a - Math.PI / 2 }; }
  s -= A;
  if (s < L) return { z: TRACK.zs - s, y: bot, ang: -Math.PI };
  s -= L;
  const a = -Math.PI / 2 - s / TRACK.r;
  return { z: -TRACK.zs + Math.cos(a) * TRACK.r, y: TRACK.cy + Math.sin(a) * TRACK.r, ang: a - Math.PI / 2 };
}

function buildTracks(M) {
  const g = new THREE.Group();
  const blockGeo = new RoundedBoxGeometry(TRACK.w, 0.034, 0.046, 3, 0.009);
  const blocks = new THREE.InstancedMesh(blockGeo, M.rubber, TRACK.blocks * 2);
  blocks.castShadow = blocks.receiveShadow = true;
  g.add(blocks);
  // 内侧连续带(填补齿块缝隙)
  const beltShape = new THREE.Shape();
  const ri = TRACK.r - 0.012, ro = TRACK.r + 0.004;
  beltShape.absarc(TRACK.zs, TRACK.cy, ro, -Math.PI / 2, Math.PI / 2, false);
  beltShape.absarc(-TRACK.zs, TRACK.cy, ro, Math.PI / 2, Math.PI * 1.5, false);
  const hole = new THREE.Path();
  hole.absarc(TRACK.zs, TRACK.cy, ri, -Math.PI / 2, Math.PI / 2, false);
  hole.absarc(-TRACK.zs, TRACK.cy, ri, Math.PI / 2, Math.PI * 1.5, false);
  beltShape.holes.push(hole);
  const wheels = [];
  for (const side of [-1, 1]) {
    const belt = new THREE.Mesh(extrudeSide(beltShape, TRACK.w - 0.02, 0.006, 2), M.rubberDk);
    belt.position.x = side * TRACK.x;
    g.add(belt);
    // 侧板(跑道形)+ 轮
    const plateShape = new THREE.Shape();
    plateShape.absarc(TRACK.zs, TRACK.cy, TRACK.r - 0.02, -Math.PI / 2, Math.PI / 2, false);
    plateShape.absarc(-TRACK.zs, TRACK.cy, TRACK.r - 0.02, Math.PI / 2, Math.PI * 1.5, false);
    const plate = new THREE.Mesh(extrudeSide(plateShape, TRACK.w - 0.03, 0.01, 3), M.barrel);
    plate.position.x = side * TRACK.x;
    g.add(plate);
    const wheelDefs = [[-TRACK.zs, TRACK.cy, 0.072], [TRACK.zs, TRACK.cy, 0.072], [-0.15, 0.058, 0.043], [0, 0.058, 0.043], [0.15, 0.058, 0.043]];
    for (const [z, y, r] of wheelDefs) {
      const w = new THREE.Group();
      w.position.set(side * (TRACK.x + (TRACK.w / 2 - 0.022)), y, z);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 36), M.metal);
      rim.rotation.z = Math.PI / 2;
      w.add(rim);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.5, 0.036, 24), M.chrome);
      hub.rotation.z = Math.PI / 2;
      hub.position.x = side * 0.006;
      w.add(hub);
      // 轮辐凸点(转动可见)
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2;
        const bolt = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 12, 8), M.barrel);
        bolt.position.set(side * 0.017, Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
        w.add(bolt);
      }
      w.userData.r = r;
      g.add(w);
      wheels.push({ obj: w, r, side });
    }
  }
  // 底架(两履带之间)
  const frame = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.09, 0.56, 3, 0.03), M.barrel);
  frame.position.set(0, 0.12, 0);
  g.add(frame);
  shadowAll(g);
  const dummy = new THREE.Object3D();
  function update(travelL, travelR) {
    let k = 0;
    for (const [side, travel] of [[1, travelL], [-1, travelR]]) {
      for (let i = 0; i < TRACK.blocks; i++) {
        const p = trackAt(i * TRACK_P / TRACK.blocks + travel);
        dummy.position.set(side * TRACK.x, p.y, p.z);
        dummy.rotation.set(-p.ang, 0, 0);
        dummy.updateMatrix();
        blocks.setMatrixAt(k++, dummy.matrix);
      }
    }
    blocks.instanceMatrix.needsUpdate = true;
    for (const w of wheels) w.obj.rotation.x = (w.side > 0 ? travelL : travelR) / w.r;
  }
  update(0, 0);
  return { group: g, update };
}

// ------------------------------------------------------------------ 脸
function buildFace(M) {
  const g = new THREE.Group(); // 车身盒局部坐标(盒心原点)
  const cy = BODY.cy;          // 世界 y = 局部 y + cy
  const Y = y => y - cy;

  // 布鲁伊式面罩:双眼连体,中间上收,两侧外扩包住转角
  const ms = new THREE.Shape();
  const mT = Y(0.87), mB = Y(0.55), mW = 0.255;
  ms.moveTo(0, mT - 0.06);
  ms.bezierCurveTo(0.06, mT - 0.012, 0.13, mT + 0.01, 0.195, mT - 0.006);
  ms.bezierCurveTo(0.25, mT - 0.022, mW + 0.012, mT - 0.085, mW, Y(0.705));
  ms.bezierCurveTo(mW - 0.004, Y(0.625), 0.232, mB + 0.02, 0.188, mB + 0.004);
  ms.bezierCurveTo(0.14, mB - 0.01, 0.09, mB + 0.02, 0.055, mB + 0.045);
  ms.bezierCurveTo(0.03, mB + 0.055, -0.03, mB + 0.055, -0.055, mB + 0.045); // 中缝保留 22mm 藏青鞍带
  ms.bezierCurveTo(-0.09, mB + 0.02, -0.14, mB - 0.01, -0.188, mB + 0.004);
  ms.bezierCurveTo(-0.232, mB + 0.02, -mW + 0.004, Y(0.625), -mW, Y(0.705));
  ms.bezierCurveTo(-mW - 0.012, mT - 0.085, -0.25, mT - 0.022, -0.195, mT - 0.006);
  ms.bezierCurveTo(-0.13, mT + 0.01, -0.06, mT - 0.012, 0, mT - 0.06);
  let maskGeo = new THREE.ExtrudeGeometry(ms, { depth: 0.001, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.009, bevelSegments: 6, curveSegments: 48 });
  // 挤出几何非索引 → conform 后 computeVertexNormals 会成折面;合并重合顶点获得有机平滑面
  maskGeo.deleteAttribute('normal'); maskGeo.deleteAttribute('uv');
  maskGeo = mergeVertices(maskGeo, 1e-5);
  const mask = new THREE.Mesh(conformToFront(maskGeo, 0.0005), M.mask);
  g.add(mask);

  // 眼睛
  const eyes = [];
  const R = new THREE.Vector3(0.084, 0.113, 0.036); // r3: 眼睛增大 ~14%(布鲁伊超大眼球原则;0.074→0.084/0.100→0.113)
  const pupilTex = canvasTex(256, 256, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, '#060508'); gr.addColorStop(0.45, '#0c090b'); gr.addColorStop(0.64, '#3b2515');
    gr.addColorStop(0.85, '#62402a'); gr.addColorStop(0.96, '#1c120c'); gr.addColorStop(1, '#130c08');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  // 卧蚕高光:眼线下缘柔和受光(无深线,深线由独立墨黑眼线几何承担)
  const creaseTex = canvasTex(256, 192, (c, w, h) => {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = 'rgba(190,224,252,0.4)'; c.lineWidth = 9;
    c.beginPath(); c.moveTo(w * 0.14, h * 0.52); c.bezierCurveTo(w * 0.32, h * 0.74, w * 0.64, h * 0.78, w * 0.9, h * 0.54); c.stroke();
  });
  for (const s of [-1, 1]) {
    const ex = s * 0.117, ey = Y(0.71); // 眼距 ±117mm,婴儿宽眼距
    const base = frontPoint(ex, ey, 0.004);
    const eye = new THREE.Group();
    eye.position.copy(base);
    eye.position.z -= R.z * 0.15; // 眼球内凹 15mm,消除金鱼眼脱臼
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), M.sclera);
    sclera.scale.copy(R);
    eye.add(sclera);
    // 眼眶包覆圈:深色内倾环贴在面罩表层,自然"兜住"眼球
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.0045, 16, 64), M.rimDark);
    rimRing.scale.set(1, 1.32, 0.7);
    rimRing.position.z = 0.0075;
    eye.add(rimRing);
    const pupilMat = new THREE.MeshPhysicalMaterial({ map: pupilTex.tex, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 });
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(1, 48), pupilMat);
    {
      const pos = pupil.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, (1 - (x * x + y * y)) * 0.35); }
      pos.needsUpdate = true; pupil.geometry.computeVertexNormals();
    }
    eye.add(pupil);
    // r4: 眼神光放大后回调(r5a:ø21mm 显受惊)——主 ø17mm 副 ø8mm
    const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 20, 14), M.highlight);
    const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.004, 16, 10), M.highlight);
    eye.add(hl1, hl2);
    // 眼睑:藏青半球壳(与面罩同色)+ 前缘睫毛线;闭合时整片盖住眼球前表面
    const lidGeo = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const lash = new THREE.TorusGeometry(1, 0.045, 8, 48, Math.PI);
    lash.rotateX(Math.PI / 2);   // 圆环躺在 xz 平面(半球边缘),弧段朝 +z
    const lashMat = new THREE.MeshStandardMaterial({ color: '#161b26', roughness: 0.5 });
    const mkLid = (sy, flip) => {
      const pivot = new THREE.Group();
      const m = new THREE.Mesh(lidGeo, M.mask);
      m.scale.set(R.x * 1.09, R.y * sy, R.z * 1.32);
      if (flip) m.rotation.z = Math.PI;
      const l = new THREE.Mesh(lash, lashMat);
      l.scale.set(R.x * 1.09, R.x * 1.09, R.z * 1.32);
      if (flip) l.rotation.z = Math.PI;
      pivot.add(m, l);
      return pivot;
    };
    const lidUPivot = mkLid(1.07, false), lidLPivot = mkLid(1.05, true);
    eye.add(lidUPivot, lidLPivot);
    g.add(eye);
    // 闭眼态:与面罩齐平的藏青盖板 + ᴗ 形笑弧折痕(blink≥0.5 时替换眼球,
    // 避免半球壳外凸成黑色硬块、巩膜露白的恐怖谷;对标 ref19 自然笑纹)
    // 盖板拍平(只留 30% 表面曲率)+ 中心微凹 5.5mm + 外缘 2mm 羽化下沉(消除硬切台阶)
    const coverGeo = conformToFront(new THREE.CircleGeometry(1, 40).scale(0.087, 0.111, 1).translate(ex, ey, 0), 0.0068);
    {
      const c0 = frontPoint(ex, ey, 0.0068);
      const pos = coverGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const dx = (pos.getX(i) - ex) / 0.087, dy = (pos.getY(i) - ey) / 0.111;
        const d = Math.min(1, dx * dx + dy * dy);
        const feather = d > 0.8 ? (d - 0.8) / 0.2 * 0.0022 : 0;
        pos.setZ(i, c0.z + (pos.getZ(i) - c0.z) * 0.3 - 0.0045 * (1 - d) - feather);
      }
      pos.needsUpdate = true; coverGeo.computeVertexNormals();
    }
    const cover = new THREE.Mesh(coverGeo, M.mask); // 与面罩同色藏青(ref19 一体感)
    // 闭眼笑弧:独立墨黑弹性眼线几何(ᴗ 弯月 + 外眼角 22° 上挑,中心粗 3.2mm 两端渐尖)
    // 闭眼笑弧:墨黑胶质粗弯月 piping——贴合盖板曲面(半嵌),中段 ø7.6mm 两端渐尖,外眼角 28° 上挑
    const c0z = frontPoint(ex, ey, 0.0068).z;
    const coverZ = (x, y) => {
      const dx = (x - ex) / 0.087, dy = (y - ey) / 0.111;
      const d = Math.min(1, dx * dx + dy * dy);
      const feather = d > 0.8 ? (d - 0.8) / 0.2 * 0.0022 : 0;
      const p = frontPoint(x, y, 0.0068);
      return c0z + (p.z - c0z) * 0.3 - 0.0045 * (1 - d) - feather;
    };
    const lashPts = [
      [-0.062, 0.005], [-0.031, -0.018], [0, -0.027], [0.03, -0.019], [0.056, 0.001], [0.067, 0.014], [0.072, 0.018],
    ].map(([lx, ly]) => {
      const wx = ex + (lx + 0.008) * s, wy = ey - 0.003 + ly; // 弧长收敛 0.122m,中央下沉加深,收于面罩内
      return new THREE.Vector3(wx, wy, coverZ(wx, wy) + 0.0028);
    });
    const lashCurve = new THREE.CatmullRomCurve3(lashPts);
    const lashGeo = new THREE.TubeGeometry(lashCurve, 48, 0.0038, 10, false);
    {
      // 沿弧长渐缩(中段 100% → 两端 24%)+ 截面沿面法向(z)压扁成扁椭圆(宽 6.8 × 厚 3.6mm)
      const pos = lashGeo.attributes.position, uv = lashGeo.attributes.uv;
      const c0 = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        const t = uv.getX(i);
        const k = 0.24 + 0.76 * Math.pow(Math.sin(Math.PI * clamp01(t)), 0.5);
        lashCurve.getPoint(t, c0);
        pos.setXYZ(i, c0.x + (pos.getX(i) - c0.x) * k, c0.y + (pos.getY(i) - c0.y) * k, c0.z + (pos.getZ(i) - c0.z) * k * 0.53);
      }
      pos.needsUpdate = true; lashGeo.computeVertexNormals();
    }
    const closedLash = new THREE.Mesh(lashGeo, M.lashDark);
    // 卧蚕高光贴花(柔和下睑缘受光,无深线)
    const creaseMat = new THREE.MeshStandardMaterial({ map: creaseTex.tex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, side: THREE.DoubleSide, opacity: 0 });
    const crease = new THREE.Mesh(conformToFront(new THREE.PlaneGeometry(0.15, 0.11).scale(s, 1, 1).translate(ex, ey - 0.005, 0), 0.009), creaseMat);
    cover.visible = crease.visible = closedLash.visible = false;
    crease.renderOrder = 3;
    g.add(cover, crease, closedLash);
    eyes.push({ eye, sclera, pupil, hl1, hl2, lidUPivot, lidLPivot, cover, crease, creaseMat, closedLash, R, s });
  }

  // 眉毛:扁平、中间厚两端收,贴额头
  // 眉毛:柳叶弯月——内端宽厚(~14mm),外端渐尖(~3mm)并微翘,贴额头后弯
  const brows = [];
  const browGeo = new THREE.CapsuleGeometry(0.026, 0.085, 8, 24); // r4: 眉加粗 0.02→0.026(白粗眉存在感)
  {
    const pos = browGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const t = clamp01((y + 0.0625) / 0.125);  // 0=内端 1=外端
      const k = lerp(1.0, 0.22, t);             // 外端渐尖
      const flick = Math.pow(t, 2.4) * 0.014;   // 尾端微翘
      pos.setXYZ(i, x * k, y + flick, z * k * 0.5 - (y * y) * 2.1); // 强后弯贴紧额头球面
    }
    browGeo.computeVertexNormals();
  }
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(browGeo, M.brow);
    const bx = s * 0.112, by = Y(0.905);
    const bp = frontPoint(bx, by, 0.0);
    const pivot = new THREE.Group();
    pivot.position.copy(bp);
    b.rotation.z = s * Math.PI / 2; // 厚端朝鼻
    pivot.add(b);
    g.add(pivot);
    brows.push({ pivot, s, base: bp.clone() });
  }

  // 吻部(奶油黄,饱满梨形)+ 大黑鼻
  const muzBase = frontPoint(0, Y(0.5), -0.03);
  const muzC = new THREE.Vector3(0, Y(0.5), muzBase.z);
  const muzR = new THREE.Vector3(0.18, 0.125, 0.196); // 吻部占面宽 62%,高度 +15% 贴近下眼眶
  const muzGeo = new THREE.SphereGeometry(1, 72, 48);
  {
    const pos = muzGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x0 = pos.getX(i), y = pos.getY(i), z0 = pos.getZ(i);
      const cheek = smoothstep(0.35, 0.85, Math.abs(x0)) * smoothstep(0.2, -0.55, y); // 两侧笑肌隆起(婴儿肥)
      const x1 = x0 * (1 - PEAR * y) * (1 + 0.065 * cheek);
      let z1 = z0;
      for (const sd of [-1, 1]) {
        const ddx = x1 - sd * 0.7, ddy = y + 0.14;
        z1 *= 1 - 0.065 * Math.exp(-(ddx * ddx + ddy * ddy) / (0.15 * 0.15));   // 嘴角 3D 酒窝深陷 ~-7mm
        const bbx = x1 - sd * 0.5, bby = y - 0.12;
        z1 *= 1 + 0.045 * Math.exp(-(bbx * bbx + bby * bby) / (0.2 * 0.2));     // 苹果肌/嘟嘟肉隆起 +9.5mm
      }
      z1 *= lerp(1, 0.55, smoothstep(0.55, 1.0, y)); // 吻部顶部收进面罩鞍带之下
      pos.setXYZ(i, x1, y, z1);
    }
    muzGeo.computeVertexNormals();
  }
  const muzzle = new THREE.Mesh(muzGeo, M.muzzle);
  muzzle.scale.copy(muzR); muzzle.position.copy(muzC);
  g.add(muzzle);
  // 鼻头:倒钝三角水滴盾台(顶宽 0.112 底收 0.058,R32 超圆角,微下垂)
  const noseGeo = new RoundedBoxGeometry(0.112, 0.076, 0.054, 4, 0.032);
  {
    const pos = noseGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = clamp01((y + 0.038) / 0.076);
      pos.setX(i, pos.getX(i) * lerp(0.52, 1.0, t)); // 顶宽底收
    }
    noseGeo.computeVertexNormals();
  }
  const nose = new THREE.Mesh(noseGeo, M.nose);
  nose.rotation.x = -0.18;
  const noseY = Y(0.585);
  const nk = 1 - Math.pow((noseY - muzC.y) / muzR.y, 2);
  nose.position.set(0, noseY, muzC.z + muzR.z * Math.sqrt(Math.max(0.05, nk)) - 0.008); // 后退 12mm 贴紧吻部
  g.add(nose);
  const noseHl = new THREE.Mesh(new THREE.SphereGeometry(0.009, 14, 10), new THREE.MeshBasicMaterial({ color: '#e9eef6', transparent: true, opacity: 0.85 }));
  noseHl.position.set(-0.018, noseY + 0.022, nose.position.z + 0.022);
  noseHl.scale.set(1.33, 0.9, 0.55);
  g.add(noseHl);
  // 盾形鼻头自带大圆角过渡,无需倒角圈

  // 嘴:吻部下半的贴合画布(按口型参数重绘)
  const mouthCanvas = canvasTex(512, 320, () => {});
  const mouthGeo = new THREE.PlaneGeometry(0.2, 0.125, 48, 30);
  mouthGeo.translate(0, Y(0.448), 0);
  conformToEllipsoid(mouthGeo, muzC, muzR, 0.0015);
  const mouthMat = new THREE.MeshPhysicalMaterial({ map: mouthCanvas.tex, transparent: true, roughness: 0.4, clearcoat: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.renderOrder = 2;
  g.add(mouth);
  let lastMouthKey = '';
  // 3D 张嘴组:月牙 D 形浅碟口腔(上平下圆、宽:高≈1.8)+ 平铺舌;边缘无唇环,靠碟沿倒角读唇线
  const mouth3d = new THREE.Group();
  {
    const my = Y(0.462), uy = (my - muzC.y) / muzR.y;
    const zs = muzC.z + muzR.z * Math.sqrt(Math.max(0.02, 1 - uy * uy));
    mouth3d.position.set(0, my, zs + 0.0145);
    const dishGeo = new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    dishGeo.rotateX(-Math.PI / 2); // 凹面朝 +z
    {
      // 上半压平 → 上唇线平直微拱;两端嘴角上提 +12mm → 咧嘴弯月
      const pos = dishGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        let y1 = y > 0 ? y * 0.42 : y;
        const corner = Math.max(0, Math.abs(x) - 0.6) / 0.4;
        y1 += corner * 0.24; // 几何在缩放前,×0.05 ≈ +12mm
        pos.setY(i, y1);
      }
      dishGeo.computeVertexNormals();
    }
    const dish = new THREE.Mesh(dishGeo, M.mouthIn);
    dish.scale.set(0.098, 0.055, 0.014); // 咧嘴大笑:宽度覆盖吻部 65%
    mouth3d.add(dish);
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.tongue);
    tongue.geometry.rotateX(Math.PI / 2); // 凸面朝 +z,平铺微凹弧面
    tongue.scale.set(0.055, 0.022, 0.009);
    tongue.position.set(0.002, -0.016, 0.0);
    mouth3d.add(tongue);
    mouth3d.visible = false;
    g.add(mouth3d);
  }

  function drawMouth(open, smile, wide) {
    const key = `${(open * 40) | 0}_${(smile * 20) | 0}_${(wide * 20) | 0}`;
    if (key === lastMouthKey) return;
    lastMouthKey = key;
    const c = mouthCanvas.ctx, W = 512, H = 320;
    c.clearRect(0, 0, W, H);
    if (open <= 0.06) {
      // 闭嘴微笑:暗沟 + 下缘受光 + 两端酒窝
      const cx = W / 2, top = H * 0.3;
      const hw = W * (0.26 + 0.05 * wide + 0.03 * smile); // 笑线端点延伸至 ±0.14m 刺入面颊
      const lift = H * (0.07 + 0.09 * smile);
      const depth = H * 0.04;
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = 'rgba(255,240,205,0.6)'; c.lineWidth = 10;
      c.beginPath(); c.moveTo(cx - hw, top - lift + 7); c.quadraticCurveTo(cx, top + depth * 2.2 + 7, cx + hw, top - lift + 7); c.stroke();
      c.strokeStyle = '#4a2320'; c.lineWidth = 10;
      c.beginPath(); c.moveTo(cx - hw, top - lift); c.quadraticCurveTo(cx, top + depth * 2.2, cx + hw, top - lift); c.stroke();
      // 酒窝由吻部 3D 内陷承担,贴花不再重复绘制
    }
    mouthCanvas.tex.needsUpdate = true;
  }
  drawMouth(0, 0.6, 0.3);

  // 腮红
  const blushTex = canvasTex(128, 128, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,128,122,0.9)'); gr.addColorStop(0.55, 'rgba(255,128,122,0.42)'); gr.addColorStop(1, 'rgba(255,128,122,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  const blushMat = new THREE.MeshStandardMaterial({ map: blushTex.tex, transparent: true, opacity: 0.5, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  for (const s of [-1, 1]) {
    const bg = new THREE.PlaneGeometry(0.1, 0.075, 12, 10);
    bg.translate(s * 0.212, Y(0.515), 0);
    const bm = new THREE.Mesh(conformToFront(bg, 0.0025), blushMat);
    bm.renderOrder = 3;
    g.add(bm);
  }

  function update(p) {
    for (const e of eyes) {
      const side = e.s < 0 ? 'R' : 'L'; // 开开自己的右眼在 −x
      const blink = clamp01(p[`blink${side}`] ?? p.blink ?? 0);
      const squint = clamp01(p[`squint${side}`] ?? p.squint ?? 0);
      const lx = clamp(p.lookX ?? 0, -1, 1), ly = clamp(p.lookY ?? 0, -1, 1);
      const px = lx * e.R.x * 0.4 + e.s * -0.0025; // 轻微内聚
      const py = ly * e.R.y * 0.36 - 0.002;       // 幼态微上抬
      const k = Math.max(0.05, 1 - (px / e.R.x) ** 2 - (py / e.R.y) ** 2);
      const pz = e.R.z * Math.sqrt(k);
      e.pupil.position.set(px, py, pz - 0.0035);
      e.pupil.rotation.set(-py * 3.0, px * 3.0, 0);
      const dil = 1 + (p.pupil ?? 0) * 0.18;
      e.pupil.scale.set(0.043 * dil, 0.057 * dil, 0.02);
      e.hl1.position.set(px + 0.019, py + 0.024, pz + 0.006);
      e.hl2.position.set(px - 0.016, py - 0.022, pz + 0.004);
      // 半闭以下用眼睑壳动画;≥0.5 切换为齐平盖板 + 笑弧(隐藏眼球,杜绝露白/外凸)
      const closed = blink >= 0.5;
      e.sclera.visible = e.pupil.visible = !closed;
      e.hl1.visible = e.hl2.visible = blink < 0.55;
      e.lidUPivot.visible = e.lidLPivot.visible = !closed;
      e.cover.visible = e.crease.visible = e.closedLash.visible = closed;
      e.creaseMat.opacity = smoothstep(0.5, 0.8, blink);
      // 上眼睑:−1.58(完全藏入颅骨,杜绝睫毛环穿面罩倒刺)→ +1.62(整片盖住前表面)
      const up = Math.max(blink, squint * 0.3);
      e.lidUPivot.rotation.x = lerp(-1.58, 1.62, up);
      // 下眼睑:1.3(藏在下方)→ 0.62(笑眼上推)→ 闭眼时与上睑会合
      e.lidLPivot.rotation.x = lerp(lerp(1.3, 0.62, squint), 0.0, blink * 0.35);
    }
    for (const b of brows) {
      const side = b.s < 0 ? 'R' : 'L';
      const raise = p[`brow${side}`] ?? p.brow ?? 0;
      const blinkS = clamp01(p[`blink${side}`] ?? p.blink ?? 0);
      const tilt = (p.browTilt ?? 0) * b.s;
      b.pivot.position.set(b.base.x, b.base.y + raise * 0.02 - blinkS * 0.016, b.base.z - Math.abs(raise) * 0.004);
      b.pivot.rotation.z = b.s * -0.12 + tilt * 0.35 + blinkS * b.s * 0.26; // 眨眼时外端上扬成 ⌒ 微拱笑眉
    }
    const mOpen = clamp01(p.mouthOpen ?? 0);
    mouth3d.visible = mOpen > 0.06;
    if (mouth3d.visible) mouth3d.scale.set(0.55 + 0.45 * mOpen, 0.5 + 0.55 * mOpen, 1);
    drawMouth(mOpen, clamp01(p.smile ?? 0.6), clamp01(p.mouthWide ?? 0.3));
  }
  return { group: g, update };
}

// ------------------------------------------------------------------ "开开"门贴花(+X 侧,贴合鼓面,带浮雕)
function buildDoor() {
  const drawText = (c, w, h, fill, stroke) => {
    c.font = '900 330px "Noto Sans CJK SC", sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = stroke; c.lineWidth = 46; c.strokeText('挖挖', w / 2 - 10, h * 0.6); // r3: 挖掘机命名"挖挖"(开开是宝宝)
    c.fillStyle = fill; c.fillText('挖挖', w / 2 - 10, h * 0.6);
  };
  const tex = canvasTex(1024, 1024, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const rr = (x, y, ww, hh, r) => { c.beginPath(); c.roundRect(x, y, ww, hh, r); };
    c.lineWidth = 10; c.strokeStyle = 'rgba(18,48,92,0.5)';
    rr(80, 50, w - 160, h - 130, 110); c.stroke();
    c.lineWidth = 6; c.strokeStyle = 'rgba(200,232,255,0.45)';
    rr(88, 60, w - 176, h - 146, 104); c.stroke();
    c.fillStyle = 'rgba(25,55,105,0.45)'; rr(w - 300, 300, 140, 44, 22); c.fill();
    c.fillStyle = '#e6edf5'; rr(w - 296, 292, 132, 34, 17); c.fill();
    c.save();
    c.shadowColor = 'rgba(8,36,84,0.5)'; c.shadowBlur = 22; c.shadowOffsetY = 12;
    drawText(c, w, h, '#fff8ed', '#fff8ed');
    c.restore();
    drawText(c, w, h, '#fff8ed', '#fff8ed');
  });
  const bump = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.filter = 'blur(6px)';
    drawText(c, w, h, '#fff', '#fff');
  }, { srgb: false });
  const geo = new THREE.PlaneGeometry(0.5, 0.5, 24, 24);
  {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i), v = pos.getY(i);
      const q = sidePoint(-u - 0.03, v - 0.03, 0.0015);   // 平面 x → 车身 −z(车头在 +z)
      pos.setXYZ(i, q.x, q.y, q.z);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  }
  const mat = new THREE.MeshPhysicalMaterial({ map: tex.tex, bumpMap: bump.tex, bumpScale: 3.8, transparent: true, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.15, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 2;
  return m;
}

// 门侧扶手(镀铬弯管)
function buildRail(M) {
  const pts = [[0.2, -0.2], [0.2, -0.05], [0.2, 0.12]].map(([z, y]) => sidePoint(z, y, 0.035));
  const a0 = sidePoint(0.2, -0.2, 0.0), a1 = sidePoint(0.2, 0.12, 0.0);
  const curve = new THREE.CatmullRomCurve3([a0, pts[0], pts[1], pts[2], a1]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.011, 12), M.chrome);
  tube.castShadow = true;
  return tube;
}

// ------------------------------------------------------------------ 派对帽
function buildHat(M) {
  const tex = canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = KK_COLORS.hat; c.fillRect(0, 0, w, h);
    // 竖条亮暗(纸质褶)
    for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)'; c.fillRect(i * w / 16, 0, w / 16, h); }
    const rnd = mulberry32(7);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w, y = 20 + rnd() * (h - 30);
      const r = 9 + (y / h) * 12;
      c.fillStyle = i % 3 === 0 ? KK_COLORS.hatDot2 : KK_COLORS.hatDot1;
      c.beginPath(); c.ellipse(x, y, r * 0.55, r, 0, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#ffd54f'; c.fillRect(0, h - 16, w, 16); // 帽檐金边
  });
  tex.tex.wrapS = THREE.RepeatWrapping;
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.094, 0.27, 48, 1, true), new THREE.MeshPhysicalMaterial({ map: tex.tex, roughness: 0.62, sheen: 0.4, side: THREE.DoubleSide }));
  cone.position.y = 0.135;
  g.add(cone);
  // 帽底褶皱布质底圈(深粉,遮住帽/车顶接缝,消除倾斜后的悬空漏光)
  const ruffle = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.009, 12, 48), new THREE.MeshPhysicalMaterial({ color: '#d63d5c', roughness: 0.68, sheen: 0.5, sheenColor: new THREE.Color('#ffb8c4'), sheenRoughness: 0.5 }));
  ruffle.rotation.x = Math.PI / 2;
  ruffle.scale.set(1, 0.72, 1);
  ruffle.position.y = 0.004;
  g.add(ruffle);
  const pomGeo = new THREE.IcosahedronGeometry(0.032, 4);
  {
    const pos = pomGeo.attributes.position, rnd = mulberry32(3);
    for (let i = 0; i < pos.count; i++) { const k = 1 + (rnd() - 0.5) * 0.28; pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k); }
    pomGeo.computeVertexNormals();
  }
  const pomPivot = new THREE.Group(); pomPivot.position.y = 0.27;
  const pom = new THREE.Mesh(pomGeo, M.pom); pom.position.y = 0.012;
  pomPivot.add(pom);
  g.add(pomPivot);
  shadowAll(g);
  return { group: g, pomPivot };
}

// ------------------------------------------------------------------ 动臂/斗杆/铲斗
// 臂平面坐标 (u=前 z, v=上 y),铰点 A 为原点
const BOOM_K = [0.182, 0.36], BOOM_B = [0.445, 0.405];
const STICK_C = [0.125, -0.42];

function buildArm(M) {
  const arm = new THREE.Group();
  arm.position.copy(HINGE_A);
  // 支座(把臂挂到车身侧)
  const bracket = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.2, 0.22, 3, 0.03), M.paintDeep);
  bracket.position.set(0.028, -0.05, 0.02);
  arm.add(bracket);

  const boomPivot = new THREE.Group();
  arm.add(boomPivot);
  const boomPts = filletPolyline([0, 0], BOOM_K, BOOM_B, 0.09, 16);
  const boomHW = boomPts.map((_, i) => { const t = i / (boomPts.length - 1); return t < 0.45 ? lerp(0.056, 0.064, t / 0.45) : lerp(0.064, 0.047, (t - 0.45) / 0.55); });
  const boom = new THREE.Mesh(extrudeSide(bandShape(boomPts, boomHW), 0.14, 0.022, 6), M.paint);
  boomPivot.add(boom);
  // 举升缸双耳腹挂座:左右耳板(厚 12mm 间距 32mm)下延 0.12m + 杆端 ø36/ø24 铰套
  {
    const lugShape = new THREE.Shape();
    lugShape.moveTo(0.06, 0.24); lugShape.lineTo(0.185, 0.24); lugShape.lineTo(0.152, 0.055); lugShape.lineTo(0.108, 0.055); lugShape.closePath();
    for (const lx of [0.006, 0.05]) { // 双耳中心,内距 32mm 夹 ø28 缸头
      const lug = new THREE.Mesh(extrudeSide(lugShape, 0.012, 0.005, 2), M.paintDeep);
      lug.position.x = lx;
      boomPivot.add(lug);
    }
    // 杆端圆环铰套(ø36 外/ø24 内,嵌双耳间,贯穿销轴)
    const sleeve = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 10, 28), M.chrome);
    sleeve.rotation.y = Math.PI / 2;
    sleeve.position.set(0.028, 0.065, 0.13);
    boomPivot.add(sleeve);
  }
  // 双侧工字加筋槽面板(深色微凸,读出内凹筋槽)
  for (const sx of [-1, 1]) {
    const boomPanel = new THREE.Mesh(extrudeSide(bandShape(boomPts.slice(3, -3), boomHW.slice(3, -3).map(w => w * 0.62)), 0.012, 0.004, 2), M.paintDeep);
    boomPanel.position.x = sx * 0.07;
    boomPivot.add(boomPanel);
  }

  const stickPivot = new THREE.Group();
  stickPivot.position.set(0, BOOM_B[1], BOOM_B[0]);
  boomPivot.add(stickPivot);
  const stickPts = [[-0.055, 0.1], [-0.02, 0.04], [0, 0], [0.03, -0.1], [0.07, -0.22], [0.1, -0.33], STICK_C];
  const stickHW = [0.034, 0.042, 0.047, 0.045, 0.041, 0.037, 0.033];
  const stick = new THREE.Mesh(extrudeSide(bandShape(stickPts, stickHW), 0.12, 0.02, 6), M.paint);
  stickPivot.add(stick);
  for (const sx of [-1, 1]) {
    const stickPanel = new THREE.Mesh(extrudeSide(bandShape(stickPts.slice(2, -1), stickHW.slice(2, -1).map(w => w * 0.6)), 0.012, 0.004, 2), M.paintDeep);
    stickPanel.position.x = sx * 0.06;
    stickPivot.add(stickPanel);
  }

  const bucketPivot = new THREE.Group();
  bucketPivot.position.set(0, STICK_C[1], STICK_C[0]);
  stickPivot.add(bucketPivot);
  // 铲斗:J 形卷板 + 两侧板 + 4 齿;铰点在原点,开口朝前
  const bk = [[0.03, 0.035], [-0.035, 0.0], [-0.075, -0.07], [-0.08, -0.15], [-0.045, -0.215], [0.02, -0.245], [0.1, -0.245], [0.165, -0.215]];
  const bshell = new THREE.Mesh(extrudeSide(bandShape(bk, bk.map(() => 0.02)), 0.225, 0.014, 4), M.metal);
  bucketPivot.add(bshell);
  const sideShape = new THREE.Shape();
  sideShape.moveTo(bk[0][0], bk[0][1]);
  for (let i = 1; i < bk.length; i++) sideShape.lineTo(bk[i][0], bk[i][1]);
  sideShape.lineTo(0.1, -0.12); sideShape.lineTo(0.05, -0.02); sideShape.closePath();
  for (const s of [-1, 1]) {
    const sp = new THREE.Mesh(extrudeSide(sideShape, 0.026, 0.009, 3), M.metal);
    sp.position.x = s * 0.1;
    bucketPivot.add(sp);
  }
  const lip = bk[bk.length - 1];
  const toothGeo = new RoundedBoxGeometry(0.044, 0.03, 0.06, 4, 0.014); // 钝头糖果圆角
  for (let i = 0; i < 4; i++) {
    const tth = new THREE.Mesh(toothGeo, M.chrome);
    tth.position.set(-0.075 + i * 0.05, lip[1] + 0.015, lip[0] + 0.026);
    tth.rotation.x = -0.45;
    bucketPivot.add(tth);
  }
  // 斗内土(payload)
  const loadGeo = new THREE.IcosahedronGeometry(1, 4);
  {
    const pos = loadGeo.attributes.position, rnd = mulberry32(11);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = 1 + (rnd() - 0.5) * 0.22 + 0.12 * Math.sin(x * 9 + z * 7);
      pos.setXYZ(i, x * k, y * k * (y < 0 ? 0.6 : 1), z * k);
    }
    loadGeo.computeVertexNormals();
  }
  const payload = new THREE.Mesh(loadGeo, M.dirt);
  payload.position.set(0, -0.12, 0.03);
  bucketPivot.add(payload);

  // 销轴帽
  const pinGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.1, 28);
  const capGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.104, 20); // ø28 端帽
  const pin = (parent, u, v, len = 0.1) => {
    const p = new THREE.Mesh(pinGeo, M.chrome); p.rotation.z = Math.PI / 2; p.scale.y = len / 0.1; p.position.set(0, v, u); parent.add(p);
    const c = new THREE.Mesh(capGeo, M.barrel); c.rotation.z = Math.PI / 2; c.scale.y = len / 0.1; c.position.set(0, v, u); parent.add(c);
  };
  pin(boomPivot, 0, 0, 0.16);
  pin(stickPivot, 0, 0, 0.14);
  pin(bucketPivot, 0, 0, 0.23);
  pin(boomPivot, 0.13, 0.065, 0.11); // 举升缸耳座销轴

  // 液压缸锚点(随各自父级运动)
  const anchor = (parent, u, v) => { const o = new THREE.Object3D(); o.position.set(0, v, u); parent.add(o); return o; };
  const cyl = [
    { a: anchor(arm, -0.04, -0.12), b: anchor(boomPivot, 0.13, 0.065), r: 0.026, off: 0.052 },  // 大臂举升缸:ø52 筒,off +0.052 露身位
    { a: anchor(boomPivot, 0.2, 0.445), b: anchor(stickPivot, -0.06, 0.105), r: 0.018, off: -0.065 }, // 斗杆缸(r3: off 0→-0.065 偏置支架,原与斗杆本体同轴穿模,物理审查建议 7)
    { a: anchor(stickPivot, 0.02, 0.0), b: anchor(bucketPivot, -0.045, 0.035), r: 0.015, off: -0.078 }, // 铲斗缸(外侧,避让加厚斗杆)
  ];
  const cylGroup = new THREE.Group();
  arm.add(cylGroup);
  for (const c of cyl) {
    c.barrel = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r, 1, 24), M.barrel);
    c.rod = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.62, c.r * 0.62, 1, 20), M.rodSteel); // 抛光钢(低 env,不再反绿光)
    c.cap = new THREE.Mesh(new THREE.SphereGeometry(c.r * 1.15, 16, 12), M.barrel);
    c.capB = new THREE.Mesh(new THREE.SphereGeometry(c.r * 0.95, 16, 12), M.rodSteel); // 杆端关节球,消除悬空断裂感
    cylGroup.add(c.barrel, c.rod, c.cap, c.capB);
  }
  shadowAll(arm);

  const va = new THREE.Vector3(), vb = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const inv = new THREE.Matrix4();
  function update(p) {
    boomPivot.rotation.x = -(p.boom ?? 0);
    stickPivot.rotation.x = -(p.stick ?? 0);
    bucketPivot.rotation.x = -(p.bucket ?? 0);
    const load = clamp01(p.payload ?? 0);
    payload.visible = load > 0.02;
    payload.scale.set(0.085 * lerp(0.6, 1, load), 0.075 * load, 0.075 * lerp(0.6, 1, load));
    payload.position.set(0, -0.14 + 0.05 * load, 0.035);
    arm.updateMatrixWorld(true);
    inv.copy(arm.matrixWorld).invert();
    for (const c of cyl) {
      va.setFromMatrixPosition(c.a.matrixWorld).applyMatrix4(inv);
      vb.setFromMatrixPosition(c.b.matrixWorld).applyMatrix4(inv);
      va.x = vb.x = c.off;
      dir.subVectors(vb, va);
      const L = dir.length();
      c.L0 ??= L; // r3: 首帧锚距作定长基准
      dir.normalize();
      q.setFromUnitVectors(up, dir);
      // r3: 缸筒/活塞杆长度恒定(原 bl=L*0.62 缸筒非法弹性拉伸,物理审查阻断 5);
      //     铰距变化只改变杆在缸内插入深度;0.98 clamp 防极端姿态顶穿对端
      const bl = Math.min(c.L0 * 0.72, L * 0.98);
      const rl = Math.min(c.L0 * 0.72, L * 0.98);
      c.barrel.quaternion.copy(q); c.barrel.scale.set(1, bl, 1); c.barrel.position.copy(va).addScaledVector(dir, bl / 2);
      c.rod.quaternion.copy(q); c.rod.scale.set(1, rl, 1); c.rod.position.copy(vb).addScaledVector(dir, -rl / 2);
      c.cap.position.copy(va); c.capB.position.copy(vb);
    }
  }
  return { group: arm, update, bucketPivot, stickPivot, boomPivot };
}

// ------------------------------------------------------------------ 组装
export function buildKaikai() {
  const M = mats();
  const root = new THREE.Group();          // 世界位置 + 航向
  const chassis = new THREE.Group();       // 颠簸/俯仰/侧倾
  root.add(chassis);
  const tracks = buildTracks(M);
  chassis.add(tracks.group);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.25, 0.07, 48), M.barrel);
  ring.position.y = 0.235;
  chassis.add(ring);
  const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 48), M.metal);
  ring2.position.y = 0.262;
  chassis.add(ring2);

  const upperPivot = new THREE.Group();    // 回转台:yaw(swing)+ 挤压拉伸
  upperPivot.position.y = 0.25;
  chassis.add(upperPivot);
  const upper = new THREE.Group();
  upper.position.y = -0.25;
  upperPivot.add(upper);

  const skirt = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.09, 0.66, 5, 0.045), M.metal);
  skirt.position.set(0, 0.3, BODY.cz);
  upper.add(skirt);

  const bodyBox = new THREE.Group();       // 车身盒局部坐标:盒心为原点
  bodyBox.position.set(0, BODY.cy, BODY.cz);
  upper.add(bodyBox);
  const shell = new THREE.Mesh(deformShell(new RoundedBoxGeometry(BODY.hw * 2, BODY.hh * 2, BODY.hd * 2, 14, BODY.r)), M.paint);
  bodyBox.add(shell);
  const cw = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.27, 0.2, 6, 0.08), M.paintDeep);
  cw.position.set(0, 0.47 - BODY.cy, -0.37 - BODY.cz);
  bodyBox.add(cw);
  // 车顶琥珀灯:八字外倾"萌耳"姿态(基线 ref02/ref19 辨识度特征)
  const lamps = [];
  for (const s of [-1, 1]) {
    const lg = new THREE.Group();
    lg.position.set(s * 0.225, BODY.hh - 0.004, 0.08);
    lg.rotation.z = -s * 0.28; // 外倾 16°
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.064, 0.04, 28), M.bronze); // 拉丝古铜金灯座
    base.position.y = 0.012;
    lg.add(base);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.044, 24, 16), M.lamp); // 琥珀凝脂发光体(贴外罩内壁)
    core.position.y = 0.042;
    lg.add(core);
    const glow = new THREE.PointLight('#ffc233', 0.6, 0.25); // 微型暖阳点光(衰减收紧防顶部死白)
    glow.position.y = 0.06;
    lg.add(glow);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.048, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({ color: '#ffc952', emissive: new THREE.Color('#ffae2b'), emissiveIntensity: 0.25, roughness: 0.22, specularIntensity: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2, transparent: true, opacity: 0.88 }));
    dome.position.y = 0.032;
    lg.add(dome);
    bodyBox.add(lg);
    lamps.push(core);
  }
  const face = buildFace(M);
  bodyBox.add(face.group);
  bodyBox.add(buildDoor());
  bodyBox.add(buildRail(M));
  const hat = buildHat(M);
  const hatPivot = new THREE.Group();
  hatPivot.position.set(0.0, BODY.hh - 0.0015, 0.02);
  hatPivot.add(hat.group);
  bodyBox.add(hatPivot);
  shadowAll(bodyBox);

  const arm = buildArm(M);
  upper.add(arm.group);

  // 履带接触 AO 贴片(随车移动,消除悬浮感)
  const aoTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const x2 = c.getContext('2d');
    x2.translate(64, 128); x2.scale(0.5, 1);
    const g2 = x2.createRadialGradient(0, 0, 8, 0, 0, 120);
    g2.addColorStop(0, 'rgba(22,28,12,0.88)'); g2.addColorStop(0.65, 'rgba(22,28,12,0.4)'); g2.addColorStop(1, 'rgba(22,28,12,0)');
    x2.fillStyle = g2; x2.fillRect(-128, -256, 256, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  for (const s of [-1, 1]) {
    const ao = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.86), new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false }));
    ao.rotation.x = -Math.PI / 2; ao.position.set(s * TRACK.x, 0.003, 0);
    ao.renderOrder = 1;
    root.add(ao);
  }

  const pose = {};
  function setPose(p) {
    Object.assign(pose, p);
    root.position.set(p.x ?? 0, 0, p.z ?? 0);
    root.rotation.y = p.yaw ?? 0;
    // r3: bob 从整车(chassis 含履带)改为上车体(upperPivot,回转支承上的悬挂浮沉)——
    //     履带车永不整机腾空(物理审查 seg1 阻断 1/2:bob 0.17 履带拔地悬浮/跳舞底盘离草)
    upperPivot.position.y = 0.25 + (p.bob ?? 0);
    chassis.rotation.x = p.pitch ?? 0;
    chassis.rotation.z = p.roll ?? 0;
    // r3: squash 硬上限 0.12(>0.12 时裙甲切入回转支承/履带穿模,物理审查 seg3 阻断 2)
    const sq = Math.min(p.squash ?? 0, 0.12);
    upperPivot.rotation.y = p.swing ?? 0;
    upperPivot.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    upperPivot.rotation.x = p.lean ?? 0;
    upperPivot.rotation.z = p.tilt ?? 0;
    tracks.update(p.trackL ?? 0, p.trackR ?? 0);
    face.update(p);
    hatPivot.rotation.set(-0.06 + (p.hatX ?? 0), 0, -0.24 + (p.hatZ ?? 0));
    hat.pomPivot.rotation.set((p.hatX ?? 0) * 1.6, 0, (p.hatZ ?? 0) * 1.8);
    for (const l of lamps) l.material.emissiveIntensity = 2.2 + (p.lamp ?? 0) * 2.0; // r4: 与材质基准同步降
    arm.update(p);
  }
  setPose({});
  // 铲斗齿尖世界坐标(特效/泥块用)
  const tipLocal = new THREE.Vector3(0, -0.23, 0.17);
  function bucketTip(out = new THREE.Vector3()) {
    root.updateMatrixWorld(true);
    return out.copy(tipLocal).applyMatrix4(arm.bucketPivot.matrixWorld);
  }
  function bucketCenter(out = new THREE.Vector3()) {
    root.updateMatrixWorld(true);
    return out.set(0, -0.12, 0.04).applyMatrix4(arm.bucketPivot.matrixWorld);
  }
  function faceAnchor(out = new THREE.Vector3()) {
    root.updateMatrixWorld(true);
    return out.set(0, 0.69 - BODY.cy, BODY.hd).applyMatrix4(bodyBox.matrixWorld);
  }
  return { root, setPose, pose, bucketTip, bucketCenter, faceAnchor, materials: M };
}

// ------------------------------------------------------------------ 动臂解析 IK(上车体局部坐标,臂平面 u=z, v=y)
const IK_L1 = Math.hypot(BOOM_B[0], BOOM_B[1]), IK_P1 = Math.atan2(BOOM_B[1], BOOM_B[0]);
const IK_L2 = Math.hypot(STICK_C[0], STICK_C[1]), IK_P2 = Math.atan2(STICK_C[1], STICK_C[0]);
export const ARM = { x: ARM_X, A: [HINGE_A.z, HINGE_A.y], tip: [0.17, -0.23] };
// 铲斗齿尖目标 (tz, ty) + 铲斗总角 → 三关节角(肘部朝上解)
export function armIK(tz, ty, bucketTotal) {
  const cz = tz - (ARM.tip[0] * Math.cos(bucketTotal) - ARM.tip[1] * Math.sin(bucketTotal));
  const cy = ty - (ARM.tip[0] * Math.sin(bucketTotal) + ARM.tip[1] * Math.cos(bucketTotal));
  const du = cz - HINGE_A.z, dv = cy - HINGE_A.y;
  const d = clamp(Math.hypot(du, dv), Math.abs(IK_L1 - IK_L2) + 1e-3, IK_L1 + IK_L2 - 1e-3);
  const base = Math.atan2(dv, du);
  const a = Math.acos(clamp((IK_L1 * IK_L1 + d * d - IK_L2 * IK_L2) / (2 * IK_L1 * d), -1, 1));
  const a1 = base + a;
  const boom = a1 - IK_P1;
  const bz = HINGE_A.z + IK_L1 * Math.cos(a1), by = HINGE_A.y + IK_L1 * Math.sin(a1);
  const stick = Math.atan2(cy - by, cz - bz) - IK_P2 - boom;
  return { boom, stick, bucket: bucketTotal - boom - stick };
}
// 正运动学:关节角 → 齿尖 (z, y)
export function armFK(boom, stick, bucket) {
  const a1 = IK_P1 + boom, bz = HINGE_A.z + IK_L1 * Math.cos(a1), by = HINGE_A.y + IK_L1 * Math.sin(a1);
  const a2 = IK_P2 + boom + stick, cz = bz + IK_L2 * Math.cos(a2), cy = by + IK_L2 * Math.sin(a2);
  const bt = boom + stick + bucket;
  return [cz + ARM.tip[0] * Math.cos(bt) - ARM.tip[1] * Math.sin(bt), cy + ARM.tip[0] * Math.sin(bt) + ARM.tip[1] * Math.cos(bt)];
}
