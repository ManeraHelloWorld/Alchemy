import {SUBSTANCES} from './chemistry.js';

/** Persistent, monotonic research progress. Merely viewing the cabinet is not a discovery. */
export class DiscoveryBook {
  constructor(saved={}) { this.records={}; this.restore(saved); }
  record(id,context={}) {
    if(!Object.hasOwn(SUBSTANCES,id))return false;
    const now=Number.isFinite(context.at)?context.at:Date.now();
    const text=value=>typeof value==='string'?value.slice(0,500):'';
    const existing=this.records[id];
    if(existing){
      if(context.kind==='reaction'&&!existing.synthesis)existing.synthesis={at:now,equation:text(context.equation),source:text(context.source)};
      return false;
    }
    this.records[id]={id,at:now,kind:['reaction','stock','existing'].includes(context.kind)?context.kind:'existing',source:text(context.source)||'Исследовано на столе',equation:text(context.equation)};
    if(context.kind==='reaction')this.records[id].synthesis={at:now,equation:text(context.equation),source:text(context.source)};
    return true;
  }
  observe(mixture,context={}) {
    const found=[];
    for(const field of ['amounts','gasAmounts','escaped'])for(const [id,amount] of Object.entries(mixture?.[field]||{})){
      if(Number.isFinite(amount)&&amount>1e-7&&this.record(id,context))found.push(id);
    }
    return found;
  }
  restore(saved) {
    if(!saved||typeof saved!=='object'||Array.isArray(saved))return;
    for(const [id,value] of Object.entries(saved)){
      if(!Object.hasOwn(SUBSTANCES,id)||!value||typeof value!=='object')continue;
      this.record(id,{...value,at:Number.isFinite(value.at)?value.at:Date.now()});
      if(value.synthesis&&typeof value.synthesis==='object')this.record(id,{...value.synthesis,kind:'reaction'});
    }
  }
  serialize(){return JSON.parse(JSON.stringify(this.records));}
  get count(){return Object.keys(this.records).length;}
}
