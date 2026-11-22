// Entrada de la app de despique (APK del colaborador que pesa las despicadas).
// Usa las mismas pantallas de Pesadas que la app completa, pero con su propio router
// (src/despique/router.js) y su propio marco (AppDespique.vue), sin menú ni otras áreas.
import Vue from 'vue';
import { Capacitor } from '@capacitor/core';
import { createPinia, PiniaVuePlugin } from 'pinia';
import { ModalPlugin, ToastPlugin, LayoutPlugin, ButtonPlugin, FormGroupPlugin, FormInputPlugin, FormTextareaPlugin } from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
import '../styles/bootstrap-vue-bs5.css';
import '@fortawesome/fontawesome-free/css/all.css';
import AppDespique from './AppDespique.vue';
import router from './router';
import { useAuthStore } from '../stores/auth';

[ModalPlugin, ToastPlugin, LayoutPlugin, ButtonPlugin, FormGroupPlugin, FormInputPlugin, FormTextareaPlugin]
  .forEach(plugin => Vue.use(plugin));
Vue.use(PiniaVuePlugin);
Vue.config.productionTip = false;

const pinia = createPinia();

new Vue({
  router,
  pinia,
  render: h => h(AppDespique),
  created() {
    if (localStorage.getItem('user')) {
      const authStore = useAuthStore();
      authStore.checkAuth();
      authStore.exigirSesionFirebase(router);
    }
  }
}).$mount('#app');

// Esta APK no usa el canal de actualizaciones de la app completa (traería todas las pantallas):
// se actualiza instalando una APK nueva. Solo se avisa al plugin de Capacitor que la versión
// incluida arrancó bien, para que nunca intente regresar a otra.
if (Capacitor.isNativePlatform()) {
  import('@capgo/capacitor-updater')
    .then(({ CapacitorUpdater }) => CapacitorUpdater.notifyAppReady())
    .catch(() => {});
}
