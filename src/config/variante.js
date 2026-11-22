// Variante de compilación. "despique" es la APK del colaborador que pesa las despicadas: solo
// trae Pesadas (ver src/despique/ y docs/APP_DESPIQUE.md). Se fija al compilar con
// VUE_APP_VARIANTE=despique, así webpack quita del build lo que esa variante no usa.
export const ES_DESPIQUE = process.env.VUE_APP_VARIANTE === 'despique';
