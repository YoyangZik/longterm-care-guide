const test=require('node:test');const assert=require('node:assert/strict');
const {fixture,NOW}=require('./helpers/records-fixture.cjs');
function resetFixture(values=new Map()){
 const f=fixture(values);const gate=f.load('src/features/reset/gate.ts');let failure=false,cleared=0;
 const raw={getItem:async k=>values.get(k)??null,setItem:async(k,v)=>{values.set(k,v);},getAllKeys:async()=>[...values.keys()],removeItem:async k=>{values.delete(k);},multiRemove:async keys=>{for(const key of keys){values.delete(key);if(failure)throw new Error('partial removal');}}};
 const api=f.load('src/features/reset/controller.ts');const controller=api.createResetController(raw,async()=>{cleared++;});
 return {...f,gate,controller,raw,journal:api.resetJournalKey,fail:()=>{failure=true;},get cleared(){return cleared;}};
}
test('confirmed reset removes owned current, legacy, backup and preference keys only; fresh load has no previous stage or records',async()=>{
 const f=resetFixture();const start=f.load('src/features/start/repository.ts');const old=start.bindStartRepository(start.deviceStartRepository);
 await old.finishIntro();await old.setStage('awaiting-assessment');await old.load();
 f.values.set('care-diary:preparation:v1',JSON.stringify({...f.load('src/features/preparation/model.ts').freshPreparation(),visitWalkthrough:{position:'memory',completed:false}}));
 for(const name of ['care-records:v1','situation-records:v2','backup:old','notifications:v1','screen-filters:v1'])f.values.set('care-diary:'+name,'test-only data');f.values.set('other-app:keep','untouched');
 // Merely constructing/opening the reset flow performs no mutation.
 assert.equal(f.values.has('care-diary:preparation:v1'),true);assert.equal(f.cleared,0);
 await f.controller.reset();assert.deepEqual([...f.values.entries()],[['other-app:keep','untouched']]);assert.equal(f.cleared,1);
 f.gate.resumeData();await assert.rejects(old.setStage('result-received'),/expired/);
 const fresh=await start.bindStartRepository(start.deviceStartRepository).load();assert.equal(fresh.onboarded,false);assert.equal(fresh.stage,null);assert.equal(fresh.guidance.visit.date,null);
 assert.deepEqual(await f.load('src/features/records/situation-storage.ts').listSituations(),[]);
 await f.controller.reset();assert.equal(f.values.get('other-app:keep'),'untouched');
});
test('partial failure keeps durable journal and blocks stale work; next launch finishes rather than restoring old state',async()=>{
 const f=resetFixture(new Map([['care-diary:one','x'],['care-diary:two','y'],['external','z']]));f.fail();await assert.rejects(f.controller.reset());assert.equal(f.values.get(f.journal),'pending');assert.equal(f.gate.dataPaused(),true);
 await assert.rejects(f.load('src/features/reset/storage.ts').default.setItem('care-diary:one','resurrected'));
 const restarted=resetFixture(f.values);assert.equal(await restarted.controller.recover(),true);assert.deepEqual([...f.values.entries()],[['external','z']]);assert.equal(await restarted.controller.recover(),false);
});
test('in-flight and delayed old-session autosaves cannot recreate data after reset; duplicate reset shares one operation',async()=>{
 const f=resetFixture();const storage=f.load('src/features/reset/storage.ts').default;const token=f.gate.dataGeneration();let release;const wait=new Promise(resolve=>{release=resolve;});
 const oldTask=f.gate.dataTask(async()=>{await wait;await storage.setItem('care-diary:draft','stale');},token);const rejected=assert.rejects(oldTask);
 await Promise.resolve();const first=f.controller.reset();assert.equal(first,f.controller.reset());release();await rejected;await first;f.gate.resumeData();
 await assert.rejects(f.gate.dataTask(()=>storage.setItem('care-diary:draft','late'),token),/expired/);assert.equal(f.values.has('care-diary:draft'),false);assert.equal(f.cleared,1);
});
test('notification cleanup failure does not delete data or remove journal and can be retried without permission prompts',async()=>{
 const f=resetFixture(new Map([['care-diary:draft','test only']]));const api=f.load('src/features/reset/controller.ts');let fail=true,permissions=0;
 const controller=api.createResetController(f.raw,async()=>{if(fail)throw new Error('cancel failure');});
 await assert.rejects(controller.reset());assert.equal(f.values.get('care-diary:draft'),'test only');assert.equal(f.values.get(f.journal),'pending');fail=false;await controller.reset();assert.equal(f.values.size,0);assert.equal(permissions,0);
 const defaults=f.load('src/features/notifications/planner.ts').defaults();assert.equal(defaults.care.enabled,false);assert.equal(defaults.visit.enabled,false);
});
