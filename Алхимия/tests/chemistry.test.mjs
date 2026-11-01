import test from 'node:test';
import assert from 'node:assert/strict';
import {SUBSTANCES, REACTIONS, createMixture, volume, transfer, stepChemistry, getPH, color, appearance, describe,identifyMixture,MODEL_NOTES} from '../dist/chemistry.js';

const close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} ≠ ${b}`);
const run=(m,seconds=20,options={})=>{const events=[];for(let t=0;t<seconds;t+=.1)events.push(...stepChemistry(m,.1,options));return events;};
function combine(...pairs){const m=createMixture();for(const[id,ml]of pairs)transfer(createMixture(id,ml),m,ml);return m;}
function atoms(m){const total={};for(const container of [m.amounts,m.gasAmounts,m.escaped])for(const[id,n]of Object.entries(container||{}))for(const[a,count]of Object.entries(SUBSTANCES[id].atoms))total[a]=(total[a]||0)+count*n;return total;}
function conserved(before,after){const left=atoms(before),right=atoms(after);for(const id of new Set([...Object.keys(left),...Object.keys(right)]))close(left[id]||0,right[id]||0,1e-4);}

test('all reaction equations balance every element',()=>{
 for(const r of REACTIONS){
  const left=atoms({amounts:r.reactants}),right=atoms({amounts:r.products});
  assert.deepEqual(left,right,r.id);
 }
});

test('stock solution amounts and transfer conserve each species and volume',()=>{
 const src=createMixture('cuso4',80),dst=createMixture('water',20);
 const copper=src.amounts.cuso4,water=src.amounts.water+dst.amounts.water;
 src.temperature=70;
 close(transfer(src,dst,30),30);close(volume(src),50);close(volume(dst),50);
 close(src.amounts.cuso4+dst.amounts.cuso4,copper);
 close(src.amounts.water+dst.amounts.water,water);close(dst.temperature,50.8);
 assert.equal(transfer(src,src,30),0);assert.equal(transfer(src,dst,-3),0);
});

test('neutralization limits reaction by stoichiometry and retains excess acid',()=>{
 const mix=combine(['hcl',20],['naoh',10]),before=structuredClone(mix);
 const events=run(mix);
 close(mix.amounts.sodium_chloride,5,.0001);close(mix.amounts.hcl,5,.0001);
 assert.ok(!mix.amounts.naoh);assert.ok(getPH(mix)<2);
 assert.ok(events.some(e=>e.reactionId==='neutralization'));
 conserved(before,mix);
});

test('equal strong acid/base yields neutral salt and exothermic warming',()=>{
 const mix=combine(['hcl',20],['naoh',20]);
 run(mix,5);
 assert.ok(mix.temperature>23);run(mix,15);
 close(getPH(mix),7);close(mix.amounts.sodium_chloride,10,.0001);
});

test('carbonate reaction generates real gas and conserves atoms including escaped gas',()=>{
 const mix=combine(['acetic_acid',20],['sodium_bicarbonate',25]),before=structuredClone(mix);
 const events=run(mix,40);
 close(mix.escaped.carbon_dioxide,10,.0001);
 assert.ok(events.some(e=>e.type==='gas'));
 assert.ok(!mix.amounts.acetic_acid&&!mix.amounts.sodium_bicarbonate);
 conserved(before,mix);
});

test('precipitation uses two base equivalents and makes an insoluble product',()=>{
 const mix=combine(['cuso4',25],['naoh',20]),before=structuredClone(mix);
 run(mix);
 close(mix.amounts.copper_hydroxide,5,.0001);close(mix.amounts.sodium_sulfate,5,.0001);
 assert.ok(!mix.amounts.cuso4&&!mix.amounts.naoh);conserved(before,mix);
 assert.ok(describe(mix).includes('↓'));
});

test('metal displacement conserves atoms; copper does not displace iron',()=>{
 const mix=combine(['cuso4',20],['iron',.2]),before=structuredClone(mix);
 run(mix,120);assert.ok(mix.amounts.copper>3.99);conserved(before,mix);
 const control=combine(['iron_sulfate',20],['copper',.2]);
 assert.equal(run(control).length,0);
});

test('dry solids do not undergo aqueous reactions without solvent',()=>{
 const mix=createMixture();mix.amounts={copper_oxide:5,hcl:10};
 assert.equal(run(mix).length,0);assert.equal(mix.amounts.copper_oxide,5);assert.equal(getPH(mix),null);
});

test('acid can redissolve hydroxide precipitate',()=>{
 const mix=createMixture('hcl',20);mix.amounts.copper_hydroxide=5;
 const before=structuredClone(mix);run(mix);
 assert.ok(!mix.amounts.copper_hydroxide);close(mix.amounts.copper_chloride,5,.0001);conserved(before,mix);
});

test('indicator responds to pH, and pure water dilution changes strong acid pH',()=>{
 const mix=combine(['naoh',10],['phenolphthalein',1]);
 const pink=color(mix);assert.equal(pink,'#eb55ac');
 transfer(createMixture('hcl',11),mix,11);run(mix);
 assert.notEqual(color(mix),pink);
 const acid=createMixture('hcl',10),ph=getPH(acid);transfer(createMixture('water',90),acid,90);
 close(getPH(acid)-ph,1);
});

test('boiling consumes water while nonvolatile salt stays and atoms remain accounted for',()=>{
 const mix=createMixture('sodium_chloride',30);mix.temperature=99;
 const before=structuredClone(mix),salt=mix.amounts.sodium_chloride;
 const events=run(mix,20,{heating:1});
 assert.ok(events.some(e=>e.type==='boil'));assert.ok(volume(mix)<30);assert.ok(mix.temperature<=100.001);
 close(mix.amounts.sodium_chloride,salt);conserved(before,mix);
});

test('sealed gas creates a single pressure rupture, opening releases pressure',()=>{
 const mix=combine(['acetic_acid',10],['sodium_bicarbonate',12.5]);
 const before=structuredClone(mix),events=run(mix,10,{sealed:true,capacity:30});
 assert.equal(events.filter(e=>e.type==='explosion').length,1);assert.ok(mix.pressure>3);conserved(before,mix);
 stepChemistry(mix,.1,{sealed:false});assert.equal(mix.pressure,1);assert.deepEqual(mix.gasAmounts,{});conserved(before,mix);
});

test('nonvolatile dry residue remains visible and transferable',()=>{
 const mix=createMixture('sodium_chloride',2);mix.temperature=100;
 const before=structuredClone(mix);run(mix,20,{heating:1});
 assert.ok(!mix.amounts.water);assert.ok(volume(mix)>0);assert.equal(getPH(mix),null);
 conserved(before,mix);
 const destination=createMixture();transfer(mix,destination,volume(mix));
 close(destination.amounts.sodium_chloride,1);assert.ok(describe(destination).includes('↓'));
 const residueVolume=volume(destination);
 transfer(createMixture('iron',.3),destination,.3);
 close(volume(destination),residueVolume+.3);
});

test('heating copper hydroxide darkens it to oxide without losing atoms',()=>{
 const mix=createMixture('water',20);mix.amounts.copper_hydroxide=3;mix.temperature=90;
 const before=structuredClone(mix),events=run(mix,40,{heating:.4});
 assert.ok(mix.amounts.copper_oxide>2.9);assert.ok(events.some(e=>e.reactionId==='copper_hydroxide_heat'));conserved(before,mix);
});

test('empty mixtures and invalid dt are safe',()=>{
 const m=createMixture();assert.equal(volume(m),0);assert.equal(getPH(m),null);assert.equal(describe(m),'Пустой сосуд');
 assert.deepEqual(stepChemistry(m,NaN),[]);assert.equal(transfer(m,createMixture(),5),0);assert.ok(/^#[0-9a-f]{6}$/i.test(color(m)));
});

test('every non-stock species is reachable from cabinet feedstocks and supported phase changes',()=>{
 const known=new Set(Object.values(SUBSTANCES).filter(s=>s.stock).map(s=>s.id));
 const paths=new Map([...known].map(id=>[id,'stock']));
 let changed=true;
 while(changed){
  changed=false;
  if(known.has('water')&&!known.has('steam')){known.add('steam');paths.set('steam','boiling');changed=true;}
  for(const r of REACTIONS){
   const needed=[...Object.keys(r.reactants),...(r.catalysts||[])];
   if(r.aqueous)needed.push('water');
   if(needed.every(id=>known.has(id)))for(const id of Object.keys(r.products))if(!known.has(id)){known.add(id);paths.set(id,r.id);changed=true;}
  }
 }
 assert.deepEqual(Object.keys(SUBSTANCES).filter(id=>!known.has(id)),[],'unreachable products');
 assert.ok(Object.values(SUBSTANCES).filter(s=>!s.stock).length>30);
 assert.equal(paths.get('zinc_oxide'),'zinc_hydroxide_heat');
 assert.ok(paths.get('calcium_phosphate').includes('phosphate'));
});

test('every declared reaction can actually trigger under its documented game conditions',()=>{
 for(const r of REACTIONS){
  const mix=r.dry?createMixture():createMixture('water',20);
  for(const [id,n]of Object.entries(r.reactants))mix.amounts[id]=(mix.amounts[id]||0)+n;
  for(const id of r.catalysts||[])mix.amounts[id]=.1;
  mix.temperature=r.minTemp?r.minTemp+30:22;
  const before=structuredClone(mix),events=stepChemistry(mix,.1,{heating:r.minTemp?1:0});
  assert.ok(events.some(e=>e.reactionId===r.id),r.id+' did not trigger');
  conserved(before,mix);
 }
});

test('all encyclopedia entries have meaningful metadata and obtainable-product routes',()=>{
 for(const s of Object.values(SUBSTANCES)){
  assert.ok(s.description.length>50,s.id+' description');
  assert.ok(s.details.length>=3&&s.details.every(x=>x.length>20),s.id+' details');
  assert.ok(s.uses.length&&s.uses.every(x=>x.length>5),s.id+' uses');
  assert.ok(s.properties.state&&s.properties.molarMass>0,s.id+' properties');
  assert.ok(s.sourcing.length>20,s.id+' sourcing');
  assert.ok(['base','special','derived','gas'].includes(s.originCategory),s.id+' category');
  if(!s.stock&&s.id!=='steam')assert.ok(s.synthesis.length,s.id+' synthesis');
 }
 assert.ok(MODEL_NOTES.includes('64'));assert.ok(MODEL_NOTES.includes(String(REACTIONS.length)));
 for(const id of ['water','iron','naoh','sodium_bicarbonate','acetic_acid'])assert.equal(SUBSTANCES[id].stock,true,id+' starter compatibility');
});

test('identity uses current products and keeps excess reagents as an explicit mixture',()=>{
 const salt=combine(['hcl',10],['naoh',10]);run(salt);
 assert.deepEqual(identifyMixture(salt).ids,['sodium_chloride']);assert.equal(identifyMixture(salt).status,'single');
 const excess=combine(['hcl',20],['naoh',10]);run(excess);
 const identity=identifyMixture(excess);
 assert.equal(identity.status,'mixture');assert.ok(identity.ids.includes('hcl'));assert.ok(identity.ids.includes('sodium_chloride'));assert.ok(identity.formula.includes(' + '));
 assert.equal(identifyMixture(createMixture()).status,'empty');assert.equal(identifyMixture(createMixture('water',10)).name,'Дистиллированная вода');
 salt.amounts.hcl=1e-10;assert.equal(identifyMixture(salt).status,'single');
 const gasOnly=createMixture();gasOnly.gasAmounts={oxygen:1};assert.deepEqual(identifyMixture(gasOnly).ids,['oxygen']);
});

test('phosphate progression makes three different salts with the correct amount of base',()=>{
 const ids=['sodium_dihydrogen_phosphate','disodium_hydrogen_phosphate','trisodium_phosphate'];
 for(let stage=1;stage<=3;stage++){
  const mix=combine(['phosphoric_acid',20],['naoh',8*stage]),before=structuredClone(mix);
  run(mix,45);close(mix.amounts[ids[stage-1]],4,.001);conserved(before,mix);
  assert.equal(identifyMixture(mix).status,'single');
  if(stage===1)assert.ok(getPH(mix)<7);else assert.ok(getPH(mix)>7);
 }
});

test('a multi-step phosphate discovery path works with the full inherited mixture',()=>{
 const phosphate=combine(['phosphoric_acid',20],['naoh',24]);run(phosphate,45);
 // Derive CaCl2 from a cabinet mineral rather than spawning the derived salt.
 const calcium=combine(['calcium_carbonate',.2214],['hcl',24]);run(calcium,80);
 transfer(calcium,phosphate,volume(calcium));const before=structuredClone(phosphate);run(phosphate,30);
 assert.ok(phosphate.amounts.calcium_phosphate>1.99);assert.ok(phosphate.amounts.sodium_chloride>11.9);conserved(before,phosphate);
 assert.equal(identifyMixture(phosphate).status,'mixture');
});

test('catalyst remains while peroxide becomes oxygen and water',()=>{
 const uncatalyzed=createMixture('hydrogen_peroxide',20);run(uncatalyzed,10);assert.ok(!uncatalyzed.escaped.oxygen);
 const mixture=createMixture('hydrogen_peroxide',20);mixture.amounts.manganese_dioxide=.5;
 const before=structuredClone(mixture);run(mixture,50);
 close(mixture.amounts.manganese_dioxide,.5);close(mixture.escaped.oxygen,3,.001);conserved(before,mixture);
});

test('lime hydration consumes water and warms the mixture',()=>{
 const mixture=createMixture('water',20);mixture.amounts.calcium_oxide=2;
 const before=structuredClone(mixture);run(mixture,5);
 assert.ok(mixture.amounts.calcium_hydroxide>1.8);assert.ok(mixture.temperature>22);conserved(before,mixture);
 assert.ok(getPH(mixture)>12);
});

test('dry hydroxide can reach its oxide after sustained heating',()=>{
 const mixture=createMixture();mixture.amounts.magnesium_hydroxide=2;
 const before=structuredClone(mixture);const events=run(mixture,35,{heating:1});
 assert.ok(mixture.amounts.magnesium_oxide>1.9);assert.ok(events.some(e=>e.reactionId==='magnesium_hydroxide_heat'));conserved(before,mixture);
});

test('tutorial acetate and bicarbonate share one pH balance and omit negligible acid from the short identity',()=>{
 const mixture=combine(['sodium_bicarbonate',45],['acetic_acid',30]);run(mixture,35);
 assert.ok(mixture.amounts.sodium_acetate>14.99);assert.ok(mixture.amounts.sodium_bicarbonate>2.99);
 mixture.amounts.acetic_acid=1e-5;
 const ph=getPH(mixture),identity=identifyMixture(mixture);
 assert.ok(ph>8&&ph<9.2,`unexpected mixed-buffer pH ${ph}`);
 assert.equal(identity.status,'mixture');assert.ok(identity.ids.includes('sodium_acetate'));assert.ok(identity.ids.includes('sodium_bicarbonate'));
 assert.ok(!identity.ids.includes('acetic_acid'));assert.ok(identity.traceIds.includes('acetic_acid'));
 assert.equal(mixture.amounts.acetic_acid,1e-5,'identification must never delete trace amounts');
 mixture.amounts.acetic_acid=.1;
 assert.ok(identifyMixture(mixture).ids.includes('acetic_acid'),'meaningful excess must remain in identity');
});

test('colourless liquids do not acquire decorative acid/base/salt colours',()=>{
 const water=appearance(createMixture('water',20));
 for(const id of ['hcl','naoh','sodium_chloride','sodium_acetate','acetic_acid','magnesium_sulfate','glucose','hydrogen_peroxide']){
  const look=appearance(createMixture(id,20));
  assert.equal(look.liquidColor,water.liquidColor,id);close(look.liquidOpacity,.1);assert.ok(look.hasLiquid);assert.equal(look.solidFraction,0);
 }
});

test('dissolved copper and iron have distinct colours and dilution weakens opacity',()=>{
 const copper=createMixture('cuso4',10),before=appearance(copper);
 const iron2=appearance(createMixture('iron_sulfate',20)),iron3=appearance(createMixture('iron3_chloride',20));
 assert.equal(new Set([before.liquidColor,iron2.liquidColor,iron3.liquidColor]).size,3);
 transfer(createMixture('water',90),copper,90);
 assert.ok(appearance(copper).liquidOpacity<before.liquidOpacity);
 assert.equal(appearance(copper).liquidColor,before.liquidColor);
});

test('white and blue precipitates are separate from the clear supernatant',()=>{
 for(const id of ['calcium_carbonate','copper_hydroxide']) {
  const mix=createMixture('water',20);mix.amounts[id]=4;
  const look=appearance(mix);
  assert.equal(look.liquidColor,appearance(createMixture('water',20)).liquidColor);
  close(look.liquidOpacity,.1);assert.ok(look.solidFraction>0&&look.solidFraction<.1);
  assert.equal(look.solidColor,SUBSTANCES[id].color.toLowerCase());
 }
 const dry=appearance(createMixture('copper_oxide',1));assert.equal(dry.hasLiquid,false);assert.equal(dry.solidFraction,1);
});

test('indicator transition and amount affect appearance without colouring the solid phase',()=>{
 const indicator=createMixture('phenolphthalein',1);assert.equal(appearance(indicator).liquidOpacity,.1);
 const base=combine(['naoh',20],['phenolphthalein',1]);assert.equal(appearance(base).liquidColor,'#eb55ac');
 const saturated=appearance(base).liquidOpacity;base.amounts.phenolphthalein*=.001;assert.ok(appearance(base).liquidOpacity<saturated);
 const acidic=combine(['hcl',20],['bromothymol_blue',1]),alkaline=combine(['naoh',20],['bromothymol_blue',1]);
 assert.equal(appearance(acidic).liquidColor,'#e1c94c');assert.equal(appearance(alkaline).liquidColor,'#458ed1');
});

test('all catalogue substances create actual samples, including non-stock gases',()=>{
 for(const s of Object.values(SUBSTANCES)) {
  const mix=createMixture(s.id,s.state==='solid'?1:80);
  assert.ok((mix.amounts[s.id]||mix.gasAmounts[s.id])>0,s.id);
  assert.ok(identifyMixture(mix).ids.includes(s.id),s.id);
 }
});

test('gas samples use ideal gas amounts, expand into headspace, and escape when opened',()=>{
 for(const id of ['hydrogen','oxygen','carbon_dioxide']) {
  const mix=createMixture(id,80),before=structuredClone(mix);
  close(mix.gasAmounts[id],80/(.082057*295.15));
  stepChemistry(mix,.1,{sealed:true,capacity:150});close(mix.pressure,80/150);
  assert.equal(volume(mix),0);assert.equal(appearance(mix).hasLiquid,false);
  stepChemistry(mix,.1,{sealed:false});assert.equal(mix.pressure,1);assert.equal(identifyMixture(mix).status,'empty');conserved(before,mix);
 }
});

test('hot steam condenses on cooling and conserves all water molecules',()=>{
 const mix=createMixture('steam',80),before=structuredClone(mix);
 assert.equal(mix.temperature,100);assert.ok(mix.gasAmounts.steam>0);assert.ok(!mix.amounts.water);
 run(mix,120,{sealed:true,capacity:150});
 assert.ok(mix.amounts.water>2);assert.ok(mix.gasAmounts.steam<.3);assert.ok(mix.temperature<23);
 assert.ok(mix.pressure>.02&&mix.pressure<.04);conserved(before,mix);
});

test('acid excess suppresses hydroxide precipitation instead of precipitating and redissolving every frame',()=>{
 const mix=combine(['cuso4',20],['hcl',40],['naoh',10]),before=structuredClone(mix);
 const events=run(mix,30);
 assert.ok(!events.some(e=>e.reactionId==='copper_precipitate'));
 assert.ok(!mix.amounts.copper_hydroxide);close(mix.amounts.cuso4,4);conserved(before,mix);
});

test('every aqueous reaction is disabled in a dry sample',()=>{
 for(const r of REACTIONS.filter(r=>r.aqueous)) {
  const mix=createMixture();mix.amounts={...r.reactants};delete mix.amounts.water;
  for(const id of r.catalysts||[])mix.amounts[id]=1;
  mix.temperature=r.minTemp? r.minTemp+5:22;
  const events=stepChemistry(mix,.1);
  assert.ok(!events.some(e=>e.reactionId===r.id),r.id);
 }
});

test('reference thermal effects distinguish warming metal displacement from endothermic bicarbonate acid reaction',()=>{
 const displacement=createMixture('cuso4',20);displacement.amounts.zinc=4;
 run(displacement,3);assert.ok(displacement.temperature>25);
 const bicarbonate=combine(['sodium_bicarbonate',20],['hcl',16]);
 run(bicarbonate,1);assert.ok(bicarbonate.temperature<22&&bicarbonate.temperature>20);
});
