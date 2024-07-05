import Vue from "vue";
import VueRouter from "vue-router";
import SaleNote from "./views/SaleNote.vue";
import Home from "./views/Home.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/Notas",
    name: "notas",
    component: SaleNote,
  },
  {
    path: "/",
    name: "home",
    component: Home,
  },
];
const router = new VueRouter({
  mode: "history",
  routes,
});

export default router;
