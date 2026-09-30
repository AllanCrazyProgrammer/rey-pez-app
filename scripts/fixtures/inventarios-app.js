import Vue from 'vue';
import { createPinia, PiniaVuePlugin } from 'pinia';
import App from '../../src/mobile/InventariosApp.vue';
import router from '../../src/mobile/router';
import { mostrarFecha } from '../../src/mobile/fechas';
window.__mostrarFechaPrueba = mostrarFecha;
Vue.use(PiniaVuePlugin);
Vue.config.productionTip = false;
new Vue({ pinia: createPinia(), router, render: h => h(App) }).$mount('#app');
