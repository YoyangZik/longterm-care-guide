const test=require('node:test');const assert=require('node:assert/strict');const {fixture,NOW}=require('./helpers/records-fixture.cjs');
function api(values){const f=fixture(values);return {...f,m:f.load('src/features/preparation/model.ts'),flow:f.load('src/features/preparation/completion-flow.ts'),storage:f.load('src/features/preparation/storage.ts')};}
test('all four first-time stages enter personalization-complete then record-intro then home exactly once',()=>{
 const {m,flow}=api();for(const stage of ['before-application','awaiting-assessment','awaiting-result','result-received']){
  const before=m.freshPreparation();assert.equal(flow.completionPending(before),false);
  let p=flow.completeStagePreparation(before,stage);assert.equal(p.completionGuide,'personalized');assert.equal(flow.completionDestination(p),'/preparation-complete');
  p=flow.advanceCompletionGuide(p);assert.equal(p.completionGuide,'records');assert.equal(flow.completionDestination(p),'/preparation-complete');
  p=flow.advanceCompletionGuide(p);assert.equal(p.completionGuide,'done');assert.equal(flow.completionDestination(p),'/home');
  for(const nextStage of ['before-application','awaiting-assessment','awaiting-result','result-received'])assert.equal(flow.completeStagePreparation(p,nextStage).completionGuide,'done');
 }
});
test('each acknowledged screen survives restart; failed save stays on current screen without mutating history or records',async()=>{
 let f=api();let p=f.m.setEntry(f.m.freshPreparation(),'before-application:first:documents',{status:'done',note:'직접 확인한 내용'},NOW);const entries=JSON.stringify(p.entries);f.values.set('care-diary:situation-records:v2','unchanged test records');
 p=f.flow.completeStagePreparation(p,'before-application');f.fail.write=true;await assert.rejects(f.storage.savePreparation(p));assert.equal(f.values.has('care-diary:preparation:v1'),false);f.fail.write=false;
 await f.storage.savePreparation(p);f=api(f.values);p=await f.storage.readPreparation();assert.equal(p.completionGuide,'personalized');
 await f.storage.savePreparation(f.flow.advanceCompletionGuide(p));f=api(f.values);p=await f.storage.readPreparation();assert.equal(p.completionGuide,'records');
 f.fail.write=true;await assert.rejects(f.storage.savePreparation(f.flow.advanceCompletionGuide(p)));assert.equal((await f.storage.readPreparation()).completionGuide,'records');f.fail.write=false;
 await f.storage.savePreparation(f.flow.advanceCompletionGuide(p));f=api(f.values);p=await f.storage.readPreparation();assert.equal(p.completionGuide,'done');assert.equal(JSON.stringify(p.entries),entries);assert.equal(f.values.get('care-diary:situation-records:v2'),'unchanged test records');
 assert.throws(()=>f.m.parsePreparation(JSON.stringify({...p,completionGuide:'invalid'})));
});
test('legacy setup, survey completion and record introduction history suppress new guides without clearing any history',()=>{
 const {m,flow}=api();const variants=[{setup:{'before-application':true}},{recordIntroduced:{'awaiting-assessment':true}},{intros:{'awaiting-result':{version:2,node:'finish',answers:{opinion:'submitted'},trail:[],completed:true,scope:'awaiting-result:common'}}}];
 assert.equal(flow.completeStagePreparation(m.freshPreparation(),'awaiting-assessment',true).completionGuide,'done');
 for(const history of variants){const before={...m.freshPreparation(),...history};const unchanged=JSON.stringify(before);const after=flow.completeStagePreparation(before,'result-received');assert.equal(after.completionGuide,'done');assert.equal(flow.completionDestination(after),'/home');assert.equal(JSON.stringify(before),unchanged);if(before.intros)assert.deepEqual(after.intros,before.intros);if(before.recordIntroduced)assert.equal(after.recordIntroduced['awaiting-assessment'],true);}
});
