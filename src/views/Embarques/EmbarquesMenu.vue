<template>
  <div class="embarques-menu">
    <h1>Menú de Embarques</h1>
    <div class="menu-options">
      <button @click="nuevoEmbarque" class="btn-nuevo-embarque">Nuevo Embarque</button>
    </div>
    <ListaEmbarques />
  </div>
</template>

<script>
import ListaEmbarques from './ListaEmbarques.vue'

export default {
  name: 'EmbarquesMenu',
  components: {
    ListaEmbarques
  },
  methods: {
    nuevoEmbarque() {
      this.$router.push({ name: 'NuevoEmbarque', params: { id: 'nuevo' } });
    }
  }
}
</script>

<style scoped>
.embarques-menu {
  padding: 20px;
  text-align: center;
}

.menu-options {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.btn-nuevo-embarque {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  transition: background-color 0.3s;
}

.btn-nuevo-embarque:hover {
  background-color: #45a049;
}

h1 {
  margin-bottom: 20px;
  color: #333;
}
</style>
