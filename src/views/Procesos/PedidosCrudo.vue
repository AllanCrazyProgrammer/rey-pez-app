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
                v-model="pedidos[cliente][columna.toLowerCase()]" 
                class="numero-input"
                :class="'cliente-' + cliente.toLowerCase()"
                placeholder="">
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

    <div class="desglose-medida">
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
    </div>

    <!-- Componente de Canvas para dibujo y notas -->
    <canvas-dibujo ref="canvasDibujo"></canvas-dibujo>

    <div class="buttons-container">
      <button @click="guardarPedido" class="btn-guardar">Guardar Pedido</button>
      <button @click="imprimirPedido" class="btn-imprimir">Imprimir</button>
      <button @click="$router.push('/procesos/pedidos')" class="btn-cancelar">Cancelar</button>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, addDoc, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore'
import CanvasDibujo from '@/components/CanvasDibujo.vue'

export default {
  name: 'PedidosCrudo',
  components: {
    CanvasDibujo
  },
  data() {
    return {
      fecha: new Date().toISOString().split('T')[0],
      clientes: ['8a', 'Catarro', 'Otilio', 'Ozuna'],
      columnasBase: ['Med', 'Med-Esp', 'Med-gde', 'Gde', 'Extra'],
      columnasAdicionales: [],
      nuevaColumna: '',
      pedidos: {
        '8a': { med: null, 'med-esp': null, 'med-gde': null, gde: null, extra: null },
        Catarro: { med: null, 'med-esp': null, 'med-gde': null, gde: null, extra: null },
        Otilio: { med: null, 'med-esp': null, 'med-gde': null, gde: null, extra: null },
        Ozuna: { med: null, 'med-esp': null, 'med-gde': null, gde: null, extra: null }
      },
      barcosPorPedido: {
        '8a': {},
        'Catarro': {},
        'Otilio': {},
        'Ozuna': {}
      },
      isEditing: false,
      pedidoId: null,
      dibujoCanvas: null
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
    normalizarNombreColumna(columna) {
      return columna.toLowerCase();
    },
    agregarColumna() {
      if (!this.nuevaColumna.trim()) return
      
      const nombreColumna = this.nuevaColumna.trim()
      if (this.columnas.includes(nombreColumna)) {
        alert('Esta columna ya existe')
        return
      }

      this.columnasAdicionales.push(nombreColumna)
      
      const nombreProp = this.normalizarNombreColumna(nombreColumna)
      this.clientes.forEach(cliente => {
        this.$set(this.pedidos[cliente], nombreProp, null)
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
        // Obtener datos del canvas si existe
        let dibujoData = null;
        if (this.$refs.canvasDibujo && this.$refs.canvasDibujo.canvas) {
          // Convertir el objeto canvas a una cadena de texto (string)
          // Firestore no admite arrays anidados que pueden estar en el objeto JSON
          const canvasJSON = this.$refs.canvasDibujo.canvas.toJSON();
          dibujoData = JSON.stringify(canvasJSON);
          console.log('Canvas guardado como string');
        }
        
        const pedidoData = {
          fecha: this.fecha,
          pedidos: this.pedidos,
          barcosPorPedido: this.barcosPorPedido,
          columnas: this.columnas,
          tipo: 'crudo',
          kilos: this.kilosCrudo,
          createdAt: Timestamp.now(),
          dibujoCanvas: dibujoData // Ahora es una cadena de texto
        }
        
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
        alert('Error al guardar el pedido. Por favor intente nuevamente.')
      }
    },
    async cargarPedido(id) {
      try {
        const pedidoRef = doc(db, 'pedidos', id)
        const pedidoDoc = await getDoc(pedidoRef)
        
        if (pedidoDoc.exists()) {
          const data = pedidoDoc.data()
          this.fecha = data.fecha
          this.pedidos = data.pedidos
          this.barcosPorPedido = data.barcosPorPedido || this.initializeBarcosPorPedido()
          this.columnasAdicionales = data.columnas.filter(col => !this.columnasBase.includes(col))
          
          // Guardar los datos del dibujo para cargarlos cuando el componente esté listo
          if (data.dibujoCanvas) {
            console.log('Dibujo encontrado en el pedido, preparando para cargar');
            this.dibujoCanvas = data.dibujoCanvas;
            
            // Intentar cargar el dibujo después de que el DOM se actualice
            this.$nextTick(() => {
              console.log('DOM actualizado, intentando cargar el dibujo');
              this.cargarDibujoEnCanvas();
            });
          } else {
            console.log('No hay dibujo guardado en este pedido');
          }
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
      this.$router.push({
        name: 'PedidoCrudosImpresion',
        params: {
          fecha: this.fecha,
          pedidos: this.pedidos,
          columnas: this.columnas
        }
      })
    },
    // Método para cargar el dibujo en el canvas cuando esté listo
    cargarDibujoEnCanvas() {
      try {
        // Verificar que el componente canvas esté disponible
        if (this.$refs.canvasDibujo && this.$refs.canvasDibujo.canvas && this.dibujoCanvas) {
          // Convertir la cadena de texto de vuelta a un objeto JSON
          const canvasJSON = JSON.parse(this.dibujoCanvas);
          
          this.$refs.canvasDibujo.canvas.loadFromJSON(canvasJSON, () => {
            this.$refs.canvasDibujo.canvas.renderAll();
            console.log('Dibujo cargado correctamente en el canvas');
          });
        } else {
          // Si el canvas no está listo, intentar nuevamente después de un breve retraso
          setTimeout(() => {
            this.cargarDibujoEnCanvas();
          }, 500);
        }
      } catch (error) {
        console.error('Error al cargar el dibujo en el canvas:', error);
      }
    }
  },
  async created() {
    // Verificar si estamos en modo edición
    const { edit, id } = this.$route.query
    if (edit === 'true' && id) {
      this.isEditing = true
      this.pedidoId = id
      await this.cargarPedido(id)
    }
  }
}
</script>

<style scoped>
.pedidos-crudo-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
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
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
  max-width: 200px;
}

.btn-agregar-columna {
  padding: 8px 16px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
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
  font-size: 16px;
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
.btn-cancelar {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
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
}

.kilos-info span {
  color: #3498db;
  font-weight: bold;
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
  font-size: 14px;
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
  .btn-imprimir {
    width: 100%;
    margin-bottom: 10px;
  }
}
</style> 