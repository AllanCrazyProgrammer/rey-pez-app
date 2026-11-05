// Login anterior (TRANSICIÓN): usuarios y contraseñas escritos en el código.
//
// Solo se incluye en la app mientras VUE_APP_LOGIN_LOCAL no sea "off". Sirve para que nadie
// quede fuera mientras se crean las cuentas de Firebase Auth. Con VUE_APP_LOGIN_LOCAL=off este
// archivo no entra al build y las contraseñas dejan de estar en el código publicado.
// Ver docs/SEGURIDAD_Y_RESPALDOS.md.
const USERS = [
  { username: 'allan', password: 'noseno' },
  { username: 'edgar', password: 'noseno' },
];

export function validarLoginLocal(username, password) {
  return USERS.some(u => u.username === username && u.password === password);
}
