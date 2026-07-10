<template>
  <div class="asesor-page">
    <div class="asesor-container">
      <div class="header">
        <div class="header-left">
          <BackButton to="/existencias" />
          <h1>🦐 Asesor Experto</h1>
        </div>
      </div>

      <div class="form-card">
        <p class="form-descripcion">
          Pregúntale al asesor sobre tu inventario de camarón: qué resurtir, qué medidas se mueven
          más, cobertura, compras. El asesor recibe un resumen de tus existencias y salidas reales
          de los últimos {{ diasContexto }} días.
        </p>

        <div
          v-if="mensajes.length === 0 && (conversaciones.length > 0 || conversacionesCargando)"
          class="historial"
        >
          <h3 class="historial-titulo">Conversaciones anteriores</h3>
          <p v-if="conversacionesCargando" class="historial-cargando">Cargando conversaciones...</p>
          <div v-else class="historial-lista">
            <div
              v-for="conv in conversaciones"
              :key="conv.id"
              class="historial-item"
              @click="abrirConversacion(conv)"
            >
              <div class="historial-info">
                <span class="historial-item-titulo">{{ conv.titulo }}</span>
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
                ×
              </button>
            </div>
          </div>
        </div>

        <div v-if="mensajes.length === 0" class="sugerencias">
          <button
            v-for="sugerencia in sugerencias"
            :key="sugerencia"
            type="button"
            class="sugerencia-chip"
            :disabled="cargando"
            @click="enviarPregunta(sugerencia)"
          >
            {{ sugerencia }}
          </button>
        </div>

        <div v-if="mensajes.length > 0" ref="conversacion" class="conversacion">
          <div
            v-for="(mensaje, idx) in mensajes"
            :key="idx"
            class="mensaje"
            :class="mensaje.rol === 'usuario' ? 'mensaje-usuario' : 'mensaje-asesor'"
          >
            <span class="mensaje-autor">{{ mensaje.rol === 'usuario' ? 'Tú' : '🦐 Asesor' }}</span>
            <div class="mensaje-texto">{{ mensaje.texto }}</div>
          </div>
          <div v-if="cargando" class="mensaje mensaje-asesor">
            <span class="mensaje-autor">🦐 Asesor</span>
            <div class="mensaje-texto mensaje-pensando">{{ estadoCargando }}</div>
          </div>
        </div>

        <div v-if="error" class="error-box">{{ error }}</div>

        <form class="pregunta-form" @submit.prevent="enviarPregunta(preguntaActual)">
          <input
            v-model="preguntaActual"
            type="text"
            class="pregunta-input"
            placeholder="Ej: ¿Qué medidas me conviene resurtir esta semana?"
            :disabled="cargando"
            maxlength="1000"
          />
          <button
            type="submit"
            class="preguntar-btn"
            :disabled="cargando || !preguntaActual.trim()"
          >
            {{ cargando ? 'Pensando...' : 'Preguntar' }}
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
            Nueva conversación
          </button>
          <button
            type="button"
            class="pie-btn"
            :disabled="cargando"
            @click="refrescarContexto"
          >
            {{ contextoCargando ? 'Actualizando datos...' : 'Actualizar datos de inventario' }}
          </button>
          <span v-if="contextoFecha" class="pie-nota">
            Datos de inventario al {{ contextoFecha }}
          </span>
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

export default {
  name: 'AsesorExperto',
  components: {
    BackButton
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
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
}

.asesor-container {
  max-width: 900px;
  width: 100%;
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

h1 {
  color: #2c3e50;
  margin: 0;
  font-size: 24px;
}

.form-card {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
}

.form-descripcion {
  color: #666;
  margin: 0 0 15px 0;
  font-size: 14px;
}

.historial {
  margin-bottom: 18px;
}

.historial-titulo {
  color: #2c3e50;
  font-size: 15px;
  margin: 0 0 8px 0;
}

.historial-cargando {
  color: #888;
  font-size: 13px;
  font-style: italic;
  margin: 0;
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
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.historial-item:hover {
  border-color: #3498db;
  background-color: #eaf3fb;
}

.historial-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.historial-item-titulo {
  color: #2c3e50;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.historial-item-fecha {
  color: #888;
  font-size: 12px;
}

.historial-borrar {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #b0bec5;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 8px;
}

.historial-borrar:hover {
  color: #c0392b;
}

.sugerencias {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.sugerencia-chip {
  background-color: white;
  border: 1px solid #b8d9ef;
  border-radius: 16px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #2c3e50;
  transition: border-color 0.2s, background-color 0.2s;
}

.sugerencia-chip:hover:not(:disabled) {
  border-color: #3498db;
  background-color: #eaf3fb;
}

.conversacion {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 480px;
  overflow-y: auto;
  padding: 12px;
  margin-bottom: 15px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
}

.mensaje {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
}

.mensaje-usuario {
  align-self: flex-end;
  background-color: #eaf3fb;
  border: 1px solid #b8d9ef;
}

.mensaje-asesor {
  align-self: flex-start;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
}

.mensaje-autor {
  display: block;
  font-size: 11px;
  font-weight: bold;
  color: #7a8a99;
  margin-bottom: 4px;
}

.mensaje-texto {
  color: #2c3e50;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.45;
}

.mensaje-pensando {
  color: #7a8a99;
  font-style: italic;
}

.pregunta-form {
  display: flex;
  gap: 10px;
}

.pregunta-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  font-size: 14px;
}

.pregunta-input:focus {
  outline: none;
  border-color: #3498db;
}

.preguntar-btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.preguntar-btn:hover:not(:disabled) {
  background-color: #2980b9;
}

.preguntar-btn:disabled {
  background-color: #b0bec5;
  cursor: not-allowed;
}

.error-box {
  background-color: #fdecea;
  border: 1px solid #f5c6cb;
  color: #c0392b;
  border-radius: 5px;
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 14px;
}

.asesor-pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.pie-btn {
  background: none;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
}

.pie-btn:hover:not(:disabled) {
  border-color: #3498db;
  color: #3498db;
}

.pie-nota {
  font-size: 12px;
  color: #888;
}

@media (max-width: 768px) {
  .pregunta-form {
    flex-direction: column;
  }

  .mensaje {
    max-width: 100%;
  }
}
</style>
