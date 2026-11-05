// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager
} from "firebase/firestore";
import { getDatabase, ref, onDisconnect, set } from "firebase/database";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  connectAuthEmulator
} from "firebase/auth";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDEXrriJ15Gg2IyPYh56gNktfGaSsP6KeE",
  authDomain: "reypezapp-1ced2.firebaseapp.com",
  projectId: "reypezapp-1ced2",
  storageBucket: "reypezapp-1ced2.firebasestorage.app",
  messagingSenderId: "512757841511",
  appId: "1:512757841511:web:d15e6a6276e84c42959ec2",
  databaseURL: "https://reypezapp-1ced2-default-rtdb.firebaseio.com/"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth se inicializa ANTES que Firestore y siempre al arrancar: Firestore guarda las
// escrituras sin internet en una cola por usuario, y así ve al mismo usuario (la sesión guardada
// en el equipo, o ninguno) desde el primer momento, sin cambios de usuario a media sesión.
// initializeAuth (no getAuth) para no incluir el código de ventanas emergentes, que no se usa.
const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence]
});
// Solo para pruebas locales con el emulador de Auth (nunca se define en producción).
if (process.env.VUE_APP_AUTH_EMULATOR) {
  connectAuthEmulator(auth, process.env.VUE_APP_AUTH_EMULATOR, { disableWarnings: true });
}

// Inicializar Firestore con fallback de caché para entornos restringidos
const initFirestore = () => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      })
    });
  } catch (error) {
    console.warn('[firebase] No se pudo habilitar caché multi-tab, intentando modo single-tab.', error);
  }

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager(),
      })
    });
  } catch (error) {
    console.warn('[firebase] No se pudo habilitar caché persistente, usando caché en memoria.', error);
  }

  try {
    return initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
  } catch (error) {
    console.warn('[firebase] Falló la inicialización con caché en memoria, usando getFirestore.', error);
  }

  return getFirestore(app);
};

const db = initFirestore();

// Inicializar Realtime Database
const rtdb = getDatabase(app);

// Storage (fotos de Bitácoras/Journal) y Cloud Functions (asesor experto) viven en
// src/firebaseStorage.js y src/firebaseFunctions.js: así su código solo se descarga al
// abrir esas pantallas y no al iniciar la app.

// Función para manejar la presencia de usuarios
const handleUserPresence = async (userId, username) => {
  if (!userId || !username) {
    return;
  }

  try {
    const userStatusRef = ref(rtdb, `status/${userId}`);
    
    // Configurar limpieza al desconectar
    await onDisconnect(userStatusRef).remove();
    
    // Establecer estado inicial
    await set(userStatusRef, {
      username,
      status: 'online',
      lastSeen: new Date().toISOString()
    });
    
    
  } catch (error) {
    console.error('Error al configurar presencia:', error);
  }
};

export { app, auth, db, rtdb, handleUserPresence };
