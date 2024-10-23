<template>
  <div class="nuevo-embarque">
    <h1>{{ modoEdicion ? 'Editar Embarque' : 'Nuevo Embarque' }}</h1>
    <div class="botones">
      <button @click="volverAEmbarquesMenu" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver a Embarques Menu
      </button>
    </div>
    <div class="header">
      <div class="fecha-selector">
        <label for="fecha">Fecha de Embarque:</label>
        <input type="date" id="fecha" v-model="embarque.fecha" class="form-control" required>
      </div>
      <div class="carga-selector">
        <label for="cargaCon">Carga con:</label>
        <select id="cargaCon" v-model="embarque.cargaCon" class="form-control" required>
          <option value="">Seleccionar</option>
          <option value="Porro">Porro</option>
          <option value="Caminante">Caminante</option>
        </select>
      </div>
  
    
<div class="resumen-container">
  <div class="resumen-columna">
    <h4 class="resumen-titulo">Resumen de Taras</h4>
    <div class="resumen-grid">
      <div class="resumen-item">
        <span class="resumen-label">Taras Limpio: </span>
        <strong class="resumen-value">{{ calcularTarasLimpio() }}</strong>
      </div>
      <div class="resumen-item">
        <span class="resumen-label">Taras Crudo: </span>
        <strong class="resumen-value">{{ calcularTarasCrudo() }}</strong>
      </div>
      <div class="resumen-item total">
        <span class="resumen-label">Total Taras: </span>
        <strong class="resumen-value">{{ calcularTotalTaras() }}</strong>
      </div>
    </div>
  </div>
  <div class="resumen-columna">
    <h4 class="resumen-titulo">Resumen de Kilos</h4>
    <div class="resumen-grid">
      <div class="resumen-item">
        <span class="resumen-label">Kilos Limpio: </span>
        <strong class="resumen-value">{{ calcularKilosLimpio() }}</strong>
      </div>
      <div class="resumen-item">
        <span class="resumen-label">Kilos Crudo: </span>
        <strong class="resumen-value">{{ calcularKilosCrudo() }}</strong>
      </div>
      <div class="resumen-item total">
        <span class="resumen-label">Total Kilos: </span>
        <strong class="resumen-value">{{ calcularTotalKilos() }}</strong>
      </div>
    </div>
  </div>
</div>
<div class="botones-undo-redo">
        <button type="button" @click="undo" :disabled="undoStack.length <= 1" class="btn btn-secondary btn-sm">Deshacer</button>
        <button type="button" @click="redo" :disabled="redoStack.length === 0" class="btn btn-secondary btn-sm">Rehacer</button>
      </div>
    </div>
      
    <form @submit.prevent="guardarEmbarque">
      <div v-for="(clienteProductos, clienteId) in productosPorCliente" :key="clienteId" class="cliente-grupo">
        <div class="cliente-header" :data-cliente="obtenerNombreCliente(clienteId)" @click="editarNombreCliente(clienteId)">
          <h3>{{ obtenerNombreCliente(clienteId) }}</h3>
          <div>
            <button type="button" @click.stop="generarNotaVenta(clienteId)" class="btn btn-info btn-sm generar-nota">Generar Nota</button>
            <button type="button" @click.stop="eliminarCliente(clienteId)" class="btn btn-danger btn-sm eliminar-cliente">Eliminar Cliente</button>
          </div>
        </div>
        <div class="productos-container">
          <div v-for="(producto, index) in clienteProductos" :key="index" class="producto">
            <!-- Encabezado de la medida y selección -->
            <h2 class="encabezado-medida">
              {{ producto.medida || 'Sin Medida' }} - {{ obtenerTipoProducto(producto) }}
            </h2>
            <div class="producto-header">
              <input 
                type="text" 
                v-model="producto.medida" 
                class="form-control medida-input" 
                placeholder="Medida"                
                :size="producto.medida.length || 1"
              >
              <select 
                v-model="producto.tipo" 
                class="form-control tipo-select" 
                @change="onTipoChange(producto)"
                :class="{
                  'tipo-azul': producto.tipo === 'c/h20',
                  'tipo-verde': producto.tipo === 's/h20'
                }"
              >
                <option value="">Seleccionar</option>
                <option value="s/h20">S/H20</option>
                <option value="c/h20">C/H20</option>
                <option value="otro">Otro</option>
              </select>
              <!-- Nuevo input para camarón neto -->
              <input 
                v-if="producto.tipo === 'c/h20'"
                type="text"
                v-model="producto.camaronNeto"
                class="form-control camaron-neto-input"
                inputmode="decimal"
                placeholder="Neto"
              >
              <input
                v-if="producto.tipo === 'otro'"
                type="text" 
                v-model="producto.tipoPersonalizado" 
                class="form-control tipo-input" 
                placeholder="Especificar"
              >
              <button type="button" @click="eliminarProducto(producto)" class="btn btn-danger btn-sm eliminar-producto">X</button>
            </div>
            <div class="sumas-verticales">
              <div class="columna">
                <div class="taras-header">
                  <h5>Taras</h5>
                  <div class="checkbox-container">
                    <input 
                      type="checkbox" 
                      v-model="producto.restarTaras"
                      @change="onRestarTarasChange(producto)"
                      class="form-check-input" 
                      :id="'restarTarasCheck-' + index"
                    >
                    <label :for="'restarTarasCheck-' + index">-3</label>
                  </div>
                </div>
                <div v-for="(tara, taraIndex) in producto.taras" :key="taraIndex" class="input-group">
                  <input 
            
                    v-model.number="producto.taras[taraIndex]" 
                    class="form-control tara-input" 
                    placeholder="Tara"
                    :size="String(producto.taras[taraIndex] || '').length || 1"
                    inputmode="numeric"
                    pattern="[0-9]*"
                  >
                  <button type="button" @click="eliminarTara(producto, taraIndex)" class="btn btn-danger btn-sm">-</button>
                </div>
                <div v-for="(taraExtra, taraExtraIndex) in producto.tarasExtra" :key="'extra-' + taraExtraIndex" class="input-group">
                  <input 
                    v-model.number="producto.tarasExtra[taraExtraIndex]" 
                    class="form-control tara-input tara-extra-input" 
                    placeholder="Tara Extra"
                    :size="String(producto.tarasExtra[taraExtraIndex] || '').length || 1"
                    inputmode="numeric"
                    pattern="[0-9]*"
                  >
                  <button type="button" @click="eliminarTaraExtra(producto, taraExtraIndex)" class="btn btn-danger btn-sm">-</button>
                </div>
                <div class="botones-tara">
                  <button type="button" @click="agregarTara(producto)" class="btn btn-success btn-sm agregar-tara">+</button>
                  <button type="button" @click="agregarTaraExtra(producto)" class="btn btn-warning btn-sm agregar-tara-extra">+ Extra</button>
                </div>
                <div class="total">Total: {{ totalTaras(producto) }}</div>
              </div>
              <div class="columna">
                <h5>Kilos</h5>
                <div v-for="(kilo, kiloIndex) in producto.kilos" :key="kiloIndex" class="input-group">
                  <input 
                    v-model.number="producto.kilos[kiloIndex]" 
                    class="form-control kilo-input" 
                    placeholder="Kilos"
                    :size="String(producto.kilos[kiloIndex] || '').length || 1"
                    inputmode="numeric"
                    pattern="[0-9]*"
                  >
                  <button type="button" @click="eliminarKilo(producto, kiloIndex)" class="btn btn-danger btn-sm">-</button>
                </div>
                <button type="button" @click="agregarKilo(producto)" class="btn btn-success btn-sm agregar-kilo">+</button>
                <div class="total">Total: {{ totalKilos(producto) }}</div>
              </div>
            </div>
            <div class="reporte-taras-bolsas">
              <div class="reporte-item">
                <h5>Taras</h5>
                <div v-for="(tara, index) in producto.reporteTaras" :key="index" class="input-group mb-2">
                  <input 
                    type="text" 
                    v-model="producto.reporteTaras[index]" 
                    class="form-control reporte-input" 
                    inputmode="numeric"
                  >
                  <button type="button" @click="eliminarReporteTara(producto, index)" class="btn btn-danger btn-sm">-</button>
                </div>
                <button type="button" @click="agregarReporteTara(producto)" class="btn btn-success btn-sm">+</button>
                <div class="total-taras-reporte" :class="{ 'coincide': coincideTaras(producto), 'no-coincide': !coincideTaras(producto) }">
                   Reportadas: {{ totalTarasReportadas(producto) }}
                </div>
              </div>
              <div class="reporte-item">
                <h5>Bolsas</h5>
                <div v-for="(bolsa, index) in producto.reporteBolsas" :key="index" class="input-group mb-2">
                  <input 
                    type="text" 
                    v-model="producto.reporteBolsas[index]" 
                    class="form-control reporte-input" 
                    inputmode="numeric"
                  >
                  <button type="button" @click="eliminarReporteBolsa(producto, index)" class="btn btn-danger btn-sm">-</button>
                </div>
                <button type="button" @click="agregarReporteBolsa(producto)" class="btn btn-success btn-sm">+</button>
              </div>
            </div>
            <div v-if="reporteExcedeTresParentesis(producto)" class="reporte-extenso">
              {{ generarReporteExtenso(producto) }}
            </div>
          </div>
          <div v-for="(crudo, index) in clienteCrudos[clienteId] || []" :key="'crudo-'+index" class="producto crudo">
            <h2 class="crudo-header">Crudos</h2>
            <div v-for="(item, itemIndex) in crudo.items || []" :key="'item-'+itemIndex" class="crudo-item">
              <div class="crudo-talla-container">
                <select 
                  v-model="item.talla" 
                  class="form-control talla-select"
                >
                  <option value="">Elige talla</option>
                  <option value="Med c/c">Med c/c</option>
                  <option value="Med-Esp c/c">Med-Esp c/c</option>
                  <option value="Med-gde c/c">Med-gde c/c</option>
                  <option value="Gde c/c">Gde c/c</option>
                  <option value="Extra c/c">Extra c/c</option>
                  <option value="Jumbo c/c">Jumbo c/c</option>
                  <option value="Linea">Linea</option>
                  <option value="Rechazo">Rechazo</option>
                </select>
                <input 
                  type="text" 
                  v-model="item.barco" 
                  class="form-control barco-input" 
                  placeholder="Barco"
                >
              </div>
              <div class="crudo-taras-container">
                <div class="taras-wrapper">
                  <input 
                    type="text" 
                    v-model="item.taras" 
                    class="form-control taras-input" 
                    placeholder="Taras"
                    @input="actualizarTotalCrudos(clienteId, index)"
                  >
                  <input 
                    v-if="item.mostrarSobrante"
                    type="text" 
                    v-model="item.sobrante" 
                    class="form-control taras-input" 
                    placeholder="Sbrte"
                    @input="actualizarTotalCrudos(clienteId, index)"
                  >
                </div>
                <div class="buttons-wrapper">
                  <button type="button" @click="eliminarCrudoItem(clienteId, index, itemIndex)" class="btn btn-danger btn-sm eliminar-crudo-item">-</button>
                  <button type="button" @click="toggleSobrante(clienteId, index, itemIndex)" class="btn btn-success btn-sm agregar-sobrante">+</button>
                </div>
              </div>
            </div>
            <button type="button" @click="agregarCrudoItem(clienteId, index)" class="btn btn-primary btn-sm agregar-crudo-item">+ Agregar Talla/Taras</button>
            <button type="button" @click="eliminarCrudo(clienteId, index)" class="btn btn-danger btn-sm eliminar-crudo">Eliminar Crudo</button>
            <div class="total-crudos">Total de taras: {{ calcularTotalCrudos(crudo) }}</div>
          </div>
        </div>
        <div class="botones-agregar">
          <button type="button" @click="agregarProducto(clienteId)" class="btn btn-primary btn-sm agregar-producto">Agregar Producto</button>
          <button type="button" @click="agregarCrudo(clienteId)" class="btn btn-info btn-sm agregar-crudo">Agregar Crudos</button>
        </div>
      </div>
      <div class="cliente-selector">
        <div class="row align-items-center">
          <div class="col-12 col-md-8">
            <select v-model="nuevoClienteId" class="form-control">
              <option value="">Seleccione un cliente</option>
              <option v-for="cliente in clientesDisponibles" :key="cliente.key" :value="cliente.id">
                {{ cliente.nombre }}
              </option>
            </select>
          </div>
          <div class="col-12 col-md-4 mt-2 mt-md-0">
            <button type="button" @click="agregarClienteProducto" class="btn btn-primary btn-block agregar-cliente">Agregar Cliente</button>
          </div>
        </div>
      </div>
      <div class="botones-finales">
        <button type="submit" class="btn btn-success crear-embarque">{{ modoEdicion ? 'Actualizar Embarque' : 'Guardar Embarque' }}</button>
        <button type="button" @click="generarResumenPDF" class="btn btn-info generar-pdf">Generar Resumen PDF</button>
      </div>
    </form>
  </div>
</template>

<script>
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { debounce } from 'lodash';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generarNotaVentaPDF } from '@/utils/pdfGenerator';

export default {
  name: 'NuevoEmbarque',
  data() {
    return {
      clientesPredefinidos: [
        { id: 1, nombre: 'Joselito' },
        { id: 2, nombre: 'Catarro' },
        { id: 3, nombre: 'Otilio' },
        { id: 4, nombre: 'Ozuna' },
      ],
      clientesPersonalizados: [],
      ultimoIdPersonalizado: 0,
      embarque: {
        fecha: '',
        cargaCon: '',
        productos: [],
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
    };
  },
  computed: {
  clientesDisponibles() {
    // Crear un conjunto para almacenar los nombres únicos de clientes
    const clienteSet = new Set();

    // Añadir clientes predefinidos al conjunto
    const clientesPredefinidosUnicos = this.clientesPredefinidos.filter(cliente => {
      if (!clienteSet.has(cliente.nombre)) {
        clienteSet.add(cliente.nombre);
        return true;
      }
      return false;
    });

    // Añadir clientes personalizados al conjunto, verificando duplicados
    const clientesPersonalizadosUnicos = this.clientesPersonalizados.filter(cliente => {
      if (!clienteSet.has(cliente.nombre)) {
        clienteSet.add(cliente.nombre);
        return true;
      }
      return false;
    });

    // Combinar ambas listas y aadir la opción "Otro"
    return [...clientesPredefinidosUnicos, ...clientesPersonalizadosUnicos, { id: 'otro', nombre: 'Otro', key: 'otro' }];
  },
    productosPorCliente() {
      return this.embarque.productos.reduce((acc, producto) => {
        if (!acc[producto.clienteId]) {
          acc[producto.clienteId] = [];
        }
        acc[producto.clienteId].push(producto);
        return acc;
      }, {});
    },
  },
  methods: {
    agregarProducto(clienteId) {
      this.embarque.productos.push({
        clienteId,
        medida: '',
        tipo: '',
        tipoPersonalizado: '',
        taras: [],
        kilos: [],
        reporteTaras: [],
        reporteBolsas: [],
        tarasExtra: [],
        restarTaras: true,
        camaronNeto: 0.65, // Valor por defecto
      });
    },
    eliminarProducto(producto) {
      const index = this.embarque.productos.indexOf(producto);
      if (index > -1) {
        this.embarque.productos.splice(index, 1);
      }
    },
    agregarClienteProducto() {
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
          this.agregarProducto(nuevoClienteId);
        }
      } else if (this.nuevoClienteId) {
        this.agregarProducto(this.nuevoClienteId);
      }
      this.nuevoClienteId = '';
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
    },
    eliminarTara(producto, index) {
      producto.taras.splice(index, 1);
    },
    agregarKilo(producto) {
      producto.kilos.push(null);
    },
    eliminarKilo(producto, index) {
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
      const sumaTarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
      const totalTaras = sumaTarasNormales + sumaTarasExtra;
      const descuentoTaras = producto.restarTaras ? totalTaras * 3 : 0;
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

      // Usar onSnapshot para escuchar cambios en tiempo real
      this.unsubscribe = onSnapshot(embarqueRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log('Datos del embarque cargado:', data);
          
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
        fecha: '',
        cargaCon: '', // Reseteamos también cargaCon
        productos: [],
      };
      this.embarqueId = null;
      this.modoEdicion = false;
      this.guardadoAutomaticoActivo = false;
    },
    guardarCambiosEnTiempoReal: debounce(async function() {
      if (!this.guardadoAutomaticoActivo || !this.embarqueId) return;

      const embarqueData = this.prepararDatosEmbarque();
      const db = getFirestore();
      
      try {
        await updateDoc(doc(db, "embarques", this.embarqueId), embarqueData);
        console.log('Cambios guardados automáticamente:', new Date().toLocaleString());
        this.$emit('guardado-automatico');
      } catch (error) {
        console.error("Error al guardar automáticamente:", error);
      }
    }, 300), // Reducimos aún más el tiempo de debounce

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
          const docRef = await addDoc(collection(db, "embarques"), embarqueData);
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
        cargaCon: this.embarque.cargaCon, // Incluimos cargaCon en los datos a guardar
        clientes: []
      };

      const clientesPredefinidosMap = new Map(this.clientesPredefinidos.map(c => [c.id, c]));

      Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
        const clientePredefinido = clientesPredefinidosMap.get(parseInt(clienteId));
        const clienteData = {
          id: clienteId,
          nombre: clientePredefinido ? clientePredefinido.nombre : this.obtenerNombreCliente(clienteId),
          productos: productos.map(producto => ({
            ...producto,
            restarTaras: producto.restarTaras || false, // Asegurarse de que restarTaras se incluya
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
      } else {
        console.log('No hay más acciones para rehacer.');
      }
    },
    agregarReporteTara(producto) {
      if (!Array.isArray(producto.reporteTaras)) {
        producto.reporteTaras = [];
      }
      producto.reporteTaras.push('');
    },
    eliminarReporteTara(producto, index) {
      producto.reporteTaras.splice(index, 1);
    },
    agregarReporteBolsa(producto) {
      if (!Array.isArray(producto.reporteBolsas)) {
        producto.reporteBolsas = [];
      }
      producto.reporteBolsas.push('');
    },
    eliminarReporteBolsa(producto, index) {
      producto.reporteBolsas.splice(index, 1);
    },
    obtenerTipoProducto(producto) {
      if (producto.tipo === 'otro') {
        return producto.tipoPersonalizado || 'Otro';
      }
      return producto.tipo || 'Sin Tipo';
    },
    generarResumenPDF() {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;
      const columnWidth = (pageWidth - margin * 3) / 2;

      let yPos = margin;

      Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
        const nombreCliente = this.obtenerNombreCliente(clienteId);
        const colorCliente = this.getClienteColor(clienteId);

        // Sección de cliente
        doc.setFillColor(colorCliente);
        doc.rect(margin, yPos, pageWidth - margin * 2, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(nombreCliente, margin + 2, yPos + 7);

        yPos += 15;
        let yPosInicial = yPos;
        doc.setTextColor(0, 0, 0);
        
        // Incrementamos el tamaño de fuente para los títulos
        doc.setFontSize(14);  // Aumentado de 12 a 14

        // Títulos "Limpios" y "Crudos" en negrita y cursiva
        doc.setFont("helvetica", "bolditalic");
        doc.text("Limpios", margin, yPos);
        doc.text("Crudos", margin + columnWidth + margin, yPos);

        yPos += 8;  // Incrementamos un poco más el espacio después de los títulos
        let yPosCrudos = yPos;

        // Volvemos al tamaño de fuente normal para el contenido
        doc.setFontSize(12.5);
        doc.setFont("helvetica", "normal");

        let totalTarasCliente = 0;
        let totalKilosCliente = 0;

        const productosOrdenados = productos.sort((a, b) => {
          const medidaA = parseInt(a.medida.split('/')[0]) || 0;
          const medidaB = parseInt(b.medida.split('/')[0]) || 0;
          return medidaA - medidaB;
        });

        productosOrdenados.forEach((producto) => {
          const tipoProducto = this.obtenerTipoProducto(producto);
          const totalTaras = this.totalTaras(producto);
          const totalKilos = this.totalKilos(producto);
          
          doc.setFont("helvetica", "bold");
          doc.text(`${producto.medida}`, margin, yPos);
          
          let anchoNegrita = doc.getStringUnitWidth(`${producto.medida}`) * doc.internal.getFontSize() / doc.internal.scaleFactor;
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0); // Negro para el guion
          doc.text(" - ", margin + anchoNegrita, yPos);
          
          let anchoGuion = doc.getStringUnitWidth(" - ") * doc.internal.getFontSize() / doc.internal.scaleFactor;
          
          // Determinar el color del tipo de producto
          if (producto.tipo === 'otro') {
            doc.setTextColor(128, 0, 128); // Morado para "otro"
            doc.text(tipoProducto, margin + anchoNegrita + anchoGuion, yPos);
          } else {
            // Separar el tipo de producto si contiene "c/h20"
            const partesTipo = tipoProducto.split(/(c\/h20)/i);
            let anchoTipo = 0;
            
            partesTipo.forEach((parte, index) => {
              if (parte.toLowerCase() === 'c/h20') {
                doc.setTextColor(0, 0, 255); // Azul para "c/h20"
              } else {
                doc.setTextColor(0, 0, 0); // Negro para el resto
              }
              doc.text(parte, margin + anchoNegrita + anchoGuion + anchoTipo, yPos);
              anchoTipo += doc.getStringUnitWidth(parte) * doc.internal.getFontSize() / doc.internal.scaleFactor;
            });
          }
          
          let anchoTipo = doc.getStringUnitWidth(tipoProducto) * doc.internal.getFontSize() / doc.internal.scaleFactor;
          
          doc.setTextColor(0, 0, 0); // Restablecer a negro
          let resto = `: ${totalTaras}T-- `;
          doc.text(resto, margin + anchoNegrita + anchoGuion + anchoTipo, yPos);
          
          let anchoNormal = anchoGuion + anchoTipo + doc.getStringUnitWidth(resto) * doc.internal.getFontSize() / doc.internal.scaleFactor;
          
          doc.setFont("helvetica", "bold");
          doc.text(`${totalKilos} Kg`, margin + anchoNegrita + anchoNormal, yPos);
          
          // Reporte de taras y bolsas
          let reporteCombinado = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
          
          if (reporteCombinado) {
            let anchoKilos = doc.getStringUnitWidth(`${totalKilos} Kg`) * doc.internal.getFontSize() / doc.internal.scaleFactor;
            doc.setFont("helvetica", "normal");
            
            // Contar el número de paréntesis
            const numParentesis = (reporteCombinado.match(/\(/g) || []).length;
            
            if (numParentesis > 2) {
              yPos += 6; // Mover a la siguiente línea
              let reporteLines = doc.splitTextToSize(reporteCombinado, columnWidth - margin * 2);
              doc.text(reporteLines, margin, yPos);
              yPos += (reporteLines.length * 6); // Ajustar yPos basado en el número de líneas
            } else {
              doc.text(reporteCombinado, margin + anchoNegrita + anchoNormal + anchoKilos + 5, yPos);
            }
          }
          
          yPos += 6;
          totalTarasCliente += totalTaras;
          totalKilosCliente += totalKilos;
        });

        // Sección de Crudos
        if (this.clienteCrudos[clienteId]) {
          this.clienteCrudos[clienteId].forEach(crudo => {
            crudo.items.forEach(item => {
              doc.setFont("helvetica", "bold");
              doc.text(`${item.talla}`, margin + columnWidth + margin, yPosCrudos);
              
              let anchoNegrita = doc.getStringUnitWidth(`${item.talla}`) * doc.internal.getFontSize() / doc.internal.scaleFactor;
              
              doc.setFont("helvetica", "normal");
              let textoCrudo = ` - ${item.barco}: `;
              if (item.taras) {
                textoCrudo += `(${item.taras})`;
              }
              if (item.sobrante) {
                textoCrudo += ` (${item.sobrante})`;
              }
              textoCrudo += ` - `;
              doc.text(textoCrudo, margin + columnWidth + margin + anchoNegrita, yPosCrudos);
              
              let anchoTexto = doc.getStringUnitWidth(textoCrudo) * doc.internal.getFontSize() / doc.internal.scaleFactor;
              
              let kilosTotales = this.calcularKilosCrudos(item);
              doc.setFont("helvetica", "bold");
              doc.text(`${kilosTotales} Kg`, margin + columnWidth + margin + anchoNegrita + anchoTexto, yPosCrudos);
              
              yPosCrudos += 6;
              totalKilosCliente += kilosTotales;
              totalTarasCliente += this.calcularTarasCrudos(item);
            });
          });
        }

        // Usar el yPos más grande entre limpios y crudos
        yPos = Math.max(yPos, yPosCrudos);

        // Total del cliente
        yPos += 5;
        doc.setFillColor(colorCliente);
        doc.setTextColor(255, 255, 255);
        doc.rect(margin, yPos - 2, pageWidth - margin * 2, 10, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        const textoTotal = `Total: ${totalTarasCliente} taras, ${totalKilosCliente.toFixed(2)} kilos`;
        doc.text(textoTotal, margin + 2, yPos + 5);
        
        yPos += 15;

        // Verificar si se necesita una nueva página
        if (yPos > pageHeight - margin * 2) {
          doc.addPage();
          yPos = margin;
        }
      });

      doc.save('resumen-embarque.pdf');
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
      return producto.reporteTaras.reduce((total, tara) => {
        const [cantidad] = tara.split('-');
        return total + (parseInt(cantidad) || 0);
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
      if (item.taras) {
        const [cantidad, medida] = item.taras.split('-').map(Number);
        kilosTotales += cantidad * medida;
      }
      if (item.sobrante) {
        const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
        kilosTotales += cantidadSobrante * medidaSobrante;
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
    generarNotaVenta(clienteId) {
      const clienteProductos = this.productosPorCliente[clienteId];
      const clienteCrudos = this.clienteCrudos[clienteId];
      const embarqueCliente = {
        fecha: this.embarque.fecha,
        cargaCon: this.embarque.cargaCon, // Añadir esta línea
        productos: clienteProductos,
        clienteCrudos: { [clienteId]: clienteCrudos }
      };
      generarNotaVentaPDF(embarqueCliente, this.clientesDisponibles);
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
        this.$set(this.embarque.productos, index, { ...producto });
      }
      this.guardarCambiosEnTiempoReal();
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
        return total + this.totalTaras(producto);
      }, 0);
    },

    calcularTarasCrudo() {
      return Object.values(this.clienteCrudos).reduce((total, crudos) => {
        return total + crudos.reduce((clienteTotal, crudo) => {
          return clienteTotal + this.calcularTotalCrudos(crudo);
        }, 0);
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
          // Para otros productos, mantener el cálculo original
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

    totalBolsasReportadas(producto) {
      return (producto.reporteBolsas || []).reduce((total, bolsa) => {
        return total + (parseInt(bolsa) || 0);
      }, 0);
    },

    calcularKilosCrudo() {
      return Object.values(this.clienteCrudos).reduce((total, crudos) => {
        return total + crudos.reduce((clienteTotal, crudo) => {
          return clienteTotal + crudo.items.reduce((itemTotal, item) => {
            return itemTotal + this.calcularKilosCrudos(item);
          }, 0);
        }, 0);
      }, 0).toFixed(2);
    },

    calcularTotalKilos() {
      const kilosLimpio = parseFloat(this.calcularKilosLimpio());
      const kilosCrudo = parseFloat(this.calcularKilosCrudo());
      return (kilosLimpio + kilosCrudo).toFixed(2);
    },
  },
  created() {
    const embarqueId = this.$route.params.id;
    this.cargarEmbarque(embarqueId);
    this.undoStack.push(JSON.stringify(this.embarque));
    console.log('Component mounted. Estado inicial cargado.');
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
.resumen-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.resumen-columna {
  flex: 1 1 48%;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .resumen-columna {
    flex: 1 1 100%;
  }
}

.resumen-columna {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  flex: 1;
  min-width: 250px;
}



.nuevo-embarque {
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  min-height: 100vh;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.fecha-selector {
  display: flex;
  flex-direction: column;
}

.fecha-selector label {
  margin-bottom: 5px;
  font-weight: bold;
}

.botones-undo-redo {
  display: flex;
  gap: 10px;
}

.botones-undo-redo button {
  flex: 1;
  padding: 12px;
  font-size: 1rem;
  border-radius: 5px;
}

.botones-undo-redo button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.cliente-grupo {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

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
}

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

.cliente-header[data-cliente="Joselito"] h3,
.cliente-header[data-cliente="Catarro"] h3,
.cliente-header[data-cliente="Otilio"] h3,
.cliente-header[data-cliente="Ozuna"] h3 {
  color: #ffffff;
}

.cliente-header[data-cliente="Otro"] {
  background-color: #95a5a6;
}

.cliente-header[data-cliente="Otro"] h3 {
  color: #ffffff;
}

.eliminar-cliente {
  padding: 8px 12px;
  font-size: 0.9rem;
}

.productos-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.producto, .crudo {
  flex: 0 0 calc(25% - 15px);
  max-width: calc(25% - 15px);
  background-color: #fefefe;
  border: 2px solid #000000;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.producto:hover, .crudo:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.producto-header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
}

.medida-input {
  flex: 1;
  min-width: 80px;
  padding: 8px;
  font-size: 1rem;
  font-weight: bold;
  border: 2px solid #007bff;
  border-radius: 5px;
  background-color: #eceef1;
}

.tipo-select {
  flex: 2;
  min-width: 120px;
  padding: 8px;
  font-size: 1rem;
  font-weight: bold;
  border: 2px solid #28a745;
  border-radius: 5px;
  background-color: #e8f5e9;
  transition: border-color 0.3s, background-color 0.3s;
}

.tipo-select.tipo-azul {
  background-color: #d0e7ff;
  border-color: #0056b3;
}

.tipo-select.tipo-verde {
  background-color: #e8f5e9;
  border-color: #28a745;
}

.tipo-select:focus {
  outline: none;
  border-color: #0056b3;
  background-color: #d0e7ff;
}

.tipo-input {
  flex: 2;
  min-width: 120px;
  max-width: 200px;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.eliminar-producto {
  padding: 8px 12px;
  font-size: 0.9rem;
  background-color: #dc3545;
  border: none;
  border-radius: 5px;
  color: #fff;
}

.sumas-verticales {
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 100%;
  margin-bottom: 20px;
}

.columna {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.columna h5 {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #333;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tara-input, .kilo-input, .reporte-input {
  flex: 1;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.input-group button {
  padding: 8px 12px;
  font-size: 1rem;
  border: none;
  border-radius: 5px;
}

.agregar-tara, .agregar-kilo, .agregar-producto {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border-radius: 5px;
}

.agregar-tara, .agregar-kilo {
  background-color: #28a745;
  color: #fff;
}

.agregar-tara:hover, .agregar-kilo:hover {
  background-color: #218838;
}

.agregar-producto {
  background-color: #007bff;
  color: #fff;
}

.agregar-producto:hover {
  background-color: #0056b3;
}

.total {
  font-weight: bold;
  margin-top: 10px;
  border-top: 2px solid #ddd;
  padding-top: 5px;
  color: #333;
}

.reporte-taras-bolsas {
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 100%;
  margin-bottom: 20px;
}

.reporte-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.reporte-item h5 {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #333;
}

.reporte-input {
  flex: 1;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.cambios {
  background-color: #fff;
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-top: 30px;
}

.cambios h4 {
  margin-bottom: 10px;
  color: #333;
}

.cambios ul {
  list-style-type: disc;
  padding-left: 20px;
  color: #555;
}

.cliente-selector {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.cliente-selector .btn-block {
  width: 100%;
}

.crear-embarque {
  background-color: #28a745;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
}

.crear-embarque:hover {
  background-color: #218838;
}

.btn {
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #007bff;
  border: none;
  color: #fff;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  border: none;
  color: #fff;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-danger {
  background-color: #dc3545;
  border: none;
  color: #fff;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-success {
  background-color: #28a745;
  border: none;
  color: #fff;
}

.btn-success:hover {
  background-color: #218838;
}

/* Media Queries para Responsividad en iPad */
@media (min-width: 768px) and (max-width: 1024px) {
  .productos-container {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
  }

  .producto {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }

  .reporte-taras-bolsas {
    flex-direction: row;
  }

  .reporte-item {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }
}

/* Media Queries para Dispositivos Móviles */
@media (max-width: 767px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .botones-undo-redo {
    width: 100%;
    gap: 10px;
  }

  .productos-container {
    flex-direction: column;
  }

  .producto {
    width: 100%;
  }

  .sumas-verticales {
    flex-direction: column;
    gap: 15px;
  }

  .reporte-taras-bolsas {
    flex-direction: column;
    gap: 15px;
  }

  .reporte-item {
    width: 100%;
  }

  .cliente-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .eliminar-cliente, .eliminar-producto {
    width: 100%;
    text-align: center;
  }

  .agregar-tara, .agregar-kilo, .agregar-producto, .crear-embarque {
    font-size: 1rem;
    padding: 12px;
  }
}

/* Añadir esta media query al final de la sección <style> */

@media (min-width: 1025px) {
  .productos-container {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
  }

  .producto {
    flex: 0 0 calc(25% - 15px); /* Cuatro por fila con espacio */
    max-width: calc(25% - 15px);
  }

  .reporte-taras-bolsas {
    flex-direction: row;
  }

  .reporte-item {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }
}

.crudo-header {
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 15px;
  color: #007bff
}

.encabezado-medida {
  text-align: center;
  font-size: 1.5rem; /* Tamaño de fuente grande */
  font-weight: bold;
  margin-bottom: 15px;
}

/* Opcional: Ajustes para dispositivos móviles */
@media (max-width: 767px) {
  .encabezado-medida {
    font-size: 1.2rem;
  }
}

.generar-pdf {
  background-color: #17a2b8;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
  margin-top: 20px;
  margin-bottom: 20px;
}

.generar-pdf:hover {
  background-color: #138496;
}

.btn-secondary {
  margin-right: 10px;
}

.btn-volver {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  margin-bottom: 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  text-decoration: none;
  transition: background-color 0.3s ease;
  cursor: pointer;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-volver i {
  margin-right: 10px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.checkbox-container input[type="checkbox"] {
  margin-right: 5px;
  width: 15px; /* Aumentamos el ancho */
  height: 15px; /* Aumentamos la altura */
  cursor: pointer; /* Añadimos cursor pointer para mejor interactividad */
}

.checkbox-container label {
  font-size: 0.9rem;
  color: #555;
  cursor: pointer; /* Añadimos cursor pointer también a la etiqueta */
}

.taras-header {
  display: flex;
  justify-content: center;
  align-items: center;
}

.total-taras-reporte {
  margin-top: 10px;
  font-weight: bold;
  padding: 5px;
  border-radius: 5px;
}

.total-taras-reporte.coincide {
  background-color: #d4edda;
  color: #155724;
}

.total-taras-reporte.no-coincide {
  background-color: #f8d7da;
  color: #721c24;
}

.agregar-tara-extra {
  background-color: #ffa500;
  color: #fff;
  margin-top: 1px; /* Ajuste del margen superior a 1px */
}

.agregar-tara-extra:hover {
  background-color: #ff8c00;
}

.tara-extra-input {
  border-color: #ffa500;
  border-width: 2px;
}

.tara-extra-input:focus {
  border-color: #ff8c00;
  box-shadow: 0 0 0 0.2rem rgba(255, 165, 0, 0.25);
}

.botones-tara {
  display: flex;
  gap: 5px;
  margin-top: auto; /* Empuja los botones hacia abajo */
  height: 38px; /* Altura fija para los botones */
}

.agregar-tara,
.agregar-tara-extra,
.agregar-kilo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px; /* Altura fija para todos los botones */
  font-size: 0.9rem;
  padding: 0 10px;
}

.agregar-tara,
.agregar-tara-extra {
  flex: 1;
}

.agregar-kilo {
  width: 100%;
  margin-top: 10px;
  align-self: flex-end; /* Alinea el botón al final de la columna */
}

.cliente-header[data-cliente] {
  cursor: pointer;
}

/* Estilo para clientes personalizados */
.cliente-header[data-cliente] {
  background-color: #95a5a6; /* Color gris por defecto */
}

/* Estilos específicos para clientes predefinidos */
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

/* Asegurar que el texto sea blanco para todos los encabezados de cliente */
.cliente-header[data-cliente] h3 {
  color: #ffffff;
}

.botones-agregar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.agregar-crudo {
  background-color: #17a2b8;
  color: white;
}

.agregar-crudo:hover {
  background-color: #138496;
}

.crudos-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
}

.crudo {
  background-color: #f8f9fa;
  border: 2px solid #007bff;
  border-radius: 25px;
  padding: 15px;
  width: calc(50% - 7.5px);
}

.crudo h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.2rem;
}

.crudo-inputs {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.talla-select,
.taras-input {
  flex: 1;
}

.eliminar-crudo {
  width: 100%;
}

@media (max-width: 768px) {
  .crudo {
    width: 100%;
  }
}

.talla-select,
.taras-input {
  flex: 1;
}

.eliminar-crudo {
  width: 100%;
}

@media (max-width: 768px) {
  .crudo {
    width: 100%;
  }
}

.crudo-item {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.crudo-talla-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.crudo-taras-container {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.talla-select,
.barco-input {
  width: 100%;
}

.taras-input {
  flex-grow: 1;
}

.eliminar-crudo-item {
  align-self: flex-start;
}

.agregar-crudo-item,
.eliminar-crudo {
  width: 100%;
  margin-top: 10px;
}

.agregar-sobrante {
  width: 100%;
  height: 38px;
}

.crudo-sobrante-container,
.crudo-agregar-container {
  margin-top: 10px;
}

.sobrante-input {
  width: calc(100% - 50px);
}

.crudo-taras-container {
  display: flex;
  align-items: flex-start;
}

.taras-wrapper {
  flex-grow: 1;
  margin-right: 10px;
}

.buttons-wrapper {
  display: flex;
  flex-direction: column;
}

.taras-input {
  width: 100%;
  margin-bottom: 10px;
}

.eliminar-crudo-item,
.agregar-sobrante {
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.agregar-sobrante {
  margin-top: 10px;
}

.total-crudos {
  text-align: center;
  font-weight: bold;
  margin-top: 15px;
  font-size: 1.2rem;
  color: #333;
}

.crudos-form {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.crudos-input {
  flex: 1 1 calc(33.33% - 1rem);
  min-width: 200px;
}

@media (max-width: 768px) {
  .crudos-input {
    flex: 1 1 calc(50% - 1rem);
  }
}

@media (max-width: 480px) {
  .crudos-input {
    flex: 1 1 100%;
  }
}

.generar-nota {
  margin-right: 10px;
  background-color: #17a2b8;
  color: white;
}

.generar-nota:hover {
  background-color: #138496;
}



.crear-embarque,
.generar-pdf {
  margin-bottom: 10px; /* Añade un pequeño margen inferior a ambos botones */
}

.botones-finales {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.crear-embarque,
.generar-pdf {
  flex: 1;
  height: 60px; /* Establece una altura fija para ambos botones */
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 15px;
  line-height: 1.2;
  margin-top: 0px;
}

.crear-embarque {
  background-color: #28a745;
  color: #fff;
}

.generar-pdf {
  background-color: #17a2b8;
  color: #fff;
}

/* Estilos para dispositivos móviles */
@media (max-width: 768px) {
  .botones-finales {
    flex-direction: column;
    gap: 10px;
  }
  
  .crear-embarque,
  .generar-pdf {
    width: 100%;
  }
}

.reporte-extenso {
  margin-top: 10px;
  padding: 5px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 0.9em;
}

/* Nuevos estilos para el input de camarón neto */
.camaron-neto-input {
  width: 70px;
  padding: 8px;
  font-size: 1rem;
  border: 2px solid #0056b3;
  border-radius: 5px;
  background-color: #d0e7ff;
  text-align: center;
  -moz-appearance: textfield; /* Firefox */
}

/* Quitar flechas para Chrome, Safari, Edge, Opera */
.camaron-neto-input::-webkit-outer-spin-button,
.camaron-neto-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.camaron-neto-input:focus {
  outline: none;
  border-color: #003d7a;
  box-shadow: 0 0 0 0.2rem rgba(0, 86, 179, 0.25);
}

@media (max-width: 768px) {
  .camaron-neto-input {
    width: 60px;
    font-size: 0.9rem;
  }
}
</style>

