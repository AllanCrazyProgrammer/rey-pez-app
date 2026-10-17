const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const sfc = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/CuentasClientes/CuentaCliente.vue'), 'utf8'));
const compile = source => babel.transformSync(source, { configFile: false, babelrc: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
const sources = {
  '@/utils/dinero': compile(fs.readFileSync(path.join(root, 'src/utils/dinero.js'), 'utf8')),
  '@/utils/saldosCatarro': compile(fs.readFileSync(path.join(root, 'src/utils/saldosCatarro.js'), 'utf8')),
  component: compile(sfc.script.content),
  menu: compile(compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/CuentasClientes/CatarroCuentasMenu.vue'), 'utf8')).script.content),
};
function load(id, mocks = {}) {
  if (id in mocks) return mocks[id];
  if (id === './dinero') id = '@/utils/dinero';
  if (!(id in sources)) return {};
  const module = { exports: {} };
  vm.runInNewContext(sources[id], { module, exports: module.exports,
    require: dep => load(dep, mocks), console, setTimeout: () => 0, clearTimeout() {} });
  return module.exports;
}
const { encadenarSaldosCatarro, resumenExcedenteCatarro } = load('@/utils/saldosCatarro');
const cuenta = (fecha, total, abono = 0) => ({ id: fecha, fecha, totalGeneralVenta: total,
  cobros: [], correcciones: [], abonos: abono ? [{ descripcion: 'Depósito', monto: abono }] : [] });
const plain = value => JSON.parse(JSON.stringify(value));

test('el excedente conserva los centavos y se aplica en orden sin duplicar abonos', () => {
  const cuentas = [cuenta('2026-10-19', 200), cuenta('2026-10-17', 36034.20, 40000), cuenta('2026-10-18', 3000)];
  const cadena = encadenarSaldosCatarro(cuentas);
  assert.deepEqual(Array.from(cadena, c => c.nuevoSaldoAcumulado), [-3965.8, -965.8, -765.8]);
  assert.deepEqual(Array.from(cadena, c => c.saldoAcumuladoAnterior), [0, -3965.8, -965.8]);
  assert.equal(cadena[1].abonos.length, 0);
  const resumen = resumenExcedenteCatarro(-3965.8, cuentas.filter(c => c.fecha > '2026-10-17'));
  assert.deepEqual(Array.from(resumen.aplicaciones, a => a.monto), [3000, 200]);
  assert.equal(resumen.aFavor, 765.8);
  assert.equal(resumen.excedente, 3965.8);
});

test('sin cuenta posterior queda a favor, incluso al crear una cuenta días después', () => {
  assert.equal(resumenExcedenteCatarro(-250.35).aFavor, 250.35);
  const nueva = encadenarSaldosCatarro([cuenta('2026-10-25', 300)], -250.35)[0];
  assert.equal(nueva.nuevoSaldoAcumulado, 49.65);
  assert.equal(nueva.estadoPagado, false);
  assert.equal(resumenExcedenteCatarro(-250.35, [nueva]).aplicaciones[0].monto, 250.35);
});

test('pago exacto, saldo pendiente y un centavo a favor', () => {
  for (const [pago, saldo] of [[100, 0], [99.99, 0.01], [100.01, -0.01]]) {
    const resultado = encadenarSaldosCatarro([cuenta('2026-10-17', 100, pago)])[0];
    assert.equal(resultado.nuevoSaldoAcumulado, saldo);
    assert.equal(resultado.estadoPagado, saldo <= 0);
    assert.equal(resumenExcedenteCatarro(saldo).aFavor, Math.max(0, -saldo));
  }
});

test('el excedente considera deuda anterior, flete, correcciones y abonos existentes', () => {
  const origen = { ...cuenta('2026-10-17', 1000, '1300.50'), cobros: [{ monto: '100' }], correcciones: [{ monto: '20' }] };
  const cadena = encadenarSaldosCatarro([origen, cuenta('2026-10-18', 500, 400)], 200);
  assert.equal(cadena[0].nuevoSaldoAcumulado, -220.5);
  assert.equal(cadena[1].nuevoSaldoAcumulado, -120.5);
  const resumen = resumenExcedenteCatarro(cadena[0].nuevoSaldoAcumulado, [cadena[1]]);
  assert.equal(resumen.aplicaciones[0].monto, 100);
  assert.equal(resumen.aFavor, 120.5);
});

test('abrir el listado mantiene el crédito y recalcula saldos anteriores coherentes', async () => {
  const registros = [cuenta('2026-10-17', 100, 300.25), cuenta('2026-10-18', 120), cuenta('2026-10-19', 90)];
  const actualizaciones = [];
  let escuchar;
  const menu = load('menu', {
    'firebase/firestore': {
      collection() {}, query() {}, orderBy() {}, doc: (_, __, id) => id,
      onSnapshot(_, callback) { escuchar = callback; return () => {}; },
      async updateDoc(id, updates) { actualizaciones.push({ id, ...plain(updates) }); },
    },
    '@/utils/formatters': { formatNumber: String },
  }).default;
  const ctx = {};
  await menu.methods.loadCuentas.call(ctx);
  await escuchar({ docs: registros.map(c => ({ id: c.id, data: () => c })) });
  assert.deepEqual(actualizaciones.map(c => c.nuevoSaldoAcumulado), [-200.25, -80.25, 9.75]);
  assert.deepEqual(actualizaciones.map(c => c.saldoAcumuladoAnterior), [0, -200.25, -80.25]);
  assert.deepEqual(actualizaciones.map(c => c.estadoPagado), [true, true, false]);
  assert.equal(ctx.cuentas[0].totalNota, 9.75);
});

function formulario() {
  const registros = new Map([
    ['2026-10-17', cuenta('2026-10-17', 36034.2)],
    ['2026-10-18', cuenta('2026-10-18', 5000)],
  ]);
  const service = {
    async update(id, data) { registros.set(id, { ...registros.get(id), ...plain(data) }); },
    async getAll(opts) { return [...registros.values()].filter(c => c.fecha > opts.where[2]); },
  };
  const component = load('component', {
    '@/constants/clientesConfig': { CLIENTES_CONFIG: { catarro: { features: {}, backPath: '/' } } },
    '@/services/cuentas.service': { catarrosCuentas: service },
    '@/utils/formatters': { formatNumber: String },
  }).default;
  const ctx = { clienteId: 'catarro', $route: { params: { id: '2026-10-17' }, query: { edit: 'true' } }, $router: { push() {} } };
  for (const [key, fn] of Object.entries(component.methods)) ctx[key] = fn.bind(ctx);
  Object.assign(ctx, component.data.call(ctx));
  for (const [key, fn] of Object.entries(component.computed)) Object.defineProperty(ctx, key, { get: () => fn.call(ctx) });
  ctx.fechaSeleccionada = '2026-10-17';
  ctx.itemsVenta = [{ kilosVenta: 1, precioVenta: 36034.2, totalVenta: 36034.2, ganancia: 0 }];
  ctx.abonos = [{ descripcion: 'Transferencia', monto: 40000 }];
  ctx.obtenerSaldoAcumuladoAnterior = async () => 0;
  return { ctx, registros };
}

for (const metodo of ['guardarNota', 'autoSaveNota']) {
  test(`${metodo}: persiste el crédito, actualiza posteriores una sola vez y revierte al reducir el abono`, async () => {
    const { ctx, registros } = formulario();
    await ctx[metodo]();
    assert.equal(registros.get('2026-10-17').nuevoSaldoAcumulado, -3965.8);
    assert.equal(registros.get('2026-10-18').saldoAcumuladoAnterior, -3965.8);
    assert.equal(registros.get('2026-10-18').nuevoSaldoAcumulado, 1034.2);
    assert.equal(registros.get('2026-10-18').abonos.length, 0);
    await ctx[metodo]();
    assert.equal(registros.get('2026-10-18').nuevoSaldoAcumulado, 1034.2, 'repetir guardado no duplica el descuento');
    ctx.abonos[0].monto = 35000;
    await ctx[metodo]();
    assert.equal(registros.get('2026-10-17').nuevoSaldoAcumulado, 1034.2);
    assert.equal(registros.get('2026-10-18').nuevoSaldoAcumulado, 6034.2);
  });
}

test('interfaz: vista previa al escribir, impresión, crédito futuro y presentación móvil', async () => {
  assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    await page.setContent('<div id="app"></div>');
    await page.addScriptTag({ path: require.resolve('vue/dist/vue.js') });
    await page.addStyleTag({ content: 'body{font-family:Arial,sans-serif;margin:0}*{box-sizing:border-box} ' + sfc.styles.map(s => s.content).join('\n') });
    await page.evaluate(({ sources, template }) => {
      const mocks = {
        '@/constants/clientesConfig': { CLIENTES_CONFIG: { catarro: { titulo: 'Cuenta Catarro', features: {} } } },
        '@/utils/formatters': { formatNumber: n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      };
      function load(id) {
        if (id in mocks) return mocks[id];
        if (id === './dinero') id = '@/utils/dinero';
        if (!(id in sources)) return id.endsWith('.vue') ? { template: '<span />' } : {};
        const module = { exports: {} };
        new Function('require', 'module', 'exports', sources[id])(load, module, module.exports);
        return module.exports;
      }
      const component = load('component').default;
      // Se prueban los componentes reales con datos aislados, sin consultar ni guardar cuentas reales.
      component.mounted = [];
      component.watch = {};
      Vue.prototype.$route = { params: {}, query: {} };
      window.app = new Vue({ el: '#app', render: h => h({ ...component, template }, { props: { clienteId: 'catarro' } }) });
      window.form = app.$children[0];
      Object.assign(form, {
        fechaSeleccionada: '2026-10-17',
        itemsVenta: [{ kilosVenta: 1, medida: '41/50', precioVenta: 36834.2, totalVenta: 36834.2 }],
        cobros: [{ descripcion: 'Flete', monto: 800 }],
        abonos: [{ descripcion: 'Chofer', monto: 27742 }],
        cuentasPosterioresCargadas: true,
        cuentasPosterioresCatarro: [{ id: '18', fecha: '2026-10-18', totalGeneralVenta: 5000 }],
      });
      window.open = () => ({ document: { write(html) { window.impresion = html; }, close() {} }, print() {} });
    }, { sources, template: sfc.template.content });
    assert.equal(await page.locator('.excedente-catarro').count(), 0);
    await page.locator('.abonos input[type=number]').fill('40000');
    await page.getByRole('heading', { name: 'Aplicación del excedente' }).waitFor();
    assert.match(await page.locator('.excedente-catarro').innerText(), /18\/10\/2026:\s*\$3,965.80/);
    await page.getByRole('button', { name: 'Imprimir', exact: true }).click();
    assert.match(await page.evaluate(() => window.impresion), /Abono a la cuenta del 18\/10\/2026/);
    await page.locator('.excedente-catarro').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/catarro-excedente-desktop.png' });
    await page.evaluate(() => { form.cuentasPosterioresCatarro = []; });
    assert.match(await page.locator('.excedente-catarro').innerText(), /Saldo a favor para futuras cuentas: \$3,965.80/);
    await page.getByRole('button', { name: 'Imprimir', exact: true }).click();
    assert.match(await page.evaluate(() => window.impresion), /Saldo a favor para futuras cuentas/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.excedente-catarro').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/catarro-excedente-mobile.png' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.locator('.abonos input[type=number]').fill('36034.20');
    assert.equal(await page.locator('.excedente-catarro').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
