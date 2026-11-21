// Lógica pura para interpretar lo que manda una báscula por Bluetooth.
// Sin dependencias del navegador para poder probarla con node --test.

export function bytesAHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

export function bytesATexto(bytes) {
  return Array.from(bytes)
    .map(b => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '·'))
    .join('');
}

// Intenta sacar el peso de una trama ASCII típica de indicadores:
//   "ST,GS,+  12.34kg"   "US,NT,-0.50 kg"   "=  45.20"   "wn0012.34kg"
// Devuelve { kilos, estable } o null si no reconoce un número.
// estable: true (ST), false (US) o null si la trama no lo indica.
export function parsearPeso(texto) {
  if (!texto) return null;
  const match = String(texto).match(/([-+]?)\s*(\d+(?:\.\d+)?)\s*(kg|g|lb)?/i);
  if (!match) return null;
  let kilos = parseFloat(match[2]);
  if (Number.isNaN(kilos)) return null;
  if (match[1] === '-') kilos = -kilos;
  const unidad = (match[3] || 'kg').toLowerCase();
  if (unidad === 'g') kilos = kilos / 1000;
  if (unidad === 'lb') kilos = kilos * 0.453592;
  let estable = null;
  if (/\bST\b/i.test(texto)) estable = true;
  else if (/\bUS\b/i.test(texto)) estable = false;
  return { kilos: Math.round(kilos * 100) / 100 || 0, estable };
}

// Junta fragmentos que llegan partidos (BLE manda paquetes de ~20 bytes)
// y devuelve las líneas completas. Uso:
//   const acc = crearAcumulador(); acc.agregar('ST,GS,+  1'); acc.agregar('2.34kg\r\n') -> ['ST,GS,+  12.34kg']
export function crearAcumulador(limite = 200) {
  let buffer = '';
  return {
    agregar(fragmento) {
      buffer += fragmento;
      const partes = buffer.split(/[\r\n]+/);
      buffer = partes.pop();
      if (buffer.length > limite) buffer = buffer.slice(-limite);
      return partes.filter(p => p.trim());
    },
    pendiente() {
      return buffer;
    },
  };
}
