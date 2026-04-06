const admin = require('firebase-admin');
const serviceAccount = require('./admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testRead() {
  try {
    const collections = await db.listCollections();
    console.log("Colecciones disponibles en la base de datos:");
    collections.forEach(collection => {
      console.log("- " + collection.id);
    });
    
    // Leer algunos proveedores como prueba
    console.log("\nConsultando colección 'proveedores' (límite 3)...");
    const provSnapshot = await db.collection('proveedores').limit(3).get();
    if (provSnapshot.empty) {
      console.log("No se encontraron proveedores.");
    } else {
      provSnapshot.forEach(doc => {
        console.log(`  > ID: ${doc.id} | Datos:`, doc.data().nombre || doc.data());
      });
    }
  } catch (error) {
    console.error("Error al leer Firestore:", error);
  } finally {
    process.exit(0);
  }
}

testRead();