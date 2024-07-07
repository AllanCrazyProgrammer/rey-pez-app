<template>
  <div>
    <b-navbar class="sideBorder" toggleable="lg">
      <b-navbar-brand href="#">
        <b-img
          src="https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png"
          width="80"
          fluid
          alt="Fluid image"
        ></b-img>
      </b-navbar-brand>

      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <h2>Rey Pez</h2>

        <b-row>
          <b-navbar-nav>
            <b-col>
              <b-nav-item>
                <router-link to="/">Home</router-link>
              </b-nav-item>
            </b-col>
            <b-col>
              <b-nav-item>
                <router-link to="/noteMenu">Notas</router-link>
              </b-nav-item>
            </b-col>
          </b-navbar-nav>
        </b-row>
        <!-- Right aligned nav items -->
        <!-- Comment content goes here -->
        <b-navbar-nav class="ml-auto">
          <b-nav-item-dropdown right>
            <!-- Using 'button-content' slot -->
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

<style >
.sideBorder {
  border-left: 15px solid #3760b0 !important;
  border: 2px solid rgb(0, 0, 0);
  background-color: white;
}

h1 {
  color: rgb(40, 40, 216);
}
h2 {
  color: #ecb62b;
  -webkit-text-stroke: 1px black; /* width and color */
}
nav {
  text-align: center;
}

nav ul {
  padding: 0;
}

nav li {
  display: inline-block;
  list-style-type: none;
  margin: 0;
  padding: 1em;
}
</style>