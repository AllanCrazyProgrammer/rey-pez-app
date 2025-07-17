<template>
  <div class="deudas-menu">
    <div class="back-button-container">
      <BackButton to="/procesos" />
    </div>
    
    <div class="header-section">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-debt">💰</i>
          Gestión de Deudas a Proveedores
        </h1>
        <p class="subtitle">Administra las deudas pendientes y proveedores de manera eficiente</p>
      </div>
    </div>
    
    <div class="menu-options">
      <router-link 
        to="/procesos/deudas/lista" 
        class="btn-action btn-lista"
        aria-label="Ver lista de deudas"
      >
        <i class="icon">📋</i>
        <span>Lista de Deudas</span>
      </router-link>
      
      <router-link 
        to="/procesos/deudas/nueva" 
        class="btn-action btn-nueva"
        aria-label="Crear nueva deuda"
      >
        <i class="icon">➕</i>
        <span>Nueva Deuda</span>
      </router-link>
      
      <button 
        @click="openProveedoresModal" 
        class="btn-action btn-config"
        aria-label="Configurar proveedores"
      >
        <i class="icon">⚙️</i>
        <span>Configurar Proveedores</span>
      </button>
    </div>
    
        <!-- Modal para configurar proveedores -->
    <div v-if="showModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content modern-modal" @click.stop>
        <div class="modal-header modern-header">
          <div class="header-icon">
            <i class="icon-config">⚙️</i>
          </div>
          <div class="header-text">
            <h2>Gestionar Proveedores</h2>
            <p>Administra los proveedores y asigna colores de identificación</p>
          </div>
          <button @click="showModal = false" class="close-button modern-close">
            <i class="fas fa-times">✕</i>
          </button>
        </div>
        
        <div class="modal-body modern-body">
          <div class="add-proveedor-section">
            <div class="section-header">
              <i class="section-icon">➕</i>
              <h3>Agregar Nuevo Proveedor</h3>
            </div>
            
            <form @submit.prevent="addProveedor" class="modern-form">
              <div class="form-grid">
                <div class="form-group modern-group">
                  <label for="nombre" class="modern-label">
                    <i class="label-icon">👤</i>
                    Nombre del Proveedor
                  </label>
                  <input 
                    v-model="newProveedor.nombre" 
                    id="nombre" 
                    required 
                    placeholder="Ingrese el nombre del proveedor"
                    class="modern-input"
                  >
                </div>
                
                <div class="form-group modern-group">
                  <label for="telefono" class="modern-label">
                    <i class="label-icon">📞</i>
                    Teléfono (opcional)
                  </label>
                  <input 
                    v-model="newProveedor.telefono" 
                    id="telefono" 
                    placeholder="Ingrese el teléfono"
                    class="modern-input"
                  >
                </div>
              </div>
              
              <div class="color-selection">
                <label class="modern-label">
                  <i class="label-icon">🎨</i>
                  Color de Identificación
                </label>
                <div class="color-options">
                  <div 
                    v-for="color in coloresDisponibles" 
                    :key="color.value"
                    class="color-option"
                    :class="{ 'selected': newProveedor.color === color.value }"
                    @click="newProveedor.color = color.value"
                  >
                    <div 
                      class="color-circle" 
                      :style="{ backgroundColor: color.value }"
                    ></div>
                    <span class="color-name">{{ color.name }}</span>
                  </div>
                </div>
                <p class="color-help">Selecciona un color para identificar fácilmente este proveedor en las listas</p>
              </div>
              
              <button type="submit" class="submit-btn modern-submit" :disabled="!newProveedor.nombre || !newProveedor.color">
                <i class="btn-icon">💾</i>
                <span>Agregar Proveedor</span>
              </button>
            </form>
          </div>
          
          <div class="separator"></div>
          
          <div class="proveedores-list-section">
            <div class="section-header">
              <i class="section-icon">📋</i>
              <h3>Proveedores Registrados</h3>
              <span class="count-badge">{{ proveedores.length }}</span>
            </div>
            
            <div v-if="proveedores.length === 0" class="empty-state">
              <i class="empty-icon">📭</i>
              <p>No hay proveedores registrados</p>
              <span>Agrega tu primer proveedor usando el formulario de arriba</span>
            </div>
            
            <div v-else class="proveedores-grid">
              <div 
                v-for="proveedor in sortedProveedores" 
                :key="proveedor.id"
                class="proveedor-card"
              >
                <div class="proveedor-header">
                  <div class="proveedor-color">
                    <div 
                      class="color-indicator" 
                      :style="{ backgroundColor: proveedor.color || '#cccccc' }"
                    ></div>
                  </div>
                  <div class="proveedor-actions">
                    <button 
                      @click="editarProveedor(proveedor)" 
                      class="edit-btn"
                      title="Editar proveedor"
                    >
                      <i class="fas fa-edit">✏️</i>
                    </button>
                    <button 
                      @click="deleteProveedor(proveedor.id)" 
                      class="delete-btn modern-delete"
                      title="Eliminar proveedor"
                    >
                      <i class="fas fa-trash">🗑️</i>
                    </button>
                  </div>
                </div>
                <div class="proveedor-content">
                  <h4 class="proveedor-nombre">{{ proveedor.nombre }}</h4>
                  <p v-if="proveedor.telefono" class="proveedor-telefono">
                    <i class="phone-icon">📞</i>
                    {{ proveedor.telefono }}
                  </p>
                  <span class="proveedor-fecha">
                    Creado: {{ formatearFechaCreacion(proveedor.fechaCreacion) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para editar proveedor -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModalOnOverlay">
      <div class="modal-content modern-modal small-modal" @click.stop>
        <div class="modal-header modern-header">
          <div class="header-icon">
            <i class="icon-edit">✏️</i>
          </div>
          <div class="header-text">
            <h2>Editar Proveedor</h2>
            <p>Modifica la información del proveedor</p>
          </div>
          <button @click="showEditModal = false" class="close-button modern-close">
            <i class="fas fa-times">✕</i>
          </button>
        </div>
        
        <div class="modal-body modern-body">
          <form @submit.prevent="updateProveedor" class="modern-form">
            <div class="form-group modern-group">
              <label for="editNombre" class="modern-label">
                <i class="label-icon">👤</i>
                Nombre del Proveedor
              </label>
              <input 
                v-model="editingProveedor.nombre" 
                id="editNombre" 
                required 
                placeholder="Ingrese el nombre del proveedor"
                class="modern-input"
              >
            </div>
            
            <div class="form-group modern-group">
              <label for="editTelefono" class="modern-label">
                <i class="label-icon">📞</i>
                Teléfono (opcional)
              </label>
              <input 
                v-model="editingProveedor.telefono" 
                id="editTelefono" 
                placeholder="Ingrese el teléfono"
                class="modern-input"
              >
            </div>
            
            <div class="color-selection">
              <label class="modern-label">
                <i class="label-icon">🎨</i>
                Color de Identificación
              </label>
              <div class="color-options">
                <div 
                  v-for="color in coloresDisponibles" 
                  :key="color.value"
                  class="color-option"
                  :class="{ 'selected': editingProveedor.color === color.value }"
                  @click="editingProveedor.color = color.value"
                >
                  <div 
                    class="color-circle" 
                    :style="{ backgroundColor: color.value }"
                  ></div>
                  <span class="color-name">{{ color.name }}</span>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" @click="showEditModal = false" class="cancel-btn">
                <i class="btn-icon">❌</i>
                <span>Cancelar</span>
              </button>
              <button type="submit" class="submit-btn modern-submit" :disabled="!editingProveedor.nombre || !editingProveedor.color">
                <i class="btn-icon">💾</i>
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';

export default {
  name: 'DeudasMenu',
  components: {
    BackButton
  },
  data() {
    return {
      showModal: false,
      showEditModal: false,
      proveedores: [],
      newProveedor: {
        nombre: '',
        telefono: '',
        color: ''
      },
      editingProveedor: {
        id: '',
        nombre: '',
        telefono: '',
        color: ''
      },
      coloresDisponibles: [
        { name: 'Azul', value: '#3498DB' },
        { name: 'Verde', value: '#2ECC71' },
        { name: 'Rojo', value: '#E74C3C' },
        { name: 'Naranja', value: '#F39C12' },
        { name: 'Púrpura', value: '#9B59B6' },
        { name: 'Turquesa', value: '#1ABC9C' },
        { name: 'Rosa', value: '#E91E63' },
        { name: 'Índigo', value: '#673AB7' },
        { name: 'Amarillo', value: '#F1C40F' },
        { name: 'Coral', value: '#FF7675' },
        { name: 'Aguamarina', value: '#00CEC9' },
        { name: 'Lima', value: '#6C5CE7' }
      ]
    };
  },
  computed: {
    sortedProveedores() {
      return [...this.proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  },
  methods: {
    openProveedoresModal() {
      this.showModal = true;
      this.loadProveedores();
    },
    closeModalOnOverlay(event) {
      if (event.target === event.currentTarget) {
        this.showModal = false;
      }
    },
    closeEditModalOnOverlay(event) {
      if (event.target === event.currentTarget) {
        this.showEditModal = false;
      }
    },
    async loadProveedores() {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedoresDeuda'));
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar proveedores: ", error);
      }
    },
    async addProveedor() {
      try {
        if (!this.newProveedor.nombre || !this.newProveedor.color) {
          alert('Por favor, ingrese el nombre del proveedor y seleccione un color.');
          return;
        }
        
        await addDoc(collection(db, 'proveedoresDeuda'), {
          nombre: this.newProveedor.nombre,
          telefono: this.newProveedor.telefono || '',
          color: this.newProveedor.color,
          fechaCreacion: new Date()
        });
        
        this.newProveedor = { nombre: '', telefono: '', color: '' };
        this.loadProveedores();
        
        // Mostrar mensaje de éxito
        alert('Proveedor agregado exitosamente');
      } catch (error) {
        console.error("Error al añadir proveedor: ", error);
        alert('Error al agregar proveedor: ' + error.message);
      }
    },
    editarProveedor(proveedor) {
      this.editingProveedor = {
        id: proveedor.id,
        nombre: proveedor.nombre,
        telefono: proveedor.telefono || '',
        color: proveedor.color || '#3498DB'
      };
      this.showEditModal = true;
    },
    async updateProveedor() {
      try {
        if (!this.editingProveedor.nombre || !this.editingProveedor.color) {
          alert('Por favor, ingrese el nombre del proveedor y seleccione un color.');
          return;
        }
        
        await updateDoc(doc(db, 'proveedoresDeuda', this.editingProveedor.id), {
          nombre: this.editingProveedor.nombre,
          telefono: this.editingProveedor.telefono || '',
          color: this.editingProveedor.color,
          fechaModificacion: new Date()
        });
        
        this.showEditModal = false;
        this.loadProveedores();
        
        // Mostrar mensaje de éxito
        alert('Proveedor actualizado exitosamente');
      } catch (error) {
        console.error("Error al actualizar proveedor: ", error);
        alert('Error al actualizar proveedor: ' + error.message);
      }
    },
    async deleteProveedor(proveedorId) {
      if (confirm('¿Estás seguro de que quieres eliminar este proveedor? Esta acción no se puede deshacer.')) {
        try {
          await deleteDoc(doc(db, 'proveedoresDeuda', proveedorId));
          this.loadProveedores();
          alert('Proveedor eliminado exitosamente');
        } catch (error) {
          console.error("Error al eliminar proveedor: ", error);
          alert('Error al eliminar proveedor: ' + error.message);
        }
      }
    },
    formatearFechaCreacion(fecha) {
      if (!fecha) return 'Fecha no disponible';
      
      try {
        // Manejar diferentes tipos de fecha (Timestamp de Firebase o Date)
        let fechaObj;
        if (fecha.toDate) {
          fechaObj = fecha.toDate();
        } else if (fecha instanceof Date) {
          fechaObj = fecha;
        } else {
          fechaObj = new Date(fecha);
        }
        
        const opciones = { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        };
        return fechaObj.toLocaleDateString('es-ES', opciones);
      } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Fecha inválida';
      }
    }
  },
  mounted() {
    this.loadProveedores();
  }
};
</script>

<style scoped>
.deudas-menu {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  color: white;
  position: relative;
}

.back-button-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}

/* Header moderno */
.header-section {
  text-align: center;
  margin-bottom: 40px;
  margin-top: 60px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
  width: 100%;
}

.main-title {
  font-size: 2.8rem;
  font-weight: 700;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.icon-debt {
  font-size: 3rem;
}

.subtitle {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 300;
}

/* Opciones del menú */
.menu-options {
  display: flex;
  flex-wrap: wrap;
  gap: 25px;
  margin-bottom: 40px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  justify-content: center;
}

/* Botones modernos */
.btn-action {
  padding: 20px 30px;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
  width: 280px;
  height: 70px;
  justify-content: flex-start;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  text-decoration: none;
  color: white;
  margin: 10px;
}

.btn-action:hover {
  transform: translateY(-3px);
  text-decoration: none;
  color: white;
}

.btn-action:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

/* Estilos específicos para cada botón */
.btn-lista {
  background: linear-gradient(45deg, #3498DB, #2980B9);
}

.btn-lista:hover {
  box-shadow: 0 12px 35px rgba(52, 152, 219, 0.4);
  background: linear-gradient(45deg, #2980B9, #1976D2);
}

.btn-nueva {
  background: linear-gradient(45deg, #4CAF50, #45a049);
}

.btn-nueva:hover {
  box-shadow: 0 12px 35px rgba(76, 175, 80, 0.4);
  background: linear-gradient(45deg, #45a049, #3d8b40);
}

.btn-config {
  background: linear-gradient(45deg, #FF9800, #F57C00);
}

.btn-config:hover {
  box-shadow: 0 12px 35px rgba(255, 152, 0, 0.4);
  background: linear-gradient(45deg, #F57C00, #E65100);
}

.icon {
  font-size: 1.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .deudas-menu {
    padding: 20px;
  }

  .header-section {
    padding: 20px;
    margin-bottom: 30px;
    margin-top: 80px;
  }

  .main-title {
    font-size: 2.2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .menu-options {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .btn-action {
    width: 100%;
    max-width: 350px;
    justify-content: center;
    margin: 5px 0;
  }

  .back-button-container {
    top: 15px;
    left: 15px;
  }
}

@media (max-width: 480px) {
  .deudas-menu {
    padding: 15px;
  }

  .header-section {
    padding: 15px;
    margin-top: 70px;
  }

  .main-title {
    font-size: 1.8rem;
    flex-direction: column;
    gap: 10px;
  }

  .icon-debt {
    font-size: 2.5rem;
  }

  .btn-action {
    padding: 15px 20px;
    font-size: 1rem;
    height: auto;
  }

  .back-button-container {
    top: 10px;
    left: 10px;
  }
}

/* Modal styles modernos */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content.modern-modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 25px;
  width: 95%;
  max-width: 800px;
  max-height: 95vh;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation: slideIn 0.4s ease-out;
}

.modal-content.small-modal {
  max-width: 600px;
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header.modern-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 25px 30px;
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: none;
}

.header-icon {
  font-size: 2.5rem;
  opacity: 0.9;
}

.header-text h2 {
  margin: 0 0 5px 0;
  font-size: 1.8rem;
  font-weight: 700;
}

.header-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 1rem;
  font-weight: 300;
}

.close-button.modern-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  margin-left: auto;
}

.close-button.modern-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.modal-body.modern-body {
  padding: 30px;
  max-height: calc(95vh - 120px);
  overflow-y: auto;
}

/* Secciones del modal */
.add-proveedor-section, .proveedores-list-section {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.section-icon {
  font-size: 1.8rem;
  color: #667eea;
}

.section-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #2c3e50;
  flex: 1;
}

.count-badge {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.separator {
  height: 2px;
  background: linear-gradient(90deg, transparent, #667eea, transparent);
  margin: 40px 0;
  border-radius: 2px;
}

/* Formulario moderno */
.modern-form {
  background: rgba(255, 255, 255, 0.7);
  padding: 25px;
  border-radius: 20px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 25px;
}

.form-group.modern-group {
  margin-bottom: 0;
}

.modern-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 600;
  font-size: 0.95rem;
}

.label-icon {
  font-size: 1.1rem;
}

.modern-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
  box-sizing: border-box;
}

.modern-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  background: white;
}

/* Selector de colores */
.color-selection {
  margin-bottom: 25px;
}

.color-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 10px;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.5);
}

.color-option:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
}

.color-option.selected {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.color-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.color-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: #2c3e50;
}

.color-help {
  margin: 0;
  font-size: 0.85rem;
  color: #7f8c8d;
  font-style: italic;
}

/* Botones modernos */
.submit-btn.modern-submit {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 15px 25px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  width: 100%;
  justify-content: center;
}

.submit-btn.modern-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.submit-btn.modern-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 1.1rem;
}

/* Estados vacíos */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 15px;
  display: block;
}

.empty-state p {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.empty-state span {
  font-size: 0.9rem;
  opacity: 0.8;
}

/* Grid de proveedores */
.proveedores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.proveedor-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 15px;
  padding: 20px;
  border: 2px solid rgba(102, 126, 234, 0.1);
  transition: all 0.3s ease;
}

.proveedor-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

.proveedor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.proveedor-color {
  display: flex;
  align-items: center;
}

.color-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.proveedor-actions {
  display: flex;
  gap: 8px;
}

.edit-btn, .delete-btn.modern-delete {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.edit-btn {
  background: linear-gradient(45deg, #3498DB, #2980B9);
  color: white;
}

.edit-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.delete-btn.modern-delete {
  background: linear-gradient(45deg, #E74C3C, #C0392B);
  color: white;
}

.delete-btn.modern-delete:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

.proveedor-content h4 {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
}

.proveedor-telefono {
  margin: 5px 0;
  color: #7f8c8d;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

.proveedor-fecha {
  font-size: 0.8rem;
  color: #95a5a6;
  font-style: italic;
}

/* Acciones del formulario de edición */
.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.cancel-btn {
  background: linear-gradient(45deg, #95a5a6, #7f8c8d);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  flex: 1;
  justify-content: center;
}

.cancel-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(149, 165, 166, 0.4);
}

.form-actions .submit-btn.modern-submit {
  flex: 1;
}

/* Responsive adjustments for modal */
@media (max-width: 768px) {
  .modal-content.modern-modal {
    width: 98%;
    margin: 10px;
    max-height: 98vh;
  }
  
  .modal-header.modern-header {
    padding: 20px;
    flex-wrap: wrap;
  }
  
  .header-icon {
    font-size: 2rem;
  }
  
  .header-text h2 {
    font-size: 1.5rem;
  }
  
  .header-text p {
    font-size: 0.9rem;
  }
  
  .modal-body.modern-body {
    padding: 20px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .color-options {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
  }
  
  .color-option {
    padding: 8px 10px;
  }
  
  .color-name {
    font-size: 0.8rem;
  }
  
  .proveedores-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .proveedor-card {
    padding: 15px;
  }
  
  .section-header {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .section-icon {
    font-size: 1.5rem;
  }
  
  .section-header h3 {
    font-size: 1.2rem;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .modern-input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}

@media (max-width: 480px) {
  .modal-content.modern-modal {
    width: 100%;
    height: 100vh;
    border-radius: 0;
    max-height: 100vh;
  }
  
  .modal-header.modern-header {
    padding: 15px;
  }
  
  .header-icon {
    font-size: 1.8rem;
  }
  
  .header-text h2 {
    font-size: 1.3rem;
  }
  
  .modal-body.modern-body {
    padding: 15px;
  }
  
  .modern-form {
    padding: 20px;
  }
  
  .color-options {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .proveedor-card {
    padding: 12px;
  }
  
  .proveedor-content h4 {
    font-size: 1.1rem;
  }
  
  .separator {
    margin: 30px 0;
  }
}
</style> 