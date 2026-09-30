<template><InventarioPanel tipo="limpios" :items="items" :catalogo-origenes="catalogoOrigenes" :cargando="(!inventarioListo && !errorInventario) || !origenesListos" :error="errorInventario" @refresh="actualizar" /></template>
<script>
import { computed, ref, onMounted } from 'vue';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import Existencias from '@/components/Existencias.vue';
import InventarioPanel from './InventarioPanel.vue';
export default {
  components: { InventarioPanel },
  setup() {
    // Reutilizar el cálculo de existencias y FIFO de la aplicación actual.
    const inventario = Existencias.setup();
    const catalogoOrigenes = ref([]);
    const origenesListos = ref(false);
    const cargarOrigenes = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'proveedores'));
        catalogoOrigenes.value = snapshot.docs.map(doc => doc.data());
      } catch (_) { /* Los tipos del registro y los nombres conocidos siguen disponibles. */ }
      finally { origenesListos.value = true; }
    };
    onMounted(cargarOrigenes);
    const items = computed(() => Object.entries(inventario.existencias.value).flatMap(([proveedor, medidas]) =>
      Object.entries(medidas).flatMap(([key, medida]) => (medida.lotes || []).filter(lote => lote.kilos > 0).map((lote, index) => ({
        id: `${proveedor}|${key}|${index}`, proveedor, tipo: medida.tipo, medida: medida.medida, kilos: Number(lote.kilos),
        cuarto: lote.cuartoFrio || 's/c', fecha: lote.fechaEntrada, precio: medida.precio
      })))
    ).sort((a, b) => a.medida.localeCompare(b.medida, 'es', { numeric: true }) || a.proveedor.localeCompare(b.proveedor, 'es')));
    const actualizar = () => Promise.all([inventario.loadExistencias(), cargarOrigenes()]);
    return { items, catalogoOrigenes, origenesListos, inventarioListo: inventario.inventarioListo, errorInventario: inventario.errorInventario, actualizar };
  }
};
</script>
