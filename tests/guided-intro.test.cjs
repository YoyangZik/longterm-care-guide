const test=require('node:test');const assert=require('node:assert/strict');const {fixture,NOW}=require('./helpers/records-fixture.cjs');
function api(){const f=fixture();return {...f,m:f.load('src/features/preparation/model.ts'),flow:f.load('src/features/preparation/intro-flow.ts'),content:f.load('src/features/preparation/content.ts')};}
test('stored answers never skip questions after revisiting either the same or another branch',()=>{
 const {flow,m}=api();const stage='before-application';let p={...m.freshPreparation(),purpose:'first'};
 const originalScope=m.preparationScope(stage,p);
 for(const item of flow.introItems(stage,p))p=m.setEntry(p,m.entryKey(originalScope,item.id),{status:'done',note:'preserved'},NOW);
 for(const purpose of ['first','renewal','first']){
  let i={...flow.initialIntro(stage,p),node:purpose==='first'?'experience':'purpose',answers:{},trail:[],completed:false};
  const chosen=flow.chooseIntro(p,stage,i,purpose==='first'?'first':purpose);p=chosen.data;i=flow.nextIntro(stage,p,chosen.progress);
  assert.equal(i.node,'lead');i=flow.nextIntro(stage,p,i);
  const items=flow.introItems(stage,p);const visited=[];
  while(i.node!=='finish'){
   const id=i.node.slice(4);visited.push(id);
   const saved=p.entries[m.entryKey(m.preparationScope(stage,p),id)]?.status;
   const c=flow.chooseIntro(p,stage,i,saved??'done');p=c.data;i=flow.nextIntro(stage,p,c.progress);
  }
  assert.deepEqual(visited,items.map(item=>item.id));
  assert.equal(visited[0],purpose==='renewal'?'renewal':'eligibility');
  assert.equal(flow.nextIntro(stage,p,i).completed,true);
 }
 for(const entry of Object.values(p.entries).filter(entry=>entry.note))assert.equal(entry.note,'preserved');
});
test('back then next revisits answered questions in order without skipping them',()=>{
 const {flow,m}=api();const stage='before-application';let p={...m.freshPreparation(),purpose:'first'};
 let i=flow.initialIntro(stage,p);i=flow.nextIntro(stage,p,i);
 assert.equal(i.node,'ask:eligibility');
 for(const id of ['eligibility','method']){assert.equal(i.node,`ask:${id}`);const c=flow.chooseIntro(p,stage,i,'done');p=c.data;i=flow.nextIntro(stage,p,c.progress);}
 assert.equal(i.node,'ask:documents');
 i=flow.previousIntro(flow.previousIntro(i));assert.equal(i.node,'ask:eligibility');
 i=flow.nextIntro(stage,p,i);assert.equal(i.node,'ask:method');
 i=flow.nextIntro(stage,p,i);assert.equal(i.node,'ask:documents');
});
test('three one-at-a-time questions resolve all four stages and prune incompatible later answers',()=>{
 const {flow}=api();for(const [values,stage] of [[[false],'before-application'],[[true,false],'awaiting-assessment'],[[true,true,false],'awaiting-result'],[[true,true,true],'result-received']]){let progress=flow.freshDiscovery();let resolved;for(const value of values){progress=flow.answerDiscovery(progress,value);const next=flow.advanceDiscovery(progress);progress=next.progress;resolved=next.stage;}assert.equal(resolved,stage);assert.equal(progress.completed,true);}
 let d={step:'application',answers:{application:true,visit:true,result:true},completed:false};d=flow.answerDiscovery(d,false);assert.deepEqual(d.answers,{application:false});assert.equal(flow.advanceDiscovery(d).stage,'before-application');
});
test('saved stage/type/old setup do not imply completed introduction; each branch reaches finish without a loop',()=>{
 const {flow,m}=api();for(const [stage,context] of [['before-application','first'],['before-application','previous'],['awaiting-result','submitted'],['awaiting-result','unknown'],['result-received','recognized'],['result-received','not-recognized'],['result-received','unsure']]){
  let p={...m.freshPreparation(),setup:{[stage]:true},purpose:'first'};assert.equal(flow.introComplete(stage,p),false);let i=flow.initialIntro(stage,p);let steps=0;
  while(!i.completed&&steps++<40){let value;if(i.node==='experience'||i.node==='opinion'||i.node==='result')value=context;else if(i.node==='purpose')value='renewal';else if(i.node.startsWith('ask:'))value=steps%2?'todo':'unknown';if(value){const c=flow.chooseIntro(p,stage,i,value);p=c.data;i=c.progress;}if(i.node!=='finish')assert.equal(flow.introComplete(stage,p),false);i=flow.nextIntro(stage,p,i);p=flow.introProgress(p,stage,i);}
  assert.ok(steps<40,`${stage} loop`);assert.equal(flow.introComplete(stage,p),true);assert.equal(flow.initialIntro(stage,p).completed,true);
 }
});
test('answers, cursor and back history survive restart without completing preparation merely by reading',async()=>{
 const f=api();const {flow,m}=f;let p=m.freshPreparation();const stage='before-application';let i=flow.initialIntro(stage,p);let c=flow.chooseIntro(p,stage,i,'first');p=c.data;i=flow.nextIntro(stage,p,c.progress);i=flow.nextIntro(stage,p,i);c=flow.chooseIntro(p,stage,i,'todo');p=c.data;i=flow.nextIntro(stage,p,c.progress);assert.ok(i.node.startsWith('help:'));const entries=JSON.stringify(p.entries);p=flow.introProgress(p,stage,i);
 const s=f.load('src/features/preparation/storage.ts');await s.savePreparation(p);const restarted=fixture(f.values).load('src/features/preparation/storage.ts');const restored=await restarted.readPreparation();assert.deepEqual(flow.initialIntro(stage,restored),i);i=flow.nextIntro(stage,restored,i);assert.equal(JSON.stringify(restored.entries),entries);assert.equal(flow.introComplete(stage,restored),false);
});
test('only explicit preparation answers set status; unknown and remaining are distinct; changing a branch preserves notes and diaries',()=>{
 const a=api();const {flow,m,content}=a;let p={...m.freshPreparation(),purpose:'first'};const key=m.entryKey(m.preparationScope('before-application',p),'documents');p=m.setEntry(p,key,{note:'가상 기존 메모',status:'done'},NOW);a.values.set('care-diary:care-records:v1','untouched diary bytes');let i={...flow.initialIntro('before-application',p),node:'ask:method'};
 let c=flow.chooseIntro(p,'before-application',i,'unknown');p=c.data;assert.equal(p.entries[m.entryKey(m.preparationScope('before-application',p),'method')].status,'unknown');assert.equal(content.preparationCounts('before-application',p).core,0);
 c=flow.chooseIntro(p,'before-application',{...i,node:'ask:eligibility'},'todo');p=c.data;assert.equal(content.preparationCounts('before-application',p).core,1);
 c=flow.chooseIntro(p,'before-application',{...i,node:'purpose',answers:{experience:'previous','ask:method':'done'},trail:['experience']},'change');assert.equal(c.progress.answers['ask:method'],undefined);assert.equal(c.data.entries[key].note,'가상 기존 메모');assert.equal(a.values.get('care-diary:care-records:v1'),'untouched diary bytes');
 const excluded=m.setEntry(p,m.entryKey(m.preparationScope('before-application',p),'method'),{status:'na'},NOW);assert.ok(!flow.introItems('before-application',excluded).some(item=>item.id==='method'));assert.equal(excluded.entries[key].note,'가상 기존 메모');
});

test('completed introductions never reopen old question history, including previously saved trails',()=>{
 const {flow,m}=api();const stage='result-received';const p={...m.freshPreparation(),result:'unsure'};
 const i={...flow.initialIntro(stage,p),node:'finish',trail:['result','lead','ask:identify']};
 const completed=flow.nextIntro(stage,p,i);assert.deepEqual(completed.trail,[]);assert.equal(flow.previousIntro(completed).completed,true);
 const old={...completed,trail:i.trail};assert.deepEqual(flow.previousIntro(old),old);
});
test('backtracking and changing the application branch removes incompatible answers while preserving stored preparation',()=>{
 const {flow,m}=api();const stage='before-application';let p=m.freshPreparation();let i=flow.initialIntro(stage,p);
 let c=flow.chooseIntro(p,stage,i,'previous');p=c.data;i=flow.nextIntro(stage,p,c.progress);assert.equal(i.node,'purpose');
 c=flow.chooseIntro(p,stage,i,'renewal');p=c.data;i=flow.nextIntro(stage,p,c.progress);assert.equal(i.node,'lead');
 i=flow.previousIntro(i);assert.equal(i.node,'purpose');i=flow.previousIntro(i);assert.equal(i.node,'experience');
 const key=m.entryKey(m.preparationScope(stage,p),'renewal');p=m.setEntry(p,key,{status:'todo',note:'기존 메모'},NOW);
 c=flow.chooseIntro(p,stage,i,'first');p=c.data;assert.equal(c.progress.answers.purpose,undefined);
 i=flow.nextIntro(stage,p,c.progress);assert.equal(i.node,'lead');assert.deepEqual(i.trail,['experience']);
 assert.equal(p.entries[key].note,'기존 메모');assert.equal(p.entries[key].status,'todo');
});
