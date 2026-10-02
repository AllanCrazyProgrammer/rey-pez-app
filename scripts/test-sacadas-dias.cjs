// Firestore real en un emulador local. No conecta con el proyecto del negocio.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const babel = require('@babel/core');
const { initializeApp, deleteApp } = require('firebase/app');
const firestore = require('firebase/firestore');
const root = path.resolve(__dirname, '..');
const projectId = 'demo-reypez-inventarios';

async function puertoLibre() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function run() {
  const jar = process.env.FIRESTORE_EMULATOR_JAR || path.join(os.homedir(), '.cache/firebase/emulators/cloud-firestore-emulator-v1.19.8.jar');
  assert.ok(fs.existsSync(jar), 'Configura FIRESTORE_EMULATOR_JAR con el JAR del emulador de Firestore compatible con tu Java.');
  const port = await puertoLibre();
  const emulator = spawn('java', ['-jar', jar, '--host', '127.0.0.1', '--port', String(port), '--project_id', projectId, '--single_project_mode', '--single_project_mode_error', '--rules', path.join(__dirname, 'fixtures/sacadas-emulator.rules')], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  emulator.stdout.on('data', chunk => { log = (log + chunk).slice(-8000); });
  emulator.stderr.on('data', chunk => { log = (log + chunk).slice(-8000); });
  let app; let db;
  try {
    let listo = false;
    for (let i = 0; i < 150; i++) {
      if (emulator.exitCode !== null) throw new Error(log);
      try { await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(200) }); listo = true; break; } catch (_) { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(listo, 'El emulador no inició: ' + log);
    app = initializeApp({ projectId, apiKey: 'solo-pruebas-locales' }, 'sacadas-prueba');
    db = firestore.initializeFirestore(app, { localCache: firestore.memoryLocalCache() });
    firestore.connectFirestoreEmulator(db, '127.0.0.1', port);

    const cache = new Map();
    function cargar(filename) {
      filename = require.resolve(filename);
      if (cache.has(filename)) return cache.get(filename);
      const exports = {}; cache.set(filename, exports);
      const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
      // Ejecutar en el mismo contexto que el SDK: Firestore valida el prototipo
      // de los objetos y rechaza objetos de un contexto vm distinto.
      new Function('exports', 'require', code)(exports, name => {
        if (name === '@/firebase') return { db };
        if (name.startsWith('@/')) return cargar(path.join(root, 'src', name.slice(2)));
        if (name.startsWith('.')) return cargar(path.resolve(path.dirname(filename), name));
        return require(name);
      });
      return exports;
    }
    const { guardarDiaLimpio } = cargar(path.join(root, 'src/services/sacadas.service.js'));
    const { borrarConRespaldo } = cargar(path.join(root, 'src/services/PapeleraService.js'));
    const { fechaRegistro } = cargar(path.join(root, 'src/utils/fechasInventario.js'));
    const { collection, doc, setDoc, updateDoc, getDoc, getDocsFromServer, disableNetwork, enableNetwork } = firestore;
    const reporte = fecha => ({ fecha: new Date(fecha + 'T18:00:00Z'), entradas: [], salidas: [{ proveedor: 'Prueba', medida: '41/50', kilos: 5 }], totalEntradas: 0, totalSalidas: 5 });
    const indice = fecha => doc(db, 'sacadasDias', fecha);
    const origen = id => doc(db, 'sacadas', id);

    // Un registro antiguo cerca de medianoche UTC pertenece al día de México.
    await setDoc(origen('antiguo'), { ...reporte('2026-09-25'), fecha: new Date('2026-09-26T03:00:00Z') });
    await assert.rejects(guardarDiaLimpio(reporte('2026-09-25')), error => error.code === 'dia-duplicado');
    assert.equal((await getDocsFromServer(collection(db, 'sacadas'))).size, 1);

    const carreras = await Promise.allSettled([guardarDiaLimpio(reporte('2026-12-31')), guardarDiaLimpio(reporte('2026-12-31'))]);
    assert.equal(carreras.filter(r => r.status === 'fulfilled').length, 1, 'Solo una creación simultánea puede ocupar la fecha: ' + JSON.stringify(carreras.map(r => r.reason?.message || r.value)));
    assert.equal(carreras.find(r => r.status === 'rejected').reason.code, 'dia-duplicado');
    const id = carreras.find(r => r.status === 'fulfilled').value;
    assert.equal((await getDoc(indice('2026-12-31'))).data().sacadaId, id);
    assert.equal((await getDocsFromServer(collection(db, 'sacadas'))).docs.filter(d => fechaRegistro(d.data().fecha) === '2026-12-31').length, 1);

    await guardarDiaLimpio({ ...reporte('2026-12-31'), totalSalidas: 7 }, { id, fechaOriginal: '2026-12-31' });
    await assert.rejects(guardarDiaLimpio(reporte('2026-09-25'), { id, fechaOriginal: '2026-12-31' }), error => error.code === 'dia-duplicado');
    assert.equal((await getDoc(origen(id))).data().totalSalidas, 7, 'Una fecha duplicada no sobrescribe los movimientos guardados');

    await guardarDiaLimpio(reporte('2027-01-01'), { id, fechaOriginal: '2026-12-31' });
    assert.equal((await getDoc(indice('2026-12-31'))).exists(), false);
    assert.equal((await getDoc(indice('2027-01-01'))).data().sacadaId, id);
    await assert.rejects(guardarDiaLimpio(reporte('2027-01-02'), { id, fechaOriginal: '2026-12-31' }), error => error.code === 'dia-cambiado');
    const libre = await guardarDiaLimpio(reporte('2026-12-31'));

    await assert.rejects(borrarConRespaldo('sacadas', libre, null, 'fallar-respaldo'), error => error.code === 'permission-denied');
    assert.equal((await getDoc(origen(libre))).exists(), true, 'Si falla la copia en papelera, el día permanece');
    assert.equal((await getDoc(indice('2026-12-31'))).data().sacadaId, libre);
    await updateDoc(origen(libre), { capturadoDesdeOtroEquipo: true });
    const copia = await borrarConRespaldo('sacadas', libre, { datoLocalObsoleto: true }, 'Borrado de prueba');
    assert.equal((await getDoc(origen(libre))).exists(), false);
    assert.equal((await getDoc(indice('2026-12-31'))).exists(), false);
    const respaldo = (await getDoc(doc(db, 'papelera', copia))).data();
    assert.equal(respaldo.docIdOriginal, libre);
    assert.equal(respaldo.datos.capturadoDesdeOtroEquipo, true, 'La copia conserva el contenido actual del servidor');
    assert.equal(fechaRegistro(respaldo.datos.fecha), '2026-12-31');
    await assert.rejects(guardarDiaLimpio(reporte('2026-12-31'), { id: libre, fechaOriginal: '2026-12-31' }), error => error.code === 'dia-eliminado');
    await guardarDiaLimpio(reporte('2026-12-31'));

    await setDoc(origen('otro-antiguo'), reporte('2026-09-25'));
    await setDoc(indice('2026-09-25'), { fecha: '2026-09-25', sacadaId: 'otro-antiguo' });
    await borrarConRespaldo('sacadas', 'antiguo', null, 'Quitar duplicado antiguo');
    assert.equal((await getDoc(indice('2026-09-25'))).data().sacadaId, 'otro-antiguo', 'Borrar un duplicado no libera la fecha del otro registro');
    await assert.rejects(guardarDiaLimpio(reporte('2026-09-25')), error => error.code === 'dia-duplicado');

    await disableNetwork(db);
    await assert.rejects(guardarDiaLimpio(reporte('2027-02-01')), 'No se guarda basándose en una caché sin conexión');
    await enableNetwork(db);
    assert.equal((await getDoc(indice('2027-02-01'))).exists(), false);
    console.log('PASS: concurrencia real, registros anteriores, cambio de fecha, borrado atómico con papelera, fallo de copia, editor obsoleto y guardado sin conexión.');
  } finally {
    if (db) await firestore.terminate(db);
    if (app) await deleteApp(app);
    const terminado = new Promise(resolve => emulator.once('exit', resolve));
    emulator.kill('SIGTERM');
    const timer = setTimeout(() => emulator.kill('SIGKILL'), 3000);
    if (emulator.exitCode === null) await terminado;
    clearTimeout(timer);
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
