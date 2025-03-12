<!-- NuevoEmbarque.vue -->
<template>
  <div class="app-container">
    <div class="nuevo-embarque-container">
      <div class="sidebar-clientes" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <div class="sidebar-header">
          <h3>Clientes</h3>
          <button @click="toggleSidebar" class="toggle-sidebar-btn">
            <i class="fas" :class="sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
          </button>
        </div>
        <div class="sidebar-clientes-contenido">
          <!-- Mostrar clientes predefinidos -->
          <button 
            v-for="cliente in clientesPredefinidos" 
            :key="cliente.id"
            type="button" 
            @click="seleccionarCliente(cliente.id.toString())" 
            class="btn-nota-cliente"
            :class="{ 'activo': clienteActivo === cliente.id.toString() }"
            :style="{ backgroundColor: cliente.color, color: cliente.textColor }"
            :title="sidebarCollapsed ? cliente.nombre : ''"
          >
            <span>{{ cliente.nombre }}</span>
          </button>
          
          <!-- Mostrar clientes personalizados específicos de este embarque -->
          <button 
            v-for="cliente in clientesPersonalizadosEmbarque" 
            :key="cliente.id"
            type="button" 
            @click="seleccionarCliente(cliente.id.toString())" 
            class="btn-nota-cliente cliente-personalizado"
            :class="{ 'activo': clienteActivo === cliente.id.toString() }"
            :style="{ backgroundColor: obtenerColorCliente(cliente.nombre), color: obtenerColorTextoCliente(cliente.nombre) }"
            :title="sidebarCollapsed ? cliente.nombre : ''"
          >
            <span>{{ cliente.nombre }}</span>
          </button>
          
          <!-- Botón para agregar nuevo cliente -->
          <button 
            type="button" 
            @click="mostrarModalNuevoCliente = true" 
            class="btn-agregar-cliente"
            :title="sidebarCollapsed ? 'Agregar Cliente' : ''"
          >
            <i class="fas fa-plus"></i>
            <span v-if="!sidebarCollapsed">Agregar Cliente</span>
          </button>
        </div>
        
        <!-- Resumen en la barra lateral -->
        <div class="sidebar-resumen">
          <h4>Resumen Taras</h4>
          <div class="sidebar-item">
            <span>Limpio:</span>
            <strong>{{ calcularTarasLimpio() }}</strong>
          </div>
          <div class="sidebar-item">
            <span>Crudo:</span>
            <strong>{{ calcularTarasCrudo() }}</strong>
          </div>
          <div class="sidebar-item total">
            <span>Total:</span>
            <strong>{{ calcularTotalTaras() }}-T</strong>
          </div>
          
          <h4>Resumen Kilos</h4>
          <div class="sidebar-item">
            <span>Limpio:</span>
            <strong>{{ Math.floor(calcularKilosLimpio()) }}</strong>
          </div>
          <div class="sidebar-item">
            <span>Crudo:</span>
            <strong>{{ calcularKilosCrudo() }}</strong>
          </div>
          <div class="sidebar-item total">
            <span>Total:</span>
            <strong>{{ Math.floor(calcularTotalKilos()) }}</strong>
          </div>
        </div>
      </div>

      <div class="nuevo-embarque">
        <h1>{{ modoEdicion ? 'Embarque' : 'Nuevo Embarque' }}</h1>
        <div class="botones">
          <button @click="volverAEmbarquesMenu" class="btn-volver">
            <i class="fas fa-arrow-left"></i> Volver a Menu
          </button>
          <button 
            @click="toggleBloqueo" 
            :class="['btn-bloqueo', { 'bloqueado': embarqueBloqueado }]"
          >
            <i :class="['fas', embarqueBloqueado ? 'fa-lock' : 'fa-lock-open']"></i>
            {{ embarqueBloqueado ? 'Desbloquear' : 'Bloquear' }} Embarque
          </button>
        </div>

        <div class="header">
          <div class="header-row">
            <div class="fecha-selector">
              <label for="fecha">Fecha de Embarque:</label>
              <input type="date" id="fecha" v-model="embarque.fecha" class="form-control" required :disabled="embarqueBloqueado">
            </div>
            <div class="carga-selector">
              <label for="cargaCon">Carga con:</label>
              <select id="cargaCon" v-model="embarque.cargaCon" class="form-control" required :disabled="embarqueBloqueado">
                <option value="">Seleccionar</option>
                <option value="Porro">Porro</option>
                <option value="Caminante">Caminante</option>
              </select>
            </div>
          </div>
        </div>

        <div class="botones-accion">
          <button @click="generarResumenTarasPDF" class="btn btn-info" :disabled="isGeneratingPdf">
            <span v-if="isGeneratingPdf && pdfType === 'taras'" class="loader-inline"></span>
            <i v-else class="fas fa-file-pdf"></i> PDF Taras
          </button>
          <button @click="generarResumenEmbarque2" class="btn btn-info" :disabled="isGeneratingPdf">
            <span v-if="isGeneratingPdf && pdfType === 'resumen'" class="loader-inline"></span>
            <i v-else class="fas fa-file-pdf"></i> Resumen Embarque
          </button>
          <router-link 
            v-if="embarqueId" 
            :to="{ name: 'Rendimientos', params: { id: embarqueId } }" 
            class="btn btn-warning" 
            :class="{ 'disabled': isGeneratingPdf }"
          >
            <i class="fas fa-chart-line"></i> Rendimientos
          </router-link>
          <button 
            v-else
            class="btn btn-warning disabled"
            title="Guarde el embarque primero para ver rendimientos"
          >
            <i class="fas fa-chart-line"></i> Rendimientos
          </button>
        </div>

        <div class="botones-undo-redo">
          <button type="button" @click="undo" :disabled="undoStack.length <= 1" class="btn btn-secondary btn-sm">Deshacer</button>
          <button type="button" @click="redo" :disabled="redoStack.length === 0" class="btn btn-secondary btn-sm">Rehacer</button>
        </div>

        <!-- Contenido principal del embarque -->
        <form @submit.prevent="guardarEmbarque" @keydown.enter.prevent>
          <div v-for="(clienteProductos, clienteId) in productosPorCliente" 
               :key="clienteId" 
               class="cliente-grupo"
               v-show="clienteActivo === clienteId || clienteActivo === null">
            <div class="cliente-header sticky-header">
              <div class="cliente-info">
                <h3>
                  {{ obtenerNombreCliente(clienteId) }}
                  <button type="button" @click.stop="generarNotaVenta(clienteId)" class="btn-pdf-mini" title="Vista previa PDF">
                    <i class="fas fa-eye"></i>
                  </button>
                </h3>
                <div class="cliente-totales">
                  <span>Limpio: {{ calcularTotalLimpioCliente(clienteId) }}T / {{ formatearKilos(calcularKilosLimpioCliente(clienteId)) }}Kg</span>
                  <span>Crudo: {{ calcularTotalCrudoCliente(clienteId) }}T / {{ formatearKilos(calcularKilosCrudoCliente(clienteId)) }}Kg</span>
                </div>
              </div>
              <div class="cliente-header-controls">
                <div class="juntar-medidas-checkbox">
                  <input 
                    type="checkbox" 
                    :id="'juntar-medidas-' + clienteId"
                    v-model="clientesJuntarMedidas[clienteId]"
                    @change="handleJuntarMedidasChange(clienteId, $event.target.checked)"
                    @click.stop
                    :disabled="embarqueBloqueado"
                  >
                  <label :for="'juntar-medidas-' + clienteId" @click.stop>Juntar medidas</label>
                </div>
                <button 
                  type="button" 
                  @click.stop="generarNotaVenta(clienteId)" 
                  class="btn btn-primary btn-sm generar-pdf-cliente" 
                  title="Generar Nota de Venta PDF"
                  :disabled="isGeneratingPdf"
                >
                  <span v-if="isGeneratingPdf && pdfType === 'cliente-' + clienteId" class="loader-inline"></span>
                  <i v-else class="fas fa-file-pdf"></i> Generar Nota PDF
                </button>
                <button 
                  v-if="esClienteJoselito(clienteId)"
                  type="button" 
                  @click.stop="crearCuentaJoselito(obtenerEmbarqueCliente(clienteId), productosPorCliente[clienteId], clienteCrudos[clienteId] || [])" 
                  class="btn btn-success btn-sm crear-cuenta-joselito" 
                  title="Crear Cuenta para Joselito"
                  :disabled="isCreatingAccount"
                >
                  <span v-if="isCreatingAccount" class="loader-inline"></span>
                  <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
                </button>
                <button 
                  v-if="esClienteCatarro(clienteId)"
                  type="button" 
                  @click.stop="crearCuentaCatarro(obtenerEmbarqueCliente(clienteId), productosPorCliente[clienteId], clienteCrudos[clienteId] || [])" 
                  class="btn btn-success btn-sm crear-cuenta-catarro" 
                  title="Crear Cuenta para Catarro"
                  :disabled="isCreatingAccount"
                >
                  <span v-if="isCreatingAccount" class="loader-inline"></span>
                  <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
                </button>
                <button type="button" @click.stop="eliminarCliente(clienteId)" class="btn btn-danger btn-sm eliminar-cliente" :disabled="embarqueBloqueado">
                  Eliminar Cliente
                </button>
              </div>
            </div>

            <!-- Lista de productos del cliente -->
            <div class="productos-container">
              <div v-for="(producto, index) in clienteProductos" 
                   :key="index" 
                   class="producto"
                   :class="{
                     'reporte-completo': coincideTarasYBolsas(producto),
                     'reporte-incompleto': !coincideTarasYBolsas(producto) && tieneAlgunReporte(producto)
                   }">
                <div class="producto-header">
                  <div class="medida-container">
                    <span 
                      class="medida-texto"
                      :class="{ 
                        'disabled': embarqueBloqueado,
                        'tiene-nombre-alternativo': producto.textoAlternativo
                      }"
                      @click="!embarqueBloqueado && abrirModalAlt(producto)"
                    >
                      {{ producto.textoAlternativo || producto.medida }}
                    </span>
                  </div>
                  <div class="producto-controles">
                    <button 
                      @click="abrirModalPrecio(producto)" 
                      class="btn-control precio"
                      :class="{ 'tiene-valor': producto.precio }"
                      :disabled="embarqueBloqueado"
                    >
                      $
                    </button>
                    <button 
                      @click="abrirModalHilos(producto)" 
                      class="btn-control hilos"
                      :class="{ 'tiene-valor': producto.hilos }"
                      :disabled="embarqueBloqueado"
                    >
                      H
                    </button>
                    <button 
                      @click="abrirModalNota(producto)" 
                      class="btn-control nota"
                      :class="{ 'tiene-valor': producto.nota }"
                      :disabled="embarqueBloqueado"
                    >
                      N
                    </button>
                    <div class="kg-toggle">
                      <input 
                        type="checkbox"
                        v-model="producto.noSumarKilos"
                        :id="'kg-' + producto.id"
                        :disabled="embarqueBloqueado"
                      >
                      <label :for="'kg-' + producto.id">kg</label>
                    </div>
                  </div>
                </div>

                <div class="producto-contenido">
                  <div class="reporte-taras">
                    <div v-for="(tara, taraIndex) in producto.reporteTaras" 
                         :key="'tara-' + taraIndex"
                         class="reporte-fila">
                      <input 
                        type="number"
                        v-model="producto.reporteTaras[taraIndex]"
                        class="input-reporte"
                        :disabled="embarqueBloqueado"
                        @input="actualizarProducto(producto)"
                      >
                      <span class="multiplicador">×</span>
                      <input 
                        type="number"
                        v-model="producto.reporteBolsas[taraIndex]"
                        class="input-reporte"
                        :disabled="embarqueBloqueado"
                        @input="actualizarProducto(producto)"
                      >
                    </div>
                  </div>
                  
                  <div class="totales-producto">
                    <span>Total: {{ totalTaras(producto) }}T</span>
                    <span>Kilos: {{ formatearKilos(totalKilos(producto)) }}Kg</span>
                  </div>
                </div>
              </div>

              <!-- Sección de crudos -->
              <div class="crudos-container">
                <h4>Crudos</h4>
                <div v-for="(crudo, crudoIndex) in clienteCrudos[clienteId] || []" 
                     :key="crudo.id"
                     class="crudo-grupo">
                  <div class="crudo-header">
                    <h5>Crudo #{{ crudoIndex + 1 }}</h5>
                    <button 
                      type="button"
                      @click="eliminarCrudo(clienteId, crudoIndex)"
                      class="btn btn-danger btn-sm"
                      :disabled="embarqueBloqueado"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>

                  <div class="crudo-items">
                    <div v-for="(item, itemIndex) in crudo.items" 
                         :key="itemIndex"
                         class="crudo-item">
                      <div class="item-campos">
                        <div class="campo">
                          <label>Talla:</label>
                          <select 
                            v-model="item.talla"
                            class="form-control"
                            :disabled="embarqueBloqueado"
                            @change="guardarCambiosEnTiempoReal"
                          >
                            <option value="">Seleccionar</option>
                            <option v-for="medida in medidasPredefinidas"
                                  :key="medida"
                                  :value="medida">
                              {{ medida }}
                            </option>
                          </select>
                        </div>
                        <div class="campo">
                          <label>Taras:</label>
                          <input 
                            type="number"
                            v-model="item.taras"
                            class="form-control"
                            :disabled="embarqueBloqueado"
                            @input="guardarCambiosEnTiempoReal"
                          >
                        </div>
                        <div class="campo">
                          <label>Sobrante:</label>
                          <input 
                            type="number"
                            v-model="item.sobrante"
                            class="form-control"
                            :disabled="embarqueBloqueado"
                            @input="guardarCambiosEnTiempoReal"
                          >
                        </div>
                        <div class="campo">
                          <label>Barco:</label>
                          <input 
                            type="text"
                            v-model="item.barco"
                            class="form-control"
                            :disabled="embarqueBloqueado"
                            @input="guardarCambiosEnTiempoReal"
                          >
                        </div>
                      </div>
                      <button 
                        type="button"
                        @click="eliminarItemCrudo(clienteId, crudoIndex, itemIndex)"
                        class="btn btn-danger btn-sm eliminar-item"
                        :disabled="embarqueBloqueado"
                      >
                        <i class="fas fa-times"></i>
                      </button>
                    </div>

                    <button 
                      type="button"
                      @click="agregarItemCrudo(clienteId, crudoIndex)"
                      class="btn btn-info btn-sm btn-agregar-item"
                      :disabled="embarqueBloqueado"
                    >
                      <i class="fas fa-plus"></i> Agregar Item
                    </button>
                  </div>
                </div>

                <button 
                  type="button"
                  @click="agregarCrudo(clienteId)"
                  class="btn btn-primary btn-agregar-crudo"
                  :disabled="embarqueBloqueado"
                >
                  <i class="fas fa-plus"></i> Agregar Crudo
                </button>
              </div>

              <!-- Botón para agregar producto -->
              <button 
                type="button"
                @click="agregarProducto(clienteId)"
                class="btn-agregar-producto"
                :disabled="embarqueBloqueado"
              >
                <i class="fas fa-plus"></i>
                Agregar Producto
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal para agregar nuevo cliente -->
    <div class="modal-overlay" v-if="mostrarModalNuevoCliente" @click.self="cerrarModalNuevoCliente">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Agregar Nuevo Cliente</h3>
          <button @click="cerrarModalNuevoCliente" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="nombreCliente">Nombre del Cliente:</label>
            <input 
              type="text" 
              id="nombreCliente" 
              v-model="nuevoClienteNombre" 
              class="form-control" 
              placeholder="Ingrese el nombre del cliente"
              @keyup.enter="agregarNuevoCliente"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalNuevoCliente" class="btn btn-secondary">Cancelar</button>
          <button @click="agregarNuevoCliente" class="btn btn-primary">Agregar</button>
        </div>
      </div>
    </div>

    <!-- Modal para nombre alternativo -->
    <div v-if="mostrarModalAlt" class="modal-overlay" @click="cerrarModalAlt">
      <div class="modal-contenido" @click.stop>
        <div class="modal-header">
          <h3>Nombre Alternativo</h3>
          <button @click="cerrarModalAlt" class="btn-cerrar-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nombre para PDF:</label>
            <input 
              type="text"
              v-model="altTemp"
              class="form-control"
              ref="altInput"
              @keyup.enter="guardarAlt"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalAlt" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarAlt" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para medida -->
    <div v-if="mostrarModalMedida" class="modal-overlay" @click="cerrarModalMedida">
      <div class="modal-contenido" @click.stop>
        <div class="modal-header">
          <h3>Medida del Producto</h3>
          <button @click="cerrarModalMedida" class="btn-cerrar-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Medida:</label>
            <div class="medidas-predefinidas">
              <button 
                v-for="medida in medidasPredefinidas"
                :key="medida"
                type="button"
                class="btn-medida"
                :class="{ 'activo': medidaTemp === medida }"
                @click="medidaTemp = medida"
              >
                {{ medida }}
              </button>
            </div>
            <input 
              type="text"
              v-model="medidaTemp"
              class="form-control"
              placeholder="O ingrese una medida personalizada"
              @keyup.enter="guardarMedida"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalMedida" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarMedida" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para precio -->
    <div v-if="mostrarModalPrecio" class="modal-overlay" @click="cerrarModalPrecio">
      <div class="modal-contenido" @click.stop>
        <div class="modal-header">
          <h3>Precio del Producto</h3>
          <button @click="cerrarModalPrecio" class="btn-cerrar-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Precio:</label>
            <input 
              type="number"
              v-model="precioTemp"
              class="form-control"
              step="0.01"
              min="0"
              @keyup.enter="guardarPrecio"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalPrecio" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarPrecio" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para hilos -->
    <div v-if="mostrarModalHilos" class="modal-overlay" @click="cerrarModalHilos">
      <div class="modal-contenido" @click.stop>
        <div class="modal-header">
          <h3>Hilos del Producto</h3>
          <button @click="cerrarModalHilos" class="btn-cerrar-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Hilos:</label>
            <input 
              type="text"
              v-model="hilosTemp"
              class="form-control"
              @keyup.enter="guardarHilos"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalHilos" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarHilos" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para nota -->
    <div v-if="mostrarModalNota" class="modal-overlay" @click="cerrarModalNota">
      <div class="modal-contenido" @click.stop>
        <div class="modal-header">
          <h3>Nota del Producto</h3>
          <button @click="cerrarModalNota" class="btn-cerrar-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nota:</label>
            <textarea 
              v-model="notaTemp"
              class="form-control"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalNota" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarNota" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onValue, onDisconnect, set, push, get } from 'firebase/database';
import { rtdb } from '@/firebase';
import { useAuthStore } from '@/stores/auth';
import { generarResumenEmbarquePDF } from '@/utils/resumenEmbarque2';
import { generarNotaVentaPDF } from '@/utils/pdfGenerator';
import Vue from 'vue'; // Importar Vue para usar Vue.set y Vue.delete

export default {
  name: 'NuevoEmbarque',
  data() {
    return {
      // Datos del embarque
      embarque: {
        fecha: new Date().toISOString().split('T')[0],
        cargaCon: '',
        productosPorCliente: {},
        clienteCrudos: {},
        clientesJuntarMedidas: {},
        bloqueado: false,
        ultimaModificacion: null
      },
      
      // Estado de la aplicación
      embarqueId: null,
      modoEdicion: false,
      clienteActivo: null,
      clientesPredefinidos: [],
      clientesDisponibles: [],
      clientesPersonalizadosEmbarque: [],
      usuariosActivos: [],
      actualizacionAutomatica: false,
      
      // Estado para deshacer/rehacer
      historialEstados: [],
      posicionHistorial: -1,
      
      // Estado para el modal de nuevo cliente
      mostrarModalNuevoCliente: false,
      nuevoClienteNombre: '',
      nuevoClienteColor: '#3498db',
      
      // Referencia al store de autenticación
      authStore: null,
      
      sidebarCollapsed: false,
      isGeneratingPdf: false,
      pdfType: '',
      isCreatingAccount: false,
      undoStack: [],
      redoStack: [],
      altTemp: '',
      mostrarModalAlt: false,
      itemSeleccionado: null,
      medidasUsadas: [],
      mostrarModalMedida: false,
      mostrarModalPrecio: false,
      mostrarModalHilos: false,
      mostrarModalNota: false,
      medidaTemp: '',
      precioTemp: '',
      hilosTemp: '',
      notaTemp: '',
      unsubscribeEmbarque: null,
      unsubscribeUsuarios: null,
      productoSeleccionado: null,
      medidasPredefinidas: [
        '16/20', '21/25', '26/30', '31/35', '36/40', '41/50', '51/60', '61/70',
        '71/90', '91/110', '110/130', '130/150', '150/200', '200/300', '300/500'
      ],
      // Propiedades faltantes que se usan en el template
      embarqueBloqueado: false,
      productosPorCliente: {},
      clienteCrudos: {}
    }
  },

  computed: {
    totalKilosEmbarque() {
      return Object.values(this.productosPorCliente).reduce((total, productos) => {
        return total + productos.reduce((subtotal, producto) => {
          return subtotal + this.totalKilos(producto);
        }, 0);
      }, 0);
    }
  },

  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },

    seleccionarCliente(id) {
      this.clienteActivo = id;
    },

    obtenerColorCliente(nombre) {
      const colores = {
        'Cliente1': '#FF5733',
        'Cliente2': '#33FF57',
        'Cliente3': '#3357FF'
      };
      return colores[nombre] || '#7F8C8D';
    },

    obtenerColorTextoCliente(nombre) {
      const color = this.obtenerColorCliente(nombre);
      const rgb = parseInt(color.substring(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#000000' : '#FFFFFF';
    },

    calcularTarasLimpio() {
      if (!this.embarque || !this.embarque.productosPorCliente) {
        console.warn('productosPorCliente no está definido en calcularTarasLimpio');
        return 0;
      }
      
      return Object.values(this.embarque.productosPorCliente).reduce((total, productos) => {
        return total + productos.reduce((subtotal, producto) => {
          return subtotal + this.totalTaras(producto);
        }, 0);
      }, 0);
    },

    calcularTarasCrudo() {
      if (!this.embarque || !this.embarque.clienteCrudos) {
        console.warn('clienteCrudos no está definido en calcularTarasCrudo');
        return 0;
      }
      
      return Object.values(this.embarque.clienteCrudos).reduce((total, crudos) => {
        return total + crudos.reduce((subtotal, crudo) => {
          return subtotal + crudo.items.reduce((itemTotal, item) => {
            return itemTotal + this.calcularTarasCrudos(item);
          }, 0);
        }, 0);
      }, 0);
    },

    calcularTotalTaras() {
      return this.calcularTarasLimpio() + this.calcularTarasCrudo();
    },

    calcularKilosLimpio() {
      if (!this.embarque || !this.embarque.productosPorCliente) {
        console.warn('productosPorCliente no está definido en calcularKilosLimpio');
        return 0;
      }
      
      return Object.values(this.embarque.productosPorCliente).reduce((total, productos) => {
        return total + productos.reduce((subtotal, producto) => {
          if (producto.noSumarKilos) return subtotal;
          return subtotal + this.totalKilos(producto);
        }, 0);
      }, 0);
    },

    calcularKilosCrudo() {
      if (!this.embarque || !this.embarque.clienteCrudos) {
        console.warn('clienteCrudos no está definido en calcularKilosCrudo');
        return 0;
      }
      
      return Object.values(this.embarque.clienteCrudos).reduce((total, crudos) => {
        return total + crudos.reduce((subtotal, crudo) => {
          return subtotal + crudo.items.reduce((itemTotal, item) => {
            return itemTotal + this.calcularKilosCrudos(item);
          }, 0);
        }, 0);
      }, 0);
    },

    calcularTotalKilos() {
      return this.calcularKilosLimpio() + this.calcularKilosCrudo();
    },

    totalTaras(producto) {
      if (!producto.reporteTaras || !producto.reporteBolsas) return 0;
      return producto.reporteTaras.reduce((total, tara, index) => {
        const bolsas = producto.reporteBolsas[index] || 0;
        return total + (parseInt(tara) || 0) * (parseInt(bolsas) || 0);
      }, 0);
    },

    totalKilos(producto) {
      const taras = this.totalTaras(producto);
      if (producto.tipo === 'c/h20') {
        return taras * (producto.camaronNeto || 0.65);
      }
      return taras * 25;
    },

    coincideTarasYBolsas(producto) {
      if (!producto.reporteTaras || !producto.reporteBolsas) return false;
      const totalTarasRegistradas = producto.reporteTaras.filter(t => t).length;
      const totalTarasReportadas = producto.reporteBolsas.filter(b => b).length;
      return totalTarasRegistradas === totalTarasReportadas;
    },

    tieneAlgunReporte(producto) {
      return (producto.reporteTaras || []).some(tara => tara) || 
             (producto.reporteBolsas || []).some(bolsa => bolsa);
    },

    calcularTotalLimpioCliente(clienteId) {
      if (!this.embarque || !this.embarque.productosPorCliente) {
        return 0;
      }
      const productos = this.embarque.productosPorCliente[clienteId] || [];
      return productos.reduce((total, producto) => total + this.totalTaras(producto), 0);
    },

    calcularKilosLimpioCliente(clienteId) {
      if (!this.embarque || !this.embarque.productosPorCliente) {
        return 0;
      }
      const productos = this.embarque.productosPorCliente[clienteId] || [];
      return productos.reduce((total, producto) => {
        if (producto.noSumarKilos) return total;
        return total + this.totalKilos(producto);
      }, 0);
    },

    calcularTotalCrudoCliente(clienteId) {
      if (!this.embarque || !this.embarque.clienteCrudos) {
        return 0;
      }
      const crudos = this.embarque.clienteCrudos[clienteId] || [];
      return crudos.reduce((total, crudo) => {
        return total + crudo.items.reduce((itemTotal, item) => {
          return itemTotal + this.calcularTarasCrudos(item);
        }, 0);
      }, 0);
    },

    calcularTarasCrudos(item) {
      const taras = parseInt(item.taras) || 0;
      const sobrante = parseInt(item.sobrante) || 0;
      return taras + sobrante;
    },

    calcularKilosCrudos(item) {
      return this.calcularTarasCrudos(item) * 25;
    },

    formatearKilos(kilos) {
      return kilos.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      });
    },

    volverAEmbarquesMenu() {
      this.$router.push({ name: 'EmbarquesMenu' });
    },

    toggleBloqueo() {
      const accion = this.embarqueBloqueado ? 'desbloquear' : 'bloquear';
      const mensaje = `¿Estás seguro de que quieres ${accion} este embarque?`;
      
      if (confirm(mensaje)) {
        this.embarqueBloqueado = !this.embarqueBloqueado;
        this.embarque.bloqueado = this.embarqueBloqueado; // Sincronizar con la propiedad del embarque
        this.guardarCambiosEnTiempoReal();
        
        // Mostrar mensaje de éxito
        const mensajeExito = this.embarqueBloqueado ? 
          'Embarque bloqueado correctamente. No se podrá eliminar hasta que se desbloquee.' : 
          'Embarque desbloqueado correctamente.';
        
        if (this.$toast) {
          this.$toast.success(mensajeExito);
        } else {
          alert(mensajeExito);
        }
      }
    },

    async generarResumenTarasPDF() {
      this.isGeneratingPdf = true;
      this.pdfType = 'taras';
      try {
        if (typeof generarResumenEmbarquePDF !== 'function') {
          throw new Error('generarResumenEmbarquePDF no es una función');
        }
        
        if (!this.embarque.productosPorCliente) {
          console.warn('No hay datos de productos para generar el resumen de taras');
          this.embarque.productosPorCliente = {};
        }
        
        await generarResumenEmbarquePDF(this.embarque, this.embarque.productosPorCliente);
      } catch (error) {
        console.error('Error al generar PDF:', error);
        if (this.$toast) {
          this.$toast.error(`Error al generar PDF: ${error.message || 'Error desconocido'}`);
        } else {
          alert(`Error al generar PDF: ${error.message || 'Error desconocido'}`);
        }
      } finally {
        this.isGeneratingPdf = false;
        this.pdfType = '';
      }
    },

    async generarResumenEmbarque2() {
      this.isGeneratingPdf = true;
      this.pdfType = 'resumen';
      try {
        if (typeof generarResumenEmbarquePDF !== 'function') {
          throw new Error('generarResumenEmbarquePDF no es una función');
        }
        
        if (!this.embarque.clienteCrudos) {
          console.warn('No hay datos de crudos para generar el resumen');
          this.embarque.clienteCrudos = {};
        }
        
        const medidasCrudos = new Set();
        Object.values(this.embarque.clienteCrudos).forEach(crudos => {
          crudos.forEach(crudo => {
            crudo.items.forEach(item => {
              if (item.talla) medidasCrudos.add(item.talla);
            });
          });
        });

        const embarqueData = {
          ...this.embarque,
          crudos: Object.entries(this.embarque.clienteCrudos).flatMap(([clienteId, crudos]) => 
            crudos.flatMap(crudo => 
              crudo.items.map(item => ({
                clienteId,
                medida: item.talla,
                taras: [item.taras, item.sobrante].filter(Boolean),
                barco: item.barco
              }))
            )
          ),
          medidasCrudos: Array.from(medidasCrudos)
        };

        await generarResumenEmbarquePDF(embarqueData);
      } catch (error) {
        console.error('Error al generar PDF:', error);
        if (this.$toast) {
          this.$toast.error(`Error al generar PDF: ${error.message || 'Error desconocido'}`);
        } else {
          alert(`Error al generar PDF: ${error.message || 'Error desconocido'}`);
        }
      } finally {
        this.isGeneratingPdf = false;
        this.pdfType = '';
      }
    },

    undo() {
      if (this.undoStack.length <= 1) return;
      const currentState = this.undoStack.pop();
      this.redoStack.push(currentState);
      const previousState = this.undoStack[this.undoStack.length - 1];
      this.restaurarEstado(previousState);
    },

    redo() {
      if (this.redoStack.length === 0) return;
      const nextState = this.redoStack.pop();
      this.undoStack.push(nextState);
      this.restaurarEstado(nextState);
    },

    restaurarEstado(estado) {
      // Asignar propiedades básicas del embarque
      for (const key in estado.embarque) {
        if (Object.prototype.hasOwnProperty.call(estado.embarque, key)) {
          Vue.set(this.embarque, key, estado.embarque[key]);
        }
      }
      
      // Asignar productosPorCliente
      if (estado.productosPorCliente) {
        Vue.set(this.embarque, 'productosPorCliente', JSON.parse(JSON.stringify(estado.productosPorCliente)));
      }
      
      // Asignar clienteCrudos
      if (estado.clienteCrudos) {
        Vue.set(this.embarque, 'clienteCrudos', JSON.parse(JSON.stringify(estado.clienteCrudos)));
      }
      
      // Asignar clientesJuntarMedidas
      if (estado.clientesJuntarMedidas) {
        Vue.set(this.embarque, 'clientesJuntarMedidas', JSON.parse(JSON.stringify(estado.clientesJuntarMedidas)));
      }
      
      this.guardarCambiosEnTiempoReal();
    },

    guardarEstadoActual() {
      // Verificar que el embarque tenga todas las propiedades necesarias
      this.verificarEstructuraEmbarque();
      
      const estado = {
        embarque: { ...this.embarque },
        productosPorCliente: JSON.parse(JSON.stringify(this.embarque.productosPorCliente || {})),
        clienteCrudos: JSON.parse(JSON.stringify(this.embarque.clienteCrudos || {})),
        clientesJuntarMedidas: JSON.parse(JSON.stringify(this.embarque.clientesJuntarMedidas || {}))
      };
      
      this.undoStack.push(estado);
      if (this.undoStack.length > 50) this.undoStack.shift();
      this.redoStack = [];
      
      // Para depuración
      console.log('Estado guardado:', {
        embarque: this.embarque,
        productosPorCliente: this.embarque.productosPorCliente,
        clienteCrudos: this.embarque.clienteCrudos,
        clientesJuntarMedidas: this.embarque.clientesJuntarMedidas
      });
    },

    async guardarEmbarque() {
      console.log('Iniciando guardarEmbarque');
      try {
        if (!this.clienteActivo) {
          console.error('No hay cliente activo seleccionado');
          this.$toast.error('Por favor selecciona un cliente antes de guardar');
          return;
        }

        // Guardar el estado actual para deshacer/rehacer
        this.guardarEstadoActual();
        
        // Si es un nuevo embarque, crear uno nuevo
        if (!this.embarqueId) {
          console.log('Creando nuevo embarque...');
          await this.guardarEmbarqueInicial();
          console.log('Nuevo embarque creado con ID:', this.embarqueId);
          
          // Actualizar la URL para reflejar el ID del embarque
          this.$router.replace({ name: 'NuevoEmbarque', params: { id: this.embarqueId } });
          this.modoEdicion = true;
          this.$toast.success('Embarque creado correctamente');
        } else {
          // Actualizar embarque existente
          console.log('Actualizando embarque existente:', this.embarqueId);
          await this.guardarCambiosEnTiempoReal();
          this.$toast.success('Embarque actualizado correctamente');
        }
        
        return true;
      } catch (error) {
        console.error('Error al guardar embarque:', error);
        this.$toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`);
        return false;
      }
    },

    async guardarCambiosEnTiempoReal() {
      if (!this.embarqueId) {
        console.warn('No hay ID de embarque, no se pueden guardar cambios');
        return;
      }
      
      try {
        console.log('Guardando cambios en tiempo real para embarque ID:', this.embarqueId);
        
        const embarqueRef = ref(rtdb, `embarques/${this.embarqueId}`);
        
        // Asegurarse de que la propiedad bloqueado esté sincronizada
        this.embarque.bloqueado = this.embarqueBloqueado;
        
        const datosAGuardar = {
          ...this.embarque,
          productosPorCliente: this.productosPorCliente,
          clienteCrudos: this.clienteCrudos,
          clientesJuntarMedidas: this.clientesJuntarMedidas,
          bloqueado: this.embarqueBloqueado,
          ultimaModificacion: new Date().toISOString()
        };
        
        console.log('Datos a guardar:', datosAGuardar);
        
        await set(embarqueRef, datosAGuardar);
        console.log('Cambios guardados exitosamente');
        
        // Mostrar mensaje de éxito si no es una actualización automática
        if (this.$toast && !this.actualizacionAutomatica) {
          this.$toast.success('Cambios guardados correctamente');
        }
      } catch (error) {
        console.error('Error al guardar cambios:', error);
        if (this.$toast) {
          this.$toast.error(`Error al guardar cambios: ${error.message || 'Error desconocido'}`);
        } else {
          alert(`Error al guardar cambios: ${error.message || 'Error desconocido'}`);
        }
      }
    },

    obtenerNombreCliente(clienteId) {
      const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId);
      if (clientePredefinido) return clientePredefinido.nombre;

      const clientePersonalizado = this.clientesPersonalizadosEmbarque.find(c => c.id.toString() === clienteId);
      return clientePersonalizado ? clientePersonalizado.nombre : 'Cliente Desconocido';
    },

    async generarNotaVenta(clienteId) {
      this.isGeneratingPdf = true;
      this.pdfType = `cliente-${clienteId}`;
      try {
        if (!this.embarque.productosPorCliente || !this.embarque.clienteCrudos) {
          console.error('No hay datos de productos o crudos para generar la nota de venta');
          return;
        }
        
        const productos = this.embarque.productosPorCliente[clienteId] || [];
        const crudos = this.embarque.clienteCrudos[clienteId] || [];
        
        // Crear un objeto de embarque con los datos necesarios para la nota de venta
        const embarqueCliente = {
          fecha: this.embarque.fecha,
          cargaCon: this.embarque.cargaCon,
          productos: productos,
          clienteCrudos: { [clienteId]: crudos },
          nombreCliente: this.obtenerNombreCliente(clienteId)
        };
        
        await generarNotaVentaPDF(embarqueCliente, this.clientesPredefinidos, this.embarque.clientesJuntarMedidas);
      } catch (error) {
        console.error('Error al generar nota de venta:', error);
        if (this.$toast) {
          this.$toast.error(`Error al generar nota de venta: ${error.message || 'Error desconocido'}`);
        } else {
          alert(`Error al generar nota de venta: ${error.message || 'Error desconocido'}`);
        }
      } finally {
        this.isGeneratingPdf = false;
        this.pdfType = '';
      }
    },

    handleJuntarMedidasChange(clienteId, checked) {
      if (!this.embarque.clientesJuntarMedidas) {
        Vue.set(this.embarque, 'clientesJuntarMedidas', {});
      }
      Vue.set(this.embarque.clientesJuntarMedidas, clienteId, checked);
      this.guardarCambiosEnTiempoReal();
    },

    async crearCuentaJoselito(embarqueCliente, productos, crudos) {
      this.isCreatingAccount = true;
      try {
        // Implementación específica para cuenta de Joselito
      } catch (error) {
        console.error('Error al crear cuenta Joselito:', error);
      } finally {
        this.isCreatingAccount = false;
      }
    },

    async crearCuentaCatarro(embarqueCliente, productos, crudos) {
      this.isCreatingAccount = true;
      try {
        // Implementación específica para cuenta de Catarro
      } catch (error) {
        console.error('Error al crear cuenta Catarro:', error);
      } finally {
        this.isCreatingAccount = false;
      }
    },

    eliminarCliente(clienteId) {
      if (!confirm('¿Está seguro de eliminar este cliente y todos sus productos?')) return;
      
      if (this.embarque.productosPorCliente) {
        Vue.delete(this.embarque.productosPorCliente, clienteId);
      }
      
      if (this.embarque.clienteCrudos) {
        Vue.delete(this.embarque.clienteCrudos, clienteId);
      }
      
      if (this.embarque.clientesJuntarMedidas) {
        Vue.delete(this.embarque.clientesJuntarMedidas, clienteId);
      }
      
      if (this.clienteActivo === clienteId) {
        this.clienteActivo = null;
      }
      
      this.guardarCambiosEnTiempoReal();
    },

    esClienteJoselito(clienteId) {
      const nombre = this.obtenerNombreCliente(clienteId).toLowerCase();
      return nombre.includes('joselito');
    },

    esClienteCatarro(clienteId) {
      const nombre = this.obtenerNombreCliente(clienteId).toLowerCase();
      return nombre.includes('catarro');
    },

    agregarProducto(clienteId) {
      console.log('Agregando producto para cliente ID:', clienteId);
      try {
        if (!clienteId) {
          console.error('No se puede agregar producto: clienteId es undefined');
          this.$toast.error('Error: No hay cliente seleccionado');
          return;
        }
        
        // Asegurar que existe la estructura para este cliente
        if (!this.embarque.productosPorCliente[clienteId]) {
          console.log('Inicializando estructura para cliente:', clienteId);
          Vue.set(this.embarque.productosPorCliente, clienteId, []);
        }
        
        // Crear un nuevo producto con ID único
        const nuevoProducto = {
          id: Date.now().toString(),
          nombre: '',
          cantidad: 0,
          precio: 0,
          total: 0,
          medidas: []
        };
        
        // Agregar el producto al cliente
        this.embarque.productosPorCliente[clienteId].push(nuevoProducto);
        console.log('Producto agregado exitosamente:', nuevoProducto);
        
        // Guardar estado para deshacer/rehacer
        this.guardarEstadoActual();
        
        return nuevoProducto;
      } catch (error) {
        console.error('Error al agregar producto:', error);
        this.$toast.error('Error al agregar producto');
        return null;
      }
    },

    actualizarProducto(producto) {
      this.guardarEstadoActual();
      this.guardarCambiosEnTiempoReal();
    },

    abrirModalAlt(producto) {
      this.itemSeleccionado = producto;
      this.altTemp = producto.textoAlternativo || '';
      this.mostrarModalAlt = true;
      this.$nextTick(() => {
        this.$refs.altInput?.focus();
      });
    },

    cerrarModalAlt() {
      this.mostrarModalAlt = false;
      this.itemSeleccionado = null;
      this.altTemp = '';
    },

    guardarAlt() {
      if (this.itemSeleccionado) {
        const alt = this.altTemp.trim();
        if (alt) {
          this.$set(this.itemSeleccionado, 'textoAlternativo', alt);
        } else {
          this.$delete(this.itemSeleccionado, 'textoAlternativo');
        }
        this.guardarCambiosEnTiempoReal();
      }
      this.cerrarModalAlt();
    },

    async cargarEmbarque() {
      console.log('Cargando embarque con ID:', this.embarqueId);
      try {
        if (!this.embarqueId) {
          console.error('No hay ID de embarque para cargar');
          return;
        }
        
        const embarqueRef = ref(rtdb, `embarques/${this.embarqueId}`);
        
        // Obtener datos del embarque
        const snapshot = await get(embarqueRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('Datos del embarque obtenidos:', data);
          
          // Actualizar el objeto embarque con los datos obtenidos
          for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              Vue.set(this.embarque, key, data[key]);
            }
          }
          
          // Verificar y corregir la estructura del embarque
          this.verificarEstructuraEmbarque();
          
          // Actualizar propiedades reactivas
          this.embarqueBloqueado = this.embarque.bloqueado || false;
          this.productosPorCliente = this.embarque.productosPorCliente || {};
          this.clienteCrudos = this.embarque.clienteCrudos || {};
          
          // Cargar clientes personalizados del embarque
          if (data.clientesPersonalizados) {
            this.clientesPersonalizadosEmbarque = data.clientesPersonalizados;
            console.log('Clientes personalizados cargados:', this.clientesPersonalizadosEmbarque);
          }
          
          // Actualizar clientes disponibles
          this.actualizarClientesDisponibles();
          
          // Si hay clientes pero no hay cliente activo, seleccionar el primero
          if (this.clientesDisponibles.length > 0 && !this.clienteActivo) {
            this.clienteActivo = this.clientesDisponibles[0].id.toString();
            console.log('Cliente activo seleccionado automáticamente:', this.clienteActivo);
          }
          
          // Configurar escucha en tiempo real para cambios en el embarque
          this.configurarEscuchaEmbarque();
          
          // Guardar estado para deshacer/rehacer
          this.guardarEstadoActual();
          
          console.log('Embarque cargado exitosamente');
          
          // Mostrar mensaje de éxito
          if (this.$toast) {
            this.$toast.success('Embarque cargado correctamente');
          }
        } else {
          console.error('No se encontraron datos para el embarque con ID:', this.embarqueId);
          // Inicializar un nuevo embarque ya que no existe
          this.inicializarNuevoEmbarque();
          if (this.$toast) {
            this.$toast.error('No se encontró el embarque solicitado. Se ha creado uno nuevo.');
          } else {
            alert('No se encontró el embarque solicitado. Se ha creado uno nuevo.');
          }
        }
      } catch (error) {
        console.error('Error al cargar embarque:', error);
        // Inicializar un nuevo embarque en caso de error
        this.inicializarNuevoEmbarque();
        
        const errorMessage = error && error.message ? error.message : 'Error desconocido';
        if (this.$toast) {
          this.$toast.error(`Error al cargar embarque: ${errorMessage}`);
        } else {
          alert(`Error al cargar embarque: ${errorMessage}`);
        }
      }
    },
    
    configurarEscuchaEmbarque() {
      // Cancelar cualquier escucha previa
      if (this.unsubscribeEmbarque) {
        this.unsubscribeEmbarque();
      }
      
      // Configurar nueva escucha
      const embarqueRef = ref(rtdb, `embarques/${this.embarqueId}`);
      this.unsubscribeEmbarque = onValue(embarqueRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // Verificar si los datos son diferentes a los actuales
          const cambioExterno = JSON.stringify(data) !== JSON.stringify(this.embarque);
          
          if (cambioExterno) {
            console.log('Cambios externos detectados en el embarque, actualizando...');
            
            // Marcar como actualización automática para evitar mensajes de éxito
            this.actualizacionAutomatica = true;
            
            // Actualizar el objeto embarque con los datos obtenidos
            for (const key in data) {
              if (Object.prototype.hasOwnProperty.call(data, key)) {
                Vue.set(this.embarque, key, data[key]);
              }
            }
            
            // Actualizar propiedades reactivas
            this.embarqueBloqueado = this.embarque.bloqueado || false;
            this.productosPorCliente = this.embarque.productosPorCliente || {};
            this.clienteCrudos = this.embarque.clienteCrudos || {};
            
            // Guardar estado para deshacer/rehacer
            this.guardarEstadoActual();
            
            // Mostrar notificación de actualización
            if (this.$toast) {
              this.$toast.info('El embarque ha sido actualizado con cambios externos');
            }
            
            // Restablecer la bandera de actualización automática
            setTimeout(() => {
              this.actualizacionAutomatica = false;
            }, 100);
          }
        }
      });
    },

    escucharUsuariosActivos() {
      try {
        const statusRef = ref(rtdb, 'status');
        
        this.unsubscribeUsuarios = onValue(statusRef, (snapshot) => {
          const usuarios = [];
          snapshot.forEach((childSnapshot) => {
            const usuario = childSnapshot.val();
            if (usuario && usuario.username) {
              usuarios.push({
                userId: childSnapshot.key,
                username: usuario.username,
                status: usuario.status || 'online',
                lastSeen: usuario.lastSeen
              });
            }
          });
          this.usuariosActivos = usuarios;
        });
      } catch (error) {
        console.error('Error al escuchar usuarios:', error);
      }
    },

    async iniciarPresenciaUsuario() {
      if (!this.authStore.isLoggedIn || !this.authStore.user) return;

      try {
        const userStatusRef = ref(rtdb, `status/${this.authStore.userId}`);
        await onDisconnect(userStatusRef).remove();
        
        await set(userStatusRef, {
          username: this.authStore.user.username,
          status: 'online',
          lastSeen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error al iniciar presencia:', error);
      }
    },

    abrirModalMedida(producto) {
      this.productoSeleccionado = producto;
      this.medidaTemp = producto.medida || '';
      this.mostrarModalMedida = true;
    },

    guardarMedida() {
      if (this.productoSeleccionado && this.medidaTemp.trim()) {
        this.$set(this.productoSeleccionado, 'medida', this.medidaTemp.trim());
        this.guardarCambiosEnTiempoReal();
      }
      this.cerrarModalMedida();
    },

    cerrarModalMedida() {
      this.mostrarModalMedida = false;
      this.productoSeleccionado = null;
      this.medidaTemp = '';
    },

    abrirModalPrecio(producto) {
      this.productoSeleccionado = producto;
      this.precioTemp = producto.precio || '';
      this.mostrarModalPrecio = true;
    },

    guardarPrecio() {
      if (this.productoSeleccionado) {
        const precio = this.precioTemp.trim();
        if (precio) {
          this.$set(this.productoSeleccionado, 'precio', precio);
        } else {
          this.$delete(this.productoSeleccionado, 'precio');
        }
        this.guardarCambiosEnTiempoReal();
      }
      this.cerrarModalPrecio();
    },

    cerrarModalPrecio() {
      this.mostrarModalPrecio = false;
      this.productoSeleccionado = null;
      this.precioTemp = '';
    },

    abrirModalHilos(producto) {
      this.productoSeleccionado = producto;
      this.hilosTemp = producto.hilos || '';
      this.mostrarModalHilos = true;
    },

    guardarHilos() {
      if (this.productoSeleccionado) {
        const hilos = this.hilosTemp.trim();
        if (hilos) {
          this.$set(this.productoSeleccionado, 'hilos', hilos);
        } else {
          this.$delete(this.productoSeleccionado, 'hilos');
        }
        this.guardarCambiosEnTiempoReal();
      }
      this.cerrarModalHilos();
    },

    cerrarModalHilos() {
      this.mostrarModalHilos = false;
      this.productoSeleccionado = null;
      this.hilosTemp = '';
    },

    abrirModalNota(producto) {
      this.productoSeleccionado = producto;
      this.notaTemp = producto.nota || '';
      this.mostrarModalNota = true;
    },

    guardarNota() {
      if (this.productoSeleccionado) {
        const nota = this.notaTemp.trim();
        if (nota) {
          this.$set(this.productoSeleccionado, 'nota', nota);
        } else {
          this.$delete(this.productoSeleccionado, 'nota');
        }
        this.guardarCambiosEnTiempoReal();
      }
      this.cerrarModalNota();
    },

    cerrarModalNota() {
      this.mostrarModalNota = false;
      this.productoSeleccionado = null;
      this.notaTemp = '';
    },

    agregarCrudo(clienteId) {
      if (!this.embarque.clienteCrudos) {
        Vue.set(this.embarque, 'clienteCrudos', {});
      }
      
      if (!this.embarque.clienteCrudos[clienteId]) {
        Vue.set(this.embarque.clienteCrudos, clienteId, []);
      }

      const nuevoCrudo = {
        id: Date.now().toString(),
        items: [{
          talla: '',
          taras: '',
          sobrante: '',
          barco: ''
        }]
      };

      this.embarque.clienteCrudos[clienteId].push(nuevoCrudo);
      this.guardarCambiosEnTiempoReal();
    },

    eliminarCrudo(clienteId, crudoIndex) {
      if (!this.embarque.clienteCrudos || !this.embarque.clienteCrudos[clienteId]) {
        return;
      }
      
      if (confirm('¿Está seguro de eliminar este crudo?')) {
        this.embarque.clienteCrudos[clienteId].splice(crudoIndex, 1);
        if (this.embarque.clienteCrudos[clienteId].length === 0) {
          Vue.delete(this.embarque.clienteCrudos, clienteId);
        }
        this.guardarCambiosEnTiempoReal();
      }
    },

    agregarItemCrudo(clienteId, crudoIndex) {
      if (!this.embarque.clienteCrudos || !this.embarque.clienteCrudos[clienteId]) {
        return;
      }
      
      const nuevoItem = {
        talla: '',
        taras: '',
        sobrante: '',
        barco: ''
      };
      
      this.embarque.clienteCrudos[clienteId][crudoIndex].items.push(nuevoItem);
      this.guardarCambiosEnTiempoReal();
    },

    eliminarItemCrudo(clienteId, crudoIndex, itemIndex) {
      if (!this.embarque.clienteCrudos || !this.embarque.clienteCrudos[clienteId]) {
        return;
      }
      
      this.embarque.clienteCrudos[clienteId][crudoIndex].items.splice(itemIndex, 1);
      if (this.embarque.clienteCrudos[clienteId][crudoIndex].items.length === 0) {
        this.eliminarCrudo(clienteId, crudoIndex);
      } else {
        this.guardarCambiosEnTiempoReal();
      }
    },

    actualizarMedidasUsadas() {
      const medidas = new Set();
      
      // Recolectar medidas de productos
      Object.values(this.productosPorCliente).forEach(productos => {
        productos.forEach(producto => {
          if (producto.medida) medidas.add(producto.medida);
        });
      });
      
      // Recolectar medidas de crudos
      Object.values(this.clienteCrudos).forEach(crudos => {
        crudos.forEach(crudo => {
          crudo.items.forEach(item => {
            if (item.talla) medidas.add(item.talla);
          });
        });
      });
      
      this.medidasUsadas = Array.from(medidas);
    },

    obtenerEmbarqueCliente(clienteId) {
      return {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: this.productosPorCliente[clienteId] || [],
        clienteCrudos: { [clienteId]: this.clienteCrudos[clienteId] || [] },
        nombreCliente: this.obtenerNombreCliente(clienteId)
      };
    },

    async guardarEmbarqueInicial() {
      console.log('Guardando embarque inicial para cliente ID:', this.clienteActivo);
      
      // Si no existe embarqueId, crear nuevo embarque
      if (!this.embarqueId) {
        try {
          // Generar un ID único para el embarque
          const embarquesRef = ref(rtdb, 'embarques');
          const nuevoEmbarqueRef = push(embarquesRef);
          this.embarqueId = nuevoEmbarqueRef.key;
          
          console.log('Nuevo embarque creado con ID:', this.embarqueId);
          
          // Preparar datos del embarque
          const embarqueData = {
            fecha: this.embarque.fecha || new Date().toISOString().split('T')[0],
            cargaCon: this.embarque.cargaCon || '',
            productosPorCliente: {},
            clienteCrudos: {},
            clientesJuntarMedidas: {},
            bloqueado: false,
            ultimaModificacion: new Date().toISOString()
          };
          
          // Guardar el embarque
          await set(nuevoEmbarqueRef, embarqueData);
          
          // Activar modo edición
          this.modoEdicion = true;
          
          // Luego agregar el producto
          this.agregarProducto(this.clienteActivo);
          
          console.log('Embarque inicial guardado exitosamente');
          
          return this.embarqueId;
        } catch (error) {
          console.error('Error al guardar embarque inicial:', error);
          throw error;
        }
      } else {
        console.log('Ya existe un embarque con ID:', this.embarqueId);
        return this.embarqueId;
      }
    },

    async agregarNuevoCliente() {
      if (!this.nuevoClienteNombre.trim()) {
        alert('Por favor, ingrese el nombre del cliente');
        return;
      }

      try {
        const clientesRef = ref(rtdb, 'clientes');
        const nuevoClienteRef = push(clientesRef);
        this.nuevoClienteId = nuevoClienteRef.key;

        await set(nuevoClienteRef, {
          nombre: this.nuevoClienteNombre,
          color: '#7F8C8D',
          textColor: '#FFFFFF'
        });

        this.clientesPersonalizadosEmbarque.push({
          id: this.nuevoClienteId,
          nombre: this.nuevoClienteNombre
        });

        this.clienteActivo = this.nuevoClienteId;
        this.mostrarModalNuevoCliente = false;
        this.nuevoClienteNombre = '';

        console.log('Cliente agregado exitosamente');
      } catch (error) {
        console.error('Error al agregar cliente:', error);
        alert('Error al agregar el cliente: ' + error.message);
      }
    },

    cerrarModalNuevoCliente() {
      this.mostrarModalNuevoCliente = false;
      this.nuevoClienteNombre = '';
    },

    async crearClientePorDefecto() {
      try {
        console.log('Creando cliente por defecto...');
        
        const clientesRef = ref(rtdb, 'clientes');
        const nuevoClienteRef = push(clientesRef);
        const clienteId = nuevoClienteRef.key;
        
        await set(nuevoClienteRef, {
          nombre: 'Cliente Default',
          color: '#7F8C8D',
          textColor: '#FFFFFF'
        });
        
        console.log('Cliente por defecto creado con ID:', clienteId);
        
        // Actualizar la lista de clientes
        this.clientesPredefinidos = [{
          id: clienteId,
          nombre: 'Cliente Default',
          color: '#7F8C8D',
          textColor: '#FFFFFF'
        }];
        
        this.clientesDisponibles = [...this.clientesPredefinidos];
        this.clienteActivo = clienteId;
        
        return clienteId;
      } catch (error) {
        console.error('Error al crear cliente por defecto:', error);
        throw error;
      }
    },

    verificarEstructuraEmbarque() {
      console.log('Verificando estructura del embarque');
      
      // Verificar que existan las propiedades básicas
      if (!this.embarque) {
        console.error('El objeto embarque no existe');
        this.embarque = {
          fecha: new Date().toISOString().split('T')[0],
          cargaCon: '',
          productosPorCliente: {},
          clienteCrudos: {},
          clientesJuntarMedidas: {},
          bloqueado: false,
          ultimaModificacion: null
        };
      }
      
      // Verificar que exista productosPorCliente
      if (!this.embarque.productosPorCliente) {
        console.warn('Propiedad productosPorCliente no existe, inicializando');
        this.$set(this.embarque, 'productosPorCliente', {});
      }
      
      // Verificar que exista clienteCrudos
      if (!this.embarque.clienteCrudos) {
        console.warn('Propiedad clienteCrudos no existe, inicializando');
        this.$set(this.embarque, 'clienteCrudos', {});
      }
      
      // Verificar que exista clientesJuntarMedidas
      if (!this.embarque.clientesJuntarMedidas) {
        console.warn('Propiedad clientesJuntarMedidas no existe, inicializando');
        this.$set(this.embarque, 'clientesJuntarMedidas', {});
      }
      
      // Verificar que exista fecha
      if (!this.embarque.fecha) {
        console.warn('Propiedad fecha no existe, inicializando con fecha actual');
        this.$set(this.embarque, 'fecha', new Date().toISOString().split('T')[0]);
      }
      
      // Verificar que exista cargaCon
      if (!this.embarque.cargaCon) {
        console.warn('Propiedad cargaCon no existe, inicializando');
        this.$set(this.embarque, 'cargaCon', '');
      }
      
      // Verificar que exista bloqueado
      if (this.embarque.bloqueado === undefined) {
        console.warn('Propiedad bloqueado no existe, inicializando');
        this.$set(this.embarque, 'bloqueado', false);
      }
      
      // Verificar que exista ultimaModificacion
      if (!this.embarque.ultimaModificacion) {
        console.warn('Propiedad ultimaModificacion no existe, inicializando');
        this.$set(this.embarque, 'ultimaModificacion', new Date().toISOString());
      }
      
      // Sincronizar propiedades reactivas con las del embarque
      this.embarqueBloqueado = this.embarque.bloqueado;
      this.productosPorCliente = this.embarque.productosPorCliente;
      this.clienteCrudos = this.embarque.clienteCrudos;
      
      console.log('Estructura del embarque verificada y corregida si era necesario');
    },

    actualizarClientesDisponibles() {
      console.log('Actualizando lista de clientes disponibles');
      
      // Combinar clientes predefinidos y personalizados
      const clientesCombinados = [
        ...this.clientesPredefinidos,
        ...this.clientesPersonalizadosEmbarque
      ];
      
      // Eliminar duplicados basados en ID
      const clientesUnicos = clientesCombinados.reduce((acc, cliente) => {
        const id = cliente.id.toString();
        if (!acc.find(c => c.id.toString() === id)) {
          acc.push(cliente);
        }
        return acc;
      }, []);
      
      this.clientesDisponibles = clientesUnicos;
      console.log('Clientes disponibles actualizados:', this.clientesDisponibles);
    },

    inicializarNuevoEmbarque() {
      console.log('Inicializando nuevo embarque');
      // Reiniciar el ID y modo edición
      this.embarqueId = null;
      this.modoEdicion = false;
      
      // Inicializar el embarque con valores por defecto
      this.embarque = {
        fecha: new Date().toISOString().split('T')[0],
        cargaCon: '',
        productosPorCliente: {},
        clienteCrudos: {},
        clientesJuntarMedidas: {},
        bloqueado: false,
        ultimaModificacion: new Date().toISOString()
      };
      
      // Verificar estructura
      this.verificarEstructuraEmbarque();
      
      // Si hay clientes predefinidos pero no hay cliente activo, seleccionar el primero
      if (this.clientesPredefinidos.length > 0 && !this.clienteActivo) {
        this.clienteActivo = this.clientesPredefinidos[0].id.toString();
        console.log('Cliente activo seleccionado automáticamente:', this.clienteActivo);
      }
    },

    async cargarClientesPredefinidos() {
      console.log('Cargando clientes predefinidos');
      try {
        const clientesRef = ref(rtdb, 'clientes');
        
        // Obtener datos de clientes
        const snapshot = await get(clientesRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('Datos de clientes obtenidos:', data);
          
          // Transformar los datos a un array
          const clientes = Object.keys(data).map(key => ({
            id: key,
            nombre: data[key].nombre,
            color: data[key].color || '#3498db',
            textColor: data[key].textColor || '#FFFFFF'
          }));
          
          this.clientesPredefinidos = clientes;
          console.log('Clientes predefinidos cargados:', this.clientesPredefinidos);
          
          // Actualizar clientes disponibles
          this.actualizarClientesDisponibles();
          
          // Si no hay cliente activo, seleccionar el primero
          if (this.clientesPredefinidos.length > 0 && !this.clienteActivo) {
            this.clienteActivo = this.clientesPredefinidos[0].id.toString();
            console.log('Cliente activo seleccionado automáticamente:', this.clienteActivo);
          }
        } else {
          console.warn('No se encontraron clientes predefinidos, creando cliente por defecto');
          
          // Crear cliente por defecto
          try {
            await this.crearClientePorDefecto();
            console.log('Cliente por defecto creado exitosamente');
          } catch (error) {
            console.error('Error al crear cliente por defecto:', error);
            if (this.$toast) {
              this.$toast.error(`Error al crear cliente por defecto: ${error.message || 'Error desconocido'}`);
            } else {
              alert(`Error al crear cliente por defecto: ${error.message || 'Error desconocido'}`);
            }
          }
        }
      } catch (error) {
        console.error('Error al cargar clientes predefinidos:', error);
        if (this.$toast) {
          this.$toast.error(`Error al cargar clientes: ${error.message || 'Error desconocido'}`);
        } else {
          alert(`Error al cargar clientes: ${error.message || 'Error desconocido'}`);
        }
      }
    }
  },

  async created() {
    console.log('Iniciando componente NuevoEmbarque');
    
    // Inicializar el store de autenticación
    this.authStore = useAuthStore();
    console.log('Estado de autenticación:', {
      isLoggedIn: this.authStore.isLoggedIn,
      user: this.authStore.user
    });
    
    try {
      // Inicializar propiedades reactivas
      this.productosPorCliente = this.embarque.productosPorCliente;
      this.clienteCrudos = this.embarque.clienteCrudos;
      this.embarqueBloqueado = this.embarque.bloqueado;
      
      // Inicializar el estado para el historial de deshacer/rehacer
      this.guardarEstadoActual();
      
      // Cargar clientes predefinidos primero
      await this.cargarClientesPredefinidos();
      
      // Cargar usuarios activos
      await this.escucharUsuariosActivos();
      
      // Iniciar presencia del usuario
      if (this.authStore.isLoggedIn && this.authStore.user) {
        await this.iniciarPresenciaUsuario();
      }
      
      // Verificar si estamos en modo edición (recibimos un ID de embarque)
      if (this.$route.params.id) {
        this.embarqueId = this.$route.params.id;
        this.modoEdicion = true;
        console.log('Modo edición activado para embarque ID:', this.embarqueId);
        
        // Cargar el embarque desde la base de datos
        await this.cargarEmbarque();
        
        // Actualizar el título de la página
        document.title = `Embarque ${this.embarqueId}`;
      } else {
        console.log('Modo nuevo embarque activado');
        // Inicializar fecha con la fecha actual
        this.embarque.fecha = new Date().toISOString().split('T')[0];
        
        // Si hay clientes predefinidos pero no hay cliente activo, seleccionar el primero
        if (this.clientesPredefinidos.length > 0 && !this.clienteActivo) {
          this.clienteActivo = this.clientesPredefinidos[0].id.toString();
          console.log('Cliente activo seleccionado automáticamente:', this.clienteActivo);
        }
        
        // Actualizar el título de la página
        document.title = 'Nuevo Embarque';
      }
    } catch (error) {
      console.error('Error en created hook:', error);
      if (this.$toast) {
        this.$toast.error(`Error al inicializar: ${error.message || 'Error desconocido'}`);
      } else {
        alert(`Error al inicializar: ${error.message || 'Error desconocido'}`);
      }
    }
  },

  watch: {
    // Observar cambios en las propiedades del embarque para mantener sincronizadas las propiedades reactivas
    'embarque.productosPorCliente': {
      handler(newVal) {
        this.productosPorCliente = newVal;
      },
      deep: true
    },
    'embarque.clienteCrudos': {
      handler(newVal) {
        this.clienteCrudos = newVal;
      },
      deep: true
    },
    'embarque.bloqueado': {
      handler(newVal) {
        this.embarqueBloqueado = newVal;
      }
    }
  },

  beforeDestroy() {
    if (this.unsubscribeUsuarios) {
      this.unsubscribeUsuarios();
    }
    if (this.unsubscribeEmbarque) {
      this.unsubscribeEmbarque();
    }
  }
}
</script>

<style scoped>
.app-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.nuevo-embarque-container {
  display: flex;
  height: 100%;
  position: relative;
}

.sidebar-clientes {
  width: 250px;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
}

.sidebar-clientes.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.toggle-sidebar-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  color: #666;
}

.sidebar-clientes-contenido {
  padding: 15px;
  overflow-y: auto;
  flex-grow: 1;
}

.btn-nota-cliente {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s ease;
}

.btn-nota-cliente.activo {
  transform: translateX(5px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.btn-agregar-cliente {
  width: 100%;
  padding: 10px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.3s ease;
}

.btn-agregar-cliente:hover {
  background-color: #219a52;
}

.sidebar-resumen {
  padding: 15px;
  background-color: #fff;
  border-top: 1px solid #ddd;
}

.sidebar-resumen h4 {
  margin: 10px 0;
  color: #333;
  font-size: 1rem;
}

.sidebar-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.sidebar-item.total {
  margin-top: 10px;
  padding-top: 5px;
  border-top: 1px solid #ddd;
  font-weight: bold;
}

.nuevo-embarque {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
}

.nuevo-embarque h1 {
  margin-bottom: 20px;
  color: #333;
}

.botones {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn-volver,
.btn-bloqueo {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s ease;
}

.btn-volver {
  background-color: #6c757d;
  color: white;
}

.btn-bloqueo {
  background-color: #dc3545;
  color: white;
}

.btn-bloqueo.bloqueado {
  background-color: #28a745;
}

.header {
  margin-bottom: 20px;
}

.header-row {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.fecha-selector,
.carga-selector {
  flex: 1;
}

.form-control {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.botones-accion {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-warning {
  background-color: #ffc107;
  color: #000;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.cliente-grupo {
  margin-bottom: 30px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
}

.cliente-header {
  padding: 15px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #ddd;
}

.cliente-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cliente-info h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-pdf-mini {
  background: none;
  border: none;
  color: #17a2b8;
  cursor: pointer;
  padding: 5px;
}

.cliente-totales {
  display: flex;
  gap: 20px;
  font-size: 0.9rem;
}

.cliente-header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.juntar-medidas-checkbox {
  display: flex;
  align-items: center;
  gap: 5px;
}

.productos-container {
  padding: 15px;
}

.producto {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
}

.producto.reporte-completo {
  border-color: #28a745;
}

.producto.reporte-incompleto {
  border-color: #ffc107;
}

.producto-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.medida-container {
  flex-grow: 1;
}

.medida-texto {
  font-size: 1.1rem;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.medida-texto:not(.disabled):hover {
  background-color: #f8f9fa;
}

.medida-texto.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.medida-texto.tiene-nombre-alternativo {
  color: #17a2b8;
  font-weight: bold;
}

.producto-controles {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-control {
  width: 30px;
  height: 30px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.btn-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-control.tiene-valor {
  background-color: #28a745;
  color: white;
  border-color: #28a745;
}

.kg-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
}

.reporte-taras {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reporte-fila {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-reporte {
  width: 80px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.multiplicador {
  font-weight: bold;
  color: #666;
}

.totales-producto {
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
  font-weight: bold;
}

.btn-agregar-producto {
  width: 100%;
  padding: 10px;
  background-color: #17a2b8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.3s ease;
}

.btn-agregar-producto:hover {
  background-color: #138496;
}

.crudos-container {
  margin-top: 30px;
  border-top: 2px solid #ddd;
  padding-top: 20px;
}

.crudos-container h4 {
  margin-bottom: 20px;
  color: #333;
}

.crudo-grupo {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
}

.crudo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.crudo-header h5 {
  margin: 0;
  color: #333;
}

.crudo-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.crudo-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #f8f9fa;
}

.item-campos {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex-grow: 1;
}

.campo {
  flex: 1;
  min-width: 150px;
}

.campo label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: #666;
}

.eliminar-item {
  padding: 5px 10px;
  margin-top: 22px;
}

.btn-agregar-item {
  align-self: flex-start;
}

.btn-agregar-crudo {
  margin-top: 10px;
  width: 100%;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-contenido {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
}

.btn-cerrar-modal {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  margin-bottom: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.loader-inline {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.medidas-predefinidas {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}

.btn-medida {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-medida:hover {
  background-color: #f8f9fa;
}

.btn-medida.activo {
  background-color: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.modal-contenido.modal-lg {
  width: 600px;
}

@media (max-width: 768px) {
  .nuevo-embarque-container {
    flex-direction: column;
  }

  .sidebar-clientes {
    width: 100%;
    max-height: 200px;
  }

  .sidebar-clientes.sidebar-collapsed {
    max-height: 50px;
  }

  .header-row {
    flex-direction: column;
  }

  .cliente-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .cliente-totales {
    flex-direction: column;
    gap: 5px;
  }

  .cliente-header-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .producto-header {
    flex-direction: column;
    gap: 10px;
  }

  .producto-controles {
    justify-content: flex-start;
  }

  .reporte-fila {
    flex-wrap: wrap;
  }

  .modal-contenido {
    width: 95%;
  }

  .medidas-predefinidas {
    max-height: 150px;
    overflow-y: auto;
  }

  .modal-contenido.modal-lg {
    width: 95%;
  }
}
</style> 