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
  '@/utils/fechaAbonoCatarro': compile(fs.readFileSync(path.join(root, 'src/utils/fechaAbonoCatarro.js'), 'utf8')),
  '@/utils/pdf/cuentaCliente': compile(fs.readFileSync(path.join(root, 'src/utils/pdf/cuentaCliente.js'), 'utf8')),
  '@/utils/pdf/delivery': compile(fs.readFileSync(path.join(root, 'src/utils/pdf/delivery.js'), 'utf8')),
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
const { encadenarSaldosCatarro, aplicarCadenaCatarro, saldoDiaCatarro, estaPagadoCatarro, resumenExcedenteCatarro } = load('@/utils/saldosCatarro');
sources['@/utils/paginas'] = compile(fs.readFileSync(path.join(root, 'src/utils/paginas.js'), 'utf8'));
const { juntarPaginas } = load('@/utils/paginas');
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

test('el saldo a favor del 15/10 pasa al 16/10 y las correcciones se restan', () => {
  assert.equal(saldoDiaCatarro({
    totalGeneralVenta: 1000, cobros: [{ monto: 10 }], correcciones: [{ monto: 1955.8 }], abonos: [],
  }), -965.8);
  const cadena = encadenarSaldosCatarro([
    { id: '15', fecha: '2026-10-15', totalGeneralVenta: 1000, cobros: [], correcciones: [{ monto: 1965.8 }], abonos: [] },
    cuenta('2026-10-16', 37189.30),
  ]);
  assert.equal(cadena[0].nuevoSaldoAcumulado, -965.8);
  assert.equal(cadena[0].estadoPagado, true);
  assert.equal(cadena[1].saldoAcumuladoAnterior, -965.8);
  assert.equal(cadena[1].nuevoSaldoAcumulado, 36223.5);
  assert.equal(cadena[1].estadoPagado, false);
});

test('guardar no cuenta el día dos veces aunque la consulta lo devuelva', () => {
  const actual = cuenta('2026-10-16', 37189.30);
  const cadena = aplicarCadenaCatarro({
    saldoAnterior: -965.8,
    cuentaActual: actual,
    cuentas: [actual, { ...actual }, cuenta('2026-10-17', 10)],
  });
  assert.equal(cadena.length, 2);
  assert.equal(cadena[0].nuevoSaldoAcumulado, 36223.5);
  assert.equal(cadena[1].saldoAcumuladoAnterior, 36223.5);
  assert.equal(cadena[1].nuevoSaldoAcumulado, 36233.5);
});

test('pagado compara centavos y un residuo como 8292.1999 no queda pendiente', () => {
  assert.equal(estaPagadoCatarro(0.004), true);
  assert.equal(estaPagadoCatarro(-965.8), true);
  assert.equal(estaPagadoCatarro(0.01), false);
  const exacto = encadenarSaldosCatarro([{
    id: '16', fecha: '2026-10-16', totalGeneralVenta: 8292.1999,
    cobros: [], correcciones: [], abonos: [{ monto: 8292.1999 }],
  }])[0];
  assert.equal(exacto.estadoPagado, true);
  const residuo = encadenarSaldosCatarro([{
    id: '16', fecha: '2026-10-16', totalGeneralVenta: 8292.20,
    cobros: [], correcciones: [], abonos: [{ monto: 8292.1999 }],
  }])[0];
  assert.equal(residuo.estadoPagado, true);
  const deuda = encadenarSaldosCatarro([{
    id: '16', fecha: '2026-10-16', totalGeneralVenta: 8292.20,
    cobros: [], correcciones: [], abonos: [{ monto: 8292.19 }],
  }])[0];
  assert.equal(deuda.nuevoSaldoAcumulado, 0.01);
  assert.equal(deuda.estadoPagado, false);
});

test('la lectura de la cadena no se corta en 50 cuentas', async () => {
  const docs = Array.from({ length: 105 }, (_, i) => ({ id: String(i) }));
  let llamadas = 0;
  const leidas = await juntarPaginas(async (cursor) => {
    llamadas += 1;
    const inicio = cursor ? docs.findIndex(d => d.id === cursor.id) + 1 : 0;
    const pagina = docs.slice(inicio, inicio + 50);
    return { docs: pagina, next: pagina.length === 50 ? pagina[pagina.length - 1] : null };
  });
  assert.equal(leidas.length, 105);
  assert.equal(llamadas, 3);
});

test('abrir el listado solo lee y muestra el crédito, sin escribir saldos', async () => {
  const registros = [
    { ...cuenta('2026-10-15', 0, 965.8), nuevoSaldoAcumulado: 0, estadoPagado: false, correcciones: [{ monto: 0 }] },
    { ...cuenta('2026-10-16', 37189.30), nuevoSaldoAcumulado: 37189.30, estadoPagado: false },
  ];
  const actualizaciones = [];
  let escuchar;
  const menu = load('menu', {
    'firebase/firestore': {
      collection() {}, query() {}, orderBy() {}, doc: (_, __, id) => id,
      onSnapshot(_, callback) { escuchar = callback; return () => {}; },
      async updateDoc(id, updates) { actualizaciones.push({ id, ...plain(updates) }); },
    },
    '@/utils/formatters': { formatNumber: String },
    '@/utils/dateUtils': { normalizarFechaValor: valor => String(valor || '').slice(0, 10) },
  }).default;
  const ctx = { cuentas: [] };
  await menu.methods.loadCuentas.call(ctx);
  await escuchar({ docs: registros.map(c => ({ id: c.id, data: () => c })) });
  assert.deepEqual(actualizaciones, []);
  const porFecha = Object.fromEntries(ctx.cuentas.map(c => [c.fecha, c]));
  assert.equal(porFecha['2026-10-15'].totalNota, -965.8);
  assert.equal(porFecha['2026-10-15'].estadoPagado, true);
  assert.equal(porFecha['2026-10-16'].saldoAcumuladoAnterior, -965.8);
  assert.equal(porFecha['2026-10-16'].totalNota, 36223.5);
  assert.equal(porFecha['2026-10-16'].estadoPagado, false);
});

function formulario(opciones = {}) {
  const registros = opciones.registros || new Map([
    ['2026-10-17', cuenta('2026-10-17', 36034.2)],
    ['2026-10-18', cuenta('2026-10-18', 5000)],
  ]);
  const service = {
    async update(id, data) { registros.set(id, { ...registros.get(id), ...plain(data) }); },
    async getAll(opts) {
      let filas = [...registros.values()].filter(c => c.fecha >= opts.where[2]);
      if (opts.limit) filas = filas.slice(0, opts.limit);
      return filas;
    },
    async listarDesdeFecha(fecha) {
      return [...registros.values()].filter(c => c.fecha >= fecha)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
    },
    _docRef(id) { return { id }; },
    newBatch() {
      const ops = [];
      return {
        update(ref, data) { ops.push({ id: ref.id, data: plain(data) }); },
        async commit() {
          for (const op of ops) registros.set(op.id, { ...(registros.get(op.id) || {}), ...op.data });
        },
      };
    },
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
  ctx.fechaSeleccionada = opciones.fecha || '2026-10-17';
  ctx.$route.params.id = opciones.id || ctx.$route.params.id;
  ctx.itemsVenta = opciones.itemsVenta || [{ kilosVenta: 1, precioVenta: 36034.2, totalVenta: 36034.2, ganancia: 0 }];
  ctx.abonos = opciones.abonos || [{ descripcion: 'Transferencia', monto: 40000 }];
  ctx.obtenerSaldoAcumuladoAnterior = async () => opciones.saldoAnterior || 0;
  return { ctx, registros };
}

function sumarDias(iso, dias) {
  const fecha = new Date(`${iso}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

test('Catarro redondea solo el total al peso y mantiene decimales en partidas y abonos', async () => {
  for (const [importe, esperado] of [[37889.30, 37889], [37889.50, 37890], [37889.99, 37890]]) {
    const { ctx, registros } = formulario({
      itemsVenta: [{ kilosVenta: 1.25, precioVenta: importe / 1.25, totalVenta: importe }],
      abonos: [{ descripcion: 'Transferencia', monto: 100.25 }], saldoAnterior: 0.75,
    });
    assert.equal(ctx.totalGeneralVenta, esperado);
    assert.equal(ctx.itemsVenta[0].totalVenta, importe);
    assert.equal(ctx.itemsVenta[0].kilosVenta, 1.25);
    await ctx.guardarNota();
    assert.equal(registros.get('2026-10-17').totalGeneralVenta, esperado);
    assert.equal(registros.get('2026-10-17').nuevoSaldoAcumulado, esperado - 99.5);
    assert.equal(registros.get('2026-10-17').abonos[0].monto, 100.25);
    ctx.clienteId = 'elizabeth';
    assert.equal(ctx.totalGeneralVenta, importe, 'otros clientes conservan sus decimales');
  }
  const { ctx } = formulario({ itemsVenta: [{ totalVenta: 100.30 }, { totalVenta: 100.30 }] });
  assert.equal(ctx.totalGeneralVenta, 201, 'se suma antes de redondear');
});

for (const metodo of ['guardarNota', 'autoSaveNota']) {
  test(`${metodo}: persiste el crédito, actualiza posteriores una sola vez y revierte al reducir el abono`, async () => {
    const { ctx, registros } = formulario();
    await ctx[metodo]();
    assert.equal(registros.get('2026-10-17').nuevoSaldoAcumulado, -3966);
    assert.equal(registros.get('2026-10-18').saldoAcumuladoAnterior, -3966);
    assert.equal(registros.get('2026-10-18').nuevoSaldoAcumulado, 1034);
    assert.equal(registros.get('2026-10-18').abonos.length, 0);
    await ctx[metodo]();
    assert.equal(registros.get('2026-10-18').nuevoSaldoAcumulado, 1034, 'repetir guardado no duplica el descuento');
    ctx.abonos[0].monto = 35000;
    await ctx[metodo]();
    assert.equal(registros.get('2026-10-17').nuevoSaldoAcumulado, 1034);
    assert.equal(registros.get('2026-10-18').nuevoSaldoAcumulado, 6034);
  });
}

test('guardar Catarro recalcula más de 50 cuentas y no suma el día actual otra vez', async () => {
  const registros = new Map([
    ['2026-10-15', { ...cuenta('2026-10-15', 0, 965.8), nuevoSaldoAcumulado: -965.8 }],
    ['2026-10-16', cuenta('2026-10-16', 37189.30)],
  ]);
  for (let i = 1; i <= 55; i += 1) {
    const fecha = sumarDias('2026-10-16', i);
    registros.set(fecha, { ...cuenta(fecha, 1), nuevoSaldoAcumulado: 0, saldoAcumuladoAnterior: 0 });
  }
  const { ctx, registros: guardados } = formulario({
    registros,
    id: '2026-10-16',
    fecha: '2026-10-16',
    saldoAnterior: -965.8,
    itemsVenta: [{ kilosVenta: 1, precioVenta: 37189.30, totalVenta: 37189.30, ganancia: 0 }],
    abonos: [],
  });
  await ctx.guardarNota();
  assert.equal(guardados.get('2026-10-16').saldoAcumuladoAnterior, -965.8);
  assert.equal(guardados.get('2026-10-16').nuevoSaldoAcumulado, 36223.2);
  assert.equal(guardados.get('2026-10-15').nuevoSaldoAcumulado, -965.8, 'no reescribe días anteriores');
  const ultima = sumarDias('2026-10-16', 55);
  assert.equal(guardados.get(ultima).saldoAcumuladoAnterior, 36277.2);
  assert.equal(guardados.get(ultima).nuevoSaldoAcumulado, 36278.2);
  assert.equal(guardados.get(ultima).estadoPagado, false);
});

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
    await page.addScriptTag({ path: require.resolve('jspdf/dist/jspdf.umd.min.js') });
    await page.addScriptTag({ path: require.resolve('jspdf-autotable') });
    await page.addStyleTag({ content: 'body{font-family:Arial,sans-serif;margin:0}*{box-sizing:border-box} ' + sfc.styles.map(s => s.content).join('\n') });
    await page.evaluate(({ sources, template }) => {
      const mocks = {
        jspdf: { __esModule: true, default: window.jspdf.jsPDF },
        'jspdf-autotable': { __esModule: true, default: (pdf, options) => pdf.autoTable(options) },
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
    await page.locator('.tabla-saldo .total.saldo-a-favor').waitFor();
    assert.equal(await page.locator('.excedente-catarro').count(), 0);
    assert.match(await page.locator('.tabla-saldo .total').innerText(), /Saldo a favor — se abonará a la siguiente nota\s*\$3,966.00/);
    await page.getByRole('button', { name: 'Imprimir', exact: true }).click();
    assert.match(await page.evaluate(() => window.impresion), /Saldo a favor — se abonará a la siguiente nota/);
    assert.doesNotMatch(await page.evaluate(() => window.impresion), /Abono a la cuenta del/);
    assert.match(await page.evaluate(() => window.impresion), /Total Venta<\/td><td>\$36,834.00/);
    await page.locator('.tabla-saldo').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/catarro-excedente-desktop.png' });
    await page.evaluate(() => { form.cuentasPosterioresCatarro = []; });
    assert.match(await page.locator('.tabla-saldo .total').innerText(), /\$3,966.00/);
    await page.getByRole('button', { name: 'Imprimir', exact: true }).click();
    assert.match(await page.evaluate(() => window.impresion), /Saldo a favor — se abonará a la siguiente nota/);
    assert.doesNotMatch(await page.evaluate(() => window.impresion), /Saldo a favor para futuras cuentas/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.tabla-saldo').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/catarro-excedente-mobile.png' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.locator('.abonos input[type=number]').fill('36034');
    assert.equal(await page.locator('.excedente-catarro').count(), 0);

    // La impresión debe conservar el orden y los importes de la tabla visible.
    await page.evaluate(() => {
      Object.assign(form, {
        fechaSeleccionada: '2026-10-15', saldoAcumuladoAnterior: 0,
        itemsVenta: [
          [35, '71/90', 170], [58, '51/60', 178], [31, '41/50', 185],
          [32, '36/40', 190], [24, 'pulpa', 360],
        ].map(([kilosVenta, medida, precioVenta]) => ({ kilosVenta, medida, precioVenta, totalVenta: kilosVenta * precioVenta })),
        cobros: [{ descripcion: 'Flete', monto: 800 }], correcciones: [],
        abonos: [{ descripcion: 'chofer', monto: 10000 }, { descripcion: 'transf', monto: 20000 }, { descripcion: 'liquida', monto: 5929 }],
      });
      form.imprimirTablas();
    });
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: '/tmp/catarro-interfaz-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: '/tmp/catarro-interfaz-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1100, height: 900 });
    const impresa = await browser.newPage({ viewport: { width: 820, height: 1100 } });
    await impresa.emulateMedia({ media: 'print' });
    await impresa.setContent(await page.evaluate(() => window.impresion));
    const filas = locator => locator.locator('tr').evaluateAll(rows => rows.map(row => Array.from(row.cells, cell => cell.textContent.trim())));
    const colores = locator => locator.locator('tr').evaluateAll(rows => rows.map(row => ({
      fondo: getComputedStyle(row).backgroundColor,
      texto: getComputedStyle(row.cells[0]).color,
    })));
    assert.deepEqual(await filas(impresa.locator('.tabla-resumen')), await filas(page.locator('.tabla-saldo')));
    assert.deepEqual(await colores(impresa.locator('.tabla-resumen')), await colores(page.locator('.tabla-saldo')));
    assert.deepEqual(await impresa.locator('.tabla-resumen tr td:first-child').allTextContents(), [
      'Saldo Hoy', 'Flete', 'Total de hoy',
      'chofer (Abono)', 'transf (Abono)', 'liquida (Abono)', 'Saldo pendiente',
    ]);
    assert.equal(await impresa.locator('.subtotal td:last-child').textContent(), '$35,929.00');
    assert.equal(await impresa.locator('.saldo-anterior').count(), 0);
    assert.equal(await impresa.locator('.total-hoy').count(), 1);
    assert.equal(await impresa.locator('.highlight td:last-child').textContent(), '$0.00');
    assert.notEqual(await impresa.locator('.flete').evaluate(row => getComputedStyle(row).backgroundColor),
      await impresa.locator('.abono').first().evaluate(row => getComputedStyle(row).backgroundColor));
    assert.equal(await impresa.locator('body').evaluate(body => getComputedStyle(body).printColorAdjust), 'exact');
    await impresa.screenshot({ path: '/tmp/catarro-impresion-color.png', fullPage: true });
    assert.equal(await impresa.locator('.marco-catarro').evaluate(frame => getComputedStyle(frame).borderTopColor), 'rgb(169, 31, 39)');
    await impresa.pdf({ path: '/tmp/catarro-marco-rojo.pdf', format: 'Letter', printBackground: true });
    const descargaPromesa = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generar PDF', exact: true }).click();
    const descarga = await descargaPromesa;
    assert.equal(descarga.suggestedFilename(), 'Cuenta-Catarro-2026-10-15.pdf');
    await descarga.saveAs('/tmp/catarro-boton-generar.pdf');
    await page.getByRole('button', { name: 'Generar PDF', exact: true }).waitFor();
    assert.equal(await page.locator('iframe[title="Preparando PDF de la cuenta"]').count(), 0);

    await page.evaluate(() => {
      form.cobros = [];
      form.abonos = [];
      form.imprimirTablas();
    });
    await impresa.setContent(await page.evaluate(() => window.impresion));
    assert.deepEqual(await filas(impresa.locator('.tabla-resumen')), [['Total de hoy', '$36,729.00']]);
    assert.deepEqual(await filas(impresa.locator('.tabla-resumen')), await filas(page.locator('.tabla-saldo')));
    assert.deepEqual(await colores(impresa.locator('.tabla-resumen')), await colores(page.locator('.tabla-saldo')));

    await page.evaluate(() => {
      form.saldoAcumuladoAnterior = 150;
      form.cobros = [];
      form.abonos = [{ descripcion: '<b>Transferencia & efectivo</b>', monto: 100 }];
      form.correcciones = [{ descripcion: 'Ajuste', monto: 25 }];
      form.imprimirTablas();
    });
    await impresa.setContent(await page.evaluate(() => window.impresion));
    assert.deepEqual(await filas(impresa.locator('.tabla-resumen')), await filas(page.locator('.tabla-saldo')));
    assert.equal(await impresa.locator('.subtotal').count(), 0);
    assert.equal(await impresa.locator('.abono b').count(), 0, 'la descripción se imprime como texto');
    assert.equal(await impresa.locator('.highlight.pendiente td:last-child').textContent(), '$36,754.00');
    assert.deepEqual(await colores(impresa.locator('.tabla-resumen')), await colores(page.locator('.tabla-saldo')));
    await page.evaluate(() => {
      form.abonos = [];
      form.correcciones = [];
      form.imprimirTablas();
    });
    await impresa.setContent(await page.evaluate(() => window.impresion));
    assert.deepEqual(await filas(impresa.locator('.tabla-resumen')), await filas(page.locator('.tabla-saldo')));
    assert.equal(await impresa.locator('.highlight').count(), 0, 'no repite el mismo total al final');
    assert.equal(await page.locator('.tabla-saldo tr.total').count(), 0);
    assert.equal(await impresa.locator('.tabla-resumen tr:last-child td:first-child').textContent(), 'Total de hoy + pendiente');
    assert.equal(await page.locator('.total-catarro-principal').count(), 1);
    await impresa.screenshot({ path: '/tmp/catarro-total-destacado.png', fullPage: true });
    await page.evaluate(() => {
      form.saldoAcumuladoAnterior = -71;
      form.imprimirTablas();
    });
    await impresa.setContent(await page.evaluate(() => window.impresion));
    assert.deepEqual(await filas(impresa.locator('.tabla-resumen')), await filas(page.locator('.tabla-saldo')));
    assert.equal(await impresa.locator('.saldo-anterior.saldo-a-favor td:first-child').textContent(), 'Saldo a favor');
    assert.equal(await impresa.locator('.saldo-anterior.saldo-a-favor td:last-child').textContent(), '$71.00');
    assert.equal(await impresa.locator('.total-sin-abono td:first-child').textContent(), 'Total de hoy menos saldo a favor');
    assert.equal(await impresa.locator('.total-sin-abono td:last-child').textContent(), '$36,658.00', 'el crédito sigue restándose');
    assert.equal(await page.locator('.tabla-saldo .saldo-a-favor td').first().evaluate(cell => getComputedStyle(cell).color), 'rgb(194, 65, 12)');
    assert.equal(await impresa.locator('.saldo-anterior.saldo-a-favor').evaluate(row => getComputedStyle(row).color), 'rgb(194, 65, 12)');
    assert.deepEqual(await colores(impresa.locator('.tabla-resumen')), await colores(page.locator('.tabla-saldo')));
    await impresa.close();
    await page.evaluate(() => {
      window.desktop = { async savePdf(bytes, filename) {
        window.pdfEscritorio = { bytes: Array.from(bytes), filename };
      } };
      form.itemsVenta = Array.from({ length: 60 }, (_, indice) => ({
        kilosVenta: 1.25, medida: `Producto ${indice + 1}`, precioVenta: 100,
        totalVenta: 125,
      }));
    });
    await page.getByRole('button', { name: 'Generar PDF', exact: true }).click();
    await page.waitForFunction(() => !!window.pdfEscritorio);
    const escritorio = await page.evaluate(() => window.pdfEscritorio);
    assert.equal(escritorio.filename, 'Cuenta-Catarro-2026-10-15.pdf');
    assert.equal(Buffer.from(escritorio.bytes).subarray(0, 5).toString(), '%PDF-');
    fs.writeFileSync('/tmp/catarro-boton-multipagina.pdf', Buffer.from(escritorio.bytes));
    await page.getByRole('button', { name: 'Generar PDF', exact: true }).waitFor();
    assert.equal(await page.locator('iframe[title="Preparando PDF de la cuenta"]').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
