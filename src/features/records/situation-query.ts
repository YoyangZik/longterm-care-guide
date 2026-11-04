import { situationTypes, type SituationRecord, type SituationType } from './situation-model';
import { validDate } from './calendar';
import { localDate } from './time';
import { generatedBody } from './situation-model';
import { politeTemplate } from './summary-tone';
import { previewBody } from './demo-label';

export type ReviewPeriod=7|30|90|'all';
export function reviewRange(period:ReviewPeriod,today=localDate()){
 if(!validDate(today))throw new Error('Invalid today');
 if(period==='all')return {from:'',to:today};
 if(![7,30,90].includes(period))throw new Error('Invalid period');
 const [year,month,day]=today.split('-').map(Number);
 return {from:localDate(new Date(year,month-1,day-(period-1),12)),to:today};
}
export function firstRecordSentence(body:string){
 const line=body.trim().split(/\r?\n/).find(line=>line.trim())?.trim()??'';
 // Extract only; never reinterpret or paraphrase free writing.
 return line.match(/^.*?[.!?。！？](?=\s|$)/)?.[0]??line;
}
export function recordOneLine(record:SituationRecord){
 const body=previewBody(record);
 if(record.aiSummary?.status==='pending')return '요약 중…';
 if(record.aiSummary?.status==='ready'&&record.aiSummary.text)return record.aiSummary.text;
 if(record.aiSummary?.status==='failed')return firstRecordSentence(body);
 if(record.method!=='questions'||record.edited||record.body!==record.generated||generatedBody(record)!==record.body)return firstRecordSentence(body);
 const {event,help,difficulty}=record.answers;
 if(!event?.trim())return firstRecordSentence(body);
 const knownEvent=record.questionSnapshot.find(q=>q.id==='event')?.choices.some(c=>c.text===event);
 // Only a known template's neutral ending is shortened. User words, negation
 // and uncertainty remain verbatim; multiple actual helps retain their order.
 const situation=knownEvent?event.replace(/의 일이었다\.$/,''):event;
 const contexts:Record<string,string>={
  '침대에서 일어나실 때':'침대에서 일어날 때',
  '의자나 침대로 옮겨 앉으실 때':'의자나 침대로 옮겨 앉을 때',
  '집 안에서 걸으실 때':'집 안에서 걸을 때',
  '집 밖에서 이동하실 때':'집 밖에서 이동할 때',
  '식사를 시작하실 때':'식사를 시작할 때',
  '물을 드실 때':'물을 드실 때',
  '세수나 양치를 하실 때':'세수나 양치를 할 때',
  '몸을 씻으실 때':'몸을 씻을 때',
  '씻은 뒤 옷을 챙기실 때':'씻은 뒤 옷을 챙길 때',
  '화장실로 가실 때':'화장실로 갈 때',
  '화장실에서 앉거나 일어나실 때':'화장실에서 앉거나 일어날 때',
  '화장실에서 옷 정리나 뒤처리를 하실 때':'화장실에서 옷 정리나 뒤처리를 할 때',
 };
 const selected=help||difficulty;
 const question=record.questionSnapshot.find(q=>q.id===(help?'help':'difficulty'));
 const lines=selected?.split('\n')??[];
 // Compose only recognized choices. Unknown answers and uncertainty stay verbatim.
 if(knownEvent&&contexts[situation]&&lines.length&&lines.every(line=>question?.choices.some(c=>c.text===line&&!c.exclusive))){
  return contexts[situation]+' '+lines.map(politeTemplate).join(' ');
 }
 return [situation,selected].filter(Boolean).join(', ').replace(/\r?\n/g,', ');
}

export type RecordQuery={type:SituationType|'all';from:string;to:string};
export function querySituations(records:SituationRecord[],query:RecordQuery){
 if(query.from&&!validDate(query.from)||query.to&&!validDate(query.to)||query.from&&query.to&&query.from>query.to)throw new Error('Invalid date range');
 return records.filter(r=>r.status==='saved'&&(query.type==='all'||r.type===query.type)&&(!query.from||r.date>=query.from)&&(!query.to||r.date<=query.to)).sort((a,b)=>b.date.localeCompare(a.date)||(b.savedAt??b.createdAt).localeCompare(a.savedAt??a.createdAt)||b.createdAt.localeCompare(a.createdAt));
}
export function situationsOnDay(records:SituationRecord[],date:string,featured?:string){
 const selected=querySituations(records,{type:'all',from:date,to:date});
 return featured?selected.sort((a,b)=>Number(b.id===featured)-Number(a.id===featured)):selected;
}
export function situationSummary(records:SituationRecord[],query:RecordQuery){
 const selected=querySituations(records,query);
 return {total:selected.length,from:query.from||selected.at(-1)?.date||null,to:query.to||selected[0]?.date||null,groups:situationTypes.map(type=>({type:type.id,label:type.label,records:selected.filter(r=>r.type===type.id)})).filter(group=>group.records.length)};
}
