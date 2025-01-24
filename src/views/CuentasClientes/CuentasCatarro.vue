<template>
  <div class="cuentas-catarro-container">
    <div class="back-button-container">
      <BackButton to="/cuentas-catarro" />
      <PreciosHistorialModal />
      <StashModal cliente="catarro" />
    </div>
    <h1>Cuentas Catarro</h1>
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
            <input v-model.number="item.precioVenta" type="number" @input="calcularTotalVenta(index)" class="precio-venta-input" inputmode="decimal" pattern="[0-9]*">
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
      <button @click="guardarNota" class="save-button">Guardar Nota</button>
      <button @click="imprimirTablas" class="print-button">Imprimir</button>
    </div>
  
    <!-- Modal para acciones móviles -->
    <div v-if="showMobileActions" class="mobile-actions-modal">
      <button @click="editItem(selectedItemIndex)" class="edit-btn">Editar</button>
      <button @click="removeItem(selectedItemIndex)" class="delete-btn">Eliminar</button>
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
        <input type="checkbox" v-model="tieneObservacion" id="observacionCheck">
        <label for="observacionCheck">Tiene observación</label>
      </div>
      <button @click="guardarCuenta" class="btn-guardar">Guardar</button>
    </div>

    <!-- Modal de Observación -->
    <div v-if="showObservacionModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Agregar Observación</h3>
        <textarea v-model="observacion" placeholder="Escribe tu observación aquí..." rows="4"></textarea>
        <div class="modal-buttons">
          <button @click="guardarObservacion" class="btn-guardar">Guardar</button>
          <button @click="cancelarObservacion" class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModal from '@/components/StashModal.vue';

export default {
  name: 'CuentasCatarro',
  components: {
    BackButton,
    PreciosHistorialModal,
    StashModal
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
      saveMinInterval: 5000, // Aumentar a 5 segundos mínimo entre guardados
      tieneObservacion: false,
      showObservacionModal: false,
      observacion: '',
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
      return this.totalSaldo <= 0 || this.totalDiaActual === 0 ? 'Pagado' : 'No Pagado';
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
      handler: 'loadSaldoAcumuladoAnterior',
      immediate: true
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
    fechaSeleccionada: {
      handler: 'handleDataChange'
    },
    saldoAcumuladoAnterior: {
      handler: 'handleDataChange'
    },
    'newItem.kilos': 'handleDataChange',
    'newItem.medida': 'handleDataChange',
    'newItem.costo': 'handleDataChange',
    tieneObservacion(newValue) {
      if (newValue) {
        this.showObservacionModal = true;
      }
    }
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
  },
  methods: {
    async loadExistingCuenta(id) {
      try {
        console.log("Cargando cuenta con ID:", id);
        const cuentaRef = doc(db, 'cuentasCatarro', id);
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
              itemsVenta: this.itemsVenta
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
        const cuentasRef = collection(db, 'cuentasCatarro');
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
        const cuentasRef = collection(db, 'cuentasCatarro');
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
          const cuentaRef = doc(db, 'cuentasCatarro', cuenta.id);
          
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
      if (!this.newItem.kilos || !this.newItem.medida || !this.newItem.costo || !this.newItem.precioVenta) {
        alert('Por favor complete todos los campos');
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
        alert('Hubo un problema al guardar. Por favor, intente nuevamente.');
        // Revertir los cambios locales si falló el guardado
        this.items.pop();
        this.itemsVenta.pop();
      }
    },
    async crearNuevaCuenta() {
      try {
        // Verificar si ya existe una nota para esta fecha
        const cuentasRef = collection(db, 'cuentasCatarro');
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
        };

        const docRef = await addDoc(collection(db, 'cuentasCatarro'), notaData);
        
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
      this.cobros.push({descripcion: 'Flete', monto: 0});
    },
    removeCobro(index) {
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
    async guardarNota() {
      try {
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
        };

        console.log("Datos a guardar:", notaData);

        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';

        if (id && isEditing) {
          // Actualizar nota existente
          await updateDoc(doc(db, 'cuentasCatarro', id), notaData);
          console.log('Cuenta actualizada exitosamente');
          
          // Actualizar saldos de cuentas posteriores
          await this.actualizarCuentasPosteriores(this.fechaSeleccionada);
          
          alert('Cuenta guardada exitosamente');
          this.$router.push('/cuentas-catarro');
        } else {
          // Verificar si ya existe una nota para esta fecha
          const cuentasRef = collection(db, 'cuentasCatarro');
          const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            alert('Ya existe una nota registrada para esta fecha. No se puede crear una nueva.');
            return;
          } else {
            // Crear nueva nota
            await addDoc(collection(db, 'cuentasCatarro'), notaData);
            console.log('Nueva cuenta guardada exitosamente');
            
            // Actualizar saldos de cuentas posteriores
            await this.actualizarCuentasPosteriores(this.fechaSeleccionada);
            
            alert('Cuenta guardada exitosamente');
            this.$router.push('/cuentas-catarro');
          }
        }
      } catch (error) {
        console.error('Error al guardar la cuenta:', error);
        alert('Error al guardar la cuenta');
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
      this.editingIndex = index;
      this.editingItem = { ...this.items[index] };
      this.showEditModal = true;
    },
    saveEditedItem() {
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
            <title>Cuentas Catarro - ${this.fechaFormateada}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 20pt;
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                text-align: center;
              }
              h1 { font-size: 30pt; margin-bottom: 20px; }
              h2 { font-size: 27pt; margin-top: 30px; margin-bottom: 15px; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                font-size: 20pt;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 10px;
                text-align: left;
              }
              th { background-color: #f2f2f2; font-weight: bold; }
              .total { font-weight: bold; }
              .total td:first-child { text-align: right; }
              @media print {
                body { font-size: 20pt; }
                h1 { font-size: 25pt; }
                h2 { font-size: 25pt; }
                table { font-size: 20pt; }
              }
            </style>
          </head>
          <body>
            <h1>Cuentas Catarro - ${this.fechaFormateada}</h1>
            
            <h2>Detalles de la cuenta</h2>
            <table>
              <thead>
                <tr>
                  <th>Kilos</th>
                  <th>Medida</th>
                  <th>Costo</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${this.items.map(item => `
                  <tr>
                    <td>${this.formatNumber(item.kilos)}</td>
                    <td>${item.medida}</td>
                    <td>$${this.formatNumber(item.costo)}</td>
                    <td>$${this.formatNumber(item.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total">
                  <td colspan="3">Total</td>
                  <td>$${this.formatNumber(this.totalGeneral)}</td>
                </tr>
              </tfoot>
            </table>

            <h2>Precios de Venta</h2>
            <table>
              <thead>
                <tr>
                  <th>Kilos</th>
                  <th>Medida</th>
                  <th>Precio de Venta</th>
                  <th>Total</th>
                  <th>Ganancias</th>
                </tr>
              </thead>
              <tbody>
                ${this.itemsVenta.map(item => `
                  <tr>
                    <td>${this.formatNumber(item.kilosVenta)}</td>
                    <td>${item.medida}</td>
                    <td>$${this.formatNumber(item.precioVenta)}</td>
                    <td>$${this.formatNumber(item.totalVenta)}</td>
                    <td class="${item.ganancia > 0 ? 'ganancia-positiva' : 'ganancia-negativa'}">$${this.formatNumber(item.ganancia)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total">
                  <td colspan="3">Total Venta</td>
                  <td>$${this.formatNumber(this.totalGeneralVenta)}</td>
                  <td>$${this.formatNumber(this.gananciaTotal)}</td>
                </tr>
              </tfoot>
            </table>

            <h2>Resumen de saldo</h2>
            <table>
              <tr>
                <td>Saldo Anterior</td>
                <td>$${this.formatNumber(this.saldoAcumuladoAnterior)}</td>
              </tr>
              <tr>
                <td>Saldo Hoy</td>
                <td>$${this.formatNumber(this.totalGeneralVenta)}</td>
              </tr>
              ${this.cobros.map(cobro => `
                <tr>
                  <td>${cobro.descripcion}</td>
                  <td>$${this.formatNumber(cobro.monto)}</td>
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
                <td>$${this.formatNumber(this.totalSaldo)}</td>
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
      this.editingKilosIndex = index;
      this.$nextTick(() => {
        if (this.$refs.kilosInput && this.$refs.kilosInput[0]) {
          this.$refs.kilosInput[0].focus();
        }
      });
    },
    finishEditingKilos() {
      const index = this.editingKilosIndex;
      if (index !== null) {
        try {
          const item = this.itemsVenta[index];
          item.kilosVenta = parseFloat(item.kilosVenta) || item.kilos;
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
      this.longPressTimer = setTimeout(() => {
        this.editField(index, field);
      }, 500); // 500ms para activar la edición
    },
    endLongPress() {
      clearTimeout(this.longPressTimer);
    },
    editField(index, field) {
      this.editingField = { index, field };
      this.$nextTick(() => {
        if (this.$refs.editInput && this.$refs.editInput[0]) {
          this.$refs.editInput[0].focus();
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
      if (this.newProduct.kilosVenta && this.newProduct.medida && this.newProduct.precioVenta) {
        const totalVenta = this.newProduct.kilosVenta * this.newProduct.precioVenta;
        this.itemsVenta.push({
          ...this.newProduct,
          totalVenta,
          ganancia: totalVenta // La ganancia será igual al total de venta ya que no tiene costo asociado
        });
        this.showAddProductModal = false;
        this.newProduct = { kilosVenta: null, medida: '', precioVenta: null };
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
          nuevoSaldoAcumulado: this.nuevoSaldoAcumulado,
          cobros: this.cobros,
          abonos: this.abonos,
          estadoPagado: this.estadoCuenta === 'Pagado',
          tieneObservacion: this.tieneObservacion,
          observacion: this.observacion,
        };

        await updateDoc(doc(db, 'cuentasCatarro', this.$route.params.id), notaData);
        console.log('Cuenta auto-guardada exitosamente');
      } catch (error) {
        if (error.code === 'resource-exhausted') {
          throw error; // Dejar que el sistema de cola maneje el reintento
        }
        console.error('Error en auto-guardado:', error);
        throw error;
      }
    },
    guardarCuenta() {
      this.guardarNota();
    },
    guardarObservacion() {
      this.showObservacionModal = false;
    },
    cancelarObservacion() {
      this.tieneObservacion = false;
      this.observacion = '';
      this.showObservacionModal = false;
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
.cuentas-catarro-container {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* Fuente más moderna */
  background-color: #f9f9f9; /* Fondo ligero para mayor contraste */
  border-radius: 8px; /* Bordes redondeados */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Sombra suave */
}

.back-button-container {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
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

@media (max-width: 600px) {
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
  border-color: #4CAF50;
  outline: none;
}

button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

button:hover {
  background-color: #45a049;
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
  background-color: #4CAF50;
  color: white;
}

tr:nth-child(even) {
  background-color: #f2f2f2;
}

tr:hover {
  background-color: #e8f5e9;
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
.tabla-venta td:first-child {
  width: 20%;
}

.tabla-principal th:nth-child(2),
.tabla-principal td:nth-child(2),
.tabla-venta th:nth-child(2),
.tabla-venta td:nth-child(2) {
  width: 20%;
}

.tabla-principal th:nth-child(3),
.tabla-principal td:nth-child(3),
.tabla-venta th:nth-child(3),
.tabla-venta td:nth-child(3) {
  width: 30%;
}

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
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.mobile-actions-modal button,
.edit-modal button {
  width: 100%;
  padding: 15px 20px;
  margin-bottom: 10px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
}

.edit-btn {
  background-color: #ffa500;
  color: white;
  margin-right: 5px;
}

.edit-btn:hover {
  background-color: #ff8c00;
}

/* Estilos de ganancia */
.ganancia-del-dia {
  margin-top: 20px;
  padding: 15px;
  background-color: #e0f7fa;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ganancia-del-dia h3 {
  margin-bottom: 10px;
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
    font-size: 1px;
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
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tabla-venta th,
.tabla-venta td {
  border: none;
  border-bottom: 1px solid #e0e0e0;
  padding: 12px;
  text-align: right;
  font-size: 16px;
}

.tabla-venta th {
  background-color: #f5f5f5;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #333;
}

.tabla-venta tr:last-child td {
  border-bottom: none;
}

.tabla-venta tr:nth-child(even) {
  background-color: #f9f9f9;
}

.tabla-venta tr:hover {
  background-color: #f0f0f0;
}

.tabla-venta td:first-child,
.tabla-venta th:first-child {
  text-align: left;
}

.precio-venta-input {
  width: 60px; /* Reducir el ancho */
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 18px; /* Ajustar el tamaño a 18px */
}

/* Aumentar el tamaño de los números */
.tabla-venta td,
.tabla-venta input[type="number"],
.tabla-venta .precio-venta-input {
  font-size: 18px;
  font-weight: 500;
}

.tabla-venta th {
  font-size: 16px;
}

/* Estilos para las ganancias */
.ganancia-positiva,
.ganancia-negativa {
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
}

.ganancia-positiva {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.ganancia-negativa {
  background-color: #ffebee;
  color: #c62828;
}

@media (max-width: 600px) {
  .tabla-venta th,
  .tabla-venta td {
    padding: 10px;
    font-size: 16px;
  }

  .tabla-venta td,
  .tabla-venta input[type="number"],
  .tabla-venta .precio-venta-input {
    font-size: 16px;
  }

  .tabla-venta th {
    font-size: 14px;
  }

  .precio-venta-input {
    width: 50px; /* Reducir el ancho para dispositivos móviles */
    padding: 3px;
    font-size: 18px; /* Mantener el tamaño a 18px */
  }
}

@media (min-width: 601px) {
  .mobile-only {
    display: none;
  }
}

.mobile-actions-modal {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.mobile-actions-modal button {
  width: 100%;
  padding: 15px 20px;
  margin-bottom: 10px;
  border: none;
  background-color: #3760b0;
  color: white;
  border-radius: 5px;
  font-size: 16px;
}

.mobile-actions-modal button:last-child {
  margin-bottom: 0;
}

.tabla-venta {
  margin-top: 20px;
  width: 100%;
  border-collapse: collapse;
}

.tabla-venta th,
.tabla-venta td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.tabla-venta th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.precio-venta-input {
  width: 70px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

@media (max-width: 600px) {
  .tabla-venta th,
  .tabla-venta td {
    padding: 6px;
  }

  .precio-venta-input {
    width: 60px;
    padding: 3px;
    font-size: 12px;
  }
}

.total {
  background-color: #f2f2f2;
  font-weight: bold;
  text-align: right;
}

.total td {
  padding: 10px;
  border-top: 2px solid #ddd;
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
</style>
