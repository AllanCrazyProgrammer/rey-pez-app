<template><InventarioPanel tipo="crudos" :items="items" :cargando="isLoadingExistencias" :error="errorExistencias" @refresh="loadExistencias" /></template>
<script>
import ExistenciasCrudos from '@/views/ExistenciasCrudos.vue';
import InventarioPanel from './InventarioPanel.vue';
export default {
  extends: ExistenciasCrudos,
  components: { InventarioPanel },
  computed: {
    items() { return Object.entries(this.existenciasPorProveedor).flatMap(([proveedor, productos]) => productos.map(p => ({ id: `${proveedor}|${p.clave}`, proveedor, medida: p.nombre, kilos: Number(p.kilos), cuarto: p.cuarto || 's/c', precio: p.ultimoPrecio }))).sort((a, b) => a.medida.localeCompare(b.medida, 'es', { numeric: true }) || a.proveedor.localeCompare(b.proveedor, 'es')); }
  }
};
</script>
