// Small drawing vocabulary shared by the sample's hand-authored shapes.
(function(root){
  'use strict';
  function path(ctx,d,fill,stroke=null,width=4){
    const p=new Path2D(d);
    if(fill){ctx.fillStyle=fill;ctx.fill(p);}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(p);}
  }
  function ellipse(ctx,x,y,rx,ry,fill,stroke=null,width=4){
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  }
  function line(ctx,points,color,width=4){
    ctx.beginPath();ctx.moveTo(...points[0]);
    for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  }
  function round(ctx,x,y,w,h,r,fill,stroke=null,width=4){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  }
  root.B20Paint={path,ellipse,line,round};
})(globalThis);
