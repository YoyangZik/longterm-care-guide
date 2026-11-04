export type ReportPhase='checking'|'waiting'|'saving'|'complete';
export const reportPhaseText:Record<ReportPhase,string>={
 checking:'돌봄기록을 확인하고 있어요.',
 waiting:'AI 응답을 기다리고 있어요.',
 saving:'보고서의 근거를 확인하고 저장하고 있어요.',
 complete:'보고서가 완성됐어요.',
};
