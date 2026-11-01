import { appearance, volume, SUBSTANCES, createMixture } from './chemistry.js';

const W = 1200, H = 620, FLOOR = 490;
const TAU = Math.PI * 2;
const LABEL_FONT = 'Arial, sans-serif';
export const BOARD_RECT = Object.freeze({x:370,y:133,w:378,h:164});
const PALETTE = {
  ink: '#102020', wall: '#233b39', teal: '#466964', wood: '#68422d',
  amber: '#e8bb71', paper: '#ddd0a4', mint: '#8ebfae', glass: '#9dd5cb'
};

function rect(c, x, y, w, h, color, alpha = 1) {
  c.globalAlpha = alpha; c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  c.globalAlpha = 1;
}

function poly(c, points, fill, stroke, lineWidth = 2) {
  c.beginPath();
  points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth; c.stroke(); }
}

function line(c, points, color, width = 2) {
  c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}

function text(c, value, x, y, size = 12, color = PALETTE.paper, align = 'left') {
  c.font = `${size}px "Courier New", monospace`; c.fillStyle = color;
  c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(value, x, y);
}

function random(seed = 231) {
  let n = seed;
  return () => { n = Math.imul(1664525, n) + 1013904223 | 0; return (n >>> 0) / 4294967296; };
}

function shade(hex, delta = 0) {
  if (!/^#[a-f\d]{6}$/i.test(hex || '')) return hex || '#78bdb4';
  return '#' + [1,3,5].map(i => Math.max(0, Math.min(255, parseInt(hex.slice(i,i+2),16) + delta)).toString(16).padStart(2,'0')).join('');
}

function ellipse(c,x,y,rx,ry,color,alpha=1) {
  c.globalAlpha=alpha; c.fillStyle=color; c.beginPath();
  c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,TAU); c.fill(); c.globalAlpha=1;
}

function miniBottle(c,x,bottom,w,h,color,label='',stopper='#947554') {
  const y=bottom-h, neck=Math.max(6,Math.round(w*.42));
  rect(c,x+w*.3,y,neck,8,stopper); rect(c,x+w*.3,y+8,neck,8,'#527a71');
  poly(c,[[x+w*.3,y+14],[x+w*.7,y+14],[x+w,y+20],[x+w,bottom-2],[x+w-3,bottom],[x+3,bottom],[x,bottom-2],[x,y+20]],'#345752','#71988a',1);
  rect(c,x+2,y+h*.5,w-4,h*.5-3,color,.8);
  rect(c,x+3,y+21,2,h-25,'#b0c8ac',.5);
  if(label) {rect(c,x+3,bottom-h*.37,w-6,11,'#c5bc92');text(c,label,x+w/2,bottom-h*.37+8,7,'#3c493d','center');}
}

function shelves(c) {
  // Deep, recessed specimen cabinet.
  rect(c,838,65,307,280,'#152c2a'); rect(c,837,64,309,6,'#64543b');
  rect(c,838,70,6,270,'#526052'); rect(c,1138,70,7,270,'#4a4d3c');
  rect(c,845,72,292,262,'#1a302e');
  for (const [sy, index] of [[166,0],[259,1],[336,2]]) {
    const rng=random(81+index*85); let x=862;
    while(x<1120) {
      const w=15+Math.floor(rng()*15), h=31+Math.floor(rng()*26);
      const colors=['#879a66','#b38b45','#638c82','#9f7046','#668f95','#7c6b71'];
      miniBottle(c,x,sy-3,w,h,colors[Math.floor(rng()*colors.length)],['Cu','Fe','Na','K','Zn','S'][Math.floor(rng()*6)]);
      x+=w+12+Math.floor(rng()*8);
    }
    rect(c,843,sy,295,7,'#6c563d');rect(c,843,sy+7,295,3,'#121f1c');
    rect(c,844,sy,293,2,'#9b8054',.6);
    rect(c,854,sy+10,7,10,'#303a2d');rect(c,1121,sy+10,7,10,'#303a2d');
  }
  // Inventory labels on the cabinet, distant and noninteractive.
  rect(c,950,67,79,15,'#9c9370');text(c,'REAGENTS',990,78,10,'#2e3c32','center');
}

function windowScene(c) {
  rect(c,53,64,260,288,'#102824');rect(c,59,70,248,276,'#7a7251');
  rect(c,66,77,234,262,'#111e27');
  const sky=c.createLinearGradient(0,78,0,337);sky.addColorStop(0,'#182b36');sky.addColorStop(1,'#44645c');
  rect(c,71,82,224,252,sky);
  // A cold moon and a distant town.
  rect(c,241,107,16,4,'#abc6af',.7);rect(c,237,111,24,16,'#abc6af',.7);rect(c,241,127,16,4,'#abc6af',.7);
  rect(c,247,108,14,20,'#263e44');
  poly(c,[[71,268],[93,256],[112,265],[137,242],[154,256],[173,246],[191,265],[218,252],[240,266],[269,246],[295,259],[295,335],[71,335]],'#233e3e');
  const rng=random(724);for(let x=73;x<290;x+=24) {
    const y=274+Math.floor(rng()*24);rect(c,x,y,20,60,'#203837');
    for(let yy=y+9;yy<327;yy+=15)for(let xx=x+4;xx<x+19;xx+=8)if(rng()>.45)rect(c,xx,yy,3,5,'#bfaa70',.45);
  }
  // Static tiny water trails, animated rain is composited separately.
  for(let i=0;i<55;i++) {const x=73+rng()*220,y=84+rng()*245;rect(c,x,y,1,4+rng()*7,'#a2c1b6',.14);}
  rect(c,174,77,12,261,'#817858');rect(c,178,78,3,260,'#b2a078',.65);
  rect(c,66,203,234,11,'#807555');rect(c,68,204,229,2,'#aa9c73');
  rect(c,67,77,5,262,'#c4ad7c',.5);rect(c,66,77,235,5,'#baa375',.35);
  rect(c,45,344,278,8,'#8d7955');rect(c,42,352,284,9,'#4b4e39');
  rect(c,45,361,280,5,'#182e2a');
  // Short linen curtain and old curtain rod.
  rect(c,38,54,290,4,'#8e7551');
  poly(c,[[48,59],[85,59],[85,111],[78,165],[64,206],[45,208]],'#3e5040');
  for(let x=50;x<82;x+=9)line(c,[[x,61],[x-3,137],[x-8,204]],'#697358',2);
}

function blackboard(c) {
  rect(c,364,128,407,194,'#122321',.75);
  rect(c,354,117,410,196,'#786247');rect(c,359,122,400,186,'#ad8a59',.55);
  rect(c,365,128,388,173,'#243e34');rect(c,369,131,380,167,'#213a31');
  const rng=random(246);for(let i=0;i<160;i++)rect(c,370+rng()*374,134+rng()*159,1+rng()*24,1,'#9cb38c',.025);
  // The blank slate belongs to the player; chalk strokes are composited each frame.
  rect(c,356,309,410,8,'#4c4430');rect(c,402,306,23,4,'#bec5a1');rect(c,429,307,11,3,'#839e8c');
  rect(c,682,303,39,8,'#665b41');rect(c,686,301,31,4,'#9a8b65');
}

function copperPlumbing(c) {
  // Pipes are fixed into the wall, clearly scenery.
  line(c,[[1168,0],[1168,379],[1148,396],[1148,442]],'#0d2321',13);
  line(c,[[1166,0],[1166,379],[1146,396],[1146,442]],'#765239',9);
  line(c,[[1163,0],[1163,378],[1143,395],[1143,441]],'#bd8c59',2);
  [47,132,239,353].forEach(y=>{rect(c,1157,y,18,9,'#323f34');rect(c,1159,y+2,14,3,'#ad8c5c');});
  ellipse(c,1166,307,16,16,'#121e1b');ellipse(c,1166,307,12,12,'#a38052');ellipse(c,1166,307,8,8,'#394e41');
  line(c,[[1153,307],[1179,307]],'#a38052',4);line(c,[[1166,295],[1166,319]],'#a38052',4);
  // Old wall pressure gauge.
  line(c,[[790,359],[790,211],[812,211]],'#172c26',12);
  line(c,[[790,359],[790,211],[812,211]],'#947044',6);
  line(c,[[788,357],[788,213],[812,213]],'#c29861',1);
  ellipse(c,802,109,29,29,'#132522');ellipse(c,802,107,26,26,'#9b8054');ellipse(c,802,107,21,21,'#c4bf97');
  for(let i=0;i<9;i++){const a=-2.4+i*.6;line(c,[[802+Math.cos(a)*16,107+Math.sin(a)*16],[802+Math.cos(a)*19,107+Math.sin(a)*19]],'#4d5a46',1);}
  line(c,[[802,107],[813,95]],'#7b5238',2);ellipse(c,802,107,3,3,'#4d5a46');
  line(c,[[801,133],[801,190],[789,190],[789,211]],'#967447',5);
  text(c,'atm',802,121,7,'#53604a','center');
}

function workbench(c) {
  // The surface is a shallow perspective plane; front lip is also the floor collider.
  rect(c,0,443,W,7,'#162a24');
  poly(c,[[0,450],[1200,450],[1200,499],[0,499]],'#79543a');
  const wood=c.createLinearGradient(0,449,0,500);wood.addColorStop(0,'#856343');wood.addColorStop(.55,'#aa7950');wood.addColorStop(1,'#725039');
  rect(c,0,451,W,45,wood);
  line(c,[[0,454],[1200,454]],'#c59a65',2);
  line(c,[[0,473],[1200,473]],'#583d2a',1);
  line(c,[[0,488],[1200,488]],'#4d3529',1);
  const rng=random(1034);
  for(let i=0;i<85;i++){
    const x=rng()*W,y=454+rng()*40,len=14+rng()*100;
    line(c,[[x,y],[x+len,y-1]],rng()>.5?'#dfac70':'#503c2b',1);
  }
  // Worn working mat defines the active area without looking like UI.
  poly(c,[[266,455],[928,455],[953,488],[244,488]],'#384d43');
  poly(c,[[270,457],[924,457],[944,486],[253,486]],'#4c5f4a');
  line(c,[[270,458],[923,458]],'#819174',1);
  for(let i=0;i<40;i++){const x=267+rng()*660,y=461+rng()*23;rect(c,x,y,2+rng()*12,1,'#a1a585',.11);}
  // Front lip: real chunky pixel joinery.
  rect(c,0,493,W,10,'#bc8957');rect(c,0,497,W,3,'#d6a571');
  rect(c,0,503,W,14,'#543b2a');rect(c,0,513,W,5,'#2b2b23');
  rect(c,0,518,W,102,'#4c392b');
  for(let x=11;x<W;x+=396) {
    rect(c,x,527,380,82,'#302e24');rect(c,x+5,532,370,71,'#6d4c32');
    rect(c,x+8,535,364,3,'#96724c');rect(c,x+8,539,364,58,'#5f442f');
    rect(c,x+16,547,348,2,'#513d2c');rect(c,x+16,591,348,2,'#856342');
    rect(c,x+166,551,52,17,'#302d23');rect(c,x+171,554,42,7,'#a18656');
    rect(c,x+173,557,38,6,'#75603d');rect(c,x+168,554,4,9,'#c5a66f');rect(c,x+212,554,4,9,'#c5a66f');
  }
  // Hammered small brass maker's plate on middle drawer.
  rect(c,554,580,92,18,'#8d764c');rect(c,558,584,84,10,'#a49060');
  text(c,'ALCHEMIA · 01',600,592,9,'#403c2c','center');
  rect(c,8,616,1184,4,'#242820');
}

function background(c) {
  rect(c,0,0,W,H,'#233c38');
  const wall=c.createLinearGradient(0,0,0,450);wall.addColorStop(0,'#172f2d');wall.addColorStop(.5,'#344d41');wall.addColorStop(1,'#314a3d');rect(c,0,0,W,450,wall);
  // Ceiling cornice.
  rect(c,0,0,W,13,'#0e2422');rect(c,0,13,W,6,'#4b5944');rect(c,0,20,W,3,'#111f1b');
  rect(c,0,24,W,8,'#233b31');rect(c,0,31,W,2,'#56634a');
  // Old glazed brickwork.
  for(let row=0;row<4;row++)for(let col=-1;col<12;col++){
    const x=col*112+(row%2)*56,y=326+row*31;
    rect(c,x,y,109,28,row%2?'#385446':'#355143');
    rect(c,x+2,y+2,105,1,'#66806a',.25);rect(c,x+3,y+25,102,2,'#1c382d',.35);
  }
  rect(c,0,321,W,4,'#1c342a');rect(c,0,325,W,2,'#728167',.35);
  const rng=random(45);for(let i=0;i<2200;i++)rect(c,rng()*W,35+rng()*408,1+rng()*3,1+rng()*2,rng()>.5?'#a5a27b':'#112b25',.055);
  windowScene(c);blackboard(c);shelves(c);copperPlumbing(c);
  // Wall-mounted switch and softly illuminated status light.
  rect(c,25,382,30,42,'#1e3329');rect(c,28,385,24,35,'#929275');rect(c,36,393,9,16,'#35483a');rect(c,36,394,9,6,'#b9b08a');
  rect(c,1070,375,52,37,'#1a3028');rect(c,1073,378,46,31,'#4a6150');
  ellipse(c,1084,389,4,4,'#8fac6a');text(c,'220V',1097,402,8,'#adba94','center');
  // Drying cloth hanging below the window, fixed hook.
  rect(c,137,378,5,6,'#a08d5a');poly(c,[[126,386],[153,386],[160,438],[121,438]],'#626e53');
  for(let x=128;x<155;x+=7)line(c,[[x,388],[x+2,434]],'#95a07a',2);
  workbench(c);
  // Lamp body is painted last; light itself is a dynamic overlay.
  rect(c,597,0,5,66,'#121e1a');rect(c,593,61,13,12,'#bd9b5d');
  poly(c,[[576,70],[623,70],[653,96],[653,104],[548,104],[548,96]],'#334c3a','#112923',3);
  poly(c,[[579,72],[620,72],[647,96],[554,96]],'#6a7750');
  line(c,[[582,73],[619,73],[640,92]],'#a6a078',2);
  rect(c,548,100,105,6,'#1a2c24');rect(c,553,105,95,4,'#b6a568');rect(c,562,109,77,3,'#e5cb8a');
  // Vignette, restricted to the walls so interactive glass remains readable.
  const vignette=c.createRadialGradient(600,310,180,600,310,680);vignette.addColorStop(0,'#07171400');vignette.addColorStop(1,'#05181588');rect(c,0,0,W,H,vignette);
}

function vesselPath(body, inset=0) {
  const w=(body.w||54)-inset*2, h=(body.h||100)-inset*2;
  switch(body.kind) {
    case 'beaker': return [[-w*.5,-h*.5],[-w*.5,h*.43],[-w*.43,h*.5],[w*.43,h*.5],[w*.5,h*.43],[w*.5,-h*.43],[w*.58,-h*.5],[w*.34,-h*.5]];
    case 'flask': return [[-w*.14,-h*.5],[w*.14,-h*.5],[w*.14,-h*.23],[w*.46,h*.31],[w*.5,h*.41],[w*.42,h*.5],[-w*.42,h*.5],[-w*.5,h*.41],[-w*.46,h*.31],[-w*.14,-h*.23]];
    case 'tube': return [[-w*.46,-h*.5],[w*.46,-h*.5],[w*.46,h*.36],[w*.32,h*.47],[w*.12,h*.5],[-w*.12,h*.5],[-w*.32,h*.47],[-w*.46,h*.36]];
    case 'graduated_cylinder': return [[-w*.36,-h*.5],[w*.36,-h*.5],[w*.36,h*.41],[w*.3,h*.45],[-w*.3,h*.45],[-w*.36,h*.41]];
    case 'dropper': return [[-w*.14,-h*.5],[w*.14,-h*.5],[w*.24,h*.1],[w*.4,h*.18],[w*.4,h*.39],[w*.23,h*.45],[-w*.23,h*.45],[-w*.4,h*.39],[-w*.4,h*.18],[-w*.24,h*.1]];
    case 'evaporating_dish': return [[-w*.49,-h*.48],[w*.42,-h*.48],[w*.5,-h*.31],[w*.39,h*.21],[w*.2,h*.48],[-w*.2,h*.48],[-w*.39,h*.21]];
    case 'crucible': return [[-w*.45,-h*.5],[w*.45,-h*.5],[w*.33,h*.37],[w*.23,h*.5],[-w*.23,h*.5],[-w*.33,h*.37]];
    default: return [[-w*.18,-h*.5],[w*.18,-h*.5],[w*.18,-h*.31],[w*.43,-h*.2],[w*.48,-h*.1],[w*.48,h*.44],[w*.38,h*.5],[-w*.38,h*.5],[-w*.48,h*.44],[-w*.48,-h*.1],[-w*.43,-h*.2],[-w*.18,-h*.31]];
  }
}

function mouthWidth(b) {return b.mouthWidth??({bottle:18,beaker:58,flask:20,tube:19,graduated_cylinder:26,dropper:7,evaporating_dish:88,crucible:40})[b.kind]??18;}

function fluidInfo(body) {
  const mix=body.mixture;
  const amount=mix?volume(mix):body.volume||0;
  const phase=mix?appearance(mix):{liquidColor:'#e6f2f2',liquidOpacity:.1,solidColor:'#c4c9bd',solidFraction:0,hasLiquid:amount>0};
  return {amount,...phase,fill:Math.max(0,Math.min(.94,amount/(body.capacity||150)*.91))};
}

function drawContents(c,b,time,inset=2) {
  const fluid=fluidInfo(b);if(fluid.fill<=.00001)return;
  const w=b.w||54,h=b.h||100,a=b.angle||0;
  const path=vesselPath(b,inset),vertical=path.map(([x,y])=>x*Math.sin(a)+y*Math.cos(a));
  c.save();poly(c,path);c.clip();c.rotate(-a);
  const extent=Math.max(...vertical),upper=Math.min(...vertical);
  const depth=Math.max(1,fluid.fill*(extent-upper)),surface=extent-depth;
  const span=w+h;
  if(fluid.hasLiquid) {
    // A transparent, colourless solution reveals the wall through the glass.
    // Only dissolved ions/indicators contribute to the coloured liquid phase.
    rect(c,-span,surface,span*2,depth+2,fluid.liquidColor,fluid.liquidOpacity);
    rect(c,-span,surface,span*2,1.5,'#e5efea',.52);
    rect(c,-span,surface+2,span*2,1,'#afc7bf',.17);
    const activity=b.mixture?.activity||{};
    if((activity.boil||0)>.05||(activity.gas||0)>.05)for(let i=0;i<6;i++) {
      const bx=Math.sin(i*9.3)*w*.31,by=extent-((time*22+i*17)%depth),r=1+(i%2);
      c.globalAlpha=.47;c.strokeStyle='#e4eeeb';c.lineWidth=1;c.beginPath();c.arc(bx,by,r,0,TAU);c.stroke();c.globalAlpha=1;
    }
    rect(c,-w*.32,surface+6,1,Math.max(0,depth-14),'#e4f0e9',.17);
  }
  if(fluid.solidFraction>0) {
    const rng=random((b.id||58)*19),dry=!fluid.hasLiquid;
    const sedimentDepth=Math.min(depth,Math.max(2.5,depth*fluid.solidFraction));
    const bottom=extent-sedimentDepth;
    rect(c,-span,bottom,span*2,sedimentDepth+2,fluid.solidColor,.94);
    for(let i=0;i<Math.min(85,24+sedimentDepth*2);i++) {
      const xx=(rng()-.5)*span,yy=bottom+rng()*sedimentDepth;
      rect(c,xx,yy,1+rng()*3,1+rng()*2,shade(fluid.solidColor,Math.round(rng()*42)-21),.88);
    }
    // Newly forming particles are briefly suspended, then the existing activity
    // decay leaves the solid on the bottom rather than tinting the whole liquid.
    const suspension=Math.min(1,b.mixture?.activity?.precipitate||0);
    if(!dry&&suspension>.02)for(let i=0;i<18;i++) {
      const xx=(rng()-.5)*w*.82,yy=surface+4+rng()*Math.max(0,depth-sedimentDepth-5);
      rect(c,xx,yy,2,2,fluid.solidColor,suspension*.45);
    }
    if(dry)for(let i=0;i<15;i++)rect(c,(rng()-.5)*w,surface-1-rng()*2,2+rng()*3,2,shade(fluid.solidColor,18),.8);
  }
  c.restore();
}

function drawGlass(c,b,time=0,selected=false,thumb=false) {
  const w=b.w||54,h=b.h||100,a=b.angle||0;
  c.save();c.translate(b.x||0,b.y||0);c.rotate(a);
  // A slim outside outline and translucent thickness.
  if(selected) {c.save();c.shadowBlur=10;c.shadowColor='#e2c17f';poly(c,vesselPath(b,-3),null,'#e8c47d',1.5);c.restore();}
  poly(c,vesselPath(b),'#dceae80c','#8ea9a0',2);
  // Contents retain a world-horizontal free surface, even when the body rotates.
  drawContents(c,b,time);
  // Glass edges, stepped highlights, and calibrated graduations.
  poly(c,vesselPath(b),null,'#a6c6ae',1.5);
  if(b.kind==='bottle') {
    line(c,[[-w*.34,-h*.13],[-w*.34,h*.34]],'#b8dfc9',2);
    rect(c,-w*.32,-h*.12,4,12,'#d0f0d6',.4);
    // Important labels are painted later at the display's native resolution.
  } else {
    line(c,[[-w*.35,-h*.35],[-w*.35,h*.3]],'#d6ebd2',2);
    line(c,[[w*.34,h*.04],[w*.34,h*.32]],'#779e94',1);
    if(['beaker','tube','graduated_cylinder'].includes(b.kind))for(let i=0;i<(b.kind==='graduated_cylinder'?10:5);i++){
      const yy=-h*.34+i*h*(b.kind==='graduated_cylinder'?.065:.12);line(c,[[w*.17,yy],[w*.34,yy]],'#c3d2b3',1);
    }
    if(b.kind==='flask'){line(c,[[-w*.24,h*.03],[-w*.36,h*.31]],'#ddedcd',2);text(c,String(b.capacity??200),0,h*.29,9,'#bbd2b4','center');}
    if(b.kind==='beaker')text(c,String(b.capacity??250),-w*.03,h*.2,10,'#d1dec0','center');
    if(b.kind==='graduated_cylinder') {
      rect(c,-w*.49,h*.44,w*.98,6,'#819f91');rect(c,-w*.49,h*.44,w*.98,2,'#c4d6b8');
      text(c,String(b.capacity??100),-1,-h*.37,8,'#d1dec0','center');
    }
  }
  const mw=mouthWidth(b);
  rect(c,-mw*.5-2,-h*.5-2,mw+4,4,'#afcfba');rect(c,-mw*.5,-h*.5,mw,2,'#496e62');
  if(b.sealed) {
    rect(c,-mw*.5-3,-h*.5-9,mw+6,9,'#ad8b5c');rect(c,-mw*.5-3,-h*.5-9,mw+6,2,'#d3b77e');
    rect(c,-mw*.5-3,-h*.5-2,mw+6,2,'#6c563b');
  }
  if(b.kind==='dropper') {
    // Glass tip is at the universal vessel mouth; the rubber bulb is opposite it.
    poly(c,[[-w*.43,h*.19],[-w*.43,h*.38],[-w*.26,h*.49],[w*.26,h*.49],[w*.43,h*.38],[w*.43,h*.19]],'#304d42','#7c9a7e',1);
    rect(c,-w*.3,h*.21,3,h*.15,'#83a087',.5);
    rect(c,-w*.47,h*.17,w*.94,5,'#ad9b6b');
  }
  line(c,[[-w*.23,h*.45],[w*.23,h*.45]],'#c4dcc4',2);
  c.restore();
}

function flame(c,x,y,time,scale=1,quiet=false) {
  c.save();c.translate(x,y);c.scale(scale,scale);
  const phase=Math.sin(time*17)*3;
  const glow=c.createRadialGradient(0,-15,0,0,-15,48);glow.addColorStop(0,'#efad674c');glow.addColorStop(.4,'#ebb86d15');glow.addColorStop(1,'#ebb86d00');rect(c,-48,-63,96,96,glow);
  poly(c,[[-10,1],[-13,-9],[-8,-20],[-9,-27],[-3,-35],[1+phase,-47],[6,-29],[11,-20],[10,-6],[6,1]],'#5089bc');
  poly(c,[[-6,0],[-8,-10],[-3,-20],[-2,-29],[2+phase*.4,-34],[5,-20],[8,-10],[5,0]],'#86c0d0');
  poly(c,[[-3,0],[-4,-11],[0,-23],[4,-10],[3,0]],'#d2ead9');
  rect(c,-9,0,18,3,'#73a3b8');c.restore();
}

function drawBurner(c,b,time,selected=false) {
  const w=b.w||56,h=b.h||64;
  c.save();c.translate(b.x||0,b.y||0);c.rotate(b.angle||0);
  if(selected) {c.strokeStyle='#e7bf78';c.lineWidth=1;c.strokeRect(-w/2-4,-h/2-5,w+8,h+9);}
  if(b.lit)flame(c,0,-h*.5,time,1);
  poly(c,[[-w*.49,h*.48],[-w*.39,h*.3],[w*.39,h*.3],[w*.49,h*.48]],'#293b36','#9b9c76',2);
  rect(c,-w*.39,h*.3,w*.78,5,'#898d68');rect(c,-w*.16,-h*.43,w*.32,h*.75,'#ad8954');
  rect(c,-w*.16,-h*.42,4,h*.7,'#d7b274');rect(c,w*.08,-h*.39,4,h*.68,'#5d613f');
  rect(c,-w*.19,-h*.5,w*.38,7,'#525f4a');rect(c,-w*.19,-h*.5,w*.38,2,'#bbc09a');
  rect(c,-w*.23,-h*.02,w*.46,10,'#515e49');rect(c,-w*.18,0,3,6,'#171f1c');rect(c,w*.12,0,3,6,'#171f1c');
  line(c,[[w*.12,h*.22],[w*.48,h*.22],[w*.48,h*.4],[w*.6,h*.4]],'#3c4542',6);
  ellipse(c,-w*.21,h*.2,6,6,'#435249');rect(c,-w*.3,h*.19,10,3,'#9da788');
  c.restore();
}

function drawStand(c,b,selected=false) {
  const w=b.w||110,h=b.h||130;
  c.save();c.translate(b.x||0,b.y||0);c.rotate(b.angle||0);
  if(selected) {c.strokeStyle='#e7bf78';c.lineWidth=1;c.setLineDash([4,5]);c.strokeRect(-w/2-3,-h/2-3,w+6,h+6);c.setLineDash([]);}
  rect(c,-w*.45,h*.44,w*.9,h*.07,'#31423b');rect(c,-w*.45,h*.44,w*.9,3,'#9c9b78');
  rect(c,-w*.4,-h*.5,7,h*.96,'#889682');rect(c,-w*.4,-h*.5,2,h*.93,'#ccd1a8');
  rect(c,-w*.39,-31,20,10,'#576956');rect(c,-w*.42,-29,9,6,'#b3b88f');
  rect(c,-w*.45,-31,w*.9,6,'#8f9980');rect(c,-w*.45,-31,w*.9,2,'#cbd1a9');
  for(let i=0;i<9;i++)rect(c,-w*.4+i*10,-30,2,6,'#4b6251');
  line(c,[[-w*.31,-26],[-w*.05,-11],[w*.22,-26]],'#7f8e71',2);
  c.restore();
}

function drawThermometer(c,b,selected=false) {
  const w=b.w||14,h=b.h||120;
  c.save();c.translate(b.x||0,b.y||0);c.rotate(b.angle||0);
  if(selected){c.strokeStyle='#e7bf78';c.lineWidth=1;c.strokeRect(-w*.5-3,-h*.5-3,w+6,h+6);}
  rect(c,-w*.5,-h*.5,w,h-5,'#96b2a2');rect(c,-w*.32,-h*.47,w*.64,h*.88,'#e0d9ad');
  const reading=Number.isFinite(b.reading)?b.reading:22;
  const height=Math.max(8,Math.min(h*.76,(reading+10)/160*h*.76));
  rect(c,-1,h*.44-height,2,height,'#b76350');ellipse(c,0,h*.5-6,5,5,'#bb6b53');
  rect(c,-w*.35,-h*.45,1,h*.78,'#edf2d4',.7);
  for(let i=0;i<12;i++)rect(c,2,-h*.4+i*h*.065,i%3===0?4:2,1,'#586b57');
  rect(c,-w*.23,-h*.5+3,w*.46,5,'#60796a');c.restore();
}

function drawCeramic(c,b,time,selected=false) {
  const w=b.w||56,h=b.h||58,a=b.angle||0,dish=b.kind==='evaporating_dish';
  const pts=vesselPath(b);
  c.save();c.translate(b.x||0,b.y||0);c.rotate(a);
  if(selected)poly(c,vesselPath(b,-3),null,'#e8c47d',1.5);
  poly(c,pts,'#d3caad','#766f54',2);
  // The white interior and the transparent liquid are independent of each other.
  poly(c,vesselPath(b,4),'#d8d7c7');
  drawContents(c,b,time,4);
  // Porcelain body and thick glazed rim, with a blue maker's mark.
  poly(c,[[-w*.37,h*.04],[-w*.22,h*.43],[w*.22,h*.43],[w*.37,h*.04]],'#c6b99a');
  line(c,[[-w*.48,-h*.47],[w*.4,-h*.47]],'#eee2be',4);
  line(c,[[-w*.4,-h*.31],[-w*.26,h*.26]],'#eee4c5',2);
  if(dish)line(c,[[w*.4,-h*.47],[w*.5,-h*.31],[w*.4,-h*.19]],'#e9debb',3);
  rect(c,-w*.2,h*.42,w*.4,3,'#8e8266');
  if(!b.formula)line(c,[[-5,h*.15],[0,h*.24],[5,h*.15]],'#63827a',1);
  c.restore();
}

function drawHotplate(c,b,time,selected=false) {
  const w=b.w||110,h=b.h||40;
  c.save();c.translate(b.x||0,b.y||0);c.rotate(b.angle||0);
  if(selected){c.strokeStyle='#e7bf78';c.lineWidth=1;c.strokeRect(-w*.5-4,-h*.5-4,w+8,h+8);}
  rect(c,-w*.42,h*.36,12,h*.16,'#1d3029');rect(c,w*.31,h*.36,12,h*.16,'#1d3029');
  poly(c,[[-w*.5,-h*.34],[-w*.46,h*.36],[w*.46,h*.36],[w*.5,-h*.34]],'#738477','#b9baa0',1.5);
  rect(c,-w*.44,-h*.04,w*.88,h*.31,'#566c60');rect(c,-w*.44,-h*.04,w*.88,2,'#98aa90');
  rect(c,-w*.5,-h*.5,w,h*.18,'#c5c0a1');rect(c,-w*.48,-h*.5,w*.96,2,'#e0d5b3');
  rect(c,-w*.39,-h*.48,w*.78,5,'#37473e');
  const coil=b.lit?'#d98e58':'#7c8c75';
  for(let i=0;i<5;i++)rect(c,-w*.32+i*w*.14,-h*.47,w*.09,3,coil);
  if(b.lit) {
    const glow=c.createRadialGradient(0,-h*.5,1,0,-h*.5,60);glow.addColorStop(0,'#edb76c33');glow.addColorStop(1,'#edb76c00');rect(c,-60,-h*.5-60,120,120,glow);
  }
  ellipse(c,w*.28,h*.12,7,7,'#233b32');ellipse(c,w*.28,h*.12,5,5,'#9c9e7d');line(c,[[w*.28,h*.12],[w*.28+(b.lit?3:-3),h*.12-3]],'#34483a',2);
  rect(c,-w*.3,h*.08,5,5,b.lit?'#e6ae66':'#384c3f');
  text(c,'HEAT',-w*.02,h*.19,7,'#c8cfb1','center');
  c.restore();
}

function drawBody(c,b,time,selected=false,thumb=false) {
  if(b.broken)return;
  if(b.kind==='burner')drawBurner(c,b,time,selected);
  else if(b.kind==='hotplate')drawHotplate(c,b,time,selected);
  else if(b.kind==='stand')drawStand(c,b,selected);
  else if(b.kind==='thermometer')drawThermometer(c,b,selected);
  else if(b.kind==='evaporating_dish'||b.kind==='crucible')drawCeramic(c,b,time,selected);
  else drawGlass(c,b,time,selected,thumb);
}

function drawParticle(c,p,time) {
  const ratio=Math.max(0,Math.min(1,(p.life??1)/(p.maxLife||p.life||1))),s=p.size||3;
  const x=Math.round(p.x/2)*2,y=Math.round(p.y/2)*2,col=p.color||'#c7d6b6';
  c.save();
  switch(p.type) {
    case 'flash': {
      const radius=s*(1.8-ratio)+12;const g=c.createRadialGradient(x,y,0,x,y,radius*2);
      g.addColorStop(0,`rgba(238,248,246,${ratio*.28})`);g.addColorStop(.3,`rgba(217,235,233,${ratio*.13})`);g.addColorStop(1,'rgba(217,235,233,0)');
      rect(c,x-radius*2,y-radius*2,radius*4,radius*4,g);
      c.strokeStyle=`rgba(222,239,236,${ratio*.35})`;c.lineWidth=1+ratio*3;c.beginPath();c.arc(x,y,radius,0,TAU);c.stroke();
      break;
    }
    case 'smoke': case 'steam': {
      const a=(p.type==='steam'?.27:.5)*ratio,vapor=p.type==='steam'?'#e5eeeb':col;
      rect(c,x-s*.5,y-s*.65,s,s*1.3,vapor,a);rect(c,x-s*.9,y-s*.3,s*1.8,s*.65,vapor,a*.8);
      rect(c,x-s*.2,y-s*.8,s*.6,s*.3,shade(vapor,10),a*.7);break;
    }
    case 'bubble': {
      c.globalAlpha=ratio*.55;c.strokeStyle='#dbeae5';c.lineWidth=1;c.strokeRect(x-s*.5,y-s*.5,s,s);rect(c,x-s*.5,y-s*.5,1,1,'#f0f5ed',ratio*.6);break;
    }
    case 'shard': {
      c.translate(x,y);c.rotate(p.angle||time*3);poly(c,[[-s,-s*.2],[s*.8,-s*.5],[s*.3,s]],col,'#d1e3ca',.6);break;
    }
    case 'spark': {
      c.globalCompositeOperation='screen';rect(c,x-s*.5,y-s*.5,s,s,col,ratio);
      if(s>2){rect(c,x-1,y-s*1.1,2,s*2.2,'#fff1bd',ratio*.8);rect(c,x-s*1.1,y-1,s*2.2,2,'#ffe8aa',ratio*.6);}break;
    }
    default: {
      const phase=p.mixture?appearance(p.mixture):null;
      const dropColor=phase?(phase.hasLiquid?phase.liquidColor:phase.solidColor):col;
      const opacity=phase?(phase.hasLiquid?Math.max(.16,phase.liquidOpacity):.9):.75;
      rect(c,x-s*.5,y-s*.5,s,s*1.4,dropColor,Math.min(opacity,ratio*3));
      rect(c,x-s*.5,y-s*.5,Math.max(1,s*.35),Math.max(1,s*.4),'#e5efea',ratio*.6);
    }
  }
  c.restore();
}

function renderPuddle(c,p,time) {
  const width=p.width||Math.min(220,18+Math.sqrt(p.amount||10)*12),y=p.y||FLOOR;
  const phase=p.mixture?appearance(p.mixture):{hasLiquid:true,liquidColor:'#e6f2f2',liquidOpacity:.1,solidFraction:0};
  if(phase.hasLiquid) {
    ellipse(c,p.x,y+2,width*.5,4,'#172c28',.15);
    ellipse(c,p.x,y+1,width*.49,3,phase.liquidColor,phase.liquidOpacity);
    rect(c,p.x-width*.25,y-1,width*.22,1,'#e5efdf',.5);
  }
  if(phase.solidFraction>0) {
    const rng=random(Math.round(p.x)),spread=width*Math.max(.15,Math.sqrt(phase.solidFraction));
    for(let i=0;i<20;i++)rect(c,p.x+(rng()-.5)*spread,y+rng()*3-1,2+rng()*3,1+rng()*2,phase.solidColor,.85);
  }
}

const EQUIPMENT_LABELS={bottle:'Бутылочка',beaker:'Химический стакан',flask:'Колба Эрленмейера',tube:'Пробирка',graduated_cylinder:'Мерный цилиндр',dropper:'Пипетка',evaporating_dish:'Выпарительная чашка',crucible:'Фарфоровый тигель',burner:'Спиртовка',hotplate:'Электроплитка',thermometer:'Лабораторный термометр',stand:'Лабораторная подставка'};

function labelData(b) {
  const source=SUBSTANCES[b.substance];
  const name=b.product?.name||b.label||source?.name||EQUIPMENT_LABELS[b.kind]||'Сосуд';
  return {name,formula:b.formula||b.identity?.formula||source?.formula||''};
}

function nativeText(c,value,x,y,size=16,color='#294735',align='left',weight=400) {
  c.font=`${weight} ${size}px ${LABEL_FONT}`;c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(String(value),Math.round(x),Math.round(y));
}

function labelMetrics(cssScale=1) {
  const scale=Math.max(.15,cssScale||1);
  const font=(base,min,max)=>Math.max(min,Math.min(max,base*scale))/scale;
  const small=font(16,12,18);
  return {small,formula:font(18,12,20),title:font(20,14,24),layout:small/16};
}

function ellipsis(c,value,width) {
  const chars=[...String(value)];if(c.measureText(value).width<=width)return value;
  while(chars.length&&c.measureText(chars.join('')+'…').width>width)chars.pop();
  return chars.join('')+'…';
}

function labelLines(c,value,width,maxLines=Infinity) {
  const words=String(value||'').trim().split(/\s+/).filter(Boolean),lines=[];let current='';
  for(let i=0;i<words.length;i++) {
    const word=words[i],candidate=current?current+' '+word:word;
    if(c.measureText(candidate).width<=width){current=candidate;continue;}
    if(current){lines.push(current);current='';}
    if(lines.length>=maxLines){lines[maxLines-1]=ellipsis(c,lines[maxLines-1]+' '+words.slice(i).join(' '),width);return lines;}
    if(c.measureText(word).width<=width){current=word;continue;}
    // Long chemical names/formulas remain complete on the enlarged card.
    let chunk='';for(const character of [...word]) {
      if(chunk&&c.measureText(chunk+character).width>width){lines.push(chunk);chunk='';}
      if(lines.length>=maxLines){lines[maxLines-1]=ellipsis(c,lines[maxLines-1]+character+words.slice(i+1).join(' '),width);return lines;}
      chunk+=character;
    }
    current=chunk;
  }
  if(current&&lines.length<maxLines)lines.push(current);
  return lines;
}

function shortNameLines(c,value,width,maxLines=2) {
  const name=String(value||'').replace(/^Дистиллированная вода$/,'Дистил. вода');
  const words=name.trim().split(/\s+/).filter(Boolean),lines=[];let current='';
  for(let i=0;i<words.length;i++) {
    const word=ellipsis(c,words[i],width),candidate=current?current+' '+word:word;
    if(c.measureText(candidate).width<=width){current=candidate;continue;}
    if(current)lines.push(current);
    if(lines.length>=maxLines){lines[maxLines-1]=ellipsis(c,lines[maxLines-1]+' '+words.slice(i).join(' '),width);return lines;}
    current=word;
  }
  if(current&&lines.length<maxLines)lines.push(current);
  return lines;
}

function bodyBounds(b) {
  const a=b.angle||0,w=b.w||54,h=b.h||100;
  const ex=(Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*h)/2,ey=(Math.abs(Math.cos(a))*h+Math.abs(Math.sin(a))*w)/2;
  return {left:b.x-ex,right:b.x+ex,top:b.y-ey,bottom:b.y+ey};
}

function intersects(a,b,gap=4) {return a.x<b.w+b.x+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;}

function drawFormulaPlaque(c,b,metrics=labelMetrics()) {
  if(b.broken||b.capacity===0)return;
  const {formula}=labelData(b);if(!formula)return;
  const first=formula.split(/\s+[+·]\s+/)[0];
  const u=metrics.layout,cy=b.kind==='dropper'?b.y-10:b.y+9;
  c.save();c.font=`600 ${metrics.small}px ${LABEL_FONT}`;
  const baseWidth=Math.max(48,Math.min(86,(b.w||54)*.96))*u;
  const width=Math.min(180*u,Math.max(baseWidth,c.measureText(first).width+12*u));
  const shown=ellipsis(c,first,width-8*u);
  rect(c,b.x-width/2-1,cy-14*u,width+2,24*u,'#142d23',.9);
  rect(c,b.x-width/2,cy-13*u,width,22*u,'#f0ead2',.98);
  nativeText(c,shown,b.x,cy+3*u,metrics.small,'#284232','center',600);
  c.restore();
}

function bottleTag(c,b,occupied,metrics) {
  const {name}=labelData(b),u=metrics.layout,width=126*u;
  c.font=`400 ${metrics.small}px ${LABEL_FONT}`;const rows=shortNameLines(c,name,width-16*u),height=(rows.length*19+12)*u;
  const bounds=bodyBounds(b);
  const box={x:Math.max(8,Math.min(W-width-8,b.x-width/2)),y:Math.min(H-height-8,bounds.bottom+10),w:width,h:height};
  for(let tries=0;tries<5&&occupied.some(other=>intersects(box,other));tries++) {
    const obstacle=occupied.find(other=>intersects(box,other));
    box.y=obstacle.y+obstacle.h+5;
    if(box.y+height>H-8)box.y=Math.max(12,bounds.top-height-12-tries*(height+5));
  }
  occupied.push(box);
  const lineEnd=box.y>bounds.bottom?box.y:box.y+box.h;
  line(c,[[b.x,box.y>bounds.bottom?bounds.bottom+2:bounds.top-2],[b.x,lineEnd]],'#c4cbab88',1);
  rect(c,box.x,box.y,box.w,box.h,'#20392e',.98);rect(c,box.x,box.y,box.w,1,'#bfc493',.7);
  rows.forEach((row,index)=>nativeText(c,row,box.x+box.w/2,box.y+(21+index*19)*u,metrics.small,'#f0ecd6','center'));
}

function focusCard(c,b,occupied,metrics) {
  if(!b||b.broken)return;
  const {name,formula}=labelData(b);
  const u=metrics.layout,padding=14*u,titleLeading=metrics.title*1.2,formulaLeading=metrics.formula*22/18;
  c.font=`600 ${metrics.title}px ${LABEL_FONT}`;
  const width=Math.min(W-20,460*u,Math.max(244*u,c.measureText(name).width+padding*2,c.measureText(formula).width+padding*2));
  const title=labelLines(c,name,width-padding*2,8);
  c.font=`600 ${metrics.formula}px ${LABEL_FONT}`;const formulas=formula?labelLines(c,formula,width-padding*2,6):[];
  const bounds=bodyBounds(b),height=title.length*titleLeading+formulas.length*formulaLeading+45*u;
  if(b.kind==='burner'&&b.lit)bounds.top-=55;
  const box={x:Math.max(10,Math.min(W-width-10,b.x-width/2)),y:Math.max(12,bounds.top-height-17),w:width,h:height};
  if(bounds.top<height+29)box.y=Math.min(H-height-10,bounds.bottom+17);
  for(const other of occupied)if(intersects(box,other,9)) {
    const above=other.y-height-9;
    if(above>=10)box.y=above;
    else {box.y=Math.min(H-height-10,other.y+other.h+9);box.x=Math.max(10,Math.min(W-width-10,other.x+other.w+10));}
  }
  occupied.push(box);
  c.save();c.shadowColor='#06150f55';c.shadowBlur=12;c.shadowOffsetY=4;
  rect(c,box.x,box.y,box.w,box.h,'#f0ead4');c.restore();
  rect(c,box.x,box.y,box.w,3,'#c8ad70');
  c.strokeStyle='#a3986a';c.lineWidth=1;c.strokeRect(box.x+.5,box.y+.5,box.w-1,box.h-1);
  title.forEach((row,index)=>nativeText(c,row,box.x+padding,box.y+27*u+index*titleLeading,metrics.title,'#2a4635','left',600));
  const formulaY=box.y+title.length*titleLeading+25*u;
  formulas.forEach((row,index)=>nativeText(c,row,box.x+padding,formulaY+index*formulaLeading,metrics.formula,'#48684b','left',600));
  const gasAmount=Object.values(b.mixture?.gasAmounts||{}).reduce((sum,n)=>sum+(Number.isFinite(n)?n:0),0);
  const amountLabel=fluidInfo(b).amount<.01&&gasAmount>0?`${Number(gasAmount.toPrecision(3))} ммоль газа`:`${Math.round(fluidInfo(b).amount)} мл`;
  const meta=b.kind==='thermometer'?`${Math.round(Number.isFinite(b.reading)?b.reading:22)} °C`:
    b.capacity>0?`${amountLabel}  ·  ${Math.round(b.mixture?.temperature??22)} °C${b.sealed?'  ·  Закрыт':''}`:
    ['burner','hotplate'].includes(b.kind)?b.lit?'Нагрев включён':'Нагрев выключен':'Лабораторное оборудование';
  nativeText(c,meta,box.x+padding,box.y+box.h-13*u,metrics.small,'#6c775b');
  // A short leader identifies the specimen even when a nearby card was moved.
  const anchorX=Math.max(box.x+12,Math.min(box.x+box.w-12,b.x)),above=box.y+box.h<bounds.top;
  line(c,[[anchorX,above?box.y+box.h:box.y],[b.x,above?bounds.top-4:bounds.bottom+4]],'#b9bd8c',1);
}

function drawReadableLabels(c,world,hovered,cssScale=1) {
  const metrics=labelMetrics(cssScale);
  const bodies=(world.bodies||[]).filter(b=>!b.broken),selected=world.selected;
  for(const b of bodies)drawFormulaPlaque(c,b,metrics);
  const tags=[];
  for(const b of bodies.filter(b=>b.kind==='bottle'&&b!==selected&&b!==hovered).sort((a,b)=>a.x-b.x))bottleTag(c,b,tags,metrics);
  const focus=[];focusCard(c,selected,focus,metrics);if(hovered!==selected)focusCard(c,hovered,focus,metrics);
}

/** Procedural pixel laboratory renderer. Coordinates are physical world pixels. */
export class Renderer {
  constructor(canvas) {
    this.canvas=canvas;canvas.width=W;canvas.height=H;
    this.ctx=canvas.getContext('2d');this.ctx.imageSmoothingEnabled=false;
    if(canvas.style)canvas.style.aspectRatio=`${W} / ${H}`;
    this.frame=document.createElement('canvas');this.frame.width=W;this.frame.height=H;
    this.frameContext=this.frame.getContext('2d');this.frameContext.imageSmoothingEnabled=false;
    this.scene=document.createElement('canvas');this.scene.width=W;this.scene.height=H;
    this.scene.getContext('2d').imageSmoothingEnabled=false;background(this.scene.getContext('2d'));
    this.lastTime=0;this._surfaceDirty=true;this._lastDPR=0;
    if(typeof ResizeObserver!=='undefined'){this._resizeObserver=new ResizeObserver(()=>{this._surfaceDirty=true;});this._resizeObserver.observe(canvas);}
  }

  resizeSurface() {
    const dpr=Math.max(1,Math.min(3,globalThis.devicePixelRatio||1));
    if(!this._resizeObserver)this._surfaceDirty=true;
    if(!this._surfaceDirty&&dpr===this._lastDPR)return;
    const bounds=this.canvas.getBoundingClientRect?.(),cssWidth=bounds?.width||this.canvas.clientWidth||W;
    this._cssWidth=cssWidth;
    const width=Math.round(cssWidth*dpr),height=Math.round(cssWidth*H/W*dpr);
    if(this.canvas.width!==width)this.canvas.width=width;
    if(this.canvas.height!==height)this.canvas.height=height;
    this._lastDPR=dpr;this._surfaceDirty=false;
  }

  draw(world,opts={}) {
    this.resizeSurface();
    const c=this.frameContext,time=world.time||0,reducedMotion=opts.reducedMotion===true;
    const ambientTime=reducedMotion?0:time;
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);c.imageSmoothingEnabled=false;
    c.save();
    const flash=(world.particles||[]).find(p=>p.type==='flash'&&p.life/(p.maxLife||1)>.5);
    if(flash&&!reducedMotion){const strength=Math.min(7,(flash.size||15)*.08);c.translate(Math.round(Math.sin(time*91)*strength),Math.round(Math.cos(time*79)*strength*.5));}
    c.drawImage(this.scene,0,0);
    if(opts.blackboardCanvas?.width>0&&opts.blackboardCanvas?.height>0) {
      const r=BOARD_RECT;c.save();c.beginPath();c.rect(r.x,r.y,r.w,r.h);c.clip();
      c.imageSmoothingEnabled=true;c.drawImage(opts.blackboardCanvas,r.x,r.y,r.w,r.h);c.restore();
    }
    if(opts.boardHovered) {
      const r=BOARD_RECT;c.strokeStyle='#c4c28f88';c.lineWidth=1;c.strokeRect(r.x-3,r.y-3,r.w+6,r.h+6);
      rect(c,r.x+r.w-154,r.y+r.h-23,148,19,'#172f27',.9);
      text(c,'Доска · нажмите',r.x+r.w-80,r.y+r.h-10,11,'#c7d2a9','center');
    }
    // Slow rainfall in the window gives the otherwise fixed view a living atmosphere.
    c.save();c.beginPath();c.rect(73,83,101,118);c.rect(187,83,108,118);c.rect(73,215,101,118);c.rect(187,215,108,118);c.clip();
    for(let i=0;i<35;i++){
      const x=75+(i*47.71%215),y=82+((i*39.7+ambientTime*(38+i%4*9))%252);
      line(c,[[x,y],[x-2,y+8]],'#bbd1c1',1);
    }c.restore();
    // A translucent stepped light cone, kept behind glass and hands.
    poly(c,[[565,112],[636,112],[888,490],[312,490]],'#dfc47a0a');
    poly(c,[[575,112],[626,112],[795,490],[405,490]],'#e3cf8c08');
    const lampGlow=c.createRadialGradient(600,164,20,600,250,330);lampGlow.addColorStop(0,'#f3d78412');lampGlow.addColorStop(1,'#efca7100');rect(c,240,100,720,410,lampGlow);
    // Slow dust particles stay subtle and never resemble reagent drops.
    for(let i=0;i<16;i++){
      const x=435+(i*83.71%340)+Math.sin(ambientTime*.3+i)*6,y=120+((i*39.4-ambientTime*(2+i%3)+2000)%310);
      rect(c,x,y,1,1,'#e4d5a5',.15+Math.sin(ambientTime+i)*.08);
    }
    for(const p of world.puddles||[])renderPuddle(c,p,time);
    const bodies=world.bodies||[],held=world.held;
    // Ground shadows anchor the freely movable instruments.
    for(const b of bodies){
      if(b.broken)continue;const floorDist=Math.max(0,FLOOR-b.y-b.h*.5);
      ellipse(c,b.x,FLOOR+1,Math.max(9,b.w*.48-floorDist*.025),3+Math.min(4,floorDist*.015),'#101f1a',Math.max(.06,.33-floorDist*.0008));
      if(b.lit){const g=c.createRadialGradient(b.x,b.y,4,b.x,b.y,75);g.addColorStop(0,'#d6ab4d24');g.addColorStop(1,'#d6ab4d00');rect(c,b.x-75,b.y-75,150,150,g);}
    }
    // Stands paint first; glass rests visibly on their shelves.
    for(const b of bodies.filter(b=>b.kind==='stand'&&b!==held))drawBody(c,b,time,b===world.selected);
    for(const b of bodies.filter(b=>b.kind!=='stand'&&b!==held))drawBody(c,b,time,b===world.selected||b===opts.hovered);
    if(held)drawBody(c,held,time,true);
    // Essential droplets, steam, and fragments remain visible; omit broad flashes.
    for(const p of world.particles||[])if(!reducedMotion||p.type!=='flash')drawParticle(c,p,time);
    c.restore();
    // A thin top highlight frames the scene without adding a HUD inside it.
    rect(c,0,0,W,1,'#87916b',.35);
    // Pixel artwork is scaled once. Text is then drawn directly into the visible
    // retina-sized backing store, rather than being resampled with the sprites.
    const target=this.ctx,sx=this.canvas.width/W,sy=this.canvas.height/H;
    target.setTransform(1,0,0,1,0,0);target.clearRect(0,0,this.canvas.width,this.canvas.height);
    target.imageSmoothingEnabled=false;target.drawImage(this.frame,0,0,this.canvas.width,this.canvas.height);
    target.setTransform(sx,0,0,sy,0,0);target.imageSmoothingEnabled=true;
    drawReadableLabels(target,world,opts.hovered||null,(this._cssWidth||W)/W);
    target.setTransform(1,0,0,1,0,0);
    this.lastTime=time;
  }
}

/** Small transparent thumbnails for cabinet cards and the ten inventory slots. */
export function drawItem(canvas,spec={}) {
  const c=canvas.getContext('2d'),cw=canvas.width||100,ch=canvas.height||100;
  c.clearRect(0,0,cw,ch);c.imageSmoothingEnabled=false;
  const kind=spec.kind||'bottle';
  const dims={bottle:[54,100],beaker:[76,82],flask:[72,102],tube:[30,100],burner:[56,64],stand:[110,130],thermometer:[14,120],graduated_cylinder:[36,130],dropper:[20,100],evaporating_dish:[100,28],crucible:[56,58],hotplate:[110,40]};
  const [w,h]=dims[kind]||dims.bottle;
  const scale=Math.min((cw-14)/(w+10),(ch-10)/(h+15));
  const capacities={bottle:150,beaker:250,flask:200,tube:40,burner:0,stand:0,thermometer:0,graduated_cylinder:100,dropper:10,evaporating_dish:120,crucible:50,hotplate:0};
  const source=SUBSTANCES[spec.substance],amount=spec.volume??(source?90:0);
  const body={...spec,kind,w:spec.w||w,h:spec.h||h,x:0,y:0,angle:0,capacity:spec.capacity??capacities[kind]??150,volume:amount,
    mixture:spec.mixture||(source?createMixture(source.id,amount):undefined),formula:spec.formula||source?.formula||'',label:spec.label||spec.name||source?.name||''};
  c.save();c.translate(cw/2,ch/2+3);c.scale(scale,scale);drawBody(c,body,1,false,true);drawFormulaPlaque(c,body);c.restore();
}
