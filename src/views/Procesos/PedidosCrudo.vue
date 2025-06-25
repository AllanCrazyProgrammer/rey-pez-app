<template>
  <div class="pedidos-crudo-container">
    <header class="page-header">
      <h2>Pedido de Camarón Crudo</h2>
    </header>
    
    <section class="fecha-section">
      <div class="fecha-container">
        <label for="fecha">Fecha:</label>
        <input 
          type="date" 
          id="fecha" 
          v-model="fecha" 
          required
          :max="fechaMaxima"
          class="fecha-input">
      </div>

      <div class="agregar-columna">
        <input 
          type="text" 
          v-model="nuevaColumna" 
          placeholder="Nombre de nueva columna"
          class="input-nueva-columna"
          @keyup.enter="agregarColumna">
        <button @click="agregarColumna" class="btn-agregar-columna" :disabled="!nuevaColumna.trim()">
          Agregar Columna
        </button>
      </div>
    </section>

    <section class="tabla-section">
      <div class="tabla-pedidos">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th v-for="columna in columnas" :key="columna" class="th-columna">
                {{ columna }}
                <button 
                  v-if="!columnasBase.includes(columna)" 
                  class="eliminar-columna"
                  @click="eliminarColumna(columna)"
                  :aria-label="`Eliminar columna ${columna}`"
                  title="Eliminar columna">
                  ×
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cliente in clientes" :key="cliente">
              <td :class="`cliente-${cliente.toLowerCase()}`">{{ cliente }}</td>
              <td v-for="columna in columnas" :key="`${cliente}-${columna}`">
                <input 
                  type="number" 
                  v-model.number="pedidos[cliente][columna.toLowerCase()]" 
                  class="numero-input"
                  :class="`cliente-${cliente.toLowerCase()}`"
                  placeholder="0"
                  min="0"
                  step="1">
              </td>
            </tr>
            <tr class="fila-totales">
              <td><strong>Total</strong></td>
              <td v-for="columna in columnas" :key="`${columna}-total`">
                <strong>{{ obtenerTotalColumna(columna) }}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="resumen-section">
      <div class="kilos-info">
        <div class="info-item">
          <span class="label">Total Kilos de Crudo:</span>
          <span class="value">{{ kilosCrudoFormateado }} kg</span>
        </div>
        <div class="info-item">
          <span class="label">Total Taras de Crudo:</span>
          <span class="value">{{ tarasCrudoFormateado }} T</span>
        </div>
      </div>
    </section>

    <!-- Componente de Canvas para dibujo y notas -->
    <canvas-dibujo ref="canvasDibujo"></canvas-dibujo>

    <footer class="buttons-container">
      <button @click="guardarPedido" class="btn-primary">
        {{ isEditing ? 'Actualizar Pedido' : 'Guardar Pedido' }}
      </button>
      <button @click="imprimirPedido" class="btn-secondary">Imprimir</button>
      <button @click="cancelar" class="btn-tertiary">Cancelar</button>
    </footer>
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
      clientes: ['8a', 'Catarro', 'Otilio', 'Ozuna', 'Elizabeth'],
      columnasBase: ['Med', 'Med-Esp', 'Med-gde', 'Gde', 'Extra'],
      columnasAdicionales: [],
      nuevaColumna: '',
      pedidos: this.inicializarPedidos(),
      isEditing: false,
      pedidoId: null,
      dibujoCanvas: null,
      isLoading: false
    }
  },
  computed: {
    fechaMaxima() {
      const maxDate = new Date()
      maxDate.setMonth(maxDate.getMonth() + 3)
      return maxDate.toISOString().split('T')[0]
    },
    columnas() {
      return [...this.columnasBase, ...this.columnasAdicionales]
    },
    totalPiezas() {
      return Object.values(this.pedidos).reduce((total, clientePedidos) => {
        return total + Object.values(clientePedidos).reduce((subtotal, cantidad) => {
          return subtotal + (Number(cantidad) || 0)
        }, 0)
      }, 0)
    },
    kilosCrudo() {
      return this.totalPiezas * 19
    },
    kilosCrudoFormateado() {
      return Math.floor(this.kilosCrudo).toLocaleString()
    },
    tarasCrudo() {
      return this.kilosCrudo / 19
    },
    tarasCrudoFormateado() {
      return Math.floor(this.tarasCrudo).toLocaleString()
    }
  },
  methods: {
    inicializarPedidos() {
      const pedidos = {}
      this.clientes.forEach(cliente => {
        pedidos[cliente] = {}
        this.columnasBase.forEach(columna => {
          pedidos[cliente][columna.toLowerCase()] = null
        })
      })
      return pedidos
    },
    obtenerTotalColumna(columna) {
      const col = columna.toLowerCase()
      return this.clientes.reduce((sum, cliente) => {
        const valor = Number(this.pedidos[cliente]?.[col]) || 0
        return sum + valor
      }, 0)
    },
    agregarColumna() {
      const nombreColumna = this.nuevaColumna.trim()
      if (!nombreColumna) return
      
      if (this.columnas.includes(nombreColumna)) {
        this.mostrarMensaje('Esta columna ya existe', 'warning')
        return
      }

      this.columnasAdicionales.push(nombreColumna)
      const nombreProp = nombreColumna.toLowerCase()
      
      // Agregar la nueva columna a todos los clientes
      this.clientes.forEach(cliente => {
        this.$set(this.pedidos[cliente], nombreProp, null)
      })

      this.nuevaColumna = ''
    },
    eliminarColumna(columna) {
      const index = this.columnasAdicionales.indexOf(columna)
      if (index > -1) {
        this.columnasAdicionales.splice(index, 1)
        const nombreProp = columna.toLowerCase()
        
        // Eliminar la columna de todos los clientes
        this.clientes.forEach(cliente => {
          this.$delete(this.pedidos[cliente], nombreProp)
        })
      }
    },
    async guardarPedido() {
      if (this.isLoading) return
      
      this.isLoading = true
      try {
        const dibujoData = await this.obtenerDatosCanvas()
        
        const pedidoData = {
          fecha: this.fecha,
          pedidos: this.pedidos,
          columnas: this.columnas,
          tipo: 'crudo',
          kilos: this.kilosCrudo,
          piezas: this.totalPiezas,
          createdAt: Timestamp.now(),
          dibujoCanvas: dibujoData
        }
        
        if (this.isEditing && this.pedidoId) {
          await updateDoc(doc(db, 'pedidos', this.pedidoId), pedidoData)
          this.mostrarMensaje('Pedido actualizado exitosamente', 'success')
        } else {
          await addDoc(collection(db, 'pedidos'), pedidoData)
          this.mostrarMensaje('Pedido guardado exitosamente', 'success')
        }
        
        this.$router.push('/procesos/pedidos')
      } catch (error) {
        console.error('Error al guardar el pedido:', error)
        this.mostrarMensaje('Error al guardar el pedido. Por favor intente nuevamente.', 'error')
      } finally {
        this.isLoading = false
      }
    },
    async obtenerDatosCanvas() {
      if (this.$refs.canvasDibujo?.canvas) {
        try {
          const canvasJSON = this.$refs.canvasDibujo.canvas.toJSON()
          return JSON.stringify(canvasJSON)
        } catch (error) {
          console.error('Error al obtener datos del canvas:', error)
          return null
        }
      }
      return null
    },
    async cargarPedido(id) {
      this.isLoading = true
      try {
        const pedidoDoc = await getDoc(doc(db, 'pedidos', id))
        
        if (!pedidoDoc.exists()) {
          this.mostrarMensaje('El pedido no existe', 'error')
          this.$router.push('/procesos/pedidos')
          return
        }

        const data = pedidoDoc.data()
        this.fecha = data.fecha
        this.pedidos = data.pedidos
        this.columnasAdicionales = data.columnas?.filter(col => !this.columnasBase.includes(col)) || []
        
        if (data.dibujoCanvas) {
          this.dibujoCanvas = data.dibujoCanvas
          this.$nextTick(() => {
            this.cargarDibujoEnCanvas()
          })
        }
      } catch (error) {
        console.error('Error al cargar el pedido:', error)
        this.mostrarMensaje('Error al cargar el pedido', 'error')
        this.$router.push('/procesos/pedidos')
      } finally {
        this.isLoading = false
      }
    },
    cargarDibujoEnCanvas() {
      if (!this.$refs.canvasDibujo?.canvas || !this.dibujoCanvas) return
      
      try {
        const canvasJSON = JSON.parse(this.dibujoCanvas)
        this.$refs.canvasDibujo.canvas.loadFromJSON(canvasJSON, () => {
          this.$refs.canvasDibujo.canvas.renderAll()
        })
      } catch (error) {
        console.error('Error al cargar el dibujo en el canvas:', error)
      }
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
    cancelar() {
      this.$router.push('/procesos/pedidos')
    },
    mostrarMensaje(mensaje, tipo = 'info') {
      // Implementar sistema de notificaciones si está disponible
      if (tipo === 'error') {
        alert(mensaje) // Fallback temporal
      } else {
        alert(mensaje) // Fallback temporal
      }
    }
  },
  created() {
    // Verificar si estamos en modo edición
    const { edit, id } = this.$route.query
    if (edit === 'true' && id) {
      this.isEditing = true
      this.pedidoId = id
      this.cargarPedido(id)
    }
  }
}
</script>

<style scoped>
/* Variables CSS para consistencia */
:root {
  --color-primary: #3498db;
  --color-secondary: #2ecc71;
  --color-danger: #e74c3c;
  --color-warning: #f1c40f;
  --color-purple: #9b59b6;
  --color-gray: #95a5a6;
  --color-dark: #2c3e50;
  --color-light: #f8f9fa;
  --border-radius: 8px;
  --spacing: 1rem;
  --transition: all 0.3s ease;
}

.pedidos-crudo-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--spacing);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.page-header h2 {
  text-align: center;
  color: var(--color-dark);
  margin-bottom: var(--spacing);
  font-size: 1.8rem;
  font-weight: 600;
}

.fecha-section {
  background: white;
  padding: var(--spacing);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: var(--spacing);
}

.fecha-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: var(--spacing);
}

.fecha-container label {
  font-weight: 600;
  color: var(--color-dark);
}

.fecha-input {
  padding: 0.5rem;
  border: 2px solid #e1e5e9;
  border-radius: var(--border-radius);
  font-size: 1rem;
  transition: var(--transition);
}

.fecha-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.agregar-columna {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.input-nueva-columna {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem;
  border: 2px solid #e1e5e9;
  border-radius: var(--border-radius);
  font-size: 1rem;
  transition: var(--transition);
}

.input-nueva-columna:focus {
  outline: none;
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.1);
}

.btn-agregar-columna {
  padding: 0.75rem 1rem;
  background-color: var(--color-secondary);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: var(--transition);
}

.btn-agregar-columna:hover:not(:disabled) {
  background-color: #27ae60;
  transform: translateY(-1px);
}

.btn-agregar-columna:disabled {
  background-color: var(--color-gray);
  cursor: not-allowed;
  opacity: 0.6;
}

.tabla-section {
  background: white;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: var(--spacing);
}

.tabla-pedidos {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

.th-columna {
  position: relative;
}

.eliminar-columna {
  background: var(--color-danger);
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.5rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: var(--transition);
}

.eliminar-columna:hover {
  background-color: #c0392b;
  transform: scale(1.1);
}

th, td {
  padding: 0.75rem;
  text-align: center;
  border: 1px solid #e1e5e9;
}

th {
  background-color: var(--color-light);
  font-weight: 600;
  color: var(--color-dark);
  font-size: 1rem;
}

.numero-input {
  width: 80px;
  padding: 0.5rem;
  text-align: center;
  border: 2px solid transparent;
  border-radius: var(--border-radius);
  font-size: 1rem;
  font-weight: 600;
  transition: var(--transition);
}

.numero-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

/* Estilos para clientes - Optimizados */
.cliente-8a { background-color: var(--color-primary); color: white; }
.cliente-catarro { background-color: var(--color-danger); color: white; }
.cliente-otilio { background-color: var(--color-warning); color: black; }
.cliente-ozuna { background-color: var(--color-secondary); color: white; }
.cliente-elizabeth { background-color: var(--color-purple); color: white; }

/* Inputs de clientes */
.numero-input.cliente-8a { background-color: #ebf5fb; border-color: var(--color-primary); }
.numero-input.cliente-catarro { background-color: #fdedec; border-color: var(--color-danger); }
.numero-input.cliente-otilio { background-color: #fef9e7; border-color: var(--color-warning); }
.numero-input.cliente-ozuna { background-color: #eafaf1; border-color: var(--color-secondary); }
.numero-input.cliente-elizabeth { background-color: #f5eef8; border-color: var(--color-purple); }

.fila-totales {
  background-color: var(--color-dark);
  color: white;
  font-weight: 600;
}

.fila-totales td {
  border: 2px solid var(--color-dark);
  font-size: 1.1rem;
}

.resumen-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: var(--spacing);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing);
}

.kilos-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing);
}

.info-item {
  text-align: center;
  padding: 1rem;
}

.info-item .label {
  display: block;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  opacity: 0.9;
}

.info-item .value {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
}

.buttons-container {
  display: flex;
  gap: var(--spacing);
  justify-content: center;
  margin-top: calc(var(--spacing) * 2);
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary,
.btn-tertiary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: var(--transition);
  min-width: 120px;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: var(--color-purple);
  color: white;
}

.btn-secondary:hover {
  background-color: #8e44ad;
  transform: translateY(-2px);
}

.btn-tertiary {
  background-color: var(--color-gray);
  color: white;
}

.btn-tertiary:hover {
  background-color: #7f8c8d;
  transform: translateY(-2px);
}

/* Ocultar controles de número en navegadores webkit */
.numero-input::-webkit-outer-spin-button,
.numero-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.numero-input[type=number] {
  -moz-appearance: textfield;
}

/* Responsive Design */
@media (max-width: 768px) {
  .pedidos-crudo-container {
    padding: 0.5rem;
  }
  
  .agregar-columna {
    flex-direction: column;
  }
  
  .input-nueva-columna {
    min-width: auto;
  }
  
  .tabla-pedidos {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  table {
    min-width: 600px;
  }
  
  th, td {
    padding: 0.5rem;
    font-size: 0.9rem;
  }
  
  .numero-input {
    width: 60px;
    padding: 0.4rem;
    font-size: 0.9rem;
  }
  
  .buttons-container {
    flex-direction: column;
  }
  
  .btn-primary,
  .btn-secondary,
  .btn-tertiary {
    width: 100%;
  }
  
  .kilos-info {
    grid-template-columns: 1fr;
  }
  
  .info-item .value {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .page-header h2 {
    font-size: 1.5rem;
  }
  
  .fecha-container {
    flex-direction: column;
    align-items: flex-start;
  }
  
  table {
    min-width: 500px;
  }
  
  th, td {
    padding: 0.4rem;
    font-size: 0.8rem;
  }
  
  .numero-input {
    width: 50px;
    padding: 0.3rem;
    font-size: 0.8rem;
  }
}
</style> 