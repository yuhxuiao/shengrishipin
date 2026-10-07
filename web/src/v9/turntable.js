// turntable.js — 角色/场景审查用:t 取整数选择预设机位与姿态
import * as THREE from 'three';
import { MOUND } from './world.js';

export function turntable({ world, kk, camera }) {
  const shots = [
    { name: 'front', cam: [0, 0.62, 3.3], look: [0, 0.55, 0], fov: 32 },
    { name: 'hero-3/4-door', cam: [2.1, 0.85, 2.5], look: [0.05, 0.55, 0.1], fov: 32 },
    { name: 'side-door', cam: [3.3, 0.6, 0.05], look: [0, 0.5, 0.05], fov: 30 },
    { name: 'arm-side-3/4', cam: [-2.3, 0.9, 2.4], look: [-0.2, 0.55, 0.3], fov: 32 },
    { name: 'back-3/4', cam: [1.9, 1.1, -2.6], look: [0, 0.55, 0], fov: 32 },
    { name: 'face-closeup', cam: [0.28, 0.74, 1.45], look: [0, 0.66, 0.3], fov: 30, focus: 1.2, ap: 6.0, pose: { boom: -0.14 } }, // 动臂略降 8° 避让面部
    { name: 'wave', cam: [1.3, 0.95, 3.4], look: [-0.1, 0.82, 0.2], fov: 34, pose: { swing: -0.3, boom: 0.8, stick: 1.35, bucket: -0.6, smile: 1, mouthOpen: 0.55, squintL: 0.55, squintR: 0.55, brow: 0.6 } }, // 后移+抬高留顶部安全区;微转向臂侧露油缸
    { name: 'dig', cam: [0.9, 1.0, 3.1], look: [-0.5, 0.35, 0.35], fov: 34, pose: { swing: -0.63, boom: -0.2, stick: 0.25, bucket: -0.9, lookX: -0.7, lookY: -0.6, smile: 0.8 } },
    { name: 'expr', cam: [0.2, 0.72, 1.6], look: [0, 0.64, 0.3], fov: 30, focus: 1.35, ap: 6.0, pose: { boom: -0.14, blinkR: 1, mouthOpen: 0.9, smile: 1, brow: 0.8, lookX: 0.4 } },
    { name: 'wide', cam: [0.4, 1.35, 7.5], look: [0, 0.7, 0], fov: 36, focus: 7.3, ap: 4.5 },
  ];
  const look = new THREE.Vector3();
  return {
    apply(t, { sunJitter } = {}) {
      const s = shots[Math.min(shots.length - 1, Math.max(0, Math.round(t)))];
      world.update(t, { sunJitter });
      world.mound.setCraters(s.name === 'dig' ? [{ x: MOUND.x + 0.18, z: MOUND.z - 0.12, r: 0.2, depth: 0.08 }] : []);
      kk.setPose({ smile: 0.7, mouthOpen: 0, ...(s.pose || {}) });
      camera.fov = s.fov; camera.position.set(...s.cam); look.set(...s.look);
      camera.lookAt(look); camera.updateProjectionMatrix();
      const focus = s.focus ?? camera.position.distanceTo(look);
      return { post: { focus, aperture: s.ap ?? 4.5, maxR: 28, exposure: 1.6, bloom: 0.3 } }; // r4: 与正片同步 1.85→1.6
    },
  };
}
