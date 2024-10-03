<template>
  <div class="nuevo-embarque">
    <div class="header">
      <div class="fecha-selector">
        <label for="fecha">Fecha de Embarque:</label>
        <input type="date" id="fecha" v-model="embarque.fecha" class="form-control" required>
      </div>
      <div class="botones-undo-redo">
        <button type="button" @click="undo" :disabled="undoStack.length <= 1" class="btn btn-secondary btn-sm">Deshacer</button>
        <button type="button" @click="redo" :disabled="redoStack.length === 0" class="btn btn-secondary btn-sm">Rehacer</button>
      </div>
    </div>
    <form @submit.prevent="crearEmbarque">
      <div v-for="(clienteProductos, clienteId) in productosPorCliente" :key="clienteId" class="cliente-grupo">
        <h3>{{ obtenerNombreCliente(clienteId) }}</h3>
        <div class="productos-container">
          <div v-for="(producto, index) in clienteProductos" :key="index" class="producto">
            <div class="producto-header">
              <input 
                type="text" 
                v-model="producto.medida" 
                class="form-control medida-input" 
                placeholder="Medida"
                :size="producto.medida.length || 1"
              >
              <select v-model="producto.tipo" class="form-control tipo-select" @change="onTipoChange(producto)">
                <option value="">Seleccionar</option>
                <option value="s/h20">S/H20</option>
                <option value="c/h20">C/H20</option>
                <option value="otro">Otro</option>
              </select>
              <input 
                v-if="producto.tipo === 'otro'"
                type="text" 
                v-model="producto.tipoPersonalizado" 
                class="form-control tipo-input" 
                placeholder="Especificar"
              >
              <button type="button" @click="eliminarProducto(producto)" class="btn btn-danger btn-sm">X</button>
            </div>
            <div class="sumas-verticales">
              <div class="columna">
                <h5>Taras</h5>
                <div v-for="(tara, taraIndex) in producto.taras" :key="taraIndex" class="input-group">
                  <input 
                    type="number" 
                    v-model.number="producto.taras[taraIndex]" 
                    class="form-control tara-input" 
                    placeholder="Tara"
                    :size="String(producto.taras[taraIndex] || '').length || 1"
                  >
                  <button type="button" @click="eliminarTara(producto, taraIndex)" class="btn btn-danger btn-sm">-</button>
                </div>
                <button type="button" @click="agregarTara(producto)" class="btn btn-success btn-sm">+</button>
                <div class="total">Total: {{ totalTaras(producto) }}</div>
              </div>
              <div class="columna">
                <h5>Kilos</h5>
                <div v-for="(kilo, kiloIndex) in producto.kilos" :key="kiloIndex" class="input-group">
                  <input 
                    type="number" 
                    v-model.number="producto.kilos[kiloIndex]" 
                    class="form-control kilo-input" 
                    placeholder="Kilos"
                    :size="String(producto.kilos[kiloIndex] || '').length || 1"
                  >
                  <button type="button" @click="eliminarKilo(producto, kiloIndex)" class="btn btn-danger btn-sm">-</button>
                </div>
                <button type="button" @click="agregarKilo(producto)" class="btn btn-success btn-sm">+</button>
                <div class="total">Total: {{ totalKilos(producto) }}</div>
              </div>
            </div>
            <div class="reporte-taras">
              <h5>Reporte de Taras</h5>
              <div v-for="(reporte, reporteIndex) in producto.reportesTaras" :key="reporteIndex" class="input-group">
                <input 
                  type="number" 
                  v-model.number="reporte.tara" 
                  class="form-control reporte-tara-input" 
                  placeholder="Tara"
                >
                <input 
                  type="number" 
                  v-model.number="reporte.bolsas" 
                  class="form-control reporte-bolsas-input" 
                  placeholder="Bolsas"
                >
                <button type="button" @click="eliminarReporteTara(producto, reporteIndex)" class="btn btn-danger btn-sm">-</button>
              </div>
              <button type="button" @click="agregarReporteTara(producto)" class="btn btn-success btn-sm">+</button>
            </div>
          </div>
        </div>
        <button type="button" @click="agregarProducto(clienteId)" class="btn btn-primary btn-sm">Agregar Producto</button>
      </div>
      <div class="cliente-selector">
        <select v-model="nuevoClienteId" class="form-control">
          <option value="">Seleccione un cliente</option>
          <option v-for="cliente in clientes" :key="cliente.id" :value="cliente.id">
            {{ cliente.nombre }}
          </option>
        </select>
        <button type="button" @click="agregarClienteProducto" class="btn btn-primary">Agregar Cliente</button>
      </div>
      <button type="submit" class="btn btn-success">Crear Embarque</button>
    </form>
    <div class="cambios">
      <h4>Cambios:</h4>
      <ul>
        <li v-for="(cambio, index) in cambios" :key="index">{{ cambio }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';

export default {
  name: 'NuevoEmbarque',
  setup() {
    const clientes = ref([
      { id: 1, nombre: 'Joselito' },
      { id: 2, nombre: 'Catarro' },
      { id: 3, nombre: 'Otilio' },
      { id: 4, nombre: 'Ozuna' },
    ]);

    const embarque = ref({
      fecha: '',
      productos: [],
    });

    const nuevoClienteId = ref('');

    const productosPorCliente = computed(() => {
      return embarque.value.productos.reduce((acc, producto) => {
        if (!acc[producto.clienteId]) {
          acc[producto.clienteId] = [];
        }
        acc[producto.clienteId].push(producto);
        return acc;
      }, {});
    });

    const agregarProducto = (clienteId) => {
      embarque.value.productos.push({
        clienteId,
        medida: '',
        tipo: '',
        tipoPersonalizado: '',
        taras: [],
        kilos: [],
        reportesTaras: [{ tara: null, bolsas: null }],
      });
    };

    const eliminarProducto = (producto) => {
      const index = embarque.value.productos.indexOf(producto);
      if (index > -1) {
        embarque.value.productos.splice(index, 1);
      }
    };

    const agregarClienteProducto = () => {
      if (nuevoClienteId.value) {
        agregarProducto(nuevoClienteId.value);
        nuevoClienteId.value = '';
      }
    };

    const agregarTara = (producto) => {
      producto.taras.push(null);
    };

    const eliminarTara = (producto, index) => {
      producto.taras.splice(index, 1);
    };

    const agregarKilo = (producto) => {
      producto.kilos.push(null);
    };

    const eliminarKilo = (producto, index) => {
      producto.kilos.splice(index, 1);
    };

    const agregarReporteTara = (producto) => {
      producto.reportesTaras.push({ tara: null, bolsas: null });
    };

    const eliminarReporteTara = (producto, index) => {
      producto.reportesTaras.splice(index, 1);
    };

    const totalTaras = (producto) => {
      return producto.taras.reduce((sum, tara) => sum + tara, 0);
    };

    const totalKilos = (producto) => {
      return producto.kilos.reduce((sum, kilo) => sum + kilo, 0);
    };

    const obtenerNombreCliente = (clienteId) => {
      const cliente = clientes.value.find(c => c.id === parseInt(clienteId));
      return cliente ? cliente.nombre : 'Cliente Desconocido';
    };

    // Manejo de historial para Undo y Redo
    const undoStack = ref([]);
    const redoStack = ref([]);
    const isUndoRedo = ref(false); // Bandera para controlar operaciones de Undo/Redo

    // Cargar datos desde localStorage al montar el componente
    onMounted(() => {
      const almacenado = localStorage.getItem('embarque');
      if (almacenado) {
        embarque.value = JSON.parse(almacenado);
      }
      // Inicializar el undoStack con el estado inicial
      undoStack.value.push(JSON.stringify(embarque.value));
      console.log('Component mounted. Estado inicial cargado.');
    });

    // Guardar datos en localStorage y manejar el historial cada vez que 'embarque' cambia
    watch(embarque, (nuevoEmbarque, viejoEmbarque) => {
      if (isUndoRedo.value) {
        // Si se está realizando Undo/Redo, no registrar en el historial
        isUndoRedo.value = false;
        return;
      }
      localStorage.setItem('embarque', JSON.stringify(nuevoEmbarque));
      // Agregar el estado anterior al undoStack
      undoStack.value.push(JSON.stringify(viejoEmbarque));
      // Limpiar el redoStack cuando se realiza un nuevo cambio
      redoStack.value = [];
      console.log('Embarque actualizado. Estado agregado al undoStack.');
    }, { deep: true });

    const crearEmbarque = () => {
      console.log('Embarque creado:', embarque.value);
      localStorage.removeItem('embarque'); // Limpiar localStorage después de crear
      // Resetear el historial
      undoStack.value = [JSON.stringify(embarque.value)];
      redoStack.value = [];
      console.log('Historial de undo/redo reseteado.');
    };

    const onTipoChange = (producto) => {
      if (producto.tipo !== 'otro') {
        producto.tipoPersonalizado = '';
      }
    };

    const undo = () => {
      if (undoStack.value.length > 1) { // Asegura que haya al menos un estado previo
        // Obtener el estado actual y moverlo al redoStack
        const estadoActual = undoStack.value.pop();
        redoStack.value.push(estadoActual);
        // Obtener el estado anterior del undoStack
        const estadoAnterior = undoStack.value[undoStack.value.length - 1];
        isUndoRedo.value = true; // Indicar que se está realizando una operación de Undo
        embarque.value = JSON.parse(estadoAnterior);
        console.log('Undo realizado. Estado actual restaurado.');
      } else {
        console.log('No hay más acciones para deshacer.');
      }
    };

    const redo = () => {
      if (redoStack.value.length > 0) {
        // Obtener el último estado del redoStack
        const estadoRehacer = redoStack.value.pop();
        undoStack.value.push(estadoRehacer);
        isUndoRedo.value = true; // Indicar que se está realizando una operación de Redo
        embarque.value = JSON.parse(estadoRehacer);
        console.log('Redo realizado. Estado actual restaurado.');
      } else {
        console.log('No hay más acciones para rehacer.');
      }
    };

    return {
      clientes,
      embarque,
      nuevoClienteId,
      productosPorCliente,
      agregarProducto,
      eliminarProducto,
      agregarClienteProducto,
      agregarTara,
      eliminarTara,
      agregarKilo,
      eliminarKilo,
      agregarReporteTara,
      eliminarReporteTara,
      totalTaras,
      totalKilos,
      obtenerNombreCliente,
      crearEmbarque,
      onTipoChange,
      undo,
      redo,
      undoStack,
      redoStack,
    };
  },
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.fecha-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

.botones-undo-redo {
  display: flex;
  gap: 10px;
}

.botones-undo-redo button {
  padding: 10px 20px;
  font-size: 1rem;
}

.botones-undo-redo button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cliente-grupo {
  border: 1px solid #ddd;
  padding: 20px;
  margin-bottom: 20px;
}

.productos-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.producto {
  border: 1px solid #ccc;
  padding: 10px;
  width: 220px;
}

.producto-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
  flex-wrap: wrap;
}

.medida-input {
  width: auto;
  min-width: 100px;
  max-width: 150px;
  padding: 5px 10px;
  font-size: 1rem;
}

.tipo-select {
  width: auto;
  min-width: 100px;
  padding: 5px 10px;
  font-size: 1rem;
}

.tipo-input {
  width: auto;
  min-width: 100px;
  max-width: 150px;
  padding: 5px 10px;
  font-size: 1rem;
}

.sumas-verticales {
  display: flex;
  justify-content: space-between;
}

.columna {
  width: 48%;
}

.input-group {
  display: flex;
  margin-bottom: 5px;
}

.tara-input, .kilo-input {
  width: auto;
  min-width: 60px;
  padding: 5px;
  font-size: 1rem;
}

.total {
  font-size: 1rem;
  font-weight: bold;
  margin-top: 10px;
}

.cliente-selector {
  margin-bottom: 20px;
}

.reporte-taras {
  margin-top: 20px;
}

.reporte-tara-input, .reporte-bolsas-input {
  width: auto;
  min-width: 60px;
  padding: 5px;
  font-size: 1rem;
}

.cambios {
  margin-top: 20px;
}

button {
  padding: 10px 20px;
  font-size: 1rem;
}

.btn-sm {
  padding: 5px 10px; /* Reducir el tamaño de los botones pequeños */
  font-size: 0.875rem; /* Reducir el tamaño de la fuente para botones pequeños */
}
</style>