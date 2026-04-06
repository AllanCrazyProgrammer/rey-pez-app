const admin = require('firebase-admin');
const serviceAccount = require('./admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Helper para normalizar el cuarto frío
const normalizeCuarto = (c) => {
  const valor = (c && c.trim()) ? c.trim() : 's/c';
  return valor.toLowerCase() === 'sin cuarto designado' ? 's/c' : valor;
};

// Helper para convertir a Date
const toDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate) return value.toDate();
  return null;
};

async function getExistenciasComoVue() {
  try {
    console.log("Calculando existencias de limpios (replicando lógica de Existencias.vue)...");
    
    const sacadasSnapshot = await db.collection('sacadas').orderBy('fecha', 'asc').get();
    const newExistencias = {};

    const sacadasOrdenadas = sacadasSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const fechaA = toDateValue(a.fecha);
        const fechaB = toDateValue(b.fecha);
        return fechaA - fechaB;
      });

    sacadasOrdenadas.forEach(sacada => {
      const sacadaFecha = toDateValue(sacada.fecha);

      // Procesar entradas
      if (sacada.entradas && Array.isArray(sacada.entradas)) {
        sacada.entradas.forEach(entrada => {
          const prov = entrada.proveedor || 'Sin Proveedor';
          const precio = (entrada.precio !== null && entrada.precio !== undefined) ? entrada.precio : null;
          const cuarto = normalizeCuarto(entrada.cuartoFrio);
          
          // Clave de medida replicando la de Vue: medida_$precio__cuarto
          const medidaKey = precio !== null
            ? `${entrada.medida}_$${precio}__${cuarto}`
            : `${entrada.medida}__${cuarto}`;

          if (!newExistencias[prov]) newExistencias[prov] = {};
          if (!newExistencias[prov][medidaKey]) {
            newExistencias[prov][medidaKey] = {
              medida: entrada.medida,
              precio: precio,
              lotes: [],
              cuartoFrio: cuarto // Guardar el cuarto frío para el lote
            };
          }

          const registro = newExistencias[prov][medidaKey];
          registro.lotes.push({
            kilos: Number(entrada.kilos || 0),
            fechaEntrada: sacadaFecha,
            cuartoFrio: cuarto
          });
          // No sumar kilos aquí, se hará al final para reflejar el estado actual de los lotes
        });
      }

      // Procesar salidas - respetando la selección exacta del usuario (FIFO con lotes)
      if (sacada.salidas && Array.isArray(sacada.salidas)) {
        sacada.salidas.forEach(salida => {
          const prov = salida.proveedor || 'Sin Proveedor';
          const precio = (salida.precio !== null && salida.precio !== undefined) ? salida.precio : null;
          const cuarto = normalizeCuarto(salida.cuartoFrio);
          
          const medidaKey = precio !== null
            ? `${salida.medida}_$${precio}__${cuarto}`
            : `${salida.medida}__${cuarto}`;

          if (!newExistencias[prov] || !newExistencias[prov][medidaKey]) {
            // Si no hay existencias para esta medida/proveedor/precio/cuarto, logear y saltar
            // console.warn(`[Existencias Script] Salida sin lote correspondiente: ${prov} - ${salida.medida} (${salida.kilos}kg)`);
            return;
          }

          const registroSalida = newExistencias[prov][medidaKey];
          let kilosPendientes = Number(salida.kilos || 0);

          // Ordenar lotes por fecha de entrada más antigua para FIFO
          registroSalida.lotes.sort((a, b) => toDateValue(a.fechaEntrada) - toDateValue(b.fechaEntrada));

          for (let i = 0; i < registroSalida.lotes.length && kilosPendientes > 0; i++) {
            const lote = registroSalida.lotes[i];
            if (lote.kilos >= kilosPendientes) {
              lote.kilos -= kilosPendientes;
              kilosPendientes = 0;
            } else {
              kilosPendientes -= lote.kilos;
              lote.kilos = 0;
            }
          }
          
          // Eliminar lotes agotados
          registroSalida.lotes = registroSalida.lotes.filter(lote => lote.kilos > 0);

          if (kilosPendientes > 0) {
            console.warn('[Existencias Script] Salida sin suficientes lotes registrados (FIFO):', {
              proveedor: prov,
              medida: salida.medida,
              precio,
              cuarto,
              kilosFaltantes: kilosPendientes
            });
          }
        });
      }
    });

    // Post-procesamiento: Calcular kilos finales y filtrar lo que tenga <= 1kg
    const finalExistencias = {};
    let totalGlobal = 0;

    Object.entries(newExistencias).forEach(([proveedor, medidas]) => {
      const provMedidas = {};
      Object.entries(medidas).forEach(([medidaKey, datos]) => {
        // Filtrar lotes con más de 1kg
        datos.lotes = datos.lotes.filter(lote => Number(lote.kilos) > 1);
        datos.kilos = datos.lotes.reduce((sum, lote) => sum + Number(lote.kilos), 0);

        if (datos.kilos > 1) { // Solo incluir si el total de la medida es > 1kg
          // Reconstruir la medida sin el precio/cuarto para agrupar visualmente si no hay filtro de cuarto
          const displayMedida = datos.medida;
          
          if (!provMedidas[displayMedida]) provMedidas[displayMedida] = {};
          if (!provMedidas[displayMedida][proveedor]) provMedidas[displayMedida][proveedor] = 0;
          
          provMedidas[displayMedida][proveedor] += datos.kilos;
        }
      });
      if (Object.keys(provMedidas).length > 0) {
        finalExistencias[proveedor] = provMedidas;
      }
    });
    
    // Formatear la salida igual al reporte anterior que le gustó a Allan
    const medidasFinales = {};
    Object.entries(finalExistencias).forEach(([proveedor, medidasProv]) => {
      Object.entries(medidasProv).forEach(([medida, provKilos]) => {
        let displayMedida = medida;
        let displayProveedor = proveedor;

        // Si la medida original incluye '1ra Nacional', la tratamos como una sub-categoría del proveedor
        if (medida.includes('1ra Nacional')) {
          displayMedida = medida.replace('1ra Nacional', '').trim();
          displayProveedor = `${proveedor} (1ra Nac.)`;
        }
        
        if (!medidasFinales[displayMedida]) medidasFinales[displayMedida] = {};
        if (!medidasFinales[displayMedida][displayProveedor]) medidasFinales[displayMedida][displayProveedor] = 0;
        medidasFinales[displayMedida][displayProveedor] += Object.values(provKilos).reduce((sum, val) => sum + val, 0);
      });
    });

    const medidasOrdenadas = Object.keys(medidasFinales).sort((a, b) => {
        const numA = parseInt(a.split('/')[0]) || 0;
        const numB = parseInt(b.split('/')[0]) || 0;
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    });

    console.log("\n====== EXISTENCIAS ACTUALES (LIMPIOS) ======\n");

    for (const medida of medidasOrdenadas) {
      const proveedores = medidasFinales[medida];
      let totalMedida = 0;
      let provStock = [];
      
      const proveedoresOrdenados = Object.keys(proveedores).sort();
      for (const prov of proveedoresOrdenados) {
        const kilos = proveedores[prov];
        const kilosRedondeados = Math.round(kilos * 10) / 10;
        if (kilosRedondeados > 1) { // Mostrar solo si el proveedor tiene > 1kg en esa medida
          totalMedida += kilosRedondeados;
          provStock.push(`    - ${prov}: ${kilosRedondeados} kg`);
        }
      }
      
      totalMedida = Math.round(totalMedida * 10) / 10;
      
      if (totalMedida > 1) { // Mostrar la medida solo si el total es > 1kg
        console.log(`📏 MEDIDA: ${medida} (Total: ${totalMedida} kg)`);
        provStock.forEach(p => console.log(p));
        console.log("");
        totalGlobal += totalMedida;
      }
    }
    
    console.log(`============================================`);
    console.log(`TOTAL GLOBAL EN INVENTARIO: ${Math.round(totalGlobal * 10) / 10} kg`);
    
  } catch (error) {
    console.error("Error calculando existencias:", error);
  } finally {
    process.exit(0);
  }
}

getExistenciasComoVue();