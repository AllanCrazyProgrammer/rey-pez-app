# Regresión visual de PDFs

Herramientas para comprobar que una actualización de librerías de PDF (jsPDF,
jspdf-autotable, html2pdf.js) no cambia cómo se ven los reportes. Se usaron para
pasar de jsPDF 2.5.2 a 4.2.1: todos los PDFs salieron **idénticos pixel por pixel**.
No tocan Firebase: los datos son de ejemplo.

Requiere `pdftoppm` (poppler-utils) y Python con Pillow para comparar.

## 1. Generadores de `src/utils/pdf` en Node

```bash
# carpeta con node_modules de la versión A (p. ej. la del repo) y de la B
node scripts/pdf-regresion/generar.cjs . /tmp/pdf-A
node scripts/pdf-regresion/generar.cjs /ruta/con/otra/version /tmp/pdf-B
python3 scripts/pdf-regresion/comparar.py /tmp/pdf-A /tmp/pdf-B
```

Cubre `autoTable(doc, …)` (Análisis de pedido limpio, 3 páginas) y
`doc.autoTable(…)` (Resumen de taras).

## 2. Pantallas reales en el navegador (bundle de producción)

```bash
npm run build:web
node scripts/pdf-regresion/serve.cjs dist 5051 &
node scripts/pdf-regresion/taras-browser.cjs 5051 /tmp/B/taras.pdf     # Taras (jsPDF + autotable)
node scripts/pdf-regresion/fletes-browser.cjs 5051 /tmp/B/fletes.pdf   # Cuenta de Fletes (html2pdf.js)
```

Repite con un `dist/` de la versión anterior en otro puerto (p. ej. un
`git worktree` del commit previo) y compara las carpetas con `comparar.py`.
Ojo: si instalas ese worktree con `npm ci --ignore-scripts`, corre después
`node node_modules/pinia/node_modules/vue-demi/scripts/postinstall.js`, o pinia
quedará en modo Vue 3 y la app no arrancará.
