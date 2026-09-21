// Game rules are independent of Vue, rendering and business data.
export const SIZES = ['Chico', 'Mediano', 'Grande'];
export const MODES = [
  { id: 'limpiar', number: '01', title: 'Manos a la obra', tag: 'DESTREZA', description: 'Limpia, clasifica y encadena una buena racha.', duration: 60, goal: 450, icon: 'shrimp', steps: ['Desliza sobre el camarón para limpiarlo. También puedes tocarlo.', 'Ya limpio, arrástralo a la tara de su tamaño o toca la tara.', 'Cada acierto suma. Una tara incorrecta rompe la racha y resta 3 segundos.'] },
  { id: 'equipo', number: '02', title: 'La mejor cuadrilla', tag: 'ESTRATEGIA', description: 'Organiza a tu equipo y entrega cada pedido a tiempo.', duration: 75, goal: 500, icon: 'worker', steps: ['Toca un pedido y luego una despicadora libre para asignarlo.', 'Cada una tiene una especialidad: el mismo tamaño se termina más rápido.', 'Entrega antes de que venza el pedido. Si se pierden tres, termina la jornada.'] },
  { id: 'atrapar', number: '03', title: '¡A la tara!', tag: 'REFLEJOS', description: 'Atrapa la buena pesca. ¡Cuidado con las piedras!', duration: 60, goal: 500, icon: 'basket', steps: ['Arrastra la tara de lado a lado. También puedes usar los botones o las flechas.', 'Atrapa camarones; los dorados valen el triple. Dejar pasar uno rompe la racha.', 'Evita las piedras grises. Tienes tres vidas y una segunda oportunidad después de cada golpe.'] }
];

export function createGame(mode, random = Math.random) {
  const spec = MODES.find(item => item.id === mode);
  if (!spec) throw new Error('Modo desconocido');
  const game = {
    mode, duration: spec.duration, remaining: spec.duration, score: 0, combo: 0, bestCombo: 0,
    completed: 0, mistakes: 0, lives: 3, elapsed: 0, done: false, reason: '',
    feedback: '¡Vamos, equipo!', feedbackTime: 2, event: 0, goodEvent: true,
    shrimp: null, orders: [], selected: null,
    workers: [{ name: 'Ana', size: 0, job: null }, { name: 'Lola', size: 1, job: null }, { name: 'Mar', size: 2, job: null }],
    drops: [], basket: 0.5, invincible: 0, spawnIn: 0.7, nextId: 0, random
  };
  if (mode === 'limpiar') newShrimp(game);
  if (mode === 'equipo') for (let i = 0; i < 3; i++) newOrder(game);
  return game;
}

const pickSize = game => Math.min(2, Math.floor(game.random() * 3));
function newShrimp(game) { game.shrimp = { id: ++game.nextId, size: pickSize(game), clean: false }; }
function newOrder(game) {
  const deadline = Math.max(10, 19 - game.elapsed / 10);
  game.orders.push({ id: ++game.nextId, size: pickSize(game), remaining: deadline, deadline });
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

export function cleanShrimp(game) {
  if (game.done || game.mode !== 'limpiar' || game.shrimp.clean) return;
  game.shrimp.clean = true; say(game, '¡Limpio! Elige su tara.');
}
export function sortShrimp(game, size) {
  if (game.done || game.mode !== 'limpiar') return;
  if (!game.shrimp.clean) { say(game, 'Primero limpia el camarón', false); return; }
  if (size !== game.shrimp.size) {
    game.remaining = Math.max(0, game.remaining - 3);
    miss(game, 'Esa tara no: −3 s. Intenta otra.');
    if (!game.remaining) endGame(game, 'tiempo');
    return;
  }
  reward(game, 10, '¡Bien clasificado!'); newShrimp(game);
}
export function selectOrder(game, id) {
  if (!game.done && game.orders.some(order => order.id === id)) game.selected = id;
}
export function assignOrder(game, index) {
  if (game.done || game.mode !== 'equipo') return;
  const worker = game.workers[index];
  if (!worker || worker.job) return;
  const order = game.orders.find(item => item.id === game.selected);
  if (!order) { say(game, 'Primero elige un pedido', false); return; }
  const duration = worker.size === order.size ? 2.5 : 5;
  worker.job = { ...order, work: duration, duration };
  game.orders = game.orders.filter(item => item.id !== order.id); game.selected = null;
  say(game, worker.size === order.size ? `${worker.name}: ¡es mi especialidad!` : `${worker.name} ya está trabajando`);
}
export function moveBasket(game, position) { game.basket = Math.max(0.11, Math.min(0.89, position)); }

// Coordinates are normalized to a 360 × 360 playfield, independent of screen/DPR.
export function stepGame(game, delta) {
  if (game.done || delta <= 0) return;
  const dt = Math.min(delta, game.remaining);
  game.elapsed += dt; game.remaining = Math.max(0, game.remaining - dt);
  game.feedbackTime = Math.max(0, game.feedbackTime - dt);
  if (game.mode === 'equipo') {
    for (const worker of game.workers) {
      if (!worker.job) continue;
      const job = worker.job;
      job.work -= dt; job.remaining -= dt;
      if (job.work <= 0 && job.remaining >= job.work) { reward(game, 30, `${worker.name}: ¡pedido listo!`); worker.job = null; }
      else if (job.remaining <= 0) { miss(game, 'Se venció un pedido', true); worker.job = null; }
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
    if (game.spawnIn <= 0 && game.orders.length < 3) { newOrder(game); game.spawnIn = Math.max(2, 4 - game.elapsed / 45); }
  }
  if (game.mode === 'atrapar') {
    game.invincible = Math.max(0, game.invincible - dt);
    game.spawnIn -= dt;
    if (game.spawnIn <= 0) {
      const roll = game.random();
      game.drops.push({ id: ++game.nextId, x: 0.09 + game.random() * 0.82, y: -0.08, kind: roll < 0.23 ? 'rock' : roll > 0.9 ? 'gold' : 'shrimp', speed: 0.24 + game.elapsed * 0.003 });
      game.spawnIn = Math.max(0.38, 0.9 - game.elapsed * 0.008);
    }
    game.drops = game.drops.filter(drop => {
      if (game.done) return true;
      const previousY = drop.y;
      drop.y += drop.speed * dt;
      if (previousY <= 0.84 && drop.y >= 0.77 && Math.abs(drop.x - game.basket) < 0.12) {
        if (drop.kind === 'rock') {
          if (!game.invincible) { miss(game, '¡Piedra! −1 vida', true); game.invincible = 1.2; }
        } else reward(game, drop.kind === 'gold' ? 30 : 10, drop.kind === 'gold' ? '¡Camarón dorado!' : '¡Buena pesca!');
        return false;
      }
      if (drop.y > 1.08) { if (drop.kind !== 'rock') game.combo = 0; return false; }
      return true;
    });
  }
  if (!game.remaining && !game.done) endGame(game, 'tiempo');
}

export function snapshot(game) {
  return {
    remaining: Math.ceil(game.remaining), progress: game.remaining / game.duration,
    score: game.score, combo: game.combo, bestCombo: game.bestCombo, completed: game.completed,
    mistakes: game.mistakes, lives: game.lives, feedback: game.feedbackTime > 0 ? game.feedback : '',
    goodEvent: game.goodEvent, selected: game.selected, shrimp: game.shrimp && { ...game.shrimp },
    orders: game.orders.map(order => ({ ...order })),
    workers: game.workers.map(worker => ({ ...worker, job: worker.job && { ...worker.job } }))
  };
}

export const STORAGE_KEY = 'reypez.marea-arcade.v1';
export function loadRecords(storage) {
  const records = { limpiar: 0, equipo: 0, atrapar: 0 };
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    for (const key of Object.keys(records)) if (saved && Number.isSafeInteger(saved[key]) && saved[key] >= 0) records[key] = saved[key];
  } catch (_) { /* Corrupt or unavailable storage must not prevent play. */ }
  return records;
}
