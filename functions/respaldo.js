// Respaldo diario de TODA la base Firestore (export administrado de Google).
//
// Es una operación de SOLO LECTURA sobre la base: Google copia los documentos a Cloud Storage;
// nada se modifica ni se borra en Firestore. Restaurar es un paso manual aparte
// (gcloud firestore import), nunca automático. Ver docs/SEGURIDAD_Y_RESPALDOS.md.
//
// Sin configuración: se guarda en la carpeta de Storage que el proyecto ya tiene (la de las
// fotos), dentro de respaldos/firestore/AAAA-MM-DD_HHMM. Las reglas de Storage no dan acceso a
// respaldos/ desde la app, así que solo se ve desde la consola de Google.
// Opcional en functions/.env:
//   RESPALDO_BUCKET=gs://otro-bucket   para usar otro bucket
//   RESPALDO_BUCKET=off                para apagarlo
//   RESPALDO_DIAS=30                   cuántos días se conservan (por defecto 30)
//
// Al terminar escribe el resultado en el documento sistema/respaldos (Firestore), que la
// pantalla de Recuperación de emergencia muestra: último respaldo completo o el error.
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');

const PREFIJO = 'respaldos/firestore';
const DOC_ESTADO = 'sistema/respaldos';
const DIAS_POR_DEFECTO = 30;
const FORMATO_DIA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' });
const FORMATO_HORA = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Bucket destino (sin gs://) o null si el respaldo está apagado. */
function resolverBucket({ valorEnv, bucketDelProyecto }) {
  const valor = String(valorEnv || '').trim();
  if (valor.toLowerCase() === 'off') return null;
  if (valor) {
    if (!/^gs:\/\/[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]\/?$/.test(valor)) {
      throw new Error(`RESPALDO_BUCKET inválido: "${valor}" (debe ser gs://nombre-del-bucket u off)`);
    }
    return valor.replace(/^gs:\/\//, '').replace(/\/$/, '');
  }
  if (!bucketDelProyecto) throw new Error('No se encontró la carpeta de Storage del proyecto; define RESPALDO_BUCKET.');
  return bucketDelProyecto;
}

/** Carpeta del respaldo: respaldos/firestore/AAAA-MM-DD_HHMM (hora de México). */
function carpetaDelRespaldo(ahora = new Date()) {
  return `${PREFIJO}/${FORMATO_DIA.format(ahora)}_${FORMATO_HORA.format(ahora).replace(':', '')}`;
}

/**
 * Pide a Firestore un export completo de la base (default) y espera a que termine.
 * @returns {Promise<{ uri: string, operacion: string|null }>}
 */
async function exportarFirestore({ projectId, bucket, carpeta, cliente }) {
  if (!projectId) throw new Error('No se pudo determinar el proyecto de Firebase');
  const uri = `gs://${bucket}/${carpeta}`;
  const [operacion] = await cliente.exportDocuments({
    name: cliente.databasePath(projectId, '(default)'),
    outputUriPrefix: uri,
    collectionIds: [] // vacío = todas las colecciones
  });
  if (operacion && typeof operacion.promise === 'function') await operacion.promise();
  return { uri, operacion: (operacion && operacion.name) || null };
}

/**
 * Borra los respaldos de más de `dias` días. Solo toca archivos dentro de respaldos/firestore/
 * cuya carpeta empieza con una fecha AAAA-MM-DD; nunca el respaldo de hoy ni nada fuera de ahí.
 * @returns {Promise<string[]>} carpetas borradas
 */
async function limpiarRespaldosViejos({ storageBucket, dias, ahora = new Date() }) {
  const limite = new Date(`${FORMATO_DIA.format(ahora)}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - dias);
  const [archivos] = await storageBucket.getFiles({ prefix: `${PREFIJO}/` });
  const borradas = new Set();
  for (const archivo of archivos) {
    const partes = String(archivo.name || '').split('/');
    if (partes.length < 4 || `${partes[0]}/${partes[1]}` !== PREFIJO) continue;
    const fecha = (partes[2].match(/^(\d{4}-\d{2}-\d{2})(_\d{4})?$/) || [])[1];
    if (!fecha || new Date(`${fecha}T00:00:00Z`) >= limite) continue;
    await archivo.delete();
    borradas.add(partes.slice(0, 3).join('/'));
  }
  return [...borradas];
}

function mensajeDeError(error, cuentaServicio) {
  const texto = (error && error.message) || String(error);
  if (error && (error.code === 7 || /PERMISSION_DENIED|permission/i.test(texto))) {
    return `Falta permiso para exportar la base. En Google Cloud → IAM, da a ${cuentaServicio || 'la cuenta de servicio de Cloud Functions (NÚMERO-compute@developer.gserviceaccount.com)'} el rol "Cloud Datastore Import Export Admin" (ver docs/SEGURIDAD_Y_RESPALDOS.md). Detalle: ${texto}`;
  }
  return texto;
}

/**
 * Respaldo completo: export de Firestore, limpieza de respaldos viejos y estado en sistema/respaldos.
 * Las dependencias se inyectan para poder probarlo sin Google Cloud.
 */
async function ejecutarRespaldo({ projectId, bucket, cliente, storageBucket, db, dias = DIAS_POR_DEFECTO, ahora = new Date(), marcaServidor, cuentaServicio }) {
  const estado = db.doc(DOC_ESTADO);
  const carpeta = carpetaDelRespaldo(ahora);
  try {
    const { uri, operacion } = await exportarFirestore({ projectId, bucket, carpeta, cliente });
    let borradas = [];
    let avisoLimpieza = null;
    try {
      borradas = await limpiarRespaldosViejos({ storageBucket, dias, ahora });
    } catch (error) {
      avisoLimpieza = `El respaldo se hizo, pero no se pudieron borrar los viejos: ${error.message}`;
    }
    const resultado = {
      estado: 'completo', ultimoRespaldo: marcaServidor, ultimaCarpeta: uri, operacion,
      diasConservados: dias, carpetasBorradas: borradas.length, aviso: avisoLimpieza, error: null
    };
    await estado.set(resultado, { merge: true });
    return resultado;
  } catch (error) {
    const resultado = { estado: 'error', error: mensajeDeError(error, cuentaServicio), fechaError: marcaServidor, carpetaIntentada: `gs://${bucket}/${carpeta}` };
    await estado.set(resultado, { merge: true }).catch(() => {});
    error.resultado = resultado;
    throw error;
  }
}

function crearDependenciasReales() {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  const { v1 } = require('@google-cloud/firestore');
  return { admin, cliente: new v1.FirestoreAdminClient(), FieldValue: admin.firestore.FieldValue };
}

const respaldoDiarioFirestore = onSchedule(
  { schedule: '15 3 * * *', timeZone: 'America/Mexico_City', retryCount: 1, memory: '256MiB', timeoutSeconds: 540 },
  async () => {
    const config = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || config.projectId;
    const bucket = resolverBucket({ valorEnv: process.env.RESPALDO_BUCKET, bucketDelProyecto: config.storageBucket });
    if (!bucket) { logger.info('Respaldo de Firestore apagado (RESPALDO_BUCKET=off)'); return; }
    const dias = Math.max(1, Number(process.env.RESPALDO_DIAS) || DIAS_POR_DEFECTO);
    const { admin, cliente, FieldValue } = crearDependenciasReales();
    try {
      const resultado = await ejecutarRespaldo({
        projectId, bucket, cliente, dias,
        storageBucket: admin.storage().bucket(bucket),
        db: admin.firestore(),
        marcaServidor: FieldValue.serverTimestamp()
      });
      logger.info('Respaldo de Firestore completo', { carpeta: resultado.ultimaCarpeta, borradas: resultado.carpetasBorradas });
    } catch (error) {
      logger.error('Respaldo de Firestore falló', (error.resultado && error.resultado.error) || error.message);
      throw error;
    }
  }
);

module.exports = {
  respaldoDiarioFirestore, ejecutarRespaldo, exportarFirestore, limpiarRespaldosViejos,
  resolverBucket, carpetaDelRespaldo, PREFIJO, DOC_ESTADO
};
