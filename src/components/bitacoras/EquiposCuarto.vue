<template>
  <section class="equipos" aria-labelledby="equipos-titulo">
    <div class="equipos-encabezado">
      <div>
        <h4 id="equipos-titulo">Equipos</h4>
        <p>Compresores, condensadores, evaporadores, tableros u otro equipo de este cuarto.</p>
      </div>
      <button
        v-if="listo && modo !== 'alta'"
        type="button"
        class="btn-agregar"
        :disabled="guardando"
        @click="iniciarAlta"
      >
        <i class="fas fa-plus" aria-hidden="true"></i> Agregar equipo
      </button>
    </div>

    <p v-if="aviso && !modo && !confirmarId" class="aviso-ok" role="status">{{ aviso }}</p>
    <p v-if="errorGuardado" class="aviso-error" role="alert">{{ errorGuardado }}</p>

    <div v-if="error" class="estado-bloque" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="btn-agregar" @click="$emit('reintentar')">Reintentar</button>
    </div>
    <p v-else-if="cargando" class="estado-bloque" role="status">Cargando equipos…</p>
    <template v-else-if="listo">
      <FormularioEquipo
        v-if="modo === 'alta'"
        :key="borrador.id"
        :equipo="borrador"
        titulo="Nuevo equipo"
        :guardando="guardando"
        @guardar="guardarAlta"
        @cancelar="cancelar"
      />
      <p v-else-if="!equipos.length" class="estado-bloque">
        Todavía no hay equipos en este cuarto. Agrega el primero cuando quieras.
      </p>

      <ul v-if="equipos.length" class="lista-equipos">
        <li
          v-for="(equipo, indice) in equipos"
          :key="equipo.id"
          class="item-equipo"
          :style="{ '--i': indice > 8 ? 8 : indice }"
        >
          <FormularioEquipo
            v-if="modo === 'edicion' && editandoId === equipo.id"
            :equipo="equipo"
            titulo="Editar equipo"
            :guardando="guardando"
            @guardar="guardarEdicion"
            @cancelar="cancelar"
          />
          <article v-else class="equipo-card">
            <header class="equipo-cabecera">
              <h5>{{ equipo.nombre || 'Sin nombre' }}</h5>
              <span v-if="etiqueta(equipo.tipo)" class="chip">{{ etiqueta(equipo.tipo) }}</span>
            </header>
            <dl v-if="detalles(equipo).length" class="detalles">
              <div v-for="detalle in detalles(equipo)" :key="detalle.etiqueta">
                <dt>{{ detalle.etiqueta }}</dt>
                <dd>{{ detalle.valor }}</dd>
              </div>
            </dl>
            <p v-if="equipo.notas" class="notas">{{ equipo.notas }}</p>
            <div class="acciones">
              <template v-if="confirmarId === equipo.id">
                <p class="confirmar-texto">¿Eliminar este equipo del cuarto?</p>
                <button type="button" class="btn-peligro" :disabled="guardando" @click="eliminar(equipo)">
                  {{ guardando ? 'Eliminando…' : 'Eliminar' }}
                </button>
                <button type="button" class="btn-texto" :disabled="guardando" @click="confirmarId = ''">
                  Cancelar
                </button>
              </template>
              <template v-else>
                <button type="button" class="btn-texto" :disabled="guardando" @click="iniciarEdicion(equipo)">
                  Editar
                </button>
                <button
                  type="button"
                  class="btn-texto peligro"
                  :disabled="guardando"
                  :aria-label="'Eliminar equipo ' + (equipo.nombre || 'sin nombre')"
                  @click="pedirEliminar(equipo)"
                >
                  Eliminar
                </button>
              </template>
            </div>
          </article>
        </li>
      </ul>
    </template>
  </section>
</template>

<script>
import FormularioEquipo from '@/components/bitacoras/FormularioEquipo.vue';
import {
  equipoVacio,
  etiquetaTipo,
  nuevoIdEquipo,
  serializarEquipo,
} from '@/utils/equiposCuarto';

export default {
  name: 'EquiposCuarto',
  components: { FormularioEquipo },
  props: {
    equipos: { type: Array, default: () => [] },
    listo: { type: Boolean, default: false },
    cargando: { type: Boolean, default: false },
    error: { type: String, default: '' },
    guardando: { type: Boolean, default: false },
    errorGuardado: { type: String, default: '' },
    aviso: { type: String, default: '' },
  },
  data() {
    return {
      modo: '',
      editandoId: '',
      confirmarId: '',
      borrador: equipoVacio(),
    };
  },
  watch: {
    guardando(actual, anterior) {
      if (anterior && !actual && !this.errorGuardado) {
        this.cancelar();
      }
    },
  },
  methods: {
    etiqueta: etiquetaTipo,
    detalles(equipo) {
      return [
        equipo.marcaModelo ? { etiqueta: 'Marca y modelo', valor: equipo.marcaModelo } : null,
        equipo.refrigerante ? { etiqueta: 'Refrigerante', valor: equipo.refrigerante } : null,
        equipo.voltaje ? { etiqueta: 'Voltaje', valor: equipo.voltaje } : null,
      ].filter(Boolean);
    },
    iniciarAlta() {
      this.modo = 'alta';
      this.editandoId = '';
      this.confirmarId = '';
      this.borrador = { ...equipoVacio(), id: nuevoIdEquipo() };
    },
    iniciarEdicion(equipo) {
      this.modo = 'edicion';
      this.editandoId = equipo.id;
      this.confirmarId = '';
    },
    pedirEliminar(equipo) {
      this.modo = '';
      this.editandoId = '';
      this.confirmarId = equipo.id;
    },
    cancelar() {
      this.modo = '';
      this.editandoId = '';
      this.confirmarId = '';
      this.borrador = equipoVacio();
    },
    guardarAlta(campos) {
      this.$emit('guardar', this.equipos.concat([serializarEquipo(campos)]));
    },
    guardarEdicion(campos) {
      const limpio = serializarEquipo(campos);
      this.$emit(
        'guardar',
        this.equipos.map((equipo) => (equipo.id === limpio.id ? limpio : serializarEquipo(equipo)))
      );
    },
    eliminar(equipo) {
      this.$emit(
        'guardar',
        this.equipos
          .filter((item) => item.id !== equipo.id)
          .map((item) => serializarEquipo(item))
      );
    },
  },
};
</script>

<style scoped>
.equipos {
  --ink: #173b36;
  --muted: #61766e;
  --line: #dce6df;
  --accent: #17664e;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
.equipos-encabezado {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}
.equipos-encabezado h4 {
  margin: 0 0 4px;
  font-size: 16px;
  color: var(--ink);
}
.equipos-encabezado p,
.estado-bloque,
.notas,
.confirmar-texto {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.btn-agregar,
.btn-texto,
.btn-peligro {
  min-height: 44px;
  border-radius: 10px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.btn-agregar,
.btn-peligro {
  border: 0;
  padding: 10px 14px;
}
.btn-agregar {
  background: var(--accent);
  color: #fff;
}
.btn-peligro {
  background: #af3838;
  color: #fff;
}
.btn-texto {
  border: 1px solid var(--line);
  background: #fff;
  color: var(--accent);
  padding: 8px 12px;
}
.btn-texto.peligro {
  color: #ac4747;
  border-color: #f0d0d0;
}
.btn-agregar:disabled,
.btn-texto:disabled,
.btn-peligro:disabled {
  opacity: 0.55;
  cursor: wait;
}
.btn-agregar:focus-visible,
.btn-texto:focus-visible,
.btn-peligro:focus-visible {
  outline: 3px solid #378c73;
  outline-offset: 2px;
}
.aviso-ok,
.aviso-error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
}
.aviso-ok {
  background: #e8f5ed;
  color: #245c3c;
}
.aviso-error {
  background: #fff0ed;
  color: #973b30;
}
.estado-bloque {
  padding: 14px;
  border: 1px dashed #c9dbd1;
  border-radius: 12px;
  background: #fbfefc;
}
.lista-equipos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item-equipo {
  animation: aparecer-equipo 0.4s ease backwards;
  animation-delay: calc(var(--i, 0) * 45ms);
}
.equipo-card {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}
.equipo-cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.equipo-cabecera h5 {
  margin: 0;
  font-size: 16px;
  color: var(--ink);
}
.chip {
  padding: 4px 8px;
  border-radius: 999px;
  background: #e7f3ec;
  color: #17664e;
  font-size: 11px;
  font-weight: 700;
}
.detalles {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin: 0 0 8px;
}
.detalles dt {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--muted);
}
.detalles dd {
  margin: 2px 0 0;
  font-size: 14px;
  color: var(--ink);
  overflow-wrap: anywhere;
}
.notas {
  white-space: pre-line;
  color: var(--ink);
}
.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
@keyframes aparecer-equipo {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
@media (min-width: 720px) {
  .equipos-encabezado {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .btn-agregar {
    flex-shrink: 0;
  }
  .detalles {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (prefers-reduced-motion: reduce) {
  .item-equipo {
    animation: none;
  }
}
</style>
