<template>
  <div class="nuevo-embarque-container">
    <!-- Sidebar de clientes -->
    <ClienteSidebar
      :clientesPredefinidos="clientesPredefinidos"
      :clientesPersonalizadosEmbarque="clientesPersonalizadosEmbarque"
      :clienteActivo="clienteActivo"
      :sidebarCollapsed="sidebarCollapsed"
      :tarasLimpio="calcularTarasLimpio()"
      :tarasCrudo="calcularTarasCrudo()"
      :totalTaras="calcularTotalTaras()"
      :kilosLimpio="calcularKilosLimpio()"
      :kilosCrudo="calcularKilosCrudo()"
      :totalKilos="calcularTotalKilos()"
      @toggle-sidebar="toggleSidebar"
      @seleccionar-cliente="seleccionarCliente"
      @mostrar-modal-nuevo-cliente="mostrarModalNuevoCliente = true"
    />
    
    <div class="nuevo-embarque">
      <!-- Encabezado del embarque -->
      <EmbarqueHeader
        :modoEdicion="modoEdicion"
        :guardando="guardando"
        :generandoPdf="generandoPdf"
        @guardar="guardarEmbarque"
        @generar-resumen="generarResumenPDF"
      />
      
      <div class="botones">
        <button @click="volverAEmbarquesMenu" class="btn-volver">
          <i class="fas fa-arrow-left"></i> Volver a Menu
        </button>
        <button 
          @click="toggleBloqueo" 
          :class="['btn-bloqueo', { 'bloqueado': embarqueBloqueado }]"
        >
          <i :class="['fas', embarqueBloqueado ? 'fa-lock' : 'fa-lock-open']"></i>
          {{ embarqueBloqueado ? 'Desbloquear' : 'Bloquear' }} Embarque
        </button>
      </div>
      
      <!-- Formulario de embarque -->
      <EmbarqueForm
        :clienteActivo="clienteActivo"
        :embarqueBloqueado="embarqueBloqueado"
        :fecha="fechaEmbarque"
        :cargaCon="cargaCon"
        @agregar-producto="agregarProducto"
        @actualizar-fecha="actualizarFecha"
        @actualizar-carga-con="actualizarCargaCon"
      />
      
      <!-- Resumen del embarque -->
      <EmbarqueResumen
        :items="itemsEmbarque"
        :mostrarAcciones="!embarqueBloqueado"
        @editar-item="editarItem"
        @eliminar-item="eliminarItem"
      />
      
      <!-- Modales de clientes -->
      <ClienteModals
        :mostrarNuevoCliente="mostrarModalNuevoCliente"
        :productoSeleccionado="productoSeleccionado"
        :mostrarHistorial="mostrarHistorial"
        :historialPrecios="historialPrecios"
        :onCerrarNuevoCliente="cerrarModalNuevoCliente"
        :onGuardarNuevoCliente="guardarNuevoCliente"
        :onCerrarModalPrecio="cerrarModalPrecio"
        :onGuardarPrecio="guardarPrecio"
        :onCerrarModalHistorial="cerrarModalHistorial"
      />
    </div>
  </div>
</template>

<script>
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Componentes
import ClienteSidebar from '@/components/Embarques/ClienteSidebar.vue';
import EmbarqueHeader from '@/components/Embarques/EmbarqueHeader.vue';
import EmbarqueForm from '@/components/Embarques/EmbarqueForm.vue';
import EmbarqueResumen from '@/components/Embarques/EmbarqueResumen.vue';
import ClienteModals from '@/components/Embarques/ClienteModals.vue';

/**
 * @component NuevoEmbarque
 * @description Vista principal para crear o editar un embarque
 * Integra todos los componentes relacionados con embarques
 */
export default {
  name: 'NuevoEmbarque',
  components: {
    ClienteSidebar,
    EmbarqueHeader,
    EmbarqueForm,
    EmbarqueResumen,
    ClienteModals
  },
  data() {
    return {
      // Estado del embarque
      modoEdicion: this.$route.params.id ? true : false,
      embarqueBloqueado: false,
      guardando: false,
      generandoPdf: false,
      
      // Datos del embarque
      embarqueId: this.$route.params.id || null,
      fechaEmbarque: new Date().toISOString().split('T')[0],
      cargaCon: '',
      itemsEmbarque: [],
      
      // Estado de la UI
      sidebarCollapsed: false,
      clienteActivo: '',
      clientesPersonalizadosEmbarque: [],
      
      // Estado de modales
      mostrarModalNuevoCliente: false,
      productoSeleccionado: null,
      mostrarHistorial: false,
      historialPrecios: [],
      
      // Clientes predefinidos
      clientesPredefinidos: [
        { id: 1, nombre: 'Catarro', color: '#FF5733', textColor: '#FFFFFF' },
        { id: 2, nombre: 'Joselito', color: '#33FF57', textColor: '#000000' },
        { id: 3, nombre: 'Ozuna', color: '#3357FF', textColor: '#FFFFFF' },
        { id: 4, nombre: 'Otilio', color: '#8033FF', textColor: '#FFFFFF' }
      ]
    };
  },
  mounted() {
    if (this.modoEdicion && this.embarqueId) {
      this.cargarEmbarque();
    }
  },
  methods: {
    /**
     * Calcula las taras de productos limpios
     */
    calcularTarasLimpio() {
      return this.itemsEmbarque
        .filter(item => item.tipo === 'limpio')
        .reduce((sum, item) => sum + parseFloat(item.tara || 0), 0);
    },
    
    /**
     * Calcula las taras de productos crudos
     */
    calcularTarasCrudo() {
      return this.itemsEmbarque
        .filter(item => item.tipo === 'crudo')
        .reduce((sum, item) => sum + parseFloat(item.tara || 0), 0);
    },
    
    /**
     * Calcula el total de taras
     */
    calcularTotalTaras() {
      return this.calcularTarasLimpio() + this.calcularTarasCrudo();
    },
    
    /**
     * Calcula los kilos de productos limpios
     */
    calcularKilosLimpio() {
      return this.itemsEmbarque
        .filter(item => item.tipo === 'limpio')
        .reduce((sum, item) => sum + parseFloat(item.kilos || 0), 0);
    },
    
    /**
     * Calcula los kilos de productos crudos
     */
    calcularKilosCrudo() {
      return this.itemsEmbarque
        .filter(item => item.tipo === 'crudo')
        .reduce((sum, item) => sum + parseFloat(item.kilos || 0), 0);
    },
    
    /**
     * Calcula el total de kilos
     */
    calcularTotalKilos() {
      return this.calcularKilosLimpio() + this.calcularKilosCrudo();
    },
    
    /**
     * Alterna el estado de la barra lateral
     */
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
    
    /**
     * Selecciona un cliente
     * @param {String} clienteId - ID del cliente seleccionado
     */
    seleccionarCliente(clienteId) {
      this.clienteActivo = clienteId;
    },
    
    /**
     * Alterna el estado de bloqueo del embarque
     */
    toggleBloqueo() {
      this.embarqueBloqueado = !this.embarqueBloqueado;
    },
    
    /**
     * Vuelve al menú de embarques
     */
    volverAEmbarquesMenu() {
      this.$router.push('/embarques');
    },
    
    /**
     * Actualiza la fecha del embarque
     * @param {String} fecha - Nueva fecha
     */
    actualizarFecha(fecha) {
      this.fechaEmbarque = fecha;
    },
    
    /**
     * Actualiza la información de carga
     * @param {String} cargaConNuevo - Nueva información de carga
     */
    actualizarCargaCon(cargaConNuevo) {
      this.cargaCon = cargaConNuevo;
    },
    
    /**
     * Agrega un producto al embarque
     * @param {Object} producto - Producto a agregar
     */
    agregarProducto(producto) {
      this.itemsEmbarque.push(producto);
    },
    
    /**
     * Edita un producto existente
     * @param {Object} item - Producto a editar
     */
    editarItem(item) {
      // Implementar lógica para editar
      console.log('Editar item:', item);
    },
    
    /**
     * Elimina un producto del embarque
     * @param {Object} item - Producto a eliminar
     */
    eliminarItem(item) {
      const index = this.itemsEmbarque.findIndex(i => i === item);
      if (index !== -1) {
        this.itemsEmbarque.splice(index, 1);
      }
    },
    
    /**
     * Cierra el modal de nuevo cliente
     */
    cerrarModalNuevoCliente() {
      this.mostrarModalNuevoCliente = false;
    },
    
    /**
     * Guarda un nuevo cliente
     * @param {Object} cliente - Datos del nuevo cliente
     */
    guardarNuevoCliente(cliente) {
      // Implementar lógica para guardar cliente
      console.log('Guardar cliente:', cliente);
      this.mostrarModalNuevoCliente = false;
    },
    
    /**
     * Cierra el modal de precio
     */
    cerrarModalPrecio() {
      this.productoSeleccionado = null;
    },
    
    /**
     * Guarda un precio
     * @param {Object} datos - Datos del precio
     */
    guardarPrecio(datos) {
      // Implementar lógica para guardar precio
      console.log('Guardar precio:', datos);
      this.productoSeleccionado = null;
    },
    
    /**
     * Cierra el modal de historial
     */
    cerrarModalHistorial() {
      this.mostrarHistorial = false;
      this.historialPrecios = [];
    },
    
    /**
     * Guarda el embarque
     */
    async guardarEmbarque() {
      this.guardando = true;
      
      try {
        // Preparar datos para guardar
        const embarqueData = {
          fecha: this.fechaEmbarque,
          cargaCon: this.cargaCon,
          bloqueado: this.embarqueBloqueado,
          items: this.itemsEmbarque,
          clientesPersonalizados: this.clientesPersonalizadosEmbarque,
          clienteActivo: this.clienteActivo,
          ultimaActualizacion: new Date().toISOString(),
        };
        
        if (this.modoEdicion && this.embarqueId) {
          // Actualizar documento existente
          await updateDoc(doc(db, 'embarques', this.embarqueId), embarqueData);
          console.log('Embarque actualizado correctamente:', this.embarqueId);
          alert('¡Embarque actualizado correctamente!');
        } else {
          // Crear nuevo documento
          const docRef = await addDoc(collection(db, 'embarques'), {
            ...embarqueData,
            fechaCreacion: new Date().toISOString()
          });
          
          console.log('Nuevo embarque creado correctamente:', docRef.id);
          
          // Actualizar el estado para reflejar que ahora estamos en modo edición
          this.embarqueId = docRef.id;
          this.modoEdicion = true;
          
          // Actualizar la URL sin recargar la página
          if (this.$router) {
            this.$router.replace('/embarque/' + docRef.id);
          }
          
          alert('¡Nuevo embarque creado correctamente!');
        }
      } catch (error) {
        console.error('Error al guardar embarque:', error);
        alert('Error al guardar embarque: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    /**
     * Genera un PDF con el resumen del embarque
     */
    async generarResumenPDF() {
      this.generandoPdf = true;
      
      try {
        // Implementar lógica para generar PDF
        console.log('Generar PDF');
        
        // Simular generación
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        alert('PDF generado correctamente');
      } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('Error al generar PDF');
      } finally {
        this.generandoPdf = false;
      }
    },
    
    /**
     * Carga los datos de un embarque existente
     */
    async cargarEmbarque() {
      try {
        // Recuperar el documento de embarque
        const embarqueDoc = await getDoc(doc(db, 'embarques', this.embarqueId));
        
        if (embarqueDoc.exists()) {
          const embarqueData = embarqueDoc.data();
          
          // Cargar datos principales
          this.fechaEmbarque = typeof embarqueData.fecha === 'string' ? embarqueData.fecha : new Date().toISOString().split('T')[0];
          this.cargaCon = embarqueData.cargaCon || '';
          this.embarqueBloqueado = embarqueData.bloqueado || false;
          
          // Cargar items del embarque
          if (embarqueData.items && Array.isArray(embarqueData.items)) {
            this.itemsEmbarque = embarqueData.items.map(item => ({
              ...item,
              // Asegurar que todos los campos numéricos sean realmente números
              kilos: parseFloat(item.kilos || 0),
              tara: parseFloat(item.tara || 0),
              precio: parseFloat(item.precio || 0),
              total: parseFloat(item.total || 0)
            }));
          }
          
          // Cargar clientes personalizados
          if (embarqueData.clientesPersonalizados && Array.isArray(embarqueData.clientesPersonalizados)) {
            this.clientesPersonalizadosEmbarque = embarqueData.clientesPersonalizados;
          }
          
          // Si hay un cliente activo guardado, seleccionarlo
          if (embarqueData.clienteActivo) {
            this.clienteActivo = embarqueData.clienteActivo;
          }
          
          console.log('Embarque cargado correctamente:', this.embarqueId);
        } else {
          console.error('No se encontró el embarque:', this.embarqueId);
          alert('No se encontró el embarque solicitado');
          this.$router.push('/embarques');
        }
      } catch (error) {
        console.error('Error al cargar embarque:', error);
        alert('Error al cargar el embarque: ' + error.message);
      }
    }
  }
};
</script>

<style scoped>
.nuevo-embarque-container {
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nuevo-embarque {
  flex: 1;
  padding: 20px;
  margin-left: 250px;
  transition: margin-left 0.3s ease;
}

.nuevo-embarque-container:has(.sidebar-collapsed) .nuevo-embarque {
  margin-left: 60px;
}

.botones {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn-volver, .btn-bloqueo {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-volver {
  background-color: #6c757d;
  color: white;
}

.btn-volver:hover {
  background-color: #5a6268;
}

.btn-bloqueo {
  background-color: #ffc107;
  color: #212529;
}

.btn-bloqueo:hover {
  background-color: #e0a800;
}

.btn-bloqueo.bloqueado {
  background-color: #dc3545;
  color: white;
}

.btn-bloqueo.bloqueado:hover {
  background-color: #c82333;
}

@media (max-width: 768px) {
  .nuevo-embarque {
    margin-left: 0;
    padding: 15px;
  }
  
  .nuevo-embarque-container:has(.sidebar-collapsed) .nuevo-embarque {
    margin-left: 0;
  }
  
  .botones {
    flex-direction: column;
  }
}
</style> 