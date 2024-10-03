<template>
  <div class="embarques-menu">
    <div class="menu-options" v-if="!mostrarNuevoEmbarque">
      <button @click="nuevoEmbarque">Nuevo Embarque</button>
      <button @click="listaEmbarques">Lista de Embarques</button>
      <button @click="buscarEmbarque">Buscar Embarque</button>
      <button @click="reportes">Reportes de Embarques</button>
    </div>
    <NuevoEmbarque v-if="mostrarNuevoEmbarque" @volver="volverAlMenu" />
  </div>
</template>

<script>
import NuevoEmbarque from './NuevoEmbarque.vue'

export default {
  name: 'EmbarquesMenu',
  components: {
    NuevoEmbarque
  },
  data() {
    return {
      mostrarNuevoEmbarque: false
    }
  },
  methods: {
    nuevoEmbarque() {
      this.mostrarNuevoEmbarque = true;
    },
    listaEmbarques() {
      // Implementar lógica para mostrar lista de embarques
      console.log('Mostrar lista de embarques');
    },
    buscarEmbarque() {
      // Implementar lógica para buscar embarque
      console.log('Buscar embarque');
    },
    reportes() {
      // Implementar lógica para generar reportes
      console.log('Generar reportes de embarques');
    },
    volverAlMenu() {
      this.mostrarNuevoEmbarque = false;
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
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}

button {
  margin: 10px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}
</style>
