import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/home/yuhuxiao/.local/share/browser-binaries/puppeteer/chrome-headless-shell/linux-152.0.7977.42/chrome-headless-shell-linux64/chrome-headless-shell';

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

  const url = pathToFileURL(resolve('v13.html')).href;
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.ready === true', { timeout: 30000 });

  // Render Bluey in S05 (t = 25.0s)
  console.log('Rendering S05 (t = 25.0s)');
  const d1 = await page.evaluate(() => window.renderAt(25.0, 'image/png'));
  writeFileSync('../scratch/stills/v13_movie_s05_bluey.png', Buffer.from(d1.replace(/^data:image\/png;base64,/, ''), 'base64'));

  // Render Bluey & Bingo in S16 (t = 94.0s)
  console.log('Rendering S16 (t = 94.0s)');
  const d2 = await page.evaluate(() => window.renderAt(94.0, 'image/png'));
  writeFileSync('../scratch/stills/v13_movie_s16_bluey_bingo.png', Buffer.from(d2.replace(/^data:image\/png;base64,/, ''), 'base64'));

  await browser.close();
  console.log('Completed movie stills render!');
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
