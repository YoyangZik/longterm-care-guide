const test=require('node:test');const assert=require('node:assert/strict');
const {fixture,NOW,answered,reviewed}=require('./helpers/records-fixture.cjs');

test('calendar presentation shows confirmed stories only, keeps pending/correction drafts separately, and never mutates records',()=>{
  const f=fixture();const api=f.load('src/features/records/presentation.ts');const confirmed=f.model.confirmRecord(reviewed(f,answered(f)),NOW);const pending=answered(f,'아침에 식기를 준비했어요.');const correction={...confirmed,typoDraft:{category:'toilet',text:'화장실 갈 때 부축했어요.',acknowledged:false}};
  const records=[pending,correction];const before=JSON.stringify(records);
  assert.deepEqual(api.confirmedOnDate(records,confirmed.targetDate).map(r=>r.id),[confirmed.id]);
  assert.deepEqual(new Set(api.pendingRecords(records).map(r=>r.id)),new Set([pending.id,confirmed.id]));
  assert.equal(JSON.stringify(records),before);assert.deepEqual(api.confirmedOnDate(records,'2026-10-01'),[]);
});

test('freshly saved story is first on its fixed target day even after midnight; all same-day confirmed stories remain available',()=>{
  const f=fixture();const api=f.load('src/features/records/presentation.ts');const first=f.model.confirmRecord(reviewed(f,answered(f)),'2026-11-02T04:00:00Z');const second=f.model.confirmRecord(reviewed(f,answered(f,'오늘도 한 번 부축했어요.')),'2026-11-03T04:00:00Z');
  const pending=answered(f);const records=[first,pending,second];assert.deepEqual(api.confirmedOnDate(records,first.targetDate,first.id).map(r=>r.id),[first.id,second.id]);assert.deepEqual(api.confirmedOnDate(records,first.targetDate).map(r=>r.id),[second.id,first.id]);assert.equal(api.confirmedOnDate(records,'2026-11-03',second.id).length,0);const older=f.model.confirmRecord(reviewed(f,answered(f)),'2026-11-02T11:59:00+09:00');assert.deepEqual(api.confirmedOnDate([older,first],first.targetDate).map(r=>r.id),[first.id,older.id]);
});

test('home continues a same-day story or correction without hiding earlier drafts in the separate list',()=>{
  const f=fixture();const api=f.load('src/features/records/presentation.ts');const today=answered(f);const previous={...answered(f),targetDate:'2026-11-01',source:{...today.source,observedDate:'2026-11-01'}};
  let state=api.homeRecordState([previous,today],today.targetDate);assert.equal(state.pendingToday.id,today.id);assert.equal(state.completed,null);assert.equal(api.pendingRecords([previous,today]).length,2);
  const done=f.model.confirmRecord(reviewed(f,today),NOW);state=api.homeRecordState([{...done,typoDraft:{category:'toilet',text:'부축했어요.',acknowledged:false}}],done.targetDate);assert.equal(state.completed.id,done.id);assert.equal(state.pendingToday.id,done.id);
});

test('display formatting uses Korean dates and local clock without seconds or UTC day shifts; source values remain intact',()=>{
  const f=fixture();const api=f.load('src/features/records/display.ts');assert.equal(api.formatDay('2026-11-02',false),'11월 2일');assert.equal(api.formatMonth('2026-01'),'2026년 1월');assert.equal(api.formatClock('08:02'),'오전 8:02');assert.equal(api.formatClock('00:00'),'오전 12:00');assert.equal(api.formatClock('12:00'),'오후 12:00');assert.equal(api.formatClock('23:59'),'오후 11:59');
  const date=new Date(2026,10,2,0,2,59);const raw=date.toISOString();const text=api.formatTimestamp(raw);assert.match(text,/11월 2일 오전 12:02$/);assert.doesNotMatch(text,/AM|PM|:59/);assert.equal(api.formatTimestamp(raw,false),'오전 12:02');assert.equal(date.toISOString(),raw);
});

test('edited journal text survives a rejected final write, then saves verbatim while preserving raw source and first timestamps',async()=>{
  const f=fixture();const api=f.load('src/features/records/presentation.ts');const original=answered(f);const draft=reviewed(f,original);const changed={...draft,review:draft.review.map(item=>item.category==='toilet'?{...item,text:'화장실 갈 때 부축했어요.'}:item)};
  await f.repository.putRecord(changed);const bytes=[...f.values];f.fail.write=true;await assert.rejects(f.repository.putRecord(f.model.confirmRecord(changed,NOW)));assert.deepEqual([...f.values],bytes);assert.equal(changed.review.find(item=>item.category==='toilet').text,'화장실 갈 때 부축했어요.');f.fail.write=false;
  const saved=await f.repository.putRecord(f.model.confirmRecord(changed,NOW));assert.equal(api.visibleFinalItems(saved).find(item=>item.category==='toilet').text,'화장실 갈 때 부축했어요.');assert.deepEqual(saved.source,original.source);assert.equal(saved.createdAt,original.createdAt);assert.ok(!api.visibleFinalItems(saved).some(item=>item.category==='meal'));
});
