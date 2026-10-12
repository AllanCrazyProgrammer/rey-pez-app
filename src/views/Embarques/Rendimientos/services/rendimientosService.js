import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { normalizarNombreProductoPrecio } from '@/utils/preciosHistoricos';
import { escribirCamposEmbarque } from '@/services/embarqueEscritura';
import { CAMPOS_RENDIMIENTOS, fotoCampos } from '@/utils/embarqueRevision';

/**
 * Servicio para manejar operaciones de Firebase relacionadas con rendimientos
 */
export class RendimientosService {
  constructor() {
    this.db = getFirestore();
    this._revBase = 0;
    this._baseCampos = null;
  }

  recordarEmbarque(datos) {
    this._revBase = Number(datos && datos.rev) || 0;
    this._baseCampos = fotoCampos(datos || {}, CAMPOS_RENDIMIENTOS);
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
        const datos = embarqueDoc.data();
        this.recordarEmbarque(datos);
        return datos;
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
        const clave = normalizarNombreProductoPrecio(precio.producto).toLowerCase().trim();
        
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
  async guardarCambios(embarqueId, datos, opciones = {}) {
    try {
      const resultado = await escribirCamposEmbarque(this.db, embarqueId, {
        baseRev: opciones.baseRev != null ? opciones.baseRev : this._revBase,
        baseCampos: opciones.baseCampos !== undefined ? opciones.baseCampos : this._baseCampos,
        campos: datos,
      });
      if (!resultado.omitida) {
        if (!resultado.fusiono) this._revBase = resultado.rev;
        const escritos = resultado.camposEscritos || {};
        if (Object.keys(escritos).length) {
          this._baseCampos = { ...(this._baseCampos || {}), ...escritos };
        }
      }
      return resultado;
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
    return this.guardarCambios(embarqueId, { notaRendimientos: nota });
  }

  /**
   * Guardar configuración de pesos
   * @param {string} embarqueId - ID del embarque
   * @param {number} pesoTaraCosto - Peso de tara para costos
   * @param {number} pesoTaraVenta - Peso de tara para ventas
   */
  async guardarConfiguracionPesos(embarqueId, pesoTaraCosto, pesoTaraVenta) {
    return this.guardarCambios(embarqueId, {
      pesoTaraCosto: Number(pesoTaraCosto),
      pesoTaraVenta: Number(pesoTaraVenta)
    });
  }

  /**
   * Actualizar nombres de medidas personalizados
   * @param {string} embarqueId - ID del embarque
   * @param {Object} nombresMedidas - Nombres personalizados
   */
  async actualizarNombresMedidas(embarqueId, nombresMedidas) {
    return this.guardarCambios(embarqueId, {
      nombresMedidasPersonalizados: nombresMedidas
    });
  }
}
