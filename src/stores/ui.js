import { defineStore } from 'pinia';

export const useUIStore = defineStore('ui', {
  state: () => ({
    activeModal: null,
    modalData: null,
    notifications: [],
    navbarVisibleEnEmbarque: false,
  }),

  getters: {
    isModalOpen: (state) => (name) => state.activeModal === name,
  },

  actions: {
    openModal(name, data = null) {
      this.activeModal = name;
      this.modalData = data;
    },

    closeModal() {
      this.activeModal = null;
      this.modalData = null;
    },

    setNavbarVisibleEnEmbarque(visible) {
      this.navbarVisibleEnEmbarque = Boolean(visible);
    },

    toggleNavbarEnEmbarque() {
      this.navbarVisibleEnEmbarque = !this.navbarVisibleEnEmbarque;
    },

    notify(message, type = 'info', duration = 3000) {
      const id = Date.now();
      this.notifications.push({ id, message, type });
      setTimeout(() => {
        this.notifications = this.notifications.filter((n) => n.id !== id);
      }, duration);
    },
  },
});
