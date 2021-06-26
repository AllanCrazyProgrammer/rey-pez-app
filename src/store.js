import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    msg: 5,
  },
  mutations: {
    suma(state) {
      state.msg = msg + 1;
    },
  },

  actions: {},
});
