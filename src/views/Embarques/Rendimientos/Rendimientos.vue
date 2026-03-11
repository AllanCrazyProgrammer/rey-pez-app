<template>
  <div class="rendimientos-container">
    <div class="header-container">
      <button @click="volverAEmbarque" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver al Embarque
      </button>
      <h2>Rendimientos por Medida</h2>
      <button @click="abrirModalNota" class="btn-nota">
        <i class="fas fa-sticky-note"></i> Agregar Nota
      </button>
      <button @click="irAGestionCostos" class="btn-costos">
        <i class="fas fa-dollar-sign"></i> Gestión de Costos
      </button>
      <button @click="abrirModalConfiguracion" class="btn-configuracion">
        <i class="fas fa-cog"></i> Configurar Pesos
      </button>
      <button @click="generarPDF" class="btn-pdf">
        <i class="fas fa-file-pdf"></i> Generar PDF
      </button>
    </div>
    
    <div v-if="!embarqueData">
      <p>Cargando datos del embarque...</p>
    </div>
    
    <div v-else class="rendimientos-grid">
      <RendimientoCard
        v-for="(medida, index) in medidasUnicas"
        :key="index"
        :medida="medida"
        :nombre-personalizado="obtenerNombreMedidaPersonalizado(medida)"
        :kilos-crudos="kilosCrudos[medida] || 0"
        :total-embarcado="obtenerTotalEmbarcado(medida)"
        :rendimiento="calcularRendimiento(medida)"
        :medida-oculta="medidaOculta[medida] || false"
        :analizar-ganancia="analizarGanancia[medida] || false"
        :analizar-maquila-ganancia="analizarMaquilaGanancia[medida] || false"
        :precio-maquila="precioMaquila[medida] || 0"
        :ganancia-calculada="gananciasCalculadas[medida]"
        @editarNombre="editarNombreMedida"
        @editarEtiqueta="editarEtiqueta"
        @updateKilosCrudos="updateKilosCrudos"
        @toggleOcultar="toggleMedidaOculta"
        @toggleAnalizar="toggleAnalizarGanancia"
        @toggleMaquila="toggleAnalizarMaquilaGanancia"
        @updatePrecioMaquila="updatePrecioMaquila"
      />
    </div>

    <!-- Sección de Ganancias de Crudos -->
    <div v-if="embarqueData && tallasCrudos.length > 0" class="crudos-ganancias-section">
      <h2>💰 Ganancias de Crudos por Talla</h2>
      
      <div class="crudos-ganancias-grid">
        <CrudoGananciaCard
          v-for="talla in tallasCrudos"
          :key="'crudo-' + talla"
          :talla="talla"
          :analizar-ganancia="analizarGananciaCrudos[talla] || false"
          :ganancia="gananciasCalculadasCrudos[talla]"
          @toggleAnalizar="toggleAnalizarGananciaCrudos"
        />
      </div>
    </div>

    <!-- Modales -->
    <NotaModal
      :mostrar="mostrarModal"
      :nota="notaActual"
      @guardar="guardarNota"
      @cancelar="cerrarModal"
    />

    <ConfiguracionModal
      :mostrar="mostrarModalConfiguracion"
      :peso-tara-costo="pesoTaraCosto"
      :peso-tara-venta="pesoTaraVenta"
      @guardar="guardarConfiguracion"
      @cancelar="cerrarModalConfiguracion"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onActivated, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { generarPDFRendimientos } from '@/utils/RendimientosPdf';

// Composables
import { useRendimientosData } from './composables/useRendimientosData';
import { useGanancias } from './composables/useGanancias';

// Componentes
import RendimientoCard from './components/RendimientoCard.vue';
import CrudoGananciaCard from './components/CrudoGananciaCard.vue';
import NotaModal from './components/NotaModal.vue';
import ConfiguracionModal from './components/ConfiguracionModal.vue';

// Utilidades
import { esMedidaMix, calcularKilosCrudosItem, calcularCostoFinal } from './utils/calculations';

export default {
  name: 'Rendimientos',
  components: {
    RendimientoCard,
    CrudoGananciaCard,
    NotaModal,
    ConfiguracionModal
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    
    // Composables
    const {
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
      cargarEmbarque,
      obtenerTallasCrudosUnicas,
      obtenerTotalEmbarcado,
      calcularRendimiento,
      obtenerNombreMedidaPersonalizado,
      obtenerEtiqueta,
      guardarCambiosEnTiempoReal,
      rendimientosService
    } = useRendimientosData();
    
    const {
      gananciasCalculadas,
      gananciasCalculadasCrudos,
      cargarPreciosVenta,
      calcularGanancias,
      calcularGananciasCrudos
    } = useGanancias();
    
    // Estado local
    const mostrarModal = ref(false);
    const mostrarModalConfiguracion = ref(false);
    const notaActual = ref('');
    
    // Computed
    const tallasCrudos = computed(() => obtenerTallasCrudosUnicas());
    
    // Métodos principales
    const inicializar = async () => {
      const embarqueId = route.params.id;
      const [embarqueCargado, preciosCargados] = await Promise.all([
        cargarEmbarque(embarqueId),
        cargarPreciosVenta()
      ]);
      
      if (embarqueCargado && preciosCargados) {
        await nextTick();
        recalcularGanancias();
      }
    };
    
    const recalcularGanancias = () => {
      calcularGanancias(
        medidasUnicas.value,
        embarqueData.value,
        analizarGanancia.value,
        calcularRendimiento
      );
      
      calcularGananciasCrudos(
        embarqueData.value,
        analizarGananciaCrudos.value,
        pesoTaraVenta.value
      );
    };
    
    // Métodos de manejo de eventos
    const updateKilosCrudos = (medida, campo, valor) => {
      if (esMedidaMix(medida)) {
        if (!kilosCrudos.value[medida]) {
          kilosCrudos.value[medida] = { medida1: 0, medida2: 0 };
        }
        kilosCrudos.value[medida][campo] = Number(valor) || 0;
      } else {
        kilosCrudos.value[medida] = Number(valor) || 0;
      }
      
      guardarCambiosEnTiempoReal(route.params.id);
      nextTick(recalcularGanancias);
    };
    
    const toggleMedidaOculta = (medida) => {
      medidaOculta.value[medida] = !medidaOculta.value[medida];
      guardarEstadoOculto();
    };
    
    const toggleAnalizarGanancia = (medida) => {
      analizarGanancia.value[medida] = !analizarGanancia.value[medida];
      guardarEstadoAnalisis();
      nextTick(recalcularGanancias);
    };
    
    const toggleAnalizarMaquilaGanancia = (medida) => {
      analizarMaquilaGanancia.value[medida] = !analizarMaquilaGanancia.value[medida];
      guardarEstadoAnalisis();
    };
    
    const toggleAnalizarGananciaCrudos = (talla) => {
      analizarGananciaCrudos.value[talla] = !analizarGananciaCrudos.value[talla];
      guardarEstadoAnalisisCrudos();
      nextTick(recalcularGanancias);
    };
    
    const updatePrecioMaquila = (medida, valor) => {
      precioMaquila.value[medida] = Number(valor) || 0;
      guardarCambiosEnTiempoReal(route.params.id);
    };
    
    // Métodos de modales
    const abrirModalNota = () => {
      notaActual.value = embarqueData.value?.notaRendimientos || '';
      mostrarModal.value = true;
    };
    
    const cerrarModal = () => {
      mostrarModal.value = false;
      notaActual.value = '';
    };
    
    const guardarNota = async (nota) => {
      try {
        await rendimientosService.guardarNota(route.params.id, nota);
        embarqueData.value.notaRendimientos = nota;
        cerrarModal();
      } catch (error) {
        console.error('Error al guardar la nota:', error);
      }
    };
    
    const abrirModalConfiguracion = () => {
      mostrarModalConfiguracion.value = true;
    };
    
    const cerrarModalConfiguracion = () => {
      mostrarModalConfiguracion.value = false;
    };
    
    const guardarConfiguracion = async ({ pesoTaraCosto: nuevoPesoCosto, pesoTaraVenta: nuevoPesoVenta }) => {
      try {
        await rendimientosService.guardarConfiguracionPesos(
          route.params.id,
          nuevoPesoCosto,
          nuevoPesoVenta
        );
        
        pesoTaraCosto.value = nuevoPesoCosto;
        pesoTaraVenta.value = nuevoPesoVenta;
        
        cerrarModalConfiguracion();
        nextTick(recalcularGanancias);
      } catch (error) {
        console.error('Error al guardar configuración de pesos:', error);
        alert('Error al guardar la configuración. Intente nuevamente.');
      }
    };
    
    // Métodos de edición
    const editarNombreMedida = async (medida) => {
      const nombreActual = obtenerNombreMedidaPersonalizado(medida);
      const nuevoNombre = prompt('Ingrese el nuevo nombre para la medida:', nombreActual);
      
      if (nuevoNombre !== null && nuevoNombre.trim() !== '') {
        nombresMedidasPersonalizados.value[medida] = nuevoNombre.trim();
        
        try {
          await rendimientosService.actualizarNombresMedidas(
            route.params.id,
            nombresMedidasPersonalizados.value
          );
        } catch (error) {
          console.error('Error al guardar el nuevo nombre:', error);
        }
      }
    };
    
    const editarEtiqueta = (medida, campo) => {
      const etiquetaActual = obtenerEtiqueta(medida, campo);
      const nuevaEtiqueta = prompt('Ingrese el nuevo nombre para la medida:', etiquetaActual);
      
      if (nuevaEtiqueta !== null) {
        if (!kilosCrudos.value[medida]) {
          kilosCrudos.value[medida] = {
            medida1: 0,
            medida2: 0,
            etiqueta1: 'Kilos en crudo (Medida 1)',
            etiqueta2: 'Kilos en crudo (Medida 2)'
          };
        }
        
        const etiquetaKey = campo === 'medida1' ? 'etiqueta1' : 'etiqueta2';
        kilosCrudos.value[medida][etiquetaKey] = nuevaEtiqueta;
        guardarCambiosEnTiempoReal(route.params.id);
      }
    };
    
    // Métodos de navegación
    const volverAEmbarque = () => {
      router.push({
        name: 'EditarEmbarque',
        params: { id: route.params.id }
      });
    };
    
    const irAGestionCostos = () => {
      router.push({
        name: 'GestionCostos',
        params: { id: route.params.id }
      });
    };
    
    // Método para generar PDF
    const generarPDF = () => {
      const datosRendimientos = medidasUnicas.value
        .filter(medida => !medidaOculta.value[medida])
        .map(medida => {
          let kilosCrudosValor;
          if (esMedidaMix(medida)) {
            kilosCrudosValor = {
              medida1: Number(kilosCrudos.value[medida]?.medida1 || 0),
              medida2: Number(kilosCrudos.value[medida]?.medida2 || 0)
            };
          } else {
            kilosCrudosValor = Number(kilosCrudos.value[medida] || 0);
          }

          const rendimiento = calcularRendimiento(medida);
          const costoFinal = calcularCostoFinal(medida, embarqueData.value, rendimiento);

          return {
            medida: medida,
            kilosCrudos: kilosCrudosValor,
            totalEmbarcado: obtenerTotalEmbarcado(medida),
            rendimiento: rendimiento,
            costoFinal: costoFinal
          };
        });

      const embarqueDataConNota = {
        ...embarqueData.value,
        notaRendimientos: embarqueData.value?.notaRendimientos || '',
        mostrarColumnaCosto: true
      };

      const gananciasVisibles = Object.entries(gananciasCalculadas.value)
        .filter(([medida]) => !medidaOculta.value[medida] && analizarGanancia.value[medida])
        .reduce((acc, [medida, ganancia]) => {
          acc[medida] = ganancia;
          return acc;
        }, {});

      const tarasCrudosPorMedida = calcularTarasCrudosPorMedida();
      const gananciasVisiblesCrudos = Object.entries(gananciasCalculadasCrudos.value)
        .filter(([talla]) => analizarGananciaCrudos.value[talla])
        .reduce((acc, [talla, ganancia]) => {
          acc[talla] = ganancia;
          return acc;
        }, {});

      const costosCrudos = calcularCostosCrudos(tarasCrudosPorMedida);
      const configuracionPesos = {
        pesoTaraCosto: pesoTaraCosto.value,
        pesoTaraVenta: pesoTaraVenta.value
      };

      const gananciasVisiblesMaquila = {};
      Object.keys(analizarMaquilaGanancia.value).forEach(medida => {
        if (analizarMaquilaGanancia.value[medida] && !medidaOculta.value[medida]) {
          gananciasVisiblesMaquila[medida] = {
            totalEmbarcado: obtenerTotalEmbarcado(medida),
            precioMaquila: Number(precioMaquila.value[medida]) || 0,
            gananciaTotal: obtenerTotalEmbarcado(medida) * (Number(precioMaquila.value[medida]) || 0)
          };
        }
      });

      generarPDFRendimientos(
        datosRendimientos,
        embarqueDataConNota,
        gananciasVisibles,
        tarasCrudosPorMedida,
        gananciasVisiblesCrudos,
        costosCrudos,
        configuracionPesos,
        gananciasVisiblesMaquila
      );
    };
    
    // Métodos auxiliares para PDF
    const calcularTarasCrudosPorMedida = () => {
      if (!embarqueData.value || !embarqueData.value.clientes) return {};
      
      const tarasPorMedida = {};
      
      embarqueData.value.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.talla) {
                  const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                  
                  if (esVenta) {
                    const medida = item.talla;
                    
                    if (!tarasPorMedida[medida]) {
                      tarasPorMedida[medida] = {
                        totalTaras: 0,
                        totalKilos: 0,
                        detalles: []
                      };
                    }
                  
                    const kilosItem = calcularKilosCrudosItem(item, pesoTaraVenta.value);
                    tarasPorMedida[medida].totalKilos += kilosItem;
                  }
                }
              });
            }
          });
        }
      });
      
      return tarasPorMedida;
    };
    
    const calcularCostosCrudos = (tarasCrudosPorMedida) => {
      if (!tarasCrudosPorMedida || !embarqueData.value) return {};
      
      const costosCrudos = {};
      const costosEmbarque = embarqueData.value.costosPorMedida || {};
      
      const medidasCrudo = Object.keys(tarasCrudosPorMedida);
      
      medidasCrudo.forEach(medida => {
        const costoBase = Number(costosEmbarque[medida]) || 0;
        const costoFinal = costoBase + 3.5;
        
        costosCrudos[medida] = {
          costoBase: costoBase,
          costoFinal: costoFinal
        };
      });
      
      return costosCrudos;
    };
    
    // Métodos de guardado
    const guardarEstadoOculto = async () => {
      try {
        await rendimientosService.guardarCambios(route.params.id, {
          medidaOculta: medidaOculta.value
        });
      } catch (error) {
        console.error('Error al guardar estado de ocultación:', error);
      }
    };
    
    const guardarEstadoAnalisis = async () => {
      try {
        await rendimientosService.guardarCambios(route.params.id, {
          analizarGanancia: analizarGanancia.value,
          analizarMaquilaGanancia: analizarMaquilaGanancia.value,
          precioMaquila: precioMaquila.value
        });
      } catch (error) {
        console.error('Error al guardar estado de análisis:', error);
      }
    };
    
    const guardarEstadoAnalisisCrudos = async () => {
      try {
        await rendimientosService.guardarCambios(route.params.id, {
          analizarGananciaCrudos: analizarGananciaCrudos.value
        });
      } catch (error) {
        console.error('Error al guardar estado de análisis de crudos:', error);
      }
    };
    
    // Watchers
    watch(analizarGanancia, () => {
      nextTick(recalcularGanancias);
    }, { deep: true });
    
    watch(analizarGananciaCrudos, () => {
      nextTick(recalcularGanancias);
    }, { deep: true });
    
    watch([pesoTaraCosto, pesoTaraVenta], () => {
      if (embarqueData.value) {
        nextTick(recalcularGanancias);
      }
    });
    
    // Lifecycle hooks
    onMounted(inicializar);
    onActivated(async () => {
      console.log('Recargando datos de rendimientos...');
      await inicializar();
    });
    
    return {
      // Estado
      embarqueData,
      kilosCrudos,
      medidasUnicas,
      medidaOculta,
      analizarGanancia,
      analizarGananciaCrudos,
      analizarMaquilaGanancia,
      precioMaquila,
      pesoTaraCosto,
      pesoTaraVenta,
      gananciasCalculadas,
      gananciasCalculadasCrudos,
      mostrarModal,
      mostrarModalConfiguracion,
      notaActual,
      tallasCrudos,
      
      // Métodos
      obtenerTotalEmbarcado,
      calcularRendimiento,
      obtenerNombreMedidaPersonalizado,
      updateKilosCrudos,
      toggleMedidaOculta,
      toggleAnalizarGanancia,
      toggleAnalizarMaquilaGanancia,
      toggleAnalizarGananciaCrudos,
      updatePrecioMaquila,
      editarNombreMedida,
      editarEtiqueta,
      abrirModalNota,
      cerrarModal,
      guardarNota,
      abrirModalConfiguracion,
      cerrarModalConfiguracion,
      guardarConfiguracion,
      volverAEmbarque,
      irAGestionCostos,
      generarPDF
    };
  }
};
</script>

<style scoped>
.rendimientos-container {
  padding: 20px;
}

.header-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.btn-volver,
.btn-nota,
.btn-costos,
.btn-configuracion,
.btn-pdf {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-volver {
  background-color: #3498db;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-nota {
  background-color: #f39c12;
  margin-left: auto;
  margin-right: 10px;
}

.btn-nota:hover {
  background-color: #d68910;
}

.btn-costos {
  background-color: #2ecc71;
  margin-right: 10px;
}

.btn-costos:hover {
  background-color: #27ae60;
}

.btn-configuracion {
  background-color: #9b59b6;
  margin-right: 10px;
}

.btn-configuracion:hover {
  background-color: #8e44ad;
}

.btn-pdf {
  background-color: #e74c3c;
}

.btn-pdf:hover {
  background-color: #c0392b;
}

.btn-volver i,
.btn-nota i,
.btn-costos i,
.btn-configuracion i,
.btn-pdf i {
  margin-right: 10px;
}

.rendimientos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.crudos-ganancias-section {
  margin-top: 40px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.crudos-ganancias-section h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: center;
  font-size: 1.6em;
}

.crudos-ganancias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .header-container {
    flex-wrap: wrap;
    gap: 10px;
  }

  .btn-configuracion,
  .btn-nota,
  .btn-costos {
    margin-left: 0;
    margin-right: 0;
  }

  .rendimientos-grid {
    grid-template-columns: 1fr;
  }

  .crudos-ganancias-grid {
    grid-template-columns: 1fr;
  }
}
</style>