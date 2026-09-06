// Browser-test adapter only. Never imported by the production application.
import { aplicarCamposPesadas } from '../../src/utils/pesadas';
const key = 'test.pesadas.server';
const listeners = new Set();
const all = () => JSON.parse(localStorage.getItem(key) || '{}');
const emit = () => listeners.forEach(listener => listener());
window.addEventListener('storage', event => { if (event.key === key) emit(); });
window.addEventListener('online', emit);
window.addEventListener('offline', emit);

export function conectarPesadas(fecha, onData) {
  return {
    subscribe() {
      const listener = () => onData(all()[fecha] || {}, { fromCache: !navigator.onLine, hasPendingWrites: false, exists: !!all()[fecha] });
      listeners.add(listener);
      queueMicrotask(listener);
      return () => listeners.delete(listener);
    },
    async write(fields) {
      if (!navigator.onLine) await new Promise(resolve => window.addEventListener('online', resolve, { once: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
      const days = all();
      days[fecha] = aplicarCamposPesadas(days[fecha], { ...fields, fecha });
      localStorage.setItem(key, JSON.stringify(days));
      emit();
    }
  };
}

export function observarHistorialPesadas(onData) {
  const listener = () => onData(Object.entries(all()).map(([fecha, data]) => ({ ...data, id: fecha })), !navigator.onLine);
  listeners.add(listener);
  queueMicrotask(listener);
  return () => listeners.delete(listener);
}
