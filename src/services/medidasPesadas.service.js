// Medidas por defecto de Pesar rápido (Ajustes > Medidas, docs/APP_DESPIQUE.md).
// El colaborador las escribe una vez y aparecen sugeridas por default al escribir
// la medida en Pesar rápido. Viven en un solo documento de Firestore
// (`configuracion/medidasPesadas`, campo `medidas`: ["51/60", "golfo", "piojo"]),
// así valen en todos los dispositivos y se guardan en la caché sin internet.
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';

const REFERENCIA = () => doc(db, 'configuracion', 'medidasPesadas');

export function observarMedidasPesadas(onData, onError) {
  return onSnapshot(REFERENCIA(), { includeMetadataChanges: true }, snapshot => {
    const data = snapshot.data() || {};
    onData(Array.isArray(data.medidas) ? data.medidas : [], snapshot.metadata.fromCache);
  }, onError);
}

export function guardarMedidasPesadas(medidas) {
  const lista = (medidas || []).map(medida => String(medida || '').trim()).filter(Boolean);
  return setDoc(REFERENCIA(), { medidas: lista, actualizadoEn: serverTimestamp() }, { merge: true });
}
