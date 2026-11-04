import { normalizeReportText } from './writing.js';
import { hasRepeatedObservation, validateSummaryEvidence } from './summary-evidence.js';

export function reportModelData(data){
 const aliases=new Map();
 const records=data.records.map((record,index)=>{const id=`R${index+1}`;aliases.set(id,record.id);return {...record,id};});
 return {data:{...data,records},aliases};
}
export function normalizeReport(value,records,aliases=new Map()){
 const items=Array.isArray(value)?value:value?.sections;
 if(!Array.isArray(items)||!items.length||items.length>24)throw new Error('report-structure');
 const ids=new Set(records.map(r=>r.id)),covered=new Set();
 let totalLength=0;
 const sections=items.map((section,index)=>{
  if(!section||typeof section!=='object')throw new Error('report-structure');
  const rawTitle=section.title??section.heading;
  if(rawTitle!==undefined&&rawTitle!==null&&typeof rawTitle!=='string')throw new Error('report-title');
  const title=rawTitle?.trim()||['전체 돌봄 모습','주요 돌봄 양상','확인 범위'][index]||'추가 내용';
  if(title.length>200)throw new Error('report-title');
  const rawText=section.text??section.content;
  const paragraphs=Array.isArray(rawText)&&rawText.every(p=>typeof p==='string')?rawText.join('\n\n'):rawText;
  if(typeof paragraphs!=='string'||!paragraphs.trim())throw new Error('report-text');
  const text=normalizeReportText(paragraphs);totalLength+=text.length;
  if(totalLength>24000)throw new Error('invalid-report-length');
  // A whole-period reference must be explicit; never guess missing evidence.
  const rawIds=section.recordIds;
  if(!Array.isArray(rawIds)||!rawIds.length)throw new Error('report-evidence-missing');
  let recordIds=[];
  for(const raw of rawIds){
   if(typeof raw==='string'&&raw.trim().toUpperCase()==='ALL'){
    if(index!==0&&!/확인\s*범위/u.test(title))throw new Error('report-evidence-unknown');
    recordIds.push(...records.map(r=>r.id));continue;
   }
   if(typeof raw!=='string'&&!(typeof raw==='number'&&Number.isInteger(raw)&&raw>0))throw new Error('report-evidence-unknown');
   const clean=String(raw).trim();
   const alias=/^r\d+$/iu.test(clean)?clean.toUpperCase():/^\d+$/u.test(clean)?`R${clean}`:clean;
   const id=aliases.get(alias)??clean;
   if(!ids.has(id))throw new Error('report-evidence-unknown');recordIds.push(id);
  }
  recordIds=[...new Set(recordIds)];
  const selected=new Set(recordIds),sources=records.filter(record=>selected.has(record.id));
  // Check high-risk added facts against the cited originals, not word overlap.
  validateSummaryEvidence(text,sources);
  if(recordIds.length<2){
   const multipleRecords=/여러\s*(?:날짜|기록)|서로\s*다른\s*(?:날짜|기록)/u.test(text);
   const repeatedEvent=/반복(?:해서|적으로|되|됐|했|된|하는)|여러\s*차례|거듭/u.test(text);
   if(multipleRecords||repeatedEvent&&!hasRepeatedObservation(sources))throw new Error('report-repetition');
  }
  recordIds.forEach(id=>covered.add(id));
  // Optional UI metadata must not invalidate otherwise grounded prose.
  const repeated=section.repeated===true&&recordIds.length>=2;
  return {title,text,recordIds,repeated};
 });
 if(covered.size!==ids.size)throw new Error('missing-evidence');
 return {sections};
}
