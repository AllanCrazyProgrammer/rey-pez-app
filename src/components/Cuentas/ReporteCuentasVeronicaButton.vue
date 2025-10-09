<template>
  <div class="reporte-cuentas-veronica">
    <div class="inputs-fechas-container">
      <div class="fecha-input-group">
        <label>Desde</label>
        <input type="date" v-model="fechaInicio" />
      </div>
      <div class="fecha-input-group">
        <label>Hasta</label>
        <input type="date" v-model="fechaFin" />
      </div>
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
      this.totalRegistros = 0;

      try {
        const cuentasRef = collection(db, 'cuentasVeronica');
        const cuentasQuery = query(
          cuentasRef,
          orderBy('fecha', 'asc'),
          where('fecha', '>=', this.fechaInicio),
          where('fecha', '<=', this.fechaFin)
        );

        const snapshot = await getDocs(cuentasQuery);
        const registros = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        if (!registros.length) {
          this.errorMessage = 'No hay registros de cuentas en el rango seleccionado.';
          return;
        }

        this.totalRegistros = registros.length;

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
  gap: 12px;
  align-items: stretch;
  width: 100%;
}

.inputs-fechas-container {
  display: flex;
  gap: 15px;
  align-items: flex-end;
  flex-wrap: nowrap;
}

.fecha-input-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 0 0 130px;
  max-width: 100px;
}

.fecha-input-group label {
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.fecha-input-group input[type="date"] {
  padding: 8px 10px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 11px;
  transition: border-color 0.3s ease;
  width: 100%;
}

.fecha-input-group input[type="date"]:focus {
  outline: none;
  border-color: #ff8c00;
}

.btn-generar {
  background-color: #ff8c00;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  align-self: flex-start;
}

.btn-generar:disabled {
  background-color: #f3b774;
  cursor: not-allowed;
  opacity: 0.7;
}

.btn-generar:not(:disabled):hover {
  background-color: #e07900;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(255, 140, 0, 0.3);
}

.mensaje-error {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 0;
  padding: 8px;
  background-color: #ffe5e5;
  border-radius: 4px;
}

.detalle-registros {
  font-size: 13px;
  color: #4CAF50;
  font-weight: 500;
  margin-top: 0;
}

@media (max-width: 600px) {
  .inputs-fechas-container {
    flex-wrap: wrap;
  }
  
  .fecha-input-group {
    flex: 1 1 100%;
  }
}
</style>
