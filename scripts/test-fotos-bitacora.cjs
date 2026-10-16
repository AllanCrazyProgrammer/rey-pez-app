const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const fuente = fs.readFileSync(path.join(__dirname, '../src/utils/fotosBitacora.js'), 'utf8');
const sandbox = { URL: { createObjectURL() {}, revokeObjectURL() {} }, Blob, Promise, setTimeout, clearTimeout };
vm.runInNewContext(fuente.replace(/^export /gm, '') + '\nthis.api = { conTiempo, tipoDeArchivo, mensajeErrorFoto, TIEMPO_SUBIDA_MS, rutaFotoMaquina };', sandbox);
const { conTiempo, tipoDeArchivo, mensajeErrorFoto, TIEMPO_SUBIDA_MS, rutaFotoMaquina } = sandbox.api;

assert.strictEqual(rutaFotoMaquina('agua-fria', 99), 'bitacoras/cuarto-agua-fria/maquina-99.jpg');
assert.strictEqual(rutaFotoMaquina('1', 5), 'bitacoras/cuarto-1/maquina-5.jpg');
assert.strictEqual(rutaFotoMaquina('../1', 5), 'bitacoras/cuarto-1/maquina-5.jpg');
assert.strictEqual(tipoDeArchivo({ type: 'image/jpg', name: '41540.jpg' }), 'image/jpeg');
assert.strictEqual(tipoDeArchivo({ type: '', name: '41540.JPG' }), 'image/jpeg');
assert.strictEqual(tipoDeArchivo({ type: 'image/png', name: 'a.png' }), 'image/png');
assert.strictEqual(tipoDeArchivo({ type: 'application/octet-stream', name: 'nota.txt' }), '');
assert.ok(TIEMPO_SUBIDA_MS > 0 && TIEMPO_SUBIDA_MS <= 60000);

const timeout = mensajeErrorFoto({ code: 'timeout', message: 'La subida de la foto tardó demasiado.' });
assert.strictEqual(timeout, 'La subida de la foto tardó demasiado.');
assert.ok(mensajeErrorFoto({ code: 'storage/retry-limit-exceeded', message: 'Max retry time' }).includes('No se pudo subir la foto'));
assert.ok(mensajeErrorFoto({ code: 'storage/unauthorized' }).includes('permiso'));
assert.ok(mensajeErrorFoto({ code: 'storage/canceled' }).includes('interrumpió'));

(async () => {
  const inicio = Date.now();
  await assert.rejects(conTiempo(new Promise(() => {}), 40, 'tarde'), (error) => {
    assert.strictEqual(error.code, 'timeout');
    assert.ok(Date.now() - inicio < 1000);
    return true;
  });
  const rapido = await conTiempo(Promise.resolve('lista'), 200, 'tarde');
  assert.strictEqual(rapido, 'lista');
  console.log('fotos de bitácora: timeout y tipo ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
