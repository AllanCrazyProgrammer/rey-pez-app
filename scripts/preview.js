/**
 * Script de previsualizacion: abre la app en un navegador headless y guarda
 * una captura de pantalla. Pensado para usarse dentro de Claude Code on the web.
 *
 * Requisitos (los deja listos el hook .claude/hooks/session-start.sh):
 *   - Dependencias instaladas (npm install)
 *   - Playwright instalado (npm install playwright --no-save)
 *   - El dev server corriendo en http://localhost:8080 (npm start)
 *   - Un Chromium disponible (env PREVIEW_CHROME o /opt/pw-browsers/...)
 *
 * Uso:
 *   node scripts/preview.js [ruta] [archivoSalida] [ancho] [alto]
 * Ejemplos:
 *   node scripts/preview.js /barcos/entrada-producto?barco=galileo /tmp/preview.png
 *   node scripts/preview.js / /tmp/home.png 1280 900
 *
 * Nota: Firebase no conecta desde este entorno (la red bloquea el backend),
 * por lo que las vistas que dependen de datos remotos apareceran vacias.
 * Las vistas con estado local (formularios, editores) se ven perfectamente.
 */
const { chromium } = require('playwright');
const { execSync } = require('child_process');

function findChrome() {
  if (process.env.PREVIEW_CHROME) return process.env.PREVIEW_CHROME;
  try {
    const out = execSync('ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1')
      .toString().trim();
    if (out) return out;
  } catch (_) { /* ignore */ }
  return undefined; // Playwright usara su propio navegador si esta descargado
}

(async () => {
  const ruta = process.argv[2] || '/';
  const salida = process.argv[3] || '/tmp/preview.png';
  const width = parseInt(process.argv[4], 10) || 900;
  const height = parseInt(process.argv[5], 10) || 1100;
  const baseUrl = process.env.PREVIEW_BASE_URL || 'http://localhost:8080';
  const url = baseUrl + (ruta.startsWith('/') ? ruta : '/' + ruta);

  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });

  console.log('Abriendo', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => {
    console.log('Aviso al cargar (continuo de todas formas):', e.message);
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: salida, fullPage: true });
  console.log('Captura guardada en', salida);

  await browser.close();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
