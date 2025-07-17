<template>
  <div class="nueva-deuda-barco">
    <div class="back-button-container">
      <BackButton to="/barcos" />
    </div>
    
    <!-- Header moderno -->
    <div class="header-section">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-new">➕</i>
          Nueva Deuda - {{ nombreBarco }}
        </h1>
        <p class="subtitle">Registra una nueva deuda para el barco {{ nombreBarco }}</p>
      </div>
    </div>

    <!-- Información del barco -->
    <div class="barco-info-card">
      <div class="barco-display">
        <i class="barco-icon">{{ barcoSeleccionado === 'galileo' ? '🚢' : '🛥️' }}</i>
        <div class="barco-details">
          <h3>{{ nombreBarco }}</h3>
          <p>Barco seleccionado</p>
        </div>
      </div>
    </div>

    <!-- Sección de fecha -->
    <div class="fecha-card">
      <h3 class="section-title">
        <i class="icon-calendar">📅</i>
        Fecha de la Deuda
      </h3>
      <div class="fecha-container">
        <input type="date" v-model="fechaSeleccionada" class="modern-input">
        <span class="fecha-display">{{ fechaFormateada }}</span>
      </div>
    </div>

    <!-- Selector de proveedor -->
    <div class="proveedor-card">
      <h3 class="section-title">
        <i class="icon-supplier">🏭</i>
        Seleccionar Proveedor
      </h3>
      <select v-model="proveedorSeleccionado" required class="modern-select">
        <option value="" disabled>Seleccione un proveedor</option>
        <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.id">
          {{ proveedor.nombre }} {{ proveedor.tipo ? `- ${proveedor.tipo}` : '' }}
        </option>
      </select>
      <div v-if="proveedorSeleccionado && getNombreProveedor()" class="proveedor-selected-info">
        <div class="proveedor-color-display">
          <div 
            class="color-indicator-large" 
            :style="{ backgroundColor: getProveedorColor(proveedorSeleccionado) }"
          ></div>
          <div class="proveedor-details">
            <span class="proveedor-nombre">{{ getNombreProveedor() }}</span>
            <span class="proveedor-tipo" v-if="getProveedorTipo()">{{ getProveedorTipo() }}</span>
            <span class="proveedor-label">Proveedor seleccionado</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de productos/servicios -->
    <div class="productos-card" v-if="proveedorSeleccionado">
      <h3 class="section-title">
        <i class="icon-products">📦</i>
        Agregar Productos o Servicios
      </h3>
      
      <form @submit.prevent="addItem" class="add-item-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="modern-label">
              <i class="label-icon">📝</i>
              Descripción
            </label>
            <input 
              v-model="nuevoItem.descripcion" 
              type="text" 
              required
              placeholder="Ej: Combustible Diesel, Aceite de motor, etc."
              class="modern-input"
            >
          </div>
          
          <div class="form-group">
            <label class="modern-label">
              <i class="label-icon">🔢</i>
              Cantidad
            </label>
            <input 
              v-model.number="nuevoItem.cantidad" 
              type="number"
              step="0.01"
              required
              placeholder="1"
              class="modern-input"
              @input="calcularTotal"
            >
          </div>
          
          <div class="form-group">
            <label class="modern-label">
              <i class="label-icon">💰</i>
              Precio Unitario
            </label>
            <input 
              v-model.number="nuevoItem.precioUnitario" 
              type="number" 
              step="0.01"
              required
              placeholder="0.00"
              class="modern-input"
              @input="calcularTotal"
            >
          </div>
          
          <div class="form-group">
            <label class="modern-label">
              <i class="label-icon">🧮</i>
              Total Calculado
            </label>
            <input 
              :value="formatNumber(nuevoItem.total || 0)" 
              type="text"
              readonly
              class="modern-input readonly-input"
            >
          </div>
        </div>
        
        <button type="submit" class="add-item-button">
          <i class="btn-icon">➕</i>
          Agregar
        </button>
      </form>
    </div>

    <!-- Tabla de items -->
    <div class="tabla-container" v-if="items.length > 0">
      <h3 class="section-title">
        <i class="icon-list">📋</i>
        Items Agregados
      </h3>
      <div class="tabla-wrapper">
        <table class="tabla-items">
                     <thead>
             <tr>
               <th>Descripción</th>
               <th>Cantidad</th>
               <th>Precio Unit.</th>
               <th>Total</th>
               <th>Acciones</th>
             </tr>
           </thead>
           <tbody>
             <tr v-for="(item, index) in items" :key="index">
               <td @click="editarItem(index, 'descripcion')" class="editable">
                 <span v-if="!item.editando || item.campoEditando !== 'descripcion'">{{ item.descripcion }}</span>
                 <input v-else v-model="item.descripcion" type="text" class="table-input" @blur="finalizarEdicion(index)" @keyup.enter="finalizarEdicion(index)">
               </td>
               <td @click="editarItem(index, 'cantidad')" class="editable">
                 <span v-if="!item.editando || item.campoEditando !== 'cantidad'">{{ formatNumber(item.cantidad) }}</span>
                 <input v-else v-model.number="item.cantidad" type="number" class="table-input" @blur="finalizarEdicion(index)" @keyup.enter="recalcularTotal(index)">
               </td>
               <td @click="editarItem(index, 'precioUnitario')" class="editable">
                 <span v-if="!item.editando || item.campoEditando !== 'precioUnitario'">${{ formatNumber(item.precioUnitario) }}</span>
                 <input v-else v-model.number="item.precioUnitario" type="number" class="table-input" @blur="finalizarEdicion(index)" @keyup.enter="recalcularTotal(index)">
               </td>
               <td class="total-cell">${{ formatNumber(item.total) }}</td>
               <td class="action-column">
                 <button @click="removeItem(index)" class="btn-delete">
                   <i class="icon-trash">🗑️</i>
                 </button>
               </td>
             </tr>
           </tbody>
           <tfoot>
             <tr class="total-row">
               <td colspan="3" class="total-label">Total General</td>
               <td class="total-amount">${{ formatNumber(totalGeneral) }}</td>
               <td></td>
             </tr>
           </tfoot>
        </table>
      </div>
    </div>

    <!-- Sección de abonos -->
    <div class="abonos-section" v-if="items.length > 0">
      <h2>Abonos Iniciales (Opcional)</h2>
      <div class="abonos">
        <div class="abono-row" v-for="(abono, index) in abonos" :key="index">
          <input 
            v-model="abono.descripcion" 
            type="text" 
            placeholder="Descripción del abono"
            class="modern-input"
          >
          <input 
            v-model.number="abono.monto" 
            type="number" 
            placeholder="Monto"
            class="modern-input"
          >
          <button @click="removeAbono(index)" class="delete-btn">
            <i class="icon-trash">🗑️</i>
          </button>
        </div>
        <button @click="addAbono" class="add-abono-btn">
          <i class="btn-icon">➕</i>
          Agregar Abono
        </button>
      </div>

      <div class="resumen">
        <h3>Resumen</h3>
        <div class="resumen-item">
          <span>Total deuda:</span>
          <span>${{ formatNumber(totalGeneral) }}</span>
        </div>
        <div class="resumen-item">
          <span>Total abonos:</span>
          <span>${{ formatNumber(totalAbonos) }}</span>
        </div>
        <div class="resumen-item total">
          <span>Saldo pendiente:</span>
          <span>${{ formatNumber(saldoPendiente) }}</span>
        </div>
      </div>
    </div>

    <div class="button-container" v-if="proveedorSeleccionado && items.length > 0">
      <button @click="guardarDeuda" class="save-button" :disabled="guardando">
        {{ guardando ? 'Guardando...' : 'Guardar Deuda' }}
      </button>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';

export default {
  name: 'NuevaDeudaBarco',
  components: {
    BackButton
  },
  data() {
    return {
      barcoSeleccionado: '',
      fechaSeleccionada: new Date().toISOString().split('T')[0],
      proveedorSeleccionado: '',
      proveedores: [],
      nuevoItem: {
        descripcion: '',
        cantidad: 1,
        precioUnitario: null,
        total: 0
      },
      items: [],
      abonos: [],
      guardando: false
    };
  },
  computed: {
    nombreBarco() {
      return this.barcoSeleccionado === 'galileo' ? 'El Galileo' : 'María Guadalupe';
    },
    fechaFormateada() {
      if (!this.fechaSeleccionada) return '';
      const fecha = new Date(this.fechaSeleccionada + 'T00:00:00');
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    totalGeneral() {
      return this.items.reduce((total, item) => total + (parseFloat(item.total) || 0), 0);
    },
    totalAbonos() {
      return this.abonos.reduce((total, abono) => total + (parseFloat(abono.monto) || 0), 0);
    },
    saldoPendiente() {
      return this.totalGeneral - this.totalAbonos;
    }
  },
  mounted() {
    // Obtener el barco de la query string
    const urlParams = new URLSearchParams(window.location.search);
    this.barcoSeleccionado = urlParams.get('barco') || localStorage.getItem('barcoSeleccionado') || 'galileo';
    
    this.loadProveedores();
  },
  methods: {
    async loadProveedores() {
      try {
        const q = query(collection(db, 'proveedoresBarcos'), orderBy('nombre'));
        const querySnapshot = await getDocs(q);
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
      }
    },
    getNombreProveedor() {
      const proveedor = this.proveedores.find(p => p.id === this.proveedorSeleccionado);
      return proveedor ? proveedor.nombre : '';
    },
    getProveedorColor(id) {
      const proveedor = this.proveedores.find(p => p.id === id);
      return proveedor?.color || '#6c757d';
    },
    getProveedorTipo() {
      const proveedor = this.proveedores.find(p => p.id === this.proveedorSeleccionado);
      return proveedor?.tipo || '';
    },
    calcularTotal() {
      const cantidad = parseFloat(this.nuevoItem.cantidad) || 0;
      const precio = parseFloat(this.nuevoItem.precioUnitario) || 0;
      this.nuevoItem.total = cantidad * precio;
    },
    addItem() {
      if (!this.nuevoItem.descripcion || !this.nuevoItem.precioUnitario || !this.nuevoItem.cantidad) {
        alert('Por favor complete todos los campos obligatorios');
        return;
      }

      this.calcularTotal();

      this.items.push({
        descripcion: this.nuevoItem.descripcion,
        cantidad: parseFloat(this.nuevoItem.cantidad),
        precioUnitario: parseFloat(this.nuevoItem.precioUnitario),
        total: this.nuevoItem.total,
        editando: false,
        campoEditando: null
      });

      // Limpiar formulario
      this.nuevoItem = {
        descripcion: '',
        cantidad: 1,
        precioUnitario: null,
        total: 0
      };
    },
    removeItem(index) {
      this.items.splice(index, 1);
    },
    editarItem(index, campo) {
      this.items[index].editando = true;
      this.items[index].campoEditando = campo;
    },
    finalizarEdicion(index) {
      const item = this.items[index];
      // Recalcular total si se editó cantidad o precio
      if (item.campoEditando === 'cantidad' || item.campoEditando === 'precioUnitario') {
        const cantidad = parseFloat(item.cantidad) || 0;
        const precio = parseFloat(item.precioUnitario) || 0;
        item.total = cantidad * precio;
      }
      
      item.editando = false;
      item.campoEditando = null;
    },
    recalcularTotal(index) {
      const item = this.items[index];
      const cantidad = parseFloat(item.cantidad) || 0;
      const precio = parseFloat(item.precioUnitario) || 0;
      item.total = cantidad * precio;
      
      item.editando = false;
      item.campoEditando = null;
    },
    addAbono() {
      this.abonos.push({
        descripcion: '',
        monto: 0
      });
    },
    removeAbono(index) {
      this.abonos.splice(index, 1);
    },
    formatNumber(num) {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num || 0);
    },
    async guardarDeuda() {
      if (this.guardando) return;
      
      console.log('💾 Guardando deuda para:', this.nombreBarco);
      
      if (!this.proveedorSeleccionado || this.items.length === 0) {
        alert('Por favor seleccione un proveedor y agregue al menos un item');
        return;
      }

      this.guardando = true;

      try {
        // Crear la deuda principal
        const deudaData = {
          barco: this.barcoSeleccionado,
          nombreBarco: this.nombreBarco,
          proveedorId: this.proveedorSeleccionado,
          nombreProveedor: this.getNombreProveedor(),
          fecha: this.fechaSeleccionada,
          items: this.items.map(item => ({
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            total: item.total
          })),
          totalDeuda: this.totalGeneral,
          totalAbonado: this.totalAbonos,
          saldoPendiente: this.saldoPendiente,
          estado: 'pendiente',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const docRef = await addDoc(collection(db, 'deudasBarcos'), deudaData);

        // Si hay abonos iniciales, guardarlos
        if (this.abonos.length > 0) {
          for (const abono of this.abonos) {
            if (abono.monto > 0) {
              await addDoc(collection(db, 'abonosBarcos'), {
                deudaId: docRef.id,
                barco: this.barcoSeleccionado,
                nombreBarco: this.nombreBarco,
                proveedorId: this.proveedorSeleccionado,
                nombreProveedor: this.getNombreProveedor(),
                descripcion: abono.descripcion || 'Abono inicial',
                monto: abono.monto,
                fecha: this.fechaSeleccionada,
                createdAt: new Date()
              });
            }
          }
        }

        console.log(`✅ Deuda guardada exitosamente para ${this.nombreBarco}`);
        alert('Deuda guardada exitosamente');
        this.$router.push(`/barcos/deudas/lista?barco=${this.barcoSeleccionado}`);

      } catch (error) {
        console.error('Error al guardar deuda:', error);
        alert('Error al guardar la deuda');
      } finally {
        this.guardando = false;
      }
    }
  }
};
</script>

<style scoped>
.nueva-deuda-barco {
  padding: 20px;
  max-width: 1200px;
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

/* Barco Info Card */
.barco-info-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.barco-display {
  display: flex;
  align-items: center;
  gap: 20px;
}

.barco-icon {
  font-size: 3em;
}

.barco-details h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5em;
}

.barco-details p {
  margin: 5px 0 0 0;
  color: #7f8c8d;
}

/* Fecha Card */
.fecha-card, .proveedor-card, .productos-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
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

.fecha-container {
  display: flex;
  align-items: center;
  gap: 20px;
}

.fecha-display {
  font-size: 1.1em;
  color: #34495e;
}

/* Form Styles */
.modern-input, .modern-select {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1em;
  transition: all 0.3s ease;
}

.modern-input:focus, .modern-select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.modern-select {
  cursor: pointer;
}

/* Proveedor Selected Info */
.proveedor-selected-info {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
}

.proveedor-color-display {
  display: flex;
  align-items: center;
  gap: 15px;
}

.color-indicator-large {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  flex-shrink: 0;
}

.proveedor-nombre {
  font-size: 1.2em;
  font-weight: 600;
  color: #2c3e50;
}

.proveedor-tipo {
  color: #7f8c8d;
  font-size: 0.9em;
}

.proveedor-label {
  color: #95a5a6;
  font-size: 0.9em;
}

/* Add Item Form */
.add-item-form {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 15px;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.readonly-input {
  background-color: #f8f9fa !important;
  cursor: not-allowed;
  color: #6c757d;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modern-label {
  font-weight: 600;
  color: #34495e;
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-icon {
  font-size: 1.2em;
}

.add-item-button {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 10px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
}

.add-item-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);
}

/* Tabla Container */
.tabla-container {
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.tabla-wrapper {
  overflow-x: auto;
}

.tabla-items {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.tabla-items th {
  background: #f8f9fa;
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e0e0e0;
}

.tabla-items td {
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.editable {
  cursor: pointer;
  position: relative;
}

.editable:hover {
  background: #f8f9fa;
}

.table-input {
  width: 100%;
  padding: 8px;
  border: 2px solid #3498db;
  border-radius: 5px;
  font-size: 1em;
}

.action-column {
  width: 80px;
  text-align: center;
}

.btn-delete {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-delete:hover {
  background: #ee5a24;
  transform: scale(1.05);
}

.total-row {
  font-weight: 600;
  background: #f8f9fa;
}

.total-label {
  text-align: right;
  color: #2c3e50;
  font-size: 1.1em;
}

.total-amount {
  color: #27ae60;
  font-size: 1.2em;
}

/* Abonos Section */
.abonos-section {
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.abonos-section h2 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.abonos {
  margin-bottom: 30px;
}

.abono-row {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: 15px;
  margin-bottom: 15px;
}

.delete-btn {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background: #ee5a24;
}

.add-abono-btn {
  background: linear-gradient(135deg, #e17055 0%, #fab1a0 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 10px;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
}

.add-abono-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(225, 112, 85, 0.3);
}

/* Resumen */
.resumen {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 15px;
}

.resumen h3 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.resumen-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 1.1em;
}

.resumen-item.total {
  border-top: 2px solid #e0e0e0;
  padding-top: 15px;
  font-weight: 600;
  color: #2c3e50;
}

/* Button Container */
.button-container {
  text-align: center;
  margin-bottom: 50px;
}

.save-button {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  border: none;
  padding: 18px 50px;
  border-radius: 12px;
  font-size: 1.2em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);
}

.save-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 184, 148, 0.4);
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .header-section {
    padding: 25px;
  }
  
  .main-title {
    font-size: 2em;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .abono-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .tabla-items {
    font-size: 0.9em;
  }
  
  .tabla-items th,
  .tabla-items td {
    padding: 10px;
  }
}
</style> 