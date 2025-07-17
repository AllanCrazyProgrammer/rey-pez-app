<template>
  <div class="procesos-menu">
    <div class="header-section">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-process">⚙️</i>
          Menú de Procesos
        </h1>
        <p class="subtitle">Gestiona todos los procesos de tu negocio de manera eficiente</p>
      </div>
    </div>
    
    <div class="menu-options">
      <router-link 
        to="/procesos/pedidos" 
        class="btn-action btn-pedidos"
        aria-label="Gestionar pedidos"
      >
        <i class="icon">📝</i>
        <span>Pedidos</span>
      </router-link>
      
      <router-link 
        to="/procesos/preparacion" 
        class="btn-action btn-preparacion"
        aria-label="Gestionar preparación"
      >
        <i class="icon">👨‍🍳</i>
        <span>Preparación</span>
      </router-link>
      
      <router-link 
        to="/procesos/bitacoras" 
        class="btn-action btn-bitacoras"
        aria-label="Ver bitácoras de mantenimiento"
      >
        <i class="icon">📋</i>
        <span>Bitácoras</span>
      </router-link>
      
      <router-link 
        to="/procesos/deudas" 
        class="btn-action btn-deudas"
        aria-label="Gestionar deudas"
      >
        <i class="icon">💰</i>
        <span>Deudas</span>
      </router-link>
      
      <router-link 
        to="/barcos" 
        class="btn-action btn-barcos"
        aria-label="Gestionar deudas de barcos"
      >
        <i class="icon">⛵</i>
        <span>Barcos</span>
      </router-link>
      
      <router-link 
        to="/procesos/prestamos" 
        class="btn-action btn-prestamos"
        aria-label="Gestionar préstamos"
      >
        <i class="icon">🏦</i>
        <span>Préstamos</span>
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
.procesos-menu {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  color: white;
}

/* Header moderno */
.header-section {
  text-align: center;
  margin-bottom: 40px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
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
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.icon-process {
  font-size: 3.5rem;
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
  flex-wrap: wrap;
  gap: 25px;
  margin-bottom: 40px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  justify-content: center;
}

/* Botones modernos */
.btn-action {
  padding: 20px 30px;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
  width: 280px;
  height: 70px;
  justify-content: flex-start;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  text-decoration: none;
  color: white;
  margin: 10px;
}

.btn-action:hover {
  transform: translateY(-3px);
  text-decoration: none;
  color: white;
}

.btn-action:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

/* Estilos específicos para cada botón */
.btn-pedidos {
  background: linear-gradient(45deg, #FF6B6B, #EE5A52);
}

.btn-pedidos:hover {
  box-shadow: 0 12px 35px rgba(255, 107, 107, 0.4);
  background: linear-gradient(45deg, #EE5A52, #E74C3C);
}

.btn-preparacion {
  background: linear-gradient(45deg, #4ECDC4, #44A08D);
}

.btn-preparacion:hover {
  box-shadow: 0 12px 35px rgba(78, 205, 196, 0.4);
  background: linear-gradient(45deg, #44A08D, #3A9188);
}

.btn-bitacoras {
  background: linear-gradient(45deg, #45B7D1, #3498DB);
}

.btn-bitacoras:hover {
  box-shadow: 0 12px 35px rgba(69, 183, 209, 0.4);
  background: linear-gradient(45deg, #3498DB, #2980B9);
}

.btn-deudas {
  background: linear-gradient(45deg, #F39C12, #E67E22);
}

.btn-deudas:hover {
  box-shadow: 0 12px 35px rgba(243, 156, 18, 0.4);
  background: linear-gradient(45deg, #E67E22, #D35400);
}

.btn-barcos {
  background: linear-gradient(45deg, #1ABC9C, #16A085);
}

.btn-barcos:hover {
  box-shadow: 0 12px 35px rgba(26, 188, 156, 0.4);
  background: linear-gradient(45deg, #16A085, #138D75);
}

.btn-prestamos {
  background: linear-gradient(45deg, #9B59B6, #8E44AD);
}

.btn-prestamos:hover {
  box-shadow: 0 12px 35px rgba(155, 89, 182, 0.4);
  background: linear-gradient(45deg, #8E44AD, #732D91);
}

.icon {
  font-size: 1.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .procesos-menu {
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
    max-width: 350px;
    justify-content: center;
    margin: 5px 0;
  }
}

@media (max-width: 480px) {
  .procesos-menu {
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

  .icon-process {
    font-size: 2.5rem;
  }

  .btn-action {
    padding: 15px 20px;
    font-size: 1rem;
    height: auto;
  }
}
</style> 