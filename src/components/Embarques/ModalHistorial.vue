<template>
  <div class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Historial de Precios - {{ producto.medida }}</h3>
        <button class="btn-cerrar" @click="$emit('cerrar')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="modal-body">
        <div v-if="historial.length > 0" class="historial-lista">
          <div class="historial-item header">
            <div class="fecha">Fecha</div>
            <div class="precio">Precio</div>
            <div class="cuenta">Cuenta</div>
          </div>
          <div 
            v-for="(item, index) in historial" 
            :key="index" 
            class="historial-item"
          >
            <div class="fecha">{{ formatearFecha(item.fecha) }}</div>
            <div class="precio">${{ formatearPrecio(item.precio) }}</div>
            <div class="cuenta">
              <a 
                :href="`/cuentas/${item.cuentaId}`" 
                target="_blank"
                class="link-cuenta"
              >
                Ver Cuenta
              </a>
            </div>
          </div>
        </div>
        <div v-else class="sin-historial">
          <i class="fas fa-history"></i>
          <p>No hay historial de precios disponible para este producto</p>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-primary" @click="$emit('cerrar')">
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalHistorial',
  props: {
    producto: {
      type: Object,
      required: true
    },
    historial: {
      type: Array,
      required: true
    }
  },
  methods: {
    formatearFecha(fecha) {
      return new Date(fecha).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    formatearPrecio(precio) {
      return precio.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
  max-width: 600px;
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
  flex: 1;
}

.historial-lista {
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.historial-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #dee2e6;
}

.historial-item:last-child {
  border-bottom: none;
}

.historial-item.header {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.fecha {
  color: #495057;
}

.precio {
  color: #28a745;
  font-weight: 500;
  text-align: right;
}

.cuenta {
  text-align: center;
}

.link-cuenta {
  color: #007bff;
  text-decoration: none;
  font-size: 0.875rem;
}

.link-cuenta:hover {
  text-decoration: underline;
}

.sin-historial {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
}

.sin-historial i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: flex-end;
}

/* Estilos responsivos */
@media (max-width: 576px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
    max-height: 80vh;
  }
  
  .historial-item {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    text-align: center;
  }
  
  .historial-item.header {
    display: none;
  }
  
  .precio {
    text-align: center;
  }
  
  .fecha {
    font-size: 0.875rem;
  }
}
</style> 