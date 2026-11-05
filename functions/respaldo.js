// Respaldo diario de toda la base Firestore a Cloud Storage (export administrado de Google).
//
// Es una operación de SOLO LECTURA sobre la base: Google copia los documentos al bucket;
// nada se modifica ni se borra en Firestore. Restaurar es un paso manual aparte
// (gcloud firestore import), nunca automático.
//
// Queda apagado hasta configurar el bucket. Pasos en docs/SEGURIDAD_Y_RESPALDOS.md:
//   1) crear el bucket (p. ej. gs://reypezapp-1ced2-respaldos) con regla de borrado a N días;
//   2) dar a la cuenta de servicio de Functions los roles "Cloud Datastore Import Export Admin"
//      y "Storage Object Admin" sobre ese bucket;
//   3) poner RESPALDO_BUCKET=gs://... en functions/.env y desplegar solo esta función:
//      firebase deploy --only functions:respaldoDiarioFirestore
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');

/**
 * Pide a Firestore un export completo de la base (default) al bucket indicado.
 * @returns {{ omitido: true, motivo: string } | { omitido: false, prefijo: string, operacion: string }}
 */
async function exportarFirestore({ projectId, bucket, cliente, ahora = new Date() }) {
  if (!bucket) return { omitido: true, motivo: 'RESPALDO_BUCKET sin configurar' };
  if (!/^gs:\/\/[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]\/?$/.test(bucket)) {
    throw new Error(`RESPALDO_BUCKET inválido: "${bucket}" (debe ser gs://nombre-del-bucket)`);
  }
  if (!projectId) throw new Error('No se pudo determinar el proyecto de Firebase');
  if (!cliente) {
    const { v1 } = require('@google-cloud/firestore');
    cliente = new v1.FirestoreAdminClient();
  }
  // Una carpeta por día (AAAA-MM-DD, hora de México) para poder elegir qué día restaurar.
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(ahora);
  const prefijo = `${bucket.replace(/\/$/, '')}/firestore/${dia}`;
  const [operacion] = await cliente.exportDocuments({
    name: cliente.databasePath(projectId, '(default)'),
    outputUriPrefix: prefijo,
    collectionIds: [] // vacío = todas las colecciones
  });
  return { omitido: false, prefijo, operacion: operacion && operacion.name };
}

const respaldoDiarioFirestore = onSchedule(
  { schedule: '15 3 * * *', timeZone: 'America/Mexico_City', retryCount: 1, memory: '256MiB' },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
      || JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId;
    const resultado = await exportarFirestore({ projectId, bucket: process.env.RESPALDO_BUCKET || '' });
    if (resultado.omitido) logger.warn(`Respaldo de Firestore omitido: ${resultado.motivo}`);
    else logger.info('Respaldo de Firestore solicitado', resultado);
  }
);

module.exports = { respaldoDiarioFirestore, exportarFirestore };
