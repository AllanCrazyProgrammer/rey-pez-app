<template>
  <div v-if="mostrar" class="modal-overlay">
    <div class="modal-content">
      <h3>Agregar Nota</h3>
      <textarea 
        v-model="notaLocal" 
        placeholder="Escriba su nota aquí..."
        rows="4"
      ></textarea>
      <div class="modal-buttons">
        <button @click="guardar" class="btn-guardar">Guardar</button>
        <button @click="cancelar" class="btn-cancelar">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotaModal',
  props: {
    mostrar: {
      type: Boolean,
      default: false
    },
    nota: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      notaLocal: ''
    };
  },
  watch: {
    nota: {
      immediate: true,
      handler(value) {
        this.notaLocal = value;
      }
    }
  },
  methods: {
    guardar() {
      this.$emit('guardar', this.notaLocal);
    },
    cancelar() {
      this.notaLocal = this.nota;
      this.$emit('cancelar');
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
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
}

.modal-content textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 10px 0;
  font-size: 16px;
  resize: vertical;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.btn-guardar {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancelar {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}
</style>