import { hasAccessCode, hasConsent, readReportLibrary } from './ai-client';
import { listSituations } from './situation-storage';

// A failed library read must not erase independently restored consent or credentials.
export async function loadReportState(){
 const [records,library,consent,access]=await Promise.allSettled([
  listSituations(),readReportLibrary(),hasConsent(),hasAccessCode(),
 ]);
 return {
  rows:records.status==='fulfilled'?records.value:null,
  library:library.status==='fulfilled'?library.value:null,
  agreed:consent.status==='fulfilled'?consent.value:null,
  registered:access.status==='fulfilled'?access.value:null,
 };
}
export type ReportState=Awaited<ReturnType<typeof loadReportState>>;
export const emptyReportState:ReportState={rows:null,library:null,agreed:null,registered:null};
export function reportReadiness(state:ReportState,count:number,serverURL:string,web:boolean){
 const issues:string[]=[];
 if(state.rows===null)issues.push('저장된 돌봄기록을 읽지 못했어요. 다시 불러와주세요.');
 else if(!count)issues.push('선택한 기간에 저장된 돌봄기록이 없어요. 기간을 바꾸거나 기록을 남겨주세요.');
 if(state.library===null)issues.push('저장된 보고서 목록을 읽지 못했어요. 기존 자료를 덮어쓰지 않도록 새 생성을 중단했어요. 다시 불러와주세요.');
 if(state.agreed===null)issues.push('AI 이용 동의 상태를 읽지 못했어요. 다시 불러와주세요.');
 else if(!state.agreed)issues.push('AI 외부 전송 동의가 필요해요. AI 이용 설정에서 안내를 확인해주세요.');
 if(state.registered===null)issues.push('접근 코드 저장 상태를 읽지 못했어요. 다시 불러와주세요.');
 else if(!state.registered)issues.push(web?'웹에서는 접근 코드를 현재 실행 중에만 보관해요. 새로고침하거나 다시 열었다면 AI 이용 설정에서 코드를 다시 등록해주세요.':'등록된 접근 코드가 없어요. AI 이용 설정에서 접근 코드를 등록해주세요.');
 if(!/^https:\/\//.test(serverURL))issues.push('AI 중계 서버가 설정되지 않았어요. 저장된 보고서와 PDF는 이용할 수 있어요.');
 return {canGenerate:issues.length===0,issues,readFailed:state.rows===null||state.library===null||state.agreed===null||state.registered===null};
}
