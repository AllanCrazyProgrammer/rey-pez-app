<template>
  <div class="estado-sincronizacion">
    <div class="estado-conexion" :class="{ 'online': online, 'offline': !online }">
      <i class="fas" :class="{ 'fa-wifi': online, 'fa-exclamation-triangle': !online }"></i>
      <span v-if="online">Conectado</span>
      <span v-else>Sin conexión</span>
    </div>
    
    <div v-if="cambiosPendientes > 0" class="cambios-pendientes">
      <i class="fas fa-clock"></i>
      <span>{{ cambiosPendientes }} {{ cambiosPendientes === 1 ? 'cambio pendiente' : 'cambios pendientes' }}</span>
      <button @click="sincronizar" :disabled="sincronizando" class="btn-sincronizar">
        <i class="fas" :class="{ 'fa-sync-alt': !sincronizando, 'fa-spinner fa-spin': sincronizando }"></i>
      </button>
    </div>
    
    <div class="usuarios-activos" v-if="usuariosActivos.length > 0">
      <i class="fas fa-users"></i>
      <span>{{ usuariosActivos.length }} {{ usuariosActivos.length === 1 ? 'usuario activo' : 'usuarios activos' }}</span>
      
      <div class="usuarios-lista">
        <div v-for="(usuario, index) in usuariosActivos" :key="index" class="usuario-item">
          <i class="fas fa-user"></i>
          <span>{{ usuario.username }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EstadoSincronizacion',
  props: {
    /**
     * Estado de conexión
     */
    online: {
      type: Boolean,
      default: true
    },
    /**
     * Número de cambios pendientes por sincronizar
     */
    cambiosPendientes: {
      type: Number,
      default: 0
    },
    /**
     * Indica si está sincronizando cambios
     */
    sincronizando: {
      type: Boolean,
      default: false
    },
    /**
     * Lista de usuarios activos
     */
    usuariosActivos: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    /**
     * Solicita sincronización manual
     */
    sincronizar() {
      this.$emit('sincronizar');
    }
  }
};
</script>

<style scoped>
.estado-sincronizacion {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 8px;
  font-size: 0.9rem;
}

.estado-conexion,
.cambios-pendientes,
.usuarios-activos {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 4px;
}

.estado-conexion.online {
  background-color: #d4edda;
  color: #155724;
}

.estado-conexion.offline {
  background-color: #f8d7da;
  color: #721c24;
}

.cambios-pendientes {
  background-color: #fff3cd;
  color: #856404;
}

.usuarios-activos {
  background-color: #d1ecf1;
  color: #0c5460;
  position: relative;
  cursor: pointer;
}

.usuarios-lista {
  position: absolute;
  top: 100%;
  left: 0;
  width: 200px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 10px;
  z-index: 100;
  display: none;
}

.usuarios-activos:hover .usuarios-lista {
  display: block;
}

.usuario-item {
  padding: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-sincronizar {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  padding: 0;
  margin-left: 5px;
}

.btn-sincronizar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .estado-sincronizacion {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style> 