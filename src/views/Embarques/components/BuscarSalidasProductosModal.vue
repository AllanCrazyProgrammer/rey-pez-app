<template>
  <div v-if="mostrar" class="salidas-modal-backdrop" @click.self="cerrar">
    <div class="salidas-modal">
      <div class="modal-header">
        <h2 class="modal-title">BUSCAR_SALIDAS_EMBARQUES</h2>
        <button class="btn-cerrar" type="button" @click="cerrar">x</button>
      </div>

      <p class="modal-subtitle">
        Salidas de productos por medida basadas en los rendimientos de cada embarque.
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
          @click="buscar"
        >
          {{ cargando ? 'Buscando...' : 'Buscar' }}
        </button>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div v-if="medidasDisponibles.length > 0" class="filtro-medida">
        <label class="filtro-field">
          <span>Filtrar por medida</span>
          <input
            type="text"
            v-model="filtroMedida"
            placeholder="Ej: macuil, 51/60..."
            class="input-filtro"
          />
        </label>
        <div class="medidas-chips">
          <button
            v-for="medida in medidasFiltradas"
            :key="medida"
            class="chip"
            :class="{ 'chip-activo': medidasSeleccionadas.includes(medida) }"
            @click="toggleMedida(medida)"
          >
            {{ medida }}
          </button>
        </div>
        <div class="chips-actions">
          <button class="btn-chip-action" @click="seleccionarTodas">Todas</button>
          <button class="btn-chip-action" @click="deseleccionarTodas">Ninguna</button>
        </div>
      </div>

      <div v-if="!cargando && buscado && resultadosFiltrados.length === 0" class="empty-state">
        Sin salidas encontradas para los filtros seleccionados.
      </div>

      <div v-if="resultadosFiltrados.length > 0" class="total-seleccion">
        <div class="total-row">
          <span>Total embarcado (selección):</span>
          <strong>{{ formatearNumero(totalEmbarcadoFiltrado) }} kg</strong>
        </div>
        <div class="total-row total-crudo">
          <span>Total kilos en crudo (selección):</span>
          <strong>{{ formatearNumero(totalCrudoFiltrado) }} kg</strong>
        </div>
      </div>

      <div v-if="resultadosFiltrados.length > 0" class="resultados">
        <div v-for="item in resultadosFiltrados" :key="item.medida" class="resultado-card">
          <div class="resultado-header">
            <span class="resultado-medida">{{ item.medida }}</span>
            <div class="resultado-totales">
              <span class="resultado-embarcado">Embarcado: {{ formatearNumero(item.totalEmbarcado) }} kg</span>
              <span class="resultado-crudo" v-if="item.totalCrudo > 0">Crudo: {{ formatearNumero(item.totalCrudo) }} kg</span>
            </div>
          </div>
          <div class="resultado-detalles">
            <div v-for="(det, idx) in item.detalles" :key="det.embarqueId + '-' + idx" class="detalle-row">
              <span class="detalle-fecha">{{ det.fechaTexto }}</span>
              <div class="detalle-info">
                <span class="detalle-clientes">{{ det.clientesTexto }}</span>
                <div class="detalle-kilos-group">
                  <span class="detalle-kilos">{{ formatearNumero(det.kilosEmbarcados) }} kg</span>
                  <span class="detalle-crudo-tag" v-if="det.kilosCrudo > 0">(crudo: {{ formatearNumero(det.kilosCrudo) }})</span>
                </div>
              </div>
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
  name: 'BuscarSalidasProductosModal',
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
      buscado: false,
      error: '',
      filtroMedida: '',
      medidasSeleccionadas: [],
      resultadosCompletos: [],
      embarquesAnalizados: 0
    };
  },
  computed: {
    rangoValido() {
      return Boolean(this.fechaInicio && this.fechaFin && this.fechaInicio <= this.fechaFin);
    },
    medidasDisponibles() {
      return this.resultadosCompletos.map(r => r.medida);
    },
    medidasFiltradas() {
      if (!this.filtroMedida.trim()) return this.medidasDisponibles;
      const filtro = this.filtroMedida.toLowerCase().trim();
      return this.medidasDisponibles.filter(m => m.toLowerCase().includes(filtro));
    },
    resultadosFiltrados() {
      if (this.medidasSeleccionadas.length === 0) return [];
      return this.resultadosCompletos.filter(item =>
        this.medidasSeleccionadas.includes(item.medida)
      );
    },
    totalEmbarcadoFiltrado() {
      return this.resultadosFiltrados.reduce((sum, item) => sum + item.totalEmbarcado, 0);
    },
    totalCrudoFiltrado() {
      return this.resultadosFiltrados.reduce((sum, item) => sum + item.totalCrudo, 0);
    }
  },
  watch: {
    mostrar(val) {
      if (val) {
        this.inicializarRango();
        this.buscar();
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
      this.fechaFin = this.toLocalYMD(hoy);
      const hace7 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7);
      this.fechaInicio = this.toLocalYMD(hace7);
    },
    toggleMedida(medida) {
      const idx = this.medidasSeleccionadas.indexOf(medida);
      if (idx >= 0) {
        this.medidasSeleccionadas.splice(idx, 1);
      } else {
        this.medidasSeleccionadas.push(medida);
      }
    },
    seleccionarTodas() {
      this.medidasSeleccionadas = [...this.medidasFiltradas];
    },
    deseleccionarTodas() {
      this.medidasSeleccionadas = [];
    },

    async buscar() {
      if (!this.rangoValido) {
        this.error = 'Selecciona un rango de fechas válido.';
        return;
      }

      this.error = '';
      this.cargando = true;
      this.buscado = false;
      this.resultadosCompletos = [];
      this.medidasSeleccionadas = [];
      this.embarquesAnalizados = 0;

      try {
        let registrosOnline = [];
        let registrosOffline = [];

        if (navigator.onLine) {
          try {
            registrosOnline = await this.obtenerEmbarquesOnline();
          } catch (err) {
            console.warn('[BuscarSalidas] Error Firestore:', err);
          }
        }

        try {
          registrosOffline = await EmbarquesOfflineService.getAll() || [];
        } catch (err) {
          console.warn('[BuscarSalidas] Error offline:', err);
        }

        const registrosMap = new Map();
        [...registrosOffline, ...registrosOnline].forEach(reg => {
          if (reg?.id) registrosMap.set(reg.id, reg);
        });

        const todos = Array.from(registrosMap.values());
        const enRango = this.filtrarPorFecha(todos);

        this.embarquesAnalizados = enRango.length;
        this.resultadosCompletos = this.construirResumen(enRango);
        this.buscado = true;

        this.autoSeleccionarMedidas();
      } catch (err) {
        console.error('[BuscarSalidas] Error completo:', err);
        this.error = `Error al procesar embarques: ${err.message || err}`;
      } finally {
        this.cargando = false;
      }
    },

    autoSeleccionarMedidas() {
      const macuil = this.medidasDisponibles.filter(m => m.toLowerCase().includes('macuil'));
      if (macuil.length > 0) {
        this.filtroMedida = 'macuil';
        this.medidasSeleccionadas = [...macuil];
      } else {
        this.medidasSeleccionadas = [...this.medidasDisponibles];
      }
    },

    filtrarPorFecha(registros) {
      const inicio = this.fechaInicio;
      const fin = this.fechaFin;
      if (!inicio || !fin) return [];

      const inicioExp = this.ajustarFechaYMD(inicio, -1);
      const finExp = this.ajustarFechaYMD(fin, 1);

      return registros.filter(reg => {
        try {
          const data = this.obtenerData(reg);
          const clientes = data.clientes;
          const tieneProductos = Array.isArray(clientes) &&
            clientes.some(c => c && Array.isArray(c.productos) && c.productos.length > 0);
          if (!tieneProductos) return false;

          const fechaYMD = this.obtenerFechaYMD(reg);
          return fechaYMD && fechaYMD >= inicioExp && fechaYMD <= finExp;
        } catch {
          return false;
        }
      });
    },

    construirResumen(embarques) {
      const agrupado = {};

      embarques.forEach(embarque => {
        const data = this.obtenerData(embarque);
        const fechaYMD = this.obtenerFechaYMD(embarque);
        const fechaTexto = this.formatearFechaTexto(fechaYMD);
        const kilosCrudos = data.kilosCrudos || {};
        const clientes = data.clientes || [];

        const medidasEmbarque = {};

        clientes.forEach(cliente => {
          if (!cliente || typeof cliente !== 'object') return;
          const nombreCliente = cliente.nombre || 'Sin cliente';
          const productos = Array.isArray(cliente.productos) ? cliente.productos : [];

          productos.forEach(producto => {
            if (!producto || typeof producto !== 'object') return;
            const medidaRaw = (producto.medida || '').trim();
            if (!medidaRaw) return;

            const medida = medidaRaw;
            if (!medidasEmbarque[medida]) {
              medidasEmbarque[medida] = { kilosEmbarcados: 0, clientes: new Set() };
            }

            const kilos = this.calcularKilosProducto(producto);
            medidasEmbarque[medida].kilosEmbarcados += kilos;
            medidasEmbarque[medida].clientes.add(nombreCliente);
          });
        });

        Object.entries(medidasEmbarque).forEach(([medida, info]) => {
          if (!agrupado[medida]) {
            agrupado[medida] = { medida, totalEmbarcado: 0, totalCrudo: 0, detalles: [] };
          }

          const kilosCrudoMedida = this.obtenerKilosCrudos(kilosCrudos, medida);

          agrupado[medida].totalEmbarcado += info.kilosEmbarcados;
          agrupado[medida].totalCrudo += kilosCrudoMedida;
          agrupado[medida].detalles.push({
            embarqueId: embarque.id,
            fechaTexto,
            fechaYMD,
            clientesTexto: Array.from(info.clientes).join(', '),
            kilosEmbarcados: info.kilosEmbarcados,
            kilosCrudo: kilosCrudoMedida
          });
        });

        Object.entries(kilosCrudos).forEach(([medida, valor]) => {
          if (agrupado[medida]) return;

          const kilosCrudo = this.extraerValorCrudo(valor);
          if (kilosCrudo <= 0) return;

          agrupado[medida] = { medida, totalEmbarcado: 0, totalCrudo: kilosCrudo, detalles: [] };
          agrupado[medida].detalles.push({
            embarqueId: embarque.id,
            fechaTexto,
            fechaYMD,
            clientesTexto: 'Solo registro en crudo',
            kilosEmbarcados: 0,
            kilosCrudo: kilosCrudo
          });
        });
      });

      return Object.values(agrupado)
        .filter(item => item.totalEmbarcado > 0 || item.totalCrudo > 0)
        .sort((a, b) => this.compararMedidas(a.medida, b.medida))
        .map(item => {
          item.detalles.sort((a, b) => (b.fechaYMD || '').localeCompare(a.fechaYMD || ''));
          return item;
        });
    },

    calcularKilosProducto(producto) {
      try {
        const kilosRaw = producto.kilos;
        let sumaKilos = 0;
        if (Array.isArray(kilosRaw)) {
          sumaKilos = kilosRaw.reduce((sum, k) => sum + (Number(k) || 0), 0);
        } else if (typeof kilosRaw === 'number') {
          sumaKilos = kilosRaw;
        } else if (typeof kilosRaw === 'string') {
          sumaKilos = Number(kilosRaw) || 0;
        }

        if (producto.tipo === 'c/h20') {
          const totalBolsas = this.calcularTotalBolsas(producto);
          const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
          return totalBolsas * valorNeto;
        }

        const sumaTaras = this.calcularTotalTaras(producto);
        const descuento = producto.restarTaras ? sumaTaras * 3 : 0;
        return sumaKilos - descuento;
      } catch (e) {
        console.warn('[BuscarSalidas] Error calculando kilos de producto:', e, producto);
        return 0;
      }
    },

    calcularTotalBolsas(producto) {
      const reporteTaras = producto.reporteTaras || [];
      const reporteBolsas = producto.reporteBolsas || [];
      let total = 0;
      for (let i = 0; i < reporteTaras.length; i++) {
        const taras = parseInt(reporteTaras[i]) || 0;
        const bolsa = parseInt(reporteBolsas[i]) || 0;
        total += taras * bolsa;
      }
      return total;
    },

    calcularTotalTaras(producto) {
      const tarasNormales = (producto.taras || []).reduce((sum, t) => sum + (Number(t) || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, t) => sum + (Number(t) || 0), 0);
      return tarasNormales + tarasExtra;
    },

    obtenerKilosCrudos(kilosCrudos, medida) {
      const valor = kilosCrudos[medida];
      return this.extraerValorCrudo(valor);
    },

    extraerValorCrudo(valor) {
      if (!valor) return 0;
      if (typeof valor === 'number') return valor;
      if (typeof valor === 'string') return Number(valor) || 0;
      if (typeof valor === 'object' && !Array.isArray(valor)) {
        return (Number(valor.medida1 || 0)) + (Number(valor.medida2 || 0));
      }
      return 0;
    },

    compararMedidas(a, b) {
      const extraerNumero = (m) => {
        const match = m.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };
      const numA = extraerNumero(a);
      const numB = extraerNumero(b);
      if (numA !== null && numB === null) return -1;
      if (numA === null && numB !== null) return 1;
      if (numA !== null && numB !== null && numA !== numB) return numA - numB;
      return a.localeCompare(b, 'es', { sensitivity: 'base' });
    },

    obtenerData(registro) {
      if (!registro) return {};
      const base = typeof registro === 'object' ? { ...registro } : {};
      const docData = registro?.docData && typeof registro.docData === 'object'
        ? { ...registro.docData } : {};
      return { ...base, ...docData };
    },

    obtenerFechaYMD(registro) {
      const data = this.obtenerData(registro);
      const valor = data?.fecha || data?.fechaRegistro;
      const fechaNorm = this.normalizarFecha(valor);
      return fechaNorm ? this.toLocalYMD(fechaNorm) : null;
    },

    formatearFechaTexto(ymd) {
      if (!ymd) return '—';
      const [y, m, d] = ymd.split('-');
      return `${d}/${m}/${y}`;
    },

    ajustarFechaYMD(fechaYMD, dias) {
      const [y, m, d] = fechaYMD.split('-').map(Number);
      const fecha = new Date(y, m - 1, d + dias);
      return this.toLocalYMD(fecha);
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
      if (typeof fecha === 'object' && fecha.seconds) {
        return new Date(fecha.seconds * 1000);
      }
      if (fecha instanceof Date) return fecha;
      if (typeof fecha === 'number') {
        const d = new Date(fecha);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof fecha === 'string') {
        fecha = fecha.trim();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
          const [day, month, year] = fecha.split('/').map(Number);
          return new Date(year, month - 1, day, 12, 0, 0, 0);
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
          const [datePart] = fecha.split('T');
          const [y, m, day] = datePart.split('-').map(Number);
          return new Date(y, m - 1, day, 12, 0, 0, 0);
        }
        if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(fecha)) {
          const [day, m, y] = fecha.split('-').map(Number);
          return new Date(y, m - 1, day, 12, 0, 0, 0);
        }
        const d = new Date(fecha);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    },

    formatearNumero(valor) {
      const numero = Number(valor || 0);
      return Number.isFinite(numero)
        ? numero.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        : '0';
    },

    async obtenerEmbarquesOnline() {
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
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 2000;
}

.salidas-modal {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  background: #0b120b;
  border: 2px solid #c084fc;
  box-shadow: 0 0 18px rgba(192, 132, 252, 0.4);
  color: #00ff41;
  font-family: 'VT323', 'Share Tech Mono', monospace;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.salidas-modal::-webkit-scrollbar { width: 8px; }
.salidas-modal::-webkit-scrollbar-track { background: rgba(0, 20, 0, 0.6); }
.salidas-modal::-webkit-scrollbar-thumb { background: rgba(192, 132, 252, 0.5); border-radius: 4px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.modal-title {
  font-size: 1.6rem;
  margin: 0;
  color: #c084fc;
  text-shadow: 0 0 10px rgba(192, 132, 252, 0.4);
  letter-spacing: 2px;
}

.btn-cerrar {
  background: transparent;
  border: 1px solid #ffb000;
  color: #ffb000;
  font-size: 1.1rem;
  font-family: 'VT323', monospace;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cerrar:hover { background: #ffb000; color: #0b120b; }

.modal-subtitle {
  margin: 0;
  color: rgba(0, 255, 65, 0.75);
  font-size: 1.1rem;
}

.rango-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
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
  border: 1px solid #c084fc;
  color: #00ff41;
  font-family: 'VT323', monospace;
  padding: 8px 10px;
  font-size: 1rem;
}

.btn-calcular {
  background: transparent;
  border: 1px solid #c084fc;
  color: #c084fc;
  font-family: 'VT323', monospace;
  padding: 10px 16px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-calcular:hover:not(:disabled) { background: #c084fc; color: #0b120b; }
.btn-calcular:disabled { opacity: 0.5; cursor: not-allowed; }

.error-text { color: #ff4d4f; font-size: 1.1rem; }

.empty-state {
  color: rgba(0, 255, 65, 0.6);
  text-align: center;
  padding: 16px;
  font-size: 1.1rem;
}

.filtro-medida {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid rgba(192, 132, 252, 0.4);
  padding: 12px;
  background: rgba(0, 20, 0, 0.4);
}

.filtro-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 1.1rem;
}

.input-filtro {
  background: #0f1a0f;
  border: 1px solid #c084fc;
  color: #00ff41;
  font-family: 'VT323', monospace;
  padding: 8px 10px;
  font-size: 1.1rem;
}
.input-filtro::placeholder { color: rgba(192, 132, 252, 0.4); }

.medidas-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
  padding-right: 4px;
}
.medidas-chips::-webkit-scrollbar { width: 6px; }
.medidas-chips::-webkit-scrollbar-thumb { background: rgba(192, 132, 252, 0.5); border-radius: 3px; }

.chip {
  background: transparent;
  border: 1px solid rgba(192, 132, 252, 0.5);
  color: #c084fc;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.chip:hover { border-color: #c084fc; box-shadow: 0 0 8px rgba(192, 132, 252, 0.3); }
.chip-activo { background: #c084fc; color: #0b120b; border-color: #c084fc; font-weight: bold; }

.chips-actions { display: flex; gap: 8px; }

.btn-chip-action {
  background: transparent;
  border: 1px solid rgba(255, 176, 0, 0.6);
  color: #ffb000;
  font-family: 'VT323', monospace;
  font-size: 0.95rem;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-chip-action:hover { background: #ffb000; color: #0b120b; }

.total-seleccion {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid rgba(192, 132, 252, 0.5);
  background: rgba(0, 20, 0, 0.6);
  font-size: 1.2rem;
}

.total-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.total-crudo {
  color: #ffb000;
  font-size: 1.1rem;
}

.resultados {
  display: grid;
  gap: 14px;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 8px;
}
.resultados::-webkit-scrollbar { width: 8px; }
.resultados::-webkit-scrollbar-track { background: rgba(0, 20, 0, 0.6); }
.resultados::-webkit-scrollbar-thumb { background: rgba(192, 132, 252, 0.5); border-radius: 4px; }

.resultado-card {
  border: 1px solid rgba(192, 132, 252, 0.5);
  padding: 12px;
  background: rgba(0, 20, 0, 0.6);
}

.resultado-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 1.3rem;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(192, 132, 252, 0.2);
  margin-bottom: 8px;
}

.resultado-medida {
  font-weight: bold;
  color: #c084fc;
  text-shadow: 0 0 6px rgba(192, 132, 252, 0.3);
}

.resultado-totales {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.resultado-embarcado { color: #00ff41; font-size: 1.1rem; }
.resultado-crudo { color: #ffb000; font-size: 1rem; }

.resultado-detalles {
  display: grid;
  gap: 4px;
  font-size: 1.05rem;
  max-height: 200px;
  overflow-y: auto;
}
.resultado-detalles::-webkit-scrollbar { width: 4px; }
.resultado-detalles::-webkit-scrollbar-thumb { background: rgba(192, 132, 252, 0.4); border-radius: 2px; }

.detalle-row {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(192, 132, 252, 0.08);
}

.detalle-fecha { color: rgba(0, 255, 65, 0.65); }

.detalle-info {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.detalle-clientes {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(0, 255, 65, 0.8);
}

.detalle-kilos-group {
  display: flex;
  gap: 6px;
  white-space: nowrap;
}

.detalle-kilos { text-align: right; }
.detalle-crudo-tag { color: #ffb000; font-size: 0.95rem; }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  font-size: 1rem;
  opacity: 0.8;
}

@media (max-width: 600px) {
  .salidas-modal { padding: 14px; max-height: 95vh; }
  .modal-title { font-size: 1.2rem; letter-spacing: 1px; }
  .rango-form { grid-template-columns: 1fr 1fr; }
  .btn-calcular { grid-column: 1 / -1; }
  .resultado-header { flex-direction: column; align-items: flex-start; gap: 4px; }
  .resultado-totales { align-items: flex-start; }
  .detalle-row { grid-template-columns: 80px 1fr; font-size: 0.95rem; }
  .detalle-info { flex-direction: column; gap: 2px; }
}

@media (max-width: 400px) {
  .detalle-row { grid-template-columns: 1fr; }
  .detalle-fecha { font-size: 0.9rem; }
}
</style>
