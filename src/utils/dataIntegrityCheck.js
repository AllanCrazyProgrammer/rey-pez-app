/**
 * Utilidad para verificar y corregir la integridad de los datos de embarques
 */
import { db } from '@/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Verifica y corrige la integridad de los datos de un embarque
 * @param {String} embarqueId - ID del embarque a verificar (opcional)
 * @returns {Promise<Object>} - Resultado de la verificación
 */
export async function verificarIntegridadEmbarque(embarqueId = null) {
  try {
    console.log('Iniciando verificación de integridad de datos...');
    
    const resultado = {
      embarquesVerificados: 0,
      embarquesCorregidos: 0,
      productosVerificados: 0,
      productosCorregidos: 0,
      errores: []
    };
    
    // Si se proporciona un ID específico, verificar solo ese embarque
    if (embarqueId) {
      await verificarEmbarqueIndividual(embarqueId, resultado);
    } else {
      // Verificar todos los embarques
      const embarquesRef = collection(db, 'embarques');
      const embarquesSnap = await getDocs(embarquesRef);
      
      console.log(`Verificando ${embarquesSnap.size} embarques...`);
      
      for (const embarqueDoc of embarquesSnap.docs) {
        await verificarEmbarqueIndividual(embarqueDoc.id, resultado);
      }
    }
    
    console.log('Verificación completada:', resultado);
    return resultado;
  } catch (error) {
    console.error('Error durante la verificación de integridad:', error);
    return {
      error: error.message,
      embarquesVerificados: 0,
      embarquesCorregidos: 0,
      productosVerificados: 0,
      productosCorregidos: 0,
      errores: [error.message]
    };
  }
}

/**
 * Verifica y corrige un embarque individual
 * @param {String} embarqueId - ID del embarque
 * @param {Object} resultado - Objeto para acumular resultados
 */
async function verificarEmbarqueIndividual(embarqueId, resultado) {
  try {
    const embarqueRef = doc(db, 'embarques', embarqueId);
    const embarqueSnap = await getDoc(embarqueRef);
    
    if (!embarqueSnap.exists()) {
      resultado.errores.push(`El embarque ${embarqueId} no existe`);
      return;
    }
    
    resultado.embarquesVerificados++;
    
    const embarqueData = embarqueSnap.data();
    let requiereActualizacion = false;
    
    // Verificar si existe el array de items
    if (!embarqueData.items) {
      embarqueData.items = [];
      requiereActualizacion = true;
    }
    
    // Verificar que items sea un array
    if (!Array.isArray(embarqueData.items)) {
      embarqueData.items = [];
      requiereActualizacion = true;
    }
    
    // Verificar cada producto
    for (let i = 0; i < embarqueData.items.length; i++) {
      const producto = embarqueData.items[i];
      resultado.productosVerificados++;
      
      // Verificar que el producto tenga un ID
      if (!producto.id) {
        producto.id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        requiereActualizacion = true;
        resultado.productosCorregidos++;
      }
      
      // Verificar que el producto tenga un timestamp
      if (!producto.timestamp) {
        producto.timestamp = new Date().toISOString();
        requiereActualizacion = true;
        resultado.productosCorregidos++;
      }
      
      // Verificar que el producto tenga un campo medida
      if (!producto.medida) {
        // Intentar recuperar de campos alternativos
        producto.medida = producto.media || producto.talla || '';
        requiereActualizacion = true;
        resultado.productosCorregidos++;
      }
      
      // Verificar que el producto tenga un campo tipo
      if (!producto.tipo) {
        producto.tipo = '';
        requiereActualizacion = true;
        resultado.productosCorregidos++;
      }
      
      // Verificar que el producto tenga un campo tarasKilos
      if (!producto.tarasKilos || !Array.isArray(producto.tarasKilos)) {
        // Intentar recuperar de campos antiguos
        producto.tarasKilos = [];
        
        if (producto.tara !== undefined && producto.kilos !== undefined) {
          producto.tarasKilos.push({
            tara: producto.tara,
            kilos: producto.kilos
          });
        }
        
        requiereActualizacion = true;
        resultado.productosCorregidos++;
      }
    }
    
    // Actualizar el embarque si es necesario
    if (requiereActualizacion) {
      await updateDoc(embarqueRef, {
        items: embarqueData.items,
        ultimaActualizacion: new Date().toISOString(),
        ultimoUsuario: 'Sistema (Corrección de integridad)'
      });
      
      resultado.embarquesCorregidos++;
      console.log(`Embarque ${embarqueId} corregido`);
    }
  } catch (error) {
    resultado.errores.push(`Error al verificar embarque ${embarqueId}: ${error.message}`);
    console.error(`Error al verificar embarque ${embarqueId}:`, error);
  }
}

/**
 * Limpia la caché local de embarques
 * @returns {Number} - Número de elementos eliminados
 */
export function limpiarCacheLocal() {
  let eliminados = 0;
  
  try {
    // Buscar todas las claves que empiecen con "embarque_"
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith('embarque_')) {
        localStorage.removeItem(key);
        eliminados++;
      }
    }
    
    console.log(`Se eliminaron ${eliminados} elementos de la caché local`);
  } catch (error) {
    console.error('Error al limpiar caché local:', error);
  }
  
  return eliminados;
}

/**
 * Limpia los cambios pendientes
 * @returns {Number} - Número de elementos eliminados
 */
export function limpiarCambiosPendientes() {
  let eliminados = 0;
  
  try {
    // Buscar todas las claves que empiecen con "cambiosPendientes_"
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith('cambiosPendientes_')) {
        localStorage.removeItem(key);
        eliminados++;
      }
    }
    
    console.log(`Se eliminaron ${eliminados} elementos de cambios pendientes`);
  } catch (error) {
    console.error('Error al limpiar cambios pendientes:', error);
  }
  
  return eliminados;
}

/**
 * Realiza una limpieza completa de la caché local
 * @returns {Object} - Resultado de la limpieza
 */
export function limpiezaCompleta() {
  const resultado = {
    cacheEmbarques: limpiarCacheLocal(),
    cambiosPendientes: limpiarCambiosPendientes()
  };
  
  console.log('Limpieza completa realizada:', resultado);
  return resultado;
} 