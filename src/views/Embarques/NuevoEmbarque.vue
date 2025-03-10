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
        ref="embarqueForm"
        :clienteActivo="clienteActivo"
        :embarqueBloqueado="embarqueBloqueado"
        :fecha="fechaEmbarque"
        :cargaCon="cargaCon"
        :items="itemsEmbarque"
        @agregar-producto="agregarProducto"
        @actualizar-producto="actualizarProducto"
        @actualizar-fecha="actualizarFecha"
        @actualizar-carga-con="actualizarCargaCon"
        @eliminar-item="eliminarItem"
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
import { cargarYAdaptarEmbarque } from '@/components/Embarques/EmbarqueAdapter';

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
      modoEdicion: this.$route.params.id && this.$route.params.id !== 'undefined' && this.$route.params.id !== 'null' && this.$route.params.id !== 'nuevo',
      embarqueBloqueado: false,
      guardando: false,
      generandoPdf: false,
      
      // Datos del embarque
      embarqueId: this.$route.params.id && this.$route.params.id !== 'undefined' && this.$route.params.id !== 'null' && this.$route.params.id !== 'nuevo' ? this.$route.params.id : null,
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
        { id: '0', nombre: 'Catarro', color: '#e74c3c', textColor: '#FFFFFF' },
        { id: '1', nombre: 'Joselito', color: '#3498db', textColor: '#FFFFFF' },
        { id: '2', nombre: 'Otilio', color: '#f1c40f', textColor: '#333333' },
        { id: '3', nombre: 'Ozuna', color: '#2ecc71', textColor: '#FFFFFF' }
      ]
    };
  },
  mounted() {
    // Verificar que el ID sea válido antes de intentar cargar el embarque
    if (this.modoEdicion && this.embarqueId && this.embarqueId !== 'undefined' && this.embarqueId !== 'null') {
      console.log('Iniciando carga de embarque con ID:', this.embarqueId);
      this.cargarEmbarque(this.embarqueId);
    } else if (this.modoEdicion) {
      console.warn('Se intentó cargar un embarque con ID inválido:', this.embarqueId);
      this.mostrarError('No se pudo encontrar el embarque. ID inválido: ' + this.embarqueId);
      this.resetearEmbarque();
      // Si es posible, redirigir a la página de nuevo embarque
      if (this.$router) {
        this.$router.replace('/nuevo-embarque');
      }
    } else {
      console.log('Iniciando nuevo embarque');
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
      // Normalizar el ID del cliente 
      this.clienteActivo = this.normalizarNombreCliente(clienteId);
      
      // Notificar al formulario de embarque para que actualice sus productos
      this.$nextTick(() => {
        if (this.$refs.embarqueForm) {
          // Si hay un producto en edición, cancelar la edición al cambiar de cliente
          if (this.$refs.embarqueForm.productoEditando) {
            this.$refs.embarqueForm.cancelarEdicion();
          }
        }
      });
      
      console.log(`Cliente seleccionado: ${this.clienteActivo}`);
    },
    
    /**
     * Normaliza el nombre del cliente, convirtiendo IDs numéricos a nombres
     * @param {String|Number} clienteId - ID o nombre del cliente
     * @returns {String} - Nombre normalizado del cliente
     */
    normalizarNombreCliente(clienteId) {
      if (clienteId === null || clienteId === undefined) return '';
      
      // Mapeo de IDs numéricos a nombres de clientes
      const clienteIdToName = {
        '0': 'Catarro',
        '1': 'Joselito',
        '2': 'Otilio',
        '3': 'Ozuna',
        0: 'Catarro',
        1: 'Joselito',
        2: 'Otilio',
        3: 'Ozuna'
      };
      
      // Si el clienteId es un número o string que parece un número, buscar en el mapeo
      if (clienteIdToName[clienteId]) {
        return clienteIdToName[clienteId];
      }
      
      // Si es un string, usar directamente
      return String(clienteId);
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
      // Verificar si ya existe un producto similar
      const indiceExistente = this.itemsEmbarque.findIndex(item => 
        item.cliente === producto.cliente && 
        item.tipo === producto.tipo && 
        item.talla === producto.talla
      );
      
      if (indiceExistente !== -1) {
        // Si existe, preguntar si desea actualizar
        if (confirm(`Ya existe un producto similar (${producto.talla} - ${producto.tipo}). ¿Desea agregar este como nuevo producto?`)) {
          this.itemsEmbarque.push(producto);
        } else {
          // Actualizar el existente
          this.itemsEmbarque[indiceExistente] = producto;
        }
      } else {
        // Agregar como nuevo producto
        this.itemsEmbarque.push(producto);
      }
    },
    
    /**
     * Edita un producto existente
     * @param {Object} item - Producto a editar
     */
    editarItem(item) {
      // Buscamos el componente EmbarqueForm y le pedimos que inicie la edición
      const embarqueForm = this.$refs.embarqueForm;
      if (embarqueForm) {
        embarqueForm.iniciarEdicionProducto(item);
      }
    },
    
    /**
     * Actualiza un producto existente
     * @param {Object} productoActualizado - Producto con datos actualizados
     */
    actualizarProducto(productoActualizado) {
      // Buscar el índice del producto a actualizar
      const indice = this.itemsEmbarque.findIndex(item => item.id === productoActualizado.id);
      if (indice !== -1) {
        // Actualizamos el producto en la lista
        this.itemsEmbarque.splice(indice, 1, productoActualizado);
      }
    },
    
    /**
     * Elimina un producto del embarque
     * @param {Object} item - Producto a eliminar
     */
    eliminarItem(item) {
      if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        const index = this.itemsEmbarque.findIndex(i => i === item || i.id === item.id);
        if (index !== -1) {
          this.itemsEmbarque.splice(index, 1);
        }
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
     * Carga un embarque específico
     * @param {String} id - ID del embarque a cargar
     */
    async cargarEmbarque(id) {
      console.log('Cargando embarque con ID:', id);
      if (id === 'nuevo') {
        this.resetearEmbarque();
        return;
      }

      try {
        // Mostrar indicador de carga
        this.cargando = true;
        
        // Usar el adaptador para cargar y normalizar los datos del embarque
        const embarqueAdaptado = await cargarYAdaptarEmbarque(id);
        
        if (embarqueAdaptado) {
          console.log('Embarque cargado y adaptado:', embarqueAdaptado);
          
          // Procesamiento adicional para asegurar que todos los productos tengan los campos necesarios
          if (embarqueAdaptado.items && Array.isArray(embarqueAdaptado.items)) {
            embarqueAdaptado.items = embarqueAdaptado.items.map(item => {
              // Asegurarse de que los campos talla, media y medida estén presentes
              const medidaValue = item.medida || item.media || item.talla || '';
              return {
                ...item,
                medida: medidaValue,
                media: medidaValue,
                talla: medidaValue
              };
            });
          }
          
          // Asignar datos del embarque a la vista
          // Asegurarse de que fechaEmbarque siempre sea un string en formato YYYY-MM-DD
          if (embarqueAdaptado.fecha) {
            if (typeof embarqueAdaptado.fecha === 'string') {
              this.fechaEmbarque = embarqueAdaptado.fecha;
            } else if (embarqueAdaptado.fecha instanceof Date) {
              this.fechaEmbarque = embarqueAdaptado.fecha.toISOString().split('T')[0];
            } else if (embarqueAdaptado.fecha.toDate && typeof embarqueAdaptado.fecha.toDate === 'function') {
              // Es un Timestamp de Firestore
              const fechaDate = embarqueAdaptado.fecha.toDate();
              this.fechaEmbarque = fechaDate.toISOString().split('T')[0];
            } else {
              // Fallback
              this.fechaEmbarque = new Date().toISOString().split('T')[0];
              console.warn('Formato de fecha no reconocido, utilizando fecha actual:', embarqueAdaptado.fecha);
            }
          } else {
            this.fechaEmbarque = new Date().toISOString().split('T')[0];
          }
          
          this.cargaCon = embarqueAdaptado.cargaCon || '';
          this.embarqueBloqueado = embarqueAdaptado.bloqueado || false;
          this.itemsEmbarque = embarqueAdaptado.items || [];
          this.clienteActivo = embarqueAdaptado.clienteActivo || '';
          this.embarqueId = id;
          
          console.log('Datos del embarque cargados en la vista:', {
            fecha: this.fechaEmbarque,
            cargaCon: this.cargaCon,
            bloqueado: this.embarqueBloqueado,
            clienteActivo: this.clienteActivo,
            items: this.itemsEmbarque.length
          });
        } else {
          console.error('No se pudo cargar el embarque');
          this.mostrarError('No se pudo cargar el embarque. Verifique la consola para más detalles.');
          this.resetearEmbarque();
        }
      } catch (error) {
        console.error('Error al cargar embarque:', error);
        this.mostrarError('Error al cargar el embarque: ' + error.message);
        this.resetearEmbarque();
      } finally {
        this.cargando = false;
      }
    },
    
    /**
     * Resetea el estado del embarque
     */
    resetearEmbarque() {
      this.fechaEmbarque = new Date().toISOString().split('T')[0];
      this.cargaCon = '';
      this.itemsEmbarque = [];
      this.clienteActivo = '';
      this.embarqueBloqueado = false;
      this.embarqueId = null;
      this.modoEdicion = false;
    },
    
    /**
     * Muestra un mensaje de error
     * @param {String} mensaje - Mensaje de error a mostrar
     */
    mostrarError(mensaje) {
      console.error(mensaje);
      alert(mensaje);
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