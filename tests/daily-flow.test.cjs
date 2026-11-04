const test = require('node:test');
const assert = require('node:assert/strict');
const {fixture,NOW,answered,reviewed,legacyRecord}=require('./helpers/records-fixture.cjs');
test('daily answers accept morning, lunch and earlier today without per-answer acknowledgement', async()=>{
  const f=fixture();let r=f.model.createRecord(NOW);
  for(const [category,text] of [['meal','오늘 아침에 반찬을 잘라 드렸어요.'],['movement','점심에 복도에서 한 번 손을 잡았어요.'],['washing','아까 씻을 때 도왔는지는 잘 모르겠어요.']]) r=f.model.changeAnswer(r,category,text,'answered',NOW);
  assert.equal(f.model.canGenerate(r),true);assert.equal(f.model.acknowledgeCurrent,undefined);
  const d=f.draft.attachDraft(r,await f.service.generateSummary(r.source,{mode:'mock'}));
  assert.ok(d.review.every(item=>!item.reviewed));
  const final=f.model.confirmRecord(d,NOW);await f.repository.putRecord(final);
  assert.equal(final.finals.length,1);assert.equal(final.finals[0].content[0].text,r.source.answers[0].text);
});
test('partial answers -> finish -> special question -> single journal confirmation; unanswered never becomes normal',()=>{
  const f=fixture();const r=answered(f);const ending=f.model.wrapUp(r);
  assert.equal(ending.source.answers[ending.cursor].category,'notes');
  assert.equal(ending.source.answers[0].status,'unanswered');
  const draft=f.draft.attachDraft(ending,f.service.verbatimSummary(ending.source));
  assert.equal(draft.finals.length,0);
  const final=f.model.confirmRecord(draft,NOW);
  assert.equal(final.phase,'confirmed');
  assert.equal(final.finals[0].content[0].text,'답변이 없어 확인되지 않음');
  assert.ok(!final.finals[0].content.some(c=>c.text==='정상'||c.text==='도움 없음'));
  assert.equal(f.model.confirmRecord(final,'2026-11-03T00:00:00Z'),final);
});
test('explicit no special events is different from skipped or unanswered with correct evidence',()=>{
  const f=fixture();const r=answered(f);const i=r.source.answers.length-1;
  const original=f.service.verbatimSummary(r.source);
  assert.equal(original.items[i].text,null);assert.equal(original.items[i].status,'unanswered');assert.deepEqual(original.items[i].evidenceAnswerIds,[]);
  const none=f.model.changeAnswer(r,'notes','','none',NOW);const summary=f.service.verbatimSummary(none.source);
  assert.equal(summary.items[i].text,null);assert.equal(summary.items[i].status,'none');assert.deepEqual(summary.items[i].evidenceAnswerIds,[none.source.answers[i].id]);
  const explicit=f.model.confirmRecord(f.draft.attachDraft(none,summary),NOW);
  assert.match(explicit.finals[0].content[i].text,/사용자가 선택/);
  const skipped=f.model.changeAnswer(r,'notes','','skipped',NOW);
  assert.equal(f.service.verbatimSummary(skipped.source).items[i].status,'skipped');
  const forged=f.service.verbatimSummary(r.source);forged.items[i]=summary.items[i];assert.throws(()=>f.service.validateSummary(forged,r.source));
});
test('advance skips previously answered categories and early wrap up never changes raw answers',()=>{
  const f=fixture();let r=answered(f);r=f.model.changeAnswer(r,'meal','오늘 식사는 도왔어요.','answered',NOW);r=f.model.changeAnswer(r,'movement','','unobserved',NOW);
  const step=f.model.advanceQuestion({...r,cursor:0});assert.equal(step.record.source.answers[step.record.cursor].category,'clothing');
  const end=f.model.wrapUp(r);assert.deepEqual(end.source,r.source);assert.equal(f.model.advanceQuestion(end).ready,true);
});
test('midnight continuation keeps target day while retaining original input and separate edit timestamps',async()=>{
  const f=fixture();const first='2026-11-02T14:59:00.000Z',next='2026-11-02T15:02:00.000Z';
  let r=f.model.createRecord(first);r=f.model.changeAnswer(r,'meal','오늘 아침에 도왔어요.','answered',first);await f.repository.putRecord(r);
  const restarted=fixture(f.values);r=(await restarted.repository.listRecords())[0];r=restarted.model.changeAnswer(r,'meal','오늘 아침에 반찬을 잘라 드렸어요.','answered',next);r=restarted.model.changeAnswer(r,'movement','점심에는 혼자 걸으셨어요.','answered',next);
  assert.equal(r.targetDate,'2026-11-02');assert.equal(r.source.answers[0].enteredAt,first);assert.equal(r.source.answers[0].modifiedAt,next);assert.equal(r.source.answers[1].localDate,'2026-11-03');
  r=restarted.model.confirmRecord(restarted.draft.attachDraft(r,restarted.service.verbatimSummary(r.source)),next);await restarted.repository.putRecord(r);
  assert.deepEqual(restarted.calendar.dayStatus([r],'2026-11-02'),{completed:1,pending:0});assert.deepEqual(restarted.calendar.dayStatus([r],'2026-11-03'),{completed:0,pending:0});
});
test('changing an answer invalidates old summary and requires a new final draft confirmation',()=>{
  const f=fixture();const r=answered(f);const first=f.draft.attachDraft(r,f.service.verbatimSummary(r.source));
  const changed=f.model.changeAnswer(first,'toilet','오늘 아침에 부축했어요.','answered',NOW);
  assert.equal(changed.activeDraftId,null);assert.throws(()=>f.model.confirmRecord(changed));
  assert.deepEqual(changed.drafts[0].source,first.source);
  const second=f.draft.attachDraft(changed,f.service.verbatimSummary(changed.source));assert.equal(f.model.confirmRecord(second).phase,'confirmed');
  assert.throws(()=>f.draft.attachDraft(r,f.service.verbatimSummary(answered(f).source)));
});
test('same-day addition is rejected and an existing final is returned unchanged for a new start',async()=>{
 const f=fixture();const parent=f.model.confirmRecord(reviewed(f,answered(f)),NOW);await f.repository.putRecord(parent);
 const before=[...f.values];await assert.rejects(f.repository.getOrCreateAddition(parent.id,NOW));
 assert.deepEqual(await f.repository.getOrCreateDaily(NOW),parent);assert.deepEqual([...f.values],before);
});
test('old completed five-question records remain byte-for-byte intact; pending records migrate without losing source, review or first times',async()=>{
  for(const version of [0,2]){
    const f=fixture();const complete=legacyRecord(f,version,true);const pending=legacyRecord(f,version,false);f.values.set('care-diary:care-records:v1',JSON.stringify({version:1,records:[complete,pending]}));
    const before=JSON.stringify(complete);assert.deepEqual((await f.repository.listRecords()).find(r=>r.id===complete.id),complete);
    const upgraded=f.model.migrateDailyRecord(pending,NOW);assert.equal(upgraded.timingVersion,3);assert.equal(upgraded.targetDate,pending.source.observedDate);assert.equal(upgraded.createdAt,pending.createdAt);assert.deepEqual(upgraded.migration.source,pending.source);assert.deepEqual(upgraded.migration.review,pending.review);assert.deepEqual(upgraded.drafts,pending.drafts);assert.equal(upgraded.source.answers[3].enteredAt,pending.source.answers[3].enteredAt);assert.equal(upgraded.source.answers.at(-1).category,'notes');
    await f.repository.putRecord(upgraded);const restart=fixture(f.values);const records=await restart.repository.listRecords();assert.equal(JSON.stringify(records.find(r=>r.id===complete.id)),before);
    const final=restart.model.confirmRecord(restart.draft.attachDraft(upgraded,restart.service.verbatimSummary(upgraded.source)),NOW);await assert.rejects(restart.repository.putRecord(final));
  }
});
test('no-answer temporary save can exit immediately without invoking special question and restores exact cursor',async()=>{
  const f=fixture();const r=f.model.createRecord(NOW);await f.repository.putRecord(r);const re=fixture(f.values);const [loaded]=await re.repository.listRecords();assert.equal(loaded.cursor,0);assert.equal(loaded.source.answers.at(-1).status,'unanswered');assert.equal(loaded.finals.length,0);assert.deepEqual(re.calendar.dayStatus([loaded],'2026-11-03'),{completed:0,pending:0});
});
test('target date and first input timing are immutable at persistence; correction never retimes the journal',async()=>{
  const f=fixture();const r=answered(f);await f.repository.putRecord(r);const forged=JSON.parse(JSON.stringify(r));forged.targetDate='2026-11-01';forged.source.observedDate='2026-11-01';await assert.rejects(f.repository.putRecord(forged));
  const forgedTime=JSON.parse(JSON.stringify(r));forgedTime.source.answers[3].enteredAt='2026-11-01T00:00:00Z';await assert.rejects(f.repository.putRecord(forgedTime));
  const done=f.model.confirmRecord(reviewed(f,r),NOW);await f.repository.putRecord(done);const corrected=f.model.correctTypo(done,'toilet','화장실 갈 때 부축했어요.','2026-11-03T03:00:00Z');await f.repository.putRecord(corrected);assert.equal(corrected.createdAt,r.createdAt);assert.equal(corrected.targetDate,r.targetDate);assert.deepEqual(corrected.source,done.source);assert.deepEqual(corrected.finals,done.finals);
});
