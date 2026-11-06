// Actualizaciones de la app de escritorio sin reinstalar.
//
// El instalador trae sus pantallas en desktop-dist/. Cuando se publica la web, Firebase Hosting también
// sirve un paquete nuevo de escritorio (actualizaciones/escritorio/ultima.json + sus archivos). Aquí se
// descarga a <userData>/actualizaciones/versiones/<versión>/, verificando el sha256 de cada archivo, y se
// carga en el siguiente arranque o cuando la persona pulsa "Actualizar". Si un paquete descargado no
// arranca, se marca como fallido y se regresa a las pantallas del instalador.
//
// El código del proceso principal (este archivo, preload, Drive, PDFs) NO se actualiza así: un cambio
// ahí necesita instalador nuevo y subir "reypez.minimoInstalador.escritorio" en package.json.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const URL_OFICIAL = 'https://reypezapp-1ced2.web.app/actualizaciones/escritorio/';
const RUTA_SEGURA = /^[A-Za-z0-9._@-]+(\/[A-Za-z0-9._@-]+)*$/;
const VERSION_SEGURA = /^[0-9A-Za-z.+-]{1,64}$/;
const LIMITE_ARCHIVO = 60 * 1024 * 1024;
const LIMITE_TOTAL = 250 * 1024 * 1024;
const DESCARGAS_SIMULTANEAS = 6;

function compararVersiones(a, b) {
  const pa = String(a).split('-')[0].split('.').map(n => Number(n) || 0);
  const pb = String(b).split('-')[0].split('.').map(n => Number(n) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0) ? -1 : 1;
  return 0;
}

function validarManifiesto(m) {
  if (!m || typeof m !== 'object' || m.plataforma !== 'escritorio') throw new Error('Manifiesto de escritorio inválido.');
  if (!VERSION_SEGURA.test(m.version || '') || !Number.isSafeInteger(m.numero) || m.numero <= 0) throw new Error('Versión inválida.');
  if (!/^\d+\.\d+\.\d+$/.test(m.minimoInstalador || '')) throw new Error('Versión mínima inválida.');
  if (!Array.isArray(m.archivos) || !m.archivos.length) throw new Error('El paquete no tiene archivos.');
  let total = 0;
  const vistas = new Set();
  for (const a of m.archivos) {
    if (!a || !RUTA_SEGURA.test(a.ruta || '') || a.ruta.split('/').some(p => p === '.' || p === '..')) throw new Error(`Ruta inválida: ${a && a.ruta}`);
    if (vistas.has(a.ruta.toLowerCase()) || a.ruta === 'paquete.json') throw new Error(`Ruta repetida: ${a.ruta}`);
    vistas.add(a.ruta.toLowerCase());
    if (!/^[0-9a-f]{64}$/.test(a.sha256 || '') || !Number.isSafeInteger(a.tamano) || a.tamano < 0 || a.tamano > LIMITE_ARCHIVO) throw new Error(`Archivo inválido: ${a.ruta}`);
    total += a.tamano;
  }
  if (total > LIMITE_TOTAL) throw new Error('El paquete es demasiado grande.');
  if (!vistas.has('index.html')) throw new Error('El paquete no tiene index.html.');
  return m;
}

// Solo se acepta la URL oficial, o una de prueba en este equipo (REYPEZ_ACTUALIZACIONES_URL).
function urlDeActualizaciones(env = process.env) {
  const prueba = env.REYPEZ_ACTUALIZACIONES_URL;
  if (prueba && /^http:\/\/(127\.0\.0\.1|localhost):\d+\/.*\/$/.test(prueba)) return prueba;
  return URL_OFICIAL;
}

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

function leerJson(archivo) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch (_) { return null; }
}

function crearActualizador({ carpetaDatos, carpetaIncluida, versionInstalador, urlBase = URL_OFICIAL, fetch: fetchImpl = globalThis.fetch, log = () => {} }) {
  const raiz = path.join(carpetaDatos, 'actualizaciones');
  const versiones = path.join(raiz, 'versiones');
  const archivoEstado = path.join(raiz, 'estado.json');
  const incluido = leerJson(path.join(carpetaIncluida, 'paquete.json')) || { version: 'instalador', numero: 0, archivos: [] };
  let buscando = null;

  function leerEstado() {
    const e = leerJson(archivoEstado) || {};
    return {
      activa: e.activa || null, anterior: e.anterior || null, lista: e.lista || null, fallidas: Array.isArray(e.fallidas) ? e.fallidas : [],
      requiereInstalador: e.requiereInstalador || null
    };
  }
  function guardarEstado(e) {
    fs.mkdirSync(raiz, { recursive: true });
    const tmp = `${archivoEstado}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(e));
    fs.renameSync(tmp, archivoEstado);
  }
  const carpetaDe = version => path.join(versiones, version);

  // Un paquete descargado es usable si es más nuevo que el del instalador, cabe en este instalador,
  // no falló antes y sigue completo en disco.
  function usable(p, e) {
    return p && VERSION_SEGURA.test(p.version || '') && p.numero > incluido.numero && !e.fallidas.includes(p.version) &&
      compararVersiones(versionInstalador, p.minimoInstalador) >= 0 && fs.existsSync(path.join(carpetaDe(p.version), 'index.html'));
  }

  function paqueteParaCargar() {
    const e = leerEstado();
    if (usable(e.activa, e)) return { carpeta: carpetaDe(e.activa.version), version: e.activa.version, numero: e.activa.numero, descargado: true };
    return { carpeta: carpetaIncluida, version: incluido.version, numero: incluido.numero, descargado: false };
  }

  function estadoPublico(cargado) {
    const e = leerEstado();
    const lista = usable(e.lista, e) && e.lista.numero > cargado.numero ? e.lista.version : null;
    const requiereInstalador = e.requiereInstalador && compararVersiones(versionInstalador, e.requiereInstalador) < 0 ? e.requiereInstalador : null;
    return { actual: cargado.version, lista, requiereInstalador };
  }

  async function obtener(url) {
    const r = await fetchImpl(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
    return Buffer.from(await r.arrayBuffer());
  }

  async function descargar(m, cargado) {
    // Archivos idénticos (mismo sha256) se copian de lo que ya está en el equipo en vez de bajarlos.
    const locales = new Map();
    for (const origen of [cargado.carpeta, carpetaIncluida]) {
      const man = leerJson(path.join(origen, 'paquete.json'));
      for (const a of (man && man.archivos) || []) if (!locales.has(a.sha256)) locales.set(a.sha256, path.join(origen, a.ruta));
    }
    const temporal = path.join(raiz, `descargando-${m.version}`);
    fs.rmSync(temporal, { recursive: true, force: true });
    let bajados = 0;
    const pendientes = [...m.archivos];
    async function trabajador() {
      while (pendientes.length) {
        const a = pendientes.shift();
        let contenido = null;
        const local = locales.get(a.sha256);
        if (local) { try { contenido = fs.readFileSync(local); } catch (_) { contenido = null; } }
        if (!contenido || sha256(contenido) !== a.sha256) {
          contenido = await obtener(urlBase + encodeURIComponent(m.version) + '/' + a.ruta.split('/').map(encodeURIComponent).join('/'));
          bajados++;
        }
        if (contenido.length !== a.tamano || sha256(contenido) !== a.sha256) throw new Error(`El archivo ${a.ruta} llegó dañado.`);
        const destino = path.join(temporal, ...a.ruta.split('/'));
        if (!destino.startsWith(temporal + path.sep)) throw new Error(`Ruta inválida: ${a.ruta}`);
        fs.mkdirSync(path.dirname(destino), { recursive: true });
        fs.writeFileSync(destino, contenido);
      }
    }
    await Promise.all(Array.from({ length: DESCARGAS_SIMULTANEAS }, trabajador));
    fs.writeFileSync(path.join(temporal, 'paquete.json'), JSON.stringify(m));
    const final = carpetaDe(m.version);
    fs.mkdirSync(versiones, { recursive: true });
    fs.rmSync(final, { recursive: true, force: true });
    fs.renameSync(temporal, final);
    log(`paquete ${m.version} listo (${bajados} de ${m.archivos.length} archivos descargados)`);
  }

  // Busca y descarga la versión publicada. Devuelve el estado para la pantalla.
  function buscar(cargado) {
    if (buscando) return buscando;
    buscando = (async () => {
      const m = validarManifiesto(JSON.parse((await obtener(urlBase + 'ultima.json')).toString('utf8')));
      const e = leerEstado();
      const conocido = Math.max(cargado.numero, usable(e.lista, e) ? e.lista.numero : 0);
      if (m.numero <= conocido || e.fallidas.includes(m.version)) return estadoPublico(cargado);
      if (compararVersiones(versionInstalador, m.minimoInstalador) < 0) {
        guardarEstado({ ...e, requiereInstalador: m.minimoInstalador });
        return estadoPublico(cargado);
      }
      await descargar(m, cargado);
      const { requiereInstalador, ...resto } = leerEstado();
      guardarEstado({ ...resto, lista: { version: m.version, numero: m.numero, minimoInstalador: m.minimoInstalador } });
      limpiar(cargado);
      return estadoPublico(cargado);
    })().finally(() => { buscando = null; });
    return buscando;
  }

  // La versión lista pasa a ser la que se carga.
  function activarLista() {
    const e = leerEstado();
    if (!usable(e.lista, e)) return false;
    guardarEstado({ ...e, activa: e.lista, anterior: usable(e.activa, e) ? e.activa : null, lista: null });
    return true;
  }

  function marcarFallida(version) {
    const e = leerEstado();
    const fallidas = [...e.fallidas.filter(v => v !== version), version].slice(-20);
    const sinFalla = { ...e, fallidas };
    // Se regresa a la última versión descargada que sí arrancó; si no hay, a la del instalador.
    const anterior = usable(e.anterior, sinFalla) ? e.anterior : null;
    guardarEstado({
      ...sinFalla,
      activa: e.activa && e.activa.version === version ? anterior : e.activa,
      anterior: e.activa && e.activa.version === version ? null : e.anterior,
      lista: e.lista && e.lista.version === version ? null : e.lista
    });
    log(`paquete ${version} marcado como fallido; se usan las pantallas del instalador`);
  }

  // Borra versiones viejas y descargas a medias (conserva la cargada, la activa y la lista).
  function limpiar(cargado) {
    const e = leerEstado();
    const conservar = new Set([cargado && cargado.version, e.activa && e.activa.version, e.anterior && e.anterior.version, e.lista && e.lista.version].filter(Boolean));
    for (const nombre of fs.existsSync(versiones) ? fs.readdirSync(versiones) : []) {
      if (!conservar.has(nombre)) fs.rmSync(path.join(versiones, nombre), { recursive: true, force: true });
    }
    for (const nombre of fs.existsSync(raiz) ? fs.readdirSync(raiz) : []) {
      if (nombre.startsWith('descargando-') && !buscando) fs.rmSync(path.join(raiz, nombre), { recursive: true, force: true });
    }
  }

  return { paqueteParaCargar, estadoPublico, buscar, activarLista, marcarFallida, limpiar, incluido };
}

module.exports = { crearActualizador, validarManifiesto, compararVersiones, urlDeActualizaciones, URL_OFICIAL };
