// Regressions observe painted mechanisms/material, not duplicated state labels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const S=require('../web/src/benchmark20/shots.js');
const M=require('../web/src/benchmark20/pose.js');
const FK=require('../web/src/v10/fk.js');

function mechanism(t){
  const state=S.evaluateScene(t).wawa,lines=[];
  let matrix=[1,0,0,1,0,0];const stack=[];
  const ctx={
    save(){stack.push(matrix.slice());},restore(){matrix=stack.pop();},
    translate(x,y){matrix=FK.mMul(matrix,FK.mTrans(x,y));},
    rotate(a){matrix=FK.mMul(matrix,FK.mRotCCW(-a*180/Math.PI));},
    beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},clip(){},rect(){},
  };
  const paint={path(){},ellipse(){},round(){},line(c,points,color,width){lines.push({local:points.map(p=>p.slice()),world:points.map(p=>FK.mApply(matrix,p)),color,width});}};
  const sandbox={B20Math:M,B20Paint:paint,B20Dig:require('../web/src/benchmark20/dig.js'),Path2D:class{}};
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(resolve(ROOT,'web/src/benchmark20/wawa.js'),'utf8'),sandbox);
  sandbox.B20Wawa.draw(ctx,state);
  return {state,lines};
}

function lowerTreads(sample){
  return sample.lines.filter(l=>l.color==='#10375F'&&l.width===4)
    .map(l=>[(l.world[0][0]+l.world[1][0])/2,(l.world[0][1]+l.world[1][1])/2])
    .filter(p=>p[1]>845);
}

test('painted lower track treads remain stationary against the ground',()=>{
  let worst=0;
  for(let t=6.7;t<8.3;t+=.04){
    const a=mechanism(t),b=mechanism(t+.02),first=lowerTreads(a),second=lowerTreads(b);
    assert.ok(first.length>3&&second.length>3,'actual lower-tread drawing must be observable');
    const lo=Math.max(a.state.x,b.state.x)-135,hi=Math.min(a.state.x,b.state.x)+115;
    for(const p of first.filter(p=>p[0]>lo&&p[0]<hi)){
      const drift=Math.min(...second.map(q=>Math.abs(q[0]-p[0])));
      worst=Math.max(worst,drift);
    }
  }
  console.log(`actual lower-tread drift over20ms: ${worst.toFixed(3)}px`);
  assert.ok(worst<.05,`belt moves against ground: ${worst}px`);
});

test('painted hydraulic barrel has constant manufactured length',()=>{
  const lengths=[];
  for(let t=9;t<=14;t+=.05){
    const cylinders=mechanism(t).lines.filter(l=>l.color==='#7DBCE7'&&l.width===13);
    assert.ok(cylinders.length,'actual cylinder barrel drawing must be observable');
    lengths.push(M.distance(cylinders[0].world[0],cylinders[0].world[1]));
  }
  const min=Math.min(...lengths),max=Math.max(...lengths);
  console.log(`actual cylinder barrel length: ${min.toFixed(3)}..${max.toFixed(3)}px`);
  assert.ok(max-min<.01,`barrel itself stretches ${max-min}px`);
});

test('ground loses visible soil during the scoop, not a delayed reveal wipe',async()=>{
  const webRequire=createRequire(resolve(ROOT,'web/package.json'));
  const browser=await webRequire('puppeteer-core').launch({
    executablePath:'/home/yuhuxiao/.local/share/browser-binaries/puppeteer/chrome-headless-shell/linux-152.0.7977.42/chrome-headless-shell-linux64/chrome-headless-shell',
    headless:true,args:['--no-sandbox'],
  });
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:8769/benchmark20.html',{waitUntil:'networkidle0'});
    await page.waitForFunction('window.ready===true');
    const samples=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=1920;c.height=1080;const g=c.getContext('2d');
      return [10.3,11.65,13.9,14.19].map(t=>{
        g.clearRect(0,0,c.width,c.height);const s=evaluateScene(t).wawa;
        B20Scene.groundProps(g,s,t);
        const a=g.getImageData(700,760,400,170).data;let soil=0;
        for(let i=0;i<a.length;i+=4)if(a[i]===191&&a[i+1]===162&&a[i+2]===118&&a[i+3]===255)soil++;
        return {t,soilPixels:soil,load:s.bucketSoil};
      });
    });
    console.log(`actual soil raster: ${JSON.stringify(samples)}`);
    assert.ok(samples[0].soilPixels>1000,'must measure the rendered material');
    assert.ok(samples[1].load>.8,'sample must have a loaded bucket');
    assert.ok(samples[1].soilPixels<samples[0].soilPixels*.85,'bucket is loaded while the entire mound is still painted unchanged');
  }finally{await browser.close();}
});
