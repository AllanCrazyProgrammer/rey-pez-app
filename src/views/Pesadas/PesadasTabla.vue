<template>
  <div class="pesadas-grid-scroll" role="region" aria-label="Tabla de pesadas, desplázate para ver más columnas" tabindex="0">
    <table class="pesadas-grid">
      <thead>
        <tr class="number-row">
          <th class="name-cell" scope="col">Columna</th>
          <th v-for="(columna, index) in columnas" :key="columna.id" scope="col"><span>{{ index + 1 }}</span><button class="remove-column" :aria-label="`Eliminar columna ${index + 1}`" @click="$emit('eliminar-columna', columna)">×</button></th>
          <th rowspan="3" class="add-column-cell" scope="col"><button aria-label="Agregar columna" title="Agregar columna" @click="$emit('agregar-columna')">+</button></th>
          <th rowspan="3" scope="col">Total kg</th><th rowspan="3" scope="col">A pagar<small>− $1 de baños</small></th>
        </tr>
        <tr class="measure-row">
          <th class="name-cell" scope="row">Medida</th>
          <td v-for="(columna, index) in columnas" :key="columna.id"><input :value="valor(`columnas.${columna.id}.medida`, columna.medida)" :aria-label="`Medida columna ${index + 1}`" placeholder="Ej. 51 o laguna" maxlength="80" @input="editar(`columnas.${columna.id}.medida`, $event, 'texto')" @blur="confirmar(`columnas.${columna.id}.medida`)" @keydown.enter.prevent="confirmar(`columnas.${columna.id}.medida`)"></td>
        </tr>
        <tr class="price-row">
          <th class="name-cell" scope="row">Precio / kg</th>
          <td v-for="(columna, index) in columnas" :key="columna.id">
            <div class="price-input"><span aria-hidden="true">$</span><input :value="valor(`columnas.${columna.id}.precio`, columna.precio)" inputmode="decimal" :aria-label="`Precio por kilo columna ${index + 1}`" :aria-invalid="!!errores[`columnas.${columna.id}.precio`]" :title="errores[`columnas.${columna.id}.precio`]" @input="editar(`columnas.${columna.id}.precio`, $event, 'precio')" @blur="confirmar(`columnas.${columna.id}.precio`)" @keydown.enter.prevent="confirmar(`columnas.${columna.id}.precio`)"></div>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(persona, rowIndex) in personas" :key="persona.id">
          <th class="name-cell" scope="row"><div class="name-input"><span class="row-number">{{ rowIndex + 1 }}</span><span class="name-editor"><span class="name-width" aria-hidden="true">{{ valor(`personas.${persona.id}.nombre`, persona.nombre) || 'Nombre + Enter' }}</span><input :ref="`nombre-${persona.id}`" :value="valor(`personas.${persona.id}.nombre`, persona.nombre)" :aria-label="`Nombre despicadora ${rowIndex + 1}`" placeholder="Nombre + Enter" maxlength="120" autocomplete="off" @input="editar(`personas.${persona.id}.nombre`, $event, 'texto')" @blur="confirmar(`personas.${persona.id}.nombre`)" @keydown.enter.prevent="$emit('enter-nombre', persona.id)"></span><button :aria-label="`Eliminar fila ${persona.nombre || rowIndex + 1}`" @click="$emit('eliminar-persona', persona)">×</button></div></th>
          <td v-for="(columna, colIndex) in columnas" :key="columna.id"><input :ref="`peso-${persona.id}-${columna.id}`" :value="valor(`pesos.${persona.id}.${columna.id}`, pesos[persona.id] && pesos[persona.id][columna.id])" inputmode="decimal" :disabled="!persona.nombre.trim()" :aria-label="`Kilos de ${persona.nombre || 'fila ' + (rowIndex + 1)}, columna ${colIndex + 1}`" :aria-invalid="!!errores[`pesos.${persona.id}.${columna.id}`]" :title="errores[`pesos.${persona.id}.${columna.id}`]" placeholder="—" @input="editar(`pesos.${persona.id}.${columna.id}`, $event, 'kilos')" @blur="confirmar(`pesos.${persona.id}.${columna.id}`)" @keydown.enter.prevent="$emit('enter-peso', { personaId: persona.id, columnaId: columna.id })"></td>
          <td class="add-column-body" aria-hidden="true"></td><td class="total-cell">{{ total(persona.id, 'kilos') }}</td><td class="total-cell final-cell" :class="{ negative: totales[persona.id] && totales[persona.id].pago < 0 }">{{ total(persona.id, 'pago', true) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { formatoPesada } from '@/utils/pesadas';
export default {
  name: 'PesadasTabla',
  props: {
    columnas: { type: Array, required: true }, personas: { type: Array, required: true },
    pesos: { type: Object, default: () => ({}) }, totales: { type: Object, required: true },
    borradores: { type: Object, required: true }, errores: { type: Object, required: true }
  },
  methods: {
    valor(path, fallback) { return Object.prototype.hasOwnProperty.call(this.borradores, path) ? this.borradores[path] : (fallback == null ? '' : String(fallback)); },
    editar(path, event, tipo) { this.$emit('editar', { path, value: event.target.value, tipo }); },
    confirmar(path) { this.$emit('confirmar', path); },
    total(id, field, money = false) { return this.totales[id] ? `${money ? '$' : ''}${formatoPesada(this.totales[id][field])}` : '—'; },
    enfocar(ref) {
      const input = this.$refs[ref];
      const element = Array.isArray(input) ? input[0] : input;
      if (element) { element.focus(); element.select(); }
    }
  }
};
</script>
