// Prueba aislada: no lee ni escribe cuentas reales.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

function componente(file) {
  const sfc = compiler.parseComponent(fs.readFileSync(path.join(root, file), 'utf8'));
  const result = compiler.compile(sfc.template.content);
  assert.deepEqual(result.errors, [], file);
  return { template: sfc.template.content, styles: sfc.styles.map(style => style.content).join('\n'),
    script: babel.transformSync(sfc.script.content, { configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-modules-commonjs'] }).code };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    await page.setContent('<div id="app"></div>');
    await page.addScriptTag({ path: require.resolve('vue/dist/vue.js') });
    await page.addScriptTag({ path: require.resolve('moment/min/moment.min.js') });
    const componentes = {
      deudas: componente('src/components/Cuentas/DeudasCatarro.vue'),
      menu: componente('src/views/CuentasClientes/CatarroCuentasMenu.vue'),
      utilidades: Object.fromEntries(['dateUtils', 'cuentasPendientesCatarro'].map(nombre => [nombre,
        babel.transformSync(fs.readFileSync(path.join(root, `src/utils/${nombre}.js`), 'utf8'), {
          configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
        }).code])),
    };
    await page.addStyleTag({ content: 'body{font-family:Arial,sans-serif;background:#eef1f6;margin:0}*{box-sizing:border-box}' +
      Object.values(componentes).map(componente => componente.styles).join('\n') });
    await page.evaluate(componentes => {
      const load = (code, mocks) => {
        const module = { exports: {} };
        new Function('require', 'module', 'exports', code)(id => {
          if (!(id in mocks)) throw new Error('Importación inesperada: ' + id);
          return mocks[id];
        }, module, module.exports);
        return module.exports.default;
      };
      const utilidades = {};
      const cargarUtilidad = nombre => {
        if (utilidades[nombre]) return utilidades[nombre];
        const module = { exports: {} };
        new Function('require', 'module', 'exports', componentes.utilidades[nombre])(
          id => id === 'moment' ? window.moment : id === 'moment/locale/es' ? {} : cargarUtilidad(id.replace('./', '')), module, module.exports);
        utilidades[nombre] = module.exports;
        return module.exports;
      };
      const deudas = [], pagos = {};
      const oyentes = new Set(), oyentesAbonos = new Map();
      let secuencia = 0;
      window.intentos = [];
      const avisar = () => {
        oyentes.forEach(fn => fn(deudas.map(deuda => ({ ...deuda }))));
        oyentesAbonos.forEach((fn, id) => fn((pagos[id] || []).map(pago => ({ ...pago }))));
      };
      const servicio = {
        nuevoIdDeuda: () => 'deuda-' + ++secuencia,
        nuevoIdAbono: () => 'abono-' + ++secuencia,
        escucharDeudas(fn) { oyentes.add(fn); fn(deudas.map(deuda => ({ ...deuda }))); return () => oyentes.delete(fn); },
        escucharAbonos(id, fn) { oyentesAbonos.set(id, fn); fn((pagos[id] || []).map(pago => ({ ...pago }))); return () => oyentesAbonos.delete(id); },
        async crearDeuda(id, data) {
          deudas.push({ id, nombre: data.nombre, fecha: data.fecha, montoInicialCentavos: Math.round(Number(data.monto) * 100), totalAbonadoCentavos: 0 });
          avisar(); return id;
        },
        async registrarAbono(id, pagoId, data) {
          window.intentos.push(pagoId);
          if (window.fallarAbono) { window.fallarAbono = false; throw Object.assign(new Error('Sin red'), { code: 'unavailable' }); }
          const montoCentavos = Math.round(Number(data.monto) * 100);
          (pagos[id] ||= []).push({ id: pagoId, montoCentavos, fecha: data.fecha, descripcion: data.descripcion, anulado: false });
          deudas.find(deuda => deuda.id === id).totalAbonadoCentavos += montoCentavos;
          avisar();
        },
        async anularAbono(id, pagoId) {
          const pago = pagos[id].find(pago => pago.id === pagoId);
          pago.anulado = true;
          deudas.find(deuda => deuda.id === id).totalAbonadoCentavos -= pago.montoCentavos;
          avisar();
        },
      };
      window.numeroOyentes = () => oyentes.size + oyentesAbonos.size;
      const mocks = {
        '@/services/deudasCatarro.service': servicio,
        '@/utils/dateUtils': { ...cargarUtilidad('dateUtils'), obtenerFechaActualISO: () => '2026-10-16' },
        '@/utils/cuentasPendientesCatarro': cargarUtilidad('cuentasPendientesCatarro'),
        '@/utils/services/EmbarqueCuentasService': {
          async crearCuentaCatarro(datos) {
            if (window.fallarCreacion) { window.fallarCreacion = false; throw new Error('Sin conexión'); }
            window.cuentaCreada = datos;
            await window.cargarCuentas([...(window.cuentasPrueba || []), { id: datos.fecha, fecha: datos.fecha, estadoPagado: true }]);
            return datos.fecha;
          },
        },
        '@/utils/formatters': { formatNumber: value => Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), formatearFecha: fecha => fecha },
        '@/firebase': { db: {} },
        'firebase/firestore': {
          collection: (_, nombre) => nombre, query: ref => ref, orderBy() {}, where() {}, doc: (_, nombre, id) => ({ nombre, id }),
          async getDoc(ref) { const data = (window.embarquesPrueba || []).find(item => item.id === ref.id); return { exists: () => !!data, data: () => data }; },
          async updateDoc() {},
          onSnapshot(ref, fn) {
            const emitir = datos => fn({ docs: datos.map(data => ({ id: data.id, data: () => data })) });
            if (ref === 'cuentasCatarro') window.cargarCuentas = datos => { window.cuentasPrueba = datos; return emitir(datos); };
            if (ref === 'embarques') window.cargarEmbarques = datos => { window.embarquesPrueba = datos; return emitir(datos); };
            emitir([]); return () => {};
          },
        },
        '@/services/PapeleraService': {}, '@/utils/dinero': { sonMontosIguales: (a, b) => a === b, redondearCentavos: n => Math.round(n * 100) / 100 },
        '@/utils/saldosCatarro': { saldoDiaCatarro: () => 0 },
        '@/components/BackButton.vue': { template: '<span></span>' },
        '@/components/PreciosHistorialModal.vue': { template: '<button>Precios de venta</button>' },
        '@/components/StashModalV2.vue': { template: '<button>Stash</button>' },
      };
      mocks['@/components/Cuentas/DeudasCatarro.vue'] = { ...load(componentes.deudas.script, mocks), template: componentes.deudas.template };
      const menu = { ...load(componentes.menu.script, mocks), template: componentes.menu.template };
      Vue.component('router-link', { props: ['to'], template: '<a :href="to"><slot /></a>' });
      Vue.prototype.$router = { push(ruta) { window.rutaAbierta = ruta; } };
      window.montar = () => {
        document.body.innerHTML = '<div id="app"></div>';
        window.vm = new Vue({ el: '#app', render: h => h(menu) });
      };
      window.montar();
    }, componentes);

    assert.equal(await page.getByText('Registros de Cuentas', { exact: true }).isVisible(), true);
    async function crear(nombre, monto) {
      await page.getByRole('button', { name: '+ Agregar pestaña de deuda', exact: true }).click();
      assert.equal(await page.getByText('Registros de Cuentas', { exact: true }).isVisible(), false);
      await page.getByLabel('Nombre de la pestaña').fill(nombre);
      await page.getByLabel('Monto inicial ($)').fill(monto);
      await page.getByRole('button', { name: 'Crear pestaña', exact: true }).click();
      await page.getByRole('heading', { name: nombre, exact: true }).waitFor();
    }
    await crear('Deuda anterior 1', '25000.50');
    await crear('Deuda anterior 2', '18000');
    await page.getByRole('tab', { name: /Deuda anterior 1/ }).click();
    await page.getByLabel('Monto del abono ($)').fill('25000.51');
    await page.getByRole('button', { name: 'Guardar abono', exact: true }).click();
    assert.equal(await page.getByLabel('Monto del abono ($)').evaluate(input => input.validity.rangeOverflow), true);
    assert.equal(await page.locator('.historial li').count(), 0);
    await page.getByLabel('Monto del abono ($)').fill('5000.25');
    await page.getByLabel('Descripción (opcional)').fill('Transferencia de octubre');
    await page.evaluate(() => { window.fallarAbono = true; });
    await page.getByRole('button', { name: 'Guardar abono', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'No se pudo confirmar' }).waitFor();
    assert.equal(await page.getByLabel('Monto del abono ($)').inputValue(), '5000.25');
    await page.getByRole('button', { name: 'Guardar abono', exact: true }).click();
    await page.locator('.historial li').waitFor();
    assert.equal(await page.locator('.resumen .saldo strong').textContent(), '$20,000.25');
    assert.deepEqual(await page.evaluate(() => window.intentos[0] === window.intentos[1]), true);
    await page.screenshot({ path: '/tmp/deudas-catarro-desktop.png', fullPage: true });

    await page.getByRole('tab', { name: /Deuda anterior 2/ }).click();
    assert.equal(await page.locator('.historial li').count(), 0);
    assert.equal(await page.locator('.resumen .saldo strong').textContent(), '$18,000.00');
    await page.getByLabel('Monto del abono ($)').fill('18000');
    await page.getByRole('button', { name: 'Guardar abono', exact: true }).click();
    await page.locator('.liquidada').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Guardar abono', exact: true }).count(), 0);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Anular', exact: true }).click();
    await page.locator('.etiqueta-anulado').waitFor();
    assert.equal(await page.locator('.resumen .saldo strong').textContent(), '$18,000.00');
    await page.getByRole('tab', { name: 'Cuentas actuales', exact: true }).click();
    assert.equal(await page.getByText('Registros de Cuentas', { exact: true }).isVisible(), true);
    assert.equal(await page.locator('.formulario-abono').count(), 0);

    await page.evaluate(() => { vm.$destroy(); });
    assert.equal(await page.evaluate(() => numeroOyentes()), 0, 'desmontar cancela los listeners');
    await page.evaluate(() => montar());
    await page.getByRole('tab', { name: /Deuda anterior 1/ }).click();
    assert.equal(await page.locator('.resumen .saldo strong').textContent(), '$20,000.25');
    assert.equal(await page.locator('.historial li').count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('.catarro-cuentas-menu-container').count(), 1);
    await page.evaluate(() => { window.scrollTo(0, 0); });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: '/tmp/deudas-catarro-mobile.png', fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'sin desbordamiento horizontal en móvil');

    await page.getByRole('tab', { name: 'Cuentas actuales', exact: true }).click();
    await page.evaluate(async () => {
      await window.cargarCuentas([{ id: '2026-10-16', fecha: '2026-10-16', estadoPagado: true }]);
      window.cargarEmbarques([
        { id: 'antes', fecha: '2026-10-14', clientes: [{ id: '2', productos: [{ medida: '41/50', kilos: [10] }] }] },
        { id: 'pendiente', fecha: '2026-10-15', clientes: [{ id: '2', productos: [{ medida: '41/50', kilos: [25], precio: 100 }], crudos: [] }], clientesSumarKgCatarro: { '2': false } },
        { id: 'existe', fecha: '2026-10-16', clientes: [{ id: '2', productos: [{ medida: '41/50', kilos: [10] }] }] },
        { id: 'vacio', fecha: '2026-10-17', clientes: [{ id: '2', productos: [{ medida: '', kilos: [] }] }] },
        { id: 'otro', fecha: '2026-10-18', clientes: [{ id: '5', productos: [{ medida: '41/50', kilos: [10] }] }] },
      ]);
    });
    await page.getByRole('button', { name: 'Crear nota', exact: true }).waitFor();
    assert.equal(await page.locator('.cuenta-sin-nota').count(), 1);
    assert.match(await page.locator('.cuenta-sin-nota').innerText(), /2026-10-15/);
    assert.equal(await page.locator('.cuenta-sin-nota .delete-btn').count(), 0);
    await page.selectOption('#filter-select', 'pagadas');
    assert.equal(await page.locator('.cuenta-sin-nota').count(), 0);
    await page.selectOption('#filter-select', 'sin-nota');
    await page.locator('.cuenta-sin-nota').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/catarro-cuenta-pendiente-mobile.png' });
    await page.evaluate(() => { window.fallarCreacion = true; });
    await page.getByRole('button', { name: 'Crear nota', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Sin conexión' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Crear nota', exact: true }).isEnabled(), true);
    await page.getByRole('button', { name: 'Crear nota', exact: true }).click();
    await page.waitForFunction(() => window.rutaAbierta === '/cuentas-catarro/2026-10-15?edit=true');
    assert.equal(await page.locator('.cuenta-sin-nota').count(), 0);
    assert.equal(await page.evaluate(() => window.cuentaCreada.productos[0].kilos[0]), 25);
    assert.equal(await page.evaluate(() => window.cuentaCreada.clientesSumarKgCatarro['2']), false);
    assert.deepEqual(errors, []);
    console.log('PASS: deudas independientes y cuentas faltantes desde el 15/10/2026, filtros, creación, reintento y móvil.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
