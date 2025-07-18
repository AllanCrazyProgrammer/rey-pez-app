<template>
  <div v-if="visible" class="notificacion-respaldo" :class="tipo">
    <div class="notificacion-content">
      <div class="notificacion-icon">
        <span v-if="tipo === 'success'">✅</span>
        <span v-else-if="tipo === 'error'">❌</span>
        <span v-else-if="tipo === 'warning'">⚠️</span>
        <span v-else>💾</span>
      </div>
      <div class="notificacion-text">
        <h4>{{ titulo }}</h4>
        <p>{{ mensaje }}</p>
      </div>
      <button @click="cerrar" class="notificacion-close">
        <span>✕</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotificacionRespaldo',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    tipo: {
      type: String,
      default: 'info', // success, error, warning, info
      validator: value => ['success', 'error', 'warning', 'info'].includes(value)
    },
    titulo: {
      type: String,
      default: 'Respaldo automático'
    },
    mensaje: {
      type: String,
      default: 'Se ha creado un respaldo de seguridad'
    },
    autoClose: {
      type: Number,
      default: 5000 // 5 segundos
    }
  },
  data() {
    return {
      timeout: null
    };
  },
  watch: {
    visible(newVal) {
      if (newVal && this.autoClose > 0) {
        this.timeout = setTimeout(() => {
          this.cerrar();
        }, this.autoClose);
      }
    }
  },
  methods: {
    cerrar() {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      this.$emit('close');
    }
  },
  beforeDestroy() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }
};
</script>

<style scoped>
.notificacion-respaldo {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  max-width: 400px;
  min-width: 300px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notificacion-content {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.notificacion-respaldo.success .notificacion-content {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(69, 160, 73, 0.95));
  color: white;
}

.notificacion-respaldo.error .notificacion-content {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(211, 47, 47, 0.95));
  color: white;
}

.notificacion-respaldo.warning .notificacion-content {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.95), rgba(255, 160, 0, 0.95));
  color: #333;
}

.notificacion-respaldo.info .notificacion-content {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.95), rgba(25, 118, 210, 0.95));
  color: white;
}

.notificacion-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.notificacion-text {
  flex: 1;
}

.notificacion-text h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.notificacion-text p {
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
  line-height: 1.4;
}

.notificacion-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.notificacion-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.notificacion-close span {
  font-size: 1.2rem;
  font-weight: bold;
}

/* Responsive */
@media (max-width: 768px) {
  .notificacion-respaldo {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
    min-width: auto;
  }
  
  .notificacion-content {
    padding: 15px;
  }
  
  .notificacion-icon {
    font-size: 1.5rem;
  }
}
</style> 