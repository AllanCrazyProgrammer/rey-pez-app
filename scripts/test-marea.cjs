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
const { createGame, stepGame, cleanShrimp, sortShrimp, selectOrder, assignOrder, moveBasket, loadRecords } = compiled.exports;
const advance = (g, seconds) => { for (let i = 0; i < seconds * 20; i++) stepGame(g, 0.05); };

test('clean before sorting, penalties, combos, and a terminal clock', () => {
  const g = createGame('limpiar', () => 0);
  sortShrimp(g, 0); assert.equal(g.score, 0);
  cleanShrimp(g); sortShrimp(g, 1); assert.equal(g.remaining, 57); assert.equal(g.shrimp.clean, true);
  sortShrimp(g, 0); assert.equal(g.score, 10); assert.equal(g.shrimp.clean, false);
  for (let i = 0; i < 4; i++) { cleanShrimp(g); sortShrimp(g, 0); }
  assert.equal(g.score, 60); assert.equal(g.bestCombo, 5);
  advance(g, 61); assert.equal(g.done, true); assert.equal(g.remaining, 0);
  cleanShrimp(g); sortShrimp(g, 0); assert.equal(g.score, 60);
});
test('specialist completes first; a busy worker cannot take a second job', () => {
  const g = createGame('equipo', () => 0);
  selectOrder(g, g.orders[0].id); assignOrder(g, 0);
  selectOrder(g, g.orders[0].id); assignOrder(g, 0); assert.equal(g.orders.length, 2);
  assignOrder(g, 1); advance(g, 2.6);
  assert.equal(g.workers[0].job, null); assert.ok(g.workers[1].job); assert.equal(g.completed, 1);
  advance(g, 2.5); assert.equal(g.workers[1].job, null); assert.equal(g.completed, 2);
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
  g.drops = [drop('gold')]; stepGame(g, 0.1); assert.equal(g.score, 30);
  g.drops = [drop('rock'), drop('rock')]; stepGame(g, 0.1); assert.equal(g.lives, 2);
  g.invincible = 0; g.lives = 1; g.drops = [drop('rock'), drop('gold')]; stepGame(g, 0.1);
  assert.equal(g.done, true); assert.equal(g.score, 30); assert.equal(g.lives, 0);
});
test('games end at their time limit; falling objects stay bounded', () => {
  for (const mode of ['limpiar', 'equipo', 'atrapar']) {
    const g = createGame(mode, () => 0.5);
    advance(g, 80); assert.equal(g.done, true); assert.ok(g.drops.length < 15);
  }
});
test('invalid and blocked local storage degrade to clean records', () => {
  assert.deepEqual(loadRecords({ getItem: () => '{oops' }), { limpiar: 0, equipo: 0, atrapar: 0 });
  assert.deepEqual(loadRecords({ getItem: () => '{"limpiar":40,"equipo":-9,"atrapar":"900"}' }), { limpiar: 40, equipo: 0, atrapar: 0 });
  assert.deepEqual(loadRecords({ getItem: () => { throw Error('blocked'); } }), { limpiar: 0, equipo: 0, atrapar: 0 });
});
