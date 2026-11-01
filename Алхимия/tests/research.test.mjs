import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscoveryBook} from '../dist/discoveries.js';
import {normalizeStrokes} from '../dist/blackboard.js';
test('discoveries include emitted gases, deduplicate, and preserve first encounter',()=>{
 const book=new DiscoveryBook();
 assert.deepEqual(book.observe({amounts:{water:5,sodium_acetate:2},escaped:{carbon_dioxide:2}},{at:10,kind:'reaction',equation:'test'}),['water','sodium_acetate','carbon_dioxide']);
 assert.equal(book.record('water',{at:30}),false);assert.equal(book.records.water.at,10);assert.equal(book.record('unknown'),false);
 assert.equal(new DiscoveryBook(book.serialize()).count,3);
});
test('stock discovery later records an actual synthesis without unlocking twice',()=>{
 const book=new DiscoveryBook();book.record('water',{kind:'stock',at:1});book.record('water',{kind:'reaction',at:2,equation:'A → H₂O'});
 assert.equal(book.count,1);assert.equal(book.records.water.kind,'stock');assert.equal(book.records.water.synthesis.equation,'A → H₂O');
 assert.deepEqual(new DiscoveryBook(book.serialize()).records,book.records);
});
test('discovery restore discards unknown or malformed records',()=>{
 const book=new DiscoveryBook({unknown:{at:1},water:null,iron:{source:'old save',at:3}});assert.equal(book.count,1);
 assert.deepEqual(book.observe({amounts:{water:NaN,copper:-3}}),[]);
});
test('blackboard stroke serialization preserves edits and rejects corrupt coordinates',()=>{
 const result=normalizeStrokes([{tool:'chalk',color:'#eee9cf',width:4,points:[[10,20],[100,140]]},{tool:'eraser',width:12,points:[[22,30]]},{tool:'clear'},{tool:'script',points:[[2,3]]},{tool:'chalk',width:100,points:[[NaN,3],[-1,999]]}]);
 assert.equal(result.length,4);assert.deepEqual(result[0].points,[[10,20],[100,140]]);assert.equal(result[2].tool,'clear');assert.deepEqual(result[3].points,[[0,434]]);assert.equal(result[3].width,40);
 assert.deepEqual(normalizeStrokes(JSON.parse(JSON.stringify(result))),result);
});
test('dense blackboard notes retain newest strokes and stroke endpoints within save budget',()=>{
 const long=Array.from({length:10000},(_,i)=>[i/10,i%400]);
 const result=normalizeStrokes(Array.from({length:10},()=>({tool:'chalk',width:3,points:long})));
 assert.equal(result.length,10);assert.ok(result.reduce((n,s)=>n+s.points.length,0)<=40000);
 for(const stroke of result){assert.deepEqual(stroke.points[0],[0,0]);assert.deepEqual(stroke.points.at(-1),[999.9,399]);}
});
