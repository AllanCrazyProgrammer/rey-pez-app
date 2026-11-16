// Simulación de colaboración en vivo sobre un embarque: varios editores
// "sueltos" (listeners y temporizadores reales, sin pasos coreografiados) que
// teclean, agregan y borran filas y productos al mismo tiempo, con latencia de
// red inyectada. Al terminar comprueba:
//   1. que ninguna edición se perdió (cada editor escribe celdas propias, así
//      que el valor final del servidor debe ser el último que tecleó),
//   2. que todos los editores ven lo mismo que el servidor (convergencia),
//   3. cuánto tarda un cambio en aparecer en las demás pantallas.
//
// Solo corre contra el emulador; nunca importa src/firebase.
//
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node scripts/sim-embarques-colaboracion.cjs \
//     --editores=3 --segundos=20 --latencia=120 --semilla=1 --escenario=mixto
//
// Escenarios: celdas (solo teclear), mixto (teclear + filas + productos +
// crudos), conflicto (todos escriben la misma celda: solo se exige convergencia).
'use strict';
const crypto = require('node:crypto');
const Vue = require('vue');
const { initializeApp, deleteApp } = require('firebase/app');
const firestore = require('firebase/firestore');
const { loadSource, vueOptions } = require('./helpers/embarques-source.cjs');

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!/^127\.0\.0\.1:\d+$/.test(host || '')) {
  throw new Error('Se requiere FIRESTORE_EMULATOR_HOST=127.0.0.1:PUERTO (solo emulador).');
}
const puerto = Number(host.split(':')[1]);

const consolaReal = { log: console.log, warn: console.warn, error: console.error };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true });
global.localStorage = { setItem() {}, getItem() { return null; }, removeItem() {} };
Vue.config.productionTip = false;
Vue.config.devtools = false;

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));
function generador(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function percentil(lista, p) {
  if (!lista.length) return 0;
  const orden = lista.slice().sort((x, y) => x - y);
  return orden[Math.min(orden.length - 1, Math.floor((p / 100) * orden.length))];
}

function cargarFuentes(overrides) {
  const colaboracion = loadSource('src/utils/embarqueColaboracion.js');
  const { embarqueUndoMixin } = loadSource('src/views/Embarques/mixins/embarqueUndoMixin.js');
  const { embarqueSyncMixin } = loadSource('src/views/Embarques/mixins/embarqueSyncMixin.js', overrides);
  const { embarqueCargaMixin } = loadSource('src/views/Embarques/mixins/embarqueCargaMixin.js', overrides);
  return { colaboracion, embarqueUndoMixin, embarqueSyncMixin, embarqueCargaMixin };
}

const CLIENTES = [{ id: 1, nombre: 'Joselito' }, { id: 2, nombre: 'Catarro' }, { id: 3, nombre: 'Otilio' }];

async function simular(opciones = {}) {
  const cfg = {
    editores: 3, segundos: 20, latencia: 120, semilla: 1, escenario: 'mixto', verboso: false,
    esperaFinal: 45000, ...opciones,
  };
  const rngGlobal = generador(cfg.semilla);
  const id = 'sim-' + crypto.randomUUID();
  const colab = loadSource('src/utils/embarqueColaboracion.js');
  const { crearNuevoProducto } = loadSource('src/constants/embarque.js');
  const calculos = loadSource('src/views/Embarques/mixins/calculosMixin.js').default;
  const opcionesVue = vueOptions('src/views/Embarques/NuevoEmbarque.vue', ['watch']);
  const metodosVue = vueOptions('src/views/Embarques/NuevoEmbarque.vue', ['methods'], {}).methods;
  const { copiar, identificarEstado, insertarFilaProducto, eliminarFilaProducto, estadoDesdeDoc, aArbol, diferencias } = colab;

  const stats = {
    transacciones: 0, intentosTransaccion: 0, conflictos: 0, fusionesAjenas: 0, subidasOk: 0,
    alertas: [], errores: [], avisosConflicto: 0,
  };
  // Los mixins registran mucho en consola; se cuenta lo relevante y se calla.
  const contar = texto => {
    if (texto.includes('Conflicto de revisión')) stats.conflictos += 1;
    if (texto.includes('Campos ajenos del otro editor incorporados')) stats.fusionesAjenas += 1;
    if (texto.includes('Cambios sincronizados con la nube')) stats.subidasOk += 1;
  };
  console.log = (...a) => { contar(a.map(String).join(' ')); if (cfg.verboso) consolaReal.log(...a); };
  console.warn = (...a) => { if (cfg.verboso) consolaReal.warn(...a); };
  console.error = (...a) => {
    stats.errores.push(a.map(x => (x && x.message) || String(x)).join(' ').slice(0, 300));
    if (cfg.verboso) consolaReal.error(...a);
  };
  global.alert = mensaje => { stats.alertas.push(String(mensaje)); };

  const apps = [];
  const editores = [];
  try {
    for (let i = 0; i < cfg.editores; i += 1) {
      const rng = generador(cfg.semilla * 1000 + i + 1);
      const app = initializeApp({ projectId: 'demo-reypez-embarques', apiKey: 'demo', appId: 'demo' }, id + '-' + i);
      apps.push(app);
      const db = firestore.getFirestore(app);
      firestore.connectFirestoreEmulator(db, '127.0.0.1', puerto);
      const latencia = () => (cfg.latencia ? Math.round(cfg.latencia * (0.5 + rng())) : 0);
      const disco = new Map();
      const offline = {
        async init() {},
        async getById(k) { await esperar(1 + Math.floor(rng() * 4)); return copiar(disco.get(k)); },
        async save(v, opts) { await esperar(1 + Math.floor(rng() * 4)); disco.set(v.id, copiar({ ...v, ...opts })); },
      };
      const overrides = {
        'firebase/firestore': {
          ...firestore,
          getFirestore: () => db,
          // Latencia realista: la lectura tarda ida y vuelta, y el commit viaja
          // antes de aplicarse. Entre leer y confirmar queda una ventana en
          // la que otro editor puede escribir (contención verdadera).
          async runTransaction(dbx, fn, ...resto) {
            stats.transacciones += 1;
            const resultado = await firestore.runTransaction(dbx, async tx => {
              stats.intentosTransaccion += 1;
              const lento = {
                async get(...a) {
                  await esperar(latencia() / 2);
                  const leido = await tx.get(...a);
                  await esperar(latencia() / 2);
                  return leido;
                },
                set: (...a) => { tx.set(...a); return lento; },
                update: (...a) => { tx.update(...a); return lento; },
                delete: (...a) => { tx.delete(...a); return lento; },
              };
              const salida = await fn(lento);
              await esperar(latencia() / 2);
              return salida;
            }, ...resto);
            await esperar(latencia() / 2);
            return resultado;
          },
          // El canal de escucha es independiente del de escritura: un snapshot
          // puede llegar antes o después de la respuesta de la transacción.
          onSnapshot(ref, next, error) {
            let activo = true;
            let ultimaEntrega = 0;
            const cancelar = firestore.onSnapshot(ref, snap => {
              const entrega = Math.max(ultimaEntrega + 1, Date.now() + latencia());
              ultimaEntrega = entrega;
              setTimeout(() => { if (activo) next(snap); }, Math.max(0, entrega - Date.now()));
            }, error);
            return () => { activo = false; cancelar(); };
          },
        },
        '@/services/EmbarquesOfflineService': offline,
      };
      const { embarqueUndoMixin, embarqueSyncMixin, embarqueCargaMixin } = cargarFuentes(overrides);
      const vm = new Vue({
        mixins: [embarqueUndoMixin, embarqueCargaMixin, embarqueSyncMixin],
        data: () => ({
          embarque: { productos: [] }, clienteCrudos: {}, embarqueId: null, hasPendingChanges: false,
          embarqueBloqueado: false, clientesPredefinidos: CLIENTES, clientesPersonalizados: [],
          clientesJuntarMedidas: {}, clientesReglaOtilio: {}, clientesIncluirPrecios: {}, clientesCuentaEnPdf: {},
          clientesSumarKgCatarro: {}, productosEliminadosLocalmente: new Set(), productosNuevosPendientes: new Map(),
          authStore: { userId: 'sim-' + i, user: { username: 'Editor ' + (i + 1) } },
        }),
        computed: {
          // Mismo criterio que el editor real: agrupar por cliente y ordenar por medida.
          productosPorCliente() {
            const salida = {};
            this.clientesPredefinidos.forEach(c => { salida[String(c.id)] = []; });
            this.embarque.productos.forEach(producto => {
              const clienteId = producto.clienteId;
              if (!salida[clienteId]) salida[clienteId] = [];
              salida[clienteId].push(producto);
              if (!producto.isEditing) {
                salida[clienteId].sort((a, b) => {
                  if (a.medida && a.tipo && b.medida && b.tipo) return calculos.methods.compararMedidas(b.medida, a.medida);
                  if (!a.medida || !a.tipo) return 1;
                  if (!b.medida || !b.tipo) return -1;
                  return 0;
                });
              }
            });
            return salida;
          },
        },
        watch: { embarque: opcionesVue.watch.embarque, clienteCrudos: opcionesVue.watch.clienteCrudos },
        methods: {
          mostrarMensaje() {}, actualizarMedidasUsadas() {},
          obtenerNombreCliente(cid) { return (CLIENTES.find(c => String(c.id) === String(cid)) || {}).nombre || 'Cliente'; },
          _eliminarProductoPorIndice: metodosVue._eliminarProductoPorIndice,
        },
      });
      const informarOriginal = vm.informarConflictoEdicion;
      vm.informarConflictoEdicion = function informar(mensaje) { stats.avisosConflicto += 1; return informarOriginal.call(vm, mensaje); };
      editores.push({ i, vm, db, rng, esperado: new Map(), filas: new Map(), productos: new Set(), crudos: [] });
    }

    // ── Documento inicial ────────────────────────────────────────────────
    const FILAS_POR_EDITOR = 3;
    const compartido = {
      ...crearNuevoProducto('1'), id: 'p-compartido', medida: '21/25', tipo: 's/h20', isEditing: false, isNew: false,
      kilos: [], taras: [], pesadasIds: [],
    };
    editores.forEach(ed => {
      const propias = new Set();
      for (let f = 0; f < FILAS_POR_EDITOR; f += 1) {
        const filaId = `f-${ed.i}-${f}`;
        compartido.pesadasIds.push(filaId); compartido.kilos.push(10 + f); compartido.taras.push(1);
        propias.add(filaId);
      }
      ed.filas.set('p-compartido', propias);
    });
    const productosIniciales = [compartido];
    editores.forEach(ed => {
      const propio = {
        ...crearNuevoProducto(String((ed.i % CLIENTES.length) + 1)), id: 'p-propio-' + ed.i,
        medida: `${31 + ed.i * 5}/${35 + ed.i * 5}`, tipo: 's/h20', isEditing: false, isNew: false,
        kilos: [20, 21], taras: [1, 1], pesadasIds: [`g-${ed.i}-0`, `g-${ed.i}-1`], precio: 100 + ed.i,
      };
      productosIniciales.push(propio);
      ed.productos.add(propio.id);
      ed.filas.set(propio.id, new Set(propio.pesadasIds));
    });
    const crudos = { '1': [{ id: 'grupo-1', items: editores.map(ed => ({ id: 'item-' + ed.i, talla: 'Gde', barco: 'A', taras: '2-19' })) }] };
    editores.forEach(ed => { ed.crudos.push({ grupo: 'grupo-1', item: 'item-' + ed.i }); });
    const inicial = identificarEstado({ productos: productosIniciales, clienteCrudos: crudos });
    const ref = firestore.doc(editores[0].db, 'embarques', id);
    await firestore.setDoc(ref, {
      fecha: '2026-11-15', cargaCon: 'Simulación', camionNumero: 1, rev: 1, productosEliminados: {},
      clientes: CLIENTES.map(c => ({
        id: String(c.id), nombre: c.nombre,
        productos: inicial.productos.filter(p => String(p.clienteId) === String(c.id)),
        crudos: inicial.clienteCrudos[String(c.id)] || [],
      })),
    });

    // ── Abrir el embarque en cada editor con su listener real ────────────
    await Promise.all(editores.map(async ed => {
      await ed.vm.cargarEmbarque(id);
      const hasta = Date.now() + 15000;
      while (!(ed.vm._revBase > 0) && Date.now() < hasta) await esperar(20);
      if (!(ed.vm._revBase > 0)) throw new Error('El editor ' + ed.i + ' no recibió el documento inicial.');
      await Vue.nextTick();
      ed.vm.initUndo(ed.vm.embarque);
    }));

    // ── Lectura de celdas y bitácora de propagación ──────────────────────
    const producto = (vm, pid) => vm.embarque.productos.find(p => p.id === pid);
    const leerCelda = (vm, clave) => {
      const partes = clave.split('|');
      if (partes[0] === 'cargaCon') return vm.embarque.cargaCon;
      if (partes[0] === 'crudo') {
        const grupos = Object.values(vm.clienteCrudos || {}).flat();
        const grupo = grupos.find(g => g.id === partes[1]);
        const item = grupo && (grupo.items || []).find(it => it.id === partes[2]);
        return item ? item[partes[3]] : undefined;
      }
      const p = producto(vm, partes[1]);
      if (partes[0] === 'existeProducto') return Boolean(p);
      if (!p) return undefined;
      if (partes[0] === 'campo') return p[partes[2]];
      const indice = (p.pesadasIds || []).indexOf(partes[2]);
      if (partes[0] === 'existeFila') return indice >= 0;
      if (indice < 0) return undefined;
      return (p[partes[3]] || [])[indice];
    };
    const ultimos = new Map();
    const latencias = [];
    const registrar = (ed, clave, valor) => {
      ed.esperado.set(clave, valor);
      ultimos.set(clave, { editor: ed.i, clave, valor, t: Date.now(), vistos: new Set() });
    };
    const revisarPropagacion = () => {
      ultimos.forEach(ev => {
        if (ev.resuelto) return;
        editores.forEach(otro => {
          if (otro.i === ev.editor || ev.vistos.has(otro.i)) return;
          if (leerCelda(otro.vm, ev.clave) === ev.valor) ev.vistos.add(otro.i);
        });
        if (ev.vistos.size === editores.length - 1) {
          ev.resuelto = true;
          latencias.push(Date.now() - ev.t);
        }
      });
    };
    const vigia = setInterval(revisarPropagacion, 25);

    // ── Acciones de usuario ──────────────────────────────────────────────
    let corriendo = true;
    const teclear = async (ed, clave, escribir) => {
      // Dígito a dígito, como en la captura real.
      const digitos = 1 + Math.floor(ed.rng() * 3);
      let texto = '';
      for (let d = 0; d < digitos && corriendo; d += 1) {
        texto += String(1 + Math.floor(ed.rng() * 9));
        const valor = Number(texto);
        if (!escribir(valor)) return;
        registrar(ed, clave, valor);
        await esperar(70 + Math.floor(ed.rng() * 110));
      }
    };
    const elegir = (ed, lista) => lista[Math.floor(ed.rng() * lista.length)];
    const acciones = {
      async kilos(ed) {
        const pid = elegir(ed, [...ed.filas.keys()].filter(k => ed.filas.get(k).size));
        if (!pid) return;
        const filaId = elegir(ed, [...ed.filas.get(pid)]);
        const campo = ed.rng() < 0.7 ? 'kilos' : 'taras';
        await teclear(ed, `fila|${pid}|${filaId}|${campo}`, valor => {
          const p = producto(ed.vm, pid);
          const indice = p ? p.pesadasIds.indexOf(filaId) : -1;
          if (indice < 0) return false;
          ed.vm.$set(p[campo], indice, valor);
          return true;
        });
      },
      async precio(ed) {
        const pid = elegir(ed, [...ed.productos]);
        if (!pid) return;
        await teclear(ed, `campo|${pid}|precio`, valor => {
          const p = producto(ed.vm, pid);
          if (!p) return false;
          ed.vm.$set(p, 'precio', valor);
          return true;
        });
      },
      async crudo(ed) {
        const destino = elegir(ed, ed.crudos);
        if (!destino) return;
        const valor = `${1 + Math.floor(ed.rng() * 9)}-${10 + Math.floor(ed.rng() * 10)}`;
        const grupo = Object.values(ed.vm.clienteCrudos || {}).flat().find(g => g.id === destino.grupo);
        const item = grupo && grupo.items.find(it => it.id === destino.item);
        if (!item) return;
        item.taras = valor;
        registrar(ed, `crudo|${destino.grupo}|${destino.item}|taras`, valor);
      },
      async agregarFila(ed) {
        const pid = elegir(ed, [...ed.filas.keys()]);
        const p = pid && producto(ed.vm, pid);
        if (!p) return;
        insertarFilaProducto(p, 'pesadasIds', ed.vm.$set);
        const filaId = p.pesadasIds[p.pesadasIds.length - 1];
        ed.filas.get(pid).add(filaId);
        registrar(ed, `existeFila|${pid}|${filaId}`, true);
        await esperar(60);
        await teclear(ed, `fila|${pid}|${filaId}|kilos`, valor => {
          const actual = producto(ed.vm, pid);
          const indice = actual ? actual.pesadasIds.indexOf(filaId) : -1;
          if (indice < 0) return false;
          ed.vm.$set(actual.kilos, indice, valor);
          return true;
        });
      },
      async borrarFila(ed) {
        const pid = elegir(ed, [...ed.filas.keys()].filter(k => ed.filas.get(k).size > 2));
        const p = pid && producto(ed.vm, pid);
        if (!p) return;
        const filaId = elegir(ed, [...ed.filas.get(pid)]);
        const indice = p.pesadasIds.indexOf(filaId);
        if (indice < 0) return;
        eliminarFilaProducto(p, 'pesadasIds', indice, ed.vm.$set);
        ed.filas.get(pid).delete(filaId);
        ['kilos', 'taras'].forEach(campo => {
          const clave = `fila|${pid}|${filaId}|${campo}`;
          ed.esperado.delete(clave); ultimos.delete(clave);
        });
        registrar(ed, `existeFila|${pid}|${filaId}`, false);
      },
      async agregarProducto(ed) {
        if (ed.productos.size >= 4) return;
        const nuevo = {
          ...crearNuevoProducto(String(1 + Math.floor(ed.rng() * CLIENTES.length))),
          medida: `${40 + Math.floor(ed.rng() * 30)}/${71 + Math.floor(ed.rng() * 20)}`, tipo: 's/h20', isEditing: false, isNew: false,
        };
        ed.vm.embarque.productos.push(nuevo);
        ed.productos.add(nuevo.id);
        ed.filas.set(nuevo.id, new Set());
        registrar(ed, `existeProducto|${nuevo.id}`, true);
        registrar(ed, `campo|${nuevo.id}|medida`, nuevo.medida);
      },
      async borrarProducto(ed) {
        const candidatos = [...ed.productos].filter(pid => !pid.startsWith('p-propio-'));
        const pid = elegir(ed, candidatos);
        if (!pid) return;
        const indice = ed.vm.embarque.productos.findIndex(p => p.id === pid);
        if (indice < 0) return;
        ed.vm._eliminarProductoPorIndice(indice, 'simulación');
        ed.productos.delete(pid);
        ed.filas.delete(pid);
        [...ed.esperado.keys()].filter(k => k.split('|')[1] === pid).forEach(k => { ed.esperado.delete(k); ultimos.delete(k); });
        registrar(ed, `existeProducto|${pid}`, false);
      },
      async mismaCelda(ed) {
        // Conflicto verdadero: todos escriben la misma celda y el mismo texto.
        const valor = 10 + Math.floor(ed.rng() * 90);
        const p = producto(ed.vm, 'p-compartido');
        if (p) ed.vm.$set(p.kilos, 0, valor);
        ed.vm.embarque.cargaCon = 'Camión ' + Math.floor(ed.rng() * 5);
      },
    };
    const mezclas = {
      celdas: [['kilos', 8], ['precio', 1], ['crudo', 1]],
      mixto: [['kilos', 10], ['precio', 1], ['crudo', 2], ['agregarFila', 3], ['borrarFila', 1], ['agregarProducto', 1], ['borrarProducto', 0.5]],
      conflicto: [['mismaCelda', 3], ['kilos', 5]],
    };
    const mezcla = mezclas[cfg.escenario];
    if (!mezcla) throw new Error('Escenario desconocido: ' + cfg.escenario);
    const total = mezcla.reduce((s, [, peso]) => s + peso, 0);
    const bucle = async ed => {
      await esperar(Math.floor(ed.rng() * 300));
      while (corriendo) {
        let dado = ed.rng() * total;
        const [nombre] = mezcla.find(([, peso]) => (dado -= peso) < 0) || mezcla[0];
        try {
          await acciones[nombre](ed);
          await Vue.nextTick();
        } catch (error) {
          stats.errores.push('acción ' + nombre + ': ' + error.message);
        }
        await esperar(80 + Math.floor(ed.rng() * 420));
      }
    };
    const inicio = Date.now();
    const bucles = editores.map(bucle);
    await esperar(cfg.segundos * 1000);
    corriendo = false;
    await Promise.all(bucles);
    const finEdicion = Date.now();

    // ── Esperar a que todo se asiente ────────────────────────────────────
    const ocupado = vm => vm.hasPendingChanges || vm._subiendoEnVivo || vm._timerSubidaEnVivo;
    const limite = Date.now() + cfg.esperaFinal;
    let quietoDesde = 0;
    const reposo = Math.max(1500, cfg.latencia * 6);
    while (Date.now() < limite) {
      if (editores.some(ed => ocupado(ed.vm))) quietoDesde = 0;
      else if (!quietoDesde) quietoDesde = Date.now();
      else if (Date.now() - quietoDesde > reposo) break;
      await esperar(50);
    }
    const asentado = quietoDesde > 0 && Date.now() - quietoDesde > reposo;
    const tiempoAsentar = Date.now() - finEdicion;
    revisarPropagacion();
    clearInterval(vigia);

    // ── Verificación ─────────────────────────────────────────────────────
    const servidor = (await firestore.getDocFromServer(ref)).data();
    const estadoServidor = estadoDesdeDoc(servidor);
    const vistaServidor = { embarque: { productos: estadoServidor.productos, cargaCon: estadoServidor.cargaCon }, clienteCrudos: estadoServidor.clienteCrudos };
    const perdidas = [];
    editores.forEach(ed => {
      ed.esperado.forEach((valor, clave) => {
        if (cfg.escenario === 'conflicto' && clave.includes('|p-compartido|f-0-0|')) return;
        const real = leerCelda(vistaServidor, clave);
        if (real !== valor) perdidas.push({ editor: ed.i + 1, celda: clave, esperado: valor, servidor: real === undefined ? '(no existe)' : real });
      });
    });
    const arbolServidor = aArbol(estadoServidor);
    const divergencias = [];
    editores.forEach(ed => {
      const local = aArbol(identificarEstado({
        fecha: ed.vm.embarque.fecha, cargaCon: ed.vm.embarque.cargaCon, camionNumero: ed.vm.embarque.camionNumero,
        productos: copiar(ed.vm.embarque.productos), clienteCrudos: copiar(ed.vm.clienteCrudos),
      }));
      const difs = diferencias(arbolServidor, local);
      if (difs.length) {
        divergencias.push({
          editor: ed.i + 1, revLocal: ed.vm._revBase, revServidor: servidor.rev, pendientes: Boolean(ed.vm.hasPendingChanges),
          diferencias: difs.length,
          ejemplos: difs.slice(0, 4).map(d => ({ ruta: d.ruta.join('/'), servidor: d.antes, local: d.despues })),
        });
      }
    });
    const sinPropagar = [...ultimos.values()].filter(ev => !ev.resuelto && cfg.escenario !== 'conflicto')
      .map(ev => ({ editor: ev.editor + 1, celda: ev.clave, valor: ev.valor, faltan: editores.filter(o => o.i !== ev.editor && !ev.vistos.has(o.i)).map(o => o.i + 1) }));
    const respaldos = await firestore.getDocs(firestore.query(
      firestore.collection(editores[0].db, 'respaldos_emergencia'), firestore.where('embarqueOriginalId', '==', id)));

    return {
      config: { editores: cfg.editores, segundos: cfg.segundos, latencia: cfg.latencia, semilla: cfg.semilla, escenario: cfg.escenario },
      ediciones: [...ultimos.values()].length,
      asentado, tiempoAsentarMs: tiempoAsentar, duracionMs: finEdicion - inicio,
      revFinal: servidor.rev,
      transacciones: stats.transacciones, intentosTransaccion: stats.intentosTransaccion,
      // Motor anterior: "Conflicto de revisión" (salía sin escribir). Motor
      // nuevo: cada intento es una transacción; los que sobran son reintentos.
      conflictos: stats.conflictos || Math.max(0, stats.intentosTransaccion - stats.subidasOk),
      fusionesAjenas: stats.fusionesAjenas, subidasOk: stats.subidasOk,
      respaldosEmergencia: respaldos.size,
      avisosConflicto: stats.avisosConflicto,
      latencia: {
        muestras: latencias.length, p50: percentil(latencias, 50), p90: percentil(latencias, 90),
        p99: percentil(latencias, 99), max: latencias.length ? Math.max(...latencias) : 0,
      },
      edicionesPerdidas: perdidas, divergencias, sinPropagar,
      alertas: [...new Set(stats.alertas)], errores: [...new Set(stats.errores)].slice(0, 8),
      ok: asentado && !perdidas.length && !divergencias.length && !sinPropagar.length,
    };
  } finally {
    editores.forEach(ed => {
      try { ed.vm.limpiarConexionesFirestore(); ed.vm.$destroy(); } catch (error) { /* cierre */ }
    });
    await Promise.all(apps.map(app => deleteApp(app).catch(() => {})));
    console.log = consolaReal.log; console.warn = consolaReal.warn; console.error = consolaReal.error;
  }
}

function imprimir(r) {
  const c = r.config;
  console.log(`\n── ${c.escenario}: ${c.editores} editores, ${c.segundos}s, latencia ~${c.latencia}ms, semilla ${c.semilla} ──`);
  console.log(`   ediciones distintas: ${r.ediciones} | rev final: ${r.revFinal} | transacciones: ${r.transacciones} (intentos ${r.intentosTransaccion})`);
  console.log(`   choques entre guardados: ${r.conflictos} | respaldos de emergencia escritos: ${r.respaldosEmergencia} | avisos de conflicto al usuario: ${r.avisosConflicto}`);
  console.log(`   propagación a los demás (ms): p50 ${r.latencia.p50} · p90 ${r.latencia.p90} · p99 ${r.latencia.p99} · máx ${r.latencia.max} (${r.latencia.muestras} muestras)`);
  console.log(`   se asentó: ${r.asentado ? 'sí' : 'NO'} en ${r.tiempoAsentarMs}ms tras dejar de editar`);
  console.log(`   ediciones perdidas: ${r.edicionesPerdidas.length} | editores divergentes: ${r.divergencias.length} | cambios que nunca llegaron: ${r.sinPropagar.length}`);
  r.edicionesPerdidas.slice(0, 5).forEach(p => console.log('     ✖ perdida', JSON.stringify(p)));
  r.divergencias.slice(0, 3).forEach(d => console.log('     ✖ divergencia', JSON.stringify(d)));
  r.sinPropagar.slice(0, 5).forEach(s => console.log('     ✖ sin propagar', JSON.stringify(s)));
  if (r.alertas.length) console.log('   alertas:', JSON.stringify(r.alertas));
  if (r.errores.length) console.log('   errores:', JSON.stringify(r.errores));
  console.log(`   RESULTADO: ${r.ok ? 'OK' : 'FALLA'}`);
}

module.exports = { simular, imprimir };

if (require.main === module) {
  const args = Object.fromEntries(process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : (Number.isNaN(Number(v)) ? v : Number(v))];
  }));
  (async () => {
    const semillas = args.semillas ? String(args.semillas).split(',').map(Number) : [args.semilla || 1];
    let fallas = 0;
    const resumen = [];
    for (const semilla of semillas) {
      const r = await simular({ ...args, semilla });
      imprimir(r);
      resumen.push(r);
      if (!r.ok) fallas += 1;
    }
    if (args.json) require('node:fs').writeFileSync(String(args.json), JSON.stringify(resumen, null, 2));
    console.log(`\n${semillas.length - fallas}/${semillas.length} corridas sin fallas.`);
    process.exit(fallas ? 1 : 0);
  })().catch(error => { consolaReal.error(error); process.exit(2); });
}
