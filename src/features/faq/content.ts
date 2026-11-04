import type { StageId } from '../trial/stages';
import type { OfficialSource } from '@/components/official-source-links';
import { medicalSources } from '../medical/sources';
const easy=(ccf:number,cci:number,cnp:number)=>`https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=${ccf}&cciNo=${cci}&cnpClsNo=${cnp}&csmSeq=2038&popMenu=ov`;
const source=(label:string,url:string):OfficialSource=>({label,url,checkedOn:'2026-11-04'});
const investigation=source('생활법령정보 인정 조사',easy(2,1,2));
const application=source('생활법령정보 인정 신청',easy(2,1,1));
const result=source('생활법령정보 결과 수령과 심사청구',easy(2,2,2));
const duration=source('노인장기요양보험법 제16조','https://www.law.go.kr/LSW/lsLinkProc.do?chrClsCd=010202&datClsCd=010102&joNo=001600&lsNm=노인장기요양보험법&mode=10');
const appeal=source('노인장기요양보험법 제55조','https://www.law.go.kr/LSW/lsLinkProc.do?chrClsCd=010202&datClsCd=010102&joNo=005500&lsNm=노인장기요양보험법&mode=10');
const contract=source('생활법령정보 장기요양급여 계약',easy(3,2,2));
export type FaqLink='questions'|'records'|'visit'|'medical'|'services';
export type FaqItem={id:string;question:string;answer:string;detail:string;action:string;stages:StageId[];priority:number;kind:'practical'|'policy';questionOrigin:'provided-handover';sources:OfficialSource[];links:FaqLink[]};
const item=(id:string,question:string,answer:string,detail:string,action:string,stages:StageId[],priority:number,kind:FaqItem['kind'],sources:OfficialSource[],links:FaqLink[]=[]):FaqItem=>({id,question,answer,detail,action,stages,priority,kind,questionOrigin:'provided-handover',sources,links});
export const faqItems:FaqItem[]=[
 item('companion','방문조사 때 보호자가 꼭 함께 있어야 하나요?','평소 상태와 실제 도움을 잘 아는 분이 함께하면 설명에 도움이 될 수 있어요.','특정 가족의 동석을 일괄적인 필수 조건으로 보지는 않아요. 조사는 신청인의 상태를 확인하는 절차이므로 보호자만 있으면 된다고 생각하지는 마세요.','참석이 어렵다면 일정 연락을 받을 때 상황을 알리고, 평소 돌봄을 설명할 방법을 담당자와 상의해 보세요.',['awaiting-assessment'],1,'practical',[investigation]),
 item('different-day','조사 당일에는 평소보다 잘하시면 어떡하나요?','당일 모습과 평소 모습의 차이를 구체적으로 설명해 보세요.','어떤 때 어떤 동작을 도와드렸는지 떠올리면 좋아요. 당일 유난히 힘드신 경우에도 평소와 다른 점을 함께 말해주세요. 일부러 못 하게 하거나 상태를 나쁘게 보이게 할 필요는 없어요.','기억나는 실제 돌봄 상황 한 가지를 떠올려보세요.',['awaiting-assessment'],2,'practical',[investigation],['questions','records']),
 item('independent','어르신이 “혼자 다 한다”고 하시는데 어떻게 설명하나요?','혼자 하시는 부분과 실제로 도와드리는 부분을 나눠 이야기해 보세요.','예를 들어 “혼자 드시지만 반찬은 잘라드려요”처럼 말할 수 있어요. 어르신과 맞다 틀리다를 다툴 필요는 없어요.','함께 말씀드리기 어려운 내용은 별도로 설명할 수 있을지 담당자에게 요청해 보세요. 별도 면담이 반드시 제공되는 것은 아니에요.',['awaiting-assessment'],3,'practical',[investigation]),
 item('work','직장 때문에 방문 시간에 참석하기 어려워요.','가능한 시간과 돌봄 상황을 미리 알려 일정을 협의해 보세요.','특정 시간이나 주말, 야간 방문이 보장되지는 않아요. 앱에 저장한 날짜를 바꿔도 공단의 방문 일정은 변경되지 않아요.','일정 연락을 받으면 참석 가능한 시간대를 담당자에게 알려주세요.',['awaiting-assessment'],4,'practical',[investigation],['visit']),
 item('hospital','입원 중이거나 다른 가족 집에 계시면 어떻게 하나요?','실제로 머무는 장소와 입원이나 퇴원 예정을 먼저 알려주세요.','상태와 회복 경과에 따라 조사 장소와 일정 확인이 필요해요. 입원 중이라는 이유만으로 조사 가능 여부나 기다릴 기간을 일괄적으로 판단할 수는 없어요. 인정 신청과 입원 중 급여 이용도 다른 문제예요.','조사 담당자에게 현재 머무는 곳을 알리고 방문 장소와 일정을 확인해 주세요.',['before-application','awaiting-assessment'],5,'practical',[investigation]),
 item('record-required','돌봄기록이나 사진을 꼭 제출해야 하나요?','앱 기록과 개인 메모를 법정 필수 제출서류로 준비할 필요는 없어요.','평소 상태를 설명할 참고자료로 활용할 수 있어요. 앱 기록은 공단에 자동 제출되지 않고 사진이나 기록이 등급을 보장하지도 않아요.','자료를 전달하고 싶다면 담당자에게 전달 방법과 추가 자료가 필요한지 확인해 주세요.',['awaiting-assessment'],6,'practical',[application,investigation],['records']),
 item('diagnosis','진단서가 있으면 의사소견서는 따로 필요 없나요?','일반 진단서와 장기요양 의사소견서는 구분해 확인해야 해요.','65세 미만 신청자의 노인성 질병 확인서류와 의사소견서 제출은 별개예요. 제출 제외 여부는 스스로 판단하지 말고 공단에서 안내받은 내용을 확인해 주세요.','발급의뢰서와 개인별 제출기한 등 실제로 안내받은 내용을 확인해 주세요.',['before-application','awaiting-assessment','awaiting-result'],7,'policy',[...medicalSources],['medical']),
 item('late-appointment','병원에서 소견서를 못 써준다고 하거나 예약이 늦어져요.','의료기관의 발급 가능 여부와 예약일을 확인한 뒤 기한 전에 담당자와 상의해 주세요.','기한이 자동 연장되거나 다른 병원에서 반드시 발급되는 것은 아니에요. 일반 진단서로 대신 제출해도 된다고 생각하지는 마세요.','발급이 어려운 이유와 예상 일정을 공단 담당자에게 알려 제출 방법과 일정을 확인해 주세요.',['awaiting-assessment','awaiting-result'],8,'practical',[...medicalSources],['medical']),
 item('transmitted','병원에서 소견서를 보냈다는데 제출됐는지 어떻게 확인하나요?','의료기관의 발급과 전송, 공단의 접수를 나눠 확인해 주세요.','앱의 “제출했어요”는 개인 표시이며 실제 접수를 조회한 결과는 아니에요.','의료기관에서 전송 여부를 확인한 뒤, 공단에 접수와 추가 보완 필요 여부를 확인해 주세요.',['awaiting-result'],9,'practical',[...medicalSources],['medical']),
 item('waiting','방문조사 후 며칠이 지났는데 결과가 안 나와요.','판정기간은 방문일이 아니라 신청서 제출일을 기준으로 해요.','원칙적으로 신청서 제출일부터 30일 이내에 판정하며, 정밀조사 등 부득이한 사유가 있으면 30일 이내 범위에서 연장될 수 있어요. 판정 완료와 결과 수령은 같은 날짜라고 보장할 수 없어요.','공단에 소견서 접수와 보완서류, 현재 진행 상태 및 결과를 안내받을 연락처를 함께 확인해 주세요.',['awaiting-result'],10,'policy',[duration,result]),
 item('changed','신청 후 상태가 달라지거나 다시 입원했어요.','언제부터 무엇이 달라졌는지 담당자에게 알려주세요.','진행 중인 신청을 무조건 새로 시작할 필요가 있다고 단정하지는 마세요. 현재 상황에 따라 일정이나 추가 자료 확인이 필요할 수 있어요.','달라진 날짜와 실제로 필요한 도움을 정리해 담당자에게 전달해 주세요.',['awaiting-assessment','awaiting-result'],11,'practical',[investigation],['records']),
 item('unexpected-result','결과가 예상과 다르면 바로 다시 신청해야 하나요?','결정에 대한 심사청구와 이후 상태 변화에 따른 등급변경 신청은 목적이 달라요.','심사청구는 처분을 안 날부터 90일 이내에 문서로 하며, 처분일부터 180일이 지나면 제기하지 못하는 것이 원칙이에요. 정당한 사유로 기간 안에 청구하지 못했음을 증명하는 경우 예외가 있어요. 등급외 판정 등 상황에 따라 확인할 절차도 달라요.','통지서의 처분 내용과 날짜를 확인하고 본인에게 맞는 절차와 기한을 공단에 확인해 주세요.',['result-received'],12,'policy',[appeal,result]),
 item('service-start','등급을 받으면 요양보호사가 자동으로 오나요?','등급을 받은 뒤에도 이용할 기관과 상담하고 계약하는 과정이 필요해요.','인정서와 개인별장기요양이용계획서의 이용 안내를 살펴보세요. 의료급여수급권자 등은 별도의 신청과 승인 절차도 확인해야 해요. 앱이 기관을 배정하지는 않아요.','이용할 기관에 서비스 내용과 가능 일정, 비용을 상담해 보세요.',['result-received'],13,'policy',[contract],['services']),
];
export function faqGroups(stage:StageId){const ordered=[...faqItems].sort((a,b)=>a.priority-b.priority);return [{title:'현재 단계에서 궁금한 점',items:ordered.filter(item=>item.stages.includes(stage))},{title:'다른 질문',items:ordered.filter(item=>!item.stages.includes(stage))}];}
