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

  const url = pathToFileURL(resolve('v13_pose_test.html')).href;
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.ready === true', { timeout: 30000 });

  // 1. Overview (t = 0)
  console.log('Rendering Overview (t = 0)');
  const d0 = await page.evaluate(() => window.renderAt(0, 'image/png'));
  writeFileSync('../scratch/stills/v13_pose_test_overview.png', Buffer.from(d0.replace(/^data:image\/png;base64,/, ''), 'base64'));

  // 2. All 28 Poses Grid (t = 0.5)
  console.log('Rendering All 28 Poses (t = 0.5)');
  const d1 = await page.evaluate(() => window.renderAt(0.5, 'image/png'));
  writeFileSync('../scratch/stills/v13_pose_test_all_28_poses.png', Buffer.from(d1.replace(/^data:image\/png;base64,/, ''), 'base64'));

  await browser.close();
  console.log('Completed test render!');
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
