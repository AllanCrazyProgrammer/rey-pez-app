// Firestore guarda las escrituras hechas sin internet en una cola POR USUARIO de Firebase Auth.
// Si el usuario cambia (iniciar o cerrar sesión, o entrar con otra cuenta) mientras hay
// escrituras pendientes, esas escrituras no se pierden pero dejan de subirse hasta que vuelva el
// usuario anterior (verificado con el SDK real: scripts/test-cambio-usuario-firestore.mjs).
//
// Por eso, antes de cambiar de usuario, se intenta subir todo lo pendiente. Si no se logra a
// tiempo (normalmente por falta de internet), NO se cambia de usuario.
export const ESPERA_PENDIENTES_MS = 8000;

/**
 * @param {object} p
 * @param {string|null} p.correoActual   correo del usuario de Firebase actual (null = sin usuario)
 * @param {string|null} p.correoDestino  correo del usuario al que se cambiará (null = cerrar sesión)
 * @param {() => Promise<void>} p.esperarPendientes  waitForPendingWrites(db)
 * @param {number} [p.ms]
 * @returns {Promise<boolean>} true si se puede cambiar de usuario sin dejar cambios atascados
 */
export async function puedeCambiarDeUsuario({ correoActual, correoDestino, esperarPendientes, ms = ESPERA_PENDIENTES_MS }) {
  const normalizar = c => (c ? String(c).trim().toLowerCase() : null);
  if (normalizar(correoActual) === normalizar(correoDestino)) return true; // mismo usuario: nada cambia
  let temporizador;
  const limite = new Promise(resolve => { temporizador = setTimeout(() => resolve(false), ms); });
  try {
    return await Promise.race([esperarPendientes().then(() => true, () => false), limite]);
  } finally {
    clearTimeout(temporizador);
  }
}
