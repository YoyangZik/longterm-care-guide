import { AI_NOTICE, type CareReport } from './ai-model';
import { reportParagraphs } from './report-presentation';
export function escapeHTML(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function reportHTML(report:CareReport){
 const e=escapeHTML;
 return `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
 @page{size:A4;margin:18mm 15mm}body{font-family:-apple-system,BlinkMacSystemFont,'Noto Sans CJK KR','Malgun Gothic',sans-serif;font-size:14pt;line-height:1.75;color:#172b24;word-break:keep-all;overflow-wrap:anywhere}h1{font-size:24pt;line-height:1.35;margin:0 0 16pt}h2{font-size:18pt;margin:24pt 0 12pt;break-after:avoid;page-break-after:avoid}h3{font-size:12.5pt;margin:18pt 0 8pt;break-after:avoid;page-break-after:avoid}p{white-space:pre-wrap;orphans:3;widows:3;margin:0 0 .9em}header{break-inside:avoid;margin-bottom:18pt}.evidence,.appendix{font-size:12pt;line-height:1.65;color:#455b51}.evidence{margin-top:8pt}.appendix{border-top:1px solid #ccc;margin-top:28pt;padding-top:8pt}.appendix h2{font-size:15pt}.appendix ol{padding-left:22pt}.appendix li{margin-bottom:5pt;break-inside:avoid}a{color:inherit;text-decoration:none}footer{margin-top:24pt;border-top:1px solid #aaa;padding-top:12pt;font-size:11pt}</style></head><body>
 <header><h1>돌봄기록 종합 보고서</h1><p>보고서 기간: ${e(report.from)} ~ ${e(report.to)}<br>분석한 기록 수: ${report.records.length}건<br>보고서 생성일: ${e(new Date(report.createdAt).toLocaleString('ko-KR'))}</p></header>
 <p>기록된 내용만 정리한 자료예요. 기록이 없는 날의 상태는 알 수 없어요.${report.records.length<3?' 기록이 적어 자료가 부족해요.':''}</p>
 ${report.sections.map(s=>`<section><h2>${e(s.title)}</h2>${reportParagraphs(s.text).map(p=>`<p>${e(p)}</p>`).join('')}</section>`).join('')}
 <footer>${e(AI_NOTICE)}</footer></body></html>`;
}
