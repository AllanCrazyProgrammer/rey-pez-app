<template>
  <div class="lista-deudas">
    <div class="back-button-container">
      <BackButton to="/procesos/deudas" />
    </div>
    
    <!-- Header moderno -->
    <div class="header-section">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-list">📋</i>
          Lista de Deudas a Proveedores
        </h1>
        <p class="subtitle">Administra y monitorea todas las deudas pendientes</p>
      </div>
    </div>
    
    <!-- Filtros modernos -->
    <div class="filtros-container">
      <div class="filtros-card">
        <h3 class="filtros-title">
          <i class="icon-filter">🔍</i>
          Filtros de Búsqueda
        </h3>
        <div class="filtros-grid">
          <div class="filtro-group">
            <label for="filtroProveedor">Proveedor:</label>
            <select id="filtroProveedor" v-model="filtroProveedor" class="modern-select">
              <option value="">Todos los proveedores</option>
              <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.id">
                {{ proveedor.nombre }}
              </option>
            </select>
            <!-- Indicador de color del proveedor seleccionado -->
            <div v-if="filtroProveedor" class="proveedor-color-indicator">
              <div 
                class="color-dot" 
                :style="{ backgroundColor: getProveedorColor(filtroProveedor) }"
              ></div>
              <span>{{ getNombreProveedorSeleccionado() }}</span>
            </div>
          </div>
          
          <div class="filtro-group">
            <label for="filtroEstado">Estado:</label>
            <select id="filtroEstado" v-model="filtroEstado" class="modern-select">
              <option value="">Todos los estados</option>
              <option value="pendiente">No Pagados (Pendientes)</option>
              <option value="pagado">Pagados</option>
            </select>
          </div>
          
          <div class="filtro-group fecha-group">
            <label>Rango de fechas:</label>
            <div class="fecha-inputs">
              <input type="date" v-model="filtroFechaDesde" class="modern-input" placeholder="Desde">
              <span class="fecha-separator">a</span>
              <input type="date" v-model="filtroFechaHasta" class="modern-input" placeholder="Hasta">
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Resumen moderno -->
    <div class="resumen-container">
      <div class="resumen-card saldo-pendiente">
        <div class="card-icon">💰</div>
        <div class="card-content">
          <h3>Saldo Pendiente</h3>
          <p class="amount">${{ formatNumber(totalPendiente) }}</p>
        </div>
      </div>
    </div>
    
    <!-- Acciones modernas -->
    <div class="acciones-container">
      <router-link to="/procesos/deudas/nueva" class="btn-action btn-nueva-deuda">
        <i class="icon">➕</i>
        <span>Nueva Deuda</span>
      </router-link>
      
      <button @click="openHistorialPreciosModal" class="btn-action btn-historial-precios">
        <i class="icon">📈</i>
        <span>Historial de Precios</span>
      </button>
    </div>

    <!-- Sección de Abonos por Proveedor -->
    <div v-if="filtroProveedor" class="abonos-proveedor-section">
      <div class="proveedor-selected-info">
        <h3>Gestión de Abonos - {{ getNombreProveedorSeleccionado() }}</h3>
        <div class="abonos-actions">
          <button @click="abrirAbonoGeneral" class="btn-abono-general" :disabled="!tieneDeudasPendientes">
            <i class="fas fa-money-check-alt"></i>
            Abono General
          </button>
          <button @click="abrirHistorialAbonos" class="btn-historial-abonos">
            <i class="fas fa-history"></i>
            Historial de Abonos
          </button>
        </div>
      </div>
    </div>
    
    <!-- Estados de carga -->
    <div v-if="cargando" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando deudas...</p>
    </div>
    
    <div v-else-if="deudas.length === 0" class="empty-state">
      <div class="empty-icon">📄</div>
      <h3>No hay deudas registradas</h3>
      <p>Comienza creando tu primera deuda a proveedores</p>
      <router-link to="/procesos/deudas/nueva" class="btn-action btn-nueva-deuda">
        <i class="icon">➕</i>
        <span>Crear Nueva Deuda</span>
      </router-link>
    </div>
    
    <div v-else class="deudas-container">
      <div class="paginacion-info">
        <p>Mostrando {{ totalDeudas }} deudas agrupadas por proveedor</p>
      </div>
      
      <!-- Deudas agrupadas por proveedor -->
      <div v-for="grupo in deudasAgrupadasPorProveedor" :key="grupo.proveedor.id" class="proveedor-grupo">
        <!-- Título del proveedor -->
        <div class="proveedor-header">
          <div class="proveedor-title">
            <div 
              class="proveedor-color-circle" 
              :style="{ backgroundColor: grupo.proveedor.color }"
            ></div>
                         <h2 
               :class="['proveedor-nombre', 'clickeable', { 'filtrado': filtroProveedor === grupo.proveedor.id }]" 
               @click="filtrarPorProveedor(grupo.proveedor.id)" 
               :title="filtroProveedor === grupo.proveedor.id ? 'Haz clic para quitar el filtro' : 'Haz clic para filtrar por este proveedor'"
             >
               {{ grupo.proveedor.nombre }}
               <i :class="['fas', filtroProveedor === grupo.proveedor.id ? 'fa-check-circle' : 'fa-filter', 'filter-icon']"></i>
             </h2>
          </div>
          <div class="proveedor-resumen">
            <div class="resumen-item">
              <span class="label">Total Deuda:</span>
              <span class="value">${{ formatNumber(grupo.totalDeuda) }}</span>
            </div>
            <div class="resumen-item">
              <span class="label">Saldo Pendiente:</span>
              <span class="value pendiente">${{ formatNumber(grupo.totalPendiente) }}</span>
            </div>
            <div class="resumen-item">
              <span class="label">Deudas:</span>
              <span class="value">{{ grupo.deudas.length }}</span>
            </div>
          </div>
        </div>
        
        <!-- Tabla de deudas del proveedor -->
        <div class="tabla-container-proveedor">
          <table class="tabla-deudas-proveedor">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto Total</th>
                <th>Saldo Pendiente</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="deuda in grupo.deudas" :key="deuda.id" :class="{ 'deuda-pagada': deuda.estado === 'pagado' }">
                <td>{{ formatearFecha(deuda.fecha) }}</td>
                <td>${{ formatNumber(deuda.total) }}</td>
                <td>${{ formatNumber(deuda.saldoPendiente) }}</td>
                <td>
                  <span :class="'estado-badge ' + deuda.estado">
                    {{ deuda.estado === 'pendiente' ? 'Pendiente' : 'Pagado' }}
                  </span>
                </td>
                <td class="acciones">
                  <button @click="verDetalle(deuda)" class="btn-detalle" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button @click="agregarAbono(deuda)" class="btn-abono" :disabled="deuda.estado === 'pagado'" title="Agregar abono">
                    <i class="fas fa-money-bill"></i>
                  </button>
                  <button @click="eliminarDeuda(deuda)" class="btn-eliminar" title="Eliminar deuda">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Modal de Detalle de Deuda -->
    <div v-if="showDetalleModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Detalle de Deuda</h2>
          <button @click="showDetalleModal = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="deuda-info editable-container">
            <p>
              <strong>Proveedor:</strong> 
              <span class="editable-field" @click="habilitarEdicionDeuda('proveedorNombre')">
                <span v-if="!campoEditandoDeuda || campoEditandoDeuda !== 'proveedorNombre'">
                  {{ deudaSeleccionada?.proveedorNombre }}
                </span>
                <input 
                  v-else 
                  v-model="deudaEditada.proveedorNombre" 
                  @blur="guardarCambiosDeuda" 
                  @keyup.enter="guardarCambiosDeuda"
                  ref="inputProveedorNombre"
                  type="text"
                >
              </span>
            </p>
            <p>
              <strong>Fecha:</strong> 
              <span class="editable-field" @click="habilitarEdicionDeuda('fecha')">
                <span v-if="!campoEditandoDeuda || campoEditandoDeuda !== 'fecha'">
                  {{ formatearFecha(deudaSeleccionada?.fecha) }}
                </span>
                <input 
                  v-else 
                  v-model="deudaEditada.fecha" 
                  @blur="guardarCambiosDeuda" 
                  @keyup.enter="guardarCambiosDeuda"
                  ref="inputFecha"
                  type="date"
                >
              </span>
            </p>
            <p>
              <strong>Estado:</strong> 
              <span :class="'estado-badge ' + deudaSeleccionada?.estado">
                {{ deudaSeleccionada?.estado === 'pendiente' ? 'Pendiente' : 'Pagado' }}
              </span>
            </p>
          </div>
          
          <h3>Productos <span class="small-text">(haga clic en un campo para editarlo)</span></h3>
          <table class="tabla-productos">
            <thead>
              <tr>
                <th>Kilos</th>
                <th>Producto</th>
                <th>Precio</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(producto, index) in productos" :key="index">
                <td @click="habilitarEdicionProducto(index, 'kilos')" class="editable-cell">
                  <span v-if="!producto.editando || producto.campoEditando !== 'kilos'">
                    {{ formatNumber(producto.kilos) }}
                  </span>
                  <input 
                    v-else 
                    v-model.number="producto.kilos" 
                    @blur="guardarCambiosProducto(index)" 
                    @keyup.enter="guardarCambiosProducto(index)"
                    ref="inputKilos"
                    type="number"
                    step="0.01"
                  >
                </td>
                <td @click="habilitarEdicionProducto(index, 'producto')" class="editable-cell">
                  <span v-if="!producto.editando || producto.campoEditando !== 'producto'">
                    {{ producto.producto }}
                  </span>
                  <input 
                    v-else 
                    v-model="producto.producto" 
                    @blur="guardarCambiosProducto(index)" 
                    @keyup.enter="guardarCambiosProducto(index)"
                    ref="inputProducto"
                    type="text"
                  >
                </td>
                <td @click="habilitarEdicionProducto(index, 'precio')" class="editable-cell">
                  <span v-if="!producto.editando || producto.campoEditando !== 'precio'">
                    ${{ formatNumber(producto.precio) }}
                  </span>
                  <input 
                    v-else 
                    v-model.number="producto.precio" 
                    @blur="guardarCambiosProducto(index)" 
                    @keyup.enter="guardarCambiosProducto(index)"
                    ref="inputPrecio"
                    type="number"
                    step="0.01"
                  >
                </td>
                <td>${{ formatNumber(producto.total) }}</td>
                <td>
                  <button @click="eliminarProducto(index)" class="btn-eliminar-sm">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="total-label">Total</td>
                <td>${{ formatNumber(totalProductos) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          
          <div class="add-product-section">
            <h4>Agregar Producto</h4>
            <ProductoSelector 
              :proveedor-id="deudaSeleccionada?.proveedorId"
              @agregar-producto="agregarProductoDesdeSelector"
            />
          </div>
          
          <h3>Abonos</h3>
          <div v-if="abonos.length === 0" class="no-abonos">
            <p>No hay abonos registrados para esta deuda.</p>
          </div>
          <table v-else class="tabla-abonos">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(abono, index) in abonos" :key="index">
                <td @click="habilitarEdicionAbono(index, 'fecha')" class="editable-cell">
                  <span v-if="!abono.editando || abono.campoEditando !== 'fecha'">
                    {{ formatearFecha(abono.fecha) }}
                  </span>
                  <input 
                    v-else 
                    v-model="abono.fecha" 
                    @blur="guardarCambiosAbono(index)" 
                    @keyup.enter="guardarCambiosAbono(index)"
                    ref="inputFechaAbono"
                    type="date"
                  >
                </td>
                <td @click="habilitarEdicionAbono(index, 'descripcion')" class="editable-cell">
                  <span v-if="!abono.editando || abono.campoEditando !== 'descripcion'">
                    {{ abono.descripcion }}
                  </span>
                  <input 
                    v-else 
                    v-model="abono.descripcion" 
                    @blur="guardarCambiosAbono(index)" 
                    @keyup.enter="guardarCambiosAbono(index)"
                    ref="inputDescripcionAbono"
                    type="text"
                  >
                </td>
                <td @click="habilitarEdicionAbono(index, 'monto')" class="editable-cell">
                  <span v-if="!abono.editando || abono.campoEditando !== 'monto'">
                    ${{ formatNumber(abono.monto) }}
                  </span>
                  <input 
                    v-else 
                    v-model.number="abono.monto" 
                    @blur="guardarCambiosAbono(index)" 
                    @keyup.enter="guardarCambiosAbono(index)"
                    ref="inputMontoAbono"
                    type="number"
                    step="0.01"
                  >
                </td>
                <td>
                  <button @click="eliminarAbono(index)" class="btn-eliminar-sm">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="total-label">Total Abonos</td>
                <td>${{ formatNumber(totalAbonos) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          
          <div class="resumen-deuda">
            <div class="resumen-item">
              <span>Total deuda:</span>
              <span>${{ formatNumber(deudaSeleccionada?.total) }}</span>
            </div>
            <div class="resumen-item">
              <span>Total abonos:</span>
              <span>${{ formatNumber(totalAbonos) }}</span>
            </div>
            <div class="resumen-item total">
              <span>Saldo pendiente:</span>
              <span>${{ formatNumber(calcularSaldoPendiente()) }}</span>
            </div>
          </div>
          
          <div class="modal-actions">
            <button @click="actualizarDeuda" class="btn-actualizar" :disabled="guardando">
              {{ guardando ? 'Guardando...' : 'Actualizar Deuda' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal de Agregar Abono -->
    <div v-if="showAbonoModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Agregar Abono</h2>
          <button @click="showAbonoModal = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="deuda-info">
            <p><strong>Proveedor:</strong> {{ deudaSeleccionada?.proveedorNombre }}</p>
            <p><strong>Fecha Deuda:</strong> {{ formatearFecha(deudaSeleccionada?.fecha) }}</p>
            <p><strong>Saldo Pendiente:</strong> ${{ formatNumber(deudaSeleccionada?.saldoPendiente) }}</p>
          </div>
          
          <form @submit.prevent="guardarAbono" class="form-abono">
            <div class="form-group">
              <label for="fechaAbono">Fecha:</label>
              <input id="fechaAbono" type="date" v-model="nuevoAbono.fecha" required>
            </div>
            <div class="form-group">
              <label for="descripcionAbono">Descripción:</label>
              <input id="descripcionAbono" type="text" v-model="nuevoAbono.descripcion" required placeholder="Ej: Pago parcial, Transferencia, etc.">
            </div>
            <div class="form-group">
              <label for="montoAbono">Monto:</label>
              <input id="montoAbono" type="number" v-model.number="nuevoAbono.monto" required min="1" :max="deudaSeleccionada?.saldoPendiente">
            </div>
            
            <div class="form-actions">
              <button type="button" @click="showAbonoModal = false" class="btn-cancelar">Cancelar</button>
              <button type="submit" class="btn-guardar" :disabled="guardando">
                {{ guardando ? 'Guardando...' : 'Guardar Abono' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Modal de Historial de Precios -->
    <PreciosProveedorPanel 
      :mostrar="showHistorialPreciosModal" 
      :proveedores="proveedores"
      @cerrar="showHistorialPreciosModal = false" 
    />

    <!-- Modal de Abono General -->
    <AbonoGeneralModal
      :mostrar="showAbonoGeneralModal"
      :proveedor="proveedorSeleccionadoParaAbono"
      @cerrar="showAbonoGeneralModal = false"
      @abono-aplicado="onAbonoAplicado"
    />

    <!-- Modal de Historial de Abonos -->
    <HistorialAbonosModal
      :mostrar="showHistorialAbonosModal"
      :proveedor="proveedorSeleccionadoParaAbono"
      @cerrar="showHistorialAbonosModal = false"
      @abono-eliminado="onAbonoEliminado"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, getDocs as getDocsWithQuery } from 'firebase/firestore';
import { useRouter } from 'vue-router';
import BackButton from '@/components/BackButton.vue';
import PreciosProveedorPanel from '@/components/Deudas/Precios/PreciosProveedorPanel.vue';
import ProductoSelector from '@/components/Deudas/ProductoSelector.vue';
import AbonoGeneralModal from '@/components/Deudas/AbonoGeneralModal.vue';
import HistorialAbonosModal from '@/components/Deudas/HistorialAbonosModal.vue';

export default {
  name: 'ListaDeudas',
  components: {
    BackButton,
    PreciosProveedorPanel,
    ProductoSelector,
    AbonoGeneralModal,
    HistorialAbonosModal
  },
  data() {
    return {
      deudas: [],
      proveedores: [],
      cargando: true,
      guardando: false,
      
      // Paginación
      paginaActual: 1,
      deudasPorPagina: 15,
      
      // Filtros
      filtroProveedor: '',
      filtroEstado: 'pendiente', // Por defecto mostrar solo deudas pendientes
      filtroFechaDesde: '',
      filtroFechaHasta: '',
      
      // Modales
      showDetalleModal: false,
      showAbonoModal: false,
      showHistorialPreciosModal: false,
      showAbonoGeneralModal: false,
      showHistorialAbonosModal: false,
      deudaSeleccionada: null,
      productos: [],
      abonos: [],
      proveedorSeleccionadoParaAbono: null,
      
      // Nuevo abono
      nuevoAbono: {
        fecha: this.obtenerFechaActual(),
        descripcion: '',
        monto: null
      },
      
      // Edición
      campoEditandoDeuda: null,
      deudaEditada: {
        proveedorNombre: '',
        fecha: ''
      }
    };
  },
  computed: {
    deudasFiltradas() {
      return this.deudas.filter(deuda => {
        // Filtro por proveedor
        if (this.filtroProveedor && deuda.proveedorId !== this.filtroProveedor) {
          return false;
        }
        
        // Filtro por estado
        if (this.filtroEstado && deuda.estado !== this.filtroEstado) {
          return false;
        }
        
        // Filtro por fecha desde
        if (this.filtroFechaDesde && deuda.fecha < this.filtroFechaDesde) {
          return false;
        }
        
        // Filtro por fecha hasta
        if (this.filtroFechaHasta && deuda.fecha > this.filtroFechaHasta) {
          return false;
        }
        
        return true;
      });
    },
    totalDeudas() {
      return this.deudasFiltradas.length;
    },
    totalPaginas() {
      return Math.ceil(this.totalDeudas / this.deudasPorPagina);
    },
    deudasPaginadas() {
      const inicio = (this.paginaActual - 1) * this.deudasPorPagina;
      const fin = inicio + this.deudasPorPagina;
      return this.deudasFiltradas.slice(inicio, fin);
    },
    deudasAgrupadasPorProveedor() {
      const grupos = {};
      
      this.deudasFiltradas.forEach(deuda => {
        const proveedorId = deuda.proveedorId;
        const proveedorNombre = deuda.proveedorNombre;
        
        if (!grupos[proveedorId]) {
          grupos[proveedorId] = {
            proveedor: {
              id: proveedorId,
              nombre: proveedorNombre,
              color: this.getProveedorColor(proveedorId)
            },
            deudas: [],
            totalDeuda: 0,
            totalPendiente: 0
          };
        }
        
        grupos[proveedorId].deudas.push(deuda);
        grupos[proveedorId].totalDeuda += deuda.total;
        grupos[proveedorId].totalPendiente += deuda.saldoPendiente;
      });
      
      // Convertir a array y ordenar por nombre de proveedor
      return Object.values(grupos).sort((a, b) => 
        a.proveedor.nombre.localeCompare(b.proveedor.nombre)
      );
    },
    paginasVisibles() {
      const paginas = [];
      const totalPaginas = this.totalPaginas;
      const actual = this.paginaActual;
      
      // Mostrar máximo 5 páginas
      let inicio = Math.max(1, actual - 2);
      let fin = Math.min(totalPaginas, inicio + 4);
      
      // Ajustar si estamos cerca del final
      if (fin - inicio < 4) {
        inicio = Math.max(1, fin - 4);
      }
      
      for (let i = inicio; i <= fin; i++) {
        paginas.push(i);
      }
      
      return paginas;
    },
    totalMontoDeudas() {
      return this.deudasFiltradas.reduce((sum, deuda) => sum + deuda.total, 0);
    },
    totalPendiente() {
      return this.deudasFiltradas.reduce((sum, deuda) => sum + deuda.saldoPendiente, 0);
    },
    totalPagado() {
      return this.deudasFiltradas.reduce((sum, deuda) => sum + (deuda.total - deuda.saldoPendiente), 0);
    },
    totalProductos() {
      return this.productos.reduce((sum, producto) => sum + producto.total, 0);
    },
    totalAbonos() {
      return this.abonos.reduce((sum, abono) => sum + abono.monto, 0);
    },
    
    tieneDeudasPendientes() {
      return this.deudasFiltradas.some(deuda => deuda.estado === 'pendiente');
    }
  },
  methods: {
    obtenerFechaActual() {
      const fecha = new Date();
      // Usar la zona horaria local para evitar problemas de UTC
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // getMonth() retorna 0-11
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${año}-${mes}-${dia}`;
    },
    cambiarPagina(pagina) {
      if (pagina >= 1 && pagina <= this.totalPaginas) {
        this.paginaActual = pagina;
        // Scroll hacia arriba al cambiar de página
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    async loadDeudas() {
      try {
        this.cargando = true;
        const querySnapshot = await getDocs(
          query(collection(db, 'deudas'), orderBy('fecha', 'desc'))
        );
        
        this.deudas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar deudas: ", error);
      } finally {
        this.cargando = false;
      }
    },
    async loadProveedores() {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedoresDeuda'));
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar proveedores: ", error);
      }
    },
    formatNumber(number) {
      return number ? number.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    },
    formatearFecha(fechaString) {
      if (!fechaString) return '';
      
      const fecha = new Date(fechaString + 'T00:00:00');
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    closeModalOnOverlay(event) {
      if (event.target === event.currentTarget) {
        this.showDetalleModal = false;
        this.showAbonoModal = false;
        this.showHistorialPreciosModal = false;
      }
    },
    async verDetalle(deuda) {
      this.deudaSeleccionada = deuda;
      this.productos = [];
      this.abonos = [];
      
      try {
        // Cargar productos
        const productosSnapshot = await getDocs(
          collection(db, 'deudas', deuda.id, 'productos')
        );
        
        this.productos = productosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Cargar abonos
        const abonosSnapshot = await getDocs(
          query(
            collection(db, 'deudas', deuda.id, 'abonos'),
            orderBy('fechaCreacion', 'desc')
          )
        );
        
        this.abonos = abonosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        this.showDetalleModal = true;
      } catch (error) {
        console.error("Error al cargar detalle de deuda: ", error);
      }
    },
    agregarAbono(deuda) {
      this.deudaSeleccionada = deuda;
      this.nuevoAbono = {
        fecha: this.obtenerFechaActual(),
        descripcion: '',
        monto: null
      };
      this.showAbonoModal = true;
    },
    async guardarAbono() {
      if (!this.nuevoAbono.descripcion || !this.nuevoAbono.monto) {
        alert('Por favor complete todos los campos del abono');
        return;
      }
      
      if (this.nuevoAbono.monto <= 0) {
        alert('El monto del abono debe ser mayor a cero');
        return;
      }
      
      if (this.nuevoAbono.monto > this.deudaSeleccionada.saldoPendiente) {
        alert('El monto del abono no puede ser mayor al saldo pendiente');
        return;
      }
      
      try {
        this.guardando = true;
        
        // Guardar el abono
        await addDoc(collection(db, 'deudas', this.deudaSeleccionada.id, 'abonos'), {
          descripcion: this.nuevoAbono.descripcion,
          monto: this.nuevoAbono.monto,
          fecha: this.nuevoAbono.fecha,
          fechaCreacion: new Date()
        });
        
        // Actualizar el saldo pendiente de la deuda
        const nuevoSaldoPendiente = this.deudaSeleccionada.saldoPendiente - this.nuevoAbono.monto;
        const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
        
        await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id), {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado
        });
        
        // Actualizar la deuda en el array local
        this.deudas = this.deudas.map(d => {
          if (d.id === this.deudaSeleccionada.id) {
            return {
              ...d,
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoEstado
            };
          }
          return d;
        });
        
        this.deudaSeleccionada.saldoPendiente = nuevoSaldoPendiente;
        this.deudaSeleccionada.estado = nuevoEstado;
        
        this.showAbonoModal = false;
        alert('Abono registrado correctamente');
      } catch (error) {
        console.error("Error al guardar abono: ", error);
        alert('Error al guardar abono: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    async eliminarDeuda(deuda) {
      if (confirm(`¿Está seguro que desea eliminar la deuda de ${deuda.proveedorNombre}? Esta acción no se puede deshacer.`)) {
        try {
          this.cargando = true;
          
          // Eliminar los productos de la deuda
          const productosSnapshot = await getDocs(collection(db, 'deudas', deuda.id, 'productos'));
          const batch = writeBatch(db);
          
          productosSnapshot.forEach((documento) => {
            batch.delete(doc(db, 'deudas', deuda.id, 'productos', documento.id));
          });
          
          // Eliminar los abonos de la deuda
          const abonosSnapshot = await getDocs(collection(db, 'deudas', deuda.id, 'abonos'));
          
          abonosSnapshot.forEach((documento) => {
            batch.delete(doc(db, 'deudas', deuda.id, 'abonos', documento.id));
          });
          
          // Ejecutar el batch para eliminar todos los documentos relacionados
          await batch.commit();
          
          // Eliminar la deuda principal
          await deleteDoc(doc(db, 'deudas', deuda.id));
          
          // Actualizar la lista de deudas localmente
          this.deudas = this.deudas.filter(d => d.id !== deuda.id);
          
          alert('Deuda eliminada correctamente');
        } catch (error) {
          console.error("Error al eliminar la deuda: ", error);
          alert('Error al eliminar la deuda: ' + error.message);
        } finally {
          this.cargando = false;
        }
      }
    },
    // Métodos para edición de deuda
    habilitarEdicionDeuda(campo) {
      this.campoEditandoDeuda = campo;
      if (campo === 'proveedorNombre') {
        this.deudaEditada.proveedorNombre = this.deudaSeleccionada.proveedorNombre;
        this.$nextTick(() => {
          this.$refs.inputProveedorNombre.focus();
        });
      } else if (campo === 'fecha') {
        this.deudaEditada.fecha = this.deudaSeleccionada.fecha;
        this.$nextTick(() => {
          this.$refs.inputFecha.focus();
        });
      }
    },
    
    async guardarCambiosDeuda() {
      if (!this.campoEditandoDeuda) return;
      
      const campo = this.campoEditandoDeuda;
      this.campoEditandoDeuda = null;
      
      if (campo === 'proveedorNombre' && this.deudaEditada.proveedorNombre === this.deudaSeleccionada.proveedorNombre) return;
      if (campo === 'fecha' && this.deudaEditada.fecha === this.deudaSeleccionada.fecha) return;
      
      try {
        // Actualizar en Firestore
        await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id), {
          [campo]: this.deudaEditada[campo]
        });
        
        // Actualizar el objeto local
        this.deudaSeleccionada[campo] = this.deudaEditada[campo];
        
        // Actualizar en la lista principal
        this.deudas = this.deudas.map(d => {
          if (d.id === this.deudaSeleccionada.id) {
            return {
              ...d,
              [campo]: this.deudaEditada[campo]
            };
          }
          return d;
        });
      } catch (error) {
        console.error("Error al actualizar deuda: ", error);
        alert('Error al guardar cambios: ' + error.message);
      }
    },
    
    // Métodos para edición de productos
    habilitarEdicionProducto(index, campo) {
      this.productos = this.productos.map((producto, i) => {
        if (i === index) {
          return {
            ...producto,
            editando: true,
            campoEditando: campo
          };
        } else {
          return {
            ...producto,
            editando: false,
            campoEditando: null
          };
        }
      });
      
      this.$nextTick(() => {
        const refName = `input${campo.charAt(0).toUpperCase() + campo.slice(1)}`;
        if (this.$refs[refName] && this.$refs[refName][0]) {
          this.$refs[refName][0].focus();
        }
      });
    },
    
    async guardarCambiosProducto(index) {
      const producto = this.productos[index];
      if (!producto.editando) return;
      
      // Recalcular total
      if (producto.campoEditando === 'kilos' || producto.campoEditando === 'precio') {
        producto.total = producto.kilos * producto.precio;
      }
      
      try {
        // Actualizar en Firestore
        await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id, 'productos', producto.id), {
          kilos: producto.kilos,
          producto: producto.producto,
          precio: producto.precio,
          total: producto.total
        });
        
        // Actualizar el total de la deuda
        const nuevoTotal = this.productos.reduce((sum, p) => sum + p.total, 0);
        const nuevoSaldoPendiente = nuevoTotal - this.totalAbonos;
        
        await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id), {
          total: nuevoTotal,
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
        });
        
        // Actualizar deuda local
        this.deudaSeleccionada.total = nuevoTotal;
        this.deudaSeleccionada.saldoPendiente = nuevoSaldoPendiente;
        this.deudaSeleccionada.estado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
        
        // Actualizar en la lista principal
        this.deudas = this.deudas.map(d => {
          if (d.id === this.deudaSeleccionada.id) {
            return {
              ...d,
              total: nuevoTotal,
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
            };
          }
          return d;
        });
        
        // Desactivar modo edición
        producto.editando = false;
        producto.campoEditando = null;
      } catch (error) {
        console.error("Error al actualizar producto: ", error);
        alert('Error al guardar cambios del producto: ' + error.message);
      }
    },
    
    async agregarProducto() {
      if (!this.nuevoProducto.kilos || !this.nuevoProducto.producto || !this.nuevoProducto.precio) {
        alert('Por favor complete todos los campos del producto');
        return;
      }
      
      try {
        this.guardando = true;
        
        const total = this.nuevoProducto.kilos * this.nuevoProducto.precio;
        
        // Guardar en Firestore
        const productoRef = await addDoc(collection(db, 'deudas', this.deudaSeleccionada.id, 'productos'), {
          kilos: this.nuevoProducto.kilos,
          producto: this.nuevoProducto.producto,
          precio: this.nuevoProducto.precio,
          total: total
        });
        
        // Agregar a la lista local
        this.productos.push({
          id: productoRef.id,
          kilos: this.nuevoProducto.kilos,
          producto: this.nuevoProducto.producto,
          precio: this.nuevoProducto.precio,
          total: total,
          editando: false,
          campoEditando: null
        });
        
        // Actualizar el total de la deuda
        const nuevoTotal = this.productos.reduce((sum, p) => sum + p.total, 0);
        const nuevoSaldoPendiente = nuevoTotal - this.totalAbonos;
        
        await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id), {
          total: nuevoTotal,
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
        });
        
        // Actualizar deuda local
        this.deudaSeleccionada.total = nuevoTotal;
        this.deudaSeleccionada.saldoPendiente = nuevoSaldoPendiente;
        this.deudaSeleccionada.estado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
        
        // Actualizar en la lista principal
        this.deudas = this.deudas.map(d => {
          if (d.id === this.deudaSeleccionada.id) {
            return {
              ...d,
              total: nuevoTotal,
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
            };
          }
          return d;
        });
        
        // Limpiar formulario
        this.nuevoProducto = {
          kilos: null,
          producto: '',
          precio: null
        };
      } catch (error) {
        console.error("Error al agregar producto: ", error);
        alert('Error al agregar producto: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    async eliminarProducto(index) {
      if (!confirm('¿Está seguro de eliminar este producto?')) return;
      
      const producto = this.productos[index];
      
      try {
        this.guardando = true;
        
        // Eliminar de Firestore
        await deleteDoc(doc(db, 'deudas', this.deudaSeleccionada.id, 'productos', producto.id));
        
        // Eliminar de la lista local
        this.productos.splice(index, 1);
        
        // Actualizar el total de la deuda
        const nuevoTotal = this.productos.reduce((sum, p) => sum + p.total, 0);
        const nuevoSaldoPendiente = nuevoTotal - this.totalAbonos;
        
        await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id), {
          total: nuevoTotal,
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
        });
        
        // Actualizar deuda local
        this.deudaSeleccionada.total = nuevoTotal;
        this.deudaSeleccionada.saldoPendiente = nuevoSaldoPendiente;
        this.deudaSeleccionada.estado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
        
        // Actualizar en la lista principal
        this.deudas = this.deudas.map(d => {
          if (d.id === this.deudaSeleccionada.id) {
            return {
              ...d,
              total: nuevoTotal,
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
            };
          }
          return d;
        });
      } catch (error) {
        console.error("Error al eliminar producto: ", error);
        alert('Error al eliminar producto: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    // Métodos para edición de abonos
    habilitarEdicionAbono(index, campo) {
      this.abonos = this.abonos.map((abono, i) => {
        if (i === index) {
          return {
            ...abono,
            editando: true,
            campoEditando: campo
          };
        } else {
          return {
            ...abono,
            editando: false,
            campoEditando: null
          };
        }
      });
      
      this.$nextTick(() => {
        const refName = `input${campo.charAt(0).toUpperCase() + campo.slice(1)}Abono`;
        if (this.$refs[refName] && this.$refs[refName][0]) {
          this.$refs[refName][0].focus();
        }
      });
    },
    
    async guardarCambiosAbono(index) {
      const abono = this.abonos[index];
      if (!abono.editando) return;
      
      const montoAnterior = this.abonos.find(a => a.id === abono.id)?.monto || 0;
      
      try {
        // Actualizar en Firestore
        await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id, 'abonos', abono.id), {
          fecha: abono.fecha,
          descripcion: abono.descripcion,
          monto: abono.monto
        });
        
        // Si cambió el monto, actualizar el saldo pendiente
        if (abono.monto !== montoAnterior) {
          const nuevoSaldoPendiente = this.calcularSaldoPendiente();
          
          await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id), {
            saldoPendiente: nuevoSaldoPendiente,
            estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
          });
          
          // Actualizar deuda local
          this.deudaSeleccionada.saldoPendiente = nuevoSaldoPendiente;
          this.deudaSeleccionada.estado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
          
          // Actualizar en la lista principal
          this.deudas = this.deudas.map(d => {
            if (d.id === this.deudaSeleccionada.id) {
              return {
                ...d,
                saldoPendiente: nuevoSaldoPendiente,
                estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
              };
            }
            return d;
          });
        }
        
        // Desactivar modo edición
        abono.editando = false;
        abono.campoEditando = null;
      } catch (error) {
        console.error("Error al actualizar abono: ", error);
        alert('Error al guardar cambios del abono: ' + error.message);
      }
    },
    
    async eliminarAbono(index) {
      if (!confirm('¿Está seguro de eliminar este abono?')) return;
      
      const abono = this.abonos[index];
      
      try {
        this.guardando = true;
        
        // Eliminar de Firestore
        await deleteDoc(doc(db, 'deudas', this.deudaSeleccionada.id, 'abonos', abono.id));
        
        // Eliminar de la lista local
        this.abonos.splice(index, 1);
        
        // Actualizar el saldo pendiente
        const nuevoSaldoPendiente = this.calcularSaldoPendiente();
        
        await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id), {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
        });
        
        // Actualizar deuda local
        this.deudaSeleccionada.saldoPendiente = nuevoSaldoPendiente;
        this.deudaSeleccionada.estado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
        
        // Actualizar en la lista principal
        this.deudas = this.deudas.map(d => {
          if (d.id === this.deudaSeleccionada.id) {
            return {
              ...d,
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
            };
          }
          return d;
        });
      } catch (error) {
        console.error("Error al eliminar abono: ", error);
        alert('Error al eliminar abono: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    calcularSaldoPendiente() {
      return this.deudaSeleccionada?.total - this.totalAbonos;
    },
    
    async actualizarDeuda() {
      try {
        this.guardando = true;
        
        // Actualizar saldo pendiente y estado
        const nuevoSaldoPendiente = this.calcularSaldoPendiente();
        const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
        
        await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id), {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado
        });
        
        // Actualizar deuda local
        this.deudaSeleccionada.saldoPendiente = nuevoSaldoPendiente;
        this.deudaSeleccionada.estado = nuevoEstado;
        
        // Actualizar en la lista principal
        this.deudas = this.deudas.map(d => {
          if (d.id === this.deudaSeleccionada.id) {
            return {
              ...d,
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoEstado
            };
          }
          return d;
        });
        
        alert('Deuda actualizada correctamente');
        this.showDetalleModal = false;
      } catch (error) {
        console.error("Error al actualizar deuda: ", error);
        alert('Error al actualizar deuda: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    openHistorialPreciosModal() {
      this.showHistorialPreciosModal = true;
      if (this.proveedores.length === 0) {
        this.loadProveedores();
      }
    },
    
    getNombreProveedorSeleccionado() {
      const proveedor = this.proveedores.find(p => p.id === this.filtroProveedor);
      return proveedor ? proveedor.nombre : '';
    },
    
    getProveedorColor(proveedorId) {
      const proveedor = this.proveedores.find(p => p.id === proveedorId);
      return proveedor && proveedor.color ? proveedor.color : '#cccccc';
    },
    
    abrirAbonoGeneral() {
      if (!this.filtroProveedor) {
        alert('Por favor, seleccione un proveedor primero.');
        return;
      }
      
      const proveedor = this.proveedores.find(p => p.id === this.filtroProveedor);
      if (proveedor) {
        this.proveedorSeleccionadoParaAbono = proveedor;
        this.showAbonoGeneralModal = true;
      } else {
        alert('No se encontró el proveedor seleccionado. Por favor, actualice la página e intente de nuevo.');
        console.error('Proveedor no encontrado:', this.filtroProveedor, 'en lista:', this.proveedores);
      }
    },
    
    abrirHistorialAbonos() {
      if (!this.filtroProveedor) {
        alert('Por favor, seleccione un proveedor primero.');
        return;
      }
      
      const proveedor = this.proveedores.find(p => p.id === this.filtroProveedor);
      if (proveedor) {
        this.proveedorSeleccionadoParaAbono = proveedor;
        this.showHistorialAbonosModal = true;
      } else {
        alert('No se encontró el proveedor seleccionado. Por favor, actualice la página e intente de nuevo.');
        console.error('Proveedor no encontrado:', this.filtroProveedor, 'en lista:', this.proveedores);
      }
    },
    
    async onAbonoAplicado() {
      // Recargar las deudas para mostrar los cambios
      try {
        await this.loadDeudas();
        console.log('Deudas recargadas después de aplicar abono');
      } catch (error) {
        console.error('Error al recargar deudas después de aplicar abono:', error);
      }
    },
    
    async onAbonoEliminado(infoActualizacion) {
      // Actualizar deuda específica después de eliminar un abono
      try {
        console.log('Abono eliminado - Info recibida:', infoActualizacion);
        
        if (infoActualizacion && infoActualizacion.deudaId) {
          // Método 1: Actualización específica inmediata
          const indiceDeuda = this.deudas.findIndex(d => d.id === infoActualizacion.deudaId);
          if (indiceDeuda !== -1) {
                       // Actualizar directamente la deuda en el array local
           this.$set(this.deudas, indiceDeuda, {
             ...this.deudas[indiceDeuda],
             saldoPendiente: infoActualizacion.nuevoSaldo,
             estado: infoActualizacion.nuevoEstado
           });
           console.log('Deuda actualizada localmente inmediatamente:', {
             id: infoActualizacion.deudaId,
             saldoPendiente: infoActualizacion.nuevoSaldo,
             estado: infoActualizacion.nuevoEstado
           });
          }
          
          // Método 2: Verificación desde Firebase después de un delay
          setTimeout(async () => {
            try {
              await this.actualizarDeudaEspecifica(infoActualizacion.proveedorId);
              console.log('Verificación desde Firebase completada');
            } catch (error) {
              console.error('Error en verificación desde Firebase:', error);
            }
          }, 1000);
        } else {
          // Fallback: recarga completa si no hay información específica
          console.log('No hay información específica, recargando todas las deudas...');
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.loadDeudas();
        }
        
      } catch (error) {
        console.error('Error al actualizar después de eliminar abono:', error);
        // Fallback en caso de error
        await this.loadDeudas();
      }
    },
    
    async actualizarDeudaEspecifica(proveedorId) {
      try {
        // Obtener deudas específicas del proveedor actualizado
        const deudasQuery = query(
          collection(db, 'deudas'),
          where('proveedorId', '==', proveedorId)
        );
        
        const querySnapshot = await getDocs(deudasQuery);
        const deudasActualizadas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Actualizar solo las deudas de este proveedor en el array local
        deudasActualizadas.forEach(deudaActualizada => {
          const indice = this.deudas.findIndex(d => d.id === deudaActualizada.id);
          if (indice !== -1) {
            this.$set(this.deudas, indice, deudaActualizada);
            console.log('Deuda actualizada localmente:', deudaActualizada.id, 'Estado:', deudaActualizada.estado, 'Saldo Pendiente:', deudaActualizada.saldoPendiente);
          }
        });
        
      } catch (error) {
        console.error('Error al actualizar deuda específica:', error);
      }
    },
    agregarProductoDesdeSelector(producto) {
      this.agregarProductoDirecto(producto);
    },
    
    filtrarPorProveedor(proveedorId) {
      // Si ya está filtrado por este proveedor, limpiar el filtro
      if (this.filtroProveedor === proveedorId) {
        this.filtroProveedor = '';
      } else {
        this.filtroProveedor = proveedorId;
      }
      
      this.paginaActual = 1; // Resetear a la primera página
      
      // Scroll hacia arriba suavemente para ver los filtros
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    },
    
    async agregarProductoDirecto(producto) {
      try {
        this.guardando = true;
        
        // Guardar en Firestore
        const productoRef = await addDoc(collection(db, 'deudas', this.deudaSeleccionada.id, 'productos'), {
          kilos: producto.kilos,
          producto: producto.producto,
          precio: producto.precio,
          total: producto.total
        });
        
        // Agregar a la lista local
        this.productos.push({
          id: productoRef.id,
          kilos: producto.kilos,
          producto: producto.producto,
          precio: producto.precio,
          total: producto.total,
          editando: false,
          campoEditando: null
        });
        
        // Actualizar el total de la deuda
        const nuevoTotal = this.productos.reduce((sum, p) => sum + p.total, 0);
        const nuevoSaldoPendiente = nuevoTotal - this.totalAbonos;
        
        await updateDoc(doc(db, 'deudas', this.deudaSeleccionada.id), {
          total: nuevoTotal,
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
        });
        
        // Actualizar deuda local
        this.deudaSeleccionada.total = nuevoTotal;
        this.deudaSeleccionada.saldoPendiente = nuevoSaldoPendiente;
        this.deudaSeleccionada.estado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
        
        // Actualizar en la lista principal
        this.deudas = this.deudas.map(d => {
          if (d.id === this.deudaSeleccionada.id) {
            return {
              ...d,
              total: nuevoTotal,
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente'
            };
          }
          return d;
        });
        
      } catch (error) {
        console.error("Error al agregar producto: ", error);
        alert('Error al agregar producto: ' + error.message);
      } finally {
        this.guardando = false;
      }
    }
  },
  watch: {
    // Resetear página cuando cambien los filtros
    filtroProveedor() {
      this.paginaActual = 1;
    },
    filtroEstado() {
      this.paginaActual = 1;
    },
    filtroFechaDesde() {
      this.paginaActual = 1;
    },
    filtroFechaHasta() {
      this.paginaActual = 1;
    }
  },
  async mounted() {
    await Promise.all([this.loadDeudas(), this.loadProveedores()]);
  }
};
</script>

<style scoped>
.lista-deudas {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  color: white;
  position: relative;
}

.back-button-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}

/* Header moderno */
.header-section {
  text-align: center;
  margin-bottom: 40px;
  margin-top: 60px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
  width: 100%;
}

.main-title {
  font-size: 2.8rem;
  font-weight: 700;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.icon-list {
  font-size: 3rem;
}

.subtitle {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 300;
}

/* Filtros modernos */
.filtros-container {
  margin-bottom: 30px;
}

.filtros-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.filtros-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
}

.icon-filter {
  font-size: 1.4rem;
}

.filtros-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.filtro-group {
  display: flex;
  flex-direction: column;
}

.filtro-group label {
  margin-bottom: 8px;
  color: white;
  font-weight: 500;
  font-size: 0.9rem;
}

.modern-select,
.modern-input {
  padding: 12px 15px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.modern-select:focus,
.modern-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.modern-select option {
  background: #667eea;
  color: white;
}

.fecha-inputs {
  display: flex;
  align-items: center;
  gap: 15px;
}

.fecha-separator {
  color: white;
  font-weight: 500;
}

/* Resumen moderno */
.resumen-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 30px;
}

.resumen-card {
  flex: 1;
  min-width: 280px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 20px;
}

.card-icon {
  font-size: 3rem;
  opacity: 0.8;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  color: white;
  margin: 0 0 10px 0;
  font-size: 1.1rem;
  font-weight: 500;
  opacity: 0.9;
}

.amount {
  color: white;
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

/* Acciones modernas */
.acciones-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.btn-action {
  padding: 15px 25px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  min-width: 180px;
  justify-content: center;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  color: white;
}

.btn-action:hover {
  transform: translateY(-3px);
  text-decoration: none;
  color: white;
}

.btn-nueva-deuda {
  background: linear-gradient(45deg, #4CAF50, #45a049);
}

.btn-nueva-deuda:hover {
  box-shadow: 0 12px 35px rgba(76, 175, 80, 0.4);
  background: linear-gradient(45deg, #45a049, #3d8b40);
}

.btn-historial-precios {
  background: linear-gradient(45deg, #FF9800, #F57C00);
}

.btn-historial-precios:hover {
  box-shadow: 0 12px 35px rgba(255, 152, 0, 0.4);
  background: linear-gradient(45deg, #F57C00, #E65100);
}

.icon {
  font-size: 1.2rem;
}

/* Estados de carga y vacío */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  color: white;
  text-align: center;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-top: 5px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  color: white;
  text-align: center;
}

.empty-icon {
  font-size: 5rem;
  margin-bottom: 25px;
  opacity: 0.8;
}

.empty-state h3 {
  font-size: 1.8rem;
  margin-bottom: 10px;
  font-weight: 600;
}

.empty-state p {
  font-size: 1.1rem;
  margin-bottom: 30px;
  opacity: 0.8;
}

/* Contenedor de deudas */
.deudas-container {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Grupo de proveedor */
.proveedor-grupo {
  margin-bottom: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.proveedor-header {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(10px);
  padding: 25px 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.proveedor-header * {
  color: #ffffff !important;
}

.proveedor-header .label,
.proveedor-header span {
  color: #ffffff !important;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
}

.proveedor-header .value {
  color: #ffffff !important;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
}

.proveedor-header h2,
.proveedor-header .proveedor-nombre {
  color: #ffffff !important;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.8) !important;
}

.proveedor-resumen * {
  color: #ffffff !important;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
}

.proveedor-resumen .value.pendiente {
  color: #ffa500 !important;
  background: rgba(255, 165, 0, 0.15) !important;
  padding: 8px 12px !important;
  border-radius: 10px !important;
  border: 2px solid rgba(255, 165, 0, 0.4) !important;
  font-weight: 800 !important;
}

.proveedor-title {
  display: flex;
  align-items: center;
  gap: 20px;
}

.proveedor-color-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.proveedor-nombre {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0;
  color: #ffffff;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.proveedor-nombre.clickeable {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.proveedor-nombre.clickeable:hover {
  transform: scale(1.05);
  text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.8);
  color: #e3f2fd !important;
}

.proveedor-nombre.clickeable:active {
  transform: scale(0.98);
}

.filter-icon {
  margin-left: 15px;
  font-size: 0.7em;
  opacity: 0.7;
  transition: all 0.3s ease;
}

.proveedor-nombre.clickeable:hover .filter-icon {
  opacity: 1;
  transform: rotate(10deg);
  color: #81c784 !important;
}

.proveedor-nombre.filtrado {
  background: linear-gradient(45deg, rgba(129, 199, 132, 0.2), rgba(76, 175, 80, 0.2));
  padding: 10px 20px;
  border-radius: 15px;
  border: 2px solid rgba(129, 199, 132, 0.5);
  box-shadow: 0 4px 15px rgba(129, 199, 132, 0.3);
}

.proveedor-nombre.filtrado .filter-icon {
  color: #4caf50 !important;
  opacity: 1;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.proveedor-resumen {
  display: flex;
  gap: 30px;
  align-items: center;
  flex-wrap: wrap;
}

.proveedor-resumen .resumen-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 120px;
}

.proveedor-resumen .label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
}

.proveedor-resumen .value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
}

.proveedor-header .proveedor-resumen .value.pendiente {
  color: #ffa500 !important;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
  background: rgba(255, 165, 0, 0.1) !important;
  padding: 5px 10px !important;
  border-radius: 8px !important;
  border: 1px solid rgba(255, 165, 0, 0.3) !important;
}

/* Tabla de proveedor */
.tabla-container-proveedor {
  overflow-x: auto;
  background: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.tabla-deudas-proveedor {
  width: 100%;
  border-collapse: collapse;
}

.tabla-deudas-proveedor th,
.tabla-deudas-proveedor td {
  padding: 15px 20px;
  text-align: left;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  color: #2c3e50;
}

.tabla-deudas-proveedor th {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  color: #2c3e50;
  font-weight: 600;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #dee2e6;
}

.tabla-deudas-proveedor tbody tr {
  transition: all 0.3s ease;
  background: white;
}

.tabla-deudas-proveedor tbody tr:hover {
  background: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.tabla-deudas-proveedor .deuda-pagada {
  background: #f1f3f4;
  opacity: 0.7;
}

.tabla-deudas-proveedor .deuda-pagada:hover {
  background: #e8eaed;
}

/* Tabla moderna (mantener para compatibilidad) */
.tabla-container {
  overflow-x: auto;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.tabla-deudas {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.tabla-deudas th, 
.tabla-deudas td {
  padding: 15px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.tabla-deudas th {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tabla-deudas tbody tr {
  transition: all 0.3s ease;
}

.tabla-deudas tbody tr:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tabla-deudas .deuda-pagada {
  background: rgba(255, 255, 255, 0.05);
  opacity: 0.6;
}

.estado-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 0.9em;
  text-transform: uppercase;
}

.estado-badge.pendiente {
  background-color: #f39c12;
  color: white;
}

.estado-badge.pagado {
  background-color: #2ecc71;
  color: white;
}

.acciones {
  display: flex;
  gap: 5px;
}

.btn-detalle, .btn-abono {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-detalle:hover {
  background-color: #2980b9;
}

.btn-abono {
  background-color: #9b59b6;
}

.btn-abono:hover {
  background-color: #8e44ad;
}

.btn-abono:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* Estados de carga */
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 50px 0;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #3498db;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.no-data {
  text-align: center;
  margin: 50px 0;
  color: #7f8c8d;
}

/* Modal styles */
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
  border-radius: 10px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #7f8c8d;
}

.modal-body {
  padding: 20px;
  color: #2c3e50 !important;
}

/* Asegurar que todos los textos del modal sean visibles */
.modal-body * {
  color: #2c3e50 !important;
}

.modal-body strong {
  color: #34495e !important;
}

.modal-body span {
  color: #2c3e50 !important;
}

.modal-body p {
  color: #2c3e50 !important;
}

.modal-body td {
  color: #2c3e50 !important;
}

.modal-body th {
  color: #2c3e50 !important;
}

.deuda-info {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.deuda-info p {
  margin: 5px 0;
  color: #2c3e50 !important;
}

.deuda-info strong {
  color: #34495e !important;
}

/* Tablas dentro del modal */
.tabla-productos, .tabla-abonos {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.tabla-productos th, .tabla-productos td,
.tabla-abonos th, .tabla-abonos td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
  color: #2c3e50 !important;
}

.tabla-productos th, .tabla-abonos th {
  background-color: #f8f9fa;
  color: #2c3e50 !important;
  font-weight: 600;
}

.tabla-productos td, .tabla-abonos td {
  color: #34495e !important;
}

.tabla-productos span, .tabla-abonos span {
  color: #2c3e50 !important;
}

.total-label {
  text-align: right;
  font-weight: bold;
  color: #2c3e50 !important;
}

.no-abonos {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  color: #7f8c8d !important;
  margin-bottom: 20px;
}

/* Asegurar que el estado badge sea visible en el modal */
.modal-body .estado-badge {
  color: white !important;
}

.modal-body .estado-badge.pendiente {
  background-color: #f39c12 !important;
  color: white !important;
}

.modal-body .estado-badge.pagado {
  background-color: #27ae60 !important;
  color: white !important;
}

/* Asegurar que los títulos de sección sean visibles */
.modal-body h3, .modal-body h4 {
  color: #2c3e50 !important;
}

/* Texto de ayuda en formularios */
.modal-body .help-text {
  color: #7f8c8d !important;
}

/* Links y elementos interactivos */
.modal-body a {
  color: #3498db !important;
}

.modal-body .text-muted {
  color: #7f8c8d !important;
}

.resumen-deuda {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

.resumen-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #2c3e50 !important;
}

.resumen-item span {
  color: #2c3e50 !important;
}

.resumen-item.total {
  font-weight: bold;
  font-size: 1.2em;
  color: #3498db !important;
  border-top: 1px solid #ddd;
  padding-top: 10px;
  margin-top: 10px;
}

.resumen-item.total span {
  color: #3498db !important;
}

/* Formulario de abono */
.form-abono {
  margin-top: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #34495e;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
  font-size: 1em;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancelar {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-guardar {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-guardar:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .filtros-container {
    flex-direction: column;
  }
  
  .filtro, .filtro-fecha {
    width: 100%;
  }
  
  .resumen-card {
    width: 100%;
  }
  
  .tabla-deudas {
    font-size: 0.9em;
  }
  
  .acciones-container {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .btn-nueva-deuda,
  .btn-historial-precios {
    width: 100%;
    justify-content: center;
  }
  
  .acciones {
    flex-direction: column;
    gap: 5px;
  }
  
  .btn-detalle, .btn-abono {
    width: 100%;
  }
  
  .modal-content {
    width: 95%;
  }
}

.btn-eliminar {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-eliminar:hover {
  background-color: #c0392b;
}

.small-text {
  font-size: 0.8em;
  color: #7f8c8d;
  font-weight: normal;
}

.editable-container p {
  margin: 10px 0;
  color: #2c3e50 !important;
}

.editable-field, .editable-cell {
  cursor: pointer;
  padding: 3px;
  border-radius: 3px;
  transition: background-color 0.2s;
  color: #2c3e50 !important;
}

.editable-field span, .editable-cell span {
  color: #2c3e50 !important;
}

.editable-field:hover, .editable-cell:hover {
  background-color: rgba(52, 152, 219, 0.1);
}

.editable-field input, .editable-cell input {
  width: 100%;
  padding: 5px;
  border: 1px solid #3498db;
  border-radius: 3px;
  font-size: 1em;
  color: #2c3e50 !important;
}

.btn-eliminar-sm {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 3px 8px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-eliminar-sm:hover {
  background-color: #c0392b;
}

.add-product-section {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
}

.add-product-section h4 {
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 10px;
}

.modal-actions {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.btn-actualizar {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1.1em;
}

.btn-actualizar:hover {
  background-color: #2980b9;
}

.btn-actualizar:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.resumen-card.saldo-pendiente {
  flex: 1;
  min-width: 300px;
  max-width: 500px;
  margin: 0 auto;
  background-color: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  text-align: center;
  border-left: 5px solid #3498db;
}

.resumen-card.saldo-pendiente h3 {
  color: #2c3e50;
  margin: 0 0 15px 0;
  font-size: 1.3em;
}

.resumen-card.saldo-pendiente p {
  color: #3498db;
  font-size: 2em;
  font-weight: bold;
  margin: 0;
}

/* Paginación */
.paginacion-info {
  text-align: center;
  margin-bottom: 15px;
  color: #7f8c8d;
  font-size: 0.95em;
}

.paginacion-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-paginacion {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.3s;
}

.btn-paginacion:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-paginacion:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.paginas-numeros {
  display: flex;
  gap: 5px;
}

.btn-pagina {
  background-color: #ecf0f1;
  color: #2c3e50;
  border: none;
  padding: 10px 12px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 40px;
}

.btn-pagina:hover {
  background-color: #bdc3c7;
}

.btn-pagina.activa {
  background-color: #3498db;
  color: white;
}

/* Estilos para la sección de abonos por proveedor */
.abonos-proveedor-section {
  background: linear-gradient(135deg, #e8f4fd, #d4edfc);
  border-radius: 15px;
  padding: 20px;
  margin: 20px 0;
  border-left: 4px solid #3498db;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.1);
}

.proveedor-selected-info h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-weight: 600;
  font-size: 1.2em;
}

.abonos-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.btn-abono-general,
.btn-historial-abonos {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.btn-abono-general {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
}

.btn-abono-general:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
}

.btn-abono-general:disabled {
  background: linear-gradient(135deg, #bdc3c7, #95a5a6);
  cursor: not-allowed;
  transform: none;
}

.btn-historial-abonos {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
}

.btn-historial-abonos:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(155, 89, 182, 0.3);
}

/* Responsive Design */
@media (max-width: 768px) {
  .lista-deudas {
    padding: 20px;
  }

  .header-section {
    padding: 20px;
    margin-bottom: 30px;
    margin-top: 80px;
  }

  .main-title {
    font-size: 2.2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .filtros-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .fecha-inputs {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .acciones-container {
    flex-direction: column;
    align-items: center;
  }

  .btn-action {
    width: 100%;
    max-width: 350px;
    justify-content: center;
  }

  .resumen-card {
    min-width: auto;
    width: 100%;
  }

  .tabla-container {
    padding: 15px;
  }

  .tabla-deudas th,
  .tabla-deudas td {
    padding: 10px 8px;
    font-size: 0.9rem;
  }

  .paginacion-container {
    flex-direction: column;
    gap: 15px;
  }
  
  .paginas-numeros {
    order: 2;
  }
  
  .btn-paginacion {
    width: 120px;
    justify-content: center;
  }
  
  .abonos-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn-abono-general,
  .btn-historial-abonos {
    justify-content: center;
    width: 100%;
  }

  .back-button-container {
    top: 15px;
    left: 15px;
  }
  
  /* Responsive para grupos de proveedor */
  .proveedor-header {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    padding: 20px;
    gap: 15px;
  }
  
  .proveedor-title {
    justify-content: center;
    gap: 15px;
  }
  
  .proveedor-nombre {
    font-size: 1.8rem;
  }
  
  .proveedor-nombre.clickeable:hover {
    transform: scale(1.02);
  }
  
  .filter-icon {
    margin-left: 10px;
    font-size: 0.6em;
  }
  
  .proveedor-nombre.filtrado {
    padding: 8px 15px;
    border-radius: 12px;
  }
  
  .proveedor-color-circle {
    width: 35px;
    height: 35px;
  }
  
  .proveedor-resumen {
    justify-content: center;
    gap: 20px;
  }
  
  .proveedor-resumen .resumen-item {
    min-width: 100px;
  }
  
  .proveedor-resumen .label {
    color: #ffffff !important;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7) !important;
  }
  
  .proveedor-resumen .value {
    font-size: 1.2rem;
    color: #ffffff !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7) !important;
  }
  
  .tabla-deudas-proveedor th,
  .tabla-deudas-proveedor td {
    padding: 10px 12px;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .lista-deudas {
    padding: 15px;
  }

  .header-section {
    padding: 15px;
    margin-top: 70px;
  }

  .main-title {
    font-size: 1.8rem;
    flex-direction: column;
    gap: 10px;
  }

  .icon-list {
    font-size: 2.5rem;
  }

  .filtros-card {
    padding: 20px;
  }

  .btn-action {
    padding: 12px 20px;
    font-size: 0.9rem;
    min-width: auto;
  }

  .card-icon {
    font-size: 2.5rem;
  }

  .amount {
    font-size: 1.8rem;
  }

  .back-button-container {
    top: 10px;
    left: 10px;
  }
  
  /* Responsive para grupos de proveedor en móviles pequeños */
  .proveedor-header {
    padding: 15px;
    gap: 12px;
  }
  
  .proveedor-nombre {
    font-size: 1.5rem;
  }
  
  .proveedor-nombre.clickeable:hover {
    transform: scale(1.01);
  }
  
  .filter-icon {
    margin-left: 8px;
    font-size: 0.5em;
  }
  
  .proveedor-nombre.filtrado {
    padding: 6px 12px;
    border-radius: 10px;
  }
  
  .proveedor-color-circle {
    width: 30px;
    height: 30px;
  }
  
  .proveedor-resumen {
    gap: 15px;
  }
  
  .proveedor-resumen .resumen-item {
    min-width: 80px;
  }
  
  .proveedor-resumen .label {
    font-size: 0.75rem;
    color: #ffffff !important;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7) !important;
  }
  
  .proveedor-resumen .value {
    font-size: 1rem;
    color: #ffffff !important;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7) !important;
  }
  
  .tabla-deudas-proveedor th,
  .tabla-deudas-proveedor td {
    padding: 8px 10px;
    font-size: 0.8rem;
  }
  
  .deudas-container {
    padding: 15px;
  }
  
  .proveedor-grupo {
    margin-bottom: 25px;
  }
}

/* Estilos para indicadores de color de proveedores */
.proveedor-color-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  font-size: 0.9rem;
  font-weight: 500;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.proveedor-cell {
  padding: 12px 15px !important;
}

.proveedor-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.proveedor-color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

/* Mejoras para la tabla con colores */
.tabla-deudas tbody tr:hover .proveedor-color-dot {
  transform: scale(1.2);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.tabla-deudas tbody tr.deuda-pagada .proveedor-color-dot {
  opacity: 0.6;
  filter: grayscale(30%);
}

/* Responsive para indicadores de color */
@media (max-width: 768px) {
  .proveedor-color-indicator {
    font-size: 0.8rem;
    padding: 6px 10px;
    gap: 6px;
  }
  
  .color-dot {
    width: 14px;
    height: 14px;
  }
  
  .proveedor-color-dot {
    width: 12px;
    height: 12px;
  }
  
  .proveedor-info {
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .proveedor-color-indicator {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    font-size: 0.75rem;
  }
  
  .proveedor-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .proveedor-color-dot {
    width: 10px;
    height: 10px;
  }
}
</style> 