export const embarqueModalesMixin = {
  data() {
    return {
      mostrarModalNombreAlternativo: false,
      nombreAlternativoTemp: '',
      productoSeleccionado: null,

      mostrarModalPrecio: false,
      precioTemp: '',
      itemSeleccionado: null,

      mostrarModalHilos: false,
      hilosTemp: '',

      mostrarModalNota: false,
      notaTemp: '',

      mostrarModalAlt: false,
      altTemp: '',

      guardandoModal: false,
    };
  },

  methods: {
    // Modal NombreAlternativo
    abrirModalNombreAlternativo(producto) {
      this.productoSeleccionado = producto;
      this.productoNombreAlternativoEnEdicionId = producto?.id || null;
      if (this.productoNombreAlternativoEnEdicionId) {
        this.marcarCampoEnEdicion(this.productoNombreAlternativoEnEdicionId, 'nombreAlternativoPDF');
      }
      this.mostrarModalNombreAlternativo = true;
    },

    cerrarModalNombreAlternativo() {
      if (this.productoNombreAlternativoEnEdicionId) {
        this.desmarcarCampoEnEdicion(this.productoNombreAlternativoEnEdicionId, 'nombreAlternativoPDF');
        this.nombreAlternativoPendienteSync.delete(this.productoNombreAlternativoEnEdicionId);
        this.productoNombreAlternativoEnEdicionId = null;
      }
      this.mostrarModalNombreAlternativo = false;
      this.productoSeleccionado = null;
    },

    async guardarNombreAlternativo(nuevoNombre) {
      const productoActual = this.productoSeleccionado;
      if (!productoActual) {
        this.cerrarModalNombreAlternativo();
        return;
      }

      const clienteId = productoActual.clienteId;

      if (nuevoNombre) {
        this.$set(productoActual, 'nombreAlternativoPDF', nuevoNombre);
      } else {
        this.$delete(productoActual, 'nombreAlternativoPDF');
      }

      this.nombreAlternativoPendienteSync.set(productoActual.id, nuevoNombre || null);

      if (clienteId) {
        this.$set(this.clientesModificados, clienteId, true);
      }

      this.$forceUpdate();
      this.mostrarModalNombreAlternativo = false;

      try {
        await this.$nextTick();
        await this.guardarCambiosEnTiempoReal(true);
      } finally {
        if (this.productoNombreAlternativoEnEdicionId) {
          this.desmarcarCampoEnEdicion(this.productoNombreAlternativoEnEdicionId, 'nombreAlternativoPDF');
          this.productoNombreAlternativoEnEdicionId = null;
        }
        this.productoSeleccionado = null;
      }
    },

    // Modal Precio
    abrirModalPrecio(item) {
      this.itemSeleccionado = item;
      this.mostrarModalPrecio = true;
    },

    cerrarModalPrecio() {
      this.mostrarModalPrecio = false;
      this.itemSeleccionado = null;
    },

    async guardarPrecio(precio) {
      if (!this.itemSeleccionado) {
        this.cerrarModalPrecio();
        return;
      }

      this.guardandoModal = true;
      try {
        const clienteId = this.itemSeleccionado.clienteId;
        const nombreClienteModal = (
          this.obtenerNombreCliente(clienteId) ||
          this.itemSeleccionado.nombreCliente ||
          ''
        ).toString().trim().toLowerCase();
        const esOzunaMaquila = nombreClienteModal === 'ozuna' && !this.itemSeleccionado.esVenta;

        if (precio !== null) {
          this.$set(this.itemSeleccionado, 'precio', precio);
          this.$set(this.itemSeleccionado, 'precioBorradoManualmente', false);
          if (esOzunaMaquila) {
            this.$set(this.itemSeleccionado, 'precioMaquila', precio);
          }
        } else {
          if (esOzunaMaquila) {
            this.$delete(this.itemSeleccionado, 'precioMaquila');
            this.$set(this.itemSeleccionado, 'precio', this.precioMaquilaOzunaDefault);
            this.$set(this.itemSeleccionado, 'precioBorradoManualmente', false);
          } else {
            this.$delete(this.itemSeleccionado, 'precio');
            this.$set(this.itemSeleccionado, 'precioBorradoManualmente', true);
          }
        }

        if (clienteId) {
          this.$set(this.clientesModificados, clienteId, true);
        }

        this.$forceUpdate();
        await this.$nextTick();
        await this.guardarCambiosEnTiempoReal(true, { desdeModal: true, immediate: true, merge: false });
        this.cerrarModalPrecio();
      } catch (error) {
        console.error('[guardarPrecio] Error al guardar:', error);
        alert('Error al guardar el precio. Por favor, inténtelo de nuevo.');
      } finally {
        this.guardandoModal = false;
      }
    },

    // Modal Hilos
    abrirModalHilos(item) {
      this.itemSeleccionado = item;
      this.mostrarModalHilos = true;
    },

    cerrarModalHilos() {
      this.mostrarModalHilos = false;
      this.itemSeleccionado = null;
    },

    async guardarHilos(hilos) {
      if (!this.itemSeleccionado) {
        this.cerrarModalHilos();
        return;
      }

      this.guardandoModal = true;
      try {
        const clienteId = this.itemSeleccionado.clienteId;

        if (!hilos) {
          this.$delete(this.itemSeleccionado, 'hilos');
        } else {
          this.$set(this.itemSeleccionado, 'hilos', hilos);
        }

        if (clienteId) {
          this.$set(this.clientesModificados, clienteId, true);
        }

        this.$forceUpdate();
        await this.$nextTick();
        await this.guardarCambiosEnTiempoReal(true, { desdeModal: true, immediate: true, merge: false });
        this.cerrarModalHilos();
      } catch (error) {
        console.error('[guardarHilos] Error al guardar:', error);
        alert('Error al guardar los hilos. Por favor, inténtelo de nuevo.');
      } finally {
        this.guardandoModal = false;
      }
    },

    // Modal Nota
    abrirModalNota(item) {
      this.itemSeleccionado = item;
      this.mostrarModalNota = true;
    },

    cerrarModalNota() {
      this.mostrarModalNota = false;
      this.itemSeleccionado = null;
    },

    async guardarNota(nota) {
      if (!this.itemSeleccionado) {
        this.cerrarModalNota();
        return;
      }

      this.guardandoModal = true;
      try {
        const clienteId = this.itemSeleccionado.clienteId;

        if (nota) {
          this.$set(this.itemSeleccionado, 'nota', nota);
        } else {
          this.$delete(this.itemSeleccionado, 'nota');
        }

        if (clienteId) {
          this.$set(this.clientesModificados, clienteId, true);
        }

        this.$forceUpdate();
        await this.$nextTick();
        await this.guardarCambiosEnTiempoReal(true, { desdeModal: true, immediate: true, merge: false });
        this.cerrarModalNota();
      } catch (error) {
        console.error('[guardarNota] Error al guardar:', error);
        alert('Error al guardar la nota. Por favor, inténtelo de nuevo.');
      } finally {
        this.guardandoModal = false;
      }
    },

    // Modal Alt
    abrirModalAlt(item) {
      this.itemSeleccionado = item;
      this.mostrarModalAlt = true;
    },

    cerrarModalAlt() {
      this.mostrarModalAlt = false;
      this.itemSeleccionado = null;
    },

    async guardarAlt(alt) {
      if (!this.itemSeleccionado) {
        this.cerrarModalAlt();
        return;
      }

      this.guardandoModal = true;
      try {
        const clienteId = this.itemSeleccionado.clienteId;

        if (alt) {
          this.$set(this.itemSeleccionado, 'textoAlternativo', alt);
        } else {
          this.$delete(this.itemSeleccionado, 'textoAlternativo');
        }

        if (clienteId) {
          this.$set(this.clientesModificados, clienteId, true);
        }

        this.$forceUpdate();
        await this.$nextTick();
        await this.guardarCambiosEnTiempoReal(true, { desdeModal: true, immediate: true, merge: false });
        this.cerrarModalAlt();
      } catch (error) {
        console.error('[guardarAlt] Error al guardar:', error);
        alert('Error al guardar el texto alternativo. Por favor, inténtelo de nuevo.');
      } finally {
        this.guardandoModal = false;
      }
    },
  },
};
