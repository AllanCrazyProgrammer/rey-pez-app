import { ref, onMounted, onUnmounted, computed } from 'vue';
import SincronizacionService from '@/services/SincronizacionService';
import { useAuthStore } from '@/stores/auth';

/**
 * Composable para gestionar la sincronización de embarques
 * @param {String} embarqueId - ID del embarque (opcional)
 * @returns {Object} - Estado y métodos de sincronización
 */
export default function useEmbarqueSincronizacion(embarqueId = null) {
  // Estado de conexión
  const online = ref(navigator.onLine);
  const cambiosPendientes = ref(0);
  const sincronizando = ref(false);
  const usuariosActivos = ref({});
  const hayBloqueos = ref(false);
  
  // ID del embarque actual
  const embarqueActualId = ref(embarqueId);
  
  // Obtener store de autenticación
  const authStore = useAuthStore();
  
  // Estado del embarque
  const embarqueData = ref(null);
  
  // Computar lista de usuarios online
  const listaUsuariosActivos = computed(() => {
    return Object.values(usuariosActivos.value || {})
      .filter(usuario => usuario.online)
      .map(usuario => ({
        username: usuario.username,
        online: usuario.online,
        ultimaActividad: usuario.ultimaActividad
      }));
  });
  
  // Inicializar servicio de sincronización
  onMounted(() => {
    if (authStore.user && authStore.userId) {
      SincronizacionService.init(authStore.userId, authStore.user);
    }
    
    // Escuchar cambios en el estado de conexión
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Actualizar estado inicial
    online.value = navigator.onLine;
    
    // Si se proporciona un ID de embarque, comenzar a observarlo
    if (embarqueActualId.value) {
      observarEmbarque(embarqueActualId.value);
    }
  });
  
  // Limpiar al desmontar
  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    
    // Dejar de observar el embarque
    SincronizacionService.dejarDeObservarEmbarque();
  });
  
  /**
   * Maneja el evento de conexión recuperada
   */
  const handleOnline = async () => {
    online.value = true;
    
    // Intentar sincronizar cambios pendientes
    await sincronizarCambiosPendientes();
  };
  
  /**
   * Maneja el evento de pérdida de conexión
   */
  const handleOffline = () => {
    online.value = false;
  };
  
  /**
   * Sincroniza cambios pendientes
   */
  const sincronizarCambiosPendientes = async () => {
    if (!online.value) return;
    
    sincronizando.value = true;
    
    try {
      await SincronizacionService.sincronizarCambiosPendientes();
      cambiosPendientes.value = SincronizacionService.cambiosPendientes.length;
    } catch (error) {
      console.error('Error al sincronizar cambios:', error);
    } finally {
      sincronizando.value = false;
    }
  };
  
  /**
   * Comienza a observar un embarque
   * @param {String} id - ID del embarque a observar
   */
  const observarEmbarque = (id) => {
    if (!id) return;
    
    embarqueActualId.value = id;
    
    // Observar cambios en el embarque
    SincronizacionService.observarEmbarque(id, (data) => {
      embarqueData.value = data;
    });
    
    // Actualizar referencias a usuarios activos y bloqueos
    setInterval(() => {
      usuariosActivos.value = SincronizacionService.usuariosActivos;
      hayBloqueos.value = Object.keys(SincronizacionService.bloqueos || {}).length > 0;
      cambiosPendientes.value = SincronizacionService.cambiosPendientes.length;
    }, 2000);
  };
  
  /**
   * Deja de observar el embarque actual
   */
  const dejarDeObservarEmbarque = () => {
    SincronizacionService.dejarDeObservarEmbarque();
    embarqueData.value = null;
  };
  
  /**
   * Guarda cambios en el embarque
   * @param {Object} datos - Datos del embarque
   */
  const guardarCambiosEmbarque = (datos) => {
    if (!embarqueActualId.value) return;
    
    SincronizacionService.guardarCambiosEmbarque(embarqueActualId.value, datos);
  };
  
  /**
   * Agrega un producto al embarque
   * @param {Object} producto - Producto a agregar
   * @returns {Object} - Producto agregado con ID generado
   */
  const agregarProducto = (producto) => {
    if (!embarqueActualId.value) return producto;
    
    return SincronizacionService.agregarProducto(embarqueActualId.value, producto);
  };
  
  /**
   * Actualiza un producto existente
   * @param {Object} producto - Producto actualizado
   */
  const actualizarProducto = (producto) => {
    if (!embarqueActualId.value) return;
    
    SincronizacionService.actualizarProducto(embarqueActualId.value, producto);
  };
  
  /**
   * Elimina un producto
   * @param {String} productoId - ID del producto a eliminar
   */
  const eliminarProducto = (productoId) => {
    if (!embarqueActualId.value) return;
    
    SincronizacionService.eliminarProducto(embarqueActualId.value, productoId);
  };
  
  /**
   * Obtiene el estado del bloqueo de un producto
   * @param {String} productoId - ID del producto
   * @returns {Object|null} - Información del bloqueo si existe
   */
  const obtenerBloqueo = (productoId) => {
    if (!embarqueActualId.value) return null;
    
    return SincronizacionService.obtenerBloqueo(embarqueActualId.value, productoId);
  };
  
  /**
   * Intenta bloquear un producto para edición
   * @param {String} productoId - ID del producto
   * @returns {Promise<Boolean>} - true si se pudo bloquear
   */
  const bloquearProducto = async (productoId) => {
    if (!embarqueActualId.value) return true;
    
    return SincronizacionService.bloquearProducto(embarqueActualId.value, productoId);
  };
  
  /**
   * Desbloquea un producto
   * @param {String} productoId - ID del producto
   */
  const desbloquearProducto = (productoId) => {
    if (!embarqueActualId.value) return;
    
    SincronizacionService.desbloquearProducto(embarqueActualId.value, productoId);
  };
  
  return {
    online,
    cambiosPendientes,
    sincronizando,
    usuariosActivos,
    listaUsuariosActivos,
    hayBloqueos,
    embarqueData,
    observarEmbarque,
    dejarDeObservarEmbarque,
    guardarCambiosEmbarque,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    obtenerBloqueo,
    bloquearProducto,
    desbloquearProducto,
    sincronizarCambiosPendientes
  };
} 