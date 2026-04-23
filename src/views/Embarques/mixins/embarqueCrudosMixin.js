import { crearNuevoCrudoItem } from '@/constants.js/embarque';

export const embarqueCrudosMixin = {
  methods: {
    agregarCrudo(clienteId) {
      if (!this.clienteCrudos[clienteId]) {
        this.$set(this.clienteCrudos, clienteId, []);
      }
      this.clienteCrudos[clienteId].push({ items: [crearNuevoCrudoItem()] });
      this.guardarCambiosEnTiempoReal();
    },

    agregarCrudoItem(clienteId, index) {
      if (!this.clienteCrudos[clienteId]) {
        this.$set(this.clienteCrudos, clienteId, []);
      }
      if (!this.clienteCrudos[clienteId][index]) {
        this.$set(this.clienteCrudos[clienteId], index, { items: [] });
      }
      if (!Array.isArray(this.clienteCrudos[clienteId][index].items)) {
        this.$set(this.clienteCrudos[clienteId][index], 'items', []);
      }
      this.clienteCrudos[clienteId][index].items.push(crearNuevoCrudoItem());
      this.guardarCambiosEnTiempoReal();
    },

    eliminarCrudoItem(clienteId, crudoIndex, itemIndex) {
      if (!this.clienteCrudos[clienteId]) {
        console.error('Cliente no encontrado:', clienteId);
        return;
      }
      if (!this.clienteCrudos[clienteId][crudoIndex]) {
        console.error('Índice de crudo no válido:', crudoIndex);
        return;
      }
      if (!this.clienteCrudos[clienteId][crudoIndex].items) {
        console.error('El objeto crudo no tiene propiedad items');
        return;
      }
      this.clienteCrudos[clienteId][crudoIndex].items.splice(itemIndex, 1);
      if (this.clienteCrudos[clienteId][crudoIndex].items.length === 0) {
        this.eliminarCrudo(clienteId, crudoIndex);
      }
      this.guardarCambiosEnTiempoReal();
    },

    eliminarCrudo(index, clienteId) {
      if (!this.clienteCrudos[clienteId]) {
        console.error('Cliente no encontrado:', clienteId);
        return;
      }
      this.clienteCrudos[clienteId].splice(index, 1);
      if (this.clienteCrudos[clienteId].length === 0) {
        this.$delete(this.clienteCrudos, clienteId);
      }
      this.guardarCambiosEnTiempoReal();
    },

    toggleSobrante(clienteId, crudoIndex, itemIndex) {
      if (!this.clienteCrudos[clienteId]) {
        console.error('Cliente no encontrado:', clienteId);
        return;
      }
      if (!this.clienteCrudos[clienteId][crudoIndex]) {
        console.error('Índice de crudo no válido:', crudoIndex);
        return;
      }
      if (!this.clienteCrudos[clienteId][crudoIndex].items) {
        this.$set(this.clienteCrudos[clienteId][crudoIndex], 'items', []);
        console.error('El objeto crudo no tiene propiedad items');
        return;
      }
      if (!this.clienteCrudos[clienteId][crudoIndex].items[itemIndex]) {
        console.error('Índice de item no válido:', itemIndex);
        return;
      }
      const item = this.clienteCrudos[clienteId][crudoIndex].items[itemIndex];
      if (!Object.prototype.hasOwnProperty.call(item, 'mostrarSobrante')) {
        this.$set(item, 'mostrarSobrante', true);
      } else {
        item.mostrarSobrante = !item.mostrarSobrante;
      }
      this.guardarCambiosEnTiempoReal();
    },

    actualizarTotalCrudos(clienteId, index) {
      this.$forceUpdate();
      this.guardarCambiosEnTiempoReal();
    },

    actualizarCrudos() {
      this.guardarCambiosEnTiempoReal();
    },

    onRestarTarasChange(producto) {
      this.$nextTick(() => {
        this.actualizarProducto(producto);
      });
    },

    handleJuntarMedidasChange(clienteId, checked) {
      this.$set(this.clientesJuntarMedidas, clienteId, checked);
      if (this.modoEdicion && this.embarqueId) this.guardarCambiosEnTiempoReal();
    },

    handleReglaOtilioChange(clienteId, checked) {
      this.$set(this.clientesReglaOtilio, clienteId, checked);
      if (this.modoEdicion && this.embarqueId) this.guardarCambiosEnTiempoReal();
    },

    handleIncluirPreciosChange(clienteId, checked) {
      this.$set(this.clientesIncluirPrecios, clienteId, checked);
      if (!checked && this.clientesCuentaEnPdf[clienteId]) {
        this.$set(this.clientesCuentaEnPdf, clienteId, false);
      }
      if (this.modoEdicion && this.embarqueId) this.guardarCambiosEnTiempoReal();
    },

    handleCuentaEnPdfChange(clienteId, checked) {
      this.$set(this.clientesCuentaEnPdf, clienteId, checked);
      if (this.modoEdicion && this.embarqueId) this.guardarCambiosEnTiempoReal();
    },

    handleSumarKgCatarroChange(clienteId, checked) {
      this.$set(this.clientesSumarKgCatarro, clienteId, checked);
      if (this.modoEdicion && this.embarqueId) this.guardarCambiosEnTiempoReal();
    },
  },
};
