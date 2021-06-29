<template>
  <div>
    <b-table striped hover :items="items" :fields="fields"></b-table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fields: ["Nombre", "last_name", "age"],
      items: [
        {
          isActive: true,
          age: 40,
          Nombre: "Dickerson",
          last_name: "Macdonald",
        },
        { isActive: false, age: 21, Nombre: "Larsen", last_name: "Shaw" },
        { isActive: false, age: 89, Nombre: "Geneva", last_name: "Wilson" },
        { isActive: true, age: 38, Nombre: "Jami", last_name: "Carney" },
      ],
    };
  },
};
</script>

<style>
</style>