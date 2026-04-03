<template>
  <div>
    <!-- Botón para abrir el modal -->
    <button @click="abrirModal" class="precio-historial-btn">
      <i class="nav-icon">💰</i>
      <span>{{ clienteActual ? `Precios de Venta - ${obtenerNombreCliente(clienteActual)}` : 'Precios de Venta' }}</span>
    </button>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div ref="modalContent" class="modal-content">
        <div class="modal-header">
          <h2>
            <i class="header-icon">📊</i>
            {{ clienteActual ? `Precios de Venta - ${obtenerNombreCliente(clienteActual)}` : 'Precios de Venta' }}
          </h2>
          <button @click="showModal = false" class="close-btn">
            <i class="close-icon">✕</i>
          </button>
        </div>

        <!-- Formulario para agregar nuevo precio  -->
        <div class="add-price-form">
          <div class="form-header">
            <h3>
              <i class="form-icon">➕</i>
              Agregar Nuevo Precio
            </h3>
          </div>
          <div class="form-group">
            <div class="input-wrapper">
              <input v-model="newPrice.producto" type="text" placeholder="Producto/Medida" list="productos" class="form-input">
              <datalist id="productos">
                <option v-for="producto in preciosActuales" :key="producto.id" :value="producto.producto"></option>
              </datalist>
              <!-- Mostrar precio actual si existe -->
              <div v-if="precioActualMostrar" class="precio-actual-indicator">
                <i class="precio-icon">💰</i>
                <span class="precio-texto">Precio actual: </span>
                <span class="precio-valor">${{ formatNumber(precioActualMostrar.precio) }}</span>
                <span v-if="precioActualMostrar.clienteId" class="precio-cliente">
                  ({{ obtenerNombreCliente(precioActualMostrar.clienteId) }})
                </span>
                <span v-else class="precio-general">(General)</span>
                <span class="precio-fecha">desde {{ formatDate(precioActualMostrar.fecha) }}</span>
              </div>
            </div>
            
            <div class="input-wrapper">
              <input v-model.number="newPrice.precio" type="number" placeholder="Precio" class="form-input">
            </div>
            
            <div class="input-wrapper">
              <input v-model="newPrice.fecha" type="date" class="form-input">
            </div>
            
            <!-- Nuevo campo para seleccionar cliente específico -->
            <div class="cliente-especifico-wrapper">
              <label class="checkbox-wrapper">
                <input type="checkbox" id="clienteEspecifico" v-model="newPrice.esClienteEspecifico">
                <span class="checkmark"></span>
                <span class="checkbox-label">Precio para cliente específico</span>
              </label>
            </div>
            
            <!-- Selector de cliente que aparece solo cuando se marca la casilla -->
            <div v-if="newPrice.esClienteEspecifico" class="cliente-selector">
              <label class="selector-label">Seleccionar cliente:</label>
              <div class="cliente-botones">
                <button 
                  v-for="cliente in clientes" 
                  :key="cliente.id" 
                  @click="seleccionarCliente(cliente.id)"
                  class="cliente-btn"
                  :class="{'cliente-seleccionado': newPrice.clienteId === cliente.id}"
                  :style="{ '--cliente-color': cliente.color }">
                  {{ cliente.nombre }}
                </button>
              </div>
            </div>
            
            <button @click="agregarPrecio" class="add-btn">
              <i class="btn-icon">💾</i>
              <span>Agregar Precio</span>
            </button>
          </div>
        </div>

        <!-- Filtro para mostrar precios específicos por cliente -->
        <div class="filter-section">
          <div class="filter-header">
            <i class="filter-icon">🔍</i>
            <label>Filtrar por cliente:</label>
          </div>
          <div class="cliente-filtro-botones">
            <button 
              @click="filtroCliente = ''" 
              class="cliente-filtro-btn"
              :class="{'cliente-filtro-seleccionado': filtroCliente === ''}">
              <i class="filter-all-icon">🌐</i>
              Todos
            </button>
            <button 
              v-for="cliente in clientes" 
              :key="cliente.id" 
              @click="filtroCliente = cliente.id"
              class="cliente-filtro-btn"
              :class="{'cliente-filtro-seleccionado': filtroCliente === cliente.id}"
              :style="{ '--cliente-color': cliente.color }">
              {{ cliente.nombre }}
            </button>
          </div>
        </div>

        <!-- Precio por kg maquila Ozuna: fila compacta (detalle en title al pasar el ratón) -->
        <div
          class="maquila-ozuna-section"
          aria-label="Precio maquila Ozuna"
          title="Precio por kg por defecto para Ozuna cuando la línea es maquila (Venta desmarcada). Equivale al $ del encabezado del producto."
        >
          <div class="maquila-ozuna-row">
            <span class="maquila-ozuna-title">Maquila Ozuna</span>
            <span class="maquila-ozuna-now" aria-live="polite">
              ${{ formatNumber(precioMaquilaOzunaVigente) }}
              <span
                v-if="!tieneRegistroMaquilaOzunaFirestore"
                class="maquila-ozuna-hint"
                :title="'Sin registro en base de datos; usando ' + precioMaquilaOzunaFallbackRef"
                aria-hidden="true"
              >·</span>
            </span>
            <input
              id="maquilaOzunaPrecio"
              v-model.number="maquilaOzunaForm.precio"
              type="number"
              step="0.01"
              min="0"
              class="maquila-ozuna-input-num"
              aria-label="Precio en dólares por kilogramo"
              placeholder="$/kg"
            >
            <input
              id="maquilaOzunaFecha"
              v-model="maquilaOzunaForm.fecha"
              type="date"
              class="maquila-ozuna-input-date"
              aria-label="Vigente desde"
            >
            <button
              type="button"
              class="maquila-ozuna-guardar"
              :disabled="guardandoMaquilaOzuna"
              :title="guardandoMaquilaOzuna ? '' : 'Guardar precio maquila Ozuna'"
              @click="guardarPrecioMaquilaOzuna"
            >
              <span v-if="guardandoMaquilaOzuna">…</span>
              <span v-else>Guardar</span>
            </button>
          </div>
        </div>

        <!-- Lista de productos y precios actuales -->
        <div class="current-prices">
          <div class="prices-header">
            <h3>
              <i class="prices-icon">💼</i>
              Precios Actuales
            </h3>
          </div>
          <div v-for="categoria in categorias" :key="categoria" class="categoria-section">
            <h4 class="categoria-title">
              <i class="categoria-icon">📂</i>
              {{ categoria }}
            </h4>
            <div class="products-grid">
              <div 
                v-for="producto in filtrarPreciosPorCliente(preciosOrdenados[categoria])" 
                :key="producto.id" 
                class="product-card" 
                :class="{'precio-especifico': producto.clienteId}"
                :style="producto.clienteId ? { '--border-color': obtenerColorCliente(producto.clienteId), '--bg-color': obtenerColorClienteConOpacidad(producto.clienteId) } : {}">
                <div class="product-header">
                  <h4 class="product-name">{{ producto.producto }}</h4>
                  <div class="product-actions">
                    <button @click="abrirEditorPrecio(producto)" class="edit-btn" title="Editar precio actual">
                      <i class="edit-icon">✏️</i>
                    </button>
                    <button @click="mostrarHistorial(producto)" class="history-btn" title="Ver historial">
                      <i class="history-icon">📈</i>
                    </button>
                  </div>
                </div>
                <div class="product-info">
                  <p class="price">${{ formatNumber(producto.precio) }}</p>
                  <p class="date">
                    <i class="date-icon">📅</i>
                    Desde: {{ formatDate(producto.fecha) }}
                  </p>
                  <p v-if="producto.clienteId" class="cliente-especifico-tag" :style="{ '--tag-color': obtenerColorCliente(producto.clienteId) }">
                    <i class="client-icon">👤</i>
                    Cliente: {{ obtenerNombreCliente(producto.clienteId) }}
                  </p>
                  <p class="historial-count">
                    <i class="count-icon">📊</i>
                    {{ producto.historial.length }} precio{{ producto.historial.length !== 1 ? 's' : '' }} registrado{{ producto.historial.length !== 1 ? 's' : '' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal de historial -->
        <div v-if="showHistorialModal" class="historial-modal-overlay" @click.self="showHistorialModal = false">
          <div class="historial-modal">
            <div class="historial-content">
              <div class="historial-header">
                <h3>
                  <i class="historial-icon">📈</i>
                  Historial de Precios - {{ productoSeleccionado?.producto }}
                </h3>
                <button @click="showHistorialModal = false" class="close-btn">
                  <i class="close-icon">✕</i>
                </button>
              </div>
              <div class="table-wrapper">
                <table class="historial-table">
                  <thead>
                    <tr>
                      <th><i class="table-icon">📅</i> Fecha</th>
                      <th><i class="table-icon">💰</i> Precio</th>
                      <th><i class="table-icon">👤</i> Cliente</th>
                      <th><i class="table-icon">📊</i> Cambio</th>
                      <th><i class="table-icon">⚙️</i> Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(precio, index) in historialPaginado" :key="index" class="historial-row">
                      <td class="date-cell">{{ formatDate(precio.fecha) }}</td>
                      <td class="price-cell">${{ formatNumber(precio.precio) }}</td>
                      <td class="client-cell">
                        <span 
                          v-if="precio.clienteId" 
                          class="cliente-especifico-tag"
                          :style="{ '--tag-color': obtenerColorCliente(precio.clienteId) }">
                          <i class="client-icon">👤</i>
                          {{ obtenerNombreCliente(precio.clienteId) }}
                        </span>
                        <span v-else class="general-tag">
                          <i class="general-icon">🌐</i>
                          General
                        </span>
                      </td>
                      <td class="change-cell">
                        <span v-if="calcularIndiceGlobal(index) < historialPrecios.length - 1" 
                              :class="{'precio-subio': precio.precio < historialPrecios[calcularIndiceGlobal(index) + 1].precio,
                                     'precio-bajo': precio.precio > historialPrecios[calcularIndiceGlobal(index) + 1].precio}"
                              class="change-indicator">
                          {{ calcularCambio(precio.precio, historialPrecios[calcularIndiceGlobal(index) + 1].precio) }}
                        </span>
                      </td>
                      <td class="actions-cell">
                        <button @click="eliminarPrecio(precio)" class="delete-btn" title="Eliminar precio">
                          <i class="delete-icon">🗑️</i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- Información de paginación -->
              <div v-if="historialPrecios.length > 0" class="pagination-info">
                <span class="pagination-text">
                  <i class="info-icon">ℹ️</i>
                  Mostrando {{ infoPaginacion.inicio }}-{{ infoPaginacion.fin }} de {{ infoPaginacion.total }} registros
                </span>
                <div class="items-per-page">
                  <label>Registros por página:</label>
                  <select v-model="itemsPorPagina" @change="paginaActual = 1" class="pagination-select">
                    <option :value="5">5</option>
                    <option :value="10">10</option>
                    <option :value="20">20</option>
                    <option :value="50">50</option>
                  </select>
                </div>
              </div>
              
              <!-- Controles de paginación -->
              <div v-if="totalPaginas > 1" class="pagination-controls">
                <button @click="paginaActual = 1" :disabled="paginaActual === 1" class="pagination-btn">
                  <i class="pagination-icon">⏮️</i>
                </button>
                <button @click="paginaActual--" :disabled="paginaActual === 1" class="pagination-btn">
                  <i class="pagination-icon">◀️</i>
                </button>
                
                <!-- Números de página -->
                <div class="pagination-numbers">
                  <button 
                    v-for="numero in numerosVisibles" 
                    :key="numero"
                    @click="paginaActual = numero"
                    :class="{'pagination-number': true, 'active': numero === paginaActual}">
                    {{ numero }}
                  </button>
                </div>
                
                <button @click="paginaActual++" :disabled="paginaActual === totalPaginas" class="pagination-btn">
                  <i class="pagination-icon">▶️</i>
                </button>
                <button @click="paginaActual = totalPaginas" :disabled="paginaActual === totalPaginas" class="pagination-btn">
                  <i class="pagination-icon">⏭️</i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal de confirmación para precios específicos existentes -->
        <div v-if="showConfirmacionModal" class="confirmacion-modal-overlay" @click.self="cancelarConfirmacion">
          <div class="confirmacion-modal-content">
            <div class="confirmacion-header">
              <h3>
                <i class="warning-icon">⚠️</i>
                Precios Específicos Existentes
              </h3>
              <button @click="cancelarConfirmacion" class="close-btn">
                <i class="close-icon">✕</i>
              </button>
            </div>
            
            <div class="confirmacion-body">
              <p class="confirmacion-mensaje">
                Ya existen precios específicos para <strong>{{ nuevoPrecioTemporal?.producto }}</strong> para los siguientes clientes:
              </p>
              
              <div class="clientes-afectados">
                <div 
                  v-for="precioEspecifico in preciosEspecificosAfectados" 
                  :key="precioEspecifico.clienteId" 
                  class="cliente-afectado">
                  <div class="cliente-info">
                    <span 
                      class="cliente-tag"
                      :style="{ '--tag-color': obtenerColorCliente(precioEspecifico.clienteId) }">
                      <i class="client-icon">👤</i>
                      {{ obtenerNombreCliente(precioEspecifico.clienteId) }}
                    </span>
                    <div class="precio-info">
                      <span class="precio-actual">
                        <i class="price-icon">💰</i>
                        Precio actual: ${{ formatNumber(precioEspecifico.precio) }}
                      </span>
                      <span class="precio-nuevo">
                        <i class="new-price-icon">🆕</i>
                        Precio nuevo: ${{ formatNumber(nuevoPrecioTemporal?.precio) }}
                      </span>
                    </div>
                  </div>
                  
                  <div class="decision-opciones">
                    <label class="decision-label">¿Qué deseas hacer?</label>
                    <div class="radio-group">
                      <label class="radio-option">
                        <input 
                          type="radio" 
                          :name="`decision_${precioEspecifico.clienteId}`"
                          value="mantener"
                          v-model="decisionesClientes[precioEspecifico.clienteId]">
                        <span class="radio-custom"></span>
                        <span class="radio-text mantener">
                          <i class="keep-icon">🔒</i>
                          Mantener precio específico actual
                        </span>
                      </label>
                      <label class="radio-option">
                        <input 
                          type="radio" 
                          :name="`decision_${precioEspecifico.clienteId}`"
                          value="sobreescribir"
                          v-model="decisionesClientes[precioEspecifico.clienteId]">
                        <span class="radio-custom"></span>
                        <span class="radio-text sobreescribir">
                          <i class="overwrite-icon">🔄</i>
                          Sobreescribir con precio general
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="confirmacion-footer">
              <button @click="cancelarConfirmacion" class="btn-cancelar">
                <i class="cancel-icon">❌</i>
                <span>Cancelar</span>
              </button>
              <button @click="confirmarAgregarPrecio" class="btn-confirmar" :disabled="!todasDecisionesTomadas">
                <i class="confirm-icon">✅</i>
                <span>Confirmar y Agregar</span>
              </button>
            </div>
          </div>
        </div>

        <PrecioActualEditorModal
          :visible="showEditarPrecioModal"
          :precio="precioEnEdicion"
          :clientes="clientes"
          :guardando="guardandoEdicionPrecio"
          :top-offset="editorModalTop"
          @close="cerrarEditorPrecio"
          @save="guardarEdicionPrecio"
        />
      </div>
      
      <!-- Botón flotante de cerrar siempre visible -->
      <button @click="showModal = false" class="floating-close-btn" title="Cerrar modal">
        <i class="floating-close-icon">❌</i>
        <span class="floating-close-text">Cerrar</span>
      </button>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  obtenerFechaActualISO, 
  normalizarFechaISO, 
  obtenerTimestamp, 
  formatearFechaParaMostrar,
  esFechaValida 
} from '@/utils/dateUtils';
import PrecioActualEditorModal from '@/components/PrecioActualEditorModal.vue';
import {
  PRODUCTO_PRECIO_MAQUILA_OZUNA,
  obtenerPrecioMaquilaOzunaDefault,
  PRECIO_MAQUILA_OZUNA_FALLBACK
} from '@/utils/preciosHistoricos';

const crearNuevoPrecio = () => ({
  producto: '',
  precio: null,
  fecha: obtenerFechaActualISO(),
  categoria: 'Otros',
  esClienteEspecifico: false,
  clienteId: ''
});

export default {
  name: 'PreciosHistorialModal',
  components: {
    PrecioActualEditorModal
  },
  props: {
    clienteActual: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      precioMaquilaOzunaFallbackRef: PRECIO_MAQUILA_OZUNA_FALLBACK,
      preciosFirestoreRaw: [],
      guardandoMaquilaOzuna: false,
      maquilaOzunaForm: {
        precio: null,
        fecha: obtenerFechaActualISO()
      },
      showModal: false,
      showHistorialModal: false,
      showConfirmacionModal: false,
      showEditarPrecioModal: false,
      editorModalTop: 24,
      preciosActuales: [],
      historialPrecios: [],
      productoSeleccionado: null,
      precioEnEdicion: null,
      guardandoEdicionPrecio: false,
      preciosEspecificosAfectados: [],
      nuevoPrecioTemporal: null,
      decisionesClientes: {},
      // Nuevas variables para paginación
      paginaActual: 1,
      itemsPorPagina: 10,
      categorias: ['Camarón S/C', 'Camarón C/C', 'Otros'],
      clientes: [
        { id: 'joselito', nombre: 'Joselito', color: '#2196F3' },
        { id: 'catarro', nombre: 'Catarro', color: '#d32f2f' },
        { id: 'otilio', nombre: 'Otilio', color: '#FFD700' },
        { id: 'ozuna', nombre: 'Ozuna', color: '#07711e' },
        { id: 'veronica', nombre: 'Verónica', color: '#e67e22' }
      ],
      filtroCliente: '',
      newPrice: crearNuevoPrecio(),
      precioActualMostrar: null,
      buscarPrecioTimeout: null,
      // Mapeo de nombres duplicados a nombres normalizados
      // El nombre estándar es con guión y mayúsculas: "Med-Esp c/c" y "Med-Gde c/c"
      nombresNormalizados: {
        // Variantes de Med-Esp c/c
        'Med Esp c/c': 'Med-Esp c/c',
        'med esp c/c': 'Med-Esp c/c',
        'Med esp c/c': 'Med-Esp c/c',
        'MED ESP c/c': 'Med-Esp c/c',
        'MED-ESP c/c': 'Med-Esp c/c',
        'Med-esp c/c': 'Med-Esp c/c',
        // Variantes de Med-Gde c/c
        'Med Gde c/c': 'Med-Gde c/c',
        'med gde c/c': 'Med-Gde c/c',
        'Med gde c/c': 'Med-Gde c/c',
        'Med-gde c/c': 'Med-Gde c/c', // Variante con g minúscula
        'MED GDE c/c': 'Med-Gde c/c',
        'MED-GDE c/c': 'Med-Gde c/c'
      }
    };
  },
  computed: {
    precioMaquilaOzunaVigente() {
      return obtenerPrecioMaquilaOzunaDefault(this.preciosFirestoreRaw, obtenerFechaActualISO());
    },
    tieneRegistroMaquilaOzunaFirestore() {
      return this.preciosFirestoreRaw.some(
        (p) =>
          p.producto === PRODUCTO_PRECIO_MAQUILA_OZUNA &&
          (!p.clienteId || p.clienteId === 'ozuna')
      );
    },
    currentDate() {
      return obtenerFechaActualISO();
    },
    // Computed property para paginación
    totalPaginas() {
      return Math.ceil(this.historialPrecios.length / this.itemsPorPagina);
    },
    historialPaginado() {
      const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
      const fin = inicio + this.itemsPorPagina;
      return this.historialPrecios.slice(inicio, fin);
    },
    // Información de paginación para mostrar al usuario
    infoPaginacion() {
      const inicio = (this.paginaActual - 1) * this.itemsPorPagina + 1;
      const fin = Math.min(this.paginaActual * this.itemsPorPagina, this.historialPrecios.length);
      return {
        inicio,
        fin,
        total: this.historialPrecios.length
      };
    },
    // Números de página visibles para la navegación
    numerosVisibles() {
      const maxVisible = 5;
      const total = this.totalPaginas;
      const actual = this.paginaActual;
      
      if (total <= maxVisible) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }
      
      let inicio = Math.max(1, actual - Math.floor(maxVisible / 2));
      let fin = Math.min(total, inicio + maxVisible - 1);
      
      if (fin - inicio + 1 < maxVisible) {
        inicio = Math.max(1, fin - maxVisible + 1);
      }
      
      return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
    },
    preciosOrdenados() {
      const preciosAgrupados = {};
      
      // Inicializar grupos
      this.categorias.forEach(categoria => {
        preciosAgrupados[categoria] = [];
      });

      // Agrupar productos por categoría (excluir el pseudo-producto de maquila Ozuna)
      this.preciosActuales
        .filter((producto) => producto.producto !== PRODUCTO_PRECIO_MAQUILA_OZUNA)
        .forEach(producto => {
        const nombreProducto = producto.producto.toLowerCase();
        if (nombreProducto.includes('s/c') || nombreProducto.match(/\d+\/\d+/)) {
          preciosAgrupados['Camarón S/C'].push(producto);
        } else if (nombreProducto.includes('c/c')) {
          preciosAgrupados['Camarón C/C'].push(producto);
        } else {
          preciosAgrupados['Otros'].push(producto);
        }
      });

      // Ordenar cada grupo
      Object.keys(preciosAgrupados).forEach(categoria => {
        preciosAgrupados[categoria].sort((a, b) => {
          // Extraer números de las medidas (ejemplo: 51/60 -> [51, 60])
          const getNumeros = (str) => {
            const matches = str.match(/(\d+)\/(\d+)/);
            return matches ? [parseInt(matches[1]), parseInt(matches[2])] : [0, 0];
          };

          const numerosA = getNumeros(a.producto);
          const numerosB = getNumeros(b.producto);

          // Si ambos tienen formato número/número, ordenar por el primer número
          if (numerosA[0] && numerosB[0]) {
            return numerosA[0] - numerosB[0];
          }

          // Si no, ordenar alfabéticamente
          return a.producto.localeCompare(b.producto);
        });
      });

      return preciosAgrupados;
    },
    todasDecisionesTomadas() {
      return this.preciosEspecificosAfectados.every(precio => 
        this.decisionesClientes[precio.clienteId] && 
        (this.decisionesClientes[precio.clienteId] === 'mantener' || 
         this.decisionesClientes[precio.clienteId] === 'sobreescribir')
      );
    }
  },
  methods: {
    // Normaliza el nombre del producto para unificar duplicados
    normalizarNombreProducto(nombre) {
      if (!nombre) return nombre;
      const nombreTrim = nombre.trim();
      
      // Buscar coincidencia exacta en el mapeo
      if (this.nombresNormalizados[nombreTrim]) {
        return this.nombresNormalizados[nombreTrim];
      }
      
      // Buscar coincidencia ignorando mayúsculas/minúsculas
      const nombreLower = nombreTrim.toLowerCase();
      for (const [variante, normalizado] of Object.entries(this.nombresNormalizados)) {
        if (variante.toLowerCase() === nombreLower) {
          return normalizado;
        }
      }
      
      return nombreTrim;
    },
    formatNumber(value) {
      return value?.toLocaleString('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) || '0.00';
    },
    formatDate(date) {
      return formatearFechaParaMostrar(date);
    },
    calcularCambio(precioActual, precioAnterior) {
      const diferencia = precioActual - precioAnterior;
      const porcentaje = (diferencia / precioAnterior) * 100;
      const signo = diferencia > 0 ? '+' : '';
      return `${signo}${this.formatNumber(diferencia)} (${signo}${porcentaje.toFixed(1)}%)`;
    },
    calcularIndiceGlobal(indicePagina) {
      return (this.paginaActual - 1) * this.itemsPorPagina + indicePagina;
    },
    async cargarPreciosActuales() {
      try {
        const preciosRef = collection(db, 'precios');
        const q = query(preciosRef, orderBy('fecha', 'desc'));
        const preciosSnapshot = await getDocs(q);

        this.preciosFirestoreRaw = preciosSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            fecha: data.fecha ? normalizarFechaISO(data.fecha) : data.fecha,
            timestamp: data.timestamp || 0
          };
        });
        
        // Crear un mapa para organizar los precios por producto y cliente
        // Ahora normalizamos los nombres para unificar productos duplicados
        const preciosMap = new Map();
        
        preciosSnapshot.docs.forEach(doc => {
          const precio = { id: doc.id, ...doc.data() };
          
          // Normalizar el nombre del producto para unificar duplicados
          const productoNormalizado = this.normalizarNombreProducto(precio.producto);
          
          // Clave única para cada combinación de producto normalizado y cliente
          const clave = precio.clienteId 
            ? `${productoNormalizado}-${precio.clienteId}` 
            : productoNormalizado;
            
          if (!preciosMap.has(clave)) {
            preciosMap.set(clave, {
              producto: productoNormalizado, // Usar el nombre normalizado
              productoOriginal: precio.producto, // Guardar el original por referencia
              precioActual: precio.precio,
              fechaActual: precio.fecha,
              clienteId: precio.clienteId || null,
              historial: []
            });
          } else {
            // Si ya existe, verificar si este registro es más reciente
            const existente = preciosMap.get(clave);
            if (new Date(precio.fecha) > new Date(existente.fechaActual)) {
              existente.precioActual = precio.precio;
              existente.fechaActual = precio.fecha;
            }
          }
          
          // Agregar al historial con el nombre normalizado
          preciosMap.get(clave).historial.push({
            id: doc.id,
            fecha: precio.fecha,
            precio: precio.precio,
            clienteId: precio.clienteId || null,
            productoOriginal: precio.producto // Mantener referencia al nombre original
          });
        });
        
        // Ordenar el historial de cada producto por fecha descendente
        preciosMap.forEach((item) => {
          item.historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        });
        
        this.preciosActuales = Array.from(preciosMap.values()).map(item => ({
          id: item.historial[0].id,
          producto: item.producto, // Nombre normalizado
          precio: item.precioActual,
          fecha: item.fechaActual,
          clienteId: item.clienteId,
          historial: item.historial
        }));
        
        console.log('[PRECIOS] Productos cargados con nombres normalizados:', 
          this.preciosActuales.map(p => p.producto));
        this.sincronizarFormMaquilaOzuna();
      } catch (error) {
        console.error('Error al cargar precios:', error);
        this.preciosFirestoreRaw = [];
      }
    },
    sincronizarFormMaquilaOzuna() {
      const v = obtenerPrecioMaquilaOzunaDefault(this.preciosFirestoreRaw, obtenerFechaActualISO());
      this.maquilaOzunaForm.precio = v;
      this.maquilaOzunaForm.fecha = obtenerFechaActualISO();
    },
    async guardarPrecioMaquilaOzuna() {
      if (
        this.maquilaOzunaForm.precio === null ||
        this.maquilaOzunaForm.precio === '' ||
        Number(this.maquilaOzunaForm.precio) < 0
      ) {
        alert('Indique un precio válido');
        return;
      }
      if (!this.maquilaOzunaForm.fecha) {
        alert('Indique la fecha');
        return;
      }
      this.guardandoMaquilaOzuna = true;
      try {
        const fechaNormalizada = normalizarFechaISO(this.maquilaOzunaForm.fecha);
        const timestamp = obtenerTimestamp();
        const nuevoPrecio = {
          producto: PRODUCTO_PRECIO_MAQUILA_OZUNA,
          precio: parseFloat(this.maquilaOzunaForm.precio),
          fecha: fechaNormalizada,
          categoria: 'Otros',
          timestamp,
          fechaCreacion: obtenerFechaActualISO(),
          horaCreacion: new Date().toLocaleTimeString('es-ES'),
          clienteId: 'ozuna'
        };
        await addDoc(collection(db, 'precios'), nuevoPrecio);
        await this.cargarPreciosActuales();
        this.$emit('precio-agregado', {
          producto: PRODUCTO_PRECIO_MAQUILA_OZUNA,
          precio: nuevoPrecio.precio,
          fecha: fechaNormalizada,
          clienteId: 'ozuna',
          timestamp
        });
      } catch (error) {
        console.error('Error al guardar precio maquila Ozuna:', error);
        alert('Error al guardar el precio de maquila');
      } finally {
        this.guardandoMaquilaOzuna = false;
      }
    },
    obtenerNombreCliente(clienteId) {
      const cliente = this.clientes.find(c => c.id === clienteId);
      return cliente ? cliente.nombre : 'Cliente desconocido';
    },
    obtenerColorCliente(clienteId) {
      const cliente = this.clientes.find(c => c.id === clienteId);
      return cliente ? cliente.color : '#2196F3';
    },
    obtenerColorClienteConOpacidad(clienteId) {
      const cliente = this.clientes.find(c => c.id === clienteId);
      if (!cliente) return 'rgba(33, 150, 243, 0.1)';
      
      // Convertir color hexadecimal a rgba con opacidad
      let hex = cliente.color.replace('#', '');
      let r = parseInt(hex.substring(0, 2), 16);
      let g = parseInt(hex.substring(2, 4), 16);
      let b = parseInt(hex.substring(4, 6), 16);
      
      return `rgba(${r}, ${g}, ${b}, 0.15)`;
    },
    seleccionarCliente(clienteId) {
      this.newPrice.clienteId = clienteId;
    },
    crearFormularioNuevoPrecio() {
      const formulario = crearNuevoPrecio();

      if (this.clienteActual && this.clientes.some(c => c.id === this.clienteActual)) {
        formulario.esClienteEspecifico = true;
        formulario.clienteId = this.clienteActual;
      }

      return formulario;
    },
    abrirEditorPrecio(producto) {
      const modalContent = this.$refs.modalContent;
      this.editorModalTop = modalContent ? modalContent.scrollTop + 24 : 24;

      this.precioEnEdicion = {
        id: producto.id,
        producto: producto.producto,
        precio: producto.precio,
        fecha: producto.fecha,
        clienteId: producto.clienteId || ''
      };
      this.showEditarPrecioModal = true;
    },
    cerrarEditorPrecio() {
      if (this.guardandoEdicionPrecio) {
        return;
      }

      this.showEditarPrecioModal = false;
      this.precioEnEdicion = null;
    },
    async guardarEdicionPrecio(precioEditado) {
      if (!precioEditado?.id) {
        alert('No se encontró el precio a editar');
        return;
      }

      if (precioEditado.precio === null || precioEditado.precio === '' || Number(precioEditado.precio) < 0) {
        alert('Por favor ingrese un precio válido');
        return;
      }

      if (!precioEditado.fecha) {
        alert('Por favor seleccione una fecha válida');
        return;
      }

      try {
        this.guardandoEdicionPrecio = true;

        const fechaNormalizada = normalizarFechaISO(precioEditado.fecha);
        const precioNormalizado = parseFloat(precioEditado.precio);

        await updateDoc(doc(db, 'precios', precioEditado.id), {
          precio: precioNormalizado,
          fecha: fechaNormalizada,
          ultimaActualizacion: obtenerFechaActualISO(),
          horaActualizacion: new Date().toLocaleTimeString('es-ES')
        });

        await this.cargarPreciosActuales();

        if (this.productoSeleccionado) {
          const productoActualizado = this.preciosActuales.find(precio =>
            precio.producto === this.productoSeleccionado.producto &&
            (precio.clienteId || '') === (this.productoSeleccionado.clienteId || '')
          );

          if (productoActualizado) {
            this.productoSeleccionado = productoActualizado;
            this.historialPrecios = productoActualizado.historial;
          }
        }

        this.$emit('precio-agregado', {
          id: precioEditado.id,
          producto: precioEditado.producto,
          precio: precioNormalizado,
          fecha: fechaNormalizada,
          clienteId: precioEditado.clienteId || '',
          editado: true
        });

        this.cerrarEditorPrecio();
      } catch (error) {
        console.error('Error al editar precio:', error);
        alert('Error al guardar los cambios del precio');
      } finally {
        this.guardandoEdicionPrecio = false;
      }
    },
    filtrarPreciosPorCliente(productos) {
      if (!this.filtroCliente) {
        // Si no hay filtro ("Todos"), mostrar solo los precios generales
        return productos.filter(producto => !producto.clienteId);
      } else {
        // Si hay filtro, mostrar solo los precios para ese cliente específico
        // o los precios generales si no hay específicos
        const productosEspecificos = productos.filter(p => p.clienteId === this.filtroCliente);
        const productosGenerales = productos.filter(p => !p.clienteId);
        
        // Crear un mapa de productos específicos para verificación rápida
        const productosEspecificosMap = {};
        productosEspecificos.forEach(p => {
          productosEspecificosMap[p.producto] = true;
        });
        
        // Filtrar productos generales que no tienen versión específica
        const productosGeneralesFiltrados = productosGenerales.filter(
          p => !productosEspecificosMap[p.producto]
        );
        
        // Combinar productos específicos con generales que no tienen versión específica
        return [...productosEspecificos, ...productosGeneralesFiltrados];
      }
    },
    async agregarPrecio() {
      if (!this.newPrice.producto || !this.newPrice.precio || !this.newPrice.fecha) {
        alert('Por favor complete todos los campos');
        return;
      }

      if (this.newPrice.esClienteEspecifico && !this.newPrice.clienteId) {
        alert('Por favor seleccione un cliente');
        return;
      }

      // Si es un precio general (no específico), verificar si existen precios específicos
      if (!this.newPrice.esClienteEspecifico) {
        const preciosEspecificosExistentes = this.preciosActuales.filter(precio => 
          precio.producto.toLowerCase() === this.newPrice.producto.toLowerCase() && 
          precio.clienteId
        );

        if (preciosEspecificosExistentes.length > 0) {
          // Mostrar modal de confirmación
          this.preciosEspecificosAfectados = preciosEspecificosExistentes;
          this.nuevoPrecioTemporal = { ...this.newPrice };
          this.decisionesClientes = {};
          
          // Inicializar decisiones como 'mantener' por defecto
          preciosEspecificosExistentes.forEach(precio => {
            this.decisionesClientes[precio.clienteId] = 'mantener';
          });
          
          this.showConfirmacionModal = true;
          return;
        }
      }

      // Si no hay conflictos o es un precio específico, proceder normalmente
      await this.guardarPrecio(this.newPrice);
    },

    async guardarPrecio(precioData, procesarDecisiones = false) {
      try {
        // Normalizar fecha para evitar problemas de zona horaria
        const fechaNormalizada = normalizarFechaISO(precioData.fecha);
        const timestamp = obtenerTimestamp();

        // Normalizar el nombre del producto para evitar duplicados
        const productoNormalizado = this.normalizarNombreProducto(precioData.producto);

        console.log(`[PRECIOS] Guardando precio - Producto original: "${precioData.producto}", Producto normalizado: "${productoNormalizado}", Fecha: ${fechaNormalizada}, Timestamp: ${timestamp}`);

        // Determinar la categoría basada en el nombre del producto
        const nombreProducto = productoNormalizado.toLowerCase();
        let categoria = 'Otros';
        if (nombreProducto.includes('s/c') || nombreProducto.match(/\d+\/\d+/)) {
          categoria = 'Camarón S/C';
        } else if (nombreProducto.includes('c/c')) {
          categoria = 'Camarón C/C';
        }

        const nuevoPrecio = {
          producto: productoNormalizado, // Usar el nombre normalizado
          precio: parseFloat(precioData.precio),
          fecha: fechaNormalizada,
          categoria: categoria,
          timestamp: timestamp,
          fechaCreacion: obtenerFechaActualISO(),
          horaCreacion: new Date().toLocaleTimeString('es-ES')
        };

        // Agregar clienteId solo si es un precio específico
        if (precioData.esClienteEspecifico && precioData.clienteId) {
          nuevoPrecio.clienteId = precioData.clienteId;
          console.log(`[PRECIOS] Precio específico para cliente: ${precioData.clienteId}`);
        } else {
          console.log(`[PRECIOS] Precio general (sin cliente específico)`);
        }

        console.log(`[PRECIOS] Datos finales a guardar:`, nuevoPrecio);

        await addDoc(collection(db, 'precios'), nuevoPrecio);

        // Si estamos procesando decisiones, manejar los precios específicos según las decisiones
        if (procesarDecisiones && this.preciosEspecificosAfectados.length > 0) {
          for (const precioEspecifico of this.preciosEspecificosAfectados) {
            const decision = this.decisionesClientes[precioEspecifico.clienteId];
            
            if (decision === 'sobreescribir') {
              // Eliminar el precio específico existente
              await deleteDoc(doc(db, 'precios', precioEspecifico.id));
            }
            // Si la decisión es 'mantener', no hacemos nada
          }
        }

        // Limpiar el formulario
        this.newPrice = this.crearFormularioNuevoPrecio();

        console.log(`[PRECIOS] Precio guardado exitosamente y formulario limpiado`);

        // Recargar precios actuales
        await this.cargarPreciosActuales();
        
        // Emitir evento para que el componente padre también recargue sus precios
        this.$emit('precio-agregado', {
          producto: productoNormalizado, // Usar el nombre normalizado
          precio: precioData.precio,
          fecha: fechaNormalizada,
          clienteId: precioData.clienteId,
          timestamp: timestamp
        });
      } catch (error) {
        console.error('Error al agregar precio:', error);
        alert('Error al guardar el precio');
      }
    },

    async confirmarAgregarPrecio() {
      if (!this.todasDecisionesTomadas) {
        alert('Por favor tome una decisión para todos los clientes afectados');
        return;
      }

      await this.guardarPrecio(this.nuevoPrecioTemporal, true);
      this.cerrarConfirmacionModal();
    },

    cancelarConfirmacion() {
      this.cerrarConfirmacionModal();
    },

    cerrarConfirmacionModal() {
      this.showConfirmacionModal = false;
      this.preciosEspecificosAfectados = [];
      this.nuevoPrecioTemporal = null;
      this.decisionesClientes = {};
    },
    async eliminarPrecio(precio) {
      if (confirm('¿Estás seguro de que deseas eliminar este precio?')) {
        try {
          await deleteDoc(doc(db, 'precios', precio.id));
          await this.cargarPreciosActuales();
          this.$emit('precio-agregado', { eliminado: true });

          // Si el producto seleccionado aún existe, actualizar su historial
          if (this.productoSeleccionado) {
            const productoActualizado = this.preciosActuales.find(p => p.producto === this.productoSeleccionado.producto);
            if (productoActualizado) {
              this.historialPrecios = productoActualizado.historial;
            } else {
              this.showHistorialModal = false;
            }
          }
        } catch (error) {
          console.error('Error al eliminar precio:', error);
          alert('Error al eliminar el precio');
        }
      }
    },
    async mostrarHistorial(producto) {
      try {
        this.productoSeleccionado = producto;
        this.historialPrecios = producto.historial;
        this.paginaActual = 1; // Resetear la página al mostrar el historial
        this.showHistorialModal = true;
      } catch (error) {
        console.error('Error al cargar historial:', error);
        alert('Error al cargar el historial de precios');
      }
    },
    // Método para abrir el modal y establecer el filtro de cliente
    abrirModal() {
      // Establecer el filtro de cliente si hay un cliente actual
      if (this.clienteActual && this.clientes.some(c => c.id === this.clienteActual)) {
        this.filtroCliente = this.clienteActual;
        
        // Preseleccionar el cliente para nuevos precios
        this.newPrice.esClienteEspecifico = true;
        this.newPrice.clienteId = this.clienteActual;
      }
      
      this.showModal = true;
      this.$nextTick(() => this.sincronizarFormMaquilaOzuna());
    },

    // Método para obtener el precio actual de un producto específico para un cliente
    obtenerPrecioProductoCliente(nombreProducto, clienteId = 'catarro') {
      // Buscar precio específico para el cliente
      const precioEspecifico = this.preciosActuales.find(precio => 
        precio.producto.toLowerCase() === nombreProducto.toLowerCase() && 
        precio.clienteId === clienteId
      );
      
      if (precioEspecifico) {
        return precioEspecifico.precio;
      }
      
      // Si no hay precio específico, buscar precio general
      const precioGeneral = this.preciosActuales.find(precio => 
        precio.producto.toLowerCase() === nombreProducto.toLowerCase() && 
        !precio.clienteId
      );
      
      return precioGeneral ? precioGeneral.precio : null;
    },

    // Método para buscar y mostrar el precio actual de la medida ingresada
    buscarPrecioActual(nombreProducto) {
      if (!nombreProducto || nombreProducto.trim() === '') {
        this.precioActualMostrar = null;
        return;
      }

      const nombreLimpio = nombreProducto.trim().toLowerCase();
      
      // Si es un precio específico para cliente, buscar primero el precio específico
      if (this.newPrice.esClienteEspecifico && this.newPrice.clienteId) {
        const precioEspecifico = this.preciosActuales.find(precio => 
          precio.producto.toLowerCase() === nombreLimpio && 
          precio.clienteId === this.newPrice.clienteId
        );
        
        if (precioEspecifico) {
          this.precioActualMostrar = precioEspecifico;
          // Pre-llenar automáticamente el campo de precio
          this.newPrice.precio = precioEspecifico.precio;
          return;
        }
      }
      
      // Buscar precio general
      const precioGeneral = this.preciosActuales.find(precio => 
        precio.producto.toLowerCase() === nombreLimpio && 
        !precio.clienteId
      );
      
      if (precioGeneral) {
        this.precioActualMostrar = precioGeneral;
        // Pre-llenar automáticamente el campo de precio
        this.newPrice.precio = precioGeneral.precio;
        return;
      }
      
      // Si no se encuentra precio exacto, buscar coincidencias parciales
      const coincidenciaParcial = this.preciosActuales.find(precio => 
        precio.producto.toLowerCase().includes(nombreLimpio) || 
        nombreLimpio.includes(precio.producto.toLowerCase())
      );
      
      if (coincidenciaParcial) {
        this.precioActualMostrar = coincidenciaParcial;
        // Pre-llenar automáticamente el campo de precio
        this.newPrice.precio = coincidenciaParcial.precio;
        return;
      }
      
      // No se encontró precio
      this.precioActualMostrar = null;
    }
  },
  watch: {
    // Observar cambios en clienteActual para actualizar el filtro
    clienteActual: {
      immediate: true,
      handler(nuevoCliente) {
        if (nuevoCliente && this.clientes.some(c => c.id === nuevoCliente)) {
          this.filtroCliente = nuevoCliente;
          
          // Si estamos agregando un nuevo precio y el cliente está definido,
          // preseleccionamos ese cliente y marcamos como precio específico
          if (nuevoCliente) {
            this.newPrice.esClienteEspecifico = true;
            this.newPrice.clienteId = nuevoCliente;
          }
        }
      }
    },

    // Observar cambios en el nombre del producto para mostrar precio actual
    'newPrice.producto': {
      handler(nuevoProducto) {
        // Usar debounce para evitar múltiples búsquedas mientras se escribe
        clearTimeout(this.buscarPrecioTimeout);
        this.buscarPrecioTimeout = setTimeout(() => {
          this.buscarPrecioActual(nuevoProducto);
        }, 500); // Esperar 500ms después de que el usuario deje de escribir
      }
    },

    // Observar cambios en la configuración de cliente específico
    'newPrice.esClienteEspecifico': {
      handler() {
        // Actualizar precio mostrado cuando cambie la configuración
        if (this.newPrice.producto) {
          this.buscarPrecioActual(this.newPrice.producto);
        }
      }
    },

    // Observar cambios en el cliente seleccionado
    'newPrice.clienteId': {
      handler() {
        // Actualizar precio mostrado cuando cambie el cliente
        if (this.newPrice.producto) {
          this.buscarPrecioActual(this.newPrice.producto);
        }
      }
    }
  },
  mounted() {
    this.cargarPreciosActuales();
  },
  beforeDestroy() {
    // Limpiar timeout para evitar memory leaks
    if (this.buscarPrecioTimeout) {
      clearTimeout(this.buscarPrecioTimeout);
    }
  }
};
</script>

<style scoped>
.precio-historial-btn {
  --terminal-bg: #0a0a0a;
  --amber: #ffb000;
  --amber-glow: #ffb00080;
  background: rgba(0, 20, 0, 0.9);
  color: var(--amber);
  border: 2px solid var(--amber);
  padding: 12px 22px;
  border-radius: 0;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 2px;
  box-shadow: 0 0 15px var(--amber-glow);
}

.precio-historial-btn:hover {
  background: var(--amber);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px var(--amber-glow);
  transform: translateY(-2px);
}

.precio-historial-btn:focus {
  outline: 2px solid rgba(255, 255, 255, 0.6);
  outline-offset: 2px;
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
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  font-size: 1.1rem;
  font-family: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #333;
}

.header-icon {
  font-size: 1.6em;
  margin-right: 10px;
}

.add-price-form {
  margin-bottom: 30px;
}

.form-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.form-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.25em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-icon {
  font-size: 1.3em;
}

.form-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.form-group .input-wrapper {
  flex: 1;
  min-width: 200px;
}

.form-group .form-input {
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1.05em;
  transition: border-color 0.3s, box-shadow 0.3s;
  background-color: #f9f9f9;
  color: #333;
}

.form-group .form-input:focus {
  border-color: #4CAF50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.2);
  outline: none;
}

.cliente-especifico-wrapper {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 10px 0;
  width: 100%;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 1em;
  color: #555;
  position: relative;
}

.checkbox-wrapper .checkmark {
  height: 20px;
  width: 20px;
  background-color: #eee;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 8px;
  position: relative;
  transition: background-color 0.3s;
}

.checkbox-wrapper input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkbox-wrapper .checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 3px 3px 0;
  transform: rotate(45deg);
}

.checkbox-wrapper input:checked ~ .checkmark {
  background-color: #4CAF50;
  border-color: #4CAF50;
}

.checkbox-wrapper input:checked ~ .checkmark:after {
  display: block;
}

.checkbox-label {
  font-weight: 500;
}

.cliente-selector {
  width: 100%;
  margin: 10px 0;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.selector-label {
  font-size: 1em;
  color: #555;
  margin-bottom: 8px;
  display: block;
}

.cliente-botones {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cliente-btn {
  padding: 12px 18px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  color: white;
  font-weight: 600;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 100px;
  text-align: center;
  font-size: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  background-color: var(--cliente-color, #2196F3);
}

.cliente-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.cliente-seleccionado {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.cliente-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.cliente-seleccionado {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.filter-section {
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 249, 250, 0.9));
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
  font-size: 1.1em;
  margin-bottom: 15px;
  font-weight: 600;
}

.filter-icon {
  font-size: 1.3em;
  color: #2196F3;
}

.cliente-filtro-botones {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cliente-filtro-btn {
  padding: 12px 18px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  color: white;
  font-weight: 600;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 100px;
  text-align: center;
  font-size: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  background-color: var(--cliente-color, #607D8B);
}

.cliente-filtro-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.cliente-filtro-seleccionado {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  background: linear-gradient(135deg, var(--cliente-color, #607D8B), rgba(0, 0, 0, 0.1));
}

.cliente-filtro-btn:first-child {
  background: linear-gradient(135deg, #607D8B, #455A64);
}

.filter-all-icon {
  font-size: 1em;
}

.maquila-ozuna-section {
  margin-bottom: 16px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(248, 250, 248, 0.95);
}

.maquila-ozuna-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}

.maquila-ozuna-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: #5a6b5f;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.maquila-ozuna-now {
  font-size: 0.82rem;
  color: #07711e;
  font-weight: 700;
  white-space: nowrap;
}

.maquila-ozuna-hint {
  cursor: help;
  color: #9e9e9e;
  font-weight: 400;
  margin-left: 1px;
}

.maquila-ozuna-input-num,
.maquila-ozuna-input-date {
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  background: #fff;
  color: #333;
}

.maquila-ozuna-input-num:focus,
.maquila-ozuna-input-date:focus {
  border-color: #4caf50;
  outline: none;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.18);
}

.maquila-ozuna-input-num {
  width: 5.5rem;
  min-width: 0;
  padding: 6px 8px;
  font-size: 0.88rem;
}

.maquila-ozuna-input-date {
  width: auto;
  min-width: 8.5rem;
  padding: 5px 6px;
  font-size: 0.82rem;
}

.maquila-ozuna-guardar {
  padding: 6px 12px;
  border: 1px solid rgba(7, 113, 30, 0.45);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  background: #fff;
  color: #07711e;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.maquila-ozuna-guardar:hover:not(:disabled) {
  background: rgba(7, 113, 30, 0.08);
  border-color: rgba(7, 113, 30, 0.7);
}

.maquila-ozuna-guardar:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 520px) {
  .maquila-ozuna-row {
    gap: 6px;
  }

  .maquila-ozuna-input-num {
    flex: 1 1 5rem;
  }

  .maquila-ozuna-input-date {
    flex: 1 1 100%;
    min-width: 0;
  }

  .maquila-ozuna-guardar {
    flex: 1 1 auto;
    min-width: 5rem;
  }
}

.add-btn {
  background: linear-gradient(135deg, #4CAF50, #388E3C);
  color: white;
  border: none;
  padding: 12px 22px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.05em;
  font-weight: bold;
  transition: background-color 0.3s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);
}

.add-btn:hover {
  background: linear-gradient(135deg, #388E3C, #2E7D32);
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(76, 175, 80, 0.4);
}

.add-btn:disabled {
  background: #a5d6a7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 1.2em;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.product-card {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  position: relative;
  border: 2px solid;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.precio-especifico {
  border: 2px solid;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #eee;
}

.product-name {
  margin: 0;
  color: #333;
  font-size: 1.2em;
  flex-grow: 1;
  text-align: left;
  padding-right: 10px;
}

.product-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.edit-btn,
.history-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 7px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.2);
}

.edit-btn {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 2px 6px rgba(217, 119, 6, 0.25);
}

.edit-btn:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 3px 10px rgba(217, 119, 6, 0.35);
}

.history-btn:hover {
  background-color: #1976D2;
  box-shadow: 0 3px 10px rgba(33, 150, 243, 0.3);
}

.edit-icon,
.history-icon {
  font-size: 1em;
}

.product-info {
  text-align: left;
  padding-top: 10px;
  border-top: 1px dashed #eee;
}

.price {
  font-size: 1.35em;
  font-weight: bold;
  color: #4CAF50;
  margin: 5px 0;
}

.date {
  font-size: 1em;
  color: #666;
  margin: 5px 0;
}

.cliente-especifico-tag {
  font-size: 0.9em;
  background-color: var(--tag-color, #2196F3);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 5px 0;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.client-icon {
  font-size: 0.9em;
}

.date-icon, .count-icon {
  font-size: 0.9em;
  margin-right: 4px;
  color: #666;
}

.historial-count {
  font-size: 0.9em;
  color: #666;
  margin: 5px 0;
  font-style: italic;
}

.historial-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
  backdrop-filter: blur(5px);
}

.historial-modal {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 249, 250, 0.95));
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  overflow: hidden;
}

.historial-content {
  padding: 25px;
  overflow-y: auto;
  max-height: 85vh;
}

.producto-card {
  border-color: var(--border-color, transparent);
  background-color: var(--bg-color, #f5f5f5);
}

.cliente-tag {
  background-color: var(--tag-color, #2196F3);
  color: white;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 0.85em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin: 20px 0;
}

.historial-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
}

.historial-table th,
.historial-table td {
  padding: 16px 14px;
  border-bottom: 1px solid #eee;
  text-align: left;
}

.historial-table th {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  font-weight: 600;
  color: #495057;
  font-size: 1em;
  border-bottom: 2px solid #dee2e6;
}

.historial-row:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.05), rgba(33, 150, 243, 0.05));
  transform: scale(1.001);
  transition: all 0.2s ease;
}

.table-icon {
  margin-right: 5px;
  font-size: 0.9em;
}

.date-cell, .price-cell, .client-cell, .change-cell {
  font-size: 1em;
  color: #495057;
}

.price-cell {
  font-weight: 600;
  color: #28a745;
}

.client-cell {
  text-align: center;
}

.change-cell {
  text-align: center;
  font-weight: 600;
}

.general-tag {
  background: linear-gradient(135deg, #6c757d, #495057);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.9em;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.general-icon {
  font-size: 0.9em;
}

.historial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.historial-icon {
  font-size: 1.3em;
  margin-right: 10px;
}

.historial-count {
  font-size: 0.8em;
  color: #666;
  margin: 5px 0;
  font-style: italic;
}

.precio-subio {
  color: #f44336;
  font-weight: bold;
}

.precio-bajo {
  color: #4CAF50;
  font-weight: bold;
}

.change-indicator {
  font-size: 1em;
  font-weight: bold;
}

.actions-cell {
  width: 50px;
  text-align: center;
}

.delete-btn {
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  padding: 5px;
  font-size: 20px;
  transition: color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(244, 67, 54, 0.2);
}

.delete-btn:hover {
  color: #d32f2f;
  box-shadow: 0 3px 10px rgba(244, 67, 54, 0.3);
}

.delete-icon {
  font-weight: bold;
  font-size: 1.1em;
}

.pagination-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 15px 0;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 5px;
  font-size: 1em;
  color: #666;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.pagination-text {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 1em;
  color: #555;
}

.info-icon {
  font-size: 0.9em;
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 8px;
}

.items-per-page label {
  font-weight: 500;
  font-size: 1em;
  color: #555;
}

.items-per-page select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: #f9f9f9;
  color: #333;
  font-size: 1em;
  cursor: pointer;
  transition: border-color 0.3s;
}

.items-per-page select:focus {
  border-color: #4CAF50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.2);
  outline: none;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.pagination-numbers {
  display: flex;
  gap: 2px;
  margin: 0 10px;
}

.pagination-btn {
  background-color: #fff;
  color: #007bff;
  border: 1px solid #dee2e6;
  padding: 10px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 40px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 123, 255, 0.2);
  font-size: 1em;
}

.pagination-btn:hover:not(:disabled),
.pagination-number:hover:not(.active) {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.pagination-btn:disabled {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
  border-color: #dee2e6;
}

.pagination-number.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.pagination-icon {
  font-size: 1em;
}

/* Responsive Design Mejorado */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    padding: 20px;
    margin: 10px;
    max-height: 95vh;
    overflow-y: auto;
  }
  
  .form-group {
    flex-direction: column;
    gap: 15px;
  }
  
  .form-group .input-wrapper {
    min-width: 100%;
  }
  
  .products-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .historial-modal {
    width: 95%;
    margin: 10px;
    max-height: 95vh;
  }
  
  .cliente-botones, .cliente-filtro-botones {
    flex-direction: column;
    gap: 8px;
  }
  
  .cliente-btn, .cliente-filtro-btn {
    min-width: 100%;
    padding: 12px 16px;
  }
  
  .filter-section {
    padding: 15px;
  }
  
  .categoria-section {
    padding: 10px;
  }
  
  .floating-close-btn {
    bottom: 20px;
    right: 20px;
    padding: 10px 16px;
    font-size: 0.85em;
    min-width: 90px;
  }
  
  .floating-close-text {
    display: none;
  }
}

@media (max-width: 480px) {
  .modal-content {
    font-size: 1rem;
  }
  
  .modal-header h2 {
    font-size: 1.2em;
  }
  
  .form-header h3 {
    font-size: 1em;
  }
  
  .prices-header h3 {
    font-size: 1.1em;
  }
  
  .categoria-title {
    font-size: 1em;
  }
  
  .pagination-info {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
  
  .items-per-page {
    justify-content: center;
  }
  
  .pagination-controls {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px;
  }
  
  .pagination-numbers {
    margin: 0 5px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .pagination-btn,
  .pagination-number {
    min-width: 35px;
    padding: 6px 10px;
    font-size: 14px;
  }
  
  .historial-content table {
    font-size: 12px;
  }
  
  .historial-content th,
  .historial-content td {
    padding: 8px 4px;
  }
  
  .confirmacion-modal-content {
    width: 95%;
    padding: 20px;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .cliente-afectado {
    flex-direction: column;
    align-items: flex-start;
    padding: 15px 0;
    gap: 10px;
  }
  
  .cliente-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
  }
  
  .cliente-tag {
    min-width: auto;
    padding: 6px 12px;
    font-size: 0.8em;
  }
  
  .precio-info {
    font-size: 0.85em;
    gap: 3px;
  }
  
  .decision-opciones {
    width: 100%;
    margin-top: 10px;
    padding-top: 10px;
  }
  
  .radio-group {
    gap: 12px;
  }
  
  .radio-option {
    font-size: 0.85em;
    gap: 8px;
  }
  
  .confirmacion-footer {
    flex-direction: column;
    gap: 10px;
  }
  
  .btn-cancelar, .btn-confirmar {
    width: 100%;
    padding: 12px 20px;
  }
  
  .floating-close-btn {
    bottom: 15px;
    right: 15px;
    padding: 12px;
    min-width: 55px;
    border-radius: 50%;
    font-size: 0.8em;
  }
  
  .floating-close-text {
    display: none;
  }
  
  .floating-close-icon {
    font-size: 1.3em;
  }
}

.categoria-section {
  margin-bottom: 30px;
  padding: 15px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(248, 249, 250, 0.8));
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.categoria-title {
  color: #333;
  font-size: 1.2em;
  margin-bottom: 15px;
  padding: 10px 0;
  border-bottom: 3px solid #4CAF50;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(90deg, rgba(76, 175, 80, 0.1), transparent);
  padding-left: 15px;
  border-radius: 8px;
}

.categoria-icon {
  font-size: 1.3em;
  color: #4CAF50;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.prices-header {
  margin-bottom: 20px;
  padding: 15px 0;
  border-bottom: 2px solid #eee;
}

.prices-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.3em;
  display: flex;
  align-items: center;
  gap: 10px;
}

.prices-icon {
  font-size: 1.4em;
  color: #4CAF50;
}

.confirmacion-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1002;
}

.confirmacion-modal-content {
  background-color: white;
  padding: 25px;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
}

.confirmacion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  color: #333;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.warning-icon {
  font-size: 1.2em;
  margin-right: 10px;
}

.confirmacion-body {
  margin-bottom: 25px;
  text-align: left;
  padding: 0 10px;
}

.confirmacion-mensaje {
  font-size: 1.1em;
  color: #555;
  margin-bottom: 15px;
}

.clientes-afectados {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 15px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.cliente-afectado {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed #eee;
}

.cliente-afectado:last-child {
  border-bottom: none;
}

.cliente-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-grow: 1;
}

.cliente-tag {
  font-size: 0.9em;
  font-weight: bold;
  color: white;
  padding: 4px 10px;
  border-radius: 15px;
  display: inline-block;
  min-width: 120px;
  text-align: center;
  background-color: #2196F3;
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.2);
}

.precio-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  font-size: 0.9em;
  color: #666;
}

.precio-actual, .precio-nuevo {
  font-weight: 500;
  color: #333;
}

.decision-opciones {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.decision-label {
  font-size: 0.9em;
  color: #555;
  margin-bottom: 8px;
  display: block;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.9em;
  color: #333;
}

.radio-option input[type="radio"] {
  transform: scale(1.1);
  accent-color: #4CAF50;
}

.radio-custom {
  height: 20px;
  width: 20px;
  border: 2px solid #ccc;
  border-radius: 50%;
  position: relative;
  margin-right: 8px;
}

.radio-option input:checked ~ .radio-custom {
  border-color: #4CAF50;
}

.radio-option input:checked ~ .radio-custom:after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #4CAF50;
}

.radio-text {
  font-weight: 500;
}

.radio-text.mantener {
  color: #4CAF50;
}

.radio-text.sobreescribir {
  color: #f44336;
}

.decision-label {
  font-size: 0.9em;
  color: #555;
  margin-bottom: 8px;
  display: block;
}

.confirmacion-footer {
  display: flex;
  justify-content: space-around;
  gap: 15px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.btn-cancelar, .btn-confirmar {
  padding: 10px 25px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  font-weight: bold;
  transition: background-color 0.3s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.btn-cancelar {
  background-color: #e0e0e0;
  color: #333;
}

.btn-cancelar:hover {
  background-color: #d0d0d0;
}

.btn-confirmar {
  background: linear-gradient(135deg, #4CAF50, #388E3C);
  color: white;
  box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);
}

.btn-confirmar:hover {
  background: linear-gradient(135deg, #388E3C, #2E7D32);
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(76, 175, 80, 0.4);
}

.btn-confirmar:disabled {
  background: #a5d6a7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cancel-icon, .confirm-icon {
  font-size: 1.1em;
}

.overwrite-icon {
  font-size: 1.1em;
  color: #f44336;
}

.keep-icon {
  font-size: 1.1em;
  color: #4CAF50;
}

/* Botón Flotante de Cerrar */
.floating-close-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 50px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
  z-index: 9999;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  min-width: 100px;
  pointer-events: auto;
}

.floating-close-btn:hover {
  background: linear-gradient(135deg, #c82333, #bd2130);
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 25px rgba(220, 53, 69, 0.5);
}

.floating-close-btn:active {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
}

.floating-close-icon {
  font-size: 1em;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  color: #ffffff;
}

.floating-close-text {
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Asegurar que el botón flotante esté siempre visible */
.modal-overlay .floating-close-btn {
  position: fixed !important;
  z-index: 99999 !important;
  visibility: visible !important;
  opacity: 1 !important;
}

/* Estilos para el indicador de precio actual */
.precio-actual-indicator {
  margin-top: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
  border: 2px solid #4CAF50;
  border-radius: 12px;
  font-size: 0.9em;
  color: #2E7D32;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
  backdrop-filter: blur(5px);
  border-left: 4px solid #4CAF50;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.precio-actual-indicator .precio-icon {
  font-size: 1.1em;
  color: #4CAF50;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.precio-actual-indicator .precio-texto {
  font-weight: 600;
  color: #1B5E20;
}

.precio-actual-indicator .precio-valor {
  font-weight: 700;
  font-size: 1.1em;
  color: #2E7D32;
  background: rgba(76, 175, 80, 0.2);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.precio-actual-indicator .precio-cliente {
  font-weight: 600;
  color: #1565C0;
  background: rgba(33, 150, 243, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85em;
}

.precio-actual-indicator .precio-general {
  font-weight: 600;
  color: #424242;
  background: rgba(96, 125, 139, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85em;
}

.precio-actual-indicator .precio-fecha {
  font-size: 0.8em;
  color: #616161;
  font-style: italic;
  margin-left: auto;
}

/* Responsive para el indicador de precio */
@media (max-width: 768px) {
  .precio-actual-indicator {
    padding: 10px 12px;
    font-size: 0.85em;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .precio-actual-indicator .precio-fecha {
    margin-left: 0;
    margin-top: 4px;
  }
  
  .precio-actual-indicator .precio-valor {
    font-size: 1em;
  }
}

@media (max-width: 480px) {
  .precio-actual-indicator {
    padding: 8px 10px;
    font-size: 0.8em;
    border-radius: 8px;
  }
  
  .precio-actual-indicator .precio-valor {
    font-size: 0.95em;
    padding: 1px 6px;
  }
  
  .precio-actual-indicator .precio-cliente,
  .precio-actual-indicator .precio-general {
    font-size: 0.8em;
    padding: 1px 4px;
  }
}
</style> 