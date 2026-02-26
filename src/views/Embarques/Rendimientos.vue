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
      <button @click="irAPreparacion" class="btn-preparacion">
        <i class="fas fa-tasks"></i> Ir a Preparación
      </button>
      <button @click="abrirModalConfiguracion" class="btn-configuracion">
        <i class="fas fa-cog"></i> Configurar Pesos
      </button>
      <button @click="generarPDF" class="btn-pdf">
        <i class="fas fa-file-pdf"></i> Generar PDF
      </button>
    </div>
    
    <div class="resumen-header-row">
      <button
        type="button"
        class="resumen-tab-button"
        :class="{ activo: activeVistaTab === 'sacada-hoy' }"
        @click="activeVistaTab = activeVistaTab === 'sacada-hoy' ? 'rendimientos' : 'sacada-hoy'"
      >
        Resumen de sacadas
      </button>
    </div>

    <template v-if="activeVistaTab === 'rendimientos'">
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
                  @change="guardarEstadoAnalisis"
                >
                <label :for="'maquila-' + index">Maquila ganancia</label>
              </div>

              <div v-if="analizarMaquilaGanancia[medida]" class="maquila-precio-input">
                <input 
                  type="number" 
                  step="0.01"
                  v-model="precioMaquila[medida]"
                  @input="guardarEstadoAnalisis"
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
                  <div class="costo-final-container">
                    <span class="valor costo-final">${{ formatearPrecio(gananciasCalculadas[medida].costoFinal) }}</span>
                    <span v-if="debeAplicarCostoExtra(medida)" class="costo-extra-indicator">
                      (+ ${{ embarqueData?.costoExtra || 18 }} extra)
                    </span>
                  </div>
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
                    ${{ formatearPrecio(calcularGananciaMaquila(medida)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- Sección de Ganancias de Crudos -->
      <div v-if="embarqueData && obtenerTallasCrudosUnicas().length > 0" class="crudos-ganancias-section">
        <h2>💰 Ganancias de Crudos por Talla</h2>
        
        <div class="crudos-ganancias-grid">
          <div v-for="talla in obtenerTallasCrudosUnicas()" :key="'crudo-' + talla" class="crudo-ganancia-card">
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
    </template>

    <div v-else class="resumen-dia-panel">
      <p v-if="resumenSacadaHoy.loading" class="resumen-dia-estado">
        Cargando resumen del dia...
      </p>
      <p v-else-if="resumenSacadaHoy.error" class="resumen-dia-estado error">
        {{ resumenSacadaHoy.error }}
      </p>
      <template v-else-if="resumenSacadaHoy.disponible">
        <p class="resumen-dia-total">Total Entradas: {{ formatearKg(resumenSacadaHoy.totalEntradas) }} kg</p>
        <p class="resumen-dia-total">Total Salidas: {{ formatearKg(resumenSacadaHoy.totalSalidas) }} kg</p>

        <h4>Salidas clientes:</h4>
        <table class="resumen-dia-table">
          <thead>
            <tr>
              <th>Medida</th>
              <th>Total (kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!resumenSacadaHoy.salidasClientes.length">
              <td colspan="2">Sin salidas de clientes registradas hoy.</td>
            </tr>
            <tr v-for="item in resumenSacadaHoy.salidasClientes" :key="item.key">
              <td>{{ item.medida }} ({{ item.proveedor }})</td>
              <td>{{ formatearKg(item.total) }}</td>
            </tr>
          </tbody>
        </table>

        <h4>Salidas maquilas:</h4>
        <table class="resumen-dia-table">
          <thead>
            <tr>
              <th>Maquila</th>
              <th>Medida</th>
              <th>Total (kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!resumenSacadaHoy.salidasMaquilas.length">
              <td colspan="3">Sin salidas de maquila registradas hoy.</td>
            </tr>
            <tr v-for="fila in resumenSacadaHoy.salidasMaquilas" :key="fila.key">
              <td>{{ fila.maquila }}</td>
              <td>{{ fila.medida }}</td>
              <td>{{ formatearKg(fila.total) }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <p v-else class="resumen-dia-estado">
        No hay sacadas registradas para el dia de hoy.
      </p>
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
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { debounce } from 'lodash';
import { generarPDFRendimientos } from '@/utils/RendimientosPdf';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';

export default {
  name: 'Rendimientos',
  
  data() {
    return {
      kilosCrudos: {},
      medidasUnicas: [],
      embarqueData: null,
      guardadoAutomaticoActivo: false,
      nombresMedidasPersonalizados: {},
      mostrarModal: false,
      nota: '',
      medidaOculta: {},
      preciosVenta: {},
      gananciasCalculadas: {},
      gananciasCalculadasCrudos: {}, // Nueva propiedad para ganancias de crudos
      analizarGanancia: {},
      analizarGananciaCrudos: {}, // Nueva propiedad para controlar análisis de crudos
      aplicarCostoExtra: {}, // Para controlar a qué medidas aplicar costo extra
      diasRecientes: 3, // Días para considerar un embarque como "reciente"
      // Configuración de pesos por defecto
      pesoTaraCosto: 19, // Peso por defecto para cálculo de costos
      pesoTaraVenta: 20, // Peso por defecto para cálculo de ventas
      mostrarModalConfiguracion: false,
      analizarMaquilaGanancia: {},
      precioMaquila: {},
      costosCalculados: {}, // Cache de costos calculados para cada medida
      costosGlobalesCache: null, // Cache de costos globales
      activeVistaTab: 'rendimientos',
      resumenSacadaHoy: {
        loading: false,
        disponible: false,
        totalEntradas: 0,
        totalSalidas: 0,
        salidasClientes: [],
        salidasMaquilas: [],
        error: ''
      }
    }
  },

  async created() {
    this.guardarCambiosEnTiempoReal = debounce(this.guardarCambiosEnTiempoReal, 300);

    await EmbarquesOfflineService.init();
    window.addEventListener('online', this.syncOfflineRendimientos);

    const embarqueId = this.$route.params.id;
    let registroOffline = null;
    try {
      registroOffline = await EmbarquesOfflineService.getById(embarqueId);
    } catch (error) {
      console.warn('[Rendimientos] No se pudo obtener el registro offline:', error);
    }

    if (registroOffline?.preciosVentaCache && Object.keys(this.preciosVenta).length === 0) {
      this.preciosVenta = this.deepClone(registroOffline.preciosVentaCache);
    }

    if (navigator.onLine) {
      await this.syncOfflineRendimientos();
    }

    if (!navigator.onLine && registroOffline) {
      await this.cargarEmbarquesRelacionadosOffline(embarqueId, registroOffline);
      await this.precargarCostos();
      this.$nextTick(() => {
        this.calcularGanancias();
        this.calcularGananciasCrudos();
      });
      return;
    }

    await this.cargarEmbarque();
    await this.cargarPreciosVenta();
    await this.precargarCostos();
    await this.cargarResumenSacadasHoy();
  },

  // Recargar datos cuando se vuelve a este componente
  async activated() {
    console.log('Recargando datos de rendimientos...');
    if (navigator.onLine) {
      await this.syncOfflineRendimientos();
    }
    const embarqueId = this.$route.params.id;
    const registroOffline = await EmbarquesOfflineService.getById(embarqueId).catch(() => null);

    if (!navigator.onLine && registroOffline) {
      await this.cargarEmbarquesRelacionadosOffline(embarqueId, registroOffline);
      await this.precargarCostos();
      this.$nextTick(() => {
        this.calcularGanancias();
        this.calcularGananciasCrudos();
      });
      return;
    }

    await this.cargarEmbarque();
    await this.cargarPreciosVenta();
    await this.precargarCostos();
    await this.cargarResumenSacadasHoy();
    this.$nextTick(() => {
      this.calcularGanancias();
      this.calcularGananciasCrudos();
    });
  },

      methods: {
    formatearKg(value) {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
    },
    async cargarResumenSacadasHoy() {
      this.resumenSacadaHoy.loading = true;
      this.resumenSacadaHoy.error = '';
      try {
        const ahora = new Date();
        const inicio = new Date(ahora);
        inicio.setHours(0, 0, 0, 0);
        const fin = new Date(ahora);
        fin.setHours(23, 59, 59, 999);

        const db = getFirestore();
        const q = query(
          collection(db, 'sacadas'),
          where('fecha', '>=', inicio),
          where('fecha', '<=', fin)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          this.resumenSacadaHoy = {
            ...this.resumenSacadaHoy,
            loading: false,
            disponible: false,
            totalEntradas: 0,
            totalSalidas: 0,
            salidasClientes: [],
            salidasMaquilas: []
          };
          return;
        }

        let totalEntradas = 0;
        let totalSalidas = 0;
        const clientesMap = new Map();
        const maquilasMap = new Map();

        snap.docs.forEach((docSnapshot) => {
          const data = docSnapshot.data() || {};
          const entradas = Array.isArray(data.entradas) ? data.entradas : [];
          const salidas = Array.isArray(data.salidas) ? data.salidas : [];

          totalEntradas += Number(data.totalEntradas || entradas.reduce((acc, item) => acc + Number(item.kilos || 0), 0));
          totalSalidas += Number(data.totalSalidas || salidas.reduce((acc, item) => acc + Number(item.kilos || 0), 0));

          salidas
            .filter((item) => item && item.tipo === 'proveedor')
            .forEach((item) => {
              const medida = item.medida || 'Sin medida';
              const proveedor = item.proveedor || 'Sin proveedor';
              const key = `${medida}-${proveedor}`;

              if (!clientesMap.has(key)) {
                clientesMap.set(key, { key, medida, proveedor, total: 0 });
              }
              clientesMap.get(key).total += Number(item.kilos || 0);
            });

          salidas
            .filter((item) => item && item.tipo === 'maquila')
            .forEach((item) => {
              const maquila = item.proveedor || 'Sin maquila';
              const medida = item.medida || 'Sin medida';
              const key = `${maquila}-${medida}`;

              if (!maquilasMap.has(key)) {
                maquilasMap.set(key, { key, maquila, medida, total: 0 });
              }
              maquilasMap.get(key).total += Number(item.kilos || 0);
            });
        });

        this.resumenSacadaHoy = {
          ...this.resumenSacadaHoy,
          loading: false,
          disponible: true,
          totalEntradas,
          totalSalidas,
          salidasClientes: Array.from(clientesMap.values()).sort((a, b) => a.medida.localeCompare(b.medida)),
          salidasMaquilas: Array.from(maquilasMap.values()).sort((a, b) => a.maquila.localeCompare(b.maquila))
        };
      } catch (error) {
        this.resumenSacadaHoy = {
          ...this.resumenSacadaHoy,
          loading: false,
          disponible: false,
          error: 'No se pudo cargar el resumen de sacadas del dia de hoy.'
        };
      }
    },
    deepClone(value) {
      if (value === undefined || value === null) return value;
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        console.warn('[Rendimientos] No se pudo clonar profundamente un valor, devolviendo referencia original.', error);
        return value;
      }
    },
    crearPayloadRendimientos() {
      return {
        kilosCrudos: this.deepClone(this.kilosCrudos),
        medidaOculta: { ...this.medidaOculta },
        analizarGanancia: { ...this.analizarGanancia },
        analizarGananciaCrudos: { ...this.analizarGananciaCrudos },
        analizarMaquilaGanancia: { ...this.analizarMaquilaGanancia },
        precioMaquila: { ...this.precioMaquila },
        pesoTaraCosto: Number(this.pesoTaraCosto) || 0,
        pesoTaraVenta: Number(this.pesoTaraVenta) || 0,
        nombresMedidasPersonalizados: { ...this.nombresMedidasPersonalizados },
        notaRendimientos: this.embarqueData?.notaRendimientos || ''
      };
    },
    async actualizarOfflineRendimientos(pending, payload = {}, options = {}) {
      const includeInDocData = options.includeInDocData !== false;
      const embarqueId = this.$route.params.id;
      await EmbarquesOfflineService.mergeSave(embarqueId, existing => {
        const base = existing ? { ...existing } : {};
        const clonedPayload = this.deepClone(payload) || {};
        let docData = existing && existing.docData ? { ...existing.docData } : undefined;

        if (includeInDocData) {
          docData = docData || {};
          Object.assign(docData, clonedPayload);
        }

        const record = {
          ...base,
          id: embarqueId,
          ...clonedPayload
        };

        if (docData !== undefined) {
          record.docData = docData;
        }

        return {
          record,
          options: {
            pendingSync: pending,
            syncState: pending ? 'pending' : 'synced'
          }
        };
      });
    },
    async persistirCamposRendimientos(payload, opts = {}) {
      if (!payload || Object.keys(payload).length === 0) {
        return;
      }
      const clonedPayload = this.deepClone(payload);
      await this.actualizarOfflineRendimientos(!navigator.onLine, clonedPayload, opts);
      if (!navigator.onLine) {
        return;
      }
      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', this.$route.params.id);
        await updateDoc(embarqueRef, clonedPayload);
        await this.actualizarOfflineRendimientos(false, clonedPayload, opts);
      } catch (error) {
        console.error('[Rendimientos] Error al guardar cambios en Firestore:', error);
      }
    },
    aplicarDatosOffline(record) {
      const docData = record?.docData ? this.deepClone(record.docData) : {};
      const clientes = docData.clientes || record?.clientes || [];
      const embarqueData = {
        ...docData,
        clientes
      };
      this.aplicarEmbarqueCargado(embarqueData);
      this.preciosVenta = this.deepClone(record?.preciosVentaCache || this.preciosVenta || {});
    },
    aplicarEmbarqueCargado(embarqueData) {
      this.embarqueData = embarqueData;
      this.nombresMedidasPersonalizados = this.deepClone(this.embarqueData.nombresMedidasPersonalizados || {});
      this.obtenerMedidasUnicas();
      this.medidaOculta = this.embarqueData.medidaOculta || {};
      this.analizarGanancia = this.embarqueData.analizarGanancia || {};
      this.analizarGananciaCrudos = this.embarqueData.analizarGananciaCrudos || {};
      this.aplicarCostoExtra = this.embarqueData.aplicarCostoExtra || {};
      this.analizarMaquilaGanancia = this.embarqueData.analizarMaquilaGanancia || {};
      this.precioMaquila = this.embarqueData.precioMaquila || {};
      this.pesoTaraCosto = this.embarqueData.pesoTaraCosto || 19;
      this.pesoTaraVenta = this.embarqueData.pesoTaraVenta || 20;

      const kilosCrudosGuardados = this.embarqueData.kilosCrudos || {};
      this.kilosCrudos = { ...kilosCrudosGuardados };

      this.medidasUnicas.forEach(medida => {
        if (!this.kilosCrudos[medida]) {
          if (this.esMedidaMix(medida)) {
            this.$set(this.kilosCrudos, medida, {
              medida1: 0,
              medida2: 0,
              etiqueta1: 'Kilos en crudo (Medida 1)',
              etiqueta2: 'Kilos en crudo (Medida 2)'
            });
          } else {
            this.$set(this.kilosCrudos, medida, 0);
          }
        }
      });

      this.guardadoAutomaticoActivo = true;
    },
    obtenerFechaISODesdeValor(valor) {
      const fechaNormalizada = this.normalizarFecha(valor);
      return fechaNormalizada ? this.toLocalYMD(fechaNormalizada) : null;
    },
    combinarKilosCrudos(destino, origen) {
      if (!origen) return;
      Object.entries(origen).forEach(([medida, valor]) => {
        const existente = destino[medida];
        if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
          const base = existente && typeof existente === 'object' ? { ...existente } : {
            medida1: 0,
            medida2: 0,
            etiqueta1: valor.etiqueta1 || 'Kilos en crudo (Medida 1)',
            etiqueta2: valor.etiqueta2 || 'Kilos en crudo (Medida 2)'
          };
          base.medida1 = Number(base.medida1 || 0) + Number(valor.medida1 || 0);
          base.medida2 = Number(base.medida2 || 0) + Number(valor.medida2 || 0);
          base.etiqueta1 = base.etiqueta1 || valor.etiqueta1;
          base.etiqueta2 = base.etiqueta2 || valor.etiqueta2;
          destino[medida] = base;
        } else {
          const suma = Number(existente || 0) + Number(valor || 0);
          destino[medida] = suma;
        }
      });
    },
    fusionarKilosCrudosSiVacio(destino, origen) {
      if (!origen) return;
      Object.entries(origen).forEach(([medida, valor]) => {
        const existente = destino[medida];
        if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
          const base = existente && typeof existente === 'object' ? { ...existente } : null;
          if (base && (Number(base.medida1 || 0) > 0 || Number(base.medida2 || 0) > 0)) {
            return;
          }
          destino[medida] = {
            medida1: Number(valor.medida1 || 0),
            medida2: Number(valor.medida2 || 0),
            etiqueta1: valor.etiqueta1 || 'Kilos en crudo (Medida 1)',
            etiqueta2: valor.etiqueta2 || 'Kilos en crudo (Medida 2)'
          };
          return;
        }

        if (Number(existente || 0) > 0) {
          return;
        }
        destino[medida] = Number(valor || 0);
      });
    },
    combinarEmbarquesPorFecha(embarques, embarqueIdPrincipal) {
      if (!Array.isArray(embarques) || embarques.length === 0) {
        return null;
      }

      const principal = embarques.find(item => item.id === embarqueIdPrincipal) || embarques[0];
      const combinado = this.deepClone(principal.data || {});
      combinado.clientes = Array.isArray(combinado.clientes) ? combinado.clientes : [];
      combinado.kilosCrudos = this.deepClone(combinado.kilosCrudos || {});

      const mergeConfig = (campo, valor) => {
        if (valor === undefined || valor === null) {
          return;
        }
        if (typeof valor === 'object' && !Array.isArray(valor)) {
          combinado[campo] = combinado[campo] || {};
          Object.entries(valor).forEach(([clave, contenido]) => {
            if (combinado[campo][clave] === undefined) {
              combinado[campo][clave] = contenido;
            }
          });
          return;
        }
        if (combinado[campo] === undefined) {
          combinado[campo] = valor;
        }
      };

      embarques.forEach(item => {
        if (!item || !item.data || item.id === principal.id) {
          return;
        }
        const data = item.data;
        const clientes = Array.isArray(data.clientes) ? data.clientes : [];
        clientes.forEach(cliente => {
          const clienteId = cliente.id?.toString();
          const existente = combinado.clientes.find(c => c.id?.toString() === clienteId);
          if (existente) {
            const productos = Array.isArray(cliente.productos) ? cliente.productos : [];
            const crudos = Array.isArray(cliente.crudos) ? cliente.crudos : [];
            existente.productos = [...(existente.productos || []), ...productos];
            existente.crudos = [...(existente.crudos || []), ...crudos];
          } else {
            combinado.clientes.push(this.deepClone(cliente));
          }
        });

        mergeConfig('nombresMedidasPersonalizados', data.nombresMedidasPersonalizados);
        mergeConfig('medidaOculta', data.medidaOculta);
        mergeConfig('analizarGanancia', data.analizarGanancia);
        mergeConfig('analizarGananciaCrudos', data.analizarGananciaCrudos);
        mergeConfig('analizarMaquilaGanancia', data.analizarMaquilaGanancia);
        mergeConfig('precioMaquila', data.precioMaquila);
        mergeConfig('aplicarCostoExtra', data.aplicarCostoExtra);
      });

      return combinado;
    },
    async cargarEmbarquesRelacionadosOffline(embarqueId, registroOffline = null) {
      try {
        await EmbarquesOfflineService.init();
        const registros = await EmbarquesOfflineService.getAll();
        const baseRecord = registroOffline || registros.find(r => r.id === embarqueId);

        if (!baseRecord) {
          return;
        }

        const fechaBase = baseRecord.docData?.fecha || baseRecord.fecha;
        const fechaISO = this.obtenerFechaISODesdeValor(fechaBase);

        const relacionados = registros.filter(r => {
          const fechaRegistro = r.docData?.fecha || r.fecha;
          return this.obtenerFechaISODesdeValor(fechaRegistro) === fechaISO;
        });

        const embarques = relacionados.map(record => ({
          id: record.id,
          data: record.docData || record
        }));

        const combinado = this.combinarEmbarquesPorFecha(embarques, embarqueId);
        if (!combinado) {
          this.aplicarDatosOffline(baseRecord);
          return;
        }

        this.aplicarEmbarqueCargado(combinado);
        if (baseRecord?.preciosVentaCache && Object.keys(this.preciosVenta).length === 0) {
          this.preciosVenta = this.deepClone(baseRecord.preciosVentaCache);
        }
      } catch (error) {
        console.error('[Rendimientos] Error al cargar embarques offline relacionados:', error);
        if (registroOffline) {
          this.aplicarDatosOffline(registroOffline);
        }
      }
    },
    async syncOfflineRendimientos() {
      if (!navigator.onLine) {
        return;
      }
      try {
        const embarqueId = this.$route.params.id;
        const record = await EmbarquesOfflineService.getById(embarqueId);
        if (!record || !record.pendingSync) {
          return;
        }

        const payloadKeys = [
          'kilosCrudos',
          'medidaOculta',
          'analizarGanancia',
          'analizarGananciaCrudos',
          'analizarMaquilaGanancia',
          'precioMaquila',
          'pesoTaraCosto',
          'pesoTaraVenta',
          'nombresMedidasPersonalizados',
          'notaRendimientos'
        ];
        const payload = {};
        payloadKeys.forEach(key => {
          if (record[key] !== undefined) {
            payload[key] = record[key];
          } else if (record.docData && record.docData[key] !== undefined) {
            payload[key] = record.docData[key];
          }
        });

        if (Object.keys(payload).length === 0) {
          return;
        }

        await this.persistirCamposRendimientos(payload);
      } catch (error) {
        console.error('[Rendimientos] Error al sincronizar datos offline:', error);
      }
    },
    // Helper para obtener YYYY-MM-DD en horario local (evita desfase UTC)
    toLocalYMD(fecha) {
      if (!fecha) return '';
      let d;
      
      // Si es un Timestamp de Firebase, convertir correctamente
      if (typeof fecha === 'object' && fecha.seconds) {
        // Crear fecha desde el timestamp en milisegundos
        d = new Date(fecha.seconds * 1000);
      } else if (fecha instanceof Date) {
        d = fecha;
      } else if (typeof fecha === 'string' && fecha.includes('-')) {
        // Si ya es un string YYYY-MM-DD, parsearlo como fecha local
        const [y, m, day] = fecha.split('-');
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(fecha);
      }
      
      // Usar zona horaria local para mantener la fecha correcta
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },
    // Método auxiliar para normalizar fechas y manejar diferentes formatos
    normalizarFecha(fecha) {
      if (!fecha) return null;
      
      try {
        // Si es un Timestamp de Firebase
        if (typeof fecha === 'object' && fecha.seconds) {
          return new Date(fecha.seconds * 1000);
        }
        
        // Si es un string o número
        const fechaObj = new Date(fecha);
        
        // Verificar si la fecha es válida
        if (isNaN(fechaObj.getTime())) {
          console.error('Fecha inválida:', fecha);
          return null;
        }
        
        return fechaObj;
      } catch (error) {
        console.error('Error al normalizar fecha:', fecha, error);
        return null;
      }
    },

    obtenerNombreCliente(clienteId) {
      if (!this.embarqueData || !this.embarqueData.clientes) return '';
      const cliente = this.embarqueData.clientes.find(c => c.id.toString() === clienteId.toString());
      return cliente ? cliente.nombre : '';
    },

    // Calcular taras de crudo por medida
    calcularTarasCrudosPorMedida() {
      if (!this.embarqueData || !this.embarqueData.clientes) return {};
      
      const tarasPorMedida = {};
      
      this.embarqueData.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.talla) {
                  // Para Ozuna: solo considerar si es venta
                  // Para otros clientes: todos los crudos son venta
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
                  
                  // Procesar taras principales
                  if (item.taras) {
                    const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
                    if (formatoGuion) {
                      const cantidad = parseInt(formatoGuion[1]) || 0;
                      let peso = parseInt(formatoGuion[2]) || 0;
                      
                      // Si el peso es 19, usar el peso configurado para costos
                      if (peso === 19) {
                        peso = this.pesoTaraCosto;
                      }
                      
                      tarasItem += cantidad;
                      kilosItem += cantidad * peso;
                    } else {
                      // Formato original si no coincide con el patrón
                      const [cantidad, peso] = item.taras.split('-').map(Number);
                      tarasItem += cantidad || 0;
                      kilosItem += (cantidad || 0) * (peso || 0);
                    }
                  }
                  
                  // Procesar sobrantes
                  if (item.sobrante) {
                    const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
                    if (formatoGuion) {
                      const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
                      let pesoSobrante = parseInt(formatoGuion[2]) || 0;
                      
                      // Si el peso es 19, usar el peso configurado para costos
                      if (pesoSobrante === 19) {
                        pesoSobrante = this.pesoTaraCosto;
                      }
                      
                      tarasItem += cantidadSobrante;
                      kilosItem += cantidadSobrante * pesoSobrante;
                    } else {
                      // Formato original si no coincide con el patrón
                      const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
                      tarasItem += cantidadSobrante || 0;
                      kilosItem += (cantidadSobrante || 0) * (pesoSobrante || 0);
                    }
                  }
                  
                  tarasPorMedida[medida].totalTaras += tarasItem;
                  tarasPorMedida[medida].totalKilos += kilosItem;
                  
                    // Agregar detalles para debugging
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

    // Calcular costos para crudos (costo base + 3.5)
    calcularCostosCrudos(tarasCrudosPorMedida) {
      if (!tarasCrudosPorMedida || !this.embarqueData) return {};
      
      const costosCrudos = {};
      const costosEmbarque = this.embarqueData.costosPorMedida || {};
      
      // Obtener todas las medidas de crudo únicas
      const medidasCrudo = Object.keys(tarasCrudosPorMedida);
      
      medidasCrudo.forEach(medida => {
        // Obtener el costo base para esta medida
        const costoBase = Number(costosEmbarque[medida]) || 0;
        
        // Calcular el costo final para crudos (costo base + 3.5)
        const costoFinal = costoBase + 3.5;
        
        costosCrudos[medida] = {
          costoBase: costoBase,
          costoFinal: costoFinal
        };
      });
      
      return costosCrudos;
    },

    // Mapear nombres de clientes del embarque con IDs del sistema de precios
    obtenerClienteIdParaPrecios(nombreCliente) {
      const nombre = nombreCliente.toLowerCase();
      if (nombre.includes('joselito')) return 'joselito';
      if (nombre.includes('catarro')) return 'catarro';
      if (nombre.includes('otilio')) return 'otilio';
      if (nombre.includes('ozuna')) return 'ozuna';
      if (nombre.includes('veronica') || nombre.includes('lorena')) return 'veronica';
      return null; // Cliente no reconocido
    },

    async cargarEmbarque() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);

        if (!navigator.onLine) {
          const registroOffline = await EmbarquesOfflineService.getById(embarqueId).catch(() => null);
          if (registroOffline) {
            await this.cargarEmbarquesRelacionadosOffline(embarqueId, registroOffline);
            return;
          }
        }

        const embarqueDoc = await getDoc(embarqueRef);
        
        if (embarqueDoc.exists()) {
          const embarqueBase = embarqueDoc.data();
          const fechaISO = this.obtenerFechaISODesdeValor(embarqueBase.fecha);
          const embarquesRelacionados = [{ id: embarqueId, data: embarqueBase }];

          try {
            const embarquesRef = collection(db, 'embarques');
            const snapshot = await getDocs(embarquesRef);

            snapshot.docs.forEach(docSnap => {
              if (docSnap.id === embarqueId) {
                return;
              }
              const data = docSnap.data();
              if (this.obtenerFechaISODesdeValor(data.fecha) === fechaISO) {
                embarquesRelacionados.push({ id: docSnap.id, data });
              }
            });
          } catch (error) {
            console.warn('[Rendimientos] No se pudieron cargar embarques relacionados:', error);
          }

          const combinado = this.combinarEmbarquesPorFecha(embarquesRelacionados, embarqueId);
          this.aplicarEmbarqueCargado(combinado || embarqueBase);

          await EmbarquesOfflineService.mergeSave(embarqueId, existing => {
            const record = {
              ...(existing || {}),
              id: embarqueId,
              docData: this.deepClone(embarqueBase)
            };
            return {
              record,
              options: {
                pendingSync: existing?.pendingSync ?? false,
                syncState: existing?.pendingSync ? existing.syncState : 'synced'
              }
            };
          });

          await this.actualizarOfflineRendimientos(false, this.crearPayloadRendimientos());

          
          
          // Calcular ganancias después de cargar embarque
          if (Object.keys(this.preciosVenta).length > 0) {
          this.$nextTick(async () => {
            await this.calcularGanancias();
          });
          }
        } else {
          console.error('No se encontró el embarque');
        }
      } catch (error) {
        console.error('Error al cargar el embarque:', error);
      }
    },

    async cargarPreciosVenta() {
      try {
        if (!navigator.onLine) {
          if (Object.keys(this.preciosVenta).length === 0) {
            const registroOffline = await EmbarquesOfflineService.getById(this.$route.params.id).catch(() => null);
          if (registroOffline?.preciosVentaCache) {
            this.preciosVenta = this.deepClone(registroOffline.preciosVentaCache);
          }
          }
          return;
        }

        const db = getFirestore();
        const preciosRef = collection(db, 'precios');
        const q = query(preciosRef, orderBy('fecha', 'desc'));
        const preciosSnapshot = await getDocs(q);
        
        // Crear un mapa para organizar los precios por producto
        const preciosMap = new Map();
        
        preciosSnapshot.docs.forEach(docSnapshot => {
          const precio = { id: docSnapshot.id, ...docSnapshot.data() };
          const clave = precio.producto.toLowerCase().trim();
          
          if (!preciosMap.has(clave)) {
            preciosMap.set(clave, []);
          }
          preciosMap.get(clave).push(precio);
        });
        
        // Organizar precios por producto (mantener estructura existente)
        const preciosOrganizados = {};
        preciosMap.forEach((precios, producto) => {
          // Ordenar por fecha (más reciente primero)
          const preciosOrdenados = precios.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          preciosOrganizados[producto] = preciosOrdenados;
        });
        
        this.preciosVenta = preciosOrganizados;

        await this.actualizarOfflineRendimientos(false, { preciosVentaCache: preciosOrganizados }, { includeInDocData: false });

        // Calcular ganancias después de cargar precios
        if (this.embarqueData) {
          this.$nextTick(async () => {
            await this.calcularGanancias();
          });
        }
        
      } catch (error) {
        console.error('Error al cargar precios de venta:', error);
      }
    },

    // Función auxiliar para encontrar precios con búsqueda inteligente
    encontrarPreciosParaMedida(medida) {
      // 1. Buscar coincidencia exacta primero
      let preciosProducto = this.preciosVenta[medida.toLowerCase().trim()];
      if (preciosProducto && preciosProducto.length > 0) {
        return { medidaEncontrada: medida, precios: preciosProducto };
      }
      
      // 2. Normalizar quitando sufijos comunes
      const medidaNormalizada = medida.toLowerCase().trim()
        .replace(' maquila ozuna', '')
        .replace(/\s+(vayon|ahumada|sin\s+cal|cal|c\/c|crudo|limpio).*$/g, '')
        .trim();
      
      // 3. Buscar con medida normalizada
      preciosProducto = this.preciosVenta[medidaNormalizada];
      if (preciosProducto && preciosProducto.length > 0) {
        return { medidaEncontrada: medidaNormalizada, precios: preciosProducto };
      }
      
      // 4. Buscar variaciones con espacios/guiones
      const medidaConEspacio = medidaNormalizada.replace(/-/g, ' ');
      const medidaConGuion = medidaNormalizada.replace(/ /g, '-');
      
      preciosProducto = this.preciosVenta[medidaConEspacio];
      if (preciosProducto && preciosProducto.length > 0) {
        return { medidaEncontrada: medidaConEspacio, precios: preciosProducto };
      }
      
      preciosProducto = this.preciosVenta[medidaConGuion];
      if (preciosProducto && preciosProducto.length > 0) {
        return { medidaEncontrada: medidaConGuion, precios: preciosProducto };
      }
      
      // 5. Buscar coincidencias parciales
      const medidaLower = medidaNormalizada.toLowerCase();
      
      for (const [claveProducto, precios] of Object.entries(this.preciosVenta)) {
        const claveProductoLower = claveProducto.toLowerCase().trim();
        
        // Si la clave del producto está contenida en la medida
        if (medidaLower.includes(claveProductoLower) && claveProductoLower.length > 2) {
          return { medidaEncontrada: claveProducto, precios: precios };
        }
        
        // Si la medida está contenida en la clave del producto
        if (claveProductoLower.includes(medidaLower) && medidaLower.length > 2) {
          return { medidaEncontrada: claveProducto, precios: precios };
        }
      }
      
      return null; // No se encontró
    },

    obtenerPrecioVentaParaFecha(medida, fechaEmbarque, clienteId = null) {
      // Usar la función auxiliar mejorada para buscar precios
      const resultadoBusqueda = this.encontrarPreciosParaMedida(medida);
      
      if (!resultadoBusqueda) {
        console.log(`[${medida}] No se encontraron precios para ninguna variación`);
        console.log(`[${medida}] Precios disponibles:`, Object.keys(this.preciosVenta));
        return null;
      }
      
      const { medidaEncontrada, precios: preciosProducto } = resultadoBusqueda;
      
      if (medidaEncontrada !== medida) {
        console.log(`[${medida}] Precio encontrado como: ${medidaEncontrada}`);
      }
      
      // Validar y normalizar la fecha del embarque
      const fechaEmbarqueNormalizada = this.normalizarFecha(fechaEmbarque);
      if (!fechaEmbarqueNormalizada) {
        console.warn(`[${medida}] Fecha de embarque inválida:`, fechaEmbarque);
        return null;
      }
      
      // Crear fecha del embarque solo con año-mes-día (sin hora)
      const fechaEmbarqueStr = this.toLocalYMD(fechaEmbarqueNormalizada);
      const fechaEmbarqueObj = new Date(fechaEmbarqueStr);
      const fechaHoy = this.toLocalYMD(new Date());
      const fechaHoyObj = new Date(fechaHoy);
      const diasDiferencia = Math.floor((fechaHoyObj - fechaEmbarqueObj) / (1000 * 60 * 60 * 24));
      
      const embarqueEsReciente = diasDiferencia <= this.diasRecientes;
      const embarqueEsHoyOFuturo = fechaEmbarqueStr >= fechaHoy;
      const debeUsarPreciosRecientes = embarqueEsReciente || embarqueEsHoyOFuturo;
      
      // Debug simplificado solo para errores
      if (!preciosProducto || preciosProducto.length === 0) {
        console.log(`[${medida}] ⚠️ No se encontraron precios disponibles`);
      }
      
      if (debeUsarPreciosRecientes) {
        let razonPrecioReciente = '';
        if (embarqueEsHoyOFuturo) {
          razonPrecioReciente = '(embarque de hoy/futuro)';
        } else if (embarqueEsReciente) {
          razonPrecioReciente = `(embarque reciente: hace ${diasDiferencia} día${diasDiferencia !== 1 ? 's' : ''})`;
        }
        
        // Precio más reciente aplicado
        
        // Para embarques de hoy o futuros, buscar el precio más reciente
        if (clienteId) {
          const precioEspecificoReciente = preciosProducto.find(p => p.clienteId === clienteId);
          if (precioEspecificoReciente) {
            return precioEspecificoReciente;
          }
        }
        
        // Si no hay específico, usar el precio general más reciente
        const precioGeneralReciente = preciosProducto.find(p => !p.clienteId);
        if (precioGeneralReciente) {
          return precioGeneralReciente;
        }
      } else {
        // LÓGICA ORIGINAL: Para embarques pasados, buscar el precio válido para esa fecha
        
        // Primero buscar precio específico para el cliente si se proporciona
        if (clienteId) {
          for (const precio of preciosProducto) {
            const fechaPrecioNormalizada = this.normalizarFecha(precio.fecha);
            if (!fechaPrecioNormalizada) continue;
            
            const fechaPrecioStr = this.toLocalYMD(fechaPrecioNormalizada);
            if (fechaPrecioStr <= fechaEmbarqueStr && precio.clienteId === clienteId) {
              return precio;
            }
          }
        }
        
        // Si no hay precio específico, buscar precio general
        for (const precio of preciosProducto) {
          const fechaPrecioNormalizada = this.normalizarFecha(precio.fecha);
          if (!fechaPrecioNormalizada) continue;
          
          const fechaPrecioStr = this.toLocalYMD(fechaPrecioNormalizada);
          if (fechaPrecioStr <= fechaEmbarqueStr && !precio.clienteId) {
            return precio;
          }
        }
      }
      
      // FALLBACK: Si no se encuentra nada, usar el más antiguo disponible
      const preciosGenerales = preciosProducto.filter(p => !p.clienteId);
      if (preciosGenerales.length > 0) {
        return preciosGenerales[preciosGenerales.length - 1];
      }
      
      return preciosProducto[preciosProducto.length - 1];
    },

    // Función auxiliar para encontrar costos con búsqueda inteligente
    async encontrarCostoParaMedida(medida) {
      const costosEmbarque = this.embarqueData?.costosPorMedida || {};
      
      console.log(`🔍 Buscando costo para: "${medida}"`);
      console.log(`📋 Costos en embarque:`, Object.keys(costosEmbarque));
      
      // 1. Buscar coincidencia exacta en costos del embarque primero
      let costoEncontrado = Number(costosEmbarque[medida]);
      if (costoEncontrado && costoEncontrado > 0) {
        console.log(`✅ Coincidencia exacta en embarque: ${medida} = $${costoEncontrado}`);
        return { medidaEncontrada: medida, costo: costoEncontrado };
      }
      
      // 2. Buscar insensible a mayúsculas/minúsculas en embarque
      const medidaLower = medida.toLowerCase().trim();
      for (const [claveMedida, costoValue] of Object.entries(costosEmbarque)) {
        if (claveMedida.toLowerCase().trim() === medidaLower) {
          const costo = Number(costoValue);
          if (costo > 0) {
            console.log(`✅ Coincidencia exacta (case insensitive) en embarque: ${claveMedida} = $${costo}`);
            return { medidaEncontrada: claveMedida, costo: costo };
          }
        }
      }
      
      // 3. Si no se encuentra en el embarque, buscar en medidas registradas globales
      console.log(`🌐 Buscando en medidas registradas globales...`);
      const costosGlobales = await this.obtenerCostosRegistradosGlobales();
      
      // Buscar coincidencia exacta en medidas registradas
      if (costosGlobales[medida]) {
        console.log(`✅ Coincidencia exacta en medidas registradas: ${medida} = $${costosGlobales[medida].costoBase}`);
        return { medidaEncontrada: medida, costo: costosGlobales[medida].costoBase };
      }
      
      // Buscar insensible a mayúsculas/minúsculas en medidas registradas
      for (const [claveMedida, costoInfo] of Object.entries(costosGlobales)) {
        if (claveMedida.toLowerCase().trim() === medidaLower) {
          console.log(`✅ Coincidencia exacta (case insensitive) en medidas registradas: ${claveMedida} = $${costoInfo.costoBase}`);
          return { medidaEncontrada: claveMedida, costo: costoInfo.costoBase };
        }
      }
      
      // 4. SOLO como último recurso: Normalizar quitando sufijos comunes y buscar
      const medidaNormalizada = medida.toLowerCase().trim()
        .replace(' maquila ozuna', '')
        .replace(/\s+(vayon|ahumada|sin\s+cal|cal|c\/c|crudo|limpio|tirado).*$/g, '')
        .trim();
      
      console.log(`🔍 Medida normalizada: "${medidaNormalizada}"`);
      
      // Buscar normalizada en embarque
      for (const [claveMedida, costoValue] of Object.entries(costosEmbarque)) {
        const claveNormalizada = claveMedida.toLowerCase().trim()
          .replace(' maquila ozuna', '')
          .replace(/\s+(vayon|ahumada|sin\s+cal|cal|c\/c|crudo|limpio|tirado).*$/g, '')
          .trim();
        
        if (claveNormalizada === medidaNormalizada) {
          const costo = Number(costoValue);
          if (costo > 0) {
            console.log(`⚠️ [${medida}] Usando costo normalizado del embarque: ${claveMedida} ($${costo})`);
            return { medidaEncontrada: claveMedida, costo: costo };
          }
        }
      }
      
      // Buscar normalizada en medidas registradas
      for (const [claveMedida, costoInfo] of Object.entries(costosGlobales)) {
        const claveNormalizada = claveMedida.toLowerCase().trim()
          .replace(' maquila ozuna', '')
          .replace(/\s+(vayon|ahumada|sin\s+cal|cal|c\/c|crudo|limpio|tirado).*$/g, '')
          .trim();
        
        if (claveNormalizada === medidaNormalizada) {
          console.log(`⚠️ [${medida}] Usando costo normalizado de medidas registradas: ${claveMedida} ($${costoInfo.costoBase})`);
          return { medidaEncontrada: claveMedida, costo: costoInfo.costoBase };
        }
      }
      
      console.log(`❌ No se encontró costo para: "${medida}"`);
      return null; // No se encontró
    },

    // Función para obtener costos registrados globales
    async obtenerCostosRegistradosGlobales() {
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
        
        // Helper para convertir fecha
        const toDate = (value) => {
          try {
            if (!value) return null;
            if (value.toDate && typeof value.toDate === 'function') return value.toDate();
            if (value.seconds) return new Date(value.seconds * 1000);
            if (typeof value === 'string') return new Date(value);
            if (value instanceof Date) return value;
            return new Date(value);
          } catch {
            return null;
          }
        };

        // Ordenar por fecha descendente
        historialCompleto.sort((a, b) => {
          const fechaA = toDate(a.fecha) || toDate(a.timestamp) || new Date(0);
          const fechaB = toDate(b.fecha) || toDate(b.timestamp) || new Date(0);
          return fechaB - fechaA;
        });
        
        // Obtener fecha del embarque
        const fechaEmbarqueNormalizada = this.normalizarFecha(this.embarqueData?.fecha);
        const fechaEmb = fechaEmbarqueNormalizada || new Date();
        fechaEmb.setHours(12, 0, 0, 0);
        
        // Obtener solo los costos válidos para la fecha del embarque
        const costosActuales = {};
        const medidasProcesadas = new Set();
        
        historialCompleto.forEach(entrada => {
          if (!medidasProcesadas.has(entrada.medida)) {
            const fechaCosto = toDate(entrada.fecha) || toDate(entrada.timestamp) || new Date(0);
            fechaCosto.setHours(12, 0, 0, 0);

            if (fechaCosto <= fechaEmb && !entrada.eliminado && !entrada.medidaEliminada) {
              costosActuales[entrada.medida] = {
                costoBase: entrada.costoBase,
                fecha: entrada.fecha,
                timestamp: entrada.timestamp,
                id: entrada.id
              };
              medidasProcesadas.add(entrada.medida);
            }
          }
        });
        
        return costosActuales;
      } catch (error) {
        console.error('Error al obtener costos registrados globales:', error);
        return {};
      }
    },

    // Método para precargar todos los costos
    async precargarCostos() {
      if (!this.medidasUnicas || this.medidasUnicas.length === 0) return;
      
      console.log('🔄 Precargando costos para todas las medidas...');
      
      // Obtener costos globales una sola vez
      if (!this.costosGlobalesCache) {
        this.costosGlobalesCache = await this.obtenerCostosRegistradosGlobales();
      }
      
      // Precargar costos para cada medida
      const promesasCostos = this.medidasUnicas.map(async (medida) => {
        try {
          const costoCalculado = await this.calcularCostoFinal(medida);
          this.$set(this.costosCalculados, medida, costoCalculado);
        } catch (error) {
          console.error(`Error al calcular costo para ${medida}:`, error);
          this.$set(this.costosCalculados, medida, 0);
        }
      });
      
      await Promise.all(promesasCostos);
      console.log('✅ Costos precargados:', this.costosCalculados);
    },

    // Versión síncrona de calcularCostoFinal que usa el cache
    calcularCostoFinalSync(medida) {
      // Si está en cache, usar ese valor
      if (this.costosCalculados[medida] !== undefined) {
        return this.costosCalculados[medida];
      }
      
      // Si no está en cache, intentar calcularlo de forma síncrona usando los costos disponibles
      const costosEmbarque = this.embarqueData?.costosPorMedida || {};
      let costo = Number(costosEmbarque[medida]) || 0;
      
      // Si no hay costo en el embarque, buscar en el cache de costos globales
      if (costo === 0 && this.costosGlobalesCache) {
        // Buscar coincidencia exacta en costos globales
        if (this.costosGlobalesCache[medida]) {
          costo = this.costosGlobalesCache[medida].costoBase;
          console.log(`💰 [${medida}] Usando costo global del cache: $${costo}`);
        } else {
          // Buscar insensible a mayúsculas
          const medidaLower = medida.toLowerCase().trim();
          for (const [claveMedida, costoInfo] of Object.entries(this.costosGlobalesCache)) {
            if (claveMedida.toLowerCase().trim() === medidaLower) {
              costo = costoInfo.costoBase;
              console.log(`💰 [${medida}] Usando costo global (case insensitive): ${claveMedida} = $${costo}`);
              break;
            }
          }
        }
      }
      
      const rendimientoOriginal = this.getRendimiento(medida);
      const rendimiento = Math.round(rendimientoOriginal * 100) / 100;
      const costoExtra = Number(this.embarqueData?.costoExtra) || 18;
      const aplicarExtra = this.debeAplicarCostoExtra(medida);
      
      let resultado;
      if (aplicarExtra) {
        resultado = Math.round((costo * rendimiento) + costoExtra);
      } else {
        resultado = Math.round(costo * rendimiento);
      }
      
      // Guardar en cache para futuras llamadas
      this.$set(this.costosCalculados, medida, resultado);
      
      return resultado;
    },

    async calcularCostoFinal(medida) {
      // Usar búsqueda inteligente de costos
      const resultadoBusqueda = await this.encontrarCostoParaMedida(medida);
      let costo = 0;
      let medidaUsada = medida;
      
      if (resultadoBusqueda) {
        costo = resultadoBusqueda.costo;
        medidaUsada = resultadoBusqueda.medidaEncontrada;
        
        // Log informativo si se usó una medida diferente
        if (medidaUsada !== medida) {
          console.log(`💰 [${medida}] Usando costo de: ${medidaUsada} ($${costo})`);
        }
      } else {
        console.warn(`⚠️ [${medida}] No se encontró costo para esta medida`);
      }
      
      const rendimientoOriginal = this.getRendimiento(medida);
      // Usar rendimiento redondeado a 2 decimales (igual que se muestra en la UI)
      const rendimiento = Math.round(rendimientoOriginal * 100) / 100;
      const costoExtra = Number(this.embarqueData?.costoExtra) || 18;
      
      // Verificar si está marcado para aplicar costo extra
      const aplicarExtra = this.debeAplicarCostoExtra(medida);
      
      if (aplicarExtra) {
        return Math.round((costo * rendimiento) + costoExtra);
      } else {
        return Math.round(costo * rendimiento);
      }
    },

    async calcularGanancias() {
      if (!this.embarqueData) return;
      
      // Normalizar la fecha del embarque
      const fechaEmbarqueNormalizada = this.normalizarFecha(this.embarqueData.fecha);
      const fechaEmbarque = fechaEmbarqueNormalizada ? 
        this.toLocalYMD(fechaEmbarqueNormalizada) : 
        this.toLocalYMD(new Date());
      
      const ganancias = {};
      
      for (const medida of this.medidasUnicas) {
        // Solo calcular ganancias si el análisis está activado para esta medida
        if (!this.analizarGanancia[medida]) continue;
        
        const costoFinal = await this.calcularCostoFinal(medida);
        this.$set(this.costosCalculados, medida, costoFinal);
        
        // Obtener el costo base original (sin cálculos adicionales)
        const costosEmbarque = this.embarqueData?.costosPorMedida || {};
        const costoBase = Number(costosEmbarque[medida]) || 0;
        
        // Obtener clientes que tienen productos de esta medida
        const clientesConMedida = this.obtenerClientesConMedida(medida);
        
        // Calcular precio promedio ponderado y ganancias reales
        const resultadoCalculo = this.calcularPrecioYGanancias(medida, fechaEmbarque, clientesConMedida, costoFinal, costoBase);
        
        if (!resultadoCalculo) continue; // Si no hay precios, saltar esta medida
        
        ganancias[medida] = resultadoCalculo;
      }
      
      this.gananciasCalculadas = ganancias;
      
      // Calcular también las ganancias de crudos
      this.calcularGananciasCrudos();
    },

    // Nuevo método que calcula precio promedio ponderado y ganancias
    calcularPrecioYGanancias(medida, fechaEmbarque, clientesConMedida, costoFinal, costoBase) {
      let gananciasPorCliente = [];
      let totalEmbarcadoGeneral = 0;
      let gananciaTotalSumada = 0;
      let totalVentasPonderadas = 0;
      
      // Obtener precio general más reciente
      const precioGeneral = this.obtenerPrecioVentaParaFecha(medida, fechaEmbarque, null);
      const fechaGeneral = precioGeneral ? this.normalizarFecha(precioGeneral.fecha) : null;
      
      // Calcular ganancias por cada cliente
      clientesConMedida.forEach(({ cliente, totalEmbarcado }) => {
        const clienteIdParaPrecios = this.obtenerClienteIdParaPrecios(cliente.nombre);
        
        // Buscar precio específico para el cliente
        const precioEspecifico = this.obtenerPrecioVentaParaFecha(medida, fechaEmbarque, clienteIdParaPrecios);
        
        // Decidir qué precio usar: específico solo si es más reciente que el general
        let precioAUsar = precioGeneral; // Por defecto usar general
        let esEspecifico = false;
        
        if (precioEspecifico && precioEspecifico.clienteId) {
          const fechaEspecifico = this.normalizarFecha(precioEspecifico.fecha);
          // Solo usar específico si es más reciente que el general (o si no hay general)
          if (fechaEspecifico && (!fechaGeneral || fechaEspecifico > fechaGeneral)) {
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
      
      // Calcular precio promedio ponderado
      const precioPromedioPonderado = totalEmbarcadoGeneral > 0 ? 
        Math.round(totalVentasPonderadas / totalEmbarcadoGeneral) : 0;
      
      // Determinar información para mostrar
      const clientesConEspecifico = gananciasPorCliente.filter(g => g.esEspecifico);
      const preciosUnicos = new Set(gananciasPorCliente.map(g => g.precioVenta));
      const tieneMultiplesPrecios = preciosUnicos.size > 1;
      const soloUnCliente = gananciasPorCliente.length === 1;
      
      // Debug detallado
      console.log(`[${medida}] Cálculo de precios:`, {
        fechaEmbarque: fechaEmbarque,
        precioGeneral: precioGeneral ? { precio: precioGeneral.precio, fecha: precioGeneral.fecha, clienteId: precioGeneral.clienteId } : null,
        fechaGeneral: precioGeneral?.fecha,
        clientesConEspecifico: clientesConEspecifico.map(c => ({ 
          cliente: c.cliente, 
          precio: c.precioVenta, 
          fecha: c.fechaPrecio,
          clienteId: c.clienteId 
        })),
        precioPromedio: precioPromedioPonderado,
        tieneMultiplesPrecios,
        soloUnCliente,
        totalClientes: gananciasPorCliente.length,
        detallesPorCliente: gananciasPorCliente.map(g => ({
          cliente: g.cliente,
          precio: g.precioVenta,
          fecha: g.fechaPrecio,
          esEspecifico: g.esEspecifico
        }))
      });
      
      let infoMostrar = {
        esPromedio: tieneMultiplesPrecios,
        esEspecifico: false,
        clienteEspecifico: null,
        clientesConEspecifico: clientesConEspecifico.map(c => c.cliente),
        fechaMasReciente: gananciasPorCliente.reduce((fecha, g) => {
          const fechaActual = this.normalizarFecha(g.fechaPrecio);
          return !fecha || (fechaActual && fechaActual > fecha) ? fechaActual : fecha;
        }, null)
      };
      
      // Si solo hay un cliente con precio específico más reciente, mostrarlo como específico
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
        fechaPrecio: infoMostrar.fechaMasReciente ? this.toLocalYMD(infoMostrar.fechaMasReciente) : undefined,
        esPromedio: infoMostrar.esPromedio,
        esEspecifico: infoMostrar.esEspecifico,
        clienteEspecifico: infoMostrar.clienteEspecifico,
        clientesConEspecifico: infoMostrar.clientesConEspecifico,
        detallesPorCliente: gananciasPorCliente
      };
    },

    // ============ MÉTODOS PARA CÁLCULO DE GANANCIAS DE CRUDOS ============

    // Obtener todas las tallas de crudos únicas
    obtenerTallasCrudosUnicas() {
      if (!this.embarqueData || !this.embarqueData.clientes) return [];
      
      const tallasSet = new Set();
      let totalItems = 0;
      let itemsDeVenta = 0;
      let itemsSinVenta = 0;
      
            this.embarqueData.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach((crudo, crudoIndex) => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach((item, itemIndex) => {
                totalItems++;
                
                if (item.talla) {
                  // Para Ozuna: solo mostrar si es venta
                  // Para otros clientes: todos los crudos son venta
                  const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                  
                  if (esVenta) {
                    tallasSet.add(item.talla);
                    itemsDeVenta++;
                  } else {
                    itemsSinVenta++;
                  }
                }
              });
            }
          });
        }
      });
      
      return Array.from(tallasSet).sort();
    },

    // Calcular ganancias de crudos por talla
    calcularGananciasCrudos() {
      if (!this.embarqueData) return;
      
      const fechaEmbarque = this.toLocalYMD(this.normalizarFecha(this.embarqueData.fecha) || new Date());
      const ganancias = {};
      const tallasCrudos = this.obtenerTallasCrudosUnicas();
      
              tallasCrudos.forEach(talla => {
        // Solo calcular ganancias si el análisis está activado para esta talla
        if (!this.analizarGananciaCrudos[talla]) {
          return;
        }
        const resultadoCalculo = this.calcularGananciasPorTallaCrudo(talla, fechaEmbarque);
        
        if (resultadoCalculo) {
          ganancias[talla] = resultadoCalculo;
        }
      });
      
      this.gananciasCalculadasCrudos = ganancias;
    },

    // Calcular ganancias para una talla específica de crudo
    calcularGananciasPorTallaCrudo(talla, fechaEmbarque) {
      if (!this.embarqueData || !this.embarqueData.clientes) return null;
      
      let totalKilosVenta = 0;
      let totalVentas = 0;
      let detallesPorCliente = [];
      let hayPreciosIndividuales = false;
      
      // Calcular el costo base para esta talla usando el sistema existente
      const costoBase = this.calcularCostoCrudoPorTalla(talla);
      const costoFinal = costoBase + 3.5; // Sumar 3.5 al costo

      // Obtener los kilos de costo para esta talla
      const tarasData = this.calcularTarasCrudosPorMedida();
      const totalKilosCosto = tarasData[talla]?.totalKilos || 0;
      
      // Iterar por todos los clientes y sus crudos
      this.embarqueData.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.talla === talla) {
                  // Para Ozuna: solo considerar si es venta
                  // Para otros clientes: todos los crudos son venta
                  const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                  
                  if (esVenta) {
                    // Calcular kilos del item
                    const kilosVentaItem = this.calcularKilosCrudosItem(item);
                    totalKilosVenta += kilosVentaItem;
                    
                    // Determinar precio a usar
                    let precioAUsar = null;
                    let fuentePrecio = '';
                    
                    if (item.precio && item.precio > 0) {
                      // Usar precio individual del item
                      precioAUsar = item.precio;
                      fuentePrecio = 'individual';
                      hayPreciosIndividuales = true;
                    } else {
                      // Usar precio del sistema general
                      const clienteIdParaPrecios = this.obtenerClienteIdParaPrecios(cliente.nombre);
                      const precioSistema = this.obtenerPrecioVentaParaFecha(talla, fechaEmbarque, clienteIdParaPrecios);
                      if (precioSistema) {
                        precioAUsar = precioSistema.precio;
                        fuentePrecio = precioSistema.clienteId ? 'sistema-especifico' : 'sistema-general';
                      }
                    }
                    
                    if (precioAUsar && kilosVentaItem > 0) {
                      totalVentas += precioAUsar * kilosVentaItem;
                      
                      detallesPorCliente.push({
                        cliente: cliente.nombre,
                        kilos: kilosVentaItem,
                        precioVenta: precioAUsar,
                        gananciaUnitaria: 0, // Se recalcula después
                        gananciaTotal: 0, // Se recalcula después
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
      
      if (totalKilosVenta === 0) {
        return null;
      }
      
      const totalCosto = costoFinal * totalKilosCosto;
      const totalGanancias = totalVentas - totalCosto;
      
      // Calcular precio promedio ponderado
      const precioPromedioPonderado = totalKilosVenta > 0 ? totalVentas / totalKilosVenta : 0;
      const gananciaUnitariaPromedio = totalKilosVenta > 0 ? totalGanancias / totalKilosVenta : 0;

      // Actualizar los detalles de ganancia por cliente (es una aproximación)
      detallesPorCliente.forEach(detalle => {
        detalle.gananciaUnitaria = gananciaUnitariaPromedio;
        detalle.gananciaTotal = detalle.gananciaUnitaria * detalle.kilos;
      });
      
      const resultado = {
        talla: talla,
        totalKilos: Math.round(totalKilosVenta),
        totalKilosCosto: Math.round(totalKilosCosto),
        precioVenta: Math.round(precioPromedioPonderado),
        costoBase: costoFinal,
        costoTotal: Math.round(totalCosto), // Añadido para posible uso
        gananciaUnitaria: Math.round(gananciaUnitariaPromedio),
        gananciaTotal: Math.round(totalGanancias),
        hayPreciosIndividuales: hayPreciosIndividuales,
        detallesPorCliente: detallesPorCliente,
        fechaCalculo: this.toLocalYMD(new Date())
      };
      
      // Ganancia calculada exitosamente
      
      return resultado;
    },

    // Calcular costo para una talla de crudo
    calcularCostoCrudoPorTalla(talla) {
      // Usar el sistema de costos existente
      const costosEmbarque = this.embarqueData?.costosPorMedida || {};
      
      // Buscar primero con nombre exacto
      let costo = Number(costosEmbarque[talla]) || 0;
      let medidaEncontrada = talla;
      
      // Si no se encuentra, buscar insensible a mayúsculas/minúsculas
      if (costo === 0) {
        const tallaLower = talla.toLowerCase();
        for (const [medida, costoValue] of Object.entries(costosEmbarque)) {
          if (medida.toLowerCase() === tallaLower) {
            costo = Number(costoValue) || 0;
            medidaEncontrada = medida;
            break;
          }
        }
      }
      
      // Si aún no se encuentra costo, inicializar costosPorMedida si no existe
      if (costo === 0 && (!this.embarqueData.costosPorMedida || Object.keys(this.embarqueData.costosPorMedida).length === 0)) {
        console.log(`⚠️ No se encontró costo para talla ${talla}. Inicializando costosPorMedida automáticamente.`);
        this.inicializarCostosPorMedida();
        
        // Intentar buscar nuevamente después de inicializar
        const costosEmbarqueActualizados = this.embarqueData?.costosPorMedida || {};
        costo = Number(costosEmbarqueActualizados[talla]) || 0;
        
        if (costo === 0) {
          const tallaLower = talla.toLowerCase();
          for (const [medida, costoValue] of Object.entries(costosEmbarqueActualizados)) {
            if (medida.toLowerCase() === tallaLower) {
              costo = Number(costoValue) || 0;
              medidaEncontrada = medida;
              break;
            }
          }
        }
      }
      
      console.log(`🔍 DEBUG - Calculando costo para talla ${talla}:`, {
        tallaBuscada: talla,
        medidaEncontrada: medidaEncontrada,
        costosDisponibles: Object.keys(costosEmbarque),
        costoEncontrado: costosEmbarque[medidaEncontrada],
        costoCalculado: costo,
        esCrudo: talla.includes('c/c'),
        busquedaCaseInsensitive: talla !== medidaEncontrada
      });
      
      // Para crudos, no aplicar costo extra ya que son materias primas
      return costo;
    },

    // Calcular kilos de un item de crudo
    calcularKilosCrudosItem(item) {
      let kilosTotales = 0;
      let detalleCalculo = {
        talla: item.talla,
        taras: item.taras,
        sobrante: item.sobrante,
        kilosDeTaras: 0,
        kilosDeSobrante: 0
      };
      
      // Procesar taras principales
      if (item.taras) {
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
        if (formatoGuion) {
          const cantidad = parseInt(formatoGuion[1]) || 0;
          let peso = parseInt(formatoGuion[2]) || 0;
          
          // Si el peso es 19, usar el peso configurado para ventas
          if (peso === 19) {
            peso = this.pesoTaraVenta;
          }
          
          detalleCalculo.kilosDeTaras = cantidad * peso;
          kilosTotales += detalleCalculo.kilosDeTaras;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidad, peso] = item.taras.split('-').map(Number);
          detalleCalculo.kilosDeTaras = (cantidad || 0) * (peso || 0);
          kilosTotales += detalleCalculo.kilosDeTaras;
        }
      }
      
      // Procesar sobrantes
      if (item.sobrante) {
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
        if (formatoGuion) {
          const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
          let pesoSobrante = parseInt(formatoGuion[2]) || 0;
          
          // Si el peso es 19, usar el peso configurado para ventas
          if (pesoSobrante === 19) {
            pesoSobrante = this.pesoTaraVenta;
          }
          
          detalleCalculo.kilosDeSobrante = cantidadSobrante * pesoSobrante;
          kilosTotales += detalleCalculo.kilosDeSobrante;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
          detalleCalculo.kilosDeSobrante = (cantidadSobrante || 0) * (pesoSobrante || 0);
          kilosTotales += detalleCalculo.kilosDeSobrante;
        }
      }
      
      detalleCalculo.kilosTotales = kilosTotales;
      
      return kilosTotales;
    },

    // Método auxiliar para guardar estado de análisis de crudos
    async guardarEstadoAnalisisCrudos() {
      await this.persistirCamposRendimientos({
        analizarGananciaCrudos: this.deepClone(this.analizarGananciaCrudos)
      });
    },

    // Inicializar costos por medida automáticamente
    async inicializarCostosPorMedida() {
      try {
        if (!navigator.onLine) {
          console.warn('No se puede inicializar costos por medida sin conexión a internet.');
          return;
        }
        const db = getFirestore();
        
        // Cargar costos registrados desde el historial
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
        
        // Ordenar por timestamp descendente
        historialCompleto.sort((a, b) => {
          const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return timestampB - timestampA;
        });
        
        // Obtener solo los costos más recientes por medida (que no estén eliminados)
        const costosRegistrados = {};
        const medidasProcesadas = new Set();
        
        historialCompleto.forEach(entrada => {
          if (!medidasProcesadas.has(entrada.medida)) {
            // Si no está marcada como eliminada, es el costo actual
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
        
        // Aplicar costos a las medidas del embarque si no tienen costo asignado
        const costosEmbarque = this.embarqueData?.costosPorMedida || {};
        let costosActualizados = false;
        
        // Obtener todas las tallas de crudos para aplicar costos
        const tallasCrudos = this.obtenerTallasCrudosUnicas();
        
        tallasCrudos.forEach(talla => {
          // Buscar costo registrado para esta talla (exacto o insensible a mayúsculas)
          let costoEncontrado = null;
          
          if (costosRegistrados[talla]) {
            costoEncontrado = costosRegistrados[talla];
          } else {
            // Búsqueda insensible a mayúsculas/minúsculas
            const tallaLower = talla.toLowerCase();
            for (const [medida, costoInfo] of Object.entries(costosRegistrados)) {
              if (medida.toLowerCase() === tallaLower) {
                costoEncontrado = costoInfo;
                break;
              }
            }
          }
          
          // Si se encontró un costo y no está asignado en el embarque, aplicarlo
          if (costoEncontrado && !costosEmbarque[talla]) {
            costosEmbarque[talla] = costoEncontrado.costoBase;
            costosActualizados = true;
            console.log(`💰 Aplicando costo automático para ${talla}: $${costoEncontrado.costoBase}`);
          }
        });
        
        // Guardar cambios en Firebase si hubo actualizaciones
        if (costosActualizados) {
          if (!this.embarqueData.costosPorMedida) {
            this.embarqueData.costosPorMedida = {};
          }
          Object.assign(this.embarqueData.costosPorMedida, costosEmbarque);

          await this.persistirCamposRendimientos({
            costosPorMedida: this.deepClone(this.embarqueData.costosPorMedida)
          });

          console.log('✅ Costos inicializados y guardados automáticamente');
        }

      } catch (error) {
        console.error('Error al inicializar costos por medida:', error);
      }
    },

    // Método auxiliar para obtener nombre de cliente desde ID
    obtenerNombreClienteDeId(clienteId) {
      const mapeo = {
        'joselito': 'Joselito',
        'catarro': 'Catarro', 
        'otilio': 'Otilio',
        'ozuna': 'Ozuna'
      };
      return mapeo[clienteId] || clienteId;
    },

    // Nuevo método para obtener clientes que tienen productos de una medida específica
    obtenerClientesConMedida(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return [];
      
      const clientesConMedida = [];
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      
      this.embarqueData.clientes.forEach(cliente => {
        let totalEmbarcado = 0;
        
        cliente.productos.forEach(producto => {
          if (!producto.medida) return;
          
          let incluir = false;
          
          // Lógica para determinar si incluir el producto
          if (esOzuna) {
            // Solo incluir si el producto es de cliente Ozuna y NO es una venta
            incluir = producto.medida.toLowerCase().trim() === medidaBase && 
                     cliente.nombre === 'Ozuna' && 
                     !producto.esVenta;
          } else {
            // Solo incluir si el producto coincide con la medida y NO es de Ozuna o es de Ozuna pero es VENTA
            incluir = producto.medida.toLowerCase().trim() === medidaBase && 
                     (cliente.nombre !== 'Ozuna' || producto.esVenta);
          }
          
          if (incluir) {
            // Excluir productos refrigerados del cálculo de ganancias
            if (!producto.refrigerar) {
              if (producto.tipo === 'c/h20') {
                const totalBolsas = this.calcularTotalBolsas(producto);
                const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
                totalEmbarcado += (totalBolsas * valorNeto);
              } else {
                const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
                const sumaTaras = this.calcularTotalTaras(producto);
                const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
                totalEmbarcado += (sumaKilos - descuentoTaras);
              }
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
    },

    async guardarCambiosEnTiempoReal() {
      if (!this.guardadoAutomaticoActivo) return;
      const payload = this.crearPayloadRendimientos();
      await this.actualizarOfflineRendimientos(!navigator.onLine, payload);

      if (!navigator.onLine) {
        return;
      }

      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', this.$route.params.id);
        await updateDoc(embarqueRef, {
          kilosCrudos: payload.kilosCrudos,
          medidaOculta: payload.medidaOculta,
          analizarGanancia: payload.analizarGanancia,
          analizarGananciaCrudos: payload.analizarGananciaCrudos,
          analizarMaquilaGanancia: payload.analizarMaquilaGanancia,
          precioMaquila: payload.precioMaquila,
          pesoTaraCosto: payload.pesoTaraCosto,
          pesoTaraVenta: payload.pesoTaraVenta,
          nombresMedidasPersonalizados: payload.nombresMedidasPersonalizados,
          notaRendimientos: payload.notaRendimientos
        });
        await this.actualizarOfflineRendimientos(false, payload);
        console.log('Rendimientos guardados (online).');
      } catch (error) {
        console.error('Error al guardar los rendimientos:', error);
      }
    },

    obtenerMedidasUnicas() {
      if (!this.embarqueData || !this.embarqueData.clientes) return;
      
      const medidasMap = new Map();
      const mixMedidas = new Map();
      
      this.embarqueData.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.medida) {
            const medidaNormalizada = producto.medida.toLowerCase().trim();
            let nombreMedida = producto.medida.trim();
            let claveUnica = medidaNormalizada;
            
            // Solo añadir "Maquila Ozuna" si es de Ozuna y NO es una venta
            if (cliente.nombre === 'Ozuna' && !producto.esVenta) {
              nombreMedida = `${producto.medida.trim()} Maquila Ozuna`;
              // Crear una clave única para maquila para evitar sobrescribir ventas
              claveUnica = `${medidaNormalizada}_maquila_ozuna`;
            }

            if (medidaNormalizada.endsWith('mix')) {
              const baseSize = medidaNormalizada.split(' ')[0];
              mixMedidas.set(baseSize, nombreMedida);
            } else {
              // Usar claveUnica para permitir que existan tanto venta como maquila
              // de la misma medida sin sobrescribirse
              if (!medidasMap.has(claveUnica)) {
                medidasMap.set(claveUnica, nombreMedida);
              }
            }
          }
        });
      });

      const mixKeys = Array.from(mixMedidas.keys()).sort();
      if (mixKeys.length >= 2) {
        for (let i = 0; i < mixKeys.length; i += 2) {
          if (i + 1 < mixKeys.length) {
            const combinedName = `${mixKeys[i]}-${mixKeys[i+1]} mix`;
            const combinedNameNormalizado = combinedName.toLowerCase();
            
            if (!medidasMap.has(combinedNameNormalizado)) {
              medidasMap.set(combinedNameNormalizado, combinedName);
            }
            
            if (!this.kilosCrudos[combinedName]) {
              this.$set(this.kilosCrudos, combinedName, {
                medida1: 0,
                medida2: 0,
                etiqueta1: `Kilos en crudo (${mixKeys[i]})`,
                etiqueta2: `Kilos en crudo (${mixKeys[i+1]})`
              });
            }
          }
        }
      }
      
      this.medidasUnicas = Array.from(medidasMap.values());
    },

    obtenerTotalEmbarcado(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      if (medida.includes('-') && medida.endsWith('mix')) {
        const [medida1, medida2] = medida.split('-').map(m => m.trim());
        const total1 = this.calcularTotalParaMedida(medida1 + ' mix');
        const total2 = this.calcularTotalParaMedida(medida2.replace(' mix', '') + ' mix');
        return total1 + total2;
      }
      
      return this.calcularTotalParaMedida(medida);
    },

    calcularTotalParaMedida(medida) {
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      
      return this.embarqueData.clientes.reduce((total, cliente) => {
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
              const totalBolsas = this.calcularTotalBolsas(producto);
              const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
              return subtotal + (totalBolsas * valorNeto);
            } else {
              const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
              const sumaTaras = this.calcularTotalTaras(producto);
              const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
              return subtotal + (sumaKilos - descuentoTaras);
            }
          }, 0);
      }, 0);
    },

    obtenerTotalParaRendimiento(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const medidaNormalizada = medida.toLowerCase();
      const productos = this.embarqueData.clientes.flatMap(cliente => 
        cliente.productos.filter(p => 
          p.medida && p.medida.toLowerCase() === medidaNormalizada
        )
      );

      const tieneCH20 = productos.some(p => p.tipo === 'c/h20');
      
      if (tieneCH20) {
        return this.obtenerTotalEmbarcado(medida);
      } else {
        return this.obtenerTotalReal(medida);
      }
    },

    obtenerTotalReal(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      
      return this.embarqueData.clientes.reduce((total, cliente) => {
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
            return subtotal + this.calcularTotalKilos(producto);
          }, 0);
      }, 0);
    },

    calcularTotalKilos(producto) {
      if (!producto.kilos) return 0;
      
      const sumaKilos = producto.kilos.reduce((total, kilo) => total + (Number(kilo) || 0), 0);
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      const descuentoTaras = producto.restarTaras ? tarasNormales * 3 : 0;
      
      return sumaKilos - descuentoTaras;
    },

    calcularTotalTaras(producto) {
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      return tarasNormales + tarasExtra;
    },

    calcularTotalBolsas(producto) {
      const reporteTaras = producto.reporteTaras || [];
      const reporteBolsas = producto.reporteBolsas || [];
      let sumaTotalKilos = 0;

      for (let i = 0; i < reporteTaras.length; i++) {
        const taras = parseInt(reporteTaras[i]) || 0;
        const bolsa = parseInt(reporteBolsas[i]) || 0;
        sumaTotalKilos += taras * bolsa;
      }

      return sumaTotalKilos;
    },

    calcularRendimiento(medida) {
      const totalEmbarcado = this.obtenerTotalEmbarcado(medida);
      if (totalEmbarcado === 0) return 0;
      
      let kilosCrudos;
      if (this.esMedidaMix(medida)) {
        kilosCrudos = Number(this.kilosCrudos[medida]?.medida1 || 0) + 
                      Number(this.kilosCrudos[medida]?.medida2 || 0);
      } else {
        kilosCrudos = Number(this.kilosCrudos[medida] || 0);
      }
      
      const rendimiento = kilosCrudos / totalEmbarcado;
      
      this.guardarCambiosEnTiempoReal();
      return rendimiento;
    },

    getRendimiento(medida) {
      return this.calcularRendimiento(medida) || 0;
    },

    volverAEmbarque() {
      this.$router.push({
        name: 'EditarEmbarque',
        params: { id: this.$route.params.id }
      });
    },

    esMedidaMix(medida) {
      return medida.toLowerCase().includes('mix');
    },

    debeAplicarCostoExtra(medida) {
      if (!medida) return false;

      if (!this.aplicarCostoExtra) {
        this.$set(this, 'aplicarCostoExtra', {});
      }

      if (Object.prototype.hasOwnProperty.call(this.aplicarCostoExtra, medida)) {
        return Boolean(this.aplicarCostoExtra[medida]);
      }

      const medidaNormalizada = (medida || '').trim();
      const esMaquilaOzuna = /maquila\s+ozuna/i.test(medidaNormalizada);
      const esNumerica = /^(\d+\/\d+)/.test(medidaNormalizada) || /^(\d+)\s/.test(medidaNormalizada) || /^\d+$/.test(medidaNormalizada);

      const aplicarPorDefecto = esNumerica && !esMaquilaOzuna;
      this.$set(this.aplicarCostoExtra, medida, aplicarPorDefecto);

      return aplicarPorDefecto;
    },

    obtenerEtiqueta(medida, campo) {
      if (!this.kilosCrudos[medida]) return campo === 'medida1' ? 
        'Kilos en crudo (Medida 1)' : 'Kilos en crudo (Medida 2)';
        
      return campo === 'medida1' ? 
        (this.kilosCrudos[medida].etiqueta1 || 'Kilos en crudo (Medida 1)') : 
        (this.kilosCrudos[medida].etiqueta2 || 'Kilos en crudo (Medida 2)');
    },

    editarEtiqueta(medida, campo) {
      if (!this.kilosCrudos[medida]) {
        this.$set(this.kilosCrudos, medida, {
          medida1: 0,
          medida2: 0,
          etiqueta1: 'Kilos en crudo (Medida 1)',
          etiqueta2: 'Kilos en crudo (Medida 2)'
        });
      }

      const etiquetaActual = campo === 'medida1' ? 
        this.kilosCrudos[medida].etiqueta1 : 
        this.kilosCrudos[medida].etiqueta2;

      const nuevaEtiqueta = prompt('Ingrese el nuevo nombre para la medida:', etiquetaActual);
      
      if (nuevaEtiqueta !== null) {
        if (campo === 'medida1') {
          this.$set(this.kilosCrudos[medida], 'etiqueta1', nuevaEtiqueta);
        } else {
          this.$set(this.kilosCrudos[medida], 'etiqueta2', nuevaEtiqueta);
        }
        this.guardarCambiosEnTiempoReal();
      }
    },

    generarPDF() {
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
          const incluyeCostoFinal = !!this.analizarGanancia[medida];

          // Usar la versión síncrona que usa el cache cuando aplica
          const costoFinal = incluyeCostoFinal ? this.calcularCostoFinalSync(medida) : null;

          return {
            medida: medida,
            kilosCrudos: kilosCrudos,
            totalEmbarcado: this.obtenerTotalEmbarcado(medida),
            rendimiento: rendimiento,
            costoFinal: costoFinal,
            incluyeCostoFinal
          };
        });

      const embarqueDataConNota = {
        ...this.embarqueData,
        notaRendimientos: this.embarqueData?.notaRendimientos || '',
        mostrarColumnaCosto: true // Siempre mostrar la columna de costos
      };

      // Filtrar ganancias solo para medidas visibles Y que tengan análisis activado
      const gananciasVisibles = Object.entries(this.gananciasCalculadas)
        .filter(([medida]) => !this.medidaOculta[medida] && this.analizarGanancia[medida])
        .reduce((acc, [medida, ganancia]) => {
          acc[medida] = ganancia;
          return acc;
        }, {});

      // Calcular taras de crudo por medida
      const tarasCrudosPorMedida = this.calcularTarasCrudosPorMedida();

      // Filtrar ganancias de crudos solo para tallas que tengan análisis activado
      const gananciasVisiblesCrudos = Object.entries(this.gananciasCalculadasCrudos)
        .filter(([talla]) => this.analizarGananciaCrudos[talla])
        .reduce((acc, [talla, ganancia]) => {
          acc[talla] = ganancia;
          return acc;
        }, {});

      // Calcular costos para crudos (costo base + 3.5)
      const costosCrudos = this.calcularCostosCrudos(tarasCrudosPorMedida);

      // Pasar la configuración de pesos al PDF
      const configuracionPesos = {
        pesoTaraCosto: this.pesoTaraCosto,
        pesoTaraVenta: this.pesoTaraVenta
      };

      // Calcular ganancias de maquila para el PDF
      const gananciasVisiblesMaquila = {};
      Object.keys(this.analizarMaquilaGanancia).forEach(medida => {
        if (this.analizarMaquilaGanancia[medida] && !this.medidaOculta[medida]) {
          gananciasVisiblesMaquila[medida] = {
            totalEmbarcado: this.obtenerTotalEmbarcado(medida),
            precioMaquila: Number(this.precioMaquila[medida]) || 0,
            gananciaTotal: this.calcularGananciaMaquila(medida)
          };
        }
      });

      generarPDFRendimientos(datosRendimientos, embarqueDataConNota, gananciasVisibles, tarasCrudosPorMedida, gananciasVisiblesCrudos, costosCrudos, configuracionPesos, gananciasVisiblesMaquila);
    },

    obtenerNombreMedidaPersonalizado(medida) {
      return this.nombresMedidasPersonalizados[medida] || medida;
    },

    async editarNombreMedida(medida) {
      const nombreActual = this.obtenerNombreMedidaPersonalizado(medida);
      const nuevoNombre = prompt('Ingrese el nuevo nombre para la medida:', nombreActual);
      
      if (nuevoNombre !== null && nuevoNombre.trim() !== '') {
        this.$set(this.nombresMedidasPersonalizados, medida, nuevoNombre.trim());
        await this.persistirCamposRendimientos({
          nombresMedidasPersonalizados: { ...this.nombresMedidasPersonalizados }
        });
        console.log('Nombre de medida actualizado correctamente');
      }
    },

    abrirModalNota() {
      this.nota = this.embarqueData?.notaRendimientos || '';
      this.mostrarModal = true;
    },

    async guardarNota() {
      await this.persistirCamposRendimientos({ notaRendimientos: this.nota });
      if (!this.embarqueData) {
        this.embarqueData = {};
      }
      this.embarqueData.notaRendimientos = this.nota;
      this.cerrarModal();
      console.log('Nota guardada correctamente');
    },

    cerrarModal() {
      this.mostrarModal = false;
      this.nota = '';
    },

    async guardarEstadoOculto() {
      await this.persistirCamposRendimientos({
        medidaOculta: { ...this.medidaOculta }
      });
      console.log('Estado de ocultación guardado correctamente');
    },

    async guardarEstadoAnalisis() {
      await this.persistirCamposRendimientos({
        analizarGanancia: { ...this.analizarGanancia },
        analizarGananciaCrudos: { ...this.analizarGananciaCrudos },
        analizarMaquilaGanancia: { ...this.analizarMaquilaGanancia },
        precioMaquila: { ...this.precioMaquila }
      });
      console.log('Estado de análisis de ganancia guardado correctamente');
    },



    irAGestionCostos() {
      this.$router.push({
        name: 'GestionCostos',
        params: { id: this.$route.params.id }
      });
    },

    irAPreparacion() {
      if (this.embarqueData && this.embarqueData.fecha) {
        // Convertir la fecha a string YYYY-MM-DD
        let fechaString = this.embarqueData.fecha;
        
        // Si ya es un string en formato correcto, usarlo directamente
        if (typeof fechaString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaString)) {
          console.log('Fecha ya está en formato YYYY-MM-DD:', fechaString);
        } else if (typeof fechaString === 'object' && fechaString.seconds) {
          // Es un Timestamp de Firebase, convertir a string usando UTC para evitar desfases
          const fechaDate = new Date(fechaString.seconds * 1000);
          const y = fechaDate.getUTCFullYear();
          const m = String(fechaDate.getUTCMonth() + 1).padStart(2, '0');
          const d = String(fechaDate.getUTCDate()).padStart(2, '0');
          fechaString = `${y}-${m}-${d}`;
          console.log('Fecha convertida de Timestamp usando UTC:', fechaString);
        } else if (fechaString instanceof Date) {
          // Es un objeto Date, convertir usando la zona horaria local
          const y = fechaString.getFullYear();
          const m = String(fechaString.getMonth() + 1).padStart(2, '0');
          const d = String(fechaString.getDate()).padStart(2, '0');
          fechaString = `${y}-${m}-${d}`;
          console.log('Fecha convertida de Date:', fechaString);
        } else if (typeof fechaString === 'string') {
          // Es string pero puede estar en otro formato (ISO, etc.)
          if (fechaString.includes('T')) {
            // Si es ISO string, extraer solo la parte de la fecha
            fechaString = fechaString.split('T')[0];
          }
          console.log('Fecha procesada desde string:', fechaString);
        }
        
        // Navegar a Preparación con la fecha del embarque y el ID del embarque como query parameters
        this.$router.push({
          name: 'Preparacion',
          query: { 
            fecha: fechaString,
            embarqueId: this.$route.params.id
          }
        });
        console.log('Navegando a Preparación con fecha:', fechaString);
      } else {
        // Si no hay fecha del embarque, ir sin parámetros
        this.$router.push({ name: 'Preparacion' });
        console.log('Navegando a Preparación sin fecha específica');
      }
    },



    formatearPrecio(precio) {
      if (!precio) return '0';
      const numeroRedondeado = Math.round(precio);
      // Formatear manualmente con comas para asegurar compatibilidad
      return numeroRedondeado.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    formatearNumero(numero) {
      if (!numero) return '0';
      // Redondear hacia abajo para eliminar decimales
      const numeroSinDecimales = Math.floor(numero);
      // Formatear manualmente con comas para asegurar compatibilidad
      return numeroSinDecimales.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    formatearFecha(fechaString) {
      if (!fechaString) return '';
      
      const fecha = this.normalizarFecha(fechaString);
      if (!fecha) return '';
      
      return fecha.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    },

    mostrarIndicadorPrecioReciente(medida) {
      if (!this.embarqueData || !this.embarqueData.fecha) return false;
      
      const fechaEmbarqueNormalizada = this.normalizarFecha(this.embarqueData.fecha);
      if (!fechaEmbarqueNormalizada) return false;
      
      const fechaEmbarqueStr = this.toLocalYMD(fechaEmbarqueNormalizada);
      const fechaHoy = this.toLocalYMD(new Date());
      const fechaEmbarqueObj = new Date(fechaEmbarqueStr);
      const fechaHoyObj = new Date(fechaHoy);
      const diasDiferencia = Math.floor((fechaHoyObj - fechaEmbarqueObj) / (1000 * 60 * 60 * 24));
      
      const embarqueEsReciente = diasDiferencia <= this.diasRecientes;
      const embarqueEsHoyOFuturo = fechaEmbarqueStr >= fechaHoy;
      
      return embarqueEsReciente || embarqueEsHoyOFuturo;
    },

    // Métodos para configuración de pesos
    abrirModalConfiguracion() {
      this.mostrarModalConfiguracion = true;
    },

    cerrarModalConfiguracion() {
      this.mostrarModalConfiguracion = false;
    },

    async guardarConfiguracion() {
      const payload = {
        pesoTaraCosto: Number(this.pesoTaraCosto) || 0,
        pesoTaraVenta: Number(this.pesoTaraVenta) || 0
      };

      await this.persistirCamposRendimientos(payload);

      console.log('Configuración de pesos guardada correctamente');
      this.cerrarModalConfiguracion();
      this.calcularGanancias();
    },

    // Determinar si se debe mostrar el detalle por cliente
    deberMostrarDetallePorCliente(talla) {
      const gananciaCrudo = this.gananciasCalculadasCrudos[talla];
      if (!gananciaCrudo || !gananciaCrudo.detallesPorCliente) return false;
      
      // Solo mostrar si hay más de un cliente
      if (gananciaCrudo.detallesPorCliente.length <= 1) return false;
      
      // Verificar si hay precios diferentes entre los clientes
      const precios = gananciaCrudo.detallesPorCliente.map(detalle => detalle.precioVenta);
      const preciosUnicos = new Set(precios);
      
      // Solo mostrar detalle si hay precios diferentes
      return preciosUnicos.size > 1;
    },

    // Calcular ganancia de maquila para una medida
    calcularGananciaMaquila(medida) {
      const totalEmbarcado = this.obtenerTotalEmbarcado(medida);
      const precioMaquila = Number(this.precioMaquila[medida]) || 0;
      return totalEmbarcado * precioMaquila;
    },



  },

  watch: {
    kilosCrudos: {
      handler() {
        this.guardarCambiosEnTiempoReal();
        // Recalcular ganancias cuando cambien los kilos crudos
        this.$nextTick(async () => {
          await this.calcularGanancias();
        });
      },
      deep: true
    },
    analizarGanancia: {
      handler() {
        // Recalcular ganancias cuando se active/desactive el análisis
        this.$nextTick(async () => {
          await this.calcularGanancias();
        });
      },
      deep: true
    },
    analizarGananciaCrudos: {
      handler(newValue, oldValue) {
        // Verificar si se activó algún análisis nuevo
        const seMadeChangio = Object.keys(newValue).some(talla => {
          return newValue[talla] && !oldValue[talla];
        });
        
        // Si se activó algún análisis nuevo, inicializar costos automáticamente
        if (seMadeChangio) {
          this.inicializarCostosPorMedida().then(() => {
            // Recalcular ganancias después de inicializar costos
            this.$nextTick(() => {
              this.calcularGananciasCrudos();
            });
          });
        } else {
          // Solo recalcular ganancias si no se activó nuevo análisis
          this.$nextTick(() => {
            this.calcularGananciasCrudos();
          });
        }
      },
      deep: true
    },

    // Watchers para configuración de pesos
    pesoTaraCosto: {
      handler() {
        if (this.embarqueData) {
          this.$nextTick(() => {
            this.calcularGanancias();
          });
        }
      }
    },

    pesoTaraVenta: {
      handler() {
        if (this.embarqueData) {
          this.$nextTick(() => {
            this.calcularGanancias();
          });
        }
      }
    },

    // Watchers para maquila ganancia
    analizarMaquilaGanancia: {
      handler() {
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    },

    precioMaquila: {
      handler() {
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    },



  },

  beforeDestroy() {
    if (this.guardarCambiosEnTiempoReal.cancel) {
      this.guardarCambiosEnTiempoReal.cancel();
    }
    window.removeEventListener('online', this.syncOfflineRendimientos);
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

.resumen-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.resumen-header {
  background-color: #343a40;
  color: white;
  padding: 10px 12px;
  border-radius: 4px;
  margin: 0;
}

.resumen-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.resumen-tab-button {
  border: 1px solid #343a40;
  background: #fff;
  color: #343a40;
  border-radius: 20px;
  padding: 8px 12px;
  font-size: 0.9rem;
  cursor: pointer;
}

.resumen-tab-button.activo {
  background: #343a40;
  color: #fff;
}

.resumen-dia-panel {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.resumen-dia-total {
  margin: 6px 0;
  font-weight: 600;
}

.resumen-dia-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  margin-bottom: 14px;
}

.resumen-dia-table th,
.resumen-dia-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.resumen-dia-table th {
  background: #f2f2f2;
}

.resumen-dia-estado {
  margin: 0;
  color: #4b5563;
}

.resumen-dia-estado.error {
  color: #b91c1c;
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

.btn-preparacion {
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
  margin-left: auto;
  margin-right: 10px;
}

.btn-preparacion:hover {
  background-color: #2980b9;
}

.btn-preparacion i {
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

.costo-final-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.costo-extra-indicator {
  font-size: 0.8em;
  color: #f39c12;
  font-weight: normal;
  margin-left: 5px;
}

@media (max-width: 768px) {
  .resumen-header-row {
    flex-direction: column;
    align-items: stretch;
  }

  .resumen-tabs {
    width: 100%;
  }

  .resumen-tab-button {
    width: 100%;
  }

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
  
  .costo-final-container {
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

  .btn-preparacion {
    margin-left: 0;
    margin-right: 0;
  }

  .btn-configuracion {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>
