<template>
  <transition name="fade">
    <div v-if="visible" class="save-status-indicator" :class="statusClass">
      <div class="status-content">
        <!-- Icono de estado -->
        <div class="status-icon">
          <i v-if="status === 'saving'" class="fas fa-spinner fa-spin"></i>
          <i v-else-if="status === 'success'" class="fas fa-check-circle"></i>
          <i v-else-if="status === 'error'" class="fas fa-exclamation-triangle"></i>
          <i v-else-if="status === 'quota'" class="fas fa-pause-circle"></i>
          <i v-else-if="status === 'pending'" class="fas fa-clock"></i>
        </div>
        
        <!-- Mensaje de estado -->
        <div class="status-message">
          <div class="status-text">{{ message }}</div>
          <div v-if="details" class="status-details">{{ details }}</div>
        </div>
        
        <!-- Indicador de progreso para operaciones pendientes -->
        <div v-if="pendingCount > 0" class="pending-indicator">
          <span class="pending-badge">{{ pendingCount }}</span>
        </div>
      </div>
      
      <!-- Barra de progreso para tiempo de espera -->
      <div v-if="showProgress" class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>
  </transition>
</template>

<script>
import { getSaveManager } from '@/services/SaveManager';

// Activar/desactivar logging detallado
const DEBUG_MODE = false; // Cambiar a true para debugging

export default {
  name: 'SaveStatusIndicator',
  
  data() {
    return {
      visible: false,
      status: 'idle', // idle, saving, success, error, quota, pending
      message: '',
      details: '',
      pendingCount: 0,
      showProgress: false,
      progressPercent: 0,
      hideTimeout: null,
      progressInterval: null,
      saveManager: null,
      unsubscribers: [], // Array para almacenar funciones de desuscripción
      componentId: `SaveStatusIndicator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID único para debugging
      debug: DEBUG_MODE
    };
  },
  
  computed: {
    statusClass() {
      return {
        'status-saving': this.status === 'saving',
        'status-success': this.status === 'success',
        'status-error': this.status === 'error',
        'status-quota': this.status === 'quota',
        'status-pending': this.status === 'pending'
      };
    }
  },
  
  mounted() {
    if (this.debug) console.log(`[SaveStatusIndicator ${this.componentId}] Montando componente`);
    
    // Verificar si ya hay otra instancia activa
    if (window.__saveStatusIndicatorActive && window.__saveStatusIndicatorActive !== this.componentId) {
      if (this.debug) console.warn(`[SaveStatusIndicator ${this.componentId}] Ya existe otra instancia activa (${window.__saveStatusIndicatorActive}), esta instancia no se activará`);
      return;
    }
    
    // Marcar esta instancia como activa
    window.__saveStatusIndicatorActive = this.componentId;
    
    // Inicializar el SaveManager con un pequeño retraso para asegurar que esté disponible
    this.$nextTick(() => {
      try {
        this.saveManager = getSaveManager();
        if (this.saveManager) {
          if (this.debug) console.log(`[SaveStatusIndicator ${this.componentId}] SaveManager obtenido, configurando listeners`);
          this.setupListeners();
        } else {
          if (this.debug) console.warn(`[SaveStatusIndicator ${this.componentId}] No se pudo obtener la instancia del SaveManager`);
          // Reintentar después de un breve retraso
          setTimeout(() => {
            if (window.__saveStatusIndicatorActive !== this.componentId) {
              if (this.debug) console.log(`[SaveStatusIndicator ${this.componentId}] Ya no es la instancia activa, cancelando reintento`);
              return;
            }
            this.saveManager = getSaveManager();
            if (this.saveManager) {
              if (this.debug) console.log(`[SaveStatusIndicator ${this.componentId}] SaveManager obtenido en reintento, configurando listeners`);
              this.setupListeners();
            }
          }, 500);
        }
      } catch (error) {
        console.error(`[SaveStatusIndicator ${this.componentId}] Error al inicializar SaveManager:`, error);
      }
    });
  },
  
  beforeDestroy() {
    if (this.debug) console.log(`[SaveStatusIndicator ${this.componentId}] Destruyendo componente`);
    
    // Si esta instancia es la activa, limpiar la marca global
    if (window.__saveStatusIndicatorActive === this.componentId) {
      window.__saveStatusIndicatorActive = null;
      if (this.debug) console.log(`[SaveStatusIndicator ${this.componentId}] Instancia activa eliminada`);
    }
    
    this.cleanup();
  },
  
  methods: {
    setupListeners() {
      // Verificar que el SaveManager esté inicializado
      if (!this.saveManager) {
        if (this.debug) console.warn('[SaveStatusIndicator] SaveManager no está inicializado');
        return;
      }
      
      // Limpiar listeners anteriores si existen
      this.cleanupListeners();
      
      // Crear callbacks con el contexto capturado para evitar problemas de referencia
      const manager = this.saveManager; // Capturar referencia local
      
      // Crear callbacks que capturen el contexto correcto
      const createCallback = (handler) => {
        const componentId = this.componentId; // Capturar el ID para el closure
        return (data) => {
          // Verificar que esta instancia siga siendo la activa
          if (window.__saveStatusIndicatorActive !== componentId) {
            // No loguear para evitar spam, ya que es esperado cuando hay múltiples instancias
            return;
          }
          
          // Verificar que el componente aún esté montado y tenga saveManager
          if (this._isDestroyed || !this.saveManager) {
            // Esta condición es inesperada solo si seguimos siendo la instancia activa
            if (window.__saveStatusIndicatorActive === componentId && this.debug) {
              console.warn(`[SaveStatusIndicator ${componentId}] Componente destruido o sin SaveManager, ignorando evento`);
            }
            return;
          }
          handler.call(this, data, manager);
        };
      };
      
      // Registrar listeners y guardar las funciones de desuscripción
      const events = [
        ['operation-scheduled', this.onOperationScheduled],
        ['save-start', this.onSaveStart],
        ['save-success', this.onSaveSuccess],
        ['save-retry', this.onSaveRetry],
        ['save-failed', this.onSaveFailed],
        ['quota-error', this.onQuotaError],
        ['quota-reset', this.onQuotaReset],
        ['batch-start', this.onBatchStart],
        ['batch-complete', this.onBatchComplete],
        ['force-save-start', this.onForceSaveStart],
        ['force-save-complete', this.onForceSaveComplete],
        ['force-save-error', this.onForceSaveError]
      ];
      
      events.forEach(([event, handler]) => {
        const callback = createCallback(handler);
        const unsubscribe = this.saveManager.addListener(event, callback);
        if (unsubscribe) {
          this.unsubscribers.push(unsubscribe);
        }
      });
    },
    
    onOperationScheduled(data, manager) {
      // Usar el manager pasado como parámetro si está disponible, sino usar this.saveManager
      const saveManager = manager || this.saveManager;
      
      if (!saveManager) {
        // No loguear este warning ya que es manejado por el wrapper
        return;
      }
      
      const status = saveManager.getStatus();
      this.pendingCount = status.pendingOperations;
      
      if (!this.visible || this.status === 'idle') {
        this.showStatus('pending', 'Cambios pendientes de guardar', `${this.pendingCount} operación(es) en cola`);
      }
    },
    
    onSaveStart(data) {
      this.showStatus('saving', 'Guardando cambios...', null, false);
    },
    
    onSaveSuccess(data, manager) {
      // Usar el manager pasado como parámetro si está disponible, sino usar this.saveManager
      const saveManager = manager || this.saveManager;
      
      if (!saveManager) {
        // No loguear este warning ya que es manejado por el wrapper
        return;
      }
      
      const status = saveManager.getStatus();
      this.pendingCount = status.pendingOperations;
      
      if (this.pendingCount > 0) {
        this.showStatus('pending', 'Guardado parcial completado', `${this.pendingCount} operación(es) restantes`);
      } else {
        this.showStatus('success', '¡Todos los cambios guardados!', null, true, 3000);
      }
    },
    
    onSaveRetry(data) {
      this.showStatus(
        'error', 
        'Reintentando guardado...', 
        `Intento ${data.attempt} - Próximo intento en ${Math.round(data.nextRetryIn / 1000)}s`
      );
      this.startProgressBar(data.nextRetryIn);
    },
    
    onSaveFailed(data) {
      this.showStatus(
        'error', 
        'Error al guardar cambios', 
        'Algunos cambios no pudieron guardarse. Por favor, intenta de nuevo.',
        true,
        10000
      );
    },
    
    onQuotaError(data) {
      const resetMinutes = Math.ceil(data.resetIn / 60000);
      this.showStatus(
        'quota', 
        'Límite de operaciones alcanzado', 
        `Pausando guardado por ${resetMinutes} minuto(s). Los cambios se guardarán automáticamente cuando se restablezca el límite.`
      );
      this.startProgressBar(data.resetIn);
    },
    
    onQuotaReset(data, manager) {
      // Usar el manager pasado como parámetro si está disponible, sino usar this.saveManager
      const saveManager = manager || this.saveManager;
      
      if (!saveManager) {
        // No loguear este warning ya que es manejado por el wrapper
        return;
      }
      
      const status = saveManager.getStatus();
      this.pendingCount = status.pendingOperations;
      
      if (this.pendingCount > 0) {
        this.showStatus(
          'pending', 
          'Límite restablecido', 
          `Procesando ${this.pendingCount} operación(es) pendientes...`
        );
      } else {
        this.hideStatus();
      }
    },
    
    onBatchStart(data) {
      this.showStatus(
        'saving', 
        'Procesando cambios en lote...', 
        `${data.count} operaciones`
      );
    },
    
    onBatchComplete(data) {
      this.pendingCount = data.remaining;
      
      if (this.pendingCount > 0) {
        this.showStatus(
          'pending', 
          'Lote procesado', 
          `${this.pendingCount} operación(es) restantes`
        );
      } else {
        this.showStatus('success', '¡Todos los cambios guardados!', null, true, 3000);
      }
    },
    
    onForceSaveStart(data) {
      this.showStatus(
        'saving', 
        'Guardando cambios antes de salir...', 
        `${data.count || 0} operación(es) pendientes`,
        false
      );
    },
    
    onForceSaveComplete() {
      this.showStatus(
        'success', 
        '¡Cambios guardados exitosamente!', 
        'Puedes continuar navegando',
        true,
        2000
      );
    },
    
    onForceSaveError(data) {
      this.showStatus(
        'error', 
        'Error al guardar cambios', 
        'Algunos cambios podrían no haberse guardado',
        true,
        5000
      );
    },
    
    showStatus(status, message, details = null, autoHide = false, hideDelay = 5000) {
      this.clearTimeouts();
      
      this.visible = true;
      this.status = status;
      this.message = message;
      this.details = details;
      
      if (autoHide) {
        this.hideTimeout = setTimeout(() => {
          this.hideStatus();
        }, hideDelay);
      }
    },
    
    hideStatus() {
      this.visible = false;
      this.status = 'idle';
      this.message = '';
      this.details = '';
      this.showProgress = false;
      this.progressPercent = 0;
    },
    
    startProgressBar(duration) {
      this.showProgress = true;
      this.progressPercent = 0;
      
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
      }
      
      const startTime = Date.now();
      const updateInterval = 100; // Actualizar cada 100ms
      
      this.progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        this.progressPercent = Math.min((elapsed / duration) * 100, 100);
        
        if (this.progressPercent >= 100) {
          clearInterval(this.progressInterval);
          this.showProgress = false;
        }
      }, updateInterval);
    },
    
    clearTimeouts() {
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
      
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
    },
    
    cleanupListeners() {
      // Desuscribir todos los listeners registrados
      if (this.unsubscribers && this.unsubscribers.length > 0) {
        this.unsubscribers.forEach(unsubscribe => {
          if (typeof unsubscribe === 'function') {
            try {
              unsubscribe();
            } catch (error) {
              if (this.debug) console.error('[SaveStatusIndicator] Error al desuscribir listener:', error);
            }
          }
        });
        this.unsubscribers = [];
      }
    },
    
    cleanup() {
      this.clearTimeouts();
      this.cleanupListeners();
      this.saveManager = null;
    }
  }
};
</script>

<style scoped>
.save-status-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px 16px;
  max-width: 400px;
  z-index: 9999;
  transition: all 0.3s ease;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.status-message {
  flex: 1;
}

.status-text {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.status-details {
  font-size: 12px;
  opacity: 0.8;
  line-height: 1.3;
}

.pending-indicator {
  position: relative;
}

.pending-badge {
  background: #6c757d;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
}

/* Estados de color */
.status-saving {
  border-left: 4px solid #007bff;
}

.status-saving .status-icon {
  color: #007bff;
}

.status-success {
  border-left: 4px solid #28a745;
}

.status-success .status-icon {
  color: #28a745;
}

.status-error {
  border-left: 4px solid #dc3545;
}

.status-error .status-icon {
  color: #dc3545;
}

.status-quota {
  border-left: 4px solid #ffc107;
  background: #fff8e1;
}

.status-quota .status-icon {
  color: #f57c00;
}

.status-pending {
  border-left: 4px solid #6c757d;
}

.status-pending .status-icon {
  color: #6c757d;
}

/* Barra de progreso */
.progress-bar {
  margin-top: 10px;
  height: 3px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.1s linear;
}

/* Animaciones */
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Responsive */
@media (max-width: 768px) {
  .save-status-indicator {
    bottom: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .save-status-indicator {
    background: #2d2d2d;
    color: #ffffff;
  }
  
  .status-details {
    opacity: 0.7;
  }
  
  .progress-bar {
    background: #404040;
  }
}
</style>
