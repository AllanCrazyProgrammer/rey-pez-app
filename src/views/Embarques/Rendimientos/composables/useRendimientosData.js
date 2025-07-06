import { ref, computed } from 'vue';
import { debounce } from 'lodash';
import { RendimientosService } from '../services/rendimientosService';
import { calcularTotalBolsas, calcularTotalTaras, calcularTotalKilos, esMedidaMix } from '../utils/calculations';

/**
 * Composable para manejar los datos de rendimientos
 */
export function useRendimientosData() {
  const rendimientosService = new RendimientosService();
  
  // Estado reactivo
  const embarqueData = ref(null);
  const kilosCrudos = ref({});
  const medidasUnicas = ref([]);
  const nombresMedidasPersonalizados = ref({});
  const medidaOculta = ref({});
  const analizarGanancia = ref({});
  const analizarGananciaCrudos = ref({});
  const analizarMaquilaGanancia = ref({});
  const precioMaquila = ref({});
  const pesoTaraCosto = ref(19);
  const pesoTaraVenta = ref(20);
  const guardadoAutomaticoActivo = ref(false);

  // Función debounced para guardar cambios
  const guardarCambiosEnTiempoReal = debounce(async (embarqueId) => {
    if (!guardadoAutomaticoActivo.value) return;

    try {
      await rendimientosService.guardarCambios(embarqueId, {
        kilosCrudos: kilosCrudos.value,
        medidaOculta: medidaOculta.value,
        analizarGanancia: analizarGanancia.value,
        analizarGananciaCrudos: analizarGananciaCrudos.value,
        analizarMaquilaGanancia: analizarMaquilaGanancia.value,
        precioMaquila: precioMaquila.value
      });
      
      console.log('Rendimientos guardados:', kilosCrudos.value);
    } catch (error) {
      console.error('Error al guardar los rendimientos:', error);
    }
  }, 300);

  /**
   * Cargar datos del embarque
   */
  const cargarEmbarque = async (embarqueId) => {
    try {
      const datos = await rendimientosService.cargarEmbarque(embarqueId);
      
      if (datos) {
        embarqueData.value = datos;
        nombresMedidasPersonalizados.value = datos.nombresMedidasPersonalizados || {};
        medidaOculta.value = datos.medidaOculta || {};
        analizarGanancia.value = datos.analizarGanancia || {};
        analizarGananciaCrudos.value = datos.analizarGananciaCrudos || {};
        analizarMaquilaGanancia.value = datos.analizarMaquilaGanancia || {};
        precioMaquila.value = datos.precioMaquila || {};
        
        // Cargar configuración de pesos
        pesoTaraCosto.value = datos.pesoTaraCosto || 19;
        pesoTaraVenta.value = datos.pesoTaraVenta || 20;
        
        const kilosCrudosGuardados = datos.kilosCrudos || {};
        kilosCrudos.value = { ...kilosCrudosGuardados };
        
        obtenerMedidasUnicas();
        
        // Inicializar kilos crudos para nuevas medidas
        medidasUnicas.value.forEach(medida => {
          if (!kilosCrudos.value[medida]) {
            if (esMedidaMix(medida)) {
              kilosCrudos.value[medida] = {
                medida1: 0,
                medida2: 0,
                etiqueta1: 'Kilos en crudo (Medida 1)',
                etiqueta2: 'Kilos en crudo (Medida 2)'
              };
            } else {
              kilosCrudos.value[medida] = 0;
            }
          }
        });
        
        guardadoAutomaticoActivo.value = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error al cargar el embarque:', error);
      return false;
    }
  };

  /**
   * Obtener medidas únicas del embarque
   */
  const obtenerMedidasUnicas = () => {
    if (!embarqueData.value || !embarqueData.value.clientes) return;
    
    const medidasMap = new Map();
    const mixMedidas = new Map();
    
    embarqueData.value.clientes.forEach(cliente => {
      cliente.productos.forEach(producto => {
        if (producto.medida) {
          const medidaNormalizada = producto.medida.toLowerCase().trim();
          let nombreMedida = producto.medida;
          
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
          
          if (!kilosCrudos.value[combinedName]) {
            kilosCrudos.value[combinedName] = {
              medida1: 0,
              medida2: 0,
              etiqueta1: `Kilos en crudo (${mixKeys[i]})`,
              etiqueta2: `Kilos en crudo (${mixKeys[i+1]})`
            };
          }
        }
      }
    }
    
    medidasUnicas.value = Array.from(medidasMap.values());
  };

  /**
   * Obtener tallas de crudos únicas
   */
  const obtenerTallasCrudosUnicas = () => {
    if (!embarqueData.value || !embarqueData.value.clientes) return [];
    
    const tallasSet = new Set();
    
    embarqueData.value.clientes.forEach(cliente => {
      if (cliente.crudos && Array.isArray(cliente.crudos)) {
        cliente.crudos.forEach(crudo => {
          if (crudo && crudo.items && Array.isArray(crudo.items)) {
            crudo.items.forEach(item => {
              if (item.talla) {
                const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                if (esVenta) {
                  tallasSet.add(item.talla);
                }
              }
            });
          }
        });
      }
    });
    
    return Array.from(tallasSet).sort();
  };

  /**
   * Calcular total embarcado para una medida
   */
  const obtenerTotalEmbarcado = (medida) => {
    if (!embarqueData.value || !embarqueData.value.clientes) return 0;
    
    if (medida.includes('-') && medida.endsWith('mix')) {
      const [medida1, medida2] = medida.split('-').map(m => m.trim());
      const total1 = calcularTotalParaMedida(medida1 + ' mix');
      const total2 = calcularTotalParaMedida(medida2.replace(' mix', '') + ' mix');
      return total1 + total2;
    }
    
    return calcularTotalParaMedida(medida);
  };

  /**
   * Calcular total para una medida específica
   */
  const calcularTotalParaMedida = (medida) => {
    const esOzuna = medida.includes('Maquila Ozuna');
    const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
    
    return embarqueData.value.clientes.reduce((total, cliente) => {
      return total + cliente.productos
        .filter(p => {
          if (!p.medida) return false;
          
          if (esOzuna) {
            return p.medida.toLowerCase().trim() === medidaBase && 
                   cliente.nombre === 'Ozuna' && 
                   !p.esVenta;
          } else {
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

  /**
   * Calcular rendimiento para una medida
   */
  const calcularRendimiento = (medida) => {
    const totalEmbarcado = obtenerTotalEmbarcado(medida);
    if (totalEmbarcado === 0) return 0;
    
    let kilosCrudosValor;
    if (esMedidaMix(medida)) {
      kilosCrudosValor = Number(kilosCrudos.value[medida]?.medida1 || 0) + 
                        Number(kilosCrudos.value[medida]?.medida2 || 0);
    } else {
      kilosCrudosValor = Number(kilosCrudos.value[medida] || 0);
    }
    
    return kilosCrudosValor / totalEmbarcado;
  };

  /**
   * Obtener nombre personalizado de medida
   */
  const obtenerNombreMedidaPersonalizado = (medida) => {
    return nombresMedidasPersonalizados.value[medida] || medida;
  };

  /**
   * Obtener etiqueta para medidas mix
   */
  const obtenerEtiqueta = (medida, campo) => {
    if (!kilosCrudos.value[medida]) return campo === 'medida1' ? 
      'Kilos en crudo (Medida 1)' : 'Kilos en crudo (Medida 2)';
      
    return campo === 'medida1' ? 
      (kilosCrudos.value[medida].etiqueta1 || 'Kilos en crudo (Medida 1)') : 
      (kilosCrudos.value[medida].etiqueta2 || 'Kilos en crudo (Medida 2)');
  };

  return {
    // Estado
    embarqueData,
    kilosCrudos,
    medidasUnicas,
    nombresMedidasPersonalizados,
    medidaOculta,
    analizarGanancia,
    analizarGananciaCrudos,
    analizarMaquilaGanancia,
    precioMaquila,
    pesoTaraCosto,
    pesoTaraVenta,
    guardadoAutomaticoActivo,
    
    // Métodos
    cargarEmbarque,
    obtenerMedidasUnicas,
    obtenerTallasCrudosUnicas,
    obtenerTotalEmbarcado,
    calcularRendimiento,
    obtenerNombreMedidaPersonalizado,
    obtenerEtiqueta,
    guardarCambiosEnTiempoReal,
    
    // Servicio
    rendimientosService
  };
}