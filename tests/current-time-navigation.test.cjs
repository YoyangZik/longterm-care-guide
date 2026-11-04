const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers/records-fixture.cjs');
test('common exit gate does not navigate on failure; retry saves before leaving and suppresses duplicate back presses', async () => {
  const f=fixture(); const {createExitGate}=f.load('src/components/navigation/exit-gate.ts');const gate=createExitGate();
  const events=[];
  assert.equal(await gate.attempt(async()=>{events.push('failed-save');throw new Error('unavailable');},()=>events.push('leave')),false);
  assert.deepEqual(events,['failed-save']);
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const attempt=gate.attempt(async()=>{events.push('saving');await pending;events.push('saved');},()=>events.push('leave'));
  assert.equal(await gate.attempt(async()=>events.push('duplicate'),()=>events.push('duplicate-leave')),null);
  release();assert.equal(await attempt,true);assert.deepEqual(events,['failed-save','saving','saved','leave']);
});
test('leaving invalidates a delayed generation and a newer conversation never accepts an older result', async () => {
  const f=fixture();const {createTaskScope}=f.load('src/components/navigation/task-scope.ts');const scope=createTaskScope();
  const first=scope.start();let resolve;const delayed=new Promise(r=>{resolve=r;});const stored=[];
  const request=delayed.then(result=>{if(scope.isCurrent(first))stored.push(result);});
  scope.cancel();const second=scope.start();resolve('old-result');await request;
  assert.deepEqual(stored,[]);assert.equal(scope.isCurrent(first),false);assert.equal(scope.isCurrent(second),true);
});
test('stage survey temporary choice is separate from completion and survives re-entry', async () => {
  const f=fixture();const storage=f.load('src/features/trial/storage.ts');
  await storage.saveSurveyDraft('awaiting-result');
  assert.equal(await storage.readSurvey(),null);
  assert.equal(await storage.readSurveyDraft(),'awaiting-result');
  await storage.saveSurvey('awaiting-result');
  assert.equal(await storage.readSurvey(),'awaiting-result');
  assert.equal(await storage.readSurveyDraft(),null);
});
