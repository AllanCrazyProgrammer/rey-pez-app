<template>
  <div class="asesor-page">
    <FondoMatrix class="matrix-bg" :opacity="0.5" />
    <div class="crt-overlay" aria-hidden="true"></div>

    <div class="asesor-container">
      <div class="header">
        <div class="header-left">
          <BackButton to="/existencias" />
          <h1 class="titulo" aria-label="Asesor Experto">
            <span class="titulo-icono" aria-hidden="true">🦐</span>
            <span class="glitch" aria-hidden="true" data-text="ASESOR_EXPERTO">ASESOR_EXPERTO</span>
            <span class="cursor-blink" aria-hidden="true">▊</span>
          </h1>
        </div>
        <span class="titulo-sub">// inteligencia de inventario · rey-pez</span>
      </div>

      <div class="terminal-frame">
        <div class="terminal">
          <div class="terminal-bar">
            <span class="terminal-dots" aria-hidden="true">
              <span class="dot dot-rojo"></span>
              <span class="dot dot-ambar"></span>
              <span class="dot dot-verde"></span>
            </span>
            <span class="terminal-title">asesor@rey-pez:~/inventario/camaron</span>
            <span class="terminal-net">
              <span class="led" aria-hidden="true"></span> EN LÍNEA
            </span>
          </div>

          <div class="terminal-body">
            <div v-if="mensajes.length === 0" class="boot-lines">
              <p class="boot-line">
                <span class="prompt-char">$</span> ./camaron_ia --contexto {{ diasContexto }}d
                <span class="boot-ok">[OK]</span>
              </p>
              <p class="boot-line">
                &gt; resumen de existencias y salidas reales cargado
                <span class="boot-ok">[OK]</span>
              </p>
              <p class="boot-line boot-hint">
                # Pregúntale al asesor sobre tu inventario de camarón: qué resurtir,
              </p>
              <p class="boot-line boot-hint">
                # qué medidas se mueven más, cobertura, compras.
              </p>
            </div>

            <div
              v-if="mensajes.length === 0 && (conversaciones.length > 0 || conversacionesCargando)"
              class="historial"
            >
              <h3 class="seccion-titulo">
                <span class="prompt-char">$</span> ls ~/conversaciones
              </h3>
              <p v-if="conversacionesCargando" class="historial-cargando">
                escaneando registros<span class="dots-anim"></span>
              </p>
              <div v-else class="historial-lista">
                <div
                  v-for="conv in conversaciones"
                  :key="conv.id"
                  class="historial-item"
                  @click="abrirConversacion(conv)"
                >
                  <div class="historial-info">
                    <span class="historial-item-titulo">
                      <span class="file-flecha" aria-hidden="true">&gt;</span> {{ conv.titulo }}
                    </span>
                    <span class="historial-item-fecha">
                      {{ formatearFecha(conv.actualizadaEn) }} · {{ (conv.mensajes || []).length }} mensajes
                    </span>
                  </div>
                  <button
                    type="button"
                    class="historial-borrar"
                    title="Eliminar conversación"
                    @click.stop="eliminarConversacion(conv)"
                  >
                    [x]
                  </button>
                </div>
              </div>
            </div>

            <div v-if="mensajes.length === 0" class="sugerencias">
              <h3 class="seccion-titulo">
                <span class="prompt-char">$</span> comandos_sugeridos
              </h3>
              <button
                v-for="sugerencia in sugerencias"
                :key="sugerencia"
                type="button"
                class="sugerencia-chip"
                :disabled="cargando"
                @click="enviarPregunta(sugerencia)"
              >
                <span class="chip-prefijo" aria-hidden="true">&gt;_</span> {{ sugerencia }}
              </button>
            </div>

            <div v-if="mensajes.length > 0" ref="conversacion" class="conversacion">
              <div
                v-for="(mensaje, idx) in mensajes"
                :key="idx"
                class="mensaje"
                :class="mensaje.rol === 'usuario' ? 'mensaje-usuario' : 'mensaje-asesor'"
              >
                <span class="mensaje-autor">
                  {{ mensaje.rol === 'usuario' ? 'tú@rey-pez:~$' : '[🦐 camaron.ia]' }}
                </span>
                <div class="mensaje-texto">{{ mensaje.texto }}</div>
              </div>
              <div v-if="cargando" class="mensaje mensaje-asesor">
                <span class="mensaje-autor">[🦐 camaron.ia]</span>
                <div class="mensaje-texto mensaje-pensando">
                  {{ estadoCargando.replace(/\.+$/, '') }}<span class="dots-anim"></span>
                </div>
              </div>
            </div>

            <div v-if="error" class="error-box">
              <span class="error-tag">[ERROR]</span> {{ error }}
            </div>

            <form class="pregunta-form" @submit.prevent="enviarPregunta(preguntaActual)">
              <label class="input-wrap">
                <span class="input-prompt" aria-hidden="true">&gt;_</span>
                <input
                  v-model="preguntaActual"
                  type="text"
                  class="pregunta-input"
                  placeholder="Ej: ¿Qué medidas me conviene resurtir esta semana?"
                  :disabled="cargando"
                  maxlength="1000"
                />
              </label>
              <button
                type="submit"
                class="preguntar-btn"
                :disabled="cargando || !preguntaActual.trim()"
              >
                {{ cargando ? 'PROCESANDO…' : 'EJECUTAR ▸' }}
              </button>
            </form>

            <div class="asesor-pie">
              <button
                v-if="mensajes.length > 0"
                type="button"
                class="pie-btn"
                :disabled="cargando"
                @click="nuevaConversacion"
              >
                [+] nueva conversación
              </button>
              <button
                type="button"
                class="pie-btn"
                :disabled="cargando"
                @click="refrescarContexto"
              >
                {{ contextoCargando ? '[↻] actualizando datos…' : '[↻] actualizar datos de inventario' }}
              </button>
            </div>
          </div>

          <div class="terminal-status">
            <span class="status-item status-online">
              <span class="led" aria-hidden="true"></span> SISTEMA ACTIVO
            </span>
            <span class="status-item">CTX: {{ diasContexto }}D</span>
            <span class="status-item">MSGS: {{ mensajes.length }}</span>
            <span v-if="contextoFecha" class="status-item status-fecha">
              DATOS AL {{ contextoFecha }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, functions } from '@/firebase';
import { construirContextoInventario } from '@/utils/contextoInventario';
import BackButton from '@/components/BackButton.vue';
import FondoMatrix from '@/components/FondoMatrix.vue';

export default {
  name: 'AsesorExperto',
  components: {
    BackButton,
    FondoMatrix
  },
  data() {
    return {
      diasContexto: 30,
      mensajes: [],
      preguntaActual: '',
      cargando: false,
      estadoCargando: 'Pensando...',
      error: '',
      contexto: null,
      contextoFecha: '',
      contextoCargando: false,
      conversaciones: [],
      conversacionesCargando: false,
      conversacionId: null,
      sugerencias: [
        '¿Qué medidas me conviene resurtir esta semana?',
        '¿Cuáles medidas se están moviendo más lento?',
        '¿Cómo está mi cobertura de inventario en general?'
      ]
    };
  },
  created() {
    this.cargarConversaciones();
  },
  methods: {
    async cargarConversaciones() {
      this.conversacionesCargando = true;
      try {
        const consulta = query(
          collection(db, 'conversacionesAsesor'),
          orderBy('actualizadaEn', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(consulta);
        this.conversaciones = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        console.error('Error al cargar conversaciones anteriores:', error);
      } finally {
        this.conversacionesCargando = false;
      }
    },

    abrirConversacion(conv) {
      this.mensajes = (conv.mensajes || []).map(m => ({ rol: m.rol, texto: m.texto }));
      this.conversacionId = conv.id;
      this.error = '';
      this.desplazarAlFinal();
    },

    async eliminarConversacion(conv) {
      if (!window.confirm(`¿Eliminar la conversación "${conv.titulo}"?`)) return;
      try {
        await deleteDoc(doc(db, 'conversacionesAsesor', conv.id));
        this.conversaciones = this.conversaciones.filter(c => c.id !== conv.id);
        if (this.conversacionId === conv.id) {
          this.nuevaConversacion();
        }
      } catch (error) {
        console.error('Error al eliminar la conversación:', error);
        this.error = 'No se pudo eliminar la conversación: ' + error.message;
      }
    },

    // Guarda (o actualiza) la conversación activa en Firestore. Si falla no
    // interrumpe el chat: solo queda registrado en consola.
    async guardarConversacion() {
      try {
        const ahora = new Date().toISOString();
        const mensajes = this.mensajes.map(m => ({ rol: m.rol, texto: m.texto }));
        let titulo;

        if (this.conversacionId) {
          const existente = this.conversaciones.find(c => c.id === this.conversacionId);
          titulo = existente ? existente.titulo : 'Conversación';
          await updateDoc(doc(db, 'conversacionesAsesor', this.conversacionId), {
            mensajes,
            actualizadaEn: ahora
          });
        } else {
          const primera = mensajes.find(m => m.rol === 'usuario');
          titulo = primera ? primera.texto.slice(0, 80) : 'Conversación';
          const ref = await addDoc(collection(db, 'conversacionesAsesor'), {
            titulo,
            mensajes,
            creadaEn: ahora,
            actualizadaEn: ahora
          });
          this.conversacionId = ref.id;
        }

        // Mantener la lista local al día, con la más reciente arriba.
        this.conversaciones = [
          { id: this.conversacionId, titulo, mensajes, actualizadaEn: ahora },
          ...this.conversaciones.filter(c => c.id !== this.conversacionId)
        ];
      } catch (error) {
        console.warn('No se pudo guardar la conversación:', error);
      }
    },

    formatearFecha(iso) {
      if (!iso) return '';
      const fecha = new Date(iso);
      if (isNaN(fecha.getTime())) return '';
      return fecha.toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    },

    async asegurarContexto() {
      if (this.contexto) return this.contexto;
      this.contextoCargando = true;
      this.estadoCargando = 'Leyendo tu inventario...';
      try {
        this.contexto = await construirContextoInventario(this.diasContexto);
        this.contextoFecha = new Date().toLocaleDateString('es-MX', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        return this.contexto;
      } finally {
        this.contextoCargando = false;
      }
    },

    async refrescarContexto() {
      this.contexto = null;
      this.error = '';
      try {
        await this.asegurarContexto();
      } catch (error) {
        console.error('Error al preparar el contexto del asesor:', error);
        this.error = 'No se pudieron leer los datos de inventario: ' + error.message;
      }
    },

    nuevaConversacion() {
      this.mensajes = [];
      this.conversacionId = null;
      this.error = '';
    },

    async enviarPregunta(texto) {
      const pregunta = (texto || '').trim();
      if (!pregunta || this.cargando) return;

      this.error = '';
      this.preguntaActual = '';
      // El historial que ve el asesor son los turnos previos, sin la pregunta nueva.
      const historial = this.mensajes.map(m => ({ rol: m.rol, texto: m.texto }));
      this.mensajes.push({ rol: 'usuario', texto: pregunta });
      this.cargando = true;
      this.desplazarAlFinal();

      try {
        const contexto = await this.asegurarContexto();
        this.estadoCargando = 'Pensando...';

        const llamarAsesor = httpsCallable(functions, 'asesorExperto', { timeout: 300000 });
        const resultado = await llamarAsesor({ pregunta, contexto, historial });

        let respuesta = resultado.data.respuesta;
        if (resultado.data.truncada) {
          respuesta += '\n\n(La respuesta se cortó por longitud; pide que continúe si necesitas más.)';
        }
        this.mensajes.push({ rol: 'asesor', texto: respuesta });
        this.guardarConversacion();
      } catch (error) {
        console.error('Error al consultar al asesor:', error);
        // Quitar la pregunta fallida para que el usuario pueda reintentar limpio.
        this.mensajes.pop();
        this.preguntaActual = pregunta;
        this.error = error.message || 'No se pudo consultar al asesor. Intenta de nuevo.';
      } finally {
        this.cargando = false;
        this.desplazarAlFinal();
      }
    },

    desplazarAlFinal() {
      this.$nextTick(() => {
        const contenedor = this.$refs.conversacion;
        if (contenedor) contenedor.scrollTop = contenedor.scrollHeight;
      });
    }
  }
};
</script>

<style scoped>
.asesor-page {
  --verde: #00ff66;
  --verde-claro: #a8ffcb;
  --verde-dim: rgba(0, 255, 102, 0.45);
  --verde-tenue: rgba(0, 255, 102, 0.12);
  --cian: #00e5ff;
  --rojo: #ff4d4d;
  --fondo: #020805;
  --panel: rgba(3, 12, 7, 0.92);
  --mono: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', Menlo, Consolas,
    'Courier New', monospace;

  position: relative;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  background: radial-gradient(ellipse at 50% -10%, #07160d 0%, var(--fondo) 60%);
  font-family: var(--mono);
  overflow-x: hidden;
}

.asesor-page ::selection {
  background: rgba(0, 255, 102, 0.35);
  color: #eafff2;
}

.matrix-bg {
  z-index: 0;
}

/* Capa CRT: scanlines, viñeta y barrido de luz. */
.crt-overlay {
  position: fixed;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.18) 0px,
    rgba(0, 0, 0, 0.18) 1px,
    transparent 1px,
    transparent 3px
  );
}

.crt-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.55) 100%);
}

.crt-overlay::after {
  content: '';
  position: absolute;
  top: -140px;
  left: 0;
  right: 0;
  height: 140px;
  background: linear-gradient(180deg, transparent, rgba(0, 255, 102, 0.06), transparent);
  animation: barrido 8s linear infinite;
  will-change: transform;
}

/* Anima transform (compositor) en vez de top para no forzar reflow continuo. */
@keyframes barrido {
  0% { transform: translateY(0); }
  100% { transform: translateY(calc(100vh + 280px)); }
}

.asesor-container {
  position: relative;
  z-index: 1;
  max-width: 940px;
  width: 100%;
}

.header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.asesor-page .btn-back {
  margin: 0;
  padding: 0.45em 1em;
  background: transparent;
  border: 1px solid var(--verde-dim);
  border-radius: 6px;
  color: var(--verde);
  font-family: var(--mono);
  font-size: 14px;
  text-shadow: 0 0 10px rgba(0, 255, 102, 0.6);
  transition: background-color 0.2s, box-shadow 0.2s, color 0.2s;
}

.asesor-page .btn-back::before {
  content: '‹ ';
}

.asesor-page .btn-back:hover {
  background: var(--verde-tenue);
  color: var(--verde-claro);
  box-shadow: 0 0 18px rgba(0, 255, 102, 0.35);
}

.titulo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--verde);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 0 6px rgba(0, 255, 102, 0.9), 0 0 24px rgba(0, 255, 102, 0.4);
}

.titulo-icono {
  filter: drop-shadow(0 0 8px rgba(0, 255, 102, 0.7));
}

.titulo-sub {
  color: rgba(168, 255, 203, 0.55);
  font-size: 13px;
  letter-spacing: 1px;
}

.cursor-blink {
  animation: parpadeo 1s steps(1) infinite;
}

@keyframes parpadeo {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

/* Efecto glitch del título: dos copias desplazadas que se recortan a ráfagas. */
.glitch {
  position: relative;
  display: inline-block;
}

.glitch::before,
.glitch::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  opacity: 0.8;
  /* Estado de reposo oculto: sin esto, con prefers-reduced-motion las dos
     copias de color quedarían visibles de forma permanente. */
  clip-path: inset(0 0 100% 0);
}

.glitch::before {
  color: var(--cian);
  animation: glitch-1 3.2s infinite steps(1);
}

.glitch::after {
  color: #ff2ea6;
  animation: glitch-2 2.7s infinite steps(1);
}

@keyframes glitch-1 {
  0%, 91%, 100% { clip-path: inset(0 0 100% 0); transform: none; }
  92% { clip-path: inset(10% 0 55% 0); transform: translate(-3px, -2px); }
  94% { clip-path: inset(60% 0 8% 0); transform: translate(3px, 1px); }
  96% { clip-path: inset(30% 0 45% 0); transform: translate(-2px, 2px); }
}

@keyframes glitch-2 {
  0%, 88%, 100% { clip-path: inset(0 0 100% 0); transform: none; }
  89% { clip-path: inset(65% 0 5% 0); transform: translate(3px, 2px); }
  92% { clip-path: inset(15% 0 70% 0); transform: translate(-3px, -1px); }
  95% { clip-path: inset(42% 0 30% 0); transform: translate(2px, -2px); }
}

/* Marco con borde de gradiente animado alrededor de la terminal. */
.terminal-frame {
  padding: 1px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    rgba(0, 255, 102, 0.7),
    rgba(0, 229, 255, 0.3),
    rgba(0, 255, 102, 0.1),
    rgba(0, 255, 102, 0.7)
  );
  background-size: 300% 300%;
  animation: flujo-borde 9s ease infinite;
  box-shadow: 0 0 45px rgba(0, 255, 102, 0.14), 0 20px 60px rgba(0, 0, 0, 0.6);
}

@keyframes flujo-borde {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.terminal {
  background: var(--panel);
  border-radius: 11px;
  overflow: hidden;
  backdrop-filter: blur(3px);
}

.terminal-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.55);
  border-bottom: 1px solid var(--verde-tenue);
}

.terminal-dots {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot-rojo {
  background: #ff5f57;
  box-shadow: 0 0 8px rgba(255, 95, 87, 0.8);
}

.dot-ambar {
  background: #febc2e;
  box-shadow: 0 0 8px rgba(254, 188, 46, 0.8);
}

.dot-verde {
  background: #28c840;
  box-shadow: 0 0 8px rgba(40, 200, 64, 0.8);
}

.terminal-title {
  flex: 1;
  color: rgba(168, 255, 203, 0.7);
  font-size: 13px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.terminal-net {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--verde);
  font-size: 11px;
  letter-spacing: 1.5px;
  flex-shrink: 0;
}

.led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--verde);
  animation: pulso-led 1.6s ease-in-out infinite;
}

@keyframes pulso-led {
  0%, 100% { box-shadow: 0 0 4px var(--verde); opacity: 1; }
  50% { box-shadow: 0 0 14px var(--verde); opacity: 0.55; }
}

.terminal-body {
  padding: 20px;
}

.boot-lines {
  margin-bottom: 18px;
}

.boot-line {
  margin: 0 0 4px 0;
  color: var(--verde-claro);
  font-size: 14px;
  opacity: 0;
  animation: aparecer 0.45s ease forwards;
}

.boot-line:nth-child(1) { animation-delay: 0.05s; }
.boot-line:nth-child(2) { animation-delay: 0.25s; }
.boot-line:nth-child(3) { animation-delay: 0.45s; }
.boot-line:nth-child(4) { animation-delay: 0.6s; }

@keyframes aparecer {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

.boot-ok {
  color: var(--verde);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(0, 255, 102, 0.7);
}

.boot-hint {
  color: rgba(168, 255, 203, 0.5);
  font-style: italic;
}

.prompt-char {
  color: var(--cian);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
}

.seccion-titulo {
  margin: 0 0 10px 0;
  color: var(--verde);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(0, 255, 102, 0.5);
}

.historial {
  margin-bottom: 18px;
}

.historial-cargando {
  margin: 0;
  color: rgba(168, 255, 203, 0.55);
  font-size: 13px;
}

.historial-lista {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
}

.historial-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: rgba(0, 255, 102, 0.04);
  border: 1px solid var(--verde-tenue);
  border-left: 3px solid var(--verde-dim);
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}

.historial-item:hover {
  background: var(--verde-tenue);
  border-color: var(--verde-dim);
  border-left-color: var(--verde);
  transform: translateX(4px);
  box-shadow: 0 0 18px rgba(0, 255, 102, 0.15);
}

.historial-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.historial-item-titulo {
  color: var(--verde-claro);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-flecha {
  color: var(--cian);
}

.historial-item-fecha {
  color: rgba(168, 255, 203, 0.45);
  font-size: 12px;
}

.historial-borrar {
  flex-shrink: 0;
  background: none;
  border: none;
  color: rgba(255, 77, 77, 0.55);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  transition: color 0.2s, text-shadow 0.2s;
}

.historial-borrar:hover {
  color: var(--rojo);
  text-shadow: 0 0 10px rgba(255, 77, 77, 0.8);
}

.sugerencias {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 18px;
}

.sugerencia-chip {
  background: rgba(0, 255, 102, 0.04);
  border: 1px solid var(--verde-dim);
  border-radius: 6px;
  padding: 9px 14px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 13px;
  color: var(--verde-claro);
  text-align: left;
  transition: background-color 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s;
}

.chip-prefijo {
  color: var(--verde);
  font-weight: 700;
  margin-right: 4px;
}

.sugerencia-chip:hover:not(:disabled) {
  background: var(--verde);
  color: #02160a;
  transform: translateX(6px);
  box-shadow: 0 0 22px rgba(0, 255, 102, 0.5);
}

.sugerencia-chip:hover:not(:disabled) .chip-prefijo {
  color: #02160a;
}

.sugerencia-chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.conversacion {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 480px;
  overflow-y: auto;
  padding: 14px;
  margin-bottom: 15px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--verde-tenue);
  border-radius: 8px;
}

.mensaje {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  animation: aparecer 0.3s ease;
}

.mensaje-usuario {
  align-self: flex-end;
  background: rgba(0, 229, 255, 0.06);
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-right: 3px solid var(--cian);
}

.mensaje-asesor {
  align-self: flex-start;
  background: rgba(0, 255, 102, 0.05);
  border: 1px solid var(--verde-tenue);
  border-left: 3px solid var(--verde);
}

.mensaje-autor {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
}

.mensaje-usuario .mensaje-autor {
  color: var(--cian);
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.5);
}

.mensaje-asesor .mensaje-autor {
  color: var(--verde);
  text-shadow: 0 0 8px rgba(0, 255, 102, 0.5);
}

.mensaje-texto {
  color: #d7ffe9;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

.mensaje-pensando {
  color: rgba(168, 255, 203, 0.7);
  font-style: italic;
}

/* Puntos suspensivos animados estilo terminal. */
.dots-anim::after {
  content: '';
  animation: puntos 1.2s steps(1) infinite;
}

@keyframes puntos {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
}

.pregunta-form {
  display: flex;
  gap: 10px;
}

.input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--verde-dim);
  border-radius: 6px;
  padding: 0 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-wrap:focus-within {
  border-color: var(--verde);
  box-shadow: 0 0 18px rgba(0, 255, 102, 0.25), inset 0 0 12px rgba(0, 255, 102, 0.06);
}

.input-prompt {
  color: var(--verde);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(0, 255, 102, 0.7);
  flex-shrink: 0;
}

.pregunta-input {
  flex: 1;
  padding: 11px 0;
  background: transparent;
  border: none;
  font-family: var(--mono);
  font-size: 14px;
  color: var(--verde-claro);
  caret-color: var(--verde);
}

.pregunta-input::placeholder {
  color: rgba(168, 255, 203, 0.35);
}

.pregunta-input:focus {
  outline: none;
}

.preguntar-btn {
  background: transparent;
  color: var(--verde);
  border: 1px solid var(--verde);
  border-radius: 6px;
  padding: 10px 20px;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  text-shadow: 0 0 8px rgba(0, 255, 102, 0.6);
  transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
}

.preguntar-btn:hover:not(:disabled) {
  background: var(--verde);
  color: #02160a;
  text-shadow: none;
  box-shadow: 0 0 26px rgba(0, 255, 102, 0.55);
}

.preguntar-btn:disabled {
  border-color: rgba(168, 255, 203, 0.25);
  color: rgba(168, 255, 203, 0.35);
  text-shadow: none;
  cursor: not-allowed;
}

.error-box {
  background: rgba(255, 77, 77, 0.08);
  border: 1px solid rgba(255, 77, 77, 0.5);
  border-left: 3px solid var(--rojo);
  color: #ffb3b3;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 13px;
  box-shadow: 0 0 18px rgba(255, 77, 77, 0.15);
}

.error-tag {
  color: var(--rojo);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(255, 77, 77, 0.7);
}

.asesor-pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.pie-btn {
  background: none;
  border: 1px solid var(--verde-tenue);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 12px;
  color: rgba(168, 255, 203, 0.6);
  transition: border-color 0.2s, color 0.2s, box-shadow 0.2s;
}

.pie-btn:hover:not(:disabled) {
  border-color: var(--verde-dim);
  color: var(--verde);
  box-shadow: 0 0 14px rgba(0, 255, 102, 0.15);
}

.pie-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.terminal-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.55);
  border-top: 1px solid var(--verde-tenue);
  font-size: 11px;
  letter-spacing: 1.5px;
  color: rgba(168, 255, 203, 0.5);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.status-online {
  color: var(--verde);
}

.status-fecha {
  margin-left: auto;
}

/* Scrollbars a juego con la terminal. */
.historial-lista::-webkit-scrollbar,
.conversacion::-webkit-scrollbar {
  width: 8px;
}

.historial-lista::-webkit-scrollbar-track,
.conversacion::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.historial-lista::-webkit-scrollbar-thumb,
.conversacion::-webkit-scrollbar-thumb {
  background: var(--verde-dim);
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .asesor-page *,
  .asesor-page *::before,
  .asesor-page *::after {
    animation: none !important;
    transition: none !important;
  }
}

@media (max-width: 768px) {
  .pregunta-form {
    flex-direction: column;
  }

  .mensaje {
    max-width: 100%;
  }

  .titulo {
    font-size: 20px;
  }

  .status-fecha {
    margin-left: 0;
  }
}
</style>
