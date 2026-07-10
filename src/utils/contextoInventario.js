// Arma el resumen de inventario que se le manda al asesor experto (Cloud
// Function + Claude). Replica EXACTAMENTE la lógica de stock del Reporte de
// Existencias (Existencias.vue): bucketizar por PROVEEDOR + medida + precio +
// cuarto, restar salidas por FIFO dentro de ese bucket exacto y descartar los
// kilos que no encuentran lote propio. El desglose es por medida y proveedor,
// igual que el reporte.
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import moment from 'moment';

function parseFechaSacada(fecha) {
  if (!fecha) return new Date(0);
  if (fecha instanceof Date) return fecha;
  if (typeof fecha.toDate === 'function') return fecha.toDate();
  const d = new Date(fecha);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function normalizarCuarto(cuarto) {
  const valor = (cuarto && cuarto.trim()) ? cuarto.trim() : 's/c';
  return valor.toLowerCase() === 'sin cuarto designado' ? 's/c' : valor;
}

// Misma fórmula de clave que Existencias.vue, con el proveedor por delante:
// cada proveedor tiene sus propios lotes y una salida solo consume los suyos.
function claveBucket(proveedor, medida, precio, cuarto) {
  const c = normalizarCuarto(cuarto);
  const medidaKey = precio !== null && precio !== undefined
    ? `${medida}_$${precio}__${c}`
    : `${medida}__${c}`;
  return `${proveedor}||${medidaKey}`;
}

export async function construirContextoInventario(dias = 30) {
  const inicio = moment().subtract(dias, 'days').startOf('day');
  const hace7 = moment().subtract(7, 'days').startOf('day');

  const snapshot = await getDocs(collection(db, 'sacadas'));

  // Ordenar cronológicamente, igual que Existencias.vue (fecha inválida = época).
  const sacadas = snapshot.docs
    .map(docSnap => docSnap.data())
    .map(sacada => ({ sacada, fecha: parseFechaSacada(sacada.fecha) }))
    .sort((a, b) => a.fecha - b.fecha);

  const buckets = {};
  const porMedidaProveedor = {};
  let totalVendido = 0;

  const claveMP = (medida, proveedor) => `${medida}||${proveedor}`;
  const asegurarRegistro = (medida, proveedor) => {
    const clave = claveMP(medida, proveedor);
    if (!porMedidaProveedor[clave]) {
      porMedidaProveedor[clave] = {
        medida,
        proveedor,
        vendido30d: 0,
        vendido7d: 0,
        entradas: []
      };
    }
    return porMedidaProveedor[clave];
  };

  sacadas.forEach(({ sacada, fecha }) => {
    (sacada.entradas || []).forEach(entrada => {
      const medida = String(entrada.medida || '').trim();
      const proveedor = String(entrada.proveedor || '').trim();
      const kilos = Number(entrada.kilos) || 0;
      if (!medida || kilos <= 0) return;

      const precio = entrada.precio !== null && entrada.precio !== undefined
        ? entrada.precio
        : null;
      const clave = claveBucket(proveedor, medida, precio, entrada.cuartoFrio);
      if (!buckets[clave]) buckets[clave] = { medida, proveedor, lotes: [] };
      buckets[clave].lotes.push({ kilos });

      asegurarRegistro(medida, proveedor).entradas.push({ fecha, kilos, precio });
    });

    (sacada.salidas || []).forEach(salida => {
      const medida = String(salida.medida || '').trim();
      const proveedor = String(salida.proveedor || '').trim();
      const kilos = Number(salida.kilos) || 0;
      if (!medida || kilos <= 0) return;

      const precio = salida.precio !== null && salida.precio !== undefined
        ? salida.precio
        : null;
      const clave = claveBucket(proveedor, medida, precio, salida.cuartoFrio);
      if (!buckets[clave]) buckets[clave] = { medida, proveedor, lotes: [] };

      // FIFO clampado a cero por lote, dentro del bucket del mismo proveedor
      // (idéntico a Existencias.vue: los kilos sin lote propio se descartan).
      let restante = kilos;
      for (let i = 0; i < buckets[clave].lotes.length && restante > 0; i += 1) {
        const lote = buckets[clave].lotes[i];
        if (lote.kilos >= restante) {
          lote.kilos -= restante;
          restante = 0;
        } else {
          restante -= lote.kilos;
          lote.kilos = 0;
        }
      }

      // La demanda cuenta la salida completa: representa lo que sí se vendió.
      const registro = asegurarRegistro(medida, proveedor);
      if (moment(fecha).isSameOrAfter(inicio)) {
        registro.vendido30d += kilos;
        totalVendido += kilos;
      }
      if (moment(fecha).isSameOrAfter(hace7)) {
        registro.vendido7d += kilos;
      }
    });
  });

  // Stock por medida+proveedor: suma de los lotes con saldo positivo.
  const stockPorMP = {};
  Object.values(buckets).forEach(bucket => {
    const disponible = bucket.lotes.reduce(
      (sum, lote) => sum + Math.max(0, lote.kilos),
      0
    );
    if (disponible <= 0) return;
    const clave = claveMP(bucket.medida, bucket.proveedor);
    stockPorMP[clave] = (stockPorMP[clave] || 0) + disponible;
  });

  const medidas = Object.entries(porMedidaProveedor)
    .map(([clave, registro]) => {
      const stockKg = Number((stockPorMP[clave] || 0).toFixed(1));
      const vendido30dKg = Number(registro.vendido30d.toFixed(1));
      const consumoDiarioKg = Number((vendido30dKg / dias).toFixed(2));

      registro.entradas.sort((a, b) => b.fecha - a.fecha);
      const entradaConPrecio = registro.entradas.find(
        e => e.precio !== null && e.precio !== undefined
      );
      const ultimaEntrada = registro.entradas[0] || null;

      return {
        medida: registro.medida,
        proveedor: registro.proveedor || null,
        stockKg,
        vendido30dKg,
        vendido7dKg: Number(registro.vendido7d.toFixed(1)),
        consumoDiarioKg,
        diasCobertura: consumoDiarioKg > 0
          ? Number((stockKg / consumoDiarioKg).toFixed(1))
          : null,
        ultimoPrecioCompra: entradaConPrecio ? entradaConPrecio.precio : null,
        ultimaEntrada: ultimaEntrada
          ? {
              fecha: moment(ultimaEntrada.fecha).format('YYYY-MM-DD'),
              kilos: Number(ultimaEntrada.kilos.toFixed(1))
            }
          : null
      };
    })
    .filter(m => m.stockKg > 0 || m.vendido30dKg > 0)
    .sort((a, b) => b.stockKg - a.stockKg || b.vendido30dKg - a.vendido30dKg);

  const proveedoresSnapshot = await getDocs(collection(db, 'proveedores'));
  const proveedores = proveedoresSnapshot.docs
    .map(docSnap => docSnap.data())
    .filter(p => p.tipo === 'proveedor' && p.nombre)
    .map(p => p.nombre)
    .sort((a, b) => a.localeCompare(b));

  return {
    fecha: moment().format('YYYY-MM-DD'),
    periodoDias: dias,
    nota: 'Inventario desglosado por medida y proveedor, con la misma lógica del Reporte de Existencias.',
    totalVendido30dKg: Number(totalVendido.toFixed(1)),
    totalStockKg: Number(medidas.reduce((sum, m) => sum + m.stockKg, 0).toFixed(1)),
    proveedores,
    medidas
  };
}
