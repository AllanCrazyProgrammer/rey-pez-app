<template>
  <div class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Establecer Precio - {{ producto.medida }}</h3>
        <button class="btn-cerrar" @click="$emit('cerrar')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label for="precio">Precio:</label>
          <div class="input-precio">
            <span class="simbolo-moneda">$</span>
            <input
              type="number"
              id="precio"
              v-model.number="precioLocal"
              class="input-precio-valor"
              step="0.01"
              min="0"
              placeholder="0.00"
              @input="validarPrecio"
            >
          </div>
          <small v-if="errorPrecio" class="error-mensaje">{{ errorPrecio }}</small>
        </div>
        
        <div class="form-group">
          <label for="notas">Notas adicionales:</label>
          <textarea
            id="notas"
            v-model="notasLocal"
            class="input-notas"
            placeholder="Agregar notas sobre el precio..."
          ></textarea>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          class="btn btn-secondary" 
          @click="$emit('cerrar')"
        >
          Cancelar
        </button>
        <button 
          class="btn btn-primary" 
          @click="guardarPrecio"
          :disabled="!!errorPrecio || !precioLocal"
        >
          Guardar Precio
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalPrecio',
  props: {
    producto: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      precioLocal: this.producto.precio || null,
      notasLocal: this.producto.notasPrecio || '',
      errorPrecio: null
    };
  },
  methods: {
    validarPrecio() {
      if (this.precioLocal < 0) {
        this.errorPrecio = 'El precio no puede ser negativo';
        return;
      }
      if (this.precioLocal > 999999.99) {
        this.errorPrecio = 'El precio es demasiado alto';
        return;
      }
      this.errorPrecio = null;
    },
    guardarPrecio() {
      if (this.errorPrecio || !this.precioLocal) return;
      
      this.$emit('guardar', {
        precio: this.precioLocal,
        notasPrecio: this.notasLocal
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
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

.input-precio {
  position: relative;
  display: flex;
  align-items: center;
}

.simbolo-moneda {
  position: absolute;
  left: 1rem;
  color: #495057;
}

.input-precio-valor {
  width: 100%;
  padding: 0.5rem 1rem 0.5rem 2rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
}

.input-notas {
  width: 100%;
  min-height: 100px;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  resize: vertical;
}

.error-mensaje {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
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
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .modal-footer button {
    width: 100%;
    margin: 0.25rem 0;
  }
}
</style> 