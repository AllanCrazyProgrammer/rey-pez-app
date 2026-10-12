// Revisión compartida del documento embarques/{id}.
// No toca producción: se niega a arrancar si falta FIRESTORE_EMULATOR_HOST
// y usa un project id demo, que el emulador acepta sin credenciales.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const hostEmulador = process.env.FIRESTORE_EMULATOR_HOST;
if (!hostEmulador) {
  console.error('Rechazado: define FIRESTORE_EMULATOR_HOST (host:puerto). Este script no escribe en Firestore de producción.');
  process.exit(1);
}

const projectId = 'demo-reypez-embarques';
const root = path.resolve(__dirname, '..');

function compilar(archivo, requireLocal) {
  const source = fs.readFileSync(path.join(root, archivo), 'utf8');
  const codigo = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: archivo,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const modulo = { exports: {} };
  vm.runInNewContext(codigo, {
    module: modulo,
    exports: modulo.exports,
    console,
    require: requireLocal,
  }, { filename: archivo });
  return modulo.exports;
}

function partirHost(valor) {
  const texto = String(valor).replace(/^https?:\/\//, '');
  const corte = texto.lastIndexOf(':');
  if (corte <= 0) throw new Error('FIRESTORE_EMULATOR_HOST debe ser host:puerto');
  return { host: texto.slice(0, corte), port: Number(texto.slice(corte + 1)) };
}

(async () => {
  const { initializeApp } = await import('firebase/app');
  const firestoreReal = await import('firebase/firestore');
  const {
    getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc,
  } = firestoreReal;
  // El servicio se evalúa en otra realm (vm). Firestore rechaza esos objetos
  // con "custom Object". Se copian al realm principal; los centinelas
  // (serverTimestamp) se dejan igual.
  const alRealm = (value) => {
    if (value === null || typeof value !== 'object') return value;
    const nombre = value.constructor && value.constructor.name;
    if (Array.isArray(value) || nombre === 'Array') return Array.from(value, alRealm);
    const proto = Object.getPrototypeOf(value);
    const plano = proto === Object.prototype || proto === null || nombre === 'Object';
    if (!plano) return value;
    const salida = {};
    Object.keys(value).forEach(clave => { salida[clave] = alRealm(value[clave]); });
    return salida;
  };
  const firestore = {
    ...firestoreReal,
    runTransaction: (db, fn) => firestoreReal.runTransaction(db, async (transaction) => fn({
      get: (ref) => transaction.get(ref),
      set: (ref, data, opciones) => transaction.set(ref, alRealm(data), opciones),
      update: (ref, data) => transaction.update(ref, alRealm(data)),
      delete: (ref) => transaction.delete(ref),
    })),
  };

  const revision = compilar('src/utils/embarqueRevision.js', () => {
    throw new Error('embarqueRevision no tiene dependencias');
  });
  const { escribirCamposEmbarque, escribirCamposEmbarquesAtomico } = compilar('src/services/embarqueEscritura.js', (id) => {
    if (id === 'firebase/firestore') return firestore;
    if (id === '@/utils/embarqueRevision') return revision;
    throw new Error('Dependencia inesperada: ' + id);
  });

  const {
    esEcoDeRevisionLocal, planearEscritura, seleccionarCampos, quitarCamposAjenosAlEditor, CAMPOS_EDITOR,
  } = revision;

  assert.equal(CAMPOS_EDITOR.includes('kilosCrudos'), false);
  assert.equal(CAMPOS_EDITOR.includes('precioMaquila'), false);
  assert.equal(esEcoDeRevisionLocal({ revRemota: 3, revBase: 3, inicializando: false }), true);
  assert.equal(esEcoDeRevisionLocal({ revRemota: 4, revBase: 3, inicializando: false }), false);
  assert.equal(planearEscritura({
    remoto: { rev: 4, kilosCrudos: { '16/20': 250 }, clientes: [{ id: '1' }] },
    baseRev: 3,
    baseCampos: { clientes: [{ id: '1' }] },
    campos: { clientes: [{ id: '1', productos: [{ id: 'p' }] }] },
  }).accion, 'fusionar');

  const { host, port } = partirHost(hostEmulador);
  const app = initializeApp({
    projectId,
    apiKey: 'demo',
    appId: 'demo-reypez-embarques',
  }, 'test-embarque-revision');
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, port);

  const creado = [];
  const referencia = (id) => {
    creado.push(id);
    return doc(db, 'embarques', id);
  };
  const leer = async (id) => (await getDoc(doc(db, 'embarques', id))).data();

  try {
    // --- La secuencia vieja sí revierte. El editor ve el mismo `rev` y lo trata como eco. ---
    const ciego = referencia('revision-ciego');
    await setDoc(ciego, {
      rev: 3,
      kilosCrudos: { '16/20': 100 },
      analizarGanancia: { '16/20': true },
      precioMaquila: { '16/20': 12 },
      rendimientoManual: {},
      medidaOculta: { '16/20': false },
      totalGanancias: 40,
      clientes: [{ id: '1', productos: [] }],
    });
    await updateDoc(ciego, {
      kilosCrudos: { '16/20': 250 },
      analizarGanancia: { '16/20': true },
      precioMaquila: { '16/20': 18 },
      totalGanancias: 90,
    });
    const intermedio = await leer('revision-ciego');
    assert.equal(intermedio.rev, 3);
    assert.equal(esEcoDeRevisionLocal({
      revRemota: intermedio.rev,
      revBase: 3,
      inicializando: false,
    }), true, 'sin subir rev el editor ignora el snapshot');
    await updateDoc(ciego, {
      kilosCrudos: { '16/20': 100 },
      clientes: [{ id: '1', productos: [{ id: 'nuevo' }] }],
      rev: 4,
    });
    const revertido = await leer('revision-ciego');
    assert.equal(revertido.kilosCrudos['16/20'], 100, 'la escritura ciega devuelve los kilos viejos');
    assert.equal(revertido.precioMaquila['16/20'], 18, 'lo que el editor no manda en el payload sobrevive');
    console.log('✓ la secuencia vieja (updateDoc sin rev + eco) revierte kilosCrudos');

    // --- La misma historia con escritores versionados no revierte. ---
    const id = 'revision-sano';
    const sano = referencia(id);
    const base = {
      rev: 3,
      kilosCrudos: { '16/20': 100 },
      analizarGanancia: { '16/20': true },
      precioMaquila: { '16/20': 12 },
      rendimientoManual: { '16/20': 0 },
      medidaOculta: {},
      totalGanancias: 40,
      clientes: [{ id: '1', productos: [] }],
      embarqueBloqueado: false,
    };
    await setDoc(sano, base);

    const camposRendimientos = {
      kilosCrudos: { '16/20': 250 },
      analizarGanancia: { '16/20': true },
      precioMaquila: { '16/20': 18 },
      rendimientoManual: { '16/20': 1.2 },
      medidaOculta: { '16/20': false },
      totalGanancias: 90,
    };
    const guardadoRendimientos = await escribirCamposEmbarque(db, id, {
      baseRev: 3,
      baseCampos: {
        kilosCrudos: base.kilosCrudos,
        analizarGanancia: base.analizarGanancia,
        precioMaquila: base.precioMaquila,
        rendimientoManual: base.rendimientoManual,
        medidaOculta: base.medidaOculta,
        totalGanancias: base.totalGanancias,
      },
      campos: camposRendimientos,
    });
    assert.equal(guardadoRendimientos.rev, 4);
    const trasRendimientos = await leer(id);
    assert.equal(esEcoDeRevisionLocal({
      revRemota: trasRendimientos.rev,
      revBase: 3,
      inicializando: false,
    }), false, 'al subir rev el editor ya no trata el snapshot como eco');

    const estadoEditor = {
      fecha: '2026-10-12',
      cargaCon: 'Porro',
      camionNumero: 1,
      kilosCrudos: { '16/20': 100 },
      clientes: [{ id: '1', productos: [{ id: 'nuevo', medida: '16/20' }] }],
      productosEliminados: {},
      borrador: false,
      embarqueBloqueado: false,
    };
    const payloadEditor = seleccionarCampos(estadoEditor, CAMPOS_EDITOR);
    assert.equal(payloadEditor.kilosCrudos, undefined);
    await escribirCamposEmbarque(db, id, {
      baseRev: 3,
      baseCampos: { clientes: base.clientes, embarqueBloqueado: false },
      campos: payloadEditor,
    });
    const combinado = await leer(id);
    assert.equal(combinado.kilosCrudos['16/20'], 250);
    assert.equal(combinado.precioMaquila['16/20'], 18);
    assert.equal(combinado.totalGanancias, 90);
    assert.equal(combinado.rendimientoManual['16/20'], 1.2);
    assert.equal(combinado.clientes[0].productos[0].id, 'nuevo');
    assert.equal(combinado.cargaCon, 'Porro');
    assert.ok(combinado.rev > 4);
    console.log('✓ editor y Rendimientos se fusionan; los kilos nuevos se quedan');

    await assert.rejects(
      () => escribirCamposEmbarque(db, id, {
        baseRev: 3,
        baseCampos: { kilosCrudos: { '16/20': 100 } },
        campos: { kilosCrudos: { '16/20': 100 } },
      }),
      (error) => error.code === 'embarque-modificado-externamente'
    );
    const intacto = await leer(id);
    assert.equal(intacto.kilosCrudos['16/20'], 250, 'el conflicto no pisa los kilos nuevos');
    const respaldos = await getDocs(collection(db, 'respaldos_emergencia'));
    const respaldo = respaldos.docs.map(item => item.data()).find(item => item.embarqueOriginalId === id);
    assert.ok(respaldo, 'el conflicto deja respaldo en respaldos_emergencia');
    assert.equal(respaldo.tipoRespaldo, 'emergencia');
    console.log('✓ conflicto de los mismos campos pide recarga y respalda, sin reversión');

    const bloqueo = await escribirCamposEmbarque(db, id, {
      baseRev: 1,
      baseCampos: { embarqueBloqueado: false },
      campos: { embarqueBloqueado: true },
    });
    const trasBloqueo = await leer(id);
    assert.equal(trasBloqueo.embarqueBloqueado, true);
    assert.equal(trasBloqueo.kilosCrudos['16/20'], 250);
    assert.equal(trasBloqueo.rev, bloqueo.rev);
    assert.ok(trasBloqueo.rev > intacto.rev, 'el bloqueo no rebobina rev');
    console.log('✓ bloquear en transacción no rebobina rev ni los kilos');

    const repetido = await escribirCamposEmbarque(db, id, {
      baseRev: trasBloqueo.rev,
      baseCampos: camposRendimientos,
      campos: camposRendimientos,
    });
    assert.equal(repetido.omitida, true);
    assert.equal((await leer(id)).rev, trasBloqueo.rev);
    console.log('✓ guardar lo mismo no sube rev');

    const idParalelo = 'revision-paralelo';
    const paralelo = referencia(idParalelo);
    await setDoc(paralelo, {
      rev: 1,
      kilosCrudos: { '21/25': 10 },
      clientes: [{ id: '1', productos: [] }],
      fletePagado: false,
      fletePagos: {},
    });
    await Promise.all([
      escribirCamposEmbarque(db, idParalelo, {
        baseRev: 1,
        baseCampos: { kilosCrudos: { '21/25': 10 } },
        campos: { kilosCrudos: { '21/25': 80 } },
      }),
      escribirCamposEmbarque(db, idParalelo, {
        baseRev: 1,
        baseCampos: { clientes: [{ id: '1', productos: [] }] },
        campos: { clientes: [{ id: '1', productos: [{ id: 'b' }] }] },
      }),
    ]);
    const junto = await leer(idParalelo);
    assert.equal(junto.kilosCrudos['21/25'], 80);
    assert.equal(junto.clientes[0].productos[0].id, 'b');
    console.log('✓ dos pantallas a la vez conservan los dos cambios');

    await escribirCamposEmbarque(db, idParalelo, {
      baseRev: junto.rev,
      baseCampos: { 'fletePagos.porro': undefined, fletePagado: false },
      campos: { 'fletePagos.porro': true, fletePagado: true },
    });
    const conFlete = await leer(idParalelo);
    assert.equal(conFlete.fletePagos.porro, true);
    assert.equal(conFlete.kilosCrudos['21/25'], 80);
    console.log('✓ un pago de flete no borra los kilos');

    const subida = quitarCamposAjenosAlEditor({
      clientes: [{ id: '1' }],
      kilosCrudos: { '16/20': 1 },
      totalGanancias: 5,
      rev: 2,
    }, true, ['kilosCrudos']);
    assert.equal(subida.kilosCrudos['16/20'], 1);
    assert.equal(subida.totalGanancias, undefined);
    assert.equal(JSON.stringify(quitarCamposAjenosAlEditor({
      clientes: [{ id: '1' }],
      kilosCrudos: { '16/20': 1 },
      rev: 2,
    }, true)), JSON.stringify({ clientes: [{ id: '1' }], rev: 2 }));
    console.log('✓ la sincronización offline del editor no reenvía campos de otras pantallas');

    const idCola = 'revision-cola';
    referencia(idCola);
    await setDoc(doc(db, 'embarques', idCola), { rev: 1, precioMaquila: { a: 0 } });
    const baseCola = { precioMaquila: { a: 0 } };
    const primero = escribirCamposEmbarque(db, idCola, {
      baseRev: 1,
      baseCampos: baseCola,
      campos: { precioMaquila: { a: 1 } },
    });
    const segundo = escribirCamposEmbarque(db, idCola, {
      baseRev: 1,
      baseCampos: baseCola,
      campos: { precioMaquila: { a: 18 } },
    });
    const [r1, r2] = await Promise.all([primero, segundo]);
    assert.ok(r1.rev < r2.rev);
    const cola = await leer(idCola);
    assert.equal(cola.precioMaquila.a, 18);
    assert.equal(cola.rev, 3);
    console.log('✓ dos guardados seguidos de la misma pestaña aplican; queda el último');

    const idIgual = 'revision-igual';
    referencia(idIgual);
    await setDoc(doc(db, 'embarques', idIgual), {
      rev: 4,
      kilosCrudos: { '16/20': 250 },
      notaRendimientos: '',
    });
    await escribirCamposEmbarque(db, idIgual, {
      baseRev: 1,
      baseCampos: { kilosCrudos: { '16/20': 100 }, notaRendimientos: '' },
      campos: { kilosCrudos: { '16/20': 250 }, notaRendimientos: 'nota nueva' },
    });
    const igual = await leer(idIgual);
    assert.equal(igual.kilosCrudos['16/20'], 250);
    assert.equal(igual.notaRendimientos, 'nota nueva');
    assert.equal(igual.rev, 5);
    console.log('✓ un valor que ya está en el servidor no cuenta como conflicto');

    const idCostos = 'revision-costos';
    referencia(idCostos);
    await setDoc(doc(db, 'embarques', idCostos), {
      rev: 1,
      costosPorMedida: { '16/20': 10 },
      clientes: [{ id: '1', productos: [] }],
      kilosCrudos: { '16/20': 80 },
    });
    await escribirCamposEmbarque(db, idCostos, {
      baseRev: 1,
      baseCampos: { clientes: [{ id: '1', productos: [] }] },
      campos: { clientes: [{ id: '1', productos: [{ id: 'editor' }] }] },
    });
    await escribirCamposEmbarque(db, idCostos, {
      baseRev: 1,
      baseCampos: { costosPorMedida: { '16/20': 10 } },
      campos: { costosPorMedida: { '16/20': 10, '21/25': 8 } },
    });
    const costos = await leer(idCostos);
    assert.equal(costos.costosPorMedida['16/20'], 10);
    assert.equal(costos.costosPorMedida['21/25'], 8);
    assert.equal(costos.clientes[0].productos[0].id, 'editor');
    assert.equal(costos.kilosCrudos['16/20'], 80);
    console.log('✓ costosPorMedida después de un guardado del editor no entra en conflicto');

    const idDespues = 'revision-despues';
    referencia(idDespues);
    await setDoc(doc(db, 'embarques', idDespues), {
      rev: 2,
      kilosCrudos: { '16/20': 250 },
      notaRendimientos: '',
    });
    const parcial = await escribirCamposEmbarque(db, idDespues, {
      baseRev: 1,
      baseCampos: { kilosCrudos: { '16/20': 100 }, notaRendimientos: '' },
      campos: { kilosCrudos: { '16/20': 100 }, notaRendimientos: 'sigue' },
    });
    assert.ok(parcial.camposEnConflicto.includes('kilosCrudos'));
    assert.equal((await leer(idDespues)).notaRendimientos, 'sigue');
    assert.equal((await leer(idDespues)).kilosCrudos['16/20'], 250);
    await escribirCamposEmbarque(db, idDespues, {
      baseRev: parcial.rev,
      baseCampos: { notaRendimientos: 'sigue' },
      campos: { notaRendimientos: 'despues' },
    });
    const despues = await leer(idDespues);
    assert.equal(despues.notaRendimientos, 'despues');
    assert.equal(despues.kilosCrudos['16/20'], 250);
    console.log('✓ lo tecleado después de un conflicto real no se pierde');

    const idViejo = 'revision-offline-viejo';
    referencia(idViejo);
    await setDoc(doc(db, 'embarques', idViejo), {
      rev: 6,
      kilosCrudos: { '16/20': 250 },
      notaRendimientos: '',
    });
    await escribirCamposEmbarque(db, idViejo, {
      baseRev: 1,
      baseCampos: null,
      sinBase: 'ultima',
      campos: { kilosCrudos: { '16/20': 250 }, notaRendimientos: 'pendiente viejo' },
    });
    const viejo = await leer(idViejo);
    assert.equal(viejo.notaRendimientos, 'pendiente viejo');
    assert.equal(viejo.kilosCrudos['16/20'], 250);
    console.log('✓ un pendiente offline sin foto de base no pide conflicto si el campo ya coincide');

    const fleteA = 'flete-atomico-a';
    const fleteB = 'flete-atomico-b';
    referencia(fleteA);
    referencia(fleteB);
    await setDoc(doc(db, 'embarques', fleteA), { rev: 1, fletePagado: false, fletePagos: {} });
    await setDoc(doc(db, 'embarques', fleteB), { rev: 1, fletePagado: false, fletePagos: {} });
    const pago = {
      baseRev: 1,
      baseCampos: { fletePagado: false, 'fletePagos.porro': undefined },
      campos: { fletePagado: true, 'fletePagos.porro': true },
    };
    await escribirCamposEmbarquesAtomico(db, [
      { embarqueId: fleteA, ...pago },
      { embarqueId: fleteB, ...pago },
    ]);
    assert.equal((await leer(fleteA)).fletePagado, true);
    assert.equal((await leer(fleteB)).fletePagos.porro, true);
    await assert.rejects(
      () => escribirCamposEmbarquesAtomico(db, [
        { embarqueId: fleteA, baseRev: 2, baseCampos: { fletePagado: true }, campos: { fletePagado: false } },
        { embarqueId: fleteB, baseRev: 1, baseCampos: { fletePagado: false }, campos: { fletePagado: false } },
      ]),
      (error) => error.code === 'embarque-modificado-externamente'
    );
    assert.equal((await leer(fleteA)).fletePagado, true);
    assert.equal((await leer(fleteB)).fletePagado, true);
    console.log('✓ el pago agrupado de fletes es atómico: o entran todos o no entra ninguno');

    console.log('PASS embarque revision (' + projectId + ' @ ' + hostEmulador + ')');
  } finally {
    for (const idDoc of creado) {
      await deleteDoc(doc(db, 'embarques', idDoc)).catch(() => {});
    }
    const restos = await getDocs(collection(db, 'respaldos_emergencia')).catch(() => null);
    if (restos) {
      for (const item of restos.docs) {
        if (creado.includes(item.data().embarqueOriginalId)) {
          await deleteDoc(item.ref).catch(() => {});
        }
      }
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
