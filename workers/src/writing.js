// Presentation cleanup only. Never shorten content or rewrite care facts.
export function parseAIResponse(value){
 if(typeof value!=='string'||!value.trim())throw new Error('invalid-response-format');
 const text=value.trim(),fence=text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/iu);
 return JSON.parse(fence?fence[1]:text);
}
function finishSentence(text){return text.trim().replace(/[.!?。！？]+$/u,'').trim()+'.';}
export function normalizeSummary(value){
 if(typeof value!=='string'||value.length>2000)throw new Error('invalid-summary');
 let text=value.trim();
 // Remove only whole-output wrappers and explicit presentation prefixes.
 for(let i=0;i<3;i++){
  text=text.replace(/^(?:한\s*줄\s*요약|요약)\s*[:：]\s*/u,'').replace(/^(?:\d+[.)]\s+|[-*]\s+)/u,'').trim();
  const pairs=[['"','"'],["'","'"],['“','”'],['‘','’']];
  const pair=pairs.find(([a,b])=>text.startsWith(a)&&text.endsWith(b));
  if(pair)text=text.slice(pair[0].length,-pair[1].length).trim();
 }
 // Style is guided by the prompt, not a reason to discard a useful result.
 // Keep every sentence; collapse wrapping rather than taking the first line.
 text=text.replace(/\s+/gu,' ').replace(/\s*·\s*/gu,', ').trim();
 if(!text)throw new Error('invalid-summary');
 text=finishSentence(text);
 // A defensive response bound, not the recommended 30–70 character target.
 if(text.length>1000)throw new Error('invalid-summary-length');
 return text;
}
export function normalizeReportText(value){
 if(typeof value!=='string'||!value.trim())throw new Error('invalid-report');
 if(value.length>8000)throw new Error('invalid-report-length');
 const text=value.replace(/\s*·\s*/gu,', ').split(/\r?\n/u).map(line=>line.trim()?finishSentence(line):'').join('\n').trim();
 if(text.length>8000)throw new Error('invalid-report-length');
 return text;
}
