// Pruebas de las actualizaciones dentro de las apps (escritorio y Android), sin Electron ni teléfono:
//   node --test scripts/test-actualizaciones.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { transformSync } = require('@babel/core');
const { unzipSync } = require('fflate');

const root = path.resolve(__dirname, '..');
const { crearActualizador, validarManifiesto, compararVersiones, urlDeActualizaciones, URL_OFICIAL } = require('../electron/actualizaciones');
const { publicar, escribirManifiesto, sha256 } = require('./lib/paqueteActualizacion.cjs');

function cargarEsm(archivo) {
  const code = transformSync(fs.readFileSync(path.join(root, archivo), 'utf8'), { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
const android = cargarEsm('src/mobile/actualizacionAndroid.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'reypez-act-'));
function escribir(carpeta, archivos) {
  for (const [ruta, contenido] of Object.entries(archivos)) {
    fs.mkdirSync(path.dirname(path.join(carpeta, ruta)), { recursive: true });
    fs.writeFileSync(path.join(carpeta, ruta), contenido);
  }
}
// Arma un paquete de escritorio (como build-desktop.cjs) en `carpeta`.
function paquete(carpeta, archivos, { numero, minimo = '0.3.20' }) {
  escribir(carpeta, archivos);
  return escribirManifiesto('escritorio', { version: `0.3.20-${numero}`, numero, commit: '', minimoInstalador: { escritorio: minimo } }, carpeta);
}

// Servidor que imita Firebase Hosting: sirve `carpeta` y cuenta las descargas.
async function servidor(carpeta) {
  const pedidos = [];
  const srv = http.createServer((req, res) => {
    const ruta = decodeURIComponent(req.url.split('?')[0]);
    pedidos.push(ruta);
    const archivo = path.join(carpeta, ruta);
    if (!archivo.startsWith(carpeta) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
      // Firebase Hosting responde index.html (200) a lo que no existe.
      res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html>');
    }
    res.writeHead(200); res.end(fs.readFileSync(archivo));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}/`, pedidos, cerrar: () => new Promise(r => srv.close(r)) };
}

// Publica `manifiesto` + archivos de `origen` como lo hace publicar() para escritorio.
function publicarEscritorio(hosting, origen, m) {
  const base = path.join(hosting, 'actualizaciones', 'escritorio');
  for (const a of m.archivos) {
    fs.mkdirSync(path.dirname(path.join(base, m.version, a.ruta)), { recursive: true });
    fs.copyFileSync(path.join(origen, a.ruta), path.join(base, m.version, a.ruta));
  }
  fs.writeFileSync(path.join(base, 'ultima.json'), JSON.stringify(m));
}

async function escenario({ minimoNuevo = '0.3.20', versionInstalador = '0.3.20' } = {}) {
  const dir = tmp();
  const incluida = path.join(dir, 'desktop-dist');
  paquete(incluida, { 'index.html': 'v1', 'js/app.111.js': 'app v1', 'js/vendor.aaa.js': 'vendor' }, { numero: 100 });
  const nueva = path.join(dir, 'nueva');
  const m = paquete(nueva, { 'index.html': 'v2', 'js/app.222.js': 'app v2', 'js/vendor.aaa.js': 'vendor' }, { numero: 200, minimo: minimoNuevo });
  const hosting = path.join(dir, 'hosting');
  publicarEscritorio(hosting, nueva, m);
  const srv = await servidor(hosting);
  const act = crearActualizador({ carpetaDatos: path.join(dir, 'datos'), carpetaIncluida: incluida, versionInstalador, urlBase: srv.url + 'actualizaciones/escritorio/' });
  return { dir, incluida, hosting, m, srv, act };
}

test('compararVersiones ignora el sufijo del número', () => {
  assert.equal(compararVersiones('0.3.20', '0.3.20'), 0);
  assert.equal(compararVersiones('0.3.9', '0.3.20'), -1);
  assert.equal(compararVersiones('1.0.0-5', '0.9.9'), 1);
  assert.equal(android.compararVersiones('0.3.19', '0.3.20'), -1);
});

test('el manifiesto rechaza rutas peligrosas y datos incompletos', () => {
  const base = { plataforma: 'escritorio', version: '0.3.20-1', numero: 1, minimoInstalador: '0.3.20' };
  const archivo = ruta => ({ ruta, sha256: 'a'.repeat(64), tamano: 1 });
  assert.doesNotThrow(() => validarManifiesto({ ...base, archivos: [archivo('index.html'), archivo('js/a.js')] }));
  for (const ruta of ['../fuera.js', '/abs.js', 'js/../../x', 'a\\b.js', 'js//a.js', 'C:/x.js', '']) {
    assert.throws(() => validarManifiesto({ ...base, archivos: [archivo('index.html'), archivo(ruta)] }), `debe rechazar ${ruta}`);
  }
  assert.throws(() => validarManifiesto({ ...base, archivos: [archivo('js/a.js')] }), /index.html/);
  assert.throws(() => validarManifiesto({ ...base, version: '../x', archivos: [archivo('index.html')] }));
  assert.throws(() => validarManifiesto({ ...base, plataforma: 'android', archivos: [archivo('index.html')] }));
  assert.throws(() => validarManifiesto({ ...base, archivos: [archivo('index.html'), archivo('paquete.json')] }));
});

test('solo acepta la URL oficial o una de prueba local', () => {
  assert.equal(urlDeActualizaciones({}), URL_OFICIAL);
  assert.equal(urlDeActualizaciones({ REYPEZ_ACTUALIZACIONES_URL: 'https://otro.com/x/' }), URL_OFICIAL);
  assert.equal(urlDeActualizaciones({ REYPEZ_ACTUALIZACIONES_URL: 'http://evil.com:80/x/' }), URL_OFICIAL);
  assert.equal(urlDeActualizaciones({ REYPEZ_ACTUALIZACIONES_URL: 'http://127.0.0.1:9/a/' }), 'http://127.0.0.1:9/a/');
});

test('escritorio: descarga solo lo que cambió, aplica y regresa si falla', async () => {
  const { incluida, srv, act } = await escenario();
  try {
    const cargado = act.paqueteParaCargar();
    assert.equal(cargado.carpeta, incluida);
    assert.equal(act.estadoPublico(cargado).lista, null);

    const estado = await act.buscar(cargado);
    assert.equal(estado.lista, '0.3.20-200');
    const bajados = srv.pedidos.filter(p => p.includes('/0.3.20-200/'));
    assert.deepEqual(bajados.sort(), ['/actualizaciones/escritorio/0.3.20-200/index.html', '/actualizaciones/escritorio/0.3.20-200/js/app.222.js'],
      'vendor.aaa.js es idéntico: se copia del instalador');
    // Hasta pulsar Actualizar (o reiniciar con activarLista) se sigue usando el del instalador.
    assert.equal(act.paqueteParaCargar().carpeta, incluida);

    // Una segunda búsqueda no vuelve a descargar.
    const antes = srv.pedidos.length;
    await act.buscar(cargado);
    assert.equal(srv.pedidos.length, antes + 1, 'solo pide ultima.json');

    assert.equal(act.activarLista(), true);
    const nuevo = act.paqueteParaCargar();
    assert.equal(nuevo.descargado, true);
    assert.equal(fs.readFileSync(path.join(nuevo.carpeta, 'index.html'), 'utf8'), 'v2');
    assert.equal(fs.readFileSync(path.join(nuevo.carpeta, 'js/vendor.aaa.js'), 'utf8'), 'vendor');
    assert.equal(act.estadoPublico(nuevo).lista, null);

    // Si la versión nueva no arranca, se marca fallida y no se vuelve a descargar.
    act.marcarFallida(nuevo.version);
    const deRegreso = act.paqueteParaCargar();
    assert.equal(deRegreso.carpeta, incluida);
    const estadoTrasFalla = await act.buscar(deRegreso);
    assert.equal(estadoTrasFalla.lista, null);
  } finally { await srv.cerrar(); }
});

test('escritorio: si una versión nueva falla, regresa a la última que funcionó', async () => {
  const { hosting, srv, act } = await escenario();
  try {
    await act.buscar(act.paqueteParaCargar());
    act.activarLista();
    const buena = act.paqueteParaCargar();
    assert.equal(buena.version, '0.3.20-200');
    // Se publica otra versión (300) que no arranca.
    const rota = path.join(hosting, '..', 'rota');
    publicarEscritorio(hosting, rota, paquete(rota, { 'index.html': 'v3 rota' }, { numero: 300 }));
    assert.equal((await act.buscar(buena)).lista, '0.3.20-300');
    act.activarLista();
    assert.equal(act.paqueteParaCargar().version, '0.3.20-300');
    act.limpiar(act.paqueteParaCargar());
    act.marcarFallida('0.3.20-300');
    const deRegreso = act.paqueteParaCargar();
    assert.equal(deRegreso.version, '0.3.20-200');
    assert.equal(fs.readFileSync(path.join(deRegreso.carpeta, 'index.html'), 'utf8'), 'v2');
  } finally { await srv.cerrar(); }
});

test('escritorio: un archivo alterado en el servidor no se instala', async () => {
  const { hosting, srv, act, dir } = await escenario();
  try {
    fs.writeFileSync(path.join(hosting, 'actualizaciones/escritorio/0.3.20-200/js/app.222.js'), 'código ajeno');
    await assert.rejects(act.buscar(act.paqueteParaCargar()), /dañado/);
    assert.equal(act.estadoPublico(act.paqueteParaCargar()).lista, null);
    assert.equal(act.activarLista(), false);
    assert.equal(fs.existsSync(path.join(dir, 'datos/actualizaciones/versiones/0.3.20-200')), false);
  } finally { await srv.cerrar(); }
});

test('escritorio: si la versión necesita instalador nuevo, avisa y no descarga', async () => {
  const { srv, act } = await escenario({ minimoNuevo: '0.4.0' });
  try {
    const estado = await act.buscar(act.paqueteParaCargar());
    assert.equal(estado.lista, null);
    assert.equal(estado.requiereInstalador, '0.4.0');
    assert.equal(srv.pedidos.filter(p => p.includes('/0.3.20-200/')).length, 0);
  } finally { await srv.cerrar(); }
});

test('escritorio: sin publicación (Hosting responde HTML) no hace nada', async () => {
  const { srv, act, hosting } = await escenario();
  try {
    fs.rmSync(path.join(hosting, 'actualizaciones/escritorio/ultima.json'));
    await assert.rejects(act.buscar(act.paqueteParaCargar()));
    assert.equal(act.paqueteParaCargar().descargado, false);
  } finally { await srv.cerrar(); }
});

test('escritorio: un instalador más nuevo que lo descargado manda', async () => {
  const { dir, incluida, srv, act } = await escenario();
  try {
    await act.buscar(act.paqueteParaCargar());
    act.activarLista();
    assert.equal(act.paqueteParaCargar().descargado, true);
    // Se instala un instalador con pantallas más nuevas (número 300).
    paquete(incluida, { 'index.html': 'v3' }, { numero: 300 });
    const nuevoInstalador = crearActualizador({ carpetaDatos: path.join(dir, 'datos'), carpetaIncluida: incluida, versionInstalador: '0.3.20', urlBase: srv.url + 'actualizaciones/escritorio/' });
    assert.equal(nuevoInstalador.paqueteParaCargar().carpeta, incluida);
    assert.equal(nuevoInstalador.estadoPublico(nuevoInstalador.paqueteParaCargar()).lista, null);
  } finally { await srv.cerrar(); }
});

test('publicar: copia escritorio y arma el zip de Android con su sha256', () => {
  const dir = tmp();
  const identidad = { version: '0.3.20-500', numero: 500, commit: 'abc', minimoInstalador: { escritorio: '0.3.20', android: '0.3.20' } };
  escribir(path.join(dir, 'desktop-dist'), { 'index.html': 'esc', 'js/a.js': 'a' });
  escribir(path.join(dir, 'android-dist'), { 'index.html': 'and', 'js/b.js': 'b' });
  escribirManifiesto('escritorio', identidad, path.join(dir, 'desktop-dist'));
  escribirManifiesto('android', identidad, path.join(dir, 'android-dist'));
  publicar({ dist: path.join(dir, 'dist'), escritorio: path.join(dir, 'desktop-dist'), android: path.join(dir, 'android-dist') });

  const esc = validarManifiesto(JSON.parse(fs.readFileSync(path.join(dir, 'dist/actualizaciones/escritorio/ultima.json'))));
  assert.equal(esc.version, '0.3.20-500');
  assert.equal(fs.readFileSync(path.join(dir, 'dist/actualizaciones/escritorio/0.3.20-500/js/a.js'), 'utf8'), 'a');

  const ultima = android.validarUltima(JSON.parse(fs.readFileSync(path.join(dir, 'dist/actualizaciones/android/ultima.json'))));
  const zip = fs.readFileSync(path.join(dir, 'dist/actualizaciones/android', ultima.archivo));
  assert.equal(ultima.sha256, sha256(zip));
  assert.equal(ultima.archivos, undefined, 'el ultima.json de Android no lleva la lista de archivos');
  const contenido = unzipSync(new Uint8Array(zip));
  assert.deepEqual(Object.keys(contenido).sort(), ['index.html', 'js/b.js', 'paquete.json']);
  assert.equal(Buffer.from(contenido['index.html']).toString(), 'and');

  // Si desktop-dist cambia después del manifiesto, no se publica algo inconsistente.
  fs.writeFileSync(path.join(dir, 'desktop-dist/js/a.js'), 'otro');
  assert.throws(() => publicar({ dist: path.join(dir, 'dist'), escritorio: path.join(dir, 'desktop-dist'), android: path.join(dir, 'android-dist') }), /cambió/);
});

function updaterFalso() {
  const llamadas = [];
  const bundles = [];
  return {
    llamadas, bundles,
    notifyAppReady: async () => { llamadas.push('ready'); return {}; },
    list: async () => ({ bundles: [...bundles] }),
    download: async opciones => { llamadas.push(['download', opciones]); const b = { id: 'b' + bundles.length, version: opciones.version, status: 'pending' }; bundles.push(b); return b; },
    set: async ({ id }) => { llamadas.push(['set', id]); }
  };
}
const respuesta = cuerpo => async () => ({ ok: true, json: async () => cuerpo });
const ultimaAndroid = { plataforma: 'android', version: '0.3.20-200', numero: 200, archivo: '0.3.20-200.zip', sha256: 'b'.repeat(64), minimoInstalador: '0.3.20' };

test('android: descarga con sha256, avisa y aplica solo al pulsar', async () => {
  const updater = updaterFalso();
  const fuente = android.crearFuenteAndroid({ updater, versionNativa: async () => '0.3.20', numeroActual: 100, fetch: respuesta(ultimaAndroid), base: 'https://x/a/' });
  const avisos = [];
  fuente.alCambiar(e => avisos.push(e));
  await fuente.buscar();
  assert.deepEqual(updater.llamadas, [['download', { url: 'https://x/a/0.3.20-200.zip', version: '0.3.20-200', checksum: 'b'.repeat(64) }]]);
  assert.deepEqual(await fuente.estado(), { lista: '0.3.20-200', requiereInstalador: null });
  assert.equal(avisos.length, 1);
  // Otra búsqueda reutiliza lo descargado.
  await fuente.buscar();
  assert.equal(updater.llamadas.filter(l => l[0] === 'download').length, 1);
  assert.equal(await fuente.aplicar(), true);
  assert.deepEqual(updater.llamadas.at(-1), ['set', 'b0']);
});

test('android: no descarga si ya es la versión actual o el APK es viejo', async () => {
  const updater = updaterFalso();
  const actual = android.crearFuenteAndroid({ updater, versionNativa: async () => '0.3.20', numeroActual: 200, fetch: respuesta(ultimaAndroid) });
  await actual.buscar();
  assert.equal(updater.llamadas.length, 0);
  assert.equal(await actual.aplicar(), false);

  const apkViejo = android.crearFuenteAndroid({ updater, versionNativa: async () => '0.3.20', numeroActual: 100, fetch: respuesta({ ...ultimaAndroid, minimoInstalador: '0.4.0' }) });
  await apkViejo.buscar();
  assert.equal(updater.llamadas.length, 0);
  assert.deepEqual(await apkViejo.estado(), { lista: null, requiereInstalador: '0.4.0' });

  for (const malo of [{ ...ultimaAndroid, archivo: '../x.zip' }, { ...ultimaAndroid, sha256: 'x' }, { ...ultimaAndroid, plataforma: 'escritorio' }]) {
    const f = android.crearFuenteAndroid({ updater, versionNativa: async () => '0.3.20', numeroActual: 100, fetch: respuesta(malo) });
    await f.buscar();
    assert.equal(updater.llamadas.length, 0);
  }
});

test('android: iniciar avisa al plugin que la versión arrancó', async () => {
  const updater = updaterFalso();
  const fuente = android.crearFuenteAndroid({ updater, versionNativa: async () => '0.3.20', numeroActual: 1, fetch: async () => ({ ok: false, status: 404 }), intervalo: 1e9 });
  await fuente.iniciar();
  fuente.detener();
  assert.equal(updater.llamadas[0], 'ready');
});

