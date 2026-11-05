# Seguridad

`propuesta/` contiene reglas de Firebase **no desplegadas** (requieren sesión de Firebase
Auth). `firebase.json` sigue usando las reglas de la raíz. Antes de usarlas, sigue el orden
de [docs/SEGURIDAD_Y_RESPALDOS.md](../docs/SEGURIDAD_Y_RESPALDOS.md): publicarlas antes de
que todas las instalaciones inicien sesión en Firebase bloquearía el guardado.
