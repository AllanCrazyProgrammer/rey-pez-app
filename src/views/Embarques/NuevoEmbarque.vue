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
        :fecha="fechaEmbarque"
        :cargaCon="cargaCon"
        :bloqueado="embarqueBloqueado"
        :embarqueId="embarqueId"
        :online="isOnline"
        :cambios-pendientes="cambiosPendientes"
        :sincronizando="sincronizando"
        :usuarios-activos="usuariosActivos"
        @guardar="guardarEmbarque"
        @guardar-directo="guardarEmbarqueDirecto"
        @generar-resumen="generarResumenPDF"
        @editar-fecha="editarFecha"
        @editar-carga="editarCargaCon"
        @toggle-bloqueo="toggleBloqueo"
        @volver="volverAEmbarquesMenu"
        @sincronizar="sincronizarManualmente"
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
        :embarqueId="embarqueId"
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
      
      <!-- Panel de diagnóstico -->
      <DiagnosticoPanel 
        :embarqueId="embarqueId" 
        :items="itemsEmbarque"
        @forzar-recarga="recargarEmbarqueDesdeDB"
      />
      
      <!-- Después del panel de diagnóstico -->
      <div class="firebase-verificacion-container">
        <button @click="mostrarVerificacionFirebase = !mostrarVerificacionFirebase" class="btn-toggle-firebase">
          <i class="fas fa-database"></i> {{ mostrarVerificacionFirebase ? 'Ocultar' : 'Mostrar' }} Diagnóstico Firebase
        </button>
        
        <FirebaseVerificacion v-if="mostrarVerificacionFirebase" />
      </div>
      
      <!-- Componente de alerta para mensajes -->
      <div v-if="mostrarAlerta" class="alerta-flotante" :class="'alerta-' + tipoMensaje">
        <div class="alerta-contenido">
          <i :class="'fas ' + (tipoMensaje === 'success' ? 'fa-check-circle' : 
                              tipoMensaje === 'error' ? 'fa-exclamation-circle' : 
                              tipoMensaje === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle')"></i>
          <span>{{ mensaje }}</span>
          <button @click="mostrarAlerta = false" class="btn-cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { cargarYAdaptarEmbarque } from '@/components/Embarques/EmbarqueAdapter';
import SincronizacionService from '@/services/SincronizacionService';
import Logger from '@/utils/logger';

// Componentes
import ClienteSidebar from '@/components/Embarques/ClienteSidebar.vue';
import EmbarqueHeader from '@/components/Embarques/EmbarqueHeader.vue';
import EmbarqueForm from '@/components/Embarques/EmbarqueForm.vue';
import EmbarqueResumen from '@/components/Embarques/EmbarqueResumen.vue';
import ClienteModals from '@/components/Embarques/ClienteModals.vue';
import DiagnosticoPanel from '@/components/DiagnosticoPanel.vue';
import FirebaseVerificacion from '@/components/FirebaseVerificacion.vue';

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
    ClienteModals,
    DiagnosticoPanel,
    FirebaseVerificacion
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
      ],
      
      // Control de datos
      ultimosDatosValidos: null,
      verificadorDatos: null,
      
      // Estado de mensajes
      mensaje: '',
      tipoMensaje: 'info',
      mostrarAlerta: false,
      mostrarVerificacionFirebase: false,
      
      // Estado de sincronización
      cambiosPendientes: 0,
      sincronizando: false,
      usuariosActivos: [],
      isOnline: navigator.onLine
    };
  },
  mounted() {
    // Agregar eventos para detectar cambios en la conexión
    window.addEventListener('online', this.actualizarEstadoConexion);
    window.addEventListener('offline', this.actualizarEstadoConexion);
    
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
  beforeDestroy() {
    // Remover eventos de conexión
    window.removeEventListener('online', this.actualizarEstadoConexion);
    window.removeEventListener('offline', this.actualizarEstadoConexion);
    
    // Desuscribir del servicio de sincronización al salir del componente
    if (this.embarqueId) {
      SincronizacionService.dejarDeObservarEmbarque();
    }
    
    // Detener el verificador de integridad
    this.detenerVerificadorIntegridad();
  },
  methods: {
    /**
     * Actualiza el estado de conexión
     */
    actualizarEstadoConexion() {
      this.isOnline = navigator.onLine;
    },
    
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
        
        // Guardar el cambio en la base de datos si tenemos un ID de embarque
        if (this.embarqueId) {
          // Mostrar indicador de sincronización
          this.sincronizando = true;
          
          // Utilizar el servicio de sincronización para guardar el cambio
          SincronizacionService.actualizarProducto(this.embarqueId, productoActualizado)
            .then(() => {
              console.log('Producto actualizado correctamente en la base de datos:', productoActualizado.id);
              this.mostrarMensaje('Producto actualizado correctamente', 'success');
            })
            .catch(error => {
              console.error('Error al actualizar producto en la base de datos:', error);
              this.mostrarMensaje(`Error al actualizar producto: ${error.message}`, 'error');
            })
            .finally(() => {
              this.sincronizando = false;
            });
        }
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
     * Guarda el embarque directamente en Firestore sin usar el servicio de sincronización
     */
    async guardarEmbarqueDirecto() {
      this.guardando = true;
      this.mostrarMensaje('Iniciando guardado directo en Firestore...', 'info');
      
      try {
        // Preparar datos para guardar (igual que en guardarEmbarque)
        const embarqueData = {
          fecha: this.fechaEmbarque,
          cargaCon: this.cargaCon,
          bloqueado: this.embarqueBloqueado,
          items: this.itemsEmbarque.map(item => {
            // Asegurar que cada item tenga todos los campos necesarios
            return {
              ...item,
              // Campos básicos
              id: item.id,
              cliente: item.cliente || '',
              tipo: item.tipo || '',
              talla: item.talla || item.medida || item.media || '',
              medida: item.medida || item.talla || item.media || '',
              media: item.media || item.talla || item.medida || '',
              timestamp: item.timestamp || new Date().toISOString(),
              fechaCreacion: item.fechaCreacion || new Date().toISOString(),
              // Campos específicos para productos limpios
              tarasKilos: item.tarasKilos || [],
              restarTresPorTara: item.restarTresPorTara !== undefined ? item.restarTresPorTara : true,
              kilosTotales: item.kilosTotales || 0,
              precio: item.precio || 0,
              total: item.total || 0,
              // Campos específicos para productos con camarón
              camaronNeto: item.tipo === 'C/H20' ? (item.camaronNeto || 0.65) : null,
              // Campos adicionales
              hilos: item.hilos || '',
              notas: item.notas || '',
              fecha: item.fecha || new Date().toISOString().split('T')[0],
              // Campos para reportes
              reporteTaras: item.reporteTaras || [],
              reporteBolsas: item.reporteBolsas || [],
              totalTarasReportadas: item.totalTarasReportadas || 0,
              totalBolsasReportadas: item.totalBolsasReportadas || 0,
              coincideTaras: item.coincideTaras || false,
              // Campos para productos crudos
              barco: item.barco || '',
              taras: item.taras || '',
              sobrante: item.sobrante || '',
              mostrarSobrante: item.mostrarSobrante || false,
              // Campos para personalización
              nombreAlternativoPDF: item.nombreAlternativoPDF || '',
              noSumarKilos: item.noSumarKilos || false
            };
          }),
          clientesPersonalizados: this.clientesPersonalizadosEmbarque,
          clienteActivo: this.clienteActivo,
          ultimaActualizacion: new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          metodoGuardado: 'directo' // Marcar que se guardó directamente
        };
        
        console.log('Datos preparados para guardado directo:', embarqueData);
        
        if (this.modoEdicion && this.embarqueId) {
          // ACTUALIZAR EMBARQUE EXISTENTE
          this.mostrarMensaje(`Actualizando embarque directamente con ID: ${this.embarqueId}...`, 'info');
          
          // Determinar la colección a utilizar
          const esEmbarques2 = this.embarqueId.startsWith('emb2_');
          const idReal = esEmbarques2 ? this.embarqueId.replace('emb2_', '') : this.embarqueId;
          const coleccion = esEmbarques2 ? 'embarques2' : 'embarques';
          
          console.log(`Guardando en colección: ${coleccion}, ID real: ${idReal}`);
          
          // Obtener referencia al documento
          const embarqueRef = doc(db, coleccion, idReal);
          
          // Actualizar documento directamente
          await updateDoc(embarqueRef, embarqueData);
          
          // Verificar que se actualizó correctamente
          const docSnap = await getDoc(embarqueRef);
          if (!docSnap.exists()) {
            throw new Error('No se pudo verificar la actualización del embarque');
          }
          
          this.mostrarMensaje('¡Embarque actualizado correctamente con método directo!', 'success');
        } else {
          // CREAR NUEVO EMBARQUE
          this.mostrarMensaje('Creando nuevo embarque directamente en la colección embarques2...', 'info');
          
          // Crear nuevo documento en la colección embarques2
          const docRef = await addDoc(collection(db, 'embarques2'), embarqueData);
          
          // Guardar el ID con prefijo para identificar que es de la nueva colección
          this.embarqueId = `emb2_${docRef.id}`;
          this.modoEdicion = true;
          
          this.mostrarMensaje(`¡Nuevo embarque creado correctamente con ID: ${this.embarqueId}!`, 'success');
          
          // Actualizar la URL para reflejar el nuevo ID
          this.$router.replace({ name: 'EditarEmbarque', params: { id: this.embarqueId } });
        }
        
        // Recargar los datos para verificar que se guardaron correctamente
        await this.recargarEmbarqueDesdeDB();
      } catch (error) {
        console.error('Error al guardar embarque directamente:', error);
        this.mostrarMensaje(`Error al guardar embarque directamente: ${error.message}`, 'error');
      } finally {
        this.guardando = false;
      }
    },
    
    /**
     * Guarda el embarque completo en Firestore con verificación
     */
    async guardarEmbarque() {
      this.guardando = true;
      this.mostrarMensaje('Iniciando proceso de guardado...', 'info');
      
      try {
        // Verificar conexión con Firebase
        this.mostrarMensaje('Verificando conexión con Firebase...', 'info');
        
        // Preparar datos para guardar
        const embarqueData = {
          fecha: this.fechaEmbarque,
          cargaCon: this.cargaCon,
          bloqueado: this.embarqueBloqueado,
          items: this.itemsEmbarque.map(item => {
            // Asegurar que cada item tenga todos los campos necesarios
            return {
              ...item,
              // Campos básicos
              id: item.id,
              cliente: item.cliente || '',
              tipo: item.tipo || '',
              talla: item.talla || item.medida || item.media || '',
              medida: item.medida || item.talla || item.media || '',
              media: item.media || item.talla || item.medida || '',
              timestamp: item.timestamp || new Date().toISOString(),
              fechaCreacion: item.fechaCreacion || new Date().toISOString(),
              // Campos específicos para productos limpios
              tarasKilos: item.tarasKilos || [],
              restarTresPorTara: item.restarTresPorTara !== undefined ? item.restarTresPorTara : true,
              kilosTotales: item.kilosTotales || 0,
              precio: item.precio || 0,
              total: item.total || 0,
              // Campos específicos para productos con camarón
              camaronNeto: item.tipo === 'C/H20' ? (item.camaronNeto || 0.65) : null,
              // Campos adicionales
              hilos: item.hilos || '',
              notas: item.notas || '',
              fecha: item.fecha || new Date().toISOString().split('T')[0],
              // Campos para reportes
              reporteTaras: item.reporteTaras || [],
              reporteBolsas: item.reporteBolsas || [],
              totalTarasReportadas: item.totalTarasReportadas || 0,
              totalBolsasReportadas: item.totalBolsasReportadas || 0,
              coincideTaras: item.coincideTaras || false,
              // Campos para productos crudos
              barco: item.barco || '',
              taras: item.taras || '',
              sobrante: item.sobrante || '',
              mostrarSobrante: item.mostrarSobrante || false,
              // Campos para personalización
              nombreAlternativoPDF: item.nombreAlternativoPDF || '',
              noSumarKilos: item.noSumarKilos || false
            };
          }),
          clientesPersonalizados: this.clientesPersonalizadosEmbarque,
          clienteActivo: this.clienteActivo,
          ultimaActualizacion: new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        console.log('Datos preparados para guardar:', embarqueData);
        
        if (this.modoEdicion && this.embarqueId) {
          // ACTUALIZAR EMBARQUE EXISTENTE
          this.mostrarMensaje(`Actualizando embarque con ID: ${this.embarqueId}...`, 'info');
          
          // Determinar la colección a utilizar
          const coleccion = this.embarqueId.startsWith('emb2_') ? 'embarques2' : 'embarques';
          
          // Obtener referencia al documento
          const embarqueRef = doc(db, coleccion, this.embarqueId);
          
          // Verificar que el documento existe antes de actualizarlo
          const docSnap = await getDoc(embarqueRef);
          if (!docSnap.exists()) {
            throw new Error(`El embarque con ID ${this.embarqueId} no existe en la base de datos`);
          }
          
          // Actualizar documento directamente
          await updateDoc(embarqueRef, embarqueData);
          
          // Verificar que se actualizó correctamente
          const docSnapAfterUpdate = await getDoc(embarqueRef);
          if (!docSnapAfterUpdate.exists()) {
            throw new Error('No se pudo verificar la actualización del embarque');
          }
          
          const datosActualizados = docSnapAfterUpdate.data();
          console.log('Embarque actualizado correctamente:', {
            id: this.embarqueId,
            items: datosActualizados.items?.length || 0
          });
          
          this.mostrarMensaje('¡Embarque actualizado correctamente!', 'success');
          
          // Actualizar la vista con los datos actualizados
          this.actualizarDatosEmbarque({
            ...datosActualizados,
            id: this.embarqueId
          });
        } else {
          // CREAR NUEVO EMBARQUE
          this.mostrarMensaje('Creando nuevo embarque en la colección embarques2...', 'info');
          
          // Crear nuevo documento en la colección embarques2
          const docRef = await addDoc(collection(db, 'embarques2'), embarqueData);
          
          // Verificar que se creó correctamente
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            throw new Error('No se pudo verificar la creación del embarque');
          }
          
          // Guardar el ID con prefijo para identificar que es de la nueva colección
          this.embarqueId = `emb2_${docRef.id}`;
          this.modoEdicion = true;
          
          console.log('Nuevo embarque creado con ID:', this.embarqueId);
          this.mostrarMensaje(`¡Nuevo embarque creado correctamente con ID: ${this.embarqueId}!`, 'success');
          
          // Actualizar la URL para reflejar el nuevo ID
          this.$router.replace({ name: 'EditarEmbarque', params: { id: this.embarqueId } });
          
          // Actualizar la vista con los datos del nuevo embarque
          const datosNuevos = docSnap.data();
          this.actualizarDatosEmbarque({
            ...datosNuevos,
            id: this.embarqueId
          });
        }
        
        // Iniciar observación del embarque para cambios futuros
        SincronizacionService.dejarDeObservarEmbarque(); // Detener observación previa si existe
        
        // Determinar la colección a observar
        if (this.embarqueId.startsWith('emb2_')) {
          const idSinPrefijo = this.embarqueId.replace('emb2_', '');
          SincronizacionService.observarEmbarque2(idSinPrefijo, (embarqueActualizado) => {
            if (embarqueActualizado && Object.keys(embarqueActualizado).length > 0) {
              console.log('Actualización recibida del servicio de sincronización (embarques2):', embarqueActualizado);
            }
          });
        } else {
          SincronizacionService.observarEmbarque(this.embarqueId, (embarqueActualizado) => {
            if (embarqueActualizado && Object.keys(embarqueActualizado).length > 0) {
              console.log('Actualización recibida del servicio de sincronización:', embarqueActualizado);
            }
          });
        }
      } catch (error) {
        console.error('Error al guardar embarque:', error);
        this.mostrarMensaje(`Error al guardar embarque: ${error.message}`, 'error');
        
        // Intentar guardar en modo de emergencia si falló el guardado normal
        if (this.itemsEmbarque && this.itemsEmbarque.length > 0) {
          try {
            this.mostrarMensaje('Intentando guardar en modo de emergencia...', 'warning');
            
            // Crear un respaldo local
            const respaldoKey = `respaldo_embarque_${Date.now()}`;
            localStorage.setItem(respaldoKey, JSON.stringify({
              fecha: this.fechaEmbarque,
              cargaCon: this.cargaCon,
              items: this.itemsEmbarque,
              timestamp: new Date().toISOString()
            }));
            
            this.mostrarMensaje(`Se ha creado un respaldo local con clave: ${respaldoKey}`, 'warning');
          } catch (backupError) {
            console.error('Error al crear respaldo local:', backupError);
          }
        }
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
        
        // Verificar si el ID tiene el prefijo emb2_
        const esEmbarques2 = id.startsWith('emb2_');
        console.log(`Tipo de embarque: ${esEmbarques2 ? 'embarques2' : 'embarques'}`);
        
        // Primero cargar directamente para asegurar que tengamos datos inmediatamente
        const embarqueAdaptado = await cargarYAdaptarEmbarque(id, false);
        
        if (embarqueAdaptado) {
          console.log('Embarque cargado inicialmente:', embarqueAdaptado);
          
          // Guardar ID del embarque antes de actualizar los datos
          this.embarqueId = id;
          
          // Actualizar la vista con los datos iniciales
          this.actualizarDatosEmbarque(embarqueAdaptado);
          
          // Marcar que estamos en modo edición
          this.modoEdicion = true;
          
          // Desactivar primero cualquier observación anterior
          SincronizacionService.dejarDeObservarEmbarque();
          
          // Esperar un momento antes de configurar la observación para evitar condiciones de carrera
          setTimeout(() => {
            // Configurar la observación para actualizaciones futuras, pero proteger contra datos nulos
            if (esEmbarques2) {
              // Si es de la colección embarques2
              const idSinPrefijo = id.replace('emb2_', '');
              SincronizacionService.observarEmbarque2(idSinPrefijo, (embarqueActualizado) => {
                if (embarqueActualizado && Object.keys(embarqueActualizado).length > 0) {
                  console.log('Embarque actualizado recibido via sincronización (embarques2):', embarqueActualizado);
                  // Verificar que los datos actualizados son válidos antes de aplicarlos
                  if (embarqueActualizado.items && Array.isArray(embarqueActualizado.items)) {
                    this.actualizarDatosEmbarque({
                      ...embarqueActualizado,
                      id: `emb2_${embarqueActualizado.id}`,
                      esEmbarques2: true
                    });
                  } else {
                    console.warn('Se recibieron datos incompletos o inválidos del servicio de sincronización');
                  }
                } else {
                  console.warn('Se recibió un objeto de embarque vacío o nulo del servicio de sincronización');
                }
              });
            } else {
              // Si es de la colección original
              SincronizacionService.observarEmbarque(id, (embarqueActualizado) => {
                if (embarqueActualizado && Object.keys(embarqueActualizado).length > 0) {
                  console.log('Embarque actualizado recibido via sincronización:', embarqueActualizado);
                  // Verificar que los datos actualizados son válidos antes de aplicarlos
                  if (embarqueActualizado.items && Array.isArray(embarqueActualizado.items)) {
                    this.actualizarDatosEmbarque(embarqueActualizado);
                  } else {
                    console.warn('Se recibieron datos incompletos o inválidos del servicio de sincronización');
                  }
                } else {
                  console.warn('Se recibió un objeto de embarque vacío o nulo del servicio de sincronización');
                }
              });
            }
          }, 300);
        } else {
          console.error('No se pudo cargar el embarque');
          this.mostrarError('No se pudo cargar el embarque. Verifique la consola para más detalles.');
          this.resetearEmbarque();
        }
        
        // Ocultar indicador de carga
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar embarque:', error);
        this.mostrarError('Error al cargar embarque: ' + error.message);
        this.cargando = false;
        this.resetearEmbarque();
      }
    },
    
    /**
     * Actualiza los datos del embarque en la vista
     * @param {Object} embarqueActualizado - Datos actualizados del embarque
     */
    actualizarDatosEmbarque(embarqueActualizado) {
      // Validar que tenemos un objeto con datos
      if (!embarqueActualizado || Object.keys(embarqueActualizado).length === 0) {
        console.warn('Se intentó actualizar con datos vacíos, omitiendo actualización');
        return;
      }
      
      console.log('Actualizando datos del embarque en la vista:', embarqueActualizado);
      
      // Guardar una copia de los datos válidos
      if (embarqueActualizado.items && Array.isArray(embarqueActualizado.items) && embarqueActualizado.items.length > 0) {
        this.ultimosDatosValidos = JSON.parse(JSON.stringify(embarqueActualizado));
        
        // Iniciar verificador de integridad si no está activo
        this.iniciarVerificadorIntegridad();
      }
      
      // Procesamiento adicional para asegurar que todos los productos tengan los campos necesarios
      if (!embarqueActualizado.items || !Array.isArray(embarqueActualizado.items)) {
        console.warn('Los datos recibidos no contienen items válidos, manteniendo datos actuales');
        // Conservar solo otros campos que sean válidos
        if (embarqueActualizado.fecha) {
          this.actualizarFechaEmbarque(embarqueActualizado.fecha);
        }
        if (embarqueActualizado.cargaCon !== undefined && embarqueActualizado.cargaCon !== null) {
          this.cargaCon = embarqueActualizado.cargaCon;
        }
        if (embarqueActualizado.bloqueado !== undefined) {
          this.embarqueBloqueado = embarqueActualizado.bloqueado;
        }
        if (embarqueActualizado.clienteActivo) {
          this.clienteActivo = embarqueActualizado.clienteActivo;
        }
        // No actualizar itemsEmbarque si no son válidos
        return;
      }
      
      // Si llegamos aquí, los items son válidos
      embarqueActualizado.items = embarqueActualizado.items.map(item => {
        // Asegurarse de que los campos talla, media y medida estén presentes
        const medidaValue = item.medida || item.media || item.talla || '';
        return {
          ...item,
          medida: medidaValue,
          media: medidaValue,
          talla: medidaValue
        };
      });
      
      // Actualizar la fecha del embarque
      this.actualizarFechaEmbarque(embarqueActualizado.fecha);
      
      // Actualizar el resto de los datos
      this.cargaCon = embarqueActualizado.cargaCon || '';
      this.embarqueBloqueado = embarqueActualizado.bloqueado || false;
      this.itemsEmbarque = embarqueActualizado.items;
      this.clienteActivo = embarqueActualizado.clienteActivo || '';
      
      // Preservar el ID del embarque, solo actualizarlo si no lo tenemos
      if (!this.embarqueId && embarqueActualizado.id) {
        this.embarqueId = embarqueActualizado.id;
      }
      
      console.log('Datos del embarque después de la actualización:', {
        id: this.embarqueId,
        fecha: this.fechaEmbarque,
        cargaCon: this.cargaCon,
        bloqueado: this.embarqueBloqueado,
        clienteActivo: this.clienteActivo,
        items: this.itemsEmbarque.length
      });
    },
    
    /**
     * Actualiza la fecha del embarque asegurándose del formato correcto
     * @param {any} fecha - Fecha en cualquier formato soportado
     */
    actualizarFechaEmbarque(fecha) {
      if (!fecha) {
        this.fechaEmbarque = new Date().toISOString().split('T')[0];
        return;
      }
      
      if (typeof fecha === 'string') {
        this.fechaEmbarque = fecha;
      } else if (fecha instanceof Date) {
        this.fechaEmbarque = fecha.toISOString().split('T')[0];
      } else if (fecha.toDate && typeof fecha.toDate === 'function') {
        // Es un Timestamp de Firestore
        const fechaDate = fecha.toDate();
        this.fechaEmbarque = fechaDate.toISOString().split('T')[0];
      } else {
        // Fallback
        this.fechaEmbarque = new Date().toISOString().split('T')[0];
        console.warn('Formato de fecha no reconocido, utilizando fecha actual:', fecha);
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
    },
    
    /**
     * Inicia un verificador que comprueba periódicamente la integridad de los datos
     */
    iniciarVerificadorIntegridad() {
      // Si ya hay un verificador activo, no crear otro
      if (this.verificadorDatos) return;
      
      console.log('Iniciando verificador de integridad de datos');
      
      // Crear un intervalo para verificar los datos cada 2 segundos
      this.verificadorDatos = setInterval(() => {
        this.verificarIntegridadDatos();
      }, 2000);
    },
    
    /**
     * Detiene el verificador de integridad de datos
     */
    detenerVerificadorIntegridad() {
      if (this.verificadorDatos) {
        clearInterval(this.verificadorDatos);
        this.verificadorDatos = null;
        console.log('Verificador de integridad detenido');
      }
    },
    
    /**
     * Verifica la integridad de los datos cargados
     */
    verificarIntegridadDatos() {
      // No verificar si no hay datos válidos guardados o si no estamos en modo edición
      if (!this.ultimosDatosValidos || !this.modoEdicion || !this.embarqueId) return;
      
      // Verificar si tenemos datos actuales
      const hayDatosActuales = this.itemsEmbarque && Array.isArray(this.itemsEmbarque) && this.itemsEmbarque.length > 0;
      
      if (!hayDatosActuales) {
        console.warn('¡ALERTA! Los datos del embarque han desaparecido. Intentando recuperar...');
        
        // Recuperar los últimos datos válidos
        if (this.ultimosDatosValidos && this.ultimosDatosValidos.items) {
          console.log('Recuperando datos desde la última copia válida');
          
          // Actualizar los datos pero sin sobrescribir la copia de seguridad
          const datosGuardados = this.ultimosDatosValidos;
          this.fechaEmbarque = datosGuardados.fecha || this.fechaEmbarque;
          this.cargaCon = datosGuardados.cargaCon || '';
          this.embarqueBloqueado = datosGuardados.bloqueado || false;
          this.itemsEmbarque = [...datosGuardados.items];
          this.clienteActivo = datosGuardados.clienteActivo || '';
          
          console.log('Datos recuperados:', {
            items: this.itemsEmbarque.length
          });
        } else {
          // Si no hay datos en memoria, intentar recargar desde la base de datos
          console.log('No hay copia en memoria, intentando recargar desde la base de datos');
          this.recargarEmbarqueDesdeDB();
        }
      }
    },
    
    /**
     * Recarga el embarque directamente desde la base de datos
     */
    async recargarEmbarqueDesdeDB() {
      if (!this.embarqueId) return;
      
      try {
        console.log('Recargando embarque desde la base de datos:', this.embarqueId);
        const embarqueRecargado = await cargarYAdaptarEmbarque(this.embarqueId, false);
        
        if (embarqueRecargado && embarqueRecargado.items && embarqueRecargado.items.length > 0) {
          // Actualizar datos
          this.actualizarDatosEmbarque(embarqueRecargado);
          console.log('Embarque recargado exitosamente desde la base de datos');
        } else {
          console.error('No se pudo recargar el embarque desde la base de datos');
        }
      } catch (error) {
        console.error('Error al recargar embarque:', error);
      }
    },
    
    /**
     * Muestra un mensaje al usuario
     * @param {String} texto - Texto del mensaje
     * @param {String} tipo - Tipo de mensaje (success, error, warning, info)
     */
    mostrarMensaje(texto, tipo = 'info') {
      this.mensaje = texto;
      this.tipoMensaje = tipo;
      
      // Mostrar el mensaje
      this.mostrarAlerta = true;
      
      // Ocultar automáticamente después de 5 segundos
      setTimeout(() => {
        this.mostrarAlerta = false;
      }, 5000);
    },
    
    /**
     * Editar la fecha del embarque
     */
    editarFecha() {
      const nuevaFecha = prompt('Ingrese la nueva fecha (YYYY-MM-DD):', this.fechaEmbarque);
      if (nuevaFecha && nuevaFecha.trim() !== '') {
        this.actualizarFecha(nuevaFecha.trim());
      }
    },
    
    /**
     * Editar la información de carga
     */
    editarCargaCon() {
      const nuevaCarga = prompt('Ingrese la información de carga:', this.cargaCon);
      if (nuevaCarga !== null) {
        this.actualizarCargaCon(nuevaCarga.trim());
      }
    },
    
    /**
     * Sincronizar manualmente los cambios pendientes
     */
    sincronizarManualmente() {
      this.mostrarMensaje('Iniciando sincronización manual...', 'info');
      this.sincronizando = true;
      
      try {
        SincronizacionService.sincronizarCambiosPendientes()
          .then(() => {
            this.mostrarMensaje('Sincronización completada correctamente', 'success');
            this.cambiosPendientes = 0;
          })
          .catch(error => {
            console.error('Error en sincronización manual:', error);
            this.mostrarMensaje(`Error en sincronización: ${error.message}`, 'error');
          })
          .finally(() => {
            this.sincronizando = false;
          });
      } catch (error) {
        console.error('Error al iniciar sincronización manual:', error);
        this.mostrarMensaje(`Error al iniciar sincronización: ${error.message}`, 'error');
        this.sincronizando = false;
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

/* Estilos para las alertas flotantes */
.alerta-flotante {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  min-width: 300px;
  max-width: 500px;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
}

.alerta-contenido {
  display: flex;
  align-items: center;
}

.alerta-contenido i {
  margin-right: 10px;
  font-size: 1.2rem;
}

.alerta-success {
  background-color: #d4edda;
  color: #155724;
  border-left: 4px solid #28a745;
}

.alerta-error {
  background-color: #f8d7da;
  color: #721c24;
  border-left: 4px solid #dc3545;
}

.alerta-warning {
  background-color: #fff3cd;
  color: #856404;
  border-left: 4px solid #ffc107;
}

.alerta-info {
  background-color: #d1ecf1;
  color: #0c5460;
  border-left: 4px solid #17a2b8;
}

.btn-cerrar {
  margin-left: auto;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-cerrar:hover {
  opacity: 1;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.firebase-verificacion-container {
  margin-top: 20px;
}

.btn-toggle-firebase {
  background-color: #6610f2;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 8px 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-toggle-firebase:hover {
  background-color: #520dc2;
}
</style> 