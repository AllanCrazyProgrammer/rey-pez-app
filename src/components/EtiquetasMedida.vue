<template>
  <span class="etiquetas-medida">
    <button
      v-for="etiqueta in etiquetas"
      :key="etiqueta"
      type="button"
      class="btn-etiqueta"
      :class="{ active: item.etiqueta === etiqueta }"
      :style="estiloBoton(etiqueta)"
      :title="etiqueta"
      @click="$emit('toggle', etiqueta)"
    >
      {{ etiqueta }}
    </button>
    <button
      type="button"
      class="btn-etiqueta-add"
      title="Crear botón de etiqueta"
      @click="$emit('crear')"
    >
      +
    </button>
  </span>
</template>

<script>
import { colorParaEtiqueta } from '@/utils/coloresEtiquetas'

export default {
  name: 'EtiquetasMedida',
  props: {
    item: {
      type: Object,
      required: true
    },
    etiquetas: {
      type: Array,
      default: () => []
    },
    coloresPorEtiqueta: {
      type: Object,
      default: () => ({})
    }
  },
  methods: {
    estiloBoton(etiqueta) {
      const color = colorParaEtiqueta(etiqueta, this.etiquetas, this.coloresPorEtiqueta)
      if (!color) return {}
      const activa = this.item.etiqueta === etiqueta
      if (activa) {
        return {
          backgroundColor: color.bg,
          color: color.text,
          borderColor: color.bg
        }
      }
      return {
        backgroundColor: color.bgInactive,
        color: color.textInactive,
        borderColor: 'transparent'
      }
    }
  }
}
</script>

<style scoped>
.etiquetas-medida {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.btn-etiqueta {
  height: 24px;
  min-width: 24px;
  max-width: 140px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: bold;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.3s ease;
}

.btn-etiqueta:hover {
  filter: brightness(0.95);
}

.btn-etiqueta.active {
  filter: none;
}

.btn-etiqueta-add {
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  font-weight: bold;
  color: #2980b9;
  background-color: #eaf2fb;
  border: 2px dashed #2980b9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-etiqueta-add:hover {
  background-color: #d6e7f7;
}
</style>
