// Isolated regression tests. Firestore below is a test double, never production.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
if (!process.env.REYPEZ_TZ_TEST_CHILD) {
  for (const TZ of ['UTC', 'America/Monterrey', 'America/Los_Angeles']) {
    const child = spawnSync(process.execPath, [__filename], { env: { ...process.env, TZ, REYPEZ_TZ_TEST_CHILD: '1' }, encoding: 'utf8' });
    process.stdout.write(child.stdout); process.stderr.write(child.stderr);
    assert.equal(child.status, 0, 'Timezone regression failed: ' + TZ);
  }
  process.exit(0);
}
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const stored = new Map();
const alerts = [];
const keyOf = ref => typeof ref === 'string' ? ref : ref.key;
const snapshot = ref => ({ id: keyOf(ref).split('/')[1], ref, exists: () => stored.has(keyOf(ref)), data: () => {
  const data = stored.get(keyOf(ref));
  return data && { ...data, ...(data.fecha instanceof Date ? { fecha: { toDate: () => new Date(data.fecha) } } : {}) };
} });
const firestore = {
  collection: (db, name) => name,
  doc: (db, name, id) => ({ key: name + '/' + id, id }),
  getDoc: async ref => snapshot(ref),
  getDocsFromServer: async collection => ({ docs: [...stored.keys()].filter(key => key.startsWith(collection + '/')).map(snapshot) }),
  getDocs: async () => ({ docs: [...stored.keys()].filter(key => key.startsWith('sacadas/')).map(snapshot) }),
  query: value => value, orderBy() {},
  runTransaction: async (db, fn) => {
    const pending = [];
    await fn({ get: async ref => snapshot(ref), update: (ref, data) => pending.push(() => stored.set(keyOf(ref), { ...stored.get(keyOf(ref)), ...data })), set: (ref, data) => pending.push(() => stored.set(keyOf(ref), data)), delete: ref => pending.push(() => stored.delete(keyOf(ref))) });
    pending.forEach(write => write());
  }
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  const code = babel.transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const exports = {}; cache.set(file, exports);
  new Function('exports', 'require', 'alert', code)(exports, name => {
    if (name === 'moment' || name.startsWith('moment/')) return require(name);
    if (name === '@/firebase') return { db: {} };
    if (name === 'firebase/firestore') return firestore;
    if (name.includes('/stores/ui')) return { useUIStore: () => ({ openModal() {} }) };
    if (name === '@/utils/formatters') return { formatNumber: value => String(value) };
    if (name === '@/services/sacadas.service') return load('src/services/sacadas.service.js');
    if (name === '@/utils/momentoInventario') return load('src/utils/momentoInventario.js');
    if (name === '@/utils/fechasInventario') return load('src/utils/fechasInventario.js');
    if (name === './dateUtils') return load('src/utils/dateUtils.js');
    return {};
  }, message => alerts.push(message));
  return exports;
}
function context(component, props = {}) {
  const ctx = { ...props, $route: { params: {}, query: {} }, $router: { push() {} }, $emit() {}, marcarInventarioGuardado() {} };
  Object.assign(ctx, component.data.call(ctx));
  for (const [name, fn] of Object.entries(component.methods)) ctx[name] = fn.bind(ctx);
  for (const [name, fn] of Object.entries(component.computed || {})) Object.defineProperty(ctx, name, { get: fn.bind(ctx) });
  return ctx;
}
(async () => {
  const { momentoInventario: momentMX, inicioDiaInventario: start, finDiaInventario: end } = load('src/utils/momentoInventario.js');
  const { fechaRegistro } = load('src/utils/fechasInventario.js');
  const { guardarDiaLimpio } = load('src/services/sacadas.service.js');
  const Sacadas = load('src/views/Sacadas.vue').default;
  const Menu = load('src/views/SacadasMenu.vue').default;
  for (const [iso, expected] of [
    ['2026-10-10T06:00:00.123Z', '2026-10-10'],
    ['2026-10-10T05:59:59.999Z', '2026-10-09'],
    ['2026-10-11T05:59:59.999Z', '2026-10-10'],
    ['2022-04-03T06:00:00.000Z', '2022-04-03'],
    ['2022-04-04T04:59:59.999Z', '2022-04-03']
  ]) {
    const date = new Date(iso), converted = momentMX({ toDate: () => date });
    assert.equal(converted.format('YYYY-MM-DD'), expected);
    assert.equal(converted.toDate().toISOString(), iso, 'Original instant remains exact');
    assert.equal(converted.format('YYYY-MM-DD'), fechaRegistro(date), 'UI and existing guard use same day');
  }
  assert.equal(momentMX('2026-10-10').toISOString(), '2026-10-10T06:00:00.000Z');
  assert.equal(momentMX('2026-02-30').isValid(), false);
  assert.equal(start(new Date('2026-10-10T22:00:00Z')).toISOString(), '2026-10-10T06:00:00.000Z');
  assert.equal(end(new Date('2026-10-10T22:00:00Z')).toISOString(), '2026-10-11T05:59:59.999Z');
  assert.equal(start(new Date('2022-04-03T18:00:00Z')).toISOString(), '2022-04-03T06:00:00.000Z');
  assert.equal(end(new Date('2022-04-03T18:00:00Z')).toISOString(), '2022-04-04T04:59:59.999Z');
  assert.equal(start(new Date('2022-10-30T18:00:00Z')).toISOString(), '2022-10-30T05:00:00.000Z');
  assert.equal(end(new Date('2022-10-30T18:00:00Z')).toISOString(), '2022-10-31T05:59:59.999Z');
  for (const modoModal of [false, true]) {
    stored.clear();
    const original = new Date('2026-10-10T06:00:00.123Z');
    stored.set('sacadas/test', { fecha: original, entradas: [], salidas: [{ tipo: 'proveedor', proveedor: 'Fixture', medida: '36/40', kilos: 10 }], totalSalidas: 10 });
    const ctx = context(Sacadas, { modoModal, sacadaIdProp: 'test' });
    await ctx.loadSacada('test');
    assert.equal(ctx.selectedDate, '2026-10-10');
    assert.equal(ctx.fechaOriginal, '2026-10-10');
    assert.equal(ctx.formattedDate, '10/10/2026');
    ctx.updateCurrentDate();
    assert.equal(ctx.currentDate.valueOf(), original.getTime(), 'Same-day picker event preserves instant');
    ctx.salidas.push({ tipo: 'proveedor', proveedor: 'Fixture', medida: '36/40', kilos: 5 });
    await ctx.saveReport();
    assert.equal(stored.get('sacadas/test').fecha.getTime(), original.getTime());
    assert.equal(stored.get('sacadas/test').totalSalidas, 15);
    assert.equal(stored.get('sacadasDias/2026-10-10').sacadaId, 'test');
    ctx.selectedDate = '2026-10-11'; ctx.updateCurrentDate();
    assert.equal(ctx.currentDate.toISOString(), '2026-10-11T06:00:00.000Z');
    await assert.rejects(guardarDiaLimpio({ fecha: original }, { id: 'test', fechaOriginal: '2026-10-09' }), error => error.code === 'dia-cambiado');
    stored.set('sacadas/duplicate', { fecha: original });
    await assert.rejects(guardarDiaLimpio({ fecha: original }, { id: 'test', fechaOriginal: '2026-10-10' }), error => error.code === 'dia-duplicado');
  }
  // A local-US date must not move the report's cutoff or include tomorrow.
  stored.clear();
  const movement = (kilos, fecha) => ({ fecha: new Date(fecha), entradas: [{ proveedor: 'Fixture', medida: '36/40', precio: 120, kilos }], salidas: [] });
  stored.set('sacadas/prior', movement(1000, '2026-10-09T06:00:00Z'));
  stored.set('sacadas/end-today', movement(100, '2026-10-11T05:59:59.999Z'));
  stored.set('sacadas/tomorrow', movement(999, '2026-10-11T06:00:00Z'));
  const inventory = context(Sacadas);
  inventory.currentDate = momentMX(new Date('2026-10-10T06:00:00Z'));
  inventory.parseSalidaMedida = () => ({ medidaBase: '36/40', precio: 120, cuartoFrio: '' });
  assert.equal(await inventory.getKilosDisponibles('Fixture', '36/40'), 1100);
  const menu = context(Menu);
  assert.equal(menu.formatDate(new Date('2026-10-10T06:00:00Z')), '10 de octubre de 2026');
  assert.equal(menu.formatDate('2026-10-10T03:00:00Z'), '10 de octubre de 2026', 'Legacy ISO strings follow existing date-prefix guard');
  stored.clear(); stored.set('sacadas/string', { fecha: '2026-10-10T03:00:00Z', entradas: [], salidas: [] });
  await menu.loadSacadas();
  assert.equal(menu.sacadas[0].fechaDia, '2026-10-10');
  assert.equal(menu.sacadas[0].fechaTexto, '10 de octubre de 2026');
  const today = start(new Date());
  menu.sacadas = [{ id: 'yesterday', fecha: today.clone().subtract(1, 'millisecond').toDate() }, { id: 'today', fecha: today.toDate() }];
  menu.irASalidaDeHoy(); assert.equal(menu.modalSalida.sacadaId, 'today');
  console.log('PASS TZ=' + process.env.TZ + ': business day/instant, historical DST boundaries, editor/modal save, unchanged guards, date picker, menu and Today.');
})().catch(error => { console.error(error); process.exitCode = 1; });
