import { completionVerb } from './status';
import type { StageId } from '../trial/stages';

const uncertainty:Record<string,string>={
 eligibility:'신청 대상인지 아직 판단하기 어려워요',
 medical:'준비 여부를 아직 확인하지 못했어요',
 deadline:'안내받은 기한을 모르겠어요',
};
export function answerOptions(id:string,stage:StageId):Record<string,string>{
 const done=completionVerb(id,stage);
 const options:Record<string,string>={done,todo:done==='확인했어요'?'아직 확인하지 않았어요':done==='제출했어요'?'아직 제출 전이에요':'준비 중이에요'};
 if(uncertainty[id])options.unknown=id==='medical'&&stage==='awaiting-result'?'제출 여부를 아직 확인하지 못했어요':uncertainty[id];
 return options;
}
// A previously saved unknown remains stored, but a removed choice must not
// silently count as a visible selection when revisiting the question.
export function visiblePreparationAnswer(options:Record<string,string>|null,value:string|null|undefined){
 return value&&(!options||Object.hasOwn(options,value))?value:null;
}
export function preparationAnswerHint(id:string,stage:StageId){
 const options=answerOptions(id,stage);
 return options.unknown?`아직 판단하거나 확인하기 어렵다면 ‘${options.unknown}’를 골라주세요.`:`아직 마치지 않았다면 ‘${options.todo}’를 골라주세요. 나중에 체크리스트에서 바꿀 수 있어요.`;
}
