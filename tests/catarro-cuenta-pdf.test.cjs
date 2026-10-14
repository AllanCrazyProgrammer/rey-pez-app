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
