// mixins/pdfGenerationMixin.js
export default {
  methods: {
    /**
     * Método general para generar cualquier tipo de PDF
     * @param {string} type - Tipo de PDF a generar ('cliente', 'taras', 'resumen', 'all')
     * @param {string} [clienteId] - ID del cliente (solo necesario para tipo 'cliente')
     */
    async generarPDF(type, clienteId = null) {
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
            await this.generarPDFResumen();
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

      const embarqueCliente = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: clienteProductos,
        clienteCrudos: { [clienteId]: clienteCrudos },
        kilosCrudos: this.embarque.kilosCrudos || {},
      };

      // Importar dinámicamente solo cuando se necesita
      const { generarNotaVentaPDF } = await import("@/utils/pdfGenerator");
      generarNotaVentaPDF(
        embarqueCliente,
        this.clientesDisponibles,
        this.clientesJuntarMedidas
      );
    },

    async generarPDFTodosClientes() {
      const embarqueCliente = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: this.embarque.productos,
        clienteCrudos: this.clienteCrudos,
        kilosCrudos: this.embarque.kilosCrudos || {},
      };

      const { generarNotaVentaPDF } = await import("@/utils/pdfGenerator");
      generarNotaVentaPDF(
        embarqueCliente,
        this.clientesDisponibles,
        this.clientesJuntarMedidas
      );
    },

    async generarPDFTaras() {
      const embarqueData = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: this.embarque.productos,
        clienteCrudos: this.clienteCrudos,
      };

      const { generarResumenTarasPDF } = await import(
        "@/utils/resumenTarasPdf"
      );
      generarResumenTarasPDF(embarqueData, this.clientesDisponibles);
    },

    async generarPDFResumen() {
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

      const { generarResumenEmbarquePDF } = await import(
        "@/utils/resumenEmbarque2"
      );
      generarResumenEmbarquePDF(
        embarqueData,
        this.productosPorCliente,
        this.obtenerNombreCliente,
        this.clientesDisponibles
      );
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

                return {
                  clienteId,
                  medida: item.talla,
                  taras: tarasArray,
                  barco: item.barco,
                  textoAlternativo: item.textoAlternativo,
                };
              });
            })
        ),
        medidasCrudos: Array.from(medidasCrudos),
      };
    },
  },
};
