<template>
  <form class="formulario-equipo" @submit.prevent="enviar">
    <p class="titulo">{{ titulo }}</p>
    <p class="ayuda">Solo el nombre es obligatorio. El resto de los datos puede quedar vacío.</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="campos">
      <div class="campo campo-ancho">
        <label :for="idCampo('nombre')">Nombre</label>
        <input
          :id="idCampo('nombre')"
          v-model.trim="campos.nombre"
          class="control"
          type="text"
          maxlength="120"
          autocomplete="off"
          :disabled="guardando"
          placeholder="Ej. Compresor principal"
        />
      </div>
      <div class="campo">
        <label :for="idCampo('tipo')">Tipo</label>
        <select :id="idCampo('tipo')" v-model="campos.tipo" class="control" :disabled="guardando">
          <option value="">Sin especificar</option>
          <option v-for="tipo in tipos" :key="tipo.valor" :value="tipo.valor">{{ tipo.etiqueta }}</option>
        </select>
      </div>
      <div class="campo">
        <label :for="idCampo('marca')">Marca y modelo</label>
        <input
          :id="idCampo('marca')"
          v-model.trim="campos.marcaModelo"
          class="control"
          type="text"
          maxlength="120"
          autocomplete="off"
          :disabled="guardando"
          placeholder="Opcional"
        />
      </div>
      <div class="campo">
        <label :for="idCampo('refrigerante')">Refrigerante</label>
        <input
          :id="idCampo('refrigerante')"
          v-model.trim="campos.refrigerante"
          class="control"
          type="text"
          maxlength="80"
          autocomplete="off"
          :disabled="guardando"
          placeholder="Opcional"
        />
      </div>
      <div class="campo">
        <label :for="idCampo('voltaje')">Voltaje</label>
        <input
          :id="idCampo('voltaje')"
          v-model.trim="campos.voltaje"
          class="control"
          type="text"
          maxlength="80"
          autocomplete="off"
          :disabled="guardando"
          placeholder="Opcional"
        />
      </div>
      <div class="campo campo-ancho">
        <label :for="idCampo('notas')">Notas</label>
        <textarea
          :id="idCampo('notas')"
          v-model.trim="campos.notas"
          class="control"
          rows="3"
          maxlength="500"
          :disabled="guardando"
          placeholder="Opcional"
        ></textarea>
      </div>
    </div>
    <div class="acciones-form">
      <button type="button" class="btn-secundario" :disabled="guardando" @click="$emit('cancelar')">
        Cancelar
      </button>
      <button type="submit" class="btn-primario" :disabled="guardando">
        {{ guardando ? 'Guardando…' : 'Guardar equipo' }}
      </button>
    </div>
  </form>
</template>

<script>
import { TIPOS_EQUIPO, equipoVacio, validarEquipo } from '@/utils/equiposCuarto';

export default {
  name: 'FormularioEquipo',
  props: {
    equipo: { type: Object, default: () => equipoVacio() },
    titulo: { type: String, default: 'Nuevo equipo' },
    guardando: { type: Boolean, default: false },
  },
  data() {
    const base = equipoVacio();
    return {
      tipos: TIPOS_EQUIPO,
      error: '',
      campos: { ...base, ...this.equipo },
    };
  },
  methods: {
    idCampo(nombre) {
      return `equipo-${this.campos.id || 'nuevo'}-${nombre}`;
    },
    enviar() {
      this.error = validarEquipo(this.campos);
      if (this.error) return;
      this.$emit('guardar', { ...this.campos });
    },
  },
};
</script>

<style scoped>
.formulario-equipo {
  --ink: #173b36;
  --muted: #61766e;
  --line: #dce6df;
  --accent: #17664e;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid #cfe0d6;
  border-radius: 14px;
  background: #f8fbf9;
}
.titulo {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}
.ayuda,
.error {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
}
.ayuda {
  color: var(--muted);
}
.error {
  color: #973b30;
}
.campos {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.campo {
  min-width: 0;
}
.campo label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #425e53;
}
.control {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #cddcd2;
  border-radius: 10px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 16px;
}
textarea.control {
  min-height: 88px;
  resize: vertical;
}
.control:focus-visible {
  outline: 3px solid #378c73;
  outline-offset: 2px;
}
.acciones-form {
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
}
.btn-primario,
.btn-secundario {
  min-height: 44px;
  border-radius: 10px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.btn-primario {
  border: 0;
  background: var(--accent);
  color: #fff;
}
.btn-secundario {
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
}
.btn-primario:disabled,
.btn-secundario:disabled {
  opacity: 0.55;
  cursor: wait;
}
@media (min-width: 720px) {
  .campos {
    grid-template-columns: 1fr 1fr;
  }
  .campo-ancho {
    grid-column: 1 / -1;
  }
  .acciones-form {
    flex-direction: row;
    justify-content: flex-end;
  }
  .btn-primario,
  .btn-secundario {
    min-width: 140px;
  }
}
</style>
