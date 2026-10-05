const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');
const source = fs.readFileSync(require.resolve('../src/views/Procesos/Bitacoras.vue'), 'utf8').split('<script>')[1].split('</script>')[0];
const code = babel.transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
function setup({ failUpload = false, failWrite = false } = {}) {
  const events = [];
  let count = 0;
  const firestore = {
    collection: () => 'bitacoras',
    doc: (_db, _collection, id) => ({ id: id || `new-${++count}` }),
    serverTimestamp: () => 'timestamp',
    setDoc: async (ref, data) => { events.push(['save', ref.id, data]); if (failWrite) throw Error('write failed'); },
    updateDoc: async (ref, data) => { events.push(['update', ref.id, data]); if (failWrite) throw Error('write failed'); },
    deleteDoc: async () => { events.push(['deleteRecord']); },
  };
  const storage = {
    ref: (_storage, path) => path,
    uploadBytes: async (path) => { events.push(['upload', path]); if (failUpload) throw Error('upload failed'); },
    getDownloadURL: async (path) => 'https://example.test/' + path,
    deleteObject: async (path) => events.push(['deletePhoto', path]),
  };
  const context = { exports: {}, console: { warn() {}, error() {}, log() {} }, URL: {
    createObjectURL: (file) => 'blob:' + file.name,
    revokeObjectURL: (url) => events.push(['revoke', url]),
  }, require: (name) => name === '@/firebase' ? { db: {}, storage: {} }
    : name === 'firebase/firestore' ? firestore : name === 'firebase/storage' ? storage : {} };
  vm.runInNewContext(code, context);
  const component = context.exports.default;
  const instance = { ...component.methods };
  Object.assign(instance, component.data.call(instance));
  Object.assign(instance.bitacoraActual, { cuartoId: '1', tecnico: 'Toño', tipoMantenimiento: 'Correctivo', estado: 'Óptimo' });
  return { instance, events };
}
const file = (name = 'foto.jpg', type = 'image/jpeg', size = 100) => ({ name, type, size });
function select(instance, files) { const target = { files, value: 'selected' }; instance.agregarFotos({ target }); return target; }
test('selección múltiple, validación y eliminación de vistas previas', () => {
  const { instance, events } = setup();
  assert.equal(select(instance, [file(), file('otra.png', 'image/png')]).value, '');
  assert.equal(instance.bitacoraActual.fotos.length, 2);
  select(instance, [file('documento.pdf', 'application/pdf')]);
  assert.equal(instance.bitacoraActual.fotos.length, 2);
  assert.match(instance.errorFormulario, /JPG/);
  select(instance, [file('grande.jpg', 'image/jpeg', 11 * 1024 * 1024)]);
  assert.equal(instance.bitacoraActual.fotos.length, 2);
  select(instance, Array.from({ length: 11 }, () => file()));
  assert.match(instance.errorFormulario, /12/);
  instance.quitarFoto(0);
  assert.ok(events.some(e => e[0] === 'revoke' && e[1] === 'blob:foto.jpg'));
  instance.cerrarFormulario();
  assert.ok(events.some(e => e[0] === 'revoke' && e[1] === 'blob:otra.png'));
});
test('guarda URLs y metadatos sin objetos File ni previews y permite registros sin fotos', async () => {
  const { instance, events } = setup();
  select(instance, [file()]);
  await instance.guardarBitacora();
  const saved = events.find(e => e[0] === 'save')[2];
  assert.equal(saved.fotos.length, 1);
  assert.match(saved.fotos[0].url, /^https:/);
  assert.equal(saved.fotos[0].file, undefined);
  assert.equal(saved.fotos[0].preview, undefined);
  assert.equal(instance.bitacoras.length, 1);
  assert.equal(instance.mostrarFormulario, false);
  const empty = setup();
  await empty.instance.guardarBitacora();
  assert.equal(empty.events.find(e => e[0] === 'save')[2].fotos.length, 0);
});
test('edición conserva las fotos originales hasta que el registro se actualiza', async () => {
  const { instance, events } = setup();
  const original = { ...instance.bitacoraActual, id: 'existing', fotos: [
    { id: 'keep', nombre: 'keep.jpg', path: 'bitacoras/existing/keep', url: 'https://example.test/keep' },
    { id: 'remove', path: 'bitacoras/existing/remove', url: 'https://example.test/remove' },
  ] };
  instance.bitacoras = [original];
  instance.editarBitacora(original);
  instance.quitarFoto(1);
  assert.equal(original.fotos.length, 2);
  assert.equal(events.length, 0);
  select(instance, [file()]);
  await instance.guardarBitacora();
  assert.equal(events.find(e => e[0] === 'update')[2].fotos.length, 2);
  assert.ok(events.findIndex(e => e[0] === 'update') < events.findIndex(e => e[0] === 'deletePhoto'));
  assert.ok(events.some(e => e[0] === 'deletePhoto' && e[1].endsWith('/remove')));
  assert.ok(!events.some(e => e[0] === 'deletePhoto' && e[1].endsWith('/keep')));
});
for (const failure of ['failUpload', 'failWrite']) test(`${failure}: mantiene el formulario y limpia fotos nuevas`, async () => {
  const { instance, events } = setup({ [failure]: true });
  instance.mostrarFormulario = true;
  select(instance, [file()]);
  await instance.guardarBitacora();
  assert.equal(instance.mostrarFormulario, true);
  assert.equal(instance.guardando, false);
  assert.equal(instance.bitacoraActual.fotos.length, 1);
  assert.equal(instance.bitacoras.length, 0);
  assert.match(instance.errorFormulario, /No se pudo guardar/);
  assert.ok(events.some(e => e[0] === 'deletePhoto'));
  if (failure === 'failUpload') assert.ok(!events.some(e => e[0] === 'save'));
});
test('eliminación borra las fotos después del registro', async () => {
  const { instance, events } = setup();
  instance.bitacoraEliminar = { id: 'existing', fotos: [{ path: 'bitacoras/existing/photo' }] };
  await instance.eliminarBitacora();
  assert.equal(events[0][0], 'deleteRecord');
  assert.equal(events[1][0], 'deletePhoto');
});
