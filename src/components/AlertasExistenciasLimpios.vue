<template>
  <div class="alertas-stock">
    <dialog
      v-if="modal"
      ref="overlay"
      class="stock-overlay"
      aria-labelledby="stock-titulo"
      @cancel.prevent="cerrar"
      @keydown="tecladoDialogo"
    >
      <section ref="dialogo" class="stock-dialogo" tabindex="-1">
        <header>
          <h2 id="stock-titulo">
            {{
              modal === 'configurar'
                ? 'Mínimo de este lote'
                : modal === 'seleccionar'
                ? 'Selecciona la fecha de entrada'
                : modal === 'estado'
                ? 'Revisión de existencias'
                : 'Lotes con existencia baja'
            }}
          </h2>
          <button type="button" :disabled="guardando" aria-label="Cerrar alerta" @click="cerrar">
            ×
          </button>
        </header>
        <form v-if="modal === 'configurar'" @submit.prevent="guardar">
          <div class="stock-body">
            <h3>{{ nombreAlerta(seleccion) }}</h3>
            <p>
              Este mínimo aplica solo a este lote, con su fecha de entrada, proveedor, precio y
              cuarto. Los demás lotes tienen mínimos independientes.
            </p>
            <p v-if="cargando" role="status">Cargando el mínimo guardado…</p>
            <p v-if="errorCarga" class="error-stock" role="alert">
              {{ errorCarga }}
              <button type="button" @click="escucharConfiguracion">Reintentar</button>
            </p>
            <p v-if="inventarioListo">
              Existencia actual: <strong>{{ formatNumber(kilosSeleccion) }} kg</strong>
            </p>
            <p v-else>Actualizando la existencia…</p>
            <label for="stock-minimo">Avisar cuando queden esta cantidad o menos (kg)</label>
            <input
              id="stock-minimo"
              v-model="minimo"
              type="number"
              min="0"
              step="0.01"
              required
              :disabled="guardando"
              placeholder="Ej. 100"
            />
            <p class="ayuda-stock">
              Con 0 kg, el aviso se activa al agotarse. El mínimo queda guardado para futuras
              consultas e impresiones.
            </p>
            <p v-if="errorGuardado" class="error-stock" role="alert">{{ errorGuardado }}</p>
          </div>
          <footer>
            <button
              v-if="configuracionSeleccionada"
              type="button"
              class="quitar-stock"
              :disabled="guardando || cargando || !!errorCarga"
              @click="quitar"
            >
              Quitar alerta
            </button>
            <button type="button" :disabled="guardando" @click="cerrar">Cancelar</button>
            <button
              type="submit"
              class="principal-stock"
              :disabled="guardando || cargando || !!errorCarga"
            >
              {{ guardando ? 'Guardando…' : 'Guardar mínimo' }}
            </button>
          </footer>
        </form>
        <template v-else-if="modal === 'seleccionar'">
          <div class="stock-body">
            <p>Esta fila agrupa varios lotes. Elige la fecha para configurar su mínimo.</p>
            <div class="minimos-lista">
              <button
                v-for="lote in opcionesLotes"
                :key="lote.id"
                type="button"
                @click="seleccionarLote(lote)"
              >
                {{ nombreAlerta(lote) }}
              </button>
            </div>
          </div>
          <footer><button type="button" @click="cerrar">Cancelar</button></footer>
        </template>
        <template v-else-if="modal === 'estado'">
          <div class="stock-body">
            <p role="status">{{ errorCarga || aviso }}</p>
          </div>
          <footer>
            <button v-if="errorCarga" type="button" @click="escucharConfiguracion">
              Reintentar</button
            ><button type="button" @click="cerrar">Cerrar</button>
          </footer>
        </template>
        <template v-else>
          <div class="stock-body">
            <p>
              Estos lotes están en su mínimo o por debajo. Se revisa todo el inventario, aunque
              tengas una búsqueda activa.
            </p>
            <p v-if="!inventarioListo" role="status">Actualizando existencias…</p>
            <p v-if="errorCarga" class="error-stock" role="alert">{{ errorCarga }}</p>
            <ul class="bajas-lista">
              <li v-for="alerta in alertasBajas" :key="alerta.id">
                <strong>{{ nombreAlerta(alerta) }}</strong
                ><span
                  >Quedan {{ formatNumber(alerta.kilos) }} kg · mínimo
                  {{ formatNumber(alerta.minimo) }} kg</span
                >
                <button type="button" @click="seleccionarLote(alerta)">Configurar este lote</button>
              </li>
            </ul>
            <p v-if="inventarioListo && !alertasBajas.length">
              Las existencias ya no están por debajo de los mínimos configurados.
            </p>
          </div>
          <footer>
            <button type="button" @click="cerrar">Cancelar</button
            ><button
              type="button"
              class="principal-stock"
              :disabled="!inventarioListo || cargando || !!errorCarga"
              @click="continuarImpresion"
            >
              Continuar e imprimir
            </button>
          </footer>
        </template>
      </section>
    </dialog>
  </div>
</template>

<script>
import { db } from '@/firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { formatNumber } from '@/utils/formatters';
import {
  idAlertaLote,
  contextoLoteAlerta,
  kilosLoteAlerta,
  evaluarAlertasExistencias,
} from '@/utils/alertasExistenciasLimpios';

export default {
  name: 'AlertasExistenciasLimpios',
  props: {
    existencias: { type: Object, required: true },
    inventarioListo: { type: Boolean, default: false },
  },
  data() {
    return {
      configuraciones: [],
      cargando: true,
      errorCarga: '',
      aviso: '',
      modal: '',
      seleccion: {},
      opcionesLotes: [],
      minimo: '',
      guardando: false,
      errorGuardado: '',
    };
  },
  computed: {
    alertasBajas() {
      return evaluarAlertasExistencias(this.existencias, this.configuraciones);
    },
    kilosSeleccion() {
      return kilosLoteAlerta(this.existencias, this.seleccion);
    },
    configuracionSeleccionada() {
      return this.configuraciones.find((config) => config.id === this.seleccion.id);
    },
  },
  mounted() {
    this.escucharConfiguracion();
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.modal) document.body.style.overflow = this.overflowAnterior || '';
  },
  methods: {
    formatNumber,
    nombreAlerta(config) {
      const fecha = config.fechaEntrada
        ? config.fechaEntrada.split('-').reverse().join('/')
        : 'Sin fecha';
      return `${config.medida} · ${config.proveedor} · ${fecha} · ${
        config.precio === null ? 'Sin precio' : '$' + formatNumber(config.precio)
      } · Cuarto ${config.cuartoFrio}`;
    },
    escucharConfiguracion() {
      if (this.unsubscribe) this.unsubscribe();
      this.cargando = true;
      this.errorCarga = '';
      this.unsubscribe = onSnapshot(
        collection(db, 'alertasExistenciasLimpios'),
        { includeMetadataChanges: true },
        (snapshot) => {
          this.configuraciones = snapshot.docs
            .map((item) => ({ ...item.data(), id: item.id }))
            .filter(
              (item) =>
                typeof item.medida === 'string' &&
                item.alcance === 'lote' &&
                Number.isFinite(item.minimo) &&
                item.minimo >= 0
            )
            .sort((a, b) => a.medida.localeCompare(b.medida, 'es', { numeric: true }));
          this.cargando = snapshot.metadata.fromCache;
        },
        () => {
          this.cargando = false;
          this.errorCarga = 'No se pudieron cargar los mínimos. Reintenta antes de imprimir.';
        }
      );
    },
    abrirModal(tipo) {
      this.focoAnterior = document.activeElement;
      this.overflowAnterior = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      this.modal = tipo;
      this.$nextTick(() => {
        const dialogo = this.$refs.dialogo;
        if (this.$refs.overlay) this.$refs.overlay.showModal();
        if (dialogo) (dialogo.querySelector('input') || dialogo).focus();
      });
    },
    abrir(item, proveedor) {
      if (this.modal) return;
      const lotes = item.lotesAlerta || [item];
      this.opcionesLotes = [
        ...new Map(
          lotes.map((lote) => {
            const contexto = contextoLoteAlerta(lote, proveedor);
            return [idAlertaLote(contexto), { ...contexto, id: idAlertaLote(contexto) }];
          })
        ).values(),
      ];
      if (this.opcionesLotes.length > 1) this.abrirModal('seleccionar');
      else {
        this.seleccion = this.opcionesLotes[0];
        this.prepararMinimo();
        this.abrirModal('configurar');
      }
    },
    prepararMinimo() {
      const config = this.configuracionSeleccionada;
      this.minimo = config ? config.minimo : '';
      this.errorGuardado = '';
    },
    seleccionarLote(lote) {
      this.seleccion = { ...contextoLoteAlerta(lote), id: idAlertaLote(lote) };
      this.prepararMinimo();
      this.modal = 'configurar';
      this.$nextTick(() => {
        const input = this.$refs.dialogo.querySelector('input');
        if (input) input.focus();
      });
    },
    cerrar() {
      if (this.guardando) return;
      this.modal = '';
      document.body.style.overflow = this.overflowAnterior || '';
      this.$nextTick(() => {
        if (this.focoAnterior && this.focoAnterior.isConnected) this.focoAnterior.focus();
      });
    },
    tecladoDialogo(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cerrar();
      }
      if (event.key !== 'Tab') return;
      const items = [
        ...this.$refs.dialogo.querySelectorAll('button:not(:disabled), input:not(:disabled)'),
      ];
      const primero = items[0],
        ultimo = items[items.length - 1];
      if (!primero) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === primero || document.activeElement === this.$refs.dialogo)
      ) {
        event.preventDefault();
        ultimo.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === ultimo || document.activeElement === this.$refs.dialogo)
      ) {
        event.preventDefault();
        primero.focus();
      }
    },
    async guardar() {
      if (this.guardando || this.cargando || this.errorCarga) return;
      const minimo = Number(this.minimo);
      if (String(this.minimo).trim() === '' || !Number.isFinite(minimo) || minimo < 0) {
        this.errorGuardado = 'Introduce una cantidad válida de 0 kg o más.';
        return;
      }
      this.guardando = true;
      this.errorGuardado = '';
      try {
        const config = { ...this.seleccion, minimo: Math.round(minimo * 100) / 100 };
        await setDoc(doc(db, 'alertasExistenciasLimpios', config.id), {
          medida: config.medida,
          alcance: 'lote',
          proveedor: config.proveedor,
          fechaEntrada: config.fechaEntrada,
          precio: config.precio,
          cuartoFrio: config.cuartoFrio,
          minimo: config.minimo,
          updatedAt: serverTimestamp(),
        });
        this.configuraciones = [
          ...this.configuraciones.filter((item) => item.id !== config.id),
          config,
        ];
        this.aviso = `Mínimo guardado para ${this.nombreAlerta(config)}: ${formatNumber(
          config.minimo
        )} kg.`;
        this.guardando = false;
        this.cerrar();
      } catch (_) {
        this.errorGuardado =
          'No se pudo guardar el mínimo. Revisa tu conexión y vuelve a intentarlo.';
      } finally {
        this.guardando = false;
      }
    },
    async quitar() {
      if (this.guardando || this.cargando || this.errorCarga) return;
      this.guardando = true;
      this.errorGuardado = '';
      try {
        await deleteDoc(doc(db, 'alertasExistenciasLimpios', this.seleccion.id));
        this.configuraciones = this.configuraciones.filter((item) => item.id !== this.seleccion.id);
        this.aviso = `Alerta desactivada para ${this.nombreAlerta(this.seleccion)}.`;
        this.guardando = false;
        this.cerrar();
      } catch (_) {
        this.errorGuardado = 'No se pudo quitar la alerta. Vuelve a intentarlo.';
      } finally {
        this.guardando = false;
      }
    },
    revisarAntesDeImprimir() {
      if (this.cargando || this.errorCarga || !this.inventarioListo) {
        this.aviso = 'Espera a que se carguen las existencias y sus mínimos antes de imprimir.';
        if (!this.modal) this.abrirModal('estado');
        return false;
      }
      if (this.modal) return false;
      if (this.alertasBajas.length) {
        this.abrirModal('imprimir');
        return false;
      }
      return true;
    },
    continuarImpresion() {
      if (!this.inventarioListo || this.cargando || this.errorCarga) return;
      this.cerrar();
      this.$emit('continuar-impresion');
    },
  },
};
</script>

<style scoped>
.alertas-stock {
  color: #d7ffe9;
  font-size: 13px;
}
.alertas-stock p {
  line-height: 1.6;
}
.ayuda-stock {
  color: #aacbb6;
  margin: 0 0 8px;
}
.alertas-stock summary {
  cursor: pointer;
  padding: 8px 0;
}
.alertas-stock button {
  font: inherit;
  background: #112e1e;
  color: #d7ffe9;
  border: 1px solid #397b51;
  border-radius: 7px;
  padding: 10px 14px;
  min-height: 44px;
  cursor: pointer;
}
.alertas-stock button:hover {
  background: #1b442d;
}
.alertas-stock button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.alertas-stock button:focus-visible,
.alertas-stock input:focus-visible {
  outline: 3px solid #00e5ff;
  outline-offset: 3px;
}
.minimos-lista {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.stock-overlay {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  border: 0;
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: #000b;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.stock-overlay:not([open]) {
  display: none;
}
.stock-dialogo {
  width: 100%;
  max-width: 620px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  background: #081b11;
  color: #d7ffe9;
  border: 1px solid #488c60;
  border-radius: 14px;
  box-shadow: 0 20px 70px #0008;
}
.stock-dialogo header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-bottom: 1px solid #397b51;
}
.stock-dialogo h2 {
  color: #a8ffcb;
  margin: 0;
  font-size: 19px;
  font-weight: 700;
}
.stock-dialogo h3 {
  color: #fff;
  font-size: 18px;
  margin: 0 0 12px;
  overflow-wrap: anywhere;
}
.stock-body {
  padding: 20px;
}
.stock-body label {
  display: block;
  margin: 12px 0 8px;
}
.stock-body input {
  width: 100%;
  padding: 12px;
  background: #fff;
  color: #173b36;
  font: inherit;
  font-size: 16px;
  border-radius: 7px;
  border: 1px solid #70ba8c;
  margin-bottom: 12px;
}
.stock-dialogo footer {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #397b51;
  background: #081b11;
}
.stock-dialogo .principal-stock {
  background: #a8ffcb;
  color: #073519;
  font-weight: 700;
}
.stock-dialogo .quitar-stock {
  margin-right: auto;
  color: #ffbdac;
}
.error-stock {
  color: #ffbdac;
}
.bajas-lista {
  padding: 0;
  list-style: none;
}
.bajas-lista li {
  padding: 14px;
  background: #342a10;
  border: 1px solid #a8802b;
  border-radius: 8px;
  margin-bottom: 10px;
  overflow-wrap: anywhere;
}
.bajas-lista strong,
.bajas-lista span {
  display: block;
}
.bajas-lista span {
  color: #ffe0a8;
  margin-top: 6px;
}
@media print {
  .alertas-stock {
    display: none;
  }
}
</style>
