import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { CareReport } from './ai-model';
import { reportHTML } from './report-html';
import { dataTask } from '../reset/gate';
import { pdfFilename } from './pdf-filename';
async function printReport(html:string){
 try{await Print.printAsync({html});return Platform.OS==='ios'?'인쇄 요청을 완료했어요.':'인쇄 화면을 열었어요. 인쇄하거나 PDF로 저장해주세요.';}
 catch(error){
  const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
  const message=error instanceof Error?error.message:'';
  // Expo iOS rejects a closed print sheet even when no printer error occurred.
  if(Platform.OS==='ios'&&(code==='ERR_PRINT_INCOMPLETE'||message==='Printing did not complete'))return '인쇄를 취소했어요. 저장된 보고서는 그대로예요.';
  throw new Error('인쇄를 완료하지 못했어요. 프린터 연결을 확인하거나 PDF 공유와 파일 저장을 이용해주세요. 저장된 보고서는 그대로예요.');
 }
}
export async function exportReport(report:CareReport,action:'share'|'print'|'save'){
 return dataTask(async()=>{try{return await exportReportFile(report,action);}catch(error){const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';const message=error instanceof Error?error.message:'';if(/cancel/i.test(code+' '+message))return '내보내기를 취소했어요. 저장된 보고서는 그대로예요.';if(/[가-힣]/.test(message))throw error;throw new Error('PDF를 만들거나 내보내지 못했어요. 저장된 보고서는 그대로예요. 다시 시도해주세요.');}});
}
async function exportReportFile(report:CareReport,action:'share'|'print'|'save'){
 const html=reportHTML(report);
 if(action==='print'||Platform.OS==='web')return printReport(html);
 const {uri}=await Print.printToFileAsync({html,width:595,height:842});
 try{
  if(action==='share'){
   if(!await Sharing.isAvailableAsync())throw new Error('이 기기에서 공유를 사용할 수 없어요.');
   const now=new Date();let suffix=0;let shared=new File(Paths.cache,pdfFilename(report.from,report.to,now));
   while(shared.exists){if(++suffix>1000)throw new Error('공유할 파일을 만들지 못했어요. 잠시 후 다시 시도해주세요.');shared=new File(Paths.cache,pdfFilename(report.from,report.to,now,suffix));}
   try{await new File(uri).copy(shared,{overwrite:false});await Sharing.shareAsync(shared.uri,{mimeType:'application/pdf',UTI:'.pdf',dialogTitle:'돌봄기록 종합 보고서'});return 'PDF를 만들었어요. 공유 화면에서 보낼 곳이나 파일에 저장을 선택해주세요.';}
   finally{try{shared.delete();}catch{/* Temporary file cleanup is best effort. */}}
  }
  let directory:Directory;
  try{directory=Platform.OS==='android'?await Directory.pickDirectoryAsync():new Directory(Paths.document,'reports');}
  catch(error){const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';const message=error instanceof Error?error.message:'';if(/cancel/i.test(code+' '+message))return '파일 저장을 취소했어요. 저장된 보고서는 그대로예요.';throw new Error('저장할 폴더를 열지 못했어요. 다시 선택해주세요.');}
  if(Platform.OS!=='android')directory.create({intermediates:true,idempotent:true});
  const now=new Date();let suffix=0;let output=new File(directory,pdfFilename(report.from,report.to,now));
  while(output.exists){if(++suffix>1000)throw new Error('같은 이름의 파일이 많아 저장하지 못했어요. 다른 폴더를 선택해주세요.');output=new File(directory,pdfFilename(report.from,report.to,now,suffix));}
  await new File(uri).copy(output,{overwrite:false});
  if(Platform.OS==='ios')await Sharing.shareAsync(output.uri,{mimeType:'application/pdf',UTI:'.pdf',dialogTitle:'파일에 저장'});
  return Platform.OS==='ios'?'앱 안에 PDF 사본을 만들었어요. 파일 앱에 보관하려면 공유 화면에서 파일에 저장을 선택해주세요.':`선택한 폴더에 ${output.name??pdfFilename(report.from,report.to,now,suffix)} 파일을 저장했어요.`;
 }finally{try{new File(uri).delete();}catch{/* Cache cleanup must not turn a successful save into a failure. */}}
}
