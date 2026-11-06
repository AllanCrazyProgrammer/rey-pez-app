// Arranca las actualizaciones del APK (ver actualizacionAndroid.js). Solo en la app nativa de Android.
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { crearFuenteAndroid } from './actualizacionAndroid';

const esAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const fuenteActualizacionAndroid = esAndroid ? Object.freeze(crearFuenteAndroid({
  updater: CapacitorUpdater,
  versionNativa: async () => (await NativeApp.getInfo()).version,
  numeroActual: Number(process.env.VUE_APP_PAQUETE_NUMERO) || 0,
  // Solo para APKs de prueba (se fija al compilar); los APKs normales usan la web oficial.
  ...(process.env.VUE_APP_ACTUALIZACIONES_ANDROID_URL ? { base: process.env.VUE_APP_ACTUALIZACIONES_ANDROID_URL } : {})
})) : null;

export function iniciarActualizacionesAndroid() {
  if (!fuenteActualizacionAndroid) return;
  fuenteActualizacionAndroid.iniciar().catch(error => console.warn('No se pudo iniciar el actualizador:', error));
  // Al volver a la app después de un rato, revisar de nuevo.
  NativeApp.addListener('resume', () => fuenteActualizacionAndroid.buscar());
}
