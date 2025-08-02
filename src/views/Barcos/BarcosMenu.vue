<template>
  <div class="barcos-menu">
    <div class="back-button-container">
      <BackButton to="/" />
    </div>
    
    <div class="header-section">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-boat">⛵</i>
          Gestión de Barcos
        </h1>
        <p class="subtitle">Administra las deudas y gastos de El Galileo y María Guadalupe</p>
      </div>
    </div>

    <!-- Selector de barco -->
    <div class="barco-selector-card">
      <h3 class="section-title">
        <i class="icon-anchor">⚓</i>
        Seleccionar Barco
      </h3>
      <div class="barcos-buttons">
        <button 
          :class="['barco-btn', 'barco-galileo', { active: barcoSeleccionado === 'galileo' }]"
          @click="seleccionarBarco('galileo')"
        >
          <i class="barco-icon">🚢</i>
          <span>El Galileo</span>
        </button>
        <button 
          :class="['barco-btn', 'barco-maria-guadalupe', { active: barcoSeleccionado === 'maria-guadalupe' }]"
          @click="seleccionarBarco('maria-guadalupe')"
        >
          <i class="barco-icon">🛥️</i>
          <span>María Guadalupe</span>
        </button>
      </div>
    </div>
    
    <div class="menu-options" v-if="barcoSeleccionado">
      <router-link 
        :to="`/barcos/deudas/lista?barco=${barcoSeleccionado}`" 
        :class="['btn-action', 'btn-lista', `barco-theme-${barcoSeleccionado}`]"
        aria-label="Ver lista de deudas del barco"
      >
        <i class="icon">📋</i>
        <span>Lista de Deudas</span>
      </router-link>
      
      <router-link 
        :to="`/barcos/deudas/nueva?barco=${barcoSeleccionado}`" 
        :class="['btn-action', 'btn-nueva', `barco-theme-${barcoSeleccionado}`]"
        aria-label="Crear nueva deuda para el barco"
      >
        <i class="icon">➕</i>
        <span>Nueva Deuda</span>
      </router-link>
      
      <router-link 
        to="/barcos/resumen-mensual" 
        :class="['btn-action', 'btn-reporte', `barco-theme-${barcoSeleccionado}`]"
        aria-label="Ver reporte mensual de barcos"
      >
        <i class="icon">📊</i>
        <span>Reporte Mensual</span>
      </router-link>
      
      <router-link 
        :to="`/barcos/tripulantes?barco=${barcoSeleccionado}`" 
        :class="['btn-action', 'btn-tripulantes', `barco-theme-${barcoSeleccionado}`]"
        aria-label="Gestionar tripulantes del barco"
      >
        <i class="icon">👥</i>
        <span>Gestión de Tripulantes</span>
      </router-link>
      
      <button 
        @click="openProveedoresModal" 
        :class="['btn-action', 'btn-config', `barco-theme-${barcoSeleccionado}`]"
        aria-label="Configurar proveedores de barcos"
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
            <h2>Gestionar Proveedores de Barcos</h2>
            <p>Administra los proveedores para los barcos</p>
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

                <div class="form-group modern-group">
                  <label for="tipo" class="modern-label">
                    <i class="label-icon">🏷️</i>
                    Tipo de Servicio
                  </label>
                  <input 
                    v-model="newProveedor.tipo" 
                    id="tipo" 
                    placeholder="Ej: Combustible, Refacciones, etc."
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
                  <button 
                    v-for="color in availableColors" 
                    :key="color"
                    type="button"
                    @click="newProveedor.color = color"
                    :class="['color-option', { selected: newProveedor.color === color }]"
                    :style="{ backgroundColor: color }"
                  >
                    <span v-if="newProveedor.color === color" class="checkmark">✓</span>
                  </button>
                </div>
              </div>
              
              <button type="submit" class="submit-button modern-submit">
                <i class="btn-icon">➕</i>
                Agregar Proveedor
              </button>
            </form>
          </div>
          
          <div class="proveedores-list">
            <div class="section-header">
              <i class="section-icon">📋</i>
              <h3>Proveedores Registrados</h3>
            </div>
            
            <div class="proveedores-grid">
              <div 
                v-for="proveedor in proveedores" 
                :key="proveedor.id" 
                class="proveedor-card modern-card"
              >
                <div class="proveedor-header">
                  <div 
                    class="color-indicator" 
                    :style="{ backgroundColor: proveedor.color || '#6c757d' }"
                  ></div>
                  <div class="proveedor-info">
                    <h4>{{ proveedor.nombre }}</h4>
                    <p v-if="proveedor.telefono" class="telefono">
                      <i class="info-icon">📞</i>
                      {{ proveedor.telefono }}
                    </p>
                    <p v-if="proveedor.tipo" class="tipo">
                      <i class="info-icon">🏷️</i>
                      {{ proveedor.tipo }}
                    </p>
                  </div>
                </div>
                <button 
                  @click="deleteProveedor(proveedor.id)" 
                  class="delete-button modern-delete"
                  :title="`Eliminar ${proveedor.nombre}`"
                >
                  <i class="delete-icon">🗑️</i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Botón flotante para reportes -->
    <BotonReporteMensual />
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import BotonReporteMensual from '@/components/Barcos/BotonReporteMensual.vue';

export default {
  name: 'BarcosMenu',
  components: {
    BackButton,
    BotonReporteMensual
  },
  data() {
    return {
      barcoSeleccionado: localStorage.getItem('barcoSeleccionado') || '',
      showModal: false,
      proveedores: [],
      newProveedor: {
        nombre: '',
        telefono: '',
        tipo: '',
        color: '#6c757d'
      },
      availableColors: [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        '#FF9FF3', '#54A0FF', '#48DBFB', '#F368E0', '#FD79A8',
        '#A29BFE', '#6C5CE7', '#00B894', '#FDCB6E', '#E17055',
        '#FA8072', '#DDA0DD', '#98D8C8', '#F7DC6F', '#85C1E2'
      ]
    };
  },
  computed: {
    // Colores dinámicos según el barco seleccionado
    colorPrimario() {
      return this.barcoSeleccionado === 'maria-guadalupe' 
        ? '#27ae60'  // Verde para María Guadalupe
        : '#3498db';  // Azul para Galileo
    },
    colorSecundario() {
      return this.barcoSeleccionado === 'maria-guadalupe' 
        ? '#2ecc71'  // Verde claro para María Guadalupe
        : '#2980b9';  // Azul oscuro para Galileo
    },
    colorHover() {
      return this.barcoSeleccionado === 'maria-guadalupe' 
        ? 'rgba(39, 174, 96, 0.2)'  // Verde con transparencia
        : 'rgba(52, 152, 219, 0.2)';  // Azul con transparencia
    },
    gradientePrimario() {
      return this.barcoSeleccionado === 'maria-guadalupe' 
        ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'
        : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
    }
  },
  mounted() {
    this.loadProveedores();
  },
  methods: {
    seleccionarBarco(barco) {
      this.barcoSeleccionado = barco;
      localStorage.setItem('barcoSeleccionado', barco);
    },
    openProveedoresModal() {
      this.showModal = true;
      this.loadProveedores();
    },
    closeModalOnOverlay(event) {
      if (event.target.classList.contains('modal-overlay')) {
        this.showModal = false;
      }
    },
    async loadProveedores() {
      try {
        const q = query(collection(db, 'proveedoresBarcos'), orderBy('nombre'));
        const querySnapshot = await getDocs(q);
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
        alert('Error al cargar proveedores');
      }
    },
    async addProveedor() {
      if (!this.newProveedor.nombre.trim()) {
        alert('Por favor ingrese el nombre del proveedor');
        return;
      }

      try {
        await addDoc(collection(db, 'proveedoresBarcos'), {
          nombre: this.newProveedor.nombre.trim(),
          telefono: this.newProveedor.telefono.trim(),
          tipo: this.newProveedor.tipo.trim(),
          color: this.newProveedor.color,
          createdAt: new Date()
        });

        // Limpiar formulario
        this.newProveedor = {
          nombre: '',
          telefono: '',
          tipo: '',
          color: '#6c757d'
        };

        // Recargar lista
        await this.loadProveedores();
        alert('Proveedor agregado exitosamente');
      } catch (error) {
        console.error('Error al agregar proveedor:', error);
        alert('Error al agregar proveedor');
      }
    },
    async deleteProveedor(id) {
      if (confirm('¿Está seguro de eliminar este proveedor?')) {
        try {
          await deleteDoc(doc(db, 'proveedoresBarcos', id));
          await this.loadProveedores();
          alert('Proveedor eliminado exitosamente');
        } catch (error) {
          console.error('Error al eliminar proveedor:', error);
          alert('Error al eliminar proveedor');
        }
      }
    }
  }
};
</script>

<style scoped>
.barcos-menu {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.back-button-container {
  margin-bottom: 30px;
}

/* Header Section */
.header-section {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(52, 152, 219, 0.3);
  transition: all 0.3s ease;
}

.header-content {
  text-align: center;
  color: white;
}

.main-title {
  font-size: 2.5em;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.icon-boat {
  font-size: 1.2em;
}

.subtitle {
  font-size: 1.2em;
  opacity: 0.9;
  margin: 0;
}

/* Barco Selector */
.barco-selector-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.3em;
  margin-bottom: 20px;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.barcos-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.barco-btn {
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 15px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-size: 1.1em;
  color: #34495e;
}

.barco-btn:hover {
  border-color: #3498db;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
}

/* Estilos específicos para Galileo */
.barco-galileo:hover {
  border-color: #3498db !important;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2) !important;
}

.barco-galileo.active {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%) !important;
  color: white;
  border-color: #3498db !important;
}

/* Estilos específicos para María Guadalupe */
.barco-maria-guadalupe:hover {
  border-color: #27ae60 !important;
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.2) !important;
}

.barco-maria-guadalupe.active {
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%) !important;
  color: white;
  border-color: #27ae60 !important;
}

.barco-btn.active {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  border-color: #3498db;
}

.barco-icon {
  font-size: 2em;
}

/* Menu Options */
.menu-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.btn-action {
  padding: 25px;
  border-radius: 15px;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 1.1em;
}

.btn-lista {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
}

.btn-nueva {
  background: linear-gradient(135deg, #e17055 0%, #fab1a0 100%);
}

.btn-reporte {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn-config {
  background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
}

.btn-tripulantes {
  background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%);
}

.btn-action:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.btn-action .icon {
  font-size: 2.5em;
}

/* Temas de colores para los botones según el barco */
.barco-theme-galileo.btn-lista {
  background: linear-gradient(135deg, #3498db 0%, #5dade2 100%) !important;
}

.barco-theme-galileo.btn-nueva {
  background: linear-gradient(135deg, #2980b9 0%, #3498db 100%) !important;
}

.barco-theme-galileo.btn-reporte {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%) !important;
}

.barco-theme-galileo.btn-config {
  background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%) !important;
}

.barco-theme-galileo.btn-tripulantes {
  background: linear-gradient(135deg, #5dade2 0%, #85c1e9 100%) !important;
}

.barco-theme-maria-guadalupe.btn-lista {
  background: linear-gradient(135deg, #27ae60 0%, #58d68d 100%) !important;
}

.barco-theme-maria-guadalupe.btn-nueva {
  background: linear-gradient(135deg, #229954 0%, #27ae60 100%) !important;
}

.barco-theme-maria-guadalupe.btn-reporte {
  background: linear-gradient(135deg, #1e8449 0%, #239b56 100%) !important;
}

.barco-theme-maria-guadalupe.btn-config {
  background: linear-gradient(135deg, #148f77 0%, #17a2b8 100%) !important;
}

.barco-theme-maria-guadalupe.btn-tripulantes {
  background: linear-gradient(135deg, #58d68d 0%, #85c1e9 100%) !important;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modern-modal {
  background: white;
  border-radius: 20px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modern-header {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
}

.header-icon {
  font-size: 2.5em;
}

.header-text h2 {
  margin: 0;
  font-size: 1.8em;
}

.header-text p {
  margin: 5px 0 0 0;
  opacity: 0.9;
}

.modern-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5em;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modern-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.modern-body {
  padding: 30px;
  overflow-y: auto;
  max-height: calc(90vh - 120px);
}

/* Form Styles */
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.section-icon {
  font-size: 1.5em;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
}

.modern-form {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 15px;
  margin-bottom: 30px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.modern-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modern-label {
  font-weight: 600;
  color: #34495e;
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-icon {
  font-size: 1.2em;
}

.modern-input {
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1em;
  transition: all 0.3s ease;
}

.modern-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

/* Color Selection */
.color-selection {
  margin-bottom: 20px;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: #2c3e50;
  transform: scale(1.1);
}

.checkmark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Submit Button */
.modern-submit {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 10px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
}

.modern-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);
}

/* Proveedores List */
.proveedores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.modern-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 15px;
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
}

.modern-card:hover {
  border-color: #3498db;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.1);
}

.proveedor-header {
  display: flex;
  gap: 15px;
}

.color-indicator {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  flex-shrink: 0;
}

.proveedor-info h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1.2em;
}

.proveedor-info p {
  margin: 5px 0;
  color: #7f8c8d;
  display: flex;
  align-items: center;
  gap: 5px;
}

.info-icon {
  font-size: 0.9em;
}

.modern-delete {
  position: absolute;
  top: 15px;
  right: 15px;
  background: #ff6b6b;
  color: white;
  border: none;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modern-delete:hover {
  background: #ee5a24;
  transform: scale(1.1);
}

/* Responsive */
@media (max-width: 768px) {
  .header-section {
    padding: 25px;
  }
  
  .main-title {
    font-size: 2em;
  }
  
  .barcos-buttons {
    grid-template-columns: 1fr;
  }
  
  .menu-options {
    grid-template-columns: 1fr;
  }
  
  .modern-modal {
    margin: 10px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style> 