import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia, PiniaVuePlugin } from "pinia";
import { useAuthStore } from "./stores/auth";

import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

// Import Font Awesome
import '@fortawesome/fontawesome-free/css/all.css';

Vue.use(BootstrapVue);
Vue.use(IconsPlugin);
Vue.use(PiniaVuePlugin);

const pinia = createPinia();

Vue.config.productionTip = false;

const app = new Vue({
  router,
  pinia,
  render: (h) => h(App),
  created() {
    const store = localStorage.getItem('user');
    if (store) {
      const authStore = useAuthStore();
      authStore.checkAuth();
    }
  }
}).$mount("#app");

// Primero verificamos si ya existe window.fabric
if (!window.fabric) {
  // Si no existe, importamos fabric
  import('fabric').then(fabricModule => {
    window.fabric = fabricModule.fabric;
    console.log('Fabric.js cargado globalmente');
  }).catch(error => {
    console.error('Error al cargar Fabric.js:', error);
  });
}
