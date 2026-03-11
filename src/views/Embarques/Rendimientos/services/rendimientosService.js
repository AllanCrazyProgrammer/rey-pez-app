import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';

/**
 * Servicio para manejar operaciones de Firebase relacionadas con rendimientos
 */
export class RendimientosService {
  constructor() {
    this.db = getFirestore();
  }

  /**
   * Cargar datos del embarque
   * @param {string} embarqueId - ID del embarque
   * @returns {Object|null} Datos del embarque
   */
  async cargarEmbarque(embarqueId) {
    try {
      const embarqueRef = doc(this.db, 'embarques', embarqueId);
      const embarqueDoc = await getDoc(embarqueRef);
      
      if (embarqueDoc.exists()) {
        return embarqueDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error al cargar el embarque:', error);
      throw error;
    }
  }

  /**
   * Cargar precios de venta
   * @returns {Object} Precios organizados por producto
   */
  async cargarPreciosVenta() {
    try {
      const preciosRef = collection(this.db, 'precios');
      const q = query(preciosRef, orderBy('fecha', 'desc'));
      const preciosSnapshot = await getDocs(q);
      
      const preciosMap = new Map();
      
      preciosSnapshot.docs.forEach(docSnapshot => {
        const precio = { id: docSnapshot.id, ...docSnapshot.data() };
        const clave = precio.producto.toLowerCase().trim();
        
        if (!preciosMap.has(clave)) {
          preciosMap.set(clave, []);
        }
        preciosMap.get(clave).push(precio);
      });
      
      const preciosOrganizados = {};
      preciosMap.forEach((precios, producto) => {
        const preciosOrdenados = precios.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        preciosOrganizados[producto] = preciosOrdenados;
      });
      
      return preciosOrganizados;
    } catch (error) {
      console.error('Error al cargar precios de venta:', error);
      throw error;
    }
  }

  /**
   * Cargar historial de costos
   * @returns {Array} Historial de costos ordenado
   */
  async cargarHistorialCostos() {
    try {
      const historialRef = collection(this.db, 'historial_costos');
      const historialSnapshot = await getDocs(historialRef);
      
      const historialCompleto = [];
      historialSnapshot.forEach(doc => {
        const data = doc.data();
        historialCompleto.push({
          ...data,
          id: doc.id
        });
      });
      
      return historialCompleto.sort((a, b) => {
        const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return timestampB - timestampA;
      });
    } catch (error) {
      console.error('Error al cargar historial de costos:', error);
      throw error;
    }
  }

  /**
   * Guardar cambios en el embarque
   * @param {string} embarqueId - ID del embarque
   * @param {Object} datos - Datos a guardar
   */
  async guardarCambios(embarqueId, datos) {
    try {
      const embarqueRef = doc(this.db, 'embarques', embarqueId);
      await updateDoc(embarqueRef, datos);
    } catch (error) {
      console.error('Error al guardar cambios:', error);
      throw error;
    }
  }

  /**
   * Guardar nota de rendimientos
   * @param {string} embarqueId - ID del embarque
   * @param {string} nota - Nota a guardar
   */
  async guardarNota(embarqueId, nota) {
    try {
      const embarqueRef = doc(this.db, 'embarques', embarqueId);
      await updateDoc(embarqueRef, {
        notaRendimientos: nota
      });
    } catch (error) {
      console.error('Error al guardar la nota:', error);
      throw error;
    }
  }

  /**
   * Guardar configuración de pesos
   * @param {string} embarqueId - ID del embarque
   * @param {number} pesoTaraCosto - Peso de tara para costos
   * @param {number} pesoTaraVenta - Peso de tara para ventas
   */
  async guardarConfiguracionPesos(embarqueId, pesoTaraCosto, pesoTaraVenta) {
    try {
      const embarqueRef = doc(this.db, 'embarques', embarqueId);
      await updateDoc(embarqueRef, {
        pesoTaraCosto: Number(pesoTaraCosto),
        pesoTaraVenta: Number(pesoTaraVenta)
      });
    } catch (error) {
      console.error('Error al guardar configuración de pesos:', error);
      throw error;
    }
  }

  /**
   * Actualizar nombres de medidas personalizados
   * @param {string} embarqueId - ID del embarque
   * @param {Object} nombresMedidas - Nombres personalizados
   */
  async actualizarNombresMedidas(embarqueId, nombresMedidas) {
    try {
      const embarqueRef = doc(this.db, 'embarques', embarqueId);
      await updateDoc(embarqueRef, {
        nombresMedidasPersonalizados: nombresMedidas
      });
    } catch (error) {
      console.error('Error al actualizar nombres de medidas:', error);
      throw error;
    }
  }
}