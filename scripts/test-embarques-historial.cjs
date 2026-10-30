const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource, vueOptions } = require('./helpers/embarques-source.cjs');
const colab = loadSource('src/utils/embarqueColaboracion.js');
const { HistorialEmbarque } = loadSource('src/utils/embarqueHistorial.js');
const { embarqueUndoMixin } = loadSource('src/views/Embarques/mixins/embarqueUndoMixin.js');
const { copiar, identificarEstado, insertarFilaProducto, eliminarFilaProducto, fusionarEdicion, aArbol } = colab;
const estado = () => identificarEstado({ fecha: '2026-10-29', cargaCon: 'Mario', camionNumero: 1,
  productos: [{ id: 'p1', clienteId: '1', precio: 100, kilos: [20, 20], taras: [1, 2] }],
  clienteCrudos: { '1': [{ id: 'g1', items: [{ id: 'i1', talla: 'Gde', taras: 2, barco: 'A' }] }] }
});
const editar = (s, fn) => { const c = copiar(s); fn(c); return c; };
const pesada = (s, id) => s.productos[0].kilos[s.productos[0].pesadasIds.indexOf(id)];

test('dos altas simultáneas de pesadas sobreviven; undo elimina solo la propia', () => {
  const base = estado(), h = new HistorialEmbarque(base);
  const a = editar(base, s => { insertarFilaProducto(s.productos[0], 'pesadasIds'); s.productos[0].kilos[2] = 30; });
  const b = editar(base, s => { insertarFilaProducto(s.productos[0], 'pesadasIds'); s.productos[0].kilos[2] = 40; });
  h.registrar(a);
  const remoto = fusionarEdicion(base, a, b).estado;
  assert.deepEqual(remoto.productos[0].kilos.slice().sort((x,y)=>x-y), [20,20,30,40]);
  h.recibirRemoto(remoto);
  const undo = h.aplicar(remoto, 'deshacer').estado;
  assert.deepEqual(undo.productos[0].kilos, b.productos[0].kilos);
  const redo = h.aplicar(undo, 'rehacer').estado;
  assert.equal(redo.productos[0].kilos.length, 4);
});

test('kilos repetidos conservan identidad al borrar una fila y editar la siguiente', () => {
  const base=estado(), a=editar(base,s=>eliminarFilaProducto(s.productos[0],'pesadasIds',0));
  const b=editar(base,s=>{s.productos[0].kilos[1]=70;});
  const res=fusionarEdicion(base,a,b).estado;
  assert.deepEqual(res.productos[0].kilos,[70]);
  assert.deepEqual(res.productos[0].taras,[2]);
});

test('editar kilos y taras de la misma fila se combina por campo',()=>{
 const base=estado(), h=new HistorialEmbarque(base);
 const a=editar(base,s=>{s.productos[0].kilos[0]=31;});
 const b=editar(base,s=>{s.productos[0].taras[0]=8;}); h.registrar(a);
 const res=fusionarEdicion(base,a,b).estado; h.recibirRemoto(res);
 const undo=h.aplicar(res,'deshacer').estado;
 assert.equal(undo.productos[0].kilos[0],20); assert.equal(undo.productos[0].taras[0],8);
 assert.equal(h.aplicar(undo,'rehacer').estado.productos[0].kilos[0],31);
});

test('la edición ajena del mismo kilo bloquea la reversión aunque llegue después de pulsar undo',()=>{
 const base=estado(), editado=editar(base,s=>{s.productos[0].kilos[0]=31;});
 const h=new HistorialEmbarque(base); h.registrar(editado);
 const undo=h.aplicar(editado,'deshacer').estado;
 const b=editar(editado,s=>{s.productos[0].kilos[0]=99;});
 const res=fusionarEdicion(editado,undo,b);
 assert.equal(res.estado.productos[0].kilos[0],99); assert.equal(res.omitidas,1);
});

test('altas/bajas de producto son reversibles y no borran otros productos',()=>{
 const base=estado(), h=new HistorialEmbarque(base);
 const a=editar(base,s=>{s.productos.push({...copiar(s.productos[0]),id:'p2'});}); h.registrar(a);
 const remoto=editar(a,s=>{s.productos.push({...copiar(s.productos[0]),id:'p3'});}); h.recibirRemoto(remoto);
 const undo=h.aplicar(remoto,'deshacer').estado;
 assert.deepEqual(undo.productos.map(p=>p.id),['p1','p3']);
 const redo=h.aplicar(undo,'rehacer').estado;
 assert.deepEqual(redo.productos.map(p=>p.id),['p1','p2','p3']);
 h.registrar(editar(redo,s=>{s.productos.splice(0,1);}));
 const restaurado=h.aplicar(editar(redo,s=>{s.productos.splice(0,1);}), 'deshacer').estado;
 assert.deepEqual(restaurado.productos.map(p=>p.id),['p1','p2','p3']);
});

test('undo de alta no borra un producto que alguien más completó',()=>{
 const base=estado(), h=new HistorialEmbarque(base);
 const a=editar(base,s=>s.productos.push({...copiar(s.productos[0]),id:'p2'}));h.registrar(a);
 const b=editar(a,s=>{s.productos[1].precio=999;});
 const res=h.aplicar(b,'deshacer'); assert.equal(res.omitidos,1); assert.equal(res.estado.productos[1].precio,999);
});

test('borrado concurrente no borra la edición remota de una fila',()=>{
 const base=estado(), a=editar(base,s=>eliminarFilaProducto(s.productos[0],'pesadasIds',0));
 const b=editar(base,s=>{s.productos[0].kilos[0]=70;});
 const res=fusionarEdicion(base,a,b); assert.equal(res.omitidas,1); assert.equal(res.estado.productos[0].kilos[0],70);
});

test('editar una fila eliminada en remoto no la resucita',()=>{
 const base=estado(), a=editar(base,s=>{s.productos[0].kilos[0]=70;});
 const b=editar(base,s=>eliminarFilaProducto(s.productos[0],'pesadasIds',0));
 const res=fusionarEdicion(base,a,b); assert.equal(res.estado.productos[0].kilos.length,1); assert.equal(res.omitidas,1);
});

test('crudos: altas independientes, campos distintos y undo de una edición',()=>{
 const base=estado(), h=new HistorialEmbarque(base);
 const a=editar(base,s=>{s.clienteCrudos['1'][0].items[0].taras=5;s.clienteCrudos['1'][0].items.push({id:'i2',taras:3});});h.registrar(a);
 const b=editar(base,s=>{s.clienteCrudos['1'][0].items[0].barco='B';s.clienteCrudos['1'][0].items.push({id:'i3',taras:4});});
 const res=fusionarEdicion(base,a,b).estado;h.recibirRemoto(res);
 const undo=h.aplicar(res,'deshacer').estado;
 assert.deepEqual(undo.clienteCrudos,b.clienteCrudos);
 const redo=h.aplicar(undo,'rehacer').estado;
 assert.equal(redo.clienteCrudos['1'][0].items.length,3);
 assert.equal(redo.clienteCrudos['1'][0].items[0].barco,'B');
});

test('crudos: borrar/restaurar grupos e items respeta ediciones de otros grupos',()=>{
 const base=estado();base.clienteCrudos['1'].push({id:'g2',items:[{id:'i2',taras:7}]});
 const h=new HistorialEmbarque(base);
 const a=editar(base,s=>s.clienteCrudos['1'].splice(0,1));h.registrar(a);
 const b=editar(a,s=>{s.clienteCrudos['1'][0].items[0].taras=9;});h.recibirRemoto(b);
 const undo=h.aplicar(b,'deshacer').estado;
 assert.equal(undo.clienteCrudos['1'][0].id,'g1');assert.equal(undo.clienteCrudos['1'][1].items[0].taras,9);
});

test('extras/reportes: undo conserva filas remotas y emparejamiento taras-bolsas',()=>{
 for(const ids of ['reportesIds','tarasExtraIds']){
  const base=estado(),h=new HistorialEmbarque(base);
  const a=editar(base,s=>insertarFilaProducto(s.productos[0],ids));h.registrar(a);
  const b=editar(base,s=>insertarFilaProducto(s.productos[0],ids));
  const res=fusionarEdicion(base,a,b).estado;h.recibirRemoto(res);
  assert.equal(h.aplicar(res,'deshacer').estado.productos[0][ids].length,1);
 }
});

test('historial parcial y ABA: conserva solo operaciones propias; eco mantiene redo',()=>{
 const base=estado(), h=new HistorialEmbarque(base);
 const a=editar(base,s=>{s.productos[0].precio=110;s.cargaCon='Otro';});h.registrar(a);
 const b=editar(a,s=>{s.productos[0].precio=120;});h.recibirRemoto(b);
 const c=editar(b,s=>{s.productos[0].precio=110;});h.recibirRemoto(c);
 const undo=h.aplicar(c,'deshacer').estado;assert.equal(undo.productos[0].precio,110);assert.equal(undo.cargaCon,'Mario');
 h.recibirRemoto(undo);assert.equal(h.rehacer.length,1);
 h.registrar(editar(undo,s=>{s.cargaCon='Nuevo';}));assert.equal(h.rehacer.length,0);
});

test('migración de documentos antiguos determinista, clonación y límite de historial',()=>{
 const raw={productos:[{id:'p',kilos:[10,10],taras:[1,2]}],clienteCrudos:{'1':[{items:[{taras:2}]}]}};
 assert.deepEqual(identificarEstado(copiar(raw)),identificarEstado(copiar(raw)));
 const h=new HistorialEmbarque(estado(),3);const s=estado();for(let i=0;i<6;i++){s.productos[0].precio=101+i;h.registrar(s);}
 s.productos[0].precio=999;assert.equal(h.deshacer.length,3);assert.equal(h.deshacer.at(-1)[0].despues,106);
});

test('restaurar producto limpia lápida pero no resucita una baja ajena posterior',()=>{
 const base=estado();const borrado=editar(base,s=>{s.productos=[];s.productosEliminados={p1:11};});
 const restaurado=editar(base,s=>{s.productosEliminados={p1:null};});
 const res=fusionarEdicion(borrado,restaurado,borrado);assert.equal(res.estado.productos.length,1);assert.equal(res.estado.productosEliminados.p1,null);
 const ajeno=editar(borrado,s=>{s.productosEliminados.p1=12;});
 assert.equal(fusionarEdicion(borrado,restaurado,ajeno).estado.productos.length,0);
});

test('watchers reales de Vue registran crudos, altas/bajas y undo sin crear otro historial',async()=>{
 const Vue=require('vue');const opts=vueOptions('src/views/Embarques/NuevoEmbarque.vue',['watch']);
 const s=estado();let guardados=0;
 const vm=new Vue({mixins:[embarqueUndoMixin],data:()=>({embarque:s,clienteCrudos:s.clienteCrudos,embarqueBloqueado:false}),
 watch:{embarque:opts.watch.embarque,clienteCrudos:opts.watch.clienteCrudos},methods:{guardarCambiosEnTiempoReal(){guardados++;}}});
 const storage=global.localStorage;global.localStorage={setItem(){}};
 try{
  vm.initUndo(vm.embarque);vm.clienteCrudos['1'][0].items[0].taras=8;await Vue.nextTick();assert.equal(vm.undoStack.length,1);
  vm.undo();await Vue.nextTick();assert.equal(vm.clienteCrudos['1'][0].items[0].taras,2);assert.equal(vm.redoStack.length,1);
  vm.redo();await Vue.nextTick();assert.equal(vm.clienteCrudos['1'][0].items[0].taras,8);
  vm.embarque.productos.splice(0,1);await Vue.nextTick();vm.undo();await Vue.nextTick();assert.equal(vm.embarque.productos.length,1);assert.equal(vm._productosEliminadosDoc.p1,null);
  vm.embarqueBloqueado=true;const antes=guardados;vm.undo();assert.equal(guardados,antes);
 }finally{vm.$destroy();global.localStorage=storage;}
});
