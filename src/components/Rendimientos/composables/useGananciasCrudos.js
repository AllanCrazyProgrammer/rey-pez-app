import { reactive, computed } from 'vue';
import { getFirestore, doc, updateDoc, collection, getDocs } from 'firebase/firestore';

export function useGananciasCrudos(embarqueId) {
  const state = reactive({
    gananciasCalculadasCrudos: {},
    analizarGananciaCrudos: {},
    pesoTaraCosto: 19,
    pesoTaraVenta: 20
  });

  // Obtener tallas de crudos únicas
  const obtenerTallasCrudosUnicas = (embarqueData) => {
    if (!embarqueData || !embarqueData.clientes) return [];
    
    const tallasSet = new Set();
    
    embarqueData.clientes.forEach(cliente => {
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

  // Calcular kilos de un item de crudo
  const calcularKilosCrudosItem = (item) => {
    let kilosTotales = 0;
    
    if (item.taras) {
      const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
      if (formatoGuion) {
        const cantidad = parseInt(formatoGuion[1]) || 0;
        let peso = parseInt(formatoGuion[2]) || 0;
        
        if (peso === 19) {
          peso = state.pesoTaraVenta;
        }
        
        kilosTotales += cantidad * peso;
      } else {
        const [cantidad, peso] = item.taras.split('-').map(Number);
        kilosTotales += (cantidad || 0) * (peso || 0);
      }
    }
    
    if (item.sobrante) {
      const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
      if (formatoGuion) {
        const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
        let pesoSobrante = parseInt(formatoGuion[2]) || 0;
        
        if (pesoSobrante === 19) {
          pesoSobrante = state.pesoTaraVenta;
        }
        
        kilosTotales += cantidadSobrante * pesoSobrante;
      } else {
        const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
        kilosTotales += (cantidadSobrante || 0) * (pesoSobrante || 0);
      }
    }
    
    return kilosTotales;
  };

  // Calcular costo para una talla de crudo
  const calcularCostoCrudoPorTalla = (talla, embarqueData) => {
    const costosEmbarque = embarqueData?.costosPorMedida || {};
    
    let costo = Number(costosEmbarque[talla]) || 0;
    
    if (costo === 0) {
      const tallaLower = talla.toLowerCase();
      for (const [medida, costoValue] of Object.entries(costosEmbarque)) {
        if (medida.toLowerCase() === tallaLower) {
          costo = Number(costoValue) || 0;
          break;
        }
      }
    }
    
    return costo;
  };

  // Calcular ganancias para una talla específica de crudo
  const calcularGananciasPorTallaCrudo = (talla, fechaEmbarque, embarqueData, obtenerPrecioVentaParaFecha, obtenerClienteIdParaPrecios) => {
    if (!embarqueData || !embarqueData.clientes) return null;
    
    let totalKilos = 0;
    let totalGanancias = 0;
    let totalVentas = 0;
    let detallesPorCliente = [];
    let hayPreciosIndividuales = false;
    
    const costoBase = calcularCostoCrudoPorTalla(talla, embarqueData);
    
    embarqueData.clientes.forEach(cliente => {
      if (cliente.crudos && Array.isArray(cliente.crudos)) {
        cliente.crudos.forEach(crudo => {
          if (crudo && crudo.items && Array.isArray(crudo.items)) {
            crudo.items.forEach(item => {
              if (item.talla === talla) {
                const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                
                if (esVenta) {
                  const kilosItem = calcularKilosCrudosItem(item);
                  totalKilos += kilosItem;
                  
                  let precioAUsar = null;
                  let fuentePrecio = '';
                  
                  if (item.precio && item.precio > 0) {
                    precioAUsar = item.precio;
                    fuentePrecio = 'individual';
                    hayPreciosIndividuales = true;
                  } else {
                    const clienteIdParaPrecios = obtenerClienteIdParaPrecios(cliente.nombre);
                    const precioSistema = obtenerPrecioVentaParaFecha(talla, fechaEmbarque, clienteIdParaPrecios);
                    if (precioSistema) {
                      precioAUsar = precioSistema.precio;
                      fuentePrecio = precioSistema.clienteId ? 'sistema-especifico' : 'sistema-general';
                    }
                  }
                  
                  if (precioAUsar && kilosItem > 0) {
                    const gananciaUnitaria = precioAUsar - costoBase;
                    const gananciaTotal = gananciaUnitaria * kilosItem;
                    
                    totalGanancias += gananciaTotal;
                    totalVentas += precioAUsar * kilosItem;
                    
                    detallesPorCliente.push({
                      cliente: cliente.nombre,
                      kilos: kilosItem,
                      precioVenta: precioAUsar,
                      gananciaUnitaria: gananciaUnitaria,
                      gananciaTotal: gananciaTotal,
                      fuentePrecio: fuentePrecio,
                      taras: item.taras,
                      sobrante: item.sobrante
                    });
                  }
                }
              }
            });
          }
        });
      }
    });
    
    if (totalKilos === 0 || detallesPorCliente.length === 0) {
      return null;
    }
    
    const precioPromedioPonderado = totalVentas / totalKilos;
    const gananciaUnitariaPromedio = totalGanancias / totalKilos;
    
    return {
      talla: talla,
      totalKilos: Math.round(totalKilos),
      precioVenta: Math.round(precioPromedioPonderado),
      costoBase: Math.round(costoBase),
      gananciaUnitaria: Math.round(gananciaUnitariaPromedio),
      gananciaTotal: Math.round(totalGanancias),
      hayPreciosIndividuales: hayPreciosIndividuales,
      detallesPorCliente: detallesPorCliente,
      fechaCalculo: new Date().toISOString().split('T')[0]
    };
  };

  // Inicializar costos por medida automáticamente
  const inicializarCostosPorMedida = async (embarqueData) => {
    try {
      const db = getFirestore();
      
      const historialRef = collection(db, 'historial_costos');
      const historialSnapshot = await getDocs(historialRef);
      
      const historialCompleto = [];
      historialSnapshot.forEach(doc => {
        const data = doc.data();
        historialCompleto.push({
          ...data,
          id: doc.id
        });
      });
      
      historialCompleto.sort((a, b) => {
        const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return timestampB - timestampA;
      });
      
      const costosRegistrados = {};
      const medidasProcesadas = new Set();
      
      historialCompleto.forEach(entrada => {
        if (!medidasProcesadas.has(entrada.medida)) {
          if (!entrada.eliminado && !entrada.medidaEliminada) {
            costosRegistrados[entrada.medida] = {
              costoBase: entrada.costoBase,
              fecha: entrada.fecha,
              timestamp: entrada.timestamp,
              id: entrada.id
            };
          }
          medidasProcesadas.add(entrada.medida);
        }
      });
      
      const costosEmbarque = embarqueData?.costosPorMedida || {};
      let costosActualizados = false;
      
      const tallasCrudos = obtenerTallasCrudosUnicas(embarqueData);
      
      tallasCrudos.forEach(talla => {
        let costoEncontrado = null;
        
        if (costosRegistrados[talla]) {
          costoEncontrado = costosRegistrados[talla];
        } else {
          const tallaLower = talla.toLowerCase();
          for (const [medida, costoInfo] of Object.entries(costosRegistrados)) {
            if (medida.toLowerCase() === tallaLower) {
              costoEncontrado = costoInfo;
              break;
            }
          }
        }
        
        if (costoEncontrado && !costosEmbarque[talla]) {
          costosEmbarque[talla] = costoEncontrado.costoBase;
          costosActualizados = true;
          console.log(`💰 Aplicando costo automático para ${talla}: $${costoEncontrado.costoBase}`);
        }
      });
      
      if (costosActualizados) {
        if (!embarqueData.costosPorMedida) {
          embarqueData.costosPorMedida = {};
        }
        Object.assign(embarqueData.costosPorMedida, costosEmbarque);
        
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          costosPorMedida: costosEmbarque
        });
        
        console.log('✅ Costos inicializados y guardados automáticamente');
      }
      
    } catch (error) {
      console.error('Error al inicializar costos por medida:', error);
    }
  };

  // Guardar estado de análisis de crudos
  const guardarEstadoAnalisisCrudos = async () => {
    try {
      const db = getFirestore();
      const embarqueRef = doc(db, 'embarques', embarqueId);
      
      await updateDoc(embarqueRef, {
        analizarGananciaCrudos: state.analizarGananciaCrudos
      });
      
      console.log('Estado de análisis de ganancia de crudos guardado correctamente');
    } catch (error) {
      console.error('Error al guardar estado de análisis de crudos:', error);
    }
  };

  // Determinar si mostrar detalle por cliente
  const deberMostrarDetallePorCliente = (talla) => {
    const gananciaCrudo = state.gananciasCalculadasCrudos[talla];
    if (!gananciaCrudo || !gananciaCrudo.detallesPorCliente) return false;
    
    if (gananciaCrudo.detallesPorCliente.length <= 1) return false;
    
    const precios = gananciaCrudo.detallesPorCliente.map(detalle => detalle.precioVenta);
    const preciosUnicos = new Set(precios);
    
    return preciosUnicos.size > 1;
  };

  // Formatear número
  const formatearNumero = (numero) => {
    if (!numero) return '0';
    const numeroSinDecimales = Math.floor(numero);
    return numeroSinDecimales.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Formatear precio
  const formatearPrecio = (precio) => {
    if (!precio) return '0';
    const numeroRedondeado = Math.round(precio);
    return numeroRedondeado.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return {
    // State
    gananciasCalculadasCrudos: computed(() => state.gananciasCalculadasCrudos),
    analizarGananciaCrudos: computed(() => state.analizarGananciaCrudos),
    pesoTaraCosto: computed(() => state.pesoTaraCosto),
    pesoTaraVenta: computed(() => state.pesoTaraVenta),
    
    // Methods
    obtenerTallasCrudosUnicas,
    calcularKilosCrudosItem,
    calcularCostoCrudoPorTalla,
    calcularGananciasPorTallaCrudo,
    inicializarCostosPorMedida,
    guardarEstadoAnalisisCrudos,
    deberMostrarDetallePorCliente,
    formatearNumero,
    formatearPrecio
  };
}