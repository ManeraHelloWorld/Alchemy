import { PRACTICAL_LESSONS as LESSONS } from './practicalcourse.js';
import { LESSONS as REFERENCE_LESSONS } from './curriculum.js';
import { SUBSTANCES } from './chemistry.js';
import { EQUIPMENT } from './physics.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const equipmentNames = new Map(EQUIPMENT.map(item => [item.id, item.name]));
const number = value => String(value).padStart(2, '0');

/** A small bench coach and a map of experiments; assessment lives in CourseProgress. */
export class CourseUI {
  constructor(progress, callbacks = {}) {
    this.progress = progress; this.callbacks = callbacks;
    this.modeDialog = document.querySelector('#mode-dialog');
    this.host = document.querySelector('#view-course');
    this.coach = document.querySelector('#lesson-coach');
    this.switcher = document.querySelector('#mode-switcher');
    this._coachSignature = ''; this.coachCollapsed = false;
    this.diaryFeedback = new Set(); this.completionFeedback = new Map();
    if (this.modeDialog) {
      this.modeDialog.classList.add('course-mode-dialog');
      this.modeDialog.addEventListener('cancel', event => { if (!this.progress.chosenMode) event.preventDefault(); });
    }
  }

  current() { return this.progress.lesson() || LESSONS[0]; }
  record(lesson = this.current()) { return this.progress.records[lesson.id] || {}; }
  state(lesson = this.current()) { return this.progress.status(lesson.id); }
  learning() { return this.progress.mode === 'learning'; }
  changed() { this.callbacks.onChange?.(); }

  setMode(mode) {
    if (!this.progress.setMode(mode)) return;
    if (this.modeDialog?.open) this.modeDialog.close();
    this.callbacks.onMode?.(mode); this.changed(); this.render();
  }

  showModeChoice() {
    const host = this.modeDialog; if (!host) return;
    host.innerHTML = `${this.progress.chosenMode ? '<button class="dialog-close" data-mode-close aria-label="Закрыть выбор режима">×</button>' : ''}
      <div class="eyebrow">АЛХЕМИЯ / ДВЕ ЛАБОРАТОРИИ</div><h2>Начните с опыта</h2>
      <p class="mode-dialog-intro">Учитесь действием или исследуйте весь каталог самостоятельно.</p>
      <div class="course-mode-cards">
        <button class="course-mode-card learning-card" data-choose-mode="learning"><span class="mode-card-art mode-art-book" aria-hidden="true"><i></i><b>H₂O</b><em>✦</em></span><span class="course-mode-overline">ПОДСКАЗКИ ПРЯМО ЗА СТОЛОМ</span><strong>Обучение</strong><span class="mode-card-description">Возьмите сосуд, проведите опыт и посмотрите, что изменилось. Реактивы открываются шаг за шагом.</span><span class="mode-card-meta">${LESSONS.length} коротких опытов · без экзаменов и обязательных записей</span><span class="mode-card-action">${this.progress.completedCount ? 'Продолжить опыты' : 'Начать с воды'} ↗</span></button>
        <button class="course-mode-card free-card" data-choose-mode="free"><span class="mode-card-art mode-art-flask" aria-hidden="true"><i></i><b>⌁</b><em>✧</em></span><span class="course-mode-overline">ВСЁ ДОСТУПНО СРАЗУ</span><strong>Свободная лаборатория</strong><span class="mode-card-description">Все ${Object.keys(SUBSTANCES).length} веществ и все приборы открыты. Смешивайте, нагревайте и ведите дневник без заданий.</span><span class="mode-card-meta">Собственный стол · без учебных ограничений</span><span class="mode-card-action">Открыть лабораторию ↗</span></button>
      </div>`;
    host.querySelectorAll('[data-choose-mode]').forEach(button => button.addEventListener('click', () => this.setMode(button.dataset.chooseMode)));
    host.querySelector('[data-mode-close]')?.addEventListener('click', () => host.close());
    if (!host.open) host.showModal();
  }

  renderSwitcher() {
    const host = this.switcher; if (!host) return;
    const mode = this.progress.mode, completed = this.progress.completedCount;
    host.classList.add('course-mode-switcher');
    host.innerHTML = `<div class="mode-switch-label">${mode === 'learning' ? 'УЧЕБНАЯ ЛАБОРАТОРИЯ' : 'СВОБОДНАЯ ЛАБОРАТОРИЯ'}</div><div class="mode-switch-buttons" role="group" aria-label="Режим лаборатории"><button data-mode="learning" aria-pressed="${mode === 'learning'}">▤ Обучение</button><button data-mode="free" aria-pressed="${mode === 'free'}">◇ Свободная</button></div>${mode === 'learning' ? `<button class="mode-switch-progress" data-course-route aria-label="Карта опытов: ${completed} из ${LESSONS.length}"><span>ОПЫТЫ</span><b>${completed} <small>/ ${LESSONS.length}</small></b><span>↗</span></button>` : `<span class="mode-switch-progress"><span>ВЕСЬ КАТАЛОГ</span><b>${Object.keys(SUBSTANCES).length}</b></span>`}`;
    host.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => this.setMode(button.dataset.mode)));
    host.querySelector('[data-course-route]')?.addEventListener('click', () => this.callbacks.onView?.('course'));
    const nav = document.querySelector('[data-view="course"]');
    if (nav) nav.innerHTML = `<span class="nav-icon" aria-hidden="true">▤</span> Опыты <span class="course-nav-count">${completed}/${LESSONS.length}</span><kbd>6</kbd>`;
  }

  kit(lesson) {
    return [...lesson.unlock.substances.map(id => SUBSTANCES[id]?.name || id), ...lesson.unlock.equipment.filter(id => id !== 'bottle').map(id => equipmentNames.get(id) || id)].map(esc).join(' · ');
  }

  prepare() {
    if (!this.learning()) return;
    const lesson = this.current();
    this.progress.markRead(); this.callbacks.onPrepare?.(lesson); this.changed(); this.render();
  }

  finish() {
    if (!this.learning()) return;
    const lesson = this.current(), alreadyComplete = this.state().complete, result = this.progress.complete();
    this.completionFeedback.set(lesson.id, result);
    if (!result.ok) { this.render(); return; }
    // The callback still sees the just-completed lesson when recording the result.
    if (!alreadyComplete) this.callbacks.onComplete?.(result);
    const next = this.progress.nextLesson;
    if (next) this.progress.select(next.id);
    this.coachCollapsed = false; this.changed(); this.render(); this.callbacks.onView?.('table');
  }

  snapshot() {
    const lesson = this.current(); if (!this.state().practice) return;
    const text = this.record().note || lesson.explanation;
    this.progress.setNote(text); this.callbacks.onNote?.(lesson, text);
    this.diaryFeedback.add(lesson.id); this.changed(); this.render();
  }

  selectLesson(id) {
    if (!this.progress.select(id)) return;
    this.coachCollapsed = false; this.changed(); this.render(); this.callbacks.onView?.('table');
  }

  bindActions(host) {
    host.querySelectorAll('[data-prepare]').forEach(button => button.addEventListener('click', () => this.prepare()));
    host.querySelectorAll('[data-complete]').forEach(button => button.addEventListener('click', () => this.finish()));
    host.querySelectorAll('[data-copy-note]').forEach(button => button.addEventListener('click', () => this.snapshot()));
    host.querySelectorAll('[data-lab-view]').forEach(button => button.addEventListener('click', () => this.callbacks.onView?.('table')));
  }

  render() {
    this.renderSwitcher(); this.renderCoach();
    const host = this.host; if (!host) return;
    const lesson = this.current(), state = this.state(), reference = REFERENCE_LESSONS.find(item => item.id === lesson.sourceId);
    host.classList.add('course-view', 'practical-course');
    host.innerHTML = `<div class="workspace-heading course-heading"><div><div class="eyebrow">ПОСМОТРЕТЬ → СДЕЛАТЬ → ПОНЯТЬ</div><h1>Химия на вашем столе<span>.</span></h1><p>Каждый шаг — небольшой настоящий опыт в симуляторе.</p></div><div class="course-heading-progress"><b>${this.progress.completedCount}</b><span>из ${LESSONS.length}<br>опытов</span></div></div>
      ${!this.learning() ? '<div class="course-free-notice"><span>В свободной лаборатории весь каталог открыт. Учебный маршрут и его прогресс доступны в обучении.</span><button data-return-learning>Открыть обучение →</button></div>' : ''}
      <div class="practical-course-layout"><section class="practical-route" aria-label="Карта опытов">${LESSONS.map((item, index) => {
        const available = this.progress.canAccess(item.id), done = this.progress.status(item.id).complete;
        return `<button class="practical-route-card${item.id === lesson.id ? ' active' : ''}${done ? ' completed' : ''}" data-lesson="${item.id}"${available && this.learning() ? '' : ' disabled'} aria-current="${item.id === lesson.id ? 'step' : 'false'}"><span class="practical-route-number">${done ? '✓' : number(index + 1)}</span><span><b>${esc(item.title)}</b><small>${available ? esc(item.lead) : 'После предыдущего опыта'}</small></span><i aria-hidden="true">${available ? '↗' : '○'}</i></button>`;
      }).join('')}</section>
      <article class="course-paper practical-preview"><div class="eyebrow">${state.practice ? 'ОПЫТ ПОЛУЧИЛСЯ' : 'СЛЕДУЮЩИЙ ОПЫТ'}</div><h2>${esc(lesson.title)}</h2><p class="lesson-hook">${esc(lesson.lead)}</p>
        <ol class="practical-microsteps">${lesson.steps.slice(0, 3).map(step => `<li><b>${esc(step.title)}</b><span>${esc(step.text)}</span></li>`).join('')}</ol>
        <p class="practical-kit"><b>Комплект уже доступен</b><br>${this.kit(lesson)}</p>
        ${this.learning() ? (state.practice ? `<div class="lesson-feedback correct"><p>${esc(lesson.explanation)}</p></div><button class="course-action" data-complete>${this.progress.nextLesson || !state.complete ? 'Понял, дальше →' : 'К своим опытам →'}</button><button class="course-link" data-copy-note>${this.diaryFeedback.has(lesson.id) ? '✓ В дневнике' : 'Сохранить в дневник'}</button><button class="course-link" data-prepare>Повторить опыт</button>` : '<button class="course-action" data-prepare>Подготовить опыт →</button>') : ''}
        ${reference ? `<details class="practical-reference"><summary>Хочу разобраться подробнее</summary>${reference.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}<p>${esc(reference.example)}</p></details>` : ''}
      </article></div>`;
    host.querySelectorAll('[data-lesson]').forEach(button => button.addEventListener('click', () => this.selectLesson(button.dataset.lesson)));
    host.querySelector('[data-return-learning]')?.addEventListener('click', () => this.setMode('learning'));
    this.bindActions(host);
  }

  renderCoach() {
    const host = this.coach; if (!host) return;
    host.hidden = !this.learning(); if (host.hidden) { this._coachSignature = ''; return; }
    const lesson = this.current(), state = this.state();
    const signature = JSON.stringify([lesson.id, state.read, state.practice, state.complete, this.coachCollapsed, this.diaryFeedback.has(lesson.id)]);
    if (signature === this._coachSignature) return;
    this._coachSignature = signature; host.classList.add('lesson-coach', 'practical-coach');
    const index = LESSONS.indexOf(lesson) + 1, stage = state.practice ? 'Результат' : state.read ? 'Действуйте' : 'Начните здесь';
    const controls = lesson.practice.setup.kind === 'heat' ? 'E — включить / выключить нагрев' : lesson.practice.setup.donor ? 'ЛКМ — взять · колесо — наклон · ПКМ — отпустить' : 'ЛКМ — выбрать сосуд';
    host.innerHTML = `<div class="practical-coach-head"><button data-coach-toggle aria-expanded="${!this.coachCollapsed}"><small>ОПЫТ ${index} / ${LESSONS.length} · ${stage}</small><b>${esc(lesson.title)}</b></button><button class="coach-back" data-coach-course aria-label="Карта опытов">↗</button></div>
      <div class="practical-coach-body"${this.coachCollapsed ? ' hidden' : ''}>${state.practice ? `<p class="practical-coach-success">✓ Наблюдение подтверждено</p><p class="coach-explanation">${esc(lesson.explanation)}</p><button class="course-action" data-complete>${this.progress.nextLesson || !state.complete ? 'Понял, дальше →' : 'Все опыты пройдены ✓'}</button><button class="course-link" data-copy-note>${this.diaryFeedback.has(lesson.id) ? '✓ В дневнике' : 'В дневник'}</button>` : `<p class="practical-coach-goal">${esc(lesson.lead)}</p><p class="practical-coach-controls">${esc(controls)}</p>${state.read ? `<p class="practical-coach-observe">${esc(lesson.steps[2].text)}</p>` : ''}<button class="course-action" data-prepare>${state.read ? 'Подготовить заново' : 'Подготовить опыт'} ↗</button>`}</div>`;
    host.querySelector('[data-coach-toggle]')?.addEventListener('click', () => { this.coachCollapsed = !this.coachCollapsed; this.renderCoach(); });
    host.querySelector('[data-coach-course]')?.addEventListener('click', () => this.callbacks.onView?.('course'));
    this.bindActions(host);
  }
}
