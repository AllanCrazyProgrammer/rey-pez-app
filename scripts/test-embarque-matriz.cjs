// Matriz permanente de embarques. Métodos reales contra el emulador.
// Se niega a correr sin FIRESTORE_EMULATOR_HOST.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const { loadSource } = require('./helpers/embarques-source.cjs');
const colaboracion = loadSource('src/utils/embarqueColaboracion.js');
const { embarqueUndoMixin } = loadSource('src/views/Embarques/mixins/embarqueUndoMixin.js');

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
  const { initializeApp, deleteApp } = await import('firebase/app');
  const firestoreReal = await import('firebase/firestore');
  const { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, getDocs, collection, deleteDoc } = firestoreReal;
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

  const revision = compilar('src/utils/embarqueRevision.js', () => { throw new Error('sin deps'); });
  const escritura = compilar('src/services/embarqueEscritura.js', (id) => {
    if (id === 'firebase/firestore') return firestore;
    if (id === '@/utils/embarqueRevision') return revision;
    throw new Error(id);
  });
  const puenteOffline = {
    real: null,
    init(...args) { return this.real.init(...args); },
    getById(...args) { return this.real.getById(...args); },
    save(...args) { return this.real.save(...args); },
    mergeSave(...args) { return this.real.mergeSave(...args); },
  };
  const mixin = compilar('src/views/Embarques/mixins/embarqueSyncMixin.js', (id) => {
    if (id === '@/utils/embarqueColaboracion') return colaboracion;
    if (id === 'firebase/firestore') return firestore;
    if (id === '@/utils/embarqueRevision') return revision;
    if (id === 'uuid') return { v4: () => 'id' };
    if (id === '@/services/EmbarquesOfflineService') return puenteOffline;
    if (id === '@/utils/dateUtils') return { normalizarFechaISO: (v) => v, normalizarFechaValor: (v) => v, obtenerFechaActualISO: () => '2026-10-12' };
    if (id === '@/constants.js/embarque') return { crearNuevoProducto: () => ({}) };
    if (id === '@/utils/embarqueContenido') return { embarqueTieneContenidoOperativoEstado: () => true };
    throw new Error('Mixin: ' + id);
  }, { navigator: { onLine: true } });

  const disco = new Map();
  const offline = {
    async init() {},
    async getById(id) {
      const valor = disco.get(id);
      return valor ? JSON.parse(JSON.stringify(valor)) : null;
    },
    async mergeSave(id, updates) {
      const existing = disco.has(id) ? JSON.parse(JSON.stringify(disco.get(id))) : null;
      const result = typeof updates === 'function' ? updates(existing) : { ...(existing || {}), ...updates };
      if (!result) return null;
      let merged; let options = {};
      if (result.record) { merged = result.record; options = result.options || {}; }
      else merged = result;
      merged.id = id;
      if (options.pendingSync !== undefined) merged.pendingSync = options.pendingSync;
      if (options.syncState) merged.syncState = options.syncState;
      disco.set(id, JSON.parse(JSON.stringify(merged)));
      return id;
    },
    async save(embarque, options = {}) {
      const prev = disco.get(embarque.id) || {};
      const merged = {
        ...prev,
        ...embarque,
        pendingSync: options.pendingSync ?? false,
        syncState: options.syncState || (options.pendingSync ? 'pending' : 'synced'),
      };
      disco.set(embarque.id, JSON.parse(JSON.stringify(merged)));
      return embarque.id;
    },
  };
  puenteOffline.real = offline;
  const nav = { onLine: true };
  const alertas = [];
  const Pantalla = compilar('src/views/Embarques/Rendimientos.vue', (id) => {
    if (id === 'firebase/firestore') return firestore;
    if (id === '@/services/embarqueEscritura') return escritura;
    if (id === '@/utils/embarqueRevision') return revision;
    if (id === '@/services/EmbarquesOfflineService') return offline;
    if (id === 'lodash') return { debounce: (fn) => fn };
    if (id === '@/utils/RendimientosPdf') return {};
    if (id === '@/utils/pdf/reportDelivery') return {};
    if (id === '@/utils/pdf/sacadas') return { normalizarGruposListaMedidasParaPdf: (valor) => valor };
    if (id === '@/components/MedidasParaHoyCards.vue') return {};
    if (id === '@/utils/formatters') return { formatearFecha: (valor) => valor };
    if (id === '@/utils/preciosHistoricos') return { normalizarNombreProductoPrecio: (valor) => valor, obtenerClavesBusquedaMedida: () => [] };
    if (id === '@/utils/renombrarMedidaRendimientos') return require('../src/utils/renombrarMedidaRendimientos');
    if (id === '@/utils/pesadas') return compilar('src/utils/pesadas.js', require);
    if (id === '@/utils/pesadasPorMedida') return compilar('src/utils/pesadasPorMedida.js', dep => {
      if (dep === './pesadas') return compilar('src/utils/pesadas.js', require);
      throw new Error(dep);
    });
    if (id === './components/PesadasDelDiaModal.vue') return {};
    if (id === '@/utils/preciosAliasCatalogo') return { obtenerGrupoPreciosPorNombre: () => null };
    throw new Error('Rendimientos: ' + id);
  }, {
    navigator: nav,
    window: { location: { reload() { alertas.push('reload'); } }, confirm: () => false },
    alert: (mensaje) => { alertas.push(mensaje); },
  }).default;
  const Costos = compilar('src/components/GestionCostos.vue', (id) => {
    if (id === 'firebase/firestore') return firestore;
    if (id === '@/services/embarqueEscritura') return escritura;
    if (id === '@/utils/embarqueRevision') return revision;
    if (id === 'lodash') return { debounce: (fn) => fn };
    if (id.endsWith('.vue')) return {};
    if (id === '@/utils/formatters') return { formatearFecha: (valor) => valor };
    throw new Error('Costos: ' + id);
  }, { window: { confirm: () => false, location: { reload() {} } }, alert: () => {} }).default;

  const { escribirCamposEmbarque, escribirCamposEmbarquesAtomico } = escritura;
  const { host, port } = partirHost(process.env.FIRESTORE_EMULATOR_HOST);
  const app = initializeApp({ projectId, apiKey: 'demo', appId: 'demo' });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, port);
  const creado = [];
  const leer = async (id) => (await getDoc(doc(db, 'embarques', id))).data();
  const semilla = async (id, data) => {
    creado.push(id);
    await setDoc(doc(db, 'embarques', id), {
      rev: 1, fecha: '2026-10-12', clientes: [], notaRendimientos: '', cargaCon: 'Porro', ...data,
    });
  };
  const viejos = [{ id: '1', productos: [{ id: 'p1', medida: '16/20' }] }];
  const nuevos = [{ id: '1', productos: [{ id: 'p1', medida: '16/20' }, { id: 'p2', medida: '21/25' }] }];
  const dateUtils = compilar('src/utils/dateUtils.js', (id) => {
    if (id === 'moment' || id.startsWith('moment/')) return require(id);
    throw new Error(id);
  });
  const contenido = compilar('src/utils/embarqueContenido.js', () => { throw new Error('contenido'); });
  const snapshotMod = compilar('src/utils/embarqueOfflineSnapshot.js', (id) => {
    if (id === './dateUtils') return dateUtils;
    throw new Error(id);
  });
  const carga = compilar('src/views/Embarques/mixins/embarqueCargaMixin.js', (id) => {
    if (id === '@/utils/embarqueColaboracion') return colaboracion;
    if (id === 'firebase/firestore') return firestore;
    if (id === 'uuid') return { v4: () => 'id' };
    if (id === '@/services/EmbarquesOfflineService') return puenteOffline;
    if (id === '@/utils/dateUtils') return dateUtils;
    if (id === '@/constants.js/embarque') return { crearNuevoProducto: () => ({}) };
    if (id === '@/utils/embarqueContenido') return contenido;
    if (id === '@/utils/embarqueRevision') return revision;
    if (id === '@/constants/clientesConfig') return compilar('src/constants/clientesConfig.js', () => { throw new Error('clientesConfig'); });
    throw new Error('Carga: ' + id);
  }, {
    navigator: { onLine: true },
    localStorage: { setItem() {}, getItem() { return null; }, removeItem() {} },
  });
  const colaSync = new Map();
  const registrosOffline = {
    async getAllRecords() { return [...colaSync.values()].map((item) => JSON.parse(JSON.stringify(item))); },
    ordenarPorFecha(records) { return records; },
    async acknowledge(record, remote) {
      colaSync.set(record.id, { ...remote, pendingSync: false, localVersion: record.localVersion });
    },
    async mutate(id, transform) {
      const next = transform(colaSync.get(id) || null);
      if (next) colaSync.set(id, next);
    },
  };
  const syncMod = compilar('src/services/EmbarquesSync.js', (id) => {
    if (id === 'vue') return { observable: (valor) => valor };
    if (id === 'firebase/firestore') return firestore;
    if (id === '@/firebase') return { db };
    if (id === './EmbarquesOfflineService') return registrosOffline;
    if (id === '@/utils/embarqueOfflineSnapshot') return snapshotMod;
    if (id === '@/utils/embarqueRevision') return revision;
    if (id === '@/stores/auth') return { useAuthStore: () => ({ isAuthenticated: true, userId: 'editor', user: { username: 'Editor' } }) };
    throw new Error('Sync: ' + id);
  }, { navigator: { onLine: true }, window: { dispatchEvent() {}, addEventListener() {} } });

  function editorGuarda(id, rev, base, datos, opciones = {}) {
    const ctx = {
      embarqueId: id,
      hasPendingChanges: true,
      _revBase: rev,
      _dirtyGen: 1,
      _baseCamposEditor: base,
      _editorCerrado: false,
      _subiendoEnVivo: false,
      authStore: { userId: 'editor', user: { username: 'Editor' } },
      embarque: { cargaCon: datos.cargaCon, productos: [], fecha: '2026-10-12' },
      fusiono: false,
      clientesPredefinidos: [{ id: '1', nombre: 'Uno' }],
      clienteCrudos: {},
      $set: (objeto, clave, valor) => { objeto[clave] = valor; },
      $nextTick: (fn) => Promise.resolve().then(() => fn && fn()),
      ...(opciones.estado || {}),
    };
    Object.assign(ctx, mixin.embarqueSyncMixin.methods);
    Object.assign(ctx, embarqueUndoMixin.methods);
    if (opciones.aplicarReal) Object.assign(ctx, carga.embarqueCargaMixin.methods);
    ctx.prepararDatosEmbarque = () => datos;
    ctx.programarSubidaEnVivo = () => {};
    if (!opciones.aplicarReal) {
      ctx.guardarSnapshotOffline = async () => {};
      ctx.aplicarDocRemoto = async () => { ctx.fusiono = true; };
    }
    return ctx.subirCambiosEnVivo().then(() => ctx);
  }
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
  async function respaldoDe(id, razon) {
    const snaps = await getDocs(collection(db, 'respaldos_emergencia'));
    return snaps.docs.map((item) => item.data()).find((item) => item.embarqueOriginalId === id && item.razonRespaldo === razon);
  }

  try {
    const idE1 = 'matriz-e1';
    await semilla(idE1, { kilosCrudos: { '16/20': 100 }, clientes: viejos });
    const rendE1 = abrir(idE1);
    rendE1._revBase = 1;
    rendE1._baseCamposRendimientos = { kilosCrudos: { '16/20': 100 } };
    await rendE1.persistirCamposRendimientos({ kilosCrudos: { '16/20': 250 } });
    await editorGuarda(idE1, 1, { clientes: viejos, cargaCon: 'Porro' }, { clientes: nuevos, cargaCon: 'Porro' });
    let docE1 = await leer(idE1);
    assert.equal(docE1.kilosCrudos['16/20'], 250);
    assert.equal(docE1.clientes[0].productos.length, 2);
    console.log('✓ E1 editor y Rendimientos conservan cada uno lo suyo');

    const idE2 = 'matriz-e2';
    await semilla(idE2, { clientes: viejos, cargaCon: 'Porro' });
    await editorGuarda(idE2, 1, { clientes: viejos, cargaCon: 'Porro' }, { clientes: viejos, cargaCon: 'Chito' });
    const conflictoEditor = await editorGuarda(idE2, 1, { clientes: viejos, cargaCon: 'Porro' }, { clientes: viejos, cargaCon: 'Mario' });
    assert.equal(conflictoEditor.fusiono, true);
    assert.equal((await leer(idE2)).cargaCon, 'Chito');
    console.log('✓ E2 dos editores en el mismo campo no se pisan');

    const idE3 = 'matriz-e3';
    await semilla(idE3, { noEnviadoMexico: false, clientes: viejos });
    await escribirCamposEmbarque(db, idE3, {
      baseRev: 1,
      baseCampos: { noEnviadoMexico: false },
      campos: { noEnviadoMexico: true },
    });
    await editorGuarda(idE3, 1, { clientes: viejos, cargaCon: 'Porro' }, { clientes: nuevos, cargaCon: 'Chito' });
    const docE3 = await leer(idE3);
    assert.equal(docE3.noEnviadoMexico, true);
    assert.equal(docE3.cargaCon, 'Chito');
    assert.equal(docE3.clientes[0].productos.length, 2);
    console.log('✓ E3 el toggle de México y el editor se quedan los dos');

    const idE4 = 'matriz-e4';
    await semilla(idE4, { clientes: viejos, cargaCon: 'Porro' });
    await editorGuarda(idE4, 1, { clientes: viejos, cargaCon: 'Porro' }, { clientes: nuevos, cargaCon: 'Porro' });
    await editorGuarda(idE4, 1, { clientes: viejos, cargaCon: 'Porro' }, { clientes: viejos, cargaCon: 'Chito' });
    const docE4 = await leer(idE4);
    assert.equal(docE4.clientes[0].productos.some((p) => p.id === 'p2'), true, 'el producto del otro editor sigue');
    assert.equal(docE4.cargaCon, 'Chito');
    console.log('✓ E4 cambiar solo cargaCon no borra el producto del otro editor');

    const idE5 = 'matriz-e5';
    await semilla(idE5, { clientes: viejos, cargaCon: 'Porro' });
    await editorGuarda(idE5, 1, { clientes: viejos, cargaCon: 'Porro' }, { clientes: viejos, cargaCon: 'Chito' });
    await editorGuarda(idE5, 1, { clientes: viejos, cargaCon: 'Porro' }, { clientes: nuevos, cargaCon: 'Porro' });
    const docE5 = await leer(idE5);
    assert.equal(docE5.cargaCon, 'Chito');
    assert.equal(docE5.clientes[0].productos.some((p) => p.id === 'p2'), true);
    console.log('✓ E5 agregar un producto no devuelve cargaCon viejo');

    const idR1 = 'matriz-r1';
    await semilla(idR1, { precioMaquila: { '16/20': 1 }, clientes: viejos });
    const maquila = abrir(idR1);
    maquila._revBase = 1;
    maquila._baseCamposRendimientos = { precioMaquila: { '16/20': 1 } };
    await maquila.persistirCamposRendimientos({ precioMaquila: { '16/20': 18 } });
    await editorGuarda(idR1, 1, { clientes: viejos, cargaCon: 'Porro' }, { clientes: viejos, cargaCon: 'Chito' });
    const vieja = abrir(idR1);
    vieja._revBase = 1;
    vieja._baseCamposRendimientos = { precioMaquila: { '16/20': 1 } };
    await vieja.persistirCamposRendimientos({ precioMaquila: { '16/20': 1 } });
    assert.equal((await leer(idR1)).precioMaquila['16/20'], 18);
    console.log('✓ R1 la maquila 1→18 no vuelve a 1');

    const idR7 = 'matriz-r7';
    await semilla(idR7, { kilosCrudos: { '16/20': 100 }, analizarGanancia: { '16/20': false } });
    await escribirCamposEmbarque(db, idR7, {
      baseRev: 1, baseCampos: { kilosCrudos: { '16/20': 100 } }, campos: { kilosCrudos: { '16/20': 300 } },
    });
    const baseR7 = { kilosCrudos: { '16/20': 100 }, analizarGanancia: { '16/20': false } };
    const check = await escribirCamposEmbarque(db, idR7, { baseRev: 1, baseCampos: baseR7, campos: { analizarGanancia: { '16/20': true } } });
    const pleno = await escribirCamposEmbarque(db, idR7, {
      baseRev: check.rev,
      baseCampos: { ...baseR7, ...(check.camposEscritos || {}) },
      campos: { kilosCrudos: { '16/20': 100 }, analizarGanancia: { '16/20': true } },
    });
    assert.equal(Boolean(pleno.camposEscritos && pleno.camposEscritos.kilosCrudos), false);
    assert.equal((await leer(idR7)).kilosCrudos['16/20'], 300);
    console.log('✓ R7 la pantalla vieja no restaura kilos');

    const idR9 = 'matriz-r9';
    await semilla(idR9, { rev: 2, kilosCrudos: { '16/20': 300 } });
    const r9 = abrir(idR9);
    r9._revBase = 1;
    r9._baseCamposRendimientos = { kilosCrudos: { '16/20': 100 } };
    r9.kilosCrudos = { '16/20': 100, '21/25': 40 };
    await r9.persistirCamposRendimientos({ kilosCrudos: { '16/20': 100, '21/25': 40 } });
    assert.equal((await leer(idR9)).kilosCrudos['16/20'], 300);
    assert.equal((await leer(idR9)).kilosCrudos['21/25'], 40);
    r9.kilosCrudos = { '16/20': 100, '21/25': 55 };
    await r9.persistirCamposRendimientos({ kilosCrudos: { '16/20': 100, '21/25': 55 } });
    assert.equal((await leer(idR9)).kilosCrudos['21/25'], 55);
    assert.equal((await leer(idR9)).kilosCrudos['16/20'], 300);
    console.log('✓ R9 una talla nueva se guarda y la que está en conflicto no');

    const idR10 = 'matriz-r10';
    await semilla(idR10, { rev: 4, analizarGanancia: { '16/20': true } });
    const ya = await escribirCamposEmbarque(db, idR10, {
      baseRev: 1,
      baseCampos: { analizarGanancia: { '16/20': false } },
      campos: { analizarGanancia: { '16/20': true } },
    });
    const baseR10 = revision.integrarCamposEnBase({ analizarGanancia: { '16/20': false } }, ya.camposCoincidentes);
    await escribirCamposEmbarque(db, idR10, {
      baseRev: 1, baseCampos: baseR10, campos: { analizarGanancia: { '16/20': false } },
    });
    assert.equal((await leer(idR10)).analizarGanancia['16/20'], false);
    console.log('✓ R10 si el servidor ya tenía el valor, el cambio siguiente no es conflicto');

    const idC1 = 'matriz-c1';
    await semilla(idC1, { kilosCrudos: { '16/20': 100, '21/25': 50 } });
    const equipoA = abrir(idC1);
    equipoA._revBase = 1;
    equipoA._baseCamposRendimientos = { kilosCrudos: { '16/20': 100, '21/25': 50 } };
    await equipoA.persistirCamposRendimientos({ kilosCrudos: { '16/20': 180, '21/25': 50 } });
    const equipoB = abrir(idC1);
    equipoB._revBase = 1;
    equipoB._baseCamposRendimientos = { kilosCrudos: { '16/20': 100, '21/25': 50 } };
    await equipoB.persistirCamposRendimientos({ kilosCrudos: { '16/20': 100, '21/25': 300 } });
    let docC1 = await leer(idC1);
    assert.equal(docC1.kilosCrudos['16/20'], 180);
    assert.equal(docC1.kilosCrudos['21/25'], 300);
    assert.equal(equipoB.avisoConflicto, '');
    console.log('✓ C1 dos equipos en tallas distintas se quedan las dos');

    equipoB._clavesConservarMio = ['kilosCrudos.16/20'];
    await offline.mergeSave(idC1, (existing) => ({
      record: {
        ...(existing || {}),
        clavesEnConflicto: ['kilosCrudos.16/20'],
        docData: { ...(existing && existing.docData || {}), kilosCrudos: { '16/20': 100, '21/25': 300 } },
      },
      options: { pendingSync: true },
    }));
    await equipoB.reintentarCambiosPendientes();
    docC1 = await leer(idC1);
    assert.equal(docC1.kilosCrudos['16/20'], 180, 'el botón no empuja la talla que no cambió');
    console.log('✓ C1b Usar lo de esta pantalla no empuja la talla sin tocar');

    const idC2 = 'matriz-c2';
    await semilla(idC2, { rev: 2, kilosCrudos: { '16/20': 300 } });
    const misma = abrir(idC2);
    misma._revBase = 1;
    misma._baseCamposRendimientos = { kilosCrudos: { '16/20': 100 } };
    await misma.persistirCamposRendimientos({ kilosCrudos: { '16/20': 250 } });
    assert.equal((await leer(idC2)).kilosCrudos['16/20'], 300);
    assert.ok(misma.avisoConflicto);
    console.log('✓ C2 la misma talla entra en conflicto y no se pisa');

    await misma.persistirCamposRendimientos({ kilosCrudos: { '16/20': 250, '21/25': 40 } });
    assert.equal((await leer(idC2)).kilosCrudos['16/20'], 300);
    assert.equal((await leer(idC2)).kilosCrudos['21/25'], 40);
    console.log('✓ C5 después del aviso, otra talla sí se guarda');

    await misma.reintentarCambiosPendientes();
    assert.equal((await leer(idC2)).kilosCrudos['16/20'], 250);
    assert.ok(await respaldoDe(idC2, 'conservar_valor_ajeno'));
    console.log('✓ C3 Usar lo de esta pantalla sube lo de aquí y respalda lo ajeno');

    const idC4 = 'matriz-c4';
    await semilla(idC4, { kilosCrudos: { '16/20': 300 } });
    const otro = abrir(idC4);
    otro.avisoConflicto = 'aviso';
    otro._clavesConservarMio = ['kilosCrudos.16/20'];
    await offline.mergeSave(idC4, () => ({
      record: {
        id: idC4,
        pendingEditor: true,
        clavesEnConflicto: ['kilosCrudos.16/20'],
        camposPendientesRendimientos: ['kilosCrudos'],
        docData: { kilosCrudos: { '16/20': 250 }, clientes: nuevos, cargaCon: 'Chito', fecha: '2026-10-12' },
        pendingSync: true,
      },
      options: { pendingSync: true },
    }));
    await otro.recargarPantalla();
    const copiaC4 = await offline.getById(idC4);
    assert.equal(otro.avisoConflicto, '');
    assert.equal(copiaC4.clavesEnConflicto.length, 0);
    assert.equal(copiaC4.pendingSync, true);
    assert.equal(copiaC4.pendingEditor, true);
    assert.equal(copiaC4.docData.clientes[0].productos.length, 2);
    await otro.cargarEmbarque();
    assert.equal(otro.avisoConflicto, '');
    assert.equal(otro.kilosCrudos['16/20'], 300);
    console.log('✓ C4 Usar lo del otro equipo quita el aviso y no tira lo pendiente del editor');

    const idC6 = 'matriz-c6';
    await semilla(idC6, { kilosCrudos: { '16/20': 100, '21/25': 50 }, rendimientoManual: { '16/20': 1 }, notaRendimientos: '' });
    const fuera = abrir(idC6);
    fuera._revBase = 1;
    fuera._baseCamposRendimientos = { kilosCrudos: { '16/20': 100, '21/25': 50 }, rendimientoManual: { '16/20': 1 }, notaRendimientos: '' };
    nav.onLine = false;
    await fuera.persistirCamposRendimientos({
      kilosCrudos: { '16/20': 250, '21/25': 50 },
      rendimientoManual: { '16/20': 1 },
      notaRendimientos: '',
    });
    assert.ok((await offline.getById(idC6)).camposPendientesRendimientos.includes('rendimientoManual'));
    await escribirCamposEmbarque(db, idC6, {
      baseRev: 1,
      baseCampos: { kilosCrudos: { '21/25': 50 }, notaRendimientos: '' },
      campos: revision.prepararPayloadServidor({ kilosCrudos: { '21/25': 60 }, notaRendimientos: 'nueva' }, []),
    });
    nav.onLine = true;
    const vuelve = abrir(idC6);
    await vuelve.syncOfflineRendimientos();
    await vuelve.cargarEmbarque();
    const docC6 = await leer(idC6);
    assert.equal(docC6.kilosCrudos['16/20'], 250);
    assert.equal(docC6.kilosCrudos['21/25'], 60);
    assert.equal(docC6.notaRendimientos, 'nueva');
    assert.equal((await offline.getById(idC6)).pendingSync, false);
    assert.equal(vuelve.kilosCrudos['21/25'], 60);
    assert.equal(vuelve.kilosCrudos['16/20'], 250);
    console.log('✓ C6/C6c/C6d lo offline termina de subir y la pantalla no se queda con la talla vieja');

    const idC7 = 'matriz-c7';
    await semilla(idC7, { rev: 2, kilosCrudos: { '7.5': 300 } });
    const punto = abrir(idC7);
    punto._revBase = 1;
    punto._baseCamposRendimientos = { kilosCrudos: { '7.5': 100 } };
    await punto.persistirCamposRendimientos({ kilosCrudos: { '7.5': 250 } });
    assert.equal((await leer(idC7)).kilosCrudos['7.5'], 300);
    assert.ok(punto.avisoConflicto);
    console.log('✓ C7 la talla 7.5 entra en conflicto');

    const idC8 = 'matriz-c8';
    await semilla(idC8, { rev: 2, kilosCrudos: { '16/20': 300, '7.5': 300, 'med esp': 300 } });
    const nombres = abrir(idC8);
    nombres._revBase = 1;
    nombres._baseCamposRendimientos = { kilosCrudos: { '16/20': 100, '7.5': 100, 'med esp': 100 } };
    await nombres.persistirCamposRendimientos({ kilosCrudos: { '16/20': 250, '7.5': 250, 'med esp': 250 } });
    const docC8 = await leer(idC8);
    assert.equal(docC8.kilosCrudos['16/20'], 300);
    assert.equal(docC8.kilosCrudos['7.5'], 300);
    assert.equal(docC8.kilosCrudos['med esp'], 300);
    assert.ok(nombres.avisoConflicto);
    console.log('✓ C8 nombres con / . y espacios no se saltan el conflicto');

    const idC9 = 'matriz-c9';
    await semilla(idC9, {
      kilosCrudos: { 'U/15 Mix': { medida1: 10, medida2: 1 } },
      rendimientoManual: { '16/20': 1, '21/25': 1 },
    });
    const mixA = abrir(idC9);
    mixA._revBase = 1;
    mixA._baseCamposRendimientos = {
      kilosCrudos: { 'U/15 Mix': { medida1: 10, medida2: 1 } },
      rendimientoManual: { '16/20': 1, '21/25': 1 },
    };
    await mixA.persistirCamposRendimientos({
      kilosCrudos: { 'U/15 Mix': { medida1: 10, medida2: 8 } },
      rendimientoManual: { '16/20': 4, '21/25': 1 },
    });
    const mixB = abrir(idC9);
    mixB._revBase = 1;
    mixB._baseCamposRendimientos = {
      kilosCrudos: { 'U/15 Mix': { medida1: 10, medida2: 1 } },
      rendimientoManual: { '16/20': 1, '21/25': 1 },
    };
    await mixB.persistirCamposRendimientos({
      kilosCrudos: { '16/20': 70 },
      rendimientoManual: { '16/20': 1, '21/25': 6 },
    });
    const docC9 = await leer(idC9);
    assert.equal(docC9.kilosCrudos['U/15 Mix'].medida2, 8);
    assert.equal(docC9.kilosCrudos['16/20'], 70);
    assert.equal(docC9.rendimientoManual['16/20'], 4);
    assert.equal(docC9.rendimientoManual['21/25'], 6);
    console.log('✓ C9 el mix y el rendimiento manual se fusionan por talla');

    const idC10 = 'matriz-c10';
    await semilla(idC10, { kilosCrudos: { '16/20': 1 } });
    const vacia = abrir(idC10);
    vacia._revBase = 1;
    vacia._baseCamposRendimientos = { kilosCrudos: { '16/20': 1 } };
    await vacia.persistirCamposRendimientos({ kilosCrudos: { '': 9, '16/20': 12 }, rendimientoManual: { '': 3, '16/20': 2 } });
    assert.equal(vacia.avisoError || '', '');
    assert.equal((await leer(idC10)).kilosCrudos['16/20'], 12);
    assert.equal((await leer(idC10)).kilosCrudos[''], undefined);
    assert.equal((await leer(idC10)).rendimientoManual['16/20'], 2);
    console.log('✓ C10 una clave vacía no tumba el guardado');

    const idEP = 'matriz-ep';
    await semilla(idEP, { rev: 3, kilosCrudos: { '16/20': 300 }, notaRendimientos: 'nueva' });
    await offline.mergeSave(idEP, () => ({
      record: {
        id: idEP,
        pendingSync: true,
        pendingEditor: true,
        docData: { kilosCrudos: { '16/20': 100 }, notaRendimientos: 'vieja', clientes: nuevos, fecha: '2026-10-12' },
      },
      options: { pendingSync: true },
    }));
    const ep = abrir(idEP);
    await ep.syncOfflineRendimientos();
    await ep.cargarEmbarque();
    const docEP = await leer(idEP);
    assert.equal(docEP.kilosCrudos['16/20'], 300);
    assert.equal(docEP.notaRendimientos, 'nueva');
    assert.equal(ep.kilosCrudos['16/20'], 300);
    assert.equal(ep.embarqueData.notaRendimientos, 'nueva');
    assert.equal((await offline.getById(idEP)).pendingSync, true);
    assert.equal((await offline.getById(idEP)).docData.clientes[0].productos.length, 2);
    console.log('✓ EP abrir Rendimientos no empuja la copia vieja de un pendiente del editor');

    const idEPbase = 'matriz-ep-sin-base';
    await semilla(idEPbase, { rev: 3, kilosCrudos: { '16/20': 300 }, notaRendimientos: 'nueva' });
    await offline.mergeSave(idEPbase, () => ({
      record: {
        id: idEPbase,
        pendingSync: true,
        camposPendientesRendimientos: ['kilosCrudos', 'notaRendimientos'],
        docData: { kilosCrudos: { '16/20': 100 }, notaRendimientos: 'vieja', fecha: '2026-10-12', clientes: [] },
      },
      options: { pendingSync: true },
    }));
    const sinBase = abrir(idEPbase);
    await sinBase.syncOfflineRendimientos();
    await sinBase.cargarEmbarque();
    assert.equal((await leer(idEPbase)).kilosCrudos['16/20'], 300);
    assert.equal((await leer(idEPbase)).notaRendimientos, 'nueva');
    assert.ok(sinBase.avisoConflicto);
    console.log('✓ EP sin base de Rendimientos muestra el aviso y no pisa el servidor');

    const fleteA = 'matriz-flete-a';
    const fleteB = 'matriz-flete-b';
    await semilla(fleteA, { fletePagado: false, fletePagos: {} });
    await semilla(fleteB, { fletePagado: false, fletePagos: {} });
    const pago = { baseRev: 1, baseCampos: { fletePagado: false }, campos: { fletePagado: true, 'fletePagos.porro': true } };
    await escribirCamposEmbarquesAtomico(db, [{ embarqueId: fleteA, ...pago }, { embarqueId: fleteB, ...pago }]);
    await assert.rejects(() => escribirCamposEmbarquesAtomico(db, [
      { embarqueId: fleteA, baseRev: 2, baseCampos: { fletePagado: true }, campos: { fletePagado: false } },
      { embarqueId: fleteB, baseRev: 1, baseCampos: { nota: 'base' }, campos: { nota: 'mia' } },
    ]), (error) => error.code === 'embarque-modificado-externamente');
    assert.equal((await leer(fleteA)).fletePagado, true);
    assert.equal((await leer(fleteB)).fletePagado, true);
    console.log('✓ F1 el pago de fletes es atómico');

    const idG1 = 'matriz-g1';
    await semilla(idG1, { costosPorMedida: { '16/20': 10 }, costoExtra: 18 });
    await escribirCamposEmbarque(db, idG1, {
      baseRev: 1,
      baseCampos: { costosPorMedida: { '16/20': 10 } },
      campos: { costosPorMedida: { '16/20': 10, '21/25': 8 } },
    });
    const costos = Object.assign({}, Costos.methods);
    costos.$route = { params: { id: idG1 } };
    costos._revBase = 1;
    costos._baseCamposCostos = { costosPorMedida: { '16/20': 10 }, costoExtra: 18 };
    await costos.persistirCamposCostos({ costosPorMedida: { '16/20': 10 }, costoExtra: 20 });
    const docG1 = await leer(idG1);
    assert.equal(docG1.costosPorMedida['21/25'], 8);
    assert.equal(docG1.costoExtra, 20);
    console.log('✓ G1 Costos no restaura costosPorMedida que Rendimientos ya completó');

    const idOff = 'matriz-reabrir';
    await semilla(idOff, { kilosCrudos: { '16/20': 100 } });
    const local = abrir(idOff);
    local._revBase = 1;
    local._baseCamposRendimientos = { kilosCrudos: { '16/20': 100 } };
    nav.onLine = false;
    await local.persistirCamposRendimientos({ kilosCrudos: { '16/20': 250 } });
    nav.onLine = true;
    const reabierto = abrir(idOff);
    await reabierto.syncOfflineRendimientos();
    await reabierto.cargarEmbarque();
    assert.equal((await leer(idOff)).kilosCrudos['16/20'], 250);
    assert.equal(reabierto.kilosCrudos['16/20'], 250);
    assert.equal((await offline.getById(idOff)).pendingSync, false);
    console.log('✓ reabrir en línea sube la edición offline que no choca');

    const idOffC = 'matriz-reabrir-conflicto';
    await semilla(idOffC, { rev: 2, kilosCrudos: { '16/20': 300 } });
    const localC = abrir(idOffC);
    localC._revBase = 1;
    localC._baseCamposRendimientos = { kilosCrudos: { '16/20': 100 } };
    nav.onLine = false;
    await localC.persistirCamposRendimientos({ kilosCrudos: { '16/20': 250 } });
    nav.onLine = true;
    const reabiertoC = abrir(idOffC);
    await reabiertoC.syncOfflineRendimientos();
    await reabiertoC.cargarEmbarque();
    assert.equal((await leer(idOffC)).kilosCrudos['16/20'], 300);
    assert.equal(reabiertoC.kilosCrudos['16/20'], 250);
    assert.ok(reabiertoC.avisoConflicto);
    console.log('✓ reabrir en línea con conflicto conserva lo de esta pantalla y el aviso');

    const idX1 = 'matriz-x1';
    await semilla(idX1, { rev: 2, clientes: nuevos, cargaCon: 'Porro' });
    const productoLocal = { id: 'p1', medida: '16/20', clienteId: '1', nombreCliente: 'Uno' };
    const editorX1 = await editorGuarda(
      idX1,
      1,
      { clientes: viejos, cargaCon: 'Porro' },
      { clientes: viejos, cargaCon: 'Chito' },
      {
        aplicarReal: true,
        estado: {
          embarque: { cargaCon: 'Chito', productos: [productoLocal], fecha: '2026-10-12' },
        },
      }
    );
    const docX1 = await leer(idX1);
    assert.equal(docX1.clientes[0].productos.length, 2);
    assert.equal(docX1.cargaCon, 'Chito');
    assert.equal(editorX1.embarque.productos.length, 2, 'la pantalla carga el producto del otro editor');
    assert.equal(editorX1.embarque.cargaCon, 'Chito');
    assert.equal(editorX1._revBase, docX1.rev);
    assert.equal(revision.esEcoDeRevisionLocal({ revRemota: docX1.rev, revBase: editorX1._revBase, inicializando: false }), true);
    assert.equal(editorX1._baseCamposEditor.clientes[0].productos.length, 2);
    const copiaX1 = await offline.getById(idX1);
    assert.equal(copiaX1.docData.clientes[0].productos.length, 2);
    assert.equal(copiaX1.baseCamposEditor.clientes[0].productos.length, 2);
    console.log('✓ X1 el editor incorpora lo del otro antes de adoptar la revisión');

    const idX2 = 'matriz-x2';
    await semilla(idX2, { rev: 3, clientes: nuevos, cargaCon: 'Chito', camionNumero: 1 });
    colaSync.set(idX2, {
      id: idX2,
      pendingSync: true,
      localVersion: 'x2',
      baseRev: 3,
      syncState: 'pending',
      baseCamposEditor: { clientes: viejos, cargaCon: 'Porro', camionNumero: 1 },
      docData: { clientes: viejos, cargaCon: 'Porro', camionNumero: 2, fecha: '2026-10-12', rev: 3 },
    });
    await syncMod.default.drain();
    const docX2 = await leer(idX2);
    assert.equal(docX2.clientes[0].productos.some((p) => p.id === 'p2'), true, 'la copia vieja no borra el producto');
    assert.equal(docX2.cargaCon, 'Chito');
    assert.equal(docX2.camionNumero, 2);
    console.log('✓ X2 la sincronización offline no pisa campos que esta copia no cambió');

    console.log('PASS matriz embarques (' + projectId + ')');
  } finally {
    for (const idDoc of creado) {
      await deleteDoc(doc(db, 'embarques', idDoc)).catch(() => {});
    }
    await firestoreReal.terminate(db);
    await deleteApp(app);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
