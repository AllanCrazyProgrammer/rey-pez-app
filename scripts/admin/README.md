# Scripts de administración (solo lectura)

Consultas de diagnóstico contra Firestore con `firebase-admin`. **Ninguno
escribe**: solo leen colecciones y muestran resultados en consola.

Requieren la llave de servicio `admin-key.json` en la raíz del repo (está en
`.gitignore`, nunca se sube) y `firebase-admin` instalado aparte
(`npm install --no-save firebase-admin`).

```
node scripts/admin/test-read.js          # lista colecciones y 3 proveedores
node scripts/admin/get-existencias.js    # existencias de limpios como Existencias.vue
```
