<template>
  <span class="estado-tag" :class="clase">{{ estado || 'Sin estado' }}</span>
</template>

<script>
export default {
  name: 'EstadoMantenimiento',
  props: {
    estado: { type: String, default: '' },
  },
  computed: {
    clase() {
      const normalizado = String(this.estado || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '-');
      return normalizado ? `estado-${normalizado}` : '';
    },
  },
};
</script>

<style scoped>
.estado-tag {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  background: #eef2ef;
  color: #52675d;
}
.estado-optimo {
  background: #e5f4eb;
  color: #226342;
}
.estado-regular {
  background: #fff4d8;
  color: #825c0b;
}
.estado-requiere-atencion {
  background: #fff0e1;
  color: #97511b;
}
.estado-critico {
  background: #fce8e8;
  color: #a33232;
}
</style>
