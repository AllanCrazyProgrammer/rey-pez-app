<template>
  <div class="impresion-container">
    <h2>Vista previa de impresión - Pedido de Camarón Limpio</h2>
    <div class="scale-control">
      <label>Escala del contenido:</label>
      <input 
        type="range" 
        v-model="contentScale" 
        min="0.5" 
        max="2" 
        step="0.01"
        class="scale-slider"
      >
      <span class="scale-value">{{ (contentScale * 100).toFixed(0) }}%</span>
    </div>
    <div class="buttons-container">
      <button @click="generarPDF" class="btn-generar">
        <span class="icon">📄</span> Generar PDF
      </button>
      <button @click="$router.push('/procesos/pedidos')" class="btn-menu">
        Menú
      </button>
      <button @click="volverAEditar" class="btn-volver">
        Editar Pedido
      </button>
      <button @click="irASacadaDelDia" class="btn-sacada">
        Ir a Sacada del día
      </button>
      <button @click="irAPedidoCrudosDelDia" class="btn-crudos">
        Ir a Pedido de Crudos
      </button>
    </div>
    <div id="pdfPreview" class="pdf-preview">
      <div class="preview-page">
        <h3 class="cliente-header otilio-header">Otilio</h3>
        <table class="preview-table">
          <thead>
            <tr>
              <th>✓</th>
              <th>Kilos/Taras</th>
              <th>Medida</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in (pedidoOtilio || [])" :key="'otilio-'+index">
              <td><input type="checkbox" v-model="item.completado" @change="actualizarCompletado('otilio', index, item.completado)" class="pedido-checkbox"></td>
              <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
              <td>
                {{ item.medida }}
                <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
              </td>
              <td :class="{ 
                'text-blue': item.tipo === 'C/H20', 
                'text-blue compact': item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3'
              }">
                {{ item.tipo }}
                <span v-if="item.nota" class="nota-tag">{{ item.nota }}</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-cliente-row">
              <td></td>
              <td class="total-kilos-cliente">{{ calcularTotalKilosCliente(pedidoOtilio) }} kg</td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Vista previa de otros clientes -->
      <div class="preview-page">
        <!-- Joselito -->
        <div class="cliente-seccion" :class="{ compacto: pedidoJoselito && pedidoJoselito.length >= 5 }">
          <h4 class="cliente-header joselito-header" :class="{ compacto: pedidoJoselito && pedidoJoselito.length >= 5 }">Joselito</h4>
          <table class="preview-table" :class="{ compacto: pedidoJoselito && pedidoJoselito.length >= 5 }">
            <thead>
              <tr>
                <th>✓</th>
                <th>Kilos/Taras</th>
                <th>Medida</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in (pedidoJoselito || [])" :key="'joselito-'+index">
                <td><input type="checkbox" v-model="item.completado" @change="actualizarCompletado('joselito', index, item.completado)" class="pedido-checkbox"></td>
                <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                <td>
                  {{ item.medida }}
                  <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
                </td>
                <td :class="{ 
                  'text-blue': item.tipo === 'C/H20', 
                  'text-blue compact': item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3'
                }">
                  {{ item.tipo }}
                  <span v-if="item.nota" class="nota-tag">{{ item.nota }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-cliente-row">
                <td></td>
                <td class="total-kilos-cliente">{{ calcularTotalKilosCliente(pedidoJoselito) }} kg</td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Lorena -->
        <div class="cliente-seccion" :class="{ compacto: pedidoLorena && pedidoLorena.length >= 5 }">
          <h4 class="cliente-header lorena-header" :class="{ compacto: pedidoLorena && pedidoLorena.length >= 5 }">Lorena</h4>
          <table class="preview-table" :class="{ compacto: pedidoLorena && pedidoLorena.length >= 5 }">
            <thead>
              <tr>
                <th>✓</th>
                <th>Kilos/Taras</th>
                <th>Medida</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in (pedidoLorena || [])" :key="'lorena-'+index">
                <td><input type="checkbox" v-model="item.completado" @change="actualizarCompletado('lorena', index, item.completado)" class="pedido-checkbox"></td>
                <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                <td>
                  {{ item.medida }}
                  <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
                </td>
                <td :class="{ 
                  'text-blue': item.tipo === 'C/H20', 
                  'text-blue compact': item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3'
                }">
                  {{ item.tipo }}
                  <span v-if="item.nota" class="nota-tag">{{ item.nota }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-cliente-row">
                <td></td>
                <td class="total-kilos-cliente">{{ calcularTotalKilosCliente(pedidoLorena) }} kg</td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="bottom-section">
          <!-- Catarro -->
          <div class="bottom-cliente">
            <h4 class="cliente-header catarro-header">Catarro</h4>
            <table class="preview-table">
              <thead>
                <tr>
                  <th>✓</th>
                  <th>Kilos/Taras</th>
                  <th>Medida</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in (pedidoCatarro || [])" :key="'catarro-'+index">
                  <td><input type="checkbox" v-model="item.completado" @change="actualizarCompletado('catarro', index, item.completado)" class="pedido-checkbox"></td>
                  <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                  <td>
                    {{ item.medida }}
                    <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
                  </td>
                  <td :class="{ 
                    'text-blue': item.tipo === 'C/H20' || item.tipo === '.7 y .3', 
                    'text-blue compact': item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3'
                  }">
                    {{ item.tipo }}
                    <span v-if="item.nota" class="nota-tag">{{ item.nota }}</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-cliente-row">
                  <td></td>
                  <td class="total-kilos-cliente">{{ calcularTotalKilosCliente(pedidoCatarro) }} kg</td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Ozuna -->
          <div class="bottom-cliente">
            <h4 class="cliente-header ozuna-header">Ozuna</h4>
            <table class="preview-table">
              <thead>
                <tr>
                  <th>✓</th>
                  <th>Kilos/Taras</th>
                  <th>Medida</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in (pedidoOzuna || [])" :key="'ozuna-'+index">
                  <td><input type="checkbox" v-model="item.completado" @change="actualizarCompletado('ozuna', index, item.completado)" class="pedido-checkbox"></td>
                  <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                  <td>
                    {{ item.medida }}
                    <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
                  </td>
                  <td :class="{ 
                    'text-blue': item.tipo === 'C/H20' || item.tipo === '.7 y .3', 
                    'text-blue compact': item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3'
                  }">
                    {{ item.tipo }}
                    <span v-if="item.nota" class="nota-tag">{{ item.nota }}</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-cliente-row">
                  <td></td>
                  <td class="total-kilos-cliente">{{ calcularTotalKilosCliente(pedidoOzuna, true) }} kg</td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Clientes Temporales -->
      <div v-if="clientesTemporales && Object.keys(clientesTemporales).length > 0" class="preview-page">
        <div v-for="(cliente, id) in clientesTemporales" :key="id" class="cliente-seccion temporal">
          <h3 class="cliente-header temporal-header">{{ cliente.nombre }}</h3>
          <table class="preview-table">
            <thead>
              <tr>
                <th>✓</th>
                <th>Kilos/Taras</th>
                <th>Medida</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in (cliente.pedidos || [])" :key="'temp-'+id+'-'+index">
                <td><input type="checkbox" v-model="item.completado" class="pedido-checkbox"></td>
                <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                <td>
                  {{ item.medida }}
                  <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
                </td>
                <td :class="{ 
                  'text-blue': item.tipo === 'C/H20', 
                  'text-blue compact': item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3'
                }">
                  {{ item.tipo }}
                  <span v-if="item.nota" class="nota-tag">{{ item.nota }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-cliente-row">
                <td></td>
                <td class="total-kilos-cliente">{{ calcularTotalKilosCliente(cliente.pedidos) }} kg</td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Sección de resumen por medida (solo en vista previa) -->
      <div class="resumen-medidas">
        <div class="resumen-header-row">
          <h3 class="resumen-header">Resumen por Medida</h3>
          <div class="resumen-tabs" role="tablist" aria-label="Pestañas de resumen">
            <button
              type="button"
              class="resumen-tab-button"
              :class="{ activo: activeResumenTab === 'medida' }"
              @click="activeResumenTab = 'medida'"
            >
              Por Medida
            </button>
            <button
              type="button"
              class="resumen-tab-button"
              :class="{ activo: activeResumenTab === 'sacada-hoy' }"
              @click="activeResumenTab = 'sacada-hoy'"
            >
              Resumen del Día (hoy)
            </button>
            <button
              type="button"
              class="resumen-tab-button"
              :class="{ activo: showCalculadoraResumen }"
              @click="showCalculadoraResumen = !showCalculadoraResumen"
            >
              {{ showCalculadoraResumen ? 'Ocultar Calculadora' : 'Calculadora' }}
            </button>
          </div>
        </div>
        <ResumenCalculadora
          v-if="showCalculadoraResumen"
          class="resumen-calculadora-panel"
        />
        <table v-if="activeResumenTab === 'medida'" class="resumen-table">
          <thead>
            <tr>
              <th>Medida</th>
              <th>Total Kilos</th>
              <th>Rendimientos</th>
              <th>Masters</th>
              <th>Cajas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(medida, index) in calcularTotalesPorMedida()" :key="index">
              <td data-label="Medida">{{ medida.medida }}</td>
              <td data-label="Total Kilos" class="total-kilos-cell">
                <div class="kilos-container">
                  <div class="kilos-column">
                    <span 
                      class="total-kilos-clickeable" 
                      @click="abrirModalKilosRefrigerados(medida)"
                      :title="'Click para agregar kilos refrigerados'"
                    >
                      {{ medida.total }} kg
                    </span>
                  </div>
                  <div v-if="kilosRefrigerados[medida.medida]" class="kilos-column kilos-refrigerados-column">
                    <span class="kilos-refrigerados">
                      🧊 {{ kilosRefrigerados[medida.medida] }} kg
                    </span>
                  </div>
                  <div v-if="kilosRefrigerados[medida.medida]" class="kilos-column kilos-faltantes-column">
                    <span class="kilos-faltantes" :class="{ 
                      'suficientes': obtenerKilosFaltantes(medida) <= 0,
                      'sobra': obtenerKilosFaltantes(medida) < 0 
                    }">
                      <template v-if="obtenerKilosFaltantes(medida) > 0">
                        Faltan: {{ obtenerKilosFaltantes(medida) }} kg
                      </template>
                      <template v-else-if="obtenerKilosFaltantes(medida) < 0">
                        Sobra: {{ Math.abs(obtenerKilosFaltantes(medida)) }} kg
                      </template>
                      <template v-else>
                        Exactos: 0 kg
                      </template>
                    </span>
                  </div>
                </div>
              </td>
              <td data-label="Rendimientos">
                <div class="rendimientos-column">
                  <input 
                    type="number" 
                    step="0.01"
                    v-model="rendimientos[medida.medida]"
                    @input="calcularRendimiento(medida)"
                    placeholder="1.00"
                    class="rendimiento-box"
                  >
                  <div v-if="rendimientos[medida.medida]" class="rendimiento-total">
                    {{ Math.round(medida.total * rendimientos[medida.medida]) }}
                  </div>
                </div>
              </td>
              <td data-label="Masters">
                <div v-if="esMedidaGranja(medida.medida)" class="checkbox-group">
                  <label>
                    <input 
                      type="radio" 
                      :name="'master-' + medida.medida"
                      :checked="divisores[medida.medida] === 20"
                      @click="toggleDivisor(medida, 20)"
                    >
                    <span>20</span>
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      :name="'master-' + medida.medida"
                      :checked="divisores[medida.medida] === 22"
                      @click="toggleDivisor(medida, 22)"
                    >
                    <span>22</span>
                  </label>
                </div>
              </td>
              <td data-label="Cajas">
                <template v-if="rendimientos[medida.medida]">
                  <span v-if="esMedidaGranja(medida.medida) && divisores[medida.medida]" class="cajas-result" :class="{ 'cajas-faltantes': kilosRefrigerados[medida.medida] > 0 }">
                    {{ Math.round((Math.max(0, obtenerKilosFaltantes(medida)) * rendimientos[medida.medida]) / divisores[medida.medida]) }}
                  </span>
                  <span v-else class="cajas-result" :class="{ 'cajas-faltantes': kilosRefrigerados[medida.medida] > 0 }">
                    {{ Math.round(Math.max(0, obtenerKilosFaltantes(medida)) * rendimientos[medida.medida]) }} kg
                  </span>
                </template>
              </td>
            </tr>
            <tr class="total-row">
              <td>Total:</td>
              <td>{{ calcularTotalKilos() }} kg</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="resumen-dia-panel">
          <p v-if="resumenSacadaHoy.loading" class="resumen-dia-estado">
            Cargando resumen del día...
          </p>
          <p v-else-if="resumenSacadaHoy.error" class="resumen-dia-estado error">
            {{ resumenSacadaHoy.error }}
          </p>
          <template v-else-if="resumenSacadaHoy.disponible">
            <p class="resumen-dia-total">Total Entradas: {{ formatDecimal(resumenSacadaHoy.totalEntradas) }} kg</p>
            <p class="resumen-dia-total">Total Salidas: {{ formatDecimal(resumenSacadaHoy.totalSalidas) }} kg</p>

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
                  <td>{{ formatDecimal(item.total) }}</td>
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
                  <td>{{ formatDecimal(fila.total) }}</td>
                </tr>
              </tbody>
            </table>
          </template>
          <p v-else class="resumen-dia-estado">
            No hay sacadas registradas para el día de hoy.
          </p>
        </div>
      </div>
    </div>

    <!-- Modal de Kilos Refrigerados -->
    <KilosRefrigeradosModal
      :mostrar="modalKilosVisible"
      :medida="medidaSeleccionada"
      :total-kilos="totalKilosSeleccionados"
      :kilos-refrigerados-iniciales="kilosRefrigerados[medidaSeleccionada] || 0"
      @cerrar="cerrarModalKilosRefrigerados"
      @guardar="guardarKilosRefrigerados"
    />
  </div>
</template>

<script>
import pdfMake from 'pdfmake/build/pdfmake'
import KilosRefrigeradosModal from '@/components/KilosRefrigeradosModal.vue'
import ResumenCalculadora from '@/components/ResumenCalculadora.vue'
import { db } from '@/firebase'
import { doc, updateDoc, Timestamp, collection, getDocs, query, where } from 'firebase/firestore'

const fonts = {
  Roboto: {
    normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
    bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
    italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
    bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
  }
}

pdfMake.fonts = fonts

export default {
  name: 'PedidoLimpioImpresion',
  components: {
    KilosRefrigeradosModal,
    ResumenCalculadora
  },
  props: {
    fecha: {
      type: String,
      required: true
    },
    id: {
      type: String,
      default: ''
    },
    pedidoOtilio: {
      type: Array,
      required: true
    },
    pedidoCatarro: {
      type: Array,
      required: true
    },
    pedidoJoselito: {
      type: Array,
      required: true
    },
    pedidoLorena: {
      type: Array,
      required: true
    },
    pedidoOzuna: {
      type: Array,
      required: true
    },
    clientesTemporales: {
      type: Object,
      default: () => ({})
    },
    rendimientosGuardados: {
      type: Object,
      default: () => ({})
    },
    divisoresGuardados: {
      type: Object,
      default: () => ({})
    },
    completadosGuardados: {
      type: Object,
      default: () => ({})
    },
    kilosRefrigeradosGuardados: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      rendimientos: this.rendimientosGuardados || {},
      divisores: this.divisoresGuardados || {},
      contentScale: 1,
      completados: this.completadosGuardados || {},
      kilosRefrigerados: this.kilosRefrigeradosGuardados || {},
      modalKilosVisible: false,
      medidaSeleccionada: '',
      totalKilosSeleccionados: 0,
      showCalculadoraResumen: false,
      editando: false,
      pedidoId: null,
      activeResumenTab: 'medida',
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
  created() {
    // Inicializar los estados de completado si no existen
    if (!this.completados.otilio) this.completados.otilio = {};
    if (!this.completados.catarro) this.completados.catarro = {};
    if (!this.completados.joselito) this.completados.joselito = {};
    if (!this.completados.lorena) this.completados.lorena = {};
    if (!this.completados.ozuna) this.completados.ozuna = {};
    
    // Inicializar los estados desde las props
    this.rendimientos = { ...this.rendimientosGuardados };
    this.divisores = { ...this.divisoresGuardados };
    this.completados = { ...this.completadosGuardados };
    this.kilosRefrigerados = { ...this.kilosRefrigeradosGuardados };
    if (!this.completados.otilio) this.$set(this.completados, 'otilio', {});
    if (!this.completados.catarro) this.$set(this.completados, 'catarro', {});
    if (!this.completados.joselito) this.$set(this.completados, 'joselito', {});
    if (!this.completados.lorena) this.$set(this.completados, 'lorena', {});
    if (!this.completados.ozuna) this.$set(this.completados, 'ozuna', {});
    
    // Si tenemos ID, activar modo edición para permitir guardado automático
    if (this.id) {
      this.editando = true;
      this.pedidoId = this.id;
    }
    
    // Aplicar estados guardados a los pedidos
    this.aplicarEstadosCompletado();
    this.cargarResumenSacadaHoy();
  },
  methods: {
    formatDecimal(value) {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
    },
    async cargarResumenSacadaHoy() {
      this.resumenSacadaHoy.loading = true;
      this.resumenSacadaHoy.error = '';

      try {
        const ahora = new Date();
        const inicio = new Date(ahora);
        inicio.setHours(0, 0, 0, 0);
        const fin = new Date(ahora);
        fin.setHours(23, 59, 59, 999);

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
          error: 'No se pudo cargar el resumen de sacadas del día de hoy.'
        };
      }
    },
    itemTieneDatos(item) {
      if (!item) return false;
      const kilos = Number(item.kilos);
      const tieneKilos = item.kilos !== null && item.kilos !== '' && !Number.isNaN(kilos) && kilos !== 0;
      return tieneKilos;
    },
    obtenerItemsConDatos(items) {
      if (!Array.isArray(items)) return [];
      return items.filter(item => this.itemTieneDatos(item));
    },
    clienteTieneDatos(items) {
      return this.obtenerItemsConDatos(items).length > 0;
    },
    obtenerClientesTemporalesConDatos() {
      if (!this.clientesTemporales || typeof this.clientesTemporales !== 'object') return [];
      return Object.entries(this.clientesTemporales)
        .filter(([_, cliente]) => this.clienteTieneDatos(cliente?.pedidos))
        .map(([id, cliente]) => ({ id, ...cliente }));
    },
    async irASacadaDelDia() {
      try {
        // Buscar si existe una sacada para la fecha del pedido
        const inicio = new Date(this.fecha + 'T00:00:00')
        const fin = new Date(this.fecha + 'T23:59:59.999')
        const q = query(
          collection(db, 'sacadas'),
          where('fecha', '>=', inicio),
          where('fecha', '<=', fin)
        )
        const snap = await getDocs(q)
        const queryParams = { pedidoFecha: this.fecha }
        if (this.id) queryParams.pedidoId = this.id
        queryParams.pedidoTipo = 'limpio'

        if (!snap.empty) {
          const sacadaId = snap.docs[0].id
          this.$router.push({ name: 'DetalleSacada', params: { id: sacadaId }, query: queryParams })
        } else {
          // No existe: ir a nueva sacada con fecha preseleccionada
          this.$router.push({ name: 'NuevaSacada', query: { ...queryParams, fecha: this.fecha } })
        }
      } catch (err) {
        console.error('Error al navegar a la sacada del día:', err)
        this.$router.push('/sacadas')
      }
    },
    async irAPedidoCrudosDelDia() {
      try {
        const q = query(
          collection(db, 'pedidos'),
          where('tipo', '==', 'crudo'),
          where('fecha', '==', this.fecha)
        )
        const snap = await getDocs(q)
        if (!snap.empty) {
          const pedidoId = snap.docs[0].id
          this.$router.push({
            path: '/procesos/pedidos/crudo',
            query: {
              edit: 'true',
              id: pedidoId,
              fecha: this.fecha,
              origen: 'limpio',
              limpioId: this.id || '',
              limpioFecha: this.fecha
            }
          })
        } else {
          this.$router.push({
            path: '/procesos/pedidos/crudo',
            query: {
              fecha: this.fecha,
              origen: 'limpio',
              limpioId: this.id || '',
              limpioFecha: this.fecha
            }
          })
        }
      } catch (err) {
        console.error('Error al navegar al pedido de crudos del día:', err)
        this.$router.push('/procesos/pedidos/crudo')
      }
    },
    volverAEditar() {
      if (this.id) {
        const target = {
          path: '/procesos/pedidos/limpio',
          query: { edit: 'true', id: this.id, fecha: this.fecha }
        };

        // Si ya estamos en el mismo destino (vista de edición) dentro del mismo componente,
        // solo emitimos el evento para volver sin hacer navegación redundante
        const isSameRoute =
          this.$route.path === target.path &&
          this.$route.query.edit === target.query.edit &&
          this.$route.query.id === target.query.id &&
          this.$route.query.fecha === target.query.fecha;

        if (isSameRoute || this.$route.name === 'PedidosLimpio') {
          this.$emit('volver');
          return;
        }

        this.$router.push(target).catch((err) => {
          // Ignorar navegación duplicada y solo emitir volver
          if (err && err.name === 'NavigationDuplicated') {
            this.$emit('volver');
          }
        });
      } else {
        this.$router.push('/procesos/pedidos');
      }
    },
    aplicarEstadosCompletado() {
      // Aplicar estados a Otilio
      if (this.pedidoOtilio && Array.isArray(this.pedidoOtilio)) {
        this.pedidoOtilio.forEach((item, index) => {
          if (this.completados.otilio && this.completados.otilio[index] !== undefined) {
            this.$set(item, 'completado', this.completados.otilio[index]);
          }
        });
      }
       
      // Aplicar estados a Catarro
      if (this.pedidoCatarro && Array.isArray(this.pedidoCatarro)) {
        this.pedidoCatarro.forEach((item, index) => {
          if (this.completados.catarro && this.completados.catarro[index] !== undefined) {
            this.$set(item, 'completado', this.completados.catarro[index]);
          }
        });
      }
      
      // Aplicar estados a Joselito
      if (this.pedidoJoselito && Array.isArray(this.pedidoJoselito)) {
        this.pedidoJoselito.forEach((item, index) => {
          if (this.completados.joselito && this.completados.joselito[index] !== undefined) {
            this.$set(item, 'completado', this.completados.joselito[index]);
          }
        });
      }
    
    // Aplicar estados a Lorena
    if (this.pedidoLorena && Array.isArray(this.pedidoLorena)) {
      this.pedidoLorena.forEach((item, index) => {
        if (this.completados.lorena && this.completados.lorena[index] !== undefined) {
          this.$set(item, 'completado', this.completados.lorena[index]);
        }
      });
    }
    
    // Aplicar estados a Ozuna
      if (this.pedidoOzuna && Array.isArray(this.pedidoOzuna)) {
        this.pedidoOzuna.forEach((item, index) => {
          if (this.completados.ozuna && this.completados.ozuna[index] !== undefined) {
            this.$set(item, 'completado', this.completados.ozuna[index]);
          }
        });
      }
    },
    actualizarCompletado(cliente, index, valor) {
      if (!this.completados[cliente]) {
        this.$set(this.completados, cliente, {});
      }
      this.$set(this.completados[cliente], index, valor);
      
      // Si estamos en modo edición, guardar directamente en Firebase
      if (this.editando && this.pedidoId) {
        updateDoc(doc(db, 'pedidos', this.pedidoId), {
          completados: this.completados
        }).catch(error => {
          console.error('Error al actualizar estados completados:', error);
        });
      }
      
      // También emitir el evento para compatibilidad
      this.$emit('actualizar-completados', this.completados);
    },
    obtenerDiaSemana(fecha) {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const date = new Date(fecha);
      return dias[date.getDay()];
    },
    generarTablaCliente(items, fontSize = 16) {
      const itemsConDatos = this.obtenerItemsConDatos(items);
      if (itemsConDatos.length === 0) return null;

      const reducirEspacio = itemsConDatos.length > 7;
      const paddingValue = reducirEspacio ? 2 : 16;

      const body = itemsConDatos.map(item => [
        { 
          text: item.kilos ? (item.esTara ? [
            { text: item.kilos.toString(), fontSize: fontSize * 2 },
            { text: 'T', fontSize: fontSize * 1.2, italics: true, alignment: 'right', margin: [0, -8, 0, 0] }
          ] : { text: item.kilos.toString(), fontSize: fontSize * 2 }) : '', 
          alignment: 'center',
          margin: [0, -2, 0, -2]
        },
        { 
          stack: [
            { text: item.medida || '', fontSize: fontSize * 2 },
            item.proveedor ? { 
              text: item.proveedor, 
              fontSize: fontSize * 1.1,
              color: '#FFFFFF',
              background: '#FF0000',
              margin: [0, 2, 0, 0],
              padding: [2, 1],
              alignment: 'center'
            } : ''
          ],
          margin: [0, 2, 0, 2]
        },
        { 
          stack: [
            { 
              text: [
                { 
                  text: item.tipo || '', 
                  fontSize: fontSize * 2,
                  color: (item.tipo === 'C/H20' || item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3') ? '#0000FF' : undefined,
                  margin: (item.tipo === '1.35 y .15' || item.tipo === '1.5 y .3') ? [0, 0, 0, 0] : [0, 2, 0, 2]
                }
              ]
            },
            item.nota ? { 
              text: item.nota, 
              fontSize: fontSize * 1.1,
              margin: [0, 1, 0, 0],
              padding: [1, 1],
              bold: true,
              background: '#FF0000',
              color: '#FFFFFF'
            } : ''
          ],
          margin: [0, 2, 0, 2]
        }
      ]);

      return {
        table: {
          widths: ['30%', '35%', '35%'],
          body
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => paddingValue,
          paddingBottom: () => paddingValue
        }
      };
    },
    generarPDF() {
      const tieneOtilio = this.clienteTieneDatos(this.pedidoOtilio);
      const tieneJoselito = this.clienteTieneDatos(this.pedidoJoselito);
      const tieneLorena = this.clienteTieneDatos(this.pedidoLorena);
      const tieneCatarro = this.clienteTieneDatos(this.pedidoCatarro);
      const tieneOzuna = this.clienteTieneDatos(this.pedidoOzuna);
      const clientesTemporalesConDatos = this.obtenerClientesTemporalesConDatos();

      const necesitaCompacto =
        (tieneJoselito && this.obtenerItemsConDatos(this.pedidoJoselito).length >= 5) ||
        (tieneLorena && this.obtenerItemsConDatos(this.pedidoLorena).length >= 5);
      const espaciadoReducido = necesitaCompacto ? 0.5 : 30;
      const fontSizeJoselito = necesitaCompacto ? 22 : 26;
      const fontSizeInferior = necesitaCompacto ? 24 : 36;

      const escala = this.contentScale;
      const fontSizeBase = {
        otilio: 48 * escala,
        joselito: (necesitaCompacto ? 24 : 48) * escala,
        inferior: fontSizeInferior * escala,
        tabla: 26 * escala,
        tablaJoselito: fontSizeJoselito * escala
      };
      
      const content = [];

      if (tieneOtilio) {
        const seccionOtilio = [
          {
            columns: [
              {
                text: 'OTILIO',
                style: 'clienteHeader',
                fontSize: fontSizeBase.otilio,
                width: '*',
                alignment: 'left',
                background: '#FFEB3B'
              },
              {
                text: this.fecha,
                fontSize: fontSizeBase.otilio * 0.75,
                italics: true,
                width: 'auto',
                alignment: 'right'
              }
            ],
            margin: [0, 0, 0, 10 * escala]
          },
          this.generarTablaCliente(this.pedidoOtilio, fontSizeBase.tabla)
        ];
        content.push(...seccionOtilio);

        const hayMasContenido = tieneJoselito || tieneLorena || tieneCatarro || tieneOzuna || clientesTemporalesConDatos.length > 0;
        if (hayMasContenido) {
          content.push({ text: '', pageBreak: 'after' });
        }
      }

      const seccionesCentrales = [];

      if (tieneJoselito) {
        seccionesCentrales.push(
          {
            text: 'JOSELITO',
            style: 'clienteHeader',
            fontSize: fontSizeBase.joselito,
            margin: [0, 0, 0, necesitaCompacto ? 0.5 : 0],
            background: '#2196F3'
          },
          this.generarTablaCliente(this.pedidoJoselito, fontSizeBase.tablaJoselito),
          { text: '', margin: [0, espaciadoReducido, 0, 0] }
        );
      }

      if (tieneLorena) {
        seccionesCentrales.push(
          {
            text: 'LORENA',
            style: 'clienteHeader',
            fontSize: fontSizeBase.inferior,
            margin: [0, 0, 0, necesitaCompacto ? 1 : 0],
            background: '#e67e22'
          },
          this.generarTablaCliente(this.pedidoLorena, fontSizeBase.tablaJoselito),
          { text: '', margin: [0, espaciadoReducido, 0, 0] }
        );
      }

      const columnasInferiores = [];
      if (tieneCatarro) {
        columnasInferiores.push({
          stack: [
            {
              text: 'CATARRO',
              style: 'clienteHeader',
              fontSize: fontSizeBase.inferior,
              margin: [0, 0, 0, necesitaCompacto ? 1 : 0],
              background: '#FF5252'
            },
            this.generarTablaClienteReducido(this.pedidoCatarro, fontSizeBase.tablaJoselito)
          ],
          width: tieneCatarro && tieneOzuna ? '47%' : '*'
        });
      }

      if (tieneCatarro && tieneOzuna) {
        columnasInferiores.push({
          stack: [{
            canvas: [{
              type: 'line',
              x1: 10,
              y1: 0,
              x2: 10,
              y2: necesitaCompacto ? 30 : 150,
              lineWidth: necesitaCompacto ? 0.3 : 1.5
            }]
          }],
          width: '6%',
          margin: [0, necesitaCompacto ? 2 : 20, 0, 0]
        });
      }

      if (tieneOzuna) {
        columnasInferiores.push({
          stack: [
            {
              text: 'OZUNA',
              style: 'clienteHeader',
              fontSize: fontSizeBase.inferior,
              margin: [0, 0, 0, necesitaCompacto ? 1 : 0],
              background: '#4CAF50'
            },
            this.generarTablaClienteReducido(this.pedidoOzuna, fontSizeBase.tablaJoselito)
          ],
          width: tieneCatarro && tieneOzuna ? '47%' : '*'
        });
      }

      if (columnasInferiores.length > 0) {
        seccionesCentrales.push({ columns: columnasInferiores });
      }

      if (seccionesCentrales.length > 0) {
        content.push(...seccionesCentrales);
        if (clientesTemporalesConDatos.length > 0) {
          content.push({ text: '', pageBreak: 'after' });
        }
      }

      if (clientesTemporalesConDatos.length > 0) {
        clientesTemporalesConDatos.forEach(cliente => {
          const tabla = this.generarTablaCliente(cliente.pedidos, 22);
          if (!tabla) return;
          content.push(
            {
              text: cliente.nombre.toUpperCase(),
              style: 'clienteHeader',
              fontSize: 36,
              margin: [0, 0, 0, 10],
              background: '#95a5a6'
            },
            tabla,
            { text: '', margin: [0, 20, 0, 20] }
          );
        });
      }

      if (content.length === 0) {
        content.push({
          text: 'No hay productos para generar el PDF.',
          alignment: 'center',
          margin: [0, 40, 0, 0],
          fontSize: 18
        });
      }

      const docDefinition = {
        pageSize: 'letter',
        pageOrientation: 'portrait',
        pageMargins: [10, 10, 10, 10],
        content,
        styles: {
          header: {
            alignment: 'center',
            margin: [0, 0, 0, 20],
            bold: true
          },
          clienteHeader: {
            bold: true,
            alignment: 'center'
          },
          tableHeader: {
            bold: true,
            fontSize: 14,
            color: 'black',
            alignment: 'center'
          }
        },
        defaultStyle: {
          font: 'Roboto'
        }
      };

      pdfMake.createPdf(docDefinition).download('Ped-limpio-' + this.fecha + '.pdf');
    },
    generarTablaClienteReducido(items, fontSize = 16) {
      const itemsConDatos = this.obtenerItemsConDatos(items);
      if (itemsConDatos.length === 0) return null;

      const body = itemsConDatos.map(item => [
        { 
          text: item.kilos ? (item.esTara ? [
            { text: item.kilos.toString(), fontSize: fontSize * 2 },
            { text: 'T', fontSize: fontSize * 1.2, italics: true, alignment: 'right', margin: [0, -8, 0, 0] }
          ] : { text: item.kilos.toString(), fontSize: fontSize * 2 }) : '', 
          alignment: 'center',
          margin: [0, -2, 0, -2]
        },
        { 
          stack: [
            { text: item.medida || '', fontSize: fontSize * 2 },
            (item.tipo && item.tipo !== 'S/H20') ? { 
              text: item.tipo, 
              fontSize: fontSize * 1.5,
              color: '#0000FF',
              bold: true,
              margin: [0, 2, 0, 2]
            } : '',
            item.proveedor ? { 
              text: item.proveedor, 
              fontSize: fontSize * 1.1,
              color: '#FFFFFF',
              background: '#FF0000',
              padding: [2, 1],
              alignment: 'center'
            } : '',
            item.nota ? { 
              text: item.nota, 
              fontSize: fontSize * 0.9,
              padding: [1, 0],
              bold: true,
              background: '#FF0000',
              color: '#FFFFFF'
            } : ''
          ],
          margin: [0, 1, 0, 1]
        }
      ]);

      return {
        table: {
          widths: ['45%', '55%'],
          body
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 1,
          paddingRight: () => 1,
          paddingTop: () => 1,
          paddingBottom: () => 1
        }
      };
    },
    obtenerNombreCliente(clienteId) {
      // Convertir el ID a un nombre más presentable
      return clienteId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    },
    calcularTotalesTemporales(clienteId) {
      if (!this.clientesTemporales[clienteId]) return { tarasTotal: '0', kilosTotal: '0' };

      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;
      let kilos135 = 0;
      let kilosTaras135 = 0;
      let kilos15y3 = 0;
      let kilosTaras15y3 = 0;
      let kilos7y3 = 0;

      this.clientesTemporales[clienteId].forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else if (item.tipo === '1.35 y .15') {
              kilosTaras135 += Number(item.kilos) * 30;
            } else if (item.tipo === '1.5 y .3') {
              kilosTaras15y3 += Number(item.kilos) * 30;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            kilos135 += Number(item.kilos) * 1.35;
          } else if (item.tipo === '1.5 y .3') {
            kilos15y3 += Number(item.kilos) * 1.5;
          } else if (item.tipo === '.7 y .3') {
            kilos7y3 += Number(item.kilos) * 0.7;
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 27;
      const tarasPor135 = kilos135 / (1.35 * 25);
      const tarasPor15y3 = kilos15y3 / (1.5 * 25);
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos + tarasPor135 + tarasPor15y3);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras + kilosTaras135 + kilosTaras15y3;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O + kilos135 + kilos15y3 + kilos7y3);

      return {
        tarasTotal: tarasTotal.toString(),
        kilosTotal: kilosTotal.toString()
      };
    },
    calcularTotalesPorMedida() {
      const medidasMap = new Map();
      
      const procesarPedido = (pedido, esPedidoOzuna = false) => {
        if (!pedido || !Array.isArray(pedido)) return;
        pedido.forEach(item => {
          if (!item.medida) return;
          
          const medida = item.medida;
          // Para Ozuna, si es maquila (esMaquila es true), agregamos el sufijo "Maq"
          const key = esPedidoOzuna && item.esMaquila 
            ? (medida.toLowerCase().trim() + '-maq')
            : medida.toLowerCase().trim();
          
          if (!medidasMap.has(key)) {
            medidasMap.set(key, {
              medida: esPedidoOzuna && item.esMaquila 
                ? medida + ' Maq'
                : medida,
              total: 0
            });
          }
          
          const registro = medidasMap.get(key);
          const kilos = Number(item.kilos) || 0;
          
          if (item.esTara) {
            // Procesar taras
            if (item.tipo === 'C/H20') {
              registro.total += kilos * 30 * 0.65; // Tara con agua
            } else if (item.tipo === '1.35 y .15') {
              registro.total += kilos * 30; // Tara con factor 1.35
            } else if (item.tipo === '1.5 y .3') {
              registro.total += kilos * 30; // Tara con factor 1.5
            } else {
              registro.total += kilos * 30; // Tara normal
            }
          } else {
            // Procesar kilos directos
            if (item.tipo === 'C/H20') {
              registro.total += kilos * 0.65; // Kilos con agua
            } else if (item.tipo === '1.35 y .15') {
              registro.total += kilos * 1.35; // Kilos con factor 1.35
            } else if (item.tipo === '1.5 y .3') {
              registro.total += kilos * 1.5; // Kilos con factor 1.5
            } else if (esPedidoOzuna && item.tipo === '.7 y .3') {
              registro.total += kilos * 0.7; // Para Ozuna, kilos con factor 0.7
            } else {
              registro.total += kilos; // Kilos normales
            }
          }
        });
      };

      // Procesar todos los pedidos regulares
      procesarPedido(this.pedidoOtilio);
      procesarPedido(this.pedidoCatarro);
      procesarPedido(this.pedidoJoselito);
      procesarPedido(this.pedidoLorena);
      procesarPedido(this.pedidoOzuna, true); // Indicamos que es pedido de Ozuna
      
      // Procesar clientes temporales
      if (this.clientesTemporales && typeof this.clientesTemporales === 'object') {
        Object.values(this.clientesTemporales).forEach(cliente => {
          if (cliente && cliente.pedidos && Array.isArray(cliente.pedidos)) {
            procesarPedido(cliente.pedidos);
          }
        });
      }

      // Convertir el mapa a un array ordenado
      return Array.from(medidasMap.values())
        .map(value => ({
          medida: value.medida,
          total: Math.round(value.total)
        }))
        .sort((a, b) => {
          // Primero ordenamos por medida base (sin el sufijo Maq)
          const medidaA = a.medida.replace(' Maq', '');
          const medidaB = b.medida.replace(' Maq', '');
          if (medidaA === medidaB) {
            // Si las medidas base son iguales, ponemos primero la que no es maquila
            return a.medida.includes('Maq') ? 1 : -1;
          }
          return medidaA.localeCompare(medidaB);
        });
    },
    calcularRendimiento(medida) {
      // Asegurarse de que el valor sea numérico
      const valor = parseFloat(this.rendimientos[medida.medida]);
      if (isNaN(valor)) {
        this.rendimientos[medida.medida] = '';
      }
      
      // Si estamos en modo edición, guardar directamente en Firebase
      if (this.editando && this.pedidoId) {
        updateDoc(doc(db, 'pedidos', this.pedidoId), {
          rendimientos: this.rendimientos
        }).catch(error => {
          console.error('Error al actualizar rendimientos:', error);
        });
      }
      
      // También emitir el evento para compatibilidad
      this.$emit('actualizar-rendimientos', this.rendimientos);
    },
    toggleDivisor(medida, valor) {
      // Si el valor seleccionado es el mismo que ya está, lo deseleccionamos
      if (this.divisores[medida.medida] === valor) {
        this.$set(this.divisores, medida.medida, null);
      } else {
        // Si no, establecemos el nuevo valor
        this.$set(this.divisores, medida.medida, valor);
      }
      
      // Si estamos en modo edición, guardar directamente en Firebase
      if (this.editando && this.pedidoId) {
        updateDoc(doc(db, 'pedidos', this.pedidoId), {
          divisores: this.divisores
        }).catch(error => {
          console.error('Error al actualizar divisores:', error);
        });
      }
      
      // También emitir el evento para compatibilidad
      this.$emit('actualizar-divisores', this.divisores);
    },
    esMedidaGranja(medida) {
      // Verifica si la medida comienza con un número
      return /^\d/.test(medida);
    },
    calcularTotalKilos() {
      const totales = this.calcularTotalesPorMedida();
      const sumaTotal = totales.reduce((sum, medida) => sum + medida.total, 0);
      return sumaTotal.toLocaleString(); // Formateamos con comas para mejor legibilidad
    },
    abrirModalKilosRefrigerados(medida) {
      this.medidaSeleccionada = medida.medida;
      this.totalKilosSeleccionados = medida.total;
      this.modalKilosVisible = true;
    },
    cerrarModalKilosRefrigerados() {
      this.modalKilosVisible = false;
      this.medidaSeleccionada = '';
      this.totalKilosSeleccionados = 0;
    },
    guardarKilosRefrigerados(datos) {
      this.$set(this.kilosRefrigerados, datos.medida, datos.kilosRefrigerados);
      
      // Si estamos en modo edición, guardar directamente en Firebase
      if (this.editando && this.pedidoId) {
        updateDoc(doc(db, 'pedidos', this.pedidoId), {
          kilosRefrigerados: this.kilosRefrigerados
        }).catch(error => {
          console.error('Error al actualizar kilos refrigerados:', error);
        });
      }
      
      // También emitir el evento para compatibilidad
      this.$emit('actualizar-kilos-refrigerados', this.kilosRefrigerados);
    },
    obtenerKilosFaltantes(medida) {
      const refrigerados = this.kilosRefrigerados[medida.medida] || 0;
      return medida.total - refrigerados;
    },
    calcularTotalKilosCliente(pedido, esOzuna = false) {
      if (!pedido || !Array.isArray(pedido)) return 0;
      
      let total = 0;
      pedido.forEach(item => {
        const kilos = Number(item.kilos) || 0;
        if (kilos === 0) return;
        
        if (item.esTara) {
          // Procesar taras
          if (item.tipo === 'C/H20') {
            total += kilos * 30 * 0.65;
          } else if (item.tipo === '1.35 y .15') {
            total += kilos * 30;
          } else if (item.tipo === '1.5 y .3') {
            total += kilos * 30;
          } else {
            total += kilos * 30;
          }
        } else {
          // Procesar kilos directos
          if (item.tipo === 'C/H20') {
            total += kilos * 0.65;
          } else if (item.tipo === '1.35 y .15') {
            total += kilos * 1.35;
          } else if (item.tipo === '1.5 y .3') {
            total += kilos * 1.5;
          } else if (esOzuna && item.tipo === '.7 y .3') {
            total += kilos * 0.7;
          } else {
            total += kilos;
          }
        }
      });
      
      return Math.round(total);
    }
  },
  watch: {
    // Observar cambios en las props para actualizar los estados locales
    rendimientosGuardados: {
      handler(newVal) {
        this.rendimientos = { ...newVal };
      },
      deep: true,
      immediate: true
    },
    divisoresGuardados: {
      handler(newVal) {
        this.divisores = { ...newVal };
      },
      deep: true,
      immediate: true
    },
    completadosGuardados: {
      handler(newVal) {
        this.completados = { ...newVal };
        this.aplicarEstadosCompletado();
      },
      deep: true,
      immediate: true
    },
    kilosRefrigeradosGuardados: {
      handler(newVal) {
        this.kilosRefrigerados = { ...newVal };
      },
      deep: true,
      immediate: true
    },
    // Observar cambios en los pedidos para actualizar los estados completados
    pedidoOtilio: {
      deep: true,
      handler(newVal) {
        if (newVal && Array.isArray(newVal)) {
          newVal.forEach((item, index) => {
            if (item && item.completado !== undefined) {
              this.actualizarCompletado('otilio', index, item.completado);
            }
          });
        }
      }
    },
    pedidoJoselito: {
      deep: true,
      handler(newVal) {
        if (newVal && Array.isArray(newVal)) {
          newVal.forEach((item, index) => {
            if (item && item.completado !== undefined) {
              this.actualizarCompletado('joselito', index, item.completado);
            }
          });
        }
      }
    },
    pedidoCatarro: {
      deep: true,
      handler(newVal) {
        if (newVal && Array.isArray(newVal)) {
          newVal.forEach((item, index) => {
            if (item && item.completado !== undefined) {
              this.actualizarCompletado('catarro', index, item.completado);
            }
          });
        }
      }
    },
    pedidoOzuna: {
      deep: true,
      handler(newVal) {
        if (newVal && Array.isArray(newVal)) {
          newVal.forEach((item, index) => {
            if (item && item.completado !== undefined) {
              this.actualizarCompletado('ozuna', index, item.completado);
            }
          });
        }
      }
    }
  }
}
</script>

<style scoped>
.impresion-container {
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  padding: 15px;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* Asegurar que todos los elementos internos se ajusten */
.impresion-container * {
  max-width: 100%;
  box-sizing: border-box;
}

.impresion-container table {
  width: 100% !important;
  table-layout: auto;
}

.impresion-container h2,
.impresion-container h3,
.impresion-container h4 {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.scale-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 8px;
}

.scale-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  background: #ddd;
  border-radius: 4px;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.scale-slider:hover {
  opacity: 1;
}

.scale-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #34495e;
  border-radius: 50%;
  cursor: pointer;
}

.scale-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #34495e;
  border-radius: 50%;
  cursor: pointer;
}

.scale-value {
  min-width: 60px;
  text-align: center;
  font-weight: bold;
  color: #34495e;
}

@media print {
  .scale-control {
    display: none;
  }
}

.buttons-container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn-generar,
.btn-menu,
.btn-volver,
.btn-sacada,
.btn-crudos {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-generar {
  background-color: #34495e;
  color: white;
}

.btn-generar:hover {
  background-color: #2c3e50;
}

.btn-menu {
  background-color: #95a5a6;
  color: white;
}

.btn-menu:hover {
  background-color: #7f8c8d;
}

.btn-volver {
  background-color: #3498db;
  color: white;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-sacada {
  background: linear-gradient(135deg, #8e44ad 0%, #6c5ce7 100%);
  color: #fff;
  box-shadow: 0 4px 10px rgba(108, 92, 231, 0.25);
}

.btn-sacada:hover {
  background: linear-gradient(135deg, #7d3cb2 0%, #5b4bd6 100%);
}

.btn-crudos {
  background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%);
  color: #fff;
  box-shadow: 0 4px 10px rgba(22, 160, 133, 0.25);
}

.btn-crudos:hover {
  background: linear-gradient(135deg, #138d75 0%, #17a589 100%);
}

.icon {
  font-size: 1.2em;
}

.pdf-preview {
  margin-top: 20px;
  border: 1px solid #ddd;
  padding: 20px;
}

.preview-page {
  margin-bottom: 40px;
  page-break-after: always;
  position: relative;
}

.preview-page:last-child {
  page-break-after: avoid;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.cliente-seccion {
  margin-bottom: 30px;
  position: relative;
}

.cliente-seccion.compacto {
  margin-bottom: 8px;
}

.bottom-section {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  position: relative;
  padding-top: 20px;
  border-top: none;
}

.bottom-cliente {
  width: 47%;
  position: relative;
}

.bottom-cliente:first-child {
  margin-right: 5%;
}

.bottom-cliente:last-child {
  margin-left: 5%;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 5px;
  margin-bottom: 10px;
}

.preview-table.compacto {
  margin-top: 1px;
  margin-bottom: 2px;
}

.preview-table th,
.preview-table td {
  border: 1px solid #000;
  padding: 8px;
  text-align: center;
}

.preview-table.compacto th,
.preview-table.compacto td {
  padding: 2px;
  font-size: 0.9em;
}

h3 {
  text-align: center;
  margin-bottom: 20px;
  font-size: 24px;
  color: #2c3e50;
}

h4 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 20px;
}

@media print {
  .buttons-container {
    display: none !important;
  }

  .impresion-container > h2 {
    display: none;
  }

  .pdf-preview {
    border: none;
    padding: 0;
  }

  .preview-page {
    page-break-after: always;
  }

  .bottom-section {
    border-top: 2px solid #000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .bottom-cliente:first-child {
    margin-right: 5%;
  }
  
 .bottom-cliente:last-child {
    margin-left: 5%;
  }
}

.text-blue {
  color: #0000FF;
}

.text-blue.compact {
  font-size: 0.9em;
  margin-left: -5px;
}

.cliente-separator {
  border: none;
  height: 1px;
  background-color: #000;
  margin: 30px 0;
}

@media print {
  .cliente-separator {
    background-color: #000;
    height: 1px;
    margin: 30px 0;
  }
}

.cliente-header {
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 15px;
  color: #000;
}

.cliente-header.compacto {
  padding: 4px;
  margin-bottom: 5px;
  font-size: 0.9em;
}

.otilio-header {
  background-color: #FFEB3B; /* Amarillo */
}

h4.cliente-header.catarro-header {
  background-color: #FF5252; /* Rojo */
}

h4.cliente-header.joselito-header {
  background-color: #2196F3; /* Azul */
}

h4.cliente-header.lorena-header {
  background-color: #e67e22; /* Naranja */
}

h4.cliente-header.ozuna-header {
  background-color: #4CAF50; /* Verde */
}

/* Asegurar contraste y legibilidad */
.cliente-header {
  text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.5);
  font-weight: bold;
}

@media print {
  .cliente-header {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* Responsive para tablets y móviles */
@media (max-width: 768px) {
  .impresion-container {
    padding: 10px;
  }
  
  .scale-control {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .buttons-container {
    flex-direction: column;
    gap: 8px;
  }
  
  .btn-generar,
  .btn-menu,
  .btn-editar,
  .btn-sacada,
  .btn-crudos {
    width: 100%;
    padding: 10px;
    font-size: 14px;
  }
  
  .total-kilos-cell {
    min-width: auto !important;
  }
  
  .preview-table th,
  .preview-table td {
    padding: 6px 4px;
    font-size: 0.9em;
  }
}

/* Estilos para dispositivos móviles pequeños */
@media (max-width: 375px) {
  .impresion-container {
    padding: 8px;
  }
  
  h2, h3, h4 {
    font-size: 16px !important;
    margin: 10px 0;
  }
  
  .preview-table th,
  .preview-table td {
    padding: 4px 2px;
    font-size: 0.75em;
    word-break: break-word;
  }
  
  .bottom-section {
    flex-direction: column;
    gap: 20px;
    border-top: none;
    padding-top: 0;
  }

  .bottom-cliente {
    width: 100%;
    margin: 0 !important;
    padding: 15px 0;
    border-top: none;
  }

  .preview-table {
    font-size: 14px;
  }

  .preview-table th,
  .preview-table td {
    padding: 4px;
  }

  h4.cliente-header {
    font-size: 18px;
    text-align: center;
    margin-bottom: 15px;
  }
}

/* Estilos para las etiquetas de proveedor y notas */
.proveedor-tag {
  display: block;
  background-color: #9b59b6;
  color: white;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.8em;
  margin-top: 2px;
}

.nota-tag {
  display: block;
  background-color: #e74c3c;
  color: white;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.8em;
  margin-top: 2px;
}

/* Ajustes responsivos para las etiquetas */
@media (max-width: 375px) {
  .proveedor-tag,
  .nota-tag {
    font-size: 0.7em;
    padding: 1px 2px;
  }
}

.seccion-cliente.temporal {
  border: 2px solid #95a5a6;
  background-color: #f8f9fa;
}

.seccion-cliente.temporal h3 {
  color: #7f8c8d;
}

.cliente-seccion.temporal {
  margin-top: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #95a5a6;
}

.temporal-header {
  background-color: #95a5a6;
  color: white;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
}

@media print {
  .cliente-seccion.temporal {
    page-break-inside: avoid;
    border: 2px solid #95a5a6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .temporal-header {
    background-color: #95a5a6 !important;
    color: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

.preview-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.preview-table.compacto th,
.preview-table.compacto td {
  padding: 4px;
}

.resumen-medidas {
  margin-top: 30px;
  page-break-before: avoid;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.resumen-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  margin-left: auto;
  margin-right: auto;
}

/* Ajustar los anchos de las columnas */
.resumen-table th:nth-child(1),
.resumen-table td:nth-child(1) {
  width: 15%; /* Columna de Medida */
}

.resumen-table th:nth-child(2),
.resumen-table td:nth-child(2) {
  width: 15%; /* Columna de Total Kilos */
}

.resumen-table th:nth-child(3),
.resumen-table td:nth-child(3) {
  width: 35%; /* Aumentada ligeramente para acomodar el input más grande */
}

.resumen-table th:nth-child(4),
.resumen-table td:nth-child(4) {
  width: 18%; /* Reducida ligeramente */
}

.resumen-table th:nth-child(5),
.resumen-table td:nth-child(5) {
  width: 17%; /* Reducida ligeramente */
}

.resumen-table th,
.resumen-table td {
  padding: 8px;
  vertical-align: middle;
  text-align: center;
  border: 1px solid #ddd;
}

.resumen-table th {
  background-color: #f2f2f2;
  font-weight: bold;
  color: #333;
}

.rendimientos-column {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  justify-content: center;
  flex-wrap: nowrap;
  margin: 0 auto;
  width: fit-content;
}

.rendimiento-box {
  width: 80px;
  min-width: 80px;
  max-width: 80px;
  padding: 6px 8px;
  font-size: 16px;
  border: 2px solid #4CAF50;
  border-radius: 4px;
  color: #4CAF50;
  text-align: center;
  outline: none;
  box-sizing: border-box;
}

.rendimiento-total {
  min-width: 60px;
  font-size: 16px;
  color: #666;
}

.checkbox-group {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 0 auto;
  width: fit-content;
  padding: 4px 8px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.checkbox-group label:hover {
  background-color: #f0f0f0;
}

.checkbox-group input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin: 0;
  accent-color: #667eea;
  flex-shrink: 0;
}

.checkbox-group input[type="radio"]:checked + span {
  color: #667eea;
  font-weight: bold;
}

.cajas-result {
  display: inline-block;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: #2196F3;
  min-width: 40px;
  line-height: 1.4;
}

.cajas-result:not([data-granja]) {
  color: #4CAF50;
}

.cajas-result.cajas-faltantes {
  position: relative;
  background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(255, 152, 0, 0.3);
  min-width: 60px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
}

.cajas-result.cajas-faltantes::before {
  content: '📦';
  font-size: 0.9em;
  flex-shrink: 0;
}

/* Tooltip para explicar que se calculó con kilos faltantes */
.cajas-result.cajas-faltantes::after {
  content: 'Calculado con kilos faltantes (restando refrigerados)';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.7em;
  font-weight: normal;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 1000;
  margin-bottom: 5px;
}

.cajas-result.cajas-faltantes:hover::after {
  opacity: 1;
}

/* Ajustes responsivos */
@media (max-width: 375px) {
  .resumen-medidas {
    padding: 0;
    margin: 10px 0;
  }

  .resumen-header {
    font-size: 16px;
    padding: 8px;
    margin-bottom: 10px;
  }

  .resumen-table {
    width: 100%;
    min-width: 560px;
    display: table;
  }

  .resumen-medidas {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .resumen-table thead {
    display: table-header-group;
  }

  .resumen-table tbody {
    display: table-row-group;
  }

  .resumen-table tr {
    display: table-row;
    margin-bottom: 0;
    border: none;
    border-radius: 0;
    padding: 0;
    background: transparent;
  }

  .resumen-table tr {
    width: auto;
  }

  .resumen-table td {
    display: table-cell;
    text-align: center;
    padding: 4px 8px;
    border: 1px solid #ddd;
    position: static;
    min-height: 0;
    margin-bottom: 0;
    width: auto;
  }
  
  /* Mantener layout horizontal para kilos en responsive */
  .resumen-table td.total-kilos-cell {
    padding: 4px 8px !important;
    display: table-cell !important;
    justify-content: center !important;
  }
  
  .resumen-table td.total-kilos-cell .kilos-container {
    flex-direction: row !important;
    justify-content: center !important;
    flex-wrap: wrap !important;
  }

  .resumen-table td::before {
    content: none;
  }
  
  /* Ocultar etiqueta "Total Kilos" para evitar empalmamiento */
  .resumen-table td.total-kilos-cell::before {
    content: none !important;
  }

  .rendimientos-column {
    flex-direction: row;
    width: 100%;
    justify-content: flex-start;
    padding-left: 0;
    gap: 8px;
  }

  .rendimiento-box {
    width: 60px;
    min-width: 60px;
    max-width: 60px;
    font-size: 14px;
    padding: 4px;
    height: 30px;
  }

  .rendimiento-total {
    min-width: 30px;
    font-size: 14px;
  }

  .checkbox-group {
    padding-left: 0;
    justify-content: flex-start;
    gap: 15px;
  }

  .checkbox-group label {
    font-size: 14px;
  }

  .cajas-result {
    padding-left: 0;
    text-align: center;
    font-size: 14px;
    min-width: 35px;
  }
  
  .cajas-result.cajas-faltantes {
    padding: 4px 8px;
    font-size: 13px;
    min-width: 50px;
    gap: 3px;
  }
  
  .cajas-result.cajas-faltantes::before {
    font-size: 0.85em;
  }
  
  .cajas-result.cajas-faltantes::after {
    display: none; /* Ocultar tooltip en móviles */
  }
  
  .checkbox-group {
    gap: 12px;
    padding: 4px;
  }
  
  .checkbox-group label {
    gap: 5px;
    font-size: 14px;
    padding: 3px 6px;
  }
  
  .checkbox-group input[type="radio"] {
    width: 16px;
    height: 16px;
  }
}

/* Ajustes para impresión */
@media print {
  .rendimiento-box {
    border: none;
    background: none;
  }
  
  .cajas-result.cajas-faltantes {
    background: none !important;
    color: #000 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  
  .cajas-result.cajas-faltantes::before {
    display: none;
  }
  
  .cajas-result.cajas-faltantes::after {
    display: none !important;
  }
}

.resumen-header {
  background-color: #343a40;
  color: white;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 0;
}

.resumen-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
  flex-wrap: wrap;
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

.resumen-calculadora-panel {
  margin-bottom: 14px;
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

@media print {
  .resumen-medidas {
    display: none; /* Ocultar en impresión */
  }
}

.preview-table td:first-child,
.preview-table td:nth-child(2),
.preview-table td:nth-child(3),
.preview-table td:nth-child(4) {
  font-size: 1.6em;
  line-height: 1;
  padding-top: 2px;
  padding-bottom: 2px;
  vertical-align: middle;
}

.preview-table td:first-child i {
  font-size: 0.7em;
  font-style: italic;
  vertical-align: super;
  margin-left: 2px;
}

.preview-table.compacto td:first-child,
.preview-table.compacto td:nth-child(2),
.preview-table.compacto td:nth-child(3),
.preview-table.compacto td:nth-child(4) {
  font-size: 1.6em;
  padding-top: 2px;
  padding-bottom: 2px;
}

/* Ajustar el tamaño de los elementos secundarios */
.proveedor-tag,
.nota-tag {
  font-size: 0.6em;
  display: block;
  margin-top: 4px;
}

/* Ajustes responsivos */
@media (max-width: 375px) {
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

  .preview-table td:first-child,
  .preview-table td:nth-child(2),
  .preview-table td:nth-child(3),
  .preview-table td:nth-child(4) {
    font-size: 1.4em;
  }
  
  .preview-table td {
    padding: 4px;
  }
  
  .proveedor-tag,
  .nota-tag {
    font-size: 0.5em;
  }
}

/* Asegurar que el tipo solo cambie el color */
.text-blue,
.text-blue.compact {
  color: #0000FF;
}

/* Estilos para los checkboxes */
.pedido-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  border: 2px solid #4CAF50;
  border-radius: 4px;
  appearance: none;
  -webkit-appearance: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  transition: all 0.2s ease;
}

.pedido-checkbox:checked {
  background-color: #4CAF50;
  position: relative;
}

.pedido-checkbox:checked::after {
  content: '✓';
  color: white;
  font-size: 14px;
  position: absolute;
}

.preview-table td:first-child {
  width: 40px;
  text-align: center;
  vertical-align: middle;
}

@media print {
  .pedido-checkbox {
    border: 2px solid #000;
  }
  
  .pedido-checkbox:checked {
    background-color: #000;
  }
}

@media (max-width: 375px) {
  .pedido-checkbox {
    width: 16px;
    height: 16px;
  }
  
  .pedido-checkbox:checked::after {
    font-size: 12px;
  }
}

/* Estilos para el total de kilos por cliente */
.total-cliente-row {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.total-cliente-row td {
  border-top: 2px solid #34495e !important;
  padding: 8px !important;
}

.total-kilos-cliente {
  font-weight: bold;
  font-size: 1.3em;
  color: #2c3e50;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media print {
  .total-kilos-cliente {
    -webkit-text-fill-color: #2c3e50;
    background: none;
  }
}

@media (max-width: 375px) {
  .total-kilos-cliente {
    font-size: 1.1em;
  }
}

.resumen-table tr.total-row {
  background-color: #f8f9fa;
  font-weight: bold;
}

.resumen-table tr.total-row td {
  border-top: 2px solid #000;
  padding: 12px 8px;
}

@media print {
  .resumen-table tr.total-row {
    background-color: #f8f9fa !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* Estilos para kilos refrigerados */
.total-kilos-cell {
  padding: 12px !important;
  min-width: 200px;
}

.kilos-container {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 16px !important;
  width: 100% !important;
  flex-wrap: wrap !important;
  padding: 4px 0 !important;
}

.kilos-column {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  min-width: fit-content !important;
  white-space: nowrap;
  margin: 0 4px;
}

.total-kilos-clickeable {
  font-weight: bold;
  color: #2c3e50;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid transparent;
  min-width: 80px;
  text-align: center;
  display: inline-block;
}

.total-kilos-clickeable:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  border-color: #667eea;
}

.total-kilos-clickeable:active {
  transform: translateY(0);
}

.kilos-refrigerados-column,
.kilos-faltantes-column {
  font-size: 0.95em;
}

.kilos-refrigerados {
  background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px rgba(23, 162, 184, 0.3);
  white-space: nowrap;
}

.kilos-faltantes {
  background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
  color: white;
  padding: 5px 10px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85em;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
  white-space: nowrap;
}

.kilos-faltantes.suficientes {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
}

.kilos-faltantes.suficientes::before {
  content: '✓ ';
}

.kilos-faltantes.sobra {
  background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%);
  box-shadow: 0 2px 4px rgba(23, 162, 184, 0.3);
}



/* Responsive para kilos refrigerados - Solo en pantallas muy pequeñas */
@media (max-width: 320px) {
  .kilos-container {
    flex-direction: column !important;
    align-items: flex-end !important;
    gap: 4px !important;
  }
  
  .kilos-column {
    justify-content: flex-end !important;
    width: 100% !important;
  }
}

@media (max-width: 375px) {
  .kilos-container {
    gap: 8px !important;
  }
  
  .kilos-column {
    margin: 0 2px;
  }
  
  .total-kilos-clickeable {
    padding: 5px 10px;
    font-size: 0.85em;
    min-width: 70px;
  }
  
  .kilos-refrigerados-column,
  .kilos-faltantes-column {
    font-size: 0.85em;
  }
  
  .kilos-refrigerados {
    font-size: 0.8em;
    padding: 4px 8px;
    gap: 4px;
  }
  
  .kilos-faltantes {
    font-size: 0.75em;
    padding: 3px 6px;
  }
}

/* Ocultar kilos refrigerados en impresión */
@media print {
  .kilos-refrigerados-column,
  .kilos-faltantes-column {
    display: none;
  }
  
  .kilos-container {
    justify-content: flex-start;
  }
  
  .total-kilos-clickeable {
    background: none !important;
    color: #000 !important;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
    cursor: default;
    padding: 0;
  }
  
  .total-kilos-clickeable:hover {
    background: none !important;
    color: #000 !important;
    transform: none !important;
    box-shadow: none !important;
  }
}
</style> 
