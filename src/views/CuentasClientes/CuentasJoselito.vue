<template>
  <div class="cuentas-joselito-container">
    <div class="back-button-container">
      <BackButton to="/cuentas-joselito" />
      <PreciosHistorialModal />
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
      <button @click="guardarNota" class="save-button">Guardar Nota</button>
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

export default {
  name: 'CuentasJoselito',
  components: {
    BackButton,
    PreciosHistorialModal
  },
  data() {
    return {
      items: [],
      newItem: {
        kilos: null,
        medida: '',
        costo: null
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
      selectedField: null
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
    formatNumber(value) {
      if (value === null || value === undefined) {
        return '0.00';
      }
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
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

        // Preparar los datos iniciales
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: [],
          itemsVenta: [],
          saldoAcumuladoAnterior: 0,
          cobros: [],
          abonos: [],
          totalGeneral: 0,
          totalGeneralVenta: 0,
          nuevoSaldoAcumulado: 0,
          estadoPagado: false,
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
      if (!this.newItem.kilos || !this.newItem.medida || !this.newItem.costo) {
        alert('Por favor complete todos los campos');
        return;
      }

      const total = this.newItem.kilos * this.newItem.costo;
      this.items.push({
        ...this.newItem,
        total
      });

      // Limpiar el formulario
      this.newItem = {
        kilos: null,
        medida: '',
        costo: null
      };

      // Actualizar items de venta
      this.actualizarItemsVenta();
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

    removeItem(index) {
      this.items.splice(index, 1);
      this.itemsVenta.splice(index, 1);
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

    imprimirTablas() {
      window.print();
    },

    addCobro() {
      this.cobros.push({
        descripcion: '',
        monto: 0
      });
    },

    removeCobro(index) {
      this.cobros.splice(index, 1);
    },

    addAbono() {
      this.abonos.push({
        descripcion: '',
        monto: 0
      });
    },

    async removeAbono(index) {
      try {
        const abono = this.abonos[index];
        
        // Si el abono tiene un ID de abono general, eliminarlo del historial
        if (abono.abonoGeneralId) {
          try {
            // Primero verificar si el abono general existe
            const abonoGeneralRef = doc(db, 'abonosGeneralesJoselito', abono.abonoGeneralId);
            const abonoGeneralDoc = await getDoc(abonoGeneralRef);
            
            if (abonoGeneralDoc.exists()) {
              // Eliminar el abono del historial
              await deleteDoc(abonoGeneralRef);
              console.log('Abono eliminado del historial:', abono.abonoGeneralId);
              
              // También eliminar cualquier referencia en otras cuentas
              const cuentasRef = collection(db, 'cuentasJoselito');
              const querySnapshot = await getDocs(cuentasRef);
              
              const actualizacionesCuentas = querySnapshot.docs.map(async (docSnapshot) => {
                const cuentaData = docSnapshot.data();
                if (cuentaData.abonos) {
                  const abonosActualizados = cuentaData.abonos.filter(a => a.abonoGeneralId !== abono.abonoGeneralId);
                  
                  // Solo actualizar si hubo cambios en los abonos
                  if (abonosActualizados.length !== cuentaData.abonos.length) {
                    await updateDoc(doc(db, 'cuentasJoselito', docSnapshot.id), {
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
          const cuentaRef = doc(db, 'cuentasJoselito', id);
          await updateDoc(cuentaRef, {
            abonos: this.abonos,
            estadoPagado: this.totalDiaActual <= 0
          });
        }

        // Actualizar los saldos acumulados de todas las cuentas
        const cuentasRef = collection(db, 'cuentasJoselito');
        const q = query(cuentasRef, orderBy('fecha', 'asc'));
        const querySnapshot = await getDocs(q);
        const cuentasOrdenadas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        let saldoAcumulado = 0;
        const actualizaciones = [];

        for (let i = 0; i < cuentasOrdenadas.length; i++) {
          const cuenta = cuentasOrdenadas[i];
          const totalCobros = (cuenta.cobros || []).reduce((sum, cobro) => 
            sum + (parseFloat(cobro.monto) || 0), 0);
          const totalAbonos = (cuenta.abonos || []).reduce((sum, abono) => 
            sum + (parseFloat(abono.monto) || 0), 0);
          const totalDia = cuenta.totalGeneralVenta - totalCobros - totalAbonos;
          
          saldoAcumulado += totalDia;
          
          actualizaciones.push(updateDoc(doc(db, 'cuentasJoselito', cuenta.id), {
            saldoAcumuladoAnterior: i === 0 ? 0 : cuentasOrdenadas[i-1].nuevoSaldoAcumulado || 0,
            nuevoSaldoAcumulado: saldoAcumulado,
            estadoPagado: totalDia <= 0
          }));

          if (saldoAcumulado <= 0) {
            saldoAcumulado = 0;
          }
        }

        await Promise.all(actualizaciones);
        
        console.log('Abono eliminado exitosamente');
      } catch (error) {
        console.error('Error al eliminar abono:', error);
        alert('Error al eliminar el abono: ' + error.message);
      }
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
      this.editingKilosIndex = null;
      this.calcularTotalVenta(this.editingKilosIndex);
    },

    toggleGananciasMobile(index) {
      if (window.innerWidth <= 600) {
        this.selectedRowIndex = this.selectedRowIndex === index ? null : index;
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
            ultimaActualizacion: new Date().toISOString()
          };

          const docRef = doc(db, 'cuentasJoselito', id);
          await updateDoc(docRef, notaData);
        }
      } catch (error) {
        console.error('Error al guardar silenciosamente:', error);
      }
    }
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

.input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.responsive-input {
  width: 100%;
  max-width: 300px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  transition: border-color 0.3s ease;
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
  justify-content: space-between;
  margin-top: 20px;
}

.save-button,
.print-button {
  padding: 10px 20px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.save-button {
  background-color: #2196F3;
}

.print-button {
  background-color: #3760b0;
}

.save-button:hover {
  background-color: #1976D2;
}

.print-button:hover {
  background-color: #2c4d8c;
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
</style> 