// Paquetes para actualizar las apps de escritorio y Android sin reinstalar.
//
// Cada build de escritorio (desktop-dist) y de Android (android-dist) lleva un `paquete.json` con su
// versión, un número creciente (fecha del commit) y la lista de archivos con su sha256. Al publicar la
// web, `publicar()` copia esos paquetes a `dist/actualizaciones/`, que Firebase Hosting sirve:
//   escritorio/ultima.json + escritorio/<versión>/<archivos>  (se descargan uno por uno)
//   android/ultima.json    + android/<versión>.zip            (lo descarga el plugin de Capacitor)
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const MANIFIESTO = 'paquete.json';
const CARPETAS = { escritorio: 'desktop-dist', android: 'android-dist' };

function sha256(contenido) {
  return crypto.createHash('sha256').update(contenido).digest('hex');
}

// Número creciente que ordena los paquetes: segundos de la fecha del commit (igual en local y en CI).
function identidadPaquete() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  let numero = Number(process.env.REYPEZ_PAQUETE_NUMERO) || 0;
  let commit = '';
  if (!numero) {
    const git = spawnSync('git', ['log', '-1', '--format=%ct %h'], { cwd: root, encoding: 'utf8' });
    const [ts, hash] = (git.stdout || '').trim().split(' ');
    numero = Number(ts) || Math.floor(Date.now() / 1000);
    commit = hash || '';
  }
  return {
    version: `${pkg.version}-${numero}`,
    numero,
    commit,
    minimoInstalador: pkg.reypez?.minimoInstalador || {}
  };
}

// Variables que el build de Vue incrusta para que la app sepa qué paquete es.
function entornoPaquete(identidad) {
  return { VUE_APP_PAQUETE_VERSION: identidad.version, VUE_APP_PAQUETE_NUMERO: String(identidad.numero) };
}

function listarArchivos(carpeta, base = carpeta) {
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap(entrada => {
    const completo = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) return listarArchivos(completo, base);
    return entrada.isFile() ? [path.relative(base, completo).split(path.sep).join('/')] : [];
  }).filter(ruta => ruta !== MANIFIESTO).sort();
}

function escribirManifiesto(plataforma, identidad, carpeta = path.join(root, CARPETAS[plataforma])) {
  const minimo = identidad.minimoInstalador[plataforma];
  if (!minimo) throw new Error(`Falta "reypez.minimoInstalador.${plataforma}" en package.json.`);
  const archivos = listarArchivos(carpeta).map(ruta => {
    const contenido = fs.readFileSync(path.join(carpeta, ruta));
    return { ruta, sha256: sha256(contenido), tamano: contenido.length };
  });
  if (!archivos.some(a => a.ruta === 'index.html')) throw new Error(`${carpeta} no tiene index.html.`);
  const manifiesto = {
    plataforma, version: identidad.version, numero: identidad.numero, commit: identidad.commit,
    minimoInstalador: minimo, archivos
  };
  fs.writeFileSync(path.join(carpeta, MANIFIESTO), JSON.stringify(manifiesto, null, 1));
  return manifiesto;
}

function leerManifiesto(carpeta) {
  return JSON.parse(fs.readFileSync(path.join(carpeta, MANIFIESTO), 'utf8'));
}

// Copia los paquetes ya construidos a <dist>/actualizaciones/.
function publicar({ dist = path.join(root, 'dist'), escritorio = path.join(root, CARPETAS.escritorio), android = path.join(root, CARPETAS.android) } = {}) {
  const destino = path.join(dist, 'actualizaciones');
  fs.rmSync(destino, { recursive: true, force: true });
  const resumen = {};

  const mEsc = leerManifiesto(escritorio);
  const carpetaVersion = path.join(destino, 'escritorio', mEsc.version);
  for (const archivo of mEsc.archivos) {
    const contenido = fs.readFileSync(path.join(escritorio, archivo.ruta));
    if (sha256(contenido) !== archivo.sha256) throw new Error(`desktop-dist cambió después de generar su paquete.json (${archivo.ruta}).`);
    fs.mkdirSync(path.dirname(path.join(carpetaVersion, archivo.ruta)), { recursive: true });
    fs.writeFileSync(path.join(carpetaVersion, archivo.ruta), contenido);
  }
  fs.writeFileSync(path.join(destino, 'escritorio', 'ultima.json'), JSON.stringify(mEsc));
  resumen.escritorio = mEsc.version;

  const { zipSync } = require('fflate');
  const mAnd = leerManifiesto(android);
  const entradas = {};
  // El paquete.json va dentro del zip: así la versión descargada sabe qué número es.
  for (const ruta of [...mAnd.archivos.map(a => a.ruta), MANIFIESTO]) {
    entradas[ruta] = [new Uint8Array(fs.readFileSync(path.join(android, ruta))), { mtime: new Date('2000-01-01T00:00:00Z') }];
  }
  const zip = Buffer.from(zipSync(entradas, { level: 9 }));
  const archivoZip = `${mAnd.version}.zip`;
  fs.mkdirSync(path.join(destino, 'android'), { recursive: true });
  fs.writeFileSync(path.join(destino, 'android', archivoZip), zip);
  const { archivos, ...datos } = mAnd;
  fs.writeFileSync(path.join(destino, 'android', 'ultima.json'), JSON.stringify({ ...datos, archivo: archivoZip, sha256: sha256(zip), tamano: zip.length }));
  resumen.android = mAnd.version;
  return resumen;
}

module.exports = { identidadPaquete, entornoPaquete, escribirManifiesto, leerManifiesto, publicar, sha256, MANIFIESTO };
