<template>
  <div class="detalle-crudo-overlay" @click.self="$emit('cerrar')">
    <section ref="dialogo" class="detalle-crudo-dialogo" role="dialog" aria-modal="true"
      aria-labelledby="detalle-crudo-titulo" aria-describedby="detalle-crudo-proveedor" tabindex="-1">
      <header class="detalle-crudo-header">
        <div><p id="detalle-crudo-proveedor">{{ proveedor }}</p><h2 id="detalle-crudo-titulo">{{ producto.nombre }}</h2></div>
        <button ref="cerrar" type="button" class="detalle-crudo-cerrar" aria-label="Cerrar detalle" @click="$emit('cerrar')">×</button>
      </header>
      <div class="detalle-crudo-cuerpo">
        <p class="detalle-crudo-kilos">{{ formatNumber(producto.kilos) }} <span>kg disponibles</span></p>
        <dl>
          <template v-if="tieneDato(producto.piezas)"><dt>Pcz</dt><dd>{{ producto.piezas }}</dd></template>
          <dt>Cuarto</dt><dd>{{ producto.cuarto || 's/c' }}</dd>
          <template v-if="!soloInventario"><dt>Taras</dt><dd>{{ (producto.kilos / 19).toFixed(1) }}</dd></template>
          <template v-if="mostrarPrecio"><dt>Precio/kg</dt><dd>{{ producto.ultimoPrecio > 0 ? moneda(producto.ultimoPrecio, 2) : '—' }}</dd>
          <dt>Valor</dt><dd>{{ producto.ultimoPrecio > 0 ? moneda(producto.valor, 0) : '—' }}</dd></template>
        </dl>
        <section v-if="producto.cuartos && producto.cuartos.length > 1" class="detalle-crudo-cuartos" aria-label="Desglose por cuarto">
          <h3>Desglose por cuarto</h3>
          <dl><template v-for="(cuarto, indice) in producto.cuartos"><dt :key="`cuarto-${indice}`">{{ cuarto.cuarto || 's/c' }}</dt><dd :key="`kilos-${indice}`">{{ formatNumber(cuarto.kilos) }} kg</dd></template></dl>
        </section>
      </div>
      <footer class="detalle-crudo-acciones">
        <button type="button" @click="$emit('historial')">Ver historial</button>
        <button type="button" @click="$emit('cuarto')">{{ producto.cuartos && producto.cuartos.length > 1 ? 'Gestionar cuartos' : 'Cambiar cuarto' }}</button>
        <button type="button" class="detalle-crudo-listo" @click="$emit('cerrar')">Cerrar</button>
      </footer>
    </section>
  </div>
</template>
<script>
import { formatNumber } from '@/utils/formatters';
export default {
  name: 'ModalDetalleCrudo',
  props: {
    disparador: { default: null },
    producto: { type: Object, required: true },
    proveedor: { type: String, required: true },
    soloInventario: { type: Boolean, default: false },
    mostrarPrecio: { type: Boolean, default: false }
  },
  mounted() {
    this.focoAnterior = this.disparador || document.activeElement;
    this.overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this.teclaDialogo);
    this.$nextTick(() => { if (this.$refs.cerrar) this.$refs.cerrar.focus(); });
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.teclaDialogo);
    document.body.style.overflow = this.overflowAnterior;
    if (this.focoAnterior && this.focoAnterior.isConnected) this.focoAnterior.focus();
  },
  methods: {
    formatNumber,
    tieneDato(valor) { return valor !== null && valor !== undefined && String(valor).trim() !== ''; },
    moneda(valor, decimales) { return '$' + Number(valor).toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }); },
    teclaDialogo(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.$emit('cerrar'); }
      if (event.key !== 'Tab') return;
      const botones = [...this.$refs.dialogo.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
      const primero = botones[0], ultimo = botones[botones.length - 1];
      if (event.shiftKey && (document.activeElement === primero || !this.$refs.dialogo.contains(document.activeElement))) {
        event.preventDefault(); ultimo.focus();
      } else if (!event.shiftKey && (document.activeElement === ultimo || !this.$refs.dialogo.contains(document.activeElement))) {
        event.preventDefault(); primero.focus();
      }
    }
  }
};
</script>
<style scoped>
.detalle-crudo-overlay { position: fixed; inset: 0; z-index: 2200; background: rgba(15, 23, 42, .65); padding: 16px; display: flex; align-items: center; justify-content: center; }
.detalle-crudo-dialogo { box-sizing: border-box; width: 100%; max-width: 520px; max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); overflow-y: auto; background: #fff; color: #1f2a44; border-radius: 20px; box-shadow: 0 24px 80px #0005; overflow-wrap: anywhere; }
.detalle-crudo-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 20px 20px 12px; border-bottom: 1px solid #dce5f1; }
.detalle-crudo-header p { margin: 0 0 6px; color: #53647d; font-size: 14px; }
.detalle-crudo-header h2 { margin: 0; font-size: 24px; color: #244e98; }
.detalle-crudo-cerrar { flex: 0 0 44px; height: 44px; border: 0; border-radius: 50%; background: #edf2fa; color: #244e98; font-size: 28px; }
.detalle-crudo-cuerpo { padding: 16px 20px; }
.detalle-crudo-kilos { color: #244e98; font-size: 28px; font-weight: 700; margin: 0 0 20px; }
.detalle-crudo-kilos span { display: block; font-size: 14px; font-weight: 400; }
.detalle-crudo-dialogo dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 12px; margin: 0; font-size: 16px; }
.detalle-crudo-dialogo dt { color: #53647d; font-weight: 500; }
.detalle-crudo-dialogo dd { margin: 0; text-align: right; font-weight: 600; }
.detalle-crudo-cuartos { margin-top: 20px; padding-top: 16px; border-top: 1px solid #dce5f1; }
.detalle-crudo-cuartos h3 { font-size: 17px; margin: 0 0 12px; }
.detalle-crudo-acciones { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px 20px 20px; }
.detalle-crudo-acciones button { flex: 1 1 130px; padding: 10px; min-height: 44px; border: 1px solid #b8c9e3; border-radius: 10px; background: #f3f6fc; color: #244e98; font-size: 14px; }
.detalle-crudo-acciones .detalle-crudo-listo { background: #315eae; color: #fff; border-color: #315eae; }
.detalle-crudo-dialogo button { cursor: pointer; }
.detalle-crudo-dialogo button:focus-visible { outline: 3px solid #e9a526; outline-offset: 2px; }
@media print { .detalle-crudo-overlay { display: none; } }
</style>
