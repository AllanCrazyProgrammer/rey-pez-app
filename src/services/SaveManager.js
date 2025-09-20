/**
 * SaveManager - Gestor de guardado con rate limiting robusto
 * Maneja las operaciones de guardado con control de tasa para evitar errores 429
 */

import { debounce } from 'lodash';

class SaveManager {
  constructor() {
    // Configuración de rate limiting - Optimizada para guardado más rápido
    this.config = {
      minDebounceTime: 2000,       // Tiempo mínimo entre guardados (2 segundos) - REDUCIDO
      maxDebounceTime: 30000,      // Tiempo máximo de espera (30 segundos) - REDUCIDO
      baseBackoffTime: 3000,       // Tiempo base de backoff (3 segundos) - REDUCIDO
      maxBackoffTime: 120000,      // Tiempo máximo de backoff (2 minutos) - REDUCIDO
      maxRetries: 5,               // Máximo número de reintentos
      batchSize: 5,                // Número máximo de operaciones por lote
      quotaResetTime: 45000,       // Tiempo para resetear la cuota (45 segundos) - REDUCIDO
    };

    // Estado interno
    this.pendingOperations = new Map();
    this.currentBackoff = this.config.baseBackoffTime;
    this.retryCount = 0;
    this.lastSaveTime = 0;
    this.isProcessing = false;
    this.saveQueue = [];
    this.listeners = new Map();
    this.quotaExhausted = false;
    this.quotaResetTimer = null;
    
    // Estadísticas
    this.stats = {
      totalSaves: 0,
      successfulSaves: 0,
      failedSaves: 0,
      quotaErrors: 0,
      lastError: null,
      lastSuccessTime: null
    };

    // Crear método debounced
    this.debouncedProcess = debounce(
      () => this.processPendingOperations(),
      this.config.minDebounceTime
    );
  }

  /**
   * Programa una operación de guardado
   * @param {string} key - Identificador único de la operación
   * @param {Function} operation - Función que ejecuta la operación
   * @param {Object} options - Opciones adicionales
   */
  scheduleSave(key, operation, options = {}) {
    const {
      priority = 'normal', // 'high', 'normal', 'low'
      merge = true,        // Si debe fusionarse con operaciones existentes
      immediate = false,   // Si debe intentar ejecutarse inmediatamente
      force = false        // Si debe forzar el guardado ignorando debounce
    } = options;

    // Si la cuota está agotada y no es alta prioridad, rechazar
    if (this.quotaExhausted && priority !== 'high') {
      console.warn('[SaveManager] Cuota agotada, operación rechazada:', key);
      this.notifyListeners('quota-exhausted', { key });
      return Promise.reject(new Error('Cuota de Firestore agotada temporalmente'));
    }

    const now = Date.now();
    const priorityOrder = { high: 0, normal: 1, low: 2 };

    if (!merge || !this.pendingOperations.has(key)) {
      this.pendingOperations.set(key, {
        operation,
        priority,
        timestamp: now,
        retries: 0
      });
    } else {
      const pending = this.pendingOperations.get(key);
      pending.operation = operation;
      pending.timestamp = now;
      pending.retries = 0;

      // Si la nueva operación tiene mayor prioridad, actualizarla
      const currentPriority = priorityOrder[pending.priority] ?? priorityOrder.normal;
      const incomingPriority = priorityOrder[priority] ?? priorityOrder.normal;
      if (incomingPriority < currentPriority) {
        pending.priority = priority;
      }
    }

    // Notificar a los listeners
    this.notifyListeners('operation-scheduled', { key, priority });

    // Si es forzado o inmediato y no estamos procesando, intentar ejecutar ahora
    if ((force || immediate) && !this.isProcessing && !this.quotaExhausted) {
      // Si es forzado, cancelar el debounce actual y procesar todo
      if (force) {
        this.debouncedProcess.cancel();
        return this.processPendingOperations();
      }
      return this.processSingleOperation(key);
    }

    // De lo contrario, programar el procesamiento con debounce
    this.debouncedProcess();
    
    return Promise.resolve();
  }

  /**
   * Procesa una operación individual inmediatamente
   */
  async processSingleOperation(key) {
    const item = this.pendingOperations.get(key);
    if (!item) return;

    // Verificar límite de tasa
    const timeSinceLastSave = Date.now() - this.lastSaveTime;
    if (timeSinceLastSave < 1000) { // No más de 1 operación por segundo
      await this.delay(1000 - timeSinceLastSave);
    }

    try {
      this.isProcessing = true;
      this.notifyListeners('save-start', { key });
      
      await item.operation();
      
      this.pendingOperations.delete(key);
      this.lastSaveTime = Date.now();
      this.stats.successfulSaves++;
      this.stats.lastSuccessTime = new Date();
      
      // Reset backoff en éxito
      this.currentBackoff = this.config.baseBackoffTime;
      this.retryCount = 0;
      
      this.notifyListeners('save-success', { key });
      
    } catch (error) {
      await this.handleError(error, key, item);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Procesa todas las operaciones pendientes
   */
  async processPendingOperations() {
    if (this.isProcessing || this.pendingOperations.size === 0) {
      return;
    }

    this.isProcessing = true;
    this.notifyListeners('batch-start', { count: this.pendingOperations.size });

    // Ordenar operaciones por prioridad y timestamp
    const sortedOps = Array.from(this.pendingOperations.entries())
      .sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a[1].timestamp - b[1].timestamp;
      });

    // Procesar en lotes
    const batches = [];
    for (let i = 0; i < sortedOps.length; i += this.config.batchSize) {
      batches.push(sortedOps.slice(i, i + this.config.batchSize));
    }

    for (const batch of batches) {
      // Verificar si debemos pausar por cuota
      if (this.quotaExhausted) {
        console.log('[SaveManager] Pausando procesamiento por cuota agotada');
        break;
      }

      // Procesar lote con delay entre operaciones
      for (const [key, item] of batch) {
        try {
          // Esperar entre operaciones para evitar sobrecarga
          await this.delay(this.calculateDelay());

          this.notifyListeners('save-start', { key });
          await item.operation();
          
          this.pendingOperations.delete(key);
          this.lastSaveTime = Date.now();
          this.stats.successfulSaves++;
          this.stats.totalSaves++;
          this.stats.lastSuccessTime = new Date();
          
          // Reset backoff en éxito
          this.currentBackoff = this.config.baseBackoffTime;
          this.retryCount = 0;
          
          this.notifyListeners('save-success', { key });
          
        } catch (error) {
          await this.handleError(error, key, item);
          
          // Si es un error de cuota, detener el procesamiento del lote
          if (this.isQuotaError(error)) {
            break;
          }
        }
      }

      // Delay entre lotes
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(2000); // 2 segundos entre lotes
      }
    }

    this.isProcessing = false;
    this.notifyListeners('batch-complete', { 
      remaining: this.pendingOperations.size 
    });

    // Si quedan operaciones pendientes, programar siguiente procesamiento
    if (this.pendingOperations.size > 0) {
      setTimeout(() => {
        this.debouncedProcess();
      }, this.currentBackoff);
    }
  }

  /**
   * Maneja errores durante el guardado
   */
  async handleError(error, key, item) {
    console.error('[SaveManager] Error al guardar:', error);
    
    this.stats.failedSaves++;
    this.stats.lastError = error;
    
    // Verificar si es un error de cuota (429)
    if (this.isQuotaError(error)) {
      this.stats.quotaErrors++;
      await this.handleQuotaError();
      return;
    }
    
    // Incrementar contador de reintentos
    item.retries++;
    
    // Si no hemos alcanzado el máximo de reintentos, mantener en cola
    if (item.retries < this.config.maxRetries) {
      console.log(`[SaveManager] Reintentando operación ${key} (intento ${item.retries}/${this.config.maxRetries})`);
      
      // Aplicar backoff exponencial
      this.currentBackoff = Math.min(
        this.currentBackoff * 2,
        this.config.maxBackoffTime
      );
      
      this.notifyListeners('save-retry', { 
        key, 
        attempt: item.retries,
        nextRetryIn: this.currentBackoff 
      });
      
    } else {
      // Máximo de reintentos alcanzado, eliminar de la cola
      console.error(`[SaveManager] Operación ${key} falló después de ${this.config.maxRetries} intentos`);
      this.pendingOperations.delete(key);
      
      this.notifyListeners('save-failed', { 
        key, 
        error: error.message 
      });
    }
  }

  /**
   * Maneja errores de cuota específicamente
   */
  async handleQuotaError() {
    this.quotaExhausted = true;
    
    // Aplicar backoff agresivo
    this.currentBackoff = this.config.maxBackoffTime;
    
    console.warn('[SaveManager] Cuota de Firestore agotada. Pausando operaciones por', this.config.quotaResetTime / 1000, 'segundos');
    
    this.notifyListeners('quota-error', { 
      resetIn: this.config.quotaResetTime 
    });
    
    // Limpiar timer anterior si existe
    if (this.quotaResetTimer) {
      clearTimeout(this.quotaResetTimer);
    }
    
    // Programar reset de cuota
    this.quotaResetTimer = setTimeout(() => {
      this.quotaExhausted = false;
      this.currentBackoff = this.config.baseBackoffTime;
      console.log('[SaveManager] Cuota reseteada, reanudando operaciones');
      
      this.notifyListeners('quota-reset', {});
      
      // Reintentar operaciones pendientes
      if (this.pendingOperations.size > 0) {
        this.debouncedProcess();
      }
    }, this.config.quotaResetTime);
  }

  /**
   * Verifica si un error es de cuota (429)
   */
  isQuotaError(error) {
    return error.code === 'resource-exhausted' || 
           error.message?.includes('429') ||
           error.message?.includes('Too Many Requests') ||
           error.message?.includes('quota');
  }

  /**
   * Calcula el delay entre operaciones basado en el estado actual
   */
  calculateDelay() {
    // Base delay de 500ms
    let delay = 500;
    
    // Agregar delay adicional si hemos tenido errores recientes
    if (this.retryCount > 0) {
      delay += this.retryCount * 1000; // 1 segundo adicional por cada reintento
    }
    
    // Si estamos cerca del límite de cuota, incrementar delay
    if (this.stats.quotaErrors > 0) {
      delay += 2000; // 2 segundos adicionales si hemos tenido errores de cuota
    }
    
    return Math.min(delay, 5000); // Máximo 5 segundos entre operaciones
  }

  /**
   * Registra un listener para eventos
   */
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    // Envolver el callback para agregar protección adicional
    const safeCallback = (data) => {
      try {
        // Verificar si el callback aún es válido antes de ejecutar
        if (typeof callback === 'function') {
          callback(data);
        }
      } catch (error) {
        // Error ya manejado en notifyListeners
        throw error;
      }
    };
    
    // Guardar referencia al callback original para poder removerlo
    safeCallback._original = callback;
    
    this.listeners.get(event).add(safeCallback);
    
    return () => {
      this.removeListener(event, safeCallback);
    };
  }

  /**
   * Elimina un listener
   */
  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      const eventListeners = this.listeners.get(event);
      // Buscar y eliminar el callback, considerando que puede estar envuelto
      eventListeners.forEach(listener => {
        if (listener === callback || listener._original === callback) {
          eventListeners.delete(listener);
        }
      });
    }
  }
  
  /**
   * Elimina todos los listeners de un evento o todos los eventos
   */
  clearListeners(event = null) {
    if (event) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).clear();
      }
    } else {
      // Limpiar todos los listeners
      this.listeners.clear();
    }
  }

  /**
   * Notifica a todos los listeners de un evento
   */
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          // Solo loguear si no es un error esperado de componente no inicializado
          const errorMessage = error.message || error.toString();
          const isExpectedError = errorMessage.includes('Cannot read properties of null') ||
                                 errorMessage.includes('SaveManager no disponible') ||
                                 errorMessage.includes('_isDestroyed');
          
          if (!isExpectedError) {
            console.error(`[SaveManager] Error en listener de ${event}:`, error);
          } else {
            // Log silencioso para errores esperados (solo en modo debug)
            if (window.DEBUG_SAVE_MANAGER) {
              console.debug(`[SaveManager] Error esperado en listener de ${event}:`, errorMessage);
            }
          }
        }
      });
    }
  }

  /**
   * Fuerza el procesamiento inmediato de todas las operaciones pendientes
   * Útil cuando el usuario está por cambiar de ruta o cerrar la página
   */
  async forceProcessAll() {
    console.log('[SaveManager] Forzando procesamiento de todas las operaciones pendientes');
    
    // Cancelar el debounce actual
    if (this.debouncedProcess) {
      this.debouncedProcess.cancel();
    }
    
    // Si hay operaciones pendientes, procesarlas inmediatamente
    if (this.pendingOperations.size > 0) {
      this.notifyListeners('force-save-start', { 
        count: this.pendingOperations.size 
      });
      
      try {
        await this.processPendingOperations();
        console.log('[SaveManager] Todas las operaciones forzadas completadas');
        this.notifyListeners('force-save-complete', {});
      } catch (error) {
        console.error('[SaveManager] Error durante guardado forzado:', error);
        this.notifyListeners('force-save-error', { error });
        throw error;
      }
    }
    
    return Promise.resolve();
  }

  /**
   * Cancela todas las operaciones pendientes
   */
  cancelAll() {
    this.pendingOperations.clear();
    this.debouncedProcess.cancel();
    this.isProcessing = false;
    
    if (this.quotaResetTimer) {
      clearTimeout(this.quotaResetTimer);
      this.quotaResetTimer = null;
    }
    
    this.notifyListeners('all-cancelled', {});
  }

  /**
   * Obtiene el estado actual del manager
   */
  getStatus() {
    return {
      pendingOperations: this.pendingOperations.size,
      isProcessing: this.isProcessing,
      quotaExhausted: this.quotaExhausted,
      currentBackoff: this.currentBackoff,
      stats: { ...this.stats }
    };
  }

  /**
   * Utility para crear delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpia recursos cuando el manager ya no se necesita
   */
  destroy() {
    this.cancelAll();
    this.listeners.clear();
  }
}

// Crear instancia singleton
let instance = null;

export function getSaveManager() {
  if (!instance) {
    instance = new SaveManager();
  }
  return instance;
}

export default SaveManager;
