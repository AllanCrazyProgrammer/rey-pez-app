import { ref, onValue, onDisconnect, set } from 'firebase/database';
import { rtdb } from '@/firebase';

export const embarquePresenciaMixin = {
  data() {
    return {
      usuariosActivos: [],
    };
  },

  beforeDestroy() {
    if (this.unsubscribeUsuarios) {
      this.unsubscribeUsuarios();
    }
  },

  methods: {
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
