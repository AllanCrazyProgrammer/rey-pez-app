/**
 * Catálogo de precios exclusivo para Nota de venta.
 * Colección Firestore independiente de `precios` (Cuentas México / historial).
 *
 * Cada documento puede ser:
 * - General: sin `clienteNombre` (o vacío)
 * - Por cliente: `clienteNombre` = texto exacto del cliente en el select de la nota (mismo `name` que en `clients`)
 */
import { db } from '@/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

/** Nombre de la colección en Firestore (solo nota de venta) */
export const COLECCION_PRECIOS_NOTA_VENTA = 'preciosNotaVenta';

const NOMBRES_NORMALIZADOS = {
  'Med Esp c/c': 'Med-Esp c/c',
  'med esp c/c': 'Med-Esp c/c',
  'Med esp c/c': 'Med-Esp c/c',
  'MED ESP c/c': 'Med-Esp c/c',
  'MED-ESP c/c': 'Med-Esp c/c',
  'Med-esp c/c': 'Med-Esp c/c',
  'Med Gde c/c': 'Med-Gde c/c',
  'med gde c/c': 'Med-Gde c/c',
  'Med gde c/c': 'Med-Gde c/c',
  'Med-gde c/c': 'Med-Gde c/c',
  'MED GDE c/c': 'Med-Gde c/c',
  'MED-GDE c/c': 'Med-Gde c/c'
};

export function normalizarNombreProductoPrecio(nombre) {
  if (!nombre) return nombre;
  const nombreTrim = nombre.trim();
  if (NOMBRES_NORMALIZADOS[nombreTrim]) {
    return NOMBRES_NORMALIZADOS[nombreTrim];
  }
  const nombreLower = nombreTrim.toLowerCase();
  for (const [variante, normalizado] of Object.entries(NOMBRES_NORMALIZADOS)) {
    if (variante.toLowerCase() === nombreLower) {
      return normalizado;
    }
  }
  return nombreTrim;
}

export function normalizarClienteNombreNota(nombre) {
  if (nombre == null) return '';
  return String(nombre).trim();
}

export async function fetchPreciosNotaVentaRaw() {
  const ref = collection(db, COLECCION_PRECIOS_NOTA_VENTA);
  const q = query(ref, orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Agrupa documentos en entradas actuales (una por producto + clienteNombre o solo producto si es general).
 */
export function agruparPreciosNotaVentaDesdeDocs(preciosSnapshot) {
  const preciosMap = new Map();

  preciosSnapshot.forEach((precio) => {
    const productoNormalizado = normalizarNombreProductoPrecio(precio.producto);
    const cn = normalizarClienteNombreNota(precio.clienteNombre);
    const clave = cn ? `${productoNormalizado}||${cn}` : productoNormalizado;

    if (!preciosMap.has(clave)) {
      preciosMap.set(clave, {
        producto: productoNormalizado,
        precioActual: precio.precio,
        fechaActual: precio.fecha,
        clienteNombre: cn || null,
        historial: []
      });
    } else {
      const existente = preciosMap.get(clave);
      if (new Date(precio.fecha) > new Date(existente.fechaActual)) {
        existente.precioActual = precio.precio;
        existente.fechaActual = precio.fecha;
      }
    }

    preciosMap.get(clave).historial.push({
      id: precio.id,
      fecha: precio.fecha,
      precio: precio.precio,
      clienteNombre: cn || null
    });
  });

  preciosMap.forEach((item) => {
    item.historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  });

  return Array.from(preciosMap.values()).map((item) => ({
    id: item.historial[0].id,
    producto: item.producto,
    precio: item.precioActual,
    fecha: item.fechaActual,
    clienteNombre: item.clienteNombre,
    historial: item.historial
  }));
}

export function listarNombresProductoUnicos(preciosActuales) {
  const set = new Set(preciosActuales.map((p) => p.producto).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Carga desde `preciosNotaVenta` + lista de productos para el desplegable.
 */
export async function cargarPreciosParaNotaVenta() {
  const raw = await fetchPreciosNotaVentaRaw();
  const agrupado = agruparPreciosNotaVentaDesdeDocs(raw);
  const productosCatalogo = listarNombresProductoUnicos(agrupado);
  return { raw, productosCatalogo };
}
