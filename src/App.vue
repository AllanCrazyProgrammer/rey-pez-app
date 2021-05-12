
<template>
  <div id="app">
    <Navbar />
    <b-container >
      <Datos />
    </b-container>
  </div>
</template>

<script>
import Navbar from "./NavBar.vue";
import Datos from "./datos.vue";

export default {
  name: "app",
  components: {
    Navbar,
    Datos,
  },
  data() {
    return {

    };
  },
  methods: {
    deleteFriend(payload) {
      console.log(payload);
      this.friends = this.friends.filter((friend) => {
        return friend.name !== payload;
      });
    },
  },
};
</script>

<style>
h1 {
  color: blueviolet;
  text-align: center;
  font-weight: normal;
}
</style>
