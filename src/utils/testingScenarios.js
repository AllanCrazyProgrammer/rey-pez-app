/**
 * Script de pruebas para validar el sistema infalible de precios
 * 
 * Uso en consola del navegador:
 * import { ejecutarPruebasSistemaPrecios } from '@/utils/testingScenarios';
 * ejecutarPruebasSistemaPrecios();
 */

import { 
  obtenerPrecioParaMedida, 
  obtenerPreciosParaFecha, 
  normalizarMedida 
} from './preciosHistoricos';

import { 
  normalizarFechaISO, 
  obtenerFechaActualISO, 
  esFechaValida,
  compararFechas,
  obtenerTimestamp
} from './dateUtils';

/**
 * Datos de prueba simulados
 */
const datosPrecios = [
  // Precios generales
  {
    id: '1',
    producto: '51/60',
    precio: 150,
    fecha: '2025-01-10',
    timestamp: 1642150000000,
    categoria: 'Camarón S/C'
  },
  {
    id: '2', 
    producto: '51/60',
    precio: 160,
    fecha: '2025-01-15',
    timestamp: 1642150001000,
    categoria: 'Camarón S/C'
  },
  {
    id: '3',
    producto: 'Med Gde',
    precio: 200,
    fecha: '2025-01-12',
    timestamp: 1642150002000,
    categoria: 'Camarón C/C'
  },
  
  // Precios específicos para clientes
  {
    id: '4',
    producto: '51/60',
    precio: 180,
    fecha: '2025-01-15',
    timestamp: 1642150003000,
    categoria: 'Camarón S/C',
    clienteId: 'catarro'
  },
  {
    id: '5',
    producto: 'Med Gde',
    precio: 250,
    fecha: '2025-01-15',
    timestamp: 1642150004000,
    categoria: 'Camarón C/C',
    clienteId: 'joselito'
  },
  
  // Precio futuro (no debería usarse)
  {
    id: '6',
    producto: '51/60',
    precio: 200,
    fecha: '2025-01-20',
    timestamp: 1642150005000,
    categoria: 'Camarón S/C'
  },
  
  // Múltiples precios mismo día
  {
    id: '7',
    producto: '71/90',
    precio: 120,
    fecha: '2025-01-15',
    timestamp: 1642150006000,
    categoria: 'Camarón S/C'
  },
  {
    id: '8',
    producto: '71/90',
    precio: 130,
    fecha: '2025-01-15',
    timestamp: 1642150007000, // Más reciente
    categoria: 'Camarón S/C'
  },
  
  // Precio sin timestamp (compatibilidad con precios viejos)
  {
    id: '9',
    producto: 'Med Ch',
    precio: 140,
    fecha: '2025-01-10',
    categoria: 'Camarón C/C'
    // Sin timestamp
  }
];

/**
 * Escenarios de prueba
 */
const escenariosPrueba = [
  {
    nombre: 'Precio General - Fecha Exacta',
    descripcion: 'Debe usar precio general cuando no hay precio específico',
    embarqueFecha: '2025-01-15',
    medida: '51/60',
    cliente: null,
    esperado: 160,
    debug: true
  },
  {
    nombre: 'Precio Específico - Cliente Catarro',
    descripcion: 'Debe priorizar precio específico sobre precio general',
    embarqueFecha: '2025-01-15',
    medida: '51/60',
    cliente: 'catarro',
    esperado: 180,
    debug: true
  },
  {
    nombre: 'Precio General - Cliente Sin Específico',
    descripcion: 'Debe usar precio general cuando cliente no tiene precio específico',
    embarqueFecha: '2025-01-15',
    medida: '51/60',
    cliente: 'ozuna',
    esperado: 160,
    debug: true
  },
  {
    nombre: 'Filtrado de Fecha Futura',
    descripcion: 'No debe usar precios con fecha posterior al embarque',
    embarqueFecha: '2025-01-18',
    medida: '51/60',
    cliente: null,
    esperado: 160, // No debe usar el precio del 20 de enero
    debug: true
  },
  {
    nombre: 'Múltiples Precios Mismo Día',
    descripcion: 'Debe usar el precio más reciente por timestamp',
    embarqueFecha: '2025-01-15',
    medida: '71/90',
    cliente: null,
    esperado: 130, // El más reciente
    debug: true
  },
  {
    nombre: 'Normalización de Medidas',
    descripcion: 'Debe encontrar precios con medidas normalizadas',
    embarqueFecha: '2025-01-15',
    medida: 'med-gde', // Normalizado debe coincidir con 'Med Gde'
    cliente: 'joselito',
    esperado: 250,
    debug: true
  },
  {
    nombre: 'Embarque Fecha Pasada',
    descripcion: 'Debe usar precio más reciente disponible hasta la fecha',
    embarqueFecha: '2025-01-12',
    medida: '51/60',
    cliente: null,
    esperado: 150, // Solo el precio del 10 está disponible
    debug: true
  },
  {
    nombre: 'Medida Sin Precio',
    descripcion: 'Debe retornar null para medidas sin precio',
    embarqueFecha: '2025-01-15',
    medida: 'Medida Inexistente',
    cliente: null,
    esperado: null,
    debug: true
  },
  {
    nombre: 'Precio Sin Timestamp',
    descripcion: 'Debe manejar precios sin timestamp correctamente',
    embarqueFecha: '2025-01-15',
    medida: 'Med Ch',
    cliente: null,
    esperado: 140,
    debug: true
  }
];

/**
 * Ejecuta una prueba individual
 */
const ejecutarPrueba = (escenario) => {
  console.log(`\n🧪 === ${escenario.nombre} ===`);
  console.log(`📝 ${escenario.descripcion}`);
  console.log(`📅 Fecha embarque: ${escenario.embarqueFecha}`);
  console.log(`📏 Medida: ${escenario.medida}`);
  console.log(`👤 Cliente: ${escenario.cliente || 'General'}`);
  
  const resultado = obtenerPrecioParaMedida(
    datosPrecios,
    escenario.medida,
    escenario.embarqueFecha,
    escenario.cliente
  );
  
  const exito = resultado === escenario.esperado;
  const icono = exito ? '✅' : '❌';
  
  console.log(`${icono} Resultado: $${resultado} | Esperado: $${escenario.esperado}`);
  
  if (!exito) {
    console.error(`🚨 FALLO: Se esperaba $${escenario.esperado} pero se obtuvo $${resultado}`);
    
    // Debug adicional en caso de fallo
    if (escenario.debug) {
      console.log('🔍 Debug adicional:');
      const preciosParaFecha = obtenerPreciosParaFecha(
        datosPrecios, 
        escenario.embarqueFecha, 
        escenario.cliente
      );
      console.log('Precios disponibles para fecha:', Array.from(preciosParaFecha.entries()));
      console.log('Medida normalizada:', normalizarMedida(escenario.medida));
    }
  }
  
  return { escenario: escenario.nombre, exito, resultado, esperado: escenario.esperado };
};

/**
 * Pruebas de utilidades de fecha
 */
const probarUtilidadesFecha = () => {
  console.log('\n🗓️ === Pruebas de Utilidades de Fecha ===');
  
  const pruebasFecha = [
    {
      nombre: 'Normalización fecha Date object',
      entrada: new Date('2025-01-15'),
      esperado: '2025-01-15'
    },
    {
      nombre: 'Normalización fecha string ISO',
      entrada: '2025-01-15T14:30:00.000Z',
      esperado: '2025-01-15'
    },
    {
      nombre: 'Normalización fecha ya normalizada',
      entrada: '2025-01-15',
      esperado: '2025-01-15'
    },
    {
      nombre: 'Fecha inválida',
      entrada: 'fecha-invalida',
      esperado: obtenerFechaActualISO() // Debe usar fecha actual como fallback
    }
  ];
  
  const resultadosFecha = pruebasFecha.map(prueba => {
    const resultado = normalizarFechaISO(prueba.entrada);
    const exito = resultado === prueba.esperado;
    const icono = exito ? '✅' : '❌';
    
    console.log(`${icono} ${prueba.nombre}: ${resultado} | Esperado: ${prueba.esperado}`);
    
    return { ...prueba, resultado, exito };
  });
  
  // Pruebas de validación de fecha
  console.log('\n📅 Pruebas de Validación de Fecha:');
  
  const pruebasValidacion = [
    {
      nombre: 'Fecha válida (anterior)',
      fechaPrecio: '2025-01-10',
      fechaLimite: '2025-01-15',
      esperado: true
    },
    {
      nombre: 'Fecha válida (igual)',
      fechaPrecio: '2025-01-15',
      fechaLimite: '2025-01-15',
      esperado: true
    },
    {
      nombre: 'Fecha inválida (posterior)',
      fechaPrecio: '2025-01-20',
      fechaLimite: '2025-01-15',
      esperado: false
    }
  ];
  
  const resultadosValidacion = pruebasValidacion.map(prueba => {
    const resultado = esFechaValida(prueba.fechaPrecio, prueba.fechaLimite);
    const exito = resultado === prueba.esperado;
    const icono = exito ? '✅' : '❌';
    
    console.log(`${icono} ${prueba.nombre}: ${resultado} | Esperado: ${prueba.esperado}`);
    
    return { ...prueba, resultado, exito };
  });
  
  return [...resultadosFecha, ...resultadosValidacion];
};

/**
 * Pruebas de rendimiento
 */
const probarRendimiento = () => {
  console.log('\n⚡ === Pruebas de Rendimiento ===');
  
  // Crear dataset grande para pruebas
  const datasetGrande = [];
  for (let i = 0; i < 1000; i++) {
    datasetGrande.push({
      id: `perf-${i}`,
      producto: `Medida-${i % 50}`, // 50 medidas diferentes
      precio: 100 + (i % 100),
      fecha: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
      timestamp: 1642150000000 + i,
      categoria: i % 2 === 0 ? 'Camarón S/C' : 'Camarón C/C'
    });
  }
  
  console.log(`📊 Dataset de prueba: ${datasetGrande.length} registros`);
  
  // Prueba de carga de precios
  const inicioFiltrado = performance.now();
  const preciosFiltrados = obtenerPreciosParaFecha(datasetGrande, '2025-01-15');
  const finFiltrado = performance.now();
  
  console.log(`⏱️  Filtrado por fecha: ${(finFiltrado - inicioFiltrado).toFixed(2)}ms`);
  console.log(`📋 Precios filtrados: ${preciosFiltrados.size} medidas`);
  
  // Prueba de búsqueda de precio específico
  const inicioBusqueda = performance.now();
  for (let i = 0; i < 100; i++) {
    obtenerPrecioParaMedida(datasetGrande, `Medida-${i % 50}`, '2025-01-15');
  }
  const finBusqueda = performance.now();
  
  console.log(`🔍 100 búsquedas de precio: ${(finBusqueda - inicioBusqueda).toFixed(2)}ms`);
  console.log(`⚡ Promedio por búsqueda: ${((finBusqueda - inicioBusqueda) / 100).toFixed(2)}ms`);
  
  return {
    tiempoFiltrado: finFiltrado - inicioFiltrado,
    preciosFiltrados: preciosFiltrados.size,
    tiempoBusqueda: finBusqueda - inicioBusqueda,
    promedioTimeBusqueda: (finBusqueda - inicioBusqueda) / 100
  };
};

/**
 * Función principal de pruebas
 */
export const ejecutarPruebasSistemaPrecios = () => {
  console.log('🚀 === INICIANDO PRUEBAS DEL SISTEMA INFALIBLE DE PRECIOS ===');
  console.log(`⏰ Fecha y hora de prueba: ${new Date().toLocaleString('es-ES')}`);
  
  // Ejecutar pruebas de escenarios
  console.log('\n🎯 === Pruebas de Escenarios de Precios ===');
  const resultadosEscenarios = escenariosPrueba.map(ejecutarPrueba);
  
  // Ejecutar pruebas de utilidades de fecha
  const resultadosFecha = probarUtilidadesFecha();
  
  // Ejecutar pruebas de rendimiento
  const resultadosRendimiento = probarRendimiento();
  
  // Resumen final
  console.log('\n📊 === RESUMEN DE PRUEBAS ===');
  
  const exitosEscenarios = resultadosEscenarios.filter(r => r.exito).length;
  const totalEscenarios = resultadosEscenarios.length;
  
  const exitosFecha = resultadosFecha.filter(r => r.exito).length;
  const totalFecha = resultadosFecha.length;
  
  console.log(`🎯 Escenarios de precios: ${exitosEscenarios}/${totalEscenarios} exitosos`);
  console.log(`🗓️ Utilidades de fecha: ${exitosFecha}/${totalFecha} exitosas`);
  console.log(`⚡ Rendimiento: Filtrado ${resultadosRendimiento.tiempoFiltrado.toFixed(2)}ms, Búsqueda ${resultadosRendimiento.promedioTimeBusqueda.toFixed(2)}ms promedio`);
  
  const todoExitoso = exitosEscenarios === totalEscenarios && exitosFecha === totalFecha;
  const estadoFinal = todoExitoso ? '🟢 TODAS LAS PRUEBAS EXITOSAS' : '🔴 ALGUNAS PRUEBAS FALLARON';
  
  console.log(`\n${estadoFinal}`);
  
  if (!todoExitoso) {
    console.log('\n🚨 FALLOS DETECTADOS:');
    resultadosEscenarios.filter(r => !r.exito).forEach(r => {
      console.log(`- ${r.escenario}: Esperado $${r.esperado}, Obtenido $${r.resultado}`);
    });
    resultadosFecha.filter(r => !r.exito).forEach(r => {
      console.log(`- ${r.nombre}: Esperado ${r.esperado}, Obtenido ${r.resultado}`);
    });
  }
  
  return {
    escenarios: resultadosEscenarios,
    fecha: resultadosFecha,
    rendimiento: resultadosRendimiento,
    exitoso: todoExitoso
  };
};

/**
 * Prueba específica para debugging en desarrollo
 */
export const probarEscenarioEspecifico = (embarqueFecha, medida, cliente = null) => {
  console.log(`🔬 === Prueba de Debugging Específica ===`);
  console.log(`📅 Fecha embarque: ${embarqueFecha}`);
  console.log(`📏 Medida: ${medida}`);
  console.log(`👤 Cliente: ${cliente || 'General'}`);
  
  // Mostrar precios disponibles
  console.log('\n📋 Precios disponibles en dataset:');
  datosPrecios.forEach(precio => {
    const relevante = normalizarMedida(precio.producto).includes(normalizarMedida(medida)) ||
                     normalizarMedida(medida).includes(normalizarMedida(precio.producto));
    const icono = relevante ? '🎯' : '📌';
    console.log(`${icono} ${precio.producto} - $${precio.precio} (${precio.fecha}) ${precio.clienteId ? `[${precio.clienteId}]` : '[General]'}`);
  });
  
  // Ejecutar búsqueda
  const resultado = obtenerPrecioParaMedida(datosPrecios, medida, embarqueFecha, cliente);
  
  console.log(`\n💰 Resultado: ${resultado ? `$${resultado}` : 'No encontrado'}`);
  
  // Análisis detallado
  const preciosParaFecha = obtenerPreciosParaFecha(datosPrecios, embarqueFecha, cliente);
  console.log('\n🔍 Análisis detallado:');
  console.log(`- Medida normalizada: ${normalizarMedida(medida)}`);
  console.log(`- Precios disponibles para fecha: ${preciosParaFecha.size}`);
  console.log(`- Mapa de precios:`, Array.from(preciosParaFecha.entries()));
  
  return resultado;
};

export default {
  ejecutarPruebasSistemaPrecios,
  probarEscenarioEspecifico,
  datosPrecios
}; 