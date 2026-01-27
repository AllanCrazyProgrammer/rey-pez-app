<template>
  <div v-if="mostrar" class="salidas-modal-backdrop" @click.self="cerrar">
    <div class="salidas-modal">
      <div class="modal-header">
        <h2 class="modal-title">Salidas Rendimientos</h2>
        <button class="btn-cerrar" type="button" @click="cerrar">x</button>
      </div>

      <p class="modal-subtitle">
        Kilos en crudo por medida en el periodo seleccionado.
      </p>

      <div class="rango-form">
        <label class="rango-field">
          <span>Fecha inicio</span>
          <input type="date" v-model="fechaInicio" />
        </label>
        <label class="rango-field">
          <span>Fecha fin</span>
          <input type="date" v-model="fechaFin" />
        </label>
        <button
          class="btn-calcular"
          type="button"
          :disabled="cargando || !rangoValido"
          @click="calcular"
        >
          {{ cargando ? 'Calculando...' : 'Calcular' }}
        </button>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>
      <div v-else-if="!cargando && resumenMedidasFull.length === 0 && rangoValido" class="empty-state">
        Sin datos de kilos en crudo en este periodo.
      </div>

      <div v-if="medidasDisponibles.length > 0" class="medidas-selector">
        <p class="selector-title">Selecciona medidas</p>
        <div class="selector-grid">
          <label v-for="medida in medidasDisponibles" :key="medida" class="selector-item">
            <input type="checkbox" :value="medida" v-model="medidasSeleccionadas" />
            <span>{{ medida }}</span>
          </label>
        </div>
      </div>

      <div v-if="medidasDisponibles.length > 0 && medidasSeleccionadas.length === 0" class="empty-state">
        Selecciona al menos una medida para ver resultados.
      </div>

      <div v-if="resumenFiltrado.length > 0" class="total-seleccion">
        <span>Total seleccionado:</span>
        <strong>{{ formatearNumero(totalSeleccionado) }} kg</strong>
      </div>

      <div v-if="resumenFiltrado.length > 0" class="resultados">
        <div v-for="item in resumenFiltrado" :key="item.medida" class="resultado-card">
          <div class="resultado-header">
            <span class="resultado-medida">{{ item.medida }}</span>
            <span class="resultado-total">{{ formatearNumero(item.total) }} kg</span>
          </div>
          <div v-if="item.partes.length" class="resultado-partes">
            <div v-for="parte in item.partes" :key="parte.label" class="resultado-parte">
              <span class="parte-label">{{ parte.label }}</span>
              <span class="parte-valor">{{ formatearNumero(parte.kilos) }} kg</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <span class="info-text">Embarques analizados: {{ embarquesAnalizados }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';

export default {
  name: 'SalidasRendimientosModal',
  props: {
    mostrar: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      fechaInicio: '',
      fechaFin: '',
      cargando: false,
      error: '',
      resumenMedidasFull: [],
      medidasSeleccionadas: [],
      embarquesAnalizados: 0
    };
  },
  computed: {
    rangoValido() {
      return Boolean(this.fechaInicio && this.fechaFin && this.fechaInicio <= this.fechaFin);
    },
    medidasDisponibles() {
      return this.resumenMedidasFull.map(item => item.medida);
    },
    resumenFiltrado() {
      if (this.medidasSeleccionadas.length === 0) return [];
      return this.resumenMedidasFull.filter(item => this.medidasSeleccionadas.includes(item.medida));
    },
    totalSeleccionado() {
      return this.resumenFiltrado.reduce((total, item) => total + Number(item.total || 0), 0);
    }
  },
  watch: {
    mostrar(nuevoValor) {
      if (nuevoValor) {
        this.inicializarRango();
        this.calcular();
      }
    }
  },
  methods: {
    cerrar() {
      this.$emit('cerrar');
    },
    inicializarRango() {
      if (this.fechaInicio && this.fechaFin) return;
      const hoy = new Date();
      const fin = this.toLocalYMD(hoy);
      const inicioFecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7);
      const inicio = this.toLocalYMD(inicioFecha);
      this.fechaInicio = inicio;
      this.fechaFin = fin;
    },
    async calcular() {
      if (!this.rangoValido) {
        this.error = 'Selecciona un rango de fechas valido.';
        return;
      }

      this.error = '';
      this.cargando = true;
      this.resumenMedidasFull = [];
      this.medidasSeleccionadas = [];
      this.embarquesAnalizados = 0;

      let registrosOnline = [];
      let registrosOffline = [];

      // Obtener registros online
      if (navigator.onLine) {
        try {
          registrosOnline = await this.obtenerRegistrosOnline();
        } catch (error) {
          console.warn('[SalidasRendimientos] Error al consultar Firestore:', error);
        }
      }

      // Siempre obtener registros offline también
      try {
        registrosOffline = await EmbarquesOfflineService.getAll() || [];
      } catch (error) {
        console.warn('[SalidasRendimientos] Error al obtener registros offline:', error);
      }

      // Combinar y deduplicar por ID
      const registrosMap = new Map();
      [...registrosOffline, ...registrosOnline].forEach(registro => {
        const id = registro?.id;
        if (id) {
          registrosMap.set(id, registro);
        }
      });

      const registrosCombinados = Array.from(registrosMap.values());
      const registros = this.filtrarRegistrosPorFecha(registrosCombinados);
      
      console.log('[SalidasRendimientos] Registros online:', registrosOnline.length, 'offline:', registrosOffline.length, 'combinados:', registrosCombinados.length, 'filtrados:', registros.length);

      this.embarquesAnalizados = registros.length;
      this.resumenMedidasFull = this.construirResumen(registros);
      this.medidasSeleccionadas = [];
      this.cargando = false;
    },
    filtrarRegistrosPorFecha(registros) {
      const inicio = this.fechaInicio;
      const fin = this.fechaFin;
      if (!inicio || !fin) return [];
      
      // Expandir rango ±1 día para compensar desfase de zona horaria
      const inicioExpandido = this.ajustarFechaYMD(inicio, -1);
      const finExpandido = this.ajustarFechaYMD(fin, 1);
      
      console.log('[SalidasRendimientos] Rango original:', inicio, 'a', fin);
      console.log('[SalidasRendimientos] Rango expandido (±1 día):', inicioExpandido, 'a', finExpandido);
      
      // Primero, filtrar solo los que tienen kilosCrudos
      const conKilosCrudos = registros.filter(registro => {
        const data = this.obtenerDataRegistro(registro);
        return data.kilosCrudos && Object.keys(data.kilosCrudos).length > 0;
      });
      
      console.log('[SalidasRendimientos] Registros con kilosCrudos:', conKilosCrudos.length);
      
      // Mostrar todos los registros en el rango expandido
      const enRangoExpandido = conKilosCrudos.filter(registro => {
        const fechaYMD = this.obtenerFechaRegistroYMD(registro);
        return fechaYMD && fechaYMD >= inicioExpandido && fechaYMD <= finExpandido;
      });
      
      console.log('[SalidasRendimientos] Embarques en rango expandido:', enRangoExpandido.length);
      enRangoExpandido.forEach(registro => {
        const data = this.obtenerDataRegistro(registro);
        const fechaYMD = this.obtenerFechaRegistroYMD(registro);
        console.log('[SalidasRendimientos] En rango - ID:', registro?.id, 'fecha BD:', fechaYMD, 'fecha original:', data?.fecha);
      });

      return enRangoExpandido;
    },
    ajustarFechaYMD(fechaYMD, dias) {
      const [y, m, d] = fechaYMD.split('-').map(Number);
      const fecha = new Date(y, m - 1, d + dias);
      return this.toLocalYMD(fecha);
    },
    compararMedidas(a, b) {
      const normalizar = (texto) => texto.toLowerCase().trim();
      const extraerNumero = (medida) => {
        const match = medida.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };
      const extraerRango = (medida) => {
        const match = medida.match(/^(\d+)\s*\/\s*(\d+)/);
        if (!match) return null;
        return [parseInt(match[1], 10), parseInt(match[2], 10)];
      };

      const numA = extraerNumero(a);
      const numB = extraerNumero(b);

      // Las medidas con número van primero
      if (numA !== null && numB === null) return -1;
      if (numA === null && numB !== null) return 1;

      // Si ambos tienen número, ordenar por ese número (agrupa 51*, 61*, etc.)
      if (numA !== null && numB !== null) {
        if (numA !== numB) return numA - numB;

        // Si ambos son del mismo grupo (ej. 51), ordenar por rango 51/60, 51/70...
        const rangoA = extraerRango(a);
        const rangoB = extraerRango(b);
        if (rangoA && rangoB && rangoA[1] !== rangoB[1]) {
          return rangoA[1] - rangoB[1];
        }
      }

      // Fallback: ordenar alfabéticamente
      return normalizar(a).localeCompare(normalizar(b), 'es', { sensitivity: 'base' });
    },
    obtenerFechaRegistroYMD(registro) {
      const data = this.obtenerDataRegistro(registro);
      const valor = data?.fecha || data?.fechaRegistro;
      const fechaNormalizada = this.normalizarFecha(valor);
      return fechaNormalizada ? this.toLocalYMD(fechaNormalizada) : null;
    },
    obtenerDataRegistro(registro) {
      if (!registro) return {};
      const base = registro && typeof registro === 'object' ? { ...registro } : {};
      const docData = registro?.docData && typeof registro.docData === 'object'
        ? { ...registro.docData }
        : {};
      return { ...base, ...docData };
    },
    construirResumen(registros) {
      const resumen = {};

      registros.forEach(registro => {
        const data = this.obtenerDataRegistro(registro);
        const kilosCrudos = data.kilosCrudos || {};

        Object.entries(kilosCrudos).forEach(([medida, valor]) => {
          if (!resumen[medida]) {
            resumen[medida] = {
              medida,
              total: 0,
              partes: [],
              tieneRegistro: false
            };
          }

          resumen[medida].tieneRegistro = true;

          if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
            const kilos1 = Number(valor.medida1 || 0);
            const kilos2 = Number(valor.medida2 || 0);
            const label1 = valor.etiqueta1 || 'Medida 1';
            const label2 = valor.etiqueta2 || 'Medida 2';

            resumen[medida].total += kilos1 + kilos2;
            this.sumarParte(resumen[medida], label1, kilos1);
            this.sumarParte(resumen[medida], label2, kilos2);
          } else {
            const kilos = Number(valor || 0);
            resumen[medida].total += kilos;
          }
        });
      });

      return Object.values(resumen)
        .filter(item => item.tieneRegistro)
        .sort((a, b) => this.compararMedidas(a.medida, b.medida));
    },
    sumarParte(item, label, kilos) {
      if (!label) return;
      const existente = item.partes.find(parte => parte.label === label);
      if (existente) {
        existente.kilos += kilos;
      } else {
        item.partes.push({ label, kilos });
      }
    },
    formatearNumero(valor) {
      const numero = Number(valor || 0);
      return Number.isFinite(numero)
        ? numero.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        : '0';
    },
    toLocalYMD(fecha) {
      if (!fecha) return '';
      const y = fecha.getFullYear();
      const m = String(fecha.getMonth() + 1).padStart(2, '0');
      const d = String(fecha.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },
    normalizarFecha(fecha) {
      if (!fecha) return null;
      
      // Firestore Timestamp
      if (typeof fecha === 'object' && fecha.seconds) {
        return new Date(fecha.seconds * 1000);
      }
      
      // Ya es Date
      if (fecha instanceof Date) {
        return fecha;
      }
      
      // Timestamp milliseconds
      if (typeof fecha === 'number') {
        const fechaObj = new Date(fecha);
        return isNaN(fechaObj.getTime()) ? null : fechaObj;
      }
      
      if (typeof fecha === 'string') {
        // Limpiar espacios
        fecha = fecha.trim();
        
        // Formato DD/MM/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
          const [day, month, year] = fecha.split('/').map(Number);
          return new Date(year, month - 1, day, 12, 0, 0, 0);
        }
        
        // Formato YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
          const [datePart] = fecha.split('T');
          const [y, m, day] = datePart.split('-').map(Number);
          return new Date(y, m - 1, day, 12, 0, 0, 0);
        }
        
        // Formato DD-MM-YYYY
        if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(fecha)) {
          const [day, m, y] = fecha.split('-').map(Number);
          return new Date(y, m - 1, day, 12, 0, 0, 0);
        }
        
        // Intentar parsear como ISO o cualquier otro formato
        const fechaObj = new Date(fecha);
        return isNaN(fechaObj.getTime()) ? null : fechaObj;
      }
      
      return null;
    },
    async obtenerRegistrosOnline() {
      const db = getFirestore();
      const embarquesRef = collection(db, 'embarques');
      const q = query(embarquesRef, orderBy('fecha', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  }
};
</script>

<style scoped>
.salidas-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 2000;
}

.salidas-modal {
  width: 100%;
  max-width: 760px;
  background: #0b120b;
  border: 2px solid #00ff41;
  box-shadow: 0 0 18px rgba(0, 255, 65, 0.4);
  color: #00ff41;
  font-family: 'VT323', 'Share Tech Mono', monospace;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.modal-title {
  font-size: 1.8rem;
  margin: 0;
}

.btn-cerrar {
  background: transparent;
  border: 1px solid #ffb000;
  color: #ffb000;
  font-size: 1.1rem;
  padding: 4px 10px;
  cursor: pointer;
}

.modal-subtitle {
  margin: 0;
  color: rgba(0, 255, 65, 0.8);
}

.rango-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.rango-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 1.1rem;
}

.rango-field input {
  background: #0f1a0f;
  border: 1px solid #00ff41;
  color: #00ff41;
  padding: 8px 10px;
}

.btn-calcular {
  background: transparent;
  border: 1px solid #00ff41;
  color: #00ff41;
  padding: 10px 12px;
  font-size: 1.1rem;
  cursor: pointer;
}

.btn-calcular:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-text {
  color: #ff4d4f;
}

.medidas-selector {
  display: grid;
  gap: 10px;
  border: 1px solid rgba(0, 255, 65, 0.4);
  padding: 12px;
  background: rgba(0, 20, 0, 0.4);
}

.selector-title {
  margin: 0;
  color: rgba(0, 255, 65, 0.85);
  font-size: 1.2rem;
}

.selector-grid {
  column-count: 3;
  column-gap: 16px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 8px;
}

.selector-grid::-webkit-scrollbar {
  width: 8px;
}

.selector-grid::-webkit-scrollbar-track {
  background: rgba(0, 20, 0, 0.6);
}

.selector-grid::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 65, 0.5);
  border-radius: 4px;
}

.selector-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 65, 0.7);
}

.selector-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  width: 100%;
  break-inside: avoid;
}

.selector-item input {
  accent-color: #00ff41;
}

.total-seleccion {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(0, 255, 65, 0.5);
  background: rgba(0, 20, 0, 0.6);
  font-size: 1.2rem;
}

.resultados {
  display: grid;
  gap: 12px;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 8px;
}

.resultados::-webkit-scrollbar {
  width: 8px;
}

.resultados::-webkit-scrollbar-track {
  background: rgba(0, 20, 0, 0.6);
}

.resultados::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 65, 0.5);
  border-radius: 4px;
}

.resultados::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 65, 0.7);
}

.resultado-card {
  border: 1px solid rgba(0, 255, 65, 0.5);
  padding: 12px;
  background: rgba(0, 20, 0, 0.6);
}

.resultado-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 1.3rem;
}

.resultado-partes {
  margin-top: 8px;
  display: grid;
  gap: 6px;
  font-size: 1.1rem;
}

.resultado-parte {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  font-size: 1rem;
  opacity: 0.8;
}

@media (max-width: 600px) {
  .salidas-modal {
    padding: 16px;
  }

  .modal-title {
    font-size: 1.5rem;
  }

  .resultado-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
