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
        <label :for="idCampo('fotos')">Fotos</label>
        <input
          :id="idCampo('fotos')"
          class="control"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          :disabled="guardando || procesandoFotos || totalFotos >= 6"
          @change="agregarFotos"
        />
        <p class="ayuda">Hasta 6 fotos JPG, PNG o WebP. Se reducen al elegirlas.</p>
        <div v-if="campos.fotos.length || fotosNuevas.length" class="miniaturas">
          <figure v-for="(foto, indice) in campos.fotos" :key="foto.path" class="mini">
            <img :src="foto.url" alt="Foto del equipo" />
            <button
              type="button"
              :disabled="guardando || procesandoFotos"
              :aria-label="'Quitar foto ' + (indice + 1)"
              @click="quitarExistente(indice)"
            >
              Quitar
            </button>
          </figure>
          <figure v-for="(foto, indice) in fotosNuevas" :key="foto.id" class="mini">
            <img :src="foto.preview" alt="Foto nueva del equipo" />
            <button
              type="button"
              :disabled="guardando || procesandoFotos"
              :aria-label="'Quitar foto nueva ' + (indice + 1)"
              @click="quitarNueva(indice)"
            >
              Quitar
            </button>
          </figure>
        </div>
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
      <button type="submit" class="btn-primario" :disabled="guardando || procesandoFotos">
        {{ guardando ? 'Guardando…' : procesandoFotos ? 'Preparando fotos…' : 'Guardar equipo' }}
      </button>
    </div>
  </form>
</template>

<script>
import { MAX_FOTOS_EQUIPO, TIPOS_EQUIPO, equipoVacio, validarEquipo } from '@/utils/equiposCuarto';
import { prepararFoto, tipoDeArchivo } from '@/utils/fotosBitacora';

export default {
  name: 'FormularioEquipo',
  props: {
    equipo: { type: Object, default: () => equipoVacio() },
    titulo: { type: String, default: 'Nuevo equipo' },
    guardando: { type: Boolean, default: false },
  },
  data() {
    const base = equipoVacio();
    const fotos = Array.isArray(this.equipo.fotos)
      ? this.equipo.fotos.filter((foto) => foto && foto.url && foto.path).map((foto) => ({
        url: foto.url,
        path: foto.path,
      }))
      : [];
    return {
      tipos: TIPOS_EQUIPO,
      error: '',
      procesandoFotos: false,
      fotosNuevas: [],
      campos: { ...base, ...this.equipo, fotos },
    };
  },
  computed: {
    totalFotos() {
      return this.campos.fotos.length + this.fotosNuevas.length;
    },
  },
  beforeDestroy() {
    this.fotosNuevas.forEach((foto) => {
      if (foto.preview) URL.revokeObjectURL(foto.preview);
    });
  },
  methods: {
    idCampo(nombre) {
      return `equipo-${this.campos.id || 'nuevo'}-${nombre}`;
    },
    async agregarFotos(event) {
      const archivos = Array.from(event.target.files || []);
      event.target.value = '';
      if (!archivos.length || this.guardando) return;
      this.error = '';
      this.procesandoFotos = true;
      try {
        for (const archivo of archivos) {
          if (this.totalFotos >= MAX_FOTOS_EQUIPO) {
            this.error = 'Puedes adjuntar hasta 6 fotos por equipo.';
            break;
          }
          if (!tipoDeArchivo(archivo) || !archivo.size || archivo.size > 10 * 1024 * 1024) {
            this.error = 'Selecciona fotos JPG, PNG o WebP de máximo 10 MB.';
            continue;
          }
          const preparada = await prepararFoto(archivo);
          this.fotosNuevas.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file: preparada.blob,
            contentType: preparada.contentType,
            preparada: true,
            preview: URL.createObjectURL(preparada.blob),
          });
        }
      } catch (errorLectura) {
        console.warn('No se pudo preparar una foto del equipo:', errorLectura);
        this.error = 'No pudimos leer una foto. Vuelve a elegirla.';
      } finally {
        this.procesandoFotos = false;
      }
    },
    quitarExistente(indice) {
      if (this.guardando) return;
      this.campos.fotos.splice(indice, 1);
    },
    quitarNueva(indice) {
      if (this.guardando) return;
      const foto = this.fotosNuevas[indice];
      if (foto && foto.preview) URL.revokeObjectURL(foto.preview);
      this.fotosNuevas.splice(indice, 1);
    },
    enviar() {
      this.error = validarEquipo(this.campos);
      if (this.error) return;
      if (this.totalFotos > MAX_FOTOS_EQUIPO) {
        this.error = 'Puedes adjuntar hasta 6 fotos por equipo.';
        return;
      }
      this.$emit('guardar', {
        ...this.campos,
        fotos: this.campos.fotos.map((foto) => ({ url: foto.url, path: foto.path })),
        fotosNuevas: this.fotosNuevas.map((foto) => ({
          file: foto.file,
          contentType: foto.contentType,
          preparada: true,
        })),
      });
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
.miniaturas {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}
.mini {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mini img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 10px;
  background: #eef5f1;
}
.mini button {
  min-height: 40px;
  border: 1px solid #f0d0d0;
  border-radius: 8px;
  background: #fff;
  color: #ac4747;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.mini button:disabled {
  opacity: 0.55;
  cursor: wait;
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
