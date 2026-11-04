import type { StageId } from '../trial/stages';
import { preparationItems } from './content';
import { preparationScope, entryKey, setEntry, type Preparation, type IntroProgress, type Discovery, type Purpose, type Opinion, type Result } from './model';
import { getMedical, setMedicalStatus } from '../medical/model';

export const freshDiscovery=():Discovery=>({step:'application',answers:{},completed:false});
export function answerDiscovery(d:Discovery,value:boolean):Discovery {
  const answers={...d.answers,[d.step]:value};
  if(d.answers[d.step]!==value){if(d.step==='application'){delete answers.visit;delete answers.result;}if(d.step==='visit')delete answers.result;}
  return {...d,answers,completed:false};
}
export function advanceDiscovery(d:Discovery):{progress:Discovery;stage?:StageId}{
  const value=d.answers[d.step];if(value===undefined)throw new Error('Answer required');
  const stage=d.step==='application'&&!value?'before-application':d.step==='visit'&&!value?'awaiting-assessment':d.step==='result'?(value?'result-received':'awaiting-result'):undefined;
  return stage?{progress:{...d,completed:true},stage}:{progress:{...d,step:d.step==='application'?'visit':'result'}};
}
export function backDiscovery(d:Discovery):Discovery{return {...d,step:d.step==='result'?'visit':'application',completed:false};}
export function introComplete(stage:StageId,p:Preparation){const i=p.intros?.[stage];return !!i?.completed&&i.scope===preparationScope(stage,p);}
export function initialIntro(stage:StageId,p:Preparation):IntroProgress {
  const saved=p.intros?.[stage];if(saved&&saved.scope===preparationScope(stage,p))return saved;
  const node=stage==='before-application'?(p.purpose?'lead':'experience'):stage==='awaiting-result'?(getMedical(p).status!=='unanswered'&&!getMedical(p).needsConfirmation?'lead':'opinion'):(p.result?'lead':'result');
  return {version:2,node,answers:{},trail:[],completed:false,scope:preparationScope(stage,p)};
}
export function introItems(stage:StageId,p:Preparation){return preparationItems(stage,p).filter(i=>!(stage==='awaiting-result'&&i.id==='medical')&&p.entries[entryKey(preparationScope(stage,p),i.id)]?.status!=='na').sort((a,b)=>Number(a.optional)-Number(b.optional));}
export function introProgress(p:Preparation,stage:StageId,progress:IntroProgress):Preparation{
  return {...p,intros:{...p.intros,[stage]:progress}};
}
export function chooseIntro(p:Preparation,stage:StageId,i:IntroProgress,value:string):{data:Preparation;progress:IntroProgress}{
  let data=p;let answers={...i.answers,[i.node]:value};
  if(['experience','purpose','result','opinion'].includes(i.node)&&i.answers[i.node]!==value){answers=Object.fromEntries(Object.entries(answers).filter(([k])=>k===i.node||i.node==='purpose'&&k==='experience'));}
  if(i.node==='experience'&&value==='first')data={...data,purpose:'first'};
  if(i.node==='purpose')data={...data,purpose:value as Purpose};
  if(i.node==='result')data={...data,result:value as Result};
  if(i.node==='opinion'){
    data=setMedicalStatus(data,value as Opinion);
  }
  if(i.node==='ask:medical')data=setMedicalStatus(data,value==='done'?(stage==='awaiting-result'?'submitted':'preparing'):value==='todo'?'preparing':'unknown');
  else if(i.node.startsWith('ask:'))data=setEntry(data,entryKey(preparationScope(stage,data),i.node.slice(4)),{status:value as 'done'|'todo'|'na'|'unknown'});
  return {data,progress:{...i,answers,completed:false,scope:preparationScope(stage,data)}};
}
export function nextIntro(stage:StageId,p:Preparation,i:IntroProgress):IntroProgress {
  const value=i.answers[i.node];let node:string;
  const items=introItems(stage,p);
  // The cursor follows the active branch, independently of persisted answers.
  const nextQuestion=(from:number)=>{const item=items[from];return item?`ask:${item.id}`:'finish';};
  if(i.node==='experience')node=value==='previous'?'purpose':'lead';
  else if(i.node==='purpose'||i.node==='result')node='lead';
  else if(i.node==='opinion')node=['unknown','preparing'].includes(value)?'help:medical':'lead';
  else if(stage==='awaiting-result'&&i.node==='help:medical')node='lead';
  else if(i.node==='lead')node=nextQuestion(0);
  else if(i.node.startsWith('ask:')&&(value==='todo'||value==='unknown'))node=`help:${i.node.slice(4)}`;
  else if(i.node==='finish')return {...i,trail:[],completed:true};
  else {const at=items.findIndex(item=>item.id===i.node.split(':')[1]);node=nextQuestion(at+1);}
  if(['experience','purpose','result','opinion'].includes(i.node)||i.node.startsWith('ask:')){if(!value)throw new Error('Answer required');}
  return {...i,node,trail:[...i.trail.filter(n=>n!==i.node),i.node],scope:preparationScope(stage,p)};
}
export function previousIntro(i:IntroProgress){return !i.completed&&i.trail.length?{...i,node:i.trail.at(-1)!,trail:i.trail.slice(0,-1),completed:false}:i;}
