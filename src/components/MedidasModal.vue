<template>
  <div>
    <!-- Botón para abrir el modal -->
    <button @click="showModal = true" class="medidas-btn">
      <i class="fas fa-ruler"></i> Medidas
    </button>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Gestión de Medidas</h2>
          <button @click="cerrarModal" class="close-btn">&times;</button>
        </div>

        <!-- Formulario para agregar nueva medida -->
        <div class="add-medida-form">
          <h3>Agregar Nueva Medida</h3>
          <div class="form-group">
       
            <input 
              v-model="newMedida.nombre" 
              type="text" 
              placeholder="Nombre de la medida" 
              class="medida-input"
            >
            <button @click="agregarMedida" class="add-btn">Agregar</button>
          </div>
        </div>

        <!-- Lista de medidas -->
        <div class="medidas-list">
          <div class="medidas-grid">
            <div v-for="medida in medidasOrdenadas" :key="medida.id" class="medida-card">
              <span class="medida-nombre">{{ medida.nombre }}</span>
              <button @click="eliminarMedida(medida.id)" class="delete-btn" title="Eliminar medida">
                &times;
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="cerrarModal" class="cancel-btn">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore'

export default {
  name: 'MedidasModal',
  data() {
    return {
      showModal: false,
      medidas: [],
      newMedida: {
        tipo: 'granja',
        nombre: ''
      }
    }
  },
  computed: {
    medidasOrdenadas() {
      // Separar medidas especiales y de granja
      const medidasEspeciales = this.medidas.filter(m => m.tipo === 'especial')
      const medidasGranja = this.medidas.filter(m => m.tipo === 'granja')

      // Ordenar medidas especiales alfabéticamente
      medidasEspeciales.sort((a, b) => a.nombre.localeCompare(b.nombre))

      // Ordenar medidas de granja por número
      medidasGranja.sort((a, b) => {
        const numA = parseInt(a.nombre.split('/')[0])
        const numB = parseInt(b.nombre.split('/')[0])
        return numA - numB
      })

      // Combinar ambas listas con especiales primero
      return [...medidasEspeciales, ...medidasGranja]
    }
  },
  methods: {
    async cargarMedidas() {
      try {
        const medidasRef = collection(db, 'medidas')
        const q = query(medidasRef, orderBy('nombre'))
        const querySnapshot = await getDocs(q)
        this.medidas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        console.error('Error al cargar medidas:', error)
        alert('Error al cargar las medidas')
      }
    },
    async agregarMedida() {
      if (!this.newMedida.nombre) {
        alert('Por favor ingrese el nombre de la medida')
        return
      }

      try {
        const docRef = await addDoc(collection(db, 'medidas'), {
          tipo: this.newMedida.tipo,
          nombre: this.newMedida.nombre
        })

        this.medidas.push({
          id: docRef.id,
          tipo: this.newMedida.tipo,
          nombre: this.newMedida.nombre
        })

        this.newMedida.nombre = ''
      } catch (error) {
        console.error('Error al agregar medida:', error)
        alert('Error al guardar la medida')
      }
    },
    async eliminarMedida(id) {
      if (confirm('¿Estás seguro de que deseas eliminar esta medida?')) {
        try {
          await deleteDoc(doc(db, 'medidas', id))
          this.medidas = this.medidas.filter(m => m.id !== id)
        } catch (error) {
          console.error('Error al eliminar medida:', error)
          alert('Error al eliminar la medida')
        }
      }
    },
    cerrarModal() {
      this.showModal = false
      this.$emit('medidas-actualizadas', this.medidas)
    }
  },
  mounted() {
    this.cargarMedidas()
  }
}
</script>

<style scoped>
.medidas-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.medidas-btn:hover {
  background-color: #2980b9;
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

.add-medida-form {
  margin-bottom: 30px;
}

.form-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.medida-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
}

.add-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.medidas-list {
  margin-bottom: 30px;
}

.medidas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.medida-card {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.medida-nombre {
  font-size: 16px;
  color: #333;
}

.delete-btn {
  background: none;
  border: none;
  color: #e74c3c;
  font-size: 20px;
  cursor: pointer;
  padding: 0 5px;
}

.delete-btn:hover {
  color: #c0392b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}

.cancel-btn {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .form-group {
    flex-direction: column;
  }

  .medidas-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  .modal-content {
    width: 95%;
    padding: 15px;
  }
}
</style> 