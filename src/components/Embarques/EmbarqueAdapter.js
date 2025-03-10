// Adaptador para compatibilizar datos antiguos de embarques con el nuevo formato
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

/**
 * Mapeo de IDs numéricos a nombres de clientes
 */
const clienteIdToName = {
  '0': 'Catarro',
  '1': 'Joselito',
  '2': 'Otilio',
  '3': 'Ozuna',
  0: 'Catarro',
  1: 'Joselito',
  2: 'Otilio',
  3: 'Ozuna'
};

/**
 * Normaliza el nombre del cliente, convirtiendo IDs numéricos a nombres
 * @param {String|Number} clienteId - ID o nombre del cliente
 * @returns {String} - Nombre normalizado del cliente
 */
const normalizarNombreCliente = (clienteId) => {
  if (clienteId === null || clienteId === undefined) return '';
  
  // Si el clienteId es un número o string que parece un número, buscar en el mapeo
  if (clienteIdToName[clienteId]) {
    return clienteIdToName[clienteId];
  }
  
  // Si es un string, usar directamente
  return String(clienteId);
};

/**
 * Adapta el formato de la estructura antigua de embarques a la nueva
 * @param {Object} oldEmbarque - Datos del embarque en formato antiguo
 * @returns {Object} - Datos adaptados al formato nuevo
 */
export const adaptarEmbarqueAntiguo = (oldEmbarque) => {
  // Crear una copia del embarque para no modificar el original
  const embarqueAdaptado = { ...oldEmbarque };
  
  // Si el embarque no tiene la estructura esperada, adaptarla
  if (!embarqueAdaptado.items || !Array.isArray(embarqueAdaptado.items)) {
    embarqueAdaptado.items = [];
    
    // Si el embarque tiene la estructura antigua con clientes
    if (oldEmbarque.clientes && Array.isArray(oldEmbarque.clientes)) {
      // Procesar cada cliente
      oldEmbarque.clientes.forEach(cliente => {
        // Obtener el nombre normalizado del cliente
        const nombreClienteNormalizado = normalizarNombreCliente(cliente.nombre || cliente.id);
        
        // Procesar productos normales
        if (cliente.productos && Array.isArray(cliente.productos)) {
          cliente.productos.forEach(producto => {
            // Adaptación para productos normales
            const itemAdaptado = adaptarProducto(producto, nombreClienteNormalizado);
            if (itemAdaptado) {
              embarqueAdaptado.items.push(itemAdaptado);
            }
          });
        }
        
        // Procesar productos crudos
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                const itemCrudoAdaptado = adaptarProductoCrudo(item, nombreClienteNormalizado, crudo);
                if (itemCrudoAdaptado) {
                  embarqueAdaptado.items.push(itemCrudoAdaptado);
                }
              });
            }
          });
        }
      });
    }
  } else {
    // Si ya tiene items, normalizar los nombres de clientes en los items existentes
    embarqueAdaptado.items = embarqueAdaptado.items.map(item => ({
      ...item,
      cliente: normalizarNombreCliente(item.cliente)
    }));
  }
  
  // Asegurarse de que exista la propiedad clienteActivo
  if (!embarqueAdaptado.clienteActivo) {
    // Asignar el primer cliente, si existe
    if (oldEmbarque.clientes && oldEmbarque.clientes.length > 0) {
      const primerClienteNombre = normalizarNombreCliente(oldEmbarque.clientes[0].nombre || oldEmbarque.clientes[0].id);
      embarqueAdaptado.clienteActivo = primerClienteNombre;
    } else {
      embarqueAdaptado.clienteActivo = '';
    }
  } else {
    // Normalizar el cliente activo actual
    embarqueAdaptado.clienteActivo = normalizarNombreCliente(embarqueAdaptado.clienteActivo);
  }
  
  // Asegurarse de que exista la propiedad cargaCon
  if (!embarqueAdaptado.cargaCon && oldEmbarque.cargaInfo) {
    embarqueAdaptado.cargaCon = oldEmbarque.cargaInfo;
  } else if (!embarqueAdaptado.cargaCon) {
    embarqueAdaptado.cargaCon = '';
  }
  
  // Actualizar las propiedades de bloqueo
  embarqueAdaptado.bloqueado = oldEmbarque.embarqueBloqueado || oldEmbarque.bloqueado || false;
  
  return embarqueAdaptado;
};

/**
 * Adapta un producto normal al nuevo formato
 * @param {Object} producto - Producto en formato antiguo
 * @param {String} nombreCliente - Nombre del cliente
 * @returns {Object} - Producto adaptado
 */
const adaptarProducto = (producto, nombreCliente) => {
  // Si no se puede adaptar, retornar null
  if (!producto) return null;
  
  // Normalizar el nombre del cliente
  const clienteNormalizado = normalizarNombreCliente(nombreCliente);
  
  // Convertir tipo a formato esperado (mayúsculas y espacios)
  let tipo = producto.tipo || '';
  if (typeof tipo === 'string') {
    tipo = tipo.toUpperCase();
    if (tipo === 'C/H20' || tipo === 'CH20' || tipo === 'C/H2O') {
      tipo = 'C/H20';
    } else if (tipo === 'S/H20' || tipo === 'SH20' || tipo === 'S/H2O') {
      tipo = 'S/H20';
    }
  }
  
  // Obtener la medida del producto (para compatibilidad usar talla, media o medida)
  const medidaValue = producto.medida || producto.media || producto.talla || '';
  
  console.log('EmbarqueAdapter - Adaptando producto:', {
    productoOriginal: producto,
    medidaOriginal: producto.medida,
    mediaOriginal: producto.media,
    tallaOriginal: producto.talla,
    medidaFinal: medidaValue
  });
  
  // Crear estructura de tarasKilos a partir de los datos antiguos
  let tarasKilos = [];
  
  // Si hay taras y kilos en el formato antiguo
  if (producto.taras && producto.kilos) {
    // Si son arrays, combinarlos
    if (Array.isArray(producto.taras) && Array.isArray(producto.kilos)) {
      const maxLength = Math.max(producto.taras.length, producto.kilos.length);
      for (let i = 0; i < maxLength; i++) {
        tarasKilos.push({
          tara: i < producto.taras.length ? Number(producto.taras[i]) || 0 : 0,
          kilos: i < producto.kilos.length ? Number(producto.kilos[i]) || 0 : 0
        });
      }
    } 
    // Si no son arrays, crear un solo elemento
    else {
      tarasKilos.push({
        tara: Number(producto.taras) || 0,
        kilos: Number(producto.kilos) || 0
      });
    }
  }
  // Si hay reporteTaras y reporteBolsas
  else if (producto.reporteTaras && producto.reporteBolsas) {
    if (Array.isArray(producto.reporteTaras) && Array.isArray(producto.reporteBolsas)) {
      const maxLength = Math.max(producto.reporteTaras.length, producto.reporteBolsas.length);
      for (let i = 0; i < maxLength; i++) {
        tarasKilos.push({
          tara: i < producto.reporteTaras.length ? Number(producto.reporteTaras[i]) || 0 : 0,
          kilos: i < producto.reporteBolsas.length ? Number(producto.reporteBolsas[i]) || 0 : 0
        });
      }
    }
  }
  
  // Si no se pudo crear tarasKilos, crear uno vacío
  if (tarasKilos.length === 0) {
    tarasKilos.push({ tara: 0, kilos: 0 });
  }
  
  // Calcular kilos totales
  const kilosTotales = calculateTotalKilos(tarasKilos, producto.restarTaras || true, tipo === 'C/H20' ? (producto.camaronNeto || 0.65) : null);
  
  // Asegurarse de que haya un precio
  const precio = Number(producto.precio) || 0;
  
  // Calcular el total (si no existe)
  const total = Number(producto.total) || (precio * kilosTotales);
  
  return {
    cliente: clienteNormalizado,
    tipo: tipo,
    talla: medidaValue,
    media: medidaValue,
    medida: medidaValue,
    tarasKilos: tarasKilos,
    restarTresPorTara: producto.restarTaras !== undefined ? producto.restarTaras : true,
    kilosTotales: kilosTotales,
    precio: precio,
    total: total,
    camaronNeto: tipo === 'C/H20' ? (producto.camaronNeto || 0.65) : null,
    fecha: producto.fecha || new Date().toISOString().split('T')[0],
    timestamp: producto.timestamp || new Date().toISOString(),
    id: producto.id || Date.now().toString()
  };
};

/**
 * Adapta un producto crudo al nuevo formato
 * @param {Object} item - Item del crudo en formato antiguo
 * @param {String} nombreCliente - Nombre del cliente
 * @param {Object} crudo - Información del crudo
 * @returns {Object} - Producto crudo adaptado
 */
const adaptarProductoCrudo = (item, nombreCliente, crudo) => {
  if (!item) return null;
  
  // Normalizar el nombre del cliente
  const clienteNormalizado = normalizarNombreCliente(nombreCliente);
  
  let tara = 0;
  let kilos = 0;
  let tarasOriginal = ''; // Conservar el formato original de taras
  
  // Extraer tara y kilos del formato "cantidad-medida"
  if (item.taras) {
    tarasOriginal = item.taras; // Guardar el formato original
    const [cantidad, medida] = item.taras.split('-').map(num => parseInt(num) || 0);
    tara = cantidad;
    kilos = cantidad * (medida === 19 ? 20 : medida); // Ajuste según la lógica existente
  }
  
  // Si hay sobrante, agregarlo
  let mostrarSobrante = false;
  let sobrante = null;
  let sobranteOriginal = ''; // Conservar el formato original de sobrante
  
  if (item.sobrante) {
    sobranteOriginal = item.sobrante; // Guardar el formato original
    mostrarSobrante = true;
    const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(num => parseInt(num) || 0);
    sobrante = cantidadSobrante;
    kilos += cantidadSobrante * (medidaSobrante === 19 ? 20 : medidaSobrante);
  }
  
  // Obtener la talla del crudo
  let talla = '';
  if (crudo.medida) {
    talla = `Med ${crudo.medida}`;
  } else if (item.medida) {
    talla = `Med ${item.medida}`;
  }
  
  // Asegurarse de que haya un precio
  const precio = Number(item.precio || crudo.precio) || 0;
  
  // Calcular el total
  const total = kilos * precio;
  
  return {
    cliente: clienteNormalizado,
    tipo: 'crudo',
    talla: talla,
    barco: item.barco || crudo.barco || 'Med',
    medida: item.medida || crudo.medida || 'c/c',
    taras: tarasOriginal, // Usar el formato original "cantidad-medida"
    tarasKilos: [{
      tara: tara,
      kilos: kilos
    }],
    mostrarSobrante: mostrarSobrante,
    sobrante: sobranteOriginal, // Usar el formato original "cantidad-medida"
    kilosTotales: kilos,
    precio: precio,
    total: total,
    fecha: crudo.fecha || new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    id: item.id || Date.now().toString()
  };
};

/**
 * Calcula el total de kilos considerando descuento de taras si aplica
 */
const calculateTotalKilos = (tarasKilos, restarTaras, camaronNeto) => {
  let total = tarasKilos.reduce((sum, item) => sum + (Number(item.kilos) || 0), 0);
  
  if (restarTaras) {
    const totalTaras = tarasKilos.reduce((sum, item) => sum + (Number(item.tara) || 0), 0);
    const descuento = totalTaras * 3;
    total = Math.max(0, total - descuento);
  }
  
  // Aplicar factor de camarón neto si es C/H20
  if (camaronNeto) {
    total = total * camaronNeto;
  }
  
  return parseFloat(total.toFixed(2));
};

/**
 * Busca todos los embarques y los adapta al nuevo formato
 * @param {Boolean} actualizarDB - Si es true, actualiza los documentos en Firestore
 * @returns {Array} - Lista de embarques adaptados
 */
export const adaptarTodosLosEmbarques = async (actualizarDB = false) => {
  try {
    const embarquesRef = collection(db, 'embarques');
    const snapshot = await getDocs(embarquesRef);
    
    const embarquesAdaptados = [];
    
    for (const doc of snapshot.docs) {
      const embarque = doc.data();
      embarque.id = doc.id;
      
      const embarqueAdaptado = adaptarEmbarqueAntiguo(embarque);
      embarquesAdaptados.push(embarqueAdaptado);
      
      // Si se solicita actualizar la base de datos
      if (actualizarDB) {
        await updateDoc(doc.ref, {
          items: embarqueAdaptado.items,
          clienteActivo: embarqueAdaptado.clienteActivo,
          cargaCon: embarqueAdaptado.cargaCon,
          bloqueado: embarqueAdaptado.bloqueado
        });
        console.log(`Actualizado embarque ID: ${doc.id}`);
      }
    }
    
    return embarquesAdaptados;
  } catch (error) {
    console.error('Error al adaptar embarques:', error);
    return [];
  }
};

/**
 * Carga y adapta un embarque desde Firestore
 * @param {String} id - ID del embarque a cargar
 * @param {Boolean} actualizarDB - Si se debe actualizar la DB al adaptar
 * @returns {Object} - Embarque adaptado
 */
export const cargarYAdaptarEmbarque = async (id, actualizarDB = false) => {
  try {
    // Validar que el ID no sea undefined o vacío
    if (!id || id === 'undefined' || id === 'null') {
      console.error('Error: Se intentó cargar un embarque con ID inválido:', id);
      return null;
    }
    
    // Obtener referencia al documento del embarque
    const embarqueRef = doc(db, "embarques", id);
    const embarqueSnap = await getDoc(embarqueRef);
    
    if (!embarqueSnap.exists()) {
      console.error(`Embarque con ID ${id} no encontrado`);
      return null;
    }
    
    // Obtener datos del embarque y adaptarlos
    const embarqueData = embarqueSnap.data();
    console.log('EmbarqueAdapter - Datos originales del embarque:', embarqueData);
    
    const embarqueAdaptado = adaptarEmbarqueAntiguo(embarqueData);
    console.log('EmbarqueAdapter - Embarque adaptado:', embarqueAdaptado);
    
    // Si se solicita, actualizar el documento en Firestore con los datos adaptados
    if (actualizarDB) {
      try {
        await updateDoc(embarqueRef, embarqueAdaptado);
        console.log(`Embarque ${id} actualizado con estructura adaptada`);
      } catch (error) {
        console.error(`Error al actualizar embarque ${id}:`, error);
      }
    }
    
    // Asegurarse de que todos los productos tengan medida, media y talla
    if (embarqueAdaptado.items && Array.isArray(embarqueAdaptado.items)) {
      embarqueAdaptado.items = embarqueAdaptado.items.map(item => {
        // Si falta alguno de los campos, asignar el valor de uno de los otros
        const medidaValue = item.medida || item.media || item.talla || '';
        return {
          ...item,
          medida: medidaValue,
          media: medidaValue,
          talla: medidaValue
        };
      });
    }
    
    // Asegurarse de que la fecha esté en formato string YYYY-MM-DD
    if (embarqueAdaptado.fecha) {
      if (typeof embarqueAdaptado.fecha === 'string') {
        // Ya está en formato string, no hacer nada
      } else if (embarqueAdaptado.fecha instanceof Date) {
        embarqueAdaptado.fecha = embarqueAdaptado.fecha.toISOString().split('T')[0];
      } else if (embarqueAdaptado.fecha.toDate && typeof embarqueAdaptado.fecha.toDate === 'function') {
        // Es un Timestamp de Firestore
        const fechaDate = embarqueAdaptado.fecha.toDate();
        embarqueAdaptado.fecha = fechaDate.toISOString().split('T')[0];
      } else {
        console.warn('Formato de fecha no reconocido en adaptador:', embarqueAdaptado.fecha);
        embarqueAdaptado.fecha = new Date().toISOString().split('T')[0];
      }
    } else {
      embarqueAdaptado.fecha = new Date().toISOString().split('T')[0];
    }
    
    return embarqueAdaptado;
  } catch (error) {
    console.error(`Error al cargar y adaptar embarque ${id}:`, error);
    return null;
  }
}; 