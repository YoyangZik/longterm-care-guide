const test=require('node:test');const assert=require('node:assert/strict');const {fixture,NOW}=require('./helpers/records-fixture.cjs');
function api(){const f=fixture();return {...f,m:f.load('src/features/preparation/model.ts'),flow:f.load('src/features/preparation/personalization.ts')};}
test('personalization visits questions only and enables the post-survey guide after the last answer',()=>{
 const {m,flow}=api();for(const stage of ['before-application','awaiting-result','result-received']){
  let p=m.freshPreparation(),i=flow.personalization(stage,p),count=0;
  while(!i.completed&&count++<25){assert.ok(!i.node.startsWith('help:'));assert.notEqual(i.node,'lead');const value=i.node==='experience'?'first':i.node==='opinion'?'unknown':i.node==='result'?'unsure':i.node==='purpose'?'renewal':'todo';const choice=flow.choosePersonalization(p,stage,i,value);p=choice.data;i=flow.advancePersonalization(stage,p,choice.progress);p=flow.finishPersonalization(p,stage,i);}
  assert.ok(count<25);assert.equal(i.completed,true);assert.equal(flow.hasPersonalization(stage,p),true);assert.equal(p.recordIntroduced[stage],true);assert.equal(p.completionGuide,'personalized');
 }
});
test('medical answers become one shared state while legacy entries, manual notes and records remain intact',async()=>{
 const f=api();const {m,flow}=f;const medical=f.load('src/features/medical/model.ts');let p=m.freshPreparation();const manual='awaiting-assessment:common:medical',automatic='awaiting-result:common:medical';
 p=m.setEntry(p,manual,{status:'done',note:'직접 확인한 메모'},NOW);p=flow.syncSurveyFacts({...p,opinion:'submitted'});
 assert.equal(medical.getMedical(p).needsConfirmation,true);assert.equal(p.entries[automatic],undefined);const original=JSON.stringify(p.entries);
 p=medical.setMedicalStatus(p,'submitted');assert.equal(medical.getMedical(p).status,'submitted');p=medical.setMedicalStatus(p,'preparing');assert.equal(medical.getMedical(p).status,'preparing');assert.equal(JSON.stringify(p.entries),original);
 p=medical.setMedicalStatus(p,'unknown');assert.equal(medical.getMedical(p).status,'unknown');assert.equal(p.entries[manual].note,'직접 확인한 메모');
 f.values.set('care-diary:situation-records:v2','기존 기록');const storage=f.load('src/features/preparation/storage.ts');await storage.savePreparation(p);const restored=await fixture(f.values).load('src/features/preparation/storage.ts').readPreparation();assert.deepEqual(restored.entries,p.entries);assert.deepEqual(restored.medical,p.medical);assert.equal(f.values.get('care-diary:situation-records:v2'),'기존 기록');
});
test('survey checklist answers are marked automatic and later manual corrections survive repeated surveys',()=>{
 const {m,flow}=api();let p={...m.freshPreparation(),purpose:'first'};const stage='before-application',key='before-application:first:documents';let i={...flow.personalization(stage,p),node:'ask:documents'};
 p=flow.choosePersonalization(p,stage,i,'done').data;assert.equal(p.entries[key].source,'survey');assert.equal(p.entries[key].status,'done');p=flow.choosePersonalization(p,stage,i,'todo').data;assert.equal(p.entries[key].status,'todo');
 p=m.setEntry(p,key,{status:'done',note:'직접 완료'},NOW);p=flow.choosePersonalization(p,stage,i,'unknown').data;assert.equal(p.entries[key].status,'done');assert.equal(p.entries[key].surveyStatus,'unknown');assert.equal(p.entries[key].note,'직접 완료');
});
