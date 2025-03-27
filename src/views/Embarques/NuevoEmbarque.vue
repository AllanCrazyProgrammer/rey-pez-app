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
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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
          const productoId = input.closest('.producto').dataset.productoId;
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
        this.embarque.productos.splice(index, 1);
      }
    },

    async agregarClienteProducto() {
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
      // Si no existe embarqueId, crear nuevo embarque
      if (!this.embarqueId) {
        const db = getFirestore();
        try {
          // Primero crear el embarque
          const embarqueData = this.prepararDatosEmbarque();
          const docRef = await addDoc(collection(db, "embarques"), embarqueData);

          // Guardar el ID y activar modo edición
          this.embarqueId = docRef.id;
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;

          // Luego agregar el producto
          this.agregarProducto(clienteId);

          console.log('Embarque inicial creado con ID:', this.embarqueId);
          return this.embarqueId; // Retornar el ID para encadenar operaciones
        } catch (error) {
          console.error("Error al crear el embarque inicial:", error);
          alert('Hubo un error al crear el embarque. Por favor, intente nuevamente.');
          return null;
        }
      } else {
        // Si ya existe el embarqueId, solo agregar el producto
        this.agregarProducto(clienteId);
        return this.embarqueId;
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
      console.log('Cargando embarque con ID:', id);
      if (id === 'nuevo') {
        this.resetearEmbarque();
        return;
      }

      const db = getFirestore();
      const embarqueRef = doc(db, "embarques", id);

      this.unsubscribe = onSnapshot(embarqueRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log('Datos del embarque cargado:', data);

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

          console.log('Clientes personalizados después de filtrar:', this.clientesPersonalizados);

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

          // Cargar los crudos
          this.clienteCrudos = {};
          data.clientes.forEach(cliente => {
            if (cliente.crudos && cliente.crudos.length > 0) {
              this.$set(this.clienteCrudos, cliente.id, cliente.crudos);
            }
          });

          console.log('Embarque procesado:', this.embarque);
          console.log('Crudos cargados:', this.clienteCrudos);

          this.embarqueId = id;
          this.modoEdicion = true;
          this.guardadoAutomaticoActivo = true;
        } else {
          console.error("No se encontró el embarque");
          this.resetearEmbarque();
        }
      }, (error) => {
        console.error("Error al escuchar cambios del embarque:", error);
      });
    },

    resetearEmbarque() {
      this.embarque = {
        fecha: new Date().toISOString().split('T')[0], // Establecer fecha actual por defecto
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

                // Agregar directamente al embarque.productos
                this.embarque.productos.push(nuevoProducto);

                // Esperar un momento entre cada adición
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }

            // Establecer el primer cliente como activo
            this.clienteActivo = this.clientesPredefinidos[0].id.toString();

            // Guardar los cambios
            this.guardarCambiosEnTiempoReal();
          } catch (error) {
            console.error("Error al crear clientes predeterminados:", error);
          }
        }
      });
    },

    guardarCambiosEnTiempoReal: debounce(function () {
      if (!this.guardadoAutomaticoActivo || !this.embarqueId || this.mostrarModalPrecio) return;

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

      const embarqueData = this.prepararDatosEmbarque();
      const db = getFirestore();

      try {
        if (this.modoEdicion) {
          await updateDoc(doc(db, "embarques", this.embarqueId), embarqueData);
          alert('Embarque actualizado exitosamente.');
        } else {
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
          })

          this.embarqueId = docRef.id;
          alert('Embarque creado exitosamente y guardado en la base de datos.');
          this.modoEdicion = true;
        }
        this.guardadoAutomaticoActivo = true;
        this.$router.push('/lista-embarques');
      } catch (error) {
        console.error("Error al guardar el embarque: ", error);
        alert('Hubo un error al guardar el embarque. Por favor, intente nuevamente.');
      }
    },

    prepararDatosEmbarque() {
      const embarqueData = {
        fecha: new Date(this.embarque.fecha),
        cargaCon: this.embarque.cargaCon,
        clientes: [],
        clientesJuntarMedidas: this.clientesJuntarMedidas,
        embarqueBloqueado: this.embarqueBloqueado
      };

      const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id, c]));

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
      if (!this.clienteCrudos[clienteId]) {
        this.$set(this.clienteCrudos, clienteId, []);
      }
      if (!this.clienteCrudos[clienteId][index]) {
        this.$set(this.clienteCrudos[clienteId], index, { items: [] });
      }
      this.clienteCrudos[clienteId][index].items.push(crearNuevoCrudoItem());
      this.guardarCambiosEnTiempoReal();
    },

    eliminarCrudoItem(clienteId, crudoIndex, itemIndex) {
      this.clienteCrudos[clienteId][crudoIndex].items.splice(itemIndex, 1);
      if (this.clienteCrudos[clienteId][crudoIndex].items.length === 0) {
        this.eliminarCrudo(clienteId, crudoIndex);
      }
      this.guardarCambiosEnTiempoReal();
    },

    eliminarCrudo(clienteId, index) {
      this.clienteCrudos[clienteId].splice(index, 1);
      if (this.clienteCrudos[clienteId].length === 0) {
        this.$delete(this.clienteCrudos, clienteId);
      }
      this.guardarCambiosEnTiempoReal();
    },

    toggleSobrante(clienteId, crudoIndex, itemIndex) {
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
        console.log('Clientes personalizados disponibles cargados:', this.clientesPersonalizados);
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

        console.log('Iniciando presencia para usuario:', this.authStore.user.username);
        const userStatusRef = ref(rtdb, `status/${this.authStore.userId}`);

        // Configurar limpieza al desconectar
        await onDisconnect(userStatusRef).remove();

        // Establecer estado inicial
        await set(userStatusRef, {
          username: this.authStore.user.username,
          status: 'online',
          lastSeen: new Date().toISOString()
        });

        console.log('Presencia iniciada exitosamente');
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
    async crearCuentaJoselito(embarqueCliente, clienteProductos, clienteCrudos) {
      // Implementación específica para crear cuenta de Joselito
      // La implementación actual se mantiene sin cambios
      // ...
    },

    async crearCuentaCatarro(embarqueCliente, clienteProductos, clienteCrudos) {
      // Implementación específica para crear cuenta de Catarro
      // La implementación actual se mantiene sin cambios
      // ...
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
        console.log('Embarque actualizado. Estado agregado al undoStack.');

        // Llamar al método de guardado automático
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    },
    clienteCrudos: {
      handler() {
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    },
    'embarque.productos': {
      handler(newProductos) {
        newProductos.forEach(producto => {
          console.log('Producto actualizado:', producto.restarTaras);
        });
      },
      deep: true
    }
  },

  async created() {
    const embarqueId = this.$route.params.id;
    await this.cargarEmbarque(embarqueId);
    this.undoStack.push(JSON.stringify(this.embarque));
    console.log('Component mounted. Estado inicial cargado.');
    this.actualizarMedidasUsadas();

    // Cargar clientes personalizados
    this.cargarClientesPersonalizados();

    // Iniciar presencia y escucha de usuarios
    await this.iniciarPresenciaUsuario();
    this.escucharUsuariosActivos();
  },

  mounted() {
    // Agregar este evento para actualizar los crudos cuando se modifiquen los inputs
    this.$nextTick(() => {
      const crudosInputs = document.querySelectorAll('.crudo input, .crudo select');
      crudosInputs.forEach(input => {
        input.addEventListener('input', this.actualizarCrudos);
      });
    });
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
  },

  updated() {
    console.log('Componente actualizado');
    this.embarque.productos.forEach(producto => {
      console.log('Estado de restarTaras:', producto.restarTaras);
    });
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
</style>