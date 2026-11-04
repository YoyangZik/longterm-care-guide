import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { CareReport } from './ai-model';
import { reportHTML } from './report-html';
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
 const html=reportHTML(report);
 if(action==='print'||Platform.OS==='web')return printReport(html);
 const {uri}=await Print.printToFileAsync({html,width:595,height:842});
 try{
  if(action==='share'){if(!await Sharing.isAvailableAsync())throw new Error('이 기기에서 공유를 사용할 수 없어요.');await Sharing.shareAsync(uri,{mimeType:'application/pdf',UTI:'.pdf',dialogTitle:'돌봄기록 종합 보고서'});return '공유 화면에서 보낼 곳이나 파일 저장을 선택해주세요.';}
  const directory=Platform.OS==='android'?await Directory.pickDirectoryAsync():new Directory(Paths.document,'reports');
  if(Platform.OS!=='android')directory.create({intermediates:true,idempotent:true});
  const output=new File(directory,`돌봄기록-${report.from}-${report.to}-${report.id}.pdf`);await new File(uri).copy(output,{overwrite:true});
  if(Platform.OS==='ios')await Sharing.shareAsync(output.uri,{mimeType:'application/pdf',UTI:'.pdf',dialogTitle:'파일에 저장'});
  return 'PDF 저장 위치: '+output.uri;
 }finally{try{new File(uri).delete();}catch{/* Cache cleanup must not turn a successful save into a failure. */}}
}
