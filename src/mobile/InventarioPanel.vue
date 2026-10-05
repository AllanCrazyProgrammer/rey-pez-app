<template>
  <section class="rp-inventory">
    <div class="rp-page-heading rp-heading-row"><div><p class="rp-eyebrow">EXISTENCIAS</p><h1>{{ tipo === 'limpios' ? 'Limpios' : 'Crudos' }}</h1></div><button class="rp-icon-button" @click="$emit('refresh')" aria-label="Actualizar inventario" :disabled="cargando"><MobileIcon name="refresh" /></button></div>
    <SectionTabs :tipo="tipo" />
    <div class="rp-stock-hero" :class="{ 'rp-stock-raw': tipo === 'crudos' }">
      <span>Total en inventario</span><strong>{{ cargando ? '—' : formatNumber(total, 1) }} <small>kg</small></strong>
      <div v-if="!cargando"><span v-if="tipo === 'limpios'">{{ formatNumber(total / 20, 2) }} cajas de 20 kg</span><span v-else>Inventario únicamente en kilos</span><span>{{ proveedores.length }} {{ tipo === 'limpios' ? 'orígenes' : (proveedores.length === 1 ? 'proveedor' : 'proveedores') }}</span></div>
    </div>
    <div class="rp-quick-actions"><router-link :to="rutaCaptura('entrada')" class="rp-button rp-button-primary"><MobileIcon name="in" />Entrada</router-link><router-link :to="rutaCaptura('salida')" class="rp-button rp-button-secondary"><MobileIcon name="out" />Salida</router-link></div>
    <label class="rp-search"><MobileIcon name="search" /><input v-model="busqueda" type="search" :placeholder="tipo === 'limpios' ? 'Medida o marca' : 'Proveedor o producto'" aria-label="Buscar en inventario" /></label>
    <details class="rp-filters"><summary>Filtrar por proveedor o cuarto <span v-if="proveedor || cuarto" class="rp-filter-dot"></span></summary><div class="rp-filter-grid"><label>Proveedor<select v-model="proveedor" aria-label="Filtrar por proveedor"><option value="">Todos</option><option v-for="p in proveedores" :key="p">{{ p }}</option></select></label><label>Cuarto frío<select v-model="cuarto" aria-label="Filtrar por cuarto frío"><option value="">Todos</option><option v-for="c in cuartos" :key="c" :value="c">{{ c === 's/c' ? 'Sin cuarto' : c }}</option></select></label></div></details>
    <div class="rp-list-heading"><span>{{ tipo === 'limpios' ? 'Medidas disponibles por origen' : lista.length + ' productos' }}<template v-if="busqueda || proveedor || cuarto"> · {{ formatNumber(totalFiltrado, 1) }} kg</template></span><button v-if="busqueda || proveedor || cuarto" class="rp-text-button" @click="limpiar">Limpiar filtros</button></div>
    <p v-if="cargando" class="rp-message" role="status">Actualizando existencias…</p>
    <div v-else-if="error" class="rp-message rp-error" role="alert"><p>{{ error }}</p><button class="rp-button rp-button-secondary" @click="$emit('refresh')">Reintentar</button></div>
    <div v-else-if="!filtrados.length" class="rp-empty"><MobileIcon name="box" /><h2>{{ items.length ? 'Sin coincidencias' : 'Sin existencias' }}</h2><p>{{ items.length ? 'Prueba otra búsqueda o limpia los filtros.' : 'Las entradas y salidas registradas se reflejarán aquí.' }}</p></div>
    <div v-else-if="tipo === 'limpios'">
      <section v-for="seccion in secciones" :key="seccion.key" class="rp-stock-section" :class="{ 'rp-maquila-section': seccion.tipo === 'maquila' }" :aria-label="seccion.tipo === 'maquila' ? 'Inventario de ' + seccion.nombre : 'Inventario de proveedores'">
        <h2 v-if="seccion === primeraMaquila" class="rp-origin-title">Maquilas</h2>
        <div class="rp-origin-heading"><div><h2 v-if="seccion.tipo === 'proveedor'">Proveedores</h2><h3 v-else>{{ seccion.nombre }}</h3><span>{{ seccion.tipo === 'maquila' ? 'Existencias de esta maquila' : 'Medidas de proveedores' }}</span></div><div class="rp-origin-total"><strong>{{ formatNumber(seccion.kilos, 1) }} kg</strong><span>{{ formatNumber(seccion.kilos / 20, 2) }} cajas</span></div></div>
        <ul class="rp-measure-list"><li v-for="grupo in seccion.grupos.slice(0, limite)" :key="grupo.key"><MedidaDisponible :grupo="grupo" :maquila="seccion.tipo === 'maquila'" /></li></ul>
      </section>
    </div>
    <ul v-else class="rp-stock-list">
      <li v-for="item in visibles" :key="item.id" class="rp-card rp-stock-item">
        <div class="rp-stock-main"><span class="rp-provider">{{ item.proveedor }}</span><h2>{{ item.medida }}<span v-if="tipo === 'crudos'" class="rp-meta"> · Pcz: {{ item.piezas || '—' }}</span></h2><span class="rp-room"><MobileIcon name="box" />{{ item.cuarto === 's/c' ? 'Sin cuarto' : item.cuarto }}</span><span v-if="item.fecha" class="rp-meta">Entrada {{ mostrarFecha(item.fecha, true) }}</span><span v-if="item.precio" class="rp-meta">${{ formatNumber(item.precio) }}/kg</span></div>
        <div class="rp-stock-amount"><strong>{{ formatNumber(item.kilos, 1) }}</strong><span>kilos</span><small v-if="tipo === 'limpios'">{{ formatNumber(item.kilos / 20, 2) }} cajas</small></div>
      </li>
    </ul>
    <button v-if="tipo === 'limpios' ? secciones.some(s => s.grupos.length > limite) : lista.length > limite" class="rp-button rp-button-secondary rp-full" @click="limite += 30">Ver más existencias</button>
  </section>
</template>
<script>
import MobileIcon from './MobileIcon.vue';
import SectionTabs from './SectionTabs.vue';
import MedidaDisponible from './MedidaDisponible.vue';
import { separarLimpios, medidaBase } from './medidas';
import { buscarTexto, mostrarFecha } from './fechas';
import { formatNumber } from '@/utils/formatters';
export default {
  components: { MobileIcon, SectionTabs, MedidaDisponible },
  props: { tipo: String, items: { type: Array, default: () => [] }, catalogoOrigenes: { type: Array, default: () => [] }, cargando: Boolean, error: String },
  data: () => ({ busqueda: '', proveedor: '', cuarto: '', limite: 30 }),
  computed: {
    proveedores() { return [...new Set(this.items.map(i => i.proveedor))].sort((a, b) => a.localeCompare(b, 'es')); },
    cuartos() { return [...new Set(this.items.map(i => i.cuarto))].sort((a, b) => a.localeCompare(b, 'es')); },
    total() { return this.items.reduce((sum, i) => sum + i.kilos, 0); },
    filtrados() { const q = buscarTexto(this.busqueda); return this.items.filter(i => (!this.proveedor || i.proveedor === this.proveedor) && (!this.cuarto || i.cuarto === this.cuarto) && (!q || buscarTexto(`${i.proveedor} ${i.medida} ${this.tipo === 'limpios' ? medidaBase(i.medida) : ''} ${i.cuarto}`).includes(q))); },
    totalFiltrado() { return this.filtrados.reduce((sum, i) => sum + i.kilos, 0); },
    secciones() { return this.tipo === 'limpios' ? separarLimpios(this.filtrados, this.catalogoOrigenes) : []; },
    primeraMaquila() { return this.secciones.find(s => s.tipo === 'maquila'); },
    lista() { return this.tipo === 'limpios' ? this.secciones.flatMap(s => s.grupos) : this.filtrados; },
    visibles() { return this.lista.slice(0, this.limite); }
  },
  watch: { busqueda() { this.limite = 30; }, proveedor() { this.limite = 30; }, cuarto() { this.limite = 30; } },
  methods: {
    formatNumber, mostrarFecha,
    limpiar() { this.busqueda = ''; this.proveedor = ''; this.cuarto = ''; },
    rutaCaptura(tipo) { return { path: this.tipo === 'limpios' ? '/sacadas' : '/movimientos-crudos', query: { capturar: tipo } }; }
  }
};
</script>
