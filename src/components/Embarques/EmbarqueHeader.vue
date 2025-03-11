<template>
  <div class="embarque-header">
    <div class="header-main">
      <div class="header-left">
        <h2>
          <i class="fas fa-ship"></i> 
          Embarque {{ fecha }}
        </h2>
        <div v-if="cargaCon" class="carga-con">
          <strong>Carga con:</strong> {{ cargaCon }}
        </div>
      </div>
      
      <div class="header-right">
        <div class="header-actions">
          <button 
            @click="$emit('guardar')" 
            class="btn btn-primary mr-2"
            :disabled="guardando || bloqueado"
          >
            <i class="fas" :class="guardando ? 'fa-spinner fa-spin' : 'fa-save'"></i>
            {{ guardando ? 'Guardando...' : 'Guardar' }}
          </button>
          
          <button 
            @click="$emit('guardar-directo')" 
            class="btn btn-warning mr-2"
            :disabled="guardando || bloqueado"
            title="Guardar directamente en Firestore sin usar el servicio de sincronización"
          >
            <i class="fas" :class="guardando ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
            {{ guardando ? 'Guardando...' : 'Guardar Directo' }}
          </button>
          
          <button 
            @click="$emit('generar-resumen')" 
            class="btn btn-success"
            :disabled="generandoPdf || bloqueado"
          >
            <i class="fas" :class="generandoPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'"></i>
            {{ generandoPdf ? 'Generando...' : 'Generar PDF' }}
          </button>
          
          <button @click="$emit('editar-fecha')" class="btn btn-sm btn-info mr-2">
            <i class="fas fa-calendar-alt"></i> Fecha
          </button>
          
          <button @click="$emit('editar-carga')" class="btn btn-sm btn-info mr-2">
            <i class="fas fa-truck"></i> Carga
          </button>
          
          <button @click="$emit('toggle-bloqueo')" class="btn btn-sm" :class="bloqueado ? 'btn-danger' : 'btn-success'">
            <i class="fas" :class="bloqueado ? 'fa-lock' : 'fa-lock-open'"></i>
            {{ bloqueado ? 'Desbloquear' : 'Bloquear' }}
          </button>
          
          <button @click="$emit('volver')" class="btn btn-sm btn-secondary ml-2">
            <i class="fas fa-arrow-left"></i> Volver
          </button>
        </div>
      </div>
    </div>
    
    <!-- Componente de estado de sincronización -->
    <EstadoSincronizacion 
      v-if="embarqueId"
      :online="online"
      :cambios-pendientes="cambiosPendientes"
      :sincronizando="sincronizando"
      :usuarios-activos="usuariosActivos"
      @sincronizar="$emit('sincronizar')"
    />
  </div>
</template>

<script>
import EstadoSincronizacion from './EstadoSincronizacion.vue';

/**
 * @component EmbarqueHeader
 * @description Encabezado del embarque con botones para guardar o generar resumen
 * Muestra un título diferente según el modo de edición y botones contextuales
 */
export default {
  name: 'EmbarqueHeader',
  components: {
    EstadoSincronizacion
  },
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
    },
    fecha: {
      type: String,
      default: ''
    },
    cargaCon: {
      type: String,
      default: ''
    },
    bloqueado: {
      type: Boolean,
      default: false
    },
    // Nuevas props para sincronización
    embarqueId: {
      type: String,
      default: ''
    },
    online: {
      type: Boolean,
      default: true
    },
    cambiosPendientes: {
      type: Number,
      default: 0
    },
    sincronizando: {
      type: Boolean,
      default: false
    },
    usuariosActivos: {
      type: Array,
      default: () => []
    }
  }
};
</script>

<style scoped>
.embarque-header {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.header-left h2 {
  margin: 0;
  color: #343a40;
  font-size: 1.5rem;
}

.carga-con {
  font-size: 0.9rem;
  color: #6c757d;
  margin-top: 5px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.btn {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.mr-2 {
  margin-right: 10px;
}

@media (max-width: 768px) {
  .header-main {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-right {
    margin-top: 15px;
    width: 100%;
  }
  
  .header-actions {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
    margin-right: 0 !important;
    margin-bottom: 5px;
  }
}
</style> 