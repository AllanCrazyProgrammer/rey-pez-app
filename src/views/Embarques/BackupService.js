// Servicio de respaldo de emergencia para embarques
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, getDocs } from 'firebase/firestore';

class BackupService {
  constructor() {
    this.db = getFirestore();
  }

  /**
   * Crear respaldo de emergencia antes de eliminar un embarque
   */
  async crearRespaldoEmergencia(embarqueId, razon = 'eliminacion_automatica') {
    try {
      console.log(`[BACKUP] Creando respaldo de emergencia para embarque ${embarqueId}`);
      
      // Obtener el embarque completo
      const embarqueRef = doc(this.db, 'embarques', embarqueId);
      const embarqueSnapshot = await getDoc(embarqueRef);
      
      if (!embarqueSnapshot.exists()) {
        console.warn(`[BACKUP] El embarque ${embarqueId} no existe, no se puede respaldar`);
        return null;
      }
      
      const embarqueData = embarqueSnapshot.data();
      
      // Crear el respaldo con metadatos
      const respaldoData = {
        embarqueOriginalId: embarqueId,
        datosOriginales: embarqueData,
        fechaRespaldo: serverTimestamp(),
        razonRespaldo: razon,
        tipoRespaldo: 'emergencia',
        version: '1.0',
        // Información adicional para facilitar la recuperación
        fechaEmbarqueOriginal: embarqueData.fecha,
        cargaConOriginal: embarqueData.cargaCon,
        cantidadClientes: embarqueData.clientes ? embarqueData.clientes.length : 0,
        totalProductos: this.contarProductosTotal(embarqueData),
        kilosLimpiosAprox: this.calcularKilosLimpiosAprox(embarqueData),
        kilosCrudosAprox: this.calcularKilosCrudosAprox(embarqueData)
      };
      
      // Guardar en colección de respaldos de emergencia
      const respaldoRef = await addDoc(collection(this.db, 'respaldos_emergencia'), respaldoData);
      
      console.log(`[BACKUP] Respaldo creado exitosamente con ID: ${respaldoRef.id}`);
      
      return respaldoRef.id;
      
    } catch (error) {
      console.error('[BACKUP] Error al crear respaldo de emergencia:', error);
      throw error;
    }
  }

  /**
   * Recuperar embarque desde respaldo
   */
  async recuperarDesdeRespaldo(respaldoId) {
    try {
      console.log(`[BACKUP] Recuperando embarque desde respaldo ${respaldoId}`);
      
      const respaldoRef = doc(this.db, 'respaldos_emergencia', respaldoId);
      const respaldoSnapshot = await getDoc(respaldoRef);
      
      if (!respaldoSnapshot.exists()) {
        throw new Error(`El respaldo ${respaldoId} no existe`);
      }
      
      const respaldoData = respaldoSnapshot.data();
      
      // Restaurar el embarque original
      const embarqueRestaurado = {
        ...respaldoData.datosOriginales,
        // Agregar metadatos de recuperación
        recuperadoDesdeRespaldo: true,
        respaldoOrigenId: respaldoId,
        fechaRecuperacion: serverTimestamp()
      };
      
      // Crear nuevo embarque con los datos recuperados
      const nuevoEmbarqueRef = await addDoc(collection(this.db, 'embarques'), embarqueRestaurado);
      
      console.log(`[BACKUP] Embarque recuperado exitosamente con nuevo ID: ${nuevoEmbarqueRef.id}`);
      
      return nuevoEmbarqueRef.id;
      
    } catch (error) {
      console.error('[BACKUP] Error al recuperar desde respaldo:', error);
      throw error;
    }
  }

  /**
   * Buscar respaldos por fecha
   */
  async buscarRespaldosPorFecha(fecha) {
    try {
      const fechaObj = new Date(fecha);
      const fechaISO = fechaObj.toISOString().split('T')[0];
      
      const respaldosRef = collection(this.db, 'respaldos_emergencia');
      const snapshot = await getDocs(respaldosRef);
      
      const respaldosEncontrados = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Verificar fecha del embarque original
        let fechaEmbarque;
        if (data.fechaEmbarqueOriginal && typeof data.fechaEmbarqueOriginal.toDate === 'function') {
          fechaEmbarque = data.fechaEmbarqueOriginal.toDate();
        } else if (data.fechaEmbarqueOriginal instanceof Date) {
          fechaEmbarque = data.fechaEmbarqueOriginal;
        } else if (typeof data.fechaEmbarqueOriginal === 'string') {
          fechaEmbarque = new Date(data.fechaEmbarqueOriginal);
        } else {
          return;
        }
        
        const fechaEmbarqueISO = fechaEmbarque.toISOString().split('T')[0];
        
        if (fechaEmbarqueISO === fechaISO) {
          respaldosEncontrados.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      return respaldosEncontrados;
      
    } catch (error) {
      console.error('[BACKUP] Error al buscar respaldos por fecha:', error);
      throw error;
    }
  }

  // Métodos auxiliares para calcular estadísticas
  contarProductosTotal(embarqueData) {
    if (!embarqueData.clientes) return 0;
    
    return embarqueData.clientes.reduce((total, cliente) => {
      return total + (cliente.productos ? cliente.productos.length : 0);
    }, 0);
  }

  calcularKilosLimpiosAprox(embarqueData) {
    if (!embarqueData.clientes) return 0;
    
    let total = 0;
    embarqueData.clientes.forEach(cliente => {
      if (!cliente.productos) return;
      
      cliente.productos.forEach(producto => {
        if (producto.tipo === 'c/h20') {
          const reporteTaras = producto.reporteTaras || [];
          const reporteBolsas = producto.reporteBolsas || [];
          let sumaTotalBolsas = 0;

          for (let i = 0; i < reporteTaras.length; i++) {
            const taras = parseInt(reporteTaras[i]) || 0;
            const bolsa = parseInt(reporteBolsas[i]) || 0;
            sumaTotalBolsas += taras * bolsa;
          }
          total += sumaTotalBolsas * 0.45;
        }
      });
    });
    
    return total.toFixed(1);
  }

  calcularKilosCrudosAprox(embarqueData) {
    if (!embarqueData.clientes) return 0;
    
    let total = 0;
    embarqueData.clientes.forEach(cliente => {
      if (cliente.crudos && Array.isArray(cliente.crudos)) {
        cliente.crudos.forEach(crudo => {
          total += parseFloat(crudo.kilos) || 0;
        });
      }
    });
    
    return total.toFixed(1);
  }
}

export default new BackupService(); 