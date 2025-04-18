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
        @volver="volverAEmbarquesMenu" 
        @toggle-bloqueo="toggleBloqueo" 
        @update:fecha="embarque.fecha = $event"
        @update:cargaCon="embarque.cargaCon = $event" 
        @generar-taras="generarPDF('taras')"
        @generar-resumen="generarPDF('resumen')"
        @verificar-fecha="verificarFechaExistente" 
      />

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
          :nombre-cliente="obtenerNombreCliente(clienteId)"
          :cliente-activo="clienteActivo" 
          :embarque-bloqueado="embarqueBloqueado" 
          :medidas-usadas="medidasUsadas"
          :is-generating-pdf="isGeneratingPdf" 
          :pdf-type="pdfType" 
          :is-creating-account="isCreatingAccount"
          @update:productos="actualizarProductosCliente(clienteId, $event)"
          @update:crudos="actualizarCrudosCliente(clienteId, $event)" 
          @juntarMedidas-change="handleJuntarMedidasChange"
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
      @cerrar="mostrarModalNombreAlternativo = false" 
      @guardar="guardarNombreAlternativo"
    />

    <PrecioModal 
      :mostrar="mostrarModalPrecio" 
      :precio="itemSeleccionado?.precio || ''" 
      @cerrar="cerrarModalPrecio" 
      @guardar="guardarPrecio"
    />

    <HilosModal 
      :mostrar="mostrarModalHilos" 
      :hilos="itemSeleccionado?.hilos || ''" 
      @cerrar="cerrarModalHilos" 
      @guardar="guardarHilos"
    />

    <NotaModal 
      :mostrar="mostrarModalNota" 
      :nota="itemSeleccionado?.nota || ''" 
      @cerrar="cerrarModalNota" 
      @guardar="guardarNota"
    />

    <AltModal 
      :mostrar="mostrarModalAlt" 
      :alt="itemSeleccionado?.textoAlternativo || ''" 
      @cerrar="cerrarModalAlt" 
      @guardar="guardarAlt"
    />
  </div>
</template>

<script>
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, onSnapshot, serverTimestamp, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { debounce } from 'lodash';
import { ref, onValue, onDisconnect, set } from 'firebase/database'
import { rtdb } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { ref as vueRef, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import HeaderEmbarque from '../Embarques/components/HeaderEmbarque.vue'
import pdfGenerationMixin from './mixins/pdfGenerationMixin';
import calculosMixin from './mixins/calculosMixin';
import ClienteProductos from './components/ClienteProductos.vue';

// Importar constantes y utilidades
import { 
  CLIENTES_PREDEFINIDOS, 
  crearNuevoProducto, 
  crearNuevoCrudoItem 
} from '@/constants.js/embarque';

// Importar componentes modales
import NuevoClienteModal from './components/modals/NuevoClienteModal.vue';
import NombreAlternativoModal from './components/modals/NombreAlternativoModal.vue';
import PrecioModal from './components/modals/PrecioModal.vue';
import HilosModal from './components/modals/HilosModal.vue';
import NotaModal from './components/modals/NotaModal.vue';
import AltModal from './components/modals/AltModal.vue';

// Lazy loaded components
const Rendimientos = defineAsyncComponent(() => import('./Rendimientos.vue'))

// Después de las imports existentes, agregar:
import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';

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
    AltModal
  },
  
  setup() {
    const authStore = useAuthStore();
    return { authStore };
  },
  
  data() {
    return {
      usuariosActivos: [],
      clientesJuntarMedidas: {},
      clientesPredefinidos: CLIENTES_PREDEFINIDOS, // Usar constantes importadas
      clientesPersonalizados: [],
      ultimoIdPersonalizado: 0,
      embarque: {
        fecha: null,
        cargaCon: '',
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
      
      // Otros estados
      clientesOffsets: {},
      embarqueBloqueado: false,
      clienteActivo: null,
      sidebarCollapsed: false,
      
      // Estados para generación de PDF
      isGeneratingPdf: false,
      pdfType: null,
      isCreatingAccount: false,
      _creandoEmbarque: false,
      _guardandoEmbarque: false,
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
    
    productosPorCliente() {
      console.log("Calculando productosPorCliente. Contenido de embarque.productos:", this.embarque.productos);
      
      const productosPorCliente = {};

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
      // Obtener IDs de clientes que tienen productos en este embarque
      const clientesEnEmbarque = Object.keys(this.productosPorCliente);

      // Filtrar los clientes personalizados que están en este embarque
      // y que no son parte de los predefinidos
      const clientesPredefinidosIds = this.clientesPredefinidos.map(c => c.id.toString());

      return this.clientesPersonalizados.filter(cliente =>
        clientesEnEmbarque.includes(cliente.id.toString()) &&
        !clientesPredefinidosIds.includes(cliente.id.toString())
      );
    },
  },
  
  methods: {
    // Métodos de gestión de productos y clientes
    actualizarProductosCliente(clienteId, productos) {
      // Actualizar los productos del cliente en el embarque
      this.embarque.productos = this.embarque.productos.filter(p => p.clienteId !== clienteId);
      this.embarque.productos = [...this.embarque.productos, ...productos];

      // Guardar cambios si es necesario
      if (this.guardadoAutomaticoActivo && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },

    actualizarCrudosCliente(clienteId, crudos) {
      // Actualizar los crudos del cliente
      this.$set(this.clienteCrudos, clienteId, crudos);

      // Guardar cambios si es necesario
      if (this.guardadoAutomaticoActivo && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },

    agregarProducto(clienteId) {
      const nuevoProducto = crearNuevoProducto(clienteId);

      // Establecer tipo por defecto según el cliente
      this.setTipoDefaultParaCliente(nuevoProducto);
      
      // Establecer el nombre del cliente basado en el id
      nuevoProducto.nombreCliente = this.obtenerNombreCliente(clienteId);

      // Agregar directamente al embarque.productos
      this.embarque.productos.push(nuevoProducto);

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
      });
    },

    eliminarProducto(producto) {
      const index = this.embarque.productos.indexOf(producto);
      if (index > -1) {
        // Guardar clienteId antes de eliminar el producto
        const clienteId = producto.clienteId;
        
        // Eliminar el producto
        this.embarque.productos.splice(index, 1);
        
        // Verificar si era el último producto para este cliente
        const todaviaExistenProductos = this.embarque.productos.some(p => p.clienteId === clienteId);
        
        // Si era el último, crear uno nuevo inmediatamente
        if (!todaviaExistenProductos) {
          const nuevoProducto = crearNuevoProducto(clienteId);
          
          // Establecer tipo por defecto según el cliente
          this.setTipoDefaultParaCliente(nuevoProducto);
          
          // Establecer el nombre del cliente basado en el id
          nuevoProducto.nombreCliente = this.obtenerNombreCliente(clienteId);
          
          // Agregar directamente al embarque.productos
          this.embarque.productos.push(nuevoProducto);
          
          // Guardar cambios si es necesario
          if (this.embarqueId) {
            this.guardarCambiosEnTiempoReal();
          }
        }
      }
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
      
      // Control para evitar múltiples llamadas simultáneas
      if (this._creandoEmbarque) {
        console.warn('Ya hay una operación de creación de embarque en curso');
        return null;
      }
      
      this._creandoEmbarque = true;
      
      try {
        // Si no existe embarqueId, crear nuevo embarque
        if (!this.embarqueId) {
          const db = getFirestore();
          try {
            // Verificar primero si ya existe un embarque con la misma fecha
            const fechaSeleccionada = new Date(this.embarque.fecha);
            
            // Convertir a formato ISO para comparación (solo el año, mes y día)
            const fechaISO = fechaSeleccionada.toISOString().split('T')[0];
            
            // Obtener todos los embarques
            const embarquesRef = collection(db, "embarques");
            const snapshot = await getDocs(embarquesRef);
            
            // Buscar si ya existe un embarque con esta fecha
            const embarquesConMismaFecha = snapshot.docs.filter(doc => {
              const data = doc.data();
              let fechaEmbarque;
              
              // Manejar diferentes formatos de fecha
              if (data.fecha && typeof data.fecha.toDate === 'function') {
                fechaEmbarque = data.fecha.toDate();
              } else if (data.fecha instanceof Date) {
                fechaEmbarque = data.fecha;
              } else if (typeof data.fecha === 'string') {
                fechaEmbarque = new Date(data.fecha);
              } else {
                return false;
              }
              
              // Convertir a formato ISO para comparar solo año, mes y día
              const fechaEmbarqueISO = fechaEmbarque.toISOString().split('T')[0];
              
              // Comparar las fechas en formato ISO
              return fechaEmbarqueISO === fechaISO && doc.id !== this.embarqueId;
            });
            
            if (embarquesConMismaFecha.length > 0) {
              alert('Ya existe un embarque para la fecha seleccionada. Por favor, seleccione otra fecha.');
              this._creandoEmbarque = false;
              return null;
            }
            
            // Crear una "reserva" para esta fecha para evitar condiciones de carrera
            // Esta es una operación atómica que impedirá que otros procesos creen embarques con la misma fecha
            const reservaRef = doc(db, "reservas_fechas", fechaISO);
            await setDoc(reservaRef, {
              fecha: fechaISO,
              timestamp: serverTimestamp(),
              usuario: this.authStore.userId || 'anónimo',
              expiración: new Date(Date.now() + 60000) // Expira en 1 minuto
            });
            
            // Si no existe un embarque con la misma fecha, proceder a crear uno nuevo
            const embarqueData = this.prepararDatosEmbarque();
            const docRef = await addDoc(collection(db, "embarques"), embarqueData);

            // Eliminar la reserva una vez creado el embarque
            try {
              await deleteDoc(reservaRef);
            } catch (error) {
              console.error("Error al eliminar la reserva de fecha:", error);
              // No es crítico si falla esto, la reserva expirará automáticamente
            }

            // Guardar el ID y activar modo edición
            this.embarqueId = docRef.id;
            this.modoEdicion = true;
            this.guardadoAutomaticoActivo = true;

            // Luego agregar el producto
            this.agregarProducto(clienteId);
            
            // Activar este cliente
            this.clienteActivo = clienteId;

            this._creandoEmbarque = false;
            return this.embarqueId; // Retornar el ID para encadenar operaciones
          } catch (error) {
            this._creandoEmbarque = false;
            console.error("Error al crear el embarque inicial:", error);
            if (!modalAbierto) {
              alert('Hubo un error al crear el embarque. Por favor, intente nuevamente.');
            }
            return null;
          }
        } else {
          // Si ya existe el embarqueId, solo agregar el producto
          this.agregarProducto(clienteId);
          // Activar este cliente
          this.clienteActivo = clienteId;
          this._creandoEmbarque = false;
          return this.embarqueId;
        }
      } catch (error) {
        this._creandoEmbarque = false;
        console.error("Error inesperado en guardarEmbarqueInicial:", error);
        return null;
      }
    },

    eliminarCliente(clienteId) {
      // Filtrar los productos para eliminar los del cliente seleccionado
      this.embarque.productos = this.embarque.productos.filter(p => p.clienteId !== clienteId);

      // Actualizar el estado para reflejar los cambios
      this.$forceUpdate();

      // Opcional: Agregar un mensaje a la lista de cambios
      this.cambios.push(`Cliente ${this.obtenerNombreCliente(clienteId)} eliminado`);
    },

    obtenerNombreCliente(clienteId) {
      const clienteEnLista = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      if (clienteEnLista) {
        return clienteEnLista.nombre;
      }
      // Buscar en los productos por si el cliente ya no está en la lista
      const productoConCliente = this.embarque.productos.find(p => p.clienteId.toString() === clienteId.toString());
      return productoConCliente ? productoConCliente.nombreCliente : 'Cliente Desconocido';
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
        this.resetearEmbarque();
        return;
      }

      const db = getFirestore();
      const embarqueRef = doc(db, "embarques", id);

      this.unsubscribe = onSnapshot(embarqueRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();

          // Cargar el estado de bloqueo
          this.embarqueBloqueado = data.embarqueBloqueado || false;

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

          let fecha;
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fecha = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fecha = data.fecha;
          } else if (typeof data.fecha === 'string') {
            fecha = new Date(data.fecha);
          } else {
            console.warn('Formato de fecha no reconocido, usando la fecha actual');
            fecha = new Date();
          }

          // Crear un Map con los clientes predefinidos
          const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id, c]));

          // Filtrar y mapear clientes
          this.clientesPersonalizados = data.clientes
            .filter(cliente => !clientesPredefinidosMap.has(cliente.id))
            .map(cliente => ({
              id: cliente.id,
              nombre: cliente.nombre,
              editable: true,
              personalizado: true,
              key: `personalizado_${cliente.id}`
            }));

          this.embarque = {
            fecha: fecha.toISOString().split('T')[0],
            cargaCon: data.cargaCon || '', // Cargamos el valor de cargaCon
            productos: data.clientes.flatMap(cliente => {
              const clienteInfo = clientesPredefinidosMap.get(cliente.id) || cliente;
              return cliente.productos.map(producto => ({
                ...producto,
                clienteId: cliente.id,
                nombreCliente: clienteInfo.nombre,
                restarTaras: producto.restarTaras || false,
              }));
            }),
            // Agregar los kilos crudos
            kilosCrudos: data.kilosCrudos || {}
          };

          // Verificar que cada cliente tenga al menos un producto
          const clientesIds = data.clientes.map(cliente => cliente.id.toString());
          clientesIds.forEach(clienteId => {
            // Verificar si existe al menos un producto para este cliente
            const existeProducto = this.embarque.productos.some(p => p.clienteId.toString() === clienteId);
            
            // Si no existe ningún producto para este cliente, crear uno
            if (!existeProducto) {
              const nuevoProducto = crearNuevoProducto(clienteId);
              
              // Buscar cliente info
              const clienteInfo = clientesPredefinidosMap.get(parseInt(clienteId)) || 
                                  data.clientes.find(c => c.id.toString() === clienteId);
              
              // Establecer datos básicos
              nuevoProducto.nombreCliente = clienteInfo ? clienteInfo.nombre : 'Cliente Desconocido';
              
              // Establecer tipo por defecto según el cliente
              this.setTipoDefaultParaCliente(nuevoProducto);
              
              // Agregar al embarque
              this.embarque.productos.push(nuevoProducto);
              console.log(`Se ha creado un producto para el cliente ${nuevoProducto.nombreCliente} que no tenía ninguno.`);
            }
          });

          // Cargar los crudos
          this.clienteCrudos = {};
          data.clientes.forEach(cliente => {
            if (cliente.crudos && cliente.crudos.length > 0) {
              this.$set(this.clienteCrudos, cliente.id, cliente.crudos);
            }
          });

          this.embarqueId = id;
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;
        } else {
          // Si el embarque no existe, limpiar localStorage y reiniciar estado
          localStorage.removeItem('embarque');
          localStorage.removeItem('ultimoEmbarqueId');
          localStorage.removeItem('ultimaRuta');
          // Opcional : localStorage.removeItem('clientesPersonalizados');
          alert('El embarque no existe o está corrupto. Se reiniciará el formulario para evitar errores.');
          this.resetearEmbarque();
        }
      }, (error) => {
        console.error("Error al escuchar cambios del embarque:", error);
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
      
      // Verificar si estamos en una recarga de página
      const esRecargaPagina = performance && performance.navigation && 
                              performance.navigation.type === 1;
      
      // Si es una recarga y tenemos un ID guardado en localStorage, no continuar
      // Ya que el mounted se encargará de redireccionar apropiadamente
      if (esRecargaPagina && localStorage.getItem('ultimoEmbarqueId')) {
        console.log("Recarga detectada con ID existente, no creando un nuevo embarque");
        return;
      }
      
      // Establecer una fecha por defecto (fecha actual)
      const fechaActual = new Date().toISOString().split('T')[0];
      
      try {
        const db = getFirestore();
        const embarquesRef = collection(db, "embarques");
        const snapshot = await getDocs(embarquesRef);
        
        // Primero verificar si hay duplicados y eliminarlos
        // Agrupar embarques por fecha para detectar duplicados
        const embarquesPorFecha = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          let fechaEmbarque;
          
          // Manejar diferentes formatos de fecha
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fechaEmbarque = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fechaEmbarque = data.fecha;
          } else if (typeof data.fecha === 'string') {
            fechaEmbarque = new Date(data.fecha);
          } else {
            return;
          }
          
          const fechaISO = fechaEmbarque.toISOString().split('T')[0];
          
          if (!embarquesPorFecha[fechaISO]) {
            embarquesPorFecha[fechaISO] = [];
          }
          
          embarquesPorFecha[fechaISO].push({
            id: doc.id,
            fecha: fechaISO,
            data: doc.data()
          });
        });
        
        // Verificar si ya existe un embarque con la fecha actual
        const embarquesConMismaFecha = embarquesPorFecha[fechaActual] || [];
        
        // Inicializar el embarque con la fecha actual o encontrar la siguiente fecha disponible
        let fechaEmbarque = fechaActual;
        
        if (embarquesConMismaFecha.length > 0) {
          // Si ya existe un embarque con la fecha actual, buscar la próxima fecha disponible
          let fechaTentativa = new Date(fechaActual);
          let fechaDisponible = false;
          
          // Probar con las siguientes 7 fechas
          for (let i = 1; i <= 7 && !fechaDisponible; i++) {
            fechaTentativa.setDate(fechaTentativa.getDate() + 1);
            const fechaTentativaISO = fechaTentativa.toISOString().split('T')[0];
            
            // Verificar si esta fecha tentativa ya está ocupada
            if (!embarquesPorFecha[fechaTentativaISO] || embarquesPorFecha[fechaTentativaISO].length === 0) {
              fechaDisponible = true;
              fechaEmbarque = fechaTentativaISO;
            }
          }
          
          if (!fechaDisponible) {
            // Si no se encontró una fecha disponible, mostrar mensaje y usar la fecha actual de todos modos
            console.warn('No se encontró una fecha disponible en los próximos 7 días');
            // No crear automáticamente un embarque, dejar que el usuario seleccione otra fecha
            this.embarque = {
              fecha: fechaActual, // Usar la fecha actual pero no crear automáticamente
              cargaCon: '',
              productos: [],
            };
            this.clientesJuntarMedidas = {};
            this.embarqueId = null;
            this.modoEdicion = false;
            this.guardadoAutomaticoActivo = false;
            this.embarqueBloqueado = false;
            this.clientesPersonalizados = [];
            
            // Informar al usuario si no se trata de una recarga
            if (!esRecargaPagina) {
              alert(`Ya existe un embarque para hoy y los próximos días. Por favor, seleccione manualmente una fecha diferente.`);
            }
            return;
          }
        }
        
        // Inicializar el embarque con la fecha disponible
        this.embarque = {
          fecha: fechaEmbarque,
          cargaCon: '',
          productos: [],
        };
        this.clientesJuntarMedidas = {};
        this.embarqueId = null;
        this.modoEdicion = false;
        this.guardadoAutomaticoActivo = false;
        this.embarqueBloqueado = false;
        this.clientesPersonalizados = []; // Reiniciar clientes personalizados

        // Agregar automáticamente los clientes predeterminados
        this.$nextTick(async () => {
          if (this.embarque.fecha) {
            try {
              // Antess sde crear un nuevo embarque, comprobar nuevamente si ya existe uno con esta fecha
              // Esta doblee verificación es crucial para evitar duplicados en cargas rápidas
              const verificacionRef = collection(db, "embarques");
              const verificacionSnapshot = await getDocs(verificacionRef);
              
              const existeEmbarqueConFecha = verificacionSnapshot.docs.some(doc => {
                const data = doc.data();
                let fechaDoc;
                
                if (data.fecha && typeof data.fecha.toDate === 'function') {
                  fechaDoc = data.fecha.toDate();
                } else if (data.fecha instanceof Date) {
                  fechaDoc = data.fecha;
                } else if (typeof data.fecha === 'string') {
                  fechaDoc = new Date(data.fecha);
                } else {
                  return false;
                }
                
                const fechaDocISO = fechaDoc.toISOString().split('T')[0];
                return fechaDocISO === this.embarque.fecha;
              });
              
              if (existeEmbarqueConFecha) {
                console.warn('Se detectó un embarque con la misma fecha durante la inicialización');
                alert('Ya existe un embarque para la fecha seleccionada. Se cancelará la creación automática.');
                return;
              }
              
              // Crear el embarque inicial con el primer cliente (Joselito)
              await this.guardarEmbarqueInicial(this.clientesPredefinidos[0].id.toString());

              // Esperar un momento para asegurar que el primer cliente se haya agregado correctamente
              await new Promise(resolve => setTimeout(resolve, 100));

              // Agregar el resto de clientes predeterminados
              for (let i = 1; i < this.clientesPredefinidos.length; i++) {
                // Crear un producto para cada cliente predeterminado
                const clienteId = this.clientesPredefinidos[i].id.toString();

                // Verificar si ya existe un producto para este cliente
                const existeProducto = this.embarque.productos.some(p => p.clienteId.toString() === clienteId);

                // Solo agregar si no existe
                if (!existeProducto) {
                  const nuevoProducto = crearNuevoProducto(clienteId);

                  // Establecer tipo por defecto según el cliente
                  this.setTipoDefaultParaCliente(nuevoProducto);

                  // Agregar directamente al embarque.productoss
                  this.embarque.productos.push(nuevoProducto);

                  // Esperar un momento entre cada adición
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
              }

              // Establecer el primer cliente como activo
              this.clienteActivo = this.clientesPredefinidos[0].id.toString();

              // Forzar la actualización del componente
              this.$forceUpdate();

              // Guardar los cambios
              this.guardarCambiosEnTiempoReal();
            } catch (error) {
              console.error("Error al crear clientes predeterminados:", error);
            }
          }
        });
      } catch (error) {
        console.error("Error al verificar fechas de embarques existentes:", error);
        // En caso de error, inicializar con valores por defecto pero sin crear automáticamente
        this.embarque = {
          fecha: fechaActual,
          cargaCon: '',
          productos: [],
        };
        this.clientesJuntarMedidas = {};
        this.embarqueId = null;
        this.modoEdicion = false;
        this.guardadoAutomaticoActivo = false;
        this.embarqueBloqueado = false;
        this.clientesPersonalizados = [];
      }
    },

    guardarCambiosEnTiempoReal: debounce(function () {
      if (!this.guardadoAutomaticoActivo || !this.embarqueId || 
          this.mostrarModalPrecio || this.mostrarModalHilos || 
          this.mostrarModalNota || this.mostrarModalAlt || 
          this.mostrarModalNombreAlternativo || this.mostrarModalNuevoCliente) return;

      // Crear una copia profunda de los datos antes de guardar
      const embarqueData = {
        ...JSON.parse(JSON.stringify(this.prepararDatosEmbarque())),
        clientesJuntarMedidas: { ...this.clientesJuntarMedidas }
      };

      const db = getFirestore();

      updateDoc(doc(db, "embarques", this.embarqueId), embarqueData)
        .then(() => {
          console.log('Cambios guardados automáticamente:', new Date().toLocaleString());
          this.$emit('guardado-automatico');
        })
        .catch((error) => {
          console.error("Error al guardar automáticamente:", error);
        });
    }, 2000),

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
      
      // Control para evitar múltiples guardados simultáneos
      if (this._guardandoEmbarque) {
        console.warn('Ya hay una operación de guardado en curso');
        return;
      }
      
      this._guardandoEmbarque = true;

      const embarqueData = this.prepararDatosEmbarque();
      const db = getFirestore();

      try {
        if (this.modoEdicion) {
          await updateDoc(doc(db, "embarques", this.embarqueId), embarqueData);
          alert('Embarque actualizado exitosamente.');
          this._guardandoEmbarque = false;
        } else {
          // Verificar primero si ya existe un embarque con la misma fecha
          const fechaSeleccionada = new Date(this.embarque.fecha);
          
          // Convertir a formato ISO para comparación (solo el año, mes y día)
          const fechaISO = fechaSeleccionada.toISOString().split('T')[0];
          
          // Obtener todos los embarques
          const embarquesRef = collection(db, "embarques");
          const snapshot = await getDocs(embarquesRef);
          
          // Buscar si ya existe un embarque con esta fecha
          const embarquesConMismaFecha = snapshot.docs.filter(doc => {
            const data = doc.data();
            let fechaEmbarque;
            
            // Manejar diferentes formatos de fecha
            if (data.fecha && typeof data.fecha.toDate === 'function') {
              fechaEmbarque = data.fecha.toDate();
            } else if (data.fecha instanceof Date) {
              fechaEmbarque = data.fecha;
            } else if (typeof data.fecha === 'string') {
              fechaEmbarque = new Date(data.fecha);
            } else {
              return false;
            }
            
            // Convertir a formato ISO para comparar solo año, mes y día
            const fechaEmbarqueISO = fechaEmbarque.toISOString().split('T')[0];
            
            // Comparar las fechas en formato ISO
            return fechaEmbarqueISO === fechaISO;
          });
          
          if (embarquesConMismaFecha.length > 0) {
            alert('Ya existe un embarque para la fecha seleccionada. Por favor, seleccione otra fecha.');
            this._guardandoEmbarque = false;
            return;
          }
          
          // Crear una "reserva" para esta fecha para evitar condiciones de carrera
          const reservaRef = doc(db, "reservas_fechas", fechaISO);
          await setDoc(reservaRef, {
            fecha: fechaISO,
            timestamp: serverTimestamp(),
            usuario: this.authStore.userId || 'anónimo',
            expiración: new Date(Date.now() + 60000) // Expira en 1 minuto
          });
          
          try {
            // Si no existe un embarque con la misma fecha, proceder a crear uno nuevo
            const docRef = await addDoc(collection(db, "embarques"), {
              ...embarqueData,
              ultimaEdicion: {
                userId: this.authStore.userId,
                username: this.authStore.user.username,
                timestamp: serverTimestamp()
              }
            });

            // Notificar a otros usuarios sobre el cambio
            const cambiosRef = ref(rtdb, `cambios/${docRef.id}`)
            await set(cambiosRef, {
              tipo: 'guardar',
              userId: this.authStore.userId,
              username: this.authStore.user.username,
              timestamp: serverTimestamp()
            });

            this.embarqueId = docRef.id;
            alert('Embarque creado exitosamente y guardado en la base de datos.');
            this.modoEdicion = true;
          } finally {
            // Eliminar la reserva una vez creado el embarque o en caso de error
            try {
              await deleteDoc(reservaRef);
            } catch (error) {
              console.error("Error al eliminar la reserva de fecha:", error);
              // No es crítico si falla esto, la reserva expirará automáticamente
            }
            
            this._guardandoEmbarque = false;
          }
        }
        this.guardadoAutomaticoActivo = true;
        this.$router.push('/lista-embarques');
      } catch (error) {
        this._guardandoEmbarque = false;
        console.error("Error al guardar el embarque: ", error);
        alert('Hubo un error al guardar el embarque. Por favor, intente nuevamente.');
      }
    },

    prepararDatosEmbarque() {
      console.log("Preparando datos del embarque:", this.embarque);
      
      const embarqueData = {
        fecha: new Date(this.embarque.fecha),
        cargaCon: this.embarque.cargaCon,
        clientes: [],
        clientesJuntarMedidas: this.clientesJuntarMedidas,
        embarqueBloqueado: this.embarqueBloqueado
      };

      const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id, c]));

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
          const clienteInfo = clientesPredefinidosMap.get(parseInt(clienteId)) || 
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
        const clientePredefinido = clientesPredefinidosMap.get(parseInt(clienteId));
        const clienteData = {
          id: clienteId,
          nombre: clientePredefinido ? clientePredefinido.nombre : this.obtenerNombreCliente(clienteId),
          productos: productos.map(producto => ({
            ...producto,
            restarTaras: producto.restarTaras || false,
            noSumarKilos: producto.noSumarKilos || false // Agregar esta línea
          })),
          crudos: this.clienteCrudos[clienteId] || []
        };
        embarqueData.clientes.push(clienteData);
      });

      console.log("Datos del embarque preparados:", embarqueData);
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
        // Crear una copia profunda del producto
        const productoActualizado = JSON.parse(JSON.stringify(producto));
        // Actualizar el producto en el array
        this.$set(this.embarque.productos, index, productoActualizado);

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

    // Métodos para modales
    // Modal Nuevo Cliente
    agregarNuevoCliente(cliente) {
      if (!cliente || !cliente.nombre) return;
      
      const nuevoCliente = {
        id: Date.now().toString(),
        nombre: cliente.nombre,
        color: cliente.color || this.nuevoClienteColor,
        editable: true,
        personalizado: true,
        key: `personalizado_${Date.now()}`
      };

      // Agregar a la lista de clientes personalizados
      this.clientesPersonalizados.push(nuevoCliente);

      // Crear un producto para este cliente
      const nuevoProducto = crearNuevoProducto(nuevoCliente.id);

      // Agregar el producto al embarque
      this.embarque.productos.push(nuevoProducto);

      // Guardar los cambios
      this.guardarClientesPersonalizados();
      this.guardarCambiosEnTiempoReal();
      this.mostrarModalNuevoCliente = false;

      // Seleccionar automáticamente el cliente recién creado
      this.seleccionarCliente(nuevoCliente.id);
    },

    // Modal de Nombre Alternativo
    abrirModalNombreAlternativo(producto) {
      this.productoSeleccionado = producto;
      this.mostrarModalNombreAlternativo = true;
    },

    guardarNombreAlternativo(nuevoNombre) {
      if (this.productoSeleccionado) {
        // Desactivar temporalmente el guardado automático
        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;

        if (nuevoNombre) {
          // Usar Vue.set para asegurar reactividad
          this.$set(this.productoSeleccionado, 'nombreAlternativoPDF', nuevoNombre);
        } else {
          this.$delete(this.productoSeleccionado, 'nombreAlternativoPDF');
        }

        // Forzar la actualización del producto
        this.actualizarProducto(this.productoSeleccionado);

        // Esperar a que Vue actualice el DOM
        this.$nextTick(() => {
          // Reactivar el guardado automático
          this.guardadoAutomaticoActivo = guardadoActivo;

          // Forzar un guardado inmediato
          this.guardarCambiosEnTiempoReal();

          // Cerrar el modal
          this.mostrarModalNombreAlternativo = false;
        });
      } else {
        this.mostrarModalNombreAlternativo = false;
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

    guardarPrecio(precio) {
      if (this.itemSeleccionado) {
        if (precio !== null) {
          this.$set(this.itemSeleccionado, 'precio', precio);
        } else {
          this.$delete(this.itemSeleccionado, 'precio');
        }
        
        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;

        this.$nextTick(() => {
          this.guardadoAutomaticoActivo = guardadoActivo;
          this.guardarCambiosEnTiempoReal();
        });
      }
      this.cerrarModalPrecio();
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

    guardarHilos(hilos) {
      if (this.itemSeleccionado) {
        // Si hilos está vacío, eliminamos la propiedad hilos del item
        if (!hilos) {
          this.$delete(this.itemSeleccionado, 'hilos');
        } else {
          this.$set(this.itemSeleccionado, 'hilos', hilos);
        }

        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;

        this.$nextTick(() => {
          this.guardadoAutomaticoActivo = guardadoActivo;
          this.guardarCambiosEnTiempoReal();
        });
      }
      this.cerrarModalHilos();
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

    guardarNota(nota) {
      if (this.itemSeleccionado) {
        if (nota) {
          this.$set(this.itemSeleccionado, 'nota', nota);
        } else {
          this.$delete(this.itemSeleccionado, 'nota');
        }

        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;

        this.$nextTick(() => {
          this.guardadoAutomaticoActivo = guardadoActivo;
          this.guardarCambiosEnTiempoReal();
        });
      }
      this.cerrarModalNota();
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

    guardarAlt(alt) {
      if (this.itemSeleccionado) {
        if (alt) {
          this.$set(this.itemSeleccionado, 'textoAlternativo', alt);
        } else {
          this.$delete(this.itemSeleccionado, 'textoAlternativo');
        }
        this.guardarCambiosEnTiempoReal();
      }
      this.cerrarModalAlt();
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
      // Obtener todas las medidas únicas del embarque actual
      const medidas = this.embarque.productos
        .map(p => p.medida)
        .filter(m => m && m.trim()) // Filtrar valores vacíos
        .filter((m, i, arr) => arr.indexOf(m) === i); // Eliminar duplicados
      this.medidasUsadas = medidas;
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

      // Guardar cambios inmediatamente
      this.actualizarProducto(producto);
    },

    onMedidaBlur(producto) {
      // Dar un pequeño delay antes de ocultar las sugerencias para permitir clicks
      setTimeout(() => {
        this.productoEditandoId = null;
      }, 200);

      // Solo quitar la marca de edición si tiene tanto medida como tipo
      // Permitir espacios en la validación
      if (producto.medida && producto.medida.length > 0 && producto.tipo) {
        producto.isEditing = false;
        producto.isNew = false;
      }
    },

    seleccionarMedida(producto, medida) {
      producto.medida = medida;
      this.productoEditandoId = null;
      this.actualizarProducto(producto);
    },

    onTallaCrudoChange(item) {
      // Asegurarse de que el item tenga todas las propiedades necesarias
      if (!item.medida) {
        item.medida = item.talla;
      }
      this.guardarCambiosEnTiempoReal();
    },

    // Métodos para la persistencia de clientes
    guardarClientesPersonalizados() {
      localStorage.setItem('clientesPersonalizados', JSON.stringify(this.clientesPersonalizados));
    },

    cargarClientesPersonalizados() {
      const clientesGuardados = localStorage.getItem('clientesPersonalizados');
      if (clientesGuardados) {
        // Solo cargar la lista de clientes personalizados disponibles
        // pero no agregarlos automáticamente al embarque
        this.clientesPersonalizados = JSON.parse(clientesGuardados);
      }
    },

    // Métodos relacionados con la interfaz de usuarios
    async escucharUsuariosActivos() {
      try {
        console.log('Iniciando escucha de usuarios activos');
        const statusRef = ref(rtdb, 'status');

        // Primero, asegurarse de que el usuario actual esté marcado como activo
        if (this.authStore.isLoggedIn && this.authStore.user) {
          console.log('Usuario autenticado:', this.authStore.user.username);
          const userStatusRef = ref(rtdb, `status/${this.authStore.userId}`);

          try {
            await set(userStatusRef, {
              username: this.authStore.user.username,
              status: 'online',
              lastSeen: new Date().toISOString()
            });
            console.log('Estado del usuario actualizado correctamente');
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
          clienteCrudos: { [joselitoClienteId]: clienteCrudos }
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
          clienteCrudos: { [catarroClienteId]: clienteCrudos }
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
        const db = getFirestore();
        
        // Convertir la nueva fecha para consistencia en la comparación
        const fechaSeleccionada = new Date(nuevaFecha);
        const fechaISO = fechaSeleccionada.toISOString().split('T')[0];
        
        // Obtener todos los embarques
        const embarquesRef = collection(db, "embarques");
        const snapshot = await getDocs(embarquesRef);
        
        // Buscar si ya existe un embarque con esta fecha
        const embarquesConMismaFecha = snapshot.docs.filter(doc => {
          // No incluir el embarque actual en la comparación
          if (this.embarqueId && doc.id === this.embarqueId) {
            return false;
          }
          
          const data = doc.data();
          let fechaEmbarque;
          
          // Manejar diferentes formatos de fecha
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fechaEmbarque = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fechaEmbarque = data.fecha;
          } else if (typeof data.fecha === 'string') {
            fechaEmbarque = new Date(data.fecha);
          } else {
            return false;
          }
          
          // Convertir a formato ISO para comparar solo año, mes y día
          const fechaEmbarqueISO = fechaEmbarque.toISOString().split('T')[0];
          
          // Comparar las fechas en formato ISO
          return fechaEmbarqueISO === fechaISO;
        });
        
        if (embarquesConMismaFecha.length > 0) {
          alert('Ya existe un embarque para la fecha seleccionada. Por favor, seleccione otra fecha.');
          return;
        }
        
        // Guardar el ID del embarque actual antes de cambiar la fecha
        // Esto es crucial para recargas de página
        if (this.embarqueId) {
          localStorage.setItem('ultimoEmbarqueId', this.embarqueId);
        }
        
        // Si no existe un embarque con la misma fecha, actualizar la fecha
        this.embarque.fecha = nuevaFecha;
        
        // Si estamos en modo edición, guardar los cambios inmediatamente
        if (this.modoEdicion && this.embarqueId) {
          this.guardarCambiosEnTiempoReal();
        }
      } catch (error) {
        console.error("Error al verificar fecha existente:", error);
        alert('Hubo un error al verificar la fecha. Por favor, intente nuevamente.');
      }
    },

    // Método para crear cuenta de Catarro
    async crearCuentaCatarro(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        
        // Asegurar que el ID de cliente sea '2' para Catarro
        const catarroClienteId = '2';
        
        const embarqueCliente = { 
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { [catarroClienteId]: clienteCrudos }
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

    // Método para crear cuenta de Ozuna
    async crearCuentaOzuna(clienteId, clienteProductos, clienteCrudos) {
      try {
        this.isCreatingAccount = true;
        
        // Asegurar que el ID de cliente sea '4' para Ozuna
        const ozunaClienteId = '4';
        
        const embarqueCliente = { 
          ...this.embarque,
          productos: clienteProductos,
          clienteCrudos: { [ozunaClienteId]: clienteCrudos }
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

    // Sincronizar cambios pendientes al reconectarr
    syncOffline() {
      if (this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      } else {
        // Si aún no existe en Firestore, crearlo
        this.guardarEmbarque().catch(error => console.error('Error al sincronizar embarque offline:', error));
      }
    },
  },

  watch: {
    embarque: {
      handler(nuevoValor) {
        if (this.isUndoRedo) {
          this.isUndoRedo = false;
          return;
        }
        localStorage.setItem('embarque', JSON.stringify(nuevoValor));
        this.undoStack.push(JSON.stringify(nuevoValor));
        this.redoStack = [];

        // Llamar al método de guardado automático
        this.guardarCambiosEnTiempoReal();
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
    }
  },

  async created() {
    // Si estamos offline y hay datos guardados, cargar desde localStorage
    const localEmbarque = localStorage.getItem('embarque');
    if (!navigator.onLine && localEmbarque) {
      this.embarque = JSON.parse(localEmbarque);
      const localCrudos = localStorage.getItem('clienteCrudos');
      if (localCrudos) this.clienteCrudos = JSON.parse(localCrudos);
      this.undoStack.push(JSON.stringify(this.embarque));
      this.actualizarMedidasUsadas();
      this.cargarClientesPersonalizados();
      this.guardadoAutomaticoActivo = true;
      // Escuchar reconexión para sincronizar cambios con Firestore
      window.addEventListener('online', this.syncOffline);
      return;
    }
    const embarqueId = this.$route.params.id;
    await this.cargarEmbarque(embarqueId);
    this.undoStack.push(JSON.stringify(this.embarque));
    this.actualizarMedidasUsadas();
    this.cargarClientesPersonalizados();
    await this.iniciarPresenciaUsuario();
    this.escucharUsuariosActivos();
  },

  mounted() {
    // Detectar si es una recarga de página
    const esRecarga = this.detectarRecarga();
    
    // Si hay un ID de embarque en los parámetros, cargar ese embarque
    const embarqueId = this.$route.params.id;
    
    // Si estamos recargando la página pero ya teníamos un ID de embarque en la URL
    if (embarqueId && embarqueId !== 'nuevo') {
      // Cargar el embarque existente
      this.cargarEmbarque(embarqueId);
    } else {
      // Verificar si hay un ID guardado en localStorage (para casos de recarga)
      const ultimoEmbarqueId = localStorage.getItem('ultimoEmbarqueId');
      const ultimaRuta = localStorage.getItem('ultimaRuta');
      
      // Si venimos de recargar la página mientras editábamos un embarque específico
      if (esRecarga && ultimoEmbarqueId && ultimaRuta && ultimaRuta.includes('nuevo-embarque')) {
        console.log(`Detectada recarga de página, restaurando embarque ${ultimoEmbarqueId}`);
        // Redirigir a la ruta correcta con el ID adecuado
        this.$router.replace({ name: 'NuevoEmbarque', params: { id: ultimoEmbarqueId } });
        return; // Detener la ejecución, ya que la redirección cargará nuevamente el componente
      } else if (embarqueId === 'nuevo') {
        // Si específicamente se solicita un nuevo embarque, reiniciar
        this.resetearEmbarque();
      } else {
        // Comportamiento predeterminado: crear un nuevo embarque
        this.resetearEmbarque();
      }
    }
    
    // Guardar esta ruta y su ID para futuras recargas
    localStorage.setItem('ultimaRuta', window.location.pathname);
    if (embarqueId && embarqueId !== 'nuevo') {
      localStorage.setItem('ultimoEmbarqueId', embarqueId);
    }
    
    // Cargar los clientes personalizados
    this.cargarClientesPersonalizados();
    
    // Iniciar presencia después de cargar todo
    if (this.authStore.user && this.embarqueId) {
      this.iniciarPresencia();
    }
    
    // Configurar el escuchador para el evento beforeunload
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    // Agregar este evento para actualizar los crudos cuando se modifiquen los inputs
    this.$nextTick(() => {
      const crudosInputs = document.querySelectorAll('.crudo input, .crudo select');
      crudosInputs.forEach(input => {
        input.addEventListener('input', this.actualizarCrudos);
      });
    });
  },

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

  // También añadimos el método handleBeforeUnload si no existe
  handleBeforeUnload(event) {
    // Guardar el ID del embarque actual antes de recargar
    if (this.embarqueId) {
      localStorage.setItem('ultimoEmbarqueId', this.embarqueId);
      localStorage.setItem('ultimaRuta', window.location.pathname);
    }
  },

  beforeDestroy() {
    // Cancelar la suscripción a los cambios en tiempo real
    if (this.unsubscribe) {
      this.unsubscribe();
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
    // Eliminar console.log
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
  background-color: rgba(155, 89, 182, 0.1);
  border-left: 4px solid #9b59b6;
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
</style>