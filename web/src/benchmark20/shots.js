// Six intentional cuts; all actor state remains continuous across them.
(function (root) {
  'use strict';
  const M = root.B20Math || require('./pose.js');
  const Dig = root.B20Dig || require('./dig.js');
  const SHOTS = [
    { id:'discover', start:0, end:3, name:'发现', camera:[720,644,1.48] },
    { id:'invite', start:3, end:6, name:'邀请', camera:[1050,603,1.06] },
    { id:'approach', start:6, end:9, name:'靠近', camera:[1020,615,1.02] },
    { id:'scoop', start:9, end:14, name:'一铲土', camera:[1180,642,1.85] },
    { id:'reveal', start:14, end:17, name:'小鸭子', camera:[895,861,4.2] },
    { id:'response', start:17, end:20, name:'会意', camera:[1000,615,1.13] },
  ];
  const EVENTS = [
    { t:1.4, kind:'notice' }, { t:6.55, kind:'engine' },
    { t:10.4, kind:'scoop' }, { t:14.55, kind:'duck' },
  ];
  function step(t, start, from, to) {
    const u = M.clamp((t - start) / 0.62);
    return { x:M.mix(from,to,M.ease(u)), y:865 - 34 * 4 * u * (1-u), planted:u === 0 || u === 1 };
  }
  function feet(t) {
    const l = t < 7.5 ? step(t,6.05,590,485) : step(t,7.5,485,392);
    const r = t < 8.25 ? step(t,6.78,684,588) : step(t,8.25,588,486);
    return { l,r };
  }
  function evaluatePup(t, wawa) {
    const f = feet(t);
    const crouch = M.phase(t,1.05,1.95) * (1-M.phase(t,3.12,3.85));
    const wave = M.curve(t,[[0,0],[3.6,0],[4.0,1],[4.35,0.75],[4.65,1],[5.15,0]]);
    const surprise = M.phase(t,16.95,17.4) * (1-M.phase(t,18.1,18.65));
    const smile = M.phase(t,18.05,18.6);
    const lean = crouch * 0.11 + surprise * -0.04;
    const x = (f.l.x+f.r.x)/2 + crouch * 12;
    const y = 865 + crouch * 42;
    const yaw = M.curve(t,[[0,0.12],[0.9,0.3],[1.9,0.66],[3.1,0.66],[3.95,0.94],[5.5,0.8],[8.8,0.7],[16.9,0.7],[17.7,0.45],[18.65,0.92],[20,0.72]]);
    const gazeTarget = t < 3.3 ? [852,851] : t < 5.8 ? [wawa.x-20,525] : t < 18.0 ? [874,848] : [wawa.x-20,520];
    const headTilt = M.curve(t,[[0,-0.02],[1.8,0.08],[3.3,0.08],[4.1,-0.09],[6,-0.02],[16.8,0.01],[17.35,-0.06],[18.6,-0.04],[20,0]]);
    const body = p => M.transform(p,x,y,lean);
    const shoulders = { l:body([-100,-195]), r:body([103,-195]) };
    const restR = body([139,-42]);
    const point = [824,852];
    const waveHand = body([190 + 9*Math.sin(wave*Math.PI),-315]);
    let handR = [M.mix(restR[0],point[0],crouch),M.mix(restR[1],point[1],crouch)];
    handR = [M.mix(handR[0],waveHand[0],wave),M.mix(handR[1],waveHand[1],wave)];
    const handL = body([-139+crouch*34,-42+crouch*8]);
    const hands = { l:handL, r:handR };
    // Reach is capped at the arm's actual length, without moving the support feet.
    for (const side of ['l','r']) {
      const a=shoulders[side], b=hands[side], d=M.distance(a,b);
      if (d>170) hands[side]=[a[0]+(b[0]-a[0])*170/d,a[1]+(b[1]-a[1])*170/d];
    }
    const hips = { l:body([-48,-132]), r:body([48,-132]) };
    const legs = {};
    for (const side of ['l','r']) {
      const foot=[f[side].x,f[side].y-11];
      legs[side]={hip:hips[side],knee:M.joint(hips[side],foot,68,66,-1),foot,sole:[f[side].x,f[side].y],planted:f[side].planted};
    }
    const arms = {};
    for (const side of ['l','r']) arms[side]={shoulder:shoulders[side],elbow:M.joint(shoulders[side],hands[side],86,86,1),hand:hands[side]};
    const blink = [2.8,5.85,8.85,15.6,19.55].reduce((a,b)=>Math.max(a,Math.max(0,1-Math.abs(t-b)/0.11)),0);
    return {x,y,lean,yaw,headTilt,crouch,wave,surprise,smile,gazeTarget,legs,arms,blink,eye:body([45,-329])};
  }
  function evaluateScene(t) {
    if (!Number.isFinite(t)) throw new TypeError('time must be finite');
    t=M.clamp(t,0,20);
    const wawa=Dig.evaluate(t), pup=evaluatePup(t,wawa);
    const shot=SHOTS.find(s=>t>=s.start&&t<s.end)||SHOTS[SHOTS.length-1];
    return {t,shot,camera:shot.camera,wawa,pup};
  }
  const api={SHOTS,EVENTS,TOTAL:20,FPS:30,evaluateScene};
  root.B20Shots=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
