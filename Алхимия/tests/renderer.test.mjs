import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer,drawItem} from '../dist/renderer.js';
import {World,EQUIPMENT} from '../dist/physics.js';
import {createMixture,appearance} from '../dist/chemistry.js';

function canvas(width=170,height=170) {
  const calls=[],stack=[];
  const context={
    globalAlpha:1,font:'10px Arial',fillStyle:'#000',strokeStyle:'#000',transform:[1,0,0,1,0,0],
    save(){stack.push({globalAlpha:this.globalAlpha,font:this.font,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,transform:[...this.transform]});},
    restore(){Object.assign(this,stack.pop()||{});},
    setTransform(...matrix){this.transform=matrix;},
    fillRect(x,y,w,h){calls.push({type:'fill',x,y,w,h,color:this.fillStyle,alpha:this.globalAlpha});},
    fillText(value,x,y){calls.push({type:'text',value:String(value),x,y,font:this.font,transform:[...this.transform]});},
    drawImage(source,...args){calls.push({type:'image',source,args});},
    measureText(value){return {width:[...String(value)].length*Number(this.font.match(/([\d.]+)px/)?.[1]||10)*.52};},
    createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};},
    beginPath(){},closePath(){},moveTo(){},lineTo(){},fill(){},stroke(){},strokeRect(){},clearRect(){},
    rect(){},clip(){},ellipse(){},arc(){},translate(){},rotate(){},scale(){},setLineDash(){},
  };
  return {width,height,style:{},cssWidth:width,context,calls,getContext:()=>context,getBoundingClientRect(){return {width:this.cssWidth,height:this.cssWidth*620/1200};}};
}

test('colourless liquids use transparent liquid paint, not an opaque blue fill',()=>{
  const target=canvas();
  drawItem(target,{kind:'beaker',substance:'water',volume:80,capacity:250});
  const fills=target.calls.filter(call=>call.type==='fill'&&call.color==='#e6f2f2');
  assert.ok(fills.length>0,'water should have a visible but transparent fill');
  assert.ok(fills.every(call=>call.alpha<=.11));
  assert.ok(!target.calls.some(call=>call.type==='fill'&&call.color==='#82cbd1'&&call.alpha>.3));
});

test('a precipitate is rendered as bottom sediment without colouring all the solvent',()=>{
  const mixture=createMixture('water',80);mixture.amounts.copper_hydroxide=2;
  const phase=appearance(mixture),target=canvas();
  drawItem(target,{kind:'beaker',mixture,capacity:250,w:76,h:82});
  const water=target.calls.find(call=>call.type==='fill'&&call.color===phase.liquidColor&&call.alpha===phase.liquidOpacity);
  const sediment=target.calls.find(call=>call.type==='fill'&&call.color===phase.solidColor&&call.alpha===.94);
  assert.ok(water&&sediment,'both phases need their own paint');
  assert.ok(sediment.y>water.y,'solid belongs below the liquid surface');
  assert.ok(sediment.h<water.h/2,'a trace precipitate must not become an opaque full-vessel blend');
});

test('scene sprites and readable labels use separate backing resolutions',()=>{
  const originalDocument=globalThis.document,originalDPR=globalThis.devicePixelRatio;
  try {
    globalThis.document={createElement:()=>canvas()};globalThis.devicePixelRatio=2;
    const target=canvas(900,465),renderer=new Renderer(target),world=new World();
    world.selected=world.create('bottle',420,430,{substance:'water',volume:80});
    const hovered=world.create('bottle',650,430,{substance:'cuso4',volume:80});
    renderer.draw(world,{hovered,showHints:false});
    assert.equal(target.width,1800);assert.equal(target.height,930);
    assert.equal(renderer.frame.width,1200);assert.equal(renderer.frame.height,620);
    const image=target.calls.find(call=>call.type==='image');
    assert.equal(image.source,renderer.frame,'the sprite frame should be composited first');
    const labels=target.calls.filter(call=>call.type==='text');
    assert.ok(labels.some(call=>call.value==='Дистиллированная вода'));
    assert.ok(labels.some(call=>call.value==='Сульфат меди(II)'));
    assert.ok(labels.some(call=>call.value==='H₂O'));
    assert.ok(labels.every(call=>Number(call.font.match(/([\d.]+)px/)[1])>=16));
    assert.ok(labels.every(call=>call.transform[0]===1.5),'labels should be drawn natively after scaling coordinates');
    target.cssWidth=600;renderer.draw(world);
    assert.equal(target.width,1200);assert.equal(target.height,620);
  } finally {
    if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
    if(originalDPR===undefined)delete globalThis.devicePixelRatio;else globalThis.devicePixelRatio=originalDPR;
  }
});

test('every apparatus thumbnail still renders with separated appearance phases',()=>{
  for(const item of EQUIPMENT) {
    const target=canvas();
    assert.doesNotThrow(()=>drawItem(target,{...item,kind:item.id,mixture:item.capacity?createMixture('water',Math.min(item.capacity/2,30)):undefined,formula:item.capacity?'H₂O':''}));
  }
});
