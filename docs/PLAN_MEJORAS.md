# Plan de mejoras — Rey Pez

Plan de menos a más. Regla para todos los pasos: **no cambiar cómo se leen,
calculan o guardan los datos** (colecciones, nombres de campos, fórmulas).
Cada paso se verifica con: `npm run build:web`, `npm run lint`,
`node --test tests/*.test.cjs` y los scripts de `scripts/test-*.cjs`
comparados contra la línea base (ninguno que pasaba puede empezar a fallar).

## Hecho en la rama `ccr-04fe34c2-dzh6cs`

| Paso | Qué | Resultado medido |
|---|---|---|
| 1 | Borrar archivos accidentales de la raíz (`tatus`, `rey-pez@0.1.0`, `vue-cli-service`, `config 12-25-35-222`, `path/`, `ruta/`, log vacío, 13 PNG de 0 bytes) | Repo más limpio |
| 2 | Borrar 17 archivos de `src/` que nadie importa + `public/vendor/` (pdfmake y fabric sin uso) | `dist/` 16 MB → 14 MB; ~2.5 MB menos en la precarga del service worker |
| 3 | Quitar 13 dependencias sin uso (axios, express, pdfkit, vue-datepicker-next, …) | Desaparece una segunda copia de Vue 3 del árbol |
| 4 | `npm run lint` vuelve a funcionar; corregidos errores reales (comilla suelta en `@click.stop`, métodos duplicados, componentes registrados sin usar) | 0 errores, 277 advertencias |
| 5 | BootstrapVue: registrar solo los plugins usados | Arranque 2.99 MB → 1.87 MB (697 → 445 KB gzip, −37 %) |
| 6 | Actualizar parches/menores (bootstrap, core-js, moment, pdfmake 0.2.x, pinia, …) | Vulnerabilidades en dependencias de producción: 60 → 34 |

Verificación de integridad: se listaron todas las rutas de Firestore/RTDB que
aparecen en el código antes y después. Solo desaparecieron `costos`,
`precios_globales` y `abonosAplicados_*`, que usaban únicamente los
componentes muertos `CostosModal` y `HistorialAbonosAplicadosModal` (ninguna
pantalla los abría). Los documentos en la base siguen intactos.

## Siguientes pasos (pendientes, de menos a más)

### Corto plazo (bajo riesgo)
1. **Decidir sobre `src/views/Embarques/Rendimientos/` y `src/utils/pdf/reportDelivery.js`.**
   La app no los usa (la ruta carga `Embarques/Rendimientos.vue`), pero
   `scripts/test-precios-alias-rutas.cjs` y `scripts/test-reportes-backup.cjs`
   los prueban. O se conectan, o se borran junto con esas pruebas.
2. **Pruebas que ya fallaban en `master`:** `tests/resumen-totales-pedido-limpio.test.cjs`
   (2 casos: maquila esperada 89 vs. 82.5 calculada, y un mock sin
   `normalizarClaveMedida`). Hay que confirmar si cambió la regla de negocio o
   si es un bug del cálculo.
3. **`$bvToast` en Preparación no se ve en pantalla** (ya pasaba antes de esta
   rama). Revisar CSS/z-index del toaster.
4. **`SaleNote.vue` tiene `</div>` desbalanceados** (Vue lo tolera). Arreglar
   con captura antes/después para no mover el diseño de la nota.
5. **Bajar advertencias de lint** por módulo (189 variables/imports sin usar,
   33 props mutadas).
6. Mover los `.md` sueltos de la raíz a `docs/` y los scripts de admin
   (`get-existencias.js`, `test-*.js` de la raíz) a `scripts/admin/`.

### Mediano plazo (requiere probar en tu equipo/celular)
7. **firebase 10.12 → 10.14** (última 10.x). Se dejó fuera porque la app usa
   caché offline persistente y desde el contenedor no se puede conectar a
   Firebase. Probar: abrir embarques sin internet, guardar, reconectar.
8. **Electron 39.2 → 39.8** y **Capacitor 6.1 → 6.2.x** (avisos críticos de
   seguridad en `@capacitor/android`/`ios` < 6.2.1). Alinear las 5 piezas de
   Capacitor a la misma versión y generar APK/instaladores de prueba.
9. **jsPDF 2.5 → 3.x** (avisos de seguridad) con comparación visual de los PDF.
10. Partir los archivos gigantes (`Rendimientos.vue` 5.6k líneas,
    `PedidoLimpioImpresion.vue`, `StashModalV2.vue` 4.2k) extrayendo la
    lógica pura a `src/utils/` con pruebas, como ya se hizo con `saldosCuentas`.

### Largo plazo (el que más protege tus datos)
11. **Reglas de seguridad de Firebase.** Hoy `firestore.rules` y
    `database.rules.json` permiten leer y escribir todo a cualquiera
    (`if true`). La configuración de Firebase viaja en el JavaScript público,
    así que cualquiera con la URL podría leer o borrar la base. Plan: Firebase
    Auth (el login propio puede emitir un custom token o usar auth anónima) →
    reglas `request.auth != null` → luego reglas por colección.
12. **Respaldos automáticos de Firestore** (export programado a Cloud Storage
    con `gcloud firestore export` o una Cloud Function con horario).
13. **Vue 2 terminó soporte (dic 2023) y Vue CLI 4 está descontinuado.**
    Migración por etapas a Vue 3 + Vite; requiere reemplazar BootstrapVue
    (no soporta Vue 3) y es el paso más grande.
