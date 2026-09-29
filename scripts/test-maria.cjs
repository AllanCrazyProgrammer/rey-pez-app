const { test } = require('node:test');
const assert = require('node:assert/strict');
const { duration, validateRecord, totals, csvCell } = require('../src/utils/maria/attendance.cjs');
const base = {employeeId:'employee-1',date:'2026-09-29',status:'Presente',scheduledStart:'08:00',scheduledEnd:'17:00',scheduledNextDay:false,scheduledBreak:60,actualStart:'08:15',actualEnd:'18:00',actualNextDay:false,actualBreak:45};
test('jornada con descanso, retardo y diferencia sobre horario asignado', () => { validateRecord(base); assert.deepEqual(totals(base),{worked:540,extra:60,late:15}); });
test('turno nocturno explícito', () => { assert.equal(duration('22:00','06:00',true,30),450); assert.throws(() => duration('22:00','06:00',false,0)); });
test('entrada pendiente de salida no suma horas', () => { const r={...base,actualEnd:''}; validateRecord(r); assert.equal(totals(r).worked,null); assert.equal(totals(r).extra,0); });
test('rechaza salida sin entrada, descansos inválidos y horas en faltas', () => { assert.throws(() => validateRecord({...base,actualStart:''})); assert.throws(() => validateRecord({...base,status:'Falta'})); assert.throws(() => validateRecord({...base,actualBreak:900})); assert.throws(() => duration('08:00','17:00',false,-1)); assert.throws(() => duration('08:00','17:00',false,1.5)); assert.throws(() => duration('08:00','08:00',false,0)); });
test('faltas no tienen tiempo trabajado', () => { const r={...base,status:'Falta',actualStart:'',actualEnd:'',actualBreak:0}; validateRecord(r); assert.equal(totals(r).worked,null); });
test('CSV escapa comillas, saltos y fórmulas', () => { assert.equal(csvCell('Juan "Pérez"'),'"Juan ""Pérez"""'); assert.equal(csvCell('=SUM(A1)'),'"\'=SUM(A1)"'); assert.equal(csvCell('uno\ndos'),'"uno\ndos"'); });

test('guardado atómico con historial; rechaza duplicados y versiones anteriores', async () => {
  const babel = require('@babel/core');
  const vm = require('node:vm');
  const fs = require('node:fs');
  const documents = new Map();
  let counter = 0;
  const store = {
    collection: (parent, ...parts) => [parent === 'db' ? '' : parent, ...parts].filter(Boolean).join('/'),
    doc: (parent, ...parts) => [parent === 'db' ? '' : parent, ...(parts.length ? parts : ['auto' + (++counter)])].filter(Boolean).join('/'),
    serverTimestamp: () => 'server-time',
    runTransaction: async (_db, action) => { const writes=[]; await action({get: async ref => ({exists:()=>documents.has(ref),data:()=>documents.get(ref)}),set:(ref,data)=>writes.push([ref,data])}); writes.forEach(([ref,data])=>documents.set(ref,data)); }
  };
  const code = babel.transformSync(fs.readFileSync(require.resolve('../src/services/mariaService.js'),'utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code;
  const context={exports:{},localStorage:{getItem:()=>JSON.stringify({username:'Maria'})},require: name => name === '@/firebase' ? {db:'db'} : name === 'firebase/firestore' ? store : require('../src/utils/maria/attendance.cjs')};
  vm.runInNewContext(code,context);
  const { saveRecord, deleteRecord }=context.exports;
  await saveRecord({...base,employeeName:'Ejemplo',area:'Producción'},'');
  const key='mariaAttendance/employee-1_2026-09-29';
  assert.equal(documents.get(key).version,1);
  assert.equal(documents.get(key).updatedBy,'Maria');
  assert.equal([...documents.keys()].filter(k=>k.includes('/history/')).length,1);
  await assert.rejects(saveRecord(base,''),/otro dispositivo/);
  await assert.rejects(saveRecord({...base,version:1},''),/motivo/);
  await saveRecord({...base,version:1,actualEnd:'19:00'},'Corrección de salida');
  assert.equal(documents.get(key).version,2);
  const history=[...documents.entries()].filter(([k])=>k.includes('/history/')).map(([,v])=>v);
  assert.equal(history[1].before.actualEnd,'18:00');
  assert.equal(history[1].after.actualEnd,'19:00');
  assert.equal(history[1].reason,'Corrección de salida');
  await assert.rejects(saveRecord({...base,version:1},'Edición obsoleta'),/otro dispositivo/);
  assert.equal(documents.size,3);
  await assert.rejects(deleteRecord({id:'missing',version:1},'Duplicado'),/no existe/);
  await assert.rejects(deleteRecord({id:'employee-1_2026-09-29',version:2},''),/motivo/);
  await assert.rejects(deleteRecord({id:'employee-1_2026-09-29',version:1},'Duplicado'),/otro dispositivo/);
  await deleteRecord({id:'employee-1_2026-09-29',version:2},'Captura duplicada');
  assert.equal(documents.get(key).deleted,true);
  assert.equal(documents.get(key).version,3);
  assert.equal(documents.get(key).deletedBy,'Maria');
  const deletion=[...documents.values()].find(v=>v.action==='delete');
  assert.equal(deletion.before.deleted,false);
  assert.equal(deletion.after.deleted,true);
  assert.equal(deletion.reason,'Captura duplicada');
  await assert.rejects(deleteRecord({id:'employee-1_2026-09-29',version:3},'Otra eliminación'),/otro dispositivo/);
  await saveRecord({...base,version:3,deleted:true,deletedAt:'server-time',deletedBy:'Maria'},'Restaurar jornada');
  assert.equal(documents.get(key).deleted,false);
  assert.equal(documents.get(key).version,4);
  assert.equal(documents.get(key).deletedAt,undefined);
});
