import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';
import { normalizarFechaISO } from '@/utils/dateUtils';

export const embarqueClientesMixin = {
  methods: {
    async agregarClienteProducto() {
      const modalAbierto = this.mostrarModalPrecio ||
                          this.mostrarModalHilos ||
                          this.mostrarModalNota ||
                          this.mostrarModalAlt ||
                          this.mostrarModalNombreAlternativo ||
                          this.mostrarModalNuevoCliente;

      if (modalAbierto) {
        return;
      }

      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      if (this.nuevoClienteId === 'otro') {
        const nuevoNombre = prompt('Ingrese el nombre del nuevo cliente:');
        if (nuevoNombre && nuevoNombre.trim() !== '') {
          this.ultimoIdPersonalizado++;
          const nuevoClienteId = `personalizado_${this.ultimoIdPersonalizado}`;
          const nuevoCliente = {
            id: nuevoClienteId,
            nombre: nuevoNombre.trim(),
            editable: true,
            personalizado: true
          };
          this.clientesPersonalizados.push(nuevoCliente);
          await this.guardarEmbarqueInicial(nuevoClienteId);
        }
      } else if (this.nuevoClienteId) {
        await this.guardarEmbarqueInicial(this.nuevoClienteId);
      }
      this.nuevoClienteId = '';
    },

    async obtenerCamionNumeroParaFecha(fechaISO) {
      if (!fechaISO) {
        return 1;
      }

      try {
        if (!navigator.onLine) {
          await EmbarquesOfflineService.init();
          const registrosLocales = await EmbarquesOfflineService.getAll();
          const totalLocales = registrosLocales.filter(registro => {
            if (!registro || !registro.fecha) {
              return false;
            }
            try {
              const registroISO = normalizarFechaISO(registro.fecha);
              return registroISO === fechaISO;
            } catch (_) {
              return false;
            }
          }).length;
          return totalLocales + 1;
        }

        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const snapshot = await getDocs(embarquesRef);
        const totalRemotos = snapshot.docs.filter(doc => {
          const data = doc.data();
          let fechaEmbarque;

          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fechaEmbarque = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fechaEmbarque = data.fecha;
          } else if (typeof data.fecha === 'string') {
            fechaEmbarque = data.fecha;
          } else {
            return false;
          }

          const fechaEmbarqueISO = normalizarFechaISO(fechaEmbarque);
          return fechaEmbarqueISO === fechaISO;
        }).length;

        return totalRemotos + 1;
      } catch (error) {
        console.warn('[obtenerCamionNumeroParaFecha] Error al calcular camión, usando 1:', error);
        return 1;
      }
    },

    async eliminarCliente(clienteId) {
      const nombreCliente = this.obtenerNombreCliente(clienteId);
      console.log(`[eliminarCliente] Eliminando cliente: ${nombreCliente} (ID: ${clienteId})`);

      const productosAnteriores = this.embarque.productos.length;
      this.embarque.productos = this.embarque.productos.filter(p => p.clienteId !== clienteId);
      const productosEliminados = productosAnteriores - this.embarque.productos.length;
      console.log(`[eliminarCliente] ${productosEliminados} productos eliminados del cliente ${nombreCliente}`);

      const clientePersonalizadoIndex = this.clientesPersonalizados.findIndex(c => c.id.toString() === clienteId.toString());
      if (clientePersonalizadoIndex > -1) {
        this.clientesPersonalizados.splice(clientePersonalizadoIndex, 1);
        console.log(`[eliminarCliente] Cliente personalizado ${nombreCliente} eliminado de la lista`);
      }

      if (this.clienteCrudos[clienteId]) {
        delete this.clienteCrudos[clienteId];
      }
      if (this.clientesJuntarMedidas[clienteId]) {
        delete this.clientesJuntarMedidas[clienteId];
      }
      if (this.clientesReglaOtilio[clienteId]) {
        delete this.clientesReglaOtilio[clienteId];
      }
      if (this.clientesIncluirPrecios[clienteId]) {
        delete this.clientesIncluirPrecios[clienteId];
      }
      if (this.clientesCuentaEnPdf[clienteId]) {
        delete this.clientesCuentaEnPdf[clienteId];
      }
      if (this.clientesSumarKgCatarro[clienteId]) {
        delete this.clientesSumarKgCatarro[clienteId];
      }

      if (this.clienteActivo === clienteId) {
        this.clienteActivo = null;
      }

      this.$set(this.clientesModificados, clienteId, true);

      localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
      this.guardarCambiosEnTiempoReal();
      this.$forceUpdate();

      setTimeout(() => {
        if (this.clientesModificados[clienteId]) {
          delete this.clientesModificados[clienteId];
        }
      }, 1000);

      this.cambios.push(`Cliente ${nombreCliente} eliminado completamente`);
      console.log(`[eliminarCliente] Cliente ${nombreCliente} eliminado exitosamente`);
    },

    obtenerNombreCliente(clienteId) {
      if (!clienteId) {
        return 'Cliente Desconocido';
      }

      const clienteEnLista = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      if (clienteEnLista && clienteEnLista.nombre) {
        return clienteEnLista.nombre;
      }

      const productoConCliente = this.embarque.productos.find(p => p.clienteId.toString() === clienteId.toString());
      if (productoConCliente && productoConCliente.nombreCliente) {
        return productoConCliente.nombreCliente;
      }

      const clientePersonalizado = this.clientesPersonalizados.find(c => c.id.toString() === clienteId.toString());
      if (clientePersonalizado && clientePersonalizado.nombre) {
        return clientePersonalizado.nombre;
      }

      return 'Cliente Desconocido';
    },

    obtenerClientesConProductos() {
      const clientesConProductos = {};

      this.embarque.productos.forEach(producto => {
        const clienteId = producto.clienteId;
        if (!clientesConProductos[clienteId]) {
          clientesConProductos[clienteId] = {
            id: clienteId,
            nombre: this.obtenerNombreCliente(clienteId),
            productos: []
          };
        }
        clientesConProductos[clienteId].productos.push(producto);
      });

      return Object.values(clientesConProductos).map(cliente => ({
        ...cliente,
        crudos: this.clienteCrudos[cliente.id] || []
      }));
    },

    editarNombreCliente(clienteId) {
      const cliente = this.clientesDisponibles.find(c => c.id === clienteId);
      if (cliente && cliente.editable) {
        const nuevoNombre = prompt('Ingrese el nuevo nombre del cliente:', cliente.nombre);
        if (nuevoNombre !== null && nuevoNombre.trim() !== '') {
          cliente.nombre = nuevoNombre.trim();
          this.embarque.productos.forEach(producto => {
            if (producto.clienteId === clienteId) {
              producto.nombreCliente = nuevoNombre.trim();
            }
          });
        }
      }
    },

    async agregarNuevoCliente(cliente) {
      if (!cliente || !cliente.nombre) return;

      const nombreNormalizado = String(cliente.nombre).trim();
      if (!nombreNormalizado) return;

      const nombresExistentes = new Set([...this.clientesPredefinidos, ...this.clientesPersonalizados]
        .map(c => String(c.nombre).toLowerCase()));
      let nombreFinal = nombreNormalizado;
      if (nombresExistentes.has(nombreFinal.toLowerCase())) {
        let contador = 2;
        while (nombresExistentes.has(`${nombreNormalizado} (${contador})`.toLowerCase())) {
          contador++;
        }
        nombreFinal = `${nombreNormalizado} (${contador})`;
      }

      const nuevoCliente = {
        id: uuidv4(),
        nombre: nombreFinal,
        color: cliente.color || this.nuevoClienteColor,
        editable: true,
        personalizado: true,
        key: `personalizado_${Date.now()}`
      };

      this.clientesPersonalizados.push(nuevoCliente);

      this.agregarProducto(nuevoCliente.id);
      const ultimo = this.embarque.productos[this.embarque.productos.length - 1];
      if (ultimo && ultimo.clienteId === nuevoCliente.id) {
        this.$set(ultimo, 'nombreCliente', nombreFinal);
      }

      if (!this.clienteCrudos[nuevoCliente.id]) {
        this.$set(this.clienteCrudos, nuevoCliente.id, []);
      }

      const esOtilio = nombreFinal.toLowerCase().includes('otilio');
      this.$set(this.clientesReglaOtilio, nuevoCliente.id, esOtilio);

      localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
      this.guardarCambiosEnTiempoReal();
      this.mostrarModalNuevoCliente = false;
      this.seleccionarCliente(nuevoCliente.id);
    },
  },
};
