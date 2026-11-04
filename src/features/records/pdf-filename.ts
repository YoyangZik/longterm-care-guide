export function pdfFilename(from:string,to:string,now=new Date(),suffix=0){
 const stamp=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('');
 const time=[now.getHours(),now.getMinutes(),now.getSeconds()].map(v=>String(v).padStart(2,'0')).join('');
 return `돌봄기록_종합보고서_${from.replace(/-/g,'')}-${to.replace(/-/g,'')}_생성${stamp}_${time}${suffix?`_${suffix}`:''}.pdf`;
}
