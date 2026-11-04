import type { StageId } from '../trial/stages';
import type { IntroProgress, Preparation } from './model';
import { previousIntro } from './intro-flow';

export type SurveyReturn=({stage:StageId;kind:'intro';progress:IntroProgress}|{stage:StageId;kind:'visit';route:'/guide'|'/visit'})&{entry?:'discovery'};
export function firstSetup(data:Preparation){
 return !data.completionGuide&&!Object.values(data.setup).some(Boolean)&&!Object.values(data.intros??{}).some(p=>p.completed)&&!Object.values(data.recordIntroduced??{}).some(Boolean);
}
export function reopenInitialSurvey(data:Preparation,target:SurveyReturn):Preparation{
 return {...data,setup:{...data.setup,[target.stage]:false},recordIntroduced:{...data.recordIntroduced,[target.stage]:false},
  ...(target.kind==='intro'?{intros:{...data.intros,[target.stage]:{...(target.progress.completed?previousIntro(target.progress,true):target.progress),completed:false}}}:{}),
 };
}
