import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/home/yuhuxiao/.local/share/browser-binaries/puppeteer/chrome-headless-shell/linux-152.0.7977.42/chrome-headless-shell-linux64/chrome-headless-shell';
const OUT_DIR = resolve('out/test_v13_dig');

mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') console.log('PAGE:', msg.text());
  });
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  const url = pathToFileURL(resolve('v13.html')).href;
  console.log('Loading page:', url);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.ready === true', { timeout: 30000 });

  const targets = [
    // S09 (CU Digging: 48~54s)
    { t: 49.5, name: 's09_t49_5_bite.jpg' },
    { t: 50.2, name: 's09_t50_2_scoop.jpg' },
    { t: 50.8, name: 's09_t50_8_lift.jpg' },
    { t: 51.1, name: 's09_t51_1_dump.jpg' },

    // S13 (Duck Dig in sandbox: 72~78s)
    { t: 72.8, name: 's13_t72_8_duck_pop.jpg' },
    { t: 74.0, name: 's13_t74_0_surprise.jpg' },

    // S23 & S24 (Golden Treasure Dig: 137~151s)
    { t: 138.5, name: 's23_t138_5_dig1.jpg' },
    { t: 140.5, name: 's23_t140_5_dig2.jpg' },
    { t: 143.5, name: 's23_t143_5_lift.jpg' },
    { t: 146.0, name: 's24_t146_0_gift_found.jpg' },
  ];

  for (const tgt of targets) {
    console.log(`Rendering t=${tgt.t}s -> ${tgt.name}...`);
    const dataUrl = await page.evaluate((t) => window.renderAt(t, 'image/jpeg', 0.94), tgt.t);
    const buf = Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
    const outPath = join(OUT_DIR, tgt.name);
    writeFileSync(outPath, buf);
    console.log(`Saved ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
  }

  await browser.close();
  console.log('All verification keyframes successfully rendered!');
}

run().catch(err => {
  console.error('Render failed:', err);
  process.exit(1);
});
