<template>
  <div class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Agregar Nuevo Cliente</h3>
        <button class="btn-cerrar" @click="$emit('cerrar')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="guardarCliente">
          <div class="form-group">
            <label for="nombre">Nombre del Cliente:</label>
            <input
              type="text"
              id="nombre"
              v-model="clienteData.nombre"
              class="form-control"
              required
              placeholder="Ingrese el nombre del cliente"
              :maxlength="100"
            >
          </div>
          
          <div class="form-group">
            <label for="tipo">Tipo de Cliente:</label>
            <select
              id="tipo"
              v-model="clienteData.tipo"
              class="form-control"
              required
            >
              <option value="normal">Normal</option>
              <option value="catarro">Catarro</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="telefono">Teléfono:</label>
            <input
              type="tel"
              id="telefono"
              v-model="clienteData.telefono"
              class="form-control"
              placeholder="Ingrese el teléfono del cliente"
              pattern="[0-9]*"
              maxlength="15"
            >
          </div>
          
          <div class="form-group">
            <label for="direccion">Dirección:</label>
            <textarea
              id="direccion"
              v-model="clienteData.direccion"
              class="form-control"
              placeholder="Ingrese la dirección del cliente"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="notas">Notas Adicionales:</label>
            <textarea
              id="notas"
              v-model="clienteData.notas"
              class="form-control"
              placeholder="Ingrese notas adicionales sobre el cliente"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group color-selector">
            <label>Color del Cliente:</label>
            <div class="color-preview" :style="{ backgroundColor: clienteData.color }">
              <input
                type="color"
                v-model="clienteData.color"
                class="color-input"
              >
            </div>
            <button 
              type="button" 
              class="btn btn-outline-secondary btn-sm"
              @click="generarColorAleatorio"
            >
              Generar Color
            </button>
          </div>
        </form>
      </div>
      
      <div class="modal-footer">
        <button 
          type="button" 
          class="btn btn-secondary" 
          @click="$emit('cerrar')"
        >
          Cancelar
        </button>
        <button 
          type="button" 
          class="btn btn-primary" 
          @click="guardarCliente"
          :disabled="!clienteData.nombre"
        >
          Guardar Cliente
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalNuevoCliente',
  data() {
    return {
      clienteData: {
        nombre: '',
        tipo: 'normal',
        telefono: '',
        direccion: '',
        notas: '',
        color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
      }
    };
  },
  mounted() {
    // Asegurarse de que el color sea válido
    if (!this.clienteData.color || this.clienteData.color.length < 7) {
      this.generarColorAleatorio();
    }
  },
  methods: {
    generarColorAleatorio() {
      const letras = '0123456789ABCDEF';
      let color = '#';
      for (let i = 0; i < 6; i++) {
        color += letras[Math.floor(Math.random() * 16)];
      }
      this.clienteData.color = color;
      return color;
    },
    guardarCliente() {
      if (!this.clienteData.nombre) return;
      
      // Calcular el color del texto basado en el color de fondo
      const color = this.clienteData.color.substring(1); // Remover el #
      const r = parseInt(color.substr(0, 2), 16);
      const g = parseInt(color.substr(2, 2), 16);
      const b = parseInt(color.substr(4, 2), 16);
      
      // Fórmula para determinar la luminosidad
      const luminosidad = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const textColor = luminosidad > 0.5 ? '#000000' : '#FFFFFF';
      
      this.$emit('guardar', {
        ...this.clienteData,
        textColor
      });
    }
  }
};
</script>

<style scoped>
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
  z-index: 1050;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.btn-cerrar {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6c757d;
  cursor: pointer;
  padding: 0.25rem;
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #495057;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
}

textarea.form-control {
  resize: vertical;
}

.color-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.color-preview {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  border: 1px solid #ced4da;
  overflow: hidden;
  position: relative;
}

.color-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Estilos responsivos */
@media (max-width: 576px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
    max-height: 80vh;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .modal-footer button {
    width: 100%;
    margin: 0.25rem 0;
  }
  
  .color-selector {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style> 