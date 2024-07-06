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