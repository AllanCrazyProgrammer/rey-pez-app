const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fuente = fs.readFileSync(path.join(__dirname, '../src/utils/equiposCuarto.js'), 'utf8');
const ejecutable = fuente.replace(/^export /gm, '');
const sandbox = { api: null };
vm.runInNewContext(
  `${ejecutable}\nthis.api = { columnasParaAncho, serializarEquipo, validarEquipo, equiposDesdeDocumento, equipoVacio, etiquetaTipo, nombreDeCuarto, fotoMaquinaDesdeDocumento, CUARTOS_FRIOS };`,
  sandbox
);
const {
  columnasParaAncho,
  serializarEquipo,
  validarEquipo,
  equiposDesdeDocumento,
  equipoVacio,
  etiquetaTipo,
  nombreDeCuarto,
  fotoMaquinaDesdeDocumento,
  CUARTOS_FRIOS,
} = sandbox.api;

assert.strictEqual(columnasParaAncho(320), 1);
assert.strictEqual(columnasParaAncho(639), 1);
assert.strictEqual(columnasParaAncho(640), 2);
assert.strictEqual(columnasParaAncho(1099), 2);
assert.strictEqual(columnasParaAncho(1100), 3);

assert.strictEqual(validarEquipo({ nombre: '  ' }), 'El nombre del equipo es obligatorio.');
assert.strictEqual(validarEquipo({ nombre: 'Compresor', tipo: 'raro' }), 'Selecciona un tipo de equipo válido.');
assert.strictEqual(validarEquipo({ nombre: 'Compresor', tipo: '' }), '');
assert.strictEqual(validarEquipo({ nombre: 'Compresor', tipo: 'tablero' }), '');
assert.strictEqual(validarEquipo({ nombre: 'Difusor norte', tipo: 'difusor' }), '');

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
  fotos: [],
});
assert.strictEqual(Object.prototype.hasOwnProperty.call(limpio, 'extra'), false);
const conFotos = JSON.parse(JSON.stringify(serializarEquipo({
  id: 'eq-2',
  nombre: 'Difusor norte',
  tipo: 'difusor',
  fotosNuevas: [{ file: {} }],
  fotos: [
    { url: ' https://ejemplo/a.jpg ', path: ' bitacoras/cuarto-1/equipo-eq-2-1.jpg ', file: {} },
    { url: '', path: 'bitacoras/x' },
  ],
})));
assert.strictEqual(conFotos.tipo, 'difusor');
assert.deepStrictEqual(conFotos.fotos, [{
  url: 'https://ejemplo/a.jpg',
  path: 'bitacoras/cuarto-1/equipo-eq-2-1.jpg',
}]);
assert.strictEqual(Object.prototype.hasOwnProperty.call(conFotos, 'fotosNuevas'), false);

const vacio = JSON.parse(JSON.stringify(equipoVacio()));
assert.deepStrictEqual(Object.keys(vacio).sort(), [
  'fotos',
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
assert.strictEqual(nombreDeCuarto('1'), 'Cuarto frío #1');
assert.strictEqual(nombreDeCuarto('agua-fria'), 'Agua fría');
assert.strictEqual(nombreDeCuarto('9'), 'Cuarto frío #9');
assert.strictEqual(nombreDeCuarto(''), '');
assert.ok(CUARTOS_FRIOS.some((cuarto) => cuarto.id === 'agua-fria'));
assert.strictEqual(fotoMaquinaDesdeDocumento(null), null);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(fotoMaquinaDesdeDocumento({
    fotoMaquina: { url: ' https://ejemplo/foto.jpg ', path: ' bitacoras/cuarto-1/maquina-1.jpg ' },
    equipos: [],
  }))),
  { url: 'https://ejemplo/foto.jpg', path: 'bitacoras/cuarto-1/maquina-1.jpg' }
);
assert.strictEqual(etiquetaTipo('condensador'), 'Condensador');
assert.strictEqual(etiquetaTipo(''), '');

console.log('equipos de cuarto: modelo y validación ok');
