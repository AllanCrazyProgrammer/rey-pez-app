const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function loadModule(filename, mocks = {}, cache = new Map()) {
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, {
    module,
    process,
    Uint8Array,
    exports: module.exports,
    console: { log() {}, error() {}, warn() {} },
    require(id) {
      if (id in mocks) return mocks[id];
      if (id.startsWith('.')) return loadModule(path.resolve(path.dirname(filename), id + '.js'), mocks, cache);
      return require(id);
    },
  }, { filename });
  return module.exports;
}

function cargarServicio({ previas = [], precios = [], mismaFecha = [], alLeerSaldo = null } = {}) {
  let cuenta = null;
  const firestore = {
    getFirestore: () => ({}),
    collection: (_, nombre) => nombre,
    doc: (_, nombre, id) => ({ nombre, id }),
    query: (ref, ...filtros) => ({ ref, filtros }),
    where: (...args) => args,
    orderBy: (...args) => args,
    limit: (valor) => valor,
    async getDocs(consulta) {
      if (consulta.ref === 'precios') {
        return {
          docs: precios.map((data) => ({ data: () => data })),
          empty: precios.length === 0,
        };
      }
      if (consulta.ref !== 'cuentasCatarro') {
        return { docs: [], empty: true };
      }
      const esAnterior = consulta.filtros.some((filtro) => Array.isArray(filtro) && filtro[1] === '<');
      if (esAnterior) {
        if (alLeerSaldo) throw alLeerSaldo;
        return {
          docs: previas.map((data) => ({ data: () => data })),
          empty: previas.length === 0,
        };
      }
      const esMismaFecha = consulta.filtros.some((filtro) => Array.isArray(filtro) && filtro[1] === '==');
      if (esMismaFecha) {
        return {
          docs: mismaFecha.map((data) => ({ data: () => data })),
          empty: mismaFecha.length === 0,
        };
      }
      return { docs: [], empty: true };
    },
    async runTransaction(_, callback) {
      await callback({
        get: async () => ({ exists: () => !!cuenta }),
        set: (_, data) => { cuenta = data; },
      });
    },
  };

  const servicio = loadModule(
    path.resolve(__dirname, '../src/utils/services/EmbarqueCuentasService.js'),
    { 'firebase/firestore': firestore }
  );
  return {
    servicio,
    cuenta: () => cuenta,
    fijarCuenta(data) { cuenta = data; },
  };
}

const embarqueBase = {
  fecha: '2026-10-14',
  productos: [{
    medida: '41/50',
    kilos: [100],
    taras: [2],
    restarTaras: false,
    precio: 10,
  }],
  clienteCrudos: { '2': [] },
};

test('el resumen pide la cuenta de Catarro solo cuando falta, igual que Ozuna y Lorena', () => {
  const { CUENTAS_AUTOMATICAS_RESUMEN, cuentasFaltantesParaResumen } = loadModule(
    path.resolve(__dirname, '../src/utils/cuentasResumenEmbarque.js')
  );

  assert.equal(
    CUENTAS_AUTOMATICAS_RESUMEN.map((cuenta) => cuenta.id).join(','),
    'ozuna,veronica,catarro'
  );
  assert.equal(CUENTAS_AUTOMATICAS_RESUMEN.find((cuenta) => cuenta.id === 'catarro').clienteId, '2');

  const faltantes = cuentasFaltantesParaResumen({ ozuna: true, veronica: false, catarro: false });
  assert.equal(faltantes.map((cuenta) => cuenta.id).join(','), 'veronica,catarro');

  const regeneracion = cuentasFaltantesParaResumen({ ozuna: true, veronica: true, catarro: true });
  assert.equal(regeneracion.length, 0);
});

test('Catarro: colección vacía deja saldo anterior en 0 y arma items e itemsVenta', async () => {
  const { servicio, cuenta } = cargarServicio();
  const id = await servicio.crearCuentaCatarro(embarqueBase, null);

  assert.equal(id, '2026-10-14');
  const data = cuenta();
  assert.equal(data.saldoAcumuladoAnterior, 0);
  assert.equal(data.items.length, 1);
  assert.equal(data.itemsVenta.length, 1);
  assert.equal(data.items[0].kilos, 100);
  assert.equal(data.items[0].medida, '41/50');
  assert.equal(data.itemsVenta[0].kilosVenta, 100);
  assert.equal(data.itemsVenta[0].precioVenta, 10);
  assert.equal(data.itemsVenta[0].totalVenta, 1000);
  assert.equal(data.totalGeneralVenta, 1000);
  assert.equal(data.cobros.length, 1);
  assert.equal(data.cobros[0].descripcion, 'Flete');
  assert.equal(data.cobros[0].monto, 200);
  assert.equal(data.nuevoSaldoAcumulado, 800);
  assert.equal(data.abonos.length, 0);
});

test('Catarro: encadena el nuevoSaldoAcumulado de la nota anterior', async () => {
  const { servicio, cuenta } = cargarServicio({
    previas: [{ fecha: '2026-10-13', nuevoSaldoAcumulado: 450 }],
  });
  await servicio.crearCuentaCatarro(embarqueBase, null);
  const data = cuenta();
  assert.equal(data.saldoAcumuladoAnterior, 450);
  assert.equal(data.nuevoSaldoAcumulado, 1250);
});

test('Catarro: el precio propio del cliente gana al precio general', async () => {
  const { servicio, cuenta } = cargarServicio({
    precios: [
      { producto: '41/50', precio: 80, fecha: '2026-10-12', timestamp: 2 },
      { producto: '41/50', precio: 95, clienteId: 'catarro', fecha: '2026-10-10', timestamp: 1 },
    ],
  });
  await servicio.crearCuentaCatarro(embarqueBase, null);
  assert.equal(cuenta().itemsVenta[0].precioVenta, 95);
  assert.equal(cuenta().itemsVenta[0].totalVenta, 9500);
  assert.equal(cuenta().nuevoSaldoAcumulado, 9300);
});

test('Catarro: generar la cuenta otra vez no duplica ni pisa abonos', async () => {
  const contexto = cargarServicio();
  await contexto.servicio.crearCuentaCatarro(embarqueBase, null);
  contexto.fijarCuenta({
    ...contexto.cuenta(),
    abonos: [{ descripcion: 'Depósito', monto: 300 }],
  });

  await assert.rejects(
    () => contexto.servicio.crearCuentaCatarro({
      ...embarqueBase,
      productos: [{ ...embarqueBase.productos[0], kilos: [40], precio: 99 }],
    }, null),
    (error) => error.code === 'cuenta-duplicada'
  );

  const data = contexto.cuenta();
  assert.equal(data.itemsVenta[0].precioVenta, 10);
  assert.equal(data.abonos.length, 1);
  assert.equal(data.abonos[0].descripcion, 'Depósito');
  assert.equal(data.abonos[0].monto, 300);
});

test('Catarro: un fallo al leer el saldo anterior no guarda la cuenta en 0', async () => {
  const { servicio, cuenta } = cargarServicio({
    alLeerSaldo: new Error('unavailable'),
  });
  await assert.rejects(
    () => servicio.crearCuentaCatarro(embarqueBase, null),
    /saldo anterior/
  );
  assert.equal(cuenta(), null);
});

async function generarNota(embarque, { juntar = false, sumarKg = false, precios = true, clientes } = {}) {
  let documento;
  const { generarNotaVentaPDF } = loadModule(path.resolve(__dirname, '../src/utils/pdfGenerator.js'), {
    'pdfmake/build/pdfmake': { createPdf(definition) { documento = definition; return {}; } },
    'pdfmake/build/vfs_fonts': {},
    '@/firebase': { db: {} },
    'firebase/firestore': {},
    './pdf/delivery': { obtenerBufferPdf: async () => new Uint8Array(), entregarPdf: async () => {} },
  });
  await generarNotaVentaPDF(embarque, clientes || [{ id: '2', nombre: 'Catarro' }],
    { '2': juntar }, {}, { '2': precios }, { '2': sumarKg }, { '2': precios });
  assert.ok(documento, 'se debe generar la nota completa');
  const filas = [];
  function recorrer(node) {
    if (!node || typeof node !== 'object') return;
    if (node.table) filas.push(...node.table.body.filter(row => typeof row[0] === 'string' && / kg$/.test(row[0])));
    Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(recorrer) : recorrer(value));
  }
  recorrer(documento.content);
  return filas;
}

function productoCatarro(cambios = {}) {
  return { clienteId: '2', medida: '41/50', tipo: 's/h20', kilos: [100.25], taras: [2],
    reporteTaras: [], reporteBolsas: [], tarasExtra: [1], restarTaras: true, precio: 100, ...cambios };
}

for (const fecha of ['2026-10-16', '2026-10-17']) {
  for (const sumarKg of [false, true]) {
    test(`Catarro ${fecha}, sumar kg ${sumarKg}: nota, copia y cuenta conservan los mismos decimales`, async () => {
      const embarque = { fecha, productos: [productoCatarro()], clienteCrudos: { '2': [] },
        clientesSumarKgCatarro: { '2': sumarKg } };
      const original = JSON.stringify(embarque);
      const { servicio, cuenta } = cargarServicio();
      await servicio.crearCuentaCatarro(embarque, null);
      const esperado = sumarKg ? 95.25 : 94.25;
      assert.equal(cuenta().items[0].kilos, esperado);
      assert.equal(cuenta().itemsVenta[0].kilosVenta, esperado);
      assert.equal(cuenta().itemsVenta[0].totalVenta, esperado * 100);
      const filas = await generarNota(embarque, { sumarKg });
      assert.deepEqual(filas.map(row => row[0]), [`${esperado} kg`, `${esperado} kg`]);
      assert.equal(filas[0][4].text, `$${(esperado * 100).toLocaleString('en-US')}`);
      assert.equal(JSON.stringify(embarque), original, 'generar la nota no modifica el embarque');
    });
  }
}

test('Catarro: juntar medidas suma los mismos pesos y ajustes por producto que la cuenta', async () => {
  const embarque = { fecha: '2026-10-16', productos: [
    productoCatarro(),
    productoCatarro({ kilos: [50.5], restarTaras: false, noSumarKilos: true }),
    productoCatarro({ kilos: [20.1], restarTaras: false }),
  ], clientesSumarKgCatarro: { '2': true } };
  const { servicio, cuenta } = cargarServicio();
  await servicio.crearCuentaCatarro(embarque, null);
  assert.equal(cuenta().itemsVenta.reduce((sum, item) => sum + item.kilosVenta, 0), 166.85);
  const filas = await generarNota(embarque, { sumarKg: true, juntar: true, precios: false });
  assert.deepEqual(filas.map(row => row[0]), ['166.85 kg', '166.85 kg']);
});

test('Catarro: c/h20 conserva el peso neto decimal en las dos hojas y en la cuenta', async () => {
  const embarque = { fecha: '2026-10-16', productos: [productoCatarro({
    tipo: 'c/h20', kilos: [], reporteTaras: [1], reporteBolsas: [3], camaronNeto: 0.65,
  })] };
  const { servicio, cuenta } = cargarServicio();
  await servicio.crearCuentaCatarro(embarque, null);
  assert.equal(cuenta().itemsVenta[0].kilosVenta, 1.95);
  const filas = await generarNota(embarque);
  assert.deepEqual(filas.map(row => row[0]), ['1.95 kg', '1.95 kg']);
  assert.equal(filas[0][4].text, '$195');
});

test('Catarro: crudos con dos sobrantes, fracciones sueltas y sobrantes ocultos coinciden con la cuenta', async () => {
  const embarque = { fecha: '2026-10-16', productos: [productoCatarro({ kilos: [], taras: [] })],
    clienteCrudos: { '2': [{ items: [
      { talla: 'Med c/c', taras: '10-19', sobrante: '1-10.25', mostrarSobrante: true,
        sobrante2: '1-0.5', mostrarSobrante2: true, precio: 100 },
      { talla: 'Ch c/c', taras: '0.25', sobrante: '1-9.5', mostrarSobrante: false, precio: 100 },
      { talla: 'Gde c/c', taras: '2-18.5', sobrantes: ['1-2.5', '1-3.25'], precio: 100 },
    ] }] } };
  const { servicio, cuenta } = cargarServicio();
  await servicio.crearCuentaCatarro(embarque, null);
  assert.deepEqual(Array.from(cuenta().itemsVenta, item => item.kilosVenta), [210.75, 0.25, 45.75]);
  const filas = await generarNota(embarque);
  assert.deepEqual(filas.map(row => row[0]), ['210.75 kg', '0.25 kg', '45.75 kg', '210.75 kg', '0.25 kg', '45.75 kg']);
  assert.equal(filas[0][4].text, '$21,075');
});

test('Catarro: antes del 16 de octubre las notas y cuentas conservan el redondeo anterior', async () => {
  const embarque = { fecha: '2026-10-15', productos: [productoCatarro({ kilos: [100.4] })] };
  const { servicio, cuenta } = cargarServicio();
  await servicio.crearCuentaCatarro(embarque, null);
  assert.equal(cuenta().itemsVenta[0].kilosVenta, 94);
  const filas = await generarNota(embarque);
  assert.deepEqual(filas.map(row => row[0]), ['94 kg', '94 kg']);
});

test('el cambio de Catarro no cambia el redondeo de Elizabeth', async () => {
  const embarque = { fecha: '2026-10-16', productos: [productoCatarro({ clienteId: '5', kilos: [100.4] })] };
  const filas = await generarNota(embarque, { clientes: [{ id: '5', nombre: 'Elizabeth' }] });
  assert.deepEqual(filas.map(row => row[0]), ['94 kg', '94 kg']);
});
