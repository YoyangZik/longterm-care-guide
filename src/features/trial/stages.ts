export const stages = [
  { id: 'before-application', label: '아직 신청 전이에요', title: '신청 준비부터 차근차근', description: '장기요양 인정 신청 절차와 필요한 준비를 확인해보세요.', actions: ['신청 절차 알아보기', '신청 준비 확인하기'] },
  { id: 'awaiting-assessment', label: '신청 후 방문조사를 기다려요', title: '오늘의 돌봄을 일지에 남겨보세요', description: '식사와 이동, 옷 입기 등 실제로 도와드린 상황을 기록해두면 인정조사 때 설명할 참고자료로 활용할 수 있어요.', actions: ['돌봄 일지 작성하기', '인정조사 준비 안내'] },
  { id: 'awaiting-result', label: '방문조사 후 결과를 기다려요', title: '기록을 이어가며 결과를 기다려요', description: '기다리는 동안 돌봄 기록을 이어가세요. 결과가 안내되면 내용을 확인하고 다음 준비를 시작해보세요.', actions: ['돌봄 기록 이어쓰기', '결과 확인 안내'] },
  { id: 'result-received', label: '결과를 받았어요', title: '서비스 이용을 준비해보세요', description: '받으신 등급과 이용 안내를 살펴보고 필요한 돌봄 서비스 이용을 준비해보세요.', actions: ['서비스 이용 준비 안내', '이용할 서비스 알아보기'] },
] as const;
export type StageId = typeof stages[number]['id'];
export function isStageId(value: unknown): value is StageId { return stages.some((stage) => stage.id === value); }
