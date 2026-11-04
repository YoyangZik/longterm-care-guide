const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./helpers/records-fixture.cjs');
const {uiFixture,nodes}=require('./helpers/ui-fixture.cjs');
function setup(){const f=fixture(),previous=f.load('src/features/preparation/intro-flow.ts').previousIntro;return {...f,m:f.load('src/features/preparation/model.ts'),flow:f.load('src/features/preparation/personalization.ts'),back:progress=>previous(progress,true)};}
function answer(a,stage,data,value){const current=a.flow.personalization(stage,data);const chosen=a.flow.choosePersonalization(data,stage,current,value);const next=a.flow.advancePersonalization(stage,chosen.data,chosen.progress);return a.flow.finishPersonalization(chosen.data,stage,next);}

test('actual intro back callbacks visit each preceding question and selected answer, then return to stage choice instead of home',async()=>{
 const a=setup(),stage='before-application';let data=answer(a,stage,a.m.freshPreparation(),'first');data=answer(a,stage,data,'done');
 const p={data,update:async change=>{p.data=a.m.parsePreparation(JSON.stringify(change(p.data)));}};const routes=[];let exit;
 const ui=uiFixture({'../medical/ui':{MedicalDeadlineForm:'MedicalDeadlineForm'},'./provider':{usePreparation:()=>p},'../start/provider':{useStart:()=>({stage,guidance:{seen:{},experience:'first'}})},'expo-router':{Stack:{Screen:'Screen'},useLocalSearchParams:()=>({}),router:{replace:r=>routes.push(r)}},'@/components/navigation/use-safe-exit':{useSafeExit:options=>{exit=options;return {blocked:false,saving:false,request:async()=>{await options.save();options.leave();}};}}});
 const Screen=ui.load('src/features/preparation/intro-screen.tsx').default;
 ui.draw(Screen,{});await exit.save();exit.leave();assert.equal(a.flow.personalization(stage,p.data).node,'ask:eligibility');assert.deepEqual(routes,[]);
 let tree=ui.draw(Screen,{});assert.ok(nodes(tree).some(n=>n.props?.selected===true&&n.props.label==='확인했어요'));
 await exit.save();exit.leave();assert.equal(a.flow.personalization(stage,p.data).node,'experience');assert.deepEqual(routes,[]);
 tree=ui.draw(Screen,{});assert.ok(nodes(tree).some(n=>n.props?.selected===true&&n.props.label==='처음 신청해요'));
 await exit.save();exit.leave();assert.deepEqual(routes,['/stage']);
});

test('back requests are consumed while a forward save owns the screen',async()=>{
 let saved=0,left=0;const ui=uiFixture({'expo-router':{useFocusEffect:()=>{},usePreventRemove:()=>()=>{}}});
 const hook=ui.load('src/components/navigation/use-safe-exit.ts').useSafeExit;
 const options={enabled:true,save:async()=>{saved++;},leave:()=>{left++;}};
 await ui.draw(hook,{...options,blockedBy:true}).request();assert.equal(saved,0);assert.equal(left,0);
 await ui.draw(hook,{...options,blockedBy:false}).request();assert.equal(saved,1);assert.equal(left,1);
});

test('a forward lock blocks back immediately even before React rerenders the busy state',async()=>{
 let locked=false,saved=0;const ui=uiFixture({'expo-router':{useFocusEffect:()=>{},usePreventRemove:()=>()=>{}}});
 const hook=ui.load('src/components/navigation/use-safe-exit.ts').useSafeExit;
 const exit=ui.draw(hook,{enabled:true,blockedBy:()=>locked,save:async()=>{saved++;},leave(){}});
 locked=true;await exit.request();assert.equal(saved,0);locked=false;await exit.request();assert.equal(saved,1);
});

test('changing an earlier branch keeps only its actual new route and preserves unrelated notes and care data',()=>{
 const a=setup(),stage='before-application';let data=answer(a,stage,a.m.freshPreparation(),'previous');data=answer(a,stage,data,'renewal');
 data=answer(a,stage,data,'done');
 while(a.flow.personalization(stage,data).node!=='purpose'){const previous=a.back(a.flow.personalization(stage,data));data={...data,intros:{...data.intros,[stage]:previous}};}
 data=answer(a,stage,data,'change');assert.equal(a.flow.personalization(stage,data).node,'ask:change');
 let previous=a.back(a.flow.personalization(stage,data));assert.equal(previous.node,'purpose');assert.equal(previous.answers.purpose,'change');previous=a.back(previous);assert.equal(previous.node,'experience');assert.equal(previous.answers.experience,'previous');
});

test('completed surveys retain the actual question stack, restore selected answers and step back to the first question after restart',()=>{
 for(const stage of ['before-application','awaiting-result','result-received'])for(const root of stage==='before-application'?['first','renewal','change','reapply']:stage==='awaiting-result'?['unknown','submitted','not-required']:['recognized','not-recognized','unsure']){
  const a=setup();let data=a.m.freshPreparation(),seen=[];
  for(let limit=0;limit<30;limit++){
   const current=a.flow.personalization(stage,data);if(current.completed)break;seen.push(current.node);
   const value=current.node==='experience'?(root==='first'?'first':'previous'):current.node==='purpose'?root:current.node==='opinion'||current.node==='result'?root:'todo';
   data=answer(a,stage,data,value);
  }
  assert.ok(a.flow.personalization(stage,data).completed);data=a.m.parsePreparation(JSON.stringify(data));
  for(const expected of seen.toReversed()){
   const current=a.flow.personalization(stage,data);const previous=a.back(current);data={...data,intros:{...data.intros,[stage]:previous}};
   const restored=a.flow.personalization(stage,data);assert.equal(restored.node,expected,`${stage}/${root}`);assert.ok(restored.answers[expected]);assert.equal(restored.completed,false);
  }
  assert.equal(a.flow.personalization(stage,data).trail.length,0);
 }
});

test('a previously visited question is not erased from back history by legacy or manual completion flags',()=>{
 const a=setup(),stage='before-application';let data=a.m.freshPreparation();data=answer(a,stage,data,'first');data=answer(a,stage,data,'done');
 const current=a.flow.personalization(stage,data);assert.equal(current.node,'ask:method');
 data=a.m.setEntry(data,'before-application:first:eligibility',{status:'done',note:'기존 메모'});
 const previous=a.back(a.flow.personalization(stage,data));data={...data,intros:{...data.intros,[stage]:previous}};
 assert.equal(a.flow.personalization(stage,data).node,'ask:eligibility');assert.equal(a.flow.personalization(stage,data).answers['ask:eligibility'],'done');
});

test('medical deadline remains the immediate next and previous question when retracing unchanged preparing answer',()=>{
 const a=setup(),stage='awaiting-result';let data=answer(a,stage,a.m.freshPreparation(),'preparing');assert.equal(a.flow.personalization(stage,data).node,'medical-deadline');
 data=a.flow.savePersonalizationDeadline(stage,data,null);
 for(let index=0;index<2;index++){const p=a.back(a.flow.personalization(stage,data));data={...data,intros:{...data.intros,[stage]:p}};}
 assert.equal(a.flow.personalization(stage,data).node,'opinion');assert.equal(a.flow.personalization(stage,data).answers.opinion,'preparing');
 data=answer(a,stage,data,'preparing');assert.equal(a.flow.personalization(stage,data).node,'medical-deadline');
});
