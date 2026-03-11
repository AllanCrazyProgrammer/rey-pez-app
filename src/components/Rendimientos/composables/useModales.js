import { reactive, computed } from 'vue';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

export function useModales(embarqueId) {
  const state = reactive({
    mostrarModal: false,
    mostrarModalConfiguracion: false,
    nota: '',
    medidaOculta: {},
    pesoTaraCosto: 19,
    pesoTaraVenta: 20
  });

  // Gestión del modal de notas
  const abrirModalNota = (notaExistente = '') => {
    state.nota = notaExistente || '';
    state.mostrarModal = true;
  };

  const cerrarModal = () => {
    state.mostrarModal = false;
    state.nota = '';
  };

  const guardarNota = async () => {
    try {
      const db = getFirestore();
      const embarqueRef = doc(db, 'embarques', embarqueId);
      
      await updateDoc(embarqueRef, {
        notaRendimientos: state.nota
      });
      
      cerrarModal();
      console.log('Nota guardada correctamente');
      return true;
    } catch (error) {
      console.error('Error al guardar la nota:', error);
      return false;
    }
  };

  // Gestión del modal de configuración
  const abrirModalConfiguracion = () => {
    state.mostrarModalConfiguracion = true;
  };

  const cerrarModalConfiguracion = () => {
    state.mostrarModalConfiguracion = false;
  };

  const guardarConfiguracion = async () => {
    try {
      const db = getFirestore();
      const embarqueRef = doc(db, 'embarques', embarqueId);
      
      await updateDoc(embarqueRef, {
        pesoTaraCosto: Number(state.pesoTaraCosto),
        pesoTaraVenta: Number(state.pesoTaraVenta)
      });
      
      console.log('Configuración de pesos guardada correctamente');
      cerrarModalConfiguracion();
      return true;
    } catch (error) {
      console.error('Error al guardar configuración de pesos:', error);
      alert('Error al guardar la configuración. Intente nuevamente.');
      return false;
    }
  };

  // Gestión de estado de ocultación
  const guardarEstadoOculto = async () => {
    try {
      const db = getFirestore();
      const embarqueRef = doc(db, 'embarques', embarqueId);
      
      await updateDoc(embarqueRef, {
        medidaOculta: state.medidaOculta
      });
      
      console.log('Estado de ocultación guardado correctamente');
    } catch (error) {
      console.error('Error al guardar estado de ocultación:', error);
    }
  };

  // Cargar configuración desde embarque
  const cargarConfiguracion = (embarqueData) => {
    if (embarqueData) {
      state.medidaOculta = embarqueData.medidaOculta || {};
      state.pesoTaraCosto = embarqueData.pesoTaraCosto || 19;
      state.pesoTaraVenta = embarqueData.pesoTaraVenta || 20;
    }
  };

  return {
    // State
    mostrarModal: computed(() => state.mostrarModal),
    mostrarModalConfiguracion: computed(() => state.mostrarModalConfiguracion),
    nota: computed(() => state.nota),
    medidaOculta: computed(() => state.medidaOculta),
    pesoTaraCosto: computed(() => state.pesoTaraCosto),
    pesoTaraVenta: computed(() => state.pesoTaraVenta),
    
    // Methods
    abrirModalNota,
    cerrarModal,
    guardarNota,
    abrirModalConfiguracion,
    cerrarModalConfiguracion,
    guardarConfiguracion,
    guardarEstadoOculto,
    cargarConfiguracion
  };
}