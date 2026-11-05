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
            <label class="color-control">
              Color PDF
              <input type="color" :value="colorBaseMedida(newMedida)" @input="newMedida.colorPdf = $event.target.value" aria-label="Color PDF de la nueva medida">
            </label>
            <button @click="agregarMedida" :disabled="guardandoAlgunColor" class="add-btn">Agregar</button>
          </div>
          <span v-if="newMedida.nombre" class="medida-muestra" :style="{ backgroundColor: fondoMedida(newMedida) }">{{ newMedida.nombre }}</span>
        </div>

        <!-- Lista de medidas -->
        <div class="medidas-list">
          <p class="color-ayuda">Puedes elegir colores similares o repetidos para las medidas. Los colores oscuros se aclaran en la vista previa y el PDF para mantener legible el texto negro. Los cambios se guardan automáticamente.</p>
          <p v-if="estadoColor" class="color-estado" role="status">{{ estadoColor }}</p>
          <div class="medidas-grid">
            <div v-for="medida in medidasOrdenadas" :key="medida.id" class="medida-card">
              <span class="medida-nombre medida-muestra" :style="{ backgroundColor: fondoMedida(medida) }">{{ medida.nombre }}</span>
              <button @click="eliminarMedida(medida.id)" :disabled="guardandoColores[medida.id]" class="delete-btn" title="Eliminar medida" :aria-label="`Eliminar medida ${medida.nombre}`">
                &times;
              </button>
              <label class="color-control color-medida">
                {{ guardandoColores[medida.id] ? 'Guardando…' : 'Color PDF' }}
                <input type="color" :value="colorBaseMedida(medida)" :disabled="guardandoAlgunColor" @change="guardarColorMedida(medida, $event)" :aria-label="`Color PDF de ${medida.nombre}`">
              </label>
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
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore'
import { colorBaseMedida, fondoDeColor } from '@/utils/coloresMedidas'

export default {
  name: 'MedidasModal',
  data() {
    return {
      showModal: false,
      medidas: [],
      guardandoColores: {},
      estadoColor: '',
      newMedida: {
        tipo: 'granja',
        nombre: '',
        colorPdf: ''
      }
    }
  },
  computed: {
    guardandoAlgunColor() {
      return Object.keys(this.guardandoColores).length > 0
    },
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
    colorBaseMedida(medida) {
      if (medida === this.newMedida && medida.colorPdf) return medida.colorPdf
      return colorBaseMedida(medida, this.medidas)
    },
    fondoMedida(medida) {
      return fondoDeColor(this.colorBaseMedida(medida))
    },
    async guardarColorMedida(medida, event) {
      const input = event.target
      const colorPdf = input.value
      if (Object.keys(this.guardandoColores).length || !/^#[0-9a-f]{6}$/i.test(colorPdf)) return
      this.$set(this.guardandoColores, medida.id, true)
      this.estadoColor = ''
      try {
        await updateDoc(doc(db, 'medidas', medida.id), { colorPdf })
        this.$set(medida, 'colorPdf', colorPdf)
        this.estadoColor = `Color de ${medida.nombre} guardado.`
        this.$emit('medidas-actualizadas', this.medidas)
      } catch (error) {
        input.value = this.colorBaseMedida(medida)
        this.estadoColor = `No se pudo guardar el color de ${medida.nombre}. Intenta nuevamente.`
        console.error('Error al guardar color de medida:', error)
      } finally {
        this.$delete(this.guardandoColores, medida.id)
      }
    },
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
      if (Object.keys(this.guardandoColores).length) return
      if (!this.newMedida.nombre) {
        alert('Por favor ingrese el nombre de la medida')
        return
      }

      const colorPdf = this.colorBaseMedida(this.newMedida)
      this.estadoColor = ''

      try {
        const nuevaMedida = {
          tipo: this.newMedida.tipo,
          nombre: this.newMedida.nombre,
          colorPdf
        }
        const docRef = await addDoc(collection(db, 'medidas'), nuevaMedida)

        this.medidas.push({
          id: docRef.id,
          ...nuevaMedida
        })

        this.newMedida.nombre = ''
        this.newMedida.colorPdf = ''
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
  min-width: 0;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
}

.medida-muestra {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  color: #000;
  overflow-wrap: anywhere;
}

.add-medida-form > .medida-muestra { margin-top: 10px; }
.color-ayuda, .color-estado { font-size: 14px; color: #444; line-height: 1.5; }
.color-control { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #444; margin: 0; }
.color-medida { grid-column: 1 / -1; justify-content: space-between; }
.color-control input { width: 44px; height: 34px; padding: 2px; border: 1px solid #bbb; border-radius: 4px; background: white; cursor: pointer; }
.color-control input:disabled { cursor: wait; }

.medida-nombre {
  font-size: 16px;
  color: #000;
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
