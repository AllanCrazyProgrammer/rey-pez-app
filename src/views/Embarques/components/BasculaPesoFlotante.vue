<!-- BasculaPesoFlotante.vue
     Peso en vivo de la báscula Bluetooth, pegado al campo de kilos que se está editando, con un
     botón para registrarlo. Solo se ve si la báscula está conectada y hay un campo de kilos de
     alguna medida enfocado. Al registrar, el número queda escrito en el campo igual que si se
     hubiera tecleado: si después se quita el peso de la báscula, el campo no cambia. -->
<template>
  <div
    v-show="mostrar"
    ref="pastilla"
    class="bascula-flotante"
    :data-lado="lado"
    :style="{ left: posicion.left + 'px', top: posicion.top + 'px' }"
    role="status"
    @mousedown.prevent
  >
    <span class="bascula-flotante__valor" :class="{ 'bascula-flotante__valor--apagado': !vigente }">
      <i class="fas fa-weight-scale" aria-hidden="true"></i>
      <template v-if="vigente">{{ textoKilos }} kg</template>
      <template v-else-if="!bascula.paquetes">Sin datos de la báscula</template>
      <template v-else>Llega «{{ bascula.ultimoCrudo }}»</template>
    </span>
    <button
      type="button"
      class="bascula-flotante__registrar"
      :disabled="!puedeRegistrar"
      :title="puedeRegistrar ? 'Poner este peso en el campo de kilos' : 'Pon algo en la báscula para registrar'"
      @click="registrar"
    >
      <i class="fas fa-check" aria-hidden="true"></i>
      Registrar
    </button>
    <!-- APK: sin peso, se muestra qué escucha la conexión (servicios, características, lectura
         directa) para saber por qué no llega. Va debajo, sin mover la pastilla. -->
    <small v-if="!vigente && bascula.diagnostico" class="bascula-flotante__diagnostico">
      {{ bascula.diagnostico }}
    </small>
  </div>
</template>

<script>
import { useBasculaStore } from '@/stores/bascula';
import { campoVisible, devolverTeclado, esCampoKilos, posicionarFlotante, quitarTeclado } from '@/utils/basculaFlotante';

// Si la báscula deja de mandar datos más de esto, la lectura ya no se considera vigente.
const VIGENCIA_MS = 4000;

export default {
  name: 'BasculaPesoFlotante',
  data() {
    return {
      activo: false, // hay un campo de kilos enfocado
      fuera: false, // el campo salió de la ventana al desplazar
      posicion: { left: 0, top: 0 },
      lado: 'derecha',
      ahora: Date.now(),
    };
  },
  computed: {
    bascula() {
      return useBasculaStore();
    },
    mostrar() {
      return this.activo && !this.fuera && this.bascula.conectada;
    },
    vigente() {
      return this.bascula.kilos !== null && this.ahora - this.bascula.ultimaLecturaMs < VIGENCIA_MS;
    },
    puedeRegistrar() {
      return this.vigente && this.bascula.kilos > 0;
    },
    textoKilos() {
      return this.bascula.kilos === null ? '' : this.bascula.kilos.toFixed(2);
    },
  },
  watch: {
    // Al aparecer hay que medirlo ya visible para colocarlo bien.
    mostrar(visible) {
      if (visible) this.$nextTick(this.reposicionar);
    },
    // Si la báscula se conecta o desconecta con un campo enfocado, el teclado sigue esa regla.
    'bascula.conectada'(conectada) {
      if (!this.campo) return;
      if (conectada) quitarTeclado(this.campo);
      else devolverTeclado(this.campo);
    },
  },
  created() {
    this.campo = null;
    this.cuadro = 0;
    this.reloj = null;
  },
  mounted() {
    // Se cuelga del body: las tarjetas de medidas recortan lo que sobresale (overflow: hidden) y
    // un ancestro con transform cambiaría a qué se pega position: fixed.
    document.body.appendChild(this.$el);
    // Antes del foco: así el teléfono ya no abre el teclado al tocar el campo.
    document.addEventListener('pointerdown', this.alTocar, true);
    document.addEventListener('focusin', this.alEnfocar, true);
    document.addEventListener('focusout', this.alSalir, true);
    window.addEventListener('scroll', this.programarReposicion, true);
    window.addEventListener('resize', this.programarReposicion);
    this.reloj = setInterval(() => { this.ahora = Date.now(); }, 1000);
  },
  beforeDestroy() {
    document.removeEventListener('pointerdown', this.alTocar, true);
    document.removeEventListener('focusin', this.alEnfocar, true);
    document.removeEventListener('focusout', this.alSalir, true);
    window.removeEventListener('scroll', this.programarReposicion, true);
    window.removeEventListener('resize', this.programarReposicion);
    clearInterval(this.reloj);
    devolverTeclado(this.campo);
    if (this.cuadro) cancelAnimationFrame(this.cuadro);
    // Vue solo quita del DOM la raíz del padre; este elemento ya no está dentro de ella.
    if (this.$el.parentNode) this.$el.parentNode.removeChild(this.$el);
  },
  methods: {
    alTocar(evento) {
      const destino = evento.target;
      if (!this.bascula.conectada || !esCampoKilos(destino)) return;
      // Volver a tocar el campo que ya está seleccionado = escribir a mano: regresa el teclado
      // (el toque lo abre). El peso flotante sigue ahí por si se quiere registrar.
      if (destino === document.activeElement) devolverTeclado(destino);
      else quitarTeclado(destino);
    },
    alEnfocar(evento) {
      const destino = evento.target;
      if (esCampoKilos(destino)) {
        if (this.bascula.conectada) quitarTeclado(destino);
        this.campo = destino;
        this.activo = true;
        this.reposicionar();
      } else if (!this.$el.contains(destino)) {
        this.ocultar();
      }
    },
    alSalir(evento) {
      // Si el foco pasa a otro campo de kilos, su focusin lo vuelve a mostrar enseguida.
      if (evento.target === this.campo) this.ocultar();
    },
    ocultar() {
      devolverTeclado(this.campo);
      this.activo = false;
      this.campo = null;
    },
    programarReposicion() {
      if (this.cuadro || !this.campo) return;
      this.cuadro = requestAnimationFrame(() => {
        this.cuadro = 0;
        this.reposicionar();
      });
    },
    reposicionar() {
      if (!this.campo) return;
      if (!this.campo.isConnected) {
        this.ocultar(); // la fila se borró con el campo enfocado
        return;
      }
      const caja = this.campo.getBoundingClientRect();
      const ventana = { ancho: window.innerWidth, alto: window.innerHeight };
      this.fuera = !campoVisible(caja, ventana);
      const pastilla = this.$refs.pastilla;
      if (this.fuera || !pastilla) return;
      const pos = posicionarFlotante(caja, { ancho: pastilla.offsetWidth, alto: pastilla.offsetHeight }, ventana);
      this.posicion = { left: pos.left, top: pos.top };
      this.lado = pos.lado;
    },
    registrar() {
      const campo = this.campo;
      if (!campo || !this.puedeRegistrar || !esCampoKilos(campo)) return;
      const kilos = this.bascula.kilos;
      // Igual que si se tecleara: el v-model, la presencia de colaboradores y los sonidos
      // reaccionan al evento "input".
      campo.value = String(kilos);
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      // ProductoItem lo escucha para avisar al embarque, como al salir del campo.
      campo.dispatchEvent(new CustomEvent('bascula-registrado', { detail: { kilos } }));
      // Ya quedó puesto: se suelta el campo (y con él se esconde el peso flotante).
      campo.blur();
    },
  },
};
</script>

<style scoped>
.bascula-flotante__diagnostico {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: min(300px, calc(100vw - 24px));
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.35;
  white-space: normal;
  word-break: break-word;
  color: #e8eef9;
  border: 1px solid #4ade80;
  border-radius: 8px;
  background: rgba(8, 20, 38, .97);
  -webkit-user-select: text;
  user-select: text;
}

.bascula-flotante {
  position: fixed;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 11px;
  color: #e8eef9;
  white-space: nowrap;
  line-height: 1;
  border: 1px solid #4ade80;
  border-radius: 999px;
  background: rgba(8, 20, 38, .97);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .38), 0 0 0 3px rgba(74, 222, 128, .16);
  -webkit-user-select: none;
  user-select: none;
}

.bascula-flotante__valor {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #4ade80;
  font-size: 1rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.bascula-flotante__valor--apagado {
  color: #94a3b8;
  font-size: .8rem;
  font-weight: 600;
}

.bascula-flotante__registrar {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 6px 11px;
  color: #02170b;
  font-size: .78rem;
  font-weight: 800;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #4ade80, #22c55e);
  cursor: pointer;
}

.bascula-flotante__registrar:disabled {
  opacity: .45;
  cursor: not-allowed;
  filter: grayscale(.6);
}
</style>
