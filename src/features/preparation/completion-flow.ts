import type { StageId } from '../trial/stages';
import type { Preparation } from './model';

export function completionPending(data:Preparation){return data.completionGuide==='personalized'||data.completionGuide==='records';}
export function completionDestination(data:Preparation):'/preparation-complete'|'/home'{return completionPending(data)?'/preparation-complete':'/home';}
export function beginCompletionGuide(before:Preparation,after:Preparation,existingGuideHistory=false):Preparation{
 if(before.completionGuide)return {...after,completionGuide:before.completionGuide};
 // Existing completed introductions stay completed. Never replay on upgrade or a stage change.
 const hasHistory=existingGuideHistory||Object.values(before.recordIntroduced??{}).some(Boolean)||Object.values(before.setup).some(Boolean)||Object.values(before.intros??{}).some(progress=>progress.completed);
 return {...after,completionGuide:hasHistory?'done':'personalized'};
}
export function completeStagePreparation(data:Preparation,stage:StageId,existingGuideHistory=false):Preparation{
 return beginCompletionGuide(data,{...data,setup:{...data.setup,[stage]:true},recordIntroduced:{...data.recordIntroduced,[stage]:true}},existingGuideHistory);
}
export function advanceCompletionGuide(data:Preparation):Preparation{
 if(data.completionGuide==='personalized')return {...data,completionGuide:'records'};
 if(data.completionGuide==='records')return {...data,completionGuide:'done'};
 return data;
}
