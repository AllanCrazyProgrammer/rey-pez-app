import { getFirestore, doc, onSnapshot, addDoc, collection } from 'firebase/firestore';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';
import { normalizarFechaISO, obtenerFechaActualISO } from '@/utils/dateUtils';
import { crearNuevoProducto } from '@/constants.js/embarque';
import { embarqueTieneContenidoOperativoDoc, embarqueTieneContenidoOperativoEstado } from '@/utils/embarqueContenido';

const esUUIDValido = (id) => {
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

      this.unsubscribe = onSnapshot(embarqueRef, async (doc) => {
        if (this.hasPendingChanges) {
          console.log('[onSnapshot] Ignorando actualización remota porque hay cambios locales pendientes.');
          return;
        }

        if (doc.exists()) {
          const data = doc.data();
          data.clientes = Array.isArray(data.clientes) ? data.clientes : [];
          this._aplicandoRemoto = true;

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

          console.log('[DEBUG-FECHA] Cargando embarque ID:', id);
          console.log('[DEBUG-FECHA] Fecha cruda de Firebase:', data.fecha);
          console.log('[DEBUG-FECHA] Tipo de fecha:', typeof data.fecha, data.fecha?.constructor?.name);

          this.embarqueBloqueado = data.embarqueBloqueado || false;

          if (data.clientesPersonalizados && Array.isArray(data.clientesPersonalizados)) {
            this.clientesPersonalizados = data.clientesPersonalizados;
            console.log('[cargarEmbarque] Clientes personalizados cargados desde Firebase:', this.clientesPersonalizados);
            localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
          } else {
            console.log('[cargarEmbarque] No se encontraron clientes personalizados en Firebase, usando localStorage como respaldo');
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
            console.log('[DEBUG-FECHA] Fecha convertida de Timestamp:', fecha);
          } else if (data.fecha instanceof Date) {
            fecha = data.fecha;
            console.log('[DEBUG-FECHA] Fecha es Date object:', fecha);
          } else if (typeof data.fecha === 'string') {
            fecha = data.fecha;
            console.log('[DEBUG-FECHA] Fecha es string:', fecha);
          } else {
            console.warn('Formato de fecha no reconocido, usando la fecha actual');
            fecha = new Date();
          }

          const fechaNormalizada = normalizarFechaISO(fecha);
          console.log('[DEBUG-FECHA] Fecha normalizada final:', fechaNormalizada);

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

          let productosFiltrados = productosDesdeServidor;
          if (this.productosEliminadosLocalmente && this.productosEliminadosLocalmente.size > 0) {
            console.log('[onSnapshot] Filtrando productos eliminados localmente:', this.productosEliminadosLocalmente);
            productosFiltrados = productosDesdeServidor.filter(p =>
              !this.productosEliminadosLocalmente.has(p.id)
            );
          }

          let productosFinales;

          if (this.agregandoProducto) {
            console.log('[onSnapshot] Agregando producto en proceso, preservando productos locales');
            productosFinales = this.embarque.productos || [];
          } else if (this.camposEnEdicion && this.camposEnEdicion.size > 0) {
            console.log('[onSnapshot] Hay campos en edición, mergear cuidadosamente');
            productosFinales = this.mergeProductosConCamposEnEdicion(productosDesdeServidor, productosFiltrados);
          } else {
            const productosNuevosAPreservar = [];
            if (this.productosNuevosPendientes && this.productosNuevosPendientes.size > 0) {
              console.log('[onSnapshot] Preservando productos nuevos pendientes:', this.productosNuevosPendientes.size);
              this.productosNuevosPendientes.forEach((producto, id) => {
                const existeEnServidor = productosDesdeServidor.some(p => p.id === id);
                if (!existeEnServidor) {
                  productosNuevosAPreservar.push(producto);
                  console.log('[onSnapshot] Preservando producto nuevo:', id);
                } else {
                  this.productosNuevosPendientes.delete(id);
                  console.log('[onSnapshot] Producto sincronizado, removiendo de pendientes:', id);
                }
              });
            }

            const productosLocalesActuales = this.embarque.productos || [];
            productosLocalesActuales.forEach(productoLocal => {
              if (esUUIDValido(productoLocal.id) &&
                  !productosDesdeServidor.some(p => p.id === productoLocal.id) &&
                  !productosNuevosAPreservar.some(p => p.id === productoLocal.id)) {
                console.log('[onSnapshot] Preservando producto local no sincronizado:', productoLocal.id);
                productosNuevosAPreservar.push(productoLocal);
                if (!this.productosNuevosPendientes.has(productoLocal.id)) {
                  this.productosNuevosPendientes.set(productoLocal.id, { ...productoLocal });
                }
              }
            });

            productosFinales = [...productosFiltrados, ...productosNuevosAPreservar];
          }

          this.embarque = {
            fecha: fechaNormalizada,
            cargaCon: data.cargaCon || '',
            camionNumero: data.camionNumero || 1,
            productos: productosFinales,
            kilosCrudos: data.kilosCrudos || {}
          };

          console.log('[DEBUG-FECHA] Embarque asignado con fecha:', this.embarque.fecha);
          console.log('[DEBUG-FECHA] Total productos cargados:', productosFinales.length);

          this.costosPorMedida = { ...(data.costosPorMedida || {}) };
          this.aplicarCostoExtra = { ...(data.aplicarCostoExtra || {}) };
          this.costoExtra = data.costoExtra !== undefined ? data.costoExtra : 18;

          this.clienteCrudos = {};
          data.clientes.forEach(cliente => {
            if (cliente.crudos && cliente.crudos.length > 0) {
              this.$set(this.clienteCrudos, cliente.id, cliente.crudos);
            } else {
              this.$set(this.clienteCrudos, cliente.id, []);
            }
          });

          this.embarqueId = id;
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;

          this._inicializandoEmbarque = false;
          this._aplicandoRemoto = false;

          this.guardarSnapshotOffline({ pendingSync: false, docData: data, syncState: 'synced' });
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
