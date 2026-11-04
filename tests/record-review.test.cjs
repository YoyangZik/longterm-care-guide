const test=require('node:test');const assert=require('node:assert/strict');
const {fixture,NOW}=require('./helpers/records-fixture.cjs');
function setup(){const f=fixture();return {m:f.load('src/features/records/situation-model.ts'),q:f.load('src/features/records/situation-query.ts')};}
function record(m){let r=m.chooseType(m.createSituation('questions',NOW),'movement');const qs=m.questionsFor(r.type,null);r=m.answerSituation(r,'event',qs[0].choices[0].text);r=m.answerSituation(r,'difficulty',qs[1].choices[1].text);r=m.answerSituation(r,'help',qs[2].choices[0].text);return m.confirmSituation(m.previewSituation(r),NOW);}
test('rolling ranges include today and exactly N calendar days across leap days and years',()=>{
 const {q}=setup();assert.deepEqual(q.reviewRange(7,'2026-01-03'),{from:'2025-12-28',to:'2026-01-03'});
 assert.deepEqual(q.reviewRange(30,'2024-03-01'),{from:'2024-02-01',to:'2024-03-01'});
 assert.deepEqual(q.reviewRange(90,'2026-11-03'),{from:'2026-08-06',to:'2026-11-03'});
 assert.throws(()=>q.reviewRange(7,'2026-02-30'));assert.throws(()=>q.reviewRange(15,'2026-11-03'));
});
test('review counts separate same-day records by type, ignore drafts and use original day rather than update time',()=>{
 const {m,q}=setup();const base=record(m);const rows=[{...base,id:'a',date:'2026-10-28',updatedAt:'2026-11-03T12:00:00Z'},{...base,id:'b',date:'2026-10-28',type:'memory'},{...base,id:'c',date:'2026-10-27'},{...base,id:'d',date:'2026-11-03'},{...base,id:'e',date:'2026-11-03',status:'draft'},{...base,id:'f',date:'2026-11-04'}];
 const range=q.reviewRange(7,'2026-11-03');assert.deepEqual(q.querySituations(rows,{type:'all',...range}).map(r=>r.id),['d','a','b']);
 assert.deepEqual(q.querySituations(rows,{type:'memory',...range}).map(r=>r.id),['b']);
 const summary=q.situationSummary(rows,{type:'all',...range});assert.equal(summary.total,3);assert.equal(summary.groups.find(g=>g.type==='movement').records.length,2);
 assert.equal(q.querySituations(rows,{type:'all',from:'2026-10-27',to:'2026-10-27'}).length,1);
 assert.deepEqual(q.situationsOnDay(rows,'2026-10-28','b').map(r=>r.id),['b','a']);
 assert.equal(q.situationsOnDay(rows,'2026-10-27','b')[0].id,'c');
});
test('question one-line previews combine only selected situation and actual helps without altering stored content',()=>{
 const {m,q}=setup();let r=record(m);const before=JSON.stringify(r);assert.equal(q.recordOneLine(r),'침대에서 일어날 때 몸을 부축해드렸어요.');assert.equal(JSON.stringify(r),before);
 const help=m.questionsFor('movement',null).find(q=>q.id==='help');r=m.answerSituation(r,'help',help.choices[0].text+'\n'+help.choices[1].text);r=m.previewSituation(r);
 assert.equal(q.recordOneLine(r),'침대에서 일어날 때 몸을 부축해드렸어요. 손을 잡아드렸어요.');assert.ok(!q.recordOneLine(r).includes('마치셨다'));
});
test('negation, uncertainty and unobserved help survive a one-line preview verbatim',()=>{
 const {m,q}=setup();for(const help of ['그때 따로 도움을 드리지는 않았다.','어떤 도움을 드렸는지는 잘 기억나지 않는다.','어떤 도움을 받으셨는지는 직접 보지 못했다.']){let r=record(m);r=m.answerSituation(r,'help',help);r=m.previewSituation(r);assert.equal(q.recordOneLine(r),'침대에서 일어나실 때, '+help);assert.ok(!q.recordOneLine(r).includes('부축'));}
});
test('direct, legacy and edited question records extract current text, never stale answers',()=>{
 const {m,q}=setup();const r=record(m);
 assert.equal(q.recordOneLine({...r,body:'도움을 드리지 않았다. 스스로 하셨다.',edited:true}),'도움을 드리지 않았다.');
 assert.equal(q.recordOneLine({...r,body:'직접 보지 못했다.\n다음 내용',method:'direct'}),'직접 보지 못했다.');
 assert.equal(q.recordOneLine({...r,body:'수정된 현재 본문',edited:false}),'수정된 현재 본문');
 assert.equal(q.firstRecordSentence('  첫 줄 그대로\n두 번째 줄'),'첫 줄 그대로');
 assert.equal(q.firstRecordSentence('체온은 36.5도였다. 약을 챙겼다.'),'체온은 36.5도였다.');
});
