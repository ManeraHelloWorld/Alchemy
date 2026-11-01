import test from 'node:test';
import assert from 'node:assert/strict';
import { CourseProgress } from '../dist/progression.js';
import { PRACTICAL_LESSONS as LESSONS } from '../dist/practicalcourse.js';
import { SUBSTANCES } from '../dist/chemistry.js';
import { EQUIPMENT } from '../dist/physics.js';

const eventFor = lesson => ({ ...lesson.practice.goal, volume: lesson.practice.goal.minVolume || 10, temperature: lesson.practice.goal.minTemperature || 70 });
function ready(course) { course.markRead(); assert.equal(course.recordPractice(eventFor(course.lesson())), true); }
function reach(course, target) {
  while (course.nextLesson.id !== target.id) { course.select(course.nextLesson.id); ready(course); assert.equal(course.complete().ok, true); }
  course.select(target.id);
}

test('learning starts with water and the first kit, only one accessible experiment', () => {
  const course = new CourseProgress();
  assert.equal(course.mode, 'learning'); assert.equal(course.chosenMode, false);
  assert.equal(course.lesson().id, 'lesson-v4-01');
  assert.deepEqual(course.availableSubstances(), ['water']);
  assert.deepEqual(new Set(course.availableEquipment()), new Set(['bottle', 'beaker', 'tube']));
  assert.equal(course.canAccess(LESSONS[1].id), false);
  assert.equal(course.select(LESSONS[1].id), false);
  assert.equal(course.hasSubstance('hcl'), false);
  assert.equal(course.hasEquipment('hotplate'), false);
});

test('free immediately exposes every catalog item including products and gases', () => {
  const course = new CourseProgress();
  course.setMode('free');
  assert.equal(course.chosenMode, true);
  assert.deepEqual(new Set(course.availableSubstances()), new Set(Object.keys(SUBSTANCES)));
  assert.deepEqual(new Set(course.availableEquipment()), new Set(['bottle', ...EQUIPMENT.map(e => e.id)]));
  for (const id of Object.keys(SUBSTANCES)) assert.equal(course.hasSubstance(id), true, id);
  assert.equal(course.hasSubstance('invented'), false);
  assert.equal(course.hasEquipment('invented'), false);
  assert.equal(course.markRead(), false);
  assert.equal(course.recordPractice(eventFor(course.lesson())), false);
  assert.equal(course.answer(0, 0).correct, false);
  assert.equal(course.submitPractice(1).correct, false);
  assert.equal(course.setNote('Опыт'), false);
  assert.equal(course.complete().ok, false);
  assert.deepEqual(course.records, {});
});

test('a real lab result is sufficient: no quiz, essay, or manual reading requirement', () => {
  const course = new CourseProgress();
  assert.equal(course.complete().ok, false);
  assert.equal(course.recordPractice(eventFor(course.lesson())), false, 'An unrelated bench action before preparation gives no credit');
  course.markRead();
  assert.equal(course.complete().ok, false, 'Starting an experiment alone is not completion');
  course.recordPractice(eventFor(course.lesson()));
  assert.equal(course.status().noteReady, false);
  assert.equal(course.status().totalQuestions, 0);
  assert.equal(course.status().ready, true);
  assert.equal(course.complete().ok, true);
  assert.equal(course.records[LESSONS[0].id].note, '');
});

test('completion exposes the next kit before the next experiment and rewards are unique', () => {
  const course = new CourseProgress();
  ready(course); const result = course.complete();
  assert.equal(result.ok, true);
  assert.equal(course.completedCount, 1);
  assert.equal(course.nextLesson.id, LESSONS[1].id);
  assert.equal(course.activeLessonId, LESSONS[0].id);
  assert.equal(course.canAccess(LESSONS[1].id), true);
  assert.equal(course.canAccess(LESSONS[2].id), false);
  assert.equal(course.hasEquipment('graduated_cylinder'), true);
  assert.deepEqual(result.unlocked.equipment, ['graduated_cylinder']);
  assert.deepEqual(course.complete().unlocked, { substances: [], equipment: [] });
  const before = course.serialize();
  assert.equal(course.setNote('change completed record'), false);
  assert.equal(course.recordPractice(eventFor(course.lesson())), false);
  assert.deepEqual(course.serialize(), before);
});

test('every current kit is available before preparation without exposing future kits', () => {
  const course = new CourseProgress();
  for (const lesson of LESSONS) {
    assert.equal(course.select(lesson.id), true);
    for (const id of lesson.unlock.substances) assert.equal(course.hasSubstance(id), true, `${lesson.id}: ${id}`);
    for (const id of lesson.unlock.equipment) assert.equal(course.hasEquipment(id), true, `${lesson.id}: ${id}`);
    assert.equal(course.completedCount, LESSONS.indexOf(lesson));
    ready(course); course.complete();
  }
});

test('lab conditions validate source, reaction, volume, and temperature', () => {
  for (const type of ['inspect', 'pour', 'reaction', 'heat', 'boil']) {
    const target = LESSONS.find(l => l.practice.goal.type === type), course = new CourseProgress();
    reach(course, target); course.markRead();
    const event = eventFor(target);
    assert.equal(course.recordPractice({ ...event, type: 'other' }), false);
    if (event.substance) assert.equal(course.recordPractice({ ...event, substance: 'invented' }), false);
    if (event.id) assert.equal(course.recordPractice({ ...event, id: 'other' }), false);
    if (type === 'pour') {
      assert.equal(course.recordPractice({ ...event, volume: target.practice.goal.minVolume / 2 }), false);
      assert.equal(course.recordPractice({ ...event, volume: NaN }), false);
    }
    if (type === 'heat') assert.equal(course.recordPractice({ ...event, temperature: 22 }), false);
    assert.equal(course.recordPractice(type === 'boil' ? { type: 'boil' } : event), true);
    assert.equal(course.recordPractice(event), false);
  }
});

test('free cannot mutate learning progress and returning restores the limited cabinet', () => {
  const course = new CourseProgress(); ready(course);
  const limited = course.availableSubstances();
  course.setMode('free'); const snapshot = course.serialize();
  course.markRead(); course.setNote('free'); course.recordPractice({ type: 'inspect', substance: 'water' });
  assert.equal(course.complete().ok, false);
  assert.deepEqual(course.serialize(), snapshot);
  course.setMode('learning');
  assert.deepEqual(course.availableSubstances(), limited);
  assert.equal(course.hasSubstance('hcl'), false);
  assert.equal(course.complete().ok, true);
});

test('version two round-trip preserves a result waiting for explicit next', () => {
  const course = new CourseProgress(); course.setMode('learning'); ready(course);
  course.setNote('Моя необязательная заметка.');
  const restored = new CourseProgress(JSON.parse(JSON.stringify(course.serialize())));
  assert.equal(restored.serialize().version, 2);
  assert.deepEqual(restored.serialize(), course.serialize());
  assert.equal(restored.status().practice, true);
  assert.equal(restored.status().complete, false);
  assert.equal(restored.complete().ok, true);
});

test('future records and completion flags cannot bypass an unfinished experiment', () => {
  const now = Date.now();
  const restored = new CourseProgress({ version: 2, mode: 'learning', chosenMode: true, activeLessonId: LESSONS[2].id,
    records: { [LESSONS[0].id]: { read: true, practice: false, completedAt: now }, [LESSONS[2].id]: { read: true, practice: true, completedAt: now }, bogus: { practice: true } },
    unlockedSubstances: Object.keys(SUBSTANCES) });
  assert.equal(restored.completedCount, 0);
  assert.equal(restored.records[LESSONS[0].id].completedAt, undefined);
  assert.equal(restored.records[LESSONS[2].id], undefined);
  assert.equal(restored.records.bogus, undefined);
  assert.equal(restored.activeLessonId, LESSONS[0].id);
  assert.deepEqual(restored.availableSubstances(), ['water']);
});

test('unstarted practice and malformed dates are discarded on restore', () => {
  const first = LESSONS[0];
  const restored = new CourseProgress({ version: 2, records: { [first.id]: { read: false, practice: true, completedAt: Date.now() } } });
  assert.equal(restored.status().practice, false); assert.equal(restored.completedCount, 0);
  const invalid = new CourseProgress({ version: 2, records: { [first.id]: { read: true, practice: true, completedAt: 'bad', answers: { 999: 1 } } } });
  assert.equal(invalid.completedCount, 0); assert.deepEqual(invalid.records[first.id].answers, {});
});

test('the old sixty-lesson track does not silently count as practical completion', () => {
  const course = new CourseProgress({ version: 1, mode: 'learning', chosenMode: true, activeLessonId: 'lesson-60',
    records: { 'lesson-01': { read: true, practice: true, completedAt: Date.now() }, [LESSONS[0].id]: { read: true, practice: true, completedAt: Date.now() } },
    legacy: { substances: ['hcl'], equipment: ['hotplate'] } });
  assert.equal(course.completedCount, 0);
  assert.equal(course.activeLessonId, LESSONS[0].id);
  assert.equal(course.hasSubstance('hcl'), true);
  assert.equal(course.hasEquipment('hotplate'), true);
});

test('legacy owned supplies persist without granting course completion or unknown assets', () => {
  const course = new CourseProgress();
  const additions = course.grantLegacy({ substances: ['hcl', 'hcl', 'invented', 'steam'], equipment: ['flask', 'hotplate', 'invented'] });
  assert.deepEqual(additions.substances, ['hcl']);
  assert.deepEqual(additions.equipment, ['flask', 'hotplate']);
  assert.equal(course.completedCount, 0);
  const restored = new CourseProgress(course.serialize());
  assert.equal(restored.hasSubstance('hcl'), true);
  assert.equal(restored.hasSubstance('steam'), false);
  assert.equal(restored.hasEquipment('hotplate'), true);
});

test('all practical experiments are sequential, complete without notes, and remain reviewable', () => {
  const course = new CourseProgress();
  for (const lesson of LESSONS) { assert.equal(course.nextLesson.id, lesson.id); course.select(lesson.id); ready(course); assert.equal(course.complete().ok, true); }
  assert.equal(course.completedCount, LESSONS.length); assert.equal(course.nextLesson, null);
  assert.ok(LESSONS.every(l => course.canAccess(l.id)));
  const restored = new CourseProgress(course.serialize());
  assert.equal(restored.completedCount, LESSONS.length);
  assert.deepEqual(restored.availableSubstances(), course.availableSubstances());
});
