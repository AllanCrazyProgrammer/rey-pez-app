// Carrera real de crearCuentaOzuna / sincronizarCuentaOzunaParaNota contra el emulador.
// Un abono que se confirma después de la consulta de la fecha y antes del commit
// tiene que seguir en la nota. Con updateDoc sobre el arreglo leído, se pierde.
// Proyecto demo-* solamente. El SDK de Firestore que usa el servicio es el real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { loadSource } = require('./helpers/embarques-source.cjs');

const projectId = 'demo-reypez-ozuna-carrera';
const FECHA = '2026-10-06';
const ID_LEGACY = 'ozuna-legacy-2026-10-06';
const ABONO_A = { descripcion: '06/10/2026 - Efectivo', monto: 150, stashItemId: 's1', esEfectivo: true };
const ABONO_B = { descripcion: '06/10/2026 - Transferencia', monto: 40, stashItemId: 's2', esEfectivo: false };
const ABONO_TARDE = { descripcion: '06/10/2026 - Deposito', monto: 77, stashItemId: 's9', esEfectivo: false };
const EMBARQUE = {
  fecha: FECHA,
  productos: [{ medida: '61/70', kilos: [50], taras: [5], precio: 21, esVenta: false }],
  clienteCrudos: {}
};

function jarEmulador() {
  return process.env.FIRESTORE_EMULATOR_JAR
    || path.join(os.homedir(), '.cache/firebase/emulators/cloud-firestore-emulator-v1.19.8.jar');
}

function puertoLibre() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function esperarEmulador(port, emulator, log) {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    const timer = setInterval(() => {
      if (emulator.exitCode !== null) {
        clearInterval(timer);
        reject(new Error(log()));
        return;
      }
      fetch(`http://127.0.0.1:${port}/`).then(() => {
        clearInterval(timer);
        resolve();
      }).catch(() => {
        if (Date.now() - inicio > 20000) {
          clearInterval(timer);
          reject(new Error('El emulador no respondió'));
        }
      });
    }, 100);
  });
}

/**
 * El servicio real consulta `fecha ==`. Después de esa lectura, y antes de
 * devolver el snapshot, otro cliente confirma el abono. Quien escriba el
 * arreglo de esa lectura pisa el abono. La transacción tiene que volver a
 * leer el documento y fusionar esa versión.
 */
function envolverFirestore(real, db, db2, modo) {
  const marcas = new WeakMap();
  let inyectado = false;

  async function inyectarAbono(id) {
    if (inyectado) return;
    inyectado = true;
    const ref = real.doc(db2, 'cuentasOzuna', id);
    const snap = await real.getDoc(ref);
    const previos = snap.exists() ? (snap.data().abonos || []) : [];
    await real.updateDoc(ref, { abonos: [...previos, ABONO_B] });
  }

  async function inyectarPlaceholder(id) {
    if (inyectado) return;
    inyectado = true;
    await real.setDoc(real.doc(db2, 'cuentasOzuna', id), {
      fecha: FECHA,
      items: [],
      cobros: [],
      abonos: [ABONO_TARDE],
      saldoAcumuladoAnterior: 500,
      totalGeneral: 0,
      totalSaldo: 423,
      nuevoSaldoAcumulado: 423,
      pendienteEmbarque: true,
      origenAsistente: 'abono-ozuna'
    });
  }

  return {
    ...real,
    getFirestore: () => db,
    where(...args) {
      const constraint = real.where(...args);
      marcas.set(constraint, args);
      return constraint;
    },
    query(ref, ...constraints) {
      const consulta = real.query(ref, ...constraints);
      const fechaIgual = constraints
        .map((constraint) => marcas.get(constraint))
        .find((args) => args && args[0] === 'fecha' && args[1] === '==' && args[2] === FECHA);
      if (fechaIgual) marcas.set(consulta, fechaIgual);
      return consulta;
    },
    async getDocs(consulta) {
      const resultado = await real.getDocs(consulta);
      if (modo === 'abono-tarde' && marcas.has(consulta)) {
        const placeholder = resultado.docs.find((item) => item.data().pendienteEmbarque === true);
        if (placeholder) await inyectarAbono(placeholder.id);
      }
      return resultado;
    },
    runTransaction(database, fn) {
      return real.runTransaction(database, async (tx) => fn({
        get: async (ref) => {
          const snap = await tx.get(ref);
          if (modo === 'placeholder-tarde' && !snap.exists() && ref.id === FECHA) {
            await inyectarPlaceholder(ref.id);
          }
          return snap;
        },
        set: (ref, data) => tx.set(ref, data),
        update: (ref, data) => tx.update(ref, data)
      }));
    }
  };
}

function servicioCon(real, db, db2, modo) {
  return loadSource('src/services/EmbarqueCuentasService.js', {
    'firebase/firestore': envolverFirestore(real, db, db2, modo)
  });
}

async function vaciar(real, db) {
  const snap = await real.getDocs(real.collection(db, 'cuentasOzuna'));
  await Promise.all(snap.docs.map((item) => real.deleteDoc(item.ref)));
}

async function sembrarAnterior(real, db) {
  await real.setDoc(real.doc(db, 'cuentasOzuna', '2026-10-05'), {
    fecha: '2026-10-05',
    items: [{ kilos: 10, medida: 'previo', costo: 50, total: 500, esVenta: false }],
    cobros: [],
    abonos: [],
    totalGeneral: 500,
    saldoAcumuladoAnterior: 0,
    totalSaldo: 500,
    nuevoSaldoAcumulado: 500
  });
}

function placeholderLegacy() {
  return {
    fecha: FECHA,
    items: [],
    cobros: [],
    abonos: [ABONO_A],
    saldoAcumuladoAnterior: 0,
    totalGeneral: 0,
    totalSaldo: -150,
    nuevoSaldoAcumulado: -150,
    pendienteEmbarque: true,
    origenAsistente: 'abono-ozuna'
  };
}

async function notasDeHoy(real, db) {
  const snap = await real.getDocs(real.query(
    real.collection(db, 'cuentasOzuna'),
    real.where('fecha', '==', FECHA)
  ));
  return snap.docs.map((item) => ({ id: item.id, data: item.data() }));
}

(async () => {
  if (!String(projectId).startsWith('demo-')) throw new Error('Solo proyectos demo-*');
  const jar = jarEmulador();
  assert.ok(fs.existsSync(jar), 'Configura FIRESTORE_EMULATOR_JAR');
  const port = await puertoLibre();
  let texto = '';
  const emulator = spawn('java', [
    '-jar', jar,
    '--host', '127.0.0.1',
    '--port', String(port),
    '--project_id', projectId,
    '--single_project_mode',
    '--single_project_mode_error',
    '--rules', path.join(__dirname, 'fixtures', 'sacadas-emulator.rules')
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  emulator.stdout.on('data', (chunk) => { texto = (texto + chunk).slice(-4000); });
  emulator.stderr.on('data', (chunk) => { texto = (texto + chunk).slice(-4000); });
  const { initializeApp, deleteApp } = await import('firebase/app');
  const real = await import('firebase/firestore');
  let app;
  let app2;
  try {
    await esperarEmulador(port, emulator, () => texto);
    app = initializeApp({ projectId, apiKey: 'demo', appId: 'demo-reypez-ozuna-carrera' });
    app2 = initializeApp({ projectId, apiKey: 'demo', appId: 'demo-reypez-ozuna-carrera-writer' }, 'writer');
    const db = real.getFirestore(app);
    const db2 = real.getFirestore(app2);
    real.connectFirestoreEmulator(db, '127.0.0.1', port);
    real.connectFirestoreEmulator(db2, '127.0.0.1', port);

    await vaciar(real, db);
    await sembrarAnterior(real, db);
    await real.setDoc(real.doc(db, 'cuentasOzuna', ID_LEGACY), placeholderLegacy());
    const boton = servicioCon(real, db, db2, 'abono-tarde');
    const idBoton = await boton.crearCuentaOzuna(EMBARQUE, null);
    const hoyBoton = await notasDeHoy(real, db);
    assert.equal(idBoton, ID_LEGACY);
    assert.equal(hoyBoton.length, 1);
    assert.equal(hoyBoton[0].id, ID_LEGACY);
    assert.equal((await real.getDoc(real.doc(db, 'cuentasOzuna', FECHA))).exists(), false);
    const abonosBoton = hoyBoton[0].data.abonos;
    assert.deepEqual(abonosBoton.map((abono) => abono.stashItemId).sort(), ['s1', 's2']);
    assert.equal(abonosBoton.filter((abono) => abono.stashItemId === 's2').length, 1);
    assert.equal(abonosBoton.find((abono) => abono.stashItemId === 's2').monto, 40);
    assert.equal(hoyBoton[0].data.totalGeneral, 1050);
    assert.equal(hoyBoton[0].data.nuevoSaldoAcumulado, 500 + 1050 - 150 - 40);
    assert.equal(hoyBoton[0].data.totalSaldo, hoyBoton[0].data.nuevoSaldoAcumulado);
    assert.equal(hoyBoton[0].data.pendienteEmbarque, false);
    assert.equal(Object.prototype.hasOwnProperty.call(hoyBoton[0].data, 'firmaEmbarque'), false);
    console.log('✓ crearCuentaOzuna conserva el abono confirmado después de la consulta, sin duplicar la nota');

    await vaciar(real, db);
    await sembrarAnterior(real, db);
    await real.setDoc(real.doc(db, 'cuentasOzuna', ID_LEGACY), placeholderLegacy());
    const pdf = servicioCon(real, db, db2, 'abono-tarde');
    const decision = await pdf.sincronizarCuentaOzunaParaNota(EMBARQUE, 'emb-carrera');
    const hoyPdf = await notasDeHoy(real, db);
    assert.equal(decision.accion, 'actualizar');
    assert.equal(decision.id, ID_LEGACY);
    assert.equal(hoyPdf.length, 1);
    assert.equal(hoyPdf[0].id, ID_LEGACY);
    assert.deepEqual(hoyPdf[0].data.abonos.map((abono) => abono.stashItemId).sort(), ['s1', 's2']);
    assert.equal(hoyPdf[0].data.nuevoSaldoAcumulado, 500 + 1050 - 150 - 40);
    assert.equal(hoyPdf[0].data.pendienteEmbarque, false);
    assert.equal(hoyPdf[0].data.embarqueId, 'emb-carrera');
    assert.ok(hoyPdf[0].data.firmaEmbarque);
    console.log('✓ el PDF conserva el mismo abono tardío en la misma nota');

    await vaciar(real, db);
    await sembrarAnterior(real, db);
    const aparece = servicioCon(real, db, db2, 'placeholder-tarde');
    const idAparece = await aparece.crearCuentaOzuna(EMBARQUE, null);
    const hoyAparece = await notasDeHoy(real, db);
    assert.equal(idAparece, FECHA);
    assert.equal(hoyAparece.length, 1);
    assert.equal(hoyAparece[0].id, FECHA);
    assert.equal(hoyAparece[0].data.abonos.length, 1);
    assert.equal(hoyAparece[0].data.abonos[0].stashItemId, 's9');
    assert.equal(hoyAparece[0].data.abonos[0].monto, 77);
    assert.equal(hoyAparece[0].data.items[0].kilos, 50);
    assert.equal(hoyAparece[0].data.totalGeneral, 1050);
    assert.equal(hoyAparece[0].data.nuevoSaldoAcumulado, 500 + 1050 - 77);
    console.log('✓ un placeholder que aparece antes del commit se completa, sin segunda nota ni perder el abono');

    await vaciar(real, db);
    await sembrarAnterior(real, db);
    const manual = {
      fecha: FECHA,
      items: [{ kilos: 10, medida: 'mano', costo: 5, total: 50, esVenta: false }],
      cobros: [],
      abonos: [ABONO_A],
      saldoAcumuladoAnterior: 500,
      totalGeneral: 50,
      totalSaldo: 400,
      nuevoSaldoAcumulado: 400
    };
    await real.setDoc(real.doc(db, 'cuentasOzuna', 'hecha-a-mano'), manual);
    const noPisar = servicioCon(real, db, db2, null);
    await assert.rejects(
      () => noPisar.crearCuentaOzuna(EMBARQUE, null),
      (error) => error.code === 'cuenta-duplicada'
    );
    const hoyManual = await notasDeHoy(real, db);
    assert.equal(hoyManual.length, 1);
    assert.equal(hoyManual[0].id, 'hecha-a-mano');
    assert.deepEqual(hoyManual[0].data.abonos, [ABONO_A]);
    assert.equal(hoyManual[0].data.items[0].medida, 'mano');
    assert.equal((await real.getDoc(real.doc(db, 'cuentasOzuna', FECHA))).exists(), false);
    console.log('✓ una cuenta manual de la fecha no se pisa ni se duplica');

    console.log(`PASS ozuna abono concurrente (${projectId})`);
  } finally {
    if (app2) await deleteApp(app2).catch(() => {});
    if (app) await deleteApp(app).catch(() => {});
    emulator.kill('SIGKILL');
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
