import { reactive, computed } from 'vue';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

export function useMaquilaGanancias(embarqueId) {
  const state = reactive({
    analizarMaquilaGanancia: {},
    precioMaquila: {}
  });

  // Calcular ganancia de maquila para una medida
  const calcularGananciaMaquila = (medida, obtenerTotalEmbarcado) => {
    const totalEmbarcado = obtenerTotalEmbarcado(medida);
    const precioMaquila = Number(state.precioMaquila[medida]) || 0;
    return totalEmbarcado * precioMaquila;
  };

  // Obtener ganancias visibles de maquila para el PDF
  const obtenerGananciasVisiblesMaquila = (medidasUnicas, medidaOculta, obtenerTotalEmbarcado) => {
    const gananciasVisibles = {};
    
    Object.keys(state.analizarMaquilaGanancia).forEach(medida => {
      if (state.analizarMaquilaGanancia[medida] && !medidaOculta[medida]) {
        gananciasVisibles[medida] = {
          totalEmbarcado: obtenerTotalEmbarcado(medida),
          precioMaquila: Number(state.precioMaquila[medida]) || 0,
          gananciaTotal: calcularGananciaMaquila(medida, obtenerTotalEmbarcado)
        };
      }
    });
    
    return gananciasVisibles;
  };

  // Guardar cambios en Firebase
  const guardarCambios = async () => {
    try {
      const db = getFirestore();
      const embarqueRef = doc(db, 'embarques', embarqueId);
      
      await updateDoc(embarqueRef, {
        analizarMaquilaGanancia: state.analizarMaquilaGanancia,
        precioMaquila: state.precioMaquila
      });
      
      console.log('Configuración de maquila guardada correctamente');
    } catch (error) {
      console.error('Error al guardar configuración de maquila:', error);
    }
  };

  // Cargar configuración desde embarque
  const cargarConfiguracion = (embarqueData) => {
    if (embarqueData) {
      state.analizarMaquilaGanancia = embarqueData.analizarMaquilaGanancia || {};
      state.precioMaquila = embarqueData.precioMaquila || {};
    }
  };

  // Formatear precio
  const formatearPrecio = (precio) => {
    if (!precio) return '0';
    const numeroRedondeado = Math.round(precio);
    return numeroRedondeado.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return {
    // State
    analizarMaquilaGanancia: computed(() => state.analizarMaquilaGanancia),
    precioMaquila: computed(() => state.precioMaquila),
    
    // Methods
    calcularGananciaMaquila,
    obtenerGananciasVisiblesMaquila,
    guardarCambios,
    cargarConfiguracion,
    formatearPrecio
  };
}