<template>
    <div>
      <!-- Contenido de tu menú aquí -->
      <button @click="goToSaleNote">Nueva nota</button>
      <button @click="goToAddClient">Agregar Cliente</button> <!-- Nuevo botón -->
    </div>
  </template>
  
  <script>
  export default {
    name: 'NoteMenu',
    methods: {
      goToSaleNote() {
        // Asegúrate de tener configurado el enrutamiento correctamente
        this.$router.push({ name: 'SaleNote' });
      },
      goToAddClient() {
        // Navega al componente AddClient
        this.$router.push({ name: 'AddClient' });
      }
    }
  }
  </script>
  
  <style scoped>
  h1 {
    color: #333;
    text-align: center;
  }
  /* Puedes agregar más estilos aquí si lo deseas */
  

div {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

button {
  background-color:  #1552cc ; /* Color de fondo verde */
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 8px; /* Bordes redondeados */
  transition: background-color 0.3s ease; /* Transición suave al cambiar el color */
}

button:hover {
  background-color: #0a3892; /* Color más oscuro al pasar el mouse */
  color: yellow;
}
</style>