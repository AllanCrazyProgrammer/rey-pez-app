<template>
  <div
    v-if="showNotification"
    class="auth-error-notification"
    :class="{ 'show': showNotification }"
  >
    <div class="notification-content">
      <div class="icon">
        ⚠️
      </div>
      <div class="message">
        <h4>Problema de Autenticación</h4>
        <p>{{ message }}</p>
        <small>Por favor, vuelva a iniciar sesión para continuar.</small>
      </div>
      <button @click="redirectToLogin" class="login-btn">
        Ir a Login
      </button>
      <button @click="hideNotification" class="close-btn">
        ✕
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AuthErrorNotification',
  props: {
    message: {
      type: String,
      default: 'Su sesión ha expirado o hay un problema con su autenticación.'
    },
    show: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showNotification: false
    }
  },
  watch: {
    show(newVal) {
      this.showNotification = newVal;
    }
  },
  methods: {
    hideNotification() {
      this.showNotification = false;
      this.$emit('hide');
    },
    redirectToLogin() {
      this.hideNotification();
      this.$router.push('/login');
    }
  },
  mounted() {
    this.showNotification = this.show;
  }
}
</script>

<style scoped>
.auth-error-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(238, 90, 82, 0.3);
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
  max-width: 400px;
  min-width: 300px;
}

.auth-error-notification.show {
  transform: translateX(0);
}

.notification-content {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  position: relative;
}

.icon {
  font-size: 24px;
  flex-shrink: 0;
}

.message h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
}

.message p {
  margin: 0 0 5px 0;
  font-size: 14px;
  opacity: 0.9;
}

.message small {
  font-size: 12px;
  opacity: 0.8;
}

.login-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.login-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s ease;
  opacity: 0.7;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  opacity: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .auth-error-notification {
    right: 10px;
    left: 10px;
    max-width: none;
    min-width: unset;
    transform: translateY(-100%);
  }
  
  .auth-error-notification.show {
    transform: translateY(0);
  }
  
  .notification-content {
    padding: 15px;
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .icon {
    font-size: 20px;
  }
  
  .message {
    order: 1;
  }
  
  .login-btn {
    order: 2;
    width: 100%;
    padding: 10px;
  }
}
</style>
