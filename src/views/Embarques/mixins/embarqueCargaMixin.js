import { getFirestore, doc, onSnapshot, addDoc, collection } from 'firebase/firestore';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';
import { normalizarFechaISO, obtenerFechaActualISO } from '@/utils/dateUtils';
import { crearNuevoProducto } from '@/constants.js/embarque';
import { embarqueTieneContenidoOperativoDoc, embarqueTieneContenidoOperativoEstado, productoTieneContenido, serializarEstable, fusionarProductoTresVias } from '@/utils/embarqueContenido';

export const esUUIDValido = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

export const embarqueCargaMixin = {
  methods: {
    async cargarEmbarque(id) {
      if (id === 'nuevo') {
        localStorage.removeItem('ultimoEmbarqueId');
        if (this.productosEliminadosLocalmente && this.productosEliminadosLocalmente.size > 0) {
          this.productosEliminadosLocalmente.clear();
        }
        if (this.productosNuevosPendientes && this.productosNuevosPendientes.size > 0) {
          this.productosNuevosPendientes.clear();
        }
        if (this.camposEnEdicion && this.camposEnEdicion.size > 0) {
          this.camposEnEdicion.clear();
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
      if (this.camposEnEdicion && this.camposEnEdicion.size > 0) {
        console.log('[cargarEmbarque] Limpiando campos en edición');
        this.camposEnEdicion.clear();
      }

      if (id !== this.embarqueId) {
        // Cambio de embarque: las bases de fusión de 3 vías del embarque
        // anterior no aplican al nuevo (los ids de cliente se repiten entre
        // embarques). En reconexiones (mismo id) se conservan para proteger
        // las ediciones locales pendientes.
        this._productosBase = new Map();
        this._crudosBase = new Map();
        this._cargaConBase = undefined;
        this._revBase = 0;
      }

      this._inicializandoEmbarque = true;
      this.limpiarConexionesFirestore();

      if (!navigator.onLine) {
        const cargadoOffline = await this.cargarEmbarqueOffline(id);
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
          if (!this._inicializandoEmbarque && revRemota !== 0 &&
              revRemota === (Number(this._revBase) || 0)) {
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
          // Revisión remota sobre la que queda basado el estado local
          // (subirCambiosEnVivo la usa para detectar conflictos).
          const revBaseAnterior = Number(this._revBase) || 0;
          this._revBase = Number(data.rev) || 0;

          try {
            if (!this.tieneContenidoOperativo(data)) {
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
                const esCatarro = cliente.nombre && cliente.nombre.toLowerCase().includes('catarro');
                this.$set(this.clientesSumarKgCatarro, cliente.id, esCatarro);
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

            const productosDesdeServidor = data.clientes.flatMap(cliente => {
              const clienteInfo = clientesPredefinidosMap.get(cliente.id.toString()) || cliente;
              return cliente.productos.map(producto => ({
                ...producto,
                clienteId: cliente.id,
                nombreCliente: clienteInfo.nombre,
                restarTaras: producto.restarTaras || false,
              }));
            });

            // Lápidas de borrado del documento: productos que algún editor
            // eliminó. Sin esto, el producto borrado por la otra persona se
            // "preservaba" aquí como si fuera un producto nuevo local.
            const eliminadosRemotos = data.productosEliminados || {};
            this._productosEliminadosDoc = eliminadosRemotos;

            let productosFiltrados = productosDesdeServidor.filter(p => !eliminadosRemotos[p.id]);
            if (this.productosEliminadosLocalmente && this.productosEliminadosLocalmente.size > 0) {
              productosFiltrados = productosFiltrados.filter(p =>
                !this.productosEliminadosLocalmente.has(p.id)
              );
            }

            // Fusión de 3 vías por producto contra la ÚLTIMA VERSIÓN
            // SINCRONIZADA (base). Sin esto, una fusión por conflicto
            // revertía las ediciones locales aún no subidas:
            // - Solo lo local cambió → gana lo local completo.
            // - Solo lo remoto cambió → gana lo remoto completo.
            // - AMBOS cambiaron el mismo producto → fusión campo por campo
            //   (usuario 1 borra kilos mientras usuario 2 agrega taras y
            //   bolsas: sobreviven ambas intenciones).
            const baseSincronizada = this._productosBase instanceof Map ? this._productosBase : new Map();
            const productosLocalesParaMerge = this.embarque.productos || [];
            productosFiltrados = productosFiltrados.map((pServidor) => {
              const pLocal = productosLocalesParaMerge.find(p => p.id === pServidor.id);
              if (!pLocal) return pServidor;
              const entradaBase = baseSincronizada.get(pServidor.id);
              if (!entradaBase) return pServidor;
              const localCambio = serializarEstable(pLocal) !== entradaBase.str;
              if (!localCambio) return pServidor;
              const remotoCambio = serializarEstable(pServidor) !== entradaBase.str;
              if (!remotoCambio) {
                console.log('[onSnapshot] Conservando edición local sin subir del producto:', pServidor.id);
                return pLocal;
              }
              console.log('[onSnapshot] Producto editado por ambos: fusión campo por campo:', pServidor.id);
              return fusionarProductoTresVias(entradaBase.obj, pLocal, pServidor);
            });

            // La nueva base es lo que el SERVIDOR tiene en esta revisión
            // (clonada: los objetos del snapshot pasan al estado local y
            // mutarían la base por referencia).
            this._productosBase = new Map(
              productosDesdeServidor.map(p => [
                p.id,
                { obj: JSON.parse(JSON.stringify(p)), str: serializarEstable(p) }
              ])
            );

            let productosFinales;

            if (this.agregandoProducto) {
              productosFinales = this.embarque.productos || [];
              // Fusión PARCIAL: los productos remotos no se integraron, así
              // que el estado local NO queda basado en esta revisión. Si la
              // reclamáramos, la siguiente subida escribiría nuestra lista
              // (sin los productos del otro editor) como si fuera la fusión
              // completa y los borraría. Mantener la base anterior fuerza un
              // conflicto→fusión completa en el siguiente intento.
              this._revBase = revBaseAnterior;
              // Por lo mismo, la base de productos tampoco puede avanzar a
              // esta revisión: los cambios remotos no aplicados parecerían
              // "ya integrados" y la próxima fusión los revertiría.
              this._productosBase = baseSincronizada;
            } else if (this.camposEnEdicion && this.camposEnEdicion.size > 0) {
              productosFinales = this.mergeProductosConCamposEnEdicion(productosDesdeServidor, productosFiltrados);
            } else {
              // Placeholder redundante: renglón vacío de un cliente que ya
              // tiene productos en el servidor. Cada editor crea el suyo
              // automáticamente; si se preservan, cada colaborador duplica
              // los renglones vacíos del otro.
              const clientesConProductosEnServidor = new Set(
                productosDesdeServidor.map(p => String(p.clienteId))
              );
              const esPlaceholderRedundante = (producto) =>
                !productoTieneContenido(producto) &&
                clientesConProductosEnServidor.has(String(producto.clienteId));

              const productosLocalesActuales = this.embarque.productos || [];

              const productosNuevosAPreservar = [];
              if (this.productosNuevosPendientes && this.productosNuevosPendientes.size > 0) {
                this.productosNuevosPendientes.forEach((producto, id) => {
                  const existeEnServidor = productosDesdeServidor.some(p => p.id === id);
                  // Preservar la versión local VIVA (lo que se está tecleando
                  // ahora mismo), no la copia tomada al crear el producto: la
                  // copia vieja pisaba lo recién escrito al aplicar snapshots.
                  // Las filas creadas por el usuario se preservan aunque estén
                  // vacías (las está por llenar); el descarte de placeholders
                  // aplica solo a los renglones auto-creados (loop de abajo).
                  const productoVivo = productosLocalesActuales.find(p => p.id === id) || producto;
                  if (!existeEnServidor && !eliminadosRemotos[id]) {
                    productosNuevosAPreservar.push(productoVivo);
                    this.productosNuevosPendientes.set(id, { ...productoVivo });
                  } else {
                    this.productosNuevosPendientes.delete(id);
                  }
                });
              }
              productosLocalesActuales.forEach(productoLocal => {
                if (esUUIDValido(productoLocal.id) &&
                    !productosDesdeServidor.some(p => p.id === productoLocal.id) &&
                    !productosNuevosAPreservar.some(p => p.id === productoLocal.id) &&
                    !esPlaceholderRedundante(productoLocal) &&
                    !eliminadosRemotos[productoLocal.id]) {
                  productosNuevosAPreservar.push(productoLocal);
                  if (!this.productosNuevosPendientes.has(productoLocal.id)) {
                    this.productosNuevosPendientes.set(productoLocal.id, { ...productoLocal });
                  }
                }
              });

              productosFinales = [...productosFiltrados, ...productosNuevosAPreservar];
            }

            // cargaCon: fusión de 3 vías simple. Si la selección local difiere
            // de la última versión sincronizada, es un cambio local sin subir
            // y se conserva (aplicar lo remoto encima lo "deshacía" ante el
            // usuario); si no, se toma lo remoto.
            const cargaConRemoto = data.cargaCon || '';
            const cargaConLocal = (this.embarque && this.embarque.cargaCon) || '';
            const cargaConFinal = (this._cargaConBase !== undefined &&
                cargaConLocal !== this._cargaConBase)
              ? cargaConLocal
              : cargaConRemoto;
            this._cargaConBase = cargaConRemoto;

            this.embarque = {
              fecha: fechaNormalizada,
              cargaCon: cargaConFinal,
              camionNumero: data.camionNumero || 1,
              productos: productosFinales,
              kilosCrudos: data.kilosCrudos || {}
            };

            this.costosPorMedida = { ...(data.costosPorMedida || {}) };
            this.aplicarCostoExtra = { ...(data.aplicarCostoExtra || {}) };
            this.costoExtra = data.costoExtra !== undefined ? data.costoExtra : 18;

            // Crudos: fusión por cliente contra la última versión sincronizada
            // (la misma protección que ya tienen los productos, con
            // granularidad por cliente). El reemplazo directo con lo remoto
            // borraba lo que se estaba capturando en los inputs de crudos
            // (taras/sobrante/barco) cuando otro editor guardaba primero.
            const crudosBase = this._crudosBase instanceof Map ? this._crudosBase : new Map();
            const crudosLocales = this.clienteCrudos || {};
            const nuevaBaseCrudos = new Map();
            const crudosFinales = {};

            data.clientes.forEach(cliente => {
              const remotos = Array.isArray(cliente.crudos) ? cliente.crudos : [];
              nuevaBaseCrudos.set(String(cliente.id), serializarEstable(remotos));
              crudosFinales[cliente.id] = remotos;
            });

            Object.keys(crudosLocales).forEach(clienteId => {
              const locales = Array.isArray(crudosLocales[clienteId]) ? crudosLocales[clienteId] : [];
              const baseStr = crudosBase.get(String(clienteId));
              if (baseStr === undefined) {
                // Sin base conocida (primera carga o cliente nuevo local):
                // conservar lo local solo si lo remoto no trae nada para este
                // cliente, para no perder crudos recién capturados.
                const remotosCliente = crudosFinales[clienteId];
                if (locales.length > 0 && !(Array.isArray(remotosCliente) && remotosCliente.length > 0)) {
                  crudosFinales[clienteId] = locales;
                }
                return;
              }
              if (serializarEstable(locales) !== baseStr) {
                // Cambio local sin subir: gana lo local. Converge porque la
                // subida pendiente define el valor final (misma regla que el
                // conflicto de campo en fusionarProductoTresVias).
                crudosFinales[clienteId] = locales;
              }
            });

            this.clienteCrudos = {};
            Object.keys(crudosFinales).forEach(clienteId => {
              this.$set(this.clienteCrudos, clienteId, crudosFinales[clienteId]);
            });
            this._crudosBase = nuevaBaseCrudos;

            this.embarqueId = id;
            this.modoEdicion = true;
            this.guardadoAutomaticoActivo = true;

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

          this.guardarSnapshotOffline({ pendingSync: false, docData: data, syncState: 'synced' });
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
      window.addEventListener('online', () => {
        console.log('[Reconexión] Conexión restaurada, reestableciendo listeners...');
        if (this.embarqueId && !this.unsubscribe) {
          setTimeout(() => {
            this.cargarEmbarque(this.embarqueId);
          }, 1000);
        }
      });

      window.addEventListener('offline', () => {
        console.warn('[Conexión] Conexión perdida, modo offline activado');
      });
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
        const db = getFirestore();
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
              const docRef = await addDoc(collection(db, "embarques"), embarqueData);
              this.embarqueId = docRef.id;
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
      };
    },

    aplicarSnapshotOffline(record) {
      if (!record || !record.id) {
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

      this.embarqueId = record.id;
      this.modoEdicion = true;
      this.guardadoAutomaticoActivo = true;
      this.embarqueBloqueado = Boolean(record.embarqueBloqueado);
      this.hasPendingChanges = Boolean(record.pendingSync);

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

      this.productosEliminadosLocalmente = new Set();
      this.productosNuevosPendientes = new Map();
      this.camposEnEdicion = new Set();

      this._inicializandoEmbarque = false;

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
