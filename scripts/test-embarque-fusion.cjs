// Pruebas puras (sin Firebase) del motor de colaboración de embarques:
// fusión de tres vías del documento y aplicación en sitio sobre el estado.
//
//   node --test scripts/test-embarque-fusion.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/embarques-source.cjs');

const { fusionarDocEditor, fechaDeDoc } = loadSource('src/utils/embarqueFusion.js');
const { parcharListaPorId, parcharCrudos } = loadSource('src/utils/embarqueParche.js');
const { identificarProducto, estadoDesdeDoc, copiar } = loadSource('src/utils/embarqueColaboracion.js');
const { esSnapshotYaAdoptado } = loadSource('src/utils/embarqueRevision.js');

const producto = (id, extra = {}) => ({
  id, clienteId: '1', medida: 'Gde', precio: 100, restarTaras: false, noSumarKilos: false,
  kilos: [20, 21], taras: [1, 2], pesadasIds: [id + '-f1', id + '-f2'], reportesIds: [], tarasExtraIds: [],
  reporteTaras: [], reporteBolsas: [], tarasExtra: [], ...extra,
});
const documento = (productos, extra = {}) => ({
  fecha: '2026-11-15', cargaCon: 'Porro', camionNumero: 1, productosEliminados: {},
  clientes: [{ id: '1', nombre: 'Joselito', productos, crudos: [{ id: 'g1', items: [{ id: 'i1', talla: 'Gde', taras: '2-19' }] }] }],
  clientesIncluirPrecios: { 1: false }, clientesJuntarMedidas: { 1: false }, embarqueBloqueado: false,
  ...extra,
});
const p = doc => doc.clientes[0].productos;

test('celdas distintas del mismo producto: se conservan las dos y solo se escribe clientes', () => {
  const base = documento([producto('a')]);
  const local = documento([producto('a', { kilos: [55, 21] })]);
  const remoto = { ...documento([producto('a', { taras: [1, 9] })]), rev: 7 };
  const r = fusionarDocEditor({ base, local, remoto });
  assert.deepEqual(p(r.campos)[0].kilos, [55, 21]);
  assert.deepEqual(p(r.campos)[0].taras, [1, 9]);
  assert.deepEqual(Object.keys(r.cambios), ['clientes']);
  assert.equal(r.omitidas, 0);
});

test('misma celda: gana lo confirmado en el servidor y se reporta el conflicto', () => {
  const base = documento([producto('a')]);
  const local = documento([producto('a', { kilos: [55, 21] })]);
  const remoto = documento([producto('a', { kilos: [66, 21] })]);
  const r = fusionarDocEditor({ base, local, remoto });
  assert.deepEqual(p(r.campos)[0].kilos, [66, 21]);
  assert.equal(r.omitidas, 1);
  assert.deepEqual(r.cambios, {}, 'no queda nada que escribir');
});

test('mismo valor en ambos lados es un eco, no un conflicto ni una escritura', () => {
  const base = documento([producto('a')]);
  const igual = documento([producto('a', { kilos: [55, 21] })]);
  const r = fusionarDocEditor({ base, local: igual, remoto: copiar(igual) });
  assert.equal(r.omitidas, 0);
  assert.deepEqual(r.cambios, {});
});

test('filas agregadas por dos personas se conservan ambas; una fila borrada no revive', () => {
  const base = documento([producto('a')]);
  const local = documento([producto('a', { kilos: [20, 21, 30], taras: [1, 2, null], pesadasIds: ['a-f1', 'a-f2', 'mia'] })]);
  const remoto = documento([producto('a', { kilos: [21, 40], taras: [2, null], pesadasIds: ['a-f2', 'suya'] })]);
  const r = fusionarDocEditor({ base, local, remoto });
  const fusionado = p(r.campos)[0];
  assert.deepEqual(fusionado.pesadasIds.slice().sort(), ['a-f2', 'mia', 'suya']);
  assert.equal(fusionado.kilos[fusionado.pesadasIds.indexOf('mia')], 30);
  assert.equal(fusionado.kilos[fusionado.pesadasIds.indexOf('suya')], 40);
  assert.equal(fusionado.kilos.length, fusionado.pesadasIds.length);
});

test('producto nuevo local y producto nuevo remoto conviven; el borrado local deja lápida', () => {
  const base = documento([producto('a'), producto('b')]);
  const local = { ...documento([producto('a'), producto('mio')]), productosEliminados: { b: 1700000000000 } };
  const remoto = documento([producto('a'), producto('b'), producto('suyo')]);
  const r = fusionarDocEditor({ base, local, remoto });
  assert.deepEqual(p(r.campos).map(x => x.id).sort(), ['a', 'mio', 'suyo']);
  assert.equal(r.campos.productosEliminados.b, 1700000000000);
  assert.ok(r.cambios.clientes && r.cambios.productosEliminados);
});

test('editar un producto que otra persona eliminó: no se resucita y cuenta como conflicto', () => {
  const base = documento([producto('a'), producto('b')]);
  const local = documento([producto('a'), producto('b', { kilos: [99, 21] })]);
  const remoto = { ...documento([producto('a')]), productosEliminados: { b: 1700000000000 } };
  const r = fusionarDocEditor({ base, local, remoto });
  assert.deepEqual(p(r.campos).map(x => x.id), ['a']);
  assert.equal(r.omitidas, 1);
});

test('casillas por cliente: cada clave se fusiona por separado', () => {
  const base = documento([producto('a')], { clientesIncluirPrecios: { 1: false, 2: false } });
  const local = documento([producto('a')], { clientesIncluirPrecios: { 1: true, 2: false } });
  const remoto = documento([producto('a')], { clientesIncluirPrecios: { 1: false, 2: true } });
  const r = fusionarDocEditor({ base, local, remoto });
  assert.deepEqual(r.campos.clientesIncluirPrecios, { 1: true, 2: true });
  assert.deepEqual(Object.keys(r.cambios), ['clientesIncluirPrecios']);
});

test('mapa que el documento nunca guardó y esta pantalla no tocó: no genera escritura', () => {
  const base = documento([producto('a')]);
  delete base.clientesJuntarMedidas;
  const remoto = copiar(base);
  const local = copiar(base);
  const r = fusionarDocEditor({ base, local, remoto });
  assert.deepEqual(r.cambios, {});
});

test('cargaCon y bloqueo: tres vías por campo', () => {
  const base = documento([producto('a')]);
  const local = documento([producto('a')], { cargaCon: 'Caminante' });
  const remoto = documento([producto('a')], { embarqueBloqueado: true });
  const r = fusionarDocEditor({ base, local, remoto });
  assert.equal(r.campos.cargaCon, 'Caminante');
  assert.equal(r.campos.embarqueBloqueado, true);
  assert.deepEqual(Object.keys(r.cambios), ['cargaCon']);
});

test('fecha guardada como Timestamp no produce escrituras ni conflictos falsos', () => {
  const marca = { toDate: () => new Date('2026-11-15T00:00:00Z') };
  const base = documento([producto('a')], { fecha: { seconds: Date.parse('2026-11-15T00:00:00Z') / 1000, nanoseconds: 0 } });
  const local = documento([producto('a', { kilos: [55, 21] })]);
  const remoto = documento([producto('a')], { fecha: marca });
  const r = fusionarDocEditor({ base, local, remoto });
  assert.equal(fechaDeDoc(marca), '2026-11-15');
  assert.equal(r.omitidas, 0);
  assert.deepEqual(Object.keys(r.cambios), ['clientes']);
});

test('sin base (embarque recién creado cuyo alta ya llegó): lo local gana sobre lo que difiere', () => {
  const remoto = documento([producto('a')]);
  const local = documento([producto('a', { kilos: [55, 21] })]);
  const r = fusionarDocEditor({ base: null, local, remoto });
  assert.deepEqual(p(r.campos)[0].kilos, [55, 21]);
  assert.equal(r.omitidas, 0);
});

test('cliente vacío que el otro lado quitó no se vuelve a crear', () => {
  const conCliente = extra => {
    const doc = documento([producto('a')], extra);
    doc.clientes.push({ id: '99', nombre: 'Temporal', productos: [], crudos: [] });
    return doc;
  };
  const base = conCliente();
  const local = conCliente({ cargaCon: 'Caminante' });
  const remoto = documento([producto('a')]);
  const r = fusionarDocEditor({ base, local, remoto });
  assert.deepEqual(r.campos.clientes.map(c => String(c.id)), ['1']);
  assert.ok(!('clientes' in r.cambios), 'no se reescribe clientes para revivirlo');
});

test('el orden de los productos no cuenta como cambio', () => {
  const base = documento([producto('a'), producto('b')]);
  const local = documento([producto('b'), producto('a')]);
  const r = fusionarDocEditor({ base, local, remoto: copiar(base) });
  assert.deepEqual(r.cambios, {});
});

test('identidades de filas dañadas se reparan igual en todos los lectores en vez de fallar', () => {
  const roto = () => ({ id: 'x', kilos: [1, 2, 3], taras: [1], pesadasIds: ['r1', 'r1'] });
  const uno = identificarProducto(roto());
  const dos = identificarProducto(roto());
  assert.equal(uno.pesadasIds.length, 3);
  assert.equal(new Set(uno.pesadasIds).size, 3);
  assert.deepEqual(uno.pesadasIds, dos.pesadasIds);
  assert.equal(uno.pesadasIds[0], 'r1', 'se conserva la identidad que sí era válida');
  assert.doesNotThrow(() => estadoDesdeDoc(documento([roto()])));
});

test('parche en sitio: conserva objetos y arreglos, agrega, quita y reordena', () => {
  const vivo = { productos: [producto('a', { isEditing: true }), producto('b')] };
  const [a, b] = vivo.productos;
  const kilosA = a.kilos;
  const cambio = parcharListaPorId(vivo, 'productos', [
    producto('c'),
    producto('a', { kilos: [77, 21, 5], pesadasIds: ['a-f1', 'a-f2', 'a-f3'], taras: [1, 2, null], isEditing: false, nota: 'sellado' }),
  ], undefined, { conservar: ['isEditing', 'isNew', 'showSuggestions'] });
  assert.equal(cambio, true);
  assert.deepEqual(vivo.productos.map(x => x.id), ['c', 'a']);
  assert.equal(vivo.productos[1], a, 'el producto conserva su identidad');
  assert.equal(a.kilos, kilosA, 'y su arreglo de kilos');
  assert.deepEqual(a.kilos, [77, 21, 5]);
  assert.equal(a.nota, 'sellado');
  assert.equal(a.isEditing, true, 'el estado de pantalla local no se pisa');
  assert.ok(!vivo.productos.includes(b));
  assert.equal(parcharListaPorId(vivo, 'productos', copiar(vivo.productos), undefined, { conservar: ['isEditing'] }), false, 'sin diferencias no toca nada');
});

test('parche en sitio: quita claves que ya no existen', () => {
  const vivo = { productos: [producto('a', { hilos: '3', precio: 120 })] };
  const sinHilos = producto('a', { precio: 120 });
  parcharListaPorId(vivo, 'productos', [sinHilos]);
  assert.ok(!('hilos' in vivo.productos[0]));
});

test('parche de crudos: items por identidad y clientes que quedan vacíos', () => {
  const crudos = { 1: [{ id: 'g1', items: [{ id: 'i1', taras: '2-19' }, { id: 'i2', taras: '1-10' }] }], 2: [{ id: 'g2', items: [] }] };
  const item = crudos[1][0].items[0];
  parcharCrudos(crudos, { 1: [{ id: 'g1', items: [{ id: 'i1', taras: '5-19' }, { id: 'i3', taras: '7-7' }] }] });
  assert.equal(crudos[1][0].items[0], item);
  assert.equal(item.taras, '5-19');
  assert.deepEqual(crudos[1][0].items.map(x => x.id), ['i1', 'i3']);
  assert.deepEqual(crudos[2], []);
});

test('snapshots: se ignora el eco y el atrasado; se aplica el nuevo, el inicial y el que no trae rev', () => {
  assert.equal(esSnapshotYaAdoptado({ revRemota: 5, revBase: 5 }), true);
  assert.equal(esSnapshotYaAdoptado({ revRemota: 4, revBase: 5 }), true);
  assert.equal(esSnapshotYaAdoptado({ revRemota: 6, revBase: 5 }), false);
  assert.equal(esSnapshotYaAdoptado({ revRemota: 5, revBase: 5, inicializando: true }), false);
  assert.equal(esSnapshotYaAdoptado({ revRemota: 0, revBase: 5 }), false);
});
