/* Pure game-rule checks: node scripts/test-marea.cjs */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const file = path.resolve(__dirname, '../src/games/marea/engine.js');
const compiled = new Module(file, module);
compiled._compile(require('@babel/core').transformSync(fs.readFileSync(file, 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
}).code, file);
const { createGame, stepGame, cleanShrimp, discardShrimp, sortShrimp, selectOrder, assignOrder, deliverOrder, restWorker, moveBasket, loadRecords } = compiled.exports;
const advance = (g, seconds) => { for (let i = 0; i < seconds * 20; i++) stepGame(g, 0.05); };

test('clean before sorting, penalties, combos, and a terminal clock', () => {
  const g = createGame('limpiar', () => 0);
  sortShrimp(g, 0); assert.equal(g.score, 0);
  cleanShrimp(g, 'right'); assert.equal(g.shrimp.step, 0); assert.ok(g.shrimp.freshness < g.shrimp.deadline);
  cleanShrimp(g, 'left'); assert.equal(g.shrimp.clean, false); cleanShrimp(g, 'left');
  sortShrimp(g, 1); assert.equal(g.lives, 2);
  for (let i = 0; i < 5; i++) { g.shrimp.bad = false; cleanShrimp(g, 'left'); cleanShrimp(g, 'left'); sortShrimp(g, 0); }
  assert.equal(g.score, 150); assert.equal(g.bestCombo, 5);
  g.remaining = .1; stepGame(g, .2); assert.equal(g.done, true); assert.equal(g.remaining, 0);
  cleanShrimp(g, 'left'); sortShrimp(g, 0); assert.equal(g.score, 150);
});
test('specialist completes first; a busy worker cannot take a second job', () => {
  const g = createGame('equipo', () => 0);
  selectOrder(g, g.orders[0].id); assignOrder(g, 0);
  selectOrder(g, g.orders[0].id); assignOrder(g, 0); assert.equal(g.orders.length, 2);
  assignOrder(g, 1); advance(g, 2);
  assert.equal(g.workers[0].job.work, 0); assert.ok(g.workers[1].job.work > 0); assert.equal(g.completed, 0);
  deliverOrder(g, 0); assert.equal(g.workers[0].job, null); assert.equal(g.completed, 1);
  advance(g, 1.5); deliverOrder(g, 1); assert.equal(g.workers[1].job, null); assert.equal(g.completed, 2);
  assert.ok(g.workers[0].energy < 100); restWorker(g, 0); advance(g, 4); assert.equal(g.workers[0].energy, 100);
});
test('expired queued and assigned orders cost lives; three misses end the shift', () => {
  const g = createGame('equipo', () => 0);
  g.orders[0].remaining = 0.1; selectOrder(g, g.orders[0].id); assignOrder(g, 0);
  stepGame(g, 0.2); assert.equal(g.lives, 2); assert.equal(g.completed, 0); assert.equal(g.workers[0].job, null);
  for (const order of g.orders) order.remaining = 0.1;
  stepGame(g, 0.2); assert.equal(g.lives, 0); assert.equal(g.done, true); assert.equal(g.reason, 'vidas');
});
test('basket bounds, catch reward, invincibility and no rewards after death', () => {
  const g = createGame('atrapar', () => 0.5);
  moveBasket(g, -10); assert.equal(g.basket, 0.11); moveBasket(g, 10); assert.equal(g.basket, 0.89); moveBasket(g, 0.5);
  const drop = kind => ({ x: 0.5, y: 0.76, speed: 0.3, kind });
  g.drops = [drop('gold')]; stepGame(g, 0.1); assert.equal(g.score, 45);
  g.drops = [drop('rock'), drop('rock')]; stepGame(g, 0.1); assert.equal(g.lives, 2);
  g.invincible = 0; g.lives = 1; g.drops = [drop('rock'), drop('gold')]; stepGame(g, 0.1);
  assert.equal(g.done, true); assert.equal(g.score, 45); assert.equal(g.lives, 0);
});
test('games end at their time limit; falling objects stay bounded', () => {
  for (const mode of ['limpiar', 'equipo', 'atrapar']) {
    const g = createGame(mode, () => 0.5);
    advance(g, 100); assert.equal(g.done, true); assert.ok(g.drops.length < 15); assert.ok(g.particles.length <= 48);
  }
});
test('invalid and blocked local storage degrade to clean records', () => {
  assert.deepEqual(loadRecords({ getItem: () => '{oops' }), { limpiar: 0, equipo: 0, atrapar: 0 });
  assert.deepEqual(loadRecords({ getItem: () => '{"limpiar":40,"equipo":-9,"atrapar":"900"}' }), { limpiar: 40, equipo: 0, atrapar: 0 });
  assert.deepEqual(loadRecords({ getItem: () => { throw Error('blocked'); } }), { limpiar: 0, equipo: 0, atrapar: 0 });
});

test('quality rejection, spoilage and shorter freshness in later waves', () => {
  const g = createGame('limpiar', () => .5); const initial = g.shrimp.deadline;
  g.shrimp.bad = true; discardShrimp(g); assert.equal(g.score, 15);
  discardShrimp(g); assert.equal(g.lives, 2);
  g.elapsed = 45; g.shrimp.freshness = .01; stepGame(g, .02);
  assert.equal(g.lives, 1); assert.ok(g.shrimp.deadline < initial);
});
test('a finished job still expires until it is delivered; fatigue slows processing', () => {
  const g = createGame('equipo', () => .5);
  selectOrder(g, g.orders[0].id); assignOrder(g, 1); const rested = g.workers[1].job.duration;
  g.workers[0].energy = 0; selectOrder(g, g.orders[0].id); assignOrder(g, 0);
  assert.ok(g.workers[0].job.duration > rested);
  g.workers[1].job.work = 0; g.workers[1].job.remaining = .01; stepGame(g, .02);
  assert.equal(g.workers[1].job, null); assert.equal(g.lives, 2); assert.equal(g.completed, 0);
});
test('shield absorbs a hit, ice slows drops, three lost shrimp cost a life', () => {
  const g = createGame('atrapar', () => .5);
  const item = kind => ({ x: .5, y: .76, speed: .4, kind });
  g.drops = [item('shield')]; stepGame(g, .1); assert.equal(g.shield, 1);
  g.drops = [item('rock')]; stepGame(g, .1); assert.equal(g.lives, 3); assert.equal(g.shield, 0);
  g.drops = [item('ice')]; stepGame(g, .1); assert.equal(g.frozen, 5);
  g.drops = [{ x: .1, y: .2, speed: .4, kind: 'shrimp' }]; stepGame(g, .1); assert.ok(g.drops[0].y < .23);
  g.drops = Array.from({ length: 3 }, () => ({ x: .05, y: 1.09, speed: .4, kind: 'shrimp' }));
  stepGame(g, .1); assert.equal(g.lives, 2); assert.equal(g.lost, 0);
});
