<template>
  <div class="procesos-menu-container">
    <h1 class="menu-title">Menú de Procesos</h1>
    
    <div class="actions-container">
      <router-link to="/procesos/preparacion" class="action-button">
        <span class="button-text">Preparación</span>
        <i class="fas fa-arrow-right"></i>
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProcesosMenu'
}
</script>

<style scoped>
.procesos-menu-container {
  max-width: 1000px;
  width: 95%;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.menu-title {
  color: #2c3e50;
  font-size: 2.5em;
  margin-bottom: 40px;
  text-align: center;
  font-weight: 600;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
}

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 30px;
  width: 100%;
  max-width: 500px;
}

.action-button {
  background: linear-gradient(135deg, #2980b9, #3498db);
  color: white;
  padding: 20px 35px;
  text-decoration: none;
  border-radius: 8px;
  text-align: center;
  font-size: 1.2em;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
  background: linear-gradient(135deg, #3498db, #2980b9);
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.2);
  color: white;
}

.button-text {
  font-weight: 500;
}
</style> 