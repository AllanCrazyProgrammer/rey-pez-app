<template>
  <div class="cuentas-otilio-container">
    <div v-if="isSaving" class="auto-save-indicator">
      <span class="save-dot"></span> Guardando...
    </div>
    <div class="back-button-container">
      <BackButton to="/cuentas-otilio-independiente" />
      <PreciosHistorialModal clienteActual="otilioIndependiente" />
      <StashModal cliente="otilioIndependiente" />
    </div>
    <h1>Cuentas Independientes Otilio</h1>
    
    <!-- Botón de precios específicos para Otilio Independiente -->
    <div class="precios-button-container">
      <PreciosClienteButton clienteId="otilioIndependiente" />
    </div>
    
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
  
    <table class="tabla-principal">
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
                calcularTotalVenta(index);
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

    <div class="button-container">
      <button @click="guardarNota" class="save-button" :disabled="isGuardando">
        {{ isGuardando ? 'Guardando...' : 'Guardar Nota' }}
      </button>
      <button @click="imprimirTablas" class="print-button">Imprimir</button>
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

    <!-- Mensaje de guardado automático -->
    <div v-if="showSaveMessage" class="auto-save-message">
      {{ lastSaveMessage }}
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
  deleteDoc 
} from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModal from '@/components/StashModal.vue';
import PreciosClienteButton from '@/components/PreciosClienteButton.vue';

export default {
  name: 'CuentasOtilioIndependiente',
  components: {
    BackButton,
    PreciosHistorialModal,
    StashModal,
    PreciosClienteButton
  },
  data() {
    return {
      items: [],
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
      isGuardando: false,
      lastSaveMessage: '',
      showSaveMessage: false,
      saveMessageTimer: null,
      saveMessage: ''
    }
  },
  computed: {
    // Mismo código que en CuentasOtilio.vue
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
    // Métodos existentes
    obtenerFechaActual() {
      const fecha = new Date();
      return fecha.getFullYear() + '-' + 
             String(fecha.getMonth() + 1).padStart(2, '0') + '-' + 
             String(fecha.getDate()).padStart(2, '0');
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
    
    // Método addItem que faltaba
    addItem() {
      if (!this.newItem.kilos || !this.newItem.medida || !this.newItem.costo || !this.newItem.precioVenta) {
        alert('Por favor complete todos los campos');
        return;
      }

      const total = this.newItem.kilos * this.newItem.costo;
      this.items.push({
        kilos: this.newItem.kilos,
        medida: this.newItem.medida,
        costo: this.newItem.costo,
        total
      });

      // Agregar directamente a itemsVenta con el precio de venta
      const totalVenta = this.newItem.kilos * this.newItem.precioVenta;
      const ganancia = totalVenta - total;
      this.itemsVenta.push({
        kilosVenta: this.newItem.kilos,
        medida: this.newItem.medida,
        precioVenta: this.newItem.precioVenta,
        totalVenta,
        ganancia
      });

      // Limpiar el formulario
      this.newItem = {
        kilos: null,
        medida: '',
        costo: null,
        precioVenta: null
      };
    },

    // Método limpiarDatos que faltaba
    limpiarDatos() {
      // Limpiar todos los datos del formulario
      this.items = [];
      this.itemsVenta = [];
      this.saldoAcumuladoAnterior = 0;
      this.cobros = [];
      this.abonos = [];
      this.fechaSeleccionada = this.obtenerFechaActual();
      this.estadoPagado = false;
      this.tieneObservacion = false;
      this.observacion = '';
      this.newItem = {
        kilos: null,
        medida: '',
        costo: null,
        precioVenta: null
      };
      
      // Cargar el saldo acumulado anterior para la fecha actual
      this.loadSaldoAcumuladoAnterior();
    },
    
    // Método loadSaldoAcumuladoAnterior que faltaba
    async loadSaldoAcumuladoAnterior() {
      try {
        this.isSaving = true;
        this.lastSaveMessage = 'Cargando saldo acumulado anterior...';
        this.showSaveMessage = true;
        
        // Obtener el saldo acumulado anterior
        this.saldoAcumuladoAnterior = await this.obtenerSaldoAcumuladoAnterior();
        console.log("Saldo acumulado anterior cargado:", this.saldoAcumuladoAnterior);
        
        this.lastSaveMessage = 'Saldo acumulado anterior cargado correctamente';
        
        // Configurar un temporizador para ocultar el mensaje después de 3 segundos
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
          this.isSaving = false;
        }, 3000);
        
        return this.saldoAcumuladoAnterior;
      } catch (error) {
        console.error("Error al cargar el saldo acumulado anterior:", error);
        this.saldoAcumuladoAnterior = 0;
        this.lastSaveMessage = 'Error al cargar el saldo acumulado anterior';
        this.showSaveMessage = true;
        
        // Configurar un temporizador para ocultar el mensaje después de 3 segundos
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
          this.isSaving = false;
        }, 3000);
        
        return 0;
      }
    },

    // Añadiendo método addCobro
    addCobro() {
      this.cobros.push({
        descripcion: '',
        monto: 0
      });
    },

    // Añadiendo método removeCobro
    removeCobro(index) {
      this.cobros.splice(index, 1);
    },

    // Añadiendo método addAbono
    addAbono() {
      this.abonos.push({
        descripcion: '',
        monto: 0
      });
    },

    // Añadiendo método removeAbono
    async removeAbono(index) {
      try {
        const abono = this.abonos[index];
        
        // Si el abono tiene un ID de abono general, eliminarlo del historial
        if (abono.abonoGeneralId) {
          try {
            // Primero verificar si el abono general existe
            const abonoGeneralRef = doc(db, 'abonosGeneralesOtilioIndependiente', abono.abonoGeneralId);
            const abonoGeneralDoc = await getDoc(abonoGeneralRef);
            
            if (abonoGeneralDoc.exists()) {
              // Eliminar el abono del historial
              await deleteDoc(abonoGeneralRef);
              console.log('Abono eliminado del historial:', abono.abonoGeneralId);
              
              // También eliminar cualquier referencia en otras cuentas
              const cuentasRef = collection(db, 'cuentasOtilioIndependiente');
              const querySnapshot = await getDocs(cuentasRef);
              
              const actualizacionesCuentas = querySnapshot.docs.map(async (docSnapshot) => {
                const cuentaData = docSnapshot.data();
                if (cuentaData.abonos) {
                  const abonosActualizados = cuentaData.abonos.filter(a => a.abonoGeneralId !== abono.abonoGeneralId);
                  
                  // Solo actualizar si hubo cambios en los abonos
                  if (abonosActualizados.length !== cuentaData.abonos.length) {
                    await updateDoc(doc(db, 'cuentasOtilioIndependiente', docSnapshot.id), {
                      abonos: abonosActualizados
                    });
                  }
                }
              });
              
              await Promise.all(actualizacionesCuentas);
            }
          } catch (error) {
            console.error('Error al eliminar abono general:', error);
            throw new Error('Error al eliminar abono del historial');
          }
        }

        // Eliminar el abono de la cuenta actual
        this.abonos.splice(index, 1);
        
        // Guardar los cambios en la cuenta actual
        const id = this.$route.params.id;
        if (id) {
          const cuentaRef = doc(db, 'cuentasOtilioIndependiente', id);
          await updateDoc(cuentaRef, {
            abonos: this.abonos,
            estadoPagado: this.totalDiaActual <= 0
          });
        }

        // Actualizar los saldos acumulados de todas las cuentas
        await this.actualizarCuentasPosteriores(this.fechaSeleccionada);
        
        console.log('Abono eliminado exitosamente');
      } catch (error) {
        console.error('Error al eliminar abono:', error);
        alert('Error al eliminar el abono: ' + error.message);
      }
    },

    // Añadiendo método guardarNota
    async guardarNota() {
      try {
        // Deshabilitar el botón de guardar mientras se procesa
        this.isGuardando = true;
        
        // Validar datos antes de guardar
        if (!this.fechaSeleccionada) {
          throw new Error('La fecha es requerida');
        }

        // Verificar si ya existe una nota para esta fecha antes de continuar
        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';
        
        if (!id || !isEditing) {
          // Solo verificar duplicados si estamos creando una nueva nota
          try {
            const cuentasRef = collection(db, 'cuentasOtilioIndependiente');
            const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              alert('Ya existe una nota registrada para esta fecha. No se puede crear una nueva.');
              this.isGuardando = false;
              return;
            }
          } catch (networkError) {
            console.error('Error de red al verificar notas existentes:', networkError);
            alert('Error de conexión al verificar notas existentes. Por favor, verifica tu conexión a internet e intenta nuevamente.');
            this.isGuardando = false;
            return;
          }
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
        
        let docRef;
        
        if (id && isEditing) {
          // Actualizar documento existente
          docRef = doc(db, 'cuentasOtilioIndependiente', id);
          await updateDoc(docRef, notaData);
          console.log('Documento actualizado exitosamente:', id);
        } else {
          // Verificar si ya existe una nota para esta fecha antes de crear una nueva
          const cuentasRef = collection(db, 'cuentasOtilioIndependiente');
          const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            alert('Ya existe una nota registrada para esta fecha. No se puede crear una nueva.');
            this.isGuardando = false;
            return null;
          }
          
          // Crear nuevo documento
          docRef = await addDoc(collection(db, 'cuentasOtilioIndependiente'), notaData);
          console.log('Nuevo documento creado:', docRef.id);
          
          // Actualizar URL con el nuevo ID
          await this.$router.push({
            name: 'CuentasOtilioIndependiente',
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
        
        // Mejorar los mensajes de error para el usuario
        let errorMessage = 'Error al guardar la nota.';
        
        if (error.code === 'unavailable' || error.code === 'network-request-failed') {
          errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.';
        } else if (error.code === 'permission-denied') {
          errorMessage = 'No tienes permisos para realizar esta operación.';
        } else if (error.code === 'resource-exhausted') {
          errorMessage = 'Se ha excedido el límite de operaciones. Por favor, intenta más tarde.';
        } else if (error.message) {
          errorMessage = `Error al guardar: ${error.message}`;
        }
        
        alert(errorMessage);
      } finally {
        this.isGuardando = false;
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

    // Métodos para observaciones
    agregarObservacion() {
      this.showObservacionModal = true;
    },
    
    guardarObservacion() {
      // Actualizar el estado de tieneObservacion basado en el contenido
      this.tieneObservacion = this.observacion.trim().length > 0;
      
      // Cerrar el modal
      this.showObservacionModal = false;
      
      // Si estamos editando una cuenta existente, guardar los cambios
      if (this.$route.params.id && this.$route.query.edit === 'true') {
        this.handleDataChange();
      }
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
        
        // Si estamos editando una cuenta existente, guardar los cambios
        if (this.$route.params.id && this.$route.query.edit === 'true') {
          this.handleDataChange();
        }
      }
    },
    
    handleDataChange() {
      if (this.$route.params.id && this.$route.query.edit === 'true') {
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = setTimeout(async () => {
          await this.queueSave();
        }, 2000); // Delay de 2 segundos
      }
    },
    
    async queueSave() {
      // Agregar operación a la cola con timestamp
      this.saveQueue.push({
        timestamp: Date.now(),
        operation: async () => {
          if (!this.$route.params.id) {
            // No intentar crear una nueva cuenta automáticamente
            // Solo mostrar un mensaje en la consola
            console.log('No hay ID de cuenta, no se realizará guardado automático');
            return;
          } else {
            await this.autoSaveNota();
          }
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
    
    async autoSaveNota() {
      try {
        const id = this.$route.params.id;
        if (!id) return;
        
        // Preparar los datos para guardar
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
          tieneObservacion: Boolean(this.tieneObservacion),
          observacion: String(this.observacion || ''),
          ultimaActualizacion: new Date().toISOString()
        };

        await updateDoc(doc(db, 'cuentasOtilioIndependiente', id), notaData);
        
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
        console.error('Error en auto-guardado:', error);
        
        // Mejorar los mensajes de error para el usuario
        if (error.code === 'resource-exhausted') {
          this.lastSaveMessage = 'Límite de operaciones excedido. Reintentando...';
          throw error; // Dejar que el sistema de cola maneje el reintento
        } else if (error.code === 'unavailable' || error.code === 'network-request-failed') {
          this.lastSaveMessage = 'Error de conexión al guardar automáticamente';
        } else {
          this.lastSaveMessage = 'Error al guardar automáticamente';
        }
        
        this.showSaveMessage = true;
        
        if (this.saveMessageTimer) {
          clearTimeout(this.saveMessageTimer);
        }
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
        
        throw error;
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

    // Métodos para la manipulación de la tabla
    editField(index, field) {
      this.editingField = { index, field };
      this.$nextTick(() => {
        if (this.$refs.editInput) {
          this.$refs.editInput[0]?.focus();
        }
      });
    },

    finishEditing() {
      this.editingField = { index: null, field: null };
      // Recalcular totales si es necesario
      if (this.items.length > 0) {
        this.items = this.items.map(item => ({
          ...item,
          total: item.kilos * item.costo
        }));
      }
    },

    addNewProduct() {
      if (!this.newProduct.kilosVenta || !this.newProduct.medida || !this.newProduct.precioVenta) {
        alert('Por favor complete todos los campos');
        return;
      }

      const totalVenta = this.newProduct.kilosVenta * this.newProduct.precioVenta;
      this.itemsVenta.push({
        ...this.newProduct,
        totalVenta,
        ganancia: totalVenta - (this.newProduct.kilosVenta * (this.items[this.itemsVenta.length]?.costo || 0))
      });

      this.showAddProductModal = false;
      this.newProduct = {
        kilosVenta: null,
        medida: '',
        precioVenta: null
      };
    },

    calcularTotalVenta(index) {
      const item = this.itemsVenta[index];
      if (item) {
        // Asegurar que los valores sean números
        const kilos = Number(item.kilosVenta) || 0;
        const precio = Number(item.precioVenta) || 0;
        const costoUnitario = Number(this.items[index]?.costo) || 0;
        
        // Calcular total y ganancia
        const totalVenta = kilos * precio;
        const ganancia = totalVenta - (kilos * costoUnitario);
        
        // Actualizar el objeto con los nuevos valores
        this.$set(this.itemsVenta, index, {
          ...item,
          kilosVenta: kilos,
          precioVenta: precio,
          totalVenta: totalVenta,
          ganancia: ganancia
        });
        
        // Guardar silenciosamente después de modificaciones
        if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => {
          this.guardarSilencioso();
        }, 1000);
      }
    },

    async guardarSilencioso() {
      try {
        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';
        
        if (id && isEditing) {
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

          const docRef = doc(db, 'cuentasOtilioIndependiente', id);
          await updateDoc(docRef, notaData);
        }
      } catch (error) {
        console.error('Error al guardar silenciosamente:', error);
      }
    },

    imprimirTablas() {
      window.print();
    },

    removeItem(index) {
      this.items.splice(index, 1);
      this.itemsVenta.splice(index, 1);
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
      this.editingKilosIndex = null;
      this.calcularTotalVenta(this.editingKilosIndex);
    },

    toggleGananciasMobile(index) {
      if (window.innerWidth <= 600) {
        this.selectedRowIndex = this.selectedRowIndex === index ? null : index;
      }
    },

    // ... resto de los métodos existentes
    async loadExistingCuenta(id) {
      try {
        const cuentaRef = doc(db, 'cuentasOtilioIndependiente', id);
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

    async obtenerSaldoAcumuladoAnterior() {
      try {
        const cuentasRef = collection(db, 'cuentasOtilioIndependiente');
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
        const cuentasRef = collection(db, 'cuentasOtilioIndependiente');
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

        // Procesar cada cuenta en orden cronológico
        for (let i = 0; i < cuentasOrdenadas.length; i++) {
          const cuenta = cuentasOrdenadas[i];
          const cuentaRef = doc(db, 'cuentasOtilioIndependiente', cuenta.id);
          
          // Calcular el total del día
          const totalDia = cuenta.totalGeneralVenta +
            (cuenta.cobros || []).reduce((sum, cobro) => sum + (parseFloat(cobro.monto) || 0), 0) -
            (cuenta.abonos || []).reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0);

          // El saldo acumulado es el saldo anterior más el total del día
          saldoAcumulado = saldoAcumulado + totalDia;
          
          // Actualizar la cuenta
          await updateDoc(cuentaRef, {
            saldoAcumuladoAnterior: i === 0 ? 0 : cuentasOrdenadas[i-1].nuevoSaldoAcumulado,
            nuevoSaldoAcumulado: saldoAcumulado,
            estadoPagado: saldoAcumulado <= 0
          });

          // Si la cuenta está pagada, reiniciar el saldo acumulado
          if (saldoAcumulado <= 0) {
            saldoAcumulado = 0;
          }
        }
      } catch (error) {
        console.error('Error al actualizar cuentas posteriores:', error);
        throw error;
      }
    },

    // ... resto de los métodos existentes

    // Añadiendo métodos que faltan
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

    actualizarItemsVenta() {
      const itemsVentaActuales = [...this.itemsVenta];
      
      this.itemsVenta = this.items.map((item, index) => {
        const itemVentaExistente = itemsVentaActuales[index] || {};
        const precioVenta = Number(itemVentaExistente.precioVenta) || 0;
        
        return {
          kilosVenta: Number(item.kilos) || 0,
          medida: item.medida,
          precioVenta: precioVenta,
          totalVenta: (Number(item.kilos) || 0) * precioVenta,
          ganancia: ((Number(item.kilos) || 0) * precioVenta) - 
                    ((Number(item.kilos) || 0) * (Number(item.costo) || 0))
        };
      });
    },

    async crearNuevaCuenta() {
      try {
        console.log('Iniciando creación de nueva cuenta...');
        this.isGuardando = true;
        this.lastSaveMessage = 'Creando nueva cuenta...';
        this.showSaveMessage = true;
        
        // Verificar si ya existe una nota para esta fecha
        const cuentasRef = collection(db, 'cuentasOtilioIndependiente');
        console.log('Referencia a la colección creada:', cuentasRef);
        
        const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
        console.log('Query construida para fecha:', this.fechaSeleccionada);
        
        const querySnapshot = await getDocs(q);
        console.log('Query snapshot obtenido:', querySnapshot.size, 'documentos encontrados');

        if (!querySnapshot.empty) {
          this.isGuardando = false;
          this.lastSaveMessage = 'Ya existe una nota para esta fecha';
          this.showSaveMessage = true;
          setTimeout(() => {
            this.showSaveMessage = false;
          }, 3000);
          return null;
        }

        // Obtener el saldo acumulado anterior
        console.log('Obteniendo saldo acumulado anterior...');
        // Verificar si ya tenemos el saldo cargado
        if (this.saldoAcumuladoAnterior === 0 || this.saldoAcumuladoAnterior === null) {
          this.lastSaveMessage = 'Cargando saldo acumulado anterior...';
          this.saldoAcumuladoAnterior = await this.obtenerSaldoAcumuladoAnterior();
        }
        console.log('Saldo anterior obtenido:', this.saldoAcumuladoAnterior);

        // Preparar los datos iniciales
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: this.items || [],
          itemsVenta: this.itemsVenta || [],
          saldoAcumuladoAnterior: this.saldoAcumuladoAnterior || 0,
          cobros: this.cobros || [],
          abonos: this.abonos || [],
          totalGeneral: this.totalGeneral || 0,
          totalGeneralVenta: this.totalGeneralVenta || 0,
          nuevoSaldoAcumulado: 0,
          estadoPagado: false,
          tieneObservacion: Boolean(this.tieneObservacion),
          observacion: String(this.observacion || ''),
          ultimaActualizacion: new Date().toISOString()
        };

        console.log('Datos preparados para crear nueva cuenta:', notaData);
        this.lastSaveMessage = 'Guardando nueva cuenta...';

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
          this.lastSaveMessage = 'Cuenta creada exitosamente';
          
          setTimeout(() => {
            this.showSaveMessage = false;
            this.isGuardando = false;
          }, 2000);
          
          await this.$router.push({
            name: 'CuentasOtilioIndependiente',
            params: { id: docRef.id },
            query: { edit: 'true' }
          });

          // Cargar los datos de la nueva cuenta
          console.log('Cargando datos de la nueva cuenta...');
          await this.loadExistingCuenta(docRef.id);

          return docRef.id;
        } catch (firestoreError) {
          console.error('Error específico de Firestore:', firestoreError);
          this.isGuardando = false;
          this.lastSaveMessage = `Error: ${firestoreError.message}`;
          this.showSaveMessage = true;
          setTimeout(() => {
            this.showSaveMessage = false;
          }, 3000);
          throw new Error(`Error al crear el documento en Firestore: ${firestoreError.message}`);
        }
      } catch (error) {
        console.error('Error detallado al crear nueva cuenta:', error);
        this.isGuardando = false;
        this.lastSaveMessage = `Error: ${error.message}`;
        this.showSaveMessage = true;
        setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
        throw error;
      }
    },
  },
  created() {
    const id = this.$route.params.id;
    const isEditing = this.$route.query.edit === 'true';
    const isNewRoute = this.$route.path === '/cuentas-otilio-independiente/nueva';
    
    if (id && isEditing) {
      this.loadExistingCuenta(id);
    } else if (isNewRoute) {
      // Si estamos en la ruta de nueva cuenta, crear automáticamente
      this.$nextTick(async () => {
        try {
          // Limpiar datos primero
          this.limpiarDatos();
          
          // Esperar a que se cargue el saldo acumulado anterior
          await this.loadSaldoAcumuladoAnterior();
          
          // Esperar un momento para asegurar que los datos estén actualizados
          setTimeout(async () => {
            // Crear nueva cuenta automáticamente
            const docId = await this.crearNuevaCuenta();
            if (docId) {
              console.log('Nueva cuenta creada automáticamente con ID:', docId);
            }
          }, 800); 
        } catch (error) {
          console.error('Error al crear nueva cuenta automáticamente:', error);
        }
      });
    } else {
      // Si no estamos editando, cargar el saldo acumulado anterior
      this.limpiarDatos();
    }
  },
  watch: {
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
    'newItem.kilos': 'handleDataChange',
    'newItem.medida': 'handleDataChange',
    'newItem.costo': 'handleDataChange',
    observacion: 'handleDataChange'
  },
  beforeUnmount() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    if (this.saveMessageTimer) {
      clearTimeout(this.saveMessageTimer);
    }
    // Intentar procesar cualquier guardado pendiente
    if (this.saveQueue.length > 0) {
      this.processSaveQueue();
    }
  }
};
</script>

<style scoped>
/* Estilos base */
.cuentas-otilio-container {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #fff9e6;
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

.input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: nowrap;
  align-items: center;
}

.input-row button {
  padding: 10px 20px;
  height: 40px;
  white-space: nowrap;
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
  border-color: #ffd700;
  outline: none;
}

button {
  padding: 10px 20px;
  background-color: #ffd700;
  color: black;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

button:hover {
  background-color: #ffed4a;
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
  background-color: #ffd700;
  color: black;
}

tr:nth-child(even) {
  background-color: #fff9e6;
}

tr:hover {
  background-color: #fff5cc;
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
  background-color: #fff5cc;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ganancia-del-dia h3 {
  margin-bottom: 10px;
  color: black;
}

.ganancia-positiva,
.ganancia-negativa {
  font-weight: bold;
  font-size: 15pt;
}

.ganancia-positiva {
  color: #006400;
  font-weight: bold;
}

.ganancia-negativa {
  color: #cc0000;
  font-weight: bold;
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
  color: black;
  background-color: #ffd700;
}

.no-pagado {
  color: white;
  background-color: #cc0000;
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
  color: #000000;
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
  gap: 10px;
  margin: 10px 0;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.checkbox-group input[type="checkbox"] {
  margin: 0;
}

.checkbox-group label {
  margin: 0;
  cursor: pointer;
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

.modal-content textarea {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.btn-guardar {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancelar {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
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

/* Estilos de mensaje de guardado automático */
.auto-save-message {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  z-index: 1001;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.btn-agregar-observacion {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-agregar-observacion:hover {
  background-color: #45a049;
  transform: translateY(-2px);
}

.btn-agregar-observacion i {
  font-size: 12px;
}

.observacion-existente {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  border-left: 4px solid #4CAF50;
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
}

.observacion-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-editar {
  background-color: #2196F3;
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
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-weight: bold;
}

.btn-eliminar:hover {
  background-color: #d32f2f;
  transform: scale(1.1);
}

.observacion-texto {
  margin: 5px 0 0 0;
  white-space: pre-wrap;
}

.precios-button-container {
  display: flex;
  justify-content: center;
  margin: 15px 0;
}
</style> 