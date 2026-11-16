import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';
import { normalizarFechaISO } from '@/utils/dateUtils';
import { identificarEstado } from '@/utils/embarqueColaboracion';
import { embarqueTieneContenidoOperativoEstado } from '@/utils/embarqueContenido';
import {
  CAMPOS_AJENOS_AL_EDITOR,
  CAMPOS_EDITOR,
  conservarCamposAjenos,
  fotoCampos,
  seleccionarCampos,
} from '@/utils/embarqueRevision';
import { escribirEdicionFusionada, esContencionFirestore } from '@/services/embarqueEscritura';

export const embarqueSyncMixin = {
  data() {
    return { subiendoEnVivo: false, errorSincronizacion: '' };
  },
  beforeDestroy() {
    this._editorCerrado = true;
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
          this._dirtyGen = (Number(this._dirtyGen) || 0) + 1;
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
        // Misma vía transaccional que el guardado en vivo: lee, fusiona con
        // lo que haya guardado otra persona y escribe. Nunca a ciegas.
        await this.subirCambiosEnVivo();

        if (!this.hasPendingChanges) {
          this.mostrarMensaje('Cambios subidos exitosamente a la nube.');
        } else if (this.errorSincronizacion) {
          // La copia local conserva pendingSync y el reintento ya quedó agendado.
          this.mostrarError('No se pudieron subir los cambios: ' + this.errorSincronizacion + ' Se reintentará automáticamente.');
        } else {
          this.mostrarMensaje('Se están subiendo los cambios más recientes...');
        }
      } catch (error) {
        console.error("Error al sincronizar con la nube:", error);
        this.mostrarError('Error al subir los cambios. Verifique su conexión.');
      } finally {
        this.isSyncing = false;
      }
    },

    capturarBaseEditor(data) {
      this._baseCamposEditor = JSON.parse(JSON.stringify(fotoCampos(data || {}, CAMPOS_EDITOR)));
    },

    aplicarCamposAjenos(ajenos) {
      if (!ajenos || !this.embarque) return;
      this._aplicandoRemoto = true;
      if (ajenos.kilosCrudos !== undefined) {
        this.embarque.kilosCrudos = JSON.parse(JSON.stringify(ajenos.kilosCrudos || {}));
      }
      if (ajenos.costosPorMedida !== undefined) {
        this.costosPorMedida = { ...(ajenos.costosPorMedida || {}) };
      }
      if (ajenos.aplicarCostoExtra !== undefined) {
        this.aplicarCostoExtra = { ...(ajenos.aplicarCostoExtra || {}) };
      }
      if (ajenos.costoExtra !== undefined) {
        this.costoExtra = ajenos.costoExtra;
      }
      this.$nextTick(() => {
        this._aplicandoRemoto = false;
      });
    },

    async guardarSnapshotOffline(options = {}) {
      if (!this.embarqueId || this._inicializandoEmbarque) {
        return;
      }

      try {
        await EmbarquesOfflineService.init();
        let docData = options.docData || this.prepararDatosEmbarque();
        const previo = await EmbarquesOfflineService.getById(this.embarqueId).catch(() => null);
        docData = conservarCamposAjenos(docData, previo && previo.docData);
        const snapshot = this.buildOfflineSnapshot(docData);
        const pendingSync = options.pendingSync !== undefined ? options.pendingSync : !navigator.onLine;
        if (snapshot && previo) {
          if (snapshot.camposPendientesRendimientos == null && previo.camposPendientesRendimientos) {
            snapshot.camposPendientesRendimientos = previo.camposPendientesRendimientos;
          }
          if (snapshot.baseCamposRendimientos == null && previo.baseCamposRendimientos) {
            snapshot.baseCamposRendimientos = previo.baseCamposRendimientos;
          }
          if (snapshot.baseCamposEditor == null && previo.baseCamposEditor) {
            snapshot.baseCamposEditor = previo.baseCamposEditor;
          }
          if (snapshot.clavesEnConflicto == null && previo.clavesEnConflicto) {
            snapshot.clavesEnConflicto = previo.clavesEnConflicto;
          }
        }
        if (snapshot) snapshot.pendingEditor = pendingSync;
        if (!snapshot) {
          return;
        }
        await EmbarquesOfflineService.save(snapshot, {
          pendingSync,
          syncState: options.syncState,
          lastSyncError: options.lastSyncError,
        });
      } catch (error) {
        console.error('[guardarSnapshotOffline] Error al guardar snapshot offline:', error);
        this.hasPendingChanges = true;
        alert('No se pudo guardar en este equipo. No cierres esta ventana. ' + error.message);
        throw error;
      }
    },

    async cargarEmbarqueOffline(id) {
      try {
        await EmbarquesOfflineService.init();
        const record = await EmbarquesOfflineService.getById(id);
        if (!record || record.deleted) {
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

      // Generación de cambios locales: cada edición avanza el contador. Las
      // subidas capturan la generación al armar su payload y solo declaran
      // "sin pendientes" si nadie tecleó mientras la escritura viajaba.
      this._dirtyGen = (Number(this._dirtyGen) || 0) + 1;
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
      if (this._editorCerrado) return;
      // La escritura continua no reinicia el reloj: las teclas se agrupan
      // durante 400–500 ms y salen juntas en una sola escritura.
      const retraso = retrasoMs || (400 + Math.floor(Math.random() * 100));
      if (this._timerSubidaEnVivo) {
        if (!retrasoMs) return;
        clearTimeout(this._timerSubidaEnVivo);
      }
      this._timerSubidaEnVivo = setTimeout(() => {
        this._timerSubidaEnVivo = null;
        this.subirCambiosEnVivo();
      }, retraso);
    },

    /**
     * Sube los cambios locales a Firestore.
     *
     * La fusión ocurre DENTRO de la transacción (escribirEdicionFusionada):
     * se lee el documento, se combinan de tres vías la base, lo local y lo
     * que haya guardado otra persona, y se escribe el resultado ahí mismo.
     * Antes, un cruce de guardados salía de la transacción sin escribir,
     * esperaba otro ciclo y volvía a chocar; con tres personas capturando un
     * cambio tardaba 10–30 s en llegar a las demás pantallas.
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
      this.subiendoEnVivo = true;
      this.errorSincronizacion = '';
      const idCapturado = this.embarqueId;
      let reintentarEn = 0;
      let reintentar = true;

      try {
        const db = getFirestore();
        const meta = {
          ultimaEdicion: {
            userId: this.authStore.userId,
            username: this.authStore.user?.username || 'Usuario desconocido',
            timestamp: serverTimestamp(),
          },
        };
        const resultado = await escribirEdicionFusionada(db, idCapturado, {
          meta,
          // Se captura en cada intento: un reintento por contención manda lo
          // que hay en pantalla en ese momento, no una foto vieja.
          capturar: () => {
            if (this._editorCerrado || this.embarqueId !== idCapturado) {
              const cancelada = new Error('Subida cancelada: el editor cambió de embarque.');
              cancelada.code = 'subida-cancelada';
              throw cancelada;
            }
            // Copia CONGELADA: prepararDatosEmbarque comparte los arreglos de
            // kilos/taras con el estado vivo.
            const completo = JSON.parse(JSON.stringify(this.prepararDatosEmbarque()));
            return {
              gen: Number(this._dirtyGen) || 0,
              completo,
              // El editor no reescribe kilos, ganancias, costos ni fletes.
              local: seleccionarCampos(completo, CAMPOS_EDITOR),
              base: this._baseCamposEditor ? JSON.parse(JSON.stringify(this._baseCamposEditor)) : null,
              revBase: Number(this._revBase) || 0,
              // Un respaldo por conflicto real, como mucho uno cada 20 s: dos
              // personas peleando la misma celda no deben llenar la colección.
              respaldar: !this._ultimoRespaldoConflicto || Date.now() - this._ultimoRespaldoConflicto >= 20000,
            };
          },
        });

        if (this._editorCerrado || this.embarqueId !== idCapturado) return;
        await this.adoptarSubida(idCapturado, resultado);
        this._fallosSubida = 0;
      } catch (error) {
        if (error && error.code === 'subida-cancelada') return;
        if (esContencionFirestore(error)) {
          // Varias personas guardando a la vez agotaron los reintentos
          // inmediatos. No es un error que mostrar: los cambios siguen en
          // este equipo y se vuelve a intentar enseguida.
          console.warn('[subirCambiosEnVivo] Mucha concurrencia; se reintenta enseguida.');
          reintentarEn = 150 + Math.floor(Math.random() * 350);
          return;
        }
        this.errorSincronizacion = error.message || 'No se pudo sincronizar';
        console.error('[subirCambiosEnVivo] Error al subir cambios:', error);
        if (error && error.code === 'embarque-eliminado') {
          // No se recrea solo: la copia local se conserva para recuperarla.
          reintentar = false;
        } else {
          // NUNCA quedarse atorado con cambios pendientes: reintentar con
          // espera creciente (1, 2, 4… hasta 15 s).
          this._fallosSubida = (this._fallosSubida || 0) + 1;
          reintentarEn = Math.min(15000, 1000 * Math.pow(2, this._fallosSubida - 1)) + Math.floor(Math.random() * 500);
        }
      } finally {
        const vigente = !this._editorCerrado && this.embarqueId === idCapturado;
        // Lo que llegó mientras la subida viajaba se aplica ahora, sobre la
        // base correcta. Antes se descartaba y esta pantalla se quedaba con
        // datos viejos hasta que alguien volviera a guardar.
        const diferido = this._snapshotRemotoDiferido;
        this._snapshotRemotoDiferido = null;
        if (vigente && diferido) {
          const revDiferida = Number(diferido.rev) || 0;
          if (revDiferida === 0 || revDiferida > (Number(this._revBase) || 0)) {
            try {
              await this.aplicarDocRemoto(idCapturado, diferido);
            } catch (error) {
              console.error('[subirCambiosEnVivo] No se pudo aplicar el snapshot diferido:', error);
            }
          }
        }
        this._subiendoEnVivo = false;
        this.subiendoEnVivo = false;
        this._resubirAlTerminar = false;
        if (vigente && reintentar && this.hasPendingChanges && navigator.onLine) {
          this.programarSubidaEnVivo(reintentarEn || undefined);
        }
      }
    },

    /**
     * Adopta el resultado de una subida confirmada: nueva revisión, nueva
     * base y, si alguien más había guardado, sus cambios en pantalla.
     */
    async adoptarSubida(id, resultado) {
      const { captura, documento, fusion } = resultado;
      const huboTeclasEnVuelo = (Number(this._dirtyGen) || 0) !== captura.gen;
      if (fusion.omitidas) {
        if (resultado.respaldado) this._ultimoRespaldoConflicto = Date.now();
        this.avisarCamposEnConflicto(fusion.omitidas);
      }

      if (resultado.remotoIgualABase) {
        // Nadie más escribió: lo que hay en pantalla ya es lo del servidor
        // (más las teclas escritas mientras la subida viajaba).
        this._revBase = resultado.rev;
        this.capturarBaseEditor(documento);
        this.aplicarCamposAjenos(seleccionarCampos(documento, CAMPOS_AJENOS_AL_EDITOR));
        if (huboTeclasEnVuelo) {
          await this.guardarSnapshotOffline({ pendingSync: true });
        } else {
          this.hasPendingChanges = false;
          await this.guardarSnapshotOffline({ pendingSync: false, syncState: 'synced', docData: captura.completo });
        }
      } else {
        // Había cambios de otra persona. La base de esta fusión es lo que se
        // mandó (captura.local): lo tecleado durante el viaje se conserva
        // encima, y no se revierte a lo que se envió.
        await this.aplicarDocRemoto(id, documento, { baseFusion: captura.local, habiaPendientes: huboTeclasEnVuelo });
      }
      // Un embarque recién creado en esta ventana aún no escucha al servidor.
      if (!this.unsubscribe && typeof this.suscribirEmbarque === 'function' && navigator.onLine) {
        this.suscribirEmbarque(id);
      }
      console.log('[subirCambiosEnVivo] Cambios sincronizados con la nube (rev', resultado.rev + ').');
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
      identificarEstado({ ...this.embarque, clienteCrudos: this.clienteCrudos }, this.$set);
      // Lápidas de borrado: registro de productos eliminados para que los
      // demás editores en vivo los quiten en lugar de "preservarlos" como si
      // fueran productos nuevos del otro lado. Se conservan para identificar restauraciones.
      const productosEliminados = { ...(this._productosEliminadosDoc || {}) };
      const ahora = Date.now();
      if (this.productosEliminadosLocalmente) {
        this.productosEliminadosLocalmente.forEach((idProducto) => {
          if (!productosEliminados[idProducto]) {
            productosEliminados[idProducto] = ahora;
          }
        });
      }
      this._productosEliminadosDoc = productosEliminados;

      const embarqueData = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        camionNumero: this.embarque.camionNumero || 1,
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

      // Serializar nunca crea productos: deshacer el último alta debe dejar
      // el cliente vacío, sin introducir otra fila fuera del historial.
      const porCliente = { ...this.productosPorCliente };
      Object.keys(this.clienteCrudos || {}).forEach(id => { if (!porCliente[id]) porCliente[id] = []; });
      Object.entries(porCliente).forEach(([clienteId, productos]) => {
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
