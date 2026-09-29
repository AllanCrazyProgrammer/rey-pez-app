# Maria · control laboral

Acceso: Procesos → Maria (`/procesos/maria`).

1. En Personal y horarios, dar de alta empleados con nombre, área, horario habitual y descanso. Desactivar conserva los registros.
2. Registrar cada jornada con fecha, estado y horario asignado. Las entradas/salidas reales se capturan explícitamente; no se copian del horario habitual.
3. Se permite una entrada pendiente de salida. La jornada no suma horas hasta completarse. Los turnos nocturnos requieren marcar la salida al día siguiente.
4. Corregir registros exige motivo; Historial muestra valores anteriores y nuevos, usuario y fecha del servidor.
5. Eliminar una jornada requiere confirmación y motivo. Se excluye de reportes y totales; el filtro Eliminados permite revisar su historial o restaurarla.
6. Consultar por periodo, empleado o estado. Exportar CSV o imprimir/guardar PDF desde el navegador.

## Persistencia

Colecciones `mariaEmployees` y `mariaAttendance`, cada documento con subcolección `history`. Una transacción guarda documento e historial juntos. El ID de jornada combina empleado y fecha: admite una jornada por persona y día. Las versiones previenen sobrescrituras simultáneas y duplicados. Guardar requiere conexión y una sesión con username; no se promete guardado offline. Los horarios habituales modificados no alteran jornadas anteriores.

## Alcance y limitaciones

- Captura administrativa manual; no checador biométrico ni prueba de identidad del trabajador.
- Las horas se interpretan como hora de pared local del centro laboral. No calcula nómina, pagos de horas extraordinarias ni ajustes por cambio de horario estacional.
- El tiempo sobre el horario asignado es una diferencia informativa.
- El usuario proviene de la sesión existente de la aplicación. Las reglas actuales de Firestore permiten acceso público: el historial no es inmutable ni existe protección de datos por usuario en el servidor. Antes de operar con información laboral real, implementar autenticación y reglas de acceso adecuadas para el proyecto.
- No representa una certificación de cumplimiento legal.

Verificación: `npm run test:maria` y `npm run build:web`. Las pruebas de transacción usan un almacén simulado; no escriben datos en Firebase.
