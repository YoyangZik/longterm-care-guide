const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,NOW}=require('./helpers/records-fixture.cjs');
const {uiFixture,nodes}=require('./helpers/ui-fixture.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('both record methods navigate only after save; failed notification refresh never reports a save failure',async()=>{
 for(const method of ['direct','questions'])for(const failure of ['none','save','notification']){
  const f=fixture(),m=f.load('src/features/records/situation-model.ts');let row=m.chooseType(m.createSituation(method,NOW),'movement');
  row=m.updateSituation(row,{body:'팔을 받쳐드렸어요.',step:'preview'});
  const writes=[],routes=[];const params={draft:row.id};
  const ui=uiFixture({'./ai-controls':{},'../notifications/provider':{useNotifications:()=>({refresh:async()=>{if(failure==='notification')throw new Error('notification error');return true;},offer(){}})},'../start/first-run-test':{useFirstRunTest:()=>({active:false})},'./situation-storage':{listSituations:async()=>[row],subscribeSituations:()=>()=>{},saveSituation:async value=>{if(failure==='save')throw new Error('disk full');writes.push(value);return value;}},'./records-browser':{},'./interview-question':{},'expo-router':{Stack:{Screen:'Screen'},useLocalSearchParams:()=>params,useFocusEffect:fn=>fn(),router:{dismissTo:value=>routes.push(value)}},'@/components/navigation/use-safe-exit':{useSafeExit:()=>({blocked:false,finishSaved:fn=>fn()})}});
  const Screen=ui.load('src/features/records/situation-screen.tsx').default;ui.draw(Screen,{});ui.mount();await tick();
  nodes(ui.draw(Screen,{})).find(n=>n.type==='Action'&&n.props.label==='저장하기').props.onPress();await tick();await tick();
  if(failure==='save'){assert.equal(routes.length,0);assert.equal(writes.length,0);assert.ok(nodes(ui.draw(Screen,{})).some(n=>String(n.props?.children).includes('저장하지 못했어요')));}
  else{assert.equal(writes[0].status,'saved');assert.equal(routes.length,1);assert.equal(routes[0].pathname,'/records-review');assert.equal(routes[0].params.featured,row.id);assert.equal(routes[0].params.notificationWarning,failure==='notification'?'1':undefined);}
 }
});
test('the just-saved older record remains visible above pagination without opening details',()=>{
 const f=fixture(),m=f.load('src/features/records/situation-model.ts');let row=m.chooseType(m.createSituation('direct',NOW),'movement');row=m.confirmSituation(m.updateSituation(row,{body:'본문'}));
 const selected={...row,id:'selected',date:'2025-01-01'},routes=[];
 const ui=uiFixture({'expo-router':{useFocusEffect:()=>{},router:{push:value=>routes.push(value)}}}),{RecordsBrowser}=ui.load('src/features/records/records-browser.tsx');
 const records=[...Array.from({length:25},(_,i)=>({...row,id:'new-'+i,date:'2026-11-04'})),selected];
 const tree=ui.draw(RecordsBrowser,{records,testing:false,mode:'review',day:selected.date,featured:selected.id});
 const cards=nodes(tree).filter(n=>n.type?.name==='RecordCard');assert.equal(cards[0].props.item.id,selected.id);assert.equal(cards.filter(n=>n.props.item.id===selected.id).length,1);assert.equal(routes.length,0);
});
test('reopening the last initial question preserves answers and manual entries; changed branch asks each next question',()=>{
 const f=fixture(),m=f.load('src/features/preparation/model.ts'),flow=f.load('src/features/preparation/personalization.ts'),back=f.load('src/features/preparation/initial-survey-return.ts');
 let data=m.freshPreparation(),progress=flow.personalization('before-application',data),snapshot;
 for(let i=0;i<25&&!progress.completed;i++){
  const choice=flow.choosePersonalization(data,'before-application',progress,progress.node==='experience'?'first':'todo');snapshot=choice.progress;data=choice.data;progress=flow.advancePersonalization('before-application',data,snapshot);data=flow.finishPersonalization(data,'before-application',progress);
 }
 const before=JSON.stringify(data),target={kind:'intro',stage:'before-application',progress:snapshot};data=back.reopenInitialSurvey({...data,completionGuide:'done'},target);
 assert.equal(flow.personalization('before-application',data).node,snapshot.node);assert.deepEqual(data.intros['before-application'].answers,snapshot.answers);assert.equal(data.completionGuide,'done');assert.equal(back.firstSetup(data),false);assert.notEqual(JSON.stringify(data),before);
 const intro=f.load('src/features/preparation/intro-flow.ts');progress=data.intros['before-application'];while(progress.trail.length)progress=intro.previousIntro(progress);
 assert.equal(progress.node,'experience');const changed=flow.choosePersonalization(data,'before-application',progress,'previous');progress=flow.advancePersonalization('before-application',changed.data,changed.progress);assert.equal(progress.node,'purpose');
 const purpose=flow.choosePersonalization(changed.data,'before-application',progress,'renewal');progress=flow.advancePersonalization('before-application',purpose.data,purpose.progress);assert.ok(progress.node.startsWith('ask:'));assert.equal(progress.completed,false);
 const visit=back.reopenInitialSurvey({...m.freshPreparation(),completionGuide:'done'},{kind:'visit',stage:'awaiting-assessment',route:'/visit'});assert.equal(visit.setup['awaiting-assessment'],false);assert.equal(visit.completionGuide,'done');
});
test('app and PDF share paragraph boundaries and hide evidence lists while preserving stored snapshots',()=>{
 const f=fixture(),html=f.load('src/features/records/report-html.ts').reportHTML,p=f.load('src/features/records/report-presentation.ts');
 const text='첫 번째 문단이에요.\r\n다음 줄도 같은 문단이에요.\r\n\r\n두 번째 문단이에요.';
 const paragraphs=p.reportParagraphs(text);assert.deepEqual(paragraphs,['첫 번째 문단이에요.\n다음 줄도 같은 문단이에요.','두 번째 문단이에요.']);
 const sources=[{id:'internal-secret-1',date:'2026-11-03',type:'movement',body:'팔을 받쳐드렸어요. <script>alert(1)</script>'},{id:'internal-secret-2',date:'2026-11-04',type:'daily',body:'혼자 식사하셨어요.'}];
 const report={id:'report',from:'2026-11-03',to:'2026-11-04',createdAt:NOW,records:sources,sections:['전체 돌봄 모습','주요 돌봄 양상','확인 범위'].map(title=>({title,text,recordIds:sources.map(r=>r.id),repeated:false}))},before=JSON.stringify(report),output=html(report);
 assert.equal((output.match(/<h2>근거 기록<\/h2>/g)||[]).length,0);assert.equal((output.match(/href="#record-0"/g)||[]).length,0);assert.equal((output.match(/id="record-0"/g)||[]).length,0);
 assert.ok(!output.includes('internal-secret'));assert.ok(!output.includes('기록 1 · 2026-11-03'));assert.ok(!output.includes(sources[0].body));assert.ok(html({...report,sections:[{...report.sections[0],text:'내용 <script>'}]}).includes('&lt;script&gt;'));assert.ok(output.includes('<p>'+paragraphs[1]+'</p>'));
 const ui=uiFixture(),{ReportContent}=ui.load('src/features/records/report-content.tsx');const tree=ui.draw(ReportContent,{report,rows:[]});
 for(const paragraph of paragraphs)assert.ok(nodes(tree).some(n=>n.props?.children===paragraph));
 assert.ok(!nodes(tree).some(n=>n.type==='Action'));assert.ok(!nodes(tree).some(n=>String(n.props?.children).includes('근거 기록')));
 assert.ok(!nodes(tree).some(n=>n.props?.children===sources[0].body));assert.equal(JSON.stringify(report),before);
});
test('progress UI describes only supplied lifecycle stages, with indeterminate progress and no invented percent',()=>{
 const ui=uiFixture(),{ReportProgress}=ui.load('src/features/records/report-progress.tsx');
 for(const phase of ['checking','waiting','saving','complete']){
  const tree=ui.draw(ReportProgress,{phase}),all=nodes(tree);assert.equal(tree.props.accessibilityRole,phase==='complete'?'summary':'progressbar');assert.equal(tree.props.accessibilityValue,undefined);
  assert.ok(!all.some(n=>typeof n.props?.children==='string'&&n.props.children.includes('%')));
  assert.equal(all.some(n=>n.type==='ActivityIndicator'),phase!=='complete');
  if(phase==='waiting')assert.ok(all.some(n=>String(n.props?.children).includes('응답 전에는 작성 진행 정도를 알 수 없어요')));
 }
});
test('first home returns to its captured last question and clears the offer when home loses focus',async()=>{
 const f=fixture(),model=f.load('src/features/preparation/model.ts'),flow=f.load('src/features/preparation/personalization.ts');
 const stage='before-application',base={...model.freshPreparation(),purpose:'first',completionGuide:'done'},progress={version:2,node:'ask:documents',answers:{experience:'first','ask:documents':'todo'},trail:['experience'],completed:false,scope:'before-application:first'};
 const p={data:{...base,setup:{[stage]:true},recordIntroduced:{[stage]:true},intros:{[stage]:{...progress,completed:true}}},loaded:true,surveyReturn:{kind:'intro',stage,progress},update:async change=>{p.data=change(p.data);},clearSurveyReturn:()=>{p.surveyReturn=null;}};
 const routes=[],focus=[];
 const ui=uiFixture({'../start/provider':{useStart:()=>({stage,guidance:{seen:{[stage]:true},visit:{date:null}},setStage:async()=>{},updateGuidance:async()=>{}})},'../start/first-run-test':{useFirstRunTest:()=>({active:false})},'../preparation/provider':{usePreparation:()=>p},'../preparation/checklist':{PreparationChecklist:'PreparationChecklist'},'./stage-completion-card':{},'../medical/ui':{},'../preparation/status':{allCorePrepared:()=>false,nextStage:{}},'../records/ui':{Action:'Action'},'expo-router':{router:{push:path=>routes.push(path)},useFocusEffect:fn=>focus.push(fn)},'@/components/navigation/use-safe-exit':{useSafeExit:options=>({blocked:false,request:async()=>{await options.save();options.leave();}})}});
 const Home=ui.load('src/features/home/home-screen.tsx').default;
 let tree=ui.draw(Home,{});const blur=focus.at(-1)();
 const action=nodes(tree).find(n=>n.type==='Action'&&n.props.label==='이전 질문으로 돌아가기');assert.ok(action);action.props.onPress();await tick();
 assert.deepEqual(routes,['/guide']);assert.equal(flow.personalization(stage,p.data).node,'ask:documents');assert.deepEqual(p.data.intros[stage].answers,progress.answers);assert.equal(p.data.completionGuide,'done');
 blur();tree=ui.draw(Home,{});assert.ok(!nodes(tree).some(n=>n.type==='Action'&&n.props.label==='이전 질문으로 돌아가기'));
});
