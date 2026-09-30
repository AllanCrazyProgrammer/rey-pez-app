// El mismo editor se utiliza en web y Android. Proteger los movimientos de
// Android al salir por las pestañas, el botón Atrás o el cierre de sesión.
export default {
  data: () => ({ inventarioGuardado: null }),
  watch: {
    isLoaded(loaded) { if (loaded) this.marcarInventarioGuardado(); }
  },
  methods: {
    inventarioActual() {
      return JSON.stringify({ fecha: this.selectedDate, entradas: this.entradas, salidas: this.salidas,
        listaMedidasPedido: this.listaMedidasPedido, salidasClientesChecklist: this.salidasClientesChecklist,
        salidasMaquilasChecklist: this.salidasMaquilasChecklist });
    },
    marcarInventarioGuardado() { if (this.soloInventario) this.inventarioGuardado = this.inventarioActual(); }
  },
  beforeRouteLeave(to, from, next) {
    if (!this.soloInventario) return next();
    const pendiente = this.inventarioGuardado !== null && this.inventarioActual() !== this.inventarioGuardado;
    if (this.guardando && pendiente) return next(false);
    if (pendiente && !window.confirm('Hay movimientos sin guardar. ¿Salir y descartar los cambios?')) return next(false);
    next();
  }
};
