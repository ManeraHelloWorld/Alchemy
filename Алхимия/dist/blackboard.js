const W=1000,H=434;
const COLORS=['#eee9cf','#e8c87c','#89c7bc','#dda6b8'];
const limit=(n,min,max)=>Math.max(min,Math.min(max,n));

export function normalizeStrokes(input) {
  if(!Array.isArray(input))return [];
  const thin=(points,count)=>points.length<=count?points:Array.from({length:count},(_,i)=>points[Math.round(i*(points.length-1)/(count-1))]);
  const result=input.slice(-1200).flatMap(stroke=>{
    if(!stroke||typeof stroke!=='object')return [];
    if(stroke.tool==='clear')return [{tool:'clear'}];
    if(!['chalk','eraser'].includes(stroke.tool)||!Array.isArray(stroke.points))return [];
    const points=thin(stroke.points,6000).filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])).map(p=>[Math.round(limit(p[0],0,W)*10)/10,Math.round(limit(p[1],0,H)*10)/10]);
    if(!points.length)return [];
    return [{tool:stroke.tool,color:COLORS.includes(stroke.color)?stroke.color:COLORS[0],width:limit(Number.isFinite(stroke.width)?stroke.width:4,1,40),points}];
  });
  const strokes=result.filter(s=>s.points),total=strokes.reduce((n,s)=>n+s.points.length,0);
  if(total>40000){const reserved=strokes.reduce((n,s)=>n+Math.min(2,s.points.length),0),ratio=(40000-reserved)/(total-reserved);for(const s of strokes){const base=Math.min(2,s.points.length);s.points=thin(s.points,base+Math.floor((s.points.length-base)*ratio));}}
  return result;
}

/** Transparent chalk layer shared by the enlarged board and the room renderer. */
export class Blackboard {
  constructor(canvas,onChange=()=>{}) {
    this.canvas=canvas;this.canvas.width=W;this.canvas.height=H;
    this.surface=document.createElement('canvas');this.surface.width=W;this.surface.height=H;
    this.context=this.surface.getContext('2d');this.view=this.canvas.getContext('2d');
    this.strokes=[];this.redoStack=[];this.active=null;this.color=COLORS[0];this.width=4;this.tool='chalk';this.onChange=onChange;
    canvas.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);
      this.active={tool:this.tool,color:this.color,width:this.tool==='eraser'?this.width*4:this.width,points:[this.point(event)]};
      this.segment(this.active,this.active.points[0],this.active.points[0]);this.present();
    });
    canvas.addEventListener('pointermove',event=>{
      if(!this.active)return;event.preventDefault();
      const samples=event.getCoalescedEvents?.();
      for(const sample of samples?.length?samples:[event]){
        const point=this.point(sample),last=this.active.points.at(-1);
        if(Math.hypot(point[0]-last[0],point[1]-last[1])<.75)continue;
        this.segment(this.active,last,point);this.active.points.push(point);
      }
      this.present();
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>this.finish());
    canvas.addEventListener('contextmenu',event=>event.preventDefault());
  }
  point(event){const r=this.canvas.getBoundingClientRect();return[limit((event.clientX-r.left)*W/r.width,0,W),limit((event.clientY-r.top)*H/r.height,0,H)];}
  segment(stroke,a,b){
    const c=this.context;c.save();c.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';
    c.strokeStyle=stroke.color;c.fillStyle=stroke.color;c.globalAlpha=stroke.tool==='eraser'?1:.85;c.lineWidth=stroke.width;c.lineCap='round';c.lineJoin='round';
    if(a[0]===b[0]&&a[1]===b[1]){c.beginPath();c.arc(a[0],a[1],stroke.width/2,0,Math.PI*2);c.fill();}
    else{c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();}
    if(stroke.tool==='chalk'){
      c.globalAlpha=.28;c.lineWidth=Math.max(.5,stroke.width*.2);c.strokeStyle='#fffbed';c.beginPath();c.moveTo(a[0]-.4,a[1]-.3);c.lineTo(b[0]-.4,b[1]-.3);c.stroke();
    }
    c.restore();
  }
  present(){this.view.clearRect(0,0,W,H);this.view.drawImage(this.surface,0,0);}
  repaint(){this.context.clearRect(0,0,W,H);for(const stroke of this.strokes){if(stroke.tool==='clear'){this.context.clearRect(0,0,W,H);continue;}stroke.points.forEach((p,i)=>this.segment(stroke,stroke.points[Math.max(0,i-1)],p));}this.present();}
  finish(){if(!this.active)return;this.strokes.push(this.active);this.active=null;this.redoStack=[];this.strokes=normalizeStrokes(this.strokes);this.repaint();this.onChange();}
  undo(){this.finish();if(this.strokes.length){this.redoStack.push(this.strokes.pop());this.repaint();this.onChange();}}
  redo(){this.finish();if(this.redoStack.length){this.strokes.push(this.redoStack.pop());this.repaint();this.onChange();}}
  clear(){this.finish();this.strokes.push({tool:'clear'});this.redoStack=[];this.repaint();this.onChange();}
  restore(data){this.strokes=normalizeStrokes(data);this.active=null;this.redoStack=[];this.repaint();}
  serialize(){return normalizeStrokes(this.strokes);}
  setTool(tool){this.tool=tool==='eraser'?'eraser':'chalk';this.canvas.classList.toggle('eraser',this.tool==='eraser');}
}
