<template>
  <section class="inventarios-inicio">
    <div class="rp-page-heading"><p class="rp-eyebrow">REYPEZ · TU OPERACIÓN DIARIA</p><h1>Todo tu inventario.<br>A la mano.</h1><p>Consulta existencias o registra un movimiento.</p></div>
    <div class="inventarios-accesos">
      <router-link v-for="acceso in accesos" :key="acceso.to" :to="acceso.to" class="inventarios-acceso" :class="acceso.color">
        <span class="rp-home-icon"><MobileIcon :name="acceso.icono" /></span><strong>{{ acceso.titulo }}</strong><span>{{ acceso.detalle }}</span><MobileIcon name="arrow" class="rp-home-arrow" />
      </router-link>
    </div>
    <div class="rp-home-note"><MobileIcon name="check" /><span>Los movimientos se reflejan en tu inventario de ReyPez.</span></div>
  </section>
</template>
<script>
import MobileIcon from './MobileIcon.vue';
export default { components: { MobileIcon }, data: () => ({ accesos: [
  { to: '/existencias', icono: 'box', titulo: 'Inventario de limpios', detalle: 'Kilos y cajas', color: 'rp-home-clean' },
  { to: '/sacadas', icono: 'moves', titulo: 'Movimientos de limpios', detalle: 'Entradas y salidas', color: 'rp-home-clean' },
  { to: '/existencias-crudos', icono: 'box', titulo: 'Inventario de crudos', detalle: 'Solo kilos', color: 'rp-home-raw' },
  { to: '/movimientos-crudos', icono: 'moves', titulo: 'Movimientos de crudos', detalle: 'Entradas y salidas', color: 'rp-home-raw' }
] }) };
</script>
