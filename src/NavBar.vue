<template>
  <div>
    <div class="safe-area-top"></div>

    <b-navbar class="navbar-custom" toggleable="lg">
      <b-navbar-brand href="#" class="d-flex align-items-center">
        <b-img
          src="https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png"
          width="60"
          fluid
          alt="Rey Pez Logo"
          class="logo-image mr-2"
        ></b-img>
        <h1 class="navbar-title mb-0">Rey Pez</h1>
      </b-navbar-brand>

      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav class="ml-auto">
          <b-nav-item>
            <router-link to="/" class="nav-link">Home</router-link>
          </b-nav-item>
          <b-nav-item>
            <router-link to="/noteMenu" class="nav-link">Notas</router-link>
          </b-nav-item>
          <b-nav-item>
            <router-link to="/sacadas" class="nav-link">Entradas/Salidas</router-link>
          </b-nav-item>
          <b-nav-item>
            <router-link to="/existencias" class="nav-link">Existencias</router-link>
          </b-nav-item>
          <b-nav-item>
            <router-link to="/cuentas-mexico" class="nav-link">Cuentas México</router-link>
          </b-nav-item>
          <b-nav-item>
            <router-link to="/embarques-menu" class="nav-link">Embarques</router-link>
          </b-nav-item>
          <b-nav-item>
            <router-link to="/procesos" class="nav-link">Procesos</router-link>
          </b-nav-item>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
  </div>
</template>

<script>
export default {
  name: "Navbar",
  data() {
    return {};
  },
};
</script>

<style scoped>
.navbar-custom {
  position: relative;
  background-color: white;
  padding: 10px 20px;
  border-bottom: 5px solid #3760b0;
  border-radius: 0 0 20px 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.navbar-custom::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 15px;
  height: 100%;
  background: linear-gradient(blue, #3760b0);
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
  background-image: url('https://www.transparenttextures.com/patterns/wave.png');
}

.logo-image {
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.navbar-title {
  color: #3760b0;
  font-size: 2em;
  font-family: 'Sail', cursive;
  text-shadow: 1px 1px #ecb62b;
}

.nav-link {
  color: #3760b0 !important;
  font-weight: bold;
  margin: 0 10px;
  transition: color 0.3s, transform 0.3s;
  font-size: 16px;
}

.nav-link:hover {
  color: #2a4a87 !important;
  transform: scale(1.1);
}

@media (max-width: 991px) {
  .navbar-title {
    font-size: 1.5em;
  }
  
  .logo-image {
    width: 50px;
  }
  
  .nav-link {
    font-size: 14px;
    margin: 5px 0;
  }
}

@media (max-width: 768px) {
  .navbar-custom {
    padding: 5px 10px;
  }
  
  .navbar-title {
    font-size: 1.2em;
  }
}

@media (max-width: 576px) {
  .navbar-custom {
    padding: 5px 10px;
  }
  
  .navbar-title {
    font-size: 1em;
  }
}

/* Nuevos estilos para el área segura */
.safe-area-top {
  height: env(safe-area-inset-top);
  background-color: white; /* O el color que prefieras */
}

/* Ajusta el padding superior de la barra de navegación */
.navbar-custom {
  padding-top: calc(20px + env(safe-area-inset-top)); /* Aumentado de 10px a 20px */
}

@supports not (padding: env(safe-area-inset-top)) {
  .safe-area-top {
    height: 20px; /* Añadido una altura fija para navegadores que no soportan env() */
  }
  .navbar-custom {
    padding-top: 30px; /* Aumentado de 10px a 30px */
  }
}
</style>