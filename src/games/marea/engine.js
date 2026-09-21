// Game rules are independent of Vue, rendering and business data.
export const SIZES = ['Chico', 'Mediano', 'Grande'];
export const MODES = [
  { id: 'limpiar', number: '01', title: 'Manos a la obra', tag: 'PRECISIÓN', description: 'Dos cortes, buena frescura y cero errores de calidad.', duration: 75, goal: 700, icon: 'shrimp', steps: ['Sigue las dos flechas, una por gesto: quitar cabeza y pelar. Puedes usar los botones de dirección.', 'Clasifica por tamaño antes de que se agote la frescura. Los camarones manchados deben ir a descarte.', 'Un gesto incorrecto resta frescura. Equivocar la tara, dejar vencer o no detectar uno manchado cuesta una vida. Cada oleada da menos tiempo.'] },
  { id: 'equipo', number: '02', title: 'La mejor cuadrilla', tag: 'ESTRATEGIA', description: 'Prioriza pedidos, cuida la energía y despacha a tiempo.', duration: 90, goal: 2000, icon: 'worker', steps: ['Elige un pedido y una despicadora. Hay lotes de 1 a 3 taras y pedidos urgentes con menos tiempo.', 'La especialidad acelera el trabajo; el cansancio lo retrasa. Usa Descansar cuando esté libre para recuperar energía.', 'Al terminar, toca Entregar antes del vencimiento. Los pedidos siguen llegando y perder tres termina la jornada.'] },
  { id: 'atrapar', number: '03', title: '¡A la tara!', tag: 'SUPERVIVENCIA', description: 'Corrientes, oleadas y una pesca que no da tregua.', duration: 75, goal: 900, icon: 'basket', steps: ['Arrastra la tara o usa las flechas. Las corrientes desvían la caída y cada oleada trae más velocidad.', 'Atrapa camarones dorados ×3. El escudo azul absorbe un golpe y el hielo ralentiza la caída durante 5 segundos.', 'Esquiva las piedras. Cada 3 camarones perdidos cuestan una vida. Tienes tres vidas para resistir la marea.'] }
];

export function createGame(mode, random = Math.random) {
  const spec = MODES.find(item => item.id === mode);
  if (!spec) throw new Error('Modo desconocido');
  const game = {
    mode, duration: spec.duration, remaining: spec.duration, score: 0, combo: 0, bestCombo: 0,
    completed: 0, mistakes: 0, lives: 3, elapsed: 0, done: false, reason: '',
    feedback: '¡Vamos, equipo!', feedbackTime: 2, event: 0, goodEvent: true,
    shrimp: null, orders: [], selected: null, level: 1,
    workers: [{ name: 'Ana', size: 0 }, { name: 'Lola', size: 1 }, { name: 'Mar', size: 2 }].map(w => ({ ...w, job: null, energy: 100, resting: 0 })),
    drops: [], particles: [], basket: 0.5, invincible: 0, shield: 0, frozen: 0, lost: 0, current: 0,
    spawnIn: 0.5, nextId: 0, random
  };
  if (mode === 'limpiar') newShrimp(game);
  if (mode === 'equipo') for (let i = 0; i < 3; i++) newOrder(game);
  return game;
}

const pickSize = game => Math.min(2, Math.floor(game.random() * 3));
export const DIRECTIONS = ['left', 'right', 'up'];
function newShrimp(game) {
  const deadline = Math.max(3.5, 7.5 - game.level * 0.6);
  game.shrimp = { id: ++game.nextId, size: pickSize(game), clean: false, step: 0,
    sequence: [DIRECTIONS[Math.floor(game.random() * 3)], DIRECTIONS[Math.floor(game.random() * 3)]],
    bad: game.nextId > 2 && game.random() < 0.2, freshness: deadline, deadline };
}
function newOrder(game) {
  const quantity = 1 + Math.floor(game.random() * 3);
  const urgent = game.random() < 0.25;
  const deadline = Math.max(9, 16 + quantity * 1.5 - game.level * 1.2 - (urgent ? 4 : 0));
  game.orders.push({ id: ++game.nextId, size: pickSize(game), quantity, urgent, remaining: deadline, deadline });
}
function say(game, text, good = true) {
  game.feedback = text; game.feedbackTime = 1.6; game.goodEvent = good; game.event++;
}
function reward(game, base, label) {
  game.combo++; game.bestCombo = Math.max(game.bestCombo, game.combo); game.completed++;
  const points = base * Math.min(3, 1 + Math.floor(game.combo / 5));
  game.score += points; say(game, `${label} +${points}`);
}
function miss(game, label, loseLife = false) {
  game.combo = 0; game.mistakes++;
  if (loseLife) game.lives = Math.max(0, game.lives - 1);
  say(game, label, false);
  if (game.lives === 0) endGame(game, 'vidas');
}
function endGame(game, reason) { game.done = true; game.reason = reason; }

export function cleanShrimp(game, direction) {
  if (game.done || game.mode !== 'limpiar' || game.shrimp.clean) return;
  if (direction !== game.shrimp.sequence[game.shrimp.step]) {
    game.shrimp.freshness = Math.max(0, game.shrimp.freshness - 1.5);
    game.combo = 0; say(game, 'Dirección incorrecta: −1.5 s de frescura', false);
    if (!game.shrimp.freshness) { miss(game, 'Se perdió la frescura: −1 vida', true); if (!game.done) newShrimp(game); }
    return;
  }
  game.shrimp.step++;
  game.shrimp.clean = game.shrimp.step === 2;
  say(game, game.shrimp.clean ? '¡Limpio! Revisa calidad y tamaño.' : 'Cabeza fuera. Ahora quita la cáscara.');
}
export function discardShrimp(game) {
  if (game.done || game.mode !== 'limpiar') return;
  if (game.shrimp.bad) reward(game, 15, '¡Buen control de calidad!');
  else miss(game, 'Era un camarón bueno: −1 vida', true);
  if (!game.done) newShrimp(game);
}
export function sortShrimp(game, size) {
  if (game.done || game.mode !== 'limpiar') return;
  if (!game.shrimp.clean) { say(game, 'Primero limpia el camarón', false); return; }
  if (size !== game.shrimp.size || game.shrimp.bad) {
    miss(game, game.shrimp.bad ? 'Tenía manchas: −1 vida' : 'Tamaño incorrecto: −1 vida', true);
    if (!game.done) newShrimp(game);
    return;
  }
  reward(game, game.shrimp.freshness > game.shrimp.deadline * 0.55 ? 25 : 15, '¡Bien clasificado!'); newShrimp(game);
}
export function selectOrder(game, id) {
  if (!game.done && game.orders.some(order => order.id === id)) game.selected = id;
}
export function assignOrder(game, index) {
  if (game.done || game.mode !== 'equipo') return;
  const worker = game.workers[index];
  if (!worker || worker.job || worker.resting > 0) return;
  const order = game.orders.find(item => item.id === game.selected);
  if (!order) { say(game, 'Primero elige un pedido', false); return; }
  const duration = order.quantity * (worker.size === order.size ? 1.8 : 3.2) * (1 + (100 - worker.energy) / 80);
  worker.job = { ...order, work: duration, duration };
  game.orders = game.orders.filter(item => item.id !== order.id); game.selected = null;
  say(game, worker.size === order.size ? `${worker.name}: ¡es mi especialidad!` : `${worker.name} ya está trabajando`);
}
export function deliverOrder(game, index) {
  const worker = game.workers[index];
  if (game.done || !worker || !worker.job || worker.job.work > 0) return;
  reward(game, worker.job.quantity * (worker.job.urgent ? 45 : 30), `${worker.name}: ¡entregado!`);
  worker.energy = Math.max(0, worker.energy - worker.job.quantity * 16); worker.job = null;
}
export function restWorker(game, index) {
  const worker = game.workers[index];
  if (!game.done && worker && !worker.job && !worker.resting) { worker.resting = 4; say(game, `${worker.name} recupera energía: 4 s`); }
}
export function moveBasket(game, position) { game.basket = Math.max(0.11, Math.min(0.89, position)); }

// Coordinates are normalized to a 360 × 360 playfield, independent of screen/DPR.
export function stepGame(game, delta) {
  if (game.done || delta <= 0) return;
  const dt = Math.min(delta, game.remaining);
  game.elapsed += dt; game.remaining = Math.max(0, game.remaining - dt);
  game.level = 1 + Math.floor(game.elapsed / 15);
  game.feedbackTime = Math.max(0, game.feedbackTime - dt);
  if (game.mode === 'limpiar') {
    game.shrimp.freshness -= dt;
    if (game.shrimp.freshness <= 0) { miss(game, 'Se perdió la frescura: −1 vida', true); if (!game.done) newShrimp(game); }
  }
  if (game.mode === 'equipo') {
    for (const worker of game.workers) {
      if (worker.resting > 0) { worker.energy = Math.min(100, worker.energy + Math.min(dt, worker.resting) * 22); worker.resting = Math.max(0, worker.resting - dt); }
      if (!worker.job) continue;
      const job = worker.job;
      const wasWorking = job.work > 0;
      job.work = Math.max(0, job.work - dt); job.remaining -= dt;
      if (job.remaining <= 0) { miss(game, 'Se venció un pedido', true); worker.job = null; }
      else if (wasWorking && !job.work) say(game, `${worker.name}: ¡toca Entregar!`);
      if (game.done) return;
    }
    game.orders = game.orders.filter(order => {
      order.remaining -= dt;
      if (order.remaining > 0) return true;
      if (game.selected === order.id) game.selected = null;
      if (!game.done) miss(game, 'Se venció un pedido', true);
      return false;
    });
    if (game.done) return;
    game.spawnIn -= dt;
    if (game.spawnIn <= 0 && game.orders.length < 4) { newOrder(game); game.spawnIn = Math.max(1.4, 3.5 - game.level * 0.35); }
  }
  if (game.mode === 'atrapar') {
    game.invincible = Math.max(0, game.invincible - dt);
    game.frozen = Math.max(0, game.frozen - dt);
    game.current = Math.sin(game.elapsed * 0.42) * (0.04 + game.level * 0.012);
    game.particles = game.particles.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += dt * 0.25; return p.life > 0; });
    game.spawnIn -= dt;
    if (game.spawnIn <= 0) {
      const roll = game.random();
      game.drops.push({ id: ++game.nextId, x: 0.09 + game.random() * 0.82, y: -0.08, kind: roll < 0.30 ? 'rock' : roll > 0.96 ? 'shield' : roll > 0.91 ? 'ice' : roll > 0.79 ? 'gold' : 'shrimp', speed: 0.30 + game.level * 0.07 });
      game.spawnIn = Math.max(0.25, 0.75 - game.level * 0.09);
    }
    game.drops = game.drops.filter(drop => {
      if (game.done) return true;
      const previousY = drop.y;
      drop.y += drop.speed * dt * (game.frozen > 0 ? 0.45 : 1);
      drop.x = Math.max(0.05, Math.min(0.95, drop.x + game.current * dt));
      if (previousY <= 0.84 && drop.y >= 0.77 && Math.abs(drop.x - game.basket) < 0.105) {
        if (drop.kind === 'rock') {
          if (!game.invincible) {
            if (game.shield) { game.shield = 0; say(game, '¡El escudo te protegió!'); }
            else miss(game, '¡Piedra! −1 vida', true);
            game.invincible = 1;
          }
        } else if (drop.kind === 'shield') { game.shield = 1; say(game, 'Escudo: protege de un golpe'); }
        else if (drop.kind === 'ice') { game.frozen = 5; say(game, '¡Hielo! Caída lenta durante 5 s'); }
        else reward(game, drop.kind === 'gold' ? 45 : 15, drop.kind === 'gold' ? '¡Camarón dorado!' : '¡Buena pesca!');
        for (let i = 0; i < 8 && game.particles.length < 48; i++) game.particles.push({ x: drop.x, y: 0.8, vx: Math.cos(i * Math.PI / 4) * 0.12, vy: Math.sin(i * Math.PI / 4) * 0.15 - 0.1, life: 0.5, color: drop.kind === 'rock' ? '#b1c3cf' : '#ffe099' });
        return false;
      }
      if (drop.y > 1.08) {
        if (drop.kind === 'shrimp' || drop.kind === 'gold') {
          game.combo = 0; game.lost++;
          if (game.lost === 3) { game.lost = 0; miss(game, '3 camarones perdidos: −1 vida', true); }
        }
        return false;
      }
      return true;
    });
  }
  if (!game.remaining && !game.done) endGame(game, 'tiempo');
}

export function snapshot(game) {
  return {
    remaining: Math.ceil(game.remaining), progress: game.remaining / game.duration,
    score: game.score, combo: game.combo, bestCombo: game.bestCombo, completed: game.completed,
    level: game.level, shield: game.shield, frozen: Math.ceil(game.frozen), lost: game.lost, current: game.current,
    mistakes: game.mistakes, lives: game.lives, feedback: game.feedbackTime > 0 ? game.feedback : '',
    goodEvent: game.goodEvent, selected: game.selected, shrimp: game.shrimp && { ...game.shrimp },
    orders: game.orders.map(order => ({ ...order })),
    workers: game.workers.map(worker => ({ ...worker, job: worker.job && { ...worker.job } }))
  };
}

// New rules have a separate leaderboard; previous records remain untouched.
export const STORAGE_KEY = 'reypez.marea-arcade.v2';
export function loadRecords(storage) {
  const records = { limpiar: 0, equipo: 0, atrapar: 0 };
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    for (const key of Object.keys(records)) if (saved && Number.isSafeInteger(saved[key]) && saved[key] >= 0) records[key] = saved[key];
  } catch (_) { /* Corrupt or unavailable storage must not prevent play. */ }
  return records;
}
