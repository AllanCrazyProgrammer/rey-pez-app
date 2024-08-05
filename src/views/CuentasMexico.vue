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
}

.cuentas-mexico-container {
  display: flex;
  flex-direction: column;
  padding: 20px;
  height: 100%;
}

.botones-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.boton-cuenta {
  margin: 10px;
  text-decoration: none;
}

.card {
  background-color: #3760b0;
  border-radius: 10px;
  padding: 20px;
  width: 200px;
  text-align: center;
  transition: transform 0.3s ease;
}

.card:hover {
  transform: scale(1.05);
}

.card h2 {
  font-size: 24px;
  color: #ffffff;
}
</style>