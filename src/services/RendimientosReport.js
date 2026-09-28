import EmbarquesOfflineService from './EmbarquesOfflineService';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

// Reuse the screen's calculation methods without creating/mounting the screen:
// no watchers, autosave, lifecycle hooks, or navigation during a PDF export.
export async function generarRendimientosParaResumen(embarque) {
  const { default: screen } = await import('@/views/Embarques/Rendimientos.vue');
  const model = { ...screen.data(), $route: { params: { id: embarque.id } },
    $set: (target, key, value) => { target[key] = value; },
    $nextTick: () => Promise.resolve()
  };
  Object.entries(screen.methods).forEach(([name, method]) => { model[name] = method.bind(model); });
  // Export calculations must never write totals or change stored shipment data.
  model.actualizarTotalGanancias = async () => {};
  model.actualizarOfflineRendimientos = async () => {};
  model.persistirCamposRendimientos = async () => { throw new Error('Un reporte no puede modificar el embarque.'); };
  await EmbarquesOfflineService.init();
  const records = await EmbarquesOfflineService.getAll();
  const base = records.find(record => record.id === embarque.id);
  let saved = base?.docData || {};
  const sameDay = model.obtenerFechaISODesdeValor(embarque.fecha);
  const related = new Map(records.filter(record => !record.deleted && model.obtenerFechaISODesdeValor(record.docData?.fecha || record.fecha) === sameDay)
    .map(record => [record.id, { id: record.id, data: record.docData || record }]));
  if (navigator.onLine) {
    const db = getFirestore();
    const [baseDoc, relatedDocs] = await Promise.all([
      getDoc(doc(db, 'embarques', embarque.id)),
      getDocs(query(collection(db, 'embarques'), where('fecha', '==', embarque.fecha)))
    ]);
    if (baseDoc.exists() && !base?.pendingSync) saved = baseDoc.data();
    relatedDocs.docs.forEach(item => {
      if (!records.find(record => record.id === item.id)?.pendingSync) related.set(item.id, { id: item.id, data: item.data() });
    });
  }
  // The editor's current products take precedence over a previously saved copy.
  related.set(embarque.id, { id: embarque.id, data: { ...saved, ...embarque } });
  model.aplicarEmbarqueCargado(model.combinarEmbarquesPorFecha([...related.values()], embarque.id));
  model.preciosVenta = model.deepClone(base?.preciosVentaCache || {});
  await model.cargarPreciosVenta();
  await model.precargarCostos();
  await model.calcularGanancias();
  return model.generarPDF({ returnForDrive: true });
}
