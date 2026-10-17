// Id del cliente Catarro en embarques (CLIENTES_PREDEFINIDOS). Las cuentas
// usan la clave `catarro`; el embarque siempre usa este id, no el nombre.
export const ID_CLIENTE_CATARRO = '2';

export const CLIENTES_CONFIG = {
  joselito: {
    coleccion: 'cuentasJoselito',
    titulo: 'Cuentas Joselito',
    clienteId: 'joselito',
    backPath: '/cuentas-joselito',
    routeName: 'CuentasJoselito',
    features: {},
  },
  veronica: {
    coleccion: 'cuentasVeronica',
    titulo: 'Cuentas Veronica',
    clienteId: 'veronica',
    backPath: '/cuentas-veronica',
    routeName: 'CuentasVeronica',
    features: { notaLock: true, verificarEmbarques: true },
  },
  otilio: {
    coleccion: 'cuentasOtilio',
    titulo: 'Cuentas Otilio',
    clienteId: 'otilio',
    backPath: '/cuentas-otilio',
    routeName: 'CuentasOtilio',
    features: { verificacionCheckbox: true },
  },
  catarro: {
    coleccion: 'cuentasCatarro',
    titulo: 'Cuentas Catarro',
    clienteId: 'catarro',
    idEmbarque: ID_CLIENTE_CATARRO,
    backPath: '/cuentas-catarro',
    routeName: 'CuentasCatarro',
    features: {},
  },
  otilioIndependiente: {
    coleccion: 'cuentasOtilioIndependiente',
    titulo: 'Cuentas Independientes Otilio',
    clienteId: 'otilioIndependiente',
    backPath: '/cuentas-otilio-independiente',
    routeName: 'CuentasOtilioIndependiente',
    features: { abonosGenerales: true },
  },
};

export function esClienteCatarro(clienteOrId) {
  const id = clienteOrId && typeof clienteOrId === 'object'
    ? (clienteOrId.id ?? clienteOrId.clienteId)
    : clienteOrId;
  return String(id ?? '') === String(CLIENTES_CONFIG.catarro.idEmbarque);
}
