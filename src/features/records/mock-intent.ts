import { advanceQuestion,changeAnswer,wrapUp,type CareRecord,type Category } from './model';
export const mockPhrases = {
  unobserved: ['관찰하지 못했어요','관찰 못했어요','보지 못했어요','못 봤어요'],
  skip: ['건너뛰기','넘어갈게요','이 질문은 건너뛸게요'],
  finish: ['지금까지 내용 정리하기','여기까지 정리해주세요','마무리할게요'],
  none: ['없어요','특별한 일 없어요','특이사항 없어요'],
} as const;
function normalize(text:string){return text.trim().replace(/[.!?。！？]+$/,'').replace(/\s+/g,'');}
export function mockIntent(text:string,category:Category): 'answer'|'unobserved'|'skip'|'finish'|'none'{
  const normalized=normalize(text);
  for(const intent of ['unobserved','skip','finish','none'] as const){if(intent==='none'&&category!=='notes')continue;if(mockPhrases[intent].some(p=>normalize(p)===normalized))return intent;}
  return 'answer';
}
export function applyMockReply(record:CareRecord):{record:CareRecord;action:'advance'|'wrap'}{
  const answer=record.source.answers[record.cursor]; const intent=mockIntent(answer.text,answer.category);
  if(intent==='answer')return{record,action:'advance'};
  const next=changeAnswer(record,answer.category,'',intent==='unobserved'?'unobserved':intent==='none'?'none':'skipped');
  const preserved={...next,source:{...next.source,answers:next.source.answers.map(a=>a.category===answer.category?{...a,rawText:answer.text}:a)}};
  return intent==='finish'&&answer.category!=='notes'&&record.kind!=='addition'?{record:wrapUp(preserved),action:'wrap'}:{record:preserved,action:'advance'};
}

// Bounded development flow, not adaptive AI: two starter topics then optional notes.
export function advanceMockQuestion(record:CareRecord){
  if(record.kind==='addition'||record.source.answers[record.cursor].category==='notes')return advanceQuestion(record);
  const movement=record.source.answers.findIndex(a=>a.category==='movement'&&a.status==='unanswered');
  return {record:record.source.answers[record.cursor].category==='meal'&&movement>=0?{...record,cursor:movement}:wrapUp(record),ready:false};
}
