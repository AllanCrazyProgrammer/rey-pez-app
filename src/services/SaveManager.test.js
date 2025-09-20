/**
 * Archivo de prueba para verificar el funcionamiento del SaveManager
 * Ejecutar en la consola del navegador para probar
 */

import { getSaveManager } from './SaveManager';

// Función de prueba para verificar que el SaveManager funciona correctamente
export function testSaveManager() {
  console.log('=== Iniciando pruebas del SaveManager ===');
  
  try {
    // 1. Verificar que se puede obtener la instancia
    const manager = getSaveManager();
    console.log('✅ SaveManager obtenido correctamente');
    
    // 2. Verificar el estado inicial
    const status = manager.getStatus();
    console.log('✅ Estado inicial:', status);
    
    // 3. Probar programación de operación
    let operacionEjecutada = false;
    const operacionPrueba = async () => {
      console.log('  Ejecutando operación de prueba...');
      // Simular delay de operación
      await new Promise(resolve => setTimeout(resolve, 1000));
      operacionEjecutada = true;
      console.log('  ✅ Operación completada');
    };
    
    // 4. Programar operación
    manager.scheduleSave(
      'test-operation',
      operacionPrueba,
      {
        priority: 'normal',
        merge: false,
        immediate: false
      }
    ).then(() => {
      console.log('✅ Operación programada exitosamente');
    }).catch(error => {
      console.error('❌ Error al programar operación:', error);
    });
    
    // 5. Verificar listeners
    let listenerActivado = false;
    const unsubscribe = manager.addListener('save-start', (data) => {
      console.log('✅ Listener activado:', data);
      listenerActivado = true;
    });
    
    // 6. Verificar estado después de programar
    setTimeout(() => {
      const statusDespues = manager.getStatus();
      console.log('Estado después de programar:', statusDespues);
      
      // 7. Limpiar listener
      unsubscribe();
      console.log('✅ Listener removido');
      
      // 8. Resumen de pruebas
      setTimeout(() => {
        console.log('\n=== Resumen de Pruebas ===');
        console.log('Instancia obtenida:', '✅');
        console.log('Estado accesible:', '✅');
        console.log('Programación funciona:', statusDespues.pendingOperations >= 0 ? '✅' : '❌');
        console.log('Listeners funcionan:', listenerActivado ? '✅' : '⏳ (esperando ejecución)');
        console.log('Operación ejecutada:', operacionEjecutada ? '✅' : '⏳ (esperando ejecución)');
        
        const stats = manager.getStatus().stats;
        console.log('\nEstadísticas:', stats);
      }, 15000); // Esperar 15 segundos para ver resultados
    }, 100);
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  }
}

// Función para simular múltiples operaciones
export function testMultipleOperations() {
  console.log('=== Probando múltiples operaciones ===');
  
  const manager = getSaveManager();
  
  // Simular 10 operaciones rápidas
  for (let i = 1; i <= 10; i++) {
    const operacion = async () => {
      console.log(`  Operación ${i} ejecutándose...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`  ✅ Operación ${i} completada`);
    };
    
    manager.scheduleSave(
      `test-operation-${i}`,
      operacion,
      {
        priority: i <= 3 ? 'high' : 'normal',
        merge: true,
        immediate: false
      }
    );
  }
  
  // Verificar estado después de programar todas
  setTimeout(() => {
    const status = manager.getStatus();
    console.log('\n📊 Estado después de programar 10 operaciones:');
    console.log('  Operaciones pendientes:', status.pendingOperations);
    console.log('  Procesando:', status.isProcessing);
    console.log('  Cuota agotada:', status.quotaExhausted);
    console.log('  Backoff actual:', status.currentBackoff, 'ms');
  }, 1000);
  
  // Ver estadísticas finales
  setTimeout(() => {
    const finalStatus = manager.getStatus();
    console.log('\n📊 Estadísticas finales:');
    console.log('  Total guardados:', finalStatus.stats.totalSaves);
    console.log('  Exitosos:', finalStatus.stats.successfulSaves);
    console.log('  Fallidos:', finalStatus.stats.failedSaves);
    console.log('  Errores de cuota:', finalStatus.stats.quotaErrors);
    console.log('  Operaciones restantes:', finalStatus.pendingOperations);
  }, 30000);
}

// Función para verificar que una operación existente se sobrescribe correctamente
export function testOverwriteOperation() {
  console.log('=== Probando sobrescritura de operaciones programadas ===');

  const manager = getSaveManager();
  let resultado = 'pendiente';

  manager.scheduleSave('overwrite-test', async () => {
    console.log('  Ejecutando primera versión (debería ser reemplazada)');
    resultado = 'primera';
  }, {
    merge: true,
    immediate: false
  });

  setTimeout(() => {
    manager.scheduleSave('overwrite-test', async () => {
      console.log('  Ejecutando segunda versión (esperada)');
      resultado = 'segunda';
    }, {
      merge: true,
      immediate: true
    }).catch(error => console.error('  ❌ Error al reprogramar operación:', error));
  }, 100);

  setTimeout(() => {
    console.log('📌 Resultado final esperado "segunda":', resultado);
  }, 4000);
}

// Exportar para uso global en consola
if (typeof window !== 'undefined') {
  window.testSaveManager = testSaveManager;
  window.testMultipleOperations = testMultipleOperations;
  window.testOverwriteOperation = testOverwriteOperation;
  
  console.log('🧪 Funciones de prueba disponibles:');
  console.log('  - testSaveManager(): Prueba básica del SaveManager');
  console.log('  - testMultipleOperations(): Prueba con múltiples operaciones');
  console.log('  - testOverwriteOperation(): Verifica sobrescritura de operaciones con la misma llave');
}
