<!-- Barra de progreso del embarque: kilos ya pesados en el embarque
     frente a kilos pedidos ese día (limpios + crudos), de 0 a 100 %.
     El relleno es de dos tonos: cian = limpio, violeta = crudo, para ver
     de un vistazo qué parte del avance es cada uno. -->
<template>
  <section
    class="progreso-embarque"
    :class="{ 'progreso-embarque--completo': progreso.completo, 'progreso-embarque--sin-pedido': !progreso.tienePedido }"
    aria-label="Avance del embarque"
  >
    <div class="progreso-embarque__contenido">
      <div class="progreso-embarque__encabezado">
        <div class="progreso-embarque__titulo">
          <span class="progreso-embarque__icono" aria-hidden="true">
            <i class="fas" :class="progreso.completo ? 'fa-check-circle' : 'fa-balance-scale'"></i>
          </span>
          <div>
            <h2 class="progreso-embarque__nombre">Avance del embarque</h2>
            <p class="progreso-embarque__detalle">
              <span class="progreso-embarque__punto punto--limpio" aria-hidden="true"></span>
              Limpio {{ formatear(progreso.pesadoLimpio) }} / {{ formatear(progreso.pedidoLimpio) }} kg
              <span class="progreso-embarque__sep" aria-hidden="true">·</span>
              <span class="progreso-embarque__punto punto--crudo" aria-hidden="true"></span>
              Crudo {{ formatear(progreso.pesadoCrudo) }} / {{ formatear(progreso.pedidoCrudo) }} kg
            </p>
          </div>
        </div>
        <div class="progreso-embarque__porcentaje" aria-hidden="true">
          <span class="progreso-embarque__numero">{{ progreso.porcentaje }}</span><span class="progreso-embarque__simbolo">%</span>
        </div>
      </div>

      <div
        class="progreso-embarque__pista"
        role="progressbar"
        :aria-valuenow="progreso.porcentaje"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Avance del embarque: ${progreso.porcentaje} por ciento`"
      >
        <div class="progreso-embarque__relleno progreso-embarque__relleno--limpio" :style="{ width: anchoLimpio + '%' }"></div>
        <div class="progreso-embarque__relleno progreso-embarque__relleno--crudo" :style="{ width: anchoCrudo + '%' }"></div>
        <div class="progreso-embarque__brillo" aria-hidden="true"></div>
        <div
          v-if="progreso.tienePedido && !progreso.completo && progreso.porcentaje > 0"
          class="progreso-embarque__punta"
          :style="{ left: progreso.porcentaje + '%' }"
          aria-hidden="true"
        ></div>
      </div>

      <p class="progreso-embarque__estado" role="status">
        <template v-if="cargando">Cargando el pedido del día…</template>
        <template v-else-if="!progreso.tienePedido">Sin pedido del día: la barra se activa en cuanto carguen los pedidos.</template>
        <template v-else-if="progreso.completo">¡Embarque completo! Todo lo pedido ya está pesado.</template>
        <template v-else>
          Pesado {{ formatear(progreso.pesadoTotal) }} de {{ formatear(progreso.pedidoTotal) }} kg — faltan {{ formatear(progreso.faltante) }} kg
        </template>
      </p>
    </div>
  </section>
</template>

<script>
import { calcularProgresoEmbarque } from '@/utils/progresoEmbarque';
import { formatearKilos } from '@/utils/embarqueTotales';

export default {
  name: 'ProgresoEmbarque',
  props: {
    // Totales ya pesados en el embarque, con la forma de resumenEmbarque:
    // { limpio: { taras, kilos }, crudo: { taras, kilos } }.
    pesado: { type: Object, default: () => ({ limpio: { taras: 0, kilos: 0 }, crudo: { taras: 0, kilos: 0 } }) },
    // Índice de pedidos limpios del día (pedidoReferenciaPorCliente).
    pedidoLimpio: { type: Object, default: () => ({}) },
    // Índice de pedidos crudos del día (pedidoReferenciaCrudosPorCliente).
    pedidoCrudo: { type: Object, default: () => ({}) },
    cargando: { type: Boolean, default: false },
  },
  computed: {
    progreso() {
      return calcularProgresoEmbarque(this.pesado, this.pedidoLimpio, this.pedidoCrudo);
    },
    // Anchos del relleno de dos tonos, en % del pedido total. Si lo pesado
    // supera lo pedido, se reescala para que la barra nunca pase del 100 %.
    anchos() {
      const total = this.progreso.pedidoTotal;
      if (!(total > 0)) return { limpio: 0, crudo: 0 };
      const limpio = (this.progreso.pesadoLimpio / total) * 100;
      const crudo = (this.progreso.pesadoCrudo / total) * 100;
      const suma = limpio + crudo;
      if (suma <= 100) return { limpio, crudo };
      const factor = 100 / suma;
      return { limpio: limpio * factor, crudo: crudo * factor };
    },
    anchoLimpio() { return this.anchos.limpio; },
    anchoCrudo() { return this.anchos.crudo; },
  },
  methods: {
    formatear(kilos) { return formatearKilos(kilos); },
  },
};
</script>

<style scoped>
.progreso-embarque {
  /* Borde degradado: el marco es el propio fondo, 1.5px de borde visible. */
  margin: 0 0 14px;
  padding: 1.5px;
  border-radius: 18px;
  background: linear-gradient(100deg, #38d9ff, #8b5cf6 48%, #34d399 96%);
  background-size: 220% 220%;
  box-shadow: 0 18px 44px rgba(2, 8, 20, .45), 0 0 26px rgba(56, 217, 255, .12);
  animation: progreso-borde 9s ease-in-out infinite alternate;
}

.progreso-embarque--completo {
  background: linear-gradient(100deg, #34d399, #fbbf24 50%, #34d399);
  animation: progreso-borde 5s ease-in-out infinite alternate, progreso-completo-pulso 2.4s ease-in-out infinite;
}

.progreso-embarque--sin-pedido {
  background: linear-gradient(100deg, rgba(148, 163, 184, .55), rgba(100, 116, 139, .55));
  box-shadow: 0 12px 30px rgba(2, 8, 20, .3);
  animation: none;
}

.progreso-embarque__contenido {
  padding: 12px 16px 11px;
  border-radius: 16.5px;
  color: #e8eef9;
  background: linear-gradient(125deg, rgba(18, 30, 52, .97), rgba(8, 15, 29, .95));
}

.progreso-embarque__encabezado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
}

.progreso-embarque__titulo {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.progreso-embarque__icono {
  display: inline-grid;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #06101c;
  font-size: .95rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #b8f4ff, #38d9ff 55%, #8b5cf6);
  box-shadow: 0 0 26px rgba(56, 217, 255, .35);
}

.progreso-embarque--completo .progreso-embarque__icono {
  background: linear-gradient(135deg, #a7f3d0, #34d399 55%, #fbbf24);
  box-shadow: 0 0 26px rgba(52, 211, 153, .45);
}

.progreso-embarque__nombre {
  margin: 0;
  font-size: .95rem;
  font-weight: 800;
  letter-spacing: -.02em;
  line-height: 1.15;
}

.progreso-embarque__detalle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  margin: 3px 0 0;
  color: #aebdd4;
  font-size: .74rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.progreso-embarque__punto {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.punto--limpio { background: #38d9ff; box-shadow: 0 0 8px rgba(56, 217, 255, .8); }
.punto--crudo { background: #a78bfa; box-shadow: 0 0 8px rgba(139, 92, 246, .8); }
.progreso-embarque__sep { color: #5b6b84; }

.progreso-embarque__porcentaje {
  flex: 0 0 auto;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-shadow: 0 0 22px rgba(56, 217, 255, .45);
}

.progreso-embarque__numero {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -.04em;
  transition: none;
}

.progreso-embarque__simbolo {
  font-size: 1.05rem;
  font-weight: 700;
  color: #8fd8ff;
}

.progreso-embarque__pista {
  position: relative;
  display: flex;
  height: 20px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, .22);
  background: rgba(2, 8, 18, .65);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, .5);
}

.progreso-embarque__relleno {
  height: 100%;
  transition: width .7s cubic-bezier(.22, 1, .36, 1);
}

.progreso-embarque__relleno--limpio {
  background: linear-gradient(90deg, #0ea5c9, #38d9ff 70%, #7dd3fc);
  box-shadow: 0 0 14px rgba(56, 217, 255, .45);
}

.progreso-embarque__relleno--crudo {
  background: linear-gradient(90deg, #7c3aed, #a78bfa 70%, #c4b5fd);
  box-shadow: 0 0 14px rgba(139, 92, 246, .45);
}

.progreso-embarque--completo .progreso-embarque__relleno--limpio,
.progreso-embarque--completo .progreso-embarque__relleno--crudo {
  background: linear-gradient(90deg, #059669, #34d399 55%, #fbbf24);
  box-shadow: 0 0 16px rgba(52, 211, 153, .55);
}

/* Destello que recorre la barra: el "efecto" que la hace sentir viva. */
.progreso-embarque__brillo {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, .28) 50%, transparent 70%);
  background-size: 250% 100%;
  animation: progreso-brillo 2.8s linear infinite;
  mix-blend-mode: screen;
}

/* Rayas diagonales animadas sobre el relleno, para que el avance se note
   incluso en un vistazo rápido. */
.progreso-embarque__pista::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(-55deg, rgba(255, 255, 255, .13) 0 8px, transparent 8px 16px);
  background-size: 200% 100%;
  animation: progreso-rayas 1.4s linear infinite;
  opacity: .5;
}

.progreso-embarque__punta {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 4px;
  margin-left: -2px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 10px #fff, 0 0 18px rgba(56, 217, 255, .9);
  transition: left .7s cubic-bezier(.22, 1, .36, 1);
  animation: progreso-punta 1.6s ease-in-out infinite alternate;
}

.progreso-embarque__estado {
  margin: 8px 0 0;
  color: #b8c6db;
  font-size: .78rem;
  font-variant-numeric: tabular-nums;
}

.progreso-embarque--completo .progreso-embarque__estado {
  color: #a7f3d0;
  font-weight: 700;
}

@keyframes progreso-borde {
  to { background-position: 100% 50%; }
}

@keyframes progreso-brillo {
  from { background-position: 180% 0; }
  to { background-position: -80% 0; }
}

@keyframes progreso-rayas {
  to { background-position: -45px 0; }
}

@keyframes progreso-punta {
  from { transform: scaleY(.85); opacity: .75; }
  to { transform: scaleY(1.15); opacity: 1; }
}

@keyframes progreso-completo-pulso {
  0%, 100% { box-shadow: 0 18px 44px rgba(2, 8, 20, .45), 0 0 26px rgba(52, 211, 153, .25); }
  50% { box-shadow: 0 18px 44px rgba(2, 8, 20, .45), 0 0 44px rgba(52, 211, 153, .5); }
}

@media (max-width: 768px) {
  .progreso-embarque { margin-bottom: 10px; }
  .progreso-embarque__contenido { padding: 10px 12px 9px; }
  .progreso-embarque__numero { font-size: 1.7rem; }
  .progreso-embarque__detalle { font-size: .7rem; }
}

@media (prefers-reduced-motion: reduce) {
  .progreso-embarque,
  .progreso-embarque__brillo,
  .progreso-embarque__pista::after,
  .progreso-embarque__punta {
    animation: none;
  }
  .progreso-embarque__relleno,
  .progreso-embarque__punta {
    transition: none;
  }
}
</style>
