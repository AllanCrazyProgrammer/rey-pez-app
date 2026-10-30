<template>
  <section class="colaboracion-embarque" aria-label="Colaboración del embarque">
    <div class="colaboracion-estado" :class="{ 'colaboracion-atencion': pendientes || subiendo || !online || error }" role="status">
      <span class="colaboracion-punto" :class="{ pendiente: pendientes, offline: !online }" aria-hidden="true"></span>
      {{ estadoGuardado }}
      <span v-if="online && presencia !== 'conectado'" class="colaboracion-aviso">{{ estadoPresencia }}</span>
    </div>
    <div v-if="editores.length" class="colaboracion-personas" aria-label="Personas en este embarque">
      <div v-for="editor in editores" :key="editor.sesionId" class="colaborador" :style="{ '--persona-color': editor.color }">
        <span class="colaborador-avatar" aria-hidden="true">{{ editor.username.slice(0, 1).toUpperCase() }}</span>
        <span><strong>{{ editor.username }}{{ editor.userId === userId ? ' (otra ventana)' : '' }}</strong>
          <small>{{ editor.escribiendo ? 'Escribiendo · ' : '' }}{{ editor.descripcion }}</small>
        </span>
      </div>
    </div>
  </section>
</template>
<script>
export default {
  props: {
    editores: { type: Array, default: () => [] }, userId: { type: String, default: '' },
    pendientes: Boolean, subiendo: Boolean, online: Boolean,
    error: { type: String, default: '' }, presencia: { type: String, default: 'conectando' },
  },
  computed: {
    estadoGuardado() {
      if (!this.online) return this.pendientes ? 'Sin conexión · cambios pendientes en este equipo' : 'Sin conexión';
      if (this.error) return 'Cambios pendientes · reintentando sincronización';
      if (this.subiendo) return 'Sincronizando cambios…';
      return this.pendientes ? 'Cambios pendientes de sincronizar' : 'Sin cambios pendientes';
    },
    estadoPresencia() {
      return this.presencia === 'error' ? 'No se pudo cargar la presencia' : 'Conectando colaboradores…';
    },
  },
};
</script>
<style>
.colaboracion-embarque { margin: 4px 0 8px; padding: 2px 4px; color: #475569; }
.colaboracion-estado { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; line-height: 1.5; color: #64748b; }
.colaboracion-estado.colaboracion-atencion { color: #92400e; }
.colaboracion-punto { flex-shrink: 0; width: 5px; height: 5px; border-radius: 50%; background: #94a3b8; }
.colaboracion-punto.pendiente { background: #b45309; }
.colaboracion-punto.offline { background: #64748b; }
.colaboracion-aviso { color: #92400e; }
.colaboracion-personas { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px; }
.colaborador { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.colaborador-avatar { display: grid; place-items: center; flex-shrink: 0; width: 30px; height: 30px; background: var(--persona-color); color: white; border-radius: 50%; font-weight: bold; }
.colaborador small { display: block; color: #475569; }
.campo-con-colaboradores { outline: 2px solid var(--color-colaborador) !important; outline-offset: 2px; }
@media print { .colaboracion-embarque { display: none; } .campo-con-colaboradores { outline: none !important; } }
</style>
