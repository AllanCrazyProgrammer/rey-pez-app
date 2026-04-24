import { defineStore } from 'pinia';
import { embarquesService } from '@/services/embarques.service';

export const useEmbarquesStore = defineStore('embarques', {
  state: () => ({
    activeEmbarqueId: null,
    lista: [],
    cargando: false,
    error: null,
  }),

  getters: {
    activeEmbarque: (state) =>
      state.lista.find(e => e.id === state.activeEmbarqueId) || null,
  },

  actions: {
    setActiveEmbarque(id) {
      this.activeEmbarqueId = id || null;
    },

    clearActiveEmbarque() {
      this.activeEmbarqueId = null;
    },

    async cargarLista() {
      this.cargando = true;
      this.error = null;
      try {
        this.lista = await embarquesService.getAll();
      } catch (err) {
        this.error = err.message || 'Error al cargar embarques';
        console.error('[embarquesStore] Error al cargar lista:', err);
      } finally {
        this.cargando = false;
      }
    },

    async eliminar(id) {
      await embarquesService.delete(id);
      this.lista = this.lista.filter(e => e.id !== id);
      if (this.activeEmbarqueId === id) this.activeEmbarqueId = null;
    },
  },
});
