<template>
  <div class="registrar-entrada container py-4">
    <h2 class="text-center mb-4">Registrar Entrada</h2>
    
    <b-form @submit.prevent="registrarEntrada">
      <!-- Selección de Proveedor -->
      <b-form-group label="Proveedor:" label-class="font-weight-bold">
        <b-form-select
          v-model="entrada.proveedor"
          :options="proveedores"
          required
        ></b-form-select>
      </b-form-group>

      <!-- Fecha -->
      <b-form-group label="Fecha:" label-class="font-weight-bold">
        <b-form-input
          type="date"
          v-model="entrada.fecha"
          required
        ></b-form-input>
      </b-form-group>

      <!-- Lista de Productos -->
      <div class="productos-list">
        <h4 class="mb-3">Productos</h4>
        <div v-for="(producto, index) in entrada.productos" :key="index" class="producto-item mb-3 p-3 border rounded">
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
                v-if="entrada.productos.length > 1"
              >
                <i class="fas fa-trash"></i>
              </b-button>
            </div>
          </div>
          
          <div class="row">
            <div class="col-md-4">
              <b-form-group label="Precio por unidad:" label-class="font-weight-bold">
                <b-form-input
                  type="number"
                  v-model.number="producto.precioUnidad"
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

      <!-- Notas Generales -->
      <b-form-group label="Notas Generales:" label-class="font-weight-bold">
        <b-form-textarea
          v-model="entrada.notasGenerales"
          placeholder="Notas adicionales sobre la entrada..."
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
          {{ procesando ? 'Registrando...' : 'Registrar Entrada' }}
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
  name: 'RegistrarEntrada',
  data() {
    return {
      procesando: false,
      entrada: {
        fecha: new Date().toISOString().split('T')[0],
        proveedor: '',
        productos: [{
          producto: '',
          cantidad: 0,
          medida: '',
          precioUnidad: 0,
          notas: ''
        }],
        notasGenerales: '',
        timestamp: null
      },
      proveedores: [],
      productosDisponibles: [],
      medidas: []
    }
  },
  async created() {
    await this.cargarDatos()
  },
  methods: {
    async cargarDatos() {
      try {
        // Aquí cargaremos los datos de proveedores, productos y medidas desde Firestore
        // Por ahora usaremos datos de ejemplo
        this.proveedores = ['Proveedor 1', 'Proveedor 2', 'Proveedor 3']
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
      this.entrada.productos.push({
        producto: '',
        cantidad: 0,
        medida: '',
        precioUnidad: 0,
        notas: ''
      })
    },
    eliminarProducto(index) {
      if (this.entrada.productos.length > 1) {
        this.entrada.productos.splice(index, 1)
      }
    },
    async registrarEntrada() {
      this.procesando = true
      try {
        const entradaData = {
          ...this.entrada,
          tipo: 'entrada',
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString()
        }

        await addDoc(collection(db, 'movimientos'), entradaData)

        this.$bvToast.toast('Entrada registrada exitosamente', {
          title: 'Éxito',
          variant: 'success',
          solid: true
        })

        this.$router.push('/movimientos')
      } catch (error) {
        console.error('Error al registrar entrada:', error)
        this.$bvToast.toast('Error al registrar la entrada. Por favor, intenta nuevamente.', {
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
.registrar-entrada {
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
