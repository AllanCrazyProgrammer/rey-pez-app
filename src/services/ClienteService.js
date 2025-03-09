import { collection, addDoc, doc, getDoc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

/**
 * Servicio para manejar las operaciones relacionadas con clientes
 */
export default {
  /**
   * Obtiene la lista de clientes predefinidos
   * @returns {Promise<Array>} - Lista de clientes predefinidos
   */
  async obtenerClientesPredefinidos() {
    try {
      const clientesRef = collection(db, "clientes");
      const querySnapshot = await getDocs(clientesRef);
      
      const clientes = [];
      querySnapshot.forEach((doc) => {
        clientes.push({ id: doc.id, ...doc.data() });
      });
      
      return clientes;
    } catch (error) {
      console.error("Error al obtener clientes predefinidos:", error);
      throw error;
    }
  },
  
  /**
   * Crea un nuevo cliente
   * @param {Object} clienteData - Datos del cliente a crear
   * @returns {Promise<string>} - ID del cliente creado
   */
  async crearCliente(clienteData) {
    try {
      const docRef = await addDoc(collection(db, "clientes"), {
        ...clienteData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error al crear cliente:", error);
      throw error;
    }
  },
  
  /**
   * Obtiene un cliente por su ID
   * @param {string} clienteId - ID del cliente a obtener
   * @returns {Promise<Object|null>} - Datos del cliente o null si no existe
   */
  async obtenerCliente(clienteId) {
    try {
      const clienteRef = doc(db, "clientes", clienteId);
      const clienteSnap = await getDoc(clienteRef);
      
      if (clienteSnap.exists()) {
        return { id: clienteSnap.id, ...clienteSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error al obtener cliente:", error);
      throw error;
    }
  },
  
  /**
   * Actualiza un cliente existente
   * @param {string} clienteId - ID del cliente a actualizar
   * @param {Object} clienteData - Datos actualizados del cliente
   * @returns {Promise<void>}
   */
  async actualizarCliente(clienteId, clienteData) {
    try {
      const clienteRef = doc(db, "clientes", clienteId);
      await updateDoc(clienteRef, {
        ...clienteData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
      throw error;
    }
  },
  
  /**
   * Busca clientes por nombre
   * @param {string} nombre - Nombre o parte del nombre a buscar
   * @returns {Promise<Array>} - Lista de clientes que coinciden con la búsqueda
   */
  async buscarClientesPorNombre(nombre) {
    try {
      // Firestore no soporta búsquedas parciales directamente, así que obtenemos todos y filtramos
      const clientesRef = collection(db, "clientes");
      const querySnapshot = await getDocs(clientesRef);
      
      const clientes = [];
      const nombreLowerCase = nombre.toLowerCase();
      
      querySnapshot.forEach((doc) => {
        const cliente = { id: doc.id, ...doc.data() };
        if (cliente.nombre && cliente.nombre.toLowerCase().includes(nombreLowerCase)) {
          clientes.push(cliente);
        }
      });
      
      return clientes;
    } catch (error) {
      console.error("Error al buscar clientes por nombre:", error);
      throw error;
    }
  },
  
  /**
   * Genera un color basado en el nombre del cliente
   * @param {string} nombre - Nombre del cliente
   * @returns {string} - Color en formato hexadecimal
   */
  generarColorCliente(nombre) {
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  },
  
  /**
   * Determina si el texto debe ser claro u oscuro según el color de fondo
   * @param {string} color - Color de fondo en formato hexadecimal
   * @returns {string} - Color del texto (#000000 o #FFFFFF)
   */
  determinarColorTexto(color) {
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);
    
    // Fórmula para determinar la luminosidad
    const luminosidad = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminosidad > 0.5 ? '#000000' : '#FFFFFF';
  }
}; 