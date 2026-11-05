# Seguridad

Las reglas **publicadas** son las de la raíz (`firestore.rules`, `database.rules.json`,
`storage.rules`), que usa `firebase.json`. `propuesta/` conserva la misma versión como referencia
y es lo que prueba `npm run test:reglas` (con `REGLAS_DIR=.` prueba las de la raíz).

Estado, historial y cómo regresar las reglas: [docs/SEGURIDAD_Y_RESPALDOS.md](../docs/SEGURIDAD_Y_RESPALDOS.md).
