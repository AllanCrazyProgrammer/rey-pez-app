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

      const registros = await EmbarquesOfflineService.getAll();
      const numeros = registros.filter(r => r.id !== this.embarqueId && r.fecha && normalizarFechaISO(r.fecha) === fechaISO)
        .map(r => Number(r.camionNumero) || 1);
      return Math.max(0, ...numeros) + 1;
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

      // El nombre guardado en los productos de ESTE embarque manda: es el
      // que se actualiza al renombrar un cliente (clic derecho / pulsación
      // larga sobre su nombre), incluidos los predefinidos, sin tocar la
      // lista global de clientes.
      const productoConCliente = this.embarque.productos.find(p => p.clienteId.toString() === clienteId.toString());
      if (productoConCliente && productoConCliente.nombreCliente) {
        return productoConCliente.nombreCliente;
      }

      const clienteEnLista = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      if (clienteEnLista && clienteEnLista.nombre) {
        return clienteEnLista.nombre;
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

    // Cambiar el nombre de un cliente del embarque (menú por clic derecho en
    // escritorio o pulsación larga en móvil sobre el nombre del cliente).
    // Funciona con cualquier cliente del embarque: en los personalizados
    // actualiza también la lista (y queda guardado para otros embarques); en
    // los predefinidos el cambio es solo de este embarque, guardado en el
    // nombreCliente de sus productos.
    renombrarCliente(clienteId) {
      if (this.embarqueBloqueado) return;
      const nombreActual = this.obtenerNombreCliente(clienteId);
      const nuevoNombre = prompt('Cambiar nombre del cliente:', nombreActual);
      if (nuevoNombre === null) return;
      const nombreLimpio = nuevoNombre.trim();
      if (!nombreLimpio || nombreLimpio === nombreActual) return;

      this.embarque.productos.forEach(producto => {
        if (String(producto.clienteId) === String(clienteId)) {
          this.$set(producto, 'nombreCliente', nombreLimpio);
        }
      });

      const clientePersonalizado = this.clientesPersonalizados.find(c => c.id.toString() === clienteId.toString());
      if (clientePersonalizado) {
        clientePersonalizado.nombre = nombreLimpio;
        localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
      }

      this.guardarCambiosEnTiempoReal();
      this.$forceUpdate();
      this.cambios.push(`Cliente ${nombreActual} renombrado a ${nombreLimpio}`);
    },

    editarNombreCliente(clienteId) {
      this.renombrarCliente(clienteId);
    },

    async agregarNuevoCliente(cliente) {
      if (!cliente || !cliente.nombre) return;

      const nombreNormalizado = String(cliente.nombre).trim();
      if (!nombreNormalizado) return;

      // Solo cuentan los clientes que realmente están en ESTE embarque: la lista
      // clientesPersonalizados también trae clientes de embarques anteriores
      // (localStorage), y con ellos un nombre nuevo salía como "refri (4)".
      const idsEnEmbarque = new Set(((this.embarque && this.embarque.productos) || [])
        .map(p => String(p.clienteId)));
      const personalizadosEnEmbarque = (this.clientesPersonalizados || [])
        .filter(c => idsEnEmbarque.has(String(c.id)));
      const nombresExistentes = new Set([...this.clientesPredefinidos, ...personalizadosEnEmbarque]
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
