import { aArbol, deArbol, diferencias, aplicarOperaciones, leerRuta, iguales, copiar } from './embarqueColaboracion';

export class HistorialEmbarque {
  constructor(estado, limite = 100) {
    this.base = aArbol(estado);
    this.deshacer = [];
    this.rehacer = [];
    this.limite = limite;
  }
  registrar(estado) {
    const siguiente = aArbol(estado);
    const cambios = diferencias(this.base, siguiente);
    if (cambios.length) {
      this.deshacer.push(cambios);
      if (this.deshacer.length > this.limite) this.deshacer.shift();
      this.rehacer = [];
    }
    this.base = siguiente;
  }
  recibirRemoto(estado) {
    const siguiente = aArbol(estado);
    // Invalidar también transiciones A→B→A observadas. Un eco no modifica
    // las pilas. Las operaciones sobre filas ajenas permanecen independientes.
    for (const pila of ['deshacer', 'rehacer']) {
      this[pila] = this[pila].map(accion => accion.filter(op =>
        iguales(leerRuta(this.base, op.ruta), leerRuta(siguiente, op.ruta))
      )).filter(accion => accion.length);
    }
    this.base = siguiente;
  }
  aplicar(estado, direccion) {
    const inversa = direccion === 'deshacer';
    const origen = inversa ? this.deshacer : this.rehacer;
    const destino = inversa ? this.rehacer : this.deshacer;
    const accion = origen.pop();
    if (!accion) return { estado, aplicados: 0, omitidos: 0 };
    const resultado = aplicarOperaciones(aArbol(estado), accion, inversa);
    if (resultado.aplicadas.length) destino.push(resultado.aplicadas);
    this.base = copiar(resultado.arbol);
    return { estado: deArbol(resultado.arbol, estado), aplicados: resultado.aplicadas.length, omitidos: resultado.omitidas };
  }
}
