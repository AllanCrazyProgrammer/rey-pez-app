<template>
  <div class="lista-deudas">
    <main class="debts-shell">
      <nav class="terminal-nav" aria-label="Navegación del módulo">
        <BackButton to="/procesos/deudas" />
        <span>~/procesos/deudas/consulta</span>
      </nav>

      <header class="terminal-page-header">
        <div class="terminal-window-bar"><span class="terminal-dots"><i></i><i></i><i></i></span><span>DEUDAS_DB — monitor</span><span class="online-status">● SINCRONIZADO</span></div>
        <div class="header-command">
          <span class="prompt">&gt;</span>
          <div><p>CONSULTAR_SALDOS</p><h1>Deudas y abonos<span class="cursor">_</span></h1><small>Consulta notas pendientes, registra pagos específicos o distribuye un abono general.</small></div>
        </div>
        <div class="header-stats">
          <div><span>SALDO PENDIENTE</span><strong class="amber">${{ formatNumber(totalPendiente) }}</strong></div>
          <div><span>TOTAL ABONADO</span><strong class="cyan">${{ formatNumber(totalPagado) }}</strong></div>
          <div><span>NOTAS VISIBLES</span><strong>{{ totalDeudas }}</strong></div>
        </div>
      </header>

      <div class="primary-actions">
        <router-link to="/procesos/deudas/nueva" class="terminal-button primary"><i class="fas fa-plus"></i> Registrar nueva deuda</router-link>
        <button @click="openHistorialPreciosModal" class="terminal-button"><i class="fas fa-chart-line"></i> Historial de precios</button>
      </div>

      <section class="terminal-panel filters-panel">
        <div class="panel-heading"><div><span>[FILTROS]</span><h2>Acotar resultados</h2></div><button v-if="hayFiltrosActivos" @click="limpiarFiltros" class="clear-filters">Limpiar filtros</button></div>
        <div class="filtros-grid">
          <div class="filtro-group">
            <label for="filtroProveedor">Proveedor</label>
            <select id="filtroProveedor" v-model="filtroProveedor" class="modern-select">
              <option value="">Todos los proveedores</option>
              <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.id">
                {{ proveedor.nombre }}
              </option>
            </select>
          </div>
          
          <div class="filtro-group">
            <label for="filtroEstado">Estado</label>
            <select id="filtroEstado" v-model="filtroEstado" class="modern-select">
              <option value="">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="pagado">Pagados</option>
            </select>
          </div>
          
          <div class="filtro-group fecha-group">
            <label>Rango de fechas</label>
            <div class="fecha-inputs">
              <label><small>Desde</small><input type="date" v-model="filtroFechaDesde" class="modern-input"></label>
              <span class="fecha-separator">→</span>
              <label><small>Hasta</small><input type="date" v-model="filtroFechaHasta" class="modern-input"></label>
            </div>
          </div>
        </div>
      </section>

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
               class="proveedor-nombre clickeable"
               @click="filtrarPorProveedor(grupo.proveedor.id)" 
               :title="filtroProveedor === grupo.proveedor.id ? 'Haz clic para quitar el filtro' : 'Haz clic para filtrar por este proveedor'"
             >
               {{ grupo.proveedor.nombre }}
               <i class="fas fa-filter filter-icon"></i>
             </h2>
            <button
              type="button"
              class="provider-general-payment"
              :disabled="grupo.totalPendiente <= 0"
              @click.stop="abrirAbonoGeneralParaProveedor(grupo.proveedor)"
              :aria-label="`Realizar abono general a ${grupo.proveedor.nombre}`"
              title="Aplicar el pago de las notas más antiguas a las más nuevas"
            >
              <i class="fas fa-layer-group"></i>
              Abono general
              <small>Antiguas → nuevas</small>
            </button>
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
                  <button @click="verDetalle(deuda)" class="btn-detalle" :aria-label="`Ver detalle de la deuda del ${formatearFecha(deuda.fecha)}`">
                    <i class="fas fa-eye"></i><span>Detalle</span>
                  </button>
                  <button @click="agregarAbono(deuda)" class="btn-abono" :disabled="deuda.estado === 'pagado'" :aria-label="`Abonar a la deuda del ${formatearFecha(deuda.fecha)}`">
                    <i class="fas fa-money-bill"></i><span>Abonar</span>
                  </button>
                  <button @click="eliminarDeuda(deuda)" class="btn-eliminar" aria-label="Eliminar deuda">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </main>
    
    <!-- Modal de Detalle de Deuda -->
    <div v-if="showDetalleModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content debt-detail-modal" role="dialog" aria-modal="true" aria-labelledby="debt-detail-title" @click.stop>
        <div class="modal-header">
          <h2 id="debt-detail-title">Detalle de Deuda</h2>
          <button @click="showDetalleModal = false" class="close-button" aria-label="Cerrar detalle de deuda">×</button>
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
      <div class="modal-content specific-payment-modal" role="dialog" aria-modal="true" aria-labelledby="specific-payment-title" @click.stop>
        <div class="modal-header">
          <div><small>ABONO_ESPECIFICO.exe</small><h2 id="specific-payment-title"><span>&gt;</span> Abonar a una nota</h2></div>
          <button @click="showAbonoModal = false" class="close-button" aria-label="Cerrar">×</button>
        </div>
        <div class="modal-body">
          <div class="specific-debt-summary">
            <div><span>PROVEEDOR</span><strong>{{ deudaSeleccionada?.proveedorNombre }}</strong></div>
            <div><span>FECHA DE LA NOTA</span><strong>{{ formatearFecha(deudaSeleccionada?.fecha) }}</strong></div>
            <div><span>SALDO ACTUAL</span><strong class="amber">${{ formatNumber(deudaSeleccionada?.saldoPendiente) }}</strong></div>
          </div>

          <div class="payment-type-note"><i class="fas fa-crosshairs"></i><p><strong>Pago específico</strong><span>Este abono se aplicará solamente a esta nota.</span></p></div>

          <form @submit.prevent="guardarAbono" class="form-abono">
            <div class="specific-form-grid">
              <div class="form-group"><label for="fechaAbono">Fecha del pago</label><input id="fechaAbono" type="date" v-model="nuevoAbono.fecha" required></div>
              <div class="form-group description-field"><label for="descripcionAbono">Descripción o referencia</label><input id="descripcionAbono" type="text" v-model.trim="nuevoAbono.descripcion" required placeholder="Ej. Transferencia parcial"></div>
              <div class="form-group"><label for="montoAbono">Monto</label><div class="specific-amount-input"><span>$</span><input id="montoAbono" type="number" v-model.number="nuevoAbono.monto" required min="0.01" step="0.01" :max="deudaSeleccionada?.saldoPendiente" placeholder="0.00"></div></div>
            </div>

            <div class="balance-preview">
              <div><span>Saldo antes</span><strong>${{ formatNumber(deudaSeleccionada?.saldoPendiente) }}</strong></div>
              <i class="fas fa-long-arrow-alt-right"></i>
              <div><span>Abono</span><strong class="cyan">-${{ formatNumber(nuevoAbono.monto || 0) }}</strong></div>
              <i class="fas fa-equals"></i>
              <div><span>Saldo después</span><strong class="amber">${{ formatNumber(saldoPosteriorAbono) }}</strong></div>
            </div>

            <div class="form-actions">
              <button type="button" @click="showAbonoModal = false" class="btn-cancelar">Cancelar</button>
              <button type="submit" class="btn-guardar" :disabled="!puedeGuardarAbonoEspecifico || guardando">
                <i :class="guardando ? 'fas fa-circle-notch fa-spin' : 'fas fa-check'"></i>
                {{ guardando ? 'Guardando…' : 'Confirmar abono' }}
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
      v-if="proveedorSeleccionadoParaAbono"
      :mostrar="showHistorialAbonosModal"
      :proveedor="proveedorSeleccionadoParaAbono"
      @cerrar="showHistorialAbonosModal = false"
      @abono-eliminado="onAbonoEliminado"
    />
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosProveedorPanel from '@/components/Deudas/Precios/PreciosProveedorPanel.vue';
import ProductoSelector from '@/components/Deudas/ProductoSelector.vue';
import AbonoGeneralModal from '@/components/Deudas/AbonoGeneralModal.vue';
import HistorialAbonosModal from '@/components/Deudas/HistorialAbonosModal.vue';
import { formatNumber, formatearFecha } from '@/utils/formatters';

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
        descripcion: 'Pago',
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
    saldoPosteriorAbono() {
      const saldo = Number(this.deudaSeleccionada?.saldoPendiente) || 0;
      const abono = Number(this.nuevoAbono.monto) || 0;
      return Math.max(0, saldo - abono);
    },
    puedeGuardarAbonoEspecifico() {
      const monto = Number(this.nuevoAbono.monto) || 0;
      const saldo = Number(this.deudaSeleccionada?.saldoPendiente) || 0;
      return Boolean(
        this.nuevoAbono.fecha &&
        this.nuevoAbono.descripcion &&
        monto > 0 &&
        monto <= saldo
      );
    },
    hayFiltrosActivos() {
      return Boolean(
        this.filtroProveedor ||
        this.filtroFechaDesde ||
        this.filtroFechaHasta ||
        this.filtroEstado !== 'pendiente'
      );
    },
    
    tieneDeudasPendientes() {
      return this.deudasFiltradas.some(deuda => deuda.estado === 'pendiente');
    }
  },
  methods: {
    formatNumber,
    formatearFecha,
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
    limpiarFiltros() {
      this.filtroProveedor = '';
      this.filtroEstado = 'pendiente';
      this.filtroFechaDesde = '';
      this.filtroFechaHasta = '';
      this.paginaActual = 1;
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
        descripcion: 'Pago',
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
        const batch = writeBatch(db);
        const abonoRef = doc(collection(db, 'deudas', this.deudaSeleccionada.id, 'abonos'));
        batch.set(abonoRef, {
          descripcion: this.nuevoAbono.descripcion,
          monto: this.nuevoAbono.monto,
          fecha: this.nuevoAbono.fecha,
          fechaCreacion: new Date(),
          esAbonoGeneral: false
        });

        const nuevoSaldoPendiente = this.deudaSeleccionada.saldoPendiente - this.nuevoAbono.monto;
        const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
        batch.update(doc(db, 'deudas', this.deudaSeleccionada.id), {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado
        });

        await batch.commit();
        
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
        this.abrirAbonoGeneralParaProveedor(proveedor);
      } else {
        alert('No se encontró el proveedor seleccionado. Por favor, actualice la página e intente de nuevo.');
        console.error('Proveedor no encontrado:', this.filtroProveedor, 'en lista:', this.proveedores);
      }
    },

    abrirAbonoGeneralParaProveedor(proveedor) {
      if (!proveedor?.id) return;
      this.proveedorSeleccionadoParaAbono = proveedor;
      this.showAbonoGeneralModal = true;
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
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
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
/* Terminal CRT redesign */
.lista-deudas { --green:#00ff88; --green-dim:rgba(0,255,136,.15); --amber:#ffb000; --cyan:#22d3ee; --red:#ff5f56; --panel:#07110c; --line:rgba(0,255,136,.26); min-height:100vh; padding:0; background:repeating-linear-gradient(0deg,rgba(255,255,255,.016) 0,rgba(255,255,255,.016) 1px,transparent 1px,transparent 4px),radial-gradient(circle at 50% -20%,#102a1d,#050a08 48%); color:#d8ffe9; font-family:'Share Tech Mono',monospace; }
.debts-shell { width:min(1240px,calc(100% - 40px)); margin:0 auto; padding:24px 0 60px; }
.terminal-nav { display:flex; align-items:center; gap:14px; margin-bottom:18px; color:#668573; font-size:.75rem; }
.terminal-nav ::v-deep .btn-back { margin:0; padding:9px 14px; border:1px solid var(--line); border-radius:0; background:#07100c; color:var(--green); font:.8rem 'Share Tech Mono',monospace; }
.terminal-nav ::v-deep .btn-back::before { content:'< '; color:var(--amber); }
.terminal-page-header { border:1px solid var(--line); background:rgba(3,14,9,.94); box-shadow:0 0 28px rgba(0,255,136,.07),inset 0 0 45px rgba(0,255,136,.025); }
.terminal-window-bar { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:9px 13px; border-bottom:1px solid var(--line); background:#0a1711; color:#71907c; font-size:.66rem; letter-spacing:.08em; }
.terminal-dots { display:flex; gap:6px; }.terminal-dots i{width:9px;height:9px;border-radius:50%;background:var(--red)}.terminal-dots i:nth-child(2){background:var(--amber)}.terminal-dots i:nth-child(3){background:var(--green)}
.online-status { justify-self:end; color:var(--green); }
.header-command { display:flex; gap:16px; padding:25px 30px; }
.header-command .prompt { color:var(--amber); font:2.2rem 'VT323',monospace; }
.header-command p { margin:0 0 3px; color:var(--green); font-size:.68rem; letter-spacing:.12em; }
.header-command h1 { margin:0; color:var(--green); font:2.8rem 'VT323',monospace; letter-spacing:.04em; text-shadow:0 0 11px rgba(0,255,136,.5); }
.header-command small { color:#82a08e; font-size:.76rem; }
.cursor{animation:crtBlink 1s steps(1) infinite}@keyframes crtBlink{50%{opacity:0}}
.header-stats { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid var(--line); }
.header-stats>div { display:flex; flex-direction:column; gap:5px; padding:13px 17px; border-right:1px solid var(--line); }
.header-stats>div:last-child{border:0}.header-stats span{color:#62806e;font-size:.6rem;letter-spacing:.08em}.header-stats strong{color:#d7fbe3;font-size:1rem}.header-stats .amber{color:var(--amber)}.header-stats .cyan{color:var(--cyan)}
.primary-actions { display:flex; justify-content:flex-end; gap:10px; margin:16px 0; }
.terminal-button { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:40px; padding:9px 14px; border:1px solid #345442; border-radius:0; background:#07100c; color:#a8c8b3; cursor:pointer; font:.72rem 'Share Tech Mono',monospace; text-decoration:none; text-transform:uppercase; }
.terminal-button:hover:not(:disabled){border-color:var(--green);background:var(--green-dim);color:var(--green);text-decoration:none}.terminal-button.primary{border-color:var(--green);background:var(--green);color:#021008;font-weight:bold}.terminal-button.primary:hover:not(:disabled){background:#49ffa9;color:#021008}.terminal-button:disabled{opacity:.3;cursor:not-allowed}
.terminal-panel { margin-bottom:16px; border:1px solid var(--line); border-radius:0; background:rgba(6,17,12,.94); box-shadow:inset 0 0 28px rgba(0,255,136,.018); }
.panel-heading { display:flex; align-items:center; justify-content:space-between; gap:15px; padding:11px 15px; border-bottom:1px solid var(--line); background:#091710; }
.panel-heading span{color:var(--green);font-size:.61rem;letter-spacing:.08em}.panel-heading h2{margin:3px 0 0;color:#d2f0dc;font-size:.82rem;text-transform:uppercase}.clear-filters{border:0;background:transparent;color:var(--amber);cursor:pointer;font:.65rem 'Share Tech Mono',monospace;text-decoration:underline}
.filters-panel .filtros-grid { grid-template-columns:1.15fr .75fr 1.35fr; gap:14px; padding:15px; }
.filtro-group label { margin:0 0 7px; color:#83a58f; font-size:.66rem; text-transform:uppercase; }
.modern-select,.modern-input { width:100%; box-sizing:border-box; padding:10px 11px; border:1px solid #26503a; border-radius:0; background:#020805; color:#e0ffea; font:.74rem 'Share Tech Mono',monospace; color-scheme:dark; }
.modern-select:focus,.modern-input:focus{border-color:var(--green);background:#020805;box-shadow:0 0 0 2px rgba(0,255,136,.1)}.modern-select option{background:#07100c;color:#e0ffea}
.fecha-inputs { display:grid; grid-template-columns:1fr auto 1fr; align-items:flex-end; gap:8px; }.fecha-inputs label{margin:0}.fecha-inputs small{display:block;margin-bottom:5px;color:#597362;font-size:.55rem}.fecha-separator{padding-bottom:10px;color:var(--green)}
.proveedor-color-indicator { margin-top:7px; color:var(--green); font-size:.65rem; }.color-dot{box-shadow:0 0 7px currentColor}
.payment-console { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:18px; padding:16px; border-color:rgba(34,211,238,.3); }
.payment-console-copy { display:flex; gap:13px; align-items:center; }.console-icon{display:grid;place-items:center;width:42px;height:42px;border:1px solid var(--cyan);color:var(--cyan)}.payment-console-copy>div>span{color:var(--cyan);font-size:.58rem;letter-spacing:.09em}.payment-console h2{margin:3px 0;color:#d9fff0;font-size:1rem}.payment-console p{max-width:650px;margin:0;color:#779181;font-size:.67rem;line-height:1.45}.abonos-actions{display:flex;gap:9px}.abonos-actions .terminal-button{min-width:150px;text-align:left}.terminal-button>span{display:flex;flex-direction:column;gap:2px}.terminal-button small{font-size:.54rem;font-weight:normal;opacity:.7;text-transform:none}
.provider-hint { display:flex; align-items:center; gap:8px; margin-bottom:16px; padding:10px 13px; border:1px dashed rgba(0,255,136,.2); color:#668573; font-size:.66rem; }
.loading-state,.empty-state { padding:45px 20px; border:1px dashed var(--line); border-radius:0; background:#050d09; color:#71927e; }.loading-spinner{border-color:rgba(0,255,136,.15);border-top-color:var(--green)}.empty-state h3{color:var(--green);font-family:'VT323',monospace;font-size:1.5rem}.empty-state .btn-action{border-radius:0;background:var(--green);color:#021008}
.deudas-container { margin:0; padding:0; border-radius:0; background:transparent; box-shadow:none; color:#d8ffe9; }.paginacion-info{color:#668573;font-size:.66rem}.proveedor-grupo { margin-bottom:14px; overflow:hidden; border:1px solid var(--line); border-radius:0; background:#06100b; box-shadow:none; }
.proveedor-header { padding:13px 15px; border-bottom:1px solid var(--line); background:#091710; }.proveedor-title{gap:9px}.proveedor-color-circle{width:11px;height:11px;box-shadow:0 0 8px currentColor}.proveedor-nombre{color:var(--green);font:.98rem 'Share Tech Mono',monospace}.proveedor-nombre:hover{color:#6effb7}.filter-icon{font-size:.62rem}.proveedor-resumen{gap:18px}.proveedor-resumen .resumen-item{gap:3px}.proveedor-resumen .label{color:#668573;font-size:.58rem}.proveedor-resumen .value{color:#cfeadb;font-size:.76rem}.proveedor-resumen .value.pendiente{color:var(--amber)}
.tabla-container-proveedor{overflow-x:auto}.tabla-deudas-proveedor{color:#cfeadb;font-size:.73rem}.tabla-deudas-proveedor th{padding:10px 12px;border-color:var(--line);background:#020805;color:var(--green);font-size:.61rem;letter-spacing:.06em}.tabla-deudas-proveedor tbody tr{background:#06100b;color:#cfeadb}.tabla-deudas-proveedor td{padding:11px 12px;border-color:rgba(0,255,136,.1);background:transparent;color:inherit}.tabla-deudas-proveedor tbody tr:hover{background:rgba(0,255,136,.055)}.deuda-pagada{opacity:.55}.estado-badge{border-radius:0;font-size:.56rem;text-transform:uppercase}.estado-badge.pendiente{border:1px solid var(--amber);background:rgba(255,176,0,.08);color:var(--amber)}.estado-badge.pagado{border:1px solid var(--green);background:rgba(0,255,136,.08);color:var(--green)}
.acciones { display:flex; justify-content:flex-end; gap:6px; }.acciones button{display:inline-flex;align-items:center;gap:5px;width:auto;height:31px;padding:0 8px;border-radius:0;background:transparent;font:.58rem 'Share Tech Mono',monospace}.btn-detalle{border:1px solid #436353!important;color:#a8c8b3!important}.btn-abono{border:1px solid var(--cyan)!important;color:var(--cyan)!important}.btn-eliminar{border:1px solid rgba(255,95,86,.4)!important;color:var(--red)!important}.acciones button:hover:not(:disabled){background:rgba(255,255,255,.05)!important;transform:none!important}.acciones button:disabled{opacity:.25}

/* Modals owned by this view */
.lista-deudas>.modal-overlay { background:rgba(0,5,3,.88);backdrop-filter:blur(7px) }.lista-deudas>.modal-overlay>.modal-content{max-width:900px;border:1px solid var(--line);border-radius:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.014) 0,rgba(255,255,255,.014) 1px,transparent 1px,transparent 4px),#060e0a;color:#d8ffe9;box-shadow:0 0 40px rgba(0,255,136,.11);font-family:'Share Tech Mono',monospace}.lista-deudas>.modal-overlay .modal-header{border-bottom:1px solid var(--line);border-radius:0;background:#091710;color:var(--green)}.lista-deudas>.modal-overlay .close-button{border-radius:0;color:var(--red)}.lista-deudas>.modal-overlay .modal-body{background:transparent}.lista-deudas>.modal-overlay input,.lista-deudas>.modal-overlay select{border:1px solid #26503a;border-radius:0;background:#020805;color:#e0ffea;font-family:'Share Tech Mono',monospace;color-scheme:dark}
.specific-payment-modal{max-width:760px!important}.specific-payment-modal .modal-header>div small{color:#668573;font-size:.58rem;letter-spacing:.09em}.specific-payment-modal .modal-header h2{margin:3px 0 0;color:var(--green);font:1.55rem 'VT323',monospace}.specific-payment-modal .modal-header h2 span{color:var(--amber)}
.specific-debt-summary{display:grid;grid-template-columns:1.3fr 1fr 1fr;border:1px solid var(--line);background:#07110c}.specific-debt-summary>div{display:flex;flex-direction:column;gap:5px;padding:12px 14px;border-right:1px solid var(--line)}.specific-debt-summary>div:last-child{border:0}.specific-debt-summary span{color:#668573;font-size:.58rem;letter-spacing:.07em}.specific-debt-summary strong{color:#d7fbe3;font-size:.78rem}.specific-debt-summary .amber,.balance-preview .amber{color:var(--amber)}.payment-type-note{display:flex;align-items:center;gap:10px;margin:12px 0;padding:10px 12px;border:1px solid rgba(34,211,238,.25);color:var(--cyan)}.payment-type-note p{display:flex;flex-direction:column;gap:2px;margin:0}.payment-type-note strong{font-size:.7rem}.payment-type-note span{color:#6f8a7a;font-size:.61rem}.specific-payment-modal .form-abono{padding:0;background:transparent}.specific-form-grid{display:grid;grid-template-columns:160px minmax(200px,1fr) 160px;gap:10px}.specific-payment-modal .form-group{margin:0}.specific-payment-modal .form-group label{color:#85a791;font-size:.64rem;text-transform:uppercase}.specific-payment-modal .form-group input{box-sizing:border-box;padding:10px}.specific-amount-input{position:relative}.specific-amount-input span{position:absolute;top:50%;left:11px;color:var(--amber);transform:translateY(-50%)}.specific-amount-input input{padding-left:26px!important}.balance-preview{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center;gap:10px;margin-top:14px;padding:12px;border:1px dashed rgba(0,255,136,.24)}.balance-preview>div{display:flex;flex-direction:column;gap:4px}.balance-preview span{color:#668573;font-size:.58rem}.balance-preview strong{font-size:.82rem}.balance-preview .cyan{color:var(--cyan)}.balance-preview>i{color:#476151}.specific-payment-modal .form-actions{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}.specific-payment-modal .btn-cancelar,.specific-payment-modal .btn-guardar{display:inline-flex;align-items:center;gap:7px;padding:10px 14px;border-radius:0;font:.68rem 'Share Tech Mono',monospace;text-transform:uppercase}.specific-payment-modal .btn-cancelar{border:1px solid #3e5c49;background:transparent;color:#9ab7a4}.specific-payment-modal .btn-guardar{border:1px solid var(--green);background:var(--green);color:#021008}

/* Contraste estable: evita colores heredados y cambios visuales al pasar el cursor */
.lista-deudas {
  --green: #39f6a0;
  --amber: #ffc247;
  --cyan: #67e8f9;
  --red: #ff7b72;
  --line: rgba(57, 246, 160, .38);
}

.provider-hint,
.paginacion-info,
.terminal-nav,
.header-command small,
.payment-console p {
  color: #9bb9a6;
}

.proveedor-grupo,
.tabla-deudas-proveedor tbody tr,
.tabla-deudas-proveedor tbody tr:hover,
.tabla-deudas-proveedor tbody tr:focus-within {
  background: #08150f !important;
  box-shadow: none !important;
  transform: none !important;
}

.tabla-deudas-proveedor tbody tr td,
.tabla-deudas-proveedor tbody tr:hover td,
.tabla-deudas-proveedor tbody tr:focus-within td {
  background: #08150f !important;
  color: #eefcf3 !important;
}

.tabla-deudas-proveedor th {
  background: #030b07 !important;
  color: var(--green) !important;
}

.proveedor-header {
  background: #0a1a12;
}

.proveedor-nombre,
.proveedor-nombre:hover,
.proveedor-nombre.clickeable:hover {
  color: var(--green);
  transform: none;
}

.provider-general-payment {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid rgba(103, 232, 249, .7);
  border-radius: 0;
  background: rgba(103, 232, 249, .045);
  color: var(--cyan) !important;
  cursor: pointer;
  font: .62rem 'Share Tech Mono', monospace;
  letter-spacing: .03em;
  text-transform: uppercase;
}

.provider-general-payment i,
.provider-general-payment small {
  color: var(--cyan) !important;
  text-shadow: none !important;
}

.provider-general-payment small {
  padding-left: 7px;
  border-left: 1px solid rgba(103, 232, 249, .35);
  font-size: .5rem;
  opacity: .72;
  text-transform: none;
}

.provider-general-payment:hover:not(:disabled) {
  border-color: rgba(103, 232, 249, .7);
  background: rgba(103, 232, 249, .045);
  color: var(--cyan) !important;
  box-shadow: none;
  transform: none;
}

.provider-general-payment:disabled {
  cursor: not-allowed;
  opacity: .32;
}

.proveedor-resumen .label {
  color: #a8c8b3 !important;
  text-shadow: none !important;
}

.proveedor-resumen .value {
  color: #f2fff6 !important;
  text-shadow: none !important;
}

.proveedor-resumen .value.pendiente {
  color: var(--amber) !important;
}

.terminal-button:hover:not(:disabled) {
  border-color: #345442;
  background: #07100c;
  color: #a8c8b3;
  box-shadow: none;
}

.terminal-button.primary:hover:not(:disabled) {
  border-color: var(--green);
  background: var(--green);
  color: #021008;
}

.acciones button:hover:not(:disabled) {
  background: transparent !important;
  box-shadow: none !important;
}

.btn-detalle:hover:not(:disabled) {
  color: #a8c8b3 !important;
}

.btn-abono:hover:not(:disabled) {
  color: var(--cyan) !important;
}

.btn-eliminar:hover:not(:disabled) {
  color: var(--red) !important;
}

.lista-deudas > .modal-overlay > .modal-content {
  border-color: rgba(57, 246, 160, .5);
  background:
    repeating-linear-gradient(0deg, rgba(255,255,255,.012) 0, rgba(255,255,255,.012) 1px, transparent 1px, transparent 4px),
    #07110c;
}

.lista-deudas > .modal-overlay .modal-header {
  background: #0b1c13;
}

.lista-deudas > .modal-overlay .modal-body,
.lista-deudas > .modal-overlay .modal-body * {
  color: #eefcf3 !important;
}

.specific-payment-modal .modal-header > div small,
.specific-debt-summary span,
.specific-payment-modal .form-group label,
.balance-preview span {
  color: #a8c8b3 !important;
}

.specific-payment-modal .modal-header h2 {
  color: var(--green) !important;
}

.specific-payment-modal .modal-header h2 span {
  color: var(--amber) !important;
}

.specific-debt-summary {
  border-color: rgba(57, 246, 160, .42);
  background: #091710;
}

.specific-debt-summary > div {
  border-color: rgba(57, 246, 160, .32);
}

.specific-debt-summary strong,
.balance-preview strong {
  color: #ffffff !important;
}

.specific-debt-summary .amber,
.balance-preview .amber,
.specific-amount-input span {
  color: var(--amber) !important;
}

.payment-type-note {
  border-color: rgba(103, 232, 249, .45);
  background: rgba(103, 232, 249, .055);
  color: var(--cyan) !important;
}

.payment-type-note i,
.payment-type-note strong,
.balance-preview .cyan {
  color: var(--cyan) !important;
}

.payment-type-note span {
  color: #b6d0bf !important;
}

.lista-deudas > .modal-overlay input,
.lista-deudas > .modal-overlay select {
  border-color: #3e6b50;
  background: #020805;
  color: #ffffff !important;
}

.lista-deudas > .modal-overlay input::placeholder {
  color: #82968a !important;
  opacity: 1;
}

.balance-preview {
  border-color: rgba(57, 246, 160, .42);
  background: rgba(57, 246, 160, .025);
}

.balance-preview > i {
  color: #8fb39d !important;
}

.specific-payment-modal .btn-cancelar,
.specific-payment-modal .btn-cancelar:hover {
  border-color: #587563;
  background: transparent;
  color: #c5ddce !important;
}

.specific-payment-modal .btn-guardar,
.specific-payment-modal .btn-guardar:hover:not(:disabled) {
  border-color: var(--green);
  background: var(--green);
  color: #021008 !important;
  box-shadow: none;
}

.specific-payment-modal .btn-guardar:disabled {
  border-color: #315945;
  background: #193a2a;
  color: #91ad9c !important;
  opacity: 1;
}

.lista-deudas > .modal-overlay .close-button:hover {
  background: transparent;
  color: var(--red);
  transform: none;
}

/* Debt detail: readable CRT hierarchy */
.debt-detail-modal {
  max-width: 1040px !important;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.debt-detail-modal .modal-header h2 {
  margin: 0;
  color: #f2fff6 !important;
  font: 2.15rem/1 'VT323', monospace;
  letter-spacing: .035em;
}

.debt-detail-modal .modal-header h2::before {
  content: '> ';
  color: var(--amber);
}

.debt-detail-modal .modal-body {
  padding: 22px;
}

.debt-detail-modal .deuda-info {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  padding: 0;
  border: 1px solid rgba(57, 246, 160, .38);
  border-radius: 0;
  background: #091710 !important;
}

.debt-detail-modal .deuda-info p {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  margin: 0;
  padding: 14px 16px;
  border-right: 1px solid rgba(57, 246, 160, .24);
}

.debt-detail-modal .deuda-info p:last-child {
  border-right: 0;
}

.debt-detail-modal .deuda-info strong {
  color: #a8c8b3 !important;
  font-size: .72rem;
  font-weight: 500;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.debt-detail-modal .deuda-info .editable-field > span {
  color: #ffffff !important;
  font-size: 1rem;
}

.debt-detail-modal .estado-badge.pendiente {
  width: fit-content;
  border-color: var(--amber);
  background: transparent !important;
  color: var(--amber) !important;
}

.debt-detail-modal .estado-badge.pagado {
  width: fit-content;
  border-color: var(--green);
  background: transparent !important;
  color: var(--green) !important;
}

.debt-detail-modal h3,
.debt-detail-modal .add-product-section h4 {
  margin: 24px 0 10px;
  color: #f2fff6 !important;
  font: 1.55rem/1.1 'VT323', monospace;
  letter-spacing: .03em;
}

.debt-detail-modal .small-text {
  color: #9ab9a5 !important;
  font: .72rem 'Share Tech Mono', monospace;
}

.debt-detail-modal .tabla-productos,
.debt-detail-modal .tabla-abonos {
  overflow: hidden;
  border: 1px solid rgba(57, 246, 160, .3);
  border-collapse: collapse;
  background: #050d09 !important;
}

.debt-detail-modal .tabla-productos th,
.debt-detail-modal .tabla-abonos th {
  padding: 12px 14px;
  border-color: rgba(57, 246, 160, .28);
  background: #031009 !important;
  color: var(--green) !important;
  font-size: .72rem;
  font-weight: 500;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.debt-detail-modal .tabla-productos td,
.debt-detail-modal .tabla-abonos td {
  padding: 13px 14px;
  border-color: rgba(57, 246, 160, .18);
  background: #08150f !important;
  color: #f2fff6 !important;
  font-size: .88rem;
  font-variant-numeric: tabular-nums;
}

.debt-detail-modal .tabla-productos tbody tr:hover td,
.debt-detail-modal .tabla-abonos tbody tr:hover td {
  background: #08150f !important;
  color: #f2fff6 !important;
}

.debt-detail-modal .tabla-productos tfoot td {
  border-top: 1px solid rgba(255, 176, 0, .55);
  background: #0b160f !important;
  color: var(--amber) !important;
  font-weight: 600;
}

.debt-detail-modal .tabla-productos .total-label {
  color: #f2fff6 !important;
}

.debt-detail-modal .editable-cell > span {
  color: #f2fff6 !important;
}

.debt-detail-modal .add-product-section,
.debt-detail-modal .no-abonos,
.debt-detail-modal .resumen-deuda {
  border: 1px solid rgba(57, 246, 160, .3);
  border-radius: 0;
  background: #07110c !important;
}

.debt-detail-modal .add-product-section {
  margin-top: 22px;
  padding: 18px;
}

.debt-detail-modal .add-product-section h4 {
  margin-top: 0;
}

.debt-detail-modal .no-abonos p {
  color: #a8c8b3 !important;
}

.debt-detail-modal .resumen-deuda strong,
.debt-detail-modal .resumen-deuda span {
  color: #f2fff6 !important;
}

.debt-detail-modal .resumen-deuda .saldo-pendiente,
.debt-detail-modal .resumen-deuda .total {
  color: var(--amber) !important;
}

.debt-detail-modal .btn-eliminar-sm,
.debt-detail-modal .btn-eliminar-sm:hover {
  border-color: rgba(255, 95, 86, .62);
  background: transparent;
  color: var(--red) !important;
  box-shadow: none;
  transform: none;
}

@media(max-width:800px){.filters-panel .filtros-grid{grid-template-columns:1fr}.payment-console{grid-template-columns:1fr}.abonos-actions{flex-wrap:wrap}.header-stats{grid-template-columns:1fr}.header-stats>div{border-right:0;border-bottom:1px solid var(--line)}.specific-form-grid{grid-template-columns:1fr}.specific-debt-summary{grid-template-columns:1fr}.specific-debt-summary>div{border-right:0;border-bottom:1px solid var(--line)}}
@media(max-width:800px){.debt-detail-modal .deuda-info{grid-template-columns:1fr}.debt-detail-modal .deuda-info p{border-right:0;border-bottom:1px solid rgba(57,246,160,.24)}.debt-detail-modal .deuda-info p:last-child{border-bottom:0}.debt-detail-modal .modal-body{padding:14px}.debt-detail-modal .tabla-productos,.debt-detail-modal .tabla-abonos{display:block;overflow-x:auto}}
@media(max-width:620px){.debts-shell{width:min(100% - 22px,1240px);padding-top:12px}.terminal-nav>span,.online-status{display:none}.terminal-window-bar{grid-template-columns:1fr auto}.header-command{padding:20px 17px;gap:9px}.header-command h1{font-size:2.15rem}.primary-actions{align-items:stretch;flex-direction:column}.terminal-button{width:100%;box-sizing:border-box}.fecha-inputs{grid-template-columns:1fr}.fecha-separator{display:none}.abonos-actions{flex-direction:column}.proveedor-header{align-items:flex-start;flex-direction:column}.proveedor-title{align-items:flex-start;flex-wrap:wrap}.provider-general-payment{flex-basis:100%;justify-content:center}.proveedor-resumen{width:100%;justify-content:space-between}.acciones button span{display:none}.balance-preview{grid-template-columns:1fr}.balance-preview>i{transform:rotate(90deg);justify-self:center}.specific-payment-modal .form-actions{flex-direction:column}.specific-payment-modal .form-actions button{width:100%}}
</style>
