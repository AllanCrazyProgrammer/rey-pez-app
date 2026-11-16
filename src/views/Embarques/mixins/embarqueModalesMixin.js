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
    /**
     * El renglón que abrió el cuadro debe seguir siendo el que está en el
     * embarque. Los cambios de otras personas se aplican en sitio (el objeto
     * conserva su identidad), pero si alguien lo ELIMINÓ mientras el cuadro
     * estaba abierto, guardar sobre el objeto huérfano perdería el dato sin
     * aviso. Devuelve false (y avisa) si ya no existe.
     */
    reengancharSeleccionModal(propiedad) {
      const item = this[propiedad];
      if (!item) return false;
      const productos = (this.embarque && this.embarque.productos) || [];
      const grupos = Object.values(this.clienteCrudos || {}).reduce((lista, g) => lista.concat(g || []), []);
      const items = grupos.reduce((lista, g) => lista.concat((g && g.items) || []), []);
      const candidatos = [...productos, ...grupos, ...items];
      let vigente = candidatos.includes(item) ? item : null;
      if (!vigente && item.id !== undefined && item.id !== null) {
        vigente = candidatos.find(candidato => candidato && candidato.id === item.id) || null;
      }
      if (!vigente) {
        alert('Ese renglón ya no está en el embarque: otra persona lo eliminó mientras tenías el cuadro abierto. No se guardó el cambio.');
        return false;
      }
      this[propiedad] = vigente;
      return true;
    },

    // Modal NombreAlternativo
    abrirModalNombreAlternativo(producto) {
      this.productoSeleccionado = producto;
      this.productoNombreAlternativoEnEdicionId = producto?.id || null;
      this.mostrarModalNombreAlternativo = true;
    },

    cerrarModalNombreAlternativo() {
      if (this.productoNombreAlternativoEnEdicionId) {
        this.nombreAlternativoPendienteSync.delete(this.productoNombreAlternativoEnEdicionId);
        this.productoNombreAlternativoEnEdicionId = null;
      }
      this.mostrarModalNombreAlternativo = false;
      this.productoSeleccionado = null;
    },

    async guardarNombreAlternativo(nuevoNombre) {
      if (!this.productoSeleccionado || !this.reengancharSeleccionModal('productoSeleccionado')) {
        this.cerrarModalNombreAlternativo();
        return;
      }
      const productoActual = this.productoSeleccionado;

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
      if (!this.itemSeleccionado || !this.reengancharSeleccionModal('itemSeleccionado')) {
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
            this.$set(this.itemSeleccionado, 'precioOrigen', 'maquila');
            this.$set(this.itemSeleccionado, 'precioClienteId', 'ozuna');
          } else {
            this.$set(this.itemSeleccionado, 'precioOrigen', 'manual');
            this.$set(this.itemSeleccionado, 'precioClienteId', clienteId || null);
          }
          this.$set(this.itemSeleccionado, 'precioFecha', null);
          this.$set(this.itemSeleccionado, 'precioMedidaBase', this.itemSeleccionado.medida || this.itemSeleccionado.talla || '');
        } else {
          if (esOzunaMaquila) {
            this.$delete(this.itemSeleccionado, 'precioMaquila');
            this.$set(this.itemSeleccionado, 'precio', this.precioMaquilaOzunaDefault);
            this.$set(this.itemSeleccionado, 'precioBorradoManualmente', false);
            this.$set(this.itemSeleccionado, 'precioOrigen', 'maquila');
            this.$set(this.itemSeleccionado, 'precioClienteId', 'ozuna');
            this.$set(this.itemSeleccionado, 'precioFecha', this.embarque?.fecha || null);
            this.$set(this.itemSeleccionado, 'precioMedidaBase', this.itemSeleccionado.medida || this.itemSeleccionado.talla || '');
          } else {
            this.$delete(this.itemSeleccionado, 'precio');
            this.$set(this.itemSeleccionado, 'precioBorradoManualmente', true);
            ['precioOrigen', 'precioClienteId', 'precioFecha', 'precioMedidaBase'].forEach((campo) => {
              this.$delete(this.itemSeleccionado, campo);
            });
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
      if (!this.itemSeleccionado || !this.reengancharSeleccionModal('itemSeleccionado')) {
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
      if (!this.itemSeleccionado || !this.reengancharSeleccionModal('itemSeleccionado')) {
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
      if (!this.itemSeleccionado || !this.reengancharSeleccionModal('itemSeleccionado')) {
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
