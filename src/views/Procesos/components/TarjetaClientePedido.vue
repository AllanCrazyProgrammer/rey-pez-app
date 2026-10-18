<template>
  <article class="tarjeta-cliente" :class="'tarjeta-cliente--' + claseEncabezado">
    <header class="tarjeta-franja" :class="'franja-' + claseEncabezado">
      <h3>{{ nombre }}</h3>
    </header>

    <ul v-if="items.length" class="tarjeta-lineas">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="tarjeta-linea"
        :class="{ hecha: item.completado }"
      >
        <label class="linea-check">
          <span class="sr-only">Marcar {{ item.medida || 'línea' }} de {{ nombre }}</span>
          <input
            type="checkbox"
            class="pedido-checkbox"
            :checked="!!item.completado"
            @change="marcar(item, index, $event)"
          >
        </label>
        <div class="linea-cuerpo">
          <div class="linea-arriba">
            <span class="linea-kilos">
              <span class="sr-only">Kilos</span>
              {{ item.kilos }}
              <i v-if="item.esTara" class="tara-marca">T</i>
            </span>
            <span class="linea-medida" :class="{ 'text-orange': esMacuil(item.medida) }">
              <span class="sr-only">Medida</span>
              {{ item.medida }}
            </span>
          </div>
          <div v-if="item.etiqueta || item.proveedor" class="linea-chips">
            <span
              v-if="item.etiqueta"
              class="etiqueta-tag"
              :style="estiloEtiqueta(item)"
            >{{ item.etiqueta }}</span>
            <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
          </div>
          <div class="linea-tipo" :class="clasesTipo(item)">
            <span class="sr-only">Tipo</span>
            <span>{{ tipoParaImpresion(item.tipo) }}</span>
            <span
              v-if="item.tipo === 'C/H20' && aguaPersonalizada(item)"
              class="neto-tag"
            >Neto {{ textoAgua(item) }}</span>
            <span v-if="item.nota" class="nota-tag">{{ item.nota }}</span>
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="tarjeta-vacia">Sin líneas</p>

    <footer class="tarjeta-pie">
      <span>Total</span>
      <strong>{{ totalKg }} kg</strong>
    </footer>
  </article>
</template>

<script>
import { colorParaEtiqueta } from '@/utils/coloresEtiquetas'
import { formatearAgua, aguaEsPersonalizada } from '@/utils/factorAgua'

const COMPACTOS = ['1.35 y .15', '1.5 y .3']

export default {
  name: 'TarjetaClientePedido',
  props: {
    nombre: { type: String, required: true },
    claseEncabezado: { type: String, required: true },
    variante: { type: String, default: 'temporal' },
    items: { type: Array, default: () => [] },
    totalKg: { type: [Number, String], default: 0 },
    etiquetasPedido: { type: Array, default: () => [] },
    etiquetasColoresPedido: { type: Object, default: () => ({}) },
    guardarCompletado: { type: Boolean, default: true }
  },
  methods: {
    esMacuil(medida) {
      return (medida || '').toString().trim().toLowerCase() === 'macuil'
    },
    aguaPersonalizada(item) {
      return aguaEsPersonalizada(item)
    },
    textoAgua(item) {
      return formatearAgua(item)
    },
    tipoParaImpresion(tipo) {
      const tipoNormalizado = (tipo || '').toString().trim()
      return tipoNormalizado === '1.4' || tipoNormalizado === '1.5'
        ? `${tipoNormalizado} S/H20`
        : tipoNormalizado
    },
    estiloEtiqueta(item) {
      if (!item || !item.etiqueta) return {}
      const color = colorParaEtiqueta(item.etiqueta, this.etiquetasPedido, this.etiquetasColoresPedido)
      return color ? { backgroundColor: color.bg, color: color.text } : {}
    },
    clasesTipo(item) {
      const tipo = item && item.tipo
      const compactos = this.variante === 'joselito'
        ? COMPACTOS.concat(['1.3 y .2'])
        : COMPACTOS
      const azulExtra = (this.variante === 'catarro' || this.variante === 'ozuna') && tipo === '.7 y .3'
      const compacto = compactos.includes(tipo)
      return {
        'text-blue': tipo === 'C/H20' || azulExtra || compacto,
        compact: compacto
      }
    },
    marcar(item, index, event) {
      const completado = event.target.checked
      this.$set(item, 'completado', completado)
      if (this.guardarCompletado) {
        this.$emit('cambio-completado', { index, completado })
      }
    }
  }
}
</script>

<style scoped>
.tarjeta-cliente {
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
  text-align: center;
  color: #161616;
  text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.45);
}

.tarjeta-franja h3 {
  margin: 0;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.franja-otilio { background: #FFEB3B; }
.franja-joselito { background: #2196F3; }
.franja-lorena { background: #e67e22; }
.franja-catarro { background: #FF5252; }
.franja-ozuna { background: #4CAF50; }
.franja-temporal {
  background: #95a5a6;
  color: #fff;
  text-shadow: none;
}

.tarjeta-lineas {
  list-style: none;
  margin: 0;
  padding: 2px 8px 6px;
}

.tarjeta-linea {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 2px 6px;
  align-items: start;
  padding: 6px 0;
  border-bottom: 1px solid #eef1f4;
}

.tarjeta-linea:last-child { border-bottom: 0; }

.tarjeta-linea.hecha .linea-cuerpo { opacity: 0.55; }

.linea-check {
  display: flex;
  justify-content: center;
  min-height: 28px;
  padding-top: 1px;
}

.linea-cuerpo { min-width: 0; }

.linea-arriba {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.linea-kilos { white-space: nowrap; }

.linea-medida {
  min-width: 0;
  text-align: right;
  overflow-wrap: anywhere;
}

.linea-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 3px;
}

.linea-tipo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.25;
  color: #3d4c55;
  overflow-wrap: anywhere;
}

.linea-tipo.compact { font-size: 10px; }

.text-blue,
.text-blue.compact { color: #0000FF; }

.text-orange { color: #e67e22; }

.tara-marca {
  color: #212529;
  font-size: 0.72em;
  font-style: italic;
  vertical-align: super;
  margin-left: 1px;
}

.proveedor-tag,
.etiqueta-tag,
.nota-tag,
.neto-tag {
  display: inline-block;
  max-width: 100%;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.proveedor-tag {
  background: #9b59b6;
  color: #fff;
}

.etiqueta-tag {
  color: #fff;
  background: #16a085;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.nota-tag,
.neto-tag {
  background: #e74c3c;
  color: #fff;
}

.tarjeta-vacia {
  margin: 0;
  padding: 12px 8px;
  color: #6b7c86;
  font-size: 12px;
  text-align: center;
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
  color: #24343c;
  font-size: 11px;
  font-weight: 700;
}

.tarjeta-pie strong {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
  text-align: right;
}

.pedido-checkbox {
  width: 18px;
  height: 18px;
  margin: 0;
  cursor: pointer;
  border: 2px solid #4CAF50;
  border-radius: 4px;
  appearance: none;
  -webkit-appearance: none;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.pedido-checkbox:checked { background: #4CAF50; }

.pedido-checkbox:checked::after {
  content: '✓';
  color: #fff;
  font-size: 12px;
  line-height: 1;
}

.pedido-checkbox:focus-visible {
  outline: 2px solid #176653;
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (min-width: 768px) {
  .tarjeta-franja h3 { font-size: 15px; }
  .linea-arriba { font-size: 14px; }
  .linea-tipo { font-size: 12px; }
  .tarjeta-pie { font-size: 12px; padding: 8px 10px; }
  .tarjeta-pie strong { font-size: 14px; }
}

@media print {
  .tarjeta-cliente {
    box-shadow: none;
    break-inside: avoid;
  }

  .pedido-checkbox { border-color: #000; }
  .pedido-checkbox:checked { background: #000; }

  .tarjeta-franja,
  .etiqueta-tag,
  .nota-tag,
  .neto-tag,
  .proveedor-tag {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
