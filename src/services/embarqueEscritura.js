import { collection, doc, FieldPath, runTransaction, serverTimestamp } from 'firebase/firestore';
import { CAMPOS_EDITOR, equivalentes, integrarCamposEnBase, leerCampo, MENSAJE_CONFLICTO_EMBARQUE, planearEscritura } from '@/utils/embarqueRevision';
import { fusionarDocEditor } from '@/utils/embarqueFusion';

function crearErrorConflicto({ code, mensaje, camposEnConflicto, revRemota, camposPendientes }) {
  const error = new Error(mensaje || MENSAJE_CONFLICTO_EMBARQUE);
  error.code = code || 'embarque-modificado-externamente';
  error.camposEnConflicto = camposEnConflicto || [];
  error.camposPendientes = camposPendientes || {};
  error.revRemota = revRemota;
  return error;
}

function escribirActualizacion(transaction, ref, payload) {
  // Las tallas se escriben con FieldPath. Quitar una talla no manda delete():
  // el valor anterior permanece hasta una escritura explícita de esa medida.
  const planos = {};
  const especiales = [];
  Object.keys(payload).forEach(clave => {
    const punto = clave.indexOf('.');
    const padre = punto > 0 ? clave.slice(0, punto) : '';
    if (padre === 'kilosCrudos' || padre === 'rendimientoManual') {
      const medida = clave.slice(punto + 1);
      if (!String(medida).trim()) return;
      especiales.push(new FieldPath(padre, medida));
      especiales.push(payload[clave]);
      return;
    }
    planos[clave] = payload[clave];
  });
  if (!especiales.length) {
    transaction.update(ref, planos);
    return;
  }
  const args = [];
  Object.keys(planos).forEach(clave => {
    args.push(clave);
    args.push(planos[clave]);
  });
  transaction.update(ref, ...args, ...especiales);
}

function seleccionar(campos, claves) {
  const salida = {};
  (claves || []).forEach(clave => {
    if (campos && Object.prototype.hasOwnProperty.call(campos, clave)) salida[clave] = campos[clave];
  });
  return salida;
}

/**
 * Una escritura. La cola de afuera serializa las de la misma pestaña.
 */
async function escribirUnaVez(db, embarqueId, opciones) {
  const {
    baseRev = 0,
    baseCampos = null,
    campos = {},
    meta = {},
    respaldo = true,
    crearSiNoExiste = false,
    sinBase = 'conflicto',
    forzar = false,
  } = opciones;

  if (!Object.keys(campos).length) {
    return {
      rev: Number(baseRev) || 0,
      omitida: true,
      fusiono: false,
      remoto: null,
      camposEscritos: {},
      camposEnConflicto: [],
    };
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
        camposEnConflicto: Object.keys(campos),
        camposPendientes: campos,
      };
      return;
    }

    const plan = planearEscritura({ remoto, baseRev, baseCampos, campos, sinBase, forzar });
    if (plan.accion === 'omitir') {
      resultado = {
        rev: plan.rev,
        omitida: true,
        fusiono: false,
        remoto,
        camposEscritos: {},
        camposEnConflicto: [],
        camposCoincidentes: plan.camposCoincidentes || {},
      };
      return;
    }
    if (plan.accion === 'conflicto') {
      conflicto = {
        code: 'embarque-modificado-externamente',
        mensaje: MENSAJE_CONFLICTO_EMBARQUE,
        camposEnConflicto: plan.camposEnConflicto,
        camposPendientes: seleccionar(campos, plan.camposEnConflicto),
        revRemota: plan.rev,
      };
      if (respaldo && remoto) {
        transaction.set(backupRef, {
          embarqueOriginalId: embarqueId,
          datosOriginales: seleccionar(campos, plan.camposEnConflicto),
          fechaRespaldo: serverTimestamp(),
          razonRespaldo: 'conflicto_campos_embarque',
          camposEnConflicto: plan.camposEnConflicto,
          tipoRespaldo: 'emergencia',
          version: '1.0',
        });
      }
      return;
    }

    const payload = { ...plan.campos, ...meta, rev: plan.rev };
    if (forzar && remoto && respaldo) {
      const reemplazados = {};
      Object.keys(plan.campos).forEach(clave => {
        const remotoValor = leerCampo(remoto, clave);
        if (!equivalentes(remotoValor, plan.campos[clave])) reemplazados[clave] = remotoValor;
      });
      if (Object.keys(reemplazados).length) {
        transaction.set(backupRef, {
          embarqueOriginalId: embarqueId,
          datosOriginales: reemplazados,
          fechaRespaldo: serverTimestamp(),
          razonRespaldo: 'conservar_valor_ajeno',
          camposEnConflicto: Object.keys(reemplazados),
          tipoRespaldo: 'emergencia',
          version: '1.0',
        });
      }
    }
    if (remoto) escribirActualizacion(transaction, embarqueRef, payload);
    else transaction.set(embarqueRef, payload);
    if (!forzar && plan.camposEnConflicto.length && respaldo && remoto) {
      transaction.set(backupRef, {
        embarqueOriginalId: embarqueId,
        datosOriginales: seleccionar(campos, plan.camposEnConflicto),
        fechaRespaldo: serverTimestamp(),
        razonRespaldo: 'conflicto_campos_embarque',
        camposEnConflicto: plan.camposEnConflicto,
        tipoRespaldo: 'emergencia',
        version: '1.0',
      });
    }
    resultado = {
      rev: plan.rev,
      omitida: false,
      fusiono: plan.accion === 'fusionar' || plan.accion === 'parcial',
      remoto,
      camposEscritos: plan.campos,
      camposEnConflicto: plan.camposEnConflicto,
      camposCoincidentes: plan.camposCoincidentes || {},
    };
  });

  if (conflicto) throw crearErrorConflicto(conflicto);
  return resultado;
}

const CODIGOS_CONTENCION = new Set(['aborted', 'failed-precondition', 'already-exists']);

/** Otro editor confirmó entre nuestra lectura y nuestra escritura. */
export function esContencionFirestore(error) {
  return Boolean(error && CODIGOS_CONTENCION.has(error.code));
}

const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Subida del editor con fusión DENTRO de la transacción.
 *
 * Lee el documento, combina de tres vías (base, local, servidor) y escribe el
 * resultado en la misma transacción. Si otro editor confirma entre la lectura
 * y la escritura, se vuelve a leer y a combinar de inmediato con el estado
 * local más reciente: no se sale a esperar otro ciclo ni se abandona.
 *
 * @param {Function} opciones.capturar Devuelve `{ base, local, revBase,
 *   respaldar }` con el estado vigente; se llama en cada intento. Si lanza,
 *   la subida se cancela.
 * @returns {Promise<{escrito:boolean, creado?:boolean, rev:number,
 *   documento:Object, fusion:Object, captura:Object, remotoIgualABase:boolean}>}
 */
export async function escribirEdicionFusionada(db, embarqueId, opciones = {}) {
  const { capturar, meta = {}, intentos = 8 } = opciones;
  const embarqueRef = doc(db, 'embarques', embarqueId);
  for (let intento = 0; ; intento += 1) {
    const captura = capturar();
    let salida = null;
    try {
      await runTransaction(db, async (transaction) => {
        salida = null;
        const snapshot = await transaction.get(embarqueRef);
        if (!snapshot.exists()) {
          if ((Number(captura.revBase) || 0) > 0) {
            const error = new Error('El embarque fue eliminado en otro equipo. La copia local se conserva; no se volverá a crear automáticamente.');
            error.code = 'embarque-eliminado';
            throw error;
          }
          transaction.set(embarqueRef, { ...captura.local, ...meta, rev: 1 });
          salida = {
            creado: true, escrito: true, rev: 1, remotoIgualABase: true,
            documento: { ...captura.local, rev: 1 },
            fusion: { campos: captura.local, cambios: captura.local, omitidas: 0, conflictos: [] },
            captura,
          };
          return;
        }

        const remoto = snapshot.data();
        const revRemota = Number(remoto.rev) || 0;
        const fusion = fusionarDocEditor({ base: captura.base, local: captura.local, remoto });
        // Nadie más tocó los campos del editor: lo que hay en pantalla ya es
        // exactamente lo que queda en el servidor.
        const remotoIgualABase = Boolean(captura.base) &&
          CAMPOS_EDITOR.every(clave => equivalentes(leerCampo(captura.base, clave), leerCampo(remoto, clave)));

        // Respaldo solo cuando de verdad se descartó algo local (la misma
        // celda editada por dos personas). Antes se escribía un respaldo
        // completo en cada cruce de guardados, hubiera o no pérdida.
        const respaldado = Boolean(fusion.omitidas && captura.respaldar);
        if (respaldado) {
          transaction.set(doc(collection(db, 'respaldos_emergencia')), {
            embarqueOriginalId: embarqueId,
            datosOriginales: captura.completo || captura.local,
            fechaRespaldo: serverTimestamp(),
            razonRespaldo: 'cambios_locales_antes_de_combinar',
            camposEnConflicto: fusion.conflictos.slice(0, 50),
            tipoRespaldo: 'emergencia',
            version: '1.0',
          });
        }

        if (!Object.keys(fusion.cambios).length) {
          salida = { escrito: false, rev: revRemota, documento: remoto, fusion, captura, remotoIgualABase, respaldado };
          return;
        }

        // JSON: sin `undefined` (Firestore los rechaza).
        const cambios = JSON.parse(JSON.stringify(fusion.cambios));
        transaction.update(embarqueRef, { ...cambios, ...meta, rev: revRemota + 1 });
        salida = {
          escrito: true, rev: revRemota + 1, remotoIgualABase, respaldado,
          documento: { ...remoto, ...cambios, rev: revRemota + 1 },
          fusion, captura,
        };
      }, { maxAttempts: 1 });
      salida.choques = intento;
      return salida;
    } catch (error) {
      if (!esContencionFirestore(error) || intento + 1 >= intentos) throw error;
      // Un choque significa que otro editor SÍ confirmó: no hay bucle que
      // romper, así que se reintenta enseguida. Solo si los choques se
      // acumulan se espera un poco, de forma desigual, para repartir turnos.
      if (intento >= 2) await pausa(Math.floor(Math.random() * 60 * (intento - 1)));
    }
  }
}

const colas = new Map();

function ajustarContraAnterior(opciones, ultimo) {
  if (!ultimo || ultimo.rev == null) return opciones;
  const baseCampos = integrarCamposEnBase(opciones.baseCampos, {
    ...(ultimo.camposCoincidentes || {}),
    ...(ultimo.camposEscritos || {}),
  });
  // Una fusión o un parcial no leyó el resto del documento: la rev nueva no
  // es nuestra base. Solo una escritura limpia (el servidor seguía en
  // nuestra revisión) autoriza a subir baseRev.
  if (ultimo.fusiono || (ultimo.camposEnConflicto && ultimo.camposEnConflicto.length)) {
    return { ...opciones, baseCampos };
  }
  if ((Number(opciones.baseRev) || 0) >= ultimo.rev) return { ...opciones, baseCampos };
  return { ...opciones, baseRev: ultimo.rev, baseCampos };
}

/**
 * Escrituras del mismo documento en esta pestaña entran en fila. La que ya
 * salió termina; la siguiente usa la revisión que esa dejó, así dos guardados
 * seguidos no se pelean entre sí. El valor más nuevo es el último de la fila.
 */
export function escribirCamposEmbarque(db, embarqueId, opciones = {}) {
  let estado = colas.get(embarqueId);
  if (!estado) {
    estado = { cadena: Promise.resolve(null), profundidad: 0 };
    colas.set(embarqueId, estado);
  }
  const detras = estado.profundidad > 0;
  estado.profundidad += 1;
  const registrada = estado.cadena.then(
    (ultimo) => escribirUnaVez(db, embarqueId, detras ? ajustarContraAnterior(opciones, ultimo) : opciones),
    () => escribirUnaVez(db, embarqueId, opciones)
  );
  estado.cadena = registrada.then(
    (resultado) => resultado,
    () => null
  );
  return registrada.finally(() => {
    estado.profundidad -= 1;
  });
}

/**
 * Varios embarques de un mismo pago (flete agrupado) se leen y se escriben
 * en una sola transacción. Si uno entra en conflicto, no queda ninguno marcado.
 */
export async function escribirCamposEmbarquesAtomico(db, operaciones = []) {
  if (!operaciones.length) return [];
  const backupRef = doc(collection(db, 'respaldos_emergencia'));
  let conflicto = null;
  let resultados = [];

  await runTransaction(db, async (transaction) => {
    conflicto = null;
    resultados = [];
    const planes = [];
    for (let i = 0; i < operaciones.length; i += 1) {
      const op = operaciones[i];
      const ref = doc(db, 'embarques', op.embarqueId);
      const snapshot = await transaction.get(ref);
      const remoto = snapshot.exists() ? snapshot.data() : null;
      if (!remoto) {
        conflicto = {
          code: 'embarque-eliminado',
          mensaje: 'Este embarque ya no existe. Recarga la página.',
          camposEnConflicto: Object.keys(op.campos || {}),
          camposPendientes: op.campos || {},
        };
        return;
      }
      const plan = planearEscritura({
        remoto,
        baseRev: op.baseRev,
        baseCampos: op.baseCampos,
        campos: op.campos,
        sinBase: op.sinBase || 'conflicto',
      });
      planes.push({ op, ref, plan });
    }

    const bloqueado = planes.find(item => item.plan.accion === 'conflicto' || item.plan.camposEnConflicto.length);
    if (bloqueado) {
      conflicto = {
        code: 'embarque-modificado-externamente',
        mensaje: MENSAJE_CONFLICTO_EMBARQUE,
        camposEnConflicto: bloqueado.plan.camposEnConflicto,
        camposPendientes: seleccionar(bloqueado.op.campos, bloqueado.plan.camposEnConflicto),
        revRemota: bloqueado.plan.rev,
      };
      transaction.set(backupRef, {
        embarqueOriginalId: bloqueado.op.embarqueId,
        datosOriginales: seleccionar(bloqueado.op.campos, bloqueado.plan.camposEnConflicto),
        fechaRespaldo: serverTimestamp(),
        razonRespaldo: 'conflicto_campos_embarque',
        camposEnConflicto: bloqueado.plan.camposEnConflicto,
        tipoRespaldo: 'emergencia',
        version: '1.0',
      });
      return;
    }

    planes.forEach(({ op, ref, plan }) => {
      if (plan.accion === 'omitir') {
        resultados.push({ embarqueId: op.embarqueId, rev: plan.rev, omitida: true });
        return;
      }
      transaction.update(ref, { ...plan.campos, ...(op.meta || {}), rev: plan.rev });
      resultados.push({ embarqueId: op.embarqueId, rev: plan.rev, omitida: false });
    });
  });

  if (conflicto) throw crearErrorConflicto(conflicto);
  return resultados;
}
