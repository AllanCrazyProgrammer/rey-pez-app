import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import EmbarqueService from '@/services/EmbarqueService';
import ClienteService from '@/services/ClienteService';
import PdfService from '@/services/PdfService';
import { debounce } from 'lodash';

export function useEmbarqueState() {
  const authStore = useAuthStore();
  
  // Estado
  const embarqueId = ref(null);
  const modoEdicion = ref(false);
  const sidebarCollapsed = ref(false);
  const clienteActivo = ref(null);
  const productosPorCliente = ref({});
  const clienteCrudos = ref({});
  const clientesPredefinidos = ref([]);
  const clientesPersonalizadosEmbarque = ref([]);
  const mostrarModalNuevoCliente = ref(false);
  const productoSeleccionado = ref(null);
  const historialPrecios = ref([]);
  const mostrarModalHistorial = ref(false);
  const guardando = ref(false);
  const generandoPDF = ref(false);
  const embarqueBloqueado = ref(false);

  // Funciones auxiliares
  const obtenerInfoCliente = (clienteId) => {
    return clientesPredefinidos.value.find(c => c.id === clienteId) ||
           clientesPersonalizadosEmbarque.value.find(c => c.id === clienteId) ||
           { id: clienteId, nombre: `Cliente ${clienteId}` };
  };

  const obtenerEmbarqueCliente = (clienteId) => ({
    id: embarqueId.value,
    clienteId,
    productos: productosPorCliente.value[clienteId] || []
  });

  // Funciones de acción
  const guardarEmbarqueDebounced = debounce(async () => {
    if (!embarqueId.value || !modoEdicion.value) return;
    await EmbarqueService.actualizarEmbarque(embarqueId.value, {
      productos: productosPorCliente.value,
      crudos: clienteCrudos.value
    });
  }, 2000);

  const guardarEmbarque = async () => {
    if (guardando.value) return;
    guardando.value = true;

    try {
      const embarqueData = {
        productos: productosPorCliente.value,
        crudos: clienteCrudos.value,
        userId: authStore.user.id
      };

      if (!embarqueId.value) {
        embarqueId.value = await EmbarqueService.crearEmbarque(embarqueData);
        modoEdicion.value = true;
      } else {
        await EmbarqueService.actualizarEmbarque(embarqueId.value, embarqueData);
      }
    } catch (error) {
      console.error('Error al guardar embarque:', error);
    } finally {
      guardando.value = false;
    }
  };

  const generarResumenEmbarque = async () => {
    if (generandoPDF.value) return;
    generandoPDF.value = true;

    try {
      const datos = {
        embarqueId: embarqueId.value,
        productos: productosPorCliente.value,
        crudos: clienteCrudos.value,
        clientes: [...clientesPredefinidos.value, ...clientesPersonalizadosEmbarque.value]
      };

      const pdfBlob = await PdfService.generarResumenEmbarquePDF(datos);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    } finally {
      generandoPDF.value = false;
    }
  };

  // Ciclo de vida
  onMounted(async () => {
    try {
      clientesPredefinidos.value = await ClienteService.obtenerClientesPredefinidos();
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  });

  onUnmounted(() => {
    guardarEmbarqueDebounced.cancel();
  });

  return {
    // Estado
    embarqueId,
    modoEdicion,
    sidebarCollapsed,
    clienteActivo,
    productosPorCliente,
    clienteCrudos,
    clientesPredefinidos,
    clientesPersonalizadosEmbarque,
    mostrarModalNuevoCliente,
    productoSeleccionado,
    historialPrecios,
    mostrarModalHistorial,
    guardando,
    generandoPDF,
    embarqueBloqueado,

    // Métodos
    obtenerInfoCliente,
    obtenerEmbarqueCliente,
    guardarEmbarque,
    generarResumenEmbarque
  };
} 