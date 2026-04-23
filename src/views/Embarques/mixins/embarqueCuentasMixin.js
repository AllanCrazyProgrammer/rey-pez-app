import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';

export const embarqueCuentasMixin = {
  data() {
    return {
      isCreatingAccount: false,
    };
  },

  methods: {
    esClienteJoselito(clienteId) {
      const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      return clienteInfo && clienteInfo.nombre.toLowerCase().includes('joselito');
    },

    esClienteCatarro(clienteId) {
      const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      return clienteInfo && clienteInfo.nombre.toLowerCase().includes('catarro');
    },

    esClienteVeronica(clienteId) {
      const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      return (
        clienteInfo &&
        (clienteInfo.nombre.toLowerCase().includes('veronica') ||
          clienteInfo.nombre.toLowerCase().includes('lorena'))
      );
    },

    obtenerEmbarqueCliente(clienteId) {
      const clienteProductos = this.productosPorCliente[clienteId];
      const clienteCrudos = this.clienteCrudos[clienteId];
      return {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: clienteProductos,
        clienteCrudos: { [clienteId]: clienteCrudos },
        kilosCrudos: this.embarque.kilosCrudos || {},
      };
    },

    async crearCuentaJoselito(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        const embarqueCliente = {
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { '1': clienteCrudos },
          productosTotales: this.embarque.productos,
          clienteCrudosTotales: this.clienteCrudos,
          costosPorMedida: { ...this.costosPorMedida },
          aplicarCostoExtra: { ...this.aplicarCostoExtra },
          costoExtra: this.costoExtra,
        };
        await EmbarqueCuentasService.crearCuentaJoselito(embarqueCliente, this.$router);
      } catch (error) {
        console.error('Error al crear cuenta para Joselito:', error);
        alert('Error al crear cuenta para Joselito');
      } finally {
        this.isCreatingAccount = false;
      }
    },

    async crearCuentaCatarro(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        const embarqueCliente = {
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { '2': clienteCrudos },
          productosTotales: this.embarque.productos,
          clienteCrudosTotales: this.clienteCrudos,
          costosPorMedida: { ...this.costosPorMedida },
          aplicarCostoExtra: { ...this.aplicarCostoExtra },
          costoExtra: this.costoExtra,
        };
        await EmbarqueCuentasService.crearCuentaCatarro(embarqueCliente, this.$router);
        alert('Cuenta de Catarro creada exitosamente y abierta en una nueva pestaña.');
      } catch (error) {
        console.error('Error al crear cuenta para Catarro:', error);
        alert(`Error al crear cuenta para Catarro: ${error.message}`);
      } finally {
        this.isCreatingAccount = false;
      }
    },

    async crearCuentaOzuna(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        const embarqueCliente = {
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { '4': clienteCrudos },
          productosTotales: this.embarque.productos,
          clienteCrudosTotales: this.clienteCrudos,
          costosPorMedida: { ...this.costosPorMedida },
          aplicarCostoExtra: { ...this.aplicarCostoExtra },
          costoExtra: this.costoExtra,
        };
        await EmbarqueCuentasService.crearCuentaOzuna(embarqueCliente, this.$router);
        alert('Cuenta de Ozuna creada exitosamente y abierta en una nueva pestaña.');
      } catch (error) {
        console.error('Error al crear cuenta para Ozuna:', error);
        alert(`Error al crear cuenta para Ozuna: ${error.message}`);
      } finally {
        this.isCreatingAccount = false;
      }
    },

    async crearCuentaOtilio(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        const embarqueCliente = {
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { '3': clienteCrudos },
          productosTotales: this.embarque.productos,
          clienteCrudosTotales: this.clienteCrudos,
          costosPorMedida: { ...this.costosPorMedida },
          aplicarCostoExtra: { ...this.aplicarCostoExtra },
          costoExtra: this.costoExtra,
        };
        await EmbarqueCuentasService.crearCuentaOtilio(embarqueCliente, this.$router);
        alert('Cuenta de Otilio creada exitosamente y abierta en una nueva pestaña.');
      } catch (error) {
        console.error('Error al crear cuenta para Otilio:', error);
        alert(`Error al crear cuenta para Otilio: ${error.message}`);
      } finally {
        this.isCreatingAccount = false;
      }
    },

    async crearCuentaVeronica(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        const embarqueCliente = {
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { '5': clienteCrudos },
          productosTotales: this.embarque.productos,
          clienteCrudosTotales: this.clienteCrudos,
          costosPorMedida: { ...this.costosPorMedida },
          aplicarCostoExtra: { ...this.aplicarCostoExtra },
          costoExtra: this.costoExtra,
        };
        await EmbarqueCuentasService.crearCuentaVeronica(embarqueCliente, this.$router);
        alert('Cuenta de Veronica creada exitosamente y abierta en una nueva pestaña.');
      } catch (error) {
        console.error('Error al crear cuenta para Veronica:', error);
        alert(`Error al crear cuenta para Veronica: ${error.message}`);
      } finally {
        this.isCreatingAccount = false;
      }
    },
  },
};
