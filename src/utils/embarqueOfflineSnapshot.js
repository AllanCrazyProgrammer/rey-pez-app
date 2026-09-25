import { normalizarFechaISO } from './dateUtils';
export function snapshotEmbarque(docId, data, fecha = data.fecha) {
  const clientes = Array.isArray(data.clientes) ? data.clientes : [];
  const productos = clientes.flatMap(cliente => {
    const productosCliente = Array.isArray(cliente.productos) ? cliente.productos : [];
    return productosCliente.map(producto => ({
      ...producto,
      clienteId: cliente.id,
      nombreCliente: cliente.nombre,
    }));
  });

  const clienteCrudos = {};
  clientes.forEach(cliente => {
    clienteCrudos[cliente.id] = Array.isArray(cliente.crudos) ? cliente.crudos : [];
  });
  
  // Normalizar la fecha para evitar problemas de zona horaria
  const fechaNormalizada = fecha ? normalizarFechaISO(typeof fecha.toDate === 'function' ? fecha.toDate() : fecha) : null;

  const docData = {
    ...JSON.parse(JSON.stringify(data)),
    fecha: fechaNormalizada,
  };

  const totalGananciasRaw = data.totalGanancias;
  const totalGanancias = Number.isFinite(Number(totalGananciasRaw)) ? Number(totalGananciasRaw) : null;

  return {
    id: docId,
    fecha: fechaNormalizada,
    cargaCon: data.cargaCon || '',
    camionNumero: data.camionNumero || 1,
    embarqueBloqueado: data.embarqueBloqueado || false,
    noEnviadoMexico: data.noEnviadoMexico || false,
    clientesPersonalizados: data.clientesPersonalizados || [],
    clientesJuntarMedidas: data.clientesJuntarMedidas || {},
    clientesReglaOtilio: data.clientesReglaOtilio || {},
    clientesIncluirPrecios: data.clientesIncluirPrecios || {},
    clientesCuentaEnPdf: data.clientesCuentaEnPdf || {},
    clientesSumarKgCatarro: data.clientesSumarKgCatarro || {},
    clientes: clientes,
    productos,
    clienteCrudos,
    costosPorMedida: data.costosPorMedida || {},
    aplicarCostoExtra: data.aplicarCostoExtra || {},
    costoExtra: data.costoExtra !== undefined ? data.costoExtra : 18,
    medidasConfiguracion: data.medidasConfiguracion || [],
    preciosActuales: [],
    totalGanancias,
    docData,
  };

}
