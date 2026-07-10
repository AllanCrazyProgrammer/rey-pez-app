// Arma el resumen de inventario que se le manda al asesor experto (Cloud
// Function + Claude). Replica la misma lógica de stock de Existencias.vue /
// Análisis de Stock: bucketizar por medida+precio+cuarto, restar salidas por
// FIFO dentro del bucket exacto y descartar los kilos sin lote propio.
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import moment from 'moment';

function parseFechaSacada(fecha) {
  if (!fecha) return null;
  if (fecha instanceof Date) return fecha;
  if (typeof fecha.toDate === 'function') return fecha.toDate();
  const d = new Date(fecha);
  return isNaN(d.getTime()) ? null : d;
}

function normalizarCuarto(cuarto) {
  const valor = (cuarto && cuarto.trim()) ? cuarto.trim() : 's/c';
  return valor.toLowerCase() === 'sin cuarto designado' ? 's/c' : valor;
}

function claveBucket(medida, precio, cuarto) {
  const c = normalizarCuarto(cuarto);
  return precio !== null && precio !== undefined
    ? `${medida}_$${precio}__${c}`
    : `${medida}__${c}`;
}

export async function construirContextoInventario(dias = 30) {
  const inicio = moment().subtract(dias, 'days').startOf('day');
  const hace7 = moment().subtract(7, 'days').startOf('day');

  const snapshot = await getDocs(collection(db, 'sacadas'));

  // Ordenar cronológicamente: el FIFO depende de que las entradas queden
  // registradas antes que las salidas que las consumen.
  const sacadas = snapshot.docs
    .map(docSnap => docSnap.data())
    .map(sacada => ({ sacada, fecha: parseFechaSacada(sacada.fecha) }))
    .filter(item => item.fecha)
    .sort((a, b) => a.fecha - b.fecha);

  const buckets = {};
  const porMedida = {};
  let totalVendido = 0;

  const asegurarMedida = (medida) => {
    if (!porMedida[medida]) {
      porMedida[medida] = { vendido30d: 0, vendido7d: 0, entradas: [] };
    }
    return porMedida[medida];
  };

  sacadas.forEach(({ sacada, fecha }) => {
    (sacada.entradas || []).forEach(entrada => {
      const medida = String(entrada.medida || '').trim();
      const kilos = Number(entrada.kilos) || 0;
      if (!medida || kilos <= 0) return;

      const precio = entrada.precio !== null && entrada.precio !== undefined
        ? entrada.precio
        : null;
      const clave = claveBucket(medida, precio, entrada.cuartoFrio);
      if (!buckets[clave]) buckets[clave] = { medida, lotes: [] };
      buckets[clave].lotes.push({ kilos });

      asegurarMedida(medida).entradas.push({
        fecha,
        kilos,
        precio,
        proveedor: entrada.proveedor || null
      });
    });

    (sacada.salidas || []).forEach(salida => {
      const medida = String(salida.medida || '').trim();
      const kilos = Number(salida.kilos) || 0;
      if (!medida || kilos <= 0) return;

      const precio = salida.precio !== null && salida.precio !== undefined
        ? salida.precio
        : null;
      const clave = claveBucket(medida, precio, salida.cuartoFrio);
      if (!buckets[clave]) buckets[clave] = { medida, lotes: [] };

      // FIFO clampado a cero por lote (mismo comportamiento que Existencias).
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
      const registro = asegurarMedida(medida);
      if (moment(fecha).isSameOrAfter(inicio)) {
        registro.vendido30d += kilos;
        totalVendido += kilos;
      }
      if (moment(fecha).isSameOrAfter(hace7)) {
        registro.vendido7d += kilos;
      }
    });
  });

  const stockPorMedida = {};
  Object.values(buckets).forEach(bucket => {
    const disponible = bucket.lotes.reduce(
      (sum, lote) => sum + Math.max(0, lote.kilos),
      0
    );
    if (disponible <= 0) return;
    stockPorMedida[bucket.medida] = (stockPorMedida[bucket.medida] || 0) + disponible;
  });

  const medidas = Object.keys(porMedida)
    .map(nombre => {
      const registro = porMedida[nombre];
      const stockKg = Number((stockPorMedida[nombre] || 0).toFixed(1));
      const vendido30dKg = Number(registro.vendido30d.toFixed(1));
      const consumoDiarioKg = Number((vendido30dKg / dias).toFixed(2));

      registro.entradas.sort((a, b) => b.fecha - a.fecha);
      const entradaConPrecio = registro.entradas.find(
        e => e.precio !== null && e.precio !== undefined
      );
      const ultimaEntrada = registro.entradas[0] || null;

      return {
        medida: nombre,
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
              kilos: Number(ultimaEntrada.kilos.toFixed(1)),
              proveedor: ultimaEntrada.proveedor
            }
          : null
      };
    })
    .filter(m => m.stockKg > 0 || m.vendido30dKg > 0)
    .sort((a, b) => b.vendido30dKg - a.vendido30dKg);

  const proveedoresSnapshot = await getDocs(collection(db, 'proveedores'));
  const proveedores = proveedoresSnapshot.docs
    .map(docSnap => docSnap.data())
    .filter(p => p.tipo === 'proveedor' && p.nombre)
    .map(p => p.nombre)
    .sort((a, b) => a.localeCompare(b));

  return {
    fecha: moment().format('YYYY-MM-DD'),
    periodoDias: dias,
    totalVendido30dKg: Number(totalVendido.toFixed(1)),
    totalStockKg: Number(medidas.reduce((sum, m) => sum + m.stockKg, 0).toFixed(1)),
    proveedores,
    medidas
  };
}
