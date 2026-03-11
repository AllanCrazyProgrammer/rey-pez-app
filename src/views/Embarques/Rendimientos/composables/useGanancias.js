import { ref, computed } from 'vue';
import { RendimientosService } from '../services/rendimientosService';
import { calcularCostoFinal, calcularKilosCrudosItem, calcularGananciaMaquila } from '../utils/calculations';

/**
 * Composable para manejar los cálculos de ganancias
 */
export function useGanancias() {
  const rendimientosService = new RendimientosService();
  
  // Estado reactivo
  const preciosVenta = ref({});
  const gananciasCalculadas = ref({});
  const gananciasCalculadasCrudos = ref({});
  const diasRecientes = ref(3);

  /**
   * Cargar precios de venta
   */
  const cargarPreciosVenta = async () => {
    try {
      const precios = await rendimientosService.cargarPreciosVenta();
      preciosVenta.value = precios;
      return true;
    } catch (error) {
      console.error('Error al cargar precios de venta:', error);
      return false;
    }
  };

  /**
   * Mapear nombres de clientes con IDs del sistema de precios
   */
  const obtenerClienteIdParaPrecios = (nombreCliente) => {
    const nombre = nombreCliente.toLowerCase();
    if (nombre.includes('joselito')) return 'joselito';
    if (nombre.includes('catarro')) return 'catarro';
    if (nombre.includes('otilio')) return 'otilio';
    if (nombre.includes('ozuna')) return 'ozuna';
    return null;
  };

  /**
   * Obtener precio de venta para una fecha específica
   */
  const obtenerPrecioVentaParaFecha = (medida, fechaEmbarque, clienteId = null) => {
    const medidaNormalizada = medida.toLowerCase().trim().replace(' maquila ozuna', '');
    
    let preciosProducto = preciosVenta.value[medidaNormalizada];
    
    if (!preciosProducto || preciosProducto.length === 0) {
      const medidaConEspacio = medidaNormalizada.replace(/-/g, ' ');
      const medidaConGuion = medidaNormalizada.replace(/ /g, '-');
      
      preciosProducto = preciosVenta.value[medidaConEspacio] || preciosVenta.value[medidaConGuion];
    }
    
    if (!preciosProducto || preciosProducto.length === 0) {
      return null;
    }
    
    const fechaEmbarqueStr = new Date(fechaEmbarque).toISOString().split('T')[0];
    const fechaHoy = new Date().toISOString().split('T')[0];
    const fechaEmbarqueObj = new Date(fechaEmbarqueStr);
    const fechaHoyObj = new Date(fechaHoy);
    const diasDiferencia = Math.floor((fechaHoyObj - fechaEmbarqueObj) / (1000 * 60 * 60 * 24));
    
    const embarqueEsReciente = diasDiferencia <= diasRecientes.value;
    const embarqueEsHoyOFuturo = fechaEmbarqueStr >= fechaHoy;
    const debeUsarPreciosRecientes = embarqueEsReciente || embarqueEsHoyOFuturo;
    
    if (debeUsarPreciosRecientes) {
      if (clienteId) {
        const precioEspecificoReciente = preciosProducto.find(p => p.clienteId === clienteId);
        if (precioEspecificoReciente) {
          return precioEspecificoReciente;
        }
      }
      
      const precioGeneralReciente = preciosProducto.find(p => !p.clienteId);
      if (precioGeneralReciente) {
        return precioGeneralReciente;
      }
    } else {
      if (clienteId) {
        for (const precio of preciosProducto) {
          const fechaPrecioStr = new Date(precio.fecha).toISOString().split('T')[0];
          if (fechaPrecioStr <= fechaEmbarqueStr && precio.clienteId === clienteId) {
            return precio;
          }
        }
      }
      
      for (const precio of preciosProducto) {
        const fechaPrecioStr = new Date(precio.fecha).toISOString().split('T')[0];
        if (fechaPrecioStr <= fechaEmbarqueStr && !precio.clienteId) {
          return precio;
        }
      }
    }
    
    const preciosGenerales = preciosProducto.filter(p => !p.clienteId);
    if (preciosGenerales.length > 0) {
      return preciosGenerales[preciosGenerales.length - 1];
    }
    
    return preciosProducto[preciosProducto.length - 1];
  };

  /**
   * Obtener clientes que tienen productos de una medida específica
   */
  const obtenerClientesConMedida = (medida, embarqueData) => {
    if (!embarqueData || !embarqueData.clientes) return [];
    
    const clientesConMedida = [];
    const esOzuna = medida.includes('Maquila Ozuna');
    const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
    
    embarqueData.clientes.forEach(cliente => {
      let totalEmbarcado = 0;
      
      cliente.productos.forEach(producto => {
        if (!producto.medida) return;
        
        let incluir = false;
        
        if (esOzuna) {
          incluir = producto.medida.toLowerCase().trim() === medidaBase && 
                   cliente.nombre === 'Ozuna' && 
                   !producto.esVenta;
        } else {
          incluir = producto.medida.toLowerCase().trim() === medidaBase && 
                   (cliente.nombre !== 'Ozuna' || producto.esVenta);
        }
        
        if (incluir) {
          if (producto.tipo === 'c/h20') {
            // Calcular total bolsas
            const reporteTaras = producto.reporteTaras || [];
            const reporteBolsas = producto.reporteBolsas || [];
            let sumaTotalKilos = 0;
            for (let i = 0; i < reporteTaras.length; i++) {
              const taras = parseInt(reporteTaras[i]) || 0;
              const bolsa = parseInt(reporteBolsas[i]) || 0;
              sumaTotalKilos += taras * bolsa;
            }
            const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
            totalEmbarcado += (sumaTotalKilos * valorNeto);
          } else {
            const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            const sumaTaras = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0) +
                             (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
            const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
            totalEmbarcado += (sumaKilos - descuentoTaras);
          }
        }
      });
      
      if (totalEmbarcado > 0) {
        clientesConMedida.push({
          cliente: cliente,
          totalEmbarcado: totalEmbarcado
        });
      }
    });
    
    return clientesConMedida;
  };

  /**
   * Calcular precio y ganancias para una medida
   */
  const calcularPrecioYGanancias = (medida, fechaEmbarque, clientesConMedida, costoFinal, costoBase) => {
    let gananciasPorCliente = [];
    let totalEmbarcadoGeneral = 0;
    let gananciaTotalSumada = 0;
    let totalVentasPonderadas = 0;
    
    const precioGeneral = obtenerPrecioVentaParaFecha(medida, fechaEmbarque, null);
    const fechaGeneral = precioGeneral ? new Date(precioGeneral.fecha) : null;
    
    clientesConMedida.forEach(({ cliente, totalEmbarcado }) => {
      const clienteIdParaPrecios = obtenerClienteIdParaPrecios(cliente.nombre);
      const precioEspecifico = obtenerPrecioVentaParaFecha(medida, fechaEmbarque, clienteIdParaPrecios);
      
      let precioAUsar = precioGeneral;
      let esEspecifico = false;
      
      if (precioEspecifico && precioEspecifico.clienteId) {
        const fechaEspecifico = new Date(precioEspecifico.fecha);
        if (!fechaGeneral || fechaEspecifico > fechaGeneral) {
          precioAUsar = precioEspecifico;
          esEspecifico = true;
        }
      }
      
      if (precioAUsar) {
        const precioUnitario = Math.round(precioAUsar.precio);
        const gananciaUnitaria = Math.round(precioUnitario - costoFinal);
        const gananciaTotal = Math.round(gananciaUnitaria * totalEmbarcado);
        
        gananciasPorCliente.push({
          cliente: cliente.nombre,
          precioVenta: precioUnitario,
          totalEmbarcado: totalEmbarcado,
          gananciaUnitaria: gananciaUnitaria,
          gananciaTotal: gananciaTotal,
          fechaPrecio: precioAUsar.fecha,
          esEspecifico: esEspecifico,
          clienteId: precioAUsar.clienteId || null
        });
        
        totalEmbarcadoGeneral += totalEmbarcado;
        gananciaTotalSumada += gananciaTotal;
        totalVentasPonderadas += precioUnitario * totalEmbarcado;
      }
    });
    
    if (gananciasPorCliente.length === 0) return null;
    
    const precioPromedioPonderado = totalEmbarcadoGeneral > 0 ? 
      Math.round(totalVentasPonderadas / totalEmbarcadoGeneral) : 0;
    
    const clientesConEspecifico = gananciasPorCliente.filter(g => g.esEspecifico);
    const preciosUnicos = new Set(gananciasPorCliente.map(g => g.precioVenta));
    const tieneMultiplesPrecios = preciosUnicos.size > 1;
    const soloUnCliente = gananciasPorCliente.length === 1;
    
    let infoMostrar = {
      esPromedio: tieneMultiplesPrecios,
      esEspecifico: false,
      clienteEspecifico: null,
      clientesConEspecifico: clientesConEspecifico.map(c => c.cliente),
      fechaMasReciente: gananciasPorCliente.reduce((fecha, g) => {
        const fechaActual = new Date(g.fechaPrecio);
        return !fecha || fechaActual > fecha ? fechaActual : fecha;
      }, null)
    };
    
    if (clientesConEspecifico.length === 1 && soloUnCliente) {
      infoMostrar.esEspecifico = true;
      infoMostrar.esPromedio = false;
      infoMostrar.clienteEspecifico = clientesConEspecifico[0].cliente;
    }
    
    return {
      precioVenta: precioPromedioPonderado,
      costoFinal: Math.round(costoFinal),
      costoBase: Math.round(costoBase || 0),
      gananciaUnitaria: Math.round(precioPromedioPonderado - costoFinal),
      gananciaTotal: gananciaTotalSumada,
      totalEmbarcado: Math.round(totalEmbarcadoGeneral),
      fechaPrecio: infoMostrar.fechaMasReciente?.toISOString().split('T')[0],
      esPromedio: infoMostrar.esPromedio,
      esEspecifico: infoMostrar.esEspecifico,
      clienteEspecifico: infoMostrar.clienteEspecifico,
      clientesConEspecifico: infoMostrar.clientesConEspecifico,
      detallesPorCliente: gananciasPorCliente
    };
  };

  /**
   * Calcular ganancias principales
   */
  const calcularGanancias = (medidasUnicas, embarqueData, analizarGanancia, calcularRendimiento) => {
    if (!embarqueData) return {};
    
    const fechaEmbarque = embarqueData.fecha || new Date().toISOString().split('T')[0];
    const ganancias = {};
    
    medidasUnicas.forEach(medida => {
      if (!analizarGanancia[medida]) return;
      
      const rendimiento = calcularRendimiento(medida);
      const costoFinal = calcularCostoFinal(medida, embarqueData, rendimiento);
      const costosEmbarque = embarqueData?.costosPorMedida || {};
      const costoBase = Number(costosEmbarque[medida]) || 0;
      
      const clientesConMedida = obtenerClientesConMedida(medida, embarqueData);
      const resultadoCalculo = calcularPrecioYGanancias(medida, fechaEmbarque, clientesConMedida, costoFinal, costoBase);
      
      if (resultadoCalculo) {
        ganancias[medida] = resultadoCalculo;
      }
    });
    
    gananciasCalculadas.value = ganancias;
    return ganancias;
  };

  /**
   * Calcular ganancias de crudos
   */
  const calcularGananciasCrudos = (embarqueData, analizarGananciaCrudos, pesoTaraVenta) => {
    if (!embarqueData) return {};
    
    const fechaEmbarque = embarqueData.fecha || new Date().toISOString().split('T')[0];
    const ganancias = {};
    const tallasCrudos = obtenerTallasCrudosUnicas(embarqueData);
    
    tallasCrudos.forEach(talla => {
      if (!analizarGananciaCrudos[talla]) return;
      
      const resultadoCalculo = calcularGananciasPorTallaCrudo(talla, fechaEmbarque, embarqueData, pesoTaraVenta);
      if (resultadoCalculo) {
        ganancias[talla] = resultadoCalculo;
      }
    });
    
    gananciasCalculadasCrudos.value = ganancias;
    return ganancias;
  };

  /**
   * Obtener tallas de crudos únicas
   */
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

  /**
   * Calcular ganancias por talla de crudo
   */
  const calcularGananciasPorTallaCrudo = (talla, fechaEmbarque, embarqueData, pesoTaraVenta) => {
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
                  const kilosItem = calcularKilosCrudosItem(item, pesoTaraVenta);
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

  /**
   * Calcular costo para una talla de crudo
   */
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

  /**
   * Verificar si se debe mostrar detalle por cliente
   */
  const deberMostrarDetallePorCliente = (talla) => {
    const gananciaCrudo = gananciasCalculadasCrudos.value[talla];
    if (!gananciaCrudo || !gananciaCrudo.detallesPorCliente) return false;
    
    if (gananciaCrudo.detallesPorCliente.length <= 1) return false;
    
    const precios = gananciaCrudo.detallesPorCliente.map(detalle => detalle.precioVenta);
    const preciosUnicos = new Set(precios);
    
    return preciosUnicos.size > 1;
  };

  return {
    // Estado
    preciosVenta,
    gananciasCalculadas,
    gananciasCalculadasCrudos,
    diasRecientes,
    
    // Métodos
    cargarPreciosVenta,
    calcularGanancias,
    calcularGananciasCrudos,
    obtenerClienteIdParaPrecios,
    obtenerPrecioVentaParaFecha,
    deberMostrarDetallePorCliente,
    
    // Servicios
    rendimientosService
  };
}