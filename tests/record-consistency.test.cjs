const test=require('node:test');const assert=require('node:assert/strict');const {fixture,NOW}=require('./helpers/records-fixture.cjs');
test('partial interview resumes after reload, edits reach date/type/period views and deletion cannot be restored by legacy import',async()=>{
 let f=fixture();const model=f.load('src/features/records/situation-model.ts');let store=f.load('src/features/records/situation-storage.ts');
 let record=model.chooseType(model.createSituation('questions',NOW),'movement');
 for(const id of ['event','difficulty','help']){const q=model.questionsFor(record.type,null,record.answers).find(q=>q.id===id);record=model.answerSituation(record,id,q.choices[0].text);}
 record=model.updateSituation(record,{step:'question',cursor:2},NOW);await store.saveSituation(record);
 f=fixture(f.values);store=f.load('src/features/records/situation-storage.ts');const resumed=(await store.listSituations())[0];assert.equal(resumed.cursor,2);assert.deepEqual(resumed.answers,record.answers);
 const saved=model.confirmSituation(model.previewSituation(resumed),NOW);await store.saveSituation(saved);const edited=model.updateSituation(saved,{body:'직접 수정한 돌봄 내용이에요.',edited:true},NOW);await store.saveSituation(edited);
 const q=f.load('src/features/records/situation-query.ts');let rows=await store.listSituations();assert.equal(q.situationsOnDay(rows,record.date)[0].body,edited.body);assert.equal(q.recordOneLine(q.querySituations(rows,{type:'movement',from:record.date,to:record.date})[0]),edited.body);assert.equal(q.situationSummary(rows,{type:'all',from:record.date,to:record.date}).groups[0].records[0].body,edited.body);
 await store.deleteSituation(record.id);rows=await fixture(f.values).load('src/features/records/situation-storage.ts').listSituations();assert.equal(q.situationsOnDay(rows,record.date).length,0);assert.equal(q.situationSummary(rows,{type:'all',from:'',to:''}).total,0);assert.equal(q.querySituations(rows,{type:'movement',from:'',to:''}).length,0);
});
