/**
 * Utilidades para operaciones con Firestore
 * Implementa patrones para manejo de errores, reintentos, y operaciones seguras
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase';
import Logger from './logger';

// Configuración
const MAX_RETRIES = 3;            // Número máximo de reintentos
const RETRY_DELAY = 1000;         // Retraso entre reintentos (ms)
const TRANSACTION_BATCH_SIZE = 20; // Tamaño máximo de lote para transacciones

/**
 * Obtiene un documento con reintentos automáticos
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object|null>} - Datos del documento o null si no existe
 */
export async function getDocumentWithRetry(collectionName, docId, options = {}) {
  const { retries = MAX_RETRIES, logComponent = 'FirestoreHelper' } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      Logger.debug(logComponent, `Obteniendo documento ${collectionName}/${docId} (intento ${attempt})`);
      
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        Logger.debug(logComponent, `Documento encontrado ${collectionName}/${docId}`, { dataKeys: Object.keys(data) });
        return data;
      } else {
        Logger.warn(logComponent, `Documento no encontrado ${collectionName}/${docId}`);
        return null;
      }
    } catch (error) {
      Logger.error(logComponent, `Error obteniendo documento ${collectionName}/${docId} (intento ${attempt})`, { error: error.message, stack: error.stack });
      
      if (attempt === retries) {
        throw error;
      }
      
      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

/**
 * Actualiza un documento con reintentos automáticos
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {Object} data - Datos a actualizar
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<boolean>} - true si la operación fue exitosa
 */
export async function updateDocumentWithRetry(collectionName, docId, data, options = {}) {
  const { 
    retries = MAX_RETRIES, 
    merge = true, 
    addTimestamp = true,
    logComponent = 'FirestoreHelper' 
  } = options;
  
  // Agregar timestamp si se solicita
  const dataToUpdate = { ...data };
  if (addTimestamp) {
    dataToUpdate.ultimaActualizacion = serverTimestamp();
  }
  
  // Eliminar campos undefined o null si merge es falso
  if (!merge) {
    Object.keys(dataToUpdate).forEach(key => {
      if (dataToUpdate[key] === undefined || dataToUpdate[key] === null) {
        delete dataToUpdate[key];
      }
    });
  }
  
  Logger.debug(logComponent, `Actualizando documento ${collectionName}/${docId}`, { 
    dataKeys: Object.keys(dataToUpdate),
    merge
  });
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const docRef = doc(db, collectionName, docId);
      
      if (merge) {
        await updateDoc(docRef, dataToUpdate);
      } else {
        await setDoc(docRef, dataToUpdate);
      }
      
      Logger.info(logComponent, `Documento actualizado ${collectionName}/${docId}`);
      return true;
    } catch (error) {
      Logger.error(logComponent, `Error actualizando documento ${collectionName}/${docId} (intento ${attempt})`, { 
        error: error.message, 
        stack: error.stack,
        dataKeys: Object.keys(dataToUpdate)
      });
      
      if (attempt === retries) {
        throw error;
      }
      
      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt)); // Retraso exponencial
    }
  }
  
  return false;
}

/**
 * Crea un documento con ID específico o generado automáticamente
 * @param {string} collectionName - Nombre de la colección
 * @param {Object} data - Datos del documento
 * @param {string} [docId] - ID opcional del documento
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<string>} - ID del documento creado
 */
export async function createDocument(collectionName, data, docId = null, options = {}) {
  const { 
    addTimestamp = true,
    logComponent = 'FirestoreHelper' 
  } = options;
  
  // Preparar datos
  const documentData = { ...data };
  if (addTimestamp) {
    documentData.creado = serverTimestamp();
    documentData.ultimaActualizacion = serverTimestamp();
  }
  
  try {
    let docRef;
    
    if (docId) {
      // Usar ID específico
      docRef = doc(db, collectionName, docId);
      await setDoc(docRef, documentData);
      Logger.info(logComponent, `Documento creado con ID específico ${collectionName}/${docId}`);
    } else {
      // Generar ID automáticamente
      const collectionRef = collection(db, collectionName);
      docRef = doc(collectionRef);
      await setDoc(docRef, documentData);
      Logger.info(logComponent, `Documento creado con ID generado ${collectionName}/${docRef.id}`);
    }
    
    return docRef.id;
  } catch (error) {
    Logger.error(logComponent, `Error creando documento en ${collectionName}`, { 
      error: error.message, 
      stack: error.stack,
      docId,
      dataKeys: Object.keys(documentData)
    });
    throw error;
  }
}

/**
 * Elimina un documento con validación y manejo de errores
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<boolean>} - true si la operación fue exitosa
 */
export async function deleteDocumentSafely(collectionName, docId, options = {}) {
  const { 
    validateExists = true,
    logComponent = 'FirestoreHelper' 
  } = options;
  
  try {
    const docRef = doc(db, collectionName, docId);
    
    // Verificar existencia del documento si se solicita
    if (validateExists) {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        Logger.warn(logComponent, `No se puede eliminar: documento no encontrado ${collectionName}/${docId}`);
        return false;
      }
    }
    
    await deleteDoc(docRef);
    Logger.info(logComponent, `Documento eliminado ${collectionName}/${docId}`);
    return true;
  } catch (error) {
    Logger.error(logComponent, `Error eliminando documento ${collectionName}/${docId}`, { 
      error: error.message, 
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Configura una observación robusta de un documento
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {Function} callback - Función a llamar con los datos
 * @param {Object} options - Opciones adicionales
 * @returns {Function} - Función para cancelar la observación
 */
export function observeDocumentWithErrorHandling(collectionName, docId, callback, options = {}) {
  const { 
    logComponent = 'FirestoreHelper',
    includeMetadata = false
  } = options;
  
  Logger.debug(logComponent, `Iniciando observación del documento ${collectionName}/${docId}`);
  
  // Referencia al documento
  const docRef = doc(db, collectionName, docId);
  
  // Configurar opciones
  const snapshotOptions = includeMetadata ? { includeMetadataChanges: true } : {};
  
  // Iniciar observación
  const unsubscribe = onSnapshot(
    docRef, 
    snapshotOptions,
    (docSnapshot) => {
      try {
        if (docSnapshot.exists()) {
          const data = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          };
          
          // Información de metadatos si está habilitado
          if (includeMetadata) {
            const metadata = {
              fromCache: docSnapshot.metadata.fromCache,
              hasPendingWrites: docSnapshot.metadata.hasPendingWrites
            };
            
            Logger.debug(logComponent, `Actualización de documento ${collectionName}/${docId}`, {
              metadata,
              dataKeys: Object.keys(data)
            });
            
            // Incluir metadatos en la respuesta
            callback(data, metadata);
          } else {
            Logger.debug(logComponent, `Actualización de documento ${collectionName}/${docId}`, {
              dataKeys: Object.keys(data)
            });
            
            callback(data);
          }
        } else {
          Logger.warn(logComponent, `Documento observado no existe ${collectionName}/${docId}`);
          callback(null);
        }
      } catch (error) {
        Logger.error(logComponent, `Error procesando actualización ${collectionName}/${docId}`, {
          error: error.message,
          stack: error.stack
        });
        
        // No propagar el error para mantener la observación activa
        callback(null, { error: error.message });
      }
    },
    (error) => {
      Logger.error(logComponent, `Error en observación de documento ${collectionName}/${docId}`, {
        error: error.message,
        stack: error.stack
      });
      
      // Notificar error al callback
      callback(null, { error: error.message });
    }
  );
  
  // Devolver función para cancelar observación
  return unsubscribe;
}

/**
 * Actualiza múltiples documentos en una transacción por lotes
 * @param {Array<Object>} operations - Operaciones a realizar
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Resultados de las operaciones
 */
export async function batchUpdateDocuments(operations, options = {}) {
  const { 
    logComponent = 'FirestoreHelper',
    addTimestamp = true
  } = options;
  
  if (!operations || operations.length === 0) {
    Logger.warn(logComponent, 'No hay operaciones para procesar en el lote');
    return { success: true, processed: 0, failed: 0 };
  }
  
  Logger.info(logComponent, `Iniciando actualización por lotes: ${operations.length} operaciones`);
  
  // Resultados
  const results = {
    success: true,
    processed: 0,
    failed: 0,
    errors: []
  };
  
  // Procesar en lotes para evitar límites de Firestore
  for (let i = 0; i < operations.length; i += TRANSACTION_BATCH_SIZE) {
    const batch = writeBatch(db);
    const currentBatch = operations.slice(i, i + TRANSACTION_BATCH_SIZE);
    
    Logger.debug(logComponent, `Procesando lote ${i/TRANSACTION_BATCH_SIZE + 1}/${Math.ceil(operations.length/TRANSACTION_BATCH_SIZE)}`);
    
    try {
      // Añadir operaciones al lote
      currentBatch.forEach(op => {
        const { collection: collectionName, id: docId, data, type = 'update' } = op;
        
        // Preparar datos
        const documentData = { ...data };
        if (addTimestamp) {
          documentData.ultimaActualizacion = serverTimestamp();
        }
        
        // Obtener referencia al documento
        const docRef = doc(db, collectionName, docId);
        
        // Agregar operación según tipo
        switch (type.toLowerCase()) {
          case 'set':
            batch.set(docRef, documentData);
            break;
          case 'update':
            batch.update(docRef, documentData);
            break;
          case 'delete':
            batch.delete(docRef);
            break;
          default:
            Logger.warn(logComponent, `Tipo de operación desconocido: ${type}`, { op });
            results.failed++;
            results.errors.push(`Tipo de operación desconocido: ${type} para ${collectionName}/${docId}`);
            return; // Continuar con siguiente operación
        }
      });
      
      // Ejecutar lote
      await batch.commit();
      results.processed += currentBatch.length;
      
      Logger.info(logComponent, `Lote ${i/TRANSACTION_BATCH_SIZE + 1} completado: ${currentBatch.length} operaciones`);
    } catch (error) {
      Logger.error(logComponent, `Error procesando lote ${i/TRANSACTION_BATCH_SIZE + 1}`, {
        error: error.message,
        stack: error.stack,
        batchSize: currentBatch.length
      });
      
      results.success = false;
      results.failed += currentBatch.length;
      results.errors.push(error.message);
    }
  }
  
  // Resumen final
  Logger.info(logComponent, `Actualización por lotes completada`, {
    success: results.success,
    processed: results.processed,
    failed: results.failed,
    errorsCount: results.errors.length
  });
  
  return results;
}

export default {
  getDocumentWithRetry,
  updateDocumentWithRetry,
  createDocument,
  deleteDocumentSafely,
  observeDocumentWithErrorHandling,
  batchUpdateDocuments,
}; 