// Integra los mixins y watchers reales con dos SDKs independientes. Nunca
// importa src/firebase ni acepta hosts/proyectos de producción.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Vue = require('vue');
const { initializeApp, deleteApp } = require('firebase/app');
const firestore = require('firebase/firestore');
const { loadSource, vueOptions } = require('./helpers/embarques-source.cjs');
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!/^127\.0\.0\.1:\d+$/.test(host || '')) throw new Error('Se requiere FIRESTORE_EMULATOR_HOST=127.0.0.1:PUERTO');
const { identificarEstado, copiar, insertarFilaProducto, eliminarFilaProducto } = loadSource('src/utils/embarqueColaboracion.js');
const { embarqueUndoMixin } = loadSource('src/views/Embarques/mixins/embarqueUndoMixin.js');
const { crearNuevoProducto } = loadSource('src/constants.js/embarque.js');
const opciones = vueOptions('src/views/Embarques/NuevoEmbarque.vue', ['watch']);
const metodos = vueOptions('src/views/Embarques/NuevoEmbarque.vue', ['methods'], {}).methods;
global.navigator = { onLine: true };
global.localStorage = { setItem() {}, getItem() { return null; } };
global.alert = message => { throw new Error(message); };

async function escenario(fn) {
  const apps = [], editores = [], discos = [];
  const id = 'historial-' + require('node:crypto').randomUUID();
  try {
    for (let i = 0; i < 2; i++) {
      const app = initializeApp({ projectId: 'demo-reypez-embarques', apiKey: 'demo', appId: 'demo' }, id + '-' + i);
      apps.push(app);
      const db = firestore.getFirestore(app);
      firestore.connectFirestoreEmulator(db, '127.0.0.1', Number(host.split(':')[1]));
      const disco = new Map(); discos.push(disco);
      const control = { despuesCommit: null };
      const offline = { async init() {}, async getById(k) { return copiar(disco.get(k)); },
        async save(v, opts) { disco.set(v.id, copiar({ ...v, ...opts })); } };
      const overrides = { 'firebase/firestore': { ...firestore, getFirestore: () => db,
        async runTransaction(...args) {
          const result = await firestore.runTransaction(...args);
          const callback = control.despuesCommit; control.despuesCommit = null;
          if (callback) await callback();
          return result;
        },
      }, '@/services/EmbarquesOfflineService': offline };
      const { embarqueSyncMixin } = loadSource('src/views/Embarques/mixins/embarqueSyncMixin.js', overrides);
      const { embarqueCargaMixin } = loadSource('src/views/Embarques/mixins/embarqueCargaMixin.js', overrides);
      const vm = new Vue({
        mixins: [embarqueUndoMixin, embarqueCargaMixin, embarqueSyncMixin],
        data: () => ({ embarque: { productos: [] }, clienteCrudos: {}, embarqueId: id, hasPendingChanges: false,
          embarqueBloqueado: false, clientesPredefinidos: [{ id: '1', nombre: 'Prueba' }], clientesPersonalizados: [],
          clientesJuntarMedidas: {}, clientesReglaOtilio: {}, clientesIncluirPrecios: {}, clientesCuentaEnPdf: {}, clientesSumarKgCatarro: {},
          productosEliminadosLocalmente: new Set(), productosNuevosPendientes: new Map(),
          authStore: { userId: 'tester-' + i, user: { username: 'Prueba' } },
        }),
        computed: { productosPorCliente() { return { '1': this.embarque.productos }; } },
        watch: { embarque: opciones.watch.embarque, clienteCrudos: opciones.watch.clienteCrudos },
        methods: {
          programarSubidaEnVivo() {}, mostrarMensaje() {}, actualizarMedidasUsadas() {}, obtenerNombreCliente() { return 'Prueba'; },
          _eliminarProductoPorIndice: metodos._eliminarProductoPorIndice,
        },
      });
      vm._dbPrueba = db;
      vm._programarSubidaReal = embarqueSyncMixin.methods.programarSubidaEnVivo.bind(vm);
      vm._controlPrueba = control;
      editores.push(vm);
    }
    const inicial = identificarEstado({ productos: [{ id: 'p1', clienteId: '1', medida: 'Gde', precio: 100, kilos: [20,20], taras: [1,2], restarTaras: false, noSumarKilos: false }],
      clienteCrudos: { '1': [{ id: 'g1', items: [{ id: 'i1', taras: 2, talla: 'Gde', barco: 'A' }] }] } });
    const ref = firestore.doc(editores[0]._dbPrueba, 'embarques', id);
    await firestore.setDoc(ref, { fecha: '2026-10-29', cargaCon: 'Prueba', camionNumero: 1, rev: 1,
      clientes: [{ id: '1', nombre: 'Prueba', productos: inicial.productos, crudos: inicial.clienteCrudos['1'] }], productosEliminados: {} });
    const leer = async () => (await firestore.getDocFromServer(ref)).data();
    const recibir = async vm => { await vm.aplicarDocRemoto(id, await leer()); await Vue.nextTick(); };
    await Promise.all(editores.map(recibir));
    editores.forEach(vm => vm.initUndo(vm.embarque));
    const guardar = async vm => {
      await Vue.nextTick();
      await vm.guardarCambiosEnTiempoReal();
      for (let i = 0; i < 8 && vm.hasPendingChanges; i++) { await vm.subirCambiosEnVivo(); await Vue.nextTick(); }
      assert.equal(vm.hasPendingChanges, false, 'debe confirmar todos los cambios, sin reintentos infinitos');
    };
    await fn({ a: editores[0], b: editores[1], leer, recibir, guardar, discos });
  } finally {
    editores.forEach(vm => { vm.limpiarConexionesFirestore(); vm.$destroy(); });
    await Promise.all(apps.map(deleteApp));
  }
}

test('dos clientes: altas simultáneas, undo y redo de pesadas con transacciones reales', { timeout: 60000 }, () => escenario(async ({ a,b,guardar,leer,recibir }) => {
  insertarFilaProducto(a.embarque.productos[0], 'pesadasIds', a.$set); a.embarque.productos[0].kilos[2] = 30;
  insertarFilaProducto(b.embarque.productos[0], 'pesadasIds', b.$set); b.embarque.productos[0].kilos[2] = 40;
  await Promise.all([guardar(a), guardar(b)]);
  assert.deepEqual((await leer()).clientes[0].productos[0].kilos.slice().sort((x,y)=>x-y), [20,20,30,40]);
  await recibir(a); a.undo(); await guardar(a);
  assert.deepEqual((await leer()).clientes[0].productos[0].kilos, [20,20,40]);
  a.redo(); await guardar(a);
  assert.equal((await leer()).clientes[0].productos[0].kilos.length,4);
}));

test('dos clientes: baja/restauración de producto con lápida y una edición ajena', { timeout: 60000 }, () => escenario(async ({ a,b,guardar,leer,recibir }) => {
  a.embarque.productos.push({ ...crearNuevoProducto('1'), medida:'Nuevo' }); await guardar(a); await recibir(b);
  a._eliminarProductoPorIndice(0, 'prueba');
  b.embarque.productos[1].medida = 'Ajeno';
  await Promise.all([guardar(a),guardar(b)]); await recibir(a);
  assert.equal((await leer()).clientes[0].productos.length,1);
  a.undo();await guardar(a);
  let doc=await leer(); assert.equal(doc.productosEliminados.p1,null); assert.equal(doc.clientes[0].productos.length,2);
  assert.equal(doc.clientes[0].productos[1].medida,'Ajeno');
  await recibir(b); assert.equal(b.embarque.productos.length,2);
  a.redo();await guardar(a);doc=await leer();assert.equal(doc.clientes[0].productos.length,1);assert.ok(doc.productosEliminados.p1);
}));

test('dos clientes: undo atrasado no pisa kilo ajeno y conserva la tara independiente', { timeout: 60000 }, () => escenario(async ({ a,b,guardar,leer,recibir }) => {
  a.$set(a.embarque.productos[0].kilos,0,30); await guardar(a); await recibir(b);
  b.$set(b.embarque.productos[0].kilos,0,99); await guardar(b);
  // A no recibió aún el snapshot de B.
  a.undo(); a.$set(a.embarque.productos[0].taras,1,8); await guardar(a);
  const p=(await leer()).clientes[0].productos[0];assert.equal(p.kilos[0],99);assert.equal(p.taras[1],8);
  assert.match(a.mensajeHistorial,/conflicto/);
}));

test('dos clientes: crudos se fusionan por item/campo; undo preserva el barco ajeno', { timeout: 60000 }, () => escenario(async ({ a,b,guardar,leer,recibir }) => {
  a.clienteCrudos['1'][0].items[0].taras=8;
  b.clienteCrudos['1'][0].items[0].barco='B';
  b.clienteCrudos['1'][0].items.push({id:'i2',taras:7});
  await Promise.all([guardar(a),guardar(b)]);await recibir(a);
  a.undo();await guardar(a);
  const items=(await leer()).clientes[0].crudos[0].items;
  assert.equal(items[0].taras,2);assert.equal(items[0].barco,'B');assert.equal(items[1].taras,7);
}));

test('undo del último producto no crea placeholders al guardar y reabrir', { timeout: 60000 }, () => escenario(async ({ a,guardar,leer,recibir,b }) => {
  a._eliminarProductoPorIndice(0,'prueba');await guardar(a);await recibir(b);
  assert.equal(b.embarque.productos.length,0);assert.equal((await leer()).clientes[0].productos.length,0);
  a.undo();await guardar(a);assert.equal((await leer()).clientes[0].productos[0].id,'p1');
}));

test('undo mientras una subida está en vuelo no se pierde al llegar la confirmación', { timeout: 60000 }, () => escenario(async ({ a,b,guardar,leer,recibir }) => {
  a.embarque.productos[0].precio = 110; await Vue.nextTick();
  let avisar, liberar;
  const confirmado = new Promise(resolve => { avisar = resolve; });
  const pausa = new Promise(resolve => { liberar = resolve; });
  a._controlPrueba.despuesCommit = async () => { avisar(); await pausa; };
  const subida = a.subirCambiosEnVivo();
  await confirmado;
  try {
    await recibir(b); b.$set(b.embarque.productos[0].kilos,1,88); await guardar(b);
    a.undo(); await Vue.nextTick();
  } finally { liberar(); }
  await subida; await guardar(a);
  const p=(await leer()).clientes[0].productos[0];assert.equal(p.precio,100);assert.equal(p.kilos[1],88);
}));

test('copia offline conserva la base anterior al reabrir y combina pendientes', { timeout: 60000 }, () => escenario(async ({ a,b,guardar,leer,discos }) => {
  a.$set(a.embarque.productos[0].kilos,0,33); await Vue.nextTick();
  await a.guardarSnapshotOffline({pendingSync:true});
  const record=copiar(discos[0].get(a.embarqueId));
  b.$set(b.embarque.productos[0].taras,1,9); await guardar(b);
  a.aplicarSnapshotOffline(record);await Vue.nextTick();
  await guardar(a);
  const p=(await leer()).clientes[0].productos[0];assert.equal(p.kilos[0],33);assert.equal(p.taras[1],9);
}));

test('onSnapshot real actualiza otro editor y no incorpora cambios ajenos a undo', { timeout: 60000 }, () => escenario(async ({ a,b,guardar }) => {
  await a.cargarEmbarque(a.embarqueId); await Vue.nextTick();
  a.embarque.productos[0].precio=110;await guardar(a);
  await b.aplicarDocRemoto(b.embarqueId,(await firestore.getDocFromServer(firestore.doc(b._dbPrueba,'embarques',b.embarqueId))).data());
  await Vue.nextTick();b.$set(b.embarque.productos[0].kilos,1,77);await guardar(b);
  const hasta=Date.now()+5000;
  while(a.embarque.productos[0].kilos[1]!==77 && Date.now()<hasta) await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(a.embarque.productos[0].kilos[1],77);
  await Vue.nextTick();a.undo();await Vue.nextTick();
  assert.equal(a.embarque.productos[0].precio,100);assert.equal(a.embarque.productos[0].kilos[1],77);
}));

test('la escritura continua llega al otro editor antes de abandonar el campo', { timeout: 15000 }, () => escenario(async ({ a,b }) => {
  a.programarSubidaEnVivo = a._programarSubidaReal;
  await b.cargarEmbarque(b.embarqueId); await Vue.nextTick();
  let recibidoDuranteCaptura=false;
  for(let n=30;n<46;n++){
    a.$set(a.embarque.productos[0].kilos,0,n);
    await new Promise(resolve=>setTimeout(resolve,150));
    if(b.embarque.productos[0].kilos[0]!==20) recibidoDuranteCaptura=true;
  }
  assert.equal(recibidoDuranteCaptura,true,'el receptor debe actualizarse sin esperar al último input ni al blur');
  const hasta=Date.now()+5000;
  while((a.hasPendingChanges || b.embarque.productos[0].kilos[0]!==45) && Date.now()<hasta) await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(a.hasPendingChanges,false);assert.equal(b.embarque.productos[0].kilos[0],45);
}));
