#!/usr/bin/env node
/**
 * Deudas con proveedores (Procesos → Deudas, colección `deudas`) por el asistente.
 * Mismo documento que NuevaDeuda.vue + subcolección productos; pendiente como DeudasMenu.
 *
 *   NODE_ENV=test node scripts/test-asistente-deudas.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { conEmulador, callHandler } = require('./lib/asistente-emulator.cjs');

// Lógica de saldo de la app (src/utils/deudas.js), igual que test-deudas-saldo.cjs: lo que el asistente escribe
// debe ser lo mismo que la app recalcula al registrar el primer abono.
const app = {};
new Function('m', fs.readFileSync(path.join(__dirname, '../src/utils/deudas.js'), 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/export (async )?function (mutarDeuda|registrarAbono|eliminarAbono|agregarProducto|actualizarProducto|eliminarProducto|aplicarAbonoGeneral|proveedorTieneDeudas)[\s\S]*?\n}\n/g, '')
  .replace(/export /g, '') + '\nObject.assign(m,{calcularSaldo,validarProducto});')(app);

async function cuadraConApp(db, id) {
  const ref = db.collection('deudas').doc(id);
  const d = (await ref.get()).data();
  const productos = (await ref.collection('productos').get()).docs.map((x) => x.data());
  const abonos = (await ref.collection('abonos').get()).docs.map((x) => x.data());
  for (const p of productos) assert.equal(app.validarProducto(p), null, JSON.stringify(p));
  const s = app.calcularSaldo(productos, abonos);
  assert.deepEqual({ total: d.total, saldoPendiente: d.saldoPendiente, estado: d.estado },
    { total: s.total, saldoPendiente: s.saldoPendiente, estado: s.estado }, `deuda ${id} no cuadra con calcularSaldo de la app`);
}

const MEMO = '6Cz1trqhhnmscsCujDXH';

conEmulador('demo-reypez-deudas', async ({ db, handlers }) => {
  const { handlePostDeudas, handleGetDeudas, handlePostDeudasDeshacer } = handlers;
  assert.equal(typeof handlePostDeudas, 'function', 'falta handlePostDeudas en functions/asistente.js');

  await db.collection('proveedoresDeuda').doc(MEMO).set({ nombre: 'Memo Gonzáles', color: '#3498DB', telefono: '' });
  await db.collection('proveedoresDeuda').doc('aaron1').set({ nombre: 'Aaron', color: '#F39C12', telefono: '' });
  // Deuda pendiente previa de Memo ($11,713, como la de producción que reporta Ally) y una pagada.
  await db.collection('deudas').doc('asistente-20261024-memo-pacch').set({
    proveedorId: MEMO, proveedorNombre: 'Memo Gonzáles', fecha: '2026-10-24', fechaCreacion: new Date('2026-10-24T20:30:31Z'),
    total: 11713, saldoPendiente: 11713, estado: 'pendiente'
  });
  await db.doc('deudas/asistente-20261024-memo-pacch/productos/asistente-20261024-memo-pacch-p1')
    .set({ kilos: 137.8, producto: 'Pac Ch hilo verde', precio: 85, total: 11713 });
  await db.collection('deudas').doc('asistente-20261023-memo-nota381').set({
    proveedorId: MEMO, proveedorNombre: 'Memo Gonzáles', fecha: '2026-10-23', fechaCreacion: new Date('2026-10-23T20:11:07Z'),
    nota: '381', total: 21050.25, saldoPendiente: 0, estado: 'pagado', fechaActualizacion: new Date('2026-10-24T19:14:13Z')
  });
  await db.collection('deudas').doc('aaron-vieja').set({
    proveedorId: 'aaron1', proveedorNombre: 'Aaron', fecha: '2026-10-01', fechaCreacion: new Date(),
    total: 5000, saldoPendiente: 2000, estado: 'pendiente'
  });

  const ejemplo = { proveedorId: MEMO, fecha: '2026-10-28', nota: '386', total: 21318, idempotencyKey: 'deuda-memo-386' };

  // Validaciones
  let r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, proveedorId: 'nope' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'PROVEEDOR_DESCONOCIDO');
  assert.ok(r.body.error.details.proveedores.some((p) => p.id === MEMO));
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, proveedorId: undefined, proveedor: 'Pancho' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'PROVEEDOR_DESCONOCIDO');
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, proveedor: 'Aaron' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'PROVEEDOR_NO_COINCIDE');
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, idempotencyKey: 'a/b' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'IDEMPOTENCY_KEY_INVALIDA');
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, idempotencyKey: undefined });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'IDEMPOTENCY_KEY_REQUERIDA');
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, fecha: '28/10/2026' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'FECHA_INVALIDA');
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, nota: '  ' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'NOTA_REQUERIDA');
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, total: -5 });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'TOTAL_INVALIDO');
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, total: 100, lineas: [{ producto: 'Pac ch', kg: 2, precio: 85 }] });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'TOTAL_NO_CUADRA');
  console.log('✓ Validaciones: proveedor por id/nombre, idempotencyKey, fecha, nota, total');

  // dryRun no escribe
  const tam = async () => (await db.collection('deudas').get()).size;
  const antes = await tam();
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, dryRun: true, idempotencyKey: undefined });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.deudaId, null);
  assert.equal(r.body.pendienteProveedor.antes, 11713);
  assert.equal(r.body.pendienteProveedor.despues, 33031);
  assert.equal(await tam(), antes);
  assert.equal((await db.collection('asistenteLog').get()).size, 0);
  assert.equal((await db.collection('asistenteIdem').get()).size, 0);
  console.log('✓ dryRun: pendiente de Memo 11,713 → 33,031 sin escribir');

  // Ejemplo de Ally: Memo Gonzáles, nota 386, $21,318
  r = await callHandler(handleGetDeudas, 'GET', `/deudas?proveedorId=${MEMO}&pendientes=true`);
  assert.equal(r.status, 200); assert.equal(r.body.totalPendiente, 11713); assert.equal(r.body.deudas.length, 1);
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', ejemplo);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const deudaId = r.body.deudaId;
  assert.equal(deudaId, 'asistente-20261028-memo-nota386');
  const snap = await db.collection('deudas').doc(deudaId).get();
  const d = snap.data();
  assert.deepEqual(Object.keys(d).sort(), ['estado', 'fecha', 'fechaCreacion', 'nota', 'proveedorId', 'proveedorNombre', 'saldoPendiente', 'total']);
  assert.equal(d.proveedorId, MEMO); assert.equal(d.proveedorNombre, 'Memo Gonzáles');
  assert.equal(d.fecha, '2026-10-28'); assert.equal(d.nota, '386');
  assert.equal(d.total, 21318); assert.equal(d.saldoPendiente, 21318); assert.equal(d.estado, 'pendiente');
  assert.equal(typeof d.fechaCreacion.toDate, 'function', 'fechaCreacion debe ser Timestamp como new Date() de la app');
  const prods = (await db.collection('deudas').doc(deudaId).collection('productos').get()).docs;
  assert.equal(prods.length, 1);
  assert.equal(prods[0].id, `${deudaId}-p1`);
  assert.deepEqual(prods[0].data(), { kilos: 1, producto: 'Nota 386', precio: 21318, total: 21318 });
  assert.equal((await db.collection('deudas').doc(deudaId).collection('abonos').get()).size, 0);
  await cuadraConApp(db, deudaId);
  const logs = (await db.collection('asistenteLog').get()).docs.map((x) => x.data());
  assert.equal(logs.length, 1); assert.equal(logs[0].operation, 'deudas_create'); assert.equal(logs[0].deudaId, deudaId);
  r = await callHandler(handleGetDeudas, 'GET', `/deudas?proveedor=memo%20gonzales&pendientes=true`);
  assert.equal(r.status, 200);
  assert.equal(r.body.proveedor.id, MEMO);
  assert.equal(r.body.totalPendiente, 33031);
  assert.equal(r.body.notasPendientes, 2);
  assert.deepEqual(r.body.deudas.map((x) => x.id), [deudaId, 'asistente-20261024-memo-pacch']);
  console.log('✓ Ejemplo de Ally: deuda nota 386 $21,318 con forma de NuevaDeuda; GET pendiente 11,713 → 33,031');

  // Reintento idempotente
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', ejemplo);
  assert.equal(r.status, 200); assert.equal(r.body.replay, true); assert.equal(r.body.deudaId, deudaId);
  assert.equal((await db.collection('asistenteLog').get()).size, 1);
  console.log('✓ Reintento idempotente devuelve la misma deuda');

  // Duplicado proveedor + nota (también la vieja nota 381 escrita por el asistente)
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, nota: 386, fecha: '2026-10-29', idempotencyKey: 'otra' });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'DEUDA_DUPLICADA'); assert.equal(r.body.error.details.deudaId, deudaId);
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, proveedorId: undefined, proveedor: 'Memo Gonzáles', referencia: '381', nota: undefined, idempotencyKey: 'otra-381' });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'DEUDA_DUPLICADA');
  // Misma nota con otro proveedor sí se permite (dryRun)
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, proveedorId: 'aaron1', dryRun: true, idempotencyKey: undefined });
  assert.equal(r.status, 200); assert.equal(r.body.pendienteProveedor.antes, 2000);
  console.log('✓ Proveedor + nota duplicados → 409 DEUDA_DUPLICADA (incluye nota 381 previa); otro proveedor sí');

  // Llave usada por otra operación
  await db.collection('asistenteIdem').doc('llave-notas').set({ operation: 'notas_create', response: {} });
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', { ...ejemplo, nota: '999', idempotencyKey: 'llave-notas' });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'IDEMPOTENCY_KEY_EN_USO');
  console.log('✓ idempotencyKey de otra operación → 409 IDEMPOTENCY_KEY_EN_USO');

  // Con lineas (forma de productos de NuevaDeuda) por nombre de proveedor
  r = await callHandler(handlePostDeudas, 'POST', '/deudas', {
    proveedor: 'aaron', fecha: '2026-10-28', nota: 'A-12', idempotencyKey: 'deuda-aaron-a12',
    lineas: [{ producto: 'Pac ch', kg: 103.65, precio: 85 }, { producto: 'Rojo', kg: 10, precio: 120 }]
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const aaronId = r.body.deudaId;
  assert.equal(aaronId, 'asistente-20261028-aaron-notaa-12');
  assert.equal(r.body.deuda.total, 10010.25);
  const pa = (await db.collection('deudas').doc(aaronId).collection('productos').get()).docs.map((x) => x.data());
  assert.deepEqual(pa.find((p) => p.producto === 'Pac ch'), { kilos: 103.65, producto: 'Pac ch', precio: 85, total: 8810.25 });
  await cuadraConApp(db, aaronId);
  console.log('✓ lineas → productos { kilos, producto, precio, total } y total redondeado a centavos');

  // GET general: saldo como Existencias (estado pendiente) y resumen por proveedor
  r = await callHandler(handleGetDeudas, 'GET', '/deudas');
  assert.equal(r.status, 200);
  assert.equal(r.body.saldoPendienteDeudas, 11713 + 21318 + 2000 + 10010.25);
  assert.equal(r.body.proveedores.find((p) => p.id === MEMO).totalPendiente, 33031);
  console.log('✓ GET /deudas sin proveedor: saldo como Existencias y resumen por proveedor');

  // Deshacer: se niega si hay abono; después de quitarlo, borra deuda y productos
  const abonoRef = await db.collection('deudas').doc(aaronId).collection('abonos').add({
    descripcion: 'Pago', monto: 10, fecha: '2026-10-28', fechaCreacion: new Date(), esAbonoGeneral: false
  });
  r = await callHandler(handlePostDeudasDeshacer, 'POST', '/deudas/deshacer', { idempotencyKey: 'deuda-aaron-a12' });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'DEUDA_MODIFICADA');
  assert.ok(r.body.error.details.camposCambiados.includes('abonos'));
  await abonoRef.delete();
  await db.collection('deudas').doc(aaronId).update({ saldoPendiente: 0, estado: 'pagado', fechaActualizacion: new Date() });
  r = await callHandler(handlePostDeudasDeshacer, 'POST', '/deudas/deshacer', { idempotencyKey: 'deuda-aaron-a12' });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'DEUDA_MODIFICADA');
  assert.ok(r.body.error.details.camposCambiados.includes('estado'));
  assert.ok((await db.collection('deudas').doc(aaronId).get()).exists);

  r = await callHandler(handlePostDeudasDeshacer, 'POST', '/deudas/deshacer', { idempotencyKey: 'deuda-memo-386', dryRun: true });
  assert.equal(r.status, 200); assert.equal(r.body.deudaEliminada, false);
  assert.ok((await db.collection('deudas').doc(deudaId).get()).exists);
  r = await callHandler(handlePostDeudasDeshacer, 'POST', '/deudas/deshacer', { idempotencyKey: 'deuda-memo-386' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.deudaEliminada, true); assert.equal(r.body.productosEliminados, 1);
  assert.equal((await db.collection('deudas').doc(deudaId).get()).exists, false);
  assert.equal((await db.collection('deudas').doc(deudaId).collection('productos').get()).size, 0);
  r = await callHandler(handlePostDeudasDeshacer, 'POST', '/deudas/deshacer', { idempotencyKey: 'deuda-memo-386' });
  assert.equal(r.status, 200); assert.equal(r.body.deudaEliminada, true);
  r = await callHandler(handlePostDeudasDeshacer, 'POST', '/deudas/deshacer', { idempotencyKey: 'deuda-memo-386', undoIdempotencyKey: 'otro-undo' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'YA_DESHECHO');
  r = await callHandler(handlePostDeudasDeshacer, 'POST', '/deudas/deshacer', { idempotencyKey: 'no-existe' });
  assert.equal(r.status, 404); assert.equal(r.body.error.code, 'OPERACION_NO_ENCONTRADA');
  r = await callHandler(handleGetDeudas, 'GET', `/deudas?proveedorId=${MEMO}&pendientes=true`);
  assert.equal(r.body.totalPendiente, 11713);
  assert.equal((await db.collection('deudas').doc('asistente-20261024-memo-pacch').get()).data().saldoPendiente, 11713);
  const ops = (await db.collection('asistenteLog').get()).docs.map((x) => x.data().operation).sort();
  assert.deepEqual(ops, ['deudas_create', 'deudas_create', 'deudas_undo']);
  console.log('✓ Deshacer: 409 con abonos/cambios; dryRun no borra; borra deuda + productos; repetir no duplica; 404 sin operación');

  console.log('PASS asistente deudas');
});
