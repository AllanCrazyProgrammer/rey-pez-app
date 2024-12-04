<template>
  <div class="movimientos-menu">
    <h2 class="text-center mb-4">Movimientos</h2>
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-6 mb-3">
          <b-card
            class="menu-card"
            @click="$router.push('/movimientos/diarios')"
          >
            <div class="text-center">
              <i class="fas fa-calendar-day fa-3x mb-3"></i>
              <h4>Movimientos Diarios</h4>
              <p>Registrar entradas y salidas del día</p>
            </div>
          </b-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MovimientosMenu'
}
</script>

<style scoped>
.movimientos-menu {
  padding: 2rem;
}

.menu-card {
  cursor: pointer;
  transition: transform 0.2s;
  height: 100%;
}

.menu-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.fas {
  color: #2c3e50;
}

h4 {
  color: #2c3e50;
  margin: 1rem 0;
}

p {
  color: #666;
  margin-bottom: 0;
}
</style>
