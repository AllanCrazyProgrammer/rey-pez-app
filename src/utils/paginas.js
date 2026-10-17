// Junta páginas hasta que la lectura se agote. No se detiene en un tope fijo.
export async function juntarPaginas(leerPagina) {
  const todas = [];
  let cursor = null;
  const vistos = new Set();
  for (;;) {
    const pagina = await leerPagina(cursor);
    const docs = Array.isArray(pagina && pagina.docs) ? pagina.docs : [];
    if (docs.length === 0) break;
    todas.push(...docs);
    if (!pagina.next) break;
    const marca = pagina.next.id ?? pagina.next;
    if (vistos.has(marca)) break;
    vistos.add(marca);
    cursor = pagina.next;
  }
  return todas;
}
