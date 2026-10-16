const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fuente = fs.readFileSync(path.join(__dirname, '../src/utils/equiposCuarto.js'), 'utf8');
const ejecutable = fuente.replace(/^export /gm, '');
const sandbox = { api: null };
vm.runInNewContext(
  `${ejecutable}\nthis.api = { columnasParaAncho, serializarEquipo, validarEquipo, equiposDesdeDocumento, equipoVacio, etiquetaTipo };`,
  sandbox
);
const {
  columnasParaAncho,
  serializarEquipo,
  validarEquipo,
  equiposDesdeDocumento,
  equipoVacio,
  etiquetaTipo,
} = sandbox.api;

assert.strictEqual(columnasParaAncho(320), 1);
assert.strictEqual(columnasParaAncho(639), 1);
assert.strictEqual(columnasParaAncho(640), 2);
assert.strictEqual(columnasParaAncho(1099), 2);
assert.strictEqual(columnasParaAncho(1100), 5);

assert.strictEqual(validarEquipo({ nombre: '  ' }), 'El nombre del equipo es obligatorio.');
assert.strictEqual(validarEquipo({ nombre: 'Compresor', tipo: 'raro' }), 'Selecciona un tipo de equipo válido.');
assert.strictEqual(validarEquipo({ nombre: 'Compresor', tipo: '' }), '');
assert.strictEqual(validarEquipo({ nombre: 'Compresor', tipo: 'tablero' }), '');

const limpio = JSON.parse(JSON.stringify(serializarEquipo({
  id: 'eq-1',
  nombre: '  Compresor principal  ',
  tipo: 'compresor',
  marcaModelo: ' Bitzer ',
  refrigerante: '',
  voltaje: '220',
  notas: ' Revisar aceite ',
  extra: 'no debe persistir',
})));
assert.deepStrictEqual(limpio, {
  id: 'eq-1',
  nombre: 'Compresor principal',
  tipo: 'compresor',
  marcaModelo: 'Bitzer',
  refrigerante: '',
  voltaje: '220',
  notas: 'Revisar aceite',
});
assert.strictEqual(Object.prototype.hasOwnProperty.call(limpio, 'extra'), false);

const vacio = JSON.parse(JSON.stringify(equipoVacio()));
assert.deepStrictEqual(Object.keys(vacio).sort(), [
  'id',
  'marcaModelo',
  'nombre',
  'notas',
  'refrigerante',
  'tipo',
  'voltaje',
]);

assert.strictEqual(JSON.stringify(equiposDesdeDocumento(null)), '[]');
assert.strictEqual(JSON.stringify(equiposDesdeDocumento({})), '[]');
assert.strictEqual(JSON.stringify(equiposDesdeDocumento({ equipos: 'no-array' })), '[]');
const cargados = JSON.parse(JSON.stringify(equiposDesdeDocumento({
  equipos: [null, { id: 'a', nombre: 'Evaporador 1', tipo: 'evaporador' }, { nombre: 'Sin tipo' }],
  otroCampo: 'se ignora',
})));
assert.strictEqual(cargados.length, 2);
assert.strictEqual(cargados[0].tipo, 'evaporador');
assert.strictEqual(cargados[1].tipo, '');
assert.ok(cargados[1].id);
assert.strictEqual(etiquetaTipo('condensador'), 'Condensador');
assert.strictEqual(etiquetaTipo(''), '');

console.log('equipos de cuarto: modelo y validación ok');
