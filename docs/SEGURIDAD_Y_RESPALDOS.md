# Seguridad de Firebase y respaldos

## Estado (5 de noviembre de 2026)

- ✅ **Reglas publicadas**: Firestore, Realtime Database y Storage exigen sesión de Firebase
  Auth (`firestore.rules`, `database.rules.json`, `storage.rules`, iguales a
  `seguridad/propuesta/`). Comprobado: sin sesión, todo responde *permiso denegado*.
- ✅ **Login anterior apagado** (`VUE_APP_LOGIN_LOCAL=off`): las contraseñas ya no van en el build.
- ✅ Cuentas de Firebase Auth: `allan`, `edgar`, `mari` (`<usuario>@reypez.app`).
- ✅ Web (Firebase Hosting y Heroku) y escritorio (Mac y Windows) inician sesión en Firebase.
  El escritorio identifica sus peticiones de Auth con el dominio de la web
  (`electron/authReferer.js`), porque la llave del navegador tiene restricción de sitios web.
- ⏳ **App de Android**: el APK 0.3.20 ya inicia sesión en Firebase, pero la llave del navegador
  rechaza su origen (`https://localhost/`, el WebView de Capacitor): falta agregar
  `https://localhost/*` a sus referentes permitidos en Google Cloud → Credenciales.
- ⏳ Respaldo completo diario: listo en el código; falta publicar la función (sección 1, 3 pasos).
- ⏳ PDF a Google Drive desde la web: falta activar la Google Picker API (sección 1).
- ⏳ Siguiente nivel opcional: reglas por colección y App Check (paso 7).

La llave de API del navegador (Google Cloud → Credenciales) solo acepta: Heroku, localhost,
`reypezapp-1ced2.web.app`, `reypezapp-1ced2.firebaseapp.com` y el canal preview. Un dominio nuevo
(p. ej. uno propio) hay que agregarlo ahí o el inicio de sesión fallará.

**Regresar las reglas** (si algo deja de guardar): `git revert` del commit que las publicó y
`firebase deploy --only firestore:rules,database,storage`. Los datos no se tocan.

## Qué estaba expuesto (antes de publicar las reglas)

| Riesgo | Dónde | Consecuencia |
|---|---|---|
| Reglas abiertas (`if true`) | `firestore.rules`, `database.rules.json`, `storage.rules` | Cualquiera con la configuración de Firebase (viaja en el JavaScript público de la app) podía **leer, cambiar o borrar** toda la base y las fotos. |
| Contraseñas en el código del navegador | `src/services/loginLocal.js` (se elimina del build con `VUE_APP_LOGIN_LOCAL=off`) | Cualquiera que abriera las herramientas del navegador veía usuarios y contraseñas. |
| Sin respaldo automático propio | — | Un borrado accidental o malicioso no se puede deshacer desde la app (la papelera solo cubre lo que la app borra). |

## 1. Respaldos

Hay tres respaldos distintos; se complementan:

| Qué | Cuándo copia | Qué cubre | Dónde se ve |
|---|---|---|---|
| **Respaldo completo diario** (`functions/respaldo.js`) | Cada noche, 3:15 a. m. (México) | **Toda la base** | Embarques → Recuperación de emergencia (tarjeta "Respaldo completo de la base") |
| Copia al borrar un embarque (`respaldos_emergencia`) | Cada vez que alguien borra un embarque | Solo ese embarque | Embarques → Recuperación de emergencia ("Embarques borrados") |
| PDF de notas en Google Drive (botón ☁ Respaldos) | Al generar notas y reportes | Los PDF, no los datos | Tu carpeta de Drive |

### Respaldo completo diario: activarlo (una sola vez)

No hace falta crear nada: se guarda en la carpeta de Storage que el proyecto ya tiene (la de las
fotos), dentro de `respaldos/firestore/AAAA-MM-DD_HHMM`. Las reglas de Storage no dan acceso a
`respaldos/` desde la app. Los respaldos de más de 30 días se borran solos. Es de **solo lectura**
sobre la base. Probado con Google Cloud simulado: `node --test scripts/test-respaldo-firestore.cjs`.

1. Publicar la función (desde la raíz del repo):
   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions:respaldoDiarioFirestore
   ```
2. Probarlo ya, sin esperar a la noche (usa `admin-key.json`):
   ```bash
   node scripts/admin/respaldo-ahora.js
   ```
3. Revisar en la app: Embarques → Recuperación de emergencia → "✅ Último respaldo completo".

**Si aparece "Falta permiso para exportar la base"** (en la app o en el script): en Google Cloud →
IAM, dar el rol **Cloud Datastore Import Export Admin** a la cuenta que indica el mensaje. Para la
función diaria es `512757841511-compute@developer.gserviceaccount.com` (cuenta de servicio de
Cloud Functions); para el script, la cuenta de `admin-key.json`. En proyectos donde esa cuenta ya
tiene el rol *Editor* no hace falta.

Opcional en `functions/.env`: `RESPALDO_DIAS=60` (conservar más días), `RESPALDO_BUCKET=gs://otro`
(otro bucket) o `RESPALDO_BUCKET=off` (apagarlo).

**Restaurar** (manual, solo si hace falta; mejor primero en un proyecto de prueba):
```bash
gcloud firestore import gs://reypezapp-1ced2.firebasestorage.app/respaldos/firestore/AAAA-MM-DD_HHMM
```
El import **sobrescribe** los documentos con el mismo ID y no borra los que no estén en el
respaldo. Las fotos de Storage se protegen activando *Object Versioning* en su bucket.

### PDF en Google Drive desde la web

En la web, elegir la carpeta de Drive usa Google Picker con la llave de navegador del proyecto.
Requiere activar una vez la **Google Picker API**: Google Cloud → APIs y servicios → Biblioteca →
"Google Picker API" → Habilitar. Si esa llave tiene "Restricciones de API", agregar ahí también la
Google Picker API. En el escritorio no hace falta (usa su propia configuración de Google).

## 2. Cerrar el acceso a la base (en este orden)

Cambiar las reglas antes de que **todas** las instalaciones sepan iniciar sesión en
Firebase dejaría a los equipos viejos (web en caché, escritorio, Android) sin poder
guardar: sus escrituras pendientes quedarían rechazadas. Por eso va por fases:

1. **Cuentas.** En la consola de Firebase → Authentication → *Sign-in method*, activar
   *Correo/contraseña*. Luego crear una cuenta por persona con contraseñas **nuevas** de 8+
   caracteres (las actuales ya son públicas):
   ```bash
   node scripts/admin/crear-cuentas.js allan edgar mari # pide cada contraseña en la terminal
   node scripts/admin/crear-cuentas.js --actualizar allan   # para cambiar una contraseña
   ```
   La cuenta de `allan` es `allan@reypez.app` (el dominio se cambia con `AUTH_DOMINIO` en el
   script y `VUE_APP_AUTH_DOMINIO` en la app; no tiene que ser un correo real). El script solo
   escribe en Firebase Auth, nunca en Firestore. Ojo: la contraseña se ve mientras se escribe.
2. **App (ya hecho en esta rama, modo transición).** El login intenta primero Firebase Auth; si
   falla y `VUE_APP_LOGIN_LOCAL` no es `off`, todavía acepta el login anterior, así que se
   puede desplegar antes de crear las cuentas sin dejar a nadie fuera. Detalles importantes:
   - Firebase Auth se inicializa al arrancar, antes que Firestore (`src/firebase.js`).
     Firestore guarda los cambios hechos sin internet en una cola **por usuario**: si el
     usuario cambia con cambios pendientes, esos cambios dejan de subirse hasta que vuelva el
     usuario anterior (no se pierden). Por eso, antes de iniciar o cerrar sesión, la app espera
     a que se suba lo pendiente (`src/utils/cambioUsuarioFirestore.js`); si no puede (sin
     internet), no cambia de usuario: en transición entra con el login anterior y en modo
     final pide conectarse. Probado con el SDK real: `scripts/test-cambio-usuario-firestore.mjs`.
   - Después del primer inicio con internet, la sesión queda guardada en el equipo y la app
     funciona sin conexión. El **primer** inicio de sesión en un equipo sí necesita internet
     una vez que el login anterior se apague.
   - Pruebas con el emulador de Auth: `scripts/test-login-firebase.cjs` (8 casos: transición,
     final, sesión vieja, sin internet, contraseñas fuera del build).
3. **Desplegar la app a todos:** web (push a `master`), instaladores de escritorio y APK.
   Pedir a cada persona que **cierre sesión y vuelva a entrar con su cuenta nueva, con
   internet**. En la consola de Firebase → Authentication → *Users* se ve la última vez que
   entró cada cuenta: cuando todos aparezcan, seguir.
3b. **Apagar el login anterior:** poner `VUE_APP_LOGIN_LOCAL=off` en `.env`, volver a
   desplegar web, escritorio y APK. Las contraseñas viejas dejan de estar en el código
   publicado y cualquier sesión vieja sin cuenta de Firebase vuelve a la pantalla de inicio.
4. **Probar las reglas** con el emulador antes de publicarlas (**hecho el 5 nov 2026: 21/21
   pasan**). Necesita Java 21+ (firebase-tools ya no acepta versiones anteriores; en Mac:
   `brew install openjdk@21` y `export JAVA_HOME=/opt/homebrew/opt/openjdk@21`):
   ```bash
   npm run test:reglas                 # reglas propuestas: deben pasar todas
   REGLAS_DIR=. npm run test:reglas    # reglas actuales: fallan los 9 casos "sin sesión"
   ```
   `scripts/test-reglas-propuesta.cjs` levanta los emuladores con
   `seguridad/firebase.emulador.json` (proyecto `demo-reypez`, nunca el real) y prueba las rutas
   que usa la app: colecciones de Firestore con subcolecciones (`embarques`, `saldosCuentas`,
   `papelera`...), `presenciaEmbarques/` y `status/` en Realtime Database, y las fotos de
   `bitacoras/` (jpeg/png/webp ≤ 10 MB) y `journal/` en Storage. Sin sesión todo se rechaza;
   con sesión todo funciona igual que hoy. Notas:
   - Las reglas aceptan **cualquier** sesión de Firebase Auth. En Authentication → *Sign-in
     method* deja activado **solo** Correo/contraseña (nunca *Anónimo* ni registro abierto
     desde la app), o cualquiera podría crearse una sesión.
   - Las Cloud Functions (asistente, respaldo) usan el Admin SDK, que no pasa por las reglas.
   - Las fotos ya guardadas siguen viéndose: sus URLs de descarga llevan su propio token.
   - El script de cuentas también se probó con el emulador de Auth (crea, rechaza contraseñas
     cortas, no sobrescribe sin `--actualizar`, y la cuenta creada inicia sesión).
5. **Publicar las reglas propuestas** (`seguridad/propuesta/*`): copiarlas sobre
   `firestore.rules`, `database.rules.json` y `storage.rules`, y
   `firebase deploy --only firestore:rules,database,storage`.
6. **Vigilar 48 h** (errores `permission-denied` en la consola del navegador o en el
   escritorio). Regresar atrás es inmediato: volver a desplegar las reglas anteriores
   (`git show <commit>:firestore.rules`); los datos no se tocan.
7. Siguiente nivel (opcional): reglas por colección y **App Check**, para que solo la app
   oficial pueda hablar con Firebase.
