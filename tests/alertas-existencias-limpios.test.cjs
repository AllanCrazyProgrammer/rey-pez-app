const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/alertasExistenciasLimpios.js'), 'utf8');
const helpers = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const lote = { medida: '36/40', proveedor: 'Selecta', precio: 118.5, cuartoFrio: 's/c', fechaEntrada: '2026-08-25', alcance: 'lote' };
const inventario = {
  Selecta: { a: { medida: '36/40', precio: 118.5, kilos: 99999, lotes: [
    { fechaEntrada: '2026-08-25', cuartoFrio: 's/c', kilos: 40 },
    { fechaEntrada: '2026-08-31', cuartoFrio: 's/c', kilos: 25000 },
  ] }, b: { medida: '36/40', precio: 111.5, lotes: [{ fechaEntrada: '2026-08-25', cuartoFrio: 's/c', kilos: 100 }] },
  c: { medida: '36/40', precio: 118.5, lotes: [{ fechaEntrada: '2026-08-25', cuartoFrio: '2', kilos: 200 }] } },
  Ozuna: { a: { medida: '36/40', precio: 118.5, lotes: [{ fechaEntrada: '2026-08-25', cuartoFrio: 's/c', kilos: 300 }] } },
};
test('solo cuenta los kilos de la fecha seleccionada, sin sumar otros precios, cuartos o proveedores', async () => {
  const { kilosLoteAlerta } = await helpers;
  assert.equal(kilosLoteAlerta(inventario, lote), 40);
  assert.equal(kilosLoteAlerta(inventario, {...lote, fechaEntrada:'2026-08-31'}), 25000);
});
test('cada fecha tiene un mínimo independiente y los lotes nuevos no ocultan el agotado', async () => {
  const { evaluarAlertasExistencias } = await helpers;
  const configs = [{...lote,minimo:40}, {...lote,fechaEntrada:'2026-08-31',minimo:100}];
  assert.deepEqual(evaluarAlertasExistencias(inventario, configs).map(x=>x.fechaEntrada), ['2026-08-25']);
  const nuevo = { Selecta: {a:{medida:'36/40',precio:118.5,lotes:[{fechaEntrada:'2026-08-31',cuartoFrio:'s/c',kilos:25000}]}} };
  assert.equal(evaluarAlertasExistencias(nuevo,configs)[0].kilos,0);
});
test('IDs estables entre Date, Timestamp y fecha guardada; proveedores y fechas distintos no colisionan', async () => {
  const { idAlertaLote } = await helpers;
  assert.equal(idAlertaLote(lote),idAlertaLote({...lote,fechaEntrada:new Date('2026-08-25T00:00:00Z')}));
  assert.equal(idAlertaLote(lote),idAlertaLote({...lote,fechaEntrada:{seconds:Date.parse('2026-08-25T00:00:00Z')/1000}}));
  assert.notEqual(idAlertaLote(lote),idAlertaLote({...lote,fechaEntrada:'2026-08-31'}));
  assert.notEqual(idAlertaLote(lote),idAlertaLote({...lote,proveedor:'Ozuna'}));
  assert(!idAlertaLote(lote).includes('/'));
});
test('agrupa entradas del mismo contexto y fecha sin perder fracciones ni duplicar registro.kilos', async () => {
  const { kilosLoteAlerta } = await helpers;
  assert.equal(kilosLoteAlerta({Selecta:{a:{...lote,kilos:999,lotes:[{...lote,kilos:.1},{...lote,kilos:.2}]}}},lote),.1+.2);
});
test('mínimos anteriores por total de medida y valores inválidos ya no generan avisos', async () => {
  const { evaluarAlertasExistencias } = await helpers;
  assert.equal(evaluarAlertasExistencias({},[{medida:'36/40',alcance:'grupo',minimo:100},{...lote,minimo:-1},{...lote,minimo:NaN}]).length,0);
  assert.equal(evaluarAlertasExistencias({},[{...lote,minimo:0}])[0].kilos,0);
});
