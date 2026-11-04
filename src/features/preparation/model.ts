import type { StageId } from '../trial/stages';
import { validDate } from '../records/calendar';
import { validVisitPosition, type VisitProgress } from '../visit-walkthrough/content';
import { migrateMedical, type MedicalState } from '../medical/model';
export const purposes = ['first','renewal','change','reapply'] as const;
export const results = ['recognized','not-recognized','unsure'] as const;
export const opinions = ['unknown','preparing','submitted','not-required'] as const;
export type Purpose = typeof purposes[number];
export type Result = typeof results[number];
export type Opinion = typeof opinions[number];
export type EntryStatus='todo'|'done'|'na'|'unknown';
export type Entry = { status:EntryStatus; note:string; updatedAt:string;source?:'manual'|'survey';surveyStatus?:EntryStatus };
export type Discovery = { step:'application'|'visit'|'result'; answers:Partial<Record<'application'|'visit'|'result',boolean>>; completed:boolean };
export type IntroProgress = { version:2; node:string; answers:Record<string,string>; trail:string[]; completed:boolean; scope:string };
export type Preparation = { version:1; setup:Partial<Record<StageId,boolean>>; purpose:Purpose|null; result:Result|null; opinion:Opinion; deadline:string|null; entries:Record<string,Entry>; discovery?:Discovery; intros?:Partial<Record<StageId,IntroProgress>>; recordIntroduced?:Partial<Record<StageId,boolean>>; transitionOffered?:Record<string,boolean>; visitWalkthrough?:VisitProgress;completionGuide?:'personalized'|'records'|'done';medical?:MedicalState };
export const freshPreparation = ():Preparation => ({version:1,setup:{},purpose:null,result:null,opinion:'unknown',deadline:null,entries:{}});
export function parsePreparation(raw:string|null):Preparation {
  if(raw===null)return freshPreparation();
  const p=JSON.parse(raw) as Preparation;
  if(!p||p.version!==1||!p.setup||typeof p.setup!=='object'||Array.isArray(p.setup)||!p.entries||typeof p.entries!=='object'||Array.isArray(p.entries)||![null,...purposes].includes(p.purpose)||![null,...results].includes(p.result)||!opinions.includes(p.opinion)||!(p.deadline===null||typeof p.deadline==='string'&&validDate(p.deadline)))throw new Error('Invalid preparation');
  if(Object.values(p.setup).some(v=>typeof v!=='boolean'))throw new Error('Invalid setup');
  if(p.completionGuide!==undefined&&!['personalized','records','done'].includes(p.completionGuide))throw new Error('Invalid completion guide');
  if(p.visitWalkthrough!==undefined&&(!p.visitWalkthrough||!validVisitPosition(p.visitWalkthrough.position)||typeof p.visitWalkthrough.completed!=='boolean'))throw new Error('Invalid visit walkthrough');
  for(const flags of [p.recordIntroduced,p.transitionOffered])if(flags&&(typeof flags!=='object'||Array.isArray(flags)||Object.values(flags).some(v=>typeof v!=='boolean')))throw new Error('Invalid guide flags');
  if(p.discovery&&(!['application','visit','result'].includes(p.discovery.step)||typeof p.discovery.completed!=='boolean'||!p.discovery.answers||typeof p.discovery.answers!=='object'||Array.isArray(p.discovery.answers)||Object.entries(p.discovery.answers).some(([k,v])=>!['application','visit','result'].includes(k)||typeof v!=='boolean')))throw new Error('Invalid discovery');
  const validNode=(node:unknown)=>typeof node==='string'&&/^(experience|purpose|opinion|result|lead|finish|ask:[a-z-]+|help:[a-z-]+|medical-deadline)$/.test(node);
  if(p.intros){if(typeof p.intros!=='object'||Array.isArray(p.intros))throw new Error('Invalid intros');for(const progress of Object.values(p.intros)){if(!progress||progress.version!==2||!validNode(progress.node)||typeof progress.scope!=='string'||typeof progress.completed!=='boolean'||!Array.isArray(progress.trail)||progress.trail.some(v=>!validNode(v))||!progress.answers||typeof progress.answers!=='object'||Array.isArray(progress.answers)||Object.entries(progress.answers).some(([k,v])=>!validNode(k)||typeof v!=='string'))throw new Error('Invalid intro progress');}}
  for(const [key,e] of Object.entries(p.entries))if(!/^[a-z:-]+$/.test(key)||!e||!['todo','done','na','unknown'].includes(e.status)||typeof e.note!=='string'||e.note.length>8000||!Number.isFinite(Date.parse(e.updatedAt))||e.source!==undefined&&!['manual','survey'].includes(e.source)||e.surveyStatus!==undefined&&!['todo','done','na','unknown'].includes(e.surveyStatus))throw new Error('Invalid preparation entry');
  return migrateMedical(p);
}
export function preparationScope(stage:StageId,p:Preparation) { return `${stage}:${stage==='before-application'?p.purpose??'first':stage==='result-received'?p.result??'unsure':'common'}`; }
export const entryKey=(scope:string,id:string)=>`${scope}:${id}`;
export function setEntry(p:Preparation,key:string,patch:Partial<Pick<Entry,'status'|'note'>>,now=new Date().toISOString()):Preparation {
  const before=p.entries[key]??{status:'unknown' as const,note:'',updatedAt:now};
  return {...p,entries:{...p.entries,[key]:{...before,...patch,source:patch.status!==undefined?'manual':before.source??'manual',updatedAt:now}}};
}
export function setSurveyEntry(p:Preparation,key:string,status:EntryStatus,now=new Date().toISOString()):Preparation{
 const before=p.entries[key];
 // Legacy entries without provenance are retained as the user's explicit history.
 const manual=!!before&&before.source!=='survey';
 return {...p,entries:{...p.entries,[key]:{...before,status:manual?before.status:status,note:before?.note??'',source:manual?'manual':'survey',surveyStatus:status,updatedAt:now}}};
}
