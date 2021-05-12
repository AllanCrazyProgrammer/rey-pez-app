<template>
  <div>
    <b-navbar toggleable="lg" type="dark" variant="dark">
      <b-navbar-brand href="#">
        <img
          src="https://placekitten.com/g/30/30"
          class="d-inline-block align-top"
          alt="Kitten"
        />
        Rey Pez
      </b-navbar-brand>

      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <b-row>
          <b-navbar-nav>
            <b-col> <b-nav-item href="#">Cuentas</b-nav-item></b-col>
            <b-col> <b-nav-item href="#">Herramientas</b-nav-item></b-col>
          </b-navbar-nav>
        </b-row>
        <!-- Right aligned nav items -->
        <b-navbar-nav class="ml-auto">
          <b-nav-form>
            <b-form-input
              size="sm"
              class="mr-sm-2"
              placeholder="Search"
            ></b-form-input>
            <b-button size="sm" class="my-2 my-sm-0" type="submit"
              >Search</b-button
            >
          </b-nav-form>

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
h1 {
  color: rgb(40, 40, 216);
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