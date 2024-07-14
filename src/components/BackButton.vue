<template>
    <router-link :to="to" class="btn-back">Atrás</router-link>
  </template>
  
  <script>
  export default {
    props: {
      to: {
        type: String,
        required: true
      }
    }
  }
  </script>
  
  <style>
  .btn-back {
  background-color: #757575; /* Color de fondo gris */
  color: white; /* Color del texto */
  padding: 0.5em 1em;
  border: none; /* Sin borde */
  border-radius: 5px; /* Bordes redondeados */
  text-decoration: none; /* Remover subrayado de enlaces */
  font-size: 16px; /* Tamaño del texto */
  cursor: pointer; /* Cursor en forma de mano */
  margin: 20px 10px; /* Margen superior e inferior aumentado, y margen lateral agregado */
}

.btn-back:hover {
  background-color: #616161; /* Color de fondo gris más oscuro al pasar el mouse */
  color: whitesmoke;
}
  </style>