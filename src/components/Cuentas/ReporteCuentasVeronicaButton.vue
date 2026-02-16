<template>
  <div class="reporte-cuentas-veronica">
    <div class="inputs-fechas">
      <label>
        Desde
        <input type="date" v-model="fechaInicio" />
      </label>
      <label>
        Hasta
        <input type="date" v-model="fechaFin" />
      </label>
    </div>
    <button
      class="btn-generar"
      :disabled="!fechasValidas || isGenerating"
      @click="generarReporte"
    >
      {{ isGenerating ? 'Generando...' : 'Generar PDF' }}
    </button>
    <p v-if="totalRegistros > 0" class="detalle-registros">
      Incluye {{ totalRegistros }} registro{{ totalRegistros === 1 ? '' : 's' }}.
    </p>
  <p v-if="warningMessage" class="mensaje-warning">{{ warningMessage }}</p>
    <p v-if="errorMessage" class="mensaje-error">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { generarReporteCuentasVeronica } from '@/utils/pdf/generarReporteCuentasVeronica';

export default {
  name: 'ReporteCuentasVeronicaButton',
  data() {
    return {
      fechaInicio: '',
      fechaFin: '',
      isGenerating: false,
      errorMessage: '',
    warningMessage: '',
    totalRegistros: 0
    };
  },
  computed: {
    fechasValidas() {
      return (
        this.fechaInicio &&
        this.fechaFin &&
        this.fechaInicio <= this.fechaFin
      );
    }
  },
  created() {
    this.establecerFechasIniciales();
  },
  methods: {
    normalizarFechaValor(valor) {
      if (!valor) return null;
      try {
        if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
        if (valor.seconds) {
          const d = new Date(valor.seconds * 1000);
          return d.toISOString().split('T')[0];
        }
        if (valor instanceof Date) {
          return valor.toISOString().split('T')[0];
        }
        const d = new Date(valor);
        if (!Number.isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch (_) {
        return null;
      }
      return null;
    },
    async obtenerFechasConEmbarqueVeronica() {
      const embarquesRef = collection(db, 'embarques');
      const embarquesQuery = query(
        embarquesRef,
        orderBy('fecha', 'asc'),
        where('fecha', '>=', this.fechaInicio),
        where('fecha', '<=', this.fechaFin)
      );

      const snapshot = await getDocs(embarquesQuery);
      const fechas = new Set();

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const fechaEmbarque = this.normalizarFechaValor(data.fecha);
        if (!fechaEmbarque) return;

        const clientes = data.clientes || [];
        const productosRaiz = data.productos || [];

        const tieneVeronica = clientes.some((cliente) => {
          const clienteId = (cliente.id ?? cliente.clienteId ?? '').toString();
          const nombreCliente = (cliente.nombre || '').toLowerCase();
          const esVeronica = clienteId === '5' || nombreCliente.includes('veronica') || nombreCliente.includes('lorena');
          const tieneProductos = Array.isArray(cliente.productos) && cliente.productos.some((p) => p && (p.medida || (Array.isArray(p.kilos) && p.kilos.some((k) => Number(k) > 0))));
          const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
          return esVeronica && (tieneProductos || tieneCrudos);
        }) || productosRaiz.some((producto) => {
          const clienteId = (producto.clienteId ?? producto.cliente ?? '').toString();
          const tieneContenido = producto && (producto.medida || (Array.isArray(producto.kilos) && producto.kilos.some((k) => Number(k) > 0)));
          return clienteId === '5' && tieneContenido;
        });

        if (tieneVeronica) {
          fechas.add(fechaEmbarque);
        }
      });

      return fechas;
    },
    establecerFechasIniciales() {
      const hoy = new Date();
      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(hoy.getDate() - 7);

      this.fechaFin = this.formatearFechaInput(hoy);
      this.fechaInicio = this.formatearFechaInput(haceUnaSemana);
    },
    formatearFechaInput(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    async generarReporte() {
      if (!this.fechasValidas) {
        this.errorMessage = 'Selecciona un rango de fechas válido.';
        return;
      }

      this.isGenerating = true;
      this.errorMessage = '';
      this.warningMessage = '';
      this.totalRegistros = 0;

      try {
        const cuentasRef = collection(db, 'cuentasVeronica');
        const cuentasQuery = query(
          cuentasRef,
          orderBy('fecha', 'asc'),
          where('fecha', '>=', this.fechaInicio),
          where('fecha', '<=', this.fechaFin)
        );

        console.log('[REPORTE-PDF] Obteniendo registros para PDF (solo lectura)');
        const snapshot = await getDocs(cuentasQuery);
        const registros = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`[REPORTE-PDF] ${registros.length} registros obtenidos para PDF`);

        if (!registros.length) {
          this.errorMessage = 'No hay registros de cuentas en el rango seleccionado.';
          return;
        }

        this.totalRegistros = registros.length;

        // Validar si hay embarques de Verónica sin nota en el rango seleccionado
        const fechasCuentas = new Set(registros.map((r) => this.normalizarFechaValor(r.fecha)).filter(Boolean));
        const fechasEmbarques = await this.obtenerFechasConEmbarqueVeronica();
        const faltantes = [...fechasEmbarques].filter((fecha) => !fechasCuentas.has(fecha));

        if (faltantes.length) {
          const preview = faltantes.slice(0, 3).join(', ');
          const extra = faltantes.length > 3 ? ` y ${faltantes.length - 3} más` : '';
          this.warningMessage = `Hay ${faltantes.length} día(s) con embarque sin nota: ${preview}${extra}.`;
          const continuar = confirm(
            `${this.warningMessage}\n\n¿Deseas continuar y generar el PDF de todas formas?`
          );
          if (!continuar) {
            this.isGenerating = false;
            return;
          }
        }

        await generarReporteCuentasVeronica({
          fechaInicio: this.fechaInicio,
          fechaFin: this.fechaFin,
          registros
        });
      } catch (error) {
        console.error('Error al generar el reporte de cuentas:', error);
        this.errorMessage = error.message || 'Ocurrió un error al generar el reporte.';
      } finally {
        this.isGenerating = false;
      }
    }
  }
};
</script>

<style scoped>
.reporte-cuentas-veronica {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.inputs-fechas {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.inputs-fechas label {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  color: #555;
}

.inputs-fechas input[type="date"] {
  margin-top: 4px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.btn-generar {
  background-color: #ff8c00;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-generar:disabled {
  background-color: #f3b774;
  cursor: not-allowed;
}

.btn-generar:not(:disabled):hover {
  background-color: #e07900;
}

.mensaje-error {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 4px;
}

.detalle-registros {
  font-size: 13px;
  color: #444;
  margin-top: 2px;
}
.mensaje-warning {
  color: #d35400;
  font-size: 13px;
  margin-top: 4px;
  line-height: 1.4;
}
</style>
