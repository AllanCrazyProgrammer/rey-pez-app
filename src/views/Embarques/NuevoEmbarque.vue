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
          :precio-maquila-ozuna-default="precioMaquilaOzunaDefault"
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
import { embarqueUndoMixin } from './mixins/embarqueUndoMixin';
import { embarquePresenciaMixin } from './mixins/embarquePresenciaMixin';
import { embarqueCuentasMixin } from './mixins/embarqueCuentasMixin';
import { embarqueModalesMixin } from './mixins/embarqueModalesMixin';
import { embarquePdfModalMixin } from './mixins/embarquePdfModalMixin';
import { embarquePedidoMixin } from './mixins/embarquePedidoMixin';
import { embarqueCrudosMixin } from './mixins/embarqueCrudosMixin';
import { embarqueDatosMixin } from './mixins/embarqueDatosMixin';
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
import { obtenerPrecioMaquilaOzunaDefault } from '@/utils/preciosHistoricos';
import { generarNotaVentaPDF } from '@/utils/pdfGenerator';
import { embarqueTieneContenidoOperativoDoc, embarqueTieneContenidoOperativoEstado } from '@/utils/embarqueContenido';

// Después de las imports existentes, agregar:
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';

export default {
  mixins: [
    pdfGenerationMixin,
    calculosMixin,
    embarqueUndoMixin,
    embarquePresenciaMixin,
    embarqueCuentasMixin,
    embarqueModalesMixin,
    embarquePdfModalMixin,
    embarquePedidoMixin,
    embarqueCrudosMixin,
    embarqueDatosMixin,
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
    precioMaquilaOzunaDefault() {
      return obtenerPrecioMaquilaOzunaDefault(
        this.preciosActuales || [],
        this.embarque?.fecha ? normalizarFechaISO(this.embarque.fecha) : obtenerFechaActualISO()
      );
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
      this.initUndo(this.embarque);
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
      return embarqueTieneContenidoOperativoDoc(data);
    },

    tieneContenidoOperativoActual() {
      return embarqueTieneContenidoOperativoEstado({
        cargaCon: this.embarque?.cargaCon,
        productos: this.embarque?.productos,
        clienteCrudos: this.clienteCrudos,
      });
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
        borrador: !embarqueTieneContenidoOperativoEstado({
          cargaCon: this.embarque?.cargaCon,
          productos: this.embarque?.productos,
          clienteCrudos: this.clienteCrudos,
        }),
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
        this.initUndo(this.embarque);
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
    this.initUndo(this.embarque);
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
