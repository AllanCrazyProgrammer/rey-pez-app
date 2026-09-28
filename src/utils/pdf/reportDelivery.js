import { nombreArchivoReporte, periodoNota } from './filename';
import { driveNotasDisponible, encolarNotaDrive } from '@/services/DriveNotasSync';

// Invoke from the click handler, before fetching data or generating PDF bytes.
export async function prepararGuardadoReporte(tipo, embarque) {
  const name = nombreArchivoReporte(tipo, embarque);
  if (window.desktop || !window.showSaveFilePicker) return { name };
  try {
    const handle = await window.showSaveFilePicker({
      id: 'reypez-reportes', suggestedName: name,
      types: [{ description: 'Documento PDF', accept: { 'application/pdf': ['.pdf'] } }]
    });
    // The native save dialog confirms replacement of an existing file.
    return { name, handle };
  } catch (error) {
    if (error.name === 'AbortError') return { name, canceled: true };
    throw error;
  }
}

export async function guardarYRespaldarReporte(tipo, embarque, bytes, destino) {
  if (destino.canceled) return { canceled: true };
  const name = destino.name;
  const period = periodoNota(embarque);
  const data = new Uint8Array(bytes);
  if (window.desktop) {
    const result = await window.desktop.savePdf(data, name, period, { open: destino.open !== false });
    if (result?.canceled) return result;
  } else if (destino.handle) {
    const writable = await destino.handle.createWritable();
    try {
      await writable.write(data);
      await writable.close();
    } catch (error) {
      try { await writable.abort(); } catch (_) { /* Preserve the original error. */ }
      throw error;
    }
  } else {
    // Browsers without a save picker manage filenames/replacements themselves.
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  if (driveNotasDisponible()) {
    const shipmentId = String(embarque.id || 'embarque').replace(/[^a-zA-Z0-9._:-]/g, '_');
    const id = `${tipo}-${shipmentId}-${period.year}-${period.month}-${period.day}`;
    try {
      await encolarNotaDrive({ id, name, period, data });
    } catch (error) {
      throw new Error(`El PDF se guardó localmente, pero no se pudo dejar pendiente para Drive: ${error.message}`);
    }
  }
  return { canceled: false, name };
}
