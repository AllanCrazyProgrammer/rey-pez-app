<template>
  <div class="nuevo-embarque-container">
    <!-- Sidebar Component -->
    <Sidebar 
      :embarque="embarque" 
      :clientesPredefinidos="clientesPredefinidos"
      :clientesPersonalizadosEmbarque="clientesPersonalizadosEmbarque" 
      :clienteCrudos="clienteCrudos"
      :clienteActivo="clienteActivo" 
      @seleccionar-cliente="clienteActivo = $event"
      @toggle-sidebar="sidebarCollapsed = $event" 
      @mostrar-modal-nuevo-cliente="mostrarModalNuevoCliente = true" 
    />

    <div class="nuevo-embarque" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <!-- Header Component -->
      <header-embarque 
        :modo-edicion="modoEdicion" 
        :embarque-bloqueado="embarqueBloqueado" 
        :embarque="embarque"
        :is-generating-pdf="isGeneratingPdf" 
        :pdf-type="pdfType" 
        :embarque-id="embarqueId"
        :has-pending-changes="hasPendingChanges"
        :is-syncing="isSyncing"
        @sync-manual="sincronizarConNube"
        @volver="volverAEmbarquesMenu" 
        @toggle-bloqueo="toggleBloqueo" 
        @update:fecha="embarque.fecha = $event"
        @update:cargaCon="embarque.cargaCon = $event" 
        @generar-taras="generarPDF('taras')"
        @generar-resumen="mostrarEscalaResumen = true"
        @verificar-fecha="verificarFechaExistente"
        @abrir-configuracion-medidas="abrirModalConfiguracionMedidas"
        @precio-agregado="onPrecioAgregado"
        @generar-esqueleto="aplicarEsqueletoDesdePedido"
        @esqueleto-error="onEsqueletoError"
        @abrir-rendimientos="irARendimientos"
        @abrir-multi-notas="abrirModalNotasMultiple"
      />

      <!-- Slider de escala para el resumen PDF -->
      <div v-if="mostrarEscalaResumen" class="scale-control scale-control-resumen">
        <label>Escala del resumen PDF:</label>
        <input 
          type="range" 
          v-model="escalaResumen" 
          min="30" 
          max="100" 
          step="1"
          class="scale-slider"
        >
        <span class="scale-value">{{ escalaResumen }}%</span>
        <button class="btn btn-primary" @click="generarPDFResumenConEscala">Generar PDF Resumen</button>
        <button class="btn btn-secondary" @click="mostrarEscalaResumen = false">Cancelar</button>
      </div>

      <!-- Botones Undo/Redo -->
      <div class="botones-undo-redo">
        <button 
          type="button" 
          @click="undo" 
          :disabled="undoStack.length <= 1"
          class="btn btn-secondary btn-sm"
        >
          Deshacer
        </button>
        <button 
          type="button" 
          @click="redo" 
          :disabled="redoStack.length === 0"
          class="btn btn-secondary btn-sm"
        >
          Rehacer
        </button>
      </div>

      <!-- Formulario Principal -->
      <form @submit.prevent="guardarEmbarque" @keydown.enter.prevent>
        <ClienteProductos 
          v-for="(clienteProductos, clienteId) in productosPorCliente" 
          :key="clienteId"
          :cliente-id="clienteId" 
          :productos="clienteProductos" 
          :crudos="clienteCrudos[clienteId] || []"
          :clientes-juntar-medidas="clientesJuntarMedidas" 
          :clientes-regla-otilio="clientesReglaOtilio"
          :clientes-incluir-precios="clientesIncluirPrecios"
          :clientes-cuenta-en-pdf="clientesCuentaEnPdf"
          :clientes-sumar-kg-catarro="clientesSumarKgCatarro"
          :nombre-cliente="obtenerNombreCliente(clienteId)"
          :cliente-activo="clienteActivo" 
          :embarque-bloqueado="embarqueBloqueado" 
          :medidas-usadas="medidasUsadas"
          :medidas-configuracion="medidasConfiguracion"
        :pedido-referencia-por-cliente="pedidoReferenciaPorCliente"
          :pedido-referencia-crudos-por-cliente="pedidoReferenciaCrudosPorCliente"
          :is-generating-pdf="isGeneratingPdf" 
          :pdf-type="pdfType" 
          :is-creating-account="isCreatingAccount"
          :precios-actuales="preciosActuales"
          :fecha-embarque="embarque.fecha"
          @update:productos="actualizarProductosCliente(clienteId, $event)"
          @update:crudos="actualizarCrudosCliente(clienteId, $event)" 
          @juntarMedidas-change="handleJuntarMedidasChange"
          @reglaOtilio-change="handleReglaOtilioChange"
          @incluirPrecios-change="handleIncluirPreciosChange"
          @cuentaEnPdf-change="handleCuentaEnPdfChange"
          @sumarKgCatarro-change="handleSumarKgCatarroChange"
          @marcar-campo-edicion="marcarCampoEnEdicion"
          @desmarcar-campo-edicion="desmarcarCampoEnEdicion"
          @eliminar-cliente="eliminarCliente" 
          @eliminar-producto="eliminarProducto" 
          @eliminar-crudo="eliminarCrudo"
          @eliminar-crudo-item="eliminarCrudoItem" 
          @agregar-producto="agregarProducto" 
          @agregar-crudo="agregarCrudo"
          @agregar-crudo-item="agregarCrudoItem" 
          @toggle-sobrante="toggleSobrante"
          @mostrar-modal-precio="abrirModalPrecio" 
          @mostrar-modal-hilos="abrirModalHilos"
          @mostrar-modal-nota="abrirModalNota" 
          @mostrar-modal-nombre-alternativo="abrirModalNombreAlternativo"
          @mostrar-modal-alt="abrirModalAlt" 
          @seleccionar-medida="seleccionarMedida" 
          @generar-pdf="generarPDF"
          @crear-cuenta-joselito="crearCuentaJoselito" 
          @crear-cuenta-catarro="crearCuentaCatarro" 
          @crear-cuenta-ozuna="crearCuentaOzuna"
          @crear-cuenta-otilio="crearCuentaOtilio"
          @crear-cuenta-veronica="crearCuentaVeronica"
          @ver-pedido-cliente="abrirModalPedidoCliente(clienteId)"
        />
      </form>
    </div>

    <!-- Modales Refactorizados -->
    <NuevoClienteModal 
      :mostrar="mostrarModalNuevoCliente" 
      @cerrar="mostrarModalNuevoCliente = false" 
      @agregar="agregarNuevoCliente"
    />

    <NombreAlternativoModal 
      :mostrar="mostrarModalNombreAlternativo" 
      :nombre-original="productoSeleccionado?.medida || ''" 
      :nombre-alternativo="productoSeleccionado?.nombreAlternativoPDF || ''" 
      @cerrar="cerrarModalNombreAlternativo" 
      @guardar="guardarNombreAlternativo"
    />

    <PrecioModal 
      :mostrar="mostrarModalPrecio" 
      :precio="itemSeleccionado?.precio || ''" 
      :guardando="guardandoModal"
      @cerrar="cerrarModalPrecio" 
      @guardar="guardarPrecio"
    />

    <HilosModal 
      :mostrar="mostrarModalHilos" 
      :hilos="itemSeleccionado?.hilos || ''" 
      :guardando="guardandoModal"
      @cerrar="cerrarModalHilos" 
      @guardar="guardarHilos"
    />

    <NotaModal 
      :mostrar="mostrarModalNota" 
      :nota="itemSeleccionado?.nota || ''" 
      :guardando="guardandoModal"
      @cerrar="cerrarModalNota" 
      @guardar="guardarNota"
    />

    <AltModal 
      :mostrar="mostrarModalAlt" 
      :alt="itemSeleccionado?.textoAlternativo || ''" 
      :guardando="guardandoModal"
      @cerrar="cerrarModalAlt" 
      @guardar="guardarAlt"
    />

    <ConfiguracionMedidasModal
      :mostrar="mostrarModalConfiguracionMedidas"
      :medidas-configuracion="medidasConfiguracion"
      :medidas-usadas="medidasUsadas"
      @cerrar="cerrarModalConfiguracionMedidas"
      @guardar="guardarConfiguracionMedidas"
    />

    <PedidoClienteModal
      :mostrar="mostrarModalPedidoCliente"
      :fecha-embarque="embarque.fecha"
      :nombre-cliente="clienteSeleccionadoPedido"
      @cerrar="cerrarModalPedidoCliente"
    />

    <NotasPdfMultipleModal
      :mostrar="mostrarModalNotasMultiple"
      :clientes="clientesConMedidasRegistradas"
      :seleccionados="modalNotasMultiple.seleccionados"
      :opciones="modalNotasMultiple.opciones"
      :cargando="isGeneratingPdf"
      @cerrar="cerrarModalNotasMultiple"
      @update:seleccionados="actualizarSeleccionNotasMultiple"
      @update:opciones="actualizarOpcionesNotasMultiple"
      @confirmar="generarNotasPdfMultiples"
    />

    <!-- Indicador de estado del guardado -->
    <SaveStatusIndicator />
    
    <!-- Notificación de error de autenticación -->
    <AuthErrorNotification 
      :show="showAuthError"
      :message="authErrorMessage"
      @hide="showAuthError = false"
    />
  </div>
</template>

<script>
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, onSnapshot, serverTimestamp, getDocs, setDoc, deleteDoc, query, where, orderBy, runTransaction } from 'firebase/firestore';
import { debounce } from 'lodash';
import { ref, onValue, onDisconnect, set } from 'firebase/database'
import { rtdb } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { getSaveManager } from '@/services/SaveManager'
import SaveStatusIndicator from '@/components/SaveStatusIndicator.vue'
import AuthErrorNotification from '@/components/AuthErrorNotification.vue'
import authDiagnostic from '@/utils/authDiagnostic.js'
import { ref as vueRef, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import HeaderEmbarque from '../Embarques/components/HeaderEmbarque.vue'
import pdfGenerationMixin from './mixins/pdfGenerationMixin';
import calculosMixin from './mixins/calculosMixin';
import ClienteProductos from './components/ClienteProductos.vue';
import { v4 as uuidv4 } from 'uuid'; // Importar uuid para IDs únicos

// Utilidad para validar UUIDs
const esUUIDValido = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

// Importar constantes y utilidades
import { 
  CLIENTES_PREDEFINIDOS, 
  crearNuevoProducto, 
  crearNuevoCrudoItem 
} from '@/constants.js/embarque';

// Importar componentes modaless
import NuevoClienteModal from './components/modals/NuevoClienteModal.vue';
import NombreAlternativoModal from './components/modals/NombreAlternativoModal.vue';
import PrecioModal from './components/modals/PrecioModal.vue';
import HilosModal from './components/modals/HilosModal.vue';
import NotaModal from './components/modals/NotaModal.vue';
import AltModal from './components/modals/AltModal.vue';
import ConfiguracionMedidasModal from './components/modals/ConfiguracionMedidasModal.vue';
import PedidoClienteModal from './components/modals/PedidoClienteModal.vue';
import NotasPdfMultipleModal from './components/modals/NotasPdfMultipleModal.vue';


// Lazy loaded components
const Rendimientos = defineAsyncComponent(() => import('./Rendimientos.vue'))

// Importar utilidades de fecha y precios
import { 
  normalizarFechaISO, 
  obtenerFechaActualISO 
} from '@/utils/dateUtils';
import { generarNotaVentaPDF } from '@/utils/pdfGenerator';

// Después de las imports existentes, agregar:
import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';

export default {
  mixins: [
    pdfGenerationMixin,
    calculosMixin
  ],

  name: 'NuevoEmbarque',
  
  components: {
    Rendimientos,
    Sidebar,
    HeaderEmbarque,
        ClienteProductos,
    // Registrar los componentes modales
    NuevoClienteModal,
    NombreAlternativoModal,
    PrecioModal,
    HilosModal,
    NotaModal,
    AltModal,
    ConfiguracionMedidasModal,
    PedidoClienteModal,
    NotasPdfMultipleModal,
    SaveStatusIndicator,
    AuthErrorNotification
  },
  
  setup() {
    const authStore = useAuthStore();
    return { authStore };
  },
  
  data() {
    return {
      usuariosActivos: [],
      clientesJuntarMedidas: {},
      clientesReglaOtilio: {},
      clientesIncluirPrecios: {},
      clientesCuentaEnPdf: {},
      clientesSumarKgCatarro: {},
      clientesPredefinidos: CLIENTES_PREDEFINIDOS, // Usar constantes importadas
      clientesPersonalizados: [],
      ultimoIdPersonalizado: 0,
      costosPorMedida: {},
      aplicarCostoExtra: {},
      costoExtra: 18,
      embarque: {
        fecha: null,
        cargaCon: '',
        camionNumero: 1,
        productos: [],
        crudos: []
      },
      nuevoClienteId: '',
      undoStack: [],
      redoStack: [],
      isUndoRedo: false,
      cambios: [],
      producto: {
        reporteTaras: [],
        reporteBolsas: []
      },
      embarqueId: null,
      modoEdicion: false,
      guardadoAutomaticoActivo: false,
      clienteCrudos: {},
      unsubscribe: null,
      medidasSugeridas: [],
      medidasUsadas: [], // Array para almacenar medidas únicas usadas
      mostrarSugerencias: false,
      sugerenciasMedidas: [],
      
      // Estados para modales
      mostrarModalNuevoCliente: false,
      nuevoClienteNombre: '',
      nuevoClienteColor: '#007bff',
      
      mostrarModalConfiguracionMedidas: false,
      medidasConfiguracion: [],
      pedidoReferenciaPorCliente: {},
      pedidoReferenciaCrudosPorCliente: {},
      pedidoReferenciaFecha: '',
      pedidoReferenciaCargando: false,
      
      mostrarModalNombreAlternativo: false,
      nombreAlternativoTemp: '',
      productoSeleccionado: null,
      
      mostrarModalPrecio: false,
      precioTemp: '',
      itemSeleccionado: null,
      
      mostrarModalHilos: false,
      hilosTemp: '',
      
      mostrarModalNota: false,
      notaTemp: '',
      
      mostrarModalAlt: false,
      altTemp: '',
      
      mostrarModalGenerarPdfCliente: false,
      modalGenerarPdf: {
        fecha: '',
        embarques: [],
        embarqueId: '',
        clienteId: '',
        clientes: [],
        cargando: false,
        error: ''
      },
      mostrarModalNotasMultiple: false,
      modalNotasMultiple: {
        seleccionados: [],
        opciones: {}
      },
      
      mostrarModalPedidoCliente: false,
      clienteSeleccionadoPedido: null,
      
      // Otros estados
      clientesOffsets: {},
      embarqueBloqueado: false,
      clienteActivo: null,
      sidebarCollapsed: false,
      
      // Estados para generación de PDF
      isGeneratingPdf: false,
      pdfType: null,
      
      // Variables para manejo de errores de autenticación
      showAuthError: false,
      authErrorMessage: 'Su sesión ha expirado o hay un problema con su autenticación.',
      isCreatingAccount: false,
      _creandoEmbarque: false,
      _guardandoEmbarque: false,
      mostrarEscalaResumen: false,
      escalaResumen: 100,
      _guardandoInicial: false, // Bandera para el guardado inicial automático
      _inicializandoEmbarque: false, // Bandera para evitar watchers durante la inicialización
      debouncedSave: null, // Para debounce del guardado automático (DEPRECATED - se mantiene por compatibilidad)
      saveManager: null, // Nuevo sistema de gestión de guardado
      preciosActuales: [],
      _aplicandoRemoto: false,
      clientesModificados: {},
      fechaModificada: false,
      cargaConModificada: false,
      productosEliminadosLocalmente: new Set(), // Set para rastrear productos eliminados localmente
      productosNuevosPendientes: new Map(), // Map para rastrear productos nuevos pendientes de sincronización
      agregandoProducto: false, // Bandera para indicar cuando estamos agregando un producto
      camposEnEdicion: new Set(), // Set para rastrear qué campos están siendo editados activamente
      productoNombreAlternativoEnEdicionId: null,
      nombreAlternativoPendienteSync: new Map(),
      // Control de backoff para auto-guardado cuando hay errores de cuota
      autoSaveBackoffMs: 0,
      autoSaveDisabledUntil: 0,
      lastAutoSaveQuotaAlert: false,
      // Estado de guardado para modales
      guardandoModal: false,
      hasPendingChanges: false,
      isSyncing: false,
    };
  },
  
  computed: {
    clientesDisponibles() {
      const clienteSet = new Set();
      const clientesPredefinidosUnicos = this.clientesPredefinidos.filter(cliente => {
        if (!clienteSet.has(cliente.nombre)) {
          clienteSet.add(cliente.nombre);
          return true;
        }
        return false;
      });

      const clientesPersonalizadosUnicos = this.clientesPersonalizados.filter(cliente => {
        if (!clienteSet.has(cliente.nombre)) {
          clienteSet.add(cliente.nombre);
          return true;
        }
        return false;
      });

      return [...clientesPredefinidosUnicos, ...clientesPersonalizadosUnicos, { id: 'otro', nombre: 'Otro', key: 'otro' }];
    },
    clientesConMedidasRegistradas() {
      const resultado = [];

      Object.entries(this.productosPorCliente || {}).forEach(([clienteId, productos]) => {
        const medidas = [];

        (productos || []).forEach((producto) => {
          if (producto?.medida && producto.medida.trim()) {
            medidas.push(producto.medida.trim());
          }
          if (producto?.talla && producto.talla.trim()) {
            medidas.push(producto.talla.trim());
          }
        });

        const crudosCliente = this.clienteCrudos?.[clienteId] || [];
        crudosCliente.forEach((crudo) => {
          (crudo?.items || []).forEach((item) => {
            if (item?.talla && item.talla.trim()) {
              medidas.push(item.talla.trim());
            }
          });
        });

        const medidasUnicas = [...new Set(medidas.filter(Boolean))];

        if (medidasUnicas.length) {
          resultado.push({
            id: clienteId.toString(),
            nombre: this.obtenerNombreCliente(clienteId),
            medidas: medidasUnicas
          });
        }
      });

      return resultado;
    },
    
    productosPorCliente() {
      
      const productosPorCliente = {};

      // Primero, asegurar que todos los clientes base aparezcan (aunque no tengan productos)
      this.clientesPredefinidos.forEach(cliente => {
        const clienteId = cliente.id.toString();
        productosPorCliente[clienteId] = [];
        
        // Asegurar que el cliente base tenga inicializado su contenedor de crudos
        if (!this.clienteCrudos[clienteId]) {
          this.$set(this.clienteCrudos, clienteId, []);
        }
      });

      // También incluir clientes personalizados del embarque actual (aunque no tengan productos)
      this.clientesPersonalizados.forEach(cliente => {
        const clienteId = cliente.id.toString();
        productosPorCliente[clienteId] = [];
        
        // Asegurar que el cliente tenga inicializado su contenedor de crudos
        if (!this.clienteCrudos[clienteId]) {
          this.$set(this.clienteCrudos, clienteId, []);
        }
      });

      // Luego, distribuir los productos existentes por cliente
      this.embarque.productos.forEach(producto => {
        const clienteId = producto.clienteId;
        if (!productosPorCliente[clienteId]) {
          productosPorCliente[clienteId] = [];
        }
        productosPorCliente[clienteId].push(producto);

        // Ordenar solo si los productos tienen medida y tipo
        if (!producto.isEditing) {
          productosPorCliente[clienteId].sort((a, b) => {
            // Solo ordenar si ambos productos tienen medida y tipo
            if (a.medida && a.tipo && b.medida && b.tipo) {
              return this.compararMedidas(b.medida, a.medida);
            }
            // Si alguno no tiene medida o tipo, mantener el orden original
            if (!a.medida || !a.tipo) return 1;
            if (!b.medida || !b.tipo) return -1;
            return 0;
          });
        }
      });

      return productosPorCliente;
    },
    
    clientesPersonalizadosEmbarque() {
      // Retorna solo los clientes personalizados que están realmente en el embarque actual
      const idsClientesEmbarque = new Set(this.embarque.productos.map(p => p.clienteId.toString()));
      return this.clientesPersonalizados.filter(c => idsClientesEmbarque.has(c.id.toString()));
    },
    
    // Calcula el total de kilos de crudo para el cliente activo
    totalKilosCrudoActivo() {
      if (!this.clienteActivo || !this.clienteCrudos[this.clienteActivo]) return 0;
      
      return this.clienteCrudos[this.clienteActivo].reduce((total, crudo) => {
        return total + (parseFloat(crudo.kilos) || 0);
      }, 0);
    },

    // Calcula el total de taras de crudo para el cliente activo
    totalTarasCrudoActivo() {
      if (!this.clienteActivo || !this.clienteCrudos[this.clienteActivo]) return 0;

      return this.clienteCrudos[this.clienteActivo].reduce((total, crudo) => {
        if (!crudo || !crudo.items || !Array.isArray(crudo.items)) return total;
        
        const tarasCrudo = crudo.items.reduce((itemTotal, item) => {
          let tarasItem = 0;
          if (item.taras) {
            const [cantidad] = item.taras.split('-');
            tarasItem += parseInt(cantidad) || 0;
          }
          if (item.sobrante) {
            const [cantidadSobrante] = item.sobrante.split('-');
            tarasItem += parseInt(cantidadSobrante) || 0;
          }
          return itemTotal + tarasItem;
        }, 0);
        
        return total + tarasCrudo;
      }, 0);
    },
    
    // Propiedad computada para el resumen de kilos de productos
    resumenKilosProductos() {
      const resumen = {};
      this.embarque.productos.forEach(producto => {
        if (!resumen[producto.clienteId]) {
          resumen[producto.clienteId] = { kilos: 0, taras: 0 };
        }
        resumen[producto.clienteId].kilos += this.calcularKilos(producto);
        resumen[producto.clienteId].taras += this.calcularTotalTaras(producto);
      });
      return resumen;
    },

    // Propiedad computada para el resumen de kilos de crudos
    resumenKilosCrudos() {
      const resumen = {};
      for (const clienteId in this.clienteCrudos) {
        if (!resumen[clienteId]) {
          resumen[clienteId] = { kilos: 0, taras: 0 };
        }
        this.clienteCrudos[clienteId].forEach(crudo => {
          resumen[clienteId].kilos += parseFloat(crudo.kilos) || 0;
          const tarasCrudo = crudo.items.reduce((itemTotal, item) => {
            let tarasItem = 0;
            if (item.taras) {
              const [cantidad] = item.taras.split('-');
              tarasItem += parseInt(cantidad) || 0;
            }
            if (item.sobrante) {
              const [cantidadSobrante] = item.sobrante.split('-');
              tarasItem += parseInt(cantidadSobrante) || 0;
            }
            return itemTotal + tarasItem;
          }, 0);
          resumen[clienteId].taras += tarasCrudo;
        });
      }
      return resumen;
    }
  },
  
  methods: {
    // Método para mostrar errores de autenticación
    mostrarErrorAutenticacion(mensaje = null) {
      this.authErrorMessage = mensaje || 'Su sesión ha expirado o hay un problema con su autenticación.';
      this.showAuthError = true;
    },

    // Método para mostrar errores al usuario
    mostrarError(mensaje) {
      // Usar el sistema de notificaciones si está disponible
      if (this.$toast) {
        this.$toast.error(mensaje, { duration: 5000 });
      } else {
        // Fallback a console.error y alert opcional
        console.error('[ERROR]', mensaje);
        // Solo mostrar alert para errores críticos
        if (mensaje.includes('recarga la página') || mensaje.includes('No se pudieron guardar')) {
          setTimeout(() => {
            alert(mensaje);
          }, 100);
        }
      }

      this.guardarSnapshotOffline({ pendingSync: !navigator.onLine }).catch(error => {
        console.warn('[mostrarError] No se pudo registrar snapshot offline del error:', error);
      });
    },
    
    // Método para mostrar mensajes informativos al usuario
    mostrarMensaje(mensaje) {
      // Usar el sistema de notificaciones si está disponible
      if (this.$toast) {
      this.$toast.info(mensaje, { duration: 3000 });
    } else {
      // Fallback omitido para depuración limpia
    }
    },
    onEsqueletoError(mensaje) {
      if (mensaje) {
        this.mostrarError(mensaje);
      }
    },
    normalizarTexto(texto) {
      return (texto || '').toString().trim().toLowerCase();
    },
    normalizarCantidadPedido(valor) {
      if (valor === null || valor === undefined || valor === '') {
        return 0;
      }
      const limpio = typeof valor === 'string' ? valor.replace(',', '.') : valor;
      const numero = Number(limpio);
      return Number.isNaN(numero) ? 0 : numero;
    },
    normalizarTipoPedido(tipo) {
      const tipoTexto = (tipo || '').toString().trim();
      const valor = tipoTexto.toLowerCase();

      if (valor === 's/h20' || valor === 's/h2o') {
        return { tipo: 's/h20', tipoPersonalizado: '' };
      }
      if (valor === 'c/h20' || valor === 'c/h2o') {
        return { tipo: 'c/h20', tipoPersonalizado: '' };
      }
      if (!valor) {
        return { tipo: '', tipoPersonalizado: '' };
      }
      return {
        tipo: 'otro',
        tipoPersonalizado: tipoTexto
      };
    },
    resolverClienteIdPedido(nombreCliente) {
      const normalizado = this.normalizarTexto(nombreCliente);
      const mapaPredefinidos = {
        joselito: '1',
        '8a': '1',
        catarro: '2',
        otilio: '3',
        ozuna: '4',
        veronica: '5',
        lorena: '5'
      };

      if (mapaPredefinidos[normalizado]) {
        return mapaPredefinidos[normalizado];
      }

      const clientePersonalizado = (this.clientesPersonalizados || []).find(cliente => {
        return this.normalizarTexto(cliente?.nombre) === normalizado;
      });

      return clientePersonalizado ? clientePersonalizado.id.toString() : null;
    },
    construirIndicePedidoReferencia(pedidos = []) {
      const referencias = {};
      const clientesLimpios = ['joselito', 'catarro', 'otilio', 'ozuna', 'lorena', 'veronica'];

      const asegurarCliente = (clienteId) => {
        if (!referencias[clienteId]) {
          referencias[clienteId] = {
            porClave: {},
            porMedida: {}
          };
        }
        return referencias[clienteId];
      };

      const agregarReferencia = (clienteId, medida, tipoData, cantidad, esTara) => {
        const medidaNormalizada = this.normalizarTexto(medida);
        if (!medidaNormalizada || !clienteId) {
          return;
        }

        const tipoNormalizado = this.normalizarTexto(tipoData?.tipo);
        const tipoPersonalizado = this.normalizarTexto(tipoData?.tipoPersonalizado);
        const clave = `${medidaNormalizada}__${tipoNormalizado}__${tipoPersonalizado}`;

        const referenciaCliente = asegurarCliente(clienteId);
        const referenciaClave = referenciaCliente.porClave[clave] || { kilos: 0, taras: 0 };
        const referenciaMedida = referenciaCliente.porMedida[medidaNormalizada] || { kilos: 0, taras: 0 };

        if (esTara) {
          referenciaClave.taras += cantidad;
          referenciaMedida.taras += cantidad;
        } else {
          referenciaClave.kilos += cantidad;
          referenciaMedida.kilos += cantidad;
        }

        referenciaCliente.porClave[clave] = referenciaClave;
        referenciaCliente.porMedida[medidaNormalizada] = referenciaMedida;
      };

      pedidos
        .filter(pedido => this.normalizarTexto(pedido?.tipo) === 'limpio')
        .forEach(pedido => {
          clientesLimpios.forEach(claveCliente => {
            const itemsCliente = Array.isArray(pedido?.[claveCliente]) ? pedido[claveCliente] : [];
            if (itemsCliente.length === 0) {
              return;
            }

            const clienteId = this.resolverClienteIdPedido(claveCliente);
            if (!clienteId) {
              return;
            }

            itemsCliente.forEach(item => {
              if (!item) {
                return;
              }

              const medida = (item.medida || '').toString().trim();
              if (!medida) {
                return;
              }

              const cantidad = this.normalizarCantidadPedido(item.kilos);
              if (cantidad <= 0) {
                return;
              }

              const tipoData = this.normalizarTipoPedido(item.tipo);
              agregarReferencia(clienteId, medida, tipoData, cantidad, item.esTara);
            });
          });

          if (pedido?.clientesTemporales && typeof pedido.clientesTemporales === 'object') {
            Object.values(pedido.clientesTemporales).forEach(cliente => {
              if (!cliente || !cliente.nombre || !Array.isArray(cliente.pedidos)) {
                return;
              }

              const clienteId = this.resolverClienteIdPedido(cliente.nombre);
              if (!clienteId) {
                return;
              }

              cliente.pedidos.forEach(item => {
                if (!item) {
                  return;
                }

                const medida = (item.medida || '').toString().trim();
                if (!medida) {
                  return;
                }

                const cantidad = this.normalizarCantidadPedido(item.kilos);
                if (cantidad <= 0) {
                  return;
                }

                const tipoData = this.normalizarTipoPedido(item.tipo);
                agregarReferencia(clienteId, medida, tipoData, cantidad, item.esTara);
              });
            });
          }
        });

      return referencias;
    },
    construirIndicePedidoReferenciaCrudos(pedidos = []) {
      const crudoClientesMap = {
        '8a': '1',
        'joselito': '1',
        'catarro': '2',
        'otilio': '3',
        'ozuna': '4',
        'veronica': '5',
        'lorena': '5'
      };
      const medidasCrudosMap = {
        'chico': 'Chico c/c',
        'med': 'Med c/c',
        'med-esp': 'Med-Esp c/c',
        'med-gde': 'Med-Gde c/c',
        'gde': 'Gde c/c',
        'gde c/ extra': 'Gde c/ Extra c/c',
        'extra': 'Extra c/c',
        'jumbo': 'Jumbo c/c',
        'linea': 'Linea',
        'lag gde': 'Lag gde c/c',
        'acamaya': 'Acamaya',
        'rechazo': 'Rechazo',
        'cam s/c': 'Cam s/c'
      };

      const referencias = {};

      pedidos
        .filter(pedido => this.normalizarTexto(pedido?.tipo) === 'crudo')
        .forEach(pedido => {
          if (!pedido.pedidos || typeof pedido.pedidos !== 'object') return;

          Object.entries(pedido.pedidos).forEach(([nombreCliente, medidasCliente]) => {
            const clienteKey = this.normalizarTexto(nombreCliente);
            const clienteId = crudoClientesMap[clienteKey];
            if (!clienteId || !medidasCliente || typeof medidasCliente !== 'object') return;

            if (!referencias[clienteId]) {
              referencias[clienteId] = {};
            }

            Object.entries(medidasCliente).forEach(([medida, cantidad]) => {
              const cantidadNum = this.normalizarCantidadPedido(cantidad);
              if (cantidadNum <= 0) return;

              const medidaKey = medida.toString().trim().toLowerCase();
              const tallaNormalizada = medidasCrudosMap[medidaKey] || medida.toString().trim();

              if (!referencias[clienteId][tallaNormalizada]) {
                referencias[clienteId][tallaNormalizada] = { taras: 0 };
              }
              referencias[clienteId][tallaNormalizada].taras += cantidadNum;
            });
          });
        });

      return referencias;
    },
    async cargarPedidoReferenciaDelDia(fecha = this.embarque.fecha) {
      const fechaConsulta = (fecha || '').toString().trim();
      if (!fechaConsulta || !navigator.onLine) {
        this.pedidoReferenciaPorCliente = {};
        this.pedidoReferenciaCrudosPorCliente = {};
        this.pedidoReferenciaFecha = fechaConsulta;
        return;
      }

      if (this.pedidoReferenciaCargando) {
        return;
      }

      if (this.pedidoReferenciaFecha === fechaConsulta && Object.keys(this.pedidoReferenciaPorCliente).length > 0) {
        return;
      }

      this.pedidoReferenciaCargando = true;
      try {
        const db = getFirestore();
        const pedidosRef = collection(db, 'pedidos');
        const q = query(pedidosRef, where('fecha', '==', fechaConsulta));
        const snapshot = await getDocs(q);
        const pedidos = snapshot.docs.map(doc => doc.data());

        this.pedidoReferenciaPorCliente = this.construirIndicePedidoReferencia(pedidos);
        this.pedidoReferenciaCrudosPorCliente = this.construirIndicePedidoReferenciaCrudos(pedidos);
        this.pedidoReferenciaFecha = fechaConsulta;
      } catch (error) {
        console.error('[NuevoEmbarque] Error al cargar pedidos para referencia:', error);
        this.pedidoReferenciaPorCliente = {};
        this.pedidoReferenciaCrudosPorCliente = {};
      } finally {
        this.pedidoReferenciaCargando = false;
      }
    },
    productoTieneContenido(producto) {
      if (!producto) {
        return false;
      }

      const tieneMedida = producto.medida && producto.medida.toString().trim() !== '';
      const tieneKilos = Array.isArray(producto.kilos) && producto.kilos.some(kilo => Number(kilo) > 0);
      const tieneTaras = Array.isArray(producto.taras) && producto.taras.some(tara => Number(tara) > 0);
      const tieneTarasExtra = Array.isArray(producto.tarasExtra) && producto.tarasExtra.some(tara => Number(tara) > 0);
      const tieneReportes = (
        Array.isArray(producto.reporteTaras) && producto.reporteTaras.some(tara => Number(tara) > 0)
      ) || (
        Array.isArray(producto.reporteBolsas) && producto.reporteBolsas.some(bolsa => Number(bolsa) > 0)
      );

      return tieneMedida || tieneKilos || tieneTaras || tieneTarasExtra || tieneReportes;
    },
    limpiarProductosSinMedida() {
      if (!Array.isArray(this.embarque.productos) || this.embarque.productos.length === 0) {
        return;
      }

      const removibles = this.embarque.productos.filter(producto => {
        const medida = (producto?.medida || '').toString().trim();
        if (medida) {
          return false;
        }
        return !this.productoTieneContenido(producto);
      });

      if (removibles.length === 0) {
        return;
      }

      if (!this.productosEliminadosLocalmente) {
        this.productosEliminadosLocalmente = new Set();
      }

      removibles.forEach(producto => {
        if (producto?.id !== undefined && producto?.id !== null) {
          this.productosEliminadosLocalmente.add(producto.id);
        }
      });

      this.embarque.productos = this.embarque.productos.filter(
        producto => !removibles.includes(producto)
      );
    },
    aplicarEsqueletoDesdePedido(esqueletoPorCliente) {
      if (!esqueletoPorCliente || typeof esqueletoPorCliente !== 'object') {
        console.warn('[aplicarEsqueletoDesdePedido] Datos de esqueleto inválidos:', esqueletoPorCliente);
        return;
      }

      const clientesIds = Object.keys(esqueletoPorCliente).filter(clienteId => {
        return Array.isArray(esqueletoPorCliente[clienteId]);
      });

      if (clientesIds.length === 0) {
        this.mostrarMensaje('No se encontraron medidas en los pedidos para generar el esqueleto.');
        return;
      }

      const clientesConDefiniciones = clientesIds.filter(clienteId => esqueletoPorCliente[clienteId].length > 0);

      if (clientesConDefiniciones.length === 0) {
        this.mostrarMensaje('Los pedidos no tienen medidas registradas para los clientes predeterminados.');
        return;
      }

      // Limpiar productos vacíos "Sin Medida - Sin Tipo" antes de agregar el esqueleto
      this.limpiarProductosSinMedida();

      if (!this.productosNuevosPendientes) {
        this.productosNuevosPendientes = new Map();
      }

      const nuevosProductos = [];
      const nuevosCrudosPorCliente = {};

      // Ayudantes para evitar duplicados respetando tipo y nota
      const construirClaveProducto = (entrada = {}) => {
        const medida = (entrada.medida || '').toString().trim().toLowerCase();
        const tipo = (entrada.tipo || '').toString().trim().toLowerCase();
        const tipoPersonalizado = (entrada.tipoPersonalizado || '').toString().trim().toLowerCase();
        const nota = (entrada.nota || '').toString().trim().toLowerCase();
        const esOzuna = (entrada.clienteId || '').toString() === '4';
        const ventaKey = esOzuna && typeof entrada.esVenta === 'boolean'
          ? (entrada.esVenta ? 'venta' : 'maquila')
          : '';
        if (!medida) return '';
        return `${medida}__${tipo}__${tipoPersonalizado}__${ventaKey}__${nota}`;
      };

      const construirClaveCrudo = (entrada = {}) => {
        const medida = (entrada.medida || entrada.talla || '').toString().trim().toLowerCase();
        if (!medida) return '';
        return medida;
      };

      clientesConDefiniciones.forEach(clienteId => {
        const definiciones = esqueletoPorCliente[clienteId] || [];
        const nombreCliente = this.obtenerNombreCliente(clienteId);
        const clienteIdStr = clienteId.toString();

        const productosExistentes = (this.embarque.productos || []).filter(producto => producto.clienteId?.toString() === clienteIdStr);
        const clavesProductos = new Set(productosExistentes.map(construirClaveProducto).filter(Boolean));

        const crudosCliente = this.clienteCrudos[clienteIdStr] || [];
        const clavesCrudos = new Set(
          crudosCliente.flatMap(crudo => (crudo.items || []).map(item => construirClaveCrudo(item)).filter(Boolean))
        );

        definiciones.forEach(definicion => {
          // Si es un crudo, agregarlo a clienteCrudos en lugar de productos
          if (definicion.tipo === 'crudo') {
            const claveCrudo = construirClaveCrudo(definicion);
            if (!claveCrudo || clavesCrudos.has(claveCrudo)) {
              return;
            }
            clavesCrudos.add(claveCrudo);

            if (!nuevosCrudosPorCliente[clienteIdStr]) {
              nuevosCrudosPorCliente[clienteIdStr] = [];
            }

            nuevosCrudosPorCliente[clienteIdStr].push({
              talla: definicion.medida || '',
              medida: definicion.medida || '',
              barco: '',
              taras: null,
              sobrante: null,
              mostrarSobrante: false,
              precio: null,
              pedidoReferencia: definicion.pedidoReferencia
                ? {
                    taras: definicion.pedidoReferencia.taras || 0
                  }
                : null
            });
          } else {
            const claveProducto = construirClaveProducto(definicion);
            if (!claveProducto || clavesProductos.has(claveProducto)) {
              return;
            }
            clavesProductos.add(claveProducto);

            // Es un producto limpio, agregarlo como siempre
            const nuevoProducto = crearNuevoProducto(clienteIdStr);
            nuevoProducto.nombreCliente = nombreCliente;
            nuevoProducto.medida = (definicion.medida || '').toString().trim();
            if (definicion.pedidoReferencia) {
              nuevoProducto.pedidoReferencia = {
                kilos: definicion.pedidoReferencia.kilos || 0,
                taras: definicion.pedidoReferencia.taras || 0
              };
            }

            if (definicion.tipo === 'c/h20' || definicion.tipo === 's/h20') {
              nuevoProducto.tipo = definicion.tipo;
            } else if (definicion.tipo === 'otro') {
              nuevoProducto.tipo = 'otro';
              nuevoProducto.tipoPersonalizado = (definicion.tipoPersonalizado || '').toString();
            } else if (definicion.tipo) {
              nuevoProducto.tipo = definicion.tipo;
            } else {
              this.setTipoDefaultParaCliente(nuevoProducto);
            }

            // Asignar la nota (sellado/kileado) desde el pedido limpio
            if (definicion.nota) {
              nuevoProducto.nota = definicion.nota;
            }
            if (definicion.tipo === 'c/h20' && definicion.camaronNeto) {
              nuevoProducto.camaronNeto = definicion.camaronNeto;
            }
            if (typeof definicion.esVenta === 'boolean') {
              nuevoProducto.esVenta = definicion.esVenta;
            }

            this.productosNuevosPendientes.set(nuevoProducto.id, { ...nuevoProducto });
            nuevosProductos.push(nuevoProducto);
          }
        });
      });

      const totalCrudosNuevos = Object.values(nuevosCrudosPorCliente).reduce((sum, crudosArray) => {
        return sum + crudosArray.reduce((itemSum, crudo) => itemSum + (crudo ? 1 : 0), 0);
      }, 0);

      if (nuevosProductos.length === 0 && totalCrudosNuevos === 0) {
        this.mostrarMensaje('No se agregaron medidas nuevas porque ya estaban registradas.');
        return;
      }

      // Agregar nuevos productos limpios
      if (nuevosProductos.length > 0) {
        this.embarque.productos.push(...nuevosProductos);
      }

      // Agregar nuevos crudos
      Object.entries(nuevosCrudosPorCliente).forEach(([clienteId, crudos]) => {
        if (!this.clienteCrudos[clienteId]) {
          this.$set(this.clienteCrudos, clienteId, []);
        }
        if (this.clienteCrudos[clienteId].length === 0) {
          this.clienteCrudos[clienteId].push({ items: [] });
        }
        if (!Array.isArray(this.clienteCrudos[clienteId][0].items)) {
          this.$set(this.clienteCrudos[clienteId][0], 'items', []);
        }
        this.clienteCrudos[clienteId][0].items.push(...crudos);
        this.$set(this.clientesModificados, clienteId, true);
      });

      // Marcar clientes con nuevos productos como modificados
      nuevosProductos.forEach(producto => {
        const clienteId = producto.clienteId?.toString();
        if (clienteId) {
          this.$set(this.clientesModificados, clienteId, true);
        }
      });

      if (!this.guardadoAutomaticoActivo && this.embarqueId) {
        this.guardadoAutomaticoActivo = true;
      }

      this.actualizarMedidasUsadas();
      this.$forceUpdate();

      if (this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }

      const mensaje = [];
      if (nuevosProductos.length > 0) {
        mensaje.push(`${nuevosProductos.length} producto(s) limpio(s)`);
      }
      if (totalCrudosNuevos > 0) {
        mensaje.push(`${totalCrudosNuevos} medida(s) de crudo(s)`);
      }
      this.mostrarMensaje(`Esqueleto generado: ${mensaje.join(' y ')}.`);

      if (clientesConDefiniciones.length > 0) {
        this.clienteActivo = clientesConDefiniciones[0];
      }
    },

    // Métodos para manejar campos en edición
    marcarCampoEnEdicion(productoId, campo) {
      const clave = `${productoId}-${campo}`;
      this.camposEnEdicion.add(clave);
    },

    desmarcarCampoEnEdicion(productoId, campo) {
      const clave = `${productoId}-${campo}`;
      this.camposEnEdicion.delete(clave);
    },

    esCampoEnEdicion(productoId, campo) {
      const clave = `${productoId}-${campo}`;
      return this.camposEnEdicion.has(clave);
    },

    // Método para hacer merge de productos preservando campos en edición
    mergeProductosConCamposEnEdicion(productosServidor, productosFiltrados) {
      const productosLocales = this.embarque.productos || [];
      const productosFinales = [];

      // Primero, agregar productos del servidor, pero preservando campos en edición
      productosFiltrados.forEach(productoServidor => {
        const productoLocal = productosLocales.find(p => p.id === productoServidor.id);
        
        if (!productoLocal) {
          // Producto no existe localmente, usar el del servidor
          productosFinales.push(productoServidor);
          return;
        }

        // Hacer merge del producto preservando campos en edición
        const productoMergeado = { ...productoServidor };
        

        // Verificar si hay campos de kilos en edición
        if (productoLocal.kilos && Array.isArray(productoLocal.kilos)) {
          productoLocal.kilos.forEach((kilo, index) => {
            if (this.esCampoEnEdicion(productoServidor.id, `kilos-${index}`)) {
              console.log(`[MERGE] Preservando kilo en edición: ${productoServidor.id}-kilos-${index}`);
              if (!productoMergeado.kilos) productoMergeado.kilos = [];
              productoMergeado.kilos[index] = kilo;
            }
          });
        }

        // Verificar si hay campos de taras en edición
        if (productoLocal.taras && Array.isArray(productoLocal.taras)) {
          productoLocal.taras.forEach((tara, index) => {
            if (this.esCampoEnEdicion(productoServidor.id, `taras-${index}`)) {
              console.log(`[MERGE] Preservando tara en edición: ${productoServidor.id}-taras-${index}`);
              if (!productoMergeado.taras) productoMergeado.taras = [];
              productoMergeado.taras[index] = tara;
            }
          });
        }

        if (this.esCampoEnEdicion(productoServidor.id, 'nombreAlternativoPDF')) {
          if (Object.prototype.hasOwnProperty.call(productoLocal, 'nombreAlternativoPDF')) {
            productoMergeado.nombreAlternativoPDF = productoLocal.nombreAlternativoPDF;
          } else {
            delete productoMergeado.nombreAlternativoPDF;
          }
        } else if (Object.prototype.hasOwnProperty.call(productoLocal, 'nombreAlternativoPDF')) {
          // Fallback: si hay un valor local presente y difiere del servidor, preferir el local
          if (productoLocal.nombreAlternativoPDF !== productoServidor.nombreAlternativoPDF) {
            productoMergeado.nombreAlternativoPDF = productoLocal.nombreAlternativoPDF;
          }
        }

        if (this.nombreAlternativoPendienteSync.has(productoServidor.id)) {
          const valorPendiente = this.nombreAlternativoPendienteSync.get(productoServidor.id);
          if (valorPendiente) {
            productoMergeado.nombreAlternativoPDF = valorPendiente;
          } else {
            delete productoMergeado.nombreAlternativoPDF;
          }

          const valorServidor = productoServidor.nombreAlternativoPDF || null;
          if ((valorPendiente || null) === valorServidor) {
            this.nombreAlternativoPendienteSync.delete(productoServidor.id);
          }
        }

        
        productosFinales.push(productoMergeado);
      });

      // Preservar productos nuevos pendientes de sincronización
      const productosNuevosAPreservar = [];
      if (this.productosNuevosPendientes && this.productosNuevosPendientes.size > 0) {
        this.productosNuevosPendientes.forEach((producto, id) => {
          const existeEnServidor = productosServidor.some(p => p.id === id);
          if (!existeEnServidor) {
            productosNuevosAPreservar.push(producto);
          } else {
            this.productosNuevosPendientes.delete(id);
          }
        });
      }

      // También preservar productos locales con UUID no sincronizados
      productosLocales.forEach(productoLocal => {
        if (esUUIDValido(productoLocal.id) && 
            !productosServidor.some(p => p.id === productoLocal.id) &&
            !productosNuevosAPreservar.some(p => p.id === productoLocal.id)) {
          productosNuevosAPreservar.push(productoLocal);
          if (!this.productosNuevosPendientes.has(productoLocal.id)) {
            this.productosNuevosPendientes.set(productoLocal.id, { ...productoLocal });
          }
        }
      });

      return [...productosFinales, ...productosNuevosAPreservar];
    },
    
    async triggerGuardadoInicial() {
      // Solo proceder si es un nuevo embarque sin ID
      if (this.embarqueId) {
        return;
      }

      // Verificar que ambos campos estén llenos
      if (this.embarque.fecha && this.embarque.cargaCon) {
        await this.guardarEmbarqueInicial();
      } else {
        
      }
    },
    seleccionarMedida(medida) {
      if (this.productoSeleccionado) {
        this.productoSeleccionado.medida = medida;
        this.mostrarSugerencias = false;
        this.productoSeleccionado.isEditing = true;
        this.$nextTick(() => {
          setTimeout(() => {
            this.productoSeleccionado.isEditing = false;
          }, 100);
        });
      }
    },
    // Métodos de gestión de productos y clientes
    actualizarProductosCliente(clienteId, productos) {
      // Filtrar productos que no han sido eliminados localmente
      let productosAActualizar = productos;
      if (this.productosEliminadosLocalmente && this.productosEliminadosLocalmente.size > 0) {
        productosAActualizar = productos.filter(p => 
          !this.productosEliminadosLocalmente.has(p.id)
        );
        
        // Si algún producto fue filtrado, loguearlo
        if (productosAActualizar.length !== productos.length) {
          console.log('[actualizarProductosCliente] Filtrando productos eliminados localmente');
        }
      }
      
      // Actualizar los productos del cliente en el embarque
      this.embarque.productos = this.embarque.productos.filter(p => p.clienteId !== clienteId);
      this.embarque.productos = [...this.embarque.productos, ...productosAActualizar];

      // Marcar como modificado si hay productos con medida válida (tipo opcional)
      const tieneProductosConMedida = productosAActualizar.some(p => 
        p.medida && p.medida.trim() !== ''
      );
      
      if (tieneProductosConMedida) {
        // Marcar cliente como modificado para merge transaccional
        this.$set(this.clientesModificados, clienteId, true);
        
        // Guardar cambios si es necesario
        if (this.guardadoAutomaticoActivo && this.embarqueId) {
          this.guardarCambiosEnTiempoReal();
        }
      }
    },

    actualizarCrudosCliente(clienteId, crudos) {
      // Actualizar los crudos del cliente
      this.$set(this.clienteCrudos, clienteId, crudos);

      // Marcar cliente como modificado para merge transaccional (crudos siempre se guardan)
      this.$set(this.clientesModificados, clienteId, true);
      
      // Guardar cambios si es necesario
      if (this.guardadoAutomaticoActivo && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },

    agregarProducto(clienteId) {
      // Activar bandera de agregando producto
      this.agregandoProducto = true;
      
      // --- INICIO: Verificación anti-duplicados ---
      const existeProductoNuevoVacio = this.embarque.productos.some(p => 
          p.clienteId === clienteId && 
          (p.isNew || p.isEditing) && // Considerado nuevo o en edición inicial
          !p.medida                  // Sin medida asignada todavía
      );

      if (existeProductoNuevoVacio) {
          console.warn(`Ya existe un producto nuevo vacío para el cliente ${this.obtenerNombreCliente(clienteId)}. No se agregará otro.`);
          // Opcional: Intentar enfocar el input existente
          this.$nextTick(() => {
             const inputs = document.querySelectorAll('.medida-input');
             const inputExistente = Array.from(inputs).find(input => {
                 const productoElement = input.closest('.producto');
                 if (!productoElement) return false;
                 const productoId = productoElement.dataset?.productoId;
                 const productoData = this.embarque.productos.find(p => String(p.id) === productoId);
                 return productoData && productoData.clienteId === clienteId && !productoData.medida;
             });
             if (inputExistente) {
                 inputExistente.focus();
             }
          });
          this.agregandoProducto = false; // Desactivar bandera
          return; // Detener la ejecución para no agregar duplicado
      }
      // --- FIN: Verificación anti-duplicados ---
      
      const nuevoProducto = crearNuevoProducto(clienteId);

      // Establecer tipo por defecto según el cliente
      this.setTipoDefaultParaCliente(nuevoProducto);
      
      // Establecer el nombre del cliente basado en el id
      nuevoProducto.nombreCliente = this.obtenerNombreCliente(clienteId);
      
      // Si este producto fue eliminado anteriormente, removerlo de la lista de eliminados
      // (aunque es poco probable con nuevos IDs únicos, es buena práctica)
      if (this.productosEliminadosLocalmente && this.productosEliminadosLocalmente.has(nuevoProducto.id)) {
        console.log('[AGREGAR-PRODUCTO] Removiendo producto de la lista de eliminados:', nuevoProducto.id);
        this.productosEliminadosLocalmente.delete(nuevoProducto.id);
      }

      // Marcar el producto como nuevo pendiente de sincronización ANTES de agregarlo
      if (!this.productosNuevosPendientes) {
        this.productosNuevosPendientes = new Map();
      }
      
      // Clonar el producto para evitar referencias mutables
      const productoParaPendientes = { ...nuevoProducto };
      this.productosNuevosPendientes.set(nuevoProducto.id, productoParaPendientes);
      console.log('[AGREGAR-PRODUCTO] Producto marcado como nuevo pendiente:', nuevoProducto.id);

      // Agregar directamente al embarque.productos
      this.embarque.productos.push(nuevoProducto);
      
      // Forzar actualización de la vista para asegurar que el producto sea visible
      this.$forceUpdate();

      // NO crear crudos automáticamente - el usuario los agrega manualmente cuando los necesite

      if (!this.guardadoAutomaticoActivo && this.embarqueId) {
        this.guardadoAutomaticoActivo = true;
      }

      if (this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }

      this.actualizarMedidasUsadas();

      // Esperar a que el DOM se actualice y enfocar el nuevo input
      this.$nextTick(() => {
        const inputs = document.querySelectorAll('.medida-input');
        const nuevoInput = Array.from(inputs).find(input => {
          const productoId = input.closest('.producto')?.dataset?.productoId;
          return productoId === String(nuevoProducto.id);
        });
        if (nuevoInput) {
          nuevoInput.focus();
        }
        
        // Desactivar bandera después de agregar el producto completamente
        setTimeout(() => {
          this.agregandoProducto = false;
        }, 200);
      });
    },

    eliminarProducto(producto) {
      console.log(`[ELIMINAR-PRODUCTO] Intentando eliminar: ID: ${producto.id}, Medida: ${producto.medida}, Cliente: ${this.obtenerNombreCliente(producto.clienteId)}`);
      
      // Marcar el producto como eliminado localmente para evitar que se restaure
      if (!this.productosEliminadosLocalmente) {
        this.productosEliminadosLocalmente = new Set();
      }
      this.productosEliminadosLocalmente.add(producto.id);
      
      // Marcar el cliente como modificado inmediatamente
      this.$set(this.clientesModificados, producto.clienteId, true);
      
      // Primer intento: buscar por ID exacto
      let index = this.embarque.productos.findIndex(p => p.id === producto.id);
      
      if (index > -1) {
        console.log(`[ELIMINAR-PRODUCTO] ✅ Encontrado por ID en índice ${index}`);
        this._eliminarProductoPorIndice(index, 'ID exacto');
        return;
      }
      
      console.warn(`[ELIMINAR-PRODUCTO] ⚠️  Producto NO encontrado por ID: ${producto.id}`);
      
      // Segundo intento: buscar por medida, cliente y propiedades similares
      const candidatos = this.embarque.productos.filter((p, idx) => {
        const coincideMedida = p.medida === producto.medida;
        const coincideCliente = p.clienteId === producto.clienteId;
        const coincideTipo = p.tipo === producto.tipo;
        
        return coincideMedida && coincideCliente && coincideTipo;
      });
      
      console.log(`[ELIMINAR-PRODUCTO] 🔍 Encontrados ${candidatos.length} candidatos por medida/cliente/tipo`);
      
      if (candidatos.length === 1) {
        // Solo un candidato, es muy probable que sea el correcto
        const candidato = candidatos[0];
        index = this.embarque.productos.findIndex(p => p === candidato);
        
        console.log(`[ELIMINAR-PRODUCTO] 🎯 Candidato único encontrado en índice ${index}:`, {
          id: candidato.id,
          medida: candidato.medida,
          tipo: candidato.tipo
        });
        
        this._eliminarProductoPorIndice(index, 'candidato único');
        return;
      }
      
      if (candidatos.length > 1) {
        console.warn(`[ELIMINAR-PRODUCTO] ⚠️  Múltiples candidatos encontrados (${candidatos.length}). No es seguro eliminar automáticamente.`);
        console.log('[ELIMINAR-PRODUCTO] Candidatos:', candidatos.map(c => ({ id: c.id, medida: c.medida })));
        
        // Mostrar alerta al usuario
        alert(`No se pudo eliminar el producto automáticamente.\n\nSe encontraron ${candidatos.length} productos similares.\nPor favor, recarga la página e intenta de nuevo.`);
        return;
      }
      
      // No se encontró nada
      console.error(`[ELIMINAR-PRODUCTO] ❌ No se encontró ningún producto que coincida con:`, {
        id: producto.id,
        medida: producto.medida,
        clienteId: producto.clienteId,
        tipo: producto.tipo
      });
      
      console.log(`[ELIMINAR-PRODUCTO] 📊 Total productos en embarque: ${this.embarque.productos.length}`);
      
      // Mostrar algunos productos existentes para debugging
      if (this.embarque.productos.length > 0) {
        console.log('[ELIMINAR-PRODUCTO] Primeros 3 productos en embarque:', 
          this.embarque.productos.slice(0, 3).map(p => ({ id: p.id, medida: p.medida, clienteId: p.clienteId }))
        );
      }
      
      alert('Error: No se pudo encontrar el producto para eliminar.\nEsto puede indicar un problema de sincronización.\n\nPor favor, recarga la página.');
    },
    
    _eliminarProductoPorIndice(index, metodo) {
      const producto = this.embarque.productos[index];
      
      console.log(`[ELIMINAR-PRODUCTO] 🗑️  Eliminando producto (${metodo}):`, {
        indice: index,
        id: producto.id,
        medida: producto.medida,
        clienteId: producto.clienteId
      });
      
      // Eliminar el producto del array
      this.embarque.productos.splice(index, 1);
      
      console.log(`[ELIMINAR-PRODUCTO] ✅ Producto eliminado exitosamente. Productos restantes: ${this.embarque.productos.length}`);

      // Guardar cambios si es necesario
      if (this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
      
      // Actualizar las medidas usadas después de eliminar
      this.actualizarMedidasUsadas();
    },

    // Función de debugging para verificar integridad de productos
    verificarIntegridadProductos() {
      console.log('\n🔍 === VERIFICACIÓN DE INTEGRIDAD DE PRODUCTOS ===');
      console.log(`📊 Total productos en embarque: ${this.embarque.productos.length}`);
      
      // Verificar IDs únicos
      const ids = this.embarque.productos.map(p => p.id);
      const idsUnicos = [...new Set(ids)];
      
      if (ids.length !== idsUnicos.length) {
        console.error(`❌ IDs duplicados detectados! Total: ${ids.length}, Únicos: ${idsUnicos.length}`);
        
        // Encontrar duplicados
        const duplicados = ids.filter((id, index) => ids.indexOf(id) !== index);
        console.log('🔍 IDs duplicados:', duplicados);
      } else {
        console.log(`✅ Todos los IDs son únicos`);
      }
      
      // Verificar formato de IDs (debe ser UUID válido)
      const idsInvalidos = this.embarque.productos.filter(p => {
        return !p.id || !esUUIDValido(p.id);
      });
      
      if (idsInvalidos.length > 0) {
        console.error(`❌ ${idsInvalidos.length} productos con IDs inválidos:`, idsInvalidos);
      } else {
        console.log(`✅ Todos los IDs tienen formato válido`);
      }
      
      // Verificar campos requeridos
      const productosIncompletos = this.embarque.productos.filter(p => {
        return !p.medida || !p.clienteId;
      });
      
      if (productosIncompletos.length > 0) {
        console.error(`❌ ${productosIncompletos.length} productos incompletos:`, productosIncompletos);
      } else {
        console.log(`✅ Todos los productos tienen campos requeridos`);
      }
      
      // Mostrar resumen por cliente
      const productosPortCliente = {};
      this.embarque.productos.forEach(p => {
        const cliente = p.clienteId || 'Sin cliente';
        if (!productosPortCliente[cliente]) {
          productosPortCliente[cliente] = [];
        }
        productosPortCliente[cliente].push(p.medida);
      });
      
      console.log('📋 Productos por cliente:', productosPortCliente);
      console.log('✅ Verificación de integridad completada\n');
      
      const tieneProblemas = ids.length !== idsUnicos.length || idsInvalidos.length > 0 || productosIncompletos.length > 0;
      
      if (tieneProblemas) {
        console.log('\n💡 Para solucionar problemas automáticamente, ejecuta en consola: this.repararIDsProductos()');
      }
      
      return {
        total: this.embarque.productos.length,
        idsUnicos: idsUnicos.length,
        tieneProblemas: tieneProblemas
      };
    },
    
    // Función para reparar IDs corruptos o duplicados
    repararIDsProductos() {
      console.log('\n🔧 === REPARANDO IDs DE PRODUCTOS ===');
      
      const idsOriginales = this.embarque.productos.map(p => p.id);
      const idsGenerados = new Set();
      let productosReparados = 0;
      
      this.embarque.productos.forEach(producto => {
        const idOriginal = producto.id;
        let necesitaReparacion = false;
        
        // Verificar si el ID es inválido o duplicado
        if (!idOriginal || !esUUIDValido(idOriginal)) {
          necesitaReparacion = true;
          console.log(`🔧 ID inválido detectado: ${idOriginal}`);
        } else if (idsGenerados.has(idOriginal)) {
          necesitaReparacion = true;
          console.log(`🔧 ID duplicado detectado: ${idOriginal}`);
        }
        
        if (necesitaReparacion) {
          const nuevoId = uuidv4();
          producto.id = nuevoId;
          productosReparados++;
          
          console.log(`✅ ID reparado: ${idOriginal} → ${nuevoId} (${producto.medida})`);
        }
        
        idsGenerados.add(producto.id);
      });
      
      if (productosReparados > 0) {
        console.log(`\n🎉 Reparación completada: ${productosReparados} productos reparados`);
        
        // Guardar cambios
        if (this.embarqueId) {
          this.guardarCambiosEnTiempoReal();
          console.log('💾 Cambios guardados automáticamente');
        }
        
        // Verificar integridad después de la reparación
        console.log('\n🔍 Verificando integridad después de la reparación...');
        setTimeout(() => {
          this.verificarIntegridadProductos();
        }, 500);
      } else {
        console.log('✅ No se necesitaron reparaciones');
      }
      
      return productosReparados;
    },

    async agregarClienteProducto() {
      // Verificar si hay algún modal abierto
      const modalAbierto = this.mostrarModalPrecio || 
                          this.mostrarModalHilos || 
                          this.mostrarModalNota || 
                          this.mostrarModalAlt || 
                          this.mostrarModalNombreAlternativo || 
                          this.mostrarModalNuevoCliente;
                          
      // No continuar si hay un modal abierto
      if (modalAbierto) {
        return;
      }
      
      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      if (this.nuevoClienteId === 'otro') {
        const nuevoNombre = prompt('Ingrese el nombre del nuevo cliente:');
        if (nuevoNombre && nuevoNombre.trim() !== '') {
          this.ultimoIdPersonalizado++;
          const nuevoClienteId = `personalizado_${this.ultimoIdPersonalizado}`;
          const nuevoCliente = {
            id: nuevoClienteId,
            nombre: nuevoNombre.trim(),
            editable: true,
            personalizado: true
          };
          this.clientesPersonalizados.push(nuevoCliente);
          await this.guardarEmbarqueInicial(nuevoClienteId);
        }
      } else if (this.nuevoClienteId) {
        await this.guardarEmbarqueInicial(this.nuevoClienteId);
      }
      this.nuevoClienteId = '';
    },

    async obtenerCamionNumeroParaFecha(fechaISO) {
      if (!fechaISO) {
        return 1;
      }

      try {
        if (!navigator.onLine) {
          await EmbarquesOfflineService.init();
          const registrosLocales = await EmbarquesOfflineService.getAll();
          const totalLocales = registrosLocales.filter(registro => {
            if (!registro || !registro.fecha) {
              return false;
            }
            try {
              const registroISO = normalizarFechaISO(registro.fecha);
              return registroISO === fechaISO;
            } catch (_) {
              return false;
            }
          }).length;
          return totalLocales + 1;
        }

        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const snapshot = await getDocs(embarquesRef);
        const totalRemotos = snapshot.docs.filter(doc => {
          const data = doc.data();
          let fechaEmbarque;
          
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fechaEmbarque = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fechaEmbarque = data.fecha;
          } else if (typeof data.fecha === 'string') {
            fechaEmbarque = data.fecha;
          } else {
            return false;
          }

          const fechaEmbarqueISO = normalizarFechaISO(fechaEmbarque);
          return fechaEmbarqueISO === fechaISO;
        }).length;

        return totalRemotos + 1;
      } catch (error) {
        console.warn('[obtenerCamionNumeroParaFecha] Error al calcular camión, usando 1:', error);
        return 1;
      }
    },

    async guardarEmbarqueInicial(clienteId) {
      // Verificar si hay algún modal abierto
      const modalAbierto = this.mostrarModalPrecio || 
                          this.mostrarModalHilos || 
                          this.mostrarModalNota || 
                          this.mostrarModalAlt || 
                          this.mostrarModalNombreAlternativo || 
                          this.mostrarModalNuevoCliente;
                          
      // No continuar si hay un modal abierto
      if (modalAbierto) {
        return null;
      }

      // --- INICIO: Verificación de guardado inicial en curso ---
      if (!this.embarqueId && this._guardandoInicial) {
          console.warn('Guardado inicial automático aún en progreso. Esperando para agregar cliente/producto.');
          // Podríamos esperar un poco y reintentar, o simplemente no hacer nada y
          // asumir que el usuario reintentará la acción si es necesario.
          // Por ahora, salimos para evitar conflictos.
          return null;
      }
      // --- FIN: Verificación de guardado inicial en curso ---
      
      // Control para evitar múltiples llamadas simultáneas
      if (this._creandoEmbarque) {
        console.warn('Ya hay una operación de creación de embarque en curso');
        return null;
      }
      
      this._creandoEmbarque = true;
      
      try {
        // Si no existe embarqueId, crear nuevo embarque
        if (!this.embarqueId) {
          const fechaISO = normalizarFechaISO(this.embarque.fecha);
          this.embarque.camionNumero = await this.obtenerCamionNumeroParaFecha(fechaISO);
          const embarqueData = this.prepararDatosEmbarque();

          // MODIFICADO: Estrategia Local-First
          // Siempre generar ID localmente y guardar offline primero
          // No intentamos contactar a Firebase aquí para evitar bloqueos
          
          this.embarqueId = uuidv4();
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;
          this.hasPendingChanges = true; // Marcar para subir

          // Inicializar servicio offline
          await EmbarquesOfflineService.init();

          // Guardar snapshot offline
          await this.guardarSnapshotOffline({ pendingSync: true, docData: embarqueData, syncState: 'pending-create' });

          if (clienteId) {
            this.agregarProducto(clienteId);
            this.clienteActivo = clienteId;
          }

          this._creandoEmbarque = false;
          return this.embarqueId;

        } else {
          // Si ya hay embarqueId, no hacer nada y solo agregarlo
          if (clienteId) {
            this.agregarProducto(clienteId);
            this.clienteActivo = clienteId;
          }
          this._creandoEmbarque = false;
          return this.embarqueId;
        }
      } catch (e) {
        this._creandoEmbarque = false;
        console.error('[LOG] Error al crear el embarque localmente:', e);
        alert('Hubo un error al crear el embarque. Por favor, intente de nuevo.');
        return null;
      }
    },

    async sincronizarConNube() {
      if (!this.hasPendingChanges) {
        this.mostrarMensaje('No hay cambios pendientes para subir.');
        return;
      }
      
      if (!navigator.onLine) {
        this.mostrarError('No hay conexión a internet para sincronizar.');
        return;
      }

      this.isSyncing = true;
      
      try {
        const db = getFirestore();
        const embarqueRef = doc(db, "embarques", this.embarqueId);
        
        // Preparar datos completos
        const embarqueData = this.prepararDatosEmbarque();
        
        const snap = await getDoc(embarqueRef);
        
        const payload = {
           ...embarqueData,
           ultimaEdicion: {
              userId: this.authStore.userId,
              username: this.authStore.user?.username || 'Usuario desconocido',
              timestamp: serverTimestamp()
           }
        };

        if (snap.exists()) {
           // Update
           await updateDoc(embarqueRef, payload);
        } else {
           // Create (setDoc con el ID generado localmente)
           await setDoc(embarqueRef, payload);
        }
        
        // Marcar como sincronizado localmente
        await EmbarquesOfflineService.markSynced(this.embarqueId);
        this.hasPendingChanges = false;
        this.mostrarMensaje('Cambios subidos exitosamente a la nube.');
        
      } catch (error) {
        console.error("Error al sincronizar con la nube:", error);
        this.mostrarError('Error al subir los cambios. Verifique su conexión.');
      } finally {
        this.isSyncing = false;
      }
    },

    async eliminarCliente(clienteId) {
      const nombreCliente = this.obtenerNombreCliente(clienteId);
      console.log(`[eliminarCliente] Eliminando cliente: ${nombreCliente} (ID: ${clienteId})`);
      
      // 1. Filtrar los productos para eliminar los del cliente seleccionado
      const productosAnteriores = this.embarque.productos.length;
      this.embarque.productos = this.embarque.productos.filter(p => p.clienteId !== clienteId);
      const productosEliminados = productosAnteriores - this.embarque.productos.length;
      console.log(`[eliminarCliente] ${productosEliminados} productos eliminados del cliente ${nombreCliente}`);

      // 2. Si es un cliente personalizado, eliminarlo de la lista de clientes personalizados
      const clientePersonalizadoIndex = this.clientesPersonalizados.findIndex(c => c.id.toString() === clienteId.toString());
      if (clientePersonalizadoIndex > -1) {
        this.clientesPersonalizados.splice(clientePersonalizadoIndex, 1);
        console.log(`[eliminarCliente] Cliente personalizado ${nombreCliente} eliminado de la lista`);
      }

      // 3. Limpiar configuraciones específicas del cliente
      if (this.clienteCrudos[clienteId]) {
        delete this.clienteCrudos[clienteId];
      }
      if (this.clientesJuntarMedidas[clienteId]) {
        delete this.clientesJuntarMedidas[clienteId];
      }
      if (this.clientesReglaOtilio[clienteId]) {
        delete this.clientesReglaOtilio[clienteId];
      }
      if (this.clientesIncluirPrecios[clienteId]) {
        delete this.clientesIncluirPrecios[clienteId];
      }
      if (this.clientesCuentaEnPdf[clienteId]) {
        delete this.clientesCuentaEnPdf[clienteId];
      }
      if (this.clientesSumarKgCatarro[clienteId]) {
        delete this.clientesSumarKgCatarro[clienteId];
      }

      // 4. Si el cliente activo era el que se eliminó, desactivarlo
      if (this.clienteActivo === clienteId) {
        this.clienteActivo = null;
      }

      // 5. Marcar el cliente como modificado para asegurar que se guarde
      this.$set(this.clientesModificados, clienteId, true);

      // 6. Actualizar localStorage y usar solo el guardado principal para evitar conflictos
      localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
      
      // Usar solo el guardado principal para evitar múltiples operaciones simultáneas
      this.guardarCambiosEnTiempoReal();

      // 7. Actualizar el estado para reflejar los cambios
      this.$forceUpdate();

      // 8. Limpiar la marca de modificación después de un breve delay
      setTimeout(() => {
        if (this.clientesModificados[clienteId]) {
          delete this.clientesModificados[clienteId];
        }
      }, 1000);

      // 9. Agregar un mensaje a la lista de cambios
      this.cambios.push(`Cliente ${nombreCliente} eliminado completamente`);
      
      console.log(`[eliminarCliente] Cliente ${nombreCliente} eliminado exitosamente`);
    },

    obtenerNombreCliente(clienteId) {
      // Validar que clienteId no sea null/undefined
      if (!clienteId) {
        return 'Cliente Desconocido';
      }

      const clienteEnLista = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      if (clienteEnLista && clienteEnLista.nombre) {
        return clienteEnLista.nombre;
      }
      
      // Buscar en los productos por si el cliente ya no está en la lista
      const productoConCliente = this.embarque.productos.find(p => p.clienteId.toString() === clienteId.toString());
      if (productoConCliente && productoConCliente.nombreCliente) {
        return productoConCliente.nombreCliente;
      }
      
      // Buscar en clientes personalizados
      const clientePersonalizado = this.clientesPersonalizados.find(c => c.id.toString() === clienteId.toString());
      if (clientePersonalizado && clientePersonalizado.nombre) {
        return clientePersonalizado.nombre;
      }
      
      return 'Cliente Desconocido';
    },

    obtenerClientesConProductos() {
      // Crear un mapa de clientes con sus productos
      const clientesConProductos = {};
      
      this.embarque.productos.forEach(producto => {
        const clienteId = producto.clienteId;
        if (!clientesConProductos[clienteId]) {
          clientesConProductos[clienteId] = {
            id: clienteId,
            nombre: this.obtenerNombreCliente(clienteId),
            productos: []
          };
        }
        clientesConProductos[clienteId].productos.push(producto);
      });

      // Convertir a array y agregar crudos si existen
      return Object.values(clientesConProductos).map(cliente => ({
        ...cliente,
        crudos: this.clienteCrudos[cliente.id] || []
      }));
    },

    editarNombreCliente(clienteId) {
      const cliente = this.clientesDisponibles.find(c => c.id === clienteId);
      if (cliente && cliente.editable) {
        const nuevoNombre = prompt('Ingrese el nuevo nombre del cliente:', cliente.nombre);
        if (nuevoNombre !== null && nuevoNombre.trim() !== '') {
          cliente.nombre = nuevoNombre.trim();
          // Actualizar el nombre en los productos existentes
          this.embarque.productos.forEach(producto => {
            if (producto.clienteId === clienteId) {
              producto.nombreCliente = nuevoNombre.trim();
            }
          });
        }
      }
    },

    // Métodos de carga y guardado
    async cargarEmbarque(id) {
      if (id === 'nuevo') {
        localStorage.removeItem('ultimoEmbarqueId');
        // Limpiar lista de productos eliminados para nuevo embarque
        if (this.productosEliminadosLocalmente && this.productosEliminadosLocalmente.size > 0) {
          this.productosEliminadosLocalmente.clear();
        }
        // Limpiar lista de productos nuevos pendientes para nuevo embarque
        if (this.productosNuevosPendientes && this.productosNuevosPendientes.size > 0) {
          this.productosNuevosPendientes.clear();
        }
        if (this.camposEnEdicion && this.camposEnEdicion.size > 0) {
          this.camposEnEdicion.clear();
        }
        this.resetearEmbarque();
        return;
      }
      
      // Limpiar la lista de productos eliminados localmente al cargar un embarque diferente
      if (this.productosEliminadosLocalmente && this.productosEliminadosLocalmente.size > 0) {
        this.productosEliminadosLocalmente.clear();
      }
      // Limpiar lista de productos nuevos pendientes al cargar un embarque diferente
      if (this.productosNuevosPendientes && this.productosNuevosPendientes.size > 0) {
        this.productosNuevosPendientes.clear();
      }
      if (this.camposEnEdicion && this.camposEnEdicion.size > 0) {
        console.log('[cargarEmbarque] Limpiando campos en edición');
        this.camposEnEdicion.clear();
      }

      // Activar bandera para evitar watchers durante la carga
      this._inicializandoEmbarque = true;

      // Limpiar conexiones existentes antes de crear nuevas
      this.limpiarConexionesFirestore();

      if (!navigator.onLine) {
        const cargadoOffline = await this.cargarEmbarqueOffline(id);
        if (!cargadoOffline) {
          console.warn('[cargarEmbarque] No se encontró información offline para el embarque solicitado:', id);
          alert('No se encontró información local para este embarque. Conéctate a internet para recuperarlo. Se conservará el estado actual para evitar pérdida de datos.');
        }
        this._inicializandoEmbarque = false;
        return;
      }

      const db = getFirestore();
      const embarqueRef = doc(db, "embarques", id);

      this.unsubscribe = onSnapshot(embarqueRef, async (doc) => {
        // Ignorar actualizaciones remotas si tenemos cambios locales pendientes
        // para evitar sobrescribir el trabajo en curso del usuario
        if (this.hasPendingChanges) {
          console.log('[onSnapshot] Ignorando actualización remota porque hay cambios locales pendientes.');
          return;
        }

        if (doc.exists()) {
          const data = doc.data();
          data.clientes = Array.isArray(data.clientes) ? data.clientes : [];
          this._aplicandoRemoto = true;

          // Protección crítica: si remoto viene vacío y local/offline tiene datos, no sobrescribir.
          if (!this.tieneContenidoOperativo(data)) {
            let hayContenidoOffline = false;
            try {
              const offlineRecord = await EmbarquesOfflineService.getById(id);
              const offlineData = offlineRecord?.docData || offlineRecord || {};
              hayContenidoOffline = this.tieneContenidoOperativo(offlineData);
            } catch (error) {
              console.warn('[onSnapshot] No se pudo validar snapshot offline para protección de contenido:', error);
            }

            const hayContenidoLocal = this.tieneContenidoOperativoActual();
            if (hayContenidoLocal || hayContenidoOffline) {
              console.warn('[onSnapshot] Snapshot remoto vacío ignorado para evitar sobrescritura de datos completos locales/offline.');
              this._inicializandoEmbarque = false;
              this._aplicandoRemoto = false;
              return;
            }
          }
          
          console.log('[DEBUG-FECHA] Cargando embarque ID:', id);
          console.log('[DEBUG-FECHA] Fecha cruda de Firebase:', data.fecha);
          console.log('[DEBUG-FECHA] Tipo de fecha:', typeof data.fecha, data.fecha?.constructor?.name);

          // Cargar el estado de bloqueo
          this.embarqueBloqueado = data.embarqueBloqueado || false;
          
          // Cargar clientes personalizados desde Firebase si existen
          if (data.clientesPersonalizados && Array.isArray(data.clientesPersonalizados)) {
            this.clientesPersonalizados = data.clientesPersonalizados;
            console.log('[cargarEmbarque] Clientes personalizados cargados desde Firebase:', this.clientesPersonalizados);
            // Sincronizar con localStorage
            localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
          } else {
            console.log('[cargarEmbarque] No se encontraron clientes personalizados en Firebase, usando localStorage como respaldo');
          }

          // Cargar el estado de juntar medidas
          if (data.clientesJuntarMedidas) {
            this.clientesJuntarMedidas = data.clientesJuntarMedidas;
          } else {
            // Si no existe, inicializar con valores por defecto
            this.clientesJuntarMedidas = {};
            data.clientes.forEach(cliente => {
              this.$set(this.clientesJuntarMedidas, cliente.id, false);
            });
          }

          // Cargar el estado de regla de Otilio
          if (data.clientesReglaOtilio) {
            this.clientesReglaOtilio = data.clientesReglaOtilio;
          } else {
            // Si no existe, inicializar con valores por defecto
            this.clientesReglaOtilio = {};
            data.clientes.forEach(cliente => {
              // Activar por defecto para clientes de Otilio
              const esOtilio = cliente.nombre && cliente.nombre.toLowerCase().includes('otilio');
              this.$set(this.clientesReglaOtilio, cliente.id, esOtilio);
            });
          }

          // Cargar el estado de incluir precios
          if (data.clientesIncluirPrecios) {
            this.clientesIncluirPrecios = data.clientesIncluirPrecios;
          } else {
            // Si no existe, inicializar con valores por defecto
            this.clientesIncluirPrecios = {};
            data.clientes.forEach(cliente => {
              this.$set(this.clientesIncluirPrecios, cliente.id, false);
            });
          }

          // Cargar el estado de cuenta en PDF
          if (data.clientesCuentaEnPdf) {
            this.clientesCuentaEnPdf = data.clientesCuentaEnPdf;
          } else {
            // Si no existe, inicializar con valores por defecto
            this.clientesCuentaEnPdf = {};
            data.clientes.forEach(cliente => {
              this.$set(this.clientesCuentaEnPdf, cliente.id, false);
            });
          }

          // Cargar el estado de sumar kg para Catarro
          if (data.clientesSumarKgCatarro) {
            this.clientesSumarKgCatarro = data.clientesSumarKgCatarro;
          } else {
            // Si no existe, inicializar con valores por defecto (activado para Catarro)
            this.clientesSumarKgCatarro = {};
            data.clientes.forEach(cliente => {
              // Activar por defecto para clientes de Catarro
              const esCatarro = cliente.nombre && cliente.nombre.toLowerCase().includes('catarro');
              this.$set(this.clientesSumarKgCatarro, cliente.id, esCatarro);
            });
          }

          let fecha;
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fecha = data.fecha.toDate();
            console.log('[DEBUG-FECHA] Fecha convertida de Timestamp:', fecha);
          } else if (data.fecha instanceof Date) {
            fecha = data.fecha;
            console.log('[DEBUG-FECHA] Fecha es Date object:', fecha);
          } else if (typeof data.fecha === 'string') {
            fecha = data.fecha;
            console.log('[DEBUG-FECHA] Fecha es string:', fecha);
          } else {
            console.warn('Formato de fecha no reconocido, usando la fecha actual');
            fecha = new Date();
          }
          
          const fechaNormalizada = normalizarFechaISO(fecha);
          console.log('[DEBUG-FECHA] Fecha normalizada final:', fechaNormalizada);

          // Crear un Map con los clientes predefinidos (convertir IDs a string para comparación)
          const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id.toString(), c]));

          // Filtrar y mapear clientes personalizados del servidor
          const personalizadosServidor = (data.clientes || [])
            .filter(cliente => !clientesPredefinidosMap.has(cliente.id.toString()))
            .map(cliente => ({
              id: cliente.id,
              nombre: cliente.nombre,
              editable: true,
              personalizado: true,
              key: `personalizado_${cliente.id}`
            }));

          // Fusionar con los ya existentes en memoria para no "perder" los recién añadidos localmente
          const mapaPorId = new Map();
          // Primero los locales (para priorizar cambios locales como nombre temporal)
          (this.clientesPersonalizados || []).forEach(c => {
            mapaPorId.set(String(c.id), { ...c });
          });
          // Luego los del servidor (sobre-escriben si existe el mismo id)
          personalizadosServidor.forEach(c => {
            mapaPorId.set(String(c.id), { ...c });
          });
          this.clientesPersonalizados = Array.from(mapaPorId.values());

          // Reconstruir productos, pero excluir los eliminados localmente
          const productosDesdeServidor = data.clientes.flatMap(cliente => {
            const clienteInfo = clientesPredefinidosMap.get(cliente.id.toString()) || cliente;
            return cliente.productos.map(producto => ({
              ...producto,
              clienteId: cliente.id,
              nombreCliente: clienteInfo.nombre,
              restarTaras: producto.restarTaras || false,
            }));
          });
          
          // Filtrar productos que han sido eliminados localmente
          let productosFiltrados = productosDesdeServidor;
          if (this.productosEliminadosLocalmente && this.productosEliminadosLocalmente.size > 0) {
            console.log('[onSnapshot] Filtrando productos eliminados localmente:', this.productosEliminadosLocalmente);
            productosFiltrados = productosDesdeServidor.filter(p => 
              !this.productosEliminadosLocalmente.has(p.id)
            );
          }
          
          // Determinar qué productos usar basado en si estamos agregando uno nuevo
          let productosFinales;
          
          if (this.agregandoProducto) {
            console.log('[onSnapshot] Agregando producto en proceso, preservando productos locales');
            // Mantener los productos locales actuales sin cambios
            productosFinales = this.embarque.productos || [];
          } else if (this.camposEnEdicion && this.camposEnEdicion.size > 0) {
            console.log('[onSnapshot] Hay campos en edición, mergear cuidadosamente');
            // Hacer merge inteligente preservando campos en edición
            productosFinales = this.mergeProductosConCamposEnEdicion(productosDesdeServidor, productosFiltrados);
          } else {
            // Preservar productos nuevos pendientes de sincronización
            const productosNuevosAPreservar = [];
            if (this.productosNuevosPendientes && this.productosNuevosPendientes.size > 0) {
              console.log('[onSnapshot] Preservando productos nuevos pendientes:', this.productosNuevosPendientes.size);
              
              // Verificar qué productos nuevos ya están en el servidor
              this.productosNuevosPendientes.forEach((producto, id) => {
                const existeEnServidor = productosDesdeServidor.some(p => p.id === id);
                if (!existeEnServidor) {
                  // El producto aún no está en el servidor, preservarlo
                  productosNuevosAPreservar.push(producto);
                  console.log('[onSnapshot] Preservando producto nuevo:', id);
                } else {
                  // El producto ya está sincronizado, removerlo de pendientes
                  this.productosNuevosPendientes.delete(id);
                  console.log('[onSnapshot] Producto sincronizado, removiendo de pendientes:', id);
                }
              });
            }
            
            // También preservar productos locales que no tienen ID de servidor válido
            const productosLocalesActuales = this.embarque.productos || [];
            productosLocalesActuales.forEach(productoLocal => {
              // Si es un producto con UUID (nuevo) y no está en el servidor ni en pendientes
              if (esUUIDValido(productoLocal.id) && 
                  !productosDesdeServidor.some(p => p.id === productoLocal.id) &&
                  !productosNuevosAPreservar.some(p => p.id === productoLocal.id)) {
                console.log('[onSnapshot] Preservando producto local no sincronizado:', productoLocal.id);
                productosNuevosAPreservar.push(productoLocal);
                // Agregarlo también a pendientes si no está
                if (!this.productosNuevosPendientes.has(productoLocal.id)) {
                  this.productosNuevosPendientes.set(productoLocal.id, { ...productoLocal });
                }
              }
            });
            
            // Combinar productos del servidor (filtrados) con productos nuevos pendientes
            productosFinales = [...productosFiltrados, ...productosNuevosAPreservar];
          }
          
          this.embarque = {
            fecha: fechaNormalizada,
            cargaCon: data.cargaCon || '', // Cargamos el valor de cargaCon
            camionNumero: data.camionNumero || 1,
            productos: productosFinales,
            // Agregar los kilos crudos
            kilosCrudos: data.kilosCrudos || {}
          };
          
          console.log('[DEBUG-FECHA] Embarque asignado con fecha:', this.embarque.fecha);
          console.log('[DEBUG-FECHA] Total productos cargados:', productosFinales.length);

          this.costosPorMedida = { ...(data.costosPorMedida || {}) };
          this.aplicarCostoExtra = { ...(data.aplicarCostoExtra || {}) };
          this.costoExtra = data.costoExtra !== undefined ? data.costoExtra : 18;

          // No crear productos automáticamente para clientes sin productos.
          // Esto evitaba eliminaciones correctas y generaba "Cliente Desconocido".

          // Cargar los crudos
          this.clienteCrudos = {};
          data.clientes.forEach(cliente => {
            if (cliente.crudos && cliente.crudos.length > 0) {
              this.$set(this.clienteCrudos, cliente.id, cliente.crudos);
            } else {
              // NO crear crudos automáticamente - el usuario los agrega manualmente cuando los necesite
              this.$set(this.clienteCrudos, cliente.id, []);
            }
          });

          this.embarqueId = id;
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;
          
          // Desactivar banderas INMEDIATAMENTE antes de guardar snapshot
          // para evitar que watchers disparen guardado durante la carga
          this._inicializandoEmbarque = false;
          this._aplicandoRemoto = false;
          
          this.guardarSnapshotOffline({ pendingSync: false, docData: data, syncState: 'synced' });
        } else {
          this.cargarEmbarqueOffline(id).then((cargadoOffline) => {
            if (cargadoOffline) {
              this._inicializandoEmbarque = false;
              this._aplicandoRemoto = false;
              return;
            }

            // Protección crítica: no limpiar ni resetear automáticamente para evitar pérdida accidental.
            alert('No se encontró el embarque en nube ni en cache local para ese ID. Se conservará el estado actual; verifica conexión y vuelve a intentar.');
            this._inicializandoEmbarque = false;
            this._aplicandoRemoto = false;
          });
        }
      }, (error) => {
        console.error("Error al escuchar cambios del embarque:", error);
        
        // Manejo específico de errores de conexión
        if (error.code === 'unavailable' || error.message.includes('network') || error.message.includes('NETWORK')) {
          console.warn('[onSnapshot] Error de red detectado, reintentando conexión en 5 segundos...');
          
          // Reintentar la conexión después de un delay
          setTimeout(() => {
            if (this.embarqueId && !this.unsubscribe) {
              console.log('[onSnapshot] Reintentando conexión...');
              this.cargarEmbarque(this.embarqueId);
            }
          }, 5000);
        } else if (error.code === 'permission-denied') {
          console.error('[onSnapshot] Error de permisos:', error);
          alert('Error de permisos. Por favor, verifique su acceso.');
        } else {
          console.error('[onSnapshot] Error desconocido:', error);
        }
        
        // Desactivar bandera en caso de error también
        this._inicializandoEmbarque = false;
        this._aplicandoRemoto = false;
      });
    },

    limpiarConexionesFirestore() {
      // Limpiar conexión existente si existe
      if (this.unsubscribe) {
        console.log('[limpiarConexiones] Cerrando conexión onSnapshot existente');
        try {
          this.unsubscribe();
        } catch (error) {
          console.warn('[limpiarConexiones] Error al cerrar conexión:', error);
        }
        this.unsubscribe = null;
      }
    },

    configurarReconexionAutomatica() {
      // Detectar cuando la conexión vuelve online
      window.addEventListener('online', () => {
        console.log('[Reconexión] Conexión restaurada, reestableciendo listeners...');
        if (this.embarqueId && !this.unsubscribe) {
          setTimeout(() => {
            this.cargarEmbarque(this.embarqueId);
          }, 1000);
        }
      });

      // Detectar cuando se pierde la conexión
      window.addEventListener('offline', () => {
        console.warn('[Conexión] Conexión perdida, modo offline activado');
      });
    },

    async resetearEmbarque() {
      // Verificar si hay algún modal abierto
      const modalAbierto = this.mostrarModalPrecio || 
                           this.mostrarModalHilos || 
                           this.mostrarModalNota || 
                           this.mostrarModalAlt || 
                           this.mostrarModalNombreAlternativo || 
                           this.mostrarModalNuevoCliente;
                            
      // No reiniciar si hay un modal abierto
      if (modalAbierto) {
        return;
      }
      
      
      // Activar bandera para evitar watchers durante la inicialización
      this._inicializandoEmbarque = true;
      // Establecer una fecha por defecto (fecha actual)
      const fechaActual = obtenerFechaActualISO();

      this.costosPorMedida = {};
      this.aplicarCostoExtra = {};
      this.costoExtra = 18;
      
      try {
        const db = getFirestore();
        const fechaEmbarque = fechaActual;
        
        // --- INICIO: Refactorización creación inicial ---
        // 1. Inicializar el embarque con la fecha disponible y arrays vacíos
        this.embarque = {
          fecha: fechaEmbarque,
          cargaCon: '',
          camionNumero: 1,
          productos: [], // Empezar vacío
          crudos: []
        };
        this.clienteCrudos = {};
        this.clientesJuntarMedidas = {};
        this.clientesReglaOtilio = {};
        this.clientesIncluirPrecios = {};
        this.embarqueId = null;
        this.modoEdicion = false;
        this.guardadoAutomaticoActivo = false;
        this.embarqueBloqueado = false;
        this.clientesPersonalizados = []; // Reiniciar clientes personalizados

        // 2. Crear productos para todos los clientes predefinidos localmente
        const productosIniciales = this.clientesPredefinidos.map(cliente => {
            const nuevoProducto = crearNuevoProducto(cliente.id.toString());
            nuevoProducto.nombreCliente = cliente.nombre;
            this.setTipoDefaultParaCliente(nuevoProducto);
            return nuevoProducto;
        });
        
        // 3. NO inicializar crudos automáticamente - el usuario los agrega manualmente cuando los necesite
        this.clienteCrudos = {};
        
        // 4. Asignar los productos iniciales al estado
        this.embarque.productos = productosIniciales;
        
        // 4.1. Inicializar la regla de Otilio activada por defecto para clientes de Otilio
        this.clientesPredefinidos.forEach(cliente => {
            const esOtilio = cliente.nombre && cliente.nombre.toLowerCase().includes('otilio');
            this.$set(this.clientesReglaOtilio, cliente.id.toString(), esOtilio);
        });

        // 4.2. Inicializar el estado de sumar kg para Catarro (desactivado por defecto)
        this.clientesPredefinidos.forEach(cliente => {
            const esCatarro = cliente.nombre && cliente.nombre.toLowerCase().includes('catarro');
            // Inicializar como false por defecto, para que el usuario tenga que activarlo explícitamente
            this.$set(this.clientesSumarKgCatarro, cliente.id.toString(), false);
        });

        // 4.3. Inicializar el estado de incluir precios (desactivado por defecto)
        this.clientesPredefinidos.forEach(cliente => {
            // Inicializar como false por defecto, para que el usuario tenga que activarlo explícitamente
            this.$set(this.clientesIncluirPrecios, cliente.id.toString(), false);
        });

        // 4.3.1. Inicializar el estado de cuenta en PDF (desactivado por defecto)
        this.clientesPredefinidos.forEach(cliente => {
            // Inicializar como false por defecto, para que el usuario tenga que activarlo explícitamente
            this.$set(this.clientesCuentaEnPdf, cliente.id.toString(), false);
        });

        // 4.4. Inicializar el estado de juntar medidas (desactivado por defecto)
        this.clientesPredefinidos.forEach(cliente => {
            // Inicializar como false por defecto, para que el usuario tenga que activarlo explícitamente
            this.$set(this.clientesJuntarMedidas, cliente.id.toString(), false);
        });
        
        // 5. Establecer el primer cliente como activo
        if (this.clientesPredefinidos.length > 0) {
            this.clienteActivo = this.clientesPredefinidos[0].id.toString();
        }

        // 6. Intentar guardar este estado inicial en Firebase (si la fecha es válida)
        if (this.embarque.fecha) {
            this._guardandoInicial = true; // <- Establecer bandera ANTES del async
            this.$nextTick(async () => {
                try {
                    this.embarque.camionNumero = await this.obtenerCamionNumeroParaFecha(this.embarque.fecha);
                    const embarqueData = this.prepararDatosEmbarque();
                    const docRef = await addDoc(collection(db, "embarques"), embarqueData);
                    this.embarqueId = docRef.id;
                    this.modoEdicion = true;
                    this.guardadoAutomaticoActivo = true;
                    localStorage.setItem('ultimoEmbarqueId', this.embarqueId);
                } catch (error) {
                    console.error('Error en el guardado inicial automático:', error);
                } finally {
                    this._guardandoInicial = false; // <- Limpiar bandera
                }
            });
        } 
        // --- FIN: Refactorización creación inicial ---
      } catch (error) {
        console.error("Error al resetear el embarque:", error);
        // En caso de error, inicializar con valores por defecto pero sin crear automáticamente
        this.embarque = {
          fecha: fechaActual,
          cargaCon: '',
          camionNumero: 1,
          productos: [],
        };
        this.clientesJuntarMedidas = {};
        this.clientesReglaOtilio = {};
        this.clientesIncluirPrecios = {};
        // Inicializar regla de Otilio activada por defecto para clientes predefinidos
        this.clientesPredefinidos.forEach(cliente => {
            const esOtilio = cliente.nombre && cliente.nombre.toLowerCase().includes('otilio');
            this.$set(this.clientesReglaOtilio, cliente.id.toString(), esOtilio);
        });
        this.embarqueId = null;
        this.modoEdicion = false;
        this.guardadoAutomaticoActivo = false;
        this.embarqueBloqueado = false;
        this.clientesPersonalizados = [];
      }
      
      // Desactivar bandera después de completar la inicialización
      this.$nextTick(() => {
        this._inicializandoEmbarque = false;
      });
    },

    buildOfflineSnapshot(docDataOverride = null) {
      if (!this.embarqueId) {
        return null;
      }

      const safeClone = (value, fallback) => {
        if (value === undefined || value === null) {
          return fallback;
        }
        try {
          return JSON.parse(JSON.stringify(value));
        } catch (error) {
          console.warn('[buildOfflineSnapshot] Error al clonar valor, devolviendo fallback:', error);
          return fallback;
        }
      };

      const docData = docDataOverride || this.prepararDatosEmbarque();

      return {
        id: this.embarqueId,
        fecha: docData?.fecha || this.embarque.fecha || null,
        cargaCon: docData?.cargaCon || this.embarque.cargaCon || '',
        camionNumero: docData?.camionNumero || this.embarque.camionNumero || 1,
        embarqueBloqueado: this.embarqueBloqueado || false,
        productos: safeClone(this.embarque.productos || [], []),
        clienteCrudos: safeClone(this.clienteCrudos || {}, {}),
        clientesJuntarMedidas: safeClone(this.clientesJuntarMedidas || {}, {}),
        clientesReglaOtilio: safeClone(this.clientesReglaOtilio || {}, {}),
        clientesIncluirPrecios: safeClone(this.clientesIncluirPrecios || {}, {}),
        clientesCuentaEnPdf: safeClone(this.clientesCuentaEnPdf || {}, {}),
        clientesSumarKgCatarro: safeClone(this.clientesSumarKgCatarro || {}, {}),
        clientesPersonalizados: safeClone(this.clientesPersonalizados || [], []),
        costosPorMedida: safeClone(this.costosPorMedida || {}, {}),
        aplicarCostoExtra: safeClone(this.aplicarCostoExtra || {}, {}),
        costoExtra: this.costoExtra,
        medidasConfiguracion: safeClone(this.medidasConfiguracion || [], []),
        preciosActuales: safeClone(this.preciosActuales || [], []),
        clientes: safeClone(docData?.clientes || [], []),
        docData: safeClone(docData || {}, {}),
      };
    },

    async guardarSnapshotOffline(options = {}) {
      if (!this.embarqueId || this._inicializandoEmbarque) {
        return;
      }

      try {
        await EmbarquesOfflineService.init();
        const snapshot = this.buildOfflineSnapshot(options.docData);
        if (!snapshot) {
          return;
        }
        const pendingSync = options.pendingSync !== undefined ? options.pendingSync : !navigator.onLine;
        await EmbarquesOfflineService.save(snapshot, {
          pendingSync,
          syncState: options.syncState,
          lastSyncError: options.lastSyncError,
        });
      } catch (error) {
        console.error('[guardarSnapshotOffline] Error al guardar snapshot offline:', error);
      }
    },

    async cargarEmbarqueOffline(id) {
      try {
        await EmbarquesOfflineService.init();
        const record = await EmbarquesOfflineService.getById(id);
        if (!record) {
          console.log('[DEBUG-OFFLINE] No se encontró registro offline para ID:', id);
          return false;
        }
        console.log('[DEBUG-OFFLINE] Registro offline encontrado para ID:', id);
        console.log('[DEBUG-OFFLINE] Fecha en registro offline:', record.fecha);
        console.log('[DEBUG-OFFLINE] Total productos en offline:', record.productos?.length || 0);
        this.aplicarSnapshotOffline(record);
        return true;
      } catch (error) {
        console.error('[cargarEmbarqueOffline] No se pudo cargar el embarque offline:', error);
        return false;
      }
    },

    aplicarSnapshotOffline(record) {
      if (!record || !record.id) {
        return;
      }

      const safeClone = (value, fallback) => {
        if (value === undefined || value === null) {
          return fallback;
        }
        try {
          return JSON.parse(JSON.stringify(value));
        } catch (error) {
          console.warn('[aplicarSnapshotOffline] Error al clonar valor, usando fallback:', error);
          return fallback;
        }
      };

      this._inicializandoEmbarque = true;

      this.embarqueId = record.id;
      this.modoEdicion = true;
      this.guardadoAutomaticoActivo = true;
      this.embarqueBloqueado = Boolean(record.embarqueBloqueado);
      
      // Restaurar estado de cambios pendientes
      this.hasPendingChanges = Boolean(record.pendingSync);

      const fechaRecord = record.fecha || record.docData?.fecha || null;
      const fechaNormalizada = fechaRecord ? normalizarFechaISO(fechaRecord) : null;
      
      console.log('[DEBUG-APLICAR-OFFLINE] ID del registro:', record.id);
      console.log('[DEBUG-APLICAR-OFFLINE] Fecha original del record:', fechaRecord);
      console.log('[DEBUG-APLICAR-OFFLINE] Fecha normalizada:', fechaNormalizada);
      console.log('[DEBUG-APLICAR-OFFLINE] Total productos a cargar:', record.productos?.length || 0);

      this.embarque = {
        fecha: fechaNormalizada,
        cargaCon: record.cargaCon || '',
        camionNumero: record.camionNumero || record.docData?.camionNumero || 1,
        kilosCrudos: safeClone(record.kilosCrudos || record.docData?.kilosCrudos || {}, {}),
        productos: safeClone(record.productos || [], []),
      };
      
      console.log('[DEBUG-APLICAR-OFFLINE] Embarque.fecha asignado:', this.embarque.fecha);
      console.log('[DEBUG-APLICAR-OFFLINE] Embarque.productos.length:', this.embarque.productos.length);

      this.clienteCrudos = safeClone(record.clienteCrudos || {}, {});
      this.clientesJuntarMedidas = safeClone(record.clientesJuntarMedidas || {}, {});
      this.clientesReglaOtilio = safeClone(record.clientesReglaOtilio || {}, {});
      this.clientesIncluirPrecios = safeClone(record.clientesIncluirPrecios || {}, {});
      this.clientesCuentaEnPdf = safeClone(record.clientesCuentaEnPdf || {}, {});
      this.clientesSumarKgCatarro = safeClone(record.clientesSumarKgCatarro || {}, {});
      this.clientesPersonalizados = safeClone(record.clientesPersonalizados || [], []);
      this.costosPorMedida = safeClone(record.costosPorMedida || {}, {});
      this.aplicarCostoExtra = safeClone(record.aplicarCostoExtra || {}, {});
      this.costoExtra = record.costoExtra !== undefined ? record.costoExtra : this.costoExtra;
      this.medidasConfiguracion = safeClone(record.medidasConfiguracion || [], []);
      this.preciosActuales = safeClone(record.preciosActuales || [], []);

      try {
        localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
      } catch (error) {
        console.warn('[aplicarSnapshotOffline] No se pudo sincronizar clientes personalizados con localStorage:', error);
      }

      this.productosEliminadosLocalmente = new Set();
      this.productosNuevosPendientes = new Map();
      this.camposEnEdicion = new Set();

      // Desactivar bandera INMEDIATAMENTE para evitar guardados automáticos
      this._inicializandoEmbarque = false;

      this.actualizarMedidasUsadas();
      this.undoStack = [JSON.stringify(this.embarque)];
      this.redoStack = [];
      this.clienteActivo = this.embarque.productos.length > 0 ? this.embarque.productos[0].clienteId : null;
      
      console.log('[DEBUG-APLICAR-OFFLINE] Carga offline completada, bandera desactivada');
    },

    normalizarDocDataParaFirestore(docData, record = {}) {
      const dataCruda = docData ? JSON.parse(JSON.stringify(docData)) : this.prepararDatosEmbarque();

      const parseFecha = (valor) => {
        // Mantener como string YYYY-MM-DD para evitar problemas de zona horaria
        if (!valor) {
          const hoy = new Date();
          const y = hoy.getUTCFullYear();
          const m = String(hoy.getUTCMonth() + 1).padStart(2, '0');
          const d = String(hoy.getUTCDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
        // Si ya es string en formato YYYY-MM-DD, retornarlo directamente
        if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
          return valor;
        }
        // Si es un string ISO con tiempo, extraer solo la parte de fecha
        if (typeof valor === 'string') {
          const match = valor.match(/^(\d{4}-\d{2}-\d{2})/);
          if (match) {
            return match[1];
          }
        }
        // Si es un Date object, convertir a string YYYY-MM-DD usando UTC
        if (valor instanceof Date) {
          const y = valor.getUTCFullYear();
          const m = String(valor.getUTCMonth() + 1).padStart(2, '0');
          const d = String(valor.getUTCDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
        // Si es un Timestamp de Firebase, convertir a string YYYY-MM-DD
        if (typeof valor === 'object' && valor !== null) {
          if (typeof valor.seconds === 'number') {
            const fecha = new Date(valor.seconds * 1000);
            const y = fecha.getUTCFullYear();
            const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
            const d = String(fecha.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
          if (typeof valor._seconds === 'number') {
            const fecha = new Date(valor._seconds * 1000);
            const y = fecha.getUTCFullYear();
            const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
            const d = String(fecha.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
        }
        // Como fallback, intentar parsear como string y usar UTC
        if (typeof valor === 'string') {
          try {
            const parsed = new Date(valor);
            if (!Number.isNaN(parsed.getTime())) {
              const y = parsed.getUTCFullYear();
              const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
              const d = String(parsed.getUTCDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            }
          } catch (error) {
            console.warn('[normalizarDocDataParaFirestore] No se pudo parsear la fecha:', valor, error);
          }
        }
        // Si todo falla, usar fecha actual con UTC
        const hoy = new Date();
        const y = hoy.getUTCFullYear();
        const m = String(hoy.getUTCMonth() + 1).padStart(2, '0');
        const d = String(hoy.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      const data = {
        cargaCon: dataCruda.cargaCon || '',
        camionNumero: dataCruda.camionNumero || record.camionNumero || 1,
        kilosCrudos: dataCruda.kilosCrudos || record.kilosCrudos || {},
        clientes: Array.isArray(dataCruda.clientes) ? dataCruda.clientes : [],
        clientesJuntarMedidas: dataCruda.clientesJuntarMedidas || {},
        clientesReglaOtilio: dataCruda.clientesReglaOtilio || {},
        clientesIncluirPrecios: dataCruda.clientesIncluirPrecios || {},
        clientesCuentaEnPdf: dataCruda.clientesCuentaEnPdf || {},
        clientesSumarKgCatarro: dataCruda.clientesSumarKgCatarro || {},
        clientesPersonalizados: Array.isArray(dataCruda.clientesPersonalizados) ? dataCruda.clientesPersonalizados : [],
        embarqueBloqueado: record.embarqueBloqueado ?? dataCruda.embarqueBloqueado ?? false,
        costosPorMedida: dataCruda.costosPorMedida || {},
        aplicarCostoExtra: dataCruda.aplicarCostoExtra || {},
        costoExtra: typeof dataCruda.costoExtra === 'number' ? dataCruda.costoExtra : (this.costoExtra || 18),
        medidasConfiguracion: Array.isArray(dataCruda.medidasConfiguracion) ? dataCruda.medidasConfiguracion : [],
        preciosActuales: Array.isArray(dataCruda.preciosActuales) ? dataCruda.preciosActuales : [],
        medidaOculta: dataCruda.medidaOculta || record.medidaOculta || {},
        analizarGanancia: dataCruda.analizarGanancia || record.analizarGanancia || {},
        analizarGananciaCrudos: dataCruda.analizarGananciaCrudos || record.analizarGananciaCrudos || {},
        analizarMaquilaGanancia: dataCruda.analizarMaquilaGanancia || record.analizarMaquilaGanancia || {},
        precioMaquila: dataCruda.precioMaquila || record.precioMaquila || {},
        pesoTaraCosto: typeof dataCruda.pesoTaraCosto === 'number' ? dataCruda.pesoTaraCosto : (record.pesoTaraCosto ?? 19),
        pesoTaraVenta: typeof dataCruda.pesoTaraVenta === 'number' ? dataCruda.pesoTaraVenta : (record.pesoTaraVenta ?? 20),
        nombresMedidasPersonalizados: dataCruda.nombresMedidasPersonalizados || record.nombresMedidasPersonalizados || {},
        notaRendimientos: dataCruda.notaRendimientos || record.notaRendimientos || '',
        fecha: parseFecha(dataCruda.fecha || record.fecha || this.embarque.fecha),
      };

      data.clientes = data.clientes.map(cliente => ({
        ...cliente,
        productos: Array.isArray(cliente.productos) ? cliente.productos.map(producto => ({
          ...producto,
          restarTaras: producto.restarTaras || false,
          noSumarKilos: producto.noSumarKilos || false,
        })) : [],
        crudos: Array.isArray(cliente.crudos) ? cliente.crudos : [],
      }));

      return data;
    },

    tieneContenidoOperativo(data) {
      const clientes = Array.isArray(data?.clientes) ? data.clientes : [];
      return clientes.some(cliente => {
        const productos = Array.isArray(cliente?.productos) ? cliente.productos : [];
        const crudos = Array.isArray(cliente?.crudos) ? cliente.crudos : [];
        return productos.length > 0 || crudos.length > 0;
      });
    },

    tieneContenidoOperativoActual() {
      const productos = Array.isArray(this.embarque?.productos) ? this.embarque.productos : [];
      if (productos.length > 0) {
        return true;
      }

      const listasCrudos = this.clienteCrudos && typeof this.clienteCrudos === 'object'
        ? Object.values(this.clienteCrudos)
        : [];

      return listasCrudos.some(lista => Array.isArray(lista) && lista.length > 0);
    },

    async sincronizarRegistroOffline(record) {
      if (!record || !record.id) {
        return;
      }

      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', record.id);
        const docData = record.docData || (record.id === this.embarqueId ? this.prepararDatosEmbarque() : null);
        const payload = this.normalizarDocDataParaFirestore(docData, record);

        const metadataUltimaEdicion = {
          userId: this.authStore.userId,
          username: this.authStore.user?.username || 'Usuario desconocido',
          timestamp: serverTimestamp()
        };

        const snapshot = await getDoc(embarqueRef);
        const dataRemota = snapshot.exists() ? (snapshot.data() || {}) : null;

        if (record.deleted && record.deletedByUser) {
          if (snapshot.exists()) {
            await deleteDoc(embarqueRef);
          }
          await EmbarquesOfflineService.hardDelete(record.id);
          return;
        }

        const dataParaFirestore = {
          ...(dataRemota && this.tieneContenidoOperativo(dataRemota) && !this.tieneContenidoOperativo(payload)
            ? {
                ...payload,
                clientes: Array.isArray(dataRemota.clientes) ? dataRemota.clientes : [],
                kilosCrudos: dataRemota.kilosCrudos || payload.kilosCrudos || {},
                cargaCon: payload.cargaCon || dataRemota.cargaCon || '',
                camionNumero: payload.camionNumero || dataRemota.camionNumero || 1
              }
            : payload),
          ultimaEdicion: metadataUltimaEdicion
        };

        if (snapshot.exists()) {
          await setDoc(embarqueRef, dataParaFirestore, { merge: false });
        } else {
          await setDoc(embarqueRef, dataParaFirestore);
        }

        await EmbarquesOfflineService.markSynced(record.id);

        if (record.id === this.embarqueId) {
          this.guardadoAutomaticoActivo = true;
          this.modoEdicion = true;
        }
      } catch (error) {
        console.error('[sincronizarRegistroOffline] Error al sincronizar embarque offline:', error);
        try {
          await EmbarquesOfflineService.markSyncError(record.id, error.message || error);
        } catch (markError) {
          console.warn('[sincronizarRegistroOffline] No se pudo marcar el error de sincronización:', markError);
        }
      }
    },

    async guardarCambiosEnTiempoReal(forzar = false, opciones = {}) {
      // Opciones adicionales para operaciones de modales
      const {
        desdeModal = false,    // Si viene de un modal, usar immediate: true
        immediate = false,     // Ejecutar inmediatamente sin debounce
        merge = true          // Fusionar con operaciones pendientes
      } = opciones;

      if (!forzar && (!this.guardadoAutomaticoActivo || !this.embarqueId || 
          this.mostrarModalPrecio || this.mostrarModalHilos || 
          this.mostrarModalNota || this.mostrarModalAlt || 
          this.mostrarModalNombreAlternativo || this.mostrarModalNuevoCliente)) {
        // Si viene desde un modal, permitir el guardado aunque el modal esté abierto
        if (!desdeModal) return Promise.resolve();
      }

      // Marcar que hay cambios pendientes
      this.hasPendingChanges = true;

      // Guardar SIEMPRE offline con pendingSync = true
      // Esto asegura que si se recarga la página, se sepa que falta subir
      await this.guardarSnapshotOffline({ pendingSync: true });

      // Eliminada la subida automática a Firebase.
      // Ahora se requiere acción manual del usuario a través de "sincronizarConNube".
      
      console.log('Cambios guardados localmente:', new Date().toLocaleString());
      this.$emit('guardado-automatico');
      return Promise.resolve();
    },

    async guardarEmbarque() {
      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      // Verificar si hay algún modal abierto
      const modalAbierto = this.mostrarModalPrecio || 
                          this.mostrarModalHilos || 
                          this.mostrarModalNota || 
                          this.mostrarModalAlt || 
                          this.mostrarModalNombreAlternativo || 
                          this.mostrarModalNuevoCliente;
                          
      // No continuar si hay un modal abierto
      if (modalAbierto) {
        return;
      }
      
      // En el nuevo modelo Local-First, "guardar" significa asegurar que los datos estén en local.
      // La sincronización es un paso separado explícito.
      try {
        await this.guardarCambiosEnTiempoReal(true); // Forzar guardado local
        this.mostrarMensaje('Embarque guardado localmente. Recuerde subir los cambios para respaldar en la nube.');
      } catch (error) {
        console.error("Error al guardar localmente:", error);
        alert('Error al guardar localmente.');
      }
    },

    prepararDatosEmbarque() {
      
      const embarqueData = {
        fecha: this.embarque.fecha, // Guardar como string YYYY-MM-DD para evitar problemas de zona horaria
        cargaCon: this.embarque.cargaCon,
        camionNumero: this.embarque.camionNumero || 1,
        kilosCrudos: this.embarque.kilosCrudos || {},
        clientes: [],
        clientesJuntarMedidas: this.clientesJuntarMedidas,
        clientesReglaOtilio: this.clientesReglaOtilio,
        clientesIncluirPrecios: this.clientesIncluirPrecios,
        clientesCuentaEnPdf: this.clientesCuentaEnPdf,
        clientesSumarKgCatarro: this.clientesSumarKgCatarro,
        clientesPersonalizados: this.clientesPersonalizados, // Incluir clientes personalizados
        embarqueBloqueado: this.embarqueBloqueado
      };

      const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id.toString(), c]));

      // Si no hay clientes en productosPorCliente, añadir al menos el primero para evitar errores
      if (Object.keys(this.productosPorCliente).length === 0 && this.clientesPredefinidos.length > 0) {
        const primerClienteId = this.clientesPredefinidos[0].id.toString();
        const primerCliente = this.clientesPredefinidos[0];
        const nuevoProducto = crearNuevoProducto(primerClienteId);
        nuevoProducto.nombreCliente = primerCliente.nombre;
        this.embarque.productos.push(nuevoProducto);
        this.clienteActivo = primerClienteId;
        
        // Forzar la actualización de productosPorCliente
        this.$forceUpdate();
      }

      // Asegurar que cada cliente tenga al menos un producto
      const clientesDisponiblesIds = this.clientesDisponibles
        .filter(c => c.id !== 'otro') // Excluir la opción "Otro"
        .map(c => c.id.toString());

      // Verificar cada cliente disponible
      clientesDisponiblesIds.forEach(clienteId => {
        // Verificar si ya existe un producto para este cliente
        const existeProducto = this.embarque.productos.some(p => p.clienteId.toString() === clienteId);
        
        // Solo agregar si no existe
        if (!existeProducto) {
          const clienteInfo = clientesPredefinidosMap.get(clienteId) || 
                              this.clientesDisponibles.find(c => c.id.toString() === clienteId);
          
          if (clienteInfo) {
            const nuevoProducto = crearNuevoProducto(clienteId);
            nuevoProducto.nombreCliente = clienteInfo.nombre;
            
            // Establecer tipo por defecto según el cliente
            this.setTipoDefaultParaCliente(nuevoProducto);
            
            // Agregar al embarque
            this.embarque.productos.push(nuevoProducto);
            console.log(`Se ha creado un producto para el cliente ${nuevoProducto.nombreCliente} que no tenía ninguno.`);
          }
        }
      });

      // Procesar los productos por cliente
      Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
        const clientePredefinido = clientesPredefinidosMap.get(clienteId);
        
        // NO crear crudos automáticamente - solo usar los que ya existen
        let crudosCliente = this.clienteCrudos[clienteId] || [];
        
        const clienteData = {
          id: clienteId,
          nombre: clientePredefinido ? clientePredefinido.nombre : this.obtenerNombreCliente(clienteId),
          productos: productos.map(producto => ({
            ...producto,
            restarTaras: producto.restarTaras || false,
            noSumarKilos: producto.noSumarKilos || false // Agregar esta línea
          })),
          crudos: crudosCliente
        };
        embarqueData.clientes.push(clienteData);
      });

      
      return embarqueData;
    },

    // Métodos auxiliares
    setTipoDefaultParaCliente(producto) {
      const clienteNombre = this.obtenerNombreCliente(producto.clienteId);
      if (clienteNombre === 'Catarro') {
        producto.tipo = 's/h20';
      }
    },

    undo() {
      if (this.undoStack.length > 1) { // Asegura que haya al menos un estado previo
        // Obtener el estado actual y moverlo al redoStack
        const estadoActual = this.undoStack.pop();
        this.redoStack.push(estadoActual);
        // Obtener el estado anterior del undoStack
        const estadoAnterior = this.undoStack[this.undoStack.length - 1];
        this.isUndoRedo = true; // Indicar que se está realizando una operación de Undo
        this.embarque = JSON.parse(estadoAnterior);
        console.log('Undo realizado. Estado actual restaurado.');

        // Llamar al método de guardado automático
        this.guardarCambiosEnTiempoReal();
      } else {
        console.log('No hay más acciones para deshacer.');
      }
    },

    redo() {
      if (this.redoStack.length > 0) {
        // Obtener el último estado del redoStack
        const estadoRehacer = this.redoStack.pop();
        this.undoStack.push(estadoRehacer);
        this.isUndoRedo = true; // Indicar que se está realizando una operación de Redo
        this.embarque = JSON.parse(estadoRehacer);
        console.log('Redo realizado. Estado actual restaurado.');

        // Llamar al método de guardado automático
        this.guardarCambiosEnTiempoReal();
      } else {
        console.log('No hay más acciones para rehacer.');
      }
    },

    actualizarProducto(producto) {
      const index = this.embarque.productos.findIndex(p => p.id === producto.id);
      if (index !== -1) {
        // En lugar de crear una copia profunda completa, actualizamos solo las propiedades necesarias
        // para evitar problemas de duplicación
        Object.keys(producto).forEach(key => {
          if (key !== 'id' && key !== 'clienteId') { // Mantener ID y clienteId intactos
            this.$set(this.embarque.productos[index], key, producto[key]);
          }
        });
        
        // Forzar la actualización del componente
        this.$forceUpdate();
      }
    },

    onTipoChange(producto) {
      if (producto.tipo !== 'otro') {
        producto.tipoPersonalizado = '';
      }
      if (producto.tipo === 'c/h20' && !producto.camaronNeto) {
        producto.camaronNeto = 0.65;
      }

      // Marcar temporalmente como editando para evitar ordenamiento inmediato
      producto.isEditing = true;
      this.$nextTick(() => {
        // Después de un breve retraso, permitir el ordenamiento
        setTimeout(() => {
          if (producto.medida && producto.tipo) {
            producto.isEditing = false;
          }
        }, 100);
      });
    },

    // Métodos para crudo
    agregarCrudo(clienteId) {
      if (!this.clienteCrudos[clienteId]) {
        this.$set(this.clienteCrudos, clienteId, []);
      }
      this.clienteCrudos[clienteId].push({
        items: [crearNuevoCrudoItem()]
      });
      this.guardarCambiosEnTiempoReal();
    },

    agregarCrudoItem(clienteId, index) {
      // Asegurarnos de que la estructura esté correctamente inicializada
      if (!this.clienteCrudos[clienteId]) {
        this.$set(this.clienteCrudos, clienteId, []);
      }
      
      // Si el índice no existe o está fuera de rango, agregamos un nuevo objeto crudo
      if (!this.clienteCrudos[clienteId][index]) {
        this.$set(this.clienteCrudos[clienteId], index, { items: [] });
      }
      
      // Si items no existe, inicializamos como array vacío
      if (!Array.isArray(this.clienteCrudos[clienteId][index].items)) {
        this.$set(this.clienteCrudos[clienteId][index], 'items', []);
      }
      
      // Finalmente agregamos el nuevo item
      this.clienteCrudos[clienteId][index].items.push(crearNuevoCrudoItem());
      this.guardarCambiosEnTiempoReal();
    },

    eliminarCrudoItem(clienteId, crudoIndex, itemIndex) {
      // Validar que todas las propiedades existan
      if (!this.clienteCrudos[clienteId]) {
        console.error('Cliente no encontrado:', clienteId);
        return;
      }
      
      if (!this.clienteCrudos[clienteId][crudoIndex]) {
        console.error('Índice de crudo no válido:', crudoIndex);
        return;
      }
      
      if (!this.clienteCrudos[clienteId][crudoIndex].items) {
        console.error('El objeto crudo no tiene propiedad items');
        return;
      }
      
      this.clienteCrudos[clienteId][crudoIndex].items.splice(itemIndex, 1);
      if (this.clienteCrudos[clienteId][crudoIndex].items.length === 0) {
        this.eliminarCrudo(clienteId, crudoIndex);
      }
      this.guardarCambiosEnTiempoReal();
    },

    eliminarCrudo(index, clienteId) {
      // Validar que exista el cliente
      if (!this.clienteCrudos[clienteId]) {
        console.error('Cliente no encontrado:', clienteId);
        return;
      }
      
      this.clienteCrudos[clienteId].splice(index, 1);
      if (this.clienteCrudos[clienteId].length === 0) {
        this.$delete(this.clienteCrudos, clienteId);
      }
      this.guardarCambiosEnTiempoReal();
    },

    toggleSobrante(clienteId, crudoIndex, itemIndex) {
      // Validar que todas las propiedades existan
      if (!this.clienteCrudos[clienteId]) {
        console.error('Cliente no encontrado:', clienteId);
        return;
      }
      
      if (!this.clienteCrudos[clienteId][crudoIndex]) {
        console.error('Índice de crudo no válido:', crudoIndex);
        return;
      }
      
      if (!this.clienteCrudos[clienteId][crudoIndex].items) {
        // Si no existe items, inicializarlo como array vacío
        this.$set(this.clienteCrudos[clienteId][crudoIndex], 'items', []);
        console.error('El objeto crudo no tiene propiedad items');
        return;
      }
      
      if (!this.clienteCrudos[clienteId][crudoIndex].items[itemIndex]) {
        console.error('Índice de item no válido:', itemIndex);
        return;
      }
      
      const item = this.clienteCrudos[clienteId][crudoIndex].items[itemIndex];
      if (!item.hasOwnProperty('mostrarSobrante')) {
        this.$set(item, 'mostrarSobrante', true);
      } else {
        item.mostrarSobrante = !item.mostrarSobrante;
      }
      this.guardarCambiosEnTiempoReal();
    },

    actualizarTotalCrudos(clienteId, index) {
      // Forzar la actualización del componente
      this.$forceUpdate();
      this.guardarCambiosEnTiempoReal();
    },

    actualizarCrudos() {
      this.guardarCambiosEnTiempoReal();
    },

    onRestarTarasChange(producto) {
      console.log('Restar taras cambiado:', producto.restarTaras);
      this.$nextTick(() => {
        this.actualizarProducto(producto);
      });
    },

    handleJuntarMedidasChange(clienteId, checked) {
      // Actualizar el estado local
      this.$set(this.clientesJuntarMedidas, clienteId, checked);

      // Guardar inmediatamente si estamos en modo edición
      if (this.modoEdicion && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },

    handleReglaOtilioChange(clienteId, checked) {
      // Actualizar el estado local
      this.$set(this.clientesReglaOtilio, clienteId, checked);

      // Guardar inmediatamente si estamos en modo edición
      if (this.modoEdicion && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },

    handleIncluirPreciosChange(clienteId, checked) {
      // Actualizar el estado local
      this.$set(this.clientesIncluirPrecios, clienteId, checked);

      // Si se desactiva incluir precios, también desactivar cuenta en PDF
      if (!checked && this.clientesCuentaEnPdf[clienteId]) {
        this.$set(this.clientesCuentaEnPdf, clienteId, false);
      }

      // Guardar inmediatamente si estamos en modo edición
      if (this.modoEdicion && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },

    handleCuentaEnPdfChange(clienteId, checked) {
      // Actualizar el estado local
      this.$set(this.clientesCuentaEnPdf, clienteId, checked);

      // Guardar inmediatamente si estamos en modo edición
      if (this.modoEdicion && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },

    handleSumarKgCatarroChange(clienteId, checked) {
      console.log('[DEBUG] Handle Sumar Kg Catarro Change:', {
        clienteId,
        checked,
        estadoAnterior: this.clientesSumarKgCatarro[clienteId],
        estadoCompleto: { ...this.clientesSumarKgCatarro }
      });
      
      // Actualizar el estado local
      this.$set(this.clientesSumarKgCatarro, clienteId, checked);

      console.log('[DEBUG] Estado después del cambio:', {
        nuevoEstado: this.clientesSumarKgCatarro[clienteId],
        estadoCompleto: { ...this.clientesSumarKgCatarro }
      });

      // Guardar inmediatamente si estamos en modo edición
      if (this.modoEdicion && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },

    // Métodos para modales
    // Modal Nuevo Cliente
    async agregarNuevoCliente(cliente) {
      if (!cliente || !cliente.nombre) return;

      const nombreNormalizado = String(cliente.nombre).trim();
      if (!nombreNormalizado) return;

      // Evitar duplicados por nombre (case-insensitive) dentro del embarque actual
      const nombresExistentes = new Set([...this.clientesPredefinidos, ...this.clientesPersonalizados]
        .map(c => String(c.nombre).toLowerCase()))
      let nombreFinal = nombreNormalizado;
      if (nombresExistentes.has(nombreFinal.toLowerCase())) {
        // Si ya existe, generar un nombre único amigable: "Nombre (2)", "Nombre (3)", ...
        let contador = 2;
        while (nombresExistentes.has(`${nombreNormalizado} (${contador})`.toLowerCase())) {
          contador++;
        }
        nombreFinal = `${nombreNormalizado} (${contador})`;
      }

      // Crear ID único para el cliente (UUID) para ser único en el día
      const nuevoCliente = {
        id: uuidv4(),
        nombre: nombreFinal,
        color: cliente.color || this.nuevoClienteColor,
        editable: true,
        personalizado: true,
        key: `personalizado_${Date.now()}`
      };

      // Registrar en lista de personalizados del día
      this.clientesPersonalizados.push(nuevoCliente);

      // Usar el flujo estándar para agregar productos (preserva locales y evita que onSnapshot los borre)
      this.agregarProducto(nuevoCliente.id);
      // Asegurar nombre visible en el bloque recién creado
      const ultimo = this.embarque.productos[this.embarque.productos.length - 1];
      if (ultimo && ultimo.clienteId === nuevoCliente.id) {
        this.$set(ultimo, 'nombreCliente', nombreFinal);
      }

      // Inicializar contenedor de crudos del cliente
      if (!this.clienteCrudos[nuevoCliente.id]) {
        this.$set(this.clienteCrudos, nuevoCliente.id, []);
      }

      // Reglas por nombre
      const esOtilio = nombreFinal.toLowerCase().includes('otilio');
      this.$set(this.clientesReglaOtilio, nuevoCliente.id, esOtilio);

      // Persistir cambios mínimos (clientes personalizados) sin bloquear
      // Solo guardar en localStorage para evitar conflictos con el guardado principal
      localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));

      // Guardado general (productos/clientes)
      this.guardarCambiosEnTiempoReal();
      this.mostrarModalNuevoCliente = false;
      this.seleccionarCliente(nuevoCliente.id);
    },

    // Modal de Nombre Alternativo
    abrirModalNombreAlternativo(producto) {
      this.productoSeleccionado = producto;
      this.productoNombreAlternativoEnEdicionId = producto?.id || null;
      if (this.productoNombreAlternativoEnEdicionId) {
        this.marcarCampoEnEdicion(this.productoNombreAlternativoEnEdicionId, 'nombreAlternativoPDF');
      }
      this.mostrarModalNombreAlternativo = true;
    },

    cerrarModalNombreAlternativo() {
      if (this.productoNombreAlternativoEnEdicionId) {
        this.desmarcarCampoEnEdicion(this.productoNombreAlternativoEnEdicionId, 'nombreAlternativoPDF');
        this.nombreAlternativoPendienteSync.delete(this.productoNombreAlternativoEnEdicionId);
        this.productoNombreAlternativoEnEdicionId = null;
      }
      this.mostrarModalNombreAlternativo = false;
      this.productoSeleccionado = null;
    },

    async guardarNombreAlternativo(nuevoNombre) {
      const productoActual = this.productoSeleccionado;
      if (!productoActual) {
        this.cerrarModalNombreAlternativo();
        return;
      }

      const clienteId = productoActual.clienteId;
      const nombreAnterior = Object.prototype.hasOwnProperty.call(productoActual, 'nombreAlternativoPDF')
        ? productoActual.nombreAlternativoPDF
        : productoActual.medida;

      

      if (nuevoNombre) {
        this.$set(productoActual, 'nombreAlternativoPDF', nuevoNombre);
      } else {
        this.$delete(productoActual, 'nombreAlternativoPDF');
      }

      this.nombreAlternativoPendienteSync.set(productoActual.id, nuevoNombre || null);

      if (clienteId) {
        this.$set(this.clientesModificados, clienteId, true);
      }

      this.$forceUpdate();

      this.mostrarModalNombreAlternativo = false;

      try {
        await this.$nextTick();
        await this.guardarCambiosEnTiempoReal(true);
      } finally {
        if (this.productoNombreAlternativoEnEdicionId) {
          this.desmarcarCampoEnEdicion(this.productoNombreAlternativoEnEdicionId, 'nombreAlternativoPDF');
          this.productoNombreAlternativoEnEdicionId = null;
        }
        this.productoSeleccionado = null;
      }
    },

    // Modal de Precio
    abrirModalPrecio(item) {
      this.itemSeleccionado = item;
      this.mostrarModalPrecio = true;
    },

    cerrarModalPrecio() {
      this.mostrarModalPrecio = false;
      this.itemSeleccionado = null;
    },

    async guardarPrecio(precio) {
      if (this.itemSeleccionado) {
        // Activar indicador de guardando
        this.guardandoModal = true;
        
        try {
          // Guardar referencia al clienteId antes de cerrar el modal
          const clienteId = this.itemSeleccionado.clienteId;
          const nombreClienteModal = (
            this.obtenerNombreCliente(clienteId) ||
            this.itemSeleccionado.nombreCliente ||
            ''
          ).toString().trim().toLowerCase();

          // Regla especial: Ozuna en maquila (Venta desmarcado) debe conservar el precio editado.
          // Guardamos el valor en `precioMaquila` para que sea persistente y no se re-escriba a 21 al reabrir.
          const esOzunaMaquila = nombreClienteModal === 'ozuna' && !this.itemSeleccionado.esVenta;
          
          if (precio !== null) {
            this.$set(this.itemSeleccionado, 'precio', precio);
            // El usuario asignó un precio manualmente, permitir futuras asignaciones automáticas
            this.$set(this.itemSeleccionado, 'precioBorradoManualmente', false);

            if (esOzunaMaquila) {
              this.$set(this.itemSeleccionado, 'precioMaquila', precio);
            }
          } else {
            if (esOzunaMaquila) {
              // Para Ozuna en maquila, "borrar" = volver al default (21)
              this.$delete(this.itemSeleccionado, 'precioMaquila');
              this.$set(this.itemSeleccionado, 'precio', 21);
              this.$set(this.itemSeleccionado, 'precioBorradoManualmente', false);
            } else {
              this.$delete(this.itemSeleccionado, 'precio');
              // El usuario borró el precio manualmente, marcar para evitar asignaciones automáticas
              this.$set(this.itemSeleccionado, 'precioBorradoManualmente', true);
            }
          }
          
          // Marcar el cliente como modificado para que se incluya en el guardado
          if (clienteId) {
            this.$set(this.clientesModificados, clienteId, true);
            console.log(`[guardarPrecio] Cliente ${clienteId} marcado como modificado por cambio en precio`);
          } else {
            console.warn('[guardarPrecio] Item seleccionado no tiene clienteId:', this.itemSeleccionado);
          }

          // Forzar actualización de la vista
          this.$forceUpdate();
          
          // Esperar a que se complete el guardado ANTES de cerrar el modal
          await this.$nextTick();
          await this.guardarCambiosEnTiempoReal(true, { 
            desdeModal: true,
            immediate: true,
            merge: false
          });
          
          console.log('[guardarPrecio] Guardado completado exitosamente');
          
          // Solo cerrar el modal después de guardado exitoso
          this.cerrarModalPrecio();
        } catch (error) {
          console.error('[guardarPrecio] Error al guardar:', error);
          alert('Error al guardar el precio. Por favor, inténtelo de nuevo.');
        } finally {
          // Desactivar indicador de guardando
          this.guardandoModal = false;
        }
      } else {
        this.cerrarModalPrecio();
      }
    },

    // Modal de Hilos
    abrirModalHilos(item) {
      this.itemSeleccionado = item;
      this.mostrarModalHilos = true;
    },

    cerrarModalHilos() {
      this.mostrarModalHilos = false;
      this.itemSeleccionado = null;
    },

    async guardarHilos(hilos) {
      if (this.itemSeleccionado) {
        // Activar indicador de guardando
        this.guardandoModal = true;
        
        try {
          // Guardar referencia al clienteId antes de cerrar el modal
          const clienteId = this.itemSeleccionado.clienteId;
          
          // Si hilos está vacío, eliminamos la propiedad hilos del item
          if (!hilos) {
            this.$delete(this.itemSeleccionado, 'hilos');
          } else {
            this.$set(this.itemSeleccionado, 'hilos', hilos);
          }

          // Marcar el cliente como modificado para que se incluya en el guardado
          if (clienteId) {
            this.$set(this.clientesModificados, clienteId, true);
            console.log(`[guardarHilos] Cliente ${clienteId} marcado como modificado por cambio en hilos`);
          } else {
            console.warn('[guardarHilos] Item seleccionado no tiene clienteId:', this.itemSeleccionado);
          }

          // Forzar actualización de la vista
          this.$forceUpdate();
          
          // Esperar a que se complete el guardado ANTES de cerrar el modal
          await this.$nextTick();
          await this.guardarCambiosEnTiempoReal(true, { 
            desdeModal: true,
            immediate: true,
            merge: false
          });
          
          console.log('[guardarHilos] Guardado completado exitosamente');
          
          // Solo cerrar el modal después de guardado exitoso
          this.cerrarModalHilos();
        } catch (error) {
          console.error('[guardarHilos] Error al guardar:', error);
          alert('Error al guardar los hilos. Por favor, inténtelo de nuevo.');
        } finally {
          // Desactivar indicador de guardando
          this.guardandoModal = false;
        }
      } else {
        this.cerrarModalHilos();
      }
    },

    // Modal de Nota
    abrirModalNota(item) {
      this.itemSeleccionado = item;
      this.mostrarModalNota = true;
    },

    cerrarModalNota() {
      this.mostrarModalNota = false;
      this.itemSeleccionado = null;
    },

    async guardarNota(nota) {
      if (this.itemSeleccionado) {
        // Activar indicador de guardando
        this.guardandoModal = true;
        
        try {
          // Guardar referencia al clienteId antes de cerrar el modal
          const clienteId = this.itemSeleccionado.clienteId;
          
          if (nota) {
            this.$set(this.itemSeleccionado, 'nota', nota);
          } else {
            this.$delete(this.itemSeleccionado, 'nota');
          }

          // Marcar el cliente como modificado para que se incluya en el guardado
          if (clienteId) {
            this.$set(this.clientesModificados, clienteId, true);
            console.log(`[guardarNota] Cliente ${clienteId} marcado como modificado por cambio en nota`);
          } else {
            console.warn('[guardarNota] Item seleccionado no tiene clienteId:', this.itemSeleccionado);
          }

          // Forzar actualización de la vista
          this.$forceUpdate();
          
          // Esperar a que se complete el guardado ANTES de cerrar el modal
          await this.$nextTick();
          await this.guardarCambiosEnTiempoReal(true, { 
            desdeModal: true,
            immediate: true,
            merge: false
          });
          
          console.log('[guardarNota] Guardado completado exitosamente');
          
          // Solo cerrar el modal después de guardado exitoso
          this.cerrarModalNota();
        } catch (error) {
          console.error('[guardarNota] Error al guardar:', error);
          alert('Error al guardar la nota. Por favor, inténtelo de nuevo.');
        } finally {
          // Desactivar indicador de guardando
          this.guardandoModal = false;
        }
      } else {
        this.cerrarModalNota();
      }
    },

    // Modal Alt
    abrirModalAlt(item) {
      this.itemSeleccionado = item;
      this.mostrarModalAlt = true;
    },

    cerrarModalAlt() {
      this.mostrarModalAlt = false;
      this.itemSeleccionado = null;
    },

    async guardarAlt(alt) {
      if (this.itemSeleccionado) {
        // Activar indicador de guardando
        this.guardandoModal = true;
        
        try {
          // Guardar referencia al clienteId antes de cerrar el modal
          const clienteId = this.itemSeleccionado.clienteId;
          
          if (alt) {
            this.$set(this.itemSeleccionado, 'textoAlternativo', alt);
          } else {
            this.$delete(this.itemSeleccionado, 'textoAlternativo');
          }

          // Marcar el cliente como modificado para que se incluya en el guardado
          if (clienteId) {
            this.$set(this.clientesModificados, clienteId, true);
            console.log(`[guardarAlt] Cliente ${clienteId} marcado como modificado por cambio en texto alternativo`);
          } else {
            console.warn('[guardarAlt] Item seleccionado no tiene clienteId:', this.itemSeleccionado);
          }

          // Forzar actualización de la vista
          this.$forceUpdate();
          
          // Esperar a que se complete el guardado ANTES de cerrar el modal
          await this.$nextTick();
          await this.guardarCambiosEnTiempoReal(true, { 
            desdeModal: true,
            immediate: true,
            merge: false
          });
          
          console.log('[guardarAlt] Guardado completado exitosamente');
          
          // Solo cerrar el modal después de guardado exitoso
          this.cerrarModalAlt();
        } catch (error) {
          console.error('[guardarAlt] Error al guardar:', error);
          alert('Error al guardar el texto alternativo. Por favor, inténtelo de nuevo.');
        } finally {
          // Desactivar indicador de guardando
          this.guardandoModal = false;
        }
      } else {
        this.cerrarModalAlt();
      }
    },

    async cargarEmbarquesModalPdf(preselectedClientId = null) {
      if (!this.modalGenerarPdf.fecha) {
        this.modalGenerarPdf.error = 'Selecciona una fecha para buscar embarques.';
        return;
      }

      this.modalGenerarPdf.cargando = true;
      this.modalGenerarPdf.error = '';

      try {
        const embarques = await this.buscarEmbarquesPorFecha(this.modalGenerarPdf.fecha);
        this.modalGenerarPdf.embarques = embarques;

        if (embarques.length > 0) {
          this.modalGenerarPdf.embarqueId = embarques[0].id;
          this.actualizarClientesModal(preselectedClientId);
        } else {
          this.modalGenerarPdf.embarqueId = '';
          this.modalGenerarPdf.clientes = [];
          this.modalGenerarPdf.clienteId = '';
          this.modalGenerarPdf.error = 'No se encontraron embarques para esa fecha.';
        }
      } catch (error) {
        console.error('[Modal PDF] Error al cargar embarques:', error);
        this.modalGenerarPdf.error = 'No se pudieron cargar los embarques. Intenta de nuevo.';
      } finally {
        this.modalGenerarPdf.cargando = false;
      }
    },

    async buscarEmbarquesPorFecha(fecha) {
      const fechaISO = normalizarFechaISO(fecha);
      const coincidencias = new Map();

      try {
        await EmbarquesOfflineService.init();
        const registrosOffline = await EmbarquesOfflineService.getAll();
        registrosOffline.forEach(registro => {
          if (normalizarFechaISO(registro.fecha) === fechaISO) {
            coincidencias.set(registro.id, this.normalizarEmbarqueParaModal(registro));
          }
        });
      } catch (error) {
        console.warn('[Modal PDF] No se pudo leer embarques offline:', error);
      }

      if (coincidencias.size === 0) {
        try {
          const db = getFirestore();
          const embarquesRef = collection(db, 'embarques');
          const snapshot = await getDocs(embarquesRef);
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const fechaDoc = data.fecha && typeof data.fecha.toDate === 'function'
              ? data.fecha.toDate()
              : data.fecha;

            if (normalizarFechaISO(fechaDoc) === fechaISO) {
              coincidencias.set(docSnap.id, this.normalizarEmbarqueParaModal({ id: docSnap.id, ...data }));
            }
          });
        } catch (error) {
          console.error('[Modal PDF] Error al consultar embarques remotos:', error);
          throw error;
        }
      }

      return Array.from(coincidencias.values())
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    },

    normalizarEmbarqueParaModal(registro) {
      const fechaFuente = registro.fecha && registro.fecha.seconds
        ? new Date(registro.fecha.seconds * 1000)
        : registro.fecha || registro.fechaISO;

      return {
        id: registro.id,
        fecha: normalizarFechaISO(fechaFuente),
        cargaCon: registro.cargaCon || registro.docData?.cargaCon || '',
        camionNumero: registro.camionNumero || registro.docData?.camionNumero || 1,
        clientes: registro.clientes || registro.docData?.clientes || [],
        clientesJuntarMedidas: registro.clientesJuntarMedidas || registro.docData?.clientesJuntarMedidas || {},
        clientesReglaOtilio: registro.clientesReglaOtilio || registro.docData?.clientesReglaOtilio || {},
        clientesIncluirPrecios: registro.clientesIncluirPrecios || registro.docData?.clientesIncluirPrecios || {},
        clientesSumarKgCatarro: registro.clientesSumarKgCatarro || registro.docData?.clientesSumarKgCatarro || {},
        clientesCuentaEnPdf: registro.clientesCuentaEnPdf || registro.docData?.clientesCuentaEnPdf || {},
        productos: registro.productos || registro.docData?.productos || [],
        clienteCrudos: registro.clienteCrudos || registro.crudos || registro.docData?.clienteCrudos || {},
        kilosCrudos: registro.kilosCrudos || registro.docData?.kilosCrudos || {},
      };
    },

    actualizarClientesModal(preselectedClientId = null) {
      const embarqueSeleccionado = this.modalGenerarPdf.embarques.find(
        e => e.id === this.modalGenerarPdf.embarqueId
      );

      if (!embarqueSeleccionado) {
        this.modalGenerarPdf.clientes = [];
        this.modalGenerarPdf.clienteId = '';
        return;
      }

      let clientes = [];

      if (Array.isArray(embarqueSeleccionado.clientes) && embarqueSeleccionado.clientes.length) {
        clientes = embarqueSeleccionado.clientes
          .map(cliente => ({
            id: cliente.id?.toString(),
            nombre: cliente.nombre || cliente.nombreNotas || this.obtenerNombreCliente(cliente.id)
          }))
          .filter(c => c.id);
      } else if (Array.isArray(embarqueSeleccionado.productos)) {
        const mapa = new Map();
        embarqueSeleccionado.productos.forEach(producto => {
          const id = (producto.clienteId || producto.cliente || producto.idCliente || '').toString();
          if (!id || mapa.has(id)) return;
          mapa.set(id, {
            id,
            nombre: producto.nombreCliente || this.obtenerNombreCliente(id)
          });
        });
        clientes = Array.from(mapa.values());
      }

      this.modalGenerarPdf.clientes = clientes;

      if (clientes.length > 0) {
        const candidato = preselectedClientId && clientes.some(c => c.id === preselectedClientId.toString())
          ? preselectedClientId.toString()
          : clientes[0].id;
        this.modalGenerarPdf.clienteId = candidato;
      } else {
        this.modalGenerarPdf.clienteId = '';
      }
    },

    onCambioFechaModalPdf(fecha) {
      this.modalGenerarPdf.fecha = fecha;
      this.cargarEmbarquesModalPdf(this.modalGenerarPdf.clienteId || null);
    },

    onSeleccionEmbarqueModal(embarqueId) {
      this.modalGenerarPdf.embarqueId = embarqueId;
      this.actualizarClientesModal(this.modalGenerarPdf.clienteId || null);
    },

    cerrarModalGenerarPdfCliente() {
      this.mostrarModalGenerarPdfCliente = false;
      this.modalGenerarPdf = {
        fecha: '',
        embarques: [],
        embarqueId: '',
        clienteId: '',
        clientes: [],
        cargando: false,
        error: ''
      };
    },

    async generarPdfDesdeModal() {
      if (!this.modalGenerarPdf.embarqueId || !this.modalGenerarPdf.clienteId) {
        this.modalGenerarPdf.error = 'Selecciona un embarque y un cliente para continuar.';
        return;
      }

      const clienteId = this.modalGenerarPdf.clienteId.toString();
      const embarqueSeleccionado = this.modalGenerarPdf.embarques.find(
        e => e.id === this.modalGenerarPdf.embarqueId
      );

      if (!embarqueSeleccionado) {
        this.modalGenerarPdf.error = 'No se encontró el embarque seleccionado.';
        return;
      }

      const clienteGuardado = Array.isArray(embarqueSeleccionado.clientes)
        ? embarqueSeleccionado.clientes.find(c => c.id?.toString() === clienteId)
        : null;

      const productosCliente = clienteGuardado?.productos
        || (embarqueSeleccionado.productos || []).filter(
          producto => (producto.clienteId || '').toString() === clienteId
        );

      if (!productosCliente || productosCliente.length === 0) {
        this.modalGenerarPdf.error = 'El embarque seleccionado no tiene productos para ese cliente.';
        return;
      }

      const crudosCliente = clienteGuardado?.crudos
        || embarqueSeleccionado.clienteCrudos?.[clienteId]
        || embarqueSeleccionado.crudos?.[clienteId]
        || [];

      const embarqueCliente = {
        fecha: embarqueSeleccionado.fecha,
        cargaCon: embarqueSeleccionado.cargaCon,
        productos: productosCliente,
        clienteCrudos: { [clienteId]: crudosCliente },
        kilosCrudos: embarqueSeleccionado.kilosCrudos || {}
      };

      const clientesLista = (Array.isArray(embarqueSeleccionado.clientes) && embarqueSeleccionado.clientes.length)
        ? embarqueSeleccionado.clientes.map(c => ({
            id: c.id,
            nombre: c.nombre || c.nombreNotas || this.obtenerNombreCliente(c.id),
            nombreNotas: c.nombreNotas
          }))
        : this.clientesDisponibles;

      this.isGeneratingPdf = true;
      this.pdfType = `cliente-${clienteId}-historico`;
      this.modalGenerarPdf.error = '';

      try {
        await generarNotaVentaPDF(
          embarqueCliente,
          clientesLista,
          embarqueSeleccionado.clientesJuntarMedidas || {},
          embarqueSeleccionado.clientesReglaOtilio || {},
          embarqueSeleccionado.clientesIncluirPrecios || {},
          embarqueSeleccionado.clientesSumarKgCatarro || {},
          embarqueSeleccionado.clientesCuentaEnPdf || {}
        );
        this.cerrarModalGenerarPdfCliente();
      } catch (error) {
        console.error('[Modal PDF] Error al generar PDF:', error);
        this.modalGenerarPdf.error = 'No se pudo generar el PDF. Inténtalo de nuevo.';
      } finally {
        this.isGeneratingPdf = false;
        this.pdfType = null;
      }
    },
    abrirModalNotasMultiple() {
      const clientes = this.clientesConMedidasRegistradas;
      this.modalNotasMultiple = {
        seleccionados: clientes.map((cliente) => cliente.id),
        opciones: {}
      };

      clientes.forEach((cliente) => {
        const incluirPrecios = this.clientesIncluirPrecios?.[cliente.id] ?? false;
        const cuentaEnPdf = this.clientesCuentaEnPdf?.[cliente.id] ?? false;
        this.$set(this.modalNotasMultiple.opciones, cliente.id, {
          incluirPrecios: !!incluirPrecios,
          cuentaEnPdf: !!(incluirPrecios && cuentaEnPdf),
        });
      });

      this.mostrarModalNotasMultiple = true;
    },

    cerrarModalNotasMultiple() {
      this.mostrarModalNotasMultiple = false;
    },

    actualizarSeleccionNotasMultiple(seleccion) {
      this.modalNotasMultiple.seleccionados = Array.isArray(seleccion) ? seleccion : [];
    },

    actualizarOpcionesNotasMultiple(opciones) {
      this.modalNotasMultiple.opciones = opciones || {};
    },

    async generarNotasPdfMultiples() {
      const seleccionados = (this.modalNotasMultiple.seleccionados || []).filter((id) =>
        this.clientesConMedidasRegistradas.some(
          (cliente) => cliente.id.toString() === id.toString()
        )
      );

      if (!seleccionados.length) {
        alert('Selecciona al menos un cliente con medidas para generar las notas.');
        return;
      }

      this.isGeneratingPdf = true;
      this.pdfType = 'multi-notas';

      try {
        for (const clienteId of seleccionados) {
          const opciones = this.modalNotasMultiple.opciones?.[clienteId] || {};
          const incluirPrecios = !!opciones.incluirPrecios;
          const cuentaEnPdf = incluirPrecios ? !!opciones.cuentaEnPdf : false;

          this.$set(this.clientesIncluirPrecios, clienteId, incluirPrecios);
          this.$set(this.clientesCuentaEnPdf, clienteId, cuentaEnPdf);

          await this.generarPDFCliente(clienteId);
        }

        this.cerrarModalNotasMultiple();
      } catch (error) {
        console.error('[Notas PDF múltiples] Error:', error);
        alert('No se pudieron generar todas las notas PDF. Intenta nuevamente.');
      } finally {
        this.isGeneratingPdf = false;
        this.pdfType = null;
      }
    },

    // Métodos para configuración de medidas
    abrirModalConfiguracionMedidas() {
      this.mostrarModalConfiguracionMedidas = true;
    },

    cerrarModalConfiguracionMedidas() {
      this.mostrarModalConfiguracionMedidas = false;
    },

    guardarConfiguracionMedidas(medidas) {
      this.medidasConfiguracion = medidas;
      this.guardarMedidasConfiguracion();
      this.cerrarModalConfiguracionMedidas();
    },

    // Métodos para modal de pedido del cliente
    abrirModalPedidoCliente(clienteId) {
      const nombreCliente = this.obtenerNombreCliente(clienteId);
      this.clienteSeleccionadoPedido = nombreCliente;
      this.mostrarModalPedidoCliente = true;
    },

    cerrarModalPedidoCliente() {
      this.mostrarModalPedidoCliente = false;
      this.clienteSeleccionadoPedido = null;
    },

    cargarMedidasConfiguracion() {
      const medidasGuardadas = localStorage.getItem('medidasConfiguracion');
      if (medidasGuardadas) {
        try {
          this.medidasConfiguracion = JSON.parse(medidasGuardadas);
        } catch (error) {
          console.error('Error al cargar medidas de configuración:', error);
          this.medidasConfiguracion = [];
        }
      } else {
        // Medidas por defecto si no hay configuración guardada
        this.medidasConfiguracion = [
          '16/20', '21/25', '26/30', '31/35', '36/40', '41/50', '51/60', '61/70', '71/90', '91/110',
          'U-10', 'U-12', 'U-15', 'U-20', 'U-24', 'U-30',
          'Colita', 'Entero'
        ];
      }
    },

    guardarMedidasConfiguracion() {
      localStorage.setItem('medidasConfiguracion', JSON.stringify(this.medidasConfiguracion));
    },

    // Métodos de manipulación de clientes
    seleccionarCliente(clienteId) {
      // Verificar si hay algún modal abierto
      const modalAbierto = this.mostrarModalPrecio || 
                          this.mostrarModalHilos || 
                          this.mostrarModalNota || 
                          this.mostrarModalAlt || 
                          this.mostrarModalNombreAlternativo || 
                          this.mostrarModalNuevoCliente;
                          
      // No continuar si hay un modal abierto
      if (modalAbierto) {
        return;
      }
      
      // Verificar si ya existe el embarque, si no, crear uno
      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      // Verificar si el cliente ya existe en el embarque
      const clienteExiste = this.embarque.productos.some(p => p.clienteId.toString() === clienteId.toString());

      if (!clienteExiste) {
        // Si el cliente no existe, lo agregamos
        this.guardarEmbarqueInicial(clienteId).then(() => {
          // Establecer el cliente activo
          this.clienteActivo = clienteId;
        });
      } else {
        // Si el cliente ya existe, simplemente lo establecemos como activo
        this.clienteActivo = clienteId;
      }
    },

    scrollToCliente(clienteId) {
      // Buscar el elemento del cliente y hacer scroll hasta él
      this.$nextTick(() => {
        const clienteHeader = document.querySelector(`.cliente-header[data-cliente="${this.obtenerNombreCliente(clienteId)}"]`);
        if (clienteHeader) {
          // Eliminar la clase de resaltado de todos los headers de cliente
          document.querySelectorAll('.cliente-header').forEach(header => {
            header.classList.remove('cliente-seleccionado');
          });

          // Agregar la clase de resaltado al cliente seleccionado
          clienteHeader.classList.add('cliente-seleccionado');

          // Hacer scroll al cliente
          clienteHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // Quitar la clase después de 2 segundos
          setTimeout(() => {
            clienteHeader.classList.remove('cliente-seleccionado');
          }, 2000);
        }
      });
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },

    toggleBloqueo() {
      this.embarqueBloqueado = !this.embarqueBloqueado;

      // Guardar el estado en Firebase si estamos en modo edición
      if (this.modoEdicion && this.embarqueId) {
        const db = getFirestore();
        updateDoc(doc(db, "embarques", this.embarqueId), {
          embarqueBloqueado: this.embarqueBloqueado
        }).catch(error => {
          console.error("Error al guardar estado de bloqueo:", error);
        });
      }
    },

    // Métodos para medidas y sugerencias
    actualizarMedidasUsadas() {
      // Obtener todas las medidas únicas usadas en el embarque
      this.medidasUsadas = [...new Set(this.embarque.productos
        .filter(p => p.medida && p.medida.trim() !== '')
        .map(p => p.medida.trim()))];
    },

    // Método para validar y reparar IDs duplicados
    validarYRepararIDsProductos() {
      console.log("Validando IDs de productos en busca de duplicados...");
      const idsEncontrados = new Map();
      let idsCorregidos = 0;

      this.embarque.productos.forEach(producto => {
        if (idsEncontrados.has(producto.id)) {
          console.warn(`ID duplicado encontrado: ${producto.id} - Medida: ${producto.medida} - Cliente: ${this.obtenerNombreCliente(producto.clienteId)}`);
          console.warn(`Conflicto con producto existente:`, 
                      `Medida: ${idsEncontrados.get(producto.id).medida}`, 
                      `Cliente: ${this.obtenerNombreCliente(idsEncontrados.get(producto.id).clienteId)}`);
          
          // Generar un nuevo ID para este producto usando uuid
          const nuevoId = uuidv4();
          console.log(`Corrigiendo ID duplicado: ${producto.id} -> ${nuevoId} para producto ${producto.medida}`);
          
          // Asignar el nuevo ID
          producto.id = nuevoId;
          idsCorregidos++;
          
          // Agregar el nuevo ID al mapa
          idsEncontrados.set(nuevoId, producto);
        } else {
          // Registrar el ID para detectar duplicados futuros
          idsEncontrados.set(producto.id, producto);
        }
      });

      if (idsCorregidos > 0) {
        console.log(`Se corrigieron ${idsCorregidos} productos con IDs duplicados.`);
        this.guardarCambiosEnTiempoReal();
      } else {
        console.log("No se encontraron IDs duplicados en los productos.");
      }
      
      return idsCorregidos;
    },

    onMedidaInput(producto, event) {
      // Eliminar la función trim() para permitir espacios
      const valor = event.target.value.toLowerCase();
      this.productoEditandoId = producto.id;

      // Actualizar la medida sin eliminar espacios
      producto.medida = event.target.value;

      if (valor) {
        this.sugerenciasMedidas = this.medidasUsadas.filter(m =>
          m.toLowerCase().includes(valor) &&
          m.toLowerCase() !== valor
        );
      } else {
        this.sugerenciasMedidas = [];
      }
      producto.isEditing = true;

      // NO llamar a actualizarProducto aquí para evitar loops
      // La reactividad de Vue se encargará de la actualización
    },

    onMedidaBlur(producto) {
      // Dar un pequeño delay antes de ocultar las sugerencias para permitir clicks
      setTimeout(() => {
        this.productoEditandoId = null;
      }, 200);

      // Quitar la marca de edición si tiene medida válida (tipo opcional)
      if (producto.medida && producto.medida.length > 0) {
        producto.isEditing = false;
        producto.isNew = false;
      }
      
      // Actualizar medidas usadas cuando se termine de editar
      this.actualizarMedidasUsadas();
    },

    seleccionarMedida(producto, medida) {
      producto.medida = medida;
      this.productoEditandoId = null;
      // NO llamar a actualizarProducto aquí para evitar loops
      // La reactividad de Vue se encargará de la actualización
    },

    onTallaCrudoChange(item) {
      // Asegurarse de que el item tenga todas las propiedades necesarias
      if (!item.medida) {
        item.medida = item.talla;
      }
      this.guardarCambiosEnTiempoReal();
    },

    // Métodos para la persistencia de clientes
    async guardarClientesPersonalizados() {
      // Guardar en localStorage para respaldo local
      localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
      
      // Si hay un embarqueId, también guardar en Firebase inmediatamente
      // (incluir el caso cuando la lista está vacía para persistir la eliminación)
      if (this.embarqueId) {
        try {
          console.log('[guardarClientesPersonalizados] Guardando clientes personalizados en Firebase:', this.clientesPersonalizados);
          
          // Crear una operación de guardado específica para clientes personalizados
          const operacionGuardadoClientes = async () => {
            const db = getFirestore();
            const embarqueRef = doc(db, 'embarques', this.embarqueId);
            
            await updateDoc(embarqueRef, {
              clientesPersonalizados: this.clientesPersonalizados,
              ultimaActualizacionClientes: serverTimestamp()
            });
            
            console.log('[guardarClientesPersonalizados] Clientes personalizados guardados exitosamente en Firebase');
          };
          
          // Usar el SaveManager para guardar con alta prioridad
          if (this.saveManager) {
            await this.saveManager.scheduleSave(
              `clientes-personalizados-${this.embarqueId}`,
              operacionGuardadoClientes,
              {
                priority: 'high', // Alta prioridad para asegurar que se guarde
                merge: false,     // No fusionar, es una operación independiente
                immediate: true   // Ejecutar inmediatamente
              }
            );
          } else {
            // Fallback si no hay SaveManager
            await operacionGuardadoClientes();
          }
        } catch (error) {
          console.error('[guardarClientesPersonalizados] Error al guardar clientes personalizados en Firebase:', error);
          // No mostrar alert para no interrumpir el flujo del usuario
          // Los datos siguen en localStorage como respaldo
        }
      }
    },

    async cargarClientesPersonalizados() {
      // Primero intentar cargar desde Firebase si hay un embarqueId
      if (this.embarqueId) {
        try {
          const db = getFirestore();
          const embarqueRef = doc(db, 'embarques', this.embarqueId);
          const embarqueDoc = await getDoc(embarqueRef);
          
          if (embarqueDoc.exists()) {
            const data = embarqueDoc.data();
            if (data.clientesPersonalizados && Array.isArray(data.clientesPersonalizados)) {
              console.log('[cargarClientesPersonalizados] Cargando clientes personalizados desde Firebase:', data.clientesPersonalizados);
              this.clientesPersonalizados = data.clientesPersonalizados;
              
              // Sincronizar con localStorage
              localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
              return; // Salir early si se cargó desde Firebase
            }
          }
        } catch (error) {
          console.error('[cargarClientesPersonalizados] Error al cargar desde Firebase, intentando localStorage:', error);
        }
      }
      
      // Fallback a localStorage si no se pudo cargar desde Firebase
      const clientesGuardados = localStorage.getItem('clientesPersonalizados');
      if (clientesGuardados) {
        try {
          this.clientesPersonalizados = JSON.parse(clientesGuardados);
          console.log('[cargarClientesPersonalizados] Clientes cargados desde localStorage:', this.clientesPersonalizados);
        } catch (error) {
          console.error('[cargarClientesPersonalizados] Error al parsear clientes desde localStorage:', error);
          this.clientesPersonalizados = [];
        }
      }
    },

    // Métodos relacionados con la interfaz de usuarios
    async escucharUsuariosActivos() {
      try {
        const statusRef = ref(rtdb, 'status');

        // Primero, asegurarse de que el usuario actual esté marcado como activo
        if (this.authStore.isLoggedIn && this.authStore.user) {
          const userStatusRef = ref(rtdb, `status/${this.authStore.userId}`);

          try {
            await set(userStatusRef, {
              username: this.authStore.user.username,
              status: 'online',
              lastSeen: new Date().toISOString()
            });
            
          } catch (error) {
            console.error('Error al actualizar estado del usuario:', error);
          }
        } else {
          console.log('Usuario no autenticado');
        }

        // Luego, escuchar cambios en los usuarios activos
        this.unsubscribeUsuarios = onValue(statusRef, (snapshot) => {
          const usuarios = [];
          console.log('Recibiendo actualización de usuarios activos');

          snapshot.forEach((childSnapshot) => {
            const usuario = childSnapshot.val();
            console.log('Usuario encontrado:', usuario);

            // Solo agregar usuarios que tengan datos válidos
            if (usuario && usuario.username) {
              usuarios.push({
                userId: childSnapshot.key,
                username: usuario.username,
                status: usuario.status || 'online',
                lastSeen: usuario.lastSeen
              });
            }
          });

          console.log('Total usuarios activos:', usuarios.length);
          this.usuariosActivos = usuarios;
        }, (error) => {
          console.error('Error al escuchar usuarios activos:', error);
        });
      } catch (error) {
        console.error('Error al iniciar escucha de usuarios:', error);
      }
    },

    async iniciarPresenciaUsuario() {
      try {
        if (!this.authStore.isLoggedIn || !this.authStore.user) {
          console.log('Usuario no autenticado');
          return;
        }

        const userStatusRef = ref(rtdb, `status/${this.authStore.userId}`);

        // Configurar limpieza al desconectar
        await onDisconnect(userStatusRef).remove();

        // Establecer estado inicial
        await set(userStatusRef, {
          username: this.authStore.user.username,
          status: 'online',
          lastSeen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error al iniciar presencia:', error.message, error.stack);
      }
    },

    volverAEmbarquesMenu() {
      // Navegar de vuelta al menú de embarques
      this.$router.push({ name: 'EmbarquesMenu' });
    },

    // Guardar antes de abrir la vista de rendimientos
    async irARendimientos() {
      try {
        // Asegurar que el embarque tenga ID
        if (!this.embarqueId) {
          const nuevoId = await this.guardarEmbarqueInicial();
          if (!nuevoId) {
            alert('Primero guarda el embarque antes de ver los rendimientos.');
            return;
          }
          this.embarqueId = nuevoId;
        }

        // Guardar cambios pendientes localmente y sincronizar
        await this.guardarCambiosEnTiempoReal(true, { immediate: true });
        if (this.hasPendingChanges) {
          await this.sincronizarConNube();
        }

        this.$router.push({ name: 'Rendimientos', params: { id: this.embarqueId } });
      } catch (error) {
        console.error('[Rendimientos] Error al guardar antes de navegar:', error);
        alert('No se pudo guardar el embarque antes de abrir Rendimientos. Intenta de nuevo.');
      }
    },

    // Métodos para calcular valores totales
    calcularPosicionSticky(clienteId) {
      const clientes = Object.keys(this.productosPorCliente);
      const index = clientes.indexOf(clienteId.toString());

      if (index === 0) return 0;

      let offset = 0;
      for (let i = 0; i < index; i++) {
        const prevClienteId = clientes[i];
        const headerHeight = this.$el.querySelector(`[data-cliente="${this.obtenerNombreCliente(prevClienteId)}"]`)?.offsetHeight || 0;
        offset += headerHeight;
      }

      return offset;
    },

    // Métodos para creación de cuentas
    async crearCuentaJoselito(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        // Asegurar que el ID de cliente sea '1' para Joselito
        const joselitoClienteId = '1';
        const embarqueCliente = { 
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { [joselitoClienteId]: clienteCrudos },
          productosTotales: this.embarque.productos,
          clienteCrudosTotales: this.clienteCrudos,
          costosPorMedida: { ...this.costosPorMedida },
          aplicarCostoExtra: { ...this.aplicarCostoExtra },
          costoExtra: this.costoExtra
        };
        await EmbarqueCuentasService.crearCuentaJoselito(embarqueCliente, this.$router);
      } catch (error) {
        console.error('Error al crear cuenta para Joselito:', error);
        alert('Error al crear cuenta para Joselito');
      } finally {
        this.isCreatingAccount = false;
      }
    },

    async crearCuentaCatarro(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        
        // Asegurar que el ID de cliente sea '2' para Catarro
        const catarroClienteId = '2';
        
        const embarqueCliente = { 
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { [catarroClienteId]: clienteCrudos },
          productosTotales: this.embarque.productos,
          clienteCrudosTotales: this.clienteCrudos,
          costosPorMedida: { ...this.costosPorMedida },
          aplicarCostoExtra: { ...this.aplicarCostoExtra },
          costoExtra: this.costoExtra
        };
        
        await EmbarqueCuentasService.crearCuentaCatarro(embarqueCliente, this.$router);
        alert('Cuenta de Catarro creada exitosamente y abierta en una nueva pestaña.');
      } catch (error) {
        console.error('Error al crear cuenta para Catarro:', error);
        alert(`Error al crear cuenta para Catarro: ${error.message}`);
      } finally {
        this.isCreatingAccount = false;
      }
    },

    esClienteJoselito(clienteId) {
      const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      return clienteInfo && clienteInfo.nombre.toLowerCase().includes('joselito');
    },

    esClienteCatarro(clienteId) {
      const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      return clienteInfo && clienteInfo.nombre.toLowerCase().includes('catarro');
    },

    esClienteVeronica(clienteId) {
      const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      return clienteInfo && (clienteInfo.nombre.toLowerCase().includes('veronica') || clienteInfo.nombre.toLowerCase().includes('lorena'));
    },

    obtenerEmbarqueCliente(clienteId) {
      const clienteProductos = this.productosPorCliente[clienteId];
      const clienteCrudos = this.clienteCrudos[clienteId];

      return {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon,
        productos: clienteProductos,
        clienteCrudos: { [clienteId]: clienteCrudos },
        kilosCrudos: this.embarque.kilosCrudos || {}
      };
    },

    async verificarFechaExistente(nuevaFecha) {
      // Si estamos en modo edición y el embarque está bloqueado, no permitir cambios
      if (this.embarqueBloqueado) {
        alert('El embarque está bloqueado. No se puede cambiar la fecha.');
        return;
      }

      // Si la nueva fecha es la misma que la actual, no hacer nada
      if (nuevaFecha === this.embarque.fecha) {
        // La fecha no ha cambiado, no es necesario verificar
        return;
      }

      try {
        const fechaISO = normalizarFechaISO(nuevaFecha);
        // Guardar el ID del embarque actual antes de cambiar la fecha
        // Esto es crucial para recargas de página
        if (this.embarqueId) {
          localStorage.setItem('ultimoEmbarqueId', this.embarqueId);
        }
        
        // Si no existe un embarque con la misma fecha, actualizar la fecha
        this.embarque.fecha = nuevaFecha;
        this.embarque.camionNumero = await this.obtenerCamionNumeroParaFecha(fechaISO);
        
        // Si estamos en modo edición, guardar los cambios inmediatamente
        if (this.modoEdicion && this.embarqueId) {
          this.guardarCambiosEnTiempoReal();
        }
      } catch (error) {
        console.error("Error al verificar fecha existente:", error);
        alert('Hubo un error al verificar la fecha. Por favor, intente nuevamente.');
      }
    },

    // Método para crear cuenta de Ozuna
    async crearCuentaOzuna(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        
        // Asegurar que el ID de cliente sea '4' para Ozuna
        const ozunaClienteId = '4';
        
        const embarqueCliente = { 
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { [ozunaClienteId]: clienteCrudos },
          productosTotales: this.embarque.productos,
          clienteCrudosTotales: this.clienteCrudos,
          costosPorMedida: { ...this.costosPorMedida },
          aplicarCostoExtra: { ...this.aplicarCostoExtra },
          costoExtra: this.costoExtra
        };
        
        await EmbarqueCuentasService.crearCuentaOzuna(embarqueCliente, this.$router);
        alert('Cuenta de Ozuna creada exitosamente y abierta en una nueva pestaña.');
      } catch (error) {
        console.error('Error al crear cuenta para Ozuna:', error);
        alert(`Error al crear cuenta para Ozuna: ${error.message}`);
      } finally {
        this.isCreatingAccount = false;
      }
    },

    // Método para crear cuenta de Otilio
    async crearCuentaOtilio(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        
        // Asegurar que el ID de cliente sea '3' para Otilio
        const otilioClienteId = '3';
        
        const embarqueCliente = { 
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { [otilioClienteId]: clienteCrudos },
          productosTotales: this.embarque.productos,
          clienteCrudosTotales: this.clienteCrudos,
          costosPorMedida: { ...this.costosPorMedida },
          aplicarCostoExtra: { ...this.aplicarCostoExtra },
          costoExtra: this.costoExtra
        };
        
        await EmbarqueCuentasService.crearCuentaOtilio(embarqueCliente, this.$router);
        alert('Cuenta de Otilio creada exitosamente y abierta en una nueva pestaña.');
      } catch (error) {
        console.error('Error al crear cuenta para Otilio:', error);
        alert(`Error al crear cuenta para Otilio: ${error.message}`);
      } finally {
        this.isCreatingAccount = false;
      }
    },

    // Método para crear cuenta de Veronica
    async crearCuentaVeronica(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        
        console.log('[DEBUG] crearCuentaVeronica - clienteId recibido:', clienteId);
        console.log('[DEBUG] crearCuentaVeronica - clienteProductos recibidos:', clienteProductos);
        console.log('[DEBUG] crearCuentaVeronica - clienteCrudos recibidos:', clienteCrudos);
        
        // Asegurar que el ID de cliente sea '5' para Veronica
        const veronicaClienteId = '5';
        
        const embarqueCliente = { 
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { [veronicaClienteId]: clienteCrudos },
          productosTotales: this.embarque.productos,
          clienteCrudosTotales: this.clienteCrudos,
          costosPorMedida: { ...this.costosPorMedida },
          aplicarCostoExtra: { ...this.aplicarCostoExtra },
          costoExtra: this.costoExtra
        };
        
        console.log('[DEBUG] crearCuentaVeronica - embarqueCliente final:', embarqueCliente);
        
        await EmbarqueCuentasService.crearCuentaVeronica(embarqueCliente, this.$router);
        alert('Cuenta de Veronica creada exitosamente y abierta en una nueva pestaña.');
      } catch (error) {
        console.error('Error al crear cuenta para Veronica:', error);
        alert(`Error al crear cuenta para Veronica: ${error.message}`);
      } finally {
        this.isCreatingAccount = false;
      }
    },

    // Sincronizar cambios pendientes al reconectar
    async syncOffline() {
      try {
        await EmbarquesOfflineService.init();
        const pendientes = await EmbarquesOfflineService.getPendingSync();

        if (Array.isArray(pendientes) && pendientes.length > 0) {
          for (const record of pendientes) {
            await this.sincronizarRegistroOffline(record);
          }
        }

        if (this.embarqueId) {
          this.guardarCambiosEnTiempoReal();
        }
      } catch (error) {
        console.error('[syncOffline] Error general al sincronizar embarques offline:', error);
      }
    },

    async generarPDFResumenConEscala() {
      this.mostrarEscalaResumen = false;
      // Llama al mixin pero pasando la escala como argumento extra
      if (this.$options.mixins && this.$options.mixins.some(m => m.methods && m.methods.generarPDFResumen)) {
        // Llama al método del mixin pero con escala
        await this.generarPDFResumen(this.escalaResumen);
      } else if (typeof this.generarPDFResumen === 'function') {
        await this.generarPDFResumen(this.escalaResumen);
      } else {
        // fallback: llama al método general
        await this.generarPDF('resumen', null, this.escalaResumen);
      }
    },

    // --- INICIO: Mover estas funciones dentro de methods ---
    // Método para detectar si es una recarga de página
    detectarRecarga() {
      // Verificar si el navegador soporta Navigation Timing API
      if (window.performance && window.performance.navigation) {
        return window.performance.navigation.type === 1; // 1 = recarga
      } 
      
      // Para navegadores modernos que no soportan la API anterior
      if (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType('navigation')) {
        const navigationEntries = window.performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0 && navigationEntries[0].type) {
          return navigationEntries[0].type === 'reload';
        }
      }
      
      // Si no se puede determinar, verificar con localStorage
      const ultimaVisita = localStorage.getItem('ultimaVisita');
      const ahora = Date.now();
      
      // Guardar timestamp actual
      localStorage.setItem('ultimaVisita', ahora);
      
      // Si la última visita fue en los últimos 5 segundos, consideramos que es una recarga
      if (ultimaVisita && ahora - parseInt(ultimaVisita) < 5000) {
        return true;
      }
      
      return false;
    },

    // Manejo del cierre/recarga de pestaña del navegador
    handleBeforeUnload(event) {
      // Guardar el ID del embarque actual antes de recargar
      if (this.embarqueId) {
        localStorage.setItem('ultimoEmbarqueId', this.embarqueId);
        localStorage.setItem('ultimaRuta', window.location.pathname);
      }

      const haySaveManagerPendiente = this.saveManager && this.guardadoAutomaticoActivo
        && this.saveManager.getStatus().pendingOperations > 0;

      // Intentar forzar guardado local si hay operaciones pendientes
      if (haySaveManagerPendiente) {
        this.saveManager.forceProcessAll();
      }

      // Intentar subir a la nube con sendBeacon (best-effort, no bloquea)
      if (this.hasPendingChanges && this.embarqueId && navigator.onLine) {
        // Disparar sincronización sin bloquear (puede no completarse si el usuario cierra rápido)
        this.sincronizarConNube().catch(() => {});
      }

      // Solo mostrar diálogo de confirmación si hay cambios sin guardar
      if (haySaveManagerPendiente || this.hasPendingChanges) {
        event.preventDefault();
        event.returnValue = 'Hay cambios pendientes de guardar. ¿Estás seguro de que quieres salir?';
        return event.returnValue;
      }
    },
    // --- FIN: Mover estas funciones dentro de methods ---

    async seleccionarClienteParaProducto(clienteId) {
      if (!this.embarque.fecha || !this.embarque.cargaCon) {
        alert('Por favor, seleccione la fecha y con quién se carga el embarque antes de agregar productos.');
        return;
      }
      
      // Si el embarque aún no ha sido guardado, guardarlo ahora.
      if (!this.embarqueId) {
        const nuevoEmbarqueId = await this.guardarEmbarqueInicial();
        if (nuevoEmbarqueId) {
          // Si el guardado fue exitoso y obtuvimos un ID, podemos agregar el producto.
          this.agregarProducto(clienteId);
          this.clienteActivo = clienteId; // Activar el cliente
        }
        // Si no se pudo guardar, la función guardarEmbarqueInicial ya habrá mostrado una alerta.
      } else {
        // Si ya tenemos un ID, simplemente agregamos el producto.
        this.agregarProducto(clienteId);
        this.clienteActivo = clienteId; // Activar el cliente
      }
    },

    async cargarPreciosActuales() {
      try {
        
        
        const db = getFirestore();
        const preciosRef = collection(db, 'precios');
        
        // Primero intentar cargar sin ordenamiento para verificar si hay datos
        const preciosSnapshotSimple = await getDocs(preciosRef);
        
        
        if (preciosSnapshotSimple.size === 0) {
          console.warn('[NUEVO-EMBARQUE] ⚠️  La colección "precios" está vacía. Verificar si los precios se están guardando correctamente.');
          this.preciosActuales = [];
          return;
        }
        
        // Si hay datos, proceder con query ordenado
        
        
        // Intentar query con timestamp primero
        let preciosSnapshot;
        try {
          const q = query(
            preciosRef, 
            orderBy('fecha', 'desc'), 
            orderBy('timestamp', 'desc')
          );
          preciosSnapshot = await getDocs(q);
          
        } catch (orderError) {
          console.warn('[NUEVO-EMBARQUE] ⚠️  Error en query con timestamp, usando solo fecha:', orderError);
          // Fallback a solo ordenar por fecha
          const qFallback = query(preciosRef, orderBy('fecha', 'desc'));
          preciosSnapshot = await getDocs(qFallback);
        }
        
        // Procesar y normalizar los precios cargados
        this.preciosActuales = preciosSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Asegurar que todos los precios tengan timestamp (para compatibilidad con precios viejos)
            timestamp: data.timestamp || 0,
            // Normalizar la fecha usando las nuevas utilidades
            fecha: normalizarFechaISO(data.fecha)
          };
        });
        
        
        
        // Debug: Mostrar algunos precios de ejemplo
        if (this.preciosActuales.length > 0) {
        }
        
        // Log de diagnóstico para fechas
        const fechasUnicas = [...new Set(this.preciosActuales.map(p => p.fecha))];
        
        
        // Verificar precios para fecha específica de hoy
        const fechaHoy = normalizarFechaISO(new Date());
        const preciosHoy = this.preciosActuales.filter(p => p.fecha === fechaHoy);
        
        // Verificar si hay precios sin timestamp
        const sinTimestamp = this.preciosActuales.filter(p => !p.timestamp || p.timestamp === 0);
        if (sinTimestamp.length > 0) {
          console.warn(`[NUEVO-EMBARQUE] ⚠️  ${sinTimestamp.length} precios sin timestamp (pueden causar problemas de ordenamiento)`);
        }
        
        // Debug: Verificar si hay precios para "Golfo"
        const preciosGolfo = this.preciosActuales.filter(p => 
          p.producto && p.producto.toLowerCase().includes('golfo')
        );
        
      } catch (error) {
        console.error('[NUEVO-EMBARQUE] Error al cargar precios:', error);
        // En caso de error, asegurar que tenemos un array vacío
        this.preciosActuales = [];
      }
    },

    async onPrecioAgregado(nuevoPrecio) {
      await this.cargarPreciosActuales();
    }
  },

  watch: {
    embarque: {
      handler(nuevoValor) {
        if (this.isUndoRedo) {
          this.isUndoRedo = false;
          return;
        }
        
        // Evitar guardado excesivo durante la inicialización
        if (this._inicializandoEmbarque) {
          return;
        }

        // Si estamos aplicando cambios remotos, no dispare guardado inmediato
        if (this._aplicandoRemoto) {
          return;
        }
        
        localStorage.setItem('embarque', JSON.stringify(nuevoValor));
        this.undoStack.push(JSON.stringify(nuevoValor));
        this.redoStack = [];

        // Disparar auto-guardado si hay productos con medida válida (tipo opcional)
        const hayProductosConMedida = (nuevoValor.productos || []).some(p => 
          p.medida && p.medida.trim() !== ''
        );
        
        if (hayProductosConMedida || nuevoValor.fecha || nuevoValor.cargaCon) {
          // Llamar al método de guardado automático con debounce
          this.guardarCambiosEnTiempoReal();
        }
      },
      deep: true
    },
    clienteCrudos: {
      handler() {
        // Guardar crudos en localStorage para persistencia offline
        localStorage.setItem('clienteCrudos', JSON.stringify(this.clienteCrudos));
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    },
    'embarque.productos': {
      handler(newProductos) {
        newProductos.forEach(producto => {
          // Eliminando console.log de "Producto actualizado"
        });
      },
      deep: true
    },
    'embarque.fecha': {
      handler(newVal, oldVal) {
        // Ignorar cambios durante la inicialización del embarque
        if (this._inicializandoEmbarque || this._aplicandoRemoto) {
          return;
        }
        
        this.cargarPedidoReferenciaDelDia(newVal);
        if (!this.embarqueId) {
          this.triggerGuardadoInicial();
        } else {
          this.fechaModificada = true;
          this.guardarCambiosEnTiempoReal();
        }
      }
    },
    'embarque.cargaCon': {
      handler(newVal, oldVal) {
        if (!this.embarqueId) {
          this.triggerGuardadoInicial();
        } else {
          this.cargaConModificada = true;
          this.guardarCambiosEnTiempoReal();
        }
      }
    }
  },

  beforeUnmount() {
    console.log('[beforeUnmount] Limpiando conexiones y listeners...');
    
    // Limpiar conexiones de Firestore
    this.limpiarConexionesFirestore();
    
    // Limpiar listeners de red
    window.removeEventListener('online', this.configurarReconexionAutomatica);
    window.removeEventListener('offline', this.configurarReconexionAutomatica);
    
    // Limpiar listener de beforeunload
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  },

  async created() {
    
    // Verificar autenticación al inicializar el componente
    try {
      this.authStore.checkAuth();
      if (!this.authStore.isAuthenticated) {
        console.warn('[NuevoEmbarque] Usuario no autenticado al inicializar, redirigiendo al login');
        this.$router.push('/login');
        return;
      }
      
    } catch (error) {
      console.error('[NuevoEmbarque] Error de autenticación al inicializar:', error);
      this.mostrarErrorAutenticacion('Error de autenticación al cargar la página. Por favor, inicie sesión nuevamente.');
      return;
    }
    
    // Activar monitoreo de errores de autenticación en modo desarrollo
    if (process.env.NODE_ENV === 'development') {
      authDiagnostic.enableAuthErrorMonitoring();
    }
    
    // Inicializar el SaveManager
    this.saveManager = getSaveManager();
    
    // Configurar reconexión automática para errores de red
    this.configurarReconexionAutomatica();
    
    // Configurar listeners del SaveManager para logging y notificaciones
    this.saveManager.addListener('quota-error', (data) => {
      console.warn('[SaveManager] Error de cuota detectado:', data);
      const minutos = Math.ceil(data.resetIn / 60000);
      this.mostrarError(`Se ha alcanzado el límite de operaciones. Los cambios se guardarán automáticamente en ${minutos} minuto(s).`);
    });
    
    this.saveManager.addListener('save-failed', (data) => {
      console.error('[SaveManager] Fallo al guardar después de múltiples intentos:', data);
      this.mostrarError('No se pudieron guardar algunos cambios. Por favor, recarga la página e intenta de nuevo.');
    });
    
    // Registrar el listener para cuando se cierra la pestaña/ventana
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Cargar configuración de medidas
    this.cargarMedidasConfiguracion();

    await EmbarquesOfflineService.init();
    window.addEventListener('online', this.syncOffline);

    if (navigator.onLine) {
      await this.syncOffline();
    }

    const embarqueId = this.$route.params.id;

    if (!navigator.onLine) {
      let cargadoOffline = false;

      if (embarqueId && embarqueId !== 'nuevo') {
        cargadoOffline = await this.cargarEmbarqueOffline(embarqueId);
      } else {
        const registrosLocales = await EmbarquesOfflineService.getAll();
        if (registrosLocales.length > 0) {
          this.aplicarSnapshotOffline(registrosLocales[0]);
          cargadoOffline = true;
        }
      }

      if (!cargadoOffline) {
        const localEmbarque = localStorage.getItem('embarque');
        if (localEmbarque) {
          try {
            this.embarque = JSON.parse(localEmbarque);
            const localCrudos = localStorage.getItem('clienteCrudos');
            if (localCrudos) this.clienteCrudos = JSON.parse(localCrudos);
            cargadoOffline = true;
          } catch (error) {
            console.warn('[NuevoEmbarque] Error al restaurar embarque desde localStorage:', error);
          }
        }
      }

      if (cargadoOffline) {
        this.undoStack.push(JSON.stringify(this.embarque));
        this.actualizarMedidasUsadas();
        await this.cargarClientesPersonalizados();
        await this.cargarPedidoReferenciaDelDia();
        this.guardadoAutomaticoActivo = true;
        await this.cargarPreciosActuales();
        return;
      }

      console.warn('[NuevoEmbarque] No se encontraron datos offline para el embarque solicitado.');
    }

    await this.cargarEmbarque(embarqueId);
    this.undoStack.push(JSON.stringify(this.embarque));
    this.actualizarMedidasUsadas();
    await this.cargarClientesPersonalizados();
    await this.cargarPedidoReferenciaDelDia();
    await this.iniciarPresenciaUsuario();
    this.escucharUsuariosActivos();
    await this.cargarPreciosActuales();
  },

  async beforeRouteLeave(to, from, next) {
    // 1. Procesar operaciones pendientes en el SaveManager (guardado local)
    if (this.saveManager && this.embarqueId && this.guardadoAutomaticoActivo) {
      const status = this.saveManager.getStatus();
      if (status.pendingOperations > 0) {
        console.log('[NuevoEmbarque] Guardando cambios pendientes antes de cambiar de ruta...');
        try {
          this.mostrarMensaje('Guardando cambios antes de salir...');
          await this.saveManager.forceProcessAll();
          console.log('[NuevoEmbarque] Cambios locales guardados exitosamente');
        } catch (error) {
          console.error('[NuevoEmbarque] Error al guardar cambios locales:', error);
          const confirmacion = confirm('Hay cambios pendientes de guardar. ¿Deseas salir sin guardar?');
          if (!confirmacion) {
            next(false);
            return;
          }
        }
      }
    }

    // 2. Subir cambios a la nube automáticamente si hay pendientes
    if (this.hasPendingChanges && this.embarqueId) {
      if (navigator.onLine) {
        console.log('[NuevoEmbarque] Subiendo cambios a la nube antes de salir...');
        try {
          await this.sincronizarConNube();
          console.log('[NuevoEmbarque] Cambios subidos a la nube exitosamente');
        } catch (error) {
          console.error('[NuevoEmbarque] Error al subir cambios a la nube al salir:', error);
          // No bloqueamos la navegación si falla la subida a la nube
        }
      } else {
        console.warn('[NuevoEmbarque] Sin conexión al salir: los cambios quedan pendientes de sincronización.');
      }
    }

    next();
  },

  beforeDestroy() {
    // Intentar forzar guardado local y subida a la nube antes de destruir
    if (this.embarqueId) {
      // Guardar en saveManager si hay operaciones pendientes
      if (this.saveManager && this.guardadoAutomaticoActivo) {
        const status = this.saveManager.getStatus();
        if (status.pendingOperations > 0) {
          console.log('[NuevoEmbarque] Forzando guardado local antes de destruir componente');
          this.saveManager.forceProcessAll().catch(error => {
            console.error('[NuevoEmbarque] Error al forzar guardado local en destrucción:', error);
          });
        }
      }

      // Subir a la nube si hay cambios pendientes y hay conexión
      if (this.hasPendingChanges && navigator.onLine) {
        console.log('[NuevoEmbarque] Subiendo cambios a la nube antes de destruir componente');
        this.sincronizarConNube().catch(error => {
          console.error('[NuevoEmbarque] Error al subir a la nube en destrucción:', error);
        });
      }
    }
    
    // Cancelar la suscripción a los cambios en tiempo real
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    // Limpiar debounce del guardado automático (DEPRECATED)
    if (this.debouncedSave && this.debouncedSave.cancel) {
      this.debouncedSave.cancel();
    }
    
    // Limpiar el SaveManager
    if (this.saveManager) {
      // Ya intentamos guardar arriba, ahora solo limpiamos
      this.saveManager = null;
    }

    // Remover los event listeners cuando el componente se destruye
    const crudosInputs = document.querySelectorAll('.crudo input, .crudo select');
    crudosInputs.forEach(input => {
      input.removeEventListener('input', this.actualizarCrudos);
    });

    // Limpiar escucha cuando el componente se destruye
    if (this.unsubscribeUsuarios) {
      console.log('Limpiando escucha de usuarios activos');
      this.unsubscribeUsuarios();
    }
    
    // Eliminar los escuchadores de recarga y reconexión
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('online', this.syncOffline);
  },

  updated() {
    // Component updated
  }
};
</script>

<style scoped>
/* Estilos base */
.nuevo-embarque-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  width: 100%;
}

.nuevo-embarque {
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  min-height: 100vh;
  flex: 1;
  margin-left: 100px;
  width: calc(100% - 100px);
  transition: margin-left 0.3s ease, width 0.3s ease;
}

/* Headers y secciones */
.header {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.header-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.fecha-selector,
.carga-selector {
  flex: 1;
  min-width: 200px;
}

/* Grupos de clientes */
.cliente-grupo {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Headers de clientes */
.cliente-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px 15px;
  border-radius: 10px;
}

.cliente-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffffff;
}

/* Colores por cliente */
.cliente-header[data-cliente="Joselito"] {
  background-color: #3498db;
}

.cliente-header[data-cliente="Catarro"] {
  background-color: #e74c3c;
}

.cliente-header[data-cliente="Otilio"] {
  background-color: #f1c40f;
}

.cliente-header[data-cliente="Ozuna"] {
  background-color: #2ecc71;
}

.cliente-header[data-cliente="Canelo"] {
  background-color: rgba(230, 126, 34, 0.1);
  border-left: 4px solid #e67e22;
}

.cliente-header[data-cliente="Otro"] {
  background-color: #95a5a6;
}

/* Contenedores de productos */
.productos-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

/* Botones principales */
.btn {
  cursor: pointer;
  transition: background-color 0.3s;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
}

.btn-primary {
  background-color: #007bff;
  color: #fff;
}

.btn-secondary {
  background-color: #6c757d;
  color: #fff;
}

.btn-danger {
  background-color: #dc3545;
  color: #fff;
}

.btn-success {
  background-color: #28a745;
  color: #fff;
}

/* Formularios e inputs */
.form-control {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border-radius: 5px;
  border: 1px solid #ccc;
}

input[type="number"] {
  text-align: right;
  appearance: textfield;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Sidebar de clientes */
.sidebar-clientes {
  width: 100px;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  padding: 15px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: width 0.3s ease;
}

.sidebar-collapsed {
  width: 40px;
}

.sidebar-collapsed+.nuevo-embarque {
  margin-left: 40px;
  width: calc(100% - 40px);
}

.sidebar-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  margin-bottom: 20px;
}

.sidebar-clientes-contenido {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  align-items: center;
}

/* Botones de cliente en sidebar */
.sidebar-clientes .btn-nota-cliente {
  width: 80px;
  padding: 12px 0;
  margin: 0;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  color: white;
  border: none;
  cursor: pointer;
}

.sidebar-clientes .btn-nota-cliente:hover {
  transform: translateX(5px);
}

.sidebar-clientes .btn-nota-cliente.activo {
  transform: translateX(5px);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

/* Botones de navegación y acción */
.botones-undo-redo {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  justify-content: center;
}

.botones-finales {
  display: flex;
  flex-direction: row;
  gap: 15px;
  margin-top: 20px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.crear-embarque {
  background-color: #28a745;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
}

.generar-pdf {
  background-color: #17a2b8;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  margin-top: 20px;
  margin-bottom: 20px;
}

.btn-bloqueo {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-bloqueo:not(.bloqueado) {
  background-color: #2ecc71;
  color: white;
}

.btn-bloqueo.bloqueado {
  background-color: #e74c3c;
  color: white;
}

/* Clases adicionales para interacciones */
.cliente-seleccionado {
  animation: highlight 2s ease;
}

@keyframes highlight {
  0%, 100% {
    box-shadow: none;
  }
  50% {
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
  }
}

/* Media Queries */
@media (max-width: 1024px) {
  .productos-container {
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
  }

  .sidebar-clientes {
    width: 70px;
  }

  .nuevo-embarque {
    margin-left: 70px;
    width: calc(100% - 70px);
  }

  .sidebar-collapsed {
    width: 30px;
  }

  .sidebar-collapsed+.nuevo-embarque {
    margin-left: 30px;
    width: calc(100% - 30px);
  }

  .sidebar-clientes .btn-nota-cliente {
    width: 60px;
    font-size: 12px;
    padding: 10px 0;
  }

  .botones-finales {
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .botones-finales button,
  .botones-finales a {
    width: 100%;
    min-width: unset;
  }

  .cliente-header {
    flex-direction: row;
    padding: 8px 12px;
  }

  .cliente-info h3 {
    font-size: 1.2rem;
  }
}

@media (max-width: 480px) {
  .sidebar-clientes {
    width: 50px;
  }

  .nuevo-embarque {
    margin-left: 50px;
    width: calc(100% - 50px);
  }

  .sidebar-collapsed {
    width: 0;
    padding: 0;
    overflow: hidden;
  }

  .sidebar-collapsed+.nuevo-embarque {
    margin-left: 0;
    width: 100%;
  }

  .cliente-header {
    padding: 6px 8px;
  }

  .cliente-info h3 {
    font-size: 1.1rem;
  }

  .productos-container {
    flex-direction: column;
  }
}

.cliente-header[data-cliente="Canelo"] h3 {
  color: #000000;
}

.scale-control-resumen {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 8px;
  justify-content: center;
}
</style>
