import { getFirestore, doc, setDoc, getDoc, serverTimestamp, deleteDoc, runTransaction } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';
import BackupService from '../BackupService.js';
import { normalizarFechaISO, normalizarFechaValor, obtenerFechaActualISO } from '@/utils/dateUtils';
import { crearNuevoProducto } from '@/constants.js/embarque';
import { embarqueTieneContenidoOperativoEstado, serializarEstable } from '@/utils/embarqueContenido';

/**
 * Normaliza los datos de un embarque para escribirlos en Firestore.
 * Contiene la UNIÓN completa de los campos que manejan los distintos caminos
 * de sincronización (NuevoEmbarque y ListaEmbarques) para que ninguno borre
 * campos que el otro sí conserva al reescribir el documento completo.
 *
 * @param {Object} docData - Datos crudos del embarque (docData del snapshot offline).
 * @param {Object} record - Registro offline completo (fallback de campos).
 * @param {Object} contexto - { dataRemota, costoExtraDefault, fechaDefault }.
 */
export function normalizarDocDataParaFirestore(docData, record = {}, contexto = {}) {
  const dataCruda = docData ? JSON.parse(JSON.stringify(docData)) : {};

  const parseFecha = (valor) => normalizarFechaValor(valor) || obtenerFechaActualISO();

  const pickConRemoto = (key) => {
    if (dataCruda[key] !== undefined && dataCruda[key] !== null) return dataCruda[key];
    if (record && record[key] !== undefined && record[key] !== null) return record[key];
    const remoto = contexto.dataRemota;
    if (remoto && remoto[key] !== undefined && remoto[key] !== null) return remoto[key];
    return undefined;
  };

  const data = {
    cargaCon: dataCruda.cargaCon || record.cargaCon || '',
    camionNumero: dataCruda.camionNumero || record.camionNumero || 1,
    kilosCrudos: dataCruda.kilosCrudos || record.kilosCrudos || {},
    clientes: Array.isArray(dataCruda.clientes)
      ? dataCruda.clientes
      : (Array.isArray(record.clientes) ? record.clientes : []),
    clientesJuntarMedidas: dataCruda.clientesJuntarMedidas || record.clientesJuntarMedidas || {},
    clientesReglaOtilio: dataCruda.clientesReglaOtilio || record.clientesReglaOtilio || {},
    clientesIncluirPrecios: dataCruda.clientesIncluirPrecios || record.clientesIncluirPrecios || {},
    clientesCuentaEnPdf: dataCruda.clientesCuentaEnPdf || record.clientesCuentaEnPdf || {},
    clientesSumarKgCatarro: dataCruda.clientesSumarKgCatarro || record.clientesSumarKgCatarro || {},
    clientesPersonalizados: Array.isArray(dataCruda.clientesPersonalizados)
      ? dataCruda.clientesPersonalizados
      : (Array.isArray(record.clientesPersonalizados) ? record.clientesPersonalizados : []),
    embarqueBloqueado: Boolean(record.embarqueBloqueado ?? dataCruda.embarqueBloqueado ?? false),
    noEnviadoMexico: Boolean(pickConRemoto('noEnviadoMexico') ?? false),
    costosPorMedida: dataCruda.costosPorMedida || record.costosPorMedida || {},
    aplicarCostoExtra: dataCruda.aplicarCostoExtra || record.aplicarCostoExtra || {},
    costoExtra: typeof dataCruda.costoExtra === 'number'
      ? dataCruda.costoExtra
      : (typeof record.costoExtra === 'number' ? record.costoExtra : (contexto.costoExtraDefault || 18)),
    medidasConfiguracion: Array.isArray(dataCruda.medidasConfiguracion)
      ? dataCruda.medidasConfiguracion
      : (Array.isArray(record.medidasConfiguracion) ? record.medidasConfiguracion : []),
    preciosActuales: Array.isArray(dataCruda.preciosActuales)
      ? dataCruda.preciosActuales
      : (Array.isArray(record.preciosActuales) ? record.preciosActuales : []),
    medidaOculta: dataCruda.medidaOculta || record.medidaOculta || {},
    analizarGanancia: dataCruda.analizarGanancia || record.analizarGanancia || {},
    analizarGananciaCrudos: dataCruda.analizarGananciaCrudos || record.analizarGananciaCrudos || {},
    analizarMaquilaGanancia: dataCruda.analizarMaquilaGanancia || record.analizarMaquilaGanancia || {},
    precioMaquila: dataCruda.precioMaquila || record.precioMaquila || {},
    pesoTaraCosto: typeof dataCruda.pesoTaraCosto === 'number' ? dataCruda.pesoTaraCosto : (record.pesoTaraCosto ?? 19),
    pesoTaraVenta: typeof dataCruda.pesoTaraVenta === 'number' ? dataCruda.pesoTaraVenta : (record.pesoTaraVenta ?? 20),
    nombresMedidasPersonalizados: dataCruda.nombresMedidasPersonalizados || record.nombresMedidasPersonalizados || {},
    notaRendimientos: dataCruda.notaRendimientos || record.notaRendimientos || '',
    fecha: parseFecha(dataCruda.fecha || record.fecha || contexto.fechaDefault),
  };

  // Campos del flujo del editor: conservarlos si existen local o remotamente
  // para no borrarlos al reescribir el documento completo con setDoc.
  ['borrador'].forEach((key) => {
    const valor = pickConRemoto(key);
    if (valor !== undefined) {
      data[key] = valor;
    }
  });

  // Campos que otras vistas escriben DIRECTO en Firestore sin pasar por el
  // espejo offline: Rendimientos (totalGanancias, rendimientoManual) y Cuenta
  // de Fletes (fletePagado, fletePagos, fletePagoActualizado*). Para estos, el
  // valor remoto SIEMPRE es el más fresco — el espejo offline puede traer una
  // copia vieja que revertiría pagos de fletes ya marcados. Preferir
  // remoto → snapshot local → record; omitirlos borraba las marcas de pago en
  // cada sincronización y los fletes viejos volvían a aparecer "pendientes".
  const pickPreferRemoto = (key) => {
    const remoto = contexto.dataRemota;
    if (remoto && remoto[key] !== undefined && remoto[key] !== null) return remoto[key];
    return pickConRemoto(key);
  };
  [
    'totalGanancias',
    'rendimientoManual',
    'fletePagado',
    'fletePagos',
    'fletePagoActualizadoEn',
    'fletePagoActualizadoPor'
  ].forEach((key) => {
    const valor = pickPreferRemoto(key);
    if (valor !== undefined) {
      data[key] = valor;
    }
  });

  // Señal de cambio para los editores en vivo: cada sincronización cuenta
  // como una revisión nueva sobre lo remoto.
  data.rev = (Number(pickPreferRemoto('rev')) || 0) + 1;

  // Lápidas de borrado de productos: unión de lo local y lo remoto para que
  // una sincronización no reviva productos borrados por otro editor.
  data.productosEliminados = {
    ...((contexto.dataRemota && contexto.dataRemota.productosEliminados) || {}),
    ...(dataCruda.productosEliminados || record.productosEliminados || {})
  };

  data.clientes = data.clientes.map(cliente => ({
    ...cliente,
    productos: Array.isArray(cliente.productos) ? cliente.productos.map(producto => ({
      ...producto,
      restarTaras: producto.restarTaras || false,
      noSumarKilos: producto.noSumarKilos || false,
    })) : [],
    crudos: Array.isArray(cliente.crudos) ? cliente.crudos : [],
  }));

  // Colaboración: este payload se escribe con setDoc(merge:false), y el
  // registro offline puede estar REZAGADO respecto al documento remoto. Los
  // productos que otros editores agregaron después y que no tienen lápida se
  // conservan (unión por id) — sin esto, sincronizar un registro viejo
  // borraba el trabajo ajeno.
  const remotoColab = contexto.dataRemota;
  if (remotoColab && Array.isArray(remotoColab.clientes)) {
    const idsEnPayload = new Set();
    data.clientes.forEach((cliente) => {
      (Array.isArray(cliente.productos) ? cliente.productos : []).forEach((producto) => {
        if (producto && producto.id) idsEnPayload.add(producto.id);
      });
    });
    const lapidas = data.productosEliminados || {};

    remotoColab.clientes.forEach((clienteRemoto) => {
      const productosFaltantes = (Array.isArray(clienteRemoto.productos) ? clienteRemoto.productos : [])
        .filter((producto) => producto && producto.id &&
          !idsEnPayload.has(producto.id) && !lapidas[producto.id]);
      if (productosFaltantes.length === 0) return;

      const clienteDestino = data.clientes.find(c => String(c.id) === String(clienteRemoto.id));
      if (clienteDestino) {
        clienteDestino.productos = [...(clienteDestino.productos || []), ...productosFaltantes];
      } else {
        data.clientes.push({
          ...clienteRemoto,
          productos: productosFaltantes,
          crudos: Array.isArray(clienteRemoto.crudos) ? clienteRemoto.crudos : []
        });
      }
    });
  }

  return data;
}

export const embarqueSyncMixin = {
  beforeDestroy() {
    if (this._timerSubidaEnVivo) {
      clearTimeout(this._timerSubidaEnVivo);
      this._timerSubidaEnVivo = null;
    }
  },
  methods: {
    async guardarEmbarqueInicial(clienteId) {
      const modalAbierto = this.mostrarModalPrecio ||
                          this.mostrarModalHilos ||
                          this.mostrarModalNota ||
                          this.mostrarModalAlt ||
                          this.mostrarModalNombreAlternativo ||
                          this.mostrarModalNuevoCliente;

      if (modalAbierto) {
        return null;
      }

      if (!this.embarqueId && this._guardandoInicial) {
        console.warn('Guardado inicial automático aún en progreso. Esperando para agregar cliente/producto.');
        return null;
      }

      if (this._creandoEmbarque) {
        console.warn('Ya hay una operación de creación de embarque en curso');
        return null;
      }

      this._creandoEmbarque = true;

      try {
        if (!this.embarqueId) {
          const fechaISO = normalizarFechaISO(this.embarque.fecha);
          this.embarque.camionNumero = await this.obtenerCamionNumeroParaFecha(fechaISO);
          const embarqueData = this.prepararDatosEmbarque();

          this.embarqueId = uuidv4();
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;
          this.hasPendingChanges = true;

          await EmbarquesOfflineService.init();
          await this.guardarSnapshotOffline({ pendingSync: true, docData: embarqueData, syncState: 'pending-create' });

          if (clienteId) {
            this.agregarProducto(clienteId);
            this.clienteActivo = clienteId;
          }

          this._creandoEmbarque = false;
          return this.embarqueId;
        } else {
          if (clienteId) {
            this.agregarProducto(clienteId);
            this.clienteActivo = clienteId;
          }
          this._creandoEmbarque = false;
          return this.embarqueId;
        }
      } catch (e) {
        this._creandoEmbarque = false;
        console.error('[LOG] Error al crear el embarque localmente:', e);
        alert('Hubo un error al crear el embarque. Por favor, intente de nuevo.');
        return null;
      }
    },

    async sincronizarConNube() {
      if (this.isSyncing) {
        console.warn('[sincronizarConNube] Sincronización ya en curso, se omite la llamada duplicada.');
        return;
      }

      if (!this.hasPendingChanges) {
        this.mostrarMensaje('No hay cambios pendientes para subir.');
        return;
      }

      if (!navigator.onLine) {
        this.mostrarError('No hay conexión a internet para sincronizar.');
        return;
      }

      this.isSyncing = true;

      try {
        // Misma vía transaccional que el guardado en vivo: verifica la
        // revisión y fusiona si alguien más guardó primero. La versión
        // anterior escribía el documento completo A CIEGAS (updateDoc sin
        // transacción): al salir de la página con cambios pendientes
        // rezagados, pisaba el trabajo de los demás editores.
        await this.subirCambiosEnVivo();

        if (!this.hasPendingChanges) {
          this.mostrarMensaje('Cambios subidos exitosamente a la nube.');
        } else {
          // Hubo conflicto: ya se fusionó lo remoto y la resubida quedó
          // agendada; el espejo offline conserva pendingSync como respaldo.
          this.mostrarMensaje('Se fusionaron cambios de otra persona; subiendo la versión combinada...');
        }
      } catch (error) {
        console.error("Error al sincronizar con la nube:", error);
        this.mostrarError('Error al subir los cambios. Verifique su conexión.');
      } finally {
        this.isSyncing = false;
      }
    },

    async guardarSnapshotOffline(options = {}) {
      if (!this.embarqueId || this._inicializandoEmbarque) {
        return;
      }

      try {
        await EmbarquesOfflineService.init();
        const snapshot = this.buildOfflineSnapshot(options.docData);
        if (!snapshot) {
          return;
        }
        const pendingSync = options.pendingSync !== undefined ? options.pendingSync : !navigator.onLine;
        await EmbarquesOfflineService.save(snapshot, {
          pendingSync,
          syncState: options.syncState,
          lastSyncError: options.lastSyncError,
        });
      } catch (error) {
        console.error('[guardarSnapshotOffline] Error al guardar snapshot offline:', error);
      }
    },

    async cargarEmbarqueOffline(id) {
      try {
        await EmbarquesOfflineService.init();
        const record = await EmbarquesOfflineService.getById(id);
        if (!record) {
          console.log('[DEBUG-OFFLINE] No se encontró registro offline para ID:', id);
          return false;
        }
        console.log('[DEBUG-OFFLINE] Registro offline encontrado para ID:', id);
        console.log('[DEBUG-OFFLINE] Fecha en registro offline:', record.fecha);
        console.log('[DEBUG-OFFLINE] Total productos en offline:', record.productos?.length || 0);
        this.aplicarSnapshotOffline(record);
        return true;
      } catch (error) {
        console.error('[cargarEmbarqueOffline] No se pudo cargar el embarque offline:', error);
        return false;
      }
    },

    async sincronizarRegistroOffline(record) {
      if (!record || !record.id) {
        return;
      }

      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', record.id);
        const docData = record.docData || (record.id === this.embarqueId ? this.prepararDatosEmbarque() : null);

        const metadataUltimaEdicion = {
          userId: this.authStore.userId,
          username: this.authStore.user?.username || 'Usuario desconocido',
          timestamp: serverTimestamp()
        };

        const snapshot = await getDoc(embarqueRef);
        const dataRemota = snapshot.exists() ? (snapshot.data() || {}) : null;

        if (record.deleted && record.deletedByUser) {
          if (snapshot.exists()) {
            // Respaldo de emergencia ANTES de borrar en la nube; si falla,
            // el error se propaga y el registro queda pendiente para reintentar.
            await BackupService.crearRespaldoEmergencia(record.id, 'eliminacion_offline_sincronizada');
            await deleteDoc(embarqueRef);
          }
          await EmbarquesOfflineService.hardDelete(record.id);
          return;
        }

        const payload = normalizarDocDataParaFirestore(docData || this.prepararDatosEmbarque(), record, {
          dataRemota,
          costoExtraDefault: this.costoExtra,
          fechaDefault: this.embarque.fecha,
        });

        const dataParaFirestore = {
          ...(dataRemota && this.tieneContenidoOperativo(dataRemota) && !this.tieneContenidoOperativo(payload)
            ? {
                ...payload,
                clientes: Array.isArray(dataRemota.clientes) ? dataRemota.clientes : [],
                kilosCrudos: dataRemota.kilosCrudos || payload.kilosCrudos || {},
                cargaCon: payload.cargaCon || dataRemota.cargaCon || '',
                camionNumero: payload.camionNumero || dataRemota.camionNumero || 1
              }
            : payload),
          ultimaEdicion: metadataUltimaEdicion
        };

        if (snapshot.exists()) {
          await setDoc(embarqueRef, dataParaFirestore, { merge: false });
        } else {
          await setDoc(embarqueRef, dataParaFirestore);
        }

        await EmbarquesOfflineService.markSynced(record.id);

        if (record.id === this.embarqueId) {
          this.guardadoAutomaticoActivo = true;
          this.modoEdicion = true;
          // El embarque abierto acaba de subirse: ya no hay cambios locales
          // pendientes y nuestra base es la revisión recién escrita. Sin este
          // reset, hasPendingChanges quedaba en true para siempre y TODOS los
          // snapshots remotos se diferían: la otra sesión dejaba de reflejarse
          // hasta la siguiente edición local.
          this.hasPendingChanges = false;
          this._revBase = Number(dataParaFirestore.rev) || Number(this._revBase) || 0;
          this._snapshotRemotoDiferido = null;
          this._productosBase = new Map(
            (this.embarque.productos || []).map(p => [
              p.id,
              { obj: JSON.parse(JSON.stringify(p)), str: serializarEstable(p) }
            ])
          );
        }
      } catch (error) {
        console.error('[sincronizarRegistroOffline] Error al sincronizar embarque offline:', error);
        try {
          await EmbarquesOfflineService.markSyncError(record.id, error.message || error);
        } catch (markError) {
          console.warn('[sincronizarRegistroOffline] No se pudo marcar el error de sincronización:', markError);
        }
      }
    },

    async guardarCambiosEnTiempoReal(forzar = false, opciones = {}) {
      const {
        desdeModal = false,
        immediate = false,
        merge = true
      } = opciones;

      if (!forzar && (!this.guardadoAutomaticoActivo || !this.embarqueId ||
          this.mostrarModalPrecio || this.mostrarModalHilos ||
          this.mostrarModalNota || this.mostrarModalAlt ||
          this.mostrarModalNombreAlternativo || this.mostrarModalNuevoCliente)) {
        if (!desdeModal) return Promise.resolve();
      }

      this.hasPendingChanges = true;
      await this.guardarSnapshotOffline({ pendingSync: true });

      this.$emit('guardado-automatico');

      // Edición colaborativa: subir automáticamente a la nube para que otros
      // editores vean los cambios en vivo (sin esperar al botón de subir).
      if (navigator.onLine) {
        if (immediate) {
          this.subirCambiosEnVivo();
        } else {
          this.programarSubidaEnVivo();
        }
      }
      return Promise.resolve();
    },

    programarSubidaEnVivo(retrasoMs) {
      // Jitter: si dos sesiones agendan la subida con la misma cadencia fija,
      // chocan sincronizadas en conflictos una y otra vez.
      const retraso = retrasoMs || (1500 + Math.floor(Math.random() * 700));
      if (this._timerSubidaEnVivo) {
        clearTimeout(this._timerSubidaEnVivo);
      }
      this._timerSubidaEnVivo = setTimeout(() => {
        this._timerSubidaEnVivo = null;
        this.subirCambiosEnVivo();
      }, retraso);
    },

    /**
     * Sube los cambios locales a Firestore con control de revisiones para
     * edición colaborativa: la escritura solo procede si nadie más guardó
     * desde la última revisión que aplicamos (campo `rev`). Si otra persona
     * guardó primero, NO se pisa su trabajo: se fusiona el documento remoto
     * al estado local (aplicarDocRemoto protege lo que se está editando) y
     * se reintenta la subida con el estado fusionado.
     */
    async subirCambiosEnVivo() {
      if (!this.embarqueId || !this.hasPendingChanges || !navigator.onLine) {
        return;
      }
      if (this._subiendoEnVivo) {
        this._resubirAlTerminar = true;
        return;
      }
      this._subiendoEnVivo = true;

      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', this.embarqueId);
        const payload = {
          ...this.prepararDatosEmbarque(),
          ultimaEdicion: {
            userId: this.authStore.userId,
            username: this.authStore.user?.username || 'Usuario desconocido',
            timestamp: serverTimestamp()
          }
        };

        let dataConflicto = null;
        let revEscrita = null;

        await runTransaction(db, async (transaction) => {
          dataConflicto = null;
          const snapshot = await transaction.get(embarqueRef);

          if (!snapshot.exists()) {
            revEscrita = (Number(this._revBase) || 0) + 1;
            transaction.set(embarqueRef, { ...payload, rev: revEscrita });
            return;
          }

          const revRemota = Number(snapshot.data().rev) || 0;
          if (revRemota !== (Number(this._revBase) || 0)) {
            // Alguien más guardó desde nuestra base: no escribir nada.
            dataConflicto = snapshot.data();
            return;
          }

          revEscrita = revRemota + 1;
          // update (no set): conserva campos que otras vistas escriben en el
          // mismo documento (fletePagos, totalGanancias, etc.).
          transaction.update(embarqueRef, { ...payload, rev: revEscrita });
        });

        if (dataConflicto) {
          this._reintentosSubidaEnVivo = (this._reintentosSubidaEnVivo || 0) + 1;
          if (this._reintentosSubidaEnVivo > 4) {
            // NUNCA abandonar cambios pendientes: si el otro editor está
            // tecleando sin parar, esperar más largo y volver a intentar.
            // (Antes se esperaba "al próximo cambio local", que podía no
            // llegar nunca — un borrado quedaba sin subir para siempre.)
            console.warn('[subirCambiosEnVivo] Muchos conflictos seguidos; reintentando con espera más larga.');
            this._reintentosSubidaEnVivo = 0;
            this.programarSubidaEnVivo(6000 + Math.floor(Math.random() * 3000));
            return;
          }
          console.log('[subirCambiosEnVivo] Conflicto de revisión: fusionando cambios remotos antes de subir.');
          // hasPendingChanges se queda en true durante la fusión: cualquier
          // snapshot que llegue en medio se difiere en vez de aplicarse encima.
          this._snapshotRemotoDiferido = null;
          await this.aplicarDocRemoto(this.embarqueId, dataConflicto);
          await this.guardarSnapshotOffline({ pendingSync: true });
          this.programarSubidaEnVivo();
          return;
        }

        this._revBase = revEscrita;
        this._reintentosSubidaEnVivo = 0;
        this.hasPendingChanges = false;
        this._snapshotRemotoDiferido = null;
        // El estado local acaba de subirse tal cual: es la nueva base
        // sincronizada para la fusión de 3 vías de productos.
        this._productosBase = new Map(
          (this.embarque.productos || []).map(p => [
            p.id,
            { obj: JSON.parse(JSON.stringify(p)), str: serializarEstable(p) }
          ])
        );
        await this.guardarSnapshotOffline({ pendingSync: false, syncState: 'synced' });
        console.log('[subirCambiosEnVivo] Cambios sincronizados con la nube (rev', revEscrita + ').');
      } catch (error) {
        console.error('[subirCambiosEnVivo] Error al subir cambios:', error);
        // NUNCA quedarse atorado con cambios pendientes: si seguimos en
        // línea, reintentar con espera. (Quedarse esperando "el próximo
        // cambio local" dejaba la sesión difiriendo todos los snapshots
        // remotos indefinidamente: dejaba de ver al otro editor.)
        if (navigator.onLine && this.hasPendingChanges) {
          this.programarSubidaEnVivo(5000 + Math.floor(Math.random() * 3000));
        }
      } finally {
        this._subiendoEnVivo = false;
        if (this._resubirAlTerminar) {
          this._resubirAlTerminar = false;
          this.programarSubidaEnVivo();
        }
      }
    },

    async guardarEmbarque() {
      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      const modalAbierto = this.mostrarModalPrecio ||
                          this.mostrarModalHilos ||
                          this.mostrarModalNota ||
                          this.mostrarModalAlt ||
                          this.mostrarModalNombreAlternativo ||
                          this.mostrarModalNuevoCliente;

      if (modalAbierto) {
        return;
      }

      try {
        await this.guardarCambiosEnTiempoReal(true);
        this.mostrarMensaje(navigator.onLine
          ? 'Embarque guardado. Los cambios se sincronizan automáticamente con la nube.'
          : 'Embarque guardado localmente. Se subirá a la nube al recuperar la conexión.');
      } catch (error) {
        console.error("Error al guardar localmente:", error);
        alert('Error al guardar localmente.');
      }
    },

    prepararDatosEmbarque() {
      // Lápidas de borrado: registro de productos eliminados para que los
      // demás editores en vivo los quiten en lugar de "preservarlos" como si
      // fueran productos nuevos del otro lado. Se depuran a los 7 días.
      const productosEliminados = { ...(this._productosEliminadosDoc || {}) };
      const ahora = Date.now();
      if (this.productosEliminadosLocalmente) {
        this.productosEliminadosLocalmente.forEach((idProducto) => {
          if (!productosEliminados[idProducto]) {
            productosEliminados[idProducto] = ahora;
          }
        });
      }
      Object.keys(productosEliminados).forEach((idProducto) => {
        if (ahora - Number(productosEliminados[idProducto] || 0) > 7 * 24 * 60 * 60 * 1000) {
          delete productosEliminados[idProducto];
        }
      });
      this._productosEliminadosDoc = productosEliminados;

      const embarqueData = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        camionNumero: this.embarque.camionNumero || 1,
        kilosCrudos: this.embarque.kilosCrudos || {},
        productosEliminados,
        clientes: [],
        borrador: !embarqueTieneContenidoOperativoEstado({
          cargaCon: this.embarque?.cargaCon,
          productos: this.embarque?.productos,
          clienteCrudos: this.clienteCrudos,
        }),
        clientesJuntarMedidas: this.clientesJuntarMedidas,
        clientesReglaOtilio: this.clientesReglaOtilio,
        clientesIncluirPrecios: this.clientesIncluirPrecios,
        clientesCuentaEnPdf: this.clientesCuentaEnPdf,
        clientesSumarKgCatarro: this.clientesSumarKgCatarro,
        clientesPersonalizados: this.clientesPersonalizados,
        embarqueBloqueado: this.embarqueBloqueado
      };

      const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id.toString(), c]));

      if (Object.keys(this.productosPorCliente).length === 0 && this.clientesPredefinidos.length > 0) {
        const primerClienteId = this.clientesPredefinidos[0].id.toString();
        const primerCliente = this.clientesPredefinidos[0];
        const nuevoProducto = crearNuevoProducto(primerClienteId);
        nuevoProducto.nombreCliente = primerCliente.nombre;
        this.embarque.productos.push(nuevoProducto);
        this.clienteActivo = primerClienteId;
        this.$forceUpdate();
      }

      const clientesDisponiblesIds = this.clientesDisponibles
        .filter(c => c.id !== 'otro')
        .map(c => c.id.toString());

      clientesDisponiblesIds.forEach(clienteId => {
        const existeProducto = this.embarque.productos.some(p => p.clienteId.toString() === clienteId);
        if (!existeProducto) {
          const clienteInfo = clientesPredefinidosMap.get(clienteId) ||
                              this.clientesDisponibles.find(c => c.id.toString() === clienteId);
          if (clienteInfo) {
            const nuevoProducto = crearNuevoProducto(clienteId);
            nuevoProducto.nombreCliente = clienteInfo.nombre;
            this.setTipoDefaultParaCliente(nuevoProducto);
            this.embarque.productos.push(nuevoProducto);
            console.log(`Se ha creado un producto para el cliente ${nuevoProducto.nombreCliente} que no tenía ninguno.`);
          }
        }
      });

      Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
        const clientePredefinido = clientesPredefinidosMap.get(clienteId);
        const crudosCliente = this.clienteCrudos[clienteId] || [];
        const clienteData = {
          id: clienteId,
          nombre: clientePredefinido ? clientePredefinido.nombre : this.obtenerNombreCliente(clienteId),
          productos: productos.map(producto => ({
            ...producto,
            restarTaras: producto.restarTaras || false,
            noSumarKilos: producto.noSumarKilos || false
          })),
          crudos: crudosCliente
        };
        embarqueData.clientes.push(clienteData);
      });

      return embarqueData;
    },
  },
};
