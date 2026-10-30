import { crearPresenciaEmbarque } from '@/services/EmbarquePresencia';
import { campoDesdeElemento, describirCampo } from '@/utils/embarquePresencia';
import { ref, onValue, onDisconnect, set } from 'firebase/database';
import { rtdb } from '@/firebase';

export const embarquePresenciaMixin = {
  data() {
    return {
      usuariosActivos: [],
      // Usuarios editando ESTE embarque en este momento (sin incluirme)
      editoresEmbarque: [],
      estadoPresencia: 'conectando',
      redDisponible: navigator.onLine,
    };
  },

  computed: {
    colaboradoresVisibles() {
      return this.editoresEmbarque.map(e => ({ ...e, descripcion: describirCampo(e.campo, this.embarque, this.clienteCrudos, id => this.obtenerNombreCliente(id)) }));
    },
  },
  mounted() {
    this._actualizarRedPresencia = () => { this.redDisponible = navigator.onLine; };
    this._restaurarFocoPresencia = () => { if (!document.hidden && !this.embarqueBloqueado) this._sesionPresencia?.enfocar(campoDesdeElemento(document.activeElement)); };
    this._ocultarFocoPresencia = () => this._sesionPresencia?.enfocar(null);
    this._visibilidadPresencia = () => { if (document.hidden) this._ocultarFocoPresencia(); else this._restaurarFocoPresencia(); };
    window.addEventListener('online', this._actualizarRedPresencia);
    window.addEventListener('offline', this._actualizarRedPresencia);
    window.addEventListener('focus', this._restaurarFocoPresencia);
    window.addEventListener('blur', this._ocultarFocoPresencia);
    document.addEventListener('visibilitychange', this._visibilidadPresencia);
  },
  watch: {
    embarqueBloqueado(bloqueado) { if (bloqueado) this._sesionPresencia?.enfocar(null); },
  },
  beforeDestroy() {
    window.removeEventListener('online', this._actualizarRedPresencia);
    window.removeEventListener('offline', this._actualizarRedPresencia);
    window.removeEventListener('focus', this._restaurarFocoPresencia);
    window.removeEventListener('blur', this._ocultarFocoPresencia);
    document.removeEventListener('visibilitychange', this._visibilidadPresencia);
    if (this.unsubscribeUsuarios) {
      this.unsubscribeUsuarios();
    }
    this.detenerPresenciaEmbarque();
  },

  methods: {
    presenciaModal(campo, item) {
      let destino = null;
      if (item && this.embarque.productos.some(p => p.id === item.id)) destino = { tipo: 'producto', productoId: item.id, campo };
      else if (item) {
        for (const grupos of Object.values(this.clienteCrudos || {})) {
          const grupo = grupos.find(g => (g.items || []).some(i => i.id === item.id));
          if (grupo) { destino = { tipo: 'crudo', crudoId: grupo.id, itemId: item.id, campo }; break; }
        }
      }
      return { campo: destino, editores: this.editoresEmbarque };
    },
    iniciarPresenciaEmbarque(embarqueId) {
      this.detenerPresenciaEmbarque();
      const userId = this.authStore?.userId;
      if (!embarqueId || embarqueId === 'nuevo' || !userId) return;
      this.estadoPresencia = 'conectando';
      this._sesionPresencia = crearPresenciaEmbarque({
        db: rtdb, embarqueId, userId, username: this.authStore.user?.username || 'Usuario',
        alCambiar: editores => { this.editoresEmbarque = editores; },
        alEstado: estado => { this.estadoPresencia = estado; },
      });
    },
    detenerPresenciaEmbarque() {
      if (this._sesionPresencia) this._sesionPresencia.detener();
      this._sesionPresencia = null;
      this.editoresEmbarque = [];
      this.estadoPresencia = 'desconectado';
    },
    enfocarCampoColaborativo(evento) {
      if (this.embarqueBloqueado) return;
      this._sesionPresencia?.enfocar(campoDesdeElemento(evento.target));
    },
    escribirCampoColaborativo(evento) {
      if (this.embarqueBloqueado) return;
      this._sesionPresencia?.enfocar(campoDesdeElemento(evento.target), true);
    },
    salirCampoColaborativo(evento) {
      this._sesionPresencia?.enfocar(campoDesdeElemento(evento.relatedTarget));
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
