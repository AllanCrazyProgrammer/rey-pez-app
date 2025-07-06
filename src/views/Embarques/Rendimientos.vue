<template>
  <div class="rendimientos-container">
    <div class="header-container">
      <button @click="volverAEmbarque" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver al Embarque
      </button>
      <h2>Rendimientos por Medida</h2>
      <button @click="abrirModalNota(embarqueData?.notaRendimientos)" class="btn-nota">
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
      <div v-for="(medida, index) in medidasUnicas" :key="index" class="rendimiento-card">
        <div class="medida-info">
          <div class="medida-header">
            <span class="medida-label editable-label" @click="editarNombreMedida(medida)">
              {{ obtenerNombreMedidaPersonalizado(medida) }}
            </span>
            <div class="controles-medida">
              <div class="ocultar-control">
                <input 
                  type="checkbox" 
                  :id="'ocultar-' + index"
                  v-model="medidaOculta[medida]"
                  @change="guardarEstadoOculto"
                >
                <label :for="'ocultar-' + index">Ocultar en PDF</label>
              </div>
              <div class="analizar-ganancia-control">
                <input 
                  type="checkbox" 
                  :id="'analizar-' + index"
                  v-model="analizarGanancia[medida]"
                  @change="guardarEstadoAnalisis"
                >
                <label :for="'analizar-' + index">Analizar ganancia</label>
              </div>
              <div class="maquila-ganancia-control">
                <input 
                  type="checkbox" 
                  :id="'maquila-' + index"
                  v-model="analizarMaquilaGanancia[medida]"
                  @change="guardarCambiosMaquila"
                >
                <label :for="'maquila-' + index">Maquila ganancia</label>
              </div>
              <div v-if="analizarMaquilaGanancia[medida]" class="maquila-precio-input">
                <input 
                  type="number" 
                  step="0.01"
                  v-model="precioMaquila[medida]"
                  @input="guardarCambiosMaquila"
                  placeholder="Precio por kg"
                  class="precio-maquila-input"
                >
              </div>
            </div>
          </div>

          
          <div class="input-group">
            <template v-if="esMedidaMix(medida)">
              <div class="mix-inputs">
                <div class="mix-input">
                  <label @click="editarEtiqueta(medida, 'medida1')" class="editable-label">
                    {{ obtenerEtiqueta(medida, 'medida1') }}:
                  </label>
                  <input 
                    type="number" 
                    v-model="kilosCrudos[medida].medida1" 
                    @input="calcularRendimiento(medida)"
                    placeholder="Kilos medida 1"
                  >
                </div>
                <div class="mix-input">
                  <label @click="editarEtiqueta(medida, 'medida2')" class="editable-label">
                    {{ obtenerEtiqueta(medida, 'medida2') }}:
                  </label>
                  <input 
                    type="number" 
                    v-model="kilosCrudos[medida].medida2" 
                    @input="calcularRendimiento(medida)"
                    placeholder="Kilos medida 2"
                  >
                </div>
              </div>
            </template>
            <template v-else>
              <label>Kilos en crudo:</label>
              <input 
                type="number" 
                v-model="kilosCrudos[medida]" 
                @input="calcularRendimiento(medida)"
                placeholder="Ingrese kilos"
              >
            </template>
          </div>
          
          <div class="resultados">
            <p>Total embarcado: {{ formatearNumero(obtenerTotalEmbarcado(medida)) }} kg</p>
            <p class="rendimiento">
              Rendimiento: 
              <span :class="{ 'rendimiento-alto': getRendimiento(medida) > 1 }">
                {{ getRendimiento(medida).toFixed(2) }}
              </span>
            </p>
            
            <!-- Sección de ganancia -->
            <div v-if="gananciasCalculadas[medida] && analizarGanancia[medida]" class="ganancia-info">
              <div class="ganancia-header">
                <h4>💰 Análisis de Ganancia</h4>
              </div>
              <div class="ganancia-detalles">
                <div class="ganancia-item">
                  <span class="label">Precio de Venta:</span>
                  <div class="precio-venta-container">
                    <span class="valor precio-venta">${{ formatearPrecio(gananciasCalculadas[medida].precioVenta) }}</span>
                    
                    <!-- Precio promedio de múltiples clientes -->
                    <span v-if="gananciasCalculadas[medida].esPromedio" 
                          class="precio-promedio-badge"
                          :title="`Precio promedio ponderado. Clientes con precios específicos: ${gananciasCalculadas[medida].clientesConEspecifico.join(', ')}`">
                      📊 Promedio
                    </span>
                    
                    <!-- Precio específico de un cliente -->
                    <span v-else-if="gananciasCalculadas[medida].esEspecifico" 
                          class="precio-especifico-badge"
                          :title="`Precio específico más reciente para ${gananciasCalculadas[medida].clienteEspecifico}`">
                      📌 {{ gananciasCalculadas[medida].clienteEspecifico }}
                    </span>
                    
                    <!-- Precio general -->
                    <span v-else class="precio-general-badge" title="Precio general">
                      🌐 General
                    </span>
                  </div>
                </div>
                <div class="ganancia-item">
                  <span class="label">Costo Final:</span>
                  <span class="valor costo-final">${{ formatearPrecio(gananciasCalculadas[medida].costoFinal) }}</span>
                </div>
                <div class="ganancia-item">
                  <span class="label">Ganancia/kg:</span>
                  <span class="valor ganancia-unitaria" 
                        :class="{ 
                          'ganancia-positiva': gananciasCalculadas[medida].gananciaUnitaria > 0,
                          'ganancia-negativa': gananciasCalculadas[medida].gananciaUnitaria < 0
                        }">
                    ${{ formatearPrecio(gananciasCalculadas[medida].gananciaUnitaria) }}
                  </span>
                </div>
                <div class="ganancia-item ganancia-total-item">
                  <span class="label">Ganancia Total:</span>
                  <span class="valor ganancia-total"
                        :class="{ 
                          'ganancia-positiva': gananciasCalculadas[medida].gananciaTotal > 0,
                          'ganancia-negativa': gananciasCalculadas[medida].gananciaTotal < 0
                        }">
                    ${{ formatearPrecio(gananciasCalculadas[medida].gananciaTotal) }}
                  </span>
                </div>
                <div class="ganancia-fecha">
                  <span class="fecha-precio">Precio del: {{ formatearFecha(gananciasCalculadas[medida].fechaPrecio) }}</span>
                </div>
              </div>
            </div>
            
            <!-- Mensaje cuando no hay precio de venta -->
            <div v-else-if="analizarGanancia[medida]" class="sin-precio-venta">
              <p class="aviso-sin-precio">⚠️ No se encontró precio de venta para esta medida</p>
            </div>
            
            <!-- Sección de maquila ganancia -->
            <div v-if="analizarMaquilaGanancia[medida]" class="maquila-ganancia-info">
              <div class="maquila-ganancia-header">
                <h4>🏭 Maquila Ganancia</h4>
              </div>
              <div class="maquila-ganancia-detalles">
                <div class="ganancia-item">
                  <span class="label">Kilos Embarcados:</span>
                  <span class="valor">{{ formatearNumero(obtenerTotalEmbarcado(medida)) }} kg</span>
                </div>
                <div class="ganancia-item">
                  <span class="label">Precio Maquila:</span>
                  <span class="valor precio-maquila">${{ formatearPrecio(precioMaquila[medida] || 0) }}</span>
                </div>
                <div class="ganancia-item ganancia-total-item">
                  <span class="label">Ganancia Total Maquila:</span>
                  <span class="valor ganancia-total ganancia-positiva">
                    ${{ formatearPrecio(calcularGananciaMaquila(medida, obtenerTotalEmbarcado)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de Ganancias de Crudos -->
    <div v-if="embarqueData && obtenerTallasCrudosUnicas(embarqueData).length > 0" class="crudos-ganancias-section">
      <h2>💰 Ganancias de Crudos por Talla</h2>
      
      <div class="crudos-ganancias-grid">
        <div v-for="talla in obtenerTallasCrudosUnicas(embarqueData)" :key="'crudo-' + talla" class="crudo-ganancia-card">
          <div class="crudo-ganancia-header">
            <h4>{{ talla }}</h4>
            <div class="crudo-ganancia-controls">
              <label class="checkbox-container">
                <input 
                  type="checkbox" 
                  v-model="analizarGananciaCrudos[talla]"
                  @change="guardarEstadoAnalisisCrudos"
                >
                <span class="checkmark"></span>
                Analizar ganancia
              </label>
            </div>
          </div>
          
          <!-- Información de ganancia -->
          <div v-if="gananciasCalculadasCrudos[talla] && analizarGananciaCrudos[talla]" class="crudo-ganancia-info">
            <div class="crudo-ganancia-detalles">
              <div class="ganancia-item">
                <span class="label">Total Kilos:</span>
                <span class="valor">{{ formatearNumero(gananciasCalculadasCrudos[talla].totalKilos) }} kg</span>
              </div>
              <div class="ganancia-item">
                <span class="label">Precio Promedio:</span>
                <div class="precio-container">
                  <span class="valor precio-venta">${{ formatearPrecio(gananciasCalculadasCrudos[talla].precioVenta) }}</span>
                  <span v-if="gananciasCalculadasCrudos[talla].hayPreciosIndividuales" 
                        class="precio-individual-badge"
                        title="Incluye precios individuales">
                    📝 Individual
                  </span>
                  <span v-else class="precio-sistema-badge" title="Precio del sistema">
                    🌐 Sistema
                  </span>
                </div>
              </div>
              <div class="ganancia-item">
                <span class="label">Costo Base:</span>
                <span class="valor costo-base">${{ formatearPrecio(gananciasCalculadasCrudos[talla].costoBase) }}</span>
              </div>
              <div class="ganancia-item">
                <span class="label">Ganancia/kg:</span>
                <span class="valor ganancia-unitaria" 
                      :class="{ 
                        'ganancia-positiva': gananciasCalculadasCrudos[talla].gananciaUnitaria > 0,
                        'ganancia-negativa': gananciasCalculadasCrudos[talla].gananciaUnitaria < 0
                      }">
                  ${{ formatearPrecio(gananciasCalculadasCrudos[talla].gananciaUnitaria) }}
                </span>
              </div>
              <div class="ganancia-item ganancia-total-item">
                <span class="label">Ganancia Total:</span>
                <span class="valor ganancia-total"
                      :class="{ 
                        'ganancia-positiva': gananciasCalculadasCrudos[talla].gananciaTotal > 0,
                        'ganancia-negativa': gananciasCalculadasCrudos[talla].gananciaTotal < 0
                      }">
                  ${{ formatearPrecio(gananciasCalculadasCrudos[talla].gananciaTotal) }}
                </span>
              </div>
              
              <!-- Detalles por cliente (solo si hay precios diferentes) -->
              <div v-if="deberMostrarDetallePorCliente(talla)" class="detalles-clientes">
                <h5>Detalle por Cliente:</h5>
                <div v-for="detalle in gananciasCalculadasCrudos[talla].detallesPorCliente" :key="detalle.cliente" class="detalle-cliente">
                  <span class="cliente-nombre">{{ detalle.cliente }}:</span>
                  <span class="cliente-kilos">{{ formatearNumero(detalle.kilos) }}kg</span>
                  <span class="cliente-precio">${{ formatearPrecio(detalle.precioVenta) }}</span>
                  <span class="cliente-ganancia" :class="{ 
                    'ganancia-positiva': detalle.gananciaTotal > 0,
                    'ganancia-negativa': detalle.gananciaTotal < 0
                  }">
                    ${{ formatearPrecio(detalle.gananciaTotal) }}
                  </span>
                  <span class="fuente-precio" :title="'Fuente del precio: ' + detalle.fuentePrecio">
                    {{ detalle.fuentePrecio === 'individual' ? '📝' : detalle.fuentePrecio === 'sistema-especifico' ? '📌' : '🌐' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Mensaje cuando no hay análisis activado -->
          <div v-else-if="!analizarGananciaCrudos[talla]" class="sin-analisis-crudo">
            <p class="aviso-sin-analisis">Activar análisis de ganancia para ver detalles</p>
          </div>
          
          <!-- Mensaje cuando no hay datos -->
          <div v-else class="sin-datos-crudo">
            <p class="aviso-sin-datos">⚠️ No se encontraron datos de venta para esta talla</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="mostrarModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Agregar Nota</h3>
        <textarea 
          v-model="nota" 
          placeholder="Escriba su nota aquí..."
          rows="4"
        ></textarea>
        <div class="modal-buttons">
          <button @click="guardarNota" class="btn-guardar">Guardar</button>
          <button @click="cerrarModal" class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Configuración de Pesos -->
    <div v-if="mostrarModalConfiguracion" class="modal-overlay">
      <div class="modal-content">
        <h3>Configurar Pesos de Taras</h3>
        <div class="configuracion-grid">
          <div class="config-item">
            <label>Peso para cálculo de costos:</label>
            <input 
              type="number" 
              v-model="pesoTaraCosto" 
              min="1" 
              max="50"
              placeholder="Peso en kg"
            >
            <small class="config-help">Peso por defecto usado para calcular costos de crudos</small>
          </div>
          <div class="config-item">
            <label>Peso para cálculo de ventas:</label>
            <input 
              type="number" 
              v-model="pesoTaraVenta" 
              min="1" 
              max="50"
              placeholder="Peso en kg"
            >
            <small class="config-help">Peso por defecto usado para calcular ventas de crudos</small>
          </div>
        </div>
        <div class="modal-buttons">
          <button @click="guardarConfiguracion" class="btn-guardar">Guardar</button>
          <button @click="cerrarModalConfiguracion" class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { generarPDFRendimientos } from '@/utils/RendimientosPdf';
import { useRendimientosMain } from '@/components/Rendimientos/composables/useRendimientosMain';

export default {
  name: 'Rendimientos',
  
  data() {
    return {
      composable: null
    };
  },

  async created() {
    // Inicializar composable
    const embarqueId = this.$route.params.id;
    this.composable = useRendimientosMain(embarqueId);
    
    // Exponer todas las propiedades del composable
    this.exponerPropiedades();
    
    // Inicializar datos
    await this.inicializar();
  },

  async activated() {
    console.log('Recargando datos de rendimientos...');
    if (this.composable) {
      await this.inicializar();
      this.$nextTick(() => {
        this.calcularGanancias();
      });
    }
  },

  methods: {
    // Exponer propiedades del composable al componente
    exponerPropiedades() {
      const propiedadesAExponer = [
        'embarqueData', 'medidasUnicas', 'kilosCrudos', 'preciosVenta',
        'gananciasCalculadas', 'gananciasCalculadasCrudos', 'analizarGanancia',
        'analizarGananciaCrudos', 'mostrarModal', 'mostrarModalConfiguracion',
        'nota', 'medidaOculta', 'pesoTaraCosto', 'pesoTaraVenta',
        'analizarMaquilaGanancia', 'precioMaquila'
      ];
      
      propiedadesAExponer.forEach(prop => {
        if (this.composable[prop]) {
          this[prop] = this.composable[prop];
        }
      });
    },

    // Métodos del composable
    async inicializar() {
      return this.composable?.inicializar();
    },

    calcularGanancias() {
      return this.composable?.calcularGanancias();
    },

    calcularGananciasCrudos() {
      return this.composable?.calcularGananciasCrudos();
    },

    esMedidaMix(medida) {
      return this.composable?.esMedidaMix(medida);
    },

    obtenerTotalEmbarcado(medida) {
      return this.composable?.obtenerTotalEmbarcado(medida) || 0;
    },

    calcularRendimiento(medida) {
      return this.composable?.calcularRendimiento(medida);
    },

    getRendimiento(medida) {
      return this.composable?.getRendimiento(medida) || 0;
    },

    obtenerEtiqueta(medida, campo) {
      return this.composable?.obtenerEtiqueta(medida, campo);
    },

    editarEtiqueta(medida, campo) {
      return this.composable?.editarEtiqueta(medida, campo);
    },

    obtenerNombreMedidaPersonalizado(medida) {
      return this.composable?.obtenerNombreMedidaPersonalizado(medida) || medida;
    },

    editarNombreMedida(medida) {
      return this.composable?.editarNombreMedida(medida);
    },

    obtenerTallasCrudosUnicas(embarqueData) {
      return this.composable?.obtenerTallasCrudosUnicas(embarqueData) || [];
    },

    deberMostrarDetallePorCliente(talla) {
      return this.composable?.deberMostrarDetallePorCliente(talla);
    },

    calcularGananciaMaquila(medida, obtenerTotalEmbarcado) {
      return this.composable?.calcularGananciaMaquila(medida, obtenerTotalEmbarcado) || 0;
    },

    formatearPrecio(precio) {
      return this.composable?.formatearPrecio(precio) || '0';
    },

    formatearNumero(numero) {
      return this.composable?.formatearNumero(numero) || '0';
    },

    formatearFecha(fecha) {
      return this.composable?.formatearFecha(fecha) || '';
    },

    // Métodos de modales
    abrirModalNota(notaExistente) {
      return this.composable?.abrirModalNota(notaExistente);
    },

    cerrarModal() {
      return this.composable?.cerrarModal();
    },

    guardarNota() {
      return this.composable?.guardarNota();
    },

    abrirModalConfiguracion() {
      return this.composable?.abrirModalConfiguracion();
    },

    cerrarModalConfiguracion() {
      return this.composable?.cerrarModalConfiguracion();
    },

    guardarConfiguracion() {
      return this.composable?.guardarConfiguracion();
    },

    // Métodos de guardado
    guardarEstadoOculto() {
      return this.composable?.guardarEstadoOculto();
    },

    guardarEstadoAnalisis() {
      return this.composable?.guardarEstadoAnalisis();
    },

    guardarEstadoAnalisisCrudos() {
      return this.composable?.guardarEstadoAnalisisCrudos();
    },

    guardarCambiosMaquila() {
      return this.composable?.guardarCambiosMaquila();
    },

    // Métodos de navegación
    volverAEmbarque() {
      this.$router.push({
        name: 'EditarEmbarque',
        params: { id: this.$route.params.id }
      });
    },

    irAGestionCostos() {
      this.$router.push({
        name: 'GestionCostos',
        params: { id: this.$route.params.id }
      });
    },

    // Método para generar PDF
    generarPDF() {
      if (!this.composable || !this.embarqueData) return;

      // Obtener datos para el PDF usando los métodos del composable
      const datosRendimientos = this.medidasUnicas
        .filter(medida => !this.medidaOculta[medida])
        .map(medida => {
          let kilosCrudos;
          if (this.esMedidaMix(medida)) {
            kilosCrudos = {
              medida1: Number(this.kilosCrudos[medida]?.medida1 || 0),
              medida2: Number(this.kilosCrudos[medida]?.medida2 || 0)
            };
          } else {
            kilosCrudos = Number(this.kilosCrudos[medida] || 0);
          }

          const rendimiento = this.getRendimiento(medida);
          const costoFinal = this.calcularCostoFinal ? this.calcularCostoFinal(medida) : 0;

          return {
            medida: medida,
            kilosCrudos: kilosCrudos,
            totalEmbarcado: this.obtenerTotalEmbarcado(medida),
            rendimiento: rendimiento,
            costoFinal: costoFinal
          };
        });

      const embarqueDataConNota = {
        ...this.embarqueData,
        notaRendimientos: this.embarqueData?.notaRendimientos || '',
        mostrarColumnaCosto: true
      };

      // Filtrar ganancias visibles
      const gananciasVisibles = Object.entries(this.gananciasCalculadas || {})
        .filter(([medida]) => !this.medidaOculta[medida] && this.analizarGanancia[medida])
        .reduce((acc, [medida, ganancia]) => {
          acc[medida] = ganancia;
          return acc;
        }, {});

      // Calcular taras de crudo por medida
      const tarasCrudosPorMedida = this.calcularTarasCrudosPorMedida ? this.calcularTarasCrudosPorMedida() : {};

      // Filtrar ganancias de crudos visibles
      const gananciasVisiblesCrudos = Object.entries(this.gananciasCalculadasCrudos || {})
        .filter(([talla]) => this.analizarGananciaCrudos[talla])
        .reduce((acc, [talla, ganancia]) => {
          acc[talla] = ganancia;
          return acc;
        }, {});

      // Calcular costos para crudos
      const costosCrudos = this.calcularCostosCrudos ? this.calcularCostosCrudos(tarasCrudosPorMedida) : {};

      // Configuración de pesos
      const configuracionPesos = {
        pesoTaraCosto: this.pesoTaraCosto,
        pesoTaraVenta: this.pesoTaraVenta
      };

      // Ganancias de maquila
      const gananciasVisiblesMaquila = {};
      Object.keys(this.analizarMaquilaGanancia || {}).forEach(medida => {
        if (this.analizarMaquilaGanancia[medida] && !this.medidaOculta[medida]) {
          gananciasVisiblesMaquila[medida] = {
            totalEmbarcado: this.obtenerTotalEmbarcado(medida),
            precioMaquila: Number(this.precioMaquila[medida]) || 0,
            gananciaTotal: this.calcularGananciaMaquila(medida, this.obtenerTotalEmbarcado)
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
    },

    // Método auxiliar para calcular taras de crudo por medida
    calcularTarasCrudosPorMedida() {
      if (!this.embarqueData || !this.embarqueData.clientes) return {};
      
      const tarasPorMedida = {};
      
      this.embarqueData.clientes.forEach(cliente => {
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
                  
                    let tarasItem = 0;
                    let kilosItem = 0;
                    
                    if (item.taras) {
                      const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
                      if (formatoGuion) {
                        const cantidad = parseInt(formatoGuion[1]) || 0;
                        let peso = parseInt(formatoGuion[2]) || 0;
                        
                        if (peso === 19) {
                          peso = this.pesoTaraCosto;
                        }
                        
                        tarasItem += cantidad;
                        kilosItem += cantidad * peso;
                      } else {
                        const [cantidad, peso] = item.taras.split('-').map(Number);
                        tarasItem += cantidad || 0;
                        kilosItem += (cantidad || 0) * (peso || 0);
                      }
                    }
                    
                    if (item.sobrante) {
                      const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
                      if (formatoGuion) {
                        const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
                        let pesoSobrante = parseInt(formatoGuion[2]) || 0;
                        
                        if (pesoSobrante === 19) {
                          pesoSobrante = this.pesoTaraCosto;
                        }
                        
                        tarasItem += cantidadSobrante;
                        kilosItem += cantidadSobrante * pesoSobrante;
                      } else {
                        const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
                        tarasItem += cantidadSobrante || 0;
                        kilosItem += (cantidadSobrante || 0) * (pesoSobrante || 0);
                      }
                    }
                    
                    tarasPorMedida[medida].totalTaras += tarasItem;
                    tarasPorMedida[medida].totalKilos += kilosItem;
                    
                    if (tarasItem > 0) {
                      tarasPorMedida[medida].detalles.push({
                        cliente: cliente.nombre,
                        taras: item.taras,
                        sobrante: item.sobrante,
                        tarasCalculadas: tarasItem,
                        kilosCalculados: kilosItem
                      });
                    }
                  }
                }
              });
            }
          });
        }
      });
      
      return tarasPorMedida;
    },

    // Método auxiliar para calcular costos de crudos
    calcularCostosCrudos(tarasCrudosPorMedida) {
      if (!tarasCrudosPorMedida || !this.embarqueData) return {};
      
      const costosCrudos = {};
      const costosEmbarque = this.embarqueData.costosPorMedida || {};
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
    },

    // Método auxiliar para calcular costo final
    calcularCostoFinal(medida) {
      const costosEmbarque = this.embarqueData?.costosPorMedida || {};
      const costo = Number(costosEmbarque[medida]) || 0;
      const rendimientoOriginal = this.getRendimiento(medida);
      const rendimiento = Math.round(rendimientoOriginal * 100) / 100;
      const costoExtra = Number(this.embarqueData?.costoExtra) || 18;
      
      const esMedidaOzunaMaquila = medida.includes('Maquila Ozuna');
      const esMedidaNumerica = /^\d+\/\d+$/.test(medida.trim()) || /^\d+$/.test(medida.trim());
      
      if (esMedidaOzunaMaquila || !esMedidaNumerica) {
        return Math.round(costo * rendimiento);
      } else {
        return Math.round((costo * rendimiento) + costoExtra);
      }
    }
  }
}
</script>

<style scoped>
.rendimientos-container {
  padding: 20px;
}

.rendimientos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.rendimiento-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #fff;
}

.medida-label {
  font-size: 1.2em;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
  display: block;
}

.input-group {
  margin: 15px 0;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  color: #666;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.resultados {
  margin-top: 15px;
}

.rendimiento {
  font-weight: bold;
}

.rendimiento-alto {
  color: #27ae60;
}

.header-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.btn-volver {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-volver i {
  margin-right: 10px;
}

.resultados p {
  margin: 8px 0;
  font-size: 1.1em;
}

.resultados .rendimiento {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.rendimiento span {
  font-size: 1.2em;
  font-weight: bold;
}

.mix-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.mix-input {
  flex: 1;
}

.mix-input label {
  font-size: 0.9em;
}

.editable-label {
  cursor: pointer;
  user-select: none;
}

.editable-label:hover {
  color: #3498db;
  text-decoration: underline;
}

.btn-pdf {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
}

.btn-pdf:hover {
  background-color: #c0392b;
}

.btn-pdf i {
  margin-right: 10px;
}

.medida-label.editable-label {
  cursor: pointer;
  transition: color 0.3s ease;
}

.medida-label.editable-label:hover {
  color: #3498db;
}

.btn-nota {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #f39c12;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-nota:hover {
  background-color: #d68910;
}

.btn-nota i {
  margin-right: 10px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
}

.modal-content textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 10px 0;
  font-size: 16px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.btn-guardar {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancelar {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.configuracion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.config-item input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.config-help {
  font-size: 0.85em;
  color: #666;
  font-style: italic;
  margin-top: 5px;
}

.medida-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.controles-medida {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ocultar-control {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9em;
  color: #666;
}

.ocultar-control input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.ocultar-control label {
  cursor: pointer;
  user-select: none;
}

.analizar-ganancia-control {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9em;
  color: #27ae60;
  font-weight: bold;
}

.analizar-ganancia-control input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.analizar-ganancia-control label {
  cursor: pointer;
  user-select: none;
}

.maquila-ganancia-control {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9em;
  color: #27ae60;
  font-weight: bold;
}

.maquila-ganancia-control input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.maquila-ganancia-control label {
  cursor: pointer;
  user-select: none;
}

.ganancia-info {
  margin-top: 15px;
  padding: 15px;
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 5px;
}

.ganancia-header h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #34495e;
  font-size: 1.1em;
}

.ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ganancia-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ganancia-item .label {
  font-weight: bold;
  color: #555;
}

.ganancia-item .valor {
  font-weight: bold;
  font-size: 1.1em;
}

.ganancia-positiva {
  color: #27ae60;
}

.ganancia-negativa {
  color: #e74c3c;
}

.ganancia-total-item {
  grid-column: 1 / -1; /* Ocupa dos columnas */
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.ganancia-fecha {
  margin-top: 10px;
  font-size: 0.9em;
  color: #777;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.indicador-precio-reciente {
  font-size: 0.8em;
  color: #28a745;
  font-weight: bold;
  background-color: #d4edda;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #c3e6cb;
  align-self: flex-start;
}

.sin-precio-venta {
  margin-top: 10px;
  padding: 10px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 5px;
  color: #856404;
  font-weight: bold;
  text-align: center;
}

.aviso-sin-precio {
  margin: 0;
  padding: 0;
}

.btn-costos {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-costos:hover {
  background-color: #27ae60;
}

.btn-costos i {
  margin-right: 10px;
}

.btn-configuracion {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #9b59b6;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-configuracion:hover {
  background-color: #8e44ad;
}

.btn-configuracion i {
  margin-right: 10px;
}



.precio-venta-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.precio-especifico-badge, .precio-general-badge, .precio-promedio-badge {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
  white-space: nowrap;
}

.precio-especifico-badge {
  background-color: #e8f5e8;
  color: #2d5a2d;
  border: 1px solid #a5d6a7;
}

.precio-general-badge {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

.precio-promedio-badge {
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}

/* Estilos para la sección de ganancias de crudos */
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

.crudo-ganancia-card {
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.crudo-ganancia-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.crudo-ganancia-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
}

.crudo-ganancia-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2em;
  font-weight: bold;
}

.crudo-ganancia-controls {
  display: flex;
  align-items: center;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 0.9em;
  color: #27ae60;
  font-weight: bold;
}

.checkbox-container input[type="checkbox"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.checkmark {
  cursor: pointer;
}

.crudo-ganancia-info {
  margin-top: 15px;
}

.crudo-ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 15px;
}

.detalles-clientes {
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
}

.detalles-clientes h5 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #495057;
  font-size: 1em;
}

.detalle-cliente {
  display: grid;
  grid-template-columns: 1fr auto auto auto auto;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-bottom: 8px;
}

.cliente-nombre {
  font-weight: bold;
  color: #2c3e50;
}

.cliente-kilos {
  font-size: 0.9em;
  color: #6c757d;
}

.cliente-precio {
  font-weight: bold;
  color: #007bff;
}

.cliente-ganancia {
  font-weight: bold;
  font-size: 1.1em;
}

.fuente-precio {
  font-size: 1.2em;
  cursor: help;
}

.precio-individual-badge, .precio-sistema-badge {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
  white-space: nowrap;
}

.precio-individual-badge {
  background-color: #e8f5e8;
  color: #2d5a2d;
  border: 1px solid #a5d6a7;
}

.precio-sistema-badge {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

.sin-analisis-crudo {
  margin-top: 15px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  text-align: center;
}

.aviso-sin-analisis {
  margin: 0;
  color: #6c757d;
  font-style: italic;
}

.sin-datos-crudo {
  margin-top: 15px;
  padding: 20px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 5px;
  text-align: center;
}

.aviso-sin-datos {
  margin: 0;
  color: #856404;
  font-weight: bold;
}

.maquila-precio-input {
  margin-top: 10px;
  padding: 10px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.precio-maquila-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.maquila-ganancia-info {
  margin-top: 15px;
  padding: 15px;
  background-color: #f4f8ff;
  border: 1px solid #b3d9ff;
  border-radius: 5px;
}

.maquila-ganancia-header h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c5282;
  font-size: 1.1em;
}

.maquila-ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.precio-maquila {
  color: #2c5282;
  font-weight: bold;
}

@media (max-width: 768px) {
  .controles-medida {
    flex-direction: column;
    gap: 10px;
  }
  
  .medida-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .ocultar-control,
  .analizar-ganancia-control,
  .maquila-ganancia-control {
    font-size: 0.8em;
  }
  
  .ganancia-detalles {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .maquila-ganancia-detalles {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .precio-venta-container {
    align-items: flex-start;
  }
  
  .crudos-ganancias-grid {
    grid-template-columns: 1fr;
  }
  
  .crudo-ganancia-detalles {
    grid-template-columns: 1fr;
  }
  
  .crudo-ganancia-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .detalle-cliente {
    grid-template-columns: 1fr;
    gap: 5px;
    text-align: left;
  }
  
  .cliente-nombre {
    font-size: 1.1em;
  }

  .configuracion-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .header-container {
    flex-wrap: wrap;
    gap: 10px;
  }

  .btn-configuracion {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>

