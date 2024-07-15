<template>
  <!-- Agrega esto en tu archivo HTML principal, generalmente en el <head> -->
  <div>
    <b-navbar class="navbar-custom" toggleable="lg">
      <b-navbar-brand href="#">
        <b-img
          src="https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png"
          width="100"
          fluid
          alt="Fluid image"
        ></b-img>
      </b-navbar-brand>

      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav class="mx-auto">
          <h2 class="navbar-title">Rey Pez</h2>
        </b-navbar-nav>
        <b-navbar-nav class="nav-links">
          <b-nav-item>
            <router-link to="/" class="nav-link">Home</router-link>
          </b-nav-item>
          <b-nav-item>
            <router-link to="/noteMenu" class="nav-link">Notas</router-link>
          </b-nav-item>
        </b-navbar-nav>

        <!-- Right aligned nav items -->
        <b-navbar-nav class="ml-auto">
          <b-nav-item-dropdown right>
            <template #button-content>
              <em>User</em>
            </template>
            <b-dropdown-item href="#">Profile</b-dropdown-item>
            <b-dropdown-item href="#">Sign Out</b-dropdown-item>
          </b-nav-item-dropdown>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
    <router-view />
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
  background-image: url('https://www.transparenttextures.com/patterns/wave.png'); /* Simulating waves */
}

.navbar-brand img {
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.navbar-title {
  color: #3760b0; /* Azul principal */
  font-size: 4em;
  margin: 0;
  font-family: 'Sail', cursive; /* Cambiamos la fuente a "Sail" */
  text-align: center;
  width: 100%;
  text-shadow: 2px 2px #ecb62b; /* Sombra de texto dorada */
}
.nav-links .nav-link {
  color: #3760b0;
  font-weight: bold;
  margin: 0 15px;
  transition: color 0.3s, transform 0.3s;
  font-size: 20px;
}

.nav-links .nav-link:hover {
  color: #2a4a87;
  transform: scale(1.1);
}

.b-nav-item-dropdown .dropdown-menu {
  background-color: white;
  border-radius: 10px;
  border: 1px solid #3760b0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.b-nav-item-dropdown .dropdown-item {
  color: #3760b0;
  transition: background-color 0.3s, color 0.3s;
}

.b-nav-item-dropdown .dropdown-item:hover {
  background-color: #2a4a87;
  color: white;
}

.b-nav-item-dropdown .dropdown-item em {
  color: white;
}

@media (max-width: 768px) {
  .navbar-custom {
    padding: 5px 10px;
  }

  .navbar-title {
    font-size: 1.8em;
  }

  .nav-links .nav-link {
    margin: 0 10px;
  }
}

@media (max-width: 576px) {
  .navbar-custom {
    padding: 5px 10px;
    flex-direction: column;
  }

  .navbar-title {
    font-size: 1.5em;
    margin: 10px 0;
  }

  .nav-links .nav-link {
    margin: 5px 0;
  }
}
</style>