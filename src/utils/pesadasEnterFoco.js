// Destino del foco al presionar Enter en el editor de pesadas (Taras/Kilos).
// Enter en Tara N → Kilo N. Enter en Kilo N → Tara N+1 si existe; si no, null.
export function destinoEnterPesada(campo, indice, totalFilas) {
    if (campo === 'tara') return indice < totalFilas ? { campo: 'kilo', indice } : null;
    if (campo === 'kilo') return indice + 1 < totalFilas ? { campo: 'tara', indice: indice + 1 } : null;
    return null;
}
