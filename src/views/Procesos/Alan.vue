<template>
  <div class="alan-container">
    <!-- Pantalla de contraseña -->
    <div v-if="!unlocked" class="lock-screen">
      <div class="lock-card">
        <div class="lock-icon">🔐</div>
        <h1 class="lock-title">ÁREA DE ALAN</h1>
        <p class="lock-sub">Esta sección es privada. Ingresa la contraseña para continuar.</p>

        <form @submit.prevent="checkPassword" class="lock-form">
          <input
            ref="passwordInput"
            v-model="passwordInput"
            type="password"
            class="lock-input"
            placeholder="Contraseña"
            autocomplete="off"
            inputmode="numeric"
          />
          <button type="submit" class="lock-btn">Entrar</button>
        </form>

        <p v-if="error" class="lock-error">Contraseña incorrecta. Intenta de nuevo.</p>

        <router-link to="/procesos" class="lock-back">← Volver a Procesos</router-link>
      </div>
    </div>

    <!-- Menú de componentes una vez desbloqueado -->
    <div v-else class="alan-menu">
      <div class="alan-header">
        <div class="alan-header-text">
          <h1 class="alan-title">Área de Alan</h1>
          <p class="alan-subtitle">Componentes privados</p>
        </div>
        <div class="alan-header-actions">
          <button @click="lock" class="btn-lock" title="Bloquear sesión">
            🔒 Bloquear
          </button>
          <router-link to="/procesos" class="btn-back">← Procesos</router-link>
        </div>
      </div>

      <div class="alan-components">
        <router-link to="/procesos/alan/marie" class="component-card marie">
          <div class="component-icon">📅</div>
          <div class="component-info">
            <h2>Marie</h2>
            <p>Componente con varios subcomponentes (puntos, calendarios y más).</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
const ALAN_PASSWORD = '23196';
const SESSION_KEY = 'alan_unlocked';

export default {
  name: 'Alan',
  data() {
    return {
      passwordInput: '',
      error: false,
      unlocked: false
    };
  },
  created() {
    this.unlocked = sessionStorage.getItem(SESSION_KEY) === '1';
  },
  mounted() {
    if (!this.unlocked) {
      this.$nextTick(() => {
        if (this.$refs.passwordInput) this.$refs.passwordInput.focus();
      });
    }
  },
  methods: {
    checkPassword() {
      const normalized = (this.passwordInput || '').replace(/\s+/g, '');
      if (normalized === ALAN_PASSWORD) {
        this.unlocked = true;
        this.error = false;
        this.passwordInput = '';
        sessionStorage.setItem(SESSION_KEY, '1');
      } else {
        this.error = true;
        this.passwordInput = '';
      }
    },
    lock() {
      sessionStorage.removeItem(SESSION_KEY);
      this.unlocked = false;
    }
  }
};
</script>

<style scoped>
.alan-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1e 0%, #1a1033 100%);
  color: #f5f5f5;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 24px;
}

/* Lock screen */
.lock-screen {
  min-height: calc(100vh - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(243, 104, 224, 0.4);
  border-radius: 16px;
  padding: 40px 32px;
  width: 100%;
  max-width: 420px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(243, 104, 224, 0.15);
  backdrop-filter: blur(10px);
}

.lock-icon {
  font-size: 3.4rem;
  margin-bottom: 12px;
}

.lock-title {
  font-size: 1.6rem;
  margin: 0 0 8px 0;
  color: #f368e0;
  letter-spacing: 2px;
}

.lock-sub {
  margin: 0 0 24px 0;
  color: #c5c5d6;
  font-size: 0.95rem;
}

.lock-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lock-input {
  padding: 14px 16px;
  font-size: 1.2rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  outline: none;
  text-align: center;
  letter-spacing: 4px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.lock-input:focus {
  border-color: #f368e0;
  box-shadow: 0 0 0 3px rgba(243, 104, 224, 0.25);
}

.lock-btn {
  padding: 12px 16px;
  font-size: 1rem;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #f368e0 0%, #b53cd0 100%);
  color: #fff;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.lock-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(243, 104, 224, 0.35);
}

.lock-error {
  margin-top: 14px;
  color: #ff6b6b;
  font-size: 0.9rem;
}

.lock-back {
  display: inline-block;
  margin-top: 20px;
  color: #9ca3af;
  text-decoration: none;
  font-size: 0.9rem;
}

.lock-back:hover {
  color: #fff;
}

/* Menú desbloqueado */
.alan-menu {
  max-width: 1100px;
  margin: 0 auto;
}

.alan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
}

.alan-title {
  margin: 0;
  font-size: 2rem;
  color: #f368e0;
}

.alan-subtitle {
  margin: 4px 0 0 0;
  color: #b8b8c8;
  font-size: 0.95rem;
}

.alan-header-actions {
  display: flex;
  gap: 10px;
}

.btn-lock,
.btn-back {
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  text-decoration: none;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.2s;
}

.btn-lock:hover,
.btn-back:hover {
  background: rgba(255, 255, 255, 0.12);
}

.alan-components {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.component-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s, border-color 0.2s, box-shadow 0.2s;
}

.component-card:hover {
  transform: translateY(-3px);
  border-color: rgba(243, 104, 224, 0.5);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.component-icon {
  font-size: 2.8rem;
  flex-shrink: 0;
}

.component-info h2 {
  margin: 0 0 4px 0;
  color: #f368e0;
}

.component-info p {
  margin: 0;
  color: #c5c5d6;
  font-size: 0.9rem;
}
</style>
