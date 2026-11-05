#!/usr/bin/env node
// Crea (o actualiza con --actualizar) cuentas de Firebase Auth para el nuevo inicio de sesión.
// Solo escribe en Firebase Auth: no lee ni modifica ningún dato de Firestore.
//
// Uso (desde la raíz del repo, con admin-key.json presente):
//   node scripts/admin/crear-cuentas.js allan edgar
//   node scripts/admin/crear-cuentas.js --actualizar allan      # cambia la contraseña
// Pide la contraseña de cada usuario en la terminal (no queda en el historial). La cuenta es
// <usuario>@reypez.app (cambia el dominio con AUTH_DOMINIO=...; debe coincidir con
// VUE_APP_AUTH_DOMINIO de la app). Contraseñas de al menos 8 caracteres.
//
// Pruebas con el emulador de Auth: FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 (no usa la llave).
const path = require('path');
const readline = require('readline');

function cargarAdmin() {
  try { return require('firebase-admin'); }
  catch (_) { return require(path.join(__dirname, '../../functions/node_modules/firebase-admin')); }
}

// Lee respuestas línea por línea: funciona igual en la terminal y con entrada redirigida.
function crearLector() {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  const lineas = rl[Symbol.asyncIterator]();
  return {
    async preguntar(texto) {
      process.stdout.write(texto);
      const { value, done } = await lineas.next();
      return done ? '' : value;
    },
    cerrar() { rl.close(); }
  };
}

async function main() {
  const args = process.argv.slice(2);
  const actualizar = args.includes('--actualizar');
  const usuarios = args.filter(a => !a.startsWith('--')).map(u => u.trim().toLowerCase()).filter(Boolean);
  if (!usuarios.length) {
    console.error('Uso: node scripts/admin/crear-cuentas.js [--actualizar] usuario1 usuario2 ...');
    process.exit(2);
  }
  const dominio = process.env.AUTH_DOMINIO || 'reypez.app';
  const admin = cargarAdmin();
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-reypez' });
  } else {
    admin.initializeApp({ credential: admin.credential.cert(require('../../admin-key.json')) });
  }
  const auth = admin.auth();
  const lector = crearLector();
  let fallos = 0;
  for (const usuario of usuarios) {
    if (!/^[a-z0-9._-]+$/.test(usuario)) { console.error(`✗ ${usuario}: usa solo letras, números, punto, guion`); fallos++; continue; }
    const email = `${usuario}@${dominio}`;
    const password = (await lector.preguntar(`Contraseña para ${email}: `)).trim();
    if (password.length < 8) { console.error(`✗ ${email}: la contraseña debe tener al menos 8 caracteres`); fallos++; continue; }
    try {
      const existente = await auth.getUserByEmail(email).catch(e => (e.code === 'auth/user-not-found' ? null : Promise.reject(e)));
      if (existente && !actualizar) { console.error(`✗ ${email}: ya existe (usa --actualizar para cambiar su contraseña)`); fallos++; continue; }
      if (existente) {
        await auth.updateUser(existente.uid, { password });
        console.log(`✓ ${email}: contraseña actualizada`);
      } else {
        const nuevo = await auth.createUser({ email, password, displayName: usuario, emailVerified: true });
        console.log(`✓ ${email}: cuenta creada (uid ${nuevo.uid})`);
      }
    } catch (error) {
      console.error(`✗ ${email}: ${error.message}`); fallos++;
    }
  }
  lector.cerrar();
  process.exit(fallos ? 1 : 0);
}

main();
