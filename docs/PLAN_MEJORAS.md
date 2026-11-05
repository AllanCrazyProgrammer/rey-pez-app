# Plan de mejoras — Rey Pez

Plan de menos a más, ejecutado en la rama `ccr-04fe34c2-dzh6cs`. Regla para todos los
pasos: **no cambiar cómo se leen, calculan o guardan los datos** (colecciones, campos,
fórmulas). Cada paso se verificó contra una línea base tomada antes de tocar nada.

## Resultado

| Medida | Antes (`master`) | Después |
|---|---|---|
| JS+CSS que se descarga al abrir la app | 2.99 MB (697 KB gzip) | 1.86 MB (462 KB gzip) |
| `dist/` | 16 MB | 12 MB |
| Avisos de seguridad en dependencias de producción (`npm audit`) | 60 | 26 |
| `npm run lint` | no funcionaba | 0 errores, 220 advertencias |
| `tests/` | 102 de 104 | 110 de 110 |
| Rutas del build que abren sin errores (`scripts/recorrer-rutas.cjs`) | 82 de 82 | 82 de 82 |
| Herramientas | Vue CLI 4 / webpack 4 | Vue CLI 5 / webpack 5 (Vue 2.7) |

## Pasos hechos

1. **Basura de la raíz** fuera (salidas de consola guardadas por error, PNG de 0 bytes, placeholders).
2. **Código muerto**: 17 archivos de `src/` sin referencias y `public/vendor/` (2.5 MB que el service worker precargaba).
3. **13 dependencias sin uso** fuera (axios, express, pdfkit, vue-datepicker-next…).
4. **Lint** reparado; corregidos errores reales (comilla suelta en `@click.stop`, métodos duplicados).
5. **BootstrapVue selectivo**: arranque −37 %.
6. **Parches/menores** de librerías.
7. **Orden**: docs históricos a `docs/historial/`, scripts de admin (solo lectura) a `scripts/admin/`.
8. **Pruebas rotas en master**: la regla de taras de 25 kg (#179) era la correcta; la prueba era vieja.
9. **`Rendimientos/` y `reportDelivery`**: se conservan (las pruebas los usan); documentados.
10. **Toasts invisibles** (Bootstrap 5 + BootstrapVue 2) y × de modales arreglados.
11. **`SaleNote.vue`**: `</div>` sobrante quitado con la función render idéntica.
12. **56 imports sin usar** quitados (sin tocar módulos con efectos al importarse).
13. **firebase 10.14.1**: probado que las escrituras pendientes sin internet sobreviven al cambio de esquema de la caché (`scripts/verificar-migracion-cache-firestore.mjs`).
14. **Capacitor 6.2.3** (aviso crítico) y **Electron 39.8.10** (pruebas de escritorio sin red pasan).
15. **jsPDF 4.2.1 / autotable 5 / html2pdf.js 0.14**: PDFs idénticos pixel por pixel (`scripts/pdf-regresion/`).
16. **Rendimientos.vue**: 16 funciones puras a `src/utils/rendimientosCalculos.js` (163 casos equivalentes).
17. **Respaldo diario de Firestore** listo (apagado hasta configurar el bucket) y **reglas de seguridad propuestas** con plan por fases: `docs/SEGURIDAD_Y_RESPALDOS.md`.
18. **Vue CLI 5 / webpack 5**: rutas, service worker offline, PDFs, escritorio y Android verificados.

## Pendiente (requiere decisiones o equipos que no hay en el contenedor)

1. **Seguridad de Firebase** (lo más importante): seguir `docs/SEGURIDAD_Y_RESPALDOS.md`.
   Hoy las reglas son `if true` y las contraseñas del login están en el código del navegador.
2. **Activar el respaldo diario** (crear bucket + `functions/.env` + desplegar la función).
3. **Probar en equipos reales** antes de pasar a `master`: generar APK (Android SDK) e
   instaladores de escritorio, abrir un embarque sin internet y guardar.
4. **Pruebas que necesitan el emulador de Firestore** (asistente, embarques, sacadas): el
   contenedor no puede descargarlo; correrlas en una máquina con `firebase emulators`.
5. **`test-desktop-pdf`**: el caso del PDF de Rendimientos falla igual en `master`; revisar.
6. **Vue 3**: Vue 2 ya no tiene soporte. Siguiente etapa: reemplazar BootstrapVue (usa poco:
   modales, layout y formularios) y migrar por módulos con `@vue/compat`.
7. Seguir partiendo archivos grandes (`PedidoLimpioImpresion.vue`, `StashModalV2.vue`, `Sacadas.vue`
   tienen métodos puros listos para extraer) y bajar las 220 advertencias de lint.
