<template>
  <div class="pedidos-limpio-container">
    <h2>Pedido de Camarón Limpio</h2>
    
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
            <td>{{ cliente }}</td>
            <td v-for="columna in columnas" :key="columna">
              <input 
                type="number" 
                v-model="pedidos[cliente][columna.toLowerCase()]" 
                class="numero-input"
                placeholder="">
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="buttons-container">
      <button @click="guardarPedido" class="btn-guardar">Guardar Pedido</button>
      <button @click="imprimirDirecto" class="btn-imprimir-directo">
        <i class="fas fa-print"></i> Imprimir Directo
      </button>
      <button @click="$router.push('/procesos/pedidos')" class="btn-cancelar">Cancelar</button>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, addDoc, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore'

export default {
  name: 'PedidosLimpio',
  data() {
    return {
      fecha: new Date().toISOString().split('T')[0],
      clientes: ['Joselito', 'Catarro', 'Otilio', 'Ozuna'],
      columnasBase: ['Med', 'Med-Esp', 'Med-gde', 'Gde', 'Extra'],
      columnasAdicionales: [],
      nuevaColumna: '',
      pedidos: {
        Joselito: { med: null, medesp: null, medgde: null, gde: null, extra: null },
        Catarro: { med: null, medesp: null, medgde: null, gde: null, extra: null },
        Otilio: { med: null, medesp: null, medgde: null, gde: null, extra: null },
        Ozuna: { med: null, medesp: null, medgde: null, gde: null, extra: null }
      },
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
    columnas() {
      return [...this.columnasBase, ...this.columnasAdicionales]
    }
  },
  methods: {
    agregarColumna() {
      if (!this.nuevaColumna.trim()) return
      
      const nombreColumna = this.nuevaColumna.trim()
      if (this.columnas.includes(nombreColumna)) {
        alert('Esta columna ya existe')
        return
      }

      this.columnasAdicionales.push(nombreColumna)
      
      // Agregar la nueva propiedad a cada cliente
      const nombreProp = nombreColumna.toLowerCase().replace(/[^a-z0-9]/g, '')
      this.clientes.forEach(cliente => {
        this.$set(this.pedidos[cliente], nombreProp, null)
      })

      this.nuevaColumna = ''
    },
    eliminarColumna(columna) {
      const index = this.columnasAdicionales.indexOf(columna)
      if (index > -1) {
        this.columnasAdicionales.splice(index, 1)
        
        // Eliminar la propiedad de cada cliente
        const nombreProp = columna.toLowerCase().replace(/[^a-z0-9]/g, '')
        this.clientes.forEach(cliente => {
          this.$delete(this.pedidos[cliente], nombreProp)
        })
      }
    },
    async guardarPedido() {
      try {
        const pedidoData = {
          fecha: this.fecha,
          pedidos: this.pedidos,
          columnas: this.columnas,
          tipo: 'limpio',
          createdAt: Timestamp.now()
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
          this.columnasAdicionales = data.columnas.filter(col => !this.columnasBase.includes(col))
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
    imprimirDirecto() {
      // Ocultar los botones durante la impresión
      const botonesContainer = document.querySelector('.buttons-container');
      const agregarColumnaContainer = document.querySelector('.agregar-columna');
      if (botonesContainer) botonesContainer.style.display = 'none';
      if (agregarColumnaContainer) agregarColumnaContainer.style.display = 'none';
      
      // Imprimir
      window.print();
      
      // Restaurar los botones después de imprimir
      if (botonesContainer) botonesContainer.style.display = 'flex';
      if (agregarColumnaContainer) agregarColumnaContainer.style.display = 'flex';
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
.pedidos-limpio-container {
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

.btn-imprimir-directo {
  padding: 10px 20px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-imprimir-directo:hover {
  background-color: #219a52;
}

@media print {
  .pedidos-limpio-container {
    padding: 0;
  }
  
  .buttons-container,
  .agregar-columna {
    display: none !important;
  }
  
  table {
    width: 100%;
    page-break-inside: avoid;
  }
  
  input[type="number"] {
    border: none;
    background: transparent;
  }
}
</style> 