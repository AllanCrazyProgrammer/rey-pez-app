// Los archivos de la báscula se importan entre sí con el alias @/. Las otras pruebas los juntan
// en un solo módulo, así que no ven un import a un archivo que no exporta ese nombre (en la APK
// eso rompía cada paquete: "bytesAHex is not a function"). Aquí se revisa nombre por nombre.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '../src');
const ARCHIVOS = [
  'services/bascula.js',
  'services/basculaCapacitor.js',
  'stores/bascula.js',
  'views/Bascula/BasculaDiagnostico.vue',
  'views/Embarques/components/BasculaPesoFlotante.vue',
  'views/Embarques/components/HeaderEmbarque.vue',
];

function exportados(archivo) {
  const fuente = fs.readFileSync(archivo, 'utf8');
  const nombres = new Set();
  for (const m of fuente.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) nombres.add(m[1]);
  for (const m of fuente.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()).filter(Boolean).forEach(n => nombres.add(n));
  }
  return nombres;
}

function resolver(especificador) {
  const base = path.join(SRC, especificador.slice(2));
  return [base, base + '.js', path.join(base, 'index.js')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
}

test('cada nombre importado con @/ existe en el archivo de origen', () => {
  for (const relativo of ARCHIVOS) {
    const fuente = fs.readFileSync(path.join(SRC, relativo), 'utf8');
    for (const m of fuente.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(@\/[^']+)'/g)) {
      const destino = resolver(m[2]);
      assert.ok(destino, `${relativo}: no existe ${m[2]}`);
      const disponibles = exportados(destino);
      for (const nombre of m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
        assert.ok(disponibles.has(nombre), `${relativo}: ${m[2]} no exporta ${nombre}`);
      }
    }
  }
});
