<template>
  <div class="movimientos-diarios container py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <b-button variant="secondary" @click="$router.push('/movimientos')">
        Atrás
      </b-button>
      <h2 class="text-center mb-0">{{ formatDate(selectedDate) }}</h2>
    </div>

    <div class="date-selector text-center mb-4">
      <b-form-input
        type="date"
        v-model="selectedDate"
        class="w-auto mx-auto"
      ></b-form-input>
    </div>

    <div class="row">
      <!-- Columna de Salidas -->
      <div class="col-md-6">
        <h3 class="text-primary mb-4">Salidas</h3>
        <div class="mb-4">
          <div class="row">
            <div class="col-md-4 mb-2">
              <b-form-select
                v-model="nuevaSalida.proveedor"
                :options="proveedores"
                placeholder="Proveedor"
              ></b-form-select>
            </div>
            <div class="col-md-4 mb-2">
              <b-form-select
                v-model="nuevaSalida.producto"
                :options="productos"
                placeholder="Producto"
              ></b-form-select>
            </div>
            <div class="col-md-4 mb-2">
              <b-form-select
                v-model="nuevaSalida.medida"
                :options="medidas"
                placeholder="Medida"
              ></b-form-select>
            </div>
          </div>
          <div class="row mt-2">
            <div class="col-md-4 mb-2">
              <b-form-input
                v-model.number="nuevaSalida.cantidad"
                type="number"
                placeholder="Kilos"
                step="0.1"
              ></b-form-input>
            </div>
            <div class="col-md-4 mb-2">
              <b-form-input
                v-model.number="nuevaSalida.precio"
                type="number"
                placeholder="Precio (opcional)"
                step="0.01"
              ></b-form-input>
            </div>
            <div class="col-md-4">
              <b-button 
                variant="primary" 
                @click="agregarSalida"
                :disabled="!puedeAgregarSalida"
                class="w-100"
              >
                Agregar Salida
              </b-button>
            </div>
          </div>
        </div>

        <!-- Lista de Salidas -->
        <div class="salidas-list">
          <div v-for="(salida, index) in salidasDelDia" :key="'salida-'+index" class="movement-item p-2 mb-2">
            <div class="d-flex justify-content-between align-items-center">
              <span>
                {{ salida.tipo === 'maquila' ? 'Maquila: ' : 'Proveedor: ' }}
                {{ salida.proveedor }} - {{ salida.producto }}: {{ salida.cantidad }} {{ salida.medida }}
                <span v-if="salida.precio">${{ salida.precio }}</span>
              </span>
              <b-button 
                variant="danger" 
                size="sm"
                @click="eliminarSalida(index)"
              >
                <i class="fas fa-times"></i>
              </b-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna de Entradas -->
      <div class="col-md-6">
        <h3 class="text-success mb-4">Entradas</h3>
        <div class="mb-4">
          <div class="row">
            <div class="col-md-4 mb-2">
              <b-form-select
                v-model="nuevaEntrada.proveedor"
                :options="proveedores"
                placeholder="Proveedor"
              ></b-form-select>
            </div>
            <div class="col-md-4 mb-2">
              <b-form-select
                v-model="nuevaEntrada.producto"
                :options="productos"
                placeholder="Producto"
              ></b-form-select>
            </div>
            <div class="col-md-4 mb-2">
              <b-form-select
                v-model="nuevaEntrada.medida"
                :options="medidas"
                placeholder="Medida"
              ></b-form-select>
            </div>
          </div>
          <div class="row mt-2">
            <div class="col-md-4 mb-2">
              <b-form-input
                v-model.number="nuevaEntrada.cantidad"
                type="number"
                placeholder="Kilos"
                step="0.1"
              ></b-form-input>
            </div>
            <div class="col-md-4 mb-2">
              <b-form-input
                v-model.number="nuevaEntrada.precio"
                type="number"
                placeholder="Precio (opcional)"
                step="0.01"
              ></b-form-input>
            </div>
            <div class="col-md-4">
              <b-button 
                variant="success" 
                @click="agregarEntrada"
                :disabled="!puedeAgregarEntrada"
                class="w-100"
              >
                Agregar Entrada
              </b-button>
            </div>
          </div>
        </div>

        <!-- Lista de Entradas -->
        <div class="entradas-list">
          <div v-for="(entrada, index) in entradasDelDia" :key="'entrada-'+index" class="movement-item p-2 mb-2">
            <div class="d-flex justify-content-between align-items-center">
              <span>
                Proveedor: {{ entrada.proveedor }} - {{ entrada.producto }}: {{ entrada.cantidad }} {{ entrada.medida }}
                <span v-if="entrada.precio">${{ entrada.precio }}</span>
              </span>
              <b-button 
                variant="danger" 
                size="sm"
                @click="eliminarEntrada(index)"
              >
                <i class="fas fa-times"></i>
              </b-button>
            </div>
          </div>
          <div class="total-entradas mt-3">
            <h5>Total Entradas: {{ totalEntradas }} kg</h5>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'

export default {
  name: 'MovimientosDiarios',
  data() {
    return {
      selectedDate: new Date().toISOString().split('T')[0],
      nuevaSalida: {
        proveedor: '',
        producto: '',
        medida: '',
        cantidad: null,
        precio: null
      },
      nuevaEntrada: {
        proveedor: '',
        producto: '',
        medida: '',
        cantidad: null,
        precio: null
      },
      salidasDelDia: [],
      entradasDelDia: [],
      proveedores: ['Ozuna', 'Selecta', 'Zurdo', 'Pac sc', 'Mixta'],
      productos: ['26/30', '36/40', '41/50'],
      medidas: ['kg', 'libras', 'toneladas']
    }
  },
  computed: {
    puedeAgregarSalida() {
      return this.nuevaSalida.proveedor && 
             this.nuevaSalida.producto && 
             this.nuevaSalida.medida && 
             this.nuevaSalida.cantidad > 0
    },
    puedeAgregarEntrada() {
      return this.nuevaEntrada.proveedor && 
             this.nuevaEntrada.producto && 
             this.nuevaEntrada.medida && 
             this.nuevaEntrada.cantidad > 0
    },
    totalEntradas() {
      return this.entradasDelDia.reduce((total, entrada) => {
        return total + (entrada.cantidad || 0)
      }, 0).toFixed(1)
    }
  },
  watch: {
    selectedDate: {
      handler: 'cargarMovimientosDelDia',
      immediate: true
    }
  },
  methods: {
    formatDate(dateString) {
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' }
      return new Date(dateString).toLocaleDateString('es-MX', options)
    },
    async cargarMovimientosDelDia() {
      try {
        const startOfDay = new Date(this.selectedDate)
        startOfDay.setHours(0, 0, 0, 0)
        
        const endOfDay = new Date(this.selectedDate)
        endOfDay.setHours(23, 59, 59, 999)

        // Cargar salidas
        const salidasQuery = query(
          collection(db, 'movimientos'),
          where('tipo', '==', 'salida'),
          where('fecha', '>=', startOfDay.toISOString()),
          where('fecha', '<=', endOfDay.toISOString())
        )
        
        // Cargar entradas
        const entradasQuery = query(
          collection(db, 'movimientos'),
          where('tipo', '==', 'entrada'),
          where('fecha', '>=', startOfDay.toISOString()),
          where('fecha', '<=', endOfDay.toISOString())
        )

        const [salidasSnap, entradasSnap] = await Promise.all([
          getDocs(salidasQuery),
          getDocs(entradasQuery)
        ])

        this.salidasDelDia = salidasSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        this.entradasDelDia = entradasSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        console.error('Error al cargar movimientos:', error)
        this.$bvToast.toast('Error al cargar los movimientos del día', {
          title: 'Error',
          variant: 'danger',
          solid: true
        })
      }
    },
    async agregarSalida() {
      try {
        const salidaData = {
          ...this.nuevaSalida,
          tipo: 'salida',
          fecha: new Date(this.selectedDate).toISOString(),
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString()
        }

        await addDoc(collection(db, 'movimientos'), salidaData)
        
        // Limpiar formulario
        this.nuevaSalida = {
          proveedor: '',
          producto: '',
          medida: '',
          cantidad: null,
          precio: null
        }

        // Recargar movimientos
        await this.cargarMovimientosDelDia()

        this.$bvToast.toast('Salida registrada exitosamente', {
          title: 'Éxito',
          variant: 'success',
          solid: true
        })
      } catch (error) {
        console.error('Error al registrar salida:', error)
        this.$bvToast.toast('Error al registrar la salida', {
          title: 'Error',
          variant: 'danger',
          solid: true
        })
      }
    },
    async agregarEntrada() {
      try {
        const entradaData = {
          ...this.nuevaEntrada,
          tipo: 'entrada',
          fecha: new Date(this.selectedDate).toISOString(),
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString()
        }

        await addDoc(collection(db, 'movimientos'), entradaData)
        
        // Limpiar formulario
        this.nuevaEntrada = {
          proveedor: '',
          producto: '',
          medida: '',
          cantidad: null,
          precio: null
        }

        // Recargar movimientos
        await this.cargarMovimientosDelDia()

        this.$bvToast.toast('Entrada registrada exitosamente', {
          title: 'Éxito',
          variant: 'success',
          solid: true
        })
      } catch (error) {
        console.error('Error al registrar entrada:', error)
        this.$bvToast.toast('Error al registrar la entrada', {
          title: 'Error',
          variant: 'danger',
          solid: true
        })
      }
    },
    async eliminarSalida(index) {
      try {
        const salida = this.salidasDelDia[index]
        await deleteDoc(doc(db, 'movimientos', salida.id))
        await this.cargarMovimientosDelDia()
        
        this.$bvToast.toast('Salida eliminada exitosamente', {
          title: 'Éxito',
          variant: 'success',
          solid: true
        })
      } catch (error) {
        console.error('Error al eliminar salida:', error)
        this.$bvToast.toast('Error al eliminar la salida', {
          title: 'Error',
          variant: 'danger',
          solid: true
        })
      }
    },
    async eliminarEntrada(index) {
      try {
        const entrada = this.entradasDelDia[index]
        await deleteDoc(doc(db, 'movimientos', entrada.id))
        await this.cargarMovimientosDelDia()
        
        this.$bvToast.toast('Entrada eliminada exitosamente', {
          title: 'Éxito',
          variant: 'success',
          solid: true
        })
      } catch (error) {
        console.error('Error al eliminar entrada:', error)
        this.$bvToast.toast('Error al eliminar la entrada', {
          title: 'Error',
          variant: 'danger',
          solid: true
        })
      }
    }
  }
}
</script>

<style scoped>
.movimientos-diarios {
  max-width: 1400px;
  margin: 0 auto;
}

.movement-item {
  background-color: #f8f9fa;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.movement-item:hover {
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.total-entradas {
  text-align: right;
  color: #28a745;
}
</style>
