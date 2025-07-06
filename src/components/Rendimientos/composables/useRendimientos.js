import { reactive, computed } from 'vue';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { debounce } from 'lodash';

export function useRendimientos(embarqueId) {
  const state = reactive({
    kilosCrudos: {},
    medidasUnicas: [],
    embarqueData: null,
    guardadoAutomaticoActivo: false,
    nombresMedidasPersonalizados: {}
  });

  // Métodos para manejar medidas
  const esMedidaMix = (medida) => {
    return medida.toLowerCase().includes('mix');
  };

  const obtenerMedidasUnicas = () => {
    if (!state.embarqueData || !state.embarqueData.clientes) return;
    
    const medidasMap = new Map();
    const mixMedidas = new Map();
    
    state.embarqueData.clientes.forEach(cliente => {
      cliente.productos.forEach(producto => {
        if (producto.medida) {
          const medidaNormalizada = producto.medida.toLowerCase().trim();
          let nombreMedida = producto.medida;
          
          // Solo añadir "Maquila Ozuna" si es de Ozuna y NO es una venta
          if (cliente.nombre === 'Ozuna' && !producto.esVenta) {
            nombreMedida = `${producto.medida} Maquila Ozuna`;
          }

          if (medidaNormalizada.endsWith('mix')) {
            const baseSize = medidaNormalizada.split(' ')[0];
            mixMedidas.set(baseSize, nombreMedida);
          } else if (!medidasMap.has(nombreMedida)) {
            medidasMap.set(nombreMedida, nombreMedida);
          }
        }
      });
    });

    const mixKeys = Array.from(mixMedidas.keys()).sort();
    if (mixKeys.length >= 2) {
      for (let i = 0; i < mixKeys.length; i += 2) {
        if (i + 1 < mixKeys.length) {
          const combinedName = `${mixKeys[i]}-${mixKeys[i+1]} mix`;
          medidasMap.set(combinedName, combinedName);
          
          if (!state.kilosCrudos[combinedName]) {
            state.kilosCrudos[combinedName] = {
              medida1: 0,
              medida2: 0,
              etiqueta1: `Kilos en crudo (${mixKeys[i]})`,
              etiqueta2: `Kilos en crudo (${mixKeys[i+1]})`
            };
          }
        }
      }
    }
    
    state.medidasUnicas = Array.from(medidasMap.values());
  };

  // Métodos para cálculos
  const calcularTotalTaras = (producto) => {
    const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
    const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
    return tarasNormales + tarasExtra;
  };

  const calcularTotalBolsas = (producto) => {
    const reporteTaras = producto.reporteTaras || [];
    const reporteBolsas = producto.reporteBolsas || [];
    let sumaTotalKilos = 0;

    for (let i = 0; i < reporteTaras.length; i++) {
      const taras = parseInt(reporteTaras[i]) || 0;
      const bolsa = parseInt(reporteBolsas[i]) || 0;
      sumaTotalKilos += taras * bolsa;
    }

    return sumaTotalKilos;
  };

  const calcularTotalKilos = (producto) => {
    if (!producto.kilos) return 0;
    
    const sumaKilos = producto.kilos.reduce((total, kilo) => total + (Number(kilo) || 0), 0);
    const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
    const descuentoTaras = producto.restarTaras ? tarasNormales * 3 : 0;
    
    return sumaKilos - descuentoTaras;
  };

  const calcularTotalParaMedida = (medida) => {
    const esOzuna = medida.includes('Maquila Ozuna');
    const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
    
    return state.embarqueData.clientes.reduce((total, cliente) => {
      return total + cliente.productos
        .filter(p => {
          if (!p.medida) return false;
          
          // Si la medida original es de Ozuna
          if (esOzuna) {
            // Solo incluir si el producto es de cliente Ozuna y NO es una venta
            return p.medida.toLowerCase().trim() === medidaBase && 
                   cliente.nombre === 'Ozuna' && 
                   !p.esVenta;
          } else {
            // Solo incluir si el producto coincide con la medida y NO es de Ozuna o es de Ozuna pero es VENTA
            return p.medida.toLowerCase().trim() === medidaBase && 
                   (cliente.nombre !== 'Ozuna' || p.esVenta);
          }
        })
        .reduce((subtotal, producto) => {
          if (producto.tipo === 'c/h20') {
            const totalBolsas = calcularTotalBolsas(producto);
            const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
            return subtotal + (totalBolsas * valorNeto);
          } else {
            const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            const sumaTaras = calcularTotalTaras(producto);
            const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
            return subtotal + (sumaKilos - descuentoTaras);
          }
        }, 0);
    }, 0);
  };

  const obtenerTotalEmbarcado = (medida) => {
    if (!state.embarqueData || !state.embarqueData.clientes) return 0;
    
    if (medida.includes('-') && medida.endsWith('mix')) {
      const [medida1, medida2] = medida.split('-').map(m => m.trim());
      const total1 = calcularTotalParaMedida(medida1 + ' mix');
      const total2 = calcularTotalParaMedida(medida2.replace(' mix', '') + ' mix');
      return total1 + total2;
    }
    
    return calcularTotalParaMedida(medida);
  };

  const calcularRendimiento = (medida) => {
    const totalEmbarcado = obtenerTotalEmbarcado(medida);
    if (totalEmbarcado === 0) return 0;
    
    let kilosCrudos;
    if (esMedidaMix(medida)) {
      kilosCrudos = Number(state.kilosCrudos[medida]?.medida1 || 0) + 
                    Number(state.kilosCrudos[medida]?.medida2 || 0);
    } else {
      kilosCrudos = Number(state.kilosCrudos[medida] || 0);
    }
    
    const rendimiento = kilosCrudos / totalEmbarcado;
    
    guardarCambiosEnTiempoReal();
    return rendimiento;
  };

  const getRendimiento = (medida) => {
    return calcularRendimiento(medida) || 0;
  };

  // Métodos para etiquetas
  const obtenerEtiqueta = (medida, campo) => {
    if (!state.kilosCrudos[medida]) return campo === 'medida1' ? 
      'Kilos en crudo (Medida 1)' : 'Kilos en crudo (Medida 2)';
      
    return campo === 'medida1' ? 
      (state.kilosCrudos[medida].etiqueta1 || 'Kilos en crudo (Medida 1)') : 
      (state.kilosCrudos[medida].etiqueta2 || 'Kilos en crudo (Medida 2)');
  };

  const editarEtiqueta = (medida, campo) => {
    if (!state.kilosCrudos[medida]) {
      state.kilosCrudos[medida] = {
        medida1: 0,
        medida2: 0,
        etiqueta1: 'Kilos en crudo (Medida 1)',
        etiqueta2: 'Kilos en crudo (Medida 2)'
      };
    }

    const etiquetaActual = campo === 'medida1' ? 
      state.kilosCrudos[medida].etiqueta1 : 
      state.kilosCrudos[medida].etiqueta2;

    const nuevaEtiqueta = prompt('Ingrese el nuevo nombre para la medida:', etiquetaActual);
    
    if (nuevaEtiqueta !== null) {
      if (campo === 'medida1') {
        state.kilosCrudos[medida].etiqueta1 = nuevaEtiqueta;
      } else {
        state.kilosCrudos[medida].etiqueta2 = nuevaEtiqueta;
      }
      guardarCambiosEnTiempoReal();
    }
  };

  // Métodos para nombres personalizados
  const obtenerNombreMedidaPersonalizado = (medida) => {
    return state.nombresMedidasPersonalizados[medida] || medida;
  };

  const editarNombreMedida = async (medida) => {
    const nombreActual = obtenerNombreMedidaPersonalizado(medida);
    const nuevoNombre = prompt('Ingrese el nuevo nombre para la medida:', nombreActual);
    
    if (nuevoNombre !== null && nuevoNombre.trim() !== '') {
      state.nombresMedidasPersonalizados[medida] = nuevoNombre.trim();
      
      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          nombresMedidasPersonalizados: state.nombresMedidasPersonalizados
        });
        
        console.log('Nombre de medida actualizado correctamente');
      } catch (error) {
        console.error('Error al guardar el nuevo nombre:', error);
      }
    }
  };

  // Cargar datos del embarque
  const cargarEmbarque = async () => {
    try {
      const db = getFirestore();
      const embarqueRef = doc(db, 'embarques', embarqueId);
      const embarqueDoc = await getDoc(embarqueRef);
      
      if (embarqueDoc.exists()) {
        state.embarqueData = embarqueDoc.data();
        state.nombresMedidasPersonalizados = state.embarqueData.nombresMedidasPersonalizados || {};
        obtenerMedidasUnicas();
        
        const kilosCrudosGuardados = state.embarqueData.kilosCrudos || {};
        state.kilosCrudos = { ...kilosCrudosGuardados };
        
        state.medidasUnicas.forEach(medida => {
          if (!state.kilosCrudos[medida]) {
            if (esMedidaMix(medida)) {
              state.kilosCrudos[medida] = {
                medida1: 0,
                medida2: 0,
                etiqueta1: 'Kilos en crudo (Medida 1)',
                etiqueta2: 'Kilos en crudo (Medida 2)'
              };
            } else {
              state.kilosCrudos[medida] = 0;
            }
          }
        });
        
        state.guardadoAutomaticoActivo = true;
      } else {
        console.error('No se encontró el embarque');
      }
    } catch (error) {
      console.error('Error al cargar el embarque:', error);
    }
  };

  // Guardar cambios con debounce
  const guardarCambiosEnTiempoReal = debounce(async () => {
    if (!state.guardadoAutomaticoActivo) return;

    try {
      const db = getFirestore();
      const embarqueRef = doc(db, 'embarques', embarqueId);
      
      await updateDoc(embarqueRef, {
        kilosCrudos: state.kilosCrudos
      });
      
      console.log('Rendimientos guardados:', state.kilosCrudos);
    } catch (error) {
      console.error('Error al guardar los rendimientos:', error);
    }
  }, 300);

  // Computed properties
  const embarqueData = computed(() => state.embarqueData);
  const medidasUnicas = computed(() => state.medidasUnicas);
  const kilosCrudos = computed(() => state.kilosCrudos);

  return {
    // State
    embarqueData,
    medidasUnicas,
    kilosCrudos,
    
    // Methods
    cargarEmbarque,
    esMedidaMix,
    obtenerTotalEmbarcado,
    calcularRendimiento,
    getRendimiento,
    obtenerEtiqueta,
    editarEtiqueta,
    obtenerNombreMedidaPersonalizado,
    editarNombreMedida,
    guardarCambiosEnTiempoReal
  };
}