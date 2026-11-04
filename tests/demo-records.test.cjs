const test=require('node:test');const assert=require('node:assert/strict');
const {fixture}=require('./helpers/records-fixture.cjs');
test('90-day fictional fixtures cover all types and both input methods, preserve existing data, and import idempotently without AI',async()=>{
 const f=fixture();const demo=f.load('src/features/records/demo-records.ts'),s=f.load('src/features/records/situation-storage.ts'),q=f.load('src/features/records/situation-query.ts');
 const records=demo.makeDemoRecords(new Date(2026,10,4,12));
 assert.equal(records.length,90);assert.equal(records[0].date,'2026-08-07');assert.equal(records.at(-1).date,'2026-11-04');assert.equal(new Set(records.map(r=>r.date)).size,90);assert.equal(new Set(records.map(r=>r.type)).size,6);assert.equal(new Set(records.map(r=>r.method)).size,2);records.forEach(s.assertSituation);
 for(const period of [7,30,90])assert.equal(q.querySituations(records,{type:'all',...q.reviewRange(period,'2026-11-04')}).length,period);
 const payload={...q.reviewRange(90,'2026-11-04'),records:records.map(f.load('src/features/records/ai-model.ts').evidence)};assert.ok(Buffer.byteLength(JSON.stringify(payload))<96000);
 const original={...records[0],id:'existing-personal-record',body:'기존 가상 자료'};f.values.set(s.situationStorageKey,JSON.stringify({version:2,legacyImported:true,records:[original]}));f.values.set('care-diary:ai-consent:v1','v1');
 const before=global.__DEV__;global.__DEV__=true;try{
  assert.equal(await s.importDemoSituations(records),90);assert.equal(await s.importDemoSituations(records),0);await new Promise(resolve=>setImmediate(resolve));const rows=await s.listSituations();assert.equal(rows.length,91);assert.deepEqual(rows.find(r=>r.id===original.id),original);assert.ok(rows.every(r=>r.aiSummary===undefined));
  global.__DEV__=false;await assert.rejects(s.importDemoSituations(records),/개발 환경/);
 }finally{global.__DEV__=before;}
});
