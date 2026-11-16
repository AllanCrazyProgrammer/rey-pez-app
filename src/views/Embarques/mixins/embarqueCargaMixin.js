import { copiar, estadoDesdeDoc, iguales } from '@/utils/embarqueColaboracion';
import { fusionarDocEditor, MAPAS_POR_CLIENTE, UI_PRODUCTO } from '@/utils/embarqueFusion';
import { parcharCrudos, parcharListaPorId } from '@/utils/embarqueParche';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';
import { normalizarFechaISO, obtenerFechaActualISO } from '@/utils/dateUtils';
import { responsableCargaParaFecha } from '@/utils/cargaEmbarque';
import { crearNuevoProducto } from '@/constants/embarque';
import { embarqueTieneContenidoOperativoDoc, embarqueTieneContenidoOperativoEstado } from '@/utils/embarqueContenido';
import { CAMPOS_EDITOR, esSnapshotYaAdoptado, seleccionarCampos } from '@/utils/embarqueRevision';
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

      this.suscribirEmbarque(id);
    },

    /**
     * Escucha en vivo el documento del embarque. Lo llama cargarEmbarque al
     * abrir, y también la primera subida confirmada de un embarque recién
     * creado: la ventana que crea el embarque no pasa por cargarEmbarque(id)
     * (abre con 'nuevo'), así que antes nunca quedaba suscrita y no veía lo
     * que los demás guardaban hasta recargar la página.
     */
    suscribirEmbarque(id) {
      if (this.unsubscribe) return;
      const db = getFirestore();
      const embarqueRef = doc(db, "embarques", id);

      this.unsubscribe = onSnapshot(embarqueRef, async (docSnapshot) => {
        // Eco optimista de una escritura local pendiente de confirmar: ignorar.
        if (docSnapshot.metadata && docSnapshot.metadata.hasPendingWrites) {
          return;
        }

        if (docSnapshot.exists()) {
          const data = docSnapshot.data();

          // Eco de nuestra propia escritura, snapshot repetido o ATRASADO: el
          // canal de escucha es independiente del de escritura y puede
          // entregar una revisión anterior a la que esta pantalla ya adoptó
          // al confirmar su subida. Aplicarla haría retroceder lo recién
          // capturado. (Un documento sin `rev` — versión vieja — siempre se aplica.)
          const revRemota = Number(data.rev) || 0;
          if (esSnapshotYaAdoptado({
            revRemota,
            revBase: this._revBase,
            inicializando: this._inicializandoEmbarque,
          })) {
            return;
          }

          if (this._subiendoEnVivo) {
            // Hay una subida viajando: lo que llegue se aplica cuando termine
            // (subirCambiosEnVivo), ya con la base correcta. Solo se guarda
            // el más reciente.
            this._snapshotRemotoDiferido = data;
            return;
          }

          // Sin subida en vuelo se aplica de inmediato, AUNQUE haya cambios
          // locales sin subir: la fusión de tres vías conserva lo que se está
          // capturando aquí. Antes se posponía mientras hubiera pendientes y
          // quien tecleaba sin parar no veía a los demás.
          this._snapshotRemotoDiferido = null;
          await this.aplicarDocRemoto(id, data);
          // Garantía de salida: si quedaron cambios locales por subir y no
          // hay subida agendada ni en curso, agendar una.
          if (this.hasPendingChanges && !this._subiendoEnVivo && !this._timerSubidaEnVivo &&
              typeof this.programarSubidaEnVivo === 'function') {
            this.programarSubidaEnVivo();
          }
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
     * Aplica un documento del servidor al estado local.
     *
     * Con base conocida hace fusión de tres vías (fusionarDocEditor): lo que
     * esta pantalla cambió y aún no sube se conserva encima de lo remoto. El
     * resultado se aplica EN SITIO (parcharListaPorId): los productos, filas
     * y crudos conservan su identidad, así que un modal abierto o un campo
     * con foco siguen apuntando al objeto vivo.
     *
     * @param {Object} [opciones]
     * @param {Object} [opciones.baseFusion] Ancestro de la fusión. Por defecto
     *   la base del editor; al confirmar una subida es lo que se envió.
     * @param {boolean} [opciones.habiaPendientes] Si había ediciones locales
     *   sin subir antes de aplicar (por defecto, `hasPendingChanges`).
     */
    async aplicarDocRemoto(id, data, opciones = {}) {
          data.clientes = Array.isArray(data.clientes) ? data.clientes : [];
          this._aplicandoRemoto = true;
          const conBase = Boolean(this._baseCamposEditor && this.embarqueId === id);
          const fechaAnterior = this.embarque ? this.embarque.fecha : null;
          let omitidas = 0;

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

            let fusion;
            if (conBase) {
              // Capturar ediciones síncronas antes de silenciar los watchers.
              this.registrarEdicionHistorial(this.embarque);
              const local = JSON.parse(JSON.stringify(seleccionarCampos(this.prepararDatosEmbarque(), CAMPOS_EDITOR)));
              fusion = fusionarDocEditor({ base: opciones.baseFusion || this._baseCamposEditor, local, remoto: data });
              omitidas = fusion.omitidas;
            } else {
              // Primera carga (o cambio de embarque): lo remoto tal cual.
              fusion = fusionarDocEditor({ base: data, local: seleccionarCampos(data, CAMPOS_EDITOR), remoto: data });
            }
            const campos = fusion.campos;
            const estado = estadoDesdeDoc(campos);
            if (!estado.fecha) {
              console.warn('Formato de fecha no reconocido, usando la fecha actual');
              estado.fecha = normalizarFechaISO(new Date());
            }
            const clientes = campos.clientes || [];

            this.embarqueBloqueado = Boolean(campos.embarqueBloqueado);

            // Casillas por cliente: lo fusionado; si el documento nunca las
            // guardó, los valores por defecto de siempre.
            const porDefecto = {
              clientesJuntarMedidas: () => false,
              clientesReglaOtilio: cliente => Boolean(cliente.nombre && cliente.nombre.toLowerCase().includes('otilio')),
              clientesIncluirPrecios: () => false,
              clientesCuentaEnPdf: () => false,
              clientesSumarKgCatarro: cliente => esClienteCatarro(cliente),
            };
            MAPAS_POR_CLIENTE.forEach(mapa => {
              const valor = campos[mapa];
              if (valor && typeof valor === 'object') {
                if (!iguales(this[mapa], valor)) this[mapa] = copiar(valor);
                return;
              }
              if (conBase && this[mapa] && Object.keys(this[mapa]).length) return;
              const inicial = {};
              clientes.forEach(cliente => { inicial[cliente.id] = porDefecto[mapa](cliente); });
              this[mapa] = inicial;
            });

            const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id.toString(), c]));
            const personalizadosServidor = clientes
              .filter(cliente => !clientesPredefinidosMap.has(cliente.id.toString()))
              .map(cliente => ({
                id: cliente.id,
                nombre: cliente.nombre,
                editable: true,
                personalizado: true,
                key: `personalizado_${cliente.id}`
              }));
            const mapaPorId = new Map();
            (Array.isArray(campos.clientesPersonalizados) ? campos.clientesPersonalizados : (this.clientesPersonalizados || [])).forEach(c => {
              mapaPorId.set(String(c.id), { ...c });
            });
            personalizadosServidor.forEach(c => {
              mapaPorId.set(String(c.id), { ...c });
            });
            const personalizados = Array.from(mapaPorId.values());
            if (!iguales(this.clientesPersonalizados, personalizados)) {
              this.clientesPersonalizados = personalizados;
              localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
            }

            const productosEliminados = campos.productosEliminados || {};
            this._productosEliminadosDoc = productosEliminados;
            this.productosEliminadosLocalmente = new Set(Object.keys(productosEliminados).filter(k => productosEliminados[k]));
            this.productosNuevosPendientes = new Map();

            const kilosCrudos = data.kilosCrudos || {};
            if (conBase && this.embarque && Array.isArray(this.embarque.productos)) {
              const ayuda = { set: this.$set, del: this.$delete };
              if (this.embarque.fecha !== estado.fecha) this.$set(this.embarque, 'fecha', estado.fecha);
              if (this.embarque.cargaCon !== estado.cargaCon) this.$set(this.embarque, 'cargaCon', estado.cargaCon);
              if (this.embarque.camionNumero !== estado.camionNumero) this.$set(this.embarque, 'camionNumero', estado.camionNumero);
              if (!iguales(this.embarque.kilosCrudos, kilosCrudos)) this.$set(this.embarque, 'kilosCrudos', copiar(kilosCrudos));
              // El estado de pantalla de cada renglón (en edición, nuevo) es de este editor.
              parcharListaPorId(this.embarque, 'productos', estado.productos, ayuda, { conservar: UI_PRODUCTO });
              parcharCrudos(this.clienteCrudos, estado.clienteCrudos, ayuda);
            } else {
              this.embarque = {
                fecha: estado.fecha, cargaCon: estado.cargaCon, camionNumero: estado.camionNumero,
                productos: estado.productos, kilosCrudos,
              };
              this.clienteCrudos = estado.clienteCrudos;
            }

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
            if (conBase) {
              // Sigue habiendo pendientes solo si ya los había y el servidor
              // aún no los tiene. Abrir o recibir nunca "ensucia" el embarque.
              const habia = opciones.habiaPendientes !== undefined ? opciones.habiaPendientes : this.hasPendingChanges;
              this.hasPendingChanges = Boolean(habia && Object.keys(fusion.cambios).length);
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

          if (omitidas) this.avisarCamposEnConflicto(omitidas);

          // El watcher de embarque.fecha está silenciado por _aplicandoRemoto,
          // así que las referencias del pedido se cargan aquí; solo en la
          // primera carga o cuando la fecha cambió (no en cada guardado).
          if (typeof this.cargarPedidoReferenciaDelDia === 'function' && this.embarque?.fecha &&
              (!conBase || this.embarque.fecha !== fechaAnterior)) {
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
          // Quién carga, automático por día de la semana (regla de Allan):
          // lun, jue, sáb Caminante; mar, mié, vie Porro; domingo sin asignar.
          // El select del header lo puede cambiar a mano.
          cargaCon: responsableCargaParaFecha(fechaEmbarque),
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
          cargaCon: responsableCargaParaFecha(fechaActual),
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
