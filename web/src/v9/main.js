// main.js — V9 入口:renderAt(t) = 纯函数渲染(K 个子帧累积 → 后期 → 2D UI 合成)
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { buildKaikai } from './kaikai.js';
import { Post } from './post.js';
import { halton } from './util.js';

const params = new URLSearchParams(location.hash.slice(1));
const MODE = params.get('mode') || 'film';
const K = Math.max(1, +(params.get('K') || 8));
const FPS = 30, W = 1920, H = 1080;

const glCanvas = document.createElement('canvas');
glCanvas.width = W; glCanvas.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NoToneMapping;

const out = document.getElementById('out');
const octx = out.getContext('2d');

async function boot() {
  await document.fonts.load('900 100px "Noto Sans CJK SC"');
  await document.fonts.load('700 100px "Noto Sans CJK SC"');
  const world = buildWorld(renderer);
  const kk = buildKaikai();
  world.scene.add(kk.root);
  const camera = new THREE.PerspectiveCamera(34, W / H, 0.05, 2000);
  const post = new Post(renderer, W, H);

  let director, overlay = null;
  if (MODE === 'turntable') {
    const { turntable } = await import('./turntable.js');
    director = turntable({ world, kk, camera });
  } else {
    const { makeDirector } = await import('./director.js');
    const { Overlay } = await import('./overlay.js');
    const timeline = await (await fetch('src/v9/timeline.json', { cache: 'no-store' })).json();
    let lipsync = null;
    try { lipsync = await (await fetch('src/v9/lipsync.json', { cache: 'no-store' })).json(); } catch { lipsync = null; }
    director = await makeDirector({ world, kk, camera, timeline, lipsync, THREE });
    overlay = new Overlay(timeline, W, H);
    await overlay.ready();
  }

  function renderFrame(t) {
    const shutter = 0.5 / FPS;
    post.begin();
    const center = Math.floor(K / 2);
    let st = null;
    for (let k = 0; k < K; k++) {
      const tk = K > 1 ? t + shutter * ((k + 0.5) / K - 0.5) : t;
      const jx = K > 1 ? halton(k + 1, 2) - 0.5 : 0, jy = K > 1 ? halton(k + 1, 3) - 0.5 : 0;
      st = director.apply(tk, { sunJitter: [jx * 2, jy * 2] });
      camera.setViewOffset(W, H, jx, jy, W, H);
      post.addSample(world.scene, camera, 1 / K);
      if (k === center) post.captureDepth(camera);
    }
    camera.clearViewOffset();
    const s = director.apply(t, { sunJitter: [0, 0] });
    if (overlay) overlay.update(t);
    post.finish({ ...(s.post || {}), frame: Math.round(t * FPS), overlay: overlay ? overlay.tex : null });
    octx.drawImage(glCanvas, 0, 0);
    return s;
  }

  window.renderAt = (t, type, q) => {
    renderFrame(t);
    return out.toDataURL(type || 'image/jpeg', q ?? 0.94);
  };
  window.renderSheet = (ts, cols, w) => {
    const rows = Math.ceil(ts.length / cols), h = Math.round(w * 9 / 16);
    const sheet = document.createElement('canvas');
    sheet.width = cols * w; sheet.height = rows * h;
    const c2 = sheet.getContext('2d');
    const ms = [];
    ts.forEach((t, i) => {
      const s0 = performance.now();
      renderFrame(t);
      c2.drawImage(out, (i % cols) * w, ((i / cols) | 0) * h, w, h);
      c2.fillStyle = 'rgba(0,0,0,.55)'; c2.fillRect((i % cols) * w, ((i / cols) | 0) * h, 92, 26);
      c2.fillStyle = '#fff'; c2.font = '18px sans-serif'; c2.fillText(`t=${t}`, (i % cols) * w + 6, ((i / cols) | 0) * h + 19);
      ms.push(Math.round(performance.now() - s0));
    });
    return { url: sheet.toDataURL('image/jpeg', 0.9), ms };
  };
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  window.glRenderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  console.log('[v9] ready', MODE, 'K=' + K, window.glRenderer);
  renderFrame(0);
  window.ready = true;
}

boot().catch(e => { console.error('[v9] boot failed', e && e.stack || e); });
