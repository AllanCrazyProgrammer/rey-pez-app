// Métodos reales de Rendimientos.vue contra el emulador y una copia local falsa.
// Se niega a correr sin FIRESTORE_EMULATOR_HOST.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('Rechazado: define FIRESTORE_EMULATOR_HOST. Este script no escribe en Firestore de producción.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const projectId = 'demo-reypez-embarques';

function compilar(archivo, requireLocal, extras = {}) {
  let source = fs.readFileSync(path.join(root, archivo), 'utf8');
  if (archivo.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  const codigo = babel.transformSync(source, {
    babelrc: false, configFile: false, filename: archivo.replace(/\.vue$/, '.js'),
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const modulo = { exports: {} };
  vm.runInNewContext(codigo, {
    module: modulo, exports: modulo.exports, console, require: requireLocal, ...extras,
  }, { filename: archivo });
  return modulo.exports;
}

function partirHost(valor) {
  const texto = String(valor).replace(/^https?:\/\//, '');
  const corte = texto.lastIndexOf(':');
  return { host: texto.slice(0, corte), port: Number(texto.slice(corte + 1)) };
}

(async () => {
  const { initializeApp } = await import('firebase/app');
  const firestoreReal = await import('firebase/firestore');
  const { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc } = firestoreReal;
  const alRealm = (value) => {
    if (value === null || typeof value !== 'object') return value;
    const nombre = value.constructor && value.constructor.name;
    if (Array.isArray(value) || nombre === 'Array') return Array.from(value, alRealm);
    const proto = Object.getPrototypeOf(value);
    const plano = proto === Object.prototype || proto === null || nombre === 'Object';
    if (!plano) return value;
    const salida = {};
    Object.keys(value).forEach(clave => { salida[clave] = alRealm(value[clave]); });
    return salida;
  };
  const firestore = {
    ...firestoreReal,
    runTransaction: (db, fn) => firestoreReal.runTransaction(db, async (transaction) => fn({
      get: (ref) => transaction.get(ref),
      set: (ref, data, opciones) => transaction.set(ref, alRealm(data), opciones),
      update: (ref, first, ...rest) => {
        const proto = first && typeof first === 'object' ? Object.getPrototypeOf(first) : null;
        const nombre = first && first.constructor && first.constructor.name;
        const plano = Boolean(first) && typeof first === 'object' && !Array.isArray(first) &&
          (proto === Object.prototype || proto === null || nombre === 'Object');
        if (plano) return transaction.update(ref, alRealm(first));
        const args = [first];
        rest.forEach((item, index) => args.push(index % 2 === 0 ? alRealm(item) : item));
        return transaction.update(ref, ...args);
      },
      delete: (ref) => transaction.delete(ref),
    })),
  };
  const { host, port } = partirHost(process.env.FIRESTORE_EMULATOR_HOST);
  const app = initializeApp({ projectId, apiKey: 'demo', appId: 'demo' });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, port);

  const revision = compilar('src/utils/embarqueRevision.js', () => { throw new Error('sin deps'); });
  const escritura = compilar('src/services/embarqueEscritura.js', (id) => {
    if (id === 'firebase/firestore') return firestore;
    if (id === '@/utils/embarqueRevision') return revision;
    throw new Error(id);
  });

  const disco = new Map();
  const offline = {
    async init() {},
    async getById(id) {
      const valor = disco.get(id);
      return valor ? JSON.parse(JSON.stringify(valor)) : null;
    },
    async mergeSave(id, updates) {
      const existing = disco.has(id) ? JSON.parse(JSON.stringify(disco.get(id))) : null;
      let merged = null;
      let options = {};
      const result = typeof updates === 'function' ? updates(existing) : { ...(existing || {}), ...updates };
      if (!result) return null;
      if (result.record) { merged = result.record; options = result.options || {}; }
      else merged = result;
      merged.id = id;
      if (options.pendingSync !== undefined) merged.pendingSync = options.pendingSync;
      if (options.syncState) merged.syncState = options.syncState;
      disco.set(id, JSON.parse(JSON.stringify(merged)));
      return id;
    },
  };

  const nav = { onLine: true };
  const alertas = [];
  const Pantalla = compilar('src/views/Embarques/Rendimientos.vue', (id) => {
    if (id === 'firebase/firestore') return firestore;
    if (id === '@/services/embarqueEscritura') return escritura;
    if (id === '@/utils/embarqueRevision') return revision;
    if (id === '@/services/EmbarquesOfflineService') return offline;
    if (id === 'lodash') return { debounce: fn => fn };
    if (id === '@/utils/RendimientosPdf') return {};
    if (id === '@/utils/pdf/reportDelivery') return {};
    if (id === '@/utils/pdf/sacadas') return { normalizarGruposListaMedidasParaPdf: valor => valor };
    if (id === '@/components/MedidasParaHoyCards.vue') return {};
    if (id === '@/utils/formatters') return { formatearFecha: valor => valor };
    if (id === '@/utils/preciosHistoricos') return { normalizarNombreProductoPrecio: valor => valor, obtenerClavesBusquedaMedida: () => [] };
    if (id === '@/utils/renombrarMedidaRendimientos') return require('../src/utils/renombrarMedidaRendimientos');
    if (id === '@/utils/pesadas') return compilar('src/utils/pesadas.js', require);
    if (id === '@/utils/pesadasPorMedida') return compilar('src/utils/pesadasPorMedida.js', dep => {
      if (dep === './pesadas') return compilar('src/utils/pesadas.js', require);
      throw new Error(dep);
    });
    if (id === './components/PesadasDelDiaModal.vue') return {};
    if (id === '@/utils/preciosAliasCatalogo') return { obtenerGrupoPreciosPorNombre: () => null };
    throw new Error('Dependencia inesperada: ' + id);
  }, {
    navigator: nav,
    window: { location: { reload() { alertas.push('reload'); } } },
    alert: (mensaje) => { alertas.push(mensaje); },
  }).default;

  function abrir(id) {
    const ctx = Pantalla.data.call({});
    Object.assign(ctx, Pantalla.methods);
    ctx.$route = { params: { id } };
    ctx.$set = (objeto, clave, valor) => { objeto[clave] = valor; };
    ctx.$nextTick = (fn) => Promise.resolve().then(() => fn && fn());
    ctx.$forceUpdate = () => {};
    ctx.embarqueData = { fecha: '2026-10-12', clientes: [], notaRendimientos: '' };
    return ctx;
  }

  const leer = async (id) => (await getDoc(doc(db, 'embarques', id))).data();
  const semilla = (id, data) => setDoc(doc(db, 'embarques', id), {
    rev: 1, fecha: '2026-10-12', clientes: [], notaRendimientos: '', ...data,
  });

  const id1 = 'pantalla-reabrir';
  await semilla(id1, { kilosCrudos: { '16/20': 100 } });
  const a = abrir(id1);
  a._revBase = 1;
  a._baseCamposRendimientos = { kilosCrudos: { '16/20': 100 } };
  a.kilosCrudos = { '16/20': 250 };
  nav.onLine = false;
  await a.persistirCamposRendimientos({ kilosCrudos: { '16/20': 250 } });
  assert.equal((await offline.getById(id1)).pendingSync, true);
  assert.equal((await offline.getById(id1)).docData.kilosCrudos['16/20'], 250);
  nav.onLine = true;
  const reabierto = abrir(id1);
  await reabierto.syncOfflineRendimientos();
  await reabierto.cargarEmbarque();
  assert.equal((await leer(id1)).kilosCrudos['16/20'], 250);
  assert.equal(reabierto.kilosCrudos['16/20'], 250);
  assert.equal((await offline.getById(id1)).docData.kilosCrudos['16/20'], 250);
  console.log('✓ al reabrir en línea no se pierde la edición offline');

  const id2 = 'pantalla-talla-ajena';
  await semilla(id2, { rev: 2, kilosCrudos: { '16/20': 100, '21/25': 300 } });
  const edita = abrir(id2);
  edita._revBase = 1;
  edita._baseCamposRendimientos = { kilosCrudos: { '16/20': 100, '21/25': 50 } };
  edita.kilosCrudos = { '16/20': 180, '21/25': 50 };
  edita.embarqueData = { fecha: '2026-10-12', clientes: [], kilosCrudos: { '16/20': 100, '21/25': 50 } };
  await edita.persistirCamposRendimientos(edita.crearPayloadRendimientos());
  assert.equal(edita.avisoConflicto, '');
  let doc2 = await leer(id2);
  assert.equal(doc2.kilosCrudos['16/20'], 180);
  assert.equal(doc2.kilosCrudos['21/25'], 300);
  edita._clavesConservarMio = ['kilosCrudos.21/25'];
  await offline.mergeSave(id2, existing => ({
    record: {
      ...(existing || {}),
      clavesEnConflicto: ['kilosCrudos.21/25'],
      docData: { ...(existing && existing.docData || {}), kilosCrudos: { '16/20': 180, '21/25': 50 } },
    },
    options: { pendingSync: true, syncState: 'pending' },
  }));
  await edita.reintentarCambiosPendientes();
  doc2 = await leer(id2);
  assert.equal(doc2.kilosCrudos['21/25'], 300, 'no revierte una talla que esta pantalla no cambió');
  console.log('✓ Usar lo de esta pantalla no empuja tallas que no se editaron');

  const id3 = 'pantalla-siete-punto-cinco';
  await semilla(id3, { rev: 2, kilosCrudos: { '7.5': 300 } });
  const punto = abrir(id3);
  punto._revBase = 1;
  punto._baseCamposRendimientos = { kilosCrudos: { '7.5': 100 } };
  punto.kilosCrudos = { '7.5': 250 };
  await punto.persistirCamposRendimientos({ kilosCrudos: { '7.5': 250 } });
  assert.equal((await leer(id3)).kilosCrudos['7.5'], 300);
  assert.ok(punto.avisoConflicto);
  console.log('✓ la talla 7.5 entra en conflicto en vez de pisarse');

  const id4 = 'pantalla-talla-vacia';
  await semilla(id4, { kilosCrudos: { '16/20': 1 } });
  const vacia = abrir(id4);
  vacia._revBase = 1;
  vacia._baseCamposRendimientos = { kilosCrudos: { '16/20': 1 } };
  vacia.kilosCrudos = { '': 9, '16/20': 12 };
  await vacia.persistirCamposRendimientos({ kilosCrudos: { '': 9, '16/20': 12 } });
  assert.equal(vacia.avisoError || '', '');
  assert.equal(alertas.length, 0);
  assert.equal((await leer(id4)).kilosCrudos['16/20'], 12);
  assert.equal((await leer(id4)).kilosCrudos[''], undefined);
  console.log('✓ una talla vacía no tumba el guardado');

  const id5 = 'pantalla-recargar';
  await semilla(id5, { kilosCrudos: { '16/20': 300 } });
  const banner = abrir(id5);
  banner.avisoConflicto = 'aviso';
  banner._clavesConservarMio = ['kilosCrudos.16/20'];
  await offline.mergeSave(id5, () => ({
    record: {
      id: id5,
      clavesEnConflicto: ['kilosCrudos.16/20'],
      docData: { kilosCrudos: { '16/20': 250 }, fecha: '2026-10-12', clientes: [] },
      pendingSync: true,
      syncState: 'pending',
    },
    options: { pendingSync: true, syncState: 'pending' },
  }));
  await banner.recargarPantalla();
  assert.equal(banner.avisoConflicto, '');
  assert.equal((await offline.getById(id5)).clavesEnConflicto.length, 0);
  await banner.cargarEmbarque();
  assert.equal(banner.avisoConflicto, '');
  assert.equal(banner.kilosCrudos['16/20'], 300);
  console.log('✓ Usar lo del otro equipo quita el aviso y la recarga no lo revive');

  const id6 = 'pantalla-conflicto-al-reabrir';
  await semilla(id6, { rev: 2, kilosCrudos: { '16/20': 300 } });
  const enConflicto = abrir(id6);
  enConflicto._revBase = 1;
  enConflicto._baseCamposRendimientos = { kilosCrudos: { '16/20': 100 } };
  enConflicto.kilosCrudos = { '16/20': 250 };
  nav.onLine = false;
  await enConflicto.persistirCamposRendimientos({ kilosCrudos: { '16/20': 250 } });
  nav.onLine = true;
  const alVolver = abrir(id6);
  await alVolver.syncOfflineRendimientos();
  await alVolver.cargarEmbarque();
  assert.equal((await leer(id6)).kilosCrudos['16/20'], 300);
  assert.equal(alVolver.kilosCrudos['16/20'], 250);
  assert.ok(alVolver.avisoConflicto);
  console.log('✓ al reabrir con conflicto se quedan los kilos de esta pantalla y el aviso');

  console.log('PASS rendimientos pantalla');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
