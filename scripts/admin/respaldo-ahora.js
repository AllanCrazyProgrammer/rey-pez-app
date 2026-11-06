#!/usr/bin/env node
// Hace AHORA el mismo respaldo completo de Firestore que la función diaria (functions/respaldo.js):
// export de toda la base a Storage (respaldos/firestore/AAAA-MM-DD_HHMM), limpieza de respaldos
// de más de 30 días y estado en sistema/respaldos. Solo LEE la base; no modifica tus datos.
//
// Uso (desde la raíz del repo, con admin-key.json presente):
//   node scripts/admin/respaldo-ahora.js
// Opcional: RESPALDO_BUCKET=gs://otro-bucket  RESPALDO_DIAS=30
const path = require('path');

// Los paquetes viven en functions/node_modules (instalados con: cd functions && npm install).
function cargar(modulo) {
  try { return require(modulo); }
  catch (_) { return require(require.resolve(modulo, { paths: [path.join(__dirname, '../../functions')] })); }
}

async function main() {
  const admin = cargar('firebase-admin');
  const { v1 } = cargar('@google-cloud/firestore');
  const R = require('../../functions/respaldo.js');
  const llave = require('../../admin-key.json');
  const projectId = llave.project_id;
  const bucket = R.resolverBucket({ valorEnv: process.env.RESPALDO_BUCKET, bucketDelProyecto: `${projectId}.firebasestorage.app` });
  if (!bucket) { console.log('Respaldo apagado (RESPALDO_BUCKET=off).'); return; }
  admin.initializeApp({ credential: admin.credential.cert(llave), projectId });
  const cliente = new v1.FirestoreAdminClient({ projectId, credentials: { client_email: llave.client_email, private_key: llave.private_key } });
  console.log(`Respaldando la base de ${projectId} en gs://${bucket}/${R.PREFIJO}/ … (puede tardar unos minutos)`);
  try {
    const r = await R.ejecutarRespaldo({
      projectId, bucket, cliente,
      storageBucket: admin.storage().bucket(bucket),
      db: admin.firestore(),
      dias: Math.max(1, Number(process.env.RESPALDO_DIAS) || 30),
      marcaServidor: admin.firestore.FieldValue.serverTimestamp(),
      cuentaServicio: llave.client_email
    });
    console.log(`✓ Respaldo completo: ${r.ultimaCarpeta}`);
    console.log(`  Respaldos viejos borrados: ${r.carpetasBorradas}${r.aviso ? `\n  Aviso: ${r.aviso}` : ''}`);
    console.log('  En la app: Embarques → Recuperación de emergencia muestra este respaldo.');
  } catch (error) {
    console.error('✗ El respaldo no se pudo hacer:', (error.resultado && error.resultado.error) || error.message);
    process.exitCode = 1;
  }
}

// Un corte de red puede llegar como error suelto de un socket: mostrarlo claro, sin traza.
process.on('uncaughtException', error => {
  console.error(`✗ No se pudo conectar con Google Cloud (${error.code || error.message}). Revisa tu internet y vuelve a intentar.`);
  process.exit(1);
});

main();
