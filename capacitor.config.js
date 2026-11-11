const base = require('./capacitor.config.json');

// La compilación Android empaqueta la app completa (android-dist) con el nombre ReyPez.
module.exports = process.env.VUE_APP_TARGET === 'android'
  ? { ...base, appName: 'ReyPez', webDir: 'android-dist' }
  : base;
