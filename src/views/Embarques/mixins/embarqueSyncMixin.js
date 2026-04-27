import { getFirestore, doc, addDoc, updateDoc, setDoc, getDoc, serverTimestamp, collection, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';
import { normalizarFechaISO } from '@/utils/dateUtils';
import { crearNuevoProducto } from '@/constants.js/embarque';
import { embarqueTieneContenidoOperativoEstado } from '@/utils/embarqueContenido';

export const embarqueSyncMixin = {
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
        const db = getFirestore();
        const embarqueRef = doc(db, "embarques", this.embarqueId);
        const embarqueData = this.prepararDatosEmbarque();
        const snap = await getDoc(embarqueRef);

        const payload = {
          ...embarqueData,
          ultimaEdicion: {
            userId: this.authStore.userId,
            username: this.authStore.user?.username || 'Usuario desconocido',
            timestamp: serverTimestamp()
          }
        };

        if (snap.exists()) {
          await updateDoc(embarqueRef, payload);
        } else {
          await setDoc(embarqueRef, payload);
        }

        await EmbarquesOfflineService.markSynced(this.embarqueId);
        this.hasPendingChanges = false;
        this.mostrarMensaje('Cambios subidos exitosamente a la nube.');
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

    normalizarDocDataParaFirestore(docData, record = {}) {
      const dataCruda = docData ? JSON.parse(JSON.stringify(docData)) : this.prepararDatosEmbarque();

      const parseFecha = (valor) => {
        if (!valor) {
          const hoy = new Date();
          return `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, '0')}-${String(hoy.getUTCDate()).padStart(2, '0')}`;
        }
        if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
          return valor;
        }
        if (typeof valor === 'string') {
          const match = valor.match(/^(\d{4}-\d{2}-\d{2})/);
          if (match) return match[1];
        }
        if (valor instanceof Date) {
          return `${valor.getUTCFullYear()}-${String(valor.getUTCMonth() + 1).padStart(2, '0')}-${String(valor.getUTCDate()).padStart(2, '0')}`;
        }
        if (typeof valor === 'object' && valor !== null) {
          const seconds = valor.seconds ?? valor._seconds;
          if (typeof seconds === 'number') {
            const fecha = new Date(seconds * 1000);
            return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
          }
        }
        if (typeof valor === 'string') {
          try {
            const parsed = new Date(valor);
            if (!Number.isNaN(parsed.getTime())) {
              return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
            }
          } catch (_) {
            console.warn('[normalizarDocDataParaFirestore] No se pudo parsear la fecha:', valor);
          }
        }
        const hoy = new Date();
        return `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, '0')}-${String(hoy.getUTCDate()).padStart(2, '0')}`;
      };

      const data = {
        cargaCon: dataCruda.cargaCon || '',
        camionNumero: dataCruda.camionNumero || record.camionNumero || 1,
        kilosCrudos: dataCruda.kilosCrudos || record.kilosCrudos || {},
        clientes: Array.isArray(dataCruda.clientes) ? dataCruda.clientes : [],
        clientesJuntarMedidas: dataCruda.clientesJuntarMedidas || {},
        clientesReglaOtilio: dataCruda.clientesReglaOtilio || {},
        clientesIncluirPrecios: dataCruda.clientesIncluirPrecios || {},
        clientesCuentaEnPdf: dataCruda.clientesCuentaEnPdf || {},
        clientesSumarKgCatarro: dataCruda.clientesSumarKgCatarro || {},
        clientesPersonalizados: Array.isArray(dataCruda.clientesPersonalizados) ? dataCruda.clientesPersonalizados : [],
        embarqueBloqueado: record.embarqueBloqueado ?? dataCruda.embarqueBloqueado ?? false,
        costosPorMedida: dataCruda.costosPorMedida || {},
        aplicarCostoExtra: dataCruda.aplicarCostoExtra || {},
        costoExtra: typeof dataCruda.costoExtra === 'number' ? dataCruda.costoExtra : (this.costoExtra || 18),
        medidasConfiguracion: Array.isArray(dataCruda.medidasConfiguracion) ? dataCruda.medidasConfiguracion : [],
        preciosActuales: Array.isArray(dataCruda.preciosActuales) ? dataCruda.preciosActuales : [],
        medidaOculta: dataCruda.medidaOculta || record.medidaOculta || {},
        analizarGanancia: dataCruda.analizarGanancia || record.analizarGanancia || {},
        analizarGananciaCrudos: dataCruda.analizarGananciaCrudos || record.analizarGananciaCrudos || {},
        analizarMaquilaGanancia: dataCruda.analizarMaquilaGanancia || record.analizarMaquilaGanancia || {},
        precioMaquila: dataCruda.precioMaquila || record.precioMaquila || {},
        pesoTaraCosto: typeof dataCruda.pesoTaraCosto === 'number' ? dataCruda.pesoTaraCosto : (record.pesoTaraCosto ?? 19),
        pesoTaraVenta: typeof dataCruda.pesoTaraVenta === 'number' ? dataCruda.pesoTaraVenta : (record.pesoTaraVenta ?? 20),
        nombresMedidasPersonalizados: dataCruda.nombresMedidasPersonalizados || record.nombresMedidasPersonalizados || {},
        notaRendimientos: dataCruda.notaRendimientos || record.notaRendimientos || '',
        fecha: parseFecha(dataCruda.fecha || record.fecha || this.embarque.fecha),
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

      return data;
    },

    async sincronizarRegistroOffline(record) {
      if (!record || !record.id) {
        return;
      }

      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', record.id);
        const docData = record.docData || (record.id === this.embarqueId ? this.prepararDatosEmbarque() : null);
        const payload = this.normalizarDocDataParaFirestore(docData, record);

        const metadataUltimaEdicion = {
          userId: this.authStore.userId,
          username: this.authStore.user?.username || 'Usuario desconocido',
          timestamp: serverTimestamp()
        };

        const snapshot = await getDoc(embarqueRef);
        const dataRemota = snapshot.exists() ? (snapshot.data() || {}) : null;

        if (record.deleted && record.deletedByUser) {
          if (snapshot.exists()) {
            await deleteDoc(embarqueRef);
          }
          await EmbarquesOfflineService.hardDelete(record.id);
          return;
        }

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

      console.log('Cambios guardados localmente:', new Date().toLocaleString());
      this.$emit('guardado-automatico');
      return Promise.resolve();
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
        this.mostrarMensaje('Embarque guardado localmente. Recuerde subir los cambios para respaldar en la nube.');
      } catch (error) {
        console.error("Error al guardar localmente:", error);
        alert('Error al guardar localmente.');
      }
    },

    prepararDatosEmbarque() {
      const embarqueData = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        camionNumero: this.embarque.camionNumero || 1,
        kilosCrudos: this.embarque.kilosCrudos || {},
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
