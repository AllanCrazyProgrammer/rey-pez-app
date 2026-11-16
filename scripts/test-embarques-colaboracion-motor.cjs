// Regresiones de la colaboración en vivo: una prueba por cada fallo real que
// tenía el motor anterior (datos perdidos, pantallas que se quedaban viejas,
// cambios atorados). Usa los mixins reales con SDKs independientes contra el
// emulador. Nunca importa src/firebase ni acepta hosts de producción.
//
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node --test scripts/test-embarques-colaboracion-motor.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Vue = require('vue');
const { initializeApp, deleteApp } = require('firebase/app');
const firestore = require('firebase/firestore');
const { loadSource, vueOptions } = require('./helpers/embarques-source.cjs');

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!/^127\.0\.0\.1:\d+$/.test(host || '')) throw new Error('Se requiere FIRESTORE_EMULATOR_HOST=127.0.0.1:PUERTO');
const puerto = Number(host.split(':')[1]);
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true });
global.localStorage = { setItem() {}, getItem() { return null; }, removeItem() {} };
const alertas = [];
global.alert = mensaje => { alertas.push(String(mensaje)); };
Vue.config.productionTip = false;
Vue.config.devtools = false;
// Los mixins registran cada paso; aquí solo interesa el resultado.
console.log = () => {};
console.warn = () => {};

const { identificarEstado, copiar } = loadSource('src/utils/embarqueColaboracion.js');
const { seleccionarCampos, CAMPOS_EDITOR } = loadSource('src/utils/embarqueRevision.js');
const { embarqueUndoMixin } = loadSource('src/views/Embarques/mixins/embarqueUndoMixin.js');
const { embarqueModalesMixin } = loadSource('src/views/Embarques/mixins/embarqueModalesMixin.js');
const opcionesVue = vueOptions('src/views/Embarques/NuevoEmbarque.vue', ['watch']);
const metodosVue = vueOptions('src/views/Embarques/NuevoEmbarque.vue', ['methods'], {}).methods;
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));
async function hasta(condicion, ms = 4000) {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (condicion()) return true;
    await esperar(15);
  }
  return Boolean(condicion());
}

async function escenario(fn, { editores: cuantos = 2 } = {}) {
  const apps = [];
  const editores = [];
  const id = 'motor-' + require('node:crypto').randomUUID();
  alertas.length = 0;
  try {
    for (let i = 0; i < cuantos; i += 1) {
      const app = initializeApp({ projectId: 'demo-reypez-embarques', apiKey: 'demo', appId: 'demo' }, id + '-' + i);
      apps.push(app);
      const db = firestore.getFirestore(app);
      firestore.connectFirestoreEmulator(db, '127.0.0.1', puerto);
      const disco = new Map();
      // despuesCommit: la transacción ya confirmó en el servidor pero la
      // respuesta aún no llega a esta pantalla (red lenta).
      const control = { despuesCommit: null, entregarSnapshot: null };
      const offline = {
        async init() {},
        async getById(k) { return copiar(disco.get(k)); },
        async save(v, opts) { disco.set(v.id, copiar({ ...v, ...opts })); },
      };
      const overrides = {
        'firebase/firestore': {
          ...firestore,
          getFirestore: () => db,
          async runTransaction(...args) {
            const resultado = await firestore.runTransaction(...args);
            const callback = control.despuesCommit;
            control.despuesCommit = null;
            if (callback) await callback();
            return resultado;
          },
          onSnapshot(ref, next, error) {
            control.entregarSnapshot = next;
            return firestore.onSnapshot(ref, next, error);
          },
        },
        '@/services/EmbarquesOfflineService': offline,
      };
      const { embarqueSyncMixin } = loadSource('src/views/Embarques/mixins/embarqueSyncMixin.js', overrides);
      const { embarqueCargaMixin } = loadSource('src/views/Embarques/mixins/embarqueCargaMixin.js', overrides);
      const vm = new Vue({
        mixins: [embarqueUndoMixin, embarqueModalesMixin, embarqueCargaMixin, embarqueSyncMixin],
        data: () => ({
          embarque: { productos: [] }, clienteCrudos: {}, embarqueId: id, hasPendingChanges: false,
          embarqueBloqueado: false, clientesPredefinidos: [{ id: '1', nombre: 'Prueba' }], clientesPersonalizados: [],
          clientesJuntarMedidas: {}, clientesReglaOtilio: {}, clientesIncluirPrecios: {}, clientesCuentaEnPdf: {}, clientesSumarKgCatarro: {},
          productosEliminadosLocalmente: new Set(), productosNuevosPendientes: new Map(),
          clientesModificados: {}, nombreAlternativoPendienteSync: new Map(), productoNombreAlternativoEnEdicionId: null,
          authStore: { userId: 'tester-' + i, user: { username: 'Prueba ' + i } },
        }),
        computed: { productosPorCliente() { return { '1': this.embarque.productos }; } },
        watch: { embarque: opcionesVue.watch.embarque, clienteCrudos: opcionesVue.watch.clienteCrudos },
        methods: {
          programarSubidaEnVivo() {}, mostrarMensaje() {}, actualizarMedidasUsadas() {},
          obtenerNombreCliente() { return 'Prueba'; },
          _eliminarProductoPorIndice: metodosVue._eliminarProductoPorIndice,
        },
      });
      vm._dbPrueba = db;
      vm._control = control;
      vm._disco = disco;
      vm._programarSubidaReal = embarqueSyncMixin.methods.programarSubidaEnVivo.bind(vm);
      editores.push(vm);
    }
    const inicial = identificarEstado({
      productos: [{ id: 'p1', clienteId: '1', medida: 'Gde', precio: 100, kilos: [20, 20], taras: [1, 2], restarTaras: false, noSumarKilos: false }],
      clienteCrudos: { '1': [{ id: 'g1', items: [{ id: 'i1', taras: 2, talla: 'Gde', barco: 'A' }] }] },
    });
    const ref = firestore.doc(editores[0]._dbPrueba, 'embarques', id);
    const docInicial = {
      fecha: '2026-11-15', cargaCon: 'Prueba', camionNumero: 1, rev: 1, productosEliminados: {},
      clientes: [{ id: '1', nombre: 'Prueba', productos: inicial.productos, crudos: inicial.clienteCrudos['1'] }],
    };
    await firestore.setDoc(ref, docInicial);
    const leer = async () => (await firestore.getDocFromServer(ref)).data();
    const recibir = async vm => { await vm.aplicarDocRemoto(id, await leer()); await Vue.nextTick(); };
    await Promise.all(editores.map(recibir));
    editores.forEach(vm => vm.initUndo(vm.embarque));
    const guardar = async vm => {
      await Vue.nextTick();
      await vm.guardarCambiosEnTiempoReal();
      for (let i = 0; i < 8 && vm.hasPendingChanges; i += 1) { await vm.subirCambiosEnVivo(); await Vue.nextTick(); }
      assert.equal(vm.hasPendingChanges, false, 'debe confirmar todos los cambios, sin reintentos infinitos');
    };
    // Pausa la subida de `vm` justo después de confirmar en el servidor.
    const subirConRespuestaLenta = vm => {
      let avisar; let liberar;
      const confirmado = new Promise(resolve => { avisar = resolve; });
      const pausa = new Promise(resolve => { liberar = resolve; });
      vm._control.despuesCommit = async () => { avisar(); await pausa; };
      const subida = vm.subirCambiosEnVivo();
      return { confirmado, liberar, subida };
    };
    await fn({ a: editores[0], b: editores[1], c: editores[2], id, ref, leer, recibir, guardar, subirConRespuestaLenta, docInicial });
  } finally {
    editores.forEach(vm => { vm._editorCerrado = true; vm.limpiarConexionesFirestore(); vm.$destroy(); });
    await Promise.all(apps.map(app => deleteApp(app).catch(() => {})));
  }
}

const kilos = doc => doc.clientes[0].productos[0].kilos;
const taras = doc => doc.clientes[0].productos[0].taras;

test('precio guardado desde el cuadro no se pierde si otra persona guardó mientras estaba abierto', { timeout: 30000 }, () => escenario(async ({ a, b, guardar, leer, recibir }) => {
  a.abrirModalPrecio(a.embarque.productos[0]);
  b.$set(b.embarque.productos[0].kilos, 1, 77); await guardar(b);
  await recibir(a);                       // llega el cambio de B con el cuadro abierto
  await a.guardarPrecio(150);
  await hasta(() => !a.hasPendingChanges && !a._subiendoEnVivo);
  for (let i = 0; i < 4 && a.hasPendingChanges; i += 1) await a.subirCambiosEnVivo();
  const doc = await leer();
  assert.equal(doc.clientes[0].productos[0].precio, 150, 'el precio capturado debe quedar en el servidor');
  assert.equal(kilos(doc)[1], 77, 'el kilo de la otra persona se conserva');
  assert.equal(a.embarque.productos[0].precio, 150, 'y debe verse en la pantalla de quien lo capturó');
}));

test('hilos, nota y nombre alternativo guardados desde su cuadro sobreviven a un cambio remoto', { timeout: 30000 }, () => escenario(async ({ a, b, guardar, leer, recibir }) => {
  const abrirYRecibir = async (abrir, cambiarB) => { abrir(); cambiarB(); await guardar(b); await recibir(a); };
  await abrirYRecibir(() => a.abrirModalHilos(a.embarque.productos[0]), () => b.$set(b.embarque.productos[0].taras, 0, 5));
  await a.guardarHilos('3 hilos');
  await hasta(() => !a.hasPendingChanges && !a._subiendoEnVivo);
  await recibir(b);
  await abrirYRecibir(() => a.abrirModalNota(a.embarque.productos[0]), () => b.$set(b.embarque.productos[0].taras, 1, 6));
  await a.guardarNota('sellado');
  await hasta(() => !a.hasPendingChanges && !a._subiendoEnVivo);
  await recibir(b);
  await abrirYRecibir(() => a.abrirModalNombreAlternativo(a.embarque.productos[0]), () => b.$set(b.embarque.productos[0].kilos, 0, 21));
  await a.guardarNombreAlternativo('Camarón jumbo');
  await hasta(() => !a.hasPendingChanges && !a._subiendoEnVivo);
  for (let i = 0; i < 4 && a.hasPendingChanges; i += 1) await a.subirCambiosEnVivo();
  const p = (await leer()).clientes[0].productos[0];
  assert.equal(p.hilos, '3 hilos');
  assert.equal(p.nota, 'sellado');
  assert.equal(p.nombreAlternativoPDF, 'Camarón jumbo');
  assert.deepEqual(p.taras, [5, 6]);
  assert.equal(p.kilos[0], 21);
}));

test('si otra persona eliminó el producto con el cuadro abierto, se avisa en vez de guardar al vacío', { timeout: 30000 }, () => escenario(async ({ a, b, guardar, leer, recibir }) => {
  a.abrirModalPrecio(a.embarque.productos[0]);
  b._eliminarProductoPorIndice(0, 'prueba'); await guardar(b);
  await recibir(a);
  assert.equal(a.embarque.productos.length, 0);
  await a.guardarPrecio(150);
  assert.ok(alertas.some(m => /ya no está en el embarque/.test(m)), 'debe avisar que el renglón ya no existe');
  assert.equal(a.mostrarModalPrecio, false);
  assert.equal((await leer()).clientes[0].productos.length, 0, 'no se resucita el producto');
}));

test('aplicar un cambio remoto conserva la identidad de productos, filas y crudos', { timeout: 30000 }, () => escenario(async ({ a, b, guardar, recibir }) => {
  const producto = a.embarque.productos[0];
  const arregloKilos = producto.kilos;
  const grupo = a.clienteCrudos['1'][0];
  const item = grupo.items[0];
  b.$set(b.embarque.productos[0].kilos, 0, 31);
  b.clienteCrudos['1'][0].items[0].barco = 'B';
  await guardar(b);
  await recibir(a);
  assert.equal(a.embarque.productos[0], producto, 'mismo objeto de producto');
  assert.equal(a.embarque.productos[0].kilos, arregloKilos, 'mismo arreglo de kilos');
  assert.equal(producto.kilos[0], 31);
  assert.equal(a.clienteCrudos['1'][0], grupo, 'mismo grupo de crudos');
  assert.equal(a.clienteCrudos['1'][0].items[0], item, 'mismo item de crudo');
  assert.equal(item.barco, 'B');
}));

test('lo tecleado mientras la subida viaja no se revierte aunque otra persona haya cambiado otro campo', { timeout: 30000 }, () => escenario(async ({ a, b, guardar, leer, subirConRespuestaLenta }) => {
  b.embarque.cargaCon = 'Caminante'; await guardar(b);          // A aún no lo recibe
  a.$set(a.embarque.productos[0].kilos, 0, 12); await Vue.nextTick();
  await a.guardarCambiosEnTiempoReal();
  const vuelo = subirConRespuestaLenta(a);
  await vuelo.confirmado;
  a.$set(a.embarque.productos[0].kilos, 0, 123); await Vue.nextTick();   // sigue tecleando
  vuelo.liberar();
  await vuelo.subida; await Vue.nextTick();
  assert.equal(a.embarque.productos[0].kilos[0], 123, 'la tecla más reciente no debe volver a 12');
  assert.equal(a.embarque.cargaCon, 'Caminante', 'el cambio de la otra persona sí se incorpora');
  assert.equal(a.hasPendingChanges, true, 'lo tecleado en vuelo sigue pendiente de subir');
  await guardar(a);
  const doc = await leer();
  assert.equal(kilos(doc)[0], 123);
  assert.equal(doc.cargaCon, 'Caminante');
}));

test('un cambio ajeno que llega mientras la subida viaja no se descarta', { timeout: 30000 }, () => escenario(async ({ a, b, guardar, subirConRespuestaLenta }) => {
  await a.cargarEmbarque(a.embarqueId); await Vue.nextTick();   // listener real en A
  a.$set(a.embarque.productos[0].kilos, 0, 44); await Vue.nextTick();
  await a.guardarCambiosEnTiempoReal();
  const vuelo = subirConRespuestaLenta(a);
  await vuelo.confirmado;
  b.embarque.cargaCon = 'Porro'; await guardar(b);             // B escribe otro campo justo después
  await esperar(400);                                            // el snapshot de B llega a A en pleno vuelo
  vuelo.liberar();
  await vuelo.subida;
  // A no vuelve a editar: debe ponerse al día sola.
  assert.ok(await hasta(() => a.embarque.cargaCon === 'Porro', 3000), 'A debe ver el cambio de B sin tener que volver a guardar');
  assert.equal(a.embarque.productos[0].kilos[0], 44);
}));

test('un snapshot atrasado no hace retroceder lo que esta pantalla ya confirmó', { timeout: 30000 }, () => escenario(async ({ a, guardar, docInicial }) => {
  await a.cargarEmbarque(a.embarqueId); await Vue.nextTick();
  a.$set(a.embarque.productos[0].kilos, 0, 55); await guardar(a);
  // El canal de escucha entrega tarde la revisión anterior.
  await a._control.entregarSnapshot({ metadata: { hasPendingWrites: false }, exists: () => true, data: () => copiar(docInicial) });
  await Vue.nextTick();
  assert.equal(a.embarque.productos[0].kilos[0], 55, 'no debe volver al valor viejo');
  assert.equal(a._revBase, 2);
}));

test('una casilla por cliente cambiada junto con una captura no se revierte al cruzarse con otro guardado', { timeout: 30000 }, () => escenario(async ({ a, b, guardar, leer }) => {
  a.clientesIncluirPrecios = { ...a.clientesIncluirPrecios, 1: true };
  a.$set(a.embarque.productos[0].kilos, 0, 61);
  b.$set(b.embarque.productos[0].taras, 1, 9); await guardar(b);
  await guardar(a);
  const doc = await leer();
  assert.equal(doc.clientesIncluirPrecios['1'], true, 'la casilla debe quedar marcada en el servidor');
  assert.equal(a.clientesIncluirPrecios['1'], true, 'y en la pantalla de quien la marcó');
  assert.equal(kilos(doc)[0], 61);
  assert.equal(taras(doc)[1], 9);
}));

test('quien teclea sin parar ve los cambios de los demás sin esperar a su propia subida', { timeout: 30000 }, () => escenario(async ({ a, b, guardar }) => {
  await a.cargarEmbarque(a.embarqueId); await Vue.nextTick();
  a.$set(a.embarque.productos[0].kilos, 0, 71); await Vue.nextTick();
  await a.guardarCambiosEnTiempoReal();                          // pendiente, aún sin subir
  assert.equal(a.hasPendingChanges, true);
  b.$set(b.embarque.productos[0].taras, 1, 4); await guardar(b);
  assert.ok(await hasta(() => a.embarque.productos[0].taras[1] === 4, 3000), 'A debe ver la tara de B aunque tenga cambios sin subir');
  assert.equal(a.embarque.productos[0].kilos[0], 71, 'sin perder lo que estaba capturando');
  assert.equal(a.hasPendingChanges, true);
}));

test('tres personas guardando a la vez: una sola pasada, sin respaldos de emergencia', { timeout: 30000 }, () => escenario(async ({ a, b, c, id, guardar, leer }) => {
  a.$set(a.embarque.productos[0].kilos, 0, 81);
  b.$set(b.embarque.productos[0].kilos, 1, 82);
  c.$set(c.embarque.productos[0].taras, 0, 3);
  await Promise.all([guardar(a), guardar(b), guardar(c)]);
  const doc = await leer();
  assert.deepEqual(kilos(doc), [81, 82]);
  assert.equal(taras(doc)[0], 3);
  const respaldos = await firestore.getDocs(firestore.query(
    firestore.collection(a._dbPrueba, 'respaldos_emergencia'), firestore.where('embarqueOriginalId', '==', id)));
  assert.equal(respaldos.size, 0, 'cruzarse al guardar celdas distintas no es un conflicto');
}, { editores: 3 }));

test('misma celda editada por dos personas: gana lo confirmado, se avisa y queda un respaldo', { timeout: 30000 }, () => escenario(async ({ a, b, id, guardar, leer }) => {
  a.$set(a.embarque.productos[0].kilos, 0, 91);
  b.$set(b.embarque.productos[0].kilos, 0, 92);
  await guardar(b);
  await guardar(a);
  assert.equal(kilos(await leer())[0], 92);
  assert.equal(a.embarque.productos[0].kilos[0], 92, 'la pantalla de A muestra el valor que quedó');
  assert.match(a.mensajeHistorial, /conflicto/);
  const respaldos = await firestore.getDocs(firestore.query(
    firestore.collection(a._dbPrueba, 'respaldos_emergencia'), firestore.where('embarqueOriginalId', '==', id)));
  assert.equal(respaldos.size, 1, 'lo que perdió queda respaldado una vez');
}));

test('abrir o recibir un embarque no lo marca con cambios pendientes', { timeout: 30000 }, () => escenario(async ({ a, b, guardar, leer }) => {
  await a.cargarEmbarque(a.embarqueId); await Vue.nextTick();
  const revAntes = (await leer()).rev;
  b.$set(b.embarque.productos[0].kilos, 0, 15); await guardar(b);
  await hasta(() => a.embarque.productos[0].kilos[0] === 15);
  await esperar(300);
  assert.equal(a.hasPendingChanges, false, 'recibir cambios no debe dejar pendientes');
  assert.equal((await leer()).rev, revAntes + 1, 'solo escribió quien editó');
}));

test('pendientes de un editor ya cerrado suben fusionados por la cola aunque el servidor haya avanzado', { timeout: 30000 }, () => escenario(async ({ a, b, id, guardar, leer }) => {
  // A captura un kilo y cierra antes de que suba: queda en su copia local.
  a.$set(a.embarque.productos[0].kilos, 0, 33); await Vue.nextTick();
  await a.guardarCambiosEnTiempoReal();
  const registro = copiar(a._disco.get(id));
  registro.localVersion = 'v1';
  assert.equal(registro.pendingSync, true);
  assert.ok(registro.baseCamposEditor, 'la copia local guarda la base de la fusión');
  // Mientras tanto otra persona sigue trabajando.
  b.$set(b.embarque.productos[0].taras, 1, 9); await guardar(b);

  const registros = new Map([[id, registro]]);
  const offline = {
    async getAllRecords() { return [...registros.values()].map(copiar); },
    ordenarPorFecha: lista => lista,
    async acknowledge(record, confirmado) {
      const actual = registros.get(record.id);
      if (actual && actual.localVersion === record.localVersion) registros.set(record.id, { ...confirmado, localVersion: record.localVersion, pendingSync: false, syncState: 'synced' });
    },
    async mutate(clave, transformar) { const siguiente = transformar(registros.get(clave) || null); if (siguiente) registros.set(clave, siguiente); },
  };
  global.window = { addEventListener() {}, dispatchEvent() {}, desktop: undefined };
  try {
    const sync = loadSource('src/services/EmbarquesSync.js', {
      'firebase/firestore': firestore,
      '@/firebase': { db: a._dbPrueba },
      './EmbarquesOfflineService': offline,
      '@/stores/auth': { useAuthStore: () => ({ isAuthenticated: true, userId: 'cola', user: { username: 'Cola' } }) },
    }).default;
    await sync.drain();
  } finally {
    delete global.window;
  }
  const doc = await leer();
  assert.equal(kilos(doc)[0], 33, 'el kilo pendiente del editor cerrado debe llegar al servidor');
  assert.equal(taras(doc)[1], 9, 'sin pisar lo que guardó la otra persona');
  assert.equal(registros.get(id).pendingSync, false, 'y la copia local deja de estar pendiente');
  assert.notEqual(registros.get(id).syncState, 'conflict');
}));

test('quien crea el embarque queda suscrito y recibe lo que guardan los demás', { timeout: 30000 }, () => escenario(async ({ a, b, id, guardar, leer }) => {
  // A abre "Nuevo embarque": no pasa por cargarEmbarque(id), crea el documento al subir.
  const nuevoId = 'creado-' + id;
  a.embarqueId = nuevoId; a._revBase = 0; a._baseCamposEditor = null; a.limpiarConexionesFirestore();
  a.hasPendingChanges = true; a._dirtyGen = 1;
  assert.ok(!a.unsubscribe, 'antes de subir no hay listener');
  await a.subirCambiosEnVivo();
  assert.equal(a.hasPendingChanges, false);
  assert.equal(a._revBase, 1, 'el documento se creó en la revisión 1');
  assert.ok(a.unsubscribe, 'tras la primera subida confirmada A debe quedar escuchando al servidor');
  // B abre ese embarque y guarda un cambio.
  b.embarqueId = nuevoId; b._revBase = 0; b._baseCamposEditor = null;
  await b.cargarEmbarque(nuevoId);
  assert.ok(await hasta(() => b._revBase === 1), 'B abrió el embarque');
  await Vue.nextTick();
  b.$set(b.embarque.productos[0].taras, 1, 9); await guardar(b);
  assert.ok(await hasta(() => a.embarque.productos[0].taras[1] === 9, 5000), 'A (la que creó) debe ver el cambio de B sin recargar');
  assert.equal(a._revBase, 2);
  assert.equal(a.hasPendingChanges, false);
}));
