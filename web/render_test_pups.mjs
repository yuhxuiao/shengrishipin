import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/home/yuhuxiao/.local/share/browser-binaries/puppeteer/chrome-headless-shell/linux-152.0.7977.42/chrome-headless-shell-linux64/chrome-headless-shell';

mkdirSync('../scratch/stills', { recursive: true });

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  const url = pathToFileURL(resolve('../scratch/test_vector_pup.html')).href;
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'load' });

  for (const scene of ['side_by_side', 'actions', 'close_up']) {
    console.log('Rendering', scene);
    const dataUrl = await page.evaluate(s => window.renderAt(s), scene);
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const outPath = `../scratch/stills/${scene}.png`;
    writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
    console.log('Saved', outPath);
  }

  await browser.close();
  console.log('Done rendering stills!');
}

run().catch(err => {
  console.error('Run failed:', err);
  process.exit(1);
});
