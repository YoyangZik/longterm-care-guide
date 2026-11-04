import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, ExitFailureDialog } from '@/components/navigation/app-header';
import { useSafeExit } from '@/components/navigation/use-safe-exit';
import { QuestionScroll } from '@/components/question-scroll';
import { SelectionRow, SelectionGroup } from '@/components/selection-row';
import { TaskActions } from '@/components/task-actions';
import { styles } from '@/design/styles';
import { Action } from '../records/ui';
import { useStart } from '../start/provider';
import { usePreparation } from './provider';
import { findItem, purposeLabels, resultLabels } from './content';
import { answerOptions, visiblePreparationAnswer } from './answer-options';
import { itemQuestions } from './presentation';
import { entryKey, preparationScope } from './model';
import { previousIntro } from './intro-flow';
import { personalization, choosePersonalization, advancePersonalization, finishPersonalization, savePersonalizationDeadline, personalizationHint } from './personalization';
import { completionDestination } from './completion-flow';
import { getMedical, medicalOptions } from '../medical/model';
import { MedicalDeadlineForm } from '../medical/ui';

export default function IntroScreen(){
 const p=usePreparation();const {stage,guidance,updateGuidance,finishGuide}=useStart();
 const lock=useRef(false);const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const progress=personalization(stage!,p.data);const node=progress.node;const asking=node.startsWith('ask:');
 const item=asking?findItem(node.slice(4)):undefined;
 const options:Record<string,string>|null=node==='experience'?{first:'처음 신청해요',previous:'전에 신청한 적 있어요'}:node==='purpose'?{renewal:purposeLabels.renewal,change:purposeLabels.change,reapply:purposeLabels.reapply}:node==='opinion'?medicalOptions:node==='result'?resultLabels:asking&&item?answerOptions(item.id,stage!):null;
 const saved=progress.answers[node]??(asking?p.data.entries[entryKey(preparationScope(stage!,p.data),item!.id)]?.status:node==='experience'?guidance.experience:node==='purpose'&&p.data.purpose!=='first'?p.data.purpose:node==='opinion'?(getMedical(p.data).status==='unanswered'?null:getMedical(p.data).status):node==='result'?p.data.result:null);
 const selected=visiblePreparationAnswer(options,saved);
 const title=node==='experience'?'신청이 처음이신가요?':node==='purpose'?'이번에는 무엇을 준비하시나요?':node==='opinion'?'의사소견서를 제출하셨나요?':node==='result'?'어떤 결과를 받으셨나요?':item?(itemQuestions[item.id]??item.title):'내 상황 확인을 마쳤어요.';
 const leave=()=>{if(!progress.trail.length)router.replace({pathname:'/stage',params:{review:'discovery'}});};
 const exit=useSafeExit({enabled:!progress.completed,leavesRoute:!progress.trail.length,save:async()=>{await p.update(data=>{const current=personalization(stage!,data);return {...data,intros:{...data.intros,[stage!]:previousIntro(current)}};});},leave});
 async function choose(value:string){if(lock.current||busy||exit.blocked)return;lock.current=true;setBusy(true);setError('');try{await p.update(data=>{const next=choosePersonalization(data,stage!,personalization(stage!,data),value);return {...next.data,intros:{...next.data.intros,[stage!]:next.progress}};});}catch{setError('답변을 저장하지 못했어요. 다시 선택해주세요.');}finally{lock.current=false;setBusy(false);}}
 async function deadline(date:string|null){if(lock.current||busy||exit.blocked)return;lock.current=true;setBusy(true);setError('');try{let complete=false;let destination:'/home'|'/preparation-complete'='/home';await p.update(data=>{const next=savePersonalizationDeadline(stage!,data,date,Object.values(guidance.seen).some(Boolean));complete=!!next.intros?.[stage!]?.completed;destination=completionDestination(next);return next;});if(complete){await finishGuide();exit.finishSaved(()=>router.replace(destination));}}catch{setError('제출기한을 저장하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 async function next(){if(lock.current||busy||exit.blocked||options&&!selected)return;lock.current=true;setBusy(true);setError('');try{
  if(node==='experience'&&selected)await updateGuidance(data=>({...data,experience:selected as 'first'|'previous'}));
  let complete=progress.completed;let destination:'/home'|'/preparation-complete'='/home';
  await p.update(data=>{let current=personalization(stage!,data);let updated=data;if(options&&selected){const choice=choosePersonalization(data,stage!,current,selected);updated=choice.data;current=choice.progress;}const advanced=current.completed?current:advancePersonalization(stage!,updated,current);complete=advanced.completed;const next=finishPersonalization(updated,stage!,advanced,Object.values(guidance.seen).some(Boolean));destination=completionDestination(next);return next;});
  if(complete){await finishGuide();exit.finishSaved(()=>router.replace(destination));}
 }catch{setError('진행 내용을 저장하지 못했어요. 다시 시도해주세요.');}finally{lock.current=false;setBusy(false);}}
 return <SafeAreaView edges={['bottom','left','right']} style={styles.screen}>
  <Stack.Screen options={{headerShown:true,header:()=> <AppHeader title="" onBack={()=>void exit.request()} disabled={busy||exit.saving}/>}}/>
  <QuestionScroll questionKey={node}>
   {node==='medical-deadline'?<MedicalDeadlineForm initial={getMedical(p.data).deadline} onSave={date=>void deadline(date)} busy={busy||exit.blocked} error={error}/>:<>
   <Text accessibilityRole="header" style={styles.title}>{title}</Text>
   <Text style={styles.secondary}>{node==='opinion'?'공단에서 안내받은 상태를 알려주세요. 제출 제외 여부를 앱이 판단하지 않아요.':node==='result'?'받은 안내에 맞게 골라주세요.':item?personalizationHint(item.id):'답변에 맞는 준비 목록을 보여드려요. 나중에 수정할 수 있어요.'}</Text>
   {options&&<SelectionGroup>{Object.entries(options).map(([value,label])=><SelectionRow key={value} label={label} selected={selected===value} disabled={busy||exit.blocked} onPress={()=>void choose(value)}/>)}</SelectionGroup>}
   {!!error&&<Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
   <TaskActions><Action label={busy?'저장 중…':progress.completed?'홈으로':'다음'} disabled={busy||exit.blocked||!!options&&!selected} onPress={()=>void next()}/></TaskActions>
   </>}
  </QuestionScroll>
  <ExitFailureDialog visible={exit.failed} onContinue={exit.keepEditing} onDiscard={exit.discard}/>
 </SafeAreaView>;
}
