<template>
  <div v-if="mostrar" class="modal-overlay">
    <div class="modal-content">
      <h3>Nuevo Cliente Temporal</h3>
      <div class="form-group">
        <label for="nombreCliente">Nombre del Cliente:</label>
        <input 
          type="text" 
          id="nombreCliente" 
          v-model="nombreCliente"
          placeholder="Ingrese el nombre del cliente"
          class="input-field">
      </div>
      <div class="buttons-container">
        <button @click="guardarCliente" class="btn-guardar" :disabled="!nombreCliente.trim()">
          Guardar
        </button>
        <button @click="$emit('cerrar')" class="btn-cancelar">
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NuevoClienteModal',
  props: {
    mostrar: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      nombreCliente: ''
    }
  },
  methods: {
    guardarCliente() {
      if (this.nombreCliente.trim()) {
        this.$emit('guardar', {
          id: this.nombreCliente.toLowerCase().replace(/\s+/g, '-'),
          nombre: this.nombreCliente.trim()
        })
        this.nombreCliente = ''
      }
    }
  }
}
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
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
}

h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1.5em;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-size: 1.1em;
}

.input-field {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1.1em;
}

.input-field:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.buttons-container {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-guardar,
.btn-cancelar {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.btn-guardar {
  background-color: #3498db;
  color: white;
}

.btn-guardar:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.btn-cancelar {
  background-color: #95a5a6;
  color: white;
}

@media (max-width: 480px) {
  .modal-content {
    padding: 15px;
  }

  h3 {
    font-size: 1.3em;
  }

  .input-field {
    font-size: 1em;
  }

  .btn-guardar,
  .btn-cancelar {
    padding: 10px 20px;
    font-size: 1em;
  }
}
</style> 