import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICAL_LESSONS as LESSONS } from '../dist/practicalcourse.js';
import { CourseProgress } from '../dist/progression.js';
import { World } from '../dist/physics.js';
import { volume, transfer } from '../dist/chemistry.js';
import { supplyAllowed, lessonSetupProblem, createLessonSetup, observeLessonSetup } from '../dist/lessonlab.js';

const NOTE = 'Условия опыта проверены, изменения состава сопоставлены с наблюдением.';
const practiceEvent = lesson => ({ type: lesson.practice.goal.type, id: lesson.practice.goal.id,
  substance: lesson.practice.goal.substance, volume: lesson.practice.goal.minVolume || 10,
  temperature: lesson.practice.goal.minTemperature || 70 });

function completeCurrent(course) {
  const lesson = course.lesson();
  course.markRead();
  lesson.questions.forEach((q, i) => course.answer(i, q.correct));
  if (lesson.practice.type === 'lab') course.recordPractice(practiceEvent(lesson));
  else course.submitPractice(lesson.practice.type === 'calculation' ? lesson.practice.answer : lesson.practice.correct);
  course.setNote(NOTE);
  assert.equal(course.complete().ok, true, `Cannot complete prerequisite ${lesson.id}`);
}

function beforeLesson(target, read = true) {
  const course = new CourseProgress();
  while (course.nextLesson?.id !== target.id) {
    assert.ok(course.nextLesson, `Unknown lesson ${target.id}`);
    course.select(course.nextLesson.id);
    completeCurrent(course);
  }
  course.select(target.id);
  if (read) course.markRead();
  return course;
}

test('learning gates supplies while free exposes every substance and device', () => {
  const course = new CourseProgress();
  for (const mode of ['learning', 'free']) {
    course.setMode(mode);
    assert.equal(supplyAllowed({ kind: 'bottle', substance: 'water' }, course), true);
    assert.equal(supplyAllowed({ kind: 'bottle', substance: 'hcl' }, course), mode === 'free');
    assert.equal(supplyAllowed({ kind: 'bottle', substance: 'steam' }, course), mode === 'free');
    assert.equal(supplyAllowed({ kind: 'bottle', substance: 'copper_hydroxide' }, course), mode === 'free');
    assert.equal(supplyAllowed({ kind: 'hotplate' }, course), mode === 'free');
    assert.equal(supplyAllowed({ kind: 'beaker', mixture: { amounts: { sodium_acetate: 1 } } }, course), true);
    assert.equal(supplyAllowed({ kind: 'beaker', substance: 'invented' }, course), false);
  }
});

test('each laboratory setup has its kit available before completing its lesson', () => {
  const course = new CourseProgress();
  for (const lesson of LESSONS) {
    course.select(lesson.id);
    if (lesson.practice.type === 'lab') {
      assert.match(lessonSetupProblem(lesson, course), /начните опыт/, lesson.id);
      course.markRead();
      assert.equal(lessonSetupProblem(lesson, course), null, `${lesson.id} needs an unavailable resource`);
      const world = new World();
      const attempt = createLessonSetup(world, lesson, course);
      assert.deepEqual(new Set(attempt.createdIds), new Set(world.bodies.map(b => b.id)), 'Cleanup tracks all and only the generated apparatus');
      assert.equal(attempt.receiver.kind, lesson.practice.setup.receiver.kind);
      assert.ok(volume(attempt.receiver.mixture) <= attempt.receiver.capacity + .001, lesson.id);
      assert.equal(attempt.receiver.broken, false);
      if (attempt.donor) assert.equal(world.held, attempt.donor);
      if (attempt.heater) assert.equal(attempt.heater.lit, false, 'The learner must turn on the heater');
      for (let n = 0; n < 20; n++) world.step(.05);
      assert.equal(attempt.receiver.broken, false, `${lesson.id} setup breaks before interaction`);
    }
    completeCurrent(course);
  }
});

test('free mode and unread or inaccessible lessons cannot spawn training setups', () => {
  const course = new CourseProgress(), lesson = LESSONS.find(l => l.practice.type === 'lab');
  assert.ok(lessonSetupProblem(lesson, course));
  assert.throws(() => createLessonSetup(new World(), lesson, course));
  course.markRead();
  course.setMode('free');
  assert.match(lessonSetupProblem(lesson, course), /режиме обучения/);
  assert.throws(() => createLessonSetup(new World(), lesson, course));
  course.setMode('learning');
  const later = LESSONS.find(l => l.practice.type === 'lab' && l.id !== lesson.id);
  assert.ok(lessonSetupProblem(later, course));
});

test('the introductory pouring setup completes through actual falling drops', () => {
  const lesson = LESSONS.find(l => l.practice.type === 'lab' && l.practice.goal.type === 'pour');
  const course = beforeLesson(lesson), world = new World();
  const attempt = createLessonSetup(world, lesson, course);
  attempt.donor.angle = Math.PI / 2;
  for (let i = 0; i < 240 && !course.status().practice; i++) {
    world.step(1 / 60);
    for (const event of observeLessonSetup(world, attempt)) course.recordPractice(event);
  }
  assert.equal(course.status().practice, true);
  assert.ok(volume(attempt.receiver.mixture) >= lesson.practice.goal.minVolume);
  assert.ok(attempt.receiver.receivedFrom[attempt.donor.id] >= lesson.practice.goal.minVolume);
});

test('a different source bottle and a spill cannot satisfy the tracked pouring task', () => {
  const lesson = LESSONS.find(l => l.practice.type === 'lab' && l.practice.goal.type === 'pour');
  const course = beforeLesson(lesson), world = new World();
  const attempt = createLessonSetup(world, lesson, course);
  const oldX = attempt.donor.x, oldY = attempt.donor.y;
  world.remove(attempt.donor);
  const other = world.create('bottle', oldX, oldY, { substance: lesson.practice.setup.donor.substance, volume: 30 });
  world.grab(other); other.angle = Math.PI / 2;
  for (let i = 0; i < 180; i++) {
    world.step(1 / 60);
    for (const event of observeLessonSetup(world, attempt)) course.recordPractice(event);
  }
  assert.ok(volume(attempt.receiver.mixture) > 8, 'Other-source liquid really reached the receiver');
  assert.equal(course.status().practice, false);
  assert.equal(observeLessonSetup(world, attempt).some(e => e.type === 'pour'), false);

  const secondCourse = beforeLesson(lesson), secondWorld = new World();
  const spillAttempt = createLessonSetup(secondWorld, lesson, secondCourse);
  secondWorld.move(200, 320); spillAttempt.donor.angle = Math.PI / 2;
  for (let i = 0; i < 180; i++) {
    secondWorld.step(1 / 60);
    for (const event of observeLessonSetup(secondWorld, spillAttempt)) secondCourse.recordPractice(event);
  }
  assert.ok(secondWorld.puddles.length > 0);
  assert.equal(secondCourse.status().practice, false);
});

test('reloading mid-pour preserves body ids, accepted amounts, and in-flight delivery', () => {
  const lesson = LESSONS.find(l => l.practice.type === 'lab' && l.practice.goal.type === 'pour');
  const course = beforeLesson(lesson), world = new World();
  // Leave a hole in the id sequence: restoring by array index must not identify the wrong bottle.
  world.remove(world.create('tube', 200, 440));
  const attempt = createLessonSetup(world, lesson, course);
  attempt.donor.angle = Math.PI / 2;
  const partial = Math.min(2, lesson.practice.goal.minVolume / 3);
  for (let i = 0; i < 500 && (attempt.receiver.receivedFrom?.[attempt.donor.id] || 0) < partial; i++) world.step(1 / 120);
  const accepted = attempt.receiver.receivedFrom[attempt.donor.id];
  assert.ok(accepted > 0 && accepted < lesson.practice.goal.minVolume);
  assert.ok(world.particles.some(p => p.mixture), 'Save occurs with real drops still falling');
  const data = JSON.parse(JSON.stringify({ world: world.serialize(), course: course.serialize(),
    attempt: { lessonId: attempt.lessonId, receiverId: attempt.receiver.id, donorId: attempt.donor.id,
      donorSubstance: attempt.donorSubstance, initialVolume: attempt.initialVolume, startTime: attempt.startTime } }));
  const resumedWorld = new World(), resumedCourse = new CourseProgress(data.course);
  resumedWorld.restore(data.world);
  const resumedAttempt = { ...data.attempt,
    receiver: resumedWorld.bodies.find(b => b.id === data.attempt.receiverId),
    donor: resumedWorld.bodies.find(b => b.id === data.attempt.donorId) };
  assert.ok(resumedAttempt.receiver && resumedAttempt.donor);
  assert.equal(resumedAttempt.receiver.receivedFrom[resumedAttempt.donor.id], accepted);
  resumedWorld.grab(resumedAttempt.donor);
  for (let i = 0; i < 240 && !resumedCourse.status().practice; i++) {
    resumedWorld.step(1 / 60);
    for (const event of observeLessonSetup(resumedWorld, resumedAttempt)) resumedCourse.recordPractice(event);
  }
  assert.equal(resumedCourse.status().practice, true, 'Drops in flight must reach the same receiver after loading');
  const newBottle = resumedWorld.create('bottle', 200, 440);
  assert.ok(newBottle.id > Math.max(resumedAttempt.receiver.id, resumedAttempt.donor.id));
  assert.equal(resumedAttempt.receiver.receivedFrom[newBottle.id], undefined, 'New supplies must not inherit old source credit');
});

test('all authored lab goals can actually be observed with their prepared samples', () => {
  for (const lesson of LESSONS.filter(l => l.practice.type === 'lab')) {
    const course = beforeLesson(lesson);
    let attempt;
    const eventNames = new Set();
    const world = new World(event => {
      if (event.body !== attempt?.receiver) return;
      eventNames.add(event.reactionId || event.type);
      if (event.reactionId) course.recordPractice({ type: 'reaction', id: event.reactionId });
      if (event.type === 'boil') course.recordPractice({ type: 'boil' });
    });
    attempt = createLessonSetup(world, lesson, course);
    const goal = lesson.practice.goal;
    if (goal.type === 'inspect') world.grab(attempt.receiver);
    else if (goal.type === 'pour') attempt.donor.angle = Math.PI / 2;
    else if (attempt.donor) {
      // Chemistry coverage is separate from the dedicated physical-pouring assertions.
      const room = attempt.receiver.capacity - volume(attempt.receiver.mixture);
      transfer(attempt.donor.mixture, attempt.receiver.mixture, Math.min(room, volume(attempt.donor.mixture)));
    }
    if (attempt.heater) attempt.heater.lit = true;
    for (let i = 0; i < 2400 && !course.status().practice; i++) {
      world.step(.05);
      for (const event of observeLessonSetup(world, attempt)) course.recordPractice(event);
    }
    assert.equal(course.status().practice, true,
      `${lesson.id}: goal ${JSON.stringify(goal)} failed; events=${[...eventNames].join(',')}; temperature=${attempt.receiver.mixture.temperature}; contents=${JSON.stringify(attempt.receiver.mixture.amounts)}`);
  }
});
