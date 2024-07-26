# vue-cli-service

```
INFO: Accepting connections at http://localhost:5000

INFO: Gracefully shutting down. Please wait...

```

# static.json

```json
{
    "root": "dist",
    "clean_urls": true,
    "routes": {
      "/**": "index.html"
    }
  }
```

# rey-pez@0.1.0

```0
INFO: Accepting connections at http://localhost:5000

INFO: Gracefully shutting down. Please wait...

```

# package.json

```json
{
  "name": "rey-pez",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "lint": "vue-cli-service lint"
  },
  "dependencies": {
    "axios": "^0.21.4",
    "babel-eslint": "^10.1.0",
    "bootstrap": "^5.0.0",
    "bootstrap-vue": "^2.21.2",
    "core-js": "^3.6.5",
    "dotenv": "^9.0.2",
    "eslint": "^7.26.0",
    "express": "^4.17.1",
    "firebase": "^10.12.3",
    "html2pdf.js": "^0.10.2",
    "serve-static": "^1.14.1",
    "vue": "^2.6.11",
    "vue-datepicker-next": "^1.0.3",
    "vue-js-toggle-button": "^1.3.3",
    "vue-router": "^3.5.2",
    "vue-toggle-btn": "^0.1.2",
    "vue2-datepicker": "^3.11.1"
  },
  "devDependencies": {
    "@vue/cli-plugin-babel": "~4.5.0",
    "@vue/cli-service": "~4.5.0",
    "vue-template-compiler": "^2.6.11"
  },
  "engines": {
    "node": "20.15.0"
  }
}
```

# babel.config.js

```js
module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset'
  ]
}

```

# README.md

```md
# rey-pez

## Project setup
\`\`\`
npm install
\`\`\`

## Node version
\`\`\`
14.16.0
\`\`\`

### Compiles and hot-reloads for development
\`\`\`
npm run start
\`\`\`

### Compiles and minifies for production
\`\`\`
npm run build
\`\`\`

### Lints and fixes files
\`\`\`
npm run lint
\`\`\`

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

```

# .gitignore

```
.DS_Store
node_modules



# local env files
.env.local
.env.*.local

# Log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
node_modules

```

# .eslintrc.js

```js
module.exports = {
  root: true,
  env: {
    node: true
  },
  'extends': [
    'plugin:vue/essential',
    'eslint:recommended'
  ],
  parserOptions: {
    parser: 'babel-eslint'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  }
}

```

# .browserslistrc

```
> 1%
last 2 versions
not dead

```

# public/index.html

```html
<!DOCTYPE html>
<html lang="">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Sail&display=swap" rel="stylesheet">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <link rel="icon" href="<%= BASE_URL %>favicon.ico">
    <title><%= htmlWebpackPlugin.options.title %></title>
  </head>
  <body>
    <noscript>
      <strong>We're sorry but <%= htmlWebpackPlugin.options.title %> doesn't work properly without JavaScript enabled. Please enable it to continue.</strong>
    </noscript>
    <div id="app"></div>
    <!-- built files will be auto injected -->
  </body>
</html>

```

# public/favicon.ico

This is a binary file of the type: Binary

# src/server.js

```js
const express = require('express');
const path = require('path');
const app = express();

// Configuración de producción para servir archivos estáticos
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

# src/router.js

```js
import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/Home.vue';
import NoteMenu from './views/NoteMenu.vue'; // Asegúrate de que la ruta sea correcta
import SaleNote from '@/views/SaleNote.vue'; // Asegúrate de que la ruta de importación sea correcta
import AddClient from '@/components/AddClient.vue';
import  Sacadas from '@/views/Sacadas.vue';
import SacadasMenu from '@/views/SacadasMenu.vue'
import GestionarProductos from '@/components/GestionarProductos.vue'
import GestionarMedidas from '@/components/GestionarMedidas.vue'
import GestionarProveedores from '@/components/GestionarProveedores.vue'
import Existencias from '@/components/Existencias.vue'

Vue.use(Router);

const routes = [
  {
    path: '/noteMenu',
    name: 'NoteMenu',
    component: NoteMenu,
  },
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    path: '/sale-note/:noteId?',
    name: 'SaleNote',
    component: () => import('@/views/SaleNote.vue')
  },
  {
    path: '/add-client',
    name: 'AddClient',
    component: AddClient, // Asegúrate de que AddClient esté importado correctamente
  },
  {
    path: "/editar-nota/:noteId",
    name: "editar-nota",
    component: SaleNote,
    props: true
  },
  {
    path: '/sacadas',
    name: 'SacadasMenu',
    component: SacadasMenu
  },
  {
    path: '/sacadas/new',
    name: 'NuevaSacada',
    component: Sacadas
  },
  {
    path: '/sacadas/:id',
    name: 'DetalleSacada',
    component: Sacadas,
    props: true
  },
  {
    path: '/gestionar-productos',
    name: 'GestionarProductos',
    component: GestionarProductos
  },
  {
    path: '/gestionar-medidas',
    name: 'GestionarMedidas',
    component: GestionarMedidas
  },
  {
    path: '/gestionar-proveedores',
    name: 'GestionarProveedores',
    component: GestionarProveedores
  },
  {
    path: '/existencias',
    name: 'Existencias',
    component: Existencias
  }
];

const router = new Router({
  routes,
});

export default router;

```

# src/main.js

```js
import Vue from "vue";
import App from "./App.vue";
import router from "./router";

import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

Vue.config.productionTip = false;

new Vue({
  router,
  render: (h) => h(App),
}).$mount("#app");

```

# src/firebase.js

```js
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDEXrriJ15Gg2IyPYh56gNktfGaSsP6KeE",
  authDomain: "reypezapp-1ced2.firebaseapp.com",
  projectId: "reypezapp-1ced2",
  storageBucket: "reypezapp-1ced2.appspot.com",
  messagingSenderId: "512757841511",
  appId: "1:512757841511:web:d15e6a6276e84c42959ec2"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

export { db };
```

# src/datos.vue

```vue
<template>
  <div class="datos-container mt-5">
    <div class="fecha-actual">{{ fechaActual }}</div>

    <b-row>
      <b-col cols="12" md="5" class="mb-3">
        <b-button @click="borrarDatos" variant="danger" class="mb-3" block>Borrar datos</b-button>
        <b-form-textarea
          class="text-center"
          name="dinero"
          id="textarea-auto-height"
          placeholder="Ingrese cantidades de dinero (una por línea)"
          rows="3"
          max-rows="10"
          v-model="localDatos"
        ></b-form-textarea>
        <div class="mt-3 total-sum">
          <strong>Total: ${{ formatNumber(totalSum) }}</strong>
        </div>
      </b-col>

      <b-col cols="12" md="7">
        <Cuentas :datos="localDatos" />
      </b-col>
    </b-row>
  </div>
</template>

<script>
import Cuentas from "./Cuentas.vue";

export default {
  name: "Datos",
  components: {
    Cuentas,
  },
  props: {
    initialDatos: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      localDatos: this.initialDatos,
    };
  },
  methods: {
    borrarDatos() {
      this.localDatos = '';
    },
    formatNumber(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  },
  computed: {
    fechaActual() {
      const hoy = new Date();
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return hoy.toLocaleDateString('es-ES', opciones);
    },
    totalSum() {
      return this.localDatos.split('\n')
        .filter(line => line.trim())
        .reduce((sum, line) => sum + parseFloat(line) || 0, 0);
    }
  }
};
</script>

<style scoped>
.datos-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.fecha-actual {
  font-size: 1.2em;
  color: #3760b0;
  margin-bottom: 20px;
  text-align: right;
}

textarea {
  resize: vertical;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 10px;
}

button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2a4a87;
}

button.btn-danger {
  background-color: #dc3545;
}

button.btn-danger:hover {
  background-color: #c82333;
}

.total-sum {
  font-size: 1.2em;
  color: #3760b0;
  text-align: right;
}

@media (max-width: 768px) {
  .datos-container {
    padding: 10px;
  }

  .fecha-actual {
    text-align: center;
    margin-bottom: 15px;
  }

  button {
    padding: 8px 16px;
  }
}

@media (max-width: 576px) {
  .datos-container {
    padding: 0;
    margin: 0;
    max-width: 100%;
    border-radius: 0;
  }
}
</style>

```

# src/NavBar.vue

```vue
<template>
  <div>
    <b-navbar class="navbar-custom" toggleable="lg">
      <b-navbar-brand href="#" class="mx-auto">
        <b-img
          src="https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png"
          width="100"
          fluid
          alt="Rey Pez Logo"
          class="logo-image"
        ></b-img>
      </b-navbar-brand>

      <b-navbar-toggle target="nav-collapse" class="ml-auto"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <h2 class="navbar-title mx-auto">Rey Pez</h2>
        <b-navbar-nav class="mr-auto">
          <b-nav-item>
            <router-link to="/" class="nav-link">Home</router-link>
          </b-nav-item>
          <b-nav-item>
            <router-link to="/noteMenu" class="nav-link">Notas</router-link>
          </b-nav-item>
          <b-nav-item>
    <router-link to="/sacadas" class="nav-link">Entradas/Salidas</router-link>
  </b-nav-item>
  <b-nav-item>
    <router-link to="/existencias"class="nav-link">Existencias</router-link>
  </b-nav-item>

        </b-navbar-nav>


      </b-collapse>
    </b-navbar>
    <router-view />
  </div>
</template>

<script>
export default {
  name: "Navbar",
  data() {
    return {};
  },
};
</script>

<style scoped>
.navbar-custom {
  position: relative;
  background-color: white;
  padding: 10px 20px;
  border-bottom: 5px solid #3760b0;
  border-radius: 0 0 20px 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.navbar-custom::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 15px;
  height: 100%;
  background: linear-gradient(blue, #3760b0);
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
  background-image: url('https://www.transparenttextures.com/patterns/wave.png');
}

.navbar-brand {
  display: flex;
  justify-content: center;
}

.logo-image {
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.navbar-title {
  color: #3760b0;
  font-size: 4em;
  margin: 0;
  font-family: 'Sail', cursive;
  text-align: center;
  text-shadow: 2px 2px #ecb62b;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

.nav-links .nav-link {
  color: #3760b0;
  font-weight: bold;
  margin: 0 15px;
  transition: color 0.3s, transform 0.3s;
  font-size: 20px;
}

.nav-links .nav-link:hover {
  color: #2a4a87;
  transform: scale(1.1);
}

.b-nav-item-dropdown .dropdown-menu {
  background-color: white;
  border-radius: 10px;
  border: 1px solid #3760b0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.b-nav-item-dropdown .dropdown-item {
  color: #3760b0;
  transition: background-color 0.3s, color 0.3s;
}

.b-nav-item-dropdown .dropdown-item:hover {
  background-color: #2a4a87;
  color: white;
}

.b-nav-item-dropdown .dropdown-item em {
  color: white;
}

@media (max-width: 991px) {
  .navbar-title {
    position: static;
    transform: none;
    font-size: 3em;
    margin: 10px 0;
  }

  .navbar-brand {
    margin-right: 0;
  }

  .navbar-toggler {
    position: absolute;
    right: 15px;
    top: 15px;
  }
}

@media (max-width: 768px) {
  .navbar-custom {
    padding: 5px 10px;
  }

  .navbar-title {
    font-size: 2.5em;
  }

  .nav-links .nav-link {
    margin: 0 10px;
  }
}

@media (max-width: 576px) {
  .navbar-custom {
    padding: 5px 10px;
    flex-direction: column;
  }

  .navbar-title {
    font-size: 2em;
    margin: 10px 0;
  }

  .nav-links .nav-link {
    margin: 5px 0;
  }
}
</style>
```

# src/Footer.vue

```vue
<template>
  <footer class="footer">
    <div class="footer-content">
      <p>© 2024 Rey Pez - Allan Reyes</p>
      <nav class="footer-nav">
        <router-link to="/" class="footer-link">Home</router-link>
        <router-link to="/noteMenu" class="footer-link">Notas</router-link>
      </nav>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'Footer'
};
</script>

<style scoped>
.footer {
  background-color: #e8f0fe;
  border-top: 5px solid #3760b0;
  box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  text-align: center;
  width: 100%;
  flex-shrink: 0;
}

.footer-content {
  max-width: 800px;
  margin: 0 auto;
}

.footer p {
  color: #3760b0;
  font-size: 1.2em;
  margin: 0;
}

.footer-nav {
  margin-top: 10px;
}

.footer-link {
  color: #2a4a87;
  margin: 0 15px;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.3s;
}

.footer-link:hover {
  color: #3760b0;
}

@media (max-width: 768px) {
  .footer-content {
    padding: 0 20px;
  }

  .footer-link {
    display: block;
    margin: 10px 0;
  }
}
</style>
```

# src/Cuentas.vue

```vue
<template>
  <div class="cuentas-container">
    <b-row>
      <b-col cols="12" md="6" class="mb-3">
        <Calcular cantidad="$2" :datos="datos" @dataArray="getDatos" />
      </b-col>
      <b-col cols="12" md="6" class="mb-3">
        <Calcular cantidad="$1" :datos="datos" @dataArray="getDatos" />
      </b-col>
      <b-col cols="12" class="mb-3">
        <b-button @click="printCuentas" variant="primary" block>Imprimir sección</b-button>
      </b-col>
      <b-col cols="12" class="mb-3">
        <div ref="printSection" class="print-section">
          <h1>Cuentas</h1>
          <p class="print-date">{{ formattedDate }}</p>
          <div class="cuenta-list">
            <div v-for="(value, denomination) in bills" :key="denomination" class="cuenta-item">
              <h2>{{ denomination }}: {{ value }}</h2>
            </div>
          </div>
        </div>
      </b-col>
    </b-row>
  </div>
</template>

<script>
import Calcular from "./Calcular";

export default {
  name: "Cuentas",
  components: {
    Calcular,
  },
  props: {
    datos: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      bills: {
        500: 0,
        200: 0,
        100: 0,
        50: 0,
        20: 0,
        10: 0,
        5: 0,
        2: 0,
        1: 0,
      },
    };
  },
  computed: {
    formattedDate() {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date().toLocaleDateString('es-ES', options);
    },
  },
  methods: {
    printCuentas() {
      const printSection = this.$refs.printSection;
      if (!printSection) {
        console.error('Print section not found');
        return;
      }

      const printContent = printSection.innerHTML;
      const printStyles = `
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
          }
          .print-container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
          }
          h1 {
            color: #3760b0;
            text-align: center;
            margin-bottom: 10px;
            font-size: 24px;
          }
          .print-date {
            text-align: center;
            color: #666;
            font-style: italic;
            margin-bottom: 20px;
          }
          .cuenta-list {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
          }
          .cuenta-item {
            width: 45%;
            margin-bottom: 15px;
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          h2 {
            color: #333;
            margin: 0;
            font-size: 18px;
            text-align: center;
          }
        </style>
      `;
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('Unable to open print window');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Cuentas</title>
            ${printStyles}
          </head>
          <body>
            <div class="print-container">
              ${printContent}
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    },
    getDatos({ data, isTwo }) {
      const denominations = isTwo 
        ? [500, 200, 100, 50, 20, 10, 5, 2] 
        : [500, 200, 100, 50, 20, 10, 5, 1];
      
      data.forEach(amount => {
        let remainingAmount = parseInt(amount);
        denominations.forEach(denomination => {
          while (remainingAmount >= denomination) {
            remainingAmount -= denomination;
            this.bills[denomination]++;
          }
        });
      });
    },
  },
};
</script>

<style scoped>
.cuentas-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #3760b0;
  margin-bottom: 20px;
  font-size: 2em;
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 10px;
  font-size: 1.5em;
}

.print-date {
  text-align: center;
  color: #666;
  font-style: italic;
  margin-bottom: 20px;
}

.cuenta-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}

.cuenta-item {
  width: 30%;
  text-align: center;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.print-section {
  padding: 40px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
  font-size: 1.2em;
}

button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2a4a87;
}

@media (max-width: 768px) {
  .cuentas-container {
    padding: 10px;
  }

  .print-section {
    padding: 20px;
    font-size: 1em;
  }

  h1 {
    font-size: 1.5em;
  }

  h2 {
    font-size: 1.2em;
  }

  .cuenta-item {
    width: 45%;
  }
}

@media (max-width: 576px) {
  .cuentas-container {
    padding: 0;
    margin: 0;
    max-width: 100%;
    border-radius: 0;
  }

  h1 {
    font-size: 1.2em;
  }

  h2 {
    font-size: 1em;
  }

  .print-section {
    padding: 15px;
    font-size: 0.9em;
  }

  .cuenta-item {
    width: 100%;
  }
}
</style>
```

# src/Calcular.vue

```vue
<template>
  <div class="calcular-container">
    <b-button @click="processArray" variant="primary">{{ cantidad }}</b-button>
  </div>
</template>
<script>
export default {
  name: "Calcular",
  props: {
    datos: {
      type: String,
      required: true
    },
    cantidad: {
      type: String,
      required: true
    }
  },
  methods: {
    processArray() {
      const processedData = this.datos.split('\n').filter(x => x.trim());
      const isTwo = this.cantidad === "$2";
      this.$emit("dataArray", { data: processedData, isTwo: isTwo });
    },
  },
};
</script>

<style scoped>
.calcular-container {
  margin-bottom: 15px;
}

button {
  width: 100%;
  padding: 10px 20px;
  background-color: #3760b0;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 1.1em;
}

button:hover {
  background-color: #2a4a87;
}

@media (max-width: 768px) {
  button {
    padding: 8px 16px;
    font-size: 1em;
  }
}
</style>

```

# src/App.vue

```vue

<template>
  <div id="app">
    <Navbar />
    <Footer />

  </div>
</template>

<script>
import Navbar from "./NavBar.vue";
import Datos from "./datos.vue";
import Home from "./views/Home.vue";
import Footer from './Footer.vue';

export default {
  name: "app",
  components: {
    Navbar,
    Footer,
    Datos,
    Home,
  },
};
</script>

<style>
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-wrapper {
  flex: 1 0 auto;
}

h1 {
  color: rgb(40, 40, 216);
  text-align: center;
  font-weight: normal;
}
</style>
```

# .vscode/settings.json

```json
{
}
```

# src/views/SaleNote.vue

```vue
<template>
  <div class="sale-note">
    <div class="back-button-container">
      <BackButton to="/NoteMenu" />
    </div>
    <h2>Nota de Venta</h2>
    <div class="folio-date">
      <p><strong>Folio:</strong> {{ formattedFolio }}</p>
      <p><strong>Fecha de Creación:</strong> {{ formattedCreationDate }}</p>
    </div>
    <form @submit.prevent="addProduct">
      <div class="form-row">
        <div>
          <label for="client">Cliente:</label>
          <select v-model="client" required>
            <option v-for="client in clients" :key="client.id" :value="client.name">
              {{ client.name }}
            </option>
          </select>
        </div>
        <div>
          <label for="date">Fecha:</label>
          <DatePicker v-model="currentDate" value-type="format" format="DD MMMM YYYY" placeholder="Selecciona una fecha" />
        </div>
      </div>
      <div class="form-row">

        <div>
          <label for="kilos">Kilos:</label>
          <input type="number" step="0.01" v-model.number="newProduct.kilos" required >
        </div>
        <div>
          <label for="product">Producto:</label>
          <input type="text" id="product" v-model="newProduct.product" required />
        </div>

        <div>
          <label for="pricePerKilo">Precio por Kilo:</label>
          <input type="number" id="pricePerKilo" v-model="newProduct.pricePerKilo" required />
        </div>
        <button type="submit">Agregar Producto</button>
      </div>
    </form>
    <div v-if="products.length || abonos.length">
      <div ref="printSection" class="print-section">
        <div class="folio-date">
          <p><strong>Folio:</strong> {{ formattedFolio }}</p>
          <p><strong>Fecha de Creación:</strong> {{ formattedCreationDate }}</p>
        </div>
        <div v-if="products.length">
          <h3>Resumen</h3>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Kg</th>
                <th>Precio</th>
                <th>Total</th>
                <th class="action-column">Accion</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(product, index) in products" :key="index"
                  @touchstart="startLongPress(index)" 
                  @touchend="endLongPress" 
                  @touchmove="endLongPress">
                <template v-if="editIndex === index">
                  <td><input type="text" v-model="editProduct.product" /></td>
                  <td><input type="number" v-model.number="editProduct.kilos" /></td>
                  <td><input type="number" v-model.number="editProduct.pricePerKilo" /></td>
                  <td>${{ formatNumber(editProduct.kilos * editProduct.pricePerKilo) }}</td>
                  <td class="action-column">
                    <button @click="confirmEdit"><span>&#10004;</span></button>
                    <button @click="cancelEdit"><span>&#10060;</span></button>
                  </td>
                </template>
                <template v-else>
                  <td>{{ product.product }}</td>
                  <td>{{ formatNumber(product.kilos) }}</td>
                  <td>${{ formatNumber(product.pricePerKilo) }}</td>
                  <td>${{ formatNumber(product.total) }}</td>
                  <td class="action-column">
                    <button @click="editProductDetails(index)">Editar</button>
                    <button @click="removeProduct(index)">Borrar</button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
          <div class="total-general">
            <h3>Total General: ${{ formatNumber(grandTotal) }}</h3>
          </div>
        </div>
   
        <div class="abonos-container">
      <div class="abonos-section">
        <h3>Registrar Abonos</h3>
        <form @submit.prevent="addAbono">
          <div class="form-row">
          <div>
            <label for="abonoMonto">Monto del Abono:</label>
            <input type="number" id="abonoMonto" v-model.number="newAbono.monto" required />
          </div>
          <div>
            <label for="abonoFecha">Fecha del Abono:</label>
            <DatePicker v-model="newAbono.fecha" value-type="format" format="DD MMMM YYYY" placeholder="Selecciona una fecha" />
          </div>
        </div>
        <button type="submit" class="add-abono-button">Agregar Abono</button>        </form>
        <div v-if="abonos.length">
          <h3>Abonos Realizados</h3>
          <div class="table-responsive">
            <table class="abonos-table">
              <thead>
                <tr>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(abono, index) in abonos" :key="index">
                  <td>${{ formatNumber(abono.monto) }}</td>
                  <td>{{ formatDate(abono.fecha) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="abonos-summary">
            <p><strong>Total Abonado:</strong> ${{ formatNumber(totalAbonado) }}</p>
            <p><strong>Saldo Restante:</strong> ${{ formatNumber(saldoRestante) }}</p>
            <p class="estado-pago" :class="{ 'pagado': isPaid, 'no-pagado': !isPaid }">
              <strong>Estado:</strong> {{ isPaid ? 'Pagada' : 'No Pagada' }}
            </p>
          </div>
        </div>
      </div>
    </div>

      <button @click="exportPDF">Exportar a PDF</button>
      <button @click="printSection">Imprimir</button>
      <button @click="saveNote">Guardar Nota</button> 
      <button class="delete-note-button" @click="deleteNote">Eliminar Nota</button>
    </div>
    <!-- Modal para acciones móviles -->
    <div v-if="showMobileActions" class="mobile-actions-modal">
      <button @click="editProductDetails(selectedProductIndex)">Editar</button>
    <button @click="removeProduct(selectedProductIndex)">Borrar</button>
    <button v-if="editIndex !== -1" @click="confirmEdit">Confirmar Edición</button>
    <button @click="cancelMobileActions">Cancelar</button>
    </div>
  </div>
  </div>
</template>
<script>
import BackButton from '@/components/BackButton.vue';
import DatePicker from 'vue2-datepicker';
import 'vue2-datepicker/index.css';
import html2pdf from 'html2pdf.js';
import AddClient from '@/components/AddClient.vue';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, setDoc, doc, getDoc, deleteDoc } from "firebase/firestore";

export default {
  components: {
    DatePicker,
    AddClient,
    BackButton
  },
  data() {
    const today = new Date();
    return {
      folio: Math.floor(Math.random() * 10000),
      client: '',
      currentDate: today.toISOString().substr(0, 10),
      newProduct: {
        product: '',
        kilos: null,
        pricePerKilo: null,
        total: 0
      },
      editProduct: {
        product: '',
        kilos: 0,
        pricePerKilo: 0,
        total: 0
      },
      products: [],
      clients: [],
      editIndex: -1,
      newAbono: {
        monto: null,
        fecha: today.toISOString().substr(0, 10)
      },
      abonos: [],
      isPaid: false,
      creationDate: today.toISOString().substr(0, 10),
      noteId: null,
      longPressTimer: null,
      showMobileActions: false,
      selectedProductIndex: null,
    };
  },
  computed: {
    grandTotal() {
      return this.products.reduce((sum, product) => sum + product.total, 0);
    },
    totalAbonado() {
      return this.abonos.reduce((sum, abono) => sum + Number(abono.monto), 0);
    },
    saldoRestante() {
      return this.grandTotal - this.totalAbonado;
    },
    formattedFolio() {
      return `F-${this.folio.toString().padStart(4, '0')}`;
    },
    formattedCreationDate() {
      return this.formatDate(this.creationDate);
    }
  },
  watch: {
    saldoRestante(newVal) {
      this.isPaid = newVal <= 0;
    }
  },
  methods: {
    async deleteNote() {
      if (this.noteId) {
        if (confirm("¿Estás seguro de que quieres eliminar esta nota?")) {
          try {
            await deleteDoc(doc(db, "notes", this.noteId));
            alert("Nota eliminada con éxito");
            this.$router.push({ name: 'NoteMenu' });
          } catch (error) {
            console.error("Error al eliminar la nota: ", error);
            alert(`Error al eliminar la nota: ${error.message}`);
          }
        }
      } else {
        alert("El ID de la nota no está definido");
      }
    },
    async saveNote() {
      try {
        const noteData = {
          folio: this.folio,
          client: this.client,
          currentDate: this.currentDate,
          products: this.products,
          abonos: this.abonos,
          isPaid: this.isPaid,
          creationDate: this.creationDate
        };
        if (this.noteId) {
          await setDoc(doc(db, 'notes', this.noteId), noteData);
        } else {
          const docRef = await addDoc(collection(db, 'notes'), noteData);
          this.noteId = docRef.id;
        }
        alert('Nota guardada exitosamente.');
        this.$router.push({ name: 'NoteMenu' });
      } catch (error) {
        console.error('Error saving note: ', error);
        alert('Hubo un error al guardar la nota.');
      }
    },
    async addProduct() {
      this.newProduct.total = this.newProduct.kilos * this.newProduct.pricePerKilo;
      this.products.push({ ...this.newProduct });
      this.resetForm();
    },
    resetForm() {
      this.newProduct = {
        product: '',
        kilos: null,
        pricePerKilo: null,
        total: 0
      };
    },
    removeProduct(index) {
      this.products.splice(index, 1);
      this.showMobileActions = false;
    },
    editProductDetails(index) {
      this.editIndex = index;
      this.editProduct = { ...this.products[index] };
      // No cerramos el modal aquí para permitir la confirmación en móvil
    },
    confirmEdit() {
      if (this.editIndex !== -1) {
        this.editProduct.total = this.editProduct.kilos * this.editProduct.pricePerKilo;
        this.products[this.editIndex] = { ...this.editProduct };
        this.editIndex = -1;
        this.showMobileActions = false;
      }
    },
    cancelEdit() {
      this.editIndex = -1;
    },
    async fetchClients() {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        this.clients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error fetching clients: ', error);
      }
    },
    async fetchNoteData() {
      try {
        const docRef = doc(db, 'notes', this.noteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const noteData = docSnap.data();
          this.folio = noteData.folio;
          this.client = noteData.client;
          this.currentDate = noteData.currentDate;
          this.products = noteData.products;
          this.abonos = noteData.abonos;
          this.isPaid = noteData.isPaid;
          this.creationDate = noteData.creationDate;
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching note: ', error);
      }
    },
    addAbono() {
      this.abonos.push({ ...this.newAbono });
      this.resetAbonoForm();
    },
    resetAbonoForm() {
      this.newAbono = {
        monto: null,
        fecha: new Date().toISOString().substr(0, 10)
      };
    },
    formatNumber(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },
    formatDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(date).toLocaleDateString('es-ES', options);
    },
    exportPDF() {
      const element = this.$refs.printSection;
      const options = {
        margin: 0.5,
        filename: `Nota_de_Venta_${this.formattedFolio}_${new Date().toLocaleDateString()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      const clonedElement = element.cloneNode(true);
      const buttons = clonedElement.querySelectorAll('button');
      buttons.forEach(button => button.style.display = 'none');
      const actionColumns = clonedElement.querySelectorAll('td:nth-child(5), th:nth-child(5)');
      actionColumns.forEach(column => column.style.display = 'none');
      const abonosForm = clonedElement.querySelector('.abonos-section form');
      if (abonosForm) abonosForm.style.display = 'none';
      const abonosTitle = clonedElement.querySelector('.abonos-section h3:first-child');
      if (abonosTitle) abonosTitle.style.display = 'none';
      html2pdf().from(clonedElement).set(options).save();
    },
    printSection() {
      const printContent = this.$refs.printSection.cloneNode(true);
      const buttons = printContent.querySelectorAll('button');
      buttons.forEach(button => button.style.display = 'none');
      const actionColumns = printContent.querySelectorAll('td:nth-child(5), th:nth-child(5)');
      actionColumns.forEach(column => column.style.display = 'none');
      const abonosForm = printContent.querySelector('.abonos-section form');
      if (abonosForm) abonosForm.style.display = 'none';
      const abonosTitle = printContent.querySelector('.abonos-section h3:first-child');
      if (abonosTitle) abonosTitle.style.display = 'none';

      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write('<html><head><title>Nota de Venta</title>');
      printWindow.document.write('</head><body >');
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    },
    startLongPress(index) {
      this.longPressTimer = setTimeout(() => {
        this.showMobileActions = true;
        this.selectedProductIndex = index;
      }, 500);
    },
    endLongPress() {
      clearTimeout(this.longPressTimer);
    },
    cancelMobileActions() {
      this.showMobileActions = false;
      this.selectedProductIndex = null;
      this.editIndex = -1;
    },
  },
  async mounted() {
    this.fetchClients();
    if (this.$route.params.noteId) {
      this.noteId = this.$route.params.noteId;
      await this.fetchNoteData();
    }
  }
};
</script><style scoped>
.sale-note {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2a4a87;
}

.container {
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  max-width: 100%;
  box-sizing: border-box;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.folio-date {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1em;
}

.folio-date p {
  margin: 0;
  font-size: 1.1em;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  margin-bottom: 1em;
}

.form-row div {
  flex: 1;
  min-width: 120px;
}

.sale-note label {
  display: block;
  margin-bottom: 0.5em;
  margin: 0 auto;
}

.sale-note input, .sale-note select {
  width: 100%;
  padding: 0.5em;
  box-sizing: border-box;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.sale-note .action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 1em;
}

.sale-note .save-button {
  background-color: #28a745;
}

.sale-note .save-button:hover {
  background-color: #218838;
}

.sale-note .delete-note-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  margin: 5px 0;
  cursor: pointer;
  border-radius: 20px;
}

.sale-note .delete-note-button:hover {
  background-color: #c82333;
}

.table-responsive {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1em;
}

table, th, td {
  border: 1px solid #ccc;
}

th, td {
  padding: 0.5em;
  text-align: center;
}

th {
  background-color: #f8f8f8;
}

.total-general {
  margin-top: 1em;
}

.abonos-container {
  margin-top: 2em;
  padding: 1em;
  border-top: 1px solid #ccc;
}

.abonos-section h3 {
  margin-top: 1em;
  color: #3760b0;
}

.abonos-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1em;
}

.abonos-table th,
.abonos-table td {
  padding: 0.75em;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.abonos-table th {
  background-color: #f8f8f8;
  font-weight: bold;
  color: #3760b0;
}

.abonos-summary {
  margin-top: 1em;
  font-size: 1.1em;
}

.estado-pago {
  font-weight: bold;
}

.pagado {
  color: green;
}

.no-pagado {
  color: red;
}

.print-section {
  margin-bottom: 1em;
}

.back-button-container {
  text-align: left;
  margin-top: 20px;
}

.mobile-actions-modal {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.mobile-actions-modal button {
  width: 100%;
  padding: 15px 20px;
  margin-bottom: 10px;
  border: none;
  background-color: #3760b0;
  color: white;
  border-radius: 5px;
  font-size: 16px;
}

.mobile-actions-modal button:last-child {
  margin-bottom: 0;
}

.mobile-actions-modal button:nth-child(3) {
  background-color: #28a745; /* Color verde para el botón de confirmar */
}

.add-abono-button {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: 1em;
  width: 100%;
}

.add-abono-button:hover {
  background-color: #218838;
}

@media (max-width: 768px) {
  .folio-date {
    flex-direction: column;
  }

  .folio-date p {
    text-align: left;
  }

  .form-row {
    flex-direction: column;
  }

  .form-row div {
    width: 100%;
    margin-bottom: 1em;
  }

  .action-column {
    display: none;
  }

  table th,
  table td {
    width: 25%;
  }

  table {
    font-size: 0.9em;
  }

  th, td {
    padding: 0.3em;
  }

  table tr {
    position: relative;
  }

  table tr::after {
    content: '⋮';
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.5em;
    color: #3760b0;
  }

  .abonos-table {
    font-size: 0.9em;
  }

  .abonos-table thead {
    display: table-header-group;
  }

  .abonos-table tbody {
    display: table-row-group;
  }

  .abonos-table tr {
    display: table-row;
  }

  .abonos-table th,
  .abonos-table td {
    display: table-cell;
    width: 50%;
    padding: 0.5em;
  }

  .abonos-table th {
    text-align: center;
    background-color: #f0f0f0;
  }

  .abonos-table td {
    text-align: center;
  }

  .add-abono-button {
    width: 100%;
    margin-top: 1em;
  }
}
</style>
```

# src/views/SacadasMenu.vue

```vue
<template>
  <div class="sacadas-menu-container">
    <h1>Menú de Sacadas</h1>
    
    <div class="actions-container">
      <router-link to="/sacadas/new" class="action-button new-sacada-btn">
        Nueva Sacada
      </router-link>
      <router-link to="/gestionar-productos" class="action-button">
        Gestionar Productos
      </router-link>
    </div>

    <div class="sacadas-list">
      <h2>Registros de Sacadas</h2>
      <div v-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="sacadas.length === 0" class="no-records">
        No hay registros de sacadas.
      </div>
      <ul v-else>
        <li v-for="sacada in sacadas" :key="sacada.id" class="sacada-item">
          <div class="sacada-content" @click="editSacada(sacada.id)">
            <span class="sacada-date">{{ formatDate(sacada.fecha) }}</span>
            <div class="sacada-summary">
              <span>Entradas: {{ formatNumber(sacada.totalEntradas) }} kg</span>
              <span>Salidas: {{ formatNumber(sacada.totalSalidas) }} kg</span>
            </div>
          </div>
          <div class="sacada-actions">
            <button @click.stop="deleteSacada(sacada.id)" class="delete-btn">Borrar</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, Timestamp, deleteDoc, doc } from 'firebase/firestore';

export default {
  name: 'SacadasMenu',
  data() {
    return {
      sacadas: [],
      isLoading: true
    };
  },
  methods: {
    convertToDate(dateField) {
      if (dateField instanceof Timestamp) {
        return dateField.toDate();
      } else if (dateField && typeof dateField.toDate === 'function') {
        return dateField.toDate();
      } else if (dateField && dateField.seconds) {
        return new Date(dateField.seconds * 1000);
      } else if (dateField instanceof Date) {
        return dateField;
      } else if (typeof dateField === 'string') {
        return new Date(dateField);
      }
      return null;
    },
    async loadSacadas() {
      try {
        this.isLoading = true;
        const sacadasCollection = collection(db, 'sacadas');
        const q = query(sacadasCollection, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        this.sacadas = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            fecha: this.convertToDate(data.fecha),
            totalEntradas: data.totalEntradas || 0,
            totalSalidas: data.totalSalidas || 0
          };
        });
      } catch (error) {
        console.error("Error al cargar sacadas: ", error);
        this.sacadas = [];
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(date) {
      if (!(date instanceof Date) || isNaN(date)) {
        return 'Fecha no disponible';
      }
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    formatNumber(value) {
      return (value || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },
    editSacada(id) {
      this.$router.push(`/sacadas/${id}`);
    },
    async deleteSacada(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de sacadas?')) {
        try {
          await deleteDoc(doc(db, 'sacadas', id));
          this.sacadas = this.sacadas.filter(sacada => sacada.id !== id);
          alert('Registro de sacadas borrado con éxito');
        } catch (error) {
          console.error("Error al borrar el registro de sacadas: ", error);
          alert('Error al borrar el registro de sacadas');
        }
      }
    }
  },
  mounted() {
    this.loadSacadas();
  }
};
</script>



<style scoped>
.sacadas-menu-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px); /* Ajusta 160px según la altura de tu navbar + footer */
  display: flex;
  flex-direction: column;
}

h1, h2 {
  color: #3760b0;
}

.actions-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.action-button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.action-button:hover {
  background-color: #2a4a87;
}

.sacadas-list {
  background-color: #f0f4f8;
  border-radius: 8px;
  padding: 20px;
  flex-grow: 1;
}

.loading, .no-records {
  text-align: center;
  color: #666;
  padding: 20px;
}

.sacada-item {
  background-color: white;
  border-radius: 4px;
  margin-bottom: 10px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sacada-content {
  flex-grow: 1;
  cursor: pointer;
}

.sacada-date {
  color: #3760b0;
  font-weight: bold;
  font-size: 1.1em;
}

.sacada-summary {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.9em;
  color: #666;
}

.sacada-actions {
  display: flex;
  align-items: center;
}

.delete-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

@media (max-width: 600px) {
  .actions-container {
    flex-direction: column;
  }

  .action-button {
    width: 100%;
    margin-bottom: 10px;
  }

  .sacada-item {
    flex-direction: column;
    align-items: stretch;
  }

  .sacada-summary {
    flex-direction: column;
  }

  .sacada-actions {
    margin-top: 10px;
    justify-content: flex-end;
  }
}
</style>
```

# src/views/Sacadas.vue

```vue
<template>
    <div class="sacadas-container" v-if="isLoaded">
      <div class="back-button-container">
        <BackButton to="/sacadas" />
      </div>
      <h2 class="date-header">{{ formattedDate }}</h2>
      <div class="sacadas-content">
        <div class="entradas-section">
          <h3>Entradas</h3>
          <div class="input-group">
            <select v-model="newEntrada.tipo" required @change="resetEntradaSelections">
              <option value="">Tipo</option>
              <option value="proveedor">Proveedor</option>
              <option value="maquila">Maquila</option>
            </select>
            <select v-model="newEntrada.proveedor" required>
              <option value="">{{ newEntrada.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}</option>
              <option v-for="prov in filteredProveedoresEntrada" :key="prov.id" :value="prov.nombre">
                {{ prov.nombre }}
              </option>
            </select>
            <select v-model="newEntrada.medida" required>
              <option value="">Medida</option>
              <option v-for="medida in filteredMedidasEntrada" :key="medida.id" :value="medida.nombre">
                {{ medida.nombre }}
              </option>
            </select>
            <input 
      v-model.number="newEntrada.kilos" 
      type="number" 
      inputmode="decimal" 
      step="0.1" 
      pattern="[0-9]*" 
      placeholder="Kilos" 
      required 
    />               <button @click="addEntrada">Agregar Entrada</button>
          </div>
          <ul class="list">
            <li v-for="(entrada, index) in entradas" :key="'entrada-' + index">
              {{ entrada.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}: {{ entrada.proveedor }} - {{ entrada.medida }}: {{ formatNumber(entrada.kilos) }} kg
              <button @click="removeEntrada(index)" class="delete-btn">&times;</button>
            </li>
          </ul>
          <p class="total">Total Entradas: {{ formatNumber(totalEntradas) }} kg</p>
        </div>
        
        <div class="salidas-section">
          <h3>Salidas</h3>
          <div class="input-group">
            <select v-model="newSalida.tipo" required @change="resetSalidaSelections">
              <option value="">Tipo</option>
              <option value="proveedor">Proveedor</option>
              <option value="maquila">Maquila</option>
            </select>
            <select v-model="newSalida.proveedor" required>
              <option value="">{{ newSalida.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}</option>
              <option v-for="prov in filteredProveedoresSalida" :key="prov.id" :value="prov.nombre">
                {{ prov.nombre }}
              </option>
            </select>
            <select v-model="newSalida.medida" required>
              <option value="">Medida</option>
              <option v-for="medida in filteredMedidasSalida" :key="medida.id" :value="medida.nombre">
                {{ medida.nombre }}
              </option>
            </select>
            <input 
      v-model.number="newSalida.kilos" 
      type="number" 
      inputmode="decimal" 
      step="0.1" 
      pattern="[0-9]*" 
      placeholder="Kilos" 
      required 
    />            <button @click="addSalida">Agregar Salida</button>
          </div>
          <ul class="list">
            <li v-for="(salida, index) in salidas" :key="'salida-' + index">
              {{ salida.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}: {{ salida.proveedor }} - {{ salida.medida }}: {{ formatNumber(salida.kilos) }} kg
              <button @click="removeSalida(index)" class="delete-btn">&times;</button>
            </li>
          </ul>
          <p class="total">Total Salidas: {{ formatNumber(totalSalidas) }} kg</p>
        </div>
      </div>
      
      <div class="summary">
        <h3>Resumen del Día</h3>
        <p>Total Entradas: {{ formatNumber(totalEntradas) }} kg</p>
        <p>Total Salidas: {{ formatNumber(totalSalidas) }} kg</p>
      </div>
      
      <button @click="saveReport" class="save-button">{{ isEditing ? 'Actualizar' : 'Guardar' }} Informe del Día</button>
    </div>
  </template>
  
  <script>
  import { db } from '@/firebase';
  import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
  import BackButton from '../components/BackButton.vue';
  
  export default {
    name: 'Sacadas',
    components: {
      BackButton
    },
    data() {
      return {
        currentDate: new Date(),
        entradas: [],
        salidas: [],
        proveedores: [],
        medidas: [],
        newEntrada: { tipo: 'proveedor', proveedor: '', medida: '', kilos: null },
        newSalida: { tipo: 'proveedor', proveedor: '', medida: '', kilos: null },
        isEditing: false,
        sacadaId: null,
        isLoaded: false
      };
    },
    computed: {
      formattedDate() {
        return this.currentDate.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
      },
      filteredProveedoresEntrada() {
        return this.proveedores.filter(p => p.tipo === this.newEntrada.tipo);
      },
      filteredProveedoresSalida() {
        return this.proveedores.filter(p => p.tipo === this.newSalida.tipo);
      },
      filteredMedidasEntrada() {
        if (this.newEntrada.tipo === 'maquila') {
          const maquila = this.proveedores.find(p => p.nombre === this.newEntrada.proveedor);
          return maquila ? this.medidas.filter(m => m.tipo === 'maquila' && m.maquilaId === maquila.id) : [];
        } else {
          return this.medidas.filter(m => m.tipo === 'general');
        }
      },
      filteredMedidasSalida() {
        if (this.newSalida.tipo === 'maquila') {
          const maquila = this.proveedores.find(p => p.nombre === this.newSalida.proveedor);
          return maquila ? this.medidas.filter(m => m.tipo === 'maquila' && m.maquilaId === maquila.id) : [];
        } else {
          return this.medidas.filter(m => m.tipo === 'general');
        }
      },
      totalEntradas() {
        return Number(this.entradas.reduce((total, entrada) => total + entrada.kilos, 0).toFixed(1));
      },
      totalSalidas() {
        return Number(this.salidas.reduce((total, salida) => total + salida.kilos, 0).toFixed(1));
      }
    },
    methods: {
      async loadProveedores() {
        const querySnapshot = await getDocs(collection(db, 'proveedores'));
        this.proveedores = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
      async loadMedidas() {
        const querySnapshot = await getDocs(collection(db, 'medidas'));
        this.medidas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
      resetEntradaSelections() {
        this.newEntrada.proveedor = '';
        this.newEntrada.medida = '';
      },
      resetSalidaSelections() {
        this.newSalida.proveedor = '';
        this.newSalida.medida = '';
      },
      addEntrada() {
        if (this.newEntrada.tipo && this.newEntrada.proveedor && this.newEntrada.medida && this.newEntrada.kilos) {
          this.entradas.push({
            tipo: this.newEntrada.tipo,
            proveedor: this.newEntrada.proveedor,
            medida: this.newEntrada.medida,
            kilos: Number(this.newEntrada.kilos.toFixed(1))
          });
          this.newEntrada = { tipo: 'proveedor', proveedor: '', medida: '', kilos: null };
        }
      },
      addSalida() {
        if (this.newSalida.tipo && this.newSalida.proveedor && this.newSalida.medida && this.newSalida.kilos) {
          this.salidas.push({
            tipo: this.newSalida.tipo,
            proveedor: this.newSalida.proveedor,
            medida: this.newSalida.medida,
            kilos: Number(this.newSalida.kilos.toFixed(1))
          });
          this.newSalida = { tipo: 'proveedor', proveedor: '', medida: '', kilos: null };
        }
      },
      removeEntrada(index) {
        this.entradas.splice(index, 1);
      },
      removeSalida(index) {
        this.salidas.splice(index, 1);
      },
      formatNumber(value) {
        return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      },
      async loadSacada(id) {
        console.log("Cargando sacada con ID:", id);
        const docRef = doc(db, 'sacadas', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          console.log("Documento encontrado:", docSnap.data());
          const data = docSnap.data();
          this.currentDate = data.fecha instanceof Date ? data.fecha : data.fecha.toDate();
          console.log("Fecha cargada:", this.currentDate);
          this.entradas = data.entradas || [];
          console.log("Entradas cargadas:", this.entradas);
          this.salidas = data.salidas || [];
          console.log("Salidas cargadas:", this.salidas);
          this.sacadaId = id;
          this.isEditing = true;
        } else {
          console.log("No se encontró el documento con ID:", id);
        }
      },
      async saveReport() {
        try {
          const reportData = {
            fecha: this.currentDate,
            entradas: this.entradas,
            salidas: this.salidas,
            totalEntradas: this.totalEntradas,
            totalSalidas: this.totalSalidas
          };
  
          if (this.isEditing) {
            await updateDoc(doc(db, 'sacadas', this.sacadaId), reportData);
            alert("Informe del día actualizado exitosamente");
          } else {
            await addDoc(collection(db, 'sacadas'), reportData);
            alert("Informe del día guardado exitosamente");
          }
          // Redirigir a la lista de sacadas o reiniciar el formulario según sea necesario
        } catch (error) {
          console.error("Error al guardar/actualizar el documento: ", error);
          alert("Error al guardar/actualizar el informe del día: " + error.message);
        }
      }
    },
    async created() {
      await this.loadProveedores();
      await this.loadMedidas();
      if (this.$route.params.id) {
        console.log("ID de la ruta encontrado:", this.$route.params.id);
        await this.loadSacada(this.$route.params.id);
      } else {
        console.log("No se encontró ID en la ruta");
      }
      this.isLoaded = true;
    }
  };
  </script>

  
  <style scoped>
  .sacadas-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
    background-color: #e8f0fe;
    border-radius: 20px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .date-header {
    text-align: center;
    color: #3760b0;
    font-size: 1.5em;
    margin-bottom: 20px;
  }
  
  .sacadas-content {
    display: flex;
    justify-content: space-between;
  }
  
  .entradas-section, .salidas-section {
    width: 48%;
  }
  
  h3 {
    color: #3760b0;
    border-bottom: 2px solid #3760b0;
    padding-bottom: 10px;
  }
  
  .input-group {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .input-group select,
  .input-group input {
    flex: 1;
    min-width: 120px;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .input-group select {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
    background-repeat: no-repeat;
    background-position: right 10px top 50%;
    background-size: 12px auto;
    padding-right: 30px;
  }
  
  button {
    background-color: #3760b0;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s, transform 0.1s;
    font-size: 14px;
  }
  
  button:hover {
    background-color: #2a4a87;
  }
  
  button:active {
    transform: scale(0.98);
  }
  
  .list {
    list-style-type: none;
    padding: 0;
  }
  
  .list li {
    background-color: white;
    margin-bottom: 10px;
    padding: 12px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  }
  
  .delete-btn {
    background-color: transparent;
    color: #ff4136;
    border: none;
    font-size: 1.2em;
    cursor: pointer;
    padding: 0 5px;
    transition: color 0.3s;
  }
  
  .delete-btn:hover {
    color: #d50000;
  }
  
  .total {
    font-weight: bold;
    color: #3760b0;
    font-size: 16px;
    margin-top: 15px;
  }
  
  .summary {
    margin-top: 30px;
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .summary h3 {
    color: #3760b0;
    border-bottom: none;
    margin-bottom: 15px;
  }
  
  .summary p {
    margin: 10px 0;
    font-size: 16px;
  }
  
  .save-button {
    display: block;
    width: 100%;
    margin-top: 20px;
    padding: 12px;
    font-size: 1.1em;
    background-color: #28a745;
  }
  
  .save-button:hover {
    background-color: #218838;
  }
  
  @media (max-width: 768px) {
    .sacadas-content {
      flex-direction: column;
    }
  
    .entradas-section, .salidas-section {
      width: 100%;
      margin-bottom: 30px;
    }
  
    .input-group {
      flex-direction: column;
    }
  
    .input-group select,
    .input-group input,
    .input-group button {
      width: 100%;
    }
  }
  </style>
```

# src/views/NoteMenu.vue

```vue
<template>
  <div class="notes-wrapper">
    <div class="button-container">
      <div class="button-wrapper">
        <button @click="goToSaleNote">Nueva nota</button>
      </div>
      <div class="button-wrapper">
        <button @click="goToAddClient">Agregar Cliente</button>
      </div>
    </div>

    <div class="notes-container">
      <div class="filter-container">
        <select v-model="paymentFilter">
          <option value="all">Todas</option>
          <option value="paid">Pagadas</option>
          <option value="unpaid">No Pagadas</option>
        </select>
      </div>
      <h2>Notas por Cliente</h2>
      <div v-for="(notes, client) in filteredNotesByClient" :key="client">
        <details>
          <summary>
            {{ client }} - Debe: {{ totalDebtByClient[client] | currency }} 
            <span class="note-count">({{ notes.length }})</span>
          </summary>
          <ul>
            <li v-for="note in notes" :key="note.id">
              <button @click="goToEditNote(note.id)" tabindex="0">
                Nota {{ note.folio }} - {{ note.currentDate }}
              </button>
            </li>
          </ul>
          <div class="client-actions">
            <button @click="showAbonoModal(client)" class="abono-button">Realizar Abono</button>
            <button @click="showAbonosHistory(client)" class="abonos-history-button">Ver Abonos</button>
          </div>
        </details>
      </div>
    </div>

    <!-- Modal para realizar abono -->
    <div v-if="showModal" class="modal">
      <div class="modal-content">
        <h2>Realizar Abono para {{ selectedClient }}</h2>
        <input v-model.number="abonoAmount" type="number" placeholder="Cantidad a abonar">
        <button @click="realizarAbono">Confirmar Abono</button>
        <button @click="closeModal">Cancelar</button>
      </div>
    </div>

    <!-- Modal para mostrar historial de abonos -->
    <div v-if="showAbonosHistoryModal" class="modal">
      <div class="modal-content">
        <h2>Historial de Abonos para {{ selectedClient }}</h2>
        <table class="abonos-history-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(abono, index) in paginatedAbonos" :key="index">
              <td>{{ formatDate(abono.fecha) }}</td>
              <td>{{ abono.monto | currency }}</td>
              <td>
                <button @click="openDeleteAbonoModal(abono.globalIndex)" class="delete-button">Borrar</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination">
          <button @click="prevPage" :disabled="currentPage === 1">Anterior</button>
          <span>Página {{ currentPage }} de {{ totalPages }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages">Siguiente</button>
        </div>
        <button @click="closeAbonosHistoryModal">Cerrar</button>
      </div>
    </div>

    <!-- Modal para confirmar borrado de abono -->
    <div v-if="showDeleteAbonoModal" class="modal">
      <div class="modal-content">
        <h2>Confirmar borrado de abono</h2>
        <p>¿Estás seguro de que quieres borrar este abono?</p>
        <button @click="deleteAbono">Confirmar</button>
        <button @click="closeDeleteAbonoModal">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, deleteDoc } from "firebase/firestore";

export default {
  name: 'NoteMenu',
  data() {
    return {
      notesByClient: {},
      paymentFilter: 'unpaid',
      showModal: false,
      selectedClient: '',
      abonoAmount: 0,
      showAbonosHistoryModal: false,
      clientAbonosHistory: [],
      showDeleteAbonoModal: false,
      selectedAbonoIndex: null,
      selectedAbonoNote: null,
      currentPage: 1,
      abonosPerPage: 7,
    };
  },
  methods: {
    goToSaleNote() {
      this.$router.push({ name: 'SaleNote' });
    },
    goToAddClient() {
      this.$router.push({ name: 'AddClient' });
    },
    async fetchNotes() {
      try {
        const querySnapshot = await getDocs(collection(db, 'notes'));
        const notes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        this.notesByClient = notes.reduce((acc, note) => {
          if (!acc[note.client]) {
            acc[note.client] = [];
          }
          acc[note.client].push(note);
          return acc;
        }, {});

        for (let client in this.notesByClient) {
          this.notesByClient[client].sort((a, b) => new Date(b.currentDate) - new Date(a.currentDate));
        }
      } catch (error) {
        console.error('Error fetching notes: ', error);
      }
    },
    goToEditNote(noteId) {
      this.$router.push({ name: 'editar-nota', params: { noteId } });
    },
    showAbonoModal(client) {
      this.selectedClient = client;
      this.abonoAmount = '';
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.selectedClient = '';
      this.abonoAmount = 0;
    },
    async realizarAbono() {
      if (this.abonoAmount <= 0) {
        alert('Por favor ingrese una cantidad válida');
        return;
      }

      let remainingAbono = this.abonoAmount;
      const notesToUpdate = [];
      const today = new Date();

      const clientNotes = [...this.notesByClient[this.selectedClient]]
        .sort((a, b) => new Date(a.currentDate) - new Date(b.currentDate))
        .filter(note => !note.isPaid);

      for (let note of clientNotes) {
        if (remainingAbono <= 0) break;

        const noteTotal = note.products.reduce((sum, product) => sum + (product.kilos * product.pricePerKilo), 0);
        const notePaid = note.abonos.reduce((sum, abono) => sum + abono.monto, 0);
        const noteRemaining = noteTotal - notePaid;

        if (noteRemaining > 0) {
          const abonoToApply = Math.min(remainingAbono, noteRemaining);
          note.abonos.push({
            monto: abonoToApply,
            fecha: today.toISOString().split('T')[0]
          });
          note.isPaid = (noteTotal <= notePaid + abonoToApply);
          remainingAbono -= abonoToApply;
          notesToUpdate.push(note);
        }
      }

      try {
        for (let note of notesToUpdate) {
          const noteRef = doc(db, 'notes', note.id);
          await updateDoc(noteRef, {
            abonos: note.abonos,
            isPaid: note.isPaid
          });
        }
        alert('Abono aplicado con éxito');
        this.closeModal();
        await this.fetchNotes();
      } catch (error) {
        console.error('Error al actualizar las notas:', error);
        alert('Hubo un error al aplicar el abono');
      }
    },
    async showAbonosHistory(client) {
      this.selectedClient = client;
      this.clientAbonosHistory = [];
      this.currentPage = 1;
      
      const clientNotes = this.notesByClient[client];
      
      let globalIndex = 0;
      for (let note of clientNotes) {
        if (note.abonos && note.abonos.length > 0) {
          note.abonos.forEach((abono, index) => {
            this.clientAbonosHistory.push({
              ...abono,
              noteId: note.id,
              abonoIndex: index,
              globalIndex: globalIndex++
            });
          });
        }
      }
      
      this.clientAbonosHistory.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
      this.showAbonosHistoryModal = true;
    },
    closeAbonosHistoryModal() {
      this.showAbonosHistoryModal = false;
      this.clientAbonosHistory = [];
    },
    formatDate(dateString) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('es-ES', options);
    },
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
      }
    },
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
      }
    },
    openDeleteAbonoModal(globalIndex) {
      const abono = this.clientAbonosHistory[globalIndex];
      this.selectedAbonoIndex = abono.abonoIndex;
      this.selectedAbonoNote = abono.noteId;
      this.showDeleteAbonoModal = true;
    },
    async deleteAbono() {
      if (this.selectedAbonoNote) {
        try {
          const noteRef = doc(db, 'notes', this.selectedAbonoNote);
          const noteDoc = await getDoc(noteRef);
          
          if (noteDoc.exists()) {
            const noteData = noteDoc.data();
            const updatedAbonos = noteData.abonos.filter((_, index) => index !== this.selectedAbonoIndex);
            
            await updateDoc(noteRef, { abonos: updatedAbonos });
            
            // Actualizar el estado local
            this.clientAbonosHistory = this.clientAbonosHistory.filter(abono => 
              !(abono.noteId === this.selectedAbonoNote && abono.abonoIndex === this.selectedAbonoIndex)
            );
            
            // Actualizar notesByClient
            const clientNoteIndex = this.notesByClient[this.selectedClient].findIndex(note => note.id === this.selectedAbonoNote);
            if (clientNoteIndex !== -1) {
              this.notesByClient[this.selectedClient][clientNoteIndex].abonos = updatedAbonos;
            }
            
            this.closeDeleteAbonoModal();
            
            // Ajustar la página actual si es necesario
            this.currentPage = Math.min(this.currentPage, this.totalPages);
            
            alert('Abono eliminado con éxito');
            await this.fetchNotes(); // Actualizar las notas después de eliminar el abono
          }
        } catch (error) {
          console.error('Error al eliminar el abono:', error);
          alert('Hubo un error al eliminar el abono');
        }
      }
    },
    closeDeleteAbonoModal() {
      this.showDeleteAbonoModal = false;
      this.selectedAbonoIndex = null;
      this.selectedAbonoNote = null;
    },
  },
  computed: {
    filteredNotesByClient() {
      const filtered = {};
      for (const [client, notes] of Object.entries(this.notesByClient)) {
        filtered[client] = notes.filter(note => 
          this.paymentFilter === 'all' || 
          (this.paymentFilter === 'paid' ? note.isPaid : !note.isPaid)
        );
        if (filtered[client].length === 0) {
          delete filtered[client];
        }
      }
      return filtered;
    },
    totalDebtByClient() {
      const debtByClient = {};
      for (const [client, notes] of Object.entries(this.notesByClient)) {
        debtByClient[client] = notes.reduce((total, note) => {
          const noteDebt = note.products.reduce((sum, product) => sum + (product.kilos * product.pricePerKilo), 0) - note.abonos.reduce((sum, abono) => sum + abono.monto, 0);
          return total + (note.isPaid ? 0 : noteDebt);
        }, 0);
      }
      return debtByClient;
    },
    paginatedAbonos() {
      const start = (this.currentPage - 1) * this.abonosPerPage;
      const end = start + this.abonosPerPage;
      return this.clientAbonosHistory.slice(start, end);
    },
    totalPages() {
      return Math.ceil(this.clientAbonosHistory.length / this.abonosPerPage);
    }
  },
  filters: {
    currency(value) {
      if (!value) return '$0.00';
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    }
  },
  async mounted() {
    await this.fetchNotes();
  }
};
</script>

<style scoped>
.notes-wrapper {
  padding: 20px;
}

.button-container {
  text-align: center;
  margin-bottom: 20px;
}

.button-wrapper {
  display: inline-block;
  margin-right: 10px;
}

button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2a4a87;
}

.filter-container {
  margin-bottom: 20px;
}

.filter-container select {
  padding: 10px 20px;
  border: 2px solid #ccc;
  border-radius: 20px;
  background-color: white;
  transition: border-color 0.3s;
}

.filter-container select:focus {
  border-color: #3760b0;
}

.notes-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #e8f0fe;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.notes-container h2 {
  text-align: center;
  color: #3760b0;
  margin-bottom: 20px;
}

details {
  margin-bottom: 20px;
  border: 2px solid #ccc;
  border-radius: 20px;
  padding: 10px;
  background-color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

summary {
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #3760b0, #2a4a87);
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background 0.3s;
}

summary:hover {
  background: linear-gradient(135deg, #2a4a87, #3760b0);
}

.note-count {
  background-color: #ffc107;
  color: #000;
  border-radius: 50%;
  padding: 10px 15px;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.note-count:hover {
  transform: scale(1.2);
}

ul {
  list-style-type: none;
  padding-left: 20px;
  margin-top: 10px;
}

li {
  margin-bottom: 10px;
}

li button {
  background-color: transparent;
  border: none;
  color: #3760b0;
  text-decoration: underline;
  cursor: pointer;
  font-weight: bold;
  transition: color 0.3s, background-color 0.3s;
}

li button:hover {
  color: white;
  background-color: #2a4a87;
  border-radius: 5px;
  padding: 5px 10px;
}

.client-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.abono-button,
.abonos-history-button {
  flex: 1;
  margin: 0 5px;
}

.abono-button {
  background-color: #4CAF50;
}

.abono-button:hover {
  background-color: #45a049;
}

.abonos-history-button {
  background-color: #17a2b8;
}

.abonos-history-button:hover {
  background-color: #138496;
}

.modal {
  position: fixed;
  z-index: 1;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: #fefefe;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
  max-width: 500px;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.modal-content input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.modal-content button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin: 5px;
}

.modal-content button:hover {
  background-color: #2a4a87;
}

.abonos-history-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.abonos-history-table th,
.abonos-history-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.abonos-history-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.delete-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.delete-button:hover {
  background-color: #c82333;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.pagination button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.pagination button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.pagination span {
  font-weight: bold;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    padding: 15px;
  }

  .client-actions {
    flex-direction: column;
  }

  .abono-button,
  .abonos-history-button {
    width: 100%;
    margin: 5px 0;
  }

  .abonos-history-table {
    font-size: 14px;
  }

  .abonos-history-table th,
  .abonos-history-table td {
    padding: 6px;
  }

  .pagination {
    flex-direction: column;
    align-items: center;
  }

  .pagination button {
    margin: 5px 0;
  }
}
</style>
```

# src/views/NewNoteBtn.vue

```vue
<template>
    <button @click="handleClick">Haz clic aquí</button>
</template>

<script>
export default {
    methods: {
        handleClick() {
            this.$router.push('/sale-note');
        }
    }
}
</script>
<style scoped>
button {
    background-color:  rgb(40, 40, 216);
    border: none;
    color: white;
    padding: 8px 15px; /* Reducido de 10px 20px a 8px 15px */
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 10px; /* Reducido de 16px a 14px */
    margin: 2px 1px; /* Reducido de 4px 2px a 2px 1px */
    cursor: pointer;
    border-radius: 4px;
}

button:hover {
    background-color: #45a049;
    color: whitesmoke;
}
</style>
```

# src/views/Home.vue

```vue
<template>
  <div id="home">
    <b-container>
      <Datos />
    </b-container>
    <Footer />
  </div>
</template>

<script>
import Datos from "../datos.vue";
import Navbar from "../NavBar.vue";

export default {
  name: "home",
  components: {
    Navbar,
    Datos,
  },
};
</script>

<style>
/* Aquí puedes añadir estilos específicos si es necesario */
</style>
```

# src/assets/logo.png

This is a binary file of the type: Image

# src/components/GestionarProveedores.vue

```vue
<template>
    <div class="gestionar-proveedores-container">
      <div class="back-button-container">
        <BackButton to="/gestionar-productos" />
      </div>
      <h1>Gestión de Proveedores y Maquilas</h1>
      
      <div class="add-proveedor-form">
        <h2>Agregar Proveedor/Maquila</h2>
        <form @submit.prevent="addProveedor">
          <div class="form-group">
            <label for="nombre">Nombre:</label>
            <input v-model="newProveedor.nombre" id="nombre" required placeholder="Nombre del proveedor/maquila">
          </div>
          <div class="form-group">
            <label for="tipo">Tipo:</label>
            <select v-model="newProveedor.tipo" id="tipo" required>
              <option value="proveedor">Proveedor</option>
              <option value="maquila">Maquila</option>
            </select>
          </div>
          <button type="submit" class="submit-btn">Agregar</button>
        </form>
      </div>
  
      <div class="proveedores-list">
        <h2>Lista de Proveedores y Maquilas</h2>
        <ul>
          <li v-for="proveedor in sortedProveedores" :key="proveedor.id">
            <div class="proveedor-info">
              <strong>{{ proveedor.nombre }}</strong>
              <span>({{ proveedor.tipo === 'proveedor' ? 'Proveedor' : 'Maquila' }})</span>
            </div>
            <button @click="deleteProveedor(proveedor.id)" class="delete-btn">Eliminar</button>
          </li>
        </ul>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, computed } from 'vue';
  import { db } from '@/firebase';
  import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
  import BackButton from './BackButton.vue';
  
  export default {
    name: 'GestionarProveedores',
    components: {
      BackButton
    },
    setup() {
      const proveedores = ref([]);
      const newProveedor = ref({
        nombre: '',
        tipo: 'proveedor'
      });
  
      const loadProveedores = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'proveedores'));
          proveedores.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.error("Error al cargar proveedores: ", error);
        }
      };
  
      const addProveedor = async () => {
        try {
          await addDoc(collection(db, 'proveedores'), {
            nombre: newProveedor.value.nombre,
            tipo: newProveedor.value.tipo
          });
          newProveedor.value = { nombre: '', tipo: 'proveedor' };
          loadProveedores();
        } catch (error) {
          console.error("Error al añadir proveedor: ", error);
        }
      };
  
      const deleteProveedor = async (proveedorId) => {
        if (confirm('¿Estás seguro de que quieres eliminar este proveedor/maquila?')) {
          try {
            await deleteDoc(doc(db, 'proveedores', proveedorId));
            loadProveedores();
          } catch (error) {
            console.error("Error al eliminar proveedor: ", error);
          }
        }
      };
  
      const sortedProveedores = computed(() => {
        return [...proveedores.value].sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
  
      onMounted(loadProveedores);
  
      return {
        proveedores,
        newProveedor,
        addProveedor,
        deleteProveedor,
        sortedProveedores
      };
    }
  };
  </script>
  
  <style scoped>
  .gestionar-proveedores-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #e8f0fe;
    border-radius: 20px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  h1, h2 {
    color: #3760b0;
  }
  
  .add-proveedor-form, .proveedores-list {
    margin-top: 20px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 5px;
    color: #3760b0;
  }
  
  .form-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .submit-btn, .delete-btn {
    background-color: #3760b0;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .submit-btn:hover, .delete-btn:hover {
    background-color: #2a4a87;
  }
  
  .delete-btn {
    background-color: #dc3545;
    padding: 5px 10px;
  }
  
  .delete-btn:hover {
    background-color: #c82333;
  }
  
  ul {
    list-style: none;
    padding: 0;
  }
  
  li {
    background-color: white;
    border-radius: 4px;
    margin-bottom: 10px;
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .back-button-container {
    margin-bottom: 20px;
  }
  
  .proveedor-info {
    display: flex;
    flex-direction: column;
  }
  </style>
```

# src/components/GestionarProductos.vue

```vue
<template>
  <div class="gestionar-productos-container">
    <div class="back-button-container">
      <BackButton to="/sacadas" />
    </div>
    <h1>Gestión de Productos</h1>
    
    <div class="actions-container">
      <router-link to="/gestionar-medidas" class="action-button">
        Gestionar Medidas
      </router-link>
      <router-link to="/gestionar-proveedores" class="action-button">
        Gestionar Proveedores
      </router-link>
    </div>

    <div class="add-product-form">
      <h2>Agregar Producto</h2>
      <form @submit.prevent="addProduct">
        <div class="form-group">
  <label for="producto">Producto:</label>
  <select v-model="newProduct.nombre" id="producto" required>
    <option value="">Seleccione un producto</option>
    <option v-for="producto in productosOpciones" :key="producto" :value="producto">
      {{ producto }}
    </option>
  </select>
</div>
        <div class="form-group">
          <label for="proveedor">Proveedor:</label>
          <select v-model="newProduct.proveedor" id="proveedor" required>
            <option value="">Seleccione un proveedor</option>
            <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.nombre">
              {{ proveedor.nombre }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="medida">Medida:</label>
          <select v-model="newProduct.medida" id="medida" required>
            <option value="">Seleccione una medida</option>
            <option v-for="medida in medidas" :key="medida.id" :value="medida.nombre">
              {{ medida.nombre }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="kilos">Kilos:</label>
          <input v-model.number="newProduct.kilos" id="kilos" type="number" step="0.1" required>
        </div>
        <button type="submit" class="submit-btn">Añadir Producto</button>
      </form>
    </div>

    <div class="products-list">
      <h2>Lista de Productos</h2>
      <ul>
        <li v-for="product in products" :key="product.id">
          <div class="product-info">
            <strong>{{ product.proveedor }}</strong> - {{ product.nombre }} - {{ product.medida }} - {{ formatNumber(product.kilos) }} kg
          </div>
          <button @click="deleteProduct(product.id)" class="delete-btn">Eliminar</button>
        </li>
      </ul>
    </div>

    <router-link to="/sacadas" class="back-btn">Volver al Menú de Sacadas</router-link>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import BackButton from './BackButton.vue';

export default {
  name: 'GestionarProductos',
  components: {
    BackButton
  },
  setup() {
    const products = ref([]);
    const medidas = ref([]);
    const proveedores = ref([]);
    const newProduct = ref({
      nombre: '',
      proveedor: '',
      medida: '',
      kilos: null
    });

    const productosOpciones = [
      "Cam s/c",
      "Cam c/c"
      // Añade aquí más opciones de productos según necesites
    ];

    const loadProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        products.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar productos: ", error);
      }
    };

    const loadMedidas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'medidas'));
        medidas.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar medidas: ", error);
      }
    };

    const loadProveedores = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedores'));
        proveedores.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar proveedores: ", error);
      }
    };

    const addProduct = async () => {
      try {
        await addDoc(collection(db, 'products'), {
          nombre: newProduct.value.nombre,
          proveedor: newProduct.value.proveedor,
          medida: newProduct.value.medida,
          kilos: Number(newProduct.value.kilos.toFixed(1))
        });
        newProduct.value = { nombre: '', proveedor: '', medida: '', kilos: null };
        loadProducts();
      } catch (error) {
        console.error("Error al añadir producto: ", error);
      }
    };

    const deleteProduct = async (productId) => {
      if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        try {
          await deleteDoc(doc(db, 'products', productId));
          loadProducts();
        } catch (error) {
          console.error("Error al eliminar producto: ", error);
        }
      }
    };

    const formatNumber = (value) => {
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };

    onMounted(() => {
      loadProducts();
      loadMedidas();
      loadProveedores();
    });

    return {
      products,
      medidas,
      proveedores,
      productosOpciones,  
      newProduct,
      addProduct,
      deleteProduct,
      formatNumber
    };
  }
};
</script>


<style scoped>
.gestionar-productos-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #e8f0fe;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

h1, h2 {
  color: #3760b0;
}

.actions-container {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
}

.action-button, .submit-btn, .back-btn {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.action-button:hover, .submit-btn:hover, .back-btn:hover {
  background-color: #2a4a87;
}

.add-product-form, .products-list {
  margin-top: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #3760b0;
}

.form-group input, .form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn:hover {
  background-color: #c82333;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  background-color: white;
  border-radius: 4px;
  margin-bottom: 10px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-btn {
  margin-top: 20px;
}

.back-button-container {
  margin-bottom: 20px;
}
</style>
```

# src/components/GestionarMedidas.vue

```vue
<template>
    <div class="gestionar-medidas-container">
      <div class="back-button-container">
        <BackButton to="/gestionar-productos" />
      </div>
      <h1>Gestión de Medidas</h1>
      
      <div class="add-medida-form">
        <h2>Agregar Medida</h2>
        <form @submit.prevent="addMedida">
          <div class="form-group">
            <label for="medida">Medida:</label>
            <input v-model="newMedida.nombre" id="medida" required placeholder="Ej: 16/20, 21/25, 26/30, etc.">
          </div>
          <div class="form-group">
            <label for="tipo">Tipo:</label>
            <select v-model="newMedida.tipo" id="tipo" required>
              <option value="general">General</option>
              <option value="maquila">Maquila</option>
            </select>
          </div>
          <div v-if="newMedida.tipo === 'maquila'" class="form-group">
            <label for="maquila">Maquila:</label>
            <select v-model="newMedida.maquilaId" id="maquila" required>
              <option v-for="maquila in maquilas" :key="maquila.id" :value="maquila.id">
                {{ maquila.nombre }}
              </option>
            </select>
          </div>
          <button type="submit" class="submit-btn">Agregar Medida</button>
        </form>
      </div>
  
      <div class="medidas-list">
        <h2>Lista de Medidas</h2>
        <h3>Medidas Generales</h3>
        <ul>
          <li v-for="medida in medidasGenerales" :key="medida.id">
            {{ medida.nombre }}
            <button @click="deleteMedida(medida.id)" class="delete-btn">Eliminar</button>
          </li>
        </ul>
        <h3>Medidas de Maquilas</h3>
        <div v-for="maquila in maquilas" :key="maquila.id">
          <h4>{{ maquila.nombre }}</h4>
          <ul>
            <li v-for="medida in getMedidasMaquila(maquila.id)" :key="medida.id">
              {{ medida.nombre }}
              <button @click="deleteMedida(medida.id)" class="delete-btn">Eliminar</button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, computed } from 'vue';
  import { db } from '@/firebase';
  import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
  import BackButton from './BackButton.vue';
  
  export default {
    name: 'GestionarMedidas',
    components: {
      BackButton
    },
    setup() {
      const medidas = ref([]);
      const maquilas = ref([]);
      const newMedida = ref({
        nombre: '',
        tipo: 'general',
        maquilaId: ''
      });
  
      const loadMedidas = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'medidas'));
          medidas.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.error("Error al cargar medidas: ", error);
        }
      };
  
      const loadMaquilas = async () => {
        try {
          const q = query(collection(db, 'proveedores'), where("tipo", "==", "maquila"));
          const querySnapshot = await getDocs(q);
          maquilas.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.error("Error al cargar maquilas: ", error);
        }
      };
  
      const addMedida = async () => {
        try {
          await addDoc(collection(db, 'medidas'), {
            nombre: newMedida.value.nombre,
            tipo: newMedida.value.tipo,
            maquilaId: newMedida.value.tipo === 'maquila' ? newMedida.value.maquilaId : null
          });
          newMedida.value = { nombre: '', tipo: 'general', maquilaId: '' };
          loadMedidas();
        } catch (error) {
          console.error("Error al añadir medida: ", error);
        }
      };
  
      const deleteMedida = async (medidaId) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta medida?')) {
          try {
            await deleteDoc(doc(db, 'medidas', medidaId));
            loadMedidas();
          } catch (error) {
            console.error("Error al eliminar medida: ", error);
          }
        }
      };
  
      const medidasGenerales = computed(() => {
        return medidas.value.filter(medida => medida.tipo === 'general');
      });
  
      const getMedidasMaquila = (maquilaId) => {
        return medidas.value.filter(medida => medida.tipo === 'maquila' && medida.maquilaId === maquilaId);
      };
  
      onMounted(() => {
        loadMedidas();
        loadMaquilas();
      });
  
      return {
        medidas,
        maquilas,
        newMedida,
        addMedida,
        deleteMedida,
        medidasGenerales,
        getMedidasMaquila
      };
    }
  };
  </script>
  
  
  <style scoped>
  .gestionar-medidas-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #e8f0fe;
    border-radius: 20px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  h1, h2 {
    color: #3760b0;
  }
  
  .add-medida-form, .medidas-list {
    margin-top: 20px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 5px;
    color: #3760b0;
  }
  
  .form-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .submit-btn, .delete-btn {
    background-color: #3760b0;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .submit-btn:hover, .delete-btn:hover {
    background-color: #2a4a87;
  }
  
  .delete-btn {
    background-color: #dc3545;
    padding: 5px 10px;
  }
  
  .delete-btn:hover {
    background-color: #c82333;
  }
  
  ul {
    list-style: none;
    padding: 0;
  }
  
  li {
    background-color: white;
    border-radius: 4px;
    margin-bottom: 10px;
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .back-button-container {
    margin-bottom: 20px;
  }
  </style>
```

# src/components/Existencias.vue

```vue
<template>
  <div class="existencias-container">
    <div class="header">
      <h1>Reporte de Existencias</h1>
      <button @click="imprimirReporte" class="print-button">
        Imprimir Reporte
      </button>
    </div>
    
    <div class="filters">
      <input v-model="search" placeholder="Buscar por proveedor o medida" class="search-input" />
    </div>
    <div class="existencias-grid">
      <div v-for="(proveedor, proveedorNombre) in filteredExistencias" :key="proveedorNombre" class="proveedor-card">
        <h2>{{ proveedorNombre }}</h2>
        <div class="medidas-container">
          <div v-for="(kilos, medida) in proveedor" :key="medida" class="medida-item">
            <div class="medida-info">
              <span class="medida-nombre">{{ medida }}</span>
              <span class="medida-kilos">{{ formatNumber(kilos) }} kg</span>
            </div>
            <div class="medida-bar-container">
              <div class="medida-bar" :style="{ width: `${(kilos / maxKilos) * 100}%` }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="total-general">
      <h2>Total General: {{ formatNumber(totalGeneral) }} kg</h2>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { db } from '@/firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';

export default {
  name: 'Existencias',
  setup() {
    const existencias = ref({});
    const search = ref('');

    const loadExistencias = async () => {
      const sacadasSnapshot = await getDocs(collection(db, 'sacadas'));
      const newExistencias = {};

      sacadasSnapshot.forEach(doc => {
        const sacada = doc.data();
        sacada.entradas.forEach(entrada => {
          if (!newExistencias[entrada.proveedor]) {
            newExistencias[entrada.proveedor] = {};
          }
          if (!newExistencias[entrada.proveedor][entrada.medida]) {
            newExistencias[entrada.proveedor][entrada.medida] = 0;
          }
          newExistencias[entrada.proveedor][entrada.medida] += entrada.kilos;
        });
        sacada.salidas.forEach(salida => {
          if (!newExistencias[salida.proveedor]) {
            newExistencias[salida.proveedor] = {};
          }
          if (!newExistencias[salida.proveedor][salida.medida]) {
            newExistencias[salida.proveedor][salida.medida] = 0;
          }
          newExistencias[salida.proveedor][salida.medida] -= salida.kilos;
        });
      });

      // Filtrar medidas con 0 o menos kilos
      Object.keys(newExistencias).forEach(proveedor => {
        newExistencias[proveedor] = Object.fromEntries(
          Object.entries(newExistencias[proveedor]).filter(([_, kilos]) => kilos > 0)
        );
      });

      existencias.value = newExistencias;
    };

    const filteredExistencias = computed(() => {
      if (!search.value) return existencias.value;
      const searchLower = search.value.toLowerCase();
      const filtered = {};
      Object.entries(existencias.value).forEach(([proveedor, medidas]) => {
        const filteredMedidas = Object.entries(medidas).filter(([medida]) => 
          proveedor.toLowerCase().includes(searchLower) || medida.toLowerCase().includes(searchLower)
        );
        if (filteredMedidas.length > 0) {
          filtered[proveedor] = Object.fromEntries(filteredMedidas);
        }
      });
      return filtered;
    });

    const maxKilos = computed(() => {
      let max = 0;
      Object.values(existencias.value).forEach(proveedor => {
        Object.values(proveedor).forEach(kilos => {
          if (kilos > max) max = kilos;
        });
      });
      return max;
    });

    const totalGeneral = computed(() => {
      return Object.values(filteredExistencias.value).reduce((total, proveedor) => {
        return total + Object.values(proveedor).reduce((sum, kilos) => sum + kilos, 0);
      }, 0);
    });

    const formatNumber = (value) => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
    const imprimirReporte = () => {
      const estilos = `
        <style>
          @page { size: A4; margin: 1cm; }
          body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.3;
            color: #333;
          }
          h1 {
            color: #2c3e50;
            text-align: center;
            font-size: 18pt;
            margin-bottom: 5px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 5px;
          }
          .fecha-reporte {
            text-align: right;
            font-size: 12pt;
            margin-bottom: 10px;
            color: black;
          }
          .existencias-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: space-between;
          }
          .proveedor-card {
            width: calc(50% - 5px);
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 10px;
          }
          .proveedor-card h2 {
            color: #2c3e50;
            font-size: 14pt;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
          }
          .medidas-container {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .medida-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .medida-info {
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            margin-bottom: 2px;
          }
          .medida-nombre {
            color: #2c3e50;
          }
          .medida-kilos {
            color: #000000;
            font-weight: bold;
          }
          .medida-bar-container {
            width: 100%;
            height: 6px;
            background-color: #ecf0f1;
            border-radius: 3px;
            overflow: hidden;
          }
          .medida-bar {
            height: 100%;
            background-color: #3498db;
          }
          .total-general {
            text-align: right;
            font-size: 14pt;
            font-weight: bold;
            margin-top: 15px;
            color: #000000;
            border-top: 2px solid #3498db;
            padding-top: 5px;
          }
          .fecha-generacion {
            text-align: right;
            font-style: italic;
            font-size: 8pt;
            margin-top: 10px;
            color: #7f8c8d;
          }
        </style>
      `;

      const fechaActual = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const contenidoImprimir = `
        <h1>Reporte de Existencias - Rey Pez</h1>
        <div class="fecha-reporte">
          ${fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1)}
        </div>
        <div class="existencias-grid">
          ${Object.entries(filteredExistencias.value).map(([proveedor, medidas]) => `
            <div class="proveedor-card">
              <h2>${proveedor}</h2>
              <div class="medidas-container">
                ${Object.entries(medidas).map(([medida, kilos]) => `
                  <div class="medida-item">
                    <div class="medida-info">
                      <span class="medida-nombre">${medida}</span>
                      <span class="medida-kilos">${formatNumber(kilos)} kg</span>
                    </div>
                    <div class="medida-bar-container">
                      <div class="medida-bar" style="width: ${(kilos / maxKilos.value) * 100}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="total-general">
          Total General: ${formatNumber(totalGeneral.value)} kg
        </div>
        <p class="fecha-generacion">
          Generado el: ${fechaActual} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
      `;

      const ventanaImprimir = window.open('', '_blank');
      ventanaImprimir.document.write(`
        <html>
          <head>
            <title>Reporte de Existencias - Rey Pez</title>
            ${estilos}
          </head>
          <body>
            ${contenidoImprimir}
          </body>
        </html>
      `);
      ventanaImprimir.document.close();
      ventanaImprimir.print();
    };

    onMounted(() => {
      loadExistencias();
      onSnapshot(collection(db, 'sacadas'), () => {
        loadExistencias();
      });
    });

    return {
      existencias,
      filteredExistencias,
      search,
      maxKilos,
      totalGeneral,
      formatNumber,
      imprimirReporte
    };
  }
};
</script>

<style scoped>
.existencias-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h1 {
  color: #2c3e50;
  margin: 0;
  font-size: 24px;
}

.print-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.print-button:hover {
  background-color: #2980b9;
}

.filters {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 2px solid #3498db;
  border-radius: 5px;
  font-size: 16px;
}

.existencias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.proveedor-card {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.proveedor-card h2 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.medidas-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.medida-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.medida-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.medida-nombre {
  font-weight: bold;
  color: #2c3e50;
}

.medida-kilos {
  font-weight: bold;
  color: #000000;
}

.medida-bar-container {
  width: 100%;
  height: 10px;
  background-color: #ecf0f1;
  border-radius: 5px;
  overflow: hidden;
}

.medida-bar {
  height: 100%;
  background-color: #3498db;
  transition: width 0.3s ease;
}

.total-general {
  margin-top: 20px;
  text-align: right;
  font-size: 20px;
  font-weight: bold;
  color: #000000;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .print-button {
    margin-top: 10px;
  }

  .existencias-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

# src/components/BackButton.vue

```vue
<template>
    <router-link :to="to" class="btn-back">Atrás</router-link>
  </template>
  
  <script>
  export default {
    props: {
      to: {
        type: String,
        required: true
      }
    }
  }
  </script>
  
  <style>
  .btn-back {
  background-color: #757575; /* Color de fondo gris */
  color: white; /* Color del texto */
  padding: 0.5em 1em;
  border: none; /* Sin borde */
  border-radius: 5px; /* Bordes redondeados */
  text-decoration: none; /* Remover subrayado de enlaces */
  font-size: 16px; /* Tamaño del texto */
  cursor: pointer; /* Cursor en forma de mano */
  margin: 20px 10px; /* Margen superior e inferior aumentado, y margen lateral agregado */
}

.btn-back:hover {
  background-color: #616161; /* Color de fondo gris más oscuro al pasar el mouse */
  color: whitesmoke;
}
  </style>
```

# src/components/AddClient.vue

```vue
<template>
  <div class="container">
    
    <div class="add-client">
      <div class="back-button-container">
      <BackButton to="/NoteMenu" />
    </div>
    <div class="add-client-form" >
      <h2>Agregar Cliente</h2>
    </div>

      
      <form @submit.prevent="addClient">
        <div class="form-group">
          <label for="name">Nombre:</label>
          <input type="text" v-model="name" required />
        </div>
        <button type="submit">Agregar Cliente</button>
      </form>
      <div class="add-client-form" >
        <h2>Lista de Clientes</h2>
      </div>
      <ul>
        <li v-for="client in clients" :key="client.id">
          {{ client.name }}
          <button @click="deleteClient(client.id)">Eliminar</button>
        </li>
      </ul>
    </div>
  
  </div>
</template>
  <script>
// src/components/AddClient.vue
import BackButton from './BackButton.vue';

import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

export default {
  components: {
    BackButton
  },

  data() {
    return {
      name: '',
      clients: []
    };
  },
  methods: {
    async addClient() {
      try {
        console.log('DB instance:', db); // Añade este log para depuración
        if (!db) {
          throw new Error('Firestore DB is not initialized');
        }
        await addDoc(collection(db, 'clients'), {
          name: this.name
        });
        this.name = '';
        this.fetchClients();
      } catch (error) {
        console.error('Error adding client: ', error);
      }
    },
    async fetchClients() {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        this.clients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error fetching clients: ', error);
      }
    },
    deleteClient(clientId) {
      if (window.confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
        deleteDoc(doc(db, "clients", clientId))
          .then(() => {
            console.log("Cliente eliminado con éxito");
          })
          .catch((error) => {
            console.error("Error al eliminar el cliente: ", error);
          });
      }
    },
  },
  async mounted() {
    this.fetchClients();
  }
};
</script>

<style scoped>
/* Estilos generales */
.add-client {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.add-client-form, .lista-clientes-form {
  margin: 1.5em;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.form-group {
  margin-bottom: 1em;
  width: 100%; /* Asegura que los elementos ocupen todo el ancho del contenedor */
}

.form-group label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: bold;
  font-size: 1.1em;
  color: #3760b0; /* Color acorde al estilo general */
}

.form-group input {
  width: 100%;
  padding: 0.5em;
  box-sizing: border-box;
  border-radius: 5px;
  border: 1px solid #ccc;
  font-size: 1em;
}

/* Estilos para los botones */
button {
  padding: 10px 20px;
  background-color: #3760b0;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2a4a87;
}

ul {
  list-style: none;
  padding: 0;
  width: 100%; /* Asegura que la lista ocupe todo el ancho del contenedor */
}

ul li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75em 1em;
  border-bottom: 1px solid #ccc;
  background-color: #fff;
  border-radius: 10px;
  margin-bottom: 0.5em;
  transition: background-color 0.3s, box-shadow 0.3s;
}

ul li:hover {
  background-color: #f1f1f1;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

ul li span {
  font-size: 1.1em;
  color: #333;
}

ul li button {
  background-color: #dc3545;
  padding: 5px 10px;
  border-radius: 20px;
  color: white;
}

ul li button:hover {
  background-color: #c82333;
}

.back-button-container {
  text-align: left; /* Centra el contenido del div horizontalmente */
  margin-top: 20px; /* Añade un margen inferior para separarlo de los siguientes elementos */
}
</style>
```

