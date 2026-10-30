import { getFirestore, collection, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
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
  planearEscritura,
  seleccionarCampos,
} from '@/utils/embarqueRevision';

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
      // La escritura continua no reinicia el reloj. Agrupar las teclas
      // durante 500–650 ms; la red y los conflictos pueden demorar el envío.
      const retraso = retrasoMs || (500 + Math.floor(Math.random() * 150));
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
      this.subiendoEnVivo = true;
      this.errorSincronizacion = '';

      try {
        const db = getFirestore();
        const idCapturado = this.embarqueId;
        const revCapturada = Number(this._revBase) || 0;
        const embarqueRef = doc(db, 'embarques', idCapturado);
        // Generación vigente al capturar el payload: si el usuario sigue
        // tecleando mientras la transacción viaja a Firestore, la generación
        // avanza y el estado NO puede declararse sincronizado al confirmar
        // (esas teclas no van en este payload).
        const genCapturada = Number(this._dirtyGen) || 0;
        // Copia CONGELADA del estado a subir. prepararDatosEmbarque copia los
        // productos de forma superficial y sus arrays (kilos/taras) quedaban
        // compartidos con el estado vivo: las teclas escritas durante la
        // transacción se colaban a medias en la escritura y en la base.
        const docData = JSON.parse(JSON.stringify(this.prepararDatosEmbarque()));
        // El editor no reescribe kilos, ganancias, costos ni fletes: si lo
        // hiciera con la copia que tenía al abrir, desharía Rendimientos.
        const payloadEditor = seleccionarCampos(docData, CAMPOS_EDITOR);
        const baseEditor = this._baseCamposEditor
          ? JSON.parse(JSON.stringify(this._baseCamposEditor))
          : null;
        const ultimaEdicion = {
          userId: this.authStore.userId,
          username: this.authStore.user?.username || 'Usuario desconocido',
          timestamp: serverTimestamp()
        };

        const respaldoConflicto = doc(collection(db, 'respaldos_emergencia'));
        let dataConflicto = null;
        let revEscrita = null;
        let ajenosServidor = null;

        let planAplicado = null;
        let remotoLeido = null;

        await runTransaction(db, async (transaction) => {
          dataConflicto = null;
          ajenosServidor = null;
          const snapshot = await transaction.get(embarqueRef);

          if (!snapshot.exists()) {
            if (revCapturada > 0) {
              throw new Error('El embarque fue eliminado en otro equipo. La copia local se conserva; no se volverá a crear automáticamente.');
            }
            revEscrita = revCapturada + 1;
            transaction.set(embarqueRef, { ...payloadEditor, ultimaEdicion, rev: revEscrita });
            return;
          }

          const remoto = snapshot.data();
          const plan = planearEscritura({
            remoto,
            baseRev: revCapturada,
            baseCampos: baseEditor,
            campos: payloadEditor,
          });
          planAplicado = plan;
          remotoLeido = remoto;

          if (plan.accion === 'omitir') {
            revEscrita = plan.rev;
            ajenosServidor = seleccionarCampos(remoto, CAMPOS_AJENOS_AL_EDITOR);
            return;
          }

          if (plan.accion === 'conflicto' || plan.accion === 'parcial') {
            // Otro editor tocó clientes, productos o la carga. No se pisa:
            // se respalda y se fusiona al salir de la transacción.
            dataConflicto = remoto;
            transaction.set(respaldoConflicto, {
              embarqueOriginalId: idCapturado, datosOriginales: docData,
              fechaRespaldo: serverTimestamp(), razonRespaldo: 'cambios_locales_antes_de_combinar',
              tipoRespaldo: 'emergencia', version: '1.0'
            });
            return;
          }

          revEscrita = plan.rev;
          ajenosServidor = seleccionarCampos(remoto, CAMPOS_AJENOS_AL_EDITOR);
          // Solo los campos que el plan dejó escribir. El resto del formulario
          // puede estar viejo: otro editor ya lo cambió y esta pantalla no lo tocó.
          transaction.update(embarqueRef, { ...plan.campos, ultimaEdicion, rev: revEscrita });
        });

        if (this._editorCerrado || this.embarqueId !== idCapturado) return;

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

        const distintos = (planAplicado && planAplicado.camposRemotosDistintos) || [];
        if (distintos.length && remotoLeido) {
          const fusionado = {
            ...remotoLeido,
            ...(planAplicado.campos || {}),
            rev: revEscrita != null ? revEscrita : (Number(remotoLeido.rev) || 0),
          };
          delete fusionado.ultimaEdicion;
          if ((Number(this._dirtyGen) || 0) === genCapturada) this.hasPendingChanges = false;
          this._snapshotRemotoDiferido = null;
          await this.aplicarDocRemoto(idCapturado, fusionado);
          this._reintentosSubidaEnVivo = 0;
          console.log('[subirCambiosEnVivo] Campos ajenos del otro editor incorporados (rev', (fusionado.rev) + ').');
          return;
        }

        this._revBase = revEscrita;
        this.capturarBaseEditor(payloadEditor);
        if (ajenosServidor) this.aplicarCamposAjenos(ajenosServidor);
        this._reintentosSubidaEnVivo = 0;
        // Cualquier snapshot diferido es anterior a la revisión recién
        // escrita (la transacción habría detectado conflicto si no): ya es
        // obsoleto en ambos casos de abajo.
        this._snapshotRemotoDiferido = null;
        if ((Number(this._dirtyGen) || 0) === genCapturada) {
          this.hasPendingChanges = false;
          await this.guardarSnapshotOffline({ pendingSync: false, syncState: 'synced', docData });
        } else {
          // El usuario tecleó mientras la transacción viajaba: esos cambios
          // NO van en la revisión escrita y siguen pendientes de subir.
          await this.guardarSnapshotOffline({ pendingSync: true });
          this.programarSubidaEnVivo();
        }
        console.log('[subirCambiosEnVivo] Cambios sincronizados con la nube (rev', revEscrita + ').');
      } catch (error) {
        this.errorSincronizacion = error.message || 'No se pudo sincronizar';
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
        this.subiendoEnVivo = false;
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
