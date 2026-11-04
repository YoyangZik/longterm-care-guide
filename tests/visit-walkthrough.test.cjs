const test=require('node:test');const assert=require('node:assert/strict');
const {fixture,NOW}=require('./helpers/records-fixture.cjs');
test('entry labels and resume positions survive reload without changing checklist or record data',async()=>{
 const f=fixture();const m=f.load('src/features/preparation/model.ts');const flow=f.load('src/features/visit-walkthrough/content.ts');const storage=f.load('src/features/preparation/storage.ts');
 let p=m.setEntry(m.freshPreparation(),'awaiting-assessment:common:visit-check',{status:'todo',note:'기존 메모'},NOW);const entries=JSON.stringify(p.entries);
 assert.equal(flow.visitEntryLabel(p.visitWalkthrough),'방문조사 질문 살펴보기');
 let progress=flow.initialVisitProgress();progress=flow.moveVisit(progress,1);progress=flow.moveVisit(progress,1);
 p={...p,visitWalkthrough:progress};f.values.set('care-diary:situation-records:v2','untouched records');await storage.savePreparation(p);
 const restored=await fixture(f.values).load('src/features/preparation/storage.ts').readPreparation();
 assert.deepEqual(restored.visitWalkthrough,progress);assert.equal(flow.visitEntryLabel(progress),'이어서 살펴보기');assert.equal(JSON.stringify(restored.entries),entries);assert.equal(f.values.get('care-diary:situation-records:v2'),'untouched records');
 while(progress.position!=='finish')progress=flow.moveVisit(progress,1);
 assert.equal(progress.completed,true);assert.equal(flow.visitEntryLabel(progress),'다시 살펴보기');assert.equal(JSON.stringify(m.parsePreparation(JSON.stringify({...p,visitWalkthrough:progress})).entries),entries);
 assert.equal(flow.moveVisit(progress,-1).completed,true);assert.equal(flow.moveVisit(flow.initialVisitProgress(),-1).position,'intro');
 assert.throws(()=>m.parsePreparation(JSON.stringify({...p,visitWalkthrough:{position:'missing',completed:false}})));assert.throws(()=>m.parsePreparation(JSON.stringify({...p,visitWalkthrough:null})));
});
