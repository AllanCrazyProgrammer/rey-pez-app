// Actualizaciones de la APK de despique sin reinstalar (docs/APP_DESPIQUE.md).
//
// Igual que la app completa (src/mobile/actualizacionAndroid.js), pero con su propio paquete
// (actualizaciones/despique/, solo Pesadas) y solo revisando con wifi, para no gastar datos del
// celular: al abrir la app, al volver a ella, al recuperar internet y al pasar a wifi.
// La versión descargada se aplica sola al arrancar o al mandar la app a segundo plano (nunca con
// la app en uso). Los cambios de pesadas ya están guardados en el teléfono, así que recargar no
// pierde nada.
import { Capacitor } from '@capacitor/core';

export async function iniciarActualizacionesDespique() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;
  const [{ CapacitorUpdater }, { App: NativeApp }, { crearFuenteAndroid, hayWifi, URL_ACTUALIZACIONES_DESPIQUE }, { crearAutoAplicador }] = await Promise.all([
    import('@capgo/capacitor-updater'), import('@capacitor/app'),
    import('../mobile/actualizacionAndroid'), import('../mobile/autoAplicarActualizacion')
  ]);
  const fuente = crearFuenteAndroid({
    updater: CapacitorUpdater,
    versionNativa: async () => (await NativeApp.getInfo()).version,
    numeroActual: Number(process.env.VUE_APP_PAQUETE_NUMERO) || 0,
    plataforma: 'despique',
    base: process.env.VUE_APP_ACTUALIZACIONES_DESPIQUE_URL || URL_ACTUALIZACIONES_DESPIQUE,
    puedeRevisar: () => hayWifi()
  });
  // Primero: avisar al plugin que esta versión arrancó bien (si no, regresa a la anterior).
  await fuente.iniciar();
  crearAutoAplicador({ fuente }).iniciar();
  NativeApp.addListener('resume', () => fuente.buscar());
  window.addEventListener('online', () => fuente.buscar());
  if (navigator.connection && navigator.connection.addEventListener) {
    navigator.connection.addEventListener('change', () => fuente.buscar());
  }
  return fuente;
}
