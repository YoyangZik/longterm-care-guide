const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./helpers/records-fixture.cjs');
const {uiFixture,nodes}=require('./helpers/ui-fixture.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('checklist labels distinguish no answer, explicit incomplete, uncertain history and completion without rewriting entries',()=>{
 const f=fixture(),{checklistPresentation:show}=f.load('src/features/preparation/checklist-presentation.ts');
 const entry=status=>({status,note:'가상 메모',updatedAt:'2026-11-05T00:00:00Z'});
 assert.equal(show('documents').label,'선택 전');
 const old=entry('unknown'),snapshot=JSON.stringify(old);
 assert.equal(show('documents',old).label,'확인 필요');assert.equal(JSON.stringify(old),snapshot);
 assert.equal(show('documents',entry('todo')).label,'아직이에요');
 assert.equal(show('documents',entry('done')).label,'준비했어요');
 assert.equal(show('method',entry('done')).label,'확인했어요');
 assert.equal(show('requested',entry('na')).label,'준비물 없음');
 const {answerOptions}=f.load('src/features/preparation/answer-options.ts');
 assert.equal(answerOptions('documents','before-application').todo,'아직 준비를 마치지 않았어요');
 assert.equal(answerOptions('method','before-application').unknown,undefined);
 assert.ok(answerOptions('eligibility','before-application').unknown);
});

test('checklist edits require explicit save; back/cancel never commits, failed saves retain selection',async()=>{
 const f=fixture(),m=f.load('src/features/preparation/model.ts');const key='before-application:first:documents';
 let fail=false,writes=0,leaves=0,exitOptions;
 const p={loaded:true,data:m.setEntry({...m.freshPreparation(),purpose:'first'},key,{status:'done'}),update:async fn=>{if(fail)throw new Error('disk full');p.data=fn(p.data);writes++;}};
 const ui=uiFixture({'../records/ui':{Action:'Action'},'@/features/preparation/provider':{usePreparation:()=>p},'./provider':{usePreparation:()=>p},'../start/provider':{useStart:()=>({stage:'before-application'})},'@/components/official-source-links':{OfficialSourceLinks:'Sources'},'@/components/selection-row':{SelectionGroup:'SelectionGroup',SelectionRow:'SelectionRow'},'expo-router':{Stack:{Screen:'Screen'},useLocalSearchParams:()=>({item:'documents'}),router:{canGoBack:()=>true,back:()=>leaves++}},'@/components/navigation/use-safe-exit':{useSafeExit:o=>{exitOptions=o;return {blocked:false,finishSaved:fn=>fn()};}}});
 const Outer=ui.load('src/features/preparation/detail-screen.tsx').default,Detail=ui.draw(Outer,{}).type;
 const draw=()=>nodes(ui.draw(Detail,{}));
 draw().find(n=>n.type==='Action'&&n.props.label==='다시 변경하기').props.onPress();
 draw().find(n=>n.type==='SelectionRow'&&n.props.label==='아직 준비를 마치지 않았어요').props.onPress();
 draw();assert.equal(exitOptions.blockedBy(),true);assert.equal(writes,0);assert.equal(p.data.entries[key].status,'done');
 let dialog=draw().find(n=>n.type==='InfoDialog'&&n.props.title.includes('저장하지 않고'));
 assert.equal(dialog.props.visible,true);dialog.props.actions.find(a=>a.label==='계속 수정하기').onPress();assert.equal(leaves,0);
 fail=true;draw().find(n=>n.type==='Action'&&n.props.label==='변경 저장').props.onPress();await tick();
 assert.equal(p.data.entries[key].status,'done');assert.equal(draw().find(n=>n.type==='SelectionRow'&&n.props.label==='아직 준비를 마치지 않았어요').props.selected,true);
 fail=false;draw().find(n=>n.type==='Action'&&n.props.label==='변경 저장').props.onPress();await tick();
 assert.equal(writes,1);assert.equal(p.data.entries[key].status,'todo');assert.equal(leaves,1);
});

test('visit question back moves one position, explicit exit preserves resume position and completed history',async()=>{
 let exitOptions,leaves=0;const p={loaded:true,data:{visitWalkthrough:{position:'support',completed:true}},update:async fn=>{p.data=fn(p.data);}};
 const ui=uiFixture({'../preparation/provider':{usePreparation:()=>p},'expo-router':{Stack:{Screen:'Screen'},router:{canGoBack:()=>true,back:()=>leaves++}},'@/components/navigation/use-safe-exit':{useSafeExit:o=>{exitOptions=o;return {blocked:false,finishSaved:fn=>fn()};}},'../records/ui':{Action:'Action'}});
 const Screen=ui.load('src/features/visit-walkthrough/screen.tsx').VisitWalkthroughScreen;
 const Inner=ui.draw(Screen,{}).type,draw=()=>nodes(ui.draw(Inner,{}));
 draw();await exitOptions.save();exitOptions.leave();assert.equal(p.data.visitWalkthrough.position,'day');assert.equal(p.data.visitWalkthrough.completed,true);assert.equal(leaves,0);
 draw().find(n=>n.type==='Action'&&n.props.label==='나가기').props.onPress();assert.equal(leaves,1);assert.equal(p.data.visitWalkthrough.position,'day');
 draw();await exitOptions.save();exitOptions.leave();assert.equal(p.data.visitWalkthrough.position,'intro');assert.equal(leaves,1);
 draw();await exitOptions.save();exitOptions.leave();assert.equal(leaves,2);
});

test('report completion belongs to selected output and clears when returning to list or changing period',async()=>{
 let calls=0;const report={id:'virtual',from:'2026-10-30',to:'2026-11-05',createdAt:'2026-11-05T00:00:00Z',records:[],sections:[]};
 const state={rows:[],library:{reports:[],invalidCount:0},agreed:true,registered:true};
 const ui=uiFixture({'./time':{localDate:()=> '2026-11-05'},'./report-pdf':{},'./report-readiness':{emptyReportState:state,loadReportState:async()=>state,reportReadiness:()=>({canGenerate:true,issues:[],readFailed:false})},'./ai-client':{serverURL:'https://relay.example',subscribeAISettings:()=>()=>{},generateReport:async(_f,_t,progress)=>{calls++;progress('complete');return report;}},'./situation-storage':{subscribeSituations:()=>()=>{}},'./report-progress':{ReportProgress:'ReportProgress'},'./report-content':{ReportContent:'ReportContent'}});
 const Screen=ui.load('src/features/records/reports-screen.tsx').default,draw=()=>nodes(ui.draw(Screen,{}));
 draw();const cleanups=ui.mount();try{await tick();draw().find(n=>n.type==='Action'&&n.props.label==='AI 보고서 생성').props.onPress();await tick();assert.ok(draw().some(n=>n.type==='ReportProgress'&&n.props.phase==='complete'));
 draw().find(n=>n.type==='Action'&&n.props.label==='보고서 목록으로').props.onPress();assert.ok(!draw().some(n=>n.type==='ReportProgress'));
 draw().find(n=>n.props.accessibilityLabel==='최근 90일').props.onPress();assert.ok(!draw().some(n=>n.type==='ReportProgress'));assert.equal(calls,1);
 }finally{cleanups.forEach(fn=>fn?.());}
});

test('readable PDF names contain period and creation time, no IDs and deterministic collision suffixes',()=>{
 const {pdfFilename}=fixture().load('src/features/records/pdf-filename.ts');const now=new Date(2026,10,5,1,30,45);
 assert.equal(pdfFilename('2026-08-08','2026-11-05',now),'돌봄기록_종합보고서_20260808-20261105_생성20261105_013045.pdf');
 assert.match(pdfFilename('2026-08-08','2026-11-05',now,2),/_013045_2\.pdf$/);
});

test('editing a saved care record prompts before discarding and preserves the saved original',async()=>{
 const f=fixture(),m=f.load('src/features/records/situation-model.ts');let old=m.chooseType(m.createSituation('direct','2026-11-05T00:00:00Z'),'movement');old=m.confirmSituation(m.updateSituation(old,{body:'팔을 받쳐드렸어요.'}));let options,writes=0;
 const ui=uiFixture({'./ai-controls':{},'./interview-question':{},'./records-browser':{},'../notifications/provider':{useNotifications:()=>({refresh:async()=>true,offer(){}})},'../start/first-run-test':{useFirstRunTest:()=>({active:false})},'./situation-storage':{listSituations:async()=>[old],subscribeSituations:()=>()=>{},saveSituation:async value=>{writes++;return value;}},'expo-router':{Stack:{Screen:'Screen'},useLocalSearchParams:()=>({view:old.id}),useFocusEffect:fn=>fn(),router:{}},'@/components/navigation/use-safe-exit':{useSafeExit:o=>{options=o;return {blocked:false,discard:()=>o.leave(),finishSaved:fn=>fn()};}}});
 const Screen=ui.load('src/features/records/situation-screen.tsx').default,draw=()=>nodes(ui.draw(Screen,{}));draw();ui.mount();await tick();
 draw().find(n=>n.type==='Action'&&n.props.label==='수정하기').props.onPress();
 const input=draw().find(n=>typeof n.type==='function'&&n.type.name==='BodyInput');input.props.onChange('가상 수정 내용이에요.');draw();
 assert.equal(options.blockedBy(),true);assert.equal(writes,0);
 const dialog=draw().find(n=>n.type==='InfoDialog'&&n.props.title.includes('저장하지 않고'));assert.equal(dialog.props.visible,true);
 dialog.props.actions.find(a=>a.label==='저장하지 않고 나가기').onPress();
 assert.ok(draw().some(n=>n.props?.children===old.body));assert.equal(writes,0);assert.equal(old.body,'팔을 받쳐드렸어요.');
});

test('PDF export does not overwrite existing files, hides internal paths and treats picker cancellation as cancellation',async()=>{
 let cancel=false,copied,deleted=0;const dir={uri:'content://virtual-folder'};
 class Directory{static async pickDirectoryAsync(){if(cancel)throw new Error('User cancelled');return dir;}}
 class File{constructor(...parts){this.uri=parts.map(p=>p.uri??p).join('/');this.name=this.uri.split('/').at(-1);}get exists(){return this.uri.endsWith('.pdf')&&!this.uri.endsWith('_1.pdf');}async copy(out,opts){assert.equal(opts.overwrite,false);copied=out.uri;}delete(){deleted++;}}
 const ui=uiFixture({'react-native':{Platform:{OS:'android'}},'expo-file-system':{Directory,File,Paths:{}},'expo-print':{printToFileAsync:async()=>({uri:'file://cache/virtual.pdf'})},'expo-sharing':{}});
 const {exportReport}=ui.load('src/features/records/report-pdf.ts');const p={id:'internal-secret-id',from:'2026-08-08',to:'2026-11-05',createdAt:'2026-11-05T00:00:00Z',records:[],sections:[]};
 const result=await exportReport(p,'save');assert.match(copied,/_1\.pdf$/);assert.ok(!copied.includes(p.id));assert.ok(!result.includes('content://'));assert.equal(deleted,1);
 cancel=true;copied=null;assert.match(await exportReport(p,'save'),/취소/);assert.equal(copied,null);assert.equal(deleted,2);
});
