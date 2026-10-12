import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { MENSAJE_CONFLICTO_EMBARQUE, planearEscritura } from '@/utils/embarqueRevision';

function crearErrorConflicto({ code, mensaje, camposEnConflicto, revRemota }) {
  const error = new Error(mensaje || MENSAJE_CONFLICTO_EMBARQUE);
  error.code = code || 'embarque-modificado-externamente';
  error.camposEnConflicto = camposEnConflicto || [];
  error.revRemota = revRemota;
  return error;
}

/**
 * Escribe campos de un embarque dentro de una transacción.
 * Sube `rev` solo si realmente cambia algo. Si otra pantalla cambió otros
 * campos, fusiona. Si cambió estos mismos, no escribe el embarque: deja un
 * respaldo y lanza `embarque-modificado-externamente`.
 */
export async function escribirCamposEmbarque(db, embarqueId, opciones = {}) {
  const {
    baseRev = 0,
    baseCampos = null,
    campos = {},
    meta = {},
    respaldo = true,
    crearSiNoExiste = false,
  } = opciones;

  if (!Object.keys(campos).length) {
    return { rev: Number(baseRev) || 0, omitida: true, fusiono: false, remoto: null };
  }

  const embarqueRef = doc(db, 'embarques', embarqueId);
  const backupRef = doc(collection(db, 'respaldos_emergencia'));
  let conflicto = null;
  let resultado = null;

  await runTransaction(db, async (transaction) => {
    conflicto = null;
    resultado = null;
    const snapshot = await transaction.get(embarqueRef);
    const remoto = snapshot.exists() ? snapshot.data() : null;

    if (!remoto && !crearSiNoExiste) {
      conflicto = {
        code: 'embarque-eliminado',
        mensaje: 'Este embarque ya no existe. Recarga la página.',
      };
      return;
    }

    const plan = planearEscritura({ remoto, baseRev, baseCampos, campos });
    if (plan.accion === 'omitir') {
      resultado = { rev: plan.rev, omitida: true, fusiono: false, remoto };
      return;
    }
    if (plan.accion === 'conflicto') {
      conflicto = {
        code: 'embarque-modificado-externamente',
        mensaje: MENSAJE_CONFLICTO_EMBARQUE,
        camposEnConflicto: plan.camposEnConflicto,
        revRemota: plan.rev,
      };
      if (respaldo && remoto) {
        transaction.set(backupRef, {
          embarqueOriginalId: embarqueId,
          datosOriginales: campos,
          fechaRespaldo: serverTimestamp(),
          razonRespaldo: 'conflicto_campos_embarque',
          camposEnConflicto: plan.camposEnConflicto,
          tipoRespaldo: 'emergencia',
          version: '1.0',
        });
      }
      return;
    }

    const payload = { ...campos, ...meta, rev: plan.rev };
    if (remoto) transaction.update(embarqueRef, payload);
    else transaction.set(embarqueRef, payload);
    resultado = {
      rev: plan.rev,
      omitida: false,
      fusiono: plan.accion === 'fusionar',
      remoto,
    };
  });

  if (conflicto) throw crearErrorConflicto(conflicto);
  return resultado;
}
