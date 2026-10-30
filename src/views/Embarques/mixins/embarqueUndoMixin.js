import { HistorialEmbarque } from '@/utils/embarqueHistorial';
import { identificarEstado } from '@/utils/embarqueColaboracion';

export const embarqueUndoMixin = {
  data() {
    return {
      undoStack: [],
      redoStack: [],
      mensajeHistorial: '',
    };
  },

  methods: {
    informarConflictoEdicion(mensaje) {
      this.mensajeHistorial = mensaje;
    },
    estadoHistorial(embarque = this.embarque) {
      return identificarEstado({ ...embarque, clienteCrudos: this.clienteCrudos || {} }, this.$set);
    },
    initUndo(initialState) {
      this.mensajeHistorial = '';
      this._historialEmbarque = new HistorialEmbarque(this.estadoHistorial(initialState));
      this.actualizarPilasHistorial();
    },
    actualizarPilasHistorial() {
      this.undoStack = this._historialEmbarque.deshacer.slice();
      this.redoStack = this._historialEmbarque.rehacer.slice();
    },
    registrarEdicionHistorial(estado, remoto = false) {
      if (!this._historialEmbarque) return this.initUndo(estado);
      if (remoto) this._historialEmbarque.recibirRemoto(this.estadoHistorial(estado));
      else this._historialEmbarque.registrar(this.estadoHistorial(estado));
      this.actualizarPilasHistorial();
    },
    aplicarHistorial(direccion) {
      if (!this._historialEmbarque || this._aplicandoRemoto || this._inicializandoEmbarque || this.embarqueBloqueado) return;
      this.registrarEdicionHistorial(this.embarque);
      this.mensajeHistorial = '';
      const resultado = this._historialEmbarque.aplicar(this.estadoHistorial(), direccion);
      this.actualizarPilasHistorial();
      if (resultado.omitidos) this.informarConflictoEdicion('Algunos valores cambiaron desde tu edición y se conservaron.');
      if (!resultado.aplicados) return;
      const antes = new Set(this.embarque.productos.map(p => p.id));
      const despues = new Set(resultado.estado.productos.map(p => p.id));
      const lapidas = { ...(this._productosEliminadosDoc || {}) };
      antes.forEach(id => { if (!despues.has(id)) lapidas[id] = Date.now(); });
      despues.forEach(id => { if (!antes.has(id)) lapidas[id] = null; });
      this._productosEliminadosDoc = lapidas;
      this.productosEliminadosLocalmente = new Set(Object.keys(lapidas).filter(id => lapidas[id]));
      this.productosNuevosPendientes = new Map();
      const { clienteCrudos, ...embarque } = resultado.estado;
      this.embarque = embarque;
      this.clienteCrudos = clienteCrudos;
      this.guardarCambiosEnTiempoReal();
    },
    undo() { this.aplicarHistorial('deshacer'); },
    redo() { this.aplicarHistorial('rehacer'); },
  },
};
