const test=require('node:test');const assert=require('node:assert/strict');
const {fixture,NOW,answered,reviewed}=require('./helpers/records-fixture.cjs');
function api(values,fail){const f=fixture(values,fail);return {...f,m:f.load('src/features/records/situation-model.ts'),s:f.load('src/features/records/situation-storage.ts')};}
function direct(f,text='아침 기록'){let r=f.m.createSituation('direct',NOW);r=f.m.chooseType(r,'movement');r=f.m.updateSituation(r,{body:text});return f.m.confirmSituation(f.m.previewSituation(r),NOW);}
test('browsing methods, categories and scenarios never accumulates empty drafts',async()=>{
 const f=api();for(let i=0;i<5;i++){let r=f.m.createSituation(i%2?'direct':'questions',NOW);await f.s.saveSituation(r);r=f.m.chooseType(r,'daily');await f.s.saveSituation(r);r=f.m.chooseScenario(r,'meal');await f.s.saveSituation(r);}
 assert.equal((await f.s.listSituations()).length,0);
 assert.equal(JSON.parse(f.values.get(f.s.situationStorageKey)).records.length,0);
 let r=f.m.chooseType(f.m.createSituation('questions',NOW),'other');r=f.m.updateSituation(r,{answers:{event:'실제 입력'}});await f.s.saveSituation(r);assert.equal((await f.s.listSituations()).length,1);
 r=f.m.updateSituation(r,{answers:{event:'  '}});await f.s.saveSituation(r);assert.equal((await f.s.listSituations()).length,0);
});
test('previously stored empty shells are hidden without deleting original storage',async()=>{
 const f=api();const blank=f.m.createSituation('direct',NOW);const meaningful=direct(f,'작성한 내용');const raw=JSON.stringify({version:2,legacyImported:true,records:[blank,meaningful]});f.values.set(f.s.situationStorageKey,raw);assert.deepEqual((await f.s.listSituations()).map(r=>r.id),[meaningful.id]);assert.equal(f.values.get(f.s.situationStorageKey),raw);
});
test('direct content is preserved verbatim; blank content cannot be saved',()=>{const f=api();const text='손을 빌려드리지 않았다.\n직접 하신 말 “모르겠다”';const r=direct(f,text);assert.equal(r.body,text);assert.throws(()=>direct(f,'  '));assert.equal(r.method,'direct');});
test('question generation uses only active answers, preserving uncertainty and unobserved facts',()=>{const f=api();let r=f.m.chooseType(f.m.createSituation('questions',NOW),'movement');const q=f.m.questionsFor('movement',null);r=f.m.updateSituation(r,{answers:{event:q[0].choices[0].text,difficulty:'어려움은 잘 모르겠어요.',help:'직접 보지 못했어요.',invalid:'DO NOT INCLUDE'},questionSnapshot:q});const preview=f.m.previewSituation(r);assert.equal(preview.body,['침대에서 일어나실 때의 일이었어요.',r.answers.difficulty,r.answers.help].join('\n'));assert.ok(!preview.body.includes('DO NOT'));assert.equal(f.m.previewSituation(f.m.chooseType(r,'other')).body,'');});
test('scenario changes invalidate old answers; only selected daily situation is questioned',()=>{const f=api();let r=f.m.chooseType(f.m.createSituation('questions',NOW),'daily');assert.deepEqual(f.m.questionsFor('daily',null),[]);r=f.m.chooseScenario(r,'meal');r=f.m.updateSituation(r,{answers:{event:'meal only'}});r=f.m.chooseScenario(r,'toilet');assert.deepEqual(r.answers,{});assert.ok(f.m.questionsFor('daily','toilet')[0].prompt.includes('화장실'));assert.ok(!f.m.generatedBody(r).includes('meal only'));});
test('edited body cannot be silently overwritten after returning to answers',()=>{const f=api();let r=f.m.chooseType(f.m.createSituation('questions',NOW),'other');r=f.m.updateSituation(r,{answers:{event:'original'}});r=f.m.previewSituation(r);r=f.m.updateSituation(r,{body:'my edit',edited:true,answers:{event:'changed'}});assert.throws(()=>f.m.previewSituation(r),/conflict/);assert.equal(r.body,'my edit');assert.equal(f.m.previewSituation(r,true).body,'changed');});
test('unchanged answers preserve a manually edited preview on backward and forward navigation',()=>{const f=api();let r=f.m.chooseType(f.m.createSituation('questions',NOW),'other');r=f.m.updateSituation(r,{answers:{event:'original'}});r=f.m.previewSituation(r);r=f.m.updateSituation(r,{body:'edited exact text',edited:true,step:'question'});assert.equal(f.m.previewSituation(r).body,'edited exact text');});
test('interview choices elicit concrete help and only ask outcomes after actual reported help',()=>{
 const f=api();let r=f.m.chooseType(f.m.createSituation('questions',NOW),'movement');
 let qs=f.m.questionsFor(r.type,null,r.answers);r=f.m.answerSituation(r,'event',qs[0].choices[0].text);
 qs=f.m.questionsFor(r.type,null,r.answers);assert.ok(qs[1].prompt.includes('침대'));
 r=f.m.answerSituation(r,'difficulty',qs[1].choices[0].text);r=f.m.answerSituation(r,'help',qs[2].choices[0].text);
 qs=f.m.questionsFor(r.type,null,r.answers);assert.equal(qs.length,4);assert.ok(qs[2].choices.some(c=>c.label.includes('부축')));
 r=f.m.answerSituation(r,'outcome',qs[3].choices[0].text);r=f.m.updateSituation(r,{answers:{...r.answers,'help:detail':'왼쪽 팔을 잡았다.'}});
 assert.ok(f.m.generatedBody(r).includes('왼쪽 팔을 잡았다.'));assert.ok(f.m.generatedBody(r).includes('몸을 부축해드렸어요.'));
 r=f.m.answerSituation(r,'help',qs[2].choices.at(-1).text);assert.equal(f.m.questionsFor(r.type,null,r.answers).length,3);assert.equal(r.answers.outcome,undefined);
 r=f.m.answerSituation(r,'event',qs[0].choices[2].text);assert.equal(r.answers.difficulty,undefined);assert.equal(r.answers.help,undefined);assert.equal(r.answers['help:detail'],undefined);assert.ok(!f.m.generatedBody(r).includes('부축'));
});
test('each situation has concrete event and help choices, with scenario-specific interview wording',()=>{
 const f=api();for(const [type,scenario] of [['movement',null],['daily','meal'],['daily','washing'],['daily','toilet'],['memory',null],['behavior',null],['health',null],['other',null]]){const qs=f.m.questionsFor(type,scenario);assert.ok(qs[0].choices.length>=3);assert.ok(qs.find(q=>q.id==='help').choices.length>=3);assert.ok(!qs[0].choices.some(c=>c.label.includes('모르')));}
 const sleep=f.m.questionsFor('behavior',null,{event:'자다가 깨셨다.',help:'곁에서 이야기를 들어드렸다.'});assert.ok(sleep.at(-1).choices.some(c=>c.label==='다시 잠드셨어요'));
});
test('multiple actual help choices toggle without mixing no-help or uncertainty',()=>{
 const f=api();const q=f.m.questionsFor('movement',null).find(q=>q.id==='help');
 const [a,b]=q.choices;const none=q.choices.at(-1);
 let value=f.m.toggleInterviewChoice(q,'',a.text);value=f.m.toggleInterviewChoice(q,value,b.text);
 assert.equal(value,[a.text,b.text].join('\n'));
 assert.equal(f.m.toggleInterviewChoice(q,value,a.text),b.text);
 value=f.m.toggleInterviewChoice(q,value,none.text);assert.equal(value,none.text);
 assert.equal(f.m.toggleInterviewChoice(q,value,b.text),b.text);
 assert.equal(f.m.toggleInterviewChoice(q,'직접 보지 못했다.',a.text),a.text);
});
test('local start date and creation timestamp survive midnight and editing',()=>{const f=api();const start=new Date(2026,10,3,23,59).toISOString();let r=f.m.chooseType(f.m.createSituation('direct',start),'other');const date=r.date;r=f.m.updateSituation(r,{body:'note'},new Date(2026,10,4,1).toISOString());r=f.m.confirmSituation(r);assert.equal(r.date,date);assert.equal(r.createdAt,start);assert.notEqual(r.createdAt,r.updatedAt);});
test('multiple same-day records and repeated saves stay separate and idempotent',async()=>{const f=api();const a=direct(f,'a'),b=direct(f,'b');await Promise.all([f.s.saveSituation(a),f.s.saveSituation(a),f.s.saveSituation(b)]);let rows=await f.s.listSituations();assert.equal(rows.length,2);assert.equal(rows[0].date,rows[1].date);const changed=f.m.updateSituation(a,{body:'changed',type:'memory'});await f.s.saveSituation(changed);rows=await f.s.listSituations();assert.equal(rows.find(r=>r.id===a.id).body,'changed');assert.equal(rows.find(r=>r.id===a.id).createdAt,a.createdAt);});
test('drafts resume after restart with cursor, answer and body edits preserved',async()=>{const f=api();let r=f.m.chooseType(f.m.createSituation('questions',NOW),'movement');r=f.m.updateSituation(r,{answers:{event:'some event'},cursor:1,step:'question',body:'manual draft',edited:true});await f.s.saveSituation(r);const restarted=api(f.values);assert.deepEqual((await restarted.s.listSituations())[0],r);r=f.m.updateSituation(r,{cursor:0});assert.equal(r.answers.event,'some event');r=f.m.updateSituation(r,{cursor:1});assert.equal(r.cursor,1);});
test('legacy records and drafts are imported once without changing their original bytes',async()=>{const f=api();const saved=f.model.confirmRecord(reviewed(f,answered(f)),NOW);await f.repository.putRecord(saved);const before=f.values.get('care-diary:care-records:v1');const imported=await f.s.listSituations();assert.equal(imported[0].id,saved.id);assert.ok(imported[0].legacyOriginal);assert.equal(imported[0].date,saved.targetDate);assert.equal(f.values.get('care-diary:care-records:v1'),before);await f.s.deleteSituation(saved.id);assert.equal((await api(f.values).s.listSituations()).length,0);assert.equal(f.values.get('care-diary:care-records:v1'),before);});
test('write failures do not confirm, overwrite or delete stored records; corrupted storage stays intact',async()=>{const fail={read:false,write:false};const f=api(new Map(),fail);const r=direct(f,'original');await f.s.saveSituation(r);const before=f.values.get(f.s.situationStorageKey);fail.write=true;await assert.rejects(f.s.saveSituation(f.m.updateSituation(r,{body:'changed'})));await assert.rejects(f.s.deleteSituation(r.id));assert.equal(f.values.get(f.s.situationStorageKey),before);fail.write=false;f.values.set(f.s.situationStorageKey,'corrupt');await assert.rejects(f.s.listSituations());assert.equal(f.values.get(f.s.situationStorageKey),'corrupt');});
test('a late autosave never resurrects deleted records or overwrites a confirmed record',async()=>{const f=api();const saved=direct(f);await f.s.saveSituation(saved);const stale=f.m.updateSituation(saved,{status:'draft',savedAt:null,body:'stale'});await assert.rejects(f.s.saveSituation(stale));assert.equal((await f.s.listSituations())[0].body,saved.body);await f.s.deleteSituation(saved.id);await assert.rejects(f.s.saveSituation(saved),/deleted/);assert.equal((await f.s.listSituations()).length,0);});
test('type and period queries group exact records without counting drafts or inventing summaries',()=>{
 const f=api();const q=f.load('src/features/records/situation-query.ts');const first=direct(f,'verbatim one');const second={...direct(f,'verbatim two'),type:'memory',date:'2026-11-03'};const draft=f.m.createSituation('direct',NOW);
 const rows=[first,second,draft];assert.equal(q.querySituations(rows,{type:'all',from:'',to:''}).length,2);
 assert.deepEqual(q.querySituations(rows,{type:'memory',from:'2026-11-03',to:'2026-11-03'}),[second]);
 const summary=q.situationSummary(rows,{type:'all',from:'',to:''});assert.equal(summary.total,2);assert.equal(summary.groups.reduce((sum,g)=>sum+g.records.length,0),2);assert.equal(summary.groups.find(g=>g.type==='memory').records[0].body,'verbatim two');
 assert.throws(()=>q.querySituations(rows,{type:'all',from:'2026-11-04',to:'2026-11-03'}));
 assert.equal(q.situationSummary([],{type:'all',from:'',to:''}).total,0);
});
