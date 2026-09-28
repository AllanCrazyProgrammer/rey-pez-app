// mixins/pdfGenerationMixin.js
import { generarNotaVentaPDF } from "@/utils/pdfGenerator";
import { generarResumenTarasPDF } from "@/utils/pdf/resumenTaras";
import { generarResumenEmbarquePDF } from "@/utils/pdf/resumenEmbarque";
import { nombreArchivoNota, periodoNota } from '@/utils/pdf/filename';
import { entregarPdf } from '@/utils/pdf/delivery';
import { generarRendimientosParaResumen } from '@/services/RendimientosReport';
import { guardarYRespaldarReporte } from '@/utils/pdf/reportDelivery';
import { encolarNotaDrive, driveNotasDisponible, agruparRespaldoDrive } from '@/services/DriveNotasSync';

export default {
  methods: {
    /**
     * Método general para generar cualquier tipo de PDF
     * @param {string} type - Tipo de PDF a generar ('cliente', 'taras', 'resumen', 'all')
     * @param {string} [clienteId] - ID del cliente (solo necesario para tipo 'cliente')
     */
    async generarPDF(type, clienteId = null, options = {}) {
      // Configurar indicador de carga
      this.$set(this, "isGeneratingPdf", true);
      this.$set(this, "pdfType", clienteId ? `${type}-${clienteId}` : type);

      try {
        switch (type) {
          case "cliente":
            await this.generarPDFCliente(clienteId);
            break;
          case "all":
            await this.generarPDFTodosClientes();
            break;
          case "taras":
            await this.generarPDFTaras();
            break;
          case "resumen":
            await this.generarPDFResumen(options.escala);
            break;
          default:
            throw new Error(`Tipo de PDF no soportado: ${type}`);
        }

        console.log(`PDF ${type} generado con éxito`);
      } catch (error) {
        console.error(`Error al generar PDF ${type}:`, error);
        alert(`Hubo un error al generar el PDF: ${error.message}`);
      } finally {
        // Ocultar indicador de carga
        this.$set(this, "isGeneratingPdf", false);
        this.$set(this, "pdfType", null);
      }
    },

    // Métodos privados para cada tipo específico de PDF
    async generarPDFCliente(clienteId) {
      const clienteProductos = this.productosPorCliente[clienteId];
      const clienteCrudos = this.clienteCrudos[clienteId];

      // Ordenar los productos antes de generar el PDF
      if (clienteProductos) {
        clienteProductos.forEach(producto => {
          if (producto.medida && producto.tipo) {
            producto.isEditing = false;
            producto.isNew = false;
          }
        });
      }

      const embarqueCliente = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: clienteProductos,
        clienteCrudos: { [clienteId]: clienteCrudos },
        kilosCrudos: this.embarque.kilosCrudos || {},
      };

      // Llamar directamente (importación estática) – funciona sin internet
      await generarNotaVentaPDF(
        embarqueCliente,
        this.clientesDisponibles,
        this.clientesJuntarMedidas,
        this.clientesReglaOtilio,
        this.clientesIncluirPrecios,
        this.clientesSumarKgCatarro,
        this.clientesCuentaEnPdf
      );
    },

    async generarPDFTodosClientes() {
      // Ordenar los productos antes de generar el PDF
      if (this.embarque.productos) {
        this.embarque.productos.forEach(producto => {
          if (producto.medida && producto.tipo) {
            producto.isEditing = false;
            producto.isNew = false;
          }
        });
      }

      const embarqueCliente = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: this.embarque.productos,
        clienteCrudos: this.clienteCrudos,
        kilosCrudos: this.embarque.kilosCrudos || {},
      };

      await generarNotaVentaPDF(
        embarqueCliente,
        this.clientesDisponibles,
        this.clientesJuntarMedidas,
        this.clientesReglaOtilio,
        this.clientesIncluirPrecios,
        this.clientesSumarKgCatarro,
        this.clientesCuentaEnPdf
      );
    },

    async generarPDFTaras() {
      const embarqueData = {
        id: this.embarqueId || this.embarque.id || this.$route?.params?.id,
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: this.embarque.productos,
        clienteCrudos: this.clienteCrudos,
      };

      return await generarResumenTarasPDF(embarqueData, this.clientesDisponibles);
    },

    async generarPDFResumen(escala = 100) {
      return agruparRespaldoDrive(() => this.generarPDFResumenCompleto(escala));
    },

    async generarPDFResumenCompleto(escala = 100) {
      // Obtener las medidas únicas de los crudos
      const medidasCrudos = new Set();
      Object.values(this.clienteCrudos).forEach((crudos) => {
        crudos.forEach((crudo) => {
          // Verificar que crudo no sea null y tenga la propiedad items
          if (crudo && crudo.items && Array.isArray(crudo.items)) {
            crudo.items.forEach((item) => {
              if (item.talla) {
                medidasCrudos.add(item.talla);
              }
            });
          }
        });
      });

      const embarqueData = this.prepararDatosResumenEmbarque(medidasCrudos);

      const resumen = await generarResumenEmbarquePDF(
        embarqueData,
        this.productosPorCliente,
        this.obtenerNombreCliente,
        this.clientesDisponibles,
        escala,
        { returnForDrive: true }
      );

      const embarqueId = String(this.embarqueId || this.embarque.id || this.$route?.params?.id || 'embarque');
      if (driveNotasDisponible()) {
        const { period, name, data } = resumen;
        const id = `resumen-${embarqueId.replace(/[^a-zA-Z0-9._:-]/g, '_')}-${period.year}-${period.month}-${period.day}`;
        await encolarNotaDrive({ id, name, period, data });
      }
      await entregarPdf(resumen.pdf, resumen.name, 'download', resumen.data, resumen.period);

      const fallosReportes = [];
      const datosReportes = { ...this.embarque, id: embarqueId, clienteCrudos: this.clienteCrudos };
      // Include clients with only crudos, and preserve the current editor values.
      const idsReportes = new Set([...Object.keys(this.productosPorCliente || {}), ...Object.keys(this.clienteCrudos || {})]);
      datosReportes.clientes = [...idsReportes].map(id => ({
        id, nombre: this.obtenerNombreCliente(id),
        productos: this.productosPorCliente?.[id] || [], crudos: this.clienteCrudos?.[id] || []
      }));
      for (const tipo of ['taras', 'rendimientos']) {
        try {
          const reporte = tipo === 'taras'
            ? await generarResumenTarasPDF(datosReportes, this.clientesDisponibles, { returnForDrive: true })
            : await generarRendimientosParaResumen(datosReportes);
          await guardarYRespaldarReporte(tipo, datosReportes, reporte.data, { name: reporte.name });
        } catch (error) {
          fallosReportes.push(`${tipo}: ${error.message}`);
        }
      }

      if (driveNotasDisponible()) {
        const clientes = Array.isArray(this.clientesDisponibles) ? this.clientesDisponibles : [];
        const clientIds = new Set([
          ...Object.keys(this.productosPorCliente || {}).filter(id => (this.productosPorCliente[id] || []).length),
          ...Object.entries(this.clienteCrudos || {}).filter(([, crudos]) => Array.isArray(crudos) && crudos.length).map(([id]) => id)
        ]);
        const fallos = [...fallosReportes];
        const periodo = periodoNota(this.embarque);

        for (const clienteId of clientIds) {
          try {
            const productos = this.productosPorCliente?.[clienteId] || [];
            const crudos = this.clienteCrudos?.[clienteId] || [];
            const datosNota = {
              ...this.embarque,
              productos: productos.map(producto => ({ ...producto, clienteId: producto.clienteId || clienteId })),
              clienteCrudos: { [clienteId]: crudos },
              kilosCrudos: this.embarque.kilosCrudos || {}
            };
            const clientesNota = clientes.some(cliente => String(cliente.id) === String(clienteId))
              ? clientes
              : [...clientes, { id: clienteId, nombre: this.obtenerNombreCliente(clienteId) }];
            const nota = await generarNotaVentaPDF(
              datosNota,
              clientesNota,
              this.clientesJuntarMedidas,
              this.clientesReglaOtilio,
              this.clientesIncluirPrecios,
              this.clientesSumarKgCatarro,
              this.clientesCuentaEnPdf,
              { returnForDrive: true }
            );
            if (!nota?.data?.byteLength) throw new Error('La nota quedó vacía.');
            const id = `${embarqueId}-${String(clienteId).replace(/[^a-zA-Z0-9._:-]/g, '_')}-${periodo.year}-${periodo.month}-${periodo.day}`;
            await encolarNotaDrive({ id, name: nombreArchivoNota(datosNota, clientesNota), period: periodo, data: nota.data });
          } catch (error) {
            console.error('[Drive] No se pudo preparar la nota del cliente:', clienteId, error);
            fallos.push(this.obtenerNombreCliente(clienteId) || clienteId);
          }
        }
        if (fallos.length) {
          throw new Error(`El resumen está listo, pero no se pudieron preparar todos los PDF: ${fallos.join(', ')}.`);
        }
      }
    },

    async generarPDFResumenConEscala() {
      const escala = Number(this.escalaResumen) || 100;

      if (typeof this.verificarCuentasResumenAntesDeGenerar === 'function') {
        const puedeContinuar = await this.verificarCuentasResumenAntesDeGenerar(escala);
        if (!puedeContinuar) return;
      }

      await this.generarPDF("resumen", null, { escala });
      this.mostrarEscalaResumen = false;
    },

    // Método auxiliar para preparar datos del resumen de embarque
    prepararDatosResumenEmbarque(medidasCrudos) {
      return {
        ...this.embarque,
        crudos: Object.entries(this.clienteCrudos).flatMap(
          ([clienteId, crudos]) =>
            crudos.flatMap((crudo) => {
              // Si crudo es null o no tiene items, devolver un array vacío
              if (!crudo || !crudo.items || !Array.isArray(crudo.items)) {
                return [];
              }
              
              return crudo.items.map((item) => {
                const tarasArray = [];

                // Agregar taras principales
                if (item.taras) {
                  tarasArray.push(item.taras);
                }

                // Agregar sobrante si existe
                if (item.sobrante) {
                  tarasArray.push(item.sobrante);
                }

                // Agregar segundo sobrante si existe
                if (item.sobrante2) {
                  tarasArray.push(item.sobrante2);
                }

                return {
                  clienteId,
                  medida: item.talla,
                  taras: tarasArray,
                  barco: item.barco,
                  textoAlternativo: item.textoAlternativo,
                  precio: item.precio
                };
              });
            })
        ),
        medidasCrudos: Array.from(medidasCrudos),
      };
    },
  },
};
