// Totales de taras y kilos (limpio y crudo) que muestran los chips por cliente
// y el resumen del embarque completo. Un solo lugar para las fórmulas.
import { calcularTotalesPesadas } from './embarquePesadas';

export function extraerNumero(valor) {
  if (!valor) return 0;
  const match = valor.toString().match(/^(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// "5-19" → 5 × 20 (19 se cuenta como 20); otro formato "a-b" → a × b.
function kilosCampoCrudo(valor) {
  if (!valor) return 0;
  const formatoGuion = /^(\d+)-(\d+)$/.exec(valor);
  if (formatoGuion) {
    const cantidad = parseInt(formatoGuion[1]) || 0;
    let medida = parseInt(formatoGuion[2]) || 0;
    if (medida === 19) medida = 20;
    return cantidad * medida;
  }
  const [cantidad, medida] = valor.split('-').map(Number);
  return cantidad * medida;
}

export function calcularKilosCrudoItem(item) {
  return kilosCampoCrudo(item.taras) + kilosCampoCrudo(item.sobrante) + kilosCampoCrudo(item.sobrante2);
}

export function totalesLimpio(productos, pesadas = (productos || []).map(calcularTotalesPesadas)) {
  const lista = productos || [];
  const taras = pesadas.reduce((total, p) => total + p.totalTaras, 0);
  const kilos = lista.reduce((total, producto, indice) => {
    if (producto.tipo === 'c/h20') {
      // c/h20: taras × bolsa del reporte, por el neto (0.65 por defecto)
      const reporteTaras = producto.reporteTaras || [];
      const reporteBolsas = producto.reporteBolsas || [];
      let suma = 0;
      for (let i = 0; i < reporteTaras.length; i++) {
        suma += (parseInt(reporteTaras[i]) || 0) * (parseInt(reporteBolsas[i]) || 0);
      }
      return total + suma * (producto.camaronNeto || 0.65);
    }
    return total + pesadas[indice].totalKilos;
  }, 0);
  return { taras, kilos };
}

export function totalesCrudo(crudos) {
  return (crudos || []).reduce((acc, crudo) => {
    if (!crudo || !Array.isArray(crudo.items)) return acc;
    crudo.items.forEach(item => {
      acc.taras += extraerNumero(item.taras) + extraerNumero(item.sobrante) + extraerNumero(item.sobrante2);
      acc.kilos += calcularKilosCrudoItem(item);
    });
    return acc;
  }, { taras: 0, kilos: 0 });
}

export function formatearKilos(kilos) {
  return kilos.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

// Suma de todos los clientes: productosPorCliente / crudosPorCliente son { clienteId: [...] }.
export function resumenEmbarque(productosPorCliente = {}, crudosPorCliente = {}) {
  const limpio = { taras: 0, kilos: 0 }, crudo = { taras: 0, kilos: 0 };
  Object.values(productosPorCliente || {}).forEach(productos => {
    const t = totalesLimpio(productos); limpio.taras += t.taras; limpio.kilos += t.kilos;
  });
  Object.values(crudosPorCliente || {}).forEach(crudos => {
    const t = totalesCrudo(crudos); crudo.taras += t.taras; crudo.kilos += t.kilos;
  });
  return { limpio, crudo };
}

export function textoResumenEmbarque({ limpio, crudo }) {
  return `Limpio ${limpio.taras}T / ${formatearKilos(limpio.kilos)} kg · Crudo ${crudo.taras}T / ${formatearKilos(crudo.kilos)} kg`;
}
