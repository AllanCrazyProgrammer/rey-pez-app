export const embarqueUndoMixin = {
  data() {
    return {
      undoStack: [],
      redoStack: [],
      isUndoRedo: false,
    };
  },

  methods: {
    initUndo(initialState) {
      this.undoStack = [JSON.stringify(initialState)];
      this.redoStack = [];
    },

    undo() {
      if (this.undoStack.length <= 1) return;
      const current = this.undoStack.pop();
      this.redoStack.push(current);
      const previous = this.undoStack[this.undoStack.length - 1];
      this.isUndoRedo = true;
      this.embarque = JSON.parse(previous);
      this.guardarCambiosEnTiempoReal();
    },

    redo() {
      if (this.redoStack.length === 0) return;
      const state = this.redoStack.pop();
      this.undoStack.push(state);
      this.isUndoRedo = true;
      this.embarque = JSON.parse(state);
      this.guardarCambiosEnTiempoReal();
    },
  },
};
