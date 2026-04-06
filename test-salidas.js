const admin = require('firebase-admin');
const serviceAccount = require('./admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findSacadasByDate(year, month, day) {
  try {
    const sacadasSnapshot = await db.collection('sacadas').get();
      
    let found = false;
    sacadasSnapshot.forEach(doc => {
      const data = doc.data();
      let date;
      if (data.fecha && data.fecha.toDate) {
        date = data.fecha.toDate();
      } else if (data.fecha) {
        date = new Date(data.fecha);
      }
      
      if (date && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        found = true;
        console.log(`\n--- Sacada del ${day} de ${new Date(year, month, day).toLocaleDateString('es-ES', { month: 'long' })} de ${year} (ID: ${doc.id}) ---`);
        console.log(`Fecha: ${date.toLocaleDateString()}`);
        console.log(`Total Entradas: ${data.totalEntradas || 0} kg`);
        console.log(`Total Salidas: ${data.totalSalidas || 0} kg`);
        if (data.salidas && Array.isArray(data.salidas)) {
          data.salidas.forEach(salida => {
            console.log(`  - ${salida.kilos}kg | Medida: ${salida.medida} | Prov/Maq: ${salida.proveedor} | Tipo: ${salida.tipo}`);
          });
        } else {
          console.log("  (Sin desglose de salidas detallado en este registro)");
        }
      }
    });
    
    if (!found) {
        console.log(`Revisé toda la colección 'sacadas' y no hay ningún registro con fecha del ${day} de ${new Date(year, month, day).toLocaleDateString('es-ES', { month: 'long' })} de ${year}.`);
    }
  } catch (error) {
    console.error("Error al leer Firestore:", error);
  } finally {
    process.exit(0);
  }
}

const dateParam = process.argv[2]; // Espera la fecha en formato YYYY-MM-DD

if (dateParam) {
  const [year, month, day] = dateParam.split('-').map(Number);
  if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
    findSacadasByDate(year, month - 1, day); // Meses en JavaScript son 0-indexados
  } else {
    console.error("Formato de fecha inválido. Usa YYYY-MM-DD.");
    process.exit(1);
  }
} else {
  console.error("Por favor, proporciona una fecha en formato YYYY-MM-DD como argumento.");
  process.exit(1);
}
