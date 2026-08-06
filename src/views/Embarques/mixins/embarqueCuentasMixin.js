import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';
import { ozunaCuentas, veronicaCuentas } from '@/services/cuentas.service';
import { normalizarFechaISO } from '@/utils/dateUtils';

export const embarqueCuentasMixin = {
  data() {
    return {
      isCreatingAccount: false,
      verificandoCuentasResumen: false,
      mostrarModalCuentasResumen: false,
      cuentasFaltantesResumen: [],
      creandoCuentasResumen: false,
      errorCuentasResumen: '',
      escalaResumenPendiente: 100,
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

    async existeCuentaParaResumen(servicio, fecha) {
      const cuentaConIdFecha = await servicio.getById(fecha);
      if (cuentaConIdFecha) return true;

      // Compatibilidad con cuentas antiguas creadas con un ID aleatorio.
      const cuentasConFecha = await servicio.getByFecha(fecha);
      return cuentasConFecha.length > 0;
    },

    async verificarCuentasResumenAntesDeGenerar(escala) {
      this.verificandoCuentasResumen = true;
      this.errorCuentasResumen = '';
      this.cuentasFaltantesResumen = [];

      try {
        if (!this.embarque?.fecha) {
          alert('Selecciona la fecha del embarque antes de generar el resumen.');
          return false;
        }

        const fecha = normalizarFechaISO(this.embarque?.fecha);
        const [existeOzuna, existeVeronica] = await Promise.all([
          this.existeCuentaParaResumen(ozunaCuentas, fecha),
          this.existeCuentaParaResumen(veronicaCuentas, fecha),
        ]);

        const faltantes = [];
        if (!existeOzuna) {
          faltantes.push({ id: 'ozuna', clienteId: '4', nombre: 'Ozuna' });
        }
        if (!existeVeronica) {
          faltantes.push({ id: 'veronica', clienteId: '5', nombre: 'Lorena / Verónica' });
        }

        if (faltantes.length === 0) return true;

        this.cuentasFaltantesResumen = faltantes;
        this.escalaResumenPendiente = escala;
        this.mostrarModalCuentasResumen = true;
        return false;
      } catch (error) {
        console.error('[Resumen Embarque] No se pudieron verificar las cuentas:', error);
        alert(
          'No se pudo comprobar si ya existen las cuentas de Ozuna y Lorena/Verónica. ' +
          'Revisa tu conexión e intenta nuevamente.'
        );
        return false;
      } finally {
        this.verificandoCuentasResumen = false;
      }
    },

    construirDatosCuentaResumen(clienteId) {
      return {
        ...this.embarque,
        productos: this.productosPorCliente[clienteId] || [],
        clienteCrudos: { [clienteId]: this.clienteCrudos[clienteId] || [] },
        productosTotales: this.embarque.productos,
        clienteCrudosTotales: this.clienteCrudos,
        costosPorMedida: { ...this.costosPorMedida },
        aplicarCostoExtra: { ...this.aplicarCostoExtra },
        costoExtra: this.costoExtra,
      };
    },

    async crearCuentasFaltantesYGenerarResumen() {
      if (this.creandoCuentasResumen) return;

      this.creandoCuentasResumen = true;
      this.errorCuentasResumen = '';

      try {
        while (this.cuentasFaltantesResumen.length > 0) {
          const cuenta = this.cuentasFaltantesResumen[0];
          const datosCuenta = this.construirDatosCuentaResumen(cuenta.clienteId);

          try {
            if (cuenta.id === 'ozuna') {
              await EmbarqueCuentasService.crearCuentaOzuna(datosCuenta, null);
            } else {
              await EmbarqueCuentasService.crearCuentaVeronica(datosCuenta, null);
            }
          } catch (error) {
            // Si otro dispositivo la creó después de la verificación, ya se
            // cumplió el objetivo y podemos continuar con la siguiente.
            if (error?.code !== 'cuenta-duplicada') {
              throw error;
            }
          }

          this.cuentasFaltantesResumen = this.cuentasFaltantesResumen.slice(1);
        }

        await this.generarResumenPendiente();
      } catch (error) {
        console.error('[Resumen Embarque] Error al crear cuentas faltantes:', error);
        this.errorCuentasResumen =
          error?.message || 'No se pudieron crear las cuentas. Puedes intentar nuevamente o generar solo el resumen.';
      } finally {
        this.creandoCuentasResumen = false;
      }
    },

    async generarResumenPendiente() {
      const escala = Number(this.escalaResumenPendiente) || 100;
      this.mostrarModalCuentasResumen = false;
      this.mostrarEscalaResumen = false;
      this.errorCuentasResumen = '';
      await this.generarPDF('resumen', null, { escala });
    },

    async omitirCuentasResumenYGenerar() {
      if (this.creandoCuentasResumen) return;
      await this.generarResumenPendiente();
    },

    cerrarModalCuentasResumen() {
      if (this.creandoCuentasResumen) return;
      this.mostrarModalCuentasResumen = false;
      this.cuentasFaltantesResumen = [];
      this.errorCuentasResumen = '';
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
        alert(`Error al crear cuenta para Joselito: ${error.message}`);
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
