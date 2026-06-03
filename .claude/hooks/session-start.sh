#!/bin/bash
# SessionStart hook: prepara el entorno para previsualizar la app con capturas.
# - Instala dependencias del proyecto (necesarias para el dev server).
# - Instala Playwright (para tomar capturas con un navegador headless).
# - Detecta el Chromium preinstalado del entorno y lo deja disponible.
#
# Solo corre en Claude Code on the web (entorno remoto).
set -euo pipefail

# Solo en el entorno remoto; en local no hace falta.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

LOG=/tmp/session-start-hook.log
: > "$LOG"

echo "[session-start] Instalando dependencias del proyecto..." >&2
npm install >>"$LOG" 2>&1

# Playwright para las capturas de preview (no se guarda en package.json
# para no afectar el build/despliegue de la app).
echo "[session-start] Instalando Playwright para previews..." >&2
npm install playwright --no-save >>"$LOG" 2>&1 || true

# Detectar el Chromium preinstalado del entorno (Playwright no puede
# descargar navegadores aqui por la politica de red).
CHROME="$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)"
if [ -n "$CHROME" ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PREVIEW_CHROME=\"$CHROME\"" >> "$CLAUDE_ENV_FILE"
  echo "[session-start] Chromium para preview: $CHROME" >&2
fi

echo "[session-start] Entorno listo. Pide 'muestrame como se ve' para capturas." >&2
