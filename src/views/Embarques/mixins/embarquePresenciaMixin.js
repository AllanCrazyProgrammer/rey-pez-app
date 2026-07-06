import { ref, onValue, onDisconnect, set, remove } from 'firebase/database';
import { rtdb } from '@/firebase';

export const embarquePresenciaMixin = {
  data() {
    return {
      usuariosActivos: [],
      // Usuarios editando ESTE embarque en este momento (sin incluirme)
      editoresEmbarque: [],
    };
  },

  beforeDestroy() {
    if (this.unsubscribeUsuarios) {
      this.unsubscribeUsuarios();
    }
    this.detenerPresenciaEmbarque();
  },

  methods: {
    /**
     * Presencia por embarque: registra a este usuario como editor del
     * embarque en Realtime Database y escucha quién más lo está editando,
     * para mostrarlo en la interfaz. Se limpia al desconectar (onDisconnect),
     * al salir de la vista o al cambiar de embarque.
     */
    iniciarPresenciaEmbarque(embarqueId) {
      this.detenerPresenciaEmbarque();

      const userId = this.authStore?.userId;
      const username = this.authStore?.user?.username || 'Usuario';
      if (!embarqueId || !userId) return;

      try {
        const propioRef = ref(rtdb, `presenciaEmbarques/${embarqueId}/${userId}`);
        this._presenciaEmbarquePropioRef = propioRef;

        const registrar = () => set(propioRef, {
          username,
          conectadoEn: Date.now()
        }).catch(() => {});

        registrar();
        onDisconnect(propioRef).remove().catch(() => {});
        // Refresco periódico: permite descartar registros huérfanos si algún
        // onDisconnect no llegó a ejecutarse (cierres abruptos).
        this._presenciaEmbarqueHeartbeat = setInterval(registrar, 60000);

        const salaRef = ref(rtdb, `presenciaEmbarques/${embarqueId}`);
        this._presenciaEmbarqueUnsub = onValue(salaRef, (snapshot) => {
          const valores = snapshot.val() || {};
          const ahora = Date.now();
          this.editoresEmbarque = Object.entries(valores)
            .filter(([uid, info]) =>
              uid !== userId &&
              info &&
              (ahora - (Number(info.conectadoEn) || 0)) < 5 * 60 * 1000
            )
            .map(([, info]) => info.username || 'Alguien');
        }, (error) => {
          console.warn('[presenciaEmbarque] No se pudo escuchar la presencia:', error);
        });
      } catch (error) {
        console.warn('[presenciaEmbarque] Presencia no disponible:', error);
      }
    },

    detenerPresenciaEmbarque() {
      if (this._presenciaEmbarqueHeartbeat) {
        clearInterval(this._presenciaEmbarqueHeartbeat);
        this._presenciaEmbarqueHeartbeat = null;
      }
      if (this._presenciaEmbarqueUnsub) {
        try { this._presenciaEmbarqueUnsub(); } catch (_) { /* noop */ }
        this._presenciaEmbarqueUnsub = null;
      }
      if (this._presenciaEmbarquePropioRef) {
        try {
          onDisconnect(this._presenciaEmbarquePropioRef).cancel().catch(() => {});
          remove(this._presenciaEmbarquePropioRef).catch(() => {});
        } catch (_) { /* noop */ }
        this._presenciaEmbarquePropioRef = null;
      }
      this.editoresEmbarque = [];
    },

    async iniciarPresenciaUsuario() {
      try {
        if (!this.authStore.isLoggedIn || !this.authStore.user) return;
        const userStatusRef = ref(rtdb, `status/${this.authStore.userId}`);
        await onDisconnect(userStatusRef).remove();
        await set(userStatusRef, {
          username: this.authStore.user.username,
          status: 'online',
          lastSeen: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error al iniciar presencia:', error.message, error.stack);
      }
    },

    async escucharUsuariosActivos() {
      try {
        const statusRef = ref(rtdb, 'status');

        if (this.authStore.isLoggedIn && this.authStore.user) {
          const userStatusRef = ref(rtdb, `status/${this.authStore.userId}`);
          try {
            await set(userStatusRef, {
              username: this.authStore.user.username,
              status: 'online',
              lastSeen: new Date().toISOString(),
            });
          } catch (error) {
            console.error('Error al actualizar estado del usuario:', error);
          }
        }

        this.unsubscribeUsuarios = onValue(
          statusRef,
          (snapshot) => {
            const usuarios = [];
            snapshot.forEach((childSnapshot) => {
              const usuario = childSnapshot.val();
              if (usuario && usuario.username) {
                usuarios.push({
                  userId: childSnapshot.key,
                  username: usuario.username,
                  status: usuario.status || 'online',
                  lastSeen: usuario.lastSeen,
                });
              }
            });
            this.usuariosActivos = usuarios;
          },
          (error) => {
            console.error('Error al escuchar usuarios activos:', error);
          }
        );
      } catch (error) {
        console.error('Error al iniciar escucha de usuarios:', error);
      }
    },
  },
};
