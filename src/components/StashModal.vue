<template>
  <div>
    <button @click="showModal = true" class="stash-button">
      Stash
    </button>

    <!-- Modal para agregar/ver stash -->
    <div v-if="showModal" class="modal">
      <div class="modal-content">
        <h3>Stash de Abonos</h3>
        
        <!-- Formulario para nuevo stash -->
        <div class="stash-form">
          <input 
            type="date" 
            v-model="newStash.fecha" 
            class="stash-input"
          >
          <input 
            type="text" 
            v-model="newStash.descripcion" 
            placeholder="Descripción"
            class="stash-input"
          >
          <input 
            type="number" 
            v-model.number="newStash.cantidad" 
            placeholder="Cantidad"
            class="stash-input"
          >
          <button @click="agregarStash" class="add-button">
            Agregar
          </button>
        </div>

        <!-- Lista de stash -->
        <div class="stash-list">
          <table v-if="stashItems.length > 0">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in stashItems" :key="index">
                <td>{{ formatearFecha(item.fecha) }}</td>
                <td>{{ item.descripcion }}</td>
                <td>${{ formatNumber(item.cantidad) }}</td>
                <td>
                  <button @click="eliminarStash(index)" class="delete-button">
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>Total:</strong></td>
                <td colspan="2"><strong>${{ formatNumber(totalStash) }}</strong></td>
              </tr>
            </tfoot>
          </table>
          <p v-else class="no-items">No hay items en el stash</p>
        </div>

        <div class="modal-footer">
          <button @click="showModal = false" class="close-button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { collection, addDoc, deleteDoc, doc, getDocs, query } from 'firebase/firestore'
import { db } from '@/firebase'

export default {
  name: 'StashModal',
  props: {
    cliente: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const showModal = ref(false)
    const stashItems = ref([])
    const newStash = ref({
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      cantidad: null
    })

    const totalStash = computed(() => {
      return stashItems.value.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0)
    })

    const cargarStash = async () => {
      try {
        const q = query(collection(db, `stash_${props.cliente}`))
        const querySnapshot = await getDocs(q)
        stashItems.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        console.error('Error al cargar stash:', error)
      }
    }

    const agregarStash = async () => {
      if (!newStash.value.fecha || !newStash.value.descripcion || !newStash.value.cantidad) {
        alert('Por favor complete todos los campos')
        return
      }

      try {
        const [year, month, day] = newStash.value.fecha.split('-').map(Number)
        const fechaAjustada = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        const docRef = await addDoc(collection(db, `stash_${props.cliente}`), {
          fecha: fechaAjustada,
          descripcion: newStash.value.descripcion,
          cantidad: Number(newStash.value.cantidad)
        })

        stashItems.value.push({
          id: docRef.id,
          fecha: fechaAjustada,
          descripcion: newStash.value.descripcion,
          cantidad: Number(newStash.value.cantidad)
        })

        // Limpiar el formulario
        newStash.value = {
          fecha: new Date().toISOString().split('T')[0],
          descripcion: '',
          cantidad: null
        }
      } catch (error) {
        console.error('Error al agregar stash:', error)
        alert('Error al guardar el stash')
      }
    }

    const eliminarStash = async (index) => {
      try {
        const item = stashItems.value[index]
        await deleteDoc(doc(db, `stash_${props.cliente}`, item.id))
        stashItems.value.splice(index, 1)
      } catch (error) {
        console.error('Error al eliminar stash:', error)
        alert('Error al eliminar el stash')
      }
    }

    const formatearFecha = (fecha) => {
      // Crear fecha usando la fecha local sin ajustes de zona horaria
      const [year, month, day] = fecha.split('-')
      const fechaLocal = new Date(year, month - 1, day)
      return fechaLocal.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const formatNumber = (value) => {
      if (value === null || value === undefined) return '0.00'
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    // Cargar stash al montar el componente
    cargarStash()

    return {
      showModal,
      stashItems,
      newStash,
      totalStash,
      agregarStash,
      eliminarStash,
      formatearFecha,
      formatNumber
    }
  }
}
</script>

<style scoped>
.stash-button {
  background-color: #9c27b0;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.stash-button:hover {
  background-color: #7b1fa2;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.stash-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stash-input {
  flex: 1;
  min-width: 120px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.add-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.add-button:hover {
  background-color: #45a049;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.delete-button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.delete-button:hover {
  background-color: #da190b;
}

.close-button {
  background-color: #808080;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.close-button:hover {
  background-color: #666666;
}

.no-items {
  text-align: center;
  color: #666;
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 600px) {
  .stash-form {
    flex-direction: column;
  }

  .stash-input {
    width: 100%;
  }

  .modal-content {
    width: 95%;
    padding: 15px;
  }

  th, td {
    padding: 8px;
    font-size: 14px;
  }
}
</style> 