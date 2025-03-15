// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getDatabase, ref, onDisconnect, serverTimestamp, set } from "firebase/database";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDEXrriJ15Gg2IyPYh56gNktfGaSsP6KeE",
  authDomain: "reypezapp-1ced2.firebaseapp.com",
  projectId: "reypezapp-1ced2",
  storageBucket: "reypezapp-1ced2.appspot.com",
  messagingSenderId: "512757841511",
  appId: "1:512757841511:web:d15e6a6276e84c42959ec2",
  databaseURL: "https://reypezapp-1ced2-default-rtdb.firebaseio.com/"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore y Realtime Database
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Habilitar persistencia offline
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.error('Persistencia múltiple no permitida');
  } else if (err.code === 'unimplemented') {
    console.error('Persistencia no soportada por el navegador');
  }
});

// Función para manejar la presencia de usuarios
const handleUserPresence = async (userId, username) => {
  if (!userId || !username) {
    console.log('Se requiere userId y username para manejar la presencia');
    return;
  }

  try {
    console.log('Configurando presencia para:', username);
    const userStatusRef = ref(rtdb, `status/${userId}`);
    
    // Configurar limpieza al desconectar
    await onDisconnect(userStatusRef).remove();
    
    // Establecer estado inicial
    await set(userStatusRef, {
      username,
      status: 'online',
      lastSeen: new Date().toISOString()
    });
    
    console.log('Presencia configurada exitosamente');
  } catch (error) {
    console.error('Error al configurar presencia:', error);
  }
};

export { db, rtdb, handleUserPresence };