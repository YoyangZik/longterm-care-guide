import Storage from '../reset/storage';
import { assertDataSession, dataGeneration } from '../reset/gate';
import { listSituations, patchSituationAI } from './situation-storage';
import { evidence, fingerprint, validateSections, type CareReport, type EvidenceRecord } from './ai-model';
import { validDate } from './calendar';
import { situationTypes } from './situation-model';
import { makeId } from './model';
const consentKey='care-diary:ai-consent:v1';
const reportsKey='care-diary:ai-reports:v1';
const credentialKey='care-diary-ai-access';
export const serverURL=(process.env.EXPO_PUBLIC_AI_SERVER_URL??'').replace(/\/$/,'');
const settingsListeners=new Set<()=>void>();
export function subscribeAISettings(listener:()=>void){settingsListeners.add(listener);return()=>{settingsListeners.delete(listener);};}
const settingsChanged=()=>settingsListeners.forEach(listener=>listener());
export const hasConsent=async()=>await Storage.getItem(consentKey)==='v1';
export async function consent(value:boolean){await Storage.setItem(consentKey,value?'v1':'no');settingsChanged();}
async function credentials(){return import('./ai-credentials');}
export async function hasAccessCode(){return /^[a-f0-9]{64}$/.test((await (await credentials()).getCode(credentialKey))??'');}
export async function deleteAccessCode(){await (await credentials()).clearCode(credentialKey);settingsChanged();}
export async function setAccessCode(code:string){
 const value=code.trim(),session=dataGeneration();
 if(!/^[a-f0-9]{64}$/.test(value))throw new Error('접근 코드 형식이 맞지 않아요. 관리자에게 받은 64자리 코드를 확인해주세요.');
 if(!/^https:\/\//.test(serverURL))throw new Error('AI 중계 서버가 설정되지 않아 코드를 확인할 수 없어요.');
 if(!await hasConsent())throw new Error('AI 외부 전송 안내에 먼저 동의해주세요.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  assertDataSession(session);
  const response=await fetch(serverURL+'/access/verify',{method:'POST',headers:{Authorization:'Bearer '+value},signal:controller.signal});
  if(!response.ok){const messages:Record<number,string>={401:'접근 코드가 올바르지 않거나 사용이 중지됐어요. 코드를 확인한 뒤 다시 입력해주세요.',403:'이 앱에서 서버에 접근할 수 없어요. 관리자에게 서버 접근 설정을 확인해주세요.',404:'서버에 접근 코드 확인 기능이 없어요. 관리자가 중계 서버를 업데이트해야 해요.',429:'코드 확인 요청이 많아요. 잠시 후 다시 시도해주세요.',503:'서버의 접근 코드 설정이 완료되지 않았어요. 관리자에게 문의해주세요.'};throw new Error(messages[response.status]??'서버에서 코드를 확인하지 못했어요. 잠시 후 다시 시도해주세요.');}
  const result=await response.json();if(result?.valid!==true)throw new Error('서버에서 코드 확인 결과를 받지 못했어요. 중계 서버 설정을 확인해주세요.');
  assertDataSession(session);if(!await hasConsent())throw new Error('AI 이용 동의가 철회되어 등록하지 않았어요.');
  await (await credentials()).setCode(credentialKey,value);
  settingsChanged();
 }catch(e){if(e instanceof Error&&e.name==='AbortError')throw new Error('서버 응답이 늦어 코드를 확인하지 못했어요. 다시 시도해주세요.');if(e instanceof TypeError)throw new Error('인터넷 연결을 확인해주세요. 접근 코드는 아직 등록하지 않았어요.');throw e;}finally{clearTimeout(timer);}
}
export async function clearAccess(){await consent(false);await deleteAccessCode();}
function utf8Length(text:string){let bytes=0;for(const c of text){const n=c.codePointAt(0)!;bytes+=n<=0x7f?1:n<=0x7ff?2:n<=0xffff?3:4;}return bytes;}
async function request(path:string,data:{records:EvidenceRecord[];from?:string;to?:string},session=dataGeneration()){
 if(!await hasConsent())throw new Error('외부 AI 전송에 먼저 동의해주세요.');
 if(!/^https:\/\//.test(serverURL))throw new Error('AI 중계 서버가 설정되지 않았어요.');
 const code=await (await credentials()).getCode(credentialKey);if(!code)throw new Error('개별 접근 코드를 먼저 등록해주세요.');
 if(data.records.length>300||data.records.some(r=>r.body.length>20000))throw new Error('한 번에 최대 300건, 기록 한 건당 20,000자까지 처리할 수 있어요. 전체 원문은 잘라 보내지 않았어요.');
 const body=JSON.stringify(data);if(utf8Length(body)>96000)throw new Error('처리 한도인 96KB를 넘었어요. 기록을 줄이거나 더 짧은 기간을 선택해주세요. 원문은 잘라 보내지 않았어요.');
 // Recheck immediately before transmission, including withdrawal during credential lookup.
 if(!await hasConsent())throw new Error('AI 이용 동의가 철회되었어요.');
 assertDataSession(session);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),90000);
 try{const response=await fetch(serverURL+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+code},body,signal:controller.signal});
  if(!response.ok){
   const messages:Record<number,string>={400:'서버가 기록의 날짜, 유형 또는 요청 형식을 확인하지 못했어요. 원본은 유지돼요.',401:'접근 코드가 유효하지 않아요. 관리자에게 확인해주세요.',403:'앱의 서버 접근이 차단됐어요. 서버의 허용 주소 설정을 확인해주세요.',404:'AI 요청 주소를 찾지 못했어요. 중계 서버 주소와 배포 상태를 확인해주세요.',413:'전체 기록이 처리 한도를 넘었어요. 더 짧은 기간을 선택해주세요. 원문은 잘라 보내지 않았어요.',422:'AI 응답 길이 한도를 넘어 끝까지 생성하지 못했어요. 더 짧은 기간을 선택해주세요. 원본은 유지돼요.',429:'호출 한도에 도달했어요. 잠시 뒤 다시 시도해주세요.',503:'AI 서버 설정을 확인해야 해요.'};
   // Interpret only known safe codes, never display provider bodies or arbitrary server text.
   let reason:unknown,detail:unknown;try{const error=await response.json();reason=error?.error;detail=error?.reason;}catch{/* non-JSON platform error */}
   const reasons:Record<string,string>={
    upstream:'중계 서버에서 Claude 서비스 요청이 실패했어요. 관리자가 Claude API 키, 모델 설정과 서비스 이용 상태를 확인해야 해요. 원본은 유지돼요.',
    'invalid-output':'AI 응답이 문장 형식이나 근거 검증을 통과하지 못했어요. 원본은 유지돼요. 요약 또는 보고서를 다시 생성해주세요.',
    incomplete:'AI 응답이 끝까지 완료되지 않았어요. 잠시 뒤 다시 생성해주세요. 원본은 유지돼요.',
    unavailable:'AI 중계 서버 처리 중 오류가 발생했어요. 잠시 뒤 다시 시도해주세요. 원본은 유지돼요.',
   };
   const validationReasons:Record<string,string>={
    'summary-format':'AI가 비어 있거나 잘못된 형식의 요약을 반환했어요.',
    'summary-length':'AI 요약이 비정상적으로 길어 저장하지 않았어요. 문장을 잘라내지는 않았어요.',
    'summary-medical':'AI 요약에 원문에서 확인되지 않은 진단이나 상태 표현이 있어 저장하지 않았어요.',
    'summary-assistance':'AI 요약에 원문에서 확인되지 않은 도움 정도가 있어 저장하지 않았어요.',
    'summary-frequency':'AI 요약에 원문에서 확인되지 않은 빈도 표현이 있어 저장하지 않았어요.',
    'summary-count':'AI 요약에 원문에서 확인되지 않은 횟수나 수치가 있어 저장하지 않았어요.',
    'summary-grade':'AI 요약에 장기요양등급을 예측하는 표현이 있어 저장하지 않았어요.',
    'report-evidence':'AI 보고서에서 일부 기록의 근거가 빠졌어요.',
    'report-format':'AI가 잘못된 형식의 보고서를 반환했어요.',
    'report-length':'AI 보고서가 응답 길이 한도를 넘었어요. 내용을 잘라내지는 않았어요.',
    'report-structure':'AI가 읽을 수 있는 보고서 본문 항목을 반환하지 않았어요.',
    'report-title':'AI 보고서 제목의 형식을 확인하지 못했어요.',
    'report-text':'AI 보고서의 본문이 비어 있거나 읽을 수 없는 형식이에요.',
    'report-evidence-missing':'AI가 보고서의 근거 기록을 지정하지 않았어요. 임의로 연결하지 않고 저장을 중단했어요.',
    'report-evidence-unknown':'AI가 실제로 존재하지 않는 기록을 근거로 연결했어요.',
    'report-repetition':'AI가 한 기록만을 근거로 반복된 상황이라고 설명했어요.',
    'report-medical':'AI 보고서에 근거 기록에 없는 진단이나 상태 표현이 추가됐어요.',
    'report-assistance':'AI 보고서에 근거 기록보다 도움 정도를 확대하는 표현이 있어요.',
    'report-frequency':'AI 보고서에 근거 기록에 없는 빈도 표현이 추가됐어요.',
    'report-count':'AI 보고서에 근거 기록에 없는 횟수나 수치가 추가됐어요.',
    'report-grade':'AI 보고서에 장기요양등급을 예측하는 표현이 있어요.',
    'response-json':'AI가 지정된 응답 형식으로 결과를 반환하지 않았어요.',
    'response-schema':'AI 응답의 필수 항목이나 보고서 근거 ID를 확인하지 못했어요.',
   };
   const validationMessage=reason==='invalid-output'&&typeof detail==='string'?validationReasons[detail]:undefined;
   throw new Error(messages[response.status]??(validationMessage?validationMessage+' 원본은 유지돼요. 다시 생성해주세요.':typeof reason==='string'?reasons[reason]:undefined)??`AI 서버 오류가 발생했어요 (HTTP ${response.status}). 원본은 유지돼요.`);
  }
  return await response.json();
 }catch(e){if(e instanceof Error&&e.name==='AbortError')throw new Error('AI 응답 시간이 초과되었어요. 다시 시도해주세요.');if(e instanceof TypeError)throw new Error('인터넷 연결을 확인한 뒤 다시 시도해주세요. 원본은 저장되어 있어요.');throw e;}finally{clearTimeout(timer);}
}
const active=new Set<string>();
export async function summarizeRecord(id:string){
 if(active.has(id))return;active.add(id);const session=dataGeneration();let identity='',requestId='';
 try{
  if(!await hasConsent())return;
  const row=(await listSituations()).find(r=>r.id===id&&r.status==='saved');if(!row)return;
  assertDataSession(session);identity=fingerprint(row);requestId=Date.now()+'-'+Math.random().toString(36).slice(2);
  const applied=await patchSituationAI(id,identity,{status:'pending',fingerprint:identity,requestId});if(!applied)return;
  const response=await request('/summary',{records:[evidence(row)]},session);
  if(typeof response.summary!=='string'||!response.summary.trim()||response.summary.length>1000||/[\r\n]/.test(response.summary))throw new Error('요약 형식을 확인하지 못했어요.');
  assertDataSession(session);if(!await hasConsent())throw new Error('AI 이용 동의가 철회되었어요.');
  await patchSituationAI(id,identity,{status:'ready',fingerprint:identity,requestId,text:response.summary},requestId);
 }catch(e){try{assertDataSession(session);if(identity)await patchSituationAI(id,identity,{status:'failed',fingerprint:identity,requestId,error:e instanceof Error?e.message:'AI 처리에 실패했어요.'},requestId);}catch{/* reset/deletion wins */}}
 finally{
  active.delete(id);
  // An edit while an older request was in flight gets exactly one request for
  // the new content. A failed request for unchanged content is never retried.
  try{assertDataSession(session);const latest=(await listSituations()).find(r=>r.id===id&&r.status==='saved');if(identity&&latest&&fingerprint(latest)!==identity)void summarizeRecord(id);}catch{/* reset wins */}
 }
}
export async function listReports():Promise<CareReport[]>{
 const raw=await Storage.getItem(reportsKey);const data=raw?JSON.parse(raw):[];
 if(!Array.isArray(data))throw new Error('Invalid report storage');
 const ids=new Set<string>();
 for(const p of data){
  if(!p||typeof p.id!=='string'||ids.has(p.id)||!validDate(p.from)||!validDate(p.to)||p.from>p.to||!Number.isFinite(Date.parse(p.createdAt))||!Array.isArray(p.records)||!p.records.length||p.records.length>300)throw new Error('Invalid report storage');
  ids.add(p.id);const records=new Set<string>();for(const r of p.records){if(!r||typeof r.id!=='string'||records.has(r.id)||!validDate(r.date)||r.date<p.from||r.date>p.to||!situationTypes.some(t=>t.id===r.type)||typeof r.body!=='string')throw new Error('Invalid evidence storage');records.add(r.id);}
  validateSections(p.sections,p.records);
 }
 return data;
}
let reportQueue:Promise<unknown>=Promise.resolve();let reportBusy=false;
export function deleteReport(id:string){
 const session=dataGeneration();
 const remove=reportQueue.then(async()=>{assertDataSession(session);const reports=await listReports();assertDataSession(session);await Storage.setItem(reportsKey,JSON.stringify(reports.filter(report=>report.id!==id)));});
 reportQueue=remove.catch(()=>{});return remove;
}
export async function generateReport(from:string,to:string):Promise<CareReport>{
 if(reportBusy)throw new Error('보고서를 생성하고 있어요.');reportBusy=true;const session=dataGeneration();
 try{
  // Reuse an existing period report, including its original evidence snapshot.
  // Viewing/exporting it never spends another AI request or rewrites history.
  const existing=(await listReports()).find(report=>report.from===from&&report.to===to);
  assertDataSession(session);if(existing)return existing;
  const rows=(await listSituations()).filter(r=>r.status==='saved'&&r.date>=from&&r.date<=to);
  if(!rows.length)throw new Error('선택한 기간에 기록이 없어요.');
  const records:EvidenceRecord[]=rows.map(evidence).sort((a,b)=>a.id.localeCompare(b.id));
  const response=await request('/report',{from,to,records},session);
  const sections=validateSections(response.sections,records);assertDataSession(session);if(!await hasConsent())throw new Error('AI 이용 동의가 철회되었어요.');
  const report:CareReport={id:makeId(),from,to,createdAt:new Date().toISOString(),records,sections};
  const save=reportQueue.then(async()=>{assertDataSession(session);const previous=await listReports();await Storage.setItem(reportsKey,JSON.stringify([report,...previous]));});reportQueue=save.catch(()=>{});await save;return report;
 }finally{reportBusy=false;}
}
