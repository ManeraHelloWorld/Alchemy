import test from 'node:test';
import assert from 'node:assert/strict';
import { World, EQUIPMENT, mouthPosition } from '../dist/physics.js';
import { volume, createMixture, transfer, identifyProduct } from '../dist/chemistry.js';

function tick(world, seconds) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 120) world.step(1 / 120);
}

function totalWater(world) {
  return [...world.bodies.map(b => b.mixture), ...world.particles.filter(p => p.mixture).map(p => p.mixture), ...world.puddles.map(p => p.mixture)]
    .reduce((sum, mix) => sum + (mix.amounts.water || 0), 0);
}

test('a released vessel falls to the table without sinking', () => {
  const world = new World();
  const body = world.create('beaker', 300, 360);
  world.pick(body.x, body.y);
  world.move(400, 300);
  assert.equal(world.held, body);
  world.release();
  tick(world, 2);
  assert.equal(world.held, null);
  assert.equal(body.broken, false);
  assert.ok(Math.abs(body.y + body.h / 2 - 490) < .5);
  assert.ok(Number.isFinite(body.angle));
});

test('rotating a held bottle keeps the neck geometry consistent', () => {
  const world = new World();
  const body = world.create('bottle', 400, 250);
  world.pick(400, 250);
  for (let i = 0; i < 4; i++) world.rotate(Math.PI / 8);
  const mouth = mouthPosition(body);
  assert.ok(Math.abs(mouth.x - 450) < .01);
  assert.ok(Math.abs(mouth.y - 250) < .01);
});

test('a tilted bottle pours into an open beaker and conserves water', () => {
  const world = new World();
  const target = world.create('beaker', 500, 449);
  const source = world.create('bottle', 432, 330, { substance: 'water', volume: 60 });
  world.pick(source.x, source.y);
  source.angle = Math.PI / 2;
  const initial = totalWater(world);
  tick(world, 2.5);
  assert.ok(volume(target.mixture) > 20, `Target received only ${volume(target.mixture)}`);
  assert.ok(volume(source.mixture) < 40);
  assert.ok(Math.abs(totalWater(world) - initial) < 1e-5);
});

test('closed bottles do not pour and spills preserve water', () => {
  const world = new World();
  const source = world.create('bottle', 400, 300, { substance: 'water', volume: 40, sealed: true });
  world.pick(source.x, source.y);
  source.angle = Math.PI / 2;
  const initial = totalWater(world);
  tick(world, 1);
  assert.equal(world.puddles.length, 0);
  assert.ok(volume(source.mixture) > 39.9);
  source.sealed = false;
  tick(world, 3);
  assert.ok(world.puddles.length > 0);
  assert.ok(Math.abs(totalWater(world) - initial) < 1e-5);
});

test('overfilled receiver spills excess instead of deleting it', () => {
  const world = new World();
  const target = world.create('tube', 500, 440, { substance: 'water', volume: 39 });
  const source = world.create('bottle', 432, 300, { substance: 'water', volume: 40 });
  world.pick(source.x, source.y);
  source.angle = Math.PI / 2;
  const initial = totalWater(world);
  tick(world, 3);
  assert.ok(volume(target.mixture) <= target.capacity + .001);
  assert.ok(Math.abs(totalWater(world) - initial) < 1e-5);
});

test('stand holds a beaker above the lit burner and heat reaches it', () => {
  const world = new World();
  world.create('stand', 600, 425);
  const burner = world.create('burner', 600, 458);
  burner.lit = true;
  const beaker = world.create('beaker', 600, 350, { substance: 'water', volume: 30 });
  const initial = beaker.mixture.temperature;
  tick(world, 3);
  assert.ok(Math.abs(beaker.y + beaker.h / 2 - 397) < 2);
  assert.ok(beaker.heat > .5);
  assert.ok(beaker.mixture.temperature > initial);
});

test('stand geometry does not intercept grabbing a vessel through its empty frame', () => {
  const world = new World();
  const beaker = world.create('beaker', 600, 356);
  world.create('stand', 600, 425);
  assert.equal(world.pick(600, 356), beaker);
});

test('directly deployed stands can be grabbed despite their empty center', () => {
  const world = new World();
  const stand = world.create('stand', 600, 350);
  assert.equal(world.grab(stand), stand);
  world.move(720, 380);
  assert.equal(stand.x, 720);
  assert.equal(stand.y, 380);
  assert.equal(world.held, stand);
  world.release();
  tick(world, 2);
  assert.equal(stand.y, 425);
});

test('a sealed heated vessel ruptures once and emits steam and physical liquid fragments', () => {
  const events = [];
  const world = new World(event => events.push(event));
  world.create('stand', 600, 425);
  const burner = world.create('burner', 600, 458);
  burner.lit = true;
  const vessel = world.create('beaker', 600, 356, { substance: 'water', volume: 50, sealed: true });
  for (let i = 0; i < 600 && !vessel.broken; i++) world.step(.05);
  assert.equal(vessel.broken, true);
  assert.equal(events.filter(e => e.type === 'explosion').length, 1);
  assert.ok(world.particles.some(p => p.type === 'steam'));
  assert.ok(world.particles.some(p => p.type === 'drop' && p.mixture));
  assert.ok(world.shake > 0);
  assert.ok(world.flash > 0);
  tick(world, 1);
  assert.equal(events.filter(e => e.type === 'explosion').length, 1);
});

test('a hard impact breaks glass and keeps its liquid in droplets or puddles', () => {
  const world = new World();
  const body = world.create('beaker', 500, 150, { substance: 'water', volume: 20 });
  const initial = totalWater(world);
  tick(world, 3);
  assert.equal(body.broken, true);
  assert.ok(world.puddles.length > 0);
  assert.ok(Math.abs(totalWater(world) - initial) < 1e-5);
});

test('save/restore includes in-flight drops and turns burners off', () => {
  const world = new World();
  const body = world.create('bottle', 400, 300, { substance: 'water', volume: 40 });
  world.pick(body.x, body.y);
  body.angle = Math.PI / 2;
  world.step(.05);
  const initial = totalWater(world);
  const burner = world.create('burner', 700, 458);
  burner.lit = true;
  const restored = new World();
  assert.equal(restored.restore(JSON.parse(JSON.stringify(world.serialize()))), true);
  assert.ok(Math.abs(totalWater(restored) - initial) < 1e-5);
  assert.equal(restored.bodies.find(b => b.kind === 'burner').lit, false);
  assert.equal(restored.held, null);
});

test('restored liquid drops retain trajectory, source id, and chemical amount', () => {
  const world = new World();
  const source = world.create('bottle', 400, 300, { substance: 'water', volume: 10 });
  world.grab(source); source.angle = Math.PI / 2;
  world.step(.05);
  const snapshot = JSON.parse(JSON.stringify(world.serialize()));
  assert.ok(snapshot.drops.length > 0);
  const restored = new World(); restored.restore(snapshot);
  assert.equal(restored.particles.filter(p => p.mixture).length, snapshot.drops.length);
  const drop = restored.particles.find(p => p.mixture), saved = snapshot.drops[0];
  for (const key of ['x', 'y', 'vx', 'vy', 'sourceId', 'life']) assert.equal(drop[key], saved[key], key);
  assert.equal(restored.puddles.length, 0);
  assert.ok(Math.abs(totalWater(restored) - totalWater(world)) < 1e-5);
});

test('legacy and malformed drop trajectories safely become conserved spills', () => {
  const world = new World();
  const source = world.create('bottle', 400, 300, { substance: 'water', volume: 10 });
  world.grab(source); source.angle = Math.PI / 2;
  world.step(.05);
  const snapshot = JSON.parse(JSON.stringify(world.serialize()));
  const drop = snapshot.drops[0];
  snapshot.drops = [{ x: drop.x, mixture: drop.mixture },
    { ...drop, x: 450, vx: 'not-a-velocity' }];
  const expected = snapshot.bodies.reduce((sum, body) => sum + (body.mixture.amounts.water || 0), 0)
    + snapshot.drops.reduce((sum, p) => sum + (p.mixture.amounts.water || 0), 0);
  const restored = new World(); restored.restore(snapshot);
  assert.equal(restored.particles.some(p => p.mixture), false);
  assert.ok(restored.puddles.length > 0);
  assert.ok(Math.abs(totalWater(restored) - expected) < 1e-5);
});

test('paused simulation does not move vessels or change time', () => {
  const world = new World();
  const body = world.create('beaker', 400, 300);
  world.paused = true;
  world.step(1 / 60);
  assert.equal(body.y, 300);
  assert.equal(world.time, 0);
});

test('pipette meters separate drops at two milliliters per second', () => {
  const world = new World();
  const dropper = world.create('dropper', 400, 250, { substance: 'water', volume: 10 });
  world.grab(dropper);
  dropper.angle = Math.PI / 2;
  const initial = totalWater(world);
  for (let i = 0; i < 120; i++) world.step(1 / 120);
  const dispensed = 10 - volume(dropper.mixture);
  assert.ok(Math.abs(dispensed - 2) < .02, `Dispensed ${dispensed}ml`);
  assert.ok(Math.abs(totalWater(world) - initial) < 1e-5);
  const comparison = new World();
  const bottle = comparison.create('bottle', 400, 250, { substance: 'water', volume: 10 });
  comparison.grab(bottle);
  bottle.angle = Math.PI / 2;
  for (let i = 0; i < 120; i++) comparison.step(1 / 120);
  assert.ok(10 - volume(bottle.mixture) > dispensed * 3);
});

test('electric hotplate supports and heats a vessel at its surface', () => {
  const world = new World();
  const plate = world.create('hotplate', 600, 470);
  const beaker = world.create('beaker', 600, 409, { substance: 'water', volume: 50 });
  plate.lit = true;
  tick(world, 3);
  assert.ok(Math.abs(beaker.y + beaker.h / 2 - 450) < 1);
  assert.ok(beaker.heat > .9);
  assert.ok(beaker.mixture.temperature > 35);
  plate.lit = false;
  world.step(.05);
  assert.equal(beaker.heat, 0);
});

test('thermometer senses the submerged bulb and cools after withdrawal', () => {
  const world = new World();
  const beaker = world.create('beaker', 600, 449, { substance: 'water', volume: 100 });
  beaker.mixture.temperature = 65;
  const thermometer = world.create('thermometer', 600, 423);
  world.grab(thermometer);
  tick(world, 2.5);
  assert.ok(thermometer.reading > 60);
  assert.equal(thermometer.readingSource, beaker.label);
  assert.equal(beaker.x, 600, 'Inserting the bulb must not push the entire beaker');
  world.move(800, 300);
  tick(world, 2.5);
  assert.ok(thermometer.reading < 25);
  assert.equal(thermometer.readingSource, null);
});

test('ceramic vessels survive falls, settle, and remain open', () => {
  const world = new World();
  const crucible = world.create('crucible', 500, 150, { substance: 'water', volume: 20, sealed: true });
  tick(world, 3);
  assert.equal(crucible.broken, false);
  assert.equal(crucible.canSeal, false);
  assert.equal(crucible.sealed, false);
  assert.ok(Math.abs(crucible.vy) < 1);
  assert.ok(Math.abs(crucible.y + crucible.h / 2 - 490) < .5);
});

test('the shallow evaporating dish spills at a smaller angle than a beaker', () => {
  const dishWorld = new World();
  const dish = dishWorld.create('evaporating_dish', 400, 300, { substance: 'water', volume: 60 });
  dishWorld.grab(dish); dish.angle = .4;
  const beakerWorld = new World();
  const beaker = beakerWorld.create('beaker', 400, 300, { substance: 'water', volume: 125 });
  beakerWorld.grab(beaker); beaker.angle = .4;
  tick(dishWorld, 1); tick(beakerWorld, 1);
  assert.ok(volume(dish.mixture) < 50);
  assert.ok(Math.abs(volume(beaker.mixture) - 125) < .01);
});

test('new equipment capacity and kind survive saving and restoring', () => {
  const world = new World();
  const kinds = ['graduated_cylinder', 'dropper', 'evaporating_dish', 'crucible', 'hotplate', 'thermometer'];
  for (let i = 0; i < kinds.length; i++) world.create(kinds[i], 140 + i * 180, 400, { substance: 'water', volume: 1000 });
  const restored = new World();
  restored.restore(JSON.parse(JSON.stringify(world.serialize())));
  for (const kind of kinds) {
    const body = restored.bodies.find(b => b.kind === kind);
    assert.ok(body, `Missing ${kind}`);
    assert.equal(body.capacity, EQUIPMENT.find(s => s.id === kind).capacity);
    assert.ok(volume(body.mixture) <= body.capacity + 1e-6);
  }
});

test('legacy reaction history still names the real product after a save round-trip', () => {
  const world = new World();
  const body = world.create('beaker', 600, 449, { substance: 'cuso4', volume: 20 });
  transfer(createMixture('naoh', 16), body.mixture, 16);
  tick(world, .5);
  assert.equal(identifyProduct(body.mixture)?.id, 'copper_hydroxide');
  delete body.mixture.formedProducts; // Older saves only stored reaction timestamps.
  assert.equal(identifyProduct(body.mixture)?.id, 'copper_hydroxide');
  const restored = new World();
  restored.restore(JSON.parse(JSON.stringify(world.serialize())));
  assert.equal(identifyProduct(restored.bodies[0].mixture)?.id, 'copper_hydroxide');
  assert.equal(Object.hasOwn(restored.bodies[0].mixture, 'formedProducts'), false);
});

test('an explicitly cleared product claim stays cleared after restoring a newer mixture', () => {
  const world = new World();
  const body = world.create('beaker', 600, 449, { substance: 'cuso4', volume: 20 });
  transfer(createMixture('naoh', 16), body.mixture, 16);
  tick(world, .5);
  assert.equal(identifyProduct(body.mixture)?.id, 'copper_hydroxide');
  // An unrelated solute creates a new mixture, so the old product headline no
  // longer describes the whole preparation even though its history remains.
  transfer(createMixture('glucose', 5), body.mixture, 5);
  assert.deepEqual(body.mixture.formedProducts, []);
  assert.equal(identifyProduct(body.mixture), null);
  const restored = new World();
  restored.restore(JSON.parse(JSON.stringify(world.serialize())));
  assert.deepEqual(restored.bodies[0].mixture.formedProducts, []);
  assert.equal(identifyProduct(restored.bodies[0].mixture), null);
});
