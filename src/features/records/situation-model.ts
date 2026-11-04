import type { AISummary } from './ai-model';
import { localDate } from './time';
import { makeId } from './model';
import { interviewQuestions } from './interview-content';
import { summaryAnswer } from './summary-tone';

export const situationTypes = [
 {id:'movement',label:'이동과 신체활동',icon:{ios:'figure.walk',android:'directions_walk',web:'directions_walk'},area:'신체기능과 재활'},
 {id:'daily',label:'식사와 위생, 배변',icon:{ios:'fork.knife',android:'restaurant',web:'restaurant'},area:'신체기능'},
 {id:'memory',label:'기억과 인지',icon:{ios:'brain.head.profile',android:'psychology',web:'psychology'},area:'인지기능'},
 {id:'behavior',label:'행동과 수면',icon:{ios:'moon',android:'bedtime',web:'bedtime'},area:'행동변화'},
 {id:'health',label:'건강과 간호',icon:{ios:'cross.case',android:'medical_services',web:'medical_services'},area:'간호처치와 질병 및 증상'},
 {id:'other',label:'기타',icon:{ios:'square.and.pencil',android:'edit_note',web:'edit_note'},area:null},
] as const;
export type SituationType=typeof situationTypes[number]['id'];
export const typeLabel=(id:SituationType)=>situationTypes.find(t=>t.id===id)!.label;
export function hasSituationInput(r:SituationRecord){return !!r.body.trim()||Object.values(r.answers).some(answer=>!!answer.trim());}
// Reference areas only; these are personal situation notes, not an assessment.
export const questionReference={url:'https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=1&cnpClsNo=2&csmSeq=2038&popMenu=ov',checkedOn:'2026-11-03'};
export const scenarios=[{id:'meal',label:'식사'},{id:'washing',label:'씻기'},{id:'toilet',label:'화장실 이용'}] as const;
export type Question={id:string;prompt:string;hint:string;multiple?:boolean;choices:{label:string;text:string;exclusive?:boolean}[]};
export function toggleInterviewChoice(question:Question,value:string,text:string):string{
 const choice=question.choices.find(c=>c.text===text);
 if(!question.multiple||!choice||choice.exclusive)return text;
 const existing=value.split('\n').filter(v=>question.choices.some(c=>!c.exclusive&&c.text===v));
 return (existing.includes(text)?existing.filter(v=>v!==text):[...existing,text]).join('\n');
}
export type SituationRecord={aiSummary?:AISummary;version:2;id:string;date:string;type:SituationType|null;scenario:string|null;method:'direct'|'questions';body:string;answers:Record<string,string>;questionSnapshot:Question[];cursor:number;step:'type'|'scenario'|'input'|'question'|'preview'|'edit';status:'draft'|'saved';createdAt:string;updatedAt:string;savedAt:string|null;revision:number;edited:boolean;generated:string;legacyOriginal?:unknown};
export function questionsFor(type:SituationType,scenario:string|null,answers:Record<string,string>={}):Question[]{return interviewQuestions(type,scenario,answers);}
export function answerSituation(r:SituationRecord,id:string,text:string):SituationRecord{
 if(r.answers[id]===text)return r;
 const order=['event','difficulty','help','outcome'];const at=order.indexOf(id);
 const answers=Object.fromEntries(Object.entries(r.answers).filter(([key])=>key!==`${id}:detail`&&order.indexOf(key.split(':')[0])<=at));
 answers[id]=text;
 const questionSnapshot=questionsFor(r.type!,r.scenario,answers);
 return updateSituation(r,{answers,questionSnapshot});
}
export function createSituation(method:SituationRecord['method'],now=new Date().toISOString()):SituationRecord{return {version:2,id:makeId(),date:localDate(new Date(now)),type:null,scenario:null,method,body:'',answers:{},questionSnapshot:[],cursor:0,step:'type',status:'draft',createdAt:now,updatedAt:now,savedAt:null,revision:1,edited:false,generated:''};}
export function updateSituation(r:SituationRecord,patch:Partial<SituationRecord>,now=new Date().toISOString()):SituationRecord{return {...r,...patch,id:r.id,date:r.date,createdAt:r.createdAt,updatedAt:now,revision:r.revision+1};}
export function chooseType(r:SituationRecord,type:SituationType):SituationRecord{
 if(r.type===type)return r;
 return updateSituation(r,{type,scenario:null,answers:{},questionSnapshot:questionsFor(type,null),cursor:0});
}
export function chooseScenario(r:SituationRecord,scenario:string):SituationRecord{
 if(r.scenario===scenario)return r;
 if(!scenarios.some(s=>s.id===scenario))throw new Error('Invalid scenario');
 return updateSituation(r,{scenario,answers:{},questionSnapshot:questionsFor('daily',scenario),cursor:0});
}
export function generatedBody(r:SituationRecord):string {
 // No semantic analysis, placeholders, examples or inferred facts.
 return questionsFor(r.type!,r.scenario,r.answers).flatMap(q=>[r.answers[q.id]?summaryAnswer(r.answers[q.id],q.choices.map(c=>c.text)):undefined,r.answers[`${q.id}:detail`]]).filter((v):v is string=>typeof v==='string'&&!!v.trim()).join('\n');
}
export function previewSituation(r:SituationRecord,replaceEdited=false):SituationRecord{
 if(!r.type||r.type==='daily'&&!scenarios.some(s=>s.id===r.scenario))throw new Error('Situation required');
 if(r.method==='direct')return updateSituation(r,{step:'preview'});
 const generated=generatedBody(r);
 if(r.edited&&!replaceEdited){
  const originalTone=questionsFor(r.type!,r.scenario,r.answers).flatMap(q=>[r.answers[q.id],r.answers[`${q.id}:detail`]]).filter((v):v is string=>typeof v==='string'&&!!v.trim()).join('\n');
  if(generated!==r.generated&&originalTone!==r.generated)throw new Error('Edited body conflict');
  return updateSituation(r,{step:'preview'});
 }
 return updateSituation(r,{body:generated,generated,edited:false,step:'preview'});
}
export function confirmSituation(r:SituationRecord,now=new Date().toISOString()):SituationRecord{
 if(!r.type||!r.body.trim())throw new Error('Empty record');
 if(r.type==='daily'&&!scenarios.some(s=>s.id===r.scenario))throw new Error('Situation required');
 return updateSituation(r,{status:'saved',savedAt:r.savedAt??now,step:'preview'},now);
}
