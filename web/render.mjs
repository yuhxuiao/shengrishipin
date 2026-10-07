// render.mjs — 用 headless Chrome 逐帧渲染页面(确定性 renderAt(t))
//   node render.mjs --sheet=2,16,45,100,140,225 --out=out/sheet.jpg   快速预览
//   node render.mjs --stills=2,16,45 --out=out/stills                 全尺寸静帧
//   node render.mjs --frames=0:237 --workers=5                        渲染全部帧(可续跑)
//   --http   内置静态服务器(以仓库根为根),ES module 页面(v9)必需
//   --gpu    WSL2 GPU 直通:Mesa d3d12 → ANGLE GL(RTX 2060),仅 headless-shell 可用
//   --hash=#K=8&q=0.95  透传给页面的参数
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { mkdirSync, writeFileSync, existsSync, statSync, renameSync, readFileSync } from 'node:fs';
import { dirname, resolve, join, extname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BIN = '/home/yuhuxiao/.local/share/browser-binaries/puppeteer';
const CHROME = args.chrome || `${BIN}/chrome-headless-shell/linux-152.0.7977.42/chrome-headless-shell-linux64/chrome-headless-shell`;
const fps = +(args.fps || 30);
const FRAMES_DIR = args.dir || 'out/frames';
const PAGE = args.page || 'studio.html';
const TOTAL = +(args.total || 237.03);
const Q = +(args.q || 0.94);

let server = null, baseURL = null;
if (args.http) {
  const root = resolve('..');
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
  server = http.createServer((req, res) => {
    const p = join(root, decodeURIComponent(req.url.split(/[?#]/)[0]));
    if (!p.startsWith(root) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(p));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  baseURL = `http://127.0.0.1:${server.address().port}/${relative(root, resolve(PAGE))}`;
}

const gpuArgs = ['--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl', '--enable-gpu-rasterization'];
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 0,
  env: args.gpu ? { ...process.env, GALLIUM_DRIVER: 'd3d12', MESA_D3D12_DEFAULT_ADAPTER_NAME: 'NVIDIA' } : process.env,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--window-size=1920,1080',
         '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
         ...(args.gpu ? gpuArgs : ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'])],
});

let pageErrors = 0;
async function openPage(tag = '') {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  page.on('pageerror', e => { pageErrors++; console.log(`[page error${tag}]`, e.message); });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warn' || m.text().startsWith('[v9]')) console.log(`[console${tag}]`, m.text()); });
  const url = (baseURL || pathToFileURL(resolve(PAGE)).href) + (args.hash || '');
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.ready === true', { timeout: 300000 });
  return page;
}

const frameOf = async (page, t, q = Q) => {
  const url = await page.evaluate((t, q) => window.renderAt(t, 'image/jpeg', q), t, q);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};

const times = s => String(s).split(',').map(Number);

if (args.sheet) {
  const page = await openPage(), out = args.out || 'out/sheet.jpg';
  mkdirSync(dirname(out), { recursive: true });
  const { url, ms } = await page.evaluate((ts, c, w) => window.renderSheet(ts, c, w), times(args.sheet), +(args.cols || 3), +(args.w || 640));
  writeFileSync(out, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  console.log(`${out}  ms/frame: ${ms.join(' ')}`);
} else if (args.stills) {
  const page = await openPage(), out = args.out || 'out/stills';
  mkdirSync(out, { recursive: true });
  for (const s of times(args.stills)) {
    const t0 = Date.now(), buf = await frameOf(page, s, Math.max(Q, .97));
    const f = `${out}/t${String(s).replace('.', '_')}.jpg`;
    writeFileSync(f, buf);
    console.log(`${f}  ${Date.now() - t0} ms`);
  }
} else if (args.frames) {
  const [a, b] = String(args.frames).split(':').map(Number);
  const workers = +(args.workers || 5);
  mkdirSync(FRAMES_DIR, { recursive: true });
  const first = Math.round(a * fps), last = Math.min(Math.ceil(TOTAL * fps) - 1, Math.round(b * fps) - 1);
  const todo = [];
  for (let i = first; i <= last; i++) {
    const f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`;
    if (!existsSync(f) || statSync(f).size < 5000) todo.push(i);
  }
  console.log(`${todo.length} frames to render, ${workers} workers`);
  let next = 0, done = 0;
  const start = Date.now();
  const work = async w => {
    const page = await openPage('#' + w);
    while (next < todo.length) {
      const i = todo[next++], f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`;
      const buf = await frameOf(page, i / fps);
      writeFileSync(f + '.tmp', buf); renameSync(f + '.tmp', f);
      if (++done % 60 === 0 || done === todo.length) {
        const el = (Date.now() - start) / 1000;
        console.log(`frame ${done}/${todo.length}  ${(el / done * 1000).toFixed(0)} ms/frame  eta ${((todo.length - done) * el / done / 60).toFixed(1)} min`);
      }
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: workers }, (_, w) => work(w)));
  console.log(`done in ${((Date.now() - start) / 60000).toFixed(1)} min, page errors: ${pageErrors}`);
}
await browser.close();
if (server) server.close();
