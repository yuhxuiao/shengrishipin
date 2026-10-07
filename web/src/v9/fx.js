// fx.js — V9 粒子:泥块(预模拟物理)、尘土、彩纸、闪光星、浮尘。全部为 t 的纯函数采样
import * as THREE from 'three';
import { mulberry32, clamp01, lerp, smoothstep } from './util.js';

const SR = 120; // 轨迹采样率

function tex(draw, w = 128, h = 128) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const puffTex = () => tex((c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.45, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const starTex = () => tex((c, w, h) => {
  c.translate(w / 2, h / 2);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,245,210,0.85)'); g.addColorStop(0.5, 'rgba(255,220,140,0.18)'); g.addColorStop(1, 'rgba(255,220,140,0)');
  c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h);
  c.fillStyle = 'rgba(255,255,255,0.95)';
  for (const a of [0, Math.PI / 2]) {
    c.save(); c.rotate(a);
    c.beginPath(); c.moveTo(0, -w * 0.48); c.quadraticCurveTo(w * 0.035, 0, 0, w * 0.48); c.quadraticCurveTo(-w * 0.035, 0, 0, -w * 0.48); c.fill();
    c.restore();
  }
});

// 通用:预模拟粒子轨迹 → 采样
// r3: 空气阻力改以"相对风速"计算(物理审查 seg1 阻断 7:统一风场,彩纸顺风飘移而非垂直下落)
function simulate(p0, v0, t0, { g = 7.0, drag = 0.4, radius = 0.01, bounce = 0.32, friction = 0.55, ground, dur = 5, onImpact, wind = null }) {
  const dt = 1 / 480, steps = Math.round(dur / dt), every = 480 / SR;
  const p = p0.clone(), v = v0.clone();
  const out = new Float32Array((Math.floor(steps / every) + 2) * 3);
  const wx = wind ? wind.x : 0, wz = wind ? wind.z : 0;
  let n = 0, rest = -1, rot = 0;
  for (let i = 0; i <= steps; i++) {
    if (i % every === 0) { out[n * 3] = p.x; out[n * 3 + 1] = p.y; out[n * 3 + 2] = p.z; n++; }
    if (rest >= 0) continue;
    v.y -= g * dt;
    v.x -= (v.x - wx) * drag * dt;
    v.z -= (v.z - wz) * drag * dt;
    p.addScaledVector(v, dt);
    const gy = ground(p.x, p.z, t0 + i * dt) + radius;
    if (p.y < gy) {
      p.y = gy;
      if (v.y < -0.35) {
        onImpact && onImpact(t0 + i * dt, -v.y, p);
        v.y = -v.y * bounce; v.x *= friction; v.z *= friction;
      } else if (Math.hypot(v.x, v.z) < 0.08) { v.set(0, 0, 0); rest = i * dt; }
      else { v.y = 0; v.x *= 0.9; v.z *= 0.9; }
    }
  }
  return { t0, out, n, rest };
}
function sampleTrack(tr, t, target) {
  const f = (t - tr.t0) * SR;
  if (f <= 0) return target.set(tr.out[0], tr.out[1], tr.out[2]);
  const i = Math.min(tr.n - 2, Math.floor(f)), k = Math.min(1, f - i);
  const o = tr.out;
  return target.set(lerp(o[i * 3], o[i * 3 + 3], k), lerp(o[i * 3 + 1], o[i * 3 + 4], k), lerp(o[i * 3 + 2], o[i * 3 + 5], k));
}

export function buildFx(scene) {
  const rnd = mulberry32(777);
  const impacts = [];

  // ---------------- 泥块
  const clodGeo = new THREE.IcosahedronGeometry(1, 1);
  {
    const p = clodGeo.attributes.position, r2 = mulberry32(4);
    for (let i = 0; i < p.count; i++) { const k = 0.75 + r2() * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); }
    clodGeo.computeVertexNormals();
  }
  const MAXC = 220;
  const clods = new THREE.InstancedMesh(clodGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), MAXC);
  clods.castShadow = true; clods.receiveShadow = true;
  clods.frustumCulled = false;
  scene.add(clods);
  const clodList = [];
  const cCols = ['#6f4a2a', '#835a33', '#5b3b20', '#9a6c3e', '#74502e'].map(c => new THREE.Color(c));
  function addClods(spawns, ground) {
    for (const s of spawns) {
      if (clodList.length >= MAXC) break;
      const r = s.r;
      const tr = simulate(s.p, s.v, s.t, { radius: r * 0.7, ground, onImpact: (t, sp) => { if (sp > 0.6) impacts.push({ t: +t.toFixed(3), v: +sp.toFixed(2) }); } });
      const idx = clodList.length;
      clods.setColorAt(idx, cCols[(rnd() * cCols.length) | 0]);
      clodList.push({ tr, r, spin: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), w: 6 + rnd() * 10, visibleFrom: s.t });
    }
    clods.instanceColor.needsUpdate = true;
  }

  // ---------------- 尘土(精灵池)
  const pt = puffTex();
  const puffs = [];
  const dustPool = [];
  for (let i = 0; i < 90; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, color: '#e8d2ae', transparent: true, depthWrite: false, opacity: 0 }));
    m.visible = false; scene.add(m); dustPool.push(m);
  }
  function addPuff(t, pos, { n = 8, spread = 0.18, up = 0.12, size = 0.16, life = 1.4, color = '#e8d2ae' } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      puffs.push({ t0: t + rnd() * 0.08, p: pos.clone().add(new THREE.Vector3(Math.cos(a) * spread * 0.3, 0.02, Math.sin(a) * spread * 0.3)),
        v: new THREE.Vector3(Math.cos(a) * spread, up * (0.6 + rnd() * 0.8), Math.sin(a) * spread), s: size * (0.7 + rnd() * 0.6), life: life * (0.7 + rnd() * 0.5), color });
    }
  }

  // ---------------- 彩纸
  const MAXF = 520;
  const confGeo = new THREE.PlaneGeometry(0.03, 0.018);
  const conf = new THREE.InstancedMesh(confGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, side: THREE.DoubleSide, metalness: 0.1 }), MAXF);
  conf.castShadow = true; conf.frustumCulled = false;
  scene.add(conf);
  const confList = [];
  const fCols = ['#ff5f7e', '#ffd23f', '#4d9bff', '#5fd068', '#ff9f43', '#c59bff', '#ffffff', '#ff7ad9'].map(c => new THREE.Color(c));
  function addConfetti(t, origin, dir, n, { speed = 4.2, cone = 0.55, ground = () => 0, wind = null } = {}) {
    for (let i = 0; i < n && confList.length < MAXF; i++) {
      const d = dir.clone().normalize();
      const side = new THREE.Vector3(-d.z, 0, d.x).normalize();
      const up = new THREE.Vector3().crossVectors(side, d).normalize();
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * cone;
      const v = d.clone().addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize().multiplyScalar(speed * (0.6 + rnd() * 0.6));
      const t0 = t + rnd() * 0.06;
      // r3: g 2.2 月球微重力→8.0 近真实重力(物理审查 seg1 阻断 5),滞空靠纸片高阻力 drag 6 + 风场飘移,而非非法降 g
      const tr = simulate(origin.clone(), v, t0, { g: 8.0, drag: 6.0, radius: 0.003, bounce: 0.0, friction: 0.2, ground: (x, z) => ground(x, z), dur: 9, wind });
      const idx = confList.length;
      conf.setColorAt(idx, fCols[(rnd() * fCols.length) | 0]);
      confList.push({ tr, t0, ax: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), w: 8 + rnd() * 14, ph: rnd() * 6, sway: 0.05 + rnd() * 0.08, rest: new THREE.Euler(-Math.PI / 2 + (rnd() - 0.5) * 0.3, rnd() * 6, 0), groundY: ground });
    }
    conf.instanceColor.needsUpdate = true;
  }

  // ---------------- 闪光星 + 浮尘
  const st = starTex();
  const sparkPool = [];
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, color: new THREE.Color(3.2, 2.8, 1.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    m.visible = false; scene.add(m); sparkPool.push(m);
  }
  const sparks = [];
  function addSparkles(t, center, { n = 12, radius = 0.35, life = 1.2, size = 0.09, rise = 0.15 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, e = (rnd() - 0.3) * 1.2;
      sparks.push({ t0: t + rnd() * 0.35, c: center.clone(), d: new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + 0.2, Math.sin(a) * Math.cos(e)).multiplyScalar(radius * (0.5 + rnd() * 0.6)), life: life * (0.6 + rnd() * 0.6), s: size * (0.6 + rnd() * 0.8), rise, spin: rnd() * 6 });
    }
  }
  // 浮尘已迁移至 world.js(转台/成片共用),这里不再重复渲染

  const d = new THREE.Object3D(), q = new THREE.Quaternion(), v3 = new THREE.Vector3();
  function update(t) {
    // 泥块
    clodList.forEach((c, i) => {
      if (t < c.visibleFrom) { d.position.set(0, -10, 0); d.scale.setScalar(0.0001); }
      else {
        sampleTrack(c.tr, t, d.position);
        const age = t - c.tr.t0, moving = c.tr.rest < 0 ? age : Math.min(age, c.tr.rest);
        d.quaternion.setFromAxisAngle(c.spin, moving * c.w);
        d.scale.set(c.r, c.r, c.r);
      }
      d.updateMatrix(); clods.setMatrixAt(i, d.matrix);
    });
    clods.count = clodList.length;
    clods.instanceMatrix.needsUpdate = true;
    // 尘土
    let k = 0;
    for (const p of puffs) {
      const age = t - p.t0;
      if (age < 0 || age > p.life || k >= dustPool.length) continue;
      const m = dustPool[k++];
      const u = age / p.life;
      const decel = (1 - Math.exp(-age * 3)) / 3;
      m.position.copy(p.p).addScaledVector(p.v, decel);
      m.position.y += age * 0.05;
      m.scale.setScalar(p.s * (0.5 + 1.6 * Math.sqrt(u)));
      m.material.opacity = 0.55 * (1 - u) * smoothstep(0, 0.08, age);
      m.material.color.set(p.color);
      m.material.rotation = p.t0 * 7 + age * 0.4;
      m.visible = true;
    }
    for (; k < dustPool.length; k++) dustPool[k].visible = false;
    // 彩纸
    confList.forEach((c, i) => {
      if (t < c.t0) { d.position.set(0, -10, 0); d.scale.setScalar(0.0001); d.updateMatrix(); conf.setMatrixAt(i, d.matrix); return; }
      sampleTrack(c.tr, t, d.position);
      const age = t - c.t0;
      const landed = c.tr.rest >= 0 && age > c.tr.rest;
      // r3: 落地高度采样地形(原硬编码 y=0.004,落土堆斜面穿模埋入地下 30cm,物理审查 seg1 建议 2)
      if (landed) { d.rotation.copy(c.rest); d.position.y = c.groundY(d.position.x, d.position.z) + 0.003 + (i % 7) * 0.0006; }
      else {
        d.position.x += Math.sin(age * 3 + c.ph) * c.sway * smoothstep(0.3, 1.0, age);
        d.quaternion.setFromAxisAngle(c.ax, age * c.w);
      }
      d.scale.setScalar(1);
      d.updateMatrix(); conf.setMatrixAt(i, d.matrix);
    });
    conf.count = confList.length;
    conf.instanceMatrix.needsUpdate = true;
    // 闪光
    k = 0;
    for (const s of sparks) {
      const age = t - s.t0;
      if (age < 0 || age > s.life || k >= sparkPool.length) continue;
      const m = sparkPool[k++];
      const u = age / s.life;
      // r3: sqrt(u) 初速发散(u=0 处 dv/du=∞)→ u*(2-u) 阻尼缓动,初速有限连续(物理审查 seg1 建议 3)
      m.position.copy(s.c).addScaledVector(s.d, u * (2 - u)); m.position.y += s.rise * u;
      const tw = Math.sin(u * Math.PI) * (0.75 + 0.25 * Math.sin(age * 30 + s.spin));
      m.scale.setScalar(s.s * (0.4 + tw));
      m.material.opacity = tw;
      m.material.rotation = s.spin + age * 1.5;
      m.visible = true;
    }
    for (; k < sparkPool.length; k++) sparkPool[k].visible = false;
  }
  return { update, addClods, addPuff, addConfetti, addSparkles, impacts };
}
