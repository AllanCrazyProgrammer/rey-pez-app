<template>
  <div class="cuentas-joselito-container">
    <div v-if="isSaving" class="auto-save-indicator">
      <span class="save-dot"></span> Guardando...
    </div>
    <div class="back-button-container">
      <BackButton to="/cuentas-joselito" />
      <PreciosHistorialModal clienteActual="joselito" />
      <StashModalV2 cliente="joselito" />
    </div>
    <h1>Cuentas Joselito</h1>
    

    
    <div class="fecha-actual">
      <div class="fecha-input">
        <input type="date" v-model="fechaSeleccionada">
      </div>
      <div class="fecha-display">
        {{ fechaFormateada }}
      </div>
    </div>
  
    <div class="input-section">
      <h2>Ingresar Datos</h2>
      <div class="input-row">
        <input v-model.number="newItem.kilos" type="number" placeholder="Kilos" inputmode="decimal" pattern="[0-9]*" class="responsive-input">
        <input v-model="newItem.medida" type="text" placeholder="Medida" class="responsive-input">
        <input v-model.number="newItem.costo" type="number" placeholder="Costo" inputmode="decimal" pattern="[0-9]*" class="responsive-input">
        <input v-model.number="newItem.precioVenta" type="number" placeholder="Precio Venta" inputmode="decimal" pattern="[0-9]*" class="responsive-input">
        <button @click="addItem">Agregar</button>
      </div>
    </div>
  
    <div class="tabla-principal-toggle">
      <button
        class="toggle-tabla-btn"
        @click="toggleTablaPrincipal"
        :aria-expanded="mostrarTablaPrincipal"
      >
        {{ mostrarTablaPrincipal ? 'Ocultar tabla' : 'Mostrar tabla' }}
      </button>
    </div>

    <table v-show="mostrarTablaPrincipal" class="tabla-principal">
      <thead>
        <tr>
          <th>Kilos</th>
          <th>Medida</th>
          <th>Costo</th>
          <th>Total</th>
          <th class="desktop-only">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in items" :key="index">
          <td @click="editField(index, 'kilos')" @touchstart="startLongPress(index, 'kilos')" @touchend="endLongPress">
            {{ editingField.index === index && editingField.field === 'kilos' ? '' : formatNumber(item.kilos) }}
            <input
              v-if="editingField.index === index && editingField.field === 'kilos'"
              v-model.number="item.kilos"
              type="number"
              @blur="finishEditing"
              @keyup.enter="finishEditing"
              ref="editInput"
            >
          </td>
          <td @click="editField(index, 'medida')" @touchstart="startLongPress(index, 'medida')" @touchend="endLongPress">
            {{ editingField.index === index && editingField.field === 'medida' ? '' : item.medida }}
            <input
              v-if="editingField.index === index && editingField.field === 'medida'"
              v-model="item.medida"
              type="text"
              @blur="finishEditing"
              @keyup.enter="finishEditing"
              ref="editInput"
            >
          </td>
          <td @click="editField(index, 'costo')" @touchstart="startLongPress(index, 'costo')" @touchend="endLongPress">
            {{ editingField.index === index && editingField.field === 'costo' ? '' : '$' + formatNumber(item.costo) }}
            <input
              v-if="editingField.index === index && editingField.field === 'costo'"
              v-model.number="item.costo"
              type="number"
              @blur="finishEditing"
              @keyup.enter="finishEditing"
              ref="editInput"
            >
          </td>
          <td>${{ formatNumber(item.total) }}</td>
          <td class="action-column desktop-only">
            <button @click="removeItem(index)" class="delete-btn">Eliminar</button>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total">
          <td colspan="3" class="text-right"><strong>Total General Costo:</strong></td>
          <td><strong>${{ formatNumber(totalGeneral) }}</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <h2>Precios de Venta</h2>
    <div class="add-product-button">
      <button @click="showAddProductModal = true">Agregar Producto</button>
    </div>
    <table class="tabla-venta">
      <thead>
        <tr>
          <th>Kilos</th>
          <th>Medida</th>
          <th>Precio</th>
          <th>Total</th>
          <th class="desktop-only">Ganancias</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in itemsVenta" :key="index" @click="toggleGananciasMobile(index)">
          <td @click="editKilos(index)" @touchstart="startLongPress(index)" @touchend="endLongPress">
            {{ editingKilosIndex === index ? '' : formatNumber(item.kilosVenta) }}
            <input
              v-if="editingKilosIndex === index"
              v-model.number="item.kilosVenta"
              type="number"
              @input="actualizarTotalKilos(index)"
              @blur="finishEditingKilos"
              @keyup.enter="finishEditingKilos"
              ref="kilosInput"
            >
          </td>
          <td>{{ item.medida }}</td>
          <td>
            <input 
              :value="item.precioVenta"
              @input="(e) => {
                item.precioVenta = Number(e.target.value);
                actualizarTotalKilos(index);
              }"
              type="number" 
              class="precio-venta-input" 
              inputmode="decimal" 
              pattern="[0-9]*"
              step="0.01"
            >
          </td>
          <td>${{ formatNumber(item.totalVenta) }}</td>
          <td :class="{ 'desktop-only': true, 'ganancia-positiva': item.ganancia > 0, 'ganancia-negativa': item.ganancia < 0 }">
            ${{ formatNumber(item.ganancia) }}
          </td>
        </tr>
        <tr v-if="selectedRowIndex !== null" class="mobile-only ganancia-row">
          <td colspan="4">
            <strong>Ganancias:</strong>
            <span :class="{ 'ganancia-positiva': itemsVenta[selectedRowIndex].ganancia > 0, 'ganancia-negativa': itemsVenta[selectedRowIndex].ganancia < 0 }">
              ${{ formatNumber(itemsVenta[selectedRowIndex].ganancia) }}
            </span>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total">
          <td colspan="3" class="text-right"><strong>Total General Venta:</strong></td>
          <td><strong>${{ formatNumber(totalGeneralVenta) }}</strong></td>
          <td class="desktop-only"><strong>${{ formatNumber(gananciaTotal) }}</strong></td>
        </tr>
      </tfoot>
    </table>

    <div class="ganancia-del-dia">
      <h3>Ganancia del Día</h3>
      <p :class="{ 'ganancia-positiva': gananciaDelDia > 0, 'ganancia-negativa': gananciaDelDia < 0 }">
        ${{ formatNumber(gananciaDelDia) }}
      </p>
    </div>

    <h2>Saldo pendiente</h2>
    <div class="saldo-pendiente">
      <div class="input-row">
        <span>Saldo Acumulado Anterior: ${{ formatNumber(saldoAcumuladoAnterior) }}</span>
      </div>
      <div class="input-row" v-for="(cobro, index) in cobros" :key="index">
        <input v-model="cobro.descripcion" type="text" placeholder="Flete" class="responsive-input">
        <input v-model="cobro.monto" type="number" placeholder="Monto" class="responsive-input">
        <button @click="removeCobro(index)" class="delete-btn">Eliminar</button>
      </div>
      <button @click="addCobro" class="add-btn">Agregar Flete</button>
    </div>

    <h2>Abonos</h2>
    <div class="abonos">
      <div class="input-row" v-for="(abono, index) in abonos" :key="index">
        <input v-model="abono.descripcion" type="text" placeholder="Descripción" class="responsive-input">
        <input v-model.number="abono.monto" type="number" placeholder="Monto" class="responsive-input">
        <button @click="removeAbono(index)" class="delete-btn">Eliminar</button>
      </div>
      <button @click="addAbono" class="add-btn">Agregar Abono</button>
    </div>

    <table class="tabla-saldo">
      <tr>
        <td>Saldo Acumulado Anterior</td>
        <td>${{ formatNumber(saldoAcumuladoAnterior) }}</td>
      </tr>
      <tr>
        <td>Saldo Hoy</td>
        <td>${{ formatNumber(totalGeneralVenta) }}</td>
      </tr>
      <tr v-for="(cobro, index) in cobros" :key="index">
        <td>{{ cobro.descripcion }}</td>
        <td>-${{ formatNumber(cobro.monto) }}</td>
      </tr>
      <tr v-for="(abono, index) in abonos" :key="'abono-'+index">
        <td>{{ abono.descripcion }} (Abono)</td>
        <td>-${{ formatNumber(abono.monto) }}</td>
      </tr>
      <tr class="total">
        <td>Total</td>
        <td>${{ formatNumber(totalDiaActual) }}</td>
      </tr>
      <tr class="total">
        <td>Nuevo Saldo Acumulado</td>
        <td>${{ formatNumber(nuevoSaldoAcumulado) }}</td>
      </tr>
    </table>

    <div class="guardar-container">
      <div class="observacion-container">
        <button @click="agregarObservacion" class="btn-agregar-observacion">
          <i class="fas fa-plus"></i> Agregar observación
        </button>
      </div>
      <!-- Mostrar observación existente -->
      <div v-if="observacion" class="observacion-existente">
        <div class="observacion-header">
          <p class="observacion-titulo">Observación actual:</p>
          <div class="observacion-buttons">
            <button @click="editarObservacion" class="btn-editar">Editar</button>
            <button @click="eliminarObservacion" class="btn-eliminar" title="Eliminar observación">×</button>
          </div>
        </div>
        <p class="observacion-texto">{{ observacion }}</p>
      </div>
      <button @click="guardarCuenta" class="btn-guardar">Guardar</button>
    </div>

    <!-- Modal de Observación -->
    <div v-if="showObservacionModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ observacion ? 'Editar' : 'Agregar' }} Observación</h3>
        <textarea v-model="observacion" placeholder="Escribe tu observación aquí..." rows="4"></textarea>
        <div class="modal-buttons">
          <button @click="guardarObservacion" class="btn-guardar">Guardar</button>
          <button @click="cancelarObservacion" class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modales -->
    <div v-if="showMobileActions" class="mobile-actions-modal">
      <button @click="editItem(selectedItemIndex)" class="edit-btn">Editar</button>
      <button @click="removeItem(selectedItemIndex)" class="delete-btn">Eliminar</button>
      <button @click="cancelMobileActions">Cancelar</button>
    </div>

    <div v-if="showEditModal" class="edit-modal">
      <h3>Editar Item</h3>
      <div class="input-row">
        <input v-model.number="editingItem.kilos" type="number" placeholder="Kilos" inputmode="decimal" pattern="[0-9]*" class="responsive-input">
        <input v-model="editingItem.medida" type="text" placeholder="Medida" class="responsive-input">
        <input v-model.number="editingItem.costo" type="number" placeholder="Costo" inputmode="decimal" pattern="[0-9]*" class="responsive-input">
      </div>
      <div class="button-row">
        <button @click="saveEditedItem">Guardar</button>
        <button @click="cancelEdit">Cancelar</button>
      </div>
    </div>

    <div v-if="showAddProductModal" class="modal">
      <div class="modal-content">
        <h3>Agregar Nuevo Producto</h3>
        <div class="input-row">
          <input v-model.number="newProduct.kilosVenta" type="number" placeholder="Kilos" inputmode="decimal" pattern="[0-9]*" class="responsive-input">
          <input v-model="newProduct.medida" type="text" placeholder="Medida" class="responsive-input">
          <input v-model.number="newProduct.precioVenta" type="number" placeholder="Precio de Venta" inputmode="decimal" pattern="[0-9]*" class="responsive-input">
        </div>
        <div class="button-row">
          <button @click="addNewProduct">Agregar</button>
          <button @click="showAddProductModal = false">Cancelar</button>
        </div>
      </div>
    </div>

    <div :class="['estado-cuenta', estadoCuenta.toLowerCase(), { 'no-pagado': estadoCuenta === 'No Pagado' }]">
      {{ estadoCuenta }}
    </div>

    <!-- Mostrar mensaje de confirmación -->
    <div v-if="showSaveMessage" class="save-message">
      {{ lastSaveMessage }}
    </div>

    <div class="precios-button-container">
      <button @click="consolidarItemsRepetidos" class="consolidar-btn" title="Consolidar medidas repetidas">
        Consolidar Medidas Repetidas
      </button>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModalV2 from '@/components/StashModalV2.vue';
import PreciosClienteButton from '@/components/PreciosClienteButton.vue';
import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';

export default {
  name: 'CuentasJoselito',
  components: {
    BackButton,
    PreciosHistorialModal,
    StashModalV2,
    PreciosClienteButton
  },
  data() {
    return {
      items: [],
      mostrarTablaPrincipal: false,
      newItem: {
        kilos: null,
        medida: '',
        costo: null,
        precioVenta: null
      },
      saldoAcumuladoAnterior: 0,
      cobros: [],
      abonos: [],
      fechaSeleccionada: this.obtenerFechaActual(),
      showMobileActions: false,
      selectedItemIndex: null,
      presionTimer: null,
      itemsVenta: [],
      showEditModal: false,
      editingItem: null,
      editingIndex: null,
      estadoPagado: false,
      editingKilosIndex: null,
      longPressTimer: null,
      editingField: {
        index: null,
        field: null
      },
      selectedRowIndex: null,
      showAddProductModal: false,
      newProduct: {
        kilosVenta: null,
        medida: '',
        precioVenta: null
      },
      autoSaveTimer: null,
      lastSavedData: null,
      saveQueue: [],
      isSaving: false,
      lastSaveTime: null,
      saveMinInterval: 5000,
      selectedField: null,
      tieneObservacion: false,
      showObservacionModal: false,
      observacion: '',
      debounceTimers: {},
      lastSaveMessage: '',
      showSaveMessage: false,
      saveMessageTimer: null,
    }
  },
  computed: {
    fechaFormateada() {
      const fecha = new Date(this.fechaSeleccionada + 'T00:00:00');
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    totalGeneral() {
      return this.items.reduce((sum, item) => sum + (item.total || 0), 0);
    },
    totalGeneralVenta() {
      return this.itemsVenta.reduce((sum, item) => sum + (item.totalVenta || 0), 0);
    },
    totalSaldo() {
      const totalCobros = this.cobros.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
      const totalAbonos = this.abonos.reduce((sum, abono) => sum + (abono.monto || 0), 0);
      return this.saldoAcumuladoAnterior + this.totalGeneralVenta + totalCobros - totalAbonos;
    },
    nuevoSaldoAcumulado() {
      return (this.saldoAcumuladoAnterior || 0) + (this.totalDiaActual || 0);
    },
    gananciaDelDia() {
      const costoTotal = this.items.reduce((sum, item) => sum + (item.total || 0), 0);
      return (this.totalGeneralVenta || 0) - (costoTotal || 0);
    },
    saldoPendiente() {
      return this.totalGeneralVenta - this.abonos.reduce((sum, abono) => sum + (abono.monto || 0), 0);
    },
    estadoCuenta() {
      return this.totalDiaActual <= 0 ? 'Pagado' : 'No Pagado';
    },
    gananciaTotal() {
      return this.itemsVenta.reduce((sum, item) => sum + (item.ganancia || 0), 0);
    },
    totalDiaActual() {
      const totalCobros = this.cobros.reduce((sum, cobro) => 
        sum + (parseFloat(cobro.monto) || 0), 0);
      const totalAbonos = this.abonos.reduce((sum, abono) => 
        sum + (parseFloat(abono.monto) || 0), 0);
      return (this.totalGeneralVenta || 0) - totalCobros - totalAbonos;
    }
  },
  methods: {
    obtenerFechaActual() {
      const fecha = new Date();
      return fecha.getFullYear() + '-' + 
             String(fecha.getMonth() + 1).padStart(2, '0') + '-' + 
             String(fecha.getDate()).padStart(2, '0');
    },
    toggleTablaPrincipal() {
      this.mostrarTablaPrincipal = !this.mostrarTablaPrincipal;
    },
    formatNumber(value) {
      if (value === null || value === undefined) {
        return '0.00';
      }
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    },
    // Método para normalizar medidas y hacer comparaciones consistentes
    normalizarMedida(medida) {
      if (!medida) return '';
      
      // Convertir a minúsculas y eliminar espacios al inicio y final
      let medidaNormalizada = medida.toLowerCase().trim();
      
      // Eliminar todos los espacios en blanco
      medidaNormalizada = medidaNormalizada.replace(/\s+/g, '');
      
      // Normalizar formatos comunes de medidas
      // Por ejemplo, "51/60" y "51-60" deberían considerarse iguales
      medidaNormalizada = medidaNormalizada.replace(/-/g, '/');
      
      // Normalizar "c/c", "cc", "conc" a "c/c"
      medidaNormalizada = medidaNormalizada.replace(/c\/c|cc|conc/g, 'c/c');
      
      // Normalizar "s/c", "sc", "sinc" a "s/c"
      medidaNormalizada = medidaNormalizada.replace(/s\/c|sc|sinc/g, 's/c');
      
      // Normalizar "med" o "medium" a "med"
      medidaNormalizada = medidaNormalizada.replace(/^medium$|^med$/g, 'med');
      
      // Normalizar "gde" o "grande" a "gde"
      medidaNormalizada = medidaNormalizada.replace(/^grande$|^gde$/g, 'gde');
      
      // Normalizar "esp" o "especial" a "esp"
      medidaNormalizada = medidaNormalizada.replace(/^especial$|^esp$/g, 'esp');
      
      console.log(`Medida original: "${medida}" -> Normalizada: "${medidaNormalizada}"`);
      
      return medidaNormalizada;
    },
    async loadExistingCuenta(id) {
      try {
        const cuentaRef = doc(db, 'cuentasJoselito', id);
        const cuentaDoc = await getDoc(cuentaRef);
        
        if (cuentaDoc.exists()) {
          const data = cuentaDoc.data();
          
          // Cargar los items primero
          this.items = (data.items || []).map(item => ({
            kilos: Number(item.kilos) || 0,
            medida: item.medida || '',
            costo: Number(item.costo) || 0,
            total: Number(item.total) || 0
          }));

          // Cargar los itemsVenta sin recalcular
          this.itemsVenta = (data.itemsVenta || []).map(item => ({
            kilosVenta: Number(item.kilosVenta) || 0,
            medida: item.medida || '',
            precioVenta: Number(item.precioVenta) || 0,
            totalVenta: Number(item.totalVenta) || 0,
            ganancia: Number(item.ganancia) || 0
          }));

          // Recalcular los kilos de la tabla de venta para productos con formato "5-19"
          this.items.forEach((item, index) => {
            if (index < this.itemsVenta.length) {
              const medidaLower = item.medida.toLowerCase().trim();
              const formatoGuion = /^(\d+)-(\d+)$/.exec(medidaLower);
              if (formatoGuion) {
                const cajas = parseInt(formatoGuion[1]) || 0;
                const kilosPorCaja = parseInt(formatoGuion[2]) || 0;
                
                // Si el segundo número es 19, recalcular usando 20 para la tabla de venta
                if (kilosPorCaja === 19) {
                  const kilosVenta = cajas * 20;
                  this.itemsVenta[index].kilosVenta = kilosVenta;
                  this.itemsVenta[index].totalVenta = kilosVenta * this.itemsVenta[index].precioVenta;
                  this.itemsVenta[index].ganancia = this.itemsVenta[index].totalVenta - item.total;
                }
              }
            }
          });

          // Consolidar ítems con la misma medida
          this.consolidarItemsRepetidos();

          // Cargar el resto de datos
          this.saldoAcumuladoAnterior = Number(data.saldoAcumuladoAnterior) || 0;
          this.cobros = (data.cobros || []).map(cobro => ({
            descripcion: cobro.descripcion || '',
            monto: Number(cobro.monto) || 0
          }));
          this.abonos = (data.abonos || []).map(abono => ({
            descripcion: abono.descripcion || '',
            monto: Number(abono.monto) || 0
          }));
          this.fechaSeleccionada = data.fecha || this.obtenerFechaActual();
          
          // Cargar observaciones sin abrir el modal
          this.showObservacionModal = false; // Asegurar que el modal esté cerrado
          this.tieneObservacion = data.tieneObservacion || false;
          this.observacion = data.observacion || '';
        } else {
          throw new Error("No se encontró la cuenta especificada");
        }
      } catch (error) {
        console.error("Error al cargar la cuenta existente:", error);
        throw error;
      }
    },

    // Método para consolidar ítems con la misma medida
    consolidarItemsRepetidos() {
      // Guardar la cantidad original de ítems para comparar después
      const itemsOriginalCount = this.items.length;
      const itemsVentaOriginalCount = this.itemsVenta.length;
      
      // Crear mapas para agrupar por medida normalizada
      const itemsMap = new Map();
      const itemsVentaMap = new Map();
      
      // Procesar items de costo
      this.items.forEach(item => {
        const medidaNormalizada = this.normalizarMedida(item.medida);
        
        if (itemsMap.has(medidaNormalizada)) {
          // Si ya existe, sumar los kilos
          const itemExistente = itemsMap.get(medidaNormalizada);
          itemExistente.kilos += item.kilos;
          // Usar el costo más reciente
          itemExistente.costo = item.costo;
          // Recalcular total
          itemExistente.total = itemExistente.kilos * itemExistente.costo;
        } else {
          // Si no existe, agregar al mapa
          itemsMap.set(medidaNormalizada, { ...item });
        }
      });
      
      // Procesar items de venta
      this.itemsVenta.forEach(item => {
        const medidaNormalizada = this.normalizarMedida(item.medida);
        
        if (itemsVentaMap.has(medidaNormalizada)) {
          // Si ya existe, sumar los kilos
          const itemExistente = itemsVentaMap.get(medidaNormalizada);
          itemExistente.kilosVenta += item.kilosVenta;
          // Usar el precio más reciente
          itemExistente.precioVenta = item.precioVenta;
          // Recalcular total y ganancia
          itemExistente.totalVenta = itemExistente.kilosVenta * itemExistente.precioVenta;
        } else {
          // Si no existe, agregar al mapa
          itemsVentaMap.set(medidaNormalizada, { ...item });
        }
      });
      
      // Actualizar los arrays con los ítems consolidados
      this.items = Array.from(itemsMap.values());
      this.itemsVenta = Array.from(itemsVentaMap.values());
      
      // Recalcular las ganancias basadas en los costos
      this.items.forEach((item, index) => {
        if (index < this.itemsVenta.length) {
          const medidaNormalizada = this.normalizarMedida(item.medida);
          const itemVenta = this.itemsVenta.find(iv => this.normalizarMedida(iv.medida) === medidaNormalizada);
          
          if (itemVenta) {
            // Verificar si es un formato "5-19" y ajustar los kilos de venta
            const medidaLower = item.medida.toLowerCase().trim();
            const formatoGuion = /^(\d+)-(\d+)$/.exec(medidaLower);
            if (formatoGuion) {
              const cajas = parseInt(formatoGuion[1]) || 0;
              const kilosPorCaja = parseInt(formatoGuion[2]) || 0;
              
              // Si el segundo número es 19, recalcular usando 20 para la tabla de venta
              if (kilosPorCaja === 19) {
                const kilosVenta = cajas * 20;
                itemVenta.kilosVenta = kilosVenta;
                itemVenta.totalVenta = kilosVenta * itemVenta.precioVenta;
              }
            }
            
            // Recalcular la ganancia
            itemVenta.ganancia = itemVenta.totalVenta - item.total;
          }
        }
      });
      
      // Calcular cuántos ítems se consolidaron
      const itemsConsolidados = itemsOriginalCount - this.items.length;
      const itemsVentaConsolidados = itemsVentaOriginalCount - this.itemsVenta.length;
      
      console.log('Ítems consolidados:', itemsConsolidados, 'ítems de costo,', itemsVentaConsolidados, 'ítems de venta');
      
      // Mostrar mensaje de confirmación
      if (itemsConsolidados > 0 || itemsVentaConsolidados > 0) {
        this.lastSaveMessage = `Se consolidaron ${itemsConsolidados} medidas repetidas en la tabla de costos y ${itemsVentaConsolidados} en la tabla de ventas.`;
        this.showSaveMessage = true;
        
        // Ocultar el mensaje después de 3 segundos
        if (this.saveMessageTimer) {
          clearTimeout(this.saveMessageTimer);
        }
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
        
        // Guardar los cambios automáticamente
        this.handleDataChange();
      } else {
        this.lastSaveMessage = "No se encontraron medidas repetidas para consolidar.";
        this.showSaveMessage = true;
        
        // Ocultar el mensaje después de 3 segundos
        if (this.saveMessageTimer) {
          clearTimeout(this.saveMessageTimer);
        }
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
      }
    },

    async obtenerSaldoAcumuladoAnterior() {
      try {
        const cuentasRef = collection(db, 'cuentasJoselito');
        const q = query(
          cuentasRef,
          where('fecha', '<', this.fechaSeleccionada),
          orderBy('fecha', 'desc'),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const ultimaCuenta = querySnapshot.docs[0].data();
          const totalCobros = (ultimaCuenta.cobros || []).reduce((sum, cobro) => 
            sum + (parseFloat(cobro.monto) || 0), 0);
          const totalAbonos = (ultimaCuenta.abonos || []).reduce((sum, abono) => 
            sum + (parseFloat(abono.monto) || 0), 0);
          
          // Calcular el saldo del día anterior
          const saldoDiaAnterior = (ultimaCuenta.totalGeneralVenta || 0) - totalCobros - totalAbonos;
          
          // Si el saldo del día anterior es negativo o cero, retornamos 0
          if (saldoDiaAnterior <= 0) {
            return 0;
          }
          
          // Si hay un saldo pendiente, sumamos el saldo acumulado anterior más el saldo del día
          const saldoAcumulado = (ultimaCuenta.saldoAcumuladoAnterior || 0) + saldoDiaAnterior;
          
          return saldoAcumulado;
        }
        
        return 0;
      } catch (error) {
        console.error('Error al obtener saldo acumulado anterior:', error);
        return 0;
      }
    },

    async actualizarCuentasPosteriores(fechaActual) {
      try {
        const cuentasRef = collection(db, 'cuentasJoselito');
        const q = query(
          cuentasRef,
          orderBy('fecha', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const todasLasCuentas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Ordenar las cuentas por fecha
        const cuentasOrdenadas = todasLasCuentas.sort((a, b) => 
          new Date(a.fecha) - new Date(b.fecha)
        );

        let saldoAcumulado = 0;
        const batch = writeBatch(db);

        // Procesar cada cuenta en orden cronológico
        for (let i = 0; i < cuentasOrdenadas.length; i++) {
          const cuenta = cuentasOrdenadas[i];
          const cuentaRef = doc(db, 'cuentasJoselito', cuenta.id);
          
          // Calcular el total del día
          const totalDia = cuenta.totalGeneralVenta +
            (cuenta.cobros || []).reduce((sum, cobro) => sum + (parseFloat(cobro.monto) || 0), 0) -
            (cuenta.abonos || []).reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0);

          // El saldo acumulado es el saldo anterior más el total del día
          saldoAcumulado = saldoAcumulado + totalDia;
          
          // Actualizar la cuenta usando batch
          batch.update(cuentaRef, {
            saldoAcumuladoAnterior: i === 0 ? 0 : cuentasOrdenadas[i-1].nuevoSaldoAcumulado,
            nuevoSaldoAcumulado: saldoAcumulado,
            estadoPagado: saldoAcumulado <= 0
          });

          // Si la cuenta está pagada, reiniciar el saldo acumulado
          if (saldoAcumulado <= 0) {
            saldoAcumulado = 0;
          }
        }

        // Ejecutar todas las actualizaciones en una sola operación
        await batch.commit();
      } catch (error) {
        console.error('Error al actualizar cuentas posteriores:', error);
        throw error;
      }
    },

    async crearNuevaCuenta() {
      try {
        console.log('Iniciando creación de nueva cuenta...');
        
        // Verificar si ya existe una nota para esta fecha
        const cuentasRef = collection(db, 'cuentasJoselito');
        console.log('Referencia a la colección creada:', cuentasRef);
        
        const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
        console.log('Query construida para fecha:', this.fechaSeleccionada);
        
        const querySnapshot = await getDocs(q);
        console.log('Query snapshot obtenido:', querySnapshot.size, 'documentos encontrados');

        if (!querySnapshot.empty) {
          throw new Error('Ya existe una nota registrada para esta fecha.');
        }

        // Obtener el saldo acumulado anterior
        console.log('Obteniendo saldo acumulado anterior...');
        const saldoAnterior = await this.obtenerSaldoAcumuladoAnterior();
        console.log('Saldo anterior obtenido:', saldoAnterior);

        // Preparar los datos inicialess
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: this.items,
          itemsVenta: this.itemsVenta,
          saldoAcumuladoAnterior: saldoAnterior,
          cobros: [],
          abonos: [],
          totalGeneral: this.totalGeneral,
          totalGeneralVenta: this.totalGeneralVenta,
          nuevoSaldoAcumulado: saldoAnterior + this.totalDiaActual,
          estadoPagado: false,
          tieneObservacion: this.tieneObservacion,
          observacion: this.observacion,
          ultimaActualizacion: new Date().toISOString()
        };

        console.log('Datos preparados para crear nueva cuenta:', notaData);

        try {
          // Intentar crear el documento en Firestore
          console.log('Intentando crear documento en Firestore...');
          const docRef = await addDoc(cuentasRef, notaData);
          console.log('Documento creado exitosamente con ID:', docRef.id);

          // Verificar que el documento se creó correctamente
          const docCheck = await getDoc(docRef);
          if (!docCheck.exists()) {
            throw new Error('El documento no se creó correctamente');
          }
          console.log('Documento verificado y existe en Firestore');

          // Actualizar la URL y forzar la recarga del componente
          console.log('Actualizando URL...');
          await this.$router.push({
            name: 'CuentasJoselito',
            params: { id: docRef.id },
            query: { edit: 'true' }
          });

          // Cargar los datos de la nueva cuenta
          console.log('Cargando datos de la nueva cuenta...');
          await this.loadExistingCuenta(docRef.id);

          alert('Cuenta creada exitosamente');
          return docRef.id;
        } catch (firestoreError) {
          console.error('Error específico de Firestore:', firestoreError);
          throw new Error(`Error al crear el documento en Firestore: ${firestoreError.message}`);
        }
      } catch (error) {
        console.error('Error detallado al crear nueva cuenta:', error);
        if (error.message === 'Ya existe una nota registrada para esta fecha.') {
          alert(error.message);
        } else {
          alert(`Error al crear la cuenta: ${error.message}\nPor favor, revise la consola para más detalles.`);
        }
        throw error;
      }
    },

    async guardarNota() {
      try {
        // Validar datos antes de guardar
        if (!this.fechaSeleccionada) {
          throw new Error('La fecha es requerida');
        }

        // Preparar los datos asegurándose que todos los números sean parseados correctamente
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: this.items.map(item => ({
            kilos: Number(item.kilos) || 0,
            medida: String(item.medida || ''),
            costo: Number(item.costo) || 0,
            total: Number(item.kilos * item.costo) || 0
          })),
          itemsVenta: this.itemsVenta.map(item => ({
            kilosVenta: Number(item.kilosVenta) || 0,
            medida: String(item.medida || ''),
            precioVenta: Number(item.precioVenta) || 0,
            totalVenta: Number(item.kilosVenta * item.precioVenta) || 0,
            ganancia: Number(item.ganancia) || 0
          })),
          saldoAcumuladoAnterior: Number(this.saldoAcumuladoAnterior) || 0,
          cobros: this.cobros.map(cobro => ({
            descripcion: String(cobro.descripcion || ''),
            monto: Number(cobro.monto) || 0
          })),
          abonos: this.abonos.map(abono => ({
            descripcion: String(abono.descripcion || ''),
            monto: Number(abono.monto) || 0
          })),
          // Calcular totales
          totalGeneral: Number(this.totalGeneral) || 0,
          totalGeneralVenta: Number(this.totalGeneralVenta) || 0,
          totalCobros: Number(this.cobros.reduce((sum, cobro) => sum + (Number(cobro.monto) || 0), 0)),
          totalAbonos: Number(this.abonos.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0)),
          totalDia: Number(this.totalDiaActual) || 0,
          nuevoSaldoAcumulado: Number(this.nuevoSaldoAcumulado) || 0,
          gananciaDelDia: Number(this.gananciaDelDia) || 0,
          estadoPagado: Boolean(this.totalDiaActual <= 0),
          tieneObservacion: this.tieneObservacion,
          observacion: this.observacion,
          ultimaActualizacion: new Date().toISOString()
        };

        // Obtener referencia del documento
        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';
        
        let docRef;
        
        if (id && isEditing) {
          // Actualizar documento existente
          docRef = doc(db, 'cuentasJoselito', id);
          await updateDoc(docRef, notaData);
          console.log('Documento actualizado exitosamente:', id);
        } else {
          // Crear nuevo documento
          docRef = await addDoc(collection(db, 'cuentasJoselito'), notaData);
          console.log('Nuevo documento creado:', docRef.id);
          
          // Actualizar URL con el nuevo ID
          await this.$router.push({
            name: 'CuentasJoselito',
            params: { id: docRef.id },
            query: { edit: 'true' }
          });
        }

        // Verificar que los datos se guardaron correctamente
        const savedDoc = await getDoc(docRef);
        if (!savedDoc.exists()) {
          throw new Error('Error al verificar el documento guardado');
        }

        // Comparar datos guardados con los datos originales
        const savedData = savedDoc.data();
        const dataMatches = this.validateSavedData(notaData, savedData);
        
        if (!dataMatches) {
          throw new Error('Los datos guardados no coinciden con los datos originales');
        }

        // Actualizar cuentas posteriores en segundo plano
        setTimeout(() => {
          this.actualizarCuentasPosteriores(this.fechaSeleccionada)
            .catch(error => console.error('Error al actualizar cuentas posteriores:', error));
        }, 1000);

        alert('Datos guardados exitosamente');
        return docRef.id;

      } catch (error) {
        console.error('Error al guardar nota:', error);
        alert(`Error al guardar: ${error.message}`);
        throw error;
      }
    },

    // Agregar método para validar datos guardados
    validateSavedData(original, saved) {
      // Comparar campos principales
      const mainFields = [
        'fecha',
        'saldoAcumuladoAnterior',
        'totalGeneral',
        'totalGeneralVenta',
        'totalCobros',
        'totalAbonos',
        'totalDia',
        'nuevoSaldoAcumulado',
        'gananciaDelDia',
        'estadoPagado'
      ];

      for (const field of mainFields) {
        if (original[field] !== saved[field]) {
          console.error(`Discrepancia en campo ${field}:`, {
            original: original[field],
            saved: saved[field]
          });
          return false;
        }
      }

      // Comparar arrays
      const arrayFields = ['items', 'itemsVenta', 'cobros', 'abonos'];
      for (const field of arrayFields) {
        if (original[field].length !== saved[field].length) {
          console.error(`Discrepancia en longitud de array ${field}`);
          return false;
        }
      }

      return true;
    },

    async addItem() {
      if (!this.newItem.kilos || !this.newItem.medida || !this.newItem.costo || !this.newItem.precioVenta) {
        this.lastSaveMessage = 'Por favor complete todos los campos';
        this.showSaveMessage = true;
        if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
        return;
      }

      try {
        // Si no hay un ID de documento existente, crear uno nuevo primero
        if (!this.$route.params.id) {
          // Guardar temporalmente el nuevo item
          const newItemTemp = { ...this.newItem };
          // Crear la cuenta primero (sin items)
          const docId = await this.crearNuevaCuenta();
          if (!docId) {
            throw new Error('No se pudo crear la cuenta');
          }
          // Restaurar el nuevo item después de crear la cuenta
          this.newItem = newItemTemp;
        }
        
        // Verificar si ya existe un ítem con la misma medida (normalizando la comparación)
        const medidaNormalizada = this.normalizarMedida(this.newItem.medida);
        const medidaExistente = this.items.findIndex(item => 
          this.normalizarMedida(item.medida) === medidaNormalizada
        );
        
        if (medidaExistente !== -1) {
          // Si la medida ya existe, sumar los kilos al ítem existente
          const itemExistente = this.items[medidaExistente];
          const kilosAnteriores = itemExistente.kilos;
          
          // Calcular los kilos si es un crudo para la tabla de costos (usar 19)
          const kilosCalculados = this.calcularKilosCrudos(this.newItem.medida, this.newItem.kilos, true);
          
          const nuevosKilos = kilosAnteriores + kilosCalculados;
          
          // Usar el costo más reciente (el del nuevo ítem)
          const costoNuevo = this.newItem.costo || itemExistente.costo;
          
          // Actualizar kilos y recalcular total
          itemExistente.kilos = nuevosKilos;
          itemExistente.costo = costoNuevo;
          itemExistente.total = nuevosKilos * costoNuevo;
          
          // Actualizar también en itemsVenta
          if (this.itemsVenta[medidaExistente]) {
            // Usar el precio de venta más reciente (el del nuevo ítem)
            const precioVenta = this.newItem.precioVenta || this.itemsVenta[medidaExistente].precioVenta;
            
            // Calcular los kilos para la tabla de venta (usar 20)
            const kilosVenta = this.calcularKilosCrudos(this.newItem.medida, this.newItem.kilos, false);
            
            this.itemsVenta[medidaExistente].kilosVenta = kilosAnteriores + kilosVenta;
            this.itemsVenta[medidaExistente].precioVenta = precioVenta;
            this.itemsVenta[medidaExistente].totalVenta = this.itemsVenta[medidaExistente].kilosVenta * precioVenta;
            this.itemsVenta[medidaExistente].ganancia = this.itemsVenta[medidaExistente].totalVenta - itemExistente.total;
          }
          
          // Mostrar mensaje de confirmación
          this.lastSaveMessage = `Se sumaron ${this.formatNumber(this.newItem.kilos)} kilos a la medida "${this.newItem.medida}". 
Total: ${this.formatNumber(nuevosKilos)} kilos.
Costo: $${this.formatNumber(costoNuevo)} | Precio: $${this.formatNumber(precioVenta)}`;
          this.showSaveMessage = true;
          
          // Ocultar el mensaje después de 3 segundos
          if (this.saveMessageTimer) {
            clearTimeout(this.saveMessageTimer);
          }
          this.saveMessageTimer = setTimeout(() => {
            this.showSaveMessage = false;
          }, 3000);
        } else {
          // Si la medida no existe, agregar un nuevo ítem
          const total = this.newItem.kilos * this.newItem.costo;
          
          // Calcular los kilos si es un crudo para la tabla de costos (usar 19)
          const kilosCalculados = this.calcularKilosCrudos(this.newItem.medida, this.newItem.kilos, true);
          
          this.items.push({
            kilos: kilosCalculados,
            medida: this.newItem.medida,
            costo: this.newItem.costo,
            total: kilosCalculados * this.newItem.costo
          });

          // Calcular los kilos para la tabla de venta (usar 20)
          const kilosVenta = this.calcularKilosCrudos(this.newItem.medida, this.newItem.kilos, false);
          
          // Agregar directamente a itemsVenta con el precio de venta
          const totalVenta = kilosVenta * this.newItem.precioVenta;
          const ganancia = totalVenta - (kilosCalculados * this.newItem.costo);
          this.itemsVenta.push({
            kilosVenta: kilosVenta,
            medida: this.newItem.medida,
            precioVenta: this.newItem.precioVenta,
            totalVenta,
            ganancia
          });
        }

        this.newItem = {
          kilos: null,
          medida: '',
          costo: null,
          precioVenta: null
        };

        // El guardado automático se activará por los watchers
      } catch (error) {
        console.error('Error al guardar el item:', error);
        this.lastSaveMessage = 'Hubo un problema al guardar. Por favor, intente nuevamente.';
        this.showSaveMessage = true;
        if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
      }
    },

    actualizarItemsVenta() {
      const itemsVentaActuales = [...this.itemsVenta];
      
      this.itemsVenta = this.items.map((item, index) => {
        const itemVentaExistente = itemsVentaActuales[index] || {};
        const precioVenta = Number(itemVentaExistente.precioVenta) || 0;
        
        // Verificar si es un formato "5-19" y recalcular los kilos para la tabla de venta
        let kilosVenta = Number(item.kilos) || 0;
        
        // Si la medida tiene formato "5-19", recalcular los kilos para la tabla de venta
        const medidaLower = item.medida.toLowerCase().trim();
        const formatoGuion = /^(\d+)-(\d+)$/.exec(medidaLower);
        if (formatoGuion) {
          const cajas = parseInt(formatoGuion[1]) || 0;
          const kilosPorCaja = parseInt(formatoGuion[2]) || 0;
          
          // Si el segundo número es 19, recalcular usando 20 para la tabla de venta
          if (kilosPorCaja === 19) {
            kilosVenta = cajas * 20;
          }
        }
        
        return {
          kilosVenta: kilosVenta,
          medida: item.medida,
          precioVenta: precioVenta,
          totalVenta: kilosVenta * precioVenta,
          ganancia: (kilosVenta * precioVenta) - 
                    ((Number(item.kilos) || 0) * (Number(item.costo) || 0))
        };
      });
    },

    async removeItem(index) {
      try {
        this.items.splice(index, 1);
        this.itemsVenta.splice(index, 1);
        this.showMobileActions = false;
        
        // El guardado automático se activará por los watchers
      } catch (error) {
        console.error('Error al eliminar item:', error);
      }
    },

    editField(index, field) {
      this.editingField = { index, field };
      this.$nextTick(() => {
        if (this.$refs.editInput) {
          this.$refs.editInput[0]?.focus();
        }
      });
    },

    finishEditing() {
      const { index, field } = this.editingField;
      if (index !== null && field !== null) {
        try {
          const item = this.items[index];
          if (field === 'kilos' || field === 'costo') {
            item[field] = parseFloat(item[field]) || 0;
          }
          
          // Si se está editando la medida, verificar si es un formato "5-19"
          if (field === 'medida') {
            // Si la nueva medida tiene formato "5-19", calcular los kilos usando 19
            const medidaLower = item.medida.toLowerCase().trim();
            const formatoGuion = /^(\d+)-(\d+)$/.exec(medidaLower);
            if (formatoGuion) {
              const cajas = parseInt(formatoGuion[1]) || 0;
              const kilosPorCaja = parseInt(formatoGuion[2]) || 0;
              
              // Si el segundo número es 19, calcular los kilos usando 19 para la tabla de costos
              if (kilosPorCaja === 19) {
                item.kilos = cajas * 19;
              }
            }
          }
          
          // Recalcular el total
          item.total = item.kilos * item.costo;
          
          // Actualizar la tabla de venta
          this.actualizarItemsVenta();
          
          // El guardado automático se activará por los watchers
        } catch (error) {
          console.error('Error al finalizar edición:', error);
        }
      }
      this.editingField = { index: null, field: null };
    },

    addNewProduct() {
      if (!this.newProduct.kilosVenta || !this.newProduct.medida || !this.newProduct.precioVenta) {
        this.lastSaveMessage = 'Por favor complete todos los campos';
        this.showSaveMessage = true;
        if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
        return;
      }

      // Verificar si ya existe un ítem con la misma medida (normalizando la comparación)
      const medidaNormalizada = this.normalizarMedida(this.newProduct.medida);
      const medidaExistente = this.itemsVenta.findIndex(item => 
        this.normalizarMedida(item.medida) === medidaNormalizada
      );
      
      if (medidaExistente !== -1) {
        // Si la medida ya existe, sumar los kilos al ítem existente
        const itemExistente = this.itemsVenta[medidaExistente];
        const kilosAnteriores = itemExistente.kilosVenta;
        
        // Calcular los kilos si es un crudo para la tabla de venta (usar 20)
        const kilosCalculados = this.calcularKilosCrudos(this.newProduct.medida, this.newProduct.kilosVenta, false);
        
        const nuevosKilos = kilosAnteriores + kilosCalculados;
        
        // Usar el precio de venta más reciente (el del nuevo producto)
        const precioVenta = this.newProduct.precioVenta || itemExistente.precioVenta;
        
        // Actualizar kilos y recalcular total
        itemExistente.kilosVenta = nuevosKilos;
        itemExistente.precioVenta = precioVenta;
        itemExistente.totalVenta = nuevosKilos * precioVenta;
        
        // Recalcular ganancia
        const costoUnitario = this.items[medidaExistente]?.costo || 0;
        const costoTotal = nuevosKilos * costoUnitario;
        itemExistente.ganancia = itemExistente.totalVenta - costoTotal;
        
        // Mostrar mensaje de confirmación
        this.lastSaveMessage = `Se sumaron ${this.formatNumber(this.newProduct.kilosVenta)} kilos a la medida "${this.newProduct.medida}". 
Total: ${this.formatNumber(nuevosKilos)} kilos.
Precio: $${this.formatNumber(precioVenta)}`;
        this.showSaveMessage = true;
        
        // Ocultar el mensaje después de 3 segundos
        if (this.saveMessageTimer) {
          clearTimeout(this.saveMessageTimer);
        }
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
      } else {
        // Si la medida no existe, agregar un nuevo ítem
        // Calcular los kilos si es un crudo para la tabla de venta (usar 20)
        const kilosCalculados = this.calcularKilosCrudos(this.newProduct.medida, this.newProduct.kilosVenta, false);
        
        const totalVenta = kilosCalculados * this.newProduct.precioVenta;
        this.itemsVenta.push({
          ...this.newProduct,
          kilosVenta: kilosCalculados,
          totalVenta,
          ganancia: totalVenta - (kilosCalculados * (this.items[this.itemsVenta.length]?.costo || 0))
        });
      }

      this.showAddProductModal = false;
      this.newProduct = {
        kilosVenta: null,
        medida: '',
        precioVenta: null
      };
    },

    calcularTotalVenta(index) {
      if (!this.itemsVenta[index]) return;
      
      try {
        this.actualizarTotalKilos(index);
        
        // El guardado automático se activará por los watchers
      } catch (error) {
        console.error('Error al calcular total de venta:', error);
      }
    },

    imprimirTablas() {
      window.print();
    },

    addCobro() {
      this.cobros.push({descripcion: 'Flete', monto: 0});
      // El guardado automático se activará por los watchers
    },

    removeCobro(index) {
      this.cobros.splice(index, 1);
      // El guardado automático se activará por los watchers
    },

    addAbono() {
      this.abonos.push({descripcion: '', monto: 0});
      // El guardado automático se activará por los watchers
    },

    removeAbono(index) {
      this.abonos.splice(index, 1);
      // El guardado automático se activará por los watchers
    },

    startLongPress(index, field) {
      this.longPressTimer = setTimeout(() => {
        this.showMobileActions = true;
        this.selectedItemIndex = index;
        this.selectedField = field;
      }, 500);
    },

    endLongPress() {
      clearTimeout(this.longPressTimer);
    },

    cancelMobileActions() {
      this.showMobileActions = false;
      this.selectedItemIndex = null;
      this.selectedField = null;
    },

    editItem(index) {
      this.editingItem = { ...this.items[index] };
      this.editingIndex = index;
      this.showEditModal = true;
      this.showMobileActions = false;
    },

    saveEditedItem() {
      if (this.editingIndex !== null && this.editingItem) {
        this.editingItem.total = this.editingItem.kilos * this.editingItem.costo;
        this.items[this.editingIndex] = { ...this.editingItem };
        this.actualizarItemsVenta();
      }
      this.showEditModal = false;
      this.editingItem = null;
      this.editingIndex = null;
    },

    cancelEdit() {
      this.showEditModal = false;
      this.editingItem = null;
      this.editingIndex = null;
    },

    editKilos(index) {
      this.editingKilosIndex = index;
      this.$nextTick(() => {
        if (this.$refs.kilosInput) {
          this.$refs.kilosInput[0]?.focus();
        }
      });
    },

    finishEditingKilos() {
      if (this.editingKilosIndex !== null) {
        this.calcularTotalVenta(this.editingKilosIndex);
      }
      this.editingKilosIndex = null;
    },

    actualizarTotalKilos(index) {
      if (index !== null && this.itemsVenta[index]) {
        const item = this.itemsVenta[index];
        let kilos = parseFloat(item.kilosVenta) || 0;
        const precio = parseFloat(item.precioVenta) || 0;
        
        // Verificar si es un crudo y calcular los kilos para la tabla de venta (usar 20)
        if (item.medida) {
          kilos = this.calcularKilosCrudos(item.medida, kilos, false);
          // Actualizar el valor de kilosVenta
          item.kilosVenta = kilos;
        }
        
        // Calcular el total de venta
        item.totalVenta = kilos * precio;
        
        // Calcular la ganancia
        const itemCosto = this.items[index];
        const totalCosto = itemCosto ? (itemCosto.total || 0) : 0;
        item.ganancia = (item.totalVenta || 0) - totalCosto;
      }
    },

    toggleGananciasMobile(index) {
      if (window.innerWidth <= 600) {
        this.selectedRowIndex = this.selectedRowIndex === index ? null : index;
      }
    },

    debounceGuardarSilencioso(index) {
      // Cancelar el timer existente para este índice si existe
      if (this.debounceTimers[index]) {
        clearTimeout(this.debounceTimers[index]);
      }
      
      // Crear un nuevo timer para este índice
      this.debounceTimers[index] = setTimeout(() => {
        this.guardarSilencioso();
        delete this.debounceTimers[index]; // Limpiar la referencia
      }, 1000);
    },

    async guardarSilencioso() {
      try {
        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';
        
        if (id && isEditing) {
          // Verificar si hay una operación de guardado en curso
          if (this.isSaving) {
            // Si hay una operación en curso, encolar esta solicitud
            this.saveQueue.push(true);
            return;
          }
          
          // Verificar si ha pasado suficiente tiempo desde el último guardado
          const now = Date.now();
          if (this.lastSaveTime && now - this.lastSaveTime < this.saveMinInterval) {
            // Si no ha pasado suficiente tiempo, programar un guardado posterior
            if (!this.autoSaveTimer) {
              this.autoSaveTimer = setTimeout(() => {
                this.guardarSilencioso();
              }, this.saveMinInterval - (now - this.lastSaveTime));
            }
            return;
          }
          
          // Marcar como guardando
          this.isSaving = true;
          this.lastSaveTime = now;
          
          // Preparar solo los datos que necesitan ser actualizados
          const notaData = {
            items: this.items.map(item => ({
              kilos: Number(item.kilos) || 0,
              medida: String(item.medida || ''),
              costo: Number(item.costo) || 0,
              total: Number(item.kilos * item.costo) || 0
            })),
            itemsVenta: this.itemsVenta.map(item => ({
              kilosVenta: Number(item.kilosVenta) || 0,
              medida: String(item.medida || ''),
              precioVenta: Number(item.precioVenta) || 0,
              totalVenta: Number(item.kilosVenta * item.precioVenta) || 0,
              ganancia: Number(item.ganancia) || 0
            })),
            totalGeneral: Number(this.totalGeneral) || 0,
            totalGeneralVenta: Number(this.totalGeneralVenta) || 0,
            gananciaDelDia: Number(this.gananciaDelDia) || 0,
            ultimaActualizacion: new Date().toISOString()
          };

          const docRef = doc(db, 'cuentasJoselito', id);
          await updateDoc(docRef, notaData);
          
          // Marcar como no guardando
          this.isSaving = false;
          
          // Procesar la cola de guardados
          if (this.saveQueue.length > 0) {
            this.saveQueue.shift(); // Eliminar el primer elemento
            setTimeout(() => {
              this.guardarSilencioso();
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error al guardar silenciosamente:', error);
        this.isSaving = false;
      }
    },

    async guardarCuenta() {
      try {
        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';

        // Preparar los datos de la cuenta
        const cuentaData = {
          fecha: this.fechaSeleccionada,
          items: this.items.map(item => ({
            kilos: Number(item.kilos) || 0,
            medida: String(item.medida || ''),
            costo: Number(item.costo) || 0,
            total: Number(item.kilos * item.costo) || 0
          })),
          itemsVenta: this.itemsVenta.map(item => ({
            kilosVenta: Number(item.kilosVenta) || 0,
            medida: String(item.medida || ''),
            precioVenta: Number(item.precioVenta) || 0,
            totalVenta: Number(item.kilosVenta * item.precioVenta) || 0,
            ganancia: Number(item.ganancia) || 0
          })),
          saldoAcumuladoAnterior: Number(this.saldoAcumuladoAnterior) || 0,
          cobros: this.cobros,
          abonos: this.abonos,
          totalGeneral: Number(this.totalGeneral) || 0,
          totalGeneralVenta: Number(this.totalGeneralVenta) || 0,
          totalDia: Number(this.totalDiaActual) || 0,
          nuevoSaldoAcumulado: Number(this.nuevoSaldoAcumulado) || 0,
          gananciaDelDia: Number(this.gananciaDelDia) || 0,
          estadoPagado: Boolean(this.totalDiaActual <= 0),
          tieneObservacion: this.tieneObservacion,
          observacion: this.observacion,
          ultimaActualizacion: new Date().toISOString()
        };

        let docRef;
        
        if (id && isEditing) {
          // Actualizar documento existente
          docRef = doc(db, 'cuentasJoselito', id);
          await updateDoc(docRef, cuentaData);
          console.log('Documento actualizado exitosamente:', id);
        } else {
          // Crear nuevo documento
          docRef = await addDoc(collection(db, 'cuentasJoselito'), cuentaData);
          console.log('Nuevo documento creado:', docRef.id);
          
          // Actualizar URL con el nuevo ID
          await this.$router.push({
            name: 'CuentasJoselito',
            params: { id: docRef.id },
            query: { edit: 'true' }
          });
        }

        // Actualizar cuentas posteriores en segundo plano
        setTimeout(() => {
          this.actualizarCuentasPosteriores(this.fechaSeleccionada)
            .catch(error => console.error('Error al actualizar cuentas posteriores:', error));
        }, 100);

        alert('Cuenta guardada exitosamente');
        return docRef.id;

      } catch (error) {
        console.error('Error al guardar la cuenta:', error);
        alert('Error al guardar la cuenta: ' + error.message);
        throw error;
      }
    },
    
    agregarObservacion() {
      this.showObservacionModal = true;
    },
    
    guardarObservacion() {
      if (this.observacion.trim()) {
        this.tieneObservacion = true;
      }
      this.showObservacionModal = false;
    },
    
    cancelarObservacion() {
      if (!this.tieneObservacion) {
        this.observacion = '';
      }
      this.showObservacionModal = false;
    },
    
    editarObservacion() {
      this.showObservacionModal = true;
    },
    
    eliminarObservacion() {
      if (confirm('¿Estás seguro de que deseas eliminar esta observación?')) {
        this.observacion = '';
        this.tieneObservacion = false;
      }
    },

    handleDataChange() {
      if (this.$route.params.id && this.$route.query.edit === 'true') {
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = setTimeout(async () => {
          await this.queueSave();
        }, 2000); // Delay de 2 segundos para evitar demasiadas operaciones
      }
    },

    async queueSave() {
      // Agregar operación a la cola con timestamp
      this.saveQueue.push({
        timestamp: Date.now(),
        operation: async () => {
          await this.autoSaveNota();
        }
      });

      // Procesar la cola si no hay guardado en proceso
      if (!this.isSaving) {
        await this.processSaveQueue();
      }
    },

    async processSaveQueue() {
      if (this.isSaving || this.saveQueue.length === 0) return;

      this.isSaving = true;

      try {
        while (this.saveQueue.length > 0) {
          // Verificar el tiempo desde el último guardado
          const now = Date.now();
          if (this.lastSaveTime && now - this.lastSaveTime < this.saveMinInterval) {
            // Esperar antes de intentar el siguiente guardado
            await new Promise(resolve => 
              setTimeout(resolve, this.saveMinInterval - (now - this.lastSaveTime))
            );
          }

          const nextSave = this.saveQueue[0];
          await this.retryOperation(nextSave.operation);
          this.lastSaveTime = Date.now();
          this.saveQueue.shift();
        }
      } catch (error) {
        console.error('Error procesando cola de guardado:', error);
        if (error.code === 'resource-exhausted') {
          // Esperar 10 segundos antes de reintentar si se excedió la cuota
          await new Promise(resolve => setTimeout(resolve, 10000));
          // Reintentar el procesamiento
          await this.processSaveQueue();
        }
      } finally {
        this.isSaving = false;
      }
    },

    async retryOperation(operation, maxRetries = 3) {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          return await operation();
        } catch (error) {
          retries++;
          console.error(`Error en operación (intento ${retries}/${maxRetries}):`, error);
          
          // Si es un error de cuota excedida, esperar más tiempo
          if (error.code === 'resource-exhausted') {
            await new Promise(resolve => setTimeout(resolve, 5000 * Math.pow(2, retries)));
          } else {
            // Para otros errores, esperar menos tiempo
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
          }
          
          // Si es el último intento, lanzar el error
          if (retries >= maxRetries) {
            console.error('Se alcanzó el número máximo de intentos. Operación fallida.');
            throw error;
          }
        }
      }
    },

    async autoSaveNota() {
      if (!this.$route.params.id) return;

      try {
        // Preparar datos completos para guardar
        const notaData = {
          items: this.items.map(item => ({
            kilos: Number(item.kilos) || 0,
            medida: String(item.medida || ''),
            costo: Number(item.costo) || 0,
            total: Number(item.kilos * item.costo) || 0
          })),
          itemsVenta: this.itemsVenta.map(item => ({
            kilosVenta: Number(item.kilosVenta) || 0,
            medida: String(item.medida || ''),
            precioVenta: Number(item.precioVenta) || 0,
            totalVenta: Number(item.totalVenta) || 0,
            ganancia: Number(item.ganancia) || 0
          })),
          totalGeneral: Number(this.totalGeneral) || 0,
          totalGeneralVenta: Number(this.totalGeneralVenta) || 0,
          nuevoSaldoAcumulado: Number(this.nuevoSaldoAcumulado) || 0,
          cobros: this.cobros,
          abonos: this.abonos,
          estadoPagado: this.estadoCuenta === 'Pagado',
          tieneObservacion: Boolean(this.observacion && this.observacion.trim()),
          observacion: String(this.observacion || ''),
          ultimaActualizacion: new Date().toISOString()
        };

        await updateDoc(doc(db, 'cuentasJoselito', this.$route.params.id), notaData);
        
        // Mostrar mensaje de confirmación
        this.lastSaveMessage = `Guardado automático: ${new Date().toLocaleTimeString()}`;
        this.showSaveMessage = true;
        
        // Ocultar el mensaje después de 3 segundos
        if (this.saveMessageTimer) {
          clearTimeout(this.saveMessageTimer);
        }
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
        
        console.log('Cuenta auto-guardada exitosamente:', new Date().toLocaleTimeString());
      } catch (error) {
        if (error.code === 'resource-exhausted') {
          throw error; // Dejar que el sistema de cola maneje el reintento
        }
        console.error('Error en auto-guardado:', error);
        throw error;
      }
    },

    // Método para calcular los kilos de crudos
    calcularKilosCrudos(medida, kilosOriginales, esParaCostos = false) {
      // Verificar si es un crudo y tiene el formato adecuado
      const medidaLower = medida.toLowerCase().trim();
      
      // Verificar si tiene formato de números separados por guión (ej: "5-19")
      const formatoGuion = /^(\d+)-(\d+)$/.exec(medidaLower);
      if (formatoGuion) {
        const cajas = parseInt(formatoGuion[1]) || 0;
        const kilosPorCaja = parseInt(formatoGuion[2]) || 0;
        
        // Si el segundo número es 19, sustituirlo por 20 solo si NO es para la tabla de costos
        const kiloPorCaja = (kilosPorCaja === 19 && !esParaCostos) ? 20 : kilosPorCaja;
        
        // Calcular kilos totales: cajas * kiloPorCaja
        const kilosCalculados = cajas * kiloPorCaja;
        
        // Mostrar mensaje informativo solo si se sustituyó 19 por 20 y no es para costos
        if (kilosPorCaja === 19 && !esParaCostos && kilosCalculados !== kilosOriginales) {
          this.lastSaveMessage = `Cálculo de crudos: ${cajas} cajas * 20kg = ${kilosCalculados}kg (formato ${medidaLower})`;
          this.showSaveMessage = true;
          
          // Ocultar el mensaje después de 3 segundos
          if (this.saveMessageTimer) {
            clearTimeout(this.saveMessageTimer);
          }
          this.saveMessageTimer = setTimeout(() => {
            this.showSaveMessage = false;
          }, 3000);
        } else if (kilosPorCaja === 19 && esParaCostos) {
          // Mensaje para la tabla de costos
          console.log(`Cálculo de crudos para tabla de costos: ${cajas} cajas * 19kg = ${kilosCalculados}kg (formato ${medidaLower})`);
        }
        
        return kilosCalculados;
      }
      
      // Verificar si es un crudo
      const esCrudo = medidaLower.includes('crudo');
      
      // Verificar formato con asterisco y posible suma (ej: "6*19+5")
      if (esCrudo && /^\d+\*\d+(\+\d+)?$/.test(medidaLower)) {
        // Extraer los números del formato
        const partes = medidaLower.split(/[\*\+]/);
        if (partes.length >= 2) {
          const cajas = parseInt(partes[0]) || 0;
          const kilosPorCaja = parseInt(partes[1]) || 0;
          
          // Si el segundo número es 19, sustituirlo por 20
          const kiloPorCaja = kilosPorCaja === 19 ? 20 : kilosPorCaja;
          
          let kilosSobrantes = 0;
          
          if (partes.length > 2) {
            kilosSobrantes = parseInt(partes[2]) || 0;
          }
          
          // Calcular kilos totales: cajas * kiloPorCaja + sobrante
          const kilosCalculados = (cajas * kiloPorCaja) + kilosSobrantes;
          
          // Mostrar mensaje informativo solo si se sustituyó 19 por 20
          if (kilosPorCaja === 19 && kilosCalculados !== kilosOriginales) {
            this.lastSaveMessage = `Cálculo de crudos: ${cajas} cajas * 20kg + ${kilosSobrantes}kg = ${kilosCalculados}kg`;
            this.showSaveMessage = true;
            
            // Ocultar el mensaje después de 3 segundos
            if (this.saveMessageTimer) {
              clearTimeout(this.saveMessageTimer);
            }
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
          
          return kilosCalculados;
        }
      }
      
      // Si no tiene el formato esperado, devolver los kilos originales
      return kilosOriginales;
    },
  },
  created() {
    const id = this.$route.params.id;
    const isEditing = this.$route.query.edit === 'true';
    
    if (id && isEditing) {
      this.loadExistingCuenta(id);
    }
  },
  watch: {
    '$route'(to, from) {
      const id = to.params.id;
      const isEditing = to.query.edit === 'true';
      
      if (id && isEditing) {
        this.loadExistingCuenta(id);
      } else {
        // Limpiar los datos si no estamos editando
        this.items = [];
        this.itemsVenta = [];
        this.saldoAcumuladoAnterior = 0;
        this.cobros = [];
        this.abonos = [];
        this.fechaSeleccionada = this.obtenerFechaActual();
        this.estadoPagado = false;
      }
    },
    // Watchers para guardado automático
    items: {
      handler: 'handleDataChange',
      deep: true
    },
    itemsVenta: {
      handler: 'handleDataChange',
      deep: true
    },
    cobros: {
      handler: 'handleDataChange',
      deep: true
    },
    abonos: {
      handler: 'handleDataChange',
      deep: true
    },
    fechaSeleccionada: {
      handler: 'handleDataChange'
    },
    saldoAcumuladoAnterior: {
      handler: 'handleDataChange'
    },
    observacion: 'handleDataChange'
  },
  beforeUnmount() {
    // Limpiar temporizadores
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    // Limpiar todos los temporizadores de debounce
    Object.values(this.debounceTimers).forEach(timer => {
      clearTimeout(timer);
    });
    
    // Intentar procesar cualquier guardado pendiente
    if (this.saveQueue.length > 0) {
      this.processSaveQueue();
    }
  }
};
</script>

<style scoped>
/* Estilos base */
.cuentas-joselito-container {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.back-button-container {
  margin-bottom: 20px;
}

/* Estilos de fecha */
.fecha-actual {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-bottom: 20px;
}

.fecha-input {
  margin-bottom: 5px;
}

.fecha-input input[type="date"] {
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.fecha-display {
  font-weight: bold;
}

/* Estilos de entrada */
.input-section {
  margin-bottom: 20px;
}

.tabla-principal-toggle {
  display: flex;
  justify-content: flex-start;
  margin: 10px 0 5px;
}

.toggle-tabla-btn {
  width: 100%;
  max-width: 320px;
  background-color: #1769aa;
}

.input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: nowrap;
  align-items: center;
}

.responsive-input {
  width: 100%;
  max-width: 180px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  transition: border-color 0.3s ease;
  font-size: 15px;
}

.responsive-input:focus {
  border-color: #2196F3;
  outline: none;
}

button {
  padding: 10px 20px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

button:hover {
  background-color: #1976D2;
  transform: translateY(-2px);
}

button:active {
  transform: translateY(0);
}

.delete-btn {
  background-color: #f44336;
}

.delete-btn:hover {
  background-color: #da190b;
}

/* Estilos de tabla */
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #2196F3;
  color: white;
}

tr:nth-child(even) {
  background-color: #f2f2f2;
}

tr:hover {
  background-color: #e3f2fd;
}

.total td {
  font-weight: bold;
}

/* Estilos específicos de tabla */
.tabla-principal th,
.tabla-principal td,
.tabla-venta th,
.tabla-venta td {
  width: auto;
}

.tabla-principal th:first-child,
.tabla-principal td:first-child,
.tabla-venta th:first-child,
.tabla-venta td:first-child,
.tabla-principal th:nth-child(2),
.tabla-principal td:nth-child(2),
.tabla-venta th:nth-child(2),
.tabla-venta td:nth-child(2) {
  width: 20%;
}

.tabla-principal th:nth-child(3),
.tabla-principal td:nth-child(3),
.tabla-venta th:nth-child(3),
.tabla-venta td:nth-child(3),
.tabla-principal th:last-child,
.tabla-principal td:last-child,
.tabla-venta th:last-child,
.tabla-venta td:last-child {
  width: 30%;
}

/* Estilos de saldo y abonos */
.saldo-pendiente,
.abonos {
  margin-bottom: 20px;
}

.add-btn {
  margin-top: 10px;
}

/* Estilos de botones */
.button-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.save-button,
.print-button {
  padding: 12px 25px;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
  min-width: 150px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.save-button {
  background-color: #4CAF50;
}

.print-button {
  background-color: #3760b0;
}

.save-button:hover {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.print-button:hover {
  background-color: #2c4d8c;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

@media (max-width: 600px) {
  .button-container {
    flex-direction: row;
    gap: 10px;
  }

  .tabla-principal-toggle {
    justify-content: center;
  }

  .toggle-tabla-btn {
    max-width: none;
  }

  .save-button,
  .print-button {
    min-width: 120px;
    padding: 10px 20px;
  }
}

.back-button-container {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
}

/* Estilos de modal */
.modal, .edit-modal, .mobile-actions-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content, .edit-modal > div, .mobile-actions-modal > div {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

/* Estilos de ganancia */
.ganancia-del-dia {
  margin-top: 20px;
  padding: 15px;
  background-color: #e3f2fd;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ganancia-del-dia h3 {
  margin-bottom: 10px;
  color: #2196F3;
}

.ganancia-positiva,
.ganancia-negativa {
  font-weight: bold;
  font-size: 15pt;
}

.ganancia-positiva {
  color: #4CAF50;
}

.ganancia-negativa {
  color: #f44336;
}

/* Estilos de estado de cuenta */
.estado-cuenta {
  text-align: center;
  font-weight: bold;
  font-size: 20px;
  margin-top: 20px;
  padding: 10px;
  border-radius: 5px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.pagado {
  color: #4CAF50;
  background-color: #e8f5e9;
}

.no-pagado {
  color: #f44336;
  background-color: #ffebee;
}

/* Media queries */
@media (max-width: 600px) {
  .input-row {
    flex-direction: column;
  }
  
  .input-row input, .input-row button {
    width: 100%;
    margin-bottom: 10px;
  }

  .desktop-only {
    display: none;
  }

  .tabla-principal tr {
    position: relative;
  }

  .tabla-principal tr::after {
    content: '⋮';
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 20px;
    color: #666;
  }

  .tabla-principal th,
  .tabla-principal td,
  .tabla-venta th,
  .tabla-venta td {
    width: 25%;
    padding: 6px;
  }

  .precio-venta-input,
  .tabla-venta input[type="number"] {
    width: 60px;
    padding: 3px;
    font-size: 16px;
  }

  .button-container {
    flex-direction: column;
    gap: 10px;
  }
}

@media (min-width: 601px) {
  .mobile-only {
    display: none;
  }
}

/* Estilos específicos de tabla de venta */
.tabla-venta {
  margin-top: 20px;
}

.precio-venta-input {
  width: 60px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 18px;
}

.tabla-venta td,
.tabla-venta input[type="number"],
.tabla-venta .precio-venta-input {
  font-size: 18px;
  font-weight: 500;
}

.tabla-venta th {
  font-size: 16px;
}

h1, h2 {
  color: #2196F3;
  text-align: center;
  margin-bottom: 20px;
}

.text-right {
  text-align: right;
}

.guardar-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 20px 0;
}

.observacion-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-agregar-observacion {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-agregar-observacion:hover {
  background-color: #1976D2;
}

.btn-agregar-observacion i {
  font-size: 14px;
}

.observacion-existente {
  background-color: #e3f2fd;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
  width: 100%;
}

.observacion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.observacion-titulo {
  font-weight: bold;
  margin: 0;
  color: #2196F3;
}

.observacion-buttons {
  display: flex;
  gap: 5px;
}

.btn-editar {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-eliminar {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.observacion-texto {
  margin: 0;
  white-space: pre-wrap;
  color: #333;
}

@media (max-width: 600px) {
  .guardar-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .observacion-container {
    margin-bottom: 10px;
  }
  
  .btn-agregar-observacion {
    width: 100%;
    justify-content: center;
  }
}

.auto-save-indicator {
  position: fixed;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  font-size: 14px;
  z-index: 1000;
}

.save-dot {
  width: 8px;
  height: 8px;
  background-color: #4CAF50;
  border-radius: 50%;
  margin-right: 8px;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Estilos de mensaje de confirmación */
.save-message {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  font-size: 14px;
  z-index: 1000;
  animation: fadeInOut 3s ease-in-out;
  max-width: 90%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.save-message p {
  margin: 0;
  white-space: pre-wrap;
  color: #fff;
  text-align: center;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, 20px); }
  10% { opacity: 1; transform: translate(-50%, 0); }
  90% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, 20px); }
}

@media (max-width: 600px) {
  .save-message {
    font-size: 12px;
    padding: 8px 12px;
    bottom: 10px;
  }
}

.precios-button-container {
  display: flex;
  justify-content: center;
  margin: 15px 0;
}

.consolidar-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
  min-width: 200px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.consolidar-btn:hover {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style> 