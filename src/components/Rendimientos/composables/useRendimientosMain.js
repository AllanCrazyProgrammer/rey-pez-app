import { watch, nextTick } from 'vue';
import { useRendimientos } from './useRendimientos';
import { useGanancias } from './useGanancias';
import { useGananciasCrudos } from './useGananciasCrudos';
import { useModales } from './useModales';
import { useMaquilaGanancias } from './useMaquilaGanancias';

export function useRendimientosMain(embarqueId) {
  // Inicializar todos los composables
  const rendimientos = useRendimientos(embarqueId);
  const ganancias = useGanancias(embarqueId);
  const gananciasCrudos = useGananciasCrudos(embarqueId);
  const modales = useModales(embarqueId);
  const maquilaGanancias = useMaquilaGanancias(embarqueId);

  // Inicialización
  const inicializar = async () => {
    await rendimientos.cargarEmbarque();
    await ganancias.cargarPreciosVenta();
    
    // Cargar configuraciones después de cargar el embarque
    if (rendimientos.embarqueData.value) {
      modales.cargarConfiguracion(rendimientos.embarqueData.value);
      maquilaGanancias.cargarConfiguracion(rendimientos.embarqueData.value);
      gananciasCrudos.analizarGananciaCrudos = rendimientos.embarqueData.value.analizarGananciaCrudos || {};
      ganancias.analizarGanancia = rendimientos.embarqueData.value.analizarGanancia || {};
    }
  };

  // Calcular ganancias principales
  const calcularGanancias = () => {
    if (!rendimientos.embarqueData.value) return;
    
    const fechaEmbarque = rendimientos.embarqueData.value.fecha || new Date().toISOString().split('T')[0];
    const gananciasResult = {};
    
    rendimientos.medidasUnicas.value.forEach(medida => {
      if (!ganancias.analizarGanancia.value[medida]) return;
      
      const costoFinal = ganancias.calcularCostoFinal(medida, rendimientos.embarqueData.value);
      const costosEmbarque = rendimientos.embarqueData.value?.costosPorMedida || {};
      const costoBase = Number(costosEmbarque[medida]) || 0;
      
      const clientesConMedida = obtenerClientesConMedida(medida);
      const resultadoCalculo = ganancias.calcularPrecioYGanancias(medida, fechaEmbarque, clientesConMedida, costoFinal, costoBase);
      
      if (resultadoCalculo) {
        gananciasResult[medida] = resultadoCalculo;
      }
    });
    
    ganancias.gananciasCalculadas = gananciasResult;
  };

  // Calcular ganancias de crudos
  const calcularGananciasCrudos = () => {
    if (!rendimientos.embarqueData.value) return;
    
    const fechaEmbarque = rendimientos.embarqueData.value.fecha || new Date().toISOString().split('T')[0];
    const gananciasResult = {};
    const tallasCrudos = gananciasCrudos.obtenerTallasCrudosUnicas(rendimientos.embarqueData.value);
    
    tallasCrudos.forEach(talla => {
      if (!gananciasCrudos.analizarGananciaCrudos.value[talla]) return;
      
      const resultadoCalculo = gananciasCrudos.calcularGananciasPorTallaCrudo(
        talla, 
        fechaEmbarque, 
        rendimientos.embarqueData.value,
        ganancias.obtenerPrecioVentaParaFecha,
        ganancias.obtenerClienteIdParaPrecios
      );
      
      if (resultadoCalculo) {
        gananciasResult[talla] = resultadoCalculo;
      }
    });
    
    gananciasCrudos.gananciasCalculadasCrudos = gananciasResult;
  };

  // Obtener clientes con medida específica
  const obtenerClientesConMedida = (medida) => {
    if (!rendimientos.embarqueData.value || !rendimientos.embarqueData.value.clientes) return [];
    
    const clientesConMedida = [];
    const esOzuna = medida.includes('Maquila Ozuna');
    const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
    
    rendimientos.embarqueData.value.clientes.forEach(cliente => {
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
            const totalBolsas = calcularTotalBolsas(producto);
            const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
            totalEmbarcado += (totalBolsas * valorNeto);
          } else {
            const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            const sumaTaras = calcularTotalTaras(producto);
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

  // Utilidades auxiliares
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

  // Watchers para recálculo automático
  watch(() => rendimientos.kilosCrudos.value, () => {
    nextTick(() => {
      calcularGanancias();
    });
  }, { deep: true });

  watch(() => ganancias.analizarGanancia.value, () => {
    nextTick(() => {
      calcularGanancias();
    });
  }, { deep: true });

  watch(() => gananciasCrudos.analizarGananciaCrudos.value, (newValue, oldValue) => {
    const seMadeChangio = Object.keys(newValue).some(talla => {
      return newValue[talla] && !oldValue[talla];
    });
    
    if (seMadeChangio) {
      gananciasCrudos.inicializarCostosPorMedida(rendimientos.embarqueData.value).then(() => {
        nextTick(() => {
          calcularGananciasCrudos();
        });
      });
    } else {
      nextTick(() => {
        calcularGananciasCrudos();
      });
    }
  }, { deep: true });

  return {
    // Desde useRendimientos
    ...rendimientos,
    
    // Desde useGanancias
    preciosVenta: ganancias.preciosVenta,
    gananciasCalculadas: ganancias.gananciasCalculadas,
    analizarGanancia: ganancias.analizarGanancia,
    formatearPrecio: ganancias.formatearPrecio,
    formatearFecha: ganancias.formatearFecha,
    
    // Desde useGananciasCrudos
    gananciasCalculadasCrudos: gananciasCrudos.gananciasCalculadasCrudos,
    analizarGananciaCrudos: gananciasCrudos.analizarGananciaCrudos,
    obtenerTallasCrudosUnicas: gananciasCrudos.obtenerTallasCrudosUnicas,
    deberMostrarDetallePorCliente: gananciasCrudos.deberMostrarDetallePorCliente,
    formatearNumero: gananciasCrudos.formatearNumero,
    
    // Desde useModales
    mostrarModal: modales.mostrarModal,
    mostrarModalConfiguracion: modales.mostrarModalConfiguracion,
    nota: modales.nota,
    medidaOculta: modales.medidaOculta,
    pesoTaraCosto: modales.pesoTaraCosto,
    pesoTaraVenta: modales.pesoTaraVenta,
    abrirModalNota: modales.abrirModalNota,
    cerrarModal: modales.cerrarModal,
    guardarNota: modales.guardarNota,
    abrirModalConfiguracion: modales.abrirModalConfiguracion,
    cerrarModalConfiguracion: modales.cerrarModalConfiguracion,
    guardarConfiguracion: modales.guardarConfiguracion,
    guardarEstadoOculto: modales.guardarEstadoOculto,
    
    // Desde useMaquilaGanancias
    analizarMaquilaGanancia: maquilaGanancias.analizarMaquilaGanancia,
    precioMaquila: maquilaGanancias.precioMaquila,
    calcularGananciaMaquila: maquilaGanancias.calcularGananciaMaquila,
    
    // Métodos principales
    inicializar,
    calcularGanancias,
    calcularGananciasCrudos,
    obtenerClientesConMedida,
    
    // Métodos auxiliares
    calcularTotalTaras,
    calcularTotalBolsas,
    
    // Guardar estados
    guardarEstadoAnalisis: ganancias.guardarEstadoAnalisis,
    guardarEstadoAnalisisCrudos: gananciasCrudos.guardarEstadoAnalisisCrudos,
    guardarCambiosMaquila: maquilaGanancias.guardarCambios
  };
}