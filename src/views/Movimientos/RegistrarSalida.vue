<template>
  <div class="registrar-salida container py-4">
    <h2 class="text-center mb-4">Registrar Salida</h2>
    
    <b-form @submit.prevent="registrarSalida">
      <!-- Cliente -->
      <b-form-group label="Cliente:" label-class="font-weight-bold">
        <b-form-select
          v-model="salida.cliente"
          :options="clientes"
          required
        ></b-form-select>
      </b-form-group>

      <!-- Fecha -->
      <b-form-group label="Fecha:" label-class="font-weight-bold">
        <b-form-input
          type="date"
          v-model="salida.fecha"
          required
        ></b-form-input>
      </b-form-group>

      <!-- Lista de Productos -->
      <div class="productos-list">
        <h4 class="mb-3">Productos</h4>
        <div v-for="(producto, index) in salida.productos" :key="index" class="producto-item mb-3 p-3 border rounded">
          <div class="row">
            <div class="col-md-4">
              <b-form-group label="Producto:" label-class="font-weight-bold">
                <b-form-select
                  v-model="producto.producto"
                  :options="productosDisponibles"
                  required
                ></b-form-select>
              </b-form-group>
            </div>
            <div class="col-md-3">
              <b-form-group label="Cantidad:" label-class="font-weight-bold">
                <b-form-input
                  type="number"
                  v-model.number="producto.cantidad"
                  min="0"
                  step="0.01"
                  required
                ></b-form-input>
              </b-form-group>
            </div>
            <div class="col-md-3">
              <b-form-group label="Medida:" label-class="font-weight-bold">
                <b-form-select
                  v-model="producto.medida"
                  :options="medidas"
                  required
                ></b-form-select>
              </b-form-group>
            </div>
            <div class="col-md-2 d-flex align-items-end">
              <b-button 
                variant="danger" 
                size="sm"
                @click="eliminarProducto(index)"
                class="mb-3"
                v-if="salida.productos.length > 1"
              >
                <i class="fas fa-trash"></i>
              </b-button>
            </div>
          </div>
          
          <div class="row">
            <div class="col-md-4">
              <b-form-group label="Precio de venta:" label-class="font-weight-bold">
                <b-form-input
                  type="number"
                  v-model.number="producto.precioVenta"
                  min="0"
                  step="0.01"
                  required
                ></b-form-input>
              </b-form-group>
            </div>
            <div class="col-md-8">
              <b-form-group label="Notas:" label-class="font-weight-bold">
                <b-form-input
                  type="text"
                  v-model="producto.notas"
                  placeholder="Notas adicionales..."
                ></b-form-input>
              </b-form-group>
            </div>
          </div>
        </div>
      </div>

      <!-- Botón para agregar más productos -->
      <div class="text-center mb-4">
        <b-button 
          variant="success" 
          @click="agregarProducto" 
          class="mr-2"
        >
          <i class="fas fa-plus mr-2"></i>Agregar Producto
        </b-button>
      </div>

      <!-- Método de Pago -->
      <b-form-group label="Método de Pago:" label-class="font-weight-bold">
        <b-form-select
          v-model="salida.metodoPago"
          :options="metodosPago"
          required
        ></b-form-select>
      </b-form-group>

      <!-- Estado de Pago -->
      <b-form-group label="Estado de Pago:" label-class="font-weight-bold">
        <b-form-select
          v-model="salida.estadoPago"
          :options="estadosPago"
          required
        ></b-form-select>
      </b-form-group>

      <!-- Notas Generales -->
      <b-form-group label="Notas Generales:" label-class="font-weight-bold">
        <b-form-textarea
          v-model="salida.notasGenerales"
          placeholder="Notas adicionales sobre la salida..."
          rows="3"
        ></b-form-textarea>
      </b-form-group>

      <!-- Botones de acción -->
      <div class="text-center mt-4">
        <b-button 
          type="submit" 
          variant="primary" 
          class="mr-2"
          :disabled="procesando"
        >
          <b-spinner small v-if="procesando"></b-spinner>
          {{ procesando ? 'Registrando...' : 'Registrar Salida' }}
        </b-button>
        <b-button 
          variant="secondary" 
          @click="$router.push('/movimientos')"
          :disabled="procesando"
        >
          Cancelar
        </b-button>
      </div>
    </b-form>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default {
  name: 'RegistrarSalida',
  data() {
    return {
      procesando: false,
      salida: {
        fecha: new Date().toISOString().split('T')[0],
        cliente: '',
        productos: [{
          producto: '',
          cantidad: 0,
          medida: '',
          precioVenta: 0,
          notas: ''
        }],
        metodoPago: '',
        estadoPago: '',
        notasGenerales: '',
        timestamp: null
      },
      clientes: [],
      productosDisponibles: [],
      medidas: [],
      metodosPago: ['Efectivo', 'Transferencia', 'Cheque'],
      estadosPago: ['Pagado', 'Pendiente', 'Parcial']
    }
  },
  async created() {
    await this.cargarDatos()
  },
  methods: {
    async cargarDatos() {
      try {
        // Aquí cargaremos los datos de clientes, productos y medidas desde Firestore
        // Por ahora usaremos datos de ejemplo
        this.clientes = ['Cliente 1', 'Cliente 2', 'Cliente 3']
        this.productosDisponibles = ['Producto 1', 'Producto 2', 'Producto 3']
        this.medidas = ['KG', 'Libras', 'Toneladas']
      } catch (error) {
        console.error('Error al cargar datos:', error)
        this.$bvToast.toast('Error al cargar datos. Por favor, recarga la página.', {
          title: 'Error',
          variant: 'danger',
          solid: true
        })
      }
    },
    agregarProducto() {
      this.salida.productos.push({
        producto: '',
        cantidad: 0,
        medida: '',
        precioVenta: 0,
        notas: ''
      })
    },
    eliminarProducto(index) {
      if (this.salida.productos.length > 1) {
        this.salida.productos.splice(index, 1)
      }
    },
    async registrarSalida() {
      this.procesando = true
      try {
        const salidaData = {
          ...this.salida,
          tipo: 'salida',
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString()
        }

        await addDoc(collection(db, 'movimientos'), salidaData)

        this.$bvToast.toast('Salida registrada exitosamente', {
          title: 'Éxito',
          variant: 'success',
          solid: true
        })

        this.$router.push('/movimientos')
      } catch (error) {
        console.error('Error al registrar salida:', error)
        this.$bvToast.toast('Error al registrar la salida. Por favor, intenta nuevamente.', {
          title: 'Error',
          variant: 'danger',
          solid: true
        })
      } finally {
        this.procesando = false
      }
    }
  }
}
</script>

<style scoped>
.registrar-salida {
  max-width: 1200px;
  margin: 0 auto;
}

.producto-item {
  background-color: #f8f9fa;
  transition: all 0.3s ease;
}

.producto-item:hover {
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 1rem;
}
</style>
