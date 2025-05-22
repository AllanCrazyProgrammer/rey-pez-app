<template>
  <div class="nueva-deuda-container">
    <div class="back-button-container">
      <BackButton to="/procesos/deudas" />
    </div>
    <h1>Nueva Deuda a Proveedor</h1>
    
    <div class="fecha-actual">
      <input type="date" v-model="fechaSeleccionada">
      <span>{{ fechaFormateada }}</span>
    </div>

    <div class="proveedor-selector">
      <h2>Seleccionar Proveedor</h2>
      <select v-model="proveedorSeleccionado" required>
        <option value="" disabled>Seleccione un proveedor</option>
        <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.id">
          {{ proveedor.nombre }}
        </option>
      </select>
      <span v-if="proveedorSeleccionado && getNombreProveedor()" class="proveedor-info">
        Proveedor: {{ getNombreProveedor() }}
      </span>
    </div>

    <div class="input-section" v-if="proveedorSeleccionado">
      <h2>Ingresar Productos</h2>
      <div class="input-row">
        <input v-model.number="newItem.kilos" type="number" placeholder="Kilos">
        <input v-model="newItem.producto" type="text" placeholder="Producto">
        <input v-model.number="newItem.precio" type="number" placeholder="Precio">
        <span class="total-calculado">Total: ${{ calcularTotal(newItem) }}</span>
        <button @click="addItem" class="add-btn">Agregar</button>
      </div>
    </div>

    <table class="tabla-principal" v-if="items.length > 0">
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
          <td @click="editarItem(index, 'kilos')">
            <span v-if="!item.editando || item.campoEditando !== 'kilos'">{{ formatNumber(item.kilos) }}</span>
            <input v-else v-model.number="item.kilos" type="number" @blur="finalizarEdicion(index)" @keyup.enter="finalizarEdicion(index)">
          </td>
          <td @click="editarItem(index, 'producto')">
            <span v-if="!item.editando || item.campoEditando !== 'producto'">{{ item.producto }}</span>
            <input v-else v-model="item.producto" type="text" @blur="finalizarEdicion(index)" @keyup.enter="finalizarEdicion(index)">
          </td>
          <td @click="editarItem(index, 'precio')">
            <span v-if="!item.editando || item.campoEditando !== 'precio'">${{ formatNumber(item.precio) }}</span>
            <input v-else v-model.number="item.precio" type="number" @blur="finalizarEdicion(index)" @keyup.enter="finalizarEdicion(index)">
          </td>
          <td>${{ formatNumber(item.total) }}</td>
          <td class="action-column">
            <button @click="removeItem(index)" class="delete-btn">Eliminar</button>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="total-label">Total</td>
          <td>${{ formatNumber(totalGeneral) }}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

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

export default {
  name: 'NuevaDeuda',
  components: {
    BackButton
  },
  data() {
    return {
      proveedores: [],
      proveedorSeleccionado: '',
      fechaSeleccionada: this.obtenerFechaActual(),
      items: [],
      abonos: [],
      guardando: false,
      newItem: {
        kilos: null,
        producto: '',
        precio: null
      }
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
      return fecha.toISOString().split('T')[0];
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
    calcularTotal(item) {
      if (item.kilos && item.precio) {
        return this.formatNumber(item.kilos * item.precio);
      }
      return '0.00';
    },
    formatNumber(number) {
      return number ? number.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    },
    addItem() {
      if (!this.newItem.kilos || !this.newItem.producto || !this.newItem.precio) {
        alert('Por favor complete todos los campos del producto');
        return;
      }

      const total = this.newItem.kilos * this.newItem.precio;
      
      this.items.push({
        kilos: this.newItem.kilos,
        producto: this.newItem.producto,
        precio: this.newItem.precio,
        total: total,
        editando: false,
        campoEditando: null
      });

      // Limpiar formulario
      this.newItem = {
        kilos: null,
        producto: '',
        precio: null
      };
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
.nueva-deuda-container {
  max-width: 1000px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
}

h2 {
  color: #3498db;
  margin-top: 30px;
  margin-bottom: 15px;
}

.fecha-actual {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.fecha-actual input {
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
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

/* Tabla styles */
.tabla-principal {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.tabla-principal th, .tabla-principal td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.tabla-principal th {
  background-color: #3498db;
  color: white;
}

.tabla-principal tbody tr:hover {
  background-color: #f5f5f5;
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
}
</style> 