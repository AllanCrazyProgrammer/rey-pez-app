// Sirve una carpeta de build como archivos estáticos (con regreso a index.html), para revisar en
// el navegador builds que no corren con el dev server, p. ej. la app de despique:
//   node scripts/servir-dist.cjs despique-dist 8092
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const raiz = path.resolve(__dirname, '..', process.argv[2] || 'dist');
const puerto = Number(process.argv[3] || 8092);
const tipos = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

http.createServer((req, res) => {
  let archivo = path.join(raiz, decodeURIComponent(req.url.split('?')[0]));
  if (!archivo.startsWith(raiz) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) archivo = path.join(raiz, 'index.html');
  res.writeHead(200, { 'Content-Type': tipos[path.extname(archivo)] || 'application/octet-stream' });
  fs.createReadStream(archivo).pipe(res);
}).listen(puerto, () => console.log(`Sirviendo ${raiz} en http://localhost:${puerto}`));
