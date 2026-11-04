const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
function fixture(values=new Map(),extra={}){
 const cache=new Map();let fetches=[];let transport=async()=>({summary:'팔과 등을 받쳐드림'});let storedCode='a'.repeat(64);
 const storage={getItem:async k=>values.get(k)??null,setItem:async(k,v)=>values.set(k,v)};
 const fetch=async(url,options)=>{fetches.push({url,options});const result=await transport(url,options);return typeof result?.ok==='boolean'?result:{ok:true,json:async()=>result};};
 function load(file){file=path.resolve(__dirname,'..',file);if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const requireLocal=id=>{const local=path.resolve(path.dirname(file),id);return Object.hasOwn(extra,id)?extra[id]:id==='@react-native-async-storage/async-storage'?storage:id==='expo-secure-store'?{getItemAsync:async()=>storedCode,setItemAsync:async(k,v)=>{storedCode=v;},deleteItemAsync:async()=>{storedCode=null;}}:load(path.relative(path.resolve(__dirname,'..'),local+(fs.existsSync(local+'.ts')?'.ts':'.tsx')));};
  new Function('require','module','exports','fetch','process',source)(requireLocal,mod,mod.exports,fetch,{env:{EXPO_PUBLIC_AI_SERVER_URL:'https://relay.example'}});cache.set(file,mod.exports);return mod.exports;
 }
 const s=load('src/features/records/situation-storage.ts'),m=load('src/features/records/situation-model.ts'),ai=load('src/features/records/ai-client.ts'),model=load('src/features/records/ai-model.ts');
 function record(body='몸이 기울어 팔과 등을 받쳤다.',date='2026-11-04'){let r=m.chooseType(m.createSituation('direct',date+'T03:00:00.000Z'),'movement');r=m.updateSituation(r,{body});return m.confirmSituation(r);}
 return {s,m,ai,model,values,record,load,fetches,getStoredCode:()=>storedCode,setTransport(fn){transport=fn;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('report progress follows network and durable storage, with no premature completion or extra request for saved output',async()=>{
 const values=new Map();let finishSave;
 const f=fixture(values,{'@react-native-async-storage/async-storage':{getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{if(key==='care-diary:ai-reports:v1')await new Promise(resolve=>{finishSave=resolve;});values.set(key,value);}}});
 const row=f.record();await f.s.saveSituation(row);await tick();await f.ai.consent(true);
 let respond;const phases=[];f.setTransport(async()=>new Promise(resolve=>{respond=resolve;}));
 const pending=f.ai.generateReport(row.date,row.date,phase=>phases.push(phase));await until(()=>respond);assert.deepEqual(phases,['checking','waiting']);
 respond({sections:[{title:'전체 돌봄 모습',text:'팔을 받쳐드렸어요.',recordIds:[row.id],repeated:false}]});await until(()=>finishSave);
 assert.deepEqual(phases,['checking','waiting','saving']);assert.equal(values.has('care-diary:ai-reports:v1'),false);
 finishSave();const report=await pending;assert.deepEqual(phases,['checking','waiting','saving','complete']);assert.equal((await f.ai.listReports())[0].id,report.id);
 const cached=[];await f.ai.generateReport(row.date,row.date,phase=>cached.push(phase));assert.deepEqual(cached,['checking','complete']);assert.equal(f.fetches.length,1);
});
test('report preflight, timeout, and evidence failures never report completion or store partial results',async()=>{
 for(const failure of ['consent','timeout','evidence']){
  const f=fixture(),row=f.record();await f.s.saveSituation(row);await tick();if(failure!=='consent')await f.ai.consent(true);
  f.setTransport(async()=>{if(failure==='timeout')throw Object.assign(new Error('timeout'),{name:'AbortError'});return {sections:[{title:'본문',text:'본문',recordIds:['unknown'],repeated:false}]};});
  const phases=[];await assert.rejects(f.ai.generateReport(row.date,row.date,phase=>phases.push(phase)));
  assert.deepEqual(phases,failure==='consent'?['checking']:failure==='timeout'?['checking','waiting']:['checking','waiting','saving']);assert.deepEqual(await f.ai.listReports(),[]);assert.equal((await f.s.listSituations())[0].body,row.body);
 }
});
test('invalid stored reports stay untouched while valid reports remain readable, creatable and deletable',async()=>{
 const f=fixture(),row=f.record();await f.s.saveSituation(row);await tick();await f.ai.consent(true);
 const good={id:'good',from:row.date,to:row.date,createdAt:new Date().toISOString(),records:[f.model.evidence(row)],sections:[{title:'전체 돌봄 모습',text:'팔과 등을 받쳐드렸어요.',recordIds:[row.id],repeated:false}]};
 const bad={...good,id:'bad',sections:[{...good.sections[0],recordIds:['unknown']}]};
 const entries=[bad,null,{...good,from:'invalid'},good],raw=JSON.stringify(entries);f.values.set('care-diary:ai-reports:v1',raw);
 const library=await f.ai.readReportLibrary();assert.equal(library.invalidCount,3);assert.deepEqual(library.reports,[good]);assert.equal(f.values.get('care-diary:ai-reports:v1'),raw);
 f.setTransport(async()=>({sections:good.sections}));const created=await f.ai.generateReport('2026-10-29',row.date);
 assert.deepEqual(JSON.parse(f.values.get('care-diary:ai-reports:v1')),[created,...entries]);
 await f.ai.deleteReport('good');assert.deepEqual(JSON.parse(f.values.get('care-diary:ai-reports:v1')),[created,...entries.slice(0,3)]);
 assert.equal((await f.ai.readReportLibrary()).invalidCount,3);assert.equal(await f.ai.hasConsent(),true);assert.equal((await f.s.listSituations())[0].body,row.body);
});
test('unreadable report containers cannot be overwritten or trigger an AI request',async()=>{
 for(const raw of ['', '{broken','{}','null']){
  const f=fixture();f.values.set('care-diary:ai-reports:v1',raw);await f.ai.consent(true);
  await assert.rejects(f.ai.generateReport('2026-10-29','2026-11-04'),/보고서 목록/);
  await assert.rejects(f.ai.deleteReport('any'),/보고서 목록/);
  assert.equal(f.values.get('care-diary:ai-reports:v1'),raw);assert.equal(f.fetches.length,0);
 }
});
test('mocked native restart restores consent, credential and records without an AI call; missing web code is explained',async()=>{
 const codes=new Map(),secureStore={getItemAsync:async key=>codes.get(key)??null,setItemAsync:async(key,value)=>{codes.set(key,value);},deleteItemAsync:async key=>{codes.delete(key);}};
 const values=new Map(),extra={'expo-secure-store':secureStore},f=fixture(values,extra),row=f.record();await f.s.saveSituation(row);await tick();await f.ai.consent(true);
 f.setTransport(async()=>({valid:true}));await f.ai.setAccessCode('b'.repeat(64));
 const restart=fixture(values,extra),{loadReportState,reportReadiness}=restart.load('src/features/records/report-readiness.ts');
 const state=await loadReportState();assert.equal(state.agreed,true);assert.equal(state.registered,true);assert.equal(state.rows[0].body,row.body);
 assert.equal(reportReadiness(state,1,'https://relay.example',false).canGenerate,true);assert.equal(restart.fetches.length,0);
 await restart.ai.deleteAccessCode();const missing=await loadReportState();assert.equal(missing.agreed,true);assert.equal(missing.registered,false);
 assert.match(reportReadiness(missing,1,'https://relay.example',true).issues.join(' '),/새로고침.*다시 등록/);
 // Browser storage is deliberately not used for credentials; a new module has no code.
 const web=f.load('src/features/records/ai-credentials.web.ts');await web.setCode('key','a'.repeat(64));assert.ok(await web.getCode('key'));
 assert.equal(await restart.load('src/features/records/ai-credentials.web.ts').getCode('key'),null);
});
test('each report screen read fails independently without resetting other restored state',async()=>{
 for(const failure of ['records','library','consent','access']){
  const fail=async name=>{if(name===failure)throw new Error('unavailable');};
  const f=fixture(new Map(),{'./ai-client':{hasConsent:async()=>{await fail('consent');return true;},hasAccessCode:async()=>{await fail('access');return true;},readReportLibrary:async()=>{await fail('library');return {reports:[],invalidCount:0};}},'./situation-storage':{listSituations:async()=>{await fail('records');return [];}}});
  const {loadReportState,reportReadiness}=f.load('src/features/records/report-readiness.ts'),state=await loadReportState();
  assert.equal(state.agreed,failure==='consent'?null:true);assert.equal(state.registered,failure==='access'?null:true);
  assert.equal(state.rows===null,failure==='records');assert.equal(state.library===null,failure==='library');
  const readiness=reportReadiness(state,1,'https://relay.example',false);assert.equal(readiness.canGenerate,false);assert.equal(readiness.readFailed,true);assert.equal(readiness.issues.length,1);
 }
});
test('report screen keeps saved reports usable during read failures and ignores older reload completions',async()=>{
 const slots=[],focus=[],requests=[];let cursor=0,mounted=false,settingsChanged,appChanged;
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useCallback:fn=>fn,useEffect:()=>{}};
 const jsx=(type,props)=>({type,props});
 const f=fixture(new Map(),{'react':react,'react/jsx-runtime':{jsx,jsxs:jsx},'expo-router':{useFocusEffect:fn=>{if(!mounted)focus.push(fn);},Stack:{Screen:'Screen'},router:{}},'react-native':{AppState:{addEventListener:(_name,fn)=>{appChanged=fn;return {remove(){}};}},Platform:{OS:'ios'},Text:'Text',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',KeyboardAvoidingView:'KeyboardAvoidingView'},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'@/components/navigation/app-header':{AppHeader:'AppHeader'},'@/components/navigation/overflow-menu':{InfoDialog:'InfoDialog'},'@/design/styles':{colors:{},styles:{}},'./ui':{Action:'Action'},'./ai-client':{serverURL:'https://relay.example',subscribeAISettings:fn=>{settingsChanged=fn;return ()=>{};}},'./situation-storage':{subscribeSituations:()=>()=>{}},'./report-pdf':{},'./time':{localDate:()=> '2026-11-04'},'./report-content':{ReportContent:'ReportContent'}});
 const readiness=f.load('src/features/records/report-readiness.ts');readiness.loadReportState=()=>new Promise(resolve=>requests.push(resolve));
 const Screen=f.load('src/features/records/reports-screen.tsx').default;
 const draw=()=>{cursor=0;return Screen();};
 function nodes(node,result=[]){if(Array.isArray(node)){node.forEach(n=>nodes(n,result));return result;}if(!node||typeof node!=='object')return result;result.push(node);nodes(node.props?.children,result);return result;}
 const actions=()=>nodes(draw()).filter(n=>n.type==='Action');
 draw();const cleanups=focus.map(fn=>fn());mounted=true;
 const row=f.record(),range=f.load('src/features/records/situation-query.ts').reviewRange(7,'2026-11-04'),report={id:'saved',...range,createdAt:new Date().toISOString(),records:[f.model.evidence(row)],sections:[{title:'전체 돌봄 모습',text:'도움이 기록됐어요.',recordIds:[row.id],repeated:false}]};
 requests.shift()({rows:null,library:{reports:[report],invalidCount:1},agreed:null,registered:null});await tick();
 assert.equal(actions().find(n=>n.props.label==='이 기간의 저장된 보고서 보기').props.disabled,false);
 assert.equal(actions().find(n=>n.props.label==='저장된 보고서 열기').props.disabled,false);
 assert.ok(actions().find(n=>n.props.label==='다시 불러오기'));
 settingsChanged();const older=requests.shift();appChanged('active');const newer=requests.shift();
 newer({rows:[row],library:{reports:[],invalidCount:0},agreed:true,registered:true});await tick();
 assert.equal(actions().find(n=>n.props.label==='AI 보고서 생성').props.disabled,false);
 older({rows:null,library:null,agreed:false,registered:false});await tick();
 assert.equal(actions().find(n=>n.props.label==='AI 보고서 생성').props.disabled,false);
 cleanups.forEach(fn=>fn?.());
});
test('7/30/90 day reports send full originals, preserve evidence after restart and reuse saved output',async()=>{
 for(const period of [7,30,90]){
  const f=fixture(),q=f.load('src/features/records/situation-query.ts'),range=q.reviewRange(period,'2026-11-04');
  for(let index=0;index<period;index++){
   const date=new Date(range.from+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+index);
   await f.s.saveSituation(f.record('일어설 때 팔과 등을 받쳐드렸어요.',date.toISOString().slice(0,10)));
  }
  await tick();await f.ai.consent(true);
  f.setTransport(async(url,options)=>{const input=JSON.parse(options.body);assert.equal(input.records.length,period);return {sections:[{title:'전체 돌봄 모습',text:'일어설 때 팔과 등을 받쳐드렸어요.\n\n기록에 적힌 상황을 정리했어요.',recordIds:input.records.map(r=>r.id),repeated:false}]};});
  const report=await f.ai.generateReport(range.from,range.to);assert.equal(report.records.length,period);assert.equal(f.fetches.length,1);
  const restart=fixture(f.values);assert.deepEqual(await restart.ai.generateReport(range.from,range.to),report);assert.equal(restart.fetches.length,0);
 }
});
test('AI settings renders all consent/code states using actual stored credentials; deletion and withdrawal preserve care data',async()=>{
 const slots=[],focus=[];let cursor=0,mounted=false;
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useCallback:fn=>fn,useEffect:()=>{}};
 const jsx=(type,props)=>({type,props});
 const f=fixture(new Map(),{'react':react,'react/jsx-runtime':{jsx,jsxs:jsx},'expo-router':{useFocusEffect:fn=>{if(!mounted)focus.push(fn);}},'react-native':{Keyboard:{dismiss(){}},Text:'Text',TextInput:'TextInput',View:'View'},'@/design/styles':{colors:{green:'green',ink:'black'},styles:{}},'@/components/navigation/overflow-menu':{InfoDialog:'InfoDialog'},'./ui':{Action:'Action'}});
 await f.s.saveSituation(f.record());await tick();f.values.set('care-diary:ai-reports:v1','preserved report bytes');f.values.set('care-diary:notifications:v1','preserved notification bytes');
 const original=new Map(f.values);await f.ai.deleteAccessCode();
 const {AIConsent}=f.load('src/features/records/ai-controls.tsx');const draw=()=>{cursor=0;return AIConsent();};draw();const cleanups=focus.map(fn=>fn());mounted=true;await tick();
 function nodes(node,result=[]){if(Array.isArray(node)){node.forEach(n=>nodes(n,result));return result;}if(!node||typeof node!=='object')return result;if(node.type==='InfoDialog'&&!node.props.visible)return result;result.push(node);nodes(node.props?.children,result);return result;}
 const actions=()=>nodes(draw()).filter(n=>n.type==='Action');const labels=()=>actions().map(n=>n.props.label);const inputs=()=>nodes(draw()).filter(n=>n.type==='TextInput');
 const settle=async()=>{await tick();await tick();};const press=async label=>{const action=actions().find(n=>n.props.label===label);assert.ok(action,label);assert.equal(!!action.props.disabled,false);action.props.onPress();await settle();};
 assert.equal(inputs().length,0);assert.ok(labels().includes('AI 이용 안내와 전송 동의'));
 await press('AI 이용 안내와 전송 동의');const dialog=nodes(draw()).find(n=>n.type==='InfoDialog'&&n.props.title==='돌봄기록을 AI로 정리할까요?');dialog.props.actions.find(a=>a.label==='외부 전송에 동의').onPress();await settle();
 assert.equal(await f.ai.hasConsent(),true);assert.equal(inputs().length,1);assert.ok(labels().includes('접근 코드 등록'));
 inputs()[0].props.onChangeText('b'.repeat(64));assert.equal(inputs().length,1);assert.equal(await f.ai.hasAccessCode(),false); // typing is not registration
 f.setTransport(async()=>({valid:true}));await press('접근 코드 등록');assert.equal(await f.ai.hasAccessCode(),true);assert.equal(inputs().length,0);assert.deepEqual(labels(),['접근 코드 삭제','동의 철회하기']);
 await press('접근 코드 삭제');assert.equal(await f.ai.hasConsent(),true);assert.equal(await f.ai.hasAccessCode(),false);assert.equal(inputs().length,1);
 inputs()[0].props.onChangeText('c'.repeat(64));await press('접근 코드 등록');await press('동의 철회하기');assert.equal(await f.ai.hasConsent(),false);assert.equal(await f.ai.hasAccessCode(),true);assert.equal(inputs().length,0);assert.ok(labels().includes('AI 이용 안내와 전송 동의'));
 const calls=f.fetches.length;await f.ai.summarizeRecord((await f.s.listSituations())[0].id);assert.equal(f.fetches.length,calls);
 await press('AI 이용 안내와 전송 동의');const reconsent=nodes(draw()).find(n=>n.type==='InfoDialog'&&n.props.title==='돌봄기록을 AI로 정리할까요?');reconsent.props.actions.find(a=>a.label==='외부 전송에 동의').onPress();await settle();assert.equal(inputs().length,0);assert.deepEqual(labels(),['접근 코드 삭제','동의 철회하기']);assert.equal(f.fetches.length,calls); // stored code is reused after explicit re-consent
 for(const [key,value] of original)assert.equal(f.values.get(key),value,key);
 cleanups.forEach(fn=>fn?.());
});
test('safe validation details preserve originals and explain the actual failure category',async()=>{
 const f=fixture(),row=f.record();await f.s.saveSituation(row);await tick();await f.ai.consent(true);
 f.setTransport(async()=>({ok:false,status:502,json:async()=>({error:'invalid-output',reason:'summary-count'})}));await f.ai.summarizeRecord(row.id);let stored=(await f.s.listSituations())[0];assert.match(stored.aiSummary.error,/횟수나 수치/);assert.equal(stored.body,row.body);assert.equal(stored.aiSummary.status,'failed');assert.equal(stored.aiSummary.text,undefined);
 const long='중요한 상황과 실제로 제공한 도움을 빠짐없이 정리하면서 '.repeat(12)+'팔과 등을 받쳐드렸어요.';assert.ok(long.length>240);
 f.setTransport(async()=>({summary:long}));await f.ai.summarizeRecord(row.id);stored=(await f.s.listSituations())[0];assert.equal(stored.aiSummary.status,'ready');assert.equal(stored.aiSummary.text,long);assert.equal(stored.body,row.body);
});
test('failed AI requests distinguish safe server error codes without showing arbitrary response contents',async()=>{
 for(const [reason,expected] of [['upstream',/Claude 서비스 요청/],['invalid-output',/문장 형식이나 근거 검증/],['unavailable',/중계 서버 처리 중/],['private-provider-body',/HTTP 502/]]){
  const f=fixture();const row=f.record();await f.s.saveSituation(row);await tick();await f.ai.consent(true);f.setTransport(async()=>({ok:false,status:502,json:async()=>({error:reason})}));await f.ai.summarizeRecord(row.id);const stored=(await f.s.listSituations())[0];assert.equal(stored.body,row.body);assert.match(stored.aiSummary.error,expected);assert.ok(!stored.aiSummary.error.includes('private-provider-body'));
 }
});
test('access registration rejects malformed and server-rejected codes, saves only verified codes, preserves previous credentials on failure',async()=>{
 const f=fixture();await f.ai.consent(true);const original=f.getStoredCode(),candidate='b'.repeat(64);
 await assert.rejects(f.ai.setAccessCode('wrong'),/64자리/);assert.equal(f.fetches.length,0);
 for(const [status,message] of [[401,/올바르지/],[404,/업데이트/],[429,/요청이 많/],[503,/설정이 완료/]]){
  f.setTransport(async()=>({ok:false,status}));await assert.rejects(f.ai.setAccessCode(candidate),message);assert.equal(f.getStoredCode(),original);
 }
 f.setTransport(async()=>{throw new TypeError('network');});await assert.rejects(f.ai.setAccessCode(candidate),/인터넷 연결/);assert.equal(f.getStoredCode(),original);
 f.setTransport(async()=>({valid:true}));await f.ai.setAccessCode(candidate);assert.equal(f.getStoredCode(),candidate);assert.ok(f.fetches.every(r=>r.url.endsWith('/access/verify')&&r.options.body===undefined));
 await f.ai.consent(false);const count=f.fetches.length;await assert.rejects(f.ai.setAccessCode(original),/먼저 동의/);assert.equal(f.fetches.length,count);
});
async function until(check){for(let i=0;i<30;i++){if(await check())return;await tick();}throw new Error('did not settle');}
test('both save methods persist originals before AI, without sending before consent; old records do not bulk upload',async()=>{
 const f=fixture();for(const method of ['direct','questions'])await f.s.saveSituation({...f.record(),method});await tick();assert.equal(f.fetches.length,0);assert.equal((await f.s.listSituations()).length,2);
 await f.ai.consent(true);await f.s.listSituations();assert.equal(f.fetches.length,0);
 f.setTransport(async()=>{assert.equal((await f.s.listSituations()).length,3);throw new Error('offline');});const r=f.record('식기만 준비했다.');await f.s.saveSituation(r);await until(async()=>(await f.s.listSituations()).find(x=>x.id===r.id)?.aiSummary?.status==='failed');assert.equal((await f.s.listSituations()).find(x=>x.id===r.id).body,r.body);assert.equal(f.fetches.length,1);await tick();assert.equal(f.fetches.length,1);
});
test('late responses cannot overwrite edited content and the new content gets a fresh summary once',async()=>{
 const f=fixture();await f.ai.consent(true);let finish;let calls=0;f.setTransport(async()=>{calls++;if(calls===1)return new Promise(resolve=>{finish=resolve;});return {summary:'수정한 도움 요약'};});const original=f.record();await f.s.saveSituation(original);await until(()=>finish);
 const edited=f.m.updateSituation(original,{body:'숟가락만 건넸다.'});await f.s.saveSituation(edited);assert.equal((await f.s.listSituations())[0].aiSummary,undefined);finish({summary:'수정 전 요약'});
 await until(async()=>(await f.s.listSituations())[0].aiSummary?.text==='수정한 도움 요약');assert.equal(calls,2);assert.equal((await f.s.listSituations())[0].body,edited.body);
});
test('late response after deletion never recreates a record; duplicate summary clicks do not duplicate requests',async()=>{
 const f=fixture();await f.ai.consent(true);let finish;f.setTransport(async()=>new Promise(resolve=>{finish=resolve;}));const r=f.record();await f.s.saveSituation(r);await until(()=>finish);await Promise.all([f.ai.summarizeRecord(r.id),f.ai.summarizeRecord(r.id)]);assert.equal(f.fetches.length,1);await f.s.deleteSituation(r.id);finish({summary:'지연 응답'});await tick();await tick();assert.deepEqual(await f.s.listSituations(),[]);
});
test('withdrawal before a response discards AI output; interrupted pending state becomes retryable on restart',async()=>{
 const f=fixture();await f.ai.consent(true);let finish;f.setTransport(async()=>new Promise(resolve=>{finish=resolve;}));const r=f.record();await f.s.saveSituation(r);await until(()=>finish);await f.ai.consent(false);finish({summary:'사용하지 않을 응답'});await until(async()=>(await f.s.listSituations())[0].aiSummary?.status==='failed');assert.equal((await f.s.listSituations())[0].aiSummary.text,undefined);
 const raw=JSON.parse(f.values.get(f.s.situationStorageKey));raw.records[0].aiSummary.status='pending';f.values.set(f.s.situationStorageKey,JSON.stringify(raw));const restart=fixture(f.values);assert.equal((await restart.s.listSituations())[0].aiSummary.status,'failed');assert.equal(restart.fetches.length,0);
});
test('7/30/90 day periods include both exact boundaries and exclude drafts and following days',()=>{
 const f=fixture(),q=f.load('src/features/records/situation-query.ts');for(const period of [7,30,90]){const range=q.reviewRange(period,'2026-03-01');const rows=[f.record('첫날',range.from),f.record('마지막',range.to),f.record('미래','2026-03-02'),{...f.record('초안',range.from),status:'draft'},f.record('과거','2025-01-01')];assert.equal(q.querySituations(rows,{type:'all',...range}).length,2);assert.equal((Date.parse(range.to)-Date.parse(range.from))/86400000,period-1);}
});
test('report sends originals, caches exact evidence, does not re-call AI on read or HTML/PDF generation, tracks edits and deletion',async()=>{
 const f=fixture();const a=f.record('원본 <script> 내용'),b=f.record('식기 준비','2026-11-03');await f.s.saveSituation(a);await f.s.saveSituation(b);await tick();await f.ai.consent(true);f.setTransport(async(url,opts)=>{const data=JSON.parse(opts.body);assert.equal(data.records.length,2);assert.ok(data.records.some(r=>r.body===a.body));return {sections:[{title:'실제 도움',text:'기록에 적힌 도움만 정리',recordIds:data.records.map(r=>r.id),repeated:false}]};});
 const p=await f.ai.generateReport('2026-10-29','2026-11-04');assert.equal(f.fetches.length,1);assert.equal((await f.ai.listReports())[0].id,p.id);const html=f.load('src/features/records/report-html.ts').reportHTML(p);assert.ok(!html.includes('원본 &lt;script&gt; 내용'));assert.ok(!html.includes('<script>'));assert.ok(f.load('src/features/records/report-html.ts').reportHTML({...p,sections:[{...p.sections[0],title:'제목 <script>',text:'내용 <script>'}]}).includes('&lt;script&gt;'));assert.ok(html.includes(f.model.AI_NOTICE));assert.equal(f.fetches.length,1);
 assert.equal(f.model.reportStale(p,await f.s.listSituations()),false);assert.equal(f.model.reportStale(p,[a]),true);assert.equal(f.model.reportStale(p,[a,{...b,body:'변경'}]),true);assert.equal(f.model.reportStale(p,[a,b,f.record('추가')]),true);
});
test('a server-normalized report longer than the former 2500-character bound remains intact in storage and PDF HTML',async()=>{
 const f=fixture(),row=f.record();await f.s.saveSituation(row);await tick();await f.ai.consent(true);const text='일어설 때 팔과 등을 받쳐드린 상황이 기록되어 있어요. '.repeat(110).trim();assert.ok(text.length>2500&&text.length<8000);
 f.setTransport(async()=>({sections:[{title:'전체 돌봄 모습',text,recordIds:[row.id],repeated:false}]}));const report=await f.ai.generateReport(row.date,row.date);assert.equal(report.sections[0].text,text);assert.equal((await f.ai.listReports())[0].sections[0].text,text);assert.ok(f.load('src/features/records/report-html.ts').reportHTML(report).includes(text));assert.equal(f.fetches.length,1);
});
test('the same report period reuses stored output even after record changes or consent withdrawal, without another AI call',async()=>{
 const f=fixture(),row=f.record();await f.s.saveSituation(row);await tick();await f.ai.consent(true);
 f.setTransport(async()=>({sections:[{title:'전체 돌봄 모습',text:'침대에서 일어날 때 보호자가 팔과 등을 받쳐드렸어요.',recordIds:[row.id],repeated:false},{title:'주요 돌봄 양상',text:'일어설 때 몸을 받쳐드린 도움이 확인돼요.',recordIds:[row.id],repeated:false},{title:'확인 범위',text:'작성된 기록이 적어 다른 상황은 알 수 없어요.',recordIds:[row.id],repeated:false}]}));
 const original=await f.ai.generateReport('2026-10-29','2026-11-04');const raw=f.values.get('care-diary:ai-reports:v1');await f.ai.consent(false);await f.s.deleteSituation(row.id);const cached=await f.ai.generateReport('2026-10-29','2026-11-04');assert.deepEqual(cached,original);assert.equal(f.fetches.length,1);assert.equal(f.values.get('care-diary:ai-reports:v1'),raw);assert.equal(f.model.reportStale(cached,await f.s.listSituations()),true);
 const html=f.load('src/features/records/report-html.ts').reportHTML(cached);assert.ok(html.includes('<h2>확인 범위</h2>'));assert.ok(!html.includes('근거 기록'));assert.ok(!html.includes('href="#record-0"'));assert.equal(JSON.stringify(cached),JSON.stringify(original));
});
test('report deletion targets only selected reports, serializes concurrent deletes, and preserves originals and AI summaries',async()=>{
 const f=fixture(),row=f.record();await f.s.saveSituation(row);await tick();await f.ai.consent(true);const identity=f.model.fingerprint(row);await f.s.patchSituationAI(row.id,identity,{status:'ready',requestId:'test',fingerprint:identity,text:'팔과 등을 받쳐드렸어요.'});
 const base={from:row.date,to:row.date,createdAt:new Date().toISOString(),records:[f.model.evidence(row)],sections:[{title:'전체 돌봄 모습',text:'팔과 등을 받쳐드렸어요.',recordIds:[row.id],repeated:false}]};f.values.set('care-diary:ai-reports:v1',JSON.stringify(['a','b','c'].map(id=>({...base,id}))));const before=f.values.get(f.s.situationStorageKey),calls=f.fetches.length;
 await Promise.all([f.ai.deleteReport('a'),f.ai.deleteReport('b')]);assert.deepEqual((await f.ai.listReports()).map(r=>r.id),['c']);assert.equal(f.values.get(f.s.situationStorageKey),before);assert.equal(f.fetches.length,calls);assert.equal(await f.ai.hasConsent(),true);assert.equal(await f.ai.hasAccessCode(),true);
 await f.ai.deleteReport('c');assert.deepEqual(await f.ai.listReports(),[]);assert.equal(f.values.get(f.s.situationStorageKey),before);
});
test('failed report deletion leaves persisted reports intact and permits retry',async()=>{
 const values=new Map();let fail=false;const f=fixture(values,{'@react-native-async-storage/async-storage':{getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{if(fail)throw new Error('disk full');values.set(key,value);}}});const row=f.record();const report={id:'kept',from:row.date,to:row.date,createdAt:new Date().toISOString(),records:[f.model.evidence(row)],sections:[{title:'전체 돌봄 모습',text:'팔과 등을 받쳐드렸어요.',recordIds:[row.id],repeated:false}]};const raw=JSON.stringify([report]);values.set('care-diary:ai-reports:v1',raw);fail=true;await assert.rejects(f.ai.deleteReport(report.id));assert.equal(values.get('care-diary:ai-reports:v1'),raw);fail=false;await f.ai.deleteReport(report.id);assert.deepEqual(await f.ai.listReports(),[]);assert.equal(f.fetches.length,0);
});
test('empty reports and oversized full originals never make a network call; fabricated or repeated single evidence fails',async()=>{
 const f=fixture();await f.ai.consent(true);await assert.rejects(f.ai.generateReport('2026-10-29','2026-11-04'),/기록이 없/);assert.equal(f.fetches.length,0);await f.ai.consent(false);for(let i=0;i<5;i++)await f.s.saveSituation(f.record('가'.repeat(10000)));await tick();await f.ai.consent(true);await assert.rejects(f.ai.generateReport('2026-10-29','2026-11-04'),/96KB/);assert.equal(f.fetches.length,0);
 const records=[f.model.evidence(f.record())];const section={title:'사례',text:'정리',recordIds:[records[0].id],repeated:true};assert.throws(()=>f.model.validateSections([section],records));assert.throws(()=>f.model.validateSections([{...section,repeated:false,recordIds:['가짜']}],records));
});
for(const platform of ['ios','android'])test(`${platform} PDF adapter awaits file copy, offers share/print/save and never calls Claude (native APIs mocked)`,async()=>{
 const events=[];let copied=false;
 class Directory{constructor(...parts){this.uri=parts.map(x=>x.uri??x).join('/');}create(){events.push('mkdir');}static async pickDirectoryAsync(){events.push('picker');return new Directory('content://chosen');}}
 class File{constructor(...parts){this.uri=parts.map(x=>x.uri??x).join('/');}async copy(output,options){events.push('copy-start');assert.equal(options.overwrite,false);assert.ok(!output.uri.includes('saved-report'));assert.ok(output.uri.includes('돌봄기록_종합보고서_'));await tick();copied=true;events.push('copy-end');}delete(){events.push('delete-cache');}}
 const f=fixture(new Map(),{'react-native':{Platform:{OS:platform}},'expo-file-system':{Directory,File,Paths:{document:'file://documents',cache:'file://cache'}},'expo-print':{printToFileAsync:async({html})=>{assert.ok(html.includes('돌봄기록 종합 보고서'));events.push('pdf');return {uri:'file://cache/report.pdf'};},printAsync:async()=>events.push('print')},'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:async uri=>{if(uri!=='file://cache/report.pdf')assert.equal(copied,true);events.push('share');}}});
 const r=f.record(),p={id:'saved-report',from:r.date,to:r.date,createdAt:new Date().toISOString(),records:[f.model.evidence(r)],sections:[{title:'도움',text:'팔을 받쳐드림',recordIds:[r.id],repeated:false}]};const {exportReport}=f.load('src/features/records/report-pdf.ts');
 await exportReport(p,'save');assert.ok(events.indexOf('copy-end')<events.indexOf('delete-cache'));if(platform==='android')assert.ok(events.includes('picker'));else assert.ok(events.indexOf('copy-end')<events.indexOf('share'));
 await exportReport(p,'share');await exportReport(p,'print');assert.equal(f.fetches.length,0);assert.equal(events.filter(x=>x==='pdf').length,2);assert.equal(events.filter(x=>x==='print').length,1);
});
test('iOS cancelled print sheets are neutral feedback; real printer failures remain errors, with no AI call',async()=>{
 let printError=Object.assign(new Error('Printing did not complete'),{code:'ERR_PRINT_INCOMPLETE'});
 const f=fixture(new Map(),{'react-native':{Platform:{OS:'ios'}},'expo-file-system':{},'expo-sharing':{},'expo-print':{printAsync:async()=>{throw printError;}}});const row=f.record();const report={id:'print-test',from:row.date,to:row.date,createdAt:new Date().toISOString(),records:[f.model.evidence(row)],sections:[{title:'전체 돌봄 모습',text:'팔과 등을 받쳐드렸어요.',recordIds:[row.id],repeated:false}]};const snapshot=JSON.stringify(report),{exportReport}=f.load('src/features/records/report-pdf.ts');assert.match(await exportReport(report,'print'),/인쇄를 취소/);
 printError=Object.assign(new Error('Printer disconnected'),{code:'ERR_PRINTING_JOB_FAILED'});await assert.rejects(exportReport(report,'print'),/프린터 연결/);assert.equal(JSON.stringify(report),snapshot);assert.equal(f.fetches.length,0);
});
