<template>
  <main class="pesadas-page">
    <header class="pesadas-heading">
      <div>
        <router-link class="pesadas-back" to="/pesadas"><span class="pesadas-back-icon">←</span> Pesadas</router-link>
        <h1>Despicadoras</h1>
        <p>Da de alta a las despicadoras con su nombre y su apodo. El modo rápido las busca de las dos maneras.</p>
      </div>
    </header>
    <section class="pesadas-card">
      <form class="pesadas-toolbar" @submit.prevent="guardar">
        <label>Nombre <input v-model="nombre" type="text" autocomplete="off" placeholder="Nombre completo" required></label>
        <label>Apodo <input v-model="apodo" type="text" autocomplete="off" placeholder="Apodo (opcional)"></label>
        <button class="pesadas-button primary" type="submit" :disabled="guardando">{{ editandoId ? 'Guardar cambios' : '+ Dar de alta' }}</button>
        <button v-if="editandoId" class="pesadas-button" type="button" @click="limpiarFormulario">Cancelar</button>
      </form>
      <p v-if="error" class="pesadas-alert" role="alert">{{ error }}</p>
      <p v-if="mensaje" class="pesadas-rapida-exito" role="status">{{ mensaje }}</p>
    </section>
    <section class="pesadas-card">
      <div class="pesadas-list-heading"><h2>Registradas ({{ activas.length }})</h2><span>{{ inactivas.length }} dadas de baja</span></div>
      <form class="pesadas-toolbar" @submit.prevent>
        <label>Buscar <input v-model="busqueda" type="search" autocomplete="off" placeholder="Nombre o apodo…"></label>
      </form>
      <p v-if="cargando" class="pesadas-empty">Cargando despicadoras…</p>
      <p v-else-if="!filtradas.length" class="pesadas-empty">No hay despicadoras con ese nombre o apodo.</p>
      <ul v-else class="pesadas-search-results">
        <li v-for="item in filtradas" :key="item.id">
          <button class="pesadas-button" type="button" @click="editar(item)">
            <span><strong>{{ item.nombre }}</strong><small v-if="item.apodo"> · {{ item.apodo }}</small><small v-if="item.activo === false"> · dada de baja</small></span>
            <small>{{ item.activo === false ? 'Reactivar' : 'Editar' }}</small>
          </button>
        </li>
      </ul>
      <div v-if="editandoId" class="pesadas-toolbar">
        <button class="pesadas-button pesadas-delete-day" type="button" @click="darDeBaja">Dar de baja</button>
        <button class="pesadas-button pesadas-delete-day" type="button" @click="eliminarDefinitiva">Eliminar definitivamente</button>
        <button v-if="editando && editando.activo === false" class="pesadas-button" type="button" @click="reactivar">Reactivar</button>
      </div>
    </section>
  </main>
</template>

<script>
import { desactivarDespicadora, eliminarDespicadora, guardarDespicadora, observarDespicadoras, reactivarDespicadora } from '@/services/despicadoras.service';
import { normalizarTextoPesada } from '@/utils/pesadasRapida';
import './pesadas.css';

export default {
  name: 'DespicadorasMenu',
  data: () => ({ registros: [], cargando: true, nombre: '', apodo: '', editandoId: '', editando: null,
    busqueda: '', guardando: false, error: '', mensaje: '' }),
  computed: {
    activas() { return this.registros.filter(item => item.activo !== false); },
    inactivas() { return this.registros.filter(item => item.activo === false); },
    filtradas() {
      const texto = normalizarTextoPesada(this.busqueda);
      return this.registros.filter(item => !texto
        || normalizarTextoPesada(item.nombre).includes(texto)
        || normalizarTextoPesada(item.apodo).includes(texto));
    }
  },
  mounted() {
    this._unsubscribe = observarDespicadoras(dias => { this.registros = dias; this.cargando = false; },
      () => { this.error = 'No se pudo cargar el catálogo. Revisa la conexión e inténtalo de nuevo.'; this.cargando = false; });
  },
  beforeDestroy() { if (this._unsubscribe) this._unsubscribe(); },
  methods: {
    limpiarFormulario() {
      this.nombre = '';
      this.apodo = '';
      this.editandoId = '';
      this.editando = null;
    },
    editar(item) {
      this.editandoId = item.id;
      this.editando = item;
      this.nombre = item.nombre;
      this.apodo = item.apodo || '';
      this.mensaje = '';
      this.error = '';
    },
    async guardar() {
      if (this.guardando || !this.nombre.trim()) return;
      this.guardando = true;
      this.error = '';
      this.mensaje = '';
      try {
        await guardarDespicadora({ id: this.editandoId || undefined, nombre: this.nombre, apodo: this.apodo });
        this.mensaje = this.editandoId ? `${this.nombre.trim()} quedó actualizada.` : `${this.nombre.trim()} quedó dada de alta.`;
        this.limpiarFormulario();
      } catch (_error) { this.error = 'No se pudo guardar. Revisa la conexión e inténtalo de nuevo.'; }
      finally { this.guardando = false; }
    },
    async darDeBaja() {
      if (!this.editandoId || !window.confirm(`¿Dar de baja a ${this.nombre.trim()}? Ya no aparecerá en el modo rápido, pero sus pesadas registradas no se borran.`)) return;
      this.error = '';
      try {
        await desactivarDespicadora(this.editandoId);
        this.mensaje = `${this.nombre.trim()} quedó dada de baja.`;
        this.limpiarFormulario();
      } catch (_error) { this.error = 'No se pudo dar de baja. Revisa la conexión e inténtalo de nuevo.'; }
    },
    async reactivar() {
      if (!this.editandoId) return;
      this.error = '';
      try {
        await reactivarDespicadora(this.editandoId);
        this.mensaje = `${this.nombre.trim()} quedó reactivada.`;
        this.limpiarFormulario();
      } catch (_error) { this.error = 'No se pudo reactivar. Revisa la conexión e inténtalo de nuevo.'; }
    },
    async eliminarDefinitiva() {
      if (!this.editandoId) return;
      if (!window.confirm(`¿Eliminar definitivamente a ${this.nombre.trim()} del catálogo? Ya no aparecerá en las sugerencias. Sus pesadas de días anteriores NO se borran, quedan en cada hoja.`)) return;
      this.error = '';
      try {
        await eliminarDespicadora(this.editandoId);
        this.mensaje = `${this.nombre.trim()} quedó eliminada del catálogo. Sus pesadas anteriores se conservan.`;
        this.limpiarFormulario();
      } catch (_error) { this.error = 'No se pudo eliminar. Revisa la conexión e inténtalo de nuevo.'; }
    }
  }
};
</script>
