const admin = require('firebase-admin');
const serviceAccount = require('./admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function getExistenciasAgrupadas() {
  try {
    const sacadasSnapshot = await db.collection('sacadas').orderBy('fecha', 'asc').get();
    
    const existencias = {};
    
    sacadasSnapshot.forEach(doc => {
      const data = doc.data();
      
      const processItem = (item, isEntrada) => {
        let prov = item.proveedor || 'Sin Proveedor';
        let med = item.medida || 'Sin Medida';
        let kilos = Number(item.kilos || 0);
        
        // Si es salida, restamos
        if (!isEntrada) kilos = -kilos;

        // Separar "1ra Nacional" de la medida para agruparla en la medida base
        if (med.includes('1ra Nacional')) {
            med = med.replace('1ra Nacional', '').trim();
            // Lo ponemos como un "proveedor" distinto para identificar la calidad
            prov = `${prov} (1ra Nac.)`;
        }
        
        if (!existencias[med]) existencias[med] = {};
        if (!existencias[med][prov]) existencias[med][prov] = 0;
        
        existencias[med][prov] += kilos;
      };

      if (data.entradas && Array.isArray(data.entradas)) {
        data.entradas.forEach(e => processItem(e, true));
      }
      
      if (data.salidas && Array.isArray(data.salidas)) {
        data.salidas.forEach(s => processItem(s, false));
      }
    });

    let totalGlobal = 0;
    const medidasOrdenadas = Object.keys(existencias).sort();

    for (const medida of medidasOrdenadas) {
      const proveedores = existencias[medida];
      let totalMedida = 0;
      let provStock = [];
      
      for (const [prov, kilos] of Object.entries(proveedores)) {
        const kilosRedondeados = Math.round(kilos * 10) / 10;
        if (kilosRedondeados > 0) {
          totalMedida += kilosRedondeados;
          provStock.push(`    - ${prov}: ${kilosRedondeados} kg`);
        }
      }
      
      totalMedida = Math.round(totalMedida * 10) / 10;
      
      if (totalMedida > 0) {
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

getExistenciasAgrupadas();