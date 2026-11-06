<template>
  <div class="tema-embarque">
    <button
      ref="boton"
      type="button"
      class="btn-tema"
      aria-haspopup="dialog"
      :aria-expanded="abierto ? 'true' : 'false'"
      aria-controls="tema-embarque-panel"
      aria-label="Configuración de colores del embarque"
      @click="abrir"
    >
      <i class="fas fa-palette" aria-hidden="true"></i>
      Colores
    </button>

    <div
      v-if="abierto"
      v-portal-cuerpo
      class="tema-overlay"
      @click.self="cerrar"
    >
      <div
        id="tema-embarque-panel"
        ref="panel"
        class="tema-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tema-embarque-titulo"
        tabindex="-1"
      >
        <header class="tema-cabecera">
          <h2 id="tema-embarque-titulo">Colores del embarque</h2>
          <button type="button" class="tema-cerrar" aria-label="Cerrar configuración de colores" @click="cerrar">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>

        <div class="tema-controles">
          <p class="tema-ayuda">
            Cambia el acento de botones e iconos, y el color de encabezados y etiquetas.
            Se aplica al momento y queda en este dispositivo, también sin internet.
          </p>

          <div class="tema-campo">
            <label for="tema-embarque-acento">Color de acento y botones</label>
            <input
              id="tema-embarque-acento"
              type="color"
              :value="tema.acento"
              @input="cambiar('acento', $event)"
            >
            <span class="tema-hex">{{ tema.acento }}</span>
          </div>

          <div class="tema-campo">
            <label for="tema-embarque-etiquetas">Color de encabezados y etiquetas</label>
            <input
              id="tema-embarque-etiquetas"
              type="color"
              :value="tema.etiquetas"
              @input="cambiar('etiquetas', $event)"
            >
            <span class="tema-hex">{{ tema.etiquetas }}</span>
          </div>

          <p v-if="aviso" class="tema-aviso" role="status">{{ aviso }}</p>

          <div class="tema-acciones">
            <button type="button" class="tema-restaurar" @click="restaurar">
              Volver a los colores originales
            </button>
            <button type="button" class="tema-listo" @click="cerrar">
              Cerrar
            </button>
          </div>
        </div>

        <aside class="tema-vista" aria-label="Vista previa de los colores">
          <p class="tema-vista-titulo">Vista previa</p>
          <div class="muestra-cabina" :style="estiloMuestra">
            <div class="muestra-titulo">
              <span class="muestra-icono" aria-hidden="true"><i class="fas fa-ship"></i></span>
              <span class="muestra-encabezado">Embarque</span>
            </div>
            <span class="muestra-etiqueta">Fecha de embarque</span>
            <span class="muestra-boton">
              <i class="fas fa-file-pdf" aria-hidden="true"></i>
              Resumen
            </span>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script>
import {
  COLORES_ORIGINALES,
  aplicarTema,
  colorTextoSobre,
  colorUtilizable,
  guardarTema,
  leerTema,
  restaurarTema,
} from '../temaEmbarque';

export default {
  name: 'ConfiguracionTemaEmbarque',
  directives: {
    // El botón vive en el encabezado, cuyo backdrop-filter recorta un fixed.
    // Solo el cuadro de colores pasa a body; el botón se queda en la cabina.
    portalCuerpo: {
      inserted(el) {
        if (typeof document !== 'undefined' && el.parentNode !== document.body) {
          document.body.appendChild(el);
        }
      },
    },
  },
  data() {
    return {
      abierto: false,
      aviso: '',
      tema: { ...COLORES_ORIGINALES },
    };
  },
  computed: {
    estiloMuestra() {
      return {
        '--embarque-acento': this.tema.acento,
        '--embarque-etiquetas': this.tema.etiquetas,
        '--embarque-acento-texto': colorTextoSobre(this.tema.acento),
      };
    },
  },
  mounted() {
    this.tema = leerTema();
    this.aplicar();
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.alTecla, true);
  },
  methods: {
    aplicar() {
      const raiz = (this.$el && this.$el.closest && this.$el.closest('.nuevo-embarque-container'))
        || document.querySelector('.nuevo-embarque-container');
      aplicarTema(raiz, this.tema);
    },
    abrir() {
      if (this.abierto) return;
      this.abierto = true;
      document.addEventListener('keydown', this.alTecla, true);
      this.$nextTick(() => {
        if (this.$refs.panel) this.$refs.panel.focus();
      });
    },
    cerrar() {
      if (!this.abierto) return;
      this.abierto = false;
      document.removeEventListener('keydown', this.alTecla, true);
      this.$nextTick(() => {
        if (this.$refs.boton) this.$refs.boton.focus();
      });
    },
    alTecla(evento) {
      if (evento.key !== 'Escape' || !this.abierto) return;
      evento.preventDefault();
      evento.stopPropagation();
      this.cerrar();
    },
    cambiar(clave, evento) {
      const valor = evento && evento.target ? evento.target.value : '';
      const hex = colorUtilizable(valor);
      if (!hex) {
        this.aviso = 'Ese color no se distingue sobre el fondo del embarque. Se conserva el anterior.';
        if (evento && evento.target) evento.target.value = this.tema[clave];
        return;
      }
      this.aviso = '';
      this.tema = { ...this.tema, [clave]: hex };
      guardarTema(this.tema);
      this.aplicar();
    },
    restaurar() {
      this.tema = restaurarTema();
      this.aviso = '';
      this.aplicar();
    },
  },
};
</script>

<style scoped>
.tema-embarque {
  display: inline-flex;
}

.btn-tema {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 10px;
  gap: 7px;
  font-size: .84rem;
  font-weight: 700;
  line-height: 1;
  color: #dbe7f8;
  border: 1px solid var(--embarque-acento, rgba(148, 163, 184, .17));
  border-radius: 8px;
  background: rgba(20, 33, 55, .78);
  box-shadow: inset 0 1px rgba(255, 255, 255, .06);
  cursor: pointer;
}

.btn-tema i {
  color: var(--embarque-acento, #38d9ff);
  font-size: .95rem;
}

.btn-tema:hover {
  transform: translateY(-2px);
  color: #fff;
  background: rgba(28, 48, 78, .95);
}

.btn-tema:focus-visible,
.tema-cerrar:focus-visible,
.tema-restaurar:focus-visible,
.tema-listo:focus-visible,
.tema-campo input:focus-visible {
  outline: 2px solid #f8fbff;
  outline-offset: 2px;
}

.tema-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  justify-content: center;
  padding: 12px;
  background: rgba(2, 6, 14, .72);
}

.tema-panel {
  display: grid;
  width: 100%;
  max-height: min(92vh, 760px);
  overflow: auto;
  color: #e8eef9;
  border: 1px solid rgba(148, 163, 184, .22);
  background: linear-gradient(160deg, #152238 0%, #0c1628 58%, #101c30 100%);
  box-shadow: 0 28px 70px rgba(0, 0, 0, .5);
}

.tema-panel:focus {
  outline: none;
}

.tema-cabecera,
.tema-controles,
.tema-vista {
  min-width: 0;
}

.tema-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 0;
}

.tema-cabecera h2 {
  margin: 0;
  color: #f8fbff;
  font-size: 1.15rem;
  line-height: 1.3;
}

.tema-cerrar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #f8fbff;
  border: 1px solid rgba(148, 163, 184, .35);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}

.tema-ayuda,
.tema-vista-titulo {
  margin: 0;
  color: #d5e2f4;
  font-size: .92rem;
  line-height: 1.45;
}

.tema-controles,
.tema-vista {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.tema-campo {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  align-items: center;
}

.tema-campo label {
  color: #f8fbff;
  font-size: .95rem;
  font-weight: 750;
}

.tema-campo input[type="color"] {
  width: 64px;
  height: 44px;
  padding: 4px;
  border: 1px solid rgba(226, 232, 240, .55);
  border-radius: 8px;
  background: #0c1628;
  cursor: pointer;
}

.tema-hex {
  grid-column: 1 / -1;
  color: #d5e2f4;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .82rem;
}

.tema-aviso {
  margin: 0;
  color: #ffe08a;
  font-size: .88rem;
  line-height: 1.4;
}

.tema-acciones {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tema-restaurar,
.tema-listo {
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: .92rem;
  font-weight: 750;
  cursor: pointer;
}

.tema-restaurar {
  color: #f8fbff;
  border: 1px solid rgba(226, 232, 240, .45);
  background: transparent;
}

.tema-listo {
  color: #06101c;
  border: 0;
  background: #38d9ff;
}

.tema-vista-titulo {
  font-size: .78rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.muestra-cabina {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, .2);
  border-radius: 14px;
  background: linear-gradient(125deg, rgba(18, 30, 52, .95), rgba(8, 15, 29, .95));
}

.muestra-titulo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.muestra-icono {
  display: inline-grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--embarque-acento-texto, #06101c);
  border-radius: 8px;
  background: var(--embarque-acento, #38d9ff);
}

.muestra-encabezado,
.muestra-etiqueta {
  color: var(--embarque-etiquetas, #8da0bd);
  font-weight: 800;
}

.muestra-encabezado {
  font-size: 1.05rem;
}

.muestra-etiqueta {
  font-size: .78rem;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.muestra-boton {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 12px;
  color: #dbe7f8;
  border: 1px solid var(--embarque-acento, #38d9ff);
  border-radius: 8px;
  background: rgba(20, 33, 55, .78);
  font-weight: 750;
}

.muestra-boton i {
  color: var(--embarque-acento, #38d9ff);
}

@media (max-width: 959px) {
  .tema-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .tema-panel {
    max-height: min(92vh, 720px);
    border-radius: 18px 18px 0 0;
  }

  .tema-embarque,
  .btn-tema {
    width: 100%;
  }
}

@media (min-width: 960px) {
  .tema-overlay {
    align-items: center;
    padding: 40px 48px;
  }

  .tema-panel {
    width: min(960px, calc(100vw - 96px));
    max-height: min(640px, calc(100vh - 80px));
    grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
    grid-template-areas:
      "cabecera cabecera"
      "controles vista";
    border-radius: 22px;
    overflow: hidden;
  }

  .tema-cabecera {
    grid-area: cabecera;
    padding: 22px 28px 0;
  }

  .tema-cabecera h2 {
    font-size: 1.45rem;
  }

  .tema-controles {
    grid-area: controles;
    padding: 18px 28px 28px;
  }

  .tema-vista {
    grid-area: vista;
    justify-content: center;
    padding: 18px 28px 28px 8px;
    border-left: 1px solid rgba(148, 163, 184, .16);
  }

  .tema-acciones {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .tema-listo,
  .tema-restaurar {
    width: auto;
  }
}
</style>
