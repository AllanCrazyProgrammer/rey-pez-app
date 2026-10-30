const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource, vueOptions } = require('./helpers/embarques-source.cjs');
const { normalizarCampo, claveCampo, editoresVigentes, describirCampo, campoDesdeElemento } = loadSource('src/utils/embarquePresencia.js');
const campo = { tipo: 'producto', productoId: 'p1', campo: 'kilos', filaId: 'fila2' };
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));
async function esperar(fn) { for (let i=0; i<100; i++) { if (fn()) return; await pausa(20); } assert.fail('No llegó el estado esperado'); }
function diferido() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; }

test('el destino de presencia contiene identidad, nunca el contenido escrito', () => {
  assert.deepEqual(normalizarCampo({ ...campo, valor: 'privado', indice: 0 }), campo);
  assert.equal(normalizarCampo({ ...campo, filaId: undefined }), null);
  assert.equal(normalizarCampo({ tipo:'producto', productoId:'p1', campo:'desconocido' }), null);
  assert.equal(claveCampo(campo), claveCampo({ ...campo, indice: 9 }));
});

test('cada ventana es visible incluso con la misma cuenta; las sesiones y escritura caducan', () => {
  const ahora=1000000, info={ username:'Ana', userId:'misma', actualizadoEn:ahora, escribiendo:true, campo };
  const resultado=editoresVigentes({ yo:info, otra:info, vieja:{...info,actualizadoEn:ahora-90000}, quieta:{...info,actualizadoEn:ahora-4000}, mal:{username:1} }, 'yo', ahora);
  assert.deepEqual(resultado.map(e=>e.sesionId), ['otra','quieta']);
  assert.equal(resultado[0].escribiendo,true); assert.equal(resultado[1].escribiendo,false);
});

test('el rótulo sigue la fila después de reordenar y reconoce su eliminación', () => {
  const e={productos:[{id:'p1',clienteId:'c',medida:'Gde',pesadasIds:['fila2','fila1']}]};
  assert.equal(describirCampo(campo,e,{},()=> 'Cliente'), 'Cliente · Gde · Kilos 1');
  e.productos[0].pesadasIds=['fila1'];
  assert.equal(describirCampo(campo,e,{},()=> 'Cliente'), 'Fila eliminada');
});

test('los indicadores en DOM acompañan a la identidad y se retiran al salir el colaborador', t => {
  // jsdom puede usar canvas opcional; esta prueba solo necesita inputs y DOM.
  const Module = require('node:module'), original = Module._load;
  const carga = t.mock.method(Module, '_load', function(id, ...args) {
    return id === 'canvas' ? {} : original.call(this, id, ...args);
  });
  const { JSDOM } = require('jsdom');
  carga.mock.restore();
  const dom=new JSDOM('<div><input value="50"></div>');
  try {
    const el=dom.window.document.querySelector('input');
    const d=loadSource('src/directives/campoColaborativo.js').default;
    const editor={username:'Ana',color:'#2563eb',campo};
    d.bind(el,{value:{campo,editores:[editor]}});
    assert.deepEqual(campoDesdeElemento(el),campo);
    assert.equal(el.classList.contains('campo-con-colaboradores'),true);
    assert.equal(el.getAttribute('aria-description'),'También aquí: Ana');
    d.update(el,{value:{campo:{...campo,filaId:'otra'},editores:[editor]}});
    assert.equal(el.classList.contains('campo-con-colaboradores'),false);
    assert.equal(el.value,'50');
    d.unbind(el); assert.equal(campoDesdeElemento(el),null);
  } finally { dom.window.close(); }
});

function simular({inscribir=async()=>{},borrar=async()=>{}}={}) {
  const eventos=[], listeners=new Map();
  const api={ref:(_,path)=>path,serverTimestamp:()=>({'.sv':'timestamp'}),
    onValue(path,fn){listeners.set(path,fn);return()=>listeners.delete(path);},
    onDisconnect(){return {remove(){eventos.push('inscribir');return inscribir();},async cancel(){eventos.push('cancelar');}};},
    async set(path,value){eventos.push({path,value});},
    remove(){eventos.push('borrar');return borrar();},
  };
  const {crearPresenciaEmbarque}=loadSource('src/services/EmbarquePresencia.js',{'firebase/database':api});
  const sesion=crearPresenciaEmbarque({db:{},embarqueId:'e',userId:'u',username:'Ana',alCambiar(){},alEstado(){}});
  const conectar=valor=>listeners.get('.info/connected')?.({val:()=>valor});
  return {sesion,eventos,conectar};
}

test('se confirma onDisconnect antes de publicar y se renueva al reconectar', async () => {
  const registro=diferido(); const s=simular({inscribir:()=>registro.promise});
  try {
    const conectando=s.conectar(true); s.sesion.enfocar(campo,true);
    await pausa(120); assert.deepEqual(s.eventos,['inscribir']);
    registro.resolve(); await conectando;
    await esperar(()=>s.eventos.some(e=>e.value));
    assert.deepEqual(s.eventos[1].value.campo,campo);
    assert.equal(s.eventos[1].value.escribiendo,true);
    await s.conectar(false); await s.conectar(true);
    await esperar(()=>s.eventos.filter(e=>e.value).length===2);
    assert.equal(s.eventos.filter(e=>e==='inscribir').length,2);
  } finally { await s.sesion.detener(); }
  assert.deepEqual(s.eventos.slice(-2),['borrar','cancelar']);
});

test('salir durante una inscripción tardía no deja presencia ni timers activos', async () => {
  const registro=diferido(); const s=simular({inscribir:()=>registro.promise});
  const conectando=s.conectar(true);
  await s.sesion.detener(); registro.resolve(); await conectando; await pausa(140);
  assert.equal(s.eventos.some(e=>e.value),false);
  assert.equal(s.eventos.filter(e=>e==='borrar').length,2);
});

test('un fallo al retirar conserva onDisconnect y permite reintentar el cierre', async () => {
  let falla=true;
  const s=simular({borrar:async()=>{if(falla)throw Error('offline');}});
  await s.sesion.detener(); assert.equal(s.eventos.includes('cancelar'),false);
  falla=false;
  await s.sesion.detener();
  assert.deepEqual(s.eventos,['borrar','borrar','cancelar']);
});

test('la captura continua no aplaza la subida, y el backoff explícito sí reemplaza el plazo', t => {
  const timers=new Map();let id=0,subidas=0;
  t.mock.method(global,'setTimeout',(fn,ms)=>{timers.set(++id,{fn,ms});return id;});
  t.mock.method(global,'clearTimeout',id=>timers.delete(id));
  const {embarqueSyncMixin}=loadSource('src/views/Embarques/mixins/embarqueSyncMixin.js',{'@/services/EmbarquesOfflineService':{}});
  const vm={subirCambiosEnVivo(){subidas++;}};
  const programar=embarqueSyncMixin.methods.programarSubidaEnVivo.bind(vm);
  for(let i=0;i<50;i++)programar();
  assert.equal(timers.size,1); assert.equal(id,1);
  assert.ok(timers.get(1).ms>=500 && timers.get(1).ms<650);
  timers.get(1).fn();timers.delete(1);assert.equal(subidas,1);
  programar();programar(5000);programar();
  assert.equal(timers.size,1);assert.equal(timers.get(vm._timerSubidaEnVivo).ms,5000);
  embarqueSyncMixin.beforeDestroy.call(vm);assert.equal(timers.size,0);
});

test('el estado de guardado distingue cambios pendientes, envío, error y desconexión', () => {
  const o=vueOptions('src/views/Embarques/components/ColaboracionEmbarque.vue',['computed']);
  const estado=o.computed.estadoGuardado;
  assert.match(estado.call({online:false,pendientes:true}),/Sin conexión.*pendientes/);
  assert.match(estado.call({online:true,subiendo:true}),/Sincronizando/);
  assert.match(estado.call({online:true,error:'falló'}),/reintentando/);
  assert.equal(estado.call({online:true}),'Sin cambios pendientes');
});
