import type { StageId } from '../trial/stages';
import { initialIntro, introItems } from './intro-flow';
import { entryKey, preparationScope, setSurveyEntry, type Preparation, type IntroProgress, type Purpose, type Result, type EntryStatus } from './model';
import { beginCompletionGuide } from './completion-flow';
import { getMedical, migrateMedical, setMedicalDeadline, setMedicalStatus, type MedicalStatus } from '../medical/model';
export function personalizationHint(id:string){
 const hints:Record<string,string>={eligibility:'공단의 신청 자격을 확인했는지 알려주세요. 등급 인정 여부를 묻는 질문은 아니에요.',method:'어디에 어떤 방법으로 신청할지 확인하셨는지 알려주세요.',documents:'내 상황에 필요한 신청서와 서류를 준비하셨는지 알려주세요.',medical:'공단에서 안내받은 의사소견서 준비 상태를 알려주세요.'};
 return hints[id]??'이미 확인하거나 준비한 내용을 알려주세요. 아직 모르는 내용은 홈에서 다시 확인할 수 있어요.';
}

// These are actual answers, not deductions from the user's current stage.
export function syncSurveyFacts(p:Preparation,includeUnknown=false){
 return includeUnknown?setMedicalStatus(p,p.opinion):migrateMedical(p);
}
export function personalization(stage:StageId,p:Preparation):IntroProgress{
 const saved=initialIntro(stage,p);
 if(saved.completed)return saved;
 const first=personalizationItems(stage,p)[0];
 let node=saved.node==='lead'?(first?`ask:${first.id}`:'finish'):saved.node.startsWith('help:')?`ask:${saved.node.slice(5)}`:saved.node;
 const medical=getMedical(p);
 if(stage==='awaiting-result'&&saved.node==='lead'&&medical.status==='preparing'&&!medical.deadline&&!medical.deadlineAsked&&!medical.needsConfirmation)node='medical-deadline';
 if(node==='opinion'&&medical.status!=='unanswered'&&!medical.needsConfirmation&&!saved.answers.opinion)node=medical.status==='preparing'&&!medical.deadline&&!medical.deadlineAsked?'medical-deadline':first?`ask:${first.id}`:'finish';
 if(node.startsWith('ask:')&&!personalizationItems(stage,p).some(item=>item.id===node.slice(4)))node=first?`ask:${first.id}`:'finish';
 return {...saved,node,trail:saved.trail.filter(n=>n!=='lead'&&!n.startsWith('help:')&&(!n.startsWith('ask:')||personalizationItems(stage,p).some(item=>item.id===n.slice(4))))};
}
export function advancePersonalization(stage:StageId,p:Preparation,i:IntroProgress):IntroProgress{
 const value=i.answers[i.node];let node:string;
 const items=personalizationItems(stage,p);
 const nextQuestion=(index:number)=>items[index]?`ask:${items[index].id}`:'finish';
 if(i.node==='experience')node=value==='previous'?'purpose':nextQuestion(0);
 else if(i.node==='opinion'){const m=getMedical(p);node=m.status==='preparing'&&!m.deadline&&!m.deadlineAsked?'medical-deadline':nextQuestion(0);}
 else if(['purpose','result','medical-deadline'].includes(i.node))node=nextQuestion(0);
 else if(i.node.startsWith('ask:'))node=nextQuestion(items.findIndex(item=>item.id===i.node.slice(4))+1);
 else node='finish';
 if((['experience','purpose','result','opinion'].includes(i.node)||i.node.startsWith('ask:'))&&!value)throw new Error('Answer required');
 return {...i,node,completed:node==='finish',trail:node==='finish'?[]:[...i.trail.filter(n=>n!==i.node),i.node]};
}
function personalizationItems(stage:StageId,p:Preparation){
 const scope=preparationScope(stage,p);
 return introItems(stage,p).filter(item=>{const entry=p.entries[entryKey(scope,item.id)];return item.id!=='medical'&&!(entry&&entry.source!=='survey'&&entry.status==='done');});
}
export function finishPersonalization(p:Preparation,stage:StageId,i:IntroProgress,existingGuideHistory=false):Preparation{
 const next={...p,intros:{...p.intros,[stage]:i},setup:{...p.setup,[stage]:i.completed},recordIntroduced:{...p.recordIntroduced,[stage]:i.completed}};
 return i.completed?beginCompletionGuide(p,next,existingGuideHistory):next;
}
export function hasPersonalization(stage:StageId,p:Preparation){
 return !!p.intros?.[stage]?.completed&&p.intros[stage]?.scope===preparationScope(stage,p);
}
export function choosePersonalization(p:Preparation,stage:StageId,i:IntroProgress,value:string){
 let data=p;
 let answers={...i.answers,[i.node]:value};
 if(['experience','purpose','result','opinion'].includes(i.node)&&i.answers[i.node]!==value)answers=Object.fromEntries(Object.entries(answers).filter(([key])=>key===i.node||i.node==='purpose'&&key==='experience'));
 if(i.node==='experience'&&value==='first')data={...data,purpose:'first'};
 if(i.node==='purpose')data={...data,purpose:value as Purpose};
 if(i.node==='result')data={...data,result:value as Result};
 if(i.node==='opinion')data=setMedicalStatus(data,value as Exclude<MedicalStatus,'unanswered'>);
 if(i.node.startsWith('ask:'))data=setSurveyEntry(data,entryKey(preparationScope(stage,data),i.node.slice(4)),value as EntryStatus);
 return {data,progress:{...i,answers,completed:false,scope:preparationScope(stage,data)}};
}

export function savePersonalizationDeadline(stage:StageId,p:Preparation,date:string|null,existingGuideHistory=false):Preparation{
 const current=personalization(stage,p);
 if(current.node!=='medical-deadline')throw new Error('Not on medical deadline question');
 const updated=setMedicalDeadline(p,date);
 return finishPersonalization(updated,stage,advancePersonalization(stage,updated,current),existingGuideHistory);
}
