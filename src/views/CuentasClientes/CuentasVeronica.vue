<template>
  <div class="cuentas-veronica-container">
    <div v-if="isSaving && !showSaveMessage" class="auto-save-indicator">
      <span class="save-dot"></span> Guardando...
    </div>
    <div class="back-button-container">
      <BackButton to="/cuentas-veronica" />
      <PreciosHistorialModal clienteActual="veronica" />
      <StashModalV2 cliente="veronica" />
    </div>
    <h1>Cuentas Veronica</h1>
    
    <div class="precios-button-container">
      <PreciosClienteButton clienteId="veronica" />
    </div>
    
    <div class="fecha-actual" :class="{ 'bloque-sin-nota': faltaNotaVeronica }">
      <div class="fecha-input">
        <input 
          type="date" 
          v-model="fechaSeleccionada" 
          :class="{ 'fecha-sin-nota': faltaNotaVeronica }"
          :title="faltaNotaVeronica ? 'Hay embarque registrado sin nota para esta fecha' : ''"
          :disabled="notaBloqueada"
        >
      </div>
      <div 
        class="fecha-display" 
        :class="{ 'fecha-sin-nota': faltaNotaVeronica }"
        :title="faltaNotaVeronica ? 'Hay embarque registrado sin nota para esta fecha' : ''"
      >
        {{ fechaFormateada }}
      </div>
      <p v-if="faltaNotaVeronica" class="alerta-sin-nota">
        Existe un embarque de Verónica sin nota para este día.
      </p>
    </div>

    <div class="nota-lock card">
      <div class="nota-lock-info">
        <span class="nota-lock-label">Edición de nota:</span>
        <span :class="['nota-lock-status', notaBloqueada ? 'bloqueada' : 'desbloqueada']">
          {{ notaBloqueada ? 'Bloqueada' : 'Desbloqueada' }}
        </span>
      </div>
      <button
        class="nota-lock-btn"
        @click="toggleBloqueoNota"
      >
        {{ notaBloqueada ? 'Desbloquear edición' : 'Bloquear edición' }}
      </button>
      <p class="nota-lock-help">
        El bloqueo impide cambios en kilos, medidas, costos y fletes. Los abonos siguen editables.
      </p>
    </div>
  
    <div class="input-section card">
      <h2>Ingresar Datos</h2>
      <div class="input-row">
        <input v-model.number="newItem.kilos" type="number" placeholder="Kilos" inputmode="decimal" pattern="[0-9]*" class="responsive-input" :disabled="notaBloqueada">
        <input v-model="newItem.medida" type="text" placeholder="Medida" class="responsive-input" :disabled="notaBloqueada">
        <input v-model.number="newItem.costo" type="number" placeholder="Costo" inputmode="decimal" pattern="[0-9]*" class="responsive-input" :disabled="notaBloqueada">
        <input v-model.number="newItem.precioVenta" type="number" placeholder="Precio Venta" inputmode="decimal" pattern="[0-9]*" class="responsive-input" :disabled="notaBloqueada">
        <button @click="addItem" :disabled="notaBloqueada">Agregar</button>
      </div>
    </div>
  
    <div class="table-card table-responsive">
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
              :disabled="notaBloqueada"
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
              :disabled="notaBloqueada"
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
              :disabled="notaBloqueada"
            >
          </td>
          <td>${{ formatNumber(item.total) }}</td>
          <td class="action-column desktop-only">
            <button @click="removeItem(index)" class="delete-btn" :disabled="notaBloqueada">Eliminar</button>
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
    </div>
  
    <h2>Precios de Venta</h2>
    <div class="add-product-button">
      <button @click="showAddProductModal = true" :disabled="notaBloqueada">Agregar Producto</button>
    </div>
    <div class="table-card table-responsive">
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
              :disabled="notaBloqueada"
            >
          </td>
          <td>{{ item.medida }}</td>
          <td>
            <input v-model.number="item.precioVenta" type="number" @input="calcularTotalVenta(index)" class="precio-venta-input" inputmode="decimal" pattern="[0-9]*" :disabled="notaBloqueada">
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
    </div>
  
    <div class="ganancia-del-dia">
      <h3>Ganancia del Día</h3>
      <p :class="{ 'ganancia-positiva': gananciaDelDia > 0, 'ganancia-negativa': gananciaDelDia < 0 }">
        ${{ formatNumber(gananciaDelDia) }}
      </p>
    </div>
  
    <h2>Saldo pendiente</h2>
    <div class="saldo-pendiente card">
      <div class="input-row">
        <span>Saldo Acumulado Anterior: ${{ formatNumber(saldoAcumuladoAnterior) }}</span>
      </div>
      <div class="input-row" v-for="(cobro, index) in cobros" :key="index">
        <input v-model="cobro.descripcion" type="text" placeholder="Flete" class="responsive-input" :disabled="notaBloqueada">
        <input v-model="cobro.monto" type="number" placeholder="Monto" class="responsive-input" :disabled="notaBloqueada">
        <button @click="removeCobro(index)" class="delete-btn" :disabled="notaBloqueada">Eliminar</button>
      </div>
      <button @click="addCobro" class="add-btn" :disabled="notaBloqueada">Agregar Flete</button>
    </div>
  
    <h2>Abonos</h2>
    <div class="abonos card">
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
    <!-- Modal para acciones móviles -->
    <div v-if="showMobileActions" class="mobile-actions-modal">
      <button @click="editItem(selectedItemIndex)" class="edit-btn" :disabled="notaBloqueada">Editar</button>
      <button @click="removeItem(selectedItemIndex)" class="delete-btn" :disabled="notaBloqueada">Eliminar</button>
      <button @click="cancelMobileActions">Cancelar</button>
    </div>

    <!-- Modal para edición de item -->
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

    <!-- Modal para agregar nuevo producto -->
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
    <div v-if="showSaveMessage && lastSaveMessage && lastSaveMessage !== 'Guardado automáticamente'" class="auto-save-message">
      {{ lastSaveMessage }}
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModalV2 from '@/components/StashModalV2.vue';
import PreciosClienteButton from '@/components/PreciosClienteButton.vue';
import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';

export default {
  name: 'CuentasVeronica',
  components: {
    BackButton,
    PreciosHistorialModal,
    StashModalV2,
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
      fechaSeleccionada: this.normalizarFechaDesdeRuta(this.$route?.query?.fecha) || this.obtenerFechaActual(),
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
      saveMinInterval: 5000, // Aumentar a 5 segundos mínimo entre guardados
      tieneObservacion: false,
      showObservacionModal: false,
      observacion: '',
      isGuardando: false,
      lastSaveMessage: '',
      showSaveMessage: false,
      saveMessageTimer: null,
      faltaNotaVeronica: false,
      notaBloqueada: true,
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
      return this.nuevoSaldoAcumulado <= 0 ? 'Pagado' : 'No Pagado';
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
  watch: {
    fechaSeleccionada: {
      immediate: true,
      handler: async function() {
        await this.loadSaldoAcumuladoAnterior();
        await this.verificarNotaFaltante();
        this.handleDataChange();
      }
    },
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
    saldoAcumuladoAnterior: {
      handler: 'handleDataChange'
    },
    'newItem.kilos': 'handleDataChange',
    'newItem.medida': 'handleDataChange',
    'newItem.costo': 'handleDataChange',
    observacion: 'handleDataChange'
  },
  async mounted() {
    console.log("Mounted ejecutado", this.$route.params, this.$route.query);
    const id = this.$route.params.id;
    const isEditing = this.$route.query.edit === 'true';
    if (id && isEditing) {
      console.log("Iniciando carga de cuenta existente");
      await this.loadExistingCuenta(id);
    } else {
      console.log("Cargando saldo acumulado anterior para nueva cuenta");
      await this.loadSaldoAcumuladoAnterior();
    }
    await this.verificarNotaFaltante();
  },
  methods: {
    async verificarNotaFaltante() {
      try {
        // Primero validar si ya existe una nota registrada para la fecha seleccionada
        const cuentasRef = collection(db, 'cuentasVeronica');
        const notaExistente = await getDocs(
          query(cuentasRef, where('fecha', '==', this.fechaSeleccionada), limit(1))
        );

        if (!notaExistente.empty) {
          this.faltaNotaVeronica = false;
          return;
        }

        // Buscar embarques del mismo día que incluyan productos o crudos de Veronica
        const embarquesRef = collection(db, 'embarques');
        const embarquesSnapshot = await getDocs(
          query(embarquesRef, where('fecha', '==', this.fechaSeleccionada))
        );

        let existeEmbarqueVeronica = false;

        for (const docSnap of embarquesSnapshot.docs) {
          const data = docSnap.data() || {};
          const clientes = data.clientes || [];
          const productosRaiz = data.productos || [];

          const clienteConDatos = clientes.some(cliente => {
            const clienteId = (cliente.id ?? cliente.clienteId ?? '').toString();
            const nombreCliente = (cliente.nombre || '').toLowerCase();
            const esVeronica = clienteId === '5' || nombreCliente.includes('veronica') || nombreCliente.includes('lorena');
            const tieneProductos = Array.isArray(cliente.productos) && cliente.productos.some(p => p && (p.medida || (Array.isArray(p.kilos) && p.kilos.some(k => Number(k) > 0))));
            const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
            return esVeronica && (tieneProductos || tieneCrudos);
          });

          const productoSueltos = productosRaiz.some(producto => {
            const clienteId = (producto.clienteId ?? producto.cliente ?? '').toString();
            const tieneContenido = producto && (producto.medida || (Array.isArray(producto.kilos) && producto.kilos.some(k => Number(k) > 0)));
            return clienteId === '5' && tieneContenido;
          });

          if (clienteConDatos || productoSueltos) {
            existeEmbarqueVeronica = true;
            break;
          }
        }

        this.faltaNotaVeronica = existeEmbarqueVeronica;
      } catch (error) {
        console.error('Error al verificar nota faltante de Veronica:', error);
        this.faltaNotaVeronica = false;
      }
    },
    async loadExistingCuenta(id) {
      try {
        console.log("Cargando cuenta con ID:", id);
        const cuentaRef = doc(db, 'cuentasVeronica', id);
        const cuentaDoc = await getDoc(cuentaRef);
        if (cuentaDoc.exists()) {
          const data = cuentaDoc.data();
          console.log("Datos de la cuenta cargados:", data);

          this.$nextTick(() => {
            this.items = data.items || [];
            this.saldoAcumuladoAnterior = data.saldoAcumuladoAnterior || 0;
            this.cobros = data.cobros || [];
            this.abonos = data.abonos || [];
            this.fechaSeleccionada = data.fecha || this.obtenerFechaActual();
            this.notaBloqueada = data.notaBloqueada !== undefined ? data.notaBloqueada : true;
            
            // Cargar observaciones sin abrir el modal
            this.showObservacionModal = false; // Asegurar que el modal esté cerrado
            this.tieneObservacion = data.tieneObservacion || false;
            this.observacion = data.observacion || '';
            
            // Cargar los itemsVenta con los precios de venta guardados
            this.itemsVenta = data.itemsVenta || this.items.map(item => ({
              ...item,
              precioVenta: item.precioVenta || 0,
              totalVenta: (item.precioVenta || 0) * item.kilos,
              kilosVenta: item.kilos
            }));
            
            // Asegurarse de que los totales se calculen correctamente
            this.actualizarItemsVenta();
            
            console.log("Estado actualizado con $nextTick:", {
              items: this.items,
              saldoAcumuladoAnterior: this.saldoAcumuladoAnterior,
              cobros: this.cobros,
              abonos: this.abonos,
              fechaSeleccionada: this.fechaSeleccionada,
              itemsVenta: this.itemsVenta,
              tieneObservacion: this.tieneObservacion,
              observacion: this.observacion,
              notaBloqueada: this.notaBloqueada
            });
          });
        } else {
          console.error("No se encontró la cuenta con el ID proporcionado");
        }
      } catch (error) {
        console.error("Error al cargar la cuenta existente: ", error);
      }
    },
    async loadSaldoAcumuladoAnterior() {
      try {
        this.saldoAcumuladoAnterior = await this.obtenerSaldoAcumuladoAnterior();
        console.log("Saldo acumulado anterior cargado:", this.saldoAcumuladoAnterior);
      } catch (error) {
        console.error("Error al cargar el saldo acumulado anterior:", error);
        this.saldoAcumuladoAnterior = 0;
      }
    },
    async obtenerSaldoAcumuladoAnterior() {
      try {
        const cuentasRef = collection(db, 'cuentasVeronica');
        const q = query(
          cuentasRef,
          where('fecha', '<', this.fechaSeleccionada),
          orderBy('fecha', 'desc'),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const ultimaCuenta = querySnapshot.docs[0].data();
          return ultimaCuenta.nuevoSaldoAcumulado || 0;
        }
        
        return 0;
      } catch (error) {
        console.error('Error al obtener saldo acumulado anterior:', error);
        return 0;
      }
    },
    async actualizarCuentasPosteriores(fechaActual) {
      try {
        const cuentasRef = collection(db, 'cuentasVeronica');
        const q = query(
          cuentasRef,
          where('fecha', '>=', fechaActual),
          orderBy('fecha', 'asc'),
          limit(50) // Limitar la cantidad de documentos a procesar
        );

        const querySnapshot = await getDocs(q);
        const cuentasParaActualizar = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        let saldoAcumulado = this.nuevoSaldoAcumulado;

        // Usar Promise.all para actualizar las cuentas en paralelo
        await Promise.all(cuentasParaActualizar.map(async (cuenta) => {
          const totalDia = cuenta.totalGeneralVenta -
            (cuenta.cobros || []).reduce((sum, cobro) => sum + (parseFloat(cobro.monto) || 0), 0) -
            (cuenta.abonos || []).reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0);

          saldoAcumulado = saldoAcumulado + totalDia;
          const estadoPagado = saldoAcumulado <= 0;
          const saldoNormalizado = estadoPagado ? 0 : saldoAcumulado;
          
          if (saldoAcumulado <= 0) {
            saldoAcumulado = 0;
          }

          return updateDoc(doc(db, 'cuentasVeronica', cuenta.id), {
            saldoAcumuladoAnterior: cuenta.id === this.$route.params.id ? this.saldoAcumuladoAnterior : saldoAcumulado - totalDia,
            nuevoSaldoAcumulado: saldoNormalizado,
            estadoPagado: estadoPagado
          });
        }));
      } catch (error) {
        console.error('Error al actualizar cuentas posteriores:', error);
        throw error;
      }
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
    async addItem() {
      if (this.notaBloqueada) {
        this.lastSaveMessage = 'Desbloquea la nota para editar kilos o medidas';
        this.showSaveMessage = true;
        if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
        return;
      }
      if (!this.newItem.kilos || !this.newItem.medida || !this.newItem.costo || !this.newItem.precioVenta) {
        if (this.lastSaveMessage !== 'Por favor complete todos los campos' || !this.showSaveMessage) {
          this.lastSaveMessage = 'Por favor complete todos los campos';
          this.showSaveMessage = true;
          if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
          this.saveMessageTimer = setTimeout(() => {
            this.showSaveMessage = false;
          }, 3000);
        }
        return;
      }

      try {
        const total = this.newItem.kilos * this.newItem.costo;
        this.items.push({
          kilos: this.newItem.kilos,
          medida: this.newItem.medida,
          costo: this.newItem.costo,
          total
        });

        // Verificar si necesitamos ajustar los kilos para la tabla de venta
        let kilosVenta = this.newItem.kilos;
        
        // Usar la función calcularKilosCrudos para ajustar de 19 a 20 kg si es necesario
        const kilosAjustados = this.calcularKilosCrudos(this.newItem.medida, this.newItem.kilos, false);
        if (kilosAjustados !== this.newItem.kilos) {
          kilosVenta = kilosAjustados;
        }

        // Agregar directamente a itemsVenta con el precio de venta y los kilos ajustados
        const totalVenta = kilosVenta * this.newItem.precioVenta;
        const ganancia = totalVenta - total;
        this.itemsVenta.push({
          kilosVenta: kilosVenta,
          medida: this.newItem.medida,
          precioVenta: this.newItem.precioVenta,
          totalVenta,
          ganancia
        });

        this.newItem = {
          kilos: null,
          medida: '',
          costo: null,
          precioVenta: null
        };

        // Encolar el guardado
        await this.queueSave();

      } catch (error) {
        console.error('Error al guardar el item:', error);
        if (this.lastSaveMessage !== 'Hubo un problema al guardar. Por favor, intente nuevamente.' || !this.showSaveMessage) {
          this.lastSaveMessage = 'Hubo un problema al guardar. Por favor, intente nuevamente.';
          this.showSaveMessage = true;
          if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
          this.saveMessageTimer = setTimeout(() => {
            this.showSaveMessage = false;
          }, 3000);
        }
        // Revertir los cambios locales si falló el guardado
        this.items.pop();
        this.itemsVenta.pop();
      }
    },
    async crearNuevaCuenta() {
      try {
        // Verificar si ya existe una nota para esta fecha
        const cuentasRef = collection(db, 'cuentasVeronica');
        const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          throw new Error('Ya existe una nota registrada para esta fecha.');
        }

        // Preparar solo los datos esenciales inicialmente
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: this.items,
          itemsVenta: this.itemsVenta,
          saldoAcumuladoAnterior: await this.obtenerSaldoAcumuladoAnterior(),
          cobros: [],
          abonos: [],
          totalGeneral: this.totalGeneral,
          totalGeneralVenta: 0,
          nuevoSaldoAcumulado: this.saldoAcumuladoAnterior,
          estadoPagado: false,
          tieneObservacion: this.tieneObservacion,
          observacion: this.observacion,
          notaBloqueada: this.notaBloqueada,
        };

        const docRef = await addDoc(collection(db, 'cuentasVeronica'), notaData);
        
        // Actualizar la URL
        this.$router.replace({
          name: this.$route.name,
          params: { id: docRef.id },
          query: { edit: 'true' }
        });

        return docRef.id;
      } catch (error) {
        if (error.message === 'Ya existe una nota registrada para esta fecha.') {
          alert(error.message);
        } else {
          console.error('Error al crear nueva cuenta:', error);
          alert('Error al crear la cuenta. Por favor, intente nuevamente.');
        }
        throw error;
      }
    },
    async removeItem(index) {
      try {
        if (this.notaBloqueada) return;
        this.items.splice(index, 1);
        this.itemsVenta.splice(index, 1);
        this.showMobileActions = false;
        
        // Encolar el guardado después de eliminar
        await this.queueSave();
      } catch (error) {
        console.error('Error al eliminar item:', error);
      }
    },
    addCobro() {
      if (this.notaBloqueada) return;
      this.cobros.push({descripcion: 'Flete', monto: 0});
    },
    removeCobro(index) {
      if (this.notaBloqueada) return;
      this.cobros.splice(index, 1);
    },
    addAbono() {
      this.abonos.push({descripcion: '', monto: 0});
    },
    removeAbono(index) {
      this.abonos.splice(index, 1);
    },
    obtenerFechaActual() {
      const fecha = new Date();
      return fecha.getFullYear() + '-' + 
             String(fecha.getMonth() + 1).padStart(2, '0') + '-' + 
             String(fecha.getDate()).padStart(2, '0');
    },
    normalizarFechaDesdeRuta(valor) {
      if (!valor) return null;
      if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
      const fecha = new Date(valor);
      if (Number.isNaN(fecha.getTime())) return null;
      return fecha.toISOString().split('T')[0];
    },
    async guardarNota() {
      try {
        // Deshabilitar el botón de guardar mientras se procesa
        this.isGuardando = true;

        // Calcular el total del día actual
        const totalDia = this.totalGeneralVenta - 
          this.cobros.reduce((sum, cobro) => sum + (parseFloat(cobro.monto) || 0), 0) - 
          this.abonos.reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0);

        // Obtener el saldo acumulado anterior más actualizado
        const saldoAcumuladoActualizado = await this.obtenerSaldoAcumuladoAnterior();
        
        // Calcular el nuevo saldo acumulado
        const nuevoSaldoAcumulado = saldoAcumuladoActualizado + totalDia;
        
        // Verificar si la nota está pagada
        const estaPagada = nuevoSaldoAcumulado <= 0;
        
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: this.items,
          saldoAcumuladoAnterior: saldoAcumuladoActualizado,
          cobros: this.cobros,
          abonos: this.abonos,
          totalGeneral: this.totalGeneral,
          totalGeneralVenta: this.totalGeneralVenta,
          nuevoSaldoAcumulado: estaPagada ? 0 : nuevoSaldoAcumulado,
          gananciaDelDia: this.gananciaDelDia,
          estadoPagado: estaPagada,
          itemsVenta: this.itemsVenta,
          tieneObservacion: this.tieneObservacion,
          observacion: this.observacion,
          notaBloqueada: this.notaBloqueada,
          ultimaActualizacion: new Date().toISOString()
        };

        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';

        if (id && isEditing) {
          // Actualizar nota existente
          await updateDoc(doc(db, 'cuentasVeronica', id), notaData);
          
          // Actualizar saldos de cuentas posteriores en segundo plano
          this.actualizarCuentasPosteriores(this.fechaSeleccionada).catch(console.error);
          
          if (this.lastSaveMessage !== 'Cuenta guardada exitosamente' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Cuenta guardada exitosamente';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
          this.$router.push('/cuentas-veronica');
        } else {
          // Verificar si ya existe una nota para esta fecha
          const cuentasRef = collection(db, 'cuentasVeronica');
          const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            alert('Ya existe una nota registrada para esta fecha. No se puede crear una nueva.');
            return;
          } else {
            // Crear nueva nota
            await addDoc(collection(db, 'cuentasVeronica'), notaData);
            
            // Actualizar saldos de cuentas posteriores en segundo plano
            this.actualizarCuentasPosteriores(this.fechaSeleccionada).catch(console.error);
            
            if (this.lastSaveMessage !== 'Cuenta guardada exitosamente' || !this.showSaveMessage) {
              this.lastSaveMessage = 'Cuenta guardada exitosamente';
              this.showSaveMessage = true;
              if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
              this.saveMessageTimer = setTimeout(() => {
                this.showSaveMessage = false;
              }, 3000);
            }
            this.$router.push('/cuentas-veronica');
          }
        }
      } catch (error) {
        console.error('Error al guardar la cuenta:', error);
        if (this.lastSaveMessage !== 'Error al guardar la cuenta' || !this.showSaveMessage) {
          this.lastSaveMessage = 'Error al guardar la cuenta';
          this.showSaveMessage = true;
          if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
          this.saveMessageTimer = setTimeout(() => {
            this.showSaveMessage = false;
          }, 3000);
        }
      } finally {
        this.isGuardando = false;
      }
    },
    iniciarPresion(index) {
      this.presionTimer = setTimeout(() => {
        this.showMobileActionsModal(index);
      }, 500); // 500ms de presión para activar el modal
    },
    finalizarPresion() {
      clearTimeout(this.presionTimer);
    },
    showMobileActionsModal(index) {
      this.selectedItemIndex = index;
      this.showMobileActions = true;
    },
    cancelMobileActions() {
      this.showMobileActions = false;
      this.selectedItemIndex = null;
    },
    editItem(index) {
      if (this.notaBloqueada) return;
      this.editingIndex = index;
      this.editingItem = { ...this.items[index] };
      this.showEditModal = true;
    },
    saveEditedItem() {
      if (this.notaBloqueada) return;
      if (this.editingItem.kilos && this.editingItem.medida && this.editingItem.costo) {
        this.editingItem.total = this.editingItem.kilos * this.editingItem.costo;
        this.items[this.editingIndex] = { ...this.editingItem };
        this.actualizarItemsVenta();
        this.showEditModal = false;
        this.editingItem = null;
        this.editingIndex = null;
      }
    },
    cancelEdit() {
      this.showEditModal = false;
      this.editingItem = null;
      this.editingIndex = null;
    },
    imprimirTablas() {
      const contenidoImprimir = `
        <html>
          <head>
            <title>Cuentas Veronica - ${this.fechaFormateada}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 14pt;
                line-height: 1.4;
                max-width: 800px;
                margin: 0 auto;
                padding: 15px;
                text-align: center;
              }
              h1 { 
                font-size: 22pt; 
                margin-bottom: 15px; 
                color: #ff8c00;
              }
              h2 { 
                font-size: 18pt; 
                margin-top: 20px; 
                margin-bottom: 10px; 
                color: #ff8c00;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                font-size: 13pt;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px 10px;
                text-align: left;
              }
              th { 
                background-color: #ff8c00; 
                color: white;
                font-weight: bold;
                font-size: 13pt;
              }
              .total { 
                font-weight: bold; 
                font-size: 13pt;
              }
              .total td:first-child { 
                text-align: right; 
              }
              .highlight {
                background-color: #fff8f0;
                font-weight: bold;
              }
              @media print {
                body { 
                  font-size: 14pt; 
                }
                h1 { 
                  font-size: 22pt; 
                }
                h2 { 
                  font-size: 18pt; 
                }
                table { 
                  font-size: 13pt; 
                }
                th, td {
                  padding: 8px 10px;
                }
              }
            </style>
          </head>
          <body>
            <h1>Cuentas Veronica - ${this.fechaFormateada}</h1>
            
            <h2>Precios de Venta</h2>
            <table>
              <thead>
                <tr>
                  <th>Kilos</th>
                  <th>Medida</th>
                  <th>Precio de Venta</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${this.itemsVenta.map(item => `
                  <tr>
                    <td>${this.formatNumber(item.kilosVenta)}</td>
                    <td>${item.medida}</td>
                    <td>$${this.formatNumber(item.precioVenta)}</td>
                    <td>$${this.formatNumber(item.totalVenta)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total">
                  <td colspan="3">Total Venta</td>
                  <td>$${this.formatNumber(this.totalGeneralVenta)}</td>
                </tr>
              </tfoot>
            </table>

            <h2>Resumen de saldo</h2>
            <table>
              <tr>
                <td>Saldo Acumulado Anterior</td>
                <td>$${this.formatNumber(this.saldoAcumuladoAnterior)}</td>
              </tr>
              <tr>
                <td>Saldo Hoy</td>
                <td>$${this.formatNumber(this.totalGeneralVenta)}</td>
              </tr>
              ${this.cobros.map(cobro => `
                <tr>
                  <td>${cobro.descripcion}</td>
                  <td>-$${this.formatNumber(cobro.monto)}</td>
                </tr>
              `).join('')}
              ${this.abonos.map(abono => `
                <tr>
                  <td>${abono.descripcion} (Abono)</td>
                  <td>-$${this.formatNumber(abono.monto)}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>Total</td>
                <td>$${this.formatNumber(this.totalDiaActual)}</td>
              </tr>
              <tr class="highlight">
                <td>Nuevo Saldo Acumulado</td>
                <td>$${this.formatNumber(this.nuevoSaldoAcumulado)}</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const ventanaImprimir = window.open('', '_blank');
      ventanaImprimir.document.write(contenidoImprimir);
      ventanaImprimir.document.close();
      ventanaImprimir.print();
    },
    actualizarItemsVenta() {
      this.itemsVenta = this.itemsVenta.map((itemVenta, index) => {
        const itemCosto = this.items[index];
        const totalVenta = (itemVenta.precioVenta || 0) * (itemVenta.kilosVenta || 0);
        const totalCosto = itemCosto ? itemCosto.total : 0;
        const ganancia = totalVenta - totalCosto;
        
        return {
          ...itemVenta,
          totalVenta,
          ganancia
        };
      });
    },
    calcularTotalVenta(index) {
      const item = this.itemsVenta[index];
      if (!item) return;
      
      try {
        const kilos = parseFloat(item.kilosVenta) || 0;
        const precio = parseFloat(item.precioVenta) || 0;
        item.totalVenta = kilos * precio;
        
        const itemCosto = this.items[index];
        const totalCosto = itemCosto ? (itemCosto.total || 0) : 0;
        item.ganancia = (item.totalVenta || 0) - totalCosto;
        
        this.actualizarItemsVenta();
        
        // Encolar el guardado después del cálculo
        this.queueSave();
      } catch (error) {
        console.error('Error al calcular total de venta:', error);
      }
    },
    removeItemVenta(index) {
      this.itemsVenta.splice(index, 1);
    },
    editKilos(index) {
      if (this.notaBloqueada) return;
      this.editingKilosIndex = index;
      this.$nextTick(() => {
        if (this.$refs.kilosInput && this.$refs.kilosInput[0]) {
          this.$refs.kilosInput[0].focus();
        }
      });
    },
    finishEditingKilos() {
      if (this.notaBloqueada) return;
      const index = this.editingKilosIndex;
      if (index !== null) {
        try {
          const item = this.itemsVenta[index];
          const itemCosto = this.items[index];
          
          // Verificar si necesitamos ajustar los kilos para la tabla de venta
          if (itemCosto) {
            // Usar la función calcularKilosCrudos para ajustar de 19 a 20 kg si es necesario
            const kilosAjustados = this.calcularKilosCrudos(item.medida, parseFloat(item.kilosVenta) || itemCosto.kilos, false);
            item.kilosVenta = kilosAjustados;
          } else {
            item.kilosVenta = parseFloat(item.kilosVenta) || 0;
          }
          
          this.calcularTotalVenta(index);
          
          // Encolar el guardado después de la edición
          this.queueSave();
        } catch (error) {
          console.error('Error al finalizar edición de kilos:', error);
        }
      }
      this.editingKilosIndex = null;
    },
    startLongPress(index, field) {
      if (this.notaBloqueada) return;
      this.longPressTimer = setTimeout(() => {
        this.editField(index, field);
      }, 500); // 500ms para activar la edición
    },
    endLongPress() {
      clearTimeout(this.longPressTimer);
    },
    editField(index, field) {
      if (this.notaBloqueada) return;
      this.editingField = { index, field };
      this.$nextTick(() => {
        if (this.$refs.editInput && this.$refs.editInput[0]) {
          this.$refs.editInput[0].focus();
        }
      });
    },
    finishEditing() {
      if (this.notaBloqueada) return;
      const { index, field } = this.editingField;
      if (index !== null && field !== null) {
        try {
          const item = this.items[index];
          if (field === 'kilos' || field === 'costo') {
            item[field] = parseFloat(item[field]) || 0;
          }
          item.total = item.kilos * item.costo;
          this.actualizarItemsVenta();
          
          // Encolar el guardado después de la edición
          this.queueSave();
        } catch (error) {
          console.error('Error al finalizar edición:', error);
        }
      }
      this.editingField = { index: null, field: null };
    },
    toggleGananciasMobile(index) {
      if (window.innerWidth <= 600) {
        this.selectedRowIndex = this.selectedRowIndex === index ? null : index;
      }
    },
    addNewProduct() {
      if (this.notaBloqueada) {
        this.lastSaveMessage = 'Desbloquea la nota para agregar medidas';
        this.showSaveMessage = true;
        if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
        this.saveMessageTimer = setTimeout(() => {
          this.showSaveMessage = false;
        }, 3000);
        return;
      }
      if (!(this.newProduct.kilosVenta && this.newProduct.medida && this.newProduct.precioVenta)) {
        if (this.lastSaveMessage !== 'Por favor complete todos los campos' || !this.showSaveMessage) {
          this.lastSaveMessage = 'Por favor complete todos los campos';
          this.showSaveMessage = true;
          if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
          this.saveMessageTimer = setTimeout(() => {
            this.showSaveMessage = false;
          }, 3000);
        }
        return;
      }

      if (this.newProduct.kilosVenta && this.newProduct.medida && this.newProduct.precioVenta) {
        // Verificar si necesitamos ajustar los kilos para la tabla de venta
        const kilosAjustados = this.calcularKilosCrudos(this.newProduct.medida, this.newProduct.kilosVenta, false);
        
        const totalVenta = kilosAjustados * this.newProduct.precioVenta;
        this.itemsVenta.push({
          kilosVenta: kilosAjustados,
          medida: this.newProduct.medida,
          precioVenta: this.newProduct.precioVenta,
          totalVenta,
          ganancia: totalVenta // La ganancia será igual al total de venta ya que no tiene costo asociado
        });
        this.showAddProductModal = false;
        this.newProduct = { kilosVenta: null, medida: '', precioVenta: null };
        
        // Encolar el guardado
        this.queueSave();
      } else {
        alert('Por favor, complete todos los campos');
      }
    },
    handleDataChange() {
      if (this.$route.params.id && this.$route.query.edit === 'true') {
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = setTimeout(async () => {
          await this.queueSave();
        }, 2000); // Aumentar el delay a 2 segundos
      }
    },
    async queueSave() {
      // Agregar operación a la cola con timestamp
      this.saveQueue.push({
        timestamp: Date.now(),
        operation: async () => {
          if (!this.$route.params.id) {
            await this.crearNuevaCuenta();
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
      if (!this.$route.params.id) return;

      try {
        // Preparar datos completos para guardar
        const saldoFinal = this.nuevoSaldoAcumulado <= 0 ? 0 : this.nuevoSaldoAcumulado;
        const notaData = {
          items: this.items.map(item => ({
            kilos: item.kilos,
            medida: item.medida,
            costo: item.costo,
            total: item.total
          })),
          itemsVenta: this.itemsVenta.map(item => ({
            kilosVenta: item.kilosVenta,
            medida: item.medida,
            precioVenta: item.precioVenta,
            totalVenta: item.totalVenta,
            ganancia: item.ganancia
          })),
          totalGeneral: this.totalGeneral,
          totalGeneralVenta: this.totalGeneralVenta,
          nuevoSaldoAcumulado: saldoFinal,
          cobros: this.cobros,
          abonos: this.abonos,
          estadoPagado: saldoFinal <= 0,
          tieneObservacion: this.tieneObservacion,
          observacion: this.observacion,
          notaBloqueada: this.notaBloqueada,
          ultimaActualizacion: new Date().toISOString()
        };

        // Guardar en Firestore
        const docRef = doc(db, 'cuentasVeronica', this.$route.params.id);
        await updateDoc(docRef, notaData);

        // Mostrar mensaje solo si no es guardado automático frecuente
        this.lastSaveMessage = '';
        this.showSaveMessage = false;
        // Puedes dejar visible el indicador de "Guardando..." brevemente si quieres feedback visual
      } catch (error) {
        if (error.code === 'resource-exhausted') {
          throw error; // Dejar que el sistema de cola maneje el reintento
        }
        this.lastSaveMessage = 'Error en auto-guardado';
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
    guardarCuenta() {
      this.guardarNota();
    },
    async toggleBloqueoNota() {
      if (!this.$route.params.id) {
        this.notaBloqueada = !this.notaBloqueada;
        return;
      }
      const nuevoEstado = !this.notaBloqueada;
      const mensaje = nuevoEstado
        ? '¿Desbloquear la nota para editar kilos y medidas?'
        : '¿Bloquear la nota para evitar cambios en kilos y medidas?';
      if (!confirm(mensaje)) return;
      try {
        await updateDoc(doc(db, 'cuentasVeronica', this.$route.params.id), {
          notaBloqueada: nuevoEstado,
          ultimaActualizacion: new Date().toISOString()
        });
        this.notaBloqueada = nuevoEstado;
      } catch (error) {
        console.error('Error al actualizar el bloqueo de la nota:', error);
        alert('No se pudo actualizar el bloqueo. Intenta nuevamente.');
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
          
          // Si el segundo número es 19, sustituirlo por 20 solo si NO es para la tabla de costos
          const kiloPorCaja = (kilosPorCaja === 19 && !esParaCostos) ? 20 : kilosPorCaja;
          
          // Calcular kilos totales: cajas * kiloPorCaja
          let kilosCalculados = cajas * kiloPorCaja;
          
          // Sumar el tercer número si existe (formato "6*19+5")
          if (partes.length > 2) {
            kilosCalculados += parseInt(partes[2]) || 0;
          }
          
          return kilosCalculados;
        }
      }
      
      // Si no coincide con ningún formato especial, devolver los kilos originales
      return kilosOriginales;
    },
  },
  beforeUnmount() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    // Intentar procesar cualquier guardado pendiente
    if (this.saveQueue.length > 0) {
      this.processSaveQueue();
    }
  }
}
</script>

<style scoped>
/* Estilos generales */
.cuentas-veronica-container {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #fff8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h1, h2, h3 {
  color: #ff8c00;
}

.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 16px;
  border-left: 4px solid #ff8c00;
}

.nota-lock {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.nota-lock-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.nota-lock-label {
  font-weight: 600;
  color: #555;
}

.nota-lock-status {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
}

.nota-lock-status.bloqueada {
  color: #b71c1c;
  background: #ffebee;
  border-color: #ef9a9a;
}

.nota-lock-status.desbloqueada {
  color: #1b5e20;
  background: #e8f5e9;
  border-color: #a5d6a7;
}

.nota-lock-btn {
  background-color: #6c757d;
}

.nota-lock-btn:hover {
  background-color: #5a6268;
}

.nota-lock-help {
  margin: 0;
  font-size: 13px;
  color: #666;
}

.back-button-container {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, rgba(255,248,240,1) 65%, rgba(255,248,240,0));
  padding-top: 10px;
  padding-bottom: 10px;
}

.back-button-container a,
.back-button-container button {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 16px;
  text-decoration: none;
  color: white;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: none;
  cursor: pointer;
  min-width: 120px;
  text-align: center;
}

.back-button-container a:hover,
.back-button-container button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Colores específicos para cada botón */
.back-button-container a:first-child {
  background-color: #6c757d;
}

.back-button-container a:first-child:hover {
  background-color: #5a6268;
}

.back-button-container button:nth-child(2) {
  background-color: #4CAF50;
}

.back-button-container button:nth-child(2):hover {
  background-color: #45a049;
}

.back-button-container button:last-child {
  background-color: #9c27b0;
}

.back-button-container button:last-child:hover {
  background-color: #7b1fa2;
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
  border: 1px solid #ff8c00;
  border-radius: 4px;
}

.fecha-display {
  font-weight: bold;
  color: #ff8c00;
}

.fecha-sin-nota {
  background-color: #e0e0e0;
  color: #555;
  border-color: #bdbdbd;
}

.alerta-sin-nota {
  margin-top: 8px;
  font-size: 13px;
  color: #555;
  background: #f1f1f1;
  padding: 8px 10px;
  border-radius: 6px;
}

.bloque-sin-nota {
  border-left: 4px solid #bdbdbd;
  padding-left: 10px;
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

.responsive-input {
  width: 100%;
  max-width: 180px;
  padding: 10px;
  border: 1px solid #ff8c00;
  border-radius: 5px;
  transition: border-color 0.3s ease;
  font-size: 15px;
}

.responsive-input:focus {
  border-color: #e07600;
  outline: none;
  box-shadow: 0 0 5px rgba(255, 140, 0, 0.3);
}

button {
  padding: 10px 20px;
  background-color: #ff8c00;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

button:hover {
  background-color: #e07600;
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
  background-color: #ff8c00;
  color: white;
  position: sticky;
  top: 0;
  z-index: 1;
}

tr:nth-child(even) {
  background-color: #fff8f0;
}

tr:hover {
  background-color: #ffe5cc;
}

.total td {
  font-weight: bold;
  background-color: #fff8f0;
}

/* Estilos específicos de tabla */
.tabla-principal th,
.tabla-principal td,
.tabla-venta th,
.tabla-venta td {
  width: auto;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 10px;
}

.table-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  margin-bottom: 20px;
  border-left: 4px solid #ff8c00;
}

/* Estilos de saldo y abonos */
.saldo-pendiente,
.abonos {
  margin-bottom: 20px;
}

.add-btn {
  margin-top: 10px;
  background-color: #ff8c00;
}

.add-btn:hover {
  background-color: #e07600;
}

/* Estilos de botones */
.button-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  flex-wrap: wrap;
  position: sticky;
  bottom: 0;
  z-index: 9;
  background: linear-gradient(0deg, rgba(255,248,240,1) 65%, rgba(255,248,240,0));
  padding-top: 8px;
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
  background-color: #ff8c00;
}

.print-button {
  background-color: #3760b0;
}

.save-button:hover {
  background-color: #e07600;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.print-button:hover {
  background-color: #2c4d8c;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.save-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Estilos de modal */
.modal, .edit-modal, .mobile-actions-modal {
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content, .edit-modal, .mobile-actions-modal {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  animation: fadeIn 0.3s ease;
  border-left: 4px solid #ff8c00;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.btn-agregar-observacion {
  background-color: #ff8c00;
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
  background-color: #e07600;
  transform: translateY(-2px);
}

.observacion-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
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
  background-color: #ff8c00;
  border-radius: 50%;
  margin-right: 8px;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

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

.precios-button-container {
  display: flex;
  justify-content: center;
  margin: 15px 0;
}

.mobile-only { display: none; }
.desktop-only { display: table-cell; }

.ganancia-positiva {
  color: #4CAF50;
  font-weight: bold;
}

.ganancia-negativa {
  color: #f44336;
  font-weight: bold;
}

.ganancia-del-dia {
  text-align: center;
  margin: 20px 0;
  padding: 15px;
  background-color: #fff;
  border-radius: 8px;
  border-left: 4px solid #ff8c00;
}

.precio-venta-input {
  width: 100%;
  padding: 5px;
  border: 1px solid #ff8c00;
  border-radius: 4px;
  font-size: 14px;
}

.precio-venta-input:focus {
  border-color: #e07600;
  outline: none;
  box-shadow: 0 0 3px rgba(255, 140, 0, 0.3);
}

.observacion-existente {
  margin-top: 15px;
  padding: 15px;
  background-color: #fff8f0;
  border-radius: 8px;
  border-left: 4px solid #ff8c00;
}

.observacion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.observacion-titulo {
  font-weight: bold;
  color: #ff8c00;
  margin: 0;
}

.observacion-texto {
  color: #333;
  white-space: pre-wrap;
  margin: 0;
}

.btn-editar {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 5px;
}

.btn-editar:hover {
  background-color: #45a049;
}

.tabla-saldo {
  margin-bottom: 20px;
  border: 2px solid #ff8c00;
}

.tabla-saldo th {
  background-color: #ff8c00;
}

.tabla-saldo .total {
  background-color: #fff8f0;
  font-weight: bold;
}

@media (max-width: 768px) {
  .cuentas-veronica-container {
    padding: 10px;
    width: 100%;
  }

  .back-button-container {
    justify-content: center;
    gap: 10px;
  }

  .back-button-container a,
  .back-button-container button {
    min-width: 100px;
    padding: 8px 15px;
    font-size: 14px;
  }

  .input-row {
    flex-wrap: wrap;
  }

  .responsive-input {
    max-width: 100%;
    margin-bottom: 10px;
  }

  .button-container {
    flex-direction: row;
    gap: 10px;
  }

  .save-button,
  .print-button {
    min-width: 120px;
    padding: 10px 20px;
  }

  .desktop-only { 
    display: none !important; 
  }
  
  .mobile-only { 
    display: table-row; 
  }

  .ganancia-row {
    background-color: #fff8f0;
    font-weight: bold;
  }

  .observacion-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .observacion-buttons {
    margin-top: 10px;
  }
}

@media (max-width: 600px) {
  .mobile-only { display: table-row; }
  .desktop-only { display: none !important; }
}
</style>
