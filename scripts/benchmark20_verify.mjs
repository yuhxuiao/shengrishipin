// Tests the same world-space state used by the renderer, not source keywords.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const S=require('../web/src/benchmark20/shots.js'),M=require('../web/src/benchmark20/pose.js');
const report={geometry:{},browser:null,aesthetic_acceptance:'pending user review'};
const near=(a,b,tol,msg)=>assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a} vs ${b}`);
let prev=null,maxFootDrift=0,maxKneeY=-Infinity,minBucketClearance=Infinity;
for(let i=0;i<=1200;i++){
  const t=i/60,s=S.evaluateScene(t),w=s.wawa,p=s.pup;
  assert.deepEqual(s,S.evaluateScene(t),'repeat evaluation');
  near(M.distance(w.rootPin,w.elbow),270,1e-6,`boom length @ ${t}`);
  near(M.distance(w.elbow,w.pin),250,1e-6,`stick length @ ${t}`);
  for(const side of ['l','r']){
    const l=p.legs[side],a=p.arms[side];
    near(M.distance(l.hip,l.knee),68,1e-6,`thigh @ ${t}`);
    near(M.distance(l.knee,l.foot),66,1e-6,`shin @ ${t}`);
    near(M.distance(a.shoulder,a.elbow),86,1e-6,`upper arm @ ${t}`);
    near(M.distance(a.elbow,a.hand),86,1e-6,`forearm @ ${t}`);
    maxKneeY=Math.max(maxKneeY,l.knee[1]+19.5);
    assert.ok(l.knee[1]+19.5<=867,`knee silhouette below ground @ ${t}: ${l.knee[1]+19.5}`);
    assert.ok(l.sole[1]<=867,`foot below ground @ ${t}`);
    if(l.planted){near(l.sole[1],865,2,`plant height @ ${t}`);
      if(prev?.pup.legs[side].planted){const d=M.distance(l.sole,prev.pup.legs[side].sole);maxFootDrift=Math.max(maxFootDrift,d);assert.ok(d<=2,`sliding plant @ ${t}`);}
    }
  }
  const b=w.trackBox;
  for(const q of w.bucketContour){
    assert.ok(!(q[0]>=b[0]-3&&q[0]<=b[2]+3&&q[1]>=b[1]-3&&q[1]<=b[3]+3),`bucket/track @ ${t}`);
    minBucketClearance=Math.min(minBucketClearance,b[0]-q[0]);
    const local=M.transform([q[0]-p.x,q[1]-p.y],0,0,-p.lean);
    assert.ok(!(local[0]>-155&&local[0]<182&&local[1]>-547&&local[1]<-50),`bucket/pup @ ${t}`);
    if(q[1]>865)assert.ok(q[0]>=748&&q[0]<=1075&&q[1]<909,`bucket enters non-soil ground @ ${t}`);
  }
  near(w.bucketSoil,w.soilRemoved,1e-12,'soil ledger');
  assert.ok(w.exposed<=w.soilRemoved+1e-12,'toy appears before soil removed');
  if(prev){
    assert.ok(w.soilRemoved>=prev.wawa.soilRemoved,'soil restored without dumping');
    assert.deepEqual(w.duck,prev.wawa.duck,'toy teleported');
    if(w.soilRemoved>prev.wawa.soilRemoved+1e-8){assert.ok(w.teeth[0]>prev.wawa.teeth[0],`scoop must pull toward machine @ ${t}`);assert.ok(w.teeth[1]>=795&&w.teeth[1]<=885,`soil removed without contact @ ${t}`);}
  }
  prev=s;
}
for(const t of [3,6,9,14,17]){
  const a=S.evaluateScene(t-1e-6),b=S.evaluateScene(t+1e-6);
  assert.ok(M.distance(a.wawa.pin,b.wawa.pin)<.01,'cut moved bucket');
  assert.ok(Math.abs(a.pup.x-b.pup.x)<.01,'cut moved pup');
}
const times=[19.7,0,7.14,10.71,3.6,14.4,1.9];
for(const t of times){const s=S.evaluateScene(t);S.evaluateScene(20-t);assert.deepEqual(s,S.evaluateScene(t),'random seek changed state');}
report.geometry={samples:1201,rate_hz:60,max_plant_drift_px:maxFootDrift,max_knee_bottom_y:maxKneeY,min_bucket_track_horizontal_clearance_px:minBucketClearance,passed:true};
const baseline=JSON.parse(readFileSync(resolve(ROOT,'.trellis/tasks/10-06-benchmark20-animation/baseline.json'),'utf8'));
for(const [p,hash]of Object.entries(baseline))assert.equal(createHash('sha256').update(readFileSync(resolve(ROOT,p))).digest('hex'),hash,`historical file modified: ${p}`);
report.historical_files_unchanged=Object.keys(baseline).length;
if(process.argv.includes('--browser')){
  const webRequire=createRequire(resolve(ROOT,'web/package.json')),puppeteer=webRequire('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:'/home/yuhuxiao/.local/share/browser-binaries/puppeteer/chrome-headless-shell/linux-152.0.7977.42/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.setViewport({width:1280,height:850});
    await page.goto('http://127.0.0.1:8769/benchmark20.html',{waitUntil:'networkidle0'});
    await page.waitForFunction('window.ready===true');
    assert.equal(await page.evaluate(()=>renderAt(1.9,'image/png')===renderAt(1.9,'image/png')),true);
    await page.click('#play');await page.waitForFunction('Number(document.querySelector("#time").value)>0.2');await page.click('#play');
    const paused=await page.$eval('#time',n=>Number(n.value));
    await page.evaluate(()=>{const s=document.querySelector('#time');s.value='14.5';s.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.match(await page.$eval('#time-label',n=>n.textContent),/14.50/);
    await page.click('#restart');assert.equal(await page.$eval('#time',n=>Number(n.value)),0);
    await page.setViewport({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile horizontal overflow');
    assert.deepEqual(errors,[]);
    report.browser={engine:'project Chromium headless',play_advanced_to:paused,seek_restart:true,repeated_render_identical:true,mobile_no_overflow:true,errors};
  }finally{await browser.close();}
}
const outArg=process.argv.find(a=>a.startsWith('--out='));
if(outArg)writeFileSync(resolve(ROOT,outArg.slice(6)),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
