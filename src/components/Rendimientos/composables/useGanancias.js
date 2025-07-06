import { reactive, computed } from 'vue';
import { getFirestore, doc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

export function useGanancias(embarqueId) {
  const state = reactive({
    preciosVenta: {},
    gananciasCalculadas: {},
    analizarGanancia: {},
    diasRecientes: 3
  });

  // Cargar precios de venta
  const cargarPreciosVenta = async () => {
    try {
      const db = getFirestore();
      const preciosRef = collection(db, 'precios');
      const q = query(preciosRef, orderBy('fecha', 'desc'));
      const preciosSnapshot = await getDocs(q);
      
      const preciosMap = new Map();
      
      preciosSnapshot.docs.forEach(docSnapshot => {
        const precio = { id: docSnapshot.id, ...docSnapshot.data() };
        const clave = precio.producto.toLowerCase().trim();
        
        if (!preciosMap.has(clave)) {
          preciosMap.set(clave, []);
        }
        preciosMap.get(clave).push(precio);
      });
      
      const preciosOrganizados = {};
      preciosMap.forEach((precios, producto) => {
        const preciosOrdenados = precios.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        preciosOrganizados[producto] = preciosOrdenados;
      });
      
      state.preciosVenta = preciosOrganizados;
    } catch (error) {
      console.error('Error al cargar precios de venta:', error);
    }
  };

  // Obtener precio de venta para fecha específica
  const obtenerPrecioVentaParaFecha = (medida, fechaEmbarque, clienteId = null) => {
    const medidaNormalizada = medida.toLowerCase().trim().replace(' maquila ozuna', '');
    
    let preciosProducto = state.preciosVenta[medidaNormalizada];
    
    if (!preciosProducto || preciosProducto.length === 0) {
      const medidaConEspacio = medidaNormalizada.replace(/-/g, ' ');
      const medidaConGuion = medidaNormalizada.replace(/ /g, '-');
      
      preciosProducto = state.preciosVenta[medidaConEspacio] || state.preciosVenta[medidaConGuion];
    }
    
    if (!preciosProducto || preciosProducto.length === 0) {
      return null;
    }
    
    const fechaEmbarqueStr = new Date(fechaEmbarque).toISOString().split('T')[0];
    const fechaEmbarqueObj = new Date(fechaEmbarqueStr);
    const fechaHoy = new Date().toISOString().split('T')[0];
    const fechaHoyObj = new Date(fechaHoy);
    const diasDiferencia = Math.floor((fechaHoyObj - fechaEmbarqueObj) / (1000 * 60 * 60 * 24));
    
    const embarqueEsReciente = diasDiferencia <= state.diasRecientes;
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

  // Mapear nombres de clientes
  const obtenerClienteIdParaPrecios = (nombreCliente) => {
    const nombre = nombreCliente.toLowerCase();
    if (nombre.includes('joselito')) return 'joselito';
    if (nombre.includes('catarro')) return 'catarro';
    if (nombre.includes('otilio')) return 'otilio';
    if (nombre.includes('ozuna')) return 'ozuna';
    return null;
  };

  // Calcular costo final
  const calcularCostoFinal = (medida, embarqueData) => {
    const costosEmbarque = embarqueData?.costosPorMedida || {};
    const costo = Number(costosEmbarque[medida]) || 0;
    const rendimiento = calcularRendimiento(medida);
    const costoExtra = Number(embarqueData?.costoExtra) || 18;
    
    const esMedidaOzunaMaquila = medida.includes('Maquila Ozuna');
    const esMedidaNumerica = /^\d+\/\d+$/.test(medida.trim()) || /^\d+$/.test(medida.trim());
    
    if (esMedidaOzunaMaquila || !esMedidaNumerica) {
      return Math.round(costo * rendimiento);
    } else {
      return Math.round((costo * rendimiento) + costoExtra);
    }
  };

  // Calcular precio y ganancias
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

  // Guardar estado de análisis
  const guardarEstadoAnalisis = async () => {
    try {
      const db = getFirestore();
      const embarqueRef = doc(db, 'embarques', embarqueId);
      
      await updateDoc(embarqueRef, {
        analizarGanancia: state.analizarGanancia
      });
      
      console.log('Estado de análisis de ganancia guardado correctamente');
    } catch (error) {
      console.error('Error al guardar estado de análisis de ganancia:', error);
    }
  };

  // Formatear precio
  const formatearPrecio = (precio) => {
    if (!precio) return '0';
    const numeroRedondeado = Math.round(precio);
    return numeroRedondeado.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Formatear fecha
  const formatearFecha = (fechaString) => {
    if (!fechaString) return '';
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return {
    // State
    preciosVenta: computed(() => state.preciosVenta),
    gananciasCalculadas: computed(() => state.gananciasCalculadas),
    analizarGanancia: computed(() => state.analizarGanancia),
    
    // Methods
    cargarPreciosVenta,
    obtenerPrecioVentaParaFecha,
    obtenerClienteIdParaPrecios,
    calcularCostoFinal,
    calcularPrecioYGanancias,
    guardarEstadoAnalisis,
    formatearPrecio,
    formatearFecha
  };
}