import { reactive, computed } from 'vue';
import { getFirestore } from 'firebase/firestore';
import { escribirCamposEmbarque } from '@/services/embarqueEscritura';
import { esErrorConflictoEmbarque, integrarCamposEnBase, pedirRecargaPorConflicto } from '@/utils/embarqueRevision';

export function useModales(embarqueId) {
  const state = reactive({
    mostrarModal: false,
    mostrarModalConfiguracion: false,
    nota: '',
    medidaOculta: {},
    pesoTaraCosto: 19,
    pesoTaraVenta: 20,
    revBase: 0,
    baseNota: '',
    baseOculta: {},
    baseTaraCosto: 19,
    baseTaraVenta: 20
  });

  const guardarCampos = async (campos, baseCampos) => {
    const db = getFirestore();
    const resultado = await escribirCamposEmbarque(db, embarqueId, {
      baseRev: state.revBase,
      baseCampos,
      campos
    });
    if (resultado && !resultado.omitida && !resultado.fusiono) state.revBase = resultado.rev;
    resultado.reconocidos = integrarCamposEnBase({}, {
      ...(resultado.camposCoincidentes || {}),
      ...(resultado.camposEscritos || {}),
    });
    return resultado;
  };

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
      const resultado = await guardarCampos(
        { notaRendimientos: state.nota },
        { notaRendimientos: state.baseNota }
      );
      if (resultado && resultado.reconocidos && resultado.reconocidos.notaRendimientos !== undefined) {
        state.baseNota = resultado.reconocidos.notaRendimientos;
      }
      
      cerrarModal();
      console.log('Nota guardada correctamente');
      return true;
    } catch (error) {
      if (esErrorConflictoEmbarque(error) && pedirRecargaPorConflicto(error)) window.location.reload();
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
      const resultado = await guardarCampos({
        pesoTaraCosto: Number(state.pesoTaraCosto),
        pesoTaraVenta: Number(state.pesoTaraVenta)
      }, {
        pesoTaraCosto: state.baseTaraCosto,
        pesoTaraVenta: state.baseTaraVenta
      });
      const reconocidos = (resultado && resultado.reconocidos) || {};
      if (reconocidos.pesoTaraCosto !== undefined) state.baseTaraCosto = reconocidos.pesoTaraCosto;
      if (reconocidos.pesoTaraVenta !== undefined) state.baseTaraVenta = reconocidos.pesoTaraVenta;
      
      console.log('Configuración de pesos guardada correctamente');
      cerrarModalConfiguracion();
      return true;
    } catch (error) {
      if (esErrorConflictoEmbarque(error)) {
        if (pedirRecargaPorConflicto(error)) window.location.reload();
        return false;
      }
      console.error('Error al guardar configuración de pesos:', error);
      alert('Error al guardar la configuración. Intente nuevamente.');
      return false;
    }
  };

  // Gestión de estado de ocultación
  const guardarEstadoOculto = async () => {
    try {
      const resultado = await guardarCampos(
        { medidaOculta: state.medidaOculta },
        { medidaOculta: state.baseOculta }
      );
      if (resultado && resultado.reconocidos && resultado.reconocidos.medidaOculta !== undefined) {
        state.baseOculta = { ...resultado.reconocidos.medidaOculta };
      }
      
      console.log('Estado de ocultación guardado correctamente');
    } catch (error) {
      if (esErrorConflictoEmbarque(error) && pedirRecargaPorConflicto(error)) window.location.reload();
      console.error('Error al guardar estado de ocultación:', error);
    }
  };

  // Cargar configuración desde embarque
  const cargarConfiguracion = (embarqueData) => {
    if (embarqueData) {
      state.revBase = Number(embarqueData.rev) || 0;
      state.baseNota = embarqueData.notaRendimientos || '';
      state.medidaOculta = embarqueData.medidaOculta || {};
      state.baseOculta = { ...state.medidaOculta };
      state.pesoTaraCosto = embarqueData.pesoTaraCosto || 19;
      state.pesoTaraVenta = embarqueData.pesoTaraVenta || 20;
      state.baseTaraCosto = state.pesoTaraCosto;
      state.baseTaraVenta = state.pesoTaraVenta;
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