import { AI_NOTICE, type CareReport } from './ai-model';
import { typeLabel, type SituationType } from './situation-model';
export function escapeHTML(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function reportHTML(report:CareReport){
 const e=escapeHTML;
 return `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
 @page{size:A4;margin:18mm 15mm}body{font-family:-apple-system,BlinkMacSystemFont,'Noto Sans CJK KR','Malgun Gothic',sans-serif;font-size:14pt;line-height:1.75;color:#172b24;word-break:normal;overflow-wrap:anywhere}h1{font-size:24pt}h2{font-size:18pt;margin-top:24pt;break-after:avoid;page-break-after:avoid}p{white-space:pre-wrap;orphans:3;widows:3}header{break-inside:avoid}small{font-size:11pt}.evidence{font-size:11pt;color:#455b51}footer{margin-top:24pt;border-top:1px solid #aaa;padding-top:12pt;font-size:11pt}</style></head><body>
 <header><h1>돌봄기록 종합 보고서</h1><p>보고서 기간: ${e(report.from)} ~ ${e(report.to)}<br>분석한 기록 수: ${report.records.length}건<br>보고서 생성일: ${e(new Date(report.createdAt).toLocaleString('ko-KR'))}</p></header>
 <p>기록된 내용만 정리한 자료예요. 기록이 없는 날의 상태는 알 수 없어요.${report.records.length<3?' 기록이 적어 자료가 부족해요.':''}</p>
 ${report.sections.map(s=>`<section><h2>${e(s.title)}</h2><p>${e(s.text)}</p></section>`).join('')}
 <h2>근거 기록</h2>${report.sections.map(s=>`<section><h2>${e(s.title)}의 근거</h2><p class="evidence">기록 ${s.recordIds.length}건 / 기록 날짜 ${new Set(s.recordIds.map(id=>report.records.find(r=>r.id===id)!.date)).size}일<br>${s.recordIds.map(id=>{const index=report.records.findIndex(r=>r.id===id),r=report.records[index];return `<a href="#record-${index}">${e(r.date)} ${e(typeLabel(r.type as SituationType))} [${e(id)}]</a>`;}).join('<br>')}</p></section>`).join('')}
 <h2>근거 원문</h2>${report.records.map((r,index)=>`<section id="record-${index}"><h2>${e(r.date)} ${e(typeLabel(r.type as SituationType))}</h2><small>기록 ID: ${e(r.id)}</small><p>${e(r.body)}</p></section>`).join('')}
 <footer>${e(AI_NOTICE)}</footer></body></html>`;
}
