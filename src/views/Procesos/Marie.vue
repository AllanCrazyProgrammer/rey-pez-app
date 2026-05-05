<template>
  <div class="marie-container">
    <header class="marie-header">
      <div>
        <h1 class="marie-title">Marie</h1>
        <p class="marie-subtitle">Componentes y herramientas</p>
      </div>
      <router-link to="/procesos/alan" class="btn-back">← Volver</router-link>
    </header>

    <nav class="marie-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab', { active: activeTab === tab.id }]"
        :aria-selected="activeTab === tab.id"
        role="tab"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <section class="marie-content">
      <BuenosDias v-if="activeTab === 'buenosDias'" />
      <div v-else class="placeholder">
        <p>Próximamente: este subcomponente estará disponible pronto.</p>
      </div>
    </section>
  </div>
</template>

<script>
import BuenosDias from '@/components/Marie/BuenosDias.vue';

export default {
  name: 'Marie',
  components: { BuenosDias },
  data() {
    return {
      activeTab: 'buenosDias',
      tabs: [
        { id: 'buenosDias', label: 'Buenos Días', icon: '🌅' }
      ]
    };
  },
  created() {
    if (sessionStorage.getItem('alan_unlocked') !== '1') {
      this.$router.replace('/procesos/alan');
    }
  }
};
</script>

<style scoped>
.marie-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1628 0%, #14233a 100%);
  color: #f5f5f5;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 24px;
}

.marie-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.marie-title {
  margin: 0;
  color: #4dabf7;
  font-size: 2rem;
}

.marie-subtitle {
  margin: 4px 0 0 0;
  color: #b8b8c8;
  font-size: 0.95rem;
}

.btn-back {
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  text-decoration: none;
  font-size: 0.95rem;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.12);
}

.marie-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0;
  max-width: 1200px;
  margin: 0 auto 18px auto;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  color: #c5c5d6;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.2s, color 0.2s;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.tab.active {
  background: rgba(77, 171, 247, 0.12);
  color: #4dabf7;
  border-color: rgba(77, 171, 247, 0.4);
}

.tab-icon {
  font-size: 1.1rem;
}

.marie-content {
  max-width: 1200px;
  margin: 0 auto;
}

.placeholder {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
</style>
