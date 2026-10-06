<template>
  <section class="rp-editor">
    <router-link :to="rutaHistorial" class="rp-back"><MobileIcon name="back" />Movimientos de {{ esLimpio ? 'limpios' : 'crudos' }}</router-link>
    <div class="rp-page-heading"><p class="rp-eyebrow">{{ esLimpio ? 'LIMPIOS · KG Y CAJAS' : 'CRUDOS · SOLO KG' }}</p><h1>Registrar movimiento</h1></div>
    <p v-if="!isLoaded" class="rp-message" role="status">Cargando el registro…</p>
    <template v-else>
      <label class="rp-date-field">Fecha del registro<input type="date" v-model="selectedDate" @change="updateCurrentDate" :disabled="guardando" /></label>
      <p v-if="fechaFutura" class="rp-message rp-future-date" role="status"><MobileIcon name="calendar" /><span>Registrando para el {{ mostrarFecha(selectedDate) }}.</span></p>
      <div class="rp-segment" role="tablist" aria-label="Tipo de movimiento">
        <button role="tab" :aria-selected="tab === 'entrada'" :class="{ selected: tab === 'entrada' }" @click="tab = 'entrada'"><MobileIcon name="in" />Entrada <span>{{ entradas.length }}</span></button>
        <button role="tab" :aria-selected="tab === 'salida'" :class="{ selected: tab === 'salida' }" @click="tab = 'salida'"><MobileIcon name="out" />Salida <span>{{ salidas.length }}</span></button>
        <button v-if="esLimpio" role="tab" :aria-selected="tab === 'resumen'" :class="{ selected: tab === 'resumen' }" @click="tab = 'resumen'"><MobileIcon name="summary" />Resumen</button>
      </div>
      <section v-if="esLimpio && tab === 'resumen'" class="rp-day-summary" aria-label="Resumen de salidas del día">
        <div class="rp-summary-heading"><p class="rp-eyebrow">{{ mostrarFecha(selectedDate, true) }}</p><h2>Salidas por medida</h2><p>Proveedores y maquilas en apartados separados.</p></div>
        <div class="rp-stock-hero"><span>Total de salidas del día</span><strong>{{ formatNumber(totalResumen, 1) }} <small>kg</small></strong><div><span>{{ formatNumber(totalResumen / 20, 2) }} cajas de 20 kg</span><span>{{ resumenSalidas.length }} {{ resumenSalidas.length === 1 ? 'medida' : 'medidas' }}</span></div></div>
        <p v-if="pendientes" class="rp-summary-note">Incluye los cambios sin guardar de este registro.</p>
        <div v-if="resumenSalidas.length">
          <section v-for="seccion in seccionesResumen" :key="seccion.key" class="rp-summary-section" :class="{ 'rp-maquila-section': seccion.tipo === 'maquila' }" :aria-label="seccion.tipo === 'maquila' ? 'Salidas de ' + seccion.nombre : 'Salidas de proveedores'">
            <h2 v-if="seccion === primeraMaquilaResumen" class="rp-origin-title">Maquilas</h2>
            <div class="rp-origin-heading"><h2 v-if="seccion.tipo === 'proveedor'">Proveedores</h2><h3 v-else>{{ seccion.nombre }}</h3><div class="rp-origin-total"><strong>{{ formatNumber(seccion.kilos, 1) }} kg</strong><span>{{ formatNumber(seccion.kilos / 20, 2) }} cajas</span></div></div>
            <ul class="rp-summary-list">
              <li v-for="grupo in seccion.grupos" :key="grupo.key" class="rp-card rp-summary-item">
                <div class="rp-summary-row"><div><strong>{{ grupo.medida }}</strong><span>{{ grupo.items.length }} {{ grupo.items.length === 1 ? 'salida' : 'salidas' }}</span></div><div class="rp-stock-amount"><strong>{{ formatNumber(grupo.kilos, 1) }}</strong><span>kilos retirados</span><small>{{ formatNumber(grupo.kilos / 20, 2) }} cajas</small></div></div>
                <ul v-if="seccion.tipo === 'proveedor'" class="rp-summary-origins"><li v-for="origen in agruparPorProveedor(grupo.items)" :key="origen.key"><span>Proveedor: <strong>{{ origen.nombre }}</strong></span><span>{{ formatNumber(origen.kilos, 1) }} kg<small>{{ formatNumber(origen.kilos / 20, 2) }} cajas</small></span></li></ul>
              </li>
            </ul>
          </section>
        </div>
        <div v-else class="rp-empty"><MobileIcon name="out" /><h2>Sin salidas este día</h2><p>Las salidas que agregues aparecerán aquí, agrupadas por medida.</p></div>
      </section>
      <template v-else>
      <form class="rp-capture rp-card" @submit.prevent="agregar" :aria-label="tab === 'entrada' ? 'Capturar entrada' : 'Capturar salida'">
        <h2><span class="rp-type-icon" :class="tab"><MobileIcon :name="tab === 'entrada' ? 'in' : 'out'" /></span>{{ tab === 'entrada' ? 'Agregar al inventario' : 'Retirar del inventario' }}</h2>
        <label v-if="esLimpio">Origen<select aria-label="Origen" v-model="modelo.tipo" @change="tab === 'entrada' ? resetEntradaSelections() : resetSalidaSelections()"><option value="proveedor">Proveedor</option><option value="maquila">Maquila</option></select></label>
        <label>{{ esLimpio && modelo.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}<select :aria-label="esLimpio && modelo.tipo === 'maquila' ? 'Maquila' : 'Proveedor'" v-model="modelo.proveedor" @change="cambiarProveedor"><option value="" disabled>Selecciona uno</option><option v-for="p in opcionesProveedor" :key="p" :value="p">{{ p }}</option><option v-if="!esLimpio && tab === 'entrada'" value="__nuevo__">+ Nuevo proveedor</option></select></label>
        <label v-if="!esLimpio && modelo.proveedor === '__nuevo__'">Nombre del proveedor<input v-model="nuevoProveedorEntrada" autocomplete="off" /></label>
        <label v-if="!esLimpio && tab === 'entrada' && modelo.proveedor === '__nuevo__'">Producto<input v-model="modelo.producto" autocomplete="off" /></label>
        <label v-else>{{ esLimpio ? 'Medida' : 'Producto' }}<select :aria-label="esLimpio ? 'Medida' : 'Producto'" v-model="modelo[campoProducto]" @change="cambiarProducto" :disabled="!modelo.proveedor"><option value="" disabled>{{ !modelo.proveedor ? 'Primero elige el proveedor' : 'Selecciona uno' }}</option><option v-for="m in opcionesProducto" :key="m.valor" :value="m.valor">{{ m.nombre }}</option><option v-if="!esLimpio && tab === 'entrada'" value="__custom__">+ Otro producto</option></select></label>
        <label v-if="!esLimpio && modelo.producto === '__custom__'">Nombre del producto<input v-model="customProducto" autocomplete="off" /></label>
        <label>Cuarto frío<select aria-label="Cuarto frío" v-model="modelo.cuartoFrio" @change="!esLimpio && tab === 'salida' && actualizarKilosDisponiblesSeleccionados()"><option v-if="tab === 'entrada'" value="">Sin especificar</option><option v-else :value="esLimpio ? '' : 'Todos los cuartos'">{{ esLimpio ? 'Sin especificar' : 'Todos los cuartos' }}</option><option v-for="c in opcionesCuarto" :key="c" :value="c">{{ c === 's/c' ? 'Sin cuarto' : c }}</option></select></label>
        <div v-if="tab === 'salida' && modelo[campoProducto]" class="rp-available"><MobileIcon name="box" /><span>Disponible <strong>{{ formatNumber(disponible, 1) }} kg</strong></span></div>
        <div class="rp-quantity-grid" :class="{ single: !esLimpio }">
          <label>Kilos<input aria-label="Kilos" ref="cantidad" :value="modelo.kilos == null ? '' : modelo.kilos" type="number" inputmode="decimal" min="0" step="0.1" placeholder="0.0" @input="capturarKilos($event.target.value)" /></label>
          <label v-if="esLimpio">Cajas <span class="rp-field-hint">20 kg c/u</span><input aria-label="Cajas" :value="modelo.cajas == null ? '' : modelo.cajas" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" @input="updateCantidadDesdeCajas(tab === 'entrada' ? 'newEntrada' : 'newSalida', $event.target.value)" /></label>
        </div>
        <label v-if="!esLimpio && tab === 'entrada'">Piezas (opcional)<input aria-label="Piezas" v-model="modelo.piezas" type="text" placeholder="Piezas" /></label>
        <details v-if="tab === 'entrada'" class="rp-optional"><summary>Precio opcional</summary><label>Precio por kilo<input v-model.number="modelo.precio" type="number" inputmode="decimal" min="0" step="0.01" placeholder="$0.00" /></label></details>
        <p v-if="tab === 'salida' && Number(modelo.kilos) > disponible" class="rp-inline-error" role="alert">La cantidad supera los kilos disponibles.</p>
        <button class="rp-button rp-button-primary" type="submit" :disabled="!puedeAgregar || guardando"><MobileIcon name="plus" />{{ tab === 'entrada' ? 'Agregar entrada' : 'Agregar salida' }}</button>
        <p class="rp-form-note">Se agregará al registro. Guarda los cambios al terminar.</p>
      </form>
      <div class="rp-list-heading"><h2>{{ tab === 'entrada' ? 'Entradas del día' : 'Salidas del día' }}</h2><strong>{{ formatNumber(tab === 'entrada' ? totalEntradas : totalSalidas, 1) }} kg</strong></div>
      <p v-if="tab === 'salida' && renglones.length" class="rp-meta">Más recientes primero en cada apartado.</p>
      <p v-if="!renglones.length" class="rp-empty-small">Todavía no hay {{ tab === 'entrada' ? 'entradas' : 'salidas' }} para este día.</p>
      <section v-for="seccion in seccionesRenglones" :key="seccion.key" class="rp-movement-section" :class="{ 'rp-maquila-section': esLimpio && seccion.tipo === 'maquila' }" :aria-label="esLimpio ? (seccion.tipo === 'maquila' ? 'Movimientos de ' + seccion.nombre : 'Movimientos de proveedores') : 'Movimientos del día'">
      <div v-if="esLimpio" class="rp-origin-heading"><h2>{{ seccion.tipo === 'maquila' ? 'Maquila: ' + seccion.nombre : 'Proveedores' }}</h2><strong>{{ formatNumber(seccion.kilos, 1) }} kg</strong></div>
      <ul class="rp-movement-items">
        <li v-for="item in seccion.items" :key="item.indice" class="rp-card rp-item">
          <div class="rp-item-main"><strong>{{ esLimpio ? item.medida : item.producto }}</strong><span>{{ esLimpio && seccion.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}: {{ item.proveedor }}</span><span class="rp-meta">{{ item.cuartoFrio || 'Sin cuarto' }}<template v-if="item.precio"> · ${{ formatNumber(item.precio) }}/kg</template></span></div>
          <span v-if="!esLimpio && item.piezas" class="rp-meta">Pcz: {{ item.piezas }}</span>
          <div class="rp-item-amount"><strong>{{ formatNumber(item.kilos, 1) }} <small>kg</small></strong><span v-if="esLimpio">{{ formatNumber(item.kilos / 20, 2) }} cajas</span></div>
          <div class="rp-item-actions"><button v-if="tab === 'entrada'" type="button" @click="editarEntrada(item.indice)" :aria-label="'Editar entrada de ' + (item.medida || item.producto)"><MobileIcon name="edit" /></button><button type="button" @click="quitar(item.indice)" :aria-label="'Eliminar ' + tab + ' de ' + (item.medida || item.producto)"><MobileIcon name="trash" /></button></div>
        </li>
      </ul>
      </section>
      </template>
      <div class="rp-save-bar"><div><strong>{{ pendientes ? 'Cambios sin guardar' : 'Registro al día' }}</strong><span>{{ mostrarFecha(selectedDate, true) }}</span></div><button class="rp-button rp-button-primary rp-save-button" @click="saveReport" :disabled="guardando || !pendientes"><MobileIcon name="check" />{{ guardando ? 'Guardando…' : 'Guardar cambios' }}</button></div>
    </template>
    <div v-if="editandoEntrada" class="rp-overlay" @click.self="cancelarEdicionEntrada">
      <section class="rp-dialog" role="dialog" aria-modal="true" aria-labelledby="rp-edit-title">
        <div class="rp-dialog-heading"><h2 id="rp-edit-title">Editar entrada</h2><button @click="cancelarEdicionEntrada" aria-label="Cerrar edición"><MobileIcon name="close" /></button></div>
        <div class="rp-quantity-grid" :class="{ single: !esLimpio }"><label>Kilos<input :value="entradaEditData.kilos" type="number" inputmode="decimal" min="0" step="0.1" @input="editarKilos($event.target.value)" /></label><label v-if="esLimpio">Cajas<input :value="entradaEditData.cajas" type="number" inputmode="decimal" min="0" step="0.01" @input="updateCantidadDesdeCajas('entradaEditData', $event.target.value)" /></label></div>
        <label v-if="!esLimpio">Piezas (opcional)<input v-model="entradaEditData.piezas" type="text" placeholder="Piezas" /></label>
        <label>Cuarto frío<select v-model="entradaEditData.cuartoFrio"><option value="">Sin especificar</option><option v-for="c in cuartosBase" :key="c" :value="c">{{ c }}</option></select></label>
        <label>Precio por kilo (opcional)<input v-model.number="entradaEditData.precio" type="number" inputmode="decimal" min="0" step="0.01" /></label>
        <button class="rp-button rp-button-primary" @click="guardarEdicionEntrada">Aplicar cambios</button><button class="rp-button rp-button-secondary" @click="cancelarEdicionEntrada">Cancelar</button>
      </section>
    </div>
  </section>
</template>
<script>
import MobileIcon from './MobileIcon.vue';
import { fechaRegistro, mostrarFecha } from './fechas';
import { agruparPorMedida, agruparPorProveedor, separarLimpios } from './medidas';
export default {
  components: { MobileIcon },
  data() { return { tab: this.$route.query.tipo === 'entrada' ? 'entrada' : 'salida', cuartosBase: ['Cuarto 1', 'Cuarto 2', 'Cuarto 3', 'Cuarto 4', 'Cuarto 5', 'Aaron'] }; },
  computed: {
    fechaFutura() { return this.esLimpio && fechaRegistro(this.selectedDate) > fechaRegistro(new Date()); },
    rutaHistorial() { return this.esLimpio ? '/sacadas' : '/movimientos-crudos'; },
    resumenSalidas() { return this.esLimpio ? agruparPorMedida(this.salidas) : []; },
    seccionesResumen() { return this.esLimpio ? separarLimpios(this.salidas, this.proveedores) : []; },
    primeraMaquilaResumen() { return this.seccionesResumen.find(s => s.tipo === 'maquila'); },
    totalResumen() { return this.resumenSalidas.reduce((total, grupo) => total + grupo.kilos, 0); },
    modelo() { return this.tab === 'entrada' ? this.newEntrada : this.newSalida; },
    campoProducto() { return this.esLimpio ? 'medida' : 'producto'; },
    renglones() { return this.tab === 'entrada' ? this.entradas : this.salidas; },
    seccionesRenglones() {
      const items = this.renglones.map((item, indice) => ({ ...item, indice }));
      const secciones = this.esLimpio ? separarLimpios(items, this.proveedores) : [{ key: 'crudos', items }];
      if (this.tab !== 'salida') return secciones;
      // El índice conserva el orden de captura y la referencia original al
      // eliminar. Ordenar copias evita cambiar los movimientos guardados.
      return secciones.map(seccion => ({ ...seccion, items: [...seccion.items].reverse() }))
        .sort((a, b) => (b.items[0]?.indice ?? -1) - (a.items[0]?.indice ?? -1));
    },
    pendientes() { return this.inventarioGuardado !== null && this.inventarioActual() !== this.inventarioGuardado; },
    disponible() { return Number(this.esLimpio ? this.kilosDisponibles : this.kilosDisponiblesSeleccionados) || 0; },
    opcionesProveedor() {
      if (this.esLimpio) return (this.tab === 'entrada' ? this.filteredProveedoresEntrada : this.filteredProveedoresSalida).map(p => p.nombre);
      return this.tab === 'entrada' ? this.proveedoresCrudos.map(p => p.nombre) : this.proveedoresDisponibles;
    },
    opcionesProducto() {
      if (this.esLimpio) return (this.tab === 'entrada' ? this.filteredMedidasEntrada : this.filteredMedidasSalida).map(m => ({ valor: m.nombre, nombre: m.nombre }));
      return (this.tab === 'entrada' ? this.medidasDelProveedorEntrada : this.productosDelProveedorSeleccionado).map(m => ({ valor: m.nombre, nombre: this.tab === 'salida' ? `${m.nombre} · ${this.formatNumber(m.kilosDisponibles, 1)} kg` : m.nombre }));
    },
    opcionesCuarto() {
      if (this.tab === 'entrada') return this.cuartosBase;
      if (this.esLimpio) return this.cuartosDisponiblesSalida;
      const producto = this.productosDelProveedorSeleccionado.find(p => p.nombre === this.newSalida.producto);
      return producto ? (Array.isArray(producto.cuartos) ? producto.cuartos.map(c => c.nombre) : Object.keys(producto.cuartos || {})) : [];
    },
    puedeAgregar() {
      if (this.tab === 'salida') return this.esLimpio ? this.isSalidaValid && Number(this.modelo.kilos) <= this.disponible : this.isSalidaValida;
      return this.esLimpio ? Boolean(this.modelo.tipo && this.modelo.proveedor && this.modelo.medida && Number(this.modelo.kilos) > 0) : this.isEntradaValida;
    }
  },
  methods: {
    mostrarFecha, agruparPorProveedor,
    cambiarProveedor() { if (!this.esLimpio) this.tab === 'entrada' ? this.resetProductoEntrada() : this.resetProductoSalida(); },
    cambiarProducto() { if (!this.esLimpio && this.tab === 'salida') { const p = this.productosDelProveedorSeleccionado.find(p => p.nombre === this.modelo.producto); if (p) this.seleccionarProductoSalida(p); } },
    capturarKilos(valor) { if (this.esLimpio) this.updateCantidadDesdeKilos(this.tab === 'entrada' ? 'newEntrada' : 'newSalida', valor); else this.modelo.kilos = valor === '' ? null : Number(valor); },
    editarKilos(valor) { if (this.esLimpio) this.updateCantidadDesdeKilos('entradaEditData', valor); else this.entradaEditData.kilos = Number(valor); },
    async agregar() { if (!this.puedeAgregar) return; await (this.tab === 'entrada' ? this.addEntrada() : this.addSalida()); },
    quitar(index) { if (window.confirm('¿Eliminar este movimiento del registro?')) this.tab === 'entrada' ? this.removeEntrada(index) : this.removeSalida(index); },
    despuesDeGuardar() { this.marcarInventarioGuardado(); this.$router.push({ path: this.rutaHistorial, query: { guardado: '1' } }); }
  },
  created() {
    this.$on('guardado', this.despuesDeGuardar);
    if (!this.$route.params.id && this.$route.query.fecha) { this.selectedDate = this.$route.query.fecha; this.updateCurrentDate(); }
  },
  beforeDestroy() { this.$off('guardado', this.despuesDeGuardar); }
};
</script>
