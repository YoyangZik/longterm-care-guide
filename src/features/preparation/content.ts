import type { StageId } from '../trial/stages';
import { entryKey, preparationScope, type Preparation } from './model';
import { medicalEntryStatus } from '../medical/model';
export const checkedOn='2026-11-03';
const application='https://www.longtermcare.or.kr/npbs/e/b/201/npeb201m01.web?menuId=npe0000000080';
const easy=(ccf:number,cci:number,cnp:number)=>`https://www.easylaw.go.kr/CSP/CnpClsMain.laf?csmSeq=2038&ccfNo=${ccf}&cciNo=${cci}&cnpClsNo=${cnp}&popMenu=ov`;
const law='https://www.law.go.kr/법령/노인장기요양보험법';
export type Source={label:string;url:string;checkedOn:string};
const sources={application:{label:'공단 인정 신청, 이용 절차',url:application,checkedOn},request:{label:'생활법령, 인정 신청',url:easy(2,1,1),checkedOn},visit:{label:'생활법령, 인정 조사',url:easy(2,1,2),checkedOn},result:{label:'생활법령, 결과 수령',url:easy(2,2,2),checkedOn},service:{label:'생활법령, 기관 선택',url:easy(3,2,1),checkedOn},law:{label:'국가법령정보센터, 노인장기요양보험법',url:law,checkedOn}};
export type PreparationItem={kind:'check'|'prepare';id:string;title:string;body:string[];optional:boolean;source:Source;editor?:'opinion'|'deadline';links?:{label:string;url:string}[]};
const item=(id:string,title:string,body:string[],source:keyof typeof sources,optional=false,extra:Partial<PreparationItem>={}):PreparationItem=>({kind:['documents','medical','requested'].includes(id)?'prepare':'check',id,title,body,optional,source:sources[source],...extra});
const medical=item('medical','의사소견서 준비 방법 확인',[
  '일반 진단서와 장기요양 의사소견서는 다른 서류예요. 정해진 소견서 서식과 제출 방법을 공단에 확인하세요.',
  '의사소견서는 원칙적으로 필요하지만 법령에 따른 제출 제외가 있어요. 앱이 제외 여부를 판단하지 않으니 공단에 확인해주세요. 안내받은 상태는 방문 전에도 기록할 수 있어요.',
  '의사소견서는 신청할 때 함께 내거나 공단이 등급판정위원회에 심의자료를 제출하기 전까지 낼 수 있어요. 공단이 안내한 개인별 제출기한을 꼭 확인하세요. 제출 대상자가 내지 않으면 등급판정을 진행할 수 없어요.',
  '공단의 의사소견서 발급의뢰서와 병원에서 작성한 의사소견서는 달라요. 발급의뢰서를 받았다면 의료기관에 가져가세요. 의뢰서 없이 발급받으면 우선 전액을 부담할 수 있고, 공단부담금 청구 가능 여부는 공단에 확인하세요.',
  '치매진단 관련 보완서류가 필요하다고 안내받았다면 함께 준비하세요. 누구에게나 같은 추가 서류가 필요한 것은 아니에요.',
], 'application',false,{editor:'opinion'});
const method=item('method','신청 방법 확인',[
  '공단 방문, 우편이나 팩스, 인터넷 등 신청 방법을 확인하세요. 인터넷이나 앱은 신청 종류와 대상에 제한이 있어요. 65세 미만 최초 신청이나 재신청과 외국인은 인터넷이나 앱 신청이 제한됩니다.',
  '갱신은 본인 확인 후 유선 신청이 가능한 경우가 있어요. 일반 전화 문의를 신청 접수 완료로 생각하지 마세요. 공식 사이트에서 본인에게 가능한 경로를 확인해주세요.',
], 'application',false,{links:[{label:'공단 신청 경로 열기',url:application}]});
const documents=item('documents','신청서와 상황별 서류 확인',[
  '장기요양인정 신청서와 신분 확인 자료를 준비하세요. 본인 신청이나 대리 신청과 접수 방법에 따라 필요한 자료가 달라요.',
  '65세 미만으로 신청할 때 의사소견서를 함께 내지 않는다면 노인성 질병을 확인할 진단서 등 증명서류가 필요해요. 세부 서류는 최신 공식 안내와 공단의 안내를 확인하세요.',
  '방문 신청 때는 신분증을 제시하고, 우편이나 팩스로 신청할 때는 신분증 사본을 제출해요. 대리 신청에 필요한 신분증, 대리인 지정 자료는 대리인 유형에 따라 달라요.',
], 'request');
const consult=item('consult','문의할 내용 정리',['내 상황에서 확인하고 싶은 내용을 메모해두세요. 이름이나 주민등록번호 같은 불필요한 개인정보는 적지 않아도 돼요.'], 'request',true);
const one:Record<string,PreparationItem[]>={
  first:[item('eligibility','신청 대상 확인',['65세 이상 또는 65세 미만의 법령상 노인성 질병이 있는 사람이면서 장기요양보험 가입자, 피부양자 또는 의료급여수급권자 등에 해당하는지 확인해요. 신청 자격과 실제 등급 인정은 별개예요. 등급판정에서는 6개월 이상 혼자 일상생활을 수행하기 어려운지 등을 판단해요. 이미 6개월을 기다려야 신청할 수 있다는 뜻은 아니에요.'], 'request'),method,documents,consult],
  renewal:[item('renewal','인정 유효기간과 갱신 확인',['유효기간 뒤에도 급여를 계속 받으려는 경우의 갱신 절차예요. 공단 안내상 유효기간 종료 90일 전부터 30일 전까지 신청하며, 인정서의 유효기간과 본인에게 적용되는 일정을 확인하세요.'], 'application'),method,documents,consult],
  change:[item('change','상태 변화와 등급변경 절차 확인',['급여를 받는 동안 신체나 정신 상태가 달라져 등급 변경이 필요한 경우의 절차예요. 갱신이나 결과에 대한 심사청구와 구분하고, 달라진 상황과 필요한 서류를 공단에 확인하세요.'], 'request'),method,documents,consult],
  reapply:[item('reapply','이전 결과와 새 신청 목적 확인',['이전 결과 통지 내용을 확인하고 새 인정 신청이 필요한 상황인지 공단에 문의하세요. 이전 처분을 다투는 심사청구와 새 신청은 서로 다른 절차이며 앱이 어느 절차를 택할지 결정하지 않아요.'], 'law'),method,documents,consult],
};
const two=[
  item('visit-check','일정과 장소, 동석 확인',['공단에서 안내한 조사 일시, 장소를 확인하고 변경이 필요하면 담당자와 협의하세요. 함께 상황을 설명할 사람이 있다면 동석 가능 여부와 준비사항을 미리 문의하세요.'], 'visit'),
  item('care-review','평소 돌봄 상황 정리',['관찰한 상황과 실제 제공한 도움을 있는 그대로 설명할 준비를 해요. 기존 돌봄일지는 기억을 정리할 개인 참고자료이며 공식 제출, 채택을 보장하지 않아요. 위험한 동작을 시험하거나 과장, 연출할 필요는 없어요.'], 'visit'),
  item('requested','안내받은 준비물, 서류 메모',['공단이 개별적으로 요청한 준비물과 서류를 적고 확인하세요. 모든 사람에게 같은 추가 서류가 필요하다고 가정하지 않아요.'], 'visit',true),
  {...medical,optional:true},
  item('visit-questions','방문조사 후 확인할 내용',['방문조사 후 의사소견서나 추가 자료, 다음 연락 방법 등에 관해 물어볼 내용을 미리 적어두세요. 방문 뒤에는 조사 자료와 소견서 등을 토대로 등급판정 절차가 이어져요.'], 'visit',true),
];
const three=[
  {...medical,title:'의사소견서 상태 확인'},
  item('result-route','결과 확인 경로 알아두기',['공단이 안내한 결과 수령 방법과 연락처를 확인하세요. 공단 안내상 등급판정은 원칙적으로 신청서 제출일부터 30일 이내이고 부득이한 사유에는 30일 범위에서 연장될 수 있어요. 방문일부터 결과 날짜를 계산하거나 결과 수령일을 보장하는 뜻은 아니에요.'], 'application'),
  item('result-note','안내, 문의 내용 메모',['남아 있는 서류, 안내받은 내용과 공단에 물어볼 내용을 적어두세요. 체크는 나의 준비 표시이며 공단 접수와 처리 확인이 아니에요.'], 'result',true),
];
const four:Record<string,PreparationItem[]>={
  recognized:[
    item('received','받은 서류 확인',['장기요양인정서, 개인별장기요양이용계획서 등에서 인정 내용과 유효기간, 이용 안내를 확인하세요. 이해하기 어려운 내용은 공단에 문의하고, 앱에서 계약 가능 여부나 특정 서비스 이용 자격을 판단하지 않아요. 등급을 받았더라도 등급, 급여 종류 등 처분 내용에 이의가 있다면 심사청구 안내와 기한을 확인할 수 있어요. 새 신청, 등급변경과는 다른 절차예요.'], 'result'),
    item('services','이용 가능한 서비스 확인',['받은 서류에 적힌 급여 종류와 이용 안내를 공단에 확인하세요. 상황에 맞는 서비스 범위와 비용은 안내를 받은 뒤 기관과 상담하세요.'], 'service'),
    item('agency','공식 기관 찾기와 상담 준비',['공단 노인장기요양보험 사이트의 장기요양기관 찾기에서 지역, 급여 종류를 확인하세요. 상담에서는 제공 서비스, 이용 가능 일정과 비용, 계약 내용을 물어보세요.'], 'service',false,{links:[{label:'공단 사이트에서 기관 찾기',url:'https://www.longtermcare.or.kr/npbs/'}]}),
    item('agency-note','기관, 상담, 다음 할 일 메모',['기관명, 상담에서 확인한 내용과 다음에 할 일을 적어두세요. 메모를 저장해도 기관 예약, 계약이 완료되지는 않아요.'], 'service',true),
  ],
  'not-recognized':[
    item('reason','결과 사유 확인',['통지서의 결과 사유와 처분 내용을 확인하고 이해하기 어려운 부분은 공단에 문의하세요. 앱이 결과를 판독하거나 바꾸지 않아요.'], 'result'),
    item('review','문의, 심사청구 등 공식 절차 확인',['처분에 이의가 있을 때의 심사청구와 새로운 인정 신청, 수급 중 등급변경은 다른 절차예요. 어떤 절차가 본인에게 맞는지 공식 안내를 확인하세요.', '법 제55조의 심사청구는 처분을 안 날부터 90일 이내, 처분일부터 180일이 지나면 제기할 수 없는 것이 원칙이며 정당한 사유의 예외가 있어요. 본인 기한과 절차는 공단에 확인하세요. 앱이 법적 절차를 추천하거나 결과를 보장하지 않아요.'], 'law'),
    item('review-note','공단에 문의할 내용 메모',['이해되지 않은 결과와 문의할 질문을 적어두세요. 질문과 답변을 확인한 뒤 다음 행동을 정할 수 있어요.'], 'result',true),
  ],
  unsure:[
    item('identify','받은 서류의 제목, 내용 확인',['통지서의 제목, 결과 내용, 문의처를 살펴보세요. 등급 인정 여부를 모르겠다면 공단에 확인한 뒤 상황을 수정할 수 있어요. 문서 업로드나 AI 판독은 사용하지 않아요.'], 'result'),
    item('clarify','공식 문의 내용 정리',['어떤 서류를 받았고 무엇이 이해되지 않는지 메모하고 공단의 안내를 확인하세요. 앱은 결과를 자동 분류하지 않아요.'], 'result',true),
  ],
};
export function preparationItems(stage:StageId,p:Preparation):PreparationItem[] {
  if(stage==='before-application')return one[p.purpose??'first'];
  if(stage==='awaiting-assessment')return two;
  if(stage==='awaiting-result')return three;
  return four[p.result??'unsure'];
}
export function preparationCounts(stage:StageId,p:Preparation){const scope=preparationScope(stage,p);const items=preparationItems(stage,p);const state=(id:string)=>id==='medical'?medicalEntryStatus(p):p.entries[entryKey(scope,id)]?.status??'unknown';const remaining=items.filter(i=>state(i.id)==='todo');return {core:remaining.filter(i=>!i.optional).length,optional:remaining.filter(i=>i.optional).length,unknown:items.filter(i=>state(i.id)==='unknown').length};}
export function findItem(id:string){return [...Object.values(one).flat(),...two,...three,...Object.values(four).flat()].find(i=>i.id===id);}
export const purposeLabels={first:'처음 신청',renewal:'갱신',change:'등급변경',reapply:'이전 결과 후 다시 신청'};
export const resultLabels={recognized:'장기요양등급을 받았어요','not-recognized':'등급을 받지 못했어요',unsure:'결과 내용을 잘 모르겠어요'};
export const opinionLabels={unknown:'아직 확인하지 않았어요',preparing:'준비 중이에요',submitted:'제출했어요','not-required':'제출하지 않아도 된다고 안내받았어요'};

export function preparationGroups(stage:StageId,p:Preparation){const items=preparationItems(stage,p);return [{kind:'check' as const,title:'확인할 내용',description:'필요한 내용을 읽고, 내 상황에 맞는지 확인해 주세요.',items:items.filter(item=>item.kind==='check')},{kind:'prepare' as const,title:'준비할 일',description:'아직 준비할 일이 있다면, 하나씩 함께 준비해봐요.',items:items.filter(item=>item.kind==='prepare')}];}
