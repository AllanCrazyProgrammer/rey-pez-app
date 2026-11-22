// Actualizaciones de la app de Android sin reinstalar el APK.
//
// El APK trae sus pantallas (android-dist). Al publicar la web, Firebase Hosting también sirve
// actualizaciones/android/ultima.json y un zip con las pantallas nuevas. El plugin
// @capgo/capacitor-updater lo descarga (verifica el sha256) y, cuando la persona pulsa "Actualizar",
// recarga la app con esa versión. Si la versión nueva no avisa que arrancó (notifyAppReady) en 20 s,
// el plugin regresa solo a la anterior. Un cambio nativo (plugins, permisos) sí necesita APK nuevo y
// subir "reypez.minimoInstalador.android" en package.json.
export const URL_ACTUALIZACIONES_ANDROID = 'https://reypezapp-1ced2.web.app/actualizaciones/android/';
// La APK de despique (solo Pesadas) tiene su propio paquete: no debe recibir el de la app completa.
export const URL_ACTUALIZACIONES_DESPIQUE = 'https://reypezapp-1ced2.web.app/actualizaciones/despique/';
const VERSION_SEGURA = /^[0-9A-Za-z.+-]{1,64}$/;
const ARCHIVO_SEGURO = /^[0-9A-Za-z.+-]{1,80}\.zip$/;
const REVISAR_CADA_MS = 30 * 60 * 1000;

// navigator.connection.type: 'wifi', 'cellular', 'ethernet', 'none', 'unknown'… Si el sistema no
// dice el tipo, se revisa igual (mejor actualizar que quedarse atrás).
export function hayWifi(navegador = typeof navigator !== 'undefined' ? navigator : null) {
  if (!navegador || navegador.onLine === false) return false;
  const tipo = navegador.connection && navegador.connection.type;
  if (!tipo || tipo === 'unknown' || tipo === 'other') return true;
  return tipo === 'wifi' || tipo === 'ethernet';
}

export function compararVersiones(a, b) {
  const pa = String(a).split('-')[0].split('.').map(n => Number(n) || 0);
  const pb = String(b).split('-')[0].split('.').map(n => Number(n) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0) ? -1 : 1;
  return 0;
}

export function validarUltima(m, plataforma = 'android') {
  if (!m || m.plataforma !== plataforma || !VERSION_SEGURA.test(m.version || '') || !Number.isSafeInteger(m.numero) ||
      !ARCHIVO_SEGURO.test(m.archivo || '') || !/^[0-9a-f]{64}$/.test(m.sha256 || '') || !/^\d+\.\d+\.\d+$/.test(m.minimoInstalador || '')) {
    throw new Error(`ultima.json de ${plataforma} inválido.`);
  }
  return m;
}

// updater: CapacitorUpdater; versionNativa: () => Promise<string> (versión del APK instalado).
// plataforma: 'android' (app completa) o 'despique'; el ultima.json debe ser de esa plataforma.
// puedeRevisar: si da false, las revisiones automáticas no consultan nada (p. ej. sin wifi).
export function crearFuenteAndroid({ updater, versionNativa, numeroActual, fetch: fetchImpl = (...a) => window.fetch(...a), base = URL_ACTUALIZACIONES_ANDROID, intervalo = REVISAR_CADA_MS, plataforma = 'android', puedeRevisar = () => true }) {
  const oyentes = new Set();
  let estado = { lista: null, requiereInstalador: null };
  let idLista = null;
  let buscando = null;
  let temporizador = null;
  const avisar = () => oyentes.forEach(h => h(estado));

  async function buscar() {
    if (buscando) return buscando;
    buscando = (async () => {
      const r = await fetchImpl(base + 'ultima.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const m = validarUltima(await r.json(), plataforma);
      if (m.numero <= numeroActual) return estado;
      if (compararVersiones(await versionNativa(), m.minimoInstalador) < 0) {
        estado = { lista: null, requiereInstalador: m.minimoInstalador };
        return estado;
      }
      const { bundles = [] } = await updater.list();
      let bundle = bundles.find(b => b.version === m.version && !['error', 'deleted'].includes(b.status));
      if (!bundle) bundle = await updater.download({ url: base + m.archivo, version: m.version, checksum: m.sha256 });
      idLista = bundle.id;
      estado = { lista: m.version, requiereInstalador: null };
      return estado;
    })().then(nuevo => { avisar(); return nuevo; }).finally(() => { buscando = null; });
    return buscando;
  }

  const buscarSinRuido = () => {
    if (!puedeRevisar()) return Promise.resolve(estado);
    return buscar().catch(error => console.warn('No se pudo revisar actualizaciones:', error.message || error));
  };

  return {
    // Debe llamarse al arrancar: sin esto el plugin regresa a la versión anterior.
    async iniciar() {
      await updater.notifyAppReady();
      setTimeout(buscarSinRuido, 5000);
      temporizador = setInterval(buscarSinRuido, intervalo);
    },
    buscar: buscarSinRuido,
    detener() { clearInterval(temporizador); },
    estado: async () => estado,
    alCambiar(handler) { oyentes.add(handler); return () => oyentes.delete(handler); },
    async aplicar() {
      if (!idLista) return false;
      await updater.set({ id: idLista }); // recarga la app con la versión nueva
      return true;
    }
  };
}
