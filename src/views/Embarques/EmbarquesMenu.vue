<template>
  <div class="embarques-menu">
    <div class="header-section">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-ship">🚢</i>
          Menú de Embarques
        </h1>
        <p class="subtitle">Gestiona todos tus embarques de manera eficiente</p>
      </div>
    </div>
    
    <div class="menu-options">
      <button @click="nuevoEmbarque" class="btn-action btn-nuevo-embarque">
        <i class="icon">➕</i>
        Nuevo Embarque
      </button>
      <button @click="verCuentaFletes" class="btn-action btn-cuenta-fletes">
        <i class="icon">📊</i>
        Cuenta de Fletes
      </button>
      <!-- BOTÓN DE EMERGENCIA PARA RECUPERACIÓN -->
      <button @click="recuperacionEmergencia" class="btn-action btn-emergencia">
        <i class="icon">🆘</i>
        🚨 Recuperar Datos Perdidos
      </button>
    </div>
    <ListaEmbarques />
  </div>
</template>

<script>
import ListaEmbarques from './ListaEmbarques.vue'

export default {
  name: 'EmbarquesMenu',
  components: {
    ListaEmbarques
  },
  data() {
    return {
    }
  },
  methods: {
    nuevoEmbarque() {
      this.$router.push({ name: 'NuevoEmbarque', params: { id: 'nuevo' } });
    },
    verCuentaFletes() {
      this.$router.push({ name: 'CuentaFletes' });
    },
    recuperacionEmergencia() {
      this.$router.push('/embarques/recuperacion-emergencia');
    }
  }
}
</script>

<style scoped>
.embarques-menu {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  color: white;
}

/* Header moderno */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.header-content {
  text-align: center;
  width: 100%;
}

.main-title {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  background: linear-gradient(45deg, #fff, #f0f0f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.icon-ship {
  font-size: 3.5rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.subtitle {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 300;
}

/* Opciones del menú */
.menu-options {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

/* Botones modernos */
.btn-action {
  padding: 18px 30px;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  min-width: 180px;
  justify-content: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.btn-nuevo-embarque {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.btn-nuevo-embarque:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(76, 175, 80, 0.4);
  background: linear-gradient(45deg, #45a049, #3d8b40);
}



.btn-cuenta-fletes {
  background: linear-gradient(45deg, #FF9800, #F57C00);
  color: white;
}

.btn-cuenta-fletes:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(255, 152, 0, 0.4);
  background: linear-gradient(45deg, #F57C00, #E65100);
}

.btn-emergencia {
  background: linear-gradient(45deg, #ff4757, #ff3742);
  color: white;
  border: 2px solid #ff6b7a;
  animation: pulse-emergency 2s infinite;
}

.btn-emergencia:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(255, 71, 87, 0.5);
  background: linear-gradient(45deg, #ff3742, #ff2837);
  animation: none;
}

@keyframes pulse-emergency {
  0% { box-shadow: 0 8px 25px rgba(255, 71, 87, 0.3); }
  50% { box-shadow: 0 8px 25px rgba(255, 71, 87, 0.6); }
  100% { box-shadow: 0 8px 25px rgba(255, 71, 87, 0.3); }
}

.icon {
  font-size: 1.3rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

/* Responsive */
@media (max-width: 768px) {
  .embarques-menu {
    padding: 20px;
  }

  .header-section {
    padding: 20px;
    margin-bottom: 30px;
  }

  .main-title {
    font-size: 2.2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .menu-options {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .btn-action {
    width: 100%;
    max-width: 300px;
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .embarques-menu {
    padding: 15px;
  }

  .header-section {
    padding: 15px;
  }

  .main-title {
    font-size: 1.8rem;
    flex-direction: column;
    gap: 10px;
  }

  .icon-ship {
    font-size: 2.5rem;
  }

  .btn-action {
    padding: 15px 20px;
    font-size: 1rem;
  }
}
</style>
