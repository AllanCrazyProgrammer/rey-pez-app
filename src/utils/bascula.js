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
//
// Trama "=" de la NVK: signo igual y el número escrito AL REVÉS, sin espacios ni unidad.
// "=09.1000" es 1.90 kg ("0001.90" leído de derecha a izquierda) y "=00.0000" es cero.
// Medido en una báscula real: marcaba 1.9 kg y la lectura directa daba 9.1. Con espacios
// ("=  45.20") se sigue leyendo como un número normal.
const TRAMA_IGUAL_INVERTIDA = /^=(\d+\.\d+)$/;

export function parsearPeso(texto) {
  if (!texto) return null;
  const invertida = String(texto).trim().match(TRAMA_IGUAL_INVERTIDA);
  const cuerpo = invertida ? invertida[1].split('').reverse().join('') : String(texto);
  const match = cuerpo.match(/([-+]?)\s*(\d+(?:\.\d+)?)\s*(kg|g|lb)?/i);
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
// Una trama termina en fin de línea o donde empieza otra con "=": hay básculas (la NVK por
// puerto serie) que mandan "=00.0000=00.0000…" sin saltos de línea.
export function crearAcumulador(limite = 200) {
  let buffer = '';
  return {
    agregar(fragmento) {
      buffer += fragmento;
      const partes = buffer.split(/[\r\n]+|(?==)/);
      buffer = partes.pop();
      if (buffer.length > limite) buffer = buffer.slice(-limite);
      return partes.filter(p => p.trim());
    },
    pendiente() {
      return buffer;
    },
  };
}

// Convierte lo que va llegando de la báscula (fragmentos de texto) en lecturas de peso.
// procesar(texto) devuelve { peso, trama } con la lectura más reciente que se pudo armar, o null.
// paqueteCompleto: por BLE cada aviso suele ser un paquete entero, así que si no trae fin de
// línea se prueba tal cual. Por puerto serie los cortes son arbitrarios (llega "=01." y luego
// "5000"), por eso ahí solo se usan tramas completas.
export function crearLectorPeso() {
  const acumulador = crearAcumulador();
  return {
    procesar(texto, paqueteCompleto = true) {
      const lineas = acumulador.agregar(texto);
      const candidatos = lineas.length ? lineas : (paqueteCompleto ? [texto] : []);
      for (let i = candidatos.length - 1; i >= 0; i--) {
        const peso = parsearPeso(candidatos[i]);
        if (peso) return { peso, trama: candidatos[i] };
      }
      return null;
    },
  };
}
