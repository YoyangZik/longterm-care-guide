const test=require('node:test');const assert=require('node:assert/strict');
const {fixture,NOW,answered,reviewed}=require('./helpers/records-fixture.cjs');
test('home ignores empty shells and old dates, resumes latest meaningful input, and reflects deletion',async()=>{
 const f=fixture();const {homeRecordState}=f.load('src/features/records/presentation.ts');
 const empty=f.model.createRecord(NOW);const older=answered(f);const latest={...answered(f),updatedAt:'2026-11-02T05:00:00Z'};
 const past={...answered(f),targetDate:'2026-11-01',source:{...older.source,observedDate:'2026-11-01'}};
 assert.equal(homeRecordState([empty,past],'2026-11-02').pendingToday,null);
 assert.equal(homeRecordState([empty,older,latest,past],'2026-11-02').pendingToday.id,latest.id);
 await f.repository.putRecord(older);assert.equal(homeRecordState(await f.repository.listRecords(),'2026-11-02').pendingToday.id,older.id);
 await f.repository.deleteRecord(older.id);assert.equal(homeRecordState(await f.repository.listRecords(),'2026-11-02').pendingToday,null);
 const skip=f.model.changeAnswer(empty,'meal','','skipped',NOW);assert.equal(homeRecordState([skip],'2026-11-02').pendingToday.id,skip.id);
});
test('concurrent starts and confirms cannot create a second final; historical multiples remain unchanged and closed drafts are viewable',async()=>{
 const f=fixture();const [a,b]=await Promise.all([f.repository.getOrCreateDaily(NOW),f.repository.getOrCreateDaily(NOW)]);assert.equal(a.id,b.id);
 const first=reviewed(f,answered(f));const second=reviewed(f,answered(f));await f.repository.putRecord(first);await f.repository.putRecord(second);
 const results=await Promise.allSettled([f.repository.putRecord(f.model.confirmRecord(first,NOW)),f.repository.putRecord(f.model.confirmRecord(second,NOW))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const records=await f.repository.listRecords();const policy=f.load('src/features/records/policy.ts');const left=records.find(r=>r.id===second.id);assert.equal(policy.isClosedDraft(left,records),true);
 const historical=f.model.confirmRecord(reviewed(f,answered(f)),NOW);f.values.set('care-diary:care-records:v1',JSON.stringify({version:1,records:[...records,historical]}));
 const before=f.values.get('care-diary:care-records:v1');await f.repository.listRecords();assert.equal(f.values.get('care-diary:care-records:v1'),before);
 await assert.rejects(f.repository.putRecord(f.model.createRecord(NOW)));
 await f.repository.deleteRecord(first.id);await f.repository.deleteRecord(historical.id);await f.repository.putRecord(f.model.confirmRecord(second,NOW));assert.equal((await f.repository.listRecords()).find(r=>r.id===second.id).finals.length,1);
});
test('preparation setup, notes, completion and exclusion remain separate; purpose/result changes retain hidden entries',async()=>{
 const f=fixture();const m=f.load('src/features/preparation/model.ts');const c=f.load('src/features/preparation/content.ts');const store=f.load('src/features/preparation/storage.ts');
 let p={...m.freshPreparation(),purpose:'renewal',result:'recognized',setup:{'before-application':true,'result-received':true}};
 const scope=m.preparationScope('before-application',p);const key=m.entryKey(scope,'renewal');
 assert.ok(c.preparationItems('before-application',p).some(i=>i.id==='renewal'));assert.ok(!c.preparationItems('before-application',p).some(i=>i.id==='eligibility'));
 const initial=c.preparationCounts('before-application',p);p=m.setEntry(p,key,{note:'가상 준비 메모'},NOW);assert.deepEqual(c.preparationCounts('before-application',p),initial);
 p=m.setEntry(p,key,{status:'done'},NOW);assert.equal(c.preparationCounts('before-application',p).unknown,initial.unknown-1);
 p=m.setEntry(p,key,{status:'na'},NOW);assert.equal(c.preparationCounts('before-application',p).unknown,initial.unknown-1);
 const changed={...p,purpose:'change',result:'not-recognized'};assert.equal(changed.entries[key].note,'가상 준비 메모');assert.ok(!c.preparationItems('result-received',changed).some(i=>i.id==='agency'));assert.ok(c.preparationItems('result-received',changed).some(i=>i.id==='review'));
 await store.savePreparation({...changed,opinion:'submitted',deadline:'2026-11-10'});const re=fixture(f.values).load('src/features/preparation/storage.ts');assert.deepEqual(await re.readPreparation(),m.parsePreparation(JSON.stringify({...changed,opinion:'submitted',deadline:'2026-11-10'})));
 p=m.setEntry(p,key,{status:'todo'},NOW);assert.equal(c.preparationCounts('before-application',p).core,1);
});
test('preparation write failures preserve data; corrupt data is not reset; development sessions never touch device preparation',async()=>{
 const f=fixture();const m=f.load('src/features/preparation/model.ts');const s=f.load('src/features/preparation/storage.ts');await s.savePreparation(m.freshPreparation());const before=[...f.values];f.fail.write=true;
 await assert.rejects(s.savePreparation({...m.freshPreparation(),opinion:'submitted'}));assert.deepEqual([...f.values],before);
 const memory=s.memoryPreparationRepository();await memory.save({...m.freshPreparation(),purpose:'change'});assert.equal((await memory.read()).purpose,'change');assert.deepEqual([...f.values],before);assert.equal((await s.memoryPreparationRepository().read()).purpose,null);
 f.values.set(s.preparationKey,'invalid original');await assert.rejects(s.readPreparation());assert.equal(f.values.get(s.preparationKey),'invalid original');
 assert.throws(()=>m.parsePreparation(JSON.stringify({...m.freshPreparation(),deadline:'2026-02-30'})));
});
test('every displayed content branch has verified official source metadata and unique checklist IDs',()=>{
 const f=fixture();const m=f.load('src/features/preparation/model.ts');const c=f.load('src/features/preparation/content.ts');
 for(const stage of ['before-application','awaiting-assessment','awaiting-result','result-received'])for(const purpose of m.purposes)for(const result of m.results){const items=c.preparationItems(stage,{...m.freshPreparation(),purpose,result});assert.equal(new Set(items.map(i=>i.id)).size,items.length);for(const item of items){assert.match(item.source.url,/^https:\/\/(www\.)?(longtermcare\.or\.kr|easylaw\.go\.kr|law\.go\.kr)\//);assert.equal(item.source.checkedOn,'2026-11-03');assert.ok(item.body.length);}}
});
