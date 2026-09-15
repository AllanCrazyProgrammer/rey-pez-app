<template>
  <div class="dictado-campo">
    <div class="dictado-encabezado">
      <label :for="id">{{ etiqueta }}</label>
      <button
        type="button"
        class="dictado-boton"
        :class="{ 'dictado-boton--activo': activo }"
        :disabled="!disponible || deshabilitado || deteniendo || (bloqueado && !activo)"
        :aria-pressed="activo"
        :aria-label="(activo ? 'Detener dictado en ' : 'Dictar en ') + etiqueta"
        :aria-describedby="id + '-ayuda'"
        @click="alternarDictado"
      >
        <i :class="activo ? 'fas fa-stop' : 'fas fa-microphone'" aria-hidden="true"></i>
        {{ deteniendo ? 'Terminando…' : activo ? 'Detener' : 'Dictar' }}
      </button>
    </div>
    <textarea
      :id="id"
      :value="value"
      :disabled="deshabilitado"
      :aria-describedby="id + '-ayuda'"
      rows="3"
      class="dictado-textarea"
      @input="$emit('input', $event.target.value)"
    ></textarea>
    <p :id="id + '-ayuda'" class="dictado-ayuda" role="status">
      {{ ayuda }}
    </p>
    <p v-if="provisional" class="dictado-provisional">{{ provisional }}</p>
    <p v-if="error" class="dictado-error" role="alert">{{ error }}</p>
  </div>
</template>

<script>
export default {
  name: 'DictadoTextarea',
  props: {
    value: { type: String, default: '' },
    id: { type: String, required: true },
    etiqueta: { type: String, required: true },
    bloqueado: { type: Boolean, default: false },
    deshabilitado: { type: Boolean, default: false },
  },
  data() {
    return {
      disponible: false,
      activo: false,
      escuchando: false,
      deteniendo: false,
      provisional: '',
      error: '',
    };
  },
  computed: {
    ayuda() {
      if (!this.disponible)
        return 'El dictado no está disponible en este navegador. Puedes escribir aquí.';
      if (this.deteniendo) return 'Terminando la transcripción…';
      if (this.activo)
        return this.escuchando
          ? 'Escuchando en español. Pulsa Detener cuando termines.'
          : 'Activando micrófono… Permite el acceso si el navegador lo solicita.';
      if (this.bloqueado) return 'Detén el dictado del otro campo para usar este micrófono.';
      return 'Dicta en español o escribe. El texto se agrega al final; puedes corregirlo antes de guardar.';
    },
  },
  mounted() {
    this.disponible = !!(
      window.isSecureContext &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  },
  beforeDestroy() {
    this.liberarDictado();
  },
  methods: {
    liberarDictado() {
      clearTimeout(this.temporizador);
      const reconocimiento = this.reconocimiento;
      this.reconocimiento = null;
      if (reconocimiento) {
        reconocimiento.onstart =
          reconocimiento.onresult =
          reconocimiento.onerror =
          reconocimiento.onend =
            null;
        try {
          reconocimiento.abort();
        } catch (_) {
          /* Ya terminó. */
        }
      }
      this.activo = this.escuchando = this.deteniendo = false;
      this.provisional = '';
      this.$emit('dictando', false);
    },
    alternarDictado() {
      if (this.deshabilitado || this.deteniendo || !this.disponible) return;
      if (this.activo) {
        this.deteniendo = true;
        try {
          this.reconocimiento.stop();
          this.temporizador = setTimeout(() => {
            this.liberarDictado();
            this.error =
              'El dictado tardó en terminar. Revisa el texto y vuelve a dictar si falta algo.';
          }, 5000);
        } catch (_) {
          this.liberarDictado();
        }
        return;
      }
      if (this.bloqueado) return;
      const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.error = '';
      this.provisional = '';
      const procesados = new Set();
      try {
        const reconocimiento = new Reconocimiento();
        this.reconocimiento = reconocimiento;
        reconocimiento.lang = 'es-MX';
        reconocimiento.continuous = true;
        reconocimiento.interimResults = true;
        reconocimiento.onstart = () => {
          this.escuchando = true;
        };
        reconocimiento.onresult = (evento) => {
          if (this.reconocimiento !== reconocimiento) return;
          const finales = [];
          const pendientes = [];
          for (let i = 0; i < evento.results.length; i++) {
            const resultado = evento.results[i];
            const texto = resultado[0].transcript.trim();
            if (resultado.isFinal) {
              if (!procesados.has(i)) {
                procesados.add(i);
                if (texto) finales.push(texto);
              }
            } else if (texto) pendientes.push(texto);
          }
          if (finales.length) {
            const anterior = this.value || '';
            const separador = anterior && !/\s$/.test(anterior) ? ' ' : '';
            this.$emit('input', anterior + separador + finales.join(' '));
          }
          this.provisional = pendientes.join(' ');
        };
        reconocimiento.onerror = (evento) => {
          const mensajes = {
            'not-allowed':
              'Permite el acceso al micrófono en los ajustes del navegador y vuelve a intentarlo.',
            'service-not-allowed':
              'El navegador no permite el servicio de dictado. Prueba en Chrome o escribe el texto.',
            'audio-capture': 'No se encontró un micrófono disponible. Revisa que esté conectado.',
            'no-speech': 'No se detectó voz. Acércate al micrófono y vuelve a intentarlo.',
            network:
              'No se pudo conectar al servicio de dictado. Revisa tu conexión y vuelve a intentarlo.',
            'language-not-supported': 'Este navegador no admite el dictado en español.',
          };
          this.error =
            mensajes[evento.error] ||
            'El dictado se interrumpió. Revisa el texto y vuelve a intentarlo.';
          this.liberarDictado();
        };
        reconocimiento.onend = () => {
          this.liberarDictado();
        };
        this.activo = true;
        this.$emit('dictando', true);
        reconocimiento.start();
      } catch (_) {
        this.liberarDictado();
        this.error = 'No se pudo iniciar el micrófono. Vuelve a intentarlo o escribe el texto.';
      }
    },
  },
};
</script>

<style scoped>
.dictado-encabezado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 7px;
}
.dictado-encabezado label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #425e53;
}
.dictado-boton {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #cddcd2;
  border-radius: 8px;
  min-height: 44px;
  padding: 8px 12px;
  background: #eff7f2;
  color: #17664e;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.dictado-boton:hover {
  background: #dfefe5;
}
.dictado-boton--activo {
  background: #fce8e8;
  color: #a33232;
  border-color: #e6b8b8;
}
.dictado-boton--activo:hover {
  background: #f8dada;
}
.dictado-boton:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.dictado-boton:focus-visible,
.dictado-textarea:focus-visible {
  outline: 3px solid #378c73;
  outline-offset: 3px;
}
.dictado-textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 82px;
  padding: 10px 11px;
  border: 1px solid #cddcd2;
  border-radius: 8px;
  background: #fff;
  color: #173b36;
  font: inherit;
  font-size: 14px;
  resize: vertical;
}
.dictado-ayuda {
  color: #61766e;
  font-size: 12px;
  line-height: 1.5;
  margin: 6px 0 0;
}
.dictado-provisional {
  background: #eff7f2;
  border-left: 3px solid #43816d;
  padding: 10px;
  color: #425e53;
  font-size: 14px;
  margin: 8px 0 0;
  overflow-wrap: anywhere;
}
.dictado-error {
  color: #973b30;
  font-size: 13px;
  line-height: 1.5;
  margin: 8px 0 0;
}
@media (max-width: 760px) {
  .dictado-textarea {
    font-size: 16px;
  }
}
</style>
