const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { chromium } = require('playwright');

function load(filename) {
  const module = { exports: {} };
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, { module, exports: module.exports, require });
  return module.exports;
}

const root = path.resolve(__dirname, '..');
const {
  aplicarMetodoPagoAbono,
  abonoCatarroParaGuardar,
  abonoUsaMetodoPago,
  crearAbonoCatarro,
  errorMetodoPagoAbono,
  filtrarAbonosCatarro,
  listarAbonosCuentasCatarro,
  normalizarAbonoCatarro,
  validarAbonosCatarro,
} = load(path.join(root, 'src/utils/fechaAbonoCatarro.js'));

const fecha = '2026-10-18';
const dia = 'domingo 18/oct/26';
const plano = valor => JSON.parse(JSON.stringify(valor));
const vecesFecha = texto => (String(texto).match(/domingo 18\/oct\/26/g) || []).length;

function nuevo(monto = 1500) {
  return { descripcion: dia, monto, fechaAbono: fecha, metodoPago: '', metodoPagoOtro: '' };
}

test('la descripción usa el tipo elegido y la fecha, una sola vez', () => {
  const transferencia = aplicarMetodoPagoAbono(nuevo(), 'transferencia');
  assert.equal(transferencia.metodoPago, 'transferencia');
  assert.equal(transferencia.metodoPagoOtro, '');
  assert.equal(transferencia.descripcion, `Transferencia - ${dia}`);
  assert.equal(vecesFecha(transferencia.descripcion), 1);

  const deposito = aplicarMetodoPagoAbono(transferencia, 'deposito');
  assert.equal(deposito.descripcion, `Depósito - ${dia}`);
  assert.equal(deposito.metodoPagoOtro, '');
  assert.equal(vecesFecha(deposito.descripcion), 1);

  const efectivo = aplicarMetodoPagoAbono(deposito, 'efectivo');
  assert.equal(efectivo.descripcion, `Efectivo - ${dia}`);

  const otroVacio = aplicarMetodoPagoAbono(efectivo, 'otro', '   ');
  assert.equal(otroVacio.metodoPago, 'otro');
  assert.equal(otroVacio.descripcion, dia);

  const cheque = aplicarMetodoPagoAbono(otroVacio, 'otro', '  Cheque  ');
  assert.equal(cheque.descripcion, `Cheque - ${dia}`);
  assert.equal(cheque.metodoPagoOtro, '  Cheque  ');
  assert.equal(vecesFecha(cheque.descripcion), 1);

  const vale = aplicarMetodoPagoAbono(cheque, 'otro', 'vale de caja');
  assert.equal(vale.descripcion, `vale de caja - ${dia}`);
  assert.equal(vecesFecha(vale.descripcion), 1);
});

test('una descripción editada se conserva y no duplica la fecha', () => {
  const base = aplicarMetodoPagoAbono(nuevo(), 'transferencia');
  const editado = { ...base, descripcion: `pago en banco - ${dia}` };
  const siguiente = aplicarMetodoPagoAbono(editado, 'efectivo');
  assert.equal(siguiente.metodoPago, 'efectivo');
  assert.equal(siguiente.descripcion, `pago en banco - ${dia}`);
  assert.equal(vecesFecha(siguiente.descripcion), 1);

  const sinFecha = aplicarMetodoPagoAbono({ ...base, descripcion: 'nota del chofer' }, 'deposito');
  assert.equal(sinFecha.descripcion, `nota del chofer - ${dia}`);
  assert.equal(vecesFecha(sinFecha.descripcion), 1);
  assert.equal(normalizarAbonoCatarro(sinFecha).descripcion, sinFecha.descripcion);
  assert.equal(normalizarAbonoCatarro(sinFecha), sinFecha);

  const borrada = normalizarAbonoCatarro({ ...base, descripcion: '   ' });
  assert.equal(borrada.descripcion, `Transferencia - ${dia}`);
});

test('no se puede guardar sin tipo, ni con Otro vacío; el abono viejo sí', () => {
  const pendiente = nuevo();
  assert.equal(abonoUsaMetodoPago(pendiente), true);
  assert.equal(errorMetodoPagoAbono(pendiente), 'Elige el tipo de pago del abono.');
  assert.equal(validarAbonosCatarro([pendiente]).valido, false);

  const otroVacio = aplicarMetodoPagoAbono(pendiente, 'otro', '   ');
  assert.equal(errorMetodoPagoAbono(otroVacio), 'Escribe el tipo de pago.');
  assert.equal(validarAbonosCatarro([aplicarMetodoPagoAbono(pendiente, 'transferencia'), otroVacio]).indice, 1);

  for (const metodo of ['transferencia', 'deposito', 'efectivo']) {
    const abono = aplicarMetodoPagoAbono(pendiente, metodo);
    assert.equal(validarAbonosCatarro([abono]).valido, true);
    const guardado = abonoCatarroParaGuardar(abono);
    assert.equal(guardado.metodoPago, metodo);
    assert.equal(Object.prototype.hasOwnProperty.call(guardado, 'metodoPagoOtro'), false);
    assert.equal(guardado.fechaAbono, fecha);
  }

  const cheque = abonoCatarroParaGuardar(aplicarMetodoPagoAbono(pendiente, 'otro', '  Cheque  '));
  assert.deepEqual(plano(cheque), {
    descripcion: `Cheque - ${dia}`,
    monto: 1500,
    fechaAbono: fecha,
    metodoPago: 'otro',
    metodoPagoOtro: 'Cheque',
  });

  const viejo = { descripcion: 'spei', monto: 80 };
  assert.equal(abonoUsaMetodoPago(viejo), false);
  assert.equal(errorMetodoPagoAbono(viejo), '');
  assert.equal(validarAbonosCatarro([viejo, aplicarMetodoPagoAbono(pendiente, 'efectivo')]).valido, true);
  assert.equal(abonoCatarroParaGuardar(viejo), viejo);
  assert.equal(normalizarAbonoCatarro(viejo), viejo);
  assert.equal(validarAbonosCatarro(null).valido, true);
  assert.equal(crearAbonoCatarro(fecha, 10).metodoPago, '');
});

test('el listado muestra el tipo, conserva abonos viejos y filtra por método', () => {
  const cuentas = [
    {
      id: 'hoy',
      fecha: fecha,
      abonos: [
        { descripcion: `Transferencia - ${dia}`, monto: 1500, fechaAbono: fecha, metodoPago: 'transferencia', metodoPagoOtro: 'no-guardar' },
        { descripcion: `Cheque - ${dia}`, monto: 800, fechaAbono: fecha, metodoPago: 'otro', metodoPagoOtro: ' Cheque ' },
        { descripcion: 'spei', monto: 200 },
      ],
    },
    { id: 'antes', fecha: '2026-10-15', abonos: [{ descripcion: 'efectivo de caja', monto: 50, metodoPago: 'efectivo' }] },
  ];
  const lista = listarAbonosCuentasCatarro(cuentas);
  assert.deepEqual(plano(lista.map(abono => [abono.descripcion, abono.metodoPago, abono.etiquetaMetodo, abono.metodoPagoOtro])), [
    [`Cheque - ${dia}`, 'otro', 'Otro: Cheque', 'Cheque'],
    [`Transferencia - ${dia}`, 'transferencia', 'Transferencia', ''],
    ['spei', '', '', ''],
    ['efectivo de caja', 'efectivo', 'Efectivo', ''],
  ]);

  assert.deepEqual(plano(filtrarAbonosCatarro(lista, { metodo: 'transferencia' }).map(abono => abono.monto)), [1500]);
  assert.deepEqual(plano(filtrarAbonosCatarro(lista, { metodo: 'otro' }).map(abono => abono.etiquetaMetodo)), ['Otro: Cheque']);
  assert.deepEqual(plano(filtrarAbonosCatarro(lista, { metodo: 'sin-tipo' }).map(abono => abono.descripcion)), ['spei']);
  assert.equal(filtrarAbonosCatarro(lista, { metodo: 'deposito' }).length, 0);
  assert.equal(filtrarAbonosCatarro(lista, { mes: '2026-10', metodo: 'efectivo' }).length, 1);
  assert.equal(filtrarAbonosCatarro(lista).length, 4);
});

test('en móvil se elige el tipo, Otro es obligatorio y el modal filtra sin perder abonos viejos', async () => {
  const cuentaSfc = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/CuentasClientes/CuentaCliente.vue'), 'utf8'));
  const selectorSfc = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/components/Cuentas/SelectorMetodoPagoCatarro.vue'), 'utf8'));
  const modalSfc = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/components/Cuentas/ModalAbonosCatarro.vue'), 'utf8'));
  for (const sfc of [cuentaSfc, selectorSfc, modalSfc]) {
    assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
  }
  const compile = source => babel.transformSync(source, {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const sources = {
    component: compile(cuentaSfc.script.content),
    selector: compile(selectorSfc.script.content),
    modal: compile(modalSfc.script.content),
    '@/utils/dinero': compile(fs.readFileSync(path.join(root, 'src/utils/dinero.js'), 'utf8')),
    '@/utils/saldosCatarro': compile(fs.readFileSync(path.join(root, 'src/utils/saldosCatarro.js'), 'utf8')),
    '@/utils/fechaAbonoCatarro': compile(fs.readFileSync(path.join(root, 'src/utils/fechaAbonoCatarro.js'), 'utf8')),
  };
  const templates = {
    component: cuentaSfc.template.content,
    selector: selectorSfc.template.content,
    modal: modalSfc.template.content,
  };
  const estilos = [cuentaSfc, selectorSfc, modalSfc].map(sfc => sfc.styles.map(estilo => estilo.content).join('\n')).join('\n');
  const artefactos = '/opt/cursor/artifacts';
  fs.mkdirSync(artefactos, { recursive: true });

  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    await page.setContent('<div id="app"></div>');
    await page.addScriptTag({ path: require.resolve('vue/dist/vue.js') });
    await page.addStyleTag({
      content: 'body{font-family:Arial,sans-serif;margin:0;background:#eef1f6}*{box-sizing:border-box}' + estilos,
    });
    await page.evaluate(({ sources, templates }) => {
      const mocks = {
        '@/utils/dateUtils': { normalizarFechaISO: fecha => String(fecha || '').slice(0, 10) },
        '@/constants/clientesConfig': { CLIENTES_CONFIG: { catarro: { titulo: 'Cuenta Catarro', backPath: '/cuentas-catarro', features: {} } } },
        '@/utils/formatters': {
          formatNumber: n => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          formatearFecha: fecha => {
            const [anio, mes, dia] = String(fecha || '').slice(0, 10).split('-');
            return dia ? `${dia}/${mes}/${anio}` : 'Sin fecha';
          },
        },
      };
      function load(id) {
        if (id in mocks) return mocks[id];
        if (id === './dinero') id = '@/utils/dinero';
        const clave = id === '@/components/Cuentas/SelectorMetodoPagoCatarro.vue' ? 'selector'
          : id === '@/components/Cuentas/ModalAbonosCatarro.vue' ? 'modal'
            : id;
        if (!(clave in sources)) return id.endsWith('.vue') ? { default: { name: 'Vacio', template: '<span />' } } : {};
        const module = { exports: {} };
        new Function('require', 'module', 'exports', sources[clave])(load, module, module.exports);
        if (templates[clave]) module.exports.default = { ...module.exports.default, template: templates[clave] };
        return module.exports;
      }
      const component = load('component').default;
      component.mounted = [];
      component.watch = {};
      Vue.prototype.$route = { params: {}, query: {} };
      window.app = new Vue({
        el: '#app',
        render: h => h({ ...component, template: templates.component }, { props: { clienteId: 'catarro' } }),
      });
      window.form = app.$children[0];
      window.ModalAbonos = load('modal').default;
      Object.assign(form, {
        fechaSeleccionada: '2026-10-18',
        saldoAcumuladoAnterior: 1200,
        itemsVenta: [{ kilosVenta: 10, medida: '41/50', precioVenta: 180, totalVenta: 1800 }],
        cobros: [{ descripcion: 'Flete', monto: 300 }],
        abonos: [
          { descripcion: 'domingo 18/oct/26', monto: 1500, fechaAbono: '2026-10-18', metodoPago: '', metodoPagoOtro: '' },
          { descripcion: 'spei', monto: 400 },
        ],
      });
    }, { sources, templates });

    assert.deepEqual(errors, []);
    const selector = page.locator('.selector-metodo-pago');
    await selector.waitFor();
    assert.equal(await selector.count(), 1, 'el abono viejo no muestra el selector');
    assert.deepEqual(await page.getByRole('radio').allTextContents(), ['Transferencia', 'Depósito', 'Efectivo', 'Otro']);
    const altoPastilla = await page.getByRole('radio', { name: 'Transferencia' }).evaluate(boton => boton.getBoundingClientRect().height);
    assert.ok(altoPastilla >= 44, `la pastilla mide ${altoPastilla}px`);

    await page.getByRole('radio', { name: 'Transferencia' }).click();
    assert.equal(await page.locator('.abonos input[aria-label="Descripción del abono"]').first().inputValue(), 'Transferencia - domingo 18/oct/26');
    assert.equal(await page.locator('.abonos input[aria-label="Descripción del abono"]').nth(1).inputValue(), 'spei');
    await page.locator('.abonos').screenshot({ path: path.join(artefactos, 'catarro-selector-tipo-pago.png') });

    await page.getByRole('radio', { name: 'Otro' }).click();
    const campoOtro = page.getByLabel('Escribe el tipo de pago');
    await campoOtro.waitFor();
    assert.ok(await campoOtro.evaluate(campo => campo.getBoundingClientRect().height) >= 44);
    await campoOtro.fill('Cheque');
    assert.equal(await page.locator('.abonos input[aria-label="Descripción del abono"]').first().inputValue(), 'Cheque - domingo 18/oct/26');
    assert.deepEqual(await page.locator('[role="radio"][aria-checked="true"]').allTextContents(), ['Otro']);
    const guardado = await page.evaluate(() => form.abonosParaPersistir()[0]);
    assert.equal(guardado.metodoPago, 'otro');
    assert.equal(guardado.metodoPagoOtro, 'Cheque');
    assert.equal(guardado.descripcion, 'Cheque - domingo 18/oct/26');
    assert.equal((guardado.descripcion.match(/domingo 18\/oct\/26/g) || []).length, 1);
    await page.locator('.abonos').screenshot({ path: path.join(artefactos, 'catarro-tipo-pago-otro.png') });

    await page.locator('.abonos input[aria-label="Descripción del abono"]').first().fill('Cheque de caja - domingo 18/oct/26');
    await page.locator('.abonos input[aria-label="Descripción del abono"]').first().blur();
    await page.getByRole('radio', { name: 'Efectivo' }).click();
    assert.equal(await page.evaluate(() => form.abonos[0].descripcion), 'Cheque de caja - domingo 18/oct/26');
    assert.equal(await page.evaluate(() => form.abonos[0].metodoPago), 'efectivo');
    assert.equal(await page.evaluate(() => Object.prototype.hasOwnProperty.call(form.abonosParaPersistir()[0], 'metodoPagoOtro')), false);

    await page.evaluate(() => { form.abonos.splice(0, 1, { descripcion: 'domingo 18/oct/26', monto: 1500, fechaAbono: '2026-10-18', metodoPago: '', metodoPagoOtro: '' }); });
    assert.equal(await page.evaluate(() => form.saveQueue.length), 0);
    await page.evaluate(() => form.queueSave());
    assert.equal(await page.evaluate(() => form.saveQueue.length), 0);
    await page.getByRole('button', { name: 'Guardar Nota' }).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /Elige el tipo de pago/);
    assert.equal(await page.evaluate(() => form.isGuardando), false);

    await page.getByRole('radio', { name: 'Otro' }).click();
    await page.getByRole('button', { name: 'Guardar Nota' }).click();
    assert.match(await page.getByRole('alert').innerText(), /Escribe el tipo de pago/);
    await page.getByLabel('Escribe el tipo de pago').fill('   ');
    assert.equal(await page.evaluate(() => form.abonosCatarroPuedenGuardarse()), false);
    await page.getByLabel('Escribe el tipo de pago').fill('vale');
    assert.equal(await page.evaluate(() => form.abonosCatarroPuedenGuardarse()), true);
    assert.equal(await page.evaluate(() => {
      form.abonos = [{ descripcion: 'spei', monto: 400 }];
      return form.abonosCatarroPuedenGuardarse();
    }), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);

    await page.evaluate(plantilla => {
      window.app.$destroy();
      document.body.innerHTML = '<div id="app"></div>';
      const modal = new Vue({
        el: '#app',
        render: h => h({ ...window.ModalAbonos, template: plantilla }, {
          props: {
            cuentas: [
              {
                id: 'hoy',
                fecha: '2026-10-18',
                abonos: [
                  { descripcion: 'Transferencia - domingo 18/oct/26', monto: 1500, fechaAbono: '2026-10-18', metodoPago: 'transferencia' },
                  { descripcion: 'Depósito - domingo 18/oct/26', monto: 900, fechaAbono: '2026-10-18', metodoPago: 'deposito' },
                  { descripcion: 'Cheque - domingo 18/oct/26', monto: 800, fechaAbono: '2026-10-18', metodoPago: 'otro', metodoPagoOtro: 'Cheque' },
                ],
              },
              { id: 'vieja', fecha: '2026-10-15', abonos: [{ descripcion: 'spei', monto: 400 }] },
            ],
          },
        }),
      });
      window.modal = modal.$children[0];
    }, templates.modal);
    await page.locator('.dialogo-abonos-catarro').waitFor();
    assert.deepEqual(await page.locator('.tipo-pago').allTextContents(), ['Otro: Cheque', 'Depósito', 'Transferencia']);
    assert.match(await page.locator('.lista-abonos').innerText(), /spei/);
    await page.getByLabel('Filtrar por tipo de pago').selectOption('transferencia');
    assert.deepEqual(await page.locator('.tipo-pago').allTextContents(), ['Transferencia']);
    assert.doesNotMatch(await page.locator('.lista-abonos').innerText(), /spei/);
    await page.getByLabel('Filtrar por tipo de pago').selectOption('sin-tipo');
    assert.equal(await page.locator('.tipo-pago').count(), 0);
    assert.match(await page.locator('.lista-abonos').innerText(), /spei/);
    await page.getByRole('button', { name: 'Quitar filtro' }).click();
    assert.equal(await page.locator('.lista-abonos li').count(), 4);
    assert.equal(await page.locator('.dialogo-abonos-catarro').evaluate(dialogo => dialogo.scrollWidth <= dialogo.clientWidth + 1), true);
    await page.locator('.dialogo-abonos-catarro').evaluate(dialogo => { dialogo.style.maxHeight = 'none'; });
    await page.locator('.dialogo-abonos-catarro').screenshot({ path: path.join(artefactos, 'catarro-modal-abonos-tipo.png') });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
