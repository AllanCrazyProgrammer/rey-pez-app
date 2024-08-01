<template>
  <div class="container">
    <div class="cuentas-mexico">
      <h1>Cuentas México</h1>
      <div class="botones-container">
        <router-link to="/cuentas-ozuna" class="boton-cuenta">
          <div class="card">
            <h2>Ozuna</h2>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CuentasMexico',
  // Aquí irá la lógica del componente
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.cuentas-mexico {
  width: 100%;
  text-align: center;
}

.botones-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.boton-cuenta {
  text-decoration: none;
  color: inherit;
}

.card {
  width: 200px;
  height: 200px;
  background-color: #4CAF50; /* Verde */
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.card:hover {
  background-color: #45a049; /* Verde más oscuro para el hover */
}

.card h2 {
  font-size: 24px;
  text-align: center;
  color: #ffffff; /* Texto blanco para mejor legibilidad */
}
</style>