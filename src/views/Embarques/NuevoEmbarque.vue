<template>
  <div class="nuevo-embarque-container">

    <Sidebar :embarque="embarque" :clientesPredefinidos="clientesPredefinidos"
      :clientesPersonalizadosEmbarque="clientesPersonalizadosEmbarque" :clienteCrudos="clienteCrudos"
      :clienteActivo="clienteActivo" @seleccionar-cliente="clienteActivo = $event"
      @toggle-sidebar="sidebarCollapsed = $event" @mostrar-modal-nuevo-cliente="mostrarModalNuevoCliente = true" />


    <div class="nuevo-embarque">

      <header-embarque :modo-edicion="modoEdicion" :embarque-bloqueado="embarqueBloqueado" :embarque="embarque"
        :is-generating-pdf="isGeneratingPdf" :pdf-type="pdfType" :embarque-id="embarqueId"
        @volver="volverAEmbarquesMenu" @toggle-bloqueo="toggleBloqueo" @update:fecha="embarque.fecha = $event"
        @update:cargaCon="embarque.cargaCon = $event" @generar-taras="generarPDF('taras')"
        @generar-resumen="generarPDF('resumen')" />


      <div class="botones-undo-redo">
        <button type="button" @click="undo" :disabled="undoStack.length <= 1"
          class="btn btn-secondary btn-sm">Deshacer</button>
        <button type="button" @click="redo" :disabled="redoStack.length === 0"
          class="btn btn-secondary btn-sm">Rehacer</button>
      </div>

      <form @submit.prevent="guardarEmbarque" @keydown.enter.prevent>
        <ClienteProductos v-for="(clienteProductos, clienteId) in productosPorCliente" :key="clienteId"
          :cliente-id="clienteId" :productos="clienteProductos" :crudos="clienteCrudos[clienteId] || []"
          :clientes-juntar-medidas="clientesJuntarMedidas" :nombre-cliente="obtenerNombreCliente(clienteId)"
          :cliente-activo="clienteActivo" :embarque-bloqueado="embarqueBloqueado" :medidas-usadas="medidasUsadas"
          :is-generating-pdf="isGeneratingPdf" :pdf-type="pdfType" :is-creating-account="isCreatingAccount"
          @update:productos="actualizarProductosCliente(clienteId, $event)"
          @update:crudos="actualizarCrudosCliente(clienteId, $event)" @juntarMedidas-change="handleJuntarMedidasChange"
          @eliminar-cliente="eliminarCliente" @eliminar-producto="eliminarProducto" @eliminar-crudo="eliminarCrudo"
          @eliminar-crudo-item="eliminarCrudoItem" @agregar-producto="agregarProducto" @agregar-crudo="agregarCrudo"
          @agregar-crudo-item="agregarCrudoItem" @toggle-sobrante="toggleSobrante"
          @mostrar-modal-precio="abrirModalPrecio" @mostrar-modal-hilos="abrirModalHilos"
          @mostrar-modal-nota="abrirModalNota" @mostrar-modal-nombre-alternativo="abrirModalNombreAlternativo"
          @mostrar-modal-alt="abrirModalAlt" @seleccionar-medida="seleccionarMedida" @generar-pdf="generarPDF"
          @crear-cuenta-joselito="crearCuentaJoselito" @crear-cuenta-catarro="crearCuentaCatarro" />
      </form> <!-- Cerrando el form que se abrió para guardarEmbarque -->
    </div> <!-- Cerrando nuevo-embarque-container -->

    <!-- Modal para agregar nuevo cliente -->
    <div class="modal-overlay" v-if="mostrarModalNuevoCliente" @click.self="cerrarModalNuevoCliente">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Agregar Nuevo Cliente</h3>
          <button @click="cerrarModalNuevoCliente" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="nombreCliente">Nombre del Cliente:</label>
            <input type="text" id="nombreCliente" v-model="nuevoClienteNombre" class="form-control"
              placeholder="Ingrese el nombre del cliente" @keyup.enter="agregarNuevoCliente">
          </div>

        </div>
        <div class="modal-footer">
          <button @click="cerrarModalNuevoCliente" class="btn btn-secondary">Cancelar</button>
          <button @click="agregarNuevoCliente" class="btn btn-primary">Agregar</button>
        </div>
      </div>
    </div>

    <!-- Modal para cambiar nombre alternativo para PDF -->
    <div class="modal-overlay" v-if="mostrarModalNombreAlternativo" @click.self="cerrarModalNombreAlternativo">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Nombre para PDF</h3>
          <button @click="cerrarModalNombreAlternativo" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="nombreAlternativoPDF">Nombre que aparecerá en el PDF:</label>
            <input type="text" id="nombreAlternativoPDF" v-model="nombreAlternativoTemp" class="form-control"
              placeholder="Ingrese el nombre para el PDF" @keyup.enter="guardarNombreAlternativo"
              ref="nombreAlternativoInput">
            <small class="form-text text-muted">
              Este nombre solo se mostrará en el PDF generado. El nombre original se mantendrá en la aplicación.
            </small>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalNombreAlternativo" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarNombreAlternativo" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para precio -->
    <div class="modal-overlay" v-if="mostrarModalPrecio" @click.self="cerrarModalPrecio">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Establecer Precio</h3>
          <button @click="cerrarModalPrecio" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="precioInput">Precio:</label>
            <input type="number" id="precioInput" v-model="precioTemp" class="form-control"
              placeholder="Ingrese el precio" @keyup.enter="guardarPrecio" ref="precioInput">
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalPrecio" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarPrecio" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para hilos -->
    <div class="modal-overlay" v-if="mostrarModalHilos" @click.self="cerrarModalHilos">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Establecer Hilos</h3>
          <button @click="cerrarModalHilos" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="hilosInput">Hilos:</label>
            <input type="text" id="hilosInput" v-model="hilosTemp" class="form-control" placeholder="Ingrese los hilos"
              @keyup.enter="guardarHilos" ref="hilosInput">
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalHilos" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarHilos" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para notas -->
    <div class="modal-overlay" v-if="mostrarModalNota" @click.self="cerrarModalNota">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Establecer Nota</h3>
          <button @click="cerrarModalNota" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="notaInput">Nota:</label>
            <textarea id="notaInput" v-model="notaTemp" class="form-control" placeholder="Ingrese la nota"
              @keyup.enter="guardarNota" ref="notaInput"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalNota" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarNota" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para Alt (nombre alternativo para PDF) -->
    <div class="modal-overlay" v-if="mostrarModalAlt" @click.self="cerrarModalAlt">
      <div class="modal-contenido">
        <div class="modal-header">
          <h3>Nombre Alternativo para PDF</h3>
          <button @click="cerrarModalAlt" class="btn-cerrar-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="altInput">Nombre alternativo:</label>
            <input type="text" id="altInput" v-model="altTemp" class="form-control"
              placeholder="Ingrese el nombre alternativo para PDF" @keyup.enter="guardarAlt" ref="altInput">
            <small class="form-text text-muted">
              Este nombre solo se mostrará en el PDF de resumen de embarque.
            </small>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cerrarModalAlt" class="btn btn-secondary">Cancelar</button>
          <button @click="guardarAlt" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </div>
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
import ClienteProductos from './components/ClienteProductos.vue';






// Lazy loaded components
const Rendimientos = defineAsyncComponent(() => import('./Rendimientos.vue'))





export default {

  mixins: [
    // otros mixins que ya tengas
    pdfGenerationMixin
  ],



  name: 'NuevoEmbarque',
  components: {
    Rendimientos,
    Sidebar,
    HeaderEmbarque,
    ClienteProductos
  },
  setup() {
    const authStore = useAuthStore();
    return { authStore };
  },
  data() {
    return {
      usuariosActivos: [],
      clientesJuntarMedidas: {},
      clientesPredefinidos: [
        { id: 1, nombre: 'Joselito', color: '#3498db', textColor: 'white' },
        { id: 2, nombre: 'Catarro', color: '#e74c3c', textColor: 'white' },
        { id: 3, nombre: 'Otilio', color: '#f1c40f', textColor: 'black' },
        { id: 4, nombre: 'Ozuna', color: '#2ecc71', textColor: 'white' },
      ],
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
      mostrarModalPrecio: false,
      precioTemp: '',
      itemSeleccionado: null,
      mostrarModalHilos: false,
      hilosTemp: '',
      juntarMedidas: false,
      mostrarModalNota: false,
      notaTemp: '',
      mostrarModalNombreAlternativo: false,
      nombreAlternativoTemp: '',
      productoSeleccionado: null,
      productoEditandoId: null,
      mostrarModalAlt: false,
      altTemp: '',
      clientesOffsets: {},
      embarqueBloqueado: false,
      clienteActivo: null,
      sidebarCollapsed: false,
      mostrarModalNuevoCliente: false,
      nuevoClienteNombre: '',
      nuevoClienteColor: '#007bff',
      // New properties for PDF generation
      isGeneratingPdf: false,
      pdfType: null,
      isCreatingAccount: false,
    };
  },
  clientesJuntarMedidas: {},

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
      // Eliminar la verificación que impide agregar múltiples productos para el mismo cliente
      // const existeProductoParaCliente = this.embarque.productos.some(p => p.clienteId.toString() === clienteId.toString());

      // if (existeProductoParaCliente) {
      //   console.log(`Ya existe un producto para el cliente ${clienteId}`);
      //   return;
      // }

      const nuevoProducto = {
        id: Date.now(),
        clienteId: clienteId,
        medida: '',
        tipo: '',
        tipoPersonalizado: '',
        taras: [],
        kilos: [],
        reporteTaras: [],
        reporteBolsas: [],
        tarasExtra: [],
        restarTaras: true,
        camaronNeto: 0.65,
        multiplicadorBolsas: 1,
        showSuggestions: false,
        esVenta: false,
        isEditing: true,
        isNew: true,
        noSumarKilos: false
      };

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
    agregarTara(producto) {
      producto.taras.push(null);
      producto.kilos.push(null);
    },
    eliminarTara(producto, index) {
      producto.taras.splice(index, 1);
      producto.kilos.splice(index, 1);
    },
    totalTaras(producto) {
      console.log('Taras normales:', producto.taras);
      console.log('Taras extra:', producto.tarasExtra);
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
      console.log('Total taras:', tarasNormales + tarasExtra);
      return tarasNormales + tarasExtra;
    },
    totalKilos(producto) {
      console.log('Kilos:', producto.kilos);
      console.log('Restar taras:', producto.restarTaras);
      const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (kilo || 0), 0);
      const sumaTarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
      // No incluimos las taras extra en el descuento
      const descuentoTaras = producto.restarTaras ? sumaTarasNormales * 3 : 0;
      const resultado = Number((sumaKilos - descuentoTaras).toFixed(1));
      console.log('Total kilos:', resultado);
      return resultado;
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
                const nuevoProducto = {
                  id: Date.now() + i,
                  clienteId: clienteId,
                  medida: '',
                  tipo: '',
                  tipoPersonalizado: '',
                  taras: [],
                  kilos: [],
                  reporteTaras: [],
                  reporteBolsas: [],
                  tarasExtra: [],
                  restarTaras: true,
                  camaronNeto: 0.65,
                  multiplicadorBolsas: 1,
                  showSuggestions: false,
                  esVenta: false,
                  isEditing: true,
                  isNew: true,
                  noSumarKilos: false
                };

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
    }, 2000), // Aumentar el tiempo del debounce a 2000ms

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
    // Agregar este nuevo método
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
    agregarReporteTara(producto) {
      if (!Array.isArray(producto.reporteTaras)) {
        this.$set(producto, 'reporteTaras', []);
      }
      if (!Array.isArray(producto.reporteBolsas)) {
        this.$set(producto, 'reporteBolsas', []);
      }
      producto.reporteTaras.push(null);
      producto.reporteBolsas.push(null);
    },
    eliminarReporteTara(producto, index) {
      producto.reporteTaras.splice(index, 1);
      producto.reporteBolsas.splice(index, 1);
    },
    obtenerTipoProducto(producto) {
      if (producto.tipo === 'otro') {
        return producto.tipoPersonalizado || 'Otro';
      }
      return producto.tipo || 'Sin Tipo';
    },




    calcularAlturaCliente(productos, crudos) {
      try {
        // Altura base para el header del cliente
        let altura = 40;

        // Altura para la tabla de productos
        if (Array.isArray(productos) && productos.length > 0) {
          altura += 30; // Header de la tabla
          altura += productos.length * 25; // Cada fila de producto
        }

        // Altura para la tabla de crudos
        if (Array.isArray(crudos) && crudos.length > 0) {
          altura += 30; // Header de la tabla
          altura += crudos.reduce((total, crudo) => {
            if (crudo && Array.isArray(crudo.items)) {
              return total + (crudo.items.length * 25); // Cada fila de crudo
            }
            return total;
          }, 0);
        }

        // Margen entre clientes
        altura += 20;

        return altura;
      } catch (error) {
        console.error('Error en calcularAlturaCliente:', error);
        return 60; // Retornar altura base en caso de error
      }
    },

    generarContenidoCliente(clienteId, productos, crudos, colorCliente) {
      const nombreCliente = this.obtenerNombreCliente(clienteId);
      const totalTarasCliente = productos.reduce((sum, p) => sum + this.totalTaras(p), 0);
      const totalKilosCliente = productos.reduce((sum, p) => sum + this.totalKilos(p), 0);

      // Calcular totales de crudos
      const crudosTotalKilos = crudos.reduce((sum, crudo) => {
        return sum + crudo.items.reduce((itemSum, item) => {
          return itemSum + this.calcularKilosCrudos(item);
        }, 0);
      }, 0);

      const crudosTotalTaras = crudos.reduce((sum, crudo) => {
        return sum + crudo.items.reduce((itemSum, item) => {
          return itemSum + this.calcularTarasCrudos(item);
        }, 0);
      }, 0);

      // Formatear el total de kilos para eliminar decimales innecesarios
      const totalKilosFormateado = (totalKilosCliente + crudosTotalKilos).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      });

      const contenido = [{
        table: {
          widths: ['*', 200],
          body: [[
            {
              text: nombreCliente,
              style: 'clienteHeader',
              fillColor: colorCliente
            },
            {
              text: `Total: ${totalTarasCliente + crudosTotalTaras}T | ${totalKilosFormateado}Kg`,
              style: 'total',
              fillColor: colorCliente,
              alignment: 'right'
            }
          ]]
        },
        margin: [0, 10, 0, 0]
      }];

      // Verificar si hay crudos para determinar el layout
      const hayCrudos = crudos && crudos.length > 0 && crudos.some(crudo => crudo.items && crudo.items.length > 0);

      // Si hay productos, crear la tabla de productos
      if (productos.length > 0) {
        const tablaProductos = {
          table: {
            headerRows: 1,
            widths: hayCrudos ? [190, 50, 85] : [200, 80, 120],
            body: [
              [
                { text: 'Medida', style: 'tableHeader', fontSize: 20 },
                { text: 'Kg', style: 'tableHeader', fontSize: 20 },
                { text: 'Taras', style: 'tableHeader', fontSize: 20 }
              ],
              ...productos.map(producto => {
                // Formatear los kilos para el producto
                const kilos = producto.tipo === 'c/h20' ?
                  this.calcularKilosProductoCH20(producto) :
                  this.totalKilos(producto);

                const kilosFormateados = kilos.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1
                });

                // Construir el texto de la medida con el precio
                const medidaTexto = [
                  { text: producto.medida || '', fontSize: 18 }
                ];

                // Agregar el tipo si existe
                if (producto.tipo === 'c/h20') {
                  medidaTexto.push(
                    { text: ' c/h20', color: '#3498db', fontSize: 18 },
                    { text: ` (${producto.camaronNeto || 0.65})`, color: '#3498db', fontSize: 18 }
                  );
                } else if (producto.tipo === 'otro') {
                  medidaTexto.push({ text: ` ${producto.tipoPersonalizado}`, fontSize: 18 });
                } else if (producto.tipo) {
                  medidaTexto.push({ text: ` ${producto.tipo}`, fontSize: 18 });
                }

                // Agregar el precio si existe
                if (producto.precio) {
                  medidaTexto.push({ text: ` $${producto.precio}`, color: '#27ae60', fontSize: 18 });
                }

                return [
                  {
                    text: medidaTexto,
                    fontSize: 18
                  },
                  {
                    text: kilosFormateados,
                    fontSize: 18
                  },
                  {
                    text: `${this.totalTaras(producto)}-${this.generarDetallesProductoCompacto(producto)}`,
                    fontSize: 18
                  }
                ];
              })
            ]
          },
          margin: [0, 5, hayCrudos ? 5 : 0, 10]
        };

        if (hayCrudos) {
          // Si hay crudos, usar el layout de columnas
          contenido.push({
            columns: [
              {
                width: '*',
                stack: [tablaProductos]
              },
              {
                width: '*',
                stack: [{
                  table: {
                    headerRows: 1,
                    widths: [45, 55, 25, 40],
                    body: [
                      [
                        { text: 'Talla', style: 'crudosHeader', fontSize: 20 },
                        { text: 'Barco', style: 'crudosHeader', fontSize: 20 },
                        { text: 'T', style: 'crudosHeader', fontSize: 20 },
                        { text: 'Kg', style: 'crudosHeader', fontSize: 20 }
                      ],
                      ...crudos.flatMap(crudo =>
                        crudo.items.map(item => [
                          {
                            text: [
                              { text: this.formatearTallaCrudo(item.talla), fontSize: 18 },
                              item.precio ? { text: `\n$${item.precio}`, color: '#27ae60', fontSize: 18 } : ''
                            ],
                            fontSize: 18
                          },
                          { text: item.barco, fontSize: 18 },
                          { text: this.calcularTarasCrudos(item), fontSize: 18 },
                          { text: this.calcularKilosCrudos(item).toFixed(0), fontSize: 18 }
                        ])
                      )
                    ]
                  },
                  margin: [5, 5, 0, 10]
                }]
              }
            ]
          });
        } else {
          // Si no hay crudos, agregar solo la tabla de productos a todo el ancho
          contenido.push(tablaProductos);
        }
      }

      return contenido;
    },

    // Método auxiliar para generar detalles compactos
    generarDetallesProductoCompacto(producto) {
      let detalles = [];

      if (producto.reporteTaras && producto.reporteTaras.length > 0) {
        const reporteCombinado = this.combinarTarasBolsasCompacto(producto.reporteTaras, producto.reporteBolsas);
        if (reporteCombinado) detalles.push(reporteCombinado);
      }

      if (producto.esVenta) {
        detalles.push('V');
      }

      return detalles.join('|');
    },

    // Nuevo método para combinar taras y bolsas de forma más compacta
    combinarTarasBolsasCompacto(taras, bolsas) {
      const combinado = {};

      taras.forEach((tara, index) => {
        const bolsa = bolsas[index] || '';
        const key = bolsa;
        combinado[key] = (combinado[key] || 0) + parseInt(tara || 1);
      });

      return Object.entries(combinado)
        .map(([bolsa, count]) => `(${count}-${bolsa})`) // Agregamos los paréntesis aquí
        .join(' ');
    },

    // Método auxiliar para generar detalles del producto
    generarDetallesProducto(producto) {
      let detalles = [];

      if (producto.reporteTaras && producto.reporteTaras.length > 0) {
        const reporteCombinado = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
        if (reporteCombinado) detalles.push(reporteCombinado);
      }

      if (producto.tipo === 'c/h20') {
        detalles.push(`Neto: ${producto.camaronNeto || 0.65}`);
      }

      if (producto.esVenta) {
        detalles.push('(Venta)');
      }

      return detalles.join(' | ');
    },

    // Método auxiliar para convertir color hex a RGB
    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    },
    getClienteColor(clienteId) {
      const cliente = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      if (cliente && (cliente.personalizado || clienteId.toString().startsWith('personalizado_'))) {
        return '#95a5a6'; // Color gris para clientes personalizados
      }
      const colores = {
        '1': '#3498db', // Joselito
        '2': '#e74c3c', // Catarro
        '3': '#f1c40f', // Otilio
        '4': '#2ecc71'  // Ozuna
      };
      return colores[clienteId] || '#95a5a6'; // Color por defecto
    },
    volverAEmbarquesMenu() {
      // Navegar de vuelta al menú de embarques
      this.$router.push({ name: 'EmbarquesMenu' });
    },
    combinarTarasBolsas(taras, bolsas) {
      const combinado = {};

      taras.forEach((tara, index) => {
        const bolsa = bolsas[index] || '';
        const key = bolsa;
        combinado[key] = (combinado[key] || 0) + parseInt(tara || 1);
      });

      return Object.entries(combinado)
        .map(([bolsa, count]) => `(${count}-${bolsa})`)
        .join(' ');
    },
    totalTarasReportadas(producto) {
      return (producto.reporteTaras || []).reduce((total, tara) => {
        return total + (parseInt(tara) || 0);
      }, 0);
    },
    totalBolsasReportadas(producto) {
      return (producto.reporteTaras || []).reduce((total, tara, index) => {
        const taraNum = parseInt(tara) || 0;
        const bolsaNum = parseInt(producto.reporteBolsas[index]) || 0;
        return total + (taraNum * bolsaNum);
      }, 0);
    },
    coincideTaras(producto) {
      const totalReportadas = this.totalTarasReportadas(producto);
      const totalRegistradas = this.totalTaras(producto);
      return totalReportadas === totalRegistradas;
    },
    agregarTaraExtra(producto) {
      if (!Array.isArray(producto.tarasExtra)) {
        this.$set(producto, 'tarasExtra', []);
      }
      producto.tarasExtra.push(null);
    },
    eliminarTaraExtra(producto, index) {
      producto.tarasExtra.splice(index, 1);
    },
    agregarCrudo(clienteId) {
      if (!this.clienteCrudos[clienteId]) {
        this.$set(this.clienteCrudos, clienteId, []);
      }
      this.clienteCrudos[clienteId].push({
        items: [{ talla: '', barco: '', taras: null }]
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
      this.clienteCrudos[clienteId][index].items.push({
        talla: '',
        barco: '',
        taras: null,
        sobrante: null,
        mostrarSobrante: false
      });
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
    calcularTotalCrudos(crudo) {
      return crudo.items.reduce((total, item) => {
        let taras = this.extraerNumero(item.taras);
        let sobrante = this.extraerNumero(item.sobrante);
        return total + taras + sobrante;
      }, 0);
    },

    extraerNumero(valor) {
      if (!valor) return 0;
      const match = valor.toString().match(/^(\d+)/);
      return match ? parseInt(match[1]) : 0;
    },
    actualizarTotalCrudos(clienteId, index) {
      // Forzar la actualización del componente
      this.$forceUpdate();
      this.guardarCambiosEnTiempoReal();
    },
    actualizarCrudos() {
      this.guardarCambiosEnTiempoReal();
    },
    calcularKilosCrudos(item) {
      let kilosTotales = 0;

      // Procesar taras
      if (item.taras) {
        // Verificar si la tara tiene formato "5-19" o similar
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
        if (formatoGuion) {
          const cantidad = parseInt(formatoGuion[1]) || 0;
          let medida = parseInt(formatoGuion[2]) || 0;

          // Si la medida es 19, sustituirla por 20
          if (medida === 19) {
            medida = 20;
            console.log(`Ajustando tara de formato ${item.taras} a ${cantidad}-${medida}`);
          }

          kilosTotales += cantidad * medida;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidad, medida] = item.taras.split('-').map(Number);
          kilosTotales += cantidad * medida;
        }
      }

      // Procesar sobrante
      if (item.sobrante) {
        // Verificar si el sobrante tiene formato "5-19" o similar
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
        if (formatoGuion) {
          const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
          let medidaSobrante = parseInt(formatoGuion[2]) || 0;

          // Si la medida es 19, sustituirla por 20
          if (medidaSobrante === 19) {
            medidaSobrante = 20;
            console.log(`Ajustando sobrante de formato ${item.sobrante} a ${cantidadSobrante}-${medidaSobrante}`);
          }

          kilosTotales += cantidadSobrante * medidaSobrante;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
          kilosTotales += cantidadSobrante * medidaSobrante;
        }
      }

      return kilosTotales;
    },
    calcularTarasCrudos(item) {
      let totalTaras = 0;
      if (item.taras) {
        const [cantidad] = item.taras.split('-').map(Number);
        totalTaras += cantidad;
      }
      if (item.sobrante) {
        const [cantidadSobrante] = item.sobrante.split('-').map(Number);
        totalTaras += cantidadSobrante;
      }
      return totalTaras;
    },

    onRestarTarasChange(producto) {
      console.log('Restar taras cambiado:', producto.restarTaras);
      this.$nextTick(() => {
        this.actualizarProducto(producto);
      });
    },

    actualizarProducto(producto) {
      const index = this.embarque.productos.findIndex(p => p === producto);
      if (index !== -1) {
        // Crear una copia profunda del producto para asegurar la reactividad
        const productoActualizado = JSON.parse(JSON.stringify(producto));
        this.$set(this.embarque.productos, index, productoActualizado);

        // Forzar la actualización del componente
        this.$forceUpdate();

        // Guardar cambios en Firestore
        if (this.guardadoAutomaticoActivo && this.embarqueId) {
          this.guardarCambiosEnTiempoReal();
        }
      }
    },
    reporteExcedeTresParentesis(producto) {
      const reporte = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
      return (reporte.match(/\(/g) || []).length > 3;
    },

    generarReporteExtenso(producto) {
      const reporte = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
      return reporte.replace(/\) /g, ')\n');
    },

    calcularTarasLimpio() {
      return this.embarque.productos.reduce((total, producto) => {
        // Verificar si el cliente es uno de los predefinidos
        const clienteId = producto.clienteId;
        const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId.toString());

        // Solo sumar si es un cliente predefinido
        if (clientePredefinido) {
          return total + this.totalTaras(producto);
        }
        return total;
      }, 0);
    },

    calcularTarasCrudo() {
      return Object.entries(this.clienteCrudos).reduce((total, [clienteId, crudos]) => {
        // Verificar si el cliente es uno de los predefinidos
        const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId.toString());

        // Solo sumar si es un cliente predefinido
        if (clientePredefinido) {
          return total + crudos.reduce((clienteTotal, crudo) => {
            return clienteTotal + this.calcularTotalCrudos(crudo);
          }, 0);
        }
        return total;
      }, 0);
    },

    calcularTotalTaras() {
      return this.calcularTarasLimpio() + this.calcularTarasCrudo();
    },

    calcularKilosLimpio() {
      return this.embarque.productos.reduce((total, producto) => {
        if (producto.tipo === 'c/h20') {
          // Para productos c/h20, calcular la suma de (taras * bolsa) para cada grupo
          const reporteTaras = producto.reporteTaras || [];
          const reporteBolsas = producto.reporteBolsas || [];
          let sumaTotalKilos = 0;

          for (let i = 0; i < reporteTaras.length; i++) {
            const taras = parseInt(reporteTaras[i]) || 0;
            const bolsa = parseInt(reporteBolsas[i]) || 0;
            sumaTotalKilos += taras * bolsa;
          }

          // Multiplicar por el valor neto (0.65 por defecto)
          const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
          return total + kilosReales;
        } else {
          // Para otros productos, mantener el clculo original
          return total + this.totalKilos(producto);
        }
      }, 0).toFixed(2);
    },

    obtenerUltimaBolsa(producto) {
      const bolsas = producto.reporteBolsas || [];
      // Obtener el último valor válido de bolsa
      for (let i = bolsas.length - 1; i >= 0; i--) {
        const valor = parseInt(bolsas[i]);
        if (!isNaN(valor)) {
          return valor;
        }
      }
      return 0;
    },

    calcularKilosCrudo() {
      return Object.values(this.clienteCrudos).reduce((total, crudos) => {
        return total + crudos.reduce((clienteTotal, crudo) => {
          return clienteTotal + crudo.items.reduce((itemTotal, item) => {
            return itemTotal + parseFloat(this.calcularKilosCrudos(item));
          }, 0);
        }, 0);
      }, 0);
    },

    calcularTotalKilos() {
      const kilosLimpio = parseFloat(this.calcularKilosLimpio());
      const kilosCrudo = parseFloat(this.calcularKilosCrudo());
      return (kilosLimpio + kilosCrudo).toFixed(2);
    },

    calcularTotalBolsas: function (producto) {
      let total = 0;
      for (let i = 0; i < producto.reporteTaras.length; i++) {
        const tara = parseInt(producto.reporteTaras[i]) || 0;
        const bolsa = parseInt(producto.reporteBolsas[i]) || 0;
        total += tara * bolsa;
      }
      // Almacenar el total en el producto
      producto.totalKilos = total;
      return total;
    },

    formatearTallaCrudo(talla) {
      const abreviaturas = {
        'Med c/c': 'Med',
        'Med-Esp c/c': 'Esp',
        'Med-gde c/c': 'M-G',
        'Gde c/c': 'Gde',
        'Extra c/c': 'Ext',
        'Jumbo c/c': 'Jbo',
        'Linea': 'Lin',
        'Rechazo': 'Rch'
      };
      return abreviaturas[talla] || talla;
    },
    abrirModalPrecio(item) {
      event?.preventDefault();
      event?.stopPropagation();

      this.itemSeleccionado = item;
      this.precioTemp = item.precio || '';
      this.mostrarModalPrecio = true;
      this.$nextTick(() => {
        this.$refs.precioInput?.focus();
      });
    },
    cerrarModalPrecio() {
      event?.preventDefault();
      event?.stopPropagation();

      this.mostrarModalPrecio = false;
      this.itemSeleccionado = null;
      this.precioTemp = '';
    },
    guardarPrecio() {
      event?.preventDefault();
      event?.stopPropagation();

      if (this.itemSeleccionado) {
        const precio = parseFloat(this.precioTemp);
        if (!isNaN(precio)) {
          this.$set(this.itemSeleccionado, 'precio', precio);
          const guardadoActivo = this.guardadoAutomaticoActivo;
          this.guardadoAutomaticoActivo = false;

          this.$nextTick(() => {
            this.guardadoAutomaticoActivo = guardadoActivo;
            this.guardarCambiosEnTiempoReal();
          });
        }
      }
      this.cerrarModalPrecio();
    },
    abrirModalHilos(item) {
      event?.preventDefault();
      event?.stopPropagation();

      this.itemSeleccionado = item;
      // Si hilos no existe o es undefined, establecer como string vacío
      this.hilosTemp = item.hilos || '';
      this.mostrarModalHilos = true;
      this.$nextTick(() => {
        this.$refs.hilosInput?.focus();
      });
    },
    cerrarModalHilos() {
      event?.preventDefault();
      event?.stopPropagation();

      this.mostrarModalHilos = false;
      this.itemSeleccionado = null;
      this.hilosTemp = '';
    },
    guardarHilos() {
      event?.preventDefault();
      event?.stopPropagation();

      if (this.itemSeleccionado) {
        const hilos = this.hilosTemp.trim();
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

    handleJuntarMedidasChange(clienteId, checked) {
      // Actualizar el estado local
      this.$set(this.clientesJuntarMedidas, clienteId, checked);

      // Guardar inmediatamente si estamos en modo edición
      if (this.modoEdicion && this.embarqueId) {
        this.guardarCambiosEnTiempoReal();
      }
    },
    guardarCambiosEnTiempoReal: debounce(function () {
      if (!this.guardadoAutomaticoActivo || !this.embarqueId || this.mostrarModalPrecio) return;

      const embarqueData = {
        ...this.prepararDatosEmbarque(),
        clientesJuntarMedidas: this.clientesJuntarMedidas
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
    }, 1500),
    abrirModalNota(item) {
      event?.preventDefault();
      event?.stopPropagation();

      this.itemSeleccionado = item;
      this.notaTemp = item.nota || '';
      this.mostrarModalNota = true;
      this.$nextTick(() => {
        this.$refs.notaInput?.focus();
      });
    },

    cerrarModalNota() {
      event?.preventDefault();
      event?.stopPropagation();

      this.mostrarModalNota = false;
      this.itemSeleccionado = null;
      this.notaTemp = '';
    },

    guardarNota() {
      event?.preventDefault();
      event?.stopPropagation();

      if (this.itemSeleccionado) {
        const nota = this.notaTemp.trim();
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
    // Agregar este nuevo método para calcular kilos de productos c/h20
    calcularKilosProductoCH20(producto) {
      const reporteTaras = producto.reporteTaras || [];
      const reporteBolsas = producto.reporteBolsas || [];
      let sumaTotalKilos = 0;

      console.log('Calculando kilos para producto c/h20:', producto.medida);
      console.log('reporteTaras:', reporteTaras);
      console.log('reporteBolsas:', reporteBolsas);
      console.log('camaronNeto:', producto.camaronNeto);

      // Verificar si hay datos de reporteTaras y reporteBolsas
      if (reporteTaras.length > 0 && reporteBolsas.length > 0) {
        for (let i = 0; i < reporteTaras.length; i++) {
          const taras = parseInt(reporteTaras[i]) || 0;
          const bolsa = parseInt(reporteBolsas[i]) || 0;
          sumaTotalKilos += taras * bolsa;
          console.log(`Grupo ${i + 1}: ${taras} taras * ${bolsa} bolsas = ${taras * bolsa} kg`);
        }

        console.log('sumaTotalKilos antes de multiplicar:', sumaTotalKilos);

        // Asegurarnos de que camaronNeto no sea 0
        const valorNeto = (producto.camaronNeto && producto.camaronNeto > 0) ? producto.camaronNeto : 0.65;
        const resultado = sumaTotalKilos * valorNeto;

        console.log(`Resultado final: ${sumaTotalKilos} * ${valorNeto} = ${resultado}`);

        return resultado;
      } else {
        // Si no hay datos de reporteTaras o reporteBolsas, usar los kilos directamente
        console.log('No hay datos de reporteTaras o reporteBolsas, usando kilos directamente');
        const kilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
        console.log('Kilos calculados directamente:', kilos);

        // Multiplicar por el valor neto
        const valorNeto = (producto.camaronNeto && producto.camaronNeto > 0) ? producto.camaronNeto : 0.65;
        const resultado = kilos * valorNeto;
        console.log(`Kilos después de multiplicar por valorNeto (${valorNeto}):`, resultado);

        return resultado;
      }
    },
    // Agregar esta nueva función para comparar medidas
    compararMedidas(medidaA, medidaB) {
      // Si alguna medida es vacía o undefined, ponerla al final
      if (!medidaA) return 1;
      if (!medidaB) return -1;

      // Función auxiliar para extraer números de una medida
      const extraerNumeros = (medida) => {
        const numeros = medida.match(/\d+/g);
        if (!numeros) return [0, 0];
        if (numeros.length === 1) return [parseInt(numeros[0]), parseInt(numeros[0])];
        return [parseInt(numeros[0]), parseInt(numeros[1])];
      };

      // Extraer los números de las medidas
      const [minA, maxA] = extraerNumeros(medidaA);
      const [minB, maxB] = extraerNumeros(medidaB);

      // Si ambas medidas tienen números, comparar por el número menor
      if (minA && minB) {
        return minA - minB;
      }

      // Si no tienen números, comparar alfabéticamente
      return medidaA.localeCompare(medidaB);
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

    abrirModalNombreAlternativo(producto) {
      this.productoSeleccionado = producto;
      this.nombreAlternativoTemp = producto.nombreAlternativoPDF || producto.medida;
      this.mostrarModalNombreAlternativo = true;
      this.$nextTick(() => {
        this.$refs.nombreAlternativoInput?.focus();
      });
    },

    cerrarModalNombreAlternativo() {
      this.mostrarModalNombreAlternativo = false;
      this.productoSeleccionado = null;
      this.nombreAlternativoTemp = '';
    },

    guardarNombreAlternativo() {
      if (this.productoSeleccionado) {
        // Desactivar temporalmente el guardado automático
        const guardadoActivo = this.guardadoAutomaticoActivo;
        this.guardadoAutomaticoActivo = false;

        // Crear una copia del valor para asegurar que tenemos el valor más reciente
        const nuevoNombre = this.nombreAlternativoTemp.trim();

        if (nuevoNombre) {
          // Usar Vue.set para asegurar reactividad
          this.$set(this.productoSeleccionado, 'nombreAlternativoPDF', nuevoNombre);

          // Forzar la actualización del producto
          this.actualizarProducto(this.productoSeleccionado);
        } else {
          this.$delete(this.productoSeleccionado, 'nombreAlternativoPDF');
          this.actualizarProducto(this.productoSeleccionado);
        }

        // Esperar a que Vue actualice el DOM
        this.$nextTick(() => {
          // Reactivar el guardado automático
          this.guardadoAutomaticoActivo = guardadoActivo;

          // Forzar un guardado inmediato
          this.guardarCambiosEnTiempoReal();

          // Cerrar el modal después de asegurarnos que los cambios se guardaron
          this.cerrarModalNombreAlternativo();
        });
      } else {
        this.cerrarModalNombreAlternativo();
      }
    },

    // Asegurarnos de que actualizarProducto maneje correctamente los cambios
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

    // Agregar estos nuevos métodos
    coincideTarasYBolsas(producto) {
      const totalTarasRegistradas = this.totalTaras(producto);
      const totalTarasReportadas = this.totalTarasReportadas(producto);

      // Si no hay taras registradas ni reportadas, retornar false
      if (totalTarasRegistradas === 0 && totalTarasReportadas === 0) {
        return false;
      }

      return totalTarasRegistradas === totalTarasReportadas;
    },

    tieneAlgunReporte(producto) {
      return (producto.reporteTaras || []).some(tara => tara) ||
        (producto.reporteBolsas || []).some(bolsa => bolsa);
    },

    calcularTotalLimpioCliente(clienteId) {
      const productos = this.productosPorCliente[clienteId] || [];
      return productos.reduce((total, producto) => total + this.totalTaras(producto), 0);
    },

    calcularKilosLimpioCliente(clienteId) {
      const productos = this.productosPorCliente[clienteId] || [];
      return productos.reduce((total, producto) => {
        if (producto.tipo === 'c/h20') {
          const reporteTaras = producto.reporteTaras || [];
          const reporteBolsas = producto.reporteBolsas || [];
          let sumaTotalKilos = 0;

          for (let i = 0; i < reporteTaras.length; i++) {
            const taras = parseInt(reporteTaras[i]) || 0;
            const bolsa = parseInt(reporteBolsas[i]) || 0;
            sumaTotalKilos += taras * bolsa;
          }

          return total + (sumaTotalKilos * (producto.camaronNeto || 0.65));
        } else {
          return total + this.totalKilos(producto);
        }
      }, 0);
    },

    calcularTotalCrudoCliente(clienteId) {
      const crudos = this.clienteCrudos[clienteId] || [];
      return crudos.reduce((total, crudo) => {
        return total + crudo.items.reduce((itemTotal, item) => {
          return itemTotal + this.calcularTarasCrudos(item);
        }, 0);
      }, 0);
    },

    calcularKilosCrudoCliente(clienteId) {
      const crudos = this.clienteCrudos[clienteId] || [];
      return crudos.reduce((total, crudo) => {
        return total + crudo.items.reduce((itemTotal, item) => {
          return itemTotal + this.calcularKilosCrudos(item);
        }, 0);
      }, 0);
    },

    formatearKilos(kilos) {
      return kilos.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      });
    },

    // Agregar este nuevo método
    actualizarMedidasUsadas() {
      // Obtener todas las medidas únicas del embarque actual
      const medidas = this.embarque.productos
        .map(p => p.medida)
        .filter(m => m && m.trim()) // Filtrar valores vacíos
        .filter((m, i, arr) => arr.indexOf(m) === i); // Eliminar duplicados
      this.medidasUsadas = medidas;
    },

    // Método para seleccionar una sugerencia
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
    abrirModalAlt(item) {
      event?.preventDefault();
      event?.stopPropagation();

      this.itemSeleccionado = item;
      this.altTemp = item.textoAlternativo || '';
      this.mostrarModalAlt = true;
      this.$nextTick(() => {
        this.$refs.altInput?.focus();
      });
    },
    cerrarModalAlt() {
      event?.preventDefault();
      event?.stopPropagation();

      this.mostrarModalAlt = false;
      this.itemSeleccionado = null;
      this.altTemp = '';
    },
    guardarAlt() {
      event?.preventDefault();
      event?.stopPropagation();

      if (this.itemSeleccionado) {
        const alt = this.altTemp.trim();
        if (alt) {
          this.itemSeleccionado.textoAlternativo = alt;
        } else {
          delete this.itemSeleccionado.textoAlternativo;
        }
        this.guardarCambiosEnTiempoReal();
      }
      this.cerrarModalAlt();
    },
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
    cerrarModalNuevoCliente() {
      this.mostrarModalNuevoCliente = false;
      this.nuevoClienteNombre = '';
      this.nuevoClienteColor = '#007bff';
    },
    agregarNuevoCliente() {
      if (this.nuevoClienteNombre.trim() === '') {
        alert('Por favor, ingrese un nombre para el nuevo cliente.');
        return;
      }

      const nuevoCliente = {
        id: Date.now().toString(), // Convertir a string para mantener consistencia con los IDs existentes
        nombre: this.nuevoClienteNombre,
        color: this.nuevoClienteColor,
        editable: true,
        personalizado: true,
        key: `personalizado_${Date.now()}`
      };

      // Agregar a la lista de clientes personalizados
      this.clientesPersonalizados.push(nuevoCliente);

      // Crear un producto para este cliente en el embarque actual
      const nuevoProducto = {
        id: Date.now(),
        clienteId: nuevoCliente.id,
        medida: '',
        tipo: '',
        tipoPersonalizado: '',
        taras: [],
        kilos: [],
        reporteTaras: [],
        reporteBolsas: [],
        tarasExtra: [],
        restarTaras: true,
        camaronNeto: 0.65,
        multiplicadorBolsas: 1,
        showSuggestions: false,
        esVenta: false,
        isEditing: true,
        isNew: true,
        noSumarKilos: false
      };

      // Agregar el producto al embarque
      this.embarque.productos.push(nuevoProducto);

      // Guardar los cambios
      this.guardarClientesPersonalizados();
      this.guardarCambiosEnTiempoReal();
      this.cerrarModalNuevoCliente();

      // Seleccionar automáticamente el cliente recién creado
      this.seleccionarCliente(nuevoCliente.id);
    },
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
    obtenerColorCliente(nombreCliente) {
      const nombreNormalizado = nombreCliente.toLowerCase();
      if (nombreNormalizado.includes('joselito')) {
        return '#3498db'; // Azul para Joselito
      } else if (nombreNormalizado.includes('catarro')) {
        return '#e74c3c'; // Rojo para Catarro
      } else if (nombreNormalizado.includes('otilio')) {
        return '#f1c40f'; // Amarillo para Otilio
      } else if (nombreNormalizado.includes('ozuna')) {
        return '#2ecc71'; // Verde para Ozuna
      }
      return '#95a5a6'; // Color gris para otros clientes personalizados
    },
    obtenerColorTextoCliente(nombreCliente) {
      const nombreNormalizado = nombreCliente.toLowerCase();
      if (nombreNormalizado.includes('otilio')) {
        return 'black'; // Texto negro para Otilio (fondo amarillo)
      }
      return 'white'; // Texto blanco para el resto
    },
    // Agregar nuevo método para crear cuenta de Joselito
    async crearCuentaJoselito(embarqueCliente, clienteProductos, clienteCrudos) {
      // Mostrar indicador de carga
      this.$set(this, 'isCreatingAccount', true);

      try {
        // Importar funciones necesarias de Firebase
        const { collection, query, where, getDocs, addDoc, orderBy, limit } = await import('firebase/firestore');
        const { db } = await import('@/firebase');

        // Verificar si ya existe una cuenta para esta fecha
        const fechaEmbarque = new Date(embarqueCliente.fecha);
        const fechaFormateada = fechaEmbarque.toISOString().split('T')[0]; // Formato YYYY-MM-DD

        const cuentasRef = collection(db, 'cuentasJoselito');
        const q = query(cuentasRef, where('fecha', '==', fechaFormateada));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          console.log('Ya existe una cuenta para Joselito en esta fecha');
          alert('Ya existe una cuenta para Joselito en esta fecha');
          return;
        }

        // Obtener los precios actuales para Joselito
        const preciosRef = collection(db, 'precios');
        const qPrecios = query(preciosRef, orderBy('fecha', 'desc'));
        const preciosSnapshot = await getDocs(qPrecios);

        // Crear un mapa para organizar los precios por producto
        const preciosMap = new Map();

        preciosSnapshot.docs.forEach(doc => {
          const precio = doc.data();
          // Dar prioridad a los precios específicos de Joselito
          const clave = precio.producto.toLowerCase();

          // Si ya existe un precio para este producto y es específico de Joselito, no lo sobrescribimos
          if (preciosMap.has(clave) && preciosMap.get(clave).clienteId === 'joselito') {
            return;
          }

          // Si es un precio específico de Joselito o no hay precio específico para este producto
          if (precio.clienteId === 'joselito' || !preciosMap.has(clave)) {
            preciosMap.set(clave, {
              precio: precio.precio,
              clienteId: precio.clienteId
            });
          }
        });

        console.log('Precios obtenidos:', preciosMap);

        // Preparar los items para la cuenta de Joselito
        const items = clienteProductos.map(producto => {
          // Calcular kilos totales considerando la resta de taras
          let kilos = 0;

          if (producto.tipo && producto.tipo.toLowerCase() === 'c/h20') {
            // Para productos c/h20, usar la función calcularKilosProductoCH20
            kilos = this.calcularKilosProductoCH20(producto);
            console.log(`Cuenta Joselito - Usando calcularKilosProductoCH20 para ${producto.medida}: ${kilos} kg`);
          } else {
            // Para otros productos, mantener el cálculo original
            kilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);

            // Restar taras si está seleccionado el checkbox
            if (producto.restarTaras) {
              const sumaTaras = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
              kilos -= sumaTaras * 3; // Restar 3 kg por cada tara
            }

            // Lógica especial para productos s/h2o o s/h20 para cliente Catarro
            if (!producto.noSumarKilos &&
              (producto.tipo.toLowerCase().includes('s/h2o') ||
                producto.tipo.toLowerCase().includes('s/h20'))) {
              // Verificar si el cliente es Catarro
              const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === producto.clienteId.toString());
              if (clienteInfo && clienteInfo.nombre.toLowerCase().includes('catarro')) {
                kilos += 1; // Sumar 1 kg para Catarro con productos s/h2o o s/h20
              }
            }
          }

          // Buscar el precio actual para este producto
          let precioVenta = producto.precio || 0;
          const medidaNormalizada = producto.medida.toLowerCase();

          // Intentar encontrar un precio exacto para la medida
          if (preciosMap.has(medidaNormalizada)) {
            precioVenta = preciosMap.get(medidaNormalizada).precio;
          } else {
            // Si no hay precio exacto, buscar por coincidencia parcial
            for (const [clave, datosPrecio] of preciosMap.entries()) {
              if (medidaNormalizada.includes(clave) || clave.includes(medidaNormalizada)) {
                precioVenta = datosPrecio.precio;
                break;
              }
            }
          }

          return {
            kilos: Number(kilos.toFixed(1)), // Redondear a 1 decimal
            medida: producto.medida,
            costo: 1, // Costo por defecto es 1
            precioVenta, // Usar el precio obtenido como precio de venta
            total: Number((kilos * 1).toFixed(2)) // Total basado en costo = 1
          };
        });

        // Agregar items de productos crudos si existen
        if (clienteCrudos && clienteCrudos.length > 0) {
          clienteCrudos.forEach(crudo => {
            crudo.items.forEach(item => {
              // Calcular kilos para productos crudos
              let kilosTotales = 0;
              let kilosCostos = 0;

              // Verificar si el producto crudo es de tipo c/h20
              const esTipoConAgua = item.tipo && item.tipo.toLowerCase() === 'c/h20';

              // Procesar taras
              if (item.taras) {
                // Verificar si la tara tiene formato "5-19" o similar
                const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
                if (formatoGuion) {
                  const cantidad = parseInt(formatoGuion[1]) || 0;
                  let peso = parseInt(formatoGuion[2]) || 0;

                  // Guardar el peso original para la tabla de costos
                  const pesoOriginal = peso;

                  // Si el peso es 19, sustituirlo por 20 solo para el cálculo de venta
                  if (peso === 19) {
                    peso = 20;
                    console.log(`Cuenta Joselito - Ajustando tara de formato ${item.taras} a ${cantidad}-${peso} para cálculo de venta`);
                  }

                  // Calcular kilos totales con el peso ajustado (para la tabla de venta)
                  kilosTotales += cantidad * peso;

                  // Calcular kilos para la tabla de costos con el peso original
                  kilosCostos += cantidad * pesoOriginal;
                } else {
                  // Formato original si no coincide con el patrón
                  const [cantidad, peso] = item.taras.split('-').map(Number);
                  kilosTotales += cantidad * peso;
                  kilosCostos += cantidad * peso;
                }
              }

              // Procesar sobrante
              if (item.sobrante) {
                // Verificar si el sobrante tiene formato "5-19" o similar
                const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
                if (formatoGuion) {
                  const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
                  let pesoSobrante = parseInt(formatoGuion[2]) || 0;

                  // Guardar el peso original para la tabla de costos
                  const pesoSobranteOriginal = pesoSobrante;

                  // Si el peso es 19, sustituirlo por 20 solo para el cálculo de venta
                  if (pesoSobrante === 19) {
                    pesoSobrante = 20;
                    console.log(`Cuenta Joselito - Ajustando sobrante de formato ${item.sobrante} a ${cantidadSobrante}-${pesoSobrante} para cálculo de venta`);
                  }

                  // Calcular kilos totales con el peso ajustado (para la tabla de venta)
                  kilosTotales += cantidadSobrante * pesoSobrante;

                  // Calcular kilos para la tabla de costos con el peso original
                  kilosCostos += cantidadSobrante * pesoSobranteOriginal;
                } else {
                  // Formato original si no coincide con el patrón
                  const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
                  kilosTotales += cantidadSobrante * pesoSobrante;
                  kilosCostos += cantidadSobrante * pesoSobrante;
                }
              }

              // Si es tipo c/h20, multiplicar por el valor neto
              if (esTipoConAgua) {
                kilosTotales = kilosTotales * (item.camaronNeto || 0.65);
                kilosCostos = kilosCostos * (item.camaronNeto || 0.65);
              }

              // Buscar el precio actual para este producto crudo
              let precioVenta = item.precio || 0;
              const medidaNormalizada = `${item.talla} (crudo)`.toLowerCase();

              // Intentar encontrar un precio exacto para la medida
              if (preciosMap.has(medidaNormalizada)) {
                precioVenta = preciosMap.get(medidaNormalizada).precio;
              } else {
                // Si no hay precio exacto, buscar por coincidencia parcial
                for (const [clave, datosPrecio] of preciosMap.entries()) {
                  if ((clave.includes(item.talla.toLowerCase()) && clave.includes('crudo')) ||
                    (medidaNormalizada.includes(clave))) {
                    precioVenta = datosPrecio.precio;
                    break;
                  }
                }
              }

              // Agregar a la lista de items
              items.push({
                kilos: Number(kilosCostos.toFixed(1)), // Redondear a 1 decimal
                medida: `${item.talla} (crudo)`,
                costo: 1, // Costo por defecto es 1
                precioVenta, // Usar el precio obtenido como precio de venta
                total: Number((kilosCostos * 1).toFixed(2)), // Total basado en costo = 1
                kilosVenta: Number(kilosTotales.toFixed(1)), // Kilos para la tabla de venta
                totalVenta: Number((kilosTotales * precioVenta).toFixed(2)) // Total de venta
              });
            });
          });
        }

        // Verificar si hay items para crear la cuenta
        if (items.length === 0) {
          alert('No hay productos para crear la cuenta de Joselito');
          return;
        }

        // Calcular el total general
        const totalGeneral = Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));

        // Calcular el total general de venta
        const totalGeneralVenta = Number(items.reduce((sum, item) => {
          // Si el item tiene kilosVenta, usar ese valor, de lo contrario usar kilos
          const kilosParaVenta = item.kilosVenta || item.kilos;
          return sum + (kilosParaVenta * item.precioVenta);
        }, 0).toFixed(2));

        // Calcular la ganancia del día
        const gananciaDelDia = Number((totalGeneralVenta - totalGeneral).toFixed(2));

        // Obtener el saldo acumulado anterior
        let saldoAcumuladoAnterior = 0;

        // Buscar la cuenta más reciente anterior a la fecha actual
        const qCuentaAnterior = query(
          cuentasRef,
          where('fecha', '<', fechaFormateada),
          orderBy('fecha', 'desc'),
          limit(1)
        );

        const cuentasAnteriores = await getDocs(qCuentaAnterior);

        if (!cuentasAnteriores.empty) {
          const cuentaAnterior = cuentasAnteriores.docs[0].data();
          saldoAcumuladoAnterior = cuentaAnterior.nuevoSaldoAcumulado || 0;
          console.log(`Saldo acumulado anterior encontrado: ${saldoAcumuladoAnterior}`);
        } else {
          console.log('No se encontraron cuentas anteriores, usando saldo 0');
        }

        // Calcular el nuevo saldo acumulado
        const nuevoSaldoAcumulado = saldoAcumuladoAnterior + totalGeneral;

        // Crear la estructura de la cuenta
        const cuentaData = {
          fecha: fechaFormateada,
          items: items,
          itemsVenta: items.map(item => ({
            kilosVenta: item.kilosVenta || item.kilos,
            medida: item.medida,
            precioVenta: item.precioVenta,
            totalVenta: item.totalVenta || Number((item.kilos * item.precioVenta).toFixed(2)),
            ganancia: Number(((item.kilosVenta || item.kilos) * item.precioVenta - item.total).toFixed(2))
          })),
          saldoAcumuladoAnterior: saldoAcumuladoAnterior,
          cobros: [],
          abonos: [],
          totalGeneral: totalGeneral,
          totalGeneralVenta: totalGeneralVenta,
          totalDia: totalGeneralVenta, // Total del día es igual al total general de venta en este caso
          nuevoSaldoAcumulado: nuevoSaldoAcumulado,
          gananciaDelDia: gananciaDelDia, // Ganancia calculada
          estadoPagado: false,
          tieneObservacion: true,
          observacion: `Cuenta creada manualmente desde embarque del ${fechaFormateada}. Carga con: ${embarqueCliente.cargaCon || 'No especificado'}`,
          ultimaActualizacion: new Date().toISOString()
        };

        // Crear la cuenta en Firestore
        const docRef = await addDoc(cuentasRef, cuentaData);
        console.log('Cuenta de Joselito creada con ID:', docRef.id);

        // Contar cuántos productos tienen precios actualizados
        const productosConPrecioActualizado = items.filter(item => item.precioVenta > 0).length;

        // Mostrar alerta al usuario con información detallada
        alert(`Se ha creado la cuenta para Joselito con fecha ${fechaFormateada}\n\n` +
          `Total de productos: ${items.length}\n` +
          `Productos con precio actualizado: ${productosConPrecioActualizado}\n` +
          `Total costo: $${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
          `Total venta: $${totalGeneralVenta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
          `Ganancia: $${gananciaDelDia.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

        // Registrar información detallada para depuración
        console.log('Detalles de la cuenta creada:', {
          fecha: fechaFormateada,
          items: items,
          totalGeneral: totalGeneral,
          totalGeneralVenta: totalGeneralVenta,
          gananciaDelDia: gananciaDelDia,
          saldoAcumuladoAnterior: saldoAcumuladoAnterior,
          nuevoSaldoAcumulado: nuevoSaldoAcumulado
        });

        return docRef.id;
      } catch (error) {
        console.error('Error al crear cuenta para Joselito:', error);
        // Mostrar alerta de error
        alert(`No se pudo crear la cuenta para Joselito: ${error.message}`);
      } finally {
        // Ocultar indicador de carga
        this.$set(this, 'isCreatingAccount', false);
      }
    },
    // Agregar método para verificar si el cliente es Joselito
    esClienteJoselito(clienteId) {
      const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      return clienteInfo && clienteInfo.nombre.toLowerCase().includes('joselito');
    },

    // Agregar método para verificar si el cliente es Catarro
    esClienteCatarro(clienteId) {
      const clienteInfo = this.clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
      return clienteInfo && clienteInfo.nombre.toLowerCase().includes('catarro');
    },

    // Agregar método para obtener el embarque del cliente
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
    // Método para crear cuenta de Catarro
    async crearCuentaCatarro(embarqueCliente, clienteProductos, clienteCrudos) {
      // Mostrar indicador de carga
      this.$set(this, 'isCreatingAccount', true);

      try {
        // Importar funciones necesarias de Firebase
        const { collection, query, where, getDocs, addDoc, orderBy, limit } = await import('firebase/firestore');
        const { db } = await import('@/firebase');

        // Verificar si ya existe una cuenta para esta fecha
        const fechaEmbarque = new Date(embarqueCliente.fecha);
        const fechaFormateada = fechaEmbarque.toISOString().split('T')[0]; // Formato YYYY-MM-DD

        const cuentasRef = collection(db, 'cuentasCatarro');
        const q = query(cuentasRef, where('fecha', '==', fechaFormateada));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          console.log('Ya existe una cuenta para Catarro en esta fecha');
          alert('Ya existe una cuenta para Catarro en esta fecha');
          return;
        }

        // Obtener los precios actuales para Catarro
        const preciosRef = collection(db, 'precios');
        const qPrecios = query(preciosRef, orderBy('fecha', 'desc'));
        const preciosSnapshot = await getDocs(qPrecios);

        // Crear un mapa para organizar los precios por producto
        const preciosMap = new Map();

        preciosSnapshot.docs.forEach(doc => {
          const precio = doc.data();
          const clave = precio.producto.toLowerCase();

          // Si ya existe un precio para este producto y es específico de Catarro, no lo sobrescribimos
          if (preciosMap.has(clave) && preciosMap.get(clave).clienteId === 'catarro') {
            return;
          }

          // Si es un precio específico de Catarro o no hay precio específico para este producto
          if (precio.clienteId === 'catarro' || !preciosMap.has(clave)) {
            preciosMap.set(clave, {
              precio: precio.precio,
              clienteId: precio.clienteId
            });
          }
        });

        console.log('Precios obtenidos:', preciosMap);

        // Preparar los items para la cuenta de Catarro
        const items = clienteProductos.map(producto => {
          // Calcular kilos totales considerando la resta de taras
          let kilos = 0;

          if (producto.tipo && producto.tipo.toLowerCase() === 'c/h20') {
            // Para productos c/h20, usar la función calcularKilosProductoCH20
            kilos = this.calcularKilosProductoCH20(producto);
            console.log(`Cuenta Catarro - Usando calcularKilosProductoCH20 para ${producto.medida}: ${kilos} kg`);
          } else {
            // Para otros productos, mantener el cálculo original
            kilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);

            // Restar taras si está seleccionado el checkbox
            if (producto.restarTaras) {
              const sumaTaras = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
              kilos -= sumaTaras * 3; // Restar 3 kg por cada tara
            }

            // Lógica especial para productos s/h2o o s/h20 para Catarro
            if (!producto.noSumarKilos &&
              (producto.tipo.toLowerCase().includes('s/h2o') ||
                producto.tipo.toLowerCase().includes('s/h20'))) {
              kilos += 1; // Sumar 1 kg para Catarro con productos s/h2o o s/h20
            }
          }

          // Buscar el precio actual para este producto
          let precioVenta = producto.precio || 0;
          const medidaNormalizada = producto.medida.toLowerCase();

          // Intentar encontrar un precio exacto para la medida
          if (preciosMap.has(medidaNormalizada)) {
            precioVenta = preciosMap.get(medidaNormalizada).precio;
          } else {
            // Si no hay precio exacto, buscar por coincidencia parcial
            for (const [clave, datosPrecio] of preciosMap.entries()) {
              if (medidaNormalizada.includes(clave) || clave.includes(medidaNormalizada)) {
                precioVenta = datosPrecio.precio;
                break;
              }
            }
          }

          return {
            kilos: Number(kilos.toFixed(1)), // Redondear a 1 decimal
            medida: producto.medida,
            costo: 1, // Costo por defecto es 1
            precioVenta, // Usar el precio obtenido como precio de venta
            total: Number((kilos * 1).toFixed(2)) // Total basado en costo = 1
          };
        });

        // Agregar items de productos crudos si existen
        if (clienteCrudos && clienteCrudos.length > 0) {
          clienteCrudos.forEach(crudo => {
            crudo.items.forEach(item => {
              // Calcular kilos para productos crudos
              let kilosTotales = 0;
              let kilosCostos = 0;

              // Verificar si el producto crudo es de tipo c/h20
              const esTipoConAgua = item.tipo && item.tipo.toLowerCase() === 'c/h20';

              // Procesar taras
              if (item.taras) {
                // Verificar si la tara tiene formato "5-19" o similar
                const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
                if (formatoGuion) {
                  const cantidad = parseInt(formatoGuion[1]) || 0;
                  let peso = parseInt(formatoGuion[2]) || 0;

                  // Para Catarro, no se hace el ajuste de 19 a 20 kg
                  kilosTotales += cantidad * peso;
                  kilosCostos += cantidad * peso;
                } else {
                  // Formato original si no coincide con el patrón
                  const [cantidad, peso] = item.taras.split('-').map(Number);
                  kilosTotales += cantidad * peso;
                  kilosCostos += cantidad * peso;
                }
              }

              // Procesar sobrante
              if (item.sobrante) {
                const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
                kilosTotales += cantidadSobrante * pesoSobrante;
                kilosCostos += cantidadSobrante * pesoSobrante;
              }

              // Si es tipo c/h20, multiplicar por el valor neto
              if (esTipoConAgua) {
                kilosTotales = kilosTotales * (item.camaronNeto || 0.65);
                kilosCostos = kilosCostos * (item.camaronNeto || 0.65);
              }

              // Buscar el precio actual para este producto crudo
              let precioVenta = item.precio || 0;
              const medidaNormalizada = `${item.talla} (crudo)`.toLowerCase();

              // Intentar encontrar un precio exacto para la medida
              if (preciosMap.has(medidaNormalizada)) {
                precioVenta = preciosMap.get(medidaNormalizada).precio;
              } else {
                // Si no hay precio exacto, buscar por coincidencia parcial
                for (const [clave, datosPrecio] of preciosMap.entries()) {
                  if ((clave.includes(item.talla.toLowerCase()) && clave.includes('crudo')) ||
                    (medidaNormalizada.includes(clave))) {
                    precioVenta = datosPrecio.precio;
                    break;
                  }
                }
              }

              // Agregar a la lista de items
              items.push({
                kilos: Number(kilosCostos.toFixed(1)), // Redondear a 1 decimal
                medida: `${item.talla} (crudo)`,
                costo: 1, // Costo por defecto es 1
                precioVenta, // Usar el precio obtenido como precio de venta
                total: Number((kilosCostos * 1).toFixed(2)), // Total basado en costo = 1
                kilosVenta: Number(kilosTotales.toFixed(1)), // Kilos para la tabla de venta
                totalVenta: Number((kilosTotales * precioVenta).toFixed(2)) // Total de venta
              });
            });
          });
        }

        // Verificar si hay items para crear la cuenta
        if (items.length === 0) {
          alert('No hay productos para crear la cuenta de Catarro');
          return;
        }

        // Calcular totales
        const totalGeneral = items.reduce((sum, item) => sum + item.total, 0);
        const totalGeneralVenta = items.reduce((sum, item) => {
          const totalVenta = (item.kilosVenta || item.kilos) * item.precioVenta;
          return sum + totalVenta;
        }, 0);
        const gananciaDelDia = totalGeneralVenta - totalGeneral;

        // Obtener el saldo acumulado anterior
        let saldoAcumuladoAnterior = 0;
        const qCuentaAnterior = query(
          cuentasRef,
          where('fecha', '<', fechaFormateada),
          orderBy('fecha', 'desc'),
          limit(1)
        );

        const cuentasAnteriores = await getDocs(qCuentaAnterior);

        if (!cuentasAnteriores.empty) {
          const cuentaAnterior = cuentasAnteriores.docs[0].data();
          saldoAcumuladoAnterior = cuentaAnterior.nuevoSaldoAcumulado || 0;
          console.log(`Saldo acumulado anterior encontrado: ${saldoAcumuladoAnterior}`);
        } else {
          console.log('No se encontraron cuentas anteriores, usando saldo 0');
        }

        // Calcular el nuevo saldo acumulado
        const nuevoSaldoAcumulado = saldoAcumuladoAnterior + totalGeneralVenta;

        // Crear la estructura de la cuenta
        const cuentaData = {
          fecha: fechaFormateada,
          items: items,
          itemsVenta: items.map(item => ({
            kilosVenta: item.kilosVenta || item.kilos,
            medida: item.medida,
            precioVenta: item.precioVenta,
            totalVenta: item.totalVenta || Number((item.kilos * item.precioVenta).toFixed(2)),
            ganancia: Number(((item.kilosVenta || item.kilos) * item.precioVenta - item.total).toFixed(2))
          })),
          saldoAcumuladoAnterior: saldoAcumuladoAnterior,
          cobros: [],
          abonos: [],
          totalGeneral: totalGeneral,
          totalGeneralVenta: totalGeneralVenta,
          totalDia: totalGeneralVenta,
          nuevoSaldoAcumulado: nuevoSaldoAcumulado,
          gananciaDelDia: gananciaDelDia,
          estadoPagado: false,
          tieneObservacion: true,
          observacion: `Cuenta creada manualmente desde embarque del ${fechaFormateada}. Carga con: ${embarqueCliente.cargaCon || 'No especificado'}`,
          ultimaActualizacion: new Date().toISOString()
        };

        // Crear la cuenta en Firestore
        const docRef = await addDoc(cuentasRef, cuentaData);
        console.log('Cuenta de Catarro creada con ID:', docRef.id);

        // Contar cuántos productos tienen precios actualizados
        const productosConPrecioActualizado = items.filter(item => item.precioVenta > 0).length;

        // Mostrar alerta al usuario con información detallada
        alert(`Se ha creado la cuenta para Catarro con fecha ${fechaFormateada}\n\n` +
          `Total de productos: ${items.length}\n` +
          `Productos con precio actualizado: ${productosConPrecioActualizado}\n` +
          `Total costo: $${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
          `Total venta: $${totalGeneralVenta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
          `Ganancia: $${gananciaDelDia.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

        // Registrar información detallada para depuración
        console.log('Detalles de la cuenta creada:', {
          fecha: fechaFormateada,
          items: items,
          totalGeneral: totalGeneral,
          totalGeneralVenta: totalGeneralVenta,
          gananciaDelDia: gananciaDelDia,
          saldoAcumuladoAnterior: saldoAcumuladoAnterior,
          nuevoSaldoAcumulado: nuevoSaldoAcumulado
        });

        return docRef.id;
      } catch (error) {
        console.error('Error al crear cuenta para Catarro:', error);
        alert(`No se pudo crear la cuenta para Catarro: ${error.message}`);
      } finally {
        this.$set(this, 'isCreatingAccount', false);
      }
    },

    async crearCuentaParaCliente() {
      if (!this.clienteActual) return;

      try {
        const embarqueCliente = this.obtenerEmbarqueCliente(this.clienteActual.id);
        const clienteProductos = this.productosPorCliente[this.clienteActual.id] || [];
        const clienteCrudos = this.clienteCrudos[this.clienteActual.id] || [];

        if (this.esClienteCatarro(this.clienteActual.id)) {
          await this.crearCuentaCatarro(embarqueCliente, clienteProductos, clienteCrudos);
        }
      } catch (error) {
        console.error('Error al crear cuenta:', error);
        alert('Error al crear la cuenta. Por favor, intente nuevamente.');
      }
    },
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
  -moz-appearance: textfield;
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

/* Modales */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-contenido {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1001;
}

/* Botones de navegación y acción */
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

/* Media Queries */
@media (max-width: 1024px) {
  .productos-container {
    gap: 10px;
  }

  .producto {
    flex: 0 0 calc(33.33% - 10px);
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

  .producto {
    flex: 0 0 calc(50% - 5px);
    padding: 8px;
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

  .producto {
    flex: 0 0 100%;
    width: 100%;
  }
}
</style>
