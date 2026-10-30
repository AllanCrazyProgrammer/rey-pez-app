// SDKs y sockets independientes contra Realtime Database local. Sin importar
// src/firebase ni aceptar un destino de producción.
const { test }=require('node:test');
const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase/app');
const {getDatabase,connectDatabaseEmulator,ref,get,goOffline,goOnline}=require('firebase/database');
const {loadSource}=require('./helpers/embarques-source.cjs');
const host=process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if(!/^127\.0\.0\.1:\d+$/.test(host||''))throw Error('Se requiere FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:PUERTO');
const {crearPresenciaEmbarque}=loadSource('src/services/EmbarquePresencia.js');
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
async function esperar(fn){for(let i=0;i<150;i++){if(fn())return;await pausa(40);}assert.fail('No convergió la presencia');}

test('dos ventanas de la misma cuenta ven el foco, la escritura, la reconexión y la salida por sesión', {timeout:25000}, async()=>{
  const apps=[],dbs=[],sesiones=[],vistas=[[],[]],estados=[];
  const embarqueId='presencia-'+require('node:crypto').randomUUID();
  const proyecto='demo-reypez-embarques';
  try{
    for(let i=0;i<2;i++){
      const app=initializeApp({projectId:proyecto,databaseURL:`https://${proyecto}-default-rtdb.firebaseio.com`},embarqueId+'-'+i);
      apps.push(app);const db=getDatabase(app);dbs.push(db);
      connectDatabaseEmulator(db,'127.0.0.1',Number(host.split(':')[1]));
      sesiones.push(crearPresenciaEmbarque({db,embarqueId,userId:'misma-cuenta',username:'Ana',alCambiar:v=>{vistas[i]=v;},alEstado:e=>{estados[i]=e;}}));
    }
    await esperar(()=>vistas.every(v=>v.length===1));
    assert.notEqual(sesiones[0].sesionId,sesiones[1].sesionId);
    assert.equal(vistas[0][0].sesionId,sesiones[1].sesionId);
    const campo={tipo:'producto',productoId:'p1',campo:'kilos',filaId:'f2'};
    sesiones[0].enfocar({...campo,valor:'NO PUBLICAR'},true);
    await esperar(()=>vistas[1][0]?.escribiendo);
    assert.deepEqual(vistas[1][0].campo,campo);
    const propia=ref(dbs[0],`presenciaEmbarques/${embarqueId}/sesiones/${sesiones[0].sesionId}`);
    assert.equal((await get(propia)).val().campo.valor,undefined);
    await esperar(()=>vistas[1][0] && !vistas[1][0].escribiendo);
    assert.deepEqual(vistas[1][0].campo,campo,'deja de escribir sin perder el foco');
    // Mantener escritura más allá de la ventana de caducidad de 3 segundos.
    for(let i=0;i<18;i++){sesiones[0].enfocar(campo,true);await pausa(200);}
    assert.equal(vistas[1][0].escribiendo,true);
    sesiones[0].enfocar(null);
    await esperar(()=>vistas[1][0] && vistas[1][0].campo===null);
    goOffline(dbs[0]);
    await esperar(()=>vistas[1].length===0 && estados[0]==='desconectado');
    assert.equal(vistas[0].length,0);
    goOnline(dbs[0]);
    await esperar(()=>vistas.every(v=>v.length===1));
    await sesiones[0].detener();
    await esperar(()=>vistas[1].length===0);
    const sala=(await get(ref(dbs[1],`presenciaEmbarques/${embarqueId}/sesiones`))).val();
    assert.deepEqual(Object.keys(sala),[sesiones[1].sesionId],'cerrar una ventana conserva la otra');
  }finally{
    dbs.forEach(goOnline);
    await Promise.all(sesiones.map(s=>s.detener()));
    dbs.forEach(goOffline);await Promise.all(apps.map(deleteApp));
  }
});
