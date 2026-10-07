// Restore Wawa's bright birthday identity without changing the validated rig.
(function(root){
  'use strict';
  const D=root.B20Paint,M=root.B20Math;
  const C={ink:'#153C69',blue:'#39ADF2',light:'#8ED4FB',shade:'#248DDA',track:'#164A80',metal:'#B9DFF2',cream:'#FFE6B7'};
  function bar(ctx,a,b,width,color){D.line(ctx,[a,b],C.ink,width+8);D.line(ctx,[a,b],color,width);}
  function cylinder(ctx,a,b){
    const m=[M.mix(a[0],b[0],.57),M.mix(a[1],b[1],.57)];
    bar(ctx,a,m,13,'#7DBCE7');bar(ctx,m,b,7,'#D5EBF4');
  }
  function hat(ctx){
    const d='M -10 430 L 61 369 Q 70 397 90 448 Q 39 449 -10 430 Z';
    D.path(ctx,d,'#FFD360',C.ink,3.5);
    ctx.save();ctx.clip(new Path2D(d));
    D.path(ctx,'M 61 371 L 72 447 L 91 449 Z','#F4B94B');
    for(const [x,y,r,c]of [[24,416,9,'#51B9F2'],[61,409,8,'#F39578'],[46,440,9,'#6FBD93'],[5,430,7,'#F39B79']])D.ellipse(ctx,x,y,r,r,c);
    ctx.restore();
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;D.ellipse(ctx,61+Math.cos(a)*5,368+Math.sin(a)*5,4.5,4.5,'#FFDC73',C.ink,1.5);}
    D.ellipse(ctx,61,368,4,4,'#FFE59A');
  }
  function draw(ctx,s){
    D.ellipse(ctx,s.x,873,233,18,'rgba(54,77,54,.15)');
    bar(ctx,s.rootPin,s.elbow,59,C.blue);
    bar(ctx,s.elbow,s.pin,42,C.blue);
    const cA=[M.mix(s.rootPin[0],s.elbow[0],.16)+9,M.mix(s.rootPin[1],s.elbow[1],.16)+23];
    const cB=[M.mix(s.elbow[0],s.pin[0],.4)+10,M.mix(s.elbow[1],s.pin[1],.4)+20];
    cylinder(ctx,cA,cB);
    for(const [p,r]of [[s.rootPin,28],[s.elbow,26],[s.pin,19]]){
      D.ellipse(ctx,...p,r,r,C.shade,C.ink,4);D.ellipse(ctx,...p,r*.48,r*.48,C.light);D.ellipse(ctx,...p,r*.19,r*.19,C.shade);
    }
    ctx.save();ctx.translate(...s.pin);ctx.rotate(s.angle);
    const b=root.B20Dig.BUCKET;
    ctx.beginPath();ctx.moveTo(...b[0]);for(let i=1;i<b.length;i++)ctx.lineTo(...b[i]);ctx.closePath();
    ctx.fillStyle='#216AB0';ctx.fill();ctx.strokeStyle=C.ink;ctx.lineWidth=5;ctx.lineJoin='round';ctx.stroke();
    ctx.save();ctx.clip();
    D.path(ctx,'M -40 11 Q -64 82 -16 111 L 39 123 L -15 141 L -74 103 Z','#1A5796');
    if(s.bucketSoil>0){
      ctx.beginPath();ctx.rect(-70,125-78*s.bucketSoil,185,150);ctx.clip();
      D.path(ctx,'M -62 102 Q -24 40 24 64 Q 69 49 100 111 L 96 144 L -65 136 Z','#A27C52');
      for(let i=0;i<9;i++)D.ellipse(ctx,-23+i*10,91+Math.sin(i*7)*11,4,3,i%2?'#C8A476':'#846241');
    }
    ctx.restore();
    D.path(ctx,'M -34 24 Q -55 87 -16 107',null,'#4E97CF',4);
    D.line(ctx,[[56,125],[64,114]],C.ink,3);D.line(ctx,[[76,125],[84,114]],C.ink,3);
    D.ellipse(ctx,0,0,17,17,C.shade,C.ink,3);D.ellipse(ctx,0,0,6,6,C.light);
    ctx.restore();
    ctx.save();ctx.translate(s.x,0);
    D.round(ctx,-242,754,464,111,55,C.track,C.ink,6);
    D.round(ctx,-225,768,429,82,40,'#2467A7');
    const off=((s.trackTravel%29)+29)%29;
    ctx.save();ctx.beginPath();ctx.roundRect(-237,757,454,105,51);ctx.clip();
    for(let x=-270+off;x<250;x+=29){D.line(ctx,[[x,758],[x+5,769]],'#10375F',4);D.line(ctx,[[x,850],[x-5,863]],'#10375F',4);}
    ctx.restore();
    for(const [x,r]of [[-165,36],[-55,25],[49,25],[146,36]]){
      D.ellipse(ctx,x,809,r,r,'#65C2F2',C.ink,4);D.ellipse(ctx,x,809,r*.48,r*.48,'#258BD0');
      const a=s.trackTravel/r;
      D.ellipse(ctx,x+r*.66*Math.cos(a),809+r*.66*Math.sin(a),3,3,'#BFE6F6');
    }
    // Rounded blue face/cabin and a real side window recover the previous identity.
    D.path(ctx,'M -174 739 L -173 526 Q -174 453 -122 430 Q -52 405 42 427 Q 93 438 103 502 L 117 674 Q 176 669 186 697 Q 198 720 182 739 Q 57 758 -133 749 Q -161 748 -174 739 Z',C.blue,C.ink,5);
    D.path(ctx,'M 34 427 Q 88 438 98 500 L 111 678 Q 156 672 178 695 L 174 731 L 68 739 L 54 499 Q 52 453 34 427 Z',C.shade);
    D.path(ctx,'M -162 504 Q -151 452 -113 441 Q -61 424 -13 433',null,'#83D4FB',5);
    D.path(ctx,'M 60 477 Q 80 478 84 502 L 98 637 Q 77 649 59 643 L 53 500 Q 51 484 60 477 Z','#A0DCF7',C.ink,5);
    D.path(ctx,'M 64 491 L 72 625',null,'#D1EDFA',4);
    D.round(ctx,86,675,35,15,6,'#195A97',C.ink,2.5);
    D.path(ctx,'M -144 724 Q -58 735 45 724',null,'#61BFF1',4);
    hat(ctx);
    ctx.save();ctx.translate(-65,560);ctx.rotate(s.face.nod);ctx.translate(65,-560);
    D.round(ctx,-157,610,218,127,28,C.cream,C.ink,2.5);
    const gx=M.clamp((s.face.look[0]-(s.x-64))/450,-1,1),gy=M.clamp((s.face.look[1]-548)/350,-1,1);
    for(const ex of [-111,-23]){
      D.ellipse(ctx,ex,542,43,61,'#FFFFFC',C.ink,3.5);
      ctx.save();ctx.beginPath();ctx.ellipse(ex,542,41.5,59.5,0,0,Math.PI*2);ctx.clip();
      const px=ex+gx*15,py=542+gy*15;
      D.ellipse(ctx,px,py,18,27,'#15375F');D.ellipse(ctx,px-5,py-11,5,7,'#FFFFFC');D.ellipse(ctx,px+5,py+12,2.5,3,'#5F9AC7');
      ctx.restore();
      const by=459+s.face.focus*4;
      D.path(ctx,`M ${ex-21} ${by+5} Q ${ex} ${by-5} ${ex+19} ${by+1-s.face.focus*3}`,null,C.ink,11);
      D.path(ctx,`M ${ex-20} ${by+2} Q ${ex} ${by-6} ${ex+18} ${by-2-s.face.focus*3}`,null,'#9EDDFC',7);
    }
    D.round(ctx,-81,621,23,6,3,C.ink);
    if(s.face.happy>.2){
      D.path(ctx,'M -114 656 Q -72 679 -25 653 Q -34 699 -70 697 Q -100 694 -114 656 Z','#193654');
      D.path(ctx,'M -105 662 Q -69 680 -33 660 L -41 673 Q -72 686 -98 671 Z','#FFFEF4');
      D.path(ctx,'M -83 690 Q -63 674 -44 689 Q -58 700 -83 690 Z','#F58B8D');
    }else{
      D.path(ctx,'M -112 657 Q -72 688 -28 654',null,C.ink,5.5);
      D.path(ctx,'M -116 659 Q -114 650 -109 649',null,C.ink,3);
    }
    D.ellipse(ctx,-136,647,12,5,'#F0BAA0');D.ellipse(ctx,14,646,12,5,'#F0BAA0');
    ctx.restore();ctx.restore();
  }
  root.B20Wawa={draw};
})(globalThis);
