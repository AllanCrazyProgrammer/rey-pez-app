// Cloud Storage de Firebase (fotos de Bitácoras y Journal). Separado de src/firebase.js para
// que el SDK de Storage solo se descargue en las pantallas que lo usan.
import { getStorage } from 'firebase/storage';
import { app } from './firebase';

export const storage = getStorage(app);
