import { PRACTICAL_LESSONS as LESSONS } from './practicalcourse.js';
import { SUBSTANCES } from './chemistry.js';
import { EQUIPMENT } from './physics.js';

const BASE_SUBSTANCES = ['water'];
const BASE_EQUIPMENT = ['bottle', 'beaker', 'tube'];
const FREE_MESSAGE = 'Учебный прогресс доступен только в режиме обучения.';
const knownStock = id => typeof id === 'string' && SUBSTANCES[id]?.stock === true;
const knownSubstance = id => typeof id === 'string' && Object.hasOwn(SUBSTANCES, id);
const knownEquipment = id => id === 'bottle' || EQUIPMENT.some(item => item.id === id);
const emptyRecord = () => ({ read: false, answers: {}, practice: false, note: '' });
const noUnlocks = () => ({ substances: [], equipment: [] });
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unique = values => [...new Set(values)];
const noteReady = note => typeof note === 'string' && note.trim().length > 0;
const completedTime = value => {
  const time = typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(time) && time > 0 && time < 8.64e15 ? time : null;
};

function cleanRecord(raw, lesson) {
  if (!isObject(raw)) return null;
  const record = emptyRecord();
  record.read = raw.read === true;
  record.practice = record.read && raw.practice === true;
  record.note = typeof raw.note === 'string' ? raw.note.slice(0, 12000) : '';
  if (record.read && isObject(raw.answers)) {
    for (let i = 0; i < (lesson.questions || []).length; i++) {
      const choice = raw.answers[i];
      if (Number.isInteger(choice) && choice >= 0 && choice < lesson.questions[i].options.length) record.answers[i] = choice;
    }
  }
  const time = completedTime(raw.completedAt);
  if (time) record.completedAt = time;
  return record;
}

function assessment(lesson, record = emptyRecord()) {
  const questions = lesson?.questions || [];
  const answered = questions.reduce((count, question, index) => count + (record.answers?.[index] === question.correct ? 1 : 0), 0);
  const result = {
    read: record.read === true,
    answered,
    totalQuestions: questions.length,
    practice: record.practice === true,
    noteReady: noteReady(record.note),
  };
  result.ready = !!lesson && result.practice;
  return result;
}

function numericAnswer(value, unit = '') {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  let text = value.trim().replace(/−/g, '-');
  if (unit) {
    const suffix = String(unit).trim();
    if (suffix && text.toLocaleLowerCase('ru-RU').endsWith(suffix.toLocaleLowerCase('ru-RU'))) text = text.slice(0, -suffix.length);
  }
  text = text.replace(/\s/gu, '').replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

/** DOM-free course state. Access and rewards follow verified contiguous completion. */
export class CourseProgress {
  constructor(saved = null) {
    this.mode = 'learning';
    this.chosenMode = false;
    this.activeLessonId = LESSONS[0]?.id || null;
    this.records = {};
    this._legacy = noUnlocks();
    if (saved) this.restore(saved);
  }

  lesson(id = this.activeLessonId) { return LESSONS.find(item => item.id === id) || null; }

  _prefix() {
    let count = 0;
    for (const lesson of LESSONS) {
      const record = this.records[lesson.id];
      if (!record || !completedTime(record.completedAt) || !assessment(lesson, record).ready) break;
      count++;
    }
    return count;
  }

  get completedCount() { return this._prefix(); }
  get nextLesson() { return LESSONS[this._prefix()] || null; }

  canAccess(id) {
    const index = LESSONS.findIndex(item => item.id === id);
    return index >= 0 && index <= this._prefix();
  }

  select(id) {
    if (!this.canAccess(id)) return false;
    this.activeLessonId = id;
    return true;
  }

  setMode(mode) {
    if (mode !== 'learning' && mode !== 'free') return false;
    this.mode = mode;
    this.chosenMode = true;
    return true;
  }

  _editable() {
    return this.mode === 'learning' && this.canAccess(this.activeLessonId) && !this.status().complete;
  }

  _record() {
    const lesson = this.lesson();
    if (!lesson) return null;
    return this.records[lesson.id] ||= emptyRecord();
  }

  markRead() {
    if (!this._editable()) return false;
    this._record().read = true;
    return true;
  }

  answer(index, choice) {
    if (this.mode !== 'learning') return { correct: false, feedback: FREE_MESSAGE };
    const lesson = this.lesson();
    if (!lesson || !this.canAccess(lesson.id)) return { correct: false, feedback: 'Сначала завершите предыдущий урок.' };
    if (!this.records[lesson.id]?.read) return { correct: false, feedback: 'Сначала подготовьте опыт.' };
    const question = lesson.questions?.[index];
    if (!Number.isInteger(index) || !question || !Number.isInteger(choice) || choice < 0 || choice >= question.options.length) return { correct: false, feedback: 'Выберите один из предложенных ответов.' };
    const correct = choice === question.correct;
    // Reviewing a completed lesson never revokes earned resources.
    if (!this.status().complete) this._record().answers[index] = choice;
    const feedback = Array.isArray(question.feedback) ? question.feedback[choice] : question.feedback;
    return { correct, feedback: typeof feedback === 'string' && feedback ? feedback : correct ? 'Верно. Переходите к следующему шагу.' : 'Ответ пока неверный. Вернитесь к объяснению и попробуйте ещё раз.' };
  }

  recordPractice(event) {
    if (!this._editable() || !this.records[this.activeLessonId]?.read || !isObject(event)) return false;
    const practice = this.lesson().practice, goal = practice?.goal;
    if (practice?.type !== 'lab' || !goal || event.type !== goal.type || this._record().practice) return false;
    if (goal.id && event.id !== goal.id) return false;
    // The current model's boil event is the water phase transition and carries no substance field.
    const eventSubstance = event.substance || (event.type === 'boil' ? 'water' : null);
    if (goal.substance && eventSubstance !== goal.substance) return false;
    if (goal.type === 'pour') {
      if (!Number.isFinite(event.volume) || event.volume <= 0 || event.volume + 1e-8 < (goal.minVolume || 0)) return false;
    }
    if (goal.type === 'heat') {
      if (!Number.isFinite(event.temperature) || event.temperature + 1e-8 < (goal.minTemperature ?? 22)) return false;
    }
    this._record().practice = true;
    return true;
  }

  submitPractice(value) {
    if (this.mode !== 'learning') return { correct: false, feedback: FREE_MESSAGE };
    const lesson = this.lesson();
    if (!lesson || !this.canAccess(lesson.id)) return { correct: false, feedback: 'Сначала завершите предыдущий урок.' };
    if (!this.records[lesson.id]?.read) return { correct: false, feedback: 'Сначала подготовьте опыт.' };
    const practice = lesson.practice;
    let correct = false;
    if (practice?.type === 'calculation') {
      const answer = numericAnswer(value, practice.unit);
      if (answer === null) return { correct: false, feedback: 'Введите число. Десятичную дробь можно записать с запятой или точкой.' };
      const tolerance = Number.isFinite(practice.tolerance) && practice.tolerance >= 0 ? practice.tolerance : 1e-6;
      correct = Number.isFinite(practice.answer) && Math.abs(answer - practice.answer) <= tolerance + Math.max(1, Math.abs(practice.answer)) * 1e-10;
    } else if (practice?.type === 'analysis') {
      let choice = value;
      if (typeof value === 'string') {
        const text = value.trim();
        choice = /^\d+$/.test(text) ? Number(text) : practice.options?.findIndex(option => option.toLocaleLowerCase('ru-RU') === text.toLocaleLowerCase('ru-RU'));
      }
      correct = Number.isInteger(choice) && choice >= 0 && choice < (practice.options?.length || 0) && choice === practice.correct;
    } else return { correct: false, feedback: 'Это лабораторная практика: выполните действие с настоящими предметами на столе.' };
    if (correct && !this.status().complete) this._record().practice = true;
    return { correct, feedback: correct ? practice.feedback || 'Практическое задание выполнено.' : 'Пока неверно. Проверьте условия, единицы и пример из урока, затем попробуйте ещё раз.' };
  }

  setNote(text) {
    if (!this._editable() || !this.records[this.activeLessonId]?.read || typeof text !== 'string') return false;
    this._record().note = text.slice(0, 12000);
    return true;
  }

  status(id = this.activeLessonId) {
    const lesson = this.lesson(id);
    const result = assessment(lesson, lesson ? this.records[id] : undefined);
    const index = LESSONS.findIndex(item => item.id === id);
    return { ...result, complete: index >= 0 && index < this._prefix(), ready: result.ready && this.canAccess(id) };
  }

  complete() {
    const fail = reason => ({ ok: false, reason, unlocked: noUnlocks() });
    if (this.mode !== 'learning') return fail(FREE_MESSAGE);
    const lesson = this.lesson();
    if (!lesson || !this.canAccess(lesson.id)) return fail('Сначала завершите предыдущий урок.');
    const status = this.status();
    if (status.complete) return { ok: true, reason: 'Этот урок уже завершён. Награды сохранены.', unlocked: noUnlocks() };
    if (!status.practice) return fail('Выполните практическое задание урока.');
    const before = this._unlocks();
    this._record().completedAt = Date.now();
    const after = this._unlocks();
    return { ok: true, reason: 'Опыт завершён. Следующий комплект открыт.', unlocked: {
      substances: after.substances.filter(id => !before.substances.includes(id)),
      equipment: after.equipment.filter(id => !before.equipment.includes(id)),
    } };
  }

  _unlocks() {
    const substances = [...BASE_SUBSTANCES, ...this._legacy.substances], equipment = [...BASE_EQUIPMENT, ...this._legacy.equipment];
    // The current kit is available before its experiment, so preparation never
    // depends on a reward that the learner could only earn using that same kit.
    for (const lesson of LESSONS.slice(0, this._prefix() + 1)) {
      substances.push(...(lesson.unlock?.substances || []).filter(knownStock));
      equipment.push(...(lesson.unlock?.equipment || []).filter(knownEquipment));
    }
    return { substances: unique(substances), equipment: unique(equipment) };
  }

  get unlockedSubstances() { return this.availableSubstances(); }
  get unlockedEquipment() { return this.availableEquipment(); }
  availableSubstances() { return this.mode === 'free' ? Object.keys(SUBSTANCES) : this._unlocks().substances; }
  availableEquipment() { return this.mode === 'free' ? unique(['bottle', ...EQUIPMENT.map(item => item.id)]) : this._unlocks().equipment; }
  hasSubstance(id) { return knownSubstance(id) && this.availableSubstances().includes(id); }
  hasEquipment(id) { return knownEquipment(id) && this.availableEquipment().includes(id); }

  grantLegacy({ substances = [], equipment = [] } = {}) {
    const before = this._unlocks();
    if (Array.isArray(substances)) this._legacy.substances = unique([...this._legacy.substances, ...substances.filter(knownStock)]);
    if (Array.isArray(equipment)) this._legacy.equipment = unique([...this._legacy.equipment, ...equipment.filter(knownEquipment)]);
    const after = this._unlocks();
    return { substances: after.substances.filter(id => !before.substances.includes(id)), equipment: after.equipment.filter(id => !before.equipment.includes(id)) };
  }

  serialize() {
    return JSON.parse(JSON.stringify({ version: 2, mode: this.mode, chosenMode: this.chosenMode,
      activeLessonId: this.activeLessonId, records: this.records, legacy: this._legacy }));
  }

  restore(saved) {
    this.mode = 'learning'; this.chosenMode = false; this.activeLessonId = LESSONS[0]?.id || null;
    this.records = {}; this._legacy = noUnlocks();
    if (!isObject(saved)) return false;
    if (saved.mode === 'learning' || saved.mode === 'free') this.mode = saved.mode;
    this.chosenMode = saved.chosenMode === true && (saved.mode === 'learning' || saved.mode === 'free');
    if (saved.version === 2 && isObject(saved.records)) {
      for (const lesson of LESSONS) {
        const record = cleanRecord(saved.records[lesson.id], lesson);
        if (record) this.records[lesson.id] = record;
      }
    }
    const prefix = this._prefix();
    // A genuine save can contain the completed prefix and one current attempt.
    // A future completedAt flag cannot skip a lesson or bank its rewards.
    for (let i = prefix; i < LESSONS.length; i++) {
      const id = LESSONS[i].id;
      if (i > prefix) delete this.records[id];
      else if (this.records[id]) delete this.records[id].completedAt;
    }
    if (isObject(saved.legacy)) this.grantLegacy(saved.legacy);
    if (this.canAccess(saved.activeLessonId)) this.activeLessonId = saved.activeLessonId;
    else this.activeLessonId = this.nextLesson?.id || LESSONS.at(-1)?.id || null;
    return true;
  }
}
