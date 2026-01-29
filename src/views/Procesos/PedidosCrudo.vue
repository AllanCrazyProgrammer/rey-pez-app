<template>
  <div class="pedidos-crudo-container">
    <h2>Pedido de Camarón Crudo</h2>
    
    <div class="fecha-container">
      <label for="fecha">Fecha:</label>
      <input 
        type="date" 
        id="fecha" 
        v-model="fecha" 
        required
        :max="fechaMaxima">
    </div>

    <div class="agregar-columna">
      <input 
        type="text" 
        v-model="nuevaColumna" 
        placeholder="Nombre de nueva columna"
        class="input-nueva-columna">
      <button @click="agregarColumna" class="btn-agregar-columna">
        Agregar Columna
      </button>
    </div>

    <div class="tabla-pedidos">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th v-for="columna in columnas" :key="columna">
              {{ columna }}
              <span 
                v-if="!columnasBase.includes(columna)" 
                class="eliminar-columna"
                @click="eliminarColumna(columna)"
              >
                ×
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(cliente, index) in clientes" :key="index">
            <td :class="'cliente-' + cliente.toLowerCase()">{{ cliente }}</td>
            <td v-for="columna in columnas" :key="columna">
              <input 
                type="number" 
                v-model.number="pedidos[cliente][columna.toLowerCase()]" 
                class="numero-input"
                :class="'cliente-' + cliente.toLowerCase()"
                placeholder=""
                @input="handleInputChange(cliente, columna, $event)">
            </td>
          </tr>
          <tr class="fila-totales">
            <td><strong>Total</strong></td>
            <td v-for="columna in columnas" :key="columna + '-total'">
              {{ totalesColumnas[columna.toLowerCase()] || 0 }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="kilos-info">
      <h3>Total Kilos de Crudo: <span>{{ Math.floor(kilosCrudo) }} kg</span></h3>
      <h3>Total Taras de Crudo: <span>{{ Math.floor(tarasCrudo) }} T</span></h3>
    </div>

    <!-- <div class="desglose-medida">
      <h2>Desglose por Medida</h2>
      <table class="tabla-desglose">
        <thead>
          <tr>
            <th>Medida</th>
            <th>Cliente</th>
            <th>Barco</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="medida in columnas">
            <template v-if="clientesConPedidoPorMedida(medida).length > 0">
              <tr v-for="(cliente, index) in clientesConPedidoPorMedida(medida)" 
                  :key="medida + cliente"
                  class="fila-desglose">
                <td class="medida-cell" v-if="index === 0" :rowspan="clientesConPedidoPorMedida(medida).length">
                  {{ medida }}
                </td>
                <td :class="'cliente-' + cliente.toLowerCase()">{{ cliente }}</td>
                <td>
                  <input 
                    type="text" 
                    v-model="barcosPorPedido[cliente][medida.toLowerCase()]" 
                    class="input-barco"
                    placeholder="Nombre del barco">
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div> -->

    <div class="buttons-container">
      <button
        v-if="mostrarBotonRegresar"
        @click="regresarAImpresionLimpio"
        class="btn-regresar"
      >
        Regresar a Limpio
      </button>
      <button @click="guardarPedido" class="btn-guardar">Guardar Pedido</button>
      <button @click="imprimirPedido" class="btn-imprimir">Imprimir</button>
      <button @click="$router.push('/procesos/pedidos')" class="btn-cancelar">Cancelar</button>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, addDoc, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore'

export default {
  name: 'PedidosCrudo',
  data() {
    return {
      fecha: new Date().toISOString().split('T')[0],
      clientes: ['8a', 'Catarro', 'Otilio', 'Ozuna', 'Veronica'],
      columnasBase: ['Med', 'Med-Esp', 'Med-gde', 'Gde', 'Extra'],
      columnasAdicionales: [],
      nuevaColumna: '',
      pedidos: {},
      barcosPorPedido: {},
      isEditing: false,
      pedidoId: null
    }
  },
  computed: {
    fechaMinima() {
      const hoy = new Date()
      return hoy.toISOString().split('T')[0]
    },
    fechaMaxima() {
      const maxDate = new Date()
      maxDate.setMonth(maxDate.getMonth() + 3)
      return maxDate.toISOString().split('T')[0]
    },
    mostrarBotonRegresar() {
      return this.$route.query.origen === 'limpio'
    },
    columnas() {
      return [...this.columnasBase, ...this.columnasAdicionales]
    },
    kilosCrudo() {
      let totalPiezas = 0;
      for (const cliente in this.pedidos) {
        for (const columna in this.pedidos[cliente]) {
          const valor = this.pedidos[cliente][columna];
          if (valor && !isNaN(valor)) {
            totalPiezas += parseFloat(valor);
          }
        }
      }
      return totalPiezas * 19;
    },
    totalesColumnas() {
      const totales = {};
      this.columnas.forEach(columna => {
        const col = columna.toLowerCase();
        totales[col] = this.clientes.reduce((sum, cliente) => {
          if (!this.pedidos[cliente] || !this.pedidos[cliente][col]) {
            return sum;
          }
          const valor = parseFloat(this.pedidos[cliente][col]) || 0;
          return sum + valor;
        }, 0);
      });
      return totales;
    },
    tarasCrudo() {
      return this.kilosCrudo / 19;
    }
  },
  methods: {
    regresarAImpresionLimpio() {
      const { limpioId, limpioFecha } = this.$route.query
      if (limpioId) {
        this.$router.push({
          path: '/procesos/pedidos/limpio',
          query: { edit: 'true', id: limpioId, fecha: limpioFecha || this.fecha, preview: 'true' }
        })
        return
      }

      if (window.history.length > 1) {
        this.$router.back()
      } else if (limpioFecha) {
        this.$router.push({
          path: '/procesos/pedidos/limpio',
          query: { fecha: limpioFecha }
        })
      } else {
        this.$router.push('/procesos/pedidos')
      }
    },
    normalizarNombreColumna(columna) {
      return columna.toLowerCase();
    },
    handleInputChange(cliente, columna, event) {
      const value = event.target.value;
      const columnaNormalizada = columna.toLowerCase();
      
      // Si el campo está vacío, establecer como string vacío en lugar de 0
      if (value === '' || value === null || value === undefined) {
        this.$set(this.pedidos[cliente], columnaNormalizada, '');
      }
    },
    agregarColumna() {
      if (!this.nuevaColumna.trim()) {
        alert('Por favor ingresa un nombre para la columna')
        return
      }

      const nombreColumna = this.nuevaColumna.trim()
      if (this.columnas.includes(nombreColumna)) {
        alert('Esta columna ya existe')
        return
      }

      // Agregar columna a las adicionales
      this.columnasAdicionales.push(nombreColumna)

      // Inicializar la propiedad en cada cliente usando $set para reactividad
      const nombreProp = this.normalizarNombreColumna(nombreColumna)
      this.clientes.forEach(cliente => {
        // Usar $set para asegurar reactividad en Vue 2, inicializar con string vacío
        this.$set(this.pedidos[cliente], nombreProp, '')
        // También inicializar en barcosPorPedido si es necesario
        this.$set(this.barcosPorPedido[cliente], nombreProp, '')
      })

      this.nuevaColumna = ''
    },
    eliminarColumna(columna) {
      const index = this.columnasAdicionales.indexOf(columna)
      if (index > -1) {
        this.columnasAdicionales.splice(index, 1)
        
        const nombreProp = this.normalizarNombreColumna(columna)
        this.clientes.forEach(cliente => {
          this.$delete(this.pedidos[cliente], nombreProp)
        })
      }
    },
    clientesConPedidoPorMedida(medida) {
      return this.clientes.filter(cliente => {
        const cantidad = this.pedidos[cliente][medida.toLowerCase()]
        return cantidad && cantidad > 0
      })
    },
    async guardarPedido() {
      try {
        // Validar que haya al menos un pedido ingresado
        let tienePedidos = false;
        for (const cliente in this.pedidos) {
          for (const columna in this.pedidos[cliente]) {
            const valor = this.pedidos[cliente][columna];
            if (valor && !isNaN(valor) && parseFloat(valor) > 0) {
              tienePedidos = true;
              break;
            }
          }
          if (tienePedidos) break;
        }

        if (!tienePedidos) {
          alert('Por favor ingresa al menos un pedido antes de guardar');
          return;
        }

        // Limpiar datos de pedidos - convertir valores null/undefined/string vacío a 0
        const pedidosLimpios = {};
        for (const cliente in this.pedidos) {
          pedidosLimpios[cliente] = {};
          for (const columna in this.pedidos[cliente]) {
            const valor = this.pedidos[cliente][columna];
            // Convertir null, undefined, string vacío o NaN a 0
            pedidosLimpios[cliente][columna] = (valor && !isNaN(valor)) ? parseFloat(valor) : 0;
          }
        }
        
        const pedidoData = {
          fecha: this.fecha,
          pedidos: pedidosLimpios,
          barcosPorPedido: this.barcosPorPedido,
          columnas: this.columnas,
          columnasAdicionales: this.columnasAdicionales, // Guardar columnas adicionales por separado
          tipo: 'crudo',
          kilos: Math.floor(this.kilosCrudo),
          taras: Math.floor(this.tarasCrudo),
          createdAt: Timestamp.now()
        }

        console.log('Guardando pedido:', pedidoData);
        
        if (this.isEditing && this.pedidoId) {
          // Actualizar pedido existente
          const pedidoRef = doc(db, 'pedidos', this.pedidoId)
          await updateDoc(pedidoRef, pedidoData)
          alert('Pedido actualizado exitosamente')
        } else {
          // Crear nuevo pedido
          await addDoc(collection(db, 'pedidos'), pedidoData)
          alert('Pedido guardado exitosamente')
        }
        
        this.$router.push('/procesos/pedidos')
      } catch (error) {
        console.error('Error al guardar el pedido:', error)
        alert(`Error al guardar el pedido: ${error.message}. Por favor intente nuevamente.`)
      }
    },
    async cargarPedido(id) {
      try {
        const pedidoRef = doc(db, 'pedidos', id)
        const pedidoDoc = await getDoc(pedidoRef)
        
        if (pedidoDoc.exists()) {
          const data = pedidoDoc.data()
          console.log('Cargando pedido:', data);
          
          this.fecha = data.fecha
          
          // Cargar columnas adicionales primero
          this.columnasAdicionales = data.columnasAdicionales || 
                                      data.columnas?.filter(col => !this.columnasBase.includes(col)) || 
                                      []
          
               // Reinicializar pedidos con todas las columnas (base + adicionales)
               this.clientes.forEach(cliente => {
                 const pedidosCliente = {};

                 // Inicializar columnas base con string vacío
                 this.columnasBase.forEach(columna => {
                   const columnaNormalizada = this.normalizarNombreColumna(columna);
                   pedidosCliente[columnaNormalizada] = '';
                 });

                 // Inicializar columnas adicionales con string vacío
                 this.columnasAdicionales.forEach(columna => {
                   const columnaNormalizada = this.normalizarNombreColumna(columna);
                   pedidosCliente[columnaNormalizada] = '';
                 });

                 this.$set(this.pedidos, cliente, pedidosCliente);
               });

               // Cargar los valores guardados
               if (data.pedidos) {
                 for (const cliente in data.pedidos) {
                   if (this.pedidos[cliente]) {
                     for (const columna in data.pedidos[cliente]) {
                       const valor = data.pedidos[cliente][columna];
                       // Solo establecer si el valor es un número válido mayor a 0
                       this.$set(this.pedidos[cliente], columna, (valor && valor > 0) ? valor : '');
                     }
                   }
                 }
               }
          
          this.barcosPorPedido = data.barcosPorPedido || this.initializeBarcosPorPedido()
        } else {
          alert('El pedido no existe')
          this.$router.push('/procesos/pedidos')
        }
      } catch (error) {
        console.error('Error al cargar el pedido:', error)
        alert('Error al cargar el pedido')
        this.$router.push('/procesos/pedidos')
      }
    },
    initializeBarcosPorPedido() {
      const barcos = {}
      this.clientes.forEach(cliente => {
        barcos[cliente] = {}
      })
      return barcos
    },
    imprimirPedido() {
      // Filtrar clientes que tienen al menos un pedido (valor > 0)
      const pedidosConDatos = {};
      
      for (const cliente in this.pedidos) {
        let tieneValores = false;
        
        // Revisar si el cliente tiene al menos un valor mayor a 0
        for (const columna in this.pedidos[cliente]) {
          const valor = this.pedidos[cliente][columna];
          if (valor && !isNaN(valor) && parseFloat(valor) > 0) {
            tieneValores = true;
            break;
          }
        }
        
        // Solo incluir el cliente si tiene valores
        if (tieneValores) {
          pedidosConDatos[cliente] = this.pedidos[cliente];
        }
      }
      
      this.$router.push({
        name: 'PedidoCrudosImpresion',
        params: {
          fecha: this.fecha,
          pedidos: pedidosConDatos,
          columnas: this.columnas
        }
      })
    }
  },
  created() {
    // Inicializar pedidos con todas las propiedades base usando string vacío
    this.clientes.forEach(cliente => {
      const pedidosCliente = {};
      this.columnasBase.forEach(columna => {
        const columnaNormalizada = this.normalizarNombreColumna(columna);
        pedidosCliente[columnaNormalizada] = ''; // String vacío en lugar de null
      });
      this.$set(this.pedidos, cliente, pedidosCliente);
    });

    // Inicializar barcosPorPedido
    this.clientes.forEach(cliente => {
      this.$set(this.barcosPorPedido, cliente, {});
    });

    // Verificar si estamos en modo edición
    const { edit, id, fecha } = this.$route.query;
    if (edit === 'true' && id) {
      this.isEditing = true;
      this.pedidoId = id;
      this.cargarPedido(id);
    } else if (fecha) {
      this.fecha = fecha;
    }
  }
}
</script>

<style scoped>
.pedidos-crudo-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-size: 16px;
}

.fecha-container {
  margin-bottom: 20px;
}

.agregar-columna {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.input-nueva-columna {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
  max-width: 200px;
  font-size: 1rem;
}

.btn-agregar-columna {
  padding: 10px 16px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 1rem;
}

.btn-agregar-columna:hover {
  background-color: #27ae60;
}

.eliminar-columna {
  display: inline-block;
  margin-left: 5px;
  color: #e74c3c;
  cursor: pointer;
  font-weight: bold;
}

.eliminar-columna:hover {
  color: #c0392b;
}

.tabla-pedidos {
  margin-top: 20px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

th, td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: center;
  font-size: 1.05rem;
}

th {
  background-color: #f2f2f2;
  font-weight: bold;
}

input[type="number"] {
  width: 80px;
  padding: 8px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1.1rem;
  font-weight: bold;
  color: black;
}

/* Eliminar flechas de incremento/decremento en Chrome, Safari, Edge, Opera */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Eliminar flechas de incremento/decremento en Firefox */
input[type="number"] {
  -moz-appearance: textfield;
}

.buttons-container {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-guardar,
.btn-cancelar,
.btn-regresar {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: background-color 0.3s ease;
}

.btn-guardar {
  background-color: #3498db;
  color: white;
}

.btn-guardar:hover {
  background-color: #2980b9;
}

.btn-cancelar {
  background-color: #95a5a6;
  color: white;
}

.btn-cancelar:hover {
  background-color: #7f8c8d;
}

.btn-regresar {
  background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%);
  color: #fff;
}

.btn-regresar:hover {
  background: linear-gradient(135deg, #138d75 0%, #17a589 100%);
}

.btn-imprimir {
  background-color: #9b59b6;
  color: white;
}

.btn-imprimir:hover {
  background-color: #8e44ad;
}

/* Estilos para los clientes */
.cliente-8a {
  background-color: #3498db;
  color: white;
}

.cliente-catarro {
  background-color: #e74c3c;
  color: white;
}

.cliente-otilio {
  background-color: #f1c40f;
  color: black;
}

.cliente-ozuna {
  background-color: #2ecc71;
  color: white;
}

.cliente-veronica {
  background-color: #ff8c00;
  color: white;
}

/* Estilos para los inputs de cada cliente */
input.cliente-8a {
  background-color: #ebf5fb;
  border-color: #3498db;
  color: black;
}

input.cliente-catarro {
  background-color: #fdedec;
  border-color: #e74c3c;
  color: black;
}

input.cliente-otilio {
  background-color: #fef9e7;
  border-color: #f1c40f;
  color: black;
}

input.cliente-ozuna {
  background-color: #eafaf1;
  border-color: #2ecc71;
  color: black;
}

input.cliente-veronica {
  background-color: #fff4e6;
  border-color: #ff8c00;
  color: black;
}

/* Estilos cuando el input está enfocado */
input.cliente-8a:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3);
}

input.cliente-catarro:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.3);
}

input.cliente-otilio:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(241, 196, 15, 0.3);
}

input.cliente-ozuna:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.3);
}

input.cliente-veronica:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.3);
}

.kilos-info {
  margin: 20px 0;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.kilos-info h3 {
  color: #2c3e50;
  margin: 0;
  font-size: 1.3rem;
}

.kilos-info span {
  color: #3498db;
  font-weight: bold;
  font-size: 1.4rem;
}

.fila-totales {
  background-color: #f8f9fa;
  font-weight: bold;
}

.fila-totales td {
  padding: 12px;
  border: 2px solid #2c3e50 !important;
}

.desglose-medida {
  margin: 30px 0;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.desglose-medida h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #2c3e50;
  font-size: 1.4rem;
}

.tabla-desglose {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.tabla-desglose th {
  background-color: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: bold;
  border: 1px solid #dee2e6;
}

.tabla-desglose td {
  padding: 12px;
  border: 1px solid #dee2e6;
  vertical-align: middle;
}

.medida-cell {
  font-weight: bold;
  background-color: #f8f9fa;
  text-align: center;
  font-size: 1.1rem;
}

.fila-desglose td {
  border-bottom: 1px solid #dee2e6;
}

.fila-desglose:last-child td {
  border-bottom: 1px solid #dee2e6;
}

.input-barco {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
}

.input-barco:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3);
}

/* Media queries para responsividad */
@media (max-width: 768px) {
  .pedidos-crudo-container {
    padding: 10px;
  }
  
  .agregar-columna {
    flex-direction: column;
  }
  
  .input-nueva-columna {
    max-width: 100%;
  }
  
  .buttons-container {
    flex-direction: column;
  }
  
  .btn-guardar,
  .btn-cancelar,
  .btn-imprimir,
  .btn-regresar {
    width: 100%;
    margin-bottom: 10px;
  }
  
  /* Mejoras para tablas responsivas */
  .tabla-pedidos {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  table {
    min-width: 600px; /* Asegura que la tabla tenga un ancho mínimo */
  }
  
  th, td {
    padding: 8px;
    font-size: 0.95rem;
  }
  
  input[type="number"] {
    width: 60px;
    padding: 6px;
    font-size: 0.95rem;
  }
  
  .desglose-medida {
    padding: 10px;
    margin: 15px 0;
  }
  
  .desglose-medida h2 {
    font-size: 1.2rem;
    margin-bottom: 10px;
  }
  
  .tabla-desglose {
    min-width: 500px;
  }
  
  .tabla-desglose th,
  .tabla-desglose td {
    padding: 8px;
    font-size: 0.95rem;
  }
  
  .input-barco {
    padding: 6px;
    font-size: 0.95rem;
  }
  
  .kilos-info {
    padding: 10px;
    margin: 15px 0;
  }
  
  .kilos-info h3 {
    font-size: 1.1rem;
  }
  
  .kilos-info span {
    font-size: 1.2rem;
  }
}
</style> 