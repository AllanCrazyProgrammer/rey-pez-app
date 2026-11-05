# Scripts de administración

Consultas de diagnóstico contra Firestore con `firebase-admin`: **solo leen**
colecciones y muestran resultados en consola. La excepción es `crear-cuentas.js`,
que crea o actualiza cuentas de **Firebase Auth** (nunca toca Firestore).

Requieren la llave de servicio `admin-key.json` en la raíz del repo (está en
`.gitignore`, nunca se sube) y `firebase-admin` instalado aparte
(`npm install --no-save firebase-admin`).

```
node scripts/admin/test-read.js          # lista colecciones y 3 proveedores
node scripts/admin/get-existencias.js    # existencias de limpios como Existencias.vue
node scripts/admin/crear-cuentas.js allan edgar   # cuentas de Firebase Auth (pide contraseñas)
```

Ver `docs/SEGURIDAD_Y_RESPALDOS.md` para el orden completo del cambio de inicio de sesión.
