<template>
  <div class="nueva-deuda">
    <div class="back-button-container">
      <BackButton to="/procesos/deudas" />
    </div>
    
    <!-- Header moderno -->
    <div class="header-section">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-new">➕</i>
          Nueva Deuda a Proveedor
        </h1>
        <p class="subtitle">Registra una nueva deuda con productos y abonos iniciales</p>
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
          {{ proveedor.nombre }}
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
            <span class="proveedor-label">Proveedor seleccionado</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de productos -->
    <div class="productos-card" v-if="proveedorSeleccionado">
      <h3 class="section-title">
        <i class="icon-products">📦</i>
        Ingresar Productos
      </h3>
      <ProductoSelector 
        :proveedor-id="proveedorSeleccionado"
        @agregar-producto="addItem"
      />
    </div>

    <!-- Tabla de productos -->
    <div class="tabla-container" v-if="items.length > 0">
      <h3 class="section-title">
        <i class="icon-list">📋</i>
        Productos Agregados
      </h3>
      <div class="tabla-wrapper">
        <table class="tabla-productos">
          <thead>
            <tr>
              <th>Kilos</th>
              <th>Producto</th>
              <th>Precio</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items" :key="index">
              <td @click="editarItem(index, 'kilos')" class="editable">
                <span v-if="!item.editando || item.campoEditando !== 'kilos'">{{ formatNumber(item.kilos) }}</span>
                <input v-else v-model.number="item.kilos" type="number" class="table-input" @blur="finalizarEdicion(index)" @keyup.enter="finalizarEdicion(index)">
              </td>
              <td @click="editarItem(index, 'producto')" class="editable">
                <span v-if="!item.editando || item.campoEditando !== 'producto'">{{ item.producto }}</span>
                <input v-else v-model="item.producto" type="text" class="table-input" @blur="finalizarEdicion(index)" @keyup.enter="finalizarEdicion(index)">
              </td>
              <td @click="editarItem(index, 'precio')" class="editable">
                <span v-if="!item.editando || item.campoEditando !== 'precio'">${{ formatNumber(item.precio) }}</span>
                <input v-else v-model.number="item.precio" type="number" class="table-input" @blur="finalizarEdicion(index)" @keyup.enter="finalizarEdicion(index)">
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

    <div class="abonos-section" v-if="items.length > 0">
      <h2>Abonos Iniciales</h2>
      <div class="abonos">
        <div class="input-row" v-for="(abono, index) in abonos" :key="index">
          <input v-model="abono.descripcion" type="text" placeholder="Descripción">
          <input v-model.number="abono.monto" type="number" placeholder="Monto">
          <button @click="removeAbono(index)" class="delete-btn">Eliminar</button>
        </div>
        <button @click="addAbono" class="add-btn">Agregar Abono</button>
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
import { ref, computed, onMounted } from 'vue';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'vue-router';
import BackButton from '@/components/BackButton.vue';
import ProductoSelector from '@/components/Deudas/ProductoSelector.vue';

export default {
  name: 'NuevaDeuda',
  components: {
    BackButton,
    ProductoSelector
  },
  data() {
    return {
      proveedores: [],
      proveedorSeleccionado: '',
      fechaSeleccionada: this.obtenerFechaActual(),
      items: [],
      abonos: [],
      guardando: false
    };
  },
  computed: {
    fechaFormateada() {
      const fecha = new Date(this.fechaSeleccionada + 'T00:00:00');
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    totalGeneral() {
      return this.items.reduce((sum, item) => sum + item.total, 0);
    },
    totalAbonos() {
      return this.abonos.reduce((sum, abono) => sum + (abono.monto || 0), 0);
    },
    saldoPendiente() {
      return this.totalGeneral - this.totalAbonos;
    }
  },
  methods: {
    obtenerFechaActual() {
      const fecha = new Date();
      // Usar la zona horaria local para evitar problemas de UTC
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // getMonth() retorna 0-11
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${año}-${mes}-${dia}`;
    },
    async loadProveedores() {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedoresDeuda'));
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar proveedores: ", error);
      }
    },
    getNombreProveedor() {
      const proveedor = this.proveedores.find(p => p.id === this.proveedorSeleccionado);
      return proveedor ? proveedor.nombre : '';
    },
    getProveedorColor(proveedorId) {
      const proveedor = this.proveedores.find(p => p.id === proveedorId);
      return proveedor && proveedor.color ? proveedor.color : '#cccccc';
    },
    formatNumber(number) {
      return number ? number.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    },
    addItem(item) {
      this.items.push({
        kilos: item.kilos,
        producto: item.producto,
        precio: item.precio,
        total: item.total,
        editando: false,
        campoEditando: null
      });
    },
    removeItem(index) {
      this.items.splice(index, 1);
    },
    editarItem(index, campo) {
      this.items = this.items.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            editando: true,
            campoEditando: campo
          };
        } else {
          return {
            ...item,
            editando: false,
            campoEditando: null
          };
        }
      });
    },
    finalizarEdicion(index) {
      const item = this.items[index];
      // Recalcular el total
      item.total = item.kilos * item.precio;
      
      // Finalizar edición
      item.editando = false;
      item.campoEditando = null;
    },
    addAbono() {
      this.abonos.push({
        descripcion: '',
        monto: null,
        fecha: this.fechaSeleccionada
      });
    },
    removeAbono(index) {
      this.abonos.splice(index, 1);
    },
    async guardarDeuda() {
      if (!this.proveedorSeleccionado) {
        alert('Por favor seleccione un proveedor');
        return;
      }

      if (this.items.length === 0) {
        alert('Por favor agregue al menos un producto');
        return;
      }

      try {
        this.guardando = true;
        
        // Crear la nueva deuda
        const deudaRef = await addDoc(collection(db, 'deudas'), {
          proveedorId: this.proveedorSeleccionado,
          proveedorNombre: this.getNombreProveedor(),
          fecha: this.fechaSeleccionada,
          fechaCreacion: new Date(),
          total: this.totalGeneral,
          saldoPendiente: this.saldoPendiente,
          estado: this.saldoPendiente > 0 ? 'pendiente' : 'pagado'
        });

        // Guardar los productos de la deuda
        const productosRef = collection(db, 'deudas', deudaRef.id, 'productos');
        
        for (const item of this.items) {
          await addDoc(productosRef, {
            kilos: item.kilos,
            producto: item.producto,
            precio: item.precio,
            total: item.total
          });
        }

        // Guardar los abonos iniciales
        if (this.abonos.length > 0) {
          const abonosRef = collection(db, 'deudas', deudaRef.id, 'abonos');
          
          for (const abono of this.abonos) {
            if (abono.descripcion && abono.monto) {
              await addDoc(abonosRef, {
                descripcion: abono.descripcion,
                monto: abono.monto,
                fecha: this.fechaSeleccionada,
                fechaCreacion: new Date()
              });
            }
          }
        }

        alert('Deuda guardada correctamente');
        this.$router.push('/procesos/deudas/lista');
      } catch (error) {
        console.error("Error al guardar la deuda: ", error);
        alert('Error al guardar la deuda: ' + error.message);
      } finally {
        this.guardando = false;
      }
    }
  },
  mounted() {
    this.loadProveedores();
  }
};
</script>

<style scoped>
.nueva-deuda {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  color: white;
  position: relative;
}

.back-button-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}

/* Header moderno */
.header-section {
  text-align: center;
  margin-bottom: 40px;
  margin-top: 60px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
  width: 100%;
}

.main-title {
  font-size: 2.8rem;
  font-weight: 700;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.icon-new {
  font-size: 3rem;
}

.subtitle {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 300;
}

/* Cards de sección */
.fecha-card,
.proveedor-card,
.productos-card,
.tabla-container {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
}

/* Estilos de fecha */
.fecha-container {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.fecha-display {
  color: white;
  font-weight: 500;
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Estilos de proveedor */
.proveedor-info {
  margin-top: 15px;
  padding: 12px 16px;
  background: rgba(76, 175, 80, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
}

.proveedor-info span {
  color: white;
}

/* Inputs y selects modernos */
.modern-input,
.modern-select {
  width: 100%;
  padding: 12px 15px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.modern-input:focus,
.modern-select:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.modern-select option {
  background: #667eea;
  color: white;
}

.proveedor-selector {
  margin-bottom: 30px;
}

.proveedor-selector select {
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
  margin-bottom: 10px;
  font-size: 1em;
}

.proveedor-info {
  display: block;
  font-weight: bold;
  color: #3498db;
  margin-top: 5px;
}

.input-section {
  margin-bottom: 30px;
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
}

.input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.input-row input {
  flex: 1;
  min-width: 100px;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
}

.total-calculado {
  font-weight: bold;
  color: #3498db;
  min-width: 120px;
}

.add-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-btn:hover {
  background-color: #2980b9;
}

/* Tabla moderna */
.tabla-wrapper {
  overflow-x: auto;
}

.tabla-productos {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.tabla-productos th,
.tabla-productos td {
  padding: 15px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.tabla-productos th {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tabla-productos tbody tr {
  transition: all 0.3s ease;
}

.tabla-productos tbody tr:hover {
  background: rgba(255, 255, 255, 0.1);
}

.editable {
  cursor: pointer;
  transition: all 0.3s ease;
}

.editable:hover {
  background: rgba(255, 255, 255, 0.1);
}

.table-input {
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 5px;
  padding: 5px 8px;
  width: 100%;
}

.total-cell {
  font-weight: 600;
  color: #4CAF50;
}

.total-row {
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

.total-label {
  text-align: right;
  font-weight: 600;
  font-size: 1.1rem;
}

.total-amount {
  font-weight: 700;
  font-size: 1.2rem;
  color: #4CAF50;
}

.btn-delete {
  background: linear-gradient(45deg, #FF6B6B, #EE5A52);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(255, 107, 107, 0.4);
}

.icon-trash {
  font-size: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .nueva-deuda {
    padding: 20px;
  }

  .header-section {
    padding: 20px;
    margin-bottom: 30px;
    margin-top: 80px;
  }

  .main-title {
    font-size: 2.2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .fecha-container {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .tabla-productos th,
  .tabla-productos td {
    padding: 10px 8px;
    font-size: 0.9rem;
  }

  .back-button-container {
    top: 15px;
    left: 15px;
  }
}

@media (max-width: 480px) {
  .nueva-deuda {
    padding: 15px;
  }

  .header-section {
    padding: 15px;
    margin-top: 70px;
  }

  .main-title {
    font-size: 1.8rem;
    flex-direction: column;
    gap: 10px;
  }

  .icon-new {
    font-size: 2.5rem;
  }

  .fecha-card,
  .proveedor-card,
  .productos-card,
  .tabla-container {
    padding: 20px;
  }

  .back-button-container {
    top: 10px;
    left: 10px;
  }
}

.tabla-principal tfoot {
  font-weight: bold;
}

.tabla-principal tfoot td {
  border-top: 2px solid #3498db;
}

.total-label {
  text-align: right;
}

.action-column {
  width: 100px;
  text-align: center;
}

.delete-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.delete-btn:hover {
  background-color: #c0392b;
}

/* Abonos section */
.abonos-section {
  margin-bottom: 30px;
}

.abonos {
  margin-bottom: 20px;
}

.resumen {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
}

.resumen h3 {
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
}

.resumen-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.resumen-item.total {
  font-weight: bold;
  font-size: 1.2em;
  color: #3498db;
  border-top: 1px solid #ddd;
  padding-top: 10px;
  margin-top: 10px;
}

/* Button container */
.button-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.save-button {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1.1em;
  transition: background-color 0.3s;
}

.save-button:hover {
  background-color: #27ae60;
}

.save-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* Responsive adjustments */
/* Estilos para indicador de color del proveedor */
.proveedor-selected-info {
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 15px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.proveedor-color-display {
  display: flex;
  align-items: center;
  gap: 15px;
}

.color-indicator-large {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.proveedor-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.proveedor-nombre {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.proveedor-label {
  font-size: 0.85rem;
  color: #7f8c8d;
  font-style: italic;
}

@media (max-width: 768px) {
  .input-row {
    flex-direction: column;
  }
  
  .input-row input, .input-row button, .total-calculado {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .tabla-principal {
    font-size: 0.9em;
  }
  
  .action-column {
    width: auto;
  }
  
  .proveedor-selected-info {
    padding: 12px;
    margin-top: 12px;
  }
  
  .proveedor-color-display {
    gap: 12px;
  }
  
  .color-indicator-large {
    width: 28px;
    height: 28px;
  }
  
  .proveedor-nombre {
    font-size: 1rem;
  }
  
  .proveedor-label {
    font-size: 0.8rem;
  }
}
</style> 