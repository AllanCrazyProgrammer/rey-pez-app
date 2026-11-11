const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/crudosHistorico.js'), 'utf8');
const helpers = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('lee taras y kilos de cada formato de captura', async () => {
  const { leerCampoTaras } = await helpers;
  assert.deepEqual(leerCampoTaras('10-19'), { taras: 10, kilos: 190 });
  assert.deepEqual(leerCampoTaras('10-18.5'), { taras: 10, kilos: 185 });
  assert.deepEqual(leerCampoTaras('1-10'), { taras: 1, kilos: 10 });
  assert.deepEqual(leerCampoTaras('7'), { taras: 7, kilos: 133 });
  assert.deepEqual(leerCampoTaras(''), { taras: 0, kilos: 0 });
  assert.deepEqual(leerCampoTaras(null), { taras: 0, kilos: 0 });
});

test('suma taras con sobrantes como el total de taras del embarque', async () => {
  const { medirCrudoItem } = await helpers;
  assert.deepEqual(medirCrudoItem({ taras: '10-19', sobrante: '1-10', sobrante2: '2' }), { taras: 13, kilos: 238 });
});

test('agrupa por fecha, cliente y talla entre varios embarques', async () => {
  const { filasCrudosDeEmbarques } = await helpers;
  const embarques = [
    { id: 'a', fecha: '2025-10-10', clientes: [
      { id: '1', nombre: 'Joselito', productos: [], crudos: [{ items: [{ talla: 'Med c/c', taras: '10-19' }, { talla: 'Gde c/c', taras: '5-19' }] }] },
      { id: '3', nombre: 'Otilio', crudos: [] }
    ] },
    { id: 'b', fecha: { seconds: Date.UTC(2025, 9, 10, 12) / 1000 }, clientes: [
      { id: '1', nombre: 'Joselito', crudos: [{ items: [{ talla: 'Med c/c', taras: '2-19', sobrante: '1-8', mostrarSobrante: true }] }] }
    ] },
    { id: 'c', fecha: '2024-10-10T00:00:00.000Z', clientes: [
      { id: '4', nombre: 'Ozuna', crudos: [{ items: [{ talla: 'Med c/c', taras: '' }, { talla: '', taras: '3-19' }] }] }
    ] }
  ];
  assert.deepEqual(filasCrudosDeEmbarques(embarques), [
    { fecha: '2025-10-10', cliente: 'Joselito', talla: 'Gde c/c', taras: 5, kilos: 95, embarques: 1 },
    { fecha: '2025-10-10', cliente: 'Joselito', talla: 'Med c/c', taras: 13, kilos: 236, embarques: 2 }
  ]);
});

test('lee el formato viejo clienteCrudos cuando clientes no trae crudos', async () => {
  const { filasCrudosDeEmbarques } = await helpers;
  const filas = filasCrudosDeEmbarques([{ fecha: '2024-03-01', clientes: [{ id: '2', nombre: 'Catarro', productos: [] }],
    clienteCrudos: { '2': [{ items: [{ talla: 'Linea', taras: '4-20' }] }], '9': [{ items: [{ talla: 'Rechazo', taras: '1' }] }] } }]);
  assert.deepEqual(filas.map(f => [f.cliente, f.talla, f.taras, f.kilos]), [['9', 'Rechazo', 1, 19], ['Catarro', 'Linea', 4, 80]]);
});

test('la exportación es compacta y marca su tipo', async () => {
  const { exportarHistorialCrudos } = await helpers;
  const datos = exportarHistorialCrudos([{ fecha: '2026-01-02', clientes: [{ nombre: 'Ozuna', crudos: [{ items: [{ talla: 'Med c/c', taras: '3-19' }] }] }] }], new Date('2026-11-11T00:00:00Z'));
  assert.deepEqual(datos, { tipo: 'reypez-historial-crudos', version: 1, generado: '2026-11-11T00:00:00.000Z', totalEmbarques: 1,
    filas: [{ fecha: '2026-01-02', cliente: 'Ozuna', talla: 'Med c/c', taras: 3, kilos: 57 }] });
});
