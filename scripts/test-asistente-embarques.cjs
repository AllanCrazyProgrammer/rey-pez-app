#!/usr/bin/env node
/**
 * GET /embarques de solo lectura.
 * Importa el handler real `asistente` de functions/index.js (sin NODE_ENV=test)
 * y lo llama por HTTP contra el emulador demo-*. No reimplementa la lectura.
 *
 *   node scripts/test-asistente-embarques.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const projectId = 'demo-reypez-embarques-lectura';
const clavePrueba = 'test-key';

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

function plano(valor) {
  if (valor == null) return valor;
  if (typeof valor.toDate === 'function' && typeof valor.seconds === 'number') {
    return { seconds: valor.seconds, nanoseconds: valor.nanoseconds };
  }
  if (Array.isArray(valor)) return valor.map(plano);
  if (typeof valor === 'object') {
    const proto = Object.getPrototypeOf(valor);
    if (proto === Object.prototype || proto === null) {
      const salida = {};
      Object.keys(valor).sort().forEach((clave) => {
        salida[clave] = plano(valor[clave]);
      });
      return salida;
    }
  }
  return valor;
}

function pedir(base, metodo, ruta, { autorizar = true } = {}) {
  const url = new URL(ruta, base);
  const headers = {};
  if (autorizar) headers.authorization = `Bearer ${clavePrueba}`;
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: metodo, headers }, (res) => {
      const trozos = [];
      res.on('data', (parte) => trozos.push(parte));
      res.on('end', () => {
        const texto = Buffer.concat(trozos).toString('utf8');
        let body = texto;
        try { body = texto ? JSON.parse(texto) : null; } catch { /* texto plano */ }
        resolve({ status: res.statusCode, body, texto });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function servir(asistente) {
  const server = http.createServer((nodeReq, nodeRes) => {
    const url = new URL(nodeReq.url, 'http://127.0.0.1');
    nodeReq.path = url.pathname;
    nodeReq.query = Object.fromEntries(url.searchParams);
    nodeReq.get = (nombre) => {
      const valor = nodeReq.headers[String(nombre).toLowerCase()];
      return Array.isArray(valor) ? valor[0] : valor;
    };
    const respuesta = {
      statusCode: 200,
      headers: {},
      status(codigo) {
        this.statusCode = codigo;
        nodeRes.statusCode = codigo;
        return this;
      },
      setHeader(nombre, valor) {
        this.headers[nombre] = valor;
        nodeRes.setHeader(nombre, valor);
        return this;
      },
      getHeader(nombre) {
        return nodeRes.getHeader(nombre);
      },
      on(evento, fn) {
        nodeRes.on(evento, fn);
        return this;
      },
      json(datos) {
        if (nodeRes.writableEnded) return this;
        const cuerpo = JSON.stringify(datos);
        nodeRes.writeHead(this.statusCode, {
          'content-type': 'application/json; charset=utf-8',
          ...this.headers,
        });
        nodeRes.end(cuerpo);
        return this;
      },
      send(datos) {
        return this.json(datos);
      },
      end(...args) {
        nodeRes.end(...args);
        return this;
      },
    };
    Promise.resolve(asistente(nodeReq, respuesta)).catch((error) => {
      console.error('El handler real lanzó una excepción:', error && error.message);
      if (!nodeRes.writableEnded) {
        nodeRes.statusCode = 500;
        nodeRes.end(JSON.stringify({ error: { code: 'ERROR_INTERNO' } }));
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function main() {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('Esta prueba tiene que correr sin NODE_ENV=test');
  }
  delete process.env.NODE_ENV;
  const jar = process.env.FIRESTORE_EMULATOR_JAR
    || path.join(os.homedir(), '.cache/firebase/emulators/cloud-firestore-emulator-v1.19.8.jar');
  assert.ok(fs.existsSync(jar), 'Falta el JAR del emulador de Firestore');
  assert.ok(projectId.startsWith('demo-'), 'El proyecto del emulador tiene que ser demo-*');

  const port = await puertoLibre();
  const emulator = spawn('java', [
    '-jar', jar,
    '--host', '127.0.0.1',
    '--port', String(port),
    '--project_id', projectId,
    '--single_project_mode',
    '--single_project_mode_error',
    '--rules', path.join(root, 'scripts/fixtures/sacadas-emulator.rules'),
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let log = '';
  emulator.stdout.on('data', (chunk) => { log = (log + chunk).slice(-4000); });
  emulator.stderr.on('data', (chunk) => { log = (log + chunk).slice(-4000); });

  let server;
  let appAdmin;
  try {
    let listo = false;
    for (let i = 0; i < 150; i += 1) {
      if (emulator.exitCode !== null) throw new Error(log || 'el emulador terminó');
      try {
        await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(200) });
        listo = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.ok(listo, 'El emulador no inició');

    process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${port}`;
    process.env.GCLOUD_PROJECT = projectId;
    process.env.GOOGLE_CLOUD_PROJECT = projectId;
    process.env.ASISTENTE_API_KEY = clavePrueba;

    const { asistente } = require(path.join(root, 'functions/index.js'));
    const admin = require(path.join(root, 'functions/node_modules/firebase-admin'));
    appAdmin = admin.app();
    const db = admin.firestore();
    const servido = await servir(asistente);
    server = servido.server;
    const { base } = servido;

    const fecha = '2026-11-06';
    const otroDia = '2026-11-05';
    const editado = new admin.firestore.Timestamp(1_762_428_240, 123_456_000);
    const fechaTimestampMismoUtc = admin.firestore.Timestamp.fromDate(new Date('2026-11-06T15:30:00.000Z'));
    const fechaTimestampOtroUtc = admin.firestore.Timestamp.fromDate(new Date('2026-11-05T15:30:00.000Z'));

    const camion2 = {
      fecha,
      camionNumero: 2,
      cargaCon: 'Chito',
      borrador: false,
      rev: 4,
      marcaLectura: 'camion-2',
      clientes: [
        {
          id: '1',
          nombre: 'Joselito',
          productos: [
            { id: 'p-jose', medida: '41/50', kilos: [20], taras: [1], tipo: 's/h20' },
          ],
          crudos: [],
        },
      ],
      kilosCrudos: { '41/50': 90 },
      rendimientoManual: {},
      notaRendimientos: '',
    };
    const camion1 = {
      fecha,
      camionNumero: 1,
      cargaCon: 'Mario',
      borrador: false,
      rev: 7,
      marcaLectura: 'camion-1',
      clientes: [
        {
          id: '4',
          nombre: 'Ozuna',
          productos: [
            {
              id: 'p-oz',
              medida: '51/60',
              kilos: [10, 12.5],
              taras: [1, 1],
              tipo: 'c/h20',
              esVenta: true,
            },
          ],
          crudos: [
            {
              id: 'cr-1',
              items: [{ id: 'it-1', talla: 'Gde c/c', barco: 'Galileo', taras: 3 }],
            },
          ],
        },
        {
          id: '3',
          nombre: 'Otilio',
          productos: [
            { id: 'p-oti', medida: '16/20 mix', kilos: [8], taras: [], tipo: 's/h20' },
          ],
          crudos: [],
        },
      ],
      kilosCrudos: {
        '51/60': 180,
        '16/20-21/25 mix': {
          medida1: 40,
          medida2: 35,
          etiqueta1: '16/20',
          etiqueta2: '21/25',
        },
      },
      rendimientoManual: { '31/40': 1.18 },
      notaRendimientos: 'guardado en pantalla',
      pesoTaraCosto: 19,
      pesoTaraVenta: 20,
      medidaOculta: { 'U/15': true },
      analizarGanancia: { '31/40': true },
      analizarGananciaCrudos: {},
      analizarMaquilaGanancia: {},
      precioMaquila: { '31/40': 12 },
      nombresMedidasPersonalizados: { '51/60': '51/60 HQ' },
      totalGanancias: 4200,
      costosPorMedida: { '51/60': 95 },
      ultimaEdicion: { userId: 'uid-allan', username: 'Allan', timestamp: editado },
    };
    const ajeno = {
      fecha: otroDia,
      camionNumero: 1,
      cargaCon: 'No debe salir',
      clientes: [{ id: '9', nombre: 'ClienteDeOtroDia', productos: [{ id: 'x', medida: 'U/10' }], crudos: [] }],
      kilosCrudos: { 'U/10': 999 },
      rendimientoManual: { 'U/10': 9.9 },
      marcaLectura: 'otro-dia',
    };
    const legado = {
      fecha: fechaTimestampMismoUtc,
      camionNumero: 3,
      cargaCon: 'Legado',
      clientes: [{ id: '8', nombre: 'ClienteTimestamp', productos: [{ id: 'pt', medida: '26/30', kilos: [4] }], crudos: [] }],
      kilosCrudos: { '26/30': 50 },
      rendimientoManual: { '26/30': 1.4 },
      marcaLectura: 'timestamp-mismo-utc',
    };
    const legadoOtro = {
      fecha: fechaTimestampOtroUtc,
      camionNumero: 1,
      cargaCon: 'Legado otro día',
      clientes: [{ id: '7', nombre: 'TimestampOtroDia', productos: [], crudos: [] }],
      kilosCrudos: { '21/25': 1 },
      marcaLectura: 'timestamp-otro-utc',
    };

    const ref1 = db.collection('embarques').doc('emb-camion-1');
    const ref2 = db.collection('embarques').doc('emb-camion-2');
    const refOtro = db.collection('embarques').doc('emb-otro-dia');
    const refLegado = db.collection('embarques').doc('emb-timestamp');
    const refLegadoOtro = db.collection('embarques').doc('emb-timestamp-otro');
    await ref2.set(camion2);
    await ref1.set(camion1);
    await refOtro.set(ajeno);
    await refLegado.set(legado);
    await refLegadoOtro.set(legadoOtro);

    async function huella() {
      const ids = ['emb-camion-1', 'emb-camion-2', 'emb-otro-dia', 'emb-timestamp', 'emb-timestamp-otro'];
      const salida = {};
      for (const id of ids) {
        const snap = await db.collection('embarques').doc(id).get();
        salida[id] = {
          datos: plano(snap.data()),
          update: snap.updateTime.toMillis(),
          create: snap.createTime.toMillis(),
        };
      }
      salida.total = (await db.collection('embarques').get()).size;
      return salida;
    }

    const antes = await huella();

    let r = await pedir(base, 'GET', '/embarques');
    assert.equal(r.status, 400, JSON.stringify(r.body));
    assert.equal(r.body.error.code, 'FECHA_INVALIDA');
    r = await pedir(base, 'GET', '/embarques?fecha=');
    assert.equal(r.status, 400);
    r = await pedir(base, 'GET', '/embarques?fecha=2026-02-31');
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'FECHA_INVALIDA');
    r = await pedir(base, 'GET', '/embarques?fecha=2026-13-01');
    assert.equal(r.status, 400);
    r = await pedir(base, 'GET', '/embarques?fecha=06-11-2026');
    assert.equal(r.status, 400);
    r = await pedir(base, 'GET', '/embarques?fecha=2026-11-06T00:00:00Z');
    assert.equal(r.status, 400);
    console.log('✓ fecha obligatoria y fecha real YYYY-MM-DD');

    r = await pedir(base, 'GET', `/embarques?fecha=${fecha}`, { autorizar: false });
    assert.equal(r.status, 401);
    assert.equal(r.texto.includes(clavePrueba), false);
    r = await pedir(base, 'GET', `/embarques?fecha=${fecha}`, { autorizar: false });
    const sinToken = await new Promise((resolve, reject) => {
      const req = http.request(new URL(`/embarques?fecha=${fecha}`, base), { method: 'GET', headers: { authorization: 'Bearer clave-incorrecta' } }, (res) => {
        const trozos = [];
        res.on('data', (parte) => trozos.push(parte));
        res.on('end', () => resolve({ status: res.statusCode, texto: Buffer.concat(trozos).toString('utf8') }));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(sinToken.status, 401);
    assert.equal(sinToken.texto.includes(clavePrueba), false);
    assert.equal(sinToken.texto.includes('clave-incorrecta'), false);
    console.log('✓ sin token o token distinto: 401, sin eco de la clave');

    for (const metodo of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      r = await pedir(base, metodo, `/embarques?fecha=${fecha}`);
      assert.equal(r.status, 405, metodo);
      assert.equal(r.body.error.code, 'METODO_NO_PERMITIDO');
    }
    console.log('✓ otros métodos: 405');

    r = await pedir(base, 'GET', '/embarques?fecha=2026-12-31');
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, 'EMBARQUE_NO_ENCONTRADO');
    assert.equal(JSON.stringify(r.body).includes('ClienteDeOtroDia'), false);
    assert.equal(JSON.stringify(r.body).includes('Ozuna'), false);
    console.log('✓ fecha sin embarque: 404 y sin datos de otro día');

    r = await pedir(base, 'GET', `/embarques?fecha=${fecha}&cliente=Ozuna`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.fecha, fecha);
    assert.equal(r.body.total, 3);
    assert.equal(r.body.embarques.length, 3);
    assert.deepEqual(r.body.embarques.map((item) => item.camionNumero), [1, 2, 3]);
    assert.deepEqual(r.body.embarques.map((item) => item.id), ['emb-camion-1', 'emb-camion-2', 'emb-timestamp']);

    const primero = r.body.embarques[0];
    assert.equal(primero.fecha, fecha);
    assert.equal(primero.cargaCon, 'Mario');
    assert.equal(primero.rev, 7);
    assert.equal(primero.clientes.length, 2);
    assert.deepEqual(primero.clientes.map((cliente) => cliente.nombre), ['Ozuna', 'Otilio']);
    assert.equal(primero.clientes[0].productos[0].medida, '51/60');
    assert.deepEqual(primero.clientes[0].productos[0].kilos, [10, 12.5]);
    assert.equal(primero.clientes[0].crudos[0].items[0].talla, 'Gde c/c');
    assert.equal(primero.clientes[0].crudos[0].items[0].barco, 'Galileo');
    assert.equal(primero.kilosCrudos['51/60'], 180);
    assert.deepEqual(primero.kilosCrudos['16/20-21/25 mix'], {
      medida1: 40,
      medida2: 35,
      etiqueta1: '16/20',
      etiqueta2: '21/25',
    });
    assert.equal(primero.rendimientos.rendimientoManual['31/40'], 1.18);
    assert.equal(primero.rendimientos.notaRendimientos, 'guardado en pantalla');
    assert.equal(primero.rendimientos.totalGanancias, 4200);
    assert.equal(primero.rendimientos.costosPorMedida['51/60'], 95);
    assert.equal(primero.rendimientos.pesoTaraCosto, 19);
    assert.equal(primero.rendimientos.nombresMedidasPersonalizados['51/60'], '51/60 HQ');
    assert.equal(primero.rendimiento, undefined);
    assert.equal(primero.rendimientos.rendimiento, undefined);
    assert.equal(primero.ultimaEdicion.timestamp.tipo, 'timestamp');
    assert.equal(primero.ultimaEdicion.timestamp.seconds, editado.seconds);
    assert.equal(primero.ultimaEdicion.timestamp.nanoseconds, editado.nanoseconds);
    assert.equal(primero.ultimaEdicion.timestamp.iso, editado.toDate().toISOString());
    assert.equal(primero.ultimaEdicion.username, 'Allan');

    const legadoResp = r.body.embarques[2];
    assert.equal(legadoResp.id, 'emb-timestamp');
    assert.equal(legadoResp.fecha.tipo, 'timestamp');
    assert.equal(legadoResp.fecha.seconds, fechaTimestampMismoUtc.seconds);
    assert.equal(legadoResp.fecha.nanoseconds, fechaTimestampMismoUtc.nanoseconds);
    assert.equal(legadoResp.clientes[0].nombre, 'ClienteTimestamp');
    assert.equal(legadoResp.kilosCrudos['26/30'], 50);
    assert.equal(legadoResp.rendimientos.rendimientoManual['26/30'], 1.4);

    const texto = JSON.stringify(r.body);
    assert.equal(texto.includes('ClienteDeOtroDia'), false);
    assert.equal(texto.includes('TimestampOtroDia'), false);
    assert.equal(texto.includes('No debe salir'), false);
    assert.equal(texto.includes(clavePrueba), false);
    assert.equal(texto.includes('private_key'), false);
    console.log('✓ fecha encontrada: camiones, clientes, productos, kilosCrudos, rendimientos y timestamp');

    const despues = await huella();
    assert.deepEqual(despues, antes);
    console.log('✓ GET no modificó documentos ni updateTime');

    console.log('\nTodos los tests de embarques del asistente pasaron');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (appAdmin) await appAdmin.delete().catch(() => {});
    if (emulator.exitCode === null) {
      emulator.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (emulator.exitCode === null) emulator.kill('SIGKILL');
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
