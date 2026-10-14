/**
 * Cuentas que el resumen del embarque crea si todavía no existen para la fecha.
 * Ozuna y Lorena/Verónica ya estaban en este flujo; Catarro sigue el mismo patrón.
 * El id de cliente es el de los clientes fijos del embarque (Catarro = 2).
 */
export const CUENTAS_AUTOMATICAS_RESUMEN = [
  { id: 'ozuna', clienteId: '4', nombre: 'Ozuna' },
  { id: 'veronica', clienteId: '5', nombre: 'Lorena / Verónica' },
  { id: 'catarro', clienteId: '2', nombre: 'Catarro' },
];

/**
 * @param {Record<string, boolean>} existePorId
 * @returns {Array<{ id: string, clienteId: string, nombre: string }>}
 */
export function cuentasFaltantesParaResumen(existePorId = {}) {
  return CUENTAS_AUTOMATICAS_RESUMEN.filter((cuenta) => !existePorId[cuenta.id]);
}
