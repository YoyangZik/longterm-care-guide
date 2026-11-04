import type { CareReport } from './ai-model';
// Display-only: preserve existing prose and single line breaks, split explicit paragraphs.
export function reportParagraphs(text:string){
 return text.replace(/\r\n?/g,'\n').split(/\n[\t ]*\n+/).map(p=>p.trim()).filter(Boolean);
}
export function reportReferences(report:CareReport,ids:string[]){
 if(ids.length===report.records.length&&report.records.every(r=>ids.includes(r.id)))return `전체 기록 ${report.records.length}건`;
 const numbers=ids.map(id=>report.records.findIndex(r=>r.id===id)+1).sort((a,b)=>a-b),ranges:string[]=[];
 for(let i=0;i<numbers.length;i++){const start=numbers[i];let end=start;while(numbers[i+1]===end+1)end=numbers[++i];ranges.push(start===end?String(start):`${start}-${end}`);}
 return '기록 '+ranges.join(', ');
}
