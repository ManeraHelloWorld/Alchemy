import { SUBSTANCES, createMixture, volume, color, transfer, stepChemistry } from './chemistry.js';

export const EQUIPMENT = [
  { id: 'beaker', name: 'Химический стакан', description: 'Широкое горло, деления объёма. Удобен для смешивания.', capacity: 250, w: 76, h: 82, mouthWidth: 58 },
  { id: 'flask', name: 'Колба Эрленмейера', description: 'Узкое горло и устойчивое основание. Можно закрыть пробкой.', capacity: 200, w: 72, h: 102, mouthWidth: 20 },
  { id: 'tube', name: 'Пробирка', description: 'Небольшие пробы и наблюдение реакций. Ставьте на подставку.', capacity: 40, w: 30, h: 100, mouthWidth: 19 },
  { id: 'graduated_cylinder', name: 'Мерный цилиндр', description: '100 мл, узкий носик и точные деления. Подходит для измерения порций раствора.', capacity: 100, w: 36, h: 130, mouthWidth: 26, maxFlow: 22 },
  { id: 'dropper', name: 'Пипетка', description: '10 мл. Добавляет жидкость отдельными каплями, до 2 мл/с: удобно для индикаторов и титрования.', capacity: 10, w: 20, h: 100, mouthWidth: 7, maxFlow: 2 },
  { id: 'evaporating_dish', name: 'Выпарительная чашка', description: 'Широкая фарфоровая чашка на 120 мл для выпаривания раствора. При наклоне легко проливается; крышки нет.', capacity: 120, w: 100, h: 28, mouthWidth: 88, maxFlow: 140, fragile: false, canSeal: false, heatTransfer: .8 },
  { id: 'crucible', name: 'Фарфоровый тигель', description: '50 мл. Прочный открытый сосуд для нагрева небольших образцов и получения сухого остатка.', capacity: 50, w: 56, h: 58, mouthWidth: 40, maxFlow: 45, fragile: false, canSeal: false, heatTransfer: .72 },
  { id: 'burner', name: 'Спиртовка', description: 'Нагревает сосуд над пламенем. Включите в панели предмета.', capacity: 0, w: 56, h: 64, mouthWidth: 0 },
  { id: 'hotplate', name: 'Электроплитка', description: 'Нагревает посуду на своей верхней поверхности без пламени. Включается клавишей E.', capacity: 0, w: 110, h: 40, mouthWidth: 0 },
  { id: 'thermometer', name: 'Лабораторный термометр', description: 'Погрузите нижнюю колбу в жидкость. Показание постепенно приближается к температуре образца.', capacity: 0, w: 14, h: 120, mouthWidth: 0 },
  { id: 'stand', name: 'Лабораторная подставка', description: 'Держит сосуд над спиртовкой. Поставьте сосуд на верхнюю сетку.', capacity: 0, w: 110, h: 130, mouthWidth: 0 },
];

const BOTTLE = { id: 'bottle', name: 'Бутылочка', capacity: 150, w: 54, h: 100, mouthWidth: 18 };
const GRAVITY = 650;
const FLOOR = 490;
const LEFT = 30;
const RIGHT = 1170;
const TAU = Math.PI * 2;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const normalAngle = n => ((n + Math.PI) % TAU + TAU) % TAU - Math.PI;
const isVessel = body => body.capacity > 0 && !body.broken;
const specFor = kind => kind === 'bottle' ? BOTTLE : EQUIPMENT.find(item => item.id === kind) || EQUIPMENT[0];

export function mouthPosition(body) {
  return { x: body.x + Math.sin(body.angle) * body.h / 2, y: body.y - Math.cos(body.angle) * body.h / 2 };
}

function localPoint(body, x, y) {
  const c = Math.cos(body.angle), s = Math.sin(body.angle), dx = x - body.x, dy = y - body.y;
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}

function halfExtents(body) {
  const c = Math.abs(Math.cos(body.angle)), s = Math.abs(Math.sin(body.angle));
  return { x: c * body.w / 2 + s * body.h / 2, y: s * body.w / 2 + c * body.h / 2 };
}

function axes(body) {
  const c = Math.cos(body.angle), s = Math.sin(body.angle);
  return [{ x: c, y: s }, { x: -s, y: c }];
}

function overlap(a, b) {
  const aa = axes(a), ba = axes(b), dx = b.x - a.x, dy = b.y - a.y;
  let depth = Infinity, normal = null;
  for (const axis of [...aa, ...ba]) {
    const ar = Math.abs(axis.x * aa[0].x + axis.y * aa[0].y) * a.w / 2 + Math.abs(axis.x * aa[1].x + axis.y * aa[1].y) * a.h / 2;
    const br = Math.abs(axis.x * ba[0].x + axis.y * ba[0].y) * b.w / 2 + Math.abs(axis.x * ba[1].x + axis.y * ba[1].y) * b.h / 2;
    const distance = dx * axis.x + dy * axis.y;
    const penetration = ar + br - Math.abs(distance);
    if (penetration <= 0) return null;
    if (penetration < depth) {
      depth = penetration;
      const sign = distance < 0 ? -1 : 1;
      normal = { x: axis.x * sign, y: axis.y * sign };
    }
  }
  return { depth, normal };
}

/** Small rigid-body engine. All quantities remain inside vessels, drops, or puddles. */
export class World {
  constructor(onEvent = () => {}) {
    this.bodies = [];
    this.particles = [];
    this.puddles = [];
    this.held = null;
    this.selected = null;
    this.time = 0;
    this.paused = false;
    this.onEvent = onEvent;
    this.nextId = 1;
    this.cursor = { x: 600, y: 300 };
    this.shake = 0;
    this.flash = 0;
    this._previousCursor = { x: 600, y: 300 };
  }

  create(kind = 'beaker', x = 600, y = 300, options = {}) {
    const spec = specFor(kind);
    const substance = SUBSTANCES[options.substance];
    const body = {
      id: this.nextId++, kind: spec.id,
      x: clamp(finite(x, 600), LEFT + spec.w / 2, RIGHT - spec.w / 2),
      y: clamp(finite(y, 300), 45, FLOOR - spec.h / 2),
      w: spec.w, h: spec.h, mouthWidth: spec.mouthWidth,
      angle: 0, vx: 0, vy: 0, angularVelocity: 0,
      mixture: createMixture(options.substance, substance ? clamp(finite(options.volume, 80), 0, spec.capacity) : 0),
      capacity: spec.capacity,
      label: String(options.label || substance?.name || spec.name).slice(0, 80),
      formula: substance?.formula || '',
      color: substance?.color || '#6db3ad',
      sealed: spec.canSeal !== false && options.sealed === true, lit: false, broken: false,
      canSeal: spec.capacity > 0 && spec.canSeal !== false,
      fragile: spec.capacity > 0 && spec.fragile !== false, heat: 0, grounded: false,
      reading: 22, readingSource: null,
      _age: 0, _spillCooldown: 0, _pourTimer: 0,
    };
    if (options.mixture) body.mixture = cleanMixture(options.mixture);
    this.bodies.push(body);
    return body;
  }

  remove(body) {
    const index = this.bodies.indexOf(body);
    if (index < 0) return false;
    this.bodies.splice(index, 1);
    if (this.held === body) this.held = null;
    if (this.selected === body) this.selected = null;
    return true;
  }

  hitTest(x, y) {
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const body = this.bodies[i];
      if (body.broken) continue;
      const point = localPoint(body, x, y);
      if (Math.abs(point.x) <= body.w / 2 + 7 && Math.abs(point.y) <= body.h / 2 + 7) {
        // Only the pole, grate, and base can be grabbed; its empty bounding box never hides a vessel.
        if (body.kind === 'stand') {
          const pole = point.x < -body.w / 2 + 18;
          const grate = Math.abs(point.y + 28) < 9;
          const base = point.y > body.h / 2 - 15;
          if (!pole && !grate && !base) continue;
        }
        return body;
      }
    }
    return null;
  }

  pick(x, y) {
    if (this.held) return this.held;
    const body = this.hitTest(x, y);
    if (!body) return null;
    this.grab(body);
    this.cursor = { x, y };
    this._previousCursor = { x, y };
    this._grabOffset = { x: body.x - x, y: body.y - y };
    return body;
  }

  /** Directly hold a newly deployed item, including equipment with an empty center. */
  grab(body) {
    if (!body || body.broken || !this.bodies.includes(body)) return null;
    if (this.held && this.held !== body) this.release();
    this.held = this.selected = body;
    body.vx = body.vy = body.angularVelocity = 0;
    this.cursor = { x: body.x, y: body.y };
    this._previousCursor = { ...this.cursor };
    this._grabOffset = { x: 0, y: 0 };
    return body;
  }

  move(x, y) {
    this.cursor.x = clamp(finite(x, this.cursor.x), LEFT, RIGHT);
    this.cursor.y = clamp(finite(y, this.cursor.y), 25, FLOOR - 8);
    if (this.held) {
      const body = this.held;
      body.x = clamp(this.cursor.x + (this._grabOffset?.x || 0), LEFT + 8, RIGHT - 8);
      body.y = clamp(this.cursor.y + (this._grabOffset?.y || 0), 35, FLOOR - 10);
      body.vx = body.vy = body.angularVelocity = 0;
    }
  }

  rotate(deltaRadians) {
    if (!this.held || this.held.kind === 'stand') return;
    this.held.angle = normalAngle(this.held.angle + clamp(finite(deltaRadians), -.5, .5));
    if (['burner', 'hotplate'].includes(this.held.kind) && Math.abs(this.held.angle) > .45) this.held.lit = false;
  }

  release() {
    const body = this.held;
    if (!body) return null;
    body.vx = body.vy = 0;
    body.angularVelocity = 0;
    this.held = null;
    this._grabOffset = null;
    return body;
  }

  addParticle(particle) {
    const life = finite(particle.life, 1);
    const p = { x: 600, y: 300, vx: 0, vy: 0, size: 3, color: '#9bdad6', type: 'spark', ...particle, life, maxLife: particle.maxLife || life };
    this.particles.push(p);
    return p;
  }

  emit(type, x, y, count = 12, options = {}) {
    for (let i = 0; i < count; i++) {
      const direction = Math.random() * TAU;
      const speed = 25 + Math.random() * (options.speed || 120);
      this.addParticle({ type, x, y, vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed - 40, size: 2 + Math.random() * 4,
        color: options.color || '#b6e1df', life: .5 + Math.random() * .8, ...options });
    }
  }

  _event(event) {
    this.onEvent?.(event);
  }

  _break(body, pressure = false) {
    if (body.broken || (!body.fragile && !pressure)) return;
    body.broken = true;
    body.lit = false;
    body.sealed = false;
    if (this.held === body) this.held = null;
    const amount = volume(body.mixture);
    if (amount > 0) {
      // Conserved liquid fragments fall independently; visual smoke carries no liquid.
      const fragments = Math.min(24, Math.max(4, Math.ceil(amount / 5)));
      for (let i = 0; i < fragments; i++) {
        const parcel = createMixture();
        transfer(body.mixture, parcel, volume(body.mixture) / (fragments - i));
        this.addParticle({ type: 'drop', x: body.x, y: body.y, vx: (Math.random() - .5) * (pressure ? 320 : 160),
          vy: -50 - Math.random() * (pressure ? 220 : 90), size: 3, color: color(parcel), life: 10,
          mixture: parcel, sourceId: body.id });
      }
    }
    this.emit('shard', body.x, body.y, pressure ? 35 : 18, { speed: pressure ? 260 : 150, color: '#b0d7ce', life: 1.7 });
    if (pressure) {
      this.emit('steam', body.x, body.y, 55, { speed: 260, color: '#d9eeea', life: 1.7, size: 7 });
      this.emit('flash', body.x, body.y, 1, { life: .32, size: 110, vx: 0, vy: 0, color: '#ddffff' });
      this.shake = 16;
      this.flash = .35;
    }
    this._event({ type: pressure ? 'explosion' : 'break', title: pressure ? 'Разрыв сосуда' : 'Стекло разбилось',
      description: pressure ? 'Давление пара или газа превысило прочность закрытого сосуда.' : 'Сосуд не выдержал удара. Содержимое пролилось на стол.', body });
  }

  _floor(body, dt) {
    const ext = halfExtents(body);
    body.grounded = false;
    if (body.x - ext.x < LEFT) { body.x = LEFT + ext.x; body.vx = Math.abs(body.vx) * .2; }
    if (body.x + ext.x > RIGHT) { body.x = RIGHT - ext.x; body.vx = -Math.abs(body.vx) * .2; }
    if (body.y + ext.y < FLOOR) return;
    const impact = body.vy;
    body.y = FLOOR - ext.y;
    body.grounded = true;
    if (impact > 470 && body._age > .25 && body.fragile) {
      this._break(body);
      return;
    }
    body.vy = impact > 28 ? -impact * .13 : 0;
    body.vx *= Math.exp(-10 * dt);
    if (Math.abs(body.vx) < 1) body.vx = 0;
    if (body.kind === 'stand') { body.angle = 0; body.angularVelocity = 0; return; }
    // Gravity about the contact corner naturally determines whether a vessel rights itself or topples.
    const a = normalAngle(body.angle);
    const s = Math.sin(a), c = Math.cos(a);
    const derivative = Math.sign(s) * c * body.w / 2 - Math.sign(c) * s * body.h / 2;
    const nearest = Math.round(a / (Math.PI / 2)) * Math.PI / 2;
    const delta = normalAngle(a - nearest);
    if (Math.abs(delta) < .035 && Math.abs(body.angularVelocity) < .7) {
      body.angle = nearest;
      body.angularVelocity = 0;
    } else {
      body.angularVelocity -= derivative * .065 * dt * 12;
      body.angularVelocity *= Math.exp(-4 * dt);
    }
  }

  _standSupport(body, previousBottom) {
    if (body.kind === 'stand' || !isVessel(body) || body.vy < 0 || Math.abs(normalAngle(body.angle)) > .6) return;
    for (const stand of this.bodies) {
      if (stand.kind !== 'stand' || stand === this.held || stand.broken) continue;
      const shelf = stand.y - 28;
      const bottom = body.y + halfExtents(body).y;
      if (Math.abs(body.x - stand.x) > 43 || previousBottom > shelf + 8 || bottom < shelf) continue;
      body.y -= bottom - shelf;
      body.vy = 0;
      body.vx *= .92;
      body.angularVelocity *= .8;
      body.angle *= .96;
      body.grounded = true;
      return;
    }
  }

  _collisions(dt) {
    for (let i = 0; i < this.bodies.length; i++) {
      const a = this.bodies[i];
      if (a.broken || a.kind === 'stand') continue;
      for (let j = i + 1; j < this.bodies.length; j++) {
        const b = this.bodies[j];
        if (b.broken || b.kind === 'stand' || Math.abs(a.x - b.x) > (a.w + a.h + b.w + b.h) / 2) continue;
        // A thermometer passes through the vessel's hollow interior so its bulb can enter the sample.
        if ((a.kind === 'thermometer' && isVessel(b)) || (b.kind === 'thermometer' && isVessel(a))) continue;
        const collision = overlap(a, b);
        if (!collision) continue;
        const ah = a === this.held, bh = b === this.held;
        const ma = ah ? 0 : 1, mb = bh ? 0 : 1, sum = ma + mb;
        if (!sum) continue;
        const { normal: n, depth } = collision;
        const correction = Math.max(0, depth - .1) / sum;
        a.x -= n.x * correction * ma; a.y -= n.y * correction * ma;
        b.x += n.x * correction * mb; b.y += n.y * correction * mb;
        const relative = (b.vx - a.vx) * n.x + (b.vy - a.vy) * n.y;
        if (relative < 0) {
          const impulse = -relative * 1.12 / sum;
          a.vx -= impulse * n.x * ma; a.vy -= impulse * n.y * ma;
          b.vx += impulse * n.x * mb; b.vy += impulse * n.y * mb;
          if (relative < -540) { if (!ah) this._break(a); if (!bh) this._break(b); }
        }
        if (Math.abs(n.x) > .65) {
          const torque = clamp(depth, 0, 3) * .8 * dt;
          a.angularVelocity += torque * Math.sign(n.x) * ma;
          b.angularVelocity -= torque * Math.sign(n.x) * mb;
        }
      }
    }
  }

  _pour(body, dt) {
    const available = volume(body.mixture);
    if (!isVessel(body) || body.sealed || available < .00001) { body._pourTimer = 0; return; }
    const angle = Math.abs(normalAngle(body.angle));
    const empty = 1 - clamp(available / body.capacity, 0, 1);
    const threshold = body.kind === 'evaporating_dish' ? .12 + empty * .30 : body.kind === 'crucible' ? .3 + empty * .6 : .48 + empty * .78;
    if (angle < threshold) { body._pourTimer = 0; return; }
    let pourDt = dt;
    if (body.kind === 'dropper') {
      body._pourTimer += dt;
      if (body._pourTimer < .1 - 1e-6) return;
      pourDt = body._pourTimer;
      body._pourTimer = 0;
    }
    const rate = Math.min(specFor(body.kind).maxFlow || Infinity, 18 + (angle - threshold) * 68);
    const flow = Math.min(available, rate * pourDt);
    const parcel = createMixture();
    const moved = transfer(body.mixture, parcel, flow);
    if (!moved && volume(parcel) < .000001) return;
    const mouth = mouthPosition(body);
    this.addParticle({ type: 'drop', x: mouth.x + Math.sin(body.angle) * 4, y: mouth.y - Math.cos(body.angle) * 4,
      vx: Math.sin(body.angle) * 32, vy: -Math.cos(body.angle) * 24 + 15,
      color: color(parcel), size: 2.5 + Math.min(2, flow), life: 10, mixture: parcel, sourceId: body.id });
  }

  _spill(mixture, x, label = '') {
    const amount = volume(mixture);
    if (amount <= .000001) return;
    let puddle = this.puddles.find(p => Math.abs(p.x - x) < Math.max(30, p.width / 2));
    if (!puddle) {
      puddle = { x: clamp(x, LEFT, RIGHT), y: FLOOR + 2, width: 16, amount: 0, color: color(mixture), mixture: createMixture(), life: 99999 };
      this.puddles.push(puddle);
    }
    transfer(mixture, puddle.mixture, amount);
    puddle.amount = volume(puddle.mixture);
    puddle.width = Math.min(240, 14 + Math.sqrt(puddle.amount) * 15);
    puddle.color = color(puddle.mixture);
    if (!puddle.announced && puddle.amount > 2) {
      puddle.announced = true;
      this._event({ type: 'spill', title: 'Вещество пролилось', description: 'Капли попали на стол. Протрите поверхность кнопкой «Убрать пролив».', body: null });
    }
  }

  _receive(particle, previous) {
    for (const body of this.bodies) {
      if (!isVessel(body) || body.sealed || body.id === particle.sourceId || Math.abs(normalAngle(body.angle)) > 1.15) continue;
      const p0 = localPoint(body, previous.x, previous.y);
      const p1 = localPoint(body, particle.x, particle.y);
      const rim = -body.h / 2;
      if (p0.y > rim + 3 || p1.y < rim || p1.y <= p0.y) continue;
      const fraction = clamp((rim - p0.y) / (p1.y - p0.y), 0, 1);
      const crossing = p0.x + (p1.x - p0.x) * fraction;
      if (Math.abs(crossing) > body.mouthWidth / 2 + 2) continue;
      const room = Math.max(0, body.capacity - volume(body.mixture));
      const accepted=transfer(particle.mixture, body.mixture, Math.min(room, volume(particle.mixture)));
      if(accepted>0&&Number.isInteger(particle.sourceId)){
        body.receivedFrom ||= {};
        body.receivedFrom[particle.sourceId]=(body.receivedFrom[particle.sourceId]||0)+accepted;
      }
      body.color = color(body.mixture);
      if (volume(particle.mixture) > .000001) {
        // Full vessels overflow visibly down their outside.
        particle.x = body.x + Math.sign(crossing || 1) * (body.w / 2 + 5);
        particle.y = body.y;
        particle.sourceId = body.id;
        particle.vx = Math.sign(crossing || 1) * 35;
        return false;
      }
      this.emit('bubble', body.x + crossing, body.y - body.h * .2, 1, { life: .35, size: 2, color: body.color, vx: 0, vy: -10 });
      return true;
    }
    return false;
  }

  _particles(dt) {
    const retained = [];
    // Snapshot: reception can emit decorative bubbles while particles are being integrated.
    const active = this.particles;
    this.particles = [];
    for (const p of active) {
      const previous = { x: p.x, y: p.y };
      p.life -= dt;
      if (p.type === 'drop' || p.type === 'shard') p.vy += GRAVITY * dt;
      else if (p.type === 'steam' || p.type === 'smoke') { p.vy -= 35 * dt; p.vx *= Math.exp(-.6 * dt); p.size += 4 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.mixture) {
        if (this._receive(p, previous)) continue;
        if (p.y >= FLOOR || p.life <= 0 || p.x < LEFT || p.x > RIGHT) {
          this._spill(p.mixture, p.x);
          continue;
        }
      } else if (p.type === 'shard' && p.y > FLOOR) { p.y = FLOOR; p.vy *= -.15; p.vx *= .8; }
      if (p.life > 0) retained.push(p);
    }
    this.particles = [...retained, ...this.particles];
  }

  _chemistry(body, dt) {
    if (!isVessel(body)) return;
    if (!body.canSeal) body.sealed = false;
    const ext = halfExtents(body);
    let heat = 0;
    for (const burner of this.bodies) {
      if (!['burner', 'hotplate'].includes(burner.kind) || !burner.lit || burner.broken || Math.abs(normalAngle(burner.angle)) > .45) continue;
      const electric = burner.kind === 'hotplate';
      const flameTop = burner.y - burner.h / 2 - (electric ? 0 : 24);
      const distance = flameTop - (body.y + ext.y);
      const lateral = electric ? burner.w / 2 + body.w / 2 - 10 : body.w / 2 + 15;
      if (Math.abs(body.x - burner.x) < lateral && distance > (electric ? -8 : -28) && distance < (electric ? 15 : 115)) {
        const coupling = electric ? 1 - Math.max(0, distance) / 20 : 1 - Math.max(0, distance) / 160;
        heat = Math.max(heat, coupling * (specFor(body.kind).heatTransfer || 1));
      }
    }
    body.heat = heat;
    const events = stepChemistry(body.mixture, dt, { heating: heat, sealed: body.sealed, capacity: body.capacity }) || [];
    body.color = color(body.mixture);
    for (const event of events) {
      if (event.type === 'explosion') { this._break(body, true); continue; }
      this._event({ ...event, body });
      if (event.type === 'boil' && !body.sealed) this.emit('steam', body.x, body.y - body.h / 2, 5, { color: '#c4dfd7', speed: 14, life: 1.2 });
      if (event.type === 'gas' || (event.type === 'boil' && body.sealed)) this.emit('bubble', body.x, body.y, 6, { color: '#c9dfd8', speed: 10, life: .8 });
    }
    const activity = body.mixture.activity || {};
    if (!body.sealed && activity.boil > .05 && Math.random() < dt * 16) {
      this.addParticle({ type: 'steam', x: body.x + (Math.random() - .5) * body.mouthWidth,
        y: mouthPosition(body).y, vx: (Math.random() - .5) * 10, vy: -25 - Math.random() * 18,
        size: 3, color: '#c9dfd8', life: 1.4 });
    }
  }

  _thermometer(body, dt) {
    const tipOffset = body.h / 2 - 6;
    const tip = { x: body.x - Math.sin(body.angle) * tipOffset, y: body.y + Math.cos(body.angle) * tipOffset };
    let target = 22, nearest = Infinity;
    body.readingSource = null;
    for (const vessel of this.bodies) {
      if (!isVessel(vessel) || volume(vessel.mixture) <= .05) continue;
      const point = localPoint(vessel, tip.x, tip.y);
      const fill = clamp(volume(vessel.mixture) / vessel.capacity, 0, 1);
      const surface = vessel.h / 2 - vessel.h * .85 * fill;
      if (Math.abs(point.x) > vessel.w / 2 - 2 || point.y < surface - 6 || point.y > vessel.h / 2 + 5) continue;
      const distance = Math.hypot(point.x, point.y - (surface + vessel.h / 2) / 2);
      if (distance < nearest) {
        nearest = distance;
        target = finite(vessel.mixture.temperature, 22);
        body.readingSource = vessel.label;
      }
    }
    body.reading = finite(body.reading, 22) + (target - finite(body.reading, 22)) * (1 - Math.exp(-dt * 1.8));
  }

  step(dt) {
    if (this.paused || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .05);
    this.time += dt;
    this.shake *= Math.exp(-8 * dt);
    this.flash = Math.max(0, this.flash - dt);
    const substeps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const slice = dt / substeps;
    for (let s = 0; s < substeps; s++) {
      for (const body of this.bodies) {
        body._age += slice;
        if (body.broken || body === this.held) continue;
        const previousBottom = body.y + halfExtents(body).y;
        body.vy += GRAVITY * slice;
        body.vx *= Math.exp(-.15 * slice);
        body.x += body.vx * slice;
        body.y += body.vy * slice;
        body.angle = normalAngle(body.angle + body.angularVelocity * slice);
        this._standSupport(body, previousBottom);
        this._floor(body, slice);
      }
      this._collisions(slice);
      for (const body of this.bodies) if (body !== this.held && !body.broken) this._floor(body, slice);
      this._particles(slice);
    }
    for (const body of this.bodies) {
      if (['burner', 'hotplate'].includes(body.kind) && Math.abs(normalAngle(body.angle)) > .45) body.lit = false;
      this._chemistry(body, dt);
      this._pour(body, dt);
      if (body.kind === 'thermometer') this._thermometer(body, dt);
    }
    // Puddles mix and react too, but can never build pressure.
    for (const puddle of this.puddles) {
      const events = stepChemistry(puddle.mixture, dt, { heating: 0, sealed: false }) || [];
      puddle.color = color(puddle.mixture);
      puddle.amount = volume(puddle.mixture);
      for (const event of events) if (event.type === 'reaction' || event.type === 'precipitate') this._event({ ...event, title: `${event.title} — на столе`, body: null });
    }
  }

  clear() {
    this.bodies = []; this.particles = []; this.puddles = [];
    this.held = this.selected = null; this.shake = 0; this.flash = 0;
  }

  serialize() {
    return {
      version: 1, time: this.time, paused: this.paused, nextId: this.nextId,
      bodies: this.bodies.filter(b => !b.broken).map(b => ({ id: b.id, kind: b.kind, x: b.x, y: b.y,
        angle: b.angle, vx: 0, vy: 0, angularVelocity: 0, mixture: b.mixture, label: b.label,
        formula: b.formula, color: b.color, sealed: b.sealed, lit: false, receivedFrom:b.receivedFrom||{} })),
      puddles: this.puddles.map(p => ({ x: p.x, mixture: p.mixture })),
      // Preserve trajectory and source attribution so a partly poured dose can finish after loading.
      drops: this.particles.filter(p => p.mixture).map(p => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy,
        life: p.life, maxLife: p.maxLife, size: p.size, sourceId: p.sourceId, mixture: p.mixture })),
    };
  }

  restore(data) {
    if (!data || !Array.isArray(data.bodies)) return false;
    this.clear();
    this.time = Math.max(0, finite(data.time));
    this.paused = data.paused === true;
    const usedIds=new Set();
    for (const saved of data.bodies.slice(0, 60)) {
      if (!saved || typeof saved !== 'object') continue;
      const body = this.create(saved.kind, finite(saved.x, 600), finite(saved.y, 300), { label: saved.label, sealed: saved.sealed });
      if(Number.isSafeInteger(saved.id)&&saved.id>0&&!usedIds.has(saved.id))body.id=saved.id;
      while(usedIds.has(body.id))body.id=this.nextId++;
      usedIds.add(body.id);this.nextId=Math.max(this.nextId,body.id+1);
      body.receivedFrom={};
      for(const [id,ml]of Object.entries(saved.receivedFrom||{}).slice(0,60))if(Number.isSafeInteger(Number(id))&&Number(id)>0&&Number.isFinite(ml)&&ml>0)body.receivedFrom[id]=Math.min(ml,100000);
      body.angle = normalAngle(finite(saved.angle));
      body.mixture = cleanMixture(saved.mixture);
      body.formula = typeof saved.formula === 'string' ? saved.formula.slice(0, 40) : '';
      body.color = color(body.mixture);
      body.lit = false;
      if (volume(body.mixture) > body.capacity && body.capacity > 0) {
        const excess = createMixture(); transfer(body.mixture, excess, volume(body.mixture) - body.capacity); this._spill(excess, body.x);
      }
    }
    for (const saved of (Array.isArray(data.puddles) ? data.puddles : []).slice(0, 500)) {
      if (saved?.mixture) this._spill(cleanMixture(saved.mixture), finite(saved.x, 600));
    }
    for (const saved of (Array.isArray(data.drops) ? data.drops : []).slice(0, 3000)) {
      if (!saved?.mixture) continue;
      const mixture = cleanMixture(saved.mixture);
      if (volume(mixture) <= .000001) continue;
      const hasTrajectory = ['x', 'y', 'vx', 'vy', 'life'].every(key => Number.isFinite(saved[key]))
        && saved.life > 0 && Number.isSafeInteger(saved.sourceId) && saved.sourceId > 0;
      if (!hasTrajectory) {
        // Older saves contain only x and mixture; keep their former spill behavior.
        this._spill(mixture, finite(saved.x, 600));
        continue;
      }
      this.addParticle({ type: 'drop', mixture, color: color(mixture), sourceId: saved.sourceId,
        x: clamp(saved.x, LEFT, RIGHT), y: clamp(saved.y, -600, FLOOR - .01),
        vx: clamp(saved.vx, -1000, 1000), vy: clamp(saved.vy, -1000, 1500),
        life: clamp(saved.life, .001, 10), maxLife: clamp(finite(saved.maxLife, 10), .001, 10),
        size: clamp(finite(saved.size, 3), 1, 8) });
      this.nextId = Math.max(this.nextId, saved.sourceId + 1);
    }
    this.nextId = Math.max(this.nextId, finite(data.nextId, 1));
    return true;
  }
}

function cleanMixture(input) {
  const result = createMixture();
  if (!input || typeof input !== 'object') return result;
  for (const [id, amount] of Object.entries(input.amounts || {})) {
    if (SUBSTANCES[id] && Number.isFinite(amount) && amount > 0) result.amounts[id] = Math.min(amount, 100000);
  }
  result.temperature = clamp(finite(input.temperature, 22), -20, 600);
  if (Number.isFinite(input.pressure)) result.pressure = clamp(input.pressure, 1, 5);
  for (const field of ['gasAmounts', 'escaped']) {
    result[field] = {};
    for (const [id, amount] of Object.entries(input[field] || {})) {
      if (SUBSTANCES[id] && Number.isFinite(amount) && amount > 0) result[field][id] = Math.min(amount, 100000);
    }
  }
  result.ruptured = input.ruptured === true;
  result.gasSample = input.gasSample === true;
  result.physicallyMixed = input.physicallyMixed === true;
  if(Number.isFinite(input.gasHeadspaceMl)&&input.gasHeadspaceMl>0)result.gasHeadspaceMl=Math.min(input.gasHeadspaceMl,100000);
  result.clock = Math.max(0, finite(input.clock));
  result.lastEvents = {};
  for (const [key, value] of Object.entries(input.lastEvents || {})) if (Number.isFinite(value)) result.lastEvents[key] = Math.max(0, value);
  // An absent field marks a legacy sample whose product can be inferred from
  // reaction history. An explicit empty array deliberately clears that claim.
  if (Object.hasOwn(input, 'formedProducts')) {
    result.formedProducts = Array.isArray(input.formedProducts) ? [...new Set(input.formedProducts.filter(id => Object.hasOwn(SUBSTANCES, id)))].slice(0,64) : [];
  }
  result.activity = {};
  for (const key of ['gas', 'boil', 'reaction', 'precipitate']) result.activity[key] = clamp(finite(input.activity?.[key]), 0, 100);
  return result;
}
