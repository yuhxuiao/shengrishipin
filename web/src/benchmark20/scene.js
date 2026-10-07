// Quiet garden. Ground, toy cover and shadows share world coordinates.
(function(root){
  'use strict';
  const D=root.B20Paint,M=root.B20Math;
  function background(ctx){
    ctx.fillStyle='#DCEBD9';ctx.fillRect(-2500,-1800,7000,4000);
    D.path(ctx,'M -2000 543 Q -600 463 30 535 Q 260 475 478 512 Q 719 420 1000 503 Q 1340 443 1700 525 Q 2100 461 4000 515 L 4000 950 L -2000 950 Z','#BDCFB4');
    D.path(ctx,'M -1200 633 Q -170 572 234 620 Q 572 563 883 629 Q 1290 562 1650 609 Q 2160 564 3300 660 L 3300 1600 L -1200 1600 Z','#ABC49B');
    // Partial porch establishes the garden without a repeated fence grid.
    D.path(ctx,'M -160 320 L 173 320 L 173 661 L -160 661 Z','#EEE4C9');
    D.path(ctx,'M -220 323 L 7 169 L 232 326 Z','#BE8C6E');
    D.path(ctx,'M -201 327 L 7 193 L 212 327',null,'#98745C',8);
    D.round(ctx,40,426,90,126,5,'#A9C4C3','#C5B99A',9);
    D.line(ctx,[[85,430],[85,550]],'#F2ECD8',6);D.line(ctx,[[44,488],[127,488]],'#F2ECD8',6);
    D.round(ctx,-100,646,310,24,5,'#C29F79');
    // A single tree and broad hedges frame the playing area.
    D.path(ctx,'M 1820 717 Q 1854 505 1827 304 L 1900 303 Q 1878 523 1928 714 Z','#A18B69');
    D.path(ctx,'M 1861 514 Q 1879 405 1867 343',null,'#C0A37B',7);
    D.path(ctx,'M 1653 278 Q 1591 225 1633 176 Q 1630 105 1722 118 Q 1766 37 1848 94 Q 1953 22 1980 117 Q 2081 112 2061 193 Q 2138 254 2058 293 Q 1992 345 1915 299 Q 1850 355 1778 313 Q 1673 346 1653 278 Z','#8FB393');
    D.path(ctx,'M 1675 197 Q 1728 147 1787 183 Q 1801 123 1887 146 Q 1930 105 1980 160',null,'#A9C8A6',16);
    D.path(ctx,'M -290 708 Q -251 608 -170 641 Q -114 571 -45 626 Q 50 587 94 666 Q 163 641 192 714 Z','#8DAD84');
    D.path(ctx,'M 1563 746 Q 1551 644 1632 640 Q 1663 573 1742 629 Q 1851 581 1895 675 Q 1985 637 2036 739 Z','#8FAA82');
    D.path(ctx,'M -2000 740 Q 395 687 878 752 Q 1400 700 4000 752 L 4000 2500 L -2000 2500 Z','#C5D79F');
    D.path(ctx,'M -1200 830 Q 404 755 929 854 Q 1368 913 2630 758 L 3000 928 Q 1439 1071 872 957 Q 100 818 -1200 1007 Z','#DFDEAF');
    D.path(ctx,'M -800 1040 Q 345 946 1050 1064 Q 1717 974 2700 1061 L 2700 2000 L -800 2000 Z','#BBD198');
    const tufts=[[278,783],[372,932],[1220,963],[1655,912],[193,987],[1110,782],[1780,796]];
    for(const [x,y]of tufts){D.path(ctx,`M ${x-13} ${y} Q ${x-15} ${y-13} ${x-23} ${y-16} M ${x} ${y} Q ${x+1} ${y-20} ${x+10} ${y-23}`,null,'#96B382',3);}
    for(const [x,y]of [[253,717],[294,707],[1770,711]]){D.line(ctx,[[x,y],[x+3,y-25]],'#8CA17B',3);D.ellipse(ctx,x+3,y-30,8,7,'#EFEBD4');D.ellipse(ctx,x+3,y-30,3,3,'#DAB46D');}
  }
  function duck(ctx,s){
    const p=s.duck;ctx.save();ctx.translate(p.x,p.y);
    D.ellipse(ctx,0,-2,51,9,'rgba(77,58,35,.19)');
    D.path(ctx,'M -39 -19 Q -65 -37 -51 -60 Q -40 -47 -23 -48 Q -35 -77 -14 -92 Q 3 -106 26 -91 Q 45 -77 27 -54 Q 55 -40 40 -19 Q 5 5 -39 -19 Z','#F1C75E','#987846',3.5);
    D.path(ctx,'M 27 -80 Q 53 -83 57 -72 Q 52 -62 27 -65 Z','#D99C51','#987846',3);
    D.ellipse(ctx,11,-80,5,6,'#493F38');D.ellipse(ctx,10,-82,1.5,2,'#FFF8DC');
    D.path(ctx,'M -30 -39 Q -8 -55 15 -38 Q 8 -18 -17 -23',null,'#D7AB4D',3);
    D.path(ctx,'M -16 -92 Q 1 -100 16 -90',null,'#FFE6A4',4);
    ctx.restore();
  }
  function groundProps(ctx,s,t){
    const p=s.pit;
    D.ellipse(ctx,p.x,p.y+3,p.rx+19,41,'#BEAA7D');
    D.ellipse(ctx,p.x,p.y+8,p.rx-4,31,'#8E7652');
    D.ellipse(ctx,p.x,p.y+13,p.rx-13,23,'#A18B5B');
    // Clip both sides of the soil boundary: the mound's curved edge alone
    // would let the top of the buried duck peek out before excavation.
    const coverY=M.mix(786,921,s.exposed);
    ctx.save();
    ctx.beginPath();ctx.rect(p.x-p.rx-30,700,p.rx*2+60,coverY-700);ctx.clip();
    duck(ctx,s);
    ctx.restore();
    ctx.save();
    ctx.beginPath();ctx.rect(p.x-p.rx-30,coverY,p.rx*2+60,170);ctx.clip();
    D.path(ctx,`M ${p.x-156} ${p.y+10} Q ${p.x-142} ${p.y-26} ${p.x-97} ${p.y-44} Q ${p.x-32} ${p.y-70} ${p.x+34} ${p.y-41} Q ${p.x+112} ${p.y-42} ${p.x+156} ${p.y+9} Q ${p.x+42} ${p.y+42} ${p.x-156} ${p.y+10} Z`,'#BFA276');
    D.path(ctx,`M ${p.x-124} ${p.y-6} Q ${p.x-60} ${p.y-51} ${p.x+48} ${p.y-22}`,null,'#D6BC91',8);
    const stones=[[-86,-4],[-34,-28],[38,-6],[96,3],[6,8]];
    for(const [x,y]of stones)D.ellipse(ctx,p.x+x,p.y+y,4,2,'#9E845C');
    ctx.restore();
    // Soil lips keep the hole in the surface instead of a sticker ellipse.
    D.path(ctx,`M ${p.x-139} ${p.y+9} Q ${p.x-15} ${p.y+50} ${p.x+143} ${p.y+6}`,null,'#D6BE8E',7);
    if(t<10.2){
      const a=1-M.phase(t,9.5,10.2);ctx.globalAlpha=a;
      D.line(ctx,[[825,845],[855,855]],'#F2DEB6',6);D.line(ctx,[[829,858],[854,841]],'#F2DEB6',6);ctx.globalAlpha=1;
    }
  }
  root.B20Scene={background,groundProps};
})(globalThis);
