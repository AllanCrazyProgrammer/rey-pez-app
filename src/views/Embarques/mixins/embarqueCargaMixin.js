import { estadoDesdeDoc, fusionarEdicion, identificarEstado } from '@/utils/embarqueColaboracion';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';
import { normalizarFechaISO, obtenerFechaActualISO } from '@/utils/dateUtils';
import { crearNuevoProducto } from '@/constants.js/embarque';
import { embarqueTieneContenidoOperativoDoc, embarqueTieneContenidoOperativoEstado } from '@/utils/embarqueContenido';
import { esEcoDeRevisionLocal } from '@/utils/embarqueRevision';
import { esClienteCatarro } from '@/constants/clientesConfig';

export const esUUIDValido = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

export const embarqueCargaMixin = {
  methods: {
    async cargarEmbarque(id) {
      if (id !== this.embarqueId) this.initUndo(this.embarque);
      if (id === 'nuevo') {
        localStorage.removeItem('ultimoEmbarqueId');
        if (this.productosEliminadosLocalmente && this.productosEliminadosLocalmente.size > 0) {
          this.productosEliminadosLocalmente.clear();
        }
        if (this.productosNuevosPendientes && this.productosNuevosPendientes.size > 0) {
          this.productosNuevosPendientes.clear();
        }
        this.resetearEmbarque();
        return;
      }

      if (this.productosEliminadosLocalmente && this.productosEliminadosLocalmente.size > 0) {
        this.productosEliminadosLocalmente.clear();
      }
      if (this.productosNuevosPendientes && this.productosNuevosPendientes.size > 0) {
        this.productosNuevosPendientes.clear();
      }

      if (id !== this.embarqueId) {
        // Cambio de embarque: las bases de fusión de 3 vías del embarque
        // anterior no aplican al nuevo (los ids de cliente se repiten entre
        // embarques). En reconexiones (mismo id) se conservan para proteger
        // las ediciones locales pendientes.
        this._revBase = 0;
        this._baseCamposEditor = null;
      }

      this._inicializandoEmbarque = true;
      this.limpiarConexionesFirestore();

      const cargadoOffline = await this.cargarEmbarqueOffline(id);
      if (!navigator.onLine) {
        if (!cargadoOffline) {
          console.warn('[cargarEmbarque] No se encontró información offline para el embarque solicitado:', id);
          alert('No se encontró información local para este embarque. Conéctate a internet para recuperarlo. Se conservará el estado actual para evitar pérdida de datos.');
        }
        this._inicializandoEmbarque = false;
        return;
      }

      const db = getFirestore();
      const embarqueRef = doc(db, "embarques", id);

      this.unsubscribe = onSnapshot(embarqueRef, async (docSnapshot) => {
        // Eco optimista de una escritura local pendiente de confirmar: ignorar.
        if (docSnapshot.metadata && docSnapshot.metadata.hasPendingWrites) {
          return;
        }

        if (docSnapshot.exists()) {
          const data = docSnapshot.data();

          // Eco de nuestra propia escritura (o snapshot repetido): si el
          // documento trae exactamente la revisión en la que ya está basado
          // el estado local, no hay nada nuevo que aplicar. Sin este corte,
          // re-aplicar el eco dispara watchers y provoca un bucle de
          // subidas/aplicaciones sin cambios reales.
          const revRemota = Number(data.rev) || 0;
          if (esEcoDeRevisionLocal({
            revRemota,
            revBase: this._revBase,
            inicializando: this._inicializandoEmbarque,
          })) {
            return;
          }

          if (this.hasPendingChanges) {
            // Hay cambios locales sin subir: aplicar lo remoto ahora pisaría
            // lo que se está capturando. Se difiere; la subida transaccional
            // (subirCambiosEnVivo) detecta la revisión nueva y fusiona.
            this._snapshotRemotoDiferido = data;
            // Garantía de salida: si por cualquier razón no hay una subida
            // agendada ni en curso, agendar una — la deferral no puede
            // quedarse esperando para siempre.
            if (!this._subiendoEnVivo && !this._timerSubidaEnVivo &&
                typeof this.programarSubidaEnVivo === 'function') {
              this.programarSubidaEnVivo();
            }
            return;
          }

          this._snapshotRemotoDiferido = null;
          await this.aplicarDocRemoto(id, data);
        } else {
          this.cargarEmbarqueOffline(id).then((cargadoOffline) => {
            if (cargadoOffline) {
              this._inicializandoEmbarque = false;
              this._aplicandoRemoto = false;
              return;
            }
            alert('No se encontró el embarque en nube ni en cache local para ese ID. Se conservará el estado actual; verifica conexión y vuelve a intentar.');
            this._inicializandoEmbarque = false;
            this._aplicandoRemoto = false;
          });
        }
      }, (error) => {
        console.error("Error al escuchar cambios del embarque:", error);

        if (error.code === 'unavailable' || error.message.includes('network') || error.message.includes('NETWORK')) {
          console.warn('[onSnapshot] Error de red detectado, reintentando conexión en 5 segundos...');
          setTimeout(() => {
            if (this.embarqueId && !this.unsubscribe) {
              console.log('[onSnapshot] Reintentando conexión...');
              this.cargarEmbarque(this.embarqueId);
            }
          }, 5000);
        } else if (error.code === 'permission-denied') {
          console.error('[onSnapshot] Error de permisos:', error);
          alert('Error de permisos. Por favor, verifique su acceso.');
        } else {
          console.error('[onSnapshot] Error desconocido:', error);
        }

        this._inicializandoEmbarque = false;
        this._aplicandoRemoto = false;
      });
    },

    /**
     * Aplica un documento remoto del embarque al estado local, fusionando con
     * protecciones para lo que se está editando (campos con foco, productos
     * nuevos sin sincronizar, productos eliminados localmente). También lo usa
     * la subida transaccional cuando detecta un conflicto de revisión.
     */
    async aplicarDocRemoto(id, data) {
          data.clientes = Array.isArray(data.clientes) ? data.clientes : [];
          this._aplicandoRemoto = true;

          try {
            if (!this._baseCamposEditor && !this.tieneContenidoOperativo(data)) {
              let hayContenidoOffline = false;
              try {
                const offlineRecord = await EmbarquesOfflineService.getById(id);
                const offlineData = offlineRecord?.docData || offlineRecord || {};
                hayContenidoOffline = this.tieneContenidoOperativo(offlineData);
              } catch (error) {
                console.warn('[onSnapshot] No se pudo validar snapshot offline para protección de contenido:', error);
              }

              const hayContenidoLocal = this.tieneContenidoOperativoActual();
              if (hayContenidoLocal || hayContenidoOffline) {
                console.warn('[onSnapshot] Snapshot remoto vacío ignorado para evitar sobrescritura de datos completos locales/offline.');
                this._inicializandoEmbarque = false;
                this._aplicandoRemoto = false;
                return;
              }
            }

            this.embarqueBloqueado = data.embarqueBloqueado || false;

            if (data.clientesPersonalizados && Array.isArray(data.clientesPersonalizados)) {
              this.clientesPersonalizados = data.clientesPersonalizados;
              localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
            }

            if (data.clientesJuntarMedidas) {
              this.clientesJuntarMedidas = data.clientesJuntarMedidas;
            } else {
              this.clientesJuntarMedidas = {};
              data.clientes.forEach(cliente => {
                this.$set(this.clientesJuntarMedidas, cliente.id, false);
              });
            }

            if (data.clientesReglaOtilio) {
              this.clientesReglaOtilio = data.clientesReglaOtilio;
            } else {
              this.clientesReglaOtilio = {};
              data.clientes.forEach(cliente => {
                const esOtilio = cliente.nombre && cliente.nombre.toLowerCase().includes('otilio');
                this.$set(this.clientesReglaOtilio, cliente.id, esOtilio);
              });
            }

            if (data.clientesIncluirPrecios) {
              this.clientesIncluirPrecios = data.clientesIncluirPrecios;
            } else {
              this.clientesIncluirPrecios = {};
              data.clientes.forEach(cliente => {
                this.$set(this.clientesIncluirPrecios, cliente.id, false);
              });
            }

            if (data.clientesCuentaEnPdf) {
              this.clientesCuentaEnPdf = data.clientesCuentaEnPdf;
            } else {
              this.clientesCuentaEnPdf = {};
              data.clientes.forEach(cliente => {
                this.$set(this.clientesCuentaEnPdf, cliente.id, false);
              });
            }

            if (data.clientesSumarKgCatarro) {
              this.clientesSumarKgCatarro = data.clientesSumarKgCatarro;
            } else {
              this.clientesSumarKgCatarro = {};
              data.clientes.forEach(cliente => {
                this.$set(this.clientesSumarKgCatarro, cliente.id, esClienteCatarro(cliente));
              });
            }

            let fecha;
            if (data.fecha && typeof data.fecha.toDate === 'function') {
              fecha = data.fecha.toDate();
            } else if (data.fecha instanceof Date) {
              fecha = data.fecha;
            } else if (typeof data.fecha === 'string') {
              fecha = data.fecha;
            } else {
              console.warn('Formato de fecha no reconocido, usando la fecha actual');
              fecha = new Date();
            }

            const fechaNormalizada = normalizarFechaISO(fecha);

            const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id.toString(), c]));

            const personalizadosServidor = (data.clientes || [])
              .filter(cliente => !clientesPredefinidosMap.has(cliente.id.toString()))
              .map(cliente => ({
                id: cliente.id,
                nombre: cliente.nombre,
                editable: true,
                personalizado: true,
                key: `personalizado_${cliente.id}`
              }));

            const mapaPorId = new Map();
            (this.clientesPersonalizados || []).forEach(c => {
              mapaPorId.set(String(c.id), { ...c });
            });
            personalizadosServidor.forEach(c => {
              mapaPorId.set(String(c.id), { ...c });
            });
            this.clientesPersonalizados = Array.from(mapaPorId.values());

            const remoto = estadoDesdeDoc({ ...data, fecha: fechaNormalizada });
            let combinado = { estado: remoto, omitidas: 0 };
            if (this._baseCamposEditor && this.embarqueId === id) {
              // Capturar ediciones síncronas antes de silenciar los watchers.
              this.registrarEdicionHistorial(this.embarque);
              const local = identificarEstado({ ...this.embarque, clienteCrudos: this.clienteCrudos,
                productosEliminados: this._productosEliminadosDoc || {} }, this.$set);
              combinado = fusionarEdicion(estadoDesdeDoc(this._baseCamposEditor), local, remoto);
            }
            const { clienteCrudos, productosEliminados, ...edicion } = combinado.estado;
            this._productosEliminadosDoc = productosEliminados;
            this.productosEliminadosLocalmente = new Set(Object.keys(productosEliminados).filter(k => productosEliminados[k]));
            this.productosNuevosPendientes = new Map();
            this.embarque = { ...edicion, kilosCrudos: data.kilosCrudos || {} };
            this.clienteCrudos = clienteCrudos;
            if (combinado.omitidas) this.informarConflictoEdicion('Se conservaron cambios de otra persona en ' + combinado.omitidas + ' operaciones en conflicto.');

            this.costosPorMedida = { ...(data.costosPorMedida || {}) };
            this.aplicarCostoExtra = { ...(data.aplicarCostoExtra || {}) };
            this.costoExtra = data.costoExtra !== undefined ? data.costoExtra : 18;

            this.embarqueId = id;
            this.modoEdicion = true;
            this.guardadoAutomaticoActivo = true;
            // Adoptar la revisión solo después de aplicar su contenido.
            this._revBase = Number(data.rev) || 0;
            if (typeof this.capturarBaseEditor === 'function') {
              this.capturarBaseEditor(data);
            }

          } finally {
            this._inicializandoEmbarque = false;
            // Los watchers de Vue corren en el siguiente microtask; si esta
            // bandera se apaga aquí (síncrono), cuando corren ya está en
            // false y marcan los cambios remotos como cambios locales
            // pendientes → bucle de subidas sin cambios reales. Liberarla
            // en $nextTick garantiza que los watchers ya corrieron.
            this.$nextTick(() => {
              this._aplicandoRemoto = false;
            });
          }

          // El watcher de embarque.fecha está silenciado por _aplicandoRemoto
          // durante aplicarDocRemoto, así que la carga inicial en created()
          // corrió con embarque.fecha=null (sin cargar nada) y el cambio a
          // la fecha real no dispara el watcher. Cargar aquí con la fecha
          // recién aplicada asegura que las referencias del pedido lleguen
          // para embarques guardados.
          if (typeof this.cargarPedidoReferenciaDelDia === 'function' && this.embarque?.fecha) {
            this.cargarPedidoReferenciaDelDia(this.embarque.fecha);
          }

          await this.guardarSnapshotOffline(this.hasPendingChanges
            ? { pendingSync: true }
            : { pendingSync: false, docData: data, syncState: 'synced' });
    },

    limpiarConexionesFirestore() {
      if (this.unsubscribe) {
        console.log('[limpiarConexiones] Cerrando conexión onSnapshot existente');
        try {
          this.unsubscribe();
        } catch (error) {
          console.warn('[limpiarConexiones] Error al cerrar conexión:', error);
        }
        this.unsubscribe = null;
      }
    },

    configurarReconexionAutomatica() {
      this._reconexionHandler = () => {
        if (this.embarqueId && !this.unsubscribe) this.cargarEmbarque(this.embarqueId);
        this.syncOffline();
      };
      window.addEventListener('online', this._reconexionHandler);
    },

    async resetearEmbarque() {
      const modalAbierto = this.mostrarModalPrecio ||
                           this.mostrarModalHilos ||
                           this.mostrarModalNota ||
                           this.mostrarModalAlt ||
                           this.mostrarModalNombreAlternativo ||
                           this.mostrarModalNuevoCliente;

      if (modalAbierto) {
        return;
      }

      this._inicializandoEmbarque = true;
      const fechaActual = obtenerFechaActualISO();

      this.costosPorMedida = {};
      this.aplicarCostoExtra = {};
      this.costoExtra = 18;

      try {
        const fechaEmbarque = fechaActual;

        this.embarque = {
          fecha: fechaEmbarque,
          cargaCon: '',
          camionNumero: 1,
          productos: [],
          crudos: []
        };
        this.clienteCrudos = {};
        this.clientesJuntarMedidas = {};
        this.clientesReglaOtilio = {};
        this.clientesIncluirPrecios = {};
        this.embarqueId = null;
        this.hasPendingChanges = false;
        this._revBase = 0;
        this.modoEdicion = false;
        this.guardadoAutomaticoActivo = false;
        this.embarqueBloqueado = false;
        this.clientesPersonalizados = [];

        const productosIniciales = this.clientesPredefinidos.map(cliente => {
          const nuevoProducto = crearNuevoProducto(cliente.id.toString());
          nuevoProducto.nombreCliente = cliente.nombre;
          this.setTipoDefaultParaCliente(nuevoProducto);
          return nuevoProducto;
        });

        this.clienteCrudos = {};
        this.embarque.productos = productosIniciales;

        this.clientesPredefinidos.forEach(cliente => {
          const esOtilio = cliente.nombre && cliente.nombre.toLowerCase().includes('otilio');
          this.$set(this.clientesReglaOtilio, cliente.id.toString(), esOtilio);
        });

        this.clientesPredefinidos.forEach(cliente => {
          this.$set(this.clientesSumarKgCatarro, cliente.id.toString(), false);
        });

        this.clientesPredefinidos.forEach(cliente => {
          this.$set(this.clientesIncluirPrecios, cliente.id.toString(), false);
        });

        this.clientesPredefinidos.forEach(cliente => {
          this.$set(this.clientesCuentaEnPdf, cliente.id.toString(), false);
        });

        this.clientesPredefinidos.forEach(cliente => {
          this.$set(this.clientesJuntarMedidas, cliente.id.toString(), false);
        });

        if (this.clientesPredefinidos.length > 0) {
          this.clienteActivo = this.clientesPredefinidos[0].id.toString();
        }

        if (this.embarque.fecha) {
          this._guardandoInicial = true;
          this.$nextTick(async () => {
            try {
              this.embarque.camionNumero = await this.obtenerCamionNumeroParaFecha(this.embarque.fecha);
              const embarqueData = this.prepararDatosEmbarque();
              this.embarqueId = uuidv4();
              this._revBase = 0;
              this._inicializandoEmbarque = false;
              this.hasPendingChanges = true;
              await this.guardarSnapshotOffline({ pendingSync: true, docData: embarqueData, syncState: 'pending-create' });
              if (navigator.onLine) this.programarSubidaEnVivo();
              this.modoEdicion = true;
              this.guardadoAutomaticoActivo = true;
              localStorage.setItem('ultimoEmbarqueId', this.embarqueId);
            } catch (error) {
              console.error('Error en el guardado inicial automático:', error);
            } finally {
              this._guardandoInicial = false;
            }
          });
        }
      } catch (error) {
        console.error("Error al resetear el embarque:", error);
        this.embarque = {
          fecha: fechaActual,
          cargaCon: '',
          camionNumero: 1,
          productos: [],
        };
        this.clientesJuntarMedidas = {};
        this.clientesReglaOtilio = {};
        this.clientesIncluirPrecios = {};
        this.clientesPredefinidos.forEach(cliente => {
          const esOtilio = cliente.nombre && cliente.nombre.toLowerCase().includes('otilio');
          this.$set(this.clientesReglaOtilio, cliente.id.toString(), esOtilio);
        });
        this.embarqueId = null;
        this.hasPendingChanges = false;
        this._revBase = 0;
        this.modoEdicion = false;
        this.guardadoAutomaticoActivo = false;
        this.embarqueBloqueado = false;
        this.clientesPersonalizados = [];
      }

      this.$nextTick(() => {
        this._inicializandoEmbarque = false;
      });
    },

    buildOfflineSnapshot(docDataOverride = null) {
      if (!this.embarqueId) {
        return null;
      }

      const safeClone = (value, fallback) => {
        if (value === undefined || value === null) {
          return fallback;
        }
        try {
          return JSON.parse(JSON.stringify(value));
        } catch (error) {
          console.warn('[buildOfflineSnapshot] Error al clonar valor, devolviendo fallback:', error);
          return fallback;
        }
      };

      const docData = docDataOverride || this.prepararDatosEmbarque();

      return {
        id: this.embarqueId,
        baseRev: Number(this._revBase) || 0,
        fecha: docData?.fecha || this.embarque.fecha || null,
        cargaCon: docData?.cargaCon || this.embarque.cargaCon || '',
        camionNumero: docData?.camionNumero || this.embarque.camionNumero || 1,
        embarqueBloqueado: this.embarqueBloqueado || false,
        productos: safeClone(this.embarque.productos || [], []),
        clienteCrudos: safeClone(this.clienteCrudos || {}, {}),
        clientesJuntarMedidas: safeClone(this.clientesJuntarMedidas || {}, {}),
        clientesReglaOtilio: safeClone(this.clientesReglaOtilio || {}, {}),
        clientesIncluirPrecios: safeClone(this.clientesIncluirPrecios || {}, {}),
        clientesCuentaEnPdf: safeClone(this.clientesCuentaEnPdf || {}, {}),
        clientesSumarKgCatarro: safeClone(this.clientesSumarKgCatarro || {}, {}),
        clientesPersonalizados: safeClone(this.clientesPersonalizados || [], []),
        costosPorMedida: safeClone(this.costosPorMedida || {}, {}),
        aplicarCostoExtra: safeClone(this.aplicarCostoExtra || {}, {}),
        costoExtra: this.costoExtra,
        medidasConfiguracion: safeClone(this.medidasConfiguracion || [], []),
        preciosActuales: safeClone(this.preciosActuales || [], []),
        clientes: safeClone(docData?.clientes || [], []),
        docData: safeClone(docData || {}, {}),
        baseCamposEditor: safeClone(this._baseCamposEditor || null, null),
      };
    },

    aplicarSnapshotOffline(record) {
      if (!record || !record.id || record.deleted) {
        return;
      }

      const safeClone = (value, fallback) => {
        if (value === undefined || value === null) {
          return fallback;
        }
        try {
          return JSON.parse(JSON.stringify(value));
        } catch (error) {
          console.warn('[aplicarSnapshotOffline] Error al clonar valor, usando fallback:', error);
          return fallback;
        }
      };

      this._inicializandoEmbarque = true;
      this._aplicandoRemoto = true;

      this.embarqueId = record.id;
      this.modoEdicion = true;
      this.guardadoAutomaticoActivo = true;
      this.embarqueBloqueado = Boolean(record.embarqueBloqueado);
      this.hasPendingChanges = Boolean(record.pendingSync);
      this._revBase = Number(record.baseRev ?? record.docData?.rev) || 0;
      if (typeof this.capturarBaseEditor === 'function') {
        this.capturarBaseEditor(record.baseCamposEditor || record.docData || record);
      }
      this._productosEliminadosDoc = safeClone(record.docData?.productosEliminados || {}, {});
      const fechaRecord = record.fecha || record.docData?.fecha || null;
      const fechaNormalizada = fechaRecord ? normalizarFechaISO(fechaRecord) : null;

      console.log('[DEBUG-APLICAR-OFFLINE] ID del registro:', record.id);
      console.log('[DEBUG-APLICAR-OFFLINE] Fecha original del record:', fechaRecord);
      console.log('[DEBUG-APLICAR-OFFLINE] Fecha normalizada:', fechaNormalizada);
      console.log('[DEBUG-APLICAR-OFFLINE] Total productos a cargar:', record.productos?.length || 0);

      this.embarque = {
        fecha: fechaNormalizada,
        cargaCon: record.cargaCon || '',
        camionNumero: record.camionNumero || record.docData?.camionNumero || 1,
        kilosCrudos: safeClone(record.kilosCrudos || record.docData?.kilosCrudos || {}, {}),
        productos: safeClone(record.productos || [], []),
      };

      console.log('[DEBUG-APLICAR-OFFLINE] Embarque.fecha asignado:', this.embarque.fecha);
      console.log('[DEBUG-APLICAR-OFFLINE] Embarque.productos.length:', this.embarque.productos.length);

      this.clienteCrudos = safeClone(record.clienteCrudos || {}, {});
      this.clientesJuntarMedidas = safeClone(record.clientesJuntarMedidas || {}, {});
      this.clientesReglaOtilio = safeClone(record.clientesReglaOtilio || {}, {});
      this.clientesIncluirPrecios = safeClone(record.clientesIncluirPrecios || {}, {});
      this.clientesCuentaEnPdf = safeClone(record.clientesCuentaEnPdf || {}, {});
      this.clientesSumarKgCatarro = safeClone(record.clientesSumarKgCatarro || {}, {});
      this.clientesPersonalizados = safeClone(record.clientesPersonalizados || [], []);
      this.costosPorMedida = safeClone(record.costosPorMedida || {}, {});
      this.aplicarCostoExtra = safeClone(record.aplicarCostoExtra || {}, {});
      this.costoExtra = record.costoExtra !== undefined ? record.costoExtra : this.costoExtra;
      this.medidasConfiguracion = safeClone(record.medidasConfiguracion || [], []);
      this.preciosActuales = safeClone(record.preciosActuales || [], []);

      try {
        localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
      } catch (error) {
        console.warn('[aplicarSnapshotOffline] No se pudo sincronizar clientes personalizados con localStorage:', error);
      }

      this.productosEliminadosLocalmente = new Set(Object.keys(this._productosEliminadosDoc || {}).filter(k => this._productosEliminadosDoc[k]));
      this.productosNuevosPendientes = new Map();

      this._inicializandoEmbarque = false;
      this.$nextTick(() => { this._aplicandoRemoto = false; });

      this.actualizarMedidasUsadas();
      this.initUndo(this.embarque);
      this.clienteActivo = this.embarque.productos.length > 0 ? this.embarque.productos[0].clienteId : null;

      console.log('[DEBUG-APLICAR-OFFLINE] Carga offline completada, bandera desactivada');
    },

    tieneContenidoOperativo(data) {
      return embarqueTieneContenidoOperativoDoc(data);
    },

    tieneContenidoOperativoActual() {
      return embarqueTieneContenidoOperativoEstado({
        cargaCon: this.embarque?.cargaCon,
        productos: this.embarque?.productos,
        clienteCrudos: this.clienteCrudos,
      });
    },
  },
};
