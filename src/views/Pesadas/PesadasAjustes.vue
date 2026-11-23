<template>
  <main class="pesadas-page">
    <router-link class="pesadas-back" to="/pesadas"><span class="pesadas-back-icon" aria-hidden="true">←</span> Pesadas</router-link>
    <header class="pesadas-heading">
      <div><p class="pesadas-eyebrow">PESADAS</p><h1>Ajustes</h1><p>Lo que el colaborador configura para pesar.</p></div>
    </header>

    <section v-if="vista === 'menu'" class="pesadas-card">
      <div class="pesadas-list-heading"><h2>Opciones</h2></div>
      <button class="pesadas-button pesadas-ajustes-opcion" type="button" @click="vista = 'medidas'">
        <span><strong>Medidas</strong><small>Las medidas que aparecen sugeridas por default en Pesar rápido.</small></span>
        <span aria-hidden="true">→</span>
      </button>
    </section>

    <section v-else class="pesadas-card">
      <div class="pesadas-list-heading"><h2>Medidas</h2><button class="pesadas-button" type="button" @click="vista = 'menu'">← Ajustes</button></div>
      <p class="pesadas-hint">Estas medidas aparecen sugeridas por default al escribir la medida en Pesar rápido. Escríbelas como se pesan, por ejemplo: 51/60, golfo, piojo.</p>
      <p v-if="error" class="pesadas-alert" role="alert">{{ error }}</p>
      <form class="pesadas-toolbar" @submit.prevent="agregarMedida">
        <label>Nueva medida <input v-model="nuevaMedida" type="text" autocomplete="off" placeholder="ej. 51/60" aria-label="Nueva medida"></label>
        <button class="pesadas-button primary" type="submit" :disabled="guardando">Agregar</button>
      </form>
      <p v-if="cargando" class="pesadas-empty">Cargando medidas…</p>
      <p v-else-if="!medidas.length" class="pesadas-empty">Todavía no hay medidas configuradas. Agrega la primera arriba.</p>
      <ul v-else class="pesadas-ajustes-lista">
        <li v-for="(medida, indice) in medidas" :key="medida">
          <strong>{{ medida }}</strong>
          <span class="pesadas-ajustes-acciones">
            <button class="pesadas-button" type="button" :disabled="indice === 0 || guardando" :aria-label="`Subir ${medida}`" @click="moverMedida(indice, -1)">↑</button>
            <button class="pesadas-button" type="button" :disabled="indice === medidas.length - 1 || guardando" :aria-label="`Bajar ${medida}`" @click="moverMedida(indice, 1)">↓</button>
            <button class="pesadas-button" type="button" :disabled="guardando" :aria-label="`Quitar ${medida}`" @click="eliminarMedida(indice)">×</button>
          </span>
        </li>
      </ul>
      <p v-if="guardado" class="pesadas-hint" role="status">Guardado.</p>
    </section>
  </main>
</template>

<script>
import { guardarMedidasPesadas, observarMedidasPesadas } from '@/services/medidasPesadas.service';
import { normalizarMedidasPorDefecto } from '@/utils/pesadasRapida';
import './pesadas.css';

export default {
  name: 'PesadasAjustes',
  data: () => ({ vista: 'menu', medidas: [], nuevaMedida: '', cargando: true, guardando: false, error: '', guardado: false }),
  mounted() {
    this._unsubscribe = observarMedidasPesadas(medidas => {
      this.medidas = normalizarMedidasPorDefecto(medidas);
      this.cargando = false;
      this.error = '';
    }, () => { this.error = 'No se pudieron cargar las medidas. Revisa la conexión e inténtalo de nuevo.'; this.cargando = false; });
  },
  beforeDestroy() {
    if (this._unsubscribe) this._unsubscribe();
  },
  methods: {
    async persistir(medidas) {
      this.guardando = true;
      this.error = '';
      this.guardado = false;
      try {
        await guardarMedidasPesadas(normalizarMedidasPorDefecto(medidas));
        this.guardado = true;
        setTimeout(() => { this.guardado = false; }, 2000);
      } catch (_error) {
        this.error = 'No se pudo guardar. Revisa la conexión e inténtalo de nuevo.';
      } finally {
        this.guardando = false;
      }
    },
    agregarMedida() {
      const texto = this.nuevaMedida.trim();
      if (!texto) return;
      if (normalizarMedidasPorDefecto([...this.medidas, texto]).length === this.medidas.length) {
        this.error = 'Esa medida ya está en la lista.';
        return;
      }
      this.nuevaMedida = '';
      this.persistir([...this.medidas, texto]);
    },
    eliminarMedida(indice) {
      this.persistir(this.medidas.filter((_, i) => i !== indice));
    },
    moverMedida(indice, direccion) {
      const destino = indice + direccion;
      if (destino < 0 || destino >= this.medidas.length) return;
      const copia = [...this.medidas];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      this.persistir(copia);
    }
  }
};
</script>
