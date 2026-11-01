import test from 'node:test';
import assert from 'node:assert/strict';
import {createMixture,transfer,stepChemistry,identifyMixture,identifyProduct} from '../dist/chemistry.js';
import {World} from '../dist/physics.js';

const react=m=>{for(let i=0;i<400;i++)stepChemistry(m,.1);return m;};
function acetate(){const m=createMixture('acetic_acid',25);transfer(createMixture('sodium_bicarbonate',40),m,40);return react(m);}

test('successful reaction names acetate while retaining excess bicarbonate in composition',()=>{
 const m=acetate(),product=identifyProduct(m);
 assert.equal(product.id,'sodium_acetate');
 assert.equal(product.name,'Ацетат натрия');
 assert.equal(product.mixed,true);
 assert.ok(product.otherIds.includes('sodium_bicarbonate'));
 assert.equal(identifyMixture(m).status,'mixture');
});
test('physical mixing cannot invent a new compound title',()=>{
 const m=createMixture('water',10);transfer(createMixture('sodium_chloride',20),m,20);
 assert.equal(identifyProduct(m),null);
});
test('product provenance travels with poured material and survives a saved world',()=>{
 const world=new World(),b=world.create('beaker',500,449),m=acetate();
 transfer(m,b.mixture,12);
 assert.equal(identifyProduct(b.mixture).id,'sodium_acetate');
 const restored=new World();restored.restore(world.serialize());
 assert.equal(identifyProduct(restored.bodies[0].mixture).id,'sodium_acetate');
});
test('a consumed product can no longer name the contents',()=>{
 const m=acetate();delete m.amounts.sodium_acetate;
 assert.equal(identifyProduct(m),null);
});
test('v2 reaction history can identify a retained product without rewriting composition',()=>{
 const m=acetate();delete m.formedProducts;
 assert.equal(identifyProduct(m).id,'sodium_acetate');
});
test('precipitate is the headline product and counterions remain in full composition',()=>{
 const m=createMixture('cuso4',20);transfer(createMixture('naoh',25),m,25);react(m);
 assert.equal(identifyProduct(m).id,'copper_hydroxide');
 assert.ok(identifyMixture(m).ids.includes('sodium_sulfate'));
});

test('adding an unrelated solute invalidates an old product headline until a new reaction',()=>{
 const m=acetate();assert.equal(identifyProduct(m).id,'sodium_acetate');
 transfer(createMixture('sodium_chloride',10),m,10);
 assert.equal(identifyProduct(m),null);assert.equal(identifyMixture(m).status,'mixture');
 assert.ok(m.amounts.sodium_acetate>0,'historical product still remains in full composition');
 const world=new World(),body=world.create('beaker',500,449);body.mixture=m;
 const restored=new World();restored.restore(world.serialize());assert.equal(identifyProduct(restored.bodies[0].mixture),null);
 transfer(createMixture('hcl',30),m,30);react(m);
 assert.equal(identifyProduct(m).id,'sodium_chloride');
});

test('dilution and transfer of the same reacted mixture retain product provenance',()=>{
 const m=acetate();transfer(createMixture('water',20),m,20);
 assert.equal(identifyProduct(m).id,'sodium_acetate');
 const destination=createMixture('water',20);transfer(m,destination,5);transfer(m,destination,5);
 assert.equal(identifyProduct(destination).id,'sodium_acetate');
});

test('a catalogue product is a named material, not evidence of a performed reaction',()=>{
 const m=createMixture('sodium_acetate',20);
 assert.equal(identifyMixture(m).name,'Ацетат натрия');assert.equal(identifyProduct(m),null);
});

test('stock and identical portions retain a name, while dilution is a physical mixture',()=>{
 const stock=createMixture('sodium_chloride',20),cup=createMixture();
 assert.equal(identifyMixture(stock).name,'Хлорид натрия');
 transfer(stock,cup,5);transfer(stock,cup,5);
 assert.equal(identifyMixture(cup).status,'single');assert.equal(cup.physicallyMixed,false);
 transfer(createMixture('water',5),cup,5);
 assert.equal(identifyMixture(cup).name,'Смесь веществ');assert.equal(identifyMixture(cup).status,'mixture');
 assert.deepEqual(identifyMixture(cup).ids,['sodium_chloride'],'solvent must not alter the product-ID contract');
 assert.equal(identifyProduct(cup),null);assert.deepEqual(stepChemistry(cup,.1),[]);
 const reverse=createMixture('water',5);transfer(createMixture('sodium_chloride',5),reverse,5);
 assert.equal(identifyMixture(reverse).name,'Смесь веществ');
 const water=createMixture('water',10);transfer(createMixture('water',5),water,5);
 assert.equal(identifyMixture(water).status,'single');assert.equal(water.physicallyMixed,false);
});

test('physical-mixing label travels through parcels and world saves',()=>{
 const source=createMixture('sodium_chloride',10);transfer(createMixture('water',10),source,10);
 const parcel=createMixture();transfer(source,parcel,.2);
 const world=new World(),body=world.create('beaker',500,449);transfer(parcel,body.mixture,.2);
 assert.equal(identifyMixture(body.mixture).name,'Смесь веществ');
 const restored=new World();restored.restore(world.serialize());
 assert.equal(restored.bodies[0].mixture.physicallyMixed,true);
 assert.equal(identifyMixture(restored.bodies[0].mixture).name,'Смесь веществ');
});

test('actual product still takes priority after dilution, and a dry single residue is named',()=>{
 const neutral=createMixture('hcl',10);transfer(createMixture('naoh',10),neutral,10);react(neutral);
 assert.equal(identifyMixture(neutral).status,'single');
 transfer(createMixture('water',5),neutral,5);
 assert.equal(identifyMixture(neutral).name,'Смесь веществ');
 assert.equal(identifyProduct(neutral).name,'Хлорид натрия');assert.deepEqual(identifyProduct(neutral).otherIds,[]);
 const dry=createMixture('sodium_chloride',1);transfer(createMixture('water',1),dry,1);dry.temperature=100;
 for(let i=0;i<200;i++)stepChemistry(dry,.1,{heating:1});
 assert.ok(!dry.amounts.water);assert.equal(identifyMixture(dry).status,'single');assert.equal(identifyMixture(dry).name,'Хлорид натрия');
});
