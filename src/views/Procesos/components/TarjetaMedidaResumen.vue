<template>
  <article class="tarjeta-medida">
    <header class="tarjeta-franja">
      <h3>{{ medida.medida }}</h3>
      <span v-if="medida.soloRefri" class="solo-refri-etiqueta">Solo refrigerado</span>
    </header>

    <div class="tarjeta-cuerpo">
      <div v-if="kilosRefri" class="refri-bloque">
        <span class="kilos-refrigerados">🧊 {{ formatDecimal(kilosRefri) }} kg</span>
        <span
          class="kilos-faltantes"
          :class="{ suficientes: faltantes <= 0, sobra: faltantes < 0 }"
        >
          <template v-if="faltantes > 0">Faltan: {{ formatDecimal(faltantes) }} kg</template>
          <template v-else-if="faltantes < 0">Sobra: {{ formatDecimal(Math.abs(faltantes)) }} kg</template>
          <template v-else>Exactos: 0.0 kg</template>
        </span>
      </div>

      <label class="campo">
        <span>Rendimiento</span>
        <input
          type="number"
          step="0.01"
          inputmode="decimal"
          class="rendimiento-box"
          placeholder="1.00"
          :aria-label="'Rendimiento de ' + medida.medida"
          :value="rendimiento"
          @input="$emit('input-rendimiento', $event.target.value)"
        >
      </label>
      <p v-if="rendimiento" class="rendimiento-total">{{ rendimientoRedondeado }}</p>

      <div v-if="esGranja" class="campo">
        <span>Masters</span>
        <div class="checkbox-group">
          <label>
            <input
              type="radio"
              :name="'master-' + medida.medida"
              :checked="Number(divisor) === 20"
              @click="$emit('toggle-divisor', 20)"
            >
            <span>20</span>
          </label>
          <label>
            <input
              type="radio"
              :name="'master-' + medida.medida"
              :checked="Number(divisor) === 22"
              @click="$emit('toggle-divisor', 22)"
            >
            <span>22</span>
          </label>
        </div>
      </div>

      <p v-if="rendimiento" class="cajas-linea">
        <span>Cajas</span>
        <strong
          v-if="esGranja && divisor"
          class="cajas-result"
          :class="{ 'cajas-faltantes': kilosRefri > 0 }"
          :title="kilosRefri > 0 ? 'Calculado con kilos faltantes (restando refrigerados)' : null"
        >{{ cajasGranja }}</strong>
        <strong
          v-else
          class="cajas-result"
          :class="{ 'cajas-faltantes': kilosRefri > 0 }"
          :title="kilosRefri > 0 ? 'Calculado con kilos faltantes (restando refrigerados)' : null"
        >{{ cajasKilos }} kg</strong>
      </p>
    </div>

    <footer class="tarjeta-pie">
      <span>Total</span>
      <button
        type="button"
        class="total-kilos-clickeable"
        title="Click para agregar kilos refrigerados"
        @click="$emit('abrir-refri')"
      >{{ medida.total }} kg</button>
    </footer>
  </article>
</template>

<script>
export default {
  name: 'TarjetaMedidaResumen',
  props: {
    medida: { type: Object, required: true },
    rendimiento: { type: [String, Number], default: '' },
    divisor: { type: [String, Number], default: null },
    kilosRefri: { type: Number, default: 0 },
    faltantes: { type: Number, default: 0 },
    esGranja: { type: Boolean, default: false }
  },
  computed: {
    rendimientoRedondeado() {
      return Math.round(this.medida.total * this.rendimiento)
    },
    cajasGranja() {
      return Math.round((Math.max(0, this.faltantes) * this.rendimiento) / this.divisor)
    },
    cajasKilos() {
      return Math.round(Math.max(0, this.faltantes) * this.rendimiento)
    }
  },
  methods: {
    formatDecimal(value) {
      return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })
    }
  }
}
</script>

<style scoped>
.tarjeta-medida {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  background: #fff;
  color: #1c2b33;
  border: 1px solid rgba(28, 43, 51, 0.12);
  border-radius: 18px;
  box-shadow: 0 8px 22px rgba(16, 32, 48, 0.12);
  overflow: hidden;
}

.tarjeta-franja {
  margin: 0;
  padding: 8px 8px 7px;
  background: #343a40;
  color: #fff;
  text-align: center;
}

.solo-refri-etiqueta {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 7px;
  border-radius: 10px;
  background: #d5f5ef;
  color: #126763;
  font-size: 11px;
}

.tarjeta-franja h3 {
  margin: 0;
  font-size: 13px;
  line-height: 1.25;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.tarjeta-cuerpo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  min-width: 0;
}

.refri-bloque {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.kilos-refrigerados,
.kilos-faltantes {
  display: inline-block;
  max-width: 100%;
  padding: 3px 6px;
  border-radius: 10px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.kilos-refrigerados {
  background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%);
}

.kilos-faltantes {
  background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
}

.kilos-faltantes.suficientes {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.kilos-faltantes.suficientes::before { content: '✓ '; }

.kilos-faltantes.sobra {
  background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%);
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  min-width: 0;
  color: #3d4c55;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.rendimiento-box {
  width: 100%;
  max-width: 96px;
  min-width: 0;
  min-height: 36px;
  padding: 4px 6px;
  box-sizing: border-box;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  color: #2e7d32;
  background: #fff;
  font-size: 16px;
  text-align: center;
}

.rendimiento-box:focus-visible {
  outline: 2px solid #176653;
  outline-offset: 2px;
}

.rendimiento-total {
  margin: -4px 0 0;
  color: #666;
  font-size: 13px;
  font-weight: 700;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  margin: 0;
  padding: 2px 6px;
  border-radius: 8px;
  color: #24343c;
  font-size: 13px;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;
}

.checkbox-group input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #667eea;
}

.cajas-linea {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin: 0;
  color: #3d4c55;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.cajas-result {
  color: #4CAF50;
  font-size: 16px;
  letter-spacing: 0;
  text-transform: none;
  overflow-wrap: anywhere;
  text-align: right;
}

.cajas-result.cajas-faltantes {
  padding: 3px 6px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
  color: #fff;
  font-size: 14px;
}

.tarjeta-pie {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding: 7px 8px;
  background: #f6f8f9;
  border-top: 1px solid #e6ebef;
  font-size: 11px;
  font-weight: 700;
}

.total-kilos-clickeable {
  max-width: 100%;
  padding: 5px 8px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #2c3e50;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  overflow-wrap: anywhere;
}

.total-kilos-clickeable:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.total-kilos-clickeable:focus-visible {
  outline: 2px solid #176653;
  outline-offset: 2px;
}

@media (min-width: 768px) {
  .tarjeta-franja h3 { font-size: 15px; }
  .kilos-refrigerados,
  .kilos-faltantes { font-size: 11px; }
}

/* Fuentes amplias en pantalla sin modificar el formato impreso. */
@media screen {
  .tarjeta-franja { padding: 12px; }
  .tarjeta-franja h3 { font-size: 24px; }
  .tarjeta-cuerpo { gap: 12px; padding: 12px; }
  .kilos-refrigerados,
  .kilos-faltantes { font-size: 16px; padding: 5px 8px; }
  .campo,
  .cajas-linea { font-size: 16px; }
  .rendimiento-box {
    max-width: 120px;
    min-height: 48px;
    font-size: 24px;
  }
  .rendimiento-total,
  .checkbox-group label { font-size: 20px; }
  .checkbox-group label { min-height: 44px; }
  .checkbox-group input { width: 22px; height: 22px; flex-shrink: 0; }
  .cajas-linea { flex-wrap: wrap; }
  .cajas-result,
  .cajas-result.cajas-faltantes { font-size: 28px; }
  .tarjeta-pie { font-size: 18px; padding: 10px 12px; flex-wrap: wrap; }
  .total-kilos-clickeable { font-size: 24px; }
}

@media screen and (max-width: 480px) {
  .campo > span { overflow-wrap: anywhere; }
}

@media print {
  .tarjeta-medida {
    box-shadow: none;
    break-inside: avoid;
  }

  .rendimiento-box {
    border: none;
    background: none;
  }

  .cajas-result.cajas-faltantes,
  .total-kilos-clickeable,
  .kilos-refrigerados,
  .kilos-faltantes {
    background: none !important;
    color: #000 !important;
    box-shadow: none !important;
  }

  .tarjeta-franja {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
