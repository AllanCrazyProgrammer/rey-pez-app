<template>
    <button @click="handleClick">Haz clic aquí</button>
</template>

<script>
export default {
    methods: {
        handleClick() {
            this.$router.push('/sale-note');
        }
    }
}
</script>
<style scoped>
button {
    background-color:  rgb(40, 40, 216);
    border: none;
    color: white;
    padding: 8px 15px; /* Reducido de 10px 20px a 8px 15px */
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 10px; /* Reducido de 16px a 14px */
    margin: 2px 1px; /* Reducido de 4px 2px a 2px 1px */
    cursor: pointer;
    border-radius: 4px;
}

button:hover {
    background-color: #45a049;
    color: whitesmoke;
}
</style>