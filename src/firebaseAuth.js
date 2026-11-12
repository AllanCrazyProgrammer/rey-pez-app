// Inicio de sesión con Firebase Auth (correo y contraseña). La instancia de Auth se crea en
// src/firebase.js al arrancar; aquí están las operaciones de sesión. La sesión se guarda en el
// equipo (IndexedDB), por eso después del primer inicio con internet funciona sin conexión.
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { waitForPendingWrites } from 'firebase/firestore';
import { auth, db } from './firebase';
import { puedeCambiarDeUsuario } from '@/utils/cambioUsuarioFirestore';

export { auth };

// Los usuarios escriben "allan"; la cuenta de Firebase es "allan@reypez.app".
export const DOMINIO_CUENTAS = process.env.VUE_APP_AUTH_DOMINIO || 'reypez.app';

export function correoDeUsuario(usuario) {
  const limpio = String(usuario || '').trim().toLowerCase();
  return limpio.includes('@') ? limpio : `${limpio}@${DOMINIO_CUENTAS}`;
}

export function usuarioDeCorreo(correo) {
  return String(correo || '').split('@')[0];
}

const correoActual = () => (auth.currentUser && auth.currentUser.email) || null;
const esperarPendientes = () => waitForPendingWrites(db);

export async function iniciarSesionFirebase(usuario, contrasena) {
  const correo = correoDeUsuario(usuario);
  // Antes de cambiar de usuario, subir lo pendiente; si no se puede, no cambiar (ver
  // src/utils/cambioUsuarioFirestore.js). El login de transición sigue disponible en ese caso.
  if (!(await puedeCambiarDeUsuario({ correoActual: correoActual(), correoDestino: correo, esperarPendientes }))) {
    const error = new Error('Hay cambios guardados en este equipo que todavía no se suben.');
    error.code = 'reypez/cambios-pendientes';
    throw error;
  }
  const { user } = await signInWithEmailAndPassword(auth, correo, String(contrasena || ''));
  return user;
}

// Cierra la sesión de Firebase solo si no deja cambios atascados. Si quedan pendientes (sin
// internet), la sesión de Firebase se conserva para que se suban en cuanto haya conexión; la app
// igual vuelve a la pantalla de inicio. Devuelve true si cerró la sesión de Firebase.
export async function cerrarSesionFirebase() {
  if (!correoActual()) return true;
  if (!(await puedeCambiarDeUsuario({ correoActual: correoActual(), correoDestino: null, esperarPendientes, ms: 5000 }))) {
    console.warn('[sesión] Hay cambios sin subir: se conserva la sesión de Firebase hasta que haya internet.');
    return false;
  }
  await signOut(auth);
  return true;
}

// Resuelve con el usuario guardado en el equipo (o null) en cuanto Auth termina de leerlo.
// No necesita internet.
export function esperarUsuarioFirebase() {
  return new Promise(resolve => {
    const dejar = onAuthStateChanged(auth, usuario => {
      dejar();
      resolve(usuario);
    });
  });
}

// Mensaje claro para la pantalla de inicio según el error de Firebase.
// El código entre paréntesis es el diagnóstico: si el inicio falla en un equipo
// concreto, ese código dice la causa real (sin él solo se ve el mensaje genérico).
export function mensajeErrorLogin(error) {
  const codigo = (error && error.code) || 'sin-codigo';
  if (codigo === 'reypez/cambios-pendientes') {
    return 'Hay cambios guardados en este equipo que todavía no se suben. Conéctate a internet y vuelve a intentar para no perderlos.';
  }
  if (codigo === 'auth/network-request-failed') {
    return 'Sin conexión: el primer inicio de sesión en este equipo necesita internet.';
  }
  if (codigo === 'auth/too-many-requests') {
    return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  }
  if (codigo === 'auth/user-disabled') {
    return 'Esta cuenta está desactivada. Pide que la reactiven.';
  }
  return `Usuario o contraseña incorrectos (${codigo})`;
}
