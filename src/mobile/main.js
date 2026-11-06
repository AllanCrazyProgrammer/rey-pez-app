import Vue from 'vue';
import { createPinia, PiniaVuePlugin } from 'pinia';
import App from './InventariosApp.vue';
import router from './router';
import { useAuthStore } from '@/stores/auth';
import { iniciarActualizacionesAndroid } from './arranqueActualizacion';

Vue.use(PiniaVuePlugin);
Vue.config.productionTip = false;
const pinia = createPinia();
new Vue({ pinia, router, render: h => h(App) }).$mount('#app');
// Avisa al actualizador que esta versión arrancó (si no, regresa a la anterior) y busca versiones nuevas.
iniciarActualizacionesAndroid();
// Con VUE_APP_LOGIN_LOCAL=off exige sesión de Firebase Auth (no hace nada en la transición).
useAuthStore(pinia).exigirSesionFirebase(router);
