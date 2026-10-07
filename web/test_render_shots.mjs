import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/v11.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
  // fallback 到上一级目录 (for assets 等)
  const actualPath = fs.existsSync(filePath) ? filePath : path.join(process.cwd(), '..', reqPath.replace(/^\//, ''));
  if (!fs.existsSync(actualPath)) {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
    return;
  }
  const ext = path.extname(actualPath);
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ttf': 'font/ttf',
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(actualPath).pipe(res);
});

server.listen(8099, async () => {
  console.log('Test server started on 8099');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err));

  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://127.0.0.1:8099/v11.html', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.ready === true', { timeout: 15000 });

  const testTimes = [2.0, 8.0, 13.0, 25.0, 56.0, 75.0, 94.0, 112.0, 153.0, 190.0, 207.0, 224.0];
  fs.mkdirSync('../scratch/v11/test_shots', { recursive: true });

  for (const t of testTimes) {
    const dataUrl = await page.evaluate(time => window.renderAt(time), t);
    const base64 = dataUrl.split(',')[1];
    const outPath = '../scratch/v11/test_shots/shot_t' + t.toFixed(1) + '.jpg';
    fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
    console.log('Saved ' + outPath + ' (' + (base64.length / 1024).toFixed(1) + ' KB)');
  }

  await browser.close();
  server.close();
  console.log('Render test passed completely!');
});
