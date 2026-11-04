const test=require('node:test');const assert=require('node:assert/strict');
const {fixture,NOW}=require('./helpers/records-fixture.cjs');
test('new template summaries use polite endings while manual answers and details stay verbatim',()=>{
 const f=fixture(),m=f.load('src/features/records/situation-model.ts');
 for(const [type,scenario] of [['movement',null],['daily','meal'],['daily','washing'],['daily','toilet'],['memory',null],['behavior',null],['health',null],['other',null]]){
  const qs=m.questionsFor(type,scenario,{help:'도움을 드렸다.'});
  const tone=f.load('src/features/records/summary-tone.ts');for(const q of qs)for(const c of q.choices)assert.ok(!tone.politeTemplate(c.text).endsWith('다.'),c.text);
 }
 let r=m.chooseType(m.createSituation('questions',NOW),'movement');const qs=m.questionsFor(r.type,null);r=m.answerSituation(r,'event',qs[0].choices[0].text);r=m.answerSituation(r,'help',qs[2].choices[0].text);r=m.updateSituation(r,{answers:{...r.answers,'help:detail':'그분은 “괜찮다”고 말했다.'}});const raw=JSON.stringify(r);const body=m.generatedBody(r);assert.ok(body.includes('부축해드렸어요.'));assert.ok(body.includes('그분은 “괜찮다”고 말했다.'));assert.equal(JSON.stringify(r),raw);
 r=m.answerSituation(r,'help','어떤 도움을 받으셨는지는 직접 보지 못했다.');assert.ok(m.generatedBody(r).includes('직접 보지 못했어요.'));assert.equal(r.answers.help,'어떤 도움을 받으셨는지는 직접 보지 못했다.');
 r=m.answerSituation(r,'help','직접 작성한 문장은 그대로 둔다.');assert.ok(m.generatedBody(r).includes('직접 작성한 문장은 그대로 둔다.'));
});
test('review uses first save time rather than edit time within each record day',()=>{
 const f=fixture(),q=f.load('src/features/records/situation-query.ts'),m=f.load('src/features/records/situation-model.ts');const r={...m.createSituation('direct',NOW),status:'saved',type:'other',date:'2026-11-03',body:'원문'};
 const rows=[{...r,id:'earlier',createdAt:'2026-11-03T01:00:00Z',savedAt:'2026-11-03T02:00:00Z',updatedAt:'2026-11-03T12:00:00Z'},{...r,id:'later',createdAt:'2026-11-03T00:00:00Z',savedAt:'2026-11-03T03:00:00Z',updatedAt:'2026-11-03T03:00:00Z'}];const original=JSON.stringify(rows);assert.deepEqual(q.querySituations(rows,{type:'all',from:'',to:'2026-11-03'}).map(r=>r.id),['later','earlier']);assert.equal(JSON.stringify(rows),original);
});
test('an unchanged legacy-tone draft keeps the manually edited body after the tone update',()=>{
 const f=fixture(),m=f.load('src/features/records/situation-model.ts');let r=m.chooseType(m.createSituation('questions',NOW),'movement');const event=m.questionsFor('movement',null)[0].choices[0].text;r=m.updateSituation(r,{answers:{event},generated:event,body:'직접 수정한 원문이다.',edited:true});assert.equal(m.previewSituation(r).body,'직접 수정한 원문이다.');assert.equal(r.answers.event,event);
});
