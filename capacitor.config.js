const base = require('./capacitor.config.json');

// La compilación Android empaqueta la app completa (android-dist) con el nombre ReyPez.
// VUE_APP_VARIANTE=despique compila la app del colaborador de despique (docs/APP_DESPIQUE.md):
// otro appId (se instala junto a ReyPez), solo Pesadas (despique-dist) y su propio proyecto nativo.
const config = process.env.VUE_APP_VARIANTE === 'despique'
  ? { ...base, appId: 'com.reypez.despique', appName: 'Despique', webDir: 'despique-dist', android: { path: 'android-despique' } }
  : process.env.VUE_APP_TARGET === 'android'
    ? { ...base, appName: 'ReyPez', webDir: 'android-dist' }
    : base;

module.exports = config;
