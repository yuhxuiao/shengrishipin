import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/home/yuhuxiao/.local/share/browser-binaries/puppeteer/chrome-headless-shell/linux-152.0.7977.42/chrome-headless-shell-linux64/chrome-headless-shell';

const SCENES = [
  { name: 'yard.png', t: 8.0, desc: 'Yard 院子 (t=8.0s)' },
  { name: 'garden.png', t: 38.0, desc: 'Garden 花园 (t=38.0s)' },
  { name: 'sandbox.png', t: 68.0, desc: 'Sandbox 沙坑 (t=68.0s)' },
  { name: 'tree.png', t: 101.0, desc: 'Tree 大树下 (t=101.0s)' },
  { name: 'golden.png', t: 127.0, desc: 'Golden 金色时刻 (t=127.0s)' },
  { name: 'party.png', t: 175.0, desc: 'Party 派对桌 (t=175.0s)' },
];

async function main() {
  mkdirSync('../scratch/stills/v15_scene', { recursive: true });
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  const url = pathToFileURL(resolve('v15.html')).href;
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.ready === true', { timeout: 30000 });
  console.log('Engine ready! Rendering scene still frames...');

  for (const item of SCENES) {
    console.log(`Rendering ${item.name} at t = ${item.t}s (${item.desc})...`);
    const dataUrl = await page.evaluate(time => window.renderAt(time, 'image/png'), item.t);
    const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    const outPath = resolve(`../scratch/stills/v15_scene/${item.name}`);
    writeFileSync(outPath, buf);
    console.log(`Saved -> ${outPath} (${buf.length} bytes)`);
  }

  await browser.close();
  console.log('All scene still frames rendered successfully!');
}

main().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
