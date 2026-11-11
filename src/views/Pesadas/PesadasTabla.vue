<template>
  <div class="pesadas-grid-scroll" role="region" aria-label="Tabla de pesadas, desplázate para ver más columnas" tabindex="0" @focusin="activarCelda" @focusout="salirCelda">
    <table class="pesadas-grid">
      <thead>
        <tr class="number-row">
          <th class="name-cell" scope="col">Columna</th>
          <th v-for="(columna, index) in columnas" :key="columna.id" :data-columna-id="columna.id" :class="{ 'active-column': columnaActivaId === columna.id }" scope="col"><span>{{ index + 1 }}</span><button class="remove-column" :aria-label="`Eliminar columna ${index + 1}`" @click="$emit('eliminar-columna', columna)">×</button></th>
          <th rowspan="3" class="add-column-cell" scope="col"><button aria-label="Agregar columna" title="Agregar columna" @click="$emit('agregar-columna')">+</button></th>
          <th rowspan="3" class="total-header" scope="col">Total kg</th><th rowspan="3" class="pay-header" scope="col">A pagar<small>− $1 de baños</small></th>
        </tr>
        <tr class="measure-row">
          <th class="name-cell" scope="row">Medida</th>
          <td v-for="(columna, index) in columnas" :key="columna.id" :data-columna-id="columna.id" :class="{ 'active-column': columnaActivaId === columna.id }"><input :ref="`medida-${columna.id}`" :value="valor(`columnas.${columna.id}.medida`, columna.medida)" :aria-label="`Medida columna ${index + 1}`" maxlength="80" @input="editar(`columnas.${columna.id}.medida`, $event, 'texto')" @blur="confirmar(`columnas.${columna.id}.medida`)" @keydown.enter.prevent="$emit('enter-medida', columna.id)" @keydown="navegarFlecha($event, { tipo: 'medida', columnaId: columna.id })"></td>
        </tr>
        <tr class="price-row">
          <th class="name-cell" scope="row">Precio / kg</th>
          <td v-for="(columna, index) in columnas" :key="columna.id" :data-columna-id="columna.id" :class="{ 'active-column': columnaActivaId === columna.id }">
            <div class="price-input"><span aria-hidden="true">$</span><input :ref="`precio-${columna.id}`" :value="valor(`columnas.${columna.id}.precio`, columna.precio)" inputmode="decimal" :aria-label="`Precio por kilo columna ${index + 1}`" :aria-invalid="!!errores[`columnas.${columna.id}.precio`]" :title="errores[`columnas.${columna.id}.precio`]" @input="editar(`columnas.${columna.id}.precio`, $event, 'precio')" @blur="confirmar(`columnas.${columna.id}.precio`)" @keydown.enter.prevent="$emit('enter-precio', columna.id)" @keydown="navegarFlecha($event, { tipo: 'precio', columnaId: columna.id })"></div>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(persona, rowIndex) in personas" :key="persona.id" :data-persona-id="persona.id">
          <th class="name-cell" :class="{ 'active-person': personaActivaId === persona.id }" scope="row" @contextmenu="abrirMenu($event, persona)" @touchstart="iniciarPulsacion($event, persona)" @touchmove="moverPulsacion" @touchend="terminarPulsacion" @touchcancel="cancelarPulsacion"><div class="name-input"><span class="row-number">{{ rowIndex + 1 }}</span><span class="name-editor"><span class="name-width" aria-hidden="true">{{ valor(`personas.${persona.id}.nombre`, persona.nombre) || 'Nombre' }}</span><input :ref="`nombre-${persona.id}`" :value="valor(`personas.${persona.id}.nombre`, persona.nombre)" :aria-label="`Nombre despicadora ${rowIndex + 1}`" placeholder="Nombre" maxlength="120" autocomplete="off" @focus="personaActivaId = ''" @input="editar(`personas.${persona.id}.nombre`, $event, 'texto')" @blur="confirmar(`personas.${persona.id}.nombre`)" @keydown.enter.prevent="$emit('enter-nombre', persona.id)" @keydown="navegarFlecha($event, { tipo: 'nombre', personaId: persona.id })"></span><button :aria-label="`Eliminar fila ${persona.nombre || rowIndex + 1}`" @click="$emit('eliminar-persona', persona)">×</button></div></th>
          <td v-for="(columna, colIndex) in columnas" :key="columna.id" :data-columna-id="columna.id" :class="{ 'active-column': columnaActivaId === columna.id }"><input :ref="`peso-${persona.id}-${columna.id}`" :value="valor(`pesos.${persona.id}.${columna.id}`, pesos[persona.id] && pesos[persona.id][columna.id])" inputmode="decimal" :disabled="!persona.nombre.trim()" :aria-label="`Kilos de ${persona.nombre || 'fila ' + (rowIndex + 1)}, columna ${colIndex + 1}`" :aria-invalid="!!errores[`pesos.${persona.id}.${columna.id}`]" :title="errores[`pesos.${persona.id}.${columna.id}`]" placeholder="—" @focus="personaActivaId = persona.id" @input="editar(`pesos.${persona.id}.${columna.id}`, $event, 'kilos')" @blur="confirmar(`pesos.${persona.id}.${columna.id}`)" @keydown.enter.prevent="$emit('enter-peso', { personaId: persona.id, columnaId: columna.id })" @keydown="navegarFlecha($event, { tipo: 'peso', personaId: persona.id, columnaId: columna.id })"></td>
          <td class="add-column-body" aria-hidden="true"></td><td class="total-cell">{{ total(persona.id, 'kilos') }}</td><td class="total-cell final-cell" :class="{ negative: totales[persona.id] && totales[persona.id].pago < 0 }">{{ total(persona.id, 'pago', true) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="column-totals-row">
          <th class="name-cell" scope="row">Total kg</th>
          <td v-for="columna in columnas" :key="columna.id" :data-columna-id="columna.id" :class="{ 'active-column': columnaActivaId === columna.id }">{{ formato(totalesColumnas[columna.id]) }}</td>
          <td class="add-column-body" aria-hidden="true"></td><td class="total-cell">{{ formato(totalKilos) }}</td><td class="total-cell final-cell" aria-hidden="true">—</td>
        </tr>
      </tfoot>
    </table>
    <div v-if="menu" ref="menu" class="pesadas-row-menu" role="menu" :aria-label="`Opciones de la fila ${menu.etiqueta}`" :style="{ left: `${menu.x}px`, top: `${menu.y}px` }" @contextmenu.prevent @keydown.esc.prevent="cerrarMenu(true)">
      <button ref="menuArriba" type="button" role="menuitem" @click="insertar('arriba')">↑ Agregar fila arriba</button>
      <button type="button" role="menuitem" @click="insertar('abajo')">↓ Agregar fila abajo</button>
    </div>
  </div>
</template>

<script>
import { formatoPagoPesada, formatoPesada } from '@/utils/pesadas';
export default {
  name: 'PesadasTabla',
  props: {
    columnas: { type: Array, required: true }, personas: { type: Array, required: true },
    pesos: { type: Object, default: () => ({}) }, totales: { type: Object, required: true },
    totalesColumnas: { type: Object, default: () => ({}) },
    borradores: { type: Object, required: true }, errores: { type: Object, required: true }
  },
  data: () => ({ personaActivaId: '', columnaActivaId: '', menu: null }),
  computed: {
    totalKilos() { return Object.values(this.totalesColumnas).reduce((total, kilos) => total + kilos, 0); }
  },
  beforeDestroy() { this.cancelarPulsacion(); this.cerrarMenu(); },
  methods: {
    abrirMenu(event, persona) {
      event.preventDefault();
      if (Date.now() - (this._pulsacionAbrio || 0) < 800) return; // Android also fires contextmenu on long-press.
      let { clientX: x, clientY: y } = event;
      if (!x && !y) { const rect = event.currentTarget.getBoundingClientRect(); x = rect.left + 24; y = rect.bottom; }
      this.mostrarMenu(persona, x, y);
    },
    async mostrarMenu(persona, x, y) {
      const index = this.personas.findIndex(row => row.id === persona.id);
      this._menuOrigen = document.activeElement;
      this.menu = { personaId: persona.id, etiqueta: persona.nombre || index + 1, x, y };
      document.addEventListener('mousedown', this.clickFueraMenu, true);
      document.addEventListener('touchstart', this.clickFueraMenu, true);
      document.addEventListener('keydown', this.teclaMenu, true);
      window.addEventListener('scroll', this.cerrarMenuSinFoco, true);
      window.addEventListener('resize', this.cerrarMenuSinFoco);
      await this.$nextTick();
      const el = this.$refs.menu;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margen = 8;
      this.menu.x = Math.max(margen, Math.min(x, window.innerWidth - rect.width - margen));
      this.menu.y = Math.max(margen, y + rect.height + margen > window.innerHeight ? y - rect.height : y);
      if (this.$refs.menuArriba) this.$refs.menuArriba.focus({ preventScroll: true });
    },
    cerrarMenu(devolverFoco = false) {
      if (!this.menu) return;
      this.menu = null;
      document.removeEventListener('mousedown', this.clickFueraMenu, true);
      document.removeEventListener('touchstart', this.clickFueraMenu, true);
      document.removeEventListener('keydown', this.teclaMenu, true);
      window.removeEventListener('scroll', this.cerrarMenuSinFoco, true);
      window.removeEventListener('resize', this.cerrarMenuSinFoco);
      if (devolverFoco && this._menuOrigen && this._menuOrigen.focus) this._menuOrigen.focus({ preventScroll: true });
    },
    cerrarMenuSinFoco() { this.cerrarMenu(); },
    clickFueraMenu(event) { if (this.$refs.menu && !this.$refs.menu.contains(event.target)) this.cerrarMenu(); },
    teclaMenu(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.cerrarMenu(true); }
      if (event.key === 'Tab') this.cerrarMenu();
    },
    insertar(posicion) {
      const personaId = this.menu && this.menu.personaId;
      this.cerrarMenu();
      if (personaId) this.$emit('insertar-persona', { personaId, posicion });
    },
    iniciarPulsacion(event, persona) {
      this.cancelarPulsacion();
      if (event.touches.length !== 1 || event.target.closest('button')) return;
      const { clientX: x, clientY: y } = event.touches[0];
      this._pulsacion = { x, y, abierto: false, timer: setTimeout(() => {
        this._pulsacion.abierto = true;
        this._pulsacionAbrio = Date.now();
        if (navigator.vibrate) navigator.vibrate(15);
        this.mostrarMenu(persona, x, y);
      }, 550) };
    },
    moverPulsacion(event) {
      const p = this._pulsacion;
      if (!p || p.abierto) return;
      const t = event.touches[0];
      if (Math.abs(t.clientX - p.x) > 10 || Math.abs(t.clientY - p.y) > 10) this.cancelarPulsacion();
    },
    terminarPulsacion(event) {
      // After a long-press, stop the tap from focusing the input and opening the keyboard.
      if (this._pulsacion && this._pulsacion.abierto && event.cancelable) event.preventDefault();
      this.cancelarPulsacion();
    },
    cancelarPulsacion() {
      if (this._pulsacion) clearTimeout(this._pulsacion.timer);
      this._pulsacion = null;
    },
    activarCelda(event) {
      const celda = event.target.closest('[data-columna-id]');
      const fila = event.target.closest('[data-persona-id]');
      this.columnaActivaId = celda ? celda.dataset.columnaId : '';
      this.personaActivaId = fila ? fila.dataset.personaId : '';
    },
    salirCelda(event) {
      if (!event.relatedTarget || !this.$el.contains(event.relatedTarget)) {
        this.columnaActivaId = '';
        this.personaActivaId = '';
      }
    },
    valor(path, fallback) { return Object.prototype.hasOwnProperty.call(this.borradores, path) ? this.borradores[path] : (fallback == null ? '' : String(fallback)); },
    editar(path, event, tipo) { this.$emit('editar', { path, value: event.target.value, tipo }); },
    confirmar(path) { this.$emit('confirmar', path); },
    formato: formatoPesada,
    navegarFlecha(event, celda) {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      this.$emit('flecha', { ...celda, direccion: event.key });
    },
    total(id, field, money = false) { return this.totales[id] ? `${money ? '$' : ''}${money ? formatoPagoPesada(this.totales[id][field]) : formatoPesada(this.totales[id][field])}` : '—'; },
    enfocar(ref) {
      const input = this.$refs[ref];
      const element = Array.isArray(input) ? input[0] : input;
      if (element) { element.focus(); element.select(); element.scrollIntoView({ block: 'center', inline: 'nearest' }); }
    }
  }
};
</script>
