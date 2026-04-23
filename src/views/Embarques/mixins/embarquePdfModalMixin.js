import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { normalizarFechaISO } from '@/utils/dateUtils';
import { generarNotaVentaPDF } from '@/utils/pdfGenerator';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';

export const embarquePdfModalMixin = {
  data() {
    return {
      mostrarModalGenerarPdfCliente: false,
      modalGenerarPdf: {
        fecha: '',
        embarques: [],
        embarqueId: '',
        clienteId: '',
        clientes: [],
        cargando: false,
        error: '',
      },
      mostrarModalNotasMultiple: false,
      modalNotasMultiple: {
        seleccionados: [],
        opciones: {},
      },
    };
  },

  methods: {
    async cargarEmbarquesModalPdf(preselectedClientId = null) {
      if (!this.modalGenerarPdf.fecha) {
        this.modalGenerarPdf.error = 'Selecciona una fecha para buscar embarques.';
        return;
      }

      this.modalGenerarPdf.cargando = true;
      this.modalGenerarPdf.error = '';

      try {
        const embarques = await this.buscarEmbarquesPorFecha(this.modalGenerarPdf.fecha);
        this.modalGenerarPdf.embarques = embarques;

        if (embarques.length > 0) {
          this.modalGenerarPdf.embarqueId = embarques[0].id;
          this.actualizarClientesModal(preselectedClientId);
        } else {
          this.modalGenerarPdf.embarqueId = '';
          this.modalGenerarPdf.clientes = [];
          this.modalGenerarPdf.clienteId = '';
          this.modalGenerarPdf.error = 'No se encontraron embarques para esa fecha.';
        }
      } catch (error) {
        console.error('[Modal PDF] Error al cargar embarques:', error);
        this.modalGenerarPdf.error = 'No se pudieron cargar los embarques. Intenta de nuevo.';
      } finally {
        this.modalGenerarPdf.cargando = false;
      }
    },

    async buscarEmbarquesPorFecha(fecha) {
      const fechaISO = normalizarFechaISO(fecha);
      const coincidencias = new Map();

      try {
        await EmbarquesOfflineService.init();
        const registrosOffline = await EmbarquesOfflineService.getAll();
        registrosOffline.forEach(registro => {
          if (normalizarFechaISO(registro.fecha) === fechaISO) {
            coincidencias.set(registro.id, this.normalizarEmbarqueParaModal(registro));
          }
        });
      } catch (error) {
        console.warn('[Modal PDF] No se pudo leer embarques offline:', error);
      }

      if (coincidencias.size === 0) {
        try {
          const db = getFirestore();
          const embarquesRef = collection(db, 'embarques');
          const snapshot = await getDocs(embarquesRef);
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const fechaDoc = data.fecha && typeof data.fecha.toDate === 'function'
              ? data.fecha.toDate()
              : data.fecha;
            if (normalizarFechaISO(fechaDoc) === fechaISO) {
              coincidencias.set(docSnap.id, this.normalizarEmbarqueParaModal({ id: docSnap.id, ...data }));
            }
          });
        } catch (error) {
          console.error('[Modal PDF] Error al consultar embarques remotos:', error);
          throw error;
        }
      }

      return Array.from(coincidencias.values())
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    },

    normalizarEmbarqueParaModal(registro) {
      const fechaFuente = registro.fecha && registro.fecha.seconds
        ? new Date(registro.fecha.seconds * 1000)
        : registro.fecha || registro.fechaISO;

      return {
        id: registro.id,
        fecha: normalizarFechaISO(fechaFuente),
        cargaCon: registro.cargaCon || registro.docData?.cargaCon || '',
        camionNumero: registro.camionNumero || registro.docData?.camionNumero || 1,
        clientes: registro.clientes || registro.docData?.clientes || [],
        clientesJuntarMedidas: registro.clientesJuntarMedidas || registro.docData?.clientesJuntarMedidas || {},
        clientesReglaOtilio: registro.clientesReglaOtilio || registro.docData?.clientesReglaOtilio || {},
        clientesIncluirPrecios: registro.clientesIncluirPrecios || registro.docData?.clientesIncluirPrecios || {},
        clientesSumarKgCatarro: registro.clientesSumarKgCatarro || registro.docData?.clientesSumarKgCatarro || {},
        clientesCuentaEnPdf: registro.clientesCuentaEnPdf || registro.docData?.clientesCuentaEnPdf || {},
        productos: registro.productos || registro.docData?.productos || [],
        clienteCrudos: registro.clienteCrudos || registro.crudos || registro.docData?.clienteCrudos || {},
        kilosCrudos: registro.kilosCrudos || registro.docData?.kilosCrudos || {},
      };
    },

    actualizarClientesModal(preselectedClientId = null) {
      const embarqueSeleccionado = this.modalGenerarPdf.embarques.find(
        e => e.id === this.modalGenerarPdf.embarqueId
      );

      if (!embarqueSeleccionado) {
        this.modalGenerarPdf.clientes = [];
        this.modalGenerarPdf.clienteId = '';
        return;
      }

      let clientes = [];

      if (Array.isArray(embarqueSeleccionado.clientes) && embarqueSeleccionado.clientes.length) {
        clientes = embarqueSeleccionado.clientes
          .map(cliente => ({
            id: cliente.id?.toString(),
            nombre: cliente.nombre || cliente.nombreNotas || this.obtenerNombreCliente(cliente.id),
          }))
          .filter(c => c.id);
      } else if (Array.isArray(embarqueSeleccionado.productos)) {
        const mapa = new Map();
        embarqueSeleccionado.productos.forEach(producto => {
          const id = (producto.clienteId || producto.cliente || producto.idCliente || '').toString();
          if (!id || mapa.has(id)) return;
          mapa.set(id, { id, nombre: producto.nombreCliente || this.obtenerNombreCliente(id) });
        });
        clientes = Array.from(mapa.values());
      }

      this.modalGenerarPdf.clientes = clientes;

      if (clientes.length > 0) {
        const candidato = preselectedClientId && clientes.some(c => c.id === preselectedClientId.toString())
          ? preselectedClientId.toString()
          : clientes[0].id;
        this.modalGenerarPdf.clienteId = candidato;
      } else {
        this.modalGenerarPdf.clienteId = '';
      }
    },

    onCambioFechaModalPdf(fecha) {
      this.modalGenerarPdf.fecha = fecha;
      this.cargarEmbarquesModalPdf(this.modalGenerarPdf.clienteId || null);
    },

    onSeleccionEmbarqueModal(embarqueId) {
      this.modalGenerarPdf.embarqueId = embarqueId;
      this.actualizarClientesModal(this.modalGenerarPdf.clienteId || null);
    },

    cerrarModalGenerarPdfCliente() {
      this.mostrarModalGenerarPdfCliente = false;
      this.modalGenerarPdf = {
        fecha: '',
        embarques: [],
        embarqueId: '',
        clienteId: '',
        clientes: [],
        cargando: false,
        error: '',
      };
    },

    async generarPdfDesdeModal() {
      if (!this.modalGenerarPdf.embarqueId || !this.modalGenerarPdf.clienteId) {
        this.modalGenerarPdf.error = 'Selecciona un embarque y un cliente para continuar.';
        return;
      }

      const clienteId = this.modalGenerarPdf.clienteId.toString();
      const embarqueSeleccionado = this.modalGenerarPdf.embarques.find(
        e => e.id === this.modalGenerarPdf.embarqueId
      );

      if (!embarqueSeleccionado) {
        this.modalGenerarPdf.error = 'No se encontró el embarque seleccionado.';
        return;
      }

      const clienteGuardado = Array.isArray(embarqueSeleccionado.clientes)
        ? embarqueSeleccionado.clientes.find(c => c.id?.toString() === clienteId)
        : null;

      const productosCliente = clienteGuardado?.productos
        || (embarqueSeleccionado.productos || []).filter(
          producto => (producto.clienteId || '').toString() === clienteId
        );

      if (!productosCliente || productosCliente.length === 0) {
        this.modalGenerarPdf.error = 'El embarque seleccionado no tiene productos para ese cliente.';
        return;
      }

      const crudosCliente = clienteGuardado?.crudos
        || embarqueSeleccionado.clienteCrudos?.[clienteId]
        || embarqueSeleccionado.crudos?.[clienteId]
        || [];

      const embarqueCliente = {
        fecha: embarqueSeleccionado.fecha,
        cargaCon: embarqueSeleccionado.cargaCon,
        productos: productosCliente,
        clienteCrudos: { [clienteId]: crudosCliente },
        kilosCrudos: embarqueSeleccionado.kilosCrudos || {},
      };

      const clientesLista = (Array.isArray(embarqueSeleccionado.clientes) && embarqueSeleccionado.clientes.length)
        ? embarqueSeleccionado.clientes.map(c => ({
            id: c.id,
            nombre: c.nombre || c.nombreNotas || this.obtenerNombreCliente(c.id),
            nombreNotas: c.nombreNotas,
          }))
        : this.clientesDisponibles;

      this.isGeneratingPdf = true;
      this.pdfType = `cliente-${clienteId}-historico`;
      this.modalGenerarPdf.error = '';

      try {
        await generarNotaVentaPDF(
          embarqueCliente,
          clientesLista,
          embarqueSeleccionado.clientesJuntarMedidas || {},
          embarqueSeleccionado.clientesReglaOtilio || {},
          embarqueSeleccionado.clientesIncluirPrecios || {},
          embarqueSeleccionado.clientesSumarKgCatarro || {},
          embarqueSeleccionado.clientesCuentaEnPdf || {}
        );
        this.cerrarModalGenerarPdfCliente();
      } catch (error) {
        console.error('[Modal PDF] Error al generar PDF:', error);
        this.modalGenerarPdf.error = 'No se pudo generar el PDF. Inténtalo de nuevo.';
      } finally {
        this.isGeneratingPdf = false;
        this.pdfType = null;
      }
    },

    abrirModalNotasMultiple() {
      const clientes = this.clientesConMedidasRegistradas;
      this.modalNotasMultiple = {
        seleccionados: clientes.map(cliente => cliente.id),
        opciones: {},
      };
      clientes.forEach(cliente => {
        const incluirPrecios = this.clientesIncluirPrecios?.[cliente.id] ?? false;
        const cuentaEnPdf = this.clientesCuentaEnPdf?.[cliente.id] ?? false;
        this.$set(this.modalNotasMultiple.opciones, cliente.id, {
          incluirPrecios: !!incluirPrecios,
          cuentaEnPdf: !!(incluirPrecios && cuentaEnPdf),
        });
      });
      this.mostrarModalNotasMultiple = true;
    },

    cerrarModalNotasMultiple() {
      this.mostrarModalNotasMultiple = false;
    },

    actualizarSeleccionNotasMultiple(seleccion) {
      this.modalNotasMultiple.seleccionados = Array.isArray(seleccion) ? seleccion : [];
    },

    actualizarOpcionesNotasMultiple(opciones) {
      this.modalNotasMultiple.opciones = opciones || {};
    },

    async generarNotasPdfMultiples() {
      const seleccionados = (this.modalNotasMultiple.seleccionados || []).filter(id =>
        this.clientesConMedidasRegistradas.some(cliente => cliente.id.toString() === id.toString())
      );

      if (!seleccionados.length) {
        alert('Selecciona al menos un cliente con medidas para generar las notas.');
        return;
      }

      this.isGeneratingPdf = true;
      this.pdfType = 'multi-notas';

      try {
        for (const clienteId of seleccionados) {
          const opciones = this.modalNotasMultiple.opciones?.[clienteId] || {};
          const incluirPrecios = !!opciones.incluirPrecios;
          const cuentaEnPdf = incluirPrecios ? !!opciones.cuentaEnPdf : false;
          this.$set(this.clientesIncluirPrecios, clienteId, incluirPrecios);
          this.$set(this.clientesCuentaEnPdf, clienteId, cuentaEnPdf);
          await this.generarPDFCliente(clienteId);
        }
        this.cerrarModalNotasMultiple();
      } catch (error) {
        console.error('[Notas PDF múltiples] Error:', error);
        alert('No se pudieron generar todas las notas PDF. Intenta nuevamente.');
      } finally {
        this.isGeneratingPdf = false;
        this.pdfType = null;
      }
    },
  },
};
