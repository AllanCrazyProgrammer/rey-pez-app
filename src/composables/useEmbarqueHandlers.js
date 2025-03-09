import { ref } from 'vue';
import EmbarqueService from '@/services/EmbarqueService';
import ClienteService from '@/services/ClienteService';

export function useEmbarqueHandlers() {
  const isCreatingAccount = ref(false);

  const seleccionarCliente = (clienteId, clienteActivo) => {
    clienteActivo.value = clienteId;
  };

  const eliminarCliente = (clienteId, productosPorCliente, clienteCrudos) => {
    delete productosPorCliente.value[clienteId];
    delete clienteCrudos.value[clienteId];
  };

  const agregarProducto = (clienteId, productosPorCliente) => {
    if (!productosPorCliente.value[clienteId]) {
      productosPorCliente.value[clienteId] = [];
    }

    productosPorCliente.value[clienteId].push({
      medida: '',
      esVenta: true,
      taras: [],
      tarasExtra: [],
      kilos: [],
      bolsas: [],
      notas: '',
      precio: null,
      notasPrecio: ''
    });
  };

  const eliminarProducto = (producto, clienteId, productosPorCliente) => {
    const index = productosPorCliente.value[clienteId].indexOf(producto);
    if (index > -1) {
      productosPorCliente.value[clienteId].splice(index, 1);
    }
  };

  const agregarTara = (producto) => {
    if (!producto.taras) producto.taras = [];
    if (!producto.kilos) producto.kilos = [];
    producto.taras.push(null);
    producto.kilos.push(null);
  };

  const eliminarTara = (producto, index) => {
    producto.taras.splice(index, 1);
    producto.kilos.splice(index, 1);
  };

  const agregarBolsa = (producto) => {
    if (!producto.bolsas) producto.bolsas = [];
    producto.bolsas.push(null);
  };

  const eliminarBolsa = (producto, index) => {
    producto.bolsas.splice(index, 1);
  };

  const abrirModalPrecio = (producto, productoSeleccionado) => {
    productoSeleccionado.value = producto;
  };

  const cerrarModalPrecio = (productoSeleccionado) => {
    productoSeleccionado.value = null;
  };

  const guardarPrecio = (datos, productoSeleccionado) => {
    if (!productoSeleccionado.value) return;
    
    productoSeleccionado.value.precio = datos.precio;
    productoSeleccionado.value.notasPrecio = datos.notasPrecio;
    productoSeleccionado.value = null;
  };

  const abrirModalHistorial = async (producto, productoSeleccionado, historialPrecios, mostrarModalHistorial) => {
    productoSeleccionado.value = producto;
    historialPrecios.value = await EmbarqueService.obtenerHistorialPrecios(
      producto.clienteId,
      producto.medida
    );
    mostrarModalHistorial.value = true;
  };

  const cerrarModalHistorial = (mostrarModalHistorial) => {
    mostrarModalHistorial.value = false;
  };

  const guardarNuevoCliente = async (clienteData, clientesPersonalizadosEmbarque) => {
    try {
      const clienteId = await ClienteService.crearCliente(clienteData);
      clientesPersonalizadosEmbarque.value.push({
        id: clienteId,
        ...clienteData
      });
      return clienteId;
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      throw error;
    }
  };

  const crearCuenta = async (datos) => {
    if (isCreatingAccount.value) return;
    isCreatingAccount.value = true;

    try {
      const cuentaId = await EmbarqueService.crearCuenta({
        ...datos.embarqueCliente,
        productos: datos.productos,
        crudos: datos.crudos,
        tipo: datos.tipoCliente
      });
      return cuentaId;
    } catch (error) {
      console.error('Error al crear cuenta:', error);
      throw error;
    } finally {
      isCreatingAccount.value = false;
    }
  };

  return {
    isCreatingAccount,
    seleccionarCliente,
    eliminarCliente,
    agregarProducto,
    eliminarProducto,
    agregarTara,
    eliminarTara,
    agregarBolsa,
    eliminarBolsa,
    abrirModalPrecio,
    cerrarModalPrecio,
    guardarPrecio,
    abrirModalHistorial,
    cerrarModalHistorial,
    guardarNuevoCliente,
    crearCuenta
  };
} 