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
    const componentes = {
      deudas: componente('src/components/Cuentas/DeudasCatarro.vue'),
      menu: componente('src/views/CuentasClientes/CatarroCuentasMenu.vue'),
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
        '@/utils/dateUtils': { obtenerFechaActualISO: () => '2026-10-16' },
        '@/utils/formatters': { formatNumber: value => Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), formatearFecha: fecha => fecha },
        '@/firebase': { db: {} },
        'firebase/firestore': { collection() {}, query() {}, orderBy() {}, onSnapshot(_, fn) { fn({ docs: [] }); return () => {}; } },
        '@/services/PapeleraService': {}, '@/utils/dinero': { sonMontosIguales: (a, b) => a === b },
        '@/components/BackButton.vue': { template: '<span></span>' },
        '@/components/PreciosHistorialModal.vue': { template: '<button>Precios de venta</button>' },
        '@/components/StashModalV2.vue': { template: '<button>Stash</button>' },
      };
      mocks['@/components/Cuentas/DeudasCatarro.vue'] = { ...load(componentes.deudas.script, mocks), template: componentes.deudas.template };
      const menu = { ...load(componentes.menu.script, mocks), template: componentes.menu.template };
      Vue.component('router-link', { props: ['to'], template: '<a :href="to"><slot /></a>' });
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
    assert.deepEqual(errors, []);
    console.log('PASS: varias pestañas, abonos independientes, reintento, liquidación, anulación, recarga y móvil.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
