<template>
  <!-- Ejemplo de implementación optimizada para los botones de crear cuenta -->
  <div class="cliente-header-controls">
    <div class="juntar-medidas-checkbox">
      <input 
        type="checkbox" 
        :id="'juntar-medidas-' + clienteId"
        v-model="clientesJuntarMedidas[clienteId]"
        @change="handleJuntarMedidasChange(clienteId, $event.target.checked)"
        @click.stop
        :disabled="embarqueBloqueado"
      >
      <label :for="'juntar-medidas-' + clienteId" @click.stop>Juntar medidas</label>
    </div>
    <button 
      type="button" 
      @click.stop="generarNotaVenta(clienteId)" 
      class="btn btn-primary btn-sm generar-pdf-cliente" 
      title="Generar Nota de Venta PDF"
      :disabled="isGeneratingPdf"
    >
      <span v-if="isGeneratingPdf && pdfType === 'cliente-' + clienteId" class="loader-inline"></span>
      <i v-else class="fas fa-file-pdf"></i> Generar Nota PDF
    </button>
    
    <!-- Botón para crear cuenta optimizado -->
    <BotonCrearCuenta
      v-if="esClienteJoselito(clienteId) || esClienteCatarro(clienteId)"
      :tipoCliente="obtenerNombreCliente(clienteId)"
      :clienteId="clienteId"
      :embarqueCliente="obtenerEmbarqueCliente(clienteId)"
      :productos="productosPorCliente[clienteId]"
      :crudos="clienteCrudos[clienteId] || []"
      :isCreatingAccount="isCreatingAccount"
      @crear-cuenta="manejarCreacionCuenta"
    />
    
    <button type="button" @click.stop="eliminarCliente(clienteId)" class="btn btn-danger btn-sm eliminar-cliente" :disabled="embarqueBloqueado">Eliminar Cliente</button>
  </div>
</template>

<script>
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { debounce } from 'lodash';
import { ref, onValue, onDisconnect, set } from 'firebase/database'
import { rtdb } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { ref as vueRef, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import BotonCrearCuenta from '@/components/Embarques/BotonCrearCuenta.vue';

// Lazy loaded components
const Rendimientos = defineAsyncComponent(() => import('./Rendimientos.vue'))

export default {
  name: 'NuevoEmbarque',
  components: {
    Rendimientos,
    BotonCrearCuenta
  },
  setup() {
    const authStore = useAuthStore();
    return { authStore };
  },
  methods: {
    // Método unificado para manejar la creación de cuentas
    manejarCreacionCuenta(datos) {
      const { tipoCliente, embarqueCliente, productos, crudos } = datos;
      
      if (tipoCliente === 'Joselito') {
        this.crearCuentaJoselito(embarqueCliente, productos, crudos);
      } else if (tipoCliente === 'Catarro') {
        this.crearCuentaCatarro(embarqueCliente, productos, crudos);
      }
    },
    
    // Métodos para verificar el tipo de cliente
    esClienteJoselito(clienteId) {
      return this.obtenerNombreCliente(clienteId) === 'Joselito';
    },
    
    esClienteCatarro(clienteId) {
      return this.obtenerNombreCliente(clienteId) === 'Catarro';
    },
    
    // Resto de métodos existentes...
  }
}
</script>

<style scoped>
/* Estilos existentes */
</style> 