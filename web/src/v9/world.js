// world.js — V9 金色时刻派对草坪:天空/IBL/灯光/草地/远景/彩旗/气球/礼物/可形变土堆
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mulberry32, fbm2, noise2, lerp, clamp01, smoothstep } from './util.js';

// r1: 向挖斗弧线迎 0.1m;r2: FK 标定(fk_check.mjs)落点(-0.42,0.42) → 中心迎至落点 51%R 处,斗齿入 0.21m 厚层
export const MOUND = { x: -0.70, z: 0.50, R: 0.58, H: 0.31 };
// r3: 全局统一风场(物理审查阻断 6:旗狂摆/气球笔直/浮尘振荡 = 三重风场撕裂)。
//     风向 +x 偏 +z,中速;气球恒定倾角/彩旗摆动加权/浮尘定向漂移共用此矢量
export const WIND = { x: 1.0, z: 0.35, dirA: Math.atan2(0.35, 1.0) };
const lin = hex => new THREE.Color(hex); // Color() 已按 sRGB→线性处理

function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function skyMaterial(sunDir) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: lin('#5fa9ec').multiplyScalar(1.05) },
      mid: { value: lin('#a8d4f5').multiplyScalar(1.15) },
      horizon: { value: lin('#ffe2bf').multiplyScalar(1.35) },
      sunDir: { value: sunDir.clone() }, sunColor: { value: lin('#ffd9a6') },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position,1.0)).xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top, mid, horizon, sunDir, sunColor; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        c = mix(c, top, smoothstep(0.18, 0.9, h));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunColor * (pow(s, 900.0) * 18.0 + pow(s, 24.0) * 0.55 + pow(s, 4.0) * 0.18);
        c = mix(c, horizon * 0.92, smoothstep(0.0, -0.08, d.y));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

function buildClouds(rnd, sunDir) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: new THREE.Color('#fff4e6'), emissiveIntensity: 0.35 });
  const geo = new THREE.IcosahedronGeometry(1, 3);
  for (let c = 0; c < 9; c++) {
    const cloud = new THREE.Group();
    const az = -1.2 + c * 0.33 + rnd() * 0.2, dist = 170 + rnd() * 90, el = 0.08 + rnd() * 0.14;
    cloud.position.set(Math.sin(az) * dist, Math.tan(el) * dist, -Math.cos(az) * dist);
    const n = 6 + (rnd() * 6 | 0), w = 10 + rnd() * 12;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat);
      const u = i / (n - 1) - 0.5;
      const r = (1 - Math.abs(u) * 1.2) * (4 + rnd() * 3.5) + 2;
      m.scale.set(r, r * 0.8, r);
      m.position.set(u * w * 2.2, Math.abs(u) < 0.3 ? r * 0.35 : -r * 0.1, (rnd() - 0.5) * 5);
      cloud.add(m);
    }
    cloud.lookAt(0, cloud.position.y, 0);
    g.add(cloud);
  }
  return g;
}

function grassTexture() {
  const t = canvas(1024, 1024, (c, w, h) => {
    c.fillStyle = '#86bf4f'; c.fillRect(0, 0, w, h);
    const rnd = mulberry32(5);
    for (let i = 0; i < 26000; i++) {
      const x = rnd() * w, y = rnd() * h, l = 5 + rnd() * 12;
      const k = rnd();
      c.strokeStyle = k < 0.33 ? 'rgba(70,130,45,0.35)' : k < 0.66 ? 'rgba(160,210,95,0.32)' : 'rgba(110,170,60,0.35)';
      c.lineWidth = 1.2 + rnd() * 1.4;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 4, y - l); c.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(160, 160);
  return t;
}

function groundMaterial() {
  const m = new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 0.93, color: '#ffffff' });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP;
      float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float n1 = vn(vWP.xz*0.18)*0.6 + vn(vWP.xz*0.55)*0.4;
        float n2 = vn(vWP.xz*1.7);
        vec3 tint = mix(vec3(0.78,0.92,0.62), vec3(1.08,1.06,0.82), n1);
        diffuseColor.rgb *= tint * mix(0.92, 1.05, n2);
        // 泥堆周边深褐湿泥融合(噪声破边,消除浅绿秃圈)
        float md = distance(vWP.xz, vec2(-1.02, 0.6));
        float mn = vn(vWP.xz*3.1)*0.5 + vn(vWP.xz*8.3)*0.3 + vn(vWP.xz*21.7)*0.2;
        float dirtM = 1.0 - smoothstep(0.3, 1.15, md + (mn-0.5)*0.4);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.145, 0.085), dirtM * 0.62);`);
  };
  return m;
}

// 草簇:5 片弯叶,底深顶浅的顶点色;风摆在顶点着色器里按 uTime 计算(确定性)
function buildGrass(rnd, uTime, avoid) {
  const blades = 5, segs = 4;
  const pos = [], col = [], nor = [], idx = [];
  // r3: 草叶压饱和提明度(布鲁伊环境纪律:背景莫兰迪低饱和,让蓝车身跃出)
  // r4: 叶尖色再压对比(奶柔大色块;B 通道评审:针刺噪波)
  const base = new THREE.Color('#466428'), tip = new THREE.Color('#8cad55');
  let vi = 0;
  for (let b = 0; b < blades; b++) {
    const a = b / blades * Math.PI * 2 + rnd() * 0.8;
    // r4: 叶更宽更矮(0.0065→0.011 宽,0.034→0.028 高),消除高频针状噪读感
    const broad = b === 0; const h = (0.028 + rnd() * 0.030) * (broad ? 0.8 : 1), w = broad ? 0.022 + rnd() * 0.007 : 0.011 + rnd() * 0.006;
    const lean = 0.2 + rnd() * 0.5, ox = Math.cos(a) * 0.012, oz = Math.sin(a) * 0.012;
    const dx = Math.cos(a), dz = Math.sin(a);
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, y = h * t, off = lean * h * t * t;
      const ww = w * (1 - t * 0.92);
      const cx = ox + dx * off, cz = oz + dz * off;
      pos.push(cx - dz * ww, y, cz + dx * ww, cx + dz * ww, y, cz - dx * ww);
      const c = base.clone().lerp(tip, Math.pow(t, 0.8));
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      nor.push(0, 1, 0, 0, 1, 0);
      if (s < segs) { idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2); }
      vi += 2;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float k = position.y * position.y * 180.0;
        transformed.x += sin(uTime*1.6 + ip.x*0.9 + ip.z*0.4) * 0.006 * k + sin(uTime*3.7 + ip.z*2.1) * 0.0018 * k;
        transformed.z += cos(uTime*1.3 + ip.z*0.7) * 0.004 * k;`);
  };
  const N = 40000; // r4: 52000→40000(叶片加宽后保持覆盖,降噪)
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  const d = new THREE.Object3D(), c = new THREE.Color();
  let n = 0;
  while (n < N) {
    // 舞台附近更密,远处稀
    const r = Math.pow(rnd(), 0.62) * 11, a = rnd() * Math.PI * 2;
    const x = Math.cos(a) * r * 1.35, z = Math.sin(a) * r * 0.9 - 0.5;
    if (avoid(x, z)) continue;
    d.position.set(x, 0, z);
    d.rotation.set(0, rnd() * Math.PI * 2, 0);
    const s = 0.7 + rnd() * 0.75;
    d.scale.set(s, s * (0.8 + rnd() * 0.5), s);
    d.updateMatrix();
    mesh.setMatrixAt(n, d.matrix);
    const v = 0.82 + rnd() * 0.3;
    c.setRGB(v, v * (0.96 + rnd() * 0.08), v * (0.85 + rnd() * 0.2));
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function buildFlowers(rnd, avoid) {
  const tex = canvas(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.translate(w / 2, h / 2);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) { c.rotate(Math.PI * 2 / 9); c.beginPath(); c.ellipse(0, -30, 11, 28, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(0, 0, 15, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8a317'; c.beginPath(); c.arc(4, 4, 7, 0, Math.PI * 2); c.fill();
  });
  const geo = new THREE.CircleGeometry(0.022, 16);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.7, side: THREE.DoubleSide });
  const N = 900;
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  const d = new THREE.Object3D(), c = new THREE.Color();
  const tints = ['#ffffff', '#ffffff', '#fff3a8', '#ffc2d6', '#ffffff'];
  let n = 0;
  while (n < N) {
    const r = Math.pow(rnd(), 0.7) * 9, a = rnd() * Math.PI * 2;
    const x = Math.cos(a) * r * 1.4, z = Math.sin(a) * r * 0.9 - 0.3;
    if (avoid(x, z) || Math.hypot(x, z) < 0.9) continue;
    d.position.set(x, 0.05 + rnd() * 0.03, z);
    d.rotation.set((rnd() - 0.5) * 0.6, rnd() * 6.28, (rnd() - 0.5) * 0.6);
    const s = 0.7 + rnd() * 0.8; d.scale.set(s, s, s);
    d.updateMatrix(); mesh.setMatrixAt(n, d.matrix);
    mesh.setColorAt(n, c.set(tints[(rnd() * tints.length) | 0]));
    n++;
  }
  mesh.receiveShadow = true;
  return mesh;
}

function buildScenery(rnd) {
  const g = new THREE.Group();
  const hillMat = new THREE.MeshStandardMaterial({ color: '#8cc45a', roughness: 1 });
  const hillMat2 = new THREE.MeshStandardMaterial({ color: '#76b24a', roughness: 1 });
  const hillGeo = new THREE.SphereGeometry(1, 64, 32);
  const hills = [[-70, -120, 70, 16, 40], [20, -140, 90, 22, 45], [95, -110, 60, 14, 38], [-150, -90, 60, 12, 40], [-20, -70, 40, 6, 22], [55, -65, 36, 5, 20], [-55, -55, 30, 4.5, 18]];
  hills.forEach(([x, z, sx, sy, sz], i) => {
    const m = new THREE.Mesh(hillGeo, i % 2 ? hillMat : hillMat2);
    m.position.set(x, -sy * 0.15, z); m.scale.set(sx, sy, sz);
    m.receiveShadow = true;
    g.add(m);
  });
  // 棒棒糖树
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#8a5a3c', roughness: 0.9 });
  const leafCols = ['#5fa83f', '#6fb84a', '#4f9636', '#7cc152'];
  const leafMats = leafCols.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
  const canopyGeo = new THREE.IcosahedronGeometry(1, 3);
  {
    const p = canopyGeo.attributes.position, r2 = mulberry32(9);
    for (let i = 0; i < p.count; i++) { const k = 1 + (r2() - 0.5) * 0.08; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
    canopyGeo.computeVertexNormals();
  }
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1, 12);
  const puffGeo = new THREE.SphereGeometry(1, 32, 20);
  const place = [];
  for (let i = 0; i < 46; i++) {
    const a = -1.35 + rnd() * 2.7, dist = 14 + rnd() * 34;
    const x = Math.sin(a) * dist * 1.25, z = -Math.cos(a) * dist - 2;
    if (z > -9) continue;
    place.push([x, z, 1.8 + rnd() * 2.6]);
  }
  for (const [x, z, h] of place) {
    const t = new THREE.Group();
    const tr = new THREE.Mesh(trunkGeo, trunkMat); tr.scale.set(1, h * 0.55, 1); tr.position.y = h * 0.27; t.add(tr);
    const cr = h * (0.4 + rnd() * 0.18);
    const lm = leafMats[(rnd() * leafMats.length) | 0];
    const puffs = 5 + (rnd() * 4 | 0);
    for (let k = 0; k < puffs; k++) {
      const a2 = k / puffs * Math.PI * 2 + rnd();
      const rr = k === 0 ? cr : cr * (0.55 + rnd() * 0.25);
      const cn = new THREE.Mesh(puffGeo, lm);
      cn.scale.setScalar(rr);
      cn.position.set(k === 0 ? 0 : Math.cos(a2) * cr * 0.62, h * 0.55 + cr * (k === 0 ? 0.95 : 0.55 + rnd() * 0.7), k === 0 ? 0 : Math.sin(a2) * cr * 0.62);
      t.add(cn);
    }
    t.position.set(x, 0, z);
    // r3: 树木恢复投影(原硬编码关闭 = 金色阳光下无树荫,物理审查建议 5)
    t.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(t);
  }
  return g;
}

// 彩旗:悬链线 + 三角旗(实例化),旗面随风翻动
function buildBunting(rnd, poles) {
  const g = new THREE.Group();
  const poleTex = canvas(64, 512, (c, w, h) => {
    c.fillStyle = '#fff7ef'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff6f8f';
    for (let i = -2; i < 16; i++) { c.beginPath(); c.moveTo(0, i * 40); c.lineTo(w, i * 40 - 30); c.lineTo(w, i * 40 - 12); c.lineTo(0, i * 40 + 18); c.fill(); }
  });
  poleTex.wrapT = THREE.RepeatWrapping; poleTex.repeat.set(1, 3);
  const poleMat = new THREE.MeshPhysicalMaterial({ map: poleTex, roughness: 0.35, clearcoat: 0.6 });
  const ballMat = new THREE.MeshStandardMaterial({ color: '#ffcf4a', metalness: 0.6, roughness: 0.25 });
  for (const [x, z, h] of poles) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, h, 20), poleMat);
    p.position.set(x, h / 2, z); g.add(p);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), ballMat); b.position.set(x, h + 0.05, z); g.add(b);
  }
  const cols = ['#ff6b6b', '#ffd23f', '#5fd068', '#4d96ff', '#ff9fc6', '#b692ff', '#ff9f43'].map(c => new THREE.Color(c));
  const flagGeo = new THREE.BufferGeometry();
  // 下垂三角旗(略带弧度),局部 x 沿绳,y 向下
  {
    const P = [], I = [], UV = [];
    const nx = 6, ny = 6;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const v = j / ny, u = (i / nx - 0.5) * (1 - v);
      P.push(u * 0.17, -v * 0.21, Math.sin(u * 8) * 0.004); UV.push(i / nx, v);
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      I.push(a, c, b, b, c, d);
    }
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    flagGeo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    flagGeo.setIndex(I); flagGeo.computeVertexNormals();
  }
  const flagMat = new THREE.MeshStandardMaterial({ roughness: 0.75, side: THREE.DoubleSide });
  const strings = [];
  for (let s = 0; s < poles.length - 1; s++) {
    const [x0, z0, h0] = poles[s], [x1, z1, h1] = poles[s + 1];
    const a = new THREE.Vector3(x0, h0 - 0.02, z0), b = new THREE.Vector3(x1, h1 - 0.02, z1);
    const sag = a.distanceTo(b) * 0.14;
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => {
      const t = i / 12; const p = a.clone().lerp(b, t); p.y -= sag * 4 * t * (1 - t); return p;
    }));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.005, 6), new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.8 }));
    g.add(tube);
    const len = curve.getLength(), n = Math.floor(len / 0.2);
    strings.push({ curve, n, phase: rnd() * 6 });
  }
  const total = strings.reduce((s, x) => s + x.n, 0);
  const flags = new THREE.InstancedMesh(flagGeo, flagMat, total);
  let k = 0;
  const flagData = [];
  for (const st of strings) for (let i = 0; i < st.n; i++) {
    const t = (i + 0.5) / st.n;
    const p = st.curve.getPointAt(t), tan = st.curve.getTangentAt(t);
    flagData.push({ p, yaw: Math.atan2(-tan.z, tan.x), ph: st.phase + i * 0.7 });
    flags.setColorAt(k++, cols[(k + st.n) % cols.length]);
  }
  flags.castShadow = true; flags.receiveShadow = true;
  g.add(flags);
  const d = new THREE.Object3D();
  function update(t) {
    flagData.forEach((f, i) => {
      d.position.copy(f.p);
      d.rotation.set(0, f.yaw, 0);
      // r3: 摆动幅度/基准偏角按旗面与风向夹角加权(顺风暴摆、横风微动,统一风场)
      const w = 0.45 + 0.55 * Math.abs(Math.sin(f.yaw - WIND.dirA));
      d.rotateX(Math.sin(t * 2.1 + f.ph) * 0.26 * w + 0.14 * w);
      d.updateMatrix(); flags.setMatrixAt(i, d.matrix);
    });
    flags.instanceMatrix.needsUpdate = true;
  }
  update(0);
  g.traverse(o => { if (o.isMesh && o !== flags) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, update };
}

// 气球束:光泽气球 + 结 + 线,按 t 轻轻浮动
export function makeBalloon(color, r = 0.15) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(r, 40, 28);
  {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / r; p.setY(i, p.getY(i) * 1.16 - (y < 0 ? y * y * r * 0.12 : 0)); }
    geo.computeVertexNormals();
  }
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.2 });
  const b = new THREE.Mesh(geo, mat); g.add(b);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(r * 0.12, r * 0.18, 12), mat); knot.position.y = -r * 1.2; g.add(knot);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.r = r;
  return g;
}

function buildBalloons(rnd, clusters) {
  const g = new THREE.Group();
  const cols = ['#ff5f7e', '#ffd23f', '#4d9bff', '#7ee0b0', '#ff9f43', '#c59bff', '#ffffff'];
  const strMat = new THREE.MeshStandardMaterial({ color: '#f7f2ea', roughness: 0.8 });
  const items = [];
  for (const [ax, az, n, h] of clusters) {
    for (let i = 0; i < n; i++) {
      const bl = makeBalloon(cols[(rnd() * cols.length) | 0], 0.13 + rnd() * 0.05);
      const off = new THREE.Vector3((rnd() - 0.5) * 0.45, h + rnd() * 0.45, (rnd() - 0.5) * 0.3);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 1, 5), strMat);
      g.add(bl, s);
      items.push({ bl, s, anchor: new THREE.Vector3(ax, 0.02, az), off, ph: rnd() * 6.28, sp: 0.8 + rnd() * 0.5 });
    }
  }
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), top = new THREE.Vector3();
  function update(t) {
    for (const it of items) {
      const p = it.anchor.clone().add(it.off);
      // r3: 气球沿风向恒定偏移(浮力杠杆:越高偏越多,≈16° 稳态迎风倾角),叠原摆动
      p.x += WIND.x * it.off.y * 0.28 + Math.sin(t * it.sp + it.ph) * 0.05;
      p.z += WIND.z * it.off.y * 0.28 + Math.cos(t * it.sp * 0.8 + it.ph) * 0.035;
      p.y += Math.sin(t * it.sp * 1.3 + it.ph) * 0.03;
      it.bl.position.copy(p);
      it.bl.rotation.set(Math.sin(t * 0.9 + it.ph) * 0.12, t * 0.2 + it.ph, Math.cos(t * 0.8 + it.ph) * 0.1);
      top.copy(p); top.y -= it.bl.userData.r * 1.3;
      dir.subVectors(top, it.anchor); const L = dir.length(); dir.normalize();
      it.s.position.copy(it.anchor).addScaledVector(dir, L / 2);
      it.s.quaternion.setFromUnitVectors(up, dir); it.s.scale.set(1, L, 1);
    }
  }
  update(0);
  return { group: g, update };
}

function buildGifts(rnd, spots) {
  const g = new THREE.Group();
  const cols = [['#7fd8be', '#ffd23f'], ['#ffa066', '#ffffff'], ['#ff8fb1', '#ffe066'], ['#9fb7ff', '#ff6b8b'], ['#ffd23f', '#ff5f7e']];
  spots.forEach(([x, z, s, rot], i) => {
    const [bc, rc] = cols[i % cols.length];
    const box = new THREE.Group();
    const bm = new THREE.MeshPhysicalMaterial({ color: bc, roughness: 0.45, clearcoat: 0.4 });
    const rm = new THREE.MeshPhysicalMaterial({ color: rc, roughness: 0.35, clearcoat: 0.5, sheen: 0.5 });
    const w = s, h = s * (0.75 + rnd() * 0.3);
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, w, 4, s * 0.06), bm); b.position.y = h / 2; box.add(b);
    const r1 = new THREE.Mesh(new RoundedBoxGeometry(w * 1.02, h * 1.01, s * 0.16, 2, s * 0.02), rm); r1.position.y = h / 2; box.add(r1);
    const r2 = new THREE.Mesh(new RoundedBoxGeometry(s * 0.16, h * 1.01, w * 1.02, 2, s * 0.02), rm); r2.position.y = h / 2; box.add(r2);
    for (const sd of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(s * 0.14, s * 0.04, 10, 24), rm);
      loop.position.set(sd * s * 0.12, h + s * 0.08, 0); loop.rotation.set(0, 0, sd * 0.6); loop.scale.set(1, 0.7, 0.6);
      box.add(loop);
    }
    box.position.set(x, 0, z); box.rotation.y = rot;
    g.add(box);
  });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// 可形变土堆:极坐标高度场;craters=[{x,z,depth,r}](世界坐标),每次 setCraters 重算
function buildMound(rnd) {
  const rings = 44, segs = 96, R = MOUND.R * 1.25;
  const pos = [], uv = [], idx = [];
  const base = [];
  for (let i = 0; i <= rings; i++) {
    const rr = i / rings * R;
    for (let j = 0; j <= segs; j++) {
      const a = j / segs * Math.PI * 2;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      pos.push(x, 0, z); uv.push(0.5 + x / (2 * R), 0.5 + z / (2 * R));
      const q = rr / MOUND.R;
      let h = q < 1 ? MOUND.H * Math.pow(1 - q * q, 1.35) : 0;
      h *= 1 + (fbm2(x * 7 + 3, z * 7, 3, 21) - 0.5) * 0.35;
      h += (fbm2(x * 16, z * 16, 2, 5) - 0.5) * 0.02 * clamp01(1 - q);
      // 底缘撒开的薄土
      h += q >= 0.85 && q < 1.25 ? 0.012 * (1 - smoothstep(0.85, 1.25, q)) * (0.6 + fbm2(x * 9, z * 9, 2, 8)) : 0;
      if (i === rings) h = -0.01;
      base.push(h);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = i * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const colors = new Float32Array(pos.length);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(idx);
  const tex = canvas(1024, 1024, (c, w, h) => {
    // r4v2: 梦幻细沙(r5a:仍有黑渣感)——底色再提亮、深斑 alpha 0.30→0.16、数量再减
    c.fillStyle = '#c29468'; c.fillRect(0, 0, w, h);
    const r2 = mulberry32(13);
    for (let i = 0; i < 3600; i++) {
      const x = r2() * w, y = r2() * h, s = 1 + r2() * 5, k = r2();
      c.fillStyle = k < 0.3 ? 'rgba(122,88,54,0.16)' : k < 0.6 ? 'rgba(206,162,112,0.30)' : k < 0.8 ? 'rgba(158,118,74,0.26)' : 'rgba(232,198,150,0.30)';
      c.beginPath(); c.ellipse(x, y, s, s * (0.6 + r2() * 0.5), r2() * 3, 0, Math.PI * 2); c.fill();
    }
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.97 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(MOUND.x, 0, MOUND.z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  // 小石子
  const pebGeo = new THREE.IcosahedronGeometry(1, 1);
  // r4v2: 石子全移除(r5a:环状散粒被读成"碎煤/粪渣",2 岁向纯净沙堆不留颗粒)
  const peb = new THREE.InstancedMesh(pebGeo, new THREE.MeshStandardMaterial({ color: '#c9b299', roughness: 0.85 }), 0);
  const pebData = [];
  mesh.add(peb);
  peb.castShadow = true; peb.receiveShadow = true;
  const d = new THREE.Object3D();
  function heightAt(i, craters) {
    const x = pos[i * 3], z = pos[i * 3 + 2];
    let h = base[i];
    let wet = 0;
    for (const c of craters) {
      const dx = x - (c.x - MOUND.x), dz = z - (c.z - MOUND.z);
      const q = Math.sqrt(dx * dx + dz * dz) / c.r;
      if (q < 1.6) {
        const bowl = q < 1 ? (1 - q * q) : 0;
        const rim = Math.exp(-Math.pow((q - 1.1) / 0.22, 2));
        // r3: 坑缘隆起环 0.32→0.55(斗齿推挤挤出土壤感,物理审查 seg2 建议 3)
        h += -c.depth * bowl * bowl + c.depth * 0.55 * rim;
        wet = Math.max(wet, bowl * clamp01(c.depth / 0.05));
      }
    }
    return [Math.max(h, 0), wet];
  }
  function setCraters(craters) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const [h, wet] = heightAt(i, craters);
      p.setY(i, h);
      const k = 1 - wet * 0.22; // r4v3: 湿土变暗 0.30→0.22(r6:挖掘切口深色同步淡化)
      colors[i * 3] = k * 0.98; colors[i * 3 + 1] = k * 0.95; colors[i * 3 + 2] = k * 0.92;
    }
    p.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
    pebData.forEach((pd, i) => {
      // 石子贴表面
      const q = Math.hypot(pd.x, pd.z) / MOUND.R;
      let h = q < 1 ? MOUND.H * Math.pow(1 - q * q, 1.35) : 0.005;
      for (const c of craters) {
        const dq = Math.hypot(pd.x - (c.x - MOUND.x), pd.z - (c.z - MOUND.z)) / c.r;
        if (dq < 1) h -= c.depth * (1 - dq * dq) ** 2;
      }
      d.position.set(pd.x, Math.max(0.004, h), pd.z); d.rotation.set(pd.ry, pd.ry * 2, 0); d.scale.set(pd.s, pd.s * 0.7, pd.s);
      d.updateMatrix(); peb.setMatrixAt(i, d.matrix);
    });
    peb.instanceMatrix.needsUpdate = true;
  }
  setCraters([]);
  // 世界坐标表面高度(无坑,用于落点)
  function surfaceY(x, z, craters = []) {
    const lx = x - MOUND.x, lz = z - MOUND.z;
    const q = Math.hypot(lx, lz) / MOUND.R;
    let h = q < 1 ? MOUND.H * Math.pow(1 - q * q, 1.35) : 0;
    for (const c of craters) {
      const dq = Math.hypot(x - c.x, z - c.z) / c.r;
      if (dq < 1) h -= c.depth * (1 - dq * dq) ** 2;
    }
    return Math.max(0, h);
  }
  return { mesh, setCraters, surfaceY };
}

export function buildWorld(renderer) {
  const dbg = new URLSearchParams(location.hash.slice(1)); // 调试开关:noshadow/noenv/noexp
  const rnd = mulberry32(2026);
  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(-0.5, 0.42, -0.35).normalize(); // 后侧逆光:金色时刻,暖轮廓 + 冷天光补面
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMaterial(sunDir));
  sky.frustumCulled = false;
  scene.add(sky);
  scene.fog = new THREE.FogExp2(lin('#ffe9d2'), 0.0055);

  // IBL:用同一天空 + 绿地半球生成 PMREM
  {
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMaterial(sunDir)));
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(49, 32), new THREE.MeshBasicMaterial({ color: lin('#6f9c46').multiplyScalar(0.55) }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.5;
    envScene.add(gnd);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    scene.environmentIntensity = dbg.has('noenv') ? 0 : 1.15; // r4: 1.35→1.15(clearcoat 高光收敛)
  }

  const sun = new THREE.DirectionalLight(lin('#ff9e3b'), 3.6);
  sun.position.copy(sunDir).multiplyScalar(14);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = !dbg.has('noshadow');
  sun.shadow.mapSize.set(4096, 4096);
  // r3: 阴影视锥 5m→覆盖远景树区(原全场 46 棵树在视锥外零树荫,物理审查 seg2 阻断 8)
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 10, bottom: -22, near: 1, far: 90 });
  sun.shadow.bias = 0.00008; sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(lin('#cfe3ff'), 0.75); fill.position.set(4, 2.5, 6); scene.add(fill);
  const rim = new THREE.DirectionalLight(lin('#ffaa38'), 5.0); rim.position.set(1.6, 5.0, -6.0); scene.add(rim); // r4: 6.8→5.0(B 通道:车顶死白过曝)
  const key = new THREE.DirectionalLight(lin('#fff0dc'), 0.35); key.position.set(-1.5, 2.2, 6); scene.add(key);
  const hemi = new THREE.HemisphereLight(lin('#72b2ff'), lin('#7a9a58'), 0.9); scene.add(hemi); // r3: 地面反弹光降饱和

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1), groundMaterial());
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // 草地密度:车底为 0;泥堆周边 0.18~0.78m 大振幅噪声渐变(自然犬牙过渡)
  const density = (x, z) => {
    if (Math.abs(x) < 0.62 && Math.abs(z) < 0.68) return 0;
    const d = Math.hypot(x - MOUND.x, z - MOUND.z);
    const n = Math.abs((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1);
    return smoothstep(0.18, 0.78, d + (n - 0.5) * 0.42);
  };
  const avoid = (x, z) => rnd() >= density(x, z);

  // 车底压草坪垫(草叶被履带压平、微微下沉的读感)
  // r3: pad 提出块作用域 — 压痕透明度随开开停稳渐现(原 0s 起预留压痕 = 因果倒置,物理审查建议 1)
  const padMesh = (() => {
    const pt = canvas(256, 256, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.5);
      g.addColorStop(0, 'rgba(112,134,62,0.95)'); g.addColorStop(0.7, 'rgba(120,142,68,0.5)'); g.addColorStop(1, 'rgba(120,142,68,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ map: pt, transparent: true, opacity: 0, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    pad.rotation.x = -Math.PI / 2; pad.scale.set(0.66, 0.78, 1);
    // r3: 压痕对齐停驻点 (0.32,0.22)(原固定原点,与车错位 40cm,物理审查 seg1 建议 5/r3a 探针)
    pad.position.set(0.32, 0.0012, 0.22);
    pad.receiveShadow = true;
    scene.add(pad);
    return pad;
  })();

  // 金色浮尘(逆光微尘,后期泛光后呈散景光斑)
  const moteMat = new THREE.SpriteMaterial({
    map: canvas(64, 64, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }),
    color: new THREE.Color(1.9, 1.62, 1.02), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6,
  });
  const motes = [];
  for (let i = 0; i < 120; i++) {
    const m = new THREE.Sprite(moteMat);
    const base = new THREE.Vector3((rnd() - 0.5) * 7, 0.15 + rnd() * 1.9, -1.0 + rnd() * 4.5); // 镜头前锥台为主
    m.scale.setScalar(0.024 + rnd() * 0.028);
    scene.add(m);
    motes.push({ m, base, ph: rnd() * 6, sp: 0.1 + rnd() * 0.2 });
  }
  const uTime = { value: 0 };
  scene.add(buildGrass(rnd, uTime, avoid));
  scene.add(buildFlowers(rnd, avoid));
  scene.add(buildScenery(rnd));
  scene.add(buildClouds(rnd, sunDir));

  const bunting = buildBunting(rnd, [[-3.4, -2.3, 2.1], [0.1, -3.2, 2.35], [3.7, -2.1, 2.1]]);
  scene.add(bunting.group);
  // r1: 新增 (-2.0,-0.85) 近景束,拴在左侧礼物上——12.85s 抬头看气球节拍能真正入画(远束在该机位出画/迷彩)
  // r2: 近景束 (-2.0,-0.85)→(-2.2,-0.6) 高 1.35→1.55,气球节拍时斗臂已压低,束悬于开阔视界
  // r3: (2.3,0.9) 束挪 (2.8,0.3) — 原正对 shot6 侧视光轴,巨幅虚焦气球遮挡右半画面 40%(物理审查 seg2 建议 7/r3a 探针)
  const balloons = buildBalloons(rnd, [[-3.25, -2.15, 4, 1.25], [3.55, -1.95, 4, 1.2], [2.8, 0.3, 3, 0.7], [-2.2, -0.6, 5, 1.55]]);
  scene.add(balloons.group);
  scene.add(buildGifts(rnd, [[2.05, 0.75, 0.26, 0.3], [2.45, 0.55, 0.2, -0.4], [2.25, 1.15, 0.17, 0.9], [-2.3, -1.0, 0.24, -0.2], [-2.62, -0.72, 0.18, 0.5]]));
  const mound = buildMound(rnd);
  scene.add(mound.mesh);
  // r4v3: 泥堆外围 160 颗深褐碎土渣全移除(r6 复审:环状黑渣=碎煤粪渣感,2 岁向纯净草坪不留)

  const baseSun = sun.position.clone();
  function update(t, { sunJitter = [0, 0] } = {}) {
    uTime.value = t;
    bunting.update(t);
    balloons.update(t);
    // r3: 车底压痕随停稳渐现(4.8 到位 → 6.0 完全显现)
    padMesh.material.opacity = clamp01((t - 4.8) / 1.2) * 0.95;
    // 太阳在小圆盘内抖动 → 累积出半影软阴影
    sun.position.copy(baseSun);
    sun.position.x += sunJitter[0] * 0.35; sun.position.y += sunJitter[1] * 0.35; sun.position.z += (sunJitter[0] - sunJitter[1]) * 0.2;
    // r3: 浮尘加全片同相定向漂移(统一风场;原原位正弦振荡净位移 0)
    const drift = Math.sin(t * 0.06) * 2.2;
    for (const o of motes) {
      o.m.position.set(
        o.base.x + WIND.x * drift + Math.sin(t * o.sp + o.ph) * 0.25,
        o.base.y + Math.sin(t * o.sp * 1.3 + o.ph * 2) * 0.12,
        o.base.z + WIND.z * drift + Math.cos(t * o.sp * 0.7 + o.ph) * 0.2);
    }
  }
  return { scene, sun, sunDir, mound, update, lights: { fill, rim, key, hemi }, setMotes: a => { moteMat.opacity = a; } };
}
