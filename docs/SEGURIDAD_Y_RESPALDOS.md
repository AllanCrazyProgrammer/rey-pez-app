# Seguridad de Firebase y respaldos

Estado al 5 de noviembre de 2026 y plan para cerrarlo **sin perder datos**. Nada de
esto se activó solo: las reglas propuestas no están en `firebase.json` y el respaldo
está apagado hasta configurar un bucket.

## Qué está expuesto hoy

| Riesgo | Dónde | Consecuencia |
|---|---|---|
| Reglas abiertas (`if true`) | `firestore.rules`, `database.rules.json`, `storage.rules` | Cualquiera con la configuración de Firebase (viaja en el JavaScript público de la app) puede **leer, cambiar o borrar** toda la base y las fotos. |
| Contraseñas en el código del navegador | `src/services/loginLocal.js` (se elimina del build con `VUE_APP_LOGIN_LOCAL=off`) | Cualquiera que abra las herramientas del navegador ve usuarios y contraseñas. El login solo protege la pantalla, no los datos. |
| Sin respaldo automático propio | — | Un borrado accidental o malicioso no se puede deshacer desde la app (la papelera solo cubre lo que la app borra). |

## 1. Respaldo diario (hacerlo primero; es independiente de lo demás)

La función `respaldoDiarioFirestore` (`functions/respaldo.js`) pide a Google un export
completo de Firestore a Cloud Storage todos los días a las 03:15 (hora de México).
Es de **solo lectura** sobre la base. Probada con un cliente simulado:
`node --test scripts/test-respaldo-firestore.cjs`.

1. Crear el bucket (misma región que Firestore) y una regla de ciclo de vida que borre
   respaldos de más de, por ejemplo, 30 días:
   ```bash
   gcloud storage buckets create gs://reypezapp-1ced2-respaldos --project=reypezapp-1ced2 --location=<región de Firestore>
   ```
2. Dar a la cuenta de servicio de Cloud Functions
   (`<número>-compute@developer.gserviceaccount.com`) los roles
   **Cloud Datastore Import Export Admin** (proyecto) y **Storage Object Admin** (bucket).
3. Crear `functions/.env` (está en `.gitignore`) con:
   ```
   RESPALDO_BUCKET=gs://reypezapp-1ced2-respaldos
   ```
4. Desplegar solo esa función: `firebase deploy --only functions:respaldoDiarioFirestore`.
5. Al día siguiente, comprobar que existe `gs://.../firestore/AAAA-MM-DD/` y revisar los
   logs (`firebase functions:log --only respaldoDiarioFirestore`).

Restaurar (manual, solo si hace falta, idealmente primero en un proyecto de prueba):
```bash
gcloud firestore import gs://reypezapp-1ced2-respaldos/firestore/AAAA-MM-DD
```
El import **sobrescribe** los documentos con el mismo ID; no borra los que no estén en
el respaldo. Las fotos de Storage se protegen activando *Object Versioning* en su bucket.

## 2. Cerrar el acceso a la base (en este orden)

Cambiar las reglas antes de que **todas** las instalaciones sepan iniciar sesión en
Firebase dejaría a los equipos viejos (web en caché, escritorio, Android) sin poder
guardar: sus escrituras pendientes quedarían rechazadas. Por eso va por fases:

1. **Cuentas.** En la consola de Firebase → Authentication → *Sign-in method*, activar
   *Correo/contraseña*. Luego crear una cuenta por persona con contraseñas **nuevas** de 8+
   caracteres (las actuales ya son públicas):
   ```bash
   node scripts/admin/crear-cuentas.js allan edgar      # pide cada contraseña en la terminal
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
4. **Probar las reglas** con el emulador antes de publicarlas:
   `firebase emulators:start --only firestore,database,storage` usando los archivos de
   `seguridad/propuesta/`.
5. **Publicar las reglas propuestas** (`seguridad/propuesta/*`): copiarlas sobre
   `firestore.rules`, `database.rules.json` y `storage.rules`, y
   `firebase deploy --only firestore:rules,database,storage`.
6. **Vigilar 48 h** (errores `permission-denied` en la consola del navegador o en el
   escritorio). Regresar atrás es inmediato: volver a desplegar las reglas anteriores
   (`git show <commit>:firestore.rules`); los datos no se tocan.
7. Siguiente nivel (opcional): reglas por colección y **App Check**, para que solo la app
   oficial pueda hablar con Firebase.
