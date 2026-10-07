// Deterministic export surface compatible with web/render.mjs.
(function(root){
  'use strict';
  const canvas=document.getElementById('out'),ctx=canvas.getContext('2d');
  const S=root.B20Shots;
  let current=0,playing=false,last=0;
  const slider=document.getElementById('time'),label=document.getElementById('time-label'),play=document.getElementById('play');
  function draw(t){
    const s=S.evaluateScene(t),[x,y,z]=s.camera;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1920,1080);
    ctx.setTransform(z,0,0,z,960-x*z,540-y*z);
    root.B20Scene.background(ctx);
    root.B20Scene.groundProps(ctx,s.wawa,s.t);
    root.B20Wawa.draw(ctx,s.wawa);
    root.B20Pup.draw(ctx,s.pup);
    ctx.setTransform(1,0,0,1,0,0);
    return s;
  }
  function show(t){
    current=Math.max(0,Math.min(20,t));
    const s=draw(current);slider.value=current;label.textContent=`${current.toFixed(2)} / 20.00 s · ${s.shot.name}`;
  }
  root.renderAt=function(t,mime='image/jpeg',quality=.96){draw(t);return canvas.toDataURL(mime,quality);};
  root.renderSheet=function(times,cols=3,width=640){
    const h=width*1080/1920,pad=32;
    const sheet=document.createElement('canvas');sheet.width=cols*width;sheet.height=Math.ceil(times.length/cols)*(h+pad);
    const c=sheet.getContext('2d'),ms=[];c.fillStyle='#F6F1E5';c.fillRect(0,0,sheet.width,sheet.height);
    times.forEach((t,i)=>{
      const a=performance.now(),s=draw(t);ms.push(Math.round(performance.now()-a));
      const x=(i%cols)*width,y=Math.floor(i/cols)*(h+pad);c.drawImage(canvas,x,y,width,h);
      c.fillStyle='#34435F';c.font='16px sans-serif';c.fillText(`${s.shot.id} · ${t.toFixed(2)}s`,x+12,y+h+22);
    });
    draw(current);return {url:sheet.toDataURL('image/jpeg',.94),ms};
  };
  root.evaluateScene=S.evaluateScene;
  play.addEventListener('click',()=>{if(current>=20)current=0;playing=!playing;play.textContent=playing?'暂停':'播放';last=0;});
  slider.addEventListener('input',()=>{playing=false;play.textContent='播放';show(Number(slider.value));});
  document.getElementById('restart').addEventListener('click',()=>{playing=false;play.textContent='播放';show(0);});
  function tick(now){
    if(playing){if(last)show(current+(now-last)/1000);if(current>=20){playing=false;play.textContent='播放';}}
    last=now;requestAnimationFrame(tick);
  }
  show(0);root.ready=true;requestAnimationFrame(tick);
})(globalThis);
