import { findItem } from './content';
import type { Entry } from './model';

// Missing entries and explicit unknown answers have different meanings.
// Never rewrite historical entries merely to change a display label.
export function checklistPresentation(id:string, entry?:Entry){
 if(!entry)return {label:'선택 전',complete:false,tone:'unanswered' as const};
 if(entry.status==='na')return {label:id==='requested'?'준비물 없음':'해당 없음',complete:false,tone:'neutral' as const};
 if(entry.status==='done')return {label:findItem(id)?.kind==='prepare'?'준비했어요':'확인했어요',complete:true,tone:'complete' as const};
 if(entry.status==='todo')return {label:'아직이에요',complete:false,tone:'neutral' as const};
 return {label:'확인 필요',complete:false,tone:'unanswered' as const};
}
