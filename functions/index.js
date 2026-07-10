const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const Anthropic = require('@anthropic-ai/sdk');

// La API key vive como secreto de Firebase (nunca en el código ni en el navegador):
//   firebase functions:secrets:set ANTHROPIC_API_KEY
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

const MODELO = 'claude-opus-4-8';

const SYSTEM_PROMPT = `Eres el asesor experto de "Rey Pez", una comercializadora de camarón en México.
Tu especialidad es la comercialización de camarón (tallas/medidas como 16/20, 21/25, 31/40, 51/60, 71/90, 91/110, etc.)
y la gestión de inventarios de mariscos: rotación, días de cobertura, cuándo y cuánto resurtir,
qué medidas se desplazan más, precios de compra y estacionalidad del mercado camaronero mexicano.

Junto con cada pregunta recibirás un resumen del inventario real de la empresa en formato JSON
(dentro de <contexto_inventario>). Los kilos y consumos vienen de sus registros reales de entradas
y salidas. Úsalo como base de tus respuestas: cita números concretos del contexto cuando apliquen.

Reglas:
- Responde siempre en español, con tono directo y práctico, como un asesor de confianza.
- Da recomendaciones accionables con números (kilos, días, medidas específicas), no generalidades.
- Si el contexto no trae la información necesaria para responder con certeza, dilo claramente
  y explica qué dato haría falta; no inventes cifras.
- Los precios de mercado cambian; si te preguntan por precios actuales de mercado aclara que
  solo conoces los precios registrados en su inventario.
- Formato: texto plano con párrafos cortos y listas con guiones. No uses tablas ni encabezados markdown.
- Sé conciso: la respuesta típica debe caber en una pantalla de celular.`;

const MAX_TURNOS_HISTORIAL = 12;
const MAX_CARACTERES_PREGUNTA = 4000;
const MAX_CARACTERES_CONTEXTO = 60000;

exports.asesorExperto = onCall(
  {
    secrets: [anthropicApiKey],
    timeoutSeconds: 300,
    memory: '256MiB',
    cors: true,
  },
  async (request) => {
    const { pregunta, contexto, historial } = request.data || {};

    if (!pregunta || typeof pregunta !== 'string' || !pregunta.trim()) {
      throw new HttpsError('invalid-argument', 'Falta la pregunta.');
    }
    if (pregunta.length > MAX_CARACTERES_PREGUNTA) {
      throw new HttpsError('invalid-argument', 'La pregunta es demasiado larga.');
    }

    // Historial: [{ rol: 'usuario'|'asesor', texto: string }, ...]
    const turnosPrevios = Array.isArray(historial)
      ? historial
          .filter(
            (t) =>
              t &&
              typeof t.texto === 'string' &&
              t.texto.trim() &&
              (t.rol === 'usuario' || t.rol === 'asesor')
          )
          .slice(-MAX_TURNOS_HISTORIAL)
      : [];

    let contextoJson = '';
    if (contexto) {
      try {
        contextoJson = JSON.stringify(contexto);
      } catch (e) {
        contextoJson = '';
      }
      if (contextoJson.length > MAX_CARACTERES_CONTEXTO) {
        throw new HttpsError(
          'invalid-argument',
          'El contexto de inventario es demasiado grande.'
        );
      }
    }

    const messages = turnosPrevios.map((t) => ({
      role: t.rol === 'usuario' ? 'user' : 'assistant',
      content: t.texto,
    }));

    const mensajeFinal = contextoJson
      ? `<contexto_inventario>\n${contextoJson}\n</contexto_inventario>\n\n${pregunta.trim()}`
      : pregunta.trim();
    messages.push({ role: 'user', content: mensajeFinal });

    const client = new Anthropic({ apiKey: anthropicApiKey.value() });

    let response;
    try {
      response = await client.messages.create({
        model: MODELO,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new HttpsError(
          'failed-precondition',
          'La API key de Anthropic no es válida. Revisa el secreto ANTHROPIC_API_KEY.'
        );
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new HttpsError(
          'resource-exhausted',
          'El asesor está saturado en este momento. Intenta de nuevo en un minuto.'
        );
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new HttpsError(
          'unavailable',
          'No se pudo conectar con el servicio del asesor. Intenta de nuevo.'
        );
      }
      if (error instanceof Anthropic.APIError) {
        console.error('Error del API de Anthropic:', error.status, error.message);
        throw new HttpsError('internal', 'El asesor no pudo procesar la consulta.');
      }
      console.error('Error inesperado en asesorExperto:', error);
      throw new HttpsError('internal', 'Error inesperado del asesor.');
    }

    if (response.stop_reason === 'refusal') {
      return {
        respuesta:
          'No puedo ayudarte con esa consulta. Intenta reformularla enfocándote en tu inventario o en el mercado del camarón.',
        truncada: false,
      };
    }

    const respuesta = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!respuesta) {
      throw new HttpsError('internal', 'El asesor regresó una respuesta vacía.');
    }

    return {
      respuesta,
      truncada: response.stop_reason === 'max_tokens',
      uso: {
        tokensEntrada: response.usage.input_tokens,
        tokensSalida: response.usage.output_tokens,
      },
    };
  }
);
