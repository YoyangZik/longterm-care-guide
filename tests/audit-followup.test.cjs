const test=require('node:test'),assert=require('node:assert/strict');
const {uiFixture,nodes}=require('./helpers/ui-fixture.cjs');
const {fixture}=require('./helpers/records-fixture.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('record introduction confirms into checklist home once, never directly opens recording, and preserves failure state',async()=>{
 for(const fail of [false,true]){
  const f=fixture(),m=f.load('src/features/preparation/model.ts');let hints=0;const routes=[];
  const p={loaded:true,data:{...m.freshPreparation(),completionGuide:'records'},showRecordHint:()=>hints++,update:async change=>{if(fail)throw new Error('disk full');p.data=change(p.data);}};
  const ui=uiFixture({'./provider':{usePreparation:()=>p},'../records/ui':{Action:'Action'},'expo-router':{Stack:{Screen:'Screen'},Redirect:'Redirect',usePreventRemove:()=>()=>{},router:{canDismiss:()=>false,replace:r=>routes.push(r)}}});
  const Root=ui.load('src/features/preparation/completion-screen.tsx').CompletionGuideScreen;
  const inner=ui.draw(Root,{});let tree=ui.draw(inner.type,{});
  const action=nodes(tree).find(n=>n.type==='Action'&&n.props.label==='확인했어요');assert.ok(action);action.props.onPress();await tick();
  if(fail){assert.deepEqual(routes,[]);assert.equal(hints,0);assert.equal(p.data.completionGuide,'records');}
  else{assert.deepEqual(routes,['/home']);assert.equal(hints,1);assert.equal(p.data.completionGuide,'done');tree=ui.draw(inner.type,{});assert.ok(!nodes(tree).some(n=>n.props?.label==='확인했어요'));}
 }
});

test('failed report generation presents a visible failure dialog and never retries automatically',async()=>{
 const message='AI 보고서에 근거 기록에 없는 횟수나 수치가 추가됐어요.';let calls=0;
 const state={rows:[{id:'virtual',date:'2026-11-04',status:'saved'}],library:{reports:[],invalidCount:0},agreed:true,registered:true};
 const ui=uiFixture({'./time':{localDate:()=> '2026-11-04'},'./report-pdf':{},'./report-readiness':{emptyReportState:state,loadReportState:async()=>state,reportReadiness:()=>({canGenerate:true,issues:[],readFailed:false})},'./ai-client':{serverURL:'https://relay.example',subscribeAISettings:()=>()=>{},generateReport:async(_from,_to,progress)=>{calls++;progress('waiting');throw new Error(message);}},'./situation-storage':{subscribeSituations:()=>()=>{}}});
 const Screen=ui.load('src/features/records/reports-screen.tsx').default;const draw=()=>nodes(ui.draw(Screen,{}));
 draw();const cleanup=ui.mount();try{await tick();draw().find(n=>n.type==='Action'&&n.props.label==='AI 보고서 생성').props.onPress();await tick();
  const dialog=draw().find(n=>n.type==='InfoDialog'&&n.props.title==='보고서를 만들지 못했어요');assert.equal(dialog.props.visible,true);assert.ok(nodes(dialog).some(n=>n.props?.children===message));await tick();assert.equal(calls,1);
 }finally{cleanup.forEach(fn=>fn?.());}
});

test('summary action reflects persisted consent and code independently, refreshes changes, and recovers read failure',async()=>{
 let agreed=true,registered=true,failed=false,changed;
 const row={id:'dummy',aiSummary:undefined};
 const ui=uiFixture({'./ai-client':{serverURL:'https://relay.example',hasConsent:async()=>agreed,hasAccessCode:async()=>{if(failed)throw new Error('locked');return registered;},subscribeAISettings:fn=>{changed=fn;return()=>{};}},'./situation-storage':{listSituations:async()=>[row],subscribeSituations:()=>()=>{}}});
 const Screen=ui.load('src/features/records/ai-controls.tsx').AIRecordSummary;
 const draw=()=>nodes(ui.draw(Screen,{record:row}));const action=()=>draw().find(n=>n.type==='Action'&&n.props.label==='요약 만들기');
 draw();ui.mount();await tick();assert.equal(action().props.disabled,false);
 registered=false;changed();await tick();assert.equal(action().props.disabled,true);assert.ok(draw().some(n=>String(n.props?.children).includes('저장된 접근 코드가 없어')));
 registered=true;agreed=false;changed();await tick();assert.equal(action().props.disabled,true);assert.ok(draw().some(n=>String(n.props?.children).includes('동의하지 않아')));
 agreed=true;failed=true;changed();await tick();assert.equal(action().props.disabled,true);
 failed=false;draw().find(n=>n.type==='Action'&&n.props.label==='AI 이용 상태 다시 확인').props.onPress();await tick();assert.equal(action().props.disabled,false);
});

test('ninety records are replaced page by page, without duplicates or losses; deletion clamps the last page',()=>{
 const f=fixture(),{recordPage}=f.load('src/features/records/pagination.ts');
 const records=Array.from({length:90},(_,id)=>({id}));const restored=[];
 for(let page=0;page<9;page++){const result=recordPage(records,page);assert.equal(result.items.length,10);assert.equal(result.pages,9);restored.push(...result.items);}
 assert.deepEqual(restored,records);assert.equal(new Set(restored.map(r=>r.id)).size,90);
 assert.deepEqual(recordPage(records.slice(0,11),8).items,[records[10]]);assert.equal(recordPage([],8).page,0);
});

test('native daily trigger is recurring and does not embed care contents or an expiring date',async()=>{
 const calls=[];
 const ui=uiFixture({'expo-notifications':{SchedulableTriggerInputTypes:{DAILY:'daily',DATE:'date'},scheduleNotificationAsync:async x=>calls.push(x)}});
 const native=ui.load('src/features/notifications/native.ts');
 await native.schedule({id:'care-diary-local-v1:care:daily:20:30',kind:'care',day:'2030-01-10',at:new Date(2030,0,10,20,30).getTime(),repeat:'daily'});
 assert.deepEqual(calls[0].trigger,{type:'daily',hour:20,minute:30,channelId:'care-reminders',delivery:'bestEffort'});
 assert.equal(calls[0].content.data.day,null);
});

test('private reset removes only the access credential and app-owned reports directory, and propagates failure',async()=>{
 let exists=true,fail=false;const deleted=[],keys=[];
 class Directory{constructor(root,name){assert.equal(root,'app-documents');assert.equal(name,'reports');}get exists(){return exists;}delete(){if(fail)throw new Error('file locked');deleted.push('reports');exists=false;}}
 const ui=uiFixture({'expo-file-system':{Directory,Paths:{document:'app-documents'}},'../records/ai-credentials':{clearCode:async key=>keys.push(key)}});
 const {clearPrivateAssets}=ui.load('src/features/reset/private-assets.ts');
 await clearPrivateAssets();await clearPrivateAssets();assert.deepEqual(deleted,['reports']);assert.deepEqual(keys,['care-diary-ai-access','care-diary-ai-access']);
 exists=true;fail=true;await assert.rejects(clearPrivateAssets(),/file locked/);
});

test('failed private cleanup leaves reset journal for next launch and waits for in-flight PDF work',async()=>{
 const f=fixture(),values=f.values,gate=f.load('src/features/reset/gate.ts');
 const storage={getItem:async k=>values.get(k)??null,setItem:async(k,v)=>values.set(k,v),getAllKeys:async()=>[...values.keys()],removeItem:async k=>values.delete(k),multiRemove:async keys=>keys.forEach(k=>values.delete(k))};
 const {createResetController,resetJournalKey}=f.load('src/features/reset/controller.ts');
 let complete,fail=true,cleaned=false;const pdf=gate.dataTask(()=>new Promise(resolve=>{complete=resolve;}));await tick();
 values.set('care-diary:record','original');const controller=createResetController(storage,async()=>{},async()=>{cleaned=true;if(fail)throw new Error('locked');});
 const reset=controller.reset();await tick();assert.equal(cleaned,false);complete();await pdf;await assert.rejects(reset,/locked/);assert.equal(values.get(resetJournalKey),'pending');assert.equal(values.get('care-diary:record'),'original');
 fail=false;assert.equal(await controller.recover(),true);assert.equal(values.size,0);
});
