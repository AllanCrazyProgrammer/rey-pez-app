<template>
  <details class="rp-card rp-measure" @toggle="abierto = $event.target.open">
    <summary class="rp-measure-heading">
      <span class="rp-measure-main"><strong>{{ grupo.medida }}</strong><span><template v-if="!maquila">{{ marcas.length }} {{ marcas.length === 1 ? 'marca' : 'marcas' }} · </template>{{ grupo.items.length }} {{ grupo.items.length === 1 ? 'entrada' : 'entradas' }}</span><span class="rp-measure-hint">{{ abierto ? 'Ocultar desglose' : (maquila ? 'Ver entradas' : 'Ver marcas y entradas') }}</span></span>
      <span class="rp-stock-amount"><strong>{{ formatNumber(grupo.kilos, 1) }}</strong><span>kg disponibles</span><small>{{ formatNumber(grupo.kilos / 20, 2) }} cajas</small></span>
      <MobileIcon name="chevron" class="rp-measure-chevron" />
    </summary>
    <div class="rp-measure-detail">
      <section v-for="marca in marcas" :key="marca.nombre" class="rp-brand-lots" :aria-label="'Entradas de ' + marca.nombre">
        <div class="rp-brand-heading"><h3>{{ marca.nombre }}</h3><span>{{ formatNumber(marca.kilos, 1) }} kg <small>· {{ formatNumber(marca.kilos / 20, 2) }} cajas</small></span></div>
        <ul class="rp-stock-list">
          <li v-for="item in marca.items" :key="item.id" class="rp-stock-item rp-stock-lot">
            <div class="rp-stock-main"><strong>{{ item.medida }}</strong><span class="rp-meta">Entrada {{ mostrarFecha(item.fecha, true) }}</span><span class="rp-room"><MobileIcon name="box" />{{ item.cuarto === 's/c' ? 'Sin cuarto' : item.cuarto }}</span><span v-if="item.precio" class="rp-meta">${{ formatNumber(item.precio) }}/kg</span></div>
            <div class="rp-stock-amount"><strong>{{ formatNumber(item.kilos, 1) }}</strong><span>kg disponibles</span><small>{{ formatNumber(item.kilos / 20, 2) }} cajas</small></div>
          </li>
        </ul>
      </section>
    </div>
  </details>
</template>
<script>
import MobileIcon from './MobileIcon.vue';
import { mostrarFecha } from './fechas';
import { formatNumber } from '@/utils/formatters';
export default {
  components: { MobileIcon }, props: { grupo: { type: Object, required: true }, maquila: Boolean },
  data: () => ({ abierto: false }),
  computed: {
    marcas() {
      const marcas = new Map();
      for (const item of this.grupo.items) {
        const nombre = item.proveedor || 'Sin marca';
        if (!marcas.has(nombre)) marcas.set(nombre, { nombre, kilos: 0, items: [] });
        const marca = marcas.get(nombre);
        marca.kilos += Number(item.kilos);
        marca.items.push(item);
      }
      return [...marcas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }
  },
  methods: { formatNumber, mostrarFecha }
};
</script>
