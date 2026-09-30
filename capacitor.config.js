const base = require('./capacitor.config.json');

// La compilación Android tiene una entrada de inventarios independiente.
module.exports = process.env.VUE_APP_TARGET === 'android'
  ? { ...base, appName: 'ReyPez Inventarios', webDir: 'android-dist' }
  : base;
