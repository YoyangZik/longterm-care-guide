const test=require('node:test');const assert=require('node:assert/strict');
const {fixture}=require('./helpers/records-fixture.cjs');

test('first-run test starts empty and keeps every original storage byte unchanged, including pending stage choice and care data',async()=>{
  const f=fixture();const guidance=f.load('src/features/start/guidance-storage.ts');const trial=f.load('src/features/trial/storage.ts');
  await f.load('src/features/onboarding/storage.ts').saveCompletion();await trial.saveSurvey('awaiting-result');await trial.saveSurveyDraft('result-received');
  const realGuidance={...guidance.freshGuidance(),seen:{'awaiting-result':true},visit:{date:'2026-11-10',time:'14:30'},visitSetupDone:true};
  await guidance.saveGuidance(realGuidance);
  f.values.set('care-diary:care-records:v1','original diary bytes');f.values.set('care-diary:preparation:v1','original preparation bytes');
  const before=[...f.values];const {deviceStartRepository:device,createFirstRunTestRepository:create}=f.load('src/features/start/repository.ts');
  const original=await device.load();const memory=create(true);assert.deepEqual(await memory.load(),{onboarded:false,stage:null,guidance:guidance.freshGuidance()});
  await memory.finishIntro();await memory.saveStageDraft('before-application');assert.equal(await memory.readStageDraft(),'before-application');
  await memory.setStage('before-application');assert.equal(await memory.readStageDraft(),null);
  await memory.saveGuidance({...guidance.freshGuidance(),experience:'first',seen:{'before-application':true},visit:{date:'2026-12-01',time:null},visitSetupDone:true});
  assert.equal((await memory.load()).stage,'before-application');assert.deepEqual([...f.values],before);
  assert.deepEqual(await device.load(),original);assert.equal(await device.readStageDraft(),'result-received');
});

test('discarding and restarting a test creates a fresh session; delayed old writes cannot modify new or real state',async()=>{
  const f=fixture();const {createFirstRunTestRepository:create}=f.load('src/features/start/repository.ts');const first=create(true);
  await first.finishIntro();await first.setStage('awaiting-assessment');const second=create(true);
  await first.setStage('awaiting-result');await first.saveStageDraft('before-application');
  const state=await second.load();assert.equal(state.onboarded,false);assert.equal(state.stage,null);assert.equal(await second.readStageDraft(),null);assert.deepEqual([...f.values],[]);
});

test('test adapter never accesses device storage, clones its data, and applies the same input validation',async()=>{
  const f=fixture(new Map(),{read:true,write:true});const {createFirstRunTestRepository:create,deviceStartRepository}=f.load('src/features/start/repository.ts');
  const memory=create(true);const snapshot=await memory.load();snapshot.guidance.seen['before-application']=true;assert.deepEqual((await memory.load()).guidance.seen,{});
  await memory.finishIntro();await memory.setStage('awaiting-assessment');await memory.saveStageDraft('awaiting-result');await memory.saveGuidance(snapshot.guidance);
  await assert.rejects(memory.setStage('unknown'));await assert.rejects(memory.saveStageDraft('unknown'));await assert.rejects(memory.saveGuidance({...snapshot.guidance,visit:{date:'2026-02-30',time:null}}));
  await assert.rejects(deviceStartRepository.load());
});

test('release mode cannot create a first-run testing session',()=>{const {createFirstRunTestRepository:create}=fixture().load('src/features/start/repository.ts');assert.throws(()=>create(false),/development-only/);});

