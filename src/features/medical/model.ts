import type { Preparation, EntryStatus } from '../preparation/model';
import { validDate } from '../records/calendar';
import { localDate } from '../records/time';
export const medicalStatuses=['unanswered','preparing','submitted','not-required','unknown'] as const;
export type MedicalStatus=typeof medicalStatuses[number];
export type MedicalState={version:1;status:MedicalStatus;deadline:string|null;deadlineAsked:boolean;needsConfirmation:boolean;candidates?:MedicalStatus[]};
export const freshMedical=():MedicalState=>({version:1,status:'unanswered',deadline:null,deadlineAsked:false,needsConfirmation:false});
export const medicalOptions:Record<Exclude<MedicalStatus,'unanswered'>,string>={submitted:'제출했어요',preparing:'아직 제출하지 않았어요','not-required':'제출하지 않아도 된다고 안내받았어요',unknown:'잘 모르겠어요'};
export function assertMedical(m:MedicalState){if(!m||m.version!==1||!medicalStatuses.includes(m.status)||!(m.deadline===null||typeof m.deadline==='string'&&validDate(m.deadline))||typeof m.deadlineAsked!=='boolean'||typeof m.needsConfirmation!=='boolean'||m.candidates!==undefined&&(!Array.isArray(m.candidates)||m.candidates.some(s=>!medicalStatuses.includes(s))))throw new Error('Invalid medical state');}
export function migrateMedical(p:Preparation):Preparation{
 // opinion/deadline and per-stage medical entries remain read-only legacy history.
 // Once present, medical is the only authoritative state and is never re-merged.
 if(p.medical!==undefined){assertMedical(p.medical);return p;}
 const candidates:MedicalStatus[]=[];let ambiguous=false;
 if(p.opinion!=='unknown')candidates.push(p.opinion);
 else if(Object.values(p.intros??{}).some(i=>i.answers.opinion==='unknown'))candidates.push('unknown');
 for(const [key,entry] of Object.entries(p.entries)){
  if(!key.endsWith(':medical'))continue;
  // Copies generated from the old global opinion are not independent answers.
  if(p.opinion!=='unknown'&&entry.source==='survey'&&entry.surveyStatus===(p.opinion==='submitted'?'done':p.opinion==='not-required'?'na':'todo'))continue;
  if(entry.status==='done')candidates.push(key.startsWith('awaiting-result:')?'submitted':'preparing');
  else if(entry.status==='todo')candidates.push('preparing');
  else if(entry.status==='na'){if(p.opinion==='not-required')candidates.push('not-required');else ambiguous=true;}
  else if(entry.source==='manual'||Object.values(p.intros??{}).some(i=>i.scope===key.slice(0,-8)&&i.answers['ask:medical']==='unknown'))candidates.push('unknown');
 }
 const unique=[...new Set(candidates)];const conflict=ambiguous||unique.length>1;
 return {...p,medical:{version:1,status:conflict?'unknown':unique[0]??'unanswered',deadline:p.deadline,deadlineAsked:!!p.deadline,needsConfirmation:conflict,...(conflict?{candidates:unique}: {})}};
}
export const getMedical=(p:Preparation):MedicalState=>p.medical??migrateMedical(p).medical!;
export function setMedicalStatus(p:Preparation,status:Exclude<MedicalStatus,'unanswered'>):Preparation{return {...p,medical:{...getMedical(p),status,needsConfirmation:false}};}
export function setMedicalDeadline(p:Preparation,deadline:string|null):Preparation{if(deadline!==null&&!validDate(deadline))throw new Error('Invalid medical deadline');return {...p,medical:{...getMedical(p),deadline,deadlineAsked:true}};}
export function medicalEntryStatus(p:Preparation):EntryStatus{const m=getMedical(p);return m.needsConfirmation?'unknown':m.status==='submitted'?'done':m.status==='not-required'?'na':m.status==='preparing'?'todo':'unknown';}
export function medicalLabel(p:Preparation){const m=getMedical(p);return m.needsConfirmation?'상태 확인 필요':m.status==='submitted'?'제출 완료':m.status==='not-required'?'제출 제외 안내':m.status==='preparing'?'제출 준비 중':m.status==='unknown'?'제출 여부 모름':'아직 확인하지 않음';}
export function medicalPresentation(p:Preparation,today=localDate()){
 const m=getMedical(p);
 if(m.needsConfirmation)return {title:'의사소견서 상태를 한 번 확인해 주세요',description:'이전에 저장한 상태가 서로 달라요. 현재 공단에서 안내받은 상태를 골라주세요.',action:'제출 상태 확인하기' as const,overdue:false};
 if(m.status==='submitted')return {title:'의사소견서 제출을 마쳤어요',description:'',action:null,overdue:false};
 if(m.status==='not-required')return {title:'의사소견서를 제출하지 않아도 된다고 안내받았어요',description:'공단에서 안내받은 상태로 표시해요.',action:null,overdue:false};
 if(m.status==='unknown')return {title:'의사소견서 제출 여부를 확인해 주세요',description:'의료기관의 발급이나 전송 여부와 공단의 접수 여부를 확인해 주세요.',action:'제출 상태 확인하기' as const,overdue:false};
 if(m.status==='unanswered')return {title:'의사소견서 제출 상태를 확인해 주세요',description:'공단에서 안내받은 상태와 제출기한을 남길 수 있어요.',action:'제출 상태 확인하기' as const,overdue:false};
 if(!m.deadline)return {title:'의사소견서 제출기한을 확인해 주세요',description:'공단에서 안내받은 날짜를 등록할 수 있어요.',action:'제출기한 등록하기' as const,overdue:false};
 const overdue=m.deadline<today;const [,month,day]=m.deadline.split('-').map(Number);
 return {title:overdue?'안내받은 제출기한이 지났어요.':`${month}월 ${day}일까지 의사소견서를 제출해 주세요`,description:overdue?'담당자에게 제출 가능 여부와 일정을 확인해 주세요.':'공단에서 안내받은 제출기한이에요.',action:'제출했어요' as const,overdue};
}
