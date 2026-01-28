<template>
  <div class="page-container">
    <div class="content-wrap">
      <div class="scanlines" aria-hidden="true"></div>
      <div class="bg-grid" aria-hidden="true"></div>
      <div class="cuentas-mexico-container">
        <h1>Cuentas México</h1>
        
        <!-- Botón de Agenda de Transacciones destacado arriba -->
        <div class="agenda-container">
          <div class="card agenda" @click="abrirAgenda()">
            <div class="card-content">
              <i class="fas fa-calendar-alt"></i>
              <h2>Agenda de Transacciones</h2>
            </div>
          </div>
        </div>
        
        <!-- Botón de Precios de Venta -->
        <div class="precios-container">
          <PreciosHistorialModal />
        </div>
        
        <!-- Contenedor de botones de clientes -->
        <div class="botones-container">
          <router-link to="/cuentas-ozuna" class="boton-cuenta">
            <div class="card ozuna">
              <h2>Ozuna</h2>
            </div>
          </router-link>
          <router-link to="/cuentas-catarro" class="boton-cuenta">
            <div class="card catarro">
              <h2>Catarro</h2>
            </div>
          </router-link>
          <router-link to="/cuentas-joselito" class="boton-cuenta">
            <div class="card joselito">
              <h2>Joselito</h2>
            </div>
          </router-link>
          <router-link to="/cuentas-otilio" class="boton-cuenta">
            <div class="card otilio">
              <h2>Otilio</h2>
            </div>
          </router-link>
          <router-link to="/cuentas-veronica" class="boton-cuenta">
            <div class="card veronica">
              <h2>Veronica</h2>
            </div>
          </router-link>
          <!-- Agrega más botones aquí si es necesario -->
        </div>
      </div>
    </div>
    
    <!-- Modal de agenda de transacciones -->
    <TransaccionesAgendaModal
      :mostrar="mostrarModalAgenda"
      :cliente="clienteSeleccionado"
      @cerrar="cerrarModalAgenda"
    />
  </div>
</template>

<script>
import TransaccionesAgendaModal from '@/components/TransaccionesAgendaModal.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';

export default {
  name: 'CuentasMexico',
  components: {
    TransaccionesAgendaModal,
    PreciosHistorialModal
  },
  data() {
    return {
      mostrarModalAgenda: false,
      clienteSeleccionado: 'mexico'
    };
  },
  methods: {
    abrirAgenda() {
      this.mostrarModalAgenda = true;
    },
    cerrarModalAgenda() {
      this.mostrarModalAgenda = false;
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap');

.page-container {
  --matrix-green: #00ff41;
  --matrix-green-glow: #00ff4180;
  --matrix-green-dim: #00ff4130;
  --terminal-bg: #0a0a0a;
  --amber: #ffb000;
  --amber-glow: #ffb00080;
  --client-ozuna: #00c853;
  --client-catarro: #ff5252;
  --client-joselito: #4fc3ff;
  --client-otilio: #ffd54f;
  --client-veronica: #ff8c00;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  background: var(--terminal-bg);
  color: var(--matrix-green);
  font-family: 'VT323', 'Share Tech Mono', monospace;
  position: relative;
  overflow: hidden;
}

.scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.08),
    rgba(0, 0, 0, 0.08) 1px,
    transparent 1px,
    transparent 2px
  );
  mix-blend-mode: soft-light;
}

.bg-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(rgba(0, 255, 65, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 65, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.6;
}

.cuentas-mexico-container {
  width: 100%;
  max-width: 1000px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}

h1 {
  color: var(--matrix-green);
  margin: 0 0 20px 0;
  text-align: center;
  font-size: 2.6rem;
  letter-spacing: 3px;
  text-shadow: 0 0 12px var(--matrix-green-glow);
}

.agenda-container {
  width: 100%;
  max-width: 720px;
  margin-bottom: 20px;
}

.agenda-container .card.agenda {
  width: 100%;
  padding: 20px;
  background: rgba(0, 20, 0, 0.9);
  border: 2px solid var(--amber);
  box-shadow: 0 0 20px var(--amber-glow);
  color: var(--amber);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.agenda-container .card.agenda:hover {
  transform: translateY(-3px);
  background: var(--amber);
  color: var(--terminal-bg);
  box-shadow: 0 0 25px var(--amber-glow);
}

.agenda-container .card-content i {
  font-size: 28px;
  margin-bottom: 8px;
}

.agenda-container .card-content h2 {
  font-size: 24px;
}

.botones-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
  width: 100%;
}

.boton-cuenta {
  text-decoration: none;
  flex: 0 1 calc(50% - 15px);
  max-width: 340px;
  min-width: 220px;
}

.card {
  background: rgba(0, 20, 0, 0.85);
  border: 1px solid var(--matrix-green);
  border-radius: 0;
  padding: 18px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.card:hover {
  transform: translateY(-3px);
}

.card h2 {
  font-size: 22px;
  color: inherit;
  margin: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.card-content i {
  font-size: 26px;
  color: inherit;
}

.card.ozuna {
  border-color: var(--client-ozuna);
  color: var(--client-ozuna);
  box-shadow: 0 0 15px rgba(0, 200, 83, 0.25);
}

.card.catarro {
  border-color: var(--client-catarro);
  color: var(--client-catarro);
  box-shadow: 0 0 15px rgba(255, 82, 82, 0.25);
}

.card.joselito {
  border-color: var(--client-joselito);
  color: var(--client-joselito);
  box-shadow: 0 0 15px rgba(79, 195, 255, 0.25);
}

.card.otilio {
  border-color: var(--client-otilio);
  color: var(--client-otilio);
  box-shadow: 0 0 15px rgba(255, 213, 79, 0.25);
}

.card.veronica {
  border-color: var(--client-veronica);
  color: var(--client-veronica);
  box-shadow: 0 0 15px rgba(255, 140, 0, 0.25);
}

.card.ozuna:hover {
  background: var(--client-ozuna);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px rgba(0, 200, 83, 0.5);
}

.card.catarro:hover {
  background: var(--client-catarro);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px rgba(255, 82, 82, 0.5);
}

.card.joselito:hover {
  background: var(--client-joselito);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px rgba(79, 195, 255, 0.5);
}

.card.otilio:hover {
  background: var(--client-otilio);
  color: #1a1a1a;
  box-shadow: 0 0 20px rgba(255, 213, 79, 0.5);
}

.card.veronica:hover {
  background: var(--client-veronica);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px rgba(255, 140, 0, 0.5);
}

.precios-container {
  width: 100%;
  max-width: 600px;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

@media (max-width: 600px) {
  .agenda-container {
    max-width: 100%;
  }
  
  .agenda-container .card-content h2 {
    font-size: 20px;
  }
  
  .agenda-container .card-content i {
    font-size: 24px;
  }

  .boton-cuenta {
    flex: 1 1 100%;
  }

  .card h2 {
    font-size: 18px;
  }
  
  .card-content i {
    font-size: 22px;
  }
}

@media (min-width: 1400px) {
  .botones-container {
    gap: 20px;
  }

  .card h2 {
    font-size: 24px;
  }
}
</style>