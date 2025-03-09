<template>
  <div class="encabezado-embarque">
    <h1>{{ modoEdicion ? 'Editar Embarque' : 'Nuevo Embarque' }}</h1>
    <div class="acciones-embarque">
      <button 
        v-if="!modoEdicion" 
        @click="$emit('guardar')" 
        class="btn btn-primary"
        :disabled="guardando"
      >
        <span v-if="guardando" class="loader-inline"></span>
        <i v-else class="fas fa-save"></i> Guardar Embarque
      </button>
      <button 
        v-if="modoEdicion" 
        @click="$emit('generar-resumen')" 
        class="btn btn-info"
        :disabled="generandoPdf"
      >
        <span v-if="generandoPdf" class="loader-inline"></span>
        <i v-else class="fas fa-file-pdf"></i> Generar Resumen
      </button>
    </div>
  </div>
</template>

<script>
/**
 * @component EmbarqueHeader
 * @description Encabezado del embarque con botones para guardar o generar resumen
 * Muestra un título diferente según el modo de edición y botones contextuales
 */
export default {
  name: 'EmbarqueHeader',
  props: {
    /**
     * Indica si se está en modo edición
     * @type {Boolean}
     */
    modoEdicion: {
      type: Boolean,
      default: false
    },
    /**
     * Indica si se está guardando el embarque
     * @type {Boolean}
     */
    guardando: {
      type: Boolean,
      default: false
    },
    /**
     * Indica si se está generando el PDF
     * @type {Boolean}
     */
    generandoPdf: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
.encabezado-embarque {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.encabezado-embarque h1 {
  margin: 0;
  font-size: 2rem;
  color: #333;
}

.acciones-embarque {
  display: flex;
  gap: 10px;
}

.loader-inline {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid #fff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .encabezado-embarque {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .acciones-embarque {
    width: 100%;
    justify-content: center;
  }
}
</style> 