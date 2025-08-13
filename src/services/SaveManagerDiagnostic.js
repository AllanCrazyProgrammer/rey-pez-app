/**
 * Herramienta de diagnóstico para el SaveManager
 * Ejecutar en la consola del navegador para verificar el estado
 */

import { getSaveManager } from './SaveManager';

// Función para diagnosticar problemas con el SaveManager
export function diagnosticSaveManager() {
  console.log('=== Diagnóstico del SaveManager ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // 1. Verificar la instancia del SaveManager
    const manager = getSaveManager();
    console.log('✅ SaveManager instanciado correctamente');
    
    // 2. Verificar el estado
    const status = manager.getStatus();
    console.log('📊 Estado actual:', {
      pendingOperations: status.pendingOperations,
      isProcessing: status.isProcessing,
      quotaExhausted: status.quotaExhausted,
      currentBackoff: status.currentBackoff
    });
    
    // 3. Verificar listeners registrados
    const listenerCount = {};
    if (manager.listeners) {
      manager.listeners.forEach((listeners, event) => {
        listenerCount[event] = listeners.size;
      });
      console.log('📡 Listeners registrados:', listenerCount);
    }
    
    // 4. Verificar SaveStatusIndicator activo
    const activeIndicator = window.__saveStatusIndicatorActive;
    console.log('🎯 SaveStatusIndicator activo:', activeIndicator || 'Ninguno');
    
    // 5. Verificar múltiples instancias
    const allIndicators = [];
    document.querySelectorAll('.save-status-indicator').forEach(el => {
      allIndicators.push(el);
    });
    console.log('📦 Instancias de SaveStatusIndicator en DOM:', allIndicators.length);
    
    // 6. Estadísticas
    console.log('📈 Estadísticas:', status.stats);
    
    // 7. Verificar si hay errores en cola
    if (status.stats.lastError) {
      console.warn('⚠️ Último error registrado:', status.stats.lastError);
    }
    
    // 8. Recomendaciones
    console.log('\n=== Recomendaciones ===');
    
    if (listenerCount['operation-scheduled'] > 1) {
      console.warn('⚠️ Múltiples listeners para operation-scheduled. Posible duplicación de componentes.');
    }
    
    if (status.quotaExhausted) {
      console.warn('⚠️ Cuota agotada. El sistema está en pausa temporal.');
    }
    
    if (status.pendingOperations > 10) {
      console.warn('⚠️ Muchas operaciones pendientes. Considera revisar la frecuencia de guardado.');
    }
    
    if (!activeIndicator) {
      console.warn('⚠️ No hay SaveStatusIndicator activo. El usuario no verá el estado del guardado.');
    }
    
    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Función para limpiar listeners huérfanos
export function cleanupOrphanListeners() {
  console.log('🧹 Limpiando listeners huérfanos...');
  
  try {
    const manager = getSaveManager();
    
    // Contar listeners antes
    let totalBefore = 0;
    manager.listeners.forEach((listeners) => {
      totalBefore += listeners.size;
    });
    
    // Limpiar el indicador activo si no existe en el DOM
    if (window.__saveStatusIndicatorActive) {
      const exists = document.querySelector('.save-status-indicator');
      if (!exists) {
        console.log('🗑️ Limpiando indicador activo que no existe en DOM');
        window.__saveStatusIndicatorActive = null;
      }
    }
    
    console.log(`📊 Listeners antes de limpieza: ${totalBefore}`);
    console.log('✅ Limpieza completada');
    
    // Nota: No podemos limpiar listeners automáticamente sin romper componentes válidos
    console.log('ℹ️ Para forzar limpieza completa, ejecuta: getSaveManager().clearListeners()');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

// Función para activar modo debug
export function enableSaveManagerDebug() {
  window.DEBUG_SAVE_MANAGER = true;
  console.log('🔍 Modo debug del SaveManager activado');
  console.log('ℹ️ Ahora verás logs detallados de errores esperados');
}

// Función para desactivar modo debug
export function disableSaveManagerDebug() {
  window.DEBUG_SAVE_MANAGER = false;
  console.log('🔕 Modo debug del SaveManager desactivado');
}

// Exportar para uso global en consola
if (typeof window !== 'undefined') {
  window.diagnosticSaveManager = diagnosticSaveManager;
  window.cleanupOrphanListeners = cleanupOrphanListeners;
  window.enableSaveManagerDebug = enableSaveManagerDebug;
  window.disableSaveManagerDebug = disableSaveManagerDebug;
  
  console.log('🛠️ Herramientas de diagnóstico del SaveManager disponibles:');
  console.log('  - diagnosticSaveManager(): Diagnóstico completo del sistema');
  console.log('  - cleanupOrphanListeners(): Limpia referencias huérfanas');
  console.log('  - enableSaveManagerDebug(): Activa modo debug');
  console.log('  - disableSaveManagerDebug(): Desactiva modo debug');
}
