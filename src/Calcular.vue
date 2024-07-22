<template>
  <div class="calcular-container">
    <b-button @click="processArray" variant="primary">{{ cantidad }}</b-button>
  </div>
</template>
<script>
export default {
  name: "Calcular",
  props: {
    datos: {
      type: String,
      required: true
    },
    cantidad: {
      type: String,
      required: true
    }
  },
  methods: {
    processArray() {
      const processedData = this.datos.split('\n').filter(x => x.trim());
      const isTwo = this.cantidad === "$2";
      this.$emit("dataArray", { data: processedData, isTwo: isTwo });
    },
  },
};
</script>

<style scoped>
.calcular-container {
  margin-bottom: 15px;
}

button {
  width: 100%;
  padding: 10px 20px;
  background-color: #3760b0;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 1.1em;
}

button:hover {
  background-color: #2a4a87;
}

@media (max-width: 768px) {
  button {
    padding: 8px 16px;
    font-size: 1em;
  }
}
</style>
