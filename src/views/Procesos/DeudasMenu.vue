<template>
  <div class="deudas-menu-container">
    <div class="back-button-container">
      <BackButton to="/procesos" />
    </div>
    <h1 class="menu-title">Gestión de Deudas a Proveedores</h1>
    
    <div class="actions-container">
      <router-link to="/procesos/deudas/lista" class="action-button">
        <span class="button-text">Lista de Deudas</span>
        <i class="fas fa-arrow-right"></i>
      </router-link>
      
      <router-link to="/procesos/deudas/nueva" class="action-button">
        <span class="button-text">Nueva Deuda</span>
        <i class="fas fa-arrow-right"></i>
      </router-link>
      
      <button @click="openProveedoresModal" class="action-button config-button">
        <span class="button-text">Configurar Proveedores</span>
        <i class="fas fa-cog"></i>
      </button>
    </div>
    
    <!-- Modal para configurar proveedores -->
    <div v-if="showModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Gestionar Proveedores</h2>
          <button @click="showModal = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="add-proveedor-form">
            <form @submit.prevent="addProveedor">
              <div class="form-group">
                <label for="nombre">Nombre del Proveedor:</label>
                <input v-model="newProveedor.nombre" id="nombre" required placeholder="Ingrese el nombre">
              </div>
              <div class="form-group">
                <label for="telefono">Teléfono (opcional):</label>
                <input v-model="newProveedor.telefono" id="telefono" placeholder="Ingrese el teléfono">
              </div>
              <button type="submit" class="submit-btn">Agregar Proveedor</button>
            </form>
          </div>
          
          <div class="proveedores-list">
            <h3>Proveedores Registrados</h3>
            <ul>
              <li v-for="proveedor in sortedProveedores" :key="proveedor.id">
                <div class="proveedor-info">
                  <span>{{ proveedor.nombre }}</span>
                  <span v-if="proveedor.telefono" class="telefono">Tel: {{ proveedor.telefono }}</span>
                </div>
                <button @click="deleteProveedor(proveedor.id)" class="delete-btn">Eliminar</button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';

export default {
  name: 'DeudasMenu',
  components: {
    BackButton
  },
  data() {
    return {
      showModal: false,
      proveedores: [],
      newProveedor: {
        nombre: '',
        telefono: ''
      }
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
        await addDoc(collection(db, 'proveedoresDeuda'), {
          nombre: this.newProveedor.nombre,
          telefono: this.newProveedor.telefono || '',
          fechaCreacion: new Date()
        });
        this.newProveedor = { nombre: '', telefono: '' };
        this.loadProveedores();
      } catch (error) {
        console.error("Error al añadir proveedor: ", error);
      }
    },
    async deleteProveedor(proveedorId) {
      if (confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
        try {
          await deleteDoc(doc(db, 'proveedoresDeuda', proveedorId));
          this.loadProveedores();
        } catch (error) {
          console.error("Error al eliminar proveedor: ", error);
        }
      }
    }
  },
  mounted() {
    this.loadProveedores();
  }
};
</script>

<style scoped>
.deudas-menu-container {
  max-width: 1000px;
  width: 95%;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.menu-title {
  color: #2c3e50;
  font-size: 2.5em;
  margin-bottom: 40px;
  text-align: center;
  font-weight: 600;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
}

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 30px;
  width: 100%;
  max-width: 500px;
}

.action-button {
  background: linear-gradient(135deg, #2980b9, #3498db);
  color: white;
  padding: 20px 35px;
  text-decoration: none;
  border-radius: 8px;
  text-align: center;
  font-size: 1.2em;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: none;
  width: 100%;
  cursor: pointer;
}

.action-button:hover {
  background: linear-gradient(135deg, #3498db, #2980b9);
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.2);
  color: white;
}

.config-button {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
}

.config-button:hover {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
}

.button-text {
  font-weight: 500;
}

/* Modal styles */
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
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #7f8c8d;
}

.modal-body {
  padding: 20px;
}

/* Form styles */
.add-proveedor-form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #34495e;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1em;
}

.submit-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
}

.submit-btn:hover {
  background-color: #2980b9;
}

/* Proveedores list styles */
.proveedores-list h3 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.proveedores-list ul {
  list-style: none;
  padding: 0;
}

.proveedores-list li {
  background-color: #f8f9fa;
  border-radius: 5px;
  margin-bottom: 10px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.proveedor-info {
  display: flex;
  flex-direction: column;
}

.telefono {
  font-size: 0.9em;
  color: #7f8c8d;
}

.delete-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.delete-btn:hover {
  background-color: #c0392b;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .menu-title {
    font-size: 2em;
  }
  
  .action-button {
    padding: 15px 25px;
    font-size: 1em;
  }
  
  .modal-content {
    width: 95%;
  }
}
</style> 