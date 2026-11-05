// Cloud Functions de Firebase (asesor experto). Separado de src/firebase.js para que el SDK de
// Functions solo se descargue en la pantalla que lo usa.
import { getFunctions } from 'firebase/functions';
import { app } from './firebase';

export const functions = getFunctions(app);
