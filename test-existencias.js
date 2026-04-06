const admin = require('firebase-admin');
const serviceAccount = require('./admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function getExistenciasLimpios() {
  try {
    console.log("Calculando existencias de limpios (desde 'sacadas')...");
    
    // Obtener todas las sacadas ordenadas por fecha ascendente para procesarlas cronológicamente
    const sacadasSnapshot = await db.collection('sacadas').orderBy('fecha', 'asc').get();
    
    const existencias = {};
    
    sacadasSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Procesar entradas
      if (data.entradas && Array.isArray(data.entradas)) {
        data.entradas.forEach(entrada => {
          const prov = entrada.proveedor || 'Sin Proveedor';
          const med = entrada.medida || 'Sin Medida';
          
          if (!existencias[prov]) existencias[prov] = {};
          if (!existencias[prov][med]) existencias[prov][med] = 0;
          
          existencias[prov][med] += Number(entrada.kilos || 0);
        });
      }
      
      // Procesar salidas
      if (data.salidas && Array.isArray(data.salidas)) {
        data.salidas.forEach(salida => {
          const prov = salida.proveedor || 'Sin Proveedor';
          const med = salida.medida || 'Sin Medida';
          
          if (!existencias[prov]) existencias[prov] = {};
          if (!existencias[prov][med]) existencias[prov][med] = 0;
          
          existencias[prov][med] -= Number(salida.kilos || 0);
        });
      }
    });

    console.log("\n====== EXISTENCIAS ACTUALES (LIMPIOS) ======\n");
    let totalGlobal = 0;

    for (const [proveedor, medidas] of Object.entries(existencias)) {
      let totalProv = 0;
      let hasStock = false;
      
      const medidasStock = [];
      for (const [medida, kilos] of Object.entries(medidas)) {
        // Redondear a 1 decimal para evitar problemas de coma flotante
        const kilosRedondeados = Math.round(kilos * 10) / 10;
        
        if (kilosRedondeados > 0) {
          hasStock = true;
          totalProv += kilosRedondeados;
          medidasStock.push(`    - ${medida}: ${kilosRedondeados} kg`);
        }
      }
      
      if (hasStock) {
        console.log(`📦 PROVEEDOR: ${proveedor} (Total: ${totalProv} kg)`);
        medidasStock.forEach(m => console.log(m));
        console.log("");
        totalGlobal += totalProv;
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

getExistenciasLimpios();