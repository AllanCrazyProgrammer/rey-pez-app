<template>
  <div class="nuevo-embarque-container">
    <div class="nuevo-embarque">
      <h1>{{ modoEdicion ? 'Editar Embarque' : 'Nuevo Embarque' }}</h1>
      <div class="botones">
        <button @click="volverAEmbarquesMenu" class="btn-volver">
          <i class="fas fa-arrow-left"></i> Volver a Embarques Menu
        </button>
      </div>
      <div class="header">
        <div class="fecha-selector">
          <label for="fecha">Fecha de Embarque:</label>
          <input type="date" id="fecha" v-model="embarque.fecha" class="form-control" required>
        </div>
        <div class="carga-selector">
          <label for="cargaCon">Carga con:</label>
          <select id="cargaCon" v-model="embarque.cargaCon" class="form-control" required>
            <option value="">Seleccionar</option>
            <option value="Porro">Porro</option>
            <option value="Caminante">Caminante</option>
          </select>
        </div>
    
    
<div class="resumen-container">
  <div class="resumen-columna">
    <div class="resumen-header">
      <h4 class="resumen-titulo">Resumen de Taras</h4>
      <button @click="generarResumenTarasPDF" class="btn btn-info">
        <i class="fas fa-file-pdf"></i> PDF Taras
      </button>
    </div>
    <div class="resumen-grid">
      <div class="resumen-item">
        <span class="resumen-label">Taras Limpio: </span>
        <strong class="resumen-value">{{ calcularTarasLimpio() }}</strong>
      </div>
      <div class="resumen-item">
        <span class="resumen-label">Taras Crudo: </span>
        <strong class="resumen-value">{{ calcularTarasCrudo() }}</strong>
      </div>
      <div class="resumen-item total">
        <span class="resumen-label">Total Taras: </span>
        <strong class="resumen-value">{{ calcularTotalTaras() }}</strong>
      </div>
    </div>
  </div>
  <div class="resumen-columna">
    <h4 class="resumen-titulo">Resumen de Kilos</h4>
    <div class="resumen-grid">
      <div class="resumen-item">
        <span class="resumen-label">Kilos Limpio: </span>
        <strong class="resumen-value">{{ calcularKilosLimpio() }}</strong>
      </div>
      <div class="resumen-item">
        <span class="resumen-label">Kilos Crudo: </span>
        <strong class="resumen-value">{{ calcularKilosCrudo() }}</strong>
      </div>
      <div class="resumen-item total">
        <span class="resumen-label">Total Kilos: </span>
        <strong class="resumen-value">{{ calcularTotalKilos() }}</strong>
      </div>
    </div>
  </div>
</div>
<div class="botones-undo-redo">
        <button type="button" @click="undo" :disabled="undoStack.length <= 1" class="btn btn-secondary btn-sm">Deshacer</button>
        <button type="button" @click="redo" :disabled="redoStack.length === 0" class="btn btn-secondary btn-sm">Rehacer</button>
      </div>
    </div>
      
    <form @submit.prevent="guardarEmbarque" @keydown.enter.prevent>
      <div v-for="(clienteProductos, clienteId) in productosPorCliente" :key="clienteId" class="cliente-grupo">
        <div class="cliente-header" :data-cliente="obtenerNombreCliente(clienteId)">
  <div class="cliente-info">
    <h3>{{ obtenerNombreCliente(clienteId) }}</h3>
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
      >
      <label :for="'juntar-medidas-' + clienteId" @click.stop>Juntar medidas</label>
    </div>
    <button type="button" @click.stop="generarNotaVenta(clienteId)" class="btn btn-info btn-sm generar-nota">Generar Nota</button>
    <button type="button" @click.stop="eliminarCliente(clienteId)" class="btn btn-danger btn-sm eliminar-cliente">Eliminar Cliente</button>
  </div>
</div>
        <div class="productos-container">
          <div v-for="(producto, index) in clienteProductos" :key="index" class="producto" 
            :data-es-venta="producto.esVenta"
            :class="{
              'reporte-completo': coincideTarasYBolsas(producto),
              'reporte-incompleto': !coincideTarasYBolsas(producto) && tieneAlgunReporte(producto)
            }"
          >
            <!-- Encabezado de la medida y selección -->
            <h2 class="encabezado-medida">
              <div class="botones-encabezado">
                <div class="botones-fila-superior">
                  <button 
                    @click="abrirModalPrecio(producto)" 
                    class="btn-precio"
                    :class="{ 'tiene-precio': producto.precio }"
                  >
                    $
                  </button>
                  <button 
                    @click="abrirModalHilos(producto)" 
                    class="btn-hilos"
                    :class="{ 'tiene-hilos': producto.hilos }"
                  >
                    H
                  </button>
                </div>
                <div class="botones-fila-inferior">
                  <button 
                    @click="abrirModalNota(producto)" 
                    class="btn-nota"
                    :class="{ 'tiene-nota': producto.nota }"
                  >
                    N
                  </button>
                  <div class="kg-radio">
                    <input 
                      type="checkbox"
                      v-model="producto.noSumarKilos"
                      class="kg-checkbox"
                      :id="'kg-' + producto.id"
                    >
                    <label :for="'kg-' + producto.id">kg</label>
                  </div>
                </div>
              </div>
              <span 
                class="medida-texto" 
                @click="abrirModalNombreAlternativo(producto)"
              >
                {{ producto.nombreAlternativoPDF || producto.medida || 'Sin Medida' }}
              </span>
              - {{ obtenerTipoProducto(producto) }}
              <span v-if="producto.precio" class="precio-tag">${{ producto.precio }}</span>
            </h2>
            <div class="producto-header">
              <div class="medida-input-container">
                <input
                  type="text"
                  v-model="producto.medida"
                  class="medida-input"
                  placeholder="Medida"
                  @input="onMedidaInput(producto, $event)"
                  @blur="onMedidaBlur(producto)"
                >
                <!-- Modificar la condición para mostrar sugerencias -->
                <div 
                  v-if="productoEditandoId === producto.id && sugerenciasMedidas.length > 0" 
                  class="sugerencias-container"
                >
                  <div
                    v-for="medida in sugerenciasMedidas"
                    :key="medida"
                    class="sugerencia-item"
                    @mousedown="seleccionarMedida(producto, medida)"
                  >
                    {{ medida }}
                  </div>
                </div>
              </div>
              <select 
                v-model="producto.tipo" 
                class="form-control tipo-select" 
                @change="onTipoChange(producto)"
                :class="{
                  'tipo-azul': producto.tipo === 'c/h20',
                  'tipo-verde': producto.tipo === 's/h20'
                }"
              >
                <option value="">Seleccionar</option>
                <option value="s/h20">S/H20</option>
                <option value="c/h20">C/H20</option>
                <option value="otro">Otro</option>
              </select>

              <!-- Checkbox de venta movido aquí, después del tipo -->
              <div v-if="obtenerNombreCliente(producto.clienteId) === 'Ozuna'" class="venta-checkbox-container">
                <input 
                  type="checkbox" 
                  v-model="producto.esVenta" 
                  class="form-check-input venta-checkbox" 
                  :id="'ventaCheck-' + producto.id"
                >
                <label :for="'ventaCheck-' + producto.id">Venta</label>
              </div>
              
              <div v-if="producto.tipo === 'c/h20'" class="valores-container">
                <div class="valor-neto-container">
                  <label>Valor neto:</label>
                  <input
                    type="number"
                    v-model="producto.camaronNeto"
                    class="camaron-neto-input"
                    step="0.01"
                    min="0"
                    max="1"
                  >
                </div>
  
              </div>
              <input
                v-if="producto.tipo === 'otro'"
                type="text" 
                v-model="producto.tipoPersonalizado" 
                class="form-control tipo-input" 
                placeholder="Especificar"
              >
              <button type="button" @click="eliminarProducto(producto)" class="btn btn-danger btn-sm eliminar-producto">X</button>
            </div>
            <div class="sumas-verticales">
              <div class="columna">
                <div class="taras-header">
                  <h5>Taras</h5>
                  <div class="checkbox-container">
                    <input 
                      type="checkbox" 
                      v-model="producto.restarTaras"
                      @change="onRestarTarasChange(producto)"
                      class="form-check-input" 
                      :id="'restarTarasCheck-' + index"
                    >
                    <label :for="'restarTarasCheck-' + index">-3</label>
                  </div>
                </div>
                <div v-for="(tara, taraIndex) in producto.taras" :key="taraIndex" class="input-group">
                  <input 
            
                    v-model.number="producto.taras[taraIndex]" 
                    class="form-control tara-input" 
                    placeholder="Tara"
                    :size="String(producto.taras[taraIndex] || '').length || 1"
                    inputmode="decimal"
                    pattern="[0-9]*"
                  >
                  <button type="button" @click="eliminarTara(producto, taraIndex)" class="btn btn-danger btn-sm">-</button>
                </div>
                <div v-for="(taraExtra, taraExtraIndex) in producto.tarasExtra" :key="'extra-' + taraExtraIndex" class="input-group">
                  <input 
                    v-model.number="producto.tarasExtra[taraExtraIndex]" 
                    class="form-control tara-input tara-extra-input" 
                    placeholder="Tara Extra"
                    :size="String(producto.tarasExtra[taraExtraIndex] || '').length || 1"
                    inputmode="decimal"
                    pattern="[0-9]*"
                  >
                  <button type="button" @click="eliminarTaraExtra(producto, taraExtraIndex)" class="btn btn-danger btn-sm">-</button>
                </div>
                <div class="botones-tara">
                  <button type="button" @click="agregarTara(producto)" class="btn btn-success btn-sm agregar-tara">+</button>
                  <button type="button" @click="agregarTaraExtra(producto)" class="btn btn-warning btn-sm agregar-tara-extra">+ Extra</button>
                </div>
                <div class="total">Total: {{ totalTaras(producto) }}</div>
              </div>
              <div class="columna">
                <h5>Kilos</h5>
                <div v-for="(kilo, kiloIndex) in producto.kilos" :key="kiloIndex" class="input-group">
                  <input 
                    v-model.number="producto.kilos[kiloIndex]" 
                    class="form-control kilo-input" 
                    placeholder="Kilos"
                    :size="String(producto.kilos[kiloIndex] || '').length || 1"
                    inputmode="decimal"
                    pattern="[0-9]*"
                  >
                  <button type="button" @click="eliminarKilo(producto, kiloIndex)" class="btn btn-danger btn-sm">-</button>
                </div>
                <button type="button" @click="agregarKilo(producto)" class="btn btn-success btn-sm agregar-kilo">+</button>
                <div class="total">Total: {{ totalKilos(producto) }}</div>
              </div>
            </div>
            <div class="reporte-taras-bolsas">
              <div class="reporte-item">
                <h5>Taras</h5>
                <div v-for="(tara, index) in producto.reporteTaras" :key="index" class="input-group mb-2">
                  <input 
                    type="text" 
                    v-model="producto.reporteTaras[index]" 
                    class="form-control reporte-input" 
                    inputmode="decimal"
                    pattern="[0-9]*"
                  >
                  <button type="button" @click="eliminarReporteTara(producto, index)" class="btn btn-danger btn-sm">-</button>
                </div>
                <button type="button" @click="agregarReporteTara(producto)" class="btn btn-success btn-sm">+</button>
                <div class="total-taras-reporte" :class="{ 'coincide': coincideTaras(producto), 'no-coincide': !coincideTaras(producto) }">
                   Reportadas: {{ totalTarasReportadas(producto) }}
                </div>
              </div>
              <div class="reporte-item">
                <h5>Bolsas</h5>
                <div v-for="(bolsa, index) in producto.reporteBolsas" :key="index" class="input-group mb-2">
                  <input 
                    type="text" 
                    v-model="producto.reporteBolsas[index]" 
                    class="form-control reporte-input" 
                    inputmode="decimal"
                    pattern="[0-9]*"
                  >
                  <button type="button" @click="eliminarReporteBolsa(producto, index)" class="btn btn-danger btn-sm">-</button>
                </div>
                <button type="button" @click="agregarReporteBolsa(producto)" class="btn btn-success btn-sm">+</button>
                <div class="totales-reporte">
          
                  <div class="total-bolsas-reporte">
                    Bolsas: {{ calcularTotalBolsas(producto) }}
                  </div>
                </div>
              </div>
            </div>
            <div v-if="reporteExcedeTresParentesis(producto)" class="reporte-extenso">
              {{ generarReporteExtenso(producto) }}
            </div>
          </div>
          <div v-for="(crudo, index) in clienteCrudos[clienteId] || []" :key="'crudo-'+index" class="producto crudo">
            <h2 class="crudo-header">Crudos</h2>
            
            <div class="crudo-items">
              <div v-for="(item, itemIndex) in crudo.items || []" :key="'item-'+itemIndex" class="crudo-item">
                <div class="crudo-talla-container">
                  <button 
                    @click="abrirModalPrecio(item)" 
                    class="btn-precio"
                    :class="{ 'tiene-precio': item.precio }"
                  >
                    $
                  </button>
                  <select 
                    v-model="item.talla" 
                    class="form-control talla-select"
                  >
                    <option value="">Elige talla</option>
                    <option value="Med c/c">Med c/c</option>
                    <option value="Med-Esp c/c">Med-Esp c/c</option>
                    <option value="Med-gde c/c">Med-gde c/c</option>
                    <option value="Gde c/c">Gde c/c</option>
                    <option value="Gde c/ Extra">Gde c/ Extra c/c</option>
                    <option value="Extra c/c">Extra c/c</option>
                    <option value="Jumbo c/c">Jumbo c/c</option>
                    <option value="Linea">Linea</option>
                    <option value="Rechazo">Rechazo</option>
                  </select>
                  <span v-if="item.precio" class="precio-tag">${{ item.precio }}</span>
                  
                  <input 
                    type="text" 
                    v-model="item.barco" 
                    class="form-control barco-input" 
                    placeholder="Barco"
                  >
                </div>
                
                <div class="crudo-taras-container">
                  <div class="taras-wrapper">
                    <input 
                      type="text" 
                      v-model="item.taras" 
                      class="form-control taras-input" 
                      placeholder="Taras"
                      @input="actualizarTotalCrudos(clienteId, index)"
                    >
                    <input 
                      v-if="item.mostrarSobrante"
                      type="text" 
                      v-model="item.sobrante" 
                      class="form-control taras-input" 
                      placeholder="Sbrte"
                      @input="actualizarTotalCrudos(clienteId, index)"
                    >
                  </div>
                  <div class="buttons-wrapper">
                    <button type="button" @click="eliminarCrudoItem(clienteId, index, itemIndex)" class="btn btn-danger btn-sm eliminar-crudo-item">-</button>
                    <button type="button" @click="toggleSobrante(clienteId, index, itemIndex)" class="btn btn-success btn-sm agregar-sobrante">+</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="crudo-footer">
              <button type="button" @click="agregarCrudoItem(clienteId, index)" class="btn btn-primary btn-sm agregar-crudo-item">+ Agregar Talla/Taras</button>
              <button type="button" @click="eliminarCrudo(clienteId, index)" class="btn btn-danger btn-sm eliminar-crudo">Eliminar Crudo</button>
              <div class="total-crudos">Total de taras: {{ calcularTotalCrudos(crudo) }}</div>
            </div>
          </div>
        </div>
        <div class="botones-agregar">
          <button type="button" @click="agregarProducto(clienteId)" class="btn btn-primary btn-sm agregar-producto">Agregar Producto</button>
          <button type="button" @click="agregarCrudo(clienteId)" class="btn btn-info btn-sm agregar-crudo">Agregar Crudos</button>
        </div>
      </div>
      <div class="cliente-selector">
        <div class="row align-items-center">
          <div class="col-12 col-md-8">
            <select v-model="nuevoClienteId" class="form-control">
              <option value="">Seleccione un cliente</option>
              <option v-for="cliente in clientesDisponibles" :key="cliente.key" :value="cliente.id">
                {{ cliente.nombre }}
              </option>
            </select>
          </div>
          <div class="col-12 col-md-4 mt-2 mt-md-0">
            <button type="button" @click="agregarClienteProducto" class="btn btn-primary btn-block agregar-cliente">Agregar Cliente</button>
          </div>
        </div>
      </div>
      <div class="botones-finales">
        <button type="submit" class="btn btn-success crear-embarque">
          {{ modoEdicion ? 'Actualizar Embarque' : 'Guardar Embarque' }}
        </button>
        <div class="generar-resumen-container">
          <button type="button" @click="generarResumenPDF" class="btn btn-info generar-pdf">
            Resumen Embarque
          </button>

        </div>
        <router-link :to="{ name: 'Rendimientos', params: { id: embarqueId } }" class="btn btn-warning ver-rendimientos">
          Ver Rendimientos
        </router-link>
      </div>
    </form>
 
  </div>
    
    <!-- Modificar el modal para evitar la propagación de eventos -->
    <div v-if="mostrarModalPrecio" class="modal-precio" @click.stop="cerrarModalPrecio">
      <div class="modal-contenido" @click.stop>
        <h3>Establecer Precio</h3>
        <div class="input-precio">
          <span class="simbolo-precio">$</span>
          <input 
            type="number" 
            v-model="precioTemp"
            step="0.01"
            min="0"
            placeholder="0.00"
            @keyup.enter.stop="guardarPrecio"
            @keydown.stop
            ref="precioInput"
          >
        </div>
        <div class="modal-botones">
          <button @click.stop="guardarPrecio" class="btn btn-success">Guardar</button>
          <button @click.stop="cerrarModalPrecio" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    </div>
    <!-- Modal para Hilos -->
    <div v-if="mostrarModalHilos" class="modal-hilos" @click.stop="cerrarModalHilos">
      <div class="modal-contenido" @click.stop>
        <h3>Establecer Hilos</h3>
        <div class="input-hilos">
          <input 
            type="text" 
            v-model="hilosTemp"
            placeholder="Ingrese hilos"
            @keyup.enter.stop="guardarHilos"
            @keydown.stop
            ref="hilosInput"
          >
        </div>
        <div class="modal-botones">
          <button @click.stop="guardarHilos" class="btn btn-success">Guardar</button>
          <button @click.stop="cerrarModalHilos" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    </div>
    <!-- Agregar el nuevo modal de notas al final del template -->
    <div v-if="mostrarModalNota" class="modal-nota" @click.stop="cerrarModalNota">
      <div class="modal-contenido" @click.stop>
        <h3>Agregar Nota</h3>
        <div class="input-nota">
          <textarea 
            v-model="notaTemp"
            placeholder="Escriba su nota aquí"
            @keyup.enter.stop
            ref="notaInput"
          ></textarea>
        </div>
        <div class="modal-botones">
          <button @click.stop="guardarNota" class="btn btn-success">Guardar</button>
          <button @click.stop="cerrarModalNota" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    </div>
    <!-- Agregar este nuevo modal -->
    <div v-if="mostrarModalNombreAlternativo" class="modal-nombre-alternativo" @click.stop="cerrarModalNombreAlternativo">
      <div class="modal-contenido" @click.stop>
        <h3>Nombre Alternativo para PDF</h3>
        <div class="input-nombre">
          <input 
            type="text" 
            v-model="nombreAlternativoTemp"
            placeholder="Ingrese nombre alternativo"
            @keyup.enter.stop="guardarNombreAlternativo"
            @keydown.stop
            ref="nombreAlternativoInput"
          >
        </div>
        <div class="modal-botones">
          <button @click.stop="guardarNombreAlternativo" class="btn btn-success">Guardar</button>
          <button @click.stop="cerrarModalNombreAlternativo" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { debounce } from 'lodash';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generarNotaVentaPDF } from '@/utils/pdfGenerator';
import Rendimientos from './Rendimientos.vue'
import { generarResumenTarasPDF } from '@/utils/resumenTarasPdf';

export default {
  name: 'NuevoEmbarque',
  components: {
    Rendimientos
  },
  data() {
    return {
      clientesJuntarMedidas: {}, // Agregar esta línea dentro de data()
      clientesPredefinidos: [
        { id: 1, nombre: 'Joselito' },
        { id: 2, nombre: 'Catarro' },
        { id: 3, nombre: 'Otilio' },
        { id: 4, nombre: 'Ozuna' },
      ],
      clientesPersonalizados: [],
      ultimoIdPersonalizado: 0,
      embarque: {
        fecha: '',
        cargaCon: '',
        productos: [],
      },
      nuevoClienteId: '',
      undoStack: [],
      redoStack: [],
      isUndoRedo: false,
      cambios: [],
      producto: {
        reporteTaras: [],
        reporteBolsas: []
      },
      embarqueId: null,
      modoEdicion: false,
      guardadoAutomaticoActivo: false,
      clienteCrudos: {},
      unsubscribe: null,
      medidasSugeridas: [],
      medidasUsadas: [], // Array para almacenar medidas únicas usadas
      mostrarSugerencias: false,
      sugerenciasMedidas: [],
      mostrarModalPrecio: false,
      precioTemp: '',
      itemSeleccionado: null,
      mostrarModalHilos: false,
      hilosTemp: '',
      juntarMedidas: false,
      mostrarModalNota: false,
      notaTemp: '',
      mostrarModalNombreAlternativo: false,
      nombreAlternativoTemp: '',
      productoSeleccionado: null,
      productoEditandoId: null, // Agregar esta nueva propiedad
    };
  },
  clientesJuntarMedidas: {},

  computed: {
    clientesDisponibles() {
      const clienteSet = new Set();
      const clientesPredefinidosUnicos = this.clientesPredefinidos.filter(cliente => {
        if (!clienteSet.has(cliente.nombre)) {
          clienteSet.add(cliente.nombre);
          return true;
        }
        return false;
      });

      const clientesPersonalizadosUnicos = this.clientesPersonalizados.filter(cliente => {
        if (!clienteSet.has(cliente.nombre)) {
          clienteSet.add(cliente.nombre);
          return true;
        }
        return false;
      });

      return [...clientesPredefinidosUnicos, ...clientesPersonalizadosUnicos, { id: 'otro', nombre: 'Otro', key: 'otro' }];
    },
    productosPorCliente() {
      return this.embarque.productos.reduce((acc, producto) => {
        if (!acc[producto.clienteId]) {
          acc[producto.clienteId] = [];
        }
        
        // Solo ordenar si el producto tiene medida y tipo definidos
        acc[producto.clienteId].push(producto);
        
        // Ordenar solo si los productos tienen medida y tipo
        if (!producto.isEditing) {
          acc[producto.clienteId].sort((a, b) => {
            // Solo ordenar si ambos productos tienen medida y tipo
            if (a.medida && a.tipo && b.medida && b.tipo) {
              return this.compararMedidas(b.medida, a.medida);
            }
            // Si alguno no tiene medida o tipo, mantener el orden original
            if (!a.medida || !a.tipo) return 1;
            if (!b.medida || !b.tipo) return -1;
            return 0;
          });
        }
        
        return acc;
      }, {});
    }
  },
  methods: {
    agregarProducto(clienteId) {
      const productoId = Date.now();
      const nuevoProducto = {
        id: productoId,
        clienteId,
        medida: '',
        tipo: '',
        tipoPersonalizado: '',
        taras: [],
        kilos: [],
        reporteTaras: [],
        reporteBolsas: [],
        tarasExtra: [],
        restarTaras: true,
        camaronNeto: 0.65,
        multiplicadorBolsas: 1,
        showSuggestions: false,
        esVenta: false,
        isEditing: true,
        isNew: true,
        noSumarKilos: false // Agregar esta línea
      };
      
      this.embarque.productos.push(nuevoProducto);
      
      if (!this.guardadoAutomaticoActivo && this.embarqueId) {
        this.guardadoAutomaticoActivo = true;
      }
      
      if (this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
      
      this.actualizarMedidasUsadas(); // Actualizar lista de medidas después de agregar

      // Esperar a que el DOM se actualice y enfocar el nuevo input
      this.$nextTick(() => {
        const inputs = document.querySelectorAll('.medida-input');
        const nuevoInput = Array.from(inputs).find(input => {
          const productoId = input.closest('.producto').dataset.productoId;
          return productoId === String(nuevoProducto.id);
        });
        if (nuevoInput) {
          nuevoInput.focus();
        }
      });
    },
    eliminarProducto(producto) {
      const index = this.embarque.productos.indexOf(producto);
      if (index > -1) {
        this.embarque.productos.splice(index, 1);
      }
    },
    async agregarClienteProducto() {
      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      if (this.nuevoClienteId === 'otro') {
        const nuevoNombre = prompt('Ingrese el nombre del nuevo cliente:');
        if (nuevoNombre && nuevoNombre.trim() !== '') {
          this.ultimoIdPersonalizado++;
          const nuevoClienteId = `personalizado_${this.ultimoIdPersonalizado}`;
          const nuevoCliente = {
            id: nuevoClienteId,
            nombre: nuevoNombre.trim(),
            editable: true,
            personalizado: true
          };
          this.clientesPersonalizados.push(nuevoCliente);
          await this.guardarEmbarqueInicial(nuevoClienteId);
        }
      } else if (this.nuevoClienteId) {
        await this.guardarEmbarqueInicial(this.nuevoClienteId);
      }
      this.nuevoClienteId = '';
    },
    async guardarEmbarqueInicial(clienteId) {
      // Si no existe embarqueId, crear nuevo embarque
      if (!this.embarqueId) {
        const db = getFirestore();
        try {
          // Primero crear el embarque
          const embarqueData = this.prepararDatosEmbarque();
          const docRef = await addDoc(collection(db, "embarques"), embarqueData);
          
          // Guardar el ID y activar modo edición
          this.embarqueId = docRef.id;
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;
          
          // Luego agregar el producto
          this.agregarProducto(clienteId);
          
          console.log('Embarque inicial creado con ID:', this.embarqueId);
        } catch (error) {
          console.error("Error al crear el embarque inicial:", error);
          alert('Hubo un error al crear el embarque. Por favor, intente nuevamente.');
        }
      } else {
        // Si ya existe el embarqueId, solo agregar el producto
        this.agregarProducto(clienteId);
      }
    },
    eliminarCliente(clienteId) {
      // Filtrar los productos para eliminar los del cliente seleccionado
      this.embarque.productos = this.embarque.productos.filter(p => p.clienteId !== clienteId);
      
      // Actualizar el estado para reflejar los cambios
      this.$forceUpdate();

      // Opcional: Agregar un mensaje a la lista de cambios
      this.cambios.push(`Cliente ${this.obtenerNombreCliente(clienteId)} eliminado`);
    },
    agregarTara(producto) {
      producto.taras.push(null);
    },
    eliminarTara(producto, index) {
      producto.taras.splice(index, 1);
    },
    agregarKilo(producto) {
      producto.kilos.push(null);
    },
    eliminarKilo(producto, index) {
      producto.kilos.splice(index, 1);
    },
    totalTaras(producto) {
      console.log('Taras normales:', producto.taras);
      console.log('Taras extra:', producto.tarasExtra);
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
      console.log('Total taras:', tarasNormales + tarasExtra);
      return tarasNormales + tarasExtra;
    },
    totalKilos(producto) {
      console.log('Kilos:', producto.kilos);
      console.log('Restar taras:', producto.restarTaras);
      const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (kilo || 0), 0);
      const sumaTarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
      // No incluimos las taras extra en el descuento
      const descuentoTaras = producto.restarTaras ? sumaTarasNormales * 3 : 0;
      const resultado = Number((sumaKilos - descuentoTaras).toFixed(1));
      console.log('Total kilos:', resultado);
      return resultado;
    },
    obtenerNombreCliente(clienteId) {
      const clienteEnLista = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      if (clienteEnLista) {
        return clienteEnLista.nombre;
      }
      // Buscar en los productos por si el cliente ya no está en la lista
      const productoConCliente = this.embarque.productos.find(p => p.clienteId.toString() === clienteId.toString());
      return productoConCliente ? productoConCliente.nombreCliente : 'Cliente Desconocido';
    },
    editarNombreCliente(clienteId) {
      const cliente = this.clientesDisponibles.find(c => c.id === clienteId);
      if (cliente && cliente.editable) {
        const nuevoNombre = prompt('Ingrese el nuevo nombre del cliente:', cliente.nombre);
        if (nuevoNombre !== null && nuevoNombre.trim() !== '') {
          cliente.nombre = nuevoNombre.trim();
          // Actualizar el nombre en los productos existentes
          this.embarque.productos.forEach(producto => {
            if (producto.clienteId === clienteId) {
              producto.nombreCliente = nuevoNombre.trim();
            }
          });
        }
      }
    },
    async cargarEmbarque(id) {
      console.log('Cargando embarque con ID:', id);
      if (id === 'nuevo') {
        this.resetearEmbarque();
        return;
      }

      const db = getFirestore();
      const embarqueRef = doc(db, "embarques", id);

      this.unsubscribe = onSnapshot(embarqueRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log('Datos del embarque cargado:', data);
          
          // Cargar el estado de juntar medidas
          if (data.clientesJuntarMedidas) {
            this.clientesJuntarMedidas = data.clientesJuntarMedidas;
          } else {
            // Si no existe, inicializar con valores por defecto
            this.clientesJuntarMedidas = {};
            data.clientes.forEach(cliente => {
              this.$set(this.clientesJuntarMedidas, cliente.id, false);
            });
          }

          let fecha;
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fecha = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fecha = data.fecha;
          } else if (typeof data.fecha === 'string') {
            fecha = new Date(data.fecha);
          } else {
            console.warn('Formato de fecha no reconocido, usando la fecha actual');
            fecha = new Date();
          }

          // Crear un Map con los clientes predefinidos
          const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id, c]));

          // Filtrar y mapear clientes
          this.clientesPersonalizados = data.clientes
            .filter(cliente => !clientesPredefinidosMap.has(cliente.id))
            .map(cliente => ({
              id: cliente.id,
              nombre: cliente.nombre,
              editable: true,
              personalizado: true,
              key: `personalizado_${cliente.id}`
            }));

          console.log('Clientes personalizados después de filtrar:', this.clientesPersonalizados);

          this.embarque = {
            fecha: fecha.toISOString().split('T')[0],
            cargaCon: data.cargaCon || '', // Cargamos el valor de cargaCon
            productos: data.clientes.flatMap(cliente => {
              const clienteInfo = clientesPredefinidosMap.get(cliente.id) || cliente;
              return cliente.productos.map(producto => ({
                ...producto,
                clienteId: cliente.id,
                nombreCliente: clienteInfo.nombre,
                restarTaras: producto.restarTaras || false,
              }));
            }),
            // Agregar los kilos crudos
            kilosCrudos: data.kilosCrudos || {}
          };

          // Cargar los crudos
          this.clienteCrudos = {};
          data.clientes.forEach(cliente => {
            if (cliente.crudos && cliente.crudos.length > 0) {
              this.$set(this.clienteCrudos, cliente.id, cliente.crudos);
            }
          });

          console.log('Embarque procesado:', this.embarque);
          console.log('Crudos cargados:', this.clienteCrudos);
          
          this.embarqueId = id;
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;
        } else {
          console.error("No se encontró el embarque");
          this.resetearEmbarque();
        }
      }, (error) => {
        console.error("Error al escuchar cambios del embarque:", error);
      });
    },
    resetearEmbarque() {
      this.embarque = {
        fecha: '',
        cargaCon: '',
        productos: [],
      };
      this.clientesJuntarMedidas = {};
      this.embarqueId = null;
      this.modoEdicion = false;
      this.guardadoAutomaticoActivo = false;
    },
    guardarCambiosEnTiempoReal: debounce(function() {
      if (!this.guardadoAutomaticoActivo || !this.embarqueId || this.mostrarModalPrecio) return;

      const embarqueData = {
        ...this.prepararDatosEmbarque(),
        clientesJuntarMedidas: this.clientesJuntarMedidas
      };

      const db = getFirestore();
      
      updateDoc(doc(db, "embarques", this.embarqueId), embarqueData)
        .then(() => {
          console.log('Cambios guardados automáticamente:', new Date().toLocaleString());
          this.$emit('guardado-automatico');
        })
        .catch((error) => {
          console.error("Error al guardar automáticamente:", error);
        });
    }, 300), // Reducimos aún más el tiempo de debounce

    async guardarEmbarque() {
      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      const embarqueData = this.prepararDatosEmbarque();
      const db = getFirestore();

      try {
        if (this.modoEdicion) {
          await updateDoc(doc(db, "embarques", this.embarqueId), embarqueData);
          alert('Embarque actualizado exitosamente.');
        } else {
          const docRef = await addDoc(collection(db, "embarques"), embarqueData);
          this.embarqueId = docRef.id;
          alert('Embarque creado exitosamente y guardado en la base de datos.');
          this.modoEdicion = true;
        }
        this.guardadoAutomaticoActivo = true;
        this.$router.push('/lista-embarques');
      } catch (error) {
        console.error("Error al guardar el embarque: ", error);
        alert('Hubo un error al guardar el embarque. Por favor, intente nuevamente.');
      }
    },
    prepararDatosEmbarque() {
      const embarqueData = {
        fecha: new Date(this.embarque.fecha),
        cargaCon: this.embarque.cargaCon,
        clientes: [],
        clientesJuntarMedidas: this.clientesJuntarMedidas
      };

      const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id, c]));

      Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
        const clientePredefinido = clientesPredefinidosMap.get(parseInt(clienteId));
        const clienteData = {
          id: clienteId,
          nombre: clientePredefinido ? clientePredefinido.nombre : this.obtenerNombreCliente(clienteId),
          productos: productos.map(producto => ({
            ...producto,
            restarTaras: producto.restarTaras || false,
            noSumarKilos: producto.noSumarKilos || false // Agregar esta línea
          })),
          crudos: this.clienteCrudos[clienteId] || []
        };
        embarqueData.clientes.push(clienteData);
      });

      return embarqueData;
    },
    onTipoChange(producto) {
      if (producto.tipo !== 'otro') {
        producto.tipoPersonalizado = '';
      }
      if (producto.tipo === 'c/h20' && !producto.camaronNeto) {
        producto.camaronNeto = 0.65;
      }
      
      // Marcar temporalmente como editando para evitar ordenamiento inmediato
      producto.isEditing = true;
      this.$nextTick(() => {
        // Después de un breve retraso, permitir el ordenamiento
        setTimeout(() => {
          if (producto.medida && producto.tipo) {
            producto.isEditing = false;
          }
        }, 100);
      });
    },
    undo() {
      if (this.undoStack.length > 1) { // Asegura que haya al menos un estado previo
        // Obtener el estado actual y moverlo al redoStack
        const estadoActual = this.undoStack.pop();
        this.redoStack.push(estadoActual);
        // Obtener el estado anterior del undoStack
        const estadoAnterior = this.undoStack[this.undoStack.length - 1];
        this.isUndoRedo = true; // Indicar que se está realizando una operación de Undo
        this.embarque = JSON.parse(estadoAnterior);
        console.log('Undo realizado. Estado actual restaurado.');
      } else {
        console.log('No hay más acciones para deshacer.');
      }
    },
    redo() {
      if (this.redoStack.length > 0) {
        // Obtener el último estado del redoStack
        const estadoRehacer = this.redoStack.pop();
        this.undoStack.push(estadoRehacer);
        this.isUndoRedo = true; // Indicar que se está realizando una operación de Redo
        this.embarque = JSON.parse(estadoRehacer);
        console.log('Redo realizado. Estado actual restaurado.');
      } else {
        console.log('No hay más acciones para rehacer.');
      }
    },
    agregarReporteTara(producto) {
      if (!Array.isArray(producto.reporteTaras)) {
        producto.reporteTaras = [];
      }
      producto.reporteTaras.push('');
    },
    eliminarReporteTara(producto, index) {
      producto.reporteTaras.splice(index, 1);
    },
    agregarReporteBolsa(producto) {
      if (!Array.isArray(producto.reporteBolsas)) {
        producto.reporteBolsas = [];
      }
      producto.reporteBolsas.push('');
    },
    eliminarReporteBolsa(producto, index) {
      producto.reporteBolsas.splice(index, 1);
    },
    obtenerTipoProducto(producto) {
      if (producto.tipo === 'otro') {
        return producto.tipoPersonalizado || 'Otro';
      }
      return producto.tipo || 'Sin Tipo';
    },
    
    async initPdfMake() {
      if (!window.pdfMake) {
        const pdfMake = await import('pdfmake/build/pdfmake');
        const pdfFonts = await import('pdfmake/build/vfs_fonts');
        pdfMake.default.vfs = pdfFonts.default.pdfMake.vfs;
        window.pdfMake = pdfMake.default;
      }
      return window.pdfMake;
    },

    async generarResumenPDF() {
      try {
        const pdfMake = await this.initPdfMake();
        const docDefinition = {
          pageOrientation: 'portrait',
          pageMargins: [2, 2, 2, 2],
          content: [],
          styles: {
            header: {
              fontSize: 19,
              bold: true,
              margin: [0, 0, 0, 5]
            },
            clienteHeader: {
              fontSize: 18, // Aumentado de 15
              bold: true,
              color: 'white',
            },
            tableHeader: {
              fontSize: 16, // Aumentado de 13
              bold: true,
              color: 'white',
              fillColor: '#34495e'
            },
            crudosHeader: {
              fontSize: 16, // Aumentado de 13
              bold: true,
              color: 'white',
              fillColor: '#2980b9'
            },
            total: {
              fontSize: 18, // Aumentado de 14
              bold: true,
              color: 'white'
            }
          }
        };
        const fechaEmbarque = new Date(this.embarque.fecha + 'T00:00:00');

        // Título y fecha
        docDefinition.content.push(
      { text: 'Resumen de Embarque', style: 'header' },
      {
        text: `Fecha: ${fechaEmbarque.toLocaleDateString()} | Carga: ${this.embarque.cargaCon || 'N/E'}`,
        fontSize: 16,
        margin: [0, 0, 0, 10]
      }
    );


        // Altura disponible en la página (A4 = 842pt en portrait)
        const alturaDisponible = 842 - 80; // Reducimos el espacio reservado para el header
        let alturaUsada = 80; // Altura inicial usada por el header
        let contenidoActual = [];

        // Generar contenido para cada cliente
        Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
          const alturaCliente = this.calcularAlturaCliente(productos, this.clienteCrudos[clienteId] || []);
          
          // Agregar un margen de tolerancia del 10% para el cálculo
          if (alturaUsada + alturaCliente > alturaDisponible * 1.2) {
            if (contenidoActual.length > 0) {
              docDefinition.content.push(...contenidoActual);
            }
            docDefinition.content.push({ text: '', pageBreak: 'before' });
            contenidoActual = [];
            alturaUsada = 0;
          }

          const contenidoCliente = this.generarContenidoCliente(clienteId, productos, this.clienteCrudos[clienteId] || [], this.getClienteColor(clienteId));
          contenidoActual.push(...contenidoCliente);
          alturaUsada += alturaCliente;
        });

        // Agregar el contenido restante
        if (contenidoActual.length > 0) {
          docDefinition.content.push(...contenidoActual);
        }

        // Agregar el pie de página una sola vez al final del documento
       

        // Generar el PDF
        pdfMake.createPdf(docDefinition).download('resumen-embarque.pdf');
      } catch (error) {
        console.error('Error al generar PDF:', error);
      }
    },

    calcularAlturaCliente(productos, crudos) {
      // Altura base para el header del cliente (reducida)
      let altura = 40;

      // Altura para la tabla de productos
      if (productos.length > 0) {
        altura += 30; // Header de la tabla
        altura += productos.length * 25; // Cada fila de producto
      }

      // Altura para la tabla de crudos
      if (crudos.length > 0) {
        altura += 30; // Header de la tabla
        altura += crudos.reduce((total, crudo) => {
          return total + (crudo.items.length * 25); // Cada fila de crudo
        }, 0);
      }

      // Margen entre clientes
      altura += 20;

      return altura;
    },

    generarContenidoCliente(clienteId, productos, crudos, colorCliente) {
      const nombreCliente = this.obtenerNombreCliente(clienteId);
      const totalTarasCliente = productos.reduce((sum, p) => sum + this.totalTaras(p), 0);
      const totalKilosCliente = productos.reduce((sum, p) => sum + this.totalKilos(p), 0);
      
      // Calcular totales de crudos
      const crudosTotalKilos = crudos.reduce((sum, crudo) => {
        return sum + crudo.items.reduce((itemSum, item) => {
          return itemSum + this.calcularKilosCrudos(item);
        }, 0);
      }, 0);

      const crudosTotalTaras = crudos.reduce((sum, crudo) => {
        return sum + crudo.items.reduce((itemSum, item) => {
          return itemSum + this.calcularTarasCrudos(item);
        }, 0);
      }, 0);

      // Formatear el total de kilos para eliminar decimales innecesarios
      const totalKilosFormateado = (totalKilosCliente + crudosTotalKilos).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      });

      const contenido = [{
        table: {
          widths: ['*', 200],
          body: [[
            {
              text: nombreCliente,
              style: 'clienteHeader',
              fillColor: colorCliente
            },
            {
              text: `Total: ${totalTarasCliente + crudosTotalTaras}T | ${totalKilosFormateado}Kg`,
              style: 'total',
              fillColor: colorCliente,
              alignment: 'right'
            }
          ]]
        },
        margin: [0, 10, 0, 0]
      }];

      // Verificar si hay crudos para determinar el layout
      const hayCrudos = crudos && crudos.length > 0 && crudos.some(crudo => crudo.items && crudo.items.length > 0);

      // Si hay productos, crear la tabla de productos
      if (productos.length > 0) {
        const tablaProductos = {
          table: {
            headerRows: 1,
            widths: hayCrudos ? [190, 50, 85] : [200, 80, 120],
            body: [
              [
                { text: 'Medida', style: 'tableHeader', fontSize: 20 },
                { text: 'Kg', style: 'tableHeader', fontSize: 20 },
                { text: 'Taras', style: 'tableHeader', fontSize: 20 }
              ],
              ...productos.map(producto => {
                // Formatear los kilos para el producto
                const kilos = producto.tipo === 'c/h20' ? 
                  this.calcularKilosProductoCH20(producto) : 
                  this.totalKilos(producto);
                
                const kilosFormateados = kilos.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1
                });

                // Construir el texto de la medida con el precio
                const medidaTexto = [
                  { text: producto.medida || '', fontSize: 18 }
                ];

                // Agregar el tipo si existe
                if (producto.tipo === 'c/h20') {
                  medidaTexto.push(
                    { text: ' c/h20', color: '#3498db', fontSize: 18 },
                    { text: ` (${producto.camaronNeto || 0.65})`, color: '#3498db', fontSize: 18 }
                  );
                } else if (producto.tipo === 'otro') {
                  medidaTexto.push({ text: ` ${producto.tipoPersonalizado}`, fontSize: 18 });
                } else if (producto.tipo) {
                  medidaTexto.push({ text: ` ${producto.tipo}`, fontSize: 18 });
                }

                // Agregar el precio si existe
                if (producto.precio) {
                  medidaTexto.push({ text: ` $${producto.precio}`, color: '#27ae60', fontSize: 18 });
                }

                return [
                  { 
                    text: medidaTexto,
                    fontSize: 18 
                  },
                  { 
                    text: kilosFormateados, 
                    fontSize: 18 
                  },
                  { 
                    text: `${this.totalTaras(producto)}-${this.generarDetallesProductoCompacto(producto)}`, 
                    fontSize: 18 
                  }
                ];
              })
            ]
          },
          margin: [0, 5, hayCrudos ? 5 : 0, 10]
        };

        if (hayCrudos) {
          // Si hay crudos, usar el layout de columnas
          contenido.push({
            columns: [
              {
                width: '*',
                stack: [tablaProductos]
              },
              {
                width: '*',
                stack: [{
                  table: {
                    headerRows: 1,
                    widths: [45, 55, 25, 40],
                    body: [
                      [
                        { text: 'Talla', style: 'crudosHeader', fontSize: 20 },
                        { text: 'Barco', style: 'crudosHeader', fontSize: 20 },
                        { text: 'T', style: 'crudosHeader', fontSize: 20 },
                        { text: 'Kg', style: 'crudosHeader', fontSize: 20 }
                      ],
                      ...crudos.flatMap(crudo =>
                        crudo.items.map(item => [
                          { 
                            text: [
                              { text: this.formatearTallaCrudo(item.talla), fontSize: 18 },
                              item.precio ? { text: `\n$${item.precio}`, color: '#27ae60', fontSize: 18 } : ''
                            ],
                            fontSize: 18 
                          },
                          { text: item.barco, fontSize: 18 },
                          { text: this.calcularTarasCrudos(item), fontSize: 18 },
                          { text: this.calcularKilosCrudos(item).toFixed(0), fontSize: 18 }
                        ])
                      )
                    ]
                  },
                  margin: [5, 5, 0, 10]
                }]
              }
            ]
          });
        } else {
          // Si no hay crudos, agregar solo la tabla de productos a todo el ancho
          contenido.push(tablaProductos);
        }
      }

      return contenido;
    },

    // Método auxiliar para generar detalles compactos
    generarDetallesProductoCompacto(producto) {
      let detalles = [];
      
      if (producto.reporteTaras && producto.reporteTaras.length > 0) {
        const reporteCombinado = this.combinarTarasBolsasCompacto(producto.reporteTaras, producto.reporteBolsas);
        if (reporteCombinado) detalles.push(reporteCombinado);
      }
      
      if (producto.esVenta) {
        detalles.push('V');
      }
      
      return detalles.join('|');
    },

    // Nuevo método para combinar taras y bolsas de forma más compacta
    combinarTarasBolsasCompacto(taras, bolsas) {
      const combinado = {};
      
      taras.forEach((tara, index) => {
        const bolsa = bolsas[index] || '';
        const key = bolsa;
        combinado[key] = (combinado[key] || 0) + parseInt(tara || 1);
      });

      return Object.entries(combinado)
        .map(([bolsa, count]) => `(${count}-${bolsa})`) // Agregamos los paréntesis aquí
        .join(' ');
    },

    // Método auxiliar para generar detalles del producto
    generarDetallesProducto(producto) {
      let detalles = [];
      
      if (producto.reporteTaras && producto.reporteTaras.length > 0) {
        const reporteCombinado = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
        if (reporteCombinado) detalles.push(reporteCombinado);
      }
      
      if (producto.tipo === 'c/h20') {
        detalles.push(`Neto: ${producto.camaronNeto || 0.65}`);
      }
      
      if (producto.esVenta) {
        detalles.push('(Venta)');
      }
      
      return detalles.join(' | ');
    },

    // Método auxiliar para convertir color hex a RGB
    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    },
    getClienteColor(clienteId) {
      const cliente = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      if (cliente && (cliente.personalizado || clienteId.toString().startsWith('personalizado_'))) {
        return '#95a5a6'; // Color gris para clientes personalizados
      }
      const colores = {
        '1': '#3498db', // Joselito
        '2': '#e74c3c', // Catarro
        '3': '#f1c40f', // Otilio
        '4': '#2ecc71'  // Ozuna
      };
      return colores[clienteId] || '#95a5a6'; // Color por defecto
    },
    volverAEmbarquesMenu() {
      // Navegar de vuelta al menú de embarques
      this.$router.push({ name: 'EmbarquesMenu' });
    },
    combinarTarasBolsas(taras, bolsas) {
      const combinado = {};
      
      taras.forEach((tara, index) => {
        const bolsa = bolsas[index] || '';
        const key = bolsa;
        combinado[key] = (combinado[key] || 0) + parseInt(tara || 1);
      });

      return Object.entries(combinado)
        .map(([bolsa, count]) => `(${count}-${bolsa})`)
        .join(' ');
    },
    totalTarasReportadas(producto) {
      return (producto.reporteTaras || []).reduce((total, tara) => {
        return total + (parseInt(tara) || 0);
      }, 0);
    },

    coincideTaras(producto) {
      const totalReportadas = this.totalTarasReportadas(producto);
      const totalRegistradas = this.totalTaras(producto);
      return totalReportadas === totalRegistradas;
    },
    agregarTaraExtra(producto) {
      if (!Array.isArray(producto.tarasExtra)) {
        this.$set(producto, 'tarasExtra', []);
      }
      producto.tarasExtra.push(null);
    },
    eliminarTaraExtra(producto, index) {
      producto.tarasExtra.splice(index, 1);
    },
    agregarCrudo(clienteId) {
      if (!this.clienteCrudos[clienteId]) {
        this.$set(this.clienteCrudos, clienteId, []);
      }
      this.clienteCrudos[clienteId].push({
        items: [{ talla: '', barco: '', taras: null }]
      });
      this.guardarCambiosEnTiempoReal();
    },
    agregarCrudoItem(clienteId, index) {
      if (!this.clienteCrudos[clienteId]) {
        this.$set(this.clienteCrudos, clienteId, []);
      }
      if (!this.clienteCrudos[clienteId][index]) {
        this.$set(this.clienteCrudos[clienteId], index, { items: [] });
      }
      this.clienteCrudos[clienteId][index].items.push({
        talla: '',
        barco: '',
        taras: null,
        sobrante: null,
        mostrarSobrante: false
      });
      this.guardarCambiosEnTiempoReal();
    },
    eliminarCrudoItem(clienteId, crudoIndex, itemIndex) {
      this.clienteCrudos[clienteId][crudoIndex].items.splice(itemIndex, 1);
      if (this.clienteCrudos[clienteId][crudoIndex].items.length === 0) {
        this.eliminarCrudo(clienteId, crudoIndex);
      }
      this.guardarCambiosEnTiempoReal();
    },
    eliminarCrudo(clienteId, index) {
      this.clienteCrudos[clienteId].splice(index, 1);
      if (this.clienteCrudos[clienteId].length === 0) {
        this.$delete(this.clienteCrudos, clienteId);
      }
      this.guardarCambiosEnTiempoReal();
    },
    toggleSobrante(clienteId, crudoIndex, itemIndex) {
      const item = this.clienteCrudos[clienteId][crudoIndex].items[itemIndex];
      if (!item.hasOwnProperty('mostrarSobrante')) {
        this.$set(item, 'mostrarSobrante', true);
      } else {
        item.mostrarSobrante = !item.mostrarSobrante;
      }
      this.guardarCambiosEnTiempoReal();
    },
    calcularTotalCrudos(crudo) {
      return crudo.items.reduce((total, item) => {
        let taras = this.extraerNumero(item.taras);
        let sobrante = this.extraerNumero(item.sobrante);
        return total + taras + sobrante;
      }, 0);
    },

    extraerNumero(valor) {
      if (!valor) return 0;
      const match = valor.toString().match(/^(\d+)/);
      return match ? parseInt(match[1]) : 0;
    },
    actualizarTotalCrudos(clienteId, index) {
      // Forzar la actualización del componente
      this.$forceUpdate();
      this.guardarCambiosEnTiempoReal();
    },
    actualizarCrudos() {
      this.guardarCambiosEnTiempoReal();
    },
    calcularKilosCrudos(item) {
      let kilosTotales = 0;
      if (item.taras) {
        const [cantidad, medida] = item.taras.split('-').map(Number);
        kilosTotales += cantidad * medida;
      }
      if (item.sobrante) {
        const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
        kilosTotales += cantidadSobrante * medidaSobrante;
      }
      return kilosTotales;
    },
    calcularTarasCrudos(item) {
      let totalTaras = 0;
      if (item.taras) {
        const [cantidad] = item.taras.split('-').map(Number);
        totalTaras += cantidad;
      }
      if (item.sobrante) {
        const [cantidadSobrante] = item.sobrante.split('-').map(Number);
        totalTaras += cantidadSobrante;
      }
      return totalTaras;
    },
    generarNotaVenta(clienteId) {
      const clienteProductos = this.productosPorCliente[clienteId];
      const clienteCrudos = this.clienteCrudos[clienteId];
      
      // Crear una copia del embarque con todos los datos necesarios
      const embarqueCliente = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: clienteProductos,
        clienteCrudos: { [clienteId]: clienteCrudos },
        kilosCrudos: this.embarque.kilosCrudos || {}
      };

      // Pasar el objeto clientesJuntarMedidas completo
      generarNotaVentaPDF(embarqueCliente, this.clientesDisponibles, this.clientesJuntarMedidas);
    },
    onRestarTarasChange(producto) {
      console.log('Restar taras cambiado:', producto.restarTaras);
      this.$nextTick(() => {
        this.actualizarProducto(producto);
      });
    },

    actualizarProducto(producto) {
      const index = this.embarque.productos.findIndex(p => p === producto);
      if (index !== -1) {
        this.$set(this.embarque.productos, index, { ...producto });
      }
      this.guardarCambiosEnTiempoReal();
    },
    reporteExcedeTresParentesis(producto) {
      const reporte = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
      return (reporte.match(/\(/g) || []).length > 3;
    },

    generarReporteExtenso(producto) {
      const reporte = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
      return reporte.replace(/\) /g, ')\n');
    },

    calcularTarasLimpio() {
      return this.embarque.productos.reduce((total, producto) => {
        // Verificar si el cliente es uno de los predefinidos
        const clienteId = producto.clienteId;
        const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId.toString());
        
        // Solo sumar si es un cliente predefinido
        if (clientePredefinido) {
          return total + this.totalTaras(producto);
        }
        return total;
      }, 0);
    },

    calcularTarasCrudo() {
      return Object.entries(this.clienteCrudos).reduce((total, [clienteId, crudos]) => {
        // Verificar si el cliente es uno de los predefinidos
        const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId.toString());
        
        // Solo sumar si es un cliente predefinido
        if (clientePredefinido) {
          return total + crudos.reduce((clienteTotal, crudo) => {
            return clienteTotal + this.calcularTotalCrudos(crudo);
          }, 0);
        }
        return total;
      }, 0);
    },

    calcularTotalTaras() {
      return this.calcularTarasLimpio() + this.calcularTarasCrudo();
    },

    calcularKilosLimpio() {
      return this.embarque.productos.reduce((total, producto) => {
        if (producto.tipo === 'c/h20') {
          // Para productos c/h20, calcular la suma de (taras * bolsa) para cada grupo
          const reporteTaras = producto.reporteTaras || [];
          const reporteBolsas = producto.reporteBolsas || [];
          let sumaTotalKilos = 0;

          for (let i = 0; i < reporteTaras.length; i++) {
            const taras = parseInt(reporteTaras[i]) || 0;
            const bolsa = parseInt(reporteBolsas[i]) || 0;
            sumaTotalKilos += taras * bolsa;
          }

          // Multiplicar por el valor neto (0.65 por defecto)
          const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
          return total + kilosReales;
        } else {
          // Para otros productos, mantener el clculo original
          return total + this.totalKilos(producto);
        }
      }, 0).toFixed(2);
    },

    obtenerUltimaBolsa(producto) {
      const bolsas = producto.reporteBolsas || [];
      // Obtener el último valor válido de bolsa
      for (let i = bolsas.length - 1; i >= 0; i--) {
        const valor = parseInt(bolsas[i]);
        if (!isNaN(valor)) {
          return valor;
        }
      }
      return 0;
    },

    totalBolsasReportadas(producto) {
      return (producto.reporteBolsas || []).reduce((total, bolsa) => {
        return total + (parseInt(bolsa) || 0);
      }, 0);
    },

    calcularKilosCrudo() {
      return Object.values(this.clienteCrudos).reduce((total, crudos) => {
        return total + crudos.reduce((clienteTotal, crudo) => {
          return clienteTotal + crudo.items.reduce((itemTotal, item) => {
            return itemTotal + parseFloat(this.calcularKilosCrudos(item));
          }, 0);
        }, 0);
      }, 0);
    },

    calcularTotalKilos() {
      const kilosLimpio = parseFloat(this.calcularKilosLimpio());
      const kilosCrudo = parseFloat(this.calcularKilosCrudo());
      return (kilosLimpio + kilosCrudo).toFixed(2);
    },

    calcularTotalBolsas: function(producto) {
      let total = 0;
      for (let i = 0; i < producto.reporteTaras.length; i++) {
        const tara = parseInt(producto.reporteTaras[i]) || 0;
        const bolsa = parseInt(producto.reporteBolsas[i]) || 0;
        total += tara * bolsa;
      }
      return total;
    },

    formatearTallaCrudo(talla) {
      const abreviaturas = {
        'Med c/c': 'Med',
        'Med-Esp c/c': 'Esp',
        'Med-gde c/c': 'M-G',
        'Gde c/c': 'Gde',
        'Extra c/c': 'Ext',
        'Jumbo c/c': 'Jbo',
        'Linea': 'Lin',
        'Rechazo': 'Rch'
      };
      return abreviaturas[talla] || talla;
    },
    abrirModalPrecio(item) {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.itemSeleccionado = item;
      this.precioTemp = item.precio || '';
      this.mostrarModalPrecio = true;
      this.$nextTick(() => {
        this.$refs.precioInput?.focus();
      });
    },
    cerrarModalPrecio() {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.mostrarModalPrecio = false;
      this.itemSeleccionado = null;
      this.precioTemp = '';
    },
    guardarPrecio() {
      event?.preventDefault();
      event?.stopPropagation();
      
      if (this.itemSeleccionado) {
        const precio = parseFloat(this.precioTemp);
        if (!isNaN(precio)) {
          this.$set(this.itemSeleccionado, 'precio', precio);
          const guardadoActivo = this.guardadoAutomaticoActivo;
          this.guardadoAutomaticoActivo = false;
          
          this.$nextTick(() => {
            this.guardadoAutomaticoActivo = guardadoActivo;
            this.guardarCambiosEnTiempoReal();
          });
        }
      }
      this.cerrarModalPrecio();
    },
    abrirModalHilos(item) {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.itemSeleccionado = item;
      // Si hilos no existe o es undefined, establecer como string vacío
      this.hilosTemp = item.hilos || '';
      this.mostrarModalHilos = true;
      this.$nextTick(() => {
        this.$refs.hilosInput?.focus();
      });
    },
    cerrarModalHilos() {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.mostrarModalHilos = false;
      this.itemSeleccionado = null;
      this.hilosTemp = '';
    },
    guardarHilos() {
      event?.preventDefault();
      event?.stopPropagation();
      
      if (this.itemSeleccionado) {
        const hilos = this.hilosTemp.trim();
        // Si hilos está vacío, eliminamos la propiedad hilos del item
        if (!hilos) {
          this.$delete(this.itemSeleccionado, 'hilos');
        } else {
          this.$set(this.itemSeleccionado, 'hilos', hilos);
        }
        
        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;
        
        this.$nextTick(() => {
          this.guardadoAutomaticoActivo = guardadoActivo;
          this.guardarCambiosEnTiempoReal();
        });
      }
      this.cerrarModalHilos();
    },
    generarNotaVentaPDF() {
      const embarqueCliente = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: this.embarque.productos,
        clienteCrudos: this.clienteCrudos,
        kilosCrudos: this.embarque.kilosCrudos || {}
      };

      // Pasar el objeto clientesJuntarMedidas completo
      generarNotaVentaPDF(embarqueCliente, this.clientesDisponibles, this.clientesJuntarMedidas);
    },
    handleJuntarMedidasChange(clienteId, checked) {
      // Actualizar el estado local
      this.$set(this.clientesJuntarMedidas, clienteId, checked);
      
      // Guardar inmediatamente si estamos en modo edición
      if (this.modoEdicion && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },
    guardarCambiosEnTiempoReal: debounce(function() {
      if (!this.guardadoAutomaticoActivo || !this.embarqueId || this.mostrarModalPrecio) return;

      const embarqueData = {
        ...this.prepararDatosEmbarque(),
        clientesJuntarMedidas: this.clientesJuntarMedidas
      };

      const db = getFirestore();
      
      updateDoc(doc(db, "embarques", this.embarqueId), embarqueData)
        .then(() => {
          console.log('Cambios guardados automáticamente:', new Date().toLocaleString());
          this.$emit('guardado-automatico');
        })
        .catch((error) => {
          console.error("Error al guardar automáticamente:", error);
        });
    }, 300),
    abrirModalNota(item) {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.itemSeleccionado = item;
      this.notaTemp = item.nota || '';
      this.mostrarModalNota = true;
      this.$nextTick(() => {
        this.$refs.notaInput?.focus();
      });
    },

    cerrarModalNota() {
      event?.preventDefault();
      event?.stopPropagation();
      
      this.mostrarModalNota = false;
      this.itemSeleccionado = null;
      this.notaTemp = '';
    },

    guardarNota() {
      event?.preventDefault();
      event?.stopPropagation();
      
      if (this.itemSeleccionado) {
        const nota = this.notaTemp.trim();
        if (nota) {
          this.$set(this.itemSeleccionado, 'nota', nota);
        } else {
          this.$delete(this.itemSeleccionado, 'nota');
        }
        
        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;
        
        this.$nextTick(() => {
          this.guardadoAutomaticoActivo = guardadoActivo;
          this.guardarCambiosEnTiempoReal();
        });
      }
      this.cerrarModalNota();
    },
    // Agregar este nuevo método para calcular kilos de productos c/h20
    calcularKilosProductoCH20(producto) {
      const reporteTaras = producto.reporteTaras || [];
      const reporteBolsas = producto.reporteBolsas || [];
      let sumaTotalKilos = 0;

      for (let i = 0; i < reporteTaras.length; i++) {
        const taras = parseInt(reporteTaras[i]) || 0;
        const bolsa = parseInt(reporteBolsas[i]) || 0;
        sumaTotalKilos += taras * bolsa;
      }

      // Retornar la suma total sin multiplicar por camaronNeto
      return sumaTotalKilos;
    },
    // Agregar esta nueva función para comparar medidas
    compararMedidas(medidaA, medidaB) {
      // Si alguna medida es vacía o undefined, ponerla al final
      if (!medidaA) return 1;
      if (!medidaB) return -1;

      // Función auxiliar para extraer números de una medida
      const extraerNumeros = (medida) => {
        const numeros = medida.match(/\d+/g);
        if (!numeros) return [0, 0];
        if (numeros.length === 1) return [parseInt(numeros[0]), parseInt(numeros[0])];
        return [parseInt(numeros[0]), parseInt(numeros[1])];
      };

      // Extraer los números de las medidas
      const [minA, maxA] = extraerNumeros(medidaA);
      const [minB, maxB] = extraerNumeros(medidaB);

      // Si ambas medidas tienen números, comparar por el número menor
      if (minA && minB) {
        return minA - minB;
      }

      // Si no tienen números, comparar alfabéticamente
      return medidaA.localeCompare(medidaB);
    },
    generarResumenTarasPDF() {
      const embarqueData = {
        fecha: this.embarque.fecha,
        productos: this.embarque.productos,
        clienteCrudos: this.clienteCrudos
      };
      generarResumenTarasPDF(embarqueData, this.clientesDisponibles);
    },
    onMedidaInput(producto, event) {
      const valor = event.target.value.trim().toLowerCase();
      this.productoEditandoId = producto.id; // Guardar el ID del producto actual
      
      if (valor) {
        this.sugerenciasMedidas = this.medidasUsadas.filter(m => 
          m.toLowerCase().includes(valor) && 
          m.toLowerCase() !== valor
        );
      } else {
        this.sugerenciasMedidas = [];
      }
      producto.isEditing = true;
    },

    onMedidaBlur(producto) {
      // Dar un pequeño delay antes de ocultar las sugerencias para permitir clicks
      setTimeout(() => {
        this.productoEditandoId = null;
      }, 200);
      
      // Solo quitar la marca de edición si tiene tanto medida como tipo
      if (producto.medida && producto.tipo) {
        producto.isEditing = false;
        producto.isNew = false;
      }
    },

    abrirModalNombreAlternativo(producto) {
      this.productoSeleccionado = producto;
      this.nombreAlternativoTemp = producto.nombreAlternativoPDF || producto.medida;
      this.mostrarModalNombreAlternativo = true;
      this.$nextTick(() => {
        this.$refs.nombreAlternativoInput?.focus();
      });
    },

    cerrarModalNombreAlternativo() {
      this.mostrarModalNombreAlternativo = false;
      this.productoSeleccionado = null;
      this.nombreAlternativoTemp = '';
    },

    guardarNombreAlternativo() {
      if (this.productoSeleccionado) {
        if (this.nombreAlternativoTemp.trim()) {
          this.$set(this.productoSeleccionado, 'nombreAlternativoPDF', this.nombreAlternativoTemp.trim());
        } else {
          this.$delete(this.productoSeleccionado, 'nombreAlternativoPDF');
        }
        
        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;
        
        this.$nextTick(() => {
          this.guardadoAutomaticoActivo = guardadoActivo;
          this.guardarCambiosEnTiempoReal();
        });
      }
      this.cerrarModalNombreAlternativo();
    },

    // Agregar estos nuevos métodos
    coincideTarasYBolsas(producto) {
      const totalTarasRegistradas = this.totalTaras(producto);
      const totalTarasReportadas = this.totalTarasReportadas(producto);
      
      // Si no hay taras registradas ni reportadas, retornar false
      if (totalTarasRegistradas === 0 && totalTarasReportadas === 0) {
        return false;
      }
      
      return totalTarasRegistradas === totalTarasReportadas;
    },

    tieneAlgunReporte(producto) {
      return (producto.reporteTaras || []).some(tara => tara) || 
             (producto.reporteBolsas || []).some(bolsa => bolsa);
    },

    calcularTotalLimpioCliente(clienteId) {
      const productos = this.productosPorCliente[clienteId] || [];
      return productos.reduce((total, producto) => total + this.totalTaras(producto), 0);
    },

    calcularKilosLimpioCliente(clienteId) {
      const productos = this.productosPorCliente[clienteId] || [];
      return productos.reduce((total, producto) => {
        if (producto.tipo === 'c/h20') {
          const reporteTaras = producto.reporteTaras || [];
          const reporteBolsas = producto.reporteBolsas || [];
          let sumaTotalKilos = 0;

          for (let i = 0; i < reporteTaras.length; i++) {
            const taras = parseInt(reporteTaras[i]) || 0;
            const bolsa = parseInt(reporteBolsas[i]) || 0;
            sumaTotalKilos += taras * bolsa;
          }

          return total + (sumaTotalKilos * (producto.camaronNeto || 0.65));
        } else {
          return total + this.totalKilos(producto);
        }
      }, 0);
    },

    calcularTotalCrudoCliente(clienteId) {
      const crudos = this.clienteCrudos[clienteId] || [];
      return crudos.reduce((total, crudo) => {
        return total + crudo.items.reduce((itemTotal, item) => {
          return itemTotal + this.calcularTarasCrudos(item);
        }, 0);
      }, 0);
    },

    calcularKilosCrudoCliente(clienteId) {
      const crudos = this.clienteCrudos[clienteId] || [];
      return crudos.reduce((total, crudo) => {
        return total + crudo.items.reduce((itemTotal, item) => {
          return itemTotal + this.calcularKilosCrudos(item);
        }, 0);
      }, 0);
    },

    formatearKilos(kilos) {
      return kilos.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      });
    },

    // Agregar este nuevo método
    actualizarMedidasUsadas() {
      // Obtener todas las medidas únicas del embarque actual
      const medidas = this.embarque.productos
        .map(p => p.medida)
        .filter(m => m && m.trim()) // Filtrar valores vacíos
        .filter((m, i, arr) => arr.indexOf(m) === i); // Eliminar duplicados
      this.medidasUsadas = medidas;
    },

    // Método para seleccionar una sugerencia
    seleccionarMedida(producto, medida) {
      producto.medida = medida;
      this.productoEditandoId = null;
      this.actualizarProducto(producto);
    },
  },
  created() {
    const embarqueId = this.$route.params.id;
    this.cargarEmbarque(embarqueId);
    this.undoStack.push(JSON.stringify(this.embarque));
    console.log('Component mounted. Estado inicial cargado.');
    this.actualizarMedidasUsadas();
  },
  watch: {
    embarque: {
      handler(nuevoValor) {
        if (this.isUndoRedo) {
          this.isUndoRedo = false;
          return;
        }
        localStorage.setItem('embarque', JSON.stringify(nuevoValor));
        this.undoStack.push(JSON.stringify(nuevoValor));
        this.redoStack = [];
        console.log('Embarque actualizado. Estado agregado al undoStack.');
        
        // Llamar al método de guardado automático
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    },
    clienteCrudos: {
      handler() {
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    },
    'embarque.productos': {
      handler(newProductos) {
        newProductos.forEach(producto => {
          console.log('Producto actualizado:', producto.restarTaras);
        });
      },
      deep: true
    }
  },
  mounted() {
    // Agregar este evento para actualizar los crudos cuando se modifiquen los inputs
    this.$nextTick(() => {
      const crudosInputs = document.querySelectorAll('.crudo input, .crudo select');
      crudosInputs.forEach(input => {
        input.addEventListener('input', this.actualizarCrudos);
      });
    });
  },
  beforeDestroy() {
    // Cancelar la suscripción a los cambios en tiempo real
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    // Remover los event listeners cuando el componente se destruye
    const crudosInputs = document.querySelectorAll('.crudo input, .crudo select');
    crudosInputs.forEach(input => {
      input.removeEventListener('input', this.actualizarCrudos);
    });
  },
  updated() {
    console.log('Componente actualizado');
    this.embarque.productos.forEach(producto => {
      console.log('Estado de restarTaras:', producto.restarTaras);
    });
  }
};

// Definir la clase fuera del componente Vue
class EmbarqueReportGenerator {
  constructor(embarqueData) {
    this.embarque = embarqueData;
    this.doc = new jsPDF('landscape', 'pt', 'a4');
  }

  async save() {
    const doc = this.doc;
    
    // Configurar fuente y tamaño
    doc.setFont('helvetica');
    doc.setFontSize(13);

    // Título
    doc.text('Resumen de Embarque', 40, 40);
    doc.text(`Fecha: ${this.embarque.fecha || 'No especificada'}`, 40, 60);
    if (this.embarque.cargaCon) {
      doc.text(`Carga con: ${this.embarque.cargaCon}`, 40, 80);
    }

    // Crear tablas para cada cliente
    let yPos = 100;
    
    // Verificar que clientes existe y es un array
    if (Array.isArray(this.embarque.clientes)) {
      this.embarque.clientes.forEach(cliente => {
        if (!cliente) return; // Skip if cliente is null/undefined

        // Encabezado del cliente
        doc.setFontSize(14);
        doc.text(`Cliente: ${cliente.nombre || 'Sin nombre'}`, 40, yPos);
        yPos += 20;

        // Tabla de productos
        if (Array.isArray(cliente.productos) && cliente.productos.length > 0) {
          const tableData = cliente.productos.map(producto => [
            producto.medida || '',
            producto.tipo || '',
            this.calcularTotalTaras(producto),
            this.calcularTotalKilos(producto)
          ]);

          doc.autoTable({
            startY: yPos,
            head: [[
              { text: 'Medida', style: 'tableHeader' },
              { text: 'Tipo', style: 'tableHeader' },
              { text: 'Total Taras', style: 'tableHeader' },
              { text: 'Total Kilos', style: 'tableHeader' }
            ]],
            body: tableData,
            styles: {
              fontSize: 14,  // Incrementado de 12
              cellPadding: 8,
              overflow: 'linebreak',
              valign: 'middle'
            },
            headStyles: {
              fillColor: '#34495e',
              textColor: '#ffffff',
              halign: 'center',
              fontSize: 15,  // Incrementado de 13
              fontStyle: 'bold'
            },
            bodyStyles: {
              fontSize: 14,  // Incrementado de 12
              fillColor: false,
              textColor: '#2c3e50'
            },
            margin: { left: 40 }
          });

          yPos = doc.lastAutoTable.finalY + 20;
        }

        // Tabla de crudos
        if (Array.isArray(cliente.crudos) && cliente.crudos.length > 0) {
          const crudosData = cliente.crudos.flatMap(crudo => 
            (crudo.items || []).map(item => [
              item.talla || '',
              item.barco || '',
              item.taras || '',
              item.sobrante || ''
            ])
          );

          if (crudosData.length > 0) {
            doc.text('Crudos:', 40, yPos);
            yPos += 20;

            doc.autoTable({
              startY: yPos,
              head: [[
                { text: 'Talla', style: 'tableHeader' },
                { text: 'Barco', style: 'tableHeader' },
                { text: 'Taras', style: 'tableHeader' },
                { text: 'Sobrante', style: 'tableHeader' }
              ]],
              body: crudosData,
              styles: {
                fontSize: 14,  // Incrementado de 12
                cellPadding: 8
              },
              headStyles: {
                fillColor: '#2980b9',
                textColor: '#ffffff',
                halign: 'center',
                fontSize: 15,  // Incrementado de 13
                fontStyle: 'bold'
              },
              bodyStyles: {
                fontSize: 14,  // Incrementado de 12
                fillColor: false,
                textColor: '#2c3e50'
              },
              margin: { left: 40 }
            });

            yPos = doc.lastAutoTable.finalY + 20;
          }
        }

        yPos += 20; // Espacio entre clientes
      });
    }

    // Retornar el PDF como array buffer
    return doc.output('arraybuffer');
  }

  calcularTotalTaras(producto) {
    const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
    const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
    return tarasNormales + tarasExtra;
  }

  calcularTotalKilos(producto) {
    const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (kilo || 0), 0);
    const sumaTaras = this.calcularTotalTaras(producto);
    const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
    return Number((sumaKilos - descuentoTaras).toFixed(1));
  }
}
</script>

<style scoped>


.cliente-header-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.juntar-medidas-checkbox {
  display: flex;
  align-items: center;
  gap: 5px;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 5px 10px;
  border-radius: 4px;
}

.juntar-medidas-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.juntar-medidas-checkbox label {
  color: white;
  margin: 0;
  cursor: pointer;
  user-select: none;
}


.resumen-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.resumen-columna {
  flex: 1 1 48%;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .resumen-columna {
    flex: 1 1 100%;
  }
}

.resumen-columna {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  flex: 1;
  min-width: 250px;
}



.nuevo-embarque-container {
  position: relative;
  min-height: 100vh;
}

.nuevo-embarque {
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  min-height: 100vh;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.fecha-selector {
  display: flex;
  flex-direction: column;
}

.fecha-selector label {
  margin-bottom: 5px;
  font-weight: bold;
}

.botones-undo-redo {
  display: flex;
  gap: 10px;
}

.botones-undo-redo button {
  flex: 1;
  padding: 12px;
  font-size: 1rem;
  border-radius: 5px;
}

.botones-undo-redo button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.cliente-grupo {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.cliente-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px 15px;
  border-radius: 10px;
}

.cliente-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
}

.cliente-header[data-cliente="Joselito"] {
  background-color: #3498db;
}

.cliente-header[data-cliente="Catarro"] {
  background-color: #e74c3c;
}

.cliente-header[data-cliente="Otilio"] {
  background-color: #f1c40f;
}

.cliente-header[data-cliente="Ozuna"] {
  background-color: #2ecc71;
}

.cliente-header[data-cliente="Joselito"] h3,
.cliente-header[data-cliente="Catarro"] h3,
.cliente-header[data-cliente="Otilio"] h3,
.cliente-header[data-cliente="Ozuna"] h3 {
  color: #ffffff;
}

.cliente-header[data-cliente="Otro"] {
  background-color: #95a5a6;
}

.cliente-header[data-cliente="Otro"] h3 {
  color: #ffffff;
}

.eliminar-cliente {
  padding: 8px 12px;
  font-size: 0.9rem;
}

.productos-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.producto {
  flex: 0 0 calc(50% - 10px); /* Dos productos por fila en escritorio */
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1rem;
  border: 3px solid #dc3545; /* Contorno para la medida */
  transition: border-color 0.3s ease;
}

.producto:hover, .crudo:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.producto-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 15px;
}

.medida-input-container {
  display: flex;
  gap: 8px;
  width: 100%;
}

.medida-input {
  flex: 1;
  min-width: 120px;
  padding: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  border: 2px solid #007bff;
  border-radius: 5px;
  background-color: #eceef1;
}

.tipo-select {
  flex: 1;
  min-width: 120px;
  font-weight: bold;
  border: 2px solid #28a745;
  border-radius: 5px;
  background-color: #e8f5e9;
  transition: border-color 0.3s, background-color 0.3s;
  padding: 8px;
  font-size: 1.1rem;
}

.tipo-select.tipo-azul {
  background-color: #d0e7ff;
  border-color: #0056b3;
}

.tipo-select.tipo-verde {
  background-color: #e8f5e9;
  border-color: #28a745;
}

.tipo-select:focus {
  outline: none;
  border-color: #0056b3;
  background-color: #d0e7ff;
}

.tipo-input {
  flex: 2;
  min-width: 120px;
  max-width: 200px;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.eliminar-producto {
  padding: 8px 12px;
  font-size: 0.9rem;
  background-color: #dc3545;
  border: none;
  border-radius: 5px;
  color: #fff;
}

.sumas-verticales {
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 100%;
}

.columna {
  flex: 1;
  min-width: 0;
}

.columna h5 {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #333;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tara-input, .kilo-input, .reporte-input {
  flex: 1;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.input-group button {
  padding: 8px 12px;
  font-size: 1rem;
  border: none;
  border-radius: 5px;
}

.agregar-tara, .agregar-kilo, .agregar-producto {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border-radius: 5px;
}

.agregar-tara, .agregar-kilo {
  background-color: #28a745;
  color: #fff;
}

.agregar-tara:hover, .agregar-kilo:hover {
  background-color: #218838;
}

.agregar-producto {
  background-color: #007bff;
  color: #fff;
}

.agregar-producto:hover {
  background-color: #0056b3;
}

.total {
  font-weight: bold;
  margin-top: 10px;
  border-top: 2px solid #ddd;
  padding-top: 5px;
  color: #333;
}

.reporte-taras-bolsas {
  display: flex;
  flex-direction: row; /* Cambiar a row para que estén en la misma fila */
  gap: 15px;
  width: 100%;
  margin-bottom: 20px;
}

.reporte-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.reporte-item h5 {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #333;
}

.reporte-input {
  flex: 1;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.cambios {
  background-color: #fff;
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-top: 30px;
}

.cambios h4 {
  margin-bottom: 10px;
  color: #333;
}

.cambios ul {
  list-style-type: disc;
  padding-left: 20px;
  color: #555;
}

.cliente-selector {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.cliente-selector .btn-block {
  width: 100%;
}

.crear-embarque {
  background-color: #28a745;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
}

.crear-embarque:hover {
  background-color: #218838;
}

.btn {
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #007bff;
  border: none;
  color: #fff;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  border: none;
  color: #fff;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-danger {
  background-color: #dc3545;
  border: none;
  color: #fff;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-success {
  background-color: #28a745;
  border: none;
  color: #fff;
}

.btn-success:hover {
  background-color: #218838;
}

/* Media Queries para Responsividad en iPad */
@media (min-width: 768px) and (max-width: 1024px) {
  .productos-container {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
  }

  .producto {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }

  .reporte-taras-bolsas {
    flex-direction: row;
  }

  .reporte-item {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }
}

/* Media Queries para Dispositivos Móviles */
@media (max-width: 767px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .botones-undo-redo {
    width: 100%;
    gap: 10px;
  }

  .productos-container {
    flex-direction: column;
  }

  .producto {
    width: 100%;
  }

  .sumas-verticales {
    flex-direction: row;
    gap: 10px;
  }

  .reporte-taras-bolsas {
    flex-direction: row; /* Mantener en fila incluso en móvil */
    gap: 10px;
  }

  .reporte-item {
    flex: 1;
    min-width: 0; /* Permitir que los items se reduzcan */
  }

  .reporte-input {
    width: 100%;
    min-width: 0;
    font-size: 14px; /* Reducir tamaño de fuente para mejor ajuste */
  }

  .reporte-item h5 {
    font-size: 1rem; /* Reducir tamaño del título */
    margin-bottom: 8px;
  }

  .input-group {
    margin-bottom: 5px; /* Reducir espacio entre inputs */
  }

  .input-group button {
    padding: 4px 8px; /* Reducir padding de botones */
    font-size: 12px;
  }

  .total-taras-reporte,
  .total-bolsas-reporte {
    font-size: 0.9rem; /* Reducir tamaño del texto del total */
    padding: 3px;
  }

  .cliente-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .eliminar-cliente, .eliminar-producto {
    width: 100%;
    text-align: center;
  }

  .agregar-tara, .agregar-kilo, .agregar-producto, .crear-embarque {
    font-size: 1rem;
    padding: 12px;
  }
}

/* Añadir esta media query al final de la sección <style> */

@media (min-width: 1025px) {
  .productos-container {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
  }

  .producto {
    flex: 0 0 calc(25% - 15px); /* Cuatro por fila con espacio */
    max-width: calc(25% - 15px);
  }

  .reporte-taras-bolsas {
    flex-direction: row;
  }

  .reporte-item {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }
}

.crudo-header {
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 15px;
  color: #007bff
}

.encabezado-medida {
  display: flex;
  align-items: flex-start; /* Cambiado a flex-start para mejor alineación con las dos filas */
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 15px;
  gap: 8px;
}

/* Opcional: Ajustes para dispositivos móviles */
@media (max-width: 767px) {
  .encabezado-medida {
    font-size: 1.2rem;
  }
}

.generar-pdf {
  background-color: #17a2b8;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
  margin-top: 20px;
  margin-bottom: 20px;
}

.generar-pdf:hover {
  background-color: #138496;
}

.btn-secondary {
  margin-right: 10px;
}

.btn-volver {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  margin-bottom: 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  text-decoration: none;
  transition: background-color 0.3s ease;
  cursor: pointer;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-volver i {
  margin-right: 10px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.checkbox-container input[type="checkbox"] {
  margin-right: 5px;
  width: 15px; /* Aumentamos el ancho */
  height: 15px; /* Aumentamos la altura */
  cursor: pointer; /* Añadimos cursor pointer para mejor interactividad */
}

.checkbox-container label {
  font-size: 0.9rem;
  color: #555;
  cursor: pointer; /* Añadimos cursor pointer también a la etiqueta */
}

.taras-header {
  display: flex;
  justify-content: center;
  align-items: center;
}

.total-taras-reporte {
  margin-top: 10px;
  font-weight: bold;
  padding: 5px;
  border-radius: 5px;
}

.total-taras-reporte.coincide {
  background-color: #d4edda;
  color: #155724;
}

.total-taras-reporte.no-coincide {
  background-color: #f8d7da;
  color: #721c24;
}

.agregar-tara-extra {
  background-color: #ffa500;
  color: #fff;
  margin-top: 1px; /* Ajuste del margen superior a 1px */
}

.agregar-tara-extra:hover {
  background-color: #ff8c00;
}

.tara-extra-input {
  border-color: #ffa500;
  border-width: 2px;
}

.tara-extra-input:focus {
  border-color: #ff8c00;
  box-shadow: 0 0 0 0.2rem rgba(255, 165, 0, 0.25);
}

.botones-tara {
  display: flex;
  gap: 5px;
  margin-top: auto; /* Empuja los botones hacia abajo */
  height: 38px; /* Altura fija para los botones */
}

.agregar-tara,
.agregar-tara-extra,
.agregar-kilo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px; /* Altura fija para todos los botones */
  font-size: 0.9rem;
  padding: 0 10px;
}

.agregar-tara,
.agregar-tara-extra {
  flex: 1;
}

.total-bolsas {
  margin-top: 10px;
  font-weight: bold;
  color: #28a745;
}

.agregar-kilo {
  width: 100%;
  margin-top: 10px;
  align-self: flex-end; /* Alinea el botón al final de la columna */
}

.cliente-header[data-cliente] {
  cursor: pointer;
}

/* Estilo para clientes personalizados */
.cliente-header[data-cliente] {
  background-color: #95a5a6; /* Color gris por defecto */
}

/* Estilos específicos para clientes predefinidos */
.cliente-header[data-cliente="Joselito"] {
  background-color: #3498db;
}

.cliente-header[data-cliente="Catarro"] {
  background-color: #e74c3c;
}

.cliente-header[data-cliente="Otilio"] {
  background-color: #f1c40f;
}

.cliente-header[data-cliente="Ozuna"] {
  background-color: #2ecc71;
}

/* Asegurar que el texto sea blanco para todos los encabezados de cliente */
.cliente-header[data-cliente] h3 {
  color: #ffffff;
}

.botones-agregar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.agregar-crudo {
  background-color: #17a2b8;
  color: white;
}

.agregar-crudo:hover {
  background-color: #138496;
}

.crudos-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
}

.crudo {
  background-color: #f8f9fa;
  border: 2px solid #007bff;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 8px;
}

.crudo h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.2rem;
}

.crudo-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.crudo-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.crudo-talla-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.talla-select {
  flex: 2;
  min-width: 120px;
}

.barco-input {
  flex: 1;
  min-width: 80px;
}

.taras-input {
  width: 60px; /* Reducir el ancho del input de taras */
  min-width: 60px;
  padding: 4px 8px;
  text-align: center;
}

.btn-precio {
  padding: 2px 6px;
  font-size: 0.8rem;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crudo-taras-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.taras-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.buttons-wrapper {
  display: flex;
  gap: 4px;
}

.eliminar-crudo-item,
.agregar-sobrante {
  padding: 4px 8px;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.precio-tag {
  font-size: 0.8rem;
  color: #28a745;
  font-weight: bold;
  white-space: nowrap;
}

/* Ajustar el layout para mejor uso del espacio */
.crudo-item {
  padding: 8px;
  margin-bottom: 8px;
}

.crudo-items {
  gap: 8px;
}

/* Hacer los inputs más compactos en general */
.form-control {
  padding: 4px 8px;
  height: auto;
  font-size: 0.9rem;
}

.agregar-crudo-item,
.eliminar-crudo {
  width: 100%;
}

.eliminar-crudo-item,
.agregar-sobrante {
  padding: 5px 10px;
  font-size: 14px;
}

.btn-precio {
  padding: 2px 8px;
  margin-right: 10px;
}

.generar-nota {
  margin-right: 10px;
  background-color: #17a2b8;
  color: white;
}

.generar-nota:hover {
  background-color: #138496;
}



.crear-embarque,
.generar-pdf {
  margin-bottom: 10px; /* Añade un pequeño margen inferior a ambos botones */
}

.botones-finales {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.crear-embarque,
.generar-pdf,
.ver-rendimientos {
  flex: 1;
  height: 60px; /* Establece una altura fija para ambos botones */
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 15px;
  line-height: 1.2;
  margin-top: 0px;
  text-decoration: none;
}

.crear-embarque {
  background-color: #28a745;
  color: #fff;
}

.generar-pdf {
  background-color: #17a2b8;
  color: #fff;
}

.ver-rendimientos {
  background-color: #ffc107;
  color: #000;
}

.ver-rendimientos:hover {
  background-color: #e0a800;
  color: #000;
  text-decoration: none;
}

/* Estilos para dispositivos móviles */
@media (max-width: 768px) {
  .botones-finales {
    flex-direction: column;
    gap: 10px;
  }
  
  .crear-embarque,
  .generar-pdf,
  .ver-rendimientos {
    width: 100%;
  }
}

.reporte-extenso {
  margin-top: 10px;
  padding: 5px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 0.9em;
}

/* Nuevos estilos para el input de camarón neto */
.camaron-neto-input {
  width: 70px;
  padding: 8px;
  font-size: 1rem;
  border: 2px solid #0056b3;
  border-radius: 5px;
  background-color: #d0e7ff;
  text-align: center;
  -moz-appearance: textfield; /* Firefox */
}

/* Quitar flechas para Chrome, Safari, Edge, Opera */
.camaron-neto-input::-webkit-outer-spin-button,
.camaron-neto-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.camaron-neto-input:focus {
  outline: none;
  border-color: #003d7a;
  box-shadow: 0 0 0 0.2rem rgba(0, 86, 179, 0.25);
}

@media (max-width: 768px) {
  .camaron-neto-input {
    width: 60px;
    font-size: 0.9rem;
  }
}

.totales-reporte {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.total-taras-reporte,
.total-bolsas-reporte {
  flex: 1;
  font-weight: bold;
  padding: 5px;
  border-radius: 5px;
  text-align: center;
}

.total-taras-reporte.coincide {
  background-color: #d4edda;
  color: #155724;
}

.total-taras-reporte.no-coincide {
  background-color: #f8d7da;
  color: #721c24;
}

.total-bolsas-reporte {
  background-color: #d4edda;
  color: #155724;
  margin-left: 5px;
}

/* Agregar estos nuevos estilos */
.venta-checkbox-container {
  display: flex;
  align-items: center;
  padding: 0 10px;
  background-color: #f8f9fa;
  border-radius: 5px;
  border: 1px solid #dee2e6;
  height: 38px; /* Ajustar altura para que coincida con otros elementos */
}

.venta-checkbox {
  margin-right: 5px;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.venta-checkbox-container label {
  font-size: 0.9rem;
  color: #495057;
  cursor: pointer;
  user-select: none;
  margin-bottom: 0; /* Eliminar margen inferior del label */
}

/* Estilo especial para productos que son venta */
.producto[data-es-venta="true"] {
  border: 3px solid #28a745;
}

/* Estilo para productos que son maquila */
.producto[data-es-venta="false"] {
  border: 3px solid #007bff;
}

.btn-precio {
  padding: 2px 8px;
  font-size: 0.9rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
  transition: all 0.2s;
}

.btn-precio.tiene-precio {
  background-color: #28a745;
  color: white;
  border-color: #28a745;
}

.precio-tag {
  font-size: 0.9rem;
  color: #28a745;
  font-weight: bold;
  margin-left: 8px;
}

/* Agregar o modificar estilos del modal */
.modal-precio {
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

.modal-contenido {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1001;
}

.input-precio {
  display: flex;
  align-items: center;
  margin: 20px 0;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
}

.simbolo-precio {
  font-size: 1.2rem;
  color: #495057;
  margin-right: 8px;
}

.input-precio input {
  border: none;
  outline: none;
  font-size: 1.2rem;
  width: 100%;
  -moz-appearance: textfield;
}

.input-precio input::-webkit-outer-spin-button,
.input-precio input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.modal-botones {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.modal-botones button {
  flex: 1;
  padding: 8px;
}

.talla-header {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

/* Estilos para el botón de Hilos */
.btn-hilos {
  padding: 2px 8px;
  font-size: 0.9rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
  transition: all 0.2s;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-hilos.tiene-hilos {
  background-color: #28a745;
  color: white;
  border-color: #28a745;
}

/* Estilos para el modal de Hilos */
.modal-hilos {
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

.modal-contenido {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1001;
}

.input-hilos {
  display: flex;
  align-items: center;
  margin: 20px 0;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
}

.input-hilos input {
  border: none;
  outline: none;
  font-size: 1.2rem;
  width: 100%;
  -moz-appearance: textfield;
}

.input-hilos input::-webkit-outer-spin-button,
.input-hilos input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.modal-botones {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.modal-botones button {
  flex: 1;
  padding: 8px;
}

/* Agregar estos estilos en la sección <style> */
.botones-encabezado {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: 8px;
}

.botones-fila-superior,
.botones-fila-inferior {
  display: flex;
  gap: 4px;
  align-items: center;
}

.btn-precio,
.btn-hilos,
.btn-nota {
  padding: 2px 8px;
  font-size: 0.9rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kg-radio {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  height: 24px;
}

.encabezado-medida {
  display: flex;
  align-items: flex-start; /* Cambiado a flex-start para mejor alineación con las dos filas */
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 15px;
  gap: 8px;
}

.checkbox-juntar-medidas {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.checkbox-juntar-medidas input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-juntar-medidas label {
  font-size: 0.9rem;
  color: #555;
  cursor: pointer;
}

.generar-resumen-container {
  display: flex;
  align-items: center;
  gap: 15px;
}

.checkbox-juntar-medidas {
  display: flex;
  align-items: center;
  gap: 5px;
}

.checkbox-juntar-medidas input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-juntar-medidas label {
  font-size: 1rem;
  color: #333;
  cursor: pointer;
  user-select: none;
}

.btn-nota {
  padding: 2px 8px;
  font-size: 0.9rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nota.tiene-nota {
  background-color: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

.modal-nota {
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

.input-nota {
  margin: 20px 0;
}

.input-nota textarea {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
}

.input-nota textarea:focus {
  outline: none;
  border-color: #17a2b8;
  box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.25);
}

.resumen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.resumen-titulo {
  margin: 0;
}

.modal-nombre-alternativo {
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

.input-nombre {
  display: flex;
  align-items: center;
  margin: 20px 0;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
}

.input-nombre input {
  border: none;
  outline: none;
  font-size: 1.2rem;
  width: 100%;
}

.medida-texto {
  cursor: pointer;
  transition: color 0.3s;
}

.medida-texto:hover {
  color: #007bff;
  text-decoration: underline;
}

.kg-radio {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 1px;
}

.kg-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.kg-label {
  font-size: 0.9rem;
  color: #555;
  cursor: pointer;
}

/* Agregar estos estilos */
.kg-radio {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  height: 24px;
}

.kg-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  margin: 0;
}

.kg-radio label {
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
  margin: 0;
}

@media (max-width: 768px) {
  .producto-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .medida-autocomplete {
    width: 100%;
  }

  .tipo-select {
    width: 100%;
    margin: 0.5rem 0;
  }

  /* Mantener taras y kilos en la misma fila */
  .sumas-verticales {
    flex-direction: row; /* Mantener dirección horizontal */
    gap: 10px;
    width: 100%;
  }

  .columna {
    flex: 1; /* Distribuir el espacio equitativamente */
    min-width: 0; /* Permitir que las columnas se reduzcan */
  }

  /* Ajustar inputs dentro de las columnas */
  .tara-input, 
  .kilo-input {
    width: 100%;
    min-width: 0;
    font-size: 14px; /* Reducir tamaño de fuente para mejor ajuste */
  }

  /* Ajustar los grupos de input */
  .input-group {
    display: flex;
    gap: 5px;
  }

  .input-group button {
    padding: 8px;
    min-width: 30px;
  }

  /* Ajustar botones de agregar */
  .botones-tara {
    display: flex;
    gap: 5px;
  }

  .agregar-tara,
  .agregar-tara-extra,
  .agregar-kilo {
    padding: 8px;
    font-size: 12px;
    height: auto;
    white-space: nowrap;
  }

  /* Resto de los ajustes responsivos... */
}

.producto.reporte-completo {
  border: 3px solid #28a745 !important; /* Verde para reporte completo */
  box-shadow: 0 0 8px rgba(40, 167, 69, 0.2);
}

.producto.reporte-incompleto {
  border: 3px solid #dc3545 !important; /* Rojo para reporte incompleto */
  box-shadow: 0 0 8px rgba(220, 53, 69, 0.2);
}

/* Mantener el estilo especial para productos que son venta */
.producto[data-es-venta="true"]:not(.reporte-completo):not(.reporte-incompleto) {
  border: 3px solid #28a745;
}

/* Mantener el estilo para productos que son maquila */
.producto[data-es-venta="false"]:not(.reporte-completo):not(.reporte-incompleto) {
  border: 3px solid #007bff;
}

.cliente-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.cliente-totales {
  display: flex;
  gap: 15px;
  color: white;
  font-size: 0.9rem;
}

.cliente-totales span {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 3px 8px;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .cliente-info {
    width: 100%;
  }
  
  .cliente-totales {
    flex-direction: column;
    gap: 5px;
  }
}

.medida-input-container {
  position: relative;
  flex: 2;
}

.sugerencias-container {
  position: absolute;
  top: 100%;
  left: 0;
  width: calc(50% - 4px); /* Ajustar al ancho del input de medida */
  z-index: 1000;
}

.sugerencia-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sugerencia-item:hover {
  background-color: #f5f5f5;
}

/* ... existing styles ... */
</style>

