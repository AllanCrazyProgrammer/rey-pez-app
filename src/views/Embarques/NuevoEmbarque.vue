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
import { embarqueCargaMixin } from './mixins/embarqueCargaMixin';
import { embarqueSyncMixin } from './mixins/embarqueSyncMixin';
import { embarqueClientesMixin } from './mixins/embarqueClientesMixin';
import ClienteProductos from './components/ClienteProductos.vue';
import { v4 as uuidv4 } from 'uuid';

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
    embarqueCargaMixin,
    embarqueSyncMixin,
    embarqueClientesMixin,
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
    volverAEmbarquesMenu() {
      this.$router.push({ name: 'EmbarquesMenu' });
    },

    async irARendimientos() {
      try {
        if (!this.embarqueId) {
          const nuevoId = await this.guardarEmbarqueInicial();
          if (!nuevoId) {
            alert('Primero guarda el embarque antes de ver los rendimientos.');
            return;
          }
          this.embarqueId = nuevoId;
        }
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

    async verificarFechaExistente(nuevaFecha) {
      if (this.embarqueBloqueado) {
        alert('El embarque está bloqueado. No se puede cambiar la fecha.');
        return;
      }
      if (nuevaFecha === this.embarque.fecha) return;
      try {
        const fechaISO = normalizarFechaISO(nuevaFecha);
        if (this.embarqueId) {
          localStorage.setItem('ultimoEmbarqueId', this.embarqueId);
        }
        this.embarque.fecha = nuevaFecha;
        this.embarque.camionNumero = await this.obtenerCamionNumeroParaFecha(fechaISO);
        if (this.modoEdicion && this.embarqueId) {
          this.guardarCambiosEnTiempoReal();
        }
      } catch (error) {
        console.error('[verificarFechaExistente] Error:', error);
        alert('Hubo un error al verificar la fecha. Por favor, intente nuevamente.');
      }
    },

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

    // Métodos de carga y guardado
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
