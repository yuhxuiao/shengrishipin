import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/home/yuhuxiao/.local/share/browser-binaries/puppeteer/chrome-headless-shell/linux-152.0.7977.42/chrome-headless-shell-linux64/chrome-headless-shell';

async function run() {
  mkdirSync('../scratch/stills/v15_char', { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  const url = pathToFileURL(resolve('../scratch/test_v15_render.html')).href;
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.ready === true', { timeout: 30000 });

  const poses = ['clap', 'run', 'wave', 'point', 'hug_bone', 'jump_cheer'];

  for (const p of poses) {
    console.log(`Rendering single pose still: ${p}...`);
    const dataUrl = await page.evaluate((pose) => window.renderSinglePose('bluey', pose, 0.5), p);
    const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    writeFileSync(`../scratch/stills/v15_char/${p}.png`, buf);
  }

  // Also render Bingo's clap, stand, and laugh for verification
  console.log('Rendering bingo clap...');
  const bingoClap = await page.evaluate(() => window.renderSinglePose('bingo', 'clap', 0.5));
  writeFileSync('../scratch/stills/v15_char/bingo_clap.png', Buffer.from(bingoClap.replace(/^data:image\/png;base64,/, ''), 'base64'));

  console.log('Rendering gallery sheet (Bluey)...');
  const gallery = await page.evaluate(() => window.renderGallery(0.5));
  writeFileSync('../scratch/stills/v15_char/gallery_6_key_poses.png', Buffer.from(gallery.replace(/^data:image\/png;base64,/, ''), 'base64'));

  console.log('Rendering gallery sheet (Bingo)...');
  const bingoGallery = await page.evaluate(() => window.renderBingoGallery(0.5));
  writeFileSync('../scratch/stills/v15_char/gallery_bingo.png', Buffer.from(bingoGallery.replace(/^data:image\/png;base64,/, ''), 'base64'));

  await browser.close();
  console.log('All v15 character stills rendered successfully!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
