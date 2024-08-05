<template>
  <div class="page-container">
    <div class="content-wrap">
      <div class="cuentas-mexico-container">
        <h1>Cuentas México</h1>
        <div class="botones-container">
          <router-link to="/cuentas-ozuna" class="boton-cuenta">
            <div class="card">
              <h2>Ozuna</h2>
            </div>
          </router-link>
          <!-- Agrega más botones aquí si es necesario -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
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
}

.cuentas-mexico-container {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

h1 {
  color: #3760b0;
  margin-bottom: 30px;
  text-align: center;
}

.botones-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  width: 100%;
}

.boton-cuenta {
  text-decoration: none;
  flex: 0 1 calc(50% - 20px);
  max-width: 300px;
  min-width: 200px;
}

.card {
  background-color: #3760b0;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.card h2 {
  font-size: 24px;
  color: #ffffff;
  margin: 0;
}

@media (max-width: 600px) {
  .boton-cuenta {
    flex: 1 1 100%;
  }

  .card h2 {
    font-size: 20px;
  }
}
</style>