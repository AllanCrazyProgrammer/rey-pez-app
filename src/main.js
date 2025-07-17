import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia, PiniaVuePlugin } from "pinia";
import { useAuthStore } from "./stores/auth";

// Helper de autenticación para desarrollo
if (process.env.NODE_ENV === 'development') {
  import('./utils/authHelper.js');
}

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

// Verificamos si pdfMake ya está disponible globalmente
if (!window.pdfMake) {
  // Si no existe, importamos pdfMake
  Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts')
  ]).then(([pdfMakeModule, pdfFontsModule]) => {
    window.pdfMake = pdfMakeModule.default || pdfMakeModule;
    
    // Asignar fuentes
    if (pdfFontsModule.default) {
      window.pdfMake.vfs = pdfFontsModule.default;
    } else if (pdfFontsModule.pdfMake && pdfFontsModule.pdfMake.vfs) {
      window.pdfMake.vfs = pdfFontsModule.pdfMake.vfs;
    } else {
      window.pdfMake.vfs = pdfFontsModule;
    }
    
    console.log('pdfMake cargado globalmente');
  }).catch(error => {
    console.error('Error al cargar pdfMake:', error);
    console.log('Usando versión de CDN si está disponible');
  });
}
