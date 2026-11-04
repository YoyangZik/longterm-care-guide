import type { StageId } from '../trial/stages';
import { findItem, preparationItems } from './content';
import { entryKey, preparationScope, type Entry, type Preparation } from './model';
import { medicalEntryStatus } from '../medical/model';
export function completionVerb(id:string,stage:StageId){
  if(id==='medical'&&stage==='awaiting-result')return '제출했어요';
  return findItem(id)?.kind==='prepare'?'준비했어요':'확인했어요';
}
export function entryLabel(id:string,stage:StageId,status:Entry['status']){
  if(status==='done')return completionVerb(id,stage);
  if(status==='na')return '해당 없음';
  if(status==='unknown')return '아직 확인하지 않았어요';
  return completionVerb(id,stage)==='제출했어요'?'아직 제출 전이에요':completionVerb(id,stage)==='확인했어요'?'아직 확인하지 않았어요':'준비 중이에요';
}
export function allCorePrepared(stage:StageId,p:Preparation){
  const scope=preparationScope(stage,p);const core=preparationItems(stage,p).filter(i=>!i.optional);
  return core.length>0&&core.every(i=>['done','na'].includes(i.id==='medical'?medicalEntryStatus(p):p.entries[entryKey(scope,i.id)]?.status??'unknown'));
}
export const nextStage:Partial<Record<StageId,StageId>>={'before-application':'awaiting-assessment','awaiting-assessment':'awaiting-result','awaiting-result':'result-received'};

export function checklistStateLabel(id:string,status:Entry['status']){
 if(status==='na')return id==='requested'?'요청받은 준비물 없음':'해당 없음';
 return findItem(id)?.kind==='prepare'?(status==='done'?'준비 완료':status==='todo'?'준비 중':'준비하기'):(status==='done'?'확인 완료':'확인하기');
}
