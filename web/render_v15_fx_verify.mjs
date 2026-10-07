import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/home/yuhuxiao/.local/share/browser-binaries/puppeteer/chrome-headless-shell/linux-152.0.7977.42/chrome-headless-shell-linux64/chrome-headless-shell';

const RENDERS = [
  // 1. 转场中点与过渡过程静帧 (核心要求)
  { name: 's07_trans_iris_close.png', t: 35.85, desc: 'S07 Iris 收缩过程 (t=35.85s, 聚焦收缩至角色)' },
  { name: 's07_trans_iris_mid.png', t: 36.0, desc: 'S07 Iris 转场中点 (t=36.0s, 深藏青+奶油金黄双边框焦点)' },
  { name: 's07_trans_iris_open.png', t: 36.15, desc: 'S07 Iris 张开过程 (t=36.15s, 深藏青+奶油金黄双边框与12颗环周微星)' },
  { name: 's12_trans_push_mid.png', t: 66.0, desc: 'S12 Push 推镜中点 (t=66.0s, 52px 柔和分界渐变阴影与双色描边)' },
  { name: 's21_trans_star_mid.png', t: 124.0, desc: 'S21 Star Wipe 星形展开中点 (t=124.0s, 黄金比例五角星与16颗伴随彩色微星)' },
  { name: 's25_trans_whip_mid.png', t: 151.0, desc: 'S25 Whip 甩镜中点 (t=151.0s, 8重多重曝光模糊重影与24条速度线)' },
  { name: 's28_trans_balloon_mid.png', t: 172.0, desc: 'S28 Balloon Wipe 气球群擦除中点 (t=172.0s, 64只三层五彩气球与8条彩带飘舞)' },

  // 2. 关键粒子特效静帧
  { name: 'fx_land_dust_s05.png', t: 23.65, desc: 'S05 落地尘团 (双层圆润卡通云气与地表震荡涟漪)' },
  { name: 'fx_dirt_chunks_s10.png', t: 49.9, desc: 'S10 泥土飞溅 (5~6边形多边形土块触地弹跳衰减)' },
  { name: 'fx_emote_heart_s27.png', t: 170.0, desc: 'S27 爱心情绪符号 (backOut 弹性回弹、双音节心跳与上升微爱心)' },
  { name: 'fx_emote_question_s13.png', t: 74.8, desc: 'S13 问号情绪符号 (curious wobble 偏头摆动与汗滴)' },
  { name: 'fx_emote_exclamation_s05.png', t: 24.0, desc: 'S05 感叹号情绪符号 (放射冲击刺线与高光金黄核心)' },
  { name: 'fx_confetti_s25.png', t: 153.2, desc: 'S25 全屏彩带纸屑雨 (正反双面高光/马卡龙色 3D 翻转)' },
];

async function main() {
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
  console.log('Engine ready! Rendering still frames...');

  for (const item of RENDERS) {
    console.log(`Rendering ${item.name} at t = ${item.t}s (${item.desc})...`);
    const dataUrl = await page.evaluate(time => window.renderAt(time, 'image/png'), item.t);
    const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    const outPath = resolve(`../scratch/stills/v15_fx/${item.name}`);
    writeFileSync(outPath, buf);
    console.log(`Saved -> ${outPath} (${buf.length} bytes)`);
  }

  await browser.close();
  console.log('All still frames rendered successfully!');
}

main().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
