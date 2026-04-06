const admin = require('firebase-admin');
const serviceAccount = require('./admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function calculateExistencias4150() {
  try {
    const sacadasSnapshot = await db.collection('sacadas').get();
    
    // Objeto para llevar la cuenta de entradas y salidas por proveedor/maquila para la medida 41/50
    const inventario4150 = {};
    
    // Sort just in case, though for simple sum it doesn't strictly matter
    const sacadasOrdenadas = sacadasSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.fecha && a.fecha.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const dateB = b.fecha && b.fecha.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return dateA - dateB;
      });

    sacadasOrdenadas.forEach(sacada => {
      // Entradas
      if (sacada.entradas && Array.isArray(sacada.entradas)) {
        sacada.entradas.forEach(entrada => {
          if (entrada.medida && (entrada.medida.includes('41/50') || entrada.medida.includes('41-50'))) {
            const key = `${entrada.proveedor || entrada.maquila || 'Sin Proveedor'} - ${entrada.medida}`;
            if (!inventario4150[key]) inventario4150[key] = 0;
            inventario4150[key] += Number(entrada.kilos) || 0;
          }
        });
      }
      
      // Salidas
      if (sacada.salidas && Array.isArray(sacada.salidas)) {
        sacada.salidas.forEach(salida => {
          if (salida.medida && (salida.medida.includes('41/50') || salida.medida.includes('41-50'))) {
             const key = `${salida.proveedor || salida.maquila || 'Sin Proveedor'} - ${salida.medida}`;
             if (!inventario4150[key]) inventario4150[key] = 0;
             inventario4150[key] -= Number(salida.kilos) || 0;
          }
        });
      }
    });

    console.log("=== EXISTENCIAS ACTUALES DE 41/50 ===");
    let totalGlobal = 0;
    Object.keys(inventario4150).sort().forEach(key => {
      const kilos = inventario4150[key];
      // Mostrar solo si hay existencia o si es negativo (posible error)
      if (kilos !== 0) {
        console.log(`${key}: ${kilos.toFixed(2)} kg`);
        totalGlobal += kilos;
      }
    });
    
    console.log(`\nTOTAL GLOBAL DE TODAS LAS VARIANTES 41/50: ${totalGlobal.toFixed(2)} kg`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

calculateExistencias4150();