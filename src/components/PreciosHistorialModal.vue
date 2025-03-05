<template>
  <div>
    <!-- Botón para abrir el modal -->
    <button @click="abrirModal" class="precio-historial-btn">
      {{ clienteActual ? `Precios de Venta - ${obtenerNombreCliente(clienteActual)}` : 'Precios de Venta' }}
    </button>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ clienteActual ? `Precios de Venta - ${obtenerNombreCliente(clienteActual)}` : 'Precios de Venta' }}</h2>
          <button @click="showModal = false" class="close-btn">&times;</button>
        </div>

        <!-- Formulario para agregar nuevo precio -->
        <div class="add-price-form">
          <h3>Agregar Nuevo Precio</h3>
          <div class="form-group">
            <input v-model="newPrice.producto" type="text" placeholder="Producto/Medida" list="productos">
            <datalist id="productos">
              <option v-for="producto in preciosActuales" :key="producto.id" :value="producto.producto"></option>
            </datalist>
            <input v-model.number="newPrice.precio" type="number" placeholder="Precio">
            <input v-model="newPrice.fecha" type="date" :max="currentDate">
            
            <!-- Nuevo campo para seleccionar cliente específico -->
            <div class="cliente-especifico">
              <input type="checkbox" id="clienteEspecifico" v-model="newPrice.esClienteEspecifico">
              <label for="clienteEspecifico">Precio para cliente específico</label>
            </div>
            
            <!-- Selector de cliente que aparece solo cuando se marca la casilla -->
            <div v-if="newPrice.esClienteEspecifico" class="cliente-selector">
              <label>Seleccionar cliente:</label>
              <div class="cliente-botones">
                <button 
                  v-for="cliente in clientes" 
                  :key="cliente.id" 
                  @click="seleccionarCliente(cliente.id)"
                  class="cliente-btn"
                  :class="{'cliente-seleccionado': newPrice.clienteId === cliente.id}"
                  :style="{ backgroundColor: cliente.color }">
                  {{ cliente.nombre }}
                </button>
              </div>
            </div>
            
            <button @click="agregarPrecio" class="add-btn">Agregar</button>
          </div>
        </div>

        <!-- Filtro para mostrar precios específicos por cliente -->
        <div class="filter-section">
          <label>Filtrar por cliente:</label>
          <div class="cliente-filtro-botones">
            <button 
              @click="filtroCliente = ''" 
              class="cliente-filtro-btn"
              :class="{'cliente-filtro-seleccionado': filtroCliente === ''}">
              Todos
            </button>
            <button 
              v-for="cliente in clientes" 
              :key="cliente.id" 
              @click="filtroCliente = cliente.id"
              class="cliente-filtro-btn"
              :class="{'cliente-filtro-seleccionado': filtroCliente === cliente.id}"
              :style="{ backgroundColor: cliente.color }">
              {{ cliente.nombre }}
            </button>
          </div>
        </div>

        <!-- Lista de productos y precios actuales -->
        <div class="current-prices">
          <h3>Precios Actuales</h3>
          <div v-for="categoria in categorias" :key="categoria" class="categoria-section">
            <h4 class="categoria-title">{{ categoria }}</h4>
            <div class="products-grid">
              <div 
                v-for="producto in filtrarPreciosPorCliente(preciosOrdenados[categoria])" 
                :key="producto.id" 
                class="product-card" 
                :class="{'precio-especifico': producto.clienteId}"
                :style="producto.clienteId ? { borderColor: obtenerColorCliente(producto.clienteId), backgroundColor: obtenerColorClienteConOpacidad(producto.clienteId) } : {}">
                <h4>{{ producto.producto }}</h4>
                <p class="price">${{ formatNumber(producto.precio) }}</p>
                <p class="date">Desde: {{ formatDate(producto.fecha) }}</p>
                <p v-if="producto.clienteId" class="cliente-especifico-tag" :style="{ backgroundColor: obtenerColorCliente(producto.clienteId) }">
                  Cliente: {{ obtenerNombreCliente(producto.clienteId) }}
                </p>
                <p class="historial-count">
                  {{ producto.historial.length }} precio{{ producto.historial.length !== 1 ? 's' : '' }} registrado{{ producto.historial.length !== 1 ? 's' : '' }}
                </p>
                <button @click="mostrarHistorial(producto)" class="history-btn">
                  Ver Historial
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal de historial -->
        <div v-if="showHistorialModal" class="historial-modal">
          <div class="historial-content">
            <div class="historial-header">
              <h3>Historial de Precios - {{ productoSeleccionado?.producto }}</h3>
              <button @click="showHistorialModal = false" class="close-btn">&times;</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Precio</th>
                  <th>Cliente</th>
                  <th>Cambio</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(precio, index) in historialPrecios" :key="index">
                  <td>{{ formatDate(precio.fecha) }}</td>
                  <td>${{ formatNumber(precio.precio) }}</td>
                  <td>
                    <span 
                      v-if="precio.clienteId" 
                      class="cliente-especifico-tag"
                      :style="{ backgroundColor: obtenerColorCliente(precio.clienteId) }">
                      {{ obtenerNombreCliente(precio.clienteId) }}
                    </span>
                    <span v-else>General</span>
                  </td>
                  <td>
                    <span v-if="index < historialPrecios.length - 1" 
                          :class="{'precio-subio': precio.precio < historialPrecios[index + 1].precio,
                                 'precio-bajo': precio.precio > historialPrecios[index + 1].precio}">
                      {{ calcularCambio(precio.precio, historialPrecios[index + 1].precio) }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <button @click="eliminarPrecio(precio)" class="delete-btn" title="Eliminar precio">
                      <span class="delete-icon">&times;</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';

export default {
  name: 'PreciosHistorialModal',
  props: {
    clienteActual: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      showModal: false,
      showHistorialModal: false,
      preciosActuales: [],
      historialPrecios: [],
      productoSeleccionado: null,
      categorias: ['Camarón S/C', 'Camarón C/C', 'Otros'],
      clientes: [
        { id: 'joselito', nombre: 'Joselito', color: '#2196F3' },
        { id: 'catarro', nombre: 'Catarro', color: '#d32f2f' },
        { id: 'otilio', nombre: 'Otilio', color: '#FFD700' },
        { id: 'ozuna', nombre: 'Ozuna', color: '#07711e' }
      ],
      filtroCliente: '',
      newPrice: {
        producto: '',
        precio: null,
        fecha: new Date().toISOString().split('T')[0],
        categoria: 'Otros',
        esClienteEspecifico: false,
        clienteId: ''
      }
    };
  },
  computed: {
    currentDate() {
      return new Date().toISOString().split('T')[0];
    },
    preciosOrdenados() {
      const preciosAgrupados = {};
      
      // Inicializar grupos
      this.categorias.forEach(categoria => {
        preciosAgrupados[categoria] = [];
      });

      // Agrupar productos por categoría
      this.preciosActuales.forEach(producto => {
        const nombreProducto = producto.producto.toLowerCase();
        if (nombreProducto.includes('s/c') || nombreProducto.match(/\d+\/\d+/)) {
          preciosAgrupados['Camarón S/C'].push(producto);
        } else if (nombreProducto.includes('c/c')) {
          preciosAgrupados['Camarón C/C'].push(producto);
        } else {
          preciosAgrupados['Otros'].push(producto);
        }
      });

      // Ordenar cada grupo
      Object.keys(preciosAgrupados).forEach(categoria => {
        preciosAgrupados[categoria].sort((a, b) => {
          // Extraer números de las medidas (ejemplo: 51/60 -> [51, 60])
          const getNumeros = (str) => {
            const matches = str.match(/(\d+)\/(\d+)/);
            return matches ? [parseInt(matches[1]), parseInt(matches[2])] : [0, 0];
          };

          const numerosA = getNumeros(a.producto);
          const numerosB = getNumeros(b.producto);

          // Si ambos tienen formato número/número, ordenar por el primer número
          if (numerosA[0] && numerosB[0]) {
            return numerosA[0] - numerosB[0];
          }

          // Si no, ordenar alfabéticamente
          return a.producto.localeCompare(b.producto);
        });
      });

      return preciosAgrupados;
    }
  },
  methods: {
    formatNumber(value) {
      return value?.toLocaleString('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) || '0.00';
    },
    formatDate(date) {
      if (!date) return '';
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(date).toLocaleDateString('es-ES', options);
    },
    calcularCambio(precioActual, precioAnterior) {
      const diferencia = precioActual - precioAnterior;
      const porcentaje = (diferencia / precioAnterior) * 100;
      const signo = diferencia > 0 ? '+' : '';
      return `${signo}${this.formatNumber(diferencia)} (${signo}${porcentaje.toFixed(1)}%)`;
    },
    async cargarPreciosActuales() {
      try {
        const preciosRef = collection(db, 'precios');
        const q = query(preciosRef, orderBy('fecha', 'desc'));
        const preciosSnapshot = await getDocs(q);
        
        // Crear un mapa para organizar los precios por producto y cliente
        const preciosMap = new Map();
        
        preciosSnapshot.docs.forEach(doc => {
          const precio = { id: doc.id, ...doc.data() };
          // Clave única para cada combinación de producto y cliente
          const clave = precio.clienteId 
            ? `${precio.producto}-${precio.clienteId}` 
            : precio.producto;
            
          if (!preciosMap.has(clave)) {
            preciosMap.set(clave, {
              producto: precio.producto,
              precioActual: precio.precio,
              fechaActual: precio.fecha,
              clienteId: precio.clienteId || null,
              historial: []
            });
          }
          preciosMap.get(clave).historial.push({
            id: doc.id,
            fecha: precio.fecha,
            precio: precio.precio,
            clienteId: precio.clienteId || null
          });
        });
        
        this.preciosActuales = Array.from(preciosMap.values()).map(item => ({
          id: item.historial[0].id,
          producto: item.producto,
          precio: item.precioActual,
          fecha: item.fechaActual,
          clienteId: item.clienteId,
          historial: item.historial
        }));
      } catch (error) {
        console.error('Error al cargar precios:', error);
      }
    },
    obtenerNombreCliente(clienteId) {
      const cliente = this.clientes.find(c => c.id === clienteId);
      return cliente ? cliente.nombre : 'Cliente desconocido';
    },
    obtenerColorCliente(clienteId) {
      const cliente = this.clientes.find(c => c.id === clienteId);
      return cliente ? cliente.color : '#2196F3';
    },
    obtenerColorClienteConOpacidad(clienteId) {
      const cliente = this.clientes.find(c => c.id === clienteId);
      if (!cliente) return 'rgba(33, 150, 243, 0.1)';
      
      // Convertir color hexadecimal a rgba con opacidad
      let hex = cliente.color.replace('#', '');
      let r = parseInt(hex.substring(0, 2), 16);
      let g = parseInt(hex.substring(2, 4), 16);
      let b = parseInt(hex.substring(4, 6), 16);
      
      return `rgba(${r}, ${g}, ${b}, 0.15)`;
    },
    seleccionarCliente(clienteId) {
      this.newPrice.clienteId = clienteId;
    },
    filtrarPreciosPorCliente(productos) {
      if (!this.filtroCliente) {
        // Si no hay filtro, mostrar todos los precios dando prioridad a los específicos
        // Agrupar por producto para mostrar solo el precio específico si existe
        const productosAgrupados = {};
        
        // Primero agregar todos los precios generales
        productos.forEach(producto => {
          if (!producto.clienteId) {
            productosAgrupados[producto.producto] = producto;
          }
        });
        
        // Luego sobrescribir con precios específicos si existen
        productos.forEach(producto => {
          if (producto.clienteId) {
            productosAgrupados[producto.producto] = producto;
          }
        });
        
        return Object.values(productosAgrupados);
      } else {
        // Si hay filtro, mostrar solo los precios para ese cliente específico
        // o los precios generales si no hay específicos
        const productosEspecificos = productos.filter(p => p.clienteId === this.filtroCliente);
        const productosGenerales = productos.filter(p => !p.clienteId);
        
        // Crear un mapa de productos específicos para verificación rápida
        const productosEspecificosMap = {};
        productosEspecificos.forEach(p => {
          productosEspecificosMap[p.producto] = true;
        });
        
        // Filtrar productos generales que no tienen versión específica
        const productosGeneralesFiltrados = productosGenerales.filter(
          p => !productosEspecificosMap[p.producto]
        );
        
        // Combinar productos específicos con generales que no tienen versión específica
        return [...productosEspecificos, ...productosGeneralesFiltrados];
      }
    },
    async agregarPrecio() {
      if (!this.newPrice.producto || !this.newPrice.precio || !this.newPrice.fecha) {
        alert('Por favor complete todos los campos');
        return;
      }

      if (this.newPrice.esClienteEspecifico && !this.newPrice.clienteId) {
        alert('Por favor seleccione un cliente');
        return;
      }

      try {
        // Ajustar la fecha para compensar la zona horaria
        const fecha = new Date(this.newPrice.fecha);
        fecha.setDate(fecha.getDate() + 1);
        const fechaAjustada = fecha.toISOString().split('T')[0];

        // Determinar la categoría basada en el nombre del producto
        const nombreProducto = this.newPrice.producto.toLowerCase();
        let categoria = 'Otros';
        if (nombreProducto.includes('s/c') || nombreProducto.match(/\d+\/\d+/)) {
          categoria = 'Camarón S/C';
        } else if (nombreProducto.includes('c/c')) {
          categoria = 'Camarón C/C';
        }

        const nuevoPrecio = {
          producto: this.newPrice.producto,
          precio: this.newPrice.precio,
          fecha: fechaAjustada,
          categoria: categoria
        };

        // Agregar clienteId solo si es un precio específico
        if (this.newPrice.esClienteEspecifico && this.newPrice.clienteId) {
          nuevoPrecio.clienteId = this.newPrice.clienteId;
        }

        await addDoc(collection(db, 'precios'), nuevoPrecio);

        // Limpiar el formulario
        this.newPrice = {
          producto: '',
          precio: null,
          fecha: new Date().toISOString().split('T')[0],
          categoria: 'Otros',
          esClienteEspecifico: false,
          clienteId: ''
        };

        // Recargar precios actuales
        await this.cargarPreciosActuales();
      } catch (error) {
        console.error('Error al agregar precio:', error);
        alert('Error al guardar el precio');
      }
    },
    async eliminarPrecio(precio) {
      if (confirm('¿Estás seguro de que deseas eliminar este precio?')) {
        try {
          await deleteDoc(doc(db, 'precios', precio.id));
          await this.cargarPreciosActuales();
          
          // Si el producto seleccionado aún existe, actualizar su historial
          if (this.productoSeleccionado) {
            const productoActualizado = this.preciosActuales.find(p => p.producto === this.productoSeleccionado.producto);
            if (productoActualizado) {
              this.historialPrecios = productoActualizado.historial;
            } else {
              this.showHistorialModal = false;
            }
          }
        } catch (error) {
          console.error('Error al eliminar precio:', error);
          alert('Error al eliminar el precio');
        }
      }
    },
    async mostrarHistorial(producto) {
      try {
        this.productoSeleccionado = producto;
        this.historialPrecios = producto.historial;
        this.showHistorialModal = true;
      } catch (error) {
        console.error('Error al cargar historial:', error);
        alert('Error al cargar el historial de precios');
      }
    },
    // Método para abrir el modal y establecer el filtro de cliente
    abrirModal() {
      // Establecer el filtro de cliente si hay un cliente actual
      if (this.clienteActual && this.clientes.some(c => c.id === this.clienteActual)) {
        this.filtroCliente = this.clienteActual;
        
        // Preseleccionar el cliente para nuevos precios
        this.newPrice.esClienteEspecifico = true;
        this.newPrice.clienteId = this.clienteActual;
      }
      
      this.showModal = true;
    }
  },
  watch: {
    // Observar cambios en clienteActual para actualizar el filtro
    clienteActual: {
      immediate: true,
      handler(nuevoCliente) {
        if (nuevoCliente && this.clientes.some(c => c.id === nuevoCliente)) {
          this.filtroCliente = nuevoCliente;
          
          // Si estamos agregando un nuevo precio y el cliente está definido,
          // preseleccionamos ese cliente y marcamos como precio específico
          if (nuevoCliente) {
            this.newPrice.esClienteEspecifico = true;
            this.newPrice.clienteId = nuevoCliente;
          }
        }
      }
    }
  },
  mounted() {
    this.cargarPreciosActuales();
  }
};
</script>

<style scoped>
.precio-historial-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.precio-historial-btn:hover {
  background-color: #45a049;
}

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

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.add-price-form {
  margin-bottom: 30px;
}

.form-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.form-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
}

.cliente-especifico {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 10px 0;
  width: 100%;
}

.cliente-selector {
  width: 100%;
  margin: 10px 0;
}

.cliente-botones, .cliente-filtro-botones {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
}

.cliente-btn, .cliente-filtro-btn {
  padding: 8px 15px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  color: white;
  font-weight: bold;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 80px;
  text-align: center;
}

.cliente-btn:hover, .cliente-filtro-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.cliente-seleccionado, .cliente-filtro-seleccionado {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.cliente-filtro-btn:first-child {
  background-color: #607D8B;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-label {
  font-size: 0.9em;
  color: #666;
}

.add-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.product-card {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  position: relative;
  border: 2px solid;
}

.precio-especifico {
  border: 2px solid;
}

.cliente-especifico-tag {
  font-size: 0.8em;
  background-color: #2196F3;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  display: inline-block;
  margin: 5px 0;
}

.product-card h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.price {
  font-size: 1.2em;
  font-weight: bold;
  color: #4CAF50;
  margin: 10px 0;
}

.date {
  font-size: 0.9em;
  color: #666;
  margin: 5px 0;
}

.history-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  margin-top: 10px;
}

.historial-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 80%;
  max-width: 600px;
  z-index: 1001;
}

.historial-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
}

.historial-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.historial-content th,
.historial-content td {
  padding: 12px;
  border: 1px solid #ddd;
  text-align: left;
}

.historial-content th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.historial-content tr:hover {
  background-color: #f9f9f9;
}

.historial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.historial-count {
  font-size: 0.8em;
  color: #666;
  margin: 5px 0;
  font-style: italic;
}

.precio-subio {
  color: #f44336;
  font-weight: bold;
}

.precio-bajo {
  color: #4CAF50;
  font-weight: bold;
}

.actions-cell {
  width: 50px;
  text-align: center;
}

.delete-btn {
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  padding: 5px;
  font-size: 18px;
  transition: color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  color: #d32f2f;
}

.delete-icon {
  font-weight: bold;
}

@media (max-width: 600px) {
  .form-group {
    flex-direction: column;
  }
  
  .products-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
    padding: 15px;
  }
  
  .historial-modal {
    width: 95%;
  }
}

.categoria-section {
  margin-bottom: 30px;
}

.categoria-title {
  color: #333;
  font-size: 1.2em;
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 2px solid #4CAF50;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}
</style> 