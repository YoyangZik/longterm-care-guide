export function summaryReadiness(agreed:boolean|null,registered:boolean|null,serverURL:string,readFailed=false){
 if(readFailed)return {ready:false,message:'AI 이용 상태를 읽지 못했어요. 다시 확인해주세요.'};
 if(agreed===null||registered===null)return {ready:false,message:'AI 이용 상태를 확인하고 있어요.'};
 if(!/^https:\/\//.test(serverURL))return {ready:false,message:'AI 중계 서버가 설정되지 않았어요. 원본 기록은 그대로 볼 수 있어요.'};
 if(!agreed)return {ready:false,message:'AI 외부 전송에 동의하지 않아 요약이 꺼져 있어요. 원본 기록은 그대로 이용할 수 있어요.'};
 if(!registered)return {ready:false,message:'저장된 접근 코드가 없어 요약을 만들 수 없어요. AI 이용 설정에서 코드를 등록해주세요.'};
 return {ready:true,message:''};
}
