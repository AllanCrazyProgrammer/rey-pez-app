<template>
  <button 
    @click="onClick" 
    class="floating-button"
    :aria-label="ariaLabel"
  >
    <i class="fas" :class="icon"></i>
  </button>
</template>

<script>
export default {
  name: 'FloatingButton',
  props: {
    icon: {
      type: String,
      default: 'fa-users'
    },
    ariaLabel: {
      type: String,
      default: 'Mostrar menú'
    }
  },
  methods: {
    onClick() {
      this.$emit('click');
    }
  }
};
</script>

<style scoped>
.floating-button {
  position: fixed;
  left: 10px;
  bottom: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: rgba(52, 152, 219, 0.9);
  color: white;
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.floating-button:hover {
  transform: scale(1.1);
  background-color: rgba(52, 152, 219, 1);
}
</style> 