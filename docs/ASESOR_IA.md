# Asesor Experto (IA) — Guía de activación

La pestaña **🦐 Asesor Experto** en Análisis de Stock usa una Cloud Function de Firebase
(`asesorExperto`, en `functions/`) que llama al API de Claude (Anthropic) con un resumen
del inventario real. La API key vive como **secreto del servidor** — nunca en el código
ni en el navegador.

## Requisitos

- Proyecto Firebase `reypezapp-1ced2` en plan **Blaze** (ya está).
- Una API key de Anthropic: crea una en https://platform.claude.com → API Keys.
- Firebase CLI instalado: `npm install -g firebase-tools`.

## Pasos para activar (una sola vez)

Desde la raíz del proyecto:

```bash
# 1. Iniciar sesión en Firebase
firebase login

# 2. Instalar dependencias de la función
cd functions && npm install && cd ..

# 3. Guardar la API key como secreto (te la va a pedir en pantalla; pégala ahí)
firebase functions:secrets:set ANTHROPIC_API_KEY

# 4. Desplegar la función
firebase deploy --only functions
```

Con eso el asesor queda funcionando en la app (el sitio en Heroku no necesita ningún
cambio de configuración; el frontend llama la función directamente vía el SDK de Firebase).

## Actualizaciones posteriores

- Si cambias el código de `functions/index.js`: `firebase deploy --only functions`.
- Si necesitas rotar la API key: repite el paso 3 y vuelve a desplegar (paso 4).
- Ver logs de la función: `firebase functions:log --only asesorExperto`.

## Costos aproximados

- Modelo: Claude Opus 4.8 ($5 / millón de tokens de entrada, $25 / millón de salida).
- Una consulta típica (resumen de inventario + respuesta) cuesta ~$0.04–0.05 USD.
- El prompt del sistema usa caché, así que las preguntas seguidas salen más baratas.
- Cloud Functions en Blaze: centavos al mes a este volumen.

## Cómo funciona

1. La app arma un resumen JSON del inventario (stock FIFO por medida, vendido 30d,
   consumo diario, cobertura, último precio de compra) leyendo `sacadas` de Firestore
   — la misma lógica que usa Análisis de Stock.
2. Manda `{ pregunta, contexto, historial }` a la Cloud Function.
3. La función llama a Claude con un prompt de asesor experto en camarón e inventarios
   y regresa la respuesta, que se muestra en el chat.
