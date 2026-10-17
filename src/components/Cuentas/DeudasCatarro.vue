<template>
  <section class="deudas-catarro" aria-label="Cuentas y deudas de Catarro">
    <div class="pestanas" role="tablist" aria-label="Cuentas de Catarro">
      <button v-for="(pestana, index) in pestanas" :id="'pestana-catarro-' + pestana.id" :key="pestana.id"
        type="button" role="tab" :aria-selected="seleccion === pestana.id ? 'true' : 'false'"
        :aria-controls="pestana.id === 'actuales' ? 'cuentas-actuales-catarro' : 'panel-deuda-catarro'"
        :tabindex="seleccion === pestana.id ? 0 : -1" :disabled="guardando"
        :class="{ activa: seleccion === pestana.id, 'pestana-actuales': pestana.id === 'actuales' }" @click="seleccionar(pestana.id)"
        @keydown.right.prevent="moverPestana(index, 1)" @keydown.left.prevent="moverPestana(index, -1)">
        {{ pestana.nombre }}
        <small v-if="pestana.id !== 'actuales'">{{ saldo(pestana) === 0 ? 'Pagada' : moneda(saldo(pestana)) + ' pendiente' }}</small>
      </button>
    </div>
    <div class="resumen-deudas" role="status">
      <div class="desglose-deuda">
        <div class="resumen-cuentas-actuales">
          <span>Cuentas actuales</span>
          <strong>{{ cargandoCuentas ? 'Calculando…' : errorCuentas ? 'No disponible' : moneda(saldoCuentasCentavos) }}</strong>
          <small>Saldo de las cuentas actuales</small>
        </div>
        <div class="resumen-cuentas-pendientes">
          <span>Cuentas pendientes</span>
          <strong>{{ cargando ? 'Calculando…' : errorCarga ? 'No disponible' : moneda(totalDeudasCentavos) }}</strong>
          <small>Deudas de las pestañas adicionales</small>
        </div>
      </div>
      <div class="total-deuda">
        <span>Deuda total de Catarro</span>
        <strong>{{ cargando || cargandoCuentas ? 'Calculando…' : errorCarga || errorCuentas ? 'No disponible' : moneda(deudaTotalCentavos) }}</strong>
      </div>
    </div>
    <button type="button" class="agregar-pestana" :disabled="guardando || cargando || !!errorCarga"
      @click="seleccionar('nueva')">+ Agregar pestaña de deuda</button>

    <p v-if="cargando" class="aviso" role="status">Cargando deudas atrasadas…</p>
    <div v-if="errorCarga" class="error" role="alert">
      {{ errorCarga }} <button type="button" @click="cargarDeudas">Reintentar</button>
    </div>
    <p v-if="mensaje" class="exito" role="status">{{ mensaje }}</p>
    <p v-if="errorAccion" class="error" role="alert">{{ errorAccion }}</p>

    <form v-if="seleccion === 'nueva'" class="panel formulario-nueva" @submit.prevent="guardarDeuda">
      <h2>Nueva deuda atrasada</h2>
      <p class="ayuda">Crea una pestaña con su propio saldo y abonos.</p>
      <fieldset :disabled="guardando">
        <label for="nombre-deuda-catarro">Nombre de la pestaña</label>
        <input id="nombre-deuda-catarro" ref="nombre" v-model="nueva.nombre" required maxlength="80"
          placeholder="Ej. Deuda anterior 1" autocomplete="off">
        <div class="campos">
          <div><label for="monto-deuda-catarro">Monto inicial ($)</label>
            <input id="monto-deuda-catarro" v-model="nueva.monto" type="number" inputmode="decimal"
              min="0.01" step="0.01" required placeholder="0.00"></div>
          <div><label for="fecha-deuda-catarro">Fecha de la deuda</label>
            <input id="fecha-deuda-catarro" v-model="nueva.fecha" type="date" required></div>
        </div>
        <div class="botones">
          <button type="button" class="secundario" @click="seleccionar('actuales')">Cancelar</button>
          <button type="submit" class="principal">{{ guardando ? 'Guardando…' : 'Crear pestaña' }}</button>
        </div>
      </fieldset>
    </form>

    <section v-else-if="seleccion !== 'actuales'" id="panel-deuda-catarro" class="panel" role="tabpanel"
      :aria-labelledby="'pestana-catarro-' + seleccion">
      <template v-if="deudaActiva">
        <div class="encabezado">
          <div><h2>{{ deudaActiva.nombre }}</h2><p class="ayuda">Deuda del {{ fechaTexto(deudaActiva.fecha) }}</p></div>
          <span :class="['estado', { pagada: saldo(deudaActiva) === 0 }]">{{ saldo(deudaActiva) === 0 ? 'Pagada' : 'Pendiente' }}</span>
        </div>
        <div class="resumen">
          <div class="monto-inicial"><span>Monto inicial</span><strong>{{ moneda(deudaActiva.montoInicialCentavos) }}</strong>
            <button type="button" class="editar-monto" :disabled="guardando || !!errorCarga" @click="editarMonto">Modificar monto inicial</button>
          </div>
          <div><span>Total abonado</span><strong>{{ moneda(deudaActiva.totalAbonadoCentavos) }}</strong></div>
          <div class="saldo"><span>Saldo pendiente</span><strong>{{ moneda(saldo(deudaActiva)) }}</strong></div>
        </div>

        <form v-if="editandoMonto" class="formulario-abono editar-monto-form" @submit.prevent="guardarMonto">
          <fieldset :disabled="guardando || !!errorCarga">
            <label for="nuevo-monto-catarro">Nuevo monto inicial ($)</label>
            <input id="nuevo-monto-catarro" ref="montoInicial" v-model="montoEditado" type="number" inputmode="decimal"
              :min="Math.max(0.01, deudaActiva.totalAbonadoCentavos / 100)" step="0.01" required>
            <p class="ayuda">El monto no puede ser menor que el total abonado: {{ moneda(deudaActiva.totalAbonadoCentavos) }}.</p>
            <div class="botones">
              <button type="button" class="secundario" @click="editandoMonto = false">Cancelar</button>
              <button type="submit" class="principal">{{ guardando ? 'Guardando…' : 'Guardar monto inicial' }}</button>
            </div>
          </fieldset>
        </form>

        <form v-if="saldo(deudaActiva) > 0" class="formulario-abono" @submit.prevent="guardarAbono">
          <h3>Registrar abono</h3>
          <fieldset :disabled="guardando || !!errorCarga">
            <div class="campos">
              <div><label for="monto-abono-catarro">Monto del abono ($)</label>
                <input id="monto-abono-catarro" v-model="abono.monto" type="number" inputmode="decimal"
                  min="0.01" :max="saldo(deudaActiva) / 100" step="0.01" required placeholder="0.00"></div>
              <div><label for="fecha-abono-catarro">Fecha del abono</label>
                <input id="fecha-abono-catarro" v-model="abono.fecha" type="date" required></div>
            </div>
            <label for="descripcion-abono-catarro">Descripción (opcional)</label>
            <input id="descripcion-abono-catarro" v-model="abono.descripcion" maxlength="240"
              placeholder="Ej. Transferencia o efectivo">
            <div class="botones"><button type="submit" class="principal">{{ guardando ? 'Guardando…' : 'Guardar abono' }}</button></div>
          </fieldset>
        </form>
        <p v-else class="liquidada">Esta deuda está pagada. Puedes consultar todos sus abonos abajo.</p>

        <div class="historial">
          <h3>Historial de abonos</h3>
          <p v-if="cargandoAbonos" role="status">Cargando abonos…</p>
          <div v-else-if="errorAbonos" class="error" role="alert">{{ errorAbonos }}
            <button type="button" @click="cargarAbonos(seleccion)">Reintentar</button></div>
          <p v-else-if="!abonos.length" class="ayuda">Todavía no hay abonos registrados en esta deuda.</p>
          <ul v-else>
            <li v-for="pago in abonos" :key="pago.id" :class="{ anulado: pago.anulado }">
              <div class="detalle-abono"><strong>{{ moneda(pago.montoCentavos) }}</strong>
                <span>{{ fechaTexto(pago.fecha) }}</span><p>{{ pago.descripcion || 'Sin descripción' }}</p></div>
              <span v-if="pago.anulado" class="etiqueta-anulado">Anulado</span>
              <button v-else type="button" class="anular" :disabled="guardando || !!errorCarga"
                @click="confirmarAnulacion(pago)">Anular</button>
            </li>
          </ul>
        </div>
        <div class="botones">
          <button type="button" class="anular" :disabled="guardando || !!errorCarga" @click="confirmarBorrado">Borrar pestaña de deuda</button>
        </div>
      </template>
      <p v-else role="status">Cargando deuda…</p>
    </section>
  </section>
</template>

<script>
import * as deudasService from '@/services/deudasCatarro.service';
import { obtenerFechaActualISO } from '@/utils/dateUtils';
import { formatNumber, formatearFecha } from '@/utils/formatters';

const nuevoAbono = () => ({ monto: '', fecha: obtenerFechaActualISO(), descripcion: '' });

export default {
  name: 'DeudasCatarro',
  props: {
    saldoCuentasCentavos: { type: Number, default: 0 },
    cargandoCuentas: { type: Boolean, default: false },
    errorCuentas: { type: Boolean, default: false },
  },
  data() {
    return {
      deudas: [], abonos: [], seleccion: 'actuales', cargando: true, cargandoAbonos: false,
      guardando: false, errorCarga: '', errorAbonos: '', errorAccion: '', mensaje: '',
      nueva: { nombre: '', monto: '', fecha: obtenerFechaActualISO() }, abono: nuevoAbono(),
      intentoDeuda: null, intentoAbono: null, dejarDeudas: null, dejarAbonos: null,
      editandoMonto: false, montoEditado: '',
    };
  },
  computed: {
    pestanas() { return [{ id: 'actuales', nombre: 'Cuentas actuales' }, ...this.deudas]; },
    deudaActiva() { return this.deudas.find(deuda => deuda.id === this.seleccion); },
    totalDeudasCentavos() { return this.deudas.reduce((total, deuda) => total + this.saldo(deuda), 0); },
    deudaTotalCentavos() { return this.saldoCuentasCentavos + this.totalDeudasCentavos; },
  },
  mounted() { this.cargarDeudas(); },
  beforeDestroy() {
    if (this.dejarDeudas) this.dejarDeudas();
    if (this.dejarAbonos) this.dejarAbonos();
  },
  methods: {
    moneda(centavos) { return '$' + formatNumber(centavos / 100); },
    fechaTexto: formatearFecha,
    saldo(deuda) { return deuda.montoInicialCentavos - deuda.totalAbonadoCentavos; },
    cargarDeudas() {
      if (this.dejarDeudas) this.dejarDeudas();
      this.cargando = true;
      this.errorCarga = '';
      this.dejarDeudas = deudasService.escucharDeudas(deudas => {
        const seleccionEliminada = this.deudaActiva && !deudas.some(deuda => deuda.id === this.seleccion);
        this.deudas = deudas;
        this.cargando = false;
        if (seleccionEliminada) this.restablecerSeleccion();
      }, () => {
        this.cargando = false;
        this.errorCarga = 'No se pudieron cargar las deudas atrasadas. Revisa tu conexión e intenta de nuevo.';
      });
    },
    cargarAbonos(id) {
      if (this.dejarAbonos) this.dejarAbonos();
      this.dejarAbonos = null;
      this.abonos = [];
      this.errorAbonos = '';
      this.cargandoAbonos = false;
      if (id === 'actuales' || id === 'nueva') return;
      this.cargandoAbonos = true;
      this.dejarAbonos = deudasService.escucharAbonos(id, abonos => {
        if (this.seleccion !== id) return;
        this.abonos = abonos;
        this.cargandoAbonos = false;
      }, () => {
        if (this.seleccion !== id) return;
        this.cargandoAbonos = false;
        this.errorAbonos = 'No se pudo cargar el historial de abonos.';
      });
    },
    seleccionar(id) {
      if (this.guardando || this.seleccion === id) return;
      this.seleccion = id;
      this.editandoMonto = false;
      this.abono = nuevoAbono();
      this.errorAccion = '';
      this.mensaje = '';
      this.$emit('seleccion', id);
      this.cargarAbonos(id);
      if (id === 'nueva') this.$nextTick(() => this.$refs.nombre && this.$refs.nombre.focus());
    },
    moverPestana(index, direccion) {
      if (this.guardando) return;
      const siguiente = this.pestanas[(index + direccion + this.pestanas.length) % this.pestanas.length];
      this.seleccionar(siguiente.id);
      this.$nextTick(() => document.getElementById('pestana-catarro-' + siguiente.id).focus());
    },
    errorGuardado(error) {
      if (error.code) return 'No se pudo confirmar el guardado. Revisa tu conexión y vuelve a intentar; se conservaron los datos del formulario.';
      return error.message || 'No se pudo guardar. Intenta de nuevo.';
    },
    restablecerSeleccion() {
      this.seleccion = 'actuales';
      this.editandoMonto = false;
      this.abono = nuevoAbono();
      this.$emit('seleccion', 'actuales');
      this.cargarAbonos('actuales');
    },
    editarMonto() {
      this.montoEditado = (this.deudaActiva.montoInicialCentavos / 100).toFixed(2);
      this.editandoMonto = true;
      this.errorAccion = '';
      this.mensaje = '';
      this.$nextTick(() => this.$refs.montoInicial && this.$refs.montoInicial.focus());
    },
    async guardarMonto() {
      if (this.guardando || !this.deudaActiva || this.errorCarga) return;
      this.guardando = true;
      this.errorAccion = '';
      this.mensaje = '';
      try {
        await deudasService.actualizarMontoInicial(this.seleccion, this.montoEditado);
        this.editandoMonto = false;
        this.mensaje = 'Monto inicial actualizado.';
      } catch (error) { this.errorAccion = this.errorGuardado(error); }
      finally { this.guardando = false; }
    },
    async confirmarBorrado() {
      if (this.guardando || !this.deudaActiva || this.errorCarga) return;
      const deuda = this.deudaActiva;
      if (!confirm(`¿Borrar la pestaña «${deuda.nombre}» con saldo pendiente de ${this.moneda(this.saldo(deuda))}? Se quitará del total de deuda. Sus abonos se conservarán como respaldo.`)) return;
      this.guardando = true;
      this.errorAccion = '';
      this.mensaje = '';
      try {
        await deudasService.borrarDeuda(deuda.id);
        this.restablecerSeleccion();
        this.mensaje = 'Pestaña de deuda borrada.';
      } catch (error) { this.errorAccion = this.errorGuardado(error); }
      finally { this.guardando = false; }
    },
    async guardarDeuda() {
      if (this.guardando || this.errorCarga) return;
      this.guardando = true;
      this.errorAccion = '';
      this.mensaje = '';
      const datos = { ...this.nueva };
      const firma = JSON.stringify(datos);
      if (!this.intentoDeuda || this.intentoDeuda.firma !== firma) {
        this.intentoDeuda = { firma, id: deudasService.nuevoIdDeuda() };
      }
      try {
        const id = await deudasService.crearDeuda(this.intentoDeuda.id, datos);
        this.nueva = { nombre: '', monto: '', fecha: obtenerFechaActualISO() };
        this.intentoDeuda = null;
        this.guardando = false;
        this.seleccionar(id);
        this.mensaje = 'Pestaña de deuda creada.';
      } catch (error) { this.errorAccion = this.errorGuardado(error); }
      finally { this.guardando = false; }
    },
    async guardarAbono() {
      if (this.guardando || !this.deudaActiva || this.errorCarga) return;
      this.guardando = true;
      this.errorAccion = '';
      this.mensaje = '';
      const deudaId = this.seleccion;
      const datos = { ...this.abono };
      const firma = JSON.stringify({ deudaId, ...datos });
      if (!this.intentoAbono || this.intentoAbono.firma !== firma) {
        this.intentoAbono = { firma, id: deudasService.nuevoIdAbono(deudaId) };
      }
      try {
        await deudasService.registrarAbono(deudaId, this.intentoAbono.id, datos);
        this.abono = nuevoAbono();
        this.intentoAbono = null;
        this.mensaje = 'Abono registrado en esta deuda.';
      } catch (error) { this.errorAccion = this.errorGuardado(error); }
      finally { this.guardando = false; }
    },
    async confirmarAnulacion(pago) {
      if (this.guardando || !confirm(`¿Anular el abono de ${this.moneda(pago.montoCentavos)} en «${this.deudaActiva.nombre}»? El monto volverá al saldo pendiente y el abono quedará marcado como anulado.`)) return;
      this.guardando = true;
      this.errorAccion = '';
      this.mensaje = '';
      try {
        await deudasService.anularAbono(this.seleccion, pago.id);
        this.mensaje = 'Abono anulado. El saldo pendiente se actualizó.';
      } catch (error) { this.errorAccion = this.errorGuardado(error); }
      finally { this.guardando = false; }
    },
  },
};
</script>

<style scoped>
.deudas-catarro { margin-bottom: 20px; color: #243047; }
.pestanas { display: flex; gap: 8px; overflow-x: auto; padding: 8px; margin-bottom: 16px; background: #fff; border: 1px solid #c5cdd6; border-radius: 10px; }
.pestanas button { flex: 0 0 auto; max-width: 240px; overflow-wrap: anywhere; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 16px; background: #fff; color: #334155; text-align: left; font: inherit; font-weight: 600; }
.pestanas button.activa { background: #fff1f2; border: 2px solid #c62828; color: #9f2020; }
.pestanas small { display: block; margin-top: 4px; font-size: 12px; font-weight: normal; }
.pestanas button.pestana-actuales { border: 2px solid #a41021; color: #a41021; font-weight: 800; }
.pestanas button.pestana-actuales.activa { background: #a41021; color: #fff; }
.resumen-deudas { margin: 4px 0 18px; }
.desglose-deuda { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.desglose-deuda > div { min-width: 0; border-radius: 10px; padding: 18px; }
.desglose-deuda span { display: block; font-size: 15px; font-weight: 700; }
.desglose-deuda strong { display: block; margin: 8px 0; font-size: 28px; line-height: 1.2; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.desglose-deuda small { display: block; font-size: 12px; }
.resumen-cuentas-actuales { background: #a41021; color: #fff; border: 2px solid #a41021; }
.resumen-cuentas-pendientes { background: #fff; color: #243047; border: 1px solid #a3afbe; border-top: 4px solid #243047; }
.resumen-cuentas-pendientes small { color: #526176; }
.total-deuda { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; padding: 18px; margin-top: 12px; border-radius: 10px; background: #fff; color: #9f2020; border: 2px solid #a41021; border-left-width: 6px; }
.total-deuda span { font-size: 16px; font-weight: 700; }
.total-deuda strong { font-size: 30px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.editar-monto { margin-top: 10px; border: 0; background: transparent; color: #9f2020; padding: 0; text-decoration: underline; text-align: left; }
.editar-monto-form { margin-bottom: 20px; }
.agregar-pestana { display: block; min-height: 40px; margin-left: auto; color: #a41021; background: #fff; border: 1px solid #a41021; border-radius: 7px; padding: 9px 14px; font-size: 13px; font-weight: 700; }
.agregar-pestana:hover { background: #a41021; color: #fff; }
.panel { margin-top: 16px; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 3px 14px #0002; }
.panel h2 { margin: 0; font-size: 24px; color: #a91f27; overflow-wrap: anywhere; }
.panel h3 { font-size: 18px; margin: 0 0 16px; }
.ayuda, .aviso { color: #64748b; font-size: 14px; margin: 8px 0 16px; }
.aviso { background: #fff; padding: 10px; border-radius: 8px; }
fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
label { display: block; font-weight: 600; font-size: 14px; margin: 14px 0 6px; }
input { width: 100%; min-width: 0; box-sizing: border-box; padding: 10px 12px; border: 1px solid #b7c4d4; border-radius: 7px; color: #243047; background: #fff; font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: wait; opacity: .6; }
button:focus-visible, input:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
.campos { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.campos > div { min-width: 0; }
.botones { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.botones button { padding: 10px 18px; border-radius: 7px; border: 0; font-weight: 600; }
.principal { background: #b42328; color: #fff; }
.secundario { background: #eef2f6; color: #334155; }
.encabezado { display: flex; gap: 12px; justify-content: space-between; align-items: flex-start; }
.estado { border-radius: 20px; padding: 6px 12px; background: #fff2d4; color: #825200; font-size: 13px; }
.estado.pagada, .liquidada { color: #166534; background: #eaf7ef; }
.liquidada { padding: 16px; border-radius: 8px; }
.resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0 24px; }
.resumen > div { padding: 14px; background: #f1f5f9; border-radius: 8px; min-width: 0; }
.resumen span { display: block; color: #526176; font-size: 13px; }
.resumen strong { display: block; margin-top: 6px; font-size: 21px; overflow-wrap: anywhere; }
.resumen .saldo { background: #fff1f2; color: #a91f27; }
.formulario-abono { padding: 18px; border: 1px solid #dce3ec; border-radius: 9px; }
.historial { margin-top: 26px; }
.historial ul { padding: 0; margin: 0; list-style: none; }
.historial li { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 0; border-bottom: 1px solid #e2e8f0; }
.detalle-abono { min-width: 0; overflow-wrap: anywhere; }
.detalle-abono strong { color: #166534; margin-right: 12px; }
.detalle-abono span { color: #64748b; font-size: 13px; }
.detalle-abono p { margin: 5px 0 0; font-size: 14px; white-space: pre-wrap; }
.anular { background: #fff; border: 1px solid #e7b9bb; color: #a91f27; border-radius: 6px; padding: 7px 12px; }
.anulado { opacity: .65; }
.anulado strong { text-decoration: line-through; color: #64748b; }
.etiqueta-anulado { font-size: 13px; color: #64748b; }
.error, .exito { margin: 12px 0; padding: 12px; border-radius: 8px; }
.error { background: #fff1f2; color: #a91f27; }
.exito { background: #eaf7ef; color: #166534; }
@media (max-width: 600px) {
  .desglose-deuda { grid-template-columns: 1fr; }
  .panel { padding: 16px; }
  .campos { grid-template-columns: 1fr; gap: 0; }
  .resumen { grid-template-columns: 1fr; }
  .resumen > div { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .resumen .monto-inicial { flex-wrap: wrap; }
  .monto-inicial .editar-monto { flex-basis: 100%; margin-top: 0; }
  .resumen strong { font-size: 18px; margin: 0; }
  .encabezado { flex-wrap: wrap; }
  .detalle-abono span { display: block; margin-top: 4px; }
}
</style>
