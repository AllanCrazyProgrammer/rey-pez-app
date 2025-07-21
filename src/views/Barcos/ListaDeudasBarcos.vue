<template>
  <div class="lista-deudas-barcos">
    <div class="back-button-container">
      <BackButton to="/barcos" />
    </div>
    
    <!-- Header -->
    <div class="header-section">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-list">📋</i>
          Lista de Deudas - {{ nombreBarco }}
        </h1>
        <p class="subtitle">Gestiona las deudas pendientes del barco {{ nombreBarco }}</p>
      </div>
    </div>

    <!-- Barco Info y Resumen -->
    <div class="resumen-cards">
      <div class="resumen-card barco-card">
        <i class="card-icon">{{ barcoSeleccionado === 'galileo' ? '🚢' : '🛥️' }}</i>
        <div class="card-content">
          <h3>{{ nombreBarco }}</h3>
          <p>Barco seleccionado</p>
        </div>
      </div>
      
      <div class="resumen-card">
        <i class="card-icon">✅</i>
        <div class="card-content">
          <h3>${{ formatNumber(totalAbonado) }}</h3>
          <p>Total Abonado</p>
        </div>
      </div>
      
      <div class="resumen-card">
        <i class="card-icon">⏳</i>
        <div class="card-content">
          <h3>${{ formatNumber(totalPendiente) }}</h3>
          <p>Total Pendiente</p>
        </div>
      </div>
      
      <div class="resumen-card resumen-card-action" @click="crearNuevaDeuda">
        <i class="card-icon">➕</i>
        <div class="card-content">
          <h3>Nueva Deuda</h3>
          <p>Agregar deuda</p>
        </div>
      </div>
    </div>

    <!-- Filtros y Acciones -->
    <div class="filtros-card">
      <h3 class="section-title">
        <i class="icon-filter">🔍</i>
        Filtros y Acciones
      </h3>
      <div class="filtros-container">
        <select v-model="filtroEstado" class="filtro-select">
          <option value="">Con saldo pendiente</option>
          <option value="pendiente">Solo Pendientes</option>
          <option value="parcial">Solo Pago Parcial</option>
          <option value="pagado">Solo Pagadas</option>
        </select>
        
        <select v-model="filtroProveedor" class="filtro-select">
          <option value="">Todos los proveedores</option>
          <option v-for="proveedor in proveedoresUnicos" :key="proveedor.id" :value="proveedor.id">
            {{ proveedor.nombre }}
          </option>
        </select>
        
        <input 
          type="date" 
          v-model="filtroFechaInicio" 
          class="filtro-input"
          placeholder="Fecha inicio"
        >
        
        <input 
          type="date" 
          v-model="filtroFechaFin" 
          class="filtro-input"
          placeholder="Fecha fin"
        >
        
        <button @click="limpiarFiltros" class="btn-limpiar">
          <i class="icon">🗑️</i>
          Limpiar
        </button>
        
        <button @click="abrirModalAbonoGeneral" class="btn-abono-general">
          <i class="icon">💵</i>
          Abono General
        </button>
        
        <button @click="verHistorialCompleto" class="btn-historial-completo">
          <i class="icon">📊</i>
          Historial Completo
        </button>
      </div>
    </div>

    <!-- Lista de Deudas Agrupadas por Proveedor -->
    <div class="deudas-container" v-if="deudasFiltradas.length > 0">
      <div class="paginacion-info">
        <p>Mostrando {{ deudasFiltradas.length }} deudas agrupadas por proveedor</p>
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
                <td>{{ formatDate(deuda.fecha) }}</td>
                <td>${{ formatNumber(deuda.totalDeuda) }}</td>
                <td>${{ formatNumber(deuda.saldoPendiente) }}</td>
                <td>
                  <span :class="'estado-badge ' + deuda.estado">
                    {{ getEstadoLabel(deuda.estado) }}
                  </span>
                </td>
                <td class="acciones">
                  <button @click="abrirModalAbono(deuda)" class="btn-detalle" title="Realizar abono" :disabled="deuda.estado === 'pagado'">
                    <i class="fas fa-money-bill">💵</i>
                  </button>
                  <button @click="verDetalleDeuda(deuda)" class="btn-abono" title="Ver detalle de la deuda">
                    <i class="fas fa-eye">👁️</i>
                  </button>
                  <button @click="eliminarDeuda(deuda)" class="btn-eliminar" title="Eliminar deuda">
                    <i class="fas fa-trash-alt">🗑️</i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div v-else class="no-deudas">
      <i class="empty-icon">📭</i>
      <h3>No hay deudas registradas</h3>
      <p v-if="deudas.length === 0">No se encontraron deudas para el barco {{ nombreBarco }}</p>
      <p v-else>No se encontraron deudas para los filtros seleccionados ({{ deudas.length }} deudas disponibles)</p>
      
      <div v-if="deudas.length === 0" class="debug-suggestions">
        <h4>💡 Posibles soluciones:</h4>
        <ul>
          <li>Verifica que hayas creado deudas para el barco <strong>{{ nombreBarco }}</strong></li>
          <li>Revisa la consola del navegador (F12) para ver mensajes de debug</li>
          <li>Asegúrate de que las deudas se guardaron correctamente en Firebase</li>
          <li>Verifica que el campo "barco" en Firebase sea exactamente: <strong>{{ barcoSeleccionado }}</strong></li>
        </ul>
        
        <div class="action-buttons">
          <button @click="$router.push('/barcos/deudas/nueva?barco=' + barcoSeleccionado)" class="btn-crear">
            ➕ Crear Primera Deuda
          </button>
          <button @click="loadDeudas" class="btn-reload">
            🔄 Recargar Deudas
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Abono -->
    <div v-if="showModalAbono" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Realizar Abono</h2>
          <button @click="showModalAbono = false" class="close-button">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="deuda-info">
            <h4>{{ deudaSeleccionada.nombreProveedor }}</h4>
            <p>Saldo pendiente: ${{ formatNumber(deudaSeleccionada.saldoPendiente) }}</p>
          </div>
          
          <form @submit.prevent="guardarAbono">
            <div class="form-group">
              <label>Monto del abono</label>
              <input 
                v-model.number="nuevoAbono.monto" 
                type="number" 
                step="0.01"
                required
                :max="deudaSeleccionada.saldoPendiente"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label>Descripción (opcional)</label>
              <input 
                v-model="nuevoAbono.descripcion" 
                type="text"
                placeholder="Descripción del abono"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label>Fecha del abono</label>
              <input 
                v-model="nuevoAbono.fecha" 
                type="date"
                required
                class="form-input"
              >
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="showModalAbono = false" class="btn-cancelar">
                Cancelar
              </button>
              <button type="submit" class="btn-guardar">
                Guardar Abono
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Detalle de Deuda -->
    <div v-if="showModalHistorial" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content modal-detalle-deuda" @click.stop>
        <div class="modal-header">
          <h2>Detalle de Deuda</h2>
          <button @click="showModalHistorial = false" class="close-button">✕</button>
        </div>
        
        <div class="modal-body">
          <!-- Información General de la Deuda -->
          <div class="deuda-info-completa">
            <div class="info-header">
              <div class="proveedor-info">
                <div 
                  class="color-indicator-modal" 
                  :style="{ backgroundColor: getProveedorColor(deudaSeleccionada.proveedorId) }"
                ></div>
                <div>
                  <h3>{{ deudaSeleccionada.nombreProveedor }}</h3>
                  <p class="fecha-deuda">{{ formatDate(deudaSeleccionada.fecha) }}</p>
                </div>
              </div>
              <div class="estado-deuda">
                <span :class="'estado-badge ' + deudaSeleccionada.estado">
                  {{ getEstadoLabel(deudaSeleccionada.estado) }}
                </span>
              </div>
            </div>
            
            <!-- Items/Productos de la Deuda -->
            <div v-if="deudaSeleccionada.items && deudaSeleccionada.items.length > 0" class="items-section">
              <h4>Productos/Items:</h4>
              <div class="items-list">
                <div v-for="(item, index) in deudaSeleccionada.items" :key="index" class="item-detalle">
                  <div class="item-descripcion">{{ item.descripcion }}</div>
                  <div class="item-cantidad" v-if="item.cantidad">Cantidad: {{ formatNumber(item.cantidad) }}</div>
                  <div class="item-precio" v-if="item.precioUnitario">Precio unitario: ${{ formatNumber(item.precioUnitario) }}</div>
                  <div class="item-total">Total: ${{ formatNumber(item.total || item.costo || 0) }}</div>
                </div>
              </div>
            </div>
            
            <!-- Resumen Financiero -->
            <div class="resumen-financiero">
              <div class="resumen-item">
                <span class="label">Total de la Deuda:</span>
                <span class="value total">${{ formatNumber(deudaSeleccionada.totalDeuda) }}</span>
              </div>
              <div class="resumen-item">
                <span class="label">Total Abonado:</span>
                <span class="value abonado">${{ formatNumber(deudaSeleccionada.totalAbonado || 0) }}</span>
              </div>
              <div class="resumen-item">
                <span class="label">Saldo Pendiente:</span>
                <span class="value pendiente">${{ formatNumber(deudaSeleccionada.saldoPendiente) }}</span>
              </div>
            </div>
          </div>
          
          <!-- Historial de Abonos -->
          <div class="historial-section">
            <h4>Historial de Abonos</h4>
            
            <div v-if="historialAbonos.length > 0" class="abonos-list">
              <div v-for="(abono, index) in historialAbonos" :key="abono.id" class="abono-item">
                <div class="abono-info">
                  <div class="abono-fecha">{{ formatDate(abono.fecha) }}</div>
                  <div class="abono-descripcion">{{ abono.descripcion || 'Abono' }}</div>
                  <div class="abono-monto">${{ formatNumber(abono.monto) }}</div>
                </div>
                <div class="abono-acciones">
                  <button 
                    @click="eliminarAbono(abono, index)"
                    class="btn-eliminar-abono"
                    title="Eliminar abono"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div class="abonos-total">
                <span>Total abonado:</span>
                <span>${{ formatNumber(totalAbonosHistorial) }}</span>
              </div>
            </div>
            
            <div v-else class="no-abonos">
              <p>No hay abonos registrados para esta deuda</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Abono General -->
    <div v-if="showModalAbonoGeneral" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content modal-abono-general" @click.stop>
        <div class="modal-header">
          <h2>Abono General - {{ nombreBarco }}</h2>
          <button @click="showModalAbonoGeneral = false" class="close-button">✕</button>
        </div>
        
        <div class="modal-body">
          <!-- Resumen de deudas disponibles -->
          <div class="resumen-deudas">
            <h3>Resumen de Deudas</h3>
            <div class="resumen-cards-mini">
              <div class="resumen-card-mini">
                <span class="label">Deudas pendientes:</span>
                <span class="valor">{{ deudasParaAbono.length }}</span>
              </div>
              <div class="resumen-card-mini">
                <span class="label">Saldo total:</span>
                <span class="valor">${{ formatNumber(saldoTotalParaAbono) }}</span>
              </div>
            </div>
          </div>
          
          <form @submit.prevent="guardarAbonoGeneral">
            <div class="form-group">
              <label>Proveedor</label>
              <select v-model="abonoGeneral.proveedorId" class="form-input" @change="calcularDistribucion">
                <option value="">Todas las deudas del barco</option>
                <option v-for="proveedor in proveedoresUnicos" :key="proveedor.id" :value="proveedor.id">
                  {{ proveedor.nombre }}
                </option>
              </select>
              <small class="form-help">Si selecciona un proveedor, el abono se aplicará solo a sus deudas</small>
            </div>
            
            <div class="form-group">
              <label>Monto del abono</label>
              <input 
                v-model.number="abonoGeneral.monto" 
                type="number" 
                step="0.01"
                min="0.01"
                :max="saldoTotalParaAbono"
                required
                class="form-input"
                @input="calcularDistribucion"
              >
              <small class="form-help">Máximo disponible: ${{ formatNumber(saldoTotalParaAbono) }}</small>
            </div>
            
            <div class="form-group">
              <label>Descripción</label>
              <input 
                v-model="abonoGeneral.descripcion" 
                type="text"
                required
                placeholder="Ej: Pago general, Transferencia, etc."
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label>Fecha del abono</label>
              <input 
                v-model="abonoGeneral.fecha" 
                type="date"
                required
                class="form-input"
              >
            </div>
            
            <!-- Vista previa de distribución -->
            <div v-if="abonoGeneral.monto > 0 && distribucionPreview.length > 0" class="distribucion-preview">
              <h4>🔄 Vista previa de distribución (por antigüedad):</h4>
              <div class="deudas-distribucion">
                <div 
                  v-for="(dist, index) in distribucionPreview.slice(0, 5)" 
                  :key="dist.deuda.id"
                  class="deuda-distribucion-item"
                >
                  <div class="deuda-info-dist">
                    <span class="fecha">{{ formatDate(dist.deuda.fecha) }}</span>
                    <span class="proveedor">{{ dist.deuda.nombreProveedor }}</span>
                    <span class="saldo-actual">${{ formatNumber(dist.deuda.saldoPendiente) }}</span>
                  </div>
                  <div class="abono-aplicado">
                    <span class="monto-abono">${{ formatNumber(dist.montoAbono) }}</span>
                    <span class="saldo-restante" :class="{ 'pagado': dist.saldoRestante === 0 }">
                      {{ dist.saldoRestante === 0 ? '¡PAGADO!' : `Resta: $${formatNumber(dist.saldoRestante)}` }}
                    </span>
                  </div>
                </div>
                <div v-if="distribucionPreview.length > 5" class="mas-deudas">
                  ... y {{ distribucionPreview.length - 5 }} deudas más
                </div>
              </div>
              
              <div class="resumen-distribucion">
                <div class="total-distribuido">
                  <span>💰 Total a distribuir: ${{ formatNumber(totalDistribuidoPreview) }}</span>
                </div>
                <div v-if="montoSobrantePreview > 0" class="monto-sobrante">
                  <span>⚡ Sobrante (se aplicará a la primera deuda): ${{ formatNumber(montoSobrantePreview) }}</span>
                </div>
              </div>
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="showModalAbonoGeneral = false" class="btn-cancelar">
                Cancelar
              </button>
              <button 
                type="submit" 
                class="btn-guardar"
                :disabled="!abonoGeneral.monto || abonoGeneral.monto <= 0 || deudasParaAbono.length === 0"
              >
                {{ deudasParaAbono.length === 0 ? 'No hay deudas pendientes' : 'Aplicar Abono General' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Historial Completo -->
    <div v-if="showModalHistorialCompleto" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content modal-historial-completo" @click.stop>
        <div class="modal-header">
          <h2>Historial Completo de Abonos - {{ nombreBarco }}</h2>
          <button @click="showModalHistorialCompleto = false" class="close-button">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="filtros-historial">
            <select v-model="filtroHistorialTipo" class="form-input">
              <option value="">Todos los tipos</option>
              <option value="general">Abonos Generales</option>
              <option value="deuda">Abonos a Deudas</option>
            </select>
            
            <select v-model="filtroHistorialProveedor" class="form-input">
              <option value="">Todos los proveedores</option>
              <option v-for="proveedor in proveedoresUnicos" :key="proveedor.id" :value="proveedor.id">
                {{ proveedor.nombre }}
              </option>
            </select>
          </div>
          
          <div v-if="historialCompletoFiltrado.length > 0" class="abonos-list-completo">
            <div v-for="(abono, index) in historialCompletoFiltrado" :key="abono.id" class="abono-item-completo">
              <div class="abono-fecha">{{ formatDate(abono.fecha) }}</div>
              <div class="abono-info">
                <div class="abono-descripcion">
                  {{ abono.descripcion }}
                  <span v-if="abono.tipo === 'general'" class="badge-general">General</span>
                  <span v-else class="badge-deuda">Deuda</span>
                </div>
                <div class="abono-proveedor">{{ abono.nombreProveedor }}</div>
              </div>
              <div class="abono-monto">${{ formatNumber(abono.monto) }}</div>
              <div class="abono-acciones-completo">
                <button 
                  @click="eliminarAbonoCompleto(abono, index)"
                  class="btn-eliminar-abono"
                  title="Eliminar abono"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div class="abonos-total-completo">
              <span>Total de abonos:</span>
              <span>${{ formatNumber(totalHistorialCompleto) }}</span>
            </div>
          </div>
          
          <div v-else class="no-abonos">
            <p>No hay abonos registrados para los filtros seleccionados</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, orderBy } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';

export default {
  name: 'ListaDeudasBarcos',
  components: {
    BackButton
  },
  data() {
    return {
      barcoSeleccionado: '',
      deudas: [],
      proveedores: [],
      filtroEstado: '', // Por defecto mostrar pendientes y parciales
      filtroProveedor: '',
      filtroFechaInicio: '',
      filtroFechaFin: '',
      showModalAbono: false,
      showModalHistorial: false,
      showModalAbonoGeneral: false,
      showModalHistorialCompleto: false,
      deudaSeleccionada: null,
      nuevoAbono: {
        monto: null,
        descripcion: '',
        fecha: new Date().toISOString().split('T')[0]
      },
      abonoGeneral: {
        monto: null,
        descripcion: '',
        fecha: new Date().toISOString().split('T')[0],
        proveedorId: ''
      },
      historialAbonos: [],
      historialCompleto: [],
      filtroHistorialTipo: '',
      filtroHistorialProveedor: ''
    };
  },
  computed: {
    nombreBarco() {
      return this.barcoSeleccionado === 'galileo' ? 'El Galileo' : 'María Guadalupe';
    },
    deudasFiltradas() {
      return this.deudas.filter(deuda => {
        // Filtro por estado - Si no hay filtro específico, mostrar pendientes y parciales
        if (this.filtroEstado) {
          if (deuda.estado !== this.filtroEstado) {
            return false;
          }
        } else {
          // Por defecto mostrar deudas con saldo pendiente (pendiente y parcial)
          if (deuda.estado === 'pagado') {
            return false;
          }
        }
        
        // Filtro por proveedor
        if (this.filtroProveedor && deuda.proveedorId !== this.filtroProveedor) {
          return false;
        }
        
        // Filtro por fecha
        if (this.filtroFechaInicio || this.filtroFechaFin) {
          const fechaDeuda = new Date(deuda.fecha);
          if (this.filtroFechaInicio && fechaDeuda < new Date(this.filtroFechaInicio)) {
            return false;
          }
          if (this.filtroFechaFin && fechaDeuda > new Date(this.filtroFechaFin)) {
            return false;
          }
        }
        
        return true;
      });
    },
    proveedoresUnicos() {
      const proveedoresMap = new Map();
      this.deudas.forEach(deuda => {
        if (!proveedoresMap.has(deuda.proveedorId)) {
          proveedoresMap.set(deuda.proveedorId, {
            id: deuda.proveedorId,
            nombre: deuda.nombreProveedor
          });
        }
      });
      return Array.from(proveedoresMap.values());
    },
    totalAbonado() {
      return this.deudasFiltradas.reduce((total, deuda) => total + deuda.totalAbonado, 0);
    },
    totalPendiente() {
      return this.deudasFiltradas.reduce((total, deuda) => total + deuda.saldoPendiente, 0);
    },
    totalAbonosHistorial() {
      return this.historialAbonos.reduce((total, abono) => total + abono.monto, 0);
    },
    historialCompletoFiltrado() {
      return this.historialCompleto.filter(abono => {
        // Filtro por tipo
        if (this.filtroHistorialTipo) {
          if (this.filtroHistorialTipo === 'general' && abono.tipo !== 'general') {
            return false;
          }
          if (this.filtroHistorialTipo === 'deuda' && abono.tipo === 'general') {
            return false;
          }
        }
        
        // Filtro por proveedor
        if (this.filtroHistorialProveedor && abono.proveedorId !== this.filtroHistorialProveedor) {
          return false;
        }
        
        return true;
      }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    },
    totalHistorialCompleto() {
      return this.historialCompletoFiltrado.reduce((total, abono) => total + abono.monto, 0);
    },
    deudasParaAbono() {
      if (this.abonoGeneral.proveedorId) {
        // Filtrar por proveedor específico
        return this.deudas.filter(deuda => 
          deuda.proveedorId === this.abonoGeneral.proveedorId && 
          deuda.estado !== 'pagado' && 
          deuda.saldoPendiente > 0
        );
      } else {
        // Todas las deudas pendientes del barco
        return this.deudas.filter(deuda => 
          deuda.estado !== 'pagado' && 
          deuda.saldoPendiente > 0
        );
      }
    },
    saldoTotalParaAbono() {
      return this.deudasParaAbono.reduce((sum, deuda) => sum + deuda.saldoPendiente, 0);
    },
    distribucionPreview() {
      if (!this.abonoGeneral.monto || this.deudasParaAbono.length === 0) return [];
      
      // Ordenar deudas por fecha (más antiguas primero)
      const deudasOrdenadas = [...this.deudasParaAbono].sort((a, b) => 
        new Date(a.fecha) - new Date(b.fecha)
      );
      
      let montoRestante = this.abonoGeneral.monto;
      const distribucion = [];
      
      for (const deuda of deudasOrdenadas) {
        if (montoRestante <= 0) break;
        
        const montoAbono = Math.min(montoRestante, deuda.saldoPendiente);
        const saldoRestante = deuda.saldoPendiente - montoAbono;
        
        distribucion.push({
          deuda: deuda,
          montoAbono: montoAbono,
          saldoRestante: saldoRestante
        });
        
        montoRestante -= montoAbono;
      }
      
      return distribucion;
    },
    totalDistribuidoPreview() {
      return this.distribucionPreview.reduce((sum, dist) => sum + dist.montoAbono, 0);
    },
    montoSobrantePreview() {
      return this.abonoGeneral.monto - this.totalDistribuidoPreview;
    },
    deudasAgrupadasPorProveedor() {
      const grupos = {};
      
      this.deudasFiltradas.forEach(deuda => {
        const proveedorId = deuda.proveedorId;
        const proveedorNombre = deuda.nombreProveedor || 'Proveedor sin nombre';
        
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
        grupos[proveedorId].totalDeuda += deuda.totalDeuda;
        grupos[proveedorId].totalPendiente += deuda.saldoPendiente;
      });
      
      // Convertir a array y ordenar por nombre de proveedor
      return Object.values(grupos).sort((a, b) => 
        a.proveedor.nombre.localeCompare(b.proveedor.nombre)
      );
    }
  },
  mounted() {
    // Obtener el barco de la query string
    const urlParams = new URLSearchParams(window.location.search);
    this.barcoSeleccionado = urlParams.get('barco') || localStorage.getItem('barcoSeleccionado') || 'galileo';
    
    console.log('🚢 Cargando deudas para:', this.nombreBarco);
    
    this.loadDeudas();
    this.loadProveedores();
  },
  methods: {
    async loadDeudas() {
      try {
        // Consulta sin orderBy para evitar índice requerido
        const q = query(
          collection(db, 'deudasBarcos'),
          where('barco', '==', this.barcoSeleccionado)
        );
        
        const querySnapshot = await getDocs(q);
        
        this.deudas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => {
          // Ordenar manualmente por fecha (más reciente primero)
          return new Date(b.fecha) - new Date(a.fecha);
        });
        
        console.log(`✅ ${this.deudas.length} deudas cargadas para ${this.nombreBarco}`);
        
      } catch (error) {
        console.error('❌ Error al cargar deudas:', error);
        alert('Error al cargar las deudas: ' + error.message);
      }
    },
    async loadProveedores() {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedoresBarcos'));
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
      }
    },
    getProveedorColor(proveedorId) {
      const proveedor = this.proveedores.find(p => p.id === proveedorId);
      return proveedor?.color || '#6c757d';
    },
    formatNumber(num) {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num || 0);
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const fecha = new Date(dateString + 'T00:00:00');
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    getEstadoLabel(estado) {
      const labels = {
        'pendiente': 'Pendiente',
        'pagado': 'Pagado',
        'parcial': 'Pago Parcial'
      };
      return labels[estado] || estado;
    },
    crearNuevaDeuda() {
      this.$router.push(`/barcos/deudas/nueva?barco=${this.barcoSeleccionado}`);
    },
    limpiarFiltros() {
      this.filtroEstado = '';
      this.filtroProveedor = '';
      this.filtroFechaInicio = '';
      this.filtroFechaFin = '';
    },
    filtrarPorProveedor(proveedorId) {
      // Si ya está filtrado por este proveedor, limpiar el filtro
      if (this.filtroProveedor === proveedorId) {
        this.filtroProveedor = '';
      } else {
        this.filtroProveedor = proveedorId;
      }
      
      // Scroll hacia arriba suavemente para ver los filtros
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    },
    abrirModalAbono(deuda) {
      this.deudaSeleccionada = deuda;
      this.nuevoAbono = {
        monto: null,
        descripcion: '',
        fecha: new Date().toISOString().split('T')[0]
      };
      this.showModalAbono = true;
    },
    async guardarAbono() {
      if (!this.nuevoAbono.monto || this.nuevoAbono.monto <= 0) {
        alert('Por favor ingrese un monto válido');
        return;
      }
      
      if (this.nuevoAbono.monto > this.deudaSeleccionada.saldoPendiente) {
        alert('El monto del abono no puede ser mayor al saldo pendiente');
        return;
      }
      
      try {
        // Guardar el abono
        await addDoc(collection(db, 'abonosBarcos'), {
          deudaId: this.deudaSeleccionada.id,
          barco: this.barcoSeleccionado,
          nombreBarco: this.nombreBarco,
          proveedorId: this.deudaSeleccionada.proveedorId,
          nombreProveedor: this.deudaSeleccionada.nombreProveedor,
          monto: this.nuevoAbono.monto,
          descripcion: this.nuevoAbono.descripcion || 'Abono',
          fecha: this.nuevoAbono.fecha,
          createdAt: new Date()
        });
        
        // Actualizar la deuda
        const nuevoTotalAbonado = this.deudaSeleccionada.totalAbonado + this.nuevoAbono.monto;
        const nuevoSaldoPendiente = this.deudaSeleccionada.totalDeuda - nuevoTotalAbonado;
        // Usar <= 0 para manejar problemas de precisión decimal y mantener lógica consistente
        const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'pagado' : (nuevoTotalAbonado > 0 ? 'parcial' : 'pendiente');
        
        await updateDoc(doc(db, 'deudasBarcos', this.deudaSeleccionada.id), {
          totalAbonado: nuevoTotalAbonado,
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado,
          updatedAt: new Date()
        });
        
        this.showModalAbono = false;
        await this.loadDeudas();
        alert('Abono registrado exitosamente');
      } catch (error) {
        console.error('Error al guardar abono:', error);
        alert('Error al guardar el abono');
      }
    },
    async verDetalleDeuda(deuda) {
      this.deudaSeleccionada = deuda;
      
      try {
        // Cargar abonos de la deuda
        const q = query(
          collection(db, 'abonosBarcos'),
          where('deudaId', '==', deuda.id)
        );
        
        const querySnapshot = await getDocs(q);
        this.historialAbonos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => {
          // Ordenar manualmente por fecha (más reciente primero)
          return new Date(b.fecha) - new Date(a.fecha);
        });
        
        this.showModalHistorial = true;
      } catch (error) {
        console.error('Error al cargar detalle de la deuda:', error);
        alert('Error al cargar el detalle de la deuda');
      }
    },
    async eliminarDeuda(deuda) {
      if (confirm('¿Está seguro de eliminar esta deuda? Esta acción no se puede deshacer.')) {
        try {
          // Eliminar abonos asociados
          const q = query(
            collection(db, 'abonosBarcos'),
            where('deudaId', '==', deuda.id)
          );
          
          const querySnapshot = await getDocs(q);
          const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
          
          // Eliminar la deuda
          await deleteDoc(doc(db, 'deudasBarcos', deuda.id));
          
          await this.loadDeudas();
          alert('Deuda eliminada exitosamente');
        } catch (error) {
          console.error('Error al eliminar deuda:', error);
          alert('Error al eliminar la deuda');
        }
      }
    },
    abrirModalAbonoGeneral() {
      this.abonoGeneral = {
        monto: null,
        descripcion: '',
        fecha: new Date().toISOString().split('T')[0],
        proveedorId: ''
      };
      this.showModalAbonoGeneral = true;
    },
    calcularDistribucion() {
      // Este método se ejecuta cuando cambia el monto o el proveedor
      // Las propiedades computadas se actualizarán automáticamente
      this.$nextTick(() => {
        // Force reactivity update if needed
      });
    },
    async guardarAbonoGeneral() {
      if (!this.abonoGeneral.monto || this.abonoGeneral.monto <= 0) {
        alert('Por favor ingrese un monto válido');
        return;
      }
      
      if (!this.abonoGeneral.descripcion.trim()) {
        alert('Por favor ingrese una descripción');
        return;
      }
      
      try {
        const proveedorNombre = this.abonoGeneral.proveedorId ? 
          this.proveedoresUnicos.find(p => p.id === this.abonoGeneral.proveedorId)?.nombre || 'Proveedor no encontrado' :
          'Sin proveedor específico';
        
        // Si hay proveedor específico, distribuir automáticamente entre sus deudas pendientes
        if (this.abonoGeneral.proveedorId) {
          await this.distribuirAbonoEnDeudas();
        } else {
          // Si no hay proveedor específico, distribuir entre TODAS las deudas pendientes del barco
          await this.distribuirAbonoGeneralCompleto();
        }
        
        this.showModalAbonoGeneral = false;
        alert('Abono general aplicado exitosamente a las deudas');
        await this.loadDeudas(); // Recargar para ver los cambios
        
      } catch (error) {
        console.error('Error al aplicar abono general:', error);
        alert('Error al aplicar el abono general: ' + error.message);
      }
    },
    
    async distribuirAbonoEnDeudas() {
      // Obtener deudas pendientes del proveedor específico
      const deudasProveedor = this.deudas.filter(deuda => 
        deuda.proveedorId === this.abonoGeneral.proveedorId && 
        deuda.estado !== 'pagado' && 
        deuda.saldoPendiente > 0
      );
      
      if (deudasProveedor.length === 0) {
        alert('No hay deudas pendientes para este proveedor');
        return;
      }
      
      await this.aplicarDistribucionAbono(deudasProveedor);
    },
    
    async distribuirAbonoGeneralCompleto() {
      // Obtener TODAS las deudas pendientes del barco
      const todasLasDeudas = this.deudas.filter(deuda => 
        deuda.estado !== 'pagado' && 
        deuda.saldoPendiente > 0
      );
      
      if (todasLasDeudas.length === 0) {
        alert('No hay deudas pendientes en este barco');
        return;
      }
      
      await this.aplicarDistribucionAbono(todasLasDeudas);
    },
    
    async aplicarDistribucionAbono(deudasPendientes) {
      // Ordenar deudas por fecha (más antiguas primero)
      const deudasOrdenadas = [...deudasPendientes].sort((a, b) => 
        new Date(a.fecha) - new Date(b.fecha)
      );
      
      let montoRestante = this.abonoGeneral.monto;
      const distribucion = [];
      
      // Calcular distribución
      for (const deuda of deudasOrdenadas) {
        if (montoRestante <= 0) break;
        
        const montoAbono = Math.min(montoRestante, deuda.saldoPendiente);
        const saldoRestante = deuda.saldoPendiente - montoAbono;
        
        distribucion.push({
          deuda: deuda,
          montoAbono: montoAbono,
          saldoRestante: saldoRestante
        });
        
        montoRestante -= montoAbono;
      }
      
      const proveedorNombre = this.abonoGeneral.proveedorId ? 
        this.proveedoresUnicos.find(p => p.id === this.abonoGeneral.proveedorId)?.nombre || 'Proveedor no encontrado' :
        'Distribución general';
      
      // Aplicar abonos a cada deuda
      for (const dist of distribucion) {
        if (dist.montoAbono > 0) {
          // Registrar el abono
          await addDoc(collection(db, 'abonosBarcos'), {
            deudaId: dist.deuda.id,
            barco: this.barcoSeleccionado,
            nombreBarco: this.nombreBarco,
            proveedorId: dist.deuda.proveedorId,
            nombreProveedor: dist.deuda.nombreProveedor,
            monto: dist.montoAbono,
            descripcion: `${this.abonoGeneral.descripcion} (Abono General Distribuido)`,
            fecha: this.abonoGeneral.fecha,
            tipo: 'deuda', // Se convierte en abono de deuda específica
            createdAt: new Date()
          });
          
          // Actualizar la deuda
          const nuevoTotalAbonado = dist.deuda.totalAbonado + dist.montoAbono;
          const nuevoSaldoPendiente = dist.saldoRestante;
          const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'pagado' : (nuevoTotalAbonado > 0 ? 'parcial' : 'pendiente');
          
          await updateDoc(doc(db, 'deudasBarcos', dist.deuda.id), {
            totalAbonado: nuevoTotalAbonado,
            saldoPendiente: nuevoSaldoPendiente,
            estado: nuevoEstado,
            updatedAt: new Date()
          });
        }
      }
      
      // Si queda dinero sobrante, aplicarlo a la primera deuda como crédito adicional
      if (montoRestante > 0 && distribucion.length > 0) {
        const primeraDeuda = distribucion[0].deuda;
        
        await addDoc(collection(db, 'abonosBarcos'), {
          deudaId: primeraDeuda.id,
          barco: this.barcoSeleccionado,
          nombreBarco: this.nombreBarco,
          proveedorId: primeraDeuda.proveedorId,
          nombreProveedor: primeraDeuda.nombreProveedor,
          monto: montoRestante,
          descripcion: `${this.abonoGeneral.descripcion} (Sobrante del Abono General)`,
          fecha: this.abonoGeneral.fecha,
          tipo: 'deuda',
          createdAt: new Date()
        });
        
        // Actualizar la primera deuda con el sobrante
        const saldoActualizado = Math.max(0, distribucion[0].saldoRestante - montoRestante);
        await updateDoc(doc(db, 'deudasBarcos', primeraDeuda.id), {
          totalAbonado: primeraDeuda.totalAbonado + distribucion[0].montoAbono + montoRestante,
          saldoPendiente: saldoActualizado,
          estado: saldoActualizado <= 0 ? 'pagado' : 'parcial',
          updatedAt: new Date()
        });
      }
      
      console.log(`💰 Abono general de $${this.formatNumber(this.abonoGeneral.monto)} distribuido entre ${distribucion.length} deudas`);
    },
    async verHistorialCompleto() {
      try {
        await this.loadHistorialCompleto();
        this.filtroHistorialTipo = '';
        this.filtroHistorialProveedor = '';
        this.showModalHistorialCompleto = true;
      } catch (error) {
        console.error('Error al cargar historial completo:', error);
        alert('Error al cargar el historial completo');
      }
    },
    async loadHistorialCompleto() {
      try {
        const q = query(
          collection(db, 'abonosBarcos'),
          where('barco', '==', this.barcoSeleccionado)
        );
        
        const querySnapshot = await getDocs(q);
        this.historialCompleto = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          tipo: doc.data().tipo || 'deuda' // Marcar abonos antiguos como de deuda
        })).sort((a, b) => {
          // Ordenar manualmente por fecha (más reciente primero)
          return new Date(b.fecha) - new Date(a.fecha);
        });
      } catch (error) {
        console.error('Error al cargar historial completo:', error);
      }
    },
    async eliminarAbono(abono, index) {
      if (!confirm('¿Está seguro de eliminar este abono? Esta acción actualizará el saldo de la deuda.')) {
        return;
      }
      
      try {
        // Eliminar el abono de Firebase
        await deleteDoc(doc(db, 'abonosBarcos', abono.id));
        
        // Eliminar de la lista local
        this.historialAbonos.splice(index, 1);
        
        // Recalcular totales de la deuda
        const totalAbonado = this.historialAbonos.reduce((sum, a) => sum + a.monto, 0);
        const nuevoSaldoPendiente = this.deudaSeleccionada.totalDeuda - totalAbonado;
        const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'pagado' : (totalAbonado > 0 ? 'parcial' : 'pendiente');
        
        // Actualizar la deuda en Firebase
        await updateDoc(doc(db, 'deudasBarcos', this.deudaSeleccionada.id), {
          totalAbonado: totalAbonado,
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado,
          updatedAt: new Date()
        });
        
        // Actualizar la deuda local seleccionada
        this.deudaSeleccionada.totalAbonado = totalAbonado;
        this.deudaSeleccionada.saldoPendiente = nuevoSaldoPendiente;
        this.deudaSeleccionada.estado = nuevoEstado;
        
        // Actualizar en la lista principal de deudas
        const deudaIndex = this.deudas.findIndex(d => d.id === this.deudaSeleccionada.id);
        if (deudaIndex !== -1) {
          this.deudas[deudaIndex] = {
            ...this.deudas[deudaIndex],
            totalAbonado: totalAbonado,
            saldoPendiente: nuevoSaldoPendiente,
            estado: nuevoEstado
          };
        }
        
        console.log(`✅ Abono eliminado y deuda actualizada`);
        
      } catch (error) {
        console.error('Error al eliminar abono:', error);
        alert('Error al eliminar el abono: ' + error.message);
      } finally {
        // Recargar deudas para asegurar que todos los totales estén actualizados
        await this.loadDeudas();
      }
    },
    
    async eliminarAbonoCompleto(abono, index) {
      if (!confirm('¿Está seguro de eliminar este abono? Esta acción actualizará el saldo de la deuda correspondiente.')) {
        return;
      }
      
      try {
        // Eliminar el abono de Firebase
        await deleteDoc(doc(db, 'abonosBarcos', abono.id));
        
        // Eliminar de la lista local del historial completo
        this.historialCompleto.splice(this.historialCompleto.findIndex(a => a.id === abono.id), 1);
        
        // Si el abono estaba asociado a una deuda específica, actualizar esa deuda
        if (abono.deudaId) {
          // Obtener todos los abonos restantes para esa deuda
          const q = query(
            collection(db, 'abonosBarcos'),
            where('deudaId', '==', abono.deudaId)
          );
          
          const querySnapshot = await getDocs(q);
          const abonosRestantes = querySnapshot.docs.map(doc => doc.data());
          
          // Recalcular totales
          const totalAbonado = abonosRestantes.reduce((sum, a) => sum + a.monto, 0);
          
          // Buscar la deuda en la lista local para obtener el total
          const deudaAfectada = this.deudas.find(d => d.id === abono.deudaId);
          if (deudaAfectada) {
            const nuevoSaldoPendiente = deudaAfectada.totalDeuda - totalAbonado;
            const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'pagado' : (totalAbonado > 0 ? 'parcial' : 'pendiente');
            
            // Actualizar la deuda en Firebase
            await updateDoc(doc(db, 'deudasBarcos', abono.deudaId), {
              totalAbonado: totalAbonado,
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoEstado,
              updatedAt: new Date()
            });
            
            // Actualizar en la lista local
            const deudaIndex = this.deudas.findIndex(d => d.id === abono.deudaId);
            if (deudaIndex !== -1) {
              this.deudas[deudaIndex] = {
                ...this.deudas[deudaIndex],
                totalAbonado: totalAbonado,
                saldoPendiente: nuevoSaldoPendiente,
                estado: nuevoEstado
              };
            }
          }
        }
        
        console.log(`✅ Abono eliminado del historial completo`);
        
      } catch (error) {
        console.error('Error al eliminar abono:', error);
        alert('Error al eliminar el abono: ' + error.message);
      } finally {
        // Recargar deudas para asegurar que todos los totales estén actualizados
        await this.loadDeudas();
      }
    },
    
    closeModalOnOverlay(event) {
      if (event.target.classList.contains('modal-overlay')) {
        this.showModalAbono = false;
        this.showModalHistorial = false;
        this.showModalAbonoGeneral = false;
        this.showModalHistorialCompleto = false;
      }
    }
  }
};
</script>

<style scoped>
.lista-deudas-barcos {
  padding: 20px;
  max-width: 5000px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.back-button-container {
  margin-bottom: 30px;
}

/* Header Section */
.header-section {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(52, 152, 219, 0.3);
}

.header-content {
  text-align: center;
  color: white;
}

.main-title {
  font-size: 2.5em;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.subtitle {
  font-size: 1.2em;
  opacity: 0.9;
  margin: 0;
}

/* Resumen Cards */
.resumen-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  margin-bottom: 30px;
}

.resumen-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
}

.resumen-card-action {
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  color: white;
  cursor: pointer;
  border: 2px solid transparent;
}

.resumen-card-action:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(39, 174, 96, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
}

.resumen-card-action .card-content h3,
.resumen-card-action .card-content p {
  color: white;
}

.barco-card {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
}

.card-icon {
  font-size: 2.5em;
}

.card-content h3 {
  margin: 0;
  font-size: 1.5em;
}

.card-content p {
  margin: 5px 0 0 0;
  opacity: 0.8;
}

/* Filtros */
.filtros-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.3em;
  margin-bottom: 20px;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.filtros-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
}

.filtro-select, .filtro-input {
  padding: 10px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1em;
  transition: all 0.3s ease;
}

.filtro-select:focus, .filtro-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.btn-nueva-deuda {
  background: #27ae60;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  order: -1; /* Hace que aparezca primero en flexbox */
}

.btn-nueva-deuda:hover {
  background: #229954;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
}

.btn-limpiar {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-limpiar:hover {
  background: #c0392b;
  transform: translateY(-2px);
}

.btn-abono-general {
  background: #27ae60;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-abono-general:hover {
  background: #229954;
  transform: translateY(-2px);
}

.btn-historial-completo {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-historial-completo:hover {
  background: #2980b9;
  transform: translateY(-2px);
}

/* Deudas Container */
.deudas-container {
  display: grid;
  gap: 20px;
}

.deuda-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.deuda-card:hover {
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.deuda-card.pagado {
  opacity: 0.8;
  background: #f0f0f0;
}

.deuda-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.proveedor-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.color-indicator {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  flex-shrink: 0;
}

.proveedor-info h3 {
  margin: 0;
  color: #2c3e50;
}

.fecha {
  color: #7f8c8d;
  margin: 5px 0 0 0;
}

/* Estado Badge */
.estado-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9em;
}

.estado-pendiente {
  background: #ffe0e0;
  color: #e74c3c;
}

.estado-pagado {
  background: #d4edda;
  color: #27ae60;
}

.estado-parcial {
  background: #fff3cd;
  color: #f39c12;
}

/* Deuda Items */
.deuda-items {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 10px;
}

.deuda-items h4 {
  margin: 0 0 10px 0;
  color: #34495e;
}

.deuda-items ul {
  margin: 0;
  padding-left: 20px;
}

.deuda-items li {
  margin: 5px 0;
  color: #555;
}

/* Deuda Totales */
.deuda-totales {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 10px;
}

.total-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 1.05em;
}

.total-item.saldo {
  border-top: 2px solid #e0e0e0;
  padding-top: 15px;
  font-weight: 600;
  color: #2c3e50;
}

.amount {
  font-weight: 600;
  color: #34495e;
}

.amount.abonado {
  color: #27ae60;
}

/* Deuda Actions */
.deuda-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.deuda-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95em;
}

.btn-abono {
  background: #27ae60;
  color: white;
}

.btn-abono:hover:not(:disabled) {
  background: #229954;
  transform: translateY(-2px);
}

.btn-abono:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-historial {
  background: #3498db;
  color: white;
}

.btn-historial:hover {
  background: #2980b9;
  transform: translateY(-2px);
}

.btn-eliminar {
  background: #e74c3c;
  color: white;
}

.btn-eliminar:hover {
  background: #c0392b;
  transform: translateY(-2px);
}

/* No Deudas */
.no-deudas {
  text-align: center;
  padding: 80px 20px;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 20px;
  display: block;
}

.no-deudas h3 {
  color: #34495e;
  margin: 0 0 10px 0;
}

.debug-suggestions {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  text-align: left;
}

.debug-suggestions h4 {
  color: #495057;
  margin-bottom: 15px;
}

.debug-suggestions ul {
  color: #6c757d;
  margin-bottom: 20px;
}

.debug-suggestions li {
  margin-bottom: 8px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-crear, .btn-reload {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-crear {
  background: #28a745;
  color: white;
}

.btn-crear:hover {
  background: #218838;
  transform: translateY(-2px);
}

.btn-reload {
  background: #17a2b8;
  color: white;
}

.btn-reload:hover {
  background: #138496;
  transform: translateY(-2px);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 15px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-detalle-deuda {
  max-width: 800px;
}

.modal-abono-general {
  max-width: 700px;
}

.modal-header {
  background: #f8f9fa;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
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
  transition: color 0.3s ease;
}

.close-button:hover {
  color: #2c3e50;
}

.modal-body {
  padding: 25px;
  overflow-y: auto;
  max-height: calc(90vh - 80px);
}

.deuda-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.deuda-info h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.deuda-info p {
  margin: 0;
  color: #7f8c8d;
}

/* Form Groups */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #34495e;
}

.form-input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1em;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.btn-cancelar, .btn-guardar {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancelar {
  background: #e0e0e0;
  color: #34495e;
}

.btn-cancelar:hover {
  background: #d0d0d0;
}

.btn-guardar {
  background: #27ae60;
  color: white;
}

.btn-guardar:hover {
  background: #229954;
  transform: translateY(-2px);
}

/* Abonos List */
.abonos-list {
  margin-top: 20px;
}

.abono-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}

.abono-item:hover {
  background: #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.abono-info {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 15px;
  flex: 1;
}

.abono-acciones {
  margin-left: 15px;
}

.abono-fecha {
  color: #7f8c8d;
}

.abono-descripcion {
  color: #34495e;
}

.abono-monto {
  text-align: right;
  font-weight: 600;
  color: #27ae60;
}

.abonos-total {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  margin-top: 20px;
  border-top: 2px solid #e0e0e0;
  font-size: 1.1em;
  font-weight: 600;
  color: #2c3e50;
}

.no-abonos {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

/* Estilos para Modal de Detalle de Deuda */
.deuda-info-completa {
  margin-bottom: 30px;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  margin-bottom: 25px;
  border: 1px solid #dee2e6;
}

.proveedor-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.color-indicator-modal {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  border: 3px solid white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.proveedor-info h3 {
  margin: 0;
  font-size: 1.4em;
  color: #2c3e50;
  font-weight: 700;
}

.fecha-deuda {
  margin: 5px 0 0 0;
  color: #7f8c8d;
  font-size: 0.95em;
}

.estado-deuda .estado-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.items-section {
  margin: 25px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  border-left: 4px solid #3498db;
}

.items-section h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.1em;
}

.items-list {
  display: grid;
  gap: 12px;
}

.item-detalle {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.item-descripcion {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  font-size: 1.05em;
}

.item-cantidad, .item-precio {
  color: #7f8c8d;
  font-size: 0.9em;
  margin-bottom: 4px;
}

.item-total {
  color: #27ae60;
  font-weight: 600;
  font-size: 1.1em;
  margin-top: 8px;
}

.resumen-financiero {
  background: linear-gradient(135deg, #fefefe, #f8f9fa);
  padding: 25px;
  border-radius: 12px;
  border: 2px solid #e9ecef;
  margin: 25px 0;
}

.resumen-financiero .resumen-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e9ecef;
  font-size: 1.1em;
}

.resumen-financiero .resumen-item:last-child {
  border-bottom: none;
  font-size: 1.2em;
  font-weight: 700;
  padding-top: 15px;
  margin-top: 10px;
  border-top: 2px solid #dee2e6;
}

.resumen-financiero .label {
  color: #495057;
  font-weight: 600;
}

.resumen-financiero .value {
  font-weight: 700;
}

.resumen-financiero .value.total {
  color: #495057;
}

.resumen-financiero .value.abonado {
  color: #28a745;
}

.resumen-financiero .value.pendiente {
  color: #ffc107;
}

.historial-section {
  margin-top: 30px;
  padding-top: 25px;
  border-top: 3px solid #e9ecef;
}

.historial-section h4 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1.2em;
  display: flex;
  align-items: center;
  gap: 10px;
}

.historial-section h4:before {
  content: "📜";
  font-size: 1.3em;
}

/* Modal Historial Completo */
.modal-historial-completo {
  max-width: 800px;
}

.filtros-historial {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 20px;
}

.abonos-list-completo {
  margin-top: 20px;
}

.abono-item-completo {
  display: grid;
  grid-template-columns: 150px 1fr 120px 50px;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 10px;
  align-items: center;
  transition: all 0.3s ease;
}

.abono-item-completo:hover {
  background: #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.abono-acciones-completo {
  justify-self: center;
}

.abono-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.abono-descripcion {
  color: #34495e;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge-general, .badge-deuda {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 600;
}

.badge-general {
  background: #e74c3c;
  color: white;
}

.badge-deuda {
  background: #3498db;
  color: white;
}

.abono-proveedor {
  color: #7f8c8d;
  font-size: 0.9em;
}

.abonos-total-completo {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  margin-top: 20px;
  border-top: 2px solid #e0e0e0;
  font-size: 1.1em;
  font-weight: 600;
  color: #2c3e50;
}

/* Responsive */
@media (max-width: 768px) {
  .header-section {
    padding: 25px;
  }
  
  .main-title {
    font-size: 2em;
  }
  
  .resumen-cards {
    grid-template-columns: 1fr;
  }
  
  .filtros-container {
    grid-template-columns: 1fr;
  }
  
  .deuda-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .deuda-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .deuda-actions button {
    width: 100%;
    justify-content: center;
  }
  
  .abono-item {
    grid-template-columns: 1fr;
    gap: 5px;
  }
  
  .abono-monto {
    text-align: left;
  }
}

/* Estilos específicos para Modal Abono General */
.resumen-deudas {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 25px;
}

.resumen-deudas h3 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 1.1em;
}

.resumen-cards-mini {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.resumen-card-mini {
  background: white;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.resumen-card-mini .label {
  color: #6c757d;
  font-size: 0.9em;
}

.resumen-card-mini .valor {
  font-weight: bold;
  color: #2c3e50;
}

.form-help {
  display: block;
  margin-top: 5px;
  color: #6c757d;
  font-size: 0.85em;
}

.distribucion-preview {
  background: #e8f4fd;
  border-radius: 10px;
  padding: 20px;
  margin-top: 20px;
  border: 2px solid #bee5eb;
}

.distribucion-preview h4 {
  margin: 0 0 15px 0;
  color: #0c5460;
  font-size: 1.1em;
}

.deudas-distribucion {
  margin-bottom: 15px;
}

.deuda-distribucion-item {
  background: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  border-left: 4px solid #17a2b8;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.deuda-info-dist {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9em;
  color: #6c757d;
}

.deuda-info-dist .fecha {
  font-weight: bold;
  color: #495057;
}

.deuda-info-dist .proveedor {
  color: #17a2b8;
  font-weight: 500;
}

.deuda-info-dist .saldo-actual {
  background: #f8f9fa;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
}

.abono-aplicado {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.monto-abono {
  background: #28a745;
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.9em;
}

.saldo-restante {
  font-size: 0.85em;
  color: #dc3545;
  font-weight: 500;
}

.saldo-restante.pagado {
  color: #28a745;
  font-weight: bold;
}

.mas-deudas {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-top: 10px;
}

.resumen-distribucion {
  background: white;
  border-radius: 8px;
  padding: 15px;
  border: 2px solid #28a745;
}

.total-distribuido {
  font-weight: bold;
  color: #28a745;
  margin-bottom: 8px;
}

.monto-sobrante {
  color: #fd7e14;
  font-weight: 500;
  font-size: 0.9em;
}

/* Responsive para modal abono general */
@media (max-width: 768px) {
  .modal-abono-general {
    max-width: 95%;
    margin: 10px;
  }
  
  .resumen-cards-mini {
    grid-template-columns: 1fr;
  }
  
  .deuda-info-dist {
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
  }
  
  .abono-aplicado {
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
  }
}

/* Botones de eliminar abono */
.btn-eliminar-abono {
  background: #dc3545;
  border: none;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
}

.btn-eliminar-abono:hover {
  background: #c82333;
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.4);
}

.btn-eliminar-abono:active {
  transform: scale(0.95);
}

.btn-eliminar-abono:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25);
}

/* Estilos para agrupación por proveedor */
.paginacion-info {
  text-align: center;
  margin-bottom: 20px;
  color: white;
  font-size: 1.1rem;
  opacity: 0.9;
}

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

.tabla-deudas-proveedor .acciones {
  text-align: center;
}

.tabla-deudas-proveedor .acciones button {
  margin: 0 5px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.tabla-deudas-proveedor .btn-detalle {
  background: #28a745;
  color: white;
}

.tabla-deudas-proveedor .btn-detalle:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-2px);
}

.tabla-deudas-proveedor .btn-detalle:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.tabla-deudas-proveedor .btn-abono {
  background: #007bff;
  color: white;
}

.tabla-deudas-proveedor .btn-abono:hover {
  background: #0056b3;
  transform: translateY(-2px);
}

.tabla-deudas-proveedor .btn-eliminar {
  background: #dc3545;
  color: white;
}

.tabla-deudas-proveedor .btn-eliminar:hover {
  background: #c82333;
  transform: translateY(-2px);
}

/* Responsive para agrupación por proveedor */
@media (max-width: 768px) {
  .proveedor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .proveedor-resumen {
    gap: 15px;
    width: 100%;
    justify-content: space-between;
  }
  
  .proveedor-resumen .resumen-item {
    min-width: auto;
    flex: 1;
  }
  
  .proveedor-nombre {
    font-size: 1.8rem;
  }
  
  .tabla-deudas-proveedor th,
  .tabla-deudas-proveedor td {
    padding: 10px 8px;
    font-size: 0.9rem;
  }
  
  .tabla-deudas-proveedor .acciones button {
    padding: 6px 8px;
    margin: 2px;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .proveedor-grupo {
    margin-bottom: 25px;
  }
  
  .proveedor-header {
    padding: 20px 15px;
  }
  
  .proveedor-resumen {
    flex-direction: column;
    gap: 10px;
  }
  
  .proveedor-resumen .resumen-item {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .tabla-deudas-proveedor .acciones {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .tabla-deudas-proveedor .acciones button {
    width: 100%;
    margin: 0;
  }
}
</style> 