const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const babel = require('@babel/core');

function contexto() {
  const registros = new Map([['cuentasCatarro/actual', { saldoAcumuladoAnterior: 500, abonos: [] }],
    ['stash/catarro', { saldo: 300 }]]);
  const versiones = new Map();
  const accesos = [];
  let secuencia = 0;
  const ref = partes => {
    const ruta = partes.filter(Boolean).map(parte => typeof parte === 'object' ? parte.path : parte).join('/');
    accesos.push(ruta);
    return { path: ruta, id: ruta.split('/').pop() };
  };
  const firestore = {
    collection: (_, ...partes) => ref(partes),
    doc: (base, ...partes) => ref(base.path ? [base, ...partes, ...(partes.length ? [] : ['auto-' + ++secuencia])] : partes),
    serverTimestamp: () => ({ seconds: 1 }),
    onSnapshot: () => () => {},
    async runTransaction(_, callback) {
      for (let intento = 0; intento < 5; intento++) {
        const leidos = new Map();
        const escrituras = [];
        const resultado = await callback({
          async get(referencia) {
            assert.equal(escrituras.length, 0, 'Firestore requiere lecturas antes de escrituras');
            leidos.set(referencia.path, versiones.get(referencia.path) || 0);
            const data = registros.get(referencia.path);
            return { exists: () => !!data, data: () => structuredClone(data) };
          },
          set: (referencia, data) => escrituras.push([referencia.path, structuredClone(data)]),
          update: (referencia, data) => escrituras.push([referencia.path, { ...registros.get(referencia.path), ...structuredClone(data) }]),
        });
        if ([...leidos].some(([ruta, version]) => (versiones.get(ruta) || 0) !== version)) continue;
        for (const [ruta, data] of escrituras) {
          registros.set(ruta, data);
          versiones.set(ruta, (versiones.get(ruta) || 0) + 1);
        }
        return resultado;
      }
      throw new Error('Demasiados conflictos');
    },
  };
  const filename = path.resolve(__dirname, '../src/services/deudasCatarro.service.js');
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require(id) {
    if (id === '@/firebase') return { db: {} };
    if (id === 'firebase/firestore') return firestore;
    throw new Error('Importación inesperada ' + id);
  } }, { filename });
  return { servicio: module.exports, registros, accesos };
}

const datosDeuda = { nombre: 'Deuda 2025', monto: '100.30', fecha: '2025-12-01' };
const datosAbono = { monto: '50.10', fecha: '2026-10-16', descripcion: 'Transferencia' };
const ruta = id => 'deudasCatarroIndependientes/' + id;

test('crea varias deudas y registra abonos sin tocar cuentas, stash ni otra deuda', async () => {
  const { servicio, registros, accesos } = contexto();
  await servicio.crearDeuda('uno', datosDeuda);
  await servicio.crearDeuda('dos', { ...datosDeuda, nombre: 'Deuda 2024', monto: 200 });
  await servicio.registrarAbono('uno', 'pago1', datosAbono);
  assert.equal(registros.get(ruta('uno')).montoInicialCentavos, 10030);
  assert.equal(registros.get(ruta('uno')).totalAbonadoCentavos, 5010);
  assert.equal(registros.get(ruta('dos')).totalAbonadoCentavos, 0);
  assert.deepEqual(registros.get('cuentasCatarro/actual'), { saldoAcumuladoAnterior: 500, abonos: [] });
  assert.deepEqual(registros.get('stash/catarro'), { saldo: 300 });
  assert.ok(accesos.every(ruta => ruta.startsWith('deudasCatarroIndependientes/')));
});

test('reintentar la creación o el mismo abono no duplica ni reinicia saldos', async () => {
  const { servicio, registros } = contexto();
  await servicio.crearDeuda('uno', datosDeuda);
  await servicio.registrarAbono('uno', 'pago1', datosAbono);
  await servicio.registrarAbono('uno', 'pago1', datosAbono);
  await servicio.crearDeuda('uno', datosDeuda);
  assert.equal(registros.get(ruta('uno')).totalAbonadoCentavos, 5010);
  assert.equal([...registros.keys()].filter(key => key.includes('/abonos/')).length, 1);
  await assert.rejects(servicio.registrarAbono('uno', 'pago1', { ...datosAbono, monto: 60 }), /otros datos/);
});

test('liquida exactamente los centavos y rechaza abonos mayores al saldo', async () => {
  const { servicio, registros } = contexto();
  await servicio.crearDeuda('uno', datosDeuda);
  await servicio.registrarAbono('uno', 'pago1', datosAbono);
  await assert.rejects(servicio.registrarAbono('uno', 'exceso', { ...datosAbono, monto: '50.21' }), /supera/);
  assert.equal(registros.has(ruta('uno') + '/abonos/exceso'), false);
  await servicio.registrarAbono('uno', 'pago2', { ...datosAbono, monto: '50.20' });
  assert.equal(registros.get(ruta('uno')).totalAbonadoCentavos, 10030);
  await assert.rejects(servicio.registrarAbono('uno', 'pago3', { ...datosAbono, monto: '.01' }));
  await assert.rejects(servicio.registrarAbono('uno', 'pago3', { ...datosAbono, monto: '0.01' }), /supera/);
});

test('abonos simultáneos se acumulan sin perder dinero', async () => {
  const { servicio, registros } = contexto();
  await servicio.crearDeuda('uno', datosDeuda);
  await Promise.all([
    servicio.registrarAbono('uno', 'a', { ...datosAbono, monto: '30.10' }),
    servicio.registrarAbono('uno', 'b', { ...datosAbono, monto: '40.20' }),
  ]);
  assert.equal(registros.get(ruta('uno')).totalAbonadoCentavos, 7030);
});

test('dos abonos simultáneos no pueden sobrepasar juntos el saldo', async () => {
  const { servicio, registros } = contexto();
  await servicio.crearDeuda('uno', datosDeuda);
  const resultados = await Promise.allSettled([
    servicio.registrarAbono('uno', 'a', { ...datosAbono, monto: 70 }),
    servicio.registrarAbono('uno', 'b', { ...datosAbono, monto: 70 }),
  ]);
  assert.equal(resultados.filter(resultado => resultado.status === 'fulfilled').length, 1);
  assert.equal(registros.get(ruta('uno')).totalAbonadoCentavos, 7000);
});

test('anular conserva el historial y devuelve el saldo una sola vez', async () => {
  const { servicio, registros } = contexto();
  await servicio.crearDeuda('uno', datosDeuda);
  await servicio.registrarAbono('uno', 'a', datosAbono);
  await Promise.all([servicio.anularAbono('uno', 'a'), servicio.anularAbono('uno', 'a')]);
  const abono = registros.get(ruta('uno') + '/abonos/a');
  assert.equal(abono.anulado, true);
  assert.equal(abono.montoCentavos, 5010);
  assert.equal(registros.get(ruta('uno')).totalAbonadoCentavos, 0);
  await servicio.registrarAbono('uno', 'a', datosAbono);
  assert.equal(registros.get(ruta('uno')).totalAbonadoCentavos, 0, 'reintentar un abono anulado no lo reactiva');
});

test('rechaza importes inválidos, fechas imposibles y nombres vacíos', async () => {
  const { servicio, registros } = contexto();
  for (const monto of ['', 0, -1, 'NaN', Infinity, '1.001', '1e3', '12pesos', '9999999999999999']) {
    await assert.rejects(servicio.crearDeuda('uno', { ...datosDeuda, monto }));
  }
  for (const fecha of ['', '2026-02-30', '2026-13-01', 'ayer']) {
    await assert.rejects(servicio.crearDeuda('uno', { ...datosDeuda, fecha }), /fecha/);
  }
  await assert.rejects(servicio.crearDeuda('uno', { ...datosDeuda, nombre: '  ' }), /nombre/);
  assert.equal(registros.has(ruta('uno')), false);
  assert.equal(servicio.montoACentavos('0.29'), 29);
  assert.equal(servicio.montoACentavos('100,30'), 10030);
});

test('registrar o anular en una deuda inexistente no crea documentos sueltos', async () => {
  const { servicio, registros } = contexto();
  await assert.rejects(servicio.registrarAbono('no-existe', 'pago', datosAbono), /disponible/);
  await assert.rejects(servicio.anularAbono('no-existe', 'pago'), /encontró/);
  assert.equal(registros.size, 2);
});
