import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, onSnapshot, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';

/**
 * Servicio para manejar las operaciones relacionadas con embarques
 */
export default {
  /**
   * Crea un nuevo embarque en Firestore
   * @param {Object} embarqueData - Datos del embarque a crear
   * @returns {Promise<string>} - ID del embarque creado
   */
  async crearEmbarque(embarqueData) {
    try {
      const docRef = await addDoc(collection(db, "embarques"), {
        ...embarqueData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error al crear embarque:", error);
      throw error;
    }
  },

  /**
   * Actualiza un embarque existente
   * @param {string} embarqueId - ID del embarque a actualizar
   * @param {Object} embarqueData - Datos actualizados del embarque
   * @returns {Promise<void>}
   */
  async actualizarEmbarque(embarqueId, embarqueData) {
    try {
      const embarqueRef = doc(db, "embarques", embarqueId);
      await updateDoc(embarqueRef, {
        ...embarqueData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error al actualizar embarque:", error);
      throw error;
    }
  },

  /**
   * Obtiene un embarque por su ID
   * @param {string} embarqueId - ID del embarque a obtener
   * @returns {Promise<Object|null>} - Datos del embarque o null si no existe
   */
  async obtenerEmbarque(embarqueId) {
    try {
      const embarqueRef = doc(db, "embarques", embarqueId);
      const embarqueSnap = await getDoc(embarqueRef);
      
      if (embarqueSnap.exists()) {
        return { id: embarqueSnap.id, ...embarqueSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error al obtener embarque:", error);
      throw error;
    }
  },

  /**
   * Configura un listener para cambios en un embarque
   * @param {string} embarqueId - ID del embarque a observar
   * @param {Function} callback - Función a llamar cuando hay cambios
   * @returns {Function} - Función para desuscribirse
   */
  observarEmbarque(embarqueId, callback) {
    const embarqueRef = doc(db, "embarques", embarqueId);
    return onSnapshot(embarqueRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      } else {
        callback(null);
      }
    });
  },

  /**
   * Crea una cuenta a partir de un embarque
   * @param {Object} cuentaData - Datos de la cuenta a crear
   * @returns {Promise<string>} - ID de la cuenta creada
   */
  async crearCuenta(cuentaData) {
    try {
      const docRef = await addDoc(collection(db, "cuentas"), {
        ...cuentaData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error al crear cuenta:", error);
      throw error;
    }
  },

  /**
   * Obtiene el historial de precios para un producto
   * @param {string} clienteId - ID del cliente
   * @param {string} medida - Medida del producto
   * @param {number} limit - Límite de resultados (opcional)
   * @returns {Promise<Array>} - Historial de precios
   */
  async obtenerHistorialPrecios(clienteId, medida, limitResults = 10) {
    try {
      const q = query(
        collection(db, "cuentas"),
        where("clienteId", "==", clienteId),
        where("productos.medida", "array-contains", medida),
        orderBy("createdAt", "desc"),
        limit(limitResults)
      );
      
      const querySnapshot = await getDocs(q);
      const historial = [];
      
      querySnapshot.forEach((doc) => {
        const cuenta = { id: doc.id, ...doc.data() };
        const productos = cuenta.productos || [];
        
        // Filtrar solo los productos con la medida especificada
        const productosFiltrados = productos.filter(p => p.medida === medida);
        
        if (productosFiltrados.length > 0) {
          productosFiltrados.forEach(producto => {
            historial.push({
              fecha: cuenta.createdAt ? cuenta.createdAt.toDate() : new Date(),
              precio: producto.precio,
              cuentaId: doc.id
            });
          });
        }
      });
      
      return historial;
    } catch (error) {
      console.error("Error al obtener historial de precios:", error);
      throw error;
    }
  }
}; 