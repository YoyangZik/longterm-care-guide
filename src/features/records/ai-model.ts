import type { SituationRecord } from './situation-model';
export type AISummary = { status: 'pending'|'ready'|'failed'; fingerprint: string; requestId: string; text?: string; error?:string };
export type EvidenceRecord = {id:string; date:string; type:string; body:string};
export type ReportSection = {title:string; text:string; recordIds:string[]; repeated:boolean};
export type CareReport = {id:string; from:string; to:string; createdAt:string; records:EvidenceRecord[]; sections:ReportSection[]};
export const AI_NOTICE='이 자료는 보호자가 작성한 돌봄기록을 바탕으로 AI가 정리한 참고자료입니다. 실제 상태와 차이가 있을 수 있으므로 원본 기록과 함께 확인해 주세요. 국민건강보험공단의 공식 판정 자료나 의학적 진단서가 아닙니다.';
// Exact content identity, deliberately independent of UI cursor and AI metadata.
export function evidence(r:SituationRecord):EvidenceRecord{return {id:r.id,date:r.date,type:r.type!,body:r.body};}
export function fingerprint(r:SituationRecord){return JSON.stringify(evidence(r));}
export function reportStale(report:CareReport,rows:SituationRecord[]){return JSON.stringify(report.records)!==JSON.stringify(rows.filter(r=>r.status==='saved'&&r.date>=report.from&&r.date<=report.to).map(evidence).sort((a,b)=>a.id.localeCompare(b.id)));}
export function validateSections(value:unknown,records:EvidenceRecord[]):ReportSection[]{
 if(!Array.isArray(value)||!value.length||value.length>24)throw new Error('보고서 형식을 확인하지 못했어요.');
 const sections:ReportSection[]=value.map(s=>{
  if(!s||typeof s.title!=='string'||!s.title.trim()||s.title.length>200||typeof s.text!=='string'||!s.text.trim()||s.text.length>8000||typeof s.repeated!=='boolean'||!Array.isArray(s.recordIds)||!s.recordIds.length||s.recordIds.length>records.length||s.recordIds.some((id:unknown)=>typeof id!=='string'||!records.some(r=>r.id===id))||new Set(s.recordIds).size!==s.recordIds.length||s.repeated&&s.recordIds.length<2)throw new Error('보고서 근거를 확인하지 못했어요.');
  return {title:s.title,text:s.text,recordIds:s.recordIds,repeated:s.repeated};
 });
 if(sections.reduce((length,section)=>length+section.text.length,0)>24000)throw new Error('보고서 응답이 비정상적으로 길어요.');
 if(records.some(r=>!sections.some(s=>s.recordIds.includes(r.id))))throw new Error('일부 기록의 분석 근거가 빠졌어요. 더 짧은 기간으로 다시 시도해주세요.');
 return sections;
}
