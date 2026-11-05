# Rendimientos modular (no conectado a rutas)

La ruta `/embarques/rendimientos/:id` carga **`../Rendimientos.vue`**, no esta
carpeta. Esta versión modular (servicio, composables, tarjetas) no entra al
bundle de la app, pero se conserva porque las pruebas la usan como referencia
de paridad con la pantalla real:

- `scripts/test-precios-alias-rutas.cjs` compara cómo agrupan alias de precios
  `RendimientosService` / `useGanancias` contra `Rendimientos.vue`.

Si algún día se conecta, debe reemplazar a `Rendimientos.vue` en
`src/router.js` y pasar esas pruebas. Si se decide borrarla, hay que quitar
también los casos de prueba que la cargan.
