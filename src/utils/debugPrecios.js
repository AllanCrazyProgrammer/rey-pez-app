/**
 * Script de debugging para verificar el estado de la colección precios
 * 
 * Uso en consola del navegador:
 * import { debugPreciosFirestore } from '@/utils/debugPrecios';
 * debugPreciosFirestore();
 */

import { getFirestore, collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { normalizarFechaISO, obtenerFechaActualISO, obtenerTimestamp } from './dateUtils';

/**
 * Función principal de debugging para verificar precios en Firestore
 */
export const debugPreciosFirestore = async () => {
  console.log('🔍 === DEBUGGING PRECIOS FIRESTORE ===');
  
  try {
    const db = getFirestore();
    const preciosRef = collection(db, 'precios');
    
    // 1. Verificar si la colección existe y tiene datos
    console.log('📊 Paso 1: Verificando existencia de colección...');
    const snapshot = await getDocs(preciosRef);
    console.log(`📋 Total de documentos en colección 'precios': ${snapshot.size}`);
    
    if (snapshot.size === 0) {
      console.warn('⚠️  La colección "precios" está vacía!');
      console.log('💡 Esto explica por qué ValidacionPrecios muestra "Total precios: 0"');
      
      // Ofrecer crear datos de prueba
      const respuesta = confirm('¿Quieres crear algunos precios de prueba para verificar el sistema?');
      if (respuesta) {
        await crearPreciosDePrueba();
      }
      return;
    }
    
    // 2. Mostrar estructura de algunos documentos
    console.log('📋 Paso 2: Analizando estructura de documentos...');
    const docs = snapshot.docs.slice(0, 3);
    docs.forEach((doc, index) => {
      console.log(`📄 Documento ${index + 1}:`, doc.data());
    });
    
    // 3. Verificar fechas
    console.log('📅 Paso 3: Analizando fechas...');
    const fechas = snapshot.docs.map(doc => doc.data().fecha).filter(f => f);
    const fechasUnicas = [...new Set(fechas)];
    console.log(`📆 Fechas únicas encontradas: ${fechasUnicas.length}`, fechasUnicas);
    
    // 4. Verificar precios para fecha actual
    const fechaHoy = normalizarFechaISO(new Date());
    const preciosHoy = snapshot.docs.filter(doc => {
      const data = doc.data();
      return normalizarFechaISO(data.fecha) === fechaHoy;
    });
    console.log(`🗓️  Precios para fecha actual (${fechaHoy}): ${preciosHoy.length}`);
    
    // 5. Verificar timestamps
    console.log('⏰ Paso 4: Verificando timestamps...');
    const sinTimestamp = snapshot.docs.filter(doc => !doc.data().timestamp);
    console.log(`⚠️  Precios sin timestamp: ${sinTimestamp.length}`);
    
    // 6. Buscar precios para "Golfo"
    console.log('🔍 Paso 5: Buscando precios para "Golfo"...');
    const preciosGolfo = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.producto && data.producto.toLowerCase().includes('golfo');
    });
    console.log(`🎯 Precios encontrados para "Golfo": ${preciosGolfo.length}`);
    preciosGolfo.forEach(doc => {
      console.log('   📦', doc.data());
    });
    
    // 7. Probar query con orderBy
    console.log('🔄 Paso 6: Probando query con orderBy...');
    try {
      const qOrdenado = query(preciosRef, orderBy('fecha', 'desc'));
      const snapshotOrdenado = await getDocs(qOrdenado);
      console.log(`✅ Query con orderBy exitoso: ${snapshotOrdenado.size} documentos`);
      
      // Probar con timestamp también
      try {
        const qTimestamp = query(preciosRef, orderBy('fecha', 'desc'), orderBy('timestamp', 'desc'));
        const snapshotTimestamp = await getDocs(qTimestamp);
        console.log(`✅ Query con timestamp exitoso: ${snapshotTimestamp.size} documentos`);
      } catch (timestampError) {
        console.error('❌ Error en query con timestamp:', timestampError);
        console.log('💡 Puede que necesites crear un índice compuesto en Firestore');
      }
    } catch (orderError) {
      console.error('❌ Error en query con orderBy:', orderError);
    }
    
    // 8. Resumen final
    console.log('\n📊 === RESUMEN DE DEBUGGING ===');
    console.log(`✅ Colección 'precios' existe: ${snapshot.size > 0}`);
    console.log(`📋 Total documentos: ${snapshot.size}`);
    console.log(`📅 Fechas únicas: ${fechasUnicas.length}`);
    console.log(`🗓️  Precios hoy (${fechaHoy}): ${preciosHoy.length}`);
    console.log(`⚠️  Sin timestamp: ${sinTimestamp.length}`);
    console.log(`🎯 Precios "Golfo": ${preciosGolfo.length}`);
    
    if (snapshot.size > 0 && preciosHoy.length === 0) {
      console.warn('⚠️  PROBLEMA DETECTADO: Hay precios en la colección pero ninguno para la fecha actual');
      console.log('💡 Esto puede explicar por qué ValidacionPrecios muestra "Precios válidos para fecha: 0"');
    }
    
  } catch (error) {
    console.error('❌ Error en debugging:', error);
  }
};

/**
 * Crear precios de prueba para testing
 */
const crearPreciosDePrueba = async () => {
  console.log('🔄 Creando precios de prueba...');
  
  const preciosPrueba = [
    {
      producto: 'Golfo',
      precio: 555,
      fecha: normalizarFechaISO(new Date()),
      timestamp: obtenerTimestamp(),
      categoria: 'Otros',
      fechaCreacion: obtenerFechaActualISO(),
      horaCreacion: new Date().toLocaleTimeString('es-ES')
    },
    {
      producto: '51/60',
      precio: 180,
      fecha: normalizarFechaISO(new Date()),
      timestamp: obtenerTimestamp(),
      categoria: 'Camarón S/C',
      fechaCreacion: obtenerFechaActualISO(),
      horaCreacion: new Date().toLocaleTimeString('es-ES')
    },
    {
      producto: 'Med Gde',
      precio: 220,
      fecha: normalizarFechaISO(new Date()),
      timestamp: obtenerTimestamp(),
      categoria: 'Camarón C/C',
      fechaCreacion: obtenerFechaActualISO(),
      horaCreacion: new Date().toLocaleTimeString('es-ES')
    }
  ];
  
  try {
    const db = getFirestore();
    const preciosRef = collection(db, 'precios');
    
    for (const precio of preciosPrueba) {
      await addDoc(preciosRef, precio);
      console.log(`✅ Precio de prueba creado: ${precio.producto} - $${precio.precio}`);
    }
    
    console.log('🎉 Precios de prueba creados exitosamente');
    console.log('🔄 Ahora puedes hacer clic en "Forzar Recarga de Precios" para ver los cambios');
    
  } catch (error) {
    console.error('❌ Error al crear precios de prueba:', error);
  }
};

/**
 * Verificar estructura específica de un precio
 */
export const verificarEstructuraPrecio = (precio) => {
  console.log('🔍 Verificando estructura de precio:', precio);
  
  const camposRequeridos = ['producto', 'precio', 'fecha'];
  const camposOpcionales = ['timestamp', 'categoria', 'clienteId', 'fechaCreacion', 'horaCreacion'];
  
  const camposFaltantes = camposRequeridos.filter(campo => !precio[campo]);
  const camposPresentes = camposOpcionales.filter(campo => precio[campo]);
  
  console.log('✅ Campos requeridos presentes:', camposRequeridos.filter(campo => precio[campo]));
  console.log('❌ Campos requeridos faltantes:', camposFaltantes);
  console.log('➕ Campos opcionales presentes:', camposPresentes);
  
  if (precio.fecha) {
    const fechaNormalizada = normalizarFechaISO(precio.fecha);
    console.log(`📅 Fecha normalizada: ${precio.fecha} → ${fechaNormalizada}`);
  }
  
  return camposFaltantes.length === 0;
};

/**
 * Limpiar precios duplicados (usar con cuidado)
 */
export const limpiarPreciosDuplicados = async () => {
  const confirmacion = confirm(
    '⚠️  ADVERTENCIA: Esta función eliminará precios duplicados.\n' +
    '¿Estás seguro de que quieres continuar?\n\n' +
    'Se recomienda hacer backup antes de proceder.'
  );
  
  if (!confirmacion) {
    console.log('❌ Operación cancelada por el usuario');
    return;
  }
  
  try {
    const db = getFirestore();
    const preciosRef = collection(db, 'precios');
    const snapshot = await getDocs(preciosRef);
    
    console.log(`🔄 Analizando ${snapshot.size} precios para detectar duplicados...`);
    
    // Lógica de detección de duplicados aquí
    // (implementar solo si es necesario)
    
    console.log('💡 Función de limpieza no implementada por seguridad');
    console.log('💡 Si necesitas limpiar duplicados, hazlo manualmente desde Firebase Console');
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
};

export default {
  debugPreciosFirestore,
  verificarEstructuraPrecio,
  limpiarPreciosDuplicados
}; 