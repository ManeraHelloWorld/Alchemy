import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICAL_LESSONS as LESSONS } from '../dist/practicalcourse.js';
import { CourseProgress } from '../dist/progression.js';
import { World } from '../dist/physics.js';
import { REACTIONS, SUBSTANCES } from '../dist/chemistry.js';
import { createLessonSetup, observeLessonSetup } from '../dist/lessonlab.js';

test('the route is concise and practical from the first interaction', () => {
  assert.equal(LESSONS.length, 24);
  assert.equal(new Set(LESSONS.map(l => l.id)).size, LESSONS.length);
  assert.deepEqual(LESSONS.slice(0, 4).map(l => l.practice.goal.type), ['inspect', 'pour', 'pour', 'reaction']);
  assert.equal(LESSONS[2].practice.setup.receiver.substance, 'sodium_chloride');
  for (const lesson of LESSONS) {
    assert.match(lesson.id, /^lesson-v4-\d\d$/);
    assert.equal(lesson.practice.type, 'lab');
    assert.equal(lesson.questions.length, 0);
    assert.ok(lesson.steps.length >= 3 && lesson.steps.length <= 5);
    assert.ok(lesson.lead.length < 120);
    for (const step of lesson.steps) {
      assert.ok(step.text.length < 260, `${lesson.id}: a microstep must stay brief`);
      assert.ok((step.text.match(/[.!?](?:\s|$)/gu) || []).length <= 2);
    }
    assert.ok(lesson.unlock.substances.every(id => SUBSTANCES[id]?.stock));
    if (lesson.practice.goal.type === 'reaction') assert.ok(REACTIONS.some(r => r.id === lesson.practice.goal.id));
  }
});

test('the complete practical route succeeds through actual drops, selection, and heating', () => {
  const course = new CourseProgress();
  for (const lesson of LESSONS) {
    course.select(lesson.id); course.markRead();
    let attempt;
    const events = [];
    const world = new World(event => {
      if (event.body !== attempt?.receiver) return;
      events.push(event.reactionId || event.type);
      if (event.reactionId) course.recordPractice({ type: 'reaction', id: event.reactionId });
      if (event.type === 'boil') course.recordPractice({ type: 'boil' });
    });
    attempt = createLessonSetup(world, lesson, course);
    if (attempt.donor) attempt.donor.angle = Math.PI / 2;
    if (attempt.heater) attempt.heater.lit = true;
    if (lesson.practice.goal.type === 'inspect') world.grab(attempt.receiver);
    for (let i = 0; i < 3600 && !course.status().practice; i++) {
      world.step(1 / 60);
      for (const event of observeLessonSetup(world, attempt)) course.recordPractice(event);
    }
    assert.equal(course.status().practice, true, `${lesson.id}: actual physical setup failed, events=${events}`);
    assert.equal(course.complete().ok, true);
  }
  assert.equal(course.completedCount, LESSONS.length);
});
