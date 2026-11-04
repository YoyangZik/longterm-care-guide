const test=require('node:test');const assert=require('node:assert/strict');const {fixture,NOW}=require('./helpers/records-fixture.cjs');
function api(){const f=fixture();return {...f,p:f.load('src/features/preparation/model.ts'),m:f.load('src/features/medical/model.ts'),flow:f.load('src/features/preparation/personalization.ts'),content:f.load('src/features/preparation/content.ts')};}
test('one medical status and deadline survive stage changes and reload without rewriting legacy data or unrelated stores',async()=>{
 const f=api();let p=f.p.freshPreparation();p=f.m.setMedicalStatus(p,'preparing');p=f.m.setMedicalDeadline(p,'2026-11-12');const snapshot=JSON.stringify(p.medical);
 f.values.set('care-diary:situation-records:v2','original records');f.values.set('care-diary:notifications:v1','original notifications');
 for(const stage of ['before-application','awaiting-assessment','awaiting-result','result-received']){p=f.flow.syncSurveyFacts(p);f.content.preparationItems(stage,p);assert.equal(JSON.stringify(p.medical),snapshot);}
 const storage=f.load('src/features/preparation/storage.ts');await storage.savePreparation(p);const restarted=await fixture(f.values).load('src/features/preparation/storage.ts').readPreparation();assert.deepEqual(restarted.medical,p.medical);assert.equal(Object.keys(restarted.entries).length,0);assert.equal(f.values.get('care-diary:situation-records:v2'),'original records');assert.equal(f.values.get('care-diary:notifications:v1'),'original notifications');
});
test('legacy preparation completion is not submission, conflicting states require one confirmation, and archived notes are retained',()=>{
 const f=api();const first=f.p.setEntry(f.p.freshPreparation(),'before-application:first:medical',{status:'done',note:'발급 준비 메모'},NOW);let p=f.p.parsePreparation(JSON.stringify(first));assert.equal(p.medical.status,'preparing');assert.equal(p.medical.needsConfirmation,false);
 const raw={...first,opinion:'submitted',deadline:'2026-11-12'};p=f.p.parsePreparation(JSON.stringify(raw));assert.equal(p.medical.status,'unknown');assert.equal(p.medical.needsConfirmation,true);assert.equal(p.medical.deadline,'2026-11-12');assert.equal(p.entries['before-application:first:medical'].note,'발급 준비 메모');
 p=f.m.setMedicalStatus(p,'submitted');p=f.p.parsePreparation(JSON.stringify(p));assert.equal(p.medical.needsConfirmation,false);assert.equal(p.medical.status,'submitted');assert.deepEqual(p.entries,first.entries);
 const excluded=f.p.setEntry(f.p.freshPreparation(),'awaiting-result:common:medical',{status:'na'},NOW);assert.equal(f.m.getMedical(excluded).needsConfirmation,true);assert.notEqual(f.m.getMedical(excluded).status,'not-required');
});
test('duplicate survey copies collapse to the global explicit answer without a false conflict',()=>{
 const f=api();let p={...f.p.freshPreparation(),opinion:'submitted'};for(const stage of ['before-application:first','awaiting-assessment:common','awaiting-result:common'])p={...p,entries:{...p.entries,[stage+':medical']:{status:'done',source:'survey',surveyStatus:'done',note:'보존',updatedAt:NOW}}};const before=JSON.stringify(p.entries);p=f.p.parsePreparation(JSON.stringify(p));assert.equal(p.medical.status,'submitted');assert.equal(p.medical.needsConfirmation,false);assert.equal(JSON.stringify(p.entries),before);
});
test('unanswered and unknown remain distinct and completed/exempt states hide outstanding deadline messages',()=>{
 const f=api();let p=f.p.freshPreparation();assert.equal(f.m.getMedical(p).status,'unanswered');p=f.m.setMedicalStatus(p,'unknown');assert.equal(f.m.getMedical(p).status,'unknown');assert.match(f.m.medicalPresentation(p).description,/의료기관/);
 p=f.m.setMedicalDeadline(p,'2020-01-01');for(const status of ['submitted','not-required']){const changed=f.m.setMedicalStatus(p,status);const shown=f.m.medicalPresentation(changed,'2026-11-04');assert.equal(shown.action,null);assert.equal(shown.overdue,false);assert.ok(!shown.title.includes('제출기한'));assert.equal(changed.medical.deadline,'2020-01-01');}
});
test('deadline uses local calendar dates: day before and due date are not overdue, next day is overdue',()=>{
 const f=api();let p=f.m.setMedicalDeadline(f.m.setMedicalStatus(f.p.freshPreparation(),'preparing'),'2026-11-12');assert.equal(f.m.medicalPresentation(p,'2026-11-11').overdue,false);assert.equal(f.m.medicalPresentation(p,'2026-11-12').overdue,false);assert.equal(f.m.medicalPresentation(p,'2026-11-13').overdue,true);assert.equal(f.m.medicalPresentation(p,'2026-11-13').title,'안내받은 제출기한이 지났어요.');p=f.m.setMedicalDeadline(p,'2026-11-20');assert.equal(f.m.medicalPresentation(p,'2026-11-13').overdue,false);assert.throws(()=>f.m.setMedicalDeadline(p,'2026-02-30'));
});
test('first-stage checklist omits medical and grouping never depends on completion status',()=>{
 const f=api();let p=f.p.freshPreparation();assert.ok(!f.content.preparationItems('before-application',p).some(item=>item.id==='medical'));
 for(const stage of ['before-application','awaiting-assessment','awaiting-result','result-received']){const before=f.content.preparationGroups(stage,p).map(group=>[group.kind,group.items.map(item=>item.id)]);for(const item of f.content.preparationItems(stage,p))p=f.p.setEntry(p,f.p.entryKey(f.p.preparationScope(stage,p),item.id),{status:'done'},NOW);assert.deepEqual(f.content.preparationGroups(stage,p).map(group=>[group.kind,group.items.map(item=>item.id)]),before);}
});
test('third-stage survey skips a known medical answer, asks an unregistered deadline once, and preserves explicit unknown',()=>{
 const f=api();let p=f.m.setMedicalStatus(f.p.freshPreparation(),'preparing');let i=f.flow.personalization('awaiting-result',p);assert.equal(i.node,'medical-deadline');p=f.m.setMedicalDeadline(p,null);i=f.flow.advancePersonalization('awaiting-result',p,i);assert.ok(i.node.startsWith('ask:'));assert.ok(!i.node.includes('medical'));
 p=f.m.setMedicalStatus(f.p.freshPreparation(),'unknown');assert.notEqual(f.flow.personalization('awaiting-result',p).node,'opinion');
 p=f.p.freshPreparation();i=f.flow.personalization('awaiting-result',p);assert.equal(i.node,'opinion');const choice=f.flow.choosePersonalization(p,'awaiting-result',i,'preparing');assert.equal(f.flow.advancePersonalization('awaiting-result',choice.data,choice.progress).node,'medical-deadline');
 p={...f.p.freshPreparation(),intros:{'before-application':{version:2,node:'ask:consult',answers:{},trail:['experience','lead','ask:medical','help:medical','ask:documents'],completed:false,scope:'before-application:first'}}};assert.deepEqual(f.flow.personalization('before-application',p).trail,['experience','ask:documents']);
});

test('deadline save advances the displayed cursor before date state changes, including resumed and fresh flows',()=>{
 const f=api();
 for(const date of ['2026-11-12',null])for(const saved of [false,true]){
  let p=f.m.setMedicalStatus(f.p.freshPreparation(),'preparing');
  const current=f.flow.personalization('awaiting-result',p);assert.equal(current.node,'medical-deadline');
  if(saved)p={...p,intros:{'awaiting-result':current}};
  const next=f.flow.savePersonalizationDeadline('awaiting-result',p,date);
  assert.equal(next.medical.deadline,date);assert.equal(next.medical.deadlineAsked,true);
  assert.equal(next.intros['awaiting-result'].node,'ask:result-route');
  const restored=f.p.parsePreparation(JSON.stringify(next));assert.equal(f.flow.personalization('awaiting-result',restored).node,'ask:result-route');
 }
});
test('only physical documents and requested supplies are preparation tasks in every branch',()=>{
 const f=api();const physical=['documents','medical','requested'];
 for(const purpose of ['first','renewal','change','reapply'])for(const result of ['recognized','not-recognized','unsure'])for(const stage of ['before-application','awaiting-assessment','awaiting-result','result-received']){
  const p={...f.p.freshPreparation(),purpose,result};
  for(const item of f.content.preparationItems(stage,p))assert.equal(item.kind,physical.includes(item.id)?'prepare':'check',item.id);
 }
});
