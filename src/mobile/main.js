import Vue from 'vue';
import { createPinia, PiniaVuePlugin } from 'pinia';
import App from './InventariosApp.vue';
import router from './router';

Vue.use(PiniaVuePlugin);
Vue.config.productionTip = false;
new Vue({ pinia: createPinia(), router, render: h => h(App) }).$mount('#app');
