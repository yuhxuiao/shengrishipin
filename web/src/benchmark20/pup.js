// Character artwork only: the r03 pose, contact anchors and timing stay intact.
(function(root){
  'use strict';
  const D=root.B20Paint,M=root.B20Math;
  const C={ink:'#283D63',blue:'#83BCE5',dark:'#40466B',light:'#ACD4EF',cream:'#F1D48D',nose:'#212D48',white:'#FFFEF7'};
  const BODY='M -119 -347 Q -124 -418 -86 -429 Q -8 -445 84 -428 Q 124 -420 126 -368 L 128 -145 Q 128 -79 78 -73 L -70 -73 Q -119 -76 -120 -134 Z';
  function limb(ctx,a,b,c,back){
    // Round the elbow/knee centreline without moving the IK endpoints.
    const before=[M.mix(a[0],b[0],.78),M.mix(a[1],b[1],.78)];
    const after=[M.mix(b[0],c[0],.22),M.mix(b[1],c[1],.22)];
    ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...before);ctx.quadraticCurveTo(...b,...after);ctx.lineTo(...c);
    ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=C.ink;ctx.lineWidth=39;ctx.stroke();
    ctx.strokeStyle=back?'#75AAD5':C.blue;ctx.lineWidth=32;ctx.stroke();
  }
  function paw(ctx,p,foot=false){
    ctx.save();ctx.translate(...p);
    if(foot){
      D.path(ctx,'M -21 -16 Q -9 -22 11 -17 Q 19 -13 23 -8 Q 35 -5 32 4 Q 30 10 22 10 L -22 10 Q -31 10 -29 1 L -25 -8 Z',C.light,C.ink,3.2);
      D.path(ctx,'M -9 1 Q -7 4 -8 9 M 4 1 Q 7 5 6 10',null,'#618FBD',2);
    }else{
      D.path(ctx,'M -15 -14 Q -4 -22 8 -13 L 17 -6 Q 25 -3 21 3 Q 18 7 13 4 L 14 15 Q 14 22 8 20 L 5 13 Q 7 24 0 23 L -4 14 Q -3 23 -10 19 L -18 4 Q -25 -8 -15 -14 Z',C.light,C.ink,3);
      D.path(ctx,'M -8 0 L -4 12 M 0 -1 L 5 12',null,'#719DC5',1.8);
    }
    ctx.restore();
  }
  function partyHat(ctx){
    const hat='M -33 -427 Q 0 -448 17 -514 Q 38 -460 47 -424 Q 3 -415 -33 -427 Z';
    D.path(ctx,hat,'#786CA9',C.ink,3);
    ctx.save();ctx.clip(new Path2D(hat));
    D.path(ctx,'M 17 -507 L 33 -424 L 50 -424 Z','#5F5A94');
    for(const [x,y,r]of [[9,-481,5],[-7,-450,6],[28,-444,5],[18,-466,3]]){
      D.path(ctx,`M ${x} ${y-r} L ${x+r*.28} ${y-r*.3} L ${x+r} ${y-r*.3} L ${x+r*.45} ${y+r*.17} L ${x+r*.65} ${y+r} L ${x} ${y+r*.5} L ${x-r*.65} ${y+r} L ${x-r*.45} ${y+r*.17} L ${x-r} ${y-r*.3} L ${x-r*.28} ${y-r*.3} Z`,'#F8D88C');
    }
    ctx.restore();
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;D.ellipse(ctx,17+Math.cos(a)*5,-515+Math.sin(a)*5,5,5,'#BDDBEE');}
    D.ellipse(ctx,17,-515,3.3,3.3,'#E2EEF4');
  }
  function face(ctx,p){
    const yaw=p.yaw,shift=yaw*18;
    ctx.save();ctx.translate(0,-285);ctx.rotate(p.headTilt);ctx.translate(0,285);
    D.path(ctx,`M -115 -405 Q -121 -466 -112 -518 Q -110 -530 -101 -518 L ${-37+yaw*12} -426 Z`,C.dark,C.ink,4);
    D.path(ctx,'M -99 -433 L -103 -492 L -63 -431 Z',C.cream);
    D.path(ctx,`M 34 -424 L ${73+yaw*7} -520 Q 78 -532 84 -520 Q 110 -461 117 -410 Z`,C.blue,C.ink,4);
    D.path(ctx,'M 55 -432 L 78 -495 L 99 -431 Z',C.cream);
    ctx.restore();
    // The skull and torso share one contour, avoiding the old open neck seam.
    ctx.save();ctx.clip(new Path2D(BODY));
    D.path(ctx,`M -140 -438 L ${7+shift} -438 Q ${8+shift} -356 ${-4+shift} -291 Q -52 -268 -132 -280 Z`,C.dark);
    ctx.restore();
    ctx.save();ctx.translate(0,-285);ctx.rotate(p.headTilt);ctx.translate(0,285);
    partyHat(ctx);
    const gx=M.clamp((p.gazeTarget[0]-p.eye[0])/500,-1,1);
    const gy=M.clamp((p.gazeTarget[1]-p.eye[1])/350,-1,1);
    const eyes=[[-37+shift,46-yaw*12,63],[50+shift,49,66]];
    eyes.forEach(([x,rx,ry],index)=>{
      const ey=-331;
      D.ellipse(ctx,x,ey,rx,ry,C.white,C.ink,3.3);
      ctx.save();ctx.beginPath();ctx.ellipse(x,ey,rx-1.5,ry-1.5,0,0,Math.PI*2);ctx.clip();
      const px=x+gx*20,py=ey+gy*18;
      D.ellipse(ctx,px,py,16+p.surprise*2,25+p.surprise*3,C.nose);
      D.ellipse(ctx,px-4,py-9,3.7,5.8,C.white);
      if(p.blink>0)D.round(ctx,x-rx-3,ey-ry-3,rx*2+6,ry*2*p.blink+5,7,index===0?C.dark:C.blue);
      ctx.restore();
      const by=ey-ry-15-p.surprise*12;
      D.path(ctx,`M ${x-rx*.54} ${by+4} Q ${x} ${by-6} ${x+rx*.48} ${by}`,null,C.light,15);
    });
    // A compact, deeper muzzle instead of the r03 long duck-bill shape.
    D.path(ctx,`M ${-45+shift} -281 Q ${-20+shift} -301 ${32+shift} -287 Q ${82+shift} -301 ${117+shift} -277 Q ${148+shift} -251 ${117+shift} -227 Q ${69+shift} -199 ${1+shift} -208 Q ${-55+shift} -213 ${-52+shift} -250 Z`,C.cream);
    const nx=67+yaw*32;
    D.path(ctx,`M ${nx-25} -284 Q ${nx} -299 ${nx+27} -283 Q ${nx+29} -267 ${nx+6} -253 Q ${nx-13} -253 ${nx-25} -284 Z`,C.nose);
    D.path(ctx,`M ${nx-15} -282 Q ${nx} -290 ${nx+17} -282 Q ${nx+11} -275 ${nx-10} -279 Z`,'#8593AF');
    const mx=18+yaw*24;
    if(p.surprise>.25){D.ellipse(ctx,mx+6,-226,12,13+6*p.surprise,C.nose);}
    else if(p.smile>.15){
      D.path(ctx,`M ${mx-28} -235 Q ${mx+5} -218 ${mx+43} -239 Q ${mx+39} -198 ${mx+8} -202 Q ${mx-16} -206 ${mx-28} -235 Z`,C.nose);
      D.path(ctx,`M ${mx-21} -231 Q ${mx+5} -220 ${mx+36} -234 L ${mx+31} -223 Q ${mx+2} -215 ${mx-15} -225 Z`,C.white);
      D.path(ctx,`M ${mx} -205 Q ${mx+13} -221 ${mx+28} -211 Q ${mx+19} -199 ${mx} -205 Z`,'#EA8E92');
    }else{
      D.path(ctx,`M ${mx-31} -234 Q ${mx+3} -209 ${mx+39} -237`,null,C.ink,4);
      D.path(ctx,`M ${mx-34} -229 Q ${mx-33} -237 ${mx-27} -239`,null,C.ink,2.8);
    }
    ctx.restore();
  }
  function draw(ctx,p){
    D.ellipse(ctx,(p.legs.l.sole[0]+p.legs.r.sole[0])/2,869,112,13,'rgba(57,79,55,.14)');
    for(const side of ['l','r']){const l=p.legs[side];limb(ctx,l.hip,l.knee,l.foot,side==='l');paw(ctx,l.foot,true);}
    const back=p.arms.l;limb(ctx,back.shoulder,back.elbow,back.hand,true);paw(ctx,back.hand);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.lean);
    D.path(ctx,'M -107 -126 Q -167 -107 -202 -139 Q -221 -154 -209 -181 Q -194 -146 -166 -159 L -109 -185 Z',C.dark,C.ink,4);
    D.path(ctx,'M -208 -179 Q -201 -155 -183 -153 L -192 -138 Q -215 -150 -208 -179 Z',C.light);
    D.path(ctx,BODY,C.blue,C.ink,4.2);
    ctx.save();ctx.clip(new Path2D(BODY));
    D.ellipse(ctx,-114,-191,22,30,C.dark);
    D.ellipse(ctx,-114,-148,22,29,C.dark);
    D.path(ctx,'M -71 -180 Q -12 -204 52 -180 Q 84 -167 83 -133 L 82 -106 Q 80 -82 28 -82 L -45 -82 Q -85 -87 -87 -119 L -86 -142 Q -88 -167 -71 -180 Z',C.cream);
    ctx.restore();
    face(ctx,p);ctx.restore();
    const front=p.arms.r;limb(ctx,front.shoulder,front.elbow,front.hand,false);paw(ctx,front.hand);
    if(p.crouch>.75)D.line(ctx,[[front.hand[0]+8,front.hand[1]+2],[front.hand[0]+24,front.hand[1]+7]],C.light,10);
  }
  root.B20Pup={draw};
})(globalThis);
