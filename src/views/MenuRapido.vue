<template>
  <div class="menu-rapido">
    <header class="menu-rapido-header">
      <h1>Rey Pez</h1>
      <p class="menu-rapido-fecha">{{ fechaHoy }}</p>
    </header>

    <div class="menu-rapido-lista">
      <!-- Pedidos -->
      <div class="menu-fila">
        <router-link to="/procesos/pedidos" class="menu-boton">
          <i class="fas fa-clipboard-list"></i>
          <span>Pedidos</span>
        </router-link>
        <router-link to="/procesos/pedidos/limpio" class="menu-atajo">
          <span>Limpio de hoy</span>
        </router-link>
      </div>

      <!-- Embarques -->
      <div class="menu-fila">
        <router-link to="/embarques-menu" class="menu-boton">
          <i class="fas fa-truck"></i>
          <span>Embarques</span>
        </router-link>
        <button class="menu-atajo" :disabled="embarqueHoyEstado === 'cargando'" @click="irEmbarqueHoy">
          <span>Embarque de hoy</span>
          <small v-if="embarqueHoyEstado === 'existe'">Hoy sí hay embarque</small>
          <small v-else-if="embarqueHoyEstado === 'no-existe'">Hoy no hay embarque</small>
          <small v-else-if="embarqueHoyEstado === 'sin-conexion'">Sin conexión</small>
        </button>
      </div>

      <!-- Sacadas -->
      <div class="menu-fila">
        <router-link to="/sacadas" class="menu-boton">
          <i class="fas fa-box-open"></i>
          <span>Sacadas</span>
        </router-link>
        <router-link to="/sacadas/new" class="menu-atajo">
          <span>Sacadas de hoy</span>
        </router-link>
      </div>

      <!-- Cuentas -->
      <div class="menu-fila">
        <router-link to="/cuentas-mexico" class="menu-boton menu-boton-solo">
          <i class="fas fa-wallet"></i>
          <span>Cuentas</span>
        </router-link>
      </div>

      <!-- Existencias -->
      <div class="menu-fila">
        <router-link to="/existencias" class="menu-boton menu-boton-solo">
          <i class="fas fa-boxes"></i>
          <span>Existencias</span>
        </router-link>
      </div>

      <!-- Existencias crudos -->
      <div class="menu-fila">
        <router-link to="/existencias-crudos" class="menu-boton menu-boton-solo">
          <i class="fas fa-box"></i>
          <span>Existencias crudos</span>
        </router-link>
      </div>

      <!-- Pesadas -->
      <div class="menu-fila">
        <router-link to="/pesadas" class="menu-boton menu-boton-solo">
          <i class="fas fa-balance-scale"></i>
          <span>Pesadas</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import moment from 'moment';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { obtenerFechaActualISO, normalizarFechaISO } from '@/utils/dateUtils';

export default {
  name: 'MenuRapido',
  data() {
    return {
      embarqueHoyId: null,
      // cargando | existe | no-existe | sin-conexion
      embarqueHoyEstado: 'cargando'
    };
  },
  computed: {
    fechaHoy() {
      return moment().format('dddd, D [de] MMMM [de] YYYY');
    }
  },
  created() {
    // Este menú es solo para la APK de Android: en web/escritorio se vuelve al inicio.
    if (process.env.VUE_APP_TARGET !== 'android') {
      this.$router.replace('/');
      return;
    }
    this.buscarEmbarqueHoy();
  },
  methods: {
    async buscarEmbarqueHoy() {
      try {
        const hoyISO = obtenerFechaActualISO();
        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const q = query(embarquesRef, orderBy('fecha', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        const embarqueHoy = snapshot.docs.find((docSnap) => {
          const data = docSnap.data();
          let fechaEmbarque = null;
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fechaEmbarque = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fechaEmbarque = data.fecha;
          } else if (typeof data.fecha === 'string') {
            const parsed = new Date(data.fecha);
            fechaEmbarque = Number.isNaN(parsed.getTime()) ? null : parsed;
          }
          if (!fechaEmbarque) return false;
          return normalizarFechaISO(fechaEmbarque) === hoyISO;
        });
        if (embarqueHoy) {
          this.embarqueHoyId = embarqueHoy.id;
          this.embarqueHoyEstado = 'existe';
        } else {
          this.embarqueHoyEstado = 'no-existe';
        }
      } catch (error) {
        // Sin internet (o error de lectura): el botón lleva a la lista, que sí trabaja offline.
        console.warn('[MenuRapido] No se pudo buscar el embarque de hoy:', error);
        this.embarqueHoyEstado = 'sin-conexion';
      }
    },
    irEmbarqueHoy() {
      if (this.embarqueHoyId) {
        this.$router.push(`/embarques/${this.embarqueHoyId}`);
      } else {
        this.$router.push('/embarques');
      }
    }
  }
};
</script>

<style scoped>
.menu-rapido {
  min-height: 100vh;
  background: #0d1728;
  padding: 28px 18px 40px;
  color: #fff;
}

.menu-rapido-header {
  text-align: center;
  margin-bottom: 26px;
}

.menu-rapido-header h1 {
  font-size: 30px;
  font-weight: 800;
  margin: 0 0 4px;
  letter-spacing: 0.5px;
}

.menu-rapido-fecha {
  margin: 0;
  color: #9fb3c8;
  font-size: 15px;
  text-transform: capitalize;
}

.menu-rapido-lista {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 560px;
  margin: 0 auto;
}

.menu-fila {
  display: flex;
  gap: 10px;
}

.menu-boton {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 14px 16px;
  background: #16283f;
  border: 1px solid #2a415c;
  border-radius: 14px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  text-decoration: none;
}

.menu-boton i {
  font-size: 22px;
  color: #f97316;
}

.menu-boton:active {
  background: #1e3550;
}

.menu-atajo {
  flex: 0 0 42%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 64px;
  padding: 10px 8px;
  background: #f97316;
  border: 1px solid #f97316;
  border-radius: 14px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
}

.menu-atajo small {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.9;
}

.menu-atajo:active {
  background: #e0650f;
}

.menu-atajo:disabled {
  opacity: 0.7;
}
</style>
