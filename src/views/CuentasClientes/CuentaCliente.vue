<template>
  <div class="cuenta-cliente-container">
    <div v-if="isSaving && !showSaveMessage" class="auto-save-indicator">
      <span class="save-dot"></span> Guardando...
    </div>

    <div class="back-button-container">
      <BackButton :to="config.backPath" />
      <PreciosHistorialModal :clienteActual="config.clienteId" />
      <StashModalV2 :cliente="config.clienteId" />
    </div>
    <h1>{{ config.titulo }}</h1>

    <div class="precios-button-container">
      <PreciosClienteButton :clienteId="config.clienteId" />
    </div>

    <div class="fecha-actual" :class="{ 'bloque-sin-nota': config.features.verificarEmbarques && faltaNotaCliente }">
      <div class="fecha-input">
        <input
          type="date"
          v-model="fechaSeleccionada"
          :class="{ 'fecha-sin-nota': config.features.verificarEmbarques && faltaNotaCliente }"
          :disabled="isNotaLocked"
        >
      </div>
      <div class="fecha-display" :class="{ 'fecha-sin-nota': config.features.verificarEmbarques && faltaNotaCliente }">
        {{ fechaFormateada }}
      </div>
      <p v-if="config.features.verificarEmbarques && faltaNotaCliente" class="alerta-sin-nota">
        Existe un embarque sin nota para este día.
      </p>
    </div>

    <!-- Nota lock — solo Veronica -->
    <div v-if="config.features.notaLock" class="nota-lock card">
      <div class="nota-lock-info">
        <span class="nota-lock-label">Edición de nota:</span>
        <span :class="['nota-lock-status', notaBloqueada ? 'bloqueada' : 'desbloqueada']">
          {{ notaBloqueada ? 'Bloqueada' : 'Desbloqueada' }}
        </span>
      </div>
      <button class="nota-lock-btn" @click="toggleBloqueoNota">
        {{ notaBloqueada ? 'Desbloquear edición' : 'Bloquear edición' }}
      </button>
      <p class="nota-lock-help">
        El bloqueo impide cambios en kilos, medidas, costos y fletes. Los abonos siguen editables.
      </p>
    </div>

    <div class="input-section card">
      <h2>Ingresar Datos</h2>
      <div class="input-row">
        <input v-model.number="newItem.kilos" type="number" placeholder="Kilos" inputmode="decimal" pattern="[0-9]*" class="responsive-input" :disabled="isNotaLocked">
        <input v-model="newItem.medida" type="text" placeholder="Medida" class="responsive-input" :disabled="isNotaLocked">
        <input v-model.number="newItem.costo" type="number" placeholder="Costo" inputmode="decimal" pattern="[0-9]*" class="responsive-input" :disabled="isNotaLocked">
        <input v-model.number="newItem.precioVenta" type="number" placeholder="Precio Venta" inputmode="decimal" pattern="[0-9]*" class="responsive-input" :disabled="isNotaLocked">
        <button @click="addItem" :disabled="isNotaLocked">Agregar</button>
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
          <tr v-for="(item, index) in items" :key="index" @longpress="showMobileActionsModal(index)">
            <td @click="editField(index, 'kilos')" @touchstart="startLongPress(index, 'kilos')" @touchend="endLongPress">
              {{ editingField.index === index && editingField.field === 'kilos' ? '' : formatNumber(item.kilos) }}
              <input
                v-if="editingField.index === index && editingField.field === 'kilos'"
                v-model.number="item.kilos"
                type="number"
                @blur="finishEditing"
                @keyup.enter="finishEditing"
                ref="editInput"
                :disabled="isNotaLocked"
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
                :disabled="isNotaLocked"
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
                :disabled="isNotaLocked"
              >
            </td>
            <td>${{ formatNumber(item.total) }}</td>
            <td class="action-column desktop-only">
              <button @click="removeItem(index)" class="delete-btn" :disabled="isNotaLocked">Eliminar</button>
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
      <button @click="showAddProductModal = true" :disabled="isNotaLocked">Agregar Producto</button>
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
              >
            </td>
            <td>
              <!-- Otilio: con checkbox de verificación -->
              <div v-if="config.features.verificacionCheckbox" class="medida-container">
                <span>{{ item.medida }}</span>
                <input
                  type="checkbox"
                  :checked="item.verificado"
                  @change="toggleVerificacion(index, $event)"
                  class="verificacion-checkbox"
                  :title="item.verificado ? 'Medida verificada' : 'Marcar como verificada'"
                >
              </div>
              <span v-else>{{ item.medida }}</span>
            </td>
            <td>
              <input
                v-model.number="item.precioVenta"
                type="number"
                @input="calcularTotalVenta(index)"
                class="precio-venta-input"
                inputmode="decimal"
                pattern="[0-9]*"
                :disabled="isNotaLocked"
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
        <input v-model="cobro.descripcion" type="text" placeholder="Flete" class="responsive-input" :disabled="isNotaLocked">
        <input v-model="cobro.monto" type="number" placeholder="Monto" class="responsive-input" :disabled="isNotaLocked">
        <button @click="removeCobro(index)" class="delete-btn" :disabled="isNotaLocked">Eliminar</button>
      </div>
      <button @click="addCobro" class="add-btn" :disabled="isNotaLocked">Agregar Flete</button>
    </div>

    <h2>Abonos</h2>
    <div class="abonos card">
      <div v-if="$route.params.id && !config.features.abonosGenerales" class="abonos-tools">
        <button @click="reacomodarAbonosPosteriores" class="secondary-button" type="button">
          Reacomodar abonos posteriores
        </button>
      </div>
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

    <!-- Modal acciones móviles -->
    <div v-if="showMobileActions" class="mobile-actions-modal">
      <button @click="editItem(selectedItemIndex)" class="edit-btn">Editar</button>
      <button @click="removeItem(selectedItemIndex)" class="delete-btn">Eliminar</button>
      <button @click="cancelMobileActions">Cancelar</button>
    </div>

    <!-- Modal edición de item -->
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

    <!-- Modal agregar producto -->
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

    <!-- Modal observación -->
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

    <!-- Modal precio vacío — solo Veronica -->
    <div v-if="config.features.notaLock && showPrecioVentaVacioModal" class="modal-overlay">
      <div class="modal-content modal-alert">
        <h3>Precio de venta vacío</h3>
        <p>Hay un precio de venta vacío. Completa el campo antes de guardar o salir.</p>
        <div class="modal-buttons">
          <button @click="confirmarPrecioVentaVacio(false)" class="btn-cancelar">Revisar</button>
          <button @click="confirmarPrecioVentaVacio(true)" class="btn-guardar">Continuar</button>
        </div>
      </div>
    </div>

    <div v-if="showSaveMessage && lastSaveMessage && lastSaveMessage !== 'Guardado automáticamente'" class="auto-save-message">
      {{ lastSaveMessage }}
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, writeBatch,
  query, where, orderBy, limit,
} from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModalV2 from '@/components/StashModalV2.vue';
import PreciosClienteButton from '@/components/PreciosClienteButton.vue';
import { formatNumber } from '@/utils/formatters';
import {
  joselitoCuentas,
  veronicaCuentas,
  otilioCuentas,
  catarrosCuentas,
  otilioIndependienteCuentas,
} from '@/services/cuentas.service';
import { CLIENTES_CONFIG } from '@/constants/clientesConfig';

const SERVICE_MAP = {
  joselito: joselitoCuentas,
  veronica: veronicaCuentas,
  otilio: otilioCuentas,
  catarro: catarrosCuentas,
  otilioIndependiente: otilioIndependienteCuentas,
};

export default {
  name: 'CuentaCliente',
  components: { BackButton, PreciosHistorialModal, StashModalV2, PreciosClienteButton },
  props: {
    clienteId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      items: [],
      newItem: { kilos: null, medida: '', costo: null, precioVenta: null },
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
      editingField: { index: null, field: null },
      selectedRowIndex: null,
      showAddProductModal: false,
      newProduct: { kilosVenta: null, medida: '', precioVenta: null },
      autoSaveTimer: null,
      lastSavedData: null,
      saveQueue: [],
      isSaving: false,
      lastSaveTime: null,
      saveMinInterval: 5000,
      tieneObservacion: false,
      showObservacionModal: false,
      observacion: '',
      isGuardando: false,
      lastSaveMessage: '',
      showSaveMessage: false,
      saveMessageTimer: null,
      // Veronica features
      notaBloqueada: true,
      faltaNotaCliente: false,
      showPrecioVentaVacioModal: false,
      accionPendiente: null,
      // Otilio features
      isSavingVerificacion: false,
    };
  },
  computed: {
    config() {
      return CLIENTES_CONFIG[this.clienteId] || {};
    },
    service() {
      return SERVICE_MAP[this.clienteId];
    },
    isNotaLocked() {
      return this.config.features && this.config.features.notaLock && this.notaBloqueada;
    },
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
      const totalCobros = this.cobros.reduce((sum, c) => sum + (c.monto || 0), 0);
      const totalAbonos = this.abonos.reduce((sum, a) => sum + (a.monto || 0), 0);
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
      return this.totalGeneralVenta - this.abonos.reduce((sum, a) => sum + (a.monto || 0), 0);
    },
    estadoCuenta() {
      return this.nuevoSaldoAcumulado <= 0 ? 'Pagado' : 'No Pagado';
    },
    gananciaTotal() {
      return this.itemsVenta.reduce((sum, item) => sum + (item.ganancia || 0), 0);
    },
    totalDiaActual() {
      const totalCobros = this.cobros.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);
      const totalAbonos = this.abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
      return (this.totalGeneralVenta || 0) - totalCobros - totalAbonos;
    },
  },
  watch: {
    fechaSeleccionada: {
      async handler(newFecha, oldFecha) {
        if (!newFecha || newFecha === oldFecha) return;
        await this.loadSaldoAcumuladoAnterior();
        if (this.config.features.verificarEmbarques) {
          await this.verificarNotaFaltante();
        }
        this.handleDataChange();
      },
    },
    items: { handler: 'handleDataChange', deep: true },
    itemsVenta: { handler: 'handleDataChange', deep: true },
    cobros: { handler: 'handleDataChange', deep: true },
    abonos: { handler: 'handleDataChange', deep: true },
    observacion: 'handleDataChange',
  },
  async mounted() {
    const id = this.$route.params.id;
    const isEditing = this.$route.query.edit === 'true';
    if (id && isEditing) {
      await this.loadExistingCuenta(id);
    } else {
      await this.loadSaldoAcumuladoAnterior();
    }
    if (this.config.features.verificarEmbarques) {
      await this.verificarNotaFaltante();
    }
  },
  methods: {
    formatNumber,

    obtenerFechaActual() {
      const fecha = new Date();
      return fecha.getFullYear() + '-' +
        String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
        String(fecha.getDate()).padStart(2, '0');
    },

    showMessage(msg, duration = 3000) {
      if (this.lastSaveMessage !== msg || !this.showSaveMessage) {
        this.lastSaveMessage = msg;
        this.showSaveMessage = true;
        if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
        this.saveMessageTimer = setTimeout(() => { this.showSaveMessage = false; }, duration);
      }
    },

    async loadExistingCuenta(id) {
      try {
        const data = await this.service.getById(id);
        if (!data) throw new Error('No se encontró la cuenta con el ID proporcionado');
        this.$nextTick(() => {
          this.items = (data.items || []).map(item => {
            const kilos = parseFloat(item.kilos) || 0;
            return { ...item, kilos, total: kilos * (item.costo || 0) };
          });
          this.saldoAcumuladoAnterior = data.saldoAcumuladoAnterior || 0;
          this.cobros = data.cobros || [];
          this.abonos = data.abonos || [];
          this.fechaSeleccionada = data.fecha || this.obtenerFechaActual();
          this.showObservacionModal = false;
          this.tieneObservacion = data.tieneObservacion || false;
          this.observacion = data.observacion || '';
          if (this.config.features.notaLock) {
            this.notaBloqueada = data.notaBloqueada !== undefined ? data.notaBloqueada : true;
          }
          this.itemsVenta = (data.itemsVenta || this.items.map(item => ({
            ...item, precioVenta: item.precioVenta || 0,
            totalVenta: (item.precioVenta || 0) * item.kilos, kilosVenta: item.kilos,
          }))).map((item, index) => {
            const kilos = parseFloat(item.kilosVenta) || 0;
            const totalVenta = kilos * (item.precioVenta || 0);
            const itemCosto = this.items[index];
            return { ...item, kilosVenta: kilos, totalVenta, ganancia: totalVenta - (itemCosto ? itemCosto.total : 0) };
          });
          this.actualizarItemsVenta();
        });
      } catch (error) {
        console.error('Error al cargar la cuenta existente:', error);
      }
    },

    async loadSaldoAcumuladoAnterior() {
      try {
        this.saldoAcumuladoAnterior = await this.obtenerSaldoAcumuladoAnterior();
      } catch (error) {
        console.error('Error al cargar saldo acumulado anterior:', error);
        this.saldoAcumuladoAnterior = 0;
      }
    },

    async obtenerSaldoAcumuladoAnterior() {
      try {
        const q = query(
          this.service._ref(),
          where('fecha', '<', this.fechaSeleccionada),
          orderBy('fecha', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) return snap.docs[0].data().nuevoSaldoAcumulado || 0;
        return 0;
      } catch (error) {
        console.error('Error al obtener saldo acumulado anterior:', error);
        return 0;
      }
    },

    async actualizarCuentasPosteriores(fechaActual) {
      try {
        const q = query(
          this.service._ref(),
          where('fecha', '>=', fechaActual),
          orderBy('fecha', 'asc'),
          limit(50)
        );
        const snap = await getDocs(q);
        const cuentas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        let saldoAcumulado = this.nuevoSaldoAcumulado;
        await Promise.all(cuentas.map(async (cuenta) => {
          const totalDia = cuenta.totalGeneralVenta -
            (cuenta.cobros || []).reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0) -
            (cuenta.abonos || []).reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
          saldoAcumulado += totalDia;
          return this.service.update(cuenta.id, {
            saldoAcumuladoAnterior: cuenta.id === this.$route.params.id ? this.saldoAcumuladoAnterior : saldoAcumulado - totalDia,
            nuevoSaldoAcumulado: saldoAcumulado,
            estadoPagado: saldoAcumulado <= 0,
          });
        }));
      } catch (error) {
        console.error('Error al actualizar cuentas posteriores:', error);
      }
    },

    async addItem() {
      if (this.isNotaLocked) return;
      if (!this.newItem.kilos || !this.newItem.medida || !this.newItem.costo || !this.newItem.precioVenta) {
        this.showMessage('Por favor complete todos los campos');
        return;
      }
      try {
        const medidaNormalizada = this.newItem.medida.includes('-') && !this.newItem.medida.toLowerCase().includes('crudo')
          ? this.newItem.medida.replace(/-/g, '/')
          : this.newItem.medida;
        const kilos = parseFloat(this.newItem.kilos);
        const total = kilos * this.newItem.costo;
        this.items.push({ kilos, medida: medidaNormalizada, costo: this.newItem.costo, total });
        const kilosVenta = this.calcularKilosCrudos(medidaNormalizada, kilos, false);
        const totalVenta = kilosVenta * this.newItem.precioVenta;
        this.itemsVenta.push({
          kilosVenta, medida: medidaNormalizada,
          precioVenta: this.newItem.precioVenta, totalVenta, ganancia: totalVenta - total,
        });
        this.newItem = { kilos: null, medida: '', costo: null, precioVenta: null };
        await this.queueSave();
      } catch (error) {
        console.error('Error al guardar el item:', error);
        this.showMessage('Hubo un problema al guardar. Por favor, intente nuevamente.');
        this.items.pop();
        this.itemsVenta.pop();
      }
    },

    async crearNuevaCuenta() {
      try {
        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';
        if (!id || !isEditing) {
          const existing = await getDocs(query(this.service._ref(), where('fecha', '==', this.fechaSeleccionada)));
          if (!existing.empty) throw new Error('Ya existe una nota registrada para esta fecha.');
        }
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: this.items.map(item => { const kilos = parseFloat(item.kilos) || 0; return { ...item, kilos, total: kilos * (item.costo || 0) }; }),
          itemsVenta: this.itemsVenta.map(item => { const kilos = parseFloat(item.kilosVenta) || 0; return { ...item, kilosVenta: kilos, totalVenta: kilos * (item.precioVenta || 0) }; }),
          saldoAcumuladoAnterior: await this.obtenerSaldoAcumuladoAnterior(),
          cobros: [],
          abonos: [],
          totalGeneral: this.totalGeneral,
          totalGeneralVenta: 0,
          nuevoSaldoAcumulado: this.saldoAcumuladoAnterior,
          estadoPagado: false,
          tieneObservacion: this.tieneObservacion,
          observacion: this.observacion,
        };
        const docRef = await this.service.create(notaData);
        this.$router.replace({ name: this.$route.name, params: { id: docRef.id }, query: { edit: 'true' } });
        return docRef.id;
      } catch (error) {
        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';
        if (error.message === 'Ya existe una nota registrada para esta fecha.' && (!id || !isEditing)) {
          this.showMessage(error.message);
        } else if (!isEditing) {
          console.error('Error al crear nueva cuenta:', error);
          this.showMessage('Error al crear la cuenta. Por favor, intente nuevamente.');
        }
        throw error;
      }
    },

    async guardarNota() {
      try {
        this.isGuardando = true;
        const totalDia = this.totalGeneralVenta -
          this.cobros.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0) -
          this.abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
        const saldoActualizado = await this.obtenerSaldoAcumuladoAnterior();
        const nuevoSaldo = saldoActualizado + totalDia;
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: this.items.map(item => { const kilos = parseFloat(item.kilos) || 0; return { ...item, kilos, total: kilos * (item.costo || 0) }; }),
          itemsVenta: this.itemsVenta.map(item => { const kilos = parseFloat(item.kilosVenta) || 0; return { ...item, kilosVenta: kilos, totalVenta: kilos * (item.precioVenta || 0) }; }),
          saldoAcumuladoAnterior: saldoActualizado,
          cobros: this.cobros,
          abonos: this.abonos,
          totalGeneral: this.totalGeneral,
          totalGeneralVenta: this.totalGeneralVenta,
          nuevoSaldoAcumulado: nuevoSaldo <= 0 ? 0 : nuevoSaldo,
          gananciaDelDia: this.gananciaDelDia,
          estadoPagado: nuevoSaldo <= 0,
          tieneObservacion: this.tieneObservacion,
          observacion: this.observacion,
          ultimaActualizacion: new Date().toISOString(),
        };
        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';
        if (id && isEditing) {
          await this.service.update(id, notaData);
          this.actualizarCuentasPosteriores(this.fechaSeleccionada).catch(console.error);
          this.showMessage('Cuenta guardada exitosamente');
          setTimeout(() => { this.$router.push(this.config.backPath); }, 500);
        } else {
          const existing = await getDocs(query(this.service._ref(), where('fecha', '==', this.fechaSeleccionada)));
          if (!existing.empty) {
            this.showMessage('Ya existe una nota registrada para esta fecha. No se puede crear una nueva.');
            return;
          }
          await this.service.create(notaData);
          this.actualizarCuentasPosteriores(this.fechaSeleccionada).catch(console.error);
          this.showMessage('Cuenta guardada exitosamente');
          setTimeout(() => { this.$router.push(this.config.backPath); }, 500);
        }
      } catch (error) {
        console.error('Error al guardar la cuenta:', error);
        this.showMessage('Error al guardar la cuenta');
      } finally {
        this.isGuardando = false;
      }
    },

    async removeItem(index) {
      try {
        if (this.isNotaLocked) return;
        this.items.splice(index, 1);
        if (this.itemsVenta[index]) this.itemsVenta.splice(index, 1);
        await this.queueSave();
      } catch (error) {
        console.error('Error al eliminar item:', error);
      }
    },

    addCobro() { this.cobros.push({ descripcion: '', monto: 0 }); },
    removeCobro(index) { this.cobros.splice(index, 1); },
    addAbono() { this.abonos.push({ descripcion: '', monto: 0 }); },

    redondearMonto(monto) {
      return Math.round((Number(monto) || 0) * 100) / 100;
    },

    calcularSaldoPendienteNota(cuenta) {
      const totalCobros = (cuenta.cobros || []).reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);
      const totalAbonos = (cuenta.abonos || []).reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
      return this.redondearMonto((parseFloat(cuenta.totalGeneralVenta) || 0) - totalCobros - totalAbonos);
    },

    recalcularCadenaSaldos(cuentas) {
      let saldoAcumulado = 0;

      return cuentas.map(cuenta => {
        const saldoAnterior = saldoAcumulado;
        const totalDia = this.calcularSaldoPendienteNota(cuenta);
        saldoAcumulado = this.redondearMonto(saldoAcumulado + totalDia);
        const estadoPagado = saldoAcumulado <= 0;
        const nuevoSaldoAcumulado = estadoPagado ? 0 : saldoAcumulado;

        if (estadoPagado) {
          saldoAcumulado = 0;
        }

        return {
          ...cuenta,
          saldoAcumuladoAnterior: saldoAnterior,
          nuevoSaldoAcumulado,
          estadoPagado,
        };
      });
    },

    obtenerFechaOrdenAbono(abono, fechaCuenta) {
      return abono.fechaOriginalStash || abono.fecha || abono.fechaAplicacion || fechaCuenta || '';
    },

    clonarAbonoParaRedistribucion(abono, monto, cuentaOrigenId, fechaRedistribucion, indicePieza, requiereNuevoId) {
      const abonoClonado = {
        ...abono,
        monto: this.redondearMonto(monto),
        redistribuidoAutomaticamente: true,
        redistribuidoEn: fechaRedistribucion,
        redistribuidoDesdeCuentaId: cuentaOrigenId,
      };

      if (requiereNuevoId && abonoClonado.id) {
        abonoClonado.id = `${abonoClonado.id}_redistribuido_${indicePieza}`;
      }

      return abonoClonado;
    },

    async redistribuirAbonosDespuesDeEliminarEnNota(abonoEliminado, abonoIndex) {
      const cuentaActualId = this.$route.params.id;
      if (!cuentaActualId) return null;

      const esReacomodoManual = typeof abonoIndex !== 'number';
      const snap = await getDocs(query(this.service._ref(), orderBy('fecha', 'asc')));
      const cuentasOriginales = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        abonos: [...(docSnap.data().abonos || [])],
      }));

      const cuentas = cuentasOriginales.map(cuenta => ({
        ...cuenta,
        abonos: [...(cuenta.abonos || [])],
      }));

      const indiceInicio = cuentas.findIndex(cuenta => cuenta.id === cuentaActualId);
      if (indiceInicio === -1) {
        throw new Error('No se encontró la cuenta actual para redistribuir abonos.');
      }

      const idsConAbonosModificados = new Set([cuentaActualId]);
      const abonosParaRedistribuir = [];
      const fechaRedistribucion = new Date().toISOString();

      cuentas.forEach((cuenta, indiceCuenta) => {
        if (indiceCuenta < indiceInicio) return;

        const abonosConservar = [];
        const primerIndiceMovible = indiceCuenta === indiceInicio
          ? (esReacomodoManual ? 0 : abonoIndex + 1)
          : 0;

        (cuenta.abonos || []).forEach((abono, index) => {
          const esCuentaActual = indiceCuenta === indiceInicio;
          const esAbonoEliminado = !esReacomodoManual && esCuentaActual && index === abonoIndex;
          const esPosterior = indiceCuenta > indiceInicio || index >= primerIndiceMovible;

          if (esAbonoEliminado) {
            return;
          }

          if (esPosterior) {
            idsConAbonosModificados.add(cuenta.id);
            abonosParaRedistribuir.push({
              abono: { ...abono, monto: this.redondearMonto(abono.monto) },
              cuentaOrigenId: cuenta.id,
              fechaCuentaOrigen: cuenta.fecha,
              indiceCuenta,
              indiceAbono: index,
              fechaOrden: this.obtenerFechaOrdenAbono(abono, cuenta.fecha),
            });
            return;
          }

          abonosConservar.push(abono);
        });

        if (indiceCuenta >= indiceInicio) {
          cuenta.abonos = abonosConservar;
        }
      });

      abonosParaRedistribuir.sort((a, b) => {
        if (a.indiceCuenta !== b.indiceCuenta) return a.indiceCuenta - b.indiceCuenta;
        const fechaA = new Date(a.fechaOrden).getTime() || 0;
        const fechaB = new Date(b.fechaOrden).getTime() || 0;
        if (fechaA !== fechaB) return fechaA - fechaB;
        return a.indiceAbono - b.indiceAbono;
      });

      const abonosRedistribuidos = [];
      const abonosDevueltosAlStash = [];
      let indicePieza = 0;

      for (const item of abonosParaRedistribuir) {
        let montoRestante = this.redondearMonto(item.abono.monto);
        let piezasCreadas = 0;

        for (let indiceCuenta = indiceInicio; indiceCuenta < cuentas.length && montoRestante > 0.01; indiceCuenta++) {
          const cuentaDestino = cuentas[indiceCuenta];
          const saldoPendiente = this.calcularSaldoPendienteNota(cuentaDestino);
          const montoAAplicar = this.redondearMonto(Math.min(montoRestante, saldoPendiente));

          if (montoAAplicar <= 0.01) continue;

          indicePieza += 1;
          piezasCreadas += 1;
          const requiereNuevoId = montoAAplicar !== this.redondearMonto(item.abono.monto) || piezasCreadas > 1;
          const abonoRedistribuido = this.clonarAbonoParaRedistribucion(
            item.abono,
            montoAAplicar,
            item.cuentaOrigenId,
            fechaRedistribucion,
            indicePieza,
            requiereNuevoId
          );

          cuentaDestino.abonos.push(abonoRedistribuido);
          idsConAbonosModificados.add(cuentaDestino.id);
          abonosRedistribuidos.push({
            descripcion: abonoRedistribuido.descripcion || 'Sin descripción',
            monto: montoAAplicar,
            cuentaOrigenId: item.cuentaOrigenId,
            cuentaDestinoId: cuentaDestino.id,
            fechaCuentaOrigen: item.fechaCuentaOrigen,
            fechaCuentaDestino: cuentaDestino.fecha,
          });

          montoRestante = this.redondearMonto(montoRestante - montoAAplicar);
        }

        if (montoRestante > 0.01) {
          abonosDevueltosAlStash.push({
            fecha: this.obtenerFechaOrdenAbono(item.abono, item.fechaCuentaOrigen),
            descripcion: `${item.abono.descripcion || 'Sin descripción'} (sobrante redistribución)`,
            monto: montoRestante,
            esEfectivo: !!item.abono.esEfectivo,
            stashItemIdOriginal: item.abono.stashItemId || null,
            redistribuidoDesdeCuentaId: item.cuentaOrigenId,
            creadoPorRedistribucion: true,
            fechaCreacion: fechaRedistribucion,
          });
        }
      }

      const cuentasRecalculadas = this.recalcularCadenaSaldos(cuentas);
      const batch = writeBatch(db);
      const ahoraIso = new Date().toISOString();

      cuentasRecalculadas.forEach((cuenta, index) => {
        const cuentaOriginal = cuentasOriginales[index];
        const cambioSaldo =
          Math.abs((Number(cuentaOriginal.saldoAcumuladoAnterior) || 0) - (Number(cuenta.saldoAcumuladoAnterior) || 0)) > 0.01 ||
          Math.abs((Number(cuentaOriginal.nuevoSaldoAcumulado) || 0) - (Number(cuenta.nuevoSaldoAcumulado) || 0)) > 0.01 ||
          cuentaOriginal.estadoPagado !== cuenta.estadoPagado;

        if (!idsConAbonosModificados.has(cuenta.id) && !cambioSaldo) return;

        const updates = {
          saldoAcumuladoAnterior: cuenta.saldoAcumuladoAnterior,
          nuevoSaldoAcumulado: cuenta.nuevoSaldoAcumulado,
          estadoPagado: cuenta.estadoPagado,
          ultimaActualizacion: ahoraIso,
        };

        if (idsConAbonosModificados.has(cuenta.id)) {
          updates.abonos = cuenta.abonos;
        }

        batch.update(doc(this.service._ref(), cuenta.id), updates);
      });

      await batch.commit();

      if (abonosDevueltosAlStash.length > 0) {
        await Promise.all(
          abonosDevueltosAlStash.map(abonoStash =>
            addDoc(collection(db, `stash_${this.config.clienteId}`), abonoStash)
          )
        );
      }

      await addDoc(collection(db, `historial_aplicaciones_${this.config.clienteId}`), {
        fechaAplicacion: fechaRedistribucion,
        modo: esReacomodoManual ? 'reacomodo_abonos_nota' : 'eliminacion_abono_nota_redistribucion',
        abonoEliminado: esReacomodoManual ? null : {
          descripcion: abonoEliminado.descripcion || 'Sin descripción',
          monto: this.redondearMonto(abonoEliminado.monto),
          fechaCuenta: this.fechaSeleccionada,
          fechaCuentaFormateada: this.fechaFormateada,
        },
        cuentaAfectada: cuentaActualId,
        redistribucionAutomatica: {
          abonosRedistribuidos,
          abonosDevueltosAlStash,
          montoRedistribuido: this.redondearMonto(abonosRedistribuidos.reduce((sum, abono) => sum + (abono.monto || 0), 0)),
          montoDevueltoAlStash: this.redondearMonto(abonosDevueltosAlStash.reduce((sum, abono) => sum + (abono.monto || 0), 0)),
        },
        exitoso: true,
      });

      const cuentaActualizada = cuentasRecalculadas.find(cuenta => cuenta.id === cuentaActualId);
      if (cuentaActualizada) {
        this.abonos = [...(cuentaActualizada.abonos || [])];
        this.saldoAcumuladoAnterior = cuentaActualizada.saldoAcumuladoAnterior || 0;
        this.estadoPagado = !!cuentaActualizada.estadoPagado;
      }

      return {
        abonosRedistribuidos,
        abonosDevueltosAlStash,
      };
    },

    async reacomodarAbonosPosteriores() {
      const confirmar = confirm(
        `¿Reacomodar los abonos desde esta nota?\n\n` +
        `Se tomarán los abonos de esta fecha y de las notas posteriores para aplicarlos otra vez desde la cuenta más antigua pendiente.`
      );

      if (!confirmar) return;

      try {
        const resultado = await this.redistribuirAbonosDespuesDeEliminarEnNota(null, null);
        const totalRedistribuido = resultado.abonosRedistribuidos.reduce((sum, abono) => sum + (abono.monto || 0), 0);
        const totalStash = resultado.abonosDevueltosAlStash.reduce((sum, abono) => sum + (abono.monto || 0), 0);
        const mensajeStash = totalStash > 0 ? ` y $${this.formatNumber(totalStash)} devueltos al stash` : '';
        this.showMessage(`Abonos reacomodados: $${this.formatNumber(totalRedistribuido)}${mensajeStash}`, 5000);
      } catch (error) {
        console.error('Error al reacomodar abonos posteriores:', error);
        this.showMessage('Error al reacomodar abonos posteriores');
      }
    },

    async removeAbono(index) {
      const abonoEliminado = this.abonos[index];
      if (!abonoEliminado) return;

      // OtilioIndependiente: eliminar también de la colección de abonos generales
      if (this.config.features.abonosGenerales) {
        try {
          if (abonoEliminado.abonoGeneralId) {
            const abonoRef = doc(db, 'abonosGeneralesOtilioIndependiente', abonoEliminado.abonoGeneralId);
            const abonoDoc = await getDoc(abonoRef);
            if (abonoDoc.exists()) {
              await deleteDoc(abonoRef);
              const cuentasSnap = await getDocs(this.service._ref());
              await Promise.all(cuentasSnap.docs.map(async (docSnap) => {
                const cuentaData = docSnap.data();
                if (cuentaData.abonos) {
                  const abonosActualizados = cuentaData.abonos.filter(a => a.abonoGeneralId !== abonoEliminado.abonoGeneralId);
                  if (abonosActualizados.length !== cuentaData.abonos.length) {
                    await this.service.update(docSnap.id, { abonos: abonosActualizados });
                  }
                }
              }));
            }
          }
        } catch (error) {
          console.error('Error al eliminar abono general:', error);
          alert('Error al eliminar el abono: ' + error.message);
          return;
        }
        this.abonos.splice(index, 1);
        return;
      }
      const id = this.$route.params.id;
      if (id) {
        try {
          await this.redistribuirAbonosDespuesDeEliminarEnNota(abonoEliminado, index);
          this.showMessage('Abono eliminado y abonos siguientes redistribuidos');
        } catch (error) {
          console.error('Error al redistribuir después de eliminar abono:', error);
          this.showMessage('Error al eliminar y redistribuir el abono');
        }
      } else {
        this.abonos.splice(index, 1);
      }
    },

    editField(index, field) {
      if (this.isNotaLocked && (field === 'kilos' || field === 'costo' || field === 'medida')) return;
      this.editingField = { index, field };
      this.$nextTick(() => {
        if (this.$refs.editInput && this.$refs.editInput[0]) this.$refs.editInput[0].focus();
      });
    },

    finishEditing() {
      const { index, field } = this.editingField;
      if (index !== null && field !== null) {
        try {
          const item = this.items[index];
          if (field === 'kilos') item.kilos = parseFloat(item.kilos) || 0;
          else if (field === 'costo') item.costo = parseFloat(item.costo) || 0;
          else if (field === 'medida') {
            item.medida = item.medida.includes('-') && !item.medida.toLowerCase().includes('crudo')
              ? item.medida.replace(/-/g, '/') : item.medida;
          }
          item.total = item.kilos * item.costo;
          if (this.itemsVenta[index]) {
            const kv = parseFloat(this.itemsVenta[index].kilosVenta) || 0;
            this.itemsVenta[index].kilosVenta = kv;
            this.itemsVenta[index].totalVenta = kv * (this.itemsVenta[index].precioVenta || 0);
          }
          this.actualizarItemsVenta();
          this.queueSave();
        } catch (error) {
          console.error('Error al finalizar edición:', error);
        }
      }
      this.editingField = { index: null, field: null };
    },

    editKilos(index) {
      if (this.isNotaLocked) return;
      this.editingKilosIndex = index;
      this.$nextTick(() => {
        if (this.$refs.kilosInput && this.$refs.kilosInput[0]) this.$refs.kilosInput[0].focus();
      });
    },

    finishEditingKilos() {
      if (this.editingKilosIndex !== null) {
        const index = this.editingKilosIndex;
        const item = this.itemsVenta[index];
        if (item) {
          const kilos = parseFloat(item.kilosVenta) || 0;
          const kilosAjustados = this.calcularKilosCrudos(item.medida, kilos, false);
          item.kilosVenta = kilosAjustados;
          item.totalVenta = kilosAjustados * (item.precioVenta || 0);
          const itemCosto = this.items[index];
          item.ganancia = item.totalVenta - (itemCosto ? itemCosto.total : 0);
        }
        this.editingKilosIndex = null;
        this.queueSave();
      }
    },

    calcularTotalVenta(index) {
      const item = this.itemsVenta[index];
      if (item) {
        item.totalVenta = (item.kilosVenta || 0) * (item.precioVenta || 0);
        const itemCosto = this.items[index];
        item.ganancia = item.totalVenta - (itemCosto ? itemCosto.total : 0);
      }
    },

    actualizarItemsVenta() {
      this.itemsVenta.forEach((itemVenta, index) => {
        if (this.items[index]) {
          const kilos = parseFloat(itemVenta.kilosVenta) || 0;
          itemVenta.totalVenta = kilos * (itemVenta.precioVenta || 0);
          itemVenta.ganancia = itemVenta.totalVenta - (this.items[index].total || 0);
        }
      });
    },

    toggleGananciasMobile(index) {
      if (window.innerWidth <= 600) {
        this.selectedRowIndex = this.selectedRowIndex === index ? null : index;
      }
    },

    addNewProduct() {
      if (!(this.newProduct.kilosVenta && this.newProduct.medida && this.newProduct.precioVenta)) {
        this.showMessage('Por favor complete todos los campos');
        return;
      }
      const medidaNormalizada = this.newProduct.medida.includes('-') && !this.newProduct.medida.toLowerCase().includes('crudo')
        ? this.newProduct.medida.replace(/-/g, '/') : this.newProduct.medida;
      const kilos = this.calcularKilosCrudos(medidaNormalizada, parseFloat(this.newProduct.kilosVenta), false);
      const totalVenta = kilos * this.newProduct.precioVenta;
      this.itemsVenta.push({ kilosVenta: kilos, medida: medidaNormalizada, precioVenta: this.newProduct.precioVenta, totalVenta, ganancia: totalVenta });
      this.showAddProductModal = false;
      this.newProduct = { kilosVenta: null, medida: '', precioVenta: null };
      this.queueSave();
    },

    handleDataChange() {
      if (this.$route.params.id && this.$route.query.edit === 'true') {
        if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(async () => { await this.queueSave(); }, 2000);
      }
    },

    async queueSave() {
      const id = this.$route.params.id;
      const isEditing = this.$route.query.edit === 'true';
      this.saveQueue.push({
        timestamp: Date.now(),
        operation: async () => {
          if (!id || !isEditing) await this.crearNuevaCuenta();
          else await this.autoSaveNota();
        },
      });
      if (!this.isSaving) await this.processSaveQueue();
    },

    async processSaveQueue() {
      if (this.isSaving || this.saveQueue.length === 0) return;
      this.isSaving = true;
      try {
        while (this.saveQueue.length > 0) {
          const now = Date.now();
          if (this.lastSaveTime && now - this.lastSaveTime < this.saveMinInterval) {
            await new Promise(resolve => setTimeout(resolve, this.saveMinInterval - (now - this.lastSaveTime)));
          }
          const nextSave = this.saveQueue[0];
          await this.retryOperation(nextSave.operation);
          this.lastSaveTime = Date.now();
          this.saveQueue.shift();
        }
      } catch (error) {
        console.error('Error procesando cola de guardado:', error);
        if (error.code === 'resource-exhausted') {
          await new Promise(resolve => setTimeout(resolve, 10000));
          await this.processSaveQueue();
        }
      } finally {
        this.isSaving = false;
      }
    },

    async autoSaveNota() {
      if (!this.$route.params.id) return;
      try {
        const id = this.$route.params.id;
        const notaData = {
          items: this.items.map(item => { const k = parseFloat(item.kilos) || 0; return { kilos: k, medida: item.medida, costo: item.costo, total: k * (item.costo || 0) }; }),
          itemsVenta: this.itemsVenta.map(item => { const k = parseFloat(item.kilosVenta) || 0; return { kilosVenta: k, medida: item.medida, precioVenta: item.precioVenta, totalVenta: k * (item.precioVenta || 0), ganancia: item.ganancia, ...(item.verificado !== undefined ? { verificado: item.verificado } : {}) }; }),
          totalGeneral: this.totalGeneral,
          totalGeneralVenta: this.totalGeneralVenta,
          nuevoSaldoAcumulado: this.nuevoSaldoAcumulado,
          cobros: this.cobros,
          abonos: this.abonos,
          estadoPagado: this.estadoCuenta === 'Pagado',
          tieneObservacion: this.tieneObservacion,
          observacion: this.observacion,
          ultimaActualizacion: new Date().toISOString(),
        };
        await this.service.update(id, notaData);
        this.lastSaveMessage = '';
        this.showSaveMessage = false;
      } catch (error) {
        if (error.code === 'resource-exhausted') throw error;
        this.showMessage('Error en auto-guardado');
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
          const delay = error.code === 'resource-exhausted' ? 5000 * Math.pow(2, retries) : 1000 * Math.pow(2, retries);
          await new Promise(resolve => setTimeout(resolve, delay));
          if (retries >= maxRetries) throw error;
        }
      }
    },

    startLongPress(index, field) {
      this.longPressTimer = setTimeout(() => { this.showMobileActionsModal(index); }, 500);
    },
    endLongPress() { clearTimeout(this.longPressTimer); },
    showMobileActionsModal(index) {
      this.selectedItemIndex = index;
      this.showMobileActions = true;
    },
    cancelMobileActions() {
      this.showMobileActions = false;
      this.selectedItemIndex = null;
    },
    editItem(index) {
      this.editingItem = { ...this.items[index] };
      this.editingIndex = index;
      this.showEditModal = true;
      this.cancelMobileActions();
    },
    saveEditedItem() {
      if (this.editingIndex !== null && this.editingItem) {
        this.items[this.editingIndex] = { ...this.editingItem, total: this.editingItem.kilos * this.editingItem.costo };
        if (this.itemsVenta[this.editingIndex]) {
          this.itemsVenta[this.editingIndex].medida = this.editingItem.medida;
        }
      }
      this.showEditModal = false;
      this.editingItem = null;
      this.editingIndex = null;
      this.queueSave();
    },
    cancelEdit() {
      this.showEditModal = false;
      this.editingItem = null;
      this.editingIndex = null;
    },

    normalizarMedida(medida) {
      if (!medida) return '';
      return medida.toString().toLowerCase().replace(/\s+/g, '').replace(/[\[\]()]/g, '').replace(/-/g, '/').trim();
    },

    calcularKilosCrudos(medida, kilosOriginales, esParaCostos = false) {
      if (!medida) return kilosOriginales;
      const medidaLower = medida.toLowerCase().trim();
      if (!medidaLower.includes('crudo')) return kilosOriginales;
      const formatoGuion = /^(\d+)-(\d+)$/.exec(medidaLower);
      if (formatoGuion) {
        const cajas = parseInt(formatoGuion[1]) || 0;
        const kilosPorCaja = parseInt(formatoGuion[2]) || 0;
        const kiloPorCaja = (kilosPorCaja === 19 && !esParaCostos) ? 20 : kilosPorCaja;
        return cajas * kiloPorCaja;
      }
      const formatoEstrella = /^(\d+)\*(\d+)(\+(\d+))?$/.exec(medidaLower);
      if (formatoEstrella) {
        const cajas = parseInt(formatoEstrella[1]) || 0;
        const kilosPorCaja = parseInt(formatoEstrella[2]) || 0;
        const kiloPorCaja = (kilosPorCaja === 19 && !esParaCostos) ? 20 : kilosPorCaja;
        return cajas * kiloPorCaja + (parseInt(formatoEstrella[4]) || 0);
      }
      return kilosOriginales;
    },

    imprimirTablas() {
      const html = `<html><head><title>${this.config.titulo} - ${this.fechaFormateada}</title>
        <style>body{font-family:Arial,sans-serif;font-size:14pt;max-width:800px;margin:0 auto;padding:15px;text-align:center}
        h1{font-size:22pt}h2{font-size:18pt;margin-top:20px}table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}th{background-color:#f2f2f2;font-weight:bold}
        .total{font-weight:bold}.highlight{background-color:#e8f5e9;font-weight:bold}</style></head>
        <body><h1>${this.config.titulo} - ${this.fechaFormateada}</h1>
        <h2>Precios de Venta</h2><table><thead><tr><th>Kilos</th><th>Medida</th><th>Precio</th><th>Total</th></tr></thead>
        <tbody>${this.itemsVenta.map(i => `<tr><td>${this.formatNumber(i.kilosVenta)}</td><td>${i.medida}</td><td>$${this.formatNumber(i.precioVenta)}</td><td>$${this.formatNumber(i.totalVenta)}</td></tr>`).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="3">Total Venta</td><td>$${this.formatNumber(this.totalGeneralVenta)}</td></tr></tfoot></table>
        <h2>Resumen de saldo</h2><table>
        <tr><td>Saldo Acumulado Anterior</td><td>$${this.formatNumber(this.saldoAcumuladoAnterior)}</td></tr>
        <tr><td>Saldo Hoy</td><td>$${this.formatNumber(this.totalGeneralVenta)}</td></tr>
        ${this.cobros.map(c => `<tr><td>${c.descripcion}</td><td>-$${this.formatNumber(c.monto)}</td></tr>`).join('')}
        ${this.abonos.map(a => `<tr><td>${a.descripcion} (Abono)</td><td>-$${this.formatNumber(a.monto)}</td></tr>`).join('')}
        <tr class="total"><td>Total</td><td>$${this.formatNumber(this.totalDiaActual)}</td></tr>
        <tr class="highlight"><td>Nuevo Saldo Acumulado</td><td>$${this.formatNumber(this.nuevoSaldoAcumulado)}</td></tr>
        </table></body></html>`;
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      w.print();
    },

    agregarObservacion() { this.showObservacionModal = true; },
    guardarObservacion() {
      if (this.observacion.trim()) this.tieneObservacion = true;
      this.showObservacionModal = false;
    },
    cancelarObservacion() {
      if (!this.tieneObservacion) this.observacion = '';
      this.showObservacionModal = false;
    },
    editarObservacion() { this.showObservacionModal = true; },
    eliminarObservacion() {
      if (confirm('¿Estás seguro de que deseas eliminar esta observación?')) {
        this.observacion = '';
        this.tieneObservacion = false;
      }
    },

    // ── Veronica only ──────────────────────────────────────────────────────────

    async toggleBloqueoNota() {
      if (!this.config.features.notaLock) return;
      if (!this.$route.params.id) {
        this.notaBloqueada = !this.notaBloqueada;
        return;
      }
      const nuevoEstado = !this.notaBloqueada;
      const mensaje = nuevoEstado
        ? '¿Bloquear la nota para evitar cambios en kilos y medidas?'
        : '¿Desbloquear la nota para editar kilos y medidas?';
      if (!confirm(mensaje)) return;
      try {
        await this.service.update(this.$route.params.id, {
          notaBloqueada: nuevoEstado, ultimaActualizacion: new Date().toISOString(),
        });
        this.notaBloqueada = nuevoEstado;
      } catch (error) {
        console.error('Error al actualizar el bloqueo de la nota:', error);
        alert('No se pudo actualizar el bloqueo. Intenta nuevamente.');
      }
    },

    async verificarNotaFaltante() {
      if (!this.config.features.verificarEmbarques) return;
      try {
        const notaExistente = await getDocs(query(
          this.service._ref(), where('fecha', '==', this.fechaSeleccionada), limit(1)
        ));
        if (!notaExistente.empty) { this.faltaNotaCliente = false; return; }
        const embarquesSnap = await getDocs(query(
          collection(db, 'embarques'), where('fecha', '==', this.fechaSeleccionada)
        ));
        let existeEmbarqueCliente = false;
        for (const docSnap of embarquesSnap.docs) {
          const data = docSnap.data() || {};
          const clientes = data.clientes || [];
          const clienteId = this.config.clienteId;
          const encontrado = clientes.some(cliente => {
            const id = (cliente.id ?? cliente.clienteId ?? '').toString();
            const nombre = (cliente.nombre || '').toLowerCase();
            const esCliente = id === '5' || nombre.includes(clienteId);
            const tieneProductos = Array.isArray(cliente.productos) && cliente.productos.some(p => p && p.medida);
            const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
            return esCliente && (tieneProductos || tieneCrudos);
          });
          if (encontrado) { existeEmbarqueCliente = true; break; }
        }
        this.faltaNotaCliente = existeEmbarqueCliente;
      } catch (error) {
        console.error('Error al verificar nota faltante:', error);
        this.faltaNotaCliente = false;
      }
    },

    solicitarConfirmacionPrecioVenta(accion) {
      this.accionPendiente = accion;
      this.showPrecioVentaVacioModal = true;
    },

    confirmarPrecioVentaVacio(continuar) {
      this.showPrecioVentaVacioModal = false;
      if (!continuar) { this.accionPendiente = null; return; }
      if (this.accionPendiente === 'guardar') {
        this.accionPendiente = null;
        this.guardarNota();
      }
    },

    // ── Otilio only ─────────────────────────────────────────────────────────────

    async toggleVerificacion(index, event) {
      if (!this.config.features.verificacionCheckbox || this.isSavingVerificacion) return;
      try {
        this.isSavingVerificacion = true;
        this.$set(this.itemsVenta[index], 'verificado', event.target.checked);
        const id = this.$route.params.id;
        if (!id) return;
        await this.service.update(id, {
          itemsVenta: this.itemsVenta.map(item => ({
            kilosVenta: Number(item.kilosVenta) || 0,
            medida: String(item.medida || ''),
            precioVenta: Number(item.precioVenta) || 0,
            totalVenta: Number(item.totalVenta) || 0,
            ganancia: Number(item.ganancia) || 0,
            verificado: Boolean(item.verificado),
          })),
        });
        this.showMessage('Verificación guardada', 2000);
      } catch (error) {
        console.error('Error al guardar verificación:', error);
        this.$set(this.itemsVenta[index], 'verificado', !event.target.checked);
      } finally {
        this.isSavingVerificacion = false;
      }
    },
  },
  beforeUnmount() {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    if (this.saveQueue.length > 0) this.processSaveQueue();
  },
};
</script>

<style scoped>
.cuenta-cliente-container {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 16px;
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
  background: linear-gradient(180deg, rgba(249,249,249,1) 65%, rgba(249,249,249,0));
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

.back-button-container a:first-child { background-color: #6c757d; }
.back-button-container a:first-child:hover { background-color: #5a6268; }
.back-button-container button:nth-child(2) { background-color: #4CAF50; }
.back-button-container button:nth-child(2):hover { background-color: #45a049; }
.back-button-container button:last-child { background-color: #9c27b0; }
.back-button-container button:last-child:hover { background-color: #7b1fa2; }

.fecha-actual {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-bottom: 20px;
}
.fecha-input { margin-bottom: 5px; }
.fecha-input input[type="date"] { padding: 5px; border: 1px solid #ddd; border-radius: 4px; }
.fecha-display { font-weight: bold; }
.fecha-sin-nota { border-color: #e53935 !important; color: #e53935; }
.alerta-sin-nota { color: #e53935; font-size: 0.85rem; margin: 4px 0 0; }
.bloque-sin-nota { border-left: 4px solid #e53935; padding-left: 8px; }

.nota-lock {
  margin-bottom: 16px;
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.nota-lock-info { display: flex; gap: 8px; align-items: center; }
.nota-lock-label { font-weight: bold; }
.nota-lock-status.bloqueada { color: #e53935; font-weight: bold; }
.nota-lock-status.desbloqueada { color: #43a047; font-weight: bold; }
.nota-lock-btn { padding: 6px 14px; font-size: 14px; }
.nota-lock-help { width: 100%; font-size: 0.8rem; color: #666; margin: 0; }

.input-section { margin-bottom: 20px; }
.input-row { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: nowrap; align-items: center; }
.responsive-input { width: 100%; max-width: 180px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; transition: border-color 0.3s ease; font-size: 15px; }
.responsive-input:focus { border-color: #4CAF50; outline: none; }

button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}
button:hover { background-color: #45a049; transform: translateY(-2px); }
button:active { transform: translateY(0); }
button:disabled { background-color: #aaa; cursor: not-allowed; transform: none; }

.delete-btn { background-color: #f44336; }
.delete-btn:hover { background-color: #da190b; }
.secondary-button { background-color: #607d8b; }
.secondary-button:hover { background-color: #546e7a; }

table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
th { background-color: #4CAF50; color: white; position: sticky; top: 0; z-index: 1; }
.total { font-weight: bold; background-color: #f5f5f5; }
.text-right { text-align: right; }

.table-card { margin-bottom: 20px; }
.table-responsive { overflow-x: auto; }

.precio-venta-input { width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; }

.medida-container { display: flex; align-items: center; gap: 8px; }
.verificacion-checkbox { cursor: pointer; width: 16px; height: 16px; }

.ganancia-del-dia { margin-bottom: 20px; padding: 15px; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.ganancia-positiva { color: #4CAF50; font-weight: bold; }
.ganancia-negativa { color: #f44336; font-weight: bold; }

.saldo-pendiente, .abonos { margin-bottom: 20px; }
.abonos-tools { display: flex; justify-content: flex-end; margin-bottom: 12px; }

.button-container { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.save-button { background-color: #2196F3; }
.save-button:hover { background-color: #1976D2; }
.print-button { background-color: #FF9800; }
.print-button:hover { background-color: #F57C00; }

.mobile-actions-modal, .edit-modal {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: white; padding: 20px; box-shadow: 0 -4px 12px rgba(0,0,0,0.2);
  display: flex; gap: 10px; justify-content: center; z-index: 100; flex-wrap: wrap;
}
.edit-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); border-radius: 8px; flex-direction: column; }
.button-row { display: flex; gap: 10px; justify-content: flex-end; }

.modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-content { background: white; border-radius: 8px; padding: 20px; max-width: 400px; width: 90%; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; }
.modal-buttons { display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px; }
.btn-guardar { background-color: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; }
.btn-cancelar { background-color: #9e9e9e; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; }

.estado-cuenta { padding: 15px; border-radius: 8px; text-align: center; font-size: 1.2rem; font-weight: bold; margin-bottom: 20px; }
.estado-cuenta.pagado { background-color: #e8f5e9; color: #2e7d32; }
.estado-cuenta.no-pagado { background-color: #ffebee; color: #c62828; }

.guardar-container { margin-bottom: 20px; }
.observacion-container { margin-bottom: 10px; }
.btn-agregar-observacion { background-color: #607d8b; padding: 8px 16px; font-size: 14px; }
.observacion-existente { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; border-radius: 4px; margin-top: 10px; }
.observacion-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.observacion-titulo { font-weight: bold; margin: 0; }
.observacion-buttons { display: flex; gap: 8px; }
.btn-editar { background-color: #2196F3; padding: 4px 10px; font-size: 12px; }
.btn-eliminar { background-color: #f44336; padding: 4px 10px; font-size: 12px; }
.observacion-texto { margin: 0; white-space: pre-wrap; }

.auto-save-indicator { position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.7); color: white; padding: 8px 14px; border-radius: 20px; font-size: 13px; display: flex; align-items: center; gap: 8px; z-index: 50; }
.save-dot { width: 8px; height: 8px; background: #4CAF50; border-radius: 50%; animation: pulse 1s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

.auto-save-message { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 20px; z-index: 50; font-size: 14px; }

.precios-button-container { margin-bottom: 16px; }
.add-product-button { margin-bottom: 10px; }

.ganancia-row td { font-size: 1.1rem; }

@media (max-width: 600px) {
  .back-button-container { justify-content: center; gap: 10px; }
  .back-button-container a, .back-button-container button { min-width: 100px; padding: 8px 15px; font-size: 14px; }
  .responsive-input { max-width: 120px; padding: 8px; font-size: 13px; }
  .input-row { flex-wrap: wrap; }
  .abonos-tools { justify-content: stretch; }
  .abonos-tools .secondary-button { width: 100%; }
  .desktop-only { display: none; }
  .mobile-only { display: table-row; }
  th, td { padding: 8px 10px; font-size: 13px; }
  .button-container { flex-direction: column; }
  .save-button, .print-button { width: 100%; }
}
@media (min-width: 601px) {
  .mobile-only { display: none; }
}
</style>
